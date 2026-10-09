#pragma once

#include <JuceHeader.h>
#include "NamAmp.h"

class KawaiiStudioProcessor : public juce::AudioProcessor
{
public:
    KawaiiStudioProcessor();
    ~KawaiiStudioProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    const juce::String getName() const override;
    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram (int) override;
    const juce::String getProgramName (int) override;
    void changeProgramName (int, const juce::String&) override;

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    //==============================================================================
    // Web UI entry points (called on the message thread)
    void setParameterValue (const juce::String& id, double value);
    double getParameterValue (const juce::String& id) const;
    void setTransport (bool isPlaying, double bpm);
    void triggerNoteOn (int midiNote, float velocity);
    void triggerNoteOff (int midiNote);

    // Neural Amp Modeler control (message thread)
    bool loadNamModel (const juce::String& path, juce::String& error);
    juce::String getNamModelPath() const;

    juce::AudioProcessorValueTreeState apvts;

    static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

private:
    //==============================================================================
    struct Osc
    {
        double phase = 0.0;
        double inc = 0.0;

        float nextSaw()
        {
            auto v = (float) (2.0 * phase - 1.0);
            phase += inc;
            if (phase >= 1.0) phase -= 1.0;
            return v;
        }
    };

    struct Voice
    {
        bool active = false;
        int  note = -1;
        float velocity = 0.0f;
        double freq = 0.0;
        Osc osc1, osc2;
        juce::ADSR env;

        void reset()
        {
            active = false;
            note = -1;
            phaseReset();
            env.reset();
        }

        void phaseReset()
        {
            osc1.phase = 0.0;
            osc2.phase = 0.0;
        }
    };

    struct Drum
    {
        bool active = false;
        float env = 0.0f;
        float envDecay = 0.0f;
        double phase = 0.0;
        double freq = 0.0;
        double freqDecay = 0.0;
        float noise = 0.0f;
        int type = 0; // 0 = kick, 1 = snare, 2 = hat
    };

    float renderGuitar (float drive, float tone, float gain);
    float renderSynth (float cutoff, float resonance, float modDepth);
    float renderDrums (float kickLevel, float snareLevel, float hatLevel);
    float renderBass();

    void startVoice (Voice& v, float freq, float velocity,
                     float attack, float decay, float sustain, float release);
    void releaseVoice (Voice& v);

    static double midiToFreq (int note);

    //==============================================================================
    std::array<Voice, 8> guitarVoices;
    std::array<Voice, 8> synthVoices;

    Drum kick, snare, hat;

    double sampleRate = 44100.0;
    float  lfoPhase = 0.0f;

    NamAmp namAmp;
    juce::AudioBuffer<float> guitarWorkBuffer;
    juce::AudioBuffer<float> synthWorkBuffer;
    juce::AudioBuffer<float> drumWorkBuffer;
    juce::AudioBuffer<float> bassWorkBuffer;

    // dedicated sub-bass voice (mixer "Bass" channel)
    double bassPhase = 0.0;
    float  bassFreq = 0.0f;
    juce::ADSR bassEnv;

    // simple noise-gate envelope follower
    float gateEnvelope = 0.0f;

    // one-pole tone state
    float guitarLpState = 0.0f;
    // synth filter state (state-variable)
    float synthLp = 0.0f;
    float synthBp = 0.0f;

    // transport / sequencer
    double samplesIntoStep = 0.0;
    int    currentStep = 0;
    double lastPlayheadBars = -1.0;
    float  drumPitchScale = 1.0f;
    float  drumDecayScale = 1.0f;
    juce::Random rng;

    void triggerStep (int step);
    void handleMidi (const juce::MidiBuffer& midi);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KawaiiStudioProcessor)
};
