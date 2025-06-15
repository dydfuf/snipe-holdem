// 이벤트 로그 서비스 구현체 - AGENTS.md 섹션 5 D1 스키마 규칙 준수

interface GameEvent {
  type: string
  [key: string]: any
}

export async function logEvent(
  db: D1Database,
  roomId: string,
  version: number,
  event: GameEvent
): Promise<void> {
  try {
    // INSERT 전용 - Roll‑forward only (AGENTS.md 요구사항)
    const stmt = db.prepare(`
      INSERT INTO event_log (room_id, ver, event, ts)
      VALUES (?, ?, ?, datetime('now'))
    `)

    await stmt.bind(roomId, version, JSON.stringify(event)).run()
  } catch (error) {
    console.error('Failed to log event:', error)
    // 이벤트 로그 실패는 게임 진행을 막지 않음 (옵션 - 디버깅 목적)
  }
}

export async function getEventHistory(
  db: D1Database,
  roomId: string,
  fromVersion?: number
): Promise<GameEvent[]> {
  try {
    let stmt: D1PreparedStatement

    if (fromVersion !== undefined) {
      stmt = db.prepare(`
        SELECT ver, event, ts 
        FROM event_log 
        WHERE room_id = ? AND ver >= ?
        ORDER BY ver ASC, id ASC
      `)
      stmt = stmt.bind(roomId, fromVersion)
    } else {
      stmt = db.prepare(`
        SELECT ver, event, ts 
        FROM event_log 
        WHERE room_id = ?
        ORDER BY ver ASC, id ASC
      `)
      stmt = stmt.bind(roomId)
    }

    const results = await stmt.all()

    return (
      results.results?.map((row) => ({
        version: row.ver as number,
        timestamp: row.ts as string,
        ...JSON.parse(row.event as string),
      })) || []
    )
  } catch (error) {
    console.error('Failed to get event history:', error)
    return []
  }
}

export async function replayEvents(
  db: D1Database,
  roomId: string,
  toVersion: number
): Promise<GameEvent[]> {
  // 특정 버전까지의 이벤트 재생용
  return getEventHistory(db, roomId, 0).then((events) =>
    events.filter((event) => event.version <= toVersion)
  )
} 