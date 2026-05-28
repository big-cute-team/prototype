import { useState, useEffect } from 'react';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

const STATUS_COLOR = {
  Official: '#34d399', Advanced: '#fb923c', Talks: '#fbbf24',
  Interest: '#60a5fa', Rumour: '#9ca3af', Opinion: '#818cf8', Memory: '#c084fc',
};

/* ─── Shared small components ─── */

function CommentCard({ c }) {
  const dot = c.stance === 'for' ? '#3b82f6' : c.stance === 'against' ? '#e63946' : null;
  return (
    <div className="flex gap-3 px-4 py-3 mb-1.5 rounded-2xl mx-4"
      style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
      {c.rank && (
        <span className="text-xs font-mono shrink-0 mt-0.5 w-5" style={{ color: '#3a3a5a' }}>{c.rank}</span>
      )}
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: '#1e1e2e', color: '#8b8fa8' }}>
        {c.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-white">{c.user}</span>
          {c.club && (
            <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: '#1a1a2a', color: '#6b6f88' }}>
              {c.club}
            </span>
          )}
          <span className="text-xs" style={{ color: '#3a3a5a' }}>· {c.timeAgo}</span>
          {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
        </div>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#d0d4f0' }}>{c.text}</p>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-xs" style={{ color: '#6b6f88' }}>♡ {fmt(c.likes)}</button>
          <button className="text-xs" style={{ color: '#6b6f88' }}>↩ 답글</button>
        </div>
      </div>
    </div>
  );
}

function CommentInput({ disabled }) {
  return (
    <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid #141420' }}>
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full"
        style={{
          background: '#141420',
          border: '1px solid #1e1e2a',
          opacity: disabled ? 0.5 : 1,
        }}>
        <input
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: '#d0d4f0' }}
          placeholder={disabled ? '투표 후 댓글을 남길 수 있어요' : '팬 반응 남기기...'}
          disabled={disabled}
        />
        <button className="text-sm font-semibold"
          style={{ color: disabled ? '#3a3a5a' : '#3b82f6' }}
          disabled={disabled}>
          게시
        </button>
      </div>
    </div>
  );
}

/* ─── Korean briefing card ─── */

function BriefingCard({ post }) {
  if (!post.briefing) return null;
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: '#0e0e1a', border: '1px solid #1e1e2a' }}>
      {post.tweet && (
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: '#1e1e2e', color: '#f4a100' }}>
            {post.tweet.initials}
          </div>
          <span className="text-xs font-semibold" style={{ color: '#8b8fa8' }}>{post.tweet.author}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: '#2a1f00', color: '#f4a100' }}>T{post.tweet.tier}</span>
          <span className="text-xs ml-auto shrink-0" style={{ color: '#3a3a5a' }}>{post.tweet.timeAgo}</span>
        </div>
      )}
      <p className="text-sm leading-relaxed" style={{ color: '#c8ccdf' }}>
        {post.briefing}
      </p>
    </div>
  );
}

/* ─── Debate summary (Stage 1: expanded) ─── */

function DebateSummary({ post, vote, onVote, onCollapse }) {
  const isToday = post.type === 'today_debate';
  const accent = isToday ? '#fbbf24' : '#e63946';
  const voted = !!vote;

  return (
    <div className="flex-1 overflow-y-scroll" style={{ scrollbarWidth: 'none' }}>
      <div className="px-4 pt-4 pb-6 space-y-4">

        {/* Korean briefing card */}
        <BriefingCard post={post} />

        {/* label */}
        <div className="flex items-center gap-1.5">
          <span style={{ color: '#fbbf24', fontSize: '13px' }}>⚡</span>
          <span className="text-xs font-semibold" style={{ color: '#6b6f88' }}>이 소식에서 논쟁 생성됨</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}30` }}>
            {post.badge}
          </span>
        </div>

        {/* Debate question */}
        <div>
          <h2 className="text-2xl font-black text-white leading-tight mb-2">
            {post.debateQuestion}
          </h2>
          {voted && (
            <p className="text-sm leading-relaxed" style={{ color: '#8b8fa8' }}>
              {post.aiNarrative}
            </p>
          )}
        </div>

        {/* ── PRE-VOTE: 선택지 티저 ── */}
        {!voted && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#111118', border: '1px solid #1e1e2a' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: '#4a4a6a' }}>
                {fmt(post.participants)} 참여중
              </span>
              <span className="text-xs font-semibold" style={{ color: accent }}>
                팬 의견이 갈리는 중
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold"
                style={{ background: '#0d1a2a', border: '1px solid #1e3a5f40', color: '#60a5fa' }}>
                👍 {post.voteForLabel}
              </div>
              <span className="text-xs font-black" style={{ color: '#2a2a4a' }}>VS</span>
              <div className="flex-1 py-2.5 rounded-xl text-center text-sm font-bold"
                style={{ background: '#1a0a0a', border: '1px solid #3b101040', color: '#f87171' }}>
                {post.voteAgainstLabel} 👎
              </div>
            </div>
            {/* 흐린 바 — 결과가 있지만 숨겨져 있음을 암시 */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
              <div className="h-full w-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#2563eb33 0%,#2563eb33 48%,#dc262633 48%,#dc262633 100%)' }} />
            </div>
            <p className="text-xs text-center" style={{ color: '#4a4a6a' }}>
              투표 후 현재 팬 여론을 볼 수 있어요
            </p>
          </div>
        )}

        {/* ── POST-VOTE: 실제 비율 ── */}
        {voted && (
          <div className="rounded-2xl p-4" style={{ background: '#111118', border: '1px solid #1e1e2a' }}>
            <div className="flex items-end justify-between mb-3">
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: '#3b82f6' }}>{post.voteFor}%</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: '#3b82f6' }}>{post.voteForLabel}</div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-1" style={{ color: '#4a4a6a' }}>{fmt(post.participants)} 참여</div>
                {post.recentTrend && (
                  <div className="text-xs" style={{ color: post.recentTrend.direction === 'for' ? '#3b82f6' : '#e63946' }}>
                    {post.recentTrend.direction === 'for' ? post.voteForLabel : post.voteAgainstLabel} +{post.recentTrend.pct}%↑
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: '#e63946' }}>{post.voteAgainst}%</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: '#e63946' }}>{post.voteAgainstLabel}</div>
              </div>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
              <div style={{ width: `${post.voteFor}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)', transition: 'width .6s' }} />
              <div style={{ width: `${post.voteAgainst}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)', transition: 'width .6s' }} />
            </div>
          </div>
        )}

        {/* Vote buttons / voted state */}
        {voted ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{
              background: vote === 'for' ? '#1e3a5f30' : '#3b0a0a30',
              border: `1px solid ${vote === 'for' ? '#3b82f640' : '#e6394640'}`,
            }}>
            <span className="text-base">{vote === 'for' ? '👍' : '👎'}</span>
            <span className="text-sm font-medium" style={{ color: vote === 'for' ? '#60a5fa' : '#f87171' }}>
              {vote === 'for' ? post.voteForLabel : post.voteAgainstLabel} 에 투표했습니다
            </span>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => onVote('for')}
              className="flex-1 py-4 rounded-2xl font-black text-sm transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', boxShadow: '0 0 18px #3b82f640' }}>
              👍 {post.voteForLabel}
            </button>
            <button onClick={() => onVote('against')}
              className="flex-1 py-4 rounded-2xl font-black text-sm transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg,#991b1b,#e63946)', color: '#fff', boxShadow: '0 0 18px #e6394640' }}>
              👎 {post.voteAgainstLabel}
            </button>
          </div>
        )}

        {/* ── POST-VOTE: AI 여론 분석 ── */}
        {voted && (
          <div className="rounded-2xl p-4" style={{ background: '#0c0c18', border: '1px solid #2a2a4a' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: '#818cf8', background: '#1e1b4b' }}>
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
                {post.aiSummary.for.map((t, i) => (
                  <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: '#8ba8c8' }}>· {t}</p>
                ))}
              </div>
              <div className="rounded-xl p-3" style={{ background: '#1a0a0a', border: '1px solid #3b1010' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63946' }} />
                  <span className="text-xs font-semibold" style={{ color: '#e63946' }}>{post.voteAgainstLabel} 측</span>
                </div>
                {post.aiSummary.against.map((t, i) => (
                  <p key={i} className="text-xs leading-relaxed mb-1" style={{ color: '#c48a8a' }}>· {t}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA — 투표 후에만 표시 */}
        {voted && (
          <button onClick={onCollapse}
            className="w-full py-4 rounded-2xl font-black text-base transition-transform active:scale-95"
            style={{ background: '#fff', color: '#000' }}>
            팬 반응 탐색하기 {fmt(post.comments)} →
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Mini sticky header (Stage 2: collapsed debate) ─── */

function DebateMiniHeader({ post, onExpand }) {
  return (
    <div className="shrink-0 px-4 py-3" style={{ background: '#0d0d18', borderBottom: '1px solid #1a1a2a' }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{post.debateQuestion}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>{post.voteFor}%</span>
            <span className="text-xs" style={{ color: '#4a4a6a' }}>vs</span>
            <span className="text-xs font-semibold" style={{ color: '#e63946' }}>{post.voteAgainst}%</span>
            <span className="text-xs" style={{ color: '#3a3a5a' }}>· {fmt(post.participants)} 참여</span>
          </div>
        </div>
        <button onClick={onExpand}
          className="shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ background: '#1a1a2a', color: '#8b8fa8', border: '1px solid #2a2a3a' }}>
          ↑ 상세
        </button>
      </div>
    </div>
  );
}

/* ─── Arguments tab (논점별) ─── */

function ArgumentsTab({ post, vote }) {
  const [openId, setOpenId] = useState(null);
  const points = post.argumentPoints || [];

  return (
    <div className="pt-2 pb-6 space-y-2">
      {points.map((arg) => {
        const isFor = arg.stance === 'for';
        const isNeutral = arg.stance === 'neutral';
        const dotColor = isNeutral ? '#9ca3af' : isFor ? '#3b82f6' : '#e63946';
        const isOpen = openId === arg.id;
        const relatedComments = (post.comments_data || []).filter(
          (c) => c.stance === arg.stance
        );

        return (
          <div key={arg.id} className="mx-4 rounded-2xl overflow-hidden"
            style={{ background: '#111118', border: '1px solid #1a1a2a' }}>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              onClick={() => setOpenId(isOpen ? null : arg.id)}>
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
              <span className="text-xs" style={{ color: '#4a4a6a' }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4" style={{ borderTop: '1px solid #1a1a2a' }}>
                {relatedComments.length > 0 ? (
                  relatedComments.map((c) => (
                    <div key={c.id} className="flex gap-2.5 pt-3">
                      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: '#1e1e2e', color: '#8b8fa8' }}>
                        {c.initials}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-white">{c.user}</span>
                          <span className="text-xs" style={{ color: '#3a3a5a' }}>· {c.timeAgo}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: '#9ca3c8' }}>{c.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs pt-3" style={{ color: '#4a4a6a' }}>이 논점의 댓글이 아직 없어요.</p>
                )}
                {vote && (
                  <div className="mt-3">
                    <input
                      className="w-full text-xs px-3 py-2 rounded-xl outline-none"
                      style={{ background: '#1a1a2a', border: '1px solid #2a2a3a', color: '#d0d4f0' }}
                      placeholder="이 논점에 대한 의견을 남겨보세요..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tabs + comments section ─── */

function CommentsSection({ post, vote, tab, onTabChange }) {
  const tabs = post.type === 'debate' || post.type === 'today_debate' || post.type === 'hot_debate'
    ? ['best', 'live', 'args']
    : ['best', 'live'];

  const tabLabel = (t) => {
    if (t === 'live') return (
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e63946' }} />
        실시간
      </span>
    );
    if (t === 'args') return (
      <span className="flex items-center gap-1.5">
        주요의견
        <span className="text-xs font-bold px-1 py-0.5 rounded" style={{ color: '#818cf8', background: '#1e1b4b', fontSize: '9px' }}>AI</span>
      </span>
    );
    return '베스트';
  };

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-5 px-4 pb-0 shrink-0" style={{ borderBottom: '1px solid #141420' }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => onTabChange(t)}
            className="text-sm font-semibold pb-2.5 pt-1"
            style={{
              color: tab === t ? (t === 'live' ? '#e63946' : '#fff') : '#4a4a6a',
              borderBottom: tab === t ? `2px solid ${t === 'live' ? '#e63946' : '#fff'}` : '2px solid transparent',
            }}>
            {tabLabel(t)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-scroll" style={{ scrollbarWidth: 'none' }}>
        {tab === 'args' ? (
          <ArgumentsTab post={post} vote={vote} />
        ) : (
          <div className="pt-2 pb-6">
            {(post.comments_data || []).map((c) => <CommentCard key={c.id} c={c} />)}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Main panel ─── */

export default function ReactionPanel({ post, vote, onVote, onClose }) {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(!!vote);
  const [tab, setTab] = useState('best');
  const isDebate = post.type === 'debate' || post.type === 'today_debate' || post.type === 'hot_debate';
  const statusColor = STATUS_COLOR[post.status] || '#9ca3af';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const handleVote = (stance) => {
    onVote(stance);
    // 투표 후 결과를 먼저 보여주고, CTA 클릭 시 댓글로 이동
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute inset-0 flex flex-col transition-transform duration-[280ms] ease-out"
        style={{ background: '#080810', transform: visible ? 'translateX(0)' : 'translateX(100%)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: isDebate && !collapsed ? '1px solid #141420' : 'none' }}>
          <div className="flex gap-2 flex-wrap">
            {post.club && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ background: '#1a1a2a', color: '#d0d4f0' }}>
                ⬛ {post.club}
              </span>
            )}
            {post.status && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: '#1a1a2a', color: statusColor }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                {post.status.toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ background: '#1a1a2a', color: '#9ca3af' }}>✕</button>
        </div>

        {/* Non-debate: title + briefing */}
        {!isDebate && (
          <div className="shrink-0" style={{ borderBottom: '1px solid #141420' }}>
            <div className="px-4 pt-2 pb-3">
              <h3 className="text-lg font-black text-white leading-snug">
                {post.title.replace('\n', ' ')}
              </h3>
            </div>
            {post.briefing && (
              <div className="px-4 pb-3">
                <BriefingCard post={post} />
              </div>
            )}
          </div>
        )}

        {/* Debate: Stage 1 (expanded summary) */}
        {isDebate && !collapsed && (
          <DebateSummary
            post={post}
            vote={vote}
            onVote={handleVote}
            onCollapse={() => setCollapsed(true)}
          />
        )}

        {/* Debate: Stage 2 (collapsed — mini header + tabs) */}
        {isDebate && collapsed && (
          <>
            <DebateMiniHeader post={post} onExpand={() => setCollapsed(false)} />
            <CommentsSection post={post} vote={vote} tab={tab} onTabChange={setTab} />
            <CommentInput disabled={!vote} />
          </>
        )}

        {/* Non-debate: tabs + comments */}
        {!isDebate && (
          <>
            <CommentsSection post={post} vote={vote} tab={tab} onTabChange={setTab} />
            <CommentInput disabled={false} />
          </>
        )}
      </div>
    </div>
  );
}
