'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { TabMeasure } from '@/lib/tab-parsers/basicTabParser';

interface SVGUnifiedTabPlayerProps {
    measures: TabMeasure[];
    songTitle: string;
    bpm: number;
    timeSignature: [number, number];
    showCursor?: boolean;
    autoScroll?: boolean;
    width?: number;
    height?: number;
}

interface SVGTabNote {
    x: number;
    y: number;
    fret: number;
    string: number;
    time: number;
    measure: number;
    isActive?: boolean;
}

const SVGUnifiedTabPlayer: React.FC<SVGUnifiedTabPlayerProps> = ({
    measures,
    songTitle,
    bpm,
    timeSignature,
    showCursor = true,
    autoScroll = true,
    width = 1400,
    height = 350
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { state } = usePlaybackControls();

    const [svgNotes, setSvgNotes] = useState<SVGTabNote[]>([]);
    const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
    const [viewportX, setViewportX] = useState<number>(0);
    const [containerWidth, setContainerWidth] = useState<number>(width);

    // SVG Constants - fixed for proper width
    const stringSpacing = 45;
    const stringCount = 6;
    const stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];
    const measureWidth = 400; // Increased for better spacing
    const startX = 80;
    const startY = 50;
    const totalSvgWidth = Math.max(measures.length * measureWidth + 200, containerWidth * 3); // Ensure minimum width

    // Generate SVG note positions for horizontal layout
    useEffect(() => {
        const notes: SVGTabNote[] = [];

        measures.forEach((measure, measureIndex) => {
            const measureStartX = startX + (measureIndex * measureWidth);
            const notesInMeasure = measure.notes.length;
            const noteSpacing = notesInMeasure > 0 ? Math.min((measureWidth - 60) / notesInMeasure, 80) : 60;

            measure.notes.forEach((note, noteIndex) => {
                const noteX = measureStartX + 30 + (noteIndex * noteSpacing);
                const stringY = startY + (note.string * stringSpacing);

                notes.push({
                    x: noteX,
                    y: stringY,
                    fret: note.fret,
                    string: note.string,
                    time: note.time || 0,
                    measure: measureIndex
                });
            });
        });

        setSvgNotes(notes);
        console.log('SVG Unified notes generated:', {
            totalNotes: notes.length,
            totalWidth: totalSvgWidth,
            measures: measures.length
        });
    }, [measures, measureWidth, totalSvgWidth]);

    // Update container width
    useEffect(() => {
        if (containerRef.current) {
            const updateWidth = () => {
                const newWidth = containerRef.current?.clientWidth || width;
                setContainerWidth(newWidth);
            };

            updateWidth();
            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(containerRef.current);

            return () => resizeObserver.disconnect();
        }
    }, [width]);

    // Update active notes and auto-scroll viewport
    useEffect(() => {
        if (!state.isPlaying || svgNotes.length === 0) {
            setActiveNotes(new Set());
            return;
        }

        const currentTime = state.currentTime;
        const tolerance = 0.4;
        const activeSet = new Set<number>();

        // Find active notes
        svgNotes.forEach((note, index) => {
            const timeDiff = Math.abs(note.time - currentTime);
            if (timeDiff <= tolerance) {
                activeSet.add(index);
            }
        });

        setActiveNotes(activeSet);

        // Auto-scroll viewport
        if (autoScroll) {
            const progress = state.duration > 0 ? currentTime / state.duration : 0;
            const targetX = (progress * totalSvgWidth) - (containerWidth / 3);
            const clampedX = Math.max(0, Math.min(targetX, totalSvgWidth - containerWidth));
            setViewportX(clampedX);
        }
    }, [state.currentTime, state.isPlaying, state.duration, svgNotes, autoScroll, containerWidth, totalSvgWidth]);

    // Render measure backgrounds and dividers
    const renderMeasureBackgrounds = () => {
        const elements = [];

        for (let i = 0; i < measures.length; i++) {
            const x = startX + (i * measureWidth);
            const isEven = i % 2 === 0;

            // Measure background
            elements.push(
                <rect
                    key={`measure-bg-${i}`}
                    x={x - 20}
                    y={startY - 20}
                    width={measureWidth}
                    height={(stringCount - 1) * stringSpacing + 40}
                    fill={isEven ? '#1f2937' : '#374151'}
                    fillOpacity="0.3"
                />
            );

            // Measure divider
            elements.push(
                <line
                    key={`measure-div-${i}`}
                    x1={x - 20}
                    y1={startY - 20}
                    x2={x - 20}
                    y2={startY + (stringCount - 1) * stringSpacing + 20}
                    stroke="#6b7280"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.6"
                />
            );

            // Measure number
            elements.push(
                <text
                    key={`measure-num-${i}`}
                    x={x + 10}
                    y={startY - 25}
                    fontSize="12"
                    fill="#9ca3af"
                    fontFamily="monospace"
                    fontWeight="bold"
                >
                    {i + 1}
                </text>
            );
        }

        return elements;
    };

    // Render string lines with labels
    const renderStringLines = () => {
        const elements = [];

        for (let i = 0; i < stringCount; i++) {
            const y = startY + (i * stringSpacing);

            // String line
            elements.push(
                <line
                    key={`string-${i}`}
                    x1={startX - 30}
                    y1={y}
                    x2={totalSvgWidth - 50}
                    y2={y}
                    stroke={i === 0 || i === 5 ? "#9ca3af" : "#6b7280"} // E strings slightly different
                    strokeWidth="2"
                />
            );

            // String label
            elements.push(
                <g key={`string-label-${i}`}>
                    <circle
                        cx={startX - 50}
                        cy={y}
                        r="15"
                        fill="#1f2937"
                        stroke="#4b5563"
                        strokeWidth="2"
                    />
                    <text
                        x={startX - 50}
                        y={y}
                        textAnchor="middle"
                        dy="6"
                        fontSize="14"
                        fontWeight="bold"
                        fill="#e5e7eb"
                        fontFamily="monospace"
                    >
                        {stringNames[i]}
                    </text>
                </g>
            );
        }

        return elements;
    };

    // Render fret numbers - main content
    const renderFretNumbers = () => {
        return svgNotes.map((note, index) => {
            const isActive = activeNotes.has(index);

            return (
                <g key={`note-${index}`}>
                    {/* Note circle */}
                    <circle
                        cx={note.x}
                        cy={note.y}
                        r={isActive ? "18" : "15"}
                        fill={isActive ? "#f97316" : "#2563eb"}
                        stroke={isActive ? "#fed7aa" : "#3b82f6"}
                        strokeWidth={isActive ? "3" : "2"}
                        style={{
                            filter: isActive
                                ? 'drop-shadow(0 0 12px #f97316)'
                                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            transition: 'all 0.2s ease-in-out'
                        }}
                    />

                    {/* Fret number text */}
                    <text
                        x={note.x}
                        y={note.y}
                        textAnchor="middle"
                        dy="6"
                        fontSize={isActive ? "16" : "14"}
                        fontWeight="bold"
                        fill="white"
                        fontFamily="monospace"
                        style={{
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {note.fret}
                    </text>

                    {/* Active note pulse animation */}
                    {isActive && (
                        <circle
                            cx={note.x}
                            cy={note.y}
                            r="18"
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2"
                            opacity="0.6"
                        >
                            <animate
                                attributeName="r"
                                values="18;25;18"
                                dur="1s"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="opacity"
                                values="0.6;0.2;0.6"
                                dur="1s"
                                repeatCount="indefinite"
                            />
                        </circle>
                    )}
                </g>
            );
        });
    };

    // Render playback cursor
    const renderCursor = () => {
        if (!showCursor || !state.isPlaying) return null;

        const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
        const cursorX = startX + (progress * (totalSvgWidth - startX - 100));

        return (
            <g>
                {/* Main cursor line */}
                <line
                    x1={cursorX}
                    y1={startY - 30}
                    x2={cursorX}
                    y2={startY + (stringCount - 1) * stringSpacing + 20}
                    stroke="#f97316"
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0 0 8px #f97316)' }}
                >
                    <animate
                        attributeName="opacity"
                        values="0.7;1;0.7"
                        dur="1s"
                        repeatCount="indefinite"
                    />
                </line>

                {/* Cursor head */}
                <polygon
                    points={`${cursorX - 8},${startY - 30} ${cursorX + 8},${startY - 30} ${cursorX},${startY - 15}`}
                    fill="#f97316"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
            </g>
        );
    };

    return (
        <div className="bg-gray-800/90 rounded-xl border border-blue-500/30 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900/80 px-6 py-4 border-b border-gray-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-blue-400">
                        🎸 {songTitle}
                    </h2>
                    <div className="flex items-center gap-6 text-sm text-gray-300">
                        <span>♩ = {bpm} BPM</span>
                        <span>{timeSignature[0]}/{timeSignature[1]} Time</span>
                        <span>SVG Canvas Unified</span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-900/60 px-6 py-3 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setViewportX(0)}
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30"
                    >
                        ⏮️ Start
                    </button>
                    <button
                        onClick={() => setViewportX(Math.max(0, viewportX - 400))}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
                    >
                        ⬅️ Back
                    </button>
                    <button
                        onClick={() => setViewportX(Math.min(totalSvgWidth - containerWidth, viewportX + 400))}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
                    >
                        ➡️ Forward
                    </button>

                    <div className="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded">
                        Measures: {measures.length} | Notes: {svgNotes.length} | Active: {activeNotes.size}
                    </div>
                </div>
            </div>

            {/* SVG Tab Display */}
            <div
                ref={containerRef}
                className="relative bg-gray-900/40 overflow-hidden w-full"
                style={{ height: `${height}px` }}
            >
                <svg
                    ref={svgRef}
                    width="100%"
                    height={height}
                    className="bg-gray-900/60"
                    viewBox={`${viewportX} 0 ${containerWidth} ${height}`}
                    preserveAspectRatio="xMinYMin meet"
                    style={{
                        transition: 'viewBox 0.3s ease-out',
                        minWidth: '100%'
                    }}
                >
                    {/* Background */}
                    <rect width={totalSvgWidth} height={height} fill="#111827" />

                    {/* Measure backgrounds and dividers */}
                    {renderMeasureBackgrounds()}

                    {/* String lines and labels */}
                    {renderStringLines()}

                    {/* Fret numbers */}
                    {renderFretNumbers()}

                    {/* Playback cursor */}
                    {renderCursor()}
                </svg>

                {/* Fixed position indicator */}
                <div className="absolute top-0 bottom-0 left-1/3 w-px bg-cyan-400/30 pointer-events-none" />
            </div>

            {/* Footer */}
            <div className="bg-gray-900/80 px-6 py-3 border-t border-gray-700">
                <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-400">
                        SVG Canvas • Auto-scroll: {autoScroll ? 'ON' : 'OFF'} • Viewport: {viewportX.toFixed(0)}px
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-600 rounded"></div>
                            <span className="text-blue-400">Notes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-orange-500 rounded animate-pulse"></div>
                            <span className="text-orange-400">Playing</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SVGUnifiedTabPlayer;