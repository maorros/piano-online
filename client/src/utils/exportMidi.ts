export interface MidiEvent {
  time: number      // ms from recording start
  type: 'on' | 'off'
  midi: number
  velocity: number
}

const TICKS_PER_BEAT = 480
const MICROS_PER_BEAT = 500000  // 120 BPM

function msToTicks(ms: number): number {
  return Math.round((ms * TICKS_PER_BEAT * 1000) / MICROS_PER_BEAT)
}

function writeVarLen(value: number): number[] {
  if (value < 0x80) return [value]
  const bytes: number[] = []
  let v = value
  bytes.unshift(v & 0x7f)
  v >>= 7
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80)
    v >>= 7
  }
  return bytes
}

function buildTrack(events: MidiEvent[], channel: number): number[] {
  const sorted = [...events].sort((a, b) => a.time - b.time)
  const trackData: number[] = []
  let lastTick = 0

  for (const ev of sorted) {
    const tick = msToTicks(ev.time)
    const delta = Math.max(0, tick - lastTick)
    lastTick = tick
    trackData.push(...writeVarLen(delta))

    if (ev.type === 'on' && ev.velocity > 0) {
      trackData.push(0x90 | channel, ev.midi, ev.velocity)
    } else {
      trackData.push(0x80 | channel, ev.midi, 0)
    }
  }

  // End of track meta event
  trackData.push(0x00, 0xff, 0x2f, 0x00)

  return trackData
}

function uint32BE(n: number): number[] {
  return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function uint16BE(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff]
}

export function exportMidi(
  filename: string,
  localEvents: MidiEvent[],
  remoteEvents: MidiEvent[],
): void {
  const track1 = buildTrack(localEvents, 0)
  const track2 = buildTrack(remoteEvents, 1)

  // Tempo track (track 0): set tempo to 120 BPM
  const tempoTrack: number[] = [
    0x00, 0xff, 0x51, 0x03,
    (MICROS_PER_BEAT >> 16) & 0xff,
    (MICROS_PER_BEAT >> 8) & 0xff,
    MICROS_PER_BEAT & 0xff,
    0x00, 0xff, 0x2f, 0x00,  // end of track
  ]

  const header = [
    // MThd
    0x4d, 0x54, 0x68, 0x64,
    ...uint32BE(6),         // chunk length
    ...uint16BE(1),         // format 1
    ...uint16BE(3),         // 3 tracks (tempo + local + remote)
    ...uint16BE(TICKS_PER_BEAT),
  ]

  function mtrk(data: number[]): number[] {
    return [0x4d, 0x54, 0x72, 0x6b, ...uint32BE(data.length), ...data]
  }

  const bytes = new Uint8Array([
    ...header,
    ...mtrk(tempoTrack),
    ...mtrk(track1),
    ...mtrk(track2),
  ])

  const blob = new Blob([bytes], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`
  a.click()
  URL.revokeObjectURL(url)
}
