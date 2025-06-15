import { assign } from 'xstate'
import type { GameContext } from '../types/context'
import {
  canConfirmSurvival,
  distributeRemainingChips,
  processSurvivalConfirmation,
} from '../utils/survival'

// AIDEV‑NOTE: 생존 확정 처리 - game-rule.md 섹션 2.10 기준
// 시작칩+15 이상 달성 시 75칩 지불 후 생존 확정

export const checkSurvival = assign(({ context }: { context: GameContext }) => {
  let updatedPlayers = [...context.players]
  let totalPaidChips = 0

  // 생존 확정 가능한 플레이어들 자동 처리
  for (let i = 0; i < updatedPlayers.length; i++) {
    const player = updatedPlayers[i]

    if (canConfirmSurvival(player, context.initialPlayerCount)) {
      const { updatedPlayer, paidChips } = processSurvivalConfirmation(
        player,
        context.initialPlayerCount
      )
      updatedPlayers[i] = updatedPlayer
      totalPaidChips += paidChips
    }
  }

  // 생존 확정자들이 지불한 칩을 남은 플레이어들에게 분배
  if (totalPaidChips > 0) {
    updatedPlayers = distributeRemainingChips(updatedPlayers, totalPaidChips)
  }

  return {
    players: updatedPlayers,
    version: context.version + 1,
  }
}) 