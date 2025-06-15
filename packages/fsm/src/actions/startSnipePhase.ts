import { assign } from 'xstate'
import type { GameContext } from '../types/context'
import { getSnipeOrder } from '../utils/snipe'

// AIDEV‑NOTE: 저격 선언 단계 시작 - game-rule.md 섹션 2.7 기준
// 버튼부터 시계방향으로 저격 선언 순서 설정

export const startSnipePhase = assign(({ context }: { context: GameContext }) => {
  // 저격 가능한 플레이어들의 순서 계산
  const snipeOrder = getSnipeOrder(context.players, context.dealerIdx)

  return {
    snipeIdx: 0, // 첫 번째 플레이어부터 시작
    snipeDeclarations: [], // 저격 선언 초기화
    version: context.version + 1,
  }
}) 