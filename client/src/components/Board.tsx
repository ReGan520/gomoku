import { useRef, useEffect } from 'react'
import { BOARD_SIZE, EMPTY, BLACK, WHITE, type Board as BoardType, type Player, type Position } from '../../../shared/types'

interface BoardProps {
  board: BoardType
  currentPlayer: Player
  lastMove: Position | null
  winner: Player | null
  disabled: boolean
  onCellClick: (row: number, col: number) => void
}

const CELL_SIZE = 36
const PADDING = 24
const BOARD_PX = PADDING * 2 + (BOARD_SIZE - 1) * CELL_SIZE
const STONE_RADIUS = CELL_SIZE * 0.42

export default function Board({ board, currentPlayer, lastMove, winner, disabled, onCellClick }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = BOARD_PX * dpr
    canvas.height = BOARD_PX * dpr
    ctx.scale(dpr, dpr)

    drawBoard(ctx)
    drawStones(ctx)
    drawLastMoveMarker(ctx)
    drawGridNumbers(ctx)
  }, [board, lastMove])

  function drawBoard(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#DEB887'
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1

    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = PADDING + i * CELL_SIZE
      const y = PADDING + i * CELL_SIZE
      ctx.beginPath()
      ctx.moveTo(PADDING, y)
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, PADDING)
      ctx.lineTo(x, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
      ctx.stroke()
    }

    const starPoints = [
      [3, 3], [3, 7], [3, 11],
      [7, 3], [7, 7], [7, 11],
      [11, 3], [11, 7], [11, 11],
    ]
    ctx.fillStyle = '#333'
    for (const [sr, sc] of starPoints) {
      ctx.beginPath()
      ctx.arc(PADDING + sc * CELL_SIZE, PADDING + sr * CELL_SIZE, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawStones(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY) continue
        const x = PADDING + c * CELL_SIZE
        const y = PADDING + r * CELL_SIZE
        const gradient = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, STONE_RADIUS)
        if (board[r][c] === BLACK) {
          gradient.addColorStop(0, '#555')
          gradient.addColorStop(1, '#000')
        } else {
          gradient.addColorStop(0, '#fff')
          gradient.addColorStop(1, '#ccc')
        }
        ctx.beginPath()
        ctx.arc(x, y, STONE_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
        if (board[r][c] === WHITE) {
          ctx.strokeStyle = '#999'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
  }

  function drawLastMoveMarker(ctx: CanvasRenderingContext2D) {
    if (!lastMove) return
    const x = PADDING + lastMove.col * CELL_SIZE
    const y = PADDING + lastMove.row * CELL_SIZE
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawGridNumbers(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#666'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.fillText(String(i + 1), PADDING + i * CELL_SIZE, 2)
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'right'
      ctx.fillText(String.fromCharCode(65 + i), PADDING - 8, PADDING + i * CELL_SIZE)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
    }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (disabled || winner) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_PX / rect.width
    const scaleY = BOARD_PX / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    const col = Math.round((mx - PADDING) / CELL_SIZE)
    const row = Math.round((my - PADDING) / CELL_SIZE)
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === EMPTY) {
      onCellClick(row, col)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: BOARD_PX, height: BOARD_PX, cursor: disabled ? 'default' : 'pointer' }}
      onClick={handleClick}
    />
  )
}
