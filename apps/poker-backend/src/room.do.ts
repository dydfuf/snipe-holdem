import { gameMachine } from '@repo/fsm'
import { createRandom } from '@repo/fsm/src/services/random'
import { interpret } from 'xstate'
import { loadSnapshot, saveSnapshot } from './services/snapshot.impl'

export class RoomDO implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private sockets: Set<WebSocket> = new Set()
  private fsm = interpret(gameMachine)

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env

    // FSM 서비스 DI
    this.fsm = interpret(gameMachine, {
      services: {
        rng: createRandom(Date.now()),
        saveSnapshot: (snap) => saveSnapshot(env.DB, state.id.toString(), snap),
        loadSnapshot: () => loadSnapshot(env.DB, state.id.toString()),
      },
    })

    this.fsm.start()

    // 5초마다 스냅샷
    this.state.setAlarm(Date.now() + 5_000)
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair())
      server.accept()
      this.handleSocket(server)
      return new Response(null, { status: 101, webSocket: client })
    }
    // 스냅샷 REST GET
    if (new URL(req.url).pathname === '/snapshot') {
      const snap = await loadSnapshot(this.env.DB, this.state.id.toString())
      return Response.json(snap)
    }
    return new Response('OK')
  }

  private handleSocket(ws: WebSocket) {
    this.sockets.add(ws)

    ws.addEventListener('message', (e) => {
      try {
        this.fsm.send(JSON.parse(e.data as string))
      } catch {
        /* malformed */
      }
    })
    ws.addEventListener('close', () => this.sockets.delete(ws))

    // FSM → diff broadcast
    this.fsm.subscribe((snap) => {
      if (!snap.changed) return
      const diff = snap.event // @repo/fsm diff 타입
      const json = JSON.stringify(diff)
      for (const s of this.sockets) s.send(json)
    })
  }

  // Durable Object alarm (5초 주기)
  async alarm() {
    const snap = this.fsm.getSnapshot()
    await saveSnapshot(this.env.DB, this.state.id.toString(), {
      version: snap.context.version,
      state: snap,
    })
    // 재등록
    this.state.setAlarm(Date.now() + 5_000)
  }
}