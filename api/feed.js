const { mapSummaryToPost } = require('./_lib/feed');
const { handleError, json } = require('./_lib/http');
const { select } = require('./_lib/supabase');

// 피드 1건당 필요한 새 스키마 조인 (요약 + 대표원문/기자 + 팀태그 + 토론)
const FEED_SELECT = [
  'article_summary_id',
  'title',
  'summary_short',
  'summary_detail',
  'content_type',
  'status',
  'category',
  'rumor_stage',
  'published_at',
  'image_url',
  'raw_articles(content,source_url,reporter_tier,reporters(name,x_handle))',
  'team_tags(team_id,teams(short_name))',
  'debates(topic,option_a,option_b,closes_at)',
].join(',');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const limit = Math.max(1, Math.min(Number(req.query?.limit || 50), 100));
    const rows = await select(
      'article_summaries',
      `select=${FEED_SELECT}&status=eq.PUBLISHED&order=published_at.desc.nullslast,created_at.desc&limit=${limit}`
    );

    json(res, 200, {
      items: rows.map(mapSummaryToPost),
      count: rows.length,
    });
  } catch (error) {
    handleError(res, error);
  }
};
