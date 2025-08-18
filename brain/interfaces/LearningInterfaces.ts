/**
 * LearningInterfaces.ts - Learning System Interfaces
 * 🎓 Comprehensive interfaces for learning, personalization, and skill development
 * Part of Maestro.ai Brain System
 */

import { InstrumentType, ChordDifficulty, MusicGenre } from "./MusicInterfaces";

// =============================================================================
// 👤 USER AND PREFERENCES INTERFACES
// =============================================================================

/**
 * User preferences for personalization
 */
export interface UserPreferences {
  favoriteGenres: MusicGenre[];
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert";
  instruments: string[];
  favoriteKeys: string[];
  practiceGoals: string[];
  preferredDifficulty?: [number, number]; // min, max difficulty range
  learningStyle?: LearningStyle;
  timePreferences?: TimePreferences;
}

/**
 * Learning style preferences
 */
export interface LearningStyle {
  modalityPreferences: ModalityPreference[];
  processingStyle: "sequential" | "global" | "mixed";
  representationPreference: "visual" | "auditory" | "kinesthetic" | "mixed";
  organizationPreference: "structured" | "flexible" | "adaptive";
  pacePreference: "slow" | "moderate" | "fast" | "variable";
  feedbackPreference: "immediate" | "delayed" | "comprehensive" | "minimal";
}

/**
 * Learning modality preference
 */
export interface ModalityPreference {
  modality: "visual" | "auditory" | "kinesthetic" | "textual";
  strength: number; // 0-1
  contexts: string[];
}

/**
 * Time preferences for practice
 */
export interface TimePreferences {
  preferredPracticeTimes: TimeSlot[];
  sessionLengthPreference: [number, number]; // min, max minutes
  breakFrequency: number; // minutes between breaks
  weeklySchedule: WeeklyPattern;
}

/**
 * Time slot for practice
 */
export interface TimeSlot {
  dayOfWeek: number; // 0-6 (Sunday = 0)
  startHour: number; // 0-23
  endHour: number;
  effectiveness: number; // 0-1 how effective practice is at this time
}

/**
 * Weekly practice pattern
 */
export interface WeeklyPattern {
  consistency: number; // 0-1
  preferredDays: number[];
  averageSessionsPerWeek: number;
  totalPracticeTime: number; // minutes per week
}

// =============================================================================
// 🎯 LEARNING CONTEXT AND EVENTS
// =============================================================================

/**
 * Learning context for adaptive systems
 */
export interface LearningContext {
  userId: string;
  sessionId: string;
  currentSkill: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  preferences: UserPreferences;
  history: LearningEvent[];
  environment: LearningEnvironment;
}

/**
 * Learning environment
 */
export interface LearningEnvironment {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: string;
  location: "home" | "studio" | "school" | "stage" | "other";
  distractions: string[];
  mood: "motivated" | "neutral" | "tired" | "frustrated" | "excited";
  device: "mobile" | "tablet" | "desktop" | "instrument";
}

/**
 * Learning event for tracking progress
 */
export interface LearningEvent {
  id: string;
  type: "practice" | "lesson" | "assessment" | "feedback" | "achievement";
  skill: string;
  performance: number; // 0-1 score
  duration: number; // in seconds
  timestamp: number;
  difficulty: number; // 0-1
  engagement: number; // 0-1
  metadata?: LearningEventMetadata;
}

/**
 * Learning event metadata
 */
export interface LearningEventMetadata {
  instrument?: InstrumentType;
  exerciseType?: string;
  mistakes?: number;
  improvements?: string[];
  challenges?: string[];
  mood?: string;
  notes?: string;
}

// =============================================================================
// 🎓 PERSONALIZATION INTERFACES
// =============================================================================

/**
 * Personalized suggestion
 */
export interface PersonalizedSuggestion {
  suggestionId: string;
  type:
    | "exercise"
    | "song"
    | "technique"
    | "theory"
    | "collaboration"
    | "performance";
  title: string;
  description: string;
  content: SuggestionContent;
  difficulty: number; // 0-1
  personalizedReason: string;
  confidence: number; // 0-1
  expectedEngagement: number; // 0-1
  estimatedTime: number; // minutes
  prerequisites: string[];
  adaptations: SuggestionAdaptation[];
}

/**
 * Suggestion content
 */
export interface SuggestionContent {
  instructions: string[];
  materials: string[];
  examples?: string[];
  tips?: string[];
  commonMistakes?: string[];
  successCriteria: string[];
  variations: string[];
}

/**
 * Suggestion adaptation
 */
export interface SuggestionAdaptation {
  condition: string;
  adaptation: string;
  reasoning: string;
  impact: "low" | "medium" | "high";
}

/**
 * Personalization result
 */
export interface PersonalizationResult {
  userId: string;
  suggestions: PersonalizedSuggestion[];
  insights: PersonalizationInsight[];
  adaptations: PersonalizationAdaptation[];
  confidence: number;
  timestamp: number;
}

/**
 * Personalization insight
 */
export interface PersonalizationInsight {
  category: "preference" | "behavior" | "progress" | "potential" | "challenge";
  insight: string;
  confidence: number;
  actionable: boolean;
  priority: "low" | "medium" | "high";
  relatedMetrics: string[];
}

/**
 * Personalization adaptation
 */
export interface PersonalizationAdaptation {
  aspect:
    | "difficulty"
    | "content"
    | "pacing"
    | "feedback"
    | "interface"
    | "schedule";
  change: string;
  reasoning: string;
  expectedImpact: number; // 0-1
  timeframe: "immediate" | "short-term" | "long-term";
}

// =============================================================================
// 🏋️ SKILL TRACKING INTERFACES
// =============================================================================

/**
 * Music skill definition
 */
export interface MusicSkill {
  id: string;
  name: string;
  category: SkillCategory;
  instrument: InstrumentType;
  difficulty: SkillDifficulty;
  prerequisites: string[]; // skill IDs
  subskills: string[]; // skill IDs
  description: string;
  measurable: boolean;
  assessmentCriteria: AssessmentCriteria[];
}

/**
 * Skill category
 */
export enum SkillCategory {
  TECHNIQUE = "technique",
  THEORY = "theory",
  RHYTHM = "rhythm",
  HARMONY = "harmony",
  MELODY = "melody",
  PERFORMANCE = "performance",
  CREATIVITY = "creativity",
  LISTENING = "listening",
  COLLABORATION = "collaboration",
}

/**
 * Skill difficulty levels
 */
export enum SkillDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  EXPERT = "expert",
}

/**
 * Assessment criteria for skills
 */
export interface AssessmentCriteria {
  criterion: string;
  weight: number; // 0-1
  measurable: boolean;
  rubric: RubricLevel[];
}

/**
 * Rubric level for assessment
 */
export interface RubricLevel {
  level: number; // 1-5
  description: string;
  indicators: string[];
  threshold: number; // 0-1
}

/**
 * Skill metrics for tracking progress
 */
export interface SkillMetrics {
  accuracy: number; // 0-1
  speed: number; // 0-1 relative to target
  consistency: number; // 0-1
  retention: number; // 0-1 how well skill is retained over time
  transferability: number; // 0-1 how well skill transfers to other areas
  practiceEfficiency: number; // 0-1 improvement per practice hour
}

/**
 * Skill assessment result
 */
export interface SkillAssessment {
  skillId: string;
  userId: string;
  assessmentDate: number;
  level: SkillLevel;
  metrics: SkillMetrics;
  evidence: AssessmentEvidence[];
  assessor: "self" | "ai" | "instructor" | "peer";
  confidence: number; // 0-1
  recommendations: string[];
}

/**
 * Skill level
 */
export interface SkillLevel {
  level: number; // 0-5 (0 = no skill, 5 = mastery)
  percentage: number; // 0-100
  description: string;
  nextMilestone?: string;
}

/**
 * Assessment evidence
 */
export interface AssessmentEvidence {
  type: "performance" | "recording" | "exercise" | "test" | "observation";
  description: string;
  score: number; // 0-1
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Skill progression tracking
 */
export interface SkillProgression {
  skillId: string;
  userId: string;
  history: SkillAssessment[];
  currentLevel: SkillLevel;
  trend: "improving" | "stable" | "declining";
  velocity: number; // rate of improvement
  projectedMastery?: number; // timestamp when mastery expected
  challenges: string[];
  strengths: string[];
}

// =============================================================================
// 📊 PRACTICE ANALYSIS INTERFACES
// =============================================================================

/**
 * Practice session types
 */
export enum PracticeType {
  TECHNICAL = "technical",
  REPERTOIRE = "repertoire",
  IMPROVISATION = "improvisation",
  THEORY = "theory",
  PERFORMANCE = "performance",
  MAINTENANCE = "maintenance",
  EXPLORATION = "exploration",
}

/**
 * Practice intensity levels
 */
export enum PracticeIntensity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  PEAK = "peak",
}

/**
 * Practice session data
 */
export interface PracticeSession {
  id: string;
  userId: string;
  startTime: number;
  endTime: number;
  duration: number; // total duration in seconds
  activePracticeTime: number; // time actually practicing
  practiceType: PracticeType;
  intensity: PracticeIntensity;
  instrument: InstrumentType;
  skillsTargeted: string[];
  exercises: PracticeExercise[];
  qualityMetrics: PracticeQualityMetrics;
  progressMetrics: PracticeProgressMetrics;
  mood: PracticeMood;
  environment: PracticeEnvironment;
  notes?: string;
  tags?: string[];
}

/**
 * Practice exercise
 */
export interface PracticeExercise {
  id: string;
  name: string;
  type: PracticeType;
  difficulty: ChordDifficulty;
  duration: number; // seconds spent on this exercise
  repetitions?: number;
  targetMetrics: ExerciseTargets;
  achievedMetrics: ExerciseResults;
  qualityScore: number; // 0-1 overall quality rating
  improvements: string[];
  challenges: string[];
}

/**
 * Exercise targets
 */
export interface ExerciseTargets {
  tempo?: number;
  accuracy?: number; // 0-1
  dynamics?: string;
  expression?: number; // 0-1
  technique?: string[];
}

/**
 * Exercise results
 */
export interface ExerciseResults {
  tempo?: number;
  accuracy?: number; // 0-1
  consistency?: number; // 0-1
  improvement?: number; // 0-1
  mistakes?: number;
  successes?: number;
}

/**
 * Practice quality metrics
 */
export interface PracticeQualityMetrics {
  overallQuality: number; // 0-1 weighted average of all factors
  focus: number; // 0-1 how focused was the practice
  consistency: number; // 0-1 consistency throughout session
  efficiency: number; // 0-1 progress per minute of practice
  engagement: number; // 0-1 how engaged the user was
  technicalAccuracy: number; // 0-1 technical execution quality
  musicalExpression: number; // 0-1 musical interpretation quality
  errorRate: number; // 0-1 frequency of mistakes (lower is better)
  recoveryRate: number; // 0-1 how well errors were corrected
}

/**
 * Practice progress metrics
 */
export interface PracticeProgressMetrics {
  skillImprovement: Record<string, number>; // per-skill improvement
  tempoProgress: number; // change in tempo capability
  accuracyProgress: number; // change in accuracy
  complexityProgress: number; // ability to handle more complex material
  retentionScore: number; // how well previous material was retained
  challengesOvercome: string[];
  newChallengesEncountered: string[];
  overallProgress: number; // 0-1 overall progress rating
}

/**
 * Practice mood tracking
 */
export interface PracticeMood {
  energy: number; // 0-1 energy level
  motivation: number; // 0-1 motivation level
  confidence: number; // 0-1 confidence level
  frustration: number; // 0-1 frustration level
  satisfaction: number; // 0-1 satisfaction with session
  preSessionMood: "excited" | "motivated" | "neutral" | "tired" | "frustrated";
  postSessionMood:
    | "accomplished"
    | "satisfied"
    | "neutral"
    | "disappointed"
    | "frustrated";
}

/**
 * Practice environment
 */
export interface PracticeEnvironment {
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: string;
  location: "home" | "studio" | "stage" | "school" | "other";
  instrumentCondition: "excellent" | "good" | "fair" | "poor";
  ambientNoise: "quiet" | "moderate" | "noisy";
  distractions: string[];
  temperature?: number;
  lighting?: "excellent" | "good" | "fair" | "poor";
  companionship: "solo" | "instructor" | "group" | "online";
}

// =============================================================================
// 📈 ADAPTIVE LEARNING INTERFACES
// =============================================================================

/**
 * Adaptive learning configuration
 */
export interface AdaptiveLearningConfig {
  adaptationSensitivity: number; // 0-1 how quickly to adapt
  difficultyAdjustmentRate: number; // 0-1
  contentVariationLevel: number; // 0-1
  feedbackFrequency: "immediate" | "session-end" | "milestone" | "on-demand";
  enablePredictiveAdaptation: boolean;
  enableEmotionalAdaptation: boolean;
}

/**
 * Adaptive recommendation
 */
export interface AdaptiveRecommendation {
  next_exercises: string[];
  difficulty_adjustment: number; // -1 to 1 (negative = easier, positive = harder)
  focus_areas: string[];
  pacing_suggestion: "slower" | "maintain" | "faster";
  content_modifications: ContentModification[];
  learning_path_updates: LearningPathUpdate[];
  confidence: number;
}

/**
 * Content modification for adaptation
 */
export interface ContentModification {
  type: "difficulty" | "style" | "format" | "duration" | "feedback";
  modification: string;
  reason: string;
  impact: "low" | "medium" | "high";
}

/**
 * Learning path update
 */
export interface LearningPathUpdate {
  action: "add" | "remove" | "reorder" | "modify";
  target: string; // skill or exercise ID
  reason: string;
  priority: number;
}

/**
 * Learning analytics
 */
export interface LearningAnalytics {
  userId: string;
  timeRange: { start: number; end: number };
  totalPracticeTime: number;
  averageSessionLength: number;
  practiceFrequency: number; // sessions per week
  skillProgression: Record<string, SkillProgression>;
  qualityTrends: QualityTrend[];
  engagementMetrics: EngagementMetrics;
  achievements: Achievement[];
  challenges: LearningChallenge[];
  predictions: LearningPrediction[];
}

/**
 * Quality trend analysis
 */
export interface QualityTrend {
  metric: keyof PracticeQualityMetrics;
  trend: "improving" | "declining" | "stable";
  changeRate: number; // change per week
  confidence: number; // 0-1
  startValue: number;
  currentValue: number;
  projection?: number; // predicted future value
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  averageEngagement: number; // 0-1
  engagementTrend: "increasing" | "decreasing" | "stable";
  peakEngagementTimes: TimeSlot[];
  engagementFactors: EngagementFactor[];
  dropoffRisk: number; // 0-1 risk of stopping practice
}

/**
 * Engagement factor
 */
export interface EngagementFactor {
  factor: string;
  impact: number; // -1 to 1
  confidence: number; // 0-1
  actionable: boolean;
}

/**
 * Learning achievement
 */
export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category:
    | "skill"
    | "consistency"
    | "creativity"
    | "collaboration"
    | "milestone";
  difficulty: "bronze" | "silver" | "gold" | "platinum";
  earnedDate: number;
  progress: number; // 0-1 for partially completed achievements
  requirements: AchievementRequirement[];
}

/**
 * Achievement requirement
 */
export interface AchievementRequirement {
  type:
    | "skill-level"
    | "practice-time"
    | "streak"
    | "performance"
    | "completion";
  target: string;
  threshold: number;
  currentValue: number;
  completed: boolean;
}

/**
 * Learning challenge
 */
export interface LearningChallenge {
  challengeId: string;
  type:
    | "skill-plateau"
    | "motivation-drop"
    | "technical-barrier"
    | "time-constraint";
  description: string;
  severity: "low" | "medium" | "high";
  firstDetected: number;
  lastOccurrence: number;
  frequency: number; // how often it occurs
  solutions: ChallengeSolution[];
}

/**
 * Challenge solution
 */
export interface ChallengeSolution {
  strategy: string;
  description: string;
  effectiveness: number; // 0-1
  timeToImplement: number; // days
  resources: string[];
}

/**
 * Learning prediction
 */
export interface LearningPrediction {
  type: "skill-mastery" | "plateau-risk" | "engagement-drop" | "breakthrough";
  description: string;
  probability: number; // 0-1
  timeframe: number; // days from now
  confidence: number; // 0-1
  factors: string[]; // contributing factors
  recommendations: string[];
}

// =============================================================================
// 🎯 LEARNING PATHWAYS
// =============================================================================

/**
 * Learning pathway definition
 */
export interface LearningPathway {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  instrument: InstrumentType;
  genre?: MusicGenre;
  difficulty: SkillDifficulty;
  estimatedDuration: number; // weeks
  prerequisites: string[];
  skills: string[]; // skill IDs to be developed
  milestones: LearningMilestone[];
  modules: LearningModule[];
}

/**
 * Learning milestone
 */
export interface LearningMilestone {
  id: string;
  name: string;
  description: string;
  requirements: MilestoneRequirement[];
  reward?: Achievement;
  estimatedTime: number; // hours to reach
}

/**
 * Milestone requirement
 */
export interface MilestoneRequirement {
  type:
    | "skill-assessment"
    | "practice-hours"
    | "project-completion"
    | "performance";
  description: string;
  threshold: number;
  measurable: boolean;
}

/**
 * Learning module
 */
export interface LearningModule {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  exercises: Exercise[];
  assessments: Assessment[];
  estimatedDuration: number; // hours
  difficulty: number; // 0-1
}

/**
 * Lesson definition
 */
export interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  content: LessonContent;
  duration: number; // minutes
  interactive: boolean;
  prerequisites: string[];
}

/**
 * Lesson content
 */
export interface LessonContent {
  theory?: string[];
  demonstrations?: string[];
  exercises?: string[];
  examples?: string[];
  resources?: string[];
}

/**
 * Exercise definition
 */
export interface Exercise {
  id: string;
  name: string;
  type: PracticeType;
  instructions: string[];
  difficulty: number; // 0-1
  estimatedTime: number; // minutes
  successCriteria: string[];
  variations: ExerciseVariation[];
}

/**
 * Exercise variation
 */
export interface ExerciseVariation {
  name: string;
  description: string;
  difficultyModifier: number; // -0.5 to 0.5
  instructions: string[];
}

/**
 * Assessment definition
 */
export interface Assessment {
  id: string;
  name: string;
  type: "quiz" | "performance" | "project" | "peer-review";
  questions?: AssessmentQuestion[];
  rubric?: AssessmentRubric;
  passingScore: number; // 0-1
  timeLimit?: number; // minutes
}

/**
 * Assessment question
 */
export interface AssessmentQuestion {
  id: string;
  question: string;
  type: "multiple-choice" | "true-false" | "short-answer" | "performance";
  options?: string[];
  correctAnswer?: string | number;
  points: number;
}

/**
 * Assessment rubric
 */
export interface AssessmentRubric {
  criteria: RubricCriterion[];
  scale: number; // 1-5 or 1-10
}

/**
 * Rubric criterion
 */
export interface RubricCriterion {
  name: string;
  description: string;
  weight: number; // 0-1
  levels: RubricLevel[];
}
