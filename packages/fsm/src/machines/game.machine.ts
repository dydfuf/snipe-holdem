import { createMachine } from 'xstate'
import { addPlayer, bumpVersion, dealCards, payWinner } from '../actions'
import { canJoin } from '../guards'
import type { GameContext } from '../types/context'
import { bettingMachine } from './betting.machine'

type GameEvent = { type: 'JOIN'; playerId: string } | { type: 'START' }

export const gameMachine = createMachine(
  {
    id: 'game',
    types: {
      context: {} as GameContext,
      events: {} as GameEvent,
    },
    initial: 'waiting',
    context: {
      players: [],
      deck: [],
      community: [],
      pot: 0,
      version: 0,
      dealerIdx: 0,
      currentIdx: 0,
    },
    states: {
      waiting: {
        on: {
          JOIN: {
            actions: ['addPlayer', 'bumpVersion'],
            guard: 'canJoin',
          },
          START: { guard: 'ready', target: 'deal' },
        },
      },
      deal: {
        entry: ['dealCards', 'bumpVersion'],
        always: 'bet_preflop',
      },
      bet_preflop: {
        invoke: {
          id: 'bet1',
          src: bettingMachine,
          input: ({ context }: { context: GameContext }) => ({
            order: context.players,
            idx: context.dealerIdx,
            highest: 0,
            pot: context.pot,
          }),
          onDone: { target: 'flop' },
        },
      },
      flop: {
        entry: 'revealFlop',
        always: 'showdown',
      },
      showdown: {
        entry: ['payWinner', 'bumpVersion'],
        type: 'final',
      },
    },
  },
  {
    guards: {
      ready: ({ context }: { context: GameContext }) => context.players.length >= 2,
      canJoin: canJoin as any,
    },
    actions: {
      addPlayer: addPlayer as any,
      bumpVersion: bumpVersion as any,
      dealCards: dealCards as any,
      payWinner: payWinner as any,
      revealFlop: ({ context }: { context: GameContext }) => {
        context.community.push(...context.deck.splice(0, 3))
      },
    },
  }
)
