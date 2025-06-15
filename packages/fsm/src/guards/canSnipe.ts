import type { GameContext } from '../types/context'

import { canPlayerSnipe } from '../utils/snipe'

// AIDEV-NOTE: 저격 선언 가능 여부 가드 - game-rule.md 섹션 4 기준

export function canSnipe({
  context,
  event,
}: {
  context: GameContext
  event: { type: 'SNIPE_ACTION'; playerId: string }
}): boolean {
  const { playerId } = event
  const player = context.players.find((p) => p.id === playerId)

  if (!player) return false

  return canPlayerSnipe(player)
}
