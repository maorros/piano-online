import { useRef, useCallback, useState } from 'react'

export interface MidiCallbacks {
  onNoteOn: (note: number, velocity: number) => void
  onNoteOff: (note: number) => void
  onSustain: (value: number) => void
}

export interface MidiDevice {
  id: string
  name: string
}

export interface UseMidiReturn {
  isSupported: boolean
  isConnected: boolean
  devices: MidiDevice[]
  connect: (callbacks: MidiCallbacks) => Promise<void>
  updateCallbacks: (callbacks: MidiCallbacks) => void
  disconnect: () => void
}

export function useMidi(): UseMidiReturn {
  const isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
  const [isConnected, setIsConnected] = useState(false)
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const callbacksRef = useRef<MidiCallbacks | null>(null)

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const callbacks = callbacksRef.current
    if (!callbacks || !event.data) return

    const [status, note, value] = Array.from(event.data)
    const command = status & 0xf0

    // Note On: 0x90, but velocity 0 = Note Off
    if (command === 0x90 && value > 0) {
      callbacks.onNoteOn(note, value)
    }
    // Note Off: 0x80, or Note On with velocity 0
    else if (command === 0x80 || (command === 0x90 && value === 0)) {
      callbacks.onNoteOff(note)
    }
    // Control Change: 0xB0
    else if (command === 0xb0) {
      // CC 64 = Sustain pedal
      if (note === 64) {
        callbacks.onSustain(value)
      }
    }
  }, [])

  const refreshDevices = useCallback((access: MIDIAccess) => {
    const inputList: MidiDevice[] = []
    access.inputs.forEach((input) => {
      inputList.push({ id: input.id, name: input.name ?? `MIDI Input ${input.id}` })
      input.onmidimessage = handleMidiMessage
    })
    setDevices(inputList)
  }, [handleMidiMessage])

  const connect = useCallback(async (callbacks: MidiCallbacks) => {
    if (!isSupported) {
      console.warn('Web MIDI API not supported in this browser.')
      return
    }

    callbacksRef.current = callbacks

    try {
      const access = await navigator.requestMIDIAccess({ sysex: false })
      midiAccessRef.current = access

      refreshDevices(access)
      setIsConnected(true)

      // Listen for device connect/disconnect
      access.onstatechange = () => {
        refreshDevices(access)
      }
    } catch (err) {
      console.error('MIDI access denied:', err)
      setIsConnected(false)
    }
  }, [isSupported, refreshDevices])

  // Update callbacks without re-requesting MIDI access
  const updateCallbacks = useCallback((callbacks: MidiCallbacks) => {
    callbacksRef.current = callbacks
  }, [])

  const disconnect = useCallback(() => {
    const access = midiAccessRef.current
    if (access) {
      access.inputs.forEach((input) => {
        input.onmidimessage = null
      })
      access.onstatechange = null
    }
    midiAccessRef.current = null
    callbacksRef.current = null
    setIsConnected(false)
    setDevices([])
  }, [])

  return { isSupported, isConnected, devices, connect, updateCallbacks, disconnect }
}
