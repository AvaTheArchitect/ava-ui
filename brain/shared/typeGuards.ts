/**
 * 🛡️ Maestro-AI Brain Shared Type Guards
 * ======================================
 * File: brain/shared/typeGuards.ts
 *
 * Type validation functions for runtime type safety.
 * Fixed all TypeScript errors and added music theory type guards.
 */

// Import only the types we actually use (fixes unused import errors)
import type {
  AudioFeatures,
  GuitarAnalysis,
  VocalAnalysis,
  IntelligenceRequest,
  SystemEvent,
  // Music theory types
  Key,
  ChordProgression,
  MusicTheoryHarmonyAnalysis,
  Scale,
  GenreCharacteristics,
  UserPreferences,
  CompositionRequest,
} from "./types";
import { MusicGenre } from "./types";

// ========================================
// 🧠 EXISTING BRAIN TYPE GUARDS (Fixed)
// ========================================

export const isAudioFeatures = (obj: unknown): obj is AudioFeatures => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as AudioFeatures).tempo === "number" &&
    typeof (obj as AudioFeatures).confidence === "number" &&
    typeof (obj as AudioFeatures).key === "string"
  );
};

export const isVocalAnalysis = (obj: unknown): obj is VocalAnalysis => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as VocalAnalysis).pitch_accuracy === "number" &&
    typeof (obj as VocalAnalysis).rhythm_accuracy === "number" &&
    typeof (obj as VocalAnalysis).tone_quality === "number" &&
    typeof (obj as VocalAnalysis).breath_control === "number" &&
    typeof (obj as VocalAnalysis).difficulty === "string"
  );
};

export const isGuitarAnalysis = (obj: unknown): obj is GuitarAnalysis => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as GuitarAnalysis).chordProgression === "string" &&
    Array.isArray((obj as GuitarAnalysis).strummingPatterns) &&
    Array.isArray((obj as GuitarAnalysis).tuning)
  );
};

export const isIntelligenceRequest = (
  obj: unknown
): obj is IntelligenceRequest => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    ["analyze", "generate", "learn", "recommend"].includes(
      (obj as IntelligenceRequest).type
    )
  );
};

export const isSystemEvent = (obj: unknown): obj is SystemEvent => {
  return (
    obj !== null &&
    typeof obj === "object" &&
    typeof (obj as SystemEvent).id === "string" &&
    typeof (obj as SystemEvent).type === "string" &&
    typeof (obj as SystemEvent).source === "string" &&
    (obj as SystemEvent).timestamp instanceof Date
  );
};

// ========================================
// 🎼 MUSIC THEORY TYPE GUARDS (New)
// ========================================

// Core music type guards
export function isValidKey(key: unknown): key is Key {
  return (
    typeof key === "object" &&
    key !== null &&
    typeof (key as Key).tonic === "string" &&
    ((key as Key).mode === "major" || (key as Key).mode === "minor") &&
    typeof (key as Key).signature === "string"
  );
}

export function isValidChordProgression(
  progression: unknown
): progression is ChordProgression {
  return (
    typeof progression === "object" &&
    progression !== null &&
    Array.isArray((progression as ChordProgression).numerals) &&
    Array.isArray((progression as ChordProgression).chords) &&
    typeof (progression as ChordProgression).key === "string" &&
    typeof (progression as ChordProgression).genre === "string" &&
    typeof (progression as ChordProgression).commonality === "string" &&
    typeof (progression as ChordProgression).emotional === "string"
  );
}

export function isValidMusicGenre(genre: unknown): genre is MusicGenre {
  const validGenres: MusicGenre[] = [
    MusicGenre.ROCK,
    MusicGenre.METAL,
    MusicGenre.COUNTRY,
    MusicGenre.BLUES_ROCK,
    MusicGenre.CONTEMPORARY_CHRISTIAN,
    MusicGenre.JAZZ,
    MusicGenre.POP,
    MusicGenre.FOLK,
    MusicGenre.CLASSICAL,
  ];
  return typeof genre === "string" && validGenres.includes(genre as MusicGenre);
}

export function isValidScale(scale: unknown): scale is Scale {
  return (
    typeof scale === "object" &&
    scale !== null &&
    typeof (scale as Scale).name === "string" &&
    Array.isArray((scale as Scale).intervals) &&
    Array.isArray((scale as Scale).notes) &&
    Array.isArray((scale as Scale).chords) &&
    Array.isArray((scale as Scale).modes)
  );
}

export function isValidMusicTheoryHarmonyAnalysis(
  analysis: unknown
): analysis is MusicTheoryHarmonyAnalysis {
  return (
    typeof analysis === "object" &&
    analysis !== null &&
    isValidKey((analysis as MusicTheoryHarmonyAnalysis).key) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).chords) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).numerals) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).functions) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).cadences) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).modulations) &&
    Array.isArray((analysis as MusicTheoryHarmonyAnalysis).nonChordTones) &&
    typeof (analysis as MusicTheoryHarmonyAnalysis).confidence === "number"
  );
}

export function isValidGenreCharacteristics(
  characteristics: unknown
): characteristics is GenreCharacteristics {
  return (
    typeof characteristics === "object" &&
    characteristics !== null &&
    Array.isArray(
      (characteristics as GenreCharacteristics).commonProgressions
    ) &&
    Array.isArray((characteristics as GenreCharacteristics).preferredKeys) &&
    Array.isArray((characteristics as GenreCharacteristics).typicalChords) &&
    Array.isArray((characteristics as GenreCharacteristics).avoidedChords) &&
    Array.isArray((characteristics as GenreCharacteristics).rhythmFeatures) &&
    typeof (characteristics as GenreCharacteristics).modalInterchange ===
      "boolean" &&
    ((characteristics as GenreCharacteristics).complexity === "simple" ||
      (characteristics as GenreCharacteristics).complexity === "moderate" ||
      (characteristics as GenreCharacteristics).complexity === "complex")
  );
}

export function isValidUserPreferences(
  preferences: unknown
): preferences is UserPreferences {
  return (
    typeof preferences === "object" &&
    preferences !== null &&
    Array.isArray((preferences as UserPreferences).favoriteGenres) &&
    (preferences as UserPreferences).favoriteGenres.every((genre: unknown) =>
      isValidMusicGenre(genre)
    ) &&
    ((preferences as UserPreferences).skillLevel === "beginner" ||
      (preferences as UserPreferences).skillLevel === "intermediate" ||
      (preferences as UserPreferences).skillLevel === "advanced" ||
      (preferences as UserPreferences).skillLevel === "expert") &&
    Array.isArray((preferences as UserPreferences).instruments) &&
    Array.isArray((preferences as UserPreferences).favoriteKeys) &&
    Array.isArray((preferences as UserPreferences).practiceGoals)
  );
}

export function isValidCompositionRequest(
  request: unknown
): request is CompositionRequest {
  return (
    typeof request === "object" &&
    request !== null &&
    typeof (request as CompositionRequest).key === "string" &&
    isValidMusicGenre((request as CompositionRequest).genre) &&
    typeof (request as CompositionRequest).tempo === "number" &&
    typeof (request as CompositionRequest).timeSignature === "string" &&
    typeof (request as CompositionRequest).length === "number" &&
    Array.isArray((request as CompositionRequest).instruments) &&
    typeof (request as CompositionRequest).mood === "string" &&
    ((request as CompositionRequest).complexity === "simple" ||
      (request as CompositionRequest).complexity === "moderate" ||
      (request as CompositionRequest).complexity === "complex")
  );
}

// ========================================
// 🔍 VALIDATION UTILITY FUNCTIONS
// ========================================

export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function isInRange(value: number, min: number, max: number): boolean {
  return isValidNumber(value) && value >= min && value <= max;
}

export function isValidTempo(tempo: unknown): boolean {
  return isValidNumber(tempo) && tempo > 0 && tempo <= 300;
}

export function isValidConfidence(confidence: unknown): boolean {
  return isValidNumber(confidence) && confidence >= 0 && confidence <= 1;
}

export function isValidNote(note: unknown): boolean {
  if (!isValidString(note)) return false;

  const validNotes = [
    "C",
    "C#",
    "Db",
    "D",
    "D#",
    "Eb",
    "E",
    "F",
    "F#",
    "Gb",
    "G",
    "G#",
    "Ab",
    "A",
    "A#",
    "Bb",
    "B",
  ];
  const noteName = note.replace(/\d+$/, ""); // Remove octave number if present

  return validNotes.includes(noteName);
}

export function isValidTimeSignature(timeSignature: unknown): boolean {
  if (!isValidString(timeSignature)) return false;

  const validSignatures = [
    "4/4",
    "3/4",
    "2/4",
    "6/8",
    "9/8",
    "12/8",
    "7/8",
    "5/4",
    "3/8",
    "2/2",
  ];
  return validSignatures.includes(timeSignature);
}

export function isValidChord(chord: unknown): boolean {
  if (!isValidString(chord)) return false;

  // Basic chord validation - starts with a valid note
  const notePart = chord.charAt(0);
  const validNotes = ["C", "D", "E", "F", "G", "A", "B"];

  return validNotes.includes(notePart);
}

export function isValidProgression(progression: unknown): boolean {
  return (
    Array.isArray(progression) &&
    progression.length > 0 &&
    progression.every((chord: unknown) => isValidChord(chord))
  );
}

// ========================================
// 🧪 COMPLEX VALIDATION FUNCTIONS
// ========================================

export function validateChordProgression(progression: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(progression)) {
    errors.push("Progression must be an array");
    return { isValid: false, errors };
  }

  if (progression.length === 0) {
    errors.push("Progression cannot be empty");
  }

  if (progression.length > 16) {
    errors.push("Progression too long (max 16 chords)");
  }

  progression.forEach((chord: unknown, index: number) => {
    if (!isValidChord(chord)) {
      errors.push(`Invalid chord at position ${index}: ${chord}`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

export function validateAudioFeatures(features: unknown): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!features || typeof features !== "object") {
    errors.push("Audio features must be an object");
    return { isValid: false, errors };
  }

  const audioFeatures = features as Record<string, unknown>;

  if (!isValidString(audioFeatures.key)) {
    errors.push("Key must be a valid string");
  }

  if (!isValidTempo(audioFeatures.tempo)) {
    errors.push("Tempo must be a valid number > 0 and <= 300");
  }

  if (!isValidTimeSignature(audioFeatures.timeSignature)) {
    errors.push('Time signature must be valid (e.g., "4/4", "3/4")');
  }

  if (!isValidConfidence(audioFeatures.confidence)) {
    errors.push("Confidence must be between 0 and 1");
  }

  return { isValid: errors.length === 0, errors };
}

// ========================================
// 🧠 BRAIN MODULE TYPE GUARDS
// ========================================

export function isValidBrainModule(module: unknown): boolean {
  return (
    typeof module === "object" &&
    module !== null &&
    typeof (module as Record<string, unknown>).id === "string" &&
    typeof (module as Record<string, unknown>).name === "string" &&
    typeof (module as Record<string, unknown>).version === "string"
  );
}

export function isValidBrainConnection(connection: unknown): boolean {
  return (
    typeof connection === "object" &&
    connection !== null &&
    typeof (connection as Record<string, unknown>).from === "string" &&
    typeof (connection as Record<string, unknown>).to === "string" &&
    typeof (connection as Record<string, unknown>).type === "string" &&
    typeof (connection as Record<string, unknown>).active === "boolean"
  );
}

export function isValidBrainEvent(event: unknown): boolean {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof (event as Record<string, unknown>).type === "string" &&
    (event as Record<string, unknown>).timestamp instanceof Date
  );
}

export function isValidBrainState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    typeof (state as Record<string, unknown>).isActive === "boolean" &&
    typeof (state as Record<string, unknown>).mode === "string" &&
    (state as Record<string, unknown>).lastUpdate instanceof Date
  );
}
