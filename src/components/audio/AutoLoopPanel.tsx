'use client';
import React, { useState } from 'react';

type AutoLoopPanelProps = {
    bpm: number;
    onLoopSet: (bars: number) => void;
};

export default function AutoLoopPanel({ bpm, onLoopSet }: AutoLoopPanelProps) {
    const [bars, setBars] = useState(4);

    return (
        <div className="space-y-2 p-2 border border-indigo-500 rounded">
            <div className="text-sm text-indigo-300">Loop: {bars} bars @ {bpm} BPM</div>
            <input
                type="range"
                min={1}
                max={16}
                value={bars}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBars(val);
                    onLoopSet(val);
                }}
                className="w-full"
            />
        </div>
    );
}
