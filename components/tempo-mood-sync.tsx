"use client"

import { RotaryKnob } from "@/components/rotary-knob"
import { cn } from "@/lib/utils"
import { Zap, Heart, Moon } from "lucide-react"

interface TempoMoodSyncProps {
  tempo: number
  setTempo: (tempo: number) => void
  mood: "aggressive" | "balanced" | "mellow"
  setMood: (mood: "aggressive" | "balanced" | "mellow") => void
  isPlaying: boolean
}

export function TempoMoodSync({ tempo, setTempo, mood, setMood, isPlaying }: TempoMoodSyncProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
          Tempo & Mood
        </h2>
        {isPlaying && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Syncing</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-8 flex-wrap">
        {/* Tempo knob */}
        <div className="flex flex-col items-center gap-1">
          <RotaryKnob
            label="BPM"
            value={tempo}
            min={120}
            max={180}
            step={1}
            unit=" BPM"
            onChange={setTempo}
            size="lg"
          />
        </div>

        {/* Mood buttons */}
        <div className="flex-1 space-y-3">
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Energy</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMood("aggressive")}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
                mood === "aggressive"
                  ? "bg-primary/15 border-primary/50 shadow-[0_0_16px_oklch(0.55_0.18_290/0.2)]"
                  : "bg-surface border-border/50 hover:border-border",
              )}
            >
              <Zap className={cn("w-5 h-5", mood === "aggressive" ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium tracking-wider uppercase", mood === "aggressive" ? "text-foreground" : "text-muted-foreground")}>
                Aggressive
              </span>
            </button>
            <button
              onClick={() => setMood("balanced")}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
                mood === "balanced"
                  ? "bg-primary/15 border-primary/50 shadow-[0_0_16px_oklch(0.55_0.18_290/0.2)]"
                  : "bg-surface border-border/50 hover:border-border",
              )}
            >
              <Heart className={cn("w-5 h-5", mood === "balanced" ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium tracking-wider uppercase", mood === "balanced" ? "text-foreground" : "text-muted-foreground")}>
                Balanced
              </span>
            </button>
            <button
              onClick={() => setMood("mellow")}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
                mood === "mellow"
                  ? "bg-primary/15 border-primary/50 shadow-[0_0_16px_oklch(0.55_0.18_290/0.2)]"
                  : "bg-surface border-border/50 hover:border-border",
              )}
            >
              <Moon className={cn("w-5 h-5", mood === "mellow" ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium tracking-wider uppercase", mood === "mellow" ? "text-foreground" : "text-muted-foreground")}>
                Mellow
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync status bar */}
      {isPlaying && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-surface rounded-lg">
          <span className="text-[10px] font-mono text-muted-foreground">
            {"Guitar distortion synced to DnB bass at "}
            <span className="text-primary">{tempo} BPM</span>
            {" / "}
            <span className="text-primary capitalize">{mood}</span>
          </span>
        </div>
      )}
    </div>
  )
}

