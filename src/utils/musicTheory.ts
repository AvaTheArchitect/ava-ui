// 🎼 MUSIC THEORY UTILITIES - Comprehensive Music Intelligence
// File: maestro-modules/utils/musicTheory.ts

// 🎯 Core music theory interfaces
export interface Note {
  name: string; // 'C', 'C#', 'Db', etc.
  octave: number; // 0-10
  frequency: number; // Hz
  midiNumber: number; // 0-127
  enharmonic?: string[]; // Alternative spellings
}

export interface Interval {
  semitones: number;
  name: string;
  quality: "perfect" | "major" | "minor" | "augmented" | "diminished";
  shortName: string;
}

export interface Scale {
  name: string;
  intervals: number[]; // Semitone intervals from root
  notes: string[]; // Note names in the scale
  modes: string[]; // Associated modes
  chords: string[]; // Diatonic chords
}

export interface Chord {
  name: string;
  fullName: string;
  root: string;
  quality:
    | "major"
    | "minor"
    | "diminished"
    | "augmented"
    | "dominant"
    | "sus"
    | "add"
    | "extended";
  intervals: number[]; // Semitones from root
  notes: string[]; // Note names
  inversions: ChordInversion[];
  voicings: ChordVoicing[];
  function: string; // I, ii, V7, etc.
}

export interface ChordInversion {
  name: string; // 'root', '1st inversion', etc.
  bass: string; // Bass note
  notes: string[]; // Notes in order
}

export interface ChordVoicing {
  name: string; // 'close', 'open', 'drop2', etc.
  notes: { note: string; octave: number }[];
  span: number; // Total interval span
}

export interface ChordProgression {
  name: string;
  numerals: string[]; // ['I', 'V', 'vi', 'IV']
  chords: string[]; // Actual chord names in key
  key: string;
  mode: string;
  functions: string[]; // Harmonic functions
}

export interface KeySignature {
  key: string;
  mode: "major" | "minor";
  sharps: string[];
  flats: string[];
  relativeKey: string;
  parallelKey: string;
  circleOfFifths: number; // Position on circle of fifths
}

// 🎵 Note and Frequency Utilities
export class NoteUtils {
  // 🎯 Note names with enharmonic equivalents
  static readonly CHROMATIC_NOTES = [
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

  static readonly ENHARMONIC_MAP: { [key: string]: string[] } = {
    "C#": ["Db"],
    Db: ["C#"],
    "D#": ["Eb"],
    Eb: ["D#"],
    "F#": ["Gb"],
    Gb: ["F#"],
    "G#": ["Ab"],
    Ab: ["G#"],
    "A#": ["Bb"],
    Bb: ["A#"],
  };

  // Convert frequency to note
  static frequencyToNote(frequency: number): Note {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);

    if (frequency <= 0) {
      return { name: "N/A", octave: 0, frequency: 0, midiNumber: 0 };
    }

    const semitones = Math.round(12 * Math.log2(frequency / C0));
    const noteIndex = ((semitones % 12) + 12) % 12;
    const octave = Math.floor(semitones / 12);
    const noteName = this.CHROMATIC_NOTES[noteIndex];
    const midiNumber = semitones + 12; // C0 = MIDI 12

    return {
      name: noteName,
      octave,
      frequency,
      midiNumber,
      enharmonic: this.ENHARMONIC_MAP[noteName] || [],
    };
  }

  // Convert note to frequency
  static noteToFrequency(note: string, octave: number): number {
    const noteIndex = this.CHROMATIC_NOTES.indexOf(note);
    if (noteIndex === -1) return 0;

    const A4 = 440;
    const semitones = octave * 12 + noteIndex - 57; // A4 = MIDI 69
    return A4 * Math.pow(2, semitones / 12);
  }

  // Get interval between two notes
  static getInterval(note1: string, note2: string): Interval {
    const index1 = this.CHROMATIC_NOTES.indexOf(note1);
    const index2 = this.CHROMATIC_NOTES.indexOf(note2);

    if (index1 === -1 || index2 === -1) {
      return {
        semitones: 0,
        name: "unison",
        quality: "perfect",
        shortName: "P1",
      };
    }

    const semitones = (index2 - index1 + 12) % 12;
    return this.semitonesToInterval(semitones);
  }

  // Convert semitones to interval name
  static semitonesToInterval(semitones: number): Interval {
    const intervals: { [key: number]: Interval } = {
      0: { semitones: 0, name: "unison", quality: "perfect", shortName: "P1" },
      1: {
        semitones: 1,
        name: "minor second",
        quality: "minor",
        shortName: "m2",
      },
      2: {
        semitones: 2,
        name: "major second",
        quality: "major",
        shortName: "M2",
      },
      3: {
        semitones: 3,
        name: "minor third",
        quality: "minor",
        shortName: "m3",
      },
      4: {
        semitones: 4,
        name: "major third",
        quality: "major",
        shortName: "M3",
      },
      5: {
        semitones: 5,
        name: "perfect fourth",
        quality: "perfect",
        shortName: "P4",
      },
      6: {
        semitones: 6,
        name: "tritone",
        quality: "augmented",
        shortName: "A4",
      },
      7: {
        semitones: 7,
        name: "perfect fifth",
        quality: "perfect",
        shortName: "P5",
      },
      8: {
        semitones: 8,
        name: "minor sixth",
        quality: "minor",
        shortName: "m6",
      },
      9: {
        semitones: 9,
        name: "major sixth",
        quality: "major",
        shortName: "M6",
      },
      10: {
        semitones: 10,
        name: "minor seventh",
        quality: "minor",
        shortName: "m7",
      },
      11: {
        semitones: 11,
        name: "major seventh",
        quality: "major",
        shortName: "M7",
      },
    };

    return intervals[semitones % 12] || intervals[0];
  }

  // Transpose note by semitones
  static transpose(note: string, semitones: number): string {
    const index = this.CHROMATIC_NOTES.indexOf(note);
    if (index === -1) return note;

    const newIndex = (((index + semitones) % 12) + 12) % 12;
    return this.CHROMATIC_NOTES[newIndex];
  }
}

// 🎵 Scale Utilities
export class ScaleUtils {
  static readonly SCALES: { [name: string]: Scale } = {
    major: {
      name: "Major",
      intervals: [0, 2, 4, 5, 7, 9, 11],
      notes: [],
      modes: [
        "ionian",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "aeolian",
        "locrian",
      ],
      chords: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    },
    natural_minor: {
      name: "Natural Minor",
      intervals: [0, 2, 3, 5, 7, 8, 10],
      notes: [],
      modes: ["aeolian"],
      chords: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
    },
    harmonic_minor: {
      name: "Harmonic Minor",
      intervals: [0, 2, 3, 5, 7, 8, 11],
      notes: [],
      modes: [],
      chords: ["i", "ii°", "III+", "iv", "V", "VI", "vii°"],
    },
    melodic_minor: {
      name: "Melodic Minor",
      intervals: [0, 2, 3, 5, 7, 9, 11],
      notes: [],
      modes: [],
      chords: ["i", "ii", "III+", "IV", "V", "vi°", "vii°"],
    },
    pentatonic_major: {
      name: "Major Pentatonic",
      intervals: [0, 2, 4, 7, 9],
      notes: [],
      modes: [],
      chords: [],
    },
    pentatonic_minor: {
      name: "Minor Pentatonic",
      intervals: [0, 3, 5, 7, 10],
      notes: [],
      modes: [],
      chords: [],
    },
    blues: {
      name: "Blues Scale",
      intervals: [0, 3, 5, 6, 7, 10],
      notes: [],
      modes: [],
      chords: [],
    },
    dorian: {
      name: "Dorian",
      intervals: [0, 2, 3, 5, 7, 9, 10],
      notes: [],
      modes: [],
      chords: ["i", "ii", "III", "IV", "v", "vi°", "VII"],
    },
    mixolydian: {
      name: "Mixolydian",
      intervals: [0, 2, 4, 5, 7, 9, 10],
      notes: [],
      modes: [],
      chords: ["I", "ii", "iii°", "IV", "v", "vi", "VII"],
    },
  };

  // Generate scale from root note
  static generateScale(root: string, scaleName: string): Scale {
    const scaleTemplate = this.SCALES[scaleName];
    if (!scaleTemplate) {
      throw new Error(`Unknown scale: ${scaleName}`);
    }

    const notes = scaleTemplate.intervals.map((interval) =>
      NoteUtils.transpose(root, interval)
    );

    return {
      ...scaleTemplate,
      notes,
    };
  }

  // Detect scale from notes
  static detectScale(
    notes: string[]
  ): { scale: string; root: string; confidence: number }[] {
    const candidates = [];

    // Try each note as potential root
    for (const root of NoteUtils.CHROMATIC_NOTES) {
      // Try each scale type
      for (const [scaleName, scaleTemplate] of Object.entries(this.SCALES)) {
        const scale = this.generateScale(root, scaleName);
        const matches = notes.filter((note) =>
          scale.notes.includes(note)
        ).length;
        const confidence = matches / scale.notes.length;

        if (confidence >= 0.5) {
          // At least 50% match
          candidates.push({
            scale: scaleName,
            root,
            confidence,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // Get modes of a scale
  static getMode(scale: Scale, modeIndex: number): Scale {
    if (modeIndex < 0 || modeIndex >= scale.intervals.length) {
      throw new Error("Invalid mode index");
    }

    const rootInterval = scale.intervals[modeIndex];
    const modeIntervals = scale.intervals
      .map((interval) => (interval - rootInterval + 12) % 12)
      .sort((a, b) => a - b);

    const modeName = scale.modes[modeIndex] || `Mode ${modeIndex + 1}`;
    const rootNote = scale.notes[modeIndex];

    return {
      name: modeName,
      intervals: modeIntervals,
      notes: modeIntervals.map((interval) =>
        NoteUtils.transpose(rootNote, interval)
      ),
      modes: [],
      chords: [],
    };
  }
}

// 🎵 Chord Utilities
export class ChordUtils {
  static readonly CHORD_TEMPLATES: {
    [name: string]: {
      intervals: number[];
      quality: Chord["quality"];
      fullName: string;
    };
  } = {
    // Triads
    "": { intervals: [0, 4, 7], quality: "major", fullName: "Major Triad" },
    maj: { intervals: [0, 4, 7], quality: "major", fullName: "Major Triad" },
    m: { intervals: [0, 3, 7], quality: "minor", fullName: "Minor Triad" },
    min: { intervals: [0, 3, 7], quality: "minor", fullName: "Minor Triad" },
    dim: {
      intervals: [0, 3, 6],
      quality: "diminished",
      fullName: "Diminished Triad",
    },
    "°": {
      intervals: [0, 3, 6],
      quality: "diminished",
      fullName: "Diminished Triad",
    },
    aug: {
      intervals: [0, 4, 8],
      quality: "augmented",
      fullName: "Augmented Triad",
    },
    "+": {
      intervals: [0, 4, 8],
      quality: "augmented",
      fullName: "Augmented Triad",
    },

    // Sevenths
    "7": {
      intervals: [0, 4, 7, 10],
      quality: "dominant",
      fullName: "Dominant Seventh",
    },
    maj7: {
      intervals: [0, 4, 7, 11],
      quality: "major",
      fullName: "Major Seventh",
    },
    M7: {
      intervals: [0, 4, 7, 11],
      quality: "major",
      fullName: "Major Seventh",
    },
    m7: {
      intervals: [0, 3, 7, 10],
      quality: "minor",
      fullName: "Minor Seventh",
    },
    min7: {
      intervals: [0, 3, 7, 10],
      quality: "minor",
      fullName: "Minor Seventh",
    },
    dim7: {
      intervals: [0, 3, 6, 9],
      quality: "diminished",
      fullName: "Diminished Seventh",
    },
    ø7: {
      intervals: [0, 3, 6, 10],
      quality: "diminished",
      fullName: "Half-Diminished Seventh",
    },
    m7b5: {
      intervals: [0, 3, 6, 10],
      quality: "diminished",
      fullName: "Half-Diminished Seventh",
    },

    // Suspended
    sus2: {
      intervals: [0, 2, 7],
      quality: "sus",
      fullName: "Suspended Second",
    },
    sus4: {
      intervals: [0, 5, 7],
      quality: "sus",
      fullName: "Suspended Fourth",
    },
    sus: { intervals: [0, 5, 7], quality: "sus", fullName: "Suspended Fourth" },

    // Added tone
    add9: { intervals: [0, 4, 7, 14], quality: "add", fullName: "Added Ninth" },
    add2: { intervals: [0, 2, 4, 7], quality: "add", fullName: "Added Second" },
    "6": { intervals: [0, 4, 7, 9], quality: "add", fullName: "Sixth" },
    m6: { intervals: [0, 3, 7, 9], quality: "add", fullName: "Minor Sixth" },

    // Extended
    "9": {
      intervals: [0, 4, 7, 10, 14],
      quality: "extended",
      fullName: "Ninth",
    },
    maj9: {
      intervals: [0, 4, 7, 11, 14],
      quality: "extended",
      fullName: "Major Ninth",
    },
    m9: {
      intervals: [0, 3, 7, 10, 14],
      quality: "extended",
      fullName: "Minor Ninth",
    },
    "11": {
      intervals: [0, 4, 7, 10, 14, 17],
      quality: "extended",
      fullName: "Eleventh",
    },
    "13": {
      intervals: [0, 4, 7, 10, 14, 17, 21],
      quality: "extended",
      fullName: "Thirteenth",
    },
  };

  // Parse chord symbol
  static parseChord(chordSymbol: string): {
    root: string;
    quality: string;
    bass?: string;
  } {
    // Handle slash chords (bass notes)
    const parts = chordSymbol.split("/");
    const mainChord = parts[0];
    const bass = parts[1];

    // Extract root note (support for # and b)
    let root = "";
    let quality = "";

    if (
      mainChord.length >= 2 &&
      (mainChord[1] === "#" || mainChord[1] === "b")
    ) {
      root = mainChord.substring(0, 2);
      quality = mainChord.substring(2);
    } else {
      root = mainChord[0];
      quality = mainChord.substring(1);
    }

    return { root, quality, bass };
  }

  // Generate chord from symbol
  static generateChord(chordSymbol: string): Chord {
    const parsed = this.parseChord(chordSymbol);
    const template =
      this.CHORD_TEMPLATES[parsed.quality] || this.CHORD_TEMPLATES[""];

    const notes = template.intervals.map((interval) =>
      NoteUtils.transpose(parsed.root, interval % 12)
    );

    const inversions = this.generateInversions(notes);
    const voicings = this.generateVoicings(notes);

    return {
      name: chordSymbol,
      fullName: `${parsed.root} ${template.fullName}`,
      root: parsed.root,
      quality: template.quality,
      intervals: template.intervals,
      notes,
      inversions,
      voicings,
      function: "", // To be determined by context
    };
  }

  // Detect chord from notes
  static detectChord(
    notes: string[]
  ): { chord: string; confidence: number; alternatives: string[] }[] {
    const candidates = [];

    // Try each note as potential root
    for (const root of notes) {
      // Try each chord quality
      for (const [quality, template] of Object.entries(this.CHORD_TEMPLATES)) {
        const chordNotes = template.intervals.map((interval) =>
          NoteUtils.transpose(root, interval % 12)
        );

        const matches = chordNotes.filter((note) =>
          notes.includes(note)
        ).length;
        const confidence = matches / chordNotes.length;

        if (confidence >= 0.6) {
          // At least 60% match
          const chordSymbol = root + quality;
          const extraNotes = notes.filter((note) => !chordNotes.includes(note));

          candidates.push({
            chord: chordSymbol,
            confidence,
            alternatives: extraNotes,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // Generate chord inversions
  private static generateInversions(notes: string[]): ChordInversion[] {
    const inversions: ChordInversion[] = [];

    for (let i = 0; i < notes.length; i++) {
      const inversionNotes = [...notes.slice(i), ...notes.slice(0, i)];
      const inversionName =
        i === 0
          ? "root position"
          : i === 1
          ? "1st inversion"
          : i === 2
          ? "2nd inversion"
          : `${i}${this.getOrdinalSuffix(i)} inversion`;

      inversions.push({
        name: inversionName,
        bass: inversionNotes[0],
        notes: inversionNotes,
      });
    }

    return inversions;
  }

  // Generate chord voicings
  private static generateVoicings(notes: string[]): ChordVoicing[] {
    const voicings: ChordVoicing[] = [];

    // Close voicing (notes within an octave)
    voicings.push({
      name: "close",
      notes: notes.map((note, i) => ({ note, octave: 4 + Math.floor(i / 7) })),
      span: 12,
    });

    // Open voicing (wider spread)
    if (notes.length >= 4) {
      voicings.push({
        name: "open",
        notes: [
          { note: notes[0], octave: 3 },
          { note: notes[1], octave: 4 },
          { note: notes[2], octave: 5 },
          { note: notes[3], octave: 4 },
        ],
        span: 24,
      });
    }

    return voicings;
  }

  private static getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }
}

// 🎵 Progression Utilities
export class ProgressionUtils {
  static readonly COMMON_PROGRESSIONS: { [name: string]: ChordProgression } = {
    "vi-IV-I-V": {
      name: "vi-IV-I-V (Pop Progression)",
      numerals: ["vi", "IV", "I", "V"],
      chords: [],
      key: "",
      mode: "major",
      functions: ["tonic", "subdominant", "tonic", "dominant"],
    },
    "I-V-vi-IV": {
      name: "I-V-vi-IV (Classical)",
      numerals: ["I", "V", "vi", "IV"],
      chords: [],
      key: "",
      mode: "major",
      functions: ["tonic", "dominant", "tonic", "subdominant"],
    },
    "ii-V-I": {
      name: "ii-V-I (Jazz)",
      numerals: ["ii7", "V7", "Imaj7"],
      chords: [],
      key: "",
      mode: "major",
      functions: ["subdominant", "dominant", "tonic"],
    },
    "i-VII-VI-VII": {
      name: "i-VII-VI-VII (Minor)",
      numerals: ["i", "VII", "VI", "VII"],
      chords: [],
      key: "",
      mode: "minor",
      functions: ["tonic", "subtonic", "submediant", "subtonic"],
    },
    "twelve-bar-blues": {
      name: "Twelve Bar Blues",
      numerals: [
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
      chords: [],
      key: "",
      mode: "major",
      functions: [
        "tonic",
        "tonic",
        "tonic",
        "tonic",
        "subdominant",
        "subdominant",
        "tonic",
        "tonic",
        "dominant",
        "subdominant",
        "tonic",
        "dominant",
      ],
    },
  };

  // Generate progression in specific key
  static generateProgression(
    progressionName: string,
    key: string
  ): ChordProgression {
    const template = this.COMMON_PROGRESSIONS[progressionName];
    if (!template) {
      throw new Error(`Unknown progression: ${progressionName}`);
    }

    const scale = ScaleUtils.generateScale(
      key,
      template.mode === "major" ? "major" : "natural_minor"
    );
    const chords = template.numerals.map((numeral) =>
      this.romanNumeralToChord(numeral, scale)
    );

    return {
      ...template,
      key,
      chords,
    };
  }

  // Convert Roman numeral to chord symbol
  private static romanNumeralToChord(numeral: string, scale: Scale): string {
    const romanMap: { [key: string]: number } = {
      I: 0,
      i: 0,
      II: 1,
      ii: 1,
      III: 2,
      iii: 2,
      IV: 3,
      iv: 3,
      V: 4,
      v: 4,
      VI: 5,
      vi: 5,
      VII: 6,
      vii: 6,
    };

    // Parse the numeral (handle extensions like 7, maj7, etc.)
    let baseNumeral = "";
    let extension = "";
    let isMinor = false;

    for (let i = 0; i < numeral.length; i++) {
      const char = numeral[i];
      if (char >= "A" && char <= "Z") {
        baseNumeral += char;
      } else if (char >= "a" && char <= "z") {
        baseNumeral += char.toUpperCase();
        isMinor = true;
      } else {
        extension = numeral.substring(i);
        break;
      }
    }

    const degree = romanMap[baseNumeral];
    if (degree === undefined) return "C";

    const root = scale.notes[degree];

    // Determine chord quality
    let quality = "";
    if (extension.includes("°")) {
      quality = "dim";
    } else if (extension.includes("+")) {
      quality = "aug";
    } else if (isMinor) {
      quality = "m";
    }

    // Add extensions
    if (extension.includes("7")) {
      if (extension.includes("maj7")) {
        quality += "maj7";
      } else {
        quality += "7";
      }
    }

    return root + quality;
  }

  // Analyze chord progression
  static analyzeProgression(
    chords: string[],
    key: string
  ): {
    numerals: string[];
    functions: string[];
    cadences: string[];
    modulations: string[];
  } {
    const scale = ScaleUtils.generateScale(key, "major");
    const numerals = chords.map((chord) =>
      this.chordToRomanNumeral(chord, scale)
    );
    const functions = numerals.map((numeral) =>
      this.getRomanNumeralFunction(numeral)
    );
    const cadences = this.identifyCadences(numerals);
    const modulations = this.identifyModulations(chords);

    return {
      numerals,
      functions,
      cadences,
      modulations,
    };
  }

  private static chordToRomanNumeral(chord: string, scale: Scale): string {
    const parsed = ChordUtils.parseChord(chord);
    const degree = scale.notes.indexOf(parsed.root);

    if (degree === -1) return "N/A";

    const romanNumerals = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
    return romanNumerals[degree] || "N/A";
  }

  private static getRomanNumeralFunction(numeral: string): string {
    const functions: { [key: string]: string } = {
      I: "tonic",
      i: "tonic",
      ii: "subdominant",
      II: "subdominant",
      iii: "tonic",
      III: "tonic",
      IV: "subdominant",
      iv: "subdominant",
      V: "dominant",
      v: "dominant",
      vi: "tonic",
      VI: "tonic",
      "vii°": "dominant",
      VII: "subtonic",
    };

    const baseNumeral = numeral.replace(/[^IVXivx°]/g, "");
    return functions[baseNumeral] || "unknown";
  }

  private static identifyCadences(numerals: string[]): string[] {
    const cadences = [];

    for (let i = 0; i < numerals.length - 1; i++) {
      const current = numerals[i];
      const next = numerals[i + 1];

      if (current === "V" && next === "I") {
        cadences.push("authentic");
      } else if (current === "IV" && next === "I") {
        cadences.push("plagal");
      } else if (current === "V" && next === "vi") {
        cadences.push("deceptive");
      } else if (current === "iv" && next === "I") {
        cadences.push("picardy third");
      }
    }

    return cadences;
  }

  private static identifyModulations(chords: string[]): string[] {
    // Simplified modulation detection
    return []; // Would implement key change detection
  }
}

// 🎵 Key Signature Utilities
export class KeyUtils {
  static readonly CIRCLE_OF_FIFTHS = [
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "F",
    "Bb",
    "Eb",
    "Ab",
  ];

  static readonly KEY_SIGNATURES: { [key: string]: KeySignature } = {
    C: {
      key: "C",
      mode: "major",
      sharps: [],
      flats: [],
      relativeKey: "Am",
      parallelKey: "Cm",
      circleOfFifths: 0,
    },
    G: {
      key: "G",
      mode: "major",
      sharps: ["F#"],
      flats: [],
      relativeKey: "Em",
      parallelKey: "Gm",
      circleOfFifths: 1,
    },
    D: {
      key: "D",
      mode: "major",
      sharps: ["F#", "C#"],
      flats: [],
      relativeKey: "Bm",
      parallelKey: "Dm",
      circleOfFifths: 2,
    },
    A: {
      key: "A",
      mode: "major",
      sharps: ["F#", "C#", "G#"],
      flats: [],
      relativeKey: "F#m",
      parallelKey: "Am",
      circleOfFifths: 3,
    },
    E: {
      key: "E",
      mode: "major",
      sharps: ["F#", "C#", "G#", "D#"],
      flats: [],
      relativeKey: "C#m",
      parallelKey: "Em",
      circleOfFifths: 4,
    },
    B: {
      key: "B",
      mode: "major",
      sharps: ["F#", "C#", "G#", "D#", "A#"],
      flats: [],
      relativeKey: "G#m",
      parallelKey: "Bm",
      circleOfFifths: 5,
    },
    "F#": {
      key: "F#",
      mode: "major",
      sharps: ["F#", "C#", "G#", "D#", "A#", "E#"],
      flats: [],
      relativeKey: "D#m",
      parallelKey: "F#m",
      circleOfFifths: 6,
    },
    F: {
      key: "F",
      mode: "major",
      sharps: [],
      flats: ["Bb"],
      relativeKey: "Dm",
      parallelKey: "Fm",
      circleOfFifths: -1,
    },
    Bb: {
      key: "Bb",
      mode: "major",
      sharps: [],
      flats: ["Bb", "Eb"],
      relativeKey: "Gm",
      parallelKey: "Bbm",
      circleOfFifths: -2,
    },
    Eb: {
      key: "Eb",
      mode: "major",
      sharps: [],
      flats: ["Bb", "Eb", "Ab"],
      relativeKey: "Cm",
      parallelKey: "Ebm",
      circleOfFifths: -3,
    },
    Ab: {
      key: "Ab",
      mode: "major",
      sharps: [],
      flats: ["Bb", "Eb", "Ab", "Db"],
      relativeKey: "Fm",
      parallelKey: "Abm",
      circleOfFifths: -4,
    },
    Db: {
      key: "Db",
      mode: "major",
      sharps: [],
      flats: ["Bb", "Eb", "Ab", "Db", "Gb"],
      relativeKey: "Bbm",
      parallelKey: "Dbm",
      circleOfFifths: -5,
    },
  };

  // Detect key from notes
  static detectKey(
    notes: string[]
  ): { key: string; mode: "major" | "minor"; confidence: number }[] {
    const candidates = [];

    // Try major keys
    for (const [keyName, keyData] of Object.entries(this.KEY_SIGNATURES)) {
      if (keyData.mode === "major") {
        const scale = ScaleUtils.generateScale(keyName, "major");
        const matches = notes.filter((note) =>
          scale.notes.includes(note)
        ).length;
        const confidence = matches / scale.notes.length;

        if (confidence >= 0.5) {
          candidates.push({ key: keyName, mode: "major" as const, confidence });
        }

        // Also check relative minor
        const relativeMinor = scale.notes[5]; // 6th degree
        const minorScale = ScaleUtils.generateScale(
          relativeMinor,
          "natural_minor"
        );
        const minorMatches = notes.filter((note) =>
          minorScale.notes.includes(note)
        ).length;
        const minorConfidence = minorMatches / minorScale.notes.length;

        if (minorConfidence >= 0.5) {
          candidates.push({
            key: relativeMinor + "m",
            mode: "minor" as const,
            confidence: minorConfidence,
          });
        }
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  // Get key signature
  static getKeySignature(key: string): KeySignature | null {
    return this.KEY_SIGNATURES[key] || null;
  }
}

// 🎯 Export all utilities
export default {
  NoteUtils,
  ScaleUtils,
  ChordUtils,
  ProgressionUtils,
  KeyUtils,
};
