export type ExportMood = "aggressive" | "balanced" | "mellow"

export const EXPORT_BARS = 16
export const EXPORT_SAMPLE_RATE = 48000
export const EXPORT_BIT_DEPTH = 24
export const PPQ = 480

export interface ExportClip {
  start: number
  end: number
}

export interface ExportTrack {
  id: string
  name: string
  color: string
  seed: number
  density: number
  clips: ExportClip[]
  channel: number
  program: number
}

export const SONG_TRACKS: ExportTrack[] = [
  { id: "drums", name: "Drums", color: "var(--chart-1)", clips: [{ start: 0, end: EXPORT_BARS }], seed: 11, density: 0.85, channel: 9, program: 0 },
  { id: "bass", name: "Bass", color: "var(--chart-4)", clips: [{ start: 0, end: EXPORT_BARS }], seed: 23, density: 0.7, channel: 0, program: 38 },
  { id: "pad", name: "Synth Pad", color: "var(--chart-2)", clips: [{ start: 4, end: EXPORT_BARS }], seed: 37, density: 0.45, channel: 1, program: 91 },
  { id: "lead", name: "Lead", color: "var(--chart-5)", clips: [{ start: 0, end: EXPORT_BARS }], seed: 41, density: 0.9, channel: 2, program: 81 },
  { id: "vocal", name: "Vocal", color: "var(--chart-3)", clips: [{ start: 2, end: EXPORT_BARS }], seed: 53, density: 0.6, channel: 3, program: 54 },
]

const SCALES: Record<ExportMood, number[]> = {
  aggressive: [0, 2, 3, 5, 7, 8, 10],
  balanced: [0, 2, 4, 5, 7, 9, 10],
  mellow: [0, 3, 5, 7, 10],
}

const BASS_ROOT = 33 // A1
const BODY_ROOT = 45 // A2

export interface NoteEvent {
  pos: number
  dur: number
  pitch: number
  velocity: number
  type?: "kick" | "snare" | "hat" | "openHat"
}

export interface TrackEvents {
  track: ExportTrack
  notes: NoteEvent[]
}

// Deterministic PRNG, identical to the arrangement view so exports mirror the UI.
export function seededRandom(seed: number) {
  let t = seed
  return () => {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function isClipActive(track: ExportTrack, bar: number) {
  return track.clips.some((c) => bar >= c.start && bar < c.end)
}

function sixteenthsPerBar() {
  return 16
}

export function buildSong(mood: ExportMood, bars: number = EXPORT_BARS): TrackEvents[] {
  const scale = SCALES[mood]

  return SONG_TRACKS.map((track) => {
    const rand = seededRandom(track.seed)
    const notes: NoteEvent[] = []
    const sub = sixteenthsPerBar()

    for (let bar = 0; bar < bars; bar++) {
      if (!isClipActive(track, bar)) continue

      switch (track.id) {
        case "drums": {
          const base = bar * sub
          notes.push({ pos: base, dur: 2, pitch: 36, velocity: 110 + ((rand() * 20) | 0), type: "kick" })
          notes.push({ pos: base + 8, dur: 2, pitch: 36, velocity: 105 + ((rand() * 20) | 0), type: "kick" })
          if (rand() < track.density * 0.5) {
            notes.push({ pos: base + 11, dur: 2, pitch: 36, velocity: 95, type: "kick" })
          }
          notes.push({ pos: base + 4, dur: 2, pitch: 38, velocity: 100 + ((rand() * 15) | 0), type: "snare" })
          notes.push({ pos: base + 12, dur: 2, pitch: 38, velocity: 105 + ((rand() * 15) | 0), type: "snare" })
          for (let i = 0; i < 16; i += 2) {
            const open = i === 6 || i === 14
            notes.push({
              pos: base + i,
              dur: open ? 4 : 1,
              pitch: open ? 46 : 42,
              velocity: open ? 70 : 55 + ((rand() * 25) | 0),
              type: open ? "openHat" : "hat",
            })
          }
          break
        }
        case "bass": {
          for (let beat = 0; beat < 4; beat++) {
            if (rand() >= track.density) continue
            const degree = Math.floor(rand() * scale.length)
            notes.push({
              pos: bar * sub + beat * 4,
              dur: rand() < 0.6 ? 4 : 6,
              pitch: BASS_ROOT + scale[degree],
              velocity: 90 + ((rand() * 30) | 0),
            })
          }
          break
        }
        case "pad": {
          const degree = Math.floor(rand() * Math.max(1, scale.length - 4))
          const base = bar * sub
          for (const offset of [0, 2, 4]) {
            notes.push({
              pos: base,
              dur: sub,
              pitch: BODY_ROOT + 12 + scale[degree + offset],
              velocity: 70 + ((rand() * 15) | 0),
            })
          }
          break
        }
        case "lead": {
          for (let i = 0; i < 8; i++) {
            if (rand() >= track.density * 0.85) continue
            const degree = Math.floor(rand() * scale.length)
            const octave = rand() < 0.3 ? 12 : rand() < 0.6 ? 24 : 0
            notes.push({
              pos: bar * sub + i * 2 + (rand() < 0.15 ? 1 : 0),
              dur: 2 + Math.round(rand() * 2),
              pitch: BODY_ROOT + scale[degree] + octave,
              velocity: 90 + ((rand() * 30) | 0),
            })
          }
          break
        }
        case "vocal": {
          if (rand() >= track.density) continue
          const degree = Math.floor(rand() * scale.length)
          notes.push({
            pos: bar * sub + Math.floor(rand() * 10),
            dur: 6 + Math.round(rand() * 6),
            pitch: BODY_ROOT + 12 + scale[degree],
            velocity: 85 + ((rand() * 15) | 0),
          })
          break
        }
      }
    }

    return { track, notes }
  })
}