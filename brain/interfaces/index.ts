/**
 * Interfaces Index - Maestro.ai Brain System
 * 🔗 Central export hub for all Brain system interfaces
 *
 * Organizes interfaces into logical groups for easy importing
 */

// =============================================================================
// 🧠 CORE BRAIN INTERFACES
// =============================================================================

// Core Brain module and system interfaces
export * from "./BrainInterfaces";

// Re-export key types with organized namespaces for clarity
export type {
  BrainModule,
  BrainModuleStatus,
  BrainState,
  BrainEvent,
  IntelligenceRequest,
  IntelligenceResponse,
  IntelligenceOptions,
  IntelligenceResults,
  IntelligenceMetadata,
  BrainConfig,
  ModuleConfig,
  SystemStatus,
  PerformanceMetrics,
  HealthCheck,
  BrainError,
  ErrorReport,
} from "./BrainInterfaces";

// =============================================================================
// 🎵 MUSIC INTERFACES
// =============================================================================

// All music theory, audio, and instrument interfaces
export * from "./MusicInterfaces";

// Re-export commonly used music types
export type {
  Key,
  Scale,
  ChordInfo,
  ChordProgression,
  GuitarChordProgression,
  AudioFeatures,
  AudioBuffer,
  AudioAnalysisResult,
  HarmonyAnalysis,
  RhythmAnalysis,
  GuitarAnalysis,
  VocalAnalysis,
  MelodyAnalysis,
  GenreAnalysis,
  CompositionRequest,
  GeneratedComposition,
} from "./MusicInterfaces";

// Re-export enums for convenience
export {
  ChordQuality,
  ChordDifficulty,
  ChordVoicing,
  ProgressionDifficulty,
  InstrumentType,
  MusicGenre,
} from "./MusicInterfaces";

// =============================================================================
// 🤝 COORDINATION INTERFACES
// =============================================================================

// System coordination, communication, and integration interfaces
export * from "./CoordinationInterfaces";

// Re-export key coordination types
export type {
  BrainMessage,
  CommunicationChannel,
  SystemEvent,
  EventHandler,
  ExternalModule,
  IntegrationMessage,
  IntegrationConfig,
  OrchestrationWorkflow,
  WorkflowExecution,
  CollaborationSession,
  SessionParticipant,
  CoordinationMetrics,
  CoordinationStatus,
} from "./CoordinationInterfaces";

// =============================================================================
// 🎓 LEARNING INTERFACES
// =============================================================================

// Learning, personalization, and skill development interfaces
export * from "./LearningInterfaces";

// Re-export key learning types
export type {
  UserPreferences,
  LearningContext,
  LearningEvent,
  PersonalizedSuggestion,
  PersonalizationResult,
  MusicSkill,
  SkillMetrics,
  SkillAssessment,
  SkillProgression,
  PracticeSession,
  PracticeExercise,
  PracticeQualityMetrics,
  AdaptiveRecommendation,
  LearningAnalytics,
  Achievement,
  LearningPathway,
} from "./LearningInterfaces";

// Re-export learning enums
export {
  SkillCategory,
  SkillDifficulty,
  PracticeType,
  PracticeIntensity,
} from "./LearningInterfaces";

// =============================================================================
// 🔧 INTERFACE UTILITIES
// =============================================================================

/**
 * Common interface patterns and utilities
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  metadata?: Record<string, any>;
}

/**
 * Timestamped interface for tracking when things happen
 */
export interface Timestamped {
  timestamp: number;
  timezone?: string;
}

/**
 * Identifiable interface for entities with IDs
 */
export interface Identifiable {
  id: string;
  name?: string;
}

/**
 * Configurable interface for modules with settings
 */
export interface Configurable {
  config: Record<string, any>;
  updateConfig(newConfig: Partial<Record<string, any>>): void;
}

/**
 * Versioned interface for entities with versions
 */
export interface Versioned {
  version: string;
  compatibleVersions?: string[];
}

/**
 * Scoreable interface for items with confidence/quality scores
 */
export interface Scoreable {
  score: number; // 0-1
  confidence: number; // 0-1
}

/**
 * Taggable interface for categorization
 */
export interface Taggable {
  tags: string[];
  categories?: string[];
}

// =============================================================================
// 📊 INTERFACE METADATA
// =============================================================================

/**
 * Interface registry for documentation and validation
 */
export const InterfaceRegistry = {
  brain: {
    core: [
      "BrainModule",
      "BrainState",
      "BrainEvent",
      "IntelligenceRequest",
      "IntelligenceResponse",
      "SystemStatus",
    ],
    config: ["BrainConfig", "ModuleConfig", "GlobalSettings"],
    monitoring: ["PerformanceMetrics", "HealthCheck", "BrainError"],
  },
  music: {
    theory: [
      "Key",
      "Scale",
      "ChordInfo",
      "ChordProgression",
      "HarmonyAnalysis",
    ],
    audio: ["AudioFeatures", "AudioBuffer", "AudioAnalysisResult"],
    instruments: ["GuitarAnalysis", "VocalAnalysis", "InstrumentAnalysis"],
    composition: [
      "CompositionRequest",
      "GeneratedComposition",
      "MelodyAnalysis",
    ],
  },
  coordination: {
    communication: ["BrainMessage", "CommunicationChannel"],
    events: ["SystemEvent", "EventHandler", "EventSubscription"],
    integration: ["ExternalModule", "IntegrationMessage", "IntegrationConfig"],
    orchestration: ["OrchestrationWorkflow", "WorkflowExecution"],
    collaboration: ["CollaborationSession", "SessionParticipant"],
  },
  learning: {
    users: ["UserPreferences", "LearningContext", "LearningEvent"],
    personalization: ["PersonalizedSuggestion", "PersonalizationResult"],
    skills: [
      "MusicSkill",
      "SkillMetrics",
      "SkillAssessment",
      "SkillProgression",
    ],
    practice: ["PracticeSession", "PracticeExercise", "PracticeQualityMetrics"],
    adaptive: ["AdaptiveRecommendation", "LearningAnalytics"],
    pathways: ["LearningPathway", "LearningMilestone", "Achievement"],
  },
} as const;

/**
 * Interface categories for organization
 */
export const InterfaceCategories = {
  CORE: "Core Brain System",
  MUSIC: "Music Theory & Audio",
  COORDINATION: "System Coordination",
  LEARNING: "Learning & Personalization",
  UTILITIES: "Utility Interfaces",
} as const;

/**
 * Version information for interface compatibility
 */
export const InterfaceVersions = {
  brain: "1.0.0",
  music: "1.0.0",
  coordination: "1.0.0",
  learning: "1.0.0",
  utils: "1.0.0",
} as const;

// =============================================================================
// 🎯 EXPORTS SUMMARY
// =============================================================================

/**
 * Interface Export Summary:
 *
 * 🧠 BrainInterfaces.ts (50+ interfaces)
 *    - Core brain modules and system management
 *    - Configuration, monitoring, error handling
 *    - Plugin system and lifecycle management
 *
 * 🎵 MusicInterfaces.ts (80+ interfaces)
 *    - Music theory: keys, scales, chords, harmony
 *    - Audio processing and analysis
 *    - Instrument-specific analysis
 *    - Composition and generation
 *
 * 🤝 CoordinationInterfaces.ts (60+ interfaces)
 *    - Inter-module communication
 *    - Event system and orchestration
 *    - External integrations
 *    - Collaboration and real-time sync
 *
 * 🎓 LearningInterfaces.ts (70+ interfaces)
 *    - User preferences and personalization
 *    - Skill tracking and assessment
 *    - Practice analysis and optimization
 *    - Adaptive learning and pathways
 *
 * Total: 260+ comprehensive interfaces for the entire Brain ecosystem
 */

console.log("✅ All Brain interfaces loaded - comprehensive type system ready");
