// Simon Prime Type Definitions
// File: src/types/simonPrime/types.ts

export interface SimonResponse {
  message: string;
  icon?: string;
  badge?: string;
  soundCue?: string;
  animation?: "nod" | "thumbsUp" | "facepalm" | "mindBlown" | "rockOn";
  confidence?: number;
}

export interface SimonPrimePersonality {
  humorMode: boolean;
  context: "practice" | "vocal" | "songwriting" | "theory" | "achievement";
  skillLevel: "beginner" | "intermediate" | "advanced" | "legendary";
  genre: "rock" | "country" | "blues" | "metal" | "christian" | "bluesrock";
}

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

export interface AudioAnalysisData {
  pitch?: number;
  amplitude?: number;
  frequency?: number;
  clarity?: number;
  timing?: number;
}
