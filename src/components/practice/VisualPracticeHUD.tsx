// src/modules/practice/VisualPracticeHUD.tsx
import React from 'react';

// ✅ Complete TypeScript interface for all props
interface VisualPracticeHUDProps {
  bpm: number;
  currentChord: string | null;
  chords: string[];
  currentIndex: number;
  isPlaying: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onBpmChange: (newBpm: number) => void;
  onChordsChange: (newChords: string[]) => void;
}

export default function VisualPracticeHUD({
  bpm,
  currentChord,
  chords,
  currentIndex,
  isPlaying,
  onStart,
  onStop,
  onPause,
  onResume,
  onBpmChange,
  onChordsChange
}: VisualPracticeHUDProps) {

  // Calculate progress percentage
  const progressPercentage = chords.length > 0 ? (currentIndex / chords.length) * 100 : 0;

  return (
    <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-4xl">
      {/* Main HUD Container */}
      <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 rounded-2xl p-6">

        {/* Top Row - Current Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* BPM Display */}
            <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
              <div className="text-xs text-blue-200/70 font-semibold uppercase tracking-wide">BPM</div>
              <div className="text-2xl font-bold text-orange-500">{bpm}</div>
            </div>

            {/* Current Chord */}
            <div className="bg-white/10 rounded-lg px-6 py-2 border border-white/20">
              <div className="text-xs text-blue-200/70 font-semibold uppercase tracking-wide">Current Chord</div>
              <div className="text-3xl font-bold text-cyan-400 font-mono">
                {currentChord || '...'}
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
              <div className="text-xs text-blue-200/70 font-semibold uppercase tracking-wide">Progress</div>
              <div className="text-lg font-bold text-emerald-400">
                {currentIndex + 1} / {chords.length}
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Chord Progression Display */}
        <div className="mb-4">
          <div className="text-xs text-blue-200/70 font-semibold uppercase tracking-wide mb-2">Chord Progression</div>
          <div className="flex flex-wrap gap-2">
            {chords.map((chord, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-lg text-sm font-mono transition-all duration-300 ${index === currentIndex
                  ? 'bg-orange-500 text-white border-2 border-orange-300 scale-105'
                  : index < currentIndex
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                    : 'bg-white/10 text-blue-200 border border-white/20'
                  }`}
              >
                {chord}
              </span>
            ))}
          </div>
        </div>

        {/* Control Panel */}
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex gap-2">
            {!isPlaying ? (
              <button
                onClick={onStart}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-400/40 flex items-center gap-2"
              >
                ▶️ Start
              </button>
            ) : (
              <>
                <button
                  onClick={onPause}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-400/40"
                >
                  ⏸️ Pause
                </button>
                <button
                  onClick={onStop}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-400/40"
                >
                  ⏹️ Stop
                </button>
              </>
            )}
          </div>

          {/* BPM Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBpmChange(Math.max(60, bpm - 10))}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300 font-bold"
            >
              -10
            </button>
            <button
              onClick={() => onBpmChange(Math.max(60, bpm - 5))}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300 font-bold"
            >
              -5
            </button>
            <span className="mx-2 text-sm text-blue-200/70">BPM</span>
            <button
              onClick={() => onBpmChange(Math.min(200, bpm + 5))}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300 font-bold"
            >
              +5
            </button>
            <button
              onClick={() => onBpmChange(Math.min(200, bpm + 10))}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all duration-300 font-bold"
            >
              +10
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}