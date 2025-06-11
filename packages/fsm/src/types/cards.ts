/** 1~13(에이스) × 4 문양, 숫자만으로 간단 표기 */
export type Card = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
export type Hand = [Card, Card]

/** 족보 – 간단 버전 */
export enum HandRank {
  HIGH = 'HIGH',
  PAIR = 'PAIR',
  TWO_PAIR = 'TWO_PAIR',
  TRIPLE = 'TRIPLE',
  STRAIGHT = 'STRAIGHT',
  FLUSH = 'FLUSH',
  FULL_HOUSE = 'FULL_HOUSE',
  FOUR = 'FOUR',
  STRAIGHT_FLUSH = 'STRAIGHT_FLUSH',
}
