/**
 * Audio Module Index - Maestro.ai Brain System
 * 🎧 Complete audio processing and analysis suite
 *
 * Exports all audio processing modules for the Maestro.ai ecosystem
 */

// Core Audio Analysis
export * from "./AudioAnalyzer";

// Smart Mixing Engine
export * from "./MixingAI";

// Effects Processing
export * from "./EffectsOptimizer";

// Recording Intelligence
export * from "./RecordingIntelligence";

// Module Registry for the Brain System
export const AudioModules = {
  AudioAnalyzer: "AudioAnalyzer",
  MixingAI: "MixingAI",
  EffectsOptimizer: "EffectsOptimizer",
  RecordingIntelligence: "RecordingIntelligence",
} as const;

// Audio Module Metadata
export const AudioModuleMetadata = {
  AudioAnalyzer: {
    name: "AudioAnalyzer",
    version: "1.0.0",
    description: "🔊 Real-time audio processing and analysis",
    capabilities: [
      "pitch-detection",
      "chord-analysis",
      "tempo-detection",
      "key-detection",
    ],
    status: "production-ready",
  },
  MixingAI: {
    name: "MixingAI",
    version: "1.0.0",
    description: "🎛️ AI-powered mixing suggestions and automation",
    capabilities: [
      "lufs-analysis",
      "dynamic-range",
      "frequency-balance",
      "stereo-imaging",
    ],
    status: "production-ready",
  },
  EffectsOptimizer: {
    name: "EffectsOptimizer",
    version: "1.0.0",
    description: "🎚️ Intelligent audio effects optimization",
    capabilities: [
      "eq-optimization",
      "compression-analysis",
      "reverb-optimization",
      "effects-chain",
    ],
    status: "production-ready",
  },
  RecordingIntelligence: {
    name: "RecordingIntelligence",
    version: "1.0.0",
    description: "🎙️ Recording quality optimization and monitoring",
    capabilities: [
      "quality-analysis",
      "noise-detection",
      "clipping-prevention",
      "room-analysis",
    ],
    status: "production-ready",
  },
} as const;

// Type exports for external consumption
export type {
  // MixingAI types
  MixingAIConfig,
  FrequencyProfile,
  MixingStyle,
  ChannelAnalysis,
  MixingSuggestion,
  MixAnalysisResult,
} from "./MixingAI";

export type {
  // EffectsOptimizer types
  EffectsConfig,
  EffectParameters,
  EffectType,
  EffectChainAnalysis,
  EffectRecommendation,
  EffectOptimizationResult,
  EQBandAnalysis,
  CompressionAnalysis,
  ReverbAnalysis,
  AutomationCurve,
  AutomationPoint,
} from "./EffectsOptimizer";

export type {
  // RecordingIntelligence types
  RecordingConfig,
  RecordingQualityMetrics,
  RecordingOptimizationResult,
  RecordingSettings,
  NoiseAnalysis,
  ClippingAnalysis,
  RoomAcousticsAnalysis,
  FrequencyResponse,
  DistortionAnalysis,
  TimingAnalysis,
  PhaseAnalysis,
  ClippingEvent,
  RecordingImprovement,
} from "./RecordingIntelligence";
