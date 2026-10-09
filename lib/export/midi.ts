import { buildSong, PPQ, type ExportMood, type TrackEvents } from "./song"
import { objectUrl, type ExportFile } from "./types"

function toVLQ(value: number): number[] {
  const bytes = [value & 0x7f]
  while ((value >>>= 7) > 0) bytes.unshift((value & 0x7f) | 0x80)
  return bytes
}

function writeUint32(data: number[], value: number): void {
  data.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff)
}

function tickFromPos(pos: number): number {
  return pos * (PPQ / 4)
}

function trackEventsToMidiNotes(track: TrackEvents): Array<{ tick: number; dur: number; pitch: number; velocity: number }> {
  return track.notes.map((n) => ({
    tick: tickFromPos(n.pos),
    dur: tickFromPos(n.dur),
    pitch: n.pitch,
    velocity: n.velocity,
  }))
}

function encodeChunk(events: Array<{ tick: number; bytes: number[] }>): Uint8Array {
  const sorted = [...events].sort((a, b) => a.tick - b.tick)

  let size = 4
  let sizeTick = 0
  for (const e of sorted) {
    size += toVLQ(e.tick - sizeTick).length + e.bytes.length
    sizeTick = e.tick
  }

  const data: number[] = []
  data.push(0x4d, 0x54, 0x72, 0x6b) // MTrk
  writeUint32(data, size)

  let lastTick = 0
  for (const e of sorted) {
    const delta = e.tick - lastTick
    lastTick = e.tick
    data.push(...toVLQ(delta), ...e.bytes)
  }
  data.push(0x00, 0xff, 0x2f, 0x00) // delta 0 + end-of-track

  return Uint8Array.from(data)
}

function asciiBytes(text: string): number[] {
  return [...text].map((c) => c.charCodeAt(0))
}

function buildTrackChunk(name: string, program: number, channel: number, notes: Array<{ tick: number; dur: number; pitch: number; velocity: number }>): Uint8Array {
  const events: Array<{ tick: number; bytes: number[] }> = []

  const nameBytes = asciiBytes(name)
  events.push({ tick: 0, bytes: [0xff, 0x03, nameBytes.length, ...nameBytes] })
  if (program >= 0) events.push({ tick: 0, bytes: [0xc0 | channel, program] })

  for (const note of notes) {
    events.push({ tick: note.tick, bytes: [0x90 | channel, note.pitch, note.velocity] })
    events.push({ tick: note.tick + note.dur, bytes: [0x80 | channel, note.pitch, 0] })
  }

  return encodeChunk(events)
}

function buildTempoTrack(tempo: number): Uint8Array {
  const uspq = Math.round(60000000 / tempo)
  const events: Array<{ tick: number; bytes: number[] }> = []
  const name = "Kawaii Studio"
  const nameBytes = asciiBytes(name)

  events.push({ tick: 0, bytes: [0xff, 0x03, nameBytes.length, ...nameBytes] })
  events.push({ tick: 0, bytes: [0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff] })
  events.push({ tick: 0, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8] })

  return encodeChunk(events)
}

function encodeSmf(tracks: Uint8Array[]): Uint8Array {
  const header = new Uint8Array(14)
  const view = new DataView(header.buffer)
  view.setUint32(0, 0x4d546864, false)
  view.setUint32(4, 6, false)
  view.setUint16(8, 1, false)
  view.setUint16(10, tracks.length, false)
  view.setUint16(12, PPQ, false)

  const total = header.length + tracks.reduce((acc, c) => acc + c.length, 0)
  const out = new Uint8Array(total)
  out.set(header, 0)
  let offset = header.length
  for (const c of tracks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function downloadFile(bytes: Uint8Array, name: string): ExportFile {
  const blob = new Blob([bytes as BlobPart], { type: "audio/midi" })
  return { name, url: objectUrl(blob) }
}

export function exportSongToMidi(tracks: TrackEvents[], tempo: number): Uint8Array {
  const chunks = [buildTempoTrack(tempo)]
  for (const track of tracks) {
    chunks.push(buildTrackChunk(track.track.name, track.track.program, track.track.channel, trackEventsToMidiNotes(track)))
  }
  return encodeSmf(chunks)
}

export function exportMidiFiles(mood: ExportMood, tempo: number): Promise<ExportFile[]> {
  const tracks = buildSong(mood)
  const files: ExportFile[] = []

  files.push(downloadFile(exportSongToMidi(tracks, tempo), "Kawaii Studio.mid"))

  for (const track of tracks) {
    files.push(downloadFile(exportSongToMidi([track], tempo), `Kawaii Studio - ${track.track.name}.mid`))
  }

  return Promise.resolve(files)
}