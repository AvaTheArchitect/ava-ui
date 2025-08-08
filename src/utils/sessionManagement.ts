// 📊 SESSION MANAGEMENT UTILITIES - Recording, Export & Progress Tracking
// File: maestro-modules/utils/sessionManagement.ts

import { PitchData } from "../hooks/audio/usePitchAnalyzer";
import { VocalAnalysisData } from "../hooks/vocal/useVocalAnalyzer";
import { GuitarAnalysisData } from "../hooks/guitar/useGuitarAnalyzer";

// 🎯 Session Data Interfaces
export interface SessionMetadata {
  id: string;
  title: string;
  description?: string;
  type: "vocal" | "guitar" | "mixed";
  created: number; // Timestamp
  duration: number; // Seconds
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  goals: string[]; // Practice goals
  notes: string; // User notes
}

export interface SessionData {
  metadata: SessionMetadata;
  pitchData: PitchData[];
  vocalData?: VocalAnalysisData[];
  guitarData?: GuitarAnalysisData[];
  events: SessionEvent[];
  statistics: SessionStatistics;
  milestones: SessionMilestone[];
  feedback: SessionFeedback;
}

export interface SessionEvent {
  timestamp: number;
  type:
    | "start"
    | "stop"
    | "pause"
    | "resume"
    | "milestone"
    | "feedback"
    | "note"
    | "exercise"
    | "error";
  data: any;
  severity?: "info" | "warning" | "error" | "success";
  message?: string;
}

export interface SessionStatistics {
  totalNotes: number;
  accuracyPercentage: number;
  averagePitch: number;
  pitchRange: { min: number; max: number };
  timeInTune: number; // Percentage
  improvements: {
    accuracy: number; // Change from start to end
    consistency: number; // Pitch stability improvement
    range: number; // Range expansion
  };
  exercises: {
    completed: number;
    attempted: number;
    averageScore: number;
  };
  achievements: string[]; // Unlocked achievements
}

export interface SessionMilestone {
  timestamp: number;
  type: "accuracy" | "range" | "duration" | "consistency" | "custom";
  description: string;
  value: number;
  previous?: number;
  isPersonalBest: boolean;
}

export interface SessionFeedback {
  overall: {
    score: number; // 0-100
    grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";
    summary: string;
  };
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface ProgressData {
  userId?: string;
  sessions: SessionData[];
  statistics: {
    totalSessions: number;
    totalPracticeTime: number;
    averageAccuracy: number;
    improvementRate: number;
    currentStreak: number;
    longestStreak: number;
    achievements: Achievement[];
  };
  goals: PracticeGoal[];
  preferences: UserPreferences;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  category: "accuracy" | "practice" | "improvement" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface PracticeGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string; // 'sessions', 'minutes', 'accuracy%', etc.
  deadline?: number; // Timestamp
  completed: boolean;
  reward?: string;
}

export interface UserPreferences {
  autoSave: boolean;
  recordAudio: boolean;
  realTimeFeedback: boolean;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  practiceReminders: boolean;
  accessibilityMode: boolean;
  colorScheme: "light" | "dark" | "auto";
  language: string;
}

// 🎯 Export/Import Formats
export interface ExportOptions {
  format: "json" | "csv" | "midi" | "wav" | "pdf";
  includeAudio: boolean;
  includeAnalysis: boolean;
  dateRange?: { start: number; end: number };
  sessionTypes?: string[];
  compression: boolean;
}

export interface ImportResult {
  success: boolean;
  sessionsImported: number;
  errors: string[];
  warnings: string[];
}

// 🎯 Session Manager Class
export class SessionManager {
  private currentSession: SessionData | null = null;
  private sessionStartTime: number = 0;
  private events: SessionEvent[] = [];
  private pitchBuffer: PitchData[] = [];
  private autoSaveInterval: NodeJS.Timeout | null = null;

  // 🎵 Start new session
  startSession(metadata: Partial<SessionMetadata>): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    this.currentSession = {
      metadata: {
        id: sessionId,
        title: metadata.title || `Session ${new Date().toLocaleDateString()}`,
        description: metadata.description || "",
        type: metadata.type || "vocal",
        created: now,
        duration: 0,
        tags: metadata.tags || [],
        difficulty: metadata.difficulty || "intermediate",
        goals: metadata.goals || [],
        notes: metadata.notes || "",
      },
      pitchData: [],
      vocalData: [],
      guitarData: [],
      events: [],
      statistics: this.initializeStatistics(),
      milestones: [],
      feedback: this.initializeFeedback(),
    };

    this.sessionStartTime = now;
    this.events = [];
    this.pitchBuffer = [];

    this.addEvent("start", { sessionId }, "info", "Session started");

    // Start auto-save
    this.startAutoSave();

    return sessionId;
  }

  // 🎵 End current session
  endSession(): SessionData | null {
    if (!this.currentSession) return null;

    const now = Date.now();
    const duration = (now - this.sessionStartTime) / 1000;

    // Update session metadata
    this.currentSession.metadata.duration = duration;
    this.currentSession.events = [...this.events];
    this.currentSession.pitchData = [...this.pitchBuffer];

    // Calculate final statistics
    this.currentSession.statistics = this.calculateStatistics();

    // Generate feedback
    this.currentSession.feedback = this.generateFeedback();

    // Check for milestones and achievements
    this.checkMilestones();

    this.addEvent(
      "stop",
      { duration },
      "info",
      `Session ended. Duration: ${this.formatDuration(duration)}`
    );

    // Stop auto-save
    this.stopAutoSave();

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    return completedSession;
  }

  // 🎵 Add data to current session
  addPitchData(pitchData: PitchData): void {
    if (!this.currentSession) return;

    this.pitchBuffer.push(pitchData);

    // Keep buffer size manageable (last 1000 samples)
    if (this.pitchBuffer.length > 1000) {
      this.pitchBuffer = this.pitchBuffer.slice(-1000);
    }

    // Real-time milestone checking
    this.checkRealtimeMilestones(pitchData);
  }

  // 🎵 Add vocal analysis data
  addVocalData(vocalData: VocalAnalysisData): void {
    if (
      !this.currentSession ||
      (this.currentSession.metadata.type !== "vocal" &&
        this.currentSession.metadata.type !== "mixed")
    )
      return;

    this.currentSession.vocalData = this.currentSession.vocalData || [];
    this.currentSession.vocalData.push(vocalData);
  }

  // 🎵 Add guitar analysis data
  addGuitarData(guitarData: GuitarAnalysisData): void {
    if (
      !this.currentSession ||
      (this.currentSession.metadata.type !== "guitar" &&
        this.currentSession.metadata.type !== "mixed")
    )
      return;

    this.currentSession.guitarData = this.currentSession.guitarData || [];
    this.currentSession.guitarData.push(guitarData);
  }

  // 🎵 Add event
  addEvent(
    type: SessionEvent["type"],
    data: any,
    severity: SessionEvent["severity"] = "info",
    message?: string
  ): void {
    const event: SessionEvent = {
      timestamp: Date.now(),
      type,
      data,
      severity,
      message,
    };

    this.events.push(event);

    // Limit events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  // 🎵 Get current session info
  getCurrentSessionInfo(): {
    id: string;
    duration: number;
    events: number;
  } | null {
    if (!this.currentSession) return null;

    return {
      id: this.currentSession.metadata.id,
      duration: (Date.now() - this.sessionStartTime) / 1000,
      events: this.events.length,
    };
  }

  // 🎯 Private helper methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeStatistics(): SessionStatistics {
    return {
      totalNotes: 0,
      accuracyPercentage: 0,
      averagePitch: 0,
      pitchRange: { min: 0, max: 0 },
      timeInTune: 0,
      improvements: {
        accuracy: 0,
        consistency: 0,
        range: 0,
      },
      exercises: {
        completed: 0,
        attempted: 0,
        averageScore: 0,
      },
      achievements: [],
    };
  }

  private initializeFeedback(): SessionFeedback {
    return {
      overall: {
        score: 0,
        grade: "F",
        summary: "",
      },
      strengths: [],
      improvements: [],
      recommendations: [],
      nextSteps: [],
    };
  }

  private calculateStatistics(): SessionStatistics {
    if (this.pitchBuffer.length === 0) return this.initializeStatistics();

    const pitches = this.pitchBuffer.map((p) => p.frequency);
    const cents = this.pitchBuffer.map((p) => Math.abs(p.cents));

    const totalNotes = this.pitchBuffer.length;
    const accurateNotes = cents.filter((c) => c <= 20).length;
    const accuracyPercentage = (accurateNotes / totalNotes) * 100;
    const averagePitch =
      pitches.reduce((sum, p) => sum + p, 0) / pitches.length;
    const pitchRange = { min: Math.min(...pitches), max: Math.max(...pitches) };
    const timeInTune = (accurateNotes / totalNotes) * 100;

    // Calculate improvements
    const firstHalf = this.pitchBuffer.slice(0, Math.floor(totalNotes / 2));
    const secondHalf = this.pitchBuffer.slice(Math.floor(totalNotes / 2));

    const firstAccuracy = this.calculateAccuracy(firstHalf);
    const secondAccuracy = this.calculateAccuracy(secondHalf);
    const accuracyImprovement = secondAccuracy - firstAccuracy;

    const firstConsistency = this.calculateConsistency(firstHalf);
    const secondConsistency = this.calculateConsistency(secondHalf);
    const consistencyImprovement = secondConsistency - firstConsistency;

    return {
      totalNotes,
      accuracyPercentage,
      averagePitch,
      pitchRange,
      timeInTune,
      improvements: {
        accuracy: accuracyImprovement,
        consistency: consistencyImprovement,
        range: pitchRange.max - pitchRange.min,
      },
      exercises: {
        completed: 0, // Would be tracked separately
        attempted: 0,
        averageScore: accuracyPercentage,
      },
      achievements: [], // Would be populated by achievement system
    };
  }

  private calculateAccuracy(pitchData: PitchData[]): number {
    if (pitchData.length === 0) return 0;
    const accurate = pitchData.filter((p) => Math.abs(p.cents) <= 20).length;
    return (accurate / pitchData.length) * 100;
  }

  private calculateConsistency(pitchData: PitchData[]): number {
    if (pitchData.length < 2) return 0;

    const frequencies = pitchData.map((p) => p.frequency);
    const avgFreq =
      frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const variance =
      frequencies.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) /
      frequencies.length;

    return Math.max(0, 100 - Math.sqrt(variance));
  }

  private generateFeedback(): SessionFeedback {
    if (!this.currentSession || this.pitchBuffer.length === 0) {
      return this.initializeFeedback();
    }

    const stats = this.calculateStatistics();
    const score = stats.accuracyPercentage;

    let grade: SessionFeedback["overall"]["grade"] = "F";
    if (score >= 97) grade = "A+";
    else if (score >= 93) grade = "A";
    else if (score >= 90) grade = "B+";
    else if (score >= 87) grade = "B";
    else if (score >= 83) grade = "C+";
    else if (score >= 80) grade = "C";
    else if (score >= 70) grade = "D";

    const strengths = [];
    const improvements = [];
    const recommendations = [];
    const nextSteps = [];

    // Analyze performance
    if (stats.accuracyPercentage > 90) {
      strengths.push("Excellent pitch accuracy");
    } else if (stats.accuracyPercentage > 75) {
      strengths.push("Good pitch control");
    } else {
      improvements.push("Work on pitch accuracy");
      recommendations.push("Practice with a tuner for better pitch awareness");
    }

    if (stats.improvements.accuracy > 5) {
      strengths.push("Significant improvement during session");
    } else if (stats.improvements.accuracy < -5) {
      improvements.push("Maintain focus throughout practice");
      recommendations.push("Take breaks to avoid fatigue");
    }

    if (stats.timeInTune > 80) {
      strengths.push("Consistent intonation");
    } else {
      improvements.push("Work on maintaining pitch stability");
      recommendations.push("Practice sustained notes exercises");
    }

    // Generate next steps
    if (score < 70) {
      nextSteps.push("Focus on basic pitch matching exercises");
      nextSteps.push("Practice scales slowly with attention to intonation");
    } else if (score < 85) {
      nextSteps.push("Work on challenging intervals");
      nextSteps.push("Practice sight-singing or ear training");
    } else {
      nextSteps.push("Explore advanced techniques");
      nextSteps.push("Work on musical expression and dynamics");
    }

    return {
      overall: {
        score,
        grade,
        summary: this.generateSummary(score, stats),
      },
      strengths,
      improvements,
      recommendations,
      nextSteps,
    };
  }

  private generateSummary(score: number, stats: SessionStatistics): string {
    const duration = this.formatDuration(
      this.currentSession?.metadata.duration || 0
    );

    if (score >= 90) {
      return `Outstanding session! ${score.toFixed(
        1
      )}% accuracy over ${duration}. Your pitch control is excellent.`;
    } else if (score >= 80) {
      return `Great work! ${score.toFixed(
        1
      )}% accuracy over ${duration}. You're showing solid progress.`;
    } else if (score >= 70) {
      return `Good effort! ${score.toFixed(
        1
      )}% accuracy over ${duration}. Keep practicing to improve consistency.`;
    } else {
      return `Keep practicing! ${score.toFixed(
        1
      )}% accuracy over ${duration}. Focus on the fundamentals.`;
    }
  }

  private checkMilestones(): void {
    if (!this.currentSession) return;

    const stats = this.calculateStatistics();

    // Check accuracy milestones
    if (stats.accuracyPercentage >= 95) {
      this.addMilestone(
        "accuracy",
        "Achieved 95%+ accuracy",
        stats.accuracyPercentage
      );
    } else if (stats.accuracyPercentage >= 90) {
      this.addMilestone(
        "accuracy",
        "Achieved 90%+ accuracy",
        stats.accuracyPercentage
      );
    } else if (stats.accuracyPercentage >= 80) {
      this.addMilestone(
        "accuracy",
        "Achieved 80%+ accuracy",
        stats.accuracyPercentage
      );
    }

    // Check duration milestones
    const duration = this.currentSession.metadata.duration;
    if (duration >= 3600) {
      // 1 hour
      this.addMilestone("duration", "Practiced for 1+ hour", duration);
    } else if (duration >= 1800) {
      // 30 minutes
      this.addMilestone("duration", "Practiced for 30+ minutes", duration);
    }

    // Check range milestones
    const range = stats.pitchRange.max - stats.pitchRange.min;
    if (range >= 1200) {
      // 1 octave
      this.addMilestone("range", "Covered 1+ octave range", range);
    }
  }

  private checkRealtimeMilestones(pitchData: PitchData): void {
    // Check for perfect pitch streaks
    if (Math.abs(pitchData.cents) <= 5) {
      // Would implement streak tracking here
    }
  }

  private addMilestone(
    type: SessionMilestone["type"],
    description: string,
    value: number,
    previous?: number
  ): void {
    if (!this.currentSession) return;

    const milestone: SessionMilestone = {
      timestamp: Date.now(),
      type,
      description,
      value,
      previous,
      isPersonalBest: false, // Would check against historical data
    };

    this.currentSession.milestones.push(milestone);
    this.addEvent("milestone", milestone, "success", description);
  }

  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.currentSession) {
        this.saveSessionData(this.currentSession);
      }
    }, 30000); // Auto-save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  private saveSessionData(session: SessionData): void {
    try {
      const sessionKey = `maestro_session_${session.metadata.id}`;
      localStorage.setItem(sessionKey, JSON.stringify(session));
    } catch (error) {
      console.warn("Failed to auto-save session:", error);
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// 🎯 Progress Tracker Class
export class ProgressTracker {
  private progressData: ProgressData;

  constructor() {
    this.progressData = this.loadProgress();
  }

  // 🎵 Add completed session
  addSession(session: SessionData): void {
    this.progressData.sessions.push(session);
    this.updateStatistics();
    this.checkGoals();
    this.checkAchievements(session);
    this.saveProgress();
  }

  // 🎵 Get progress summary
  getProgressSummary(): {
    totalSessions: number;
    totalTime: string;
    averageAccuracy: number;
    recentTrend: "improving" | "declining" | "stable";
    nextGoal?: PracticeGoal;
  } {
    const stats = this.progressData.statistics;
    const recentSessions = this.progressData.sessions.slice(-10);

    let trend: "improving" | "declining" | "stable" = "stable";
    if (recentSessions.length >= 5) {
      const firstHalf = recentSessions.slice(
        0,
        Math.floor(recentSessions.length / 2)
      );
      const secondHalf = recentSessions.slice(
        Math.floor(recentSessions.length / 2)
      );

      const firstAvg =
        firstHalf.reduce((sum, s) => sum + s.statistics.accuracyPercentage, 0) /
        firstHalf.length;
      const secondAvg =
        secondHalf.reduce(
          (sum, s) => sum + s.statistics.accuracyPercentage,
          0
        ) / secondHalf.length;

      if (secondAvg > firstAvg + 2) trend = "improving";
      else if (secondAvg < firstAvg - 2) trend = "declining";
    }

    const nextGoal = this.progressData.goals.find((g) => !g.completed);

    return {
      totalSessions: stats.totalSessions,
      totalTime: this.formatTime(stats.totalPracticeTime),
      averageAccuracy: stats.averageAccuracy,
      recentTrend: trend,
      nextGoal,
    };
  }

  // 🎵 Get achievements
  getAchievements(): Achievement[] {
    return this.progressData.statistics.achievements;
  }

  // 🎵 Set practice goal
  addGoal(goal: Omit<PracticeGoal, "id" | "current" | "completed">): void {
    const newGoal: PracticeGoal = {
      ...goal,
      id: this.generateGoalId(),
      current: 0,
      completed: false,
    };

    this.progressData.goals.push(newGoal);
    this.saveProgress();
  }

  // 🎯 Private methods
  private loadProgress(): ProgressData {
    try {
      const saved = localStorage.getItem("maestro_progress");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn("Failed to load progress data:", error);
    }

    return this.createDefaultProgress();
  }

  private createDefaultProgress(): ProgressData {
    return {
      sessions: [],
      statistics: {
        totalSessions: 0,
        totalPracticeTime: 0,
        averageAccuracy: 0,
        improvementRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        achievements: [],
      },
      goals: [],
      preferences: {
        autoSave: true,
        recordAudio: false,
        realTimeFeedback: true,
        difficultyLevel: "intermediate",
        practiceReminders: true,
        accessibilityMode: false,
        colorScheme: "auto",
        language: "en",
      },
    };
  }

  private updateStatistics(): void {
    const sessions = this.progressData.sessions;
    const stats = this.progressData.statistics;

    stats.totalSessions = sessions.length;
    stats.totalPracticeTime = sessions.reduce(
      (sum, s) => sum + s.metadata.duration,
      0
    );
    stats.averageAccuracy =
      sessions.length > 0
        ? sessions.reduce(
            (sum, s) => sum + s.statistics.accuracyPercentage,
            0
          ) / sessions.length
        : 0;

    // Calculate improvement rate (last 10 sessions vs previous 10)
    if (sessions.length >= 20) {
      const recent = sessions.slice(-10);
      const previous = sessions.slice(-20, -10);

      const recentAvg =
        recent.reduce((sum, s) => sum + s.statistics.accuracyPercentage, 0) /
        recent.length;
      const previousAvg =
        previous.reduce((sum, s) => sum + s.statistics.accuracyPercentage, 0) /
        previous.length;

      stats.improvementRate = recentAvg - previousAvg;
    }

    // Update streaks
    this.updateStreaks();
  }

  private updateStreaks(): void {
    const sessions = this.progressData.sessions;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Check sessions from most recent
    for (let i = sessions.length - 1; i >= 0; i--) {
      const sessionDate = new Date(sessions[i].metadata.created);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === currentStreak) {
        currentStreak++;
        tempStreak++;
      } else if (daysDiff === currentStreak + 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
        if (i === sessions.length - 1) currentStreak = 0;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    this.progressData.statistics.currentStreak = currentStreak;
    this.progressData.statistics.longestStreak = Math.max(
      longestStreak,
      this.progressData.statistics.longestStreak
    );
  }

  private checkGoals(): void {
    this.progressData.goals.forEach((goal) => {
      if (goal.completed) return;

      switch (goal.unit) {
        case "sessions":
          goal.current = this.progressData.statistics.totalSessions;
          break;
        case "minutes":
          goal.current = Math.floor(
            this.progressData.statistics.totalPracticeTime / 60
          );
          break;
        case "accuracy%":
          goal.current = this.progressData.statistics.averageAccuracy;
          break;
      }

      if (goal.current >= goal.target) {
        goal.completed = true;
        this.unlockAchievement({
          id: `goal_${goal.id}`,
          name: `Goal Achieved: ${goal.title}`,
          description: goal.description,
          icon: "🎯",
          category: "practice",
          rarity: "common",
        });
      }
    });
  }

  private checkAchievements(session: SessionData): void {
    const stats = session.statistics;

    // Perfect accuracy achievements
    if (stats.accuracyPercentage >= 100) {
      this.unlockAchievement({
        id: "perfect_accuracy",
        name: "Perfect Pitch",
        description: "Achieved 100% accuracy in a session",
        icon: "🎯",
        category: "accuracy",
        rarity: "epic",
      });
    } else if (stats.accuracyPercentage >= 95) {
      this.unlockAchievement({
        id: "excellent_accuracy",
        name: "Excellent Precision",
        description: "Achieved 95%+ accuracy",
        icon: "🎼",
        category: "accuracy",
        rarity: "rare",
      });
    }

    // Practice duration achievements
    if (session.metadata.duration >= 3600) {
      this.unlockAchievement({
        id: "marathon_practice",
        name: "Marathon Musician",
        description: "Practiced for over 1 hour",
        icon: "⏰",
        category: "practice",
        rarity: "rare",
      });
    }

    // Streak achievements
    if (this.progressData.statistics.currentStreak >= 7) {
      this.unlockAchievement({
        id: "week_streak",
        name: "Weekly Warrior",
        description: "Practiced 7 days in a row",
        icon: "🔥",
        category: "practice",
        rarity: "rare",
      });
    }

    if (this.progressData.statistics.currentStreak >= 30) {
      this.unlockAchievement({
        id: "month_streak",
        name: "Monthly Master",
        description: "Practiced 30 days in a row",
        icon: "🏆",
        category: "practice",
        rarity: "legendary",
      });
    }
  }

  private unlockAchievement(
    achievement: Omit<Achievement, "unlockedAt">
  ): void {
    const existing = this.progressData.statistics.achievements.find(
      (a) => a.id === achievement.id
    );
    if (existing) return; // Already unlocked

    const newAchievement: Achievement = {
      ...achievement,
      unlockedAt: Date.now(),
    };

    this.progressData.statistics.achievements.push(newAchievement);
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(
        "maestro_progress",
        JSON.stringify(this.progressData)
      );
    } catch (error) {
      console.warn("Failed to save progress data:", error);
    }
  }

  private generateGoalId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// 🎯 Data Export/Import Utilities
export class DataExporter {
  // 🎵 Export sessions to various formats
  static async exportSessions(
    sessions: SessionData[],
    options: ExportOptions
  ): Promise<Blob> {
    switch (options.format) {
      case "json":
        return this.exportToJSON(sessions, options);
      case "csv":
        return this.exportToCSV(sessions, options);
      case "midi":
        return this.exportToMIDI(sessions, options);
      case "pdf":
        return this.exportToPDF(sessions, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private static exportToJSON(
    sessions: SessionData[],
    options: ExportOptions
  ): Blob {
    const filteredSessions = this.filterSessions(sessions, options);
    const exportData = {
      exportDate: new Date().toISOString(),
      options,
      sessions: filteredSessions.map((session) => {
        const exported = { ...session };

        if (!options.includeAnalysis) {
          delete (exported as any).vocalData;
          delete (exported as any).guitarData;
          delete (exported as any).events;
        }

        return exported;
      }),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  }

  private static exportToCSV(
    sessions: SessionData[],
    options: ExportOptions
  ): Blob {
    const filteredSessions = this.filterSessions(sessions, options);

    const headers = [
      "Session ID",
      "Title",
      "Type",
      "Date",
      "Duration (min)",
      "Total Notes",
      "Accuracy %",
      "Average Pitch",
      "Pitch Range",
      "Time in Tune %",
      "Improvements",
    ];

    const rows = filteredSessions.map((session) => [
      session.metadata.id,
      session.metadata.title,
      session.metadata.type,
      new Date(session.metadata.created).toISOString(),
      Math.round(session.metadata.duration / 60),
      session.statistics.totalNotes,
      session.statistics.accuracyPercentage.toFixed(2),
      session.statistics.averagePitch.toFixed(2),
      `${session.statistics.pitchRange.min.toFixed(
        1
      )}-${session.statistics.pitchRange.max.toFixed(1)}`,
      session.statistics.timeInTune.toFixed(2),
      session.statistics.improvements.accuracy.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    return new Blob([csvContent], { type: "text/csv" });
  }

  private static exportToMIDI(
    sessions: SessionData[],
    options: ExportOptions
  ): Blob {
    // Simplified MIDI export - would implement proper MIDI file creation
    const midiData = new Uint8Array([
      0x4d,
      0x54,
      0x68,
      0x64, // MThd header
      0x00,
      0x00,
      0x00,
      0x06, // Header length
      0x00,
      0x00, // Format type 0
      0x00,
      0x01, // Number of tracks
      0x01,
      0xe0, // Ticks per quarter note
    ]);

    return new Blob([midiData], { type: "audio/midi" });
  }

  private static exportToPDF(
    sessions: SessionData[],
    options: ExportOptions
  ): Blob {
    // Simplified PDF generation - would use a proper PDF library
    const pdfContent = `
      %PDF-1.4
      1 0 obj
      <<
      /Type /Catalog
      /Pages 2 0 R
      >>
      endobj
      
      2 0 obj
      <<
      /Type /Pages
      /Kids [3 0 R]
      /Count 1
      >>
      endobj
      
      3 0 obj
      <<
      /Type /Page
      /Parent 2 0 R
      /MediaBox [0 0 612 792]
      >>
      endobj
      
      xref
      0 4
      0000000000 65535 f 
      0000000009 00000 n 
      0000000074 00000 n 
      0000000120 00000 n 
      trailer
      <<
      /Size 4
      /Root 1 0 R
      >>
      startxref
      178
      %%EOF
    `;

    return new Blob([pdfContent], { type: "application/pdf" });
  }

  private static filterSessions(
    sessions: SessionData[],
    options: ExportOptions
  ): SessionData[] {
    let filtered = [...sessions];

    if (options.dateRange) {
      filtered = filtered.filter(
        (session) =>
          session.metadata.created >= options.dateRange!.start &&
          session.metadata.created <= options.dateRange!.end
      );
    }

    if (options.sessionTypes && options.sessionTypes.length > 0) {
      filtered = filtered.filter((session) =>
        options.sessionTypes!.includes(session.metadata.type)
      );
    }

    return filtered;
  }

  // 🎵 Import sessions from JSON
  static async importSessions(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const result: ImportResult = {
        success: true,
        sessionsImported: 0,
        errors: [],
        warnings: [],
      };

      if (data.sessions && Array.isArray(data.sessions)) {
        result.sessionsImported = data.sessions.length;

        // Validate sessions
        data.sessions.forEach((session: any, index: number) => {
          if (!this.validateSession(session)) {
            result.warnings.push(`Session ${index + 1} has invalid structure`);
          }
        });
      } else {
        result.errors.push("Invalid file format - no sessions array found");
        result.success = false;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        sessionsImported: 0,
        errors: [
          `Failed to parse file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ],
        warnings: [],
      };
    }
  }

  private static validateSession(session: any): boolean {
    return (
      session &&
      session.metadata &&
      typeof session.metadata.id === "string" &&
      typeof session.metadata.title === "string" &&
      typeof session.metadata.created === "number" &&
      Array.isArray(session.pitchData)
    );
  }
}

// 🎯 Export all classes and utilities
export default {
  SessionManager,
  ProgressTracker,
  DataExporter,
};
