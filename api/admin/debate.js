const { requireToken } = require('../_lib/auth');
const { recordAudit } = require('../_lib/audit');
const { handleError, json, parseJsonBody } = require('../_lib/http');
const { eq, patch, select } = require('../_lib/supabase');

async function loadItem(id) {
  const rows = await select('content_items', `select=*&${eq('id', id)}&limit=1`);
  const item = rows[0];
  if (!item) throw Object.assign(new Error('content item not found'), { statusCode: 404 });
  return item;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin-debate');
    const body = await parseJsonBody(req);
    if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });

    const isSetting = Boolean(body.debate_question);
    if (isSetting && (!body.vote_for_label || !body.vote_against_label)) {
      throw Object.assign(new Error('vote_for_label and vote_against_label are required when setting a debate'), { statusCode: 400 });
    }

    await loadItem(body.id);

    const updates = {
      debate_question: body.debate_question || null,
      vote_for_label: body.vote_for_label || null,
      vote_against_label: body.vote_against_label || null,
      updated_at: new Date().toISOString(),
    };

    const updated = await patch('content_items', eq('id', body.id), updates);
    const item = updated[0];

    await recordAudit(isSetting ? 'admin_debate_set' : 'admin_debate_clear', {
      content_item_id: item.id,
      actor: body.actor || 'admin',
    });

    json(res, 200, { ok: true, item });
  } catch (error) {
    handleError(res, error);
  }
};
