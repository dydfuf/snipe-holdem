-- Migration: 0001_initial_schema.sql
-- 저격 홀덤 초기 스키마 생성
-- 실행: wrangler d1 migrations apply sniper_holdem

-- 룸 스냅샷 테이블
CREATE TABLE room_snapshots (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 이벤트 로그 테이블
CREATE TABLE event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  ver INTEGER NOT NULL,
  event TEXT NOT NULL,
  ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_room_snapshots_version ON room_snapshots(id, version);
CREATE INDEX idx_event_log_room ON event_log(room_id, ver);
CREATE INDEX idx_event_log_ts ON event_log(ts); 