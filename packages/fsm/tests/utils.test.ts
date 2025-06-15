import { describe, expect, it } from 'vitest'
import { type Card, HandRank } from '../src/types/cards'
import type { Player } from '../src/types/context'
import { createDeck } from '../src/utils/deck'
import { applySnipes, compareHands, evaluateHand } from '../src/utils/rank'
import { getAvailableSnipeTargets, isSnipePhaseComplete } from '../src/utils/snipe'
import { distributeRemainingChips, getActivePlayerCount, isGameOver } from '../src/utils/survival'

describe('유틸리티 함수 테스트', () => {
  describe('덱 관리', () => {
    it('40장 덱을 올바르게 생성해야 함', () => {
      const deck = createDeck()

      expect(deck).toHaveLength(40)

      // 1-10 숫자가 각각 4장씩 있어야 함
      for (let number = 1; number <= 10; number++) {
        const count = deck.filter((card) => card === number).length
        expect(count).toBe(4)
      }
    })
  })

  describe('핸드 평가', () => {
    it('포카드를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [7, 7]
      const communityCards: Card[] = [7, 7, 3, 2]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.FOUR)
      expect(evaluation.primaryNumber).toBe(7)
    })

    it('풀하우스를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [8, 8]
      const communityCards: Card[] = [8, 5, 5, 2]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.FULL_HOUSE)
      expect(evaluation.primaryNumber).toBe(8)
      expect(evaluation.secondaryNumber).toBe(5)
    })

    it('스트레이트를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [1, 2]
      const communityCards: Card[] = [3, 4, 5, 10]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.STRAIGHT)
      expect(evaluation.primaryNumber).toBe(5) // 가장 높은 카드
    })

    it('트리플을 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [9, 9]
      const communityCards: Card[] = [9, 4, 2, 1]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.TRIPLE)
      expect(evaluation.primaryNumber).toBe(9)
    })

    it('투페어를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [10, 10]
      const communityCards: Card[] = [6, 6, 3, 2]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.TWO_PAIR)
      expect(evaluation.primaryNumber).toBe(10)
      expect(evaluation.secondaryNumber).toBe(6)
    })

    it('원페어를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [4, 4]
      const communityCards: Card[] = [8, 7, 2, 1]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.PAIR)
      expect(evaluation.primaryNumber).toBe(4)
    })

    it('하이카드를 올바르게 인식해야 함', () => {
      const personalCards: [Card, Card] = [10, 8]
      const communityCards: Card[] = [6, 4, 2, 1]
      const evaluation = evaluateHand(personalCards, communityCards)

      expect(evaluation.rank).toBe(HandRank.HIGH)
      expect(evaluation.primaryNumber).toBe(10)
    })
  })

  describe('핸드 비교', () => {
    it('높은 족보가 낮은 족보를 이겨야 함', () => {
      const fourOfAKind = { rank: HandRank.FOUR, primaryNumber: 5 as Card, kickers: [] }
      const fullHouse = {
        rank: HandRank.FULL_HOUSE,
        primaryNumber: 10 as Card,
        secondaryNumber: 8 as Card,
        kickers: [],
      }

      expect(compareHands(fourOfAKind, fullHouse)).toBe(1)
      expect(compareHands(fullHouse, fourOfAKind)).toBe(-1)
    })

    it('같은 족보에서 높은 숫자가 이겨야 함', () => {
      const highPair = {
        rank: HandRank.PAIR,
        primaryNumber: 9 as Card,
        kickers: [8, 7, 2] as Card[],
      }
      const lowPair = {
        rank: HandRank.PAIR,
        primaryNumber: 6 as Card,
        kickers: [10, 8, 5] as Card[],
      }

      expect(compareHands(highPair, lowPair)).toBe(1)
      expect(compareHands(lowPair, highPair)).toBe(-1)
    })

    it('같은 족보와 숫자에서 키커로 비교해야 함', () => {
      const hand1 = { rank: HandRank.PAIR, primaryNumber: 8 as Card, kickers: [10, 7, 3] as Card[] }
      const hand2 = { rank: HandRank.PAIR, primaryNumber: 8 as Card, kickers: [9, 7, 3] as Card[] }

      expect(compareHands(hand1, hand2)).toBe(1)
      expect(compareHands(hand2, hand1)).toBe(-1)
    })

    it('완전히 같은 핸드는 무승부여야 함', () => {
      const hand1 = { rank: HandRank.PAIR, primaryNumber: 8 as Card, kickers: [10, 7, 3] as Card[] }
      const hand2 = { rank: HandRank.PAIR, primaryNumber: 8 as Card, kickers: [10, 7, 3] as Card[] }

      expect(compareHands(hand1, hand2)).toBe(0)
    })
  })

  describe('저격 적용', () => {
    it('저격된 핸드를 하위 등급으로 강등해야 함', () => {
      const evaluations = [
        { rank: HandRank.PAIR, primaryNumber: 8 as Card, kickers: [], playerId: 'player1' },
        { rank: HandRank.PAIR, primaryNumber: 10 as Card, kickers: [], playerId: 'player2' },
      ]

      const snipes = [{ playerId: 'sniper', targetRank: HandRank.PAIR, targetNumber: 8 as Card }]

      const result = applySnipes(evaluations, snipes)

      // player1의 8 페어가 저격되어 하위 등급으로 강등
      expect(result[0].isSnipedDown).toBe(true)
      expect(result[1].isSnipedDown).toBeUndefined() // 저격되지 않음
    })

    it('저격되지 않은 핸드는 그대로 유지해야 함', () => {
      const evaluations = [
        { rank: HandRank.TRIPLE, primaryNumber: 7 as Card, kickers: [], playerId: 'player1' },
      ]

      const snipes = [{ playerId: 'sniper', targetRank: HandRank.PAIR, targetNumber: 8 as Card }]

      const result = applySnipes(evaluations, snipes)

      expect(result[0].rank).toBe(HandRank.TRIPLE) // 변경되지 않음
      expect(result[0].isSnipedDown).toBeUndefined()
    })
  })

  describe('저격 시스템 유틸리티', () => {
    it('사용 가능한 저격 대상을 올바르게 생성해야 함', () => {
      const existingSnipes = [
        { playerId: 'player1', targetRank: HandRank.PAIR, targetNumber: 10 as any },
      ]

      const available = getAvailableSnipeTargets(existingSnipes)

      // 10 페어는 제외되어야 함
      const tenPair = available.find(
        (target) => target.rank === HandRank.PAIR && target.number === 10
      )
      expect(tenPair).toBeUndefined()

      // 다른 조합들은 포함되어야 함
      const ninePair = available.find(
        (target) => target.rank === HandRank.PAIR && target.number === 9
      )
      expect(ninePair).toBeDefined()
    })

    it('저격 단계 완료를 올바르게 판단해야 함', () => {
      const players: Player[] = [
        {
          id: 'player1',
          chips: 50,
          bet: 0,
          folded: false,
          isSurvived: false,
          snipeDeclaration: undefined,
        },
        {
          id: 'player2',
          chips: 50,
          bet: 0,
          folded: false,
          isSurvived: false,
          snipeDeclaration: {
            playerId: 'player2',
            targetRank: HandRank.PAIR,
            targetNumber: 8 as any,
          },
        },
        { id: 'player3', chips: 50, bet: 0, folded: true, isSurvived: false }, // 폴드
      ]

      // player1이 아직 선언하지 않았으므로 미완료
      expect(isSnipePhaseComplete(players)).toBe(false)

      // player1도 선언하면 완료
      players[0].snipeDeclaration = {
        playerId: 'player1',
        targetRank: HandRank.TRIPLE,
        targetNumber: 7 as any,
      }
      expect(isSnipePhaseComplete(players)).toBe(true)
    })
  })

  describe('생존 확정 시스템 유틸리티', () => {
    it('칩 분배를 올바르게 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 0, bet: 0, folded: false, isSurvived: false },
        { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: true },
        { id: 'player3', chips: 30, bet: 0, folded: false, isSurvived: true },
      ]

      const result = distributeRemainingChips(players, 10)

      // 0칩 플레이어에게 우선 1칩
      expect(result[0].chips).toBe(1)

      // 나머지 9칩을 생존자들에게 분배
      const totalSurvivorChips = result[1].chips + result[2].chips
      expect(totalSurvivorChips).toBe(50 + 30 + 9) // 기존 + 분배된 칩
    })

    it('활성 플레이어 수를 올바르게 계산해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 0, bet: 0, folded: false, isSurvived: false }, // 탈락
        { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false }, // 활성
        { id: 'player3', chips: 30, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        { id: 'player4', chips: 20, bet: 0, folded: false, isSurvived: false }, // 활성
      ]

      expect(getActivePlayerCount(players)).toBe(2) // player2, player4
    })
  })

  describe('엣지 케이스', () => {
    it('빈 배열을 올바르게 처리해야 함', () => {
      expect(getActivePlayerCount([])).toBe(0)
      expect(isGameOver([])).toBe(true)
      expect(distributeRemainingChips([], 100)).toEqual([])
    })

    it('모든 플레이어가 생존 확정된 경우를 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 0, folded: false, isSurvived: true },
        { id: 'player2', chips: 80, bet: 0, folded: false, isSurvived: true },
      ]

      expect(getActivePlayerCount(players)).toBe(0)
      expect(isGameOver(players)).toBe(true)
    })

    it('잘못된 저격 대상을 처리해야 함', () => {
      const snipes = [
        { playerId: 'player1', targetRank: 'INVALID' as any, targetNumber: 15 as any },
      ]

      // 잘못된 저격은 무시되어야 함
      expect(() => getAvailableSnipeTargets(snipes)).not.toThrow()
    })
  })
})
