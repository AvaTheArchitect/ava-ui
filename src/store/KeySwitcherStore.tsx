// src/store/KeySwitcherStore.tsx
import { create } from 'zustand';

export interface KeyModeState {
    key: string;
    mode: string;
    scale: string;
    isKeyLocked: boolean;
    isChordLocked: boolean;
    showFretLabels: boolean;
    setKey: (key: string) => void;
    setMode: (mode: string) => void;
    setScale: (scale: string) => void;
    toggleKeyLock: () => void;
    toggleChordLock: () => void;
    toggleFretLabels: () => void;
}

// ✅ Store definition only - no component here
export const useKeySwitcherStore = create<KeyModeState>((set) => ({
    key: 'C',
    mode: 'Mixolydian',
    scale: 'Diatonic',
    isKeyLocked: false,
    isChordLocked: false,
    showFretLabels: true,
    setKey: (key) => set({ key }),
    setMode: (mode) => set({ mode }),
    setScale: (scale) => set({ scale }),
    toggleKeyLock: () => set((state) => ({ isKeyLocked: !state.isKeyLocked })),
    toggleChordLock: () => set((state) => ({ isChordLocked: !state.isChordLocked })),
    toggleFretLabels: () => set((state) => ({ showFretLabels: !state.showFretLabels })),
}));