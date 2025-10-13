'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { TabMeasure } from '@/lib/tab-parsers/basicTabParser';

interface SVGTabDisplayProps {
    measures: TabMeasure[];
    songTitle: string;
    bpm: number;
    timeSignature: [number, number];
    showCursor?: boolean;
    width?: number;
    height?: number;
}

interface SVGNote {
    x: number;
    y: number;
    fret: number;
    string: number;
    time: number;
    isActive?: boolean;
}

const SVGTabDisplay: React.FC<SVGTabDisplayProps> = ({
    measures,
    songTitle,
    bpm,
    timeSignature,
    showCursor = true,
    width = 1200,
    height = 400
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state } = usePlaybackControls();
    const [svgNotes, setSvgNotes] = useState<SVGNote[]>([]);
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

    // 🔧 TIMING: Add calibration and debug state
    const [timingOffset, setTimingOffset] = useState<number>(0);
    const [timingMultiplier, setTimingMultiplier] = useState<number>(1);
    const [debugTimingMode, setDebugTimingMode] = useState<boolean>(false);

    // Tab display constants
    const stringSpacing = 40;
    const measureWidth = 200;
    const startX = 80;
    const startY = 80;
    const stringCount = 6;

    // 🔧 SMART TIMING: Analyze and adjust timing based on actual song structure
    const analyzeTimingPattern = () => {
        if (measures.length === 0) return { offset: 0, multiplier: 1 };

        // Calculate expected vs actual timing based on BPM
        const expectedMeasureDuration = (60 / bpm) * 4; // 4 beats per measure
        const actualFirstMeasureDuration = measures[0]?.endTime - measures[0]?.startTime;

        const calculatedMultiplier = actualFirstMeasureDuration > 0
            ? expectedMeasureDuration / actualFirstMeasureDuration
            : 1;

        // Detect if this is a lead guitar (fewer notes, more complex timing) vs rhythm (more regular)
        const totalNotes = measures.reduce((sum, m) => sum + m.notes.length, 0);
        const avgNotesPerMeasure = totalNotes / measures.length;

        // Lead guitar adjustment (fewer notes, different timing)
        const isLeadGuitar = avgNotesPerMeasure < 8;
        const leadOffset = isLeadGuitar ? 0.2 : 0; // 200ms offset for lead parts

        console.log('🎯 Timing Analysis:', {
            expectedMeasureDuration,
            actualFirstMeasureDuration,
            calculatedMultiplier,
            avgNotesPerMeasure,
            isLeadGuitar,
            leadOffset
        });

        return {
            offset: leadOffset,
            multiplier: calculatedMultiplier
        };
    };

    // Generate SVG note positions with improved timing
    useEffect(() => {
        const notes: SVGNote[] = [];

        // Analyze timing pattern
        const { offset, multiplier } = analyzeTimingPattern();
        setTimingOffset(offset);
        setTimingMultiplier(multiplier);

        measures.forEach((measure, measureIndex) => {
            const measureStartX = startX + (measureIndex * measureWidth);

            measure.notes.forEach((note, noteIndex) => {
                const noteX = measureStartX + (noteIndex * 30);
                const stringY = startY + (note.string * stringSpacing);

                // 🔧 CALIBRATED: Adjust note timing
                const adjustedTime = (note.time || 0) * multiplier + offset;

                notes.push({
                    x: noteX,
                    y: stringY,
                    fret: note.fret,
                    string: note.string,
                    time: adjustedTime
                });
            });
        });

        setSvgNotes(notes);
        console.log('🎸 SVG Notes with CALIBRATED timing:', {
            totalNotes: notes.length,
            timingOffset: offset,
            timingMultiplier: multiplier,
            firstFewTimes: notes.slice(0, 5).map(n => n.time.toFixed(2)),
            lastFewTimes: notes.slice(-5).map(n => n.time.toFixed(2))
        });
    }, [measures, bpm]);

    // 🔧 ADVANCED: Update active notes with multiple strategies
    useEffect(() => {
        if (!state.isPlaying || svgNotes.length === 0) {
            setActiveNotes(new Set());
            return;
        }

        const currentTime = state.currentTime;
        const activeSet = new Set<number>();

        // 🎯 Strategy 1: Time-based highlighting with adaptive tolerance
        const baseTolerance = 0.4; // 400ms base tolerance
        const adaptiveTolerance = baseTolerance * timingMultiplier; // Adjust based on timing analysis

        svgNotes.forEach((note, index) => {
            const timeDiff = Math.abs(note.time - currentTime);

            // Current note highlighting
            if (timeDiff <= adaptiveTolerance) {
                activeSet.add(index);
            }

            // Upcoming note highlighting (show notes that are about to play)
            const timeUntilNote = note.time - currentTime;
            if (timeUntilNote > 0 && timeUntilNote <= 0.8) {
                activeSet.add(index);
            }
        });

        // 🎯 Strategy 2: Position-based highlighting (fallback)
        if (activeSet.size === 0) {
            // Calculate position based on song progress
            const songProgress = state.duration > 0 ? currentTime / state.duration : 0;
            const estimatedNoteIndex = Math.floor(songProgress * svgNotes.length);

            // Highlight a few notes around the estimated position
            for (let i = Math.max(0, estimatedNoteIndex - 2);
                i <= Math.min(svgNotes.length - 1, estimatedNoteIndex + 2);
                i++) {
                activeSet.add(i);
            }
        }

        // Debug logging for timing sync
        if (debugTimingMode && activeSet.size > 0) {
            const activeNoteDetails = Array.from(activeSet).map(i => ({
                index: i,
                fret: svgNotes[i].fret,
                noteTime: svgNotes[i].time.toFixed(2),
                timeDiff: (svgNotes[i].time - currentTime).toFixed(2)
            }));

            console.log('🎯 ADVANCED Active notes at', currentTime.toFixed(2) + 's:', {
                activeCount: activeSet.size,
                tolerance: adaptiveTolerance.toFixed(2),
                details: activeNoteDetails
            });
        }

        setActiveNotes(activeSet);
    }, [state.currentTime, state.isPlaying, svgNotes, timingMultiplier, debugTimingMode, state.duration]);

    // Render string lines
    const renderStrings = () => {
        const strings = [];
        for (let i = 0; i < stringCount; i++) {
            const y = startY + (i * stringSpacing);
            strings.push(
                <line
                    key={`string-${i}`}
                    x1={startX - 20}
                    y1={y}
                    x2={width - 40}
                    y2={y}
                    stroke="#444"
                    strokeWidth="2"
                />
            );
        }
        return strings;
    };

    // Render measure dividers
    const renderMeasures = () => {
        const dividers = [];
        for (let i = 0; i <= measures.length; i++) {
            const x = startX + (i * measureWidth);
            dividers.push(
                <line
                    key={`measure-${i}`}
                    x1={x - 20}
                    y1={startY - 20}
                    x2={x - 20}
                    y2={startY + (stringCount - 1) * stringSpacing + 20}
                    stroke="#666"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                />
            );
        }
        return dividers;
    };

    // 🔧 ENHANCED: Render fret numbers with better visual feedback
    const renderNotes = () => {
        return svgNotes.map((note, index) => {
            const isActive = activeNotes.has(index);

            return (
                <g key={`note-${index}`}>
                    {/* Note background circle with enhanced styling */}
                    <circle
                        cx={note.x}
                        cy={note.y}
                        r="15"
                        fill={isActive ? "#ff6b35" : "#2563eb"}
                        stroke={isActive ? "#fff" : "#1e40af"}
                        strokeWidth={isActive ? "3" : "2"}
                        className={isActive ? "animate-pulse" : ""}
                        style={{
                            filter: isActive
                                ? 'drop-shadow(0 0 12px #ff6b35) drop-shadow(0 0 6px #ff6b35)'
                                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            transition: 'all 0.15s ease-in-out'
                        }}
                    />
                    {/* Fret number */}
                    <text
                        x={note.x}
                        y={note.y}
                        textAnchor="middle"
                        dy="6"
                        fontSize={isActive ? "16" : "14"}
                        fontWeight="bold"
                        fill="white"
                        style={{
                            textShadow: isActive
                                ? '2px 2px 4px rgba(0,0,0,0.9)'
                                : '1px 1px 2px rgba(0,0,0,0.8)',
                            transition: 'all 0.15s ease-in-out'
                        }}
                    >
                        {note.fret}
                    </text>
                </g>
            );
        });
    };

    // Render string labels
    const renderStringLabels = () => {
        const stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];
        return stringNames.map((name, index) => (
            <text
                key={`label-${index}`}
                x={startX - 40}
                y={startY + (index * stringSpacing) + 6}
                fontSize="16"
                fontWeight="bold"
                fill="#888"
                textAnchor="middle"
            >
                {name}
            </text>
        ));
    };

    // 🔧 SMOOTH: Render playback cursor with calibrated timing
    const renderCursor = () => {
        if (!showCursor || !state.isPlaying) return null;

        const totalDuration = measures.length > 0 ? measures[measures.length - 1].endTime * timingMultiplier + timingOffset : 0;
        const adjustedCurrentTime = state.currentTime;
        const progress = totalDuration > 0 ? adjustedCurrentTime / totalDuration : 0;
        const cursorX = startX + (progress * (measures.length * measureWidth)) - 20;

        return (
            <line
                x1={cursorX}
                y1={startY - 30}
                x2={cursorX}
                y2={startY + (stringCount - 1) * stringSpacing + 30}
                stroke="#ff6b35"
                strokeWidth="3"
                className="drop-shadow-lg"
                style={{
                    filter: 'drop-shadow(0 0 8px #ff6b35)'
                }}
            >
                <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </line>
        );
    };

    return (
        <div className="bg-gray-800/80 rounded-xl p-6 border border-blue-500/30">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-400">
                    🎸 {songTitle}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>♩ = {bpm} BPM</span>
                    <span>{timeSignature[0]}/{timeSignature[1]} Time</span>
                    <span>SVG Display: v3.0 CALIBRATED</span>
                </div>
            </div>

            {/* 🔧 ADVANCED DEBUG INFO */}
            <div className="bg-orange-500/20 rounded p-3 mb-4 text-orange-200 text-xs">
                <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-orange-400">🎯 Timing Calibration Debug</div>
                    <button
                        onClick={() => setDebugTimingMode(!debugTimingMode)}
                        className="px-2 py-1 bg-orange-500/30 rounded text-orange-300 hover:bg-orange-500/40"
                    >
                        Debug: {debugTimingMode ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>Notes: {svgNotes.length}</div>
                    <div>Active: {activeNotes.size}</div>
                    <div>Offset: {timingOffset.toFixed(2)}s</div>
                    <div>Multiplier: {timingMultiplier.toFixed(2)}x</div>
                    <div>Playing: {state.isPlaying ? 'Yes' : 'No'}</div>
                    <div>Time: {state.currentTime.toFixed(2)}s</div>
                    <div>Duration: {state.duration.toFixed(1)}s</div>
                    <div>Progress: {((state.currentTime / state.duration) * 100).toFixed(1)}%</div>
                </div>
                {activeNotes.size > 0 && (
                    <div className="mt-1">
                        Active Frets: {Array.from(activeNotes).map(i => svgNotes[i]?.fret).join(', ')}
                    </div>
                )}

                {/* Manual Timing Adjustment Controls */}
                <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                        onClick={() => setTimingOffset(prev => prev - 0.1)}
                        className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                    >
                        Offset -0.1s
                    </button>
                    <button
                        onClick={() => setTimingOffset(prev => prev + 0.1)}
                        className="px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30"
                    >
                        Offset +0.1s
                    </button>
                    <button
                        onClick={() => setTimingMultiplier(prev => prev - 0.1)}
                        className="px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                    >
                        Speed -0.1x
                    </button>
                    <button
                        onClick={() => setTimingMultiplier(prev => prev + 0.1)}
                        className="px-2 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30"
                    >
                        Speed +0.1x
                    </button>
                    <button
                        onClick={() => {
                            setTimingOffset(0);
                            setTimingMultiplier(1);
                        }}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 overflow-x-auto">
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    className="bg-gray-900/80 rounded"
                    style={{ minWidth: `${measures.length * measureWidth + 160}px` }}
                >
                    {/* Background */}
                    <rect width="100%" height="100%" fill="#1a1a1a" />

                    {/* Grid lines */}
                    {renderStrings()}
                    {renderMeasures()}

                    {/* String labels */}
                    {renderStringLabels()}

                    {/* Notes with calibrated timing */}
                    {renderNotes()}

                    {/* Playback cursor with calibrated timing */}
                    {renderCursor()}

                    {/* Measure numbers */}
                    {measures.map((_, index) => (
                        <text
                            key={`measure-num-${index}`}
                            x={startX + (index * measureWidth) + 80}
                            y={startY - 30}
                            fontSize="12"
                            fill="#666"
                            textAnchor="middle"
                        >
                            M{index + 1}
                        </text>
                    ))}
                </svg>
            </div>

            <div className="mt-4 flex justify-between items-center text-sm">
                <div className="text-gray-400">
                    Measures: {measures.length} |
                    Notes: {svgNotes.length} |
                    Active: {activeNotes.size} |
                    Calibrated: ✅
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-400">Notes</span>
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-orange-400">Playing</span>
                </div>
            </div>
        </div>
    );
};

export default SVGTabDisplay;