/**
 * 🎼 MusicTheoryEngine - Comprehensive Music Intelligence Foundation
 * Enhanced with ChordAnalyzer support methods
 */
import { generateId } from "../../shared/utils";
import {
  AudioFeatures,
  Key,
  Scale,
  ChordProgression,
  GenreCharacteristics,
  MusicTheoryHarmonyAnalysis,
} from "../../shared/types";

import {
  CHROMATIC_NOTES,
  CIRCLE_OF_FIFTHS,
  SCALE_PATTERNS,
  CHORD_INTERVALS,
  KEY_ANALYSIS_WEIGHTS,
  TEMPO_THRESHOLDS,
  AUDIO_ANALYSIS,
  STEP_PROBABILITIES,
  DEFAULTS,
  ROMAN_NUMERALS,
  NUMERAL_TO_INDEX,
  KEY_SIGNATURES,
  CHORD_QUALITIES,
  type ScalePatternKey,
} from "../../shared/utils";

export class MusicTheoryEngine {
  private readonly GENRE_CHARACTERISTICS: {
    [key: string]: GenreCharacteristics;
  } = {
    rock: {
      commonProgressions: [
        ["I", "V", "vi", "IV"],
        ["I", "bVII", "IV", "I"],
        ["vi", "IV", "I", "V"],
        ["I", "IV", "V", "I"],
      ],
      preferredKeys: ["E", "A", "D", "G", "C", "F"],
      typicalChords: ["power chords", "major triads", "dominant 7th"],
      avoidedChords: ["maj7", "add9", "sus2"],
      rhythmFeatures: ["strong backbeat", "4/4 time", "driving rhythm"],
      modalInterchange: true,
      complexity: "moderate",
    },
    metal: {
      commonProgressions: [
        ["i", "bVI", "bVII", "i"],
        ["i", "bIII", "bVII", "bVI"],
        ["i", "iv", "V", "i"],
        ["i", "bII", "bVII", "i"],
      ],
      preferredKeys: ["E", "B", "F#", "C#", "D", "A"],
      typicalChords: ["power chords", "diminished", "minor triads"],
      avoidedChords: ["major 7th", "add9", "sus chords"],
      rhythmFeatures: ["complex rhythms", "odd time signatures", "palm muting"],
      modalInterchange: true,
      complexity: "complex",
    },
    country: {
      commonProgressions: [
        ["I", "V", "vi", "IV"],
        ["I", "IV", "I", "V"],
        ["vi", "V", "I", "IV"],
        ["I", "vi", "IV", "V"],
      ],
      preferredKeys: ["G", "C", "D", "A", "E", "F"],
      typicalChords: ["major triads", "dominant 7th", "sus4", "add9"],
      avoidedChords: ["diminished", "augmented", "complex extensions"],
      rhythmFeatures: ["shuffle feel", "3/4 waltz", "train beat"],
      modalInterchange: false,
      complexity: "simple",
    },
    "blues-rock": {
      commonProgressions: [
        [
          "I7",
          "I7",
          "I7",
          "I7",
          "IV7",
          "IV7",
          "I7",
          "I7",
          "V7",
          "IV7",
          "I7",
          "V7",
        ],
        ["i", "iv", "i", "V7"],
        ["I", "V", "vi", "IV"],
        ["i", "bVII", "IV", "i"],
      ],
      preferredKeys: ["E", "A", "B", "G", "C", "F"],
      typicalChords: [
        "dominant 7th",
        "9th chords",
        "power chords",
        "minor pentatonic",
      ],
      avoidedChords: ["major 7th", "sus2", "add2"],
      rhythmFeatures: ["shuffle rhythm", "12/8 feel", "swing"],
      modalInterchange: true,
      complexity: "moderate",
    },
    "contemporary-christian": {
      commonProgressions: [
        ["vi", "IV", "I", "V"],
        ["I", "V", "vi", "IV"],
        ["vi", "V", "I", "IV"],
        ["I", "vi", "IV", "V"],
      ],
      preferredKeys: ["G", "C", "D", "A", "E", "F"],
      typicalChords: ["major triads", "sus4", "add9", "major 7th"],
      avoidedChords: ["diminished", "augmented", "complex jazz chords"],
      rhythmFeatures: ["gentle rhythm", "4/4 time", "anthemic builds"],
      modalInterchange: false,
      complexity: "simple",
    },
    pop: {
      commonProgressions: [
        ["I", "V", "vi", "IV"],
        ["vi", "IV", "I", "V"],
        ["I", "vi", "IV", "V"],
        ["vi", "V", "I", "IV"],
      ],
      preferredKeys: ["C", "G", "D", "A", "F"],
      typicalChords: ["major triads", "sus4", "add9", "minor triads"],
      avoidedChords: ["complex jazz extensions"],
      rhythmFeatures: ["steady 4/4", "catchy rhythm", "danceable"],
      modalInterchange: false,
      complexity: "simple",
    },
    jazz: {
      commonProgressions: [
        ["ii7", "V7", "I"],
        ["I", "vi", "ii", "V"],
        ["iii", "vi", "ii", "V"],
        ["I", "VI7", "ii7", "V7"],
      ],
      preferredKeys: ["C", "F", "Bb", "Eb", "Ab", "Db"],
      typicalChords: ["7th chords", "9th chords", "11th chords", "13th chords"],
      avoidedChords: ["simple triads"],
      rhythmFeatures: [
        "swing rhythm",
        "complex time signatures",
        "syncopation",
      ],
      modalInterchange: true,
      complexity: "complex",
    },
  };

  // Enhanced chord mappings for better ChordAnalyzer integration
  private readonly CHORD_MAPPINGS: {
    [key: string]: { [chord: string]: string };
  } = {
    C: {
      C: "I",
      Dm: "ii",
      Em: "iii",
      F: "IV",
      G: "V",
      Am: "vi",
      "B°": "vii°",
      C7: "I7",
      Dm7: "ii7",
      Em7: "iii7",
      F7: "IV7",
      G7: "V7",
      Am7: "vi7",
    },
    G: {
      G: "I",
      Am: "ii",
      Bm: "iii",
      C: "IV",
      D: "V",
      Em: "vi",
      "F#°": "vii°",
      G7: "I7",
      Am7: "ii7",
      Bm7: "iii7",
      C7: "IV7",
      D7: "V7",
      Em7: "vi7",
    },
    D: {
      D: "I",
      Em: "ii",
      "F#m": "iii",
      G: "IV",
      A: "V",
      Bm: "vi",
      "C#°": "vii°",
      D7: "I7",
      Em7: "ii7",
      "F#m7": "iii7",
      G7: "IV7",
      A7: "V7",
      Bm7: "vi7",
    },
    A: {
      A: "I",
      Bm: "ii",
      "C#m": "iii",
      D: "IV",
      E: "V",
      "F#m": "vi",
      "G#°": "vii°",
      Am: "i",
      G: "VII",
      F: "VI",
      Dm: "iv",
      E7: "V7", // Minor key mappings
    },
    E: {
      E: "I",
      "F#m": "ii",
      "G#m": "iii",
      A: "IV",
      B: "V",
      "C#m": "vi",
      "D#°": "vii°",
      Em: "i",
      D: "VII",
      C: "VI",
      Am: "iv",
      B7: "V7", // Minor key mappings
    },
    F: {
      F: "I",
      Gm: "ii",
      Am: "iii",
      Bb: "IV",
      C: "V",
      Dm: "vi",
      "E°": "vii°",
      F7: "I7",
      Gm7: "ii7",
      Am7: "iii7",
      Bb7: "IV7",
      C7: "V7",
      Dm7: "vi7",
    },
  };

  private readonly ROMAN_TO_CHORD_MAPPINGS: {
    [key: string]: { [roman: string]: string };
  } = {
    C: {
      I: "C",
      ii: "Dm",
      iii: "Em",
      IV: "F",
      V: "G",
      vi: "Am",
      "vii°": "B°",
      I7: "C7",
      ii7: "Dm7",
      iii7: "Em7",
      IV7: "F7",
      V7: "G7",
      vi7: "Am7",
    },
    G: {
      I: "G",
      ii: "Am",
      iii: "Bm",
      IV: "C",
      V: "D",
      vi: "Em",
      "vii°": "F#°",
      I7: "G7",
      ii7: "Am7",
      iii7: "Bm7",
      IV7: "C7",
      V7: "D7",
      vi7: "Em7",
    },
    D: {
      I: "D",
      ii: "Em",
      iii: "F#m",
      IV: "G",
      V: "A",
      vi: "Bm",
      "vii°": "C#°",
      I7: "D7",
      ii7: "Em7",
      iii7: "F#m7",
      IV7: "G7",
      V7: "A7",
      vi7: "Bm7",
    },
    A: {
      I: "A",
      ii: "Bm",
      iii: "C#m",
      IV: "D",
      V: "E",
      vi: "F#m",
      "vii°": "G#°",
      i: "Am",
      VII: "G",
      VI: "F",
      iv: "Dm",
      V7: "E7", // Minor key mappings
    },
    E: {
      I: "E",
      ii: "F#m",
      iii: "G#m",
      IV: "A",
      V: "B",
      vi: "C#m",
      "vii°": "D#°",
      i: "Em",
      VII: "D",
      VI: "C",
      iv: "Am",
      V7: "B7", // Minor key mappings
    },
    F: {
      I: "F",
      ii: "Gm",
      iii: "Am",
      IV: "Bb",
      V: "C",
      vi: "Dm",
      "vii°": "E°",
      I7: "F7",
      ii7: "Gm7",
      iii7: "Am7",
      IV7: "Bb7",
      V7: "C7",
      vi7: "Dm7",
    },
  };

  constructor() {
    this.initializeEngine();
  }

  private initializeEngine(): void {
    const engineId = generateId("music-theory-engine");
    if (engineId) {
      // Engine initialized
    }
  }

  public analyzeHarmony(
    chords: string[],
    detectedKey?: string
  ): MusicTheoryHarmonyAnalysis {
    const key = detectedKey
      ? this.parseKey(detectedKey)
      : this.detectKey(chords);
    const numerals = this.chordsToNumerals(chords, key);
    const functions = this.analyzeFunctions(numerals);
    const cadences = this.detectCadences(numerals);
    const modulations = this.detectModulations(chords);
    const confidence = this.calculateConfidence(chords, key);

    return {
      key,
      chords,
      numerals,
      functions,
      cadences,
      modulations,
      nonChordTones: [],
      confidence,
    };
  }

  // NEW: Enhanced chord to roman numeral conversion for ChordAnalyzer support
  public chordToRomanNumeral(chordName: string, key: string): string {
    const normalizedKey = this.normalizeKey(key);
    const chordMap = this.CHORD_MAPPINGS[normalizedKey];

    if (chordMap && chordMap[chordName]) {
      return chordMap[chordName];
    }

    // Fallback to basic analysis if not in mapping
    const keyObj = this.parseKey(key);
    const scalePattern = this.getScalePatternForMode(keyObj.mode);
    const scaleNotes = this.generateScale(keyObj.tonic, scalePattern);

    const chordRoot = chordName.replace(/[^A-G#b]/g, "");
    const scaleIndex = scaleNotes.indexOf(chordRoot);

    if (scaleIndex !== -1) {
      const numerals =
        keyObj.mode === "major" ? ROMAN_NUMERALS.major : ROMAN_NUMERALS.minor;
      return numerals[scaleIndex] || "I";
    }

    return "I"; // Default fallback
  }

  // NEW: Enhanced roman numeral to chord conversion for ChordAnalyzer support
  public romanNumeralToChord(roman: string, key: string): string {
    const normalizedKey = this.normalizeKey(key);
    const romanMap = this.ROMAN_TO_CHORD_MAPPINGS[normalizedKey];

    if (romanMap && romanMap[roman]) {
      return romanMap[roman];
    }

    // Fallback to basic analysis if not in mapping
    const keyObj = this.parseKey(key);
    const scalePattern = this.getScalePatternForMode(keyObj.mode);
    const scaleNotes = this.generateScale(keyObj.tonic, scalePattern);

    const cleanNumeral = roman.replace(/[°+7]/g, "");
    const scaleIndex =
      NUMERAL_TO_INDEX[cleanNumeral as keyof typeof NUMERAL_TO_INDEX];

    if (scaleIndex !== undefined && scaleNotes[scaleIndex]) {
      const root = scaleNotes[scaleIndex];
      const isMinor =
        roman.toLowerCase() === roman &&
        !["iv", "v"].includes(roman.toLowerCase());
      const is7th = roman.includes("7");

      let suffix = "";
      if (isMinor) suffix += "m";
      if (is7th) suffix += "7";
      if (roman.includes("°")) suffix = "°";

      return root + suffix;
    }

    return this.getDefaultChord(key); // Better fallback
  }

  // NEW: Get suggested next chords based on music theory
  public getLogicalNextChords(
    currentRomanNumerals: string[],
    key: string
  ): string[] {
    const lastChord = currentRomanNumerals[currentRomanNumerals.length - 1];
    const keyObj = this.parseKey(key);

    // Enhanced progression rules based on music theory
    const progressionRules: { [key: string]: string[] } = {
      // Major key progressions
      I: ["V", "vi", "IV", "ii", "iii"],
      ii: ["V", "vii°", "IV"],
      iii: ["vi", "IV", "ii"],
      IV: ["V", "I", "ii", "vi"],
      V: ["I", "vi", "IV"],
      vi: ["IV", "V", "ii", "I"],
      "vii°": ["I", "iii"],

      // Minor key progressions
      i: ["iv", "V", "VII", "VI"],
      "ii°": ["V", "vii°"],
      III: ["VI", "iv", "VII"],
      iv: ["V", "i", "VII"],
      v: ["i", "VI"],
      // @ts-ignore - TypeScript incorrectly flags v/V as duplicates
      V: ["i", "VI"], // Dominant in minor
      VI: ["iv", "VII", "i"],
      VII: ["i", "VI"],

      // 7th chord progressions
      I7: ["IV", "vi", "ii7"],
      ii7: ["V7", "I"],
      V7: ["I", "vi", "IV"],
      vi7: ["ii7", "IV", "V7"],
    };

    // Genre-specific modifications
    const genreModifications = this.getGenreSpecificProgressions(keyObj.mode);

    // Handle the special case of minor dominant (V in minor context)
    let lookupKey = lastChord;
    if (keyObj.mode === "minor" && lastChord === "V") {
      lookupKey = "V_minor"; // Use the renamed key to avoid duplicate
    }

    const suggestions = progressionRules[lookupKey] ||
      progressionRules[lastChord] || ["I", "V", "vi", "IV"];

    // Combine with genre suggestions
    const combined = suggestions.concat(genreModifications);
    const unique = Array.from(new Set(combined));
    return unique.slice(0, 6);
  } // ← Make sure this closing brace exists!

  // NEW: Get chord fingering difficulty analysis
  public analyzeChordDifficulty(chordName: string): {
    difficulty: "beginner" | "intermediate" | "advanced" | "expert";
    reasons: string[];
  } {
    const reasons: string[] = [];
    let difficulty: "beginner" | "intermediate" | "advanced" | "expert" =
      "beginner";

    // Analyze chord complexity
    if (
      chordName.includes("7") ||
      chordName.includes("9") ||
      chordName.includes("11") ||
      chordName.includes("13")
    ) {
      difficulty = "intermediate";
      reasons.push("Extended harmony (7th, 9th, etc.)");
    }

    if (chordName.includes("sus") || chordName.includes("add")) {
      difficulty = "intermediate";
      reasons.push("Suspended or added tone chord");
    }

    if (["F", "B", "Fm", "Bm", "F#", "F#m", "Bb", "Bbm"].includes(chordName)) {
      difficulty = "intermediate";
      reasons.push("Requires barre chord technique");
    }

    if (
      chordName.includes("°") ||
      chordName.includes("+") ||
      chordName.includes("alt")
    ) {
      difficulty = "advanced";
      reasons.push("Altered or diminished/augmented harmony");
    }

    if (chordName.match(/[A-G][#b]?m?(maj|dim|aug)?[0-9]{2}/)) {
      difficulty = "expert";
      reasons.push("Complex jazz harmony");
    }

    return { difficulty, reasons };
  }

  public suggestChords(key: string, genre: string = "rock"): string[] {
    const keyObj = this.parseKey(key);
    const genreChar = this.GENRE_CHARACTERISTICS[genre];
    const suggestions: string[] = [];

    genreChar.commonProgressions.forEach((progression) => {
      progression.slice(0, 3).forEach((numeral) => {
        const chord = this.romanNumeralToChord(numeral, key);
        if (chord && !suggestions.includes(chord)) {
          suggestions.push(chord);
        }
      });
    });

    return suggestions.slice(0, DEFAULTS.SUGGESTION_COUNT || 6);
  }

  public generateMelody(
    key: string,
    scale: ScalePatternKey = "major",
    length: number,
    genre: string = "rock"
  ): string[] {
    const keyObj = this.parseKey(key);
    const scalePattern = this.getScalePattern(scale);
    const scaleNotes = this.generateScale(keyObj.tonic, [...scalePattern]);

    const melody: string[] = [];
    const genreChar = this.GENRE_CHARACTERISTICS[genre];
    const complexity = genreChar.complexity;
    const stepProbability = STEP_PROBABILITIES[complexity] || 0.7;

    for (let i = 0; i < length; i++) {
      const note = this.generateMelodyNote(
        i,
        melody,
        scaleNotes,
        stepProbability
      );
      melody.push(note);
    }

    return melody;
  }

  public getScale(tonic: string, scaleName: ScalePatternKey): Scale {
    const pattern = SCALE_PATTERNS[scaleName];
    if (!pattern) {
      throw new Error(`Unknown scale: ${scaleName}`);
    }

    const notes = this.generateScale(tonic, [...pattern]);
    const chords = this.generateScaleChords(tonic, [...pattern]);
    const modes = this.generateModes(scaleName);

    return {
      name: `${tonic} ${scaleName}`,
      intervals: [...pattern],
      notes,
      chords,
      modes,
    };
  }

  public detectKey(chords: string[]): Key {
    const majorScores: { [key: string]: number } = {};
    const minorScores: { [key: string]: number } = {};

    CHROMATIC_NOTES.forEach((tonic) => {
      majorScores[tonic] = this.scoreKeyFit(chords, tonic, "major");
      minorScores[tonic] = this.scoreKeyFit(chords, tonic, "minor");
    });

    const bestMajor = this.findBestKey(majorScores);
    const bestMinor = this.findBestKey(minorScores);

    if (majorScores[bestMajor] > minorScores[bestMinor]) {
      return this.createKeyObject(bestMajor, "major");
    } else {
      return this.createKeyObject(bestMinor, "minor");
    }
  }

  public analyzeAudioFeatures(
    audioFeatures: AudioFeatures
  ): MusicTheoryHarmonyAnalysis {
    const keyObj = this.parseKey(audioFeatures.key);
    const tempo = audioFeatures.tempo;
    const confidence = audioFeatures.confidence;

    const scalePattern = this.getScalePatternForMode(keyObj.mode);
    const scaleChords = this.generateScaleChords(keyObj.tonic, scalePattern);

    const tempoBasedComplexity = this.getTempoBasedComplexity(tempo);
    const chordsToAnalyze = this.getChordsForComplexity(
      scaleChords,
      tempoBasedComplexity
    );

    return {
      key: keyObj,
      chords: chordsToAnalyze,
      numerals: ROMAN_NUMERALS.major.slice(0, chordsToAnalyze.length),
      functions: this.generateFunctionsForChords(chordsToAnalyze.length),
      cadences: [],
      modulations: [],
      nonChordTones: [],
      confidence: confidence * (AUDIO_ANALYSIS.CONFIDENCE_ADJUSTMENT || 0.9),
    };
  }

  public getGenreCharacteristics(genre: string): GenreCharacteristics {
    return this.GENRE_CHARACTERISTICS[genre] || this.GENRE_CHARACTERISTICS.rock;
  }

  public generateChordProgression(
    key: string,
    genre: string,
    length: number = DEFAULTS.CHORD_PROGRESSION_LENGTH || 4
  ): ChordProgression {
    const genreChar = this.getGenreCharacteristics(genre);
    const keyObj = this.parseKey(key);

    const progressions = genreChar.commonProgressions;
    const chosenProgression = this.selectRandomProgression(progressions);

    const { chords, numerals } = this.buildChordProgression(
      chosenProgression,
      keyObj,
      genre,
      length
    );

    return {
      numerals,
      chords,
      key: key,
      genre,
      commonality: "common",
      emotional: this.getProgressionEmotion(numerals),
    };
  }

  // Enhanced private methods with ChordAnalyzer support

  private normalizeKey(key: string): string {
    // Normalize key to match our chord mappings
    const cleanKey = key.replace(/[^A-G#b]/g, "");
    return cleanKey || "C";
  }

  private getDefaultChord(key: string): string {
    // Return the tonic chord for the given key
    const keyObj = this.parseKey(key);
    return keyObj.mode === "minor" ? `${keyObj.tonic}m` : keyObj.tonic;
  }

  private getGenreSpecificProgressions(mode: "major" | "minor"): string[] {
    if (mode === "minor") {
      return ["i", "VII", "VI", "iv"];
    }
    return ["I", "V", "vi", "IV"];
  }

  private generateMelodyNote(
    index: number,
    melody: string[],
    scaleNotes: string[],
    stepProbability: number
  ): string {
    if (index === 0) {
      return Math.random() > (DEFAULTS.START_ON_FIFTH_PROBABILITY || 0.3)
        ? scaleNotes[0]
        : scaleNotes[4] || scaleNotes[0];
    }

    const lastNote = melody[index - 1];
    const lastIndex = scaleNotes.indexOf(lastNote);

    if (Math.random() < stepProbability) {
      const direction =
        Math.random() > (DEFAULTS.STEP_DIRECTION_PROBABILITY || 0.5) ? 1 : -1;
      const newIndex = Math.max(
        0,
        Math.min(scaleNotes.length - 1, lastIndex + direction)
      );
      return scaleNotes[newIndex];
    } else {
      return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
    }
  }

  private findBestKey(scores: { [key: string]: number }): string {
    return Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );
  }

  private createKeyObject(tonic: string, mode: "major" | "minor"): Key {
    return {
      tonic,
      mode,
      signature: this.getKeySignature(tonic, mode),
    };
  }

  private getScalePatternForMode(mode: "major" | "minor"): number[] {
    return mode === "major"
      ? [...SCALE_PATTERNS.major]
      : [...SCALE_PATTERNS.minor];
  }

  private getTempoBasedComplexity(tempo: number): "fast" | "moderate" | "slow" {
    if (tempo > (TEMPO_THRESHOLDS.FAST || 140)) return "fast";
    if (tempo > (TEMPO_THRESHOLDS.MODERATE || 100)) return "moderate";
    return "slow";
  }

  private getChordsForComplexity(
    scaleChords: string[],
    complexity: "fast" | "moderate" | "slow"
  ): string[] {
    const chordCounts = { fast: 3, moderate: 4, slow: 4 };
    return scaleChords.slice(0, chordCounts[complexity]);
  }

  private generateFunctionsForChords(count: number): string[] {
    const functions = ["Tonic", "Subdominant", "Mediant", "Subdominant"];
    return functions.slice(0, count);
  }

  private selectRandomProgression(progressions: string[][]): string[] {
    return progressions[Math.floor(Math.random() * progressions.length)];
  }

  private buildChordProgression(
    chosenProgression: string[],
    keyObj: Key,
    genre: string,
    length: number
  ): { chords: string[]; numerals: string[] } {
    const chords: string[] = [];
    const numerals = chosenProgression.slice(0, length);

    numerals.forEach((numeral) => {
      const chord = this.romanNumeralToChord(numeral, keyObj.tonic);
      if (chord) {
        chords.push(chord);
      }
    });

    this.fillMissingChords(chords, genre, length);
    return { chords, numerals };
  }

  private fillMissingChords(
    chords: string[],
    genre: string,
    targetLength: number
  ): void {
    while (chords.length < targetLength && chords.length > 0) {
      const lastChord = chords[chords.length - 1];
      const suggestions = this.suggestChords(lastChord, genre);
      const suggestedChord =
        suggestions.length > 0 ? suggestions[0] : lastChord;
      chords.push(suggestedChord);
    }
  }

  private parseKey(keyString: string): Key {
    const isMinor =
      keyString.toLowerCase().includes("m") &&
      !keyString.toLowerCase().includes("maj");
    const tonic = keyString.replace(/[^A-G#b]/g, "");

    return {
      tonic,
      mode: isMinor ? "minor" : "major",
      signature: this.getKeySignature(tonic, isMinor ? "minor" : "major"),
    };
  }

  private generateScale(tonic: string, intervals: number[]): string[] {
    const tonicIndex = CHROMATIC_NOTES.indexOf(tonic as any);
    if (tonicIndex === -1) {
      throw new Error(`Invalid tonic: ${tonic}`);
    }

    return intervals.map((interval) => {
      const noteIndex = (tonicIndex + interval) % CHROMATIC_NOTES.length;
      return CHROMATIC_NOTES[noteIndex];
    });
  }

  private generateScaleChords(tonic: string, intervals: number[]): string[] {
    const scale = this.generateScale(tonic, intervals);
    const chords: string[] = [];

    for (let i = 0; i < scale.length; i++) {
      const root = scale[i];
      const third = scale[(i + 2) % scale.length];
      const fifth = scale[(i + 4) % scale.length];
      const chordQuality = this.determineChordQuality(root, third, fifth);
      chords.push(`${root}${chordQuality}`);
    }

    return chords;
  }

  private determineChordQuality(
    root: string,
    third: string,
    fifth: string
  ): string {
    const rootIndex = CHROMATIC_NOTES.indexOf(root as any);
    const thirdIndex = CHROMATIC_NOTES.indexOf(third as any);
    const fifthIndex = CHROMATIC_NOTES.indexOf(fifth as any);

    const thirdInterval =
      (thirdIndex - rootIndex + CHROMATIC_NOTES.length) %
      CHROMATIC_NOTES.length;
    const fifthInterval =
      (fifthIndex - rootIndex + CHROMATIC_NOTES.length) %
      CHROMATIC_NOTES.length;

    if (
      thirdInterval === (CHORD_INTERVALS.major?.third || 4) &&
      fifthInterval === (CHORD_INTERVALS.major?.fifth || 7)
    ) {
      return CHORD_QUALITIES.MAJOR || "";
    } else if (
      thirdInterval === (CHORD_INTERVALS.minor?.third || 3) &&
      fifthInterval === (CHORD_INTERVALS.minor?.fifth || 7)
    ) {
      return CHORD_QUALITIES.MINOR || "m";
    } else if (fifthInterval === (CHORD_INTERVALS.diminished?.fifth || 6)) {
      return CHORD_QUALITIES.DIMINISHED || "°";
    } else if (fifthInterval === (CHORD_INTERVALS.augmented?.fifth || 8)) {
      return CHORD_QUALITIES.AUGMENTED || "+";
    }
    return CHORD_QUALITIES.MAJOR || "";
  }

  private scoreKeyFit(
    chords: string[],
    tonic: string,
    mode: "major" | "minor"
  ): number {
    const pattern =
      mode === "major" ? [...SCALE_PATTERNS.major] : [...SCALE_PATTERNS.minor];
    const scaleNotes = this.generateScale(tonic, pattern);
    let score = 0;

    chords.forEach((chord) => {
      const chordRoot = chord.replace(/[^A-G#b]/g, "");
      if (scaleNotes.includes(chordRoot)) {
        if (chordRoot === tonic) {
          score += KEY_ANALYSIS_WEIGHTS.TONIC_SCORE || 5;
        } else if (chordRoot === scaleNotes[4]) {
          score += KEY_ANALYSIS_WEIGHTS.DOMINANT_SCORE || 3;
        } else {
          score += KEY_ANALYSIS_WEIGHTS.SCALE_NOTE_SCORE || 1;
        }
      }

      if (mode === "minor" && chord.includes("m")) {
        score += KEY_ANALYSIS_WEIGHTS.MODE_BONUS_SCORE || 2;
      } else if (
        mode === "major" &&
        !chord.includes("m") &&
        !chord.includes("°")
      ) {
        score += KEY_ANALYSIS_WEIGHTS.MODE_BONUS_SCORE || 2;
      }
    });

    return score;
  }

  private chordsToNumerals(chords: string[], key: Key): string[] {
    const scalePattern = this.getScalePatternForMode(key.mode);
    const scaleNotes = this.generateScale(key.tonic, scalePattern);

    return chords.map((chord) => {
      const chordRoot = chord.replace(/[^A-G#b]/g, "");
      const scaleIndex = scaleNotes.indexOf(chordRoot);

      if (scaleIndex !== -1) {
        const numerals =
          key.mode === "major" ? ROMAN_NUMERALS.major : ROMAN_NUMERALS.minor;
        return numerals[scaleIndex] || "N/A";
      }

      return "N/A";
    });
  }

  private analyzeFunctions(numerals: string[]): string[] {
    return numerals.map((numeral) => {
      // FIXED: Use simple string checks instead of strict typed arrays
      const numStr = numeral.toString();
      const upperStr = numStr.toUpperCase();
      const lowerStr = numStr.toLowerCase();

      // Simple pattern matching instead of includes() on typed arrays
      if (
        ["I", "i", "vi", "VI"].some(
          (n) => n === numStr || n === upperStr || n === lowerStr
        )
      ) {
        return "Tonic";
      } else if (
        ["IV", "iv", "ii", "ii°"].some(
          (n) => n === numStr || n === upperStr || n === lowerStr
        )
      ) {
        return "Subdominant";
      } else if (
        ["V", "vii°", "v", "VII"].some(
          (n) => n === numStr || n === upperStr || n === lowerStr
        )
      ) {
        return "Dominant";
      }

      return "Other";
    });
  }

  private detectCadences(numerals: string[]): string[] {
    const cadences: string[] = [];

    for (let i = 0; i < numerals.length - 1; i++) {
      const current = numerals[i];
      const next = numerals[i + 1];
      const cadenceType = this.identifyCadence(current, next);

      if (cadenceType) {
        cadences.push(cadenceType);
      }
    }

    return cadences;
  }

  private identifyCadence(current: string, next: string): string | null {
    // FIXED: Simple cadence detection without complex type casting
    const commonCadences = [
      { pattern: ["V", "I"], name: "Authentic" },
      { pattern: ["v", "i"], name: "Authentic" },
      { pattern: ["IV", "I"], name: "Plagal" },
      { pattern: ["iv", "i"], name: "Plagal" },
    ];

    for (const cadence of commonCadences) {
      if (cadence.pattern[0] === current && cadence.pattern[1] === next) {
        return `${cadence.name} Cadence`;
      }
    }

    return null;
  }

  private detectModulations(chords: string[]): string[] {
    const modulations: string[] = [];

    for (let i = 0; i < chords.length - 1; i++) {
      const currentChord = chords[i];
      if (currentChord.includes("#") || currentChord.includes("b")) {
        modulations.push(`Potential modulation at chord ${i + 1}`);
      }
    }

    return modulations;
  }

  private calculateConfidence(chords: string[], key: Key): number {
    const score = this.scoreKeyFit(chords, key.tonic, key.mode);
    return Math.min(
      score / chords.length,
      AUDIO_ANALYSIS.MAX_CONFIDENCE || 100
    );
  }

  private numeralToChord(numeral: string, key: Key): string | null {
    // Use the new enhanced method
    return this.romanNumeralToChord(
      numeral,
      key.tonic + (key.mode === "minor" ? "m" : "")
    );
  }

  private getKeySignature(tonic: string, mode: "major" | "minor"): string {
    const circleIndex = CIRCLE_OF_FIFTHS.indexOf(tonic as any);
    if (circleIndex === -1) return "0";

    let signature: string;

    if (circleIndex <= (KEY_SIGNATURES.CIRCLE_MIDPOINT || 6)) {
      signature = `${circleIndex}#`;
    } else {
      signature = `${CHROMATIC_NOTES.length - circleIndex}b`;
    }

    if (mode === "minor") {
      const adjustedIndex =
        circleIndex <= (KEY_SIGNATURES.MINOR_KEY_ADJUSTMENT || 3)
          ? circleIndex + (KEY_SIGNATURES.MINOR_KEY_ADJUSTMENT || 3)
          : circleIndex - (KEY_SIGNATURES.MINOR_KEY_ADJUSTMENT || 3);

      if (adjustedIndex <= (KEY_SIGNATURES.CIRCLE_MIDPOINT || 6)) {
        signature = `${adjustedIndex}#`;
      } else {
        signature = `${CHROMATIC_NOTES.length - adjustedIndex}b`;
      }
    }

    return signature;
  }

  private getScalePattern(scaleName: ScalePatternKey): readonly number[] {
    return SCALE_PATTERNS[scaleName];
  }

  private generateModes(scaleName: string): string[] {
    if (scaleName === "major") {
      return [
        "Ionian",
        "Dorian",
        "Phrygian",
        "Lydian",
        "Mixolydian",
        "Aeolian",
        "Locrian",
      ];
    }
    return [];
  }

  private getProgressionEmotion(
    numerals: string[]
  ): "happy" | "sad" | "tense" | "resolved" | "mysterious" | "powerful" {
    const minorChords = numerals.filter((n) => n.toLowerCase() === n).length;
    const hasV = numerals.some((n) => n.toLowerCase() === "v");
    const hasI = numerals.some((n) => n.toLowerCase() === "i");

    if (minorChords > numerals.length / 2) return "sad";
    if (hasV && hasI) return "resolved";
    if (hasV) return "tense";
    if (numerals.includes("vi") || numerals.includes("VI")) return "mysterious";
    return "happy";
  }
}
