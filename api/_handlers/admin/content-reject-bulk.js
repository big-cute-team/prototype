const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { inList, patch } = require('../../_lib/supabase');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw Object.assign(new Error('ids array is required'), { statusCode: 400 });
    }
    const reviewNote = typeof body.review_note === 'string' ? body.review_note.trim() : '';
    if (!reviewNote) {
      throw Object.assign(new Error('review_note is required'), { statusCode: 400 });
    }

    const now = new Date().toISOString();
    const updated = await patch('content_items', inList('id', body.ids), {
      status: 'rejected',
      review_note: reviewNote,
      review_reason: reviewNote,
      published_at: null,
      reviewed_at: now,
      reviewed_by: body.actor || 'admin',
      updated_at: now,
    });
    const count = Array.isArray(updated) ? updated.length : 0;

    await recordAudit('admin_reject_bulk', {
      actor: body.actor || 'admin',
      count,
    });

    json(res, 200, { ok: true, rejected: count });
  } catch (error) {
    handleError(res, error);
  }
};
