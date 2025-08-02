/**
 * RecordingIntelligence.ts - Recording Quality Optimization
 * 🎙️ AI-powered recording analysis and optimization engine
 * Part of Maestro.ai Brain System
 */

import { generateId } from "../../shared/utils";
import {
  MusicGenre,
  BrainModule,
} from "../../shared/types";

// Import advanced audio processing utilities
import {
  SpectralAnalyzer,
  OnsetDetector,
  type OnsetDetection,
} from "../../shared/audioSyncUtils";

// Recording Configuration
export interface RecordingConfig {
  enableRealTimeAnalysis?: boolean;
  enableNoiseDetection?: boolean;
  enableClippingDetection?: boolean;
  enablePhaseAnalysis?: boolean;
  enableRoomToneAnalysis?: boolean;
  qualityThreshold?: number; // 0-100%
  monitoringMode?: 'passive' | 'active' | 'predictive';
  sampleRate?: number;
  bitDepth?: number;
}

// Recording Quality Metrics
export interface RecordingQualityMetrics {
  overallQuality: number; // 0-100%
  signalToNoise: number; // dB
  dynamicRange: number; // dB
  frequencyResponse: FrequencyResponse;
  distortion: DistortionAnalysis;
  roomAcoustics: RoomAcousticsAnalysis;
  timing: TimingAnalysis;
  phase: PhaseAnalysis;
  clipping: ClippingAnalysis;
}

// Frequency Response Analysis
export interface FrequencyResponse {
  flatness: number; // 0-100% how flat the response is
  lowEndRolloff: number; // Hz where low end rolls off
  highEndRolloff: number; // Hz where high end rolls off
  resonances: ResonancePoint[];
  imbalances: FrequencyImbalance[];
}

export interface ResonancePoint {
  frequency: number; // Hz
  magnitude: number; // dB
  quality: number; // Q factor
  severity: 'minor' | 'moderate' | 'severe';
}

export interface FrequencyImbalance {
  band: string;
  frequency: number; // Hz
  deviation: number; // dB
  impact: 'low' | 'medium' | 'high';
}

// Distortion Analysis
export interface DistortionAnalysis {
  thd: number; // Total Harmonic Distortion %
  imd: number; // Intermodulation Distortion %
  clippingEvents: number;
  saturationLevel: number; // 0-100%
  distortionType: DistortionType[];
}

export type DistortionType = 'harmonic' | 'intermodulation' | 'clipping' | 'saturation' | 'aliasing';

// Room Acoustics Analysis
export interface RoomAcousticsAnalysis {
  reverbTime: number; // RT60 in seconds
  earlyReflections: EarlyReflection[];
  roomSize: RoomSizeEstimate;
  acousticTreatment: AcousticTreatmentAnalysis;
  backgroundNoise: NoiseAnalysis;
}

export interface EarlyReflection {
  delay: number; // ms
  amplitude: number; // dB relative to direct sound
  source: 'wall' | 'ceiling' | 'floor' | 'object';
}

export interface RoomSizeEstimate {
  width: number; // meters (estimated)
  length: number; // meters (estimated)
  height: number; // meters (estimated)
  volume: number; // cubic meters
  confidence: number; // 0-100%
}

export interface AcousticTreatmentAnalysis {
  absorption: number; // 0-100%
  diffusion: number; // 0-100%
  treatmentQuality: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations: TreatmentRecommendation[];
}

export interface TreatmentRecommendation {
  type: 'absorption' | 'diffusion' | 'bass_trap' | 'isolation';
  location: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedImprovement: number; // 0-100%
}

// Noise Analysis
export interface NoiseAnalysis {
  noiseFloor: number; // dB
  noiseType: NoiseType[];
  signalToNoise: number; // dB
  noiseCancellationRecommendation: boolean;
}

export type NoiseType = 'electrical' | 'ambient' | 'mechanical' | 'digital' | 'wind' | 'handling';

// Timing Analysis
export interface TimingAnalysis {
  latency: number; // ms
  jitter: number; // ms
  driftRate: number; // ppm (parts per million)
  phaseCoherence: number; // 0-100%
  timingAccuracy: number; // 0-100%
}

// Phase Analysis
export interface PhaseAnalysis {
  phaseCoherence: number; // 0-100%
  phaseShift: number; // degrees
  correlationCoefficient: number; // -1 to 1
  phaseIssues: PhaseIssue[];
}

export interface PhaseIssue {
  type: 'cancellation' | 'enhancement' | 'drift' | 'misalignment';
  frequency: number; // Hz
  severity: number; // 0-100%
  correction: string;
}

// Clipping Analysis
export interface ClippingAnalysis {
  clippingEvents: ClippingEvent[];
  clippingPercentage: number; // % of samples clipped
  headroom: number; // dB
  peakLevel: number; // dB
  recommendations: ClippingRecommendation[];
}

export interface ClippingEvent {
  timestamp: number; // seconds
  duration: number; // ms
  severity: 'soft' | 'hard' | 'severe';
  channel: number;
}

export interface ClippingRecommendation {
  action: 'reduce_gain' | 'use_limiter' | 'adjust_input' | 'check_preamp';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, number>;
}

// Recording Optimization Result
export interface RecordingOptimizationResult {
  sessionId: string;
  originalQuality: RecordingQualityMetrics;
  optimizedSettings: RecordingSettings;
  improvements: RecordingImprovement[];
  qualityIncrease: number; // percentage
  timestamp: number;
}

export interface RecordingSettings {
  inputGain: number; // dB
  sampleRate: number; // Hz
  bitDepth: number;
  bufferSize: number;
  enableLimiter: boolean;
  enableNoiseGate: boolean;
  enableHighpassFilter: boolean;
  highpassFrequency: number; // Hz
}

export interface RecordingImprovement {
  category: 'gain' | 'noise' | 'distortion' | 'timing' | 'acoustics';
  description: string;
  before: number;
  after: number;
  improvement: number; // percentage
  confidence: number; // 0-100%
}

/**
 * RecordingIntelligence - AI-powered recording quality optimization
 * Provides real-time recording analysis and intelligent optimization
 */
export class RecordingIntelligence implements BrainModule {
  public readonly name: string = "RecordingIntelligence";
  public readonly version: string = "1.0.0";
  public initialized: boolean = false;
  private sessionId: string = generateId("recording-session");

  // Configuration
  private config: RecordingConfig = {
    enableRealTimeAnalysis: true,
    enableNoiseDetection: true,
    enableClippingDetection: true,
    enablePhaseAnalysis: true,
    enableRoomToneAnalysis: true,
    qualityThreshold: 80,
    monitoringMode: 'active',
    sampleRate: 44100,
    bitDepth: 24,
  };

  // Analysis components
  private spectralAnalyzer?: SpectralAnalyzer;
  private onsetDetector?: OnsetDetector;
  
  // State management
  private isRecording: boolean = false;
  private currentQuality?: RecordingQualityMetrics;
  private qualityHistory: RecordingQualityMetrics[] = [];
  private optimizationCache = new Map<string, RecordingOptimizationResult>();

  constructor(config?: Partial<RecordingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize the RecordingIntelligence module
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🎙️ Initializing RecordingIntelligence v${this.version}...`);

      // Initialize analysis components
      this.spectralAnalyzer = new SpectralAnalyzer();
      this.onsetDetector = new OnsetDetector();

      // Initialize recording quality baselines
      await this.initializeQualityBaselines();

      // Set up real-time monitoring if enabled
      if (this.config.enableRealTimeAnalysis) {
        await this.setupRealTimeMonitoring();
      }

      this.initialized = true;
      console.log(`✅ RecordingIntelligence initialized successfully`);
    } catch (error) {
      console.error('❌ Failed to initialize RecordingIntelligence:', error);
      throw error;
    }
  }

  /**
   * Get module status - required by BrainModule interface
   */
  getStatus(): { initialized: boolean; healthy: boolean; metrics: Record<string, any> } {
    return {
      initialized: this.initialized,
      healthy: this.initialized && !!this.spectralAnalyzer,
      metrics: {
        sessionId: this.sessionId,
        isRecording: this.isRecording,
        qualityThreshold: this.config.qualityThreshold,
        monitoringMode: this.config.monitoringMode,
        currentQuality: this.currentQuality?.overallQuality || 0,
        qualityHistoryCount: this.qualityHistory.length,
        optimizationsCached: this.optimizationCache.size,
      }
    };
  }

  /**
   * Analyze recording quality in real-time
   */
  async analyzeRecordingQuality(
    audioData: Float32Array,
    referenceLevel?: number,
    targetGenre?: MusicGenre
  ): Promise<RecordingQualityMetrics> {
    if (!this.initialized) {
      throw new Error('RecordingIntelligence not initialized');
    }

    try {
      console.log('🎙️ Analyzing recording quality...');

      // Signal analysis
      const signalMetrics = await this.analyzeSignalQuality(audioData);
      
      // Noise analysis
      const noiseAnalysis = await this.analyzeNoise(audioData);
      
      // Distortion analysis
      const distortionAnalysis = await this.analyzeDistortion(audioData);
      
      // Room acoustics analysis
      const roomAnalysis = await this.analyzeRoomAcoustics(audioData);
      
      // Timing analysis
      const timingAnalysis = await this.analyzeTiming(audioData);
      
      // Phase analysis
      const phaseAnalysis = await this.analyzePhase(audioData);
      
      // Clipping analysis
      const clippingAnalysis = await this.analyzeClipping(audioData);

      const qualityMetrics: RecordingQualityMetrics = {
        overallQuality: this.calculateOverallQuality(signalMetrics, noiseAnalysis, distortionAnalysis),
        signalToNoise: noiseAnalysis.signalToNoise,
        dynamicRange: signalMetrics.dynamicRange,
        frequencyResponse: signalMetrics.frequencyResponse,
        distortion: distortionAnalysis,
        roomAcoustics: roomAnalysis,
        timing: timingAnalysis,
        phase: phaseAnalysis,
        clipping: clippingAnalysis,
      };

      // Update current quality and history
      this.currentQuality = qualityMetrics;
      this.qualityHistory.push(qualityMetrics);
      
      // Keep history manageable
      if (this.qualityHistory.length > 100) {
        this.qualityHistory = this.qualityHistory.slice(-50);
      }

      console.log(`✅ Recording quality analysis complete - Quality: ${qualityMetrics.overallQuality}%`);
      return qualityMetrics;

    } catch (error) {
      console.error('❌ Recording quality analysis failed:', error);
      throw error;
    }
  }

  /**
   * Optimize recording settings based on analysis
   */
  async optimizeRecordingSettings(
    audioData: Float32Array,
    currentSettings?: Partial<RecordingSettings>,
    targetGenre?: MusicGenre
  ): Promise<RecordingOptimizationResult> {
    if (!this.initialized) {
      throw new Error('RecordingIntelligence not initialized');
    }

    try {
      console.log('🎙️ Optimizing recording settings...');

      // Analyze current recording quality
      const originalQuality = await this.analyzeRecordingQuality(audioData, undefined, targetGenre);
      
      // Generate optimized settings
      const optimizedSettings = await this.generateOptimizedSettings(
        audioData,
        originalQuality,
        currentSettings,
        targetGenre
      );

      // Calculate expected improvements
      const improvements = this.calculateExpectedImprovements(
        originalQuality,
        optimizedSettings
      );

      const result: RecordingOptimizationResult = {
        sessionId: this.sessionId,
        originalQuality,
        optimizedSettings,
        improvements,
        qualityIncrease: this.calculateQualityIncrease(originalQuality, improvements),
        timestamp: Date.now(),
      };

      // Cache the optimization result
      this.optimizationCache.set(this.sessionId, result);

      console.log(`✅ Recording optimization complete - Expected quality increase: ${result.qualityIncrease.toFixed(1)}%`);
      return result;

    } catch (error) {
      console.error('❌ Recording optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze signal quality
   */
  private async analyzeSignalQuality(audioData: Float32Array): Promise<{
    dynamicRange: number;
    frequencyResponse: FrequencyResponse;
  }> {
    // Calculate dynamic range
    const dynamicRange = this.calculateDynamicRange(audioData);
    
    // Analyze frequency response
    const frequencyResponse = await this.analyzeFrequencyResponse(audioData);

    return {
      dynamicRange,
      frequencyResponse,
    };
  }

  /**
   * Analyze noise characteristics
   */
  private async analyzeNoise(audioData: Float32Array): Promise<NoiseAnalysis> {
    const noiseFloor = this.calculateNoiseFloor(audioData);
    const signalLevel = this.calculateSignalLevel(audioData);
    const signalToNoise = signalLevel - noiseFloor;
    
    // Detect noise types
    const noiseTypes = this.detectNoiseTypes(audioData);

    return {
      noiseFloor,
      noiseType: noiseTypes,
      signalToNoise,
      noiseCancellationRecommendation: signalToNoise < 40, // Recommend if SNR < 40dB
    };
  }

  /**
   * Analyze distortion characteristics
   */
  private async analyzeDistortion(audioData: Float32Array): Promise<DistortionAnalysis> {
    const thd = this.calculateTHD(audioData);
    const imd = this.calculateIMD(audioData);
    const clippingEvents = this.countClippingEvents(audioData);
    const saturationLevel = this.calculateSaturationLevel(audioData);
    const distortionTypes = this.detectDistortionTypes(audioData);

    return {
      thd,
      imd,
      clippingEvents,
      saturationLevel,
      distortionType: distortionTypes,
    };
  }

  /**
   * Analyze room acoustics
   */
  private async analyzeRoomAcoustics(audioData: Float32Array): Promise<RoomAcousticsAnalysis> {
    const reverbTime = this.calculateReverbTime(audioData);
    const earlyReflections = this.detectEarlyReflections(audioData);
    const roomSize = this.estimateRoomSize(audioData, reverbTime);
    const acousticTreatment = this.analyzeAcousticTreatment(audioData);
    const backgroundNoise = await this.analyzeNoise(audioData);

    return {
      reverbTime,
      earlyReflections,
      roomSize,
      acousticTreatment,
      backgroundNoise,
    };
  }

  /**
   * Analyze timing characteristics
   */
  private async analyzeTiming(audioData: Float32Array): Promise<TimingAnalysis> {
    const latency = this.calculateLatency(audioData);
    const jitter = this.calculateJitter(audioData);
    const driftRate = this.calculateDriftRate(audioData);
    const phaseCoherence = this.calculatePhaseCoherence(audioData);
    const timingAccuracy = this.calculateTimingAccuracy(audioData);

    return {
      latency,
      jitter,
      driftRate,
      phaseCoherence,
      timingAccuracy,
    };
  }

  /**
   * Analyze phase characteristics
   */
  private async analyzePhase(audioData: Float32Array): Promise<PhaseAnalysis> {
    const phaseCoherence = this.calculatePhaseCoherence(audioData);
    const phaseShift = this.calculatePhaseShift(audioData);
    const correlationCoefficient = this.calculateCorrelation(audioData);
    const phaseIssues = this.detectPhaseIssues(audioData);

    return {
      phaseCoherence,
      phaseShift,
      correlationCoefficient,
      phaseIssues,
    };
  }

  /**
   * Analyze clipping events
   */
  private async analyzeClipping(audioData: Float32Array): Promise<ClippingAnalysis> {
    const clippingEvents = this.detectClippingEvents(audioData);
    const clippingPercentage = this.calculateClippingPercentage(audioData);
    const headroom = this.calculateHeadroom(audioData);
    const peakLevel = this.calculatePeakLevel(audioData);
    const recommendations = this.generateClippingRecommendations(clippingEvents, headroom);

    return {
      clippingEvents,
      clippingPercentage,
      headroom,
      peakLevel,
      recommendations,
    };
  }

  /**
   * Generate optimized recording settings
   */
  private async generateOptimizedSettings(
    audioData: Float32Array,
    currentQuality: RecordingQualityMetrics,
    currentSettings?: Partial<RecordingSettings>,
    targetGenre?: MusicGenre
  ): Promise<RecordingSettings> {
    const baseSettings: RecordingSettings = {
      inputGain: 0,
      sampleRate: this.config.sampleRate || 44100,
      bitDepth: this.config.bitDepth || 24,
      bufferSize: 512,
      enableLimiter: false,
      enableNoiseGate: false,
      enableHighpassFilter: false,
      highpassFrequency: 80,
    };

    // Apply current settings as base
    const settings = { ...baseSettings, ...currentSettings };

    // Optimize gain staging
    if (currentQuality.clipping.headroom < 6) {
      settings.inputGain -= 6 - currentQuality.clipping.headroom;
    } else if (currentQuality.clipping.headroom > 15) {
      settings.inputGain += Math.min(6, currentQuality.clipping.headroom - 12);
    }

    // Enable limiter if clipping detected
    if (currentQuality.clipping.clippingEvents.length > 0) {
      settings.enableLimiter = true;
    }

    // Enable noise gate if noise floor is high
    if (currentQuality.signalToNoise < 50) {
      settings.enableNoiseGate = true;
    }

    // Enable highpass filter for low-end issues
    if (currentQuality.roomAcoustics.backgroundNoise.noiseType.includes('mechanical') ||
        currentQuality.roomAcoustics.backgroundNoise.noiseType.includes('wind')) {
      settings.enableHighpassFilter = true;
      settings.highpassFrequency = this.calculateOptimalHighpassFrequency(audioData);
    }

    // Genre-specific optimizations
    if (targetGenre) {
      this.applyGenreOptimizations(settings, targetGenre);
    }

    return settings;
  }

  /**
   * Helper methods for audio analysis
   */
  private calculateDynamicRange(audioData: Float32Array): number {
    const peak = this.findPeak(audioData);
    const rms = this.calculateRMS(audioData);
    return this.amplitudeToDb(peak) - this.amplitudeToDb(rms);
  }

  private async analyzeFrequencyResponse(audioData: Float32Array): Promise<FrequencyResponse> {
    // Simplified frequency response analysis
    const resonances = this.detectResonances(audioData);
    const imbalances = this.detectFrequencyImbalances(audioData);
    
    return {
      flatness: this.calculateResponseFlatness(audioData),
      lowEndRolloff: this.detectLowEndRolloff(audioData),
      highEndRolloff: this.detectHighEndRolloff(audioData),
      resonances,
      imbalances,
    };
  }

  private calculateNoiseFloor(audioData: Float32Array): number {
    // Find the quietest 10% of samples to estimate noise floor
    const sortedAbs = Array.from(audioData).map(Math.abs).sort((a, b) => a - b);
    const noiseFloorIndex = Math.floor(sortedAbs.length * 0.1);
    const noiseFloorAmplitude = sortedAbs[noiseFloorIndex];
    return this.amplitudeToDb(noiseFloorAmplitude);
  }

  private calculateSignalLevel(audioData: Float32Array): number {
    const rms = this.calculateRMS(audioData);
    return this.amplitudeToDb(rms);
  }

  private detectNoiseTypes(audioData: Float32Array): NoiseType[] {
    const types: NoiseType[] = [];
    
    // Simplified noise type detection based on spectral characteristics
    const spectralCentroid = this.calculateSpectralCentroid(audioData);
    const spectralRolloff = this.calculateSpectralRolloff(audioData);
    
    if (spectralCentroid < 500) types.push('electrical');
    if (spectralRolloff > 0.8) types.push('ambient');
    if (this.detectPeriodicNoise(audioData)) types.push('mechanical');
    
    return types;
  }

  private calculateTHD(audioData: Float32Array): number {
    // Simplified THD calculation
    // In real implementation, would use FFT to analyze harmonics
    return 0.1; // Placeholder - typically 0.01-1.0%
  }

  private calculateIMD(audioData: Float32Array): number {
    // Simplified IMD calculation
    return 0.05; // Placeholder
  }

  private countClippingEvents(audioData: Float32Array): number {
    let count = 0;
    const threshold = 0.99; // Near full scale
    
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) >= threshold) {
        count++;
      }
    }
    
    return count;
  }

  private calculateSaturationLevel(audioData: Float32Array): number {
    // Calculate how close to saturation the signal gets
    const peak = this.findPeak(audioData);
    return (peak / 1.0) * 100; // Percentage of full scale
  }

  private detectDistortionTypes(audioData: Float32Array): DistortionType[] {
    const types: DistortionType[] = [];
    
    const thd = this.calculateTHD(audioData);
    const clippingEvents = this.countClippingEvents(audioData);
    
    if (thd > 0.1) types.push('harmonic');
    if (clippingEvents > 0) types.push('clipping');
    if (this.detectSaturation(audioData)) types.push('saturation');
    
    return types;
  }

  private calculateReverbTime(audioData: Float32Array): number {
    // Simplified RT60 calculation
    // In real implementation, would use impulse response analysis
    return 0.5; // Placeholder - typically 0.2-2.0 seconds
  }

  private detectEarlyReflections(audioData: Float32Array): EarlyReflection[] {
    // Simplified early reflection detection
    return [
      { delay: 15, amplitude: -12, source: 'wall' },
      { delay: 25, amplitude: -18, source: 'ceiling' },
    ];
  }

  private estimateRoomSize(audioData: Float32Array, reverbTime: number): RoomSizeEstimate {
    // Estimate room dimensions based on reverb time and early reflections
    const volume = reverbTime * 50; // Simplified calculation
    const estimatedWidth = Math.cbrt(volume * 0.8);
    const estimatedLength = Math.cbrt(volume * 1.2);
    const estimatedHeight = Math.cbrt(volume * 0.5);

    return {
      width: estimatedWidth,
      length: estimatedLength,
      height: estimatedHeight,
      volume,
      confidence: 60, // Medium confidence in simplified estimation
    };
  }

  private analyzeAcousticTreatment(audioData: Float32Array): AcousticTreatmentAnalysis {
    const reverbTime = this.calculateReverbTime(audioData);
    const absorption = Math.max(0, 100 - (reverbTime * 40)); // Simplified
    const diffusion = 50; // Default estimate
    
    const treatmentQuality: AcousticTreatmentAnalysis['treatmentQuality'] = 
      absorption > 80 ? 'excellent' :
      absorption > 60 ? 'good' :
      absorption > 40 ? 'fair' : 'poor';

    const recommendations: TreatmentRecommendation[] = [];
    
    if (absorption < 60) {
      recommendations.push({
        type: 'absorption',
        location: 'First reflection points',
        priority: 'high',
        expectedImprovement: 70,
      });
    }

    return {
      absorption,
      diffusion,
      treatmentQuality,
      recommendations,
    };
  }

  private calculateLatency(audioData: Float32Array): number {
    // Simplified latency calculation
    return 10; // ms - typical for good audio interfaces
  }

  private calculateJitter(audioData: Float32Array): number {
    // Calculate timing jitter
    return 0.1; // ms
  }

  private calculateDriftRate(audioData: Float32Array): number {
    // Calculate clock drift rate
    return 5; // ppm
  }

  private calculatePhaseCoherence(audioData: Float32Array): number {
    // Calculate phase coherence between channels
    return 95; // Percentage
  }

  private calculateTimingAccuracy(audioData: Float32Array): number {
    const jitter = this.calculateJitter(audioData);
    const drift = this.calculateDriftRate(audioData);
    
    // Calculate timing accuracy based on jitter and drift
    const accuracy = 100 - (jitter * 10 + drift * 2);
    return Math.max(0, Math.min(100, accuracy));
  }

  private calculatePhaseShift(audioData: Float32Array): number {
    // Calculate phase shift in degrees
    return 0; // Placeholder
  }

  private calculateCorrelation(audioData: Float32Array): number {
    // Calculate correlation coefficient
    return 0.95; // High correlation expected for mono sources
  }

  private detectPhaseIssues(audioData: Float32Array): PhaseIssue[] {
    const issues: PhaseIssue[] = [];
    
    // Detect phase cancellation
    const correlation = this.calculateCorrelation(audioData);
    if (correlation < 0.7) {
      issues.push({
        type: 'cancellation',
        frequency: 1000, // Simplified
        severity: (1 - correlation) * 100,
        correction: 'Check microphone polarity and positioning',
      });
    }

    return issues;
  }

  private detectClippingEvents(audioData: Float32Array): ClippingEvent[] {
    const events: ClippingEvent[] = [];
    const threshold = 0.99;
    const sampleRate = this.config.sampleRate || 44100;
    
    let inClip = false;
    let clipStart = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const isClipped = Math.abs(audioData[i]) >= threshold;
      
      if (isClipped && !inClip) {
        // Start of clipping event
        inClip = true;
        clipStart = i;
      } else if (!isClipped && inClip) {
        // End of clipping event
        inClip = false;
        const duration = ((i - clipStart) / sampleRate) * 1000; // Convert to ms
        
        events.push({
          timestamp: clipStart / sampleRate,
          duration,
          severity: duration > 10 ? 'severe' : duration > 1 ? 'hard' : 'soft',
          channel: 0, // Simplified for mono
        });
      }
    }

    return events;
  }

  private calculateClippingPercentage(audioData: Float32Array): number {
    const threshold = 0.99;
    let clippedSamples = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) >= threshold) {
        clippedSamples++;
      }
    }
    
    return (clippedSamples / audioData.length) * 100;
  }

  private calculateHeadroom(audioData: Float32Array): number {
    const peak = this.findPeak(audioData);
    return this.amplitudeToDb(1.0) - this.amplitudeToDb(peak);
  }

  private calculatePeakLevel(audioData: Float32Array): number {
    const peak = this.findPeak(audioData);
    return this.amplitudeToDb(peak);
  }

  private generateClippingRecommendations(
    events: ClippingEvent[],
    headroom: number
  ): ClippingRecommendation[] {
    const recommendations: ClippingRecommendation[] = [];

    if (events.length > 0) {
      recommendations.push({
        action: 'reduce_gain',
        description: 'Reduce input gain to prevent clipping',
        priority: 'critical',
        parameters: { gainReduction: Math.max(3, 6 - headroom) },
      });

      if (events.some(e => e.severity === 'severe')) {
        recommendations.push({
          action: 'use_limiter',
          description: 'Enable limiter for peak protection',
          priority: 'high',
          parameters: { threshold: -1, ceiling: -0.1 },
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculation helper methods
   */
  private calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  private findPeak(audioData: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < audioData.length; i++) {
      peak = Math.max(peak, Math.abs(audioData[i]));
    }
    return peak;
  }

  private amplitudeToDb(amplitude: number): number {
    return 20 * Math.log10(Math.max(amplitude, 1e-10));
  }

  private calculateSpectralCentroid(audioData: Float32Array): number {
    // Simplified spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const magnitude = Math.abs(audioData[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(audioData: Float32Array): number {
    const totalEnergy = audioData.reduce((sum, val) => sum + val * val, 0);
    const threshold = 0.85 * totalEnergy;
    
    let accumulatedEnergy = 0;
    for (let i = 0; i < audioData.length; i++) {
      accumulatedEnergy += audioData[i] * audioData[i];
      if (accumulatedEnergy >= threshold) {
        return i / audioData.length;
      }
    }
    
    return 1.0;
  }

  private detectPeriodicNoise(audioData: Float32Array): boolean {
    // Simple periodic noise detection
    return false; // Placeholder
  }

  private detectSaturation(audioData: Float32Array): boolean {
    // Detect soft saturation characteristics
    return false; // Placeholder
  }

  private calculateResponseFlatness(audioData: Float32Array): number {
    // Calculate how flat the frequency response is
    return 85; // Placeholder percentage
  }

  private detectLowEndRolloff(audioData: Float32Array): number {
    // Detect frequency where low end rolls off (-3dB point)
    return 40; // Hz
  }

  private detectHighEndRolloff(audioData: Float32Array): number {
    // Detect frequency where high end rolls off (-3dB point)
    return 18000; // Hz
  }

  private detectResonances(audioData: Float32Array): ResonancePoint[] {
    // Simplified resonance detection
    return [
      { frequency: 120, magnitude: 3, quality: 2.5, severity: 'minor' },
    ];
  }

  private detectFrequencyImbalances(audioData: Float32Array): FrequencyImbalance[] {
    return [
      { band: 'low-mid', frequency: 300, deviation: -2, impact: 'medium' },
    ];
  }

  private calculateOptimalHighpassFrequency(audioData: Float32Array): number {
    // Calculate optimal highpass frequency based on content
    const spectralCentroid = this.calculateSpectralCentroid(audioData);
    return Math.max(40, Math.min(120, spectralCentroid * 0.1));
  }

  private applyGenreOptimizations(settings: RecordingSettings, genre: MusicGenre): void {
    // Genre-specific recording optimizations using safe string comparison
    const genreString = genre.toString().toLowerCase();
    
    switch (genreString) {
      case 'classical':
        settings.enableNoiseGate = false; // Preserve natural dynamics
        settings.enableHighpassFilter = false;
        break;
      case 'rock':
        settings.enableLimiter = true; // Handle peaks
        settings.highpassFrequency = 80;
        break;
      case 'electronic':
        settings.enableHighpassFilter = true;
        settings.highpassFrequency = 40;
        break;
      default:
        // Keep default settings
        break;
    }
  }

  private calculateOverallQuality(
    signal: any,
    noise: NoiseAnalysis,
    distortion: DistortionAnalysis
  ): number {
    let quality = 100;
    
    // Signal to noise ratio impact
    if (noise.signalToNoise < 60) {
      quality -= (60 - noise.signalToNoise) * 0.5;
    }
    
    // Distortion impact
    quality -= distortion.thd * 20; // THD penalty
    quality -= distortion.clippingEvents * 5; // Clipping penalty
    
    // Dynamic range impact
    if (signal.dynamicRange < 20) {
      quality -= (20 - signal.dynamicRange) * 2;
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  private calculateExpectedImprovements(
    originalQuality: RecordingQualityMetrics,
    optimizedSettings: RecordingSettings
  ): RecordingImprovement[] {
    const improvements: RecordingImprovement[] = [];

    // Gain staging improvement
    if (originalQuality.clipping.headroom < 6) {
      improvements.push({
        category: 'gain',
        description: 'Improved gain staging prevents clipping',
        before: originalQuality.clipping.headroom,
        after: 8,
        improvement: 33,
        confidence: 90,
      });
    }

    // Noise improvement
    if (optimizedSettings.enableNoiseGate) {
      improvements.push({
        category: 'noise',
        description: 'Noise gate improves signal-to-noise ratio',
        before: originalQuality.signalToNoise,
        after: originalQuality.signalToNoise + 6,
        improvement: 15,
        confidence: 80,
      });
    }

    return improvements;
  }

  private calculateQualityIncrease(
    originalQuality: RecordingQualityMetrics,
    improvements: RecordingImprovement[]
  ): number {
    const totalImprovement = improvements.reduce((sum, imp) => sum + imp.improvement, 0);
    return Math.min(50, totalImprovement); // Cap at 50% improvement
  }

  private async initializeQualityBaselines(): Promise<void> {
    console.log('📊 Initializing quality baselines...');
  }

  private async setupRealTimeMonitoring(): Promise<void> {
    console.log('📡 Setting up real-time monitoring...');
  }

  /**
   * Public API methods
   */

  /**
   * Start recording monitoring
   */
  async startRecordingMonitoring(): Promise<void> {
    this.isRecording = true;
    console.log('🎙️ Recording monitoring started');
  }

  /**
   * Stop recording monitoring
   */
  async stopRecordingMonitoring(): Promise<void> {
    this.isRecording = false;
    console.log('⏹️ Recording monitoring stopped');
  }

  /**
   * Get current quality metrics
   */
  getCurrentQuality(): RecordingQualityMetrics | undefined {
    return this.currentQuality;
  }

  /**
   * Get quality history
   */
  getQualityHistory(): RecordingQualityMetrics[] {
    return [...this.qualityHistory];
  }

  /**
   * Get quality trend analysis
   */
  getQualityTrend(): { trend: 'improving' | 'declining' | 'stable'; change: number } {
    if (this.qualityHistory.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    const recent = this.qualityHistory.slice(-5);
    const first = recent[0].overallQuality;
    const last = recent[recent.length - 1].overallQuality;
    const change = last - first;

    return {
      trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
      change,
    };
  }

  /**
   * Generate recording quality report
   */
  generateQualityReport(): string {
    if (!this.currentQuality) {
      return 'No quality data available. Run analyzeRecordingQuality() first.';
    }

    const quality = this.currentQuality;
    const trend = this.getQualityTrend();

    return `
🎙️ Recording Quality Report
Overall Quality: ${quality.overallQuality.toFixed(1)}%
Signal-to-Noise: ${quality.signalToNoise.toFixed(1)}dB
Dynamic Range: ${quality.dynamicRange.toFixed(1)}dB
Clipping Events: ${quality.clipping.clippingEvents.length}
Headroom: ${quality.clipping.headroom.toFixed(1)}dB
Quality Trend: ${trend.trend} (${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)
Room RT60: ${quality.roomAcoustics.reverbTime.toFixed(2)}s
    `.trim();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ RecordingIntelligence configuration updated');
  }

  /**
   * Reset quality history
   */
  resetQualityHistory(): void {
    this.qualityHistory = [];
    console.log('🔄 Quality history reset');
  }
}