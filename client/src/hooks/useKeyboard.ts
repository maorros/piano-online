import { useRef, useCallback } from 'react'

export const KEY_TO_MIDI: Record<string, number> = {
  // Lower octave whites (Z row) — C3–B3
  z: 48, x: 50, c: 52, v: 53, b: 55, n: 57, m: 59,
  // Lower octave blacks (A row)
  s: 49, d: 51, g: 54, h: 56, j: 58,
  // Upper octave whites (Q row) — C4–E5
  q: 60, w: 62, e: 64, r: 65, t: 67, y: 69, u: 71, i: 72, o: 74, p: 76,
  // Upper octave blacks (number row)
  '2': 61, '3': 63, '5': 66, '6': 68, '7': 70, '9': 73, '0': 75,
  // Extension whites ([ ] row) — F5, G5
  '[': 77, ']': 79,
  // Extension black (= row) — F#5
  '=': 78,
  // Redundant mappings (same notes as Q/2/W/3/E — no labels)
  ',': 60, 'l': 61, '.': 62, ';': 63, '/': 64,
}

// Inverted map: midi → key label (first-wins so Q-row labels take priority over redundant , l . ; /)
export const MIDI_TO_KEY: Map<number, string> = new Map()
for (const [key, midi] of Object.entries(KEY_TO_MIDI)) {
  if (!MIDI_TO_KEY.has(midi)) MIDI_TO_KEY.set(midi, key.toUpperCase())
}

interface KeyboardCallbacks {
  onNoteOn: (midi: number, velocity: number) => void
  onNoteOff: (midi: number) => void
}

export function useKeyboard() {
  const callbacksRef = useRef<KeyboardCallbacks | null>(null)
  const pressedKeys = useRef(new Set<string>())
  const handlersRef = useRef<{
    keydown: (e: KeyboardEvent) => void
    keyup: (e: KeyboardEvent) => void
  } | null>(null)

  const connect = useCallback((callbacks: KeyboardCallbacks) => {
    callbacksRef.current = callbacks

    const keydown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const key = e.key.toLowerCase()
      if (pressedKeys.current.has(key)) return  // prevent repeat
      const midi = KEY_TO_MIDI[key]
      if (midi === undefined) return
      pressedKeys.current.add(key)
      callbacksRef.current?.onNoteOn(midi, 80)
    }

    const keyup = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      pressedKeys.current.delete(key)
      const midi = KEY_TO_MIDI[key]
      if (midi === undefined) return
      callbacksRef.current?.onNoteOff(midi)
    }

    handlersRef.current = { keydown, keyup }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
  }, [])

  const disconnect = useCallback(() => {
    if (handlersRef.current) {
      window.removeEventListener('keydown', handlersRef.current.keydown)
      window.removeEventListener('keyup', handlersRef.current.keyup)
      handlersRef.current = null
    }
    pressedKeys.current.clear()
  }, [])

  const updateCallbacks = useCallback((callbacks: KeyboardCallbacks) => {
    callbacksRef.current = callbacks
  }, [])

  return { connect, disconnect, updateCallbacks }
}
