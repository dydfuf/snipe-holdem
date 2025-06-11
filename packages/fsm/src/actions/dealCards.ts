import { assign } from 'xstate'
import type { Hand } from '../types/cards'
import type { GameContext } from '../types/context'
import { createDeck, shuffle } from '../utils/deck'

export const dealCards = assign(({ context }: { context: GameContext }) => {
  const deck = shuffle(createDeck())

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
