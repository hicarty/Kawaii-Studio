"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJuceAudio } from "@/components/juce-audio-engine"

type Mood = "aggressive" | "balanced" | "mellow"

const TOTAL_BARS = 36
const BEATS_PER_BAR = 4
const RULER_MARKS = Array.from({ length: TOTAL_BARS / 4 + 1 }, (_, i) => i * 4 + 1)

interface Clip {
  start: number
  end: number
}

interface Track {
  id: string
  name: string
  color: string
  clips: Clip[]
  seed: number
  density: number
}

const TRACKS: Track[] = [
  { id: "drums", name: "Drums", color: "var(--chart-1)", clips: [{ start: 0, end: 36 }], seed: 11, density: 0.85 },
  { id: "bass", name: "Bass", color: "var(--chart-4)", clips: [{ start: 0, end: 36 }], seed: 23, density: 0.7 },
  { id: "pad", name: "Synth Pad", color: "var(--chart-2)", clips: [{ start: 6, end: 36 }], seed: 37, density: 0.45 },
  { id: "lead", name: "Lead", color: "var(--chart-5)", clips: [{ start: 0, end: 16 }, { start: 17, end: 36 }], seed: 41, density: 0.9 },
  { id: "vocal", name: "Vocal", color: "var(--chart-3)", clips: [{ start: 2, end: 34 }], seed: 53, density: 0.6 },
]

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function buildWaveformPath(seed: number, bars: number, density: number) {
  const rand = seededRandom(seed)
  const samples = Math.round(bars * 14)
  let d = ""
  for (let i = 0; i < samples; i++) {
    const envelope = 0.55 + 0.45 * Math.sin((i / samples) * Math.PI * bars * 0.5) ** 2
    const amp = Math.max(0.06, rand() * density * envelope)
    const x = ((i + 0.5) / samples) * 1000
    d += `M${x.toFixed(1)} ${(50 - amp * 46).toFixed(1)}V${(50 + amp * 46).toFixed(1)}`
  }
  return d
}

function formatTime(bars: number, tempo: number) {
  const seconds = (bars * BEATS_PER_BAR * 60) / tempo
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds % 1) * 100)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`
}

function formatBar(bars: number) {
  const bar = Math.floor(bars) + 1
  const beatFloat = (bars % 1) * BEATS_PER_BAR
  const beat = Math.floor(beatFloat) + 1
  const tick = Math.floor((beatFloat % 1) * 4) + 1
  return `${bar}.${beat}.${tick}`
}

interface ArrangementViewProps {
  isPlaying: boolean
  tempo: number
  mood: Mood
  resetSignal: number
  projectName?: string
}

export function ArrangementView({ isPlaying, tempo, mood, resetSignal, projectName = "Midnight Voyage" }: ArrangementViewProps) {
  const [position, setPosition] = useState(0)
  const [trackState, setTrackState] = useState(() =>
    Object.fromEntries(TRACKS.map((t) => [t.id, { muted: false, solo: false, collapsed: false }])),
  )
  const [loop, setLoop] = useState(true)
  const timelineRef = useRef<HTMLDivElement>(null)
  const { isJuceNative, setParameter } = useJuceAudio()

  const waveforms = useMemo(
    () =>
      Object.fromEntries(
        TRACKS.map((t) => [t.id, t.clips.map((c, i) => buildWaveformPath(t.seed + i * 7, c.end - c.start, t.density))]),
      ),
    [],
  )

  useEffect(() => {
    setPosition(0)
  }, [resetSignal])

  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    let last = performance.now()
    const barsPerSecond = tempo / 60 / BEATS_PER_BAR
    const tick = (now: number) => {
      const delta = (now - last) / 1000
      last = now
      setPosition((p) => {
        const next = p + delta * barsPerSecond
        if (next < TOTAL_BARS) return next
        return loop ? next % TOTAL_BARS : TOTAL_BARS
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, tempo, loop])

  useEffect(() => {
    if (!isJuceNative) return
    TRACKS.forEach((t, i) => {
      setParameter(`track${i}Mute`, trackState[t.id].muted ? 1 : 0)
      setParameter(`track${i}Solo`, trackState[t.id].solo ? 1 : 0)
    })
  }, [isJuceNative, trackState, setParameter])

  const seekFromPointer = (clientX: number) => {
    const el = timelineRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const next = ratio * TOTAL_BARS
    setPosition(next)
    if (isJuceNative) setParameter("playheadBars", next)
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromPointer(e.clientX)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) seekFromPointer(e.clientX)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 4 : 1
    if (e.key === "ArrowRight") setPosition((p) => Math.min(TOTAL_BARS, Math.floor(p) + step))
    else if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, Math.ceil(p) - step))
    else if (e.key === "Home") setPosition(0)
    else return
    e.preventDefault()
  }

  const toggle = (id: string, field: "muted" | "solo" | "collapsed") =>
    setTrackState((prev) => ({ ...prev, [id]: { ...prev[id], [field]: !prev[id][field] } }))

  const anySolo = Object.values(trackState).some((s) => s.solo)
  const playheadPct = (position / TOTAL_BARS) * 100

  return (
    <section
      aria-labelledby="arrangement-title"
      className="rounded-2xl border border-border bg-card flex flex-col relative overflow-hidden"
    >
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 id="arrangement-title" className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
            Arrangement
          </h2>
          <span className="truncate text-[11px] font-mono text-muted-foreground">{projectName}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right font-mono tabular-nums leading-tight">
            <div className="text-sm text-foreground">{formatTime(position, tempo)}</div>
            <div className="text-[9px] tracking-wider text-muted-foreground uppercase">Bar {formatBar(position)}</div>
          </div>
          <button
            type="button"
            onClick={() => setLoop((l) => !l)}
            aria-pressed={loop}
            className={cn(
              "h-7 px-3 rounded-md border text-[10px] font-medium tracking-wider uppercase transition-colors",
              loop
                ? "bg-primary/20 border-primary/50 text-foreground"
                : "bg-surface border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            Loop
          </button>
        </div>
      </header>

      <div className="grid grid-cols-[132px_1fr]">
        {/* Ruler row */}
        <div className="h-7 border-b border-r border-border/60 bg-surface/60" />
        <div className="relative h-7 border-b border-border/60 bg-surface/60" aria-hidden="true">
          {RULER_MARKS.map((bar) => (
            <span
              key={bar}
              className="absolute top-1.5 -translate-x-1/2 text-[9px] font-mono text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full"
              style={{ left: `${((bar - 1) / TOTAL_BARS) * 100}%` }}
            >
              {bar}
            </span>
          ))}
          <span
            className="absolute bottom-0 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] border-t-primary-foreground"
            style={{ left: `${playheadPct}%` }}
          />
        </div>

        {/* Track headers */}
        <ul className="border-r border-border/60">
          {TRACKS.map((t) => {
            const s = trackState[t.id]
            return (
              <li
                key={t.id}
                className={cn(
                  "flex flex-col justify-center gap-1.5 px-3 border-b border-border/40 last:border-b-0 transition-[height]",
                  s.collapsed ? "h-9" : "h-[60px]",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} aria-hidden="true" />
                  <span className="flex-1 truncate text-xs text-foreground">{t.name}</span>
                  <button
                    type="button"
                    onClick={() => toggle(t.id, "collapsed")}
                    aria-label={`${s.collapsed ? "Expand" : "Collapse"} ${t.name}`}
                    aria-expanded={!s.collapsed}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", s.collapsed && "-rotate-90")} />
                  </button>
                </div>
                {!s.collapsed && (
                  <div className="flex gap-1 pl-4">
                    <button
                      type="button"
                      onClick={() => toggle(t.id, "muted")}
                      aria-pressed={s.muted}
                      aria-label={`Mute ${t.name}`}
                      className={cn(
                        "w-6 h-5 rounded text-[9px] font-bold transition-colors border",
                        s.muted
                          ? "bg-destructive/30 border-destructive/50 text-destructive-foreground"
                          : "bg-surface border-border/50 text-muted-foreground hover:border-border",
                      )}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(t.id, "solo")}
                      aria-pressed={s.solo}
                      aria-label={`Solo ${t.name}`}
                      className={cn(
                        "w-6 h-5 rounded text-[9px] font-bold transition-colors border",
                        s.solo
                          ? "bg-primary/30 border-primary/50 text-primary-foreground"
                          : "bg-surface border-border/50 text-muted-foreground hover:border-border",
                      )}
                    >
                      S
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {/* Lanes + playhead */}
        <div
          ref={timelineRef}
          role="slider"
          tabIndex={0}
          aria-label="Playhead position"
          aria-valuemin={1}
          aria-valuemax={TOTAL_BARS + 1}
          aria-valuenow={Math.floor(position) + 1}
          aria-valuetext={`Bar ${formatBar(position)}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onKeyDown={handleKeyDown}
          className="relative cursor-text select-none touch-none focus-visible:outline-2 focus-visible:outline-ring"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, oklch(0.25 0.05 290 / 0.35) 0 1px, transparent 1px calc(100% / 36))",
          }}
        >
          {TRACKS.map((t) => {
            const s = trackState[t.id]
            const silent = s.muted || (anySolo && !s.solo)
            return (
              <div
                key={t.id}
                className={cn(
                  "relative border-b border-border/40 last:border-b-0 transition-[height]",
                  s.collapsed ? "h-9" : "h-[60px]",
                )}
              >
                {t.clips.map((clip, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute inset-y-1.5 rounded-md overflow-hidden border transition-opacity",
                      silent ? "opacity-25" : "opacity-100",
                    )}
                    style={{
                      left: `${(clip.start / TOTAL_BARS) * 100}%`,
                      width: `${((clip.end - clip.start) / TOTAL_BARS) * 100}%`,
                      background: `color-mix(in oklch, ${t.color} 18%, transparent)`,
                      borderColor: `color-mix(in oklch, ${t.color} 45%, transparent)`,
                    }}
                  >
                    <svg
                      viewBox="0 0 1000 100"
                      preserveAspectRatio="none"
                      className="w-full h-full"
                      aria-hidden="true"
                    >
                      <path
                        d={waveforms[t.id][i]}
                        stroke={t.color}
                        strokeWidth={1.4}
                        vectorEffect="non-scaling-stroke"
                        opacity={mood === "mellow" ? 0.75 : 1}
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )
          })}

          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-primary-foreground shadow-[0_0_10px_oklch(0.95_0.02_290/0.8)]"
            style={{ left: `${playheadPct}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  )
}
