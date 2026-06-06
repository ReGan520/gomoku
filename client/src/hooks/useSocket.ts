import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Room } from '../../../shared/types'

const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:3001'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [undoRequested, setUndoRequested] = useState<{ from: string } | null>(null)
  const [undoPending, setUndoPending] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('room:joined', ({ roomId, room, playerId: pid }) => {
      setRoom(room)
      setPlayerId(pid)
      setError(null)
    })

    socket.on('room:update', (updatedRoom: Room) => {
      setRoom(updatedRoom)
    })

    socket.on('room:error', ({ message }) => {
      setError(message)
    })

    socket.on('room:opponent-left', () => {
      setOpponentLeft(true)
    })

    socket.on('game:undo-requested', ({ from }) => {
      setUndoRequested({ from })
    })

    socket.on('game:undo-pending', () => {
      setUndoPending(true)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const createRoom = useCallback((mode: 'pvp' | 'pve') => {
    socketRef.current?.emit('room:create', { mode })
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('room:join', { roomId })
  }, [])

  const makeMove = useCallback((roomId: string, row: number, col: number) => {
    socketRef.current?.emit('game:move', { roomId, row, col })
  }, [])

  const requestUndo = useCallback((roomId: string) => {
    socketRef.current?.emit('game:undo-request', { roomId })
  }, [])

  const respondUndo = useCallback((roomId: string, accepted: boolean) => {
    socketRef.current?.emit('game:undo-response', { roomId, accepted })
    setUndoRequested(null)
    if (!accepted) setUndoPending(false)
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave')
    setRoom(null)
    setOpponentLeft(false)
    setUndoRequested(null)
    setUndoPending(false)
    setError(null)
  }, [])

  return {
    connected,
    room,
    playerId,
    error,
    undoRequested,
    undoPending,
    opponentLeft,
    createRoom,
    joinRoom,
    makeMove,
    requestUndo,
    respondUndo,
    leaveRoom,
    setError,
  }
}
