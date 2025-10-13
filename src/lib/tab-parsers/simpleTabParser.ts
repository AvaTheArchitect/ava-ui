// Simple Tab Parser for Basic ASCII Tabs
// Temporary parser for testing - will be replaced with XML parser

export interface SimpleTabNote {
  fret: number;
  string: number; // 0-5 (High E=0, B=1, G=2, D=3, A=4, Low E=5)
  time: number; // Time in seconds
  duration: number;
}

export interface SimpleTabMeasure {
  id: string;
  timeSignature: [number, number];
  notes: SimpleTabNote[];
  startTime: number;
  endTime: number;
}

export interface SimpleParsedSong {
  title: string;
  artist?: string;
  bpm: number;
  timeSignature: [number, number];
  measures: SimpleTabMeasure[];
  duration: number;
  difficulty?: string;
}

export class SimpleTabParser {
  /**
   * Parse basic ASCII tablature (no advanced notation)
   * Input format:
   * E|--12-14--12-14--|--10----10------|
   * B|----------------|--10----10------|
   * G|----------------|----------------|
   * D|----------------|----------------|
   * A|----------------|----------------|
   * E|----------------|----------------|
   */
  static parseBasicASCII(tabText: string, bpm: number = 120): SimpleParsedSong {
    const lines = tabText.trim().split('\n').filter(line => line.trim());
    
    // Filter to only tab lines (start with string names)
    const tabLines = lines.filter(line => {
      const trimmed = line.trim();
      return /^[EBGDAebgda]\|/.test(trimmed);
    });

    if (tabLines.length === 0) {
      return this.getDefaultSong(bpm);
    }

    // Group lines by string (should be 6 lines per group)
    const stringGroups = this.groupTabLines(tabLines);
    
    // Parse measures from the first complete group
    const measures = this.parseMeasures(stringGroups[0] || [], bpm);
    
    return {
      title: "Parsed Song",
      bpm,
      timeSignature: [4, 4],
      measures,
      duration: measures.length > 0 ? measures[measures.length - 1].endTime : 0,
      difficulty: "intermediate"
    };
  }

  /**
   * Group tab lines into string sets (E, B, G, D, A, E)
   */
  private static groupTabLines(tabLines: string[]): string[][] {
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    
    for (const line of tabLines) {
      const stringChar = line.charAt(0).toUpperCase();
      
      // Start new group when we see 'E' (high E string)
      if (stringChar === 'E' && currentGroup.length > 0) {
        if (currentGroup.length >= 6) {
          groups.push(currentGroup);
        }
        currentGroup = [line];
      } else {
        currentGroup.push(line);
      }
    }
    
    // Add the last group
    if (currentGroup.length >= 6) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Parse measures from a group of string lines
   */
  private static parseMeasures(stringLines: string[], bpm: number): SimpleTabMeasure[] {
    if (stringLines.length < 6) {
      return [];
    }

    // Calculate timing
    const beatDuration = 60 / bpm; // seconds per beat
    const measureDuration = beatDuration * 4; // 4/4 time signature

    // Split each string line by measures (|)
    const stringMeasures: string[][] = stringLines.map(line => {
      // Remove the string identifier (E|, B|, etc.)
      const tabPart = line.substring(2);
      // Split by | and filter out empty parts
      return tabPart.split('|').filter(part => part.trim());
    });

    // Find the maximum number of measures across all strings
    const maxMeasures = Math.max(...stringMeasures.map(measures => measures.length));
    
    const measures: SimpleTabMeasure[] = [];

    for (let measureIndex = 0; measureIndex < maxMeasures; measureIndex++) {
      const startTime = measureIndex * measureDuration;
      const endTime = startTime + measureDuration;
      const notes: SimpleTabNote[] = [];

      // Parse each string for this measure
      stringMeasures.forEach((stringMeasureArray, stringIndex) => {
        if (measureIndex < stringMeasureArray.length) {
          const measureContent = stringMeasureArray[measureIndex];
          const stringNotes = this.parseStringMeasure(
            measureContent, 
            stringIndex, 
            startTime, 
            measureDuration
          );
          notes.push(...stringNotes);
        }
      });

      if (notes.length > 0 || measureIndex < 8) { // Include empty measures up to 8
        measures.push({
          id: `measure-${measureIndex + 1}`,
          timeSignature: [4, 4],
          notes: notes.sort((a, b) => a.time - b.time),
          startTime,
          endTime
        });
      }
    }

    return measures;
  }

  /**
   * Parse a single string's measure content
   */
  private static parseStringMeasure(
    measureContent: string, 
    stringIndex: number, 
    startTime: number, 
    measureDuration: number
  ): SimpleTabNote[] {
    const notes: SimpleTabNote[] = [];
    
    // Clean the measure content - remove extra dashes
    const cleaned = measureContent.replace(/-+/g, '-');
    
    // Find all fret numbers (1 or 2 digits)
    const fretMatches = [...cleaned.matchAll(/(\d{1,2})/g)];
    
    if (fretMatches.length === 0) {
      return notes;
    }

    // Calculate timing for each note within the measure
    const timePerNote = measureDuration / fretMatches.length;
    
    fretMatches.forEach((match, index) => {
      const fret = parseInt(match[1]);
      const noteTime = startTime + (index * timePerNote);
      
      notes.push({
        fret,
        string: stringIndex,
        time: noteTime,
        duration: timePerNote * 0.8 // Notes don't overlap
      });
    });

    return notes;
  }

  /**
   * Get default song for fallback
   */
  private static getDefaultSong(bpm: number = 120): SimpleParsedSong {
    const beatDuration = 60 / bpm;
    const measureDuration = beatDuration * 4;

    return {
      title: "Default Song",
      bpm,
      timeSignature: [4, 4],
      measures: [
        {
          id: "measure-1",
          timeSignature: [4, 4],
          startTime: 0,
          endTime: measureDuration,
          notes: [
            { fret: 0, string: 5, time: 0, duration: beatDuration },
            { fret: 2, string: 5, time: beatDuration, duration: beatDuration },
            { fret: 3, string: 5, time: beatDuration * 2, duration: beatDuration },
            { fret: 2, string: 5, time: beatDuration * 3, duration: beatDuration }
          ]
        }
      ],
      duration: measureDuration,
      difficulty: "beginner"
    };
  }

  /**
   * Convert to format expected by SVGTabDisplay
   */
  static convertToSVGFormat(song: SimpleParsedSong): any {
    return {
      title: song.title,
      artist: song.artist || "Unknown",
      bpm: song.bpm,
      timeSignature: song.timeSignature,
      measures: song.measures,
      duration: song.duration,
      difficulty: song.difficulty
    };
  }
}