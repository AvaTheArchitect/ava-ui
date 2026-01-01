'use client';

/**
 * MobileToolsSlideout.tsx V3 - Swipe-to-Open Tools Panel (Mobile PWA)
 * Date: December 30th, 2025 - FINAL VERSION
 * 
 * 🎵 Edge Tab Options:
 * - showEdgeTab={true}: Orange cursor indicator (Ultimate Guitar style)
 * - showEdgeTab={false}: No tab at all (TE Tuner style)
 * 
 * Features:
 * ✅ Swipe from right edge to open
 * ✅ Smart Metronome integration
 * ✅ Universal Settings button
 * ✅ Auto-disable metronome in YouTube mode
 */

import React, { useState, useEffect, useRef } from 'react';

export interface MobileToolsSlideoutProps {
    // Count In props
    isCountInEnabled: boolean;
    onCountInToggle: () => void;
    
    // Metronome props
    isMetronomeEnabled?: boolean;
    onMetronomeToggle?: () => void;
    currentBPM?: number;
    audioSource?: 'synth' | 'original';
    
    // Metronome settings (inline controls)
    metronomeVolume?: number;
    onMetronomeVolumeChange?: (volume: number) => void;
    metronomeBalance?: number;
    onMetronomeBalanceChange?: (balance: number) => void;
    metronomeSubdivision?: number;
    onMetronomeSubdivisionChange?: (subdivision: number) => void;
    metronomeSoundType?: string;
    onMetronomeSoundTypeChange?: (sound: string) => void;
    metronomeAccentEnabled?: boolean;
    onMetronomeAccentToggle?: () => void;
    
    // Count-in mode
    countInMode?: 'three-beat' | 'four-beat';
    onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;
    
    // UI options
    showEdgeTab?: boolean;
}

export const MobileToolsSlideout: React.FC<MobileToolsSlideoutProps> = ({
    isCountInEnabled,
    onCountInToggle,
    isMetronomeEnabled = false,
    onMetronomeToggle,
    currentBPM = 120,
    audioSource = 'synth',
    metronomeVolume = 0.7,
    onMetronomeVolumeChange,
    metronomeBalance = 0,
    onMetronomeBalanceChange,
    metronomeSubdivision = 1,
    onMetronomeSubdivisionChange,
    metronomeSoundType = 'woodblock',
    onMetronomeSoundTypeChange,
    metronomeAccentEnabled = true,
    onMetronomeAccentToggle,
    countInMode = 'three-beat',
    onCountInModeChange,
    showEdgeTab = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showVisualAid, setShowVisualAid] = useState(true);
    const [isMetronomeDrawerOpen, setIsMetronomeDrawerOpen] = useState(false);
    const [isSoundSelectorOpen, setIsSoundSelectorOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchStartTime = useRef<number>(0);

    // Sound options
    const SOUND_OPTIONS = [
        { id: 'woodblock', name: 'Woodblock' },
        { id: 'click', name: 'Click' },
        { id: 'beep', name: 'Beep' },
        { id: 'drum-stick', name: 'Drum Stick' },
        { id: 'kick-drum', name: 'Kick Drum' },
        { id: 'snare-drum', name: 'Snare Drum' },
        { id: 'electronic', name: 'Electronic' },
    ];

    // Handle touch start
    const handleTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartTime.current = Date.now();
    };

    // Handle touch move/end (swipe detection)
    const handleTouchEnd = (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchDuration = Date.now() - touchStartTime.current;
        const swipeDistance = touchStartX.current - touchEndX;
        const screenWidth = window.innerWidth;

        // Swipe from right edge to open (within 50px from edge)
        if (!isOpen && touchStartX.current > screenWidth - 50 && swipeDistance > 50 && touchDuration < 300) {
            setIsOpen(true);
        }
        
        // Swipe right to close (when drawer is open)
        if (isOpen && swipeDistance < -50 && touchDuration < 300) {
            setIsOpen(false);
        }
    };

    // Add touch listeners
    useEffect(() => {
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen]);

    // Close drawer when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Check if metronome should be disabled
    const isMetronomeDisabled = audioSource === 'original';

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer Container */}
            <div
                ref={drawerRef}
                className={`
                    fixed right-0 bottom-[90px] z-[9999]
                    w-[280px] h-[calc(100vh-180px)] max-h-[600px]
                    bg-gray-900/98 backdrop-blur-md
                    border-l border-t border-b border-purple-500/40 
                    rounded-l-2xl shadow-2xl
                    transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-[280px]'}
                `}
            >
                {/* Edge Tab - Orange Cursor Style (Ultimate Guitar inspired) */}
                {showEdgeTab && showVisualAid && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`
                            absolute -left-3 bottom-4 
                            w-3 h-20
                            flex items-center justify-center
                            transition-opacity duration-300
                            ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        `}
                    >
                        {/* Orange cursor line */}
                        <div className="w-1 h-full bg-gradient-to-b from-orange-500/80 via-orange-400 to-orange-500/80 rounded-full shadow-lg shadow-orange-500/50" />
                    </button>
                )}

                {/* Drawer Content */}
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <h3 className="text-white font-bold text-sm uppercase tracking-wide">Tools</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            aria-label="Close drawer"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">

                        {/* Count In Toggle */}
                        <div className="bg-gray-800/60 border-2 border-gray-700/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill="currentColor"
                                        className={isCountInEnabled ? 'text-green-400' : 'text-blue-400'}
                                    >
                                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                    </svg>
                                    <span className={`text-sm font-bold ${isCountInEnabled ? 'text-green-300' : 'text-white'}`}>
                                        Count In
                                    </span>
                                </div>

                                <button
                                    onClick={onCountInToggle}
                                    className={`
                                        relative w-12 h-6 rounded-full transition-colors
                                        ${isCountInEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                    `}
                                >
                                    <div className={`
                                        absolute top-0.5 w-5 h-5 rounded-full bg-white
                                        transition-transform duration-200
                                        ${isCountInEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                                    `} />
                                </button>
                            </div>
                            
                            {/* Count-In Mode Selection */}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onCountInModeChange?.('three-beat')}
                                    className={`
                                        py-2 px-3 rounded-lg text-xs font-bold transition-colors
                                        ${countInMode === 'three-beat'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700/50 text-gray-300'
                                        }
                                    `}
                                >
                                    3-2-1
                                </button>
                                <button
                                    onClick={() => onCountInModeChange?.('four-beat')}
                                    className={`
                                        py-2 px-3 rounded-lg text-xs font-bold transition-colors
                                        ${countInMode === 'four-beat'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-700/50 text-gray-300'
                                        }
                                    `}
                                >
                                    4 Beats
                                </button>
                            </div>
                        </div>

                        {/* Smart Metronome - Collapsible */}
                        <div className={`bg-gray-800/60 border-2 border-gray-700/50 rounded-xl overflow-hidden ${isMetronomeDisabled ? 'opacity-50' : ''}`}>
                            {/* Header with Toggle */}
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <svg 
                                            width="20" 
                                            height="20" 
                                            viewBox="0 0 24 24" 
                                            fill="currentColor"
                                            className={isMetronomeEnabled && !isMetronomeDisabled ? 'text-green-400' : 'text-blue-400'}
                                        >
                                            <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z"/>
                                            <path d="M10.5 12L12 8l1.5 4z"/>
                                        </svg>
                                        <div>
                                            <span className={`text-sm font-bold block ${isMetronomeEnabled && !isMetronomeDisabled ? 'text-green-300' : 'text-white'}`}>
                                                Metronome
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {isMetronomeDisabled ? 'Synth mode only' : `${currentBPM} BPM`}
                                            </span>
                                        </div>
                                    </div>

                                    {onMetronomeToggle && (
                                        <button
                                            onClick={onMetronomeToggle}
                                            disabled={isMetronomeDisabled}
                                            className={`
                                                relative w-12 h-6 rounded-full transition-colors
                                                ${isMetronomeEnabled && !isMetronomeDisabled ? 'bg-green-500' : 'bg-gray-600'}
                                                ${isMetronomeDisabled ? 'cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-0.5 w-5 h-5 rounded-full bg-white
                                                transition-transform duration-200
                                                ${isMetronomeEnabled && !isMetronomeDisabled ? 'translate-x-6' : 'translate-x-0.5'}
                                            `} />
                                        </button>
                                    )}
                                </div>

                                {/* Expand/Collapse Button */}
                                {!isMetronomeDisabled && (
                                    <button
                                        onClick={() => setIsMetronomeDrawerOpen(prev => !prev)}
                                        className="w-full flex items-center justify-center gap-2 mt-2 py-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                                    >
                                        <span className="text-xs text-gray-300">Options</span>
                                        <svg 
                                            width="14" 
                                            height="14" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                            className={`text-gray-400 transition-transform ${isMetronomeDrawerOpen ? 'rotate-180' : ''}`}
                                        >
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </button>
                                )}

                                {isMetronomeDisabled && (
                                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <p className="text-xs text-yellow-300">
                                            ⚠️ Switch to Synth mode
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Collapsible Options */}
                            {isMetronomeDrawerOpen && !isMetronomeDisabled && (
                                <div className="px-3 pb-3 space-y-3 border-t border-gray-700/30">
                                    
                                    {/* Sound Selection */}
                                    <div className="pt-3">
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Sound</label>
                                        <button
                                            onClick={() => setIsSoundSelectorOpen(true)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="text-white text-sm capitalize">{metronomeSoundType.replace('-', ' ')}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Accent Toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-300 block">Accent</label>
                                            <p className="text-xs text-gray-500">Emphasize beats</p>
                                        </div>
                                        <button
                                            onClick={onMetronomeAccentToggle}
                                            className={`
                                                relative w-10 h-5 rounded-full transition-colors
                                                ${metronomeAccentEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                            `}
                                        >
                                            <div className={`
                                                absolute top-0.5 w-4 h-4 rounded-full bg-white
                                                transition-transform duration-200
                                                ${metronomeAccentEnabled ? 'translate-x-5' : 'translate-x-0.5'}
                                            `} />
                                        </button>
                                    </div>

                                    {/* Volume */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-semibold text-gray-300">Volume</label>
                                            <span className="text-xs text-cyan-400">{Math.round(metronomeVolume * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            value={metronomeVolume}
                                            onChange={(e) => onMetronomeVolumeChange?.(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                        />
                                    </div>

                                    {/* Subdivision */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-300 block mb-2">Subdivision</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[0.5, 1, 2].map((value) => (
                                                <button
                                                    key={value}
                                                    onClick={() => onMetronomeSubdivisionChange?.(value)}
                                                    className={`
                                                        py-1.5 rounded-lg text-xs font-bold transition-colors
                                                        ${metronomeSubdivision === value
                                                            ? 'bg-white text-gray-900'
                                                            : 'bg-gray-700/50 text-gray-300'
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
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-xs font-semibold text-gray-300">L & R</label>
                                            <span className="text-xs text-cyan-400">
                                                {metronomeBalance < -0.1 ? 'Left' : metronomeBalance > 0.1 ? 'Right' : 'Center'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">L</span>
                                            <input
                                                type="range"
                                                min="-1"
                                                max="1"
                                                step="0.01"
                                                value={metronomeBalance}
                                                onChange={(e) => onMetronomeBalanceChange?.(parseFloat(e.target.value))}
                                                className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-400"
                                            />
                                            <span className="text-xs text-gray-500">R</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-700/50 my-2" />

                        {/* Future Features */}
                        <button disabled className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50">
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                    <rect x="2" y="6" width="20" height="12" rx="2" />
                                    <path d="M7 6v12M12 6v12M17 6v12" />
                                </svg>
                                <span className="text-sm font-bold text-gray-500">Fretboard</span>
                            </div>
                            <span className="text-xs text-gray-600">Soon</span>
                        </button>

                        <button disabled className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50">
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                                    <path d="M6 2V10C6 12 4 13 4 13V17C4 18 5 19 6 19H14C15 19 16 18 16 17V13C16 13 14 12 14 10V2H12V9C12 9.5 11.5 10 11 10H9C8.5 10 8 9.5 8 9V2H6Z" />
                                </svg>
                                <span className="text-sm font-bold text-gray-500">Tuner</span>
                            </div>
                            <span className="text-xs text-gray-600">Soon</span>
                        </button>

                        <button disabled className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50">
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v12M6 12h12" />
                                </svg>
                                <span className="text-sm font-bold text-gray-500">Key Changer</span>
                            </div>
                            <span className="text-xs text-gray-600">Soon</span>
                        </button>
                    </div>

                    {/* Visual Aid Toggle (Bottom Footer) */}
                    <div className="border-t border-gray-700/50 p-3">
                        {showEdgeTab && (
                            <div className="flex items-center justify-between px-2 py-2 bg-gray-800/40 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    <span className="text-xs text-gray-300">Visual Aid</span>
                                </div>
                                <button
                                    onClick={() => setShowVisualAid(prev => !prev)}
                                    className={`
                                        relative w-10 h-5 rounded-full transition-colors
                                        ${showVisualAid ? 'bg-orange-500' : 'bg-gray-600'}
                                    `}
                                >
                                    <div className={`
                                        absolute top-0.5 w-4 h-4 rounded-full bg-white
                                        transition-transform duration-200
                                        ${showVisualAid ? 'translate-x-5' : 'translate-x-0.5'}
                                    `} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sound Selector Popup */}
            {isSoundSelectorOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setIsSoundSelectorOpen(false)} />
                    <div className="relative bg-gray-800 border-2 border-purple-500/40 rounded-2xl p-4 max-w-xs w-full shadow-2xl">
                        <h3 className="text-white font-bold mb-3 text-center">Select Sound</h3>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {SOUND_OPTIONS.map((sound) => (
                                <button
                                    key={sound.id}
                                    onClick={() => {
                                        onMetronomeSoundTypeChange?.(sound.id);
                                        setIsSoundSelectorOpen(false);
                                    }}
                                    className={`
                                        w-full px-4 py-3 rounded-lg text-left transition-colors
                                        ${metronomeSoundType === sound.id
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
        </>
    );
};