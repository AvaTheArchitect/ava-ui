/**
 * VocalAI.ts - Advanced Vocal Analysis & Coaching Engine
 * 🎤 Comprehensive vocal intelligence for Maestro.ai
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import {
  AudioFeatures,
  Key,
  MusicGenre,
  BrainModule,
  AudioAnalysisResult,
  MusicTheoryHarmonyAnalysis,
} from "../../shared/types";

// Import brain modules for integration
import { MusicTheoryEngine } from "../composition/MusicTheoryEngine";
import { AudioAnalyzer } from "../audio/AudioAnalyzer";

// Vocal-specific analysis types
export interface VocalAnalysisResult {
  id: string;
  timestamp: Date;

  // Core vocal analysis
  pitch: PitchAnalysis;
  range: VocalRange;
  tone: ToneAnalysis;
  vibrato: VibratoAnalysis;
  breath: BreathAnalysis;

  // Performance metrics
  intonation: VocalIntonationAnalysis;
  dynamics: VocalDynamicsAnalysis;
  articulation: ArticulationAnalysis;
  resonance: ResonanceAnalysis;

  // Advanced analysis
  formants: FormantAnalysis;
  harmonics: HarmonicContent;
  vocal_tract: VocalTractAnalysis;
  emotion: EmotionAnalysis;

  // Learning insights
  voiceType: VoiceType;
  skillLevel: VocalSkillLevel;
  weaknesses: VocalWeakness[];
  strengths: VocalStrength[];
  suggestions: VocalSuggestion[];
  exercises: VocalExercise[];
}

export interface PitchAnalysis {
  fundamental: number[]; // Hz values over time
  average: number;
  stability: number;
  accuracy: number;
  range: { min: number; max: number };
  cents_deviation: number[];
  vibrato_rate?: number;
  vibrato_extent?: number;
  glissando_events: GlissandoEvent[];
}

export interface VocalRange {
  lowest_note: string;
  highest_note: string;
  comfortable_range: { low: string; high: string };
  full_range_hz: { low: number; high: number };
  octave_span: number;
  tessitura: string; // Most comfortable singing range
  register_breaks: RegisterBreak[];
}

export interface RegisterBreak {
  frequency: number;
  strength: "weak" | "moderate" | "strong";
  smoothness: number;
  register_from: VocalRegister;
  register_to: VocalRegister;
}

export type VocalRegister = "chest" | "mix" | "head" | "whistle" | "vocal_fry";

export interface ToneAnalysis {
  quality: ToneQuality;
  warmth: number;
  brightness: number;
  fullness: number;
  clarity: number;
  richness: number;
  nasality: number;
  breathiness: number;
  strain: number;
  placement: VocalPlacement;
}

export type ToneQuality =
  | "warm"
  | "bright"
  | "dark"
  | "thin"
  | "full"
  | "breathy"
  | "clear"
  | "nasal";
export type VocalPlacement =
  | "forward"
  | "back"
  | "nasal"
  | "throat"
  | "chest"
  | "head"
  | "mixed";

export interface VibratoAnalysis {
  present: boolean;
  rate: number; // Hz (typical 4-7 Hz)
  extent: number; // cents
  regularity: number;
  onset_time: number; // seconds after note start
  quality: "natural" | "forced" | "excessive" | "absent";
  consistency: number;
}

export interface BreathAnalysis {
  support: number;
  control: number;
  capacity: number;
  efficiency: number;
  breath_marks: BreathMark[];
  phrase_length: number[];
  recovery_time: number[];
  technique: BreathTechnique;
}

export interface BreathMark {
  timestamp: number;
  duration: number;
  type: "intake" | "pause" | "gasp";
  audibility: number;
}

export type BreathTechnique =
  | "diaphragmatic"
  | "shallow"
  | "clavicular"
  | "mixed";

export interface VocalIntonationAnalysis {
  overall_accuracy: number;
  pitch_drift: number;
  interval_accuracy: { [interval: string]: number };
  scale_accuracy: number;
  harmonic_accuracy: number;
  problematic_intervals: string[];
}

export interface VocalDynamicsAnalysis {
  range: number; // dB range
  control: number;
  crescendo_control: number;
  diminuendo_control: number;
  accent_clarity: number;
  overall_level: number;
  consistency: number;
}

export interface ArticulationAnalysis {
  consonant_clarity: number;
  vowel_clarity: number;
  diction: number;
  word_intelligibility: number;
  linguistic_stress: number;
  phrasing: number;
  legato_quality: number;
  staccato_quality: number;
}

export interface ResonanceAnalysis {
  chest_resonance: number;
  head_resonance: number;
  nasal_resonance: number;
  oral_resonance: number;
  balance: number;
  projection: number;
  focus: number;
}

export interface FormantAnalysis {
  f1: number[]; // First formant over time
  f2: number[]; // Second formant
  f3: number[]; // Third formant
  f4: number[]; // Fourth formant
  vowel_clarity: { [vowel: string]: number };
  vowel_consistency: number;
  formant_transitions: FormantTransition[];
}

export interface FormantTransition {
  from_vowel: string;
  to_vowel: string;
  smoothness: number;
  duration: number;
  timestamp: number;
}

export interface HarmonicContent {
  fundamental_strength: number;
  harmonic_richness: number;
  spectral_centroid: number;
  spectral_rolloff: number;
  harmonic_ratios: number[];
  singer_formant: SingerFormant;
}

export interface SingerFormant {
  present: boolean;
  frequency: number;
  strength: number;
  clarity: number;
}

export interface VocalTractAnalysis {
  estimated_length: number;
  resonance_frequencies: number[];
  tract_shape: "narrow" | "wide" | "variable";
  tongue_position: TonguePosition;
  soft_palate_position: "raised" | "lowered" | "neutral";
}

export interface TonguePosition {
  height: "high" | "mid" | "low";
  advancement: "front" | "central" | "back";
  tension: number;
}

export interface EmotionAnalysis {
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  detected_emotion: Emotion;
  confidence: number;
  expressiveness: number;
  emotional_range: number;
}

export type Emotion =
  | "happy"
  | "sad"
  | "angry"
  | "fearful"
  | "surprised"
  | "neutral"
  | "passionate"
  | "melancholic";

export type VoiceType =
  | "soprano"
  | "mezzo-soprano"
  | "alto"
  | "contralto"
  | "tenor"
  | "baritone"
  | "bass"
  | "countertenor"
  | "undetermined";

export type VocalSkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "professional";

export interface VocalWeakness {
  area: string;
  severity: "minor" | "moderate" | "major";
  description: string;
  frequency_range?: { low: number; high: number };
  recommended_focus: string;
}

export interface VocalStrength {
  area: string;
  quality: "good" | "excellent" | "exceptional";
  description: string;
  maintain_with: string;
}

export interface VocalSuggestion {
  type: "technical" | "musical" | "health" | "practice";
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  explanation: string;
  timeframe: string;
}

export interface VocalExercise {
  name: string;
  purpose: string;
  description: string;
  duration: number; // minutes
  frequency: string;
  difficulty: "easy" | "medium" | "hard";
  focus_areas: string[];
  instructions: string[];
}

export interface GlissandoEvent {
  start_time: number;
  end_time: number;
  start_frequency: number;
  end_frequency: number;
  smoothness: number;
  intentional: boolean;
}

export interface VocalAIConfig {
  enablePitchAnalysis?: boolean;
  enableToneAnalysis?: boolean;
  enableBreathAnalysis?: boolean;
  enableEmotionAnalysis?: boolean;
  enableFormantAnalysis?: boolean;
  confidenceThreshold?: number;
  analysisDepth?: "basic" | "standard" | "professional";
  voiceTypeDetection?: boolean;
}

/**
 * VocalAI - Advanced Vocal Analysis & Coaching Engine
 * Provides comprehensive vocal performance analysis and intelligent coaching
 */
export class VocalAI implements BrainModule {
  // BrainModule required properties
  public readonly name: string = "VocalAI";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;

  private sessionId: string = generateId("vocal-session");
  private config: VocalAIConfig;

  // Brain module integrations
  private audioAnalyzer?: AudioAnalyzer;
  private musicTheoryEngine?: MusicTheoryEngine;

  // Analysis state
  private isAnalyzing: boolean = false;
  private lastAnalysis?: VocalAnalysisResult;

  constructor(config: VocalAIConfig = {}) {
    this.config = {
      enablePitchAnalysis: true,
      enableToneAnalysis: true,
      enableBreathAnalysis: true,
      enableEmotionAnalysis: true,
      enableFormantAnalysis: true,
      confidenceThreshold: 0.75,
      analysisDepth: "standard",
      voiceTypeDetection: true,
      ...config,
    };
  }

  // BrainModule required methods
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize brain modules
      this.audioAnalyzer = new AudioAnalyzer();
      await this.audioAnalyzer.initialize();

      this.musicTheoryEngine = new MusicTheoryEngine();
      // MusicTheoryEngine initialized (no async setup needed)

      this.initialized = true;
      console.log(`🎤 VocalAI initialized - Session: ${this.sessionId}`);
    } catch (error) {
      console.error("Failed to initialize VocalAI:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      initialized: this.initialized,
      sessionId: this.sessionId,
      isAnalyzing: this.isAnalyzing,
    };
  }

  /**
   * Comprehensive vocal analysis
   */
  async analyzeVocals(audioData: ArrayBuffer): Promise<VocalAnalysisResult> {
    if (!this.initialized) {
      throw new Error("VocalAI not initialized");
    }

    this.isAnalyzing = true;
    const analysisId = generateId("vocal-analysis");

    try {
      // Convert ArrayBuffer to Float32Array for audio analysis
      const audioArray: Float32Array = new Float32Array(audioData);

      // Get base audio analysis
      const audioAnalysis = await this.audioAnalyzer!.analyzeAudio(audioData);

      // Perform vocal-specific analysis
      const [
        pitch,
        range,
        tone,
        vibrato,
        breath,
        intonation,
        dynamics,
        articulation,
        resonance,
        formants,
        harmonics,
        vocalTract,
        emotion,
      ] = await Promise.all([
        this.analyzePitch(audioArray, audioAnalysis),
        this.analyzeRange(audioArray, audioAnalysis),
        this.analyzeTone(audioArray),
        this.analyzeVibrato(audioArray),
        this.analyzeBreath(audioArray),
        this.analyzeIntonation(audioArray, audioAnalysis),
        this.analyzeDynamics(audioArray),
        this.analyzeArticulation(audioArray),
        this.analyzeResonance(audioArray),
        this.analyzeFormants(audioArray),
        this.analyzeHarmonics(audioArray),
        this.analyzeVocalTract(audioArray),
        this.analyzeEmotion(audioArray),
      ]);

      // Generate insights and recommendations
      const voiceType = this.determineVoiceType(range, tone, formants);
      const skillLevel = this.assessSkillLevel(pitch, tone, breath, intonation);
      const weaknesses = this.identifyWeaknesses(
        pitch,
        tone,
        breath,
        articulation
      );
      const strengths = this.identifyStrengths(pitch, tone, breath, resonance);
      const suggestions = this.generateSuggestions(
        weaknesses,
        strengths,
        skillLevel
      );
      const exercises = this.recommendExercises(
        weaknesses,
        voiceType,
        skillLevel
      );

      const result: VocalAnalysisResult = {
        id: analysisId,
        timestamp: new Date(),
        pitch,
        range,
        tone,
        vibrato,
        breath,
        intonation,
        dynamics,
        articulation,
        resonance,
        formants,
        harmonics,
        vocal_tract: vocalTract,
        emotion,
        voiceType,
        skillLevel,
        weaknesses,
        strengths,
        suggestions,
        exercises,
      };

      this.lastAnalysis = result;
      return result;
    } catch (error) {
      console.error("Vocal analysis failed:", error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Advanced pitch analysis
   */
  private async analyzePitch(
    audioData: Float32Array,
    audioAnalysis: AudioAnalysisResult
  ): Promise<PitchAnalysis> {
    const fundamental = this.extractFundamentalFrequency(audioData);
    const stability = this.calculatePitchStability(fundamental);
    const accuracy = this.assessPitchAccuracy(fundamental, audioAnalysis);

    return {
      fundamental,
      average: fundamental.reduce((a, b) => a + b, 0) / fundamental.length,
      stability,
      accuracy,
      range: {
        min: Math.min(...fundamental),
        max: Math.max(...fundamental),
      },
      cents_deviation: this.calculateCentsDeviation(fundamental),
      vibrato_rate: this.detectVibratoRate(fundamental),
      vibrato_extent: this.calculateVibratoExtent(fundamental),
      glissando_events: this.detectGlissandoEvents(fundamental),
    };
  }

  /**
   * Vocal range analysis
   */
  private async analyzeRange(
    audioData: Float32Array,
    audioAnalysis: AudioAnalysisResult
  ): Promise<VocalRange> {
    const frequencies = this.extractFundamentalFrequency(audioData);
    const lowestHz = Math.min(...frequencies);
    const highestHz = Math.max(...frequencies);

    return {
      lowest_note: this.frequencyToNote(lowestHz),
      highest_note: this.frequencyToNote(highestHz),
      comfortable_range: this.determineComfortableRange(frequencies),
      full_range_hz: { low: lowestHz, high: highestHz },
      octave_span: this.calculateOctaveSpan(lowestHz, highestHz),
      tessitura: this.determineTessitura(frequencies),
      register_breaks: this.detectRegisterBreaks(audioData),
    };
  }

  /**
   * Tone quality analysis
   */
  private async analyzeTone(audioData: Float32Array): Promise<ToneAnalysis> {
    const spectralFeatures = this.extractSpectralFeatures(audioData);

    return {
      quality: this.classifyToneQuality(spectralFeatures),
      warmth: this.calculateWarmth(spectralFeatures),
      brightness: this.calculateBrightness(spectralFeatures),
      fullness: this.calculateFullness(spectralFeatures),
      clarity: this.calculateClarity(spectralFeatures),
      richness: this.calculateRichness(spectralFeatures),
      nasality: this.detectNasality(spectralFeatures),
      breathiness: this.detectBreathiness(spectralFeatures),
      strain: this.detectStrain(spectralFeatures),
      placement: this.determineVocalPlacement(spectralFeatures),
    };
  }

  /**
   * Vibrato analysis
   */
  private async analyzeVibrato(
    audioData: Float32Array
  ): Promise<VibratoAnalysis> {
    const fundamental = this.extractFundamentalFrequency(audioData);
    const vibratoPresent = this.detectVibratoPresence(fundamental);

    if (!vibratoPresent) {
      return {
        present: false,
        rate: 0,
        extent: 0,
        regularity: 0,
        onset_time: 0,
        quality: "absent",
        consistency: 0,
      };
    }

    return {
      present: true,
      rate: this.calculateVibratoRate(fundamental),
      extent: this.calculateVibratoExtent(fundamental),
      regularity: this.assessVibratoRegularity(fundamental),
      onset_time: this.detectVibratoOnset(fundamental),
      quality: this.classifyVibratoQuality(fundamental),
      consistency: this.assessVibratoConsistency(fundamental),
    };
  }

  /**
   * Breath analysis
   */
  private async analyzeBreath(
    audioData: Float32Array
  ): Promise<BreathAnalysis> {
    const breathMarks = this.detectBreathMarks(audioData);
    const phrases = this.segmentIntoPhrases(audioData, breathMarks);

    return {
      support: this.assessBreathSupport(audioData),
      control: this.assessBreathControl(phrases),
      capacity: this.estimateBreathCapacity(phrases),
      efficiency: this.calculateBreathEfficiency(audioData, phrases),
      breath_marks: breathMarks,
      phrase_length: phrases.map((p) => p.duration),
      recovery_time: this.calculateRecoveryTimes(breathMarks),
      technique: this.classifyBreathTechnique(audioData),
    };
  }

  // Additional analysis methods (simplified for brevity)
  private async analyzeIntonation(
    audioData: Float32Array,
    audioAnalysis: AudioAnalysisResult
  ): Promise<VocalIntonationAnalysis> {
    return {
      overall_accuracy: 0.85,
      pitch_drift: 0.15,
      interval_accuracy: { major_third: 0.9, fifth: 0.95, octave: 0.88 },
      scale_accuracy: 0.82,
      harmonic_accuracy: 0.87,
      problematic_intervals: ["major_seventh", "tritone"],
    };
  }

  private async analyzeDynamics(
    audioData: Float32Array
  ): Promise<VocalDynamicsAnalysis> {
    return {
      range: 25, // dB
      control: 0.8,
      crescendo_control: 0.75,
      diminuendo_control: 0.78,
      accent_clarity: 0.82,
      overall_level: -18, // dB
      consistency: 0.77,
    };
  }

  private async analyzeArticulation(
    audioData: Float32Array
  ): Promise<ArticulationAnalysis> {
    return {
      consonant_clarity: 0.85,
      vowel_clarity: 0.88,
      diction: 0.8,
      word_intelligibility: 0.83,
      linguistic_stress: 0.75,
      phrasing: 0.82,
      legato_quality: 0.78,
      staccato_quality: 0.72,
    };
  }

  private async analyzeResonance(
    audioData: Float32Array
  ): Promise<ResonanceAnalysis> {
    return {
      chest_resonance: 0.7,
      head_resonance: 0.65,
      nasal_resonance: 0.15,
      oral_resonance: 0.85,
      balance: 0.78,
      projection: 0.82,
      focus: 0.75,
    };
  }

  private async analyzeFormants(
    audioData: Float32Array
  ): Promise<FormantAnalysis> {
    return {
      f1: [800, 820, 810, 825],
      f2: [1200, 1180, 1210, 1195],
      f3: [2800, 2820, 2790, 2810],
      f4: [3500, 3480, 3520, 3490],
      vowel_clarity: { a: 0.85, e: 0.82, i: 0.88, o: 0.79, u: 0.83 },
      vowel_consistency: 0.81,
      formant_transitions: [],
    };
  }

  private async analyzeHarmonics(
    audioData: Float32Array
  ): Promise<HarmonicContent> {
    return {
      fundamental_strength: 0.85,
      harmonic_richness: 0.72,
      spectral_centroid: 1200,
      spectral_rolloff: 3500,
      harmonic_ratios: [1.0, 0.6, 0.4, 0.3, 0.2],
      singer_formant: {
        present: true,
        frequency: 2800,
        strength: 0.65,
        clarity: 0.7,
      },
    };
  }

  private async analyzeVocalTract(
    audioData: Float32Array
  ): Promise<VocalTractAnalysis> {
    return {
      estimated_length: 17.5, // cm
      resonance_frequencies: [500, 1500, 2500, 3500],
      tract_shape: "variable",
      tongue_position: {
        height: "mid",
        advancement: "central",
        tension: 0.5,
      },
      soft_palate_position: "neutral",
    };
  }

  private async analyzeEmotion(
    audioData: Float32Array
  ): Promise<EmotionAnalysis> {
    return {
      valence: 0.3,
      arousal: 0.6,
      detected_emotion: "passionate",
      confidence: 0.75,
      expressiveness: 0.82,
      emotional_range: 0.68,
    };
  }

  // Utility methods (simplified implementations)
  private extractFundamentalFrequency(audioData: Float32Array): number[] {
    // Simplified - would use advanced pitch detection
    return [220, 225, 230, 228, 232, 229];
  }

  private calculatePitchStability(fundamental: number[]): number {
    const variance = this.calculateVariance(fundamental);
    return Math.max(0, 1 - variance / 100);
  }

  private assessPitchAccuracy(
    fundamental: number[],
    audioAnalysis: AudioAnalysisResult
  ): number {
    // Compare with expected pitches based on key and harmony
    return 0.85;
  }

  private calculateCentsDeviation(fundamental: number[]): number[] {
    // Calculate cent deviations from expected pitches
    return fundamental.map(() => Math.random() * 20 - 10);
  }

  private detectVibratoRate(fundamental: number[]): number {
    // Detect periodic fluctuations in fundamental frequency
    return 5.5; // Hz
  }

  private calculateVibratoExtent(fundamental: number[]): number {
    // Calculate the extent of pitch variation in cents
    return 45; // cents
  }

  private detectGlissandoEvents(fundamental: number[]): GlissandoEvent[] {
    return [];
  }

  private frequencyToNote(frequency: number): string {
    const A4 = 440;
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
    const noteNumber = Math.round(12 * Math.log2(frequency / A4)) + 69;
    const octave = Math.floor(noteNumber / 12) - 1;
    const note = noteNames[noteNumber % 12];
    return `${note}${octave}`;
  }

  private determineComfortableRange(frequencies: number[]): {
    low: string;
    high: string;
  } {
    // Determine the range where the voice sounds most natural
    const sortedFreqs = frequencies.sort((a, b) => a - b);
    const lowIndex = Math.floor(sortedFreqs.length * 0.2);
    const highIndex = Math.floor(sortedFreqs.length * 0.8);

    return {
      low: this.frequencyToNote(sortedFreqs[lowIndex]),
      high: this.frequencyToNote(sortedFreqs[highIndex]),
    };
  }

  private calculateOctaveSpan(lowestHz: number, highestHz: number): number {
    return Math.log2(highestHz / lowestHz);
  }

  private determineTessitura(frequencies: number[]): string {
    // Analyze where the voice spends most of its time
    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    return this.frequencyToNote(avgFreq);
  }

  private detectRegisterBreaks(audioData: Float32Array): RegisterBreak[] {
    return [];
  }

  private extractSpectralFeatures(audioData: Float32Array): any {
    // Extract spectral characteristics for tone analysis
    return {};
  }

  private classifyToneQuality(spectralFeatures: any): ToneQuality {
    return "warm";
  }

  private calculateWarmth(spectralFeatures: any): number {
    return 0.75;
  }

  private calculateBrightness(spectralFeatures: any): number {
    return 0.6;
  }

  private calculateFullness(spectralFeatures: any): number {
    return 0.8;
  }

  private calculateClarity(spectralFeatures: any): number {
    return 0.85;
  }

  private calculateRichness(spectralFeatures: any): number {
    return 0.72;
  }

  private detectNasality(spectralFeatures: any): number {
    return 0.15;
  }

  private detectBreathiness(spectralFeatures: any): number {
    return 0.2;
  }

  private detectStrain(spectralFeatures: any): number {
    return 0.1;
  }

  private determineVocalPlacement(spectralFeatures: any): VocalPlacement {
    return "mixed";
  }

  private detectVibratoPresence(fundamental: number[]): boolean {
    // Detect periodic modulation in pitch
    return true;
  }

  private calculateVibratoRate(fundamental: number[]): number {
    return 5.8;
  }

  private assessVibratoRegularity(fundamental: number[]): number {
    return 0.85;
  }

  private detectVibratoOnset(fundamental: number[]): number {
    return 0.3; // seconds
  }

  private classifyVibratoQuality(
    fundamental: number[]
  ): VibratoAnalysis["quality"] {
    return "natural";
  }

  private assessVibratoConsistency(fundamental: number[]): number {
    return 0.8;
  }

  private detectBreathMarks(audioData: Float32Array): BreathMark[] {
    return [];
  }

  private segmentIntoPhrases(
    audioData: Float32Array,
    breathMarks: BreathMark[]
  ): Array<{ duration: number }> {
    return [{ duration: 8.5 }, { duration: 6.2 }, { duration: 7.8 }];
  }

  private assessBreathSupport(audioData: Float32Array): number {
    return 0.78;
  }

  private assessBreathControl(phrases: Array<{ duration: number }>): number {
    return 0.82;
  }

  private estimateBreathCapacity(phrases: Array<{ duration: number }>): number {
    const avgPhraseLength =
      phrases.reduce((sum, p) => sum + p.duration, 0) / phrases.length;
    return Math.min(avgPhraseLength / 6, 1.0); // Normalize
  }

  private calculateBreathEfficiency(
    audioData: Float32Array,
    phrases: Array<{ duration: number }>
  ): number {
    return 0.75;
  }

  private calculateRecoveryTimes(breathMarks: BreathMark[]): number[] {
    return breathMarks.map((mark) => mark.duration);
  }

  private classifyBreathTechnique(audioData: Float32Array): BreathTechnique {
    return "diaphragmatic";
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private determineVoiceType(
    range: VocalRange,
    tone: ToneAnalysis,
    formants: FormantAnalysis
  ): VoiceType {
    // Analyze range, timbre, and formant frequencies to classify voice type
    return "tenor"; // Simplified
  }

  private assessSkillLevel(
    pitch: PitchAnalysis,
    tone: ToneAnalysis,
    breath: BreathAnalysis,
    intonation: VocalIntonationAnalysis
  ): VocalSkillLevel {
    const overallScore =
      (pitch.accuracy +
        tone.clarity +
        breath.control +
        intonation.overall_accuracy) /
      4;

    if (overallScore >= 0.9) return "professional";
    if (overallScore >= 0.75) return "advanced";
    if (overallScore >= 0.6) return "intermediate";
    return "beginner";
  }

  private identifyWeaknesses(
    pitch: PitchAnalysis,
    tone: ToneAnalysis,
    breath: BreathAnalysis,
    articulation: ArticulationAnalysis
  ): VocalWeakness[] {
    const weaknesses: VocalWeakness[] = [];

    if (pitch.accuracy < 0.7) {
      weaknesses.push({
        area: "Pitch Accuracy",
        severity: "moderate",
        description: "Inconsistent intonation, especially in higher register",
        recommended_focus: "Ear training and vocal exercises",
      });
    }

    if (breath.support < 0.6) {
      weaknesses.push({
        area: "Breath Support",
        severity: "major",
        description:
          "Insufficient diaphragmatic support affecting tone quality",
        recommended_focus: "Breathing exercises and posture work",
      });
    }

    return weaknesses;
  }

  private identifyStrengths(
    pitch: PitchAnalysis,
    tone: ToneAnalysis,
    breath: BreathAnalysis,
    resonance: ResonanceAnalysis
  ): VocalStrength[] {
    const strengths: VocalStrength[] = [];

    if (tone.warmth > 0.8) {
      strengths.push({
        area: "Tone Quality",
        quality: "excellent",
        description: "Rich, warm tone with good resonance",
        maintain_with: "Continue current warm-up routine",
      });
    }

    if (resonance.projection > 0.8) {
      strengths.push({
        area: "Vocal Projection",
        quality: "excellent",
        description: "Strong projection with good resonance balance",
        maintain_with: "Regular scales and projection exercises",
      });
    }

    return strengths;
  }

  private generateSuggestions(
    weaknesses: VocalWeakness[],
    strengths: VocalStrength[],
    skillLevel: VocalSkillLevel
  ): VocalSuggestion[] {
    const suggestions: VocalSuggestion[] = [];

    weaknesses.forEach((weakness) => {
      suggestions.push({
        type: "technical",
        priority: weakness.severity === "major" ? "high" : "medium",
        message: `Focus on improving ${weakness.area.toLowerCase()}`,
        explanation: weakness.description,
        timeframe: "2-4 weeks with daily practice",
      });
    });

    return suggestions;
  }

  private recommendExercises(
    weaknesses: VocalWeakness[],
    voiceType: VoiceType,
    skillLevel: VocalSkillLevel
  ): VocalExercise[] {
    const exercises: VocalExercise[] = [];

    exercises.push({
      name: "Lip Trills",
      purpose: "Warm up and improve breath support",
      description: "Gentle lip vibrations with scales",
      duration: 5,
      frequency: "Daily",
      difficulty: "easy",
      focus_areas: ["breath_support", "warm_up"],
      instructions: [
        "Relax lips and create gentle vibration",
        "Start with comfortable pitch",
        "Gradually move through 5-note scales",
        "Maintain steady airflow",
      ],
    });

    if (weaknesses.some((w) => w.area === "Pitch Accuracy")) {
      exercises.push({
        name: "Interval Training",
        purpose: "Improve pitch accuracy and ear training",
        description: "Practice singing specific intervals accurately",
        duration: 10,
        frequency: "Daily",
        difficulty: "medium",
        focus_areas: ["pitch_accuracy", "ear_training"],
        instructions: [
          "Start with major thirds and fifths",
          "Use piano for reference",
          "Sing intervals slowly and deliberately",
          "Record and compare with reference",
        ],
      });
    }

    return exercises;
  }

  /**
   * Get the last analysis result
   */
  getLastAnalysis(): VocalAnalysisResult | undefined {
    return this.lastAnalysis;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.lastAnalysis = undefined;
  }
}
