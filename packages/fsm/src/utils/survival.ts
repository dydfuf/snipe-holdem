import type { Player } from '../types/context'

import { SURVIVAL_CHIPS } from '../types/context'

// AIDEV-NOTE: 저격 홀덤 생존 확정 시스템 - game-rule.md 섹션 1, 2.10 기준

/** 플레이어가 생존 확정 가능한지 확인 */
export function canConfirmSurvival(player: Player, initialPlayerCount: number): boolean {
  // 이미 생존 확정된 플레이어는 불가
  if (player.isSurvived) return false

  const requiredChips = SURVIVAL_CHIPS[initialPlayerCount] || 75

  // 필요한 칩 수 이상을 보유해야 함
  return player.chips >= requiredChips
}

/** 생존 확정 처리 */
export function processSurvivalConfirmation(
  player: Player,
  initialPlayerCount: number
): {
  updatedPlayer: Player
  paidChips: number
} {
  const paymentChips = 75 // 실제 지불은 항상 75칩

  if (!canConfirmSurvival(player, initialPlayerCount)) {
    throw new Error(`Player ${player.id} cannot confirm survival`)
  }

  return {
    updatedPlayer: {
      ...player,
      chips: player.chips - paymentChips,
      isSurvived: true,
    },
    paidChips: paymentChips,
  }
}

/** 생존 확정자들에게 남은 칩 분배 */
export function distributeRemainingChips(players: Player[], totalChips: number): Player[] {
  const survivedPlayers = players.filter((p) => p.isSurvived)

  if (totalChips === 0 || survivedPlayers.length === 0) {
    return players
  }

  // 0칩 플레이어에게 최소 1칩씩 우선 분배 (game-rule.md 섹션 2.10)
  let remainingChips = totalChips
  const updatedPlayers = players.map((player) => {
    if (!player.isSurvived && player.chips === 0 && remainingChips > 0) {
      remainingChips--
      return { ...player, chips: 1 }
    }
    return player
  })

  // 남은 칩을 생존 확정자들에게 임의 분배
  if (remainingChips > 0 && survivedPlayers.length > 0) {
    const chipsPerSurvivor = Math.floor(remainingChips / survivedPlayers.length)
    const extraChips = remainingChips % survivedPlayers.length

    let extraChipIndex = 0
    return updatedPlayers.map((player) => {
      if (player.isSurvived) {
        const bonus = chipsPerSurvivor + (extraChipIndex < extraChips ? 1 : 0)
        extraChipIndex++
        return { ...player, chips: player.chips + bonus }
      }
      return player
    })
  }

  return updatedPlayers
}

/** 게임에서 활성 플레이어 수 계산 */
export function getActivePlayerCount(players: Player[]): number {
  return players.filter((p) => !p.isSurvived && p.chips > 0).length
}

/** 게임 종료 조건 확인 */
export function isGameOver(players: Player[]): boolean {
  const activeCount = getActivePlayerCount(players)
  return activeCount <= 1
}
