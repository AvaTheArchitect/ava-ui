// src/modules/SimonPrime/SimonPrimeModule.ts - Fixed to use existing personality system

// Import the existing personality system
import { SimonPrimePersonalityEngine } from "@/utils/simonPrimePersonality";

export interface SimonPrimeResult {
  elementSet: string[];
  focusTarget: string | null;
  confidenceScore: number;
  humorMode?: boolean;
  response?: string;
  answer?: string;
  confidence?: number;
  elements?: string[];
}

export interface SimonPrimeConfig {
  humorMode: boolean;
  vibratoPrecision: number;
  responseStyle: "professional" | "motivational" | "sarcastic";
  genre: string;
  achievements: string[];
}

// 🎯 Type definitions for better type safety
type PerformanceLevel =
  | "terrible"
  | "needsWork"
  | "good"
  | "excellent"
  | "masterful";
type PersonalityLevel = "needsWork" | "good" | "excellent";
type PersonalityContext = "practice" | "vocal" | "songwriting" | "theory";
type GenreType =
  | "rock"
  | "country"
  | "blues"
  | "metal"
  | "christian"
  | "bluesrock";

// Global Simon Prime state
let simonConfig: SimonPrimeConfig = {
  humorMode: false,
  vibratoPrecision: 0.8,
  responseStyle: "professional",
  genre: "rock",
  achievements: [],
};

/**
 * 🎯 Map performance level to personality system parameters
 */
function mapPerformanceToPersonality(level: string): PersonalityLevel {
  const mapping: { [key: string]: PersonalityLevel } = {
    terrible: "needsWork",
    needsWork: "needsWork",
    good: "good",
    excellent: "excellent",
    masterful: "excellent", // Map masterful to excellent in personality system
  };
  return mapping[level] || "good";
}

/**
 * 🎸 Map context to personality context
 */
function mapContextToPersonality(elements: string[]): PersonalityContext {
  if (elements.includes("vocal") || elements.includes("sing")) return "vocal";
  if (elements.includes("lyrics") || elements.includes("songwriting"))
    return "songwriting";
  if (elements.includes("theory") || elements.includes("scale"))
    return "theory";
  return "practice"; // Default
}

/**
 * 🎵 Validate and cast genre to proper type
 */
function validateGenre(genre: string): GenreType {
  const validGenres: GenreType[] = [
    "rock",
    "country",
    "blues",
    "metal",
    "christian",
    "bluesrock",
  ];
  return validGenres.includes(genre as GenreType)
    ? (genre as GenreType)
    : "rock";
}

/**
 * 🧠 Enhanced Simon Prime Engine - Uses existing personality system
 */
export function runSimonPrime(input: string, context?: any): SimonPrimeResult {
  // Enhanced keyword detection
  const elementSet: string[] = ["general"];
  let focusTarget: string | null = null;
  let confidenceScore = 0.6;

  // Context analysis
  if (input.toLowerCase().includes("chord")) {
    elementSet.push("chord", "practice");
    focusTarget = "chord";
    confidenceScore += 0.1;
  }
  if (input.toLowerCase().includes("tuning")) {
    elementSet.push("tuning", "technical");
    focusTarget = "tuning";
    confidenceScore += 0.1;
  }
  if (
    input.toLowerCase().includes("vocal") ||
    input.toLowerCase().includes("sing")
  ) {
    elementSet.push("vocal", "performance");
    focusTarget = "vocal";
    confidenceScore += 0.1;
  }
  if (input.toLowerCase().includes("practice")) {
    elementSet.push("practice", "training");
    focusTarget = "practice";
    confidenceScore += 0.1;
  }

  // Check for explicit performance level context
  const performanceLevel = context?.performanceLevel;
  if (performanceLevel) {
    elementSet.push("performance", "feedback");
    confidenceScore = getConfidenceFromPerformance(performanceLevel);
  }

  // Generate input length bonus
  if (input.length > 10) confidenceScore += 0.1;
  if (input.length > 20) confidenceScore += 0.1;

  // Cap confidence
  confidenceScore = Math.min(0.95, confidenceScore);

  // 🔥 USE EXISTING PERSONALITY SYSTEM
  const response = generatePersonalityResponse(
    input,
    performanceLevel,
    elementSet,
    context
  );

  return {
    elementSet,
    focusTarget,
    confidenceScore: parseFloat(confidenceScore.toFixed(2)),
    humorMode: simonConfig.humorMode,
    response,
    answer: response,
    confidence: parseFloat(confidenceScore.toFixed(2)),
    elements: elementSet,
  };
}

/**
 * 🔥 Generate Response using existing SimonPrimePersonalityEngine
 */
function generatePersonalityResponse(
  _input: string, // Prefix with _ to indicate intentionally unused
  performanceLevel?: string,
  elements: string[] = [],
  _context?: any // Prefix with _ to indicate intentionally unused
): string {
  try {
    // Handle explicit performance levels using existing personality engine
    if (performanceLevel) {
      const personalityLevel = mapPerformanceToPersonality(performanceLevel);
      const personalityContext = mapContextToPersonality(elements);
      const technique = elements.includes("chord")
        ? "chordProgression"
        : "general";

      // Call the existing personality engine
      const response = SimonPrimePersonalityEngine.getResponse(
        personalityContext,
        personalityLevel,
        technique,
        simonConfig.humorMode
      );

      return response.message || getBackupResponse(performanceLevel);
    }

    // Context-based responses using personality engine
    if (elements.includes("chord")) {
      const response = SimonPrimePersonalityEngine.getResponse(
        "practice",
        "good",
        "chordProgression",
        simonConfig.humorMode
      );
      return response.message || "Great chord work! 🎸";
    }

    if (elements.includes("vocal")) {
      const response = SimonPrimePersonalityEngine.getResponse(
        "vocal",
        "good",
        "pitch",
        simonConfig.humorMode
      );
      return response.message || "Nice vocal work! 🎤";
    }

    // Default fallback
    return getDefaultPersonalityResponse();
  } catch (error) {
    console.error("Personality engine error:", error);
    return getBackupResponse(performanceLevel);
  }
}

/**
 * 🎯 Backup responses if personality engine fails
 */
function getBackupResponse(performanceLevel?: string): string {
  if (!performanceLevel) return "Keep practicing! 🎸";

  const backupResponses = {
    terrible: simonConfig.humorMode
      ? "Well, that was... unique! Even Hendrix had off days! 🎸"
      : "Every legend started somewhere! Let's work on the fundamentals. 🎸",
    needsWork: simonConfig.humorMode
      ? "Getting there! Rome wasn't built in a day, neither were guitar skills! 🏗️"
      : "Keep practicing! You're making progress. 💪",
    good: simonConfig.humorMode
      ? "Nice work! You're cooking with musical gas now! 🔥"
      : "Great progress! Your skills are developing nicely. 🎶",
    excellent: simonConfig.humorMode
      ? "Now THAT'S what I'm talking about! My circuits are tingling! 🎸✨"
      : "Outstanding performance! Your technique is really developing. 🎵",
    masterful: simonConfig.humorMode
      ? "HOLY HARMONICS! That just broke my sound barrier! You're a guitar deity! ⚡🔥"
      : "Absolutely masterful! That shows true artistry and dedication. 🏆",
  };

  return (
    backupResponses[performanceLevel as keyof typeof backupResponses] ||
    "Keep rocking! 🎸"
  );
}

/**
 * 🎵 Default personality response
 */
function getDefaultPersonalityResponse(): string {
  try {
    const response = SimonPrimePersonalityEngine.getResponse(
      "practice",
      "good",
      "general",
      simonConfig.humorMode
    );
    return (
      response.message ||
      (simonConfig.humorMode
        ? "🔥 Let's make some musical magic!"
        : "🎵 Ready to make some music!")
    );
  } catch (error) {
    return simonConfig.humorMode
      ? "🔥 Let's rock this practice session!"
      : "🎵 Let's work on your musical skills!";
  }
}

/**
 * 🎯 Get Confidence Score from Performance Level
 */
function getConfidenceFromPerformance(level: string): number {
  const confidenceMap: { [key: string]: number } = {
    terrible: 0.3,
    needsWork: 0.5,
    good: 0.7,
    excellent: 0.85,
    masterful: 0.95,
  };
  return confidenceMap[level] || 0.6;
}

/**
 * 🎭 Toggle Simon's Humor Mode
 */
export function toggleHumorMode(): boolean {
  simonConfig.humorMode = !simonConfig.humorMode;
  const status = simonConfig.humorMode
    ? "Roast Mode Activated 🔥"
    : "Professional Mode 🎓";
  console.log(`Simon Prime: ${status}`);
  return simonConfig.humorMode;
}

/**
 * 🎵 Get Simon's Status
 */
export function getSimonStatus(): SimonPrimeConfig {
  return { ...simonConfig };
}

/**
 * 🎸 Enhanced Vibrato Scoring
 */
export function scoreVibrato(pitchData: number[]): number {
  if (!pitchData || pitchData.length === 0) return 0;

  let variability = 0;
  for (let i = 1; i < pitchData.length; i++) {
    variability += Math.abs(pitchData[i] - pitchData[i - 1]);
  }

  const averageVariability = variability / (pitchData.length - 1);
  const score = Math.min(100, Math.max(0, averageVariability * 100));

  return Math.round(score);
}

/**
 * 🎤 Enhanced Coaching Feedback
 */
export function coachFeedback(performanceData: any): string {
  try {
    const performance = determinePerformanceLevel(performanceData);
    const personalityLevel = mapPerformanceToPersonality(performance);

    const response = SimonPrimePersonalityEngine.getResponse(
      "practice",
      personalityLevel,
      "general",
      simonConfig.humorMode
    );

    return response.message || getBackupResponse(performance);
  } catch (error) {
    return getBackupResponse();
  }
}

/**
 * 🎵 Enhanced Personalized Feedback
 */
export function getPersonalizedFeedback(
  userLevel: "beginner" | "intermediate" | "advanced",
  context: any
): string {
  try {
    const performanceLevel = context?.performanceLevel || "good";
    const personalityLevel = mapPerformanceToPersonality(performanceLevel);

    const response = SimonPrimePersonalityEngine.getResponse(
      "practice",
      personalityLevel,
      "general",
      simonConfig.humorMode
    );

    // Add skill level context
    const skillContext =
      userLevel === "beginner"
        ? " Remember, every expert was once a beginner!"
        : userLevel === "advanced"
        ? " Your skill level is impressive!"
        : " You're making solid progress!";

    return (
      (response.message || getBackupResponse(performanceLevel)) + skillContext
    );
  } catch (error) {
    return getBackupResponse() + " Keep practicing!";
  }
}

/**
 * 🎯 Determine Performance Level from Data
 */
function determinePerformanceLevel(data: any): string {
  if (!data) return "good";

  if (data.performanceLevel) {
    return data.performanceLevel;
  }

  const score = data.overall || data.confidence || data.score || 0.7;

  if (score >= 0.9) return "masterful";
  if (score >= 0.8) return "excellent";
  if (score >= 0.6) return "good";
  if (score >= 0.4) return "needsWork";
  return "terrible";
}

/**
 * 🎸 Set Simon's Genre
 */
export function setSimonGenre(genre: string): void {
  const validatedGenre = validateGenre(genre);
  simonConfig.genre = validatedGenre;
}

/**
 * 🏆 Add Achievement
 */
export function addSimonAchievement(achievement: string): void {
  if (!simonConfig.achievements.includes(achievement)) {
    simonConfig.achievements.push(achievement);
  }
}

/**
 * 🔥 Get Genre-Specific Response
 */
export function getGenreResponse(genre: string, context: string): string {
  try {
    const validatedGenre = validateGenre(genre);
    return SimonPrimePersonalityEngine.getGenreSpecificResponse(
      validatedGenre,
      context
    ).message;
  } catch (error) {
    return "Rock on! 🎸";
  }
}

// Legacy compatibility exports
export function getSimonPrimeResult(input: string): SimonPrimeResult {
  return runSimonPrime(input);
}

export function getSimonPrimeFeedback(): string {
  return coachFeedback({});
}

// Default export for compatibility
export default runSimonPrime;

console.log(
  "🎸 Simon Prime Module (Full Implementation) loaded - Ready to rock! 🔥"
);
