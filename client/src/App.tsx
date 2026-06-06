import { useGame } from './hooks/useGame'
import Home from './components/Home'
import GameRoom from './components/GameRoom'

export default function App() {
  const {
    state,
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
  } = useGame()

  if (state === 'idle') {
    return (
      <div className="app">
        <Home
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          error={error}
          setError={setError}
        />
      </div>
    )
  }

  if (state === 'connecting') {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
          <p>连接中...</p>
        </div>
      </div>
    )
  }

  if (room) {
    return (
      <div className="app">
        <GameRoom
          room={room}
          playerId={playerId}
          undoRequested={undoRequested}
          undoPending={undoPending}
          opponentLeft={opponentLeft}
          onMove={makeMove}
          onUndo={requestUndo}
          onRespondUndo={respondUndo}
          onLeave={leaveRoom}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="loading">
        <p>{error || '出错了'}</p>
        <button className="btn btn-primary" onClick={leaveRoom}>返回</button>
      </div>
    </div>
  )
}
