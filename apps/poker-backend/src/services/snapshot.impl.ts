import type { D1Database } from '@cloudflare/workers-types'

interface GameSnapshot {
  version: number
  data: any
}

export async function saveSnapshot(
  db: D1Database,
  roomId: string,
  snapshot: GameSnapshot
): Promise<void> {
  try {
    // UPSERT: 최신 버전만 저장 (AGENTS.md 요구사항)
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO room_snapshots 
      (id, version, data, updated_at) 
      VALUES (?, ?, ?, datetime('now'))
    `)

    await stmt.bind(roomId, snapshot.version, JSON.stringify(snapshot.data)).run()
  } catch (error) {
    console.error('Failed to save snapshot:', error)
    throw error
  }
}

export async function loadSnapshot(db: D1Database, roomId: string): Promise<GameSnapshot | null> {
  try {
    const stmt = db.prepare(`
      SELECT version, data 
      FROM room_snapshots 
      WHERE id = ? 
      ORDER BY version DESC 
      LIMIT 1
    `)

    const result = await stmt.bind(roomId).first()

    if (!result) {
      return null
    }

    return {
      version: result.version as number,
      data: JSON.parse(result.data as string),
    }
  } catch (error) {
    console.error('Failed to load snapshot:', error)
    throw error
  }
}