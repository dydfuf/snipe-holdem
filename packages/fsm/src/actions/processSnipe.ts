import { assign } from 'xstate'
import type { SnipeDeclaration } from '../types/cards'
import type { GameContext } from '../types/context'
import { isValidSnipeDeclaration } from '../utils/snipe'

// AIDEV‑NOTE: 저격 선언 처리 - game-rule.md 섹션 2.7, 4 기준
// 중복 저격 방지 및 선언 순서 관리

export const processSnipe = assign(
  ({
    context,
    event,
  }: {
    context: GameContext
    event: { type: 'SNIPE_ACTION'; playerId: string; targetRank?: any; targetNumber?: any }
  }) => {
    const { playerId, targetRank, targetNumber } = event

    // 저격 선언인 경우
    if (targetRank && targetNumber) {
      const declaration: SnipeDeclaration = {
        playerId,
        targetRank,
        targetNumber,
      }

      // 유효한 저격인지 확인
      if (!isValidSnipeDeclaration(declaration, context.snipeDeclarations)) {
        // 무효한 저격은 무시 (중복 선언)
        return {
          version: context.version + 1,
        }
      }

      // 플레이어에게 저격 선언 추가
      const updatedPlayers = context.players.map((player) =>
        player.id === playerId ? { ...player, snipeDeclaration: declaration } : player
      )

      return {
        players: updatedPlayers,
        snipeDeclarations: [...context.snipeDeclarations, declaration],
        snipeIdx: context.snipeIdx + 1,
        version: context.version + 1,
      }
    }

    // 패스인 경우
    return {
      snipeIdx: context.snipeIdx + 1,
      version: context.version + 1,
    }
  }
) 