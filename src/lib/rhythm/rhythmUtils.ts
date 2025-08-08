// 🎵 Rhythm Utilities for Maestro-AI Music App
// File: /src/lib/rhythm/rhythmUtils.ts
// Comprehensive rhythm analysis, pattern generation, and timing utilities

export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatsPerMeasure: number;
  noteValue: number;
}

export interface BeatPattern {
  id: string;
  name: string;
  pattern: number[];
  timeSignature: TimeSignature;
  style: string;
  complexity: "beginner" | "intermediate" | "advanced";
}

export interface RhythmAnalysis {
  tempo: number;
  timeSignature: TimeSignature;
  beatPattern: number[];
  strongBeats: number[];
  syncopation: boolean;
  groove: string;
  confidence: number;
}

export interface MetronomeSettings {
  tempo: number;
  timeSignature: TimeSignature;
  accentPattern: boolean[];
  subdivisions: number;
  soundType: "click" | "beep" | "drum";
}

// Common time signatures
export const TIME_SIGNATURES: { [key: string]: TimeSignature } = {
  "4/4": { numerator: 4, denominator: 4, beatsPerMeasure: 4, noteValue: 4 },
  "3/4": { numerator: 3, denominator: 4, beatsPerMeasure: 3, noteValue: 4 },
  "2/4": { numerator: 2, denominator: 4, beatsPerMeasure: 2, noteValue: 4 },
  "6/8": { numerator: 6, denominator: 8, beatsPerMeasure: 6, noteValue: 8 },
  "9/8": { numerator: 9, denominator: 8, beatsPerMeasure: 9, noteValue: 8 },
  "12/8": { numerator: 12, denominator: 8, beatsPerMeasure: 12, noteValue: 8 },
  "5/4": { numerator: 5, denominator: 4, beatsPerMeasure: 5, noteValue: 4 },
  "7/8": { numerator: 7, denominator: 8, beatsPerMeasure: 7, noteValue: 8 },
};

// Standard rhythm patterns for Rock, Metal, Country, Blues/Rock, and Contemporary Christian
export const RHYTHM_PATTERNS: BeatPattern[] = [
  // ROCK PATTERNS
  {
    id: "rock-basic",
    name: "Basic Rock",
    pattern: [1, 0, 1, 0, 1, 0, 1, 0],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "rock",
    complexity: "beginner",
  },
  {
    id: "rock-driving",
    name: "Driving Rock",
    pattern: [1, 0, 1, 1, 1, 0, 1, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "rock",
    complexity: "intermediate",
  },
  {
    id: "rock-ballad",
    name: "Rock Ballad",
    pattern: [1, 0, 0, 1, 1, 0, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "rock",
    complexity: "beginner",
  },

  // METAL PATTERNS
  {
    id: "metal-thrash",
    name: "Thrash Metal",
    pattern: [1, 1, 0, 1, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "metal",
    complexity: "advanced",
  },
  {
    id: "metal-double-kick",
    name: "Double Kick",
    pattern: [1, 1, 1, 1, 1, 1, 1, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "metal",
    complexity: "advanced",
  },
  {
    id: "metal-progressive",
    name: "Progressive Metal",
    pattern: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["5/4"],
    style: "metal",
    complexity: "advanced",
  },
  {
    id: "metal-palm-mute",
    name: "Palm Muted Chug",
    pattern: [1, 0, 1, 0, 1, 0, 1, 0],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "metal",
    complexity: "intermediate",
  },

  // COUNTRY PATTERNS
  {
    id: "country-shuffle",
    name: "Country Shuffle",
    pattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["12/8"],
    style: "country",
    complexity: "intermediate",
  },
  {
    id: "country-waltz",
    name: "Country Waltz",
    pattern: [1, 0, 1, 0, 1, 0],
    timeSignature: TIME_SIGNATURES["3/4"],
    style: "country",
    complexity: "beginner",
  },
  {
    id: "country-train-beat",
    name: "Train Beat",
    pattern: [1, 1, 0, 1, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "country",
    complexity: "intermediate",
  },
  {
    id: "country-rock",
    name: "Country Rock",
    pattern: [1, 0, 1, 0, 1, 1, 1, 0],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "country",
    complexity: "intermediate",
  },

  // BLUES/ROCK PATTERNS
  {
    id: "blues-shuffle",
    name: "Blues Shuffle",
    pattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["12/8"],
    style: "blues-rock",
    complexity: "intermediate",
  },
  {
    id: "blues-rock-groove",
    name: "Blues Rock Groove",
    pattern: [1, 0, 1, 1, 1, 0, 1, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "blues-rock",
    complexity: "intermediate",
  },
  {
    id: "slow-blues",
    name: "Slow Blues",
    pattern: [1, 0, 0, 1, 1, 0, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "blues-rock",
    complexity: "beginner",
  },
  {
    id: "blues-swing",
    name: "Blues Swing",
    pattern: [1, 0, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["6/8"],
    style: "blues-rock",
    complexity: "intermediate",
  },

  // CONTEMPORARY CHRISTIAN PATTERNS
  {
    id: "worship-ballad",
    name: "Worship Ballad",
    pattern: [1, 0, 0, 1, 1, 0, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "contemporary-christian",
    complexity: "beginner",
  },
  {
    id: "contemporary-praise",
    name: "Contemporary Praise",
    pattern: [1, 0, 1, 0, 1, 1, 1, 0],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "contemporary-christian",
    complexity: "intermediate",
  },
  {
    id: "gospel-shuffle",
    name: "Gospel Shuffle",
    pattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["12/8"],
    style: "contemporary-christian",
    complexity: "intermediate",
  },
  {
    id: "anthemic-worship",
    name: "Anthemic Worship",
    pattern: [1, 1, 0, 1, 1, 1, 0, 1],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "contemporary-christian",
    complexity: "intermediate",
  },
  {
    id: "acoustic-worship",
    name: "Acoustic Worship",
    pattern: [1, 0, 1, 0, 1, 0, 1, 0],
    timeSignature: TIME_SIGNATURES["4/4"],
    style: "contemporary-christian",
    complexity: "beginner",
  },
];

/**
 * Convert BPM to milliseconds per beat
 */
export function bpmToMs(bpm: number, noteValue: number = 4): number {
  const quarterNoteMs = 60000 / bpm;
  return quarterNoteMs * (4 / noteValue);
}

/**
 * Convert milliseconds to BPM
 */
export function msToBpm(ms: number, noteValue: number = 4): number {
  const quarterNoteMs = ms / (4 / noteValue);
  return 60000 / quarterNoteMs;
}

/**
 * Calculate subdivision timing for metronome
 */
export function getSubdivisionTimings(
  tempo: number,
  timeSignature: TimeSignature,
  subdivisions: number = 1
): number[] {
  const beatInterval = bpmToMs(tempo, timeSignature.noteValue);
  const subdivisionInterval = beatInterval / subdivisions;

  const timings: number[] = [];
  for (let beat = 0; beat < timeSignature.beatsPerMeasure; beat++) {
    for (let sub = 0; sub < subdivisions; sub++) {
      timings.push(beat * beatInterval + sub * subdivisionInterval);
    }
  }

  return timings;
}

/**
 * Detect if a rhythm pattern has syncopation
 */
export function detectSyncopation(
  pattern: number[],
  timeSignature: TimeSignature
): boolean {
  const strongBeats = getStrongBeats(timeSignature);
  const patternLength = pattern.length;
  const beatsPerPattern = timeSignature.beatsPerMeasure;
  const subdivisions = patternLength / beatsPerPattern;

  // Check for accents on weak beats and weak accents on strong beats
  let syncopationCount = 0;

  for (let i = 0; i < pattern.length; i++) {
    const beatPosition = Math.floor(i / subdivisions);
    const isStrongBeat = strongBeats.includes(beatPosition);
    const hasAccent = pattern[i] === 1;
    const isOffBeat = i % subdivisions !== 0;

    // Syncopation: accent on off-beat or weak beat
    if (hasAccent && (isOffBeat || !isStrongBeat)) {
      syncopationCount++;
    }
  }

  return syncopationCount > 0;
}

/**
 * Get strong beats for a time signature
 */
export function getStrongBeats(timeSignature: TimeSignature): number[] {
  const { numerator, denominator } = timeSignature;

  // Default patterns for common time signatures
  switch (`${numerator}/${denominator}`) {
    case "4/4":
      return [0, 2]; // Beats 1 and 3
    case "3/4":
      return [0]; // Beat 1
    case "2/4":
      return [0]; // Beat 1
    case "6/8":
      return [0, 3]; // Beats 1 and 4
    case "9/8":
      return [0, 3, 6]; // Beats 1, 4, and 7
    case "12/8":
      return [0, 3, 6, 9]; // Beats 1, 4, 7, and 10
    default:
      return [0]; // Default to first beat
  }
}

/**
 * Generate a rhythm pattern based on style and complexity
 */
export function generateRhythmPattern(
  style: string,
  complexity: "beginner" | "intermediate" | "advanced",
  timeSignature: TimeSignature,
  length: number = 16
): number[] {
  const pattern: number[] = new Array(length).fill(0);
  const strongBeats = getStrongBeats(timeSignature);
  const beatsPerMeasure = timeSignature.beatsPerMeasure;
  const subdivisions = length / beatsPerMeasure;

  // Always accent strong beats
  strongBeats.forEach((beat) => {
    if (beat * subdivisions < length) {
      pattern[beat * subdivisions] = 1;
    }
  });

  // Add style-specific patterns
  switch (style.toLowerCase()) {
    case "rock":
      // Add backbeat (2 and 4 in 4/4)
      if (timeSignature.numerator === 4) {
        pattern[1 * subdivisions] = 1;
        pattern[3 * subdivisions] = 1;
      }
      break;

    case "metal":
      // Add aggressive patterns with more density
      if (complexity === "advanced") {
        for (let i = 0; i < length; i += 2) {
          if (Math.random() > 0.4) pattern[i] = 1;
        }
      }
      // Always accent beats 1 and 3 strongly
      if (timeSignature.numerator === 4) {
        pattern[0] = 1;
        pattern[2 * subdivisions] = 1;
      }
      break;

    case "country":
      // Add shuffle feel and train beat elements
      if (timeSignature.denominator === 8) {
        // Triplet feel for 12/8
        for (let i = 0; i < length; i += 3) {
          if (i + 2 < length) pattern[i + 2] = 1;
        }
      } else {
        // Add country shuffle on off-beats
        for (let i = 1; i < length; i += 4) {
          if (Math.random() > 0.5) pattern[i] = 1;
        }
      }
      break;

    case "blues-rock":
      // Add blues shuffle and swing elements
      if (timeSignature.denominator === 8) {
        // 12/8 shuffle pattern
        for (let i = 2; i < length; i += 3) {
          if (Math.random() > 0.6) pattern[i] = 1;
        }
      } else {
        // Add blues rock groove elements
        pattern[1 * subdivisions] = 1; // Backbeat
        pattern[3 * subdivisions] = 1; // Backbeat
        if (Math.random() > 0.7) pattern[Math.floor(length * 0.875)] = 1; // End fill
      }
      break;

    case "contemporary-christian":
      // Add contemporary worship elements
      if (timeSignature.numerator === 4) {
        pattern[1 * subdivisions] = 1; // Soft backbeat
        pattern[3 * subdivisions] = 1; // Soft backbeat
        // Add gentle syncopation for contemporary feel
        if (complexity !== "beginner" && Math.random() > 0.6) {
          pattern[Math.floor(length * 0.625)] = 1;
        }
      }
      break;
  }

  // Adjust complexity
  if (complexity === "advanced") {
    // Add more syncopation
    for (let i = 0; i < length; i++) {
      if (pattern[i] === 0 && Math.random() > 0.8) {
        pattern[i] = 1;
      }
    }
  } else if (complexity === "beginner") {
    // Simplify pattern
    for (let i = 0; i < length; i++) {
      if (pattern[i] === 1 && Math.random() > 0.7) {
        pattern[i] = 0;
      }
    }
  }

  return pattern;
}

/**
 * Analyze rhythm complexity
 */
export function analyzeRhythmComplexity(pattern: number[]): {
  score: number;
  level: "beginner" | "intermediate" | "advanced";
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  // Count total notes
  const noteCount = pattern.filter((beat) => beat === 1).length;
  const density = noteCount / pattern.length;

  if (density > 0.5) {
    score += 2;
    factors.push("High note density");
  }

  // Check for syncopation
  const hasSyncopation = pattern.some((beat, i) => beat === 1 && i % 2 !== 0);

  if (hasSyncopation) {
    score += 3;
    factors.push("Syncopation present");
  }

  // Check for irregularity
  const regularPattern = isRegularPattern(pattern);
  if (!regularPattern) {
    score += 2;
    factors.push("Irregular pattern");
  }

  let level: "beginner" | "intermediate" | "advanced";
  if (score <= 2) level = "beginner";
  else if (score <= 5) level = "intermediate";
  else level = "advanced";

  return { score, level, factors };
}

/**
 * Check if pattern follows a regular structure
 */
export function isRegularPattern(pattern: number[]): boolean {
  const halfLength = Math.floor(pattern.length / 2);
  const firstHalf = pattern.slice(0, halfLength);
  const secondHalf = pattern.slice(halfLength, halfLength * 2);

  return JSON.stringify(firstHalf) === JSON.stringify(secondHalf);
}

/**
 * Get swing timing adjustments
 */
export function getSwingTiming(
  straightTiming: number[],
  swingRatio: number = 0.67
): number[] {
  return straightTiming.map((time, index) => {
    if (index % 2 === 1) {
      // Adjust every second beat for swing feel
      const beatInterval = straightTiming[1] - straightTiming[0];
      return time + beatInterval * (swingRatio - 0.5);
    }
    return time;
  });
}

/**
 * Calculate tempo from tap inputs
 */
export function calculateTempoFromTaps(tapTimes: number[]): number {
  if (tapTimes.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < tapTimes.length; i++) {
    intervals.push(tapTimes[i] - tapTimes[i - 1]);
  }

  // Remove outliers (more than 50% different from median)
  const median = intervals.sort((a, b) => a - b)[
    Math.floor(intervals.length / 2)
  ];
  const filteredIntervals = intervals.filter(
    (interval) => Math.abs(interval - median) < median * 0.5
  );

  if (filteredIntervals.length === 0) return 0;

  const averageInterval =
    filteredIntervals.reduce((a, b) => a + b) / filteredIntervals.length;
  return Math.round(60000 / averageInterval);
}

/**
 * Quantize timing to nearest beat subdivision
 */
export function quantizeTiming(
  inputTiming: number[],
  tempo: number,
  subdivision: number = 16
): number[] {
  const beatInterval = bpmToMs(tempo);
  const subdivisionInterval = beatInterval / (subdivision / 4);

  return inputTiming.map((time) => {
    const nearestGrid =
      Math.round(time / subdivisionInterval) * subdivisionInterval;
    return nearestGrid;
  });
}

/**
 * Create metronome click pattern
 */
export function createMetronomePattern(settings: MetronomeSettings): {
  timings: number[];
  accents: boolean[];
  sounds: string[];
} {
  const { tempo, timeSignature, accentPattern, subdivisions, soundType } =
    settings;
  const timings = getSubdivisionTimings(tempo, timeSignature, subdivisions);
  const totalBeats = timeSignature.beatsPerMeasure * subdivisions;

  const accents: boolean[] = [];
  const sounds: string[] = [];

  for (let i = 0; i < totalBeats; i++) {
    const beatIndex = Math.floor(i / subdivisions);
    const isAccented = accentPattern[beatIndex] || false;

    accents.push(isAccented);
    sounds.push(isAccented ? `${soundType}-accent` : soundType);
  }

  return { timings, accents, sounds };
}

/**
 * Get rhythm pattern by style
 */
export function getRhythmPatternsByStyle(style: string): BeatPattern[] {
  return RHYTHM_PATTERNS.filter(
    (pattern) => pattern.style.toLowerCase() === style.toLowerCase()
  );
}

/**
 * Get rhythm patterns by complexity
 */
export function getRhythmPatternsByComplexity(
  complexity: "beginner" | "intermediate" | "advanced"
): BeatPattern[] {
  return RHYTHM_PATTERNS.filter((pattern) => pattern.complexity === complexity);
}

/**
 * Convert rhythm pattern to musical notation string
 */
export function patternToNotation(
  pattern: number[],
  timeSignature: TimeSignature
): string {
  const beatsPerMeasure = timeSignature.beatsPerMeasure;
  const subdivisions = pattern.length / beatsPerMeasure;

  let notation = "";

  for (let i = 0; i < pattern.length; i++) {
    if (i % subdivisions === 0 && i > 0) {
      notation += " | ";
    }

    notation += pattern[i] === 1 ? "X" : "-";

    if ((i + 1) % (subdivisions / 4) === 0 && (i + 1) % subdivisions !== 0) {
      notation += " ";
    }
  }

  return notation;
}

// Export all utilities as default
export default {
  bpmToMs,
  msToBpm,
  getSubdivisionTimings,
  detectSyncopation,
  getStrongBeats,
  generateRhythmPattern,
  analyzeRhythmComplexity,
  isRegularPattern,
  getSwingTiming,
  calculateTempoFromTaps,
  quantizeTiming,
  createMetronomePattern,
  getRhythmPatternsByStyle,
  getRhythmPatternsByComplexity,
  patternToNotation,
  TIME_SIGNATURES,
  RHYTHM_PATTERNS,
};
