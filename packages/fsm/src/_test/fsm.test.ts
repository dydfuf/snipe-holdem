import { expect, it } from 'vitest'
import { createActor } from 'xstate'
import { gameMachine } from '../machines'

it('게임 머신이 정상적으로 생성되고 시작됨', () => {
  const actor = createActor(gameMachine)
  expect(actor).toBeDefined()

  actor.start()
  expect(actor.getSnapshot().value).toBe('waiting')
})

it('플레이어가 정상적으로 참가함', () => {
  const actor = createActor(gameMachine).start()

  actor.send({ type: 'JOIN', playerId: 'A' })
  expect(actor.getSnapshot().context.players.length).toBe(1)
  expect(actor.getSnapshot().context.players[0].id).toBe('A')
})

it('두 명이 게임을 시작할 수 있음', () => {
  const actor = createActor(gameMachine).start()

  actor.send({ type: 'JOIN', playerId: 'A' })
  actor.send({ type: 'JOIN', playerId: 'B' })

  expect(actor.getSnapshot().context.players.length).toBe(2)

  actor.send({ type: 'START' })
  expect(actor.getSnapshot().value).not.toBe('waiting')
})
