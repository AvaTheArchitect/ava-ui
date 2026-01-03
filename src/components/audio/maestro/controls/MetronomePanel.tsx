'use client';

/**
 * MetronomePanel.tsx V2 - Desktop Metronome Settings Panel
 * Date: January 1st, 2026
 * 
 * 🎵 Features:
 * ✅ Matches SpeedControl/TrackMixer panel design
 * ✅ Opens from Metronome button in TransportBar
 * ✅ All metronome controls inline (no nested popups)
 * ✅ Sound selector, Accent, Volume, Balance, Subdivision
 * ✅ Preview sounds when selecting
 * ✅ Current BPM display synced with song tempo
 * ✅ Auto-disable in YouTube mode
 * 
 * 🔧 VERIFIED:
 * ✅ currentBPM prop is used directly (no hardcoded defaults)
 * ✅ All event handlers properly call parent callbacks
 * ✅ Sound selection updates both preview AND actual metronome
 */

import React, { useState, useCallback } from 'react';
import type { MetronomeSoundType, SubdivisionMode } from './useSmartMetronome';

export interface MetronomePanelProps {
    isEnabled: boolean;
    onToggle: () => void;
    currentBPM: number;
    audioSource: 'synth' | 'original';
    
    // Settings
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
    
    // Panel state
    isPanelOpen: boolean;
    onTogglePanel: () => void;
    
    // Audio arming
    onArmMetronome?: () => Promise<void>;
}

const SOUND_OPTIONS: { id: MetronomeSoundType; name: string; freq: number }[] = [
    { id: 'woodblock', name: 'Woodblock', freq: 800 },
    { id: 'click', name: 'Click', freq: 1200 },
    { id: 'beep', name: 'Beep', freq: 1000 },
    { id: 'drum-stick', name: 'Drum Stick', freq: 2000 },
    { id: 'kick-drum', name: 'Kick Drum', freq: 80 },
    { id: 'snare-drum', name: 'Snare Drum', freq: 200 },
    { id: 'electronic', name: 'Electronic', freq: 440 },
];

export const MetronomePanel: React.FC<MetronomePanelProps> = ({
    isEnabled,
    onToggle,
    currentBPM,
    audioSource,
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
    isPanelOpen,
    onTogglePanel,
    onArmMetronome,
}) => {
    const [isSoundSelectorOpen, setIsSoundSelectorOpen] = useState(false);
    
    const isDisabled = audioSource === 'original';
    const effectiveBPM = Math.round(currentBPM * subdivision);

    // Preview sound when selecting
    const playPreviewSound = useCallback((soundId: MetronomeSoundType) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const sound = SOUND_OPTIONS.find(s => s.id === soundId);
            if (!sound) return;

            oscillator.frequency.value = sound.freq;
            oscillator.type = (soundId === 'kick-drum' || soundId === 'snare-drum') ? 'triangle' 
                : (soundId === 'electronic') ? 'sine' : 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);

            console.log(`🔊 Preview sound: ${soundId}`);
        } catch (error) {
            console.warn('Preview sound failed:', error);
        }
    }, []);

    // Handle toggle with arming
    const handleToggle = async () => {
        if (onArmMetronome && !isEnabled) {
            await onArmMetronome();
        }
        onToggle();
    };

    // Handle sound selection
    const handleSoundSelect = (soundId: MetronomeSoundType) => {
        console.log(`🎵 Metronome sound changed to: ${soundId}`);
        onSoundTypeChange(soundId);
        playPreviewSound(soundId);
        setIsSoundSelectorOpen(false);
    };

    if (!isPanelOpen) return null;

    return (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[320px] z-[11000]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-blue-400">Metronome Settings</span>
                <button 
                    onClick={onTogglePanel} 
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* BPM Display */}
            <div className="mb-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{effectiveBPM} BPM</div>
                <div className="text-xs text-gray-500">
                    Base: {currentBPM} BPM {subdivision !== 1 && `× ${subdivision}`}
                </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-white">Metronome</div>
                        <div className="text-xs text-gray-400">
                            {isDisabled ? 'Synth mode only' : isEnabled ? 'Playing' : 'Off'}
                        </div>
                    </div>
                    <button
                        onClick={handleToggle}
                        disabled={isDisabled}
                        className={`
                            relative w-12 h-6 rounded-full transition-colors
                            ${isEnabled && !isDisabled ? 'bg-green-500' : 'bg-gray-600'}
                            ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}
                        `}
                    >
                        <div className={`
                            absolute top-0.5 w-5 h-5 rounded-full bg-white
                            transition-transform duration-200
                            ${isEnabled && !isDisabled ? 'translate-x-6' : 'translate-x-0.5'}
                        `} />
                    </button>
                </div>
            </div>

            {/* Settings Section (disabled if in YouTube mode) */}
            <div className={`space-y-4 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {/* Sound Selector */}
                <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-2">Sound</label>
                    <button
                        onClick={() => setIsSoundSelectorOpen(prev => !prev)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <span className="text-white text-sm capitalize">{soundType.replace('-', ' ')}</span>
                        <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            className={`text-gray-400 transition-transform ${isSoundSelectorOpen ? 'rotate-90' : ''}`}
                        >
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>

                    {/* Sound Options List (inline, not popup) */}
                    {isSoundSelectorOpen && (
                        <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto bg-gray-800/80 rounded-lg p-2">
                            {SOUND_OPTIONS.map((sound) => (
                                <button
                                    key={sound.id}
                                    onClick={() => handleSoundSelect(sound.id)}
                                    className={`
                                        w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center justify-between text-sm
                                        ${soundType === sound.id
                                            ? 'bg-cyan-500 text-white font-bold'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <span>{sound.name}</span>
                                    {soundType === sound.id && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white">
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Accent Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                        <div className="text-sm font-medium text-white">Accent Beats</div>
                        <div className="text-xs text-gray-400">Emphasize downbeats</div>
                    </div>
                    <button
                        onClick={() => {
                            console.log(`🎵 Accent toggle: ${!accentEnabled}`);
                            onAccentToggle();
                        }}
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

                {/* Volume Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-300">Volume</label>
                        <span className="text-xs text-gray-400">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(volume * 100)}
                        onChange={(e) => {
                            const newVolume = parseInt(e.target.value) / 100;
                            console.log(`🔊 Volume changed to: ${newVolume}`);
                            onVolumeChange(newVolume);
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                {/* Balance Slider */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-300">Balance</label>
                        <span className="text-xs text-gray-400">
                            {balance === 0 ? 'Center' : balance < 0 ? `L${Math.abs(Math.round(balance * 100))}` : `R${Math.round(balance * 100)}`}
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-100"
                        max="100"
                        value={Math.round(balance * 100)}
                        onChange={(e) => {
                            const newBalance = parseInt(e.target.value) / 100;
                            console.log(`🎵 Balance changed to: ${newBalance}`);
                            onBalanceChange(newBalance);
                        }}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                </div>

                {/* Subdivision Buttons */}
                <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-2">Subdivision</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[0.5, 1, 2].map((sub) => (
                            <button
                                key={sub}
                                onClick={() => {
                                    console.log(`🎵 Subdivision changed to: ${sub}x`);
                                    onSubdivisionChange(sub as SubdivisionMode);
                                }}
                                className={`
                                    py-2 rounded-lg text-sm font-bold transition-colors
                                    ${subdivision === sub
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }
                                `}
                            >
                                {sub}x
                            </button>
                        ))}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 text-center">
                        {subdivision === 0.5 ? 'Half notes' : subdivision === 1 ? 'Quarter notes' : 'Eighth notes'}
                    </div>
                </div>
            </div>

            {/* YouTube mode warning */}
            {isDisabled && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-300 text-center">
                        ⚠️ Switch to Synth mode to use metronome
                    </p>
                </div>
            )}
        </div>
    );
};