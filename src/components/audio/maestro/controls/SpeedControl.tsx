'use client';

/**
 * SpeedControl.tsx - V92.2: FIXED GREEN INDICATOR
 * Date: December 29th, 2025
 * 
 * 🔧 NEW IN V92.2:
 * ✅ FIXED: Icon now properly turns GREEN when panel opens
 * ✅ Removed hardcoded className from needle/circle (use currentColor)
 * ✅ Background arc and needle inherit parent SVG color (green/blue)
 * ✅ Gauge fill still shows ORANGE when speed > 100%
 * 
 * 🔧 V91.3 FEATURES:
 * ✅ Zero-refraction stabilization (border-2 transparent)
 * ✅ No bobblehead bounce
 * ✅ Event propagation control
 * 
 * 🔒 PRESERVED FROM V87.2:
 * ✅ Label "SPEED" uppercase, 12px
 * ✅ Tooltip WIDE format
 * ✅ All speed presets
 */

import React, { useCallback } from 'react';
import type { SpeedControlProps } from './MaestroControlTypes';

interface ExtendedSpeedControlProps extends SpeedControlProps {
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
}

export const SpeedControl: React.FC<ExtendedSpeedControlProps> = ({
  api,
  playbackSpeed,
  songInfo,
  onSpeedChange,
  isPanelOpen = false,
  onTogglePanel,
}) => {
  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  const currentBPM = songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 0;

  const handleToggle = useCallback(() => {
    if (onTogglePanel) {
      onTogglePanel();
    }
  }, [onTogglePanel]);

  const handleClose = useCallback(() => {
    if (onTogglePanel && isPanelOpen) {
      onTogglePanel();
    }
  }, [onTogglePanel, isPanelOpen]);

  const handleSpeedChange = useCallback((speed: number) => {
    onSpeedChange(speed);
  }, [onSpeedChange]);

  const handleReset = useCallback(() => {
    onSpeedChange(1.0);
  }, [onSpeedChange]);

  return (
    <div id="c-speed" className="relative z-[50]">
      {/* Speed Button - 🔧 V92.1: Match Loop pattern (no wrapper color) */}
      <button
        id="control-speed"
        onClick={handleToggle}
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
          {/* 🔧 V92.2: Icon inherits green/blue, gauge shows orange >100% */}
          <svg width="24" height="18" viewBox="0 0 28 20" className={`flex-shrink-0 transition-colors ${isPanelOpen ? 'text-green-400' : 'text-blue-200'}`}>
            {/* Background arc - inherits parent color */}
            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            {/* Gauge fill - orange when speed > 100%, otherwise inherits parent */}
            <path 
              d="M 2 16 A 12 12 0 0 1 26 16" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeDasharray={`${playbackSpeed * 37.7} 100`} 
              opacity="0.9" 
              className={playbackSpeed > 1 ? 'text-orange-500' : ''} 
            />
            {/* Needle - inherits parent color (green when open, blue when closed) */}
            <g transform={`rotate(${(playbackSpeed - 0.25) * 144 - 90}, 14, 16)`}>
              <line x1="14" y1="16" x2="14" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="16" r="2" fill="currentColor" />
            </g>
          </svg>
          <span className="font-bold text-[13px] tabular-nums text-blue-200">
            {Math.round(playbackSpeed * 100)}%
          </span>
        </div>
        
        {/* 🔧 V92.1: Label stays blue-200/70 (static) */}
        <span className="text-[12px] uppercase text-blue-200/70 tracking-wide">SPEED</span>

        {/* TOOLTIP */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Open speed panel <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">S</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Change tempo <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Opt</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">1-8</kbd> | <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">A/D</kbd> for 1 bpm</div>
        </div>
      </button>

      {/* Speed Panel - 🔧 V91.3: ZERO-REFRACTION STABILIZATION */}
      {isPanelOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 🔧 V91.3: Added leading-none for title stability */}
          <div className="flex items-center justify-between mb-3 h-5">
            <span className="text-sm font-bold text-blue-200 leading-none">Playback Speed</span>
            <button 
              onClick={handleClose} 
              className="text-gray-500 hover:text-white leading-none" 
              aria-label="Close speed panel"
            >
              ✕
            </button>
          </div>

          {/* 🔧 V91.3: Fixed height (h-[52px]) with background for visual stability */}
          {songInfo && (
            <div className="mb-4 text-center h-[52px] flex flex-col justify-center bg-black/20 rounded-md">
              <div className="text-2xl font-bold text-blue-200 tabular-nums leading-tight">
                {currentBPM} <span className="text-lg">BPM</span>
              </div>
              <div className="text-[11px] text-gray-500 tabular-nums leading-none mt-1">
                Original: {songInfo.tempo} BPM
              </div>
            </div>
          )}

          {/* 🔧 V91.3: Fixed slider container height */}
          <div className="mb-5 h-6 flex items-center">
            <input 
              type="range" 
              min="0.25" 
              max="1.5" 
              step="0.05" 
              value={playbackSpeed} 
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400" 
            />
          </div>

          {/* 🔧 V91.3: CRITICAL FIX - Always-on border-2 prevents height jump */}
          <div className="grid grid-cols-3 gap-2 h-[84px]">
            {speedPresets.map((speed) => (
              <button 
                key={speed} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeedChange(speed);
                }}
                /* 🔧 V91.3 CRITICAL: Always border-2, transparent when inactive.
                   This prevents the 4px height jump (2px top + 2px bottom) */
                className={`px-2 py-2 rounded-lg text-sm font-bold tabular-nums transition-all border-2 ${
                  Math.abs(playbackSpeed - speed) < 0.01
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'bg-gray-800 text-gray-400 border-transparent hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                {Math.round(speed * 100)}%
              </button>
            ))}
          </div>

          {/* 🔧 V91.3: Fixed height reset button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="w-full mt-3 h-10 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold transition-colors border-2 border-transparent"
          >
            Reset to 100%
          </button>
        </div>
      )}
    </div>
  );
};