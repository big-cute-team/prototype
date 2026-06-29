#!/usr/bin/env node
/*
 * Codex 요약 진행 상황 한눈에 보기.
 *   done   : codex_results.ndjson에 쌓인 요약 수 / 전체 요약 대상
 *   next   : 다음에 처리할 idx (to_summarize 순서 기준 아직 안 한 첫 idx)
 *   loaded : 그중 새 DB(raw_articles)에 실제 적재된 수
 * 사용: node scripts/codex_progress.cjs        (DB 조회 포함)
 *       node scripts/codex_progress.cjs --no-db (파일만, DB 조회 생략)
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const NO_DB = process.argv.includes('--no-db');
const OUT_DIR = path.join(__dirname, '..', '..', 'data-crawl', 'out');

function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* skip */ }
  }
  return out;
}

(async () => {
  const inputs = readNdjson(path.join(OUT_DIR, 'to_summarize.ndjson'));
  const total = inputs.length;
  const idxToUrl = new Map(inputs.map(r => [r.idx, r.source_url]));

  const results = readNdjson(path.join(OUT_DIR, 'codex_results.ndjson'));
  const doneIdx = new Set(results.map(r => r.idx));
  const done = doneIdx.size;

  // to_summarize 순서대로 아직 안 한 첫 idx
  let nextIdx = null;
  for (const r of inputs) { if (!doneIdx.has(r.idx)) { nextIdx = r.idx; break; } }

  let loaded = null;
  if (!NO_DB && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { existingSourceUrls } = require('../api/_lib/persist');
    const dbUrls = await existingSourceUrls();
    loaded = 0;
    for (const url of idxToUrl.values()) if (dbUrls.has(url)) loaded++;
  }

  const pct = total ? Math.floor((done / total) * 100) : 0;
  const parts = [
    `done: ${done} / ${total} (${pct}%)`,
    `next idx: ${nextIdx ?? '— (전부 완료)'}`,
  ];
  if (loaded !== null) parts.push(`DB 적재(요약대상): ${loaded} / ${total}`);
  console.log(parts.join('  |  '));
})();
