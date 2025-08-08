"use client";

import { create } from "zustand";

// 🎵 Musical Key and Scale Types
export type MusicalKey =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

export type ScaleMode =
  | "Major"
  | "Minor"
  | "Dorian"
  | "Phrygian"
  | "Lydian"
  | "Mixolydian"
  | "Aeolian"
  | "Locrian"
  | "Blues"
  | "Pentatonic";

export interface KeyModeState {
  // Current musical settings
  currentKey: MusicalKey;
  scale: ScaleMode;
  mode: ScaleMode; // Alias for scale for backward compatibility

  // Key switching actions
  setCurrentKey: (key: MusicalKey) => void;
  setKey: (key: MusicalKey) => void; // Alias for setCurrentKey

  // Scale/mode switching actions
  setScale: (scale: ScaleMode) => void;
  setMode: (mode: ScaleMode) => void; // Alias for setScale

  // Utility actions
  transposeUp: () => void;
  transposeDown: () => void;
  reset: () => void;

  // Computed properties
  getCurrentKeySignature: () => string;
  getScaleNotes: () => string[];
}

// 🎼 Musical utility functions
const CHROMATIC_SCALE: MusicalKey[] = [
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

const SCALE_INTERVALS = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10], // Same as Minor
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  Pentatonic: [0, 2, 4, 7, 9],
};

// 🎵 Create the Zustand store
export const useKeySwitcherStore = create<KeyModeState>((set, get) => ({
  // Initial state
  currentKey: "C",
  scale: "Major",
  mode: "Major",

  // Key switching actions
  setCurrentKey: (key: MusicalKey) => set({ currentKey: key }),
  setKey: (key: MusicalKey) => set({ currentKey: key }),

  // Scale/mode switching actions
  setScale: (scale: ScaleMode) => set({ scale, mode: scale }),
  setMode: (mode: ScaleMode) => set({ scale: mode, mode }),

  // Utility actions
  transposeUp: () =>
    set((state) => {
      const currentIndex = CHROMATIC_SCALE.indexOf(state.currentKey);
      const nextIndex = (currentIndex + 1) % CHROMATIC_SCALE.length;
      return { currentKey: CHROMATIC_SCALE[nextIndex] };
    }),

  transposeDown: () =>
    set((state) => {
      const currentIndex = CHROMATIC_SCALE.indexOf(state.currentKey);
      const prevIndex =
        currentIndex === 0 ? CHROMATIC_SCALE.length - 1 : currentIndex - 1;
      return { currentKey: CHROMATIC_SCALE[prevIndex] };
    }),

  reset: () => set({ currentKey: "C", scale: "Major", mode: "Major" }),

  // Computed properties
  getCurrentKeySignature: () => {
    const state = get();
    return `${state.currentKey} ${state.scale}`;
  },

  getScaleNotes: () => {
    const state = get();
    const rootIndex = CHROMATIC_SCALE.indexOf(state.currentKey);
    const intervals = SCALE_INTERVALS[state.scale] || SCALE_INTERVALS.Major;

    return intervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % CHROMATIC_SCALE.length;
      return CHROMATIC_SCALE[noteIndex];
    });
  },
}));
