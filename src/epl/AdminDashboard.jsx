import { useEffect, useMemo, useRef, useState } from 'react';

import todayFixturesTemplateUrl from './assets/today-fixtures-template.png';

const CARD_NEWS_TAB = 'card_news_workspace';
const ARTICLE_CARD_MODE = 'article';
const TODAY_FIXTURES_MODE = 'today_fixtures';
const ARTICLE_CARD_TEMPLATE_ID = 'plick_transfer_v1';
const TODAY_FIXTURES_TEMPLATE_ID = 'plick_today_fixtures_v1';
const TODAY_FIXTURES_MATCHES_PER_PAGE = 4;
const TODAY_FIXTURES_MAX_MATCHES = 40;
const CARD_WORKSPACE_MODES = [
  { id: ARTICLE_CARD_MODE, label: '기사 기반' },
  { id: TODAY_FIXTURES_MODE, label: '오늘의 경기 일정' },
];
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
const CARD_COVER_SUMMARY_WIDTH = 826;
const CARD_COVER_SUMMARY_FONT_SIZE = 40;
const CARD_PREVIEW_SCALE = CARD_PREVIEW_MAX_WIDTH / CARD_PREVIEW_WIDTH;
const CARD_COVER_SUMMARY_EDITOR_TEXT_WIDTH = CARD_COVER_SUMMARY_WIDTH * CARD_PREVIEW_SCALE;
const CARD_COVER_SUMMARY_EDITOR_FONT_SIZE = CARD_COVER_SUMMARY_FONT_SIZE * CARD_PREVIEW_SCALE;
const CARD_COVER_SUMMARY_EDITOR_MIN_HEIGHT = 136;
const CARD_TEXTAREA_PADDING_X = 12;
const CARD_DETAIL_TEXT_WIDTH = 960;
const CARD_DETAIL_TEXT_TOP = 180;
const CARD_DETAIL_TEXT_HEIGHT = 900;
const CARD_DETAIL_FONT_SIZE = 40;
const CARD_DETAIL_LINE_HEIGHT = 60;
const CARD_DETAIL_SOURCE_TOP = 1110;
const CARD_DETAIL_SOURCE_GAP = CARD_DETAIL_SOURCE_TOP - CARD_DETAIL_TEXT_TOP - CARD_DETAIL_TEXT_HEIGHT;
const CARD_DETAIL_SOURCE_HEIGHT = 60;
const CARD_DETAIL_STACK_CENTER =
  CARD_DETAIL_TEXT_TOP + (CARD_DETAIL_TEXT_HEIGHT + CARD_DETAIL_SOURCE_GAP + CARD_DETAIL_SOURCE_HEIGHT) / 2;
const CARD_DETAIL_EDITOR_MAX_WIDTH = CARD_DETAIL_TEXT_WIDTH * (CARD_PREVIEW_MAX_WIDTH / CARD_PREVIEW_WIDTH);
const CARD_WORKSPACE_TEXTAREA_HEIGHT = 300;
const CARD_WORKSPACE_EDITOR_MAX_WIDTH = CARD_DETAIL_EDITOR_MAX_WIDTH;
const DEFAULT_TODAY_FIXTURES = {
  eyebrow: 'WORLD CUP 2026 · TODAY',
  title: '오늘의\n경기 일정',
  date_label: '6월 12일 (금)',
  matches: [
    {
      time_period: '오전',
      kickoff_time: '04:00',
      home_team: '브라질',
      home_code: 'BRA',
      away_team: '세네갈',
      away_code: 'SEN',
      group_label: 'Group F',
      venue: '마이애미 · 하드록 스타디움',
    },
    {
      time_period: '오전',
      kickoff_time: '08:00',
      home_team: '프랑스',
      home_code: 'FRA',
      away_team: '크로아티아',
      away_code: 'CRO',
      group_label: 'Group H',
      venue: '뉴욕 · 메트라이프 스타디움',
    },
    {
      time_period: '오후',
      kickoff_time: '11:00',
      home_team: '캐나다',
      home_code: 'CAN',
      away_team: '일본',
      away_code: 'JPN',
      group_label: 'Group B',
      venue: '토론토 · BMO 필드',
    },
    {
      time_period: '오후',
      kickoff_time: '14:00',
      home_team: '포르투갈',
      home_code: 'POR',
      away_team: '모로코',
      away_code: 'MAR',
      group_label: 'Group C',
      venue: 'LA · 소파이 스타디움',
    },
  ],
};
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

function isPublicationRunning(status) {
  return ['pending', 'queued', 'running'].includes(String(status || ''));
}

function publicationStatusTone(status) {
  if (status === 'completed') return '#48d99a';
  if (status === 'failed') return '#ff8f8f';
  return '#ffd166';
}

function cloneTodayFixturesDefaults() {
  return {
    ...DEFAULT_TODAY_FIXTURES,
    matches: DEFAULT_TODAY_FIXTURES.matches.map(match => ({ ...match })),
  };
}

function emptyTodayFixtureMatch() {
  return {
    time_period: '오전',
    kickoff_time: '',
    home_team: '',
    home_code: '',
    away_team: '',
    away_code: '',
    group_label: '',
    venue: '',
  };
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function todayFixturesPayload(value) {
  return {
    eyebrow: String(value.eyebrow || '').trim(),
    title: String(value.title || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim(),
    date_label: String(value.date_label || '').trim(),
    matches: (value.matches || []).map(match => ({
      time_period: String(match.time_period || '').trim(),
      kickoff_time: String(match.kickoff_time || '').trim(),
      home_team: String(match.home_team || '').trim(),
      home_code: String(match.home_code || '').trim().toUpperCase(),
      away_team: String(match.away_team || '').trim(),
      away_code: String(match.away_code || '').trim().toUpperCase(),
      group_label: String(match.group_label || '').trim(),
      venue: String(match.venue || '').trim(),
    })),
  };
}

function validateTodayFixturesPayload(payload) {
  if (!payload.date_label) return '날짜를 입력해주세요.';
  if (payload.matches.length < 1 || payload.matches.length > TODAY_FIXTURES_MAX_MATCHES) return `경기는 1개 이상 ${TODAY_FIXTURES_MAX_MATCHES}개 이하로 입력해주세요.`;
  const requiredKeys = ['kickoff_time', 'home_team', 'home_code', 'away_team', 'away_code'];
  for (let index = 0; index < payload.matches.length; index += 1) {
    const match = payload.matches[index];
    const missing = requiredKeys.find(key => !match[key]);
    if (missing) return `${index + 1}번째 경기의 필수 정보를 입력해주세요.`;
  }
  return '';
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
      summary: normalizeParagraphText(fields.summary),
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
  const coverSummary = normalizeParagraphText(fields.summary) || '요약을 입력하면 커버 하단에 표시됩니다.';
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
                  margin: 0,
                  color: '#fff',
                  fontSize: 84,
                  lineHeight: 'normal',
                  fontWeight: 900,
                  letterSpacing: 0,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  overflow: 'visible',
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
                  margin: 0,
                  color: '#fff',
                  fontSize: 40,
                  lineHeight: 'normal',
                  fontWeight: 500,
                  letterSpacing: 0,
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'visible',
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
                  top: CARD_DETAIL_STACK_CENTER,
                  zIndex: 2,
                  width: CARD_DETAIL_TEXT_WIDTH,
                  transform: 'translateY(-50%)',
                  overflow: 'visible',
                }}>
                <div
                  style={{
                    width: CARD_DETAIL_TEXT_WIDTH,
                    minHeight: CARD_DETAIL_TEXT_HEIGHT,
                    color: '#fff',
                    fontSize: CARD_DETAIL_FONT_SIZE,
                    lineHeight: `${CARD_DETAIL_LINE_HEIGHT}px`,
                    fontWeight: 500,
                    letterSpacing: 0,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'visible',
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
                    width: 960,
                    marginTop: CARD_DETAIL_SOURCE_GAP,
                    color: '#fff',
                    fontSize: 32,
                    lineHeight: '60px',
                    fontWeight: 500,
                    letterSpacing: 0,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                  }}>
                  @{sourceText}
                </div>
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

function CardSummaryEditor({ value, onChange, placeholder = 'cover summary' }) {
  const textareaRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(CARD_COVER_SUMMARY_EDITOR_MIN_HEIGHT);
  const summaryPaddingRight =
    `max(${CARD_TEXTAREA_PADDING_X}px, calc(100% - ${CARD_TEXTAREA_PADDING_X + CARD_COVER_SUMMARY_EDITOR_TEXT_WIDTH}px))`;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;

    node.style.height = 'auto';
    const nextHeight = Math.max(CARD_COVER_SUMMARY_EDITOR_MIN_HEIGHT, node.scrollHeight);
    node.style.height = `${nextHeight}px`;
    setTextareaHeight(nextHeight);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      wrap="soft"
      placeholder={placeholder}
      className="block w-full rounded-md outline-none"
      style={{
        height: textareaHeight,
        minHeight: CARD_COVER_SUMMARY_EDITOR_MIN_HEIGHT,
        boxSizing: 'border-box',
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: CARD_TEXTAREA_PADDING_X,
        paddingRight: summaryPaddingRight,
        margin: 0,
        border: '1px solid #283040',
        resize: 'vertical',
        background: '#11141d',
        color: '#fff',
        caretColor: '#fff',
        fontFamily: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
        fontSize: CARD_COVER_SUMMARY_EDITOR_FONT_SIZE,
        lineHeight: 'normal',
        fontWeight: 500,
        letterSpacing: 0,
        textAlign: 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
        overflow: 'hidden',
      }}
    />
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

function TodayFixturesEditor({ value, onChange, onRender, disabled, rendering }) {
  const updateField = (name, nextValue) => onChange({ ...value, [name]: nextValue });
  const updateMatch = (index, name, nextValue) => {
    const matches = value.matches.map((match, matchIndex) => (
      matchIndex === index ? { ...match, [name]: nextValue } : match
    ));
    onChange({ ...value, matches });
  };
  const addMatch = () => {
    if (value.matches.length >= TODAY_FIXTURES_MAX_MATCHES) return;
    onChange({ ...value, matches: [...value.matches, emptyTodayFixtureMatch()] });
  };
  const removeMatch = index => {
    if (value.matches.length <= 1) return;
    onChange({ ...value, matches: value.matches.filter((_, matchIndex) => matchIndex !== index) });
  };

  return (
    <section className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>manual template</div>
          <div className="mt-1 text-sm font-bold text-white">오늘의 경기 일정</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(cloneTodayFixturesDefaults())}
          className="rounded-md px-3 py-2 text-xs font-bold"
          style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
          샘플 복원
        </button>
      </div>

      <div className="space-y-3">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>date label</span>
          <input
            value={value.date_label}
            onChange={event => updateField('date_label', event.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}
          />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase" style={{ color: '#687086' }}>matches</span>
            <button
              type="button"
              onClick={addMatch}
              disabled={value.matches.length >= TODAY_FIXTURES_MAX_MATCHES}
              className="rounded px-2 py-1 text-xs font-bold disabled:opacity-50"
              style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
              경기 추가
            </button>
          </div>

          {value.matches.map((match, index) => (
            <div key={index} className="rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-black text-white">{index + 1}번째 경기</div>
                <button
                  type="button"
                  onClick={() => removeMatch(index)}
                  disabled={value.matches.length <= 1}
                  className="rounded px-2 py-1 text-xs font-bold disabled:opacity-50"
                  style={{ background: '#351111', color: '#ffb0b0', border: '1px solid #5c2424' }}>
                  삭제
                </button>
              </div>
              <div className="grid min-w-0 gap-2 md:grid-cols-4">
                <input value={match.time_period} onChange={event => updateMatch(index, 'time_period', event.target.value)} placeholder="오전" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.kickoff_time} onChange={event => updateMatch(index, 'kickoff_time', event.target.value)} placeholder="04:00" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.home_team} onChange={event => updateMatch(index, 'home_team', event.target.value)} placeholder="홈팀" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.home_code} onChange={event => updateMatch(index, 'home_code', event.target.value)} placeholder="HOME" className="rounded-md px-3 py-2 text-sm uppercase outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.away_team} onChange={event => updateMatch(index, 'away_team', event.target.value)} placeholder="원정팀" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.away_code} onChange={event => updateMatch(index, 'away_code', event.target.value)} placeholder="AWAY" className="rounded-md px-3 py-2 text-sm uppercase outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.group_label} onChange={event => updateMatch(index, 'group_label', event.target.value)} placeholder="Group F" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
                <input value={match.venue} onChange={event => updateMatch(index, 'venue', event.target.value)} placeholder="경기장" className="rounded-md px-3 py-2 text-sm outline-none" style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onRender}
          disabled={disabled || rendering}
          className="w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-50"
          style={{ background: '#21c17a', color: '#03130c' }}>
          {rendering ? '발행 중' : '오늘의 경기 일정 발행'}
        </button>
      </div>
    </section>
  );
}

function TodayFixturesPreview({ value }) {
  const wrapperRef = useRef(null);
  const [previewWidth, setPreviewWidth] = useState(360);
  const [pageIndex, setPageIndex] = useState(0);
  const scale = previewWidth / CARD_PREVIEW_WIDTH;

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;
    const updateWidth = width => {
      if (width > 0) setPreviewWidth(Math.min(width, CARD_PREVIEW_MAX_WIDTH));
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

  const payload = todayFixturesPayload(value);
  const fixturePages = chunkItems(payload.matches, TODAY_FIXTURES_MATCHES_PER_PAGE);
  const activePageIndex = Math.min(pageIndex, fixturePages.length - 1);
  const activeMatches = fixturePages[activePageIndex] || [];

  useEffect(() => {
    setPageIndex(current => Math.min(current, fixturePages.length - 1));
  }, [fixturePages.length]);

  return (
    <aside className="min-w-0 rounded-md p-4" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Live preview</div>
          <div className="mt-1 text-sm font-bold text-white">오늘의 경기 일정</div>
        </div>
        <div className="flex items-center gap-2">
          {fixturePages.length > 1 && (
            <div className="flex items-center gap-1">
              {fixturePages.map((_, index) => (
                <button
                  key={`fixture-page-${index + 1}`}
                  type="button"
                  onClick={() => setPageIndex(index)}
                  className="h-7 min-w-7 rounded-md px-2 text-xs font-black transition"
                  style={{
                    background: index === activePageIndex ? '#f8fafc' : '#151b27',
                    color: index === activePageIndex ? '#0b0d14' : '#b8c0d4',
                    border: '1px solid #2b3447',
                  }}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
          <Badge tone="warn">4:5</Badge>
        </div>
      </div>
      <div ref={wrapperRef} className="mx-auto w-full" style={{ maxWidth: CARD_PREVIEW_MAX_WIDTH }}>
        <div style={{ position: 'relative', width: '100%', height: CARD_PREVIEW_HEIGHT * scale }}>
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
              background: '#06090f',
              fontFamily: '"Pretendard", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
            }}>
            <img
              src={todayFixturesTemplateUrl}
              alt=""
              style={{ position: 'absolute', inset: 0, width: CARD_PREVIEW_WIDTH, height: CARD_PREVIEW_HEIGHT, display: 'block' }}
            />
            <div style={{ position: 'absolute', left: 72, top: 383.66, width: 360, height: 38, color: 'rgba(255,255,255,0.72)', fontSize: 31.1, lineHeight: '38px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {payload.date_label}
            </div>
            {activeMatches.map((match, index) => (
              <div key={`${activePageIndex}-${index}`} style={{ position: 'absolute', left: 72, top: 461.66 + (index * 205), width: 936, height: 183, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 44, top: 51.29, width: 132, height: 81 }}>
                  <div style={{ width: 84, height: 26, color: 'rgba(255,255,255,0.46)', fontSize: 22, lineHeight: '26px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>{match.time_period}</div>
                  <div style={{ width: 170, height: 67, fontFamily: '"Bebas Neue", "Pretendard", sans-serif', fontSize: 56, lineHeight: '50.4px', fontWeight: 400, letterSpacing: 1.12, whiteSpace: 'nowrap', overflow: 'hidden' }}>{match.kickoff_time}</div>
                </div>
                <div style={{ position: 'absolute', left: 200, top: 33, width: 720, height: 150 }}>
                  <div style={{ position: 'absolute', left: 0, top: 15, width: 225, height: 54, fontSize: 39.8, lineHeight: '48px', fontWeight: 900, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden' }}>{match.home_team}</div>
                  <div style={{ position: 'absolute', left: 240.61, top: 0, width: 78, height: 78, border: '1px dashed rgba(255,255,255,0.28)', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0)), rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.72)', fontFamily: '"Bebas Neue", "Pretendard", sans-serif', fontSize: 24.3, lineHeight: '78px', fontWeight: 400, textAlign: 'center', letterSpacing: 0.973, overflow: 'hidden' }}>{match.home_code}</div>
                  <div style={{ position: 'absolute', left: 336.61, top: 17, width: 54, height: 40, color: 'rgba(255,255,255,0.46)', fontFamily: '"Bebas Neue", "Pretendard", sans-serif', fontSize: 26, lineHeight: '31px', fontWeight: 400, textAlign: 'center' }}>VS</div>
                  <div style={{ position: 'absolute', left: 378.38, top: 0, width: 78, height: 78, border: '1px dashed rgba(255,255,255,0.28)', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0)), rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.72)', fontFamily: '"Bebas Neue", "Pretendard", sans-serif', fontSize: 24.3, lineHeight: '78px', fontWeight: 400, textAlign: 'center', letterSpacing: 0.973, overflow: 'hidden' }}>{match.away_code}</div>
                  <div style={{ position: 'absolute', left: 472.38, top: 15, width: 225, height: 54, fontSize: 39.8, lineHeight: '48px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>{match.away_team}</div>
                  <div style={{ position: 'absolute', left: 0, top: 92, width: 680, height: 25, color: 'rgba(255,255,255,0.46)', fontSize: 21, lineHeight: '25px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {[match.group_label, match.venue].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function CardNewsWorkspace({ headers, adminToken, seedItem, onNotify }) {
  const [cardMode, setCardMode] = useState(ARTICLE_CARD_MODE);
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
  const [publications, setPublications] = useState([]);
  const [renderNow, setRenderNow] = useState(Date.now());
  const [localMessage, setLocalMessage] = useState('');
  const [localTone, setLocalTone] = useState('neutral');
  const [todayFixtures, setTodayFixtures] = useState(() => cloneTodayFixturesDefaults());

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
  const activePublications = publications.filter(publication => isPublicationRunning(publication.status));
  const activePublicationKey = activePublications.map(publication => publication.id).join('|');
  const isRenderingZip = activeRenderJobs.length > 0 || activePublications.length > 0;

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

  const upsertPublication = publication => {
    if (!publication?.id) return;
    setPublications(prev => {
      const next = prev.filter(row => row.id !== publication.id);
      return [publication, ...next].slice(0, 30);
    });
  };

  const loadPublications = async () => {
    if (!adminToken) {
      setPublications([]);
      return;
    }
    try {
      const response = await fetch('/api/admin/card-publications?limit=30', { headers });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Failed to load card news publications');
      setPublications(data.publications || []);
    } catch (error) {
      setNotice('bad', error.message);
    }
  };

  const syncPublication = async (publicationId, localJobId = null) => {
    const response = await fetch('/api/admin/card-publications-sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: publicationId, actor: 'admin-ui' }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Failed to sync card news publication');
    const publication = data.publication;
    upsertPublication(publication);
    if (localJobId && publication) {
      if (publication.status === 'completed') {
        updateRenderJob(localJobId, {
          status: 'success',
          phase: 'R2 발행 완료',
          finishedAt: Date.now(),
          zipUrl: publication.zip_url,
        });
        setNotice('good', `${publication.title || '카드뉴스'} 발행이 완료됐습니다.`);
      } else if (publication.status === 'failed') {
        updateRenderJob(localJobId, {
          status: 'error',
          phase: '발행 실패',
          finishedAt: Date.now(),
          error: publication.error_message || 'Render job failed',
        });
        setNotice('bad', publication.error_message || '카드뉴스 발행에 실패했습니다.');
      } else {
        updateRenderJob(localJobId, {
          phase: `R2 발행 중 (${publication.status})`,
        });
      }
    }
    return publication;
  };

  useEffect(() => {
    if (seedItem?.id) setSelectedId(seedItem.id);
  }, [seedItem?.id]);

  useEffect(() => {
    loadPublishedItems();
    loadPublications();
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

  useEffect(() => {
    if (!adminToken || activePublications.length === 0) return undefined;
    const tick = () => {
      activePublications.forEach(publication => {
        const localJob = renderJobs.find(job => job.publicationId === publication.id && job.status === 'running');
        syncPublication(publication.id, localJob?.id).catch(error => setNotice('bad', error.message));
      });
    };
    const timer = window.setInterval(tick, 3000);
    tick();
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, activePublicationKey]);

  const updateField = (name, value) => {
    setFields(prev => ({ ...prev, [name]: value }));
  };

  const updateRenderJob = (jobId, patch) => {
    setRenderJobs(prev => prev.map(job => (job.id === jobId ? { ...job, ...patch } : job)).slice(0, 5));
  };

  const uploadCardImageFile = async file => {
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': file.type },
      body: file,
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Image upload failed');
    return data.url;
  };

  const startCardPublication = async ({ jobId, kind, contentItemId, title, caption: publicationCaption, sourcePayload, renderRequest }) => {
    const response = await fetch('/api/admin/card-publications', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        actor: 'admin-ui',
        kind,
        content_item_id: contentItemId || null,
        title,
        caption: publicationCaption || '',
        source_payload: sourcePayload || {},
        render_request: renderRequest,
      }),
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Failed to start card news publication');
    const publication = data.publication;
    upsertPublication(publication);
    updateRenderJob(jobId, {
      publicationId: publication.id,
      phase: `R2 발행 중 (${publication.status})`,
    });
    return publication;
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

  const renderTodayFixtures = async () => {
    const payload = todayFixturesPayload(todayFixtures);
    const validationMessage = validateTodayFixturesPayload(payload);

    if (validationMessage) {
      setNotice('warn', validationMessage);
      return;
    }
    if (isRenderingZip) {
      setNotice('warn', '이미 카드뉴스 ZIP 생성이 진행 중입니다. 완료 후 다시 시도해주세요.');
      return;
    }

    setLocalMessage('');
    const jobId = renderJobId();
    const filename = `cardnews-today-fixtures-${payload.date_label.replace(/\s+/g, '-')}.zip`;
    const startedAt = Date.now();
    setRenderNow(startedAt);
    setRenderJobs(prev => [{
      id: jobId,
      status: 'running',
      title: `${payload.date_label} 오늘의 경기 일정`,
      filename,
      startedAt,
      phase: '템플릿 카드 생성 요청 중',
    }, ...prev].slice(0, 5));

    try {
      updateRenderJob(jobId, { phase: '일정 카드 이미지 생성 중' });
      const response = await fetch('/api/admin/card-template-render', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actor: 'admin-ui',
          template_id: TODAY_FIXTURES_TEMPLATE_ID,
          today_fixtures: payload,
        }),
      });

      if (!response.ok) {
        const data = await readJsonResponse(response);
        throw new Error(data.error || '오늘의 경기 일정 카드 생성에 실패했습니다.');
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

  const publishCardNews = async () => {
    const item = selectedItem;
    const file = imageFile;
    const imageUrlValue = imageUrl.trim();
    const card = cardFromFields(fields);

    if (!item) {
      setNotice('warn', '먼저 발행 기사를 선택해주세요.');
      return;
    }
    if (isRenderingZip) {
      setNotice('warn', '이미 카드뉴스 발행 작업이 진행 중입니다.');
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
      title: compactText(item.title_ko || item.raw_text, 72, 'Card news'),
      filename,
      startedAt,
      phase: file ? '이미지 업로드 중' : 'R2 발행 요청 중',
    }, ...prev].slice(0, 5));

    try {
      let finalImageUrl = imageUrlValue;
      if (file) {
        finalImageUrl = await uploadCardImageFile(file);
        setImageUrl(finalImageUrl);
        setImageFile(null);
      }

      updateRenderJob(jobId, { phase: 'R2 발행 작업 등록 중' });
      const publication = await startCardPublication({
        jobId,
        kind: 'article',
        contentItemId: item.id,
        title: compactText(item.title_ko || item.raw_text, 120, 'Card news'),
        caption,
        sourcePayload: {
          item_id: item.id,
          image_url: finalImageUrl,
          card,
        },
        renderRequest: {
          template_id: ARTICLE_CARD_TEMPLATE_ID,
          image_url: finalImageUrl,
          card,
        },
      });
      setNotice('good', `${publication.title || filename} 발행 작업을 시작했습니다.`);
    } catch (error) {
      updateRenderJob(jobId, {
        status: 'error',
        phase: '발행 실패',
        finishedAt: Date.now(),
        error: error.message,
      });
      setNotice('bad', error.message);
    }
  };

  const publishTodayFixtures = async () => {
    const payload = todayFixturesPayload(todayFixtures);
    const validationMessage = validateTodayFixturesPayload(payload);

    if (validationMessage) {
      setNotice('warn', validationMessage);
      return;
    }
    if (isRenderingZip) {
      setNotice('warn', '이미 카드뉴스 발행 작업이 진행 중입니다.');
      return;
    }

    setLocalMessage('');
    const jobId = renderJobId();
    const filename = `cardnews-today-fixtures-${payload.date_label.replace(/\s+/g, '-')}.zip`;
    const title = `${payload.date_label} 오늘의 경기 일정`;
    const startedAt = Date.now();
    setRenderNow(startedAt);
    setRenderJobs(prev => [{
      id: jobId,
      status: 'running',
      title,
      filename,
      startedAt,
      phase: 'R2 발행 작업 등록 중',
    }, ...prev].slice(0, 5));

    try {
      const publication = await startCardPublication({
        jobId,
        kind: 'today_fixtures',
        contentItemId: null,
        title,
        caption: '',
        sourcePayload: {
          today_fixtures: payload,
        },
        renderRequest: {
          template_id: TODAY_FIXTURES_TEMPLATE_ID,
          today_fixtures: payload,
        },
      });
      setNotice('good', `${publication.title || filename} 발행 작업을 시작했습니다.`);
    } catch (error) {
      updateRenderJob(jobId, {
        status: 'error',
        phase: '발행 실패',
        finishedAt: Date.now(),
        error: error.message,
      });
      setNotice('bad', error.message);
    }
  };

  const publishCardNewsModalUnused = async () => {
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
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        const upload = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: headers.Authorization, 'Content-Type': imageFile.type },
          body: imageFile,
        });
        const uploadData = await readJsonResponse(upload);
        if (!upload.ok) throw new Error(uploadData.error || 'Image upload failed');
        finalImageUrl = uploadData.url;
        setImageUrl(finalImageUrl);
        setImageFile(null);
      }

      const response = await fetch('/api/admin/card-publications', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actor: 'admin-ui',
          kind: 'article',
          content_item_id: item.id,
          title: compactText(item.title_ko || item.raw_text, 120, 'Card news'),
          caption: '',
          source_payload: {
            item_id: item.id,
            image_url: finalImageUrl,
            card,
          },
          render_request: {
            template_id: ARTICLE_CARD_TEMPLATE_ID,
            image_url: finalImageUrl,
            card,
          },
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Failed to start card news publication');
      setNotice('good', '카드뉴스 발행 작업을 시작했습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  const publishCardNewsModalUnused2 = async () => {
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
      let finalImageUrl = imageUrl.trim();
      if (imageFile) {
        const upload = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: headers.Authorization, 'Content-Type': imageFile.type },
          body: imageFile,
        });
        const uploadData = await readJsonResponse(upload);
        if (!upload.ok) throw new Error(uploadData.error || 'Image upload failed');
        finalImageUrl = uploadData.url;
        setImageUrl(finalImageUrl);
        setImageFile(null);
      }

      const response = await fetch('/api/admin/card-publications', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actor: 'admin-ui',
          kind: 'article',
          content_item_id: item.id,
          title: compactText(item.title_ko || item.raw_text, 120, 'Card news'),
          caption: '',
          source_payload: {
            item_id: item.id,
            image_url: finalImageUrl,
            card,
          },
          render_request: {
            template_id: ARTICLE_CARD_TEMPLATE_ID,
            image_url: finalImageUrl,
            card,
          },
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Failed to start card news publication');
      setNotice('good', '카드뉴스 발행 작업을 시작했습니다.');
    } catch (error) {
      setNotice('bad', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      {localMessage && <Notice tone={localTone}>{localMessage}</Notice>}

      {renderJobs.length > 0 && (
        <div className="space-y-2 rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }} aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Publish jobs</div>
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

      <section className="space-y-3 rounded-md p-3" style={{ background: '#080a10', border: '1px solid #202635' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase" style={{ color: '#687086' }}>Published card news</div>
            <div className="mt-1 text-sm font-bold text-white">발행된 카드뉴스</div>
          </div>
          <button
            type="button"
            onClick={loadPublications}
            disabled={!adminToken}
            className="rounded px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
            새로고침
          </button>
        </div>
        {publications.length === 0 ? (
          <div className="rounded px-3 py-2 text-sm" style={{ background: '#11141d', color: '#8791aa', border: '1px solid #283040' }}>
            아직 발행된 카드뉴스가 없습니다.
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {publications.map(publication => {
              const pages = Array.isArray(publication.pages) ? publication.pages : [];
              const running = isPublicationRunning(publication.status);
              const statusColor = publicationStatusTone(publication.status);
              return (
                <article key={publication.id} className="min-w-0 rounded-md p-3" style={{ background: '#11141d', border: '1px solid #283040' }}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={running ? 'inline-block h-2.5 w-2.5 shrink-0 rounded-full animate-pulse' : 'inline-block h-2.5 w-2.5 shrink-0 rounded-full'} style={{ background: statusColor }} />
                        <span className="min-w-0 break-words text-sm font-black text-white" style={{ overflowWrap: 'anywhere' }}>
                          {publication.title || 'Card news'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs" style={{ color: '#8791aa' }}>
                        {publication.kind} · {publication.status} · {publication.created_at ? fmtKST(publication.created_at) : ''}
                      </div>
                    </div>
                    {running && (
                      <button
                        type="button"
                        onClick={() => syncPublication(publication.id).catch(error => setNotice('bad', error.message))}
                        className="shrink-0 rounded px-2 py-1 text-xs font-bold"
                        style={{ background: '#171923', color: '#ffd166', border: '1px solid #2a3040' }}>
                        sync
                      </button>
                    )}
                  </div>
                  {publication.error_message && (
                    <div className="mt-2 break-words text-xs" style={{ color: '#ff8f8f', overflowWrap: 'anywhere' }}>
                      {publication.error_message}
                    </div>
                  )}
                  {pages.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {pages.map(page => (
                        <a key={page.url || page.key || page.page} href={page.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded" style={{ border: '1px solid #2a3040', background: '#05070d' }}>
                          <img src={page.url} alt={`${publication.title || 'card'} ${page.page}p`} className="block w-full" style={{ aspectRatio: '4 / 5', objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {publication.zip_url && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={publication.zip_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded px-3 py-1.5 text-xs font-bold"
                        style={{ background: '#21c17a', color: '#03130c' }}>
                        ZIP 다운로드
                      </a>
                      <button
                        type="button"
                        onClick={() => copyTextToClipboard(publication.zip_url).then(ok => setNotice(ok ? 'good' : 'warn', ok ? 'ZIP URL을 복사했습니다.' : '복사할 URL이 없습니다.'))}
                        className="rounded px-3 py-1.5 text-xs font-bold"
                        style={{ background: '#171923', color: '#cbd3e8', border: '1px solid #2a3040' }}>
                        URL 복사
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 rounded-md p-2" style={{ background: '#080a10', border: '1px solid #202635' }}>
        {CARD_WORKSPACE_MODES.map(mode => {
          const active = cardMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setCardMode(mode.id)}
              className="rounded-md px-3 py-2 text-sm font-bold"
              style={{
                background: active ? '#e8edf7' : '#11141d',
                color: active ? '#05070d' : '#cbd3e8',
                border: active ? '1px solid #e8edf7' : '1px solid #283040',
              }}>
              {mode.label}
            </button>
          );
        })}
      </div>

      {cardMode === ARTICLE_CARD_MODE ? (
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
              <CardSummaryEditor
                value={fields.summary}
                onChange={event => updateField('summary', event.target.value)}
                placeholder="커버 카드에 들어갈 짧은 요약"
              />
            </label>
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <label
                className="block min-w-0"
                style={{ maxWidth: CARD_WORKSPACE_EDITOR_MAX_WIDTH, width: '100%', margin: '0 auto' }}>
                <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>paragraphs</span>
                <CardParagraphEditor
                  value={fields.paragraphs}
                  onChange={event => updateField('paragraphs', event.target.value)}
                  minHeight={CARD_WORKSPACE_TEXTAREA_HEIGHT}
                />
              </label>
              <div
                className="block min-w-0"
                style={{ maxWidth: CARD_WORKSPACE_EDITOR_MAX_WIDTH, width: '100%', margin: '0 auto' }}>
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
              onClick={publishCardNews}
              disabled={!adminToken || !selectedItem || busy || isRenderingZip}
              className="w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-50"
              style={{ background: '#21c17a', color: '#03130c' }}>
              {isRenderingZip ? '발행 중' : '카드뉴스 발행'}
            </button>
          </div>
        </section>

        <CardNewsPreview fields={fields} imageSource={previewSource} />
      </div>
      ) : (
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <TodayFixturesEditor
          value={todayFixtures}
          onChange={setTodayFixtures}
          onRender={publishTodayFixtures}
          disabled={!adminToken || busy}
          rendering={isRenderingZip}
        />
        <TodayFixturesPreview value={todayFixtures} />
      </div>
      )}
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

const CARD_TYPE_OPTIONS = [
  { value: 'schedule', label: '경기 일정' },
  { value: 'today', label: '오늘의 경기' },
  { value: 'result', label: '경기 결과' },
  { value: 'standings', label: '조별리그 순위' },
  { value: 'lineup', label: '선발 라인업' },
];

function newMatch() { return { time: '', home: '', away: '', group: '' }; }
function newDay() { return { date: '', matches: [newMatch()] }; }

function WeeklyScheduleModal({ onClose, onSave, busy }) {
  const [competition, setCompetition] = useState('월드컵 2026 · 조별리그');
  const [period, setPeriod] = useState('');
  const [teamTags, setTeamTags] = useState([]);
  const [days, setDays] = useState([newDay()]);

  const updateDay = (di, field, val) =>
    setDays(prev => prev.map((d, i) => i === di ? { ...d, [field]: val } : d));
  const removeDay = (di) => setDays(prev => prev.filter((_, i) => i !== di));
  const addDay = () => setDays(prev => [...prev, newDay()]);

  const updateMatch = (di, mi, field, val) =>
    setDays(prev => prev.map((d, i) => i !== di ? d : {
      ...d, matches: d.matches.map((m, j) => j === mi ? { ...m, [field]: val } : m),
    }));
  const removeMatch = (di, mi) =>
    setDays(prev => prev.map((d, i) => i !== di ? d : {
      ...d, matches: d.matches.filter((_, j) => j !== mi),
    }));
  const addMatch = (di) =>
    setDays(prev => prev.map((d, i) => i !== di ? d : { ...d, matches: [...d.matches, newMatch()] }));

  const canSave = period.trim() && days.some(d => d.date.trim() && d.matches.some(m => m.home.trim() && m.away.trim()));

  const inputCls = 'rounded px-2 py-1 text-xs outline-none';
  const inputStyle = { background: '#11141d', color: '#fff', border: '1px solid #283040' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-xl min-w-0 overflow-auto rounded-xl p-5"
        style={{ background: '#0f1118', border: '1px solid #2a3040' }}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-black text-white">이번주 경기 일정</span>
          <button onClick={onClose} style={{ color: '#687086' }}>✕</button>
        </div>

        {/* 대회명·기간 */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>대회명</span>
            <input value={competition} onChange={e => setCompetition(e.target.value)}
              className={`w-full ${inputCls}`} style={inputStyle} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>기간 *</span>
            <input value={period} onChange={e => setPeriod(e.target.value)}
              placeholder="6월 11일 ~ 6월 14일"
              className={`w-full ${inputCls}`} style={inputStyle} />
          </label>
        </div>

        {/* 팀 태그 */}
        <div className="mb-3">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>팀 태그</span>
          <div className="flex flex-wrap gap-1.5">
            {TEAM_OPTIONS.map(team => {
              const active = teamTags.includes(team);
              return (
                <button key={team} type="button"
                  onClick={() => setTeamTags(active ? teamTags.filter(t => t !== team) : [...teamTags, team])}
                  className="rounded px-2 py-0.5 text-xs font-black"
                  style={{ background: active ? '#1e3a5f' : '#11141d', color: active ? '#60a5fa' : '#4a5568', border: active ? '1px solid #3b82f6' : '1px solid #283040' }}>
                  {team}
                </button>
              );
            })}
          </div>
        </div>

        {/* 날짜별 경기 */}
        <div className="mb-3 space-y-3">
          <span className="block text-xs font-bold uppercase" style={{ color: '#687086' }}>경기 일정</span>
          {days.map((day, di) => (
            <div key={di} className="rounded-lg p-3" style={{ background: '#080a10', border: '1px solid #1c2230' }}>
              <div className="mb-2 flex items-center gap-2">
                <input value={day.date} onChange={e => updateDay(di, 'date', e.target.value)}
                  placeholder="6월 11일 (수)"
                  className={`flex-1 ${inputCls}`} style={inputStyle} />
                {days.length > 1 && (
                  <button onClick={() => removeDay(di)} className="text-xs px-2 py-1 rounded"
                    style={{ background: '#2a1115', color: '#f87171' }}>날짜 삭제</button>
                )}
              </div>
              {day.matches.map((m, mi) => (
                <div key={mi} className="mb-1.5 flex items-center gap-1.5">
                  <input value={m.time} onChange={e => updateMatch(di, mi, 'time', e.target.value)}
                    placeholder="09:00" className={`w-14 ${inputCls}`} style={inputStyle} />
                  <input value={m.home} onChange={e => updateMatch(di, mi, 'home', e.target.value)}
                    placeholder="홈팀" className={`flex-1 ${inputCls}`} style={inputStyle} />
                  <span className="text-xs" style={{ color: '#4a4a6a' }}>vs</span>
                  <input value={m.away} onChange={e => updateMatch(di, mi, 'away', e.target.value)}
                    placeholder="원정팀" className={`flex-1 ${inputCls}`} style={inputStyle} />
                  <input value={m.group} onChange={e => updateMatch(di, mi, 'group', e.target.value)}
                    placeholder="조" className={`w-10 ${inputCls}`} style={inputStyle} />
                  {day.matches.length > 1 && (
                    <button onClick={() => removeMatch(di, mi)} style={{ color: '#f87171', fontSize: '14px' }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => addMatch(di)}
                className="mt-1 text-xs px-2 py-1 rounded"
                style={{ background: '#0d2a1a', color: '#34d399' }}>+ 경기 추가</button>
            </div>
          ))}
          <button onClick={addDay}
            className="w-full rounded py-1.5 text-xs font-bold"
            style={{ background: '#11141d', color: '#687086', border: '1px dashed #283040' }}>+ 날짜 추가</button>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-bold"
            style={{ background: '#171923', color: '#a8b0c7', border: '1px solid #2a3040' }}>취소</button>
          <button disabled={busy || !canSave}
            onClick={() => onSave({ competition, period, days, team_tags: teamTags })}
            className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
            style={{ background: '#1f6f4a', color: '#fff' }}>발행</button>
        </div>
      </div>
    </div>
  );
}

function fmtKickoff(iso) {
  const k = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][k.getUTCDay()];
  return `${k.getUTCMonth() + 1}/${k.getUTCDate()}(${dow}) ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`;
}

function MatchManagerModal({ adminToken, headers, onClose, onMessage }) {
  const [matches, setMatches] = useState(null);
  const [busy, setBusy] = useState(false);
  // 입력 폼
  const [competition, setCompetition] = useState('월드컵 2026 · 조별리그');
  const [date, setDate] = useState('');       // yyyy-mm-dd
  const [time, setTime] = useState('');       // hh:mm
  const [home, setHome] = useState('');
  const [homeFlag, setHomeFlag] = useState('');
  const [away, setAway] = useState('');
  const [awayFlag, setAwayFlag] = useState('');
  const [group, setGroup] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/matches?range=all', { headers });
      const data = await res.json();
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch { setMatches([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // KST 날짜+시간 → UTC ISO
  const toIso = () => {
    if (!date || !time) return null;
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    return new Date(Date.UTC(y, mo - 1, d, h, mi) - 9 * 60 * 60 * 1000).toISOString();
  };

  const canAdd = date && time && home.trim() && away.trim();

  const addMatch = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST', headers,
        body: JSON.stringify({
          competition, kickoff_at: toIso(),
          home_team: home.trim(), away_team: away.trim(),
          home_flag: homeFlag.trim() || null, away_flag: awayFlag.trim() || null,
          group_name: group.trim() || null,
          home_score: homeScore === '' ? null : Number(homeScore),
          away_score: awayScore === '' ? null : Number(awayScore),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '경기 추가 실패');
      setHome(''); setAway(''); setHomeFlag(''); setAwayFlag(''); setGroup(''); setHomeScore(''); setAwayScore('');
      await load();
      onMessage('good', '경기가 추가됐습니다.');
    } catch (e) { onMessage('bad', e.message); } finally { setBusy(false); }
  };

  const removeMatch = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/matches?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '삭제 실패'); }
      await load();
    } catch (e) { onMessage('bad', e.message); } finally { setBusy(false); }
  };

  const inputCls = 'rounded px-2 py-1 text-xs outline-none';
  const inputStyle = { background: '#11141d', color: '#fff', border: '1px solid #283040' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl min-w-0 overflow-auto rounded-xl p-5"
        style={{ background: '#0f1118', border: '1px solid #2a3040' }}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-black text-white">경기 관리</span>
          <button onClick={onClose} style={{ color: '#687086' }}>✕</button>
        </div>

        {/* 입력 폼 */}
        <div className="mb-4 rounded-lg p-3 space-y-2" style={{ background: '#080a10', border: '1px solid #1c2230' }}>
          <input value={competition} onChange={e => setCompetition(e.target.value)}
            placeholder="대회명" className={`w-full ${inputCls}`} style={inputStyle} />
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={`flex-1 ${inputCls}`} style={inputStyle} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className={`flex-1 ${inputCls}`} style={inputStyle} />
            <input value={group} onChange={e => setGroup(e.target.value)}
              placeholder="조 (F조)" className={`w-20 ${inputCls}`} style={inputStyle} />
          </div>
          <div className="flex items-center gap-1.5">
            <input value={homeFlag} onChange={e => setHomeFlag(e.target.value)} placeholder="🇰🇷" className={`w-12 text-center ${inputCls}`} style={inputStyle} />
            <input value={home} onChange={e => setHome(e.target.value)} placeholder="홈팀" className={`flex-1 ${inputCls}`} style={inputStyle} />
            <input value={homeScore} onChange={e => setHomeScore(e.target.value)} placeholder="-" className={`w-10 text-center ${inputCls}`} style={inputStyle} />
            <span className="text-xs" style={{ color: '#4a4a6a' }}>:</span>
            <input value={awayScore} onChange={e => setAwayScore(e.target.value)} placeholder="-" className={`w-10 text-center ${inputCls}`} style={inputStyle} />
            <input value={away} onChange={e => setAway(e.target.value)} placeholder="원정팀" className={`flex-1 ${inputCls}`} style={inputStyle} />
            <input value={awayFlag} onChange={e => setAwayFlag(e.target.value)} placeholder="🇨🇿" className={`w-12 text-center ${inputCls}`} style={inputStyle} />
          </div>
          <div className="flex justify-end">
            <button disabled={busy || !canAdd} onClick={addMatch}
              className="rounded px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              style={{ background: '#0d2a1a', color: '#34d399' }}>+ 경기 추가</button>
          </div>
          <div className="text-xs" style={{ color: '#3a3a5a' }}>스코어 입력 시 자동으로 '종료' 처리됩니다.</div>
        </div>

        {/* 등록된 경기 목록 */}
        <div className="text-xs font-bold uppercase mb-2" style={{ color: '#687086' }}>
          등록된 경기 {matches ? `(${matches.length})` : ''}
        </div>
        <div className="space-y-1">
          {matches === null ? (
            <div className="text-xs py-4 text-center" style={{ color: '#3a3a5a' }}>불러오는 중…</div>
          ) : matches.length === 0 ? (
            <div className="text-xs py-4 text-center" style={{ color: '#3a3a5a' }}>등록된 경기가 없습니다</div>
          ) : matches.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded px-3 py-2 text-xs"
              style={{ background: '#0b0d14', border: '1px solid #141420' }}>
              <span className="w-28 shrink-0" style={{ color: '#687086' }}>{fmtKickoff(m.kickoff_at)}</span>
              <span className="flex-1 text-right text-white truncate">{m.home_flag} {m.home_team}</span>
              <span className="shrink-0 font-black" style={{ color: m.home_score != null ? '#fff' : '#1e1e38' }}>
                {m.home_score != null ? `${m.home_score}:${m.away_score}` : 'vs'}
              </span>
              <span className="flex-1 text-white truncate">{m.away_team} {m.away_flag}</span>
              {m.group_name && <span className="w-8 shrink-0 text-right" style={{ color: '#252540' }}>{m.group_name}</span>}
              <button disabled={busy} onClick={() => removeMatch(m.id)}
                className="shrink-0 px-1.5 rounded" style={{ color: '#f87171' }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomCardModal({ onClose, onSave, busy }) {
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [cardType, setCardType] = useState('schedule');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamTags, setTeamTags] = useState([]);
  const [withDebate, setWithDebate] = useState(false);
  const [question, setQuestion] = useState('');
  const [forLabel, setForLabel] = useState('');
  const [againstLabel, setAgainstLabel] = useState('');

  const onPickFiles = (picked) => {
    const arr = Array.from(picked).slice(0, 5);
    setFiles(arr);
    setPreviewUrls(arr.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
  };

  const canSave = Boolean(files.length > 0 && title.trim() && cardType)
    && (!withDebate || (question.trim() && forLabel.trim() && againstLabel.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-lg min-w-0 overflow-auto rounded-xl p-6" style={{ background: '#0f1118', border: '1px solid #2a3040' }}>
        <div className="mb-4 text-lg font-black text-white">콘텐츠 직접 올리기</div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>이미지 * (최대 5장)</span>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple
            onChange={e => onPickFiles(e.target.files || [])}
            className="w-full text-sm" style={{ color: '#a8b0c7' }} />
        </label>
        {previewUrls.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative shrink-0">
                <img src={url} alt={`preview-${i}`} className="h-24 w-24 rounded-md object-cover"
                  style={{ border: '1px solid #283040' }} />
                <button onClick={() => removeFile(i)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-black"
                  style={{ background: '#e63946', color: '#fff' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>유형 *</span>
          <select value={cardType} onChange={e => setCardType(e.target.value)}
            className="w-full rounded-md px-3 py-2 text-sm font-bold outline-none"
            style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }}>
            {CARD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>제목 *</span>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="예: 이번주 경기 일정"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>설명</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="카드 설명/캡션"
            className="w-full rounded-md px-3 py-2 text-sm leading-6 outline-none"
            style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
        </label>

        <div className="mb-3">
          <span className="mb-1 block text-xs font-bold uppercase" style={{ color: '#687086' }}>팀 태그</span>
          <div className="flex flex-wrap gap-1.5">
            {TEAM_OPTIONS.map(team => {
              const active = teamTags.includes(team);
              return (
                <button key={team} type="button"
                  onClick={() => setTeamTags(active ? teamTags.filter(t => t !== team) : [...teamTags, team])}
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

        <label className="mb-3 flex items-center gap-2">
          <input type="checkbox" checked={withDebate} onChange={e => setWithDebate(e.target.checked)} />
          <span className="text-sm font-bold" style={{ color: '#cbd3e8' }}>논쟁 추가</span>
        </label>
        {withDebate && (
          <div className="mb-3 space-y-3 rounded-md p-3" style={{ background: '#0b0d14', border: '1px solid #202635' }}>
            <input value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="논쟁 질문 *"
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
            <div className="grid grid-cols-2 gap-3">
              <input value={forLabel} onChange={e => setForLabel(e.target.value)} placeholder="선택지 A *"
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
              <input value={againstLabel} onChange={e => setAgainstLabel(e.target.value)} placeholder="선택지 B *"
                className="w-full rounded-md px-3 py-2 text-sm outline-none"
                style={{ background: '#11141d', color: '#fff', border: '1px solid #283040' }} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-bold"
            style={{ background: '#171923', color: '#a8b0c7', border: '1px solid #2a3040' }}>
            취소
          </button>
          <button disabled={busy || !canSave}
            onClick={() => onSave({
              files, card_type: cardType, title: title.trim(), description: description.trim(),
              team_tags: teamTags,
              debate_question: withDebate ? question.trim() : null,
              vote_for_label: withDebate ? forLabel.trim() : null,
              vote_against_label: withDebate ? againstLabel.trim() : null,
            })}
            className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
            style={{ background: '#1f6f4a', color: '#fff' }}>
            발행
          </button>
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
  const [customModal, setCustomModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [matchModal, setMatchModal] = useState(false);
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

  const customCreate = async (form) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const fileList = form.files || (form.file ? [form.file] : []);
      if (fileList.length === 0) throw new Error('이미지를 선택해 주세요.');

      const imageUrls = await Promise.all(fileList.map(async (f) => {
        const up = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': f.type },
          body: f,
        });
        const upData = await readJsonResponse(up);
        if (!up.ok) throw new Error(upData.error || 'Image upload failed');
        return upData.url;
      }));

      const response = await fetch('/api/admin/custom', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_urls: imageUrls,
          card_type: form.card_type,
          title: form.title,
          description: form.description,
          team_tags: form.team_tags,
          debate_question: form.debate_question || null,
          vote_for_label: form.vote_for_label || null,
          vote_against_label: form.vote_against_label || null,
          actor: 'admin-ui',
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Custom card create failed');
      setCustomModal(false);
      setMessageTone('good');
      setMessage('커스텀 카드가 발행됐습니다.');
      await loadItems({ preserveMessage: true });
    } catch (error) {
      setMessageTone('bad');
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const scheduleCreate = async (form) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/custom', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          card_data: { competition: form.competition, period: form.period, days: form.days },
          card_type: 'schedule',
          title: `이번주 경기 일정 · ${form.period}`,
          description: form.competition,
          team_tags: form.team_tags || [],
          actor: 'admin-ui',
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || 'Schedule card create failed');
      setScheduleModal(false);
      setMessageTone('good');
      setMessage('이번주 경기 일정이 발행됐습니다.');
      await loadItems({ preserveMessage: true });
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
      {customModal && (
        <CustomCardModal
          busy={busy}
          onClose={() => setCustomModal(false)}
          onSave={customCreate}
        />
      )}
      {scheduleModal && (
        <WeeklyScheduleModal
          busy={busy}
          onClose={() => setScheduleModal(false)}
          onSave={scheduleCreate}
        />
      )}
      {matchModal && (
        <MatchManagerModal
          adminToken={adminToken}
          headers={headers}
          onClose={() => setMatchModal(false)}
          onMessage={(tone, msg) => { setMessageTone(tone); setMessage(msg); }}
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
            <button onClick={() => setCustomModal(true)} disabled={busy || !adminToken}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#1f6f4a', color: '#fff' }}>
              직접 올리기
            </button>
            <button onClick={() => setMatchModal(true)} disabled={busy || !adminToken}
              className="rounded-md px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: '#1a2a4a', color: '#60a5fa', border: '1px solid #1e3a5f' }}>
              경기 관리
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
