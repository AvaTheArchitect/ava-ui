'use client';

/**
 * TuningOverlay.tsx - V8.5: STABLE SHORTNAME TUNING
 *
 * ✅ Applies tuning to track.shortName (Unicode line separator) once per score load
 * ✅ Re-applies only when pitchShift changes
 * ✅ Does NOT listen to renderFinished or playbackRange
 * ✅ Does NOT continuously re-render the score
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AlphaTabApi } from '@/lib/alphaTab/types';

// Note names - Musical Sharp/Flat (Unicode) to prevent fragmentation
const NOTE_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const midiToNoteName = (midi: number, preferFlat: boolean = false): string => {
    const noteIndex = ((midi % 12) + 12) % 12;
    return preferFlat ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES_SHARP[noteIndex];
};

// Fallback standard tuning
const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];
const MIN_PITCH = -12;
const MAX_PITCH = 12;

export interface TuningOverlayProps {
    api?: AlphaTabApi | null;
    tuning?: number[];
    pitchShift: number;
    onPitchShiftChange: (semitones: number) => void;
    isSynthMode: boolean;
    theme?: 'light' | 'dark';
    isReady?: boolean;
    isPlaying?: boolean;
    isPopoverOpen?: boolean;
    onPopoverToggle?: (open: boolean) => void;
    popoverAnchor?: { top: number; left: number } | null;
}

export const TuningOverlay: React.FC<TuningOverlayProps> = ({
    api,
    tuning = STANDARD_TUNING_MIDI,
    pitchShift,
    onPitchShiftChange,
    isSynthMode,
    theme = 'dark',
    isReady = false,
    isPlaying = false,
    isPopoverOpen: externalPopoverOpen,
    onPopoverToggle,
    popoverAnchor,
}) => {
    // ==================== STATE ====================
    const [internalPopoverOpen, setInternalPopoverOpen] = useState(false);
    const [internalAnchor, setInternalAnchor] = useState({ top: 100, left: 100 });

    const isPopoverOpen = externalPopoverOpen !== undefined ? externalPopoverOpen : internalPopoverOpen;
    const setIsPopoverOpen = onPopoverToggle || setInternalPopoverOpen;
    const anchorPosition = popoverAnchor || internalAnchor;

    const popoverRef = useRef<HTMLDivElement>(null);
    const lastPitchShiftRef = useRef<number>(pitchShift);
    const lastScoreIdRef = useRef<string | null>(null);

    const isDark = theme === 'dark';
    const semitoneText = Math.abs(pitchShift) === 1 ? 'semitone' : 'semitones';

    // Default to sharps for guitar tabs
    const preferFlat = false;

    // AlphaTab files have tuning HIGH-TO-LOW, reverse for display LOW-TO-HIGH
    const reversedTuning = [...tuning].reverse();
    const displayedTuning = reversedTuning.map(midi => midiToNoteName(midi + pitchShift, preferFlat));

    // ==================== UPDATE TRACK SHORT NAMES ====================
    /**
     * Uses Unicode Line Separator (\u2028) for vertical stacking.
     * Double separators (\u2028\u2028) for line height.
     * Called only when score changes or pitchShift changes.
     */
    const updateAllTrackShortNames = useCallback(() => {
        if (!api?.score?.tracks) {
            console.log('⏭️ V8.5: No tracks available for tuning update');
            return;
        }

        const tracks = api.score.tracks as any[];
        if (!tracks.length) {
            console.log('⏭️ V8.5: Empty tracks array');
            return;
        }

        const tuningString = displayedTuning.join('\u2028\u2028');

        tracks.forEach((track: any) => {
            track.shortName = tuningString;
        });

        console.log(`🎸 V8.5: Set shortName with Unicode separators on ${tracks.length} tracks`);
        console.log(`🎸 V8.5: Tuning: ${displayedTuning.join(' ')}`);
    }, [api, displayedTuning]);

    // ==================== SCORE LOADED / SCORE CHANGE ====================
    useEffect(() => {
        if (!api) return;

        const handleScoreLoaded = (score: any) => {
            const scoreId = `${score?.title || ''}|${score?.tracks?.length || 0}`;
            if (lastScoreIdRef.current === scoreId && lastPitchShiftRef.current === pitchShift) {
                // Same score and same pitch, skip re-apply
                return;
            }

            lastScoreIdRef.current = scoreId;
            lastPitchShiftRef.current = pitchShift;

            console.log('📊 V8.5: Score loaded - applying tuning to shortNames');
            updateAllTrackShortNames();
        };

        api.scoreLoaded.on(handleScoreLoaded);

        // If score is already present (e.g., overlay mounts after renderer)
        if (api.score && api.score.tracks?.length) {
            const score = api.score as any;
            const scoreId = `${score?.title || ''}|${score?.tracks?.length || 0}`;
            if (lastScoreIdRef.current !== scoreId || lastPitchShiftRef.current !== pitchShift) {
                lastScoreIdRef.current = scoreId;
                lastPitchShiftRef.current = pitchShift;
                console.log('📊 V8.5: Existing score detected - applying tuning to shortNames');
                updateAllTrackShortNames();
            }
        }

        return () => {
            api.scoreLoaded.off(handleScoreLoaded);
        };
    }, [api, pitchShift, updateAllTrackShortNames]);

    // ==================== PITCH SHIFT CHANGE ====================
    useEffect(() => {
        if (!api?.score?.tracks) return;

        if (pitchShift === lastPitchShiftRef.current) return;

        lastPitchShiftRef.current = pitchShift;
        console.log(`🔄 V8.5: Pitch shift changed to ${pitchShift} - reapplying tuning`);

        updateAllTrackShortNames();

        // Light touch: do not spam full renders; AlphaTab will re-layout on next normal render.
        // If you find visuals lag, you can uncomment the next line, but only if needed:
        // api.render();
    }, [pitchShift, api, updateAllTrackShortNames]);

    // ==================== KEYBOARD SHORTCUTS ====================
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // R key: Toggle popover
            if (e.key.toLowerCase() === 'r' && isSynthMode && isReady && !isPlaying) {
                e.preventDefault();
                setIsPopoverOpen(!isPopoverOpen);
            }

            // Arrow keys: Adjust pitch (when popover is open)
            if (isPopoverOpen) {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (pitchShift < MAX_PITCH) onPitchShiftChange(pitchShift + 1);
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (pitchShift > MIN_PITCH) onPitchShiftChange(pitchShift - 1);
                } else if (e.key === '0') {
                    e.preventDefault();
                    onPitchShiftChange(0);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsPopoverOpen(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSynthMode, isReady, isPlaying, isPopoverOpen, pitchShift, onPitchShiftChange, setIsPopoverOpen]);

    // ==================== CLOSE POPOVER ON OUTSIDE CLICK ====================
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isPopoverOpen && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsPopoverOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPopoverOpen, setIsPopoverOpen]);

    // ==================== CLOSE POPOVER ON PLAYBACK ====================
    useEffect(() => {
        if (isPlaying) setIsPopoverOpen(false);
    }, [isPlaying, setIsPopoverOpen]);

    // ==================== PITCH SHIFT HANDLERS ====================
    const handleStepDown = () => {
        if (pitchShift > MIN_PITCH) {
            onPitchShiftChange(pitchShift - 1);
        }
    };

    const handleStepUp = () => {
        if (pitchShift < MAX_PITCH) {
            onPitchShiftChange(pitchShift + 1);
        }
    };

    const handleRestore = () => {
        onPitchShiftChange(0);
    };

    // Don't render if not ready
    if (!isReady) return null;

    // ==================== RENDER: POPOVER ONLY ====================
    return (
        <>
            {isPopoverOpen && (
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label="Shift Pitch"
                    className={`
                        fixed z-[9999] min-w-[180px] p-3 rounded-lg shadow-xl border
                        ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}
                    `}
                    style={{
                        top: anchorPosition.top,
                        left: anchorPosition.left,
                        animation: 'fadeIn 0.15s ease-out',
                    }}
                >
                    {/* Header */}
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Shift Pitch
                    </p>

                    {/* +/- Controls */}
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {/* Step Down Button */}
                        <button
                            onClick={handleStepDown}
                            disabled={pitchShift <= MIN_PITCH}
                            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all
                                ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}
                                disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            <svg width="16" height="2"><rect width="16" height="2" rx="1" fill={isDark ? '#fff' : '#333'} /></svg>
                        </button>

                        {/* Current Value Display */}
                        <div className="text-center min-w-[60px]">
                            <span className={`text-2xl font-bold block leading-none
                                ${pitchShift === 0 ? (isDark ? 'text-gray-400' : 'text-gray-500')
                                    : pitchShift > 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                {pitchShift > 0 ? `+${pitchShift}` : pitchShift}
                            </span>
                            <span className={`text-[10px] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {semitoneText}
                            </span>
                        </div>

                        {/* Step Up Button */}
                        <button
                            onClick={handleStepUp}
                            disabled={pitchShift >= MAX_PITCH}
                            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all
                                ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}
                                disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                            <svg width="16" height="16">
                                <rect x="7" y="0" width="2" height="16" rx="1" fill={isDark ? '#fff' : '#333'} />
                                <rect x="0" y="7" width="16" height="2" rx="1" fill={isDark ? '#fff' : '#333'} />
                            </svg>
                        </button>
                    </div>

                    {/* Restore Button */}
                    <button
                        onClick={handleRestore}
                        disabled={pitchShift === 0}
                        className={`w-full py-2 px-3 rounded-md text-xs font-medium transition-all
                            ${pitchShift === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}
                            ${isDark ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}
                    >
                        Restore original tuning
                    </button>

                    {/* Keyboard Hint */}
                    <p className={`text-[10px] text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Use ↑↓ keys • Press 0 to reset
                    </p>
                </div>
            )}
        </>
    );
};

export default TuningOverlay;
