const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { publishInstagramImages } = require('../../_lib/instagram');
const { eq, patch, select } = require('../../_lib/supabase');

function assetUrls(assets) {
  if (!Array.isArray(assets)) return [];
  return assets
    .map(asset => String(asset?.url || '').trim())
    .filter(Boolean);
}

function instagramImageUrlsFor(publication) {
  const instagramPages = assetUrls(publication.instagram_pages);
  if (instagramPages.length > 0) return instagramPages;

  const sourcePayload = publication.source_payload && typeof publication.source_payload === 'object'
    ? publication.source_payload
    : {};
  const sourceInstagramPages = assetUrls(sourcePayload.instagram_pages);
  if (sourceInstagramPages.length > 0) return sourceInstagramPages;

  return [];
}

async function updatePublication(id, updates) {
  const rows = await patch('card_news_publications', eq('id', id), updates);
  return rows[0] || null;
}

module.exports = async function handler(req, res) {
  let current = null;
  let caption = '';
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const body = await parseJsonBody(req);
    const id = String(body.id || '').trim();
    if (!id) throw Object.assign(new Error('id is required'), { statusCode: 400 });

    const rows = await select('card_news_publications', `select=*&${eq('id', id)}&limit=1`);
    current = rows[0];
    if (!current) throw Object.assign(new Error('card news publication not found'), { statusCode: 404 });
    if (current.status !== 'completed') {
      throw Object.assign(new Error('card news must finish rendering before Instagram publish'), { statusCode: 400 });
    }
    if (current.instagram_status === 'published') {
      json(res, 200, { ok: true, publication: current, already_published: true });
      return;
    }

    const imageUrls = instagramImageUrlsFor(current);
    if (imageUrls.length === 0) {
      throw Object.assign(new Error('Instagram JPEG pages are missing. Regenerate this card news before publishing.'), {
        statusCode: 400,
      });
    }

    caption = String(body.caption ?? current.caption ?? '').trim();
    await updatePublication(id, {
      instagram_status: 'publishing',
      instagram_error: null,
      instagram_caption: caption,
    });

    const result = await publishInstagramImages({ imageUrls, caption });
    const publication = await updatePublication(id, {
      instagram_status: 'published',
      instagram_media_id: result.media_id,
      instagram_permalink: result.permalink,
      instagram_error: null,
      instagram_caption: caption,
      instagram_published_at: new Date().toISOString(),
    });

    await recordAudit('card_news_instagram_published', {
      content_item_id: current.content_item_id,
      actor: body.actor || 'admin-ui',
      publication_id: id,
      instagram_media_id: result.media_id,
      instagram_permalink: result.permalink,
      image_count: imageUrls.length,
    });

    json(res, 200, { ok: true, publication: publication || { ...current, ...result } });
  } catch (error) {
    if (current?.id) {
      await updatePublication(current.id, {
        instagram_status: 'failed',
        instagram_error: error.message,
        instagram_caption: caption || current.caption || null,
      }).catch(() => {});
      await recordAudit('card_news_instagram_publish_failed', {
        content_item_id: current.content_item_id,
        actor: 'admin-ui',
        publication_id: current.id,
        message: error.message,
        payload: error.payload,
      }).catch(() => {});
    }
    handleError(res, error);
  }
};
