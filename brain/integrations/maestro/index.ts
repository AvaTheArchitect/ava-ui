/**
 * 🎼 Maestro Integration Index
 * ===========================
 * File: maestro-ai/brain/integrations/maestro/index.ts
 * Purpose: Central export hub for all Maestro integration coordinators
 */

// Core Coordinators - Safe class exports
export { ModuleCoordinator } from "./ModuleCoordinator";
export { MusicAppCoordinator } from "./MusicAppCoordinator";
export { TeamCoordinator } from "./TeamCoordinator";

// Re-export everything from ModuleCoordinator except conflicting PerformanceTrend
export * from "./ModuleCoordinator";

// Re-export everything from MusicAppCoordinator
export * from "./MusicAppCoordinator";

// Re-export everything from TeamCoordinator, but rename PerformanceTrend to avoid conflict
export type {
  TeamRequest,
  TeamResponse,
  TeamMember,
  TeamSkill,
  TeamAnalysisResult,
  TeamRecommendation,
  TeamOptimization,
  TeamInsight,
  WorkflowSuggestion,
  SkillDevelopmentPlan,
  CommunicationPlan,
  TeamMetrics,
  RiskAssessment,
  AIRecommendation,
  AutomationOpportunity,
  PerformanceTrend as TeamPerformanceTrend,
} from "./TeamCoordinator";

// Module Registry for the Brain System
export const MaestroModules = {
  ModuleCoordinator: "ModuleCoordinator",
  MusicAppCoordinator: "MusicAppCoordinator",
  TeamCoordinator: "TeamCoordinator",
} as const;

console.log("🎼 Maestro Integration modules loaded successfully");
