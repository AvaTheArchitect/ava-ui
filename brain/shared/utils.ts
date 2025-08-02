/**
 * 🛠️ Maestro-AI Brain Shared Utilities
 * ====================================
 * File: brain/shared/utils.ts
 *
 * Central utility functions for the brain modules with music theory extensions
 */

import {
  Key,
  ChordProgression,
  ChordInfo,
  MusicGenre,
  GenreCharacteristics,
  AudioFeatures,
  ChordQuality,
  ChordDifficulty,
  ChordVoicing,
  FretPosition,
} from "./types";

// ========================================
// 🧠 EXISTING BRAIN UTILITIES (Enhanced)
// ========================================

export const generateId = (prefix: string = "id"): string => {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 11)}`;
};

export const formatTimestamp = (date: Date): string => {
  return date.toISOString().replace("T", " ").substring(0, 19);
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Enhanced chord utilities (from your existing code)
export const isChordChromatic = (chord: string): boolean => {
  return chord.includes("#") || chord.includes("b");
};

export const parseChordRoot = (chord: string): string => {
  return chord.replace(/[^A-G#b]/g, "");
};

// ========================================
// 🎼 MUSIC THEORY CONSTANTS & UTILITIES
// ========================================

// Note and Scale Constants
export const CHROMATIC_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const CIRCLE_OF_FIFTHS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "Ab",
  "Eb",
  "Bb",
  "F",
] as const;

export const OCTAVE_SEMITONES = 12;
export const CHROMATIC_SCALE_LENGTH = 12;

// Scale Interval Patterns
export const SCALE_PATTERNS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonicMajor: [0, 2, 4, 7, 9],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 3, 5, 7, 9, 11],
} as const;

// Type for chord intervals that might have seventh
type ChordIntervals = {
  third: number;
  fifth: number;
  seventh?: number;
  ninth?: number;
};

// ✅ FIXED: Updated CHORD_INTERVALS to include ALL ChordQuality enum values
export const CHORD_INTERVALS: Record<ChordQuality, ChordIntervals> = {
  [ChordQuality.MAJOR]: { third: 4, fifth: 7 },
  [ChordQuality.MINOR]: { third: 3, fifth: 7 },
  [ChordQuality.DIMINISHED]: { third: 3, fifth: 6 },
  [ChordQuality.AUGMENTED]: { third: 4, fifth: 8 },
  [ChordQuality.SUS2]: { third: 2, fifth: 7 },
  [ChordQuality.SUS4]: { third: 5, fifth: 7 },
  [ChordQuality.SEVENTH]: { third: 4, fifth: 7, seventh: 10 },
  [ChordQuality.MAJ7]: { third: 4, fifth: 7, seventh: 11 },
  [ChordQuality.MIN7]: { third: 3, fifth: 7, seventh: 10 },
  [ChordQuality.DIM7]: { third: 3, fifth: 6, seventh: 9 },
  [ChordQuality.AUG7]: { third: 4, fifth: 8, seventh: 10 },
  // ✅ Added missing enum values
  [ChordQuality.DOMINANT7]: { third: 4, fifth: 7, seventh: 10 },
  [ChordQuality.MAJOR7]: { third: 4, fifth: 7, seventh: 11 },
  [ChordQuality.MINOR7]: { third: 3, fifth: 7, seventh: 10 },
  [ChordQuality.MINOR7B5]: { third: 3, fifth: 6, seventh: 10 },
  [ChordQuality.DIMINISHED7]: { third: 3, fifth: 6, seventh: 9 },
  [ChordQuality.SUSPENDED2]: { third: 2, fifth: 7 },
  [ChordQuality.SUSPENDED4]: { third: 5, fifth: 7 },
  [ChordQuality.ADD9]: { third: 4, fifth: 7, ninth: 14 },
  [ChordQuality.POWER]: { third: 0, fifth: 7 }, // Power chords don't have thirds
};

// Key Analysis Scoring Weights
export const KEY_ANALYSIS_WEIGHTS = {
  TONIC_SCORE: 3,
  DOMINANT_SCORE: 2,
  SCALE_NOTE_SCORE: 1,
  MODE_BONUS_SCORE: 0.5,
} as const;

// Tempo Classification Thresholds (BPM)
export const TEMPO_THRESHOLDS = {
  VERY_SLOW: 60,
  SLOW: 80,
  MODERATE: 100,
  FAST: 140,
  VERY_FAST: 180,
} as const;

// Audio Analysis Constants
export const AUDIO_ANALYSIS = {
  CONFIDENCE_ADJUSTMENT: 0.8,
  MIN_CONFIDENCE: 0.1,
  MAX_CONFIDENCE: 1.0,
  DEFAULT_SAMPLE_RATE: 44100,
  DEFAULT_BUFFER_SIZE: 1024,
} as const;

// Genre Complexity Step Probabilities
export const STEP_PROBABILITIES = {
  simple: 0.8,
  moderate: 0.6,
  complex: 0.4,
} as const;

// Default Values
export const DEFAULTS = {
  SUGGESTION_COUNT: 6,
  MELODY_LENGTH: 8,
  CHORD_PROGRESSION_LENGTH: 4,
  START_ON_FIFTH_PROBABILITY: 0.7,
  STEP_DIRECTION_PROBABILITY: 0.5,
  tempo: 120, // Added default tempo
} as const;

// Roman Numeral Mappings
export const ROMAN_NUMERALS = {
  major: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
  minor: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
} as const;

export const NUMERAL_TO_INDEX = {
  I: 0,
  i: 0,
  ii: 1,
  II: 1,
  iii: 2,
  III: 2,
  IV: 3,
  iv: 3,
  V: 4,
  v: 4,
  vi: 5,
  VI: 5,
  vii: 6,
  VII: 6,
} as const;

// Function Analysis
export const HARMONIC_FUNCTIONS = {
  TONIC: ["I", "i", "vi", "VI"],
  SUBDOMINANT: ["IV", "iv", "ii", "ii°"],
  DOMINANT: ["V", "v", "vii°", "VII"],
} as const;

// Key Signature Constants
export const KEY_SIGNATURES = {
  SHARP_KEYS: ["C", "G", "D", "A", "E", "B", "F#"],
  FLAT_KEYS: ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"],
  CIRCLE_MIDPOINT: 6,
  MINOR_KEY_ADJUSTMENT: 3,
} as const;

// ✅ FIXED: Updated CHORD_QUALITIES to use enum values
export const CHORD_QUALITIES = {
  MAJOR: ChordQuality.MAJOR,
  MINOR: ChordQuality.MINOR,
  DIMINISHED: ChordQuality.DIMINISHED,
  AUGMENTED: ChordQuality.AUGMENTED,
  DOMINANT_7: ChordQuality.DOMINANT7,
  MINOR_7: ChordQuality.MINOR7,
  MAJOR_7: ChordQuality.MAJOR7,
  SUS_2: ChordQuality.SUS2,
  SUS_4: ChordQuality.SUS4,
  ADD_9: ChordQuality.ADD9,
  SIXTH: ChordQuality.MAJOR, // Simplified mapping
  MINOR_SIXTH: ChordQuality.MINOR, // Simplified mapping
} as const;

// Cadence Patterns
export const CADENCE_PATTERNS = {
  AUTHENTIC: [
    ["V", "I"],
    ["v", "i"],
  ],
  PLAGAL: [
    ["IV", "I"],
    ["iv", "i"],
  ],
  DECEPTIVE: [
    ["V", "vi"],
    ["v", "VI"],
  ],
  HALF: [
    ["I", "V"],
    ["i", "V"],
  ],
} as const;

// Guitar-specific constants
export const GUITAR_TUNING = {
  STANDARD: ["E", "A", "D", "G", "B", "E"],
  DROP_D: ["D", "A", "D", "G", "B", "E"],
  DADGAD: ["D", "A", "D", "G", "A", "D"],
} as const;

// ✅ FIXED: Updated GENRE_CHARACTERISTICS to include ALL MusicGenre enum values
export const GENRE_CHARACTERISTICS: Record<MusicGenre, GenreCharacteristics> = {
  [MusicGenre.ROCK]: {
    commonProgressions: [
      ["I", "V", "vi", "IV"],
      ["vi", "IV", "I", "V"],
    ],
    preferredKeys: ["E", "A", "D", "G", "C"],
    typicalChords: ["I", "IV", "V", "vi", "iii"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "driving", "syncopated"],
    modalInterchange: true,
    complexity: "moderate",
    tempo: 120,
  },
  [MusicGenre.POP]: {
    commonProgressions: [
      ["I", "V", "vi", "IV"],
      ["vi", "IV", "I", "V"],
    ],
    preferredKeys: ["C", "G", "F", "Am", "Em"],
    typicalChords: ["I", "IV", "V", "vi"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "catchy", "accessible"],
    modalInterchange: false,
    complexity: "simple",
    tempo: 120,
  },
  [MusicGenre.JAZZ]: {
    commonProgressions: [
      ["ii", "V", "I"],
      ["I", "vi", "ii", "V"],
    ],
    preferredKeys: ["Bb", "F", "C", "G", "D"],
    typicalChords: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    avoidedChords: [],
    rhythmFeatures: ["4/4", "swing", "complex"],
    modalInterchange: true,
    complexity: "complex",
    tempo: 120,
  },
  [MusicGenre.COUNTRY]: {
    commonProgressions: [
      ["I", "IV", "V", "I"],
      ["I", "V", "vi", "IV"],
    ],
    preferredKeys: ["G", "C", "D", "A", "E"],
    typicalChords: ["I", "IV", "V", "vi"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "shuffle", "straight"],
    modalInterchange: false,
    complexity: "simple",
    tempo: 120,
  },
  [MusicGenre.METAL]: {
    commonProgressions: [
      ["i", "VII", "VI"],
      ["i", "iv", "V"],
    ],
    preferredKeys: ["Em", "Dm", "Am", "Bm"],
    typicalChords: ["i", "iv", "V", "VI", "VII"],
    avoidedChords: [],
    rhythmFeatures: ["4/4", "aggressive", "palm-muted"],
    modalInterchange: true,
    complexity: "complex",
    tempo: 140,
  },
  // ✅ ADDED: Missing BLUES genre (mapped from BLUES_ROCK)
  [MusicGenre.BLUES]: {
    commonProgressions: [
      ["I", "IV", "V"],
      ["I", "I", "IV", "I", "V", "IV", "I", "V"],
    ],
    preferredKeys: ["E", "A", "B", "G"],
    typicalChords: ["I7", "IV7", "V7"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "shuffle", "blues"],
    modalInterchange: true,
    complexity: "moderate",
    tempo: 120,
  },
  // ✅ ADDED: Missing BLUES_ROCK genre
  [MusicGenre.BLUES_ROCK]: {
    commonProgressions: [
      ["I", "IV", "V"],
      ["I", "I", "IV", "I", "V", "IV", "I", "V"],
      ["i", "bVII", "IV", "i"],
    ],
    preferredKeys: ["E", "A", "B", "G", "C", "F"],
    typicalChords: ["I7", "IV7", "V7", "power chords"],
    avoidedChords: ["maj7", "sus2"],
    rhythmFeatures: ["4/4", "shuffle", "driving rhythm"],
    modalInterchange: true,
    complexity: "moderate",
    tempo: 120,
  },
  [MusicGenre.FOLK]: {
    commonProgressions: [
      ["I", "IV", "V", "I"],
      ["vi", "IV", "I", "V"],
    ],
    preferredKeys: ["G", "C", "D", "Am", "Em"],
    typicalChords: ["I", "IV", "V", "vi"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "3/4", "simple"],
    modalInterchange: false,
    complexity: "simple",
    tempo: 100,
  },
  [MusicGenre.CLASSICAL]: {
    commonProgressions: [
      ["I", "IV", "V", "I"],
      ["i", "iv", "V", "i"],
    ],
    preferredKeys: ["C", "G", "D", "F", "Bb", "Am", "Em"],
    typicalChords: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    avoidedChords: [],
    rhythmFeatures: ["4/4", "3/4", "complex"],
    modalInterchange: true,
    complexity: "complex",
    tempo: 120,
  },
  [MusicGenre.CONTEMPORARY_CHRISTIAN]: {
    commonProgressions: [
      ["I", "V", "vi", "IV"],
      ["vi", "IV", "I", "V"],
    ],
    preferredKeys: ["G", "C", "D", "A", "F"],
    typicalChords: ["I", "IV", "V", "vi"],
    avoidedChords: ["ii°", "vii°"],
    rhythmFeatures: ["4/4", "uplifting", "anthemic"],
    modalInterchange: false,
    complexity: "simple",
    tempo: 110,
  },
};

// Music utility type exports
export type ScalePatternKey = keyof typeof SCALE_PATTERNS;
export type ChordQualityKey = keyof typeof CHORD_QUALITIES;
export type ChromaticNote = (typeof CHROMATIC_NOTES)[number];

// ========================================
// 🎵 MUSIC-SPECIFIC UTILITY FUNCTIONS
// ========================================

export function frequencyToMidi(frequency: number): number {
  return 12 * Math.log2(frequency / 440) + 69;
}

export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function noteToMidi(note: string): number {
  const noteMap: { [key: string]: number } = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
  };

  const noteName = note.substring(0, note.length - 1);
  const octave = parseInt(note.slice(-1));

  if (!(noteName in noteMap) || isNaN(octave)) {
    throw new Error(`Invalid note format: ${note}`);
  }

  return noteMap[noteName] + (octave + 1) * 12;
}

export function midiToNote(midiNote: number): string {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const octave = Math.floor(midiNote / 12) - 1;
  const note = noteNames[midiNote % 12];
  return `${note}${octave}`;
}

// Note name utilities
export function normalizeNoteName(note: string): string {
  // Convert flat notes to sharp equivalents for consistency
  const noteMap: { [key: string]: string } = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };

  return noteMap[note] || note;
}

export function getNoteSemitones(note: string): number {
  const normalizedNote = normalizeNoteName(note);
  return CHROMATIC_NOTES.indexOf(normalizedNote as ChromaticNote);
}

export function transposeNote(note: string, semitones: number): string {
  const noteIndex = getNoteSemitones(note);
  if (noteIndex === -1) throw new Error(`Invalid note: ${note}`);

  const newIndex = mod(noteIndex + semitones, 12);
  return CHROMATIC_NOTES[newIndex] as string;
}

export function getIntervalBetweenNotes(note1: string, note2: string): number {
  const semitones1 = getNoteSemitones(note1);
  const semitones2 = getNoteSemitones(note2);

  if (semitones1 === -1 || semitones2 === -1) {
    throw new Error(`Invalid notes: ${note1}, ${note2}`);
  }

  return mod(semitones2 - semitones1, 12);
}

// ✅ FIXED: Updated parseChord to return enum values
export function parseChord(chord: string): {
  root: string;
  quality: ChordQuality;
} {
  // Extract root note (including sharps/flats)
  const rootMatch = chord.match(/^[A-G][#b]?/);
  if (!rootMatch) throw new Error(`Invalid chord: ${chord}`);

  const root = rootMatch[0];
  const suffix = chord.substring(root.length);

  // ✅ FIXED: Map suffixes to ChordQuality enum values
  const qualityMap: { [key: string]: ChordQuality } = {
    "": ChordQuality.MAJOR,
    m: ChordQuality.MINOR,
    "°": ChordQuality.DIMINISHED,
    dim: ChordQuality.DIMINISHED,
    "+": ChordQuality.AUGMENTED,
    aug: ChordQuality.AUGMENTED,
    sus2: ChordQuality.SUS2,
    sus4: ChordQuality.SUS4,
    "7": ChordQuality.SEVENTH,
    maj7: ChordQuality.MAJ7,
    m7: ChordQuality.MIN7,
    dim7: ChordQuality.DIM7,
    aug7: ChordQuality.AUG7,
  };

  const quality = qualityMap[suffix] || ChordQuality.MAJOR;

  return { root, quality };
}

export function getChordNotes(chord: string): string[] {
  const { root, quality } = parseChord(chord);
  const rootSemitones = getNoteSemitones(root);

  if (rootSemitones === -1) throw new Error(`Invalid chord root: ${root}`);

  const intervals = CHORD_INTERVALS[quality];
  if (!intervals) throw new Error(`Unknown chord quality: ${quality}`);

  const notes = [root];

  // Add third (skip for power chords)
  if (intervals.third > 0) {
    const thirdSemitones = mod(rootSemitones + intervals.third, 12);
    notes.push(CHROMATIC_NOTES[thirdSemitones] as string);
  }

  // Add fifth
  const fifthSemitones = mod(rootSemitones + intervals.fifth, 12);
  notes.push(CHROMATIC_NOTES[fifthSemitones] as string);

  // Add seventh if present
  if (intervals.seventh !== undefined) {
    const seventhSemitones = mod(rootSemitones + intervals.seventh, 12);
    notes.push(CHROMATIC_NOTES[seventhSemitones] as string);
  }

  return notes;
}

// ✅ FIXED: Updated createChordInfo to use enum values
export function createChordInfo(
  chord: string,
  fretPositions: FretPosition[] = []
): ChordInfo {
  const { root, quality } = parseChord(chord);
  const notes = getChordNotes(chord);
  const intervals = CHORD_INTERVALS[quality];

  // Convert chord intervals object to array format
  const intervalArray: number[] = [];
  if (intervals.third > 0) intervalArray.push(intervals.third);
  intervalArray.push(intervals.fifth);
  if (intervals.seventh !== undefined) {
    intervalArray.push(intervals.seventh);
  }

  return {
    id: generateId("chord"),
    name: chord,
    root,
    quality,
    intervals: intervalArray,
    notes,
    fretPositions,
    difficulty: ChordDifficulty.INTERMEDIATE, // ✅ FIXED: Use enum
    voicing: ChordVoicing.OPEN, // ✅ FIXED: Use enum
  };
}

// Scale utilities
export function getScaleNotes(
  key: string,
  scaleType: ScalePatternKey = "major"
): string[] {
  const { root } = parseChord(key);
  const rootSemitones = getNoteSemitones(root);

  if (rootSemitones === -1) throw new Error(`Invalid key: ${key}`);

  const pattern = SCALE_PATTERNS[scaleType];

  return pattern.map((interval) => {
    const noteSemitones = mod(rootSemitones + interval, 12);
    return CHROMATIC_NOTES[noteSemitones] as string;
  });
}

// Key analysis utilities
export function identifyKey(chords: string[]): Key {
  const noteFrequency: { [note: string]: number } = {};

  // Count note occurrences in all chords
  chords.forEach((chord) => {
    const notes = getChordNotes(chord);
    notes.forEach((note) => {
      noteFrequency[note] = (noteFrequency[note] || 0) + 1;
    });
  });

  // Find the most likely tonic
  let bestKey = "C";
  let bestScore = 0;

  CHROMATIC_NOTES.forEach((tonic) => {
    const majorScore = calculateKeyScore(noteFrequency, tonic, "major");
    const minorScore = calculateKeyScore(noteFrequency, tonic, "minor");

    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = tonic;
    }

    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = `${tonic}m`;
    }
  });

  const isMinor = bestKey.includes("m");
  return {
    tonic: bestKey.replace("m", ""),
    mode: isMinor ? "minor" : "major",
    signature: getKeySignature(bestKey),
  };
}

function calculateKeyScore(
  noteFreq: { [note: string]: number },
  tonic: string,
  mode: "major" | "minor"
): number {
  const scaleNotes = getScaleNotes(tonic, mode);
  let score = 0;

  scaleNotes.forEach((note, index) => {
    const frequency = noteFreq[note] || 0;

    // Weight tonic and dominant more heavily
    if (index === 0) score += frequency * KEY_ANALYSIS_WEIGHTS.TONIC_SCORE;
    else if (index === 4)
      score += frequency * KEY_ANALYSIS_WEIGHTS.DOMINANT_SCORE;
    else score += frequency * KEY_ANALYSIS_WEIGHTS.SCALE_NOTE_SCORE;
  });

  return score;
}

function getKeySignature(key: string): string {
  // Simplified key signature calculation
  const keyMap: { [key: string]: string } = {
    C: "0",
    G: "1#",
    D: "2#",
    A: "3#",
    E: "4#",
    B: "5#",
    "F#": "6#",
    F: "1b",
    Bb: "2b",
    Eb: "3b",
    Ab: "4b",
    Db: "5b",
    Gb: "6b",
  };

  const rootKey = key.replace("m", "");
  return keyMap[rootKey] || "0";
}

// Roman numeral utilities for ChordAnalyzer
export function chordToRomanNumeral(chord: string, key: string): string {
  const keyInfo = identifyKey([key]);
  const keyNotes = getScaleNotes(keyInfo.tonic, keyInfo.mode);
  const { root } = parseChord(chord);

  const rootIndex = keyNotes.indexOf(root);
  if (rootIndex === -1) return chord; // Not in key

  return ROMAN_NUMERALS[keyInfo.mode][rootIndex] || chord;
}

export function romanNumeralToChord(numeral: string, key: string): string {
  const keyInfo = identifyKey([key]);
  const keyNotes = getScaleNotes(keyInfo.tonic, keyInfo.mode);

  // Find the index for this roman numeral using findIndex (works with readonly arrays)
  const numeralIndex = ROMAN_NUMERALS[keyInfo.mode].findIndex(
    (rn) => rn === numeral
  );
  if (numeralIndex === -1) return numeral; // Invalid numeral

  const rootNote = keyNotes[numeralIndex];

  // Determine chord quality based on roman numeral case and symbols
  let quality = "";
  if (numeral.includes("°")) quality = "°";
  else if (numeral.includes("+")) quality = "+";
  else if (numeral === numeral.toLowerCase()) quality = "m";

  return `${rootNote}${quality}`;
}

// Mathematical utilities for music theory
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

// ========================================
// 🔊 AUDIO PROCESSING UTILITIES
// ========================================

// Audio processing utilities
export function normalizeAudioBuffer(buffer: Float32Array): Float32Array {
  const max = Math.max(...Array.from(buffer).map(Math.abs));
  if (max === 0) return buffer;

  return buffer.map((sample) => sample / max);
}

export function calculateRMS(buffer: Float32Array): number {
  const sum = buffer.reduce((acc, sample) => acc + sample * sample, 0);
  return Math.sqrt(sum / buffer.length);
}

// Enhanced audio features creation
export function createAudioFeatures(
  params: Partial<AudioFeatures>
): AudioFeatures {
  return {
    tempo: params.tempo || 120,
    key: params.key || "C",
    loudness: params.loudness || 0,
    pitch: params.pitch || [440], // Default to A4
    rhythm: params.rhythm || ["4/4"],
    confidence: params.confidence || 0.8,
    duration: params.duration || 0,
    frequency: params.frequency || 440, // Added for ChordAnalyzer compatibility
    timeSignature: params.timeSignature || "4/4",
    energy: params.energy || 0.5,
    valence: params.valence || 0.5,
    danceability: params.danceability || 0.5,
    acousticness: params.acousticness || 0.5,
    instrumentalness: params.instrumentalness || 0.5,
    spectralCentroid: params.spectralCentroid,
    zeroCrossingRate: params.zeroCrossingRate,
    mfcc: params.mfcc,
  };
}

// ========================================
// 🛠️ GENERAL UTILITY FUNCTIONS
// ========================================

// Enhanced ID generation with collision detection
export function generateUniqueId(
  prefix: string = "id",
  existingIds: Set<string> = new Set()
): string {
  let id: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    id = generateId(prefix);
    attempts++;

    if (attempts >= maxAttempts) {
      // Fallback with microsecond precision
      const microTime = performance.now().toString().replace(".", "");
      id = `${prefix}-${microTime}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;
      break;
    }
  } while (existingIds.has(id));

  return id;
}

// Array utilities
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

// Timing and performance utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Validation utilities
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
  return isValidNumber(value) && value >= min && value <= max;
}

// Object utilities
export function mergeDeep<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = mergeDeep(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[typeof key];
      }
    }
  }

  return result;
}

// ========================================
// 🎸 GUITAR-SPECIFIC UTILITIES
// ========================================

// ✅ FIXED: Updated createGuitarChord to use enum values and include 'note' property
export function createGuitarChord(
  name: string,
  frets: number[],
  difficulty: ChordDifficulty = ChordDifficulty.INTERMEDIATE
): ChordInfo {
  const { root, quality } = parseChord(name);
  const notes = getChordNotes(name);

  // ✅ FIXED: Convert fret numbers to FretPosition objects with proper 'note' property
  const fretPositions: FretPosition[] = frets.map((fret, stringIndex) => {
    let note = "";
    if (fret >= 0 && notes.length > 0) {
      // Calculate the actual note for this string and fret
      const openStringNotes = ["E", "A", "D", "G", "B", "E"]; // Standard tuning
      const openNote = openStringNotes[stringIndex] || "E";
      note = fret === 0 ? openNote : transposeNote(openNote, fret);
    }

    return {
      string: stringIndex + 1,
      fret: fret,
      note: note,
      ...(stringIndex === 0 && { isRoot: true }), // Mark first position as root
    };
  });

  // Determine voicing based on fret positions
  const maxFret = Math.max(...frets.filter((f) => f > 0));
  const minFret = Math.min(...frets.filter((f) => f > 0));
  const voicing =
    maxFret - minFret > 3 ? ChordVoicing.OPEN : ChordVoicing.BARRE;

  const intervals = CHORD_INTERVALS[quality];
  const intervalArray: number[] = [];
  if (intervals.third > 0) intervalArray.push(intervals.third);
  intervalArray.push(intervals.fifth);
  if (intervals.seventh !== undefined) {
    intervalArray.push(intervals.seventh);
  }

  return {
    id: generateId("guitar-chord"),
    name,
    root,
    quality,
    intervals: intervalArray,
    notes,
    fretPositions,
    difficulty,
    voicing,
  };
}

// ✅ FIXED: Updated analyzeChordDifficulty to return enum values
export function analyzeChordDifficulty(
  fretPositions: FretPosition[]
): ChordDifficulty {
  const frets = fretPositions.map((pos) => pos.fret);
  const maxFret = Math.max(...frets.filter((f) => f > 0));
  const minFret = Math.min(...frets.filter((f) => f > 0));
  const spread = maxFret - minFret;
  const barreCount = frets.filter(
    (fret, index) => fret > 0 && frets.slice(index + 1).includes(fret)
  ).length;

  if (maxFret <= 3 && spread <= 2 && barreCount === 0)
    return ChordDifficulty.BEGINNER;
  if (maxFret <= 5 && spread <= 3 && barreCount <= 1)
    return ChordDifficulty.INTERMEDIATE;
  if (maxFret <= 12 && spread <= 4) return ChordDifficulty.ADVANCED;
  return ChordDifficulty.EXPERT;
}

// ========================================
// 🎼 PROGRESSION UTILITIES
// ========================================

export function generateProgressionForGenre(
  key: string,
  genre: MusicGenre,
  length: number = 4
): ChordProgression {
  const characteristics = GENRE_CHARACTERISTICS[genre];
  const keyInfo = identifyKey([key]);

  // Pick a random common progression for this genre
  const progressions = characteristics.commonProgressions;
  const chosenProgression =
    progressions[Math.floor(Math.random() * progressions.length)];

  // Convert roman numerals to actual chords
  const chords = chosenProgression
    .slice(0, length)
    .map((numeral) => romanNumeralToChord(numeral, key));

  return {
    numerals: chosenProgression.slice(0, length),
    chords,
    key,
    genre,
    commonality: "common",
    emotional: getProgressionEmotion(chosenProgression, keyInfo.mode),
    romanNumerals: chosenProgression.slice(0, length),
  };
}

function getProgressionEmotion(
  numerals: string[],
  mode: "major" | "minor"
): "happy" | "sad" | "tense" | "resolved" | "mysterious" | "powerful" {
  // Simple emotion mapping based on progression patterns
  const progressionString = numerals.join("-");

  if (mode === "minor") {
    if (progressionString.includes("V")) return "tense";
    if (progressionString.includes("i")) return "sad";
    return "mysterious";
  }

  if (progressionString.includes("V-I")) return "resolved";
  if (progressionString.includes("vi")) return "sad";
  if (progressionString.includes("V")) return "powerful";

  return "happy";
}

// ========================================
// 🔧 ERROR HANDLING UTILITIES
// ========================================

// Error handling utilities
export class BrainError extends Error {
  public readonly code: string;
  public readonly context?: any;
  public readonly timestamp: number;

  constructor(code: string, message: string, context?: any) {
    super(message);
    this.name = "BrainError";
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }
}

export function createErrorHandler(moduleName: string) {
  return (error: Error, context?: any) => {
    const brainError = new BrainError(
      `${moduleName.toUpperCase()}_ERROR`,
      `[${moduleName}] ${error.message}`,
      { originalError: error, context }
    );

    console.error("Brain Module Error:", brainError);
    return brainError;
  };
}

// ========================================
// 📊 LOGGING UTILITIES
// ========================================

// Logging utilities
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export function createLogger(
  moduleName: string,
  level: LogLevel = LogLevel.INFO
): Logger {
  const log = (logLevel: LogLevel, message: string, ...args: any[]) => {
    if (logLevel >= level) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[logLevel];
      console.log(
        `[${timestamp}] ${levelName} [${moduleName}] ${message}`,
        ...args
      );
    }
  };

  return {
    debug: (message: string, ...args: any[]) =>
      log(LogLevel.DEBUG, message, ...args),
    info: (message: string, ...args: any[]) =>
      log(LogLevel.INFO, message, ...args),
    warn: (message: string, ...args: any[]) =>
      log(LogLevel.WARN, message, ...args),
    error: (message: string, ...args: any[]) =>
      log(LogLevel.ERROR, message, ...args),
  };
}

// ========================================
// ⚙️ CONFIGURATION UTILITIES
// ========================================

// Configuration utilities
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new BrainError(
      "ENV_VAR_MISSING",
      `Environment variable ${key} is required`
    );
  }
  return value;
}

export function parseEnvBoolean(
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

export function parseEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new BrainError(
      "ENV_VAR_MISSING",
      `Environment variable ${key} is required`
    );
  }

  const parsed = Number(value);
  if (isNaN(parsed)) {
    throw new BrainError(
      "ENV_VAR_INVALID",
      `Environment variable ${key} must be a number`
    );
  }

  return parsed;
}

// ========================================
// 💾 CACHE UTILITIES
// ========================================

// Cache utilities
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries first
    const now = Date.now(); // ← Missing this line!
    const keysToDelete: string[] = [];
    const cacheEntries = Array.from(this.cache.entries());

    for (let i = 0; i < cacheEntries.length; i++) {
      const [key, item] = cacheEntries[i];
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }

    // ← Missing the actual deletion loop!
    for (let i = 0; i < keysToDelete.length; i++) {
      this.cache.delete(keysToDelete[i]);
    }

    return this.cache.size;
  }
}

// Export commonly used instances
export const sharedCache = new SimpleCache();
export const musicTheoryLogger = createLogger("MusicTheory", LogLevel.INFO);
