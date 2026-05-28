insert into public.sources (handle, x_user_id, name, tier, active, notes) values
  ('FabrizioRomano', null, 'Fabrizio Romano', 1, true, '예시 source. 실제 운영 전 계정/권한을 확인한다.'),
  ('David_Ornstein', null, 'David Ornstein', 1, true, '예시 source. 실제 운영 전 계정/권한을 확인한다.'),
  ('SkySportsNews', null, 'Sky Sports News', 2, true, '예시 source. 실제 운영 전 계정/권한을 확인한다.')
on conflict (handle) do update set
  x_user_id = coalesce(excluded.x_user_id, public.sources.x_user_id),
  name = excluded.name,
  tier = excluded.tier,
  active = excluded.active,
  notes = excluded.notes,
  updated_at = now();
