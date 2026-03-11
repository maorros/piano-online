import React, { useCallback } from 'react'

interface PianoKeyProps {
  midi: number
  isBlack: boolean
  isTeacherActive: boolean
  isStudentActive: boolean
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  // Layout props passed from Piano
  leftPercent: number   // left offset as percentage of total white-key area
  widthPercent: number  // width as percentage
}

export const PianoKey: React.FC<PianoKeyProps> = ({
  midi,
  isBlack,
  isTeacherActive,
  isStudentActive,
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

  // Color logic: teacher = blue, student = green, both = teal
  let bgColor: string
  if (isBlack) {
    if (isTeacherActive && isStudentActive) bgColor = '#0891b2'     // teal - both
    else if (isTeacherActive) bgColor = '#2563eb'                   // blue - teacher
    else if (isStudentActive) bgColor = '#16a34a'                   // green - student
    else bgColor = '#1f2937'                                        // dark gray - idle
  } else {
    if (isTeacherActive && isStudentActive) bgColor = '#67e8f9'     // light teal
    else if (isTeacherActive) bgColor = '#93c5fd'                   // light blue
    else if (isStudentActive) bgColor = '#86efac'                   // light green
    else bgColor = '#ffffff'                                        // white - idle
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
          boxShadow: isTeacherActive || isStudentActive
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
        boxShadow: isTeacherActive || isStudentActive
          ? 'inset 0 -2px 4px rgba(0,0,0,0.1)'
          : 'inset 0 -4px 6px rgba(0,0,0,0.08)',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  )
}
