# Kawaii Studio - JUCE-Powered MIDI Production App

A professional MIDI production application for creating djent metal and drum & bass fusion tracks with kawaii aesthetics, powered by JUCE WebAssembly audio engine.

## Features

- **JUCE WebAssembly Integration**: High-performance audio processing using JUCE framework compiled to WebAssembly
- **Guitar Distortion Channel**: Djent-style metal with JUCE-powered distortion, gain, and tone controls
- **DnB Synthesizer**: Reese bass synthesis with filter modulation and depth controls
- **Drum Machine**: 8-step sequencer synced to tempo
- **Smart Mixer**: Crossfade between metal and electronic channels
- **Tempo & Mood Sync**: Automatic matching of guitar aggression with electronic energy
- **Film Export**: Professional export for Japanese soundtrack production

## JUCE Integration

This app uses JUCE (C++ audio framework) compiled to WebAssembly for professional-grade audio processing:

### Architecture

- **JUCE WASM Bridge** (`lib/juce-wasm-bridge.ts`): JavaScript interface to JUCE WebAssembly module
- **Audio Worklet Processor** (`public/audio/juce-processor.js`): Real-time audio processing in dedicated audio thread
- **React Context** (`components/juce-audio-engine.tsx`): Provides JUCE processors to React components

### Building JUCE WASM Module

To compile your own JUCE audio processing code to WebAssembly:

1. Install Emscripten:
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

2. Clone JUCE Emscripten port:
```bash
git clone https://github.com/Dreamtonics/juce_emscripten.git
```

3. Build your JUCE project:
```bash
cd your-juce-project/Builds/Emscripten
emmake make
```

4. Copy the compiled WASM files to `public/audio/`:
   - `juce-audio-engine.wasm` - Compiled JUCE audio processing
   - JUCE JavaScript wrapper (if generated)

### JUCE C++ Audio Processors

Create custom guitar and synth processors in JUCE:

```cpp
// GuitarProcessor.h
class GuitarProcessor : public juce::AudioProcessor {
public:
    void setDistortion(float amount);
    void setGain(float gain);
    void setTone(float tone);
    void processBlock(juce::AudioBuffer<float>& buffer) override;
};

// SynthProcessor.h
class SynthProcessor : public juce::Synthesiser {
public:
    void setFilterCutoff(float cutoff);
    void setResonance(float resonance);
    void setModDepth(float depth);
};
```

### Fallback Mode

The app includes Web Audio API fallbacks that work when JUCE WASM is not available, allowing development without compilation.

## Tech Stack

- **Next.js 16** with App Router
- **React 19** with Server Components
- **JUCE Framework** (WebAssembly)
- **Web Audio API** (fallback)
- **Tailwind CSS v4**
- **shadcn/ui components**

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Audio Performance

- Sample Rate: 48kHz
- Buffer Size: 128 samples
- Processing: AudioWorklet (dedicated audio thread)
- Latency: < 10ms (JUCE) or ~20ms (fallback)

## Browser Compatibility

- Chrome/Edge 66+ (AudioWorklet support)
- Firefox 76+ (AudioWorklet support)
- Safari 14.1+ (AudioWorklet support)
- Requires WebAssembly support

## License

MIT License - Build amazing music production tools!

