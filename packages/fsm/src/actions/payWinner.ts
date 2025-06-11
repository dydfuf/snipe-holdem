import { assign } from 'xstate'
import { HandRank } from '../types/cards'
import type { GameContext } from '../types/context'
import type { Player } from '../types/context'
import { rankHand } from '../utils/rank'

const order: HandRank[] = [
  HandRank.HIGH,
  HandRank.PAIR,
  HandRank.TWO_PAIR,
  HandRank.TRIPLE,
  HandRank.STRAIGHT,
  HandRank.FLUSH,
  HandRank.FULL_HOUSE,
  HandRank.FOUR,
  HandRank.STRAIGHT_FLUSH,
]

export const payWinner = assign(({ context }: { context: GameContext }) => {
  let best: { p: Player; rank: HandRank } | null = null

  for (const p of context.players) {
    if (p.folded) continue

    const rank = rankHand(p.hand!, context.community)

    if (!best || order.indexOf(rank) > order.indexOf(best.rank)) best = { p, rank }
  }

  if (best) best.p.chips += context.pot
  return { players: context.players, pot: 0 }
})
