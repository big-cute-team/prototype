-- =====================================================================
-- EPL 축구 뉴스 요약 서비스 — Supabase(PostgreSQL) 스키마
-- 설계 문서: Confluence "RDB" (v12) 기준, 총 18개 테이블
--
-- 변환 정책
--   1) enum 성격 컬럼 = VARCHAR + CHECK 제약 (문서 8장: 유연성 우선, 4컬럼 통일)
--   2) FK 인덱스 = 문서 의도대로 명시적으로 추가
--      (PostgreSQL은 MySQL/InnoDB와 달리 FK에 자동 인덱스를 만들지 않음)
--   3) PK = BIGINT GENERATED ALWAYS AS IDENTITY (MySQL BIGINT auto_increment 대응)
--   4) 타임스탬프 = TIMESTAMPTZ, updated_at은 트리거로 자동 갱신
--
-- 실행: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 RUN
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 공통: updated_at 자동 갱신 트리거 함수
--    (MySQL의 ON UPDATE CURRENT_TIMESTAMP 대응)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- A. 마스터 데이터 (사전) — 다른 테이블이 참조하는 부모부터 생성
-- =====================================================================

-- 3.5 teams — 팀 (EPL 6개 고정, 사실상 변경 없음)
CREATE TABLE teams (
  team_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_en     VARCHAR(100) NOT NULL,
  name_ko     VARCHAR(100) NOT NULL,
  short_name  VARCHAR(10)  NOT NULL,            -- MUN 같은 3글자 약자
  logo_url    TEXT                              -- S3 URL, 나중에 채울 여지 → NULL 허용
);
COMMENT ON TABLE teams IS '팀 마스터 데이터(6개 고정). 6행이라 별도 인덱스 없음(풀스캔이 더 빠름)';

-- 3.6 reporters — 기자 (사전 입력 + 추가 등록 지속)
CREATE TABLE reporters (
  reporter_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,        -- 영문 기자명
  x_user_id       VARCHAR(100),                 -- X API용 숫자 ID(불변). 외부 식별자라 VARCHAR
  x_handle        VARCHAR(100),                 -- 사람이 알아보는 핸들(@ 제외)
  is_active       BOOLEAN NOT NULL DEFAULT true, -- 기자별 수집 활성화 여부
  last_article_id VARCHAR(100)                  -- 마지막 수집 X 게시물 id(증분 수집 since_id)
  -- x_user_id 인덱스는 의도적으로 두지 않음(기자 수 1000 미만, 풀스캔 충분) — 문서 3.6 / 6장
);
COMMENT ON TABLE reporters IS '기자. 티어는 팀마다 다르므로 reporter_teams에 위치';

-- 3.3 figures — 인물 (AI 매칭 기준 사전)
CREATE TABLE figures (
  figure_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     BIGINT REFERENCES teams(team_id), -- 무소속 가능 → NULL 허용
  name_en     VARCHAR(255) NOT NULL,            -- 매칭 키(영문)
  name_ko     VARCHAR(255) NOT NULL,
  type        VARCHAR(20)  NOT NULL,            -- PLAYER/MANAGER/COACH/OWNER/OTHER
  description VARCHAR(100),
  CONSTRAINT chk_figures_type
    CHECK (type IN ('PLAYER','MANAGER','COACH','OWNER','OTHER'))
);
COMMENT ON TABLE figures IS '인물(매칭 기준 사전). 운영하며 계속 추가';

-- 3.4 figure_aliases — 인물 별칭 (자동 매칭 실제 키)
CREATE TABLE figure_aliases (
  figure_alias_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  figure_id       BIGINT NOT NULL REFERENCES figures(figure_id),
  alias           VARCHAR(255) NOT NULL         -- 동명이인 허용 → UNIQUE 아님(일반 인덱스)
);
COMMENT ON TABLE figure_aliases IS '인물 별칭. 같은 alias가 여러 figure에 걸리는 동명이인 허용';

-- 3.7 reporter_teams — 기자별 팀 공신력(티어)
CREATE TABLE reporter_teams (
  reporter_team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id      BIGINT NOT NULL REFERENCES reporters(reporter_id),
  team_id          BIGINT NOT NULL REFERENCES teams(team_id),
  tier             INT,                         -- 1이 최상위 가정. 연결 먼저/티어 나중 위해 NULL 허용
  CONSTRAINT uq_reporter_team UNIQUE (reporter_id, team_id)
);
COMMENT ON TABLE reporter_teams IS '기자 x 팀 조합별 공신력 티어';


-- =====================================================================
-- B. 콘텐츠 파이프라인
-- =====================================================================

-- 3.2 article_summaries — AI 요약 콘텐츠 (서비스 중심 테이블)
--   ※ 다른 테이블을 참조하지 않음 (여러 테이블의 참조 대상)
CREATE TABLE article_summaries (
  article_summary_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,         -- 제목
  summary_short  TEXT NOT NULL,                 -- 짧은 요약(카드용)
  summary_detail TEXT NOT NULL,                 -- 상세 요약(출처 포함)
  content_type   VARCHAR(20) NOT NULL DEFAULT 'GENERAL', -- 표시 형태
  status         VARCHAR(20) NOT NULL,          -- 발행 워크플로 (생성 시 REVIEW/IRRELEVANT)
  category       VARCHAR(20) NOT NULL,          -- 게시글 유형(dedup 라우팅 키)
  rumor_stage    VARCHAR(20),                   -- 루머 단계(임시·향후) → NULL 허용
  published_at   TIMESTAMPTZ,                   -- 발행 시점에 채움 → NULL 허용. 피드 정렬 기준
  image_url      TEXT,                          -- 카드 표시용 대표 이미지 URL(운영 중 직접 입력) [2026-06-29 추가]
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_as_content_type
    CHECK (content_type IN ('GENERAL','DEBATE','FINISH')),
  CONSTRAINT chk_as_status
    CHECK (status IN ('REVIEW','IRRELEVANT','PUBLISHED','DISCARDED')),
  CONSTRAINT chk_as_category
    CHECK (category IN ('TRANSFER','MATCH','FITNESS','OTHER')),
  CONSTRAINT chk_as_rumor_stage
    CHECK (rumor_stage IS NULL OR rumor_stage IN ('RUMOR','IN_PROGRESS','OFFICIAL'))
);
COMMENT ON TABLE article_summaries IS '서비스 중심 테이블. content_type/status/category 3축 독립';

CREATE TRIGGER trg_as_updated_at
  BEFORE UPDATE ON article_summaries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3.1 raw_articles — 원문 기사 (파이프라인 시작점)
CREATE TABLE raw_articles (
  raw_article_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id BIGINT REFERENCES article_summaries(article_summary_id), -- 수집 직후 미연결 → NULL. 원문 N : 요약 1
  reporter_id        BIGINT NOT NULL REFERENCES reporters(reporter_id),
  reporter_tier      INT,                       -- 처리 시점 기자 티어 스냅샷(비정규화)
  content            TEXT NOT NULL,             -- 본문 즉시 채움(AI 입력)
  source_url         TEXT,                      -- 원문(트윗) 링크. 기획서 4.4 "원문 링크 항상 제공" [2026-06-29 추가]
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE raw_articles IS '원문 기사(본문 포함). reporter_tier는 처리 시점 스냅샷';

-- 3.14 unmatched_keywords — 미매칭 키워드 목록(관리자 검수용 큐)
CREATE TABLE unmatched_keywords (
  unmatched_keyword_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  raw_article_id       BIGINT NOT NULL REFERENCES raw_articles(raw_article_id), -- 처음 등장한 출처
  keyword              VARCHAR(255) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_unmatched_keyword UNIQUE (keyword) -- 같은 키워드 중복 적재 방지(검색 겸용)
);
COMMENT ON TABLE unmatched_keywords IS '사전 미매칭 키워드 큐. 처리하면 row DELETE';

-- 3.18 article_status_logs — 발행/폐기 상태 전이 이력(시점 로그)
CREATE TABLE article_status_logs (
  article_status_log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id    BIGINT NOT NULL REFERENCES article_summaries(article_summary_id), -- 1:N
  status                VARCHAR(20) NOT NULL,    -- PUBLISHED / DISCARDED
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(), -- 전이 시각(핵심 값)
  CONSTRAINT chk_asl_status
    CHECK (status IN ('PUBLISHED','DISCARDED'))
  -- "누가"(actor) 컬럼 없음: 계정 없는 공용 어드민. 유니크 없음: 되돌림 허용
);
COMMENT ON TABLE article_status_logs IS '발행/폐기 전이 이력. 발행·폐기만 기록(REVIEW/IRRELEVANT 제외)';


-- =====================================================================
-- C. 요약 ↔ 팀
-- =====================================================================

-- 3.9 team_tags — 요약↔팀 연결 (AI 매칭 결과)
CREATE TABLE team_tags (
  team_tag_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id BIGINT NOT NULL REFERENCES article_summaries(article_summary_id),
  team_id            BIGINT NOT NULL REFERENCES teams(team_id),
  CONSTRAINT uq_team_tag UNIQUE (article_summary_id, team_id) -- 중복 태그 방지 + 역방향(요약→팀) 조인 겸용
);
COMMENT ON TABLE team_tags IS '요약↔팀. 유니크(article_summary_id, team_id)가 역방향 조인 인덱스 겸용';


-- =====================================================================
-- D. 사용자 활동
-- =====================================================================

-- 3.8 users — 유저 (소셜 로그인 OAuth)
CREATE TABLE users (
  user_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider    VARCHAR(20) NOT NULL,             -- GOOGLE/KAKAO/NAVER
  provider_id VARCHAR(255) NOT NULL,            -- 소셜 발급 고유 식별자
  nickname    VARCHAR(100),                     -- 온보딩서 직접 입력 → 입력 전 NULL 허용
  email       VARCHAR(255),                     -- 소셜 미동의 시 못 받음 → NULL 허용
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_provider UNIQUE (provider, provider_id), -- 소셜 중복 가입 방지
  CONSTRAINT chk_user_provider
    CHECK (provider IN ('GOOGLE','KAKAO','NAVER'))
  -- OAuth 토큰은 저장하지 않음(보안: 세션/시큐리티 레이어 관리)
);
COMMENT ON TABLE users IS '소셜 로그인 유저. (provider, provider_id) 복합 유니크';

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3.10 favorite_teams — 관심 팀 (유저↔팀 N:M)
CREATE TABLE favorite_teams (
  favorite_team_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(user_id),
  team_id          BIGINT NOT NULL REFERENCES teams(team_id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_favorite_team UNIQUE (user_id, team_id) -- 중복 등록 방지
);
COMMENT ON TABLE favorite_teams IS '관심 팀. 순서·대표 개념 없음. 해제 시 DELETE';

-- 3.11 likes — 요약 좋아요 (row 존재 = 좋아요)
CREATE TABLE likes (
  like_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(user_id),
  article_summary_id BIGINT NOT NULL REFERENCES article_summaries(article_summary_id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_like UNIQUE (user_id, article_summary_id) -- 중복 좋아요 방지
);
COMMENT ON TABLE likes IS '요약 좋아요. INSERT/DELETE 토글, COUNT로 집계';

-- 3.12 comments — 댓글 (1단계 대댓글)
CREATE TABLE comments (
  comment_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id BIGINT NOT NULL REFERENCES article_summaries(article_summary_id),
  user_id            BIGINT NOT NULL REFERENCES users(user_id),
  parent_comment_id  BIGINT REFERENCES comments(comment_id), -- 자기참조. 최상위=NULL, 대댓글=부모
  content            TEXT NOT NULL,
  is_deleted         BOOLEAN NOT NULL DEFAULT false, -- 삭제 플래그(대댓글 보존)
  is_edited          BOOLEAN NOT NULL DEFAULT false, -- 수정 여부 명시
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE comments IS '댓글(1단계 대댓글). 삭제는 플래그, 수정 가능';

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3.13 comment_likes — 댓글 좋아요
CREATE TABLE comment_likes (
  comment_like_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(user_id),
  comment_id      BIGINT NOT NULL REFERENCES comments(comment_id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_comment_like UNIQUE (user_id, comment_id) -- 중복 방지
);
COMMENT ON TABLE comment_likes IS '댓글 좋아요. likes와 동일 패턴(대상이 comment)';

-- 3.17 article_views — 조회 이력(숏폼 시청 기록, 개인화·추천용)
CREATE TABLE article_views (
  article_view_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(user_id),
  article_summary_id BIGINT NOT NULL REFERENCES article_summaries(article_summary_id),
  viewed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_article_view UNIQUE (user_id, article_summary_id) -- 중복 기록 방지 + "안 본 것만" 안티조인 겸용
);
COMMENT ON TABLE article_views IS '조회 이력. 개인화 피드 "본 것 제외" + 추천 학습 재료';


-- =====================================================================
-- E. 토론 / 투표
-- =====================================================================

-- 3.15 debates — 토론 (쇼츠당 1개, 2지선다)
CREATE TABLE debates (
  debate_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id BIGINT NOT NULL REFERENCES article_summaries(article_summary_id),
  topic              TEXT NOT NULL,             -- 논제/질문
  option_a           VARCHAR(255) NOT NULL,     -- 선택지 A 라벨
  option_b           VARCHAR(255) NOT NULL,     -- 선택지 B 라벨
  closes_at          TIMESTAMPTZ,               -- 마감 시각(표시 형태 전환 시점, 투표 차단 아님)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_debate_article UNIQUE (article_summary_id) -- 쇼츠당 토론 1개 강제(1:1)
);
COMMENT ON TABLE debates IS '2지선다 투표 토론(쇼츠당 1개). 마감은 표시 전환일 뿐 투표 계속 가능';

-- 3.16 debate_votes — 투표 기록
CREATE TABLE debate_votes (
  debate_vote_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  debate_id      BIGINT NOT NULL REFERENCES debates(debate_id), -- 투표는 토론 대상
  user_id        BIGINT NOT NULL REFERENCES users(user_id),
  option_type    VARCHAR(20),                   -- OPTION_A / OPTION_B
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(), -- 입장 바꿈 시각
  CONSTRAINT uq_debate_vote UNIQUE (user_id, debate_id), -- 중복 투표 방지(변경은 UPDATE)
  CONSTRAINT chk_dv_option_type
    CHECK (option_type IS NULL OR option_type IN ('OPTION_A','OPTION_B'))
);
COMMENT ON TABLE debate_votes IS '투표 기록. 변경은 기존 row UPDATE. option_type별 COUNT로 집계';

CREATE TRIGGER trg_dv_updated_at
  BEFORE UPDATE ON debate_votes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- F. 인덱스
-- =====================================================================

-- F-1. 문서 11장 확정 인덱스 (조회 경로별로 도출)
-- 경로1: 피드 조회 — PUBLISHED만 + 발행시각 최신순 + 커서
CREATE INDEX idx_feed ON article_summaries (status, published_at DESC);
-- 경로1(B): 개인화 피드 — team_id로 요약 찾기 (커버링)
CREATE INDEX idx_tt_team ON team_tags (team_id, article_summary_id);
-- 경로2: 댓글 목록 — 글별 + 시간순 (filesort 제거). 방향 무관이라 DESC 미지정
CREATE INDEX idx_cmt ON comments (article_summary_id, created_at);
-- 경로3: AI 매칭 — 별칭 키(동명이인 허용 → 일반 인덱스, UNIQUE 아님)
CREATE INDEX idx_alias ON figure_aliases (alias);
-- 경로3: AI 매칭 — 영문 이름 직접 매칭 키
CREATE INDEX idx_name_en ON figures (name_en);

-- F-2. FK 인덱스 (PostgreSQL은 FK 자동 인덱스가 없어 직접 추가)
--   ※ 복합 유니크/위 확정 인덱스가 leftmost로 이미 커버하는 FK는 중복 생성하지 않음:
--     - team_tags.article_summary_id      → uq_team_tag(article_summary_id, team_id) 커버
--     - team_tags.team_id                 → idx_tt_team(team_id, ...) 커버
--     - reporter_teams.reporter_id        → uq_reporter_team(reporter_id, team_id) 커버
--     - favorite_teams.user_id            → uq_favorite_team(user_id, team_id) 커버
--     - likes.user_id                     → uq_like(user_id, article_summary_id) 커버
--     - comment_likes.user_id             → uq_comment_like(user_id, comment_id) 커버
--     - comments.article_summary_id       → idx_cmt(article_summary_id, ...) 커버
--     - article_views.user_id             → uq_article_view(user_id, article_summary_id) 커버
--     - debate_votes.user_id              → uq_debate_vote(user_id, debate_id) 커버
--     - debates.article_summary_id        → uq_debate_article(article_summary_id) 커버
--     - unmatched_keywords.keyword 조회   → uq_unmatched_keyword 커버
--   아래는 위로 커버되지 않는 나머지 FK들.

CREATE INDEX idx_fa_figure_id        ON figure_aliases (figure_id);
CREATE INDEX idx_fig_team_id         ON figures (team_id);
CREATE INDEX idx_rt_team_id          ON reporter_teams (team_id);
CREATE INDEX idx_ra_summary_id       ON raw_articles (article_summary_id);
CREATE INDEX idx_ra_reporter_id      ON raw_articles (reporter_id);
CREATE INDEX idx_uk_raw_article_id   ON unmatched_keywords (raw_article_id);
CREATE INDEX idx_asl_summary_id      ON article_status_logs (article_summary_id);
CREATE INDEX idx_ft_team_id          ON favorite_teams (team_id);
CREATE INDEX idx_likes_summary_id    ON likes (article_summary_id);
CREATE INDEX idx_cmt_user_id         ON comments (user_id);
CREATE INDEX idx_cmt_parent_id       ON comments (parent_comment_id);
CREATE INDEX idx_cl_comment_id       ON comment_likes (comment_id);
CREATE INDEX idx_av_summary_id       ON article_views (article_summary_id);
CREATE INDEX idx_dv_debate_id        ON debate_votes (debate_id);

-- =====================================================================
-- 끝. 18개 테이블 + 트리거 + 인덱스 생성 완료.
-- =====================================================================
