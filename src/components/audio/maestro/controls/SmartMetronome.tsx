'use client';

/**
 * SmartMetronome.tsx V2 - Advanced Metronome with BPM Sync & Subdivision
 * Date: December 30th, 2025
 * 
 * 🥁 Features (Moises-style):
 * ✅ Smart Metronome toggle (follows song tempo changes)
 * ✅ Volume control (dedicated metronome volume)
 * ✅ Subdivision: 0.5x, 1x, 2x (half-time, normal, double-time)
 * ✅ L & R balance (for stage performers)
 * ✅ Wooden block sound (default)
 * ✅ Auto-disable in YouTube/MP3 mode
 * 
 * Integration Path:
 * maestro-ai/src/components/audio/maestro/controls/SmartMetronome.tsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Export types for external use
export type MetronomeSoundType = 'woodblock' | 'click' | 'beep' | 'drum-stick' | 'electronic';
type SubdivisionMode = 0.5 | 1 | 2;

export interface SmartMetronomeProps {
    isEnabled: boolean;
    onToggle: () => void;
    currentBPM: number;
    audioSource: 'synth' | 'original';
    isPlaying: boolean;

    // Optional controlled props (can be managed externally or internally)
    playbackSpeed?: number;
    volume?: number;
    balance?: number;
    soundType?: MetronomeSoundType;

    // Optional callbacks
    onVolumeChange?: (volume: number) => void;
    onBalanceChange?: (balance: number) => void;
}

export const SmartMetronome: React.FC<SmartMetronomeProps> = ({
    isEnabled,
    onToggle,
    currentBPM,
    audioSource,
    isPlaying,
    playbackSpeed = 1.0,
    volume: externalVolume,
    balance: externalBalance,
    soundType: externalSoundType,
    onVolumeChange,
    onBalanceChange,
}) => {
    // Use controlled props if provided, otherwise use internal state
    const [internalVolume, setInternalVolume] = useState<number>(0.7);
    const [internalBalance, setInternalBalance] = useState<number>(0);
    const [internalSoundType, setInternalSoundType] = useState<MetronomeSoundType>('woodblock');
    const [subdivision, setSubdivision] = useState<SubdivisionMode>(1);

    // Determine which values to use (controlled vs uncontrolled)
    const volume = externalVolume !== undefined ? externalVolume : internalVolume;
    const balance = externalBalance !== undefined ? externalBalance : internalBalance;
    const soundType = externalSoundType !== undefined ? externalSoundType : internalSoundType;

    const audioContextRef = useRef<AudioContext | null>(null);
    const nextTickTimeRef = useRef<number>(0);
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

    // 🔊 Play Woodblock Sound (with dynamic frequency based on soundType)
    const playWoodblock = useCallback((accentBeat: boolean = false) => {
        const audioContext = audioContextRef.current;
        if (!audioContext) return;

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
                'electronic': 440,
            };

            // Get frequency for current sound type
            const baseFrequency = frequencyMap[soundType];
            oscillator.frequency.value = accentBeat ? baseFrequency * 0.75 : baseFrequency;
            oscillator.type = soundType === 'electronic' ? 'sine' : 'square';

            // Volume & balance
            const adjustedVolume = volume * (accentBeat ? 0.5 : 0.35);
            gainNode.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);

            // Apply L/R balance
            panNode.pan.value = balance;

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        } catch (error) {
            console.warn('Metronome sound failed:', error);
        }
    }, [volume, balance, soundType]);

    // 🎵 Calculate effective BPM based on subdivision
    const getEffectiveBPM = useCallback(() => {
        return currentBPM * subdivision;
    }, [currentBPM, subdivision]);

    // 🔁 Metronome Loop
    useEffect(() => {
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
            playWoodblock(isAccent);
            beatCount++;
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isEnabled, isPlaying, audioSource, getEffectiveBPM, playWoodblock]);

    // Handle volume change
    const handleVolumeChange = (newVolume: number) => {
        if (externalVolume === undefined) {
            setInternalVolume(newVolume);
        }
        onVolumeChange?.(newVolume);
    };

    // Handle balance change
    const handleBalanceChange = (newBalance: number) => {
        if (externalBalance === undefined) {
            setInternalBalance(newBalance);
        }
        onBalanceChange?.(newBalance);
    };

    // Auto-disable in external mode
    const isDisabled = audioSource === 'original';

    return (
        <div className={`bg-gray-800/60 border-2 border-gray-700/50 rounded-xl p-4 ${isDisabled ? 'opacity-50' : ''}`}>
            {/* Header with Toggle */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={isEnabled && !isDisabled ? 'text-green-400' : 'text-blue-400'}
                    >
                        <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                        <path d="M10.5 12L12 8l1.5 4z" />
                    </svg>
                    <div>
                        <h3 className={`text-sm font-bold ${isEnabled && !isDisabled ? 'text-green-300' : 'text-white'}`}>
                            Smart Metronome
                        </h3>
                        <p className="text-xs text-gray-400">
                            {isDisabled ? 'Synth mode only' : `${Math.round(getEffectiveBPM())} BPM`}
                        </p>
                    </div>
                </div>

                {/* Toggle Switch */}
                <button
                    onClick={onToggle}
                    disabled={isDisabled}
                    className={`
                        relative w-14 h-7 rounded-full transition-colors
                        ${isEnabled && !isDisabled ? 'bg-green-500' : 'bg-gray-600'}
                        ${isDisabled ? 'cursor-not-allowed' : ''}
                    `}
                >
                    <div className={`
                        absolute top-0.5 w-6 h-6 rounded-full bg-white
                        transition-transform duration-200
                        ${isEnabled && !isDisabled ? 'translate-x-7' : 'translate-x-0.5'}
                    `} />
                </button>
            </div>

            {/* Volume Control */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-300">Volume</label>
                    <span className="text-xs text-cyan-400">{Math.round(volume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    disabled={isDisabled}
                    className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
            </div>

            {/* Subdivision Controls */}
            <div className="mb-4">
                <label className="text-xs font-semibold text-gray-300 block mb-2">Subdivision</label>
                <div className="grid grid-cols-3 gap-2">
                    {[0.5, 1, 2].map((value) => (
                        <button
                            key={value}
                            onClick={() => setSubdivision(value as SubdivisionMode)}
                            disabled={isDisabled}
                            className={`
                                py-2 px-4 rounded-lg font-bold text-sm transition-colors
                                ${subdivision === value
                                    ? 'bg-white text-gray-900'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                }
                                ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}
                            `}
                        >
                            {value}x
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                    {subdivision === 0.5 && 'Half-time (every other beat)'}
                    {subdivision === 1 && 'Normal (every beat)'}
                    {subdivision === 2 && 'Double-time (twice per beat)'}
                </p>
            </div>

            {/* L & R Balance Control */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-300">L & R</label>
                    <span className="text-xs text-cyan-400">
                        {balance < -0.1 ? 'Left' : balance > 0.1 ? 'Right' : 'Center'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">L</span>
                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={balance}
                        onChange={(e) => handleBalanceChange(parseFloat(e.target.value))}
                        disabled={isDisabled}
                        className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-xs text-gray-500">R</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    For stage performers: send click to one ear
                </p>
            </div>

            {/* Status Message */}
            {isDisabled && (
                <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-300 text-center">
                        ⚠️ Metronome only works in Synth mode
                    </p>
                </div>
            )}
        </div>
    );
};