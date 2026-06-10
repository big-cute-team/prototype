alter table public.card_news_publications
  drop constraint if exists card_news_publications_status_check;

alter table public.card_news_publications
  add constraint card_news_publications_status_check
  check (status in ('pending', 'queued', 'running', 'zip_pending', 'completed', 'failed'));

alter table public.card_news_publications
  add column if not exists instagram_pages jsonb not null default '[]'::jsonb,
  add column if not exists instagram_status text not null default 'idle',
  add column if not exists instagram_media_id text,
  add column if not exists instagram_permalink text,
  add column if not exists instagram_caption text,
  add column if not exists instagram_error text,
  add column if not exists instagram_published_at timestamptz;

alter table public.card_news_publications
  drop constraint if exists card_news_publications_instagram_status_check;

alter table public.card_news_publications
  add constraint card_news_publications_instagram_status_check
  check (instagram_status in ('idle', 'publishing', 'published', 'failed'));

create index if not exists card_news_publications_instagram_status_idx
  on public.card_news_publications (instagram_status, created_at desc);
