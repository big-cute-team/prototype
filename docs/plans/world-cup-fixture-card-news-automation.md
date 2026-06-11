# 월드컵 경기 일정/결과 카드뉴스 자동화 계획

## 1. 목적

월드컵 경기 일정과 경기 결과 카드뉴스 제작에 필요한 데이터를 무료로 접근 가능한 2026 월드컵 데이터 소스에서 수집하고, 관리자 화면에서 검수 가능한 형태로 저장한 뒤, 카드뉴스 제작 화면의 날짜 선택만으로 카드 편집기에 자동 입력되도록 만든다.

이 문서는 지금까지 합의한 운영 기준과 구현 방향을 정리한다.

## 2. 콘텐츠 범위

### 기사 기반 카드뉴스

- 기사 기반 카드뉴스는 말 그대로 모든 기사성 콘텐츠를 대상으로 한다.
- 이적, 부상, 공식 발표, 루머, 인터뷰, 이슈, 일반 축구 뉴스 등 기사 기반 콘텐츠 전반을 포함한다.
- 월드컵 경기 데이터 자동화 대상이 아니다.
- 기존 수집, AI 요약, 관리자 검수, 카드뉴스 초안, 렌더/업로드 흐름을 유지한다.

### 경기 일정 카드뉴스

- 월드컵 경기 일정만 대상으로 한다.
- 클럽 경기, EPL 경기, 챔피언스리그 경기 등은 경기 일정 카드뉴스 자동화 범위에서 제외한다.
- 기본 데이터 소스는 무료 공개 `openfootball/worldcup.json` 2026 fixture 데이터를 사용한다.
- 국가대표팀, 국가 코드, 국기 이미지, 조/라운드, 경기장, KST 킥오프 시간을 카드뉴스에 표시한다.

### 경기 결과 카드뉴스

- 월드컵 경기 결과만 대상으로 한다.
- 경기 일정과 같은 fixture 레코드를 사용하되, 종료된 경기의 스코어와 상태를 업데이트한다.
- 결과 카드는 후순위 작업으로 두되, 구조는 일정 카드 자동화와 동일한 방향으로 설계한다.

## 3. 무료 데이터 소스 사용 기준

### 기본 소스

- 기본 provider: `openfootball`
- 원본 URL: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
- API key가 필요 없다.
- 일정 데이터는 104경기 전체 fixture를 포함한다.
- 원본의 `date`, `time`, `team1`, `team2`, `group`, `round`, `ground` 값을 내부 fixture 구조로 변환한다.

주의:

- openfootball 데이터는 무료 공개 데이터지만 실시간 공식 경기 결과 API가 아니다.
- 일정 자동화에는 바로 사용할 수 있다.
- 결과 자동화는 원본 JSON에 스코어가 업데이트된 뒤에만 반영된다.
- 실시간 결과가 필요하면 별도 무료 live API 후보를 추가 검토해야 한다.

### 선택 소스

- `WORLD_CUP_DATA_PROVIDER=api-football`로 설정하면 기존 API-Football 경로를 사용할 수 있다.
- 단, API-Football 무료 플랜은 2026 season 접근이 제한될 수 있으므로 기본값으로 사용하지 않는다.
- API-Football 사용 시 기준값:
  - `league=1`
  - `season=2026`

### 일정 조회

- 월드컵 전체 일정을 원본에서 가져온 뒤, 요청 범위의 KST 날짜에 맞는 경기만 저장/반환한다.
- 원본 시간대는 카드뉴스 운영 기준인 KST로 변환한다.

### 결과 조회

- 일정과 같은 fixture 레코드를 사용한다.
- 결과 동기화에서는 종료 상태와 스코어를 업데이트한다.
- 최종 결과로 인정할 상태:
  - `FT`
  - `AET`
  - `PEN`
- 미완료 또는 비정상 상태는 결과 카드에 자동 포함하지 않는다.
  - 예: `NS`, `LIVE`, `HT`, `PST`, `CANC`

## 4. 데이터 수집 버튼 정책

### 버튼은 분리한다

관리자 화면 오른쪽 상단의 기존 `경기 관리` 버튼 우측에 새 버튼을 추가한다.

- `월드컵 일정 동기화`
- `월드컵 결과 동기화`

버튼을 분리하는 이유:

- 일정 동기화와 결과 동기화는 목적이 다르다.
- 일정 동기화는 앞으로 열릴 경기 정보 최신화가 목적이다.
- 결과 동기화는 이미 열린 경기의 상태와 스코어 확정이 목적이다.
- 운영자가 어떤 데이터를 갱신했는지 명확히 알 수 있다.

### 데이터는 같은 레코드에 저장한다

버튼은 분리하되, 저장 테이블은 하나로 둔다.

추천 테이블명:

```text
world_cup_fixtures
```

하나의 fixture 레코드에 일정 정보와 결과 정보를 함께 누적 업데이트한다.

## 5. DB 저장 구조

### 기본 원칙

- provider fixture id를 `api_fixture_id`로 저장한다.
- openfootball은 별도 fixture id가 없을 수 있으므로 `season + match number` 기반의 음수 id를 만들어 저장한다.
- `api_fixture_id` 기준으로 upsert한다.
- 이미 저장된 경기면 업데이트하고, 새로운 경기면 추가한다.
- 카드뉴스 제작 화면은 외부 데이터 소스를 직접 호출하지 않고, 우리 DB만 읽는다.

### 권장 필드

```text
id
api_fixture_id
season
league_id
round
group_label
kickoff_at
kickoff_date_kst
kickoff_time_kst
home_team_id
home_team_name_api
home_team_name_ko
home_code
home_flag_url
home_logo_url
away_team_id
away_team_name_api
away_team_name_ko
away_code
away_flag_url
away_logo_url
venue_name_api
venue_name_ko
venue_city_api
venue_city_ko
status_short
status_long
home_score
away_score
last_schedule_synced_at
last_result_synced_at
raw_fixture
created_at
updated_at
```

### 원본값과 표시값 분리

외부 원본값과 카드뉴스 표시값은 분리해서 저장하는 것이 좋다.

- 원본값:
  - 팀명
  - 경기장명
  - 도시명
  - 라운드
  - fixture id
  - provider 응답 원본 JSON
- 카드 표시값:
  - 한국어 국가명
  - 카드용 짧은 국가명
  - 국기 이미지 URL
  - 경기장 한글 표기
  - `Group A` 같은 카드용 라벨

이렇게 해야 원본 데이터가 갱신되어도 카드뉴스 편집/표시 정책을 안정적으로 유지할 수 있다.

## 6. 수집/동기화 흐름

### 월드컵 일정 동기화

관리자 버튼:

```text
월드컵 일정 동기화
```

동작:

1. 기준 날짜를 정한다.
   - 기본값은 오늘 또는 운영자가 선택한 날짜.
   - 1차 구현에서는 오늘 기준 7일 또는 별도 date range로 시작할 수 있다.
2. 설정된 provider를 호출한다.
   - 기본값은 openfootball raw JSON이다.
   - API-Football은 선택 provider다.
3. 원본 fixture를 KST 기준 날짜로 변환하고 요청 범위에 맞게 필터링한다.
4. 변환한 fixture 데이터를 `world_cup_fixtures`에 upsert한다.
5. 경기 시간, 홈/원정 국가, 코드, 국기, 조/라운드, 경기장 정보를 저장한다.
6. 동기화 완료 후 저장/업데이트된 경기 수를 관리자에게 보여준다.

일정 동기화는 실시간성이 높지 않다.

추천 운영:

- 전체 월드컵 일정은 하루 1회 갱신.
- 카드 발행 직전에는 한 번 더 갱신.
- 토너먼트 대진 확정 단계에서는 관련 경기 종료 후 추가 갱신.

### 월드컵 결과 동기화

관리자 버튼:

```text
월드컵 결과 동기화
```

동작:

1. 최근 N일 또는 운영자가 선택한 날짜 범위의 fixture를 조회한다.
2. 종료 상태인 경기만 결과 확정 후보로 본다.
3. `FT`, `AET`, `PEN` 상태의 경기만 스코어와 상태를 저장한다.
4. 미완료 경기는 결과 카드 편집기에 자동 포함하지 않는다.
5. 같은 `world_cup_fixtures` 레코드에 `status_short`, `home_score`, `away_score`, `last_result_synced_at`을 업데이트한다.

추천 운영:

- 경기 중에는 해당 경기만 5-10분 간격으로 상태 확인.
- `FT`, `AET`, `PEN` 감지 후 즉시 확정하지 않고 5-10분 뒤 재조회.
- 재조회 후 최종 스코어를 저장.
- 하루 결과 모음 카드는 그 날짜 마지막 경기 종료 후 10-15분 뒤 생성하는 것이 안전하다.

## 7. 경기 일정 데이터 조회 탭

### 위치

`생성된 카드뉴스` 탭 오른쪽에 새 탭을 추가한다.

추천 탭명:

```text
경기 일정
```

이 탭은 카드뉴스 결과물을 보는 곳이 아니라, DB에 저장된 월드컵 경기 일정 데이터를 조회하는 곳이다.

### 표시 데이터

`경기 일정` 탭에서 확인할 항목:

- 날짜
- KST 킥오프 시간
- 홈 국가
- 원정 국가
- 국가 코드
- 국기 또는 로고
- 조/라운드
- 경기장
- 상태
- 스코어
- 일정 동기화 시각
- 결과 동기화 시각

### 목적

- 무료 provider에서 가져온 데이터가 DB에 제대로 저장되었는지 확인한다.
- 카드뉴스 제작 전에 경기 데이터 상태를 검수한다.
- 데이터가 없는 날짜 또는 동기화가 오래된 날짜를 쉽게 파악한다.

## 8. 카드 제작 흐름: 경기 일정

### 전제

카드뉴스 제작 화면의 `경기 일정` 모드는 기존 기능을 유지한다.

기존 구조:

- 오늘 경기 일정:
  - `schedule_type: "today"`
  - `matches` flat list 사용
  - 템플릿: `plick_today_fixtures_v1`
- 이번주 경기 일정:
  - `schedule_type: "weekly"`
  - `days` grouped list 사용
  - `matches` flat list도 호환용으로 함께 유지
  - 템플릿: `plick_weekly_fixtures_v1`

### 오늘 경기 일정

동작:

1. 관리자가 카드뉴스 제작 화면에서 `경기 일정`을 선택한다.
2. 일정 타입을 `오늘 경기 일정`으로 둔다.
3. DATE를 변경한다.
4. DATE가 `2026-06-12`라면 DB에서 KST 기준 아래 범위를 조회한다.

```text
2026-06-12 00:00:00 KST 이상
2026-06-13 00:00:00 KST 미만
```

5. 조회된 경기들을 카드 편집기의 `matches`에 자동 세팅한다.
6. 관리자는 경기장명, 조/라운드, 국가 표시명 등을 검수/수정한다.
7. 기존 렌더/업로드 플로우로 카드뉴스를 생성한다.

### 이번주 경기 일정

동작:

1. 관리자가 카드뉴스 제작 화면에서 `경기 일정`을 선택한다.
2. 일정 타입을 `이번주 경기 일정`으로 둔다.
3. 시작 DATE를 변경한다.
4. 시작 DATE가 `2026-06-12`라면 DB에서 아래 7일 범위를 조회한다.

```text
2026-06-12 00:00:00 KST 이상
2026-06-19 00:00:00 KST 미만
```

카드 표시 범위:

```text
2026-06-12 ~ 2026-06-18
```

5. 조회된 경기들을 날짜별로 묶어서 `days`에 자동 세팅한다.
6. 렌더 호환성을 위해 같은 경기들을 flat list로 펼쳐 `matches`에도 함께 세팅한다.
7. 경기가 없는 날짜는 `days`에 넣지 않는다.
8. 관리자는 자동 입력된 데이터를 검수/수정한다.
9. 기존 렌더/업로드 플로우로 카드뉴스를 생성한다.

### 중요한 기준

- `이번주`는 월요일-일요일 고정이 아니라, 관리자가 선택한 시작 날짜부터 7일이다.
- 예: 6/12 선택 시 6/12부터 6/18까지의 7일치 경기.
- 경기가 없는 날짜는 카드에 빈 날짜 섹션으로 표시하지 않는다.

## 9. 카드 제작 흐름: 경기 결과

경기 결과는 후순위 작업이지만, 일정과 같은 구조로 설계한다.

### 오늘 경기 결과

동작:

1. 관리자가 카드뉴스 제작 화면에서 `경기 결과`를 선택한다.
2. DATE를 변경한다.
3. DB에서 KST 기준 해당 날짜에 킥오프한 경기 중 완료된 경기만 조회한다.
4. 완료 경기만 `matches`에 자동 세팅한다.
5. `home_score`, `away_score`를 함께 입력한다.
6. 템플릿은 `plick_today_results_v1`을 사용한다.

### 이번주 경기 결과

동작:

1. 관리자가 카드뉴스 제작 화면에서 `경기 결과`를 선택한다.
2. 시작 DATE를 변경한다.
3. DB에서 선택 날짜부터 7일간 킥오프한 완료 경기만 조회한다.
4. 날짜별로 묶어서 `days`에 자동 세팅한다.
5. flat `matches`도 함께 세팅한다.
6. 템플릿은 `plick_weekly_results_v1`을 사용한다.

### 결과 카드 포함 기준

- 완료 경기만 자동 포함한다.
- `FT`, `AET`, `PEN` 상태만 포함한다.
- 미완료 경기는 결과 카드에 포함하지 않는다.
- 결과 카드의 날짜 기준은 경기 종료일이 아니라 킥오프 날짜로 한다.

예:

- 6/12 밤 경기의 종료 시간이 6/13 새벽이어도, 킥오프가 6/12라면 `6/12 경기 결과`에 포함한다.

### 결과 스코어 표기 정책

- 단순 스코어만 사용한다.
- 예:

```text
2:1
```

- 연장/승부차기 상세 표기는 카드뉴스에는 넣지 않는다.
- `1:1 (PK 4:3)` 같은 표기는 사용하지 않는다.

## 10. 날짜 변경 자동 세팅 UX

### 자동 세팅 기본 원칙

날짜를 변경하면 DB에서 해당 범위의 월드컵 경기 데이터를 조회하고 카드 편집기에 자동 입력한다.

다만 관리자가 이미 편집 중인 내용을 실수로 덮어쓰지 않도록 안전장치를 둔다.

### 권장 UX

- 편집기가 아직 수정되지 않은 상태:
  - 날짜 변경 즉시 자동 세팅.
- 편집기가 이미 수정된 상태:
  - 확인창 표시.
  - 예: `현재 편집 중인 경기 일정이 있습니다. 2026-06-12 데이터로 다시 불러올까요?`
- DB에 해당 날짜 데이터가 없는 상태:
  - 자동 세팅하지 않는다.
  - 예: `저장된 경기 일정이 없습니다. 먼저 월드컵 일정 동기화를 실행해주세요.`
- 자동 입력 후:
  - 관리자 수정은 계속 가능해야 한다.

### 덮어쓰기 기준

날짜 변경에 따른 자동 세팅은 카드 편집기 값을 대체한다.

따라서 다음 값을 새로 구성한다.

- `date`
- `date_start`
- `date_end`
- `date_label`
- `matches`
- `days`
- `eyebrow`
- `title`

## 11. 카드뉴스 payload 변환 규칙

### 오늘 경기 일정 payload

```json
{
  "template_id": "plick_today_fixtures_v1",
  "today_fixtures": {
    "schedule_type": "today",
    "eyebrow": "WORLD CUP 2026 · TODAY",
    "title": "오늘의\n경기 일정",
    "date_label": "6월 12일 (금)",
    "matches": [
      {
        "time_period": "오전",
        "kickoff_time": "04:00",
        "home_team": "브라질",
        "home_code": "BRA",
        "home_image_url": "https://flagcdn.com/w160/br.png",
        "away_team": "세네갈",
        "away_code": "SEN",
        "away_image_url": "https://flagcdn.com/w160/sn.png",
        "group_label": "Group F",
        "venue": "마이애미 · 하드록 스타디움"
      }
    ]
  }
}
```

### 이번주 경기 일정 payload

```json
{
  "template_id": "plick_weekly_fixtures_v1",
  "today_fixtures": {
    "schedule_type": "weekly",
    "eyebrow": "WORLD CUP 2026 · WEEK",
    "title": "이번주\n경기 일정",
    "date_label": "6월 12일 — 6월 18일",
    "matches": [],
    "days": [
      {
        "date": "2026-06-12",
        "date_label": "6월 12일 (금)",
        "matches": []
      }
    ]
  }
}
```

### 오늘 경기 결과 payload

```json
{
  "template_id": "plick_today_results_v1",
  "today_fixtures": {
    "schedule_type": "today",
    "content_type": "results",
    "eyebrow": "WORLD CUP 2026 · RESULT",
    "title": "오늘의\n경기 결과",
    "date_label": "6월 12일 (금)",
    "matches": [
      {
        "time_period": "오전",
        "kickoff_time": "04:00",
        "home_team": "브라질",
        "home_code": "BRA",
        "home_image_url": "https://flagcdn.com/w160/br.png",
        "home_score": "2",
        "away_team": "세네갈",
        "away_code": "SEN",
        "away_image_url": "https://flagcdn.com/w160/sn.png",
        "away_score": "1",
        "group_label": "Group F",
        "venue": "마이애미 · 하드록 스타디움"
      }
    ]
  }
}
```

### 이번주 경기 결과 payload

```json
{
  "template_id": "plick_weekly_results_v1",
  "today_fixtures": {
    "schedule_type": "weekly",
    "content_type": "results",
    "eyebrow": "WORLD CUP 2026 · WEEK RESULT",
    "title": "이번주\n경기 결과",
    "date_label": "6월 12일 — 6월 18일",
    "matches": [],
    "days": []
  }
}
```

## 12. 원본 데이터와 카드뉴스 필드 매핑

| 카드뉴스 필드 | openfootball 또는 내부 변환 |
| --- | --- |
| `kickoff_time` | `date` + `time`을 KST HH:mm으로 변환 |
| `time_period` | KST 시간이 12시 전이면 `오전`, 이후면 `오후` |
| `home_team` | 내부 한국어 국가명 매핑 |
| `away_team` | 내부 한국어 국가명 매핑 |
| `home_code` | 내부 국가 코드 매핑 |
| `away_code` | 내부 국가 코드 매핑 |
| `home_image_url` | 내부 국기 URL |
| `away_image_url` | 내부 국기 URL |
| `group_label` | `group` 또는 `round` |
| `venue` | 경기장 한글명 매핑, 없으면 원본 경기장명 |
| `home_score` | 원본 스코어 또는 확정 스코어 |
| `away_score` | 원본 스코어 또는 확정 스코어 |
| `status` | 스코어가 있으면 `FT`, 없으면 `NS` |

## 13. 보완해야 할 매핑

### 한국어 국가명

- 원본은 영어명 중심일 가능성이 높다.
- 현재 카드뉴스는 한국어 국가명이 필요하다.
- 기존 `todayFixtureCountries` 계열의 국가명/코드/국기 매핑을 활용하거나 정리한다.
- 원본 표기가 내부 표기와 다를 수 있으므로 alias 매핑을 별도로 둔다.
  - 예: `Bosnia & Herzegovina` -> `BIH`
  - 예: `Curaçao` -> `CUW`
  - 예: `USA` -> `USA`
- 새 원본 표기가 들어오면 국가 row를 중복 추가하지 말고 alias row만 추가한다.

### 국기 이미지

- 월드컵 카드뉴스 기준으로는 API 팀 로고보다 국기 이미지가 더 자연스럽다.
- 기본값은 현재처럼 `flagcdn` 기반 국기 URL을 사용한다.
- 선택 provider를 사용할 때 팀 로고가 있으면 보조 데이터로 저장할 수 있다.

### 경기장 한글 표기

- 원본 경기장명은 영어일 수 있다.
- 카드뉴스에는 한글 경기장명이 더 적합하다.
- 별도 경기장 매핑 테이블 또는 매핑 파일이 필요하다.

### 그룹/라운드 표기

- openfootball은 `group` 값을 우선 사용한다.
- 선택 provider에서 `group` 값이 없으면 standings 또는 내부 매핑으로 보완한다.
- 토너먼트 단계에서는 `Round of 32`, `Round of 16`, `Quarter-finals` 같은 라운드 표시 정책이 필요하다.

## 14. 구현 단계 제안

### 1단계: DB와 동기화 API

- `world_cup_fixtures` 테이블 추가.
- 무료 provider 기반 동기화 환경 변수 정리.
- 월드컵 일정 동기화 API 추가.
- 월드컵 결과 동기화 API 추가.
- `api_fixture_id` 기준 upsert 구현.

### 2단계: 관리자 UI 버튼

- 오른쪽 상단 `경기 관리` 우측에 버튼 추가.
- `월드컵 일정 동기화`
- `월드컵 결과 동기화`
- 실행 결과 토스트/알림 표시.

### 3단계: 경기 일정 조회 탭

- `생성된 카드뉴스` 탭 오른쪽에 `경기 일정` 탭 추가.
- DB에 저장된 fixture 목록 조회.
- 날짜/상태 필터 추가.
- 동기화 상태 표시.

### 4단계: 카드 제작 자동 입력

- 오늘 경기 일정 DATE 변경 시 DB 조회 후 `matches` 자동 세팅.
- 이번주 경기 일정 시작 DATE 변경 시 7일치 DB 조회 후 `days`와 `matches` 자동 세팅.
- 편집 중 덮어쓰기 확인 UX 추가.
- DB 데이터가 없을 때 안내 메시지 추가.

### 5단계: 결과 카드 자동 입력

- 오늘 경기 결과 DATE 변경 시 완료 경기만 자동 세팅.
- 이번주 경기 결과 시작 DATE 변경 시 7일치 완료 경기만 자동 세팅.
- 단순 스코어 표기만 사용.
- 미완료 경기 제외.

## 15. 최종 합의 사항

- 기사 기반 카드뉴스는 기사 전반을 대상으로 한다.
- 경기 일정과 경기 결과 카드뉴스는 월드컵 기반으로만 진행한다.
- openfootball은 월드컵 일정 자동화의 기본 무료 provider로 사용한다.
- API-Football은 2026 접근 가능한 키가 있을 때만 선택 provider로 사용한다.
- 일정 동기화 버튼과 결과 동기화 버튼은 분리한다.
- 저장 데이터는 같은 fixture 레코드에 누적한다.
- 카드뉴스 제작 화면은 외부 provider를 직접 호출하지 않고 DB 데이터를 읽는다.
- 오늘 일정은 DATE 변경 시 해당 날짜의 경기 정보를 자동 세팅한다.
- 이번주 일정은 시작 DATE 변경 시 그 날짜부터 7일간의 경기 정보를 자동 세팅한다.
- 이번주 범위는 월-일 고정이 아니라 선택 날짜부터 7일이다.
- 경기가 없는 날짜는 카드에 표시하지 않는다.
- 결과 카드는 완료 경기만 자동 포함한다.
- 결과 스코어는 단순 `2:1` 형식만 사용한다.
- 미완료 경기는 결과 카드 편집기에 포함하지 않는다.
- 자동 세팅 후에도 관리자는 모든 표시값을 수정할 수 있어야 한다.
- 편집 중인 내용을 날짜 변경으로 덮어쓸 때는 확인 절차를 둔다.

