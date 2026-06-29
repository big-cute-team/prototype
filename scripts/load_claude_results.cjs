#!/usr/bin/env node
/*
 * claude_results.ndjson(요약 결과) → 새 21테이블 적재.
 *   article_summaries + raw_articles(source_url·원문) + team_tags
 * 원문/기자는 articles.ndjson(idx 조인), 중복은 post_id 기준 skip.
 * 사용: node scripts/load_claude_results.cjs --dry-run | node scripts/load_claude_results.cjs
 */
const fs = require('fs');
const path = require('path');
const { insert } = require('../api/_lib/supabase');
const { reporterByHandle, teamIdByCode, existingPostIds, postIdOf } = require('../api/_lib/persist');

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const DRY = process.argv.includes('--dry-run');
const OUT = path.join(__dirname, '..', '..', 'data-crawl', 'out');

function readNd(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim(); if (!s) continue;
    try { out.push(JSON.parse(s)); } catch {}
  }
  return out;
}
function snippet(text, n = 40) {
  const t = String(text || '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  // 코드포인트 단위로 잘라 이모지(서로게이트 페어) 중간 절단 방지 → 유효 JSON 보장
  return [...t].slice(0, n).join('') || '비대상 업데이트';
}

(async () => {
  const articles = new Map(readNd(path.join(OUT, 'articles.ndjson')).map(a => [a.idx, a]));
  const results = readNd(path.join(OUT, 'claude_results.ndjson'));
  const reps = await reporterByHandle();
  const teams = await teamIdByCode();
  const seen = await existingPostIds();

  const stat = { total: results.length, inserted: 0, skipped_dup: 0, no_article: 0, no_reporter: 0, errors: 0, REVIEW: 0, IRRELEVANT: 0 };

  for (const r of results) {
    const art = articles.get(r.idx);
    if (!art) { stat.no_article++; continue; }
    const pid = postIdOf(art.source_url) || String(r.idx);
    if (seen.has(pid)) { stat.skipped_dup++; continue; }
    const rep = reps.get(String(art.reporter || '').toLowerCase());
    if (!rep) { stat.no_reporter++; continue; }

    // IRRELEVANT는 title/요약이 null → NOT NULL 충족 위해 스니펫·사유로 대체
    const title = r.title || snippet(art.text, 40);
    const ss = r.summary_short || r.note || snippet(art.text, 80);
    const sd = r.summary_detail || r.note || ss;

    stat[r.status] = (stat[r.status] || 0) + 1;
    if (DRY) { seen.add(pid); continue; }
    try {
      const [s] = await insert('article_summaries', [{
        title, summary_short: ss, summary_detail: sd,
        content_type: 'GENERAL', status: r.status,
        category: r.category || 'OTHER', rumor_stage: null, published_at: null,
      }]);
      const sid = s.article_summary_id;
      await insert('raw_articles', [{
        article_summary_id: sid, reporter_id: rep.reporter_id, reporter_tier: rep.reporter_tier,
        content: art.text, source_url: art.source_url,
      }]);
      const codes = (r.teams || []).filter(c => teams.has(c));
      if (codes.length) await insert('team_tags', codes.map(c => ({ article_summary_id: sid, team_id: teams.get(c) })));
      seen.add(pid);
      stat.inserted++;
    } catch (e) { stat.errors++; console.error(`ERR idx=${r.idx}: ${e.message}`); }
  }
  console.error(JSON.stringify({ dry_run: DRY, ...stat }, null, 2));
})();
