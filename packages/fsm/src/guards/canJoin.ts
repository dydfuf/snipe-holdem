import type { GameContext } from '../types/context'

export const canJoin = ({ context }: { context: GameContext }) => context.players.length < 6
