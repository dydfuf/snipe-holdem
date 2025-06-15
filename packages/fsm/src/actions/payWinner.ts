import { assign } from 'xstate'
import { HandRank } from '../types/cards'
import type { GameContext } from '../types/context'
import type { Player } from '../types/context'
import { applySnipes, compareHands, evaluateHand } from '../utils/rank'

// AIDEV‑NOTE: 저격 홀덤 승자 결정 - game-rule.md 섹션 6, 9 기준
// 저격 적용 후 족보 비교하여 승자 결정

export const payWinner = assign(({ context }: { context: GameContext }) => {
  const activePlayers = context.players.filter((p) => !p.folded && !p.isSurvived)

  if (activePlayers.length === 0) {
    return { pot: 0 } // 모든 플레이어가 폴드하거나 생존 확정
  }

  if (activePlayers.length === 1) {
    // 한 명만 남은 경우
    const winner = activePlayers[0]
    return {
      players: context.players.map((p) =>
        p.id === winner.id ? { ...p, chips: p.chips + context.pot } : p
      ),
      pot: 0,
    }
  }

  // 각 플레이어의 족보 평가
  const evaluations = activePlayers.map((player) => ({
    player,
    evaluation: evaluateHand(player.hand!, context.community),
  }))

  // 저격 적용
  const snipedEvaluations = evaluations.map(({ player, evaluation }) => ({
    player,
    evaluation: applySnipes([evaluation], context.snipeDeclarations)[0],
  }))

  // 최고 족보 찾기
  let winners = [snipedEvaluations[0]]

  for (let i = 1; i < snipedEvaluations.length; i++) {
    const comparison = compareHands(snipedEvaluations[i].evaluation, winners[0].evaluation)

    if (comparison > 0) {
      // 더 좋은 족보 발견
      winners = [snipedEvaluations[i]]
    } else if (comparison === 0) {
      // 동점
      winners.push(snipedEvaluations[i])
    }
  }

  // 팟 분배 (game-rule.md 섹션 6 무승부 규칙)
  const potPerWinner = Math.floor(context.pot / winners.length)
  const remainder = context.pot % winners.length

  const updatedPlayers = context.players.map((player) => {
    const winnerIndex = winners.findIndex((w) => w.player.id === player.id)
    if (winnerIndex >= 0) {
      // 승자에게 팟 분배, 잔여 칩은 버튼 기준 빠른 순서로
      const extraChip = winnerIndex < remainder ? 1 : 0
      return { ...player, chips: player.chips + potPerWinner + extraChip }
    }
    return player
  })

  return {
    players: updatedPlayers,
    pot: 0,
    handEvaluations: snipedEvaluations.map((se) => se.evaluation),
  }
})
