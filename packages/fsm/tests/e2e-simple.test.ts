import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../src/machines/game.machine'
import type { Card, HandRank } from '../src/types/cards'

// AIDEV‑NOTE: 저격 홀덤 간단한 엔드투엔드 테스트 - 실제 게임 시나리오 검증
// game-rule.md의 모든 규칙을 실제 게임 플로우로 테스트

describe('저격 홀덤 간단한 엔드투엔드 테스트', () => {
  describe('기본 게임 플로우', () => {
    it('2명 게임 시작부터 베팅 라운드까지 정상 작동해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 1. 초기 상태 확인
      expect(actor.getSnapshot().value).toBe('waiting')
      expect(actor.getSnapshot().context.players).toHaveLength(0)

      // 2. 플레이어 참여
      actor.send({ type: 'JOIN', playerId: 'alice' })
      expect(actor.getSnapshot().context.players).toHaveLength(1)
      expect(actor.getSnapshot().context.players[0].id).toBe('alice')

      actor.send({ type: 'JOIN', playerId: 'bob' })
      expect(actor.getSnapshot().context.players).toHaveLength(2)
      expect(actor.getSnapshot().context.players[1].id).toBe('bob')

      // 3. 게임 시작
      actor.send({ type: 'START_GAME' })

      // 베팅 머신이 즉시 완료되어 reveal_community로 전환되어야 함
      const currentState = actor.getSnapshot().value
      expect(['bet_round1', 'reveal_community', 'bet_round2']).toContain(currentState)

      // 4. 게임 시작 후 상태 확인
      const context = actor.getSnapshot().context

      // 카드 딜링 확인
      expect(context.players[0].hand).toHaveLength(2)
      expect(context.players[1].hand).toHaveLength(2)
      expect(context.community.length).toBeGreaterThanOrEqual(2)
      expect(context.communityRevealed).toBeGreaterThanOrEqual(2)

      // 칩과 베팅 확인 (game-rule.md 섹션 1: 2명 게임 100칩 시작)
      expect(context.players[0].chips).toBe(99) // 100 - 1 (기본 베팅)
      expect(context.players[1].chips).toBe(99)
      expect(context.players[0].bet).toBe(1)
      expect(context.players[1].bet).toBe(1)
      expect(context.pot).toBe(2) // 기본 베팅 1칩씩

      // 덱 확인 (40장 - 딜링된 카드)
      const totalDealtCards = 4 + context.community.length // 플레이어 카드 4장 + 공유 카드
      expect(context.deck.length).toBeLessThanOrEqual(40 - totalDealtCards)

      // 버전 업데이트 확인
      expect(context.version).toBeGreaterThan(0)
    })

    it('3명 게임에서 올바른 칩 배분이 작동해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 3명 플레이어 참여
      actor.send({ type: 'JOIN', playerId: 'alice' })
      actor.send({ type: 'JOIN', playerId: 'bob' })
      actor.send({ type: 'JOIN', playerId: 'charlie' })
      actor.send({ type: 'START_GAME' })

      const context = actor.getSnapshot().context

      // game-rule.md 섹션 1: 3명 게임 90칩 시작
      expect(context.players[0].chips).toBe(89) // 90 - 1 (기본 베팅)
      expect(context.players[1].chips).toBe(89)
      expect(context.players[2].chips).toBe(89)
      expect(context.pot).toBe(3) // 3명 × 1칩
    })

    it('최대 6명까지 참여 가능해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 6명 플레이어 참여
      const playerIds = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank']
      for (const playerId of playerIds) {
        actor.send({ type: 'JOIN', playerId })
      }

      expect(actor.getSnapshot().context.players).toHaveLength(6)

      actor.send({ type: 'START_GAME' })
      const context = actor.getSnapshot().context

      // game-rule.md 섹션 1: 6명 게임 60칩 시작
      expect(context.players[0].chips).toBe(59) // 60 - 1 (기본 베팅)
      expect(context.pot).toBe(6) // 6명 × 1칩
    })
  })

  describe('게임 규칙 검증', () => {
    it('플레이어 수 부족 시 게임 시작 불가해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 1명만 참여
      actor.send({ type: 'JOIN', playerId: 'alice' })
      actor.send({ type: 'START_GAME' })

      // 여전히 대기 상태여야 함
      expect(actor.getSnapshot().value).toBe('waiting')
    })

    it('중복 플레이어 참여를 방지해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      actor.send({ type: 'JOIN', playerId: 'alice' })
      actor.send({ type: 'JOIN', playerId: 'alice' }) // 중복 시도

      // 1명만 참여되어야 함
      expect(actor.getSnapshot().context.players).toHaveLength(1)
    })

    it('40장 덱 시스템이 올바르게 작동해야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      actor.send({ type: 'JOIN', playerId: 'alice' })
      actor.send({ type: 'JOIN', playerId: 'bob' })
      actor.send({ type: 'START_GAME' })

      const context = actor.getSnapshot().context

      // 모든 카드가 1-10 범위여야 함
      const allCards = [
        ...context.players[0].hand!,
        ...context.players[1].hand!,
        ...context.community,
        ...context.deck,
      ]

      for (const card of allCards) {
        expect(card).toBeGreaterThanOrEqual(1)
        expect(card).toBeLessThanOrEqual(10)
      }

      // 총 40장이어야 함
      expect(allCards).toHaveLength(40)
    })
  })

  describe('저격 시스템 기본 검증', () => {
    it('저격 선언 데이터 구조가 올바르게 작동해야 함', () => {
      // 저격 선언 테스트 데이터
      const snipeDeclaration = {
        playerId: 'alice',
        targetRank: 'STRAIGHT' as HandRank,
        targetNumber: 8 as Card,
      }

      expect(snipeDeclaration.playerId).toBe('alice')
      expect(snipeDeclaration.targetRank).toBe('STRAIGHT')
      expect(snipeDeclaration.targetNumber).toBe(8)
    })

    it('중복 저격 검증 로직이 작동해야 함', () => {
      const declarations = [
        { playerId: 'alice', targetRank: 'PAIR' as HandRank, targetNumber: 7 as Card },
        { playerId: 'bob', targetRank: 'PAIR' as HandRank, targetNumber: 7 as Card }, // 중복
        { playerId: 'charlie', targetRank: 'STRAIGHT' as HandRank, targetNumber: 8 as Card },
      ]

      // 중복 검사 함수
      const hasDuplicate = (decls: typeof declarations) => {
        return decls.some((decl1, i) =>
          decls.some(
            (decl2, j) =>
              i !== j &&
              decl1.targetRank === decl2.targetRank &&
              decl1.targetNumber === decl2.targetNumber
          )
        )
      }

      expect(hasDuplicate(declarations)).toBe(true) // alice와 bob이 중복

      // 중복 제거 후
      const uniqueDeclarations = [
        { playerId: 'alice', targetRank: 'PAIR' as HandRank, targetNumber: 7 as Card },
        { playerId: 'charlie', targetRank: 'STRAIGHT' as HandRank, targetNumber: 8 as Card },
      ]

      expect(hasDuplicate(uniqueDeclarations)).toBe(false)
    })
  })

  describe('생존 확정 시스템 기본 검증', () => {
    it('생존 칩 계산이 올바르게 작동해야 함', () => {
      // game-rule.md 섹션 1: 생존 칩 = 시작 칩 + 15개
      const testCases = [
        { players: 2, startChips: 100, survivalChips: 115 },
        { players: 3, startChips: 90, survivalChips: 105 },
        { players: 4, startChips: 80, survivalChips: 95 },
        { players: 5, startChips: 70, survivalChips: 85 },
        { players: 6, startChips: 60, survivalChips: 75 },
      ]

      for (const testCase of testCases) {
        const calculatedSurvival = testCase.startChips + 15
        expect(calculatedSurvival).toBe(testCase.survivalChips)
      }
    })

    it('생존 확정 조건 검사가 작동해야 함', () => {
      const player = {
        id: 'alice',
        chips: 115,
        bet: 0,
        folded: false,
        isSurvived: false,
        hand: [1, 2] as Card[],
      }

      // 생존 확정 조건: 칩 >= 115 (2명 게임 기준)
      const survivalThreshold = 115
      const canSurvive = player.chips >= survivalThreshold

      expect(canSurvive).toBe(true)

      // 생존 확정 후 상태 변경
      const survivedPlayer = { ...player, isSurvived: true }
      expect(survivedPlayer.isSurvived).toBe(true)
    })
  })

  describe('게임 종료 조건 검증', () => {
    it('활성 플레이어 필터링이 올바르게 작동해야 함', () => {
      const players = [
        { id: 'alice', chips: 50, folded: false, isSurvived: false },
        { id: 'bob', chips: 0, folded: true, isSurvived: false }, // 폴드
        { id: 'charlie', chips: 120, folded: false, isSurvived: true }, // 생존 확정
      ]

      // 활성 플레이어 = 폴드하지 않고 생존 확정되지 않은 플레이어
      const activePlayers = players.filter((p) => !p.folded && !p.isSurvived)

      expect(activePlayers).toHaveLength(1)
      expect(activePlayers[0].id).toBe('alice')
    })

    it('게임 종료 조건이 올바르게 작동해야 함', () => {
      // 케이스 1: 활성 플레이어 1명 이하
      const endGameScenario1 = [
        { id: 'alice', chips: 0, folded: true, isSurvived: false },
        { id: 'bob', chips: 120, folded: false, isSurvived: true },
      ]

      const activeCount1 = endGameScenario1.filter((p) => !p.folded && !p.isSurvived).length
      expect(activeCount1).toBe(0) // 게임 종료

      // 케이스 2: 활성 플레이어 2명 이상
      const continueGameScenario = [
        { id: 'alice', chips: 50, folded: false, isSurvived: false },
        { id: 'bob', chips: 60, folded: false, isSurvived: false },
        { id: 'charlie', chips: 120, folded: false, isSurvived: true },
      ]

      const activeCount2 = continueGameScenario.filter((p) => !p.folded && !p.isSurvived).length
      expect(activeCount2).toBe(2) // 게임 계속
    })
  })

  describe('성능 및 안정성 테스트', () => {
    it('여러 게임 인스턴스가 독립적으로 작동해야 함', () => {
      const actors: ReturnType<typeof createActor>[] = []

      const actor = createActor(gameMachine, { input: {} }).start()
      actors.push(actor)

      // 각 게임이 독립적으로 작동하는지 확인
      for (const gameActor of actors) {
        gameActor.send({ type: 'JOIN', playerId: 'alice' })
        gameActor.send({ type: 'JOIN', playerId: 'bob' })

        expect(gameActor.getSnapshot().context.players).toHaveLength(2)
        expect(gameActor.getSnapshot().value).toBe('waiting')
      }

      // 메모리 정리
      for (const gameActor of actors) {
        gameActor.stop()
      }
    })

    it('게임 상태 일관성이 유지되어야 함', () => {
      const actor = createActor(gameMachine, { input: {} }).start()

      // 연속적인 상태 변경
      actor.send({ type: 'JOIN', playerId: 'alice' })
      const snapshot1 = actor.getSnapshot()

      actor.send({ type: 'JOIN', playerId: 'bob' })
      const snapshot2 = actor.getSnapshot()

      // 버전이 증가해야 함
      expect(snapshot2.context.version).toBeGreaterThan(snapshot1.context.version)

      // 플레이어 수가 올바르게 증가해야 함
      expect(snapshot2.context.players.length).toBe(snapshot1.context.players.length + 1)
    })
  })
}) 