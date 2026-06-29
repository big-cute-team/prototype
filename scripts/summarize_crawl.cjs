#!/usr/bin/env node
/*
 * Task 2: data-crawl 트윗을 prototype과 "동일한 방식"으로 요약해 새 DB에 적재.
 *
 * 요약 로직(프롬프트·모델·파라미터·후처리)은 prototype/api/_lib/ai.js의
 * classifyPost()를 그대로 재사용한다. 이 스크립트는 입력/출력 매핑만 담당.
 * 자세한 근거: data-crawl/docs/summarization-pipeline.md
 *
 * 사용:
 *   node scripts/summarize_crawl.cjs --dry-run         # 요약만, 미적재 (NDJSON 출력)
 *   node scripts/summarize_crawl.cjs --limit 20        # 20건만 실제 적재
 *   node scripts/summarize_crawl.cjs                   # 전체 적재
 * 필요 env(.env.local): OPENAI_API_KEY, SUPABASE_URL/SERVICE_ROLE_KEY,
 *                       OLD_SUPABASE_URL/SERVICE_ROLE_KEY(alias 소스)
 */
const fs = require('fs');
const path = require('path');
const { classifyPost } = require('../api/_lib/ai'); // ★ 프롬프트·호출 방식 그대로 재사용

// ---- env (.env.local) ----
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity; })();
const CLEAN_DIR = path.join(__dirname, '..', '..', 'data-crawl', 'data', 'clean');

const base = u => (u || '').replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const NEW = { base: base(process.env.SUPABASE_URL), key: process.env.SUPABASE_SERVICE_ROLE_KEY };
const OLD = { base: base(process.env.OLD_SUPABASE_URL), key: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY };

function headers(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}
async function restGet(env, table, query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${env.base}/rest/v1/${table}?${query}`, {
      headers: headers(env.key, { Range: `${from}-${from + 999}` }),
    });
    if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}
async function restInsert(env, table, rows) {
  const res = await fetch(`${env.base}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(env.key, { Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`POST ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

// briefing.status(5종) → rumor_stage(3종)
const RUMOR = { OFFICIAL: 'OFFICIAL', CONFIRMED: 'OFFICIAL', RUMOUR: 'RUMOR', RUMOR: 'RUMOR', UPDATE: 'IN_PROGRESS', DENIED: 'RUMOR' };
// decision → status (설계 5.5: AI는 REVIEW/IRRELEVANT만)
const statusFor = decision => (decision === 'discard' ? 'IRRELEVANT' : 'REVIEW');

// jsonl 트윗 → classifyPost가 기대하는 post 객체
function toPost(tweet) {
  return {
    id: tweet.id_str || String(tweet.id),
    text: tweet.rawContent || '',
    author_handle: tweet.user?.username || '',
    author_name: tweet.user?.displayname || null,
    created_at: tweet.date || null,
    public_metrics: {
      like_count: tweet.likeCount, reply_count: tweet.replyCount,
      retweet_count: tweet.retweetCount, quote_count: tweet.quoteCount,
      bookmark_count: tweet.bookmarkedCount,
    },
    media: [],
    specialty_team: null, // 선택: 핸들→담당팀 매핑 시 채움 (specialist_match에만 영향)
  };
}

function readTweets() {
  const files = fs.readdirSync(CLEAN_DIR).filter(f => f.endsWith('.jsonl'));
  const out = [];
  for (const f of files) {
    for (const line of fs.readFileSync(path.join(CLEAN_DIR, f), 'utf8').split('\n')) {
      const s = line.trim();
      if (!s) continue;
      try { out.push(JSON.parse(s)); } catch { /* skip malformed */ }
    }
  }
  return out;
}

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY required');

  // alias = 구 team_aliases (prototype loadAliases와 동일 소스)
  const aliases = await restGet(OLD, 'team_aliases',
    'select=team_code,alias,entity_type,korean_name,notes&active=eq.true&order=team_code.asc');

  // 매핑 테이블 (새 DB)
  const reporters = await restGet(NEW, 'reporters', 'select=reporter_id,x_handle,reporter_teams(tier)');
  const repByHandle = new Map();
  for (const r of reporters) {
    const tiers = (r.reporter_teams || []).map(t => t.tier).filter(t => t != null);
    repByHandle.set(String(r.x_handle || '').toLowerCase(), {
      reporter_id: r.reporter_id,
      reporter_tier: tiers.length ? Math.min(...tiers) : null,
    });
  }
  const teams = await restGet(NEW, 'teams', 'select=team_id,short_name');
  const teamIdByCode = new Map(teams.map(t => [t.short_name, t.team_id]));

  // 중복 방지: 이미 적재된 source_url
  const existing = new Set((await restGet(NEW, 'raw_articles', 'select=source_url')).map(r => r.source_url).filter(Boolean));

  const tweets = readTweets();
  const stat = { total: tweets.length, llm: 0, inserted: 0, skipped_dup: 0, skipped_no_reporter: 0, REVIEW: 0, IRRELEVANT: 0, errors: 0 };
  let processed = 0;

  for (const tweet of tweets) {
    if (processed >= LIMIT) break;
    const post = toPost(tweet);
    const sourceUrl = tweet.url || `https://x.com/${post.author_handle}/status/${post.id}`;
    if (existing.has(sourceUrl)) { stat.skipped_dup++; continue; }

    const rep = repByHandle.get(post.author_handle.toLowerCase());
    if (!rep) { stat.skipped_no_reporter++; continue; }

    processed++;
    try {
      const ai = await classifyPost(post, aliases); // ★ 동일 프롬프트·모델·후처리
      stat.llm++;
      const briefing = ai.briefing || {};
      const status = statusFor(ai.decision);
      stat[status]++;

      const summaryRow = {
        title: briefing.title,
        summary_short: briefing.summary_short,
        summary_detail: briefing.summary_detail,
        content_type: 'GENERAL',
        status,
        category: ai.category || 'OTHER', // ai.js가 LLM으로 분류 (TRANSFER/MATCH/FITNESS/OTHER)
        rumor_stage: RUMOR[String(briefing.status || '').toUpperCase()] || 'RUMOR',
        published_at: null,
      };
      const teamCodes = (ai.teams || briefing.tags || []).filter(c => teamIdByCode.has(c));

      if (DRY) {
        process.stdout.write(JSON.stringify({ source_url: sourceUrl, decision: ai.decision, status, teams: teamCodes, summary: summaryRow }) + '\n');
        existing.add(sourceUrl);
        continue;
      }

      const [summary] = await restInsert(NEW, 'article_summaries', [summaryRow]);
      const summaryId = summary.article_summary_id;
      await restInsert(NEW, 'raw_articles', [{
        article_summary_id: summaryId,
        reporter_id: rep.reporter_id,
        reporter_tier: rep.reporter_tier,
        content: post.text,
        source_url: sourceUrl,
      }]);
      if (teamCodes.length) {
        await restInsert(NEW, 'team_tags', teamCodes.map(c => ({ article_summary_id: summaryId, team_id: teamIdByCode.get(c) })));
      }
      existing.add(sourceUrl);
      stat.inserted++;
    } catch (e) {
      stat.errors++;
      console.error(`ERR ${sourceUrl}: ${e.message}`);
    }
  }

  console.error(JSON.stringify({ dry_run: DRY, limit: LIMIT === Infinity ? 'all' : LIMIT, ...stat }, null, 2));
})();
