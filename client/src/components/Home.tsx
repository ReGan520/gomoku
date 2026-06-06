import { useState } from 'react'

interface HomeProps {
  onCreateRoom: (mode: 'pvp' | 'pve') => void
  onJoinRoom: (roomId: string) => void
  error: string | null
  setError: (err: string | null) => void
}

export default function Home({ onCreateRoom, onJoinRoom, error, setError }: HomeProps) {
  const [roomCode, setRoomCode] = useState('')

  function handleJoin() {
    if (roomCode.length !== 4) {
      setError('请输入4位房间号')
      return
    }
    onJoinRoom(roomCode)
  }

  return (
    <div className="home">
      <div className="home-brand">
        <h1>五子棋</h1>
        <p className="subtitle">— 墨 韵 对 弈 —</p>
        <div className="ink-decoration">
          <span /><span /><span /><span />
        </div>
      </div>

      <div className="home-card">
        <div className="home-buttons">
          <button className="btn btn-primary" onClick={() => onCreateRoom('pvp')}>
            🏠 创建房间 · 双人对战
          </button>
          <button className="btn btn-secondary" onClick={() => onCreateRoom('pve')}>
            🤖 人机对弈
          </button>
        </div>

        <div className="divider">输入房间号加入</div>

        <div className="join-room">
          <input
            type="text"
            maxLength={4}
            placeholder="房 间 号"
            value={roomCode}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4)
              setRoomCode(val)
              setError(null)
            }}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button className="btn btn-outline" onClick={handleJoin}>
            加入
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}
      </div>
    </div>
  )
}
