const fs = require('fs');
const path = require('path');
const {
  OFFICIAL_KEYWORDS,
  RUMOUR_KEYWORDS,
  TARGET_TEAMS,
  hasAny,
  matchesAlias,
  matchTeams,
  normalizeText,
} = require('./constants');

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
    review_reason: { type: ['string', 'null'] },
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

const CLASSIFICATION_ONLY_SCHEMA = {
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
  ],
  properties: {
    is_target_relevant: { type: 'boolean' },
    teams: {
      type: 'array',
      items: { type: 'string', enum: TARGET_TEAM_CODES },
    },
    decision: { type: 'string', enum: ['publish', 'review', 'discard'] },
    confidence: { type: 'number' },
    entities: CLASSIFICATION_SCHEMA.properties.entities,
    evidence: { type: 'array', items: { type: 'string' } },
    review_reason: { type: ['string', 'null'] },
    is_informative: { type: 'boolean' },
    requires_visual_context: { type: 'boolean' },
    is_journalist_opinion: { type: 'boolean' },
    team_resolution: { type: 'string', enum: TEAM_RESOLUTIONS },
  },
};

const BRIEFING_SCHEMA = CLASSIFICATION_SCHEMA.properties.briefing;

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
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    for (const piece of String(value || '').split(/[,\s]+/)) {
      const code = piece.trim().toUpperCase();
      if (allowed.has(code) && !output.includes(code)) output.push(code);
    }
  }
  return output;
}

function listValues(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function compactAliasRow(row) {
  return {
    team_code: row.team_code || row.teamCode,
    alias: row.alias || row.label,
    entity_type: row.entity_type || row.entityType || 'alias',
  };
}

function findMatchedTargetAliases(post, aliases = []) {
  const normalized = normalizeText(post.text);
  const output = [];
  const seen = new Set();

  function add(row) {
    const compact = compactAliasRow(row);
    const teamCode = String(compact.team_code || '').trim().toUpperCase();
    const alias = String(compact.alias || '').trim();
    if (!TARGET_TEAM_CODES.includes(teamCode) || !alias) return;
    const key = `${teamCode}:${compact.entity_type}:${alias.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    output.push({
      team_code: teamCode,
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
    if (compact.alias && matchesAlias(normalized, compact.alias)) add(compact);
  }

  return output;
}

function compactText(value, max = 500) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function compactEntitiesForAI(post) {
  const entities = post.raw?.entities || post.entities || {};
  const context = {};

  const urls = (entities.urls || [])
    .slice(0, 3)
    .map(url => {
      const expandedUrl = url.expanded_url || url.url || null;
      const unwoundUrl = url.unwound_url && url.unwound_url !== expandedUrl ? url.unwound_url : null;
      const images = Array.isArray(url.images)
        ? url.images.slice(0, 2).map(image => ({
          url: image.url || null,
          width: image.width || null,
          height: image.height || null,
        })).filter(image => image.url)
        : [];
      return {
        expanded_url: expandedUrl || unwoundUrl,
        display_url: url.display_url || null,
        unwound_url: unwoundUrl,
        title: compactText(url.title, 220),
        description: compactText(url.description, 700),
        ...(images.length ? { images } : {}),
      };
    })
    .filter(url => url.expanded_url || url.display_url || url.title || url.description);
  if (urls.length) context.urls = urls;

  const hashtags = (entities.hashtags || [])
    .slice(0, 8)
    .map(tag => tag.tag || tag.text)
    .filter(Boolean);
  if (hashtags.length) context.hashtags = hashtags;

  const mentions = (entities.mentions || [])
    .slice(0, 8)
    .map(mention => mention.username || mention.screen_name)
    .filter(Boolean);
  if (mentions.length) context.mentions = mentions;

  const referencedTweetTypes = (post.referenced_tweets || post.raw?.referenced_tweets || [])
    .map(tweet => tweet.type)
    .filter(Boolean);
  if (referencedTweetTypes.length) context.referenced_tweet_types = [...new Set(referencedTweetTypes)];

  return context;
}

function slimPostForAI(post) {
  const media = Array.isArray(post.media) ? post.media : [];
  const entities = compactEntitiesForAI(post);
  return {
    id: post.id,
    text: post.text,
    created_at: post.created_at || null,
    author_handle: post.author_handle || null,
    author_name: post.author_name || null,
    specialty_team: post.specialty_team || null,
    source_tier: post.source_tier || null,
    has_media: media.length > 0,
    media_types: [...new Set(media.map(item => item?.type).filter(Boolean))],
    ...(Object.keys(entities).length ? { entities } : {}),
  };
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

function ensureKoreanBriefing(briefing, targetRelevant, post) {
  const rawSnippet = post ? textSnippet(post) : '';
  const fallback = {
    title: rawSnippet.slice(0, 40) || (targetRelevant ? '검수 필요 EPL 업데이트' : '비대상 EPL 업데이트'),
    summary_short: rawSnippet || '원문 텍스트가 비어 있습니다.',
    summary_detail: rawSnippet || '원문 텍스트가 비어 있습니다.',
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

function hasSelfContainedText(post, evidence = []) {
  const textWithoutUrls = normalizedPostText(post).replace(/https?:\/\/\S+/g, '').trim();
  if (!textWithoutUrls || isClearlyNonInformative({ ...post, text: textWithoutUrls })) return false;
  if (textWithoutUrls.length >= 60) return true;
  return evidence.some(item => {
    const clean = String(item || '').replace(/https?:\/\/\S+/g, '').trim();
    return clean.length >= 30;
  });
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

function targetBriefingFallback(post, teams = []) {
  return {
    title: '검수 필요 EPL 업데이트',
    summary_short: 'AI 브리핑 생성에 실패해 원문 확인이 필요합니다.',
    summary_detail: 'AI 브리핑 생성에 실패해 원문을 직접 확인해야 합니다.',
    tags: uniqueTargetTeams(teams),
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
  const evidenceTeams = uniqueTargetTeams(matchTeams(post.text, aliases));
  const modelTeams = uniqueTargetTeams([...listValues(result.teams), ...listValues(result.briefing?.tags)]);
  // 전문 기자: 글에 어떤 Big6도 안 잡혔으면 담당 팀으로 fallback 귀속
  const specialty = uniqueTargetTeams([post.specialty_team])[0] || null;
  const modelClaimsTarget = normalizeBoolean(result.is_target_relevant, false) || modelTeams.length > 0;
  const specialistFallback = Boolean(specialty) && evidenceTeams.length === 0 && modelTeams.length === 0 && modelClaimsTarget;
  const localEvidenceTeams = specialistFallback ? [specialty] : evidenceTeams;
  const confirmedTarget = evidenceTeams.length > 0;
  const hasPossibleTarget = confirmedTarget || specialistFallback || modelClaimsTarget;
  const teams = confirmedTarget || specialistFallback
    ? uniqueTargetTeams([...localEvidenceTeams, ...modelTeams])
    : modelTeams;
  // 전문 기자가 자기 담당 팀 글 → specialist match (공신력 상)
  const specialistMatch = Boolean(specialty && teams.includes(specialty));
  const confidence = normalizeConfidence(result.confidence);
  const briefing = normalizeBriefing(result, teams, post);
  const evidence = Array.isArray(result.evidence) ? result.evidence.filter(Boolean).map(String) : [];
  const hasEvidence = evidence.length > 0;
  const informative = normalizeBoolean(result.is_informative, !isClearlyNonInformative(post)) && !isClearlyNonInformative(post);
  const modelRequiresVisualContext = normalizeBoolean(result.requires_visual_context, isMediaHeavy(post));
  const requiresVisualContext = isMediaHeavy(post) || (modelRequiresVisualContext && !hasSelfContainedText(post, evidence));
  const journalistOpinion = normalizeBoolean(result.is_journalist_opinion, false);
  const teamResolution = confirmedTarget
    ? 'certain'
    : normalizeTeamResolution(result.team_resolution, modelClaimsTarget ? 'ambiguous' : 'none');
  const reason = reviewReason(result.review_reason);
  const koreanGuard = ensureKoreanBriefing(briefing, hasPossibleTarget, post);
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
    specialist_match: specialistMatch,
    review_reason: reason || koreanReviewReason,
    briefing: {
      ...koreanGuard.briefing,
      tags: hasPossibleTarget ? teams : [],
    },
  };

  // 1. 대상 팀 없음 → discard (비대상 트윗을 검토 큐로 보내지 않음)
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

  // 2. 이미지/영상/링크 없이 의미 불명 → review
  if (requiresVisualContext) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '이미지/영상 또는 링크를 봐야 의미를 파악할 수 있어 검수가 필요합니다.',
    };
  }

  // 3. 정보성 부족 → review
  if (!informative) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '게시글 자체에서 전달할 정보가 부족해 검수가 필요합니다.',
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

  if (confidence < 0.7 || !hasEvidence) {
    return {
      ...cleanResult,
      decision: 'review',
      review_reason: cleanResult.review_reason || '자동 발행에 필요한 신뢰도 또는 원문 근거가 부족해 검수가 필요합니다.',
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

function classificationSystemPrompt(options = {}) {
  const lines = [
    'Classify one football X post for a Korean EPL Big 6 product. Return JSON only.',
    'Target teams: MUN, MCI, LIV, ARS, TOT, CHE.',
    'Use only explicit team names in the post, matched_target_aliases, or source_specialty_team. Do not infer team affiliation from training knowledge unless the Safety fallback instruction is present below.',
    'source_specialty_team is weak context. If it is the only team signal, choose review, not publish.',
    'If no Big 6 connection is supported by those inputs, set is_target_relevant=false, teams=[], team_resolution=none, decision=discard.',
    'Tag both Big 6 clubs only when both are explicitly identifiable. For departure news without a destination, tag only the identifiable current club.',
    'Do not tag from the words Premier League/EPL alone. Never tag all six teams. Do not duplicate team codes.',
    'Set is_informative=false for teases, jokes, reactions, generic captions, or posts with no concrete football update.',
    'Question-style headlines can be informative only when the post text or URL metadata contains concrete article context. If it only asks a question, choose review with is_informative=false and requires_visual_context=true.',
    'Set requires_visual_context=true when the text cannot be understood without inspecting media, link cards, or quoted posts.',
    'Do not set requires_visual_context=true merely because a URL or media is present when the text itself contains the concrete update.',
    'Set is_journalist_opinion=true for personal opinion, feeling, evaluation, or reaction rather than reportable information.',
    'Choose publish only when team_resolution=certain, confidence>=0.70, evidence contains exact text support, informative, text-sufficient, and not opinion. Otherwise choose review for target-relevant posts.',
    'Rumours, talks, interest, denials, collapses, injuries, contracts, squad news, and official announcements are informative when concrete facts are present.',
    'Do not generate title or summary in this step.',
    'Output keys: is_target_relevant, teams, decision, confidence, entities, evidence, review_reason, is_informative, requires_visual_context, is_journalist_opinion, team_resolution.',
  ];

  if (options.allowKnowledgeFallback) {
    lines.push(
      'Safety fallback: matched_target_aliases is empty. If the post names a well-known current or recent Big 6 player, manager, executive, or club-related person, do not discard it outright.',
      'If matched_target_aliases is empty but source_tier is 1 and the post is concrete football news about a named person or club, choose review when Big 6 relevance is plausible but unconfirmed.',
      'For that fallback, set decision=review, team_resolution=ambiguous, confidence<=0.65, and review_reason explaining that no local alias matched. Never publish from this fallback.'
    );
  }

  return lines.join('\n');
}

function briefingSystemPrompt() {
  return [
    CONTENT_PROMPT,
    '',
    '=== STRICT BRIEFING STYLE OVERRIDES ===',
    'Generate only the nested briefing JSON for a Korean EPL fan product.',
    'Return JSON only. Do not include classification fields outside the briefing object.',
    'All title, summary_short, and summary_detail text must be Korean.',
    'Use only facts from the provided post, X API URL metadata, and classification context.',
    'URL title and description are source material. Use them as article context when present, but do not invent beyond them.',
    'Rewrite in natural Korean football article style, not as a direct translation of English wording.',
    'Translate football roles idiomatically: do not write raw phrases like "임팩트 서브" or "임팩트 교체"; prefer natural Korean phrasing such as "후반 조커", "교체 카드", "승부수", or "벤치 출발" when supported by the source.',
    'Avoid empty machine-summary phrasing such as "가능성이 제기됐다", "전해진다", "여러 매체에서 보도", "논의가 진행 중", "구체적인 상황은 확정되지 않았다", or "추가 정보가 필요하다" unless that exact uncertainty is the source fact.',
    'Do not pad caveats. If the source has few facts, write fewer concrete sentences instead of generic filler.',
    'For names, use a Hangul alias from matched_target_aliases when one is available for the same person; otherwise use the common Korean sports-media transcription.',
    'Do not add club affiliation, recent form, career background, fee, contract length, source credibility, or media coverage unless it is stated in the post or classification context.',
    'If classification indicates review, opinion, weak information, or visual context, write cautiously and do not present unstated context as fact.',
    'Derive status from the original post and the status rules. Do not default to UPDATE when official, confirmed, rumour, denial, rejection, or collapse signals are present.',
    'Output keys: title, summary_short, summary_detail, tags, status.',
    '=== END STRICT BRIEFING STYLE OVERRIDES ===',
  ].join('\n');
}

function classificationUserPrompt(post, matchedAliases) {
  return JSON.stringify({
    post: slimPostForAI(post),
    matched_target_aliases: matchedAliases,
    source_specialty_team: uniqueTargetTeams([post.specialty_team])[0] || null,
    local_team_matches: uniqueTargetTeams(matchedAliases.map(row => row.team_code)),
    no_local_alias_match: matchedAliases.length === 0,
  });
}

function briefingUserPrompt(post, matchedAliases, classification) {
  return JSON.stringify({
    post: slimPostForAI(post),
    matched_target_aliases: matchedAliases,
    classification: {
      teams: classification.teams || [],
      decision: classification.decision,
      confidence: classification.confidence,
      entities: classification.entities || {},
      evidence: classification.evidence || [],
      review_reason: classification.review_reason || null,
      is_informative: classification.is_informative,
      requires_visual_context: classification.requires_visual_context,
      is_journalist_opinion: classification.is_journalist_opinion,
      team_resolution: classification.team_resolution,
    },
  });
}

function attachAiMetadata(result, matchedAliases, metadata = {}) {
  return {
    ...result,
    ai_pipeline: 'split_classification_briefing_v1',
    matched_target_aliases: matchedAliases,
    no_local_alias_match: matchedAliases.length === 0,
    ...metadata,
  };
}

function jsonSchemaResponseFormat(name, schema) {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: true,
      schema,
    },
  };
}

function downgradedResponseFormat(body) {
  if (body.response_format?.type === 'json_schema') {
    return { ...body, response_format: { type: 'json_object' } };
  }

  const { response_format: _ignored, ...withoutResponseFormat } = body;
  return withoutResponseFormat;
}

async function requestOpenAI(body, retryCount = 0) {
  const response = await fetch(`${openAiBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
  if (response.ok) return payload;

  const message = payload.error?.message || '';
  if (retryCount < 2 && response.status === 400 && /response_format|json_schema|json_object|schema/i.test(message)) {
    return requestOpenAI(downgradedResponseFormat(body), retryCount + 1);
  }

  throw Object.assign(new Error(message || 'OpenAI classification failed'), {
    statusCode: response.status >= 500 ? 502 : response.status,
    payload,
  });
}

function briefingHasKorean(result) {
  const b = result?.briefing || {};
  return hasHangul(b.title) || hasHangul(b.summary_short) || hasHangul(b.summary_detail);
}

function briefingStyleIssue(briefing) {
  const text = [
    briefing?.title,
    briefing?.summary_short,
    briefing?.summary_detail,
  ].filter(Boolean).join('\n');
  const patterns = [
    /임팩트\s*(서브|교체)/i,
    /가능성이\s*제기됐/,
    /가능성이\s*제기되고/,
    /논의가\s*(진행|이루어지고)/,
    /여러\s*매체.*보도/,
    /구체적인\s*상황.*확정되지/,
    /추가적인?\s*정보가\s*필요/,
    /결정일\s*수\s*있/,
    /현재\s*아스[널날]\s*소속/,
    /활발한\s*활약/,
  ];
  return patterns.some(pattern => pattern.test(text));
}

async function classifyPost(post, aliases) {
  const matchedAliases = findMatchedTargetAliases(post, aliases);
  if (!process.env.OPENAI_API_KEY) {
    return attachAiMetadata(fallbackClassify(post, aliases), matchedAliases, {
      briefing_generated: false,
      fallback_reason: 'missing_openai_api_key',
    });
  }

  const hasSpecialtyTeam = uniqueTargetTeams([post.specialty_team]).length > 0;
  const allowKnowledgeFallback = matchedAliases.length === 0 && !hasSpecialtyTeam;

  const baseMessages = [
    { role: 'system', content: classificationSystemPrompt({ allowKnowledgeFallback }) },
    { role: 'user', content: classificationUserPrompt(post, matchedAliases) },
  ];
  const baseBody = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: baseMessages,
    temperature: 0.1,
    stream: false,
    response_format: jsonSchemaResponseFormat('epl_post_classification', CLASSIFICATION_ONLY_SCHEMA),
  };

  const payload = await requestOpenAI(baseBody);
  const parsed = parseJsonObject(parseChatContent(payload));

  let result = enforcePolicy({
    ...parsed,
    briefing: targetBriefingFallback(post, parsed.teams),
  }, post, aliases);

  if (result.decision === 'discard') {
    return attachAiMetadata(result, matchedAliases, { briefing_generated: false });
  }

  const briefingMessages = [
    { role: 'system', content: briefingSystemPrompt() },
    { role: 'user', content: briefingUserPrompt(post, matchedAliases, result) },
  ];
  const briefingBody = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: briefingMessages,
    temperature: 0.1,
    stream: false,
    response_format: jsonSchemaResponseFormat('epl_post_briefing', BRIEFING_SCHEMA),
  };
  const briefingPayload = await requestOpenAI(briefingBody).catch(() => null);

  let briefingGenerated = false;
  let briefingRejectedForStyle = false;
  if (briefingPayload) {
    try {
      const briefing = parseJsonObject(parseChatContent(briefingPayload));
      if (briefingHasKorean({ briefing }) && !briefingStyleIssue(briefing)) {
        result = enforcePolicy({
          ...result,
          briefing,
        }, post, aliases);
        briefingGenerated = true;
      } else if (briefingHasKorean({ briefing })) {
        briefingRejectedForStyle = true;
      }
    } catch {
      // Keep the policy result with its fallback briefing if generation returns malformed JSON.
    }
  }

  if (!briefingGenerated && briefingRejectedForStyle) {
    const retryPayload = await requestOpenAI({
      ...briefingBody,
      messages: [
        ...briefingMessages,
        { role: 'assistant', content: parseChatContent(briefingPayload) },
        {
          role: 'user',
          content: [
            'Regenerate the briefing in Korean sports article style.',
            'Do not use direct-translation or filler phrases such as "임팩트 서브", "임팩트 교체", "가능성이 제기됐다", "전해진다", "여러 매체에서 보도", "논의가 진행 중", "구체적인 상황은 확정되지 않았다", or "추가 정보가 필요하다".',
            'Do not add club affiliation, recent form, career background, fee, contract length, source credibility, or media coverage unless it is stated in the post or URL metadata.',
            'Use natural Korean football wording and only concrete facts from the post and URL metadata.',
          ].join('\n'),
        },
      ],
    }).catch(() => null);

    if (retryPayload) {
      try {
        const briefing = parseJsonObject(parseChatContent(retryPayload));
        if (briefingHasKorean({ briefing }) && !briefingStyleIssue(briefing)) {
          result = enforcePolicy({
            ...result,
            briefing,
          }, post, aliases);
          briefingGenerated = true;
        }
      } catch {
        // Keep the fallback review result.
      }
    }
  }

  if (!briefingGenerated) {
    return attachAiMetadata({
      ...result,
      decision: 'review',
      review_reason: result.review_reason || (briefingRejectedForStyle
        ? 'AI 브리핑 문체가 번역투 또는 저품질 패턴으로 생성되어 검수가 필요합니다.'
        : 'AI 브리핑 생성에 실패해 검수가 필요합니다.'),
      briefing: targetBriefingFallback(post, result.teams),
    }, matchedAliases, { briefing_generated: false });
  }

  return attachAiMetadata(result, matchedAliases, { briefing_generated: true });
}

module.exports = {
  classifyPost,
  enforcePolicy,
  legacyNewsTypeFromBriefingStatus,
};
