const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { cardRenderAuthHeaders, cardRenderUrl, readCardRenderError } = require('../../_lib/card-news');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { select, patch, eq } = require('../../_lib/supabase');

const PUBLICATION_STATUSES = new Set(['pending', 'queued', 'running', 'zip_pending', 'completed', 'failed']);
const TODAY_FIXTURES_TEMPLATE_ID = 'plick_today_fixtures_v1';
const WEEKLY_FIXTURES_TEMPLATE_ID = 'plick_weekly_fixtures_v1';
const FIXTURE_TEMPLATE_IDS = new Set([TODAY_FIXTURES_TEMPLATE_ID, WEEKLY_FIXTURES_TEMPLATE_ID]);

async function requestRenderJobStatus(jobId) {
  const response = await fetch(cardRenderUrl(`/card/render-jobs/${encodeURIComponent(jobId)}`), {
    method: 'GET',
    headers: cardRenderAuthHeaders(),
  });

  if (!response.ok) await readCardRenderError(response);
  return response.json();
}

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
    zip_url: job.zip_url || null,
    r2_prefix: job.r2_prefix || null,
    error_message: job.error_message || null,
    completed_at: ['completed', 'failed'].includes(status) ? new Date().toISOString() : null,
  };
}

function renderRequestFromPublication(publication) {
  const sourcePayload = publication.source_payload && typeof publication.source_payload === 'object'
    ? publication.source_payload
    : {};
  if (publication.kind === 'today_fixtures' || FIXTURE_TEMPLATE_IDS.has(publication.template_id)) {
    if (!sourcePayload.today_fixtures) return null;
    const templateId = FIXTURE_TEMPLATE_IDS.has(publication.template_id)
      ? publication.template_id
      : (sourcePayload.today_fixtures?.schedule_type === 'weekly' ? WEEKLY_FIXTURES_TEMPLATE_ID : TODAY_FIXTURES_TEMPLATE_ID);
    return {
      template_id: templateId,
      today_fixtures: sourcePayload.today_fixtures,
    };
  }
  if (!sourcePayload.image_url || !sourcePayload.card) return null;
  return {
    template_id: publication.template_id || 'plick_transfer_v1',
    image_url: sourcePayload.image_url,
    card: sourcePayload.card,
  };
}

function lostRenderJobError(current) {
  return {
    status: 'failed',
    source_payload: current.source_payload || {},
    error_message: 'Render job metadata was lost. Please start the R2 upload again.',
    completed_at: new Date().toISOString(),
  };
}

async function recoverMissingRenderJob(current, actor) {
  const sourcePayload = current.source_payload && typeof current.source_payload === 'object'
    ? current.source_payload
    : {};
  const requeueCount = Number(sourcePayload.render_job_requeue_count || 0);
  const renderRequest = renderRequestFromPublication(current);

  if (!renderRequest || requeueCount >= 1) {
    const updates = lostRenderJobError(current);
    const updatedRows = await patch('card_news_publications', eq('id', current.id), updates);
    const publication = updatedRows[0] || { ...current, ...updates };
    await recordAudit('card_news_publication_failed', {
      content_item_id: publication.content_item_id,
      actor,
      publication_id: publication.id,
      render_job_id: publication.render_job_id,
      error_message: publication.error_message,
    }).catch(() => {});
    return publication;
  }

  const nextSourcePayload = {
    ...sourcePayload,
    render_job_requeue_count: requeueCount + 1,
    render_job_requeued_at: new Date().toISOString(),
    render_job_requeued_from: current.render_job_id,
  };
  const job = await requestRenderJob(renderRequest, current.id);
  const updates = patchForJob(job, nextSourcePayload);
  const updatedRows = await patch('card_news_publications', eq('id', current.id), updates);
  const publication = updatedRows[0] || { ...current, ...updates };
  await recordAudit('card_news_publication_requeued', {
    content_item_id: publication.content_item_id,
    actor,
    publication_id: publication.id,
    previous_render_job_id: current.render_job_id,
    render_job_id: publication.render_job_id,
  }).catch(() => {});
  return publication;
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

    let job;
    try {
      job = await requestRenderJobStatus(current.render_job_id);
    } catch (error) {
      if (error.statusCode === 404 && String(error.message || '').includes('Render job not found')) {
        const publication = await recoverMissingRenderJob(current, body.actor || 'admin');
        json(res, 200, { ok: true, publication });
        return;
      }
      throw error;
    }
    const updates = patchForJob(job, current.source_payload);
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
