const { patch, select } = require('./supabase');

function bearer() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw Object.assign(new Error('X_BEARER_TOKEN is required'), { statusCode: 500 });
  }
  return token;
}

async function xFetch(path) {
  const response = await fetch(`https://api.x.com${path}`, {
    headers: {
      Authorization: `Bearer ${bearer()}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload.detail || payload.title || `X API request failed: ${response.status}`), {
      statusCode: response.status >= 500 ? 502 : response.status,
      payload,
    });
  }
  return payload;
}

// reporter(신 스키마)의 x_user_id 확보. 없으면 핸들로 조회 후 저장.
async function lookupUserId(reporter) {
  if (reporter.x_user_id) return reporter.x_user_id;
  const username = String(reporter.x_handle || '').replace(/^@/, '');
  if (!username) throw new Error('reporter is missing x_handle and x_user_id');

  const payload = await xFetch(`/2/users/by/username/${encodeURIComponent(username)}?user.fields=username,name,verified`);
  const userId = payload.data?.id;
  if (!userId) throw new Error(`X user lookup failed for ${username}`);

  await patch('reporters', `reporter_id=eq.${encodeURIComponent(reporter.reporter_id)}`, {
    x_user_id: userId,
    x_handle: payload.data?.username || username,
  });
  return userId;
}

function mediaForTweet(tweet, includes) {
  const keys = tweet.attachments?.media_keys || [];
  const media = includes?.media || [];
  return keys
    .map(key => media.find(item => item.media_key === key))
    .filter(Boolean)
    .map(item => ({
      media_key: item.media_key,
      type: item.type,
      url: item.url || item.preview_image_url || null,
      preview_image_url: item.preview_image_url || null,
      width: item.width || null,
      height: item.height || null,
    }));
}

// 수집 대상 기자 (활성)
async function fetchActiveReporters() {
  return select('reporters', 'select=*&is_active=eq.true&order=name.asc');
}

async function fetchUserPosts(reporter) {
  const userId = await lookupUserId(reporter);
  const params = new URLSearchParams({
    max_results: String(Math.max(5, Math.min(Number(process.env.X_MAX_RESULTS || 20), 100))),
    exclude: 'retweets,replies',
    'tweet.fields': 'attachments,author_id,created_at,conversation_id,entities,lang,possibly_sensitive,public_metrics,referenced_tweets',
    expansions: 'attachments.media_keys',
    'media.fields': 'height,media_key,preview_image_url,type,url,width',
  });

  // 증분 수집: 마지막으로 받은 게시물 id 이후만
  if (reporter.last_article_id) params.set('since_id', reporter.last_article_id);

  const payload = await xFetch(`/2/users/${encodeURIComponent(userId)}/tweets?${params.toString()}`);
  const handle = String(reporter.x_handle || '').replace(/^@/, '');
  const posts = (payload.data || []).map(tweet => ({
    id: tweet.id,
    text: tweet.text,
    created_at: tweet.created_at,
    author_id: tweet.author_id,
    author_handle: handle,
    author_name: reporter.name || null,
    specialty_team: null, // 티어/담당팀은 reporter_teams에 있음(현재 수집엔 미사용)
    public_metrics: tweet.public_metrics || {},
    referenced_tweets: tweet.referenced_tweets || [],
    media: mediaForTweet(tweet, payload.includes),
    raw: tweet,
  }));

  return {
    newestId: posts[0]?.id || reporter.last_article_id || null,
    posts,
  };
}

module.exports = {
  fetchActiveReporters,
  fetchUserPosts,
};
