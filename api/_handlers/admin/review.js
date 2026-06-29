const { requireToken } = require('../../_lib/auth');
const { recordStatusLog } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { notifyPublished } = require('../../_lib/slack');
const { eq, insert, patch, select, supabaseFetch } = require('../../_lib/supabase');

// 구 briefing_status(5종) → 새 rumor_stage(3종) 매핑
const BRIEFING_TO_RUMOR = {
  OFFICIAL: 'OFFICIAL',
  CONFIRMED: 'OFFICIAL',
  RUMOUR: 'RUMOR',
  RUMOR: 'RUMOR',
  UPDATE: 'IN_PROGRESS',
  DENIED: 'RUMOR',
};

const REVIEW_SELECT = [
  'article_summary_id',
  'title',
  'summary_short',
  'summary_detail',
  'content_type',
  'status',
  'category',
  'rumor_stage',
  'published_at',
  'raw_articles(content,source_url,reporters(name,x_handle))',
  'team_tags(team_id,teams(short_name))',
].join(',');

async function loadSummary(id) {
  const rows = await select('article_summaries', `select=${REVIEW_SELECT}&${eq('article_summary_id', id)}&limit=1`);
  const summary = rows[0];
  if (!summary) throw Object.assign(new Error('article summary not found'), { statusCode: 404 });
  return summary;
}

let teamCodeMapCache = null;
async function teamIdByCode() {
  if (!teamCodeMapCache) {
    const teams = await select('teams', 'select=team_id,short_name');
    teamCodeMapCache = Object.fromEntries(teams.map(team => [team.short_name, team.team_id]));
  }
  return teamCodeMapCache;
}

// team_tags(조인 테이블)를 codes로 통째 교체. 구 content_items.team_tags(text[]) 편집과 동등.
async function replaceTeamTags(summaryId, codes) {
  const map = await teamIdByCode();
  const teamIds = [...new Set(codes)].map(code => map[code]).filter(Boolean);
  await supabaseFetch('team_tags', { method: 'DELETE', query: eq('article_summary_id', summaryId) });
  if (teamIds.length > 0) {
    await insert('team_tags', teamIds.map(team_id => ({ article_summary_id: summaryId, team_id })));
  }
}

function buildSummaryPatch(body) {
  const patchBody = {};
  if (typeof body.title_ko === 'string') patchBody.title = body.title_ko;
  const summaryShort = typeof body.summary_short_ko === 'string' ? body.summary_short_ko : body.summary_ko;
  if (typeof summaryShort === 'string') patchBody.summary_short = summaryShort;
  if (typeof body.summary_detail_ko === 'string') patchBody.summary_detail = body.summary_detail_ko;
  if (typeof body.briefing_status === 'string') {
    const stage = BRIEFING_TO_RUMOR[body.briefing_status.toUpperCase()];
    if (stage) patchBody.rumor_stage = stage;
  }
  // 구 필드(news_type·review_reason·review_note·ai_result·reviewed_by/at)는 새 설계에 자리가 없어 미저장.
  return patchBody;
}

// 슬랙·응답용으로 요약(+조인)을 구 item 형태로 약식 변환
function toLegacyItem(summary) {
  const raws = Array.isArray(summary.raw_articles) ? summary.raw_articles : [];
  const rep = raws[0] || null;
  const codes = (summary.team_tags || []).map(tag => tag.teams?.short_name).filter(Boolean);
  return {
    id: summary.article_summary_id,
    status: summary.status,
    title_ko: summary.title,
    summary_short_ko: summary.summary_short,
    summary_detail_ko: summary.summary_detail,
    team_tags: codes,
    briefing_status: summary.rumor_stage,
    raw_url: rep?.source_url || null,
    raw_author_handle: rep?.reporters?.x_handle || null,
    raw_text: rep?.content || '',
    confidence: null,
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);
    if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
    if (!['approve', 'reject', 'update'].includes(body.action)) {
      throw Object.assign(new Error('action must be approve, reject, or update'), { statusCode: 400 });
    }
    if (body.action === 'reject') {
      const note = typeof body.review_note === 'string' ? body.review_note.trim() : '';
      if (!note) {
        throw Object.assign(new Error('review_note is required when rejecting an item'), { statusCode: 400 });
      }
    }

    const id = body.id;
    await loadSummary(id); // 존재 확인

    const patchBody = buildSummaryPatch(body);
    if (body.action === 'approve') {
      patchBody.status = 'PUBLISHED';
      patchBody.published_at = new Date().toISOString();
    } else if (body.action === 'reject') {
      patchBody.status = 'DISCARDED'; // 검수자 폐기 = DISCARDED
    }

    if (Object.keys(patchBody).length > 0) {
      await patch('article_summaries', eq('article_summary_id', id), patchBody);
    }
    if (Array.isArray(body.team_tags)) {
      await replaceTeamTags(id, body.team_tags);
    }
    if (body.action === 'approve') await recordStatusLog(id, 'PUBLISHED');
    if (body.action === 'reject') await recordStatusLog(id, 'DISCARDED');

    const item = toLegacyItem(await loadSummary(id));

    if (body.action === 'approve') {
      await notifyPublished(item, 'admin-approved').catch(() => {});
    }

    json(res, 200, { ok: true, item });
  } catch (error) {
    handleError(res, error);
  }
};
