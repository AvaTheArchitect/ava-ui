'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';

// 🎸 Tab Data Interfaces
interface TabNote {
    fret: number;
    string: number; // 0-5 (E,A,D,G,B,E)
    time: number;   // Time in seconds
    duration?: number;
}

interface TabMeasure {
    id: string;
    timeSignature: [number, number];
    notes: TabNote[];
    startTime: number;
    endTime: number;
}

interface SVGTabDisplayProps {
    measures?: TabMeasure[];
    songTitle?: string;
    bpm?: number;
    timeSignature?: [number, number];
    showCursor?: boolean;
}

// 🎸 Sample song data for testing
const SAMPLE_SONG: TabMeasure[] = [
    {
        id: "measure1",
        timeSignature: [4, 4],
        startTime: 0,
        endTime: 2,
        notes: [
            { fret: 0, string: 5, time: 0.0 },    // E string open
            { fret: 2, string: 5, time: 0.5 },    // E string 2nd fret
            { fret: 3, string: 5, time: 1.0 },    // E string 3rd fret
            { fret: 5, string: 5, time: 1.5 },    // E string 5th fret
        ]
    },
    {
        id: "measure2",
        timeSignature: [4, 4],
        startTime: 2,
        endTime: 4,
        notes: [
            { fret: 7, string: 5, time: 2.0 },    // E string 7th fret
            { fret: 5, string: 5, time: 2.5 },    // E string 5th fret
            { fret: 3, string: 5, time: 3.0 },    // E string 3rd fret
            { fret: 2, string: 5, time: 3.5 },    // E string 2nd fret
        ]
    },
    {
        id: "measure3",
        timeSignature: [4, 4],
        startTime: 4,
        endTime: 6,
        notes: [
            { fret: 0, string: 4, time: 4.0 },    // A string open
            { fret: 3, string: 4, time: 4.5 },    // A string 3rd fret
            { fret: 5, string: 4, time: 5.0 },    // A string 5th fret
            { fret: 7, string: 4, time: 5.5 },    // A string 7th fret
        ]
    },
    {
        id: "measure4",
        timeSignature: [4, 4],
        startTime: 6,
        endTime: 8,
        notes: [
            { fret: 12, string: 5, time: 6.0 },   // E string 12th fret
            { fret: 10, string: 5, time: 6.5 },   // E string 10th fret
            { fret: 8, string: 5, time: 7.0 },    // E string 8th fret
            { fret: 5, string: 5, time: 7.5 },    // E string 5th fret
        ]
    }
];

const SVGTabDisplay: React.FC<SVGTabDisplayProps> = memo(({
    measures = SAMPLE_SONG,
    songTitle = "Test Song - SVG Display",
    bpm = 120,
    timeSignature = [4, 4],
    showCursor = true
}) => {
    const { state } = usePlaybackControls();
    const renderCount = useRef(0);

    // SVG Dimensions
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 200;
    const STRING_SPACING = 25;
    const MEASURE_WIDTH = 200;

    // String positions (top to bottom: E,B,G,D,A,E)
    const STRING_Y_POSITIONS = [40, 65, 90, 115, 140, 165];
    const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];

    // 🔄 Track renders
    useEffect(() => {
        renderCount.current += 1;
        if (renderCount.current % 50 === 0) { // Log every 50 renders
            console.log(`🎸 SVG TabDisplay render #${renderCount.current}`);
        }
    });

    // 🎯 Calculate cursor position based on current time
    const calculateCursorX = (currentTime: number): number => {
        if (!measures.length) return 0;

        const totalDuration = measures[measures.length - 1].endTime;
        const progress = currentTime / totalDuration;
        return progress * (measures.length * MEASURE_WIDTH);
    };

    // 🎵 Render string lines
    const renderStringLines = () => {
        return STRING_Y_POSITIONS.map((y, index) => (
            <g key={`string-${index}`}>
                {/* String line */}
                <line
                    x1={50}
                    y1={y}
                    x2={SVG_WIDTH - 50}
                    y2={y}
                    stroke="#4a5568"
                    strokeWidth="1"
                />
                {/* String label */}
                <text
                    x={30}
                    y={y + 5}
                    fill="#9ca3af"
                    fontSize="14"
                    fontFamily="mono"
                    textAnchor="middle"
                >
                    {STRING_NAMES[index]}
                </text>
            </g>
        ));
    };

    // 🎵 Render measure markers
    const renderMeasures = () => {
        return measures.map((measure, index) => {
            const x = 50 + (index * MEASURE_WIDTH);

            return (
                <g key={measure.id}>
                    {/* Measure line */}
                    <line
                        x1={x}
                        y1={30}
                        x2={x}
                        y2={175}
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                    />
                    {/* Measure number */}
                    <text
                        x={x + MEASURE_WIDTH / 2}
                        y={25}
                        fill="#6366f1"
                        fontSize="12"
                        fontFamily="mono"
                        textAnchor="middle"
                        fontWeight="bold"
                    >
                        M{index + 1}
                    </text>
                </g>
            );
        });
    };

    // 🎵 Render notes
    const renderNotes = () => {
        const allNotes: JSX.Element[] = [];

        measures.forEach((measure, measureIndex) => {
            const measureStartX = 50 + (measureIndex * MEASURE_WIDTH);

            measure.notes.forEach((note, noteIndex) => {
                // Calculate note position within measure
                const noteProgressInMeasure = (note.time - measure.startTime) / (measure.endTime - measure.startTime);
                const noteX = measureStartX + (noteProgressInMeasure * MEASURE_WIDTH);
                const noteY = STRING_Y_POSITIONS[note.string];

                // Determine if note is currently playing
                const isActive = state.isPlaying &&
                    state.currentTime >= note.time &&
                    state.currentTime <= note.time + 0.5; // 0.5s note duration

                allNotes.push(
                    <g key={`${measure.id}-note-${noteIndex}`}>
                        {/* Note circle */}
                        <circle
                            cx={noteX}
                            cy={noteY}
                            r="8"
                            fill={isActive ? "#f97316" : "#1f2937"}
                            stroke={isActive ? "#ea580c" : "#374151"}
                            strokeWidth="2"
                        />
                        {/* Fret number */}
                        <text
                            x={noteX}
                            y={noteY + 4}
                            fill={isActive ? "white" : "#9ca3af"}
                            fontSize="11"
                            fontFamily="mono"
                            textAnchor="middle"
                            fontWeight="bold"
                        >
                            {note.fret}
                        </text>
                    </g>
                );
            });
        });

        return allNotes;
    };

    // 🎯 Render playback cursor
    const renderCursor = () => {
        if (!showCursor || !state.isPlaying) return null;

        const cursorX = 50 + calculateCursorX(state.currentTime);

        return (
            <g>
                {/* Cursor line */}
                <line
                    x1={cursorX}
                    y1={30}
                    x2={cursorX}
                    y2={175}
                    stroke="#f97316"
                    strokeWidth="3"
                    style={{
                        filter: 'drop-shadow(0 0 6px #f97316)',
                    }}
                />
                {/* Cursor head */}
                <polygon
                    points={`${cursorX - 6},30 ${cursorX + 6},30 ${cursorX},20`}
                    fill="#f97316"
                />
                {/* Cursor tail */}
                <polygon
                    points={`${cursorX - 6},175 ${cursorX + 6},175 ${cursorX},185`}
                    fill="#f97316"
                />
            </g>
        );
    };

    return (
        <div className="w-full bg-gray-900 rounded-xl p-6 border border-orange-500/30">
            {/* Header */}
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-orange-400 mb-2">
                    🎸 {songTitle}
                </h2>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                    <span>♩ = {bpm} BPM</span>
                    <span>{timeSignature[0]}/{timeSignature[1]} Time</span>
                    <span>SVG Display</span>
                    <span className="text-cyan-400">Renders: {renderCount.current}</span>
                </div>
            </div>

            {/* SVG Tab Display */}
            <div className="bg-white rounded-lg p-4 overflow-x-auto">
                <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className="w-full h-auto"
                >
                    {/* Background */}
                    <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="white" />

                    {/* String lines */}
                    {renderStringLines()}

                    {/* Measure markers */}
                    {renderMeasures()}

                    {/* Notes */}
                    {renderNotes()}

                    {/* Playback cursor */}
                    {renderCursor()}
                </svg>
            </div>

            {/* Status */}
            <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center gap-4">
                    <span>Measures: {measures.length}</span>
                    <span>Notes: {measures.reduce((total, m) => total + m.notes.length, 0)}</span>
                    <span>Duration: {measures[measures.length - 1]?.endTime.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-${state.isPlaying ? 'orange' : 'gray'}-400`}>
                        {state.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                    </span>
                    <span className="text-orange-400 font-mono">SVG v1.0</span>
                </div>
            </div>
        </div>
    );
});

SVGTabDisplay.displayName = 'SVGTabDisplay';

export default SVGTabDisplay;