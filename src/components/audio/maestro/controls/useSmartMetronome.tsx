'use client';

/**
 * useSmartMetronome.tsx V4 - Fixed Count-In Conflict
 * Date: January 2nd, 2026
 * 
 * 🔧 V4 FIXES:
 * ✅ Added isCountingDown prop to prevent overlap with count-in
 * ✅ Metronome now pauses during count-in countdown
 * ✅ Fixed doubled sounds issue
 * 
 * 🔒 PRESERVED FROM V3:
 * ✅ Mobile PWA audio context "arming" strategy
 * ✅ Synchronous tick function for precise timing
 * ✅ armMetronome() function for direct onClick handler
 * 
 * 🥁 Features:
 * ✅ No UI - pure logic hook
 * ✅ BPM sync with AlphaTab
 * ✅ Subdivision support (0.5x, 1x, 2x)
 * ✅ Accent toggle (on/off)
 * ✅ Multiple sound types
 * ✅ L/R balance control
 */

import { useEffect, useRef, useCallback } from 'react';

// Export types
export type MetronomeSoundType = 'woodblock' | 'click' | 'beep' | 'drum-stick' | 'kick-drum' | 'snare-drum' | 'electronic';
export type SubdivisionMode = 0.5 | 1 | 2;

export interface UseSmartMetronomeProps {
    isEnabled: boolean;
    currentBPM: number;
    audioSource: 'synth' | 'original';
    isPlaying: boolean;
    isCountingDown?: boolean;  // 🔧 V4: NEW - Pause during count-in

    // Settings
    volume: number;           // 0-1
    balance: number;          // -1 to +1
    soundType: MetronomeSoundType;
    subdivision: SubdivisionMode;
    accentEnabled: boolean;   // Toggle accent notes
}

export const useSmartMetronome = ({
    isEnabled,
    currentBPM,
    audioSource,
    isPlaying,
    isCountingDown = false,  // 🔧 V4: Default to false
    volume,
    balance,
    soundType,
    subdivision,
    accentEnabled,
}: UseSmartMetronomeProps) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<number | null>(null);

    // Initialize Context ONLY ONCE
    const getContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // CRITICAL: The "Arm" function
    // This MUST be called from a button onClick, not a useEffect
    const armMetronome = useCallback(async () => {
        const ctx = getContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
            console.log("🔊 Audio Context Armed via User Gesture");
        }
    }, [getContext]);

    // 🔊 Play metronome sound (NO ASYNC - fire and forget for speed)
    const playMetronomeSound = useCallback((isAccent: boolean) => {
        const ctx = getContext();
        if (ctx.state !== 'running') {
            console.warn('⚠️ Audio context not running - metronome tick skipped');
            return; // Don't even try if not running
        }

        try {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const panNode = ctx.createStereoPanner();

            oscillator.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(ctx.destination);

            // Frequency map based on sound type
            const frequencyMap: Record<MetronomeSoundType, number> = {
                'woodblock': 800,
                'click': 1200,
                'beep': 1000,
                'drum-stick': 2000,
                'kick-drum': 80,      // Low bass thump
                'snare-drum': 200,    // Mid-range snap
                'electronic': 440,
            };

            const baseFrequency = frequencyMap[soundType];

            // Apply accent (lower pitch) only if accentEnabled
            oscillator.frequency.value = (isAccent && accentEnabled)
                ? baseFrequency * 0.75
                : baseFrequency;

            // Wave type
            if (soundType === 'kick-drum' || soundType === 'snare-drum') {
                oscillator.type = 'triangle'; // Warmer for drums
            } else if (soundType === 'electronic') {
                oscillator.type = 'sine';
            } else {
                oscillator.type = 'square';
            }

            // Volume - accent slightly louder if enabled
            const adjustedVolume = volume * ((isAccent && accentEnabled) ? 0.6 : 0.4);
            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(adjustedVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            // Apply L/R balance
            panNode.pan.value = balance;

            oscillator.start(now);
            oscillator.stop(now + 0.1);

            console.log(`🥁 Metronome tick: ${soundType}, accent:${isAccent && accentEnabled}, vol:${Math.round(volume * 100)}%`);
        } catch (error) {
            console.error('❌ Metronome sound failed:', error);
        }
    }, [getContext, volume, balance, soundType, accentEnabled]);

    // 🎵 Calculate effective BPM
    const getEffectiveBPM = useCallback(() => {
        return currentBPM * subdivision;
    }, [currentBPM, subdivision]);

    // 🔁 Metronome Loop (relies on context being 'running')
    useEffect(() => {
        // 🔧 V4: Auto-disable in YouTube/MP3 mode OR during count-in
        if (!isEnabled || !isPlaying || audioSource === 'original' || isCountingDown) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;

                // 🔧 V4: Log why we're stopping
                if (isCountingDown) {
                    console.log('⏸️ Metronome paused during count-in');
                } else if (intervalRef.current !== null) {
                    console.log('🛑 Metronome stopped');
                }
            }
            return;
        }

        const effectiveBPM = getEffectiveBPM();
        const intervalMs = (60 / effectiveBPM) * 1000;
        let beatCount = 0;

        console.log(`🎵 Metronome starting: ${effectiveBPM} BPM, interval: ${intervalMs}ms`);

        intervalRef.current = window.setInterval(() => {
            const isAccent = beatCount % 4 === 0; // Accent every 4 beats
            playMetronomeSound(isAccent);
            beatCount++;
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isEnabled, isPlaying, audioSource, isCountingDown, getEffectiveBPM, playMetronomeSound]); // 🔧 V4: Added isCountingDown

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return {
        effectiveBPM: getEffectiveBPM(),
        armMetronome, // Return the arming function
    };
};