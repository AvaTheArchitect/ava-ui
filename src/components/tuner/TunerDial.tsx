'use client';
import React from 'react';
import { useTuner } from '@/hooks/tuner/useTuner';

interface TunerDialProps {
    onClose?: () => void;
}

// Chromatic circle notes with colors (same order as Circle of Fifths)
const CHROMATIC_NOTES = [
    { note: 'C', angle: 0, color: '#3b82f6', textColor: '#ffffff' },
    { note: 'C#', altNote: 'Db', angle: 30, color: '#8b5cf6', textColor: '#ffffff' },
    { note: 'D', angle: 60, color: '#ec4899', textColor: '#ffffff' },
    { note: 'D#', altNote: 'Eb', angle: 90, color: '#ef4444', textColor: '#ffffff' },
    { note: 'E', angle: 120, color: '#f97316', textColor: '#ffffff' },
    { note: 'F', angle: 150, color: '#eab308', textColor: '#000000' },
    { note: 'F#', altNote: 'Gb', angle: 180, color: '#22c55e', textColor: '#000000' },
    { note: 'G', angle: 210, color: '#10b981', textColor: '#ffffff' },
    { note: 'G#', altNote: 'Ab', angle: 240, color: '#14b8a6', textColor: '#ffffff' },
    { note: 'A', angle: 270, color: '#06b6d4', textColor: '#ffffff' },
    { note: 'A#', altNote: 'Bb', angle: 300, color: '#0ea5e9', textColor: '#ffffff' },
    { note: 'B', angle: 330, color: '#6366f1', textColor: '#ffffff' }
];

// SVG Helper Functions
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
}

function describeWedge(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
    const outerStart = polarToCartesian(x, y, outerRadius, endAngle);
    const outerEnd = polarToCartesian(x, y, outerRadius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const d = [
        "M", outerStart.x, outerStart.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
        "L", innerEnd.x, innerEnd.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
        "Z"
    ].join(" ");

    return d;
}

export default function TunerDial({ onClose }: TunerDialProps) {
    const {
        isLoaded,
        isListening,
        frequency,
        cents,
        note,
        octave,
        status,
        stringNumber,
        startListening,
        stopListening,
        simulateInput
    } = useTuner();

    if (!isLoaded) {
        return (
            <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 rounded-2xl p-8">
                <div className="text-center">
                    <div className="text-white text-xl">Loading tuner...</div>
                </div>
            </div>
        );
    }

    const getStatusColor = () => {
        switch (status) {
            case 'perfect': return 'from-green-400 to-emerald-500 border-green-300';
            case 'close': return 'from-yellow-400 to-orange-500 border-yellow-300';
            default: return 'from-gray-600 to-gray-700 border-gray-500';
        }
    };

    const getPulseRingColor = () => {
        switch (status) {
            case 'perfect': return 'border-green-400';
            case 'close': return 'border-yellow-400';
            default: return 'border-red-400';
        }
    };

    const isCurrentNote = (chromaticNote: string, altNote?: string) => {
        return note === chromaticNote ||
            (altNote && note === altNote) ||
            (chromaticNote === 'C#' && note === 'Db') ||
            (chromaticNote === 'D#' && note === 'Eb') ||
            (chromaticNote === 'F#' && note === 'Gb') ||
            (chromaticNote === 'G#' && note === 'Ab') ||
            (chromaticNote === 'A#' && note === 'Bb');
    };

    // Calculate guitar rotation based on cents (compass needle effect)
    const getGuitarRotation = () => {
        if (status === 'perfect') return 0;
        const maxRotation = 15;
        const rotation = Math.max(-maxRotation, Math.min(maxRotation, cents * 0.3));
        return rotation;
    };

    // SVG dimensions (Updated for larger center like TonalEnergy)
    const svgSize = 320;
    const centerX = svgSize / 2;
    const centerY = svgSize / 2;
    const outerRadius = 150;
    const innerRadius = 105; // Increased from 70 to 105 (TonalEnergy proportions)
    const segmentAngle = 30; // 360° / 12 notes

    return (
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 rounded-2xl p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                    🎸 Guitar Tuner
                    {isListening && <span className="animate-pulse text-green-400 text-lg">🎤</span>}
                </h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-blue-200/70 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/10 rounded-lg w-8 h-8 flex items-center justify-center"
                        aria-label="Close tuner"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Main Chromatic Circle */}
            <div className="flex flex-col items-center space-y-6">
                {/* SVG Chromatic Wheel with Proper Wedges */}
                <div className="relative">
                    <svg width={svgSize} height={svgSize} className="drop-shadow-lg">
                        {/* Pulse Ring Effects */}
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={outerRadius + 5}
                            fill="none"
                            stroke={status === 'perfect' ? '#22c55e' : status === 'close' ? '#eab308' : '#ef4444'}
                            strokeWidth="3"
                            className={status !== 'off' ? 'animate-pulse' : 'opacity-30'}
                        />

                        {/* Perfect tuning additional ring */}
                        {status === 'perfect' && (
                            <circle
                                cx={centerX}
                                cy={centerY}
                                r={outerRadius + 10}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                className="animate-ping opacity-60"
                            />
                        )}

                        {/* Note Wedges */}
                        {CHROMATIC_NOTES.map((chromaticNote, index) => {
                            const isActive = isCurrentNote(chromaticNote.note, chromaticNote.altNote);
                            const startAngle = chromaticNote.angle - segmentAngle / 2;
                            const endAngle = chromaticNote.angle + segmentAngle / 2;

                            const wedgePath = describeWedge(
                                centerX,
                                centerY,
                                innerRadius,
                                outerRadius,
                                startAngle,
                                endAngle
                            );

                            // Text position (middle of wedge) - Adjusted for larger inner radius
                            const textRadius = (innerRadius + outerRadius) / 2 + 5; // Slightly closer to outer edge
                            const textPos = polarToCartesian(centerX, centerY, textRadius, chromaticNote.angle);

                            return (
                                <g key={chromaticNote.note}>
                                    {/* Wedge Path */}
                                    <path
                                        d={wedgePath}
                                        fill={isActive ? '#f97316' : chromaticNote.color}
                                        stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.2)'}
                                        strokeWidth={isActive ? '3' : '1'}
                                        className={`transition-all duration-300 ${isActive ? 'drop-shadow-lg' : 'hover:brightness-110'}`}
                                        style={{
                                            filter: isActive ? 'drop-shadow(0 0 10px #f97316)' : '',
                                            transform: isActive ? 'scale(1.05)' : '',
                                            transformOrigin: `${centerX}px ${centerY}px`
                                        }}
                                    />

                                    {/* Note Text */}
                                    <text
                                        x={textPos.x}
                                        y={textPos.y - 2}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        className={`font-bold text-sm transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`}
                                        fill={isActive ? '#ffffff' : chromaticNote.textColor}
                                        style={{ fontSize: isActive ? '16px' : '14px' }}
                                    >
                                        {chromaticNote.note}
                                    </text>

                                    {/* Alternative Note Text (smaller) */}
                                    {chromaticNote.altNote && (
                                        <text
                                            x={textPos.x}
                                            y={textPos.y + 12}
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            className="font-medium text-xs opacity-80"
                                            fill={isActive ? '#ffffff' : chromaticNote.textColor}
                                        >
                                            {chromaticNote.altNote}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Center Guitar Display (Overlaid) - Larger to match TonalEnergy proportions */}
                    <div className={`absolute inset-0 flex items-center justify-center`}>
                        <div className={`w-48 h-48 rounded-full bg-gradient-to-br ${getStatusColor()} border-4 flex items-center justify-center text-white font-bold shadow-2xl transition-all duration-500 ${status === 'perfect' ? 'animate-pulse' : ''
                            }`}>
                            <div className="text-center relative">
                                {/* Flame Effects - Only when Perfect */}
                                {status === 'perfect' && (
                                    <>
                                        <div className="absolute -inset-8 rounded-full bg-gradient-radial from-transparent via-red-500/30 to-yellow-400/60 animate-ping"></div>
                                        <div className="absolute -inset-4 rounded-full bg-gradient-radial from-transparent via-orange-500/50 to-red-400/70 animate-pulse"></div>
                                        <div className="absolute -inset-2 rounded-full bg-gradient-radial from-transparent via-yellow-400/40 to-orange-500/50 animate-bounce"></div>
                                    </>
                                )}

                                {/* Guitar Icon with Rotation - Larger for bigger center area */}
                                <div
                                    className={`text-7xl relative z-10 transition-all duration-700 ${status === 'perfect' ? 'text-yellow-100 drop-shadow-2xl scale-110' : ''
                                        }`}
                                    style={{
                                        transform: `rotate(${getGuitarRotation()}deg)`,
                                        filter: status === 'perfect' ? 'drop-shadow(0 0 20px #fbbf24)' : ''
                                    }}
                                >
                                    🎸
                                </div>

                                {/* Current Note Display - Larger text for bigger center */}
                                <div className={`text-2xl font-bold mt-2 transition-all duration-300 ${status === 'perfect' ? 'text-yellow-100' : ''
                                    }`}>
                                    {note}{octave}
                                </div>

                                {/* String Number - More prominent in larger center */}
                                {stringNumber > 0 && (
                                    <div className={`text-lg mt-1 opacity-90 transition-all duration-300 ${status === 'perfect' ? 'text-yellow-100' : ''
                                        }`}>
                                        String {stringNumber}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status & Tuning Direction */}
                <div className="text-center">
                    <div className={`text-xl font-bold mb-2 transition-all duration-300 ${status === 'perfect' ? 'text-green-400 animate-pulse' :
                        status === 'close' ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {status === 'perfect' && '🔥 PERFECT TUNE! 🔥'}
                        {status === 'close' && '🎵 Almost There...'}
                        {status === 'off' && '🎸 Keep Tuning...'}
                    </div>

                    {/* Tuning Direction */}
                    {status !== 'perfect' && Math.abs(cents) > 5 && (
                        <div className="text-sm flex items-center justify-center gap-2">
                            {cents < 0 ? (
                                <span className="text-blue-300 font-semibold">↻ Tune Up (Tighten)</span>
                            ) : (
                                <span className="text-red-300 font-semibold">↺ Tune Down (Loosen)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Frequency & Cents Display */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
                        <div className="text-sm text-blue-200/70 font-semibold uppercase tracking-wide mb-1">
                            Frequency
                        </div>
                        <div className="text-xl font-bold text-cyan-400 font-mono">
                            {frequency.toFixed(1)} Hz
                        </div>
                    </div>

                    <div className="bg-white/10 rounded-lg p-4 border border-white/20 text-center">
                        <div className="text-sm text-blue-200/70 font-semibold uppercase tracking-wide mb-1">
                            Cents
                        </div>
                        <div className={`text-xl font-bold font-mono ${status === 'perfect' ? 'text-green-400' :
                            status === 'close' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {cents > 0 ? '+' : ''}{cents.toFixed(1)}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-4">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isListening
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-400/40'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:shadow-emerald-400/40'
                            } text-white`}
                    >
                        {isListening ? '🛑 Stop Listening' : '🎤 Start Listening'}
                    </button>

                    <button
                        onClick={simulateInput}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-400/40"
                    >
                        🎲 Demo
                    </button>
                </div>

                {/* Beta Notice */}
                <div className="bg-orange-500/20 border border-orange-400/50 rounded-lg p-4 text-center max-w-md">
                    <p className="text-orange-200 text-sm">
                        🔥 <strong>Simon's Flaming Guitar Circle Tuner™:</strong> Professional wedge-based chromatic wheel with compass needle guitar and flame effects!
                    </p>
                </div>
            </div>
        </div>
    );
}