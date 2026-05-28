-- P4: 선수/감독/임원 alias 등록 (big6_aliases.json 기반)
-- 트윗 본문에서 팀 추정에 사용

alter table public.team_aliases
  drop constraint if exists team_aliases_entity_type_check;
alter table public.team_aliases
  add constraint team_aliases_entity_type_check
  check (entity_type in ('club', 'player', 'manager', 'executive', 'journalist_hint', 'keyword'));

insert into public.team_aliases (team_code, alias, entity_type, active, notes, last_verified_at) values

-- MAN UTD
  ('MUN', 'Onana',            'player', false, '임대 신분, 맨유 방출 희망', '2026-05-27'),
  ('MUN', 'Andre Onana',      'player', false, '임대 신분, 맨유 방출 희망', '2026-05-27'),
  ('MUN', 'André Onana',      'player', false, '임대 신분, 맨유 방출 희망', '2026-05-27'),
  ('MUN', '오나나',            'player', false, '임대 신분, 맨유 방출 희망', '2026-05-27'),
  ('MUN', 'Onanna',           'player', false, '임대 신분, 맨유 방출 희망', '2026-05-27'),

  ('MUN', 'Maguire',          'player', true, '맨유 센터백, 1년 재계약 체결. 커리어 부활 중', '2026-05-27'),
  ('MUN', 'Harry Maguire',   'player', true, '맨유 센터백, 1년 재계약 체결. 커리어 부활 중', '2026-05-27'),
  ('MUN', '해리 매과이어',    'player', true, '맨유 센터백, 1년 재계약 체결. 커리어 부활 중', '2026-05-27'),

  ('MUN', 'De Ligt',          'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Matthijs de Ligt', 'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Matthijs De Ligt', 'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', '데 리흐트',         'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'de ligt',          'player', true, '맨유 센터백', '2026-05-27'),

  ('MUN', 'Yoro',             'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Leny Yoro',        'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', '요로',              'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Yoros',            'player', true, '맨유 센터백', '2026-05-27'),

  ('MUN', 'Mazraoui',         'player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', 'Noussair Mazraoui','player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', '마즈라위',          'player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', 'Mazraui',          'player', true, '맨유 풀백', '2026-05-27'),

  ('MUN', 'Dorgu',            'player', true, '맨유 좌측 풀백', '2026-05-27'),
  ('MUN', 'Patrick Dorgu',    'player', true, '맨유 좌측 풀백', '2026-05-27'),
  ('MUN', '도르구',            'player', true, '맨유 좌측 풀백', '2026-05-27'),

  ('MUN', 'Bruno Fernandes',  'player', true, '맨유 주장, 미드필더', '2026-05-27'),
  ('MUN', 'Bruno',            'player', true, '맨유 주장, 미드필더', '2026-05-27'),
  ('MUN', 'Fernandes',        'player', true, '맨유 주장, 미드필더', '2026-05-27'),
  ('MUN', '브루누 페르난데스', 'player', true, '맨유 주장, 미드필더', '2026-05-27'),
  ('MUN', 'Bruno Fernandez',  'player', true, '맨유 주장, 미드필더', '2026-05-27'),

  ('MUN', 'Mainoo',           'player', true, '맨유 중앙 미드필더', '2026-05-27'),
  ('MUN', 'Kobbie Mainoo',    'player', true, '맨유 중앙 미드필더', '2026-05-27'),
  ('MUN', '마이누',            'player', true, '맨유 중앙 미드필더', '2026-05-27'),
  ('MUN', 'Mainou',           'player', true, '맨유 중앙 미드필더', '2026-05-27'),

  ('MUN', 'Cunha',            'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', 'Matheus Cunha',    'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', '쿠냐',              'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', 'Cunya',            'player', true, '맨유 공격수', '2026-05-27'),

  ('MUN', 'Sesko',            'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', 'Benjamin Sesko',   'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', 'Benjamin Šeško',   'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', '세슈코',            'player', true, '맨유 공격수', '2026-05-27'),
  ('MUN', 'Sesco',            'player', true, '맨유 공격수', '2026-05-27'),

  ('MUN', 'Amad',             'player', true, '맨유 윙어', '2026-05-27'),
  ('MUN', 'Amad Diallo',      'player', true, '맨유 윙어', '2026-05-27'),
  ('MUN', 'Diallo',           'player', true, '맨유 윙어', '2026-05-27'),
  ('MUN', '아마드 디알로',     'player', true, '맨유 윙어', '2026-05-27'),
  ('MUN', '아마드',            'player', true, '맨유 윙어', '2026-05-27'),

  ('MUN', 'Lammens',          'player', true, '맨유 주전 골키퍼', '2026-05-27'),
  ('MUN', 'Senne Lammens',    'player', true, '맨유 주전 골키퍼', '2026-05-27'),
  ('MUN', '라멘스',            'player', true, '맨유 주전 골키퍼', '2026-05-27'),

  ('MUN', 'Lisandro Martinez',  'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Lisandro Martínez',  'player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Martinez',           'player', true, '맨유 센터백 (Lautaro 등 다른 Martinez와 구분 주의)', '2026-05-27'),
  ('MUN', '리산드로 마르티네스','player', true, '맨유 센터백', '2026-05-27'),
  ('MUN', 'Licha',              'player', true, '맨유 센터백', '2026-05-27'),

  ('MUN', 'Dalot',            'player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', 'Diogo Dalot',      'player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', '달롯',              'player', true, '맨유 풀백', '2026-05-27'),
  ('MUN', '디오구 달롯',       'player', true, '맨유 풀백', '2026-05-27'),

  ('MUN', 'Luke Shaw',        'player', true, '맨유 좌측 풀백', '2026-05-27'),
  ('MUN', 'Shaw',             'player', true, '맨유 좌측 풀백', '2026-05-27'),
  ('MUN', '루크 쇼',           'player', true, '맨유 좌측 풀백', '2026-05-27'),

  ('MUN', 'Mount',            'player', true, '맨유 미드필더', '2026-05-27'),
  ('MUN', 'Mason Mount',      'player', true, '맨유 미드필더', '2026-05-27'),
  ('MUN', '마운트',            'player', true, '맨유 미드필더', '2026-05-27'),
  ('MUN', '메이슨 마운트',     'player', true, '맨유 미드필더', '2026-05-27'),

  ('MUN', 'Mbeumo',           'player', true, '맨유 윙어 (2025 영입)', '2026-05-27'),
  ('MUN', 'Bryan Mbeumo',     'player', true, '맨유 윙어 (2025 영입)', '2026-05-27'),
  ('MUN', '음뵈모',            'player', true, '맨유 윙어 (2025 영입)', '2026-05-27'),
  ('MUN', 'Mbuemo',           'player', true, '맨유 윙어 (2025 영입)', '2026-05-27'),

  ('MUN', 'Heaven',           'player', true, '맨유 수비수', '2026-05-27'),
  ('MUN', 'Ayden Heaven',     'player', true, '맨유 수비수', '2026-05-27'),
  ('MUN', '헤븐',              'player', true, '맨유 수비수', '2026-05-27'),

  ('MUN', 'Rashford',         'player', false, '바르셀로나 임대 중, 맨유에서 뛰지 않음', '2026-05-27'),
  ('MUN', 'Marcus Rashford',  'player', false, '바르셀로나 임대 중, 맨유에서 뛰지 않음', '2026-05-27'),
  ('MUN', '래시포드',          'player', false, '바르셀로나 임대 중, 맨유에서 뛰지 않음', '2026-05-27'),
  ('MUN', 'Rashfold',         'player', false, '바르셀로나 임대 중, 맨유에서 뛰지 않음', '2026-05-27'),

  ('MUN', 'Michael Carrick',  'manager', true, '맨유 임시 감독 (2026년 1월 아모림 경질 후)', '2026-05-27'),
  ('MUN', 'Carrick',          'manager', true, '맨유 임시 감독', '2026-05-27'),
  ('MUN', '캐릭',              'manager', true, '맨유 임시 감독', '2026-05-27'),
  ('MUN', '마이클 캐릭',       'manager', true, '맨유 임시 감독', '2026-05-27'),
  ('MUN', 'Carrik',           'manager', true, '맨유 임시 감독', '2026-05-27'),

  ('MUN', 'Jason Wilcox',     'executive', true, '맨유 테크니컬 디렉터', '2026-05-27'),
  ('MUN', 'Wilcox',           'executive', true, '맨유 테크니컬 디렉터', '2026-05-27'),
  ('MUN', '윌콕스',            'executive', true, '맨유 테크니컬 디렉터', '2026-05-27'),
  ('MUN', '제이슨 윌콕스',     'executive', true, '맨유 테크니컬 디렉터', '2026-05-27'),

-- MAN CITY
  ('MCI', 'Donnarumma',           'player', true, '맨시티 골키퍼', '2026-05-27'),
  ('MCI', 'Gianluigi Donnarumma', 'player', true, '맨시티 골키퍼', '2026-05-27'),
  ('MCI', '돈나룸마',              'player', true, '맨시티 골키퍼', '2026-05-27'),
  ('MCI', 'Donnaruma',            'player', true, '맨시티 골키퍼', '2026-05-27'),
  ('MCI', 'Gigio',                'player', true, '맨시티 골키퍼', '2026-05-27'),

  ('MCI', 'Dias',                 'player', true, '맨시티 센터백', '2026-05-27'),
  ('MCI', 'Ruben Dias',           'player', true, '맨시티 센터백', '2026-05-27'),
  ('MCI', 'Rúben Dias',           'player', true, '맨시티 센터백', '2026-05-27'),
  ('MCI', '후벵 디아스',           'player', true, '맨시티 센터백', '2026-05-27'),
  ('MCI', '디아스',                'player', true, '맨시티 센터백', '2026-05-27'),

  ('MCI', 'Gvardiol',             'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', 'Josko Gvardiol',       'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', 'Joško Gvardiol',       'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', '그바르디올',            'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', 'Gvardiola',            'player', true, '맨시티 수비수', '2026-05-27'),

  ('MCI', 'Rodri',                'player', true, '맨시티 수비형 미드필더', '2026-05-27'),
  ('MCI', 'Rodrigo Hernandez',    'player', true, '맨시티 수비형 미드필더', '2026-05-27'),
  ('MCI', '로드리',                'player', true, '맨시티 수비형 미드필더', '2026-05-27'),

  ('MCI', 'Reijnders',            'player', true, '맨시티 미드필더', '2026-05-27'),
  ('MCI', 'Tijjani Reijnders',    'player', true, '맨시티 미드필더', '2026-05-27'),
  ('MCI', '레이은더르스',          'player', true, '맨시티 미드필더', '2026-05-27'),
  ('MCI', '라인더르스',            'player', true, '맨시티 미드필더', '2026-05-27'),
  ('MCI', 'Reinders',             'player', true, '맨시티 미드필더', '2026-05-27'),

  ('MCI', 'Foden',                'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', 'Phil Foden',           'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', '포든',                  'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', 'Phil Foben',           'player', true, '맨시티 공격형 미드필더', '2026-05-27'),

  ('MCI', 'Haaland',              'player', true, '맨시티 주전 공격수', '2026-05-27'),
  ('MCI', 'Erling Haaland',       'player', true, '맨시티 주전 공격수', '2026-05-27'),
  ('MCI', '홀란드',                'player', true, '맨시티 주전 공격수', '2026-05-27'),
  ('MCI', 'Halland',              'player', true, '맨시티 주전 공격수', '2026-05-27'),
  ('MCI', 'Haalan',               'player', true, '맨시티 주전 공격수', '2026-05-27'),

  ('MCI', 'Doku',                 'player', true, '맨시티 윙어', '2026-05-27'),
  ('MCI', 'Jeremy Doku',          'player', true, '맨시티 윙어', '2026-05-27'),
  ('MCI', '도쿠',                  'player', true, '맨시티 윙어', '2026-05-27'),

  ('MCI', 'Semenyo',              'player', true, '맨시티 공격수', '2026-05-27'),
  ('MCI', 'Antoine Semenyo',      'player', true, '맨시티 공격수', '2026-05-27'),
  ('MCI', '세메뇨',                'player', true, '맨시티 공격수', '2026-05-27'),

  ('MCI', 'O''Reilly',            'player', true, '맨시티 수비수/미드필더', '2026-05-27'),
  ('MCI', 'Nico O''Reilly',       'player', true, '맨시티 수비수/미드필더', '2026-05-27'),
  ('MCI', '오라일리',              'player', true, '맨시티 수비수/미드필더', '2026-05-27'),
  ('MCI', 'OReilly',              'player', true, '맨시티 수비수/미드필더', '2026-05-27'),

  ('MCI', 'Marmoush',             'player', true, '맨시티 공격수 (2025 영입)', '2026-05-27'),
  ('MCI', 'Omar Marmoush',        'player', true, '맨시티 공격수 (2025 영입)', '2026-05-27'),
  ('MCI', '마르무시',              'player', true, '맨시티 공격수 (2025 영입)', '2026-05-27'),
  ('MCI', 'Marmush',              'player', true, '맨시티 공격수 (2025 영입)', '2026-05-27'),

  ('MCI', 'Ake',                  'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', 'Nathan Ake',           'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', 'Nathan Aké',           'player', true, '맨시티 수비수', '2026-05-27'),
  ('MCI', '아케',                  'player', true, '맨시티 수비수', '2026-05-27'),

  ('MCI', 'Matheus Nunes',        'player', true, '맨시티 미드필더/풀백', '2026-05-27'),
  ('MCI', '마테우스 누네스',       'player', true, '맨시티 미드필더/풀백', '2026-05-27'),
  ('MCI', 'Nunes',                'player', true, '맨시티 미드필더/풀백', '2026-05-27'),
  ('MCI', 'Matheus Nunez',        'player', true, '맨시티 미드필더/풀백', '2026-05-27'),

  ('MCI', 'Savinho',              'player', true, '맨시티 윙어', '2026-05-27'),
  ('MCI', '사비뉴',                'player', true, '맨시티 윙어', '2026-05-27'),
  ('MCI', 'Savio',                'player', true, '맨시티 윙어', '2026-05-27'),
  ('MCI', 'Savinya',              'player', true, '맨시티 윙어', '2026-05-27'),

  ('MCI', 'Cherki',               'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', 'Rayan Cherki',         'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', '셰르키',                'player', true, '맨시티 공격형 미드필더', '2026-05-27'),
  ('MCI', 'Cherky',               'player', true, '맨시티 공격형 미드필더', '2026-05-27'),

  ('MCI', 'Pep Guardiola',        'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),
  ('MCI', 'Guardiola',            'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),
  ('MCI', '과르디올라',            'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),
  ('MCI', '펩',                    'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),
  ('MCI', 'Pep',                  'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),
  ('MCI', 'Guardiala',            'manager', false, '2025-26 시즌 후 맨시티 떠남', '2026-05-27'),

  ('MCI', 'Enzo Maresca',         'manager', false, '맨시티 차기 감독 유력 후보, 미부임', '2026-05-27'),
  ('MCI', 'Maresca',              'manager', false, '맨시티 차기 감독 유력 후보, 미부임', '2026-05-27'),
  ('MCI', '마레스카',              'manager', false, '맨시티 차기 감독 유력 후보, 미부임', '2026-05-27'),
  ('MCI', '엔초 마레스카',         'manager', false, '맨시티 차기 감독 유력 후보, 미부임', '2026-05-27'),
  ('MCI', 'Mareska',              'manager', false, '맨시티 차기 감독 유력 후보, 미부임', '2026-05-27'),

  ('MCI', 'Txiki Begiristain',    'executive', true, '맨시티 디렉터 오브 풋볼', '2026-05-27'),
  ('MCI', 'Begiristain',          'executive', true, '맨시티 디렉터 오브 풋볼', '2026-05-27'),
  ('MCI', '치키 베기리스타인',     'executive', true, '맨시티 디렉터 오브 풋볼', '2026-05-27'),
  ('MCI', 'Txiki',                'executive', true, '맨시티 디렉터 오브 풋볼', '2026-05-27'),

-- LIVERPOOL
  ('LIV', 'Alisson',              'player', true, '리버풀 주전 골키퍼', '2026-05-27'),
  ('LIV', 'Alisson Becker',       'player', true, '리버풀 주전 골키퍼', '2026-05-27'),
  ('LIV', '알리송',                'player', true, '리버풀 주전 골키퍼', '2026-05-27'),
  ('LIV', 'Allison',              'player', true, '리버풀 주전 골키퍼', '2026-05-27'),

  ('LIV', 'Van Dijk',             'player', true, '리버풀 주장, 센터백', '2026-05-27'),
  ('LIV', 'Virgil van Dijk',      'player', true, '리버풀 주장, 센터백', '2026-05-27'),
  ('LIV', '반 다이크',             'player', true, '리버풀 주장, 센터백', '2026-05-27'),
  ('LIV', 'van dijk',             'player', true, '리버풀 주장, 센터백', '2026-05-27'),
  ('LIV', 'Van Dyk',              'player', true, '리버풀 주장, 센터백', '2026-05-27'),

  ('LIV', 'Konate',               'player', true, '리버풀 센터백', '2026-05-27'),
  ('LIV', 'Ibrahima Konate',      'player', true, '리버풀 센터백', '2026-05-27'),
  ('LIV', 'Ibrahima Konaté',      'player', true, '리버풀 센터백', '2026-05-27'),
  ('LIV', '코나테',                'player', true, '리버풀 센터백', '2026-05-27'),

  ('LIV', 'Szoboszlai',           'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', 'Dominik Szoboszlai',   'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', '소보슬라이',            'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', 'Soboszlai',            'player', true, '리버풀 미드필더', '2026-05-27'),

  ('LIV', 'Mac Allister',         'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', 'Alexis Mac Allister',  'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', '맥 알리스터',           'player', true, '리버풀 미드필더', '2026-05-27'),
  ('LIV', 'Macallister',          'player', true, '리버풀 미드필더', '2026-05-27'),

  ('LIV', 'Gravenberch',          'player', true, '리버풀 중앙 미드필더', '2026-05-27'),
  ('LIV', 'Ryan Gravenberch',     'player', true, '리버풀 중앙 미드필더', '2026-05-27'),
  ('LIV', '흐라벤베르흐',          'player', true, '리버풀 중앙 미드필더', '2026-05-27'),
  ('LIV', 'Gravenberg',           'player', true, '리버풀 중앙 미드필더', '2026-05-27'),

  ('LIV', 'Salah',                'player', true, '리버풀 윙어/공격수', '2026-05-27'),
  ('LIV', 'Mohamed Salah',        'player', true, '리버풀 윙어/공격수', '2026-05-27'),
  ('LIV', '살라',                  'player', true, '리버풀 윙어/공격수', '2026-05-27'),
  ('LIV', 'Mo Salah',             'player', true, '리버풀 윙어/공격수', '2026-05-27'),
  ('LIV', 'Salla',                'player', true, '리버풀 윙어/공격수', '2026-05-27'),

  ('LIV', 'Gakpo',                'player', true, '리버풀 공격수', '2026-05-27'),
  ('LIV', 'Cody Gakpo',           'player', true, '리버풀 공격수', '2026-05-27'),
  ('LIV', '학포',                  'player', true, '리버풀 공격수', '2026-05-27'),
  ('LIV', '갗포',                  'player', true, '리버풀 공격수', '2026-05-27'),
  ('LIV', 'Gapko',                'player', true, '리버풀 공격수', '2026-05-27'),

  ('LIV', 'Wirtz',                'player', true, '리버풀 영입 (2025 여름), 7번', '2026-05-27'),
  ('LIV', 'Florian Wirtz',        'player', true, '리버풀 영입 (2025 여름), 7번', '2026-05-27'),
  ('LIV', '비르츠',                'player', true, '리버풀 영입 (2025 여름), 7번', '2026-05-27'),
  ('LIV', 'Wirts',                'player', true, '리버풀 영입 (2025 여름), 7번', '2026-05-27'),

  ('LIV', 'Ekitike',              'player', true, '리버풀 공격수 (2025 여름 영입)', '2026-05-27'),
  ('LIV', 'Hugo Ekitike',         'player', true, '리버풀 공격수 (2025 여름 영입)', '2026-05-27'),
  ('LIV', 'Hugo Ekitiké',         'player', true, '리버풀 공격수 (2025 여름 영입)', '2026-05-27'),
  ('LIV', '에키티케',              'player', true, '리버풀 공격수 (2025 여름 영입)', '2026-05-27'),

  ('LIV', 'Isak',                 'player', true, '리버풀 공격수 (2025 영입)', '2026-05-27'),
  ('LIV', 'Alexander Isak',       'player', true, '리버풀 공격수 (2025 영입)', '2026-05-27'),
  ('LIV', '이삭',                  'player', true, '리버풀 공격수 (2025 영입)', '2026-05-27'),
  ('LIV', '알렉산더 이삭',         'player', true, '리버풀 공격수 (2025 영입)', '2026-05-27'),

  ('LIV', 'Frimpong',             'player', true, '리버풀 우측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', 'Jeremie Frimpong',     'player', true, '리버풀 우측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', '프림퐁',                'player', true, '리버풀 우측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', 'Frympong',             'player', true, '리버풀 우측 풀백 (2025 영입)', '2026-05-27'),

  ('LIV', 'Kerkez',               'player', true, '리버풀 좌측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', 'Milos Kerkez',         'player', true, '리버풀 좌측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', 'Miloš Kerkez',         'player', true, '리버풀 좌측 풀백 (2025 영입)', '2026-05-27'),
  ('LIV', '케르케즈',              'player', true, '리버풀 좌측 풀백 (2025 영입)', '2026-05-27'),

  ('LIV', 'Joe Gomez',            'player', true, '리버풀 수비수', '2026-05-27'),
  ('LIV', 'Gomez',                'player', true, '리버풀 수비수', '2026-05-27'),
  ('LIV', '조 고메즈',             'player', true, '리버풀 수비수', '2026-05-27'),

  ('LIV', 'Arne Slot',            'manager', true, '리버풀 감독', '2026-05-27'),
  ('LIV', 'Slot',                 'manager', true, '리버풀 감독', '2026-05-27'),
  ('LIV', '슬롯',                  'manager', true, '리버풀 감독', '2026-05-27'),
  ('LIV', '아르네 슬롯',           'manager', true, '리버풀 감독', '2026-05-27'),
  ('LIV', 'Slott',                'manager', true, '리버풀 감독', '2026-05-27'),

  ('LIV', 'Richard Hughes',       'executive', true, '리버풀 스포팅 디렉터', '2026-05-27'),
  ('LIV', 'Hughes',               'executive', true, '리버풀 스포팅 디렉터', '2026-05-27'),
  ('LIV', '리처드 휴스',           'executive', true, '리버풀 스포팅 디렉터', '2026-05-27'),
  ('LIV', '휴스',                  'executive', true, '리버풀 스포팅 디렉터', '2026-05-27'),

-- ARSENAL
  ('ARS', 'Raya',                 'player', true, '아스날 주전 골키퍼', '2026-05-27'),
  ('ARS', 'David Raya',           'player', true, '아스날 주전 골키퍼', '2026-05-27'),
  ('ARS', '라야',                  'player', true, '아스날 주전 골키퍼', '2026-05-27'),

  ('ARS', 'Saliba',               'player', true, '아스날 센터백', '2026-05-27'),
  ('ARS', 'William Saliba',       'player', true, '아스날 센터백', '2026-05-27'),
  ('ARS', '살리바',                'player', true, '아스날 센터백', '2026-05-27'),

  ('ARS', 'Gabriel',              'player', true, '아스날 센터백 (Jesus/Martinelli와 구분)', '2026-05-27'),
  ('ARS', 'Gabriel Magalhaes',    'player', true, '아스날 센터백', '2026-05-27'),
  ('ARS', 'Gabriel Magalhães',    'player', true, '아스날 센터백', '2026-05-27'),
  ('ARS', '가브리엘',              'player', true, '아스날 센터백', '2026-05-27'),

  ('ARS', 'Saka',                 'player', true, '아스날 우측 윙어', '2026-05-27'),
  ('ARS', 'Bukayo Saka',          'player', true, '아스날 우측 윙어', '2026-05-27'),
  ('ARS', '사카',                  'player', true, '아스날 우측 윙어', '2026-05-27'),
  ('ARS', 'Saca',                 'player', true, '아스날 우측 윙어', '2026-05-27'),
  ('ARS', 'Sako',                 'player', true, '아스날 우측 윙어', '2026-05-27'),

  ('ARS', 'Odegaard',             'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),
  ('ARS', 'Martin Odegaard',      'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),
  ('ARS', 'Martin Ødegaard',      'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),
  ('ARS', '외데고르',              'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),
  ('ARS', 'Odegard',              'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),
  ('ARS', 'Ødegaard',             'player', true, '아스날 주장, 공격형 미드필더', '2026-05-27'),

  ('ARS', 'Rice',                 'player', true, '아스날 미드필더', '2026-05-27'),
  ('ARS', 'Declan Rice',          'player', true, '아스날 미드필더', '2026-05-27'),
  ('ARS', '라이스',                'player', true, '아스날 미드필더', '2026-05-27'),
  ('ARS', 'Rise',                 'player', true, '아스날 미드필더', '2026-05-27'),

  ('ARS', 'Martinelli',           'player', true, '아스날 좌측 윙어', '2026-05-27'),
  ('ARS', 'Gabriel Martinelli',   'player', true, '아스날 좌측 윙어', '2026-05-27'),
  ('ARS', '마르티넬리',            'player', true, '아스날 좌측 윙어', '2026-05-27'),
  ('ARS', 'Martineli',            'player', true, '아스날 좌측 윙어', '2026-05-27'),

  ('ARS', 'Gyokeres',             'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', 'Viktor Gyokeres',      'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', 'Viktor Gyökeres',      'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', '예케레스',              'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', 'Gyokers',              'player', true, '아스날 공격수', '2026-05-27'),

  ('ARS', 'Calafiori',            'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Riccardo Calafiori',   'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', '칼라피오리',            'player', true, '아스날 수비수', '2026-05-27'),

  ('ARS', 'Timber',               'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Jurrien Timber',       'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Jurriën Timber',       'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', '팀버',                  'player', true, '아스날 수비수', '2026-05-27'),

  ('ARS', 'Ben White',            'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'White',                'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', '벤 화이트',             'player', true, '아스날 수비수', '2026-05-27'),

  ('ARS', 'Mosquera',             'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Cristhian Mosquera',   'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', '모스케라',              'player', true, '아스날 수비수', '2026-05-27'),

  ('ARS', 'Hincapie',             'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Piero Hincapie',       'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', 'Piero Hincapié',       'player', true, '아스날 수비수', '2026-05-27'),
  ('ARS', '인카피에',              'player', true, '아스날 수비수', '2026-05-27'),

  ('ARS', 'Zubimendi',            'player', true, '아스날 미드필더 (2025 영입)', '2026-05-27'),
  ('ARS', 'Martin Zubimendi',     'player', true, '아스날 미드필더 (2025 영입)', '2026-05-27'),
  ('ARS', 'Martín Zubimendi',     'player', true, '아스날 미드필더 (2025 영입)', '2026-05-27'),
  ('ARS', '수비멘디',              'player', true, '아스날 미드필더 (2025 영입)', '2026-05-27'),

  ('ARS', 'Trossard',             'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', 'Leandro Trossard',     'player', true, '아스날 공격수', '2026-05-27'),
  ('ARS', '트로사르',              'player', true, '아스날 공격수', '2026-05-27'),

  ('ARS', 'Madueke',              'player', true, '아스날 윙어', '2026-05-27'),
  ('ARS', 'Noni Madueke',         'player', true, '아스날 윙어', '2026-05-27'),
  ('ARS', '마두에케',              'player', true, '아스날 윙어', '2026-05-27'),

  ('ARS', 'Havertz',              'player', true, '아스날 공격수/미드필더', '2026-05-27'),
  ('ARS', 'Kai Havertz',          'player', true, '아스날 공격수/미드필더', '2026-05-27'),
  ('ARS', '하베르츠',              'player', true, '아스날 공격수/미드필더', '2026-05-27'),

  ('ARS', 'Mikel Arteta',         'manager', true, '아스날 감독, 2025-26 EPL 우승', '2026-05-27'),
  ('ARS', 'Arteta',               'manager', true, '아스날 감독', '2026-05-27'),
  ('ARS', '아르테타',              'manager', true, '아스날 감독', '2026-05-27'),
  ('ARS', '미켈 아르테타',         'manager', true, '아스날 감독', '2026-05-27'),
  ('ARS', 'Artetta',              'manager', true, '아스날 감독', '2026-05-27'),

  ('ARS', 'Andrea Berta',         'executive', true, '아스날 스포팅 디렉터 (Edu 후임)', '2026-05-27'),
  ('ARS', 'Berta',                'executive', true, '아스날 스포팅 디렉터', '2026-05-27'),
  ('ARS', '베르타',                'executive', true, '아스날 스포팅 디렉터', '2026-05-27'),
  ('ARS', '안드레아 베르타',       'executive', true, '아스날 스포팅 디렉터', '2026-05-27'),

-- TOTTENHAM
  ('TOT', 'Vicario',              'player', true, '토트넘 주전 골키퍼', '2026-05-27'),
  ('TOT', 'Guglielmo Vicario',    'player', true, '토트넘 주전 골키퍼', '2026-05-27'),
  ('TOT', '비카리오',              'player', true, '토트넘 주전 골키퍼', '2026-05-27'),

  ('TOT', 'Kinsky',               'player', true, '토트넘 골키퍼', '2026-05-27'),
  ('TOT', 'Antonin Kinsky',       'player', true, '토트넘 골키퍼', '2026-05-27'),
  ('TOT', 'Antonín Kinský',       'player', true, '토트넘 골키퍼', '2026-05-27'),
  ('TOT', '킨스키',                'player', true, '토트넘 골키퍼', '2026-05-27'),

  ('TOT', 'Romero',               'player', true, '토트넘 센터백/주장', '2026-05-27'),
  ('TOT', 'Cristian Romero',      'player', true, '토트넘 센터백/주장', '2026-05-27'),
  ('TOT', '로메로',                'player', true, '토트넘 센터백/주장', '2026-05-27'),
  ('TOT', 'Cuti Romero',          'player', true, '토트넘 센터백/주장', '2026-05-27'),
  ('TOT', 'Romeo',                'player', true, '토트넘 센터백/주장', '2026-05-27'),

  ('TOT', 'Van de Ven',           'player', true, '토트넘 센터백', '2026-05-27'),
  ('TOT', 'Micky van de Ven',     'player', true, '토트넘 센터백', '2026-05-27'),
  ('TOT', '판 더 펜',              'player', true, '토트넘 센터백', '2026-05-27'),
  ('TOT', 'Van der Ven',          'player', true, '토트넘 센터백', '2026-05-27'),

  ('TOT', 'Porro',                'player', true, '토트넘 우측 풀백', '2026-05-27'),
  ('TOT', 'Pedro Porro',          'player', true, '토트넘 우측 풀백', '2026-05-27'),
  ('TOT', '포로',                  'player', true, '토트넘 우측 풀백', '2026-05-27'),
  ('TOT', '페드로 포로',           'player', true, '토트넘 우측 풀백', '2026-05-27'),

  ('TOT', 'Bergvall',             'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Lucas Bergvall',       'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', '베리발',                'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Bergval',              'player', true, '토트넘 미드필더', '2026-05-27'),

  ('TOT', 'Bentancur',            'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Rodrigo Bentancur',    'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', '벤탕쿠르',              'player', true, '토트넘 미드필더', '2026-05-27'),

  ('TOT', 'Gray',                 'player', true, '토트넘 미드필더/수비수', '2026-05-27'),
  ('TOT', 'Archie Gray',          'player', true, '토트넘 미드필더/수비수', '2026-05-27'),
  ('TOT', '그레이',                'player', true, '토트넘 미드필더/수비수', '2026-05-27'),

  ('TOT', 'Sarr',                 'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Pape Matar Sarr',      'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', '사르',                  'player', true, '토트넘 미드필더', '2026-05-27'),

  ('TOT', 'Maddison',             'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', 'James Maddison',       'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', '메디슨',                'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', '제임스 메디슨',         'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', 'Madison',              'player', true, '토트넘 공격형 미드필더', '2026-05-27'),

  ('TOT', 'Xavi Simons',          'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', '사비 시몬스',           'player', true, '토트넘 공격형 미드필더', '2026-05-27'),
  ('TOT', 'Simons',               'player', true, '토트넘 공격형 미드필더', '2026-05-27'),

  ('TOT', 'Gallagher',            'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Conor Gallagher',      'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', '코너 갤러거',           'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Gallaher',             'player', true, '토트넘 미드필더', '2026-05-27'),

  ('TOT', 'Kudus',                'player', true, '토트넘 윙어', '2026-05-27'),
  ('TOT', 'Mohammed Kudus',       'player', true, '토트넘 윙어', '2026-05-27'),
  ('TOT', '쿠두스',                'player', true, '토트넘 윙어', '2026-05-27'),

  ('TOT', 'Richarlison',          'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', '히샬리송',              'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', 'Richarlisson',         'player', true, '토트넘 공격수', '2026-05-27'),

  ('TOT', 'Tel',                  'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', 'Mathys Tel',           'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', '텔',                    'player', true, '토트넘 공격수', '2026-05-27'),

  ('TOT', 'Solanke',              'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', 'Dominic Solanke',      'player', true, '토트넘 공격수', '2026-05-27'),
  ('TOT', '솔란케',                'player', true, '토트넘 공격수', '2026-05-27'),

  ('TOT', 'Palhinha',             'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Joao Palhinha',        'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'João Palhinha',        'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', '팔리냐',                'player', true, '토트넘 미드필더', '2026-05-27'),
  ('TOT', 'Palinha',              'player', true, '토트넘 미드필더', '2026-05-27'),

  ('TOT', 'Roberto De Zerbi',     'manager', true, '토트넘 감독 (2026년 3월 선임)', '2026-05-27'),
  ('TOT', 'De Zerbi',             'manager', true, '토트넘 감독', '2026-05-27'),
  ('TOT', '데 제르비',             'manager', true, '토트넘 감독', '2026-05-27'),
  ('TOT', '데제르비',              'manager', true, '토트넘 감독', '2026-05-27'),
  ('TOT', '로베르토 데 제르비',    'manager', true, '토트넘 감독', '2026-05-27'),
  ('TOT', 'Dezerbi',              'manager', true, '토트넘 감독', '2026-05-27'),

  ('TOT', 'Daniel Levy',          'executive', false, '토트넘 회장 사임', '2026-05-27'),
  ('TOT', 'Levy',                 'executive', false, '토트넘 회장 사임', '2026-05-27'),
  ('TOT', '레비',                  'executive', false, '토트넘 회장 사임', '2026-05-27'),
  ('TOT', '다니엘 레비',           'executive', false, '토트넘 회장 사임', '2026-05-27'),

-- CHELSEA
  ('CHE', 'Sanchez',              'player', true, '첼시 주전 골키퍼', '2026-05-27'),
  ('CHE', 'Robert Sanchez',       'player', true, '첼시 주전 골키퍼', '2026-05-27'),
  ('CHE', 'Robert Sánchez',       'player', true, '첼시 주전 골키퍼', '2026-05-27'),
  ('CHE', '산체스',                'player', true, '첼시 주전 골키퍼', '2026-05-27'),

  ('CHE', 'Cucurella',            'player', true, '첼시 좌측 풀백', '2026-05-27'),
  ('CHE', 'Marc Cucurella',       'player', true, '첼시 좌측 풀백', '2026-05-27'),
  ('CHE', '쿠쿠레야',              'player', true, '첼시 좌측 풀백', '2026-05-27'),

  ('CHE', 'Reece James',          'player', true, '첼시 주장, 우측 풀백', '2026-05-27'),
  ('CHE', 'James',                'player', true, '첼시 주장, 우측 풀백 (Maddison과 구분)', '2026-05-27'),
  ('CHE', '리스 제임스',           'player', true, '첼시 주장, 우측 풀백', '2026-05-27'),

  ('CHE', 'Colwill',              'player', true, '첼시 센터백', '2026-05-27'),
  ('CHE', 'Levi Colwill',         'player', true, '첼시 센터백', '2026-05-27'),
  ('CHE', '콜윌',                  'player', true, '첼시 센터백', '2026-05-27'),

  ('CHE', 'Chalobah',             'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', 'Trevoh Chalobah',      'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', '찰로바',                'player', true, '첼시 수비수', '2026-05-27'),

  ('CHE', 'Fofana',               'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', 'Wesley Fofana',        'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', '포파나',                'player', true, '첼시 수비수', '2026-05-27'),

  ('CHE', 'Hato',                 'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', 'Jorrel Hato',          'player', true, '첼시 수비수', '2026-05-27'),
  ('CHE', '하토',                  'player', true, '첼시 수비수', '2026-05-27'),

  ('CHE', 'Caicedo',              'player', true, '첼시 수비형 미드필더', '2026-05-27'),
  ('CHE', 'Moises Caicedo',       'player', true, '첼시 수비형 미드필더', '2026-05-27'),
  ('CHE', 'Moisés Caicedo',       'player', true, '첼시 수비형 미드필더', '2026-05-27'),
  ('CHE', '카이세도',              'player', true, '첼시 수비형 미드필더', '2026-05-27'),

  ('CHE', 'Fernandez',            'player', true, '첼시 미드필더 (Bruno Fernandes와 혼동 주의)', '2026-05-27'),
  ('CHE', 'Enzo Fernandez',       'player', true, '첼시 미드필더', '2026-05-27'),
  ('CHE', 'Enzo Fernández',       'player', true, '첼시 미드필더', '2026-05-27'),
  ('CHE', '엔소 페르난데스',       'player', true, '첼시 미드필더', '2026-05-27'),
  ('CHE', 'Enzo',                 'player', true, '첼시 미드필더', '2026-05-27'),

  ('CHE', 'Palmer',               'player', true, '첼시 공격형 미드필더', '2026-05-27'),
  ('CHE', 'Cole Palmer',          'player', true, '첼시 공격형 미드필더', '2026-05-27'),
  ('CHE', '팔머',                  'player', true, '첼시 공격형 미드필더', '2026-05-27'),
  ('CHE', 'Palmber',              'player', true, '첼시 공격형 미드필더', '2026-05-27'),

  ('CHE', 'Neto',                 'player', true, '첼시 윙어', '2026-05-27'),
  ('CHE', 'Pedro Neto',           'player', true, '첼시 윙어', '2026-05-27'),
  ('CHE', '네투',                  'player', true, '첼시 윙어', '2026-05-27'),

  ('CHE', 'Garnacho',             'player', true, '첼시 윙어 (맨유→첼시 이적)', '2026-05-27'),
  ('CHE', 'Alejandro Garnacho',   'player', true, '첼시 윙어', '2026-05-27'),
  ('CHE', '가르나초',              'player', true, '첼시 윙어', '2026-05-27'),

  ('CHE', 'Delap',                'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),
  ('CHE', 'Liam Delap',           'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),
  ('CHE', '델랍',                  'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),

  ('CHE', 'Joao Pedro',           'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),
  ('CHE', 'João Pedro',           'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),
  ('CHE', '주앙 페드루',           'player', true, '첼시 공격수 (2025 영입)', '2026-05-27'),

  ('CHE', 'Estevao',              'player', true, '첼시 공격수 (브라질 영건, 2025 합류)', '2026-05-27'),
  ('CHE', 'Estêvão',              'player', true, '첼시 공격수', '2026-05-27'),
  ('CHE', 'Estevao Willian',      'player', true, '첼시 공격수', '2026-05-27'),
  ('CHE', '에스테방',              'player', true, '첼시 공격수', '2026-05-27'),

  ('CHE', 'Liam Rosenior',        'manager', false, '첼시 감독 경질', '2026-05-27'),
  ('CHE', 'Rosenior',             'manager', false, '첼시 감독 경질', '2026-05-27'),
  ('CHE', '로세니어',              'manager', false, '첼시 감독 경질', '2026-05-27'),
  ('CHE', '리암 로세니어',         'manager', false, '첼시 감독 경질', '2026-05-27'),
  ('CHE', 'Rosenier',             'manager', false, '첼시 감독 경질', '2026-05-27'),

  ('CHE', 'Xabi Alonso',          'manager', false, '첼시 차기 감독, 2026년 7월 부임 예정', '2026-05-27'),
  ('CHE', 'Alonso',               'manager', false, '첼시 차기 감독 (미부임)', '2026-05-27'),
  ('CHE', '알론소',                'manager', false, '첼시 차기 감독 (미부임)', '2026-05-27'),
  ('CHE', '사비 알론소',           'manager', false, '첼시 차기 감독 (미부임)', '2026-05-27'),
  ('CHE', 'Xabi',                 'manager', false, '첼시 차기 감독 (미부임)', '2026-05-27'),

  ('CHE', 'Laurence Stewart',     'executive', true, '첼시 공동 스포팅 디렉터', '2026-05-27'),
  ('CHE', 'Stewart',              'executive', true, '첼시 공동 스포팅 디렉터', '2026-05-27'),
  ('CHE', '스튜어트',              'executive', true, '첼시 공동 스포팅 디렉터', '2026-05-27'),
  ('CHE', '로렌스 스튜어트',       'executive', true, '첼시 공동 스포팅 디렉터', '2026-05-27')

on conflict (team_code, alias) do update set
  entity_type      = excluded.entity_type,
  active           = excluded.active,
  notes            = excluded.notes,
  last_verified_at = excluded.last_verified_at,
  updated_at       = now();
