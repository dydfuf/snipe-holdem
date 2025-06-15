import type { GameContext } from '../types/context'

import { isSnipePhaseComplete } from '../utils/snipe'

// AIDEV-NOTE: 저격 단계 완료 여부 가드 - game-rule.md 섹션 2.7 기준

export function isSnipeComplete({ context }: { context: GameContext }): boolean {
  return isSnipePhaseComplete(context.players)
}
