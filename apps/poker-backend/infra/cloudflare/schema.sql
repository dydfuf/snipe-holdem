-- 저격 홀덤 D1 스키마 - AGENTS.md 섹션 5 D1 스키마 규칙 준수
-- 생성일: 2025-06-15

-- 룸 스냅샷 테이블 (최신 버전만 저장 - UPSERT)
CREATE TABLE IF NOT EXISTS room_snapshots (
  id TEXT PRIMARY KEY,                    -- 룸 ID (소문자 8 char UUID, URL‑safe)
  version INTEGER NOT NULL,               -- 게임 상태 버전
  data TEXT NOT NULL,                     -- JSON 스냅샷 데이터
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP  -- ISO8601 UTC
);

-- 이벤트 로그 테이블 (INSERT 전용, Roll‑forward only)
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 자동 증가 기본키
  room_id TEXT NOT NULL,                  -- 룸 ID 참조
  ver INTEGER NOT NULL,                   -- 해당 버전
  event TEXT NOT NULL,                    -- JSON 이벤트 데이터
  ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP  -- 타임스탬프 ISO8601 UTC
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_room_snapshots_version ON room_snapshots(id, version);
CREATE INDEX IF NOT EXISTS idx_event_log_room ON event_log(room_id, ver);
CREATE INDEX IF NOT EXISTS idx_event_log_ts ON event_log(ts);

-- 샘플 데이터 (개발용)
INSERT OR IGNORE INTO room_snapshots (id, version, data) 
VALUES ('testroom', 0, '{"players":[],"pot":0,"version":0}'); 