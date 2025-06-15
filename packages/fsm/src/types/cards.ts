/** 1~10 숫자 카드 × 4세트 = 40장 */
export type Card = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type Hand = [Card, Card]

/** 족보 등급 (높음 → 낮음) - game-rule.md 섹션 3 기준 */
export enum HandRank {
  FOUR = 'FOUR', // 포카드
  FULL_HOUSE = 'FULL_HOUSE', // 풀하우스
  STRAIGHT = 'STRAIGHT', // 스트레이트
  TRIPLE = 'TRIPLE', // 트리플
  TWO_PAIR = 'TWO_PAIR', // 투페어
  PAIR = 'PAIR', // 원페어
  HIGH = 'HIGH', // 하이카드
}

/** 저격 선언 타입 */
export interface SnipeDeclaration {
  playerId: string
  targetRank: HandRank
  targetNumber: Card // 풀하우스의 경우 트리플 숫자
}

/** 족보 평가 결과 */
export interface HandEvaluation {
  rank: HandRank
  primaryNumber: Card // 주요 숫자 (트리플, 페어 등의 숫자)
  secondaryNumber?: Card // 보조 숫자 (풀하우스의 페어, 투페어의 두 번째 페어)
  kickers: Card[] // 키커 카드들
  isSnipedDown?: boolean // 저격으로 인한 하위 강등 여부
}
