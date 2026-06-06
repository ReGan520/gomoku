import {
  BOARD_SIZE, EMPTY, BLACK, WHITE, DIRECTIONS,
  type Player, type Board, type Position,
} from '../shared/types'

export function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY))
}

export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function makeMove(board: Board, row: number, col: number, player: Player): boolean {
  if (!isValidPosition(row, col) || board[row][col] !== EMPTY) return false
  board[row][col] = player
  return true
}

export function checkWin(board: Board, row: number, col: number): boolean {
  const player = board[row][col]
  if (player === EMPTY) return false
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i, c = col + dc * i
      if (!isValidPosition(r, c) || board[r][c] !== player) break
      count++
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i, c = col - dc * i
      if (!isValidPosition(r, c) || board[r][c] !== player) break
      count++
    }
    if (count >= 5) return true
  }
  return false
}

export function isBoardFull(board: Board): boolean {
  return board.every(row => row.every(cell => cell !== EMPTY))
}

export function getOpponent(player: Player): Player {
  return player === BLACK ? WHITE : BLACK
}

export function resetBoardFromMoves(moves: Position[]): Board {
  const board = createBoard()
  let isBlackTurn = true
  for (const move of moves) {
    board[move.row][move.col] = isBlackTurn ? BLACK : WHITE
    isBlackTurn = !isBlackTurn
  }
  return board
}
