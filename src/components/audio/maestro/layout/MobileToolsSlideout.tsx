'use client';

/**
 * MobileToolsSlideout.tsx - Swipe-to-Open Tools Panel (Mobile PWA)
 * Date: December 30th, 2025 - V2
 * 
 * 🎵 Features:
 * ✅ Swipe from right edge to open (always works)
 * ✅ Optional edge tab (cleaner without wrench icon)
 * ✅ Slides above transport bar (bottom: 90px)
 * ✅ Blue toggles → Green when active (Songsterr-style)
 * ✅ Universal Settings button (shared by all tools)
 * ✅ Touch-friendly gesture handling
 * 
 * Changes in V2:
 * - Better metronome icon (traditional metronome shape)
 * - Removed individual settings buttons
 * - Added universal Settings button at bottom
 * - Cleaner edge tab (no wrench icon)
 */

import React, { useState, useEffect, useRef } from 'react';

export interface MobileToolsSlideoutProps {
    // Count In props
    isCountInEnabled: boolean;
    onCountInToggle: () => void;
    
    // Metronome props
    isMetronomeEnabled?: boolean;
    onMetronomeToggle?: () => void;
    
    // Settings handler (universal for all tools)
    onSettingsOpen?: () => void;
    
    // UI options
    showEdgeTab?: boolean;
    
    // Future features
    onFretboardToggle?: () => void;
    onTunerOpen?: () => void;
    onKeyChangerOpen?: () => void;
}

export const MobileToolsSlideout: React.FC<MobileToolsSlideoutProps> = ({
    isCountInEnabled,
    onCountInToggle,
    isMetronomeEnabled = false,
    onMetronomeToggle,
    onSettingsOpen,
    showEdgeTab = true,
    onFretboardToggle,
    onTunerOpen,
    onKeyChangerOpen,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchStartTime = useRef<number>(0);

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

    return (
        <>
            {/* Backdrop - subtle dim when open */}
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
                {/* Edge Tab - Cleaner design without wrench */}
                {showEdgeTab && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`
                            absolute -left-12 top-1/2 -translate-y-1/2
                            w-12 h-24
                            bg-gray-900/98 backdrop-blur-md
                            border-l border-t border-b border-purple-500/40
                            rounded-l-xl
                            flex items-center justify-center
                            transition-opacity duration-300
                            ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        `}
                    >
                        {/* Simple 3-dot menu indicator */}
                        <div className="flex flex-col gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </div>
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

                                {/* Toggle Switch */}
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
                            <p className={`text-xs ${isCountInEnabled ? 'text-green-400/80' : 'text-gray-400'}`}>
                                {isCountInEnabled ? '3-2-1 countdown before play' : 'Tap to enable'}
                            </p>
                        </div>

                        {/* Metronome Toggle - Updated Icon */}
                        <div className="bg-gray-800/60 border-2 border-gray-700/50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {/* Traditional Metronome Icon */}
                                    <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill="currentColor"
                                        className={isMetronomeEnabled ? 'text-green-400' : 'text-blue-400'}
                                    >
                                        <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z"/>
                                        <path d="M10.5 12L12 8l1.5 4z"/>
                                    </svg>
                                    <span className={`text-sm font-bold ${isMetronomeEnabled ? 'text-green-300' : 'text-white'}`}>
                                        Metronome
                                    </span>
                                </div>

                                {/* Toggle Switch */}
                                {onMetronomeToggle && (
                                    <button
                                        onClick={onMetronomeToggle}
                                        className={`
                                            relative w-12 h-6 rounded-full transition-colors
                                            ${isMetronomeEnabled ? 'bg-green-500' : 'bg-gray-600'}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-0.5 w-5 h-5 rounded-full bg-white
                                            transition-transform duration-200
                                            ${isMetronomeEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                                        `} />
                                    </button>
                                )}
                            </div>

                            <p className={`text-xs ${isMetronomeEnabled ? 'text-green-400/80' : 'text-gray-400'}`}>
                                {onMetronomeToggle 
                                    ? (isMetronomeEnabled ? 'Click enabled' : 'Tap to enable')
                                    : 'Coming soon'
                                }
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-700/50 my-2" />

                        {/* Future Features - Placeholder Buttons */}
                        
                        {/* Interactive Fretboard */}
                        <button
                            disabled
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                    <rect x="2" y="6" width="20" height="12" rx="2" />
                                    <path d="M7 6v12M12 6v12M17 6v12" />
                                </svg>
                                <span className="text-sm font-bold text-gray-500">Fretboard</span>
                            </div>
                            <span className="text-xs text-gray-600">Soon</span>
                        </button>

                        {/* Chromatic Tuner */}
                        <button
                            disabled
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                                    <path d="M6 2V10C6 12 4 13 4 13V17C4 18 5 19 6 19H14C15 19 16 18 16 17V13C16 13 14 12 14 10V2H12V9C12 9.5 11.5 10 11 10H9C8.5 10 8 9.5 8 9V2H6Z" />
                                    <rect x="4" y="17" width="12" height="2" rx="1" />
                                </svg>
                                <span className="text-sm font-bold text-gray-500">Tuner</span>
                            </div>
                            <span className="text-xs text-gray-600">Soon</span>
                        </button>

                        {/* Key Changer */}
                        <button
                            disabled
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/30 border-2 border-gray-700/30 opacity-50"
                        >
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

                    {/* Universal Settings Button - Bottom */}
                    <div className="border-t border-gray-700/50 p-3">
                        <button
                            onClick={onSettingsOpen}
                            disabled={!onSettingsOpen}
                            className={`
                                w-full flex items-center justify-center gap-3 px-4 py-3
                                bg-gray-800/60 border-2 border-gray-700/50 rounded-xl
                                transition-all
                                ${onSettingsOpen 
                                    ? 'hover:bg-gray-700/60 hover:border-purple-500/40 active:scale-95' 
                                    : 'opacity-50 cursor-not-allowed'
                                }
                            `}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-cyan-400">
                                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                            </svg>
                            <span className="text-sm font-bold text-white">Settings</span>
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            {onSettingsOpen ? 'Configure tool options' : 'Coming soon'}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};