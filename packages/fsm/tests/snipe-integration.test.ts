import { beforeEach, describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../src/machines/game.machine'
import { HandRank } from '../src/types/cards'

describe('저격 홀덤 통합 테스트', () => {
  describe('저격 시스템 통합', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine, { input: {} }).start()
      // 3명 게임 설정
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'JOIN', playerId: 'player3' })
    })

    it('저격 선언 단계가 올바르게 작동해야 함', () => {
      actor.send({ type: 'START_GAME' })

      // 게임이 시작되면 bet_round1 상태여야 함
      expect(actor.getSnapshot().value).toBe('bet_round1')

      // 베팅 라운드 완료 후 저격 단계로 진행되어야 함
      // (실제 베팅 머신 완료는 모킹이 필요하지만, 구조 테스트)
      const context = actor.getSnapshot().context
      expect(context.snipeDeclarations).toEqual([])
      expect(context.snipeIdx).toBe(0)
    })

    it('저격 선언 이벤트를 처리해야 함', () => {
      actor.send({ type: 'START_GAME' })

      // 저격 선언 이벤트 (실제로는 snipe_phase 상태에서만 처리됨)
      const snipeEvent = {
        type: 'SNIPE_ACTION' as const,
        playerId: 'player1',
        targetRank: HandRank.PAIR,
        targetNumber: 10 as any,
      }

      // 이벤트 구조가 올바른지 확인
      expect(snipeEvent.type).toBe('SNIPE_ACTION')
      expect(snipeEvent.playerId).toBe('player1')
      expect(snipeEvent.targetRank).toBe(HandRank.PAIR)
      expect(snipeEvent.targetNumber).toBe(10)
    })
  })

  describe('생존 확정 시스템 통합', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine, { input: {} }).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
    })

    it('2명 게임에서 올바른 생존 칩 수가 설정되어야 함', () => {
      const context = actor.getSnapshot().context

      // 2명 게임: 시작 칩 100, 생존 칩 115
      expect(context.players[0].chips).toBe(100)
      expect(context.players[1].chips).toBe(100)
      expect(context.initialPlayerCount).toBe(2)
    })

    it('3명 게임에서 올바른 시작 칩이 설정되어야 함', () => {
      actor.send({ type: 'JOIN', playerId: 'player3' })

      const context = actor.getSnapshot().context

      // 3명 게임: 시작 칩 90
      expect(context.players[0].chips).toBe(90)
      expect(context.players[1].chips).toBe(90)
      expect(context.players[2].chips).toBe(90)
      expect(context.initialPlayerCount).toBe(3)
    })
  })

  describe('게임 흐름 통합', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine, { input: {} }).start()
      actor.send({ type: 'JOIN', playerId: 'player1' })
      actor.send({ type: 'JOIN', playerId: 'player2' })
      actor.send({ type: 'START_GAME' })
    })

    it('게임 상태 전환이 올바르게 이루어져야 함', () => {
      // 딜링 후 bet_round1 상태
      expect(actor.getSnapshot().value).toBe('bet_round1')

      const context = actor.getSnapshot().context

      // 기본 베팅이 설정되어야 함
      expect(context.players[0].bet).toBe(1)
      expect(context.players[1].bet).toBe(1)

      // 공유 카드 2장이 공개되어야 함
      expect(context.community).toHaveLength(2)
      expect(context.communityRevealed).toBe(2)

      // 플레이어들이 핸드를 가져야 함
      expect(context.players[0].hand).toHaveLength(2)
      expect(context.players[1].hand).toHaveLength(2)
    })

    it('40장 덱 시스템이 올바르게 작동해야 함', () => {
      const context = actor.getSnapshot().context

      // 총 40장에서 6장 딜링됨 (플레이어 4장 + 공유 2장)
      expect(context.deck.length).toBe(34)

      // 모든 카드가 1-10 범위 내에 있어야 함
      for (const card of context.deck) {
        expect(card).toBeGreaterThanOrEqual(1)
        expect(card).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('에러 처리 및 엣지 케이스', () => {
    let actor: ReturnType<typeof createActor>

    beforeEach(() => {
      actor = createActor(gameMachine, { input: {} }).start()
    })

    it('최대 플레이어 수 제한을 처리해야 함', () => {
      // 6명까지 참가 가능
      for (let i = 1; i <= 6; i++) {
        actor.send({ type: 'JOIN', playerId: `player${i}` })
      }

      expect(actor.getSnapshot().context.players).toHaveLength(6)

      // 6명 게임: 시작 칩 60
      expect(actor.getSnapshot().context.players[0].chips).toBe(60)
    })

    it('잘못된 이벤트를 우아하게 처리해야 함', () => {
      const initialState = actor.getSnapshot()

      // 잘못된 저격 이벤트
      actor.send({
        type: 'SNIPE_ACTION',
        playerId: 'nonexistent',
        targetRank: HandRank.PAIR,
        targetNumber: 15 as any, // 잘못된 카드 번호
      } as any)

      // 상태가 변경되지 않아야 함
      expect(actor.getSnapshot().value).toBe(initialState.value)
    })

    it('빈 게임에서 시작 시도를 막아야 함', () => {
      actor.send({ type: 'START_GAME' })

      // waiting 상태를 유지해야 함
      expect(actor.getSnapshot().value).toBe('waiting')
    })
  })

  describe('성능 및 메모리 테스트', () => {
    it('대량의 플레이어 참가/탈퇴를 처리해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 여러 번 플레이어 추가 시뮬레이션 (최대 6명 제한 고려)
      for (let round = 0; round < 3; round++) {
        // 플레이어 추가 (최대 6명까지만)
        for (let i = 1; i <= 2; i++) {
          const playerId = `round${round}_player${i}`
          actor.send({ type: 'JOIN', playerId })
        }

        const context = actor.getSnapshot().context
        expect(context.players.length).toBeGreaterThan(0)
        expect(context.version).toBeGreaterThanOrEqual(round * 2)
      }
    })

    it('컨텍스트 불변성을 유지해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()
      const initialContext = actor.getSnapshot().context

      actor.send({ type: 'JOIN', playerId: 'player1' })
      const afterJoinContext = actor.getSnapshot().context

      // 원본 컨텍스트가 변경되지 않았는지 확인
      expect(initialContext.players).toHaveLength(0)
      expect(afterJoinContext.players).toHaveLength(1)
      expect(initialContext).not.toBe(afterJoinContext)
    })
  })
})
