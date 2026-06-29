const { requireToken } = require('../../_lib/auth');
const { recordStatusLog } = require('../../_lib/audit');
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
    // review_note는 새 설계에 저장 자리가 없어 보존하지 않는다(입력은 UX상 유지).

    const updated = await patch('article_summaries', inList('article_summary_id', body.ids), {
      status: 'DISCARDED',
    });
    const rows = Array.isArray(updated) ? updated : [];

    // 폐기 전이 시점을 각각 기록(설계 3.18)
    for (const row of rows) {
      await recordStatusLog(row.article_summary_id, 'DISCARDED');
    }

    json(res, 200, { ok: true, rejected: rows.length });
  } catch (error) {
    handleError(res, error);
  }
};
