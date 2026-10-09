#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
    constexpr auto twoPi = juce::MathConstants<double>::twoPi;

    // Parameter IDs shared with the web UI.
    namespace ids
    {
        const juce::String guitarDistortion { "guitarDistortion" };
        const juce::String guitarGain       { "guitarGain" };
        const juce::String guitarTone       { "guitarTone" };
        const juce::String guitarTuning     { "guitarTuning" };
        const juce::String noiseGate        { "noiseGate" };
        const juce::String eq               { "eq" };
        const juce::String normalize        { "normalize" };

        const juce::String namInput         { "namInput" };
        const juce::String namOutput        { "namOutput" };
        const juce::String namThreshold     { "namThreshold" };

        const juce::String synthCutoff      { "synthCutoff" };
        const juce::String synthResonance   { "synthResonance" };
        const juce::String synthModDepth    { "synthModDepth" };
        const juce::String synthModRate     { "synthModRate" };
        const juce::String attack           { "attack" };
        const juce::String decay            { "decay" };
        const juce::String sustain          { "sustain" };
        const juce::String release          { "release" };
        const juce::String reese            { "reese" };
        const juce::String subBass          { "subBass" };

        const juce::String kickLevel        { "kickLevel" };
        const juce::String snareLevel       { "snareLevel" };
        const juce::String hatLevel         { "hatLevel" };
        const juce::String drumPitch        { "drumPitch" };
        const juce::String drumDecay        { "drumDecay" };
        const juce::String drumSwing        { "drumSwing" };
        const juce::String kickPattern      { "kickPattern" };
        const juce::String snarePattern     { "snarePattern" };
        const juce::String hihatPattern     { "hihatPattern" };

        const juce::String guitarLevel      { "guitarLevel" };
        const juce::String synthLevel       { "synthLevel" };
        const juce::String drumLevel        { "drumLevel" };
        const juce::String bassLevel        { "bassLevel" };
        const juce::String masterLevel      { "masterLevel" };
        const juce::String crossfade        { "crossfade" };

        const juce::String guitarPan        { "guitarPan" };
        const juce::String synthPan         { "synthPan" };
        const juce::String drumPan          { "drumPan" };
        const juce::String bassPan          { "bassPan" };

        const juce::String guitarMute       { "guitarMute" };
        const juce::String synthMute        { "synthMute" };
        const juce::String drumMute         { "drumMute" };
        const juce::String bassMute         { "bassMute" };
        const juce::String masterMute       { "masterMute" };

        const juce::String guitarSolo       { "guitarSolo" };
        const juce::String synthSolo        { "synthSolo" };
        const juce::String drumSolo         { "drumSolo" };
        const juce::String bassSolo         { "bassSolo" };

        const juce::String compressor       { "compressor" };
        const juce::String limiter          { "limiter" };

        const juce::String playheadBars     { "playheadBars" };
        const juce::String referenceMatch   { "referenceMatch" };

        // Arrangement view tracks (0 = Drums, 1 = Bass, 2 = Pad, 3 = Lead, 4 = Vocal)
        const juce::String track0Mute { "track0Mute" };
        const juce::String track1Mute { "track1Mute" };
        const juce::String track2Mute { "track2Mute" };
        const juce::String track3Mute { "track3Mute" };
        const juce::String track4Mute { "track4Mute" };
        const juce::String track0Solo { "track0Solo" };
        const juce::String track1Solo { "track1Solo" };
        const juce::String track2Solo { "track2Solo" };
        const juce::String track3Solo { "track3Solo" };
        const juce::String track4Solo { "track4Solo" };

        const juce::String tempo            { "tempo" };
        const juce::String playing          { "playing" };
        const juce::String mood             { "mood" };
    }
}

//==============================================================================
juce::AudioProcessorValueTreeState::ParameterLayout
KawaiiStudioProcessor::createParameterLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    auto addFloat = [&layout] (const juce::String& id, const juce::String& name,
                               float min, float max, float def)
    {
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            id, name, juce::NormalisableRange<float> (min, max), def));
    };

    auto addBool = [&layout] (const juce::String& id, const juce::String& name, bool def)
    {
        layout.add (std::make_unique<juce::AudioParameterBool> (id, name, def));
    };

    // Guitar channel
    addFloat (ids::guitarDistortion, "Distortion", 0.0f, 1.0f, 0.75f);
    addFloat (ids::guitarGain,       "Gain",       0.0f, 1.0f, 0.60f);
    addFloat (ids::guitarTone,       "Tone",       0.0f, 1.0f, 0.50f);
    addFloat (ids::guitarTuning,     "Tuning",   -12.0f, 0.0f, 0.0f);
    addBool  (ids::noiseGate, "Noise Gate", true);
    addBool  (ids::eq,        "EQ",         false);
    addBool  (ids::normalize, "Normalize",  true);

    // Neural Amp Modeler
    addFloat (ids::namInput,     "NAM Input",     -20.0f, 20.0f,   0.0f);
    addFloat (ids::namOutput,    "NAM Output",    -20.0f, 20.0f,   0.0f);
    addFloat (ids::namThreshold, "NAM Threshold", -100.0f, 0.0f, -80.0f);

    // Synth channel
    addFloat (ids::synthCutoff,    "Cutoff",    0.0f, 1.0f, 0.75f);
    addFloat (ids::synthResonance, "Resonance", 0.0f, 1.0f, 0.70f);
    addFloat (ids::synthModDepth,  "Mod Depth", 0.0f, 1.0f, 0.70f);
    addFloat (ids::synthModRate,   "Mod Rate",  0.0f, 1.0f, 0.60f);
    addFloat (ids::attack,         "Attack",    0.0f, 1.0f, 0.20f);
    addFloat (ids::decay,          "Decay",     0.0f, 1.0f, 0.50f);
    addFloat (ids::sustain,        "Sustain",   0.0f, 1.0f, 0.70f);
    addFloat (ids::release,        "Release",   0.0f, 1.0f, 0.40f);
    addBool  (ids::reese,   "Reese",    false);
    addBool  (ids::subBass, "Sub Bass", true);

    // Drum machine
    addFloat (ids::kickLevel,  "Kick",  0.0f, 1.0f, 0.85f);
    addFloat (ids::snareLevel, "Snare", 0.0f, 1.0f, 0.70f);
    addFloat (ids::hatLevel,   "Hat",   0.0f, 1.0f, 0.45f);
    addFloat (ids::drumPitch,  "Pitch", 0.0f, 10.0f, 2.8f);
    addFloat (ids::drumDecay,  "Decay", 0.0f, 10.0f, 3.1f);
    addFloat (ids::drumSwing,  "Swing", 0.0f, 10.0f, 0.0f);
    addFloat (ids::kickPattern,  "Kick Pattern",  0.0f, 65535.0f, 4369.0f);
    addFloat (ids::snarePattern, "Snare Pattern", 0.0f, 65535.0f, 4112.0f);
    addFloat (ids::hihatPattern, "Hat Pattern",   0.0f, 65535.0f, 21845.0f);

    // Mixer
    addFloat (ids::guitarLevel, "Guitar", 0.0f, 1.0f, 0.80f);
    addFloat (ids::synthLevel,  "Synth",  0.0f, 1.0f, 0.75f);
    addFloat (ids::drumLevel,   "Drums",  0.0f, 1.0f, 0.80f);
    addFloat (ids::bassLevel,   "Bass",   0.0f, 1.0f, 0.70f);
    addFloat (ids::masterLevel, "Master", 0.0f, 1.0f, 0.80f);
    addFloat (ids::crossfade,   "Blend",  0.0f, 1.0f, 0.50f);

    addFloat (ids::guitarPan, "Guitar Pan", -1.0f, 1.0f, -0.2f);
    addFloat (ids::synthPan,  "Synth Pan",  -1.0f, 1.0f,  0.2f);
    addFloat (ids::drumPan,   "Drum Pan",   -1.0f, 1.0f,  0.0f);
    addFloat (ids::bassPan,   "Bass Pan",   -1.0f, 1.0f,  0.0f);

    addBool  (ids::guitarMute, "Guitar Mute", false);
    addBool  (ids::synthMute,  "Synth Mute",  false);
    addBool  (ids::drumMute,   "Drum Mute",   false);
    addBool  (ids::bassMute,   "Bass Mute",   false);
    addBool  (ids::masterMute, "Master Mute", false);

    addBool  (ids::guitarSolo, "Guitar Solo", false);
    addBool  (ids::synthSolo,  "Synth Solo",  false);
    addBool  (ids::drumSolo,   "Drum Solo",   false);
    addBool  (ids::bassSolo,   "Bass Solo",   false);

    addBool  (ids::compressor, "Compressor", true);
    addBool  (ids::limiter,    "Limiter",    true);

    // Arrangement / master analyser
    addFloat (ids::playheadBars,   "Playhead", 0.0f, 36.0f, 0.0f);
    addBool  (ids::referenceMatch, "Reference Match", false);

    addBool  (ids::track0Mute, "Drums Mute", false);
    addBool  (ids::track1Mute, "Bass Mute",  false);
    addBool  (ids::track2Mute, "Pad Mute",   false);
    addBool  (ids::track3Mute, "Lead Mute",  false);
    addBool  (ids::track4Mute, "Vocal Mute", false);
    addBool  (ids::track0Solo, "Drums Solo", false);
    addBool  (ids::track1Solo, "Bass Solo",  false);
    addBool  (ids::track2Solo, "Pad Solo",   false);
    addBool  (ids::track3Solo, "Lead Solo",  false);
    addBool  (ids::track4Solo, "Vocal Solo", false);

    // Transport
    addFloat (ids::tempo,   "Tempo", 40.0f, 240.0f, 140.0f);
    addBool  (ids::playing, "Play", false);
    layout.add (std::make_unique<juce::AudioParameterChoice> (
        ids::mood, "Mood", juce::StringArray { "aggressive", "balanced", "mellow" }, 1));

    return layout;
}

//==============================================================================
KawaiiStudioProcessor::KawaiiStudioProcessor()
    : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "KAWAII", createParameterLayout())
{
}

KawaiiStudioProcessor::~KawaiiStudioProcessor() = default;

//==============================================================================
const juce::String KawaiiStudioProcessor::getName() const        { return "Kawaii Studio"; }
bool KawaiiStudioProcessor::acceptsMidi() const                  { return true; }
bool KawaiiStudioProcessor::producesMidi() const                 { return false; }
bool KawaiiStudioProcessor::isMidiEffect() const                 { return false; }
double KawaiiStudioProcessor::getTailLengthSeconds() const       { return 0.5; }

int KawaiiStudioProcessor::getNumPrograms()                      { return 1; }
int KawaiiStudioProcessor::getCurrentProgram()                   { return 0; }
void KawaiiStudioProcessor::setCurrentProgram (int)              {}
const juce::String KawaiiStudioProcessor::getProgramName (int)   { return {}; }
void KawaiiStudioProcessor::changeProgramName (int, const juce::String&) {}

//==============================================================================
void KawaiiStudioProcessor::prepareToPlay (double newSampleRate, int samplesPerBlock)
{
    sampleRate = newSampleRate;

    for (auto& v : guitarVoices) v.reset();
    for (auto& v : synthVoices)  v.reset();

    kick = {};
    snare = {};
    hat = {};

    guitarLpState = 0.0f;
    synthLp = 0.0f;
    synthBp = 0.0f;
    lfoPhase = 0.0f;
    gateEnvelope = 0.0f;
    samplesIntoStep = 0.0;
    currentStep = -1;

    bassPhase = 0.0;
    bassFreq = 0.0f;
    bassEnv.setSampleRate (sampleRate);
    bassEnv.reset();

    guitarWorkBuffer.setSize (1, juce::jmax (1, samplesPerBlock), false, true, true);
    synthWorkBuffer.setSize  (1, juce::jmax (1, samplesPerBlock), false, true, true);
    drumWorkBuffer.setSize   (1, juce::jmax (1, samplesPerBlock), false, true, true);
    bassWorkBuffer.setSize   (1, juce::jmax (1, samplesPerBlock), false, true, true);

    namAmp.reset (sampleRate, samplesPerBlock);
}

void KawaiiStudioProcessor::releaseResources() {}

bool KawaiiStudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    const auto out = layouts.getMainOutputChannelSet();
    return out == juce::AudioChannelSet::mono() || out == juce::AudioChannelSet::stereo();
}

//==============================================================================
double KawaiiStudioProcessor::midiToFreq (int note)
{
    return 440.0 * std::pow (2.0, (note - 69) / 12.0);
}

void KawaiiStudioProcessor::startVoice (Voice& v, float freq, float velocity,
                                        float a, float d, float s, float r)
{
    v.note = -1;
    v.freq = freq;
    v.velocity = velocity;
    v.osc1.inc = freq / sampleRate;
    v.osc2.inc = (freq * 1.004) / sampleRate; // slight detune
    v.phaseReset();
    v.env.setSampleRate (sampleRate);
    v.env.setParameters ({ a, d, s, r });
    v.env.noteOn();
    v.active = true;
}

void KawaiiStudioProcessor::releaseVoice (Voice& v)
{
    v.env.noteOff();
}

//==============================================================================
void KawaiiStudioProcessor::handleMidi (const juce::MidiBuffer& midi)
{
    for (const auto meta : midi)
    {
        const auto m = meta.getMessage();

        if (m.isNoteOn())
            triggerNoteOn (m.getNoteNumber(), m.getFloatVelocity());
        else if (m.isNoteOff())
            triggerNoteOff (m.getNoteNumber());
        else if (m.isAllNotesOff() || m.isAllSoundOff())
            for (auto& v : guitarVoices) releaseVoice (v);
    }
}

void KawaiiStudioProcessor::triggerNoteOn (int midiNote, float velocity)
{
    const auto tuning = apvts.getRawParameterValue (ids::guitarTuning)->load();
    const auto freq = (float) midiToFreq (midiNote + (int) tuning);

    for (auto& v : guitarVoices)
    {
        if (! v.env.isActive())
        {
            startVoice (v, freq, velocity, 0.003f, 0.30f, 0.0f, 0.10f);
            return;
        }
    }
}

void KawaiiStudioProcessor::triggerNoteOff (int)
{
    // Guitar voices are one-shot percussive chugs; ignore note-off.
}

//==============================================================================
void KawaiiStudioProcessor::triggerStep (int step)
{
    const auto tuning = apvts.getRawParameterValue (ids::guitarTuning)->load();

    auto rp = [this] (const juce::String& id) { return apvts.getRawParameterValue (id)->load(); };
    const int kickMask = (int) rp (ids::kickPattern);
    const int snareMask = (int) rp (ids::snarePattern);
    const int hatMask = (int) rp (ids::hihatPattern);

    const auto pitchScale = drumPitchScale;
    const auto decayScale = juce::jmax (0.1f, drumDecayScale);

    if (((kickMask >> step) & 1) != 0)
    {
        kick.active = true; kick.env = 1.0f; kick.phase = 0.0; kick.freq = 150.0 * pitchScale;
        kick.envDecay = std::exp (-1.0f / (float) (0.22 * decayScale * sampleRate));
        kick.freqDecay = std::exp (-1.0f / (float) (0.045 * sampleRate));
    }

    if (((snareMask >> step) & 1) != 0)
    {
        snare.active = true; snare.env = 0.9f; snare.phase = 0.0;
        snare.envDecay = std::exp (-1.0f / (float) (0.14 * decayScale * sampleRate));
    }

    if (((hatMask >> step) & 1) != 0)
    {
        hat.active = true; hat.env = 0.55f;
        hat.envDecay = std::exp (-1.0f / (float) (0.04 * decayScale * sampleRate));
    }

    // Guitar chugs: root on downbeats, fifth on the off-beat accents
    const int rootNote = 28 + (int) tuning; // drop-tuned low E
    if (step % 4 == 0)
    {
        for (auto& v : guitarVoices)
        {
            if (! v.env.isActive())
            {
                startVoice (v, (float) midiToFreq (rootNote), 0.85f, 0.003f, 0.28f, 0.0f, 0.08f);
                break;
            }
        }
    }
    else if (step % 8 == 6)
    {
        for (auto& v : guitarVoices)
        {
            if (! v.env.isActive())
            {
                startVoice (v, (float) midiToFreq (rootNote + 7), 0.7f, 0.003f, 0.24f, 0.0f, 0.08f);
                break;
            }
        }
    }

    // Reese bass: sustained note across the bar
    const float a = 0.01f + apvts.getRawParameterValue (ids::attack)->load() * 0.4f;
    const float d = 0.05f + apvts.getRawParameterValue (ids::decay)->load() * 0.5f;
    const float s = apvts.getRawParameterValue (ids::sustain)->load() * 0.9f;
    const float r = 0.05f + apvts.getRawParameterValue (ids::release)->load() * 0.6f;

    if (step == 0)
    {
        synthVoices[0].reset();
        startVoice (synthVoices[0], (float) midiToFreq (rootNote + 12), 0.8f, a, d, s, r);
        synthVoices[1].reset();
        startVoice (synthVoices[1], (float) midiToFreq (rootNote + 12), 0.7f, a, d, s, r);

        bassEnv.setSampleRate (sampleRate);
        bassEnv.setParameters ({ a, d, s, r });
        bassEnv.noteOn();
        bassFreq = (float) midiToFreq (rootNote + 12);
        bassPhase = 0.0;
    }
    else if (step == 12)
    {
        releaseVoice (synthVoices[0]);
        releaseVoice (synthVoices[1]);
        bassEnv.noteOff();
    }
}

//==============================================================================
float KawaiiStudioProcessor::renderGuitar (float drive, float tone, float gain)
{
    float sum = 0.0f;

    for (auto& v : guitarVoices)
    {
        if (! v.env.isActive())
        {
            v.active = false;
            continue;
        }

        const auto e = v.env.getNextSample();
        const auto o = (v.osc1.nextSaw() + v.osc2.nextSaw()) * 0.5f;
        sum += o * e * v.velocity;
    }

    const auto k = 1.0f + drive * 28.0f;
    const auto dist = std::tanh (k * sum);
    const auto coeff = 0.05f + tone * 0.9f;
    guitarLpState += coeff * (dist - guitarLpState);
    return guitarLpState * gain;
}

float KawaiiStudioProcessor::renderSynth (float cutoff, float resonance, float modDepth)
{
    float sum = 0.0f;

    for (auto& v : synthVoices)
    {
        if (! v.env.isActive())
        {
            v.active = false;
            continue;
        }

        const auto e = v.env.getNextSample();
        sum += (v.osc1.nextSaw() + v.osc2.nextSaw()) * 0.5f * e * v.velocity;
    }

    const auto mod = 1.0f + modDepth * 0.7f * std::sin ((float) (lfoPhase * twoPi));
    auto hz = 60.0f * std::pow (120.0f, juce::jlimit (0.0f, 1.0f, cutoff)) * mod;
    hz = juce::jlimit (30.0f, (float) (sampleRate * 0.45), hz);

    const auto f = 2.0f * std::sin (juce::MathConstants<float>::pi
                                        * juce::jmin (0.25f, (float) (hz / sampleRate)));
    const auto q = 1.0f - juce::jlimit (0.0f, 0.95f, resonance) * 0.9f;

    synthLp += f * synthBp;
    const auto high = sum - synthLp - q * synthBp;
    synthBp += f * high;

    return synthLp * (1.0f + resonance * 0.5f);
}

float KawaiiStudioProcessor::renderDrums (float kickLevel, float snareLevel, float hatLevel)
{
    float out = 0.0f;

    if (kick.active)
    {
        kick.env *= kick.envDecay;
        if (kick.env < 0.0005f) kick.active = false;
        kick.freq = 45.0 + (kick.freq - 45.0) * kick.freqDecay;
        out += (float) std::sin (kick.phase) * kick.env * kickLevel;
        kick.phase += twoPi * kick.freq / sampleRate;
        if (kick.phase > twoPi) kick.phase -= twoPi;
    }

    if (snare.active)
    {
        snare.env *= snare.envDecay;
        if (snare.env < 0.0005f) snare.active = false;
        const auto noise = rng.nextFloat() * 2.0f - 1.0f;
        const auto tone = (float) std::sin (snare.phase);
        out += (noise * 0.7f + tone * 0.3f) * snare.env * snareLevel;
        snare.phase += twoPi * 190.0 / sampleRate;
        if (snare.phase > twoPi) snare.phase -= twoPi;
    }

    if (hat.active)
    {
        hat.env *= hat.envDecay;
        if (hat.env < 0.0005f) hat.active = false;
        const auto noise = rng.nextFloat() * 2.0f - 1.0f;
        const auto hp = noise - hat.noise;
        hat.noise = noise;
        out += hp * hat.env * hatLevel;
    }

    return out;
}

float KawaiiStudioProcessor::renderBass()
{
    if (! bassEnv.isActive())
        return 0.0f;

    const auto e = bassEnv.getNextSample();
    const auto s = std::sin ((float) bassPhase) * e;

    bassPhase += twoPi * bassFreq / sampleRate;
    if (bassPhase > twoPi) bassPhase -= twoPi;

    return s;
}

//==============================================================================
void KawaiiStudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;

    const auto numSamples = buffer.getNumSamples();
    const auto numOut = getTotalNumOutputChannels();

    handleMidi (midiMessages);

    auto p = [this] (const juce::String& id) { return apvts.getRawParameterValue (id)->load(); };

    const bool playing = p (ids::playing) > 0.5f;
    const auto tempo = juce::jmax (20.0f, p (ids::tempo));

    const auto drive = p (ids::guitarDistortion);
    const auto tone = p (ids::guitarTone);
    const auto gGain = p (ids::guitarGain);

    const auto cutoff = p (ids::synthCutoff);
    const auto resonance = p (ids::synthResonance);
    const auto modDepth = p (ids::synthModDepth);
    const auto modRate = p (ids::synthModRate);

    const auto kickLevel = p (ids::kickLevel);
    const auto snareLevel = p (ids::snareLevel);
    const auto hatLevel = p (ids::hatLevel);

    // Drum machine voicing controls (UI range 0..10).
    drumPitchScale = juce::jmax (0.05f, p (ids::drumPitch) / 5.0f);
    drumDecayScale = juce::jmax (0.05f, p (ids::drumDecay) / 5.0f);
    const auto swing = juce::jlimit (0.0f, 1.0f, p (ids::drumSwing) / 10.0f);

    // Neural Amp Modeler controls.
    const bool gateOn = p (ids::noiseGate) > 0.5f;
    const auto gateThresholdDb = p (ids::namThreshold);
    namAmp.setInputGainDb  (p (ids::namInput));
    namAmp.setOutputGainDb (p (ids::namOutput));
    namAmp.setNormalize    (p (ids::normalize) > 0.5f);
    const bool namActive = namAmp.isLoaded();

    // Mixer bus levels
    const auto gLevel = p (ids::guitarLevel);
    const auto sLevel = p (ids::synthLevel);
    const auto dLevel = p (ids::drumLevel);
    const auto bLevel = p (ids::bassLevel);
    const auto master = p (ids::masterLevel);
    const auto crossfade = p (ids::crossfade);
    const auto subBass = p (ids::subBass) > 0.5f ? 1.0f : 0.0f;

    // Mixer pan / mute / solo
    const auto gPan = p (ids::guitarPan);
    const auto sPan = p (ids::synthPan);
    const auto dPan = p (ids::drumPan);
    const auto bPan = p (ids::bassPan);

    const bool gMute = p (ids::guitarMute) > 0.5f;
    const bool sMute = p (ids::synthMute) > 0.5f;
    const bool dMute = p (ids::drumMute) > 0.5f;
    const bool bMute = p (ids::bassMute) > 0.5f;
    const bool masterMute = p (ids::masterMute) > 0.5f;

    const bool gSolo = p (ids::guitarSolo) > 0.5f;
    const bool sSolo = p (ids::synthSolo) > 0.5f;
    const bool dSolo = p (ids::drumSolo) > 0.5f;
    const bool bSolo = p (ids::bassSolo) > 0.5f;

    const bool anySolo = gSolo || sSolo || dSolo || bSolo;
    auto audible = [anySolo] (bool solo, bool mute) { return ! mute && (! anySolo || solo); };

    // Arrangement view track mutes/solos (0 = Drums, 1 = Bass, 2 = Pad, 3 = Lead).
    const bool t0Mute = p (ids::track0Mute) > 0.5f;
    const bool t1Mute = p (ids::track1Mute) > 0.5f;
    const bool t2Mute = p (ids::track2Mute) > 0.5f;
    const bool t3Mute = p (ids::track3Mute) > 0.5f;
    const bool t0Solo = p (ids::track0Solo) > 0.5f;
    const bool t1Solo = p (ids::track1Solo) > 0.5f;
    const bool t2Solo = p (ids::track2Solo) > 0.5f;
    const bool t3Solo = p (ids::track3Solo) > 0.5f;
    const bool anyArrSolo = t0Solo || t1Solo || t2Solo || t3Solo;
    auto arrAudible = [anyArrSolo] (bool solo, bool mute) { return ! mute && (! anyArrSolo || solo); };

    auto busAudible = [&audible, &arrAudible] (bool mSolo, bool mMute, bool aSolo, bool aMute)
    {
        return audible (mSolo, mMute) && arrAudible (aSolo, aMute);
    };

    const bool compOn = p (ids::compressor) > 0.5f;
    const bool limiterOn = p (ids::limiter) > 0.5f;

    // Master analyser reference match: trim master toward the mood target LUFS.
    const bool refMatch = p (ids::referenceMatch) > 0.5f;

    // Equal-power pan gains (unity at centre).
    auto panGains = [] (float pan, float& left, float& right)
    {
        const auto angle = (juce::jlimit (-1.0f, 1.0f, pan) + 1.0f) * 0.25f
                         * juce::MathConstants<float>::pi;
        left  = std::cos (angle) * 1.41421356f;
        right = std::sin (angle) * 1.41421356f;
    };

    float gPL, gPR, sPL, sPR, dPL, dPR, bPL, bPR;
    panGains (gPan, gPL, gPR);
    panGains (sPan, sPL, sPR);
    panGains (dPan, dPL, dPR);
    panGains (bPan, bPL, bPR);

    const auto moodIndex = (int) p (ids::mood);
    const auto moodDrive = moodIndex == 0 ? 1.2f : moodIndex == 2 ? 0.8f : 1.0f;
    const auto moodCut = moodIndex == 0 ? 0.9f : moodIndex == 2 ? 1.15f : 1.0f;

    const auto lfoInc = (float) ((0.1 + modRate * 10.0) / sampleRate);
    const auto baseStepLen = sampleRate * (60.0 / tempo) / 4.0;

    if (! playing)
    {
        currentStep = -1;
        samplesIntoStep = 0.0;
    }

    // Arrangement playhead seek (sent only when the user scrubs the timeline).
    {
        const auto pb = p (ids::playheadBars);
        if (std::abs (pb - lastPlayheadBars) > 0.001)
        {
            lastPlayheadBars = pb;
            if (pb >= 0.0)
            {
                currentStep = ((int) std::floor (pb * 4.0)) % 16;
                samplesIntoStep = 0.0;
            }
        }
    }

    auto* guitar = guitarWorkBuffer.getWritePointer (0);
    auto* synth  = synthWorkBuffer.getWritePointer (0);
    auto* drum   = drumWorkBuffer.getWritePointer (0);
    auto* bass   = bassWorkBuffer.getWritePointer (0);

    //--------------------------------------------------------------------------
    // Pass 1: render voices into their mixer buses.
    for (int i = 0; i < numSamples; ++i)
    {
        if (playing)
        {
            if (currentStep < 0)
            {
                currentStep = 0;
                triggerStep (0);
            }

            const auto stepLen = baseStepLen * (1.0 + swing * (currentStep % 2 == 1 ? 0.5 : -0.5));

            samplesIntoStep += 1.0;
            if (samplesIntoStep >= stepLen)
            {
                samplesIntoStep -= stepLen;
                currentStep = (currentStep + 1) % 16;
                triggerStep (currentStep);
            }
        }

        lfoPhase += lfoInc;
        if (lfoPhase >= 1.0f) lfoPhase -= 1.0f;

        guitar[i] = renderGuitar (drive * moodDrive, tone, gGain);
        synth[i]  = renderSynth (juce::jlimit (0.0f, 1.0f, cutoff * moodCut), resonance, modDepth);
        drum[i]   = renderDrums (kickLevel, snareLevel, hatLevel);
        bass[i]   = renderBass() * subBass;
    }

    //--------------------------------------------------------------------------
    // Neural Amp Modeler + noise gate on the guitar bus.
    if (namActive)
        namAmp.process (guitar, numSamples);

    if (gateOn)
    {
        const auto thr = juce::Decibels::decibelsToGain (gateThresholdDb);
        const auto release = (float) std::exp (-1.0 / (0.05 * sampleRate));

        for (int i = 0; i < numSamples; ++i)
        {
            const auto rect = std::abs (guitar[i]);
            gateEnvelope = rect > gateEnvelope ? rect : rect + (gateEnvelope - rect) * release;
            guitar[i] *= gateEnvelope > thr ? 1.0f : 0.0f;
        }
    }

    //--------------------------------------------------------------------------
    // Pass 2: pan, blend, apply master section and write stereo output.
    const auto cf = juce::jlimit (0.0f, 1.0f, crossfade);
    const auto ecf = 1.0f - cf;

    const auto refTrimDb = ! refMatch
                             ? 0.0f
                             : (moodIndex == 0 ? 4.5f : moodIndex == 2 ? -4.2f : 0.0f);
    const auto masterGain = master * juce::Decibels::decibelsToGain (refTrimDb);

    for (int i = 0; i < numSamples; ++i)
    {
        const auto gSig = busAudible (gSolo, gMute, t3Solo, t3Mute) ? guitar[i] * gLevel : 0.0f;
        const auto sSig = busAudible (sSolo, sMute, t2Solo, t2Mute) ? synth[i]  * sLevel : 0.0f;
        const auto dSig = busAudible (dSolo, dMute, t0Solo, t0Mute) ? drum[i]   * dLevel : 0.0f;
        const auto bSig = busAudible (bSolo, bMute, t1Solo, t1Mute) ? bass[i]   * bLevel : 0.0f;

        auto outL = gSig * gPL * cf + (sSig * sPL + dSig * dPL + bSig * bPL) * ecf;
        auto outR = gSig * gPR * cf + (sSig * sPR + dSig * dPR + bSig * bPR) * ecf;

        if (! masterMute)
        {
            outL *= masterGain;
            outR *= masterGain;
        }

        if (compOn)
        {
            outL = std::tanh (outL * 1.4f);
            outR = std::tanh (outR * 1.4f);
        }

        if (limiterOn)
        {
            outL = juce::jlimit (-0.99f, 0.99f, outL);
            outR = juce::jlimit (-0.99f, 0.99f, outR);
        }

        if (numOut == 1)
        {
            buffer.getWritePointer (0)[i] = 0.5f * (outL + outR);
        }
        else if (numOut >= 2)
        {
            buffer.getWritePointer (0)[i] = outL;
            buffer.getWritePointer (1)[i] = outR;

            for (int ch = 2; ch < numOut; ++ch)
                buffer.getWritePointer (ch)[i] = 0.5f * (outL + outR);
        }
    }
}

//==============================================================================
void KawaiiStudioProcessor::setParameterValue (const juce::String& id, double value)
{
    if (auto* param = apvts.getParameter (id))
        param->setValueNotifyingHost (param->getNormalisableRange().convertTo0to1 ((float) value));
}

double KawaiiStudioProcessor::getParameterValue (const juce::String& id) const
{
    if (auto* param = apvts.getParameter (id))
        return (double) param->getNormalisableRange().convertFrom0to1 (param->getValue());

    return 0.0;
}

void KawaiiStudioProcessor::setTransport (bool isPlaying, double bpm)
{
    setParameterValue (ids::playing, isPlaying ? 1.0 : 0.0);
    if (bpm > 0.0)
        setParameterValue (ids::tempo, bpm);
}

bool KawaiiStudioProcessor::loadNamModel (const juce::String& path, juce::String& error)
{
    return namAmp.loadModel (path, sampleRate, guitarWorkBuffer.getNumSamples(), error);
}

juce::String KawaiiStudioProcessor::getNamModelPath() const
{
    return namAmp.getModelPath();
}

//==============================================================================
void KawaiiStudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    if (auto xml = apvts.copyState().createXml())
        copyXmlToBinary (*xml, destData);
}

void KawaiiStudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

//==============================================================================
juce::AudioProcessorEditor* KawaiiStudioProcessor::createEditor()
{
    return new KawaiiStudioAudioProcessorEditor (*this);
}

bool KawaiiStudioProcessor::hasEditor() const { return true; }

//==============================================================================
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new KawaiiStudioProcessor();
}
