/**
 * ProgressionGenerator.ts - Chord Progression Creation Engine
 * 🎼 Advanced chord progression generation for Maestro.ai
 * Part of Maestro.ai Brain System
 *
 * FIXED: TypeScript issues with VoiceLeadingAnalysis and proper ChordProgression integration
 */

import { generateId } from "../../shared/utils";
import {
  Key,
  BrainModule,
  MusicGenre,
  ChordProgression,
  MusicTheoryHarmonyAnalysis,
  ChordInfo,
  Cadence,
  Modulation,
} from "../../shared/types";

// Import brain modules for integration
import { MusicTheoryEngine } from "./MusicTheoryEngine";

// Progression generation specific interfaces
export interface ProgressionGenerationRequest {
  id?: string;
  type:
    | "harmonic_progression"
    | "bass_line"
    | "voice_leading"
    | "reharmonization"
    | "modulation_sequence";
  parameters: ProgressionParameters;
  constraints?: ProgressionConstraints;
  style?: ProgressionStyle;
  context?: ProgressionContext;
}

export interface ProgressionParameters {
  key: Key;
  length: number; // Number of chords
  timeSignature?: string;
  tempo?: number;
  harmonicRhythm?: number; // Chords per measure
  complexity?: "simple" | "moderate" | "complex" | "advanced";
  tension?: "low" | "medium" | "high" | "variable";
  resolution?: "strong" | "weak" | "deceptive" | "none";
}

export interface ProgressionConstraints {
  allowedChords?: string[];
  forbiddenChords?: string[];
  requiredChords?: RequiredChord[];
  voiceLeadingRules?: VoiceLeadingRule[];
  maxChordDistance?: number; // Semitones from tonic
  requireFunctionalHarmony?: boolean;
  allowChromaticMediant?: boolean;
  allowNeapolitanSixth?: boolean;
  allowAugmentedSixth?: boolean;
  allowDiminishedChords?: boolean;
}

export interface RequiredChord {
  chord: string;
  position?: number; // Specific position in progression
  function?: string; // "tonic", "subdominant", "dominant", etc.
  timing?: "beginning" | "middle" | "end" | "climax";
}

export interface VoiceLeadingRule {
  rule:
    | "avoid_parallel_fifths"
    | "avoid_parallel_octaves"
    | "smooth_bass"
    | "contrary_motion"
    | "step_wise_motion";
  strictness: "strict" | "prefer" | "suggest";
  voices?: string[]; // Which voices the rule applies to
}

export interface ProgressionStyle {
  genre: MusicGenre;
  period?: "baroque" | "classical" | "romantic" | "modern" | "contemporary";
  characteristics?: StyleCharacteristic[];
  influences?: StyleInfluence[];
  innovation?: number; // 0-1 (0 = traditional, 1 = innovative)
}

export interface StyleCharacteristic {
  name: string;
  weight: number; // 0-1 importance
  implementation: string[];
  examples: string[];
}

export interface StyleInfluence {
  source: string; // "jazz", "blues", "classical", etc.
  strength: number; // 0-1
  elements: string[];
}

export interface ProgressionContext {
  songStructure?: SongStructure;
  precedingProgression?: string[];
  followingProgression?: string[];
  melodicContext?: MelodicContext;
  rhythmicContext?: RhythmicContext;
  emotionalContent?: EmotionalContent;
}

export interface SongStructure {
  section: "intro" | "verse" | "chorus" | "bridge" | "outro" | "solo";
  position: number; // Position within section
  totalLength: number; // Total section length
  function: "establish" | "develop" | "climax" | "resolve" | "transition";
}

export interface MelodicContext {
  melodyNotes?: string[];
  melodicContour?: "ascending" | "descending" | "arch" | "valley" | "static";
  melodicRange?: [string, string]; // [lowest, highest] notes
  melodicPhrasing?: PhrasingData[];
}

export interface PhrasingData {
  startBeat: number;
  endBeat: number;
  contour: string;
  climax?: number;
  resolution?: number;
}

export interface RhythmicContext {
  rhythmicComplexity?: "simple" | "moderate" | "complex";
  syncopation?: number; // 0-1
  rhythmicMotifs?: RhythmicMotif[];
  accentPattern?: number[]; // Beat positions of accents
}

export interface RhythmicMotif {
  pattern: number[]; // Beat positions
  emphasis: number[]; // Emphasis levels
  repetition: number; // How many times it repeats
}

export interface EmotionalContent {
  primaryEmotion:
    | "happy"
    | "sad"
    | "tense"
    | "peaceful"
    | "dramatic"
    | "mysterious"
    | "triumphant";
  emotionalIntensity: number; // 0-1
  emotionalProgression?: EmotionalProgression[];
  targetMood?: string;
}

export interface EmotionalProgression {
  startEmotion: string;
  endEmotion: string;
  transitionType: "gradual" | "sudden" | "cyclical";
  peak?: number; // Beat position of emotional peak
}

export interface ProgressionGenerationResult {
  id: string;
  timestamp: Date;
  request: ProgressionGenerationRequest;

  // Generated progression (detailed analysis version)
  progression: GeneratedProgression;
  alternativeProgressions: GeneratedProgression[];

  // Shared chord progression format for compatibility
  chordProgression: ChordProgression;

  // Analysis and insights
  harmonicAnalysis: HarmonicAnalysis;
  voiceLeadingAnalysis: VoiceLeadingAnalysis;
  functionalAnalysis: FunctionalAnalysis;

  // Style and context
  styleAnalysis: StyleAnalysis;
  emotionalAnalysis: EmotionalAnalysis;

  // Practical information
  playabilityAssessment: PlayabilityAssessment;
  arrangementSuggestions: ArrangementSuggestion[];

  // Metadata
  confidence: number;
  processingTime: number;
  generationMetrics: GenerationMetrics;
}

export interface GeneratedProgression {
  id: string;
  name?: string;
  chords: GeneratedChord[];
  romanNumerals: string[];
  bassLine: BassNote[];
  voiceLeading: VoiceLeadingData;
  cadences: Cadence[];
  modulations: Modulation[];
  functionalAnalysis: string[];
  totalDuration: number; // beats
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface GeneratedChord {
  position: number; // Beat position
  duration: number; // Beat duration
  chord: string; // Chord symbol (Cmaj7, Dm, etc.)
  romanNumeral: string;
  function: string; // "tonic", "subdominant", "dominant", etc.
  notes: string[]; // Individual notes
  bass: string; // Bass note
  inversion?: string;
  extensions?: string[];
  alterations?: string[];
  voicing: ChordVoicing;
  tension: number; // 0-1
  stability: number; // 0-1
  color: number; // 0-1 (how colorful/jazzy)
}

export interface ChordVoicing {
  type: "close" | "open" | "spread" | "cluster";
  doubling?: string[]; // Which notes are doubled
  omissions?: string[]; // Which chord tones are omitted
  spacing: VoiceSpacing[];
  range: [string, string]; // [lowest, highest] notes
  density: number; // 0-1
}

export interface VoiceSpacing {
  voice: string;
  note: string;
  octave: number;
  interval: string; // Interval from bass
}

export interface BassNote {
  position: number;
  duration: number;
  note: string;
  function: "root" | "third" | "fifth" | "seventh" | "chromatic" | "pedal";
  movement: "step" | "leap" | "static";
  intervalFromPrevious?: string;
}

export interface VoiceLeadingData {
  overallQuality: number; // 0-1
  smoothness: number; // 0-1
  independence: number; // 0-1
  voiceMovements: VoiceMovement[];
  violations: VoiceLeadingViolation[];
  strengths: VoiceLeadingStrength[];
}

// ✅ FIXED: Added missing VoiceLeadingAnalysis interface
export interface VoiceLeadingAnalysis {
  overallQuality: number; // 0-1
  smoothness: number; // 0-1
  independence: number; // 0-1
  voiceMovements: VoiceMovement[];
  violations: VoiceLeadingViolation[];
  strengths: VoiceLeadingStrength[];
  recommendation: string[];
  score: number; // 0-100
}

export interface VoiceMovement {
  fromChord: number; // Chord index
  toChord: number; // Chord index
  voice: string;
  fromNote: string;
  toNote: string;
  interval: string;
  movement: "step" | "leap" | "static";
  quality: number; // 0-1
}

export interface VoiceLeadingViolation {
  type:
    | "parallel_fifths"
    | "parallel_octaves"
    | "voice_crossing"
    | "large_leap"
    | "unresolved_dissonance";
  severity: "minor" | "moderate" | "major";
  location: [number, number]; // [fromChord, toChord]
  voices: string[];
  suggestion?: string;
}

export interface VoiceLeadingStrength {
  type:
    | "smooth_motion"
    | "contrary_motion"
    | "proper_resolution"
    | "good_spacing";
  quality: number; // 0-1
  location: [number, number]; // [fromChord, toChord]
  voices: string[];
  description: string;
}

export interface HarmonicAnalysis {
  keyStability: number; // 0-1
  chromaticism: number; // 0-1
  dissonanceLevel: number; // 0-1
  colorHarmony: number; // 0-1
  functionalClarity: number; // 0-1
  harmonicRhythm: HarmonicRhythmAnalysis;
  tensionCurve: TensionPoint[];
  keyArea: KeyAreaAnalysis[];
}

export interface HarmonicRhythmAnalysis {
  averageRate: number; // Chords per measure
  variability: number; // 0-1 (how much it varies)
  acceleration: AccelerationPoint[];
  deceleration: DecelerationPoint[];
  stability: number; // 0-1
}

export interface AccelerationPoint {
  position: number;
  fromRate: number;
  toRate: number;
  effect: string;
}

export interface DecelerationPoint {
  position: number;
  fromRate: number;
  toRate: number;
  effect: string;
}

export interface TensionPoint {
  position: number;
  tension: number; // 0-1
  sources: string[]; // What creates the tension
  resolution?: number; // Position where it resolves
}

export interface KeyAreaAnalysis {
  startPosition: number;
  endPosition: number;
  key: Key;
  stability: number; // 0-1
  establishmentMethod: string;
  departureMethod?: string;
}

export interface FunctionalAnalysis {
  primaryKey: Key;
  secondaryKeys: Key[];
  tonalPlan: TonalPlan;
  cadentialStrength: number; // 0-1
  functionalProgression: FunctionalProgression[];
  sequenceAnalysis: SequenceAnalysis[];
}

export interface TonalPlan {
  overallStructure: string;
  keyRelationships: KeyRelationship[];
  returnToTonic: number; // 0-1 how strongly it returns
  adventure: number; // 0-1 how far it ventures from home key
}

export interface KeyRelationship {
  fromKey: Key;
  toKey: Key;
  relationship:
    | "dominant"
    | "subdominant"
    | "relative"
    | "parallel"
    | "chromatic_mediant"
    | "tritone";
  strength: number; // 0-1
  method: string; // How the modulation occurs
}

export interface FunctionalProgression {
  position: number;
  function:
    | "tonic"
    | "subdominant"
    | "dominant"
    | "applied_dominant"
    | "chromatic"
    | "deceptive";
  strength: number; // 0-1
  preparation?: string;
  resolution?: string;
  expectation: number; // 0-1 how expected this progression is
}

export interface SequenceAnalysis {
  startPosition: number;
  endPosition: number;
  pattern: string;
  intervalPattern: string;
  repetitions: number;
  sequential: boolean;
  modulating: boolean;
}

export interface StyleAnalysis {
  genreAuthenticity: number; // 0-1
  periodAuthenticity: number; // 0-1
  stylisticElements: StylisticElement[];
  innovations: Innovation[];
  influences: InfluenceDetection[];
  clicheLevel: number; // 0-1
}

export interface StylisticElement {
  element: string;
  strength: number; // 0-1
  authenticity: number; // 0-1
  implementation: string;
  examples: string[];
}

export interface Innovation {
  type: string;
  description: string;
  novelty: number; // 0-1
  effectiveness: number; // 0-1
  risk: number; // 0-1
}

export interface InfluenceDetection {
  source: string;
  strength: number; // 0-1
  elements: string[];
  integration: number; // 0-1 how well integrated
}

export interface EmotionalAnalysis {
  overallMood: string;
  emotionalIntensity: number; // 0-1
  emotionalProgression: EmotionalArc[];
  moodConsistency: number; // 0-1
  emotionalClarity: number; // 0-1
}

export interface EmotionalArc {
  position: number;
  emotion: string;
  intensity: number; // 0-1
  transition: "smooth" | "abrupt" | "gradual";
  source: string[]; // What chords/progressions create this emotion
}

export interface PlayabilityAssessment {
  overallDifficulty: number; // 1-10
  instrumentDifficulties: { [instrument: string]: number };
  technicalChallenges: TechnicalChallenge[];
  learningCurve: LearningCurve;
  adaptationSuggestions: AdaptationSuggestion[];
}

export interface TechnicalChallenge {
  instrument: string;
  challenge: string;
  difficulty: number; // 1-10
  alternative?: string;
  practiceMethod?: string;
}

export interface LearningCurve {
  beginnerFriendly: number; // 0-1
  intermediateAccessible: number; // 0-1
  advancedRequired: number; // 0-1
  teachingPoints: string[];
  progressionPath: string[];
}

export interface AdaptationSuggestion {
  instrument: string;
  adaptation: string;
  reason: string;
  complexity: "simple" | "moderate" | "complex";
  tradeoffs: string[];
}

export interface ArrangementSuggestion {
  category: "instrumentation" | "rhythm" | "dynamics" | "texture" | "form";
  suggestion: string;
  reasoning: string;
  implementation: string[];
  difficulty: "easy" | "moderate" | "challenging";
  impact: number; // 0-1
}

export interface GenerationMetrics {
  algorithmsUsed: string[];
  iterations: number;
  optimizationScore: number; // 0-1
  constraintsSatisfied: number; // 0-1
  creativityScore: number; // 0-1
  computationTime: { [stage: string]: number };
  qualityMetrics: QualityMetric[];
}

export interface QualityMetric {
  metric: string;
  value: number;
  target: number;
  achieved: boolean;
  importance: number; // 0-1
}

/**
 * 🎼 ProgressionGenerator - Chord Progression Creation Engine
 *
 * This engine generates sophisticated chord progressions using advanced
 * music theory, voice leading principles, and style-specific knowledge.
 * It creates progressions that are both theoretically sound and musically engaging.
 */
export class ProgressionGenerator implements BrainModule {
  // BrainModule properties
  public readonly name: string = "ProgressionGenerator";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;

  // Brain module integrations
  private musicTheoryEngine: MusicTheoryEngine;

  // Progression generation state
  private generationCache: Map<string, ProgressionGenerationResult> = new Map();
  private styleTemplates: Map<string, any> = new Map();
  private progressionPatterns: Map<string, any> = new Map();
  private voiceLeadingRules: VoiceLeadingRule[] = [];

  // Generation algorithms
  private generationAlgorithms: Map<string, any> = new Map();

  constructor() {
    this.musicTheoryEngine = new MusicTheoryEngine();

    console.log("🎼 ProgressionGenerator created");
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load style templates
      await this.loadStyleTemplates();

      // Load progression patterns
      await this.loadProgressionPatterns();

      // Initialize voice leading rules
      this.initializeVoiceLeadingRules();

      // Initialize generation algorithms
      this.initializeGenerationAlgorithms();

      this.initialized = true;
      console.log("✅ ProgressionGenerator initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize ProgressionGenerator:", error);
      throw error;
    }
  }

  getStatus() {
    return {
      name: this.name,
      version: this.version,
      initialized: this.initialized,
      cachedGenerations: this.generationCache.size,
      styleTemplates: this.styleTemplates.size,
      progressionPatterns: this.progressionPatterns.size,
      voiceLeadingRules: this.voiceLeadingRules.length,
    };
  }

  /**
   * 🎯 Main progression generation method
   */
  async generateProgression(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    if (!this.initialized) {
      throw new Error("ProgressionGenerator not initialized");
    }

    const requestId = generateId("progression-generation");
    const startTime = Date.now();

    try {
      let result: ProgressionGenerationResult;

      switch (request.type) {
        case "harmonic_progression":
          result = await this.generateHarmonicProgression(request);
          break;
        case "bass_line":
          result = await this.generateBassLineProgression(request);
          break;
        case "voice_leading":
          result = await this.generateVoiceLeadingProgression(request);
          break;
        case "reharmonization":
          result = await this.generateReharmonization(request);
          break;
        case "modulation_sequence":
          result = await this.generateModulationSequence(request);
          break;
        default:
          throw new Error(`Unsupported progression type: ${request.type}`);
      }

      // Add metadata
      result.id = requestId;
      result.timestamp = new Date();
      result.processingTime = Date.now() - startTime;

      // Cache result
      this.generationCache.set(requestId, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Progression generation failed";
      throw new Error(`Progression generation failed: ${errorMessage}`);
    }
  }

  /**
   * 🎵 Generate harmonic progression
   */
  private async generateHarmonicProgression(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    const parameters = request.parameters;
    const style = request.style;

    // Generate primary progression
    const progression = this.createHarmonicProgression(
      parameters,
      request.constraints,
      style
    );

    // Generate alternatives
    const alternativeProgressions = this.generateAlternativeProgressions(
      progression,
      parameters
    );

    // Perform comprehensive analysis
    const harmonicAnalysis = this.analyzeHarmony(progression);
    const voiceLeadingAnalysis = this.analyzeVoiceLeading(progression);
    const functionalAnalysis = this.analyzeFunctionalHarmony(progression);
    const styleAnalysis = this.analyzeStyle(progression, style);
    const emotionalAnalysis = this.analyzeEmotionalContent(
      progression,
      request.context
    );
    const playabilityAssessment = this.assessPlayability(progression);
    const arrangementSuggestions = this.generateArrangementSuggestions(
      progression,
      harmonicAnalysis
    );

    // Generate shared chord progression format for compatibility
    const chordProgression: ChordProgression = {
      numerals: progression.romanNumerals,
      chords: progression.chords.map((c) => c.chord),
      key: parameters.key.tonic + (parameters.key.mode === "minor" ? "m" : ""),
      genre: style?.genre || MusicGenre.ROCK,
      commonality: "common",
      emotional: this.determineProgressionEmotion(progression),
      romanNumerals: progression.romanNumerals,
      tempo: parameters.tempo || 120,
      timeSignature: parameters.timeSignature || "4/4",
      measures: progression.chords.length,
    };

    return {
      id: "",
      timestamp: new Date(),
      request,
      progression,
      alternativeProgressions,
      chordProgression,
      harmonicAnalysis,
      voiceLeadingAnalysis,
      functionalAnalysis,
      styleAnalysis,
      emotionalAnalysis,
      playabilityAssessment,
      arrangementSuggestions,
      confidence: this.calculateGenerationConfidence(
        progression,
        harmonicAnalysis
      ),
      processingTime: 0,
      generationMetrics: this.createGenerationMetrics(
        ["harmonic_progression_algorithm"],
        progression.chords.length
      ),
    };
  }

  /**
   * 🎸 Generate bass line focused progression
   */
  private async generateBassLineProgression(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    const parameters = request.parameters;

    // Generate progression with emphasis on bass movement
    const progression = this.createBassLineProgression(
      parameters,
      request.constraints
    );

    return this.buildProgressionResult(request, progression, [
      "bass_line_algorithm",
    ]);
  }

  /**
   * 🎭 Generate voice leading focused progression
   */
  private async generateVoiceLeadingProgression(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    const parameters = request.parameters;

    // Generate progression optimized for smooth voice leading
    const progression = this.createVoiceLeadingProgression(
      parameters,
      request.constraints
    );

    return this.buildProgressionResult(request, progression, [
      "voice_leading_algorithm",
    ]);
  }

  /**
   * 🔄 Generate reharmonization
   */
  private async generateReharmonization(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    const parameters = request.parameters;

    // Generate reharmonized version of existing progression
    const progression = this.createReharmonization(parameters, request.context);

    return this.buildProgressionResult(request, progression, [
      "reharmonization_algorithm",
    ]);
  }

  /**
   * 🌊 Generate modulation sequence
   */
  private async generateModulationSequence(
    request: ProgressionGenerationRequest
  ): Promise<ProgressionGenerationResult> {
    const parameters = request.parameters;

    // Generate progression with planned modulations
    const progression = this.createModulationSequence(
      parameters,
      request.constraints
    );

    return this.buildProgressionResult(request, progression, [
      "modulation_sequence_algorithm",
    ]);
  }

  // ========== HELPER METHODS ==========

  private async loadStyleTemplates(): Promise<void> {
    // Load style-specific progression templates
    console.log("🎨 Loading style templates...");
  }

  private async loadProgressionPatterns(): Promise<void> {
    // Load common progression patterns
    console.log("🎼 Loading progression patterns...");
  }

  private initializeVoiceLeadingRules(): void {
    this.voiceLeadingRules = [
      {
        rule: "avoid_parallel_fifths",
        strictness: "strict",
        voices: ["soprano", "alto", "tenor", "bass"],
      },
      {
        rule: "avoid_parallel_octaves",
        strictness: "strict",
        voices: ["soprano", "alto", "tenor", "bass"],
      },
      {
        rule: "smooth_bass",
        strictness: "prefer",
        voices: ["bass"],
      },
    ];
  }

  private initializeGenerationAlgorithms(): void {
    this.generationAlgorithms.set(
      "harmonic_progression",
      this.harmonicProgressionAlgorithm.bind(this)
    );
    this.generationAlgorithms.set(
      "bass_line",
      this.bassLineAlgorithm.bind(this)
    );
    this.generationAlgorithms.set(
      "voice_leading",
      this.voiceLeadingAlgorithm.bind(this)
    );
    this.generationAlgorithms.set(
      "reharmonization",
      this.reharmonizationAlgorithm.bind(this)
    );
    this.generationAlgorithms.set(
      "modulation_sequence",
      this.modulationSequenceAlgorithm.bind(this)
    );
  }

  // Placeholder implementations for complex generation methods
  private createHarmonicProgression(
    _parameters: ProgressionParameters,
    _constraints?: ProgressionConstraints,
    _style?: ProgressionStyle
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }

  private generateAlternativeProgressions(
    _progression: GeneratedProgression,
    _parameters: ProgressionParameters
  ): GeneratedProgression[] {
    return [];
  }

  private analyzeHarmony(_progression: GeneratedProgression): HarmonicAnalysis {
    return {
      keyStability: 0.8,
      chromaticism: 0.3,
      dissonanceLevel: 0.4,
      colorHarmony: 0.5,
      functionalClarity: 0.9,
      harmonicRhythm: {
        averageRate: 1,
        variability: 0.3,
        acceleration: [],
        deceleration: [],
        stability: 0.8,
      },
      tensionCurve: [],
      keyArea: [],
    };
  }

  // ✅ FIXED: Updated analyzeVoiceLeading to return proper VoiceLeadingAnalysis
  private analyzeVoiceLeading(
    _progression: GeneratedProgression
  ): VoiceLeadingAnalysis {
    return {
      overallQuality: 0.85,
      smoothness: 0.8,
      independence: 0.7,
      voiceMovements: [],
      violations: [],
      strengths: [],
      recommendation: [
        "Consider adding more contrary motion",
        "Voice leading is generally smooth",
      ],
      score: 85,
    };
  }

  private analyzeFunctionalHarmony(
    _progression: GeneratedProgression
  ): FunctionalAnalysis {
    return {
      primaryKey: { tonic: "C", mode: "major", signature: "0" },
      secondaryKeys: [],
      tonalPlan: {
        overallStructure: "simple tonal",
        keyRelationships: [],
        returnToTonic: 0.9,
        adventure: 0.3,
      },
      cadentialStrength: 0.8,
      functionalProgression: [],
      sequenceAnalysis: [],
    };
  }

  private analyzeStyle(
    _progression: GeneratedProgression,
    _style?: ProgressionStyle
  ): StyleAnalysis {
    return {
      genreAuthenticity: 0.8,
      periodAuthenticity: 0.7,
      stylisticElements: [],
      innovations: [],
      influences: [],
      clicheLevel: 0.3,
    };
  }

  private analyzeEmotionalContent(
    _progression: GeneratedProgression,
    _context?: ProgressionContext
  ): EmotionalAnalysis {
    return {
      overallMood: "happy",
      emotionalIntensity: 0.6,
      emotionalProgression: [],
      moodConsistency: 0.8,
      emotionalClarity: 0.7,
    };
  }

  private assessPlayability(
    _progression: GeneratedProgression
  ): PlayabilityAssessment {
    return {
      overallDifficulty: 5,
      instrumentDifficulties: { piano: 5, guitar: 6 },
      technicalChallenges: [],
      learningCurve: {
        beginnerFriendly: 0.6,
        intermediateAccessible: 0.8,
        advancedRequired: 0.2,
        teachingPoints: [],
        progressionPath: [],
      },
      adaptationSuggestions: [],
    };
  }

  private generateArrangementSuggestions(
    _progression: GeneratedProgression,
    _harmonicAnalysis: HarmonicAnalysis
  ): ArrangementSuggestion[] {
    return [
      {
        category: "instrumentation",
        suggestion: "Add strings for harmonic richness",
        reasoning:
          "Progression has sophisticated harmony that would benefit from string section",
        implementation: [
          "String pad on sustained chords",
          "Arpeggiated patterns on transitions",
        ],
        difficulty: "moderate",
        impact: 0.7,
      },
    ];
  }

  private calculateGenerationConfidence(
    _progression: GeneratedProgression,
    _harmonicAnalysis: HarmonicAnalysis
  ): number {
    return _harmonicAnalysis.functionalClarity * 0.9;
  }

  private createGenerationMetrics(
    algorithmsUsed: string[],
    chordCount: number
  ): GenerationMetrics {
    return {
      algorithmsUsed,
      iterations: chordCount * 3,
      optimizationScore: 0.8,
      constraintsSatisfied: 0.9,
      creativityScore: 0.7,
      computationTime: { generation: 150 },
      qualityMetrics: [],
    };
  }

  // ✅ FIXED: Added helper method to determine progression emotion
  private determineProgressionEmotion(
    progression: GeneratedProgression
  ): "happy" | "sad" | "tense" | "resolved" | "mysterious" | "powerful" {
    const romanNumerals = progression.romanNumerals;
    const minorChords = romanNumerals.filter(
      (rn) => rn.toLowerCase() === rn
    ).length;
    const hasV = romanNumerals.some((rn) => rn.toLowerCase() === "v");
    const hasI = romanNumerals.some(
      (rn) => rn.toLowerCase() === "i" || rn === "I"
    );

    if (minorChords > romanNumerals.length / 2) return "sad";
    if (hasV && hasI) return "resolved";
    if (hasV) return "tense";
    if (romanNumerals.includes("vi") || romanNumerals.includes("VI"))
      return "mysterious";
    return "happy";
  }

  // Helper method to build standard progression result
  private buildProgressionResult(
    request: ProgressionGenerationRequest,
    progression: GeneratedProgression,
    algorithmsUsed: string[]
  ): ProgressionGenerationResult {
    // Create shared chord progression format for compatibility
    const chordProgression: ChordProgression = {
      numerals: progression.romanNumerals,
      chords: progression.chords.map((c) => c.chord),
      key:
        request.parameters.key.tonic +
        (request.parameters.key.mode === "minor" ? "m" : ""),
      genre: request.style?.genre || MusicGenre.ROCK,
      commonality: "common",
      emotional: this.determineProgressionEmotion(progression),
      romanNumerals: progression.romanNumerals,
      tempo: request.parameters.tempo || 120,
      timeSignature: request.parameters.timeSignature || "4/4",
      measures: progression.chords.length,
    };

    return {
      id: "",
      timestamp: new Date(),
      request,
      progression,
      alternativeProgressions: this.generateAlternativeProgressions(
        progression,
        request.parameters
      ),
      chordProgression,
      harmonicAnalysis: this.analyzeHarmony(progression),
      voiceLeadingAnalysis: this.analyzeVoiceLeading(progression),
      functionalAnalysis: this.analyzeFunctionalHarmony(progression),
      styleAnalysis: this.analyzeStyle(progression, request.style),
      emotionalAnalysis: this.analyzeEmotionalContent(
        progression,
        request.context
      ),
      playabilityAssessment: this.assessPlayability(progression),
      arrangementSuggestions: this.generateArrangementSuggestions(
        progression,
        this.analyzeHarmony(progression)
      ),
      confidence: this.calculateGenerationConfidence(
        progression,
        this.analyzeHarmony(progression)
      ),
      processingTime: 0,
      generationMetrics: this.createGenerationMetrics(
        algorithmsUsed,
        progression.chords.length
      ),
    };
  }

  // Additional generation methods
  private createBassLineProgression(
    _parameters: ProgressionParameters,
    _constraints?: ProgressionConstraints
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private createVoiceLeadingProgression(
    _parameters: ProgressionParameters,
    _constraints?: ProgressionConstraints
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private createReharmonization(
    _parameters: ProgressionParameters,
    _context?: ProgressionContext
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private createModulationSequence(
    _parameters: ProgressionParameters,
    _constraints?: ProgressionConstraints
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }

  // Algorithm implementations
  private harmonicProgressionAlgorithm(
    _parameters: ProgressionParameters
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private bassLineAlgorithm(
    _parameters: ProgressionParameters
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private voiceLeadingAlgorithm(
    _parameters: ProgressionParameters
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private reharmonizationAlgorithm(
    _parameters: ProgressionParameters
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }
  private modulationSequenceAlgorithm(
    _parameters: ProgressionParameters
  ): GeneratedProgression {
    return this.getDefaultProgression();
  }

  // Default value generator
  private getDefaultProgression(): GeneratedProgression {
    return {
      id: generateId("progression"),
      name: "Generated Progression",
      chords: [
        {
          position: 0,
          duration: 4,
          chord: "C",
          romanNumeral: "I",
          function: "tonic",
          notes: ["C", "E", "G"],
          bass: "C",
          voicing: {
            type: "close",
            spacing: [],
            range: ["C3", "C5"],
            density: 0.6,
          },
          tension: 0.1,
          stability: 0.9,
          color: 0.2,
        },
      ],
      romanNumerals: ["I"],
      bassLine: [
        {
          position: 0,
          duration: 4,
          note: "C",
          function: "root",
          movement: "static",
        },
      ],
      voiceLeading: {
        overallQuality: 0.8,
        smoothness: 0.85,
        independence: 0.7,
        voiceMovements: [],
        violations: [],
        strengths: [],
      },
      cadences: [],
      modulations: [],
      functionalAnalysis: ["tonic"],
      totalDuration: 4,
      difficulty: "beginner",
    };
  }

  /**
   * 📊 Get progression generation statistics
   */
  getProgressionStats() {
    return {
      name: this.name,
      version: this.version,
      initialized: this.initialized,
      totalGenerations: this.generationCache.size,
      styleTemplates: this.styleTemplates.size,
      progressionPatterns: this.progressionPatterns.size,
      voiceLeadingRules: this.voiceLeadingRules.length,
      memoryUsage: {
        generationCache: `${this.generationCache.size} cached results`,
        styleTemplates: `${this.styleTemplates.size} templates`,
        progressionPatterns: `${this.progressionPatterns.size} patterns`,
      },
    };
  }

  /**
   * 🧹 Clean up generation cache
   */
  clearCache(): void {
    this.generationCache.clear();
    console.log("🧹 ProgressionGenerator cache cleared");
  }
}

// Export default instance following the established pattern
export const progressionGenerator = new ProgressionGenerator();
export default ProgressionGenerator;
