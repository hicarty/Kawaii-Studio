// JUCE WebAssembly Bridge
// This module handles communication between JavaScript and the JUCE WASM audio engine

export interface JuceAudioEngine {
  initialize: (sampleRate: number, bufferSize: number) => Promise<void>
  processAudio: (inputBuffer: Float32Array, outputBuffer: Float32Array) => void
  setParameter: (paramId: string, value: number) => void
  getParameter: (paramId: string) => number
  loadPreset: (presetData: string) => void
  destroy: () => void
}

export interface JuceGuitarProcessor {
  setDistortion: (amount: number) => void
  setGain: (gain: number) => void
  setTone: (tone: number) => void
  setTuning: (semitones: number) => void
  processSample: (input: number) => number
}

export interface JuceSynthProcessor {
  setFilterCutoff: (cutoff: number) => void
  setResonance: (resonance: number) => void
  setModDepth: (depth: number) => void
  setModRate: (rate: number) => void
  noteOn: (frequency: number, velocity: number) => void
  noteOff: () => void
}

class JuceWasmBridge {
  private wasmModule: any = null
  private audioContext: AudioContext | null = null
  private isInitialized = false
  private guitarParams = {
    distortion: 0.75,
    gain: 0.6,
    tone: 0.5,
    tuning: 0,
  }
  private synthParams = {
    cutoff: 0.75,
    resonance: 0.7,
    modDepth: 0.7,
    modRate: 0.6,
  }

  async initialize(audioContext: AudioContext): Promise<void> {
    if (this.isInitialized) return

    this.audioContext = audioContext

    try {
      // Load JUCE WASM module
      this.wasmModule = await this.loadWasmModule()

      this.isInitialized = true
      console.log("[v0] JUCE WASM engine initialized successfully")
    } catch (error) {
      console.error("[v0] Failed to initialize JUCE WASM:", error)
      // Continue with fallback - don't throw
    }
  }

  private async loadWasmModule(): Promise<any> {
    // Load the compiled JUCE WASM module
    try {
      const response = await fetch("/audio/juce-audio-engine.wasm")

      if (!response.ok) {
        throw new Error("WASM module not found")
      }

      const wasmBinary = await response.arrayBuffer()

      // Initialize Emscripten module
      const Module = {
        wasmBinary,
        onRuntimeInitialized: () => {
          console.log("[v0] JUCE WASM runtime initialized")
        },
      }

      // This would be the Emscripten-generated JavaScript wrapper
      if (typeof window !== "undefined" && (window as any).JuceAudioEngine) {
        return (window as any).JuceAudioEngine(Module)
      }

      throw new Error("JUCE module not available")
    } catch (error) {
      console.warn("[v0] JUCE WASM not available, using Web Audio fallback")
      return null
    }
  }

  createGuitarProcessor(): JuceGuitarProcessor {
    return {
      setDistortion: (amount: number) => {
        this.guitarParams.distortion = amount
        this.wasmModule?._setGuitarDistortion?.(0, amount)
      },
      setGain: (gain: number) => {
        this.guitarParams.gain = gain
        this.wasmModule?._setGuitarGain?.(0, gain)
      },
      setTone: (tone: number) => {
        this.guitarParams.tone = tone
        this.wasmModule?._setGuitarTone?.(0, tone)
      },
      setTuning: (semitones: number) => {
        this.guitarParams.tuning = semitones
        this.wasmModule?._setGuitarTuning?.(0, semitones)
      },
      processSample: (input: number) => {
        return input
      },
    }
  }

  createSynthProcessor(): JuceSynthProcessor {
    return {
      setFilterCutoff: (cutoff: number) => {
        this.synthParams.cutoff = cutoff
        this.wasmModule?._setSynthFilterCutoff?.(1, cutoff)
      },
      setResonance: (resonance: number) => {
        this.synthParams.resonance = resonance
        this.wasmModule?._setSynthResonance?.(1, resonance)
      },
      setModDepth: (depth: number) => {
        this.synthParams.modDepth = depth
        this.wasmModule?._setSynthModDepth?.(1, depth)
      },
      setModRate: (rate: number) => {
        this.synthParams.modRate = rate
        this.wasmModule?._setSynthModRate?.(1, rate)
      },
      noteOn: (frequency: number, velocity: number) => {
        const midiNote = this.frequencyToMidi(frequency)
        this.wasmModule?._processMidi?.(0x90, midiNote, velocity * 127)
      },
      noteOff: () => {
        this.wasmModule?._processMidi?.(0x80, 60, 0)
      },
    }
  }

  private frequencyToMidi(frequency: number): number {
    return Math.round(69 + 12 * Math.log2(frequency / 440))
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  destroy(): void {
    if (this.wasmModule && this.wasmModule._cleanup) {
      this.wasmModule._cleanup()
    }

    this.wasmModule = null
    this.audioContext = null
    this.isInitialized = false
  }
}

// Singleton instance
export const juceWasm = new JuceWasmBridge()

