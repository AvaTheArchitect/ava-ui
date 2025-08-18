/**
 * MusicInterfaces.ts - Music-Specific Interfaces
 * 🎵 Comprehensive music theory and audio processing interfaces
 * Part of Maestro.ai Brain System
 */

// =============================================================================
// 🎼 CORE MUSIC THEORY INTERFACES
// =============================================================================

/**
 * Musical key definition
 */
export interface Key {
  tonic: string;
  mode:
    | "major"
    | "minor"
    | "dorian"
    | "phrygian"
    | "lydian"
    | "mixolydian"
    | "aeolian"
    | "locrian";
  signature: string; // e.g., "3#" or "2b"
}

/**
 * Musical scale definition
 */
export interface Scale {
  name: string;
  intervals: number[]; // semitone intervals
  notes: string[];
  chords: string[];
  modes: string[];
  characteristic: string; // e.g., "bright", "dark", "exotic"
}

/**
 * Time signature
 */
export interface TimeSignature {
  numerator: number; // beats per measure
  denominator: number; // note value that gets the beat
  compound: boolean; // compound vs simple meter
  feel: "straight" | "swing" | "shuffle";
}

/**
 * Tempo information
 */
export interface Tempo {
  bpm: number;
  marking?: string; // e.g., "Allegro", "Andante"
  stable: boolean;
  confidence: number;
}

// =============================================================================
// 🎸 CHORD AND HARMONY INTERFACES
// =============================================================================

/**
 * Chord quality enumeration
 */
export enum ChordQuality {
  MAJOR = "major",
  MINOR = "minor",
  DIMINISHED = "diminished",
  AUGMENTED = "augmented",
  SUS2 = "sus2",
  SUS4 = "sus4",
  SEVENTH = "7th",
  MAJ7 = "maj7",
  MIN7 = "min7",
  DIM7 = "dim7",
  AUG7 = "aug7",
  DOMINANT7 = "dominant7",
  MAJOR7 = "major7",
  MINOR7 = "minor7",
  MINOR7B5 = "minor7b5",
  DIMINISHED7 = "diminished7",
  SUSPENDED2 = "suspended2",
  SUSPENDED4 = "suspended4",
  ADD9 = "add9",
  POWER = "power",
}

/**
 * Chord difficulty levels
 */
export enum ChordDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

/**
 * Chord voicing types
 */
export enum ChordVoicing {
  OPEN = "open",
  CLOSED = "closed",
  BARRE = "barre",
  POWER = "power",
  JAZZ = "jazz",
  CLASSICAL = "classical",
  DROP2 = "drop2",
  DROP3 = "drop3",
}

/**
 * Guitar fret position
 */
export interface FretPosition {
  string: number; // 1-6 for guitar strings (high E = 1, low E = 6)
  fret: number; // 0 = open, 1+ = fret number
  finger?: number; // 1-4 (index to pinky)
  isRoot?: boolean;
  note: string;
  interval?: string; // e.g., "R", "3", "5", "b7"
}

/**
 * Comprehensive chord information
 */
export interface ChordInfo {
  id?: string;
  name: string;
  root: string;
  quality: ChordQuality;
  intervals: number[]; // semitone intervals from root
  notes: string[];
  fretPositions?: FretPosition[];
  difficulty: ChordDifficulty;
  voicing: ChordVoicing;
  inversions?: ChordInfo[];
  tensions?: string[]; // e.g., ["9", "11", "13"]
  alterations?: string[]; // e.g., ["b5", "#11"]
}

/**
 * Chord progression difficulty
 */
export enum ProgressionDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

/**
 * Chord progression definition
 */
export interface ChordProgression {
  id?: string;
  numerals: string[]; // Roman numeral analysis
  chords: string[] | ChordInfo[];
  key: string;
  genre: string | string[];
  commonality: "very-common" | "common" | "uncommon" | "rare";
  emotional:
    | "happy"
    | "sad"
    | "tense"
    | "resolved"
    | "mysterious"
    | "powerful"
    | "nostalgic";
  difficulty?: ProgressionDifficulty;
  tempo?: number;
  timeSignature?: string;
  measures?: number;
  description?: string;
}

/**
 * Guitar-specific chord progression
 */
export interface GuitarChordProgression
  extends Omit<ChordProgression, "chords"> {
  chords: ChordInfo[];
  romanNumerals: string[];
  scale: string;
  fretPositions?: FretPosition[][];
  practiceNotes?: string[];
  strummingPattern?: string;
  capoPosition?: number;
}

/**
 * Harmonic analysis result
 */
export interface HarmonyAnalysis {
  key: Key;
  chords: string[];
  numerals: string[];
  functions: string[]; // tonic, subdominant, dominant, etc.
  cadences: Cadence[];
  modulations: Modulation[];
  nonChordTones: string[];
  confidence: number;
  complexity: number; // 0-1
}

/**
 * Cadence identification
 */
export interface Cadence {
  type:
    | "authentic"
    | "plagal"
    | "deceptive"
    | "half"
    | "phrygian"
    | "neapolitan";
  position: number; // measure number
  confidence: number;
  strength: "strong" | "weak";
}

/**
 * Modulation detection
 */
export interface Modulation {
  fromKey: string;
  toKey: string;
  position: number; // measure number
  type: "direct" | "pivot" | "chromatic" | "enharmonic" | "sequential";
  pivotChord?: string;
  confidence: number;
}

// =============================================================================
// 🎵 AUDIO AND SIGNAL PROCESSING INTERFACES
// =============================================================================

/**
 * Comprehensive audio features
 */
export interface AudioFeatures {
  // Basic properties
  tempo: number;
  key: string;
  loudness: number;
  pitch: number[];
  rhythm: string[];
  confidence: number;
  duration: number;
  frequency: number; // primary frequency

  // Extended audio features
  timeSignature?: string;
  energy?: number; // 0-1
  valence?: number; // 0-1 (musical positivity)
  danceability?: number; // 0-1
  acousticness?: number; // 0-1
  instrumentalness?: number; // 0-1
  liveness?: number; // 0-1 (live performance detection)
  speechiness?: number; // 0-1

  // Spectral features
  spectralCentroid?: number;
  spectralRolloff?: number;
  spectralBandwidth?: number;
  zeroCrossingRate?: number;
  mfcc?: number[]; // Mel-frequency cepstral coefficients
  chroma?: number[]; // Chroma features

  // Additional properties
  amplitude?: number[];
  volume?: number;
  rms?: number; // Root mean square
  dynamicRange?: number;
}

/**
 * Audio buffer for processing
 */
export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
  timestamp: number;
  format?: string;
  bitDepth?: number;
}

/**
 * Audio analysis request
 */
export interface AudioAnalysisRequest {
  id: string;
  audioBuffer: AudioBuffer;
  analysisType: "full" | "harmonic" | "rhythmic" | "timbral" | "pitch";
  priority: "low" | "normal" | "high" | "urgent";
  timestamp: number;
  options?: AudioAnalysisOptions;
}

/**
 * Audio analysis options
 */
export interface AudioAnalysisOptions {
  includeSpectral?: boolean;
  includePitch?: boolean;
  includeRhythm?: boolean;
  includeHarmony?: boolean;
  includeTimbre?: boolean;
  windowSize?: number;
  hopSize?: number;
  frameRate?: number;
}

/**
 * Audio analysis result
 */
export interface AudioAnalysisResult {
  requestId: string;
  features: AudioFeatures;
  harmonyAnalysis?: HarmonyAnalysis;
  rhythmAnalysis?: RhythmAnalysis;
  genreAnalysis?: GenreAnalysis;
  instrumentAnalysis?: InstrumentAnalysis;
  confidence: number;
  processingTime: number;
  timestamp: number;
}

// =============================================================================
// 🥁 RHYTHM AND TIMING INTERFACES
// =============================================================================

/**
 * Rhythm analysis result
 */
export interface RhythmAnalysis {
  timeSignature: TimeSignature;
  tempo: Tempo;
  rhythmicPattern: string[];
  beats: Beat[];
  syncopation: boolean;
  swing: number; // 0-1, 0 = straight, 1 = full swing
  complexity: "simple" | "moderate" | "complex";
  groove: string; // e.g., "rock", "jazz", "latin"
  confidence: number;
}

/**
 * Beat detection
 */
export interface Beat {
  position: number; // in seconds
  strength: number; // 0-1
  downbeat: boolean;
  confidence: number;
}

/**
 * Rhythmic pattern
 */
export interface RhythmicPattern {
  name: string;
  pattern: boolean[]; // true = hit, false = rest
  subdivision: number; // 16th notes, 8th notes, etc.
  genre: string[];
  difficulty: "easy" | "medium" | "hard";
}

// =============================================================================
// 🎸 INSTRUMENT-SPECIFIC INTERFACES
// =============================================================================

/**
 * Instrument types
 */
export enum InstrumentType {
  GUITAR = "guitar",
  PIANO = "piano",
  VOCALS = "vocals",
  BASS = "bass",
  DRUMS = "drums",
  VIOLIN = "violin",
  SAXOPHONE = "saxophone",
  GENERAL = "general",
}

/**
 * Guitar analysis result
 */
export interface GuitarAnalysis {
  tuning: string[];
  capoPosition: number;
  playingTechniques: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  chordProgression?: string;
  strummingPatterns?: string[];
  pickingPatterns?: string[];
  fretboardPosition?: number; // average fret position
  openStrings?: boolean; // uses open strings
}

/**
 * Vocal analysis result
 */
export interface VocalAnalysis {
  range: VocalRange;
  tessitura: string; // comfortable singing range
  style: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  pitch_accuracy?: number; // 0-1
  rhythm_accuracy?: number; // 0-1
  tone_quality?: number; // 0-1
  breath_control?: number; // 0-1
  vibrato?: VibratoAnalysis;
  formants?: number[]; // vocal formant frequencies
}

/**
 * Vocal range definition
 */
export interface VocalRange {
  lowest: string; // note name (e.g., "C3")
  highest: string; // note name (e.g., "C5")
  comfortable: string[]; // comfortable range notes
  breaks: string[]; // voice break points
  classification?:
    | "soprano"
    | "alto"
    | "tenor"
    | "bass"
    | "baritone"
    | "mezzo-soprano";
}

/**
 * Vibrato analysis
 */
export interface VibratoAnalysis {
  present: boolean;
  rate: number; // Hz
  extent: number; // cents
  regularity: number; // 0-1
  quality: "natural" | "controlled" | "excessive" | "minimal";
}

/**
 * General instrument analysis
 */
export interface InstrumentAnalysis {
  primaryInstruments: InstrumentDetection[];
  confidence: number;
  polyphonic: boolean; // multiple instruments/notes
  ensemble: boolean; // multiple players
}

/**
 * Instrument detection result
 */
export interface InstrumentDetection {
  instrument: InstrumentType;
  confidence: number;
  timeRange: [number, number]; // start and end times
  techniques?: string[];
  dynamics?: string; // "pp", "p", "mp", "mf", "f", "ff"
}

// =============================================================================
// 🎶 MELODY AND COMPOSITION INTERFACES
// =============================================================================

/**
 * Melody analysis
 */
export interface MelodyAnalysis {
  key: Key;
  notes: string[];
  intervals: number[];
  contour:
    | "ascending"
    | "descending"
    | "static"
    | "arch"
    | "inverted-arch"
    | "wave";
  range: number; // in semitones
  motifs: string[][];
  sequences: boolean;
  phrases: MelodyPhrase[];
  complexity: number; // 0-1
  singability: number; // 0-1
}

/**
 * Melody phrase
 */
export interface MelodyPhrase {
  notes: string[];
  startTime: number;
  duration: number;
  contour: string;
  climax?: string; // highest note
  cadence?: string; // ending type
}

/**
 * Composition request
 */
export interface CompositionRequest {
  key: string;
  genre: MusicGenre;
  tempo: number;
  timeSignature: string;
  length: number; // in measures
  instruments: string[];
  mood: string;
  complexity: "simple" | "moderate" | "complex";
  constraints?: CompositionConstraints;
}

/**
 * Composition constraints
 */
export interface CompositionConstraints {
  allowedChords?: string[];
  forbiddenChords?: string[];
  maxLeaps?: number; // max interval leap in melody
  voiceLeading?: "strict" | "moderate" | "free";
  dissonanceLevel?: "low" | "medium" | "high";
  repetition?: boolean;
}

/**
 * Generated composition
 */
export interface GeneratedComposition {
  metadata: CompositionRequest;
  chordProgression: ChordProgression;
  melody: string[];
  rhythm: RhythmAnalysis;
  structure: CompositionStructure;
  arrangements: InstrumentArrangement[];
  confidence: number;
  suggestions: string[];
}

/**
 * Composition structure
 */
export interface CompositionStructure {
  sections: CompositionSection[];
  form: string; // e.g., "AABA", "verse-chorus"
  totalMeasures: number;
  keyChanges?: KeyChange[];
}

/**
 * Composition section
 */
export interface CompositionSection {
  name: string; // "intro", "verse", "chorus", etc.
  measures: [number, number]; // start and end measure
  key?: string;
  chords: string[];
  melody?: string[];
  dynamics?: string;
}

/**
 * Key change in composition
 */
export interface KeyChange {
  measure: number;
  fromKey: string;
  toKey: string;
  type: Modulation["type"];
}

/**
 * Instrument arrangement
 */
export interface InstrumentArrangement {
  instrument: InstrumentType;
  part: string; // "lead", "rhythm", "bass", "percussion"
  notes: string[];
  dynamics: string[];
  techniques: string[];
  difficulty: "easy" | "medium" | "hard";
}

// =============================================================================
// 🎨 GENRE AND STYLE INTERFACES
// =============================================================================

/**
 * Music genre enumeration
 */
export enum MusicGenre {
  ROCK = "rock",
  METAL = "metal",
  COUNTRY = "country",
  BLUES_ROCK = "blues-rock",
  CONTEMPORARY_CHRISTIAN = "contemporary-christian",
  JAZZ = "jazz",
  POP = "pop",
  FOLK = "folk",
  CLASSICAL = "classical",
  BLUES = "blues",
  REGGAE = "reggae",
  FUNK = "funk",
  LATIN = "latin",
  ELECTRONIC = "electronic",
  HIP_HOP = "hip-hop",
  R_AND_B = "r-and-b",
  INDIE = "indie",
  ALTERNATIVE = "alternative",
  PROGRESSIVE = "progressive",
}

/**
 * Genre characteristics
 */
export interface GenreCharacteristics {
  commonProgressions: string[][];
  preferredKeys: string[];
  typicalChords: string[];
  avoidedChords: string[];
  rhythmFeatures: string[];
  modalInterchange: boolean;
  complexity: "simple" | "moderate" | "complex";
  tempoRange: [number, number]; // BPM range
  instruments: InstrumentType[];
  techniques: string[];
}

/**
 * Genre analysis result
 */
export interface GenreAnalysis {
  primaryGenre: MusicGenre;
  confidence: number;
  characteristics: GenreCharacteristics;
  subgenres: string[];
  influences: MusicGenre[];
  probability: Record<string, number>; // genre probabilities
}

/**
 * Style analysis
 */
export interface StyleAnalysis {
  period?: string; // "baroque", "romantic", "modern"
  influences: string[];
  characteristics: string[];
  complexity: number; // 0-1
  originality: number; // 0-1
  cultural: string[]; // cultural influences
}

// =============================================================================
// 🔧 MUSIC PROCESSING UTILITIES
// =============================================================================

/**
 * Music processing options
 */
export interface MusicProcessingOptions {
  analysisDepth: "surface" | "detailed" | "comprehensive";
  enableCache: boolean;
  realTime: boolean;
  includeVisualization: boolean;
  outputFormat: "json" | "midi" | "musicxml" | "tab";
}

/**
 * Music processing result
 */
export interface MusicProcessingResult {
  originalData: any;
  processedData: any;
  metadata: ProcessingMetadata;
  visualizations?: any[];
  exports?: ProcessingExport[];
}

/**
 * Processing metadata
 */
export interface ProcessingMetadata {
  processingTime: number;
  algorithmsUsed: string[];
  qualityScore: number;
  confidence: number;
  warnings: string[];
  suggestions: string[];
}

/**
 * Processing export
 */
export interface ProcessingExport {
  format: string;
  data: any;
  filename?: string;
  mimeType?: string;
  size?: number;
}

// =============================================================================
// 🎯 MUSIC THEORY UTILITIES
// =============================================================================

/**
 * Interval information
 */
export interface Interval {
  name: string; // "perfect fifth", "major third"
  shortName: string; // "P5", "M3"
  semitones: number;
  quality: "perfect" | "major" | "minor" | "augmented" | "diminished";
  number: number; // 1-8 (and compounds)
  compound: boolean;
}

/**
 * Note information
 */
export interface Note {
  name: string; // "C", "F#", "Bb"
  octave?: number; // 0-10
  frequency?: number; // Hz
  midi?: number; // MIDI note number
  cents?: number; // cents deviation
}

/**
 * Chord function analysis
 */
export interface ChordFunction {
  roman: string; // "I", "V7", "ii"
  function: "tonic" | "subdominant" | "dominant" | "diminished" | "augmented";
  quality: ChordQuality;
  inversions: number; // 0 = root position, 1 = first inversion, etc.
  borrowedFrom?: string; // if borrowed chord
  tonicization?: string; // if secondary dominant
}

/**
 * Voice leading analysis
 */
export interface VoiceLeadingAnalysis {
  voices: Voice[];
  parallelMotion: ParallelMotion[];
  crossings: VoiceCrossing[];
  leaps: Leap[];
  quality: "excellent" | "good" | "acceptable" | "poor";
  suggestions: string[];
}

/**
 * Individual voice
 */
export interface Voice {
  name: string; // "soprano", "alto", "tenor", "bass"
  notes: string[];
  range: VocalRange;
  contour: string;
  leaps: number; // number of large interval leaps
}

/**
 * Parallel motion detection
 */
export interface ParallelMotion {
  voices: [string, string]; // which two voices
  interval: string; // parallel fifths, octaves, etc.
  positions: number[]; // where it occurs
  severity: "error" | "warning" | "acceptable";
}

/**
 * Voice crossing
 */
export interface VoiceCrossing {
  voices: [string, string];
  position: number;
  severity: "error" | "warning";
}

/**
 * Melodic leap
 */
export interface Leap {
  voice: string;
  position: number;
  interval: string;
  size: number; // semitones
  resolved: boolean;
  quality: "good" | "acceptable" | "problematic";
}
