import { BLACK, WHITE, EMPTY, type Room, type Player, type Board, type Position } from '../../shared/types.js'
import { createBoard } from './game.js'

function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function generatePlayerName(): string {
  const adjectives = ['快乐', '聪明', '勇敢', '帅气', '可爱', '酷酷', '萌萌', '淡定']
  const nouns = ['棋手', '玩家', '大师', '新手', '高手', '少年', '少女', '骑士']
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map()
  private playerRoomMap: Map<string, string> = new Map()

  createRoom(hostId: string, mode: 'pvp' | 'pve'): { roomId: string; room: Room } {
    let roomId: string
    do {
      roomId = generateRoomCode()
    } while (this.rooms.has(roomId))

    const room: Room = {
      id: roomId,
      players: [{ id: hostId, name: generatePlayerName(), color: BLACK }],
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

    this.rooms.set(roomId, room)
    this.playerRoomMap.set(hostId, roomId)

    if (mode === 'pve') {
      const aiId = 'ai-' + roomId
      room.players.push({ id: aiId, name: 'AI 对手', color: WHITE })
    }

    return { roomId, room }
  }

  joinRoom(roomId: string, playerId: string): { success: boolean; room?: Room; error?: string } {
    const room = this.rooms.get(roomId)
    if (!room) return { success: false, error: '房间不存在' }
    if (room.gameMode === 'pve') return { success: false, error: '人机房间不能加入' }
    if (room.gameStarted) return { success: false, error: '游戏已开始' }
    if (room.players.length >= 2) return { success: false, error: '房间已满' }

    this.playerRoomMap.set(playerId, roomId)
    room.players.push({ id: playerId, name: generatePlayerName(), color: WHITE })
    room.gameStarted = true
    return { success: true, room }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRoomMap.get(playerId)
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(playerId)
    return roomId ? this.rooms.get(roomId) : undefined
  }

  removePlayer(playerId: string): void {
    const roomId = this.playerRoomMap.get(playerId)
    if (!roomId) return
    const room = this.rooms.get(roomId)
    if (room) {
      room.players = room.players.filter(p => p.id !== playerId)
      if (room.players.length === 0) {
        this.rooms.delete(roomId)
      }
    }
    this.playerRoomMap.delete(playerId)
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId)
  }
}
