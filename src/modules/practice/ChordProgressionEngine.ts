// src/modules/practice/ChordProgressionEngine.ts

// 🎵 CHORD PROGRESSION ENGINE - Practice Module

// ✅ TypeScript interfaces
export interface ChordEvent {
  chord: string;
  startTime: number;
  endTime: number;
}

export interface ProgressionConfig {
  bpm: number;
  bars: number;
  beatsPerBar: number;
  timeSignature: [number, number];
}

export function generateChordTimeline(
  chords: string[], 
  bpm: number, 
  bars: number = 4
): ChordEvent[] {
  const beatDurationMs = 60000 / bpm;
  const chordDuration = beatDurationMs * 4; // 1 bar = 4 beats
  
  return chords.map((chord, i) => ({
    chord,
    startTime: i * chordDuration,
    endTime: (i + 1) * chordDuration,
  }));
}

// ✅ Additional progression utilities
export function generateProgressionLoop(
  chords: string[], 
  config: ProgressionConfig
): ChordEvent[] {
  const { bpm, bars, beatsPerBar } = config;
  const beatDurationMs = 60000 / bpm;
  const barDuration = beatDurationMs * beatsPerBar;
  
  const events: ChordEvent[] = [];
  const chordsPerBar = Math.max(1, Math.floor(chords.length / bars));
  
  chords.forEach((chord, index) => {
    const barIndex = Math.floor(index / chordsPerBar);
    const chordInBar = index % chordsPerBar;
    const chordDuration = barDuration / chordsPerBar;
    
    events.push({
      chord,
      startTime: barIndex * barDuration + chordInBar * chordDuration,
      endTime: barIndex * barDuration + (chordInBar + 1) * chordDuration,
    });
  });
  
  return events;
}

export function calculateNextChord(
  currentTime: number, 
  timeline: ChordEvent[]
): ChordEvent | null {
  return timeline.find(event => 
    currentTime >= event.startTime && currentTime < event.endTime
  ) || null;
}

export function getProgressionDuration(timeline: ChordEvent[]): number {
  if (timeline.length === 0) return 0;
  return Math.max(...timeline.map(event => event.endTime));
}

export function quantizeProgressionToGrid(
  timeline: ChordEvent[], 
  gridSize: number
): ChordEvent[] {
  return timeline.map(event => ({
    ...event,
    startTime: Math.round(event.startTime / gridSize) * gridSize,
    endTime: Math.round(event.endTime / gridSize) * gridSize,
  }));
}