// 🎼 AlphaTab Integration for Guitar Pro Files
// Place this in: /src/modules/notation/parsers/alphaTabParser.ts
// Uses your existing @coderline/alphatab dependency

import React from "react";
import { AlphaTabApi, Settings } from "@coderline/alphatab";
import { MJTFSong, MJTFTrack, MJTFMeasure } from "./mjtfConverter";

export class AlphaTabParser {
  private static alphaTabApi: AlphaTabApi | null = null;

  /**
   * Initialize AlphaTab with your existing library
   */
  static initializeAlphaTab(containerElement: HTMLElement): AlphaTabApi {
    const settings = new Settings();

    // Configure for tab parsing (no audio rendering)
    settings.core.engine = "svg";
    settings.display.resources.copyrightFont.size = 12;
    settings.display.resources.titleFont.size = 20;
    settings.display.resources.subTitleFont.size = 14;
    settings.display.resources.wordsFont.size = 12;

    // Initialize AlphaTab
    this.alphaTabApi = new AlphaTabApi(containerElement, settings);

    return this.alphaTabApi;
  }

  /**
   * Load Guitar Pro file and convert to MJTF
   */
  static async loadGuitarProFile(file: File): Promise<MJTFSong> {
    return new Promise((resolve, reject) => {
      if (!this.alphaTabApi) {
        reject(new Error("AlphaTab not initialized"));
        return;
      }

      // Set up event listeners
      this.alphaTabApi.scoreLoaded.on((score) => {
        try {
          const mjtfSong = this.convertAlphaTabScoreToMJTF(score);
          resolve(mjtfSong);
        } catch (error) {
          reject(error);
        }
      });

      this.alphaTabApi.error.on((error) => {
        reject(new Error(`AlphaTab error: ${error}`));
      });

      // Load the Guitar Pro file
      this.alphaTabApi.load(file);
    });
  }

  /**
   * Convert AlphaTab Score object to MJTF format
   */
  private static convertAlphaTabScoreToMJTF(score: any): MJTFSong {
    const tracks: MJTFTrack[] = [];

    // Convert each track from the Guitar Pro file
    score.tracks.forEach((track: any, trackIndex: number) => {
      if (track.channel.instrument === 25) {
        // Guitar instrument
        const mjtfTrack = this.convertAlphaTabTrackToMJTF(track, score.tempo);
        tracks.push(mjtfTrack);
      }
    });

    return {
      title: score.title || "Untitled",
      artist: score.artist || "Unknown Artist",
      album: score.album || "",
      bpm: score.tempo,
      timeSignature: [4, 4], // Default, extract from first measure if available
      key: this.extractKey(score) || "C Major",
      genre: score.music || "",
      difficulty: "intermediate", // Calculate based on content
      tracks,
      sections: this.extractSections(score),
      sync: {
        audioPath: "", // Will be set separately
        bpm: score.tempo,
        timingMap: this.generateTimingMapFromScore(score),
      },
      metadata: {
        created: new Date().toISOString(),
        version: "1.0",
        source: "Guitar Pro file via AlphaTab",
      },
    };
  }

  /**
   * Convert individual AlphaTab track to MJTF track
   */
  private static convertAlphaTabTrackToMJTF(
    track: any,
    globalTempo: number
  ): MJTFTrack {
    const measures: MJTFMeasure[] = [];
    const beatDuration = 60 / globalTempo;

    // Process each measure in the track
    track.staves[0].bars.forEach((bar: any, barIndex: number) => {
      const measure: MJTFMeasure = {
        index: barIndex,
        startTime: barIndex * beatDuration * 4, // Assuming 4/4 time
        endTime: (barIndex + 1) * beatDuration * 4,
        beats: [],
      };

      // Process voices in the bar
      bar.voices.forEach((voice: any) => {
        voice.beats.forEach((beat: any, beatIndex: number) => {
          const beatTimestamp = measure.startTime + beatIndex * beatDuration;

          const mjtfBeat = {
            timestamp: beatTimestamp,
            notes: beat.notes.map((note: any) => ({
              string: note.string + 1, // Convert to 1-6 numbering
              fret: note.fret,
              duration: this.convertDuration(beat.duration),
              technique: this.extractTechnique(note),
            })),
          };

          measure.beats.push(mjtfBeat);
        });
      });

      measures.push(measure);
    });

    return {
      name: track.name || `Track ${track.index + 1}`,
      tuning: track.tuning.map((t: any) => this.convertTuningToNote(t)),
      difficulty: this.calculateTrackDifficulty(measures),
      techniques: this.extractTrackTechniques(measures),
      measures,
    };
  }

  /**
   * Convert AlphaTab duration to MJTF duration
   */
  private static convertDuration(
    duration: any
  ): "whole" | "half" | "quarter" | "eighth" | "sixteenth" {
    switch (duration) {
      case 1:
        return "whole";
      case 2:
        return "half";
      case 4:
        return "quarter";
      case 8:
        return "eighth";
      case 16:
        return "sixteenth";
      default:
        return "quarter";
    }
  }

  /**
   * Extract technique from AlphaTab note
   */
  private static extractTechnique(note: any): string | undefined {
    if (note.bendType !== 0) return "bend";
    if (note.hammerPullOrigin) return "hammer";
    if (note.slideInType !== 0 || note.slideOutType !== 0) return "slide";
    if (note.vibrato) return "vibrato";
    if (note.palmMute) return "palm-mute";
    return undefined;
  }

  /**
   * Convert tuning number to note name
   */
  private static convertTuningToNote(tuning: number): string {
    const notes = [
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
    return notes[tuning % 12];
  }

  /**
   * Extract key from score
   */
  private static extractKey(score: any): string {
    // This would need to analyze the key signature
    return "C Major"; // Default
  }

  /**
   * Extract sections from score
   */
  private static extractSections(
    score: any
  ): Array<{ label: string; startMeasure: number; endMeasure: number }> {
    const sections: Array<{
      label: string;
      startMeasure: number;
      endMeasure: number;
    }> = [];

    // Look for section markers in the score
    if (score.masterBars) {
      let currentSection = "Intro";
      let sectionStart = 0;

      score.masterBars.forEach((bar: any, index: number) => {
        if (bar.section && bar.section !== currentSection) {
          // End previous section
          if (index > sectionStart) {
            sections.push({
              label: currentSection,
              startMeasure: sectionStart,
              endMeasure: index - 1,
            });
          }

          // Start new section
          currentSection = bar.section;
          sectionStart = index;
        }
      });

      // Add final section
      sections.push({
        label: currentSection,
        startMeasure: sectionStart,
        endMeasure: score.masterBars.length - 1,
      });
    }

    return sections.length > 0
      ? sections
      : [
          {
            label: "Full Song",
            startMeasure: 0,
            endMeasure: score.masterBars?.length - 1 || 0,
          },
        ];
  }

  /**
   * Generate timing map from score
   */
  private static generateTimingMapFromScore(
    score: any
  ): Array<{ measure: number; start: number }> {
    const timingMap: Array<{ measure: number; start: number }> = [];
    let currentTime = 0;
    const beatDuration = 60 / score.tempo;

    if (score.masterBars) {
      score.masterBars.forEach((bar: any, index: number) => {
        timingMap.push({
          measure: index,
          start: currentTime,
        });

        // Add bar duration (assuming 4/4 time for now)
        currentTime += beatDuration * 4;
      });
    }

    return timingMap;
  }

  /**
   * Calculate track difficulty
   */
  private static calculateTrackDifficulty(
    measures: MJTFMeasure[]
  ): "beginner" | "intermediate" | "advanced" | "expert" {
    // Use same logic as MJTFConverter
    return "intermediate"; // Simplified for now
  }

  /**
   * Extract techniques from track
   */
  private static extractTrackTechniques(measures: MJTFMeasure[]): string[] {
    const techniques = new Set<string>();

    measures.forEach((measure) => {
      measure.beats.forEach((beat) => {
        beat.notes.forEach((note) => {
          if (note.technique) {
            techniques.add(note.technique);
          }
        });
      });
    });

    return Array.from(techniques);
  }

  /**
   * Create a file input for Guitar Pro files
   */
  static createGuitarProFileInput(
    onFileLoaded: (mjtfSong: MJTFSong) => void
  ): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gp,.gp3,.gp4,.gp5,.gpx,.gp6,.ptb";

    input.addEventListener("change", async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const mjtfSong = await this.loadGuitarProFile(file);
          onFileLoaded(mjtfSong);
        } catch (error) {
          console.error("Error loading Guitar Pro file:", error);
        }
      }
    });

    return input;
  }
}

// React Hook for Guitar Pro file loading
export const useGuitarProLoader = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [song, setSong] = React.useState<MJTFSong | null>(null);

  const loadGuitarProFile = async (file: File): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const mjtfSong = await AlphaTabParser.loadGuitarProFile(file);
      setSong(mjtfSong);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loadGuitarProFile,
    isLoading,
    error,
    song,
    clearSong: () => setSong(null),
  };
};

// Example usage component:
/*
import React, { useRef, useEffect } from 'react';
import { AlphaTabParser, useGuitarProLoader } from './alphaTabParser';

export const GuitarProLoader: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadGuitarProFile, isLoading, error, song } = useGuitarProLoader();

  useEffect(() => {
    if (containerRef.current) {
      AlphaTabParser.initializeAlphaTab(containerRef.current);
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadGuitarProFile(file);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp6,.ptb"
        onChange={handleFileSelect}
        disabled={isLoading}
      />
      
      {isLoading && <p>Loading Guitar Pro file...</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
      {song && (
        <div>
          <h2>{song.title} by {song.artist}</h2>
          <p>Tracks: {song.tracks.length}</p>
          <p>BPM: {song.bpm}</p>
        </div>
      )}
      
      <div ref={containerRef} style={{ display: 'none' }} />
    </div>
  );
};
*/
