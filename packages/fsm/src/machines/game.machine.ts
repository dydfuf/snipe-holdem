import { createMachine } from 'xstate'
import { addPlayer, bumpVersion, dealCards, payWinner } from '../actions'
import { canJoin } from '../guards'
import type { GameContext } from '../types/context'
import { bettingMachine } from './betting.machine'

// AIDEV‑NOTE: 저격 홀덤 게임 머신 - game-rule.md 섹션 2 게임 흐름 구현
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
      communityRevealed: 0,
      pot: 0,
      currentBet: 0,
      version: 0,
      dealerIdx: 0,
      currentIdx: 0,
      bettingRound: 1,
      snipeDeclarations: [],
      snipeIdx: 0,
      handEvaluations: undefined,
      initialPlayerCount: 0,
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
        always: 'bet_round1',
      },
      bet_round1: {
        invoke: {
          id: 'bet1',
          src: bettingMachine,
          input: ({ context }: { context: GameContext }) => ({
            order: context.players,
            idx: context.dealerIdx,
            highest: context.currentBet,
            pot: context.pot,
          }),
          onDone: { target: 'reveal_community' },
        },
      },
      reveal_community: {
        entry: 'revealCommunity',
        always: 'bet_round2',
      },
      bet_round2: {
        invoke: {
          id: 'bet2',
          src: bettingMachine,
          input: ({ context }: { context: GameContext }) => ({
            order: context.players,
            idx: context.dealerIdx,
            highest: context.currentBet,
            pot: context.pot,
          }),
          onDone: { target: 'snipe_phase' },
        },
      },
      snipe_phase: {
        // AIDEV‑TODO: 저격 선언 단계 구현 필요
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
      revealCommunity: ({ context }: { context: GameContext }) => {
        // 공유 카드 2장 추가 공개 (총 4장)
        if (context.communityRevealed === 2) {
          const newCards = context.deck.slice(0, 2)
          context.community.push(...newCards)
          context.communityRevealed = 4
          context.deck.splice(0, 2)
        }
      },
    },
  }
)
