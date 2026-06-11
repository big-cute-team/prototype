# 월드컵 경기 일정/결과 카드뉴스 자동화 순차 진행 가이드

이 문서는 `docs/plans/world-cup-fixture-card-news-automation.md`의 구현을 실제 운영 환경에 순차 적용하기 위한 실행 가이드다.

## 현재 결정

- 기본 데이터 소스는 무료 공개 데이터인 `openfootball/worldcup.json`을 사용한다.
- 기본 provider는 `openfootball`이며 API key가 필요 없다.
- API-Football은 2026 season 접근 가능한 키가 있을 때만 선택 provider로 사용한다.
- 관리자 화면은 외부 데이터를 직접 호출하지 않고 `world_cup_fixtures` DB 데이터만 읽는다.

## 무료 데이터 소스

기본 원본:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

특징:

- 무료 공개 데이터다.
- 2026 월드컵 fixture 104경기 전체를 가져온다.
- 원본의 `date`, `time`, `team1`, `team2`, `group`, `round`, `ground`를 내부 DB 컬럼으로 변환한다.
- 시간은 KST 기준 `kickoff_date_kst`, `kickoff_time_kst`로 저장한다.

제약:

- 실시간 공식 결과 API가 아니다.
- 일정 카드뉴스 자동화에는 바로 사용할 수 있다.
- 결과 카드뉴스는 원본 JSON에 스코어가 업데이트된 뒤에만 반영된다.
- 실시간 결과가 필요하면 별도 무료 live API를 추가 검토해야 한다.

## 0단계: 브랜치와 로컬 상태 확인

목표: 관리자 서버가 `develop`에서 작업 중인지 확인한다.

명령:

```bash
git status --short --branch
npm run build
```

완료 기준:

- `admin` 저장소가 `develop` 브랜치다.
- 기존 빌드가 실패하지 않는다.

상태:

- 완료.

## 1단계: DB 마이그레이션 적용

목표: Supabase에 `world_cup_fixtures` 테이블을 만든다.

적용 파일:

```text
supabase/migrations/20260611_world_cup_fixtures.sql
```

완료 기준:

- Supabase REST에서 `world_cup_fixtures` 조회가 200으로 응답한다.
- `api_fixture_id` unique 제약이 있다.
- `kickoff_date_kst`, `status_short` 인덱스가 있다.

상태:

- 완료. 로컬에서 Supabase REST 조회로 테이블 존재를 확인했다.

## 2단계: 환경 변수 정리

목표: 기본 무료 provider로 동작하게 한다.

필수 환경 변수:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_TOKEN
```

선택 환경 변수:

```text
WORLD_CUP_DATA_PROVIDER=openfootball
OPENFOOTBALL_WORLD_CUP_URL=https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

API-Football 선택 사용 시에만 필요한 환경 변수:

```text
WORLD_CUP_DATA_PROVIDER=api-football
API_FOOTBALL_KEY
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_WORLD_CUP_LEAGUE_ID=1
API_FOOTBALL_WORLD_CUP_SEASON=2026
```

완료 기준:

- `WORLD_CUP_DATA_PROVIDER`를 비워두거나 `openfootball`로 두면 API key 없이 일정 동기화가 가능하다.
- API-Football 무료 플랜의 2026 접근 제한에 막히지 않는다.

상태:

- 완료. 기본값을 `openfootball`로 변경했다.

## 3단계: 월드컵 일정 동기화 smoke test

목표: 무료 원본 데이터를 DB에 저장한다.

관리자 화면:

```text
/admin -> 월드컵 일정 동기화
```

API 확인:

```bash
curl -X POST /api/admin/world-cup-fixtures \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"sync_schedule\",\"actor\":\"admin-ui\"}"
```

완료 기준:

- 응답의 `ok`가 `true`다.
- `provider`가 `openfootball`이다.
- `source_fixture_count`가 104다.
- 요청 범위의 경기 수만큼 `saved_count`가 증가한다.

상태:

- 완료. 로컬 smoke test 결과:
  - `provider`: `openfootball`
  - `source_fixture_count`: 104
  - 기본 범위 `2026-06-11 ~ 2026-06-17`
  - `fixture_count`: 20
  - `saved_count`: 20

## 4단계: 경기 일정 조회 확인

목표: DB에 저장된 fixture가 관리자 화면에서 조회되는지 확인한다.

관리자 화면:

```text
/admin -> 경기 일정 탭
```

완료 기준:

- 날짜 필터로 경기 조회가 된다.
- KST 날짜/시간이 표시된다.
- 한글 국가명, 국가 코드, 국기 URL이 매핑된다.
- 조/라운드와 경기장 원본명이 표시된다.

상태:

- 완료. 로컬 조회에서 `2026-06-12` 경기 2개가 확인됐다.

추가 확인:

- 원본 국가명이 내부 표기와 다르면 `src/epl/todayFixtureCountries.js`의 `COUNTRY_ALIAS_ROWS`에 alias를 추가한다.
- 국가 row를 중복 추가하지 않고 alias를 코드에 연결한다.
- 현재 2026 원본 48개 국가 기준 미매핑 국가는 0개다.
- 검증된 alias:
  - `Bosnia & Herzegovina` -> `BIH`, `보스니아 헤르체고비나`
  - `Curaçao` -> `CUW`, `퀴라소`
  - `USA` -> `USA`, `미국`

## 5단계: 카드뉴스 일정 자동 입력 확인

목표: 카드뉴스 작업대에서 날짜 선택만으로 일정 데이터가 자동 입력되는지 확인한다.

확인 순서:

1. `/admin`에서 `카드뉴스 작업대` 탭으로 이동한다.
2. 카드 타입을 `경기 일정`으로 선택한다.
3. 프리셋을 `월드컵`으로 선택한다.
4. 오늘 경기 일정 템플릿의 `DATE`를 변경한다.
5. 이번주 경기 일정 템플릿의 시작 `DATE`를 변경한다.

완료 기준:

- 오늘 일정은 해당 날짜의 `matches`가 자동 입력된다.
- 이번주 일정은 시작 날짜부터 7일 범위의 `days`와 `matches`가 자동 입력된다.
- 경기가 없는 날짜는 카드 데이터에 포함되지 않는다.
- 기존 편집값이 있으면 덮어쓰기 확인을 거친다.

상태:

- 다음 확인 대상.

## 6단계: 월드컵 결과 동기화 확인

목표: 완료 경기만 결과 카드뉴스 후보로 저장한다.

관리자 화면:

```text
/admin -> 월드컵 결과 동기화
```

완료 기준:

- 완료 경기만 결과 카드 자동 입력 대상이 된다.
- 인정 상태는 `FT`, `AET`, `PEN`이다.
- 미완료 경기 `NS`는 결과 카드에 들어가지 않는다.
- 스코어는 단순 `home_score:away_score` 형태로 사용할 수 있다.

주의:

- openfootball은 실시간 결과 API가 아니므로 원본 JSON에 스코어가 있어야 완료 경기로 처리된다.
- 월드컵 기간 중 즉시 결과 반영이 필요하면 무료 live API 후보를 추가해야 한다.

상태:

- 구조 구현 완료, 실제 결과 데이터는 대회 진행 후 확인 필요.

## 7단계: 렌더/업로드 end-to-end 확인

목표: 자동 입력된 데이터로 실제 카드뉴스 이미지 생성과 업로드까지 확인한다.

확인 대상:

- 오늘 경기 일정 카드 업로드
- 이번주 경기 일정 카드 업로드
- 오늘 경기 결과 카드 업로드
- 이번주 경기 결과 카드 업로드
- `생성된 카드뉴스` 탭의 이미지/ZIP/R2 링크

상태:

- 다음 확인 대상.

## 진행 로그

| 단계 | 상태 | 메모 |
| --- | --- | --- |
| 0단계 | 완료 | `develop` 브랜치 기준 작업 |
| 1단계 | 완료 | `world_cup_fixtures` 테이블 확인 |
| 2단계 | 완료 | 기본 provider를 무료 `openfootball`로 변경 |
| 3단계 | 완료 | 104개 원본 중 기본 범위 20개 저장 확인 |
| 4단계 | 완료 | `2026-06-12` 조회에서 2개 경기 확인 |
| 5단계 | 대기 | 관리자 카드뉴스 작업대에서 UI 흐름 확인 필요 |
| 6단계 | 대기 | 실제 완료 경기 데이터 발생 후 검증 |
| 7단계 | 대기 | 렌더/업로드 E2E 검증 필요 |

## 다음 진행

1. `/admin`에 접속한다.
2. `경기 일정` 탭에서 2026-06-12 일정을 확인한다.
3. `카드뉴스 작업대`에서 `경기 일정` 타입과 `월드컵` 프리셋을 선택한다.
4. `DATE`를 2026-06-12로 바꿔 자동 입력이 되는지 확인한다.
5. 카드 미리보기와 렌더 요청까지 진행한다.
