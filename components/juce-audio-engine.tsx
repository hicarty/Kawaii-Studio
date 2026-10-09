"use client"

import { useState, useCallback } from "react"
import {
  juceWasm,
  type JuceGuitarProcessor,
  type JuceSynthProcessor,
} from "@/lib/juce-wasm-bridge"

// Module-level singletons - shared across all hook instances
let sharedAudioContext: AudioContext | null = null
let sharedGuitarProcessor: JuceGuitarProcessor | null = null
let sharedSynthProcessor: JuceSynthProcessor | null = null
let sharedInitialized = false
let initPromise: Promise<void> | null = null

async function doInitialize() {
  if (sharedInitialized) return
  try {
    const ctx = new AudioContext({ sampleRate: 48000 })
    sharedAudioContext = ctx
    await juceWasm.initialize(ctx)
    sharedGuitarProcessor = juceWasm.createGuitarProcessor()
    sharedSynthProcessor = juceWasm.createSynthProcessor()
    sharedInitialized = true
  } catch {
    // Still mark initialized so app works with Web Audio fallback
    sharedInitialized = true
  }
}

export function useJuceAudio() {
  const [isInitialized, setIsInitialized] = useState(sharedInitialized)

  const initialize = useCallback(async () => {
    if (sharedInitialized) {
      setIsInitialized(true)
      return
    }
    if (!initPromise) {
      initPromise = doInitialize()
    }
    await initPromise
    setIsInitialized(true)
  }, [])

  return {
    isInitialized,
    audioContext: sharedAudioContext,
    guitarProcessor: sharedGuitarProcessor,
    synthProcessor: sharedSynthProcessor,
    initialize,
  }
}

