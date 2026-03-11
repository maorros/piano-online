export type UserRole = 'teacher' | 'student'

export interface NoteOnEvent {
  note: number    // MIDI note number 0-127
  velocity: number // 0-127
}

export interface NoteOffEvent {
  note: number
}

export interface SustainEvent {
  value: number   // 0-127 (64+ = sustain on)
}

export interface RemoteNoteOnEvent extends NoteOnEvent {
  clientId: string
}

export interface RemoteNoteOffEvent extends NoteOffEvent {
  clientId: string
}

export interface RemoteSustainEvent extends SustainEvent {
  clientId: string
}

export interface RoomParticipant {
  socketId: string
  role: UserRole
  name: string
}

// MIDI note number → note name helper
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function isBlackKey(midi: number): boolean {
  const semitone = midi % 12
  return [1, 3, 6, 8, 10].includes(semitone)
}
