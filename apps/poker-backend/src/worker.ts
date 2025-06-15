import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)

    // WebSocket 업그레이드 → Room Durable Object
    if (url.pathname === '/ws') {
      const room = url.searchParams.get('room')
      if (!room) return new Response('room required', { status: 400 })
      const id = env.ROOM.idFromName(room)
      return await env.ROOM.get(id).fetch(req)
    }

    // 로비 API
    if (url.pathname.startsWith('/api/create-room')) {
      return await env.MATCH.get(env.MATCH.idFromName('lobby')).fetch(req)
    }

    // 정적 자산 프락시 (클라이언트 CSR 번들)
    return getAssetFromKV({ request: req, waitUntil: ctx.waitUntil.bind(ctx) })
  },
} satisfies ExportedHandler

interface Env {
  ROOM: DurableObjectNamespace
  MATCH: DurableObjectNamespace
  DB: D1Database
  JWT_SECRET: string
}