/**
 * Guitar Module Index - Maestro.ai Brain System
 * 🎸 Complete guitar intelligence and analysis suite
 *
 * Exports all guitar processing modules for the Maestro.ai ecosystem
 */

// Core Guitar Intelligence
export * from "./GuitarAI";

// Chord Analysis & Recognition
export * from "./ChordAnalyzer";

// Tablature Generation (with explicit re-export to resolve StrummingPattern conflict)
export { TabGenerator } from "./TabGenerator";
export type { StrummingPattern as TabStrummingPattern } from "./TabGenerator";

// Practice Optimization
export * from "./PracticeOptimizer";

// Module Registry for the Brain System
export const GuitarModules = {
  GuitarAI: "GuitarAI",
  ChordAnalyzer: "ChordAnalyzer",
  TabGenerator: "TabGenerator",
  PracticeOptimizer: "PracticeOptimizer",
} as const;

// Guitar Module Metadata
export const GuitarModuleMetadata = {
  GuitarAI: {
    name: "GuitarAI",
    version: "1.0.0",
    description: "🎸 Guitar technique analysis and coaching",
    capabilities: [
      "technique-analysis",
      "fingering-optimization",
      "chord-suggestions",
      "skill-assessment",
    ],
    status: "production-ready",
  },
  ChordAnalyzer: {
    name: "ChordAnalyzer",
    version: "1.0.0",
    description: "🎵 Chord recognition and analysis engine",
    capabilities: [
      "chord-detection",
      "progression-analysis",
      "voicing-recognition",
      "difficulty-assessment",
    ],
    status: "production-ready",
  },
  TabGenerator: {
    name: "TabGenerator",
    version: "1.0.0",
    description: "📝 Smart tablature generation and optimization",
    capabilities: [
      "tab-generation",
      "fingering-optimization",
      "difficulty-scaling",
      "notation-conversion",
    ],
    status: "production-ready",
  },
  PracticeOptimizer: {
    name: "PracticeOptimizer",
    version: "1.0.0",
    description: "📈 Guitar practice routine optimization",
    capabilities: [
      "practice-planning",
      "skill-tracking",
      "progress-analysis",
      "routine-optimization",
    ],
    status: "production-ready",
  },
} as const;
