-- 001_initial_schema.sql
-- AGENTS.md 섹션 5 D1 스키마 규칙 구현
-- 저격 홀덤 게임 데이터베이스 초기 스키마

-- 룸 스냅샷 테이블 (최신 버전만 저장 - UPSERT)
CREATE TABLE IF NOT EXISTS room_snapshots (
  id TEXT PRIMARY KEY,                    -- Room ID
  version INTEGER NOT NULL,               -- 게임 상태 버전
  data TEXT NOT NULL,                     -- JSON 직렬화된 GameContext
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 이벤트 로그 테이블 (INSERT 전용, UPDATE 금지 - Roll-forward only)
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 자동 증가 ID
  room_id TEXT NOT NULL,                 -- Room ID
  ver INTEGER NOT NULL,                  -- 이벤트 발생 시점 버전
  event TEXT NOT NULL,                   -- JSON 직렬화된 이벤트
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 이벤트 발생 시각
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_event_log_room_id ON event_log(room_id);
CREATE INDEX IF NOT EXISTS idx_event_log_room_ver ON event_log(room_id, ver);
CREATE INDEX IF NOT EXISTS idx_event_log_ts ON event_log(ts);

-- 룸 스냅샷 업데이트 시각 인덱스
CREATE INDEX IF NOT EXISTS idx_room_snapshots_updated ON room_snapshots(updated_at); 