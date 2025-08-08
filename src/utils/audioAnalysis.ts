// 🔊 AUDIO ANALYSIS UTILITIES - Advanced DSP Functions
// File: maestro-ai/src/utils/audioAnalysis.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// 🎯 Advanced FFT Analysis
export interface FFTResult {
  frequencies: Float32Array;
  magnitudes: Float32Array;
  phases: Float32Array;
  sampleRate: number;
  binSize: number;
}

export interface SpectralFeatures {
  spectralCentroid: number; // Brightness measure
  spectralRolloff: number; // High frequency content
  spectralFlux: number; // Change in spectrum
  spectralFlatness: number; // Noisiness measure
  zeroCrossingRate: number; // Pitch-related measure
  mfcc: number[]; // Mel-frequency cepstral coefficients
}

export interface HarmonicAnalysis {
  fundamentalFreq: number;
  harmonics: { frequency: number; magnitude: number; phase: number }[];
  harmonicity: number; // How harmonic the signal is (0-1)
  inharmonicity: number; // Deviation from perfect harmonics
  oddEvenRatio: number; // Ratio of odd to even harmonics
}

export interface OnsetDetection {
  onsets: number[]; // Timestamps of detected onsets
  strength: number[]; // Strength of each onset
  tempo: number; // Estimated tempo in BPM
  confidence: number; // Confidence in tempo estimation
}

// 🎵 Advanced Pitch Detection using Multiple Algorithms
export class AdvancedPitchDetector {
  private sampleRate: number;
  private windowSize: number;
  private hopSize: number;
  private previousBuffer: Float32Array | null = null;

  constructor(sampleRate: number = 44100, windowSize: number = 4096) {
    this.sampleRate = sampleRate;
    this.windowSize = windowSize;
    this.hopSize = windowSize / 4;
  }

  // 🎯 Multi-algorithm pitch detection for increased accuracy
  detectPitch(audioBuffer: Float32Array): {
    frequency: number;
    confidence: number;
    algorithm: string;
    candidates: { freq: number; strength: number }[];
  } {
    const algorithms = [
      {
        name: "autocorrelation",
        detector: this.autocorrelationPitch.bind(this),
      },
      { name: "cepstrum", detector: this.cepstrumPitch.bind(this) },
      { name: "harmonic", detector: this.harmonicPitch.bind(this) },
      { name: "mcleod", detector: this.mcleodPitch.bind(this) },
    ];

    const results = algorithms.map((alg) => ({
      ...alg.detector(audioBuffer),
      algorithm: alg.name,
    }));

    // Combine results with confidence weighting
    const bestResult = this.combineResults(results);
    return bestResult;
  }

  // 🎵 Enhanced autocorrelation with parabolic interpolation
  private autocorrelationPitch(buffer: Float32Array): {
    frequency: number;
    confidence: number;
    candidates: { freq: number; strength: number }[];
  } {
    const correlations = new Float32Array(buffer.length);

    // Calculate autocorrelation
    for (let lag = 0; lag < buffer.length; lag++) {
      let sum = 0;
      for (let i = 0; i < buffer.length - lag; i++) {
        sum += buffer[i] * buffer[i + lag];
      }
      correlations[lag] = sum / (buffer.length - lag);
    }

    // Find peaks with parabolic interpolation
    const candidates = this.findPeaksWithInterpolation(correlations);
    const bestCandidate = candidates[0] || { freq: 0, strength: 0 };

    return {
      frequency: bestCandidate.freq,
      confidence: bestCandidate.strength,
      candidates,
    };
  }

  // 🎵 Cepstrum-based pitch detection
  private cepstrumPitch(buffer: Float32Array): {
    frequency: number;
    confidence: number;
    candidates: { freq: number; strength: number }[];
  } {
    // Real cepstrum = IFFT(log(|FFT(x)|))
    const fft = this.computeFFT(Array.from(buffer));
    const logMagnitudes = Array.from(fft.magnitudes).map((mag) =>
      Math.log(Math.max(mag, 1e-10))
    );
    const cepstrum = this.computeIFFT(logMagnitudes);

    // Find the prominent peak in the cepstrum
    const candidates = this.findPeaksWithInterpolation(cepstrum);
    const bestCandidate = candidates[0] || { freq: 0, strength: 0 };

    return {
      frequency: bestCandidate.freq,
      confidence: bestCandidate.strength,
      candidates,
    };
  }

  // 🎵 Harmonic product spectrum
  private harmonicPitch(buffer: Float32Array): {
    frequency: number;
    confidence: number;
    candidates: { freq: number; strength: number }[];
  } {
    const fft = this.computeFFT(Array.from(buffer));
    const spectrum = fft.magnitudes;

    // Create harmonic product spectrum
    const hps = new Float32Array(spectrum.length);
    const maxHarmonic = 5;

    for (let i = 0; i < spectrum.length; i++) {
      let product = spectrum[i];
      for (let h = 2; h <= maxHarmonic; h++) {
        const harmonicIndex = Math.floor(i / h);
        if (harmonicIndex < spectrum.length) {
          product *= spectrum[harmonicIndex];
        }
      }
      hps[i] = product;
    }

    const candidates = this.findPeaksWithInterpolation(hps);
    const bestCandidate = candidates[0] || { freq: 0, strength: 0 };

    return {
      frequency: bestCandidate.freq,
      confidence: bestCandidate.strength,
      candidates,
    };
  }

  // 🎵 McLeod Pitch Method (advanced autocorrelation)
  private mcleodPitch(buffer: Float32Array): {
    frequency: number;
    confidence: number;
    candidates: { freq: number; strength: number }[];
  } {
    const nsdf = this.normalizedSquareDifference(buffer);
    const candidates = this.findPeaksWithInterpolation(nsdf);
    const bestCandidate = candidates[0] || { freq: 0, strength: 0 };

    return {
      frequency: bestCandidate.freq,
      confidence: bestCandidate.strength,
      candidates,
    };
  }

  // 🎯 Helper methods
  private normalizedSquareDifference(buffer: Float32Array): Float32Array {
    const nsdf = new Float32Array(buffer.length / 2);

    for (let tau = 0; tau < nsdf.length; tau++) {
      let acf = 0;
      let divisorM = 0;

      for (let i = 0; i < buffer.length - tau; i++) {
        acf += buffer[i] * buffer[i + tau];
        divisorM += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
      }

      nsdf[tau] = divisorM > 0 ? (2 * acf) / divisorM : 0;
    }

    return nsdf;
  }

  private findPeaksWithInterpolation(
    data: Float32Array
  ): { freq: number; strength: number }[] {
    const peaks = [];
    const minPeriod = Math.floor(this.sampleRate / 2000); // 2000 Hz max
    const maxPeriod = Math.floor(this.sampleRate / 50); // 50 Hz min

    for (let i = minPeriod; i < Math.min(maxPeriod, data.length - 1); i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > 0.1) {
        // Parabolic interpolation for sub-sample accuracy
        const y1 = data[i - 1];
        const y2 = data[i];
        const y3 = data[i + 1];

        const xPeak = (y3 - y1) / (2 * (2 * y2 - y1 - y3));
        const interpolatedIndex = i + xPeak;
        const frequency = this.sampleRate / interpolatedIndex;

        peaks.push({
          freq: frequency,
          strength: y2 + 0.25 * (y3 - y1) * xPeak,
        });
      }
    }

    return peaks.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  private combineResults(results: any[]): any {
    // Weight results by confidence and find consensus
    const validResults = results.filter(
      (r) => r.frequency > 50 && r.frequency < 2000
    );

    if (validResults.length === 0) {
      return { frequency: 0, confidence: 0, algorithm: "none", candidates: [] };
    }

    // Find the most confident result
    const bestResult = validResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return bestResult;
  }

  // ✅ FIXED: Returns FFTResult object instead of number[]
  public computeFFT(audioData: number[]): FFTResult {
    const fftSize = audioData.length;
    const frequencies = new Float32Array(fftSize / 2);
    const magnitudes = new Float32Array(fftSize / 2);
    const phases = new Float32Array(fftSize / 2);

    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < fftSize; n++) {
        const angle = (-2 * Math.PI * k * n) / fftSize;
        real += audioData[n] * Math.cos(angle);
        imag += audioData[n] * Math.sin(angle);
      }

      frequencies[k] = (k * this.sampleRate) / fftSize;
      magnitudes[k] = Math.sqrt(real * real + imag * imag);
      phases[k] = Math.atan2(imag, real);
    }

    return {
      frequencies,
      magnitudes,
      phases,
      sampleRate: this.sampleRate,
      binSize: this.sampleRate / fftSize,
    };
  }

  private computeIFFT(data: number[]): Float32Array {
    // Simplified IFFT - in production, use a proper FFT library
    const result = new Float32Array(data.length);

    for (let n = 0; n < data.length; n++) {
      let sum = 0;
      for (let k = 0; k < data.length; k++) {
        const angle = (2 * Math.PI * k * n) / data.length;
        sum += data[k] * Math.cos(angle);
      }
      result[n] = sum / data.length;
    }

    return result;
  }
}

// 🎵 Spectral Analysis Functions
export class SpectralAnalyzer {
  static computeSpectralFeatures(fft: FFTResult): SpectralFeatures {
    const { frequencies, magnitudes } = fft;

    // Spectral Centroid (brightness)
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < frequencies.length; i++) {
      numerator += frequencies[i] * magnitudes[i];
      denominator += magnitudes[i];
    }
    const spectralCentroid = denominator > 0 ? numerator / denominator : 0;

    // Spectral Rolloff (85% of energy)
    const totalEnergy = Array.from(magnitudes).reduce(
      (sum, mag) => sum + mag * mag,
      0
    );
    const rolloffThreshold = 0.85 * totalEnergy;
    let cumulativeEnergy = 0;
    let spectralRolloff = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i] * magnitudes[i];
      if (cumulativeEnergy >= rolloffThreshold) {
        spectralRolloff = frequencies[i];
        break;
      }
    }

    // Spectral Flux (change in spectrum)
    const spectralFlux = 0; // Would need previous frame for comparison

    // Spectral Flatness (noisiness)
    const geometricMean = Math.exp(
      Array.from(magnitudes).reduce(
        (sum, mag) => sum + Math.log(Math.max(mag, 1e-10)),
        0
      ) / magnitudes.length
    );
    const arithmeticMean =
      Array.from(magnitudes).reduce((sum, mag) => sum + mag, 0) /
      magnitudes.length;
    const spectralFlatness =
      arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    // Zero Crossing Rate (would need time domain signal)
    const zeroCrossingRate = 0;

    // MFCC (simplified)
    const mfcc = this.computeMFCC(magnitudes);

    return {
      spectralCentroid,
      spectralRolloff,
      spectralFlux,
      spectralFlatness,
      zeroCrossingRate,
      mfcc,
    };
  }

  private static computeMFCC(magnitudes: Float32Array): number[] {
    // Simplified MFCC computation
    const numFilters = 13;
    const mfcc = new Array(numFilters).fill(0);

    // This would typically involve mel filter banks and DCT
    // Simplified version for demonstration
    for (let i = 0; i < numFilters; i++) {
      const startBin = Math.floor((i * magnitudes.length) / numFilters);
      const endBin = Math.floor(((i + 1) * magnitudes.length) / numFilters);

      let sum = 0;
      for (let j = startBin; j < endBin; j++) {
        sum += magnitudes[j];
      }
      mfcc[i] = Math.log(Math.max(sum, 1e-10));
    }

    return mfcc;
  }
}

// 🎵 Harmonic Analysis
export class HarmonicAnalyzer {
  static analyzeHarmonics(
    fft: FFTResult,
    fundamentalFreq: number
  ): HarmonicAnalysis {
    const { frequencies, magnitudes } = fft;
    const harmonics = [];
    const maxHarmonic = 10;

    // Find harmonics
    for (let h = 1; h <= maxHarmonic; h++) {
      const targetFreq = fundamentalFreq * h;
      const binIndex = this.findClosestBin(frequencies, targetFreq);

      if (binIndex >= 0 && binIndex < magnitudes.length) {
        harmonics.push({
          frequency: frequencies[binIndex],
          magnitude: magnitudes[binIndex],
          phase: 0, // Would use phase data if available
        });
      }
    }

    // Calculate harmonicity
    const harmonicity = this.calculateHarmonicity(harmonics, fundamentalFreq);
    const inharmonicity = this.calculateInharmonicity(
      harmonics,
      fundamentalFreq
    );
    const oddEvenRatio = this.calculateOddEvenRatio(harmonics);

    return {
      fundamentalFreq,
      harmonics,
      harmonicity,
      inharmonicity,
      oddEvenRatio,
    };
  }

  private static findClosestBin(
    frequencies: Float32Array,
    targetFreq: number
  ): number {
    let closestIndex = 0;
    let minDiff = Math.abs(frequencies[0] - targetFreq);

    for (let i = 1; i < frequencies.length; i++) {
      const diff = Math.abs(frequencies[i] - targetFreq);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    return closestIndex;
  }

  private static calculateHarmonicity(
    harmonics: any[],
    fundamental: number
  ): number {
    if (harmonics.length < 2) return 0;

    let totalError = 0;
    for (let i = 0; i < harmonics.length; i++) {
      const expectedFreq = fundamental * (i + 1);
      const actualFreq = harmonics[i].frequency;
      const error = Math.abs(actualFreq - expectedFreq) / expectedFreq;
      totalError += error;
    }

    return Math.max(0, 1 - totalError / harmonics.length);
  }

  private static calculateInharmonicity(
    harmonics: any[],
    fundamental: number
  ): number {
    // Measure of how much the harmonics deviate from perfect integer ratios
    let totalInharmonicity = 0;

    for (let i = 1; i < harmonics.length; i++) {
      const expectedRatio = i + 1;
      const actualRatio = harmonics[i].frequency / fundamental;
      const deviation = Math.abs(actualRatio - expectedRatio) / expectedRatio;
      totalInharmonicity += deviation;
    }

    return harmonics.length > 1
      ? totalInharmonicity / (harmonics.length - 1)
      : 0;
  }

  private static calculateOddEvenRatio(harmonics: any[]): number {
    let oddSum = 0;
    let evenSum = 0;

    harmonics.forEach((harmonic, index) => {
      const harmonicNumber = index + 1;
      if (harmonicNumber % 2 === 1) {
        oddSum += harmonic.magnitude;
      } else {
        evenSum += harmonic.magnitude;
      }
    });

    return evenSum > 0 ? oddSum / evenSum : 0;
  }
}

// 🎵 Onset Detection
export class OnsetDetector {
  private previousSpectrum: Float32Array | null = null;
  private onsetHistory: number[] = [];

  detectOnsets(
    audioBuffer: Float32Array,
    sampleRate: number,
    timestamp: number
  ): OnsetDetection {
    const fftSize = 1024;
    const hopSize = 512;
    const onsets = [];
    const strength = [];

    // Process in overlapping windows
    const detector = new AdvancedPitchDetector(sampleRate, fftSize);
    for (let pos = 0; pos < audioBuffer.length - fftSize; pos += hopSize) {
      const window = audioBuffer.slice(pos, pos + fftSize);
      const fft = detector.computeFFT(Array.from(window));

      if (this.previousSpectrum) {
        const onsetStrength = this.computeSpectralFlux(
          this.previousSpectrum,
          fft.magnitudes
        );
        const onsetTime = timestamp + (pos / sampleRate) * 1000;

        if (onsetStrength > 0.1) {
          // Threshold for onset detection
          onsets.push(onsetTime);
          strength.push(onsetStrength);
        }
      }

      this.previousSpectrum = new Float32Array(fft.magnitudes);
    }

    // Update onset history for tempo estimation
    this.onsetHistory.push(...onsets);
    this.onsetHistory = this.onsetHistory.slice(-100); // Keep last 100 onsets

    const { tempo, confidence } = this.estimateTempo();

    return {
      onsets,
      strength,
      tempo,
      confidence,
    };
  }

  private computeSpectralFlux(
    prevSpectrum: Float32Array,
    currentSpectrum: Float32Array
  ): number {
    let flux = 0;
    const minLength = Math.min(prevSpectrum.length, currentSpectrum.length);

    for (let i = 0; i < minLength; i++) {
      const diff = currentSpectrum[i] - prevSpectrum[i];
      flux += Math.max(0, diff); // Half-wave rectification
    }

    return flux / minLength;
  }

  private estimateTempo(): { tempo: number; confidence: number } {
    if (this.onsetHistory.length < 4) {
      return { tempo: 0, confidence: 0 };
    }

    // Calculate inter-onset intervals
    const intervals = [];
    for (let i = 1; i < this.onsetHistory.length; i++) {
      intervals.push(this.onsetHistory[i] - this.onsetHistory[i - 1]);
    }

    // Find most common interval (simplified tempo detection)
    const avgInterval =
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const tempo = 60000 / avgInterval; // Convert ms to BPM

    // Calculate confidence based on interval consistency
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0
      ) / intervals.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance) / avgInterval);

    return { tempo, confidence };
  }
}

// 🎯 Audio Utility Functions
export class AudioUtils {
  // Apply window function to reduce spectral leakage
  static applyWindow(
    buffer: Float32Array,
    windowType: "hann" | "hamming" | "blackman" = "hann"
  ): Float32Array {
    const windowed = new Float32Array(buffer.length);

    for (let i = 0; i < buffer.length; i++) {
      let windowValue = 1;

      switch (windowType) {
        case "hann":
          windowValue =
            0.5 * (1 - Math.cos((2 * Math.PI * i) / (buffer.length - 1)));
          break;
        case "hamming":
          windowValue =
            0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (buffer.length - 1));
          break;
        case "blackman":
          windowValue =
            0.42 -
            0.5 * Math.cos((2 * Math.PI * i) / (buffer.length - 1)) +
            0.08 * Math.cos((4 * Math.PI * i) / (buffer.length - 1));
          break;
      }

      windowed[i] = buffer[i] * windowValue;
    }

    return windowed;
  }

  // Normalize audio buffer
  static normalize(buffer: Float32Array): Float32Array {
    const maxValue = Math.max(...Array.from(buffer).map(Math.abs));
    if (maxValue === 0) return buffer;

    const normalized = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      normalized[i] = buffer[i] / maxValue;
    }

    return normalized;
  }

  // Apply high-pass filter to remove DC offset and low-frequency noise
  static highPassFilter(
    buffer: Float32Array,
    cutoff: number,
    sampleRate: number
  ): Float32Array {
    const rc = 1 / (2 * Math.PI * cutoff);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);

    const filtered = new Float32Array(buffer.length);
    let prevInput = 0;
    let prevOutput = 0;

    for (let i = 0; i < buffer.length; i++) {
      filtered[i] = alpha * (prevOutput + buffer[i] - prevInput);
      prevInput = buffer[i];
      prevOutput = filtered[i];
    }

    return filtered;
  }

  // Calculate RMS (Root Mean Square) for amplitude measurement
  static calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  // Detect silence in audio buffer
  static detectSilence(
    buffer: Float32Array,
    threshold: number = 0.01
  ): boolean {
    const rms = this.calculateRMS(buffer);
    return rms < threshold;
  }
}

export default {
  AdvancedPitchDetector,
  SpectralAnalyzer,
  HarmonicAnalyzer,
  OnsetDetector,
  AudioUtils,
};
