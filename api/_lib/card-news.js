const { eq, select } = require('./supabase');

const CARD_TEMPLATE_ID = 'plick_transfer_v1';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function cardRenderBaseUrl() {
  const value = process.env.CARD_RENDER_API_BASE_URL;
  if (!value) {
    throw Object.assign(new Error('CARD_RENDER_API_BASE_URL is not configured'), { statusCode: 500 });
  }
  return String(value).replace(/\/$/, '');
}

function cardRenderUrl(pathname) {
  const path = String(pathname || '').startsWith('/') ? pathname : `/${pathname}`;
  return `${cardRenderBaseUrl()}${path}`;
}

function cardRenderAuthHeaders(extra = {}) {
  const apiKey = process.env.CARD_RENDER_API_KEY || process.env.INTERNAL_API_KEY || '';
  return {
    ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-Internal-API-Key': apiKey } : {}),
    ...extra,
  };
}

async function readCardRenderError(response) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  const message =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    (typeof payload === 'string' && payload) ||
    response.statusText ||
    'Card render API request failed';

  throw Object.assign(new Error(message), {
    statusCode: response.status >= 500 ? 502 : response.status,
    payload,
  });
}

async function loadPublishedItem(id) {
  const rows = await select('content_items', `select=*&${eq('id', id)}&limit=1`);
  const item = rows[0];
  if (!item) throw Object.assign(new Error('content item not found'), { statusCode: 404 });
  if (item.status !== 'published') {
    throw Object.assign(new Error('card news can only be created for published items'), { statusCode: 400 });
  }
  return item;
}

function briefingFor(item) {
  const aiBriefing = item.ai_result?.briefing || {};
  return {
    title: item.title_ko || aiBriefing.title,
    summary_short: item.summary_short_ko || item.summary_ko || aiBriefing.summary_short,
    summary_detail: item.summary_detail_ko || aiBriefing.summary_detail || item.summary_ko,
    tags: Array.isArray(item.team_tags) ? item.team_tags : aiBriefing.tags,
    status: item.briefing_status || aiBriefing.status,
  };
}

function normalizeSummaryStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  if (['RUMOUR', 'INTEREST', 'NEGOTIATION', 'AGREEMENT', 'OFFICIAL', 'CONFIRMED', 'UPDATE', 'DENIED'].includes(status)) {
    return status;
  }
  if (status === 'RUMOR') return 'RUMOUR';
  return 'UNKNOWN';
}

function cardDraftPayloadFor(item) {
  const briefing = briefingFor(item);
  const tags = Array.isArray(briefing.tags) ? briefing.tags.filter(Boolean).map(tag => String(tag).trim()) : [];
  const author = item.raw_author_name || item.raw_author_handle || 'source';

  return {
    source: {
      post_id: item.raw_post_id || item.id,
      source_url: item.raw_url || undefined,
      author_name: author,
    },
    summary: {
      title: String(briefing.title || item.raw_text || 'EPL 업데이트').trim().slice(0, 80),
      summary_short: String(briefing.summary_short || item.raw_text || '발행된 EPL 기사입니다.').trim().slice(0, 300),
      summary_detail: String(briefing.summary_detail || briefing.summary_short || item.raw_text || '발행된 EPL 기사입니다.').trim().slice(0, 1200),
      tags,
      status: normalizeSummaryStatus(briefing.status || item.news_type),
    },
  };
}

function parseImageDataUrl(value) {
  const match = String(value || '').match(/^data:(image\/(?:png|jpeg|webp));base64,([\s\S]+)$/i);
  if (!match) {
    throw Object.assign(new Error('image_data_url must be a PNG, JPEG, or WebP data URL'), { statusCode: 400 });
  }

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) {
    throw Object.assign(new Error('image_data_url is empty'), { statusCode: 400 });
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('image file is too large'), { statusCode: 413 });
  }
  return { mimeType, buffer };
}

function safeFilename(value, fallback = 'cardnews-image') {
  const clean = String(value || '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || fallback;
}

module.exports = {
  CARD_TEMPLATE_ID,
  cardDraftPayloadFor,
  cardRenderAuthHeaders,
  cardRenderUrl,
  loadPublishedItem,
  parseImageDataUrl,
  readCardRenderError,
  safeFilename,
};
