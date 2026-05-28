# P5 피드 발행

## 목표

발행된 live 콘텐츠를 Reax 피드에 보여주되, 데모와 로컬 개발을 위해 기존 mock fallback을 유지한다.

## 피드 계약

`GET /api/feed`는 기존 피드 컴포넌트가 바로 사용할 수 있는 형태로 반환한다.

필수 필드:

- `id`
- `type`
- `title`
- `summary`
- `briefing`
- `tweet`
- `imageUrl`
- `club`
- `status`
- `hashtags`
- engagement counts
- `sourceUrl`
- `ai`

## 매핑 규칙

- `briefing.title` -> feed `title`
- `briefing.summary_short` -> feed `summary`
- `briefing.summary_detail` -> feed `briefing`
- 첫 번째 media URL 또는 preview -> `imageUrl`
- 첫 번째 team tag -> `club`
- `briefing.status`는 표시 badge로 변환한다.
  - `OFFICIAL` -> `Official`
  - `CONFIRMED` -> `Official`
  - `RUMOUR` -> `Rumour`
  - `UPDATE` -> `Talks`
  - `DENIED` -> `Opinion`

## 작업 목록

| ID | 작업 | 완료 조건 |
|---|---|---|
| P5-T1 | `/api/feed` 매핑 수정 | P1 briefing 필드를 사용함 |
| P5-T2 | mock fallback 유지 | `/api/feed` 실패 또는 빈 응답이어도 피드가 렌더됨 |
| P5-T3 | 데스크톱 피드 확인 | 발행된 live item이 desktop layout에 표시됨 |
| P5-T4 | 모바일 피드 확인 | 발행된 live item이 mobile feed에 표시됨 |
| P5-T5 | 팀 필터 확인 | 발행된 team tag가 기존 필터와 동작함 |

## 종료 조건

- feed 컴포넌트를 수동 수정하지 않아도 live published content가 표시된다.
- 기존 mock/demo 경험이 유지된다.
