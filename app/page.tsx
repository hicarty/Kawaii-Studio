"use client"

import "@/lib/iterator-polyfill"
import { useState, useEffect } from "react"
import { GuitarChannel } from "@/components/guitar-channel"
import { SynthChannel } from "@/components/synth-channel"
import { DrumMachine } from "@/components/drum-machine"
import { MixerPanel } from "@/components/mixer-panel"
import { TempoMoodSync } from "@/components/tempo-mood-sync"
import { ExportPanel } from "@/components/export-panel"
import { ArrangementView } from "@/components/arrangement-view"
import { MasterAnalyzer } from "@/components/master-analyzer"
import { StudioCompanion } from "@/components/studio-companion"
import { Play, Pause, Square, SkipBack, Zap, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJuceAudio } from "@/components/juce-audio-engine"

export default function MidiApp() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(140)
  const [mood, setMood] = useState<"aggressive" | "balanced" | "mellow">("balanced")
  const [resetSignal, setResetSignal] = useState(0)
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  const { isInitialized, initialize, setTransport, setParameter } = useJuceAudio()

  // Restore the saved theme preference on mount.
  useEffect(() => {
    const stored = localStorage.getItem("kawaii-theme")
    if (stored === "light" || stored === "dark") setTheme(stored)
  }, [])

  // Apply the theme to <html>, keep color-scheme in sync, and persist it.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("light", theme === "light")
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
    localStorage.setItem("kawaii-theme", theme)
  }, [theme])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    setResetSignal((n) => n + 1)
  }

  useEffect(() => {
    if (isPlaying && !isInitialized) {
      initialize()
    }
  }, [isPlaying, isInitialized, initialize])

  // Keep the native JUCE engine in sync with the transport.
  useEffect(() => {
    if (isInitialized) setTransport(isPlaying, tempo)
  }, [isPlaying, tempo, isInitialized, setTransport])

  useEffect(() => {
    if (isInitialized)
      setParameter("mood", mood === "aggressive" ? 0 : mood === "mellow" ? 2 : 1)
  }, [mood, isInitialized, setParameter])

  return (
    <>
      {/* Ambient background glows */}
      <div className="backdrop" aria-hidden="true">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
      </div>

      <div className="relative z-10 min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-lg" />
                <div className="relative w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="font-serif text-lg tracking-[0.2em] text-foreground uppercase">
                  Kawaii Studio
                </h1>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase">
                  Djent x DnB Fusion
                  {isInitialized && (
                    <span className="ml-2 text-primary">JUCE</span>
                  )}
                </p>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-surface rounded-lg border border-border/50 p-1 gap-0.5">
                <button
                  onClick={stopPlayback}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
                  aria-label="Rewind"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={togglePlayback}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md transition-all",
                    isPlaying
                      ? "bg-primary/20 text-primary shadow-[0_0_12px_oklch(0.55_0.18_290/0.3)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-raised",
                  )}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={stopPlayback}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
                  aria-label="Stop"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3 bg-surface rounded-lg border border-border/50 px-4 py-2">
                <span className="text-sm font-mono text-foreground tabular-nums">{tempo}</span>
                <span className="text-[9px] font-mono text-muted-foreground tracking-wider">BPM</span>
                <div className="w-px h-4 bg-border/30" />
                <span className="text-[10px] font-mono text-primary tracking-wider uppercase">{mood}</span>
              </div>

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                title={theme === "dark" ? "Light theme" : "Dark theme"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Tempo & Mood */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="flex flex-col gap-6 min-w-0">
            <TempoMoodSync tempo={tempo} setTempo={setTempo} mood={mood} setMood={setMood} isPlaying={isPlaying} />
          </div>
          <StudioCompanion mood={mood} isPlaying={isPlaying} theme={theme} />
        </div>
        <ArrangementView isPlaying={isPlaying} tempo={tempo} mood={mood} resetSignal={resetSignal} />

        {/* Production Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GuitarChannel isPlaying={isPlaying} tempo={tempo} mood={mood} />
          <SynthChannel isPlaying={isPlaying} tempo={tempo} mood={mood} />
        </div>

        {/* Drum Machine */}
        <DrumMachine isPlaying={isPlaying} tempo={tempo} mood={mood} />

        {/* Mixer */}
        <MixerPanel isPlaying={isPlaying} />

        {/* Master Analyzer */}
        <MasterAnalyzer isPlaying={isPlaying} mood={mood} />

        {/* Export */}
        <ExportPanel tempo={tempo} mood={mood} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-3 mt-6">
        <p className="text-center text-[10px] font-mono text-muted-foreground/50 tracking-wider uppercase">
          Kawaii Studio v1.0 / JUCE WebAssembly Engine / Film Soundtrack Production
        </p>
      </footer>
      </div>
    </>
  )
}

