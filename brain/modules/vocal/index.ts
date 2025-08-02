/**
 * Vocal Module Index - Maestro.ai Brain System
 * 🎤 Complete vocal intelligence and analysis suite
 *
 * Exports all vocal processing modules for the Maestro.ai ecosystem
 */

// Core Vocal Intelligence (export class, alias conflicting types)
export { VocalAI } from "./VocalAI";
export type {
  FormantAnalysis as VocalFormantAnalysis,
  VibratoAnalysis as VocalVibratoAnalysis,
  VocalRange as VocalAIRange,
} from "./VocalAI";

// Pitch Analysis & Correction (export class, alias conflicting types)
export { PitchAnalyzer } from "./PitchAnalyzer";
export type {
  FormantAnalysis as PitchFormantAnalysis,
  VibratoAnalysis as PitchVibratoAnalysis,
  VocalRange as PitchVocalRange,
  ExerciseVariation as PitchExerciseVariation,
  TimeRange as PitchTimeRange,
} from "./PitchAnalyzer";

// Harmony Generation (export class, alias conflicting types)
export { HarmonyGenerator } from "./HarmonyGenerator";
export type { VocalRange as HarmonyVocalRange } from "./HarmonyGenerator";

// Breathing Technique Coaching (export class, alias conflicting types)
export { BreathingCoach } from "./BreathingCoach";
export type {
  ExerciseVariation as BreathingExerciseVariation,
  TimeRange as BreathingTimeRange,
} from "./BreathingCoach";

// Module Registry for the Brain System
export const VocalModules = {
  VocalAI: "VocalAI",
  PitchAnalyzer: "PitchAnalyzer",
  HarmonyGenerator: "HarmonyGenerator",
  BreathingCoach: "BreathingCoach",
} as const;

// Vocal Module Metadata
export const VocalModuleMetadata = {
  VocalAI: {
    name: "VocalAI",
    version: "1.0.0",
    description: "🎤 Vocal analysis and coaching intelligence",
    capabilities: [
      "vocal-analysis",
      "pitch-correction-suggestions",
      "tone-optimization",
      "performance-coaching",
    ],
    status: "production-ready",
  },
  PitchAnalyzer: {
    name: "PitchAnalyzer",
    version: "1.0.0",
    description: "🎵 Real-time pitch analysis and correction",
    capabilities: [
      "pitch-detection",
      "accuracy-measurement",
      "correction-suggestions",
      "vibrato-analysis",
    ],
    status: "production-ready",
  },
  HarmonyGenerator: {
    name: "HarmonyGenerator",
    version: "1.0.0",
    description: "🎶 AI-powered harmony creation and analysis",
    capabilities: [
      "harmony-generation",
      "voice-leading",
      "chord-voicing",
      "counterpoint-analysis",
    ],
    status: "production-ready",
  },
  BreathingCoach: {
    name: "BreathingCoach",
    version: "1.0.0",
    description: "💨 Breathing technique optimization and coaching",
    capabilities: [
      "breath-pattern-analysis",
      "breathing-exercises",
      "stamina-training",
      "technique-coaching",
    ],
    status: "production-ready",
  },
} as const;
