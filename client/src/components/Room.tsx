import React, { useState, useCallback, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Piano } from './Piano/Piano'
import { useAudio } from '../hooks/useAudio'
import { useMidi } from '../hooks/useMidi'
import { useRoom } from '../hooks/useRoom'
import type { UserRole } from '../types/midi'

export const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const role = (searchParams.get('role') ?? 'student') as UserRole
  const myName = searchParams.get('name') ?? (role === 'teacher' ? 'Teacher' : 'Student')

  const audio = useAudio()
  const midi = useMidi()
  const room = useRoom()

  const [localActiveNotes, setLocalActiveNotes] = useState<Set<number>>(new Set())
  const [remoteActiveNotes, setRemoteActiveNotes] = useState<Set<number>>(new Set())
  const [volume, setVolume] = useState(0)  // dB
  const [hasInteracted, setHasInteracted] = useState(false)
  const [sustain, setSustain] = useState(false)
  const [pianoRange, setPianoRange] = useState({ start: 48, end: 96 })  // C3–C7 default

  const RANGE_PRESETS = [
    { label: '2 oct', start: 60, end: 84 },   // C4–C6
    { label: '3 oct', start: 48, end: 84 },   // C3–C6
    { label: '4 oct', start: 48, end: 96 },   // C3–C7
    { label: '5 oct', start: 36, end: 96 },   // C2–C7
    { label: 'Full',  start: 21, end: 108 },  // A0–C8
  ]

  const handleRangeChange = useCallback((start: number, end: number) => {
    setPianoRange({ start, end })
    room.emitRange(start, end)
  }, [room])

  // Load audio on first user interaction (synchronous — safe to call before playNote)
  const handleFirstInteraction = useCallback(() => {
    if (hasInteracted) return
    setHasInteracted(true)
    audio.loadAudio()
  }, [hasInteracted, audio])

  // Wire up volume control
  useEffect(() => {
    audio.setVolume(volume)
  }, [volume, audio])

  // ── Local note handlers ────────────────────────────────────────────
  const handleLocalNoteOn = useCallback((midi: number, velocity: number = 80) => {
    if (!audio.isLoaded) {
      audio.loadAudio()  // starts async loading; notes will be silent until loaded
    } else {
      audio.playNote(midi, velocity)
    }
    room.emitNoteOn(midi, velocity)
    setLocalActiveNotes((prev) => new Set(prev).add(midi))
  }, [audio, room])

  const handleLocalNoteOff = useCallback((midi: number) => {
    audio.stopNote(midi)  // sustain logic is handled inside useAudio
    room.emitNoteOff(midi)
    setLocalActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(midi)
      return next
    })
  }, [audio, room])

  const handleLocalSustain = useCallback((value: number) => {
    const isDown = value >= 64
    setSustain(isDown)
    audio.setSustain(value)  // sustain release handled inside useAudio
    room.emitSustain(value)
  }, [audio, room])

  // ── Remote note handlers ──────────────────────────────────────────
  const handleRemoteNoteOn = useCallback((note: number, velocity: number) => {
    audio.playNote(note, velocity)
    setRemoteActiveNotes((prev) => new Set(prev).add(note))
  }, [audio])

  const handleRemoteNoteOff = useCallback((note: number) => {
    audio.stopNote(note)
    setRemoteActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(note)
      return next
    })
  }, [audio])

  const handleRemoteSustain = useCallback((value: number) => {
    audio.setSustain(value)
  }, [audio])

  // ── Join room ────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    room.joinRoom(roomId, role, myName, {
      onRemoteNoteOn: handleRemoteNoteOn,
      onRemoteNoteOff: handleRemoteNoteOff,
      onRemoteSustain: handleRemoteSustain,
      onRemoteRange: (start, end) => setPianoRange({ start, end }),
    })
    return () => room.leaveRoom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role])

  // ── MIDI keyboard ────────────────────────────────────────────────
  useEffect(() => {
    midi.connect({
      onNoteOn: handleLocalNoteOn,
      onNoteOff: handleLocalNoteOff,
      onSustain: handleLocalSustain,
    })
    return () => midi.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update MIDI callbacks when they change (without re-requesting access)
  useEffect(() => {
    midi.updateCallbacks({
      onNoteOn: handleLocalNoteOn,
      onNoteOff: handleLocalNoteOff,
      onSustain: handleLocalSustain,
    })
  }, [handleLocalNoteOn, handleLocalNoteOff, handleLocalSustain, midi])

  // Keep remote callbacks fresh (fixes stale closure after audio loads)
  useEffect(() => {
    room.updateRemoteCallbacks({
      onRemoteNoteOn: handleRemoteNoteOn,
      onRemoteNoteOff: handleRemoteNoteOff,
      onRemoteSustain: handleRemoteSustain,
      onRemoteRange: (start, end) => setPianoRange({ start, end }),
    })
  }, [handleRemoteNoteOn, handleRemoteNoteOff, handleRemoteSustain, room])

  const remoteCount = room.remoteParticipants.length
  const remoteRole = role === 'teacher' ? 'student' : 'teacher'
  const remoteName = room.remoteParticipants[0]?.name ?? (remoteRole === 'teacher' ? 'Teacher' : 'Student')

  const teacherActiveNotes = role === 'teacher' ? localActiveNotes : remoteActiveNotes
  const studentActiveNotes = role === 'teacher' ? remoteActiveNotes : localActiveNotes

  return (
    <div
      className="min-h-screen flex flex-col"
      onClick={handleFirstInteraction}
    >
      {/* Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 py-3 flex flex-col gap-2">
        {/* Top row: room info left, status right */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white text-sm"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Room:</span>
              <span className="text-white font-mono font-bold text-sm tracking-wider">{roomId}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${role === 'teacher' ? 'text-blue-400' : 'text-green-400'}`}>
              <div className="w-2 h-2 rounded-full bg-current" />
              {myName}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className={`flex items-center gap-1.5 text-sm ${room.isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
              <div className={`w-2 h-2 rounded-full bg-current ${room.isConnected ? '' : 'animate-pulse'}`} />
              {room.isConnected
                ? remoteCount > 0
                  ? `${remoteName} connected`
                  : `Waiting for ${remoteRole}...`
                : 'Connecting...'}
            </div>

            {/* MIDI status */}
            {midi.isSupported && (
              <div className={`text-sm ${midi.isConnected && midi.devices.length > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                {midi.isConnected && midi.devices.length > 0
                  ? `MIDI: ${midi.devices[0].name}`
                  : 'No MIDI device'}
              </div>
            )}
          </div>
        </div>

        {/* Legend row */}
        <div className="flex items-center gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${role === 'teacher' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <span>{myName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${role === 'teacher' ? 'bg-green-500' : 'bg-blue-500'}`} />
            <span>{remoteName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-cyan-400" />
            <span>Both playing</span>
          </div>
          {sustain && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-yellow-500" />
              <span>Sustain</span>
            </div>
          )}
        </div>
      </div>

      {/* Join error */}
      {room.joinError && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 m-4 rounded-xl text-sm">
          {room.joinError}
        </div>
      )}

      {/* Audio loading banner */}
      {!hasInteracted && (
        <div className="bg-blue-900/90 border border-blue-600 text-blue-200 px-4 py-3 m-4 rounded-xl text-sm text-center">
          Tap anywhere to start audio
        </div>
      )}
      {hasInteracted && audio.isLoading && (
        <div className="bg-gray-800/60 text-gray-300 px-4 py-3 m-4 rounded-xl text-sm text-center animate-pulse">
          Loading piano samples... (first load ~5 sec)
        </div>
      )}

      {/* Piano */}
      <div className="flex-1 flex items-center px-2 pb-4">
        <Piano
          startMidi={pianoRange.start}
          endMidi={pianoRange.end}
          teacherActiveNotes={teacherActiveNotes}
          studentActiveNotes={studentActiveNotes}
          onNoteOn={(midi) => handleLocalNoteOn(midi)}
          onNoteOff={handleLocalNoteOff}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 px-4 py-3 flex items-center gap-6 flex-wrap">
        {/* Volume */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">Volume</span>
          <input
            type="range"
            min={-20}
            max={6}
            step={1}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-28 accent-blue-500"
          />
          <span className="text-gray-400 text-sm w-10">{volume}dB</span>
        </div>

        {/* Sustain indicator */}
        <div className={`text-sm px-3 py-1 rounded-lg ${sustain ? 'bg-yellow-600/30 text-yellow-300' : 'bg-gray-700 text-gray-500'}`}>
          Sustain {sustain ? 'ON' : 'OFF'}
        </div>

        {/* Range selector — teacher only */}
        {role === 'teacher' && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Range:</span>
            <div className="flex gap-1">
              {RANGE_PRESETS.map((preset) => {
                const active = pianoRange.start === preset.start && pianoRange.end === preset.end
                return (
                  <button
                    key={preset.label}
                    onClick={() => handleRangeChange(preset.start, preset.end)}
                    className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Share link */}
        {role === 'teacher' && roomId && (
          <button
            onClick={async () => {
              const link = `${window.location.origin}/room/${roomId}?role=student`
              await navigator.clipboard.writeText(link)
            }}
            className="text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg transition-colors"
          >
            Copy Student Link
          </button>
        )}

        {/* Branding */}
        <div className="ml-auto flex items-center gap-2">
          <img src="/ptp_logo_4.png" alt="PTP" className="h-7 w-auto" />
          <span className="text-gray-200 text-sm">Playing Through Playing</span>
          <span className="text-gray-300 text-sm">by Maor</span>
          <img src="/white_logo_transparent.png" alt="MR" className="h-5 w-auto" />
          <span className="text-gray-300 text-sm">Rosenberg</span>
        </div>
      </div>
    </div>
  )
}
