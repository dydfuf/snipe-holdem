import { beforeEach, describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../src/machines'
import { HandRank } from '../src/types/cards'
import type { GameContext, Player } from '../src/types/context'
import { canPlayerSnipe, getSnipeOrder, isValidSnipeDeclaration } from '../src/utils/snipe'
import { canConfirmSurvival, isGameOver, processSurvivalConfirmation } from '../src/utils/survival'

describe('게임 상태 머신', () => {
  describe('초기 상태', () => {
    it('waiting 상태로 시작해야 함', () => {
      const actor = createActor(gameMachine).start()
      expect(actor.getSnapshot().value).toBe('waiting')
    })

    it('초기 컨텍스트가 빈 값들로 설정되어야 함', () => {
      const actor = createActor(gameMachine).start()
      const context = actor.getSnapshot().context

      expect(context.players).toEqual([])
      expect(context.deck).toEqual([])
      expect(context.community).toEqual([])
      expect(context.communityRevealed).toBe(0)
      expect(context.pot).toBe(0)
      expect(context.currentBet).toBe(0)
      expect(context.version).toBe(0)
      expect(context.dealerIdx).toBe(0)
      expect(context.currentIdx).toBe(0)
      expect(context.bettingRound).toBe(1)
      expect(context.snipeDeclarations).toEqual([])
    })
  })

  describe('플레이어 참가', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
    })

    it('첫 번째 플레이어가 참가할 수 있어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })

      const context = actor.getSnapshot().context
      expect(context.players).toHaveLength(1)
      expect(context.players[0].id).toBe('player1')
      expect(context.players[0].chips).toBe(100)
      expect(context.players[0].bet).toBe(0)
      expect(context.players[0].folded).toBe(false)
    })

    it('여러 플레이어가 참가할 수 있어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'JOIN', playerId: 'player3' })

      const context = actor.getSnapshot().context
      expect(context.players).toHaveLength(3)
      expect(context.players.map((p: Player) => p.id)).toEqual(['player1', 'player2', 'player3'])
    })

    it('플레이어 참가 시 버전이 증가해야 함', () => {
      const initialVersion = actor.getSnapshot().context.version

      actor.send({ type: 'JOIN', playerId: 'player1' })

      expect(actor.getSnapshot().context.version).toBe(initialVersion + 1)
    })

    it('플레이어 참가 후에도 waiting 상태를 유지해야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })

      expect(actor.getSnapshot().value).toBe('waiting')
    })

    it('인원수별 시작 칩이 올바르게 설정되어야 함', () => {
      // 2명 게임: 100칩
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      expect(actor.getSnapshot().context.players[0].chips).toBe(100)
      expect(actor.getSnapshot().context.players[1].chips).toBe(100)
    })
  })

  describe('게임 시작 조건', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
    })

    it('플레이어 1명으로는 게임을 시작할 수 없어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'START_GAME' })

      expect(actor.getSnapshot().value).toBe('waiting')
    })

    it('플레이어 2명이면 게임을 시작할 수 있어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'START_GAME' })

      expect(actor.getSnapshot().value).not.toBe('waiting')
    })

    it('플레이어 3명 이상이어도 게임을 시작할 수 있어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'JOIN', playerId: 'player3' })
      actor.send({ type: 'START_GAME' })

      expect(actor.getSnapshot().value).not.toBe('waiting')
    })
  })

  describe('게임 진행 흐름', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
    })

    it('게임 상태가 올바르게 전환되어야 함', () => {
      // 게임 시작
      actor.send({ type: 'START_GAME' })

      // 딜링 후 바로 bet_round1로 전환되어야 함 (저격 홀덤 규칙)
      expect(actor.getSnapshot().value).toBe('bet_round1')
    })

    it('게임 시작 시 플레이어들에게 카드가 딜링되어야 함', () => {
      actor.send({ type: 'START_GAME' })

      const context = actor.getSnapshot().context

      // 플레이어들이 핸드를 가져야 함
      expect(context.players[0].hand).toBeDefined()
      expect(context.players[0].hand).toHaveLength(2)
      expect(context.players[1].hand).toBeDefined()
      expect(context.players[1].hand).toHaveLength(2)

      // 덱이 줄어들어야 함 (40장 덱에서 카드들이 딜링됨)
      expect(context.deck.length).toBeLessThan(40)

      // 저격 홀덤 규칙: 초기에 공유 카드 2장이 공개됨
      expect(context.community).toHaveLength(2)
      expect(context.communityRevealed).toBe(2)
    })

    it('딜링 시 플레이어 베팅과 폴드 상태가 설정되어야 함', () => {
      actor.send({ type: 'START_GAME' })

      const newContext = actor.getSnapshot().context
      // 저격 홀덤 규칙: 기본 베팅 1칩
      expect(newContext.players[0].bet).toBe(1)
      expect(newContext.players[0].folded).toBe(false)
      expect(newContext.players[0].isSurvived).toBe(false)
    })

    it('카드 딜링 시 버전이 증가해야 함', () => {
      const initialVersion = actor.getSnapshot().context.version

      actor.send({ type: 'START_GAME' })

      expect(actor.getSnapshot().context.version).toBeGreaterThan(initialVersion)
    })
  })

  describe('베팅 단계', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'START_GAME' })
    })

    it('딜링 후 베팅 단계로 전환되어야 함', () => {
      // 딜링 후 bet_round1로 가야 함 (저격 홀덤 규칙)
      expect(actor.getSnapshot().value).toBe('bet_round1')
    })

    it('베팅 머신에 올바른 입력이 전달되어야 함', () => {
      const context = actor.getSnapshot().context

      // 베팅을 위한 플레이어가 있어야 함
      expect(context.players.length).toBeGreaterThanOrEqual(2)
      expect(context.dealerIdx).toBeDefined()
      expect(context.pot).toBeDefined()
      expect(context.currentBet).toBeDefined()
    })
  })

  describe('저격 시스템', () => {
    describe('저격 선언 유효성', () => {
      it('중복 저격 선언을 방지해야 함', () => {
        const existingSnipes = [
          { playerId: 'player1', targetRank: HandRank.PAIR, targetNumber: 10 as any },
        ]

        const newSnipe = { playerId: 'player2', targetRank: HandRank.PAIR, targetNumber: 10 as any }

        expect(isValidSnipeDeclaration(newSnipe, existingSnipes)).toBe(false)
      })

      it('다른 족보-숫자 조합은 허용해야 함', () => {
        const existingSnipes = [
          { playerId: 'player1', targetRank: HandRank.PAIR, targetNumber: 10 as any },
        ]

        const newSnipe = { playerId: 'player2', targetRank: HandRank.PAIR, targetNumber: 9 as any }

        expect(isValidSnipeDeclaration(newSnipe, existingSnipes)).toBe(true)
      })
    })

    describe('저격 선언 자격', () => {
      it('일반 플레이어는 저격 선언할 수 있어야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 50,
          bet: 0,
          folded: false,
          isSurvived: false,
        }

        expect(canPlayerSnipe(player)).toBe(true)
      })

      it('생존 확정자는 저격 선언할 수 없어야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 50,
          bet: 0,
          folded: false,
          isSurvived: true,
        }

        expect(canPlayerSnipe(player)).toBe(false)
      })

      it('폴드한 플레이어는 저격 선언할 수 없어야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 50,
          bet: 0,
          folded: true,
          isSurvived: false,
        }

        expect(canPlayerSnipe(player)).toBe(false)
      })
    })

    describe('저격 선언 순서', () => {
      it('버튼부터 시계방향으로 순서를 계산해야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 50, bet: 0, folded: false, isSurvived: false },
          { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false },
          { id: 'player3', chips: 50, bet: 0, folded: true, isSurvived: false }, // 폴드
          { id: 'player4', chips: 50, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        ]

        const dealerIdx = 1 // player2가 딜러
        const order = getSnipeOrder(players, dealerIdx)

        // player2(딜러)부터 시작해서 저격 가능한 플레이어만
        expect(order.map((p) => p.id)).toEqual(['player2', 'player1'])
      })
    })
  })

  describe('생존 확정 시스템', () => {
    describe('생존 확정 조건', () => {
      it('2명 게임에서 115칩 이상이면 생존 확정 가능해야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 115,
          bet: 0,
          folded: false,
          isSurvived: false,
        }

        expect(canConfirmSurvival(player, 2)).toBe(true)
      })

      it('필요 칩 수 미만이면 생존 확정 불가해야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 114,
          bet: 0,
          folded: false,
          isSurvived: false,
        }

        expect(canConfirmSurvival(player, 2)).toBe(false)
      })

      it('이미 생존 확정된 플레이어는 재확정 불가해야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 200,
          bet: 0,
          folded: false,
          isSurvived: true,
        }

        expect(canConfirmSurvival(player, 2)).toBe(false)
      })
    })

    describe('생존 확정 처리', () => {
      it('생존 확정 시 75칩을 지불하고 상태를 변경해야 함', () => {
        const player: Player = {
          id: 'player1',
          chips: 115,
          bet: 0,
          folded: false,
          isSurvived: false,
        }

        const result = processSurvivalConfirmation(player, 2)

        expect(result.updatedPlayer.chips).toBe(40) // 115 - 75
        expect(result.updatedPlayer.isSurvived).toBe(true)
        expect(result.paidChips).toBe(75)
      })
    })

    describe('게임 종료 조건', () => {
      it('활성 플레이어가 1명 이하면 게임 종료해야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 0, bet: 0, folded: false, isSurvived: false }, // 탈락
          { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false }, // 활성
          { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        ]

        expect(isGameOver(players)).toBe(true)
      })

      it('활성 플레이어가 2명 이상이면 게임 계속해야 함', () => {
        const players: Player[] = [
          { id: 'player1', chips: 30, bet: 0, folded: false, isSurvived: false }, // 활성
          { id: 'player2', chips: 50, bet: 0, folded: false, isSurvived: false }, // 활성
          { id: 'player3', chips: 100, bet: 0, folded: false, isSurvived: true }, // 생존 확정
        ]

        expect(isGameOver(players)).toBe(false)
      })
    })
  })

  describe('컨텍스트 관리', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
    })

    it('불변성을 유지한 컨텍스트 업데이트가 이루어져야 함', () => {
      const initialContext = actor.getSnapshot().context

      actor.send({ type: 'JOIN', playerId: 'player1' })

      const newContext = actor.getSnapshot().context
      expect(newContext).not.toBe(initialContext) // 다른 객체 참조
      expect(newContext.players).not.toBe(initialContext.players) // 다른 배열 참조
    })

    it('새 플레이어 추가 시 기존 플레이어들이 보존되어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player1' })
      const firstContext = actor.getSnapshot().context

      actor.send({ type: 'JOIN', playerId: 'player2' })
      const secondContext = actor.getSnapshot().context

      expect(secondContext.players).toHaveLength(2)
      expect(secondContext.players[0]).toEqual(firstContext.players[0])
    })

    it('버전 증가가 올바르게 처리되어야 함', () => {
      const initialVersion = actor.getSnapshot().context.version

      // 참가 액션으로 버전 증가
      actor.send({ type: 'JOIN', playerId: 'player1' })
      expect(actor.getSnapshot().context.version).toBe(initialVersion + 1)

      actor.send({ type: 'JOIN', playerId: 'player2' })
      expect(actor.getSnapshot().context.version).toBe(initialVersion + 2)

      // 시작 액션도 버전 증가 (카드 딜링 + 버전 업)
      actor.send({ type: 'START_GAME' })
      expect(actor.getSnapshot().context.version).toBeGreaterThan(initialVersion + 2)
    })
  })

  describe('가드 함수', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
    })

    it('플레이어 수가 부족하면 게임 시작을 막아야 함', () => {
      // 플레이어 없음
      actor.send({ type: 'START_GAME' })
      expect(actor.getSnapshot().value).toBe('waiting')

      // 플레이어 1명
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'START_GAME' })
      expect(actor.getSnapshot().value).toBe('waiting')
    })

    it('플레이어 한도 내에서 참가를 허용해야 함', () => {
      // 한도까지 플레이어 추가 (최대 6명으로 가정)
      for (let i = 1; i <= 6; i++) {
        actor.send({ type: 'JOIN', playerId: `player${i}` })
        expect(actor.getSnapshot().context.players).toHaveLength(i)
      }
    })
  })

  describe('오류 처리', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
    })

    it('waiting 상태에서 유효하지 않은 이벤트를 무시해야 함', () => {
      const initialState = actor.getSnapshot()

      // 유효하지 않은 이벤트 전송
      actor.send({ type: 'INVALID_EVENT' } as any)

      const finalState = actor.getSnapshot()
      expect(finalState.value).toBe(initialState.value)
      expect(finalState.context).toEqual(initialState.context)
    })

    it('누락된 데이터가 있는 이벤트를 우아하게 처리해야 함', () => {
      // 이는 무시되거나 우아하게 처리되어야 함
      expect(() => {
        actor.send({ type: 'JOIN' } as any)
      }).not.toThrow()
    })
  })

  describe('40장 덱 시스템', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'START_GAME' })
    })

    it('덱이 40장으로 구성되어야 함', () => {
      const context = actor.getSnapshot().context

      // 딜링된 카드 수: 플레이어 2명 × 2장 + 공유 카드 2장 = 6장
      const dealtCards = 6
      expect(context.deck.length).toBe(40 - dealtCards)
    })

    it('카드 값이 1-10 범위 내에 있어야 함', () => {
      const context = actor.getSnapshot().context

      // 플레이어 핸드 확인
      for (const player of context.players) {
        if (player.hand) {
          for (const card of player.hand) {
            expect(card).toBeGreaterThanOrEqual(1)
            expect(card).toBeLessThanOrEqual(10)
          }
        }
      }

      // 공유 카드 확인
      for (const card of context.community) {
        expect(card).toBeGreaterThanOrEqual(1)
        expect(card).toBeLessThanOrEqual(10)
      }
    })
  })
})
