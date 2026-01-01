'use client';

/**
 * useSmartMetronome.tsx V2 - Headless Metronome Hook (Logic Only)
 * Date: December 31st, 2025
 * 
 * 🥁 Features:
 * ✅ No UI - pure logic hook
 * ✅ BPM sync with AlphaTab
 * ✅ Subdivision support (0.5x, 1x, 2x)
 * ✅ Accent toggle (on/off)
 * ✅ Multiple sound types
 * ✅ L/R balance control
 * 
 * Integration:
 * Used by page.tsx to control metronome behavior
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

    // Initialize AudioContext
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // 🔊 Play metronome sound
    const playMetronomeSound = useCallback((isAccent: boolean) => {
        if (!audioContextRef.current) {
            console.warn('Audio context not initialized');
            return;
        }
        
        const audioContext = audioContextRef.current;
        
        // Resume audio context if suspended (iOS/mobile requirement)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('🔊 Audio context resumed');
            });
        }

        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            const panNode = audioContext.createStereoPanner();

            oscillator.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(audioContext.destination);

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
            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(adjustedVolume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            // Apply L/R balance
            panNode.pan.value = balance;

            oscillator.start(now);
            oscillator.stop(now + 0.08);
            
            console.log(`🥁 Metronome tick: ${soundType}, accent:${isAccent && accentEnabled}, vol:${Math.round(volume * 100)}%`);
        } catch (error) {
            console.error('Metronome sound failed:', error);
        }
    }, [volume, balance, soundType, accentEnabled]);

    // 🎵 Calculate effective BPM
    const getEffectiveBPM = useCallback(() => {
        return currentBPM * subdivision;
    }, [currentBPM, subdivision]);

    // 🔁 Metronome Loop
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
    }, [isEnabled, isPlaying, audioSource, getEffectiveBPM, playMetronomeSound]);

    return {
        effectiveBPM: getEffectiveBPM(),
    };
};