#!/usr/bin/env node
/*
 * Task 2: data-crawl 트윗을 prototype과 동일하게 요약해 새 DB에 적재 (OpenAI 직접 호출).
 *
 *   LLM 호출 + 후처리: ai.js classifyPost (= 프롬프트·모델·파라미터·enforcePolicy 그대로)
 *   DB 적재:           persist.js persistSummary (= 모든 경로 공유하는 단일 적재 로직)
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
const { classifyPost } = require('../api/_lib/ai');                 // 프롬프트·후처리 그대로
const { persistSummary, existingSourceUrls, buildSummaryRow } = require('../api/_lib/persist'); // 공유 적재

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
const OLD = { base: base(process.env.OLD_SUPABASE_URL), key: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY };

// alias 소스(구 team_aliases)는 새 DB가 아니므로 자체 조회
async function loadAliases() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${OLD.base}/rest/v1/team_aliases?select=team_code,alias,entity_type,korean_name,notes&active=eq.true&order=team_code.asc`, {
      headers: { apikey: OLD.key, Authorization: `Bearer ${OLD.key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`GET team_aliases: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

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
    specialty_team: null,
  };
}

function readTweets() {
  const out = [];
  for (const f of fs.readdirSync(CLEAN_DIR).filter(f => f.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(CLEAN_DIR, f), 'utf8').split('\n')) {
      const s = line.trim();
      if (!s) continue;
      try { out.push(JSON.parse(s)); } catch { /* skip */ }
    }
  }
  return out;
}

(async () => {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY required');
  const aliases = await loadAliases();
  const dupes = await existingSourceUrls(); // 새 DB의 기존 source_url
  const tweets = readTweets();
  const stat = { total: tweets.length, llm: 0, inserted: 0, skipped_dup: 0, REVIEW: 0, IRRELEVANT: 0, errors: 0 };
  let processed = 0;

  for (const tweet of tweets) {
    if (processed >= LIMIT) break;
    const post = toPost(tweet);
    if (!post.author_handle || !post.text) continue;
    const sourceUrl = tweet.url || `https://x.com/${post.author_handle}/status/${post.id}`;
    if (dupes.has(sourceUrl)) { stat.skipped_dup++; continue; }

    processed++;
    try {
      const ai = await classifyPost(post, aliases); // LLM + enforcePolicy
      stat.llm++;
      const row = buildSummaryRow(ai);
      stat[row.status]++;
      if (DRY) {
        process.stdout.write(JSON.stringify({ source_url: sourceUrl, decision: ai.decision, status: row.status, teams: ai.teams, summary: row }) + '\n');
        dupes.add(sourceUrl);
        continue;
      }
      const res = await persistSummary(ai, post, { sourceUrl }); // 공유 적재
      if (res.skipped) stat.skipped_dup++; else stat.inserted++;
    } catch (e) {
      stat.errors++;
      console.error(`ERR ${sourceUrl}: ${e.message}`);
    }
  }

  console.error(JSON.stringify({ dry_run: DRY, limit: LIMIT === Infinity ? 'all' : LIMIT, ...stat }, null, 2));
})();
