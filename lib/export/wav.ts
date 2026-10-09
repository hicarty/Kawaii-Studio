import { buildSong, EXPORT_BARS, EXPORT_SAMPLE_RATE, type ExportMood, type NoteEvent, type TrackEvents } from "./song"
import { objectUrl, type ExportFile } from "./types"

interface RenderedStem {
  name: string
  buffer: AudioBuffer
}

function freqFromMidi(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12)
}

function sixteenthDur(tempo: number): number {
  return 60 / tempo / 4
}

function noteDuration(note: NoteEvent, tempo: number): number {
  return note.dur * sixteenthDur(tempo)
}

function totalSeconds(tempo: number, bars: number): number {
  return (bars * 4 * 60) / tempo
}

function makeNoiseBuffer(ctx: AudioContext | OfflineAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function gainEnv(
  ctx: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  t: number,
  dur: number,
  peak: number,
  attack: number,
  release: number,
) {
  const g = ctx.createGain()
  const end = t + dur
  const sustain = Math.max(t + attack, end - release)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
  g.gain.setValueAtTime(Math.max(peak, 0.0002), sustain)
  g.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, sustain + 0.001))
  g.connect(destination)
  return g
}

function scheduleDrums(ctx: AudioContext | OfflineAudioContext, noise: AudioBuffer, note: NoteEvent, t: number) {
  const vel = note.velocity / 127

  if (note.pitch === 36 || note.type === "kick") {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(115, t)
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    const g = gainEnv(ctx, ctx.destination, t, 0.28, vel * 0.9, 0.004, 0.24)
    osc.connect(g)
    osc.start(t)
    osc.stop(t + 0.32)
    return
  }

  if (note.pitch === 38 || note.type === "snare") {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 1800
    bp.Q.value = 0.75
    const g = gainEnv(ctx, ctx.destination, t, 0.2, vel * 0.9, 0.002, 0.18)
    src.connect(bp).connect(g)
    src.start(t)
    src.stop(t + 0.24)
    return
  }

  const open = note.pitch === 46
  const src = ctx.createBufferSource()
  src.buffer = noise
  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 7000
  const g = gainEnv(ctx, ctx.destination, t, open ? 0.25 : 0.05, vel * 0.55, 0.002, open ? 0.22 : 0.04)
  src.connect(hp).connect(g)
  src.start(t)
  src.stop(t + (open ? 0.28 : 0.08))
}

function scheduleBass(ctx: AudioContext | OfflineAudioContext, note: NoteEvent, t: number, tempo: number) {
  const vel = note.velocity / 127
  const freq = freqFromMidi(note.pitch)
  const dur = noteDuration(note, tempo)

  const osc = ctx.createOscillator()
  osc.type = "sawtooth"
  osc.frequency.value = freq
  osc.frequency.exponentialRampToValueAtTime(freq, t + dur)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.Q.value = 0.7
  lp.frequency.setValueAtTime(Math.min(ctx.sampleRate / 2, freq * 4), t)
  lp.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.4), t + dur)

  const g = gainEnv(ctx, ctx.destination, t, dur, vel * 0.5, 0.012, 0.06)
  osc.connect(lp).connect(g)
  osc.start(t)
  osc.stop(t + dur + 0.08)
}

function scheduleLead(ctx: AudioContext | OfflineAudioContext, note: NoteEvent, t: number, tempo: number) {
  const vel = note.velocity / 127
  const freq = freqFromMidi(note.pitch)
  const dur = noteDuration(note, tempo)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 2600
  lp.Q.value = 0.5

  const master = gainEnv(ctx, ctx.destination, t, dur, vel * 0.32, 0.008, 0.03)

  const sources: AudioScheduledSourceNode[] = []
  const spawn = (type: OscillatorType, freqMult: number, detune: number, level: number) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq * freqMult
    osc.detune.value = detune
    const g = ctx.createGain()
    g.gain.value = level
    osc.connect(g).connect(lp)
    sources.push(osc)
    return osc
  }

  const lead = spawn("sawtooth", 1, 0, 0.6)
  spawn("sawtooth", 1, 6, 0.35)
  spawn("square", 1, -4, 0.18)

  const vibrato = ctx.createOscillator()
  vibrato.frequency.value = 5.2
  const vg = ctx.createGain()
  vg.gain.value = 14
  vibrato.connect(vg).connect(lead.detune)

  lp.connect(master)
  vibrato.start(t)
  vibrato.stop(t + dur + 0.06)
  for (const src of sources) {
    src.start(t)
    src.stop(t + dur + 0.06)
  }
}

function schedulePad(ctx: AudioContext | OfflineAudioContext, note: NoteEvent, t: number, tempo: number) {
  const vel = note.velocity / 127
  const freq = freqFromMidi(note.pitch)
  const dur = noteDuration(note, tempo)

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 1500
  lp.Q.value = 0.4

  const g = gainEnv(ctx, ctx.destination, t, dur, vel * 0.18, 0.35, 0.4)

  for (const detune of [-6, 0, 6]) {
    const osc = ctx.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = freq
    osc.detune.value = detune
    const og = ctx.createGain()
    og.gain.value = 0.33
    osc.connect(og).connect(lp)
    osc.start(t)
    osc.stop(t + dur + 0.1)
  }
  lp.connect(g)
}

function scheduleVocal(ctx: AudioContext | OfflineAudioContext, note: NoteEvent, t: number, tempo: number) {
  const vel = note.velocity / 127
  const freq = freqFromMidi(note.pitch)
  const dur = noteDuration(note, tempo)

  const osc = ctx.createOscillator()
  osc.type = "sawtooth"
  osc.frequency.value = freq

  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 700
  bp.Q.value = 0.9

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 3200

  const g = gainEnv(ctx, ctx.destination, t, dur, vel * 0.22, 0.22, 0.4)

  const tremolo = ctx.createOscillator()
  tremolo.frequency.value = 4.5
  const tg = ctx.createGain()
  tg.gain.value = 0.06
  tremolo.connect(tg).connect(g.gain)

  osc.connect(bp).connect(lp).connect(g)
  tremolo.start(t)
  tremolo.stop(t + dur + 0.1)
  osc.start(t)
  osc.stop(t + dur + 0.1)
}

function scheduleTrack(ctx: OfflineAudioContext, track: TrackEvents, tempo: number, noise: AudioBuffer) {
  for (const note of track.notes) {
    const t = note.pos * sixteenthDur(tempo)
    switch (track.track.id) {
      case "drums":
        scheduleDrums(ctx, noise, note, t)
        break
      case "bass":
        scheduleBass(ctx, note, t, tempo)
        break
      case "lead":
        scheduleLead(ctx, note, t, tempo)
        break
      case "pad":
        schedulePad(ctx, note, t, tempo)
        break
      case "vocal":
        scheduleVocal(ctx, note, t, tempo)
        break
    }
  }
}

export async function renderStems(mood: ExportMood, tempo: number, bars: number = EXPORT_BARS): Promise<RenderedStem[]> {
  const tracks = buildSong(mood, bars)
  const sr = EXPORT_SAMPLE_RATE
  const length = Math.ceil(totalSeconds(tempo, bars) * sr)
  const stems: RenderedStem[] = []

  for (const track of tracks) {
    const ctx = new OfflineAudioContext(2, length, sr)
    const noise = makeNoiseBuffer(ctx)
    scheduleTrack(ctx, track, tempo, noise)
    const buffer = await ctx.startRendering()
    stems.push({ name: track.track.name, buffer })
  }

  return stems
}

export function mixStems(stems: RenderedStem[]): AudioBuffer {
  const ctx = new OfflineAudioContext(2, 1, EXPORT_SAMPLE_RATE)
  const master = ctx.createBuffer(2, stems[0].buffer.length, stems[0].buffer.sampleRate)
  const l = master.getChannelData(0)
  const r = master.getChannelData(1)
  const mix = 1 / Math.sqrt(Math.max(1, stems.length))

  for (const stem of stems) {
    const sl = stem.buffer.getChannelData(0)
    const srR = stem.buffer.numberOfChannels > 1 ? stem.buffer.getChannelData(1) : sl
    for (let i = 0; i < l.length; i++) {
      l[i] += sl[i] * mix
      r[i] += srR[i] * mix
    }
  }

  return master
}

function interleave(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels
  const out = new Float32Array(buffer.length * channels)
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < buffer.length; i++) out[i * channels + ch] = data[i]
  }
  return out
}

export function encodeWavBuffer(buffer: AudioBuffer, bitDepth: number = 24): Blob {
  const sr = buffer.sampleRate
  const channels = buffer.numberOfChannels
  const interleaved = interleave(buffer)
  const bytesPerSample = Math.ceil(bitDepth / 8)
  const dataSize = interleaved.length * bytesPerSample
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * channels * bytesPerSample, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  if (bitDepth === 24) {
    for (let i = 0; i < interleaved.length; i++) {
      const v = Math.max(-1, Math.min(1, interleaved[i]))
      const int = Math.round(Math.max(-8388607, Math.min(8388607, v * 8388607)))
      view.setUint8(44 + i * 3, int & 0xff)
      view.setUint8(44 + i * 3 + 1, (int >> 8) & 0xff)
      view.setUint8(44 + i * 3 + 2, (int >> 16) & 0xff)
    }
  } else if (bitDepth === 16) {
    for (let i = 0; i < interleaved.length; i++) {
      view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, interleaved[i])) * 32767), true)
    }
  } else {
    for (let i = 0; i < interleaved.length; i++) {
      view.setFloat32(44 + i * 4, Math.max(-1, Math.min(1, interleaved[i])), true)
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" })
}

export async function exportStems(mood: ExportMood, tempo: number): Promise<ExportFile[]> {
  const stems = await renderStems(mood, tempo)
  const master = mixStems(stems)
  const files: ExportFile[] = []

  for (const stem of stems) {
    files.push({ name: `Kawaii Studio - ${stem.name}.wav`, url: objectUrl(encodeWavBuffer(stem.buffer, 24)) })
  }

  files.push({ name: "Kawaii Studio - Master.wav", url: objectUrl(encodeWavBuffer(master, 24)) })

  return files
}