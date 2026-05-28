import { useState, useEffect } from 'react';
import { SAMPLE_COMMENTS } from './data';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

function VoteBar({ voteFor, voteAgainst }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
      <div
        className="transition-all duration-700"
        style={{ width: `${voteFor}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}
      />
      <div
        className="transition-all duration-700"
        style={{ width: `${voteAgainst}%`, background: 'linear-gradient(90deg, #dc2626, #e63946)' }}
      />
    </div>
  );
}

export default function DebatePanel({ post, vote, onVote, onClose }) {
  const [visible, setVisible] = useState(false);
  const [expandedArg, setExpandedArg] = useState(null);
  const isToday = post.type === 'today_debate';
  const accentColor = isToday ? '#fbbf24' : '#e63946';

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  return (
    <div className="absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute inset-0 flex flex-col transition-transform duration-[280ms] ease-out"
        style={{
          background: '#0d0d18',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid #1a1a2a' }}>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg"
            style={{ background: '#1a1a2a', color: '#8b8fa8' }}>
            ←
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: accentColor, background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
                {post.badge}
              </span>
              <span className="text-xs" style={{ color: '#6b6f88' }}>{fmt(post.participants)} 참여중</span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-scroll" style={{ scrollbarWidth: 'none' }}>
          <div className="px-4 py-4 space-y-4">

            {/* Title */}
            <h3 className="text-lg font-bold text-white leading-snug">{post.title}</h3>

            {/* Section: 현재 상황 */}
            <div className="rounded-xl p-4" style={{ background: '#13131f', border: '1px solid #1a1a2a' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color: '#6b6f88' }}>📋 현재 상황</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#c4c8e0' }}>{post.situation}</p>
            </div>

            {/* Section: 현재 팬 여론 */}
            <div className="rounded-xl p-4" style={{ background: '#13131f', border: '1px solid #1a1a2a' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: '#6b6f88' }}>📊 현재 팬 여론</span>
                <span className="text-xs" style={{ color: '#6b6f88' }}>{fmt(post.participants)}명 참여</span>
              </div>
              <VoteBar voteFor={post.voteFor} voteAgainst={post.voteAgainst} />
              <div className="flex justify-between mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
                  <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>
                    {post.voteForLabel} {post.voteFor}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#e63946' }}>
                    {post.voteAgainst}% {post.voteAgainstLabel}
                  </span>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#e63946' }} />
                </div>
              </div>
              {post.recentTrend && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#6b6f88' }}>
                    최근 {post.recentTrend.time}:
                  </span>
                  <span className="text-xs font-medium"
                    style={{ color: post.recentTrend.direction === 'for' ? '#3b82f6' : '#e63946' }}>
                    {post.recentTrend.direction === 'for'
                      ? `${post.voteForLabel} +${post.recentTrend.pct}%`
                      : `${post.voteAgainstLabel} +${post.recentTrend.pct}%`}
                    ↑
                  </span>
                </div>
              )}
            </div>

            {/* Section: 투표 */}
            {!vote ? (
              <div className="rounded-xl p-4" style={{ background: '#13131f', border: '1px solid #1a1a2a' }}>
                <p className="text-xs text-center mb-3" style={{ color: '#6b6f88' }}>
                  투표 후 AI 요약과 팬 반응을 볼 수 있어요
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => onVote('for')}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #1d3a6b, #1e3a5f)',
                      border: '1px solid #3b82f640',
                      color: '#60a5fa',
                    }}>
                    👍 {post.voteForLabel}
                  </button>
                  <button
                    onClick={() => onVote('against')}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #3b0a0a, #2d0808)',
                      border: '1px solid #e6394640',
                      color: '#f87171',
                    }}>
                    👎 {post.voteAgainstLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                style={{
                  background: vote === 'for' ? '#1e3a5f30' : '#3b0a0a30',
                  border: `1px solid ${vote === 'for' ? '#3b82f640' : '#e6394640'}`,
                }}>
                <span className="text-base">{vote === 'for' ? '👍' : '👎'}</span>
                <span className="text-sm font-medium" style={{ color: vote === 'for' ? '#60a5fa' : '#f87171' }}>
                  {vote === 'for' ? post.voteForLabel : post.voteAgainstLabel} 에 투표했습니다
                </span>
              </div>
            )}

            {/* Section: AI 요약 (투표 후에만) */}
            {vote && (
              <div className="rounded-xl p-4 space-y-3"
                style={{ background: '#0f1020', border: '1px solid #2a2a4a' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: '#818cf8', background: '#1e1b4b' }}>
                    ✦ AI 요약
                  </span>
                  <span className="text-xs" style={{ color: '#6b6f88' }}>팬 의견 핵심 논점</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* For side */}
                  <div className="rounded-lg p-3" style={{ background: '#0d1a2a', border: '1px solid #1e3a5f' }}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                      <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>
                        {post.voteForLabel} 측
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {post.aiSummary.for.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed" style={{ color: '#8ba8c8' }}>
                          · {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Against side */}
                  <div className="rounded-lg p-3" style={{ background: '#1a0a0a', border: '1px solid #3b1010' }}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#e63946' }} />
                      <span className="text-xs font-semibold" style={{ color: '#e63946' }}>
                        {post.voteAgainstLabel} 측
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {post.aiSummary.against.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed" style={{ color: '#c48a8a' }}>
                          · {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Section: 논점별 반응 (투표 후에만) */}
            {vote && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold" style={{ color: '#6b6f88' }}>💬 논점별 팬 반응</span>
                </div>
                <div className="space-y-2">
                  {post.arguments.map((arg) => {
                    const isFor = arg.stance === 'for';
                    const isOpen = expandedArg === arg.id;
                    const comments = SAMPLE_COMMENTS[arg.id] || [];
                    return (
                      <div key={arg.id} className="rounded-xl overflow-hidden"
                        style={{ background: '#13131f', border: '1px solid #1a1a2a' }}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-left"
                          onClick={() => setExpandedArg(isOpen ? null : arg.id)}>
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: isFor ? '#3b82f6' : '#e63946' }} />
                          <span className="flex-1 text-sm font-medium" style={{ color: '#d0d4f0' }}>
                            {arg.text}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              color: isFor ? '#3b82f6' : '#e63946',
                              background: isFor ? '#1e3a5f' : '#3b0a0a',
                            }}>
                            💬 {arg.comments}
                          </span>
                          <span className="text-xs" style={{ color: '#6b6f88' }}>
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3 space-y-2" style={{ borderTop: '1px solid #1a1a2a' }}>
                            {comments.map((c, i) => (
                              <div key={i} className="flex gap-2 pt-2">
                                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs"
                                  style={{ background: '#1a1a2a', color: '#6b6f88' }}>
                                  {['🦁', '⚽', '🏟️', '🔥'][i % 4]}
                                </div>
                                <p className="text-xs leading-relaxed" style={{ color: '#8b8fa8' }}>{c}</p>
                              </div>
                            ))}
                            <div className="pt-1">
                              <input
                                className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                                style={{
                                  background: '#1a1a2a',
                                  border: '1px solid #2a2a3a',
                                  color: '#d0d4f0',
                                }}
                                placeholder="의견을 남겨보세요..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
