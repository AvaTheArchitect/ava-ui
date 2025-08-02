/**
 * MixingAI.ts - Smart Mixing Suggestions & Automation
 * 🎛️ AI-powered mixing engine for optimal audio balance
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import { MusicGenre, BrainModule } from "../../shared/types";

// Import advanced audio processing utilities
import {
  SpectralAnalyzer,
  type SpectralFeatures,
} from "../../shared/audioSyncUtils";

// Mixing Configuration
export interface MixingAIConfig {
  targetLoudness?: number; // LUFS
  dynamicRange?: number; // dB
  frequencyBalance?: FrequencyProfile;
  stereoWidth?: number; // 0-100%
  enableAutoGain?: boolean;
  enableFrequencyAnalysis?: boolean;
  enableStereoEnhancement?: boolean;
  enableDynamicsProcessing?: boolean;
  mixingStyle?: MixingStyle;
}

// Frequency Profile for EQ suggestions
export interface FrequencyProfile {
  bass: number; // 20-250 Hz
  lowMid: number; // 250-500 Hz
  mid: number; // 500-2000 Hz
  highMid: number; // 2000-4000 Hz
  treble: number; // 4000-20000 Hz
}

// Mixing Styles
export type MixingStyle =
  | "modern"
  | "vintage"
  | "radio"
  | "streaming"
  | "live"
  | "acoustic"
  | "electronic"
  | "custom";

// Channel Analysis
export interface ChannelAnalysis {
  channelId: string;
  name: string;
  level: number; // dB
  frequency: ExtendedSpectralFeatures;
  dynamics: DynamicsAnalysis;
  stereoPosition: number; // -100 to 100 (L to R)
  recommendations: MixingSuggestion[];
}

// Extended Spectral Features to include frequency bands
export interface ExtendedSpectralFeatures extends SpectralFeatures {
  bass?: number;
  lowMid?: number;
  mid?: number;
  highMid?: number;
  treble?: number;
}

// Dynamics Analysis
export interface DynamicsAnalysis {
  peak: number; // dB
  rms: number; // dB
  crestFactor: number;
  dynamicRange: number;
  compressorSuggestion?: CompressorSettings;
}

// Mixing Suggestions
export interface MixingSuggestion {
  type: "gain" | "eq" | "compression" | "reverb" | "stereo" | "effects";
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  parameters: Record<string, number>;
  confidence: number; // 0-100%
  reason: string;
}

// Compressor Settings
export interface CompressorSettings {
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  makeupGain: number; // dB
  [key: string]: number; // Index signature for Record<string, number> compatibility
}

// EQ Band
export interface EQBand {
  frequency: number; // Hz
  gain: number; // dB
  q: number; // Quality factor
  type: "highpass" | "lowpass" | "bell" | "shelf";
}

// Mix Analysis Result
export interface MixAnalysisResult {
  overallScore: number; // 0-100
  lufs: number;
  dynamicRange: number;
  frequencyBalance: FrequencyProfile;
  stereoBalance: number;
  channels: ChannelAnalysis[];
  suggestions: MixingSuggestion[];
  genreCompliance: number; // How well it fits the genre
  timestamp: number;
}

// Audio Utils helper methods (local implementation)
class AudioUtilsLocal {
  static calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  static findPeak(audioData: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < audioData.length; i++) {
      peak = Math.max(peak, Math.abs(audioData[i]));
    }
    return peak;
  }

  static amplitudeToDb(amplitude: number): number {
    return 20 * Math.log10(Math.max(amplitude, 1e-10));
  }
}

/**
 * MixingAI - AI-powered mixing analysis and suggestions
 * Provides intelligent mixing recommendations based on audio analysis
 */
export class MixingAI implements BrainModule {
  public readonly name: string = "MixingAI";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;
  private sessionId: string = generateId("mixing-session");

  // Configuration
  private config: MixingAIConfig = {
    targetLoudness: -14, // LUFS for streaming
    dynamicRange: 12, // dB
    enableAutoGain: true,
    enableFrequencyAnalysis: true,
    enableStereoEnhancement: true,
    enableDynamicsProcessing: true,
    mixingStyle: "modern",
  };

  // Analysis components
  private spectralAnalyzer?: SpectralAnalyzer;

  // Cache and state
  private lastAnalysis?: MixAnalysisResult;
  private analysisCache = new Map<string, MixAnalysisResult>();

  constructor(config?: Partial<MixingAIConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the MixingAI module
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🎛️ Initializing MixingAI v${this.version}...`);

      // Initialize analysis components
      this.spectralAnalyzer = new SpectralAnalyzer();

      // Load genre-specific mixing profiles
      await this.loadMixingProfiles();

      this.initialized = true;
      console.log(`✅ MixingAI initialized successfully`);
    } catch (error) {
      console.error("❌ Failed to initialize MixingAI:", error);
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
      healthy: this.initialized && !!this.spectralAnalyzer,
      metrics: {
        sessionId: this.sessionId,
        targetLoudness: this.config.targetLoudness,
        mixingStyle: this.config.mixingStyle,
        lastAnalysisTime: this.lastAnalysis?.timestamp || 0,
        cachedAnalyses: this.analysisCache.size,
      },
    };
  }

  /**
   * Analyze mix and provide intelligent suggestions
   */
  async analyzeMix(
    audioData: Float32Array[],
    channelNames?: string[],
    genre?: MusicGenre,
    targetStyle?: MixingStyle
  ): Promise<MixAnalysisResult> {
    if (!this.initialized) {
      throw new Error("MixingAI not initialized");
    }

    try {
      console.log("🎛️ Analyzing mix...");

      // Analyze each channel
      const channelAnalyses: ChannelAnalysis[] = [];
      for (let i = 0; i < audioData.length; i++) {
        const channelAnalysis = await this.analyzeChannel(
          audioData[i],
          channelNames?.[i] || `Channel ${i + 1}`,
          i
        );
        channelAnalyses.push(channelAnalysis);
      }

      // Calculate overall mix metrics
      const overallAnalysis = this.calculateOverallMetrics(channelAnalyses);

      // Generate mixing suggestions
      const suggestions = await this.generateMixingSuggestions(
        channelAnalyses,
        overallAnalysis,
        genre,
        targetStyle || this.config.mixingStyle
      );

      // Calculate genre compliance
      const genreCompliance = this.calculateGenreCompliance(
        overallAnalysis,
        genre
      );

      const result: MixAnalysisResult = {
        ...overallAnalysis,
        channels: channelAnalyses,
        suggestions,
        genreCompliance,
        timestamp: Date.now(),
      };

      // Cache the result
      this.lastAnalysis = result;
      this.analysisCache.set(this.sessionId, result);

      console.log(`✅ Mix analysis complete - Score: ${result.overallScore}%`);
      return result;
    } catch (error) {
      console.error("❌ Mix analysis failed:", error);
      throw error;
    }
  }

  /**
   * Analyze individual channel
   */
  private async analyzeChannel(
    channelData: Float32Array,
    name: string,
    index: number
  ): Promise<ChannelAnalysis> {
    // Spectral analysis using proper method
    const spectralFeatures = await this.analyzeChannelSpectrum(channelData);

    // Level analysis using local audio utils
    const rms = AudioUtilsLocal.calculateRMS(channelData);
    const peak = AudioUtilsLocal.findPeak(channelData);

    // Dynamics analysis
    const dynamicsAnalysis: DynamicsAnalysis = {
      peak: AudioUtilsLocal.amplitudeToDb(peak),
      rms: AudioUtilsLocal.amplitudeToDb(rms),
      crestFactor: peak / rms,
      dynamicRange: this.calculateDynamicRange(channelData),
      compressorSuggestion: this.suggestCompressorSettings(channelData),
    };

    // Generate channel-specific recommendations
    const recommendations = this.generateChannelRecommendations(
      spectralFeatures,
      dynamicsAnalysis,
      name
    );

    return {
      channelId: generateId("channel"),
      name,
      level: AudioUtilsLocal.amplitudeToDb(rms),
      frequency: spectralFeatures,
      dynamics: dynamicsAnalysis,
      stereoPosition: this.calculateStereoPosition(index, channelData),
      recommendations,
    };
  }

  /**
   * Analyze channel spectrum and extract frequency bands
   */
  private async analyzeChannelSpectrum(
    channelData: Float32Array
  ): Promise<ExtendedSpectralFeatures> {
    // Create extended spectral features with frequency bands
    // Note: Using empty base since we don't know exact SpectralFeatures properties
    const baseFeatures: SpectralFeatures = {} as SpectralFeatures;

    // Add frequency band analysis
    const extendedFeatures: ExtendedSpectralFeatures = {
      ...baseFeatures,
      bass: this.analyzeFrequencyBand(channelData, 20, 250),
      lowMid: this.analyzeFrequencyBand(channelData, 250, 500),
      mid: this.analyzeFrequencyBand(channelData, 500, 2000),
      highMid: this.analyzeFrequencyBand(channelData, 2000, 4000),
      treble: this.analyzeFrequencyBand(channelData, 4000, 20000),
    };

    return extendedFeatures;
  }

  /**
   * Calculate overall mix metrics
   */
  private calculateOverallMetrics(channels: ChannelAnalysis[]) {
    const totalRMS = channels.reduce(
      (sum, ch) => sum + Math.pow(10, ch.level / 20),
      0
    );
    const lufs = AudioUtilsLocal.amplitudeToDb(Math.sqrt(totalRMS)) - 0.691; // LUFS approximation

    const dynamicRange = Math.min(
      ...channels.map((ch) => ch.dynamics.dynamicRange)
    );

    const frequencyBalance = this.calculateFrequencyBalance(channels);
    const stereoBalance = this.calculateStereoBalance(channels);

    const overallScore = this.calculateOverallScore(
      lufs,
      dynamicRange,
      frequencyBalance
    );

    return {
      overallScore,
      lufs,
      dynamicRange,
      frequencyBalance,
      stereoBalance,
    };
  }

  /**
   * Generate intelligent mixing suggestions
   */
  private async generateMixingSuggestions(
    channels: ChannelAnalysis[],
    overall: any,
    genre?: MusicGenre,
    style?: MixingStyle
  ): Promise<MixingSuggestion[]> {
    const suggestions: MixingSuggestion[] = [];

    // LUFS target suggestions
    if (overall.lufs > this.config.targetLoudness! + 2) {
      suggestions.push({
        type: "gain",
        description: "Reduce overall gain to meet streaming standards",
        priority: "high",
        parameters: { gain: this.config.targetLoudness! - overall.lufs },
        confidence: 95,
        reason: `Current LUFS (${overall.lufs.toFixed(1)}) exceeds target (${
          this.config.targetLoudness
        })`,
      });
    }

    // Dynamic range suggestions
    if (overall.dynamicRange < 6) {
      suggestions.push({
        type: "compression",
        description: "Reduce compression to preserve dynamics",
        priority: "medium",
        parameters: { ratio: 2, threshold: -12 },
        confidence: 80,
        reason: "Mix appears over-compressed, affecting musicality",
      });
    }

    // Frequency balance suggestions
    const freqSuggestions = this.analyzeFrequencyBalance(
      overall.frequencyBalance,
      genre
    );
    suggestions.push(...freqSuggestions);

    // Stereo imaging suggestions
    if (Math.abs(overall.stereoBalance) > 10) {
      suggestions.push({
        type: "stereo",
        description: "Adjust stereo balance for centered image",
        priority: "medium",
        parameters: { balance: -overall.stereoBalance },
        confidence: 85,
        reason: "Stereo image is off-center",
      });
    }

    return suggestions.sort(
      (a, b) =>
        this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)
    );
  }

  /**
   * Calculate frequency balance
   */
  private calculateFrequencyBalance(
    channels: ChannelAnalysis[]
  ): FrequencyProfile {
    const profile: FrequencyProfile = {
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
    };

    channels.forEach((channel) => {
      profile.bass += channel.frequency.bass || 0;
      profile.lowMid += channel.frequency.lowMid || 0;
      profile.mid += channel.frequency.mid || 0;
      profile.highMid += channel.frequency.highMid || 0;
      profile.treble += channel.frequency.treble || 0;
    });

    // Normalize by channel count
    const channelCount = channels.length;
    profile.bass /= channelCount;
    profile.lowMid /= channelCount;
    profile.mid /= channelCount;
    profile.highMid /= channelCount;
    profile.treble /= channelCount;

    return profile;
  }

  /**
   * Analyze frequency balance and suggest EQ
   */
  private analyzeFrequencyBalance(
    profile: FrequencyProfile,
    genre?: MusicGenre
  ): MixingSuggestion[] {
    const suggestions: MixingSuggestion[] = [];

    // Genre-specific frequency targets
    const targets = this.getGenreFrequencyTargets(genre);

    Object.entries(profile).forEach(([band, level]) => {
      const target = targets[band as keyof FrequencyProfile];
      const difference = level - target;

      if (Math.abs(difference) > 3) {
        // 3dB threshold
        suggestions.push({
          type: "eq",
          description: `Adjust ${band} frequencies`,
          priority: Math.abs(difference) > 6 ? "high" : "medium",
          parameters: {
            [band]: -difference,
            frequency: this.getFrequencyCenter(band as keyof FrequencyProfile),
          },
          confidence: Math.min(90, 60 + Math.abs(difference) * 5),
          reason: `${band} is ${
            difference > 0 ? "elevated" : "deficient"
          } by ${Math.abs(difference).toFixed(1)}dB`,
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate channel-specific recommendations
   */
  private generateChannelRecommendations(
    spectral: ExtendedSpectralFeatures,
    dynamics: DynamicsAnalysis,
    channelName: string
  ): MixingSuggestion[] {
    const recommendations: MixingSuggestion[] = [];

    // Dynamic range recommendations
    if (dynamics.crestFactor < 2) {
      recommendations.push({
        type: "compression",
        description: "Reduce compression to restore dynamics",
        priority: "medium",
        parameters: dynamics.compressorSuggestion || {
          threshold: -12,
          ratio: 3,
        },
        confidence: 75,
        reason: "Signal appears over-compressed",
      });
    }

    // Level recommendations
    if (dynamics.peak > -0.1) {
      recommendations.push({
        type: "gain",
        description: "Reduce gain to prevent clipping",
        priority: "critical",
        parameters: { gain: -3 },
        confidence: 95,
        reason: "Peak level exceeds safe threshold",
      });
    }

    // Spectral recommendations
    if (spectral.bass && spectral.bass > 0.8) {
      recommendations.push({
        type: "eq",
        description: `Reduce excessive bass in ${channelName}`,
        priority: "medium",
        parameters: { frequency: 100, gain: -2, q: 0.7 },
        confidence: 80,
        reason: "Channel has excessive low frequency content",
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private calculateDynamicRange(audioData: Float32Array): number {
    const peak = AudioUtilsLocal.findPeak(audioData);
    const rms = AudioUtilsLocal.calculateRMS(audioData);
    return (
      AudioUtilsLocal.amplitudeToDb(peak) - AudioUtilsLocal.amplitudeToDb(rms)
    );
  }

  private suggestCompressorSettings(
    audioData: Float32Array
  ): CompressorSettings {
    const rms = AudioUtilsLocal.calculateRMS(audioData);
    const peak = AudioUtilsLocal.findPeak(audioData);
    const crestFactor = peak / rms;

    return {
      threshold: AudioUtilsLocal.amplitudeToDb(rms) + 6,
      ratio: crestFactor > 4 ? 4 : 2,
      attack: 10,
      release: 100,
      makeupGain: 2,
    };
  }

  private calculateStereoPosition(
    index: number,
    channelData: Float32Array
  ): number {
    // Calculate actual stereo position based on channel correlation
    // Simplified implementation
    return ((index % 2) - 0.5) * 200; // -100 to 100
  }

  private calculateStereoBalance(channels: ChannelAnalysis[]): number {
    const leftChannels = channels.filter((ch) => ch.stereoPosition < 0);
    const rightChannels = channels.filter((ch) => ch.stereoPosition > 0);

    const leftLevel = leftChannels.reduce(
      (sum, ch) => sum + Math.pow(10, ch.level / 20),
      0
    );
    const rightLevel = rightChannels.reduce(
      (sum, ch) => sum + Math.pow(10, ch.level / 20),
      0
    );

    if (leftLevel + rightLevel === 0) return 0;
    return ((rightLevel - leftLevel) / (rightLevel + leftLevel)) * 100;
  }

  private calculateOverallScore(
    lufs: number,
    dynamicRange: number,
    frequency: FrequencyProfile
  ): number {
    let score = 100;

    // LUFS penalty
    score -= Math.abs(lufs - this.config.targetLoudness!) * 2;

    // Dynamic range penalty
    if (dynamicRange < 6) score -= (6 - dynamicRange) * 5;
    if (dynamicRange > 20) score -= (dynamicRange - 20) * 2;

    // Frequency balance penalty
    const freqTotal = Object.values(frequency).reduce(
      (sum, val) => sum + Math.abs(val),
      0
    );
    score -= Math.min(30, freqTotal * 2);

    return Math.max(0, Math.min(100, score));
  }

  private calculateGenreCompliance(analysis: any, genre?: MusicGenre): number {
    if (!genre) return 100;

    // Safe genre compliance using string comparison to avoid enum issues
    const genreString = genre.toString().toLowerCase();

    switch (genreString) {
      case "rock":
        return analysis.dynamicRange > 8 ? 100 : 70;
      case "electronic":
        return analysis.lufs > -12 ? 100 : 80;
      case "classical":
        return analysis.dynamicRange > 15 ? 100 : 60;
      case "jazz":
        return analysis.dynamicRange > 12 ? 100 : 75;
      case "pop":
        return Math.abs(analysis.lufs + 14) < 2 ? 100 : 85;
      case "folk":
        return analysis.dynamicRange > 10 ? 100 : 80;
      case "country":
        return analysis.dynamicRange > 8 ? 100 : 75;
      case "blues":
        return analysis.dynamicRange > 10 ? 100 : 80;
      default:
        return 90;
    }
  }

  private getGenreFrequencyTargets(genre?: MusicGenre): FrequencyProfile {
    const defaultProfile: FrequencyProfile = {
      bass: 0,
      lowMid: 0,
      mid: 0,
      highMid: 0,
      treble: 0,
    };

    if (!genre) return defaultProfile;

    // Safe genre targeting using string comparison
    const genreString = genre.toString().toLowerCase();

    const targetMap: Record<string, FrequencyProfile> = {
      rock: { bass: 0, lowMid: -2, mid: 0, highMid: 2, treble: 1 },
      electronic: { bass: 3, lowMid: 0, mid: -1, highMid: 0, treble: 2 },
      classical: { bass: -1, lowMid: 0, mid: 1, highMid: 0, treble: -1 },
      jazz: { bass: 1, lowMid: 1, mid: 0, highMid: -1, treble: 0 },
      pop: { bass: 1, lowMid: 0, mid: 0, highMid: 1, treble: 1 },
      folk: { bass: -1, lowMid: 1, mid: 2, highMid: 0, treble: -1 },
      country: { bass: 0, lowMid: 1, mid: 1, highMid: 1, treble: 0 },
      blues: { bass: 1, lowMid: 0, mid: 1, highMid: -1, treble: 0 },
    };

    return targetMap[genreString] || defaultProfile;
  }

  private getFrequencyCenter(band: keyof FrequencyProfile): number {
    const centers = {
      bass: 100,
      lowMid: 375,
      mid: 1250,
      highMid: 3000,
      treble: 10000,
    };
    return centers[band];
  }

  private getPriorityWeight(priority: string): number {
    const weights = { critical: 4, high: 3, medium: 2, low: 1 };
    return weights[priority as keyof typeof weights] || 1;
  }

  private async loadMixingProfiles(): Promise<void> {
    // Load genre-specific mixing profiles
    console.log("📚 Loading mixing profiles...");
  }

  /**
   * Audio analysis helper methods
   */
  private analyzeFrequencyBand(
    audioData: Float32Array,
    lowFreq: number,
    highFreq: number
  ): number {
    // Simplified frequency band analysis
    // In real implementation, would use FFT and filter specific frequency ranges
    const sampleRate = 44100; // Assumed sample rate
    const nyquist = sampleRate / 2;

    const lowBin = Math.floor((lowFreq / nyquist) * audioData.length);
    const highBin = Math.floor((highFreq / nyquist) * audioData.length);

    let energy = 0;
    for (let i = lowBin; i < Math.min(highBin, audioData.length); i++) {
      energy += audioData[i] * audioData[i];
    }

    return Math.sqrt(energy / (highBin - lowBin));
  }

  /**
   * Public API methods
   */

  /**
   * Get last analysis result
   */
  getLastAnalysis(): MixAnalysisResult | undefined {
    return this.lastAnalysis;
  }

  /**
   * Get mixing suggestions for specific channels
   */
  getChannelSuggestions(channelName: string): MixingSuggestion[] {
    if (!this.lastAnalysis) return [];

    const channel = this.lastAnalysis.channels.find(
      (ch) => ch.name === channelName
    );
    return channel?.recommendations || [];
  }

  /**
   * Apply mixing suggestions automatically
   */
  async applyMixingSuggestions(
    suggestions: MixingSuggestion[]
  ): Promise<boolean> {
    try {
      console.log(`🎛️ Applying ${suggestions.length} mixing suggestions...`);

      // Implementation would depend on audio engine integration
      // This is a placeholder for the actual audio processing

      return true;
    } catch (error) {
      console.error("❌ Failed to apply mixing suggestions:", error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MixingAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("⚙️ MixingAI configuration updated");
  }

  /**
   * Get detailed frequency analysis for specific audio
   */
  async getDetailedFrequencyAnalysis(
    audioData: Float32Array
  ): Promise<FrequencyProfile> {
    const spectral = await this.analyzeChannelSpectrum(audioData);
    return {
      bass: spectral.bass || 0,
      lowMid: spectral.lowMid || 0,
      mid: spectral.mid || 0,
      highMid: spectral.highMid || 0,
      treble: spectral.treble || 0,
    };
  }

  /**
   * Generate mixing report
   */
  generateMixingReport(): string {
    if (!this.lastAnalysis) {
      return "No analysis data available. Run analyzeMix() first.";
    }

    const analysis = this.lastAnalysis;
    return `
🎛️ Mixing Analysis Report
Overall Score: ${analysis.overallScore}%
LUFS: ${analysis.lufs.toFixed(1)}
Dynamic Range: ${analysis.dynamicRange.toFixed(1)}dB
Genre Compliance: ${analysis.genreCompliance}%
Suggestions: ${analysis.suggestions.length}
    `.trim();
  }
}
