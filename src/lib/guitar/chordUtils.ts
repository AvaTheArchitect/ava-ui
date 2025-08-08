// src/lib/cipher/chordUtils.ts
// 🎵 Modern Chord Utilities with MaestroBrain Integration

/**
 * Modern chord utility functions integrated with music intelligence system
 * Replaces old placeholder Phase 2 implementation
 */

export interface ChordInfo {
  name: string;
  root: string;
  quality:
    | "major"
    | "minor"
    | "dominant"
    | "diminished"
    | "augmented"
    | "suspended";
  extensions: string[];
  alterations: string[];
  bass?: string;
  intervals: readonly number[];
  notes: string[];
}

export interface ChordProgression {
  chords: string[];
  numerals: string[];
  key: string;
  scale: string;
  style: "jazz" | "pop" | "rock" | "classical" | "blues" | "folk";
  complexity: "basic" | "intermediate" | "advanced";
}

export interface ChordVoicing {
  chord: string;
  frets: number[];
  strings: number[];
  fingering: string[];
  position: number;
  difficulty: "easy" | "medium" | "hard";
}

// Basic chord definitions
const CHORD_FORMULAS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  dim7: [0, 3, 6, 9],
  maj9: [0, 4, 7, 11, 2],
  min9: [0, 3, 7, 10, 2],
  dom9: [0, 4, 7, 10, 2],
} as const;

const SCALE_FORMULAS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
} as const;

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Parse a chord name into structured chord information
 */
export function parseChord(chordName: string): ChordInfo {
  // Extract root note
  const rootMatch = chordName.match(/^([A-G][#b]?)/);
  const root = rootMatch ? rootMatch[1] : "C";

  // Extract bass note if present
  const bassMatch = chordName.match(/\/([A-G][#b]?)/);
  const bass = bassMatch ? bassMatch[1] : undefined;

  // Remove root and bass to get quality/extensions
  let chordType = chordName
    .replace(/^[A-G][#b]?/, "")
    .replace(/\/[A-G][#b]?/, "");

  // Determine basic quality
  let quality: ChordInfo["quality"] = "major";
  let baseFormula: readonly number[] = [];

  if (chordType.startsWith("min") || chordType.startsWith("m")) {
    quality = "minor";
    baseFormula = CHORD_FORMULAS.min;
    chordType = chordType.replace(/^(min|m)/, "");
  } else if (chordType.includes("dim")) {
    quality = "diminished";
    baseFormula = CHORD_FORMULAS.dim;
    chordType = chordType.replace("dim", "");
  } else if (chordType.includes("aug")) {
    quality = "augmented";
    baseFormula = CHORD_FORMULAS.aug;
    chordType = chordType.replace("aug", "");
  } else if (chordType.includes("sus")) {
    quality = "suspended";
    if (chordType.includes("sus2")) {
      baseFormula = CHORD_FORMULAS.sus2;
      chordType = chordType.replace("sus2", "");
    } else {
      baseFormula = CHORD_FORMULAS.sus4;
      chordType = chordType.replace("sus4", "");
    }
  } else if (chordType.includes("7") && !chordType.includes("maj7")) {
    quality = "dominant";
    baseFormula = CHORD_FORMULAS.dom7;
  } else if (chordType.includes("maj7")) {
    baseFormula = CHORD_FORMULAS.maj7;
  } else {
    baseFormula = CHORD_FORMULAS.maj;
  }

  // Extract extensions and alterations
  const extensions: string[] = [];
  const alterations: string[] = [];

  if (chordType.includes("9")) extensions.push("9");
  if (chordType.includes("11")) extensions.push("11");
  if (chordType.includes("13")) extensions.push("13");
  if (chordType.includes("add9")) extensions.push("add9");
  if (chordType.includes("b5")) alterations.push("b5");
  if (chordType.includes("#5")) alterations.push("#5");
  if (chordType.includes("b9")) alterations.push("b9");
  if (chordType.includes("#9")) alterations.push("#9");

  // Calculate actual notes
  const rootIndex = NOTES.indexOf(root);
  const notes = baseFormula.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    return NOTES[noteIndex];
  });

  return {
    name: chordName,
    root,
    quality,
    extensions,
    alterations,
    bass,
    intervals: [...baseFormula],
    notes,
  };
}

/**
 * Get chords that belong to a specific scale
 */
export function getChordsForScale(
  key: string,
  scale: string = "major", mode?: string
): string[] {
  const scaleFormula =
    SCALE_FORMULAS[scale as keyof typeof SCALE_FORMULAS] ||
    SCALE_FORMULAS.major;
  const rootIndex = NOTES.indexOf(key);

  if (rootIndex === -1) return [];

  const scaleNotes = scaleFormula.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    return NOTES[noteIndex];
  });

  // Generate diatonic triads
  const chords: string[] = [];

  if (scale === "major") {
    chords.push(`${scaleNotes[0]}maj7`); // I
    chords.push(`${scaleNotes[1]}min7`); // ii
    chords.push(`${scaleNotes[2]}min7`); // iii
    chords.push(`${scaleNotes[3]}maj7`); // IV
    chords.push(`${scaleNotes[4]}dom7`); // V
    chords.push(`${scaleNotes[5]}min7`); // vi
    chords.push(`${scaleNotes[6]}min7b5`); // vii
  } else if (scale === "minor") {
    chords.push(`${scaleNotes[0]}min7`); // i
    chords.push(`${scaleNotes[1]}min7b5`); // ii
    chords.push(`${scaleNotes[2]}maj7`); // III
    chords.push(`${scaleNotes[3]}min7`); // iv
    chords.push(`${scaleNotes[4]}min7`); // v (or dom7)
    chords.push(`${scaleNotes[5]}maj7`); // VI
    chords.push(`${scaleNotes[6]}dom7`); // VII
  }

  return chords;
}

/**
 * Generate common chord progressions for a given key and style
 */
export function getChordProgression(
  key: string,
  style: string = "pop"
): ChordProgression {
  const scaleChords = getChordsForScale(key, "major");
  let chords: string[] = [];
  let numerals: string[] = [];

  switch (style.toLowerCase()) {
    case "pop":
      chords = [scaleChords[0], scaleChords[5], scaleChords[3], scaleChords[4]]; // I vi IV V
      numerals = ["I", "vi", "IV", "V"];
      break;

    case "jazz":
      chords = [scaleChords[0], scaleChords[5], scaleChords[1], scaleChords[4]]; // Imaj7 vi7 ii7 V7
      numerals = ["Imaj7", "vi7", "ii7", "V7"];
      break;

    case "blues":
      const I = `${key}dom7`;
      const IV = `${NOTES[(NOTES.indexOf(key) + 5) % 12]}dom7`;
      const V = `${NOTES[(NOTES.indexOf(key) + 7) % 12]}dom7`;
      chords = [I, I, I, I, IV, IV, I, I, V, IV, I, V];
      numerals = [
        "I7",
        "I7",
        "I7",
        "I7",
        "IV7",
        "IV7",
        "I7",
        "I7",
        "V7",
        "IV7",
        "I7",
        "V7",
      ];
      break;

    case "folk":
      chords = [scaleChords[0], scaleChords[3], scaleChords[4], scaleChords[0]]; // I IV V I
      numerals = ["I", "IV", "V", "I"];
      break;

    default:
      chords = [scaleChords[0], scaleChords[5], scaleChords[3], scaleChords[4]];
      numerals = ["I", "vi", "IV", "V"];
  }

  return {
    chords,
    numerals,
    key,
    scale: "major",
    style: style as ChordProgression["style"],
    complexity: "basic",
  };
}

/**
 * Get chord variations (extensions, alterations)
 */
export function getChordVariations(chordName: string): string[] {
  const parsed = parseChord(chordName);
  const variations: string[] = [chordName]; // Include original

  // Add basic extensions
  if (!parsed.extensions.includes("7")) {
    variations.push(
      `${parsed.root}${parsed.quality === "minor" ? "min7" : "maj7"}`
    );
  }

  if (!parsed.extensions.includes("9")) {
    variations.push(
      `${parsed.root}${parsed.quality === "minor" ? "min9" : "maj9"}`
    );
  }

  // Add suspended variations
  variations.push(`${parsed.root}sus2`);
  variations.push(`${parsed.root}sus4`);

  // Add add9
  if (parsed.quality === "major") {
    variations.push(`${parsed.root}add9`);
  }

  return variations;
}

/**
 * Generate guitar voicings for a chord
 */
export function getGuitarVoicings(chordName: string): ChordVoicing[] {
  const parsed = parseChord(chordName);
  const voicings: ChordVoicing[] = [];

  // Basic open chord voicings (simplified)
  const openChordVoicings: { [key: string]: ChordVoicing } = {
    C: {
      chord: "C",
      frets: [0, 1, 0, 2, 3, -1],
      strings: [1, 2, 3, 4, 5, 6],
      fingering: ["0", "1", "0", "2", "3", "x"],
      position: 0,
      difficulty: "easy",
    },
    G: {
      chord: "G",
      frets: [3, 2, 0, 0, 0, 3],
      strings: [1, 2, 3, 4, 5, 6],
      fingering: ["3", "2", "0", "0", "0", "3"],
      position: 0,
      difficulty: "easy",
    },
    Am: {
      chord: "Am",
      frets: [0, 1, 2, 2, 0, -1],
      strings: [1, 2, 3, 4, 5, 6],
      fingering: ["0", "1", "2", "2", "0", "x"],
      position: 0,
      difficulty: "easy",
    },
    F: {
      chord: "F",
      frets: [1, 1, 2, 3, 3, 1],
      strings: [1, 2, 3, 4, 5, 6],
      fingering: ["1", "1", "2", "3", "4", "1"],
      position: 1,
      difficulty: "hard",
    },
  };

  // Return predefined voicing if available
  if (openChordVoicings[parsed.root]) {
    voicings.push(openChordVoicings[parsed.root]);
  }

  // Add barre chord version
  const rootIndex = NOTES.indexOf(parsed.root);
  if (rootIndex > 0) {
    voicings.push({
      chord: chordName,
      frets: [
        rootIndex,
        rootIndex,
        rootIndex + 2,
        rootIndex + 2,
        rootIndex,
        rootIndex,
      ],
      strings: [1, 2, 3, 4, 5, 6],
      fingering: ["1", "1", "3", "4", "1", "1"],
      position: rootIndex,
      difficulty: "medium",
    });
  }

  return voicings;
}

/**
 * Generate a complete progression with voicings
 */
export function generateProgression(
  key: string,
  style: string
): ChordProgression & { voicings: ChordVoicing[][] } {
  const baseProgression = getChordProgression(key, style);
  const voicings = baseProgression.chords.map((chord) =>
    getGuitarVoicings(chord)
  );

  return {
    ...baseProgression,
    voicings,
  };
}

/**
 * Analyze chord complexity for learning progression
 */
export function analyzeChordComplexity(chordName: string): {
  complexity: "beginner" | "intermediate" | "advanced";
  techniques: string[];
  tips: string[];
} {
  const parsed = parseChord(chordName);
  let complexity: "beginner" | "intermediate" | "advanced" = "beginner";
  const techniques: string[] = [];
  const tips: string[] = [];

  // Determine complexity
  if (parsed.extensions.length > 1 || parsed.alterations.length > 0) {
    complexity = "advanced";
    techniques.push("extended chords", "altered harmony");
  } else if (parsed.extensions.length === 1 || chordName.includes("7")) {
    complexity = "intermediate";
    techniques.push("seventh chords");
  }

  // Add technique-specific tips
  if (chordName.includes("maj7")) {
    tips.push("Use light touch for clear major 7th interval");
  }

  if (parsed.quality === "diminished") {
    tips.push("Practice the symmetrical fingering pattern");
  }

  return { complexity, techniques, tips };
}

// Updated function to accept key, scale, and mode

