import KeyScaleSwitcher from '@/store/KeyScaleSwitcher';
import KeyCircle from './KeyCircle';
import ScaleMenu from './ScaleMenu';
import Fretboard from './Fretboard';
import ChordSuggestor from './ChordSuggestor';
import { create } from 'zustand';
import { KeyModeState } from '@/types/keySwitcher';

<KeyScaleSwitcher /> // Inject dynamically into TunerPanel or Practice view
export default function KeyScaleSwitcher() {
    return (
        <div className="p-4 space-y-4">
            <KeyCircle />
            <ScaleMenu />
            <ChordSuggestor />
            <Fretboard />
        </div>
    );
}

// src/store/keySwitcherStore.ts
import { create } from 'zustand';

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
