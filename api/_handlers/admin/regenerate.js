const fs = require('fs');
const path = require('path');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { eq, select } = require('../../_lib/supabase');
const { matchAliasRows } = require('../../_lib/constants');

const CONTENT_PROMPT = fs.readFileSync(path.join(__dirname, '../../../content.md'), 'utf8').trim();
const BRIEFING_STATUSES = ['OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED'];
const TARGET_TEAM_CODES = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];

function openAiBaseUrl() {
  return String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function buildSystemPrompt() {
  return [
    CONTENT_PROMPT,
    '',
    '=== ADMIN CONTEXT RULES ===',
    'The user message may include an "admin_context" field.',
    'This is verified, authoritative information provided by an admin editor.',
    'Treat every fact in admin_context as true — incorporate it into the briefing exactly as you would incorporate facts from the tweet itself.',
    'Generate the briefing as if the tweet and admin_context together are the full source.',
    '=== END ADMIN CONTEXT RULES ===',
  ].join('\n');
}

function parseBriefing(text) {
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

function normalizeBriefingResult(raw) {
  const status = BRIEFING_STATUSES.includes(String(raw.status || '').toUpperCase())
    ? String(raw.status).toUpperCase()
    : 'UPDATE';
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter(t => TARGET_TEAM_CODES.includes(String(t).toUpperCase())).map(t => String(t).toUpperCase())
    : [];
  return {
    title_ko: String(raw.title || '').trim(),
    summary_short_ko: String(raw.summary_short || '').trim(),
    summary_detail_ko: String(raw.summary_detail || '').trim(),
    briefing_status: status,
    team_tags: tags,
  };
}

async function callOpenAI(item, note, aliases) {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { statusCode: 500 });
  }

  // 전체 alias 대신 이 트윗에 매칭된 행만 인풋에 넣는다.
  const matchedRows = matchAliasRows(item.raw_text, aliases);

  const userMessage = JSON.stringify({
    tweet: item.raw_text,
    target_team_aliases: matchedRows,
    admin_context: note,
  });

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
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || 'OpenAI regeneration failed'), {
      statusCode: response.status >= 500 ? 502 : response.status,
    });
  }

  const content = payload.choices?.[0]?.message?.content;
  return parseBriefing(content);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);
    if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
    if (!body.note || !String(body.note).trim()) {
      throw Object.assign(new Error('note is required'), { statusCode: 400 });
    }

    const rows = await select('content_items', `select=*&${eq('id', body.id)}&limit=1`);
    const item = rows[0];
    if (!item) throw Object.assign(new Error('content item not found'), { statusCode: 404 });

    const aliases = await select(
      'team_aliases',
      'select=team_code,alias,entity_type,korean_name,notes&active=eq.true&order=team_code.asc,alias.asc'
    );

    const raw = await callOpenAI(item, String(body.note).trim(), aliases);
    const briefing = normalizeBriefingResult(raw);

    await recordAudit('admin_regenerate', {
      content_item_id: item.id,
      actor: body.actor || 'admin',
      note: String(body.note).trim(),
    });

    json(res, 200, { ok: true, briefing });
  } catch (error) {
    handleError(res, error);
  }
};
