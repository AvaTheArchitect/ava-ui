// 🎸 Basic Tab Parser for Real Songs
// Place this in: /maestro-ai/src/lib/tab-parsers/basicTabParser.ts

export interface TabNote {
  fret: number;
  string: number; // 0-5 (High E=0, B=1, G=2, D=3, A=4, Low E=5)
  time: number; // Time in seconds
  duration?: number;
}

export interface TabMeasure {
  id: string;
  timeSignature: [number, number];
  notes: TabNote[];
  startTime: number;
  endTime: number;
}

export interface ParsedSong {
  title: string;
  artist?: string;
  bpm: number;
  timeSignature: [number, number];
  measures: TabMeasure[];
  duration: number;
}

export class BasicTabParser {
  /**
   * Parse basic ASCII tablature format
   * Example input:
   * E|--0--2--3--5--|  ← High E (1st string, index 0)
   * B|--0--2--3--5--|  ← B string (2nd string, index 1)
   * G|--0--2--4--5--|  ← G string (3rd string, index 2)
   * D|--0--2--4--5--|  ← D string (4th string, index 3)
   * A|--0--2--3--5--|  ← A string (5th string, index 4)
   * E|--0--2--3--5--|  ← Low E (6th string, index 5)
   */
  static parseASCIITab(tabText: string, bpm: number = 120): ParsedSong {
    const lines = tabText
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    // ✅ Fixed: Handle both E strings properly
    const getStringNumber = (stringChar: string, lineIndex: number): number => {
      // Map string characters to string numbers based on position
      // Standard tuning: E(high)-B-G-D-A-E(low) = strings 0-1-2-3-4-5
      const standardOrder = ["E", "B", "G", "D", "A", "E"]; // High to Low

      if (stringChar.toUpperCase() === "E") {
        // If it's the first line, it's high E (string 0)
        // If it's the last line, it's low E (string 5)
        return lineIndex === 0 ? 0 : 5;
      }

      const stringMap: { [key: string]: number } = {
        B: 1,
        b: 1, // B (2nd string)
        G: 2,
        g: 2, // G (3rd string)
        D: 3,
        d: 3, // D (4th string)
        A: 4,
        a: 4, // A (5th string)
      };

      return stringMap[stringChar] ?? lineIndex; // Fallback to line position
    };

    const measures: TabMeasure[] = [];
    const notesPerSecond = (bpm / 60) * 4; // Assuming 16th notes
    let measureCount = 0;

    // Group lines by measures (look for | separators)
    const stringGroups = lines.map((line) => {
      const parts = line.split("|").filter((part) => part.trim());
      return parts;
    });

    if (stringGroups.length === 0) return this.getDefaultSong();

    const maxMeasures = Math.max(...stringGroups.map((group) => group.length));

    for (let measureIndex = 0; measureIndex < maxMeasures; measureIndex++) {
      const measureNotes: TabNote[] = [];
      const measureDuration = 4; // 4 seconds per measure at 120 BPM
      const startTime = measureIndex * measureDuration;
      const endTime = startTime + measureDuration;

      // Process each string for this measure
      stringGroups.forEach((stringGroup, stringIndex) => {
        if (measureIndex < stringGroup.length) {
          const measureData = stringGroup[measureIndex];

          // Get the string character from the line (before the |)
          const line = lines[stringIndex];
          const stringChar = line.charAt(0); // First character should be the string name
          const actualStringNumber = getStringNumber(stringChar, stringIndex);

          // Extract fret numbers from the measure
          const fretMatches = measureData.match(/\d+/g);
          if (fretMatches) {
            fretMatches.forEach((fretStr, noteIndex) => {
              const fret = parseInt(fretStr);
              const timeInMeasure =
                (noteIndex / fretMatches.length) * measureDuration;
              const absoluteTime = startTime + timeInMeasure;

              measureNotes.push({
                fret,
                string: actualStringNumber,
                time: absoluteTime,
                duration: 0.5,
              });
            });
          }
        }
      });

      if (measureNotes.length > 0) {
        measures.push({
          id: `measure${measureIndex + 1}`,
          timeSignature: [4, 4],
          notes: measureNotes.sort((a, b) => a.time - b.time),
          startTime,
          endTime,
        });
      }
    }

    return {
      title: "Parsed Song",
      bpm,
      timeSignature: [4, 4],
      measures,
      duration: measures.length * 4,
    };
  }

  /**
   * Parse simple chord progressions
   * Example: "C Am F G | C Am F G"
   *
   * String numbering: High E=0, B=1, G=2, D=3, A=4, Low E=5
   */
  static parseChordProgression(
    chordText: string,
    bpm: number = 120
  ): ParsedSong {
    const measures: TabMeasure[] = [];
    const chordToFret: { [key: string]: { string: number; fret: number }[] } = {
      C: [
        { string: 4, fret: 3 }, // A string, 3rd fret
        { string: 3, fret: 2 }, // D string, 2nd fret
        { string: 2, fret: 0 }, // G string, open
        { string: 1, fret: 1 }, // B string, 1st fret
        { string: 0, fret: 0 }, // High E string, open
      ],
      Am: [
        { string: 4, fret: 0 }, // A string, open
        { string: 3, fret: 2 }, // D string, 2nd fret
        { string: 2, fret: 2 }, // G string, 2nd fret
        { string: 1, fret: 1 }, // B string, 1st fret
        { string: 0, fret: 0 }, // High E string, open
      ],
      F: [
        { string: 5, fret: 1 }, // Low E, 1st fret (barre)
        { string: 4, fret: 1 }, // A string, 1st fret (barre)
        { string: 3, fret: 3 }, // D string, 3rd fret
        { string: 2, fret: 3 }, // G string, 3rd fret
        { string: 1, fret: 1 }, // B string, 1st fret (barre)
        { string: 0, fret: 1 }, // High E, 1st fret (barre)
      ],
      G: [
        { string: 5, fret: 3 }, // Low E, 3rd fret
        { string: 4, fret: 2 }, // A string, 2nd fret
        { string: 3, fret: 0 }, // D string, open
        { string: 2, fret: 0 }, // G string, open
        { string: 1, fret: 3 }, // B string, 3rd fret
        { string: 0, fret: 3 }, // High E, 3rd fret
      ],
    };

    const chordMeasures = chordText.split("|");

    chordMeasures.forEach((measure, measureIndex) => {
      const chords = measure.trim().split(/\s+/);
      const measureNotes: TabNote[] = [];
      const measureDuration = 4; // 4 seconds per measure
      const startTime = measureIndex * measureDuration;
      const endTime = startTime + measureDuration;
      const timePerChord = measureDuration / chords.length;

      chords.forEach((chord, chordIndex) => {
        const chordTime = startTime + chordIndex * timePerChord;
        const chordFrets = chordToFret[chord];

        if (chordFrets) {
          chordFrets.forEach(({ string, fret }) => {
            measureNotes.push({
              fret,
              string,
              time: chordTime,
              duration: timePerChord,
            });
          });
        }
      });

      if (measureNotes.length > 0) {
        measures.push({
          id: `measure${measureIndex + 1}`,
          timeSignature: [4, 4],
          notes: measureNotes,
          startTime,
          endTime,
        });
      }
    });

    return {
      title: "Chord Progression",
      bpm,
      timeSignature: [4, 4],
      measures,
      duration: measures.length * 4,
    };
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
          endTime: 4,
          notes: [
            { fret: 0, string: 5, time: 0.0 },
            { fret: 2, string: 5, time: 1.0 },
            { fret: 3, string: 5, time: 2.0 },
            { fret: 5, string: 5, time: 3.0 },
          ],
        },
        {
          id: "measure2",
          timeSignature: [4, 4],
          startTime: 4,
          endTime: 8,
          notes: [
            { fret: 7, string: 5, time: 4.0 },
            { fret: 5, string: 5, time: 5.0 },
            { fret: 3, string: 5, time: 6.0 },
            { fret: 2, string: 5, time: 7.0 },
          ],
        },
      ],
      duration: 8,
    };
  }

  /**
   * Parse common tab formats automatically
   */
  static parseAuto(input: string, bpm: number = 120): ParsedSong {
    const trimmedInput = input.trim();

    // Check if it looks like ASCII tablature
    if (trimmedInput.includes("E|") || trimmedInput.includes("e|")) {
      return this.parseASCIITab(input, bpm);
    }

    // Check if it looks like chord progression
    if (
      /^[A-G][m#b]*(\s+[A-G][m#b]*)*(\s*\|\s*[A-G][m#b]*(\s+[A-G][m#b]*)*)*$/.test(
        trimmedInput
      )
    ) {
      return this.parseChordProgression(input, bpm);
    }

    // Default fallback
    return this.getDefaultSong();
  }
}

// 🎸 Example usage:
/*
const asciiTab = `
E|--0--2--3--5--|--7--5--3--2--|
B|--0--2--3--5--|--7--5--3--2--|
G|--0--2--4--5--|--7--5--4--2--|
D|--0--2--4--5--|--7--5--4--2--|
A|--0--2--3--5--|--7--5--3--2--|
E|--0--2--3--5--|--7--5--3--2--|
`;

const chordProgression = "C Am F G | C Am F G";

const song1 = BasicTabParser.parseASCIITab(asciiTab, 120);
const song2 = BasicTabParser.parseChordProgression(chordProgression, 120);
const song3 = BasicTabParser.parseAuto(asciiTab, 120);
*/
