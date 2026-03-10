import React, { useCallback } from 'react'

interface PianoKeyProps {
  midi: number
  isBlack: boolean
  isLocalActive: boolean
  isRemoteActive: boolean
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  // Layout props passed from Piano
  leftPercent: number   // left offset as percentage of total white-key area
  widthPercent: number  // width as percentage
}

export const PianoKey: React.FC<PianoKeyProps> = ({
  midi,
  isBlack,
  isLocalActive,
  isRemoteActive,
  onNoteOn,
  onNoteOff,
  leftPercent,
  widthPercent,
}) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    onNoteOn(midi)
  }, [midi, onNoteOn])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    onNoteOff(midi)
  }, [midi, onNoteOff])

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    // Only fire if pointer was pressed
    if (e.buttons > 0) {
      onNoteOff(midi)
    }
  }, [midi, onNoteOff])

  // Color logic
  let bgColor: string
  if (isBlack) {
    if (isLocalActive && isRemoteActive) bgColor = '#7c3aed'        // purple - both
    else if (isLocalActive) bgColor = '#2563eb'                      // blue - local
    else if (isRemoteActive) bgColor = '#dc2626'                     // red - remote
    else bgColor = '#1f2937'                                         // dark gray - idle
  } else {
    if (isLocalActive && isRemoteActive) bgColor = '#c4b5fd'        // light purple
    else if (isLocalActive) bgColor = '#93c5fd'                     // light blue
    else if (isRemoteActive) bgColor = '#fca5a5'                    // light red
    else bgColor = '#ffffff'                                         // white - idle
  }

  const borderColor = isBlack ? 'transparent' : '#d1d5db'

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    backgroundColor: bgColor,
    borderColor,
    cursor: 'pointer',
    userSelect: 'none',
    touchAction: 'none',
    transition: 'background-color 30ms ease',
    boxSizing: 'border-box',
  }

  if (isBlack) {
    return (
      <div
        className="piano-key"
        style={{
          ...style,
          top: 0,
          height: '60%',
          zIndex: 2,
          borderRadius: '0 0 4px 4px',
          boxShadow: isLocalActive || isRemoteActive
            ? 'none'
            : '2px 4px 6px rgba(0,0,0,0.5)',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
    )
  }

  return (
    <div
      className="piano-key"
      style={{
        ...style,
        top: 0,
        height: '100%',
        zIndex: 1,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: '0 0 6px 6px',
        boxShadow: isLocalActive || isRemoteActive
          ? 'inset 0 -2px 4px rgba(0,0,0,0.1)'
          : 'inset 0 -4px 6px rgba(0,0,0,0.08)',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  )
}
