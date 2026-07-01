-- =====================================================================
-- 추가 테이블 (운영 중 생겨 정식 편입) — 19, 20, 21번째 테이블
--   19) matches              — 경기 (내부 생성 + 예측 투표)
--   20) card_news_publications — 카드뉴스/인스타 발행
--   21) world_cup_fixtures   — 월드컵 경기 일정 (외부 API 동기화)
-- 기존 schema.sql 실행 후 이어서 실행
-- =====================================================================

-- ---------------------------------------------------------------------
-- 19. matches — 경기
--   이전 DB: home_team/away_team이 text였으나, 6개 팀 고정이므로 teams FK로 정규화.
--   단, 상대가 EPL 외 팀(대표팀·타리그)일 수 있어 FK는 NULL 허용 + 원본 텍스트 보존.
-- ---------------------------------------------------------------------
CREATE TABLE matches (
  match_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  competition     VARCHAR(100),
  kickoff_at      TIMESTAMPTZ NOT NULL,
  -- 팀: 6팀이면 FK 연결, 외부팀이면 FK NULL + 텍스트만 보존
  home_team_id    BIGINT REFERENCES teams(team_id),
  away_team_id    BIGINT REFERENCES teams(team_id),
  home_team_text  VARCHAR(100) NOT NULL,   -- 원본 팀명(외부팀/대표팀 대비)
  away_team_text  VARCHAR(100) NOT NULL,
  home_flag       TEXT,
  away_flag       TEXT,
  group_name      VARCHAR(100),
  home_score      INT,
  away_score      INT,
  status          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  -- 경기 예측 투표 (콘텐츠 토론과 별개)
  prediction_question      TEXT,
  prediction_for_label     VARCHAR(255),
  prediction_against_label VARCHAR(255),
  prediction_for_count     INT NOT NULL DEFAULT 0,
  prediction_against_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_matches_status
    CHECK (status IN ('SCHEDULED','LIVE','FINISHED','POSTPONED','CANCELLED'))
);
COMMENT ON TABLE matches IS '경기. 6팀은 FK 연결, 외부팀은 텍스트 보존. 예측투표는 콘텐츠 토론과 별개';

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_matches_kickoff   ON matches (kickoff_at);
CREATE INDEX idx_matches_home_team ON matches (home_team_id);
CREATE INDEX idx_matches_away_team ON matches (away_team_id);

-- ---------------------------------------------------------------------
-- 20. card_news_publications — 카드뉴스/인스타 발행
--   발행 로그 성격 → jsonb 구조 유지. content_item_id(uuid)만 FK(BIGINT)로 전환.
--   대부분(64/67)은 콘텐츠와 무관(today_fixtures 등)이라 FK NULL 허용.
--   CHECK는 실제 운영값에 맞춤:
--     kind: today_fixtures / article
--     status: pending / completed / failed
--     instagram_status: idle / (운영 확장 대비 여유값 포함)
-- ---------------------------------------------------------------------
CREATE TABLE card_news_publications (
  card_news_publication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_summary_id  BIGINT REFERENCES article_summaries(article_summary_id), -- 콘텐츠 연결(없을 수 있음)
  kind                VARCHAR(30) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  render_job_id       TEXT,
  template_id         TEXT NOT NULL,
  title               TEXT NOT NULL,
  caption             TEXT,
  source_payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  pages               JSONB NOT NULL DEFAULT '[]'::jsonb,
  zip_url             TEXT,
  r2_prefix           TEXT,
  error_message       TEXT,
  -- 인스타그램 연동
  instagram_pages         JSONB NOT NULL DEFAULT '[]'::jsonb,
  instagram_status        VARCHAR(20) NOT NULL DEFAULT 'idle',
  instagram_media_id      TEXT,
  instagram_permalink     TEXT,
  instagram_caption       TEXT,
  instagram_error         TEXT,
  instagram_published_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  CONSTRAINT chk_cnp_kind
    CHECK (kind IN ('today_fixtures','article')),
  CONSTRAINT chk_cnp_status
    CHECK (status IN ('pending','rendering','completed','failed')),
  CONSTRAINT chk_cnp_instagram_status
    CHECK (instagram_status IN ('idle','pending','publishing','published','failed'))
);
COMMENT ON TABLE card_news_publications IS '카드뉴스/인스타 발행 로그. jsonb 구조 유지, content 연결은 선택';

CREATE INDEX idx_cnp_summary_id ON card_news_publications (article_summary_id);
CREATE INDEX idx_cnp_status     ON card_news_publications (status);

-- ---------------------------------------------------------------------
-- 21. world_cup_fixtures — 월드컵 경기 일정 (외부 스포츠 API 동기화)
--   이전 구조를 거의 1:1 보존. PK만 uuid→BIGINT.
--   ⚠️ home_team_id/away_team_id는 EPL teams가 아니라 "외부 API의 팀 ID"라
--      FK로 걸지 않고 BIGINT 값으로 보존한다. (국가대표팀이라 teams와 무관)
--   raw_fixture(jsonb)·동기화 시각·한글 현지화 컬럼 모두 유지.
-- ---------------------------------------------------------------------
CREATE TABLE world_cup_fixtures (
  world_cup_fixture_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_fixture_id       BIGINT NOT NULL,          -- 외부 API 경기 ID (내부 FK 아님)
  season               INT NOT NULL DEFAULT 2026,
  league_id            INT NOT NULL DEFAULT 1,
  round                TEXT,
  group_label          TEXT,
  kickoff_at           TIMESTAMPTZ NOT NULL,
  kickoff_date_kst     DATE NOT NULL,
  kickoff_time_kst     TEXT NOT NULL,
  -- 홈팀 (외부 API 값, 국가대표팀)
  home_team_id         BIGINT,                   -- 외부 API 팀 ID (내부 FK 아님)
  home_team_name_api   TEXT,
  home_team_name_ko    TEXT,
  home_code            TEXT,
  home_flag_url        TEXT,
  home_logo_url        TEXT,
  -- 원정팀
  away_team_id         BIGINT,                   -- 외부 API 팀 ID (내부 FK 아님)
  away_team_name_api   TEXT,
  away_team_name_ko    TEXT,
  away_code            TEXT,
  away_flag_url        TEXT,
  away_logo_url        TEXT,
  -- 경기장
  venue_name_api       TEXT,
  venue_name_ko        TEXT,
  venue_city_api       TEXT,
  venue_city_ko        TEXT,
  -- 상태/스코어
  status_short         TEXT,
  status_long          TEXT,
  home_score           INT,
  away_score           INT,
  -- 동기화 메타
  last_schedule_synced_at TIMESTAMPTZ,
  last_result_synced_at   TIMESTAMPTZ,
  raw_fixture          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_wcf_api_fixture UNIQUE (api_fixture_id)  -- 외부 ID 중복 동기화 방지
);
COMMENT ON TABLE world_cup_fixtures IS '월드컵 경기 일정(외부 API 동기화). 팀 ID는 외부 API 값이라 teams FK 아님';

CREATE TRIGGER trg_wcf_updated_at
  BEFORE UPDATE ON world_cup_fixtures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_wcf_kickoff ON world_cup_fixtures (kickoff_at);
CREATE INDEX idx_wcf_date_kst ON world_cup_fixtures (kickoff_date_kst);
