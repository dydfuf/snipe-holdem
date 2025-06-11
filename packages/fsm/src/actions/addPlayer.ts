import { assign } from 'xstate'
import type { GameContext } from '../types/context'

export const addPlayer = assign(
  ({ context, event }: { context: GameContext; event: { type: 'JOIN'; playerId: string } }) => ({
    players: [...context.players, { id: event.playerId, chips: 100, bet: 0, folded: false }],
  })
)
