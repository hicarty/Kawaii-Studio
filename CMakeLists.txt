cmake_minimum_required(VERSION 3.22)

project(KawaiiStudio VERSION 1.0.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "Minimum macOS version")

# Local JUCE 8 checkout (Projucer/CLI modules).
add_subdirectory("/Users/havenc/Downloads/JUCE" JUCE)

juce_add_plugin(KawaiiStudio
    COMPANY_NAME              "KawaiiStudio"
    BUNDLE_ID                 "com.kawaiistudio.kawaiistudio"
    PLUGIN_MANUFACTURER_CODE  Manu
    PLUGIN_CODE               Kawi
    PRODUCT_NAME              "Kawaii Studio"
    DESCRIPTION               "Djent x DnB fusion production instrument"
    IS_SYNTH                  TRUE
    NEEDS_MIDI_INPUT          TRUE
    NEEDS_MIDI_OUTPUT         FALSE
    IS_MIDI_EFFECT            FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD   FALSE
    MICROPHONE_PERMISSION_ENABLED FALSE
    FORMATS                   Standalone VST3 AU)

target_sources(KawaiiStudio PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/NamAmp.cpp)

#==============================================================================
# Neural Amp Modeler core (https://github.com/sdatkinson/NeuralAmpModelerCore).
# Compiled directly into the plugin; Eigen is vendored under Dependencies/eigen.
set(NAM_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/nam/NeuralAmpModelerCore")

file(GLOB NAM_SOURCES
    "${NAM_DIR}/NAM/*.cpp"
    "${NAM_DIR}/NAM/*/*.cpp")

target_sources(KawaiiStudio PRIVATE ${NAM_SOURCES})

target_include_directories(KawaiiStudio PRIVATE
    "${NAM_DIR}/NAM"
    "${NAM_DIR}/Dependencies"
    "${NAM_DIR}/Dependencies/eigen"
    "${NAM_DIR}/Dependencies/nlohmann")

target_compile_definitions(KawaiiStudio PRIVATE NAM_SAMPLE_FLOAT=1)
target_compile_features(KawaiiStudio PRIVATE cxx_std_20)

juce_generate_juce_header(KawaiiStudio)

target_compile_definitions(KawaiiStudio PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0
    JUCE_STRICT_REFCOUNTEDPOINTER=1)

target_link_libraries(KawaiiStudio
    PRIVATE
        juce::juce_audio_utils
        juce::juce_dsp
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_lto_flags
        juce::juce_recommended_warning_flags)
