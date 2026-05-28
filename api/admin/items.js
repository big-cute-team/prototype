const { requireToken } = require('../_lib/auth');
const { handleError, json } = require('../_lib/http');
const { select } = require('../_lib/supabase');

function buildDashboard(items, sources) {
  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return {
    lastCollectedAt: sources
      .map(source => source.last_checked_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    total: items.length,
    published: counts.published || 0,
    review: counts.review || 0,
    discarded: counts.discarded || 0,
    rejected: counts.rejected || 0,
    sources: sources.map(source => ({
      id: source.id,
      handle: source.handle,
      name: source.name,
      tier: source.tier,
      active: source.active,
      last_seen_post_id: source.last_seen_post_id,
      last_checked_at: source.last_checked_at,
      last_error: source.last_error,
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
    const statusFilter = status && status !== 'all' ? `&status=eq.${encodeURIComponent(status)}` : '';
    const [items, dashboardItems, sources] = await Promise.all([
      select('content_items', `select=*&order=created_at.desc&limit=${limit}${statusFilter}`),
      select('content_items', 'select=id,status,created_at&order=created_at.desc&limit=1000'),
      select('sources', 'select=*&order=tier.asc,handle.asc'),
    ]);

    json(res, 200, {
      items,
      dashboard: buildDashboard(dashboardItems, sources),
    });
  } catch (error) {
    handleError(res, error);
  }
};
