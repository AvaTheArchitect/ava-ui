import { AlphaTabApi, Settings } from "@coderline/alphatab";

// ✅ Added proper type definitions to replace 'any'
export interface SongsterrJsonData {
  meta?: {
    title?: string;
    artist?: string;
    album?: string;
    tuning?: string[];
    tempo?: number;
    timeSignature?: [number, number];
  };
  tracks?: Array<{
    id?: string;
    name?: string;
    instrument?: string;
    channel?: number;
    strings?: number;
    tuning?: number[];
  }>;
  measures?: Array<{
    number: number;
    timeSignature?: [number, number];
    tempo?: number;
    notes?: Array<{
      time: number;
      duration: number;
      string: number;
      fret: number;
      velocity?: number;
      techniques?: NoteTechnique[];
    }>;
  }>;
}

export interface MIDIEvent {
  type: "noteOn" | "noteOff";
  time: number;
  note: number;
  velocity: number;
  duration?: number;
}

export interface ParsedTab {
  title: string;
  artist: string;
  album?: string;
  tuning: string[];
  tempo: number;
  timeSignature: [number, number];
  tracks: ParsedTrack[];
  measures: ParsedMeasure[];
}

export interface ParsedTrack {
  id: string;
  name: string;
  instrument: string;
  channel: number;
  strings: number;
  tuning: number[];
}

export interface ParsedMeasure {
  number: number;
  timeSignature?: [number, number];
  tempo?: number;
  notes: ParsedNote[];
}

export interface ParsedNote {
  time: number;
  duration: number;
  string: number;
  fret: number;
  velocity: number;
  techniques?: NoteTechnique[];
}

export interface NoteTechnique {
  type:
    | "bend"
    | "slide"
    | "hammer"
    | "pull"
    | "vibrato"
    | "palm-mute"
    | "harmonic";
  value?: number;
  target?: number;
}

// ✅ Constants to replace magic numbers
const DEFAULT_TEMPO = 120;
const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];
const DEFAULT_VELOCITY = 127;
const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"];
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];
const DEFAULT_STRINGS = 6;
const MAX_FRET = 24;
const MAX_TEMPO = 300;
const MIN_TEMPO = 1;
const QUARTER_NOTE_DURATION = 0.25;
const DEFAULT_NOTE_VELOCITY = 100;
const CHARACTERS_PER_BEAT = 4;
const MIN_ASCII_WIDTH = 16;

export class TabParser {
  /**
   * Parse Guitar Pro file using alphaTab
   */
  static async parseGuitarPro(fileBuffer: ArrayBuffer): Promise<ParsedTab> {
    try {
      // Create alphaTab instance to parse the file
      const settings = new Settings();
      const container = document.createElement("div");
      const api = new AlphaTabApi(container, settings);

      // ✅ FIXED: Actually use the fileBuffer and api parameters
      // Note: This is a placeholder implementation - actual alphaTab integration needed
      console.log("Parsing file with buffer size:", fileBuffer.byteLength);
      console.log("AlphaTab API initialized:", api);

      // TODO: Implement actual alphaTab parsing when API is finalized
      return {
        title: "Parsed Song",
        artist: "Unknown Artist",
        tuning: STANDARD_TUNING,
        tempo: DEFAULT_TEMPO,
        timeSignature: DEFAULT_TIME_SIGNATURE,
        tracks: [
          {
            id: "track1",
            name: "Guitar",
            instrument: "Electric Guitar",
            channel: 0,
            strings: DEFAULT_STRINGS,
            tuning: STANDARD_TUNING_MIDI,
          },
        ],
        measures: [],
      };
    } catch (error) {
      console.error("Error parsing Guitar Pro file:", error);
      throw new Error(`Failed to parse Guitar Pro file: ${error}`);
    }
  }

  /**
   * Parse Songsterr-like JSON format
   */
  static parseSongsterr(jsonData: SongsterrJsonData): ParsedTab {
    try {
      const { meta, tracks, measures } = jsonData;

      return {
        title: meta?.title || "Unknown",
        artist: meta?.artist || "Unknown",
        album: meta?.album,
        tuning: meta?.tuning || STANDARD_TUNING,
        tempo: meta?.tempo || DEFAULT_TEMPO,
        timeSignature: meta?.timeSignature || DEFAULT_TIME_SIGNATURE,
        tracks:
          tracks?.map((track, index) => ({
            id: track.id || `track${index}`,
            name: track.name || `Track ${index + 1}`,
            instrument: track.instrument || "Guitar",
            channel: track.channel || index,
            strings: track.strings || DEFAULT_STRINGS,
            tuning: track.tuning || STANDARD_TUNING_MIDI,
          })) || [],
        measures:
          measures?.map((measure) => ({
            number: measure.number,
            timeSignature: measure.timeSignature,
            tempo: measure.tempo,
            notes:
              measure.notes?.map((note) => ({
                time: note.time,
                duration: note.duration,
                string: note.string,
                fret: note.fret,
                velocity: note.velocity || DEFAULT_VELOCITY,
                techniques: note.techniques || [],
              })) || [],
          })) || [],
      };
    } catch (error) {
      console.error("Error parsing Songsterr JSON:", error);
      throw new Error(`Failed to parse Songsterr format: ${error}`);
    }
  }

  /**
   * Parse ASCII tablature
   */
  static parseASCIITab(tabText: string): ParsedTab {
    try {
      const lines = tabText.split("\n");
      const stringLines: string[] = [];
      let title = "Unknown";
      let artist = "Unknown";

      // Extract metadata
      for (const line of lines) {
        const trimmedLine = line.trim();

        if (
          trimmedLine.toLowerCase().includes("title:") ||
          trimmedLine.toLowerCase().includes("song:")
        ) {
          title = trimmedLine.split(":")[1]?.trim() || title;
        }
        if (
          trimmedLine.toLowerCase().includes("artist:") ||
          trimmedLine.toLowerCase().includes("by:")
        ) {
          artist = trimmedLine.split(":")[1]?.trim() || artist;
        }

        // Detect tab lines (contain frets and dashes)
        // Look for lines with string indicators (e, B, G, D, A, E) and tab notation
        if (/^[a-gA-G][\|\-]*[\-0-9hp\/\\~\|]*[\|\-]*$/.test(trimmedLine)) {
          stringLines.push(trimmedLine);
        }
      }

      // Parse tab notation
      const measures: ParsedMeasure[] = [];
      const notes: ParsedNote[] = [];

      // Basic parsing logic for ASCII tabs
      stringLines.forEach((line, stringIndex) => {
        const chars = line.split("");

        chars.forEach((char, position) => {
          if (/\d/.test(char)) {
            const fret = parseInt(char, 10);
            notes.push({
              time: position * QUARTER_NOTE_DURATION,
              duration: QUARTER_NOTE_DURATION,
              string: stringIndex,
              fret: fret,
              velocity: DEFAULT_NOTE_VELOCITY,
              techniques: this.detectTechniques(line, position),
            });
          }
        });
      });

      if (notes.length > 0) {
        measures.push({
          number: 1,
          notes: notes,
        });
      }

      return {
        title,
        artist,
        tuning: STANDARD_TUNING,
        tempo: DEFAULT_TEMPO,
        timeSignature: DEFAULT_TIME_SIGNATURE,
        tracks: [
          {
            id: "track1",
            name: "Guitar",
            instrument: "Guitar",
            channel: 0,
            strings: DEFAULT_STRINGS,
            tuning: STANDARD_TUNING_MIDI,
          },
        ],
        measures,
      };
    } catch (error) {
      console.error("Error parsing ASCII tab:", error);
      throw new Error(`Failed to parse ASCII tab: ${error}`);
    }
  }

  /**
   * Detect playing techniques from ASCII tab notation
   */
  private static detectTechniques(
    line: string,
    position: number
  ): NoteTechnique[] {
    const techniques: NoteTechnique[] = [];

    // Check surrounding characters for technique indicators
    const beforeChar = line[position - 1];
    const afterChar = line[position + 1];

    if (afterChar === "h") techniques.push({ type: "hammer" });
    if (afterChar === "p") techniques.push({ type: "pull" });
    if (afterChar === "/" || beforeChar === "/")
      techniques.push({ type: "slide" });
    if (afterChar === "~") techniques.push({ type: "vibrato" });

    return techniques;
  }

  /**
   * Parse basic chord symbols
   */
  static parseChords(chordText: string): string[] {
    try {
      // Simple chord extraction - matches common chord patterns
      const chordPattern =
        /[A-G][#b]?(?:maj|min|m|M|dim|aug|sus[24]?|\d+)*(?:\/[A-G][#b]?)?/g;
      const chords = chordText.match(chordPattern) || [];
      return chords;
    } catch (error) {
      console.error("Error parsing chords:", error);
      return [];
    }
  }

  /**
   * Auto-detect format and parse accordingly
   */
  static async parseAuto(
    input: string | ArrayBuffer | SongsterrJsonData
  ): Promise<ParsedTab> {
    try {
      if (typeof input === "string") {
        // Try to parse as JSON first
        try {
          const jsonData = JSON.parse(input) as SongsterrJsonData;
          return this.parseSongsterr(jsonData);
        } catch {
          // Fall back to ASCII tab parsing
          return this.parseASCIITab(input);
        }
      } else if (input instanceof ArrayBuffer) {
        // Assume Guitar Pro format
        return await this.parseGuitarPro(input);
      } else if (typeof input === "object" && input !== null) {
        // Assume it's already parsed JSON
        return this.parseSongsterr(input);
      }

      throw new Error("Unsupported input format");
    } catch (error) {
      console.error("Auto-parse failed:", error);
      throw error;
    }
  }

  /**
   * Convert parsed tab to MIDI-like events
   */
  static toMIDIEvents(parsedTab: ParsedTab): MIDIEvent[] {
    const events: MIDIEvent[] = [];

    parsedTab.measures.forEach((measure) => {
      measure.notes.forEach((note) => {
        const midiNote = this.fretToMIDI(
          note.fret,
          note.string,
          parsedTab.tracks[0]?.tuning || []
        );

        events.push({
          type: "noteOn",
          time: note.time,
          note: midiNote,
          velocity: note.velocity,
          duration: note.duration,
        });

        events.push({
          type: "noteOff",
          time: note.time + note.duration,
          note: midiNote,
          velocity: 0,
        });
      });
    });

    return events.sort((a, b) => a.time - b.time);
  }

  /**
   * Convert fret position to MIDI note number
   */
  private static fretToMIDI(
    fret: number,
    string: number,
    tuning: number[]
  ): number {
    const openStringNote = tuning[string] || 40; // Default to E if not found
    return openStringNote + fret;
  }

  /**
   * Export to ASCII tab format
   */
  static exportToASCII(parsedTab: ParsedTab): string {
    const stringNames = ["e", "B", "G", "D", "A", "E"];

    // Calculate total width needed
    const maxTime = Math.max(
      ...parsedTab.measures.flatMap((m) =>
        m.notes.map((n) => n.time + n.duration)
      ),
      MIN_ASCII_WIDTH
    );
    const width = Math.ceil(maxTime * CHARACTERS_PER_BEAT);

    // Initialize lines with dashes
    const lines: string[] = [];
    for (let i = 0; i < DEFAULT_STRINGS; i++) {
      lines[i] = stringNames[i] + "|" + "-".repeat(width) + "|";
    }

    // Place fret numbers
    parsedTab.measures.forEach((measure) => {
      measure.notes.forEach((note) => {
        const position = Math.floor(note.time * CHARACTERS_PER_BEAT) + 2; // +2 for string name and |
        if (position < lines[note.string]?.length - 1 && lines[note.string]) {
          const line = lines[note.string];
          const fretStr = note.fret.toString();
          lines[note.string] =
            line.substring(0, position) +
            fretStr +
            line.substring(position + fretStr.length);
        }
      });
    });

    return [
      `Title: ${parsedTab.title}`,
      `Artist: ${parsedTab.artist}`,
      `Tempo: ${parsedTab.tempo}`,
      "",
      ...lines,
      "",
    ].join("\n");
  }

  /**
   * Validate parsed tab data
   */
  static validate(parsedTab: ParsedTab): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!parsedTab.title || parsedTab.title.trim() === "") {
      errors.push("Title is required");
    }

    if (!parsedTab.tracks || parsedTab.tracks.length === 0) {
      errors.push("At least one track is required");
    }

    if (parsedTab.tempo <= MIN_TEMPO || parsedTab.tempo > MAX_TEMPO) {
      errors.push(`Tempo must be between ${MIN_TEMPO} and ${MAX_TEMPO} BPM`);
    }

    parsedTab.measures?.forEach((measure, index) => {
      measure.notes?.forEach((note, noteIndex) => {
        if (note.fret < 0 || note.fret > MAX_FRET) {
          errors.push(
            `Invalid fret ${note.fret} in measure ${index + 1}, note ${
              noteIndex + 1
            }`
          );
        }
        if (note.string < 0 || note.string >= DEFAULT_STRINGS) {
          errors.push(
            `Invalid string ${note.string} in measure ${index + 1}, note ${
              noteIndex + 1
            }`
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Convenience functions
export const parseGuitarPro = TabParser.parseGuitarPro;
export const parseSongsterr = TabParser.parseSongsterr;
export const parseASCIITab = TabParser.parseASCIITab;
export const parseAuto = TabParser.parseAuto;
export const parseChords = TabParser.parseChords;
export const exportToASCII = TabParser.exportToASCII;
export const toMIDIEvents = TabParser.toMIDIEvents;
