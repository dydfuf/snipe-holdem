import type { Card, HandRank } from './cards'

// AIDEV-NOTE: 저격 홀덤 이벤트 시스템 - game-rule.md 섹션 2 게임 흐름 지원

/* 클라이언트 → Room DO */
export type ClientIntent =
  | { type: 'JOIN'; playerId: string }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'CHECK' }
  | { type: 'CALL' }
  | { type: 'RAISE'; amount: number }
  | { type: 'FOLD' }
  | { type: 'SNIPE'; targetRank: HandRank; targetNumber: Card }
  | { type: 'SNIPE_PASS' }
  | { type: 'CONFIRM_SURVIVAL' } // 생존 확정 (75칩 지불)

/* Room DO → 클라이언트 */
export type ServerDiff =
  | { type: 'STATE'; value: string; version: number }
  | { type: 'POT'; pot: number }
  | { type: 'CURRENT_BET'; amount: number }
  | {
      type: 'PLAYER'
      player: { id: string; bet: number; chips: number; folded: boolean; isSurvived?: boolean }
    }
  | { type: 'COMMUNITY'; cards: Card[]; revealed: number }
  | { type: 'SNIPE_DECLARED'; playerId: string; targetRank: HandRank; targetNumber: Card }
  | { type: 'HAND_REVEALED'; playerId: string; hand: Card[] }
  | { type: 'WINNER'; playerId: string; amount: number }
  | { type: 'SURVIVAL_CONFIRMED'; playerId: string }

/* 내부 머신 이벤트 */
export type GameEvent =
  | { type: 'JOIN'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'DEAL_INITIAL' } // 개인 2장 + 공유 2장
  | { type: 'START_BETTING'; round: 1 | 2 }
  | {
      type: 'PLAYER_ACTION'
      playerId: string
      action: 'CHECK' | 'CALL' | 'RAISE' | 'FOLD'
      amount?: number
    }
  | { type: 'BETTING_COMPLETE' }
  | { type: 'REVEAL_COMMUNITY' } // 공유 카드 2장 추가
  | { type: 'START_SNIPE_PHASE' }
  | { type: 'SNIPE_ACTION'; playerId: string; targetRank?: HandRank; targetNumber?: Card }
  | { type: 'SNIPE_PHASE_COMPLETE' }
  | { type: 'SHOWDOWN' }
  | { type: 'DISTRIBUTE_POT' }
  | { type: 'CHECK_SURVIVAL' }
  | { type: 'ROUND_COMPLETE' }
