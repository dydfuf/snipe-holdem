// Match DO - 로비·룸 생성 API (AGENTS.md 섹션 1 디렉터리 규칙)

export class MatchDO implements DurableObject {
  private state: DurableObjectState
  private env: Env

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)

    // CORS 헤더 추가
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      // 룸 생성 API
      if (url.pathname === '/api/create-room' && req.method === 'POST') {
        const roomId = this.generateRoomId()

        return Response.json(
          {
            success: true,
            roomId,
            wsUrl: `/ws?room=${roomId}`,
          },
          { headers: corsHeaders }
        )
      }

      // 룸 목록 조회 (개발용)
      if (url.pathname === '/api/rooms' && req.method === 'GET') {
        // 실제로는 활성 룸 목록을 DB에서 조회해야 함
        return Response.json(
          {
            success: true,
            rooms: [],
          },
          { headers: corsHeaders }
        )
      }

      return new Response('Match DO API', {
        status: 200,
        headers: corsHeaders,
      })
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: 'Internal server error',
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      )
    }
  }

  private generateRoomId(): string {
    // URL-safe 8자리 룸 ID 생성 (AGENTS.md D1 컨벤션)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// 환경 변수 타입 정의
interface Env {
  ROOM: DurableObjectNamespace
  MATCH: DurableObjectNamespace
  DB: D1Database
  JWT_SECRET: string
}