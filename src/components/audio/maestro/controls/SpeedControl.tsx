'use client';

/**
 * SpeedControl.tsx - V70 HORIZONTAL LAYOUT REDESIGN
 * Date: November 14th, 2025
 * 
 * MAJOR REDESIGN:
 * ✅ Speedometer icon moved to LEFT side
 * ✅ "100%" text to RIGHT of icon (horizontal layout)
 * ✅ Reduced font size: 16px → 13px (text-[13px])
 * ✅ "Speed" label aligns with other buttons below
 * ✅ Songsterr-style layout: Icon | Speed% (side-by-side)
 * ✅ May increase width slightly for better proportions
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
      {/* Speed Button - HORIZONTAL LAYOUT (Icon | Speed%) */}
      <button
        id="control-speed"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        disabled={!api}
        title="Open speed panel ((S)) | Change tempo ((Opt+1–8))"
        className={`
          flex flex-col items-center justify-center gap-0.5 px-3 w-[94px] h-[74px]
          rounded-lg transition-all duration-200
          ${isPanelOpen
            ? 'bg-blue-500/20 border-2 border-blue-400/50'
            : 'bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80'
          }
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Top Row: Icon + Speed (Horizontal) - Songsterr style */}
        <div className="flex items-center gap-1">
          {/* Speedometer Icon - LEFT SIDE */}
          <svg width="24" height="20" viewBox="0 0 32 24" className="text-blue-400 flex-shrink-0">
            {/* Semi-circle gauge background */}
            <path
              d="M 4 20 A 12 12 0 0 1 28 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.3"
            />
            
            {/* Active arc based on speed */}
            <path
              d="M 4 20 A 12 12 0 0 1 28 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${playbackSpeed * 37.7} 100`}
              opacity="0.8"
              className={playbackSpeed > 1 ? 'text-orange-400' : 'text-cyan-400'}
            />
            
            {/* Needle pointer - rotates based on speed */}
            <g transform={`rotate(${(playbackSpeed - 0.25) * 144 - 90}, 16, 20)`}>
              <line
                x1="16"
                y1="20"
                x2="16"
                y2="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-blue-300"
              />
              <circle cx="16" cy="20" r="2" fill="currentColor" className="text-blue-400" />
            </g>
          </svg>

          {/* Current Speed - RIGHT OF ICON (Reduced to 13px) */}
          <span className={`font-bold text-[13px] leading-tight ${
            playbackSpeed > 1 ? 'text-orange-400' : 'text-cyan-400'
          }`}>
            {Math.round(playbackSpeed * 100)}%
          </span>
        </div>
        
        {/* Bottom Row: Label - Aligns with other buttons */}
        <span className="text-xs text-gray-400 leading-tight">Speed</span>
      </button>

      {/* Speed Panel - Same as before */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-50">
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