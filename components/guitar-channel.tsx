"use client"

import { useState, useEffect } from "react"
import { RotaryKnob } from "@/components/rotary-knob"
import { ToggleSwitch } from "@/components/toggle-switch"
import { Settings, ChevronLeft, ChevronRight, X, Home, FolderOpen } from "lucide-react"
import { useJuceAudio } from "@/components/juce-audio-engine"
import { loadModel, openModelDialog, setParameter } from "@/lib/juce/bridge"

interface GuitarChannelProps {
  isPlaying: boolean
  tempo: number
  mood: "aggressive" | "balanced" | "mellow"
}

export function GuitarChannel({ isPlaying, tempo, mood }: GuitarChannelProps) {
  const [input, setInput] = useState(0)
  const [threshold, setThreshold] = useState(-80)
  const [bass, setBass] = useState(5)
  const [middle, setMiddle] = useState(5)
  const [treble, setTreble] = useState(5)
  const [output, setOutput] = useState(0)
  const [noiseGate, setNoiseGate] = useState(true)
  const [eq, setEq] = useState(false)
  const [normalize, setNormalize] = useState(true)
  const [modelPath, setModelPath] = useState("")
  const [irPath, setIrPath] = useState("")
  const [visualActivity, setVisualActivity] = useState(0)

  const { guitarProcessor, isInitialized, isJuceNative, noteOn, noteOff } = useJuceAudio()

  useEffect(() => {
    if (guitarProcessor && isInitialized) {
      guitarProcessor.setDistortion(bass / 10)
      guitarProcessor.setGain((input + 20) / 40)
      guitarProcessor.setTone(treble / 10)
    }
  }, [input, bass, treble, guitarProcessor, isInitialized])

  // Neural Amp Modeler parameters
  useEffect(() => {
    if (!isJuceNative) return
    setParameter("namInput", input)
    setParameter("namThreshold", threshold)
    setParameter("namOutput", output)
    setParameter("noiseGate", noiseGate ? 1 : 0)
    setParameter("normalize", normalize ? 1 : 0)
    setParameter("eq", eq ? 1 : 0)
  }, [isJuceNative, input, threshold, output, noiseGate, normalize, eq])

  const applyModel = async (path: string) => {
    if (!isJuceNative || !path) return
    const error = await loadModel(path)
    if (typeof error === "string" && error.length > 0) {
      console.warn("[NAM]", error)
    }
  }

  const browseForModel = async () => {
    if (!isJuceNative) return
    const path = await openModelDialog()
    if (typeof path === "string" && path.length > 0) {
      setModelPath(path)
      await applyModel(path)
    }
  }

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setVisualActivity(Math.random())
      }, 100)
      return () => clearInterval(interval)
    } else {
      setVisualActivity(0)
    }
  }, [isPlaying])

  const playGuitarNote = async () => {
    if (isJuceNative) {
      const note = 28
      noteOn(note, 0.9)
      setTimeout(() => noteOff(note), 450)
      return
    } else {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()
      const distortionNode = ctx.createWaveShaper()
      const filterNode = ctx.createBiquadFilter()

      const amount = bass / 10
      const k = amount * 100
      const n_samples = 44100
      const curve = new Float32Array(n_samples)
      const deg = Math.PI / 180
      for (let i = 0; i < n_samples; i++) {
        const x = (i * 2) / n_samples - 1
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
      }
      distortionNode.curve = curve
      distortionNode.oversample = "4x"

      filterNode.type = "lowpass"
      filterNode.frequency.value = 500 + treble * 500

      osc.type = "sawtooth"
      osc.frequency.value = 82.41
      gainNode.gain.value = 0.3

      osc.connect(distortionNode)
      distortionNode.connect(filterNode)
      filterNode.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6 relative overflow-hidden">
      {/* Subtle radial glow behind the panel */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase text-center flex-1">
          Neural Amp Modeler
        </h2>
        <button
          onClick={playGuitarNote}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Activity bar */}
      {isPlaying && (
        <div className="h-px bg-muted overflow-hidden">
          <div
            className="h-full bg-primary/60 transition-all duration-100"
            style={{ width: `${visualActivity * 100}%` }}
          />
        </div>
      )}

      {/* Knobs row */}
      <div className="flex items-start justify-between gap-2 px-2">
        <RotaryKnob label="Input" value={input} min={-20} max={20} step={0.1} unit="dB" onChange={setInput} />
        <RotaryKnob label="Threshold" value={threshold} min={-100} max={0} step={0.1} unit="dB" onChange={setThreshold} />
        <RotaryKnob label="Bass" value={bass} min={0} max={10} step={0.1} unit="" onChange={setBass} />
        <RotaryKnob label="Middle" value={middle} min={0} max={10} step={0.1} unit="" onChange={setMiddle} />
        <RotaryKnob label="Treble" value={treble} min={0} max={10} step={0.1} unit="" onChange={setTreble} />
        <RotaryKnob label="Output" value={output} min={-20} max={20} step={0.1} unit="dB" onChange={setOutput} />
      </div>

      {/* Toggle switches row */}
      <div className="flex items-center justify-around px-8">
        <ToggleSwitch label="Noise Gate" enabled={noiseGate} onChange={setNoiseGate} />
        <ToggleSwitch label="EQ" enabled={eq} onChange={setEq} />
        <ToggleSwitch label="Normalize" enabled={normalize} onChange={setNormalize} />
      </div>

      {/* Model directory selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2.5">
          <button onClick={browseForModel} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Browse files">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={browseForModel} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Open folder">
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
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyModel(modelPath)
            }}
            placeholder="Select model directory..."
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IR directory selector */}
        <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2.5">
          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Home">
            <Home className="w-4 h-4" />
          </button>
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
            value={irPath}
            onChange={(e) => setIrPath(e.target.value)}
            placeholder="Select IR directory..."
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

