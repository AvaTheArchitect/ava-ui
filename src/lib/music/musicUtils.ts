// src/lib/cipher/musicUtils.ts

// 🎵 MUSIC THEORY UTILITIES - Notes, Scales & Key Functions

export const NOTES = [
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

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  diatonic: [0, 2, 4, 5, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  blues: [0, 3, 5, 6, 7, 10],
  pentatonic: [0, 2, 4, 7, 9],
} as const;

// ✅ TypeScript types for better type safety
export type Note = (typeof NOTES)[number];
export type ScaleType = keyof typeof SCALES;

export function getScaleNotes(key: string, scale: string): string[] {
  const keyIndex = NOTES.indexOf(key);
  if (keyIndex === -1) return [];

  const scaleKey = scale.toLowerCase() as ScaleType;
  const scalePattern = SCALES[scaleKey] || SCALES.major;

  return scalePattern.map((interval) => {
    const noteIndex = (keyIndex + interval) % 12;
    return NOTES[noteIndex];
  });
} // ✅ Added missing closing brace

// ✅ Additional music theory utilities
export function isValidNote(note: string): note is Note {
  return NOTES.includes(note as Note);
}

export function isValidScale(scale: string): scale is ScaleType {
  return scale.toLowerCase() in SCALES;
}

export function getRelativeMinor(majorKey: string): string {
  const keyIndex = NOTES.indexOf(majorKey);
  if (keyIndex === -1) return "";

  const minorIndex = (keyIndex + 9) % 12; // Down a minor third
  return NOTES[minorIndex];
}

export function getRelativeMajor(minorKey: string): string {
  const keyIndex = NOTES.indexOf(minorKey);
  if (keyIndex === -1) return "";

  const majorIndex = (keyIndex + 3) % 12; // Up a minor third
  return NOTES[majorIndex];
}

export function transposeNote(note: string, semitones: number): string {
  const noteIndex = NOTES.indexOf(note);
  if (noteIndex === -1) return note;

  const newIndex = (noteIndex + semitones + 12) % 12;
  return NOTES[newIndex];
}

export function getChordTones(
  key: string,
  chordType: "major" | "minor" | "dom7" = "major"
): string[] {
  const keyIndex = NOTES.indexOf(key);
  if (keyIndex === -1) return [];

  const patterns = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    dom7: [0, 4, 7, 10],
  };

  const pattern = patterns[chordType];
  return pattern.map((interval) => {
    const noteIndex = (keyIndex + interval) % 12;
    return NOTES[noteIndex];
  });
}
