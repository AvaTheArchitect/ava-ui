/**
 * ChordAnalyzer.ts - Core Guitar/Composition Intelligence
 * 🎸 Advanced chord recognition, analysis, and progression generation
 * Part of Maestro.ai Brain System
 */

import { MusicTheoryEngine } from "../composition/MusicTheoryEngine";
import { generateId } from "../../shared/utils";

// Import types from shared (all interfaces now come from shared types)
import type {
  AudioFeatures,
  ChordProgression as SharedChordProgression,
  ChordInfo,
  FretPosition,
  GuitarChordProgression,
  PracticeRecommendation,
  ChordAnalysisResult,
} from "../../shared/types";

// Import enums as regular imports (not type imports) since they're used as values
import {
  MusicGenre,
  ProgressionDifficulty,
  ChordQuality,
  ChordDifficulty,
  ChordVoicing,
} from "../../shared/types";

// Import basic constants from shared utils
import { CHROMATIC_NOTES, DEFAULTS } from "../../shared/utils";

// Import advanced audio processing from shared level
import {
  AdvancedPitchDetector,
  SpectralAnalyzer,
} from "../../shared/audioSyncUtils";

/**
 * ChordAnalyzer - Advanced chord recognition and analysis system
 * Integrates with shared MusicTheoryEngine and brain infrastructure
 */
export class ChordAnalyzer {
  private musicTheory: MusicTheoryEngine;
  private chordDatabase: Map<string, ChordInfo>;
  private progressionTemplates: GuitarChordProgression[];

  constructor() {
    this.musicTheory = new MusicTheoryEngine();
    this.chordDatabase = new Map();
    this.progressionTemplates = [];
    this.initializeChordDatabase();
    this.initializeProgressionTemplates();
  }

  /**
   * Analyze audio input to detect chords - uses advanced audio processing
   */
  async analyzeAudioForChords(
    audioData: Float32Array,
    sampleRate: number
  ): Promise<ChordAnalysisResult> {
    try {
      // Use advanced pitch detection from audioSyncUtils
      const pitchDetector = new AdvancedPitchDetector(sampleRate);
      const pitchResult = pitchDetector.detectPitch(audioData);

      // Get spectral analysis
      const fftResult = pitchDetector.computeFFT(Array.from(audioData));
      const spectralFeatures =
        SpectralAnalyzer.computeSpectralFeatures(fftResult);

      // Convert frequencies to notes using shared chromatic scale
      const notes = pitchResult.candidates
        .map((candidate) => this.frequencyToNote(candidate.freq))
        .filter((note) => note !== null);

      // Find best matching chord using shared chord intervals
      const detectedChord = this.findBestChordMatch(notes);

      // Calculate confidence based on pitch detection confidence
      const confidence = pitchResult.confidence;

      // Find alternative interpretations
      const alternativeChords = this.findAlternativeChords(notes);

      // Generate progression suggestions using music theory engine
      const suggestedProgressions = detectedChord
        ? await this.suggestProgressions(detectedChord)
        : [];

      // Generate practice recommendations
      const practiceRecommendations = this.generatePracticeRecommendations(
        detectedChord,
        notes
      );

      // Create proper AudioFeatures object matching your shared type
      // Fixed: frequency should be number, pitch should be number[]
      const amplitude = Array.from(audioData).map((sample) => Math.abs(sample));
      const audioFeatures: AudioFeatures = {
        frequency: pitchResult.frequency, // Single primary frequency (number)
        amplitude: amplitude,
        spectralCentroid: spectralFeatures.spectralCentroid,
        zeroCrossingRate: spectralFeatures.zeroCrossingRate,
        mfcc: spectralFeatures.mfcc,
        pitch: pitchResult.candidates.map((c) => c.freq), // Array of pitch candidates (number[])
        volume: spectralFeatures.spectralCentroid / 1000, // Normalized approximation
        // Required properties from AudioFeatures interface
        tempo: 120, // Default tempo - could be detected from audio analysis
        key: detectedChord?.root || "C", // Use detected chord root or default to C
        loudness:
          amplitude.reduce((sum, val) => sum + val, 0) / amplitude.length, // Average amplitude
        rhythm: [], // Placeholder - rhythm detection would require additional analysis
        confidence: confidence, // Use the pitch detection confidence
        duration: audioData.length / sampleRate, // Duration in seconds
      };

      return {
        detectedChord,
        confidence,
        alternativeChords,
        suggestedProgressions,
        practiceRecommendations,
        audioFeatures,
      };
    } catch (error) {
      console.error("Chord analysis error:", error);
      return {
        detectedChord: null,
        confidence: 0,
        alternativeChords: [],
        suggestedProgressions: [],
        practiceRecommendations: [],
      };
    }
  }

  /**
   * Analyze chord by name or notes
   */
  analyzeChord(input: string | string[]): ChordInfo | null {
    if (typeof input === "string") {
      return this.chordDatabase.get(input.toLowerCase()) || null;
    } else {
      return this.findBestChordMatch(input);
    }
  }

  /**
   * Generate chord progressions for a given key - uses shared music theory
   */
  generateProgressions(
    key: string,
    genre: MusicGenre = MusicGenre.POP,
    difficulty: ProgressionDifficulty = ProgressionDifficulty.BEGINNER
  ): GuitarChordProgression[] {
    const progressions: GuitarChordProgression[] = [];

    // Use shared music theory engine for progression generation
    const patterns = this.getProgressionPatterns(genre, difficulty);

    for (const pattern of patterns) {
      const progression = this.buildProgression(
        key,
        pattern,
        genre,
        difficulty
      );
      if (progression) {
        progressions.push(progression);
      }
    }

    return progressions.slice(0, 10); // Return top 10 suggestions
  }

  /**
   * Get chord fingerings for guitar
   */
  getChordFingerings(
    chordName: string,
    difficulty: ChordDifficulty = ChordDifficulty.BEGINNER
  ): FretPosition[][] {
    const chord = this.chordDatabase.get(chordName.toLowerCase());
    if (!chord || !chord.fretPositions) return [];

    // Group positions by voicing and filter by difficulty
    const fingerings: FretPosition[][] = [];
    const positionGroups = this.groupFretPositions(chord.fretPositions);

    for (const group of positionGroups) {
      if (this.isFingeringDifficulty(group, difficulty)) {
        fingerings.push(group);
      }
    }

    return fingerings;
  }

  /**
   * Suggest next chords in a progression
   */
  suggestNextChords(currentChords: string[], key: string): ChordInfo[] {
    const suggestions: ChordInfo[] = [];
    const currentRomanNumerals = currentChords.map((chord) =>
      this.chordToRomanNumeral(chord, key)
    );

    // Use music theory rules to suggest logical next chords
    const nextRomanNumerals = this.getLogicalNextChords(
      currentRomanNumerals,
      key
    );

    for (const roman of nextRomanNumerals) {
      const chordName = this.romanNumeralToChord(roman, key);
      const chord = this.chordDatabase.get(chordName.toLowerCase());
      if (chord) {
        suggestions.push(chord);
      }
    }

    return suggestions;
  }

  // Private Methods

  /**
   * Convert chord name to roman numeral in given key
   * Now uses MusicTheoryEngine for proper integration
   */
  private chordToRomanNumeral(chordName: string, key: string): string {
    return this.musicTheory.chordToRomanNumeral(chordName, key);
  }

  /**
   * Convert roman numeral to chord name in given key
   * Now uses MusicTheoryEngine for proper integration
   */
  private romanNumeralToChord(roman: string, key: string): string {
    return this.musicTheory.romanNumeralToChord(roman, key);
  }

  private initializeChordDatabase(): void {
    // Initialize with comprehensive chord database using shared constants
    const basicChords = [
      // Major chords - convert CHORD_INTERVALS to number arrays
      {
        name: "C",
        root: "C",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["C", "E", "G"],
      },
      {
        name: "D",
        root: "D",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["D", "F#", "A"],
      },
      {
        name: "E",
        root: "E",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["E", "G#", "B"],
      },
      {
        name: "F",
        root: "F",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["F", "A", "C"],
      },
      {
        name: "G",
        root: "G",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["G", "B", "D"],
      },
      {
        name: "A",
        root: "A",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["A", "C#", "E"],
      },
      {
        name: "B",
        root: "B",
        quality: ChordQuality.MAJOR,
        intervals: [0, 4, 7],
        notes: ["B", "D#", "F#"],
      },

      // Minor chords
      {
        name: "Cm",
        root: "C",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["C", "Eb", "G"],
      },
      {
        name: "Dm",
        root: "D",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["D", "F", "A"],
      },
      {
        name: "Em",
        root: "E",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["E", "G", "B"],
      },
      {
        name: "Fm",
        root: "F",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["F", "Ab", "C"],
      },
      {
        name: "Gm",
        root: "G",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["G", "Bb", "D"],
      },
      {
        name: "Am",
        root: "A",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["A", "C", "E"],
      },
      {
        name: "Bm",
        root: "B",
        quality: ChordQuality.MINOR,
        intervals: [0, 3, 7],
        notes: ["B", "D", "F#"],
      },
    ];

    // Add fret positions and other properties using shared utilities
    basicChords.forEach((chord) => {
      const fullChord: ChordInfo = {
        id: generateId(), // Add unique ID using shared utility
        ...chord,
        fretPositions: this.generateFretPositions(chord.notes, chord.name),
        difficulty: this.calculateChordDifficulty(chord.name),
        voicing: this.determineChordVoicing(chord.name),
      };

      this.chordDatabase.set(chord.name.toLowerCase(), fullChord);
    });
  }

  private initializeProgressionTemplates(): void {
    // Common chord progressions using shared types and constants
    this.progressionTemplates = [
      {
        id: generateId(),
        key: "C",
        scale: "major",
        numerals: ["I", "V", "vi", "IV"], // Required base property
        romanNumerals: ["I", "V", "vi", "IV"], // Guitar-specific property
        chords: [], // Will be populated when needed
        genre: [MusicGenre.POP],
        commonality: "very-common" as const, // Required base property
        emotional: "happy" as const, // Required base property
        difficulty: ProgressionDifficulty.BEGINNER,
        tempo: DEFAULTS.tempo || 120,
        timeSignature: "4/4",
        measures: 4,
        practiceNotes: [
          "Start with simple strumming",
          "Focus on clean chord transitions",
        ],
      },
      {
        id: generateId(),
        key: "C",
        scale: "major",
        numerals: ["ii", "V", "I"], // Required base property
        romanNumerals: ["ii", "V", "I"], // Guitar-specific property
        chords: [],
        genre: [MusicGenre.JAZZ],
        commonality: "common" as const, // Required base property
        emotional: "resolved" as const, // Required base property
        difficulty: ProgressionDifficulty.INTERMEDIATE,
        tempo: 120,
        timeSignature: "4/4",
        measures: 3,
        practiceNotes: [
          "Classic jazz progression",
          "Practice with swing rhythm",
        ],
      },
      {
        id: generateId(),
        key: "A",
        scale: "minor",
        numerals: ["i", "VII", "VI", "VII"], // Required base property
        romanNumerals: ["i", "VII", "VI", "VII"], // Guitar-specific property
        chords: [],
        genre: [MusicGenre.ROCK],
        commonality: "common" as const, // Required base property
        emotional: "powerful" as const, // Required base property
        difficulty: ProgressionDifficulty.BEGINNER,
        tempo: 140,
        timeSignature: "4/4",
        measures: 4,
        practiceNotes: [
          "Popular rock progression",
          "Use power chords for rock sound",
        ],
      },
    ];
  }

  private frequencyToNote(frequency: number): string {
    const A4 = 440;

    // Use shared CHROMATIC_NOTES instead of hardcoded array
    const semitoneOffset = Math.round(12 * Math.log2(frequency / A4));
    const noteIndex = (9 + semitoneOffset) % 12;

    return CHROMATIC_NOTES[noteIndex];
  }

  private findBestChordMatch(notes: string[]): ChordInfo | null {
    let bestMatch: ChordInfo | null = null;
    let bestScore = 0;

    // ✅ FIXED: Convert Map to Array for ES5 compatibility
    const chordEntries = Array.from(this.chordDatabase.entries());
    for (let i = 0; i < chordEntries.length; i++) {
      const [_, chord] = chordEntries[i];
      const score = this.calculateChordMatchScore(notes, chord.notes);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = chord;
      }
    }

    return bestScore > 0.6 ? bestMatch : null; // Minimum 60% match
  }

  private calculateChordMatchScore(
    detectedNotes: string[],
    chordNotes: string[]
  ): number {
    let matches = 0;
    for (const note of chordNotes) {
      if (detectedNotes.includes(note)) {
        matches++;
      }
    }
    return matches / chordNotes.length;
  }

  private findAlternativeChords(notes: string[]): ChordInfo[] {
    const alternatives: ChordInfo[] = [];

    // ✅ FIXED: Use Map.values() for ES5 compatibility
    const chords = Array.from(this.chordDatabase.values());
    for (let i = 0; i < chords.length; i++) {
      const chord = chords[i];
      const score = this.calculateChordMatchScore(notes, chord.notes);
      if (score > 0.4 && score < 0.9) {
        // Partial matches
        alternatives.push(chord);
      }
    }

    return alternatives.slice(0, 3); // Top 3 alternatives
  }

  private async suggestProgressions(
    chord: ChordInfo
  ): Promise<GuitarChordProgression[]> {
    // Use music theory engine to find progressions that include this chord
    const suggestions: GuitarChordProgression[] = [];

    for (const template of this.progressionTemplates) {
      if (template.romanNumerals && template.romanNumerals.length > 0) {
        const matchesProgression = template.romanNumerals.some((roman) => {
          const chordName = this.romanNumeralToChord(roman, template.key);
          return chordName.toLowerCase() === chord.name.toLowerCase();
        });

        if (matchesProgression) {
          suggestions.push(template);
        }
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  private generatePracticeRecommendations(
    chord: ChordInfo | null,
    notes: string[]
  ): PracticeRecommendation[] {
    const recommendations: PracticeRecommendation[] = [];

    if (chord) {
      // Fingering practice
      if (
        chord.difficulty === ChordDifficulty.ADVANCED ||
        chord.difficulty === ChordDifficulty.EXPERT
      ) {
        recommendations.push({
          type: "fingering",
          description: `Practice ${chord.name} chord fingering slowly, focusing on clean note separation`,
          difficulty: chord.difficulty,
          estimatedTime: 10,
        });
      }

      // Theory practice
      recommendations.push({
        type: "theory",
        description: `Learn the theory behind ${
          chord.name
        }: contains notes ${chord.notes.join(", ")}`,
        difficulty: ChordDifficulty.INTERMEDIATE,
        estimatedTime: 5,
      });
    }

    if (notes.length > 0) {
      recommendations.push({
        type: "strumming",
        description:
          "Practice consistent strumming patterns with detected chords",
        difficulty: ChordDifficulty.BEGINNER,
        estimatedTime: 15,
      });
    }

    return recommendations;
  }

  private getProgressionPatterns(
    genre: MusicGenre,
    _difficulty: ProgressionDifficulty
  ): string[][] {
    const patterns: { [key: string]: string[][] } = {
      [MusicGenre.POP]: [
        ["I", "V", "vi", "IV"],
        ["vi", "IV", "I", "V"],
        ["I", "vi", "IV", "V"],
      ],
      [MusicGenre.ROCK]: [
        ["i", "VII", "VI", "VII"],
        ["i", "iv", "V", "i"],
        ["I", "VII", "IV", "I"],
      ],
      [MusicGenre.JAZZ]: [
        ["ii", "V", "I"],
        ["I", "vi", "ii", "V"],
        ["iii", "vi", "ii", "V"],
      ],
    };

    return patterns[genre] || patterns[MusicGenre.POP];
  }

  private buildProgression(
    key: string,
    pattern: string[],
    genre: MusicGenre,
    difficulty: ProgressionDifficulty
  ): GuitarChordProgression | null {
    const chords: ChordInfo[] = [];

    for (const roman of pattern) {
      const chordName = this.romanNumeralToChord(roman, key);
      const chord = this.chordDatabase.get(chordName.toLowerCase());
      if (chord) {
        chords.push(chord);
      }
    }

    if (chords.length === pattern.length) {
      return {
        id: generateId(), // Use shared utility
        key,
        scale: "major", // Added scale property - could be determined from pattern
        numerals: pattern, // Required base property
        romanNumerals: pattern, // Guitar-specific property
        chords,
        genre: [genre],
        commonality: "common" as const, // Required base property
        emotional: this.determineEmotionalCharacter(pattern), // Required base property
        difficulty,
        tempo: DEFAULTS.tempo || 120, // Use shared default
        timeSignature: "4/4",
        measures: pattern.length,
      };
    }

    return null;
  }

  /**
   * Determine emotional character based on chord progression pattern
   */
  private determineEmotionalCharacter(
    pattern: string[]
  ): "happy" | "sad" | "tense" | "resolved" | "mysterious" | "powerful" {
    const minorChords = pattern.filter(
      (numeral) => numeral.toLowerCase() === numeral
    ).length;
    const hasV = pattern.some((numeral) => numeral.toUpperCase() === "V");
    const hasI = pattern.some((numeral) => numeral.toUpperCase() === "I");

    if (minorChords > pattern.length / 2) return "sad";
    if (hasV && hasI) return "resolved";
    if (hasV) return "tense";
    if (pattern.includes("vi") || pattern.includes("VI")) return "mysterious";
    if (pattern.includes("VII") || pattern.includes("bVII")) return "powerful";
    return "happy";
  }

  private generateFretPositions(
    _notes: string[],
    chordName: string
  ): FretPosition[] {
    // Simplified fret position generation
    // In production, this would use a comprehensive chord database

    // Basic open chord positions (simplified)
    const openPositions: { [key: string]: FretPosition[] } = {
      C: [
        { string: 1, fret: 0, note: "E" },
        { string: 2, fret: 1, finger: 1, note: "C" },
        { string: 3, fret: 0, note: "G" },
        { string: 4, fret: 2, finger: 2, note: "E" },
        { string: 5, fret: 3, finger: 3, note: "C", isRoot: true },
        { string: 6, fret: -1, note: "" }, // Not played
      ],
      G: [
        { string: 1, fret: 3, finger: 3, note: "G" },
        { string: 2, fret: 0, note: "B" },
        { string: 3, fret: 0, note: "G" },
        { string: 4, fret: 0, note: "D" },
        { string: 5, fret: 2, finger: 1, note: "B" },
        { string: 6, fret: 3, finger: 2, note: "G", isRoot: true },
      ],
    };

    return openPositions[chordName] || [];
  }

  private calculateChordDifficulty(chordName: string): ChordDifficulty {
    // Simplified difficulty calculation
    if (chordName.includes("7") || chordName.includes("9")) {
      return ChordDifficulty.INTERMEDIATE;
    }
    if (chordName.includes("sus") || chordName.includes("add")) {
      return ChordDifficulty.INTERMEDIATE;
    }
    if (["F", "B", "Fm", "Bm"].includes(chordName)) {
      return ChordDifficulty.INTERMEDIATE;
    }
    return ChordDifficulty.BEGINNER;
  }

  private determineChordVoicing(chordName: string): ChordVoicing {
    if (["F", "Fm", "B", "Bm"].includes(chordName)) {
      return ChordVoicing.BARRE;
    }
    if (chordName.includes("7") || chordName.includes("9")) {
      return ChordVoicing.JAZZ;
    }
    return ChordVoicing.OPEN;
  }

  private groupFretPositions(positions: FretPosition[]): FretPosition[][] {
    // Group positions by voicing type
    return [positions]; // Simplified - in production, would group by actual voicings
  }

  private isFingeringDifficulty(
    _positions: FretPosition[],
    difficulty: ChordDifficulty
  ): boolean {
    // Determine if fingering matches difficulty level
    // For now, simplified logic based on difficulty level
    // In production, would analyze actual fret positions

    switch (difficulty) {
      case ChordDifficulty.BEGINNER:
        return true; // All beginner chords are accessible
      case ChordDifficulty.INTERMEDIATE:
        return true; // Most intermediate chords are accessible
      default:
        return true; // For now, allow all difficulties
    }
  }

  private getLogicalNextChords(
    currentRomanNumerals: string[],
    key: string
  ): string[] {
    // Use the MusicTheoryEngine for sophisticated progression logic
    return this.musicTheory.getLogicalNextChords(currentRomanNumerals, key);
  }
}

// Export default instance
export const chordAnalyzer = new ChordAnalyzer();
export default ChordAnalyzer;
