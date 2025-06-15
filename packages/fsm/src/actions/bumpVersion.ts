import { assign } from 'xstate'

import type { GameContext } from '../types/context'

export const bumpVersion = assign(({ context }: { context: GameContext }) => ({
  version: context.version + 1,
}))
