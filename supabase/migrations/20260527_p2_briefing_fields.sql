alter table public.sources
  add column if not exists notes text;

alter table public.team_aliases
  add column if not exists notes text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.content_items
  add column if not exists briefing_status text not null default 'UPDATE',
  add column if not exists review_reason text,
  add column if not exists summary_short_ko text,
  add column if not exists summary_detail_ko text;

update public.content_items
set
  summary_short_ko = coalesce(summary_short_ko, summary_ko, ai_result #>> '{briefing,summary_short}'),
  summary_detail_ko = coalesce(summary_detail_ko, ai_result #>> '{briefing,summary_detail}', summary_ko),
  briefing_status = case
    when upper(ai_result #>> '{briefing,status}') in ('OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED')
      then upper(ai_result #>> '{briefing,status}')
    when upper(ai_result #>> '{briefing,status}') = 'RUMOR'
      then 'RUMOUR'
    when news_type = 'official'
      then 'CONFIRMED'
    when news_type = 'rumour'
      then 'RUMOUR'
    else 'UPDATE'
  end,
  review_reason = coalesce(review_reason, ai_result ->> 'review_reason')
where
  summary_short_ko is null
  or summary_detail_ko is null
  or review_reason is null
  or briefing_status = 'UPDATE';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_items_briefing_status_check'
      and conrelid = 'public.content_items'::regclass
  ) then
    alter table public.content_items
      add constraint content_items_briefing_status_check
      check (briefing_status in ('OFFICIAL', 'CONFIRMED', 'UPDATE', 'RUMOUR', 'DENIED')) not valid;
  end if;
end $$;

alter table public.content_items validate constraint content_items_briefing_status_check;

create unique index if not exists idx_content_items_raw_post_id_unique
  on public.content_items(raw_post_id);

create index if not exists idx_content_items_source_raw_post
  on public.content_items(source_id, raw_post_id);
