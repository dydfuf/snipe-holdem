import {
  type Card,
  type Hand,
  type HandEvaluation,
  HandRank,
  type SnipeDeclaration,
} from '../types/cards'

// AIDEV‑NOTE: 저격 홀덤 족보 평가 - game-rule.md 섹션 3, 6 기준
// 개인 2장 + 공유 4장 중 최적의 5장으로 족보 구성

/** 개인 카드 + 공유 카드에서 최고 족보 평가 */
export function evaluateHand(personalCards: Hand, communityCards: Card[]): HandEvaluation {
  const allCards = [...personalCards, ...communityCards]

  // 6장 중 5장을 선택하는 모든 조합 생성
  const combinations = getCombinations(allCards, 5)
  let bestEvaluation: HandEvaluation | null = null

  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo)
    if (!bestEvaluation || compareHands(evaluation, bestEvaluation) > 0) {
      bestEvaluation = evaluation
    }
  }

  return bestEvaluation!
}

/** 5장 카드의 족보 평가 */
function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const counts = new Map<Card, number>()
  for (const card of cards) {
    counts.set(card, (counts.get(card) || 0) + 1)
  }

  const countValues = Array.from(counts.values()).sort((a, b) => b - a)
  const sortedCards = Array.from(counts.keys()).sort((a, b) => b - a)

  // 포카드 체크
  if (countValues[0] === 4) {
    const fourCard = Array.from(counts.entries()).find(([_, count]) => count === 4)![0]
    const kicker = sortedCards.find((card) => card !== fourCard)!
    return {
      rank: HandRank.FOUR,
      primaryNumber: fourCard,
      kickers: [kicker],
    }
  }

  // 풀하우스 체크
  if (countValues[0] === 3 && countValues[1] === 2) {
    const threeCard = Array.from(counts.entries()).find(([_, count]) => count === 3)![0]
    const pairCard = Array.from(counts.entries()).find(([_, count]) => count === 2)![0]
    return {
      rank: HandRank.FULL_HOUSE,
      primaryNumber: threeCard,
      secondaryNumber: pairCard,
      kickers: [],
    }
  }

  // 스트레이트 체크
  const uniqueCards = Array.from(new Set(cards)).sort((a, b) => a - b)
  if (uniqueCards.length === 5 && uniqueCards[4] - uniqueCards[0] === 4) {
    return {
      rank: HandRank.STRAIGHT,
      primaryNumber: uniqueCards[4], // 가장 높은 카드
      kickers: [],
    }
  }

  // 트리플 체크
  if (countValues[0] === 3) {
    const threeCard = Array.from(counts.entries()).find(([_, count]) => count === 3)![0]
    const kickers = sortedCards.filter((card) => card !== threeCard).slice(0, 2)
    return {
      rank: HandRank.TRIPLE,
      primaryNumber: threeCard,
      kickers,
    }
  }

  // 투페어 체크
  if (countValues[0] === 2 && countValues[1] === 2) {
    const pairs = Array.from(counts.entries())
      .filter(([_, count]) => count === 2)
      .map(([card, _]) => card)
      .sort((a, b) => b - a)
    const kicker = sortedCards.find((card) => !pairs.includes(card))!
    return {
      rank: HandRank.TWO_PAIR,
      primaryNumber: pairs[0],
      secondaryNumber: pairs[1],
      kickers: [kicker],
    }
  }

  // 원페어 체크
  if (countValues[0] === 2) {
    const pairCard = Array.from(counts.entries()).find(([_, count]) => count === 2)![0]
    const kickers = sortedCards.filter((card) => card !== pairCard).slice(0, 3)
    return {
      rank: HandRank.PAIR,
      primaryNumber: pairCard,
      kickers,
    }
  }

  // 하이카드
  return {
    rank: HandRank.HIGH,
    primaryNumber: sortedCards[0],
    kickers: sortedCards.slice(1, 5),
  }
}

/** 두 족보 비교 (a > b면 양수, a < b면 음수, 같으면 0) */
export function compareHands(a: HandEvaluation, b: HandEvaluation): number {
  // 저격으로 강등된 족보는 하위 처리
  const aRankValue = a.isSnipedDown ? -1 : getRankValue(a.rank)
  const bRankValue = b.isSnipedDown ? -1 : getRankValue(b.rank)

  if (aRankValue !== bRankValue) return aRankValue - bRankValue

  // 같은 등급이면 숫자 비교
  if (a.primaryNumber !== b.primaryNumber) return a.primaryNumber - b.primaryNumber
  if (a.secondaryNumber && b.secondaryNumber && a.secondaryNumber !== b.secondaryNumber) {
    return a.secondaryNumber - b.secondaryNumber
  }

  // 키커 비교
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i]
  }

  return 0
}

/** 저격 적용 - 해당하는 족보를 하위로 강등 */
export function applySnipes(
  evaluations: HandEvaluation[],
  snipes: SnipeDeclaration[]
): HandEvaluation[] {
  return evaluations.map((evaluation) => {
    const isTargeted = snipes.some(
      (snipe) =>
        snipe.targetRank === evaluation.rank && snipe.targetNumber === evaluation.primaryNumber
    )

    return isTargeted ? { ...evaluation, isSnipedDown: true } : evaluation
  })
}

// 유틸리티 함수들
function getRankValue(rank: HandRank): number {
  const values = {
    [HandRank.FOUR]: 7,
    [HandRank.FULL_HOUSE]: 6,
    [HandRank.STRAIGHT]: 5,
    [HandRank.TRIPLE]: 4,
    [HandRank.TWO_PAIR]: 3,
    [HandRank.PAIR]: 2,
    [HandRank.HIGH]: 1,
  }
  return values[rank]
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map((x) => [x])
  if (k === arr.length) return [arr]

  const result: T[][] = []
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i]
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1)
    for (const combo of tailCombos) {
      result.push([head, ...combo])
    }
  }
  return result
}
