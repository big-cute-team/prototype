-- P5: BBC Match of the Day (@BBCMOTD) source 추가
-- x_user_id는 https://tweeterid.com 에서 BBCMOTD 검색 후 채울 것

insert into public.sources (handle, x_user_id, name, tier, active, notes)
values (
  'BBCMOTD',
  '384951307',
  'Match of the Day',
  1,
  true,
  'BBC Sport 공식 Match of the Day 계정.'
)
on conflict (handle) do update set
  x_user_id  = coalesce(excluded.x_user_id, public.sources.x_user_id),
  name       = excluded.name,
  tier       = excluded.tier,
  active     = excluded.active,
  notes      = excluded.notes,
  updated_at = now();
