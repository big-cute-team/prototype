#!/usr/bin/env node
/*
 * Task 2 (Codex 직접 요약용): OpenAI를 호출하지 않고,
 * prototype과 동일한 프롬프트 + 기사별 입력을 파일로 덤프한다.
 * Codex에 system_prompt.txt(지시) + to_summarize.ndjson의 각 user_prompt를
 * 넣어 요약 JSON을 하나씩 뽑으면 된다.
 *
 * 사용: node scripts/dump_for_codex.cjs [--limit N]
 * 출력: data-crawl/out/  (system_prompt.txt, schema.json, to_summarize.ndjson, manifest.json)
 * 필요 env(.env.local): OLD_SUPABASE_URL/SERVICE_ROLE_KEY (alias 소스). OpenAI 키 불필요.
 */
const fs = require('fs');
const path = require('path');
const { buildPromptFor, systemPrompt, CLASSIFICATION_SCHEMA } = require('../api/_lib/ai');

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const args = process.argv.slice(2);
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity; })();
const CLEAN_DIR = path.join(__dirname, '..', '..', 'data-crawl', 'data', 'clean');
const OUT_DIR = path.join(__dirname, '..', '..', 'data-crawl', 'out');

const base = u => (u || '').replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const OLD = { base: base(process.env.OLD_SUPABASE_URL), key: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY };

async function restGet(env, table, query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${env.base}/rest/v1/${table}?${query}`, {
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
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
  const aliases = await restGet(OLD, 'team_aliases',
    'select=team_code,alias,entity_type,korean_name,notes&active=eq.true&order=team_code.asc');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'system_prompt.txt'), systemPrompt(), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'schema.json'), JSON.stringify(CLASSIFICATION_SCHEMA, null, 2), 'utf8');

  const tweets = readTweets();
  const ndjson = fs.createWriteStream(path.join(OUT_DIR, 'to_summarize.ndjson'), 'utf8');
  const stat = { total: tweets.length, to_summarize: 0, skip_no_team: 0, skip_non_informative: 0 };
  let idx = 0;

  for (const tweet of tweets) {
    if (stat.to_summarize >= LIMIT) break;
    const post = toPost(tweet);
    if (!post.author_handle || !post.text) continue;
    const built = buildPromptFor(post, aliases);
    if (built.skip) {
      if (built.reason === 'no_target_team') stat.skip_no_team++;
      else stat.skip_non_informative++;
      continue;
    }
    idx++;
    const sourceUrl = tweet.url || `https://x.com/${post.author_handle}/status/${post.id}`;
    ndjson.write(JSON.stringify({
      idx,
      post_id: post.id,
      source_url: sourceUrl,
      reporter_handle: post.author_handle,
      user_prompt: built.user, // ★ system_prompt.txt와 함께 LLM(Codex)에 넣을 user 메시지(그대로)
    }) + '\n');
    stat.to_summarize++;
  }
  ndjson.end();

  const manifest = {
    note: 'system_prompt.txt(지시) + to_summarize.ndjson의 각 user_prompt를 LLM에 넣어 요약 JSON을 뽑는다. 출력 형식은 schema.json.',
    model_hint: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    params_hint: { temperature: 0.1, response_format: 'json_object' },
    ...stat,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('\n출력 위치:', OUT_DIR);
})();
