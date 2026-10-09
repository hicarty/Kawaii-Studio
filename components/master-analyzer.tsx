"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJuceAudio } from "@/components/juce-audio-engine"

type Mood = "aggressive" | "balanced" | "mellow"

const BINS = 96
const FREQ_LABELS = [
  { hz: 20, label: "20" },
  { hz: 100, label: "100" },
  { hz: 1000, label: "1k" },
  { hz: 10000, label: "10k" },
  { hz: 20000, label: "20k" },
]
const MOOD_LUFS: Record<Mood, number> = { aggressive: -9.5, balanced: -14.3, mellow: -18.2 }
const MOOD_TILT: Record<Mood, number> = { aggressive: 0.35, balanced: 0.55, mellow: 0.85 }

const freqToX = (hz: number) => Math.log10(hz / 20) / Math.log10(1000)

function spectrumTarget(i: number, mood: Mood, t: number) {
  const x = i / (BINS - 1)
  const tilt = MOOD_TILT[mood]
  const lowBump = Math.exp(-((x - 0.18) ** 2) / 0.008) * 0.35
  const midBump = Math.exp(-((x - 0.45) ** 2) / 0.02) * 0.25
  const base = 0.82 - x * tilt + lowBump + midBump
  const wobble = Math.sin(t * 6 + i * 0.7) * 0.05 + (Math.random() - 0.5) * 0.18
  return Math.max(0.02, Math.min(1, base + wobble))
}

interface MasterAnalyzerProps {
  isPlaying: boolean
  mood: Mood
}

export function MasterAnalyzer({ isPlaying, mood }: MasterAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const binsRef = useRef<Float32Array>(new Float32Array(BINS))
  const [loudness, setLoudness] = useState({ momentary: 0, shortTerm: 0, integrated: -Infinity })
  const [matched, setMatched] = useState(false)
  const { isJuceNative, setParameter } = useJuceAudio()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let frame = 0
    const draw = (now: number) => {
      const { width, height } = canvas.getBoundingClientRect()
      const bins = binsRef.current
      const t = now / 1000

      const styles = getComputedStyle(document.documentElement)
      const primary = styles.getPropertyValue("--primary").trim() || "#8b5cf6"
      const glow = styles.getPropertyValue("--chart-3").trim() || "#c084fc"
      const grid = styles.getPropertyValue("--border").trim() || "#2a2040"

      for (let i = 0; i < BINS; i++) {
        const target = isPlaying ? spectrumTarget(i, mood, t) : 0
        const speed = target > bins[i] ? 0.45 : isPlaying ? 0.12 : 0.06
        bins[i] += (target - bins[i]) * speed
      }

      ctx.clearRect(0, 0, width, height)

      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.6
      for (const { hz } of FREQ_LABELS.slice(1, -1)) {
        const x = Math.round(freqToX(hz) * width) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let r = 1; r < 4; r++) {
        const y = Math.round((height / 4) * r) + 0.5
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      ctx.beginPath()
      ctx.moveTo(0, height)
      for (let i = 0; i < BINS; i++) {
        const x = (i / (BINS - 1)) * width
        const y = height - bins[i] * height * 0.92
        ctx.lineTo(x, y)
      }
      ctx.lineTo(width, height)
      ctx.closePath()

      const fill = ctx.createLinearGradient(0, 0, 0, height)
      fill.addColorStop(0, glow)
      fill.addColorStop(1, "transparent")
      ctx.globalAlpha = 0.55
      ctx.fillStyle = fill
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = primary
      ctx.lineWidth = 1.5
      ctx.shadowColor = glow
      ctx.shadowBlur = 8
      ctx.stroke()
      ctx.shadowBlur = 0

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [isPlaying, mood])

  useEffect(() => {
    if (!isPlaying) {
      setLoudness((l) => ({ momentary: 0, shortTerm: 0, integrated: l.integrated }))
      return
    }
    const target = MOOD_LUFS[mood]
    const id = setInterval(() => {
      setLoudness((l) => {
        const momentary = Math.min(1, Math.max(0.2, 0.7 + (target + 14) * 0.04 + (Math.random() - 0.5) * 0.35))
        const shortTerm = l.shortTerm + (momentary - l.shortTerm) * 0.25
        const integrated = Number.isFinite(l.integrated)
          ? l.integrated + (target + (Math.random() - 0.5) * 0.4 - l.integrated) * 0.08
          : target - 3
        return { momentary, shortTerm, integrated }
      })
    }, 120)
    return () => clearInterval(id)
  }, [isPlaying, mood])

  useEffect(() => {
    setMatched(false)
  }, [mood])

  const handleMatch = () => {
    const next = !matched
    setMatched(next)
    if (isJuceNative) setParameter("referenceMatch", next ? 1 : 0)
  }

  const integratedLabel = Number.isFinite(loudness.integrated) ? loudness.integrated.toFixed(1) : "--.-"

  return (
    <section
      aria-labelledby="analyzer-title"
      className="rounded-2xl border border-border bg-card p-6 grid gap-6 lg:grid-cols-[1fr_auto_220px] relative overflow-hidden"
    >
      {/* Spectrum */}
      <div className="flex flex-col gap-3 min-w-0">
        <h2 id="analyzer-title" className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
          Master Analyzer
        </h2>
        <div className="relative h-40 rounded-lg border border-border/60 bg-surface overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
          {!isPlaying && (
            <p className="absolute inset-0 flex items-center justify-center text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
              Press play to analyze
            </p>
          )}
        </div>
        <div className="relative h-3" aria-hidden="true">
          {FREQ_LABELS.map(({ hz, label }) => (
            <span
              key={hz}
              className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full text-[9px] font-mono text-muted-foreground"
              style={{ left: `${freqToX(hz) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Loudness */}
      <div className="flex flex-col gap-3 items-center lg:border-x lg:border-border/50 lg:px-6">
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Loudness</span>
        <div className="flex items-end gap-2 h-40" role="img" aria-label={`Integrated loudness ${integratedLabel} LUFS`}>
          {[
            { key: "M", v: loudness.momentary },
            { key: "S", v: loudness.shortTerm },
            { key: "I", v: Number.isFinite(loudness.integrated) ? Math.max(0, (loudness.integrated + 30) / 30) : 0 },
          ].map(({ key, v }) => (
            <div key={key} className="flex flex-col items-center gap-1 h-full">
              <div className="relative w-3 flex-1 rounded-sm bg-surface overflow-hidden">
                <div
                  className="absolute bottom-0 inset-x-0 rounded-sm bg-gradient-to-t from-primary/70 to-chart-3 transition-[height] duration-100"
                  style={{ height: `${v * 100}%` }}
                />
                {v > 0.92 && <div className="absolute top-0 inset-x-0 h-1 bg-destructive" />}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
        <div className="text-center leading-tight">
          <div className="text-sm font-mono text-foreground tabular-nums">{integratedLabel} LUFS</div>
          <div className="text-[9px] font-mono tracking-wider text-muted-foreground uppercase">Integrated</div>
        </div>
      </div>

      {/* Reference track */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Reference Track</span>
        <div className="flex flex-col flex-1 rounded-lg border border-border/60 bg-surface overflow-hidden">
          <div className="flex flex-col gap-2 p-3 flex-1">
            <p className="text-xs text-foreground leading-snug">Midnight Voyage Reference.wav</p>
            <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="w-full h-10" aria-hidden="true">
              {Array.from({ length: 80 }, (_, i) => {
                const amp = 4 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31)) * 15
                return (
                  <line
                    key={i}
                    x1={i * 2.5 + 1}
                    x2={i * 2.5 + 1}
                    y1={20 - amp}
                    y2={20 + amp}
                    stroke="var(--chart-2)"
                    strokeWidth={1.2}
                  />
                )
              })}
            </svg>
            <p className="text-[10px] font-mono text-muted-foreground">
              {matched ? `Matched to ${MOOD_LUFS[mood].toFixed(1)} LUFS` : "Target -14.0 LUFS"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleMatch}
            aria-pressed={matched}
            className={cn(
              "flex items-center justify-center gap-2 h-10 border-t border-border/60 text-[11px] font-medium tracking-wider uppercase transition-colors",
              matched ? "bg-primary/25 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-raised",
            )}
          >
            {matched && <Check className="w-3.5 h-3.5" />}
            {matched ? "Matched" : "Match"}
          </button>
        </div>
      </div>
    </section>
  )
}
