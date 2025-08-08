// 🎵 CORE PITCH ANALYZER - Dual Purpose: Vocal Pitch + Guitar Tuning
// File: maestro-modules/hooks/usePitchAnalyzer.ts

import { useState, useEffect, useCallback, useRef } from "react";

// ✅ Core Configuration Interface
export interface PitchAnalysisConfig {
  sampleRate: number;
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
  frequencyRange: {
    min: number;
    max: number;
  };
  confidenceThreshold: number;
}

// ✅ Universal Pitch Data Interface
export interface PitchData {
  frequency: number;
  note: string;
  octave: number;
  cents: number; // How many cents off from perfect pitch
  confidence: number;
  amplitude: number;
  timestamp: number;
}

// ✅ Optimized Presets for Dual Purpose
export const PITCH_ANALYZER_PRESETS = {
  // 🎤 VOCAL MODE - Optimized for pitch accuracy, vibrato, melody
  vocal: {
    sampleRate: 44100,
    fftSize: 8192, // Higher resolution for vocal nuances
    smoothingTimeConstant: 0.6, // Less smoothing for vibrato detection
    minDecibels: -80, // More sensitive for quiet vocals
    maxDecibels: -10,
    frequencyRange: { min: 80, max: 1100 }, // Full vocal range
    confidenceThreshold: 0.7,
  } as PitchAnalysisConfig,

  // 🎸 GUITAR MODE - Optimized for tuning accuracy, chord detection
  guitar: {
    sampleRate: 44100,
    fftSize: 4096, // Good balance for guitar harmonics
    smoothingTimeConstant: 0.9, // More smoothing for stable tuning
    minDecibels: -70, // Less sensitive than vocals
    maxDecibels: -10,
    frequencyRange: { min: 80, max: 350 }, // Guitar range (E2-E4)
    confidenceThreshold: 0.8,
  } as PitchAnalysisConfig,

  // 🎵 GENERAL MODE - Balanced for both purposes
  general: {
    sampleRate: 44100,
    fftSize: 4096,
    smoothingTimeConstant: 0.8,
    minDecibels: -75,
    maxDecibels: -10,
    frequencyRange: { min: 50, max: 2000 },
    confidenceThreshold: 0.75,
  } as PitchAnalysisConfig,
};

export function usePitchAnalyzer(config?: Partial<PitchAnalysisConfig>) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // ✅ Merge config with general preset as default
  const analyzerConfig: PitchAnalysisConfig = {
    ...PITCH_ANALYZER_PRESETS.general,
    ...config,
  };

  // ✅ Enhanced pitch detection with confidence filtering
  const detectPitch = useCallback(
    (audioBuffer: Float32Array): PitchData | null => {
      const correlations = autoCorrelate(
        audioBuffer,
        analyzerConfig.sampleRate
      );

      // Filter by frequency range
      if (
        correlations.frequency < analyzerConfig.frequencyRange.min ||
        correlations.frequency > analyzerConfig.frequencyRange.max
      ) {
        return null;
      }

      // Filter by confidence threshold
      if (correlations.confidence < analyzerConfig.confidenceThreshold) {
        return null;
      }

      const noteData = frequencyToNote(correlations.frequency);

      return {
        frequency: correlations.frequency,
        note: noteData.note,
        octave: noteData.octave,
        cents: noteData.cents,
        confidence: correlations.confidence,
        amplitude: correlations.amplitude,
        timestamp: Date.now(),
      };
    },
    [analyzerConfig]
  );

  // ✅ Enhanced audio initialization
  const startAnalysis = useCallback(async () => {
    try {
      // Request microphone with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: analyzerConfig.sampleRate,
          channelCount: 1,
        },
      });

      const context = new AudioContext({
        sampleRate: analyzerConfig.sampleRate,
      });

      // Resume context if suspended
      if (context.state === "suspended") {
        await context.resume();
      }

      const analyzer = context.createAnalyser();
      const source = context.createMediaStreamSource(stream);

      // Configure analyzer
      analyzer.fftSize = analyzerConfig.fftSize;
      analyzer.smoothingTimeConstant = analyzerConfig.smoothingTimeConstant;
      analyzer.minDecibels = analyzerConfig.minDecibels;
      analyzer.maxDecibels = analyzerConfig.maxDecibels;

      source.connect(analyzer);

      setAudioContext(context);
      analyzerRef.current = analyzer;
      sourceRef.current = source;
      setIsAnalyzing(true);

      // Start analysis loop
      analyzeLoop(analyzer);
    } catch (error) {
      console.error("Failed to start pitch analysis:", error);
    }
  }, [analyzerConfig]);

  // ✅ Optimized analysis loop
  const analyzeLoop = useCallback(
    (analyzer: AnalyserNode) => {
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      const analyze = () => {
        if (!isAnalyzing) return;

        analyzer.getFloatTimeDomainData(dataArray);
        const pitchData = detectPitch(dataArray);

        if (pitchData) {
          setCurrentPitch(pitchData);
        }

        animationRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    },
    [isAnalyzing, detectPitch]
  );

  // ✅ Clean shutdown
  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false);

    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Stop media stream
    if (sourceRef.current && sourceRef.current.mediaStream) {
      sourceRef.current.mediaStream
        .getTracks()
        .forEach((track) => track.stop());
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close();
      setAudioContext(null);
    }

    setCurrentPitch(null);
  }, [audioContext]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    isAnalyzing,
    currentPitch,
    startAnalysis,
    stopAnalysis,
    detectPitch, // Expose for custom use
    config: analyzerConfig, // Expose current config
  };
}

// ✅ Enhanced autocorrelation with better peak detection
function autoCorrelate(buffer: Float32Array, sampleRate: number) {
  const SIZE = buffer.length;
  const correlations = new Float32Array(SIZE);

  // Calculate autocorrelation
  for (let lag = 0; lag < SIZE; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum / (SIZE - lag);
  }

  // Find the best peak with minimum/maximum period constraints
  let bestCorrelation = 0;
  let bestOffset = -1;
  const minPeriod = Math.floor(sampleRate / 2000); // 2000 Hz max
  const maxPeriod = Math.floor(sampleRate / 50); // 50 Hz min

  for (let i = minPeriod; i < Math.min(maxPeriod, SIZE / 2); i++) {
    if (correlations[i] > bestCorrelation) {
      bestCorrelation = correlations[i];
      bestOffset = i;
    }
  }

  const frequency = bestOffset > 0 ? sampleRate / bestOffset : 0;
  const confidence = bestOffset > 0 ? bestCorrelation / correlations[0] : 0;
  const amplitude = Math.sqrt(correlations[0] / SIZE);

  return {
    frequency,
    confidence,
    amplitude,
  };
}

// ✅ Enhanced note detection with better octave handling
function frequencyToNote(frequency: number) {
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  const semitoneRatio = Math.pow(2, 1 / 12);

  if (frequency <= 0) {
    return { note: "N/A", octave: 0, cents: 0 };
  }

  const semitones = Math.round(12 * Math.log2(frequency / C0));
  const noteIndex = ((semitones % 12) + 12) % 12; // Ensure positive
  const octave = Math.floor(semitones / 12);

  const notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const note = notes[noteIndex];

  const expectedFreq = C0 * Math.pow(semitoneRatio, semitones);
  const cents = Math.round(1200 * Math.log2(frequency / expectedFreq));

  return { note, octave, cents };
}

// ✅ Utility function for note matching (useful for tuners)
export function isNoteMatch(
  current: string,
  target: string,
  cents: number,
  tolerance: number = 10
): boolean {
  return current === target && Math.abs(cents) <= tolerance;
}

export default usePitchAnalyzer;
