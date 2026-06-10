const crypto = require('crypto');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { cardRenderAuthHeaders, cardRenderUrl, readCardRenderError } = require('../../_lib/card-news');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { insert, select, patch, eq } = require('../../_lib/supabase');

const PUBLICATION_KINDS = new Set(['article', 'today_fixtures']);
const PUBLICATION_STATUSES = new Set(['pending', 'queued', 'running', 'completed', 'failed']);

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

function patchForJob(job) {
  const status = PUBLICATION_STATUSES.has(job.status) ? job.status : 'running';
  return {
    status,
    render_job_id: job.job_id || null,
    pages: Array.isArray(job.pages) ? job.pages : [],
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
    zip_url: null,
    r2_prefix: null,
    error_message: null,
    created_at: now,
    completed_at: null,
  };

  await insert('card_news_publications', [row]);
  try {
    const job = await requestRenderJob(payload.renderRequest, id);
    const updated = await patch('card_news_publications', eq('id', id), patchForJob(job));
    await recordAudit('card_news_publication_started', {
      content_item_id: payload.contentItemId,
      actor: body.actor || 'admin',
      publication_id: id,
      render_job_id: job.job_id,
      kind: payload.kind,
    });
    json(res, 200, { ok: true, publication: updated[0] || { ...row, ...patchForJob(job) } });
  } catch (error) {
    await patch('card_news_publications', eq('id', id), {
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
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
    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    handleError(res, error);
  }
};
