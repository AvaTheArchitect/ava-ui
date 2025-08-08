// src/lib/cipher/jamUtils.ts

// 🎵 JAM SESSION UTILITIES - Music Timing & Loop Functions

export function snapToBar(currentTime: number, bpm: number): number {
  const secondsPerBeat = 60 / bpm;
  const barLength = secondsPerBeat * 4;
  return Math.floor(currentTime / barLength) * barLength;
}

export function calculateLoopRegion(
  start: number,
  bars: number,
  bpm: number
): [number, number] {
  const barLength = (60 / bpm) * 4;
  return [start, start + bars * barLength];
} // ✅ Added missing closing brace

// ✅ Additional jam utilities for completeness
export function calculateBeatPosition(
  currentTime: number,
  bpm: number
): number {
  const secondsPerBeat = 60 / bpm;
  return (currentTime % secondsPerBeat) / secondsPerBeat;
}

export function quantizeToGrid(
  time: number,
  bpm: number,
  subdivision: number = 4
): number {
  const secondsPerBeat = 60 / bpm;
  const gridSize = secondsPerBeat / subdivision;
  return Math.round(time / gridSize) * gridSize;
}

export function calculateMeasureBoundaries(
  duration: number,
  bpm: number
): number[] {
  const barLength = (60 / bpm) * 4;
  const numBars = Math.ceil(duration / barLength);
  const boundaries = [];

  for (let i = 0; i <= numBars; i++) {
    boundaries.push(i * barLength);
  }

  return boundaries;
}

export function tempoToMilliseconds(bpm: number): number {
  return (60 / bpm) * 1000;
}

export function millisecondsToTempo(ms: number): number {
  return 60000 / ms;
}
