function firstMediaUrl(media) {
  if (!Array.isArray(media)) return null;
  const first = media.find(item => item?.url || item?.preview_image_url);
  return first?.url || first?.preview_image_url || null;
}

function allMediaUrls(media) {
  if (!Array.isArray(media)) return [];
  return media.map(item => item?.url || item?.preview_image_url).filter(Boolean);
}

function briefingFor(item) {
  const aiBriefing = item.ai_result?.briefing || {};
  return {
    title: item.title_ko || aiBriefing.title,
    summary_short: item.summary_short_ko || item.summary_ko || aiBriefing.summary_short,
    summary_detail: item.summary_detail_ko || aiBriefing.summary_detail || item.summary_ko,
    tags: Array.isArray(item.team_tags) ? item.team_tags : aiBriefing.tags,
    status: item.briefing_status || aiBriefing.status,
  };
}

function statusLabel(briefingStatus, newsType) {
  if (briefingStatus === 'OFFICIAL') return 'Official';
  if (briefingStatus === 'CONFIRMED') return 'Confirmed';
  if (briefingStatus === 'RUMOUR' || newsType === 'rumour') return 'Rumour';
  if (briefingStatus === 'UPDATE') return 'Talks';
  if (briefingStatus === 'DENIED') return 'Opinion';
  if (newsType === 'official') return 'Confirmed';
  return 'Opinion';
}

function initials(handle) {
  const clean = String(handle || 'XP').replace(/^@/, '');
  return clean.slice(0, 2).toUpperCase() || 'XP';
}

/* ─── 목업 댓글·반응 (item.id 시드 기반, 매 요청 동일) ─── */
const MOCK_PERSONAS = [
  { user: '@arsenal_gooner', initials: 'AG', club: 'ARS' },
  { user: '@gooner_kr', initials: 'GK', club: 'ARS' },
  { user: '@manu_fan', initials: 'MF', club: 'MUN' },
  { user: '@redcafe', initials: 'RC', club: 'MUN' },
  { user: '@lfc_kr', initials: 'LK', club: 'LIV' },
  { user: '@kop_seoul', initials: 'KS', club: 'LIV' },
  { user: '@city_kr', initials: 'CK', club: 'MCI' },
  { user: '@spurs_kr', initials: 'SK', club: 'TOT' },
  { user: '@coys_daniel', initials: 'CD', club: 'TOT' },
  { user: '@cfc_blue', initials: 'CB', club: 'CHE' },
  { user: '@epl_korea', initials: 'EK', club: null },
  { user: '@footy_kr', initials: 'FK', club: null },
  { user: '@transfer_watch', initials: 'TW', club: null },
];

const MOCK_GENERAL_TEXTS = [
  '이거 진짜라면 판도가 바뀐다',
  '출처 신뢰도는 어느 정도임? 일단 지켜봐야',
  '우리 팀 얘기였으면 좋겠다 진짜',
  '로마노가 확인하기 전까진 반신반의',
  '이번 시즌 이적시장 미쳤다 진짜',
  '드디어 떴네 ㅋㅋ 기다린 보람 있다',
  '냉정하게 이건 좀 무리수 아닌가',
  '금액만 맞으면 충분히 가능성 있다고 봄',
  '이 선수 폼이면 영입 1순위 맞지',
  '에이전트 장난질일 가능성도 배제 못함',
  '공식 발표 나기 전까진 김칫국 금지',
  '이거 성사되면 올해 최고의 영입',
];

const MOCK_MATCH_TEXTS = [
  '이 경기 진짜 기대된다',
  '라인업 보고 다시 얘기하자',
  '홈 어드밴티지 무시 못하지',
  '무조건 이긴다 가보자고',
  '비기기만 해도 선방이라고 봄',
  '키플레이어 컨디션이 관건이다',
  '수비만 잘 버티면 해볼만함',
  '솔직히 이건 반반이다',
];

function seedFromId(id) {
  const s = String(id || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed) {
  let x = seed || 1;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

function mockEngagement(item, { isMatchLike, isDebate, voteForLabel, voteAgainstLabel }) {
  const rng = makeRng(seedFromId(item.id));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const texts = isMatchLike ? MOCK_MATCH_TEXTS : MOCK_GENERAL_TEXTS;

  const count = 3 + Math.floor(rng() * 4); // 3~6개
  const usedTexts = new Set();
  const usedUsers = new Set();
  const comments = [];
  const hours = ['10분', '25분', '40분', '1시간', '2시간', '3시간', '5시간'];

  for (let i = 0; i < count; i++) {
    let p = pick(MOCK_PERSONAS);
    let guard = 0;
    while (usedUsers.has(p.user) && guard++ < 5) p = pick(MOCK_PERSONAS);
    usedUsers.add(p.user);

    let t = pick(texts);
    guard = 0;
    while (usedTexts.has(t) && guard++ < 5) t = pick(texts);
    usedTexts.add(t);

    let stance = null;
    if (isDebate) stance = rng() < 0.5 ? 'for' : 'against';

    comments.push({
      id: `mock-${item.id}-${i}`,
      rank: String(i + 1).padStart(2, '0'),
      initials: p.initials,
      user: p.user,
      club: p.club,
      timeAgo: hours[Math.floor(rng() * hours.length)],
      text: stance === 'for' ? `${voteForLabel || ''} 쪽이다. ${t}`.trim()
        : stance === 'against' ? `${voteAgainstLabel || ''} 쪽. ${t}`.trim()
        : t,
      likes: 80 + Math.floor(rng() * 5200),
      stance,
    });
  }
  comments.sort((a, b) => b.likes - a.likes).forEach((c, i) => { c.rank = String(i + 1).padStart(2, '0'); });

  return {
    comments_data: comments,
    reactions: 300 + Math.floor(rng() * 8000),
    comments: comments.length + Math.floor(rng() * 40),
    bookmarks: 20 + Math.floor(rng() * 900),
    shares: 10 + Math.floor(rng() * 500),
  };
}

function mapItemToPost(item) {
  const metrics = item.raw_public_metrics || {};
  const briefing = briefingFor(item);
  const teamTags = Array.isArray(briefing.tags) && briefing.tags.length > 0 ? briefing.tags : (item.team_tags || []);
  const team = Array.isArray(teamTags) ? teamTags[0] : null;
  const handle = item.raw_author_handle || item.source_handle || 'x';

  const isDebate = Boolean(item.debate_question);
  const isCustom = Boolean(item.is_custom);
  const isMatchLike = isCustom && ['today', 'result', 'schedule'].includes(item.card_type);

  const mock = mockEngagement(item, {
    isMatchLike,
    isDebate,
    voteForLabel: item.vote_for_label,
    voteAgainstLabel: item.vote_against_label,
  });

  return {
    id: `live-${item.id}`,
    type: isDebate ? 'today_debate' : 'general',
    title: briefing.title || item.raw_text?.slice(0, 80) || 'EPL 업데이트',
    summary: briefing.summary_short || item.raw_text || '',
    briefing: briefing.summary_detail || item.raw_text || '',
    isCustom,
    cardType: item.card_type || null,
    cardData: item.card_data || null,
    imageUrls: allMediaUrls(item.media),
    tweet: isCustom ? {
      author: 'PLICK',
      initials: 'PL',
      handle: '@plick_football',
      timeAgo: item.raw_created_at ? new Date(item.raw_created_at).toLocaleString('ko-KR') : '',
      text: '',
    } : {
      author: item.raw_author_name || handle,
      initials: initials(handle),
      handle: `@${String(handle).replace(/^@/, '')}`,
      tier: item.source_tier || 2,
      specialist: Boolean(item.specialist_match),
      timeAgo: item.raw_created_at ? new Date(item.raw_created_at).toLocaleString('ko-KR') : '',
      text: item.raw_text || '',
    },
    imageUrl: firstMediaUrl(item.media),
    club: team,
    specialistMatch: Boolean(item.specialist_match),
    status: statusLabel(briefing.status, item.news_type),
    hashtags: (teamTags || []).map(code => `#${code}`),
    reactions: metrics.like_count || mock.reactions,
    comments: Math.max(metrics.reply_count || 0, mock.comments),
    bookmarks: metrics.bookmark_count || mock.bookmarks,
    shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0) || mock.shares,
    comments_data: mock.comments_data,
    sourceUrl: item.raw_url,
    ai: item.ai_result,
    ...(isDebate ? {
      debateQuestion: item.debate_question,
      voteForLabel: item.vote_for_label,
      voteAgainstLabel: item.vote_against_label,
      voteFor: 50,
      voteAgainst: 50,
      participants: 0,
    } : {}),
  };
}

module.exports = {
  mapItemToPost,
};
