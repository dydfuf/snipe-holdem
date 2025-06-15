import { assign } from 'xstate'
import type { GameContext } from '../types/context'

// AIDEV‑NOTE: 공유 카드 추가 공개 - game-rule.md 섹션 2.5 기준
// 1차 베팅 후 공유 카드 2장 추가 공개 (총 4장)

export const revealCommunity = assign(({ context }: { context: GameContext }) => {
  // 현재 사용된 카드 수 계산 (플레이어 개인 카드 + 기존 공유 카드)
  const usedCards = context.players.length * 2 + context.communityRevealed

  // 덱에서 2장 더 뽑아서 공유 카드에 추가
  const newCommunityCards = [context.deck[usedCards], context.deck[usedCards + 1]]

  return {
    community: [...context.community, ...newCommunityCards],
    communityRevealed: context.communityRevealed + 2,
    version: context.version + 1,
  }
}) 