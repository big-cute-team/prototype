const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { inList, supabaseFetch } = require('../../_lib/supabase');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);

    let query;
    if (body.all === true) {
      // 모든 content_items 삭제 (PostgREST는 DELETE에 필터를 요구)
      query = 'id=not.is.null';
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      query = inList('id', body.ids);
    } else {
      throw Object.assign(new Error('ids array or all:true is required'), { statusCode: 400 });
    }

    const deleted = await supabaseFetch('content_items', {
      method: 'DELETE',
      query,
      prefer: 'return=representation',
    });
    const count = Array.isArray(deleted) ? deleted.length : 0;

    await recordAudit('admin_content_delete', {
      actor: body.actor || 'admin',
      all: body.all === true,
      count,
    });

    json(res, 200, { ok: true, deleted: count });
  } catch (error) {
    handleError(res, error);
  }
};
