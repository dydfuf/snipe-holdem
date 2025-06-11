import { assign, createMachine } from 'xstate'
import type { Player } from '../types/context'

interface BettingCtx {
  order: Player[]
  idx: number
  highest: number
  pot: number
}

type BettingEvent = { type: 'BET'; amount: number } | { type: 'FOLD' }

export const bettingMachine = createMachine(
  {
    id: 'bet',
    types: {
      context: {} as BettingCtx,
      events: {} as BettingEvent,
      input: {} as BettingCtx,
    },
    initial: 'turn',
    context: ({ input }: { input: BettingCtx }) => input,
    states: {
      turn: {
        on: {
          BET: {
            actions: assign(
              ({
                context,
                event,
              }: { context: BettingCtx; event: Extract<BettingEvent, { type: 'BET' }> }) => ({
                pot: context.pot + event.amount,
                highest: Math.max(context.highest, event.amount),
              })
            ),
            target: 'next',
          },
          FOLD: { target: 'next' },
        },
      },
      next: {
        always: [
          { guard: 'done', target: 'done' },
          {
            actions: assign(({ context }: { context: BettingCtx }) => ({
              idx: (context.idx + 1) % context.order.length,
            })),
            target: 'turn',
          },
        ],
      },
      done: { type: 'final' },
    },
  },
  {
    guards: {
      done: ({ context }: { context: BettingCtx }) => context.idx === context.order.length - 1,
    },
  }
)
