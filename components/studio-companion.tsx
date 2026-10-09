"use client"

import { useState } from "react"
import Image from "next/image"
import { Sparkles, RefreshCw } from "lucide-react"

type Mood = "aggressive" | "balanced" | "mellow"

const COMPANION_NAME = "Kazan"

const MOOD_LINES: Record<Mood, { idle: string; playing: string }> = {
  aggressive: {
    idle: "Ready to unleash it? Push the low end, but keep your transients sharp.",
    playing: "That's the fire I want. Watch your limiter, don't crush the snare.",
  },
  balanced: {
    idle: "I'll help you shape your sound. Balance is the key to true power.",
    playing: "Good flow. Let the pad breathe under the lead and the mix will sing.",
  },
  mellow: {
    idle: "Slow it down. Space is an instrument too, so give the reverb room.",
    playing: "Beautiful. Pull the hi-hats back a touch and let the vocal float.",
  },
}

const TIPS = [
  "Layer your elements. Control your energy. Let the magic flow.",
  "Cut before you boost. Carve space for the kick around 60 Hz.",
  "Reference often. Your ears drift; the analyzer does not.",
  "Automate the filter into the drop and the crowd will feel it.",
  "Mute the lead for one bar before the chorus. Silence hits hard.",
]

interface StudioCompanionProps {
  mood: Mood
  isPlaying: boolean
}

export function StudioCompanion({ mood, isPlaying }: StudioCompanionProps) {
  const [tipIndex, setTipIndex] = useState(0)
  const line = MOOD_LINES[mood][isPlaying ? "playing" : "idle"]

  return (
    <aside
      aria-label={`${COMPANION_NAME}, your studio companion`}
      className="relative rounded-2xl border border-border bg-card overflow-hidden min-h-[420px] flex flex-col"
    >
      <Image
        src="/images/companion.png"
        alt={`${COMPANION_NAME}, a red-haired anime mentor in a fur-collared coat holding a glowing sound orb`}
        fill
        priority
        sizes="(min-width: 1024px) 380px, 100vw"
        className="object-cover object-[70%_top]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent"
        aria-hidden="true"
      />

      {/* Speech bubble */}
      <div className="relative m-4 max-w-[220px] self-start">
        <div
          key={line}
          className="rounded-xl border border-primary/40 bg-background/80 backdrop-blur-md px-4 py-3 shadow-[0_0_24px_oklch(0.55_0.18_290/0.25)] animate-in fade-in slide-in-from-left-2 duration-300"
          aria-live="polite"
        >
          <p className="text-sm text-foreground leading-relaxed text-pretty">{line}</p>
        </div>
        <span
          className="absolute -bottom-1.5 right-8 w-3 h-3 rotate-45 border-r border-b border-primary/40 bg-background/80"
          aria-hidden="true"
        />
      </div>

      {/* Tip card */}
      <div className="relative mt-auto m-4 rounded-xl border border-primary/40 bg-background/75 backdrop-blur-md p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-serif text-sm tracking-[0.2em] text-primary-foreground uppercase">
            Tip from {COMPANION_NAME}
            <Sparkles className="w-3.5 h-3.5 text-chart-3" aria-hidden="true" />
          </h3>
          <button
            type="button"
            onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next tip"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-foreground/90 leading-relaxed text-pretty">{TIPS[tipIndex]}</p>
      </div>
    </aside>
  )
}
