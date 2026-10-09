"use client"

import { useState, useEffect, useRef } from "react"
import { RotaryKnob } from "@/components/rotary-knob"
import { ToggleSwitch } from "@/components/toggle-switch"
import { cn } from "@/lib/utils"
import { useJuceAudio } from "@/components/juce-audio-engine"
import { setParameter } from "@/lib/juce/bridge"

interface DrumMachineProps {
  isPlaying: boolean
  tempo: number
  mood: "aggressive" | "balanced" | "mellow"
}

const STEPS = 16

// Build a fresh, groove-anchored variation: the downbeat and backbeat stay put
// while the surrounding hits are re-rolled, weighted by the current mood.
function makeVariation(mood: DrumMachineProps["mood"]) {
  const density = mood === "aggressive" ? 1.35 : mood === "mellow" ? 0.6 : 1
  const roll = (p: number) => Math.random() < Math.min(p * density, 1)

  return {
    kick: Array.from({ length: STEPS }, (_, i) => (i === 0 || i === 8 ? true : roll(0.18))),
    snare: Array.from({ length: STEPS }, (_, i) => (i === 4 || i === 12 ? true : roll(0.1))),
    hihat: Array.from({ length: STEPS }, (_, i) => roll(i % 2 === 0 ? 0.7 : 0.28)),
  }
}

export function DrumMachine({ isPlaying, tempo, mood }: DrumMachineProps) {
  const [kickPattern, setKickPattern] = useState<boolean[]>(
    Array.from({ length: STEPS }, (_, i) => i % 4 === 0),
  )
  const [snarePattern, setSnarePattern] = useState<boolean[]>(
    Array.from({ length: STEPS }, (_, i) => i === 4 || i === 12),
  )
  const [hihatPattern, setHihatPattern] = useState<boolean[]>(
    Array.from({ length: STEPS }, (_, i) => i % 2 === 0),
  )
  const [currentStep, setCurrentStep] = useState(0)
  const [swing, setSwing] = useState(0)
  const [volume, setVolume] = useState(4.5)
  const [pitch, setPitch] = useState(2.8)
  const [decay, setDecay] = useState(3.1)
  const [sequencerOn, setSequencerOn] = useState(true)
  const [shuffle, setShuffle] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  const { isJuceNative } = useJuceAudio()

  // Push drum voicing controls to the native engine.
  useEffect(() => {
    if (!isJuceNative) return
    setParameter("drumPitch", pitch)
    setParameter("drumDecay", decay)
    setParameter("drumSwing", swing)
    setParameter("drumLevel", volume / 10)
  }, [isJuceNative, pitch, decay, swing, volume])

  // Push step patterns to the native engine as bitmasks.
  useEffect(() => {
    if (!isJuceNative) return
    const mask = (pattern: boolean[]) =>
      pattern.reduce((acc, on, i) => (on ? acc | (1 << i) : acc), 0)
    setParameter("kickPattern", mask(kickPattern))
    setParameter("snarePattern", mask(snarePattern))
    setParameter("hihatPattern", mask(hihatPattern))
  }, [isJuceNative, kickPattern, snarePattern, hihatPattern])

  useEffect(() => {
    if (isPlaying && sequencerOn) {
      const interval = setInterval(
        () => {
          setCurrentStep((prev) => (prev + 1) % STEPS)
        },
        ((60 / tempo) * 1000) / 4,
      )
      return () => clearInterval(interval)
    } else {
      setCurrentStep(0)
    }
  }, [isPlaying, sequencerOn, tempo])

  const prevStepRef = useRef(0)

  const applyVariation = () => {
    const v = makeVariation(mood)
    setKickPattern(v.kick)
    setSnarePattern(v.snare)
    setHihatPattern(v.hihat)
  }

  // Shuffle: re-roll the pattern at the start of every loop (step 15 -> 0).
  useEffect(() => {
    const wrapped = currentStep === 0 && prevStepRef.current === STEPS - 1
    prevStepRef.current = currentStep
    if (wrapped && isPlaying && sequencerOn && shuffle) applyVariation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isPlaying, sequencerOn, shuffle])

  // Shuffle immediately when the toggle is switched on.
  useEffect(() => {
    if (shuffle) applyVariation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffle])

  useEffect(() => {
    if (isPlaying && sequencerOn) {
      playDrums()
    }
  }, [currentStep])

  const playDrums = async () => {
    if (isJuceNative) return
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    const now = ctx.currentTime
    const vol = (volume / 10) * 0.5

    if (kickPattern[currentStep]) {
      const kickOsc = ctx.createOscillator()
      const kickGain = ctx.createGain()
      kickOsc.frequency.setValueAtTime(150 * (pitch / 5), now)
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5 * (decay / 5))
      kickGain.gain.setValueAtTime(vol, now)
      kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5 * (decay / 5))
      kickOsc.connect(kickGain)
      kickGain.connect(ctx.destination)
      kickOsc.start(now)
      kickOsc.stop(now + 0.5 * (decay / 5))
    }

    if (snarePattern[currentStep]) {
      const snareOsc = ctx.createOscillator()
      const snareNoise = ctx.createBufferSource()
      const snareGain = ctx.createGain()
      const snareFilter = ctx.createBiquadFilter()
      const bufferSize = ctx.sampleRate * 0.2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      snareNoise.buffer = buffer
      snareFilter.type = "highpass"
      snareFilter.frequency.value = 1000
      snareOsc.frequency.value = 200 * (pitch / 5)
      snareGain.gain.setValueAtTime(vol * 0.7, now)
      snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      snareOsc.connect(snareGain)
      snareNoise.connect(snareFilter)
      snareFilter.connect(snareGain)
      snareGain.connect(ctx.destination)
      snareOsc.start(now)
      snareNoise.start(now)
      snareOsc.stop(now + 0.2)
      snareNoise.stop(now + 0.2)
    }

    if (hihatPattern[currentStep]) {
      const hihatNoise = ctx.createBufferSource()
      const hihatGain = ctx.createGain()
      const hihatFilter = ctx.createBiquadFilter()
      const bufferSize = ctx.sampleRate * 0.05
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      hihatNoise.buffer = buffer
      hihatFilter.type = "highpass"
      hihatFilter.frequency.value = 7000
      hihatGain.gain.setValueAtTime(vol * 0.3, now)
      hihatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
      hihatNoise.connect(hihatFilter)
      hihatFilter.connect(hihatGain)
      hihatGain.connect(ctx.destination)
      hihatNoise.start(now)
      hihatNoise.stop(now + 0.05)
    }
  }

  const toggleStep = (pattern: boolean[], index: number, setter: (p: boolean[]) => void) => {
    const newPattern = [...pattern]
    newPattern[index] = !newPattern[index]
    setter(newPattern)
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between relative">
        <h2 className="font-serif text-xl tracking-[0.25em] text-foreground uppercase">
          Drum Machine
        </h2>
        <div className="flex items-center gap-4">
          <ToggleSwitch label="Seq" enabled={sequencerOn} onChange={setSequencerOn} />
          <ToggleSwitch label="Shuffle" enabled={shuffle} onChange={setShuffle} />
        </div>
      </div>

      {/* Step Sequencer Grid */}
      <div className="space-y-2">
        {/* Step numbers */}
        <div className="flex gap-1 pl-16">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 text-center text-[9px] font-mono",
                i % 4 === 0 ? "text-muted-foreground" : "text-muted-foreground/30",
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Kick row */}
        <div className="flex items-center gap-1">
          <span className="w-14 text-[10px] font-medium tracking-wider text-muted-foreground uppercase text-right pr-2">Kick</span>
          <div className="flex gap-1 flex-1">
            {kickPattern.map((active, i) => (
              <button
                key={i}
                onClick={() => toggleStep(kickPattern, i, setKickPattern)}
                className={cn(
                  "flex-1 h-8 rounded transition-all border",
                  active
                    ? "bg-primary/30 border-primary/60 shadow-[0_0_8px_oklch(0.55_0.18_290/0.3)]"
                    : "bg-surface border-border/50 hover:border-border",
                  currentStep === i && isPlaying && "ring-1 ring-primary/80",
                  i % 4 === 0 && !active && "bg-surface-raised",
                )}
                aria-label={`Kick step ${i + 1} ${active ? "on" : "off"}`}
              />
            ))}
          </div>
        </div>

        {/* Snare row */}
        <div className="flex items-center gap-1">
          <span className="w-14 text-[10px] font-medium tracking-wider text-muted-foreground uppercase text-right pr-2">Snare</span>
          <div className="flex gap-1 flex-1">
            {snarePattern.map((active, i) => (
              <button
                key={i}
                onClick={() => toggleStep(snarePattern, i, setSnarePattern)}
                className={cn(
                  "flex-1 h-8 rounded transition-all border",
                  active
                    ? "bg-primary/30 border-primary/60 shadow-[0_0_8px_oklch(0.55_0.18_290/0.3)]"
                    : "bg-surface border-border/50 hover:border-border",
                  currentStep === i && isPlaying && "ring-1 ring-primary/80",
                  i % 4 === 0 && !active && "bg-surface-raised",
                )}
                aria-label={`Snare step ${i + 1} ${active ? "on" : "off"}`}
              />
            ))}
          </div>
        </div>

        {/* Hi-hat row */}
        <div className="flex items-center gap-1">
          <span className="w-14 text-[10px] font-medium tracking-wider text-muted-foreground uppercase text-right pr-2">Hi-Hat</span>
          <div className="flex gap-1 flex-1">
            {hihatPattern.map((active, i) => (
              <button
                key={i}
                onClick={() => toggleStep(hihatPattern, i, setHihatPattern)}
                className={cn(
                  "flex-1 h-8 rounded transition-all border",
                  active
                    ? "bg-primary/30 border-primary/60 shadow-[0_0_8px_oklch(0.55_0.18_290/0.3)]"
                    : "bg-surface border-border/50 hover:border-border",
                  currentStep === i && isPlaying && "ring-1 ring-primary/80",
                  i % 4 === 0 && !active && "bg-surface-raised",
                )}
                aria-label={`Hi-hat step ${i + 1} ${active ? "on" : "off"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Knobs row */}
      <div className="flex items-start justify-around px-4 pt-2">
        <RotaryKnob label="Volume" value={volume} min={0} max={10} step={0.1} unit="" onChange={setVolume} size="sm" />
        <RotaryKnob label="Pitch" value={pitch} min={0} max={10} step={0.1} unit="" onChange={setPitch} size="sm" />
        <RotaryKnob label="Decay" value={decay} min={0} max={10} step={0.1} unit="" onChange={setDecay} size="sm" />
        <RotaryKnob label="Swing" value={swing} min={0} max={10} step={0.1} unit="" onChange={setSwing} size="sm" />
      </div>
    </div>
  )
}

