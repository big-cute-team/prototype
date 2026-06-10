const crypto = require('crypto');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { insert } = require('../../_lib/supabase');

const CARD_TYPES = ['schedule', 'today', 'result', 'standings', 'lineup'];
const TARGET_TEAM_CODES = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);

    // image_urls (배열) 또는 image_url (단일, 하위 호환) 지원
    const imageUrls = Array.isArray(body.image_urls) && body.image_urls.length > 0
      ? body.image_urls
      : body.image_url ? [body.image_url] : [];
    const cardData = body.card_data || null;
    // 이미지 또는 card_data 중 하나는 있어야 함
    if (imageUrls.length === 0 && !cardData) throw Object.assign(new Error('image_url or card_data is required'), { statusCode: 400 });
    if (!body.title) throw Object.assign(new Error('title is required'), { statusCode: 400 });
    const cardType = CARD_TYPES.includes(body.card_type) ? body.card_type : null;
    if (!cardType) throw Object.assign(new Error(`card_type must be one of ${CARD_TYPES.join(', ')}`), { statusCode: 400 });

    const hasDebate = Boolean(body.debate_question);
    if (hasDebate && (!body.vote_for_label || !body.vote_against_label)) {
      throw Object.assign(new Error('vote_for_label and vote_against_label are required when setting a debate'), { statusCode: 400 });
    }

    const description = String(body.description || '').trim();
    const title = String(body.title).trim();
    const teamTags = Array.isArray(body.team_tags)
      ? body.team_tags.filter(t => TARGET_TEAM_CODES.includes(String(t).toUpperCase())).map(t => String(t).toUpperCase())
      : [];

    const now = new Date().toISOString();
    const row = {
      raw_post_id: `custom-${crypto.randomUUID()}`,
      raw_text: description || title,
      raw_created_at: now,
      raw_author_name: 'PLICK',
      raw_author_handle: 'plick_football',
      media: imageUrls.map(url => ({ url, type: 'photo' })),
      card_data: cardData,
      team_tags: teamTags,
      card_type: cardType,
      is_custom: true,
      briefing_status: 'UPDATE',
      news_type: 'ambiguous',
      status: 'published',
      confidence: 1,
      title_ko: title,
      summary_short_ko: description,
      summary_detail_ko: description,
      summary_ko: description,
      published_at: now,
      debate_question: hasDebate ? body.debate_question : null,
      vote_for_label: hasDebate ? body.vote_for_label : null,
      vote_against_label: hasDebate ? body.vote_against_label : null,
    };

    const inserted = await insert('content_items', [row]);
    const item = inserted[0];

    await recordAudit('admin_custom_create', {
      content_item_id: item.id,
      actor: body.actor || 'admin',
      card_type: cardType,
    });

    json(res, 200, { ok: true, item });
  } catch (error) {
    handleError(res, error);
  }
};
