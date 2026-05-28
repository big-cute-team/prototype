const { requireToken } = require('./_lib/auth');
const { classifyPost, legacyNewsTypeFromBriefingStatus } = require('./_lib/ai');
const { recordAudit } = require('./_lib/audit');
const { handleError, json } = require('./_lib/http');
const { notifyError, notifyPublished, notifyReview } = require('./_lib/slack');
const { eq, insert, patch, select } = require('./_lib/supabase');
const { fetchActiveSources, fetchUserPosts } = require('./_lib/x');

async function loadAliases() {
  try {
    return await select('team_aliases', 'select=team_code,alias,entity_type&active=eq.true&order=team_code.asc,alias.asc');
  } catch (error) {
    console.error('team_aliases lookup failed', error);
    return [];
  }
}

async function alreadyProcessed(rawPostId) {
  const rows = await select(
    'content_items',
    `select=id,status&${eq('raw_post_id', rawPostId)}&limit=1`
  );
  return rows[0] || null;
}

function statusForDecision(decision) {
  if (decision === 'publish') return 'published';
  if (decision === 'discard') return 'discarded';
  return 'review';
}

async function saveItem(source, post, aiResult) {
  const status = statusForDecision(aiResult.decision);
  const briefing = aiResult.briefing || {};
  const row = {
    source_id: source.id,
    raw_post_id: post.id,
    raw_url: `https://x.com/${post.author_handle}/status/${post.id}`,
    raw_text: post.text,
    raw_created_at: post.created_at,
    raw_author_handle: post.author_handle,
    raw_author_name: post.author_name,
    raw_public_metrics: post.public_metrics || {},
    media: post.media || [],
    ai_result: aiResult,
    team_tags: aiResult.teams || briefing.tags || [],
    briefing_status: briefing.status || 'UPDATE',
    news_type: legacyNewsTypeFromBriefingStatus(briefing.status, aiResult.decision),
    status,
    confidence: aiResult.confidence,
    review_reason: aiResult.review_reason || null,
    title_ko: briefing.title,
    summary_short_ko: briefing.summary_short,
    summary_detail_ko: briefing.summary_detail,
    summary_ko: briefing.summary_short,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };

  const inserted = await insert('content_items', [row]);
  return inserted[0];
}

async function notifyForStatus(item) {
  try {
    if (item.status === 'published') await notifyPublished(item, 'auto-published');
    if (item.status === 'review') await notifyReview(item, item.review_reason || item.ai_result?.review_reason || 'AI requested review');
  } catch (error) {
    await recordAudit('slack_notify_failed', { content_item_id: item.id, message: error.message });
  }
}

async function collect() {
  const aliases = await loadAliases();
  const sources = await fetchActiveSources();
  const summary = {
    sources: sources.length,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    published: 0,
    review: 0,
    discarded: 0,
    errors: [],
  };

  for (const source of sources) {
    try {
      const result = await fetchUserPosts(source);
      summary.fetched += result.posts.length;

      for (const post of [...result.posts].reverse()) {
        const existing = await alreadyProcessed(post.id);
        if (existing) {
          summary.skipped += 1;
          continue;
        }

        const aiResult = await classifyPost(post, aliases);
        const item = await saveItem(source, post, aiResult);
        await recordAudit('content_classified', {
          content_item_id: item.id,
          source_id: source.id,
          raw_post_id: post.id,
          decision: aiResult.decision,
          status: item.status,
        });
        await notifyForStatus(item);

        summary.inserted += 1;
        summary[item.status] = (summary[item.status] || 0) + 1;
      }

      if (result.newestId) {
        await patch('sources', `id=eq.${encodeURIComponent(source.id)}`, {
          last_seen_post_id: result.newestId,
          last_checked_at: new Date().toISOString(),
          last_error: null,
        });
      }
    } catch (error) {
      const entry = { source: source.handle, message: error.message };
      summary.errors.push(entry);
      await recordAudit('collector_source_failed', { source_id: source.id, ...entry, payload: error.payload });
      await patch('sources', `id=eq.${encodeURIComponent(source.id)}`, {
        last_checked_at: new Date().toISOString(),
        last_error: error.message,
      }).catch(() => {});
      await notifyError(error.message, entry).catch(() => {});
    }
  }

  await recordAudit('collector_run_completed', summary);
  return summary;
}

module.exports = async function handler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'CRON_SECRET', 'collector');
    const summary = await collect();
    json(res, 200, { ok: true, summary });
  } catch (error) {
    handleError(res, error);
  }
};
