import { useRef, useState, useCallback } from 'react'
import type { MidiEvent } from '../utils/exportMidi'

export interface RecordedEvent extends MidiEvent {
  source: 'local' | 'remote'
}

interface RecorderReturn {
  isRecording: boolean
  startRecording: () => void
  stopAndGetEvents: () => RecordedEvent[]
  recordEvent: (type: 'on' | 'off', midi: number, velocity: number, source: 'local' | 'remote') => void
}

export function useRecorder(): RecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const startTimeRef = useRef<number>(0)
  const eventsRef = useRef<RecordedEvent[]>([])

  const startRecording = useCallback(() => {
    eventsRef.current = []
    startTimeRef.current = performance.now()
    setIsRecording(true)
  }, [])

  const stopAndGetEvents = useCallback((): RecordedEvent[] => {
    setIsRecording(false)
    const events = eventsRef.current
    eventsRef.current = []
    return events
  }, [])

  const recordEvent = useCallback((
    type: 'on' | 'off',
    midi: number,
    velocity: number,
    source: 'local' | 'remote',
  ) => {
    if (!startTimeRef.current) return
    eventsRef.current.push({
      time: performance.now() - startTimeRef.current,
      type,
      midi,
      velocity,
      source,
    })
  }, [])

  return { isRecording, startRecording, stopAndGetEvents, recordEvent }
}
