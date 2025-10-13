'use client';

// 🎸 MJTF Tab Player - Working Visual Display
// Place this in: /src/components/guitar/display/MJTFTabPlayer.tsx

import React, { useState, useEffect, useRef } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { MJTFSong, MJTFTrack, MJTFMeasure, MJTFNote } from '@/modules/notation/parsers/mjtfConverter';

interface MJTFTabPlayerProps {
  song: MJTFSong;
  selectedTrackIndex?: number;
  showCursor?: boolean;
  autoScroll?: boolean;
  className?: string;
}

interface RenderedNote {
  x: number;
  y: number;
  fret: number;
  string: number;
  timestamp: number;
  technique?: string;
  isActive: boolean;
}

const MJTFTabPlayer: React.FC<MJTFTabPlayerProps> = ({
  song,
  selectedTrackIndex = 0,
  showCursor = true,
  autoScroll = true,
  className = ''
}) => {
  const { state } = usePlaybackControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedNotes, setRenderedNotes] = useState<RenderedNote[]>([]);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [currentMeasure, setCurrentMeasure] = useState<number>(0);

  const currentTrack = song.tracks[selectedTrackIndex];
  if (!currentTrack) return <div>No track selected</div>;

  // Display constants
  const stringSpacing = 45;
  const measureWidth = 280;
  const noteSpacing = 35;
  const startX = 100;
  const startY = 60;
  const stringCount = 6;

  // String names (high to low)
  const stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];

  // Generate rendered notes from MJTF data
  useEffect(() => {
    const notes: RenderedNote[] = [];

    currentTrack.measures.forEach((measure, measureIndex) => {
      const measureStartX = startX + (measureIndex * measureWidth);

      measure.beats.forEach((beat, beatIndex) => {
        const beatX = measureStartX + (beatIndex * (measureWidth / 4));

        beat.notes.forEach((note, noteIndex) => {
          const noteX = beatX + (noteIndex * noteSpacing);
          const stringY = startY + ((note.string - 1) * stringSpacing); // MJTF uses 1-6

          notes.push({
            x: noteX,
            y: stringY,
            fret: note.fret,
            string: note.string,
            timestamp: beat.timestamp,
            technique: note.technique,
            isActive: false
          });
        });
      });
    });

    setRenderedNotes(notes);
    console.log(`🎸 Rendered ${notes.length} notes for ${currentTrack.name}`);
  }, [currentTrack]);

  // Update active notes based on playback time
  useEffect(() => {
    if (!state.isPlaying) {
      setActiveNotes(new Set());
      return;
    }

    const currentTime = state.currentTime;
    const tolerance = 0.25; // 250ms tolerance
    const activeSet = new Set<number>();

    renderedNotes.forEach((note, index) => {
      if (Math.abs(note.timestamp - currentTime) <= tolerance) {
        activeSet.add(index);
      }
    });

    setActiveNotes(activeSet);

    // Update current measure
    const measure = currentTrack.measures.find(m => 
      currentTime >= m.startTime && currentTime <= m.endTime
    );
    if (measure) {
      setCurrentMeasure(measure.index);
    }
  }, [state.currentTime, state.isPlaying, renderedNotes, currentTrack.measures]);

  // Auto-scroll to current measure
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      const targetScrollLeft = currentMeasure * measureWidth - 200;
      containerRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
      });
    }
  }, [currentMeasure, autoScroll]);

  // Render string lines
  const renderStrings = () => {
    return stringNames.map((stringName, index) => {
      const y = startY + (index * stringSpacing);
      return (
        <g key={`string-${index}`}>
          {/* String line */}
          <line
            x1={startX - 40}
            y1={y}
            x2={startX + (currentTrack.measures.length * measureWidth)}
            y2={y}
            stroke="#444"
            strokeWidth="2"
          />
          {/* String label */}
          <text
            x={startX - 60}
            y={y + 6}
            fontSize="16"
            fontWeight="bold"
            fill="#888"
            textAnchor="middle"
          >
            {stringName}
          </text>
        </g>
      );
    });
  };

  // Render measure dividers
  const renderMeasureDividers = () => {
    return currentTrack.measures.map((measure, index) => {
      const x = startX + (index * measureWidth);
      const isCurrentMeasure = currentMeasure === index;

      return (
        <g key={`measure-${index}`}>
          {/* Measure line */}
          <line
            x1={x - 20}
            y1={startY - 30}
            x2={x - 20}
            y2={startY + (stringCount - 1) * stringSpacing + 30}
            stroke={isCurrentMeasure ? "#f97316" : "#666"}
            strokeWidth={isCurrentMeasure ? "3" : "1"}
            strokeDasharray="4,4"
          />
          {/* Measure number */}
          <text
            x={x}
            y={startY - 40}
            fontSize="14"
            fontWeight="bold"
            fill={isCurrentMeasure ? "#f97316" : "#888"}
            textAnchor="middle"
          >
            {index + 1}
          </text>
          {/* Timing info */}
          <text
            x={x}
            y={startY + (stringCount * stringSpacing) + 50}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
          >
            {measure.startTime.toFixed(1)}s
          </text>
        </g>
      );
    });
  };

  // Render notes
  const renderNotes = () => {
    return renderedNotes.map((note, index) => {
      const isActive = activeNotes.has(index);

      return (
        <g key={`note-${index}`}>
          {/* Note circle */}
          <circle
            cx={note.x}
            cy={note.y}
            r={isActive ? "20" : "16"}
            fill={isActive ? "#f97316" : "#3b82f6"}
            stroke={isActive ? "#fff" : "#1e40af"}
            strokeWidth="2"
            className={isActive ? "animate-pulse" : ""}
          />
          
          {/* Fret number */}
          <text
            x={note.x}
            y={note.y}
            textAnchor="middle"
            dy="5"
            fontSize={isActive ? "16" : "14"}
            fontWeight="bold"
            fill="white"
          >
            {note.fret}
          </text>

          {/* Technique indicator */}
          {note.technique && (
            <text
              x={note.x + 25}
              y={note.y - 15}
              fontSize="12"
              fontWeight="bold"
              fill="#ef4444"
              textAnchor="start"
            >
              {getTechniqueSymbol(note.technique)}
            </text>
          )}
        </g>
      );
    });
  };

  // Get technique symbol
  const getTechniqueSymbol = (technique: string): string => {
    const symbols: { [key: string]: string } = {
      'bend': 'b',
      'bends': 'b',
      'hammer': 'h',
      'hammer-ons': 'h',
      'pulloff': 'p',
      'pull-offs': 'p',
      'slide': '/',
      'slides': '/',
      'vibrato': '~',
      'palm-mute': 'PM',
      'palm-muting': 'PM',
      'harmonics': 'H'
    };
    return symbols[technique] || technique.charAt(0).toUpperCase();
  };

  // Render playback cursor
  const renderCursor = () => {
    if (!showCursor || !state.isPlaying) return null;

    const cursorX = startX + (currentMeasure * measureWidth) + 
      ((state.currentTime - (currentTrack.measures[currentMeasure]?.startTime || 0)) / 
       ((currentTrack.measures[currentMeasure]?.endTime || 1) - (currentTrack.measures[currentMeasure]?.startTime || 0))) * measureWidth - 20;

    return (
      <g>
        <line
          x1={cursorX}
          y1={startY - 40}
          x2={cursorX}
          y2={startY + (stringCount - 1) * stringSpacing + 40}
          stroke="#f97316"
          strokeWidth="4"
          className="drop-shadow-lg"
        >
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="1s"
            repeatCount="indefinite"
          />
        </line>
        
        {/* Cursor head */}
        <polygon
          points={`${cursorX-10},${startY-50} ${cursorX+10},${startY-50} ${cursorX},${startY-30}`}
          fill="#f97316"
          className="drop-shadow-lg"
        />
      </g>
    );
  };

  const totalWidth = Math.max(1200, startX + (currentTrack.measures.length * measureWidth) + 100);

  return (
    <div className={`bg-gray-800/90 rounded-xl p-6 border border-orange-500/30 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-orange-400">
            🎸 {song.title} - {currentTrack.name}
          </h2>
          <p className="text-gray-300">{song.artist} • MJTF Player</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <span>♩ = {song.bpm} BPM</span>
          <span>{song.timeSignature[0]}/{song.timeSignature[1]} Time</span>
          <span>{song.key}</span>
          <span className="text-purple-400">{currentTrack.difficulty}</span>
        </div>
      </div>

      {/* Track Info */}
      <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-400">Tuning: {currentTrack.tuning.join('-')}</span>
          <span className="text-green-400">Techniques: {currentTrack.techniques.join(', ')}</span>
          <span className="text-purple-400">Measures: {currentTrack.measures.length}</span>
          <span className="text-orange-400">Notes: {renderedNotes.length}</span>
        </div>
      </div>

      {/* Tab Display */}
      <div 
        ref={containerRef}
        className="bg-gray-900/60 rounded-lg p-4 overflow-x-auto"
        style={{ height: '400px' }}
      >
        <svg
          width={totalWidth}
          height="350"
          className="bg-gray-900/80 rounded"
        >
          {/* Background */}
          <rect width="100%" height="100%" fill="#1a1a1a" />

          {/* Guitar strings */}
          {renderStrings()}

          {/* Measure dividers */}
          {renderMeasureDividers()}

          {/* Notes */}
          {renderNotes()}

          {/* Playback cursor */}
          {renderCursor()}
        </svg>
      </div>

      {/* Footer Stats */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <div className="text-gray-400">
          Track: {selectedTrackIndex + 1}/{song.tracks.length} | 
          Measure: {currentMeasure + 1}/{currentTrack.measures.length} |
          Active Notes: {activeNotes.size}
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
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-orange-500"></div>
            <span className="text-orange-400">Cursor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MJTFTabPlayer;