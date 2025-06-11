/* 클라이언트 → Room DO */
export type ClientIntent =
  | { type: 'JOIN'; playerId: string }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'START' }
  | { type: 'BET'; amount: number }
  | { type: 'FOLD' }

/* Room DO → 클라이언트 */
export type ServerDiff =
  | { type: 'STATE'; value: string; version: number }
  | { type: 'POT'; pot: number }
  | { type: 'PLAYER'; player: { id: string; bet: number; chips: number; folded: boolean } }
