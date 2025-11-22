'use client';

/**
 * TopMenuTray.tsx - Header Component
 * November 21st, 2025
 * 
 * Extracted from page.tsx for clean separation of concerns.
 * Handles:
 * - Auto-hide on scroll (mobile)
 * - Back button
 * - Song title/artist display (desktop)
 * - Star button (opens song selector)
 */

import React, { useEffect, useRef, useState } from 'react';
import { SongItem } from '@/lib/song-data';

export interface TopMenuTrayProps {
    /** Current song info (or null if no song loaded) */
    currentSong: SongItem | null;

    /** Handler to open song selector */
    onSongSelectorOpen: () => void;

    /** Optional: Custom back button handler */
    onBack?: () => void;
}

export const TopMenuTray: React.FC<TopMenuTrayProps> = ({
    currentSong,
    onSongSelectorOpen,
    onBack,
}) => {
    // Auto-hide header state
    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
    const lastScrollY = useRef<number>(0);

    // Auto-hide header on scroll (mobile behavior)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                // Scrolling down & past 100px → hide
                setIsHeaderVisible(false);
            } else if (currentScrollY < lastScrollY.current) {
                // Scrolling up → show
                setIsHeaderVisible(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Default back handler (goes to home or previous page)
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            window.history.back();
        }
    };

    return (
        <header
            className={`
        fixed top-0 inset-x-0 w-full z-50
        bg-gray-900/95 border-b border-purple-500/30 backdrop-blur-sm
        transform transition-transform duration-300 ease-in-out
        ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
        >
            <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">

                {/* Left: Back Button */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Back"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            className="text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                {/* Center: Song Title (Desktop only, clickable) */}
                <div
                    className="hidden md:block text-center flex-1 cursor-pointer"
                    onClick={onSongSelectorOpen}
                    title="Click to change song"
                >
                    <h1 className="text-lg font-bold text-white truncate hover:text-purple-400 transition-colors">
                        {currentSong
                            ? `${currentSong.artist} - ${currentSong.title}`
                            : 'Select a Song'
                        }
                    </h1>
                    <p className="text-xs text-gray-400">
                        {currentSong?.album || 'Click to browse songs'}
                    </p>
                </div>

                {/* Right: Star Button + More Options */}
                <div className="flex items-center gap-2">

                    {/* Star Button (Opens Song Selector) */}
                    <button
                        onClick={onSongSelectorOpen}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Song Library"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            className={currentSong?.isFavorite ? "text-yellow-400" : "text-gray-400"}
                            fill={currentSong?.isFavorite ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    </button>

                    {/* More Options (Mobile only - placeholder for future) */}
                    <button
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden"
                        title="More options"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            className="text-gray-400"
                            fill="currentColor"
                        >
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};