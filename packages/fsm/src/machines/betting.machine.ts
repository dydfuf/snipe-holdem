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
              }: { context: BettingCtx; event: Extract<BettingEvent, { type: 'BET' }> }) => {
                const updatedOrder = context.order.map((p, i) =>
                  i === context.idx ? { ...p, bet: p.bet + event.amount } : p
                )

                const currentPlayerNewBet = updatedOrder[context.idx].bet

                return {
                  pot: context.pot + event.amount,
                  highest: Math.max(context.highest, currentPlayerNewBet),
                  order: updatedOrder,
                }
              }
            ),
            target: 'next',
          },
          FOLD: {
            actions: assign(({ context }: { context: BettingCtx }) => ({
              order: context.order.map((p, i) => (i === context.idx ? { ...p, folded: true } : p)),
            })),
            target: 'next',
          },
        },
      },
      next: {
        always: [{ guard: 'done', target: 'done' }],
      },
      done: { type: 'final' },
    },
  },
  {
    guards: {
      // AIDEV-NOTE: 베팅 라운드 완료 조건 - 활성 플레이어 수 기반
      done: ({ context }: { context: BettingCtx }) => {
        const activePlayers = context.order.filter((p) => !p.folded)
        // 활성 플레이어가 1명만 있고, 전체 플레이어도 1명이면 완료
        return activePlayers.length === 1 && context.order.length === 1
      },
    },
  }
)
