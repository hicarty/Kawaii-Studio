#pragma once

#include <JuceHeader.h>
#include <atomic>
#include <memory>

// Thin, real-time-safe wrapper around a Neural Amp Modeler (NAM) model.
//
// The heavy NAM / Eigen headers are kept out of this header via pimpl so that
// the rest of the plugin (and the editor) compiles without pulling them in.
//
// Threading contract:
//   - loadModel() must be called on the message thread.
//   - process() is called on the audio thread.
//   - setInputGainDb()/setOutputGainDb()/setNormalize() are lock-free.
class NamAmp
{
public:
    NamAmp();
    ~NamAmp();

    // Loads a .nam model (or .wav impulse response). Returns false and fills
    // `error` on failure. Safe to call while audio is running.
    bool loadModel (const juce::String& path, double sampleRate, int blockSize,
                    juce::String& error);

    void reset (double sampleRate, int blockSize);
    void clear();

    bool isLoaded() const;
    juce::String getModelPath() const;
    double getLoudnessDb() const;

    void setInputGainDb (float db)  { inputGainDb.store (db); }
    void setOutputGainDb (float db) { outputGainDb.store (db); }
    void setNormalize (bool shouldNormalize) { normalize.store (shouldNormalize); }

    // Processes a mono buffer in place.
    void process (float* buffer, int numSamples);

private:
    struct Impl;
    std::unique_ptr<Impl> impl;

    std::atomic<float> inputGainDb  { 0.0f };
    std::atomic<float> outputGainDb { 0.0f };
    std::atomic<bool>  normalize    { true };
};
