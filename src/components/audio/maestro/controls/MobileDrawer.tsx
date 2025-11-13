'use client';

/**
 * MobileDrawer.tsx - STAGE 1.2
 * November 13th, 2025
 * Slide-up drawer for mobile secondary controls
 * Similar to Songsterr's mobile "More" menu (gear icon)
 * 
 * Contains:
 * - Audio Source Toggle (Synth/YouTube)
 * - Theme Toggle
 * - Stub buttons for future features (Metronome, Count-in, Tuner, Print)
 */

import React, { useEffect } from 'react';
import { AudioSourceToggle } from './AudioSourceToggle';
import type { MobileDrawerProps } from './MaestroControlTypes';

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen,
    onClose,
    audioSource,
    theme,
    onAudioSourceChange,
    onThemeToggle,
    onMetronomeToggle,
    onCountInToggle,
    onTunerOpen,
    onPrintOpen,
}) => {
    // Close drawer on Escape key
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent background scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/50 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto pb-safe">
                {/* Handle Bar */}
                <div className="flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 flex items-center justify-between border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Close"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-6 space-y-6">
                    {/* Audio Source Toggle */}
                    <AudioSourceToggle
                        audioSource={audioSource}
                        onChange={onAudioSourceChange}
                    />

                    {/* Theme Toggle */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Appearance
                        </div>
                        <button
                            onClick={onThemeToggle}
                            className="w-full flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{theme === 'dark' ? '🌙' : '☀️'}</span>
                                <span className="text-white font-medium">
                                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </span>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Practice Tools - Stubs for Future */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Practice Tools
                        </div>
                        
                        {/* Metronome */}
                        <button
                            onClick={onMetronomeToggle}
                            disabled={!onMetronomeToggle}
                            className={`
                                w-full flex items-center justify-between p-4 rounded-lg
                                border transition-all
                                ${onMetronomeToggle
                                    ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                                    : 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">⏱️</span>
                                <span className="text-white font-medium">Metronome</span>
                            </div>
                            {!onMetronomeToggle && (
                                <span className="text-xs text-gray-500">Coming Soon</span>
                            )}
                        </button>

                        {/* Count-in */}
                        <button
                            onClick={onCountInToggle}
                            disabled={!onCountInToggle}
                            className={`
                                w-full flex items-center justify-between p-4 rounded-lg
                                border transition-all
                                ${onCountInToggle
                                    ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                                    : 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎵</span>
                                <span className="text-white font-medium">Count-in</span>
                            </div>
                            {!onCountInToggle && (
                                <span className="text-xs text-gray-500">Coming Soon</span>
                            )}
                        </button>

                        {/* Tuner */}
                        <button
                            onClick={onTunerOpen}
                            disabled={!onTunerOpen}
                            className={`
                                w-full flex items-center justify-between p-4 rounded-lg
                                border transition-all
                                ${onTunerOpen
                                    ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                                    : 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🎸</span>
                                <span className="text-white font-medium">Tuner</span>
                            </div>
                            {!onTunerOpen && (
                                <span className="text-xs text-gray-500">Coming Soon</span>
                            )}
                        </button>

                        {/* Print */}
                        <button
                            onClick={onPrintOpen}
                            disabled={!onPrintOpen}
                            className={`
                                w-full flex items-center justify-between p-4 rounded-lg
                                border transition-all
                                ${onPrintOpen
                                    ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                                    : 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🖨️</span>
                                <span className="text-white font-medium">Print</span>
                            </div>
                            {!onPrintOpen && (
                                <span className="text-xs text-gray-500">Coming Soon</span>
                            )}
                        </button>
                    </div>

                    {/* About/Version */}
                    <div className="pt-4 border-t border-gray-700">
                        <div className="text-center text-sm text-gray-500">
                            <p className="font-bold text-gray-400 mb-1">Maestro v1.2</p>
                            <p>Stage 1.2 - Mobile-First PWA</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};