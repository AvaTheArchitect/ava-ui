'use client';

/**
 * SpeedControl.tsx - V76 Z-INDEX FIX
 * Date: November 15th, 2025
 * 
 * FIXES:
 * ✅ Dropdown z-index increased to z-[100] (above footer's z-50)
 * ✅ Ensures Speed panel is always clickable on mobile
 */

import React, { useState } from 'react';
import type { SpeedControlProps } from './MaestroControlTypes';

export const SpeedControl: React.FC<SpeedControlProps> = ({
  api,
  playbackSpeed,
  songInfo,
  onSpeedChange,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  const currentBPM = songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 0;

  return (
    <div id="c-speed" className="relative">
      {/* Speed Button */}
      <button
        id="control-speed"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        disabled={!api}
        title="Open speed panel ((S))"
        className={`
          flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[72px]
          rounded-lg transition-all duration-200
          ${isPanelOpen
            ? 'bg-blue-500/20 border-2 border-blue-400/50'
            : 'bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80'
          }
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Speedometer Icon */}
        <svg width="28" height="20" viewBox="0 0 28 20" className="text-blue-400">
          <path
            d="M 2 16 A 12 12 0 0 1 26 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            d="M 2 16 A 12 12 0 0 1 26 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${playbackSpeed * 37.7} 100`}
            opacity="0.9"
            className={playbackSpeed > 1 ? 'text-orange-400' : 'text-cyan-400'}
          />
          <g transform={`rotate(${(playbackSpeed - 0.25) * 144 - 90}, 14, 16)`}>
            <line x1="14" y1="16" x2="14" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-300" />
            <circle cx="14" cy="16" r="2" fill="currentColor" className="text-blue-400" />
          </g>
        </svg>

        {/* Speed Percentage */}
        <span className={`font-bold text-base ${playbackSpeed > 1 ? 'text-orange-400' : 'text-cyan-400'
          }`}>
          {Math.round(playbackSpeed * 100)}%
        </span>

        <span className="text-xs text-gray-400 -mt-0.5">Speed</span>
      </button>

      {/* 🔧 V76: Speed Panel - Z-INDEX INCREASED TO z-[100] */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-[100]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-blue-400">Playback Speed</span>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-gray-500 hover:text-white"
              aria-label="Close speed panel"
            >
              ✕
            </button>
          </div>

          {/* Current BPM Display */}
          {songInfo && (
            <div className="mb-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{currentBPM} BPM</div>
              <div className="text-xs text-gray-500">
                Original: {songInfo.tempo} BPM
              </div>
            </div>
          )}

          {/* Speed Slider */}
          <div className="mb-4">
            <input
              type="range"
              min="0.25"
              max="1.5"
              step="0.05"
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {speedPresets.map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-bold transition-all
                  ${playbackSpeed === speed
                    ? 'bg-blue-600 text-white border-2 border-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }
                `}
              >
                {Math.round(speed * 100)}%
              </button>
            ))}
          </div>

          {/* Reset Button */}
          <button
            onClick={() => onSpeedChange(1.0)}
            className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors"
          >
            Reset to 100%
          </button>
        </div>
      )}
    </div>
  );
};