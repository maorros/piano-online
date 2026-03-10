import { useRef, useCallback, useState } from 'react'
import * as Tone from 'tone'
import { midiToNoteName } from '../types/midi'

export interface UseAudioReturn {
  isLoaded: boolean
  isLoading: false
  loadError: null
  loadAudio: () => void     // synchronous — safe to call then immediately play
  playNote: (midi: number, velocity: number) => void
  stopNote: (midi: number) => void
  setSustain: (value: number) => void
  setVolume: (db: number) => void
}

export function useAudio(): UseAudioReturn {
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const volumeNodeRef = useRef<Tone.Volume | null>(null)
  const sustainedNotesRef = useRef<Set<number>>(new Set())
  const sustainActiveRef = useRef(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const loadAudio = useCallback(() => {
    if (synthRef.current) return

    const volumeNode = new Tone.Volume(0).toDestination()
    volumeNodeRef.current = volumeNode

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 1.4,
        sustain: 0.08,
        release: 1.5,
      },
    }).connect(volumeNode)

    synth.maxPolyphony = 32
    synthRef.current = synth
    setIsLoaded(true)

    // Resume AudioContext from within this user-gesture call stack (fire-and-forget)
    void Tone.start()
  }, [])

  const playNote = useCallback((midi: number, velocity: number) => {
    const synth = synthRef.current
    if (!synth) return
    const note = midiToNoteName(midi)
    const normalizedVelocity = Math.max(0.01, velocity / 127)
    synth.triggerAttack(note, Tone.now(), normalizedVelocity)
  }, [])

  const stopNote = useCallback((midi: number) => {
    const synth = synthRef.current
    if (!synth) return

    if (sustainActiveRef.current) {
      sustainedNotesRef.current.add(midi)
      return
    }
    synth.triggerRelease(midiToNoteName(midi), Tone.now())
  }, [])

  const setSustain = useCallback((value: number) => {
    const synth = synthRef.current
    if (!synth) return

    const isDown = value >= 64
    sustainActiveRef.current = isDown

    if (!isDown) {
      sustainedNotesRef.current.forEach((midi) => {
        synth.triggerRelease(midiToNoteName(midi), Tone.now())
      })
      sustainedNotesRef.current.clear()
    }
  }, [])

  const setVolume = useCallback((db: number) => {
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = db
    }
  }, [])

  return {
    isLoaded,
    isLoading: false,
    loadError: null,
    loadAudio,
    playNote,
    stopNote,
    setSustain,
    setVolume,
  }
}
