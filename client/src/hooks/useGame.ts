import { useState, useRef, useCallback, useEffect } from 'react'
import type { Room } from '../../../shared/types'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8787'
const WS_BASE = import.meta.env.PROD ? '' : 'ws://localhost:8787'

type GameState = 'idle' | 'connecting' | 'waiting' | 'playing' | 'ended'

export function useGame() {
  const wsRef = useRef<WebSocket | null>(null)
  const [state, setState] = useState<GameState>('idle')
  const [room, setRoom] = useState<Room | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [roomId, setRoomId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [undoRequested, setUndoRequested] = useState<{ from: string } | null>(null)
  const [undoPending, setUndoPending] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)

  const connectWs = useCallback((rid: string) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.PROD ? window.location.host : 'localhost:8787'
    const wsUrl = `${proto}//${host}/ws/${rid}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join' }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'room_state':
            setRoom(msg.room)
            setPlayerId(msg.playerId)
            setState(msg.room.gameStarted && !msg.room.winner && !msg.room.isDraw ? 'playing' : 'waiting')
            break
          case 'room_update':
            setRoom(msg.room)
            if (msg.room.winner || msg.room.isDraw) {
              setState('ended')
            } else if (msg.room.gameStarted) {
              setState('playing')
            }
            break
          case 'undo_requested':
            setUndoRequested({ from: msg.from })
            break
          case 'undo_pending':
            setUndoPending(true)
            break
          case 'undo_resolved':
            setUndoPending(false)
            setUndoRequested(null)
            break
          case 'opponent_left':
            setOpponentLeft(true)
            break
          case 'error':
            setError(msg.message)
            break
        }
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      setState('idle')
    }

    wsRef.current = ws
  }, [])

  const createRoom = useCallback(async (mode: 'pvp' | 'pve') => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json()
      setRoomId(data.roomId)
      setState('connecting')
      connectWs(data.roomId)
    } catch {
      setError('创建房间失败')
    }
  }, [connectWs])

  const joinRoom = useCallback(async (rid: string) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/check-room?roomId=${rid}`)
      const data = await res.json()
      if (!data.exists) {
        setError('房间不存在')
        return
      }
      setRoomId(rid)
      setState('connecting')
      connectWs(rid)
    } catch {
      setError('加入房间失败')
    }
  }, [connectWs])

  const makeMove = useCallback((row: number, col: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'move', row, col }))
    }
  }, [])

  const requestUndo = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'undo_request' }))
    }
  }, [])

  const respondUndo = useCallback((accepted: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'undo_response', accepted }))
    }
    setUndoRequested(null)
    if (!accepted) setUndoPending(false)
  }, [])

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave' }))
      wsRef.current.close()
    }
    wsRef.current = null
    setRoom(null)
    setPlayerId('')
    setRoomId('')
    setState('idle')
    setError(null)
    setUndoRequested(null)
    setUndoPending(false)
    setOpponentLeft(false)
  }, [])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  return {
    state,
    room,
    playerId,
    roomId,
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
