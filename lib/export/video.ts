import { EXPORT_SAMPLE_RATE, type ExportMood } from "./song"
import { mixStems, renderStems } from "./wav"
import { objectUrl, type ExportFile } from "./types"

const VIDEO_WIDTH = 1280
const VIDEO_HEIGHT = 720
const FPS = 30

const MP4_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/x-m4v",
]

function pickMimeType(): { mime: string; ext: string } {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not available in this browser")
  }
  for (const mime of MP4_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext: "mp4" }
  }
  return { mime: "video/webm", ext: "webm" }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  freqData: Uint8Array<ArrayBuffer>,
  timeSeconds: number,
  duration: number,
  mood: ExportMood,
) {
  const w = VIDEO_WIDTH
  const h = VIDEO_HEIGHT
  analyser.getByteFrequencyData(freqData)

  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, "#1a1030")
  grad.addColorStop(0.55, "#231843")
  grad.addColorStop(1, "#0c0918")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  const radius = 1600
  const halo = ctx.createRadialGradient(w - 180, -80, 0, w - 180, -80, radius)
  halo.addColorStop(0, "rgba(139, 92, 246, 0.35)")
  halo.addColorStop(1, "rgba(139, 92, 246, 0)")
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)

  const barCount = 96
  const barW = w / barCount
  const peak = analyser.frequencyBinCount * 0.92
  ctx.fillStyle = "rgba(139, 92, 246, 0.55)"
  for (let i = 0; i < barCount; i++) {
    const idx = Math.min(peak - 1, Math.floor((i / barCount) * peak))
    const v = freqData[idx] / 255
    const bh = 40 + v * (h * 0.42)
    const x = i * barW
    ctx.fillRect(x, h - bh, Math.max(1, barW - 2), bh)
  }

  ctx.fillStyle = "rgba(216, 180, 254, 0.9)"
  ctx.font = "600 42px -apple-system, 'SF Pro Display', sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("KAWAII STUDIO", w / 2, 96)

  ctx.font = "500 22px 'SF Pro Text', -apple-system, sans-serif"
  ctx.fillStyle = "rgba(233, 213, 255, 0.75)"
  ctx.fillText(`Djent x DnB Fusion  /  ${mood}`, w / 2, 136)

  const progress = Math.min(1, timeSeconds / Math.max(0.1, duration))
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)"
  ctx.fillRect(0, h - 8, w, 8)
  ctx.fillStyle = "rgba(167, 139, 250, 0.9)"
  ctx.fillRect(0, h - 8, Math.round(w * progress), 8)

  const remain = Math.max(0, duration - timeSeconds)
  ctx.fillStyle = "rgba(196, 181, 253, 0.6)"
  ctx.font = "500 18px 'SF Pro Text', -apple-system, sans-serif"
  ctx.fillText(`-${remain.toFixed(1)}s`, w - 80, h - 36)
}

export async function renderFilmMaster(mood: ExportMood, tempo: number, onProgress?: (phase: string) => void): Promise<ExportFile> {
  const { mime, ext } = pickMimeType()

  const audio = new AudioContext({ sampleRate: EXPORT_SAMPLE_RATE })
  const resumePromise = audio.state === "suspended"
    ? audio.resume()
    : Promise.resolve()

  onProgress?.("Rendering stems…")
  const stems = await renderStems(mood, tempo)
  const master = mixStems(stems)
  await resumePromise

  const source = audio.createBufferSource()
  source.buffer = master

  const analyser = audio.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.82

  const streamDest = audio.createMediaStreamDestination()
  source.connect(analyser).connect(streamDest)
  source.start()
  source.connect(audio.destination)

  const canvas = document.createElement("canvas")
  canvas.width = VIDEO_WIDTH
  canvas.height = VIDEO_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  const freqData = new Uint8Array(analyser.frequencyBinCount)
  const duration = master.duration
  const startTime = audio.currentTime

  const stream = canvas.captureStream(FPS)
  for (const track of streamDest.stream.getAudioTracks()) stream.addTrack(track)

  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: BlobPart[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const finished = new Promise<ExportFile>((resolve, reject) => {
    recorder.onstop = () => {
      canvasStreamStop(stream)
      const blob = new Blob(chunks, { type: mime })
      resolve({ name: `Kawaii Studio - Film Master.${ext}`, url: objectUrl(blob) })
    }
    recorder.onerror = () => reject(new Error("Recording failed"))
  })

  let frame = 0
  const tick = () => {
    const elapsed = audio.currentTime - startTime
    drawScene(ctx, analyser, freqData, elapsed, duration, mood)
    if (elapsed < duration + 0.15) {
      frame = requestAnimationFrame(tick)
    } else {
      try {
        recorder.stop()
      } catch {
        /* already stopped */
      }
    }
  }

  onProgress?.("Recording film…")
  recorder.start(250)
  source.onended = () => {
    cancelAnimationFrame(frame)
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop()
      void audio.close()
    }, 250)
  }

  frame = requestAnimationFrame(tick)
  return finished
}

function canvasStreamStop(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop()
}