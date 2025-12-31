'use client';

/**
 * MetronomeSettings.tsx  V2 - Universal Settings Panel for Tools
 * Date: December 30th, 2025
 * 
 * 🎚️ Features:
 * ✅ Metronome sound selection (tap to activate)
 * ✅ Count-in options (3-2-1 vs 4-beat)
 * ✅ Future: Fretboard settings, Notation display
 * 
 * Integration Path:
 * maestro-ai/src/components/audio/maestro/controls/MetronomeSettings.tsx
 */

import React, { useState } from 'react';

// Import MetronomeSoundType from SmartMetronome to avoid duplication
import type { MetronomeSoundType } from './SmartMetronome';

export interface MetronomeSettingsProps {
    isOpen: boolean;
    onClose: () => void;

    // Metronome settings
    selectedSound?: MetronomeSoundType;
    onSoundChange?: (sound: MetronomeSoundType) => void;

    // Count-in settings
    countInMode?: 'three-beat' | 'four-beat';
    onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;

    // Future settings
    fretboardMode?: 'left-hand' | 'right-hand';
    fretboardFrets?: 22 | 24;
    notationDisplay?: 'standard' | 'tab' | 'both';
}

interface SoundOption {
    id: MetronomeSoundType;
    name: string;
    icon: string;
    frequency: number; // Hz for oscillator
    description: string;
}

const SOUND_OPTIONS: SoundOption[] = [
    {
        id: 'woodblock',
        name: 'Woodblock',
        icon: '🪵',
        frequency: 800,
        description: 'Classic warm sound',
    },
    {
        id: 'click',
        name: 'Click',
        icon: '🔊',
        frequency: 1200,
        description: 'Sharp click sound',
    },
    {
        id: 'beep',
        name: 'Beep',
        icon: '📢',
        frequency: 1000,
        description: 'Electronic beep',
    },
    {
        id: 'drum-stick',
        name: 'Drum Stick',
        icon: '🥁',
        frequency: 2000,
        description: 'High-pitched tap',
    },
    {
        id: 'electronic',
        name: 'Electronic',
        icon: '⚡',
        frequency: 440,
        description: 'Synth tone',
    },
];

export const MetronomeSettings: React.FC<MetronomeSettingsProps> = ({
    isOpen,
    onClose,
    selectedSound = 'woodblock',
    onSoundChange,
    countInMode = 'three-beat',
    onCountInModeChange,
}) => {
    const [previewingSound, setPreviewingSound] = useState<MetronomeSoundType | null>(null);

    // Play preview sound
    const playPreviewSound = (soundOption: SoundOption) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = soundOption.frequency;
            oscillator.type = soundOption.id === 'electronic' ? 'sine' : 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

            setPreviewingSound(soundOption.id);
            setTimeout(() => setPreviewingSound(null), 150);
        } catch (error) {
            console.warn('Preview sound failed:', error);
        }
    };

    const handleSoundSelect = (soundId: MetronomeSoundType) => {
        const soundOption = SOUND_OPTIONS.find(s => s.id === soundId);
        if (soundOption) {
            playPreviewSound(soundOption);
            onSoundChange?.(soundId);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[10000] animate-fadeIn"
                onClick={onClose}
            />

            {/* Settings Panel */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[10001] max-w-md mx-auto animate-slideUp">
                <div className="bg-gray-900/98 backdrop-blur-xl border-2 border-purple-500/40 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">

                    {/* Header */}
                    <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-white font-bold text-lg">Tool Settings</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            aria-label="Close settings"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-6">

                        {/* Metronome Sound Selection */}
                        <div>
                            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                                </svg>
                                Metronome Sound
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {SOUND_OPTIONS.map((sound) => (
                                    <button
                                        key={sound.id}
                                        onClick={() => handleSoundSelect(sound.id)}
                                        className={`
                                            relative p-4 rounded-xl border-2 transition-all
                                            ${selectedSound === sound.id
                                                ? 'bg-orange-500/20 border-orange-500 scale-105'
                                                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
                                            }
                                            ${previewingSound === sound.id ? 'animate-pulse' : ''}
                                        `}
                                    >
                                        <div className="text-3xl mb-2">{sound.icon}</div>
                                        <div className="text-white font-semibold text-sm mb-1">{sound.name}</div>
                                        <div className="text-gray-400 text-xs">{sound.description}</div>

                                        {/* Active Indicator */}
                                        {selectedSound === sound.id && (
                                            <div className="absolute top-2 right-2">
                                                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Count-In Options */}
                        <div>
                            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                </svg>
                                Count-In Mode
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onCountInModeChange?.('three-beat')}
                                    className={`
                                        p-4 rounded-xl border-2 transition-all
                                        ${countInMode === 'three-beat'
                                            ? 'bg-orange-500/20 border-orange-500'
                                            : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
                                        }
                                    `}
                                >
                                    <div className="text-2xl font-bold text-white mb-1">3-2-1</div>
                                    <div className="text-gray-400 text-xs">Quick countdown</div>
                                </button>
                                <button
                                    onClick={() => onCountInModeChange?.('four-beat')}
                                    className={`
                                        p-4 rounded-xl border-2 transition-all
                                        ${countInMode === 'four-beat'
                                            ? 'bg-orange-500/20 border-orange-500'
                                            : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
                                        }
                                    `}
                                >
                                    <div className="text-2xl font-bold text-white mb-1">4 Beats</div>
                                    <div className="text-gray-400 text-xs">Full measure</div>
                                </button>
                            </div>
                        </div>

                        {/* Future: Fretboard Settings (Placeholder) */}
                        <div className="opacity-50">
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="6" width="20" height="12" rx="2" />
                                    <path d="M7 6v12M12 6v12M17 6v12" />
                                </svg>
                                Fretboard Options
                            </h3>
                            <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 text-center">
                                <p className="text-gray-500 text-sm">Coming soon</p>
                            </div>
                        </div>

                        {/* Future: Notation Display (Placeholder) */}
                        <div className="opacity-50">
                            <h3 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                                Notation Display
                            </h3>
                            <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 text-center">
                                <p className="text-gray-500 text-sm">Coming soon</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(-50%) translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </>
    );
};