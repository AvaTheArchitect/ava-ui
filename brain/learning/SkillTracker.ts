/**
 * SkillTracker.ts - Advanced Music Skill Progression Tracking
 * 🎯 Track and analyze musical skill development across instruments and theory
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import {
  BrainModule,
  UserPreferences,
  ChordDifficulty,
  InstrumentType,
} from "../../shared/types";

// Skill Configuration
export interface SkillTrackerConfig {
  trackingInterval?: number; // How often to assess skills (in sessions)
  skillDecayRate?: number; // How quickly unused skills decay (0-1)
  masteryThreshold?: number; // Threshold for considering a skill mastered (0-1)
  enablePredictiveSkillGaps?: boolean;
  enableCrossInstrumentLearning?: boolean;
  maxSkillHistory?: number; // Number of assessments to keep
  confidenceThreshold?: number; // Minimum confidence for skill updates
}

// Constants to reduce magic numbers
export const SKILL_TRACKER_CONSTANTS = {
  DEFAULT_SKILL_LEVEL: 0.1,
  INITIAL_CONFIDENCE: 0.5,
  ESTIMATED_HOURS_TO_NEXT_LEVEL: 10,
  SMOOTHING_FACTOR: 0.3,
  PROGRESS_TREND_THRESHOLD: 0.05,
  SKILL_IMPROVEMENT_MULTIPLIER: 0.1,
  DEPENDENT_SKILL_BOOST_FACTOR: 0.1,
  SIGNIFICANT_GAP_THRESHOLD: 0.1,
  BASE_HOURS_FOR_TEN_PERCENT: 10,
  MIN_PRACTICE_EFFICIENCY: 0.1,
} as const;

// Forward declaration to avoid circular imports
interface PracticeExercise {
  qualityScore: number;
  type: string;
}

const PracticeType = {
  MAINTENANCE: "maintenance",
} as const;
export enum SkillCategory {
  TECHNICAL = "technical",
  THEORETICAL = "theoretical",
  CREATIVE = "creative",
  PERFORMANCE = "performance",
  LISTENING = "listening",
  COMPOSITION = "composition",
}

// Skill Definition
export interface MusicSkill {
  id: string;
  name: string;
  category: SkillCategory;
  instrument: InstrumentType;
  description: string;
  prerequisites: string[]; // Other skill IDs required
  subSkills: string[]; // Component skills
  difficulty: ChordDifficulty;
  learningPath: string[]; // Recommended progression
  assessmentCriteria: AssessmentCriterion[];
}

// Assessment Criteria
export interface AssessmentCriterion {
  name: string;
  description: string;
  weight: number; // 0-1, importance in overall skill assessment
  measurementType:
    | "accuracy"
    | "speed"
    | "consistency"
    | "creativity"
    | "theory";
  targetValue?: number; // Optional target for mastery
}

// Skill Level Assessment
export interface SkillLevel {
  skillId: string;
  currentLevel: number; // 0-1 scale
  masteryLevel: number; // 0-1 scale (where 1.0 = full mastery)
  confidence: number; // Confidence in assessment
  lastAssessed: number; // Timestamp
  assessmentCount: number;
  progressTrend: "improving" | "declining" | "stable" | "unknown";
  timeToNextLevel: number; // Estimated hours of practice
  weakAreas: string[];
  strongAreas: string[];
}

// Skill Progress History
export interface SkillProgressEntry {
  timestamp: number;
  skillId: string;
  level: number;
  confidence: number;
  assessmentSource: "practice" | "lesson" | "performance" | "test";
  metrics: SkillMetrics;
  notes?: string;
}

// Skill Metrics
export interface SkillMetrics {
  accuracy: number; // 0-1
  speed: number; // 0-1 (relative to target)
  consistency: number; // 0-1
  retention: number; // 0-1 (how well skill is retained over time)
  transferability: number; // 0-1 (how well skill transfers to other areas)
  practiceEfficiency: number; // 0-1 (improvement per practice hour)
}

// Skill Gap Analysis
export interface SkillGap {
  skillId: string;
  currentLevel: number;
  targetLevel: number;
  priority: "low" | "medium" | "high" | "critical";
  estimatedPracticeTime: number; // Hours needed to close gap
  recommendedActions: SkillRecommendation[];
  dependencies: string[]; // Skills that should be learned first
  blockers: string[]; // What this gap is preventing
}

// Skill Recommendations
export interface SkillRecommendation {
  type: "practice" | "lesson" | "exercise" | "study" | "performance";
  title: string;
  description: string;
  difficulty: ChordDifficulty;
  estimatedTime: number; // Minutes
  priority: "low" | "medium" | "high";
  targetSkills: string[]; // Skills this recommendation addresses
  resources?: string[]; // Links to resources, exercises, etc.
}

// Learning Pathway
export interface LearningPathway {
  id: string;
  name: string;
  description: string;
  targetInstrument: InstrumentType;
  skillSequence: string[]; // Ordered list of skill IDs
  estimatedDuration: number; // Total hours
  currentPosition: number; // Index in skillSequence
  completionPercentage: number;
  adaptations: PathwayAdaptation[];
}

// Pathway Adaptation
export interface PathwayAdaptation {
  timestamp: number;
  reason: string;
  changeType:
    | "skill_added"
    | "skill_removed"
    | "order_changed"
    | "difficulty_adjusted";
  skillsAffected: string[];
  confidence: number;
}

// Skill Portfolio Overview
export interface SkillPortfolio {
  userId: string;
  overallLevel: number; // 0-1 (weighted average across all skills)
  strengthProfile: { [category in SkillCategory]: number };
  instrumentProficiency: { [instrument in InstrumentType]: number };
  topSkills: SkillLevel[];
  skillGaps: SkillGap[];
  recommendedFocus: SkillCategory[];
  learningVelocity: number; // Rate of skill improvement
  lastUpdated: number;
}

/**
 * SkillTracker - Advanced music skill progression tracking and analysis
 * Tracks musical skills across instruments, theory, and performance
 */
export class SkillTracker implements BrainModule {
  public readonly name: string = "SkillTracker";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;

  // Configuration
  private config: SkillTrackerConfig = {
    trackingInterval: 3,
    skillDecayRate: 0.02,
    masteryThreshold: 0.85,
    enablePredictiveSkillGaps: true,
    enableCrossInstrumentLearning: true,
    maxSkillHistory: 100,
    confidenceThreshold: 0.6,
  };

  // State management
  private skillDefinitions = new Map<string, MusicSkill>();
  private skillLevels = new Map<string, SkillLevel>();
  private skillHistory: SkillProgressEntry[] = [];
  private learningPathways = new Map<string, LearningPathway>();

  constructor(config?: Partial<SkillTrackerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the SkillTracker module
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🎯 Initializing SkillTracker v${this.version}...`);

      // Load skill definitions
      await this.loadSkillDefinitions();

      // Initialize learning pathways
      await this.initializeLearningPathways();

      // Load user skill data if available
      await this.loadUserSkillData();

      this.initialized = true;
      console.log(`✅ SkillTracker initialized successfully`);
    } catch (error) {
      console.error("❌ Failed to initialize SkillTracker:", error);
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
      healthy: this.initialized && this.skillDefinitions.size > 0,
      metrics: {
        trackedSkills: this.skillDefinitions.size,
        userSkillLevels: this.skillLevels.size,
        historyEntries: this.skillHistory.length,
        learningPathways: this.learningPathways.size,
        lastUpdate: Date.now(),
      },
    };
  }

  /**
   * 🎯 Core Skill Tracking Methods
   */

  /**
   * Update skill level based on performance data
   */
  async updateSkillLevel(
    skillId: string,
    metrics: SkillMetrics,
    source: "practice" | "lesson" | "performance" | "test" = "practice"
  ): Promise<SkillLevel> {
    if (!this.skillDefinitions.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skill = this.skillDefinitions.get(skillId)!;
    const currentLevel =
      this.skillLevels.get(skillId) || this.createInitialSkillLevel(skillId);

    // Calculate new level based on metrics and assessment criteria
    const newLevel = await this.calculateSkillLevel(
      skill,
      metrics,
      currentLevel
    );

    // Update skill level
    this.skillLevels.set(skillId, newLevel);

    // Add to history
    this.skillHistory.push({
      timestamp: Date.now(),
      skillId,
      level: newLevel.currentLevel,
      confidence: newLevel.confidence,
      assessmentSource: source,
      metrics,
    });

    // Trim history if needed
    this.trimSkillHistory();

    // Check for skill dependencies and updates
    await this.updateDependentSkills(skillId, newLevel);

    return newLevel;
  }

  /**
   * Get current skill portfolio for a user
   */
  async getSkillPortfolio(userId: string): Promise<SkillPortfolio> {
    const allSkills = Array.from(this.skillLevels.values());

    // Calculate overall level (weighted by skill importance)
    const overallLevel = this.calculateOverallLevel(allSkills);

    // Calculate strength profile by category
    const strengthProfile = this.calculateStrengthProfile(allSkills);

    // Calculate instrument proficiency
    const instrumentProficiency =
      this.calculateInstrumentProficiency(allSkills);

    // Identify top skills
    const topSkills = allSkills
      .sort((a, b) => b.currentLevel - a.currentLevel)
      .slice(0, 5);

    // Identify skill gaps
    const skillGaps = await this.identifySkillGaps(allSkills);

    // Recommend focus areas
    const recommendedFocus = this.recommendFocusAreas(
      strengthProfile,
      skillGaps
    );

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity();

    return {
      userId,
      overallLevel,
      strengthProfile,
      instrumentProficiency,
      topSkills,
      skillGaps,
      recommendedFocus,
      learningVelocity,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Generate skill recommendations based on current level and goals
   */
  async generateSkillRecommendations(
    targetSkills?: string[],
    timeAvailable?: number
  ): Promise<SkillRecommendation[]> {
    const skillGaps = await this.identifySkillGaps(
      Array.from(this.skillLevels.values())
    );
    const recommendations: SkillRecommendation[] = [];

    for (const gap of skillGaps) {
      if (targetSkills && !targetSkills.includes(gap.skillId)) {
        continue;
      }

      // Generate recommendations for this skill gap
      const skillRecommendations = await this.generateRecommendationsForSkill(
        gap
      );
      recommendations.push(...skillRecommendations);
    }

    // Filter by time available if specified
    if (timeAvailable) {
      return recommendations.filter(
        (rec) => rec.estimatedTime <= timeAvailable
      );
    }

    // Sort by priority and potential impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Track practice session and update relevant skills
   */
  async trackPracticeSession(practiceData: {
    duration: number;
    skillsPracticed: string[];
    exercises: string[];
    performanceMetrics: SkillMetrics;
    focusAreas?: string[];
  }): Promise<SkillLevel[]> {
    const updatedSkills: SkillLevel[] = [];

    for (const skillId of practiceData.skillsPracticed) {
      try {
        const updatedSkill = await this.updateSkillLevel(
          skillId,
          practiceData.performanceMetrics,
          "practice"
        );
        updatedSkills.push(updatedSkill);
      } catch (error) {
        console.warn(`Failed to update skill ${skillId}:`, error);
      }
    }

    return updatedSkills;
  }

  /**
   * 🔍 Private Helper Methods
   */

  private async loadSkillDefinitions(): Promise<void> {
    // Load predefined music skills
    const musicSkills = this.createDefaultSkillDefinitions();

    for (const skill of musicSkills) {
      this.skillDefinitions.set(skill.id, skill);
    }

    console.log(`📚 Loaded ${musicSkills.length} skill definitions`);
  }

  private createDefaultSkillDefinitions(): MusicSkill[] {
    return [
      // Guitar Skills
      {
        id: "guitar_basic_chords",
        name: "Basic Guitar Chords",
        category: SkillCategory.TECHNICAL,
        instrument: InstrumentType.GUITAR,
        description: "Basic open chords (C, G, D, Em, Am, F)",
        prerequisites: [],
        subSkills: ["chord_transitions", "strumming_patterns"],
        difficulty: ChordDifficulty.BEGINNER,
        learningPath: ["open_position", "chord_changes", "strumming"],
        assessmentCriteria: [
          {
            name: "Chord Clarity",
            description: "All notes ring clearly",
            weight: 0.4,
            measurementType: "accuracy",
            targetValue: 0.9,
          },
          {
            name: "Transition Speed",
            description: "Smooth chord changes",
            weight: 0.3,
            measurementType: "speed",
            targetValue: 0.8,
          },
          {
            name: "Consistency",
            description: "Consistent execution over time",
            weight: 0.3,
            measurementType: "consistency",
            targetValue: 0.85,
          },
        ],
      },
      // Music Theory Skills
      {
        id: "theory_scales",
        name: "Scale Knowledge",
        category: SkillCategory.THEORETICAL,
        instrument: InstrumentType.GENERAL,
        description: "Understanding of major and minor scales",
        prerequisites: [],
        subSkills: ["major_scales", "minor_scales", "modes"],
        difficulty: ChordDifficulty.INTERMEDIATE,
        learningPath: ["scale_construction", "key_signatures", "modes"],
        assessmentCriteria: [
          {
            name: "Scale Accuracy",
            description: "Correct notes in scales",
            weight: 0.5,
            measurementType: "accuracy",
            targetValue: 0.95,
          },
          {
            name: "Application",
            description: "Using scales in practice",
            weight: 0.5,
            measurementType: "theory",
            targetValue: 0.8,
          },
        ],
      },
      // Add more skills as needed...
    ];
  }

  private async initializeLearningPathways(): Promise<void> {
    // Create default learning pathways for different instruments and goals
    const pathways: LearningPathway[] = [
      {
        id: "guitar_beginner_path",
        name: "Guitar Beginner Path",
        description: "Complete beginner guitar learning sequence",
        targetInstrument: InstrumentType.GUITAR,
        skillSequence: [
          "guitar_basic_chords",
          "guitar_strumming",
          "guitar_chord_progressions",
        ],
        estimatedDuration: 120, // 120 hours
        currentPosition: 0,
        completionPercentage: 0,
        adaptations: [],
      },
    ];

    for (const pathway of pathways) {
      this.learningPathways.set(pathway.id, pathway);
    }
  }

  private async loadUserSkillData(): Promise<void> {
    // In a real implementation, this would load from storage
    // For now, we'll start with empty skill levels
    console.log("📊 User skill data loaded (placeholder)");
  }

  private createInitialSkillLevel(skillId: string): SkillLevel {
    return {
      skillId,
      currentLevel: SKILL_TRACKER_CONSTANTS.DEFAULT_SKILL_LEVEL,
      masteryLevel: this.config.masteryThreshold || 0.85,
      confidence: SKILL_TRACKER_CONSTANTS.INITIAL_CONFIDENCE,
      lastAssessed: Date.now(),
      assessmentCount: 1,
      progressTrend: "unknown",
      timeToNextLevel: SKILL_TRACKER_CONSTANTS.ESTIMATED_HOURS_TO_NEXT_LEVEL,
      weakAreas: [],
      strongAreas: [],
    };
  }

  private async calculateSkillLevel(
    skill: MusicSkill,
    metrics: SkillMetrics,
    currentLevel: SkillLevel
  ): Promise<SkillLevel> {
    // Weighted average based on assessment criteria
    let newLevelValue = 0;
    let totalWeight = 0;

    for (const criterion of skill.assessmentCriteria) {
      let metricValue = 0;
      switch (criterion.measurementType) {
        case "accuracy":
          metricValue = metrics.accuracy;
          break;
        case "speed":
          metricValue = metrics.speed;
          break;
        case "consistency":
          metricValue = metrics.consistency;
          break;
        case "theory":
          metricValue = metrics.transferability; // Use transferability as proxy for theory
          break;
        case "creativity":
          metricValue = (metrics.accuracy + metrics.transferability) / 2;
          break;
      }

      newLevelValue += metricValue * criterion.weight;
      totalWeight += criterion.weight;
    }

    if (totalWeight > 0) {
      newLevelValue /= totalWeight;
    }

    // Smooth the transition (don't allow dramatic jumps)
    const adjustedLevel =
      currentLevel.currentLevel *
        (1 - SKILL_TRACKER_CONSTANTS.SMOOTHING_FACTOR) +
      newLevelValue * SKILL_TRACKER_CONSTANTS.SMOOTHING_FACTOR;

    // Determine progress trend
    const progressTrend = this.determineProgressTrend(
      currentLevel.skillId,
      adjustedLevel
    );

    // Calculate confidence based on assessment count and consistency
    const confidence = Math.min(
      0.9,
      0.4 + currentLevel.assessmentCount * 0.1 + metrics.consistency * 0.4
    );

    return {
      ...currentLevel,
      currentLevel: Math.min(1.0, Math.max(0.0, adjustedLevel)),
      confidence,
      lastAssessed: Date.now(),
      assessmentCount: currentLevel.assessmentCount + 1,
      progressTrend,
      timeToNextLevel: this.calculateTimeToNextLevel(
        adjustedLevel,
        metrics.practiceEfficiency
      ),
    };
  }

  private determineProgressTrend(
    skillId: string,
    newLevel: number
  ): "improving" | "declining" | "stable" | "unknown" {
    const recentHistory = this.skillHistory
      .filter((entry) => entry.skillId === skillId)
      .slice(-5) // Last 5 assessments
      .map((entry) => entry.level);

    if (recentHistory.length < 2) return "unknown";

    const trend = recentHistory[recentHistory.length - 1] - recentHistory[0];

    if (trend > SKILL_TRACKER_CONSTANTS.PROGRESS_TREND_THRESHOLD)
      return "improving";
    if (trend < -SKILL_TRACKER_CONSTANTS.PROGRESS_TREND_THRESHOLD)
      return "declining";
    return "stable";
  }

  private calculateTimeToNextLevel(
    currentLevel: number,
    practiceEfficiency: number
  ): number {
    const targetLevel = Math.min(
      1.0,
      currentLevel + SKILL_TRACKER_CONSTANTS.SKILL_IMPROVEMENT_MULTIPLIER
    );
    const levelGap = targetLevel - currentLevel;

    // Adjust based on practice efficiency and gap size
    const adjustedHours =
      SKILL_TRACKER_CONSTANTS.BASE_HOURS_FOR_TEN_PERCENT *
      (levelGap / SKILL_TRACKER_CONSTANTS.SKILL_IMPROVEMENT_MULTIPLIER) *
      (1 /
        Math.max(
          SKILL_TRACKER_CONSTANTS.MIN_PRACTICE_EFFICIENCY,
          practiceEfficiency
        ));
    return Math.ceil(adjustedHours);
  }

  private async updateDependentSkills(
    skillId: string,
    updatedLevel: SkillLevel
  ): Promise<void> {
    // Find skills that depend on this skill and update them accordingly
    for (const [depSkillId, depSkill] of this.skillDefinitions) {
      if (depSkill.prerequisites.includes(skillId)) {
        const depCurrentLevel = this.skillLevels.get(depSkillId);
        if (depCurrentLevel) {
          // Boost dependent skill slightly based on prerequisite improvement
          const boost =
            (updatedLevel.currentLevel - (depCurrentLevel.currentLevel || 0)) *
            SKILL_TRACKER_CONSTANTS.DEPENDENT_SKILL_BOOST_FACTOR;
          if (boost > 0) {
            const updatedDepLevel = {
              ...depCurrentLevel,
              currentLevel: Math.min(1.0, depCurrentLevel.currentLevel + boost),
            };
            this.skillLevels.set(depSkillId, updatedDepLevel);
          }
        }
      }
    }
  }

  private calculateOverallLevel(skills: SkillLevel[]): number {
    if (skills.length === 0) return 0;

    const totalLevel = skills.reduce(
      (sum, skill) => sum + skill.currentLevel,
      0
    );
    return totalLevel / skills.length;
  }

  private calculateStrengthProfile(skills: SkillLevel[]): {
    [category in SkillCategory]: number;
  } {
    const profile = {} as { [category in SkillCategory]: number };

    // Initialize all categories
    Object.values(SkillCategory).forEach((category) => {
      profile[category] = 0;
    });

    // Group skills by category and calculate averages
    const categoryGroups = new Map<SkillCategory, SkillLevel[]>();

    skills.forEach((skill) => {
      const skillDef = this.skillDefinitions.get(skill.skillId);
      if (skillDef) {
        if (!categoryGroups.has(skillDef.category)) {
          categoryGroups.set(skillDef.category, []);
        }
        categoryGroups.get(skillDef.category)!.push(skill);
      }
    });

    categoryGroups.forEach((categorySkills, category) => {
      const average =
        categorySkills.reduce((sum, skill) => sum + skill.currentLevel, 0) /
        categorySkills.length;
      profile[category] = average;
    });

    return profile;
  }

  private calculateInstrumentProficiency(skills: SkillLevel[]): {
    [instrument in InstrumentType]: number;
  } {
    const proficiency = {} as { [instrument in InstrumentType]: number };

    // Initialize all instruments
    Object.values(InstrumentType).forEach((instrument) => {
      proficiency[instrument] = 0;
    });

    // Group skills by instrument and calculate averages
    const instrumentGroups = new Map<InstrumentType, SkillLevel[]>();

    skills.forEach((skill) => {
      const skillDef = this.skillDefinitions.get(skill.skillId);
      if (skillDef) {
        if (!instrumentGroups.has(skillDef.instrument)) {
          instrumentGroups.set(skillDef.instrument, []);
        }
        instrumentGroups.get(skillDef.instrument)!.push(skill);
      }
    });

    instrumentGroups.forEach((instrumentSkills, instrument) => {
      const average =
        instrumentSkills.reduce((sum, skill) => sum + skill.currentLevel, 0) /
        instrumentSkills.length;
      proficiency[instrument] = average;
    });

    return proficiency;
  }

  private async identifySkillGaps(skills: SkillLevel[]): Promise<SkillGap[]> {
    const gaps: SkillGap[] = [];

    skills.forEach((skill) => {
      const gapSize = skill.masteryLevel - skill.currentLevel;
      if (gapSize > SKILL_TRACKER_CONSTANTS.SIGNIFICANT_GAP_THRESHOLD) {
        // Only consider significant gaps
        gaps.push({
          skillId: skill.skillId,
          currentLevel: skill.currentLevel,
          targetLevel: skill.masteryLevel,
          priority: this.calculateGapPriority(skill, gapSize),
          estimatedPracticeTime:
            skill.timeToNextLevel *
            (gapSize / SKILL_TRACKER_CONSTANTS.SKILL_IMPROVEMENT_MULTIPLIER),
          recommendedActions: [],
          dependencies: [],
          blockers: [],
        });
      }
    });

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculateGapPriority(
    skill: SkillLevel,
    gapSize: number
  ): "low" | "medium" | "high" | "critical" {
    if (gapSize > 0.5) return "critical";
    if (gapSize > 0.3) return "high";
    if (gapSize > 0.15) return "medium";
    return "low";
  }

  private recommendFocusAreas(
    strengthProfile: { [category in SkillCategory]: number },
    skillGaps: SkillGap[]
  ): SkillCategory[] {
    // Recommend focusing on areas with high-priority gaps and lower current levels
    const categoryPriorities = new Map<SkillCategory, number>();

    // Initialize with current strength levels (inverted - lower strength = higher priority)
    Object.entries(strengthProfile).forEach(([category, strength]) => {
      categoryPriorities.set(category as SkillCategory, 1 - strength);
    });

    // Boost priority for categories with critical skill gaps
    skillGaps.forEach((gap) => {
      const skillDef = this.skillDefinitions.get(gap.skillId);
      if (skillDef && gap.priority === "critical") {
        const currentPriority = categoryPriorities.get(skillDef.category) || 0;
        categoryPriorities.set(skillDef.category, currentPriority + 0.5);
      }
    });

    // Sort categories by priority and return top 3
    return Array.from(categoryPriorities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  private calculateLearningVelocity(): number {
    // Calculate learning velocity based on recent skill improvements
    const recentHistory = this.skillHistory
      .filter(
        (entry) => Date.now() - entry.timestamp < 1000 * 60 * 60 * 24 * 30
      ) // Last 30 days
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentHistory.length < 2) return 0;

    const improvements = recentHistory.slice(1).map((entry, index) => {
      const previousEntry = recentHistory[index];
      return entry.level - previousEntry.level;
    });

    const averageImprovement =
      improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
    return Math.max(0, averageImprovement * 100); // Scale to percentage
  }

  private async generateRecommendationsForSkill(
    gap: SkillGap
  ): Promise<SkillRecommendation[]> {
    const skill = this.skillDefinitions.get(gap.skillId);
    if (!skill) return [];

    const recommendations: SkillRecommendation[] = [
      {
        type: "practice",
        title: `Practice ${skill.name}`,
        description: `Focus on improving ${skill.name} through targeted practice`,
        difficulty: skill.difficulty,
        estimatedTime: Math.min(60, gap.estimatedPracticeTime),
        priority: gap.priority === "critical" ? "high" : "medium",
        targetSkills: [gap.skillId],
        resources: [`exercises/${skill.id}`, `tutorials/${skill.category}`],
      },
    ];

    // Add exercise-specific recommendations based on skill type and category
    if (skill.category === SkillCategory.TECHNICAL) {
      recommendations.push({
        type: "exercise",
        title: `Technical Drills for ${skill.name}`,
        description: `Focused technical exercises to build muscle memory for ${skill.instrument}`,
        difficulty: skill.difficulty,
        estimatedTime: 30,
        priority: "medium",
        targetSkills: [gap.skillId],
        resources: [
          `drills/${skill.instrument}`,
          `technique/${skill.category}`,
        ],
      });
    }

    return recommendations;
  }

  private trimSkillHistory(): void {
    const maxEntries = this.config.maxSkillHistory || 100;
    if (this.skillHistory.length > maxEntries) {
      this.skillHistory = this.skillHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxEntries);
    }
  }
}

export default SkillTracker;
