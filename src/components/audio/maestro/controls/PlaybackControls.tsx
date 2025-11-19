'use client';

/**
 * PlaybackControls.tsx - V89: VERTICAL STACKED TOGGLES (Songsterr Style)
 * Date: November 19th, 2025
 * 
 * 🔧 NEW IN V89:
 * ✅ Toggle buttons STACKED VERTICALLY (Original on top, Synth below)
 * ✅ Single container: 74x44 (matching Songsterr exactly)
 * ✅ Each button: 74x22 (half height)
 * ✅ Removed gap-0, using flex-col
 * ✅ Top button: rounded-t-[2px], bottom: rounded-b-[2px]
 * 
 * KEPT FROM V88:
 * ✅ Exact Songsterr colors: bg-[rgb(96,104,125)]
 * ✅ Active button = ORANGE text
 * ✅ flex-shrink-0 to prevent resizing
 * ✅ Font-weight: 300
 */

import React from 'react';
import type { PlaybackControlsProps } from './MaestroControlTypes';

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  api,
  isPlaying,
  audioSource,
  onPlayPause,
  onStop,
  onAudioSourceChange,
  showAudioToggle = true,
}) => {
  return (
    <div id="c-play" className="flex items-center gap-2 h-[74px]">
      {/* Play/Pause Button - 60x60 circle */}
      <button
        id="control-play"
        onClick={onPlayPause}
        disabled={!api}
        aria-pressed={isPlaying}
        className={`
          group relative w-[60px] h-[60px] rounded-full flex items-center justify-center
          transition-all duration-200 flex-shrink-0
          ${isPlaying
            ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-400/40'
            : 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/40'
          }
          ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-2xl'}
        `}
      >
        <svg width="28" height="28" viewBox="0 0 32 32" className="text-white" fill="currentColor">
          {isPlaying ? (
            <>
              <rect x="10" y="8" width="4" height="16" rx="1" />
              <rect x="18" y="8" width="4" height="16" rx="1" />
            </>
          ) : (
            <path d="M11 8l12 8-12 8V8z" />
          )}
        </svg>

        {/* 🎯 TOOLTIP - WIDE FORMAT */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>{isPlaying ? 'Pause' : 'Play'} <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">Space</kbd></div>
        </div>
      </button>

      {/* 🎯 SONGSTERR EXACT: VERTICAL STACKED TOGGLE (74x44 container) */}
      {showAudioToggle && (
        <div className="flex flex-col h-[44px] w-[74px] flex-shrink-0 flex-grow-0">

          {/* 🔝 ORIGINAL Button (top half - 74x22) */}
          <button
            onClick={() => onAudioSourceChange?.('original')}
            disabled={!api}
            className={`
              group relative
              h-[22px] w-[74px]
              flex items-center justify-center
              transition-all duration-200
              flex-shrink-0 flex-grow-0
              ${audioSource === 'original'
                ? 'bg-[rgb(96,104,125)] text-orange-500'
                : 'bg-gray-700/30 text-blue-400/70'
              }
              ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[rgb(106,114,135)]'}
              rounded-t-[2px]
              border border-gray-600/50 border-b-0
            `}
            style={{ fontWeight: 300 }}
          >
            <span className="text-[10px] uppercase tracking-wide">ORIGINAL</span>

            {/* 🎯 TOOLTIP */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
              <div>Original mode <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">2</kbd></div>
            </div>
          </button>

          {/* 🔽 SYNTH Button (bottom half - 74x22) */}
          <button
            onClick={() => onAudioSourceChange?.('synth')}
            disabled={!api}
            className={`
              group relative
              h-[22px] w-[74px]
              flex items-center justify-center
              transition-all duration-200
              flex-shrink-0 flex-grow-0
              ${audioSource === 'synth'
                ? 'bg-[rgb(96,104,125)] text-orange-500'
                : 'bg-gray-700/30 text-blue-400/70'
              }
              ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[rgb(106,114,135)]'}
              rounded-b-[2px]
              border border-gray-600/50
            `}
            style={{ fontWeight: 300 }}
          >
            <span className="text-[10px] uppercase tracking-wide">SYNTH</span>

            {/* 🎯 TOOLTIP */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
              <div>Synth mode <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">1</kbd></div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};