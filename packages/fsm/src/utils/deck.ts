import type { Card } from '../types/cards'

/** 52 장의 단순 숫자 덱 반환 */
export function createDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => ((i % 13) + 1) as Card)
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
