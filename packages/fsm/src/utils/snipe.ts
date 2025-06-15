import type { Card, SnipeDeclaration } from '../types/cards'
import { HandRank } from '../types/cards'
import type { Player } from '../types/context'

// AIDEV‑NOTE: 저격 홀덤 저격 시스템 - game-rule.md 섹션 4 기준

/** 저격 선언이 유효한지 확인 */
export function isValidSnipeDeclaration(
  declaration: SnipeDeclaration,
  existingSnipes: SnipeDeclaration[]
): boolean {
  // 중복 선언 불가 (game-rule.md 섹션 4.3)
  return !existingSnipes.some(
    (snipe) =>
      snipe.targetRank === declaration.targetRank && snipe.targetNumber === declaration.targetNumber
  )
}

/** 플레이어가 저격 선언할 수 있는지 확인 */
export function canPlayerSnipe(player: Player): boolean {
  // 생존 확정자는 저격 불가
  if (player.isSurvived) return false

  // 폴드한 플레이어는 저격 불가
  if (player.folded) return false

  // 이미 저격 선언한 플레이어는 재선언 불가
  if (player.snipeDeclaration) return false

  return true
}

/** 저격 선언 순서 계산 (버튼부터 시계방향) */
export function getSnipeOrder(players: Player[], dealerIdx: number): Player[] {
  const activePlayers = players.filter((p) => canPlayerSnipe(p))

  // 버튼부터 시계방향으로 정렬
  const orderedPlayers: Player[] = []
  for (let i = 0; i < activePlayers.length; i++) {
    const idx = (dealerIdx + i) % players.length
    const player = players[idx]
    if (canPlayerSnipe(player)) {
      orderedPlayers.push(player)
    }
  }

  return orderedPlayers
}

/** 저격 가능한 족보-숫자 조합 목록 생성 */
export function getAvailableSnipeTargets(
  existingSnipes: SnipeDeclaration[]
): Array<{ rank: HandRank; number: Card }> {
  const allTargets: Array<{ rank: HandRank; number: Card }> = []

  // 각 족보별로 가능한 숫자들 생성
  const ranks: HandRank[] = [
    HandRank.FOUR,
    HandRank.FULL_HOUSE,
    HandRank.STRAIGHT,
    HandRank.TRIPLE,
    HandRank.TWO_PAIR,
    HandRank.PAIR,
    // HIGH는 저격 대상이 아님
  ]

  for (const rank of ranks) {
    for (let number = 1; number <= 10; number++) {
      const target = { rank, number: number as Card }

      // 이미 선언된 조합이 아닌 경우만 추가
      if (
        isValidSnipeDeclaration(
          { playerId: '', targetRank: rank, targetNumber: number as Card },
          existingSnipes
        )
      ) {
        allTargets.push(target)
      }
    }
  }

  return allTargets
}

/** 저격 선언 단계가 완료되었는지 확인 */
export function isSnipePhaseComplete(players: Player[]): boolean {
  const eligiblePlayers = players.filter((p) => canPlayerSnipe(p))

  // 모든 자격 있는 플레이어가 선언했거나 패스했는지 확인
  return eligiblePlayers.every((p) => p.snipeDeclaration !== undefined || p.folded || p.isSurvived)
} 