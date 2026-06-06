import { useEffect, useRef } from 'react'
import Board from './Board'
import { BLACK, WHITE, type Room } from '../../../shared/types'
import { playMoveSound, playWinSound } from '../utils/sound'

interface GameRoomProps {
  room: Room
  playerId: string
  undoRequested: { from: string } | null
  undoPending: boolean
  opponentLeft: boolean
  onMove: (roomId: string, row: number, col: number) => void
  onUndo: (roomId: string) => void
  onRespondUndo: (roomId: string, accepted: boolean) => void
  onLeave: () => void
}

export default function GameRoom({
  room,
  playerId,
  undoRequested,
  undoPending,
  opponentLeft,
  onMove,
  onUndo,
  onRespondUndo,
  onLeave,
}: GameRoomProps) {
  const prevMovesLen = useRef(room.moves.length)
  const prevWinner = useRef(room.winner)

  useEffect(() => {
    if (room.moves.length > prevMovesLen.current) {
      playMoveSound()
    }
    prevMovesLen.current = room.moves.length
  }, [room.moves.length])

  useEffect(() => {
    if (room.winner && room.winner !== prevWinner.current) {
      setTimeout(playWinSound, 300)
    }
    prevWinner.current = room.winner
  }, [room.winner])

  const me = room.players.find(p => p.id === playerId)
  const opponent = room.players.find(p => p.id !== playerId && !p.id.startsWith('ai-'))
  const opponentName = room.gameMode === 'pve' ? 'AI 对手' : (opponent?.name || '等待对手...')
  const myColor = me?.color
  const isMyTurn = myColor === room.currentPlayer && !room.winner && !room.isDraw
  const isGameOver = !!room.winner || room.isDraw

  function handleCellClick(row: number, col: number) {
    if (!isMyTurn) return
    onMove(room.id, row, col)
  }

  function myTurnLabel() {
    if (room.winner === myColor) return '胜利'
    if (room.winner && room.winner !== myColor) return '败局'
    if (room.isDraw) return '平局'
    return isMyTurn ? '执子' : '等待'
  }

  if (opponentLeft) {
    return (
      <div className="opponent-left-screen">
        <div className="opponent-left-card">
          <span className="icon">🍂</span>
          <h2>对手已离开</h2>
          <p>对方断开了连接，对局终止</p>
          <button className="btn btn-primary" onClick={onLeave}>返回大厅</button>
        </div>
      </div>
    )
  }

  if (!room.gameStarted) {
    return (
      <div className="waiting-room">
        <div className="waiting-room-card">
          <div className="pulse-dots">
            <span /><span /><span />
          </div>
          <h2>等待对手加入</h2>
          <div className="room-code-display">
            <span>{room.id}</span>
          </div>
          <p className="hint">将上方房间号发送给好友</p>
          <button className="btn btn-outline" onClick={onLeave}>取消</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-room">
      <div className="game-header">
        <div className="player-info">
          <span className={`stone-icon ${myColor === BLACK ? 'black' : 'white'}`} />
          <span className="player-name">{me?.name || '我'}</span>
          <span className={`turn-indicator ${!isMyTurn || isGameOver ? 'idle' : ''}`}>
            {myTurnLabel()}
          </span>
        </div>
        <span className="room-code-badge">{room.id}</span>
        <div className="player-info">
          <span className={`stone-icon ${myColor === BLACK ? 'white' : 'black'}`} />
          <span className="player-name">{opponentName}</span>
          <span className={`turn-indicator ${isMyTurn || isGameOver ? 'idle' : ''}`}>
            {isGameOver ? (room.winner === (myColor === BLACK ? WHITE : BLACK) ? '胜利' : room.isDraw ? '平局' : '败局') : '执子'}
          </span>
        </div>
      </div>

      {isGameOver && (
        <div className="game-result-overlay">
          <div className="game-result-card">
            {room.winner === myColor && <span className="result-emoji">🏆</span>}
            {room.winner !== null && room.winner !== myColor && <span className="result-emoji">🌊</span>}
            {room.isDraw && <span className="result-emoji">🤝</span>}
            {room.winner === myColor && <h2>胜</h2>}
            {room.winner !== null && room.winner !== myColor && <h2>负</h2>}
            {room.isDraw && <h2>平</h2>}
            <button className="btn btn-primary" onClick={onLeave}>返回大厅</button>
          </div>
        </div>
      )}

      <div className="board-container">
        <Board
          board={room.board}
          currentPlayer={room.currentPlayer}
          lastMove={room.lastMove}
          winner={room.winner}
          disabled={!isMyTurn}
          onCellClick={handleCellClick}
        />
      </div>

      <div className="game-actions">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onUndo(room.id)}
          disabled={room.moves.length === 0 || isGameOver || undoPending}
        >
          ↩ 悔棋
        </button>
        <button className="btn btn-outline btn-sm btn-danger" onClick={onLeave}>
          ✕ 离开
        </button>
      </div>

      {undoPending && (
        <div className="undo-notification">
          已发送悔棋请求
        </div>
      )}

      {undoRequested && (
        <div className="undo-dialog-overlay">
          <div className="undo-dialog">
            <span className="dialog-icon">📜</span>
            <p>对方请求悔棋</p>
            <p className="dialog-hint">是否同意撤回上一步？</p>
            <div className="undo-dialog-buttons">
              <button className="btn btn-primary" onClick={() => onRespondUndo(room.id, true)}>
                同意
              </button>
              <button className="btn btn-outline" onClick={() => onRespondUndo(room.id, false)}>
                拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
