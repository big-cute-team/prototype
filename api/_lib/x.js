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

async function lookupUserId(source) {
  if (source.x_user_id) return source.x_user_id;
  const username = String(source.handle || '').replace(/^@/, '');
  if (!username) throw new Error('Source is missing handle and x_user_id');

  const payload = await xFetch(`/2/users/by/username/${encodeURIComponent(username)}?user.fields=username,name,verified`);
  const userId = payload.data?.id;
  if (!userId) throw new Error(`X user lookup failed for ${username}`);

  await patch('sources', `id=eq.${encodeURIComponent(source.id)}`, {
    x_user_id: userId,
    name: payload.data?.name || source.name || null,
    handle: payload.data?.username || username,
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

async function fetchActiveSources() {
  return select('sources', 'select=*&active=eq.true&order=tier.asc,handle.asc');
}

async function fetchUserPosts(source) {
  const userId = await lookupUserId(source);
  const params = new URLSearchParams({
    max_results: String(Math.max(5, Math.min(Number(process.env.X_MAX_RESULTS || 20), 100))),
    exclude: 'retweets,replies',
    'tweet.fields': 'attachments,author_id,created_at,conversation_id,entities,lang,possibly_sensitive,public_metrics,referenced_tweets',
    expansions: 'attachments.media_keys',
    'media.fields': 'height,media_key,preview_image_url,type,url,width',
  });

  if (source.last_seen_post_id) params.set('since_id', source.last_seen_post_id);

  const payload = await xFetch(`/2/users/${encodeURIComponent(userId)}/tweets?${params.toString()}`);
  const posts = (payload.data || []).map(tweet => ({
    id: tweet.id,
    text: tweet.text,
    created_at: tweet.created_at,
    author_id: tweet.author_id,
    author_handle: String(source.handle || '').replace(/^@/, ''),
    author_name: source.name || null,
    public_metrics: tweet.public_metrics || {},
    referenced_tweets: tweet.referenced_tweets || [],
    media: mediaForTweet(tweet, payload.includes),
    raw: tweet,
  }));

  return {
    newestId: posts[0]?.id || source.last_seen_post_id || null,
    posts,
  };
}

module.exports = {
  fetchActiveSources,
  fetchUserPosts,
};
