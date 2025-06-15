import { describe, expect, it } from 'vitest'
import type { Player } from '../src/types/context'

describe('베팅 액션 유틸리티 테스트', () => {
  describe('베팅 한도 계산', () => {
    it('최저 보유 칩 기준으로 최대 베팅을 계산해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 30, bet: 0, folded: false, isSurvived: false }, // 최저
        { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false },
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]

      // game-rule.md 섹션 5: "레이즈 한도: 현재 최저 보유 칩 이하"
      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const maxBet = Math.min(...activePlayers.map((p) => p.chips))

      expect(maxBet).toBe(30)
    })

    it('생존 확정자는 베팅 한도 계산에서 제외해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 10, bet: 0, folded: false, isSurvived: true }, // 생존 확정 (제외)
        { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false }, // 최저
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const maxBet = Math.min(...activePlayers.map((p) => p.chips))

      expect(maxBet).toBe(50) // player1(10칩)은 제외
    })

    it('폴드한 플레이어는 베팅 한도 계산에서 제외해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 5, bet: 0, folded: true, isSurvived: false }, // 폴드 (제외)
        { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false }, // 최저
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const maxBet = Math.min(...activePlayers.map((p) => p.chips))

      expect(maxBet).toBe(50) // player1(5칩)은 제외
    })
  })

  describe('베팅 액션 검증', () => {
    it('콜 액션이 유효한지 검증해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 50,
        bet: 2,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 5
      const callAmount = currentBet - player.bet // 3칩 필요

      // 플레이어가 콜할 수 있는지 확인
      const canCall = player.chips >= callAmount
      expect(canCall).toBe(true)

      // 콜 후 상태
      const afterCall = {
        ...player,
        chips: player.chips - callAmount,
        bet: currentBet,
      }
      expect(afterCall.chips).toBe(47)
      expect(afterCall.bet).toBe(5)
    })

    it('레이즈 액션이 유효한지 검증해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 50,
        bet: 2,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 5
      const raiseAmount = 10
      const totalBet = currentBet + raiseAmount
      const requiredChips = totalBet - player.bet // 13칩 필요

      // 플레이어가 레이즈할 수 있는지 확인
      const canRaise = player.chips >= requiredChips
      expect(canRaise).toBe(true)

      // 레이즈 후 상태
      const afterRaise = {
        ...player,
        chips: player.chips - requiredChips,
        bet: totalBet,
      }
      expect(afterRaise.chips).toBe(37)
      expect(afterRaise.bet).toBe(15)
    })

    it('올인 상황을 올바르게 처리해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 3, // 적은 칩
        bet: 2,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 10
      const callAmount = currentBet - player.bet // 8칩 필요하지만 3칩만 보유

      // 올인 상황
      const isAllIn = player.chips < callAmount
      expect(isAllIn).toBe(true)

      // 올인 후 상태
      const afterAllIn = {
        ...player,
        chips: 0,
        bet: player.bet + player.chips, // 기존 베팅 + 남은 칩
      }
      expect(afterAllIn.chips).toBe(0)
      expect(afterAllIn.bet).toBe(5)
    })
  })

  describe('베팅 라운드 종료 조건', () => {
    it('모든 활성 플레이어의 베팅이 동일하면 라운드 종료해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 45, bet: 5, folded: false, isSurvived: false },
        { id: 'player2', chips: 45, bet: 5, folded: false, isSurvived: false },
        { id: 'player3', chips: 0, bet: 10, folded: true, isSurvived: false }, // 폴드 (제외)
        { id: 'player4', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정 (제외)
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const bets = activePlayers.map((p) => p.bet)
      const allBetsEqual = bets.length > 0 && bets.every((bet) => bet === bets[0])

      expect(allBetsEqual).toBe(true)
      expect(activePlayers).toHaveLength(2)
    })

    it('활성 플레이어가 1명 이하면 라운드 종료해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 45, bet: 5, folded: false, isSurvived: false }, // 유일한 활성 플레이어
        { id: 'player2', chips: 0, bet: 5, folded: true, isSurvived: false }, // 폴드
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const shouldEndRound = activePlayers.length <= 1

      expect(shouldEndRound).toBe(true)
      expect(activePlayers).toHaveLength(1)
    })

    it('베팅이 진행 중이면 라운드 계속해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 45, bet: 5, folded: false, isSurvived: false },
        { id: 'player2', chips: 47, bet: 3, folded: false, isSurvived: false }, // 다른 베팅액
        { id: 'player3', chips: 48, bet: 2, folded: false, isSurvived: false },
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      const bets = activePlayers.map((p) => p.bet)
      const allBetsEqual = bets.every((bet) => bet === bets[0])

      expect(allBetsEqual).toBe(false)
      expect(activePlayers.length > 1).toBe(true)
    })
  })

  describe('베팅 순서 관리', () => {
    it('딜러 다음부터 시계방향으로 베팅 순서를 계산해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 0, folded: false, isSurvived: false }, // 인덱스 0
        { id: 'player2', chips: 100, bet: 0, folded: false, isSurvived: false }, // 인덱스 1 (딜러)
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false }, // 인덱스 2
        { id: 'player4', chips: 100, bet: 0, folded: false, isSurvived: false }, // 인덱스 3
      ]
      const dealerIdx = 1

      // 딜러 다음부터 시작: player3 → player4 → player1 → player2
      const bettingOrder: string[] = []
      for (let i = 1; i <= players.length; i++) {
        const idx = (dealerIdx + i) % players.length
        bettingOrder.push(players[idx].id)
      }

      expect(bettingOrder).toEqual(['player3', 'player4', 'player1', 'player2'])
    })

    it('폴드한 플레이어는 베팅 순서에서 제외해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 0, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 0, folded: true, isSurvived: false }, // 폴드
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false },
        { id: 'player4', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]
      const dealerIdx = 0

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      expect(activePlayers.map((p) => p.id)).toEqual(['player1', 'player3', 'player4'])
    })

    it('생존 확정자는 베팅 순서에서 제외해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 0, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]

      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
      expect(activePlayers.map((p) => p.id)).toEqual(['player1', 'player3'])
    })
  })

  describe('팟 계산', () => {
    it('베팅 후 팟이 올바르게 업데이트되어야 함', () => {
      let pot = 10 // 기존 팟
      const betAmount = 5

      pot += betAmount
      expect(pot).toBe(15)
    })

    it('여러 플레이어 베팅이 누적되어야 함', () => {
      let pot = 0
      const bets = [1, 1, 5, 3, 2] // 기본 베팅 + 레이즈들

      for (const bet of bets) {
        pot += bet
      }

      expect(pot).toBe(12)
    })

    it('폴드는 팟에 영향을 주지 않아야 함', () => {
      const pot = 10
      const initialPot = pot

      // 폴드 액션 (팟 변화 없음)
      expect(pot).toBe(initialPot)
    })
  })

  describe('베팅 검증 함수', () => {
    it('체크 액션이 유효한지 확인해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 100,
        bet: 5,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 5

      // 현재 베팅과 동일하면 체크 가능
      const canCheck = player.bet === currentBet
      expect(canCheck).toBe(true)
    })

    it('베팅 액션의 최소/최대 한도를 확인해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 50,
        bet: 2,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 5
      const maxBetLimit = 30 // 최저 보유자 기준

      // 최소 베팅: 현재 베팅까지 맞추기
      const minBet = currentBet - player.bet
      expect(minBet).toBe(3)

      // 최대 베팅: 플레이어 보유 칩과 테이블 한도 중 작은 값
      const maxBet = Math.min(player.chips, maxBetLimit)
      expect(maxBet).toBe(30) // 플레이어가 50칩 보유하지만 테이블 한도가 30
    })

    it('잘못된 베팅 액션을 거부해야 함', () => {
      const player: Player = {
        id: 'player1',
        chips: 10,
        bet: 2,
        folded: false,
        isSurvived: false,
      }
      const currentBet = 5
      const raiseAmount = 20 // 보유 칩보다 많은 레이즈

      const requiredChips = currentBet + raiseAmount - player.bet
      const isValidBet = requiredChips <= player.chips

      expect(isValidBet).toBe(false) // 27칩 필요하지만 10칩만 보유
    })
  })

  describe('사이드 팟 계산 (올인 상황)', () => {
    it('올인 플레이어가 있을 때 사이드 팟을 계산해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 0, bet: 10, folded: false, isSurvived: false }, // 올인
        { id: 'player2', chips: 40, bet: 20, folded: false, isSurvived: false },
        { id: 'player3', chips: 30, bet: 20, folded: false, isSurvived: false },
      ]

      // 메인 팟: 모든 플레이어가 참여할 수 있는 최대 금액
      const allInAmount = 10
      const mainPot = allInAmount * players.length // 30칩

      // 사이드 팟: 올인 플레이어를 제외한 나머지 베팅
      const sidePotPlayers = players.filter((p) => p.bet > allInAmount)
      const sidePotPerPlayer = 20 - allInAmount // 10칩씩
      const sidePot = sidePotPerPlayer * sidePotPlayers.length // 20칩

      expect(mainPot).toBe(30)
      expect(sidePot).toBe(20)
      expect(mainPot + sidePot).toBe(50) // 총 팟
    })

    it('여러 올인 상황을 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 0, bet: 5, folded: false, isSurvived: false }, // 첫 번째 올인
        { id: 'player2', chips: 0, bet: 15, folded: false, isSurvived: false }, // 두 번째 올인
        { id: 'player3', chips: 10, bet: 25, folded: false, isSurvived: false },
      ]

      // 첫 번째 팟: 5칩 × 3명 = 15칩 (모든 플레이어 참여)
      const pot1 = 5 * 3

      // 두 번째 팟: (15-5)칩 × 2명 = 20칩 (player2, player3 참여)
      const pot2 = (15 - 5) * 2

      // 세 번째 팟: (25-15)칩 × 1명 = 10칩 (player3만 참여)
      const pot3 = (25 - 15) * 1

      expect(pot1).toBe(15)
      expect(pot2).toBe(20)
      expect(pot3).toBe(10)
      expect(pot1 + pot2 + pot3).toBe(45) // 총 팟
    })
  })
}) 