const { requireToken } = require('../../_lib/auth');
const { handleError, json } = require('../../_lib/http');
const { select, supabaseFetch } = require('../../_lib/supabase');

// 대시보드 카운트용 — PostgREST 1000행 제한을 넘겨 전체 status를 페이지네이션 조회
async function fetchAllStatuses() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await supabaseFetch('article_summaries', {
      query: 'select=status',
      headers: { Range: `${from}-${from + 999}` },
    });
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// 새 status(대문자 enum) ↔ 구 어드민 UI가 기대하는 소문자 버킷
const STATUS_TO_LEGACY = {
  PUBLISHED: 'published',
  REVIEW: 'review',
  DISCARDED: 'discarded',
  IRRELEVANT: 'rejected', // 구 UI엔 IRRELEVANT 버킷이 없어 가장 가까운 rejected로 매핑
};
const LEGACY_TO_STATUS = {
  published: 'PUBLISHED',
  review: 'REVIEW',
  discarded: 'DISCARDED',
  rejected: 'IRRELEVANT',
};

// 어드민 목록 1건당 새 스키마 조인 (요약 + 대표원문/기자 + 팀태그 + 토론)
const ITEM_SELECT = [
  'article_summary_id',
  'title',
  'summary_short',
  'summary_detail',
  'content_type',
  'status',
  'category',
  'rumor_stage',
  'published_at',
  'image_url',
  'created_at',
  'updated_at',
  'raw_articles(content,source_url,reporter_tier,reporters(name,x_handle))',
  'team_tags(teams(short_name))',
  'debates(topic,option_a,option_b)',
].join(',');

function postIdFromUrl(url) {
  const m = String(url || '').match(/status\/(\d+)/);
  return m ? m[1] : null;
}

// 새 스키마 article_summary(+조인) → 구 content_items 형태 어댑터.
// 프론트(AdminDashboard.jsx)가 평면 필드에 묶여 있어, 재배선 동안 형태를 보존한다.
function toLegacyItem(summary) {
  const raws = Array.isArray(summary.raw_articles) ? summary.raw_articles : [];
  const rep = raws.slice().sort((a, b) => (a.reporter_tier ?? 99) - (b.reporter_tier ?? 99))[0] || null;
  const codes = (summary.team_tags || []).map(tag => tag.teams?.short_name).filter(Boolean);
  const debate = summary.debates && !Array.isArray(summary.debates) ? summary.debates : null;

  return {
    id: summary.article_summary_id,
    status: STATUS_TO_LEGACY[summary.status] || String(summary.status || '').toLowerCase(),
    title_ko: summary.title,
    summary_short_ko: summary.summary_short,
    summary_detail_ko: summary.summary_detail,
    summary_ko: summary.summary_short,
    team_tags: codes,
    category: summary.category,
    rumor_stage: summary.rumor_stage,
    content_type: summary.content_type,
    image_url: summary.image_url,
    published_at: summary.published_at,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    raw_text: rep?.content || '',
    raw_url: rep?.source_url || null,
    raw_post_id: postIdFromUrl(rep?.source_url),
    raw_author_name: rep?.reporters?.name || null,
    raw_author_handle: rep?.reporters?.x_handle || null,
    raw_created_at: null, // 원문 작성 시각은 새 설계에서 미저장
    // 새 설계에 없는 구 필드 — 어드민 호환용 기본값
    news_type: null,
    briefing_status: summary.rumor_stage,
    confidence: null,
    review_reason: null,
    review_note: null,
    specialist_match: false,
    ai_result: null,
    media: [],
    debate_question: debate?.topic || null,
    vote_for_label: debate?.option_a || null,
    vote_against_label: debate?.option_b || null,
  };
}

function buildDashboard(legacyStatuses, reporters, lastCollectedAt) {
  const counts = legacyStatuses.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    lastCollectedAt: lastCollectedAt || null,
    total: legacyStatuses.length,
    published: counts.published || 0,
    review: counts.review || 0,
    discarded: counts.discarded || 0,
    rejected: counts.rejected || 0,
    sources: reporters.map(reporter => ({
      id: reporter.reporter_id,
      handle: reporter.x_handle,
      name: reporter.name,
      tier: null, // 티어는 reporter_teams(팀별)로 이동 — 단일 값 없음
      active: reporter.is_active,
      last_seen_post_id: reporter.last_article_id,
      last_checked_at: null,
      last_error: null,
    })),
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const status = req.query?.status;
    const limit = Math.max(1, Math.min(Number(req.query?.limit || 100), 250));
    const newStatus = status && status !== 'all' ? LEGACY_TO_STATUS[status] : null;
    const statusFilter = newStatus ? `&status=eq.${encodeURIComponent(newStatus)}` : '';

    const [rows, dashboardRows, reporters, latestRaw] = await Promise.all([
      select('article_summaries', `select=${ITEM_SELECT}&order=created_at.desc&limit=${limit}${statusFilter}`),
      fetchAllStatuses(),
      select('reporters', 'select=reporter_id,name,x_handle,is_active,last_article_id&order=name.asc'),
      select('raw_articles', 'select=created_at&order=created_at.desc&limit=1'),
    ]);

    const legacyStatuses = dashboardRows.map(row => STATUS_TO_LEGACY[row.status] || String(row.status || '').toLowerCase());
    const lastCollectedAt = latestRaw?.[0]?.created_at || null;

    json(res, 200, {
      items: rows.map(toLegacyItem),
      dashboard: buildDashboard(legacyStatuses, reporters, lastCollectedAt),
    });
  } catch (error) {
    handleError(res, error);
  }
};
