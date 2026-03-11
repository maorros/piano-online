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

// Salamander Grand Piano — 3 velocity layers stored in client/public/salamander/p/, mp/, and mf/
// Keys = Tone.js note names, values = filenames on disk (Ds/Fs notation)
// Crossfade zones: 0-40 pure p | 40-64 p→mp | 64-90 mp→mf | 90-127 pure mf
const XFADE_P_MID = 40    // pure p below this
const XFADE_P_END = 64    // p fades out, mp fades in, by this point
const XFADE_MF_START = 64 // mp fades out, mf fades in, from this point
const XFADE_MF_END = 90   // pure mf above this

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
  const pSamplerRef  = useRef<Tone.Sampler | null>(null)
  const mpSamplerRef = useRef<Tone.Sampler | null>(null)
  const mfSamplerRef = useRef<Tone.Sampler | null>(null)
  const volumeNodeRef = useRef<Tone.Volume | null>(null)
  const sustainedNotesRef = useRef<Set<number>>(new Set())
  const sustainActiveRef = useRef(false)
  const pActiveRef  = useRef<Set<number>>(new Set())
  const mpActiveRef = useRef<Set<number>>(new Set())
  const mfActiveRef = useRef<Set<number>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const loadAudio = useCallback(() => {
    if (pSamplerRef.current) return

    void Tone.start()

    const volumeNode = new Tone.Volume(0).toDestination()
    volumeNodeRef.current = volumeNode

    setIsLoading(true)

    let loadedCount = 0
    const onload = () => {
      if (++loadedCount === 3) {
        setIsLoaded(true)
        setIsLoading(false)
      }
    }

    pSamplerRef.current = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/salamander/p/',
      onload,
    }).connect(volumeNode)

    mpSamplerRef.current = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/salamander/mp/',
      onload,
    }).connect(volumeNode)

    mfSamplerRef.current = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: '/salamander/mf/',
      onload,
    }).connect(volumeNode)
  }, [])

  const playNote = useCallback((midi: number, velocity: number) => {
    if (!pSamplerRef.current || !mpSamplerRef.current || !mfSamplerRef.current || !isLoaded) return
    const note = midiToNoteName(midi)
    const base = Math.pow(Math.max(0.01, velocity / 127), 0.4)

    let pGain = 0, mpGain = 0, mfGain = 0

    if (velocity <= XFADE_P_MID) {
      pGain = 1
    } else if (velocity <= XFADE_P_END) {
      const t = (velocity - XFADE_P_MID) / (XFADE_P_END - XFADE_P_MID)
      pGain = 1 - t
      mpGain = t
    } else if (velocity <= XFADE_MF_END) {
      const t = (velocity - XFADE_MF_START) / (XFADE_MF_END - XFADE_MF_START)
      mpGain = 1 - t
      mfGain = t
    } else {
      mfGain = 1
    }

    if (pGain > 0.01) {
      pSamplerRef.current.triggerAttack(note, Tone.now(), base * pGain)
      pActiveRef.current.add(midi)
    }
    if (mpGain > 0.01) {
      mpSamplerRef.current.triggerAttack(note, Tone.now(), base * mpGain)
      mpActiveRef.current.add(midi)
    }
    if (mfGain > 0.01) {
      mfSamplerRef.current.triggerAttack(note, Tone.now(), base * mfGain)
      mfActiveRef.current.add(midi)
    }
  }, [isLoaded])

  const stopNote = useCallback((midi: number) => {
    if (!isLoaded) return
    if (sustainActiveRef.current) {
      sustainedNotesRef.current.add(midi)
      return
    }
    const note = midiToNoteName(midi)
    if (pActiveRef.current.delete(midi))  pSamplerRef.current!.triggerRelease(note, Tone.now())
    if (mpActiveRef.current.delete(midi)) mpSamplerRef.current!.triggerRelease(note, Tone.now())
    if (mfActiveRef.current.delete(midi)) mfSamplerRef.current!.triggerRelease(note, Tone.now())
  }, [isLoaded])

  const setSustain = useCallback((value: number) => {
    if (!isLoaded) return

    const isDown = value >= 64
    sustainActiveRef.current = isDown

    if (!isDown) {
      sustainedNotesRef.current.forEach((midi) => {
        const note = midiToNoteName(midi)
        if (pActiveRef.current.delete(midi))  pSamplerRef.current!.triggerRelease(note, Tone.now())
        if (mpActiveRef.current.delete(midi)) mpSamplerRef.current!.triggerRelease(note, Tone.now())
        if (mfActiveRef.current.delete(midi)) mfSamplerRef.current!.triggerRelease(note, Tone.now())
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
