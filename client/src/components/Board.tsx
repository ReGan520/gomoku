import { useRef, useEffect, useState, useCallback } from 'react'
import { BOARD_SIZE, EMPTY, BLACK, WHITE, type Board as BoardType, type Player, type Position } from '../../../shared/types'

interface BoardProps {
  board: BoardType
  currentPlayer: Player
  lastMove: Position | null
  winner: Player | null
  disabled: boolean
  onCellClick: (row: number, col: number) => void
}

const CELL_SIZE = 38
const PADDING = 30
const BOARD_PX = PADDING * 2 + (BOARD_SIZE - 1) * CELL_SIZE
const STONE_RADIUS = CELL_SIZE * 0.42

export default function Board({ board, currentPlayer, lastMove, winner, disabled, onCellClick }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverPos, setHoverPos] = useState<{ row: number; col: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = BOARD_PX * dpr
    canvas.height = BOARD_PX * dpr
    ctx.scale(dpr, dpr)

    drawBackground(ctx)
    drawGrid(ctx)
    drawStarPoints(ctx)
    drawStones(ctx)
    drawLastMoveMarker(ctx)
    if (hoverPos && !disabled && !winner) {
      drawHoverIndicator(ctx, hoverPos.row, hoverPos.col)
    }
  }, [board, lastMove, currentPlayer, hoverPos, disabled, winner])

  useEffect(() => { draw() }, [draw])

  function getGridPos(e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = BOARD_PX / rect.width
    const scaleY = BOARD_PX / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    const col = Math.round((mx - PADDING) / CELL_SIZE)
    const row = Math.round((my - PADDING) / CELL_SIZE)
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
      return { row, col }
    }
    return null
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (disabled || winner) {
      if (hoverPos) setHoverPos(null)
      return
    }
    const pos = getGridPos(e)
    if (pos) {
      if (!hoverPos || hoverPos.row !== pos.row || hoverPos.col !== pos.col) {
        setHoverPos(pos)
      }
    } else if (hoverPos) {
      setHoverPos(null)
    }
  }

  function handleMouseLeave() {
    if (hoverPos) setHoverPos(null)
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (disabled || winner) return
    const pos = getGridPos(e)
    if (pos && board[pos.row][pos.col] === EMPTY) {
      onCellClick(pos.row, pos.col)
    }
  }

  function drawBackground(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, BOARD_PX, BOARD_PX)
    grad.addColorStop(0, '#d4a76a')
    grad.addColorStop(0.3, '#c99a5e')
    grad.addColorStop(0.6, '#c39254')
    grad.addColorStop(1, '#b8844a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX)

    for (let i = 0; i < 60; i++) {
      const x = Math.random() * BOARD_PX
      const y = Math.random() * BOARD_PX
      const w = 1 + Math.random() * 3
      const h = 40 + Math.random() * 120
      ctx.strokeStyle = `rgba(160, 110, 50, ${0.03 + Math.random() * 0.04})`
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 6, y + h)
      ctx.stroke()
    }

    const vignette = ctx.createRadialGradient(
      BOARD_PX / 2, BOARD_PX / 2, BOARD_PX * 0.2,
      BOARD_PX / 2, BOARD_PX / 2, BOARD_PX * 0.7,
    )
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.15)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX)
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = PADDING + i * CELL_SIZE
      ctx.strokeStyle = 'rgba(60, 30, 10, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(PADDING, pos)
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, pos)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pos, PADDING)
      ctx.lineTo(pos, PADDING + (BOARD_SIZE - 1) * CELL_SIZE)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(60, 30, 10, 0.3)'
    ctx.lineWidth = 0.5
    const o = PADDING - 4
    const oe = PADDING + (BOARD_SIZE - 1) * CELL_SIZE + 4
    ctx.strokeRect(o, o, oe - o, oe - o)
  }

  function drawStarPoints(ctx: CanvasRenderingContext2D) {
    const pts = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]]
    for (const [sr, sc] of pts) {
      const x = PADDING + sc * CELL_SIZE
      const y = PADDING + sr * CELL_SIZE
      ctx.fillStyle = 'rgba(60, 30, 10, 0.6)'
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(60, 30, 10, 0.2)'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawStones(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY) continue
        const x = PADDING + c * CELL_SIZE
        const y = PADDING + r * CELL_SIZE
        drawOneStone(ctx, x, y, board[r][c], 1)
      }
    }
  }

  function drawOneStone(ctx: CanvasRenderingContext2D, x: number, y: number, color: Player, scale: number) {
    const r = STONE_RADIUS * scale

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6 * scale
    ctx.shadowOffsetY = 2 * scale
    ctx.beginPath()
    ctx.arc(x, y + 1, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fill()
    ctx.restore()

    if (color === BLACK) {
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
      grad.addColorStop(0, '#666')
      grad.addColorStop(0.4, '#333')
      grad.addColorStop(0.8, '#1a1a1a')
      grad.addColorStop(1, '#000')
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      const sp = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x - r * 0.25, y - r * 0.25, r * 0.5)
      sp.addColorStop(0, 'rgba(255,255,255,0.15)')
      sp.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = sp
      ctx.fill()
    } else {
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r)
      grad.addColorStop(0, '#fff')
      grad.addColorStop(0.3, '#f5f0eb')
      grad.addColorStop(0.7, '#e8e0d8')
      grad.addColorStop(1, '#d0c8c0')
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      ctx.strokeStyle = 'rgba(160, 140, 120, 0.4)'
      ctx.lineWidth = 0.5
      ctx.stroke()

      const sp = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x - r * 0.2, y - r * 0.2, r * 0.4)
      sp.addColorStop(0, 'rgba(255,255,255,0.6)')
      sp.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = sp
      ctx.fill()
    }
  }

  function drawLastMoveMarker(ctx: CanvasRenderingContext2D) {
    if (!lastMove) return
    const x = PADDING + lastMove.col * CELL_SIZE
    const y = PADDING + lastMove.row * CELL_SIZE
    const player = board[lastMove.row]?.[lastMove.col]
    const c = player === BLACK ? 'rgba(255, 200, 100, 0.7)' : 'rgba(220, 80, 80, 0.6)'

    ctx.save()
    ctx.shadowColor = c
    ctx.shadowBlur = 8
    ctx.strokeStyle = c
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, STONE_RADIUS * 0.55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 4
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, STONE_RADIUS * 0.3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  function drawHoverIndicator(ctx: CanvasRenderingContext2D, row: number, col: number) {
    if (board[row][col] !== EMPTY) return
    const x = PADDING + col * CELL_SIZE
    const y = PADDING + row * CELL_SIZE
    ctx.save()
    ctx.globalAlpha = 0.35
    drawOneStone(ctx, x, y, currentPlayer, 0.8)
    ctx.restore()
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: BOARD_PX,
        height: BOARD_PX,
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: '6px',
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}
