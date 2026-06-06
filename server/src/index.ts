import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { EMPTY, BLACK, WHITE, type Player, type Position, type Room } from '../../shared/types.js'
import { makeMove, checkWin, isBoardFull, getOpponent } from './game.js'
import { getAIMove } from './ai.js'
import { RoomManager } from './room.js'

const app = express()
app.use(cors())

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(__dirname, '../../client/dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

const roomManager = new RoomManager()

function broadcastRoom(roomId: string, room: Room) {
  io.to(roomId).emit('room:update', room)
}

function scheduleAIMove(roomId: string, room: Room) {
  if (room.gameMode !== 'pve' || room.winner || room.isDraw) return

  setTimeout(() => {
    const currentRoom = roomManager.getRoom(roomId)
    if (!currentRoom || currentRoom.winner || currentRoom.isDraw) return
    if (currentRoom.currentPlayer !== WHITE) return

    const aiMove = getAIMove(currentRoom.board, WHITE)
    if (!aiMove) return

    makeMove(currentRoom.board, aiMove.row, aiMove.col, WHITE)
    currentRoom.lastMove = aiMove
    currentRoom.moves.push(aiMove)

    if (checkWin(currentRoom.board, aiMove.row, aiMove.col)) {
      currentRoom.winner = WHITE
    } else if (isBoardFull(currentRoom.board)) {
      currentRoom.isDraw = true
    } else {
      currentRoom.currentPlayer = BLACK
    }

    broadcastRoom(roomId, currentRoom)
  }, 500)
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ mode }: { mode: 'pvp' | 'pve' }) => {
    const { roomId, room } = roomManager.createRoom(socket.id, mode)
    socket.join(roomId)
    socket.emit('room:joined', { roomId, room, playerId: socket.id })
    broadcastRoom(roomId, room)

    if (mode === 'pve') {
      scheduleAIMove(roomId, room)
    }
  })

  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    const result = roomManager.joinRoom(roomId, socket.id)
    if (!result.success) {
      socket.emit('room:error', { message: result.error })
      return
    }
    socket.join(roomId)
    socket.emit('room:joined', { roomId, room: result.room, playerId: socket.id })
    broadcastRoom(roomId, result.room!)
  })

  socket.on('game:move', ({ roomId, row, col }: { roomId: string; row: number; col: number }) => {
    const room = roomManager.getRoom(roomId)
    if (!room || room.winner || room.isDraw) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player || player.color !== room.currentPlayer) return

    if (!makeMove(room.board, row, col, player.color)) return

    room.lastMove = { row, col }
    room.moves.push({ row, col })

    if (checkWin(room.board, row, col)) {
      room.winner = player.color
    } else if (isBoardFull(room.board)) {
      room.isDraw = true
    } else {
      room.currentPlayer = getOpponent(room.currentPlayer)
    }

    broadcastRoom(roomId, room)

    if (room.gameMode === 'pve' && !room.winner && !room.isDraw && room.currentPlayer === WHITE) {
      scheduleAIMove(roomId, room)
    }
  })

  socket.on('game:undo-request', ({ roomId }: { roomId: string }) => {
    const room = roomManager.getRoom(roomId)
    if (!room || room.moves.length === 0 || room.undoRequest) return

    const player = room.players.find(p => p.id === socket.id)
    if (!player) return

    const opponent = room.players.find(p => p.id !== socket.id)
    if (!opponent) return

    if (room.gameMode === 'pve') {
      room.board = resetBoardFromMoves(room.moves.slice(0, -2))
      room.moves = room.moves.slice(0, -2)
      room.lastMove = room.moves.length > 0 ? room.moves[room.moves.length - 1] : null
      room.currentPlayer = BLACK
      room.winner = null
      room.isDraw = false
      broadcastRoom(roomId, room)
      scheduleAIMove(roomId, room)
      return
    }

    room.undoRequest = { from: socket.id, to: opponent.id }
    io.to(opponent.id).emit('game:undo-requested', { from: player.name })
    socket.emit('game:undo-pending')
    broadcastRoom(roomId, room)
  })

  socket.on('game:undo-response', ({ roomId, accepted }: { roomId: string; accepted: boolean }) => {
    const room = roomManager.getRoom(roomId)
    if (!room || !room.undoRequest) return

    if (room.undoRequest.to !== socket.id) return

    if (accepted && room.moves.length >= 2) {
      room.board = resetBoardFromMoves(room.moves.slice(0, -2))
      room.moves = room.moves.slice(0, -2)
      room.lastMove = room.moves.length > 0 ? room.moves[room.moves.length - 1] : null
      room.currentPlayer = BLACK
      room.winner = null
      room.isDraw = false
    }

    room.undoRequest = null
    broadcastRoom(roomId, room)

    if (room.gameMode === 'pve' && !room.winner && !room.isDraw && room.currentPlayer === WHITE) {
      scheduleAIMove(roomId, room)
    }
  })

  socket.on('room:leave', () => {
    const roomId = roomManager.getPlayerRoom(socket.id)
    if (!roomId) return

    const room = roomManager.getRoom(roomId)
    if (room) {
      socket.leave(roomId)
      room.players = room.players.filter(p => p.id !== socket.id)
      if (room.players.length === 0) {
        roomManager.deleteRoom(roomId)
      } else {
        broadcastRoom(roomId, room)
      }
    }
    roomManager.removePlayer(socket.id)
  })

  socket.on('disconnect', () => {
    const room = roomManager.getRoomByPlayer(socket.id)
    if (room) {
      io.to(room.id).emit('room:opponent-left')
    }
    roomManager.removePlayer(socket.id)
  })
})

function resetBoardFromMoves(moves: Position[]) {
  const board = Array.from({ length: 15 }, () => Array(15).fill(EMPTY))
  let isBlackTurn = true
  for (const move of moves) {
    board[move.row][move.col] = isBlackTurn ? BLACK : WHITE
    isBlackTurn = !isBlackTurn
  }
  return board
}

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`⚫ 五子棋服务器运行在 http://localhost:${PORT}`)
})
