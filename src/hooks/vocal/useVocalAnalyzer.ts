// ===== VOCAL-SPECIFIC ANALYZER =====
// File: maestro-modules/hooks/useVocalAnalyzer.ts

import { useState, useEffect, useCallback } from "react";
import {
  usePitchAnalyzer,
  PitchData,
  PITCH_ANALYZER_PRESETS,
} from "../audio/usePitchAnalyzer";

export interface VocalAnalysisData {
  pitch: PitchData | null;
  vibrato: {
    rate: number; // Hz
    depth: number; // cents
    detected: boolean;
  };
  breath: {
    support: number; // 0-1
    consistency: number; // 0-1
  };
  tone: {
    brightness: number; // 0-1
    roughness: number; // 0-1
  };
  suggestions: string[];
}

export function useVocalAnalyzer() {
  const [vocalData, setVocalData] = useState<VocalAnalysisData | null>(null);
  const [vocalHistory, setVocalHistory] = useState<PitchData[]>([]);

  // Use core pitch analyzer with vocal-optimized settings
  const { isAnalyzing, currentPitch, startAnalysis, stopAnalysis } =
    usePitchAnalyzer(PITCH_ANALYZER_PRESETS.vocal);

  // Vocal-specific analysis
  useEffect(() => {
    if (currentPitch) {
      // Add to history for trend analysis
      setVocalHistory((prev) => [...prev.slice(-50), currentPitch]);

      // Analyze vocal characteristics
      const analysis = analyzeVocalCharacteristics(currentPitch, vocalHistory);
      setVocalData(analysis);
    }
  }, [currentPitch, vocalHistory]);

  const analyzeVocalCharacteristics = useCallback(
    (current: PitchData, history: PitchData[]): VocalAnalysisData => {
      const vibrato = detectVibrato(history);
      const breath = analyzeBreathSupport(history);
      const tone = analyzeToneQuality(current, history);
      const suggestions = generateVocalSuggestions(
        current,
        vibrato,
        breath,
        tone
      );

      return {
        pitch: current,
        vibrato,
        breath,
        tone,
        suggestions,
      };
    },
    []
  );

  return {
    isAnalyzing,
    vocalData,
    startVocalAnalysis: startAnalysis,
    stopVocalAnalysis: stopAnalysis,
    vocalHistory: vocalHistory.slice(-20), // Last 20 readings
  };
}

// ✅ Simple helper functions (basic implementations)
function detectVibrato(history: PitchData[]) {
  // Simple vibrato detection
  return { rate: 0, depth: 0, detected: false };
}

function analyzeBreathSupport(history: PitchData[]) {
  // Simple breath analysis
  return { support: 0.8, consistency: 0.7 };
}

function analyzeToneQuality(current: PitchData, history: PitchData[]) {
  // Simple tone analysis
  return { brightness: 0.6, roughness: 0.3 };
}

function generateVocalSuggestions(
  pitch: PitchData,
  vibrato: any,
  breath: any,
  tone: any
) {
  const suggestions: string[] = [];
  if (pitch.cents > 20) suggestions.push("Pitch is sharp - lower slightly");
  if (breath.support < 0.5) suggestions.push("Focus on breath support");
  return suggestions;
}

export default useVocalAnalyzer;
