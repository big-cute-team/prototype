const { insert } = require('./supabase');

async function recordAudit(eventType, payload = {}) {
  try {
    await insert('audit_events', [{
      event_type: eventType,
      content_item_id: payload.content_item_id || null,
      source_id: payload.source_id || null,
      actor: payload.actor || 'system',
      payload,
    }]);
  } catch (error) {
    console.error('audit_events insert failed', error);
  }
}

module.exports = {
  recordAudit,
};
