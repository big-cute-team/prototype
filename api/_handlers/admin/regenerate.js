const fs = require('fs');
const path = require('path');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { eq, select } = require('../../_lib/supabase');
const { TARGET_TEAMS, matchesAlias, normalizeText } = require('../../_lib/constants');

const CONTENT_PROMPT = fs.readFileSync(path.join(__dirname, '../../../content.md'), 'utf8').trim();
const BRIEFING_STATUSES = ['OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED'];
const TARGET_TEAM_CODES = TARGET_TEAMS.map(team => team.code);

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
    'Use matched_target_aliases and current_team_tags as team context, but do not invent facts beyond tweet and admin_context.',
    'If current_briefing_status is provided, preserve it only when it still matches the tweet and admin_context.',
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

function normalizeBriefingResult(raw, fallback = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const fallbackStatus = BRIEFING_STATUSES.includes(String(fallback.status || '').toUpperCase())
    ? String(fallback.status).toUpperCase()
    : 'UPDATE';
  const status = BRIEFING_STATUSES.includes(String(source.status || '').toUpperCase())
    ? String(source.status).toUpperCase()
    : fallbackStatus;
  const tags = normalizeTags(source.tags);
  return {
    title_ko: String(source.title || fallback.title || '').trim(),
    summary_short_ko: String(source.summary_short || fallback.summary_short || '').trim(),
    summary_detail_ko: String(source.summary_detail || fallback.summary_detail || '').trim(),
    briefing_status: status,
    team_tags: tags.length ? tags : normalizeTags(fallback.tags),
  };
}

function normalizeTags(values) {
  const output = [];
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    for (const piece of String(value || '').split(/[,\s]+/)) {
      const code = piece.trim().toUpperCase();
      if (TARGET_TEAM_CODES.includes(code) && !output.includes(code)) output.push(code);
    }
  }
  return output;
}

function firstNonEmptyTags(...sources) {
  for (const source of sources) {
    const tags = normalizeTags(source);
    if (tags.length) return tags;
  }
  return [];
}

function compactAliasRow(row) {
  return {
    team_code: String(row.team_code || row.teamCode || '').trim().toUpperCase(),
    alias: row.alias || row.label,
    entity_type: row.entity_type || row.entityType || 'alias',
  };
}

function findMatchedTargetAliases(text, aliases = []) {
  const normalized = normalizeText(text);
  const output = [];
  const seen = new Set();

  function add(row) {
    const compact = compactAliasRow(row);
    const alias = String(compact.alias || '').trim();
    if (!TARGET_TEAM_CODES.includes(compact.team_code) || !alias) return;

    const key = `${compact.team_code}:${compact.entity_type}:${alias.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({
      team_code: compact.team_code,
      alias,
      entity_type: compact.entity_type,
    });
  }

  for (const team of TARGET_TEAMS) {
    for (const alias of team.aliases) {
      if (matchesAlias(normalized, alias)) {
        add({ team_code: team.code, alias, entity_type: 'club' });
      }
    }
  }

  for (const row of aliases || []) {
    const compact = compactAliasRow(row);
    const alias = String(compact.alias || '').trim();
    if (!TARGET_TEAM_CODES.includes(compact.team_code) || !alias) continue;
    if (!matchesAlias(normalized, alias)) continue;

    add(compact);
  }

  return output;
}

async function callOpenAI(item, note, aliases) {
  if (!process.env.OPENAI_API_KEY) {
    throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { statusCode: 500 });
  }

  const userMessage = JSON.stringify({
    tweet: item.raw_text,
    matched_target_aliases: findMatchedTargetAliases(item.raw_text, aliases),
    current_team_tags: firstNonEmptyTags(item.team_tags, item.ai_result?.teams, item.ai_result?.briefing?.tags),
    current_briefing_status: item.briefing_status || item.ai_result?.briefing?.status || null,
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

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: { message: text } };
    }
  }
  if (!response.ok) {
    throw Object.assign(new Error(payload.error?.message || 'OpenAI regeneration failed'), {
      statusCode: response.status >= 500 ? 502 : response.status,
      payload,
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
      'select=team_code,alias,entity_type&active=eq.true&order=team_code.asc,alias.asc'
    );

    const raw = await callOpenAI(item, String(body.note).trim(), aliases);
    const briefing = normalizeBriefingResult(raw, {
      title: item.title_ko,
      summary_short: item.summary_short_ko || item.summary_ko,
      summary_detail: item.summary_detail_ko || item.summary_ko,
      tags: firstNonEmptyTags(item.team_tags, item.ai_result?.teams, item.ai_result?.briefing?.tags),
      status: item.briefing_status || item.ai_result?.briefing?.status || null,
    });

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
