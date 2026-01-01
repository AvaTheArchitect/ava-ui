'use client';

/**
 * CountInOverlay.tsx - Visual Countdown with Sound
 * Date: December 31st, 2025 - Updated with 4-Beat Support
 * 
 * Features:
 * ✅ 3-2-1 mode (quick countdown)
 * ✅ 4-3-2-1 mode (full measure)
 * ✅ Tick sound on each count
 * ✅ Visual countdown overlay
 */

import React, { useEffect, useState } from 'react';

interface CountInOverlayProps {
    count: number;
    isVisible: boolean;
    mode?: 'three-beat' | 'four-beat';
    onComplete?: () => void;
}

// Play tick sound
const playTick = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1200; // High-pitched click
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.warn('Count-in tick sound failed:', error);
    }
};

export const CountInOverlay: React.FC<CountInOverlayProps> = ({
    count,
    isVisible,
    mode = 'three-beat',
    onComplete,
}) => {
    const [lastCount, setLastCount] = useState(0);

    // Play sound on each count change
    useEffect(() => {
        if (isVisible && count > 0 && count !== lastCount) {
            playTick();
            setLastCount(count);
        }

        if (!isVisible) {
            setLastCount(0);
        }
    }, [count, isVisible, lastCount]);

    // Call onComplete when countdown finishes
    useEffect(() => {
        if (isVisible && count === 0 && lastCount > 0) {
            onComplete?.();
        }
    }, [count, isVisible, lastCount, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-cyan-500 rounded-2xl p-8 shadow-2xl animate-pulse">
                <div className="text-center">
                    <div className="text-6xl font-bold text-cyan-400 mb-2">
                        {count}
                    </div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">
                        {mode === 'four-beat' ? '4-Beat Count' : '3-Beat Count'}
                    </div>
                </div>
            </div>
        </div>
    );
};