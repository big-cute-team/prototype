const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const {
  CARD_TEMPLATE_ID,
  cardRenderAuthHeaders,
  cardRenderUrl,
  loadPublishedItem,
  parseImageDataUrl,
  readCardRenderError,
  safeFilename,
} = require('../../_lib/card-news');
const { handleError, json } = require('../../_lib/http');

const MAX_RENDER_BODY_BYTES = 18 * 1024 * 1024;

function parseLargeJsonBody(req) {
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

function requireCardPayload(body) {
  if (!body.card || typeof body.card !== 'object' || Array.isArray(body.card)) {
    throw Object.assign(new Error('card is required'), { statusCode: 400 });
  }
  return body.card;
}

async function requestRenderWithImageUrl({ card, imageUrl, templateId }) {
  const response = await fetch(cardRenderUrl('/card/render'), {
    method: 'POST',
    headers: cardRenderAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      template_id: templateId,
      image_url: imageUrl,
      card,
    }),
  });

  if (!response.ok) await readCardRenderError(response);
  return Buffer.from(await response.arrayBuffer());
}

async function requestRenderWithUpload({ card, imageDataUrl, imageName, templateId }) {
  const { mimeType, buffer } = parseImageDataUrl(imageDataUrl);
  const form = new FormData();
  form.append('card_json', JSON.stringify({ template_id: templateId, card }));
  form.append('image_file', new Blob([buffer], { type: mimeType }), safeFilename(imageName));

  const response = await fetch(cardRenderUrl('/card/render-upload'), {
    method: 'POST',
    headers: cardRenderAuthHeaders(),
    body: form,
  });

  if (!response.ok) await readCardRenderError(response);
  return Buffer.from(await response.arrayBuffer());
}

function sendZip(res, zipBytes, item) {
  const filename = `cardnews-${item.raw_post_id || item.id}.zip`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(filename, 'cardnews.zip')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(zipBytes);
}

module.exports = async function handler(req, res) {
  let item = null;
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const body = await parseLargeJsonBody(req);
    if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
    const card = requireCardPayload(body);
    const templateId = body.template_id || CARD_TEMPLATE_ID;
    item = await loadPublishedItem(body.id);

    let zipBytes;
    let imageMode;
    if (body.image_data_url) {
      imageMode = 'upload';
      zipBytes = await requestRenderWithUpload({
        card,
        imageDataUrl: body.image_data_url,
        imageName: body.image_name,
        templateId,
      });
    } else if (body.image_url) {
      imageMode = 'url';
      zipBytes = await requestRenderWithImageUrl({
        card,
        imageUrl: body.image_url,
        templateId,
      });
    } else {
      throw Object.assign(new Error('image_data_url or image_url is required'), { statusCode: 400 });
    }

    await recordAudit('card_news_rendered', {
      content_item_id: item.id,
      actor: body.actor || 'admin',
      template_id: templateId,
      image_mode: imageMode,
      zip_bytes: zipBytes.length,
    });

    sendZip(res, zipBytes, item);
  } catch (error) {
    await recordAudit('card_news_render_failed', {
      content_item_id: item?.id,
      actor: 'admin',
      message: error.message,
      payload: error.payload,
    }).catch(() => {});
    handleError(res, error);
  }
};
