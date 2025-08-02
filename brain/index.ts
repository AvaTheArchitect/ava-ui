/**
 * 🧠 Brain Module Index - Central Export Hub
 * ==========================================
 * Connects MaestroBrain to Cipher Extension via BrainConnector
 */

// Import the main MaestroBrain class and all types
import MaestroBrain, {
  AudioFeatures,
  GuitarAnalysis,
  VocalAnalysis,
  HarmonyAnalysis,
  PatternData,
  AnalysisOptions,
  FullAnalysis,
  MusicalSuggestions,
  SystemStatus,
  UserProfile,
  SessionData,
  SuggestionItem,
  AdaptiveRecommendation,
} from "../MaestroBrain";

// =============================================================================
// 🔗 RE-EXPORTS FOR CIPHER CONNECTOR ACCESS
// =============================================================================

// Re-export the main class (both named and default)
export { MaestroBrain };
export default MaestroBrain;

// Re-export all types for external use
export type {
  AudioFeatures,
  GuitarAnalysis,
  VocalAnalysis,
  HarmonyAnalysis,
  PatternData,
  AnalysisOptions,
  FullAnalysis,
  MusicalSuggestions,
  SystemStatus,
  UserProfile,
  SessionData,
  SuggestionItem,
  AdaptiveRecommendation,
};

// =============================================================================
// 🧠 SINGLETON BRAIN INSTANCE MANAGEMENT
// =============================================================================

// Global singleton instance for Cipher connection
let brainInstance: MaestroBrain | null = null;
let initializationPromise: Promise<MaestroBrain> | null = null;

/**
 * 🧠 Get or create Brain instance for Cipher integration
 * Ensures only one instance exists and handles concurrent initialization
 */
export const getBrainInstance = async (): Promise<MaestroBrain> => {
  // If we already have an initialized instance, return it
  if (brainInstance?.getSystemStatus().isInitialized) {
    return brainInstance;
  }

  // If initialization is already in progress, wait for it
  if (initializationPromise) {
    console.log("🔄 Waiting for ongoing Brain initialization...");
    return initializationPromise;
  }

  // Start new initialization
  console.log("🧠 Creating new MaestroBrain instance for Cipher...");

  initializationPromise = (async () => {
    try {
      if (!brainInstance) {
        brainInstance = new MaestroBrain();
      }

      await brainInstance.initialize();
      console.log("✅ MaestroBrain instance ready for Cipher integration");

      // Clear the initialization promise since we're done
      initializationPromise = null;

      return brainInstance;
    } catch (error) {
      console.error("❌ Brain initialization failed:", error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

/**
 * 🔄 Reset Brain instance (for testing/debugging)
 */
export const resetBrainInstance = (): void => {
  brainInstance = null;
  initializationPromise = null;
  console.log("🔄 Brain instance reset");
};

/**
 * 📊 Check if Brain instance exists and is initialized
 */
export const isBrainReady = (): boolean => {
  return (
    brainInstance !== null && brainInstance.getSystemStatus().isInitialized
  );
};

/**
 * 📊 Get Brain status without initializing
 */
export const getBrainStatus = (): SystemStatus | null => {
  return brainInstance?.getSystemStatus() || null;
};

// =============================================================================
// 🎯 BRAIN CONNECTION UTILITIES FOR CIPHER
// =============================================================================

export const BrainConnection = {
  // Core instance management
  getInstance: getBrainInstance,
  reset: resetBrainInstance,
  isReady: isBrainReady,
  getStatus: getBrainStatus,

  // Quick access methods for common operations
  async analyzeMusic(
    audioData: ArrayBuffer,
    options?: AnalysisOptions
  ): Promise<FullAnalysis> {
    const brain = await getBrainInstance();
    return brain.analyzeMusic(audioData, options);
  },

  async getRecommendations(userProfile?: UserProfile): Promise<string[]> {
    const brain = await getBrainInstance();
    return brain.getPersonalizedRecommendations(userProfile);
  },

  async getMusicalSuggestions(context: {
    currentChords?: string[];
    key?: string;
  }): Promise<MusicalSuggestions> {
    const brain = await getBrainInstance();
    return brain.generateMusicalSuggestions(context);
  },

  async sendToCipher(type: string, payload: unknown): Promise<void> {
    const brain = await getBrainInstance();
    return brain.sendToCipher(type, payload);
  },

  async getSystemStatus(): Promise<SystemStatus> {
    const brain = await getBrainInstance();
    return brain.getSystemStatus();
  },

  // Analysis management
  async getAnalysis(analysisId: string): Promise<FullAnalysis | undefined> {
    if (!isBrainReady()) return undefined;
    const brain = await getBrainInstance();
    return brain.getAnalysis(analysisId);
  },

  async getAllAnalyses(): Promise<FullAnalysis[]> {
    if (!isBrainReady()) return [];
    const brain = await getBrainInstance();
    return brain.getAllAnalyses();
  },

  async clearOldAnalyses(maxAge?: number): Promise<void> {
    if (!isBrainReady()) return;
    const brain = await getBrainInstance();
    brain.clearOldAnalyses(maxAge);
  },
};

// =============================================================================
// 🔌 CIPHER CONNECTOR COMPATIBILITY
// =============================================================================

/**
 * 🔌 Direct exports for BrainConnector compatibility
 * These ensure the BrainConnector can find and use the Brain
 */

// Legacy compatibility exports
export const MasterBrain = MaestroBrain;
export const Brain = MaestroBrain;

// Function-based access (for older BrainConnector versions)
export const getMaestroBrain = getBrainInstance;
export const createBrainInstance = getBrainInstance;

/**
 * 🧠 Brain Module Utilities
 */
export const BrainUtils = {
  // Connection testing
  async testConnection(): Promise<boolean> {
    try {
      const brain = await getBrainInstance();
      const status = brain.getSystemStatus();
      return status.isInitialized;
    } catch (error) {
      console.error("❌ Brain connection test failed:", error);
      return false;
    }
  },

  // Health check
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    details: SystemStatus | null;
    error?: string;
  }> {
    try {
      if (!isBrainReady()) {
        return {
          status: "unhealthy",
          details: null,
          error: "Brain not initialized",
        };
      }

      const status = await BrainConnection.getSystemStatus();
      return {
        status: "healthy",
        details: status,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  // Force reconnection
  async forceReconnect(): Promise<boolean> {
    try {
      resetBrainInstance();
      await getBrainInstance();
      return true;
    } catch (error) {
      console.error("❌ Force reconnect failed:", error);
      return false;
    }
  },
};

// =============================================================================
// 🎼 MODULE EXPORTS (Simple re-exports for brain submodules)
// =============================================================================

// Audio module exports
export { AudioAnalyzer } from "./modules/audio";

export { GuitarAI } from "./modules/guitar/GuitarAI";

export { VocalAI } from "./modules/vocal/VocalAI";

// Types need explicit export type for isolatedModules
export type { ChordProgression } from "./shared/types";

// Composition module exports - import both default and named
export { MusicTheoryEngine } from "./modules/composition";

// Import ChordAnalyzer specifically from its file
export { ChordAnalyzer } from "./modules/guitar/ChordAnalyzer";
export { chordAnalyzer } from "./modules/guitar/ChordAnalyzer";

// Keep wildcard exports for modules without conflicts
export * from "./modules/learning";
export * from "./integrations/cipher";
export * from "./integrations/external";
export * from "./integrations/maestro";

// =============================================================================
// 🔧 BRAIN CONFIGURATION
// =============================================================================

export interface BrainConfig {
  enableCipherIntegration: boolean;
  enableMaestroSync: boolean;
  autoLearnMode: boolean;
  debugMode: boolean;
  maxAnalysisAge: number;
  autoCleanup: boolean;
}

export const defaultBrainConfig: BrainConfig = {
  enableCipherIntegration: true,
  enableMaestroSync: true,
  autoLearnMode: true,
  debugMode: process.env.NODE_ENV === "development",
  maxAnalysisAge: 1000 * 60 * 60, // 1 hour
  autoCleanup: true,
};

/**
 * 🎯 Configure Brain behavior
 */
export const configureBrain = (config: Partial<BrainConfig>): void => {
  Object.assign(defaultBrainConfig, config);
  console.log("🔧 Brain configuration updated:", config);
};

// =============================================================================
// 🚀 INITIALIZATION
// =============================================================================

// Auto-initialize on module load (optional)
if (defaultBrainConfig.enableCipherIntegration) {
  // Don't auto-initialize immediately, let Cipher control when to connect
  console.log("🧠 Brain module index loaded - ready for Cipher connection");
} else {
  console.log("🧠 Brain module loaded - Cipher integration disabled");
}

// Cleanup old analyses periodically if auto-cleanup is enabled
if (defaultBrainConfig.autoCleanup) {
  setInterval(() => {
    if (isBrainReady()) {
      BrainConnection.clearOldAnalyses(defaultBrainConfig.maxAnalysisAge);
    }
  }, 1000 * 60 * 10); // Check every 10 minutes
}

console.log("✅ Brain module fully loaded - all exports ready");
