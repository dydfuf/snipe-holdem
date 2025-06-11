import type { Card, Hand } from './cards'

export interface Player {
  id: string
  chips: number
  bet: number
  folded: boolean
  hand?: Hand
}

export interface GameContext {
  /** 플레이어 좌석 순서 */
  players: Player[]
  /** 남은 덱 */
  deck: Card[]
  /** 커뮤니티 카드 */
  community: Card[]
  /** 판돈 */
  pot: number
  /** 전이 버전 – 클라 동기화용 */
  version: number
  /** 버튼(딜러) 인덱스 */
  dealerIdx: number
  /** 현재 행동 차례 */
  currentIdx: number
}
