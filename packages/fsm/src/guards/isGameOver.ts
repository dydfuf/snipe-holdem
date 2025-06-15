import type { GameContext } from '../types/context'
import { isGameOver } from '../utils/survival'

// AIDEV‑NOTE: 게임 종료 조건 가드 - 활성 플레이어 1명 이하 시 종료

export function gameIsOver({ context }: { context: GameContext }): boolean {
  return isGameOver(context.players)
} 