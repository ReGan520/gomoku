export const BOARD_SIZE = 15
export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2

export type Player = typeof EMPTY | typeof BLACK | typeof WHITE
export type Board = Player[][]

export interface Position {
  row: number
  col: number
}

export interface Room {
  id: string
  players: { id: string; name: string; color: Player }[]
  spectators: { id: string; name: string }[]
  board: Board
  currentPlayer: Player
  winner: Player | null
  isDraw: boolean
  lastMove: Position | null
  gameStarted: boolean
  moves: Position[]
  undoRequest: { from: string; to: string } | null
  gameMode: 'pvp' | 'pve'
}

export interface MoveHistory {
  player: Player
  position: Position
}

export const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]
