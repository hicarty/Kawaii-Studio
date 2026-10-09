#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace
{
   #if JUCE_ANDROID
    const juce::String devServerAddress { "http://10.0.2.2:3000/" };
   #else
    const juce::String devServerAddress { "http://localhost:3000/" };
   #endif
}

bool KawaiiStudioAudioProcessorEditor::Browser::pageAboutToLoad (const juce::String& newURL)
{
    // Keep the single page app pinned to the dev server (and backend resources).
    return newURL == devServerAddress
        || newURL == getResourceProviderRoot()
        || newURL.startsWith (devServerAddress);
}

//==============================================================================
KawaiiStudioAudioProcessorEditor::KawaiiStudioAudioProcessorEditor (KawaiiStudioProcessor& p)
    : AudioProcessorEditor (&p),
      processorRef (p),
      webComponent (juce::WebBrowserComponent::Options{}
                        .withNativeIntegrationEnabled()
                        .withNativeFunction ("setParameter",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                if (args.size() >= 2)
                                    processorRef.setParameterValue (args[0].toString(),
                                                                    (double) args[1]);
                                complete (juce::var());
                            })
                        .withNativeFunction ("getParameter",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                complete (juce::var (args.size() >= 1
                                                         ? processorRef.getParameterValue (args[0].toString())
                                                         : 0.0));
                            })
                        .withNativeFunction ("setTransport",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                const auto isPlaying = args.size() >= 1 && (bool) args[0];
                                const auto bpm = args.size() >= 2 ? (double) args[1] : 0.0;
                                processorRef.setTransport (isPlaying, bpm);
                                complete (juce::var());
                            })
                        .withNativeFunction ("noteOn",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                if (args.size() >= 1)
                                    processorRef.triggerNoteOn ((int) args[0],
                                                                args.size() >= 2 ? (float) args[1] : 0.8f);
                                complete (juce::var());
                            })
                        .withNativeFunction ("noteOff",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                if (args.size() >= 1)
                                    processorRef.triggerNoteOff ((int) args[0]);
                                complete (juce::var());
                            })
                        .withNativeFunction ("loadModel",
                            [this] (const juce::Array<juce::var>& args,
                                    std::function<void (juce::var)> complete)
                            {
                                if (args.size() < 1)
                                {
                                    complete (juce::String ("No model path supplied."));
                                    return;
                                }

                                juce::String error;
                                const auto path = args[0].toString();

                                if (processorRef.loadNamModel (path, error))
                                    complete (juce::var (juce::String())); // empty == success
                                else
                                    complete (juce::var (error));
                            })
                        .withNativeFunction ("getModelPath",
                            [this] (const juce::Array<juce::var>&,
                                    std::function<void (juce::var)> complete)
                            {
                                complete (juce::var (processorRef.getNamModelPath()));
                            })
                        .withNativeFunction ("openModelDialog",
                            [this] (const juce::Array<juce::var>&,
                                    std::function<void (juce::var)> complete)
                            {
                                modelChooser = std::make_unique<juce::FileChooser> (
                                    "Select a Neural Amp Modeler model",
                                    juce::File::getSpecialLocation (juce::File::userHomeDirectory),
                                    "*.nam;*.wav");

                                const auto flags = juce::FileBrowserComponent::openMode
                                                 | juce::FileBrowserComponent::canSelectFiles;

                                modelChooser->launchAsync (flags,
                                    [complete] (const juce::FileChooser& chooser)
                                    {
                                        const auto file = chooser.getResult();
                                        complete (juce::var (file == juce::File()
                                                                 ? juce::String()
                                                                 : file.getFullPathName()));
                                    });
                            })
                        .withResourceProvider ([this] (const juce::String& url)
                                               {
                                                   return getResource (url);
                                               },
                                               juce::URL { devServerAddress }.getOrigin()))
{
    addAndMakeVisible (webComponent);

    webComponent.goToURL (devServerAddress);

    setSize (1200, 800);
    setResizable (true, true);
}

KawaiiStudioAudioProcessorEditor::~KawaiiStudioAudioProcessorEditor() = default;

//==============================================================================
std::optional<juce::WebBrowserComponent::Resource>
KawaiiStudioAudioProcessorEditor::getResource (const juce::String&)
{
    // The UI is served by the Next.js dev server, so no bundled resources are
    // required. Returning nullopt lets the WebView fetch from the network.
    return std::nullopt;
}

//==============================================================================
void KawaiiStudioAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff1a1030));
}

void KawaiiStudioAudioProcessorEditor::resized()
{
    webComponent.setBounds (getLocalBounds());
}
