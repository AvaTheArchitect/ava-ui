import React, { useState } from 'react'

// ✅ Interface defined first
interface FretboardOverlayProps {
    className?: string
    chords?: string[]
    highlightedFrets?: number[]
    onFretClick?: (fret: number, string: number) => void
}

// ✅ Single function implementation
function FretboardOverlay({
    className = "",
    chords = [],
    highlightedFrets = [],
    onFretClick,
}: FretboardOverlayProps) {
    const [selectedFret, setSelectedFret] = useState<number | null>(null)
    const [selectedString, setSelectedString] = useState<number | null>(null)

    // Standard guitar tuning (from lowest to highest string)
    const strings = ['E', 'A', 'D', 'G', 'B', 'E']
    const frets = Array.from({ length: 13 }, (_, i) => i) // 0-12 frets

    const handleFretClick = (fret: number, stringIndex: number) => {
        setSelectedFret(fret)
        setSelectedString(stringIndex)
        onFretClick?.(fret, stringIndex)
    }

    return (
        <div className={`fretboard-overlay ${className}`}>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Guitar Fretboard</h3>

                {/* Fret markers */}
                <div className="flex justify-between mb-2 px-4">
                    {frets.map((fret) => (
                        <div key={fret} className="text-white/60 text-xs font-mono">
                            {fret}
                        </div>
                    ))}
                </div>

                {/* Strings and frets */}
                <div className="space-y-3">
                    {strings.map((stringNote, stringIndex) => (
                        <div key={stringIndex} className="flex items-center space-x-2">
                            {/* String note label */}
                            <div className="w-6 text-white font-mono text-sm">
                                {stringNote}
                            </div>

                            {/* Frets for this string */}
                            <div className="flex space-x-1">
                                {frets.map((fret) => {
                                    const isHighlighted = highlightedFrets.includes(fret)
                                    const isSelected = selectedFret === fret && selectedString === stringIndex

                                    return (
                                        <button
                                            key={fret}
                                            onClick={() => handleFretClick(fret, stringIndex)}
                                            className={`
                                                w-6 h-6 rounded-full border-2 transition-all duration-200
                                                ${isSelected
                                                    ? 'bg-orange-500 border-orange-300 scale-110'
                                                    : isHighlighted
                                                        ? 'bg-blue-500/50 border-blue-300 hover:bg-blue-500/70'
                                                        : 'bg-white/10 border-white/30 hover:bg-white/20'
                                                }
                                            `}
                                            aria-label={`Fret ${fret}, String ${stringIndex + 1} (${stringNote})`}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chord display */}
                {chords.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/20">
                        <h4 className="text-white font-medium mb-2">Active Chords:</h4>
                        <div className="flex flex-wrap gap-2">
                            {chords.map((chord, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-lg text-sm font-mono"
                                >
                                    {chord}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Selection info */}
                {selectedFret !== null && selectedString !== null && (
                    <div className="mt-4 p-3 bg-orange-500/20 rounded-lg">
                        <p className="text-orange-200 text-sm">
                            Selected: Fret {selectedFret}, String {selectedString + 1} ({strings[selectedString]})
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ✅ Single export statement
export default FretboardOverlay