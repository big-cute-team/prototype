import { useEffect, useMemo, useRef, useState } from 'react';

const CARD_NEWS_TAB = 'card_news_workspace';
const STATUS_OPTIONS = ['review', 'published', 'discarded', 'rejected', 'all'];
const ADMIN_TAB_OPTIONS = [...STATUS_OPTIONS, CARD_NEWS_TAB];
const BRIEFING_STATUS_OPTIONS = ['OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED'];
const TEAM_OPTIONS = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];
const DEFAULT_SUBJECT_COLOR = '#FFFFFF';
const TEAM_SUBJECT_COLORS = {
  ARS: '#EF0107',
  CHE: '#001489',
  LIV: '#FB0009',
  MCI: '#6CADDF',
  MUN: '#FE0000',
  TOT: '#FFFFFF',
};
const CARD_PREVIEW_WIDTH = 1080;
const CARD_PREVIEW_HEIGHT = 1350;
const CARD_PREVIEW_MAX_WIDTH = 360;
const CARD_DETAIL_TEXT_WIDTH = 960;
const CARD_DETAIL_TEXT_HEIGHT = 600;
const CARD_DETAIL_FONT_SIZE = 40;
const CARD_DETAIL_LINE_HEIGHT = 60;
const CARD_DETAIL_EDITOR_MAX_WIDTH = CARD_DETAIL_TEXT_WIDTH * (CARD_PREVIEW_MAX_WIDTH / CARD_PREVIEW_WIDTH);
const CARD_WORKSPACE_TEXTAREA_HEIGHT = 300;
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

function firstMediaUrl(media) {
  if (!Array.isArray(media)) return '';
  const first = media.find(item => item?.url || item?.preview_image_url);
  return first?.url || first?.preview_image_url || '';
}

function normalizeSubjectColor(value, fallback = DEFAULT_SUBJECT_COLOR) {
  const clean = String(value || fallback || DEFAULT_SUBJECT_COLOR).trim();
  return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean.toUpperCase() : fallback;
}

function teamTagsForItem(item) {
  if (!item) return [];
  const briefing = briefingFor(item);
  const aiTags = item.ai_result?.briefing?.tags;
  const rawTags = Array.isArray(item.team_tags) && item.team_tags.length > 0
    ? item.team_tags
    : Array.isArray(briefing.tags) && briefing.tags.length > 0
      ? briefing.tags
      : Array.isArray(aiTags)
        ? aiTags
      : [];
  return rawTags
    .map(tag => String(tag || '').trim().toUpperCase())
    .filter(tag => TEAM_OPTIONS.includes(tag));
}

function defaultSubjectColorForItem(item) {
  const tags = teamTagsForItem(item);
  if (tags.length !== 1) return DEFAULT_SUBJECT_COLOR;
  return TEAM_SUBJECT_COLORS[tags[0]] || DEFAULT_SUBJECT_COLOR;
}

function normalizeBriefingStatus(status, newsType) {
  const value = String(status || newsType || '').trim().toUpperCase();
  if (BRIEFING_STATUS_OPTIONS.includes(value)) return value;
  if (value === 'OFFICIAL') return 'OFFICIAL';
  if (value === 'RUMOUR' || value === 'RUMOR') return 'RUMOUR';
  return 'UPDATE';
}

function compactText(value, max, fallback = '') {
  const clean = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function isGeneratedSubjectFallback(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return !normalized || TEAM_OPTIONS.includes(normalized) || ['EPL', 'UPDATE', 'OFFICIAL', 'CONFIRMED', 'RUMOUR', 'RUMOR', 'DENIED', 'UNKNOWN'].includes(normalized);
}

function splitCardTitle(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { subject: '', headline: 'EPL 업데이트' };

  const commaMatch = clean.match(/^(.{1,30}?)[,，:：]\s*(.+)$/);
  if (commaMatch) {
    const subject = commaMatch[1].trim();
    const headline = commaMatch[2].trim();
    if (headline && !isGeneratedSubjectFallback(subject)) {
      return { subject, headline };
    }
  }

  const dashMatch = clean.match(/^(.{1,30}?)\s[-–—]\s(.+)$/);
  if (dashMatch) {
    const subject = dashMatch[1].trim();
    const headline = dashMatch[2].trim();
    if (headline && !isGeneratedSubjectFallback(subject)) {
      return { subject, headline };
    }
  }

  return { subject: '', headline: clean };
}

function normalizeParagraphText(value) {
  const clean = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!clean) return '';

  const blocks = clean
    .split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => line.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);

  return blocks.join('\n\n');
}

function splitSentences(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const matches = clean.match(/[^.!?。！？]+(?:[.!?。！？]+|$)/g) || [clean];
  return matches.map(sentence => sentence.trim()).filter(Boolean);
}

function joinDefaultParagraphs(paragraphs) {
  const cleanParagraphs = paragraphs
    .map(paragraph => String(paragraph || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (cleanParagraphs.length <= 4) return cleanParagraphs.join('\n\n');
  return [
    ...cleanParagraphs.slice(0, 3),
    cleanParagraphs.slice(3).join(' '),
  ].join('\n\n');
}

function detailParagraphsFor(value) {
  const clean = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!clean) return '발행된 기사 내용을 바탕으로 카드뉴스 본문을 입력하세요.';

  const normalized = normalizeParagraphText(clean);
  const existingParagraphs = normalized.split('\n\n').filter(Boolean);
  if (existingParagraphs.length > 1) return joinDefaultParagraphs(existingParagraphs);

  const lineParagraphs = clean
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (lineParagraphs.length > 1) return joinDefaultParagraphs(lineParagraphs);

  const sentences = splitSentences(clean);
  return sentences.length > 1 ? joinDefaultParagraphs(sentences) : normalized;
}

function cardNewsDefaultFor(item) {
  const briefing = briefingFor(item);
  const titleParts = splitCardTitle(briefing.title || item.raw_text);
  const source = String(item.raw_author_name || item.raw_author_handle || 'source').replace(/^@/, '').trim() || 'source';

  return {
    cover: {
      subject: compactText(titleParts.subject, 30),
      subject_color: defaultSubjectColorForItem(item),
      headline: compactText(titleParts.headline, 60, 'EPL 업데이트'),
      summary: compactText(briefing.summary_short || item.raw_text, 140, '발행된 EPL 기사입니다.'),
    },
    detail: {
      paragraphs: detailParagraphsFor(briefing.summary_detail || briefing.summary_short || item.raw_text),
      source: compactText(source, 120, 'source'),
    },
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
  const value = String(text || '');
  if (!value.trim()) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  return ok;
}

function formatDuration(startedAt, now = Date.now()) {
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function ItemEditor({ item, draft, onDraft, onAction, onDebate, onRegenerate, onCardNews, busy, isNew }) {
  const briefing = briefingFor(item);
  const title = draft.title_ko ?? briefing.title ?? '';
  const summaryShort = draft.summary_short_ko ?? briefing.summary_short ?? '';
  const summaryDetail = draft.summary_detail_ko ?? briefing.summary_detail ?? item.raw_text ?? '';
  const briefingStatus = draft.briefing_status ?? normalizeBriefingStatus(briefing.status, item.news_type);
  const teamTags = draft.team_tags ?? (Array.isArray(briefing.tags) && briefing.tags.length > 0 ? briefing.tags : []);
  const evidence = item.ai_result?.evidence || [];
  const reason = item.review_reason || item.ai_result?.review_reason;
  const reviewNote = draft.review_note ?? item.review_note ?? '';
  const regenNote = draft.regen_note ?? '';

  return (
    <div className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        <Badge tone={briefingTone(briefingStatus)}>{briefingStatus || item.news_type}</Badge>
        {teamTags.map(team => <Badge key={team}>{team}</Badge>)}
        {item.debate_question && <Badge tone="warn">DEBATE</Badge>}
        {item.specialist_match && (
          <span className="rounded px-1.5 py-0.5 text-xs font-black leading-none"
            style={{ background: '#2a1f00', color: '#f4a100' }}>
            ★ 전문기자
          </span>
        )}
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
          <div>
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>추가 의견 (재생성)</span>
            <div className="flex gap-2">
              <textarea
                value={regenNote}
                onChange={event => onDraft(item.id, { regen_note: event.target.value })}
                rows={2}
                placeholder="예: 바이에른 이적 유력, 이적료 4500만 유로. 공식 발표 아님."
                className="min-w-0 flex-1 rounded-md px-3 py-2 text-sm leading-6 outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
              />
              <button
                disabled={busy || !regenNote.trim()}
                onClick={() => onRegenerate(item, regenNote)}
                className="shrink-0 self-end rounded-md px-3 py-2 text-sm font-bold disabled:opacity-50"
                style={{ background: '#2557ff', color: '#fff' }}>
                재생성
              </button>
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
            {item.status === 'published' && (
              <button
                disabled={busy}
                onClick={() => onCardNews(item)}
                className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
                style={{ background: '#0f2d46', color: '#7dd3fc', border: '1px solid #1d4f72' }}>
                카드뉴스
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardNewsModal({ item, headers, onClose, onNotify }) {
  const [cardJson, setCardJson] = useState(() => JSON.stringify(cardNewsDefaultFor(item), null, 2));
  const [imageUrl, setImageUrl] = useState(firstMediaUrl(item.media));
  const [imageFile, setImageFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [localMessage, setLocalMessage] = useState('');
  const [localTone, setLocalTone] = useState('neutral');

  const setNotice = (tone, text) => {
    setLocalTone(tone);
    setLocalMessage(text);
    onNotify?.(tone, text);
  };

  const generateDraft = async () => {
    setBusy(true);
    setLocalMessage('');
    try {
      const response = await fetch('/api/admin/card-news-draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: item.id, actor: 'admin-ui' }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || '카드뉴스 초안 생성에 실패했습니다.');
      setCardJson(JSON.stringify(data.card, null, 2));
      setNotice('good', '카드뉴스 초안이 생성됐습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  const renderCardNews = async () => {
    let card;
    try {
      card = JSON.parse(cardJson);
    } catch {
      setNotice('bad', '카드뉴스 JSON 형식이 올바르지 않습니다.');
      return;
    }

    if (!imageFile && !imageUrl.trim()) {
      setNotice('warn', '이미지 파일 또는 이미지 URL이 필요합니다.');
      return;
    }

    setBusy(true);
    setLocalMessage('');
    try {
      const body = {
        id: item.id,
        actor: 'admin-ui',
        card,
      };

      if (imageFile) {
        body.image_data_url = await fileToDataUrl(imageFile);
        body.image_name = imageFile.name;
      } else {
        body.image_url = imageUrl.trim();
      }

      const response = await fetch('/api/admin/card-news-render', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await readJsonResponse(response);
        throw new Error(data.error || '카드뉴스 렌더링에 실패했습니다.');
      }

      const blob = await response.blob();
      downloadBlob(blob, `cardnews-${item.raw_post_id || item.id}.zip`);
      setNotice('good', '카드뉴스 ZIP이 생성됐습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="grid max-h-[92vh] w-full max-w-5xl min-w-0 gap-4 overflow-auto rounded-xl p-5 lg:grid-cols-[minmax(0,1fr)_320px]"
        style={{ background: '#0f1118', border: '1px solid #2a3040' }}>
        <div className="min-w-0">
          <div className="mb-3 flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Card news</div>
              <div className="mt-1 break-words text-lg font-black text-white">
                {item.title_ko || item.raw_text?.slice(0, 80) || '발행 기사'}
              </div>
            </div>
            <button onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-bold"
              style={{ background: '#171923', color: '#a8b0c7', border: '1px solid #2a3040' }}>
              닫기
            </button>
          </div>

          {localMessage && (
            <div className="mb-3">
              <Notice tone={localTone}>{localMessage}</Notice>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>카드뉴스 JSON</span>
            <textarea
              value={cardJson}
              onChange={event => setCardJson(event.target.value)}
              rows={20}
              className="w-full rounded-md px-3 py-2 font-mono text-xs leading-5 outline-none"
              style={{ background: '#080a10', color: '#d6deef', border: '1px solid #283040' }}
              spellCheck={false}
            />
          </label>
        </div>

        <aside className="min-w-0 space-y-3">
          <div className="rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }}>
            <div className="mb-2 text-xs font-bold uppercase" style={{ color: '#687086' }}>이미지 URL</div>
            <input
              value={imageUrl}
              onChange={event => setImageUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
            />
          </div>

          <div className="rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }}>
            <div className="mb-2 text-xs font-bold uppercase" style={{ color: '#687086' }}>이미지 업로드</div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={event => setImageFile(event.target.files?.[0] || null)}
              className="block w-full text-sm"
              style={{ color: '#a8b0c7' }}
            />
            {imageFile && (
              <div className="mt-2 break-words text-xs" style={{ color: '#8791aa', overflowWrap: 'anywhere' }}>
                {imageFile.name} · {(imageFile.size / 1024 / 1024).toFixed(2)}MB
              </div>
            )}
          </div>

          <button
            disabled={busy}
            onClick={generateDraft}
            className="w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-50"
            style={{ background: '#2557ff', color: '#fff' }}>
            초안 생성
          </button>
          <button
            disabled={busy}
            onClick={renderCardNews}
            className="w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-50"
            style={{ background: '#21c17a', color: '#03130c' }}>
            ZIP 생성
          </button>
        </aside>
      </div>
    </div>
  );
}

const EMPTY_CARD_FIELDS = {
  subject: '',
  subject_color: DEFAULT_SUBJECT_COLOR,
  headline: '',
  summary: '',
  paragraphs: '',
  source: '',
};

function fieldsFromCard(card, fallbackSubjectColor = DEFAULT_SUBJECT_COLOR) {
  return {
    subject: card?.cover?.subject || '',
    subject_color: normalizeSubjectColor(card?.cover?.subject_color, fallbackSubjectColor),
    headline: card?.cover?.headline || '',
    summary: card?.cover?.summary || '',
    paragraphs: card?.detail?.paragraphs || '',
    source: card?.detail?.source || '',
  };
}

function cardFromFields(fields) {
  return {
    cover: {
      subject: String(fields.subject || '').trim(),
      subject_color: normalizeSubjectColor(fields.subject_color),
      headline: String(fields.headline || '').trim(),
      summary: String(fields.summary || '').trim(),
    },
    detail: {
      paragraphs: normalizeParagraphText(fields.paragraphs),
      source: String(fields.source || '').replace(/^@+/, '').trim(),
    },
  };
}

function captionTitleForFields(fields) {
  const subject = String(fields.subject || '').replace(/\s+/g, ' ').trim();
  const headline = String(fields.headline || '').replace(/\s+/g, ' ').trim();
  return [subject, headline].filter(Boolean).join(' ').trim() || 'EPL 소식';
}

function captionDraftFromFields(fields, hashtags) {
  return {
    title: captionTitleForFields(fields),
    paragraphs: normalizeParagraphText(fields.paragraphs),
    hashtags: String(hashtags || '').replace(/\s+/g, ' ').trim(),
    credit: '📸AI',
  };
}

function formatInstagramCaptionDraft(draft) {
  const title = String(draft?.title || '').trim();
  const titleLine = title ? `🚨${title}` : '';
  return [
    titleLine,
    String(draft?.paragraphs || '').trim(),
    String(draft?.hashtags || '').trim(),
    String(draft?.credit || '').trim(),
  ].filter(Boolean).join('\n\n');
}

function CardPreviewPage({ type, fields, imageSource }) {
  const wrapperRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(360);
  const isCover = type === 'cover';
  const scale = previewWidth / CARD_PREVIEW_WIDTH;
  const subjectColor = normalizeSubjectColor(fields.subject_color);
  const cleanSubject = String(fields.subject || '').trim();
  let cleanHeadline = String(fields.headline || '카드뉴스 제목을 입력하세요').replace(/\s+/g, ' ').trim();
  if (cleanSubject && cleanHeadline.startsWith(cleanSubject)) {
    cleanHeadline = cleanHeadline.slice(cleanSubject.length).replace(/^[\s,]+/, '').trim();
  }
  const coverSummary = String(fields.summary || '요약을 입력하면 커버 하단에 표시됩니다.').replace(/\s+/g, ' ').trim();
  const detailText = normalizeParagraphText(fields.paragraphs) || '본문 문단을 입력하면 상세 카드에 표시됩니다.';
  const sourceText = String(fields.source || 'source').replace(/^@+/, '').trim() || 'source';

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;

    const updateWidth = width => {
      if (width > 0) setPreviewWidth(width);
    };

    updateWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => updateWidth(node.getBoundingClientRect().width);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect?.width;
      updateWidth(nextWidth || node.getBoundingClientRect().width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase" style={{ color: '#687086' }}>
        <span>{isCover ? 'Page 1' : 'Page 2'}</span>
        <span>{isCover ? 'cover' : 'detail'}</span>
      </div>
      <div
        ref={wrapperRef}
        className="relative mx-auto w-full overflow-hidden rounded-md"
        style={{
          maxWidth: CARD_PREVIEW_MAX_WIDTH,
          aspectRatio: '4 / 5',
          background: '#05070d',
          border: '1px solid #2a3040',
          boxShadow: '0 18px 50px rgba(0,0,0,0.34)',
        }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: CARD_PREVIEW_WIDTH,
            height: CARD_PREVIEW_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
            color: '#fff',
            fontFamily: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
            background: '#050505',
          }}>
          {imageSource ? (
            <img
              src={imageSource}
              alt=""
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: CARD_PREVIEW_WIDTH,
                height: 1350,
                objectFit: 'cover',
                objectPosition: 'center center',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: CARD_PREVIEW_WIDTH,
                height: 1350,
                background: 'linear-gradient(145deg, #182233, #07101b 56%, #280f16)',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              background: isCover
                ? 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 39.9%, rgba(0,0,0,1) 75.5%, rgba(0,0,0,1) 100%)'
                : 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,1) 100%)',
            }}
          />
          {isCover ? (
            <>
              <h1
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 898,
                  zIndex: 2,
                  width: 960,
                  height: 200,
                  margin: 0,
                  color: '#fff',
                  fontSize: 84,
                  lineHeight: 'normal',
                  fontWeight: 900,
                  letterSpacing: 0,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  overflow: 'hidden',
                }}>
                <span style={{ color: subjectColor }}>{cleanSubject}</span>
                {cleanHeadline && <><br />{cleanHeadline}</>}
              </h1>
              <p
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 1122,
                  zIndex: 2,
                  width: 826,
                  height: 144,
                  margin: 0,
                  color: '#fff',
                  fontSize: 40,
                  lineHeight: 'normal',
                  fontWeight: 500,
                  letterSpacing: 0,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  overflow: 'hidden',
                }}>
                {coverSummary}
              </p>
            </>
          ) : (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 325,
                  zIndex: 2,
                  width: CARD_DETAIL_TEXT_WIDTH,
                  height: CARD_DETAIL_TEXT_HEIGHT,
                  color: '#fff',
                  fontSize: CARD_DETAIL_FONT_SIZE,
                  lineHeight: `${CARD_DETAIL_LINE_HEIGHT}px`,
                  fontWeight: 500,
                  letterSpacing: 0,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                <div
                  style={{
                    width: '100%',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word',
                  }}>
                  {detailText}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 965,
                  zIndex: 2,
                  width: 960,
                  height: 60,
                  margin: 0,
                  color: '#fff',
                  fontSize: 32,
                  lineHeight: '60px',
                  fontWeight: 500,
                  letterSpacing: 0,
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                @{sourceText}
              </div>
            </>
          )}
          <div
            style={{
              position: 'absolute',
              left: 912,
              top: 1268,
              zIndex: 3,
              width: 145,
              height: 60,
              color: '#fff',
              fontFamily: '"Protest Guerrilla", Impact, sans-serif',
              fontSize: 60,
              lineHeight: '60px',
              fontWeight: 400,
              letterSpacing: 0,
              whiteSpace: 'nowrap',
            }}>
            <span style={{ color: isCover ? '#d21404' : '#ec3e41' }}>PL</span>ick
          </div>
        </div>
      </div>
    </div>
  );
}

function CardParagraphEditor({ value, onChange, minHeight = 0 }) {
  const wrapperRef = useRef(null);
  const [editorWidth, setEditorWidth] = useState(CARD_DETAIL_EDITOR_MAX_WIDTH);
  const scale = editorWidth / CARD_DETAIL_TEXT_WIDTH;
  const naturalHeight = CARD_DETAIL_TEXT_HEIGHT * scale;
  const editorHeight = Math.max(naturalHeight, minHeight);
  const textareaHeight = Math.max(CARD_DETAIL_TEXT_HEIGHT, editorHeight / scale);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;

    const updateWidth = width => {
      if (width > 0) setEditorWidth(Math.min(width, CARD_DETAIL_EDITOR_MAX_WIDTH));
    };

    updateWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') {
      const onResize = () => updateWidth(node.getBoundingClientRect().width);
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    const observer = new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect?.width;
      updateWidth(nextWidth || node.getBoundingClientRect().width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto w-full overflow-hidden rounded-md"
      style={{
        maxWidth: CARD_DETAIL_EDITOR_MAX_WIDTH,
        height: editorHeight,
        background: '#11141d',
        border: '1px solid #283040',
      }}>
      <textarea
        value={value}
        onChange={onChange}
        wrap="soft"
        placeholder="상세 카드 본문. 줄바꿈으로 문단을 나눌 수 있습니다."
        className="block outline-none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CARD_DETAIL_TEXT_WIDTH,
          height: textareaHeight,
          padding: 0,
          margin: 0,
          border: 0,
          resize: 'none',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: 'transparent',
          color: '#fff',
          caretColor: '#fff',
          fontFamily: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
          fontSize: CARD_DETAIL_FONT_SIZE,
          lineHeight: `${CARD_DETAIL_LINE_HEIGHT}px`,
          fontWeight: 500,
          letterSpacing: 0,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      />
    </div>
  );
}

function CardNewsPreview({ fields, imageSource }) {
  return (
    <aside className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Live preview</div>
          <div className="mt-1 text-sm font-bold text-white">실시간 카드 미리보기</div>
        </div>
        <Badge tone="warn">4:5</Badge>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-2">
        <CardPreviewPage type="cover" fields={fields} imageSource={imageSource} />
        <CardPreviewPage type="detail" fields={fields} imageSource={imageSource} />
      </div>
    </aside>
  );
}

function CardNewsWorkspace({ headers, adminToken, seedItem, onNotify }) {
  const [publishedItems, setPublishedItems] = useState([]);
  const [selectedId, setSelectedId] = useState(seedItem?.id || '');
  const [fields, setFields] = useState(() => fieldsFromCard(
    seedItem ? cardNewsDefaultFor(seedItem) : { cover: {}, detail: {} },
    seedItem ? defaultSubjectColorForItem(seedItem) : DEFAULT_SUBJECT_COLOR,
  ));
  const [caption, setCaption] = useState('');
  const [captionBusy, setCaptionBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState(seedItem ? firstMediaUrl(seedItem.media) : '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [renderJobs, setRenderJobs] = useState([]);
  const [renderNow, setRenderNow] = useState(Date.now());
  const [localMessage, setLocalMessage] = useState('');
  const [localTone, setLocalTone] = useState('neutral');

  const selectedItem = useMemo(() => {
    const matched = publishedItems.find(item => String(item.id) === String(selectedId));
    if (matched) return matched;
    if (seedItem?.id && String(seedItem.id) === String(selectedId)) return seedItem;
    return null;
  }, [publishedItems, seedItem, selectedId]);

  const selectedTeamTags = useMemo(() => teamTagsForItem(selectedItem), [selectedItem]);
  const autoSubjectColor = selectedItem ? defaultSubjectColorForItem(selectedItem) : DEFAULT_SUBJECT_COLOR;
  const currentSubjectColor = normalizeSubjectColor(fields.subject_color);
  const previewSource = imagePreviewUrl || imageUrl.trim();
  const activeRenderJobs = renderJobs.filter(job => job.status === 'running');
  const isRenderingZip = activeRenderJobs.length > 0;

  const setNotice = (tone, text) => {
    setLocalTone(tone);
    setLocalMessage(text);
    onNotify?.(tone, text);
  };

  const applyItemDefaults = item => {
    if (!item) {
      setFields({ ...EMPTY_CARD_FIELDS });
      setCaption('');
      setImageUrl('');
      setImageFile(null);
      return;
    }
    setFields(fieldsFromCard(cardNewsDefaultFor(item), defaultSubjectColorForItem(item)));
    setCaption('');
    setImageUrl(firstMediaUrl(item.media));
    setImageFile(null);
    setLocalMessage('');
  };

  const loadPublishedItems = async () => {
    if (!adminToken) {
      setPublishedItems([]);
      return;
    }
    setBusy(true);
    setLocalMessage('');
    try {
      const response = await fetch('/api/admin/items?status=published&limit=100', { headers });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || '발행된 기사 목록을 불러오지 못했습니다.');
      const rows = data.items || [];
      setPublishedItems(rows);
      setSelectedId(prev => {
        if (seedItem?.id) return seedItem.id;
        if (prev && rows.some(item => String(item.id) === String(prev))) return prev;
        return rows[0]?.id || '';
      });
      if (rows.length === 0) {
        setNotice('warn', '카드뉴스로 만들 발행 기사가 없습니다.');
      }
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (seedItem?.id) setSelectedId(seedItem.id);
  }, [seedItem?.id]);

  useEffect(() => {
    loadPublishedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  useEffect(() => {
    applyItemDefaults(selectedItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem?.id]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (activeRenderJobs.length === 0) return undefined;
    const timer = window.setInterval(() => setRenderNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeRenderJobs.length]);

  const updateField = (name, value) => {
    setFields(prev => ({ ...prev, [name]: value }));
  };

  const updateRenderJob = (jobId, patch) => {
    setRenderJobs(prev => prev.map(job => (job.id === jobId ? { ...job, ...patch } : job)).slice(0, 5));
  };

  const generateDraft = async () => {
    if (!selectedItem) {
      setNotice('warn', '먼저 발행된 기사를 선택해주세요.');
      return;
    }
    setBusy(true);
    setLocalMessage('');
    try {
      const response = await fetch('/api/admin/card-news-draft', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: selectedItem.id, actor: 'admin-ui' }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || '카드뉴스 초안 생성에 실패했습니다.');
      setFields(fieldsFromCard(data.card, defaultSubjectColorForItem(selectedItem)));
      setCaption('');
      setNotice('good', '카드뉴스 초안을 가져왔습니다. 왼쪽에서 바로 수정할 수 있습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  const generateCaption = async () => {
    if (!selectedItem) {
      setNotice('warn', '먼저 발행된 기사를 선택해주세요.');
      return;
    }
    const card = cardFromFields(fields);
    if (!card.cover.headline || !card.cover.summary || !card.detail.paragraphs) {
      setNotice('warn', 'headline, summary, paragraphs를 먼저 입력해주세요.');
      return;
    }

    setCaptionBusy(true);
    setLocalMessage('');
    try {
      const response = await fetch('/api/admin/card-news-caption', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: selectedItem.id,
          actor: 'admin-ui',
          card,
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || '해시태그 생성에 실패했습니다.');
      const hashtags = String(data.hashtags || data.caption || '').trim();
      const captionDraft = captionDraftFromFields(fields, hashtags);
      setCaption(formatInstagramCaptionDraft(captionDraft));
      setNotice('good', '해시태그를 생성하고 캡션을 조립했습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setCaptionBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      const ok = await copyTextToClipboard(caption);
      if (!ok) {
        setNotice('warn', '복사할 캡션이 없습니다.');
        return;
      }
      setNotice('good', '캡션을 클립보드에 복사했습니다.');
    } catch (error) {
      setNotice('bad', error.message || '캡션 복사에 실패했습니다.');
    }
  };

  const renderCardNews = async () => {
    const item = selectedItem;
    const file = imageFile;
    const imageUrlValue = imageUrl.trim();
    const card = cardFromFields(fields);

    if (!item) {
      setNotice('warn', '먼저 발행된 기사를 선택해주세요.');
      return;
    }
    if (isRenderingZip) {
      setNotice('warn', '이미 카드뉴스 ZIP 생성이 진행 중입니다. 완료 후 다시 시도해주세요.');
      return;
    }
    if (!file && !imageUrlValue) {
      setNotice('warn', '이미지 파일을 업로드하거나 이미지 URL을 입력해주세요.');
      return;
    }
    if (!card.cover.headline || !card.cover.summary || !card.detail.paragraphs) {
      setNotice('warn', 'headline, summary, paragraphs는 비워둘 수 없습니다.');
      return;
    }

    setLocalMessage('');
    const jobId = renderJobId();
    const filename = `cardnews-${item.raw_post_id || item.id}.zip`;
    const startedAt = Date.now();
    setRenderNow(startedAt);
    setRenderJobs(prev => [{
      id: jobId,
      status: 'running',
      title: compactText(item.title_ko || item.raw_text, 72, '발행 기사'),
      filename,
      startedAt,
      phase: file ? '이미지 읽는 중' : '카드 생성 요청 중',
    }, ...prev].slice(0, 5));
    try {
      const body = {
        id: item.id,
        actor: 'admin-ui',
        card,
      };

      if (file) {
        body.image_data_url = await fileToDataUrl(file);
        body.image_name = file.name;
      } else {
        body.image_url = imageUrlValue;
      }

      updateRenderJob(jobId, { phase: '카드 이미지 생성 중' });
      const response = await fetch('/api/admin/card-news-render', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await readJsonResponse(response);
        throw new Error(data.error || '카드뉴스 렌더링에 실패했습니다.');
      }

      updateRenderJob(jobId, { phase: 'ZIP 다운로드 준비 중' });
      const blob = await response.blob();
      downloadBlob(blob, filename);
      updateRenderJob(jobId, {
        status: 'success',
        phase: '다운로드 시작됨',
        finishedAt: Date.now(),
        bytes: blob.size,
      });
      setNotice('good', `${filename} 다운로드를 시작했습니다.`);
    } catch (error) {
      updateRenderJob(jobId, {
        status: 'error',
        phase: '생성 실패',
        finishedAt: Date.now(),
        error: error.message,
      });
      setNotice('bad', error.message);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {localMessage && <Notice tone={localTone}>{localMessage}</Notice>}

      {renderJobs.length > 0 && (
        <div className="space-y-2 rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }} aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>ZIP jobs</div>
            <div className="text-xs font-bold" style={{ color: isRenderingZip ? '#ffd166' : '#8791aa' }}>
              {isRenderingZip ? '생성 중' : '대기 작업 없음'}
            </div>
          </div>
          {renderJobs.map(job => {
            const isRunning = job.status === 'running';
            const isSuccess = job.status === 'success';
            const statusColor = isRunning ? '#ffd166' : isSuccess ? '#48d99a' : '#ff8f8f';
            return (
              <div key={job.id} className="min-w-0 rounded px-3 py-2 text-sm" style={{ background: '#11141d', border: '1px solid #283040' }}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={isRunning ? 'inline-block h-2.5 w-2.5 shrink-0 rounded-full animate-pulse' : 'inline-block h-2.5 w-2.5 shrink-0 rounded-full'}
                        style={{ background: statusColor }}
                      />
                      <span className="min-w-0 break-words font-bold text-white" style={{ overflowWrap: 'anywhere' }}>{job.title}</span>
                    </div>
                    <div className="mt-1 break-words text-xs" style={{ color: '#8791aa', overflowWrap: 'anywhere' }}>
                      {job.filename} · {job.phase} · {formatDuration(job.startedAt, isRunning ? renderNow : (job.finishedAt || renderNow))}
                    </div>
                    {job.error && (
                      <div className="mt-1 break-words text-xs" style={{ color: '#ff8f8f', overflowWrap: 'anywhere' }}>
                        {job.error}
                      </div>
                    )}
                  </div>
                  {!isRunning && (
                    <button
                      type="button"
                      onClick={() => setRenderJobs(prev => prev.filter(row => row.id !== job.id))}
                      className="shrink-0 rounded px-2 py-1 text-xs font-bold"
                      style={{ background: '#171923', color: '#a8b0c7', border: '1px solid #2a3040' }}>
                      닫기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <section className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[260px] flex-1">
              <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>발행 기사</span>
              <select
                value={selectedId}
                onChange={event => setSelectedId(event.target.value)}
                disabled={!adminToken || busy}
                className="w-full rounded-md px-3 py-2 text-sm font-bold outline-none disabled:opacity-50"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}>
                {!selectedId && <option value="">발행 기사를 선택하세요</option>}
                {publishedItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {compactText(item.title_ko || item.raw_text, 72, '발행 기사')}
                  </option>
                ))}
                {seedItem && !publishedItems.some(item => String(item.id) === String(seedItem.id)) && (
                  <option value={seedItem.id}>{compactText(seedItem.title_ko || seedItem.raw_text, 72, '선택한 기사')}</option>
                )}
              </select>
            </label>
            <button
              type="button"
              onClick={loadPublishedItems}
              disabled={!adminToken || busy}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
              발행 기사 불러오기
            </button>
            <button
              type="button"
              onClick={generateDraft}
              disabled={!adminToken || !selectedItem || busy}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#2557ff', color: '#fff' }}>
              AI 초안 생성
            </button>
          </div>

          {selectedItem && (
            <div className="mb-4 rounded-md px-3 py-2 text-sm" style={{ background: '#080a10', color: '#8791aa', border: '1px solid #202635' }}>
              <div className="break-words font-bold text-white" style={{ overflowWrap: 'anywhere' }}>
                {selectedItem.title_ko || selectedItem.raw_text?.slice(0, 90) || '발행 기사'}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span>@{selectedItem.raw_author_handle || selectedItem.raw_author_name || 'source'}</span>
                {selectedItem.raw_created_at && <span>{fmtKST(selectedItem.raw_created_at)} KST</span>}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>subject</span>
              <input
                value={fields.subject}
                onChange={event => updateField('subject', event.target.value)}
                placeholder="예: MUN, TRANSFER, EPL"
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
              />
            </label>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <span className="block text-xs font-bold uppercase" style={{ color: '#687086' }}>subject color</span>
                <span className="text-xs" style={{ color: '#8791aa' }}>
                  {selectedTeamTags.length === 1
                    ? `자동: ${selectedTeamTags[0]}`
                    : selectedTeamTags.length > 1
                      ? '자동: WHITE'
                      : '자동: WHITE'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateField('subject_color', autoSubjectColor)}
                  className="rounded-md px-3 py-2 text-xs font-black"
                  style={{
                    background: currentSubjectColor === autoSubjectColor ? '#e8edf7' : '#11141d',
                    color: currentSubjectColor === autoSubjectColor ? '#05070d' : '#cbd3e8',
                    border: '1px solid #283040',
                  }}>
                  AUTO
                </button>
                {TEAM_OPTIONS.map(team => {
                  const teamColor = TEAM_SUBJECT_COLORS[team];
                  const active = currentSubjectColor === teamColor;
                  const isWhite = teamColor === '#FFFFFF';
                  return (
                    <button
                      key={team}
                      type="button"
                      onClick={() => updateField('subject_color', teamColor)}
                      className="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-black"
                      style={{
                        background: active ? '#e8edf7' : '#11141d',
                        color: active ? '#05070d' : '#cbd3e8',
                        border: active ? '1px solid #e8edf7' : '1px solid #283040',
                      }}>
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{
                          background: teamColor,
                          border: isWhite ? '1px solid #5b6475' : '1px solid rgba(255,255,255,0.2)',
                        }}
                      />
                      {team}
                    </button>
                  );
                })}
                <input
                  type="color"
                  aria-label="subject color"
                  value={currentSubjectColor.toLowerCase()}
                  onChange={event => updateField('subject_color', normalizeSubjectColor(event.target.value))}
                  className="h-9 w-12 cursor-pointer rounded-md p-1"
                  style={{ background: '#11141d', border: '1px solid #283040' }}
                />
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>headline</span>
              <textarea
                value={fields.headline}
                onChange={event => updateField('headline', event.target.value)}
                rows={2}
                placeholder="카드뉴스 메인 제목"
                className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>summary</span>
              <textarea
                value={fields.summary}
                onChange={event => updateField('summary', event.target.value)}
                rows={3}
                placeholder="커버 카드에 들어갈 짧은 요약"
                className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
              />
            </label>
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <label className="block min-w-0">
                <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>paragraphs</span>
                <CardParagraphEditor
                  value={fields.paragraphs}
                  onChange={event => updateField('paragraphs', event.target.value)}
                  minHeight={CARD_WORKSPACE_TEXTAREA_HEIGHT}
                />
              </label>
              <div className="block min-w-0">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="block text-xs font-bold uppercase" style={{ color: '#687086' }}>instagram caption</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={generateCaption}
                      disabled={!adminToken || !selectedItem || captionBusy}
                      className="rounded px-2 py-1 text-xs font-bold disabled:opacity-50"
                      style={{ background: '#2557ff', color: '#fff' }}>
                      {captionBusy ? '생성 중' : '캡션 생성하기'}
                    </button>
                    <button
                      type="button"
                      onClick={copyCaption}
                      disabled={!caption.trim()}
                      className="rounded px-2 py-1 text-xs font-bold disabled:opacity-50"
                      style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
                      복사
                    </button>
                  </div>
                </div>
                <textarea
                  value={caption}
                  onChange={event => setCaption(event.target.value)}
                  rows={12}
                  className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
                  style={{
                    minHeight: CARD_WORKSPACE_TEXTAREA_HEIGHT,
                    height: CARD_WORKSPACE_TEXTAREA_HEIGHT,
                    background: '#11141d',
                    color: '#fff',
                    border: '1px solid #283040',
                    resize: 'vertical',
                    whiteSpace: 'pre-wrap',
                  }}
                />
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>source</span>
              <input
                value={fields.source}
                onChange={event => updateField('source', event.target.value)}
                placeholder="출처 표기"
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
              />
            </label>

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>이미지 URL</span>
                <input
                  value={imageUrl}
                  onChange={event => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-md px-3 py-2 text-sm outline-none"
                  style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>이미지 업로드</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={event => setImageFile(event.target.files?.[0] || null)}
                  className="block w-full rounded-md px-3 py-2 text-sm"
                  style={{ background: '#11141d', color: '#a8b0c7', border: '1px solid #283040' }}
                />
                {imageFile && (
                  <div className="mt-1 break-words text-xs" style={{ color: '#8791aa', overflowWrap: 'anywhere' }}>
                    {imageFile.name} · {(imageFile.size / 1024 / 1024).toFixed(2)}MB
                  </div>
                )}
              </label>
            </div>

            <button
              type="button"
              onClick={renderCardNews}
              disabled={!adminToken || !selectedItem || busy || isRenderingZip}
              className="w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-50"
              style={{ background: '#21c17a', color: '#03130c' }}>
              {isRenderingZip ? 'ZIP 생성 중' : '카드뉴스 ZIP 생성'}
            </button>
          </div>
        </section>

        <CardNewsPreview fields={fields} imageSource={previewSource} />
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
  const [cardNewsSeed, setCardNewsSeed] = useState(null);
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
    if (status === CARD_NEWS_TAB) {
      setError('');
      setLoaded(true);
      return items;
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

  const regenerateAction = async (item, note) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/regenerate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: item.id, note, actor: 'admin-ui' }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Regeneration failed');
      const { briefing } = data;
      updateDraft(item.id, {
        title_ko: briefing.title_ko,
        summary_short_ko: briefing.summary_short_ko,
        summary_detail_ko: briefing.summary_detail_ko,
        briefing_status: briefing.briefing_status,
        team_tags: briefing.team_tags,
        regen_note: '',
      });
      setMessageTone('good');
      setMessage('브리핑이 재생성됐습니다. 내용 확인 후 저장하세요.');
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

        <section className={status === CARD_NEWS_TAB ? 'mt-5 grid min-w-0 gap-5' : 'mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'}>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {ADMIN_TAB_OPTIONS.map(option => {
                const countMap = { review: dashboard?.review, published: dashboard?.published, discarded: dashboard?.discarded, rejected: dashboard?.rejected, all: dashboard?.total, [CARD_NEWS_TAB]: dashboard?.published };
                const count = countMap[option] || 0;
                const isActive = status === option;
                const isWarn = option === 'review' && count > 0;
                const newCount = [...newIds].filter(id => {
                  if (option === CARD_NEWS_TAB) return false;
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
                    {option === CARD_NEWS_TAB ? '카드뉴스 작업대' : STATUS_LABELS[option]}
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
            {status === CARD_NEWS_TAB ? (
              <CardNewsWorkspace
                headers={headers}
                adminToken={adminToken}
                seedItem={cardNewsSeed}
                onNotify={(tone, text) => {
                  setMessageTone(tone);
                  setMessage(text);
                }}
              />
            ) : (
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
                  onRegenerate={regenerateAction}
                  onCardNews={item => {
                    setCardNewsSeed(item);
                    setStatus(CARD_NEWS_TAB);
                  }}
                  busy={busy}
                  isNew={newIds.has(item.id)}
                />
              ))}
              </div>
            )}
          </div>

          {status !== CARD_NEWS_TAB && (
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
          )}
        </section>
      </div>
    </div>
  );
}
