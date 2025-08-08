// 🎸 Fretboard Utilities for Maestro-AI Guitar App
// File: /src/lib/guitar/fretUtils.ts
// Comprehensive fretboard calculations, chord fingerings, and guitar-specific utilities

export interface Tuning {
  name: string;
  notes: string[];
  description: string;
}

export interface FretPosition {
  string: number;
  fret: number;
  note: string;
  finger?: number; // 1-4 for fretting fingers
}

export interface ChordFingering {
  name: string;
  positions: FretPosition[];
  difficulty: "beginner" | "intermediate" | "advanced";
  barreChord: boolean;
  rootNote: string;
  quality: string;
  alternativeName?: string;
}

export interface ScalePattern {
  name: string;
  pattern: number[]; // Fret intervals from root
  positions: FretPosition[];
  box: number; // Scale box/position (1-5)
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface TabNotation {
  string: number;
  fret: number | "x"; // 'x' for muted string
  technique?: "hammer" | "pull" | "bend" | "slide" | "vibrato";
  duration?: number;
}

// Standard guitar tunings
export const GUITAR_TUNINGS: { [key: string]: Tuning } = {
  standard: {
    name: "Standard",
    notes: ["E", "A", "D", "G", "B", "E"],
    description: "Standard EADGBE tuning",
  },
  dropD: {
    name: "Drop D",
    notes: ["D", "A", "D", "G", "B", "E"],
    description: "Drop D tuning - low E down to D",
  },
  openG: {
    name: "Open G",
    notes: ["D", "G", "D", "G", "B", "D"],
    description: "Open G tuning for slide guitar",
  },
  openD: {
    name: "Open D",
    notes: ["D", "A", "D", "F#", "A", "D"],
    description: "Open D tuning",
  },
  halfStepDown: {
    name: "Half Step Down",
    notes: ["Eb", "Ab", "Db", "Gb", "Bb", "Eb"],
    description: "Standard tuning down a half step",
  },
  dadgad: {
    name: "DADGAD",
    notes: ["D", "A", "D", "G", "A", "D"],
    description: "Celtic DADGAD tuning",
  },
};

// Chromatic notes
const CHROMATIC_NOTES = [
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
const ENHARMONIC_NOTES: { [key: string]: string } = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

// Common chord fingerings for Rock, Metal, Country, Blues/Rock, Contemporary Christian
export const CHORD_FINGERINGS: ChordFingering[] = [
  // MAJOR CHORDS
  {
    name: "C",
    positions: [
      { string: 1, fret: 0, note: "E" },
      { string: 2, fret: 1, note: "C", finger: 1 },
      { string: 3, fret: 0, note: "G" },
      { string: 4, fret: 2, note: "E", finger: 2 },
      { string: 5, fret: 3, note: "C", finger: 3 },
      { string: 6, fret: -1, note: "x" }, // Muted
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "C",
    quality: "major",
  },
  {
    name: "G",
    positions: [
      { string: 1, fret: 3, note: "G", finger: 3 },
      { string: 2, fret: 0, note: "B" },
      { string: 3, fret: 0, note: "G" },
      { string: 4, fret: 0, note: "D" },
      { string: 5, fret: 2, note: "B", finger: 1 },
      { string: 6, fret: 3, note: "G", finger: 2 },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "G",
    quality: "major",
  },
  {
    name: "F",
    positions: [
      { string: 1, fret: 1, note: "F", finger: 1 },
      { string: 2, fret: 1, note: "C", finger: 1 },
      { string: 3, fret: 2, note: "A", finger: 2 },
      { string: 4, fret: 3, note: "F", finger: 3 },
      { string: 5, fret: 3, note: "C", finger: 4 },
      { string: 6, fret: 1, note: "F", finger: 1 },
    ],
    difficulty: "intermediate",
    barreChord: true,
    rootNote: "F",
    quality: "major",
  },

  // MINOR CHORDS
  {
    name: "Am",
    positions: [
      { string: 1, fret: 0, note: "E" },
      { string: 2, fret: 1, note: "C", finger: 1 },
      { string: 3, fret: 2, note: "A", finger: 2 },
      { string: 4, fret: 2, note: "E", finger: 3 },
      { string: 5, fret: 0, note: "A" },
      { string: 6, fret: -1, note: "x" },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "A",
    quality: "minor",
  },
  {
    name: "Em",
    positions: [
      { string: 1, fret: 0, note: "E" },
      { string: 2, fret: 0, note: "B" },
      { string: 3, fret: 0, note: "G" },
      { string: 4, fret: 2, note: "E", finger: 2 },
      { string: 5, fret: 2, note: "B", finger: 1 },
      { string: 6, fret: 0, note: "E" },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "E",
    quality: "minor",
  },

  // POWER CHORDS (Essential for Rock/Metal)
  {
    name: "E5",
    positions: [
      { string: 1, fret: -1, note: "x" },
      { string: 2, fret: -1, note: "x" },
      { string: 3, fret: -1, note: "x" },
      { string: 4, fret: 2, note: "E", finger: 2 },
      { string: 5, fret: 2, note: "B", finger: 1 },
      { string: 6, fret: 0, note: "E" },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "E",
    quality: "power",
  },
  {
    name: "A5",
    positions: [
      { string: 1, fret: -1, note: "x" },
      { string: 2, fret: -1, note: "x" },
      { string: 3, fret: -1, note: "x" },
      { string: 4, fret: 2, note: "A", finger: 2 },
      { string: 5, fret: 0, note: "A" },
      { string: 6, fret: -1, note: "x" },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "A",
    quality: "power",
  },

  // SEVENTH CHORDS (Blues/Rock essential)
  {
    name: "E7",
    positions: [
      { string: 1, fret: 0, note: "E" },
      { string: 2, fret: 0, note: "B" },
      { string: 3, fret: 1, note: "D", finger: 1 },
      { string: 4, fret: 0, note: "G" },
      { string: 5, fret: 2, note: "B", finger: 2 },
      { string: 6, fret: 0, note: "E" },
    ],
    difficulty: "beginner",
    barreChord: false,
    rootNote: "E",
    quality: "dominant7",
  },
];

/**
 * Convert sharp notes to flat equivalents (C# → Db)
 */
export function getEnharmonicEquivalent(note: string): string {
  return ENHARMONIC_NOTES[note] || note;
}

/**
 * Normalize note name (prefer flats in certain keys)
 */
export function normalizeNoteName(
  note: string,
  preferFlats: boolean = false
): string {
  if (preferFlats && ENHARMONIC_NOTES[note]) {
    return ENHARMONIC_NOTES[note];
  }
  return note;
}

/**
 * Calculate note at specific string and fret
 */
export function getNoteAtFret(
  string: number,
  fret: number,
  tuning: Tuning = GUITAR_TUNINGS.standard
): string {
  if (string < 1 || string > 6) {
    throw new Error("String number must be between 1 and 6");
  }

  const openNote = tuning.notes[string - 1];
  const openNoteIndex = CHROMATIC_NOTES.indexOf(openNote);

  if (openNoteIndex === -1) {
    throw new Error(`Invalid note: ${openNote}`);
  }

  const noteIndex = (openNoteIndex + fret) % 12;
  return CHROMATIC_NOTES[noteIndex];
}

/**
 * Find all positions of a specific note on the fretboard
 */
export function findNotePositions(
  note: string,
  maxFret: number = 12,
  tuning: Tuning = GUITAR_TUNINGS.standard
): FretPosition[] {
  const positions: FretPosition[] = [];
  const targetNoteIndex = CHROMATIC_NOTES.indexOf(note);

  if (targetNoteIndex === -1) {
    throw new Error(`Invalid note: ${note}`);
  }

  for (let string = 1; string <= 6; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const fretNote = getNoteAtFret(string, fret, tuning);
      if (CHROMATIC_NOTES.indexOf(fretNote) === targetNoteIndex) {
        positions.push({ string, fret, note: fretNote });
      }
    }
  }

  return positions;
}

/**
 * Generate scale pattern on fretboard
 */
export function generateScalePattern(
  rootNote: string,
  scaleIntervals: number[],
  startingFret: number = 0,
  tuning: Tuning = GUITAR_TUNINGS.standard
): ScalePattern {
  const positions: FretPosition[] = [];
  const rootNoteIndex = CHROMATIC_NOTES.indexOf(rootNote);

  if (rootNoteIndex === -1) {
    throw new Error(`Invalid root note: ${rootNote}`);
  }

  // Calculate scale notes
  const scaleNotes = scaleIntervals.map((interval) => {
    const noteIndex = (rootNoteIndex + interval) % 12;
    return CHROMATIC_NOTES[noteIndex];
  });

  // Find positions for each scale note
  scaleNotes.forEach((note) => {
    const notePositions = findNotePositions(note, startingFret + 5, tuning);
    positions.push(
      ...notePositions.filter(
        (pos) => pos.fret >= startingFret && pos.fret <= startingFret + 4
      )
    );
  });

  return {
    name: `${rootNote} Scale`,
    pattern: scaleIntervals,
    positions: positions.sort((a, b) => a.string - b.string || a.fret - b.fret),
    box: Math.floor(startingFret / 2) + 1,
    difficulty: positions.length > 15 ? "advanced" : "intermediate",
  };
}

/**
 * Calculate capo transposition
 */
export function transposeWithCapo(
  originalNote: string,
  capoFret: number
): string {
  const noteIndex = CHROMATIC_NOTES.indexOf(originalNote);
  if (noteIndex === -1) {
    throw new Error(`Invalid note: ${originalNote}`);
  }

  const newNoteIndex = (noteIndex + capoFret) % 12;
  return CHROMATIC_NOTES[newNoteIndex];
}

/**
 * Convert chord fingering to tab notation
 */
export function chordToTab(chord: ChordFingering): string {
  const strings = ["e", "B", "G", "D", "A", "E"]; // High to low
  let tab = "";

  // Add string names
  strings.forEach((str, index) => {
    const position = chord.positions.find(
      (pos) => pos.string === strings.length - index
    );
    const fret = position?.fret === -1 ? "x" : position?.fret || 0;
    tab += `${str}|--${fret}--|\n`;
  });

  return tab;
}

/**
 * Analyze chord difficulty
 */
export function analyzeChordDifficulty(chord: ChordFingering): {
  difficulty: "beginner" | "intermediate" | "advanced";
  factors: string[];
  score: number;
} {
  let score = 0;
  const factors: string[] = [];

  // Check for barre chord
  if (chord.barreChord) {
    score += 3;
    factors.push("Barre chord");
  }

  // Check finger stretch
  const frets = chord.positions
    .filter((pos) => pos.fret > 0)
    .map((pos) => pos.fret);

  if (frets.length > 0) {
    const fretSpan = Math.max(...frets) - Math.min(...frets);
    if (fretSpan > 3) {
      score += 2;
      factors.push("Wide finger stretch");
    }
  }

  // Check number of fingers required
  const fingersUsed = new Set(
    chord.positions.filter((pos) => pos.finger).map((pos) => pos.finger)
  ).size;

  if (fingersUsed >= 4) {
    score += 2;
    factors.push("Four finger chord");
  }

  // Check for awkward fingerings
  const hasHighFretOnLowString = chord.positions.some(
    (pos) => pos.string >= 5 && pos.fret >= 5
  );

  if (hasHighFretOnLowString) {
    score += 1;
    factors.push("High fret position");
  }

  let difficulty: "beginner" | "intermediate" | "advanced";
  if (score <= 1) difficulty = "beginner";
  else if (score <= 4) difficulty = "intermediate";
  else difficulty = "advanced";

  return { difficulty, factors, score };
}

/**
 * Generate power chord at any fret
 */
export function generatePowerChord(
  rootNote: string,
  fret: number,
  string: number = 6
): ChordFingering {
  const rootPosition: FretPosition = {
    string,
    fret,
    note: rootNote,
    finger: 1,
  };
  const fifthFret = fret + 2;
  const fifthNote = getNoteAtFret(string - 1, fifthFret);
  const fifthPosition: FretPosition = {
    string: string - 1,
    fret: fifthFret,
    note: fifthNote,
    finger: 3,
  };

  const positions: FretPosition[] = [rootPosition, fifthPosition];

  // Add muted strings
  for (let s = 1; s <= 6; s++) {
    if (s !== string && s !== string - 1) {
      positions.push({ string: s, fret: -1, note: "x" });
    }
  }

  return {
    name: `${rootNote}5`,
    positions,
    difficulty: "beginner",
    barreChord: false,
    rootNote,
    quality: "power",
  };
}

/**
 * Find chord by name
 */
export function findChordFingering(chordName: string): ChordFingering | null {
  return (
    CHORD_FINGERINGS.find(
      (chord) =>
        chord.name.toLowerCase() === chordName.toLowerCase() ||
        chord.alternativeName?.toLowerCase() === chordName.toLowerCase()
    ) || null
  );
}

/**
 * Get chords by difficulty level
 */
export function getChordsByDifficulty(
  difficulty: "beginner" | "intermediate" | "advanced"
): ChordFingering[] {
  return CHORD_FINGERINGS.filter((chord) => chord.difficulty === difficulty);
}

/**
 * Get chords by quality (major, minor, power, etc.)
 */
export function getChordsByQuality(quality: string): ChordFingering[] {
  return CHORD_FINGERINGS.filter((chord) => chord.quality === quality);
}

/**
 * Calculate fret distance for chord transitions
 */
export function calculateChordTransitionDifficulty(
  chord1: ChordFingering,
  chord2: ChordFingering
): {
  difficulty: "easy" | "moderate" | "hard";
  commonFingers: number;
  maxMovement: number;
} {
  const positions1 = chord1.positions.filter(
    (pos) => pos.finger && pos.fret > 0
  );
  const positions2 = chord2.positions.filter(
    (pos) => pos.finger && pos.fret > 0
  );

  let commonFingers = 0;
  let maxMovement = 0;

  positions1.forEach((pos1) => {
    const correspondingPos = positions2.find(
      (pos2) => pos2.finger === pos1.finger && pos2.string === pos1.string
    );

    if (correspondingPos) {
      if (correspondingPos.fret === pos1.fret) {
        commonFingers++;
      } else {
        const movement = Math.abs(correspondingPos.fret - pos1.fret);
        maxMovement = Math.max(maxMovement, movement);
      }
    } else {
      // Finger needs to move to different string/fret
      const movements = positions2.map(
        (pos2) =>
          Math.abs(pos2.fret - pos1.fret) + Math.abs(pos2.string - pos1.string)
      );
      maxMovement = Math.max(maxMovement, Math.min(...movements));
    }
  });

  let difficulty: "easy" | "moderate" | "hard";
  if (commonFingers >= 2 || maxMovement <= 2) difficulty = "easy";
  else if (commonFingers >= 1 || maxMovement <= 4) difficulty = "moderate";
  else difficulty = "hard";

  return { difficulty, commonFingers, maxMovement };
}

/**
 * Generate fretboard diagram data
 */
export function generateFretboardDiagram(
  startFret: number = 0,
  endFret: number = 12,
  highlightPositions: FretPosition[] = []
): {
  frets: number[];
  strings: string[];
  notes: string[][];
  highlights: boolean[][];
} {
  const frets = Array.from(
    { length: endFret - startFret + 1 },
    (_, i) => startFret + i
  );
  const strings = ["E", "B", "G", "D", "A", "E"]; // High to low
  const notes: string[][] = [];
  const highlights: boolean[][] = [];

  strings.forEach((_, stringIndex) => {
    const stringNotes: string[] = [];
    const stringHighlights: boolean[] = [];

    frets.forEach((fret) => {
      const note = getNoteAtFret(6 - stringIndex, fret);
      const isHighlighted = highlightPositions.some(
        (pos) => pos.string === 6 - stringIndex && pos.fret === fret
      );

      stringNotes.push(note);
      stringHighlights.push(isHighlighted);
    });

    notes.push(stringNotes);
    highlights.push(stringHighlights);
  });

  return { frets, strings, notes, highlights };
}

// Major scale intervals (for reference)
export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
export const PENTATONIC_MAJOR_INTERVALS = [0, 2, 4, 7, 9];
export const PENTATONIC_MINOR_INTERVALS = [0, 3, 5, 7, 10];
export const BLUES_SCALE_INTERVALS = [0, 3, 5, 6, 7, 10];

// Export all utilities as default
export default {
  getEnharmonicEquivalent,
  normalizeNoteName,
  getNoteAtFret,
  findNotePositions,
  generateScalePattern,
  transposeWithCapo,
  chordToTab,
  analyzeChordDifficulty,
  generatePowerChord,
  findChordFingering,
  getChordsByDifficulty,
  getChordsByQuality,
  calculateChordTransitionDifficulty,
  generateFretboardDiagram,
  GUITAR_TUNINGS,
  CHORD_FINGERINGS,
  CHROMATIC_NOTES,
  MAJOR_SCALE_INTERVALS,
  MINOR_SCALE_INTERVALS,
  PENTATONIC_MAJOR_INTERVALS,
  PENTATONIC_MINOR_INTERVALS,
  BLUES_SCALE_INTERVALS,
};
