import type { Card } from '../types/cards'

// AIDEV-NOTE: 저격 홀덤 전용 40장 덱 - game-rule.md 섹션 1 기준
/** 40장의 1-10 숫자 덱 반환 (각 숫자 × 4장) */
export function createDeck(): Card[] {
  return Array.from({ length: 40 }, (_, i) => ((i % 10) + 1) as Card)
}

/** Fisher–Yates 셔플 */
export function shuffle(deck: Card[], rng = Math.random): Card[] {
  const a = deck.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
