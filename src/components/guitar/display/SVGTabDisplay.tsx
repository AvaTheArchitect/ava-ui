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

    // Tab display constants
    const stringSpacing = 40;
    const measureWidth = 200;
    const startX = 80;
    const startY = 80;
    const stringCount = 6;

    // Generate SVG note positions
    useEffect(() => {
        const notes: SVGNote[] = [];

        measures.forEach((measure, measureIndex) => {
            const measureStartX = startX + (measureIndex * measureWidth);

            measure.notes.forEach((note, noteIndex) => {
                const noteX = measureStartX + (noteIndex * 30); // Spacing between notes
                const stringY = startY + (note.string * stringSpacing);

                notes.push({
                    x: noteX,
                    y: stringY,
                    fret: note.fret,
                    string: note.string,
                    time: note.time || 0
                });
            });
        });

        setSvgNotes(notes);
    }, [measures]);

    // Update active notes based on playback time
    useEffect(() => {
        if (!state.isPlaying) {
            setActiveNotes(new Set());
            return;
        }

        const currentTime = state.currentTime;
        const tolerance = 0.2; // 200ms tolerance

        const activeSet = new Set<number>();

        svgNotes.forEach((note, index) => {
            if (Math.abs(note.time - currentTime) <= tolerance) {
                activeSet.add(index);
            }
        });

        setActiveNotes(activeSet);
    }, [state.currentTime, state.isPlaying, svgNotes]);

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

    // Render fret numbers
    const renderNotes = () => {
        return svgNotes.map((note, index) => {
            const isActive = activeNotes.has(index);

            return (
                <g key={`note-${index}`}>
                    {/* Note background circle */}
                    <circle
                        cx={note.x}
                        cy={note.y}
                        r="15"
                        fill={isActive ? "#ff6b35" : "#2563eb"}
                        stroke={isActive ? "#fff" : "#1e40af"}
                        strokeWidth="2"
                        className={isActive ? "animate-pulse" : ""}
                    />
                    {/* Fret number */}
                    <text
                        x={note.x}
                        y={note.y}
                        textAnchor="middle"
                        dy="6"
                        fontSize="14"
                        fontWeight="bold"
                        fill="white"
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

    // Render playback cursor
    const renderCursor = () => {
        if (!showCursor || !state.isPlaying) return null;

        const totalDuration = measures.length > 0 ? measures[measures.length - 1].endTime : 0;
        const progress = totalDuration > 0 ? state.currentTime / totalDuration : 0;
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
                    <span>SVG Display: v1.0</span>
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

                    {/* Notes */}
                    {renderNotes()}

                    {/* Playback cursor */}
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
                    Renders: 598
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