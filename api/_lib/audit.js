const { insert } = require('./supabase');

// 구 audit_events 테이블은 새 설계에 없다. 발행/폐기 전이만 article_status_logs에 남긴다(설계 3.18).
async function recordStatusLog(articleSummaryId, status) {
  try {
    await insert('article_status_logs', [{
      article_summary_id: articleSummaryId,
      status, // 'PUBLISHED' | 'DISCARDED'
    }]);
  } catch (error) {
    console.error('article_status_logs insert failed', error);
  }
}

// 일반 감사 로그는 새 설계에서 보관하지 않는다(계정 없는 공용 어드민). 호출부 호환용 no-op.
async function recordAudit() { /* no-op */ }

module.exports = {
  recordAudit,
  recordStatusLog,
};
