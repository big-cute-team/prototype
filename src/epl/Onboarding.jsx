import { useState, useEffect } from 'react';
import { TEAMS } from './data';

/* ── Page 1: Card stack ── */
function CardStackVisual() {
  const cards = [
    { badge: 'OFFICIAL', badgeColor: '#34d399', title: '카세미루, 맨유와 이별 오피셜', club: 'MUN' },
    { badge: 'HOT DEBATE', badgeColor: '#e63946', title: '손흥민, 지금 토트넘 떠나야?', club: 'TOT', vote: [38, 62] },
    { badge: 'TODAY DEBATE', badgeColor: '#fbbf24', title: '브루노 21어시 신기록 가능?', club: 'MUN', vote: [61, 39] },
  ];

  return (
    <div className="relative mx-6" style={{ height: '210px' }}>
      {cards.map((card, i) => (
        <div key={i} className="absolute inset-x-0 rounded-2xl px-4 py-3"
          style={{
            top: `${(2 - i) * 22}px`,
            background: '#0d0d1a',
            border: '1px solid #1e1e2a',
            transform: `scale(${0.9 + i * 0.05})`,
            transformOrigin: 'top center',
            opacity: 0.3 + i * 0.35,
            zIndex: i,
          }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold px-2 py-0.5 rounded-full"
              style={{ color: card.badgeColor, background: `${card.badgeColor}15`, border: `1px solid ${card.badgeColor}30`, fontSize: '9px' }}>
              ● {card.badge}
            </span>
            <span className="font-bold px-1.5 py-0.5 rounded"
              style={{ background: '#1a1a2a', color: '#6b6f88', fontSize: '9px' }}>
              {card.club}
            </span>
          </div>
          <p className="font-black text-white" style={{ fontSize: '15px', lineHeight: '1.25' }}>{card.title}</p>
          {card.vote && (
            <div className="mt-2 flex h-1 rounded-full overflow-hidden" style={{ background: '#1a1a2a' }}>
              <div style={{ width: `${card.vote[0]}%`, background: '#3b82f6' }} />
              <div style={{ width: `${card.vote[1]}%`, background: '#e63946' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Page 2: Swipe anim ── */
function SwipeAnimVisual() {
  const [idx, setIdx] = useState(0);
  const cards = [
    { badge: 'HOT DEBATE', badgeColor: '#e63946', title: '손흥민, 지금\n토트넘 떠나야?', vote: [38, 62] },
    { badge: 'TODAY DEBATE', badgeColor: '#fbbf24', title: '브루노 21어시\n신기록 가능?', vote: [61, 39] },
    { badge: 'OFFICIAL', badgeColor: '#34d399', title: '카세미루,\n이별 오피셜', vote: null },
  ];

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % cards.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-6 rounded-2xl overflow-hidden relative"
      style={{ height: '190px', background: '#0a0a14', border: '1px solid #1a1a2a' }}>
      {cards.map((card, i) => {
        const isActive = i === idx;
        const isPrev = i === (idx + cards.length - 1) % cards.length;
        return (
          <div key={i} className="absolute inset-0 px-5 py-5"
            style={{
              transform: isActive ? 'translateY(0)' : isPrev ? 'translateY(-100%)' : 'translateY(100%)',
              opacity: isActive ? 1 : 0,
              transition: 'transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.55s ease',
            }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold px-2.5 py-0.5 rounded-full"
                style={{ color: card.badgeColor, background: `${card.badgeColor}18`, border: `1px solid ${card.badgeColor}35`, fontSize: '9px' }}>
                ● {card.badge}
              </span>
            </div>
            <p className="font-black text-white whitespace-pre-line" style={{ fontSize: '20px', lineHeight: '1.2' }}>{card.title}</p>
            {card.vote && (
              <div className="mt-4">
                <div className="flex h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: '#1a1a2a' }}>
                  <div style={{ width: `${card.vote[0]}%`, background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                  <div style={{ width: `${card.vote[1]}%`, background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: '700' }}>찬성 {card.vote[0]}%</span>
                  <span style={{ color: '#e63946', fontSize: '10px', fontWeight: '700' }}>{card.vote[1]}% 반대</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="absolute bottom-3 inset-x-0 flex justify-center">
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>↑ 위로 스와이프 · 다음 이슈</span>
      </div>
    </div>
  );
}

/* ── Page 3: HOT DEBATE card ── */
function DebateCardVisual() {
  return (
    <div className="mx-6 rounded-2xl overflow-hidden" style={{ background: '#080810', border: '1px solid #1e1e2a' }}>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,#e6394650,transparent)' }} />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: '#e6394618', border: '1px solid #e6394635' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#e63946' }} />
            <span className="font-black tracking-widest" style={{ color: '#e63946', fontSize: '10px' }}>HOT DEBATE</span>
          </div>
          <span style={{ color: '#4a4a6a', fontSize: '11px' }}>2.1K 참여중</span>
        </div>
        <h2 className="font-black text-white leading-tight mb-1.5" style={{ fontSize: '20px' }}>
          브루노는 이번 여름<br />매각해야 할까?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px', lineHeight: '1.6', marginBottom: '14px' }}>
          20어시를 기록한 에이스를 팔아야 한다는 매각설 — 팬 여론이 뜨겁게 갈린다.
        </p>
        <div className="flex h-2 rounded-full overflow-hidden mb-2" style={{ background: '#1a1a2a' }}>
          <div style={{ width: '41%', background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
          <div style={{ width: '59%', background: 'linear-gradient(90deg,#dc2626,#e63946)' }} />
        </div>
        <div className="flex justify-between mb-4">
          <span className="font-semibold" style={{ color: '#3b82f6', fontSize: '11px' }}>찬성 41%</span>
          <span className="font-semibold" style={{ color: '#e63946', fontSize: '11px' }}>59% 반대</span>
        </div>
        <button className="w-full py-2.5 rounded-xl font-bold text-sm"
          style={{ background: '#fff', color: '#000' }}>
          팬 반응 2.1K →
        </button>
      </div>
    </div>
  );
}

/* ── Page 4: Flow steps (animated) ── */
function FlowStepsVisual() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const delays = [200, 550, 900, 1250, 1600, 1950];
    const timers = delays.map((d, i) => setTimeout(() => setVisible(v => Math.max(v, i + 1)), d));
    return () => timers.forEach(clearTimeout);
  }, []);

  const steps = [
    { icon: '💬', label: '팬 반응 보기', sub: '2.1K 팬이 참여중', color: '#fff' },
    { icon: '📋', label: '현재 상황 요약', sub: '트윗 기반 AI 논쟁 생성', color: '#c084fc' },
    { icon: '📊', label: '현재 팬 여론 확인', sub: '찬성 41% vs 반대 59%', color: '#3b82f6' },
    { icon: '👍', label: '내 입장 선택 · 투표', sub: '투표 후 댓글 참여 가능', color: '#60a5fa' },
    { icon: '✦', label: 'AI 핵심 의견', sub: '찬반 논점 자동 요약', color: '#818cf8' },
    { icon: '🔥', label: '팬 반응 탐색', sub: '베스트 · 실시간 · 주요의견', color: '#fb923c' },
  ];

  return (
    <div className="mx-6 space-y-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{
            background: '#111118',
            border: '1px solid #1a1a2a',
            opacity: i < visible ? 1 : 0,
            transform: i < visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}>
          <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{step.icon}</span>
          <div className="flex-1">
            <div className="font-bold" style={{ color: step.color, fontSize: '12px' }}>{step.label}</div>
            <div style={{ color: '#4a4a6a', fontSize: '10px', marginTop: '1px' }}>{step.sub}</div>
          </div>
          {i < visible && <span style={{ color: '#2a2a4a', fontSize: '10px' }}>→</span>}
        </div>
      ))}
    </div>
  );
}

/* ── Page 5: Final hero ── */
function FinalVisual() {
  return (
    <div className="flex flex-col items-center px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 mb-10">
        <span className="font-black text-white" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>Reax</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded"
          style={{ background: '#1a1a2a', color: '#8b8fa8', border: '1px solid #2a2a3a' }}>EPL</span>
      </div>
      <div className="text-center">
        <p className="font-black text-white" style={{ fontSize: '38px', letterSpacing: '-0.8px', lineHeight: '1.1' }}>
          피드는 가볍게,
        </p>
        <p className="font-black" style={{ fontSize: '38px', letterSpacing: '-0.8px', lineHeight: '1.1', color: '#3b82f6' }}>
          반응은 깊게
        </p>
      </div>
      <div className="mt-8 flex items-center gap-3">
        <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #1e1e2a)' }} />
        <div className="flex gap-1.5">
          {['#34d399', '#e63946', '#818cf8'].map((c, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #1e1e2a, transparent)' }} />
      </div>
    </div>
  );
}

/* ── Page 6: Team selection ── */
function TeamSelectVisual({ selectedTeam, onSelect }) {
  return (
    <div className="mx-5 grid grid-cols-2 gap-3">
      {TEAMS.map((team) => {
        const isSelected = selectedTeam?.id === team.id;
        return (
          <button
            key={team.id}
            onClick={() => onSelect(team)}
            className="rounded-2xl px-4 py-4 text-left transition-transform active:scale-95"
            style={{
              background: isSelected ? `${team.primaryColor}20` : '#0d0d1a',
              border: `1.5px solid ${isSelected ? team.primaryColor : '#1e1e2a'}`,
              boxShadow: isSelected ? `0 0 18px ${team.primaryColor}35` : 'none',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                style={{ background: team.primaryColor, color: '#fff' }}>
                {team.shortName.slice(0, 2)}
              </div>
              {isSelected && (
                <span className="ml-auto text-sm font-black" style={{ color: team.primaryColor }}>✓</span>
              )}
            </div>
            <div className="font-bold text-white" style={{ fontSize: '12px', lineHeight: '1.3' }}>
              {team.name}
            </div>
            <div className="font-mono text-xs mt-0.5" style={{ color: '#4a4a6a' }}>
              {team.shortName}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Onboarding pages config ── */
const PAGES = [
  {
    Visual: CardStackVisual,
    title: '해외발 프리미어리그 이슈를\n가장 빠르게 확인하세요',
    desc: '실시간 해외 이슈를 짧고 빠르게 소비할 수 있습니다.',
  },
  {
    Visual: SwipeAnimVisual,
    title: '위아래로 넘기며\n빠르게 이슈를 소비하세요',
    desc: 'TikTok/Reels처럼 프리미어리그 이슈를 빠르게 확인할 수 있습니다.',
  },
  {
    Visual: DebateCardVisual,
    title: '팬들이 뜨겁게 반응하는\n이슈를 확인하세요',
    desc: '논쟁형 게시물에서는 실시간 팬 여론을 볼 수 있습니다.',
  },
  {
    Visual: FlowStepsVisual,
    title: '팬 반응을 확인하고\n직접 참여해보세요',
    desc: '현재 여론, AI 핵심 의견, 팬 반응을 함께 탐색할 수 있습니다.',
  },
  {
    Visual: FinalVisual,
    title: null,
    desc: '뉴스를 읽고 끝나는 것이 아니라, 팬들의 반응과 여론 흐름까지 함께 소비하세요.',
  },
  {
    Visual: null, // TeamSelectVisual is rendered separately with props
    isTeamSelect: true,
    isFinal: true,
    title: '좋아하는 팀을\n선택하세요',
    desc: '선택한 팀의 HOT DEBATE와 팬 반응을 우선 보여드립니다.',
  },
];

/* ── Main component ── */
export default function Onboarding({ onComplete }) {
  const [page, setPage] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(TEAMS[0]); // 기본값: Manchester United

  const complete = () => {
    localStorage.setItem('reax_team', JSON.stringify(selectedTeam));
    onComplete(selectedTeam);
  };

  const goNext = () => {
    if (page < PAGES.length - 1) {
      setPage(p => p + 1);
      setAnimKey(k => k + 1);
    } else {
      complete();
    }
  };

  const current = PAGES[page];
  const { Visual } = current;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#080810' }}>

      {/* Skip */}
      {!current.isFinal && (
        <div className="flex justify-end px-5 pt-3 shrink-0">
          <button onClick={complete} className="text-xs px-3 py-1.5 rounded-full"
            style={{ color: '#3a3a5a' }}>
            건너뛰기
          </button>
        </div>
      )}

      {/* Visual */}
      <div key={animKey}
        className="page-enter flex-1 flex flex-col justify-center overflow-hidden"
        style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        {current.isTeamSelect
          ? <TeamSelectVisual selectedTeam={selectedTeam} onSelect={setSelectedTeam} />
          : <Visual />
        }
      </div>

      {/* Bottom block */}
      <div key={`t-${animKey}`} className="page-enter shrink-0 px-6 pb-8">
        {current.title && (
          <h1 className="font-black text-white leading-tight mb-2 whitespace-pre-line"
            style={{ fontSize: '22px', letterSpacing: '-0.3px' }}>
            {current.title}
          </h1>
        )}
        <p className={`text-sm leading-relaxed mb-6 ${!current.title ? 'text-center' : ''}`}
          style={{ color: '#5a5a7a' }}>
          {current.desc}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {PAGES.map((_, i) => (
              <div key={i} className="rounded-full"
                style={{
                  width: i === page ? '18px' : '6px',
                  height: '6px',
                  background: i === page ? '#fff' : '#1e1e2a',
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
            ))}
          </div>
          <button onClick={goNext}
            className="px-6 py-3 rounded-full font-bold text-sm transition-transform active:scale-95"
            style={current.isFinal
              ? { background: selectedTeam?.primaryColor || '#fff', color: '#fff' }
              : { background: '#fff', color: '#000' }
            }>
            {current.isFinal ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
