'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';

// 🎸 TabCursor Props Interface - FIXED INFINITE LOOP
interface TabCursorProps {
    /** Container element containing the tab display */
    tabContainer?: HTMLElement | null;
    /** Beats per minute for timing calculations */
    bpm?: number;
    /** Time signature (e.g., [4, 4] for 4/4 time) */
    timeSignature?: [number, number];
    /** Custom cursor color */
    cursorColor?: string;
    /** Cursor width in pixels */
    cursorWidth?: number;
    /** Whether to show beat markers */
    showBeatMarkers?: boolean;
    /** Custom styling classes */
    className?: string;
    /** Callback when cursor position changes */
    onPositionChange?: (position: number, beat: number) => void;
    /** Whether cursor is enabled */
    enabled?: boolean;
}

// 🎸 Beat Marker Interface
interface BeatMarker {
    position: number;
    beat: number;
    measure: number;
    time: number;
}

// 🎸 FIXED TabCursor Component - No Infinite Loop
export const TabCursor: React.FC<TabCursorProps> = ({
    tabContainer,
    bpm = 120,
    timeSignature = [4, 4],
    cursorColor = '#f97316', // orange-500
    cursorWidth = 4,
    showBeatMarkers = true,
    className = '',
    onPositionChange,
    enabled = true,
}) => {
    // 🎣 Hook connection
    const { state } = usePlaybackControls();

    // 🎯 State
    const [cursorPosition, setCursorPosition] = useState(0);
    const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);
    const [tabWidth, setTabWidth] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    // 🎯 Refs
    const cursorRef = useRef<HTMLDivElement>(null);
    const lastTimeRef = useRef<number>(0); // ✅ Prevent unnecessary updates

    // 🎵 Calculate cursor position
    const calculateCursorPosition = useCallback((audioTime: number) => {
        if (!tabContainer || !enabled || tabWidth === 0) return 0;

        const duration = state.duration || 240;
        const progressPercent = duration > 0 ? (audioTime / duration) : 0;
        const position = progressPercent * tabWidth;

        return Math.max(0, Math.min(position, tabWidth));
    }, [tabContainer, tabWidth, enabled, state.duration]);

    // 🎵 Generate beat markers
    const generateBeatMarkers = useCallback(() => {
        if (!tabContainer || !showBeatMarkers || tabWidth === 0) return [];

        const secondsPerBeat = 60 / bpm;
        const beatsPerMeasure = timeSignature[0];
        const duration = state.duration || 240;
        const totalBeats = Math.ceil(duration / secondsPerBeat);
        const markers: BeatMarker[] = [];

        for (let beat = 0; beat < totalBeats; beat += beatsPerMeasure) {
            const time = beat * secondsPerBeat;
            const position = (time / duration) * tabWidth;
            const measure = Math.floor(beat / beatsPerMeasure) + 1;

            if (position <= tabWidth && time <= duration) {
                markers.push({
                    position,
                    beat: 1,
                    measure,
                    time,
                });
            }
        }

        console.log(`🎵 Generated ${markers.length} beat markers for ${tabWidth}px width, ${duration.toFixed(1)}s duration`);
        return markers;
    }, [tabContainer, showBeatMarkers, tabWidth, state.duration, bpm, timeSignature]);

    // 🔄 Update tab container dimensions
    const updateTabDimensions = useCallback(() => {
        if (tabContainer) {
            const rect = tabContainer.getBoundingClientRect();
            const newWidth = rect.width;
            if (newWidth !== tabWidth && newWidth > 0) {
                setTabWidth(newWidth);
                console.log(`📏 TabCursor: Tab width updated to ${newWidth}px`);
            }
        }
    }, [tabContainer, tabWidth]);

    // 🎯 Initialize beat markers when tab width changes
    useEffect(() => {
        if (tabWidth > 0) {
            setBeatMarkers(generateBeatMarkers());
        }
    }, [tabWidth, generateBeatMarkers]);

    // 🎯 FIXED: Cursor position update - prevent infinite loop
    useEffect(() => {
        if (enabled && tabWidth > 0) {
            // ✅ Only update if time actually changed significantly
            const timeDiff = Math.abs(state.currentTime - lastTimeRef.current);
            if (timeDiff > 0.05) { // Only update if time changed by more than 50ms
                const newPosition = calculateCursorPosition(state.currentTime);
                setCursorPosition(newPosition);
                setIsVisible(state.isPlaying);

                // Calculate current beat for callback
                const secondsPerBeat = 60 / bpm;
                const currentBeat = Math.floor(state.currentTime / secondsPerBeat) + 1;

                onPositionChange?.(newPosition, currentBeat);

                // Update last time
                lastTimeRef.current = state.currentTime;

                // Debug logging (throttled)
                if (state.isPlaying && timeDiff > 0.5) {
                    console.log(`🎯 Cursor: ${state.currentTime.toFixed(1)}s → ${newPosition.toFixed(0)}px (${((newPosition / tabWidth) * 100).toFixed(1)}%)`);
                }
            }
        }
    }, [state.currentTime, state.isPlaying, enabled, tabWidth, calculateCursorPosition, bpm, onPositionChange]);

    // 🎯 Update dimensions on tab container change
    useEffect(() => {
        if (tabContainer) {
            updateTabDimensions();

            const resizeObserver = new ResizeObserver(updateTabDimensions);
            resizeObserver.observe(tabContainer);

            return () => resizeObserver.disconnect();
        }
    }, [tabContainer, updateTabDimensions]);

    // 🎯 Handle window resize
    useEffect(() => {
        const handleResize = () => updateTabDimensions();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateTabDimensions]);

    // ✅ Error handling
    if (!enabled) {
        return null;
    }

    if (!tabContainer) {
        return (
            <div className="absolute top-2 left-2 bg-red-500/20 rounded px-2 py-1">
                <span className="text-xs text-red-400">⚠️ TabCursor: No container</span>
            </div>
        );
    }

    if (tabWidth === 0) {
        return (
            <div className="absolute top-2 left-2 bg-yellow-500/20 rounded px-2 py-1">
                <span className="text-xs text-yellow-400">📏 TabCursor: Measuring...</span>
            </div>
        );
    }

    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            {/* 🎵 Beat Markers */}
            {showBeatMarkers && beatMarkers.map((marker, index) => (
                <div
                    key={index}
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{
                        left: `${marker.position}px`,
                        width: '2px',
                        backgroundColor: '#3b82f6',
                        opacity: 0.6,
                        zIndex: 10,
                    }}
                >
                    <div
                        className="absolute text-xs font-mono font-bold"
                        style={{
                            top: '-28px',
                            left: '-8px',
                            color: '#3b82f6',
                            fontSize: '11px',
                            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '4px',
                            padding: '1px 4px',
                        }}
                    >
                        M{marker.measure}
                    </div>
                </div>
            ))}

            {/* 🎯 Main Cursor */}
            <div
                ref={cursorRef}
                className={`absolute top-0 bottom-0 pointer-events-none transition-opacity duration-200 ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                    left: `${cursorPosition}px`,
                    width: `${cursorWidth}px`,
                    backgroundColor: cursorColor,
                    zIndex: 30,
                    boxShadow: `0 0 16px ${cursorColor}80, 0 0 8px ${cursorColor}60`,
                    transform: 'translateX(-50%)',
                    borderRadius: '2px',
                }}
            >
                {/* Cursor Head */}
                <div
                    className="absolute"
                    style={{
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: `14px solid ${cursorColor}`,
                        filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                    }}
                />

                {/* Cursor Tail */}
                <div
                    className="absolute"
                    style={{
                        bottom: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderBottom: `14px solid ${cursorColor}`,
                        filter: 'drop-shadow(0 -3px 6px rgba(0,0,0,0.4))',
                    }}
                />
            </div>

            {/* Audio State Indicator */}
            {state.isPlaying && (
                <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/80 rounded-lg px-3 py-2 backdrop-blur-sm border border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-mono font-bold">
                        {state.currentTime.toFixed(1)}s
                    </span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-blue-400 font-mono">
                        {state.duration.toFixed(0)}s
                    </span>
                </div>
            )}

            {/* Fixed Position Info */}
            <div className="absolute bottom-2 left-2 bg-black/80 rounded-lg px-3 py-2 backdrop-blur-sm border border-cyan-500/30">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-cyan-400 font-mono">
                        Pos: {cursorPosition.toFixed(0)}px
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-cyan-400 font-mono">
                        {((cursorPosition / tabWidth) * 100).toFixed(1)}%
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-green-400 font-mono">
                        {beatMarkers.length}M
                    </span>
                </div>
            </div>

            {/* Working Status */}
            <div className="absolute bottom-2 right-2 bg-green-500/20 rounded-lg px-3 py-2 backdrop-blur-sm border border-green-500/30">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-bold">
                        WORKING
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TabCursor;