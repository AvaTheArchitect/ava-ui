// Fixed Tab Parser for Multi-Section ASCII Tabs
// Updated to handle guitar-1.txt format with 8 separate sections

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
  value?: number;
  target?: number;
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
   * FIXED: Parse multi-section ASCII tablature
   * Handles guitar-1.txt format with separate sections divided by double newlines
   */
  static parseAdvancedASCIITab(tabText: string, bpm: number = 120): ParsedSong {
    console.log("🎸 Starting parseAdvancedASCIITab...");
    console.log("Input length:", tabText.length);

    // Step 1: Split into sections (separated by double newlines)
    const sections = tabText
      .split(/\n\s*\n/)
      .filter((section) => section.trim());
    console.log("Found sections:", sections.length);

    if (sections.length === 0) {
      console.log("No sections found, returning default song");
      return this.getDefaultSong();
    }

    const measureDuration = 240 / bpm; // 4 beats at given BPM
    const allMeasures: TabMeasure[] = [];
    let measureCounter = 0;

    // Step 2: Parse each section separately
    sections.forEach((section, sectionIndex) => {
      console.log(`Processing section ${sectionIndex + 1}/${sections.length}`);

      const lines = section.split("\n").filter((line) => line.trim());
      console.log(`Section ${sectionIndex + 1} has ${lines.length} lines`);

      // Filter for tab lines (should have 6 strings: E, B, G, D, A, E)
      const tabLines = lines.filter((line) => {
        const trimmed = line.trim();
        return /^[EBGDAebgda]\|/.test(trimmed);
      });

      console.log(
        `Section ${sectionIndex + 1} has ${tabLines.length} tab lines`
      );

      if (tabLines.length >= 6) {
        // Need at least 6 strings
        // Parse this section as measures
        const sectionMeasures = this.parseSectionToMeasures(
          tabLines,
          bpm,
          measureCounter,
          sectionIndex
        );

        console.log(
          `Section ${sectionIndex + 1} produced ${
            sectionMeasures.length
          } measures`
        );
        allMeasures.push(...sectionMeasures);
        measureCounter += sectionMeasures.length;
      }
    });

    console.log("Total measures created:", allMeasures.length);

    return {
      title: "Parsed Multi-Section Song",
      bpm,
      timeSignature: [4, 4],
      measures: allMeasures,
      duration: allMeasures.length * measureDuration,
      difficulty: this.calculateDifficulty(allMeasures),
    };
  }

  /**
   * Parse a single section (6 string lines) into measures
   */
  private static parseSectionToMeasures(
    tabLines: string[],
    bpm: number,
    startingMeasureIndex: number,
    sectionIndex: number
  ): TabMeasure[] {
    const measures: TabMeasure[] = [];
    const measureDuration = 240 / bpm;

    // Extract measures from each string line
    const stringMeasures: string[][] = [];

    tabLines.forEach((line, lineIndex) => {
      // Remove string identifier (E|, B|, etc.)
      const tabContent = line.substring(2);

      // Split by | to get measures
      const lineMeasures = tabContent.split("|").filter((m) => m.trim());
      stringMeasures.push(lineMeasures);

      console.log(
        `String ${lineIndex} in section ${sectionIndex + 1}: ${
          lineMeasures.length
        } measures`
      );
    });

    // Find max measures across all strings
    const maxMeasures = Math.max(...stringMeasures.map((arr) => arr.length));
    console.log(`Section ${sectionIndex + 1} max measures: ${maxMeasures}`);

    // Create measures
    for (let measureIndex = 0; measureIndex < maxMeasures; measureIndex++) {
      const globalMeasureIndex = startingMeasureIndex + measureIndex;
      const startTime = globalMeasureIndex * measureDuration;
      const endTime = startTime + measureDuration;
      const measureNotes: TabNote[] = [];

      // Process each string for this measure
      stringMeasures.forEach((stringMeasureArray, stringIndex) => {
        if (measureIndex < stringMeasureArray.length) {
          const measureContent = stringMeasureArray[measureIndex];

          // Parse notes from this string's measure
          const stringNotes = this.parseStringMeasure(
            measureContent,
            stringIndex,
            startTime,
            measureDuration
          );

          measureNotes.push(...stringNotes);
        }
      });

      if (measureNotes.length > 0) {
        measures.push({
          id: `measure-${globalMeasureIndex + 1}`,
          timeSignature: [4, 4],
          notes: measureNotes.sort((a, b) => a.time - b.time),
          startTime,
          endTime,
          tempo: bpm,
        });

        console.log(
          `Created measure ${globalMeasureIndex + 1} with ${
            measureNotes.length
          } notes`
        );
      }
    }

    return measures;
  }

  /**
   * Parse notes from a single string's measure content
   */
  private static parseStringMeasure(
    measureContent: string,
    stringIndex: number,
    startTime: number,
    measureDuration: number
  ): TabNote[] {
    const notes: TabNote[] = [];

    // Clean up the measure content
    const cleaned = measureContent.replace(/-+/g, "-");

    // Extract all note tokens (fret numbers and techniques)
    const tokens = this.extractNoteTokens(cleaned);

    if (tokens.length === 0) return notes;

    // Distribute notes evenly across measure duration
    const timePerNote = measureDuration / tokens.length;

    tokens.forEach((token, index) => {
      const noteTime = startTime + index * timePerNote;
      const parsedNote = this.parseNotationToken(token, stringIndex, noteTime);

      if (parsedNote) {
        notes.push(parsedNote);
      }
    });

    return notes;
  }

  /**
   * Extract note tokens from measure content
   */
  private static extractNoteTokens(content: string): string[] {
    // Match fret numbers with optional techniques
    const tokens =
      content.match(/\d+[bh/\\~pm]*\d*|\(\d+\)|<\d+>|\d+|x/g) || [];
    return tokens.filter((token) => token.trim());
  }

  /**
   * Parse individual notation token (unchanged from original)
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
   * Calculate difficulty (unchanged from original)
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
   * Legacy support methods (unchanged)
   */
  static parseASCIITab(tabText: string, bpm: number = 120): ParsedSong {
    return this.parseAdvancedASCIITab(tabText, bpm);
  }

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
