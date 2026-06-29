-- 2026-06-29: 새 설계(21테이블)에 UI 필수 컬럼 2개 보강
--
-- 배경: 구 content_items에는 raw_url(원문 링크)·media(이미지)가 있었으나,
-- 새 raw_articles/article_summaries 설계에는 자리가 없어 UI 기능이 깨짐.
--   - 원문 링크: 기획서 4.4 "원문 링크 항상 제공" = 신뢰도 철학의 핵심 기능
--   - 카드 이미지: 숏폼 카드 표시용
-- 설계 정본(RDB 문서 3.1 raw_articles / 3.2 article_summaries)도 함께 갱신함.

-- 원문 링크: 원문(트윗) 단위이므로 raw_articles에 둔다.
alter table public.raw_articles
  add column if not exists source_url text;

-- 카드 대표 이미지: 요약 카드 표시용. 값은 운영 중 직접 입력(백필 대상 아님).
alter table public.article_summaries
  add column if not exists image_url text;
