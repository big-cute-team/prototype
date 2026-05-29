const fs = require('fs');
const path = require('path');
const { OFFICIAL_KEYWORDS, RUMOUR_KEYWORDS, TARGET_TEAMS, hasAny, matchTeams } = require('./constants');

const TARGET_TEAM_CODES = TARGET_TEAMS.map(team => team.code);
const BRIEFING_STATUSES = ['OFFICIAL', 'RUMOUR', 'UPDATE', 'CONFIRMED', 'DENIED'];
const TEAM_RESOLUTIONS = ['certain', 'ambiguous', 'none'];
const CONTENT_PROMPT = fs.readFileSync(path.join(__dirname, '../../content.md'), 'utf8').trim();
const TARGET_TEAM_NAME_PATTERN = [
  'manchester united',
  'man utd',
  'man united',
  'mufc',
  'manchester city',
  'man city',
  'mcfc',
  'liverpool',
  'lfc',
  'arsenal',
  'tottenham',
  'spurs',
  'thfc',
  'chelsea',
  'cfc',
  '맨유',
  '맨시티',
  '리버풀',
  '아스날',
  '아스널',
  '토트넘',
  '첼시',
].join('|');
const GENERIC_NO_INFO_PATTERN = '(?:soon|more soon|more to follow|watch|watch this|thoughts|big news soon|announcement soon)';
const KOREAN_SUMMARY_FALLBACK = '한국어 요약 생성이 충분하지 않아 원문 확인 후 검수가 필요합니다.';
const NON_TARGET_SUMMARY = '대상 6개 팀과 직접 연결되지 않아 폐기된 글입니다.';

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'is_target_relevant',
    'teams',
    'decision',
    'confidence',
    'entities',
    'evidence',
    'review_reason',
    'is_informative',
    'requires_visual_context',
    'is_journalist_opinion',
    'team_resolution',
    'briefing',
  ],
  properties: {
    is_target_relevant: { type: 'boolean' },
    teams: {
      type: 'array',
      items: { type: 'string', enum: TARGET_TEAM_CODES },
    },
    decision: { type: 'string', enum: ['publish', 'review', 'discard'] },
    confidence: { type: 'number' },
    entities: {
      type: 'object',
      additionalProperties: false,
      required: ['players', 'clubs', 'competitions', 'journalists'],
      properties: {
        players: { type: 'array', items: { type: 'string' } },
        clubs: { type: 'array', items: { type: 'string' } },
        competitions: { type: 'array', items: { type: 'string' } },
        journalists: { type: 'array', items: { type: 'string' } },
      },
    },
    evidence: { type: 'array', items: { type: 'string' } },
    review_reason: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
    is_informative: { type: 'boolean' },
    requires_visual_context: { type: 'boolean' },
    is_journalist_opinion: { type: 'boolean' },
    team_resolution: { type: 'string', enum: TEAM_RESOLUTIONS },
    briefing: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary_short', 'summary_detail', 'tags', 'status'],
      properties: {
        title: { type: 'string' },
        summary_short: { type: 'string' },
        summary_detail: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string', enum: TARGET_TEAM_CODES },
        },
        status: { type: 'string', enum: BRIEFING_STATUSES },
      },
    },
  },
};

function parseChatContent(payload) {
  return payload.choices?.[0]?.message?.content || null;
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Solar response did not include message content');

  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    throw new Error('Solar response was not valid JSON');
  }
}

function uniqueTargetTeams(values) {
  const allowed = new Set(TARGET_TEAM_CODES);
  const output = [];
  for (const value of values || []) {
    const code = String(value || '').trim().toUpperCase();
    if (allowed.has(code) && !output.includes(code)) output.push(code);
  }
  return output;
}

function normalizeConfidence(value) {
  let confidence = Number.isFinite(Number(value)) ? Number(value) : 0;
  if (confidence > 1 && confidence <= 100) confidence /= 100;
  return Math.max(0, Math.min(confidence, 1));
}

function normalizeDecision(value) {
  return ['publish', 'review', 'discard'].includes(value) ? value : 'review';
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeTeamResolution(value, fallback = 'none') {
  const normalized = String(value || '').trim().toLowerCase();
  return TEAM_RESOLUTIONS.includes(normalized) ? normalized : fallback;
}

function normalizeStatus(value, fallback = 'UPDATE') {
  const normalized = String(value || '').trim().toUpperCase();
  if (BRIEFING_STATUSES.includes(normalized)) return normalized;
  if (normalized === 'OFFICIAL') return 'OFFICIAL';
  if (normalized === 'CONFIRMED') return 'CONFIRMED';
  if (normalized === 'RUMOUR' || normalized === 'RUMOR') return 'RUMOUR';
  if (normalized === 'IRRELEVANT' || normalized === 'AMBIGUOUS') return fallback;
  return fallback;
}

function reviewReason(value) {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean ? clean : null;
}

function textSnippet(post, max = 220) {
  const text = String(post.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function hasHangul(value) {
  return /[가-힣]/.test(String(value || ''));
}

function ensureKoreanBriefing(briefing, targetRelevant) {
  const fallback = targetRelevant
    ? {
      title: '검수 필요 EPL 업데이트',
      summary_short: KOREAN_SUMMARY_FALLBACK,
      summary_detail: KOREAN_SUMMARY_FALLBACK,
    }
    : {
      title: '비대상 EPL 업데이트',
      summary_short: NON_TARGET_SUMMARY,
      summary_detail: NON_TARGET_SUMMARY,
    };

  const next = {
    ...briefing,
    title: hasHangul(briefing.title) ? briefing.title : fallback.title,
    summary_short: hasHangul(briefing.summary_short) ? briefing.summary_short : fallback.summary_short,
    summary_detail: hasHangul(briefing.summary_detail) ? briefing.summary_detail : fallback.summary_detail,
  };

  return {
    briefing: next,
    changed:
      next.title !== briefing.title ||
      next.summary_short !== briefing.summary_short ||
      next.summary_detail !== briefing.summary_detail,
  };
}

function normalizedPostText(post) {
  return String(post.text || '').replace(/\s+/g, ' ').trim();
}

function isClearlyNonInformative(post) {
  const text = normalizedPostText(post);
  if (!text) return true;

  const normalized = text.toLowerCase();
  const withoutUrls = normalized.replace(/https?:\/\/\S+/g, '').trim();
  if (!withoutUrls) return true;
  if (withoutUrls.length < 12) return true;

  const compact = withoutUrls.replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, ' ').trim();
  const targetTeamToken = `(?:${TARGET_TEAM_NAME_PATTERN})`;
  const teamOnlyTease = new RegExp(
    `^(?:${targetTeamToken}\\s+)?${GENERIC_NO_INFO_PATTERN}(?:\\s+${targetTeamToken})?$`,
    'i'
  );
  if (teamOnlyTease.test(compact)) return true;

  return [
    /^soon\.?$/,
    /^more soon\.?$/,
    /^more to follow\.?$/,
    /^watch\.?$/,
    /^watch this\.?$/,
    /^thoughts\??$/,
    /^big news soon\.?$/,
    /^announcement soon\.?$/,
  ].some(pattern => pattern.test(withoutUrls));
}

function isMediaHeavy(post) {
  if ((post.media || []).length === 0) return false;
  return isClearlyNonInformative(post);
}

function legacyNewsTypeFromBriefingStatus(status, decision) {
  if (decision === 'discard') return 'irrelevant';
  const normalized = normalizeStatus(status);
  if (normalized === 'OFFICIAL' || normalized === 'CONFIRMED') return 'official';
  if (normalized === 'RUMOUR') return 'rumour';
  return 'ambiguous';
}

function normalizeBriefing(result, teams, post) {
  const source = result.briefing || {};
  const status = normalizeStatus(source.status, 'UPDATE');
  const fallbackSummary = textSnippet(post);
  const title = String(source.title || '검수 필요 EPL 업데이트').trim();
  const summaryShort = String(source.summary_short || fallbackSummary).trim();
  const summaryDetail = String(source.summary_detail || source.summary_short || fallbackSummary).trim();

  return {
    title,
    summary_short: summaryShort,
    summary_detail: summaryDetail,
    tags: uniqueTargetTeams(source.tags || teams),
    status,
  };
}

function neutralBriefing(post) {
  return {
    title: '비대상 EPL 업데이트',
    summary_short: NON_TARGET_SUMMARY,
    summary_detail: NON_TARGET_SUMMARY,
    tags: [],
    status: 'UPDATE',
  };
}

function fallbackStatus({ relevant, officialish, rumourish }) {
  if (!relevant) return 'UPDATE';
  if (rumourish) return 'RUMOUR';
  if (officialish) return 'CONFIRMED';
  return 'UPDATE';
}

function fallbackClassify(post, aliases) {
  const teams = matchTeams(post.text, aliases);
  const relevant = teams.length > 0;
  const officialish = hasAny(post.text, OFFICIAL_KEYWORDS);
  const rumourish = hasAny(post.text, RUMOUR_KEYWORDS);
  const status = fallbackStatus({ relevant, officialish, rumourish });
  const snippet = textSnippet(post);

  return enforcePolicy({
    is_target_relevant: relevant,
    teams,
    decision: relevant ? 'review' : 'discard',
    confidence: relevant ? 0.55 : 0.9,
    entities: {
      players: [],
      clubs: teams,
      competitions: [],
      journalists: post.author_handle ? [post.author_handle] : [],
    },
    evidence: relevant ? ['OpenAI 키가 없어 alias 기반 규칙으로만 분류했습니다.'] : ['대상 6개 팀 alias와 일치하지 않았습니다.'],
    is_informative: !isClearlyNonInformative(post),
    requires_visual_context: isMediaHeavy(post),
    is_journalist_opinion: false,
    team_resolution: relevant ? 'certain' : 'none',
    review_reason: relevant
      ? (isMediaHeavy(post) ? '사진/영상 중심이거나 텍스트가 짧아 검수가 필요합니다.' : 'OpenAI 키가 없어 자동 발행하지 않고 검수로 보냅니다.')
      : null,
    briefing: {
      title: relevant ? '검수 필요 EPL 업데이트' : '비대상 EPL 업데이트',
      summary_short: snippet || '원문 텍스트가 비어 있습니다.',
      summary_detail: snippet || '원문 텍스트가 비어 있습니다.',
      tags: teams,
      status,
    },
  }, post, aliases);
}

function enforcePolicy(result, post, aliases = []) {
  const localEvidenceTeams = uniqueTargetTeams(matchTeams(post.text, aliases));
  const modelTeams = uniqueTargetTeams([...(result.teams || []), ...((result.briefing && result.briefing.tags) || [])]);
  const modelClaimsTarget = normalizeBoolean(result.is_target_relevant, false) || modelTeams.length > 0;
  const confirmedTarget = localEvidenceTeams.length > 0;
  const hasPossibleTarget = confirmedTarget || modelClaimsTarget;
  const teams = confirmedTarget
    ? uniqueTargetTeams([...localEvidenceTeams, ...modelTeams])
    : modelTeams;
  const confidence = normalizeConfidence(result.confidence);
  const briefing = normalizeBriefing(result, teams, post);
  const evidence = Array.isArray(result.evidence) ? result.evidence.filter(Boolean).map(String) : [];
  const hasEvidence = evidence.length > 0;
  const informative = normalizeBoolean(result.is_informative, !isClearlyNonInformative(post)) && !isClearlyNonInformative(post);
  const requiresVisualContext = normalizeBoolean(result.requires_visual_context, isMediaHeavy(post)) || isMediaHeavy(post);
  const journalistOpinion = normalizeBoolean(result.is_journalist_opinion, false);
  const teamResolution = confirmedTarget
    ? 'certain'
    : normalizeTeamResolution(result.team_resolution, modelClaimsTarget ? 'ambiguous' : 'none');
  const reason = reviewReason(result.review_reason);
  const koreanGuard = ensureKoreanBriefing(briefing, hasPossibleTarget);
  const koreanReviewReason = hasPossibleTarget && koreanGuard.changed
    ? '한국어 브리핑이 충분하지 않아 검수가 필요합니다.'
    : null;
  let decision = normalizeDecision(result.decision);

  const cleanResult = {
    ...result,
    is_target_relevant: hasPossibleTarget,
    teams: hasPossibleTarget ? teams : [],
    decision,
    confidence,
    entities: {
      players: Array.isArray(result.entities?.players) ? result.entities.players : [],
      clubs: Array.isArray(result.entities?.clubs) ? result.entities.clubs : [],
      competitions: Array.isArray(result.entities?.competitions) ? result.entities.competitions : [],
      journalists: Array.isArray(result.entities?.journalists) ? result.entities.journalists : [],
    },
    evidence,
    is_informative: informative,
    requires_visual_context: requiresVisualContext,
    is_journalist_opinion: journalistOpinion,
    team_resolution: teamResolution,
    review_reason: reason || koreanReviewReason,
    briefing: {
      ...koreanGuard.briefing,
      tags: hasPossibleTarget ? teams : [],
    },
  };

  // 1. 이미지/영상/링크 없이 의미 불명 → 팀 특정 여부와 무관하게 review
  if (requiresVisualContext) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '이미지/영상 또는 링크를 봐야 의미를 파악할 수 있어 검수가 필요합니다.',
    };
  }

  // 2. 정보성 부족 → review
  if (!informative) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '게시글 자체에서 전달할 정보가 부족해 검수가 필요합니다.',
    };
  }

  // 3. 대상 팀 없음 → discard
  if (!hasPossibleTarget) {
    return {
      ...cleanResult,
      is_target_relevant: false,
      teams: [],
      decision: 'discard',
      review_reason: null,
      briefing: neutralBriefing(post),
    };
  }

  // 4. 팀 alias 미확정 → review
  if (!confirmedTarget || teamResolution !== 'certain') {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || 'team_aliases로 대상 팀을 확정할 수 없어 검수가 필요합니다.',
    };
  }

  // 5. 기자 의견글 → review
  if (journalistOpinion) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '기자의 감상이나 의견이 중심인 글이라 검수가 필요합니다.',
    };
  }

  // 6. AI가 discard 했지만 팀 근거 있음 → review
  if (cleanResult.decision === 'discard') {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '대상 팀 근거가 있어 폐기 전에 검수가 필요합니다.',
    };
  }

  // 7. 모든 review 조건 통과 → publish
  if (!cleanResult.review_reason) {
    return {
      ...cleanResult,
      decision: 'publish',
      review_reason: null,
    };
  }

  return {
    ...cleanResult,
    decision: 'review',
  };
}

function openAiBaseUrl() {
  return String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function systemPrompt() {
  return [
    'You classify football X posts for a Korean EPL fan product.',
    'Return JSON only. Do not return markdown, code fences, commentary, or extra text.',
    'The JSON object must follow this exact top-level shape: is_target_relevant, teams, decision, confidence, entities, evidence, review_reason, is_informative, requires_visual_context, is_journalist_opinion, team_resolution, briefing.',
    'Only these target teams are in scope: MUN, MCI, LIV, ARS, TOT, CHE.',
    'Target team Korean names: MUN=맨유, MCI=맨시티, LIV=리버풀, ARS=아스널, TOT=토트넘, CHE=첼시.',
    'Discard posts unrelated to those six teams.',
    '',
    'TEAM TAGGING RULES:',
    'Only Big 6 codes are allowed in teams[]: ARS, CHE, LIV, MCI, MUN, TOT.',
    'Tag a team ONLY when ONE of these two conditions is met:',
    '  (1) The team name or a known alias is explicitly written in the tweet text (e.g. "Arsenal", "Man Utd", "Spurs").',
    '  (2) A player/manager/executive name appears in the target_team_aliases list provided in the user message — use that entry\'s team_code.',
    'DO NOT infer or assume team affiliation from your own training knowledge. If a person is not found in target_team_aliases and no team name appears in the tweet text, you MUST set teams=[] and team_resolution=none.',
    'For transfer/negotiation/interest/collapse: if both clubs are identifiable by the above rules and both are Big 6, tag BOTH. If only one qualifies, tag only that one.',
    'For departure rumour with no confirmed destination: tag only the current club if it is identifiable by the above rules.',
    'Do NOT tag a team just because "Premier League" is mentioned.',
    'Never tag all 6 teams at once. Duplicate codes are not allowed in teams[].',
    'If no Big 6 connection is provable by the rules above, return teams=[] and team_resolution=none.',
    'Set team_resolution=certain ONLY when a team is confirmed via rule (1) or (2) above.',
    'Set team_resolution=ambiguous when a team is mentioned but the connection to a specific Big 6 club is unclear.',
    'Set team_resolution=none when no Big 6 team is identifiable by the rules above.',
    'In the briefing, DO NOT state a player\'s club affiliation (e.g. "아스날 소속") unless that club is explicitly named in the tweet text OR the player appears in target_team_aliases.',
    '',
    'CLASSIFICATION RULES:',
    'Set is_informative=true when the text conveys football news: rumours, talks, interest, denials, collapses, injuries, contracts, squad news, or official announcements.',
    'Set is_informative=false when the text is only a tease, reaction, generic caption, question, joke, or does not convey a concrete update.',
    'Set requires_visual_context=true when the reader must inspect an image, video, link card, or quoted post to understand the news.',
    'Set is_journalist_opinion=true when the post is mainly the journalist giving a personal opinion, feeling, evaluation, joke, or reaction rather than reportable information.',
    'Choose decision=publish when: team_resolution=certain, is_informative=true, requires_visual_context=false, is_journalist_opinion=false.',
    'Choose decision=review when: team is uncertain, needs visual context, lacks concrete information, or is journalist opinion.',
    'Choose decision=discard only when the post is unrelated to all six target teams.',
    'Rumours, speculative updates, denials, and collapses are eligible for decision=publish as long as team and information criteria are met.',
    '',
    'KOREAN NAME RULES:',
    'When writing player/manager/executive names in the briefing, look in target_team_aliases for a Korean (Hangul) alias of that person.',
    'If a Korean Hangul alias exists for the same person in target_team_aliases, use it as the primary name in all briefing fields.',
    'If no Korean alias is available in target_team_aliases, use the most commonly used Korean transcription.',
    '',
    '=== BRIEFING GENERATION RULES ===',
    'The briefing object maps to the "briefing" field in the outer classification JSON.',
    'NOTE: The JSON output described in the rules below is the "briefing" nested object — do NOT output it as a standalone response. It must be embedded as briefing:{} inside the outer classification JSON.',
    CONTENT_PROMPT,
    '=== END BRIEFING RULES ===',
  ].join('\n');
}

function userPrompt(post, aliases) {
  return JSON.stringify({
    required_json_contract: CLASSIFICATION_SCHEMA,
    post,
    target_team_aliases: aliases,
  });
}

async function requestOpenAI(body, allowRetry = true) {
  const response = await fetch(`${openAiBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (response.ok) return payload;

  const message = payload.error?.message || '';
  if (allowRetry && response.status === 400 && /response_format|json_object/i.test(message)) {
    const { response_format: _ignored, ...retryBody } = body;
    return requestOpenAI(retryBody, false);
  }

  throw Object.assign(new Error(message || 'OpenAI classification failed'), {
    statusCode: response.status >= 500 ? 502 : response.status,
    payload,
  });
}

async function classifyPost(post, aliases) {
  if (!process.env.OPENAI_API_KEY) return fallbackClassify(post, aliases);

  const payload = await requestOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt(),
      },
      {
        role: 'user',
        content: userPrompt(post, aliases),
      },
    ],
    temperature: 0.1,
    stream: false,
    response_format: { type: 'json_object' },
  });

  return enforcePolicy(parseJsonObject(parseChatContent(payload)), post, aliases);
}

module.exports = {
  classifyPost,
  enforcePolicy,
  legacyNewsTypeFromBriefingStatus,
};
