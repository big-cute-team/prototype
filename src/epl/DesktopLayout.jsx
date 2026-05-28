import { useState, useEffect, useRef, useMemo } from 'react';
import { POSTS, TEAMS } from './data';
import usePublishedPosts from './usePublishedPosts';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
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
  MUN: { bg: '#3a0000', color: '#ff7070' },
  TOT: { bg: '#001228', color: '#7eb8f7' },
  CHE: { bg: '#001035', color: '#5b9bd5' },
  LIV: { bg: '#3a0000', color: '#ff7070' },
  MCI: { bg: '#002038', color: '#6dc1e7' },
  ARS: { bg: '#3a0000', color: '#ff7070' },
};

function isDebateType(post) {
  return post && (post.type === 'debate' || post.type === 'today_debate' || post.type === 'hot_debate');
}

/* ─── Sidebar ─── */
function Sidebar({ selectedTeam, clubFilter, onClubFilterChange, posts, selectedPost, onSelectPost, collapsed }) {
  const tc = selectedTeam?.primaryColor || '#3b82f6';
  const hotPosts = useMemo(() => posts.filter(isDebateType).slice(0, 8), [posts]);

  const toggleClub = (club) => {
    onClubFilterChange(
      clubFilter.includes(club)
        ? clubFilter.filter(c => c !== club)
        : [...clubFilter, club]
    );
  };

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        width: collapsed ? '56px' : '240px',
        borderRight: '1px solid #141420',
        background: '#07070f',
        height: '100vh',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid #141420', minHeight: '64px' }}>
        <span className="font-black text-white shrink-0" style={{ fontSize: '22px', letterSpacing: '-0.5px' }}>
          {collapsed ? 'R' : 'Reax'}
        </span>
        {!collapsed && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
            style={{ background: '#1a1a2a', color: '#8b8fa8', border: '1px solid #2a2a3a' }}>
            EPL
          </span>
        )}
      </div>

      {/* My team */}
      {!collapsed && selectedTeam && (
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #141420' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
              style={{ background: tc, color: '#fff' }}>
              {selectedTeam.shortName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: '#4a4a6a' }}>내 팀</div>
              <div className="text-sm font-bold text-white truncate">{selectedTeam.name}</div>
            </div>
          </div>
        </div>
      )}

      {collapsed && selectedTeam && (
        <div className="flex justify-center py-3" style={{ borderBottom: '1px solid #141420' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs"
            style={{ background: tc, color: '#fff' }}>
            {selectedTeam.shortName.slice(0, 2)}
          </div>
        </div>
      )}

      {!collapsed && (
        <>
          {/* 클럽 필터 */}
          <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid #141420' }}>
            <div className="text-xs font-bold mb-2.5" style={{ color: '#4a4a6a', letterSpacing: '0.06em' }}>
              클럽 필터
            </div>
            <div className="space-y-0.5">
              {TEAMS.map(team => {
                const active = clubFilter.includes(team.shortName);
                return (
                  <button key={team.shortName} onClick={() => toggleClub(team.shortName)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left"
                    style={{
                      background: active ? `${team.primaryColor}18` : 'transparent',
                      border: `1px solid ${active ? team.primaryColor + '45' : 'transparent'}`,
                    }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: active ? team.primaryColor : '#1e1e2e', color: active ? '#fff' : '#6b6f88' }}>
                      {team.shortName.slice(0, 1)}
                    </div>
                    <span className="text-sm" style={{ color: active ? '#fff' : '#8b8fa8' }}>{team.shortName}</span>
                    {active && <span className="ml-auto text-xs" style={{ color: team.primaryColor }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {clubFilter.length > 0 && (
              <button onClick={() => onClubFilterChange([])}
                className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#111118', color: '#4a4a6a', border: '1px solid #1e1e2a' }}>
                초기화
              </button>
            )}
          </div>

          {/* 지금 뜨는 토론 */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="px-4 pt-3 pb-1 shrink-0">
              <div className="text-xs font-bold flex items-center gap-1.5 mb-2"
                style={{ color: '#4a4a6a', letterSpacing: '0.06em' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e63946' }} />
                지금 뜨는 토론
              </div>
            </div>
            <div className="space-y-0.5 px-2 pb-4">
              {hotPosts.map((post, i) => {
                const isSelected = selectedPost?.id === post.id;
                const isToday = post.type === 'today_debate';
                const accent = isToday ? '#fbbf24' : '#e63946';
                const clubCfg = CLUB_CFG[post.club] || { bg: '#141420', color: '#9ca3af' };
                return (
                  <button key={post.id} onClick={() => onSelectPost(post)}
                    className="w-full text-left px-3 py-2.5 rounded-xl"
                    style={{
                      background: isSelected ? '#111120' : 'transparent',
                      border: `1px solid ${isSelected ? '#2a2a4a' : 'transparent'}`,
                    }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold shrink-0" style={{ color: '#3a3a5a', minWidth: '12px' }}>{i + 1}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                        style={{ background: clubCfg.bg, color: clubCfg.color }}>
                        {post.club}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold ml-auto shrink-0"
                        style={{ color: accent, background: `${accent}15` }}>
                        {post.badge}
                      </span>
                    </div>
                    <p className="text-xs leading-snug" style={{ color: isSelected ? '#d0d4f0' : '#8b8fa8' }}>
                      {post.title.replace('\n', ' ')}
                    </p>
                    {post.voteFor != null && (
                      <div className="flex h-1 rounded-full overflow-hidden mt-1.5" style={{ background: '#1a1a2a' }}>
                        <div style={{ width: `${post.voteFor}%`, background: '#2563eb88' }} />
                        <div style={{ width: `${post.voteAgainst}%`, background: '#dc262688' }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {collapsed && (
        <div className="flex-1 flex flex-col items-center gap-4 py-4">
          {clubFilter.length > 0 && (
            <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Desktop feed card (가로형) ─── */
function DesktopFeedCard({ post, selected, onSelect, vote, fillHeight = false }) {
  const isDebate = isDebateType(post);
  const isToday = post.type === 'today_debate';
  const accent = isToday ? '#fbbf24' : '#e63946';
  const statusCfg = STATUS_CFG[post.status] || STATUS_CFG.Rumour;
  const clubCfg = CLUB_CFG[post.club] || { bg: '#141420', color: '#9ca3af' };

  return (
    <div onClick={onSelect}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: '#0a0a14',
        border: selected
          ? `1.5px solid ${isDebate ? accent : '#3b82f6'}`
          : '1.5px solid #141420',
        boxShadow: selected
          ? `0 0 0 3px ${isDebate ? accent : '#3b82f6'}15`
          : 'none',
        minHeight: '220px',
        ...(fillHeight && { height: '100%', display: 'flex', flexDirection: 'column' }),
      }}>
      {isDebate && (
        <div className="h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}90, transparent)` }} />
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 220px',
        ...(fillHeight && { flex: 1, minHeight: 0 }),
      }}>
        {/* 텍스트 영역 */}
        <div className="p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {isDebate && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                  {post.badge}
                </span>
              )}
              {post.status && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                  {post.status.toUpperCase()}
                </span>
              )}
              {post.club && (
                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: clubCfg.bg, color: clubCfg.color }}>
                  {post.club}
                </span>
              )}
            </div>

            <h3 className="font-black text-white leading-tight mb-2 whitespace-pre-line"
              style={{ fontSize: '18px', letterSpacing: '-0.3px' }}>
              {post.title}
            </h3>

            <p className="text-sm leading-relaxed mb-3"
              style={{
                color: 'rgba(255,255,255,0.45)',
                display: '-webkit-box',
                WebkitLineClamp: fillHeight ? 6 : 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
              {post.summary}
            </p>
          </div>

          {post.tweet && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: '#1e1e2e', color: '#f4a100' }}>
                {post.tweet.initials}
              </div>
              <span className="text-xs truncate" style={{ color: '#6b6f88' }}>{post.tweet.author}</span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ background: '#2a1f00', color: '#f4a100' }}>
                T{post.tweet.tier}
              </span>
              <span className="text-xs ml-auto shrink-0" style={{ color: '#3a3a5a' }}>{post.tweet.timeAgo}</span>
            </div>
          )}
        </div>

        {/* 이미지 영역 */}
        <div className="relative overflow-hidden" style={{ minHeight: '180px' }}>
          {post.imageUrl ? (
            <img src={post.imageUrl} alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: 'cover', objectPosition: 'center top' }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: '#111118' }}>
              <span style={{ fontSize: '32px', opacity: 0.12 }}>⚽</span>
            </div>
          )}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, #0a0a14 0%, transparent 30%)' }} />
        </div>
      </div>

      {/* 하단 푸터 */}
      <div className="px-5 py-3 flex items-center gap-4"
        style={{ borderTop: '1px solid #141420' }}>
        {isDebate && (
          <div style={{ width: '140px', flexShrink: 0 }}>
            {vote ? (
              <>
                <div className="flex h-1 rounded-full overflow-hidden mb-0.5" style={{ background: '#1a1a2a' }}>
                  <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                  <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
                </div>
                <div className="flex justify-between" style={{ fontSize: '10px' }}>
                  <span style={{ color: '#3b82f6' }}>{post.voteFor}%</span>
                  <span style={{ color: '#e63946' }}>{post.voteAgainst}%</span>
                </div>
              </>
            ) : (
              <div className="h-1 rounded-full"
                style={{ background: 'linear-gradient(90deg,#2563eb22 0%,#2563eb22 48%,#dc262622 48%,#dc262622 100%)' }} />
            )}
          </div>
        )}
        <span className="text-xs" style={{ color: '#2a2a4a' }}>♡ {fmt(post.reactions)}</span>
        <span className="text-xs" style={{ color: '#2a2a4a' }}>💬 {fmt(post.comments)}</span>
        <span className="text-xs" style={{ color: '#2a2a4a' }}>🔖 {fmt(post.bookmarks)}</span>
      </div>
    </div>
  );
}

/* ─── PeekRow — 단일 라인 블러 미리보기 ─── */
function PeekRow({ post, onClick, direction }) {
  const isDebate = isDebateType(post);
  const isToday = post?.type === 'today_debate';
  const accent = isToday ? '#fbbf24' : '#e63946';
  const statusCfg = STATUS_CFG[post?.status] || STATUS_CFG.Rumour;
  const clubCfg = CLUB_CFG[post?.club] || { bg: '#141420', color: '#9ca3af' };

  return (
    <div onClick={onClick}
      style={{
        height: '44px',
        flexShrink: 0,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        opacity: 0.45,
        filter: 'blur(0.8px)',
      }}>
      <div className="flex items-center gap-2 px-4 h-full"
        style={{ background: '#0a0a14', borderRadius: '12px' }}>
        {isDebate ? (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ color: accent, background: `${accent}18` }}>
            {post.badge}
          </span>
        ) : (
          post?.status && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: statusCfg.dot }} />
          )
        )}
        {post?.club && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: clubCfg.bg, color: clubCfg.color }}>
            {post.club}
          </span>
        )}
        <span className="text-sm font-semibold truncate flex-1" style={{ color: '#d0d4f0' }}>
          {post?.title?.replace('\n', ' ')}
        </span>
        {post?.tweet?.timeAgo && (
          <span className="text-xs shrink-0" style={{ color: '#3a3a5a' }}>{post.tweet.timeAgo}</span>
        )}
        <span className="text-xs shrink-0" style={{ color: '#4a4a6a' }}>
          {direction === 'prev' ? '↑' : '↓'}
        </span>
      </div>
      <div className="absolute inset-x-0"
        style={{
          [direction === 'prev' ? 'top' : 'bottom']: 0,
          height: '100%',
          background: direction === 'prev'
            ? 'linear-gradient(to bottom, #050508 0%, transparent 100%)'
            : 'linear-gradient(to top, #050508 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
    </div>
  );
}

/* ─── DotIndicator ─── */
function DotIndicator({ total, selectedIdx, onSelect }) {
  return (
    <div style={{
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      zIndex: 10,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          style={{
            width: '4px',
            height: i === selectedIdx ? '18px' : '4px',
            borderRadius: '2px',
            background: i === selectedIdx ? '#fff' : '#2a2a4a',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ─── CardCarousel ─── */
const TICKER_ITEMS = [
  '● LIVE  진짜 보내면 안되지', '@jenna_94  드디어 ㅠㅠ 너무 좋다',
  '@manu_fan  캐릭은 진짜 레전드임', '@spurs_kr  손흥민 제발 남아줘',
  '@epl_korea  오늘 발표 크다', '@redcafe  팬으로서 행복하다',
  '@lfc_kr  살라 계약 드디어', '@city_kr  홀란드 빨리 낫길',
];

function CardCarousel({ posts, selectedPost, onSelect, votes }) {
  const text = TICKER_ITEMS.map((t, i) => (i > 0 ? `  —  ${t}` : t)).join('');
  const doubled = text + '    —    ' + text;

  const selectedIdx = posts.findIndex(p => p.id === selectedPost?.id);
  const prevPost = selectedIdx > 0 ? posts[selectedIdx - 1] : null;
  const nextPost = selectedIdx < posts.length - 1 ? posts[selectedIdx + 1] : null;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowUp' && prevPost) {
        e.preventDefault();
        onSelect(prevPost);
      } else if (e.key === 'ArrowDown' && nextPost) {
        e.preventDefault();
        onSelect(nextPost);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prevPost, nextPost, onSelect]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-8 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #141420', background: '#07070f' }}>
        <span className="font-black text-white" style={{ fontSize: '16px' }}>피드</span>
        <span className="text-sm" style={{ color: '#3a3a5a' }}>{posts.length}개 이슈</span>
        <span className="ml-auto text-xs" style={{ color: '#2a2a4a' }}>↑↓ 키로 이동</span>
      </div>

      {/* Ticker */}
      <div className="overflow-hidden shrink-0 py-1.5"
        style={{ borderBottom: '1px solid #141420', background: '#07070f' }}>
        <div className="live-ticker text-xs" style={{ color: '#4a4a6a' }}>{doubled}</div>
      </div>

      {/* Card slots */}
      {posts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: '#3a3a5a' }}>
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm">필터 조건에 맞는 이슈가 없습니다</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative" style={{ padding: '8px 32px 8px' }}>
          <div className="h-full flex flex-col mx-auto" style={{ maxWidth: '680px', gap: '6px' }}>
            {prevPost && (
              <PeekRow post={prevPost} onClick={() => onSelect(prevPost)} direction="prev" />
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              {selectedPost && (
                <DesktopFeedCard
                  post={selectedPost}
                  selected
                  onSelect={() => {}}
                  vote={votes[selectedPost.id]}
                  fillHeight
                />
              )}
            </div>
            {nextPost && (
              <PeekRow post={nextPost} onClick={() => onSelect(nextPost)} direction="next" />
            )}
          </div>
          {posts.length > 1 && (
            <DotIndicator
              total={Math.min(posts.length, 12)}
              selectedIdx={selectedIdx}
              onSelect={(i) => onSelect(posts[i])}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Comment card ─── */
function CommentCard({ c }) {
  const dot = c.stance === 'for' ? '#3b82f6' : c.stance === 'against' ? '#e63946' : null;
  return (
    <div className="flex gap-3 px-4 py-3 mb-1.5 rounded-2xl mx-4"
      style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
      {c.rank && (
        <span className="text-xs font-mono shrink-0 mt-0.5 w-5" style={{ color: '#3a3a5a' }}>{c.rank}</span>
      )}
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: '#1e1e2e', color: '#8b8fa8' }}>
        {c.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-white">{c.user}</span>
          {c.club && (
            <span className="text-xs px-1.5 py-0.5 rounded font-bold"
              style={{ background: '#1a1a2a', color: '#6b6f88' }}>{c.club}</span>
          )}
          <span className="text-xs" style={{ color: '#3a3a5a' }}>· {c.timeAgo}</span>
          {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
        </div>
        <p className="text-sm leading-relaxed mb-1.5" style={{ color: '#d0d4f0' }}>{c.text}</p>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-xs" style={{ color: '#6b6f88' }}>♡ {fmt(c.likes)}</button>
          <button className="text-xs" style={{ color: '#6b6f88' }}>↩ 답글</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CommentsSection (센터 하단) ─── */
function CommentsSection({ post }) {
  const [tab, setTab] = useState('best');
  const isDebate = isDebateType(post);

  useEffect(() => { setTab('best'); }, [post?.id]);

  if (!post) return (
    <div className="h-full flex items-center justify-center" style={{ color: '#3a3a5a' }}>
      <div className="text-sm">카드를 선택하세요</div>
    </div>
  );

  const tabs = isDebate ? ['best', 'live', 'args'] : ['best', 'live'];

  return (
    <div className="flex flex-col h-full" style={{ background: '#07070f' }}>
      {/* Header */}
      <div className="shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #141420' }}>
        <span className="text-sm font-black text-white truncate flex-1">
          {post.title.replace('\n', ' ')}
        </span>
        <span className="text-xs shrink-0" style={{ color: '#3a3a5a' }}>
          💬 {fmt(post.comments)}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-5 px-6 shrink-0"
        style={{ borderBottom: '1px solid #141420' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="text-sm font-semibold pb-2.5 pt-2"
            style={{
              color: tab === t ? '#fff' : '#4a4a6a',
              borderBottom: tab === t ? '2px solid #fff' : '2px solid transparent',
            }}>
            {t === 'best' ? '베스트' : t === 'live' ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e63946' }} />
                실시간
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                주요의견
                <span className="text-xs font-bold px-1 py-0.5 rounded"
                  style={{ color: '#818cf8', background: '#1e1b4b', fontSize: '9px' }}>AI</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pt-2" style={{ scrollbarWidth: 'none' }}>
        {tab === 'args' && post.argumentPoints ? (
          <div className="space-y-1.5 px-4 py-2">
            {(post.argumentPoints || []).map(arg => {
              const isFor = arg.stance === 'for';
              const isNeutral = arg.stance === 'neutral';
              const dotColor = isNeutral ? '#9ca3af' : isFor ? '#3b82f6' : '#e63946';
              return (
                <div key={arg.id} className="rounded-2xl overflow-hidden"
                  style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                    <span className="flex-1 text-sm font-medium leading-snug" style={{ color: '#d0d4f0' }}>
                      {arg.text}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: dotColor,
                        background: isNeutral ? '#1a1a2a' : isFor ? '#1e3a5f' : '#3b0a0a',
                      }}>
                      💬 {arg.comments}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pb-2">
            {(post.comments_data || []).map(c => <CommentCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid #141420' }}>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full"
          style={{ background: '#141420', border: '1px solid #1e1e2a' }}>
          <input
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: '#d0d4f0' }}
            placeholder="팬 반응 남기기..."
          />
          <button className="text-sm font-semibold" style={{ color: '#3b82f6' }}>게시</button>
        </div>
      </div>
    </div>
  );
}

/* ─── VotePanel (우측 컬럼) ─── */
function VotePanel({ post, vote, onVote }) {
  const isDebate = isDebateType(post);
  const isToday = post?.type === 'today_debate';
  const accent = isToday ? '#fbbf24' : '#e63946';
  const statusCfg = STATUS_CFG[post?.status] || STATUS_CFG.Rumour;

  if (!post) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: '#3a3a5a' }}>
      <div className="text-sm text-center">카드를 클릭하면<br />여기에 표시됩니다</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: '#07070f' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid #141420', minHeight: '56px' }}>
        {post.club && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: '#1a1a2a', color: '#d0d4f0' }}>
            ⬛ {post.club}
          </span>
        )}
        {post.status && (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{ background: '#1a1a2a', color: statusCfg.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
            {post.status.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
        {isDebate ? (
          <>
            {/* Briefing (debate context) */}
            {post.briefing && (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: '#0e0e1a', border: '1px solid #1e1e2a' }}>
                {post.tweet && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#1e1e2e', color: '#f4a100' }}>
                      {post.tweet.initials}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#8b8fa8' }}>{post.tweet.author}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: '#2a1f00', color: '#f4a100' }}>T{post.tweet.tier}</span>
                    <span className="text-xs ml-auto" style={{ color: '#3a3a5a' }}>{post.tweet.timeAgo}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed" style={{ color: '#c8ccdf' }}>{post.briefing}</p>
              </div>
            )}

            {/* Debate label + question */}
            <div className="flex items-center gap-1.5">
              <span style={{ color: '#fbbf24', fontSize: '13px' }}>⚡</span>
              <span className="text-xs font-semibold" style={{ color: '#6b6f88' }}>이 소식에서 논쟁 생성됨</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}>
                {post.badge}
              </span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{post.debateQuestion}</h2>
            {vote && post.aiNarrative && (
              <p className="text-sm leading-relaxed" style={{ color: '#8b8fa8' }}>{post.aiNarrative}</p>
            )}

            {/* Vote area */}
            {vote ? (
              <>
                <div className="rounded-2xl p-4" style={{ background: '#111118', border: '1px solid #1e1e2a' }}>
                  <div className="flex items-end justify-between mb-3">
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: '#3b82f6' }}>{post.voteFor}%</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: '#3b82f6' }}>{post.voteForLabel}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs" style={{ color: '#4a4a6a' }}>{fmt(post.participants)} 참여</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: '#e63946' }}>{post.voteAgainst}%</div>
                      <div className="text-xs font-semibold mt-0.5" style={{ color: '#e63946' }}>{post.voteAgainstLabel}</div>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
                    <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)', transition: 'width .6s' }} />
                    <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)', transition: 'width .6s' }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: vote === 'for' ? '#1e3a5f30' : '#3b0a0a30',
                    border: `1px solid ${vote === 'for' ? '#3b82f640' : '#e6394640'}`,
                  }}>
                  <span className="text-base">{vote === 'for' ? '👍' : '👎'}</span>
                  <span className="text-sm font-medium"
                    style={{ color: vote === 'for' ? '#60a5fa' : '#f87171' }}>
                    {vote === 'for' ? post.voteForLabel : post.voteAgainstLabel} 에 투표했습니다
                  </span>
                </div>
                {post.aiSummary && (
                  <div className="rounded-2xl p-4" style={{ background: '#0c0c18', border: '1px solid #2a2a4a' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ color: '#818cf8', background: '#1e1b4b' }}>
                        ✦ AI 여론 분석
                      </span>
                      <span className="text-xs" style={{ color: '#4a4a6a' }}>팬 의견 핵심 논점</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl p-3" style={{ background: '#0d1a2a', border: '1px solid #1e3a5f' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                          <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>{post.voteForLabel} 측</span>
                        </div>
                        {(post.aiSummary.for || []).map((t, i) => (
                          <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: '#8ba8c8' }}>· {t}</p>
                        ))}
                      </div>
                      <div className="rounded-xl p-3" style={{ background: '#1a0a0a', border: '1px solid #3b1010' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63946' }} />
                          <span className="text-xs font-semibold" style={{ color: '#e63946' }}>{post.voteAgainstLabel} 측</span>
                        </div>
                        {(post.aiSummary.against || []).map((t, i) => (
                          <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: '#c48a8a' }}>· {t}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl p-4 space-y-3"
                  style={{ background: '#111118', border: '1px solid #1e1e2a' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: '#4a4a6a' }}>
                      {fmt(post.participants)} 참여중
                    </span>
                    <span className="text-xs font-semibold" style={{ color: accent }}>팬 의견이 갈리는 중</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold"
                      style={{ background: '#0d1a2a', color: '#60a5fa' }}>
                      👍 {post.voteForLabel}
                    </div>
                    <span className="text-xs font-black" style={{ color: '#2a2a4a' }}>VS</span>
                    <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold"
                      style={{ background: '#1a0a0a', color: '#f87171' }}>
                      {post.voteAgainstLabel} 👎
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
                    <div className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg,#2563eb33 0%,#2563eb33 48%,#dc262633 48%,#dc262633 100%)' }} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onVote('for')}
                    className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', boxShadow: '0 0 18px #3b82f640' }}>
                    👍 {post.voteForLabel}
                  </button>
                  <button onClick={() => onVote('against')}
                    className="flex-1 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg,#991b1b,#e63946)', color: '#fff', boxShadow: '0 0 18px #e6394640' }}>
                    👎 {post.voteAgainstLabel}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* General post: briefing + stats */
          <>
            <h3 className="text-lg font-black text-white leading-snug">
              {post.title.replace('\n', ' ')}
            </h3>
            {post.briefing && (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: '#0e0e1a', border: '1px solid #1e1e2a' }}>
                {post.tweet && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#1e1e2e', color: '#f4a100' }}>
                      {post.tweet.initials}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#8b8fa8' }}>{post.tweet.author}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ background: '#2a1f00', color: '#f4a100' }}>T{post.tweet.tier}</span>
                    <span className="text-xs ml-auto" style={{ color: '#3a3a5a' }}>{post.tweet.timeAgo}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed" style={{ color: '#c8ccdf' }}>{post.briefing}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
                <div className="text-lg font-black text-white">{fmt(post.reactions)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>반응</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
                <div className="text-lg font-black text-white">{fmt(post.comments)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>댓글</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
                <div className="text-lg font-black text-white">{fmt(post.bookmarks)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>저장</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main export ─── */
export default function DesktopLayout({ selectedTeam }) {
  const width = useWindowWidth();
  const sidebarCollapsed = width < 1280;
  const { posts } = usePublishedPosts(POSTS);

  const [selectedPost, setSelectedPost] = useState(null);
  const [votes, setVotes] = useState({});
  const [clubFilter, setClubFilter] = useState([]);

  const filteredPosts = useMemo(() => {
    if (clubFilter.length === 0) return posts;
    return posts.filter(p => clubFilter.includes(p.club));
  }, [clubFilter, posts]);

  // 필터 변경 시 선택된 포스트가 없으면 첫 번째로
  useEffect(() => {
    if (filteredPosts.length > 0 && !filteredPosts.find(p => p.id === selectedPost?.id)) {
      setSelectedPost(filteredPosts[0]);
    }
  }, [filteredPosts, selectedPost?.id]);

  const handleVote = (stance) => {
    if (!selectedPost) return;
    setVotes(v => ({ ...v, [selectedPost.id]: stance }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#050508' }}>
      <Sidebar
        selectedTeam={selectedTeam}
        clubFilter={clubFilter}
        onClubFilterChange={setClubFilter}
        posts={posts}
        selectedPost={selectedPost}
        onSelectPost={setSelectedPost}
        collapsed={sidebarCollapsed}
      />

      {/* 센터: 55% 카드 / 45% 댓글 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 55, minHeight: 0, overflow: 'hidden' }}>
          <CardCarousel
            posts={filteredPosts}
            selectedPost={selectedPost}
            onSelect={setSelectedPost}
            votes={votes}
          />
        </div>
        <div style={{ flex: 45, minHeight: 0, overflow: 'hidden', borderTop: '1px solid #141420' }}>
          <CommentsSection post={selectedPost} />
        </div>
      </div>

      {/* 우측: 투표 + AI 여론 */}
      <div style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #141420' }}>
        <VotePanel
          post={selectedPost}
          vote={votes[selectedPost?.id]}
          onVote={handleVote}
        />
      </div>
    </div>
  );
}
