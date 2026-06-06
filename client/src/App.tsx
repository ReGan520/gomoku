import { useState } from 'react'
import { useSocket } from './hooks/useSocket'
import Home from './components/Home'
import GameRoom from './components/GameRoom'

type View = 'home' | 'game'

export default function App() {
  const [view, setView] = useState<View>('home')
  const {
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
  } = useSocket()

  function handleCreateRoom(mode: 'pvp' | 'pve') {
    createRoom(mode)
    setView('game')
  }

  function handleJoinRoom(roomId: string) {
    joinRoom(roomId)
    setView('game')
  }

  function handleLeave() {
    leaveRoom()
    setView('home')
  }

  if (!connected) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>连接服务器中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {view === 'home' && (
        <Home
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          setError={setError}
        />
      )}
      {view === 'game' && room && (
        <GameRoom
          room={room}
          playerId={playerId}
          undoRequested={undoRequested}
          undoPending={undoPending}
          opponentLeft={opponentLeft}
          onMove={makeMove}
          onUndo={requestUndo}
          onRespondUndo={respondUndo}
          onLeave={handleLeave}
        />
      )}
      {view === 'game' && !room && (
        <div className="loading">
          <p>{error || '加入房间失败'}</p>
          <button className="btn btn-primary" onClick={handleLeave}>返回</button>
        </div>
      )}
    </div>
  )
}
