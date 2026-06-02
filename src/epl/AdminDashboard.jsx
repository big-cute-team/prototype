import { useEffect, useMemo, useState } from 'react';

const STATUS_OPTIONS = ['review', 'published', 'discarded', 'rejected', 'all'];
const BRIEFING_STATUS_OPTIONS = ['OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED'];
const TEAM_OPTIONS = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];
const STATUS_LABELS = {
  review: '검수',
  published: '발행',
  discarded: '폐기',
  rejected: '반려',
  all: '전체',
};
const ACTION_LABELS = {
  approve: '승인',
  reject: '반려',
  update: '저장',
};

function safeJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return '{}';
  }
}

function fmtKST(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function Notice({ tone = 'neutral', title, children, action }) {
  const tones = {
    neutral: { bg: '#0f1118', color: '#cbd3e8', border: '#273044' },
    good: { bg: '#071f16', color: '#7ce0b3', border: '#155b3c' },
    warn: { bg: '#2b2108', color: '#ffd166', border: '#665017' },
    bad: { bg: '#2a1115', color: '#ffb0b0', border: '#69303b' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <div className="w-full max-w-full overflow-hidden rounded-md px-4 py-3 text-sm" style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-all" style={{ overflowWrap: 'anywhere' }}>
          {title && <div className="font-black text-white">{title}</div>}
          {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#171923', color: '#a8b0c7', border: '#2a3040' },
    good: { bg: '#052e1a', color: '#48d99a', border: '#0f5b36' },
    warn: { bg: '#332400', color: '#ffd166', border: '#5a4100' },
    bad: { bg: '#351111', color: '#ff8f8f', border: '#5c2424' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span className="inline-flex min-w-0 items-center rounded px-2 py-1 text-xs font-bold"
      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      {children}
    </span>
  );
}

function statusTone(status) {
  if (status === 'published') return 'good';
  if (status === 'review') return 'warn';
  if (status === 'rejected') return 'bad';
  return 'neutral';
}

function briefingTone(status) {
  if (status === 'OFFICIAL' || status === 'CONFIRMED') return 'good';
  if (status === 'RUMOUR' || status === 'UPDATE') return 'warn';
  if (status === 'DENIED') return 'bad';
  return 'neutral';
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

function normalizeBriefingStatus(status, newsType) {
  const value = String(status || newsType || '').trim().toUpperCase();
  if (BRIEFING_STATUS_OPTIONS.includes(value)) return value;
  if (value === 'OFFICIAL') return 'OFFICIAL';
  if (value === 'RUMOUR' || value === 'RUMOR') return 'RUMOUR';
  return 'UPDATE';
}

function Metric({ label, value, warn }) {
  return (
    <div className="min-h-[74px] min-w-0 rounded-md px-4 py-3"
      style={{ background: warn ? '#2b2108' : '#0f1118', border: `1px solid ${warn ? '#665017' : '#1f2430'}` }}>
      <div className="text-xs font-semibold uppercase" style={{ color: warn ? '#ffd166' : '#687086' }}>{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color: warn ? '#ffd166' : '#fff' }}>{value ?? 0}</div>
    </div>
  );
}

function EmptyState({ status }) {
  const label = STATUS_LABELS[status] || status;
  return (
    <div className="min-w-0 rounded-md p-8 text-center" style={{ background: '#0b0d14', border: '1px solid #202635', color: '#8791aa' }}>
      <div className="text-lg font-black text-white">{label} 항목이 없습니다</div>
      <p className="mt-2 text-sm">필터를 바꾸거나 수동 수집을 실행하면 새 항목을 확인할 수 있습니다.</p>
    </div>
  );
}

function SkeletonLine({ className = '' }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{ background: 'linear-gradient(90deg, #11141d 0%, #1a2030 48%, #11141d 100%)' }}
    />
  );
}

function ItemSkeleton() {
  return (
    <div className="min-h-[430px] min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonLine className="h-7 w-16" />
        <SkeletonLine className="h-7 w-20" />
        <SkeletonLine className="h-7 w-14" />
        <SkeletonLine className="ml-auto h-4 w-24" />
      </div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0 space-y-3">
          <SkeletonLine className="h-4 w-2/5" />
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-11/12" />
          <SkeletonLine className="h-4 w-4/5" />
          <SkeletonLine className="mt-5 h-16 w-full" />
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
        <div className="min-w-0 space-y-3">
          <SkeletonLine className="h-10 w-full" />
          <SkeletonLine className="h-24 w-full" />
          <SkeletonLine className="h-36 w-full" />
          <SkeletonLine className="h-10 w-full" />
          <div className="flex gap-2">
            <SkeletonLine className="h-10 w-16" />
            <SkeletonLine className="h-10 w-16" />
            <SkeletonLine className="h-10 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceSkeleton() {
  return (
    <div className="min-w-0 rounded p-3" style={{ background: '#10131b', border: '1px solid #252c3a' }}>
      <div className="flex items-center gap-2">
        <SkeletonLine className="h-4 w-28" />
        <SkeletonLine className="h-6 w-10" />
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine className="h-3 w-4/5" />
        <SkeletonLine className="h-3 w-3/5" />
      </div>
    </div>
  );
}

function ItemEditor({ item, draft, onDraft, onAction, onDebate, busy, isNew }) {
  const briefing = briefingFor(item);
  const title = draft.title_ko ?? briefing.title ?? '';
  const summaryShort = draft.summary_short_ko ?? briefing.summary_short ?? '';
  const summaryDetail = draft.summary_detail_ko ?? briefing.summary_detail ?? item.raw_text ?? '';
  const briefingStatus = draft.briefing_status ?? normalizeBriefingStatus(briefing.status, item.news_type);
  const teamTags = draft.team_tags ?? (Array.isArray(briefing.tags) && briefing.tags.length > 0 ? briefing.tags : []);
  const evidence = item.ai_result?.evidence || [];
  const reason = item.review_reason || item.ai_result?.review_reason;
  const reviewNote = draft.review_note ?? item.review_note ?? '';

  return (
    <div className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        <Badge tone={briefingTone(briefingStatus)}>{briefingStatus || item.news_type}</Badge>
        {teamTags.map(team => <Badge key={team}>{team}</Badge>)}
        {item.debate_question && <Badge tone="warn">DEBATE</Badge>}
        {isNew && (
          <span className="rounded px-1.5 py-0.5 text-xs font-black leading-none"
            style={{ background: '#0e2d1a', color: '#34d399' }}>
            NEW
          </span>
        )}
        <span className="ml-auto text-xs" style={{ color: '#737b91' }}>
          confidence {Number(item.confidence || 0).toFixed(2)}
        </span>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <a className="text-sm font-bold text-white underline decoration-slate-600 underline-offset-4"
              href={item.raw_url}
              target="_blank"
              rel="noreferrer">
              @{item.raw_author_handle || 'source'}
            </a>
            {item.raw_created_at && (
              <span className="text-xs" style={{ color: '#737b91' }}>
                {fmtKST(item.raw_created_at)} KST
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" style={{ color: '#cbd3e8', overflowWrap: 'anywhere' }}>
            {item.raw_text}
          </p>
          {reason && (
            <p className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: '#241d08', color: '#ffd166' }}>
              {reason}
            </p>
          )}
          {evidence.length > 0 && (
            <div className="mt-3 space-y-1">
              {evidence.map((line, index) => (
                <p key={index} className="break-words text-xs" style={{ color: '#8791aa', overflowWrap: 'anywhere' }}>{line}</p>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>한국어 제목</span>
            <input
              value={title}
              onChange={event => onDraft(item.id, { title_ko: event.target.value })}
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>짧은 요약</span>
            <textarea
              value={summaryShort}
              onChange={event => onDraft(item.id, { summary_short_ko: event.target.value })}
              rows={3}
              className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>상세 요약</span>
            <textarea
              value={summaryDetail}
              onChange={event => onDraft(item.id, { summary_detail_ko: event.target.value })}
              rows={5}
              className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>브리핑 상태</span>
            <select
              value={briefingStatus}
              onChange={event => onDraft(item.id, { briefing_status: event.target.value })}
              className="w-full rounded-md px-3 py-2 text-sm font-bold outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            >
              {BRIEFING_STATUS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>팀 태그</span>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_OPTIONS.map(team => {
                const active = teamTags.includes(team);
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? teamTags.filter(t => t !== team)
                        : [...teamTags, team];
                      onDraft(item.id, { team_tags: next });
                    }}
                    className="rounded px-2.5 py-1 text-xs font-black"
                    style={{
                      background: active ? '#1e3a5f' : '#11141d',
                      color: active ? '#60a5fa' : '#4a5568',
                      border: active ? '1px solid #3b82f6' : '1px solid #283040',
                    }}>
                    {team}
                  </button>
                );
              })}
            </div>
          </div>
          <details className="rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }}>
            <summary className="cursor-pointer text-xs font-bold" style={{ color: '#8791aa' }}>AI JSON</summary>
            <pre className="mt-2 max-h-48 max-w-full overflow-auto text-xs" style={{ color: '#a8b0c7' }}>{safeJson(item.ai_result)}</pre>
          </details>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>반려 메모</span>
            <textarea
              value={reviewNote}
              placeholder="반려할 때는 메모가 필요합니다."
              onChange={event => onDraft(item.id, { review_note: event.target.value })}
              rows={2}
              className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => onAction(item, 'approve')}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#21c17a', color: '#03130c' }}>
              승인
            </button>
            <button
              disabled={busy}
              onClick={() => onAction(item, 'reject')}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#351111', color: '#ffb0b0', border: '1px solid #5c2424' }}>
              반려
            </button>
            <button
              disabled={busy}
              onClick={() => onAction(item, 'update')}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
              저장
            </button>
            <button
              disabled={busy}
              onClick={() => onDebate(item)}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#332400', color: '#fbbf24', border: '1px solid #665017' }}>
              {item.debate_question ? '논쟁 편집' : '논쟁 설정'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DebateModal({ item, onClose, onSave, busy }) {
  const isSet = Boolean(item.debate_question);
  const [question, setQuestion] = useState(item.debate_question || '');
  const [forLabel, setForLabel] = useState(item.vote_for_label || '');
  const [againstLabel, setAgainstLabel] = useState(item.vote_against_label || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg min-w-0 rounded-xl p-6" style={{ background: '#0f1118', border: '1px solid #2a3040' }}>
        <div className="mb-4 text-lg font-black text-white">논쟁 설정</div>
        <div className="mb-3 rounded-md px-3 py-2 text-sm" style={{ background: '#11141d', color: '#8791aa', border: '1px solid #283040' }}>
          {item.title_ko || item.raw_text?.slice(0, 60) || '(제목 없음)'}
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>논쟁 질문 *</span>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="예: 이번 시즌 EPL 최고의 미드필더는?"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
        </label>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>선택지 A *</span>
            <input value={forLabel} onChange={e => setForLabel(e.target.value)}
              placeholder="예: 브루노 페르난데스"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>선택지 B *</span>
            <input value={againstLabel} onChange={e => setAgainstLabel(e.target.value)}
              placeholder="예: 데클란 라이스"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
          </label>
        </div>
        <div className="flex justify-between gap-2">
          {isSet && (
            <button disabled={busy}
              onClick={() => onSave({ debate_question: null, vote_for_label: null, vote_against_label: null })}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#351111', color: '#ffb0b0', border: '1px solid #5c2424' }}>
              논쟁 해제
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-bold"
              style={{ background: '#171923', color: '#a8b0c7', border: '1px solid #2a3040' }}>
              취소
            </button>
            <button disabled={busy || !question.trim() || !forLabel.trim() || !againstLabel.trim()}
              onClick={() => onSave({ debate_question: question.trim(), vote_for_label: forLabel.trim(), vote_against_label: againstLabel.trim() })}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#fbbf24', color: '#1a0e00' }}>
              논쟁으로 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('epl_admin_token') || '');
  const [cronSecret, setCronSecret] = useState(() => localStorage.getItem('epl_cron_secret') || '');
  const [status, setStatus] = useState('review');
  const [items, setItems] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('neutral');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [debateModal, setDebateModal] = useState(null);
  const [newIds, setNewIds] = useState(new Set());
  const isInitialLoading = Boolean(adminToken && busy && !loaded && !error);

  useEffect(() => {
    const reviewCount = dashboard?.review || 0;
    document.title = reviewCount > 0 ? `(${reviewCount}) Admin dashboard` : 'Admin dashboard';
    return () => { document.title = 'Admin dashboard'; };
  }, [dashboard?.review]);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  }), [adminToken]);

  const loadItems = async (options = {}) => {
    const preserveMessage = options?.preserveMessage === true;
    const clearNew = options?.clearNew !== false;
    if (!adminToken) {
      setItems([]);
      setDashboard(null);
      setLoaded(false);
      setError('');
      return [];
    }
    setBusy(true);
    if (!preserveMessage) setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/items?status=${status}&limit=100`, { headers });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Failed to load admin items');
      const loaded_items = data.items || [];
      setItems(loaded_items);
      setDashboard(data.dashboard || null);
      setLoaded(true);
      if (clearNew) setNewIds(new Set());
      localStorage.setItem('epl_admin_token', adminToken);
      return loaded_items;
    } catch (error) {
      setError(error.message);
      setLoaded(false);
      return [];
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const updateDraft = (id, patch) => {
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };

  const reviewAction = async (item, action) => {
    const draft = drafts[item.id] || {};
    if (action === 'reject' && !String(draft.review_note ?? item.review_note ?? '').trim()) {
      setMessageTone('warn');
      setMessage('반려하려면 반려 메모를 입력해 주세요.');
      return;
    }

    setBusy(true);
    setMessage('');
    setError('');
    const briefing = briefingFor(item);
    const teamTags = draft.team_tags ?? (Array.isArray(briefing.tags) ? briefing.tags : (item.team_tags || []));
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: item.id,
          action,
          title_ko: draft.title_ko ?? briefing.title ?? item.title_ko,
          summary_short_ko: draft.summary_short_ko ?? briefing.summary_short,
          summary_detail_ko: draft.summary_detail_ko ?? briefing.summary_detail,
          team_tags: teamTags,
          briefing_status: draft.briefing_status ?? normalizeBriefingStatus(briefing.status, item.news_type),
          review_note: draft.review_note ?? item.review_note ?? '',
          actor: 'admin-ui',
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `Failed to ${action}`);
      const updatedItem = data.item;
      if (updatedItem?.id) {
        setItems(prev => {
          if (status !== 'all' && updatedItem.status !== status) {
            return prev.filter(row => row.id !== updatedItem.id);
          }
          return prev.map(row => (row.id === updatedItem.id ? updatedItem : row));
        });
      }
      setDrafts(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      await loadItems({ preserveMessage: true });
      setMessageTone('good');
      setMessage(`${ACTION_LABELS[action] || action} 완료`);
    } catch (error) {
      setMessageTone('bad');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const debateAction = async (item, debateData) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/debate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: item.id, actor: 'admin-ui', ...debateData }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Failed to update debate');
      const updatedItem = data.item;
      if (updatedItem?.id) {
        setItems(prev => prev.map(row => row.id === updatedItem.id ? updatedItem : row));
      }
      setDebateModal(null);
      setMessageTone('good');
      setMessage(debateData.debate_question ? '논쟁으로 설정됐습니다.' : '논쟁이 해제됐습니다.');
    } catch (error) {
      setMessageTone('bad');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const runCollection = async () => {
    if (!cronSecret) {
      setMessageTone('warn');
      setMessage('수동 수집에는 CRON_SECRET이 필요합니다.');
      return;
    }
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const prevIds = new Set(items.map(i => i.id));
      const response = await fetch('/api/collect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Collection failed');
      localStorage.setItem('epl_cron_secret', cronSecret);
      const newItems = await loadItems({ preserveMessage: true, clearNew: false });
      const freshIds = new Set(newItems.filter(i => !prevIds.has(i.id)).map(i => i.id));
      setNewIds(freshIds);
      setMessageTone('good');
      setMessage(`수집 완료: 신규 ${data.summary?.inserted || 0}, 검수 ${data.summary?.review || 0}`);
    } catch (error) {
      setMessageTone('bad');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#05070d', color: '#fff' }}>
      {debateModal && (
        <DebateModal
          item={debateModal}
          busy={busy}
          onClose={() => setDebateModal(null)}
          onSave={data => debateAction(debateModal, data)}
        />
      )}
      <div className="mx-auto w-full max-w-7xl px-5 py-6" style={{ maxWidth: '100vw' }}>
        <header className="flex min-w-0 flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end"
          style={{ borderColor: '#1c2230' }}>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>EPL X Automation</div>
            <h1 className="mt-1 break-words text-3xl font-black">Admin dashboard</h1>
          </div>
          <div className="grid w-full min-w-0 gap-2 md:grid-cols-2 lg:w-[560px]">
            <input
              type="password"
              value={adminToken}
              onChange={event => setAdminToken(event.target.value)}
              placeholder="ADMIN_TOKEN"
              className="rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
            <input
              type="password"
              value={cronSecret}
              onChange={event => setCronSecret(event.target.value)}
              placeholder="CRON_SECRET"
              className="rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadItems} disabled={busy || !adminToken}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#e8edf7', color: '#05070d' }}>
              Refresh
            </button>
            <button onClick={runCollection} disabled={busy || !cronSecret}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#2557ff', color: '#fff' }}>
              Run collection
            </button>
          </div>
        </header>

        <div className="mt-4 min-h-[66px]" aria-live="polite">
          {!adminToken && (
            <Notice tone="warn" title="ADMIN_TOKEN을 입력해 주세요">
              관리자 데이터를 불러오려면 Vercel 환경변수에 등록한 토큰이 필요합니다.
            </Notice>
          )}

          {adminToken && error && (
            <Notice
              tone="bad"
              title="관리자 데이터를 불러오지 못했습니다"
              action={adminToken ? (
                <button onClick={loadItems} disabled={busy}
                  className="rounded-md px-3 py-2 text-sm font-bold disabled:opacity-50"
                  style={{ background: '#ffb0b0', color: '#2a1115' }}>
                  다시 시도
                </button>
              ) : null}>
              {error}
            </Notice>
          )}

          {adminToken && !error && message && (
            <Notice tone={messageTone}>{message}</Notice>
          )}
        </div>

        <section className="mt-5 grid min-w-0 gap-3 md:grid-cols-5">
          <Metric label="Total loaded" value={dashboard?.total} />
          <Metric label="Published" value={dashboard?.published} />
          <Metric label="Review" value={dashboard?.review} warn={(dashboard?.review || 0) > 0} />
          <Metric label="Discarded" value={dashboard?.discarded} />
          <Metric label="Rejected" value={dashboard?.rejected} />
        </section>

        <section className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map(option => {
                const countMap = { review: dashboard?.review, published: dashboard?.published, discarded: dashboard?.discarded, rejected: dashboard?.rejected, all: dashboard?.total };
                const count = countMap[option] || 0;
                const isActive = status === option;
                const isWarn = option === 'review' && count > 0;
                const newCount = [...newIds].filter(id => {
                  const it = items.find(i => i.id === id);
                  if (!it) return false;
                  return option === 'all' || it.status === option;
                }).length;
                return (
                  <button key={option}
                    onClick={() => { setStatus(option); setNewIds(new Set()); }}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold"
                    style={{
                      background: isActive ? '#e8edf7' : '#11141d',
                      color: isActive ? '#05070d' : '#a8b0c7',
                      border: isActive ? '1px solid #283040' : isWarn ? '1px solid #665017' : '1px solid #283040',
                    }}>
                    {STATUS_LABELS[option]}
                    {count > 0 && (
                      <span className="rounded px-1.5 py-0.5 text-xs font-black leading-none"
                        style={{
                          background: isActive ? '#05070d' : isWarn ? '#665017' : '#283040',
                          color: isActive ? '#e8edf7' : isWarn ? '#ffd166' : '#a8b0c7',
                        }}>
                        {count}
                      </span>
                    )}
                    {newCount > 0 && (
                      <span className="rounded px-1.5 py-0.5 text-xs font-black leading-none"
                        style={{ background: '#0e2d1a', color: '#34d399' }}>
                        +{newCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              {isInitialLoading ? (
                <>
                  <ItemSkeleton />
                  <ItemSkeleton />
                </>
              ) : loaded && items.length === 0 ? (
                <EmptyState status={status} />
              ) : !loaded && adminToken && !error ? (
                <div className="min-w-0 rounded-md p-8 text-center" style={{ background: '#0b0d14', border: '1px solid #202635', color: '#8791aa' }}>
                  Refresh를 눌러 큐를 불러오세요.
                </div>
              ) : items.map(item => (
                <ItemEditor
                  key={item.id}
                  item={item}
                  draft={drafts[item.id] || {}}
                  onDraft={updateDraft}
                  onAction={reviewAction}
                  onDebate={item => setDebateModal(item)}
                  busy={busy}
                  isNew={newIds.has(item.id)}
                />
              ))}
            </div>
          </div>

          <aside className="min-w-0 space-y-3">
            <div className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
              <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Last collected</div>
              <div className="mt-1 min-h-[20px] text-sm text-white">{isInitialLoading ? '-' : (dashboard?.lastCollectedAt || '-')}</div>
            </div>
            <div className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
              <div className="mb-3 text-xs font-bold uppercase" style={{ color: '#687086' }}>Sources</div>
              <div className="min-h-[184px] space-y-2">
                {isInitialLoading ? (
                  <>
                    <SourceSkeleton />
                    <SourceSkeleton />
                  </>
                ) : (dashboard?.sources || []).map(source => (
                  <div key={source.id} className="min-w-0 rounded p-3" style={{ background: '#10131b', border: '1px solid #252c3a' }}>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 break-words font-bold" style={{ overflowWrap: 'anywhere' }}>@{source.handle}</span>
                      <Badge>{`T${source.tier}`}</Badge>
                      {!source.active && <Badge tone="bad">off</Badge>}
                    </div>
                    <div className="mt-2 text-xs leading-5" style={{ color: '#8791aa' }}>
                      <div>last: {source.last_checked_at || '-'}</div>
                      <div>seen: {source.last_seen_post_id || '-'}</div>
                      {source.last_error && <div style={{ color: '#ff8f8f' }}>{source.last_error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
