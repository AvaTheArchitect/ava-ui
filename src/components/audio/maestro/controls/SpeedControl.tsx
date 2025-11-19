'use client';

/**
 * SpeedControl.tsx - V87.2: Label Fix + Wide Tooltip
 * Date: November 18th, 2025
 * 
 * 🔧 NEW IN V87.2:
 * ✅ Label "SPEED" uppercase, 12px (was 10px)
 * ✅ Tooltip WIDE not tall (flex layout)
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
    <div id="c-speed" className="relative z-[50]">
      {/* Speed Button */}
      <button
        id="control-speed"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        disabled={!api}
        className={`
          group relative flex flex-col items-center justify-center gap-1 px-3 py-2 h-[74px] w-[94px]
          transition-all duration-200 hover:brightness-125
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Icon + Percentage */}
        <div className="flex items-center justify-center gap-2">
          <svg width="24" height="18" viewBox="0 0 28 20" className="text-blue-200 flex-shrink-0">
            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${playbackSpeed * 37.7} 100`} opacity="0.9" className={playbackSpeed > 1 ? 'text-orange-500' : 'text-blue-200'} />
            <g transform={`rotate(${(playbackSpeed - 0.25) * 144 - 90}, 14, 16)`}>
              <line x1="14" y1="16" x2="14" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-200" />
              <circle cx="14" cy="16" r="2" fill="currentColor" className="text-blue-200" />
            </g>
          </svg>
          <span className={`font-bold text-[13px] ${playbackSpeed > 1 ? 'text-orange-400' : 'text-blue-200'}`}>
            {Math.round(playbackSpeed * 100)}%
          </span>
        </div>
        
        {/* 🔧 V87.2: SPEED uppercase, 12px */}
        <span className="text-[12px] uppercase text-blue-200/70 tracking-wide">SPEED</span>

        {/* 🎯 TOOLTIP - WIDE FORMAT */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Open speed panel <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">S</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Change tempo <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Opt</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">1-8</kbd> | <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">A/D</kbd> for 1 bpm</div>
        </div>
      </button>

      {/* Speed Panel */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-blue-200">Playback Speed</span>
            <button onClick={() => setIsPanelOpen(false)} className="text-gray-500 hover:text-white" aria-label="Close speed panel">✕</button>
          </div>

          {songInfo && (
            <div className="mb-4 text-center">
              <div className="text-2xl font-bold text-blue-200">{currentBPM} BPM</div>
              <div className="text-xs text-gray-500">Original: {songInfo.tempo} BPM</div>
            </div>
          )}

          <div className="mb-4">
            <input type="range" min="0.25" max="1.5" step="0.05" value={playbackSpeed} onChange={(e) => onSpeedChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {speedPresets.map((speed) => (
              <button key={speed} onClick={() => onSpeedChange(speed)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${playbackSpeed === speed ? 'bg-blue-600 text-white border-2 border-blue-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                {Math.round(speed * 100)}%
              </button>
            ))}
          </div>

          <button onClick={() => onSpeedChange(1.0)} className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors">
            Reset to 100%
          </button>
        </div>
      )}
    </div>
  );
};