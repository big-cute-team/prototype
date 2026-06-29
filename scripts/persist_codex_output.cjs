#!/usr/bin/env node
/*
 * Codex가 만든 요약 원본(raw LLM JSON)을 받아, 실서비스와 동일하게
 *   enforcePolicy(후처리) → persistSummary(공유 적재)
 * 로 새 DB에 넣는다. → Codex 경로도 OpenAI 경로와 100% 동일한 결과.
 *
 * 입력 파일:
 *   data-crawl/out/codex_results.ndjson  ← Codex가 생성. 한 줄 = {"idx": N, "ai": <raw 요약 JSON>}
 *   data-crawl/out/to_summarize.ndjson   ← idx로 원문 post·source_url 복원
 * 사용:
 *   node scripts/persist_codex_output.cjs --dry-run
 *   node scripts/persist_codex_output.cjs
 * 필요 env(.env.local): SUPABASE_URL/SERVICE_ROLE_KEY(적재), OLD_SUPABASE_URL/SERVICE_ROLE_KEY(alias)
 */
const fs = require('fs');
const path = require('path');
const { enforcePolicy } = require('../api/_lib/ai');
const { persistSummary, existingSourceUrls, buildSummaryRow } = require('../api/_lib/persist');

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(__dirname, '..', '..', 'data-crawl', 'out');
const base = u => (u || '').replace(/\/$/, '').replace(/\/rest\/v1$/, '');
const OLD = { base: base(process.env.OLD_SUPABASE_URL), key: process.env.OLD_SUPABASE_SERVICE_ROLE_KEY };

async function loadAliases() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${OLD.base}/rest/v1/team_aliases?select=team_code,alias,entity_type,korean_name,notes&active=eq.true`, {
      headers: { apikey: OLD.key, Authorization: `Bearer ${OLD.key}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`GET team_aliases: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

function readNdjson(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* skip */ }
  }
  return out;
}

(async () => {
  const aliases = await loadAliases();
  // idx → { post, source_url }
  const inputByIdx = new Map();
  for (const row of readNdjson(path.join(OUT_DIR, 'to_summarize.ndjson'))) {
    const up = JSON.parse(row.user_prompt);
    inputByIdx.set(row.idx, { post: up.post, source_url: row.source_url });
  }

  const results = readNdjson(path.join(OUT_DIR, 'codex_results.ndjson'));
  const dupes = await existingSourceUrls();
  const stat = { results: results.length, inserted: 0, skipped_dup: 0, no_input: 0, errors: 0, REVIEW: 0, IRRELEVANT: 0 };

  for (const r of results) {
    const inp = inputByIdx.get(r.idx);
    if (!inp) { stat.no_input++; continue; }
    const post = inp.post;
    const sourceUrl = inp.source_url;
    if (dupes.has(sourceUrl)) { stat.skipped_dup++; continue; }
    try {
      const aiResult = enforcePolicy(r.ai, post, aliases); // ★ 실서비스와 동일 후처리
      const row = buildSummaryRow(aiResult);
      stat[row.status]++;
      if (DRY) {
        process.stdout.write(JSON.stringify({ idx: r.idx, source_url: sourceUrl, status: row.status, teams: aiResult.teams, title: row.title }) + '\n');
        dupes.add(sourceUrl);
        continue;
      }
      const res = await persistSummary(aiResult, post, { sourceUrl });
      if (res.skipped) stat.skipped_dup++; else stat.inserted++;
    } catch (e) {
      stat.errors++;
      console.error(`ERR idx=${r.idx}: ${e.message}`);
    }
  }

  console.error(JSON.stringify({ dry_run: DRY, ...stat }, null, 2));
})();
