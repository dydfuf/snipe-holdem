import type { D1Database } from '@cloudflare/workers-types'
import type { GameSnapshot } from '@repo/fsm/'

export async function saveSnapshot(db: D1Database, roomId: string, snap: GameSnapshot) {
  await db
    .prepare(
      `INSERT OR REPLACE INTO room_snapshots(id, version, data)
     VALUES (?1, ?2, json(?3))`
    )
    .bind(roomId, snap.version, JSON.stringify(snap.state))
    .run()
}

export async function loadSnapshot(db: D1Database, roomId: string): Promise<GameSnapshot | null> {
  const row = await db
    .prepare('SELECT version, data FROM room_snapshots WHERE id = ?1')
    .bind(roomId)
    .first<{ version: number; data: string }>()
  if (!row) return null
  return { version: row.version, state: JSON.parse(row.data) }
}