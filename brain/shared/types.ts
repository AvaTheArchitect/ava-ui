/**
 * 🧠 Maestro-AI Brain Shared Types
 * ================================
 * File: brain/shared/types.ts
 *
 * Core brain type definitions with music theory extensions
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ========================================
// 🧠 EXISTING BRAIN TYPES (Enhanced)
// ========================================

export interface AudioFeatures {
  tempo: number;
  key: string;
  loudness: number;
  pitch: number[];
  rhythm: string[];
  confidence: number;
  duration: number;
  frequency: number; // Primary frequency for ChordAnalyzer compatibility
  // Enhanced audio features for music theory
  timeSignature?: string;
  energy?: number;
  valence?: number;
  danceability?: number;
  acousticness?: number;
  instrumentalness?: number;
  spectralCentroid?: number;
  zeroCrossingRate?: number;
  mfcc?: number[];
  // Additional for ChordAnalyzer
  amplitude?: number[];
  volume?: number;
}

export interface IntelligenceRequest {
  type: "analyze" | "generate" | "learn" | "recommend";
  audioData?: ArrayBuffer;
  context?: any;
  options?: any;
}

export interface IntelligenceResponse {
  success: boolean;
  requestId: string;
  timestamp: Date;
  processingTime: number;
  results: any;
  metadata: any;
}

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  timestamp: Date;
  priority: "low" | "medium" | "high" | "critical";
  data: any;
  metadata?: any;
}

export interface BrainModule {
  name: string;
  version: string;
  initialized: boolean;
  initialize(): Promise<void>;
  getStatus(): any;
}

export interface BrainState {
  isActive: boolean;
  mode: "learning" | "processing" | "idle";
  lastUpdate: Date;
}

export interface BrainEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

// Enhanced Cadence and Modulation types (from your existing code)
export interface Cadence {
  type: "authentic" | "plagal" | "deceptive" | "half";
  position: number;
  confidence: number;
}

export interface Modulation {
  fromKey: string;
  toKey: string;
  position: number;
  type: "direct" | "pivot" | "chromatic";
}

// ========================================
// 🎼 MUSIC THEORY TYPES (New & Enhanced)
// ========================================

// Instrument Types - Added for SkillTracker compatibility
export enum InstrumentType {
  GUITAR = "guitar",
  PIANO = "piano",
  VOCALS = "vocals",
  BASS = "bass",
  DRUMS = "drums",
  GENERAL = "general",
}

// Basic music theory types
export interface Key {
  tonic: string;
  mode: "major" | "minor";
  signature: string; // e.g., "3#" or "2b"
}

export interface Scale {
  name: string;
  intervals: number[];
  notes: string[];
  chords: string[];
  modes: string[];
}

// Enhanced ChordProgression interface to support both string and ChordInfo arrays
export interface ChordProgression {
  numerals: string[];
  chords: string[] | ChordInfo[]; // Support both formats
  key: string;
  genre: string | string[]; // Support both single genre and multiple genres
  commonality: "very-common" | "common" | "uncommon" | "rare";
  emotional: "happy" | "sad" | "tense" | "resolved" | "mysterious" | "powerful";
  romanNumerals?: string[]; // Added for guitar chord progressions
  // Additional properties for compatibility
  tempo?: number;
  timeSignature?: string;
  measures?: number;
}

// Guitar-specific chord progression interface
export interface GuitarChordProgression
  extends Omit<ChordProgression, "chords"> {
  id?: string; // Added for ChordAnalyzer compatibility
  chords: ChordInfo[];
  romanNumerals: string[]; // Guitar-specific roman numeral tracking
  scale: string; // Added missing scale property that was causing TypeScript errors
  fretPositions?: FretPosition[][];
  practiceNotes?: string[];
  difficulty: ProgressionDifficulty;
  tempo: number;
  timeSignature: string;
  measures: number;
  // Inherited from ChordProgression: numerals, key, genre, commonality, emotional
}

// Enhanced chord quality types for better ChordAnalyzer integration
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

export enum ChordDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

export enum ChordVoicing {
  OPEN = "open",
  BARRE = "barre",
  POWER = "power",
  JAZZ = "jazz",
  CLASSICAL = "classical",
}

export enum ProgressionDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export interface FretPosition {
  string: number; // 1-6 for guitar strings
  fret: number; // 0 = open, 1+ = fret number
  finger?: number; // 1-4 (index to pinky)
  isRoot?: boolean;
  note: string;
}

export interface ChordInfo {
  id?: string; // Made optional for compatibility
  name: string;
  root: string;
  quality: ChordQuality;
  intervals: number[]; // Array of semitone intervals
  notes: string[];
  fretPositions?: FretPosition[]; // Made optional
  difficulty: ChordDifficulty;
  voicing: ChordVoicing;
}

// New types for ChordAnalyzer integration
export interface PracticeRecommendation {
  type: "fingering" | "transition" | "strumming" | "theory";
  description: string;
  difficulty: ChordDifficulty;
  estimatedTime: number; // minutes
}

export interface ChordAnalysisResult {
  detectedChord: ChordInfo | null;
  confidence: number;
  alternativeChords: ChordInfo[];
  suggestedProgressions: GuitarChordProgression[];
  practiceRecommendations: PracticeRecommendation[];
  audioFeatures?: AudioFeatures;
}

export interface MelodyAnalysis {
  key: Key;
  notes: string[];
  intervals: number[];
  contour: "ascending" | "descending" | "static" | "arch" | "inverted-arch";
  range: number; // in semitones
  motifs: string[][];
  sequences: boolean;
}

export interface GenreCharacteristics {
  commonProgressions: string[][];
  preferredKeys: string[];
  typicalChords: string[];
  avoidedChords: string[];
  rhythmFeatures: string[];
  modalInterchange: boolean;
  complexity: "simple" | "moderate" | "complex";
  tempo?: number; // Added tempo range
}

// The missing type that was causing TypeScript errors (Enhanced)
export interface MusicTheoryHarmonyAnalysis {
  key: Key;
  chords: string[];
  numerals: string[];
  functions: string[];
  cadences: string[];
  modulations: string[];
  nonChordTones: string[];
  confidence: number;
}

// Extended analysis types
export interface RhythmAnalysis {
  timeSignature: string;
  tempo: number;
  rhythmicPattern: string[];
  syncopation: boolean;
  complexity: "simple" | "moderate" | "complex";
}

export interface VoicingAnalysis {
  chordVoicings: string[];
  voiceLeading: string[];
  inversions: number[];
  spread: "close" | "open" | "mixed";
}

// Genre types with enum for consistency
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
  BLUES = "blues", // Added for ChordAnalyzer compatibility
}

export interface GenreAnalysis {
  primaryGenre: MusicGenre;
  confidence: number;
  characteristics: GenreCharacteristics;
  subgenres: string[];
}

// Instrument-specific types (Enhanced from existing)
export interface GuitarAnalysis {
  tuning: string[];
  capoPosition: number;
  playingTechniques: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  // Enhanced from existing
  chordProgression?: string;
  strummingPatterns?: string[];
}

export interface VocalAnalysis {
  range: {
    lowest: string;
    highest: string;
    comfortable: string[];
  };
  tessitura: string;
  style: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  // Enhanced from existing
  pitch_accuracy?: number;
  rhythm_accuracy?: number;
  tone_quality?: number;
  breath_control?: number;
}

// Composition and generation types
export interface CompositionRequest {
  key: string;
  genre: MusicGenre;
  tempo: number;
  timeSignature: string;
  length: number; // in measures
  instruments: string[];
  mood: string;
  complexity: "simple" | "moderate" | "complex";
}

export interface GeneratedComposition {
  metadata: CompositionRequest;
  chordProgression: ChordProgression;
  melody: string[];
  rhythm: RhythmAnalysis;
  structure: string[];
  confidence: number;
  suggestions: string[];
}

export interface AudioAnalysisResult {
  features: AudioFeatures;
  harmonyAnalysis: MusicTheoryHarmonyAnalysis;
  rhythmAnalysis: RhythmAnalysis;
  genreAnalysis: GenreAnalysis;
  timestamp: number;
}

// Learning and adaptation types
export interface UserPreferences {
  favoriteGenres: MusicGenre[];
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
  instruments: string[];
  favoriteKeys: string[];
  practiceGoals: string[];
}

export interface LearningProgress {
  userId: string;
  skillAssessments: { [skill: string]: number };
  completedLessons: string[];
  practiceTime: number;
  strengths: string[];
  areasForImprovement: string[];
  lastUpdated: number;
}

// ========================================
// 🎸 MUSIC THEORY ENGINE TYPES
// ========================================

export interface MusicTheoryEngine {
  // Chord conversion methods
  chordToRomanNumeral(chord: string, key: string): string;
  romanNumeralToChord(numeral: string, key: string): string;

  // Analysis methods
  analyzeChordProgression(
    chords: string[],
    key: string
  ): MusicTheoryHarmonyAnalysis;
  identifyKey(chords: string[]): Key;

  // Generation methods
  generateProgression(
    key: string,
    length: number,
    genre?: MusicGenre
  ): ChordProgression;

  // Utility methods
  getScaleNotes(key: string): string[];
  getChordNotes(chord: string): string[];
  transposeChord(chord: string, semitones: number): string;
}

// ========================================
// 🔗 BRAIN MODULE INTEGRATION TYPES
// ========================================

export interface BrainConnection {
  from: string;
  to: string;
  type: "data" | "control" | "feedback";
  active: boolean;
  latency?: number;
}

export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
  timestamp: number;
}

export interface AudioAnalysisRequest {
  id: string;
  audioBuffer: AudioBuffer;
  analysisType: "full" | "harmonic" | "rhythmic" | "timbral";
  priority: "low" | "normal" | "high";
  timestamp: number;
}

// Learning and Intelligence Types
export interface LearningContext {
  userId: string;
  sessionId: string;
  currentSkill: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  preferences: UserPreferences;
  history: LearningEvent[];
}

export interface LearningEvent {
  id: string;
  type: "practice" | "lesson" | "assessment" | "feedback";
  skill: string;
  performance: number; // 0-1 score
  duration: number; // in seconds
  timestamp: number;
  metadata?: any;
}

export interface AdaptiveResponse {
  content: any;
  difficulty: number; // 0-1 scale
  explanation: string;
  nextSteps: string[];
  confidence: number;
}

// Collaboration Types
export interface CollaborationSession {
  id: string;
  participants: string[];
  type: "jam" | "lesson" | "composition" | "performance";
  status: "waiting" | "active" | "paused" | "ended";
  settings: SessionSettings;
  created: number;
  lastActivity: number;
}

export interface SessionSettings {
  key: string;
  tempo: number;
  timeSignature: string;
  genre: string;
  instruments: string[];
  maxParticipants: number;
  isPublic: boolean;
}

export interface ParticipantState {
  userId: string;
  instrument: string;
  isActive: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  latency: number;
  lastSeen: number;
}

// Communication Types
export interface BrainMessage {
  id: string;
  from: string;
  to: string | string[];
  type: "command" | "query" | "response" | "notification";
  payload: any;
  timestamp: number;
  priority: "low" | "normal" | "high" | "urgent";
}

// Performance and Monitoring Types
export interface PerformanceMetrics {
  moduleId: string;
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  timestamp: number;
}

export interface HealthCheck {
  moduleId: string;
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    [checkName: string]: {
      status: "pass" | "fail";
      message?: string;
      timestamp: number;
    };
  };
  lastCheck: number;
}

// Configuration Types
export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  settings: { [key: string]: any };
  dependencies: string[];
  resources: {
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
  };
}

export interface BrainConfig {
  modules: ModuleConfig[];
  connections: BrainConnection[];
  globalSettings: {
    logLevel: "debug" | "info" | "warn" | "error";
    maxConcurrentAnalyses: number;
    audioBufferSize: number;
    sampleRate: number;
  };
}

// Error and Exception Types
export interface BrainError {
  id: string;
  moduleId: string;
  type: "system" | "analysis" | "communication" | "validation";
  code: string;
  message: string;
  stack?: string;
  context?: any;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ErrorReport {
  errors: BrainError[];
  summary: {
    total: number;
    byModule: { [moduleId: string]: number };
    bySeverity: { [severity: string]: number };
  };
  period: {
    start: number;
    end: number;
  };
}

// Integration Types (for external modules like Cipher Engine)
export interface ExternalModule {
  id: string;
  name: string;
  type: "cipher" | "maestro" | "ava" | "third-party";
  apiVersion: string;
  endpoints: string[];
  authentication?: {
    type: "none" | "api-key" | "oauth" | "jwt";
    credentials?: any;
  };
  lastContact: number;
  status: "connected" | "disconnected" | "error";
}

export interface IntegrationMessage {
  from: ExternalModule;
  to: string;
  type: "request" | "response" | "event";
  payload: any;
  timestamp: number;
  correlationId?: string;
}

// Type Utility Functions
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
