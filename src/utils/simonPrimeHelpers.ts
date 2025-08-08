// 🛠️ SIMON PRIME HELPERS - Utility Functions
// File: src/utils/simonprime/simonPrimeHelpers.ts

import { SimonPrimePersonalityEngine } from "./simonPrimePersonality";

// 🎯 Type definitions
export type PerformanceLevel =
  | "terrible"
  | "needsWork"
  | "good"
  | "excellent"
  | "masterful";
export type PersonalityContext =
  | "practice"
  | "vocal"
  | "songwriting"
  | "theory"
  | "achievement";
export type GenreType =
  | "rock"
  | "country"
  | "blues"
  | "metal"
  | "christian"
  | "bluesrock";
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "legendary";

export interface SimonResponse {
  message: string;
  icon?: string;
  badge?: string;
  soundCue?: string;
  animation?: "nod" | "thumbsUp" | "facepalm" | "mindBlown" | "rockOn";
  confidence?: number;
}

export interface AudioAnalysisData {
  pitch?: number;
  amplitude?: number;
  frequency?: number;
  clarity?: number;
  timing?: number;
}

// 🎸 PERFORMANCE LEVEL MAPPING
export const mapPerformanceLevel = (
  score: number | string
): PerformanceLevel => {
  if (typeof score === "string") {
    const validLevels: PerformanceLevel[] = [
      "terrible",
      "needsWork",
      "good",
      "excellent",
      "masterful",
    ];
    return validLevels.includes(score as PerformanceLevel)
      ? (score as PerformanceLevel)
      : "good";
  }

  if (score >= 0.95) return "masterful";
  if (score >= 0.85) return "excellent";
  if (score >= 0.65) return "good";
  if (score >= 0.4) return "needsWork";
  return "terrible";
};

// 🎯 CONTEXT DETECTION
export const detectContext = (
  input: string,
  elements: string[] = []
): PersonalityContext => {
  const inputLower = input.toLowerCase();

  // Check elements array first
  if (elements.includes("vocal") || elements.includes("sing")) return "vocal";
  if (elements.includes("lyrics") || elements.includes("songwriting"))
    return "songwriting";
  if (elements.includes("theory") || elements.includes("scale"))
    return "theory";
  if (elements.includes("achievement") || elements.includes("badge"))
    return "achievement";

  // Check input text
  if (
    inputLower.includes("sing") ||
    inputLower.includes("vocal") ||
    inputLower.includes("pitch")
  )
    return "vocal";
  if (
    inputLower.includes("lyrics") ||
    inputLower.includes("song") ||
    inputLower.includes("write")
  )
    return "songwriting";
  if (
    inputLower.includes("scale") ||
    inputLower.includes("theory") ||
    inputLower.includes("mode")
  )
    return "theory";
  if (
    inputLower.includes("achievement") ||
    inputLower.includes("badge") ||
    inputLower.includes("progress")
  )
    return "achievement";

  return "practice"; // Default
};

// 🎵 GENRE VALIDATION
export const validateGenre = (genre: string): GenreType => {
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
};

// 🎸 CATEGORY DETECTION
export const detectCategory = (
  input: string,
  context: PersonalityContext
): string => {
  const inputLower = input.toLowerCase();

  switch (context) {
    case "practice":
      if (inputLower.includes("chord")) return "chordProgression";
      if (inputLower.includes("timing") || inputLower.includes("rhythm"))
        return "timing";
      if (inputLower.includes("technique") || inputLower.includes("finger"))
        return "technique";
      return "chordProgression";

    case "vocal":
      if (inputLower.includes("pitch")) return "pitch";
      if (inputLower.includes("breath") || inputLower.includes("breathing"))
        return "breath";
      if (inputLower.includes("timing")) return "timing";
      return "pitch";

    case "songwriting":
      if (inputLower.includes("lyrics") || inputLower.includes("words"))
        return "lyrics";
      if (
        inputLower.includes("composition") ||
        inputLower.includes("structure")
      )
        return "composition";
      return "lyrics";

    default:
      return "general";
  }
};

// 🔥 RESPONSE GENERATOR
export const generateSimonResponse = (
  input: string,
  performanceLevel: PerformanceLevel,
  humorMode: boolean = false,
  genre: GenreType = "rock",
  elements: string[] = []
): SimonResponse => {
  try {
    const context = detectContext(input, elements);
    const category = detectCategory(input, context);

    const response = SimonPrimePersonalityEngine.getResponse(
      context,
      performanceLevel,
      category,
      humorMode
    );

    return {
      ...response,
      confidence: getConfidenceFromPerformance(performanceLevel),
    };
  } catch (error) {
    console.error("Error generating Simon response:", error);
    return getBackupResponse(performanceLevel, humorMode);
  }
};

// 🎯 CONFIDENCE MAPPING
export const getConfidenceFromPerformance = (
  level: PerformanceLevel
): number => {
  const confidenceMap: Record<PerformanceLevel, number> = {
    terrible: 0.3,
    needsWork: 0.5,
    good: 0.7,
    excellent: 0.85,
    masterful: 0.95,
  };
  return confidenceMap[level] || 0.6;
};

// 🎸 AUDIO ANALYSIS HELPERS
export const analyzeAudioData = (audioData: number[]): AudioAnalysisData => {
  if (!audioData || audioData.length === 0) {
    return { amplitude: 0, clarity: 0, timing: 0 };
  }

  const amplitude =
    audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
  const maxAmplitude = Math.max(...audioData.map(Math.abs));
  const clarity = amplitude / (maxAmplitude || 1);

  // Simple timing analysis (consistency of amplitude over time)
  let timing = 1.0;
  if (audioData.length > 10) {
    const chunks = Math.floor(audioData.length / 10);
    const chunkAverages = [];
    for (let i = 0; i < 10; i++) {
      const start = i * chunks;
      const end = start + chunks;
      const chunk = audioData.slice(start, end);
      const avg =
        chunk.reduce((sum, val) => sum + Math.abs(val), 0) / chunk.length;
      chunkAverages.push(avg);
    }

    const variance =
      chunkAverages.reduce((sum, avg) => {
        const diff = avg - amplitude;
        return sum + diff * diff;
      }, 0) / chunkAverages.length;

    timing = Math.max(0.1, 1.0 - variance * 2);
  }

  return {
    amplitude: Math.min(1.0, amplitude * 2),
    clarity: Math.min(1.0, clarity),
    timing: Math.min(1.0, timing),
    pitch:
      amplitude > 0.1
        ? Math.min(800, Math.max(80, amplitude * 440))
        : undefined,
  };
};

// 🎤 VOCAL SPECIFIC ANALYSIS
export const analyzeVocalPerformance = (audioData: number[]) => {
  const analysis = analyzeAudioData(audioData);
  const overall =
    (analysis.amplitude! + analysis.clarity! + analysis.timing!) / 3;

  return {
    pitch: analysis.pitch || 0,
    tone:
      analysis.amplitude! > 0.5
        ? "strong"
        : analysis.amplitude! > 0.2
        ? "moderate"
        : "soft",
    vibrato: Math.random() * 10, // Placeholder - would need more complex analysis
    breath: analysis.amplitude! > 0.3 ? "good" : "needs work",
    overall: overall * 10,
    feedback: generateVocalFeedback(analysis),
    timestamp: Date.now(),
  };
};

// 🎸 GUITAR SPECIFIC ANALYSIS
export const analyzeGuitarPerformance = (audioData: number[]) => {
  const analysis = analyzeAudioData(audioData);
  const overall =
    (analysis.amplitude! + analysis.clarity! + analysis.timing!) / 3;

  return {
    technique: analysis.amplitude! > 0.6 ? "fingerpicking" : "strumming",
    timing: analysis.timing!,
    chord: ["Am", "C", "F", "G", "Dm"][Math.floor(Math.random() * 5)],
    fretwork: analysis.clarity!,
    overall: overall,
    feedback: generateGuitarFeedback(analysis),
    timestamp: Date.now(),
  };
};

// 🎵 VIBRATO SCORING
export const scoreVibrato = (pitchData: number[]): number => {
  if (!pitchData || pitchData.length === 0) return 0;

  let variability = 0;
  for (let i = 1; i < pitchData.length; i++) {
    variability += Math.abs(pitchData[i] - pitchData[i - 1]);
  }

  const averageVariability = variability / (pitchData.length - 1);
  const score = Math.min(100, Math.max(0, averageVariability * 100));

  return Math.round(score);
};

// 🔧 BACKUP RESPONSE SYSTEM
export const getBackupResponse = (
  performanceLevel: PerformanceLevel,
  humorMode: boolean = false
): SimonResponse => {
  const backupResponses = {
    terrible: {
      humor: "Well, that was... unique! Even Hendrix had off days! 🎸",
      professional:
        "Every legend started somewhere! Let's work on the fundamentals. 🎸",
    },
    needsWork: {
      humor:
        "Getting there! Rome wasn't built in a day, neither were guitar skills! 🏗️",
      professional: "Keep practicing! You're making progress. 💪",
    },
    good: {
      humor: "Nice work! You're cooking with musical gas now! 🔥",
      professional: "Great progress! Your skills are developing nicely. 🎶",
    },
    excellent: {
      humor:
        "Now THAT'S what I'm talking about! My circuits are tingling! 🎸✨",
      professional:
        "Outstanding performance! Your technique is really developing. 🎵",
    },
    masterful: {
      humor:
        "HOLY HARMONICS! That just broke my sound barrier! You're a guitar deity! ⚡🔥",
      professional:
        "Absolutely masterful! That shows true artistry and dedication. 🏆",
    },
  };

  const response = backupResponses[performanceLevel];
  return {
    message: humorMode ? response.humor : response.professional,
    icon: getIconForPerformance(performanceLevel),
    animation: getAnimationForPerformance(performanceLevel),
    confidence: getConfidenceFromPerformance(performanceLevel),
  };
};

// 🎯 ICON MAPPING
export const getIconForPerformance = (
  performance: PerformanceLevel
): string => {
  const iconMap = {
    terrible: "😅",
    needsWork: "🎯",
    good: "✨",
    excellent: "🔥",
    masterful: "👑",
  };
  return iconMap[performance] || "🎸";
};

// 🎭 ANIMATION MAPPING
export const getAnimationForPerformance = (performance: PerformanceLevel) => {
  const animationMap = {
    terrible: "facepalm" as const,
    needsWork: "nod" as const,
    good: "thumbsUp" as const,
    excellent: "rockOn" as const,
    masterful: "mindBlown" as const,
  };
  return animationMap[performance] || "nod";
};

// 🎤 VOCAL FEEDBACK GENERATOR
const generateVocalFeedback = (analysis: AudioAnalysisData): string[] => {
  const feedback = [];

  if (analysis.amplitude! < 0.3) {
    feedback.push(
      "Try projecting your voice more - breathe from your diaphragm!"
    );
  }

  if (analysis.clarity! < 0.5) {
    feedback.push("Focus on clear articulation and mouth positioning.");
  }

  if (analysis.timing! < 0.6) {
    feedback.push("Work on maintaining consistent timing with the beat.");
  }

  if (feedback.length === 0) {
    feedback.push("Great vocal control! Keep up the excellent work!");
  }

  return feedback;
};

// 🎸 GUITAR FEEDBACK GENERATOR
const generateGuitarFeedback = (analysis: AudioAnalysisData): string[] => {
  const feedback = [];

  if (analysis.amplitude! < 0.4) {
    feedback.push("Try strumming with more confidence and power.");
  }

  if (analysis.clarity! < 0.5) {
    feedback.push("Focus on clean chord changes and finger positioning.");
  }

  if (analysis.timing! < 0.6) {
    feedback.push("Practice with a metronome to improve your timing.");
  }

  if (feedback.length === 0) {
    feedback.push("Excellent guitar technique! Your practice is paying off!");
  }

  return feedback;
};

// 🎯 NEXT SUGGESTION GENERATOR
export const getNextSuggestion = (
  performanceLevel: PerformanceLevel,
  context: PersonalityContext,
  genre: GenreType
): string => {
  const suggestions = {
    excellent: [
      `Try a more challenging ${genre} piece in the same style`,
      "Experiment with advanced techniques and variations",
      "Consider performing this for others to build confidence",
      "Explore improvisation within this genre",
    ],
    good: [
      "Focus on consistency in your next practice session",
      "Try increasing the tempo slightly when you're ready",
      "Work on adding dynamics and personal expression",
      "Practice until this feels completely effortless",
    ],
    needsWork: [
      "Slow down and focus on accuracy first, speed comes later",
      "Break this into smaller, manageable sections",
      "Spend time on fundamentals and basic techniques",
      "Use a metronome to build steady timing",
    ],
  };

  const levelSuggestions =
    suggestions[performanceLevel as keyof typeof suggestions] ||
    suggestions.needsWork;
  return levelSuggestions[Math.floor(Math.random() * levelSuggestions.length)];
};

// 🎵 PRACTICE SESSION HELPERS
export const generatePracticeStats = () => {
  return {
    streak: Math.floor(Math.random() * 30),
    totalSessions: Math.floor(Math.random() * 100) + 10,
    skillProgress: Math.floor(Math.random() * 40) + 60,
    currentGoal: [
      "Master 5 new chords this week",
      "Practice scales for 15 minutes daily",
      "Learn a complete song",
      "Improve timing with metronome",
      "Work on barre chord transitions",
    ][Math.floor(Math.random() * 5)],
  };
};

// 🏆 ACHIEVEMENT HELPERS
export const shouldUnlockAchievement = (
  achievementId: string,
  userStats: any,
  currentPerformance: PerformanceLevel
): boolean => {
  // Simple achievement unlock logic - can be expanded
  const unlockConditions = {
    "chord-master": () => userStats.chordsLearned >= 10,
    "pitch-perfect": () =>
      currentPerformance === "masterful" && Math.random() > 0.7,
    "practice-warrior": () => userStats.practiceStreak >= 7,
    "riff-master": () =>
      currentPerformance === "excellent" && Math.random() > 0.8,
  };

  const condition =
    unlockConditions[achievementId as keyof typeof unlockConditions];
  return condition ? condition() : false;
};

// 🎸 Export all helpers
export default {
  mapPerformanceLevel,
  detectContext,
  validateGenre,
  detectCategory,
  generateSimonResponse,
  getConfidenceFromPerformance,
  analyzeAudioData,
  analyzeVocalPerformance,
  analyzeGuitarPerformance,
  scoreVibrato,
  getBackupResponse,
  getIconForPerformance,
  getAnimationForPerformance,
  getNextSuggestion,
  generatePracticeStats,
  shouldUnlockAchievement,
};
