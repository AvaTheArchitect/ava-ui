'use client';

/**
 * useSmartMetronome.tsx V3 - Headless Metronome Hook (Mobile Audio Fixed)
 * Date: December 31st, 2025
 * 
 * 🔧 V3 FIXES:
 * ✅ Mobile PWA audio context "arming" strategy
 * ✅ Removed async/await from playback loop (prevents stuttering)
 * ✅ armMetronome() function for direct onClick handler
 * ✅ Synchronous tick function for precise timing
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
    volume,
    balance,
    soundType,
    subdivision,
    accentEnabled,
}: UseSmartMetronomeProps) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<number | null>(null);

    // 🔧 Initialize Context ONLY ONCE
    const getContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // 🔧 CRITICAL: The "Arm" function
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
        // Auto-disable in YouTube/MP3 mode
        if (!isEnabled || !isPlaying || audioSource === 'original') {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
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
                console.log('🛑 Metronome stopped');
            }
        };
    }, [isEnabled, isPlaying, audioSource, getEffectiveBPM, playMetronomeSound]);

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
        armMetronome, // 🔧 Return the arming function
    };
};