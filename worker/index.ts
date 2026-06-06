import { GameRoomDO } from './gameRoom'

export { GameRoomDO }

interface Env {
  GAME_ROOM: DurableObjectNamespace
  ASSETS: Fetcher
}

function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method
    const cors = (res: Response) => {
      res.headers.set('Access-Control-Allow-Origin', '*')
      return res
    }

    if (url.pathname === '/api/create-room' && method === 'POST') {
      const { mode } = await request.json() as { mode: 'pvp' | 'pve' }
      let roomId: string
      let doId: DurableObjectId
      let stub: DurableObjectStub

      do {
        roomId = generateRoomCode()
        doId = env.GAME_ROOM.idFromName(roomId)
        stub = env.GAME_ROOM.get(doId)
        try {
          const res = await stub.fetch('http://dummy/ping')
          if (res.ok) continue
        } catch { /* unused, ID is available */ }
        break
      } while (true)

      await stub.fetch('http://dummy/init?' + new URLSearchParams({ roomId }), {
        method: 'POST',
        body: JSON.stringify({ mode }),
      })

      return cors(new Response(JSON.stringify({ roomId }), {
        headers: { 'Content-Type': 'application/json' },
      }))
    }

    if (url.pathname === '/api/check-room' && method === 'GET') {
      const roomId = url.searchParams.get('roomId')
      if (!roomId || roomId.length !== 4) {
        return cors(new Response(JSON.stringify({ exists: false }), {
          headers: { 'Content-Type': 'application/json' },
        }))
      }

      try {
        const doId = env.GAME_ROOM.idFromName(roomId)
        const stub = env.GAME_ROOM.get(doId)
        const res = await stub.fetch('http://dummy/ping')
        return cors(new Response(JSON.stringify({ exists: res.ok }), {
          headers: { 'Content-Type': 'application/json' },
        }))
      } catch {
        return cors(new Response(JSON.stringify({ exists: false }), {
          headers: { 'Content-Type': 'application/json' },
        }))
      }
    }

    if (url.pathname.startsWith('/ws/')) {
      const roomId = url.pathname.split('/')[2]
      if (!roomId || roomId.length !== 4) {
        return new Response('invalid room', { status: 400 })
      }

      try {
        const doId = env.GAME_ROOM.idFromName(roomId)
        const stub = env.GAME_ROOM.get(doId)
        return stub.fetch(new Request(`http://dummy/ws/${roomId}`, request))
      } catch {
        return new Response('room not found', { status: 404 })
      }
    }

    return env.ASSETS.fetch(request)
  },
}
