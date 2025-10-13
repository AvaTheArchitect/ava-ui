'use client';

import React from 'react';

interface TabNote {
    string: number;  // 1-6 (1 = high E, 6 = low E)
    fret: number;
    duration?: number;
    techniques?: string[];
}

interface TabMeasure {
    number: number;
    notes: TabNote[];
    timeSignature?: { numerator: number; denominator: number };
    tempo?: number;
}

interface TabMeasureRendererProps {
    measure: TabMeasure;
    width?: number;
    height?: number;
    stringSpacing?: number;
    isActive?: boolean;
    showMeasureNumber?: boolean;
    showTechniques?: boolean;
}

const TabMeasureRenderer: React.FC<TabMeasureRendererProps> = ({
    measure,
    width = 200,
    height = 180,
    stringSpacing = 25,
    isActive = false,
    showMeasureNumber = true,
    showTechniques = true
}) => {
    const strings = 6;
    const topPadding = 40;
    const leftPadding = 20;
    const rightPadding = 20;
    const bottomPadding = 20;

    const contentWidth = width - leftPadding - rightPadding;
    const totalHeight = (strings - 1) * stringSpacing;

    // Group notes by their horizontal position (for chords)
    const notesByPosition = new Map<number, TabNote[]>();
    measure.notes.forEach((note, index) => {
        const position = index;
        if (!notesByPosition.has(position)) {
            notesByPosition.set(position, []);
        }
        notesByPosition.get(position)?.push(note);
    });

    // Calculate horizontal spacing
    const positions = Array.from(notesByPosition.keys());
    const noteSpacing = positions.length > 1 ? contentWidth / (positions.length + 1) : contentWidth / 2;

    return (
        <svg
            width={width}
            height={height}
            className={`tab-measure-svg ${isActive ? 'active' : ''}`}
            style={{
                border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '4px',
                backgroundColor: isActive ? '#eff6ff' : 'white'
            }}
        >
            {/* Measure number */}
            {showMeasureNumber && (
                <text
                    x={leftPadding}
                    y={20}
                    fontSize="12"
                    fill="#6b7280"
                    fontWeight="600"
                >
                    M{measure.number}
                </text>
            )}

            {/* Draw 6 horizontal lines (strings) */}
            {Array.from({ length: strings }).map((_, stringIndex) => {
                const y = topPadding + stringIndex * stringSpacing;
                return (
                    <line
                        key={`string-${stringIndex}`}
                        x1={leftPadding}
                        y1={y}
                        x2={width - rightPadding}
                        y2={y}
                        stroke="#d1d5db"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Draw vertical bar at start */}
            <line
                x1={leftPadding}
                y1={topPadding}
                x2={leftPadding}
                y2={topPadding + totalHeight}
                stroke="#374151"
                strokeWidth="2"
            />

            {/* Draw vertical bar at end */}
            <line
                x1={width - rightPadding}
                y1={topPadding}
                x2={width - rightPadding}
                y2={topPadding + totalHeight}
                stroke="#374151"
                strokeWidth="2"
            />

            {/* Render notes */}
            {positions.map((position, posIndex) => {
                const notesAtPosition = notesByPosition.get(position) || [];
                const xPosition = leftPadding + (posIndex + 1) * noteSpacing;

                return (
                    <g key={`position-${position}`}>
                        {notesAtPosition.map((note, noteIndex) => {
                            // Convert string number to y position
                            // String 1 (high E) = top line, String 6 (low E) = bottom line
                            const stringY = topPadding + (note.string - 1) * stringSpacing;

                            // Draw fret number
                            const fretText = note.fret.toString();
                            const textWidth = fretText.length * 8; // Approximate width

                            return (
                                <g key={`note-${position}-${noteIndex}`}>
                                    {/* Background circle for fret number */}
                                    <circle
                                        cx={xPosition}
                                        cy={stringY}
                                        r={12}
                                        fill="white"
                                        stroke={isActive ? '#3b82f6' : '#9ca3af'}
                                        strokeWidth="1"
                                    />

                                    {/* Fret number */}
                                    <text
                                        x={xPosition}
                                        y={stringY}
                                        fontSize="14"
                                        fontWeight="600"
                                        fill="#1f2937"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                    >
                                        {note.fret}
                                    </text>

                                    {/* Technique annotations */}
                                    {showTechniques && note.techniques && note.techniques.length > 0 && (
                                        <text
                                            x={xPosition}
                                            y={stringY - 20}
                                            fontSize="10"
                                            fill="#7c3aed"
                                            textAnchor="middle"
                                            fontStyle="italic"
                                        >
                                            {note.techniques[0]}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                );
            })}
        </svg>
    );
};

export default TabMeasureRenderer;