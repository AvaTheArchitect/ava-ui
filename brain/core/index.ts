/**
 * 🧠 Brain Core Index - Central Intelligence API
 * ==============================================
 * File: maestro-ai/brain/core/index.ts
 * Purpose: Export hub for core brain intelligence systems
 */

// Core Brain Intelligence Components
export { IntelligenceEngine } from "./IntelligenceEngine";
export { SystemOrchestrator } from "./SystemOrchestrator";
export { BrainAPI } from "./BrainAPI";

// Export all types from core components
export type * from "./IntelligenceEngine";
export type * from "./SystemOrchestrator";
export type * from "./BrainAPI";

// Core Module Registry for the Brain System
export const CoreModules = {
  IntelligenceEngine: "IntelligenceEngine",
  SystemOrchestrator: "SystemOrchestrator",
  BrainAPI: "BrainAPI",
} as const;

// Core Module Metadata
export const CoreModuleMetadata = {
  IntelligenceEngine: {
    name: "IntelligenceEngine",
    version: "1.0.0",
    description: "🧠 Main AI orchestration and request routing",
    capabilities: [
      "request-routing",
      "ai-coordination",
      "system-management",
      "performance-monitoring",
    ],
    status: "production-ready",
  },
  SystemOrchestrator: {
    name: "SystemOrchestrator",
    version: "1.0.0",
    description: "🔗 Cross-system coordination and communication",
    capabilities: [
      "system-coordination",
      "cross-system-messaging",
      "integration-management",
      "health-monitoring",
    ],
    status: "production-ready",
  },
  BrainAPI: {
    name: "BrainAPI",
    version: "1.0.0",
    description: "🌐 External brain API and interface layer",
    capabilities: [
      "external-api",
      "request-handling",
      "response-formatting",
      "authentication",
    ],
    status: "production-ready",
  },
} as const;

console.log("🧠 Brain Core modules loaded successfully");
