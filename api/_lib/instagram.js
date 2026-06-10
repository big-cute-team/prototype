const DEFAULT_GRAPH_API_VERSION = 'v25.0';
const DEFAULT_STATUS_POLL_ATTEMPTS = 12;
const DEFAULT_STATUS_POLL_INTERVAL_MS = 1000;
const MAX_CAPTION_LENGTH = 2200;
const MAX_CAROUSEL_ITEMS = 10;

function graphBaseUrl() {
  return String(process.env.INSTAGRAM_GRAPH_API_BASE_URL || 'https://graph.facebook.com').replace(/\/$/, '');
}

function graphVersion() {
  const value = String(process.env.INSTAGRAM_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION).trim();
  return value.startsWith('v') ? value : `v${value}`;
}

function graphUrl(pathname) {
  const clean = String(pathname || '').replace(/^\/+/, '');
  return `${graphBaseUrl()}/${graphVersion()}/${clean}`;
}

function instagramConfig() {
  const igUserId = String(process.env.INSTAGRAM_IG_USER_ID || '').trim();
  const accessToken = String(process.env.INSTAGRAM_ACCESS_TOKEN || '').trim();
  if (!igUserId || !accessToken) {
    throw Object.assign(new Error('INSTAGRAM_IG_USER_ID and INSTAGRAM_ACCESS_TOKEN are required'), {
      statusCode: 500,
    });
  }
  return { igUserId, accessToken };
}

async function readGraphResponse(response) {
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const graphError = payload && typeof payload === 'object' ? payload.error : null;
    const message =
      graphError?.error_user_msg ||
      graphError?.message ||
      (typeof payload === 'string' && payload) ||
      response.statusText ||
      'Instagram API request failed';
    throw Object.assign(new Error(message), {
      statusCode: response.status >= 500 ? 502 : response.status,
      payload,
    });
  }

  return payload || {};
}

async function graphPost(pathname, params) {
  const { accessToken } = instagramConfig();
  const body = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
  });
  body.set('access_token', accessToken);

  const response = await fetch(graphUrl(pathname), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return readGraphResponse(response);
}

async function graphGet(pathname, params = {}) {
  const { accessToken } = instagramConfig();
  const url = new URL(graphUrl(pathname));
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url);
  return readGraphResponse(response);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function statusPollAttempts() {
  const value = Number(process.env.INSTAGRAM_STATUS_POLL_ATTEMPTS || DEFAULT_STATUS_POLL_ATTEMPTS);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 60) : DEFAULT_STATUS_POLL_ATTEMPTS;
}

function statusPollIntervalMs() {
  const value = Number(process.env.INSTAGRAM_STATUS_POLL_INTERVAL_MS || DEFAULT_STATUS_POLL_INTERVAL_MS);
  return Number.isFinite(value) && value >= 250 ? Math.min(Math.floor(value), 5000) : DEFAULT_STATUS_POLL_INTERVAL_MS;
}

async function waitForContainer(containerId, label) {
  let lastStatus = null;
  const attempts = statusPollAttempts();
  const intervalMs = statusPollIntervalMs();
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await graphGet(containerId, { fields: 'status_code,status' });
    lastStatus = status.status_code || status.status || null;
    if (lastStatus === 'FINISHED') return status;
    if (['ERROR', 'EXPIRED'].includes(lastStatus)) {
      throw Object.assign(new Error(`Instagram ${label} container ${lastStatus.toLowerCase()}`), {
        statusCode: 502,
        payload: status,
      });
    }
    if (attempt < attempts - 1) await sleep(intervalMs);
  }
  throw Object.assign(new Error(`Instagram ${label} container was not ready in time`), {
    statusCode: 504,
    payload: { container_id: containerId, status: lastStatus },
  });
}

function normalizeCaption(caption) {
  const clean = String(caption || '').trim();
  if (clean.length > MAX_CAPTION_LENGTH) {
    throw Object.assign(new Error(`Instagram caption must be ${MAX_CAPTION_LENGTH} characters or fewer`), {
      statusCode: 400,
    });
  }
  return clean;
}

function normalizeImageUrls(imageUrls) {
  const urls = (Array.isArray(imageUrls) ? imageUrls : [])
    .map(url => String(url || '').trim())
    .filter(Boolean);
  if (urls.length < 1) throw Object.assign(new Error('At least one Instagram image URL is required'), { statusCode: 400 });
  if (urls.length > MAX_CAROUSEL_ITEMS) {
    throw Object.assign(new Error(`Instagram carousels can contain up to ${MAX_CAROUSEL_ITEMS} images`), { statusCode: 400 });
  }
  urls.forEach(url => {
    if (!/^https:\/\//i.test(url)) {
      throw Object.assign(new Error('Instagram image URLs must be public HTTPS URLs'), { statusCode: 400 });
    }
  });
  return urls;
}

async function createImageContainer(igUserId, imageUrl, options = {}) {
  const payload = await graphPost(`${igUserId}/media`, {
    image_url: imageUrl,
    is_carousel_item: options.isCarouselItem ? 'true' : undefined,
    caption: options.caption,
  });
  if (!payload.id) throw Object.assign(new Error('Instagram did not return a media container id'), { statusCode: 502, payload });
  return payload.id;
}

async function createCarouselContainer(igUserId, childContainerIds, caption) {
  const payload = await graphPost(`${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childContainerIds.join(','),
    caption,
  });
  if (!payload.id) throw Object.assign(new Error('Instagram did not return a carousel container id'), { statusCode: 502, payload });
  return payload.id;
}

async function publishContainer(igUserId, creationId) {
  const payload = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId,
  });
  if (!payload.id) throw Object.assign(new Error('Instagram did not return a published media id'), { statusCode: 502, payload });
  return payload.id;
}

async function loadPermalink(mediaId) {
  try {
    const payload = await graphGet(mediaId, { fields: 'permalink' });
    return payload.permalink || null;
  } catch {
    return null;
  }
}

async function publishInstagramImages({ imageUrls, caption }) {
  const { igUserId } = instagramConfig();
  const urls = normalizeImageUrls(imageUrls);
  const cleanCaption = normalizeCaption(caption);

  if (urls.length === 1) {
    const containerId = await createImageContainer(igUserId, urls[0], { caption: cleanCaption });
    await waitForContainer(containerId, 'image');
    const mediaId = await publishContainer(igUserId, containerId);
    return {
      media_id: mediaId,
      creation_id: containerId,
      container_ids: [containerId],
      permalink: await loadPermalink(mediaId),
    };
  }

  const childContainerIds = [];
  for (const imageUrl of urls) {
    const childId = await createImageContainer(igUserId, imageUrl, { isCarouselItem: true });
    await waitForContainer(childId, 'carousel child');
    childContainerIds.push(childId);
  }

  const carouselId = await createCarouselContainer(igUserId, childContainerIds, cleanCaption);
  await waitForContainer(carouselId, 'carousel');
  const mediaId = await publishContainer(igUserId, carouselId);
  return {
    media_id: mediaId,
    creation_id: carouselId,
    container_ids: childContainerIds,
    permalink: await loadPermalink(mediaId),
  };
}

module.exports = {
  MAX_CAPTION_LENGTH,
  publishInstagramImages,
};
