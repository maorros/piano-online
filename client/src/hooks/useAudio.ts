import { useRef, useCallback, useState } from 'react'
import * as Tone from 'tone'
import { midiToNoteName } from '../types/midi'

export interface UseAudioReturn {
  isLoaded: boolean
  isLoading: boolean
  loadError: null
  loadAudio: () => void
  playNote: (midi: number, velocity: number) => void
  stopNote: (midi: number) => void
  setSustain: (value: number) => void
  setVolume: (db: number) => void
}

// Salamander Grand Piano samples (hosted by Tone.js team)
const SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3', Eb1: 'Eb1.mp3', Gb1: 'Gb1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', Eb2: 'Eb2.mp3', Gb2: 'Gb2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', Eb3: 'Eb3.mp3', Gb3: 'Gb3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', Eb4: 'Eb4.mp3', Gb4: 'Gb4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', Eb5: 'Eb5.mp3', Gb5: 'Gb5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', Eb6: 'Eb6.mp3', Gb6: 'Gb6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', Eb7: 'Eb7.mp3', Gb7: 'Gb7.mp3', A7: 'A7.mp3',
  C8: 'C8.mp3',
}

export function useAudio(): UseAudioReturn {
  const samplerRef = useRef<Tone.Sampler | null>(null)
  const volumeNodeRef = useRef<Tone.Volume | null>(null)
  const sustainedNotesRef = useRef<Set<number>>(new Set())
  const sustainActiveRef = useRef(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadAudio = useCallback(() => {
    if (samplerRef.current) return

    void Tone.start()

    const volumeNode = new Tone.Volume(0).toDestination()
    volumeNodeRef.current = volumeNode

    setIsLoading(true)

    const sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
      onload: () => {
        setIsLoaded(true)
        setIsLoading(false)
      },
    }).connect(volumeNode)

    samplerRef.current = sampler
  }, [])

  const playNote = useCallback((midi: number, velocity: number) => {
    if (!samplerRef.current || !isLoaded) return
    const note = midiToNoteName(midi)
    const normalizedVelocity = Math.max(0.01, velocity / 127)
    samplerRef.current.triggerAttack(note, Tone.now(), normalizedVelocity)
  }, [isLoaded])

  const stopNote = useCallback((midi: number) => {
    if (!samplerRef.current || !isLoaded) return

    if (sustainActiveRef.current) {
      sustainedNotesRef.current.add(midi)
      return
    }
    samplerRef.current.triggerRelease(midiToNoteName(midi), Tone.now())
  }, [isLoaded])

  const setSustain = useCallback((value: number) => {
    if (!samplerRef.current || !isLoaded) return

    const isDown = value >= 64
    sustainActiveRef.current = isDown

    if (!isDown) {
      sustainedNotesRef.current.forEach((midi) => {
        samplerRef.current!.triggerRelease(midiToNoteName(midi), Tone.now())
      })
      sustainedNotesRef.current.clear()
    }
  }, [isLoaded])

  const setVolume = useCallback((db: number) => {
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = db
    }
  }, [])

  return {
    isLoaded,
    isLoading,
    loadError: null,
    loadAudio,
    playNote,
    stopNote,
    setSustain,
    setVolume,
  }
}
