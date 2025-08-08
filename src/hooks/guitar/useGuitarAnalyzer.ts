// ===== GUITAR-SPECIFIC ANALYZER =====
// File: maestro-modules/hooks/useGuitarAnalyzer.ts

import { useState, useEffect, useCallback } from "react";
import { usePitchAnalyzer, PitchData } from "../audio/usePitchAnalyzer";

// ===== INTERFACES =====

interface GuitarString {
  note: string;
  frequency: number;
  inTune: boolean;
  cents: number;
  confidence: number;
}

interface ChordDetection {
  detected: string | null;
  confidence: number;
  suggestions: string[];
}

interface GuitarTuning {
  overall: number; // 0-1
  outOfTune: number[];
}

export interface GuitarAnalysisData {
  strings: {
    [key: number]: GuitarString;
  };
  chord: ChordDetection;
  tuning: GuitarTuning;
}

interface GuitarTuningConfig {
  name: string;
  strings: { [key: number]: { note: string; frequency: number } };
}

// ===== GUITAR TUNINGS =====

export const GUITAR_TUNINGS: { [key: string]: GuitarTuningConfig } = {
  standard: {
    name: "Standard (E-A-D-G-B-E)",
    strings: {
      1: { note: "E", frequency: 329.63 }, // High E
      2: { note: "B", frequency: 246.94 },
      3: { note: "G", frequency: 196.0 },
      4: { note: "D", frequency: 146.83 },
      5: { note: "A", frequency: 110.0 },
      6: { note: "E", frequency: 82.41 }, // Low E
    },
  },
  dropD: {
    name: "Drop D (D-A-D-G-B-E)",
    strings: {
      1: { note: "E", frequency: 329.63 },
      2: { note: "B", frequency: 246.94 },
      3: { note: "G", frequency: 196.0 },
      4: { note: "D", frequency: 146.83 },
      5: { note: "A", frequency: 110.0 },
      6: { note: "D", frequency: 73.42 }, // Dropped low D
    },
  },
};

// ===== CHORD PATTERNS =====

const CHORD_PATTERNS: { [key: string]: string[] } = {
  // Major chords
  C: ["C", "E", "G"],
  D: ["D", "F#", "A"],
  E: ["E", "G#", "B"],
  F: ["F", "A", "C"],
  G: ["G", "B", "D"],
  A: ["A", "C#", "E"],

  // Minor chords
  Am: ["A", "C", "E"],
  Dm: ["D", "F", "A"],
  Em: ["E", "G", "B"],

  // Power chords
  C5: ["C", "G"],
  D5: ["D", "A"],
  E5: ["E", "B"],
  G5: ["G", "D"],
  A5: ["A", "E"],
};

// ===== MAIN HOOK =====

export function useGuitarAnalyzer(
  tuning: keyof typeof GUITAR_TUNINGS = "standard"
) {
  const [guitarData, setGuitarData] = useState<GuitarAnalysisData | null>(null);
  const [multiPitchHistory, setMultiPitchHistory] = useState<PitchData[]>([]);
  const [currentTuning, setCurrentTuning] = useState<GuitarTuningConfig>(
    GUITAR_TUNINGS[tuning]
  );

  // Use core pitch analyzer with guitar-optimized settings
  const {
    isAnalyzing,
    currentPitch,
    startAnalysis,
    stopAnalysis,
    detectPitch,
  } = usePitchAnalyzer({
    fftSize: 4096, // Good balance for guitar harmonics
    smoothingTimeConstant: 0.9, // More smoothing for chord detection
    minDecibels: -70, // Less sensitive than vocals
  });

  // Guitar-specific multi-pitch detection
  const detectGuitarPitches = useCallback(
    (audioBuffer: Float32Array) => {
      // Basic implementation - can be enhanced later
      const harmonics = extractHarmonics(audioBuffer);
      return harmonics
        .map((harmonic) => detectPitch(harmonic.buffer))
        .filter(Boolean) as PitchData[];
    },
    [detectPitch]
  );

  // Guitar-specific analysis
  useEffect(() => {
    if (currentPitch) {
      setMultiPitchHistory((prev) => [...prev.slice(-30), currentPitch]);

      const analysis = analyzeGuitarCharacteristics(
        currentPitch,
        multiPitchHistory
      );
      setGuitarData(analysis);
    }
  }, [currentPitch, multiPitchHistory, currentTuning]);

  // Change tuning
  const changeTuning = useCallback((newTuning: keyof typeof GUITAR_TUNINGS) => {
    setCurrentTuning(GUITAR_TUNINGS[newTuning]);
  }, []);

  return {
    isAnalyzing,
    guitarData,
    startGuitarAnalysis: startAnalysis,
    stopGuitarAnalysis: stopAnalysis,
    detectGuitarPitches,
    changeTuning,
    currentTuning,
    availableTunings: Object.keys(
      GUITAR_TUNINGS
    ) as (keyof typeof GUITAR_TUNINGS)[],
    pitchHistory: multiPitchHistory.slice(-20),
  };
}

// ===== HELPER FUNCTIONS =====

function identifyStringFromPitch(
  pitch: PitchData,
  tuning: GuitarTuningConfig
): number | null {
  const freq = pitch.frequency;

  // Find the closest string by frequency
  let closestString = null;
  let smallestDiff = Infinity;

  Object.entries(tuning.strings).forEach(([stringNum, config]) => {
    const diff = Math.abs(freq - config.frequency);
    if (diff < smallestDiff && diff < 50) {
      // Within 50Hz tolerance
      smallestDiff = diff;
      closestString = parseInt(stringNum);
    }
  });

  return closestString;
}

function analyzeGuitarCharacteristics(
  current: PitchData,
  history: PitchData[]
): GuitarAnalysisData {
  const strings: { [key: number]: GuitarString } = {};

  // Analyze each string
  for (let i = 1; i <= 6; i++) {
    const stringConfig = GUITAR_TUNINGS.standard.strings[i];
    const recentPitches = history
      .filter((p) => Math.abs(p.frequency - stringConfig.frequency) < 50)
      .slice(-5);

    if (recentPitches.length > 0) {
      const latestPitch = recentPitches[recentPitches.length - 1];
      strings[i] = {
        note: latestPitch.note,
        frequency: latestPitch.frequency,
        inTune: Math.abs(latestPitch.cents) <= 10,
        cents: latestPitch.cents,
        confidence: latestPitch.confidence,
      };
    } else {
      strings[i] = {
        note: stringConfig.note,
        frequency: 0,
        inTune: false,
        cents: 0,
        confidence: 0,
      };
    }
  }

  // Detect chord
  const chord = detectChord(history.slice(-10));

  // Calculate tuning
  const inTuneStrings = Object.values(strings).filter((s) => s.inTune).length;
  const overallTuning = inTuneStrings / 6;
  const outOfTune = Object.entries(strings)
    .filter(([_, string]) => !string.inTune && string.frequency > 0)
    .map(([num, _]) => parseInt(num));

  return {
    strings,
    chord,
    tuning: {
      overall: overallTuning,
      outOfTune,
    },
  };
}

function detectChord(recentHistory: PitchData[]): ChordDetection {
  if (recentHistory.length < 2) {
    return {
      detected: null,
      confidence: 0,
      suggestions: ["Play multiple notes to detect chords"],
    };
  }

  // Get unique notes from recent history
  const notes = [...new Set(recentHistory.map((p) => p.note))];

  if (notes.length < 2) {
    return {
      detected: null,
      confidence: 0,
      suggestions: ["Play multiple different notes for chord detection"],
    };
  }

  // Check against known chord patterns
  let bestMatch = {
    chord: null as string | null,
    confidence: 0,
  };

  Object.entries(CHORD_PATTERNS).forEach(([chordName, chordNotes]) => {
    const matches = chordNotes.filter((note) => notes.includes(note)).length;
    const confidence = matches / chordNotes.length;

    if (confidence > bestMatch.confidence && confidence >= 0.6) {
      bestMatch = {
        chord: chordName,
        confidence,
      };
    }
  });

  const suggestions = [];
  if (bestMatch.chord) {
    const missingNotes = CHORD_PATTERNS[bestMatch.chord].filter(
      (note) => !notes.includes(note)
    );
    if (missingNotes.length > 0) {
      suggestions.push(
        `Missing notes for perfect ${bestMatch.chord}: ${missingNotes.join(
          ", "
        )}`
      );
    } else {
      suggestions.push(`Perfect ${bestMatch.chord} chord detected!`);
    }
  } else {
    suggestions.push("Try playing a recognized chord pattern");
  }

  return {
    detected: bestMatch.chord,
    confidence: bestMatch.confidence,
    suggestions,
  };
}

function extractHarmonics(
  buffer: Float32Array
): Array<{ buffer: Float32Array }> {
  // Basic implementation - return the original buffer for now
  // This can be enhanced with actual harmonic extraction later
  return [{ buffer }];
}

export default useGuitarAnalyzer;
