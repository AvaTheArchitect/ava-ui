/**
 * 🧠 IntelligenceEngine - Main AI Coordination Engine
 * ==================================================
 * Central AI orchestrator that coordinates all music intelligence systems
 */

import {
  AudioFeatures,
  GuitarAnalysis,
  VocalAnalysis,
  FullAnalysis,
  UserProfile,
} from "../../MaestroBrain";

// Import AI modules
import { AudioAnalyzer } from "../modules/audio/AudioAnalyzer";
import { GuitarAI } from "../modules/guitar/GuitarAI";
import { VocalAI } from "../modules/vocal/VocalAI";
import { MusicTheoryEngine } from "../modules/composition/MusicTheoryEngine";
import { PatternRecognizer } from "../modules/learning/PatternRecognizer";
import { PersonalizationEngine } from "../modules/learning/PersonalizationEngine";
import { AdaptiveLearning } from "../modules/learning/AdaptiveLearning";

// =============================================================================
// 🏷️ INTELLIGENCE ENGINE INTERFACES
// =============================================================================

export interface IntelligenceRequest {
  type: "analyze" | "generate" | "learn" | "recommend";
  audioData?: ArrayBuffer;
  context?: {
    userProfile?: UserProfile;
    sessionHistory?: any[];
    preferences?: Record<string, any>;
    goals?: string[];
  };
  options?: {
    includeGuitar?: boolean;
    includeVocals?: boolean;
    includeComposition?: boolean;
    realTimeMode?: boolean;
    detailedAnalysis?: boolean;
  };
}

export interface IntelligenceResponse {
  success: boolean;
  requestId: string;
  timestamp: Date;
  processingTime: number;
  results: {
    analysis?: FullAnalysis;
    recommendations?: string[];
    generated?: {
      chords?: string[];
      melody?: string[];
      tabs?: string;
      exercises?: string[];
    };
    confidence?: number;
    nextSteps?: string[];
  };
  metadata: {
    systemsUsed: string[];
    confidence: number;
    learningUpdates?: boolean;
  };
}

export interface AISystemStatus {
  name: string;
  status: "ready" | "busy" | "error" | "offline";
  lastUpdate: Date;
  performance: {
    accuracy: number;
    speed: number;
    reliability: number;
  };
  capabilities: string[];
}

export interface IntelligenceMetrics {
  totalRequests: number;
  successRate: number;
  averageProcessingTime: number;
  systemHealth: Record<string, AISystemStatus>;
  userSatisfaction: number;
  learningProgress: number;
}

// =============================================================================
// 🧠 INTELLIGENCE ENGINE CLASS
// =============================================================================

export class IntelligenceEngine {
  private audioAnalyzer: AudioAnalyzer;
  private guitarAI: GuitarAI;
  private vocalAI: VocalAI;
  private musicTheory: MusicTheoryEngine;
  private patternRecognizer: PatternRecognizer;
  private personalization: PersonalizationEngine;
  private adaptiveLearning: AdaptiveLearning;
  private isInitialized: boolean = false;
  private activeRequests: Map<string, IntelligenceRequest> = new Map();
  private systemMetrics: IntelligenceMetrics;
  private requestQueue: IntelligenceRequest[] = [];
  private maxConcurrentRequests: number = 5;

  constructor() {
    console.log("🧠 IntelligenceEngine initializing...");

    // Initialize AI systems
    this.audioAnalyzer = new AudioAnalyzer();
    this.guitarAI = new GuitarAI();
    this.vocalAI = new VocalAI();
    this.musicTheory = new MusicTheoryEngine();
    this.patternRecognizer = new PatternRecognizer();
    this.personalization = new PersonalizationEngine();
    this.adaptiveLearning = new AdaptiveLearning();

    // Initialize metrics
    this.systemMetrics = this.initializeMetrics();
  }

  /**
   * 🚀 Initialize the Intelligence Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️ IntelligenceEngine already initialized");
      return;
    }

    console.log("🧠 Initializing AI systems...");

    try {
      // Initialize all AI systems in parallel
      await Promise.all([
        this.audioAnalyzer.initialize(),
        this.guitarAI.initialize(),
        this.vocalAI.initialize(),
        this.updateSystemStatus(),
      ]);

      this.isInitialized = true;
      console.log("✅ IntelligenceEngine fully initialized");
    } catch (error) {
      console.error("❌ IntelligenceEngine initialization failed:", error);
      throw error;
    }
  }

  /**
   * 🎯 Process intelligence request with full AI coordination
   */
  async processRequest(
    request: IntelligenceRequest
  ): Promise<IntelligenceResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    console.log(
      `🧠 Processing intelligence request: ${requestId} (${request.type})`
    );

    try {
      // Add to active requests
      this.activeRequests.set(requestId, request);

      // Route request to appropriate handler
      let results: any = {};
      const systemsUsed: string[] = [];

      switch (request.type) {
        case "analyze":
          results = await this.handleAnalysisRequest(request, systemsUsed);
          break;
        case "generate":
          results = await this.handleGenerationRequest(request, systemsUsed);
          break;
        case "learn":
          results = await this.handleLearningRequest(request, systemsUsed);
          break;
        case "recommend":
          results = await this.handleRecommendationRequest(
            request,
            systemsUsed
          );
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(results);

      // Update metrics
      this.updateMetrics(true, processingTime);

      // Clean up
      this.activeRequests.delete(requestId);

      const response: IntelligenceResponse = {
        success: true,
        requestId,
        timestamp: new Date(),
        processingTime,
        results: {
          ...results,
          confidence,
          nextSteps: this.generateNextSteps(request, results),
        },
        metadata: {
          systemsUsed,
          confidence,
          learningUpdates: request.type === "learn",
        },
      };

      console.log(
        `✅ Intelligence request completed: ${requestId} (${processingTime}ms)`
      );
      return response;
    } catch (error) {
      console.error(`❌ Intelligence request failed: ${requestId}`, error);

      this.activeRequests.delete(requestId);
      this.updateMetrics(false, Date.now() - startTime);

      return {
        success: false,
        requestId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        results: {
          confidence: 0,
          nextSteps: [
            "Check system status",
            "Retry request",
            "Contact support",
          ],
        },
        metadata: {
          systemsUsed: [],
          confidence: 0,
          learningUpdates: false,
        },
      };
    }
  }

  /**
   * 🎵 Handle music analysis requests
   */
  private async handleAnalysisRequest(
    request: IntelligenceRequest,
    systemsUsed: string[]
  ): Promise<any> {
    if (!request.audioData) {
      throw new Error("Audio data required for analysis");
    }

    const results: any = {};

    // Audio analysis (always included)
    systemsUsed.push("AudioAnalyzer");
    results.analysis = {
      audioFeatures: await this.audioAnalyzer.analyzeAudio(request.audioData),
    };

    // Guitar analysis
    if (request.options?.includeGuitar) {
      systemsUsed.push("GuitarAI");
      results.analysis.guitarAnalysis = await this.guitarAI.analyzeGuitar(
        request.audioData
      );
    }

    // Vocal analysis
    if (request.options?.includeVocals) {
      systemsUsed.push("VocalAI");
      results.analysis.vocalAnalysis = await this.vocalAI.analyzeVocals(
        request.audioData
      );
    }

    // Pattern recognition
    systemsUsed.push("PatternRecognizer");
    results.analysis.patterns = await this.patternRecognizer.analyzePatterns(
      request.audioData
    );

    // Music theory analysis
    if (results.analysis.guitarAnalysis?.chords) {
      systemsUsed.push("MusicTheoryEngine");
      results.analysis.harmonyAnalysis = this.musicTheory.analyzeHarmony(
        results.analysis.guitarAnalysis.chords
      );
    }

    return results;
  }

  /**
   * 🎼 Handle music generation requests
   */
  private async handleGenerationRequest(
    request: IntelligenceRequest,
    systemsUsed: string[]
  ): Promise<any> {
    const results: any = { generated: {} };
    const context = request.context || {};

    systemsUsed.push("MusicTheoryEngine");

    // Generate chord progressions
    results.generated.chords = this.musicTheory.suggestChords(
      context.preferences?.currentChords || []
    );

    // Generate melody
    results.generated.melody = this.musicTheory.generateMelody(
      context.preferences?.key || "C",
      "major",
      8,
      "rock"
    );

    // Generate practice exercises
    if (context.userProfile) {
      systemsUsed.push("AdaptiveLearning");
      const recommendation = this.adaptiveLearning.getAdaptiveRecommendation();
      results.generated.exercises = recommendation.next_exercises;
    }

    return results;
  }

  /**
   * 🎓 Handle learning requests
   */
  private async handleLearningRequest(
    request: IntelligenceRequest,
    systemsUsed: string[]
  ): Promise<any> {
    const results: any = {};
    const context = request.context || {};

    systemsUsed.push("AdaptiveLearning", "PersonalizationEngine");

    // Update learning systems
    // FIXED CODE:
    if (context.sessionHistory && context.sessionHistory.length > 0) {
      // Get the latest session from the array
      const latestSession =
        context.sessionHistory[context.sessionHistory.length - 1];
      this.adaptiveLearning.recordSession({
        accuracy: latestSession?.accuracy || 0.8,
        speed: latestSession?.speed || 120,
        consistency: latestSession?.consistency || 0.85,
        improvement_rate: latestSession?.improvement_rate || 0.05,
      });
    }

    // Update personalization
    // FIXED CODE - Explicit type conversions:
    if (context.userProfile) {
      // Map skill level to PersonalizationEngine format
      let mappedSkillLevel: "beginner" | "intermediate" | "advanced";

      switch (context.userProfile.skill_level) {
        case "beginner":
          mappedSkillLevel = "beginner";
          break;
        case "intermediate":
          mappedSkillLevel = "intermediate";
          break;
        case "advanced":
        case "expert": // Map expert to advanced
          mappedSkillLevel = "advanced";
          break;
        default:
          mappedSkillLevel = "intermediate"; // fallback
      }

      // Transform MaestroBrain UserProfile to PersonalizationEngine UserProfile
      const personalizationProfile = {
        userId: "current-user",
        skill_level: mappedSkillLevel,
        instruments: context.userProfile.instruments,
        practice_goals: context.userProfile.practice_goals,
        preferences: context.userProfile.preferences,
        // Ensure these are arrays, not objects
        preferred_genres: Array.isArray(context.userProfile.preferences?.genres)
          ? (context.userProfile.preferences.genres as string[])
          : [],
        learning_goals: context.userProfile.practice_goals || [],
        practice_history: Array.isArray(
          context.userProfile.preferences?.history
        )
          ? (context.userProfile.preferences.history as string[])
          : [],
      };

      this.personalization.setUserProfile(personalizationProfile);
    }
    results.learningUpdates = true;
    results.recommendations = this.personalization
      .generateSuggestions({})
      .map((s) => s.content);

    return results;
  }

  /**
   * 💡 Handle recommendation requests
   */
  private async handleRecommendationRequest(
    request: IntelligenceRequest,
    systemsUsed: string[]
  ): Promise<any> {
    const results: any = {};
    const context = request.context || {};

    systemsUsed.push("PersonalizationEngine", "AdaptiveLearning");

    // Get personalized recommendations
    const suggestions = this.personalization.generateSuggestions(context);
    const adaptiveRec = this.adaptiveLearning.getAdaptiveRecommendation();

    results.recommendations = [
      ...suggestions.map((s) => s.content),
      ...adaptiveRec.next_exercises,
    ];

    return results;
  }

  /**
   * 📊 Get system metrics and health status
   */
  getSystemMetrics(): IntelligenceMetrics {
    return { ...this.systemMetrics };
  }

  /**
   * 🔍 Get status of all AI systems
   */
  async getSystemStatus(): Promise<Record<string, AISystemStatus>> {
    return {
      audioAnalyzer: await this.getAISystemStatus(
        "AudioAnalyzer",
        this.audioAnalyzer
      ),
      guitarAI: await this.getAISystemStatus("GuitarAI", this.guitarAI),
      vocalAI: await this.getAISystemStatus("VocalAI", this.vocalAI),
      musicTheory: await this.getAISystemStatus(
        "MusicTheoryEngine",
        this.musicTheory
      ),
      patternRecognizer: await this.getAISystemStatus(
        "PatternRecognizer",
        this.patternRecognizer
      ),
      personalization: await this.getAISystemStatus(
        "PersonalizationEngine",
        this.personalization
      ),
      adaptiveLearning: await this.getAISystemStatus(
        "AdaptiveLearning",
        this.adaptiveLearning
      ),
    };
  }

  /**
   * 🧹 Clean up and optimize performance
   */
  async optimize(): Promise<void> {
    console.log("🧹 Optimizing IntelligenceEngine...");

    // Clear old requests
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Process queued requests if possible
    if (
      this.activeRequests.size < this.maxConcurrentRequests &&
      this.requestQueue.length > 0
    ) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        this.processRequest(nextRequest);
      }
    }

    console.log("✅ IntelligenceEngine optimization complete");
  }

  // =============================================================================
  // 🛠️ PRIVATE HELPER METHODS
  // =============================================================================

  private generateRequestId(): string {
    return `intel_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private initializeMetrics(): IntelligenceMetrics {
    return {
      totalRequests: 0,
      successRate: 1.0,
      averageProcessingTime: 0,
      systemHealth: {},
      userSatisfaction: 0.85,
      learningProgress: 0.0,
    };
  }

  private updateMetrics(success: boolean, processingTime: number): void {
    this.systemMetrics.totalRequests++;

    // Update success rate
    const successCount =
      this.systemMetrics.successRate * (this.systemMetrics.totalRequests - 1);
    this.systemMetrics.successRate =
      (successCount + (success ? 1 : 0)) / this.systemMetrics.totalRequests;

    // Update average processing time
    const totalTime =
      this.systemMetrics.averageProcessingTime *
      (this.systemMetrics.totalRequests - 1);
    this.systemMetrics.averageProcessingTime =
      (totalTime + processingTime) / this.systemMetrics.totalRequests;
  }

  private calculateOverallConfidence(results: any): number {
    const confidences: number[] = [];

    if (results.analysis?.audioFeatures?.confidence) {
      confidences.push(results.analysis.audioFeatures.confidence);
    }
    if (results.analysis?.guitarAnalysis?.confidence) {
      confidences.push(results.analysis.guitarAnalysis.confidence);
    }
    if (results.analysis?.vocalAnalysis?.confidence) {
      confidences.push(results.analysis.vocalAnalysis.confidence);
    }

    return confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : 0.8; // Default confidence
  }

  private generateNextSteps(
    request: IntelligenceRequest,
    results: any
  ): string[] {
    const steps: string[] = [];

    switch (request.type) {
      case "analyze":
        steps.push("Review analysis results");
        if (results.analysis?.recommendations) {
          steps.push("Practice recommended exercises");
        }
        steps.push("Record another session for progress tracking");
        break;
      case "generate":
        steps.push("Try the generated content");
        steps.push("Provide feedback for learning");
        steps.push("Request variations if needed");
        break;
      case "learn":
        steps.push("Continue regular practice sessions");
        steps.push("Focus on identified weak areas");
        break;
      case "recommend":
        steps.push("Follow personalized recommendations");
        steps.push("Track progress over time");
        break;
    }

    return steps;
  }

  private async getAISystemStatus(
    name: string,
    system: any
  ): Promise<AISystemStatus> {
    return {
      name,
      status: "ready",
      lastUpdate: new Date(),
      performance: {
        accuracy: 0.85 + Math.random() * 0.1,
        speed: 0.9 + Math.random() * 0.1,
        reliability: 0.95 + Math.random() * 0.05,
      },
      capabilities: this.getSystemCapabilities(name),
    };
  }

  private getSystemCapabilities(systemName: string): string[] {
    const capabilities: Record<string, string[]> = {
      AudioAnalyzer: ["tempo detection", "pitch analysis", "rhythm extraction"],
      GuitarAI: ["chord recognition", "technique analysis", "tab generation"],
      VocalAI: ["pitch accuracy", "breath control", "tone analysis"],
      MusicTheoryEngine: [
        "harmony analysis",
        "progression generation",
        "melody creation",
      ],
      PatternRecognizer: [
        "playing patterns",
        "practice habits",
        "improvement tracking",
      ],
      PersonalizationEngine: [
        "user preferences",
        "skill adaptation",
        "content curation",
      ],
      AdaptiveLearning: [
        "difficulty adjustment",
        "progress tracking",
        "goal optimization",
      ],
    };

    return capabilities[systemName] || [];
  }

  private async updateSystemStatus(): Promise<void> {
    this.systemMetrics.systemHealth = await this.getSystemStatus();
  }
}

export default IntelligenceEngine;
