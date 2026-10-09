"use client"

import { useState, useEffect } from "react"
import { RotaryKnob } from "@/components/rotary-knob"
import { ToggleSwitch } from "@/components/toggle-switch"
import { Settings, ChevronLeft, ChevronRight, X, FolderOpen, Waves } from "lucide-react"
import { useJuceAudio } from "@/components/juce-audio-engine"

interface SynthChannelProps {
  isPlaying: boolean
  tempo: number
  mood: "aggressive" | "balanced" | "mellow"
}

export function SynthChannel({ isPlaying, tempo, mood }: SynthChannelProps) {
  const [cutoff, setCutoff] = useState(5)
  const [resonance, setResonance] = useState(3)
  const [attack, setAttack] = useState(2)
  const [decay, setDecay] = useState(5)
  const [sustain, setSustain] = useState(7)
  const [release, setRelease] = useState(4)
  const [modDepth, setModDepth] = useState(true)
  const [reese, setReese] = useState(false)
  const [subBass, setSubBass] = useState(true)
  const [patchPath, setPatchPath] = useState("")
  const [visualActivity, setVisualActivity] = useState(0)

  const { synthProcessor, audioContext, isInitialized } = useJuceAudio()

  useEffect(() => {
    if (synthProcessor && isInitialized) {
      synthProcessor.setFilterCutoff(cutoff / 10)
      synthProcessor.setResonance(resonance / 10)
      synthProcessor.setModDepth(sustain / 10)
      synthProcessor.setModRate(attack / 10)
    }
  }, [cutoff, resonance, sustain, attack, synthProcessor, isInitialized])

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setVisualActivity(Math.random() * 0.8 + 0.2)
      }, 150)
      return () => clearInterval(interval)
    } else {
      setVisualActivity(0)
    }
  }, [isPlaying])

  const playDnBBass = async () => {
    if (synthProcessor && audioContext && isInitialized) {
      synthProcessor.noteOn(55, 0.8)
      setTimeout(() => synthProcessor.noteOff(), 1000)
    } else {
      const ctx = new AudioContext()
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const filterNode = ctx.createBiquadFilter()
      const lfoOsc = ctx.createOscillator()
      const lfoGain = ctx.createGain()

      osc1.type = "sawtooth"
      osc2.type = "sawtooth"
      osc1.frequency.value = 55
      osc2.frequency.value = 55 + (resonance / 10) * 5

      filterNode.type = "lowpass"
      filterNode.frequency.value = 200 + cutoff * 200
      filterNode.Q.value = 5

      lfoOsc.frequency.value = (tempo / 60) * 2
      lfoGain.gain.value = 200
      lfoOsc.connect(lfoGain)
      lfoGain.connect(filterNode.frequency)

      gainNode.gain.value = 0.4

      osc1.connect(filterNode)
      osc2.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      const now = ctx.currentTime
      osc1.start(now)
      osc2.start(now)
      lfoOsc.start(now)
      osc1.stop(now + 1)
      osc2.stop(now + 1)
      lfoOsc.stop(now + 1)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase text-center flex-1">
          DnB Synthesizer
        </h2>
        <button
          onClick={playDnBBass}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {isPlaying && (
        <div className="h-px bg-muted overflow-hidden">
          <div
            className="h-full bg-primary/60 transition-all duration-150"
            style={{ width: `${visualActivity * 100}%` }}
          />
        </div>
      )}

      {/* Knobs row */}
      <div className="flex items-start justify-between gap-2 px-2">
        <RotaryKnob label="Cutoff" value={cutoff} min={0} max={10} step={0.1} unit="" onChange={setCutoff} />
        <RotaryKnob label="Resonance" value={resonance} min={0} max={10} step={0.1} unit="" onChange={setResonance} />
        <RotaryKnob label="Attack" value={attack} min={0} max={10} step={0.1} unit="" onChange={setAttack} />
        <RotaryKnob label="Decay" value={decay} min={0} max={10} step={0.1} unit="" onChange={setDecay} />
        <RotaryKnob label="Sustain" value={sustain} min={0} max={10} step={0.1} unit="" onChange={setSustain} />
        <RotaryKnob label="Release" value={release} min={0} max={10} step={0.1} unit="" onChange={setRelease} />
      </div>

      {/* Toggle switches */}
      <div className="flex items-center justify-around px-8">
        <ToggleSwitch label="Mod Depth" enabled={modDepth} onChange={setModDepth} />
        <ToggleSwitch label="Reese" enabled={reese} onChange={setReese} />
        <ToggleSwitch label="Sub Bass" enabled={subBass} onChange={setSubBass} />
      </div>

      {/* Patch selector */}
      <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2.5">
        <Waves className="w-4 h-4 text-muted-foreground" />
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Open folder">
          <FolderOpen className="w-4 h-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Previous">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Next">
          <ChevronRight className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={patchPath}
          onChange={(e) => setPatchPath(e.target.value)}
          placeholder="Select synth patch..."
          className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

