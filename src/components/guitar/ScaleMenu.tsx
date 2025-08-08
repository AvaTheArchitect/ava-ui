'use client';

import React from 'react';

import { useKeySwitcherStore } from '@/store/KeySwitcherStore';

export default function ScaleMenu() {
    const scale = useKeySwitcherStore((s) => s.scale);
    const mode = useKeySwitcherStore((s) => s.mode);
    const setScale = useKeySwitcherStore((s) => s.setScale);
    const setMode = useKeySwitcherStore((s) => s.setMode);

    const scaleOptions = ['Diatonic', 'Pentatonic', 'Harmonic Minor', 'Melodic Minor', 'Blues'];
    const modeOptions = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

    return (
        <div className="flex gap-4 items-center justify-start text-sm">
            <div>
                <label htmlFor="scale" className="block font-semibold mb-1">Scale</label>
                <select
                    id="scale"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="select-purple dark:select-purple-dark"
                >
                    {scaleOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>

                <label htmlFor="mode" className="block font-semibold mb-1">Mode</label>
                <select
                    id="mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="select-purple dark:select-purple-dark"
                >
                    {modeOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}