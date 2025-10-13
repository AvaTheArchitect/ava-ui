'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { TabMeasure } from '@/lib/tab-parsers/basicTabParser';

interface HorizontalTabDisplayProps {
    measures: TabMeasure[];
    songTitle: string;
    artist?: string;
    bpm: number;
    timeSignature: [number, number];
    showCursor?: boolean;
    measuresPerLine?: number;
    width?: number;
}

const HorizontalTabDisplay: React.FC<HorizontalTabDisplayProps> = ({
    measures,
    songTitle,
    artist = '',
    bpm,
    timeSignature,
    showCursor = true,
    measuresPerLine = 4,
    width = 1200
}) => {
    const { state } = usePlaybackControls();
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

    // Tab display constants
    const stringSpacing = 35;
    const measureWidth = 280;
    const startX = 60;
    const startY = 80;
    const stringCount = 6;
    const stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];
    const systemHeight = 250;

    // Group measures into systems (lines)
    const systems: TabMeasure[][] = [];
    for (let i = 0; i < measures.length; i += measuresPerLine) {
        systems.push(measures.slice(i, i + measuresPerLine));
    }

    // Update active notes based on playback
    useEffect(() => {
        if (!state.isPlaying) {
            setActiveNotes(new Set());
            return;
        }

        const currentTime = state.currentTime;
        const tolerance = 0.15;
        const activeSet = new Set<string>();

        measures.forEach((measure, mIdx) => {
            measure.notes.forEach((note, nIdx) => {
                if (Math.abs(note.time - currentTime) <= tolerance) {
                    activeSet.add(`${mIdx}-${nIdx}`);
                }
            });
        });

        setActiveNotes(activeSet);
    }, [state.currentTime, state.isPlaying, measures]);

    // Render a single system (row of measures)
    const renderSystem = (systemMeasures: TabMeasure[], systemIndex: number) => {
        const svgHeight = stringCount * stringSpacing + 100;

        return (
            <svg
                key={systemIndex}
                width={width}
                height={svgHeight}
                className="bg-white"
                style={{ marginBottom: '40px' }}
            >
                {/* System background */}
                <rect width={width} height={svgHeight} fill="#ffffff" />

                {/* Horizontal string lines across entire system */}
                {stringNames.map((stringName, stringIdx) => {
                    const y = startY + (stringIdx * stringSpacing);
                    return (
                        <g key={`string-${stringIdx}`}>
                            {/* String label */}
                            <text
                                x={startX - 35}
                                y={y + 5}
                                fontSize="14"
                                fontWeight="bold"
                                fill="#666"
                                textAnchor="middle"
                            >
                                {stringName}
                            </text>
                            {/* String line */}
                            <line
                                x1={startX}
                                y1={y}
                                x2={startX + (systemMeasures.length * measureWidth)}
                                y2={y}
                                stroke="#888"
                                strokeWidth="1.5"
                            />
                        </g>
                    );
                })}

                {/* Measure dividers */}
                {systemMeasures.map((_, mIdx) => {
                    const x = startX + (mIdx * measureWidth);
                    return (
                        <g key={`divider-${mIdx}`}>
                            <line
                                x1={x}
                                y1={startY - 10}
                                x2={x}
                                y2={startY + (stringCount - 1) * stringSpacing + 10}
                                stroke="#ccc"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                            />
                            {/* Measure number */}
                            <text
                                x={x + 10}
                                y={startY - 20}
                                fontSize="12"
                                fill="#999"
                                fontWeight="600"
                            >
                                M{systemIndex * measuresPerLine + mIdx + 1}
                            </text>
                        </g>
                    );
                })}

                {/* End line */}
                <line
                    x1={startX + (systemMeasures.length * measureWidth)}
                    y1={startY - 10}
                    x2={startX + (systemMeasures.length * measureWidth)}
                    y2={startY + (stringCount - 1) * stringSpacing + 10}
                    stroke="#444"
                    strokeWidth="2"
                />

                {/* Render notes for all measures in this system */}
                {systemMeasures.map((measure, mIdx) => {
                    const measureStartX = startX + (mIdx * measureWidth);
                    const globalMeasureIdx = systemIndex * measuresPerLine + mIdx;

                    return measure.notes.map((note, nIdx) => {
                        // Calculate note position within measure
                        const noteProgress = measure.notes.length > 1
                            ? nIdx / (measure.notes.length - 1)
                            : 0.5;
                        const noteX = measureStartX + (noteProgress * measureWidth * 0.85) + 20;
                        const noteY = startY + ((note.string - 1) * stringSpacing);

                        const isActive = activeNotes.has(`${globalMeasureIdx}-${nIdx}`);

                        return (
                            <g key={`note-${globalMeasureIdx}-${nIdx}`}>
                                {/* Note circle background */}
                                <circle
                                    cx={noteX}
                                    cy={noteY}
                                    r="13"
                                    fill={isActive ? '#ff6b35' : '#2563eb'}
                                    stroke={isActive ? '#fff' : '#1e40af'}
                                    strokeWidth="2"
                                    className={isActive ? 'animate-pulse' : ''}
                                />
                                {/* Fret number */}
                                <text
                                    x={noteX}
                                    y={noteY + 5}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="bold"
                                    fill="white"
                                >
                                    {note.fret}
                                </text>
                            </g>
                        );
                    });
                })}

                {/* Playback cursor for this system */}
                {showCursor && state.isPlaying && (() => {
                    const currentTime = state.currentTime;

                    // Check if cursor is in this system
                    const systemStartTime = systemMeasures[0]?.startTime || 0;
                    const systemEndTime = systemMeasures[systemMeasures.length - 1]?.endTime || 0;

                    if (currentTime >= systemStartTime && currentTime <= systemEndTime) {
                        const systemProgress = (currentTime - systemStartTime) / (systemEndTime - systemStartTime);
                        const cursorX = startX + (systemProgress * systemMeasures.length * measureWidth);

                        return (
                            <line
                                x1={cursorX}
                                y1={startY - 20}
                                x2={cursorX}
                                y2={startY + (stringCount - 1) * stringSpacing + 20}
                                stroke="#ff6b35"
                                strokeWidth="3"
                                opacity="0.8"
                                filter="drop-shadow(0 0 8px #ff6b35)"
                            />
                        );
                    }
                    return null;
                })()}
            </svg>
        );
    };

    return (
        <div className="bg-gray-800/80 rounded-xl p-6 border border-blue-500/30">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-blue-400">
                        {songTitle}
                    </h2>
                    {artist && <p className="text-gray-300 text-lg">{artist}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span>♩ = {bpm} BPM</span>
                    <span>{timeSignature[0]}/{timeSignature[1]} Time</span>
                    <span>{measures.length} measures</span>
                </div>
            </div>

            {/* Scrollable tab area */}
            <div
                ref={containerRef}
                className="bg-white rounded-lg p-4 overflow-y-auto"
                style={{
                    maxHeight: '800px',
                    scrollBehavior: 'smooth'
                }}
            >
                {systems.map((systemMeasures, systemIndex) =>
                    renderSystem(systemMeasures, systemIndex)
                )}
            </div>

            {/* Footer stats */}
            <div className="mt-4 flex justify-between items-center text-sm">
                <div className="text-gray-400">
                    {systems.length} systems • {measures.length} measures •
                    {measures.reduce((total, m) => total + m.notes.length, 0)} notes
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-400">Notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className="text-orange-400">Playing</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HorizontalTabDisplay;