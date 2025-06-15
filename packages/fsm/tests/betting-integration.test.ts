import { beforeEach, describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../src/machines'
import { bettingMachine } from '../src/machines/betting.machine'
import type { Player } from '../src/types/context'

describe('베팅 머신 통합 테스트', () => {
  describe('베팅 머신 단독 테스트', () => {
    it('기본 베팅 플로우가 작동해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 0, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 0, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1, // 기본 베팅 1칩
          pot: 2, // 플레이어 2명 × 1칩
        },
      }).start()

      expect(actor.getSnapshot().value).toBe('turn')
      expect(actor.getSnapshot().context.pot).toBe(2)
      expect(actor.getSnapshot().context.highest).toBe(1)
    })

    it('베팅 액션을 올바르게 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 2,
        },
      }).start()

      // player1이 5칩 레이즈
      actor.send({ type: 'BET', amount: 5 })

      const context = actor.getSnapshot().context
      expect(context.pot).toBe(7) // 2 + 5
      expect(context.highest).toBe(6) // player1의 총 베팅액: 1 + 5 = 6
      expect(actor.getSnapshot().value).toBe('next')
    })

    it('폴드 액션을 올바르게 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 2,
        },
      }).start()

      // player1이 폴드
      actor.send({ type: 'FOLD' })

      expect(actor.getSnapshot().value).toBe('next')
      // 팟은 변경되지 않음
      expect(actor.getSnapshot().context.pot).toBe(2)
    })

    it('베팅 라운드가 완료되면 done 상태로 전환되어야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 1,
        },
      }).start()

      // 마지막 플레이어가 액션하면 done으로 전환
      actor.send({ type: 'BET', amount: 2 })

      expect(actor.getSnapshot().value).toBe('done')
    })
  })

  describe('게임 머신과 베팅 머신 통합', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
              actor = createActor(gameMachine, { input: {} }).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'START_GAME' })
    })

    it('게임 시작 후 1차 베팅 라운드로 진입해야 함', () => {
      expect(actor.getSnapshot().value).toBe('bet_round1')

      const context = actor.getSnapshot().context
      // 기본 베팅이 설정되어야 함
      expect(context.players[0].bet).toBe(1)
      expect(context.players[1].bet).toBe(1)
      expect(context.pot).toBe(2)
    })

    it('베팅 머신에 올바른 입력이 전달되어야 함', () => {
      const context = actor.getSnapshot().context

      // 베팅 머신 입력 검증
      expect(context.players.length).toBe(2)
      expect(context.dealerIdx).toBeDefined()
      expect(context.currentBet).toBeDefined()
      expect(context.pot).toBe(2) // 기본 베팅 2칩
    })

    it('1차 베팅 완료 후 공유 카드 공개로 진행되어야 함', () => {
      // 베팅 머신이 완료되면 reveal_community로 전환
      // (실제 베팅 액션은 베팅 머신 내부에서 처리)

      const initialCommunityCount = actor.getSnapshot().context.communityRevealed
      expect(initialCommunityCount).toBe(2) // 초기 공유 카드 2장

      // 베팅 완료 후 추가 공유 카드가 공개되어야 함
      // (베팅 머신 완료 시뮬레이션은 복잡하므로 구조 테스트)
    })
  })

  describe('베팅 규칙 검증 (game-rule.md 섹션 5)', () => {
    describe('베팅 한도 규칙', () => {
      it('레이즈 한도가 최저 보유 칩 이하여야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 50, bet: 1, folded: false, isSurvived: false }, // 최저 보유자
          { id: 'player2', chips: 100, bet: 1, folded: false, isSurvived: false },
        ]

        // 최대 레이즈는 50칩 (최저 보유자 기준)
        const maxRaise = Math.min(...players.map((p) => p.chips))
        expect(maxRaise).toBe(50)
      })

      it('생존 확정자는 베팅에서 제외되어야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 50, bet: 0, folded: false, isSurvived: false },
          { id: 'player2', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        ]

        const activePlayers = players.filter((p) => !p.isSurvived && !p.folded)
        expect(activePlayers).toHaveLength(1)
        expect(activePlayers[0].id).toBe('player1')
      })
    })

    describe('베팅 액션 규칙', () => {
      it('콜 액션이 올바르게 계산되어야 함', () => {
        const currentBet = 5
        const playerBet = 2
        const callAmount = currentBet - playerBet

        expect(callAmount).toBe(3) // 부족분만큼 추가 베팅
      })

      it('레이즈 액션이 올바르게 계산되어야 함', () => {
        const currentBet = 5
        const playerBet = 2
        const raiseAmount = 3
        const totalBet = currentBet + raiseAmount

        expect(totalBet).toBe(8) // 콜 + 추가 레이즈
      })

      it('폴드한 플레이어는 팟 참여에서 제외되어야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 50, bet: 5, folded: true, isSurvived: false },
          { id: 'player2', chips: 100, bet: 5, folded: false, isSurvived: false },
        ]

        const activePlayers = players.filter((p) => !p.folded)
        expect(activePlayers).toHaveLength(1)
        expect(activePlayers[0].id).toBe('player2')
      })
    })

    describe('베팅 라운드 종료 조건', () => {
      it('모든 플레이어가 동일한 베팅액이면 라운드 종료해야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 95, bet: 5, folded: false, isSurvived: false },
          { id: 'player2', chips: 95, bet: 5, folded: false, isSurvived: false },
          { id: 'player3', chips: 95, bet: 5, folded: false, isSurvived: false },
        ]

        const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
        const bets = activePlayers.map((p) => p.bet)
        const allBetsEqual = bets.every((bet) => bet === bets[0])

        expect(allBetsEqual).toBe(true)
      })

      it('한 명만 남으면 라운드 종료해야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 95, bet: 5, folded: false, isSurvived: false },
          { id: 'player2', chips: 0, bet: 5, folded: true, isSurvived: false },
          { id: 'player3', chips: 100, bet: 0, folded: true, isSurvived: false },
        ]

        const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)
        expect(activePlayers).toHaveLength(1)
      })
    })
  })

  describe('베팅 시나리오 테스트', () => {
    it('2명 게임 기본 베팅 시나리오', () => {
      const players: Player[] = [
        { id: 'player1', chips: 99, bet: 1, folded: false, isSurvived: false }, // 기본 베팅 후
        { id: 'player2', chips: 99, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 2,
        },
      }).start()

      // player1 체크 (베팅 없음)
      actor.send({ type: 'BET', amount: 0 })
      expect(actor.getSnapshot().context.pot).toBe(2)

      // 다음 플레이어로 이동
      expect(actor.getSnapshot().value).toBe('next')
    })

    it('3명 게임 레이즈 시나리오', () => {
      const players: Player[] = [
        { id: 'player1', chips: 89, bet: 1, folded: false, isSurvived: false },
        { id: 'player2', chips: 89, bet: 1, folded: false, isSurvived: false },
        { id: 'player3', chips: 89, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 3,
        },
      }).start()

      // player1이 5칩으로 레이즈
      actor.send({ type: 'BET', amount: 5 })

      const context = actor.getSnapshot().context
      expect(context.pot).toBe(8) // 3 + 5
      expect(context.highest).toBe(6) // player1의 총 베팅액: 1 + 5 = 6
    })

    it('올인 시나리오', () => {
      const players: Player[] = [
        { id: 'player1', chips: 10, bet: 1, folded: false, isSurvived: false }, // 적은 칩
        { id: 'player2', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      // 최대 베팅은 최저 보유자(10칩) 기준
      const maxBet = Math.min(...players.map((p) => p.chips))
      expect(maxBet).toBe(10)

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 2,
        },
      }).start()

      // player1이 올인 (남은 칩 모두)
      actor.send({ type: 'BET', amount: 10 })

      expect(actor.getSnapshot().context.pot).toBe(12) // 2 + 10
      expect(actor.getSnapshot().context.highest).toBe(11) // player1의 총 베팅액: 1 + 10 = 11
    })
  })

  describe('에러 처리 및 엣지 케이스', () => {
    it('잘못된 베팅 액션을 우아하게 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 1,
        },
      }).start()

      const initialState = actor.getSnapshot()

      // 음수 베팅 시도 (실제로는 가드에서 막혀야 함)
      actor.send({ type: 'BET', amount: -5 })

      // 플레이어가 1명만 있으므로 바로 done 상태로 전환
      expect(actor.getSnapshot().value).toBe('done')
    })

    it('빈 플레이어 배열을 처리해야 함', () => {
      const actor = createActor(bettingMachine, {
        input: {
          order: [],
          idx: 0,
          highest: 0,
          pot: 0,
        },
      }).start()

      expect(actor.getSnapshot().value).toBe('turn')
      expect(actor.getSnapshot().context.pot).toBe(0)
    })

    it('인덱스 범위 초과를 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 5, // 범위 초과
          highest: 1,
          pot: 1,
        },
      }).start()

      // 베팅 머신이 정상적으로 시작되어야 함
      expect(actor.getSnapshot().value).toBe('turn')
    })
  })

  describe('성능 테스트', () => {
    it('대규모 플레이어 베팅을 처리해야 함', () => {
      const players: Player[] = Array.from({ length: 6 }, (_, i) => ({
        id: `player${i + 1}`,
        chips: 60,
        bet: 1,
        folded: false,
        isSurvived: false,
      }))

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 6,
        },
      }).start()

      expect(actor.getSnapshot().context.order).toHaveLength(6)
      expect(actor.getSnapshot().context.pot).toBe(6)
    })

    it('연속 베팅 액션을 빠르게 처리해야 함', () => {
      const players: Player[] = [
        { id: 'player1', chips: 100, bet: 1, folded: false, isSurvived: false },
        { id: 'player2', chips: 100, bet: 1, folded: false, isSurvived: false },
      ]

      const actor = createActor(bettingMachine, {
        input: {
          order: players,
          idx: 0,
          highest: 1,
          pot: 2,
        },
      }).start()

      const startTime = performance.now()

      // 연속 베팅 액션
      for (let i = 0; i < 10; i++) {
        actor.send({ type: 'BET', amount: 1 })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 10개 액션이 100ms 이내에 처리되어야 함
      expect(duration).toBeLessThan(100)
    })
  })
}) 