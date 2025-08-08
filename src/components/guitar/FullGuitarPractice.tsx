"use client";

import React, { useState, useEffect, useRef } from 'react';

// 🎸 Guitar Chord Definitions
type ChordName = 'Am' | 'F' | 'C' | 'G' | 'Em' | 'Dm';

const GUITAR_CHORDS: Record<ChordName, { frets: number[]; color: string }> = {
  'Am': { frets: [0, 0, 2, 2, 1, 0], color: 'bg-blue-600' },
  'F': { frets: [-1, 1, 3, 3, 2, 1], color: 'bg-green-600' },
  'C': { frets: [-1, 3, 2, 0, 1, 0], color: 'bg-red-600' },
  'G': { frets: [3, 2, 0, 0, 3, 3], color: 'bg-purple-600' },
  'Em': { frets: [0, 2, 2, 0, 0, 0], color: 'bg-yellow-600' },
  'Dm': { frets: [-1, -1, 0, 2, 3, 1], color: 'bg-pink-600' }
};

const PRACTICE_SONGS: Array<{ name: string; chords: ChordName[]; bpm: number }> = [
  { name: '80s Rock Anthem', chords: ['Am', 'F', 'C', 'G'], bpm: 120 },
  { name: 'Grunge Alternative', chords: ['Em', 'G', 'C', 'Am'], bpm: 95 },
  { name: 'Metal Power', chords: ['Em', 'C', 'G', 'Dm'], bpm: 140 },
  { name: 'Blues Rock', chords: ['G', 'C', 'G', 'Dm'], bpm: 85 },
  { name: 'Modern Country', chords: ['G', 'Em', 'C', 'Dm'], bpm: 110 },
  { name: 'Contemporary Worship', chords: ['C', 'Am', 'F', 'G'], bpm: 75 }
];

interface SessionStats {
  accuracy: number;
  timing: number;
  progress: number;
}

export default function GuitarPractice() {
  const [currentChord, setCurrentChord] = useState<ChordName>('Am');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<number>(0);
  const [chordIndex, setChordIndex] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(90);
  const [volume, setVolume] = useState<number>(0.7);
  const [practiceMode, setPracticeMode] = useState<string>('guided');
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    accuracy: 0,
    timing: 0,
    progress: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 🎵 Auto-play chord progression for practice
  const startPractice = () => {
    if (isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const song = PRACTICE_SONGS[currentSong];
    const interval = (60 / bpm) * 1000; // Convert BPM to milliseconds

    intervalRef.current = setInterval(() => {
      setChordIndex(prev => {
        const nextIndex = (prev + 1) % song.chords.length;
        setCurrentChord(song.chords[nextIndex]);
        return nextIndex;
      });
    }, interval);
  };

  // 🎸 Play individual chord
  const playChord = (chord: ChordName) => {
    setCurrentChord(chord);
    // Visual feedback for beta testers
    const button = document.querySelector(`[data-chord="${chord}"]`);
    if (button) {
      button.classList.add('animate-pulse', 'ring-4', 'ring-cyan-400');
      setTimeout(() => {
        button.classList.remove('animate-pulse', 'ring-4', 'ring-cyan-400');
      }, 1000);
    }
  };

  const currentSongData = PRACTICE_SONGS[currentSong];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            🎸 GuitarPractice - Beta
          </h1>
          <p className="text-gray-300">Practice guitar chords with guided progressions</p>
        </div>

        {/* Practice Controls */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Practice Song:</label>
              <select
                value={currentSong}
                onChange={(e) => setCurrentSong(Number(e.target.value))}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
              >
                {PRACTICE_SONGS.map((song, index) => (
                  <option key={index} value={index}>
                    {song.name} ({song.chords.join(' → ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">BPM: {bpm}</label>
              <input
                type="range"
                min="60"
                max="140"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Volume: {Math.round(volume * 100)}%</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Practice Button */}
          <div className="text-center">
            <button
              onClick={startPractice}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${isPlaying
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {isPlaying ? '⏹️ Stop Practice' : '▶️ Start Practice'}
            </button>
          </div>
        </div>

        {/* Current Chord Display */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-8 mb-6 text-center border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Current Chord</h2>
          <div className="text-6xl font-bold mb-4 text-cyan-400">{currentChord}</div>
          <div className="text-gray-300">
            Playing: {currentSongData.name} | Chord {chordIndex + 1} of {currentSongData.chords.length}
          </div>
        </div>

        {/* Chord Buttons Grid */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-center">🎼 Quick Chord Practice</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.entries(GUITAR_CHORDS) as [ChordName, { frets: number[]; color: string }][]).map(([chord, data]) => (
              <button
                key={chord}
                data-chord={chord}
                onClick={() => playChord(chord)}
                className={`px-4 py-6 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${data.color
                  } ${currentChord === chord
                    ? 'ring-4 ring-cyan-400 shadow-2xl'
                    : 'hover:shadow-lg'
                  }`}
              >
                <div className="text-xl">{chord}</div>
                <div className="text-xs mt-1 opacity-75">Click to play</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chord Fingering Display */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-center">🎸 {currentChord} Chord Fingering</h3>
          <div className="flex justify-center">
            <div className="space-y-2">
              {['E', 'A', 'D', 'G', 'B', 'E'].map((string, stringIndex) => (
                <div key={stringIndex} className="flex items-center gap-2">
                  <span className="w-4 text-sm text-gray-400">{string}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, fretIndex) => {
                      const fret = GUITAR_CHORDS[currentChord].frets[stringIndex];
                      const isPressed = fret === fretIndex;
                      return (
                        <div
                          key={fretIndex}
                          className={`w-8 h-8 rounded border-2 flex items-center justify-center text-xs ${fret === -1 && fretIndex === 0
                              ? 'border-red-500 bg-red-500/20 text-red-300'
                              : isPressed
                                ? 'border-cyan-400 bg-cyan-400 text-black font-bold'
                                : 'border-gray-600 bg-gray-700/50 text-gray-400'
                            }`}
                        >
                          {fret === -1 && fretIndex === 0 ? 'X' : isPressed ? fret : fretIndex}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center mt-4 text-gray-400 text-sm">
            Numbers show which fret to press. X = don't play this string
          </p>
        </div>

        {/* Practice Stats */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-center">📊 Session Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{sessionStats.accuracy}%</div>
              <div className="text-sm text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{sessionStats.timing}%</div>
              <div className="text-sm text-gray-400">Timing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{sessionStats.progress}%</div>
              <div className="text-sm text-gray-400">Progress</div>
            </div>
          </div>
        </div>

        {/* Beta Feedback */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500 rounded-lg">
            <span className="text-blue-400">🧪 Private Beta</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-300">Share your feedback!</span>
          </div>
        </div>
      </div>
    </div>
  );
}