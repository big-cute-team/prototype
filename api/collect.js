const { requireToken } = require('./_lib/auth');
const { classifyPost } = require('./_lib/ai');
const { loadAliases } = require('./_lib/aliases');
const { persistSummary } = require('./_lib/persist');
const { handleError, json } = require('./_lib/http');
const { notifyError, notifyReview } = require('./_lib/slack');
const { patch } = require('./_lib/supabase');
const { fetchActiveReporters, fetchUserPosts } = require('./_lib/x');

// 슬랙 알림용으로 aiResult+post를 구 item 형태로 약식 변환
function slackItem(ai, post) {
  const briefing = ai.briefing || {};
  return {
    title_ko: briefing.title,
    team_tags: ai.teams || briefing.tags || [],
    briefing_status: briefing.status,
    raw_url: `https://x.com/${post.author_handle}/status/${post.id}`,
    raw_text: post.text,
    confidence: ai.confidence,
  };
}

async function collect() {
  const aliases = await loadAliases();
  const reporters = await fetchActiveReporters();
  const summary = {
    reporters: reporters.length,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    review: 0,
    irrelevant: 0,
    errors: [],
  };

  for (const reporter of reporters) {
    try {
      const result = await fetchUserPosts(reporter);
      summary.fetched += result.posts.length;

      // 오래된 것부터 처리
      for (const post of [...result.posts].reverse()) {
        const ai = await classifyPost(post, aliases); // 판단+요약+enforcePolicy
        const res = await persistSummary(ai, post); // 새 21테이블 적재(post_id 중복 skip)
        if (res.skipped) {
          summary.skipped += 1;
          continue;
        }
        summary.inserted += 1;
        const status = String(res.status || '').toLowerCase(); // review / irrelevant
        summary[status] = (summary[status] || 0) + 1;

        // AI는 REVIEW/IRRELEVANT만 부여 → 검수 필요 알림만
        if (res.status === 'REVIEW') {
          await notifyReview(slackItem(ai, post), ai.review_reason || 'AI requested review').catch(() => {});
        }
      }

      // 증분 수집 커서 갱신
      if (result.newestId) {
        await patch('reporters', `reporter_id=eq.${encodeURIComponent(reporter.reporter_id)}`, {
          last_article_id: result.newestId,
        });
      }
    } catch (error) {
      const entry = { reporter: reporter.x_handle, message: error.message };
      summary.errors.push(entry);
      await notifyError(error.message, entry).catch(() => {});
    }
  }

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
