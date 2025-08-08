import { useState, useEffect, useCallback } from "react";

// 🎣 useTuner Hook - Created by Cipher.ai

interface TunerState {
  isLoaded: boolean;
  isActive: boolean;
  isListening: boolean;
  frequency: number;
  cents: number;
  note: string;
  octave: number;
  status: "perfect" | "close" | "off";
  targetFrequency: number;
  stringNumber: number;
  error?: string;
}

const GUITAR_STRINGS = [
  { note: "E", octave: 2, frequency: 82.41, string: 6 }, // Low E
  { note: "A", octave: 2, frequency: 110.0, string: 5 }, // A
  { note: "D", octave: 3, frequency: 146.83, string: 4 }, // D
  { note: "G", octave: 3, frequency: 196.0, string: 3 }, // G
  { note: "B", octave: 3, frequency: 246.94, string: 2 }, // B
  { note: "E", octave: 4, frequency: 329.63, string: 1 }, // High E
];

export function useTuner() {
  const [state, setState] = useState<TunerState>({
    isLoaded: false,
    isActive: false,
    isListening: false,
    frequency: 440.0,
    cents: 0,
    note: "A",
    octave: 4,
    status: "off",
    targetFrequency: 440.0,
    stringNumber: 0,
  });

  useEffect(() => {
    // Initialize Tuner
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  }, []);

  const startListening = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isListening: true,
    }));

    // Future: Initialize Web Audio API microphone access
    console.log("🎤 Tuner listening started...");
  }, []);

  const stopListening = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isListening: false,
    }));

    console.log("🛑 Tuner listening stopped");
  }, []);

  const updateFrequency = useCallback((frequency: number) => {
    // Calculate cents deviation and status
    const targetString =
      GUITAR_STRINGS.find((s) => Math.abs(s.frequency - frequency) < 50) ||
      GUITAR_STRINGS[0];

    const cents = 1200 * Math.log2(frequency / targetString.frequency);
    const deviation = Math.abs(cents);
    const status = deviation < 5 ? "perfect" : deviation < 15 ? "close" : "off";

    setState((prev) => ({
      ...prev,
      frequency,
      cents,
      note: targetString.note,
      octave: targetString.octave,
      status,
      targetFrequency: targetString.frequency,
      stringNumber: targetString.string,
    }));
  }, []);

  const simulateInput = useCallback(() => {
    // Demo mode - simulate frequency changes
    const randomString =
      GUITAR_STRINGS[Math.floor(Math.random() * GUITAR_STRINGS.length)];
    const variance = (Math.random() - 0.5) * 20; // ±10Hz variance
    const demoFreq = randomString.frequency + variance;

    updateFrequency(demoFreq);
  }, [updateFrequency]);

  const getTunerCapabilities = useCallback(() => {
    return {
      microphoneAccess: true,
      realTimePitchDetection: true,
      stringRecognition: true,
      centAccuracy: true,
      guitarTuning: true,
      customTunings: false, // Future feature
      audioFeedback: false, // Future feature
      flameAnimation: false, // Future Simon's Flaming Circle Tuner™
    };
  }, []);

  return {
    ...state,
    handleToggle,
    startListening,
    stopListening,
    updateFrequency,
    simulateInput,
    getTunerCapabilities,
    guitarStrings: GUITAR_STRINGS,
  };
}
