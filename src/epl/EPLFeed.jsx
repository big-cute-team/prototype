import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { POSTS } from './data';
import ReactionPanel from './ReactionPanel';
import usePublishedPosts from './usePublishedPosts';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

const TICKER_ITEMS = [
  '● LIVE  진짜 보내면 안되지',
  '@jenna_94  드디어 ㅠㅠ 너무 좋다',
  '@manu_fan  캐릭은 진짜 레전드임',
  '@spurs_kr  손흥민 제발 남아줘',
  '@epl_korea  오늘 발표 크다',
  '@redcafe  팬으로서 행복하다',
  '@lfc_kr  살라 계약 드디어',
  '@city_kr  홀란드 빨리 낫길',
];

function TopBar({ current, total }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-black text-white" style={{ fontSize: '22px', letterSpacing: '-0.5px' }}>Reax</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{ background: '#1a1a2a', color: '#8b8fa8', border: '1px solid #2a2a3a' }}>
          EPL
        </span>
      </div>
      <span className="text-sm font-mono tabular-nums" style={{ color: '#3a3a5a' }}>
        {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
}

function LiveTicker() {
  const text = TICKER_ITEMS.map((t, i) => (i > 0 ? `  —  ${t}` : t)).join('');
  const doubled = text + '    —    ' + text;
  return (
    <div className="overflow-hidden shrink-0 py-1.5" style={{ borderBottom: '1px solid #141420' }}>
      <div className="live-ticker text-xs" style={{ color: '#4a4a6a' }}>{doubled}</div>
    </div>
  );
}

const STATUS_CFG = {
  Official: { bg: '#052818', color: '#34d399', dot: '#22c55e' },
  Advanced:  { bg: '#2d1000', color: '#fb923c', dot: '#f97316' },
  Talks:     { bg: '#291e00', color: '#fbbf24', dot: '#eab308' },
  Interest:  { bg: '#0d2240', color: '#60a5fa', dot: '#3b82f6' },
  Rumour:    { bg: '#141420', color: '#9ca3af', dot: '#6b7280' },
  Opinion:   { bg: '#14123a', color: '#818cf8', dot: '#6366f1' },
  Memory:    { bg: '#1a0a2e', color: '#c084fc', dot: '#a855f7' },
};

const CLUB_CFG = {
  MUN: { bg: '#3a0000', color: '#ff7070', label: 'MUN' },
  TOT: { bg: '#001228', color: '#7eb8f7', label: 'TOT' },
  CHE: { bg: '#001035', color: '#5b9bd5', label: 'CHE' },
  LIV: { bg: '#3a0000', color: '#ff7070', label: 'LIV' },
  MCI: { bg: '#002038', color: '#6dc1e7', label: 'MCI' },
  ARS: { bg: '#3a0000', color: '#ff7070', label: 'ARS' },
};

function Badge({ type, value }) {
  if (type === 'status') {
    const c = STATUS_CFG[value] || STATUS_CFG.Rumour;
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg"
        style={{ background: c.bg, color: c.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {value.toUpperCase()}
      </span>
    );
  }
  const c = CLUB_CFG[value] || { bg: '#141420', color: '#9ca3af', label: value };
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
      style={{ background: c.bg, color: c.color }}>
      ⬛ {c.label}
    </span>
  );
}

function TweetEmbed({ tweet }) {
  return (
    <div className="rounded-2xl px-4 py-3 mt-2"
      style={{ background: '#0e0e1a', border: '1px solid #1e1e2a' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: '#1e1e2e', color: '#f4a100' }}>
          {tweet.initials}
        </div>
        <span className="text-sm font-semibold text-white">{tweet.author}</span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: '#2a1f00', color: '#f4a100' }}>T{tweet.tier}</span>
        <span className="text-xs ml-auto shrink-0" style={{ color: '#3a3a5a' }}>{tweet.timeAgo}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: '#6b6f88', fontFamily: 'ui-monospace, monospace' }}>
        {tweet.text}
      </p>
    </div>
  );
}

function ActionBar({ post, onOpen }) {
  const items = [
    { icon: '♡', val: post.reactions },
    { icon: '💬', val: post.comments, onClick: onOpen },
    { icon: '🔖', val: post.bookmarks },
    { icon: '↑', val: post.shares },
  ];
  return (
    <div className="absolute right-4 z-10 flex flex-col items-center gap-5"
      style={{ bottom: '116px' }}>
      {items.map(({ icon, val, onClick }) => (
        <button key={icon} onClick={onClick}
          className="flex flex-col items-center gap-1">
          <span className="text-2xl leading-none">{icon}</span>
          <span className="text-xs font-medium tabular-nums" style={{ color: '#6b6f88' }}>{fmt(val)}</span>
        </button>
      ))}
    </div>
  );
}

function DebateBadge({ post }) {
  const isToday = post.type === 'today_debate';
  const accent = isToday ? '#fbbf24' : '#e63946';
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: `${accent}22`,
          border: `1px solid ${accent}55`,
          boxShadow: `0 0 12px ${accent}30, inset 0 0 8px ${accent}10`,
        }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <span className="text-xs font-black tracking-widest" style={{ color: accent, textShadow: `0 0 8px ${accent}80` }}>{post.badge}</span>
      </div>
      <span className="text-xs font-medium" style={{ color: `${accent}90` }}>{fmt(post.participants)} 참여중</span>
    </div>
  );
}

function VoteBarMini({ post, voted }) {
  if (!voted) {
    return (
      <div className="mt-3 mb-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>👍 {post.voteForLabel}</span>
          <span className="text-xs" style={{ color: '#4a4a6a' }}>{fmt(post.participants)} 참여</span>
          <span className="text-xs font-semibold" style={{ color: '#f87171' }}>{post.voteAgainstLabel} 👎</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
          <div className="h-full w-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#2563eb33 0%,#2563eb33 48%,#dc262633 48%,#dc262633 100%)' }} />
        </div>
        <p className="text-xs text-center mt-1.5" style={{ color: '#3a3a5a' }}>팬 반응을 눌러 여론 확인</p>
      </div>
    );
  }
  return (
    <div className="mt-3 mb-1">
      <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#1a1a2a' }}>
        <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
        <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
      </div>
      <div className="flex justify-between">
        <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>
          {post.voteForLabel} {post.voteFor}%
        </span>
        <span className="text-xs font-semibold" style={{ color: '#e63946' }}>
          {post.voteAgainst}% {post.voteAgainstLabel}
        </span>
      </div>
    </div>
  );
}

function FeedCard({ post, selectedTeam, onOpen, vote }) {
  const isDebate = post.type === 'debate' || post.type === 'today_debate' || post.type === 'hot_debate';
  const isToday = post.type === 'today_debate';
  const isSentimental = post.type === 'sentimental';
  const accent = isToday ? '#fbbf24' : '#e63946';
  const isMyClub = selectedTeam && post.club === selectedTeam.shortName;

  const bgGradient = isSentimental
    ? `linear-gradient(170deg, ${post.gradientFrom}88 0%, #080810 55%)`
    : isDebate
    ? `radial-gradient(ellipse at 50% 0%, ${accent}28 0%, ${accent}08 35%, transparent 65%)`
    : 'radial-gradient(ellipse at 50% 0%, #1a1a3a14 0%, transparent 50%)';

  return (
    <div className="h-full relative overflow-hidden"
      style={post.imageUrl
        ? { backgroundImage: `url(${post.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
        : { background: '#080810' }}>
      {post.imageUrl && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.62)' }} />
      )}
      <div className="absolute inset-0 pointer-events-none" style={{ background: bgGradient }} />

      {isDebate && (
        <div className="absolute inset-x-0 top-0 h-2/3 pointer-events-none debate-card-aura"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, ${accent}08 40%, transparent 70%)` }} />
      )}

      {isDebate && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.9 }} />
          <div className="absolute top-0 left-1/4 right-1/4 h-[6px] pointer-events-none blur-sm"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
        </>
      )}

      <ActionBar post={post} onOpen={onOpen} />

      <div className="absolute right-3 z-0 flex flex-col items-center gap-1 pointer-events-none"
        style={{ top: '38%', transform: 'translateY(-50%)' }}>
        <div className="w-px h-10 rounded-full" style={{ background: '#1e1e2e' }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#2e2e4e' }} />
        <div className="w-px h-6 rounded-full" style={{ background: '#1e1e2e' }} />
      </div>

      <div className="absolute bottom-0 left-0 px-5 pb-3 z-10" style={{ right: '68px' }}>
        <div className="flex gap-2 mb-3 flex-wrap">
          {post.status && <Badge type="status" value={post.status} />}
          {post.club && <Badge type="club" value={post.club} />}
          {isMyClub && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{
                background: `${selectedTeam.primaryColor}25`,
                color: selectedTeam.primaryColor,
                border: `1px solid ${selectedTeam.primaryColor}50`,
              }}>
              내 클럽
            </span>
          )}
        </div>

        {isDebate && <DebateBadge post={post} />}

        <h2 className="font-black text-white leading-tight mb-1.5 whitespace-pre-line"
          style={{ fontSize: '26px', letterSpacing: '-0.4px' }}>
          {post.title}
        </h2>

        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {post.summary}
        </p>

        {post.tweet && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-semibold" style={{ color: '#4a4a6a' }}>{post.tweet.author}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#2a1f00', color: '#f4a100' }}>T{post.tweet.tier}</span>
            <span className="text-xs" style={{ color: '#3a3a5a' }}>· {post.tweet.timeAgo}</span>
          </div>
        )}

        {isDebate && <VoteBarMini post={post} voted={!!vote} />}

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {(post.hashtags || []).slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={onOpen}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm active:scale-95${isDebate ? ' debate-btn' : ' transition-transform'}`}
            style={isDebate ? {
              background: `linear-gradient(135deg, ${accent}ee, ${accent}bb)`,
              color: '#fff',
              boxShadow: `0 0 20px ${accent}70, 0 2px 10px ${accent}50`,
              letterSpacing: '-0.2px',
            } : { background: '#fff', color: '#000' }}>
            {isDebate ? '⚡ ' : ''}팬 반응 {fmt(post.comments)} →
          </button>
        </div>

        <p className="text-center text-xs mt-2.5 mb-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
          ↑ 위로 스와이프 · 다음 이슈
        </p>
      </div>
    </div>
  );
}

/* ─── Feed tab ─── */
function FeedView({ posts, selectedTeam, onOpen, onIndexChange, votes, onRead }) {
  const scrollRef = useRef(null);
  const readTimerRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    readTimerRef.current = setTimeout(() => onRead(posts[0]?.id), 2000);
    return () => clearTimeout(readTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      const idx = Math.min(Math.round(el.scrollTop / h), posts.length - 1);
      onIndexChange(idx);
      clearTimeout(readTimerRef.current);
      readTimerRef.current = setTimeout(() => onRead(posts[idx]?.id), 2000);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      clearTimeout(readTimerRef.current);
    };
  }, [posts, onIndexChange, onRead]);

  return (
    <div ref={scrollRef}
      className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {posts.map((post) => (
        <div key={post.id} className="snap-start" style={{ height: '100%' }}>
          <FeedCard post={post} selectedTeam={selectedTeam} onOpen={() => onOpen(post)} vote={votes?.[post.id]} />
        </div>
      ))}
    </div>
  );
}

/* ─── HOT tab ─── */
function HotView({ posts, onOpen }) {
  const debatePosts = posts.filter(p => p.type === 'debate' || p.type === 'today_debate');
  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #141420' }}>
        <div className="flex items-center gap-2">
          <span className="font-black text-white" style={{ fontSize: '20px', letterSpacing: '-0.3px' }}>HOT</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5"
            style={{ background: '#e6394618', color: '#e63946', border: '1px solid #e6394635' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e63946' }} />
            실시간 토론중
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#3a3a5a' }}>팬 반응이 가장 뜨거운 논쟁</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
        {debatePosts.map((post) => {
          const isToday = post.type === 'today_debate';
          const accent = isToday ? '#fbbf24' : '#e63946';
          return (
            <button key={post.id} onClick={() => onOpen(post)}
              className="w-full text-left rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
              style={{ background: '#0a0a14', border: `1px solid ${accent}28` }}>
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${accent}70,transparent)` }} />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                    {post.badge}
                  </span>
                  <span className="text-xs" style={{ color: '#4a4a6a' }}>{fmt(post.participants)} 참여중</span>
                </div>

                <div className="font-black text-white leading-tight mb-2.5 whitespace-pre-line"
                  style={{ fontSize: '16px', letterSpacing: '-0.3px' }}>
                  {post.title}
                </div>

                <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#1a1a2a' }}>
                  <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                  <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs">
                    <span style={{ color: '#3b82f6' }}>{post.voteForLabel} {post.voteFor}%</span>
                    <span style={{ color: '#e63946' }}>{post.voteAgainst}% {post.voteAgainstLabel}</span>
                  </div>
                  {post.recentTrend && (
                    <span className="text-xs font-semibold" style={{ color: accent }}>
                      {post.recentTrend.direction === 'against' ? post.voteAgainstLabel : post.voteForLabel} +{post.recentTrend.pct}%↑
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Search tab ─── */
function SearchView() {
  const [query, setQuery] = useState('');
  const teams = ['Man Utd', 'Liverpool', 'Arsenal', 'Man City', 'Chelsea', 'Spurs'];
  const popular = ['카세미루 이별', '브루노 20어시스트', '네이마르 월드컵', '하베르츠 결승골'];

  return (
    <div className="h-full overflow-y-auto px-5 pt-5 pb-8" style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
        style={{ background: '#0d0d1a', border: '1px solid #1e1e2a' }}>
        <span style={{ color: '#3a3a5a', fontSize: '18px' }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="팀, 선수, 이슈 검색"
          className="flex-1 bg-transparent outline-none text-sm text-white"
          style={{ caretColor: '#3b82f6' }}
        />
      </div>

      <div className="mb-6">
        <p className="text-xs font-bold mb-3" style={{ color: '#4a4a6a' }}>팀</p>
        <div className="flex flex-wrap gap-2">
          {teams.map(t => (
            <span key={t} className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: '#0d0d1a', border: '1px solid #1e1e2a', color: '#8b8fa8' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-3" style={{ color: '#4a4a6a' }}>인기 검색</p>
        <div className="space-y-2">
          {popular.map((item, i) => (
            <div key={item} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
              <span className="text-xs font-bold tabular-nums w-4 shrink-0" style={{ color: '#2a2a4a' }}>
                {i + 1}
              </span>
              <span className="text-sm text-white">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MY tab sub-sections ─── */
function ClubSection({ selectedTeam, posts, onOpen }) {
  const myPosts = posts.filter(p => selectedTeam && p.club === selectedTeam.shortName);
  const debatePosts = myPosts.filter(p => p.type === 'debate' || p.type === 'today_debate');
  const otherPosts = myPosts.filter(p => p.type === 'sentimental' || p.type === 'general');
  const tc = selectedTeam?.primaryColor || '#3b82f6';

  if (myPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-5">
        <div className="text-4xl mb-3">⚽</div>
        <div className="text-sm text-white mb-1">아직 이슈가 없어요</div>
        <div className="text-xs" style={{ color: '#3a3a5a' }}>피드에서 {selectedTeam?.name} 관련 이슈를 확인해보세요</div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 pb-8 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
          style={{ background: tc, color: '#fff' }}>
          {selectedTeam?.shortName?.slice(0, 2)}
        </div>
        <div>
          <div className="font-black text-white text-base">{selectedTeam?.name}</div>
          <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>최근 업데이트 2분 전</div>
        </div>
      </div>

      {debatePosts.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: '#e63946' }}>HOT DEBATE</p>
          {debatePosts.map(post => (
            <button key={post.id} onClick={() => onOpen(post)}
              className="w-full rounded-xl p-4 text-left mb-2 active:scale-[0.98] transition-transform"
              style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
              <div className="font-bold text-white text-sm leading-snug mb-2">
                {post.title.replace('\n', ' ')}
              </div>
              <div className="flex h-1 rounded-full overflow-hidden mb-1.5" style={{ background: '#1a1a2a' }}>
                <div style={{ width: `${post.voteFor}%`, background: '#3b82f6' }} />
                <div style={{ width: `${post.voteAgainst}%`, background: '#e63946' }} />
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#3b82f6' }}>{post.voteForLabel} {post.voteFor}%</span>
                <span style={{ color: '#4a4a6a' }}>{fmt(post.participants)} 참여</span>
                <span style={{ color: '#e63946' }}>{post.voteAgainst}% {post.voteAgainstLabel}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {otherPosts.length > 0 && (
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: '#4a4a6a' }}>최신 이슈</p>
          {otherPosts.map(post => (
            <button key={post.id} onClick={() => onOpen(post)}
              className="w-full rounded-xl px-4 py-3 text-left mb-2 flex items-center gap-3 active:scale-[0.98] transition-transform"
              style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tc }} />
              <div className="font-medium text-white text-sm leading-snug flex-1">
                {post.title.replace('\n', ' ')}
              </div>
              <span className="text-xs shrink-0" style={{ color: '#2a2a4a' }}>→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivitySection({ posts, votes }) {
  const votedPosts = posts.filter(p => votes[p.id]);

  if (votedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-5">
        <div className="text-4xl mb-3">💬</div>
        <div className="text-sm text-white mb-1">아직 참여한 논쟁이 없어요</div>
        <div className="text-xs" style={{ color: '#3a3a5a' }}>피드에서 팬 반응을 눌러 투표해보세요</div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 pb-8 space-y-3">
      {votedPosts.map(post => {
        const myStance = votes[post.id];
        const isFor = myStance === 'for';
        const stanceColor = isFor ? '#3b82f6' : '#e63946';
        const stanceLabel = isFor ? post.voteForLabel : post.voteAgainstLabel;
        return (
          <div key={post.id} className="rounded-2xl p-4"
            style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
            <div className="font-bold text-white text-sm leading-snug mb-3">
              {post.title.replace('\n', ' ')}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: `${stanceColor}20`, color: stanceColor, border: `1px solid ${stanceColor}40` }}>
                내 선택: {stanceLabel}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#1a1a2a' }}>
              <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
              <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: '#3b82f6' }}>{post.voteForLabel} {post.voteFor}%</span>
              <span style={{ color: '#e63946' }}>{post.voteAgainst}% {post.voteAgainstLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NotificationsSection({ teamColor }) {
  const [toggles, setToggles] = useState({
    hotDebate: true,
    hereWeGo: true,
    official: false,
    trendSurge: true,
    postMatch: false,
  });

  const items = [
    { id: 'hotDebate', label: '내 팀 HOT DEBATE 알림', desc: '논쟁이 뜨거워지면 알림' },
    { id: 'hereWeGo', label: 'Here We Go 알림', desc: 'Fabrizio Romano 확정 알림' },
    { id: 'official', label: 'Official 알림', desc: '공식 발표 즉시 알림' },
    { id: 'trendSurge', label: '팬 반응 급상승 알림', desc: '여론이 빠르게 바뀔 때' },
    { id: 'postMatch', label: '경기 직후 논쟁 알림', desc: '경기 끝나면 즉시 논쟁 오픈' },
  ];

  const toggle = (id) => setToggles(t => ({ ...t, [id]: !t[id] }));

  return (
    <div className="px-5 py-4 pb-8 space-y-2">
      {items.map(({ id, label, desc }) => (
        <div key={id} className="flex items-center gap-4 rounded-xl px-4 py-4"
          style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
          <div className="flex-1">
            <div className="font-medium text-white text-sm">{label}</div>
            <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>{desc}</div>
          </div>
          <button onClick={() => toggle(id)}
            className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
            style={{ background: toggles[id] ? teamColor : '#1a1a2a' }}>
            <div className="absolute top-0.5 bottom-0.5 w-5 rounded-full transition-transform duration-200"
              style={{ background: '#fff', left: '2px', transform: toggles[id] ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>
      ))}
    </div>
  );
}

function MyView({ selectedTeam, votes, posts, onOpen }) {
  const [mySection, setMySection] = useState('home');
  const tc = selectedTeam?.primaryColor || '#3b82f6';
  const myDebateCount = posts.filter(p =>
    (p.type === 'debate' || p.type === 'today_debate') && selectedTeam && p.club === selectedTeam.shortName
  ).length;

  const sectionTitle = { club: '내 클럽', activity: '내 활동', notifications: '알림 설정' };

  if (mySection !== 'home') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid #141420' }}>
          <button onClick={() => setMySection('home')}
            className="text-white text-xl w-8 text-left transition-transform active:scale-90">
            ←
          </button>
          <span className="font-bold text-white">{sectionTitle[mySection]}</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {mySection === 'club' && <ClubSection selectedTeam={selectedTeam} posts={posts} onOpen={onOpen} />}
          {mySection === 'activity' && <ActivitySection posts={posts} votes={votes} />}
          {mySection === 'notifications' && <NotificationsSection teamColor={tc} />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {/* Hero */}
      <div className="mx-5 mt-5 rounded-2xl p-5 relative overflow-hidden"
        style={{ background: `${tc}15`, border: `1px solid ${tc}30` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 0% 50%, ${tc}22, transparent 65%)` }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
              style={{ background: tc, color: '#fff' }}>
              {selectedTeam?.shortName?.slice(0, 2) || 'EP'}
            </div>
            <div>
              <div className="text-xs font-black" style={{ color: tc }}>
                {selectedTeam?.shortName || 'EPL'} FAN
              </div>
              <div className="font-black text-white text-base leading-tight">
                {selectedTeam?.name || 'EPL Fan'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm" style={{ color: `${tc}cc` }}>
              HOT DEBATE {myDebateCount}개 진행중
            </div>
            <div className="text-xs" style={{ color: '#4a4a6a' }}>· 2분 전 업데이트</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: '이번 주 참여', value: '14', unit: '논쟁' },
          { label: '남긴 팬 반응', value: '32', unit: '개' },
          { label: '받은 공감', value: '241', unit: '개' },
        ].map(({ label, value, unit }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: '#0d0d1a', border: '1px solid #1a1a2a' }}>
            <div className="font-black text-white" style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>{value}</div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: tc }}>{unit}</div>
            <div className="mt-1" style={{ color: '#3a3a5a', fontSize: '9px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Menu cards */}
      <div className="mx-5 mt-4 pb-8 space-y-2">
        {[
          { id: 'club',          icon: '🏆', title: '내 클럽',    desc: '내 팀 HOT DEBATE와 최신 이슈 보기' },
          { id: 'activity',      icon: '📋', title: '내 활동',    desc: '내가 참여한 논쟁과 남긴 팬 반응 보기' },
          { id: 'saved',         icon: '🔖', title: '저장한 이슈', desc: '나중에 다시 볼 이슈 모아보기' },
          { id: 'notifications', icon: '🔔', title: '알림 설정',  desc: 'HOT DEBATE, Official, 여론 급상승 알림 관리' },
        ].map(({ id, icon, title, desc }) => (
          <button key={id}
            onClick={() => id !== 'saved' && setMySection(id)}
            className="w-full flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-transform active:scale-[0.98]"
            style={{ background: '#0d0d1a', border: '1px solid #1a1a2a', opacity: id === 'saved' ? 0.5 : 1 }}>
            <span className="text-xl w-8 text-center shrink-0">{icon}</span>
            <div className="flex-1">
              <div className="font-bold text-white text-sm">{title}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>{desc}</div>
            </div>
            <span style={{ color: '#2a2a3a', fontSize: '16px' }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Bottom nav ─── */
function BottomNav({ activeTab, onChange, selectedTeam }) {
  const tc = selectedTeam?.primaryColor || '#fff';
  const items = [
    { id: 'feed',   icon: '☰', label: '피드' },
    { id: 'hot',    icon: '⚡', label: 'HOT' },
    { id: 'search', icon: '⌕', label: '검색' },
    { id: 'my',     icon: '◐', label: 'MY' },
  ];
  return (
    <div className="flex items-center justify-around px-2 py-2 shrink-0"
      style={{ background: '#050508', borderTop: '1px solid #141420' }}>
      {items.map((item) => {
        const isActive = item.id === activeTab;
        const color = isActive ? (item.id === 'my' ? tc : '#fff') : '#3a3a5a';
        return (
          <button key={item.id} onClick={() => onChange(item.id)}
            className="flex flex-col items-center gap-0.5 px-4 py-1">
            <span className="text-xl leading-none transition-colors" style={{ color }}>{item.icon}</span>
            <span className="text-xs transition-colors" style={{ color }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function sortFeed(posts, myTeam, readIds) {
  return [...posts].sort((a, b) => {
    const aScore = (myTeam && a.club === myTeam ? 2 : 0) + (readIds.has(a.id) ? 0 : 1);
    const bScore = (myTeam && b.club === myTeam ? 2 : 0) + (readIds.has(b.id) ? 0 : 1);
    return bScore - aScore;
  });
}

const STORAGE_KEY = 'reax_read';

/* ─── Main export ─── */
export default function EPLFeed({ selectedTeam }) {
  const { posts } = usePublishedPosts(POSTS);
  const [activeTab, setActiveTab] = useState('feed');
  const [panelPost, setPanelPost] = useState(null);
  const [votes, setVotes] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [readIds, setReadIds] = useState(
    () => new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  );

  const sortedPosts = useMemo(
    () => sortFeed(posts, selectedTeam?.shortName, readIds),
    [posts, selectedTeam?.shortName, readIds]
  );

  useEffect(() => {
    if (currentIndex >= sortedPosts.length) setCurrentIndex(0);
  }, [currentIndex, sortedPosts.length]);

  const markRead = useCallback((postId) => {
    if (!postId) return;
    setReadIds(prev => {
      if (prev.has(postId)) return prev;
      const next = new Set(prev);
      next.add(postId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleVote = useCallback((postId, stance) => {
    setVotes(v => ({ ...v, [postId]: stance }));
  }, []);

  const isFeedTab = activeTab === 'feed';

  return (
    <div className="relative h-full flex flex-col" style={{ background: '#080810' }}>
      {isFeedTab && <TopBar current={currentIndex} total={sortedPosts.length} />}
      {isFeedTab && <LiveTicker />}

      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'feed' && (
          <FeedView
            posts={sortedPosts}
            selectedTeam={selectedTeam}
            onOpen={(post) => { markRead(post.id); setPanelPost(post); }}
            onIndexChange={setCurrentIndex}
            votes={votes}
            onRead={markRead}
          />
        )}
        {activeTab === 'hot' && (
          <HotView posts={posts} onOpen={(post) => { markRead(post.id); setPanelPost(post); }} />
        )}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'my' && (
          <MyView
            selectedTeam={selectedTeam}
            votes={votes}
            posts={posts}
            onOpen={(post) => { markRead(post.id); setPanelPost(post); }}
          />
        )}

        {panelPost && (
          <ReactionPanel
            post={panelPost}
            vote={votes[panelPost.id]}
            onVote={(stance) => handleVote(panelPost.id, stance)}
            onClose={() => setPanelPost(null)}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} selectedTeam={selectedTeam} />
    </div>
  );
}
