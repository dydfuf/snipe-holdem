import { createMachine } from 'xstate'
import {
  addPlayer,
  bumpVersion,
  checkSurvival,
  dealCards,
  payWinner,
  processSnipe,
  revealCommunity,
  startSnipePhase,
} from '../actions'
import { canJoin, canSnipe } from '../guards'
import { gameIsOver } from '../guards/isGameOver'
import { isSnipeComplete } from '../guards/isSnipePhaseComplete'
import type { GameContext } from '../types/context'
import type { GameEvent } from '../types/events'
import { bettingMachine } from './betting.machine'

// AIDEV-NOTE: 저격 홀덤 게임 머신 - game-rule.md 섹션 2 게임 흐름 구현

export const gameMachine = createMachine(
  {
    id: 'game',
    types: {
      context: {} as GameContext,
      events: {} as GameEvent,
      input: {} as { rng?: () => number } | undefined,
    },
    initial: 'waiting',
    context: ({ input }: { input?: { rng?: () => number } | undefined }) => ({
      players: [],
      deck: [],
      community: [],
      communityRevealed: 0,
      pot: 0,
      currentBet: 0,
      version: 0,
      dealerIdx: 0,
      currentIdx: 0,
      bettingRound: 1 as const,
      snipeDeclarations: [],
      snipeIdx: 0,
      handEvaluations: undefined,
      initialPlayerCount: 0,
      rng: input?.rng,
    }),
    states: {
      waiting: {
        on: {
          JOIN: {
            actions: ['addPlayer', 'bumpVersion'],
            guard: 'canJoin',
          },
          START_GAME: { guard: 'ready', target: 'deal' },
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
        entry: ['revealCommunity', 'bumpVersion'],
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
        entry: ['startSnipePhase', 'bumpVersion'],
        on: {
          SNIPE_ACTION: {
            actions: ['processSnipe', 'bumpVersion'],
            guard: 'canSnipe',
          },
        },
        always: [{ guard: 'isSnipeComplete', target: 'showdown' }],
      },
      showdown: {
        entry: ['payWinner', 'checkSurvival', 'bumpVersion'],
        always: [
          { guard: 'gameIsOver', target: 'game_over' },
          { target: 'deal' }, // 다음 라운드 시작
        ],
      },
      game_over: {
        type: 'final',
      },
    },
  },
  {
    guards: {
      ready: ({ context }: { context: GameContext }) => context.players.length >= 2,
      // AIDEV-NOTE: XState v5 타입 시스템 제한으로 인한 임시 캐스팅
      canJoin: canJoin as any,
      canSnipe: canSnipe as any,
      isSnipeComplete: isSnipeComplete as any,
      gameIsOver: gameIsOver as any,
    },
    actions: {
      // AIDEV-NOTE: XState v5 타입 시스템 제한으로 인한 임시 캐스팅
      addPlayer: addPlayer as any,
      bumpVersion: bumpVersion as any,
      dealCards: dealCards as any,
      payWinner: payWinner as any,
      revealCommunity: revealCommunity as any,
      startSnipePhase: startSnipePhase as any,
      processSnipe: processSnipe as any,
      checkSurvival: checkSurvival as any,
    },
  }
)
