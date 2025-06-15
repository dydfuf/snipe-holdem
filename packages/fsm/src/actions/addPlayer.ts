import { assign } from 'xstate'
import type { GameContext } from '../types/context'
import { STARTING_CHIPS } from '../types/context'

// AIDEV‑NOTE: 플레이어 추가 액션 - 중복 방지 및 최대 6명 제한
export const addPlayer = assign(
  ({ context, event }: { context: GameContext; event: { type: 'JOIN'; playerId: string } }) => {
    // 중복 플레이어 체크
    const existingPlayer = context.players.find((p) => p.id === event.playerId)
    if (existingPlayer) {
      return {} // 중복 시 변경 없음
    }

    // 최대 6명 제한
    if (context.players.length >= 6) {
      return {} // 최대 인원 초과 시 변경 없음
    }

    const newPlayerCount = context.players.length + 1
    const startingChips = STARTING_CHIPS[newPlayerCount] || 100

    // 모든 플레이어의 칩을 새로운 인원수에 맞게 업데이트
    const updatedPlayers = context.players.map((player) => ({
      ...player,
      chips: startingChips,
    }))

    return {
      players: [
        ...updatedPlayers,
        {
          id: event.playerId,
          chips: startingChips, // 인원수별 시작 칩 설정
          bet: 0,
          folded: false,
          isSurvived: false,
        },
      ],
      initialPlayerCount: newPlayerCount, // 초기 플레이어 수 설정
    }
  }
)
