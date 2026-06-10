const crypto = require('crypto');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { cardRenderAuthHeaders, cardRenderUrl, readCardRenderError } = require('../../_lib/card-news');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { insert, select, patch, eq, supabaseFetch } = require('../../_lib/supabase');

const PUBLICATION_KINDS = new Set(['article', 'today_fixtures']);
const PUBLICATION_STATUSES = new Set(['pending', 'queued', 'running', 'zip_pending', 'completed', 'failed']);

async function requestRenderJob(renderRequest, publicationId) {
  const response = await fetch(cardRenderUrl('/card/render-jobs'), {
    method: 'POST',
    headers: cardRenderAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      publication_id: publicationId,
      ...renderRequest,
    }),
  });

  if (!response.ok) await readCardRenderError(response);
  return response.json();
}

async function deleteRenderStorageKeys(keys) {
  if (!keys.length) return { deleted_count: 0 };
  const response = await fetch(cardRenderUrl('/card/storage/delete'), {
    method: 'POST',
    headers: cardRenderAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ keys }),
  });

  if (!response.ok) await readCardRenderError(response);
  return response.json();
}

function mergeRenderTimings(sourcePayload, job) {
  const base = sourcePayload && typeof sourcePayload === 'object' && !Array.isArray(sourcePayload) ? sourcePayload : {};
  const timings = job?.timings_ms;
  if (!timings || typeof timings !== 'object' || Array.isArray(timings) || Object.keys(timings).length === 0) {
    return base;
  }
  return { ...base, render_timings_ms: timings };
}

function patchForJob(job, sourcePayload = {}) {
  const status = PUBLICATION_STATUSES.has(job.status) ? job.status : 'running';
  return {
    status,
    render_job_id: job.job_id || null,
    source_payload: mergeRenderTimings(sourcePayload, job),
    pages: Array.isArray(job.pages) ? job.pages : [],
    instagram_pages: Array.isArray(job.instagram_pages) ? job.instagram_pages : [],
    zip_url: job.zip_url || null,
    r2_prefix: job.r2_prefix || null,
    error_message: job.error_message || null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };
}

function requirePublicationBody(body) {
  const kind = String(body.kind || '').trim();
  if (!PUBLICATION_KINDS.has(kind)) {
    throw Object.assign(new Error('kind must be article or today_fixtures'), { statusCode: 400 });
  }
  if (!body.render_request || typeof body.render_request !== 'object' || Array.isArray(body.render_request)) {
    throw Object.assign(new Error('render_request is required'), { statusCode: 400 });
  }
  const title = String(body.title || '').trim();
  if (!title) throw Object.assign(new Error('title is required'), { statusCode: 400 });

  return {
    kind,
    title,
    caption: String(body.caption || '').trim() || null,
    contentItemId: body.content_item_id || null,
    templateId: body.render_request.template_id || body.template_id || null,
    sourcePayload: body.source_payload && typeof body.source_payload === 'object' ? body.source_payload : {},
    renderRequest: body.render_request,
  };
}

async function listPublications(req, res) {
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 50), 100));
  const filters = [`select=*&order=created_at.desc&limit=${limit}`];
  if (req.query?.content_item_id) filters.push(eq('content_item_id', req.query.content_item_id));
  if (req.query?.kind) filters.push(`kind=eq.${encodeURIComponent(req.query.kind)}`);
  const rows = await select('card_news_publications', filters.join('&'));
  json(res, 200, { publications: rows || [] });
}

async function createPublication(req, res) {
  const body = await parseJsonBody(req);
  const payload = requirePublicationBody(body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    content_item_id: payload.contentItemId,
    kind: payload.kind,
    status: 'pending',
    render_job_id: null,
    template_id: payload.templateId,
    title: payload.title,
    caption: payload.caption,
    source_payload: payload.sourcePayload,
    pages: [],
    instagram_pages: [],
    zip_url: null,
    r2_prefix: null,
    error_message: null,
    created_at: now,
    completed_at: null,
  };

  await insert('card_news_publications', [row]);
  try {
    const job = await requestRenderJob(payload.renderRequest, id);
    const updated = await patch('card_news_publications', eq('id', id), patchForJob(job, payload.sourcePayload));
    await recordAudit('card_news_publication_started', {
      content_item_id: payload.contentItemId,
      actor: body.actor || 'admin',
      publication_id: id,
      render_job_id: job.job_id,
      kind: payload.kind,
    });
    json(res, 200, { ok: true, publication: updated[0] || { ...row, ...patchForJob(job, payload.sourcePayload) } });
  } catch (error) {
    await patch('card_news_publications', eq('id', id), {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

function storageKeysForPublication(publication) {
  const keys = new Set();
  const pages = Array.isArray(publication.pages) ? publication.pages : [];
  pages.forEach(page => {
    if (page?.key) keys.add(String(page.key));
  });
  const instagramPages = Array.isArray(publication.instagram_pages) ? publication.instagram_pages : [];
  instagramPages.forEach(page => {
    if (page?.key) keys.add(String(page.key));
  });
  if (publication.r2_prefix) keys.add(`${String(publication.r2_prefix).replace(/\/$/, '')}/cardnews.zip`);
  return [...keys];
}

async function deletePublication(req, res) {
  const id = String(req.query?.id || '').trim();
  if (!id) throw Object.assign(new Error('id is required'), { statusCode: 400 });

  const rows = await select('card_news_publications', `select=*&${eq('id', id)}&limit=1`);
  const current = rows[0];
  if (!current) throw Object.assign(new Error('card news publication not found'), { statusCode: 404 });

  let storageWarning = null;
  try {
    await deleteRenderStorageKeys(storageKeysForPublication(current));
  } catch (error) {
    storageWarning = error.message || 'R2 cleanup failed';
  }

  await supabaseFetch('card_news_publications', {
    method: 'DELETE',
    query: eq('id', id),
  });
  await recordAudit('card_news_publication_deleted', {
    content_item_id: current.content_item_id,
    actor: req.query?.actor || 'admin',
    publication_id: id,
    storage_warning: storageWarning,
  }).catch(() => {});
  json(res, 200, { ok: true, storage_warning: storageWarning });
}

module.exports = async function handler(req, res) {
  try {
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    if (req.method === 'GET') {
      await listPublications(req, res);
      return;
    }
    if (req.method === 'POST') {
      await createPublication(req, res);
      return;
    }
    if (req.method === 'DELETE') {
      await deletePublication(req, res);
      return;
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    handleError(res, error);
  }
};
