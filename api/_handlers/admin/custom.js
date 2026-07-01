const { requireToken } = require('../../_lib/auth');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { insert } = require('../../_lib/supabase');
const { teamIdByCode } = require('../../_lib/persist');

const TARGET_TEAM_CODES = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];

// 관리자가 직접 만드는 PLICK 발행 카드. 새 21테이블엔 is_custom/card_type 개념이 없어
// 일반 article_summaries(PUBLISHED, 원문 없음)로 저장한다. 이미지는 image_url(대표 1장).
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);

    const imageUrls = Array.isArray(body.image_urls) && body.image_urls.length > 0
      ? body.image_urls
      : body.image_url ? [body.image_url] : [];
    if (imageUrls.length === 0 && !body.card_data) {
      throw Object.assign(new Error('image_url or card_data is required'), { statusCode: 400 });
    }
    if (!body.title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

    const hasDebate = Boolean(body.debate_question);
    if (hasDebate && (!body.vote_for_label || !body.vote_against_label)) {
      throw Object.assign(new Error('vote_for_label and vote_against_label are required when setting a debate'), { statusCode: 400 });
    }

    const description = String(body.description || '').trim();
    const title = String(body.title).trim();
    const teamCodes = Array.isArray(body.team_tags)
      ? body.team_tags.filter(t => TARGET_TEAM_CODES.includes(String(t).toUpperCase())).map(t => String(t).toUpperCase())
      : [];

    const now = new Date().toISOString();
    const [summary] = await insert('article_summaries', [{
      title,
      summary_short: description || title,
      summary_detail: description || title,
      content_type: hasDebate ? 'DEBATE' : 'GENERAL',
      status: 'PUBLISHED',
      category: 'OTHER',
      rumor_stage: null,
      image_url: imageUrls[0] || null,
      published_at: now,
    }]);
    const summaryId = summary.article_summary_id;

    const teamMap = await teamIdByCode();
    const teamIds = teamCodes.map(code => teamMap.get(code)).filter(Boolean);
    if (teamIds.length) {
      await insert('team_tags', teamIds.map(team_id => ({ article_summary_id: summaryId, team_id })));
    }
    if (hasDebate) {
      await insert('debates', [{
        article_summary_id: summaryId,
        topic: body.debate_question,
        option_a: body.vote_for_label,
        option_b: body.vote_against_label,
      }]);
    }

    json(res, 200, {
      ok: true,
      item: {
        id: summaryId,
        status: 'published',
        title_ko: title,
        summary_short_ko: description || title,
        team_tags: teamCodes,
        image_url: imageUrls[0] || null,
        content_type: hasDebate ? 'DEBATE' : 'GENERAL',
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
