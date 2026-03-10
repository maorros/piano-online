import React, { useMemo } from 'react'
import { PianoKey } from './PianoKey'
import { isBlackKey } from '../../types/midi'

interface PianoProps {
  startMidi?: number   // default 21 (A0)
  endMidi?: number     // default 108 (C8) — full 88 keys
  localActiveNotes: Set<number>
  remoteActiveNotes: Set<number>
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
}

interface KeyLayout {
  midi: number
  isBlack: boolean
  leftPercent: number
  widthPercent: number
}

/**
 * Compute piano key layout positions.
 * White keys are evenly spaced; black keys are positioned between whites.
 */
function computeLayout(startMidi: number, endMidi: number): KeyLayout[] {
  // Count white keys in range
  const allMidis: number[] = []
  for (let m = startMidi; m <= endMidi; m++) allMidis.push(m)

  const whiteMidis = allMidis.filter((m) => !isBlackKey(m))
  const totalWhites = whiteMidis.length
  const whiteWidth = 100 / totalWhites  // percent

  // Map each white midi to its index
  const whiteIndex = new Map<number, number>()
  whiteMidis.forEach((m, i) => whiteIndex.set(m, i))

  const layout: KeyLayout[] = []

  for (const midi of allMidis) {
    const black = isBlackKey(midi)
    if (!black) {
      const idx = whiteIndex.get(midi)!
      layout.push({
        midi,
        isBlack: false,
        leftPercent: idx * whiteWidth,
        widthPercent: whiteWidth,
      })
    } else {
      // Black key sits between the white key below it and the one above
      // Find surrounding white keys
      let leftWhiteMidi = midi - 1
      while (leftWhiteMidi >= startMidi && isBlackKey(leftWhiteMidi)) leftWhiteMidi--
      let rightWhiteMidi = midi + 1
      while (rightWhiteMidi <= endMidi && isBlackKey(rightWhiteMidi)) rightWhiteMidi++

      const leftIdx = whiteIndex.get(leftWhiteMidi) ?? -1
      const rightIdx = whiteIndex.get(rightWhiteMidi) ?? -1

      let centerPercent: number
      if (leftIdx >= 0 && rightIdx >= 0) {
        // Center between the two white keys
        centerPercent = ((leftIdx + rightIdx) / 2 + 0.5) * whiteWidth
      } else if (leftIdx >= 0) {
        centerPercent = (leftIdx + 1) * whiteWidth
      } else {
        centerPercent = rightIdx * whiteWidth
      }

      const blackWidth = whiteWidth * 0.65
      layout.push({
        midi,
        isBlack: true,
        leftPercent: centerPercent - blackWidth / 2,
        widthPercent: blackWidth,
      })
    }
  }

  return layout
}

export const Piano: React.FC<PianoProps> = ({
  startMidi = 21,
  endMidi = 108,
  localActiveNotes,
  remoteActiveNotes,
  onNoteOn,
  onNoteOff,
}) => {
  const layout = useMemo(() => computeLayout(startMidi, endMidi), [startMidi, endMidi])

  // Separate white and black keys so blacks render on top
  const whiteKeys = layout.filter((k) => !k.isBlack)
  const blackKeys = layout.filter((k) => k.isBlack)

  return (
    <div
      className="relative w-full overflow-x-auto"
      style={{
        overscrollBehaviorX: 'contain',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Minimum width so keys don't become too tiny on small screens */}
      <div
        className="relative"
        style={{
          minWidth: '640px',
          height: '160px',
          background: '#111827',
          borderRadius: '0 0 8px 8px',
          padding: '0 2px',
          boxSizing: 'border-box',
        }}
      >
        {/* Render white keys first (lower z-index) */}
        {whiteKeys.map((key) => (
          <PianoKey
            key={key.midi}
            midi={key.midi}
            isBlack={false}
            isLocalActive={localActiveNotes.has(key.midi)}
            isRemoteActive={remoteActiveNotes.has(key.midi)}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            leftPercent={key.leftPercent}
            widthPercent={key.widthPercent}
          />
        ))}
        {/* Render black keys on top */}
        {blackKeys.map((key) => (
          <PianoKey
            key={key.midi}
            midi={key.midi}
            isBlack={true}
            isLocalActive={localActiveNotes.has(key.midi)}
            isRemoteActive={remoteActiveNotes.has(key.midi)}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            leftPercent={key.leftPercent}
            widthPercent={key.widthPercent}
          />
        ))}
      </div>
    </div>
  )
}
