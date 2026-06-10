const { requireToken } = require('../_lib/auth');
const { recordAudit } = require('../_lib/audit');
const { cardRenderAuthHeaders, cardRenderUrl, readCardRenderError } = require('../_lib/card-news');
const { handleError, json, parseJsonBody } = require('../_lib/http');
const { select, patch, eq } = require('../_lib/supabase');

const PUBLICATION_STATUSES = new Set(['pending', 'queued', 'running', 'completed', 'failed']);

async function requestRenderJobStatus(jobId) {
  const response = await fetch(cardRenderUrl(`/card/render-jobs/${encodeURIComponent(jobId)}`), {
    method: 'GET',
    headers: cardRenderAuthHeaders(),
  });

  if (!response.ok) await readCardRenderError(response);
  return response.json();
}

function patchForJob(job) {
  const status = PUBLICATION_STATUSES.has(job.status) ? job.status : 'running';
  return {
    status,
    pages: Array.isArray(job.pages) ? job.pages : [],
    zip_url: job.zip_url || null,
    r2_prefix: job.r2_prefix || null,
    error_message: job.error_message || null,
    completed_at: ['completed', 'failed'].includes(status) ? new Date().toISOString() : null,
  };
}

module.exports = async function handler(req, res) {
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
    const current = rows[0];
    if (!current) throw Object.assign(new Error('card news publication not found'), { statusCode: 404 });
    if (!current.render_job_id) {
      json(res, 200, { ok: true, publication: current });
      return;
    }

    const job = await requestRenderJobStatus(current.render_job_id);
    const updates = patchForJob(job);
    const updatedRows = await patch('card_news_publications', eq('id', id), updates);
    const publication = updatedRows[0] || { ...current, ...updates };

    if (current.status !== publication.status && ['completed', 'failed'].includes(publication.status)) {
      await recordAudit(`card_news_publication_${publication.status}`, {
        content_item_id: publication.content_item_id,
        actor: body.actor || 'admin',
        publication_id: publication.id,
        render_job_id: publication.render_job_id,
        zip_url: publication.zip_url,
        error_message: publication.error_message,
      }).catch(() => {});
    }

    json(res, 200, { ok: true, publication });
  } catch (error) {
    handleError(res, error);
  }
};
