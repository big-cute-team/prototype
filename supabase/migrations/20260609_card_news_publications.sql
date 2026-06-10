create table if not exists public.card_news_publications (
  id uuid primary key,
  content_item_id uuid references public.content_items(id) on delete set null,
  kind text not null check (kind in ('article', 'today_fixtures')),
  status text not null check (status in ('pending', 'queued', 'running', 'completed', 'failed')),
  render_job_id text,
  template_id text not null,
  title text not null,
  caption text,
  source_payload jsonb not null default '{}'::jsonb,
  pages jsonb not null default '[]'::jsonb,
  zip_url text,
  r2_prefix text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists card_news_publications_created_at_idx
  on public.card_news_publications (created_at desc);

create index if not exists card_news_publications_content_item_id_idx
  on public.card_news_publications (content_item_id);

create index if not exists card_news_publications_status_idx
  on public.card_news_publications (status);
