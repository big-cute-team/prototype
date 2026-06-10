const { handleError, json } = require('../_lib/http');

const HANDLERS = {
  'card-news-caption': require('../_handlers/admin/card-news-caption'),
  'card-news-draft': require('../_handlers/admin/card-news-draft'),
  'card-news-render': require('../_handlers/admin/card-news-render'),
  'card-publications': require('../_handlers/admin/card-publications'),
  'card-publications-sync': require('../_handlers/admin/card-publications-sync'),
  'card-template-render': require('../_handlers/admin/card-template-render'),
  'instagram-publish': require('../_handlers/admin/instagram-publish'),
  custom: require('../_handlers/admin/custom'),
  debate: require('../_handlers/admin/debate'),
  items: require('../_handlers/admin/items'),
  regenerate: require('../_handlers/admin/regenerate'),
  review: require('../_handlers/admin/review'),
  upload: require('../_handlers/admin/upload'),
};

function routeName(req) {
  const fromQuery = req.query?.route;
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;
  if (Array.isArray(fromQuery) && fromQuery[0]) return fromQuery[0];

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return url.pathname.split('/').filter(Boolean).pop();
}

module.exports = async function handler(req, res) {
  try {
    const route = routeName(req);
    const routeHandler = HANDLERS[route];
    if (!routeHandler) {
      json(res, 404, { error: 'Admin API route not found' });
      return;
    }

    await routeHandler(req, res);
  } catch (error) {
    handleError(res, error);
  }
};
