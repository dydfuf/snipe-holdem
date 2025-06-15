import { assign } from 'xstate'
import type { GameContext } from '../types/context'

// AIDEV‑NOTE: 공유 카드 추가 공개 - game-rule.md 섹션 2.5 기준
// 1차 베팅 후 공유 카드 2장 추가 공개 (총 4장)

export const revealCommunity = assign(({ context }: { context: GameContext }) => {
  // dealCards에서 이미 공유 카드 4장이 예약되어 있음
  // 덱의 앞 2장을 추가로 공개
  const newCommunityCards = context.deck.slice(0, 2)
  const remainingDeck = context.deck.slice(2)

  return {
    community: [...context.community, ...newCommunityCards],
    communityRevealed: context.communityRevealed + 2,
    deck: remainingDeck,
  }
}) 