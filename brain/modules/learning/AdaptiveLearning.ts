/**
 * AdaptiveLearning.ts - Advanced Adaptive Learning Engine
 * 🎯 AI-powered personalized learning and skill adaptation
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import {
  BrainModule,
  UserPreferences,
  LearningContext,
  LearningEvent,
  MusicGenre,
} from "../../shared/types";

// Learning Configuration
export interface AdaptiveLearningConfig {
  adaptationSpeed?: number; // 0-1, how quickly to adapt
  difficultyAdjustmentThreshold?: number; // 0-1
  skillAssessmentInterval?: number; // sessions
  enablePredictiveAdaptation?: boolean;
  enableEmotionalAdaptation?: boolean;
  maxDifficultyJump?: number; // 0-1
  minConfidenceThreshold?: number; // 0-1
}

// Learning Metrics (Enhanced)
export interface LearningMetrics {
  accuracy: number; // 0-1
  speed: number; // 0-1
  consistency: number; // 0-1
  improvementRate: number; // rate of change
  effortLevel: number; // 0-1, perceived difficulty
  engagement: number; // 0-1, user engagement score
  retentionRate: number; // 0-1, skill retention
  frustrationLevel: number; // 0-1, detected frustration
  confidenceLevel: number; // 0-1, user confidence
}

// Adaptive Recommendation (Enhanced)
export interface AdaptiveRecommendation {
  id: string;
  action:
    | "increase_difficulty"
    | "decrease_difficulty"
    | "maintain"
    | "review"
    | "branch_out"
    | "consolidate";
  priority: "low" | "medium" | "high" | "critical";
  reason: string;
  confidence: number; // 0-1
  nextExercises: LearningExercise[];
  estimatedTime: number; // minutes
  expectedOutcome: string;
  adaptationReason: string;
}

// Learning Exercise
export interface LearningExercise {
  id: string;
  name: string;
  type:
    | "technique"
    | "theory"
    | "rhythm"
    | "listening"
    | "creativity"
    | "performance";
  difficulty: number; // 0-1
  estimatedDuration: number; // minutes
  prerequisites: string[];
  learningObjectives: string[];
  adaptationPoints: AdaptationPoint[];
}

// Adaptation Point
export interface AdaptationPoint {
  metric: keyof LearningMetrics;
  threshold: number;
  action:
    | "adjust_tempo"
    | "add_hints"
    | "simplify"
    | "add_complexity"
    | "change_approach";
  adjustment: number;
}

// Skill Assessment
export interface SkillAssessment {
  skillId: string;
  skillName: string;
  currentLevel: number; // 0-1
  masteryLevel: number; // 0-1
  improvement: number; // change since last assessment
  weakAreas: string[];
  strengthAreas: string[];
  practiceRecommendations: string[];
  timeToNextLevel: number; // estimated hours
}

// Learning Path
export interface LearningPath {
  pathId: string;
  name: string;
  description: string;
  skillTargets: string[];
  exercises: LearningExercise[];
  estimatedDuration: number; // total hours
  adaptationHistory: AdaptationRecord[];
  currentPosition: number;
  completionPercentage: number;
}

// Adaptation Record
export interface AdaptationRecord {
  timestamp: number;
  trigger: string;
  adaptationType: string;
  beforeMetrics: LearningMetrics;
  afterMetrics: LearningMetrics;
  success: boolean;
  notes: string;
}

// Learning Session Analysis
export interface SessionAnalysis {
  sessionId: string;
  duration: number; // minutes
  metrics: LearningMetrics;
  skillsAssessed: SkillAssessment[];
  adaptationsApplied: AdaptiveRecommendation[];
  nextSessionRecommendations: LearningExercise[];
  overallProgress: number; // 0-1
  insights: string[];
}

/**
 * AdaptiveLearning - AI-powered personalized learning engine
 * Provides intelligent learning adaptation and skill progression
 */
export class AdaptiveLearning implements BrainModule {
  public readonly name: string = "AdaptiveLearning";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;
  private sessionId: string = generateId("learning-session");

  // Configuration
  private config: AdaptiveLearningConfig = {
    adaptationSpeed: 0.3,
    difficultyAdjustmentThreshold: 0.2,
    skillAssessmentInterval: 5,
    enablePredictiveAdaptation: true,
    enableEmotionalAdaptation: true,
    maxDifficultyJump: 0.15,
    minConfidenceThreshold: 0.7,
  };

  // State management
  private sessionHistory: LearningMetrics[] = [];
  private userProfile?: UserPreferences;
  private currentLearningPath?: LearningPath;
  private skillAssessments = new Map<string, SkillAssessment>();
  private adaptationHistory: AdaptationRecord[] = [];

  constructor(config?: Partial<AdaptiveLearningConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the AdaptiveLearning module
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🎯 Initializing AdaptiveLearning v${this.version}...`);

      // Load learning models and patterns
      await this.loadLearningModels();

      // Initialize skill assessment framework
      await this.initializeSkillAssessment();

      this.initialized = true;
      console.log(`✅ AdaptiveLearning initialized successfully`);
    } catch (error) {
      console.error("❌ Failed to initialize AdaptiveLearning:", error);
      throw error;
    }
  }

  /**
   * Get module status - required by BrainModule interface
   */
  getStatus(): {
    initialized: boolean;
    healthy: boolean;
    metrics: Record<string, any>;
  } {
    return {
      initialized: this.initialized,
      healthy: this.initialized && this.sessionHistory.length >= 0,
      metrics: {
        sessionId: this.sessionId,
        sessionsTracked: this.sessionHistory.length,
        skillsAssessed: this.skillAssessments.size,
        adaptationsApplied: this.adaptationHistory.length,
        adaptationSpeed: this.config.adaptationSpeed,
        currentDifficulty: this.getCurrentDifficulty(),
        learningEfficiency: this.calculateLearningEfficiency(),
      },
    };
  }

  /**
   * Record a learning session and adapt accordingly
   */
  async recordLearningSession(
    metrics: LearningMetrics,
    context: LearningContext,
    sessionData?: any
  ): Promise<SessionAnalysis> {
    if (!this.initialized) {
      throw new Error("AdaptiveLearning not initialized");
    }

    try {
      console.log("🎯 Recording learning session...");

      // Store session metrics
      this.sessionHistory.push(metrics);
      this.trimSessionHistory();

      // Analyze current performance
      const skillsAssessed = await this.assessSkills(metrics, context);

      // Generate adaptive recommendations
      const adaptations = await this.generateAdaptiveRecommendations(
        metrics,
        context
      );

      // Apply adaptations if needed
      const appliedAdaptations = await this.applyAdaptations(
        adaptations,
        context
      );

      // Generate next session recommendations
      const nextRecommendations = await this.generateNextSessionExercises(
        metrics,
        context
      );

      // Calculate overall progress
      const overallProgress = this.calculateOverallProgress(context.userId);

      // Generate insights
      const insights = this.generateLearningInsights(metrics, context);

      const sessionAnalysis: SessionAnalysis = {
        sessionId: generateId("session"),
        duration: sessionData?.duration || 30,
        metrics,
        skillsAssessed,
        adaptationsApplied: appliedAdaptations,
        nextSessionRecommendations: nextRecommendations,
        overallProgress,
        insights,
      };

      console.log(
        `✅ Learning session recorded - Progress: ${(
          overallProgress * 100
        ).toFixed(1)}%`
      );
      return sessionAnalysis;
    } catch (error) {
      console.error("❌ Learning session recording failed:", error);
      throw error;
    }
  }

  /**
   * Assess skills based on performance metrics
   */
  private async assessSkills(
    metrics: LearningMetrics,
    context: LearningContext
  ): Promise<SkillAssessment[]> {
    const assessments: SkillAssessment[] = [];

    // Assess core musical skills
    const coreSkills = ["rhythm", "pitch", "timing", "technique", "theory"];

    for (const skill of coreSkills) {
      const assessment = await this.assessIndividualSkill(
        skill,
        metrics,
        context
      );
      assessments.push(assessment);
      this.skillAssessments.set(skill, assessment);
    }

    return assessments;
  }

  /**
   * Assess individual skill
   */
  private async assessIndividualSkill(
    skillId: string,
    metrics: LearningMetrics,
    context: LearningContext
  ): Promise<SkillAssessment> {
    const previousAssessment = this.skillAssessments.get(skillId);
    const previousLevel = previousAssessment?.currentLevel || 0.3;

    // Calculate skill level based on metrics and context
    let currentLevel = previousLevel;

    // Adjust based on accuracy and consistency
    const performanceScore = (metrics.accuracy + metrics.consistency) / 2;
    const learningRate = this.config.adaptationSpeed || 0.3;

    if (performanceScore > 0.8) {
      currentLevel += learningRate * 0.1;
    } else if (performanceScore < 0.6) {
      currentLevel -= learningRate * 0.05;
    }

    currentLevel = Math.max(0, Math.min(1, currentLevel));

    // Calculate improvement
    const improvement = currentLevel - previousLevel;

    // Identify weak and strong areas
    const { weakAreas, strengthAreas } = this.analyzeSkillAreas(
      skillId,
      metrics
    );

    // Generate practice recommendations
    const practiceRecommendations = this.generateSkillPracticeRecommendations(
      skillId,
      currentLevel,
      weakAreas
    );

    // Estimate time to next level
    const timeToNextLevel = this.estimateTimeToNextLevel(
      skillId,
      currentLevel,
      improvement
    );

    return {
      skillId,
      skillName: this.getSkillDisplayName(skillId),
      currentLevel,
      masteryLevel: this.calculateMasteryLevel(skillId, currentLevel),
      improvement,
      weakAreas,
      strengthAreas,
      practiceRecommendations,
      timeToNextLevel,
    };
  }

  /**
   * Generate adaptive recommendations
   */
  private async generateAdaptiveRecommendations(
    metrics: LearningMetrics,
    context: LearningContext
  ): Promise<AdaptiveRecommendation[]> {
    const recommendations: AdaptiveRecommendation[] = [];

    // Difficulty adaptation
    const difficultyRecommendation = this.assessDifficultyAdjustment(metrics);
    if (difficultyRecommendation) {
      recommendations.push(difficultyRecommendation);
    }

    // Engagement adaptation
    if (metrics.engagement < 0.6) {
      recommendations.push(
        await this.generateEngagementRecommendation(context)
      );
    }

    // Frustration management
    if (metrics.frustrationLevel > 0.7) {
      recommendations.push(
        await this.generateFrustrationRecommendation(context)
      );
    }

    // Confidence building
    if (metrics.confidenceLevel < 0.5) {
      recommendations.push(
        await this.generateConfidenceRecommendation(context)
      );
    }

    // Skill branching
    if (this.shouldRecommendSkillBranching(metrics, context)) {
      recommendations.push(
        await this.generateSkillBranchingRecommendation(context)
      );
    }

    return recommendations.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /**
   * Apply adaptations to the learning experience
   */
  private async applyAdaptations(
    recommendations: AdaptiveRecommendation[],
    context: LearningContext
  ): Promise<AdaptiveRecommendation[]> {
    const appliedAdaptations: AdaptiveRecommendation[] = [];

    for (const recommendation of recommendations) {
      if (recommendation.confidence >= this.config.minConfidenceThreshold!) {
        try {
          await this.executeAdaptation(recommendation, context);
          appliedAdaptations.push(recommendation);

          // Record adaptation in history
          this.recordAdaptation(recommendation, context);
        } catch (error) {
          console.error(
            `❌ Failed to apply adaptation: ${recommendation.action}`,
            error
          );
        }
      }
    }

    return appliedAdaptations;
  }

  /**
   * Assessment and recommendation helper methods
   */
  private assessDifficultyAdjustment(
    metrics: LearningMetrics
  ): AdaptiveRecommendation | null {
    // High performance - increase difficulty
    if (
      metrics.accuracy > 0.9 &&
      metrics.consistency > 0.85 &&
      metrics.frustrationLevel < 0.3
    ) {
      return {
        id: generateId("difficulty-rec"),
        action: "increase_difficulty",
        priority: "medium",
        reason:
          "Excellent performance indicates readiness for increased challenge",
        confidence: 0.85,
        nextExercises: this.generateAdvancedExercises(),
        estimatedTime: 25,
        expectedOutcome:
          "Maintained engagement with increased skill development",
        adaptationReason:
          "Performance metrics exceed threshold for difficulty increase",
      };
    }

    // Poor performance - decrease difficulty or review
    if (metrics.accuracy < 0.6 || metrics.frustrationLevel > 0.7) {
      return {
        id: generateId("difficulty-rec"),
        action: metrics.accuracy < 0.5 ? "review" : "decrease_difficulty",
        priority: "high",
        reason:
          "Performance indicates need for reinforcement or easier material",
        confidence: 0.9,
        nextExercises: this.generateReinforcementExercises(),
        estimatedTime: 20,
        expectedOutcome: "Improved confidence and foundational understanding",
        adaptationReason:
          "Performance metrics below threshold, reducing cognitive load",
      };
    }

    return null;
  }

  private async generateEngagementRecommendation(
    context: LearningContext
  ): Promise<AdaptiveRecommendation> {
    const userGenres = context.preferences.favoriteGenres;
    const exercises = this.generateEngagingExercises(userGenres);

    return {
      id: generateId("engagement-rec"),
      action: "branch_out",
      priority: "high",
      reason:
        "Low engagement detected - introducing variety and preferred content",
      confidence: 0.8,
      nextExercises: exercises,
      estimatedTime: 15,
      expectedOutcome: "Increased motivation and engagement",
      adaptationReason:
        "Engagement below threshold, adapting content to user preferences",
    };
  }

  private async generateFrustrationRecommendation(
    context: LearningContext
  ): Promise<AdaptiveRecommendation> {
    return {
      id: generateId("frustration-rec"),
      action: "consolidate",
      priority: "critical",
      reason: "High frustration detected - focusing on confidence building",
      confidence: 0.95,
      nextExercises: this.generateConfidenceBuildingExercises(),
      estimatedTime: 10,
      expectedOutcome: "Reduced frustration and restored confidence",
      adaptationReason: "Frustration management protocol activated",
    };
  }

  private async generateConfidenceRecommendation(
    context: LearningContext
  ): Promise<AdaptiveRecommendation> {
    return {
      id: generateId("confidence-rec"),
      action: "consolidate",
      priority: "medium",
      reason: "Low confidence detected - reinforcing existing skills",
      confidence: 0.85,
      nextExercises: this.generateSuccessOrientedExercises(),
      estimatedTime: 20,
      expectedOutcome: "Improved self-confidence and skill reinforcement",
      adaptationReason: "Confidence building through achievable challenges",
    };
  }

  private shouldRecommendSkillBranching(
    metrics: LearningMetrics,
    context: LearningContext
  ): boolean {
    // Recommend branching if user is doing well and has been focused on one area
    return (
      metrics.accuracy > 0.8 &&
      metrics.consistency > 0.75 &&
      context.history.length > 10 &&
      this.isSkillAreaConcentrated(context.history)
    );
  }

  private async generateSkillBranchingRecommendation(
    context: LearningContext
  ): Promise<AdaptiveRecommendation> {
    const newSkillAreas = this.identifyComplementarySkills(context);

    return {
      id: generateId("branching-rec"),
      action: "branch_out",
      priority: "medium",
      reason:
        "Strong performance in current area - exploring complementary skills",
      confidence: 0.75,
      nextExercises: this.generateBranchingExercises(newSkillAreas),
      estimatedTime: 30,
      expectedOutcome: "Broader skill development and maintained engagement",
      adaptationReason: "Skill diversification for well-rounded development",
    };
  }

  /**
   * Exercise generation methods
   */
  private generateAdvancedExercises(): LearningExercise[] {
    return [
      {
        id: generateId("advanced-ex"),
        name: "Complex Chord Progressions",
        type: "technique",
        difficulty: 0.8,
        estimatedDuration: 20,
        prerequisites: ["basic-chords", "rhythm-fundamentals"],
        learningObjectives: [
          "Advanced harmony understanding",
          "Smooth chord transitions",
        ],
        adaptationPoints: [
          {
            metric: "accuracy",
            threshold: 0.7,
            action: "adjust_tempo",
            adjustment: -0.1,
          },
          {
            metric: "frustrationLevel",
            threshold: 0.6,
            action: "add_hints",
            adjustment: 0.2,
          },
        ],
      },
      {
        id: generateId("advanced-ex"),
        name: "Syncopated Rhythms",
        type: "rhythm",
        difficulty: 0.75,
        estimatedDuration: 15,
        prerequisites: ["basic-rhythm"],
        learningObjectives: ["Rhythm complexity", "Timing precision"],
        adaptationPoints: [
          {
            metric: "consistency",
            threshold: 0.6,
            action: "simplify",
            adjustment: -0.2,
          },
        ],
      },
    ];
  }

  private generateReinforcementExercises(): LearningExercise[] {
    return [
      {
        id: generateId("reinforcement-ex"),
        name: "Basic Chord Review",
        type: "technique",
        difficulty: 0.3,
        estimatedDuration: 15,
        prerequisites: [],
        learningObjectives: ["Chord muscle memory", "Clean chord changes"],
        adaptationPoints: [
          {
            metric: "accuracy",
            threshold: 0.8,
            action: "add_complexity",
            adjustment: 0.1,
          },
        ],
      },
      {
        id: generateId("reinforcement-ex"),
        name: "Rhythm Fundamentals",
        type: "rhythm",
        difficulty: 0.25,
        estimatedDuration: 10,
        prerequisites: [],
        learningObjectives: ["Steady timing", "Basic rhythm patterns"],
        adaptationPoints: [],
      },
    ];
  }

  private generateEngagingExercises(
    favoriteGenres: MusicGenre[]
  ): LearningExercise[] {
    const genreExercises: LearningExercise[] = [];

    favoriteGenres.forEach((genre) => {
      const genreString = genre.toString().toLowerCase();

      genreExercises.push({
        id: generateId(`${genreString}-ex`),
        name: `${
          genreString.charAt(0).toUpperCase() + genreString.slice(1)
        } Style Practice`,
        type: "performance",
        difficulty: 0.6,
        estimatedDuration: 20,
        prerequisites: ["basic-chords"],
        learningObjectives: [
          `${genreString} style mastery`,
          "Genre-specific techniques",
        ],
        adaptationPoints: [
          {
            metric: "engagement",
            threshold: 0.7,
            action: "add_complexity",
            adjustment: 0.1,
          },
        ],
      });
    });

    return genreExercises;
  }

  private generateConfidenceBuildingExercises(): LearningExercise[] {
    return [
      {
        id: generateId("confidence-ex"),
        name: "Success-Oriented Practice",
        type: "technique",
        difficulty: 0.4,
        estimatedDuration: 15,
        prerequisites: [],
        learningObjectives: ["Build confidence", "Reinforce success patterns"],
        adaptationPoints: [
          {
            metric: "confidenceLevel",
            threshold: 0.7,
            action: "add_complexity",
            adjustment: 0.05,
          },
        ],
      },
    ];
  }

  private generateSuccessOrientedExercises(): LearningExercise[] {
    return [
      {
        id: generateId("success-ex"),
        name: "Achievable Challenges",
        type: "technique",
        difficulty: 0.5,
        estimatedDuration: 18,
        prerequisites: [],
        learningObjectives: ["Confidence building", "Positive reinforcement"],
        adaptationPoints: [],
      },
    ];
  }

  private generateBranchingExercises(
    newSkillAreas: string[]
  ): LearningExercise[] {
    return newSkillAreas.map((skill) => ({
      id: generateId(`branch-${skill}`),
      name: `Introduction to ${skill}`,
      type: "theory" as const,
      difficulty: 0.4,
      estimatedDuration: 25,
      prerequisites: [],
      learningObjectives: [`${skill} fundamentals`, "Skill area expansion"],
      adaptationPoints: [],
    }));
  }

  /**
   * Generate next session exercises
   */
  private async generateNextSessionExercises(
    metrics: LearningMetrics,
    context: LearningContext
  ): Promise<LearningExercise[]> {
    const exercises: LearningExercise[] = [];

    // Base exercise selection on current performance
    if (metrics.accuracy > 0.8) {
      exercises.push(...this.generateProgressionExercises());
    } else {
      exercises.push(...this.generateReinforcementExercises());
    }

    // Add variety if engagement is low
    if (metrics.engagement < 0.7) {
      exercises.push(
        ...this.generateEngagingExercises(context.preferences.favoriteGenres)
      );
    }

    return exercises.slice(0, 3); // Limit to 3 recommendations
  }

  private generateProgressionExercises(): LearningExercise[] {
    return [
      {
        id: generateId("progression-ex"),
        name: "Skill Progression",
        type: "technique",
        difficulty: 0.65,
        estimatedDuration: 22,
        prerequisites: ["intermediate-level"],
        learningObjectives: ["Skill advancement", "Challenge adaptation"],
        adaptationPoints: [],
      },
    ];
  }

  /**
   * Helper methods for analysis and calculations
   */
  private analyzeSkillAreas(
    skillId: string,
    metrics: LearningMetrics
  ): {
    weakAreas: string[];
    strengthAreas: string[];
  } {
    const weakAreas: string[] = [];
    const strengthAreas: string[] = [];

    // Analyze different aspects based on metrics
    if (metrics.accuracy < 0.7) weakAreas.push("accuracy");
    else strengthAreas.push("accuracy");

    if (metrics.consistency < 0.7) weakAreas.push("consistency");
    else strengthAreas.push("consistency");

    if (metrics.speed < 0.6) weakAreas.push("speed");
    else strengthAreas.push("speed");

    return { weakAreas, strengthAreas };
  }

  private generateSkillPracticeRecommendations(
    skillId: string,
    currentLevel: number,
    weakAreas: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Base recommendations on skill and level
    if (currentLevel < 0.5) {
      recommendations.push(`Focus on ${skillId} fundamentals`);
      recommendations.push("Practice with metronome at slow tempo");
    } else if (currentLevel < 0.8) {
      recommendations.push(`Develop intermediate ${skillId} techniques`);
      recommendations.push("Practice with musical backing tracks");
    } else {
      recommendations.push(`Master advanced ${skillId} concepts`);
      recommendations.push("Practice in different musical contexts");
    }

    // Add specific recommendations for weak areas
    weakAreas.forEach((area) => {
      switch (area) {
        case "accuracy":
          recommendations.push("Focus on precise execution over speed");
          break;
        case "consistency":
          recommendations.push("Practice regular repetition patterns");
          break;
        case "speed":
          recommendations.push("Gradually increase tempo");
          break;
      }
    });

    return recommendations;
  }

  private estimateTimeToNextLevel(
    skillId: string,
    currentLevel: number,
    improvement: number
  ): number {
    const baseTime = 10; // Base hours to improve
    const difficultyMultiplier = 1 + currentLevel; // Higher levels take longer
    const improvementFactor = Math.max(0.1, improvement + 0.1); // Account for improvement rate

    return Math.ceil((baseTime * difficultyMultiplier) / improvementFactor);
  }

  private getSkillDisplayName(skillId: string): string {
    const nameMap: Record<string, string> = {
      rhythm: "Rhythm & Timing",
      pitch: "Pitch Accuracy",
      timing: "Musical Timing",
      technique: "Playing Technique",
      theory: "Music Theory",
    };
    return nameMap[skillId] || skillId;
  }

  private calculateMasteryLevel(skillId: string, currentLevel: number): number {
    // Mastery is achieved at 90% of maximum level
    return Math.min(currentLevel / 0.9, 1);
  }

  private getCurrentDifficulty(): number {
    if (this.sessionHistory.length === 0) return 0.5;

    const recent = this.sessionHistory.slice(-3);
    const avgAccuracy =
      recent.reduce((sum, m) => sum + m.accuracy, 0) / recent.length;

    return Math.max(0.1, Math.min(0.9, avgAccuracy));
  }

  private calculateLearningEfficiency(): number {
    if (this.sessionHistory.length < 2) return 0.5;

    const recent = this.sessionHistory.slice(-5);
    const improvements = recent.map((m) => m.improvementRate);
    const avgImprovement =
      improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;

    return Math.max(0, Math.min(1, avgImprovement * 2 + 0.5));
  }

  private calculateOverallProgress(userId: string): number {
    const allAssessments = Array.from(this.skillAssessments.values());
    if (allAssessments.length === 0) return 0;

    const avgLevel =
      allAssessments.reduce(
        (sum, assessment) => sum + assessment.currentLevel,
        0
      ) / allAssessments.length;
    return avgLevel;
  }

  private generateLearningInsights(
    metrics: LearningMetrics,
    context: LearningContext
  ): string[] {
    const insights: string[] = [];

    // Performance insights
    if (metrics.accuracy > 0.85) {
      insights.push("Excellent accuracy - ready for more challenging material");
    } else if (metrics.accuracy < 0.6) {
      insights.push("Focus on accuracy over speed for better foundation");
    }

    // Consistency insights
    if (metrics.consistency > 0.8) {
      insights.push(
        "Great consistency - your practice routine is working well"
      );
    } else if (metrics.consistency < 0.6) {
      insights.push("Work on consistent practice timing and approach");
    }

    // Engagement insights
    if (metrics.engagement < 0.6) {
      insights.push("Consider practicing with your favorite music styles");
    }

    // Progress insights
    if (metrics.improvementRate > 0.1) {
      insights.push("Strong improvement rate - keep up the great work!");
    }

    return insights;
  }

  private isSkillAreaConcentrated(history: LearningEvent[]): boolean {
    const recentSkills = history.slice(-10).map((event) => event.skill);
    const uniqueSkills = new Set(recentSkills);
    return uniqueSkills.size <= 2; // Concentrated if working on 2 or fewer skills
  }

  private identifyComplementarySkills(context: LearningContext): string[] {
    const currentSkills = new Set(
      context.history.slice(-10).map((event) => event.skill)
    );
    const allSkills = [
      "rhythm",
      "pitch",
      "theory",
      "technique",
      "listening",
      "creativity",
    ];

    return allSkills.filter((skill) => !currentSkills.has(skill)).slice(0, 2);
  }

  private async executeAdaptation(
    recommendation: AdaptiveRecommendation,
    context: LearningContext
  ): Promise<void> {
    // Implementation would depend on the specific learning system integration
    console.log(`🎯 Executing adaptation: ${recommendation.action}`);
  }

  private recordAdaptation(
    recommendation: AdaptiveRecommendation,
    context: LearningContext
  ): void {
    const record: AdaptationRecord = {
      timestamp: Date.now(),
      trigger: recommendation.reason,
      adaptationType: recommendation.action,
      beforeMetrics:
        this.sessionHistory[this.sessionHistory.length - 2] ||
        ({} as LearningMetrics),
      afterMetrics:
        this.sessionHistory[this.sessionHistory.length - 1] ||
        ({} as LearningMetrics),
      success: true, // Would be determined by actual implementation
      notes: recommendation.adaptationReason,
    };

    this.adaptationHistory.push(record);

    // Keep adaptation history manageable
    if (this.adaptationHistory.length > 100) {
      this.adaptationHistory = this.adaptationHistory.slice(-50);
    }
  }

  private trimSessionHistory(): void {
    // Keep only last 50 sessions for efficiency
    if (this.sessionHistory.length > 50) {
      this.sessionHistory = this.sessionHistory.slice(-25);
    }
  }

  private async loadLearningModels(): Promise<void> {
    console.log("📚 Loading learning models...");
  }

  private async initializeSkillAssessment(): Promise<void> {
    console.log("📊 Initializing skill assessment framework...");
  }

  /**
   * Public API methods
   */

  /**
   * Set user profile for personalized learning
   */
  setUserProfile(profile: UserPreferences): void {
    this.userProfile = profile;
    console.log("👤 User profile updated for adaptive learning");
  }

  /**
   * Get current learning path
   */
  getCurrentLearningPath(): LearningPath | undefined {
    return this.currentLearningPath;
  }

  /**
   * Get skill assessments
   */
  getSkillAssessments(): SkillAssessment[] {
    return Array.from(this.skillAssessments.values());
  }

  /**
   * Get adaptation history
   */
  getAdaptationHistory(): AdaptationRecord[] {
    return [...this.adaptationHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("⚙️ AdaptiveLearning configuration updated");
  }

  /**
   * Generate learning report
   */
  generateLearningReport(): string {
    const assessments = this.getSkillAssessments();
    const overallProgress =
      assessments.length > 0
        ? assessments.reduce((sum, a) => sum + a.currentLevel, 0) /
          assessments.length
        : 0;

    return `
🎯 Adaptive Learning Report
Overall Progress: ${(overallProgress * 100).toFixed(1)}%
Sessions Tracked: ${this.sessionHistory.length}
Skills Assessed: ${assessments.length}
Adaptations Applied: ${this.adaptationHistory.length}
Learning Efficiency: ${(this.calculateLearningEfficiency() * 100).toFixed(1)}%
    `.trim();
  }

  // =============================================================================
  // 🔗 MaestroBrain.ts COMPATIBILITY METHODS
  // =============================================================================

  /**
   * 🎯 Record session (MaestroBrain compatibility)
   * Wrapper for recordLearningSession with simpler interface
   */
  recordSession(sessionData: {
    accuracy: number;
    speed: number;
    consistency: number;
    improvement_rate: number;
  }): void {
    // Convert MaestroBrain sessionData to our internal format
    const metrics: LearningMetrics = {
      accuracy: sessionData.accuracy,
      speed: sessionData.speed / 120, // Normalize tempo to 0-1 range
      consistency: sessionData.consistency,
      improvementRate: sessionData.improvement_rate,
      effortLevel: 0.5, // Default value
      engagement: 0.7, // Default value
      retentionRate: 0.8, // Default value
      frustrationLevel: sessionData.accuracy < 0.6 ? 0.6 : 0.3, // Infer from accuracy
      confidenceLevel: sessionData.accuracy > 0.8 ? 0.8 : 0.5, // Infer from accuracy
    };

    const context: LearningContext = {
      userId: "current-user", // Default user ID
      sessionId: this.sessionId,
      currentSkill: "general",
      difficulty: "beginner",
      preferences: this.userProfile || {
        favoriteGenres: [],
        skillLevel: "beginner",
        instruments: ["guitar"],
        favoriteKeys: ["C"],
        practiceGoals: ["improve-technique"],
      },
      history: [],
    };

    // Use existing method asynchronously but don't await (fire and forget)
    this.recordLearningSession(metrics, context)
      .then(() => {
        console.log("✅ Session recorded successfully");
      })
      .catch((error) => {
        console.error("❌ Session recording failed:", error);
      });
  }

  /**
   * 🎯 Get adaptive recommendation (MaestroBrain compatibility)
   * Returns simple recommendation format expected by MaestroBrain
   */
  getAdaptiveRecommendation(): {
    next_exercises: string[];
    difficulty_adjustment: number;
    focus_areas: string[];
  } {
    // Get latest metrics if available
    const latestMetrics = this.sessionHistory[this.sessionHistory.length - 1];

    if (!latestMetrics) {
      // Return default recommendation if no session history
      return {
        next_exercises: [
          "Basic chord practice",
          "Rhythm exercises",
          "Scale practice",
        ],
        difficulty_adjustment: 0.0,
        focus_areas: ["technique", "timing"],
      };
    }

    // Generate recommendations based on latest performance
    const exercises: string[] = [];
    let difficultyAdjustment = 0.0;
    const focusAreas: string[] = [];

    // Determine next exercises based on performance
    if (latestMetrics.accuracy > 0.85) {
      exercises.push(
        "Advanced chord progressions",
        "Complex rhythms",
        "Improvisation exercises"
      );
      difficultyAdjustment = 0.1;
    } else if (latestMetrics.accuracy > 0.7) {
      exercises.push(
        "Intermediate scales",
        "Chord transitions",
        "Tempo building"
      );
      difficultyAdjustment = 0.05;
    } else {
      exercises.push(
        "Basic chord review",
        "Slow tempo practice",
        "Fundamental exercises"
      );
      difficultyAdjustment = -0.05;
    }

    // Determine focus areas based on weak metrics
    if (latestMetrics.accuracy < 0.7) focusAreas.push("accuracy");
    if (latestMetrics.consistency < 0.7) focusAreas.push("consistency");
    if (latestMetrics.speed < 0.6) focusAreas.push("speed");
    if (latestMetrics.frustrationLevel > 0.6) focusAreas.push("confidence");

    // Default focus areas if none identified
    if (focusAreas.length === 0) {
      focusAreas.push("technique", "timing");
    }

    return {
      next_exercises: exercises,
      difficulty_adjustment: difficultyAdjustment,
      focus_areas: focusAreas,
    };
  }

  /**
   * 🎯 Update skill progress (helper for recordSession)
   * Provides additional interface for skill tracking
   */
  async updateSkillProgress(
    userId: string,
    skill: string,
    performance: number
  ): Promise<void> {
    // Create basic metrics from performance score
    const metrics: LearningMetrics = {
      accuracy: performance,
      speed: 0.7,
      consistency: performance,
      improvementRate: 0.05,
      effortLevel: 0.5,
      engagement: 0.7,
      retentionRate: 0.8,
      frustrationLevel: performance < 0.6 ? 0.7 : 0.3,
      confidenceLevel: performance > 0.7 ? 0.8 : 0.5,
    };

    const context: LearningContext = {
      userId,
      sessionId: this.sessionId,
      currentSkill: skill,
      difficulty: "beginner",
      preferences: this.userProfile || {
        favoriteGenres: [],
        skillLevel: "beginner",
        instruments: ["guitar"],
        favoriteKeys: ["C"],
        practiceGoals: ["improve-technique"],
      },
      history: [],
    };

    await this.recordLearningSession(metrics, context);
  }

  /**
   * 🎯 Generate recommendations (PersonalizationEngine compatibility)
   * Provides recommendation interface expected by other modules
   */
  async generateRecommendations(
    userId: string,
    skillLevel: string,
    options: { context?: string }
  ): Promise<{
    exercises?: { name: string }[];
    focusAreas?: string[];
    difficulty?: number;
  }> {
    const recommendation = this.getAdaptiveRecommendation();

    return {
      exercises: recommendation.next_exercises.map((name) => ({ name })),
      focusAreas: recommendation.focus_areas,
      difficulty: 0.5 + recommendation.difficulty_adjustment,
    };
  }
}
