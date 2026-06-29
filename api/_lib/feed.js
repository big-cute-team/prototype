// 새 스키마(article_summaries + raw_articles + team_tags + debates) → 피드 포스트.
// 원문 N:1 요약 구조에서 "대표 원문"은 가장 공신력 높은(=tier 숫자 작은) 기자 기사(설계 5.2).
function pickRepresentativeRaw(summary) {
  const raws = Array.isArray(summary.raw_articles) ? summary.raw_articles : [];
  if (raws.length === 0) return null;
  return raws
    .slice()
    .sort((a, b) => (a.reporter_tier ?? 99) - (b.reporter_tier ?? 99))[0];
}

// team_tags → 팀 약자 코드(ARS/CHE/…). teams.short_name이 구버전 team code와 동일.
function teamCodes(summary) {
  const tags = Array.isArray(summary.team_tags) ? summary.team_tags : [];
  return tags.map(tag => tag.teams?.short_name).filter(Boolean);
}

// rumor_stage(RUMOR/IN_PROGRESS/OFFICIAL) → UI 신뢰도 배지 라벨.
function statusLabelFromStage(rumorStage) {
  switch (rumorStage) {
    case 'OFFICIAL': return 'Official';
    case 'IN_PROGRESS': return 'Talks';
    case 'RUMOR': return 'Rumour';
    default: return 'Rumour';
  }
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

function mapSummaryToPost(summary) {
  const raw = pickRepresentativeRaw(summary);
  const codes = teamCodes(summary);
  const club = codes[0] || null;
  const handle = raw?.reporters?.x_handle || 'x';
  const debate = summary.debates && !Array.isArray(summary.debates) ? summary.debates : null;
  const isDebate = Boolean(debate);

  // 트위터 지표·이미지는 새 설계에 없으므로 목업/단일 image_url로 대체.
  const mock = mockEngagement({ id: summary.article_summary_id }, {
    isMatchLike: false,
    isDebate,
    voteForLabel: debate?.option_a,
    voteAgainstLabel: debate?.option_b,
  });

  const images = summary.image_url ? [summary.image_url] : [];

  return {
    id: `live-${summary.article_summary_id}`,
    type: isDebate ? 'today_debate' : 'general',
    title: summary.title || raw?.content?.slice(0, 80) || 'EPL 업데이트',
    summary: summary.summary_short || raw?.content || '',
    briefing: summary.summary_detail || raw?.content || '',
    isCustom: false,
    cardType: null,
    cardData: null,
    imageUrls: images,
    tweet: {
      author: raw?.reporters?.name || handle,
      initials: initials(handle),
      handle: `@${String(handle).replace(/^@/, '')}`,
      tier: raw?.reporter_tier || 2,
      specialist: false,
      timeAgo: '', // 원문 작성 시각은 새 설계에서 미저장
      text: raw?.content || '',
    },
    imageUrl: summary.image_url || null,
    club,
    specialistMatch: false,
    status: statusLabelFromStage(summary.rumor_stage),
    hashtags: codes.map(code => `#${code}`),
    reactions: mock.reactions,
    comments: mock.comments,
    bookmarks: mock.bookmarks,
    shares: mock.shares,
    comments_data: mock.comments_data,
    sourceUrl: raw?.source_url || null,
    ai: null,
    ...(isDebate ? {
      debateQuestion: debate.topic,
      voteForLabel: debate.option_a,
      voteAgainstLabel: debate.option_b,
      voteFor: 50,
      voteAgainst: 50,
      participants: 0,
    } : {}),
  };
}

module.exports = {
  mapSummaryToPost,
};
