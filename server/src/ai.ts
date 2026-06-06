import {
  BOARD_SIZE, EMPTY, BLACK, WHITE, DIRECTIONS,
  type Board, type Player, type Position,
} from '../../shared/types.js'
import { isValidPosition } from './game.js'

function evaluateLine(board: Board, row: number, col: number, dr: number, dc: number, player: Player): number {
  let count = 1
  let openEnds = 0
  let r = row + dr, c = col + dc
  while (isValidPosition(r, c) && board[r][c] === player) {
    count++
    r += dr
    c += dc
  }
  if (isValidPosition(r, c) && board[r][c] === EMPTY) openEnds++

  r = row - dr; c = col - dc
  while (isValidPosition(r, c) && board[r][c] === player) {
    count++
    r -= dr
    c -= dc
  }
  if (isValidPosition(r, c) && board[r][c] === EMPTY) openEnds++

  if (count >= 5) return 100000
  if (openEnds === 0 && count < 5) return 0

  switch (count) {
    case 4: return openEnds === 2 ? 10000 : 1000
    case 3: return openEnds === 2 ? 1000 : 100
    case 2: return openEnds === 2 ? 100 : 10
    case 1: return 1
    default: return 0
  }
}

function evaluatePosition(board: Board, row: number, col: number, player: Player): number {
  if (board[row][col] !== EMPTY) return -1
  let score = 0
  const opp = player === BLACK ? WHITE : BLACK
  for (const [dr, dc] of DIRECTIONS) {
    score += evaluateLine(board, row, col, dr, dc, player) * 1.1
    score += evaluateLine(board, row, col, dr, dc, opp)
  }
  return score
}

export function getAIMove(board: Board, player: Player): Position | null {
  const opponent = player === BLACK ? WHITE : BLACK

  const candidateMoves: { row: number; col: number; score: number }[] = []

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== EMPTY) continue

      let hasNeighbor = false
      for (let dr = -2; dr <= 2 && !hasNeighbor; dr++) {
        for (let dc = -2; dc <= 2 && !hasNeighbor; dc++) {
          if (dr === 0 && dc === 0) continue
          const nr = r + dr, nc = c + dc
          if (isValidPosition(nr, nc) && board[nr][nc] !== EMPTY) {
            hasNeighbor = true
          }
        }
      }

      if (!hasNeighbor) {
        if (board[7][7] === EMPTY) {
          return { row: 7, col: 7 }
        }
        continue
      }

      const score = evaluatePosition(board, r, c, player)
      candidateMoves.push({ row: r, col: c, score })
    }
  }

  if (candidateMoves.length === 0) return null

  candidateMoves.sort((a, b) => b.score - a.score)
  const topScore = candidateMoves[0].score
  const topMoves = candidateMoves.filter(m => m.score === topScore)
  return topMoves[Math.floor(Math.random() * topMoves.length)]
}
