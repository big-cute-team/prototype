const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { cardRenderAuthHeaders, cardRenderUrl, readCardRenderError, safeFilename } = require('../../_lib/card-news');
const { handleError, json } = require('../../_lib/http');

const MAX_RENDER_BODY_BYTES = 2 * 1024 * 1024;
const TODAY_FIXTURES_TEMPLATE_ID = 'plick_today_fixtures_v1';
const WEEKLY_FIXTURES_TEMPLATE_ID = 'plick_weekly_fixtures_v1';
const TODAY_RESULTS_TEMPLATE_ID = 'plick_today_results_v1';
const WEEKLY_RESULTS_TEMPLATE_ID = 'plick_weekly_results_v1';
const FIXTURE_TEMPLATE_IDS = new Set([
  TODAY_FIXTURES_TEMPLATE_ID,
  WEEKLY_FIXTURES_TEMPLATE_ID,
  TODAY_RESULTS_TEMPLATE_ID,
  WEEKLY_RESULTS_TEMPLATE_ID,
]);

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }

    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_RENDER_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400, cause: error }));
      }
    });
    req.on('error', reject);
  });
}

async function requestTemplateRender(body) {
  const response = await fetch(cardRenderUrl('/card/render'), {
    method: 'POST',
    headers: cardRenderAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!response.ok) await readCardRenderError(response);
  return Buffer.from(await response.arrayBuffer());
}

function requireTodayFixturesPayload(body) {
  if (!body.today_fixtures || typeof body.today_fixtures !== 'object' || Array.isArray(body.today_fixtures)) {
    throw Object.assign(new Error('today_fixtures is required'), { statusCode: 400 });
  }
  return body.today_fixtures;
}

function sendZip(res, zipBytes, filename) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(filename, 'cardnews-template.zip')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(zipBytes);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const body = await parseJsonBody(req);
    const templateId = body.template_id || TODAY_FIXTURES_TEMPLATE_ID;
    if (!FIXTURE_TEMPLATE_IDS.has(templateId)) {
      throw Object.assign(new Error('Unsupported template_id'), { statusCode: 400 });
    }

    const todayFixtures = requireTodayFixturesPayload(body);
    const zipBytes = await requestTemplateRender({
      template_id: templateId,
      today_fixtures: todayFixtures,
    });
    const filenamePrefix = templateId === WEEKLY_RESULTS_TEMPLATE_ID
      ? 'cardnews-weekly-results'
      : templateId === TODAY_RESULTS_TEMPLATE_ID
        ? 'cardnews-today-results'
        : templateId === WEEKLY_FIXTURES_TEMPLATE_ID
          ? 'cardnews-weekly-fixtures'
          : 'cardnews-today-fixtures';
    const filename = `${filenamePrefix}-${safeFilename(todayFixtures.date_label, 'fixtures')}.zip`;

    await recordAudit('card_template_rendered', {
      actor: body.actor || 'admin',
      template_id: templateId,
      fixture_count: Array.isArray(todayFixtures.matches) ? todayFixtures.matches.length : null,
      zip_bytes: zipBytes.length,
    }).catch(() => {});

    sendZip(res, zipBytes, filename);
  } catch (error) {
    await recordAudit('card_template_render_failed', {
      actor: 'admin',
      message: error.message,
      payload: error.payload,
    }).catch(() => {});
    handleError(res, error);
  }
};
