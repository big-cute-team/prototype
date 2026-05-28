-- P6: 논쟁 게시글 전환을 위한 컬럼 추가
alter table public.content_items
  add column if not exists debate_question    text,
  add column if not exists vote_for_label     text,
  add column if not exists vote_against_label text;
