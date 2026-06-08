const { requireToken } = require('../_lib/auth');
const { recordAudit } = require('../_lib/audit');
const { handleError, json, parseJsonBody } = require('../_lib/http');

const MAX_TAG_INPUT_LENGTH = 2600;
const REQUIRED_HASHTAGS = [
  '#EPL',
  '#프리미어리그',
  '#해외축구',
  '#축구뉴스',
  '#축구이슈',
  '#이적시장',
  '#빅6',
  '#Football',
];

function openAiBaseUrl() {
  return String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('OpenAI response was empty');
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('OpenAI response was not valid JSON');
  }
}

function normalizeCardInput(card) {
  const cover = card?.cover || {};
  const detail = card?.detail || {};
  return {
    subject: String(cover.subject || '').trim().slice(0, 80),
    headline: String(cover.headline || '').trim().slice(0, 160),
    summary: String(cover.summary || '').trim().slice(0, 300),
    paragraphs: String(detail.paragraphs || '').trim().slice(0, 900),
  };
}

function normalizeHashtags(value) {
  const raw = Array.isArray(value) ? value.join(' ') : String(value || '');
  const tags = raw
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => (tag.startsWith('#') ? tag : `#${tag}`))
    .map(tag => tag.replace(/[^\p{L}\p{N}_#]/gu, ''))
    .filter(tag => tag.length > 1);

  const deduped = [];
  for (const tag of [...tags, ...REQUIRED_HASHTAGS]) {
    const key = tag.toLowerCase();
    if (!deduped.some(existing => existing.toLowerCase() === key)) {
      deduped.push(tag);
    }
  }
  return deduped.slice(0, 22).join(' ');
}

function buildSystemPrompt() {
  return [
    'You generate Instagram hashtags only for Korean PLick football news.',
    'Return JSON only: {"hashtags":"#tag1 #tag2 ..."}',
    'Use the provided subject, headline, summary, and paragraphs only.',
    'Add relevant Korean club/player/person/news-topic hashtags when obvious.',
    'Do not write a caption, sentence, explanation, emoji, or source handle.',
    `Always include these base tags: ${REQUIRED_HASHTAGS.join(' ')}`,
    'Keep the final hashtag string concise, around 12 to 20 tags.',
  ].join('\n');
}

async function callOpenAIForHashtags(card) {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { statusCode: 500 });
  }

  const userMessage = JSON.stringify({ card_news: card });
  if (userMessage.length > MAX_TAG_INPUT_LENGTH) {
    throw Object.assign(new Error('hashtag input is too large'), { statusCode: 413 });
  }

  const response = await fetch(`${openAiBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || 'OpenAI hashtag generation failed'), {
      statusCode: response.status >= 500 ? 502 : response.status,
    });
  }

  const content = payload.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(content);
  const hashtags = normalizeHashtags(parsed.hashtags);
  if (!hashtags) {
    throw Object.assign(new Error('OpenAI hashtags were empty'), { statusCode: 502 });
  }
  return hashtags;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    const body = await parseJsonBody(req);
    if (!body.card || typeof body.card !== 'object' || Array.isArray(body.card)) {
      throw Object.assign(new Error('card is required'), { statusCode: 400 });
    }

    const card = normalizeCardInput(body.card);
    if (!card.headline || !card.summary || !card.paragraphs) {
      throw Object.assign(new Error('headline, summary, and paragraphs are required'), { statusCode: 400 });
    }

    const hashtags = await callOpenAIForHashtags(card);
    await recordAudit('card_news_caption_tags_generated', {
      content_item_id: body.id || null,
      actor: body.actor || 'admin',
      hashtag_count: hashtags.split(/\s+/).filter(Boolean).length,
    }).catch(() => {});

    json(res, 200, { ok: true, hashtags });
  } catch (error) {
    handleError(res, error);
  }
};
