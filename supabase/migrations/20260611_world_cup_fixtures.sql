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

create index if not exists idx_world_cup_fixtures_kickoff_date on public.world_cup_fixtures(kickoff_date_kst, kickoff_time_kst);
create index if not exists idx_world_cup_fixtures_status on public.world_cup_fixtures(status_short);
create index if not exists idx_world_cup_fixtures_sync on public.world_cup_fixtures(last_schedule_synced_at desc, last_result_synced_at desc);

alter table public.world_cup_fixtures enable row level security;
