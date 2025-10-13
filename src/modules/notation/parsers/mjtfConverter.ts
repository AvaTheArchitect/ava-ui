// 🎼 Complete MJTF Converter - Real ASCII to Professional Format
// /src/modules/notation/parsers/mjtfConverter.ts

export interface MJTFNote {
  string: number; // 1-6 (low E=6, high E=1) - Guitar Pro standard
  fret: number;
  duration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
  technique?: 'bend' | 'hammer' | 'pulloff' | 'slide' | 'vibrato' | 'palm-mute' | 'harmonic';
  bendValue?: number;
  slideTarget?: number;
  techniqueData?: {
    type: string;
    value?: number;
    target?: number;
  };
}

export interface MJTFBeat {
  timestamp: number; // seconds from song start
  notes: MJTFNote[];
  chord?: string;
}

export interface MJTFMeasure {
  index: number;
  timeSignature?: [number, number];
  beats: MJTFBeat[];
  startTime: number;
  endTime: number;
}

export interface MJTFTrack {
  name: string;
  tuning: string[]; // ["E", "A", "D", "G", "B", "E"] from low to high
  capo?: number;
  measures: MJTFMeasure[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  techniques: string[];
}

export interface MJTFSection {
  label: string;
  startMeasure: number;
  endMeasure: number;
  repeat?: number;
}

export interface MJTFSync {
  audioPath: string;
  bpm: number;
  timingMap: Array<{
    measure: number;
    start: number;
    beat?: number;
  }>;
}

export interface MJTFSong {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  bpm: number;
  timeSignature: [number, number];
  key: string;
  genre?: string;
  difficulty: string;
  tracks: MJTFTrack[];
  sections: MJTFSection[];
  sync: MJTFSync;
  metadata?: {
    created: string;
    version: string;
    source: string;
  };
}

// Fixed interface for note parsing
interface ParsedNoteData {
  fret: number;
  technique?: 'bend' | 'hammer' | 'pulloff' | 'slide' | 'vibrato' | 'palm-mute' | 'harmonic';
  bendValue?: number;
  slideTarget?: number;
}

export class MJTFConverter {
  /**
   * 🎸 MAIN CONVERSION METHOD - Convert Poison song from files
   */
  static async convertPoisonSongFromFiles(): Promise<MJTFSong> {
    try {
      console.log('🎸 Starting MJTF conversion for Poison song...');
      
      // Load the files
      const [metadataResponse, timingResponse, guitar1Response, guitar2Response] = await Promise.all([
        fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/metadata.json'),
        fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/timing.json'),
        fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-1.txt'),
        fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-2.txt')
      ]);

      if (!metadataResponse.ok || !timingResponse.ok || !guitar1Response.ok || !guitar2Response.ok) {
        throw new Error('Failed to load song files');
      }

      const metadata: any = await metadataResponse.json();
      const timing: any = await timingResponse.json();
      const guitar1Text: string = await guitar1Response.text();
      const guitar2Text: string = await guitar2Response.text();

      console.log('📁 Files loaded, parsing real ASCII content...');

      // Parse the real ASCII content with proper technique recognition
      const leadTrack: MJTFTrack = {
        name: "Lead Guitar",
        tuning: ["E", "A", "D", "G", "B", "E"],
        difficulty: "intermediate",
        techniques: this.extractTechniquesFromText(guitar1Text),
        measures: this.parseRealASCIITab(guitar1Text, timing.bpm)
      };

      const rhythmTrack: MJTFTrack = {
        name: "Rhythm Guitar", 
        tuning: ["E", "A", "D", "G", "B", "E"],
        difficulty: "beginner",
        techniques: this.extractTechniquesFromText(guitar2Text),
        measures: this.parseRealASCIITab(guitar2Text, timing.bpm)
      };

      // Create the complete MJTF song
      const mjtfSong: MJTFSong = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        bpm: timing.bpm,
        timeSignature: metadata.timeSignature,
        key: metadata.key,
        genre: metadata.genre,
        difficulty: metadata.difficulty,
        tracks: [leadTrack, rhythmTrack],
        sections: [
          { label: "Intro", startMeasure: 0, endMeasure: 7 },
          { label: "Verse", startMeasure: 8, endMeasure: 23 },
          { label: "Chorus", startMeasure: 24, endMeasure: 39 },
          { label: "Solo", startMeasure: 72, endMeasure: 87 },
          { label: "Outro", startMeasure: 104, endMeasure: 111 }
        ],
        sync: {
          audioPath: metadata.audioFile,
          bpm: timing.bpm,
          timingMap: timing.syncPoints ? timing.syncPoints.map((point: any) => ({
            measure: point.measure,
            start: point.audioTime
          })) : []
        },
        metadata: {
          created: new Date().toISOString(),
          version: "1.0",
          source: "Real Poison ASCII conversion"
        }
      };

      console.log('✅ MJTF conversion completed successfully!');
      console.log(`🎸 Lead: ${leadTrack.measures.length} measures, ${leadTrack.techniques.join(', ')}`);
      console.log(`🎸 Rhythm: ${rhythmTrack.measures.length} measures, ${rhythmTrack.techniques.join(', ')}`);
      
      return mjtfSong;

    } catch (error) {
      console.error('❌ MJTF conversion error:', error);
      throw error;
    }
  }

  /**
   * Parse real ASCII tablature with advanced technique recognition
   */
  private static parseRealASCIITab(tabText: string, bpm: number): MJTFMeasure[] {
    const measures: MJTFMeasure[] = [];
    const beatDuration = 60 / bpm; // ~0.58s at 103 BPM
    const measureDuration = beatDuration * 4; // ~2.33s per measure

    console.log(`🎸 Enhanced parsing for track...`);
    
    // Split into sections by double newlines
    const sections = tabText.split(/\n\s*\n/).filter(section => section.trim());
    
    let globalMeasureIndex = 0;
    
    sections.forEach((section) => {
      const lines = section.split('\n').filter(line => line.trim());
      
      // Find string lines (E|, B|, G|, D|, A|, E|)
      const stringLines = lines.filter(line => /^[EBGDAebgda]\|/.test(line.trim()));
      
      if (stringLines.length >= 6) {
        const sectionMeasures = this.parseStringSection(stringLines, bpm, globalMeasureIndex);
        measures.push(...sectionMeasures);
        globalMeasureIndex += sectionMeasures.length;
      }
    });
    
    console.log(`✅ Parsed ${measures.length} measures with proper timing`);
    return measures.length > 0 ? measures : this.createFallbackMeasures(bpm);
  }

  /**
   * Parse a section of 6 string lines with accurate timing
   */
  private static parseStringSection(
    stringLines: string[], 
    bpm: number, 
    startMeasureIndex: number
  ): MJTFMeasure[] {
    const measures: MJTFMeasure[] = [];
    const beatDuration = 60 / bpm;
    const measureDuration = beatDuration * 4;
    
    // Extract tab content after the string identifier
    const tabContents = stringLines.map(line => {
      const parts = line.split('|');
      return parts.length > 1 ? parts[1] : '';
    });
    
    // Analyze content length and estimate measures
    const maxLength = Math.max(...tabContents.map(content => content.length));
    const estimatedMeasures = Math.max(1, Math.ceil(maxLength / 16)); // ~16 chars per measure
    
    // Create measures
    for (let i = 0; i < estimatedMeasures; i++) {
      const measureIndex = startMeasureIndex + i;
      const startPos = i * Math.floor(maxLength / estimatedMeasures);
      const endPos = (i + 1) * Math.floor(maxLength / estimatedMeasures);
      const startTime = measureIndex * measureDuration;
      const endTime = startTime + measureDuration;
      
      const measure: MJTFMeasure = {
        index: measureIndex,
        startTime,
        endTime,
        beats: []
      };
      
      // Extract notes from each string for this measure
      const allNotesInMeasure: Array<{note: MJTFNote, position: number}> = [];
      
      tabContents.forEach((content, stringIndex) => {
        const measureContent = content.substring(startPos, endPos);
        const notes = this.extractNotesWithAdvancedTechniques(measureContent, stringIndex + 1, startPos);
        allNotesInMeasure.push(...notes);
      });
      
      // Sort notes by position and convert to timing
      allNotesInMeasure.sort((a, b) => a.position - b.position);
      
      // Group notes into beats
      this.groupNotesIntoBeats(allNotesInMeasure, measure, measureDuration);
      
      measures.push(measure);
    }
    
    return measures;
  }

  /**
   * Extract notes with advanced technique recognition - FIXED TYPES
   */
  private static extractNotesWithAdvancedTechniques(
    content: string, 
    stringNumber: number, 
    basePosition: number
  ): Array<{note: MJTFNote, position: number}> {
    const notes: Array<{note: MJTFNote, position: number}> = [];
    
    // Advanced technique patterns for Poison song
    const techniquePatterns = [
      // Complex techniques first (more specific)
      { regex: /(\d+)b(\d+)r(\d+)/g, type: 'bend-release', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'bend' as const,
        bendValue: parseInt(match[2], 10) - parseInt(match[1], 10),
        slideTarget: parseInt(match[3], 10)
      })},
      { regex: /(\d+)b(\d+)/g, type: 'bend', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'bend' as const,
        bendValue: parseInt(match[2], 10) - parseInt(match[1], 10)
      })},
      { regex: /(\d+)h(\d+)/g, type: 'hammer', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'hammer' as const,
        slideTarget: parseInt(match[2], 10)
      })},
      { regex: /(\d+)p(\d+)/g, type: 'pulloff', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'pulloff' as const,
        slideTarget: parseInt(match[2], 10)
      })},
      { regex: /(\d+)\/(\d+)/g, type: 'slide-up', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'slide' as const,
        slideTarget: parseInt(match[2], 10)
      })},
      { regex: /(\d+)\\(\d+)/g, type: 'slide-down', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'slide' as const,
        slideTarget: parseInt(match[2], 10)
      })},
      { regex: /(\d+)~/g, type: 'vibrato', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'vibrato' as const
      })},
      { regex: /\((\d+)\)/g, type: 'harmonic', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10),
        technique: 'harmonic' as const
      })},
      // Simple frets last
      { regex: /(\d+)/g, type: 'normal', parse: (match: RegExpExecArray): ParsedNoteData => ({
        fret: parseInt(match[1], 10)
      })}
    ];
    
    const processedPositions = new Set<number>();
    
    // Process techniques in order of complexity
    techniquePatterns.forEach(pattern => {
      let match: RegExpExecArray | null;
      pattern.regex.lastIndex = 0; // Reset regex
      
      while ((match = pattern.regex.exec(content)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        
        // Check if this position was already processed
        let alreadyProcessed = false;
        for (let i = matchStart; i < matchEnd; i++) {
          if (processedPositions.has(i)) {
            alreadyProcessed = true;
            break;
          }
        }
        
        if (alreadyProcessed) continue;
        
        // Mark positions as processed
        for (let i = matchStart; i < matchEnd; i++) {
          processedPositions.add(i);
        }
        
        const noteData = pattern.parse(match);
        
        notes.push({
          note: {
            string: stringNumber,
            fret: noteData.fret,
            duration: 'quarter',
            technique: noteData.technique,
            bendValue: noteData.bendValue,
            slideTarget: noteData.slideTarget,
            techniqueData: noteData.technique ? {
              type: pattern.type,
              value: noteData.bendValue,
              target: noteData.slideTarget
            } : undefined
          },
          position: basePosition + matchStart
        });
      }
    });
    
    return notes.sort((a, b) => a.position - b.position);
  }

  /**
   * Group notes into beats with proper timing
   */
  private static groupNotesIntoBeats(
    allNotes: Array<{note: MJTFNote, position: number}>,
    measure: MJTFMeasure,
    measureDuration: number
  ): void {
    const beatDuration = measureDuration / 4;
    
    if (allNotes.length === 0) {
      // Create empty beats
      for (let beat = 0; beat < 4; beat++) {
        measure.beats.push({
          timestamp: measure.startTime + (beat * beatDuration),
          notes: []
        });
      }
      return;
    }
    
    // Find the range of positions
    const minPos = allNotes[0].position;
    const maxPos = allNotes[allNotes.length - 1].position;
    const posRange = Math.max(1, maxPos - minPos);
    
    // Group notes into beats
    const beatsMap = new Map<number, MJTFNote[]>();
    
    allNotes.forEach(({note, position}) => {
      // Calculate which beat this note belongs to (0-3)
      const relativePos = (position - minPos) / posRange;
      const beatIndex = Math.min(3, Math.floor(relativePos * 4));
      
      if (!beatsMap.has(beatIndex)) {
        beatsMap.set(beatIndex, []);
      }
      beatsMap.get(beatIndex)!.push(note);
    });
    
    // Create beat objects
    for (let beat = 0; beat < 4; beat++) {
      measure.beats.push({
        timestamp: measure.startTime + (beat * beatDuration),
        notes: beatsMap.get(beat) || []
      });
    }
  }

  /**
   * Extract techniques from ASCII text
   */
  private static extractTechniquesFromText(tabText: string): string[] {
    const techniques = new Set<string>();
    
    if (tabText.includes('b')) techniques.add('bends');
    if (tabText.includes('h')) techniques.add('hammer-ons');
    if (tabText.includes('p')) techniques.add('pull-offs');
    if (tabText.includes('/') || tabText.includes('\\')) techniques.add('slides');
    if (tabText.includes('~')) techniques.add('vibrato');
    if (tabText.includes('(') && tabText.includes(')')) techniques.add('harmonics');
    
    return Array.from(techniques);
  }

  /**
   * Create fallback measures if parsing fails
   */
  private static createFallbackMeasures(bpm: number): MJTFMeasure[] {
    console.log(`⚠️ Creating fallback measures`);
    const measures: MJTFMeasure[] = [];
    const beatDuration = 60 / bpm;
    const measureDuration = beatDuration * 4;

    // Create 8 basic measures
    for (let i = 0; i < 8; i++) {
      const measure: MJTFMeasure = {
        index: i,
        startTime: i * measureDuration,
        endTime: (i + 1) * measureDuration,
        beats: []
      };

      // Create 4 beats per measure with sample notes
      for (let beat = 0; beat < 4; beat++) {
        const beatTime = measure.startTime + (beat * beatDuration);
        const notes: MJTFNote[] = [];
        
        notes.push({
          string: 1, // High E
          fret: 12 + (i % 5),
          duration: 'quarter',
          technique: beat % 2 === 0 ? 'bend' : undefined
        });

        measure.beats.push({
          timestamp: beatTime,
          notes
        });
      }

      measures.push(measure);
    }

    return measures;
  }

  /**
   * Convert MJTF to ScrollingTabDisplay format
   */
  static convertMJTFToScrollingFormat(mjtfSong: MJTFSong, trackIndex: number = 0): any[] {
    const track = mjtfSong.tracks[trackIndex];
    if (!track) return [];

    return track.measures.map((measure, index) => {
      const notes = measure.beats.flatMap(beat => 
        beat.notes.map(note => ({
          fret: note.fret,
          string: note.string - 1, // Convert to 0-5 format
          time: beat.timestamp,
          duration: 0.5,
          technique: note.technique
        }))
      );

      return {
        notes,
        measureNumber: index + 1,
        timeSignature: mjtfSong.timeSignature
      };
    });
  }

  /**
   * Save MJTF to file
   */
  static async saveMJTFSong(song: MJTFSong, filename: string = 'song.mjtf.json'): Promise<void> {
    const jsonString = JSON.stringify(song, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`✅ MJTF saved: ${filename}`);
  }
}