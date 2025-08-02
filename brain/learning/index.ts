/**
 * Learning Module Index - Maestro.ai Brain System
 * 🎯 Complete learning intelligence and adaptation suite
 *
 * Exports all learning processing modules for the Maestro.ai ecosystem
 */

// Core Learning Intelligence
export * from "./PatternRecognizer";

// Personalization Engine (with explicit re-export to resolve PracticeSession conflict)
export { PersonalizationEngine } from "./PersonalizationEngine";
export type { PracticeSession as PersonalizationPracticeSession } from "./PersonalizationEngine";

// Adaptive Learning
export * from "./AdaptiveLearning";

// Skill Tracking
export * from "./SkillTracker";

// Practice Analysis (with renamed PracticeSession to avoid conflicts)
export { PracticeAnalyzer } from "./PracticeAnalyzer";
export type {
  PracticeAnalysisSession,
  PracticeType,
  PracticeIntensity,
  PracticeExercise,
  PracticeQualityMetrics,
  PracticeProgressMetrics,
  PracticeAnalytics,
  PracticeRecommendation,
  PracticeInsight,
  SkillMetrics as PracticeSkillMetrics, // Rename to avoid conflicts
} from "./PracticeAnalyzer";

// Module Registry for the Brain System
export const LearningModules = {
  PatternRecognizer: "PatternRecognizer",
  PersonalizationEngine: "PersonalizationEngine",
  AdaptiveLearning: "AdaptiveLearning",
  SkillTracker: "SkillTracker",
  PracticeAnalyzer: "PracticeAnalyzer",
} as const;

// Learning Module Metadata
export const LearningModuleMetadata = {
  PatternRecognizer: {
    name: "PatternRecognizer",
    version: "1.0.0",
    description: "🎵 Pattern recognition across musical systems",
    capabilities: [
      "harmonic-patterns",
      "melodic-patterns",
      "rhythmic-patterns",
      "structural-analysis",
    ],
    status: "production-ready",
  },
  PersonalizationEngine: {
    name: "PersonalizationEngine",
    version: "1.0.0",
    description: "👤 User preference learning and adaptation",
    capabilities: [
      "preference-learning",
      "recommendation-generation",
      "adaptive-content",
      "user-modeling",
    ],
    status: "production-ready",
  },
  AdaptiveLearning: {
    name: "AdaptiveLearning",
    version: "1.0.0",
    description: "🎯 AI-powered personalized learning and skill adaptation",
    capabilities: [
      "difficulty-adaptation",
      "skill-assessment",
      "learning-optimization",
      "progress-tracking",
    ],
    status: "production-ready",
  },
  SkillTracker: {
    name: "SkillTracker",
    version: "1.0.0",
    description: "📈 Music skill progression tracking",
    capabilities: [
      "skill-assessment",
      "progress-monitoring",
      "gap-analysis",
      "learning-pathways",
    ],
    status: "production-ready",
  },
  PracticeAnalyzer: {
    name: "PracticeAnalyzer",
    version: "1.0.0",
    description: "🎵 Practice session analysis and optimization",
    capabilities: [
      "session-analysis",
      "quality-assessment",
      "efficiency-optimization",
      "progress-insights",
    ],
    status: "production-ready",
  },
} as const;
