/**
 * PersonalizationEngine.ts - User Personalization and Adaptation
 * 👤 AI-powered personalized learning and content adaptation
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import {
  BrainModule,
  UserPreferences,
  LearningEvent,
  MusicGenre,
  ChordProgression,
  AudioFeatures,
} from "../../shared/types";

// Personalization Configuration
export interface PersonalizationConfig {
  enableBehaviorTracking?: boolean;
  enablePreferenceEvolution?: boolean;
  adaptationSensitivity?: number; // 0-1
  privacyLevel?: "minimal" | "balanced" | "comprehensive";
}

// Personalized Suggestion
export interface PersonalizedSuggestion {
  suggestionId: string;
  type: "exercise" | "song" | "technique" | "theory" | "collaboration";
  title: string;
  description: string;
  difficulty: number; // 0-1
  personalizedReason: string;
  confidence: number; // 0-1
  expectedEngagement: number; // 0-1
  estimatedTime: number; // minutes
}

// Legacy Suggestion Item for MaestroBrain compatibility
export interface SuggestionItem {
  content: string;
  priority: number;
  category: string;
}

// User Profile interface for MaestroBrain compatibility
export interface UserProfile {
  skill_level: "beginner" | "intermediate" | "advanced" | "expert";
  instruments: string[];
  practice_goals: string[];
  preferences: Record<string, unknown>;
}

// Personalization Result
export interface PersonalizationResult {
  userId: string;
  suggestions: PersonalizedSuggestion[];
  insights: string[];
  confidence: number;
  timestamp: number;
}

/**
 * PersonalizationEngine - User personalization and adaptation
 * Provides intelligent content adaptation based on user preferences and behavior
 */
export class PersonalizationEngine implements BrainModule {
  public readonly name: string = "PersonalizationEngine";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;
  private sessionId: string = generateId("personalization-session");

  // Configuration
  private config: PersonalizationConfig = {
    enableBehaviorTracking: true,
    enablePreferenceEvolution: true,
    adaptationSensitivity: 0.3,
    privacyLevel: "balanced",
  };

  // User data storage
  private userPreferences = new Map<string, UserPreferences>();
  private personalizationHistory = new Map<string, PersonalizationResult[]>();

  constructor(config?: Partial<PersonalizationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the PersonalizationEngine module
   */
  async initialize(): Promise<void> {
    try {
      console.log(`👤 Initializing PersonalizationEngine v${this.version}...`);

      // Load user preferences and history
      await this.loadPersonalizationData();

      this.initialized = true;
      console.log(`✅ PersonalizationEngine initialized successfully`);
    } catch (error) {
      console.error("❌ Failed to initialize PersonalizationEngine:", error);
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
      healthy: this.initialized,
      metrics: {
        sessionId: this.sessionId,
        usersTracked: this.userPreferences.size,
        totalSuggestions: Array.from(
          this.personalizationHistory.values()
        ).reduce((sum, history) => sum + history.length, 0),
        adaptationSensitivity: this.config.adaptationSensitivity,
        privacyLevel: this.config.privacyLevel,
      },
    };
  }

  /**
   * Generate personalized suggestions - LEGACY INTERFACE FOR COMPATIBILITY
   */
  generateSuggestions(context?: any): SuggestionItem[] {
    if (!this.initialized) {
      console.warn(
        "PersonalizationEngine not initialized, returning default suggestions"
      );
      return this.getDefaultSuggestions();
    }

    try {
      console.log("👤 Generating personalized suggestions...");

      // Convert context to userId if it's a simple context call
      const userId = context?.userId || "default-user";

      // Get or create user preferences
      let userPrefs = this.userPreferences.get(userId);
      if (!userPrefs) {
        userPrefs = this.createDefaultUserPreferences(userId);
        this.userPreferences.set(userId, userPrefs);
      }

      // Generate suggestions based on preferences and context
      const suggestions = this.generateCoreSuggestionsSync(userPrefs, context);

      // Convert to legacy format expected by MaestroBrain
      const legacySuggestions: SuggestionItem[] = suggestions.map(
        (suggestion) => ({
          content: suggestion.description,
          priority: Math.floor(suggestion.confidence * 10),
          category: suggestion.type,
        })
      );

      console.log(
        `✅ Generated ${legacySuggestions.length} personalized suggestions`
      );
      return legacySuggestions;
    } catch (error) {
      console.error("❌ Personalization generation failed:", error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Set user profile - EXPECTED BY MAESTROBRAIN
   */
  setUserProfile(userProfile: UserProfile): void {
    // Convert MaestroBrain UserProfile to our UserPreferences format
    const userPrefs: UserPreferences = {
      favoriteGenres: [], // Will be set based on preferences
      skillLevel: userProfile.skill_level,
      instruments: userProfile.instruments,
      favoriteKeys: ["C", "G", "D"], // Default keys
      practiceGoals: userProfile.practice_goals,
    };

    // Extract genre preferences if available
    if (userProfile.preferences?.genres) {
      userPrefs.favoriteGenres = Array.isArray(userProfile.preferences.genres)
        ? userProfile.preferences.genres
        : [];
    }

    this.userPreferences.set("default-user", userPrefs);
    console.log(`👤 Set user profile for default user`);
  }

  /**
   * Generate personalized suggestions for a user - NEW ASYNC INTERFACE
   */
  async generatePersonalizedSuggestions(
    userId: string,
    context?: any
  ): Promise<PersonalizationResult> {
    if (!this.initialized) {
      throw new Error("PersonalizationEngine not initialized");
    }

    try {
      console.log("👤 Generating personalized suggestions...");

      // Get or create user preferences
      let userPrefs = this.userPreferences.get(userId);
      if (!userPrefs) {
        userPrefs = this.createDefaultUserPreferences(userId);
        this.userPreferences.set(userId, userPrefs);
      }

      // Generate suggestions based on preferences
      const suggestions = await this.generateCoreSuggestions(
        userPrefs,
        context
      );

      // Generate insights about the user
      const insights = this.generatePersonalizationInsights(userPrefs);

      const result: PersonalizationResult = {
        userId,
        suggestions,
        insights,
        confidence: this.calculatePersonalizationConfidence(userPrefs),
        timestamp: Date.now(),
      };

      // Store result in history
      this.storePersonalizationResult(userId, result);

      console.log(
        `✅ Generated ${suggestions.length} personalized suggestions`
      );
      return result;
    } catch (error) {
      console.error("❌ Personalization generation failed:", error);
      throw error;
    }
  }

  /**
   * Get default suggestions when personalization fails
   */
  private getDefaultSuggestions(): SuggestionItem[] {
    return [
      {
        content: "Practice basic chord progressions",
        priority: 5,
        category: "technique",
      },
      {
        content: "Work on rhythm and timing",
        priority: 4,
        category: "technique",
      },
      {
        content: "Learn a new song",
        priority: 3,
        category: "song",
      },
    ];
  }

  /**
   * Generate core suggestions synchronously for legacy interface
   */
  private generateCoreSuggestionsSync(
    userPrefs: UserPreferences,
    context?: any
  ): PersonalizedSuggestion[] {
    const suggestions: PersonalizedSuggestion[] = [];

    // Skill-based suggestions
    suggestions.push(...this.generateSkillBasedSuggestions(userPrefs));

    // Genre-based suggestions
    suggestions.push(...this.generateGenreBasedSuggestions(userPrefs));

    // Context-aware suggestions
    if (context) {
      suggestions.push(
        ...this.generateContextAwareSuggestions(userPrefs, context)
      );
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions for legacy interface
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): void {
    const currentPrefs =
      this.userPreferences.get(userId) ||
      this.createDefaultUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    this.userPreferences.set(userId, updatedPrefs);

    console.log(`👤 Updated preferences for user ${userId}`);
  }

  /**
   * Record learning event for personalization
   */
  recordLearningEvent(userId: string, event: LearningEvent): void {
    // Update user preferences based on learning event
    const currentPrefs = this.userPreferences.get(userId);
    if (currentPrefs) {
      // Adjust preferences based on event performance
      if (event.performance > 0.8) {
        // User performed well, might like similar content
        this.adjustPreferencesForSuccess(currentPrefs, event);
      } else if (event.performance < 0.5) {
        // User struggled, might need easier content
        this.adjustPreferencesForDifficulty(currentPrefs, event);
      }

      this.userPreferences.set(userId, currentPrefs);
    }
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): UserPreferences | undefined {
    return this.userPreferences.get(userId);
  }

  /**
   * Get personalization history
   */
  getPersonalizationHistory(userId: string): PersonalizationResult[] {
    return this.personalizationHistory.get(userId) || [];
  }

  /**
   * Private Helper Methods
   */

  private async loadPersonalizationData(): Promise<void> {
    console.log("📚 Loading personalization data...");
    // In a real implementation, this would load from storage
  }

  private createDefaultUserPreferences(userId: string): UserPreferences {
    return {
      favoriteGenres: [MusicGenre.POP, MusicGenre.ROCK],
      skillLevel: "beginner",
      instruments: ["guitar"],
      favoriteKeys: ["C", "G", "D"],
      practiceGoals: ["learn-chords", "improve-rhythm"],
    };
  }

  private async generateCoreSuggestions(
    userPrefs: UserPreferences,
    context?: any
  ): Promise<PersonalizedSuggestion[]> {
    const suggestions: PersonalizedSuggestion[] = [];

    // Skill-based suggestions
    suggestions.push(...this.generateSkillBasedSuggestions(userPrefs));

    // Genre-based suggestions
    suggestions.push(...this.generateGenreBasedSuggestions(userPrefs));

    // Goal-oriented suggestions
    suggestions.push(...this.generateGoalOrientedSuggestions(userPrefs));

    // Context-aware suggestions
    if (context) {
      suggestions.push(
        ...this.generateContextAwareSuggestions(userPrefs, context)
      );
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  private generateSkillBasedSuggestions(
    userPrefs: UserPreferences
  ): PersonalizedSuggestion[] {
    const suggestions: PersonalizedSuggestion[] = [];

    switch (userPrefs.skillLevel) {
      case "beginner":
        suggestions.push({
          suggestionId: generateId("skill-beginner"),
          type: "technique",
          title: "Basic Chord Practice",
          description:
            "Master fundamental chords that form the foundation of music",
          difficulty: 0.2,
          personalizedReason: "Perfect for your beginner skill level",
          confidence: 0.9,
          expectedEngagement: 0.8,
          estimatedTime: 20,
        });
        break;

      case "intermediate":
        suggestions.push({
          suggestionId: generateId("skill-intermediate"),
          type: "technique",
          title: "Barre Chord Transitions",
          description: "Develop smooth transitions between barre chords",
          difficulty: 0.6,
          personalizedReason:
            "Your intermediate level is ready for barre chord mastery",
          confidence: 0.85,
          expectedEngagement: 0.75,
          estimatedTime: 25,
        });
        break;

      case "advanced":
      case "expert":
        suggestions.push({
          suggestionId: generateId("skill-advanced"),
          type: "theory",
          title: "Complex Jazz Voicings",
          description:
            "Explore sophisticated jazz chord voicings and substitutions",
          difficulty: 0.85,
          personalizedReason:
            "Your advanced skills allow for complex harmonic exploration",
          confidence: 0.8,
          expectedEngagement: 0.9,
          estimatedTime: 40,
        });
        break;
    }

    return suggestions;
  }

  private generateGenreBasedSuggestions(
    userPrefs: UserPreferences
  ): PersonalizedSuggestion[] {
    const suggestions: PersonalizedSuggestion[] = [];

    userPrefs.favoriteGenres.forEach((genre) => {
      switch (genre) {
        case MusicGenre.ROCK:
          suggestions.push({
            suggestionId: generateId("genre-rock"),
            type: "song",
            title: "Classic Rock Power Chords",
            description: "Learn iconic rock power chord progressions",
            difficulty: 0.4,
            personalizedReason: `Based on your love for ${genre} music`,
            confidence: 0.8,
            expectedEngagement: 0.9,
            estimatedTime: 30,
          });
          break;

        case MusicGenre.JAZZ:
          suggestions.push({
            suggestionId: generateId("genre-jazz"),
            type: "theory",
            title: "Jazz Chord Substitutions",
            description: "Master the art of jazz chord substitutions",
            difficulty: 0.7,
            personalizedReason: `Perfect for your interest in ${genre}`,
            confidence: 0.85,
            expectedEngagement: 0.8,
            estimatedTime: 35,
          });
          break;
      }
    });

    return suggestions;
  }

  private generateGoalOrientedSuggestions(
    userPrefs: UserPreferences
  ): PersonalizedSuggestion[] {
    const suggestions: PersonalizedSuggestion[] = [];

    userPrefs.practiceGoals.forEach((goal) => {
      switch (goal) {
        case "learn-chords":
          suggestions.push({
            suggestionId: generateId("goal-chords"),
            type: "exercise",
            title: "Chord Mastery Challenge",
            description: "Systematic approach to learning all essential chords",
            difficulty: 0.5,
            personalizedReason: "Aligned with your chord learning goal",
            confidence: 0.9,
            expectedEngagement: 0.85,
            estimatedTime: 25,
          });
          break;

        case "improve-rhythm":
          suggestions.push({
            suggestionId: generateId("goal-rhythm"),
            type: "exercise",
            title: "Rhythm Pattern Workshop",
            description:
              "Master common rhythm patterns with metronome practice",
            difficulty: 0.6,
            personalizedReason: "Focused on your rhythm improvement goal",
            confidence: 0.8,
            expectedEngagement: 0.75,
            estimatedTime: 20,
          });
          break;
      }
    });

    return suggestions;
  }

  private generateContextAwareSuggestions(
    userPrefs: UserPreferences,
    context: any
  ): PersonalizedSuggestion[] {
    const suggestions: PersonalizedSuggestion[] = [];

    // Time-based suggestions
    if (context.timeOfDay === "morning") {
      suggestions.push({
        suggestionId: generateId("context-morning"),
        type: "exercise",
        title: "Morning Warm-Up Routine",
        description: "Gentle practice to start your day with music",
        difficulty: 0.3,
        personalizedReason: "Optimized for morning practice sessions",
        confidence: 0.7,
        expectedEngagement: 0.8,
        estimatedTime: 15,
      });
    }

    return suggestions;
  }

  private generatePersonalizationInsights(
    userPrefs: UserPreferences
  ): string[] {
    const insights: string[] = [];

    // Skill progression insights
    if (userPrefs.skillLevel === "beginner") {
      insights.push(
        "Focus on fundamental techniques will accelerate your progress"
      );
    } else if (userPrefs.skillLevel === "intermediate") {
      insights.push("You're ready to explore more complex musical concepts");
    }

    // Genre insights
    if (userPrefs.favoriteGenres.includes(MusicGenre.JAZZ)) {
      insights.push("Your jazz interest suggests you enjoy complex harmonies");
    }

    // Goal insights
    if (userPrefs.practiceGoals.includes("learn-chords")) {
      insights.push("Chord mastery will unlock many new songs for you");
    }

    return insights;
  }

  private calculatePersonalizationConfidence(
    userPrefs: UserPreferences
  ): number {
    // Calculate confidence based on available preference data
    let confidence = 0.5; // Base confidence

    if (userPrefs.favoriteGenres.length > 0) confidence += 0.2;
    if (userPrefs.instruments.length > 0) confidence += 0.1;
    if (userPrefs.practiceGoals.length > 0) confidence += 0.2;

    return Math.min(0.95, confidence);
  }

  private adjustPreferencesForSuccess(
    prefs: UserPreferences,
    event: LearningEvent
  ): void {
    // User performed well, they might enjoy similar complexity
    if (
      event.skill === "chord-transitions" &&
      !prefs.practiceGoals.includes("learn-chords")
    ) {
      prefs.practiceGoals.push("learn-chords");
    }
  }

  private adjustPreferencesForDifficulty(
    prefs: UserPreferences,
    event: LearningEvent
  ): void {
    // User struggled, might need to focus on fundamentals
    if (event.performance < 0.5 && prefs.skillLevel !== "beginner") {
      // Could suggest more foundational work
    }
  }

  private storePersonalizationResult(
    userId: string,
    result: PersonalizationResult
  ): void {
    const history = this.personalizationHistory.get(userId) || [];
    history.push(result);

    // Keep only last 10 results per user
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    this.personalizationHistory.set(userId, history);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PersonalizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("⚙️ PersonalizationEngine configuration updated");
  }
}
