create extension if not exists pgcrypto;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  x_user_id text unique,
  name text,
  tier integer not null default 2,
  active boolean not null default true,
  notes text,
  last_seen_post_id text,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_aliases (
  id uuid primary key default gen_random_uuid(),
  team_code text not null check (team_code in ('MUN', 'MCI', 'LIV', 'ARS', 'TOT', 'CHE')),
  alias text not null,
  entity_type text not null default 'club' check (entity_type in ('club', 'player', 'manager', 'journalist_hint', 'keyword')),
  active boolean not null default true,
  notes text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_code, alias)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  raw_post_id text not null,
  raw_url text,
  raw_text text not null,
  raw_created_at timestamptz,
  raw_author_handle text,
  raw_author_name text,
  raw_public_metrics jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  ai_result jsonb not null default '{}'::jsonb,
  team_tags text[] not null default '{}',
  briefing_status text not null default 'UPDATE' check (briefing_status in ('OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED')),
  news_type text not null default 'ambiguous' check (news_type in ('official', 'rumour', 'ambiguous', 'irrelevant')),
  status text not null default 'review' check (status in ('published', 'review', 'discarded', 'rejected')),
  confidence numeric(4,3) not null default 0,
  review_reason text,
  title_ko text,
  summary_short_ko text,
  summary_detail_ko text,
  summary_ko text,
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (raw_post_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  content_item_id uuid references public.content_items(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  actor text not null default 'system',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.card_news_publications (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.content_items(id) on delete set null,
  kind text not null check (kind in ('article', 'today_fixtures')),
  status text not null default 'pending' check (status in ('pending', 'queued', 'running', 'completed', 'failed')),
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

create table if not exists public.world_cup_fixtures (
  id uuid primary key default gen_random_uuid(),
  api_fixture_id bigint not null unique,
  season integer not null default 2026,
  league_id integer not null default 1,
  round text,
  group_label text,
  kickoff_at timestamptz not null,
  kickoff_date_kst date not null,
  kickoff_time_kst text not null,
  home_team_id bigint,
  home_team_name_api text,
  home_team_name_ko text,
  home_code text,
  home_flag_url text,
  home_logo_url text,
  away_team_id bigint,
  away_team_name_api text,
  away_team_name_ko text,
  away_code text,
  away_flag_url text,
  away_logo_url text,
  venue_name_api text,
  venue_name_ko text,
  venue_city_api text,
  venue_city_ko text,
  status_short text,
  status_long text,
  home_score integer,
  away_score integer,
  last_schedule_synced_at timestamptz,
  last_result_synced_at timestamptz,
  raw_fixture jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sources_active on public.sources(active, tier, handle);
create index if not exists idx_content_items_status_created on public.content_items(status, created_at desc);
create index if not exists idx_content_items_published on public.content_items(published_at desc) where status = 'published';
create index if not exists idx_content_items_team_tags on public.content_items using gin(team_tags);
create index if not exists idx_content_items_source_raw_post on public.content_items(source_id, raw_post_id);
create index if not exists idx_team_aliases_active on public.team_aliases(active, team_code, alias);
create index if not exists idx_audit_events_created on public.audit_events(created_at desc);
create index if not exists idx_card_news_publications_created on public.card_news_publications(created_at desc);
create index if not exists idx_card_news_publications_content_item on public.card_news_publications(content_item_id, created_at desc);
create index if not exists idx_card_news_publications_status on public.card_news_publications(status, created_at desc);
create index if not exists idx_world_cup_fixtures_kickoff_date on public.world_cup_fixtures(kickoff_date_kst, kickoff_time_kst);
create index if not exists idx_world_cup_fixtures_status on public.world_cup_fixtures(status_short);
create index if not exists idx_world_cup_fixtures_sync on public.world_cup_fixtures(last_schedule_synced_at desc, last_result_synced_at desc);

alter table public.sources enable row level security;
alter table public.team_aliases enable row level security;
alter table public.content_items enable row level security;
alter table public.audit_events enable row level security;
alter table public.card_news_publications enable row level security;
alter table public.world_cup_fixtures enable row level security;

insert into public.team_aliases (team_code, alias, entity_type) values
  ('MUN', 'Manchester United', 'club'),
  ('MUN', 'Man Utd', 'club'),
  ('MUN', 'Man United', 'club'),
  ('MUN', 'MUFC', 'club'),
  ('MUN', 'Red Devils', 'club'),
  ('MUN', '맨유', 'club'),
  ('MUN', '맨체스터 유나이티드', 'club'),
  ('MCI', 'Manchester City', 'club'),
  ('MCI', 'Man City', 'club'),
  ('MCI', 'MCFC', 'club'),
  ('MCI', '맨시티', 'club'),
  ('MCI', '맨체스터 시티', 'club'),
  ('LIV', 'Liverpool', 'club'),
  ('LIV', 'LFC', 'club'),
  ('LIV', '리버풀', 'club'),
  ('ARS', 'Arsenal', 'club'),
  ('ARS', 'Gunners', 'club'),
  ('ARS', '아스날', 'club'),
  ('ARS', '아스널', 'club'),
  ('TOT', 'Tottenham', 'club'),
  ('TOT', 'Tottenham Hotspur', 'club'),
  ('TOT', 'Spurs', 'club'),
  ('TOT', 'THFC', 'club'),
  ('TOT', '토트넘', 'club'),
  ('CHE', 'Chelsea', 'club'),
  ('CHE', 'CFC', 'club'),
  ('CHE', '첼시', 'club')
on conflict (team_code, alias) do nothing;
