import { BLACK, WHITE, EMPTY, type Room, type Player, type Position } from '../shared/types'
import { createBoard, makeMove, checkWin, isBoardFull, getOpponent, resetBoardFromMoves } from './game'
import { getAIMove } from './ai'

const ADJS = ['快乐', '聪明', '勇敢', '帅气', '可爱', '酷酷', '萌萌', '淡定']
const NOUNS = ['棋手', '玩家', '大师', '新手', '高手', '少年', '少女', '骑士']

function generatePlayerName(): string {
  return `${ADJS[Math.floor(Math.random() * ADJS.length)]}${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`
}

interface ConnInfo {
  id: string
  name: string
  ws: WebSocket
}

export class GameRoomDO implements DurableObject {
  private room: Room | null = null
  private conns: ConnInfo[] = []

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/init') {
      const { mode } = await request.json() as { mode: 'pvp' | 'pve' }
      const roomId = url.searchParams.get('roomId')!
      this.room = {
        id: roomId,
        players: [],
        spectators: [],
        board: createBoard(),
        currentPlayer: BLACK,
        winner: null,
        isDraw: false,
        lastMove: null,
        gameStarted: mode === 'pve',
        moves: [],
        undoRequest: null,
        gameMode: mode,
      }
      if (mode === 'pve') {
        this.room.players.push({ id: 'ai-' + roomId, name: 'AI 对手', color: WHITE })
      }
      return new Response(JSON.stringify({ ok: true }))
    }

    if (url.pathname === '/ping') {
      if (!this.room) return new Response('not found', { status: 404 })
      return new Response('ok')
    }

    if (url.pathname.startsWith('/ws/')) {
      return this.handleWebSocket()
    }

    return new Response('not found', { status: 404 })
  }

  private async handleWebSocket(): Promise<Response> {
    if (!this.room) return new Response('room not found', { status: 404 })

    const pair = new WebSocketPair()
    const [client, server] = [pair[0], pair[1]]
    server.accept()

    const info: ConnInfo = { id: crypto.randomUUID(), name: generatePlayerName(), ws: server }
    this.conns.push(info)

    server.addEventListener('message', (event) => {
      try {
        this.handleMessage(info, JSON.parse(event.data as string))
      } catch {
        server.send(JSON.stringify({ type: 'error', message: '无效消息' }))
      }
    })

    server.addEventListener('close', () => {
      this.conns = this.conns.filter(c => c.id !== info.id)
      this.room!.players = this.room!.players.filter(p => p.id !== info.id && !p.id.startsWith('ai-'))
      this.room!.spectators = this.room!.spectators.filter(s => s.id !== info.id)
      for (const c of this.conns) {
        safeSend(c.ws, { type: 'opponent_left' })
      }
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  private handleMessage(conn: ConnInfo, msg: any) {
    if (!this.room) return

    switch (msg.type) {
      case 'join': {
        const alreadyPlayer = this.room.players.find(p => p.id === conn.id)
        if (alreadyPlayer) {
          safeSend(conn.ws, { type: 'room_state', room: this.room, playerId: conn.id })
          return
        }

        if (!this.room.gameStarted || this.room.players.length < 2) {
          const isBlack = this.room.players.length === 0 ||
            (this.room.gameMode === 'pve' && this.room.players.filter(p => !p.id.startsWith('ai-')).length === 0)
          this.room.players.push({
            id: conn.id,
            name: conn.name,
            color: isBlack ? BLACK : WHITE,
          })
          if (this.room.gameMode === 'pvp' && this.room.players.length === 2) {
            this.room.gameStarted = true
          }
        } else {
          this.room.spectators.push({ id: conn.id, name: conn.name })
        }

        safeSend(conn.ws, { type: 'room_state', room: this.room, playerId: conn.id })
        this.broadcastRoom()

        if (this.room.gameMode === 'pve' && this.room.players.some(p => p.id === conn.id)) {
          this.scheduleAI()
        }
        break
      }

      case 'move': {
        const player = this.room.players.find(p => p.id === conn.id)
        if (!player || player.color !== this.room.currentPlayer) return
        if (this.room.winner || this.room.isDraw) return

        const { row, col } = msg as { row: number; col: number }
        if (!makeMove(this.room.board, row, col, player.color)) return

        this.room.lastMove = { row, col }
        this.room.moves.push({ row, col })

        if (checkWin(this.room.board, row, col)) {
          this.room.winner = player.color
        } else if (isBoardFull(this.room.board)) {
          this.room.isDraw = true
        } else {
          this.room.currentPlayer = getOpponent(this.room.currentPlayer)
        }

        this.broadcastRoom()

        if (this.room.gameMode === 'pve' && !this.room.winner && !this.room.isDraw && this.room.currentPlayer === WHITE) {
          this.scheduleAI()
        }
        break
      }

      case 'undo_request': {
        if (!this.room || this.room.moves.length === 0 || this.room.undoRequest) return
        const player = this.room.players.find(p => p.id === conn.id)
        if (!player) return

        if (this.room.gameMode === 'pve') {
          const n = Math.min(2, this.room.moves.length)
          this.room.board = resetBoardFromMoves(this.room.moves.slice(0, -n))
          this.room.moves = this.room.moves.slice(0, -n)
          this.room.lastMove = this.room.moves.length > 0 ? this.room.moves[this.room.moves.length - 1] : null
          this.room.currentPlayer = BLACK
          this.room.winner = null
          this.room.isDraw = false
          this.broadcastRoom()
          this.scheduleAI()
          return
        }

        const opponent = this.room.players.find(p => p.id !== conn.id && !p.id.startsWith('ai-'))
        if (!opponent) return
        this.room.undoRequest = { from: conn.id, to: opponent.id }

        const oppConn = this.conns.find(c => c.id === opponent.id)
        if (oppConn) {
          safeSend(oppConn.ws, { type: 'undo_requested', from: player.name })
        }
        safeSend(conn.ws, { type: 'undo_pending' })
        break
      }

      case 'undo_response': {
        if (!this.room || !this.room.undoRequest) return
        if (this.room.undoRequest.to !== conn.id) return

        const { accepted } = msg as { accepted: boolean }
        if (accepted && this.room.moves.length >= 2) {
          this.room.board = resetBoardFromMoves(this.room.moves.slice(0, -2))
          this.room.moves = this.room.moves.slice(0, -2)
          this.room.lastMove = this.room.moves.length > 0 ? this.room.moves[this.room.moves.length - 1] : null
          this.room.currentPlayer = BLACK
          this.room.winner = null
          this.room.isDraw = false
        }

        this.room.undoRequest = null
        for (const c of this.conns) {
          safeSend(c.ws, { type: 'undo_resolved' })
        }
        this.broadcastRoom()

        if (this.room.gameMode === 'pve' && !this.room.winner && !this.room.isDraw && this.room.currentPlayer === WHITE) {
          this.scheduleAI()
        }
        break
      }

      case 'leave': {
        this.room.players = this.room.players.filter(p => p.id !== conn.id)
        const otherPlayer = this.room.players.find(p => !p.id.startsWith('ai-'))
        if (otherPlayer) {
          const otherConn = this.conns.find(c => c.id === otherPlayer.id)
          if (otherConn) safeSend(otherConn.ws, { type: 'opponent_left' })
        }
        this.conns = this.conns.filter(c => c.id !== conn.id)
        break
      }
    }
  }

  private scheduleAI() {
    if (!this.room || this.room.winner || this.room.isDraw) return
    setTimeout(async () => {
      if (!this.room || this.room.winner || this.room.isDraw) return
      if (this.room.currentPlayer !== WHITE) return

      const move = getAIMove(this.room.board, WHITE)
      if (!move) return

      makeMove(this.room.board, move.row, move.col, WHITE)
      this.room.lastMove = move
      this.room.moves.push(move)

      if (checkWin(this.room.board, move.row, move.col)) {
        this.room.winner = WHITE
      } else if (isBoardFull(this.room.board)) {
        this.room.isDraw = true
      } else {
        this.room.currentPlayer = BLACK
      }

      this.broadcastRoom()
    }, 500)
  }

  private broadcastRoom() {
    if (!this.room) return
    for (const c of this.conns) {
      safeSend(c.ws, { type: 'room_update', room: this.room })
    }
  }
}

function safeSend(ws: WebSocket, data: unknown) {
  try {
    ws.send(JSON.stringify(data))
  } catch {
    // ignore
  }
}
