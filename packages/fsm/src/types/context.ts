import type { Card, Hand, HandEvaluation, SnipeDeclaration } from './cards'

// AIDEV‑NOTE: 저격 홀덤 게임 컨텍스트 - game-rule.md 전체 규칙 지원

export interface Player {
  id: string
  chips: number
  bet: number
  folded: boolean
  hand?: Hand
  /** 생존 확정 여부 (시작칩+15 이상 달성 시) */
  isSurvived?: boolean
  /** 이번 라운드 저격 선언 */
  snipeDeclaration?: SnipeDeclaration
}

/** 인원수별 시작 칩 설정 - game-rule.md 섹션 1 */
export const STARTING_CHIPS: Record<number, number> = {
  2: 100,
  3: 90,
  4: 80,
  5: 70,
  6: 60,
}

/** 생존 확정 칩 수 (시작칩 + 15) */
export const SURVIVAL_CHIPS: Record<number, number> = {
  2: 115,
  3: 105,
  4: 95,
  5: 85,
  6: 75,
}

export interface GameContext {
  /** 플레이어 좌석 순서 */
  players: Player[]
  /** 남은 덱 */
  deck: Card[]
  /** 공유 카드 4장 (2장씩 2번에 나누어 공개) */
  community: Card[]
  /** 현재 공개된 공유 카드 수 (0, 2, 4) */
  communityRevealed: number
  /** 판돈 */
  pot: number
  /** 현재 라운드 최고 베팅액 */
  currentBet: number
  /** 전이 버전 – 클라 동기화용 */
  version: number
  /** 버튼(딜러) 인덱스 */
  dealerIdx: number
  /** 현재 행동 차례 */
  currentIdx: number
  /** 현재 베팅 라운드 (1차, 2차) */
  bettingRound: 1 | 2
  /** 이번 라운드 저격 선언들 */
  snipeDeclarations: SnipeDeclaration[]
  /** 저격 선언 차례 인덱스 */
  snipeIdx: number
  /** 각 플레이어의 족보 평가 결과 (쇼다운 시) */
  handEvaluations?: HandEvaluation[]
  /** RNG 함수 인젝터 – 결정론적 재생용 */
  rng?: () => number
  /** 게임 시작 시 플레이어 수 (칩 계산용) */
  initialPlayerCount: number
}
