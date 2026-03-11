import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'
import path from 'path'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

interface RoomParticipant {
  socketId: string
  role: 'teacher' | 'student'
  name: string
}

// roomId → list of participants
const rooms = new Map<string, RoomParticipant[]>()

function getRoomInfo(roomId: string) {
  return rooms.get(roomId) ?? []
}

function removeFromRoom(socketId: string, roomId: string) {
  const participants = getRoomInfo(roomId)
  const updated = participants.filter((p) => p.socketId !== socketId)
  if (updated.length === 0) {
    rooms.delete(roomId)
  } else {
    rooms.set(roomId, updated)
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`[connect] ${socket.id}`)
  let currentRoomId: string | null = null

  socket.on('join-room', ({ roomId, role, name }: { roomId: string; role: 'teacher' | 'student'; name: string }) => {
    let participants = getRoomInfo(roomId)

    // If same role already exists, evict the old socket (handles reconnects/refreshes)
    const existingIdx = participants.findIndex((p) => p.role === role)
    if (existingIdx !== -1) {
      const old = participants[existingIdx]
      if (old.socketId !== socket.id) {
        io.sockets.sockets.get(old.socketId)?.disconnect()
        participants = participants.filter((p) => p.socketId !== old.socketId)
        rooms.set(roomId, participants)
        console.log(`[evict] ${old.socketId} (${role}) replaced by ${socket.id} in room ${roomId}`)
      }
    }

    currentRoomId = roomId
    socket.join(roomId)
    participants.push({ socketId: socket.id, role, name })
    rooms.set(roomId, participants)

    // Tell this socket who else is in the room
    const others = participants.filter((p) => p.socketId !== socket.id)
    socket.emit('room-joined', { roomId, role, participants: others })

    // Tell others a new user joined
    socket.to(roomId).emit('user-joined', { socketId: socket.id, role, name })

    console.log(`[join] ${socket.id} as ${role} (${name}) in room ${roomId} (${participants.length} participants)`)
  })

  // Relay MIDI events to other participants in the room
  socket.on('note-on', (data: { note: number; velocity: number }) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('remote-note-on', { ...data, clientId: socket.id })
  })

  socket.on('note-off', (data: { note: number }) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('remote-note-off', { ...data, clientId: socket.id })
  })

  socket.on('sustain', (data: { value: number }) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('remote-sustain', { ...data, clientId: socket.id })
  })

  socket.on('display-range', (data: { start: number; end: number }) => {
    if (!currentRoomId) return
    socket.to(currentRoomId).emit('remote-display-range', data)
  })

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    if (currentRoomId) {
      removeFromRoom(socket.id, currentRoomId)
      socket.to(currentRoomId).emit('user-left', { socketId: socket.id })
    }
  })
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

// Serve React client in production
const clientDist = path.join(__dirname, '../../client/dist')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

const PORT = process.env.PORT ?? 3001
httpServer.listen(PORT, () => {
  console.log(`Piano server running on http://localhost:${PORT}`)
})
