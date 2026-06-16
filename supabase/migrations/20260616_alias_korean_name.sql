-- 매칭된 alias 행이 곧바로 인물의 한국어 표준 표기를 들고 오도록 컬럼 추가.
-- (notes는 역할 설명이라 인물 키로 쓸 수 없어 별도 컬럼이 필요하다.)
alter table public.team_aliases
  add column if not exists korean_name text;
