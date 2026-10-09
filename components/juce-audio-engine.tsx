"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  isJuceBackendAvailable,
  setParameter as nativeSetParameter,
  noteOn as nativeNoteOn,
  noteOff as nativeNoteOff,
  setTransport as nativeSetTransport,
} from "@/lib/juce/bridge"

export interface JuceGuitarProcessor {
  setDistortion: (amount: number) => void
  setGain: (gain: number) => void
  setTone: (tone: number) => void
  setTuning: (semitones: number) => void
}

export interface JuceSynthProcessor {
  setFilterCutoff: (cutoff: number) => void
  setResonance: (resonance: number) => void
  setModDepth: (depth: number) => void
  setModRate: (rate: number) => void
}

// Module-level fallback state for when the native JUCE backend is absent.
let sharedAudioContext: AudioContext | null = null
let sharedInitialized = false

function createGuitarProcessor(isNative: boolean): JuceGuitarProcessor {
  return {
    setDistortion: (v) => { if (isNative) nativeSetParameter("guitarDistortion", v) },
    setGain: (v) => { if (isNative) nativeSetParameter("guitarGain", v) },
    setTone: (v) => { if (isNative) nativeSetParameter("guitarTone", v) },
    setTuning: (v) => { if (isNative) nativeSetParameter("guitarTuning", v) },
  }
}

function createSynthProcessor(isNative: boolean): JuceSynthProcessor {
  return {
    setFilterCutoff: (v) => { if (isNative) nativeSetParameter("synthCutoff", v) },
    setResonance: (v) => { if (isNative) nativeSetParameter("synthResonance", v) },
    setModDepth: (v) => { if (isNative) nativeSetParameter("synthModDepth", v) },
    setModRate: (v) => { if (isNative) nativeSetParameter("synthModRate", v) },
  }
}

export function useJuceAudio() {
  const [isJuceNative, setIsJuceNative] = useState(false)
  const [isInitialized, setIsInitialized] = useState(sharedInitialized)

  useEffect(() => {
    if (isJuceBackendAvailable()) {
      sharedInitialized = true
      setIsJuceNative(true)
      setIsInitialized(true)
    }
  }, [])

  const guitarProcessor = useMemo(() => createGuitarProcessor(isJuceNative), [isJuceNative])
  const synthProcessor = useMemo(() => createSynthProcessor(isJuceNative), [isJuceNative])

  const initialize = useCallback(async () => {
    if (!isJuceNative && typeof window !== "undefined") {
      if (!sharedAudioContext) {
        try {
          sharedAudioContext = new AudioContext({ sampleRate: 48000 })
        } catch {
          // Ignore - no audio context available
        }
      }
    }
    sharedInitialized = true
    setIsInitialized(true)
  }, [isJuceNative])

  return {
    isJuceNative,
    isInitialized,
    audioContext: sharedAudioContext,
    guitarProcessor,
    synthProcessor,
    initialize,
    setParameter: nativeSetParameter,
    setTransport: nativeSetTransport,
    noteOn: nativeNoteOn,
    noteOff: nativeNoteOff,
  }
}
