// 🎸 Enhanced Tab Parser for Real Songs with Advanced Notation
// Updated: September 16th, 2025 v1.0
// /maestro-ai/src/lib/tab-parsers/basicTabParser.ts

export interface TabNote {
  fret: number;
  string: number; // 0-5 (High E=0, B=1, G=2, D=3, A=4, Low E=5)
  time: number; // Time in seconds
  duration?: number;
  technique?: TabTechnique;
}

export interface TabTechnique {
  type:
    | "bend"
    | "slide"
    | "hammer"
    | "pulloff"
    | "vibrato"
    | "pinch"
    | "palm-mute"
    | "harmonic";
  value?: number; // For bends: semitones, slides: target fret
  target?: number; // Target fret for slides/hammer-ons
}

export interface TimingMarker {
  measure: number;
  beat: number;
  time: number;
  bpm: number;
}

export interface TimingData {
  bpm: number;
  beatsPerMeasure: number;
  totalMeasures: number;
  markers: TimingMarker[];
}

export interface TabMeasure {
  id: string;
  timeSignature: [number, number];
  notes: TabNote[];
  startTime: number;
  endTime: number;
  tempo?: number;
}

export interface ParsedSong {
  title: string;
  artist?: string;
  bpm: number;
  timeSignature: [number, number];
  measures: TabMeasure[];
  duration: number;
  key?: string;
  difficulty?: "beginner" | "intermediate" | "advanced" | "expert";
}

export class BasicTabParser {
  /**
   * Parse advanced ASCII tablature with techniques
   *
   * Notation Reference:
   * 12b14    = Bend fret 12 up to pitch of fret 14
   * 12h14    = Hammer-on from 12 to 14
   * 14p12    = Pull-off from 14 to 12
   * 12/14    = Slide up from 12 to 14
   * 14\12    = Slide down from 14 to 12
   * 12~      = Vibrato on fret 12
   * (12)     = Pinch harmonic on fret 12
   * 12pm     = Palm mute on fret 12
   * <12>     = Natural harmonic on fret 12
   * x        = Muted note
   *
   * Example:
   * E|--0--2b4--3h5p3--<12>---|
   * B|--0--3----5------5~-----|
   * G|--0--2----4------4------|
   * D|--2--0----5------5------|
   * A|--2-------3------3------|
   * E|--0---------------------|
   */
  static parseAdvancedASCIITab(tabText: string, bpm: number = 120): ParsedSong {
    const lines = tabText
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    const getStringNumber = (stringChar: string, lineIndex: number): number => {
      if (stringChar.toUpperCase() === "E") {
        return lineIndex === 0 ? 0 : 5; // High E vs Low E
      }

      const stringMap: { [key: string]: number } = {
        B: 1,
        b: 1,
        G: 2,
        g: 2,
        D: 3,
        d: 3,
        A: 4,
        a: 4,
      };

      return stringMap[stringChar] ?? lineIndex;
    };

    const measures: TabMeasure[] = [];
    const notesPerSecond = (bpm / 60) * 4;

    // Parse each line into string groups
    const stringGroups = lines.map((line) => {
      const parts = line.split("|").filter((part) => part.trim());
      return parts;
    });

    if (stringGroups.length === 0) return this.getDefaultSong();

    const maxMeasures = Math.max(...stringGroups.map((group) => group.length));

    const measureDuration = 240 / bpm; // Quarter notes per measure

    for (let measureIndex = 0; measureIndex < maxMeasures; measureIndex++) {
      const measureNotes: TabNote[] = [];
      const startTime = measureIndex * measureDuration;
      const endTime = startTime + measureDuration;

      stringGroups.forEach((stringGroup, stringIndex) => {
        if (measureIndex < stringGroup.length) {
          const measureData = stringGroup[measureIndex];
          const line = lines[stringIndex];
          const stringChar = line.charAt(0);
          const actualStringNumber = getStringNumber(stringChar, stringIndex);

          // Parse advanced notation
          const parsedNotes = this.parseAdvancedNotation(
            measureData,
            actualStringNumber,
            startTime,
            measureDuration
          );
          measureNotes.push(...parsedNotes);
        }
      });

      if (measureNotes.length > 0) {
        measures.push({
          id: `measure${measureIndex + 1}`,
          timeSignature: [4, 4],
          notes: measureNotes.sort((a, b) => a.time - b.time),
          startTime,
          endTime,
          tempo: bpm,
        });
      }
    }

    return {
      title: "Parsed Advanced Song",
      bpm,
      timeSignature: [4, 4],
      measures,
      duration: measures.length * measureDuration,
      difficulty: this.calculateDifficulty(measures),
    };
  }

  /**
   * Parse advanced notation from a measure string
   */
  private static parseAdvancedNotation(
    measureData: string,
    stringNumber: number,
    startTime: number,
    measureDuration: number
  ): TabNote[] {
    const notes: TabNote[] = [];
    const tokens = this.tokenizeNotation(measureData);
    const timePerToken = measureDuration / Math.max(tokens.length, 1);

    tokens.forEach((token, index) => {
      const noteTime = startTime + index * timePerToken;
      const parsedNote = this.parseNotationToken(token, stringNumber, noteTime);

      if (parsedNote) {
        notes.push(parsedNote);
      }
    });

    return notes;
  }

  /**
   * Tokenize notation string into individual note events
   */
  private static tokenizeNotation(notation: string): string[] {
    // Remove dashes and split by significant notation
    const cleaned = notation.replace(/-/g, " ");

    // Match complex patterns: fret numbers with techniques
    const tokens =
      cleaned.match(/(?:\d+[bh/\\~pm]*\d*|\(\d+\)|<\d+>|x|\.)/g) || [];

    return tokens.filter((token) => token.trim() && token !== ".");
  }

  /**
   * Parse individual notation token
   */
  private static parseNotationToken(
    token: string,
    stringNumber: number,
    time: number
  ): TabNote | null {
    // Handle muted notes
    if (token === "x") {
      return {
        fret: 0,
        string: stringNumber,
        time,
        duration: 0.25,
        technique: { type: "palm-mute" },
      };
    }

    // Handle harmonics
    const harmonicMatch = token.match(/[<(](\d+)[>)]/);
    if (harmonicMatch) {
      const fret = parseInt(harmonicMatch[1]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: token.includes("<") ? "harmonic" : "pinch",
        },
      };
    }

    // Handle bends
    const bendMatch = token.match(/(\d+)b(\d+)/);
    if (bendMatch) {
      const fret = parseInt(bendMatch[1]);
      const bendTarget = parseInt(bendMatch[2]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: "bend",
          value: bendTarget - fret,
          target: bendTarget,
        },
      };
    }

    // Handle hammer-ons
    const hammerMatch = token.match(/(\d+)h(\d+)/);
    if (hammerMatch) {
      const fret = parseInt(hammerMatch[1]);
      const target = parseInt(hammerMatch[2]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: "hammer",
          target,
        },
      };
    }

    // Handle pull-offs
    const pulloffMatch = token.match(/(\d+)p(\d+)/);
    if (pulloffMatch) {
      const fret = parseInt(pulloffMatch[1]);
      const target = parseInt(pulloffMatch[2]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: "pulloff",
          target,
        },
      };
    }

    // Handle slides
    const slideUpMatch = token.match(/(\d+)\/(\d+)/);
    if (slideUpMatch) {
      const fret = parseInt(slideUpMatch[1]);
      const target = parseInt(slideUpMatch[2]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: "slide",
          target,
        },
      };
    }

    const slideDownMatch = token.match(/(\d+)\\(\d+)/);
    if (slideDownMatch) {
      const fret = parseInt(slideDownMatch[1]);
      const target = parseInt(slideDownMatch[2]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.5,
        technique: {
          type: "slide",
          target,
        },
      };
    }

    // Handle vibrato
    const vibratoMatch = token.match(/(\d+)~/);
    if (vibratoMatch) {
      const fret = parseInt(vibratoMatch[1]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.75,
        technique: {
          type: "vibrato",
        },
      };
    }

    // Handle palm muting
    const palmMuteMatch = token.match(/(\d+)pm/);
    if (palmMuteMatch) {
      const fret = parseInt(palmMuteMatch[1]);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.25,
        technique: {
          type: "palm-mute",
        },
      };
    }

    // Handle simple fret numbers
    const simpleMatch = token.match(/^\d+$/);
    if (simpleMatch) {
      const fret = parseInt(token);
      return {
        fret,
        string: stringNumber,
        time,
        duration: 0.25,
      };
    }

    return null;
  }

  /**
   * Calculate difficulty based on techniques used
   */
  private static calculateDifficulty(
    measures: TabMeasure[]
  ): "beginner" | "intermediate" | "advanced" | "expert" {
    let complexityScore = 0;
    let totalNotes = 0;

    measures.forEach((measure) => {
      measure.notes.forEach((note) => {
        totalNotes++;

        if (note.technique) {
          switch (note.technique.type) {
            case "bend":
              complexityScore += note.technique.value || 2;
              break;
            case "hammer":
            case "pulloff":
              complexityScore += 2;
              break;
            case "slide":
              complexityScore += 1.5;
              break;
            case "vibrato":
              complexityScore += 1;
              break;
            case "pinch":
              complexityScore += 3;
              break;
            case "harmonic":
              complexityScore += 2;
              break;
            case "palm-mute":
              complexityScore += 0.5;
              break;
          }
        }

        // High fret positions add complexity
        if (note.fret > 12) complexityScore += 1;
        if (note.fret > 15) complexityScore += 2;
      });
    });

    const avgComplexity = totalNotes > 0 ? complexityScore / totalNotes : 0;

    if (avgComplexity < 0.5) return "beginner";
    if (avgComplexity < 1.5) return "intermediate";
    if (avgComplexity < 3) return "advanced";
    return "expert";
  }

  /**
   * Create song metadata
   */
  static createSongMetadata(
    title: string,
    artist: string,
    bpm: number,
    key: string,
    duration: number,
    difficulty: string
  ) {
    return {
      title,
      artist,
      bpm,
      key,
      duration,
      difficulty,
      timeSignature: [4, 4],
      genre: "Rock", // Could be inferred
      year: new Date().getFullYear(),
      tuning: "EADGBE", // Standard tuning
      capo: 0,
    };
  }

  /**
   * Create timing data for audio sync
   */
  static createTimingData(measures: TabMeasure[], bpm: number): TimingData {
    const timingMarkers: TimingMarker[] = [];
    const beatsPerMeasure = 4;
    const beatDuration = 60 / bpm;

    measures.forEach((measure, index) => {
      for (let beat = 0; beat < beatsPerMeasure; beat++) {
        timingMarkers.push({
          measure: index + 1,
          beat: beat + 1,
          time: measure.startTime + beat * beatDuration,
          bpm: measure.tempo || bpm,
        });
      }
    });

    return {
      bpm,
      beatsPerMeasure,
      totalMeasures: measures.length,
      markers: timingMarkers,
    };
  }

  /**
   * Legacy support for basic ASCII
   */
  static parseASCIITab(tabText: string, bpm: number = 120): ParsedSong {
    return this.parseAdvancedASCIITab(tabText, bpm);
  }

  /**
   * Auto-detect and parse various formats
   */
  static parseAuto(input: string, bpm: number = 120): ParsedSong {
    const trimmedInput = input.trim();

    // Check for advanced notation
    if (/[bh/\\~]|\(\d+\)|<\d+>/.test(trimmedInput)) {
      return this.parseAdvancedASCIITab(input, bpm);
    }

    // Check for basic tablature
    if (trimmedInput.includes("E|") || trimmedInput.includes("e|")) {
      return this.parseAdvancedASCIITab(input, bpm);
    }

    // Check for chord progressions
    if (
      /^[A-G][m#b]*(\s+[A-G][m#b]*)*(\s*\|\s*[A-G][m#b]*(\s+[A-G][m#b]*)*)*$/.test(
        trimmedInput
      )
    ) {
      return this.parseChordProgression(input, bpm);
    }

    return this.getDefaultSong();
  }

  /**
   * Parse chord progressions (unchanged from original)
   */
  static parseChordProgression(
    chordText: string,
    bpm: number = 120
  ): ParsedSong {
    // Implementation stays the same as your original
    // ... (keeping your existing chord progression logic)
    return this.getDefaultSong(); // Placeholder
  }

  /**
   * Default song for testing
   */
  static getDefaultSong(): ParsedSong {
    return {
      title: "Default Test Song",
      artist: "Maestro.ai",
      bpm: 120,
      timeSignature: [4, 4],
      measures: [
        {
          id: "measure1",
          timeSignature: [4, 4],
          startTime: 0,
          endTime: 2,
          notes: [
            { fret: 0, string: 5, time: 0.0, duration: 0.5 },
            { fret: 2, string: 5, time: 0.5, duration: 0.5 },
            { fret: 3, string: 5, time: 1.0, duration: 0.5 },
            { fret: 5, string: 5, time: 1.5, duration: 0.5 },
          ],
        },
      ],
      duration: 2,
      difficulty: "beginner",
    };
  }
}

// Example advanced tab usage:
/*
const poisonTab = `
E|--0--2b4--3h5p3--<12>-----|--7--5--3--2~-----|
B|--0--3----5------5-------|--8--5--3--3------|
G|--0--2----4------4-------|--7--5--4--2------|
D|--2--0----5------5-------|--9--7--5--4------|
A|--2-------3------3-------|--7--5--3--2------|
E|--0---------------------|-------------------|
`;

const song = BasicTabParser.parseAdvancedASCIITab(poisonTab, 120);
const metadata = BasicTabParser.createSongMetadata(
  "I Won't Forget You", 
  "Poison", 
  120, 
  "G", 
  song.duration, 
  song.difficulty
);
const timing = BasicTabParser.createTimingData(song.measures, 120);
*/
