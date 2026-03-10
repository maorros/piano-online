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

// Salamander Grand Piano — 2 velocity layers stored in client/public/salamander/pp/ and ff/
// Keys = Tone.js note names, values = filenames on disk (Ds/Fs notation)
const SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3',
  C8: 'C8.mp3',
}

export function useAudio(): UseAudioReturn {
  const ppSamplerRef = useRef<Tone.Sampler | null>(null)
  const ffSamplerRef = useRef<Tone.Sampler | null>(null)
  const volumeNodeRef = useRef<Tone.Volume | null>(null)
  const sustainedNotesRef = useRef<Set<number>>(new Set())
  const sustainActiveRef = useRef(false)
  const noteSamplerRef = useRef<Map<number, Tone.Sampler>>(new Map())
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadAudio = useCallback(() => {
    if (ffSamplerRef.current) return

    void Tone.start()

    const volumeNode = new Tone.Volume(0).toDestination()
    volumeNodeRef.current = volumeNode

    setIsLoading(true)

    let loadedCount = 0
    const onload = () => {
      if (++loadedCount === 2) {
        setIsLoaded(true)
        setIsLoading(false)
      }
    }

    ppSamplerRef.current = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/salamander/pp/',
      onload,
    }).connect(volumeNode)

    ffSamplerRef.current = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/salamander/ff/',
      onload,
    }).connect(volumeNode)
  }, [])

  const playNote = useCallback((midi: number, velocity: number) => {
    if (!ppSamplerRef.current || !ffSamplerRef.current || !isLoaded) return
    const note = midiToNoteName(midi)
    const normalizedVelocity = Math.max(0.01, velocity / 127)
    const sampler = velocity < 64 ? ppSamplerRef.current : ffSamplerRef.current
    sampler.triggerAttack(note, Tone.now(), normalizedVelocity)
    noteSamplerRef.current.set(midi, sampler)
  }, [isLoaded])

  const stopNote = useCallback((midi: number) => {
    if (!isLoaded) return
    const sampler = noteSamplerRef.current.get(midi)
    if (!sampler) return

    if (sustainActiveRef.current) {
      sustainedNotesRef.current.add(midi)
      return
    }
    sampler.triggerRelease(midiToNoteName(midi), Tone.now())
    noteSamplerRef.current.delete(midi)
  }, [isLoaded])

  const setSustain = useCallback((value: number) => {
    if (!isLoaded) return

    const isDown = value >= 64
    sustainActiveRef.current = isDown

    if (!isDown) {
      sustainedNotesRef.current.forEach((midi) => {
        const sampler = noteSamplerRef.current.get(midi)
        if (sampler) {
          sampler.triggerRelease(midiToNoteName(midi), Tone.now())
          noteSamplerRef.current.delete(midi)
        }
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
