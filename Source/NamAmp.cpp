#include "NamAmp.h"

#include "get_dsp.h"
#include "dsp.h"

#include <mutex>
#include <vector>
#include <filesystem>

//==============================================================================
struct NamAmp::Impl
{
    std::mutex mutex;
    std::shared_ptr<nam::DSP> active;
    std::vector<float> scratch;
    juce::String path;

    double sampleRate = 44100.0;
    int    blockSize  = 512;
    std::atomic<float> loudnessDb { 0.0f };
};

//==============================================================================
NamAmp::NamAmp()  : impl (std::make_unique<Impl>()) {}
NamAmp::~NamAmp() = default;

bool NamAmp::loadModel (const juce::String& path, double sampleRate, int blockSize,
                        juce::String& error)
{
    const juce::File file (path);

    if (! file.existsAsFile())
    {
        error = "File not found: " + path;
        return false;
    }

    try
    {
        auto dsp = nam::get_dsp (std::filesystem::path (file.getFullPathName().toStdString()));

        if (dsp == nullptr)
        {
            error = "Unsupported or invalid model file.";
            return false;
        }

        dsp->Reset (sampleRate, juce::jmax (1, blockSize));

        {
            const std::lock_guard<std::mutex> lock (impl->mutex);
            impl->sampleRate = sampleRate;
            impl->blockSize  = juce::jmax (1, blockSize);
            impl->path       = path;
            impl->active     = std::shared_ptr<nam::DSP> (std::move (dsp));
            impl->scratch.assign ((size_t) juce::jmax (1, blockSize) * 2, 0.0f);
        }

        const auto loudness = impl->active->HasLoudness() ? impl->active->GetLoudness() : 0.0;
        impl->loudnessDb.store ((float) loudness);

        error.clear();
        return true;
    }
    catch (const std::exception& e)
    {
        error = juce::String ("Failed to load model: ") + e.what();
        return false;
    }
    catch (...)
    {
        error = "Failed to load model: unknown error.";
        return false;
    }
}

void NamAmp::reset (double sampleRate, int blockSize)
{
    const std::lock_guard<std::mutex> lock (impl->mutex);

    impl->sampleRate = sampleRate;
    impl->blockSize  = juce::jmax (1, blockSize);
    impl->scratch.assign ((size_t) impl->blockSize * 2, 0.0f);

    if (impl->active != nullptr)
        impl->active->Reset (sampleRate, impl->blockSize);
}

void NamAmp::clear()
{
    const std::lock_guard<std::mutex> lock (impl->mutex);
    impl->active.reset();
    impl->path.clear();
}

bool NamAmp::isLoaded() const
{
    const std::lock_guard<std::mutex> lock (impl->mutex);
    return impl->active != nullptr;
}

juce::String NamAmp::getModelPath() const
{
    const std::lock_guard<std::mutex> lock (impl->mutex);
    return impl->path;
}

double NamAmp::getLoudnessDb() const
{
    return (double) impl->loudnessDb.load();
}

//==============================================================================
void NamAmp::process (float* buffer, int numSamples)
{
    if (buffer == nullptr || numSamples <= 0)
        return;

    std::shared_ptr<nam::DSP> dsp;
    {
        const std::lock_guard<std::mutex> lock (impl->mutex);
        dsp = impl->active;
    }

    if (dsp == nullptr)
        return;

    const auto inGain  = juce::Decibels::decibelsToGain (inputGainDb.load());
    const auto outGain = juce::Decibels::decibelsToGain (outputGainDb.load())
                       * (normalize.load() ? juce::Decibels::decibelsToGain (-impl->loudnessDb.load())
                                           : 1.0f);

    for (int i = 0; i < numSamples; ++i)
        buffer[i] *= inGain;

    const int inCh  = juce::jmax (1, dsp->NumInputChannels());
    const int outCh = juce::jmax (1, dsp->NumOutputChannels());

    if (inCh == 1 && outCh == 1)
    {
        float* in[1]  = { buffer };
        float* out[1] = { buffer };
        dsp->process (in, out, numSamples);
    }
    else
    {
        std::vector<float> local;
        float* scratch = nullptr;

        {
            const std::lock_guard<std::mutex> lock (impl->mutex);
            if ((int) impl->scratch.size() < outCh * numSamples)
                local.assign ((size_t) outCh * numSamples, 0.0f);

            scratch = local.empty() ? impl->scratch.data() : local.data();
        }

        std::vector<float*> in  ((size_t) inCh,  buffer);
        std::vector<float*> out ((size_t) outCh, buffer);

        for (int ch = 1; ch < inCh; ++ch)
            in[(size_t) ch] = buffer;

        for (int ch = 1; ch < outCh; ++ch)
            out[(size_t) ch] = scratch + (size_t) ch * numSamples;

        dsp->process (in.data(), out.data(), numSamples);
    }

    for (int i = 0; i < numSamples; ++i)
        buffer[i] *= outGain;
}
