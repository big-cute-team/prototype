const { mapItemToPost } = require('./_lib/feed');
const { handleError, json } = require('./_lib/http');
const { select } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const limit = Math.max(1, Math.min(Number(req.query?.limit || 50), 100));
    const rows = await select(
      'content_items',
      `select=*&status=eq.published&order=published_at.desc.nullslast,created_at.desc&limit=${limit}`
    );

    json(res, 200, {
      items: rows.map(mapItemToPost),
      count: rows.length,
    });
  } catch (error) {
    handleError(res, error);
  }
};
