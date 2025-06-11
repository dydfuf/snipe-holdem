import { type Card, type Hand, HandRank } from '../types/cards'

export function rankHand(hand: Hand, community: Card[]): HandRank {
  const all = [...hand, ...community]
  const counts = new Map<number, number>()
  for (const c of all) counts.set(c, (counts.get(c) ?? 0) + 1)

  if ([...counts.values()].some((v) => v === 4)) return HandRank.FOUR
  if ([...counts.values()].some((v) => v === 3)) return HandRank.TRIPLE
  if ([...counts.values()].filter((v) => v === 2).length >= 2) return HandRank.TWO_PAIR
  if ([...counts.values()].some((v) => v === 2)) return HandRank.PAIR

  const uniq = [...new Set(all)].sort((a, b) => a - b)
  for (let i = 0; i < uniq.length - 4; i++) {
    const seq = uniq.slice(i, i + 5)
    if (seq[4] - seq[0] === 4) return HandRank.STRAIGHT
  }
  return HandRank.HIGH
}
