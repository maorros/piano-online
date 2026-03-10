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
  C1: 'C1.mp3', Ds1: 'Ds1.mp3', Fs1: 'Fs1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', Ds2: 'Ds2.mp3', Fs2: 'Fs2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', Ds3: 'Ds3.mp3', Fs3: 'Fs3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', Ds4: 'Ds4.mp3', Fs4: 'Fs4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', Ds5: 'Ds5.mp3', Fs5: 'Fs5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', Ds6: 'Ds6.mp3', Fs6: 'Fs6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', Ds7: 'Ds7.mp3', Fs7: 'Fs7.mp3', A7: 'A7.mp3',
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
