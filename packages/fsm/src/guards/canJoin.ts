import type { GameContext } from '../types/context'

// AIDEV-NOTE: 플레이어 참여 가능 여부 체크 - 중복 방지 및 최대 6명 제한
export const canJoin = ({
  context,
  event,
}: {
  context: GameContext
  event: { type: 'JOIN'; playerId: string }
}) => {
  // 최대 6명 제한
  if (context.players.length >= 6) {
    return false
  }

  // 중복 플레이어 체크
  const existingPlayer = context.players.find((p) => p.id === event.playerId)
  if (existingPlayer) {
    return false
  }

  return true
}
