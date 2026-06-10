const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const {
  cardDraftPayloadFor,
  cardRenderAuthHeaders,
  cardRenderUrl,
  loadPublishedItem,
  readCardRenderError,
} = require('../../_lib/card-news');
const { handleError, json, parseJsonBody } = require('../../_lib/http');

async function requestCardDraft(item) {
  const response = await fetch(cardRenderUrl('/card/draft'), {
    method: 'POST',
    headers: cardRenderAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(cardDraftPayloadFor(item)),
  });

  if (!response.ok) await readCardRenderError(response);
  return response.json();
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

    const item = await loadPublishedItem(body.id);
    const card = await requestCardDraft(item);

    await recordAudit('card_news_drafted', {
      content_item_id: item.id,
      actor: body.actor || 'admin',
    });

    json(res, 200, { ok: true, card });
  } catch (error) {
    if (error.payload) {
      await recordAudit('card_news_draft_failed', {
        actor: 'admin',
        message: error.message,
        payload: error.payload,
      }).catch(() => {});
    }
    handleError(res, error);
  }
};
