import { assign } from 'xstate'

import type { Hand } from '../types/cards'
import type { GameContext } from '../types/context'
import { STARTING_CHIPS } from '../types/context'
import { createDeck, shuffle } from '../utils/deck'

// AIDEV-NOTE: 저격 홀덤 카드 딜링 - game-rule.md 섹션 2 기준
// 개인 2장 + 공유 2장 초기 딜링, 인원별 시작 칩 설정
export const dealCards = assign(({ context }: { context: GameContext }) => {
  // AIDEV-NOTE: RNG 함수는 머신 input을 통해 주입받아 결정론적 테스트 지원
  const rng = context.rng || Math.random
  const deck = shuffle(createDeck(), rng)

  const playerCount = context.players.length
  const startingChips = STARTING_CHIPS[playerCount] || 100

  // 각 플레이어에게 2장씩 딜링
  const players = context.players.map((p, i) => ({
    ...p,
    hand: [deck[i * 2], deck[i * 2 + 1]] as Hand,
    chips: startingChips - 1, // 인원수별 시작 칩에서 기본 베팅 1칩 차감
    bet: 1, // 기본 베팅 1칩 (game-rule.md 섹션 2.2)
    folded: false,
    isSurvived: false,
    snipeDeclaration: undefined,
  }))

  // 공유 카드 2장 초기 공개
  const communityStart = players.length * 2
  const initialCommunity = deck.slice(communityStart, communityStart + 2)

  return {
    deck: deck.slice(communityStart + 2), // 실제 딜링된 카드만 제거 (플레이어 카드 + 초기 공유 카드 2장)
    players,
    community: initialCommunity,
    communityRevealed: 2,
    pot: playerCount, // 기본 베팅 1칩씩 모인 팟
    currentBet: 1,
    bettingRound: 1 as const,
    snipeDeclarations: [],
    snipeIdx: 0,
    handEvaluations: undefined,
    initialPlayerCount: playerCount,
  }
})
