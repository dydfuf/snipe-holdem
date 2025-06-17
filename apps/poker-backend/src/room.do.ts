import { gameMachine } from '@repo/fsm'
import { createActor } from 'xstate'
import { logEvent } from './services/eventlog.impl'
import { loadSnapshot, saveSnapshot } from './services/snapshot.impl'

// CloudFlare Workers Durable Object 타입 확장
interface ExtendedDurableObjectState extends DurableObjectState {
  setAlarm(scheduledTime: number): void
}

export class RoomDO implements DurableObject {
  private state: ExtendedDurableObjectState
  private env: Env
  private sockets: Set<WebSocket> = new Set()
  private roomActor: any

  constructor(state: DurableObjectState, env: Env) {
    this.state = state as ExtendedDurableObjectState
    this.env = env

    // XState v5 createActor with input (AGENTS.md 섹션 2-3)
    this.roomActor = createActor(gameMachine as any, {
      input: { rng: () => Math.random() },
    })

    // Actor 시작 및 구독
    this.roomActor.start()
    this.subscribeToActor()

    // 스냅샷 복원 시도
    this.loadInitialSnapshot()

    // 5초마다 스냅샷 알람 설정
    this.state.setAlarm(Date.now() + 5_000)
  }

  private async loadInitialSnapshot() {
    try {
      const snapshot = await loadSnapshot(this.env.DB, this.state.id.toString())
      if (snapshot) {
        // 스냅샷이 있으면 복원
        this.roomActor.send({ type: 'RESTORE_SNAPSHOT', data: snapshot.data })
      }
    } catch (error) {
      console.warn('Failed to load initial snapshot:', error)
    }
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)

    // WebSocket 업그레이드
    if (req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      server.accept()
      this.handleSocket(server)
      return new Response(null, {
        status: 101,
        webSocket: client,
      } as ResponseInit & { webSocket: WebSocket })
    }

    // REST API: 스냅샷 조회
    if (url.pathname === '/snapshot') {
      try {
        const snap = await loadSnapshot(this.env.DB, this.state.id.toString())
        return Response.json(snap || { error: 'No snapshot found' })
      } catch {
        return Response.json({ error: 'Failed to load snapshot' }, { status: 500 })
      }
    }

    return new Response('Room DO Ready', { status: 200 })
  }

  private handleSocket(ws: WebSocket) {
    try {
      this.sockets.add(ws)

      ws.addEventListener('message', async (e) => {
        try {
          const intent = JSON.parse(e.data as string)

          // 이벤트 로깅 (AGENTS.md 섹션 5 Roll-forward only)
          const currentSnapshot = this.roomActor.getSnapshot()
          await logEvent(
            this.env.DB,
            this.state.id.toString(),
            currentSnapshot.context?.version || 0,
            intent
          )

          // ClientIntent를 Room Actor로 전송
          this.roomActor.send(intent)
        } catch {
          // 잘못된 JSON 포맷 시 소켓 종료
          ws.close(1003, 'Invalid JSON format')
        }
      })

      ws.addEventListener('close', () => {
        this.sockets.delete(ws)
      })

      ws.addEventListener('error', () => {
        this.sockets.delete(ws)
      })
    } catch {
      ws.close(1011, 'Internal server error')
    }
  }

  private subscribeToActor() {
    // Actor 상태 변경 시 모든 소켓에 diff 브로드캐스트
    this.roomActor.subscribe((snapshot: any) => {
      if (snapshot.changed) {
        const diff = {
          type: 'STATE',
          value: snapshot.value,
          version: snapshot.context?.version || 0,
        }
        this.broadcastToSockets(diff)
      }
    })
  }

  private broadcastToSockets(diff: any) {
    const message = JSON.stringify(diff)
    for (const socket of this.sockets) {
      try {
        socket.send(message)
      } catch {
        // 소켓이 닫혔을 경우 제거
        this.sockets.delete(socket)
      }
    }
  }

  // Durable Object alarm (5초 주기 스냅샷)
  async alarm() {
    try {
      const snapshot = this.roomActor.getSnapshot()
      await saveSnapshot(this.env.DB, this.state.id.toString(), {
        version: snapshot.context?.version || 0,
        data: snapshot.context,
      })

      // 다음 알람 예약 (5초 후)
      this.state.setAlarm(Date.now() + 5_000)
    } catch {
      // 알람 실패 시 재시도 (짧은 간격)
      this.state.setAlarm(Date.now() + 1_000)
    }
  }
}

// 환경 변수 타입 정의 (CloudFlare Workers 글로벌 타입 사용)
interface Env {
  ROOM: DurableObjectNamespace
  MATCH: DurableObjectNamespace
  DB: D1Database
  JWT_SECRET: string
}