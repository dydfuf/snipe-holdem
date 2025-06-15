export class MatchDO implements DurableObject {
  private env: Env
  constructor(
    private state: DurableObjectState,
    env: Env
  ) {
    this.env = env
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/create-room') {
      const roomId = crypto.randomUUID().slice(0, 8)
      const id = this.env.ROOM.idFromName(roomId)
      // 상태 초기화: 첫 스냅샷 dummy insert
      await this.env.DB.prepare(
        'INSERT INTO room_snapshots (id, version, data) VALUES (?1, 0, json(?2))'
      )
        .bind(roomId, '{}')
        .run()
      return Response.json({ roomId })
    }
    return new Response('Not found', { status: 404 })
  }
}