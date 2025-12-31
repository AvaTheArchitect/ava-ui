'use client';

/**
 * MetronomeSettings.tsx V3 -  Collapsible Metronome Controls in Settings
 * Date: December 31st, 2025
 * 
 * 🎚️ Features:
 * ✅ Collapsible drawer format (TE Tuner style)
 * ✅ Simple sound selector popup
 * ✅ Accent toggle (on/off)
 * ✅ Volume, Balance, Subdivision controls
 * ✅ Kick drum + Snare drum sounds
 * 
 * Integration Path:
 * maestro-ai/src/components/audio/maestro/controls/MetronomeSettings.tsx
 */

import React, { useState } from 'react';
import type { MetronomeSoundType, SubdivisionMode } from './useSmartMetronome';

export interface MetronomeSettingsProps {
    isOpen: boolean;
    onClose: () => void;

    // Metronome settings
    volume: number;
    onVolumeChange: (volume: number) => void;

    balance: number;
    onBalanceChange: (balance: number) => void;

    subdivision: SubdivisionMode;
    onSubdivisionChange: (subdivision: SubdivisionMode) => void;

    soundType: MetronomeSoundType;
    onSoundTypeChange: (sound: MetronomeSoundType) => void;

    accentEnabled: boolean;
    onAccentToggle: () => void;

    // Count-in settings
    countInMode?: 'three-beat' | 'four-beat';
    onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;
}

const SOUND_OPTIONS: { id: MetronomeSoundType; name: string }[] = [
    { id: 'woodblock', name: 'Woodblock' },
    { id: 'click', name: 'Click' },
    { id: 'beep', name: 'Beep' },
    { id: 'drum-stick', name: 'Drum Stick' },
    { id: 'kick-drum', name: 'Kick Drum' },
    { id: 'snare-drum', name: 'Snare Drum' },
    { id: 'electronic', name: 'Electronic' },
];

export const MetronomeSettings: React.FC<MetronomeSettingsProps> = ({
    isOpen,
    onClose,
    volume,
    onVolumeChange,
    balance,
    onBalanceChange,
    subdivision,
    onSubdivisionChange,
    soundType,
    onSoundTypeChange,
    accentEnabled,
    onAccentToggle,
    countInMode = 'three-beat',
    onCountInModeChange,
}) => {
    const [isMetronomeDrawerOpen, setIsMetronomeDrawerOpen] = useState(true);
    const [isSoundSelectorOpen, setIsSoundSelectorOpen] = useState(false);

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
                <div className="bg-gray-900/98 backdrop-blur-xl border-2 border-purple-500/40 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto">

                    {/* Header */}
                    <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3 flex items-center justify-between z-10">
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
                    <div className="p-4 space-y-3">

                        {/* Metronome Settings - Collapsible Drawer */}
                        <div className="bg-gray-800/60 border-2 border-gray-700/50 rounded-xl overflow-hidden">
                            {/* Drawer Header */}
                            <button
                                onClick={() => setIsMetronomeDrawerOpen(prev => !prev)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                                        <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                                    </svg>
                                    <span className="text-white font-bold text-sm">Metronome Options</span>
                                </div>
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`text-gray-400 transition-transform ${isMetronomeDrawerOpen ? 'rotate-180' : ''}`}
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>

                            {/* Drawer Content */}
                            {isMetronomeDrawerOpen && (
                                <div className="px-4 pb-4 space-y-4 border-t border-gray-700/30">

                                    {/* Sound Selection */}
                                    <div className="pt-4">
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Sound</label>
                                        <button
                                            onClick={() => setIsSoundSelectorOpen(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="text-white text-sm capitalize">{soundType.replace('-', ' ')}</span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Accent Toggle */}
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-300 block">Accent Beats</label>
                                            <p className="text-xs text-gray-500 mt-0.5">Emphasize downbeats</p>
                                        </div>
                                        <button
                                            onClick={onAccentToggle}
                                            className={`
                                                relative w-12 h-6 rounded-full transition-colors
                                                ${accentEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-0.5 w-5 h-5 rounded-full bg-white
                                                transition-transform duration-200
                                                ${accentEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                                            `} />
                                        </button>
                                    </div>

                                    {/* Volume Control */}
                                    <div>
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
                                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                        />
                                    </div>

                                    {/* Subdivision */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Subdivision</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {([0.5, 1, 2] as SubdivisionMode[]).map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => onSubdivisionChange(value)}
                                                    className={`
                                                        py-2 px-4 rounded-lg font-bold text-sm transition-colors
                                                        ${subdivision === value
                                                            ? 'bg-white text-gray-900'
                                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                                        }
                                                    `}
                                                >
                                                    {value}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* L & R Balance */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold text-gray-300">L & R Balance</label>
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
                                                onChange={(e) => onBalanceChange(parseFloat(e.target.value))}
                                                className="flex-1 h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                            />
                                            <span className="text-xs text-gray-500">R</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">For stage performers</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Count-In Mode */}
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

                    </div>
                </div>
            </div>

            {/* Sound Selector Popup */}
            {isSoundSelectorOpen && (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setIsSoundSelectorOpen(false)} />
                    <div className="relative bg-gray-800 border-2 border-purple-500/40 rounded-2xl p-4 max-w-xs w-full shadow-2xl">
                        <h3 className="text-white font-bold mb-3 text-center">Select Sound</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {SOUND_OPTIONS.map((sound) => (
                                <button
                                    key={sound.id}
                                    onClick={() => {
                                        onSoundTypeChange(sound.id);
                                        setIsSoundSelectorOpen(false);
                                    }}
                                    className={`
                                        w-full px-4 py-3 rounded-lg text-left transition-colors
                                        ${soundType === sound.id
                                            ? 'bg-orange-500 text-white font-bold'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {sound.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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