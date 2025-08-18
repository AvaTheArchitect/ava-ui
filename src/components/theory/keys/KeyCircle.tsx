'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

// Define types locally
type MusicalKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export default function KeyCircle() {
  // Use local state for now - can integrate with store later
  const [currentKey, setCurrentKey] = useState<MusicalKey>('C');

  // All 12 chromatic keys
  const keysChromatic: MusicalKey[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const [displayMode, setDisplayMode] = useState<'grid' | 'circle'>('grid');

  // Transpose functions
  const transposeUp = () => {
    const currentIndex = keysChromatic.indexOf(currentKey);
    const nextIndex = (currentIndex + 1) % keysChromatic.length;
    setCurrentKey(keysChromatic[nextIndex]);
  };

  const transposeDown = () => {
    const currentIndex = keysChromatic.indexOf(currentKey);
    const prevIndex = currentIndex === 0 ? keysChromatic.length - 1 : currentIndex - 1;
    setCurrentKey(keysChromatic[prevIndex]);
  };

  const reset = () => {
    setCurrentKey('C');
  };

  // Play a reference tone (placeholder for future audio integration)
  const playKeyTone = (key: MusicalKey) => {
    console.log(`Playing reference tone for ${key}`);
  };

  // Get relative position for circle layout
  const getCirclePosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90; // Start at top
    const radius = 80;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y, angle };
  };

  // Circle of fifths order
  const keysCircleOfFifths: MusicalKey[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'];

  return (
    <div className="space-y-4">
      {/* Header with current key */}
      <div className="text-center">
        <h4 className="text-white font-medium mb-2">Key Center</h4>
        <div className="text-2xl font-bold text-cyan-400 mb-3">
          {currentKey}
        </div>

        {/* Quick transpose controls */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <button
            onClick={transposeDown}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Transpose Down"
          >
            <ChevronDown className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={reset}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Reset to C"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={transposeUp}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Transpose Up"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Display mode toggle */}
      <div className="flex justify-center space-x-2 mb-4">
        <button
          onClick={() => setDisplayMode('grid')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${displayMode === 'grid'
              ? 'bg-blue-500 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
            }`}
        >
          Grid
        </button>
        <button
          onClick={() => setDisplayMode('circle')}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${displayMode === 'circle'
              ? 'bg-blue-500 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
            }`}
        >
          Circle
        </button>
      </div>

      {/* Key selection interface */}
      {displayMode === 'grid' ? (
        // Grid layout - easier for beginners
        <div className="grid grid-cols-4 gap-2">
          {keysChromatic.map((key) => {
            const isCurrent = currentKey === key;

            return (
              <button
                key={key}
                onClick={() => setCurrentKey(key)}
                onDoubleClick={() => playKeyTone(key)}
                className={`
                  relative p-3 rounded-lg font-bold transition-all transform hover:scale-105
                  ${isCurrent
                    ? 'bg-cyan-500 text-black ring-2 ring-cyan-300 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
                title={`${key} ${isCurrent ? '(Current)' : ''}`}
              >
                {key}
                {isCurrent && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // Circle layout - circle of fifths for advanced users
        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-white/20"></div>

          {keysCircleOfFifths.map((key, index) => {
            const { x, y } = getCirclePosition(index, keysCircleOfFifths.length);
            const isCurrent = currentKey === key;

            return (
              <button
                key={key}
                onClick={() => setCurrentKey(key)}
                onDoubleClick={() => playKeyTone(key)}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`
                  absolute w-10 h-10 rounded-full font-bold text-sm transition-all transform hover:scale-110
                  ${isCurrent
                    ? 'bg-cyan-500 text-black ring-2 ring-cyan-300 shadow-lg z-10'
                    : 'bg-white/20 text-white hover:bg-white/30'
                  }
                `}
                title={`${key} ${isCurrent ? '(Current)' : ''}`}
              >
                {key}
              </button>
            );
          })}

          {/* Center circle showing current key */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-900/80 border border-white/30 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{currentKey}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pro tip */}
      <div className="text-center text-white/50 text-xs mt-3">
        💡 Double-click any key for reference tone
      </div>
    </div>
  );
}