// 요약 결과(aiResult) → 새 21테이블 적재 로직 (단일 정본).
// 모든 경로가 이 함수를 공유한다: Task2 스크립트 / Codex 출력 적재 / Phase4 live collect / 실 API.
// aiResult는 enforcePolicy를 통과한 최종본이어야 한다(원본 LLM 출력이 아니라).
const { insert, select } = require('./supabase');

// 구 briefing.status(5종) → 새 rumor_stage(3종)
const BRIEFING_TO_RUMOR = {
  OFFICIAL: 'OFFICIAL', CONFIRMED: 'OFFICIAL',
  RUMOUR: 'RUMOR', RUMOR: 'RUMOR',
  UPDATE: 'IN_PROGRESS', DENIED: 'RUMOR',
};
// decision → status (설계 5.5: AI는 REVIEW/IRRELEVANT만 부여)
function statusForDecision(decision) {
  return decision === 'discard' ? 'IRRELEVANT' : 'REVIEW';
}

// aiResult → article_summaries 행
function buildSummaryRow(aiResult) {
  const briefing = aiResult.briefing || {};
  return {
    title: briefing.title,
    summary_short: briefing.summary_short,
    summary_detail: briefing.summary_detail,
    content_type: 'GENERAL',
    status: statusForDecision(aiResult.decision),
    category: aiResult.category || 'OTHER',
    rumor_stage: BRIEFING_TO_RUMOR[String(briefing.status || '').toUpperCase()] || 'RUMOR',
    published_at: null,
  };
}

// ---- 매핑/중복 캐시 (새 DB에서 1회 로드) ----
let _teamIdByCode = null;
let _reporterByHandle = null;
let _existingSourceUrls = null;

async function teamIdByCode() {
  if (!_teamIdByCode) {
    const teams = await select('teams', 'select=team_id,short_name');
    _teamIdByCode = new Map(teams.map(t => [t.short_name, t.team_id]));
  }
  return _teamIdByCode;
}

async function reporterByHandle() {
  if (!_reporterByHandle) {
    const reporters = await select('reporters', 'select=reporter_id,x_handle,reporter_teams(tier)');
    _reporterByHandle = new Map();
    for (const r of reporters) {
      const tiers = (r.reporter_teams || []).map(t => t.tier).filter(t => t != null);
      _reporterByHandle.set(String(r.x_handle || '').toLowerCase(), {
        reporter_id: r.reporter_id,
        reporter_tier: tiers.length ? Math.min(...tiers) : null,
      });
    }
  }
  return _reporterByHandle;
}

async function existingSourceUrls() {
  if (!_existingSourceUrls) {
    const rows = await select('raw_articles', 'select=source_url');
    _existingSourceUrls = new Set(rows.map(r => r.source_url).filter(Boolean));
  }
  return _existingSourceUrls;
}

function sourceUrlFor(post) {
  return `https://x.com/${post.author_handle}/status/${post.id}`;
}

/**
 * 요약 1건을 새 스키마(article_summaries + raw_articles + team_tags)에 적재.
 * @param aiResult enforcePolicy 통과본
 * @param post     { id, text, author_handle }
 * @param opts     { sourceUrl?, reporterId?, reporterTier? } — 없으면 핸들로 reporters 조회
 * @returns { article_summary_id, status, teams } | { skipped:'duplicate' }
 */
async function persistSummary(aiResult, post, opts = {}) {
  const url = opts.sourceUrl || sourceUrlFor(post);

  const dupes = await existingSourceUrls();
  if (dupes.has(url)) return { skipped: 'duplicate', source_url: url };

  // 기자 해석 (소문자 무시 매칭) — 처리 시점 티어 스냅샷
  let reporterId = opts.reporterId;
  let reporterTier = opts.reporterTier;
  if (reporterId == null) {
    const rep = (await reporterByHandle()).get(String(post.author_handle || '').toLowerCase());
    if (!rep) throw new Error(`reporter not found for handle: ${post.author_handle}`);
    reporterId = rep.reporter_id;
    reporterTier = rep.reporter_tier;
  }

  const summaryRow = buildSummaryRow(aiResult);
  const [summary] = await insert('article_summaries', [summaryRow]);
  const summaryId = summary.article_summary_id;

  await insert('raw_articles', [{
    article_summary_id: summaryId,
    reporter_id: reporterId,
    reporter_tier: reporterTier,
    content: post.text,
    source_url: url,
  }]);

  const teamMap = await teamIdByCode();
  const codes = (aiResult.teams || (aiResult.briefing || {}).tags || []).filter(c => teamMap.has(c));
  if (codes.length) {
    await insert('team_tags', codes.map(c => ({ article_summary_id: summaryId, team_id: teamMap.get(c) })));
  }

  dupes.add(url); // 같은 실행 내 재적재 방지
  return { article_summary_id: summaryId, status: summaryRow.status, teams: codes };
}

module.exports = {
  persistSummary,
  buildSummaryRow,
  statusForDecision,
  existingSourceUrls,
  reporterByHandle,
  teamIdByCode,
  sourceUrlFor,
};
