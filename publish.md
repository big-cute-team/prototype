# 콘텐츠 수집 → 요약 → 검수/발행 파이프라인

X(트위터) 게시물을 수집해 AI로 한국어 브리핑을 만들고, **검수(review) / 발행(published) / 폐기(discarded)** 큐로 라우팅하기까지의 전체 흐름 문서.

관련 코드:
- `api/collect.js` — 수집 + 저장 진입점
- `api/_lib/ai.js` — 분류·브리핑(`classifyPost`)과 라우팅 정책(`enforcePolicy`)
- `api/_lib/constants.js` — 별칭 매칭(`matchesAlias`, `matchTeams`, `matchAliasRows`)
- `content.md` — 한국어 브리핑 생성 규칙(프롬프트)

---

## 0. 한눈에 보기

```
X source 게시물
   │  (collect.js)
   ▼
① 중복 제거 (raw_post_id)
   │
   ▼
② [서버] 사전 게이트  ── AI 없이 폐기 가능
   - 본문에 팀/선수 alias 0개          → 폐기
   - 반응성/티저(isClearlyNonInformative) → 폐기
   │  (통과분만 AI 호출)
   ▼
③ [AI] 분류 + 한국어 브리핑 (classifyPost)
   - 인풋: 트윗 + "이 트윗에 매칭된 alias 행만"(전체 433행 아님)
   - 출력: 팀, is_informative 등 신호 + 제목/요약
   │
   ▼
④ [서버] enforcePolicy — 최종 분기 결정 (rule 1~7)
   │
   ▼
   published / review / discarded  → Supabase content_items 저장
```

핵심 원칙: **분기(검수/발행/폐기) 결정은 100% 서버**가 한다. AI는 "판단 재료(신호)"와 "한국어 브리핑 텍스트"만 만든다. AI가 제안한 decision도 서버 정책이 덮어쓴다.

---

## 1. 수집 (`collect.js`)

1. 활성 source(빅6 담당 X 계정)에서 최신 게시물을 가져온다(`fetchUserPosts`).
2. `raw_post_id`로 **이미 처리한 글은 스킵**(`alreadyProcessed`).
3. 새 글마다 `classifyPost` 호출 → 결과로 status 결정 → `content_items`에 저장.
4. `audit_events`에 `content_classified` 기록, Slack 알림(`published`/`review`).

상태 매핑(`statusForDecision`):

| AI/정책 decision | content_items.status |
|---|---|
| publish | `published` |
| discard | `discarded` |
| 그 외(review) | `review` |

---

## 2. 사전 게이트 (서버, AI 호출 전) — `classifyPost` 진입부

토큰 절약과 결정론적 폐기를 위해 **AI를 부르기 전에** 서버가 먼저 거른다.

```js
const evidenceTeams = matchTeams(post.text, aliases);
if (evidenceTeams.length === 0) return fallbackClassify(post, aliases);   // 팀 미매칭 → 폐기
if (isClearlyNonInformative(post)) return fallbackClassify(post, aliases); // 반응/티저 → 폐기
```

- **팀 미매칭**: 본문에 빅6 팀명/선수 alias가 하나도 안 걸리면 폐기. **전문기자(`specialty_team`) 작성자라도 동일** — 담당 팀 자동 귀속(specialist fallback)은 제거됨.
- **반응성/티저**(`isClearlyNonInformative`): URL 제거 후 12자 미만, `soon/watch/thoughts` 류 티저, 팀명+티저 패턴 등 → 폐기.

이 두 경우는 **OpenAI 호출 자체를 하지 않는다.** (폐기는 전적으로 서버 판단)

---

## 3. 별칭 매칭 (`constants.js`)

"본문에서 이름을 추출"하는 게 아니라, **등록된 별칭을 본문 문자열에 하나씩 대보는 역방향 매칭**이다.

- `matchesAlias(text, alias)`:
  - 영문 별칭 → 단어경계 정규식 `(^|비문자)alias(비문자|$)` (예: "Son"이 "season" 안에서 오탐 안 됨)
  - 한글 별칭 → 단순 `includes`
  - `AMBIGUOUS_ALIASES`(rumour/bid/target 등 흔한 단어)는 제외
- `matchTeams(text, aliases)` → 매칭된 **팀 코드** 배열 (하드코딩 팀명 + DB alias 모두 검사)
- `matchAliasRows(text, aliases)` → 매칭된 **행 자체** 반환 (AI 인풋·korean_name용)

> ⚠️ 한계: 성(姓) 단독 별칭("Martinez", "Fernandes")은 동명이인 오탐 위험. 예) "Roberto Martinez"가 "Martinez(리산드로, MUN)"에 걸려 잘못 MUN으로 잡힐 수 있음.

---

## 4. AI 분류 + 브리핑 (`classifyPost`)

- **인풋 슬림화**: `target_team_aliases`에 전체 433행이 아니라 **이 트윗에 매칭된 행만**(`matchAliasRows`) 전달 → 토큰 대폭 절감.
- 각 행의 **`korean_name`**을 함께 전달하고, 프롬프트가 "선수 이름은 이 값을 그대로 쓰라"고 강제(임의 음역 금지).
- AI 출력(요약): `is_target_relevant, teams, decision, is_informative, requires_visual_context, is_journalist_opinion, briefing{title, summary_short, summary_detail, tags, status}`.
- **한국어 재시도(최대 1회)**: 결과가 "다른 조건은 다 통과하는데 한국어 브리핑만 부족"한 경우에만 1회 재생성. 검수/폐기로 갈 글은 재시도하지 않는다(토큰 절약).

브리핑 톤/형식 규칙은 `content.md` 참고(한국어 기사체, 트윗 사실만, 과장·해석 금지, 제목 형식 `[주어] [핵심 동사구]` 등).

---

## 5. 최종 라우팅 (`enforcePolicy`) — rule 1~7

위에서 아래로 평가, 먼저 걸리는 규칙으로 확정.

| # | 조건 | 결과 | 비고 |
|---|---|---|---|
| 1 | 대상 팀 없음 (`!hasPossibleTarget`) | **폐기** | 본문/모델 모두 팀 근거 없음 |
| 1.5 | 반응/티저 (`isClearlyNonInformative`) | **폐기** | 검수로 안 보냄 |
| 2 | 시각자료 필요 (`requires_visual_context`) | 검수 | 이미지/영상 봐야 의미 파악 |
| 3 | 정보성 부족 (`!is_informative`) | 검수 | "게시글 자체에서 전달할 정보가 부족..." |
| 4 | 팀 확정 불가 (`team_resolution≠certain`) | 검수 | 본문 매칭 글엔 거의 안 걸림(매칭=certain) |
| 5 | 기자 의견글 (`is_journalist_opinion`) | 검수 | 감상·평가 중심 |
| 6 | AI는 discard 했으나 팀 근거 있음 | 검수 | "대상 팀 근거가 있어 폐기 전에 검수..." |
| 7 | 추가 검수사유 없음 | **발행** | 모두 통과 → publish |

**자동발행 조건**(rule 7 도달):
본문 alias 매칭으로 팀 확정 + 정보성 있음 + 시각자료 불필요 + 팀 certain + 기자의견 아님 + AI가 discard 안 함 + 잔여 검수사유 없음.

---

## 6. 검수 사유(review_reason)는 누가?

- **분기 결정** = 서버(`enforcePolicy`).
- **사유 문구** = AI가 자기 `review_reason`을 줬으면 그것, 없으면(`null`) **걸린 규칙의 서버 하드코딩 기본 문장**.
- 따라서 화면의 "정보 부족", "팀 확정 불가", "폐기 전에 검수..." 등은 모두 **서버 라벨**이다. 매칭이 틀어지면(예: 성 오탐) 라벨도 실제 원인과 어긋날 수 있다.

---

## 7. 폐기 vs 검수의 관계 (요약)

- **폐기 = 서버가 AI 없이 결정**: 팀 미매칭 또는 반응/티저(사전 게이트). AI 호출 0회.
- **AI가 돌아간 글은 폐기로 안 간다**: 이미 "팀 매칭 + 비티저"이므로 결과는 검수 아니면 발행.
- **AI가 스스로 discard 제안해도** 팀 근거가 있으면 서버가 rule 6로 **검수로 승격**(사람이 오탐 최종 확인).

---

## 8. 재생성 경로(참고) — `admin/regenerate`

관리자가 "추가 의견"을 넣고 재생성하면, AI가 **브리핑 텍스트만** 다시 만든다(분기/상태는 안 건드림). 이때도 alias는 해당 트윗 매칭 행만 전달하고, "추가 의견"은 검증된 사실로 취급해 요약에 반영한다. 결과는 draft에만 반영되며 **저장 버튼**을 눌러야 DB에 반영된다.

---

## 9. 데이터 모델 접점

- `content_items`: `raw_*`(원문), `ai_result`(AI 전체 결과), `team_tags`, `briefing_status`, `title_ko/summary_short_ko/summary_detail_ko`, `status`, `published_at`, `review_reason` 등.
- `team_aliases`: `team_code, alias, entity_type, korean_name, notes, active`. 매칭·한국어 표기에 사용.
- `audit_events`: `content_classified`, `collector_run_completed`, `admin_*` 등 이력.
