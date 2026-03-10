import { useRef, useCallback, useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import type { UserRole, RemoteNoteOnEvent, RemoteNoteOffEvent, RemoteSustainEvent, RoomParticipant } from '../types/midi'


export interface RemoteCallbacks {
  onRemoteNoteOn: (note: number, velocity: number) => void
  onRemoteNoteOff: (note: number) => void
  onRemoteSustain: (value: number) => void
  onRemoteRange?: (start: number, end: number) => void
}

export interface UseRoomReturn {
  isConnected: boolean
  roomId: string | null
  remoteParticipants: RoomParticipant[]
  joinError: string | null
  joinRoom: (roomId: string, role: UserRole, callbacks: RemoteCallbacks) => void
  updateRemoteCallbacks: (callbacks: RemoteCallbacks) => void
  leaveRoom: () => void
  emitNoteOn: (note: number, velocity: number) => void
  emitNoteOff: (note: number) => void
  emitSustain: (value: number) => void
  emitRange: (start: number, end: number) => void
}

export function useRoom(): UseRoomReturn {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState<RoomParticipant[]>([])
  const [joinError, setJoinError] = useState<string | null>(null)
  const remoteCallbacksRef = useRef<RemoteCallbacks | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  const joinRoom = useCallback((targetRoomId: string, role: UserRole, callbacks: RemoteCallbacks) => {
    remoteCallbacksRef.current = callbacks
    setJoinError(null)

    // Reuse existing socket or create new one
    if (!socketRef.current) {
      socketRef.current = io({
        transports: ['websocket', 'polling'],
      })
    }

    const socket = socketRef.current

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join-room', { roomId: targetRoomId, role })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('room-joined', ({ participants }: { roomId: string; role: UserRole; participants: RoomParticipant[] }) => {
      setRoomId(targetRoomId)
      setRemoteParticipants(participants)
    })

    socket.on('join-error', ({ message }: { message: string }) => {
      setJoinError(message)
    })

    socket.on('user-joined', (participant: RoomParticipant) => {
      setRemoteParticipants((prev) => {
        const exists = prev.find((p) => p.socketId === participant.socketId)
        if (exists) return prev
        return [...prev, participant]
      })
    })

    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      setRemoteParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
    })

    socket.on('remote-note-on', (event: RemoteNoteOnEvent) => {
      remoteCallbacksRef.current?.onRemoteNoteOn(event.note, event.velocity)
    })

    socket.on('remote-note-off', (event: RemoteNoteOffEvent) => {
      remoteCallbacksRef.current?.onRemoteNoteOff(event.note)
    })

    socket.on('remote-sustain', (event: RemoteSustainEvent) => {
      remoteCallbacksRef.current?.onRemoteSustain(event.value)
    })

    socket.on('remote-display-range', ({ start, end }: { start: number; end: number }) => {
      remoteCallbacksRef.current?.onRemoteRange?.(start, end)
    })

    // If already connected, emit join directly
    if (socket.connected) {
      setIsConnected(true)
      socket.emit('join-room', { roomId: targetRoomId, role })
    }
  }, [])

  const updateRemoteCallbacks = useCallback((callbacks: RemoteCallbacks) => {
    remoteCallbacksRef.current = callbacks
  }, [])

  const leaveRoom = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
    setIsConnected(false)
    setRoomId(null)
    setRemoteParticipants([])
    remoteCallbacksRef.current = null
  }, [])

  const emitNoteOn = useCallback((note: number, velocity: number) => {
    socketRef.current?.emit('note-on', { note, velocity })
  }, [])

  const emitNoteOff = useCallback((note: number) => {
    socketRef.current?.emit('note-off', { note })
  }, [])

  const emitSustain = useCallback((value: number) => {
    socketRef.current?.emit('sustain', { value })
  }, [])

  const emitRange = useCallback((start: number, end: number) => {
    socketRef.current?.emit('display-range', { start, end })
  }, [])

  return {
    isConnected,
    roomId,
    remoteParticipants,
    joinError,
    joinRoom,
    updateRemoteCallbacks,
    leaveRoom,
    emitNoteOn,
    emitNoteOff,
    emitSustain,
    emitRange,
  }
}
