import { assign } from 'xstate'
import type { Hand } from '../types/cards'
import type { GameContext } from '../types/context'
import { createDeck, shuffle } from '../utils/deck'

// AIDEV‑NOTE: RNG 인젝터를 통해 결정론적 재생 보장 (AGENTS.md R-2 준수)
export const dealCards = assign(({ context }: { context: GameContext }) => {
  // AIDEV‑TODO: 머신 옵션을 통해 rng 함수 주입받도록 리팩토링 필요
  const rng = context.rng || Math.random
  const deck = shuffle(createDeck(), rng)

  const players = context.players.map((p, i) => ({
    ...p,
    hand: [deck[i * 2], deck[i * 2 + 1]] as Hand,
    bet: 0,
    folded: false,
  }))

  return {
    deck: deck.slice(players.length * 2),
    players,
    community: [],
    pot: 0,
  }
})
