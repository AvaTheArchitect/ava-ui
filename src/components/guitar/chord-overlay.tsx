
import React, { useState, useRef } from 'react';
import Guitar from 'guitar-js';
import { ChordParser } from 'guitar-tab-song-parser';

export interface ChordInfo {
    name: string;
    frets: number[];
    fingers: number[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ChordOverlayProps {
    chord: ChordInfo;
    position: { x: number; y: number };
    visible: boolean;
    onClose?: () => void;
}

export const ChordOverlay: React.FC<ChordOverlayProps> = ({
    chord,
    position,
    visible,
    onClose
}) => {
    if (!visible) return null;

    return (
        <div
            className="chord-overlay"
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
        >
            <div className="chord-header">
                <h3>{chord.name}</h3>
                <button onClick={onClose} className="close-btn">×</button>
            </div>
            
            <ChordDiagram chord={chord} />
            
            <div className="chord-info">
                <p><strong>Difficulty:</strong> {chord.difficulty}</p>
                <div className="fingering">
                    <strong>Fingering:</strong>
                    <ul>
                        {chord.frets.map((fret, index) => (
                            <li key={index}>
                                String {index + 1}: {fret === 0 ? 'Open' : fret === -1 ? 'Muted' : `Fret ${fret}`}
                                {chord.fingers[index] && chord.fingers[index] > 0 && ` (Finger ${chord.fingers[index]})`}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export const ChordDiagram: React.FC<{ chord: ChordInfo }> = ({ chord }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            // Clear previous content
            containerRef.current.innerHTML = '';
            
            // Use guitar-js to generate chord diagram
            Guitar.chord(containerRef.current, {
                title: chord.name,
                chord: chord.frets.map((fret, string) => ({
                    fret: fret > 0 ? fret : undefined,
                    string: string + 1
                })).filter(note => note.fret !== undefined),
                statusString: chord.frets.map(fret => 
                    fret === 0 ? 'open' : fret === -1 ? 'closed' : null
                )
            });
        }
    }, [chord]);

    return (
        <div className="chord-diagram" ref={containerRef} />
    );
};

// Enhanced chord dictionary with common chords
export const chordDictionary: { [key: string]: ChordInfo } = {
    'C': {
        name: 'C Major',
        frets: [0, 1, 0, 2, 3, 0],
        fingers: [0, 1, 0, 2, 3, 0],
        difficulty: 'beginner'
    },
    'G': {
        name: 'G Major',
        frets: [3, 2, 0, 0, 3, 3],
        fingers: [3, 1, 0, 0, 4, 4],
        difficulty: 'beginner'
    },
    'Am': {
        name: 'A Minor',
        frets: [0, 0, 2, 2, 1, 0],
        fingers: [0, 0, 2, 3, 1, 0],
        difficulty: 'beginner'
    },
    'F': {
        name: 'F Major',
        frets: [1, 1, 3, 3, 2, 1],
        fingers: [1, 1, 3, 4, 2, 1],
        difficulty: 'intermediate'
    },
    'D': {
        name: 'D Major',
        frets: [-1, -1, 0, 2, 3, 2],
        fingers: [0, 0, 0, 1, 3, 2],
        difficulty: 'beginner'
    },
    'Em': {
        name: 'E Minor',
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [0, 2, 3, 0, 0, 0],
        difficulty: 'beginner'
    },
    'A': {
        name: 'A Major',
        frets: [0, 0, 2, 2, 2, 0],
        fingers: [0, 0, 1, 2, 3, 0],
        difficulty: 'beginner'
    },
    'E': {
        name: 'E Major',
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [0, 2, 3, 1, 0, 0],
        difficulty: 'beginner'
    },
    'Dm': {
        name: 'D Minor',
        frets: [-1, -1, 0, 2, 3, 1],
        fingers: [0, 0, 0, 2, 3, 1],
        difficulty: 'beginner'
    },
    'B7': {
        name: 'B7',
        frets: [-1, 2, 1, 2, 0, 2],
        fingers: [0, 2, 1, 3, 0, 4],
        difficulty: 'intermediate'
    },
    'C7': {
        name: 'C7',
        frets: [0, 1, 0, 2, 3, 1],
        fingers: [0, 1, 0, 2, 3, 4],
        difficulty: 'intermediate'
    },
    'G7': {
        name: 'G7',
        frets: [3, 2, 0, 0, 0, 1],
        fingers: [3, 2, 0, 0, 0, 1],
        difficulty: 'intermediate'
    }
};

export const getChordInfo = (chordName: string): ChordInfo | null => {
    // Try exact match first
    if (chordDictionary[chordName]) {
        return chordDictionary[chordName];
    }
    
    // Try case-insensitive match
    const lowerName = chordName.toLowerCase();
    for (const [key, value] of Object.entries(chordDictionary)) {
        if (key.toLowerCase() === lowerName) {
            return value;
        }
    }
    
    return null;
};

/**
 * Parse chord from text using guitar-tab-song-parser
 */
export const parseChordFromText = (text: string): ChordInfo[] => {
    try {
        const parser = new ChordParser();
        const parsedChords = parser.parse(text);
        
        return parsedChords.map((chord: any) => {
            const knownChord = getChordInfo(chord.name);
            if (knownChord) {
                return knownChord;
            }
            
            // Return basic chord info if not in dictionary
            return {
                name: chord.name,
                frets: chord.frets || [0, 0, 0, 0, 0, 0],
                fingers: chord.fingers || [0, 0, 0, 0, 0, 0],
                difficulty: 'intermediate' as const
            };
        });
    } catch (error) {
        console.error('Error parsing chords:', error);
        return [];
    }
};

/**
 * Interactive chord selector component
 */
export const ChordSelector: React.FC<{
    onChordSelect: (chord: ChordInfo) => void;
    selectedChord?: ChordInfo;
}> = ({ onChordSelect, selectedChord }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredChords = Object.entries(chordDictionary).filter(([key, chord]) =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chord.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="chord-selector">
            <div className="search-box">
                <input
                    type="text"
                    placeholder="Search chords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="chord-grid">
                {filteredChords.map(([key, chord]) => (
                    <div
                        key={key}
                        className={`chord-item ${selectedChord?.name === chord.name ? 'selected' : ''}`}
                        onClick={() => onChordSelect(chord)}
                    >
                        <div className="chord-name">{chord.name}</div>
                        <div className="chord-preview">
                            <ChordDiagram chord={chord} />
                        </div>
                        <div className="chord-difficulty">{chord.difficulty}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Chord progression display component
 */
export const ChordProgression: React.FC<{
    chords: string[];
    currentChord?: number;
    onChordClick?: (chordIndex: number, chord: string) => void;
}> = ({ chords, currentChord, onChordClick }) => {
    return (
        <div className="chord-progression">
            {chords.map((chordName, index) => {
                const chord = getChordInfo(chordName);
                return (
                    <div
                        key={index}
                        className={`progression-chord ${index === currentChord ? 'current' : ''}`}
                        onClick={() => onChordClick?.(index, chordName)}
                    >
                        <div className="chord-name">{chordName}</div>
                        {chord && (
                            <div className="chord-mini-diagram">
                                <ChordDiagram chord={chord} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
        