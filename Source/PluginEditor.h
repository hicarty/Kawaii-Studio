#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

//==============================================================================
class KawaiiStudioAudioProcessorEditor : public juce::AudioProcessorEditor
{
public:
    explicit KawaiiStudioAudioProcessorEditor (KawaiiStudioProcessor&);
    ~KawaiiStudioAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

    std::optional<juce::WebBrowserComponent::Resource> getResource (const juce::String& url);

private:
    KawaiiStudioProcessor& processorRef;

    struct Browser : public juce::WebBrowserComponent
    {
        using WebBrowserComponent::WebBrowserComponent;
        bool pageAboutToLoad (const juce::String& newURL) override;
    };

    Browser webComponent;

    std::unique_ptr<juce::FileChooser> modelChooser;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (KawaiiStudioAudioProcessorEditor)
};
