// 🎤 SIMON PRIME VOICE - Voice Integration Hook (Stub)
// File: src/hooks/simonprime/useSimonPrimeVoice.ts

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// 🎯 Voice synthesis configuration
interface VoiceSynthConfig {
  voice?: SpeechSynthesisVoice;
  rate: number;
  pitch: number;
  volume: number;
  enabled: boolean;
}

// 🎤 Voice recognition configuration
interface VoiceRecognitionConfig {
  enabled: boolean;
  continuous: boolean;
  language: string;
  keywords: string[];
}

// 🔊 Voice state interface
interface VoiceState {
  isSpeaking: boolean;
  isListening: boolean;
  isAvailable: boolean;
  currentText: string;
  lastSpoken: string;
  recognizedText: string;
  error: string | null;
}

// 🎸 Simon Prime Voice Hook
export function useSimonPrimeVoice() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isSpeaking: false,
    isListening: false,
    isAvailable: false,
    currentText: "",
    lastSpoken: "",
    recognizedText: "",
    error: null,
  });

  const [synthConfig, setSynthConfig] = useState<VoiceSynthConfig>({
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    enabled: true,
  });

  const [recognitionConfig, setRecognitionConfig] =
    useState<VoiceRecognitionConfig>({
      enabled: false,
      continuous: true,
      language: "en-US",
      keywords: ["simon", "hey simon", "simon prime"],
    });

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null); // SpeechRecognition type not available by default

  // 🎯 Initialize voice synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setVoiceState((prev) => ({ ...prev, isAvailable: true }));

      // Load available voices
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        // TODO: Select best voice for Simon Prime (deep, clear male voice)
        const preferredVoice = voices.find(
          (voice) =>
            voice.name.includes("Male") ||
            voice.name.includes("Bass") ||
            voice.name.includes("Deep")
        );
        if (preferredVoice) {
          setSynthConfig((prev) => ({ ...prev, voice: preferredVoice }));
        }
      };

      loadVoices();
      synthRef.current.addEventListener("voiceschanged", loadVoices);
    }

    // Initialize speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = recognitionConfig.continuous;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = recognitionConfig.language;
      }
    }
  }, [recognitionConfig.continuous, recognitionConfig.language]);

  // 🔊 Speak Simon's response
  const speak = useCallback(
    (text: string, options?: Partial<VoiceSynthConfig>) => {
      if (!synthRef.current || !synthConfig.enabled || !text.trim()) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        try {
          // Cancel any current speech
          synthRef.current!.cancel();

          // Clean text for speech (remove emojis and special formatting)
          const cleanText = text
            .replace(/[🎸🎤🔥⚡🎵🎯🏆👑💫✨🤘🎼📜💎🚀]/g, "") // Remove emojis
            .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
            .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
            .replace(/_{2,}/g, "") // Remove underscores
            .trim();

          const utterance = new SpeechSynthesisUtterance(cleanText);

          // Apply configuration
          utterance.voice = options?.voice || synthConfig.voice || null;
          utterance.rate = options?.rate || synthConfig.rate;
          utterance.pitch = options?.pitch || synthConfig.pitch;
          utterance.volume = options?.volume || synthConfig.volume;

          // Set up event handlers
          utterance.onstart = () => {
            setVoiceState((prev) => ({
              ...prev,
              isSpeaking: true,
              currentText: cleanText,
              error: null,
            }));
          };

          utterance.onend = () => {
            setVoiceState((prev) => ({
              ...prev,
              isSpeaking: false,
              lastSpoken: cleanText,
              currentText: "",
            }));
            resolve();
          };

          utterance.onerror = (event) => {
            setVoiceState((prev) => ({
              ...prev,
              isSpeaking: false,
              error: `Speech synthesis error: ${event.error}`,
              currentText: "",
            }));
            reject(new Error(event.error));
          };

          // Speak the text
          synthRef.current!.speak(utterance);
        } catch (error) {
          setVoiceState((prev) => ({
            ...prev,
            error: `Voice synthesis failed: ${error}`,
            isSpeaking: false,
          }));
          reject(error);
        }
      });
    },
    [synthConfig]
  );

  // 🎤 Start listening for voice commands
  const startListening = useCallback(() => {
    if (!recognitionRef.current || recognitionConfig.enabled) return;

    try {
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setVoiceState((prev) => ({
          ...prev,
          recognizedText: finalTranscript || interimTranscript,
        }));

        // Check for Simon Prime keywords
        const fullText = finalTranscript.toLowerCase();
        const hasKeyword = recognitionConfig.keywords.some((keyword) =>
          fullText.includes(keyword.toLowerCase())
        );

        if (hasKeyword && finalTranscript) {
          // TODO: Trigger Simon Prime response
          console.log(
            "🎤 Simon Prime voice command detected:",
            finalTranscript
          );
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        setVoiceState((prev) => ({
          ...prev,
          error: `Speech recognition error: ${event.error}`,
          isListening: false,
        }));
      };

      recognitionRef.current.onend = () => {
        setVoiceState((prev) => ({ ...prev, isListening: false }));
      };

      recognitionRef.current.start();
      setVoiceState((prev) => ({ ...prev, isListening: true, error: null }));
    } catch (error) {
      setVoiceState((prev) => ({
        ...prev,
        error: `Voice recognition failed: ${error}`,
        isListening: false,
      }));
    }
  }, [recognitionConfig]);

  // 🔇 Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState((prev) => ({ ...prev, isListening: false }));
  }, []);

  // 🔇 Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setVoiceState((prev) => ({ ...prev, isSpeaking: false, currentText: "" }));
  }, []);

  // 🎯 Toggle voice synthesis
  const toggleVoice = useCallback((enabled?: boolean) => {
    setSynthConfig((prev) => ({
      ...prev,
      enabled: enabled !== undefined ? enabled : !prev.enabled,
    }));
  }, []);

  // 🎤 Toggle voice recognition
  const toggleListening = useCallback(
    (enabled?: boolean) => {
      const newEnabled =
        enabled !== undefined ? enabled : !recognitionConfig.enabled;
      setRecognitionConfig((prev) => ({ ...prev, enabled: newEnabled }));

      if (newEnabled) {
        startListening();
      } else {
        stopListening();
      }
    },
    [recognitionConfig.enabled, startListening, stopListening]
  );

  // 🔊 Configure voice settings
  const configureVoice = useCallback((config: Partial<VoiceSynthConfig>) => {
    setSynthConfig((prev) => ({ ...prev, ...config }));
  }, []);

  // 🎸 Simon Prime specific voice methods
  const speakSimonResponse = useCallback(
    async (
      response: string,
      emotion?: "excited" | "professional" | "encouraging"
    ) => {
      const emotionalConfig = {
        excited: { rate: 0.85, pitch: 1.05, volume: 0.9 }, // Humor mode - slower pace, slightly higher pitch for character
        professional: { rate: 0.9, pitch: 0.95, volume: 0.8 }, // Professional - steady and authoritative
        encouraging: { rate: 0.9, pitch: 1.0, volume: 0.85 }, // Encouraging - warm and steady
      };

      const config = emotion ? emotionalConfig[emotion] : {};
      return speak(response, config);
    },
    [speak]
  );

  // 🎯 Get available voices for Simon
  const getAvailableVoices = useCallback(() => {
    if (!synthRef.current) return [];
    return synthRef.current.getVoices().filter(
      (voice) => voice.lang.startsWith("en") // English voices only
    );
  }, []);

  return {
    // State
    ...voiceState,
    synthConfig,
    recognitionConfig,

    // Voice Synthesis
    speak,
    speakSimonResponse,
    stopSpeaking,
    toggleVoice,
    configureVoice,
    getAvailableVoices,

    // Voice Recognition
    startListening,
    stopListening,
    toggleListening,

    // Utility
    isVoiceSupported: voiceState.isAvailable,
    canListen: !!recognitionRef.current,

    // TODO: Future methods for professional voice-over integration
    // loadProfessionalVoice: (audioFile: string) => {},
    // playAudioResponse: (audioFile: string) => {},
    // recordResponse: (text: string) => {},
  };
}

export default useSimonPrimeVoice;

// 🎤 FUTURE VOICE-OVER INTEGRATION NOTES:
//
// This hook is designed to be easily extensible for professional voice-over work:
//
// 1. TEXT-TO-SPEECH (Current):
//    - Web Speech API for testing
//    - Emotion-based voice modulation
//    - Clean text processing
//
// 2. PROFESSIONAL AUDIO (Future):
//    - Pre-recorded audio files for each response
//    - Dynamic audio loading based on response type
//    - High-quality voice actor recordings
//
// 3. VOICE COMMAND INTEGRATION:
//    - "Hey Simon" activation
//    - Context-aware command processing
//    - Integration with existing speech recognition
//
// 4. MADDEN-STYLE COMMENTARY:
//    - Multiple takes per response type
//    - Performance-based audio selection
//    - Real-time audio feedback during practice
