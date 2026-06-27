'use client';

/**
 * PlaybackControls.tsx - V90: YOUTUBE LOGO + SMALLER BUTTON (Songsterr Style)
 * Date: January 5th, 2026
 * 
 * 🔧 NEW IN V90:
 * ✅ YouTube logo appears in play button when Original mode + paused
 * ✅ White YouTube logo (not red) matching Songsterr desktop style
 * ✅ Blue play triangle inside logo (matching app theme)
 * ✅ Play button reduced from 60x60 to 56x56 (better proportions)
 * ✅ SVG sizes adjusted proportionally
 * 
 * 🔒 PRESERVED FROM V89:
 * ✅ Vertical stacked toggles (Original/Synth)
 * ✅ Songsterr colors and styling
 * ✅ 74x44 toggle container
 * ✅ Orange active state
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
    <div id="c-play" className="flex items-center gap-2 [@media(max-width:711px)]:gap-1 h-[74px]">
      {/* 🆕 V90: Play/Pause Button - 56x56 (reduced from 60x60) */}
      <button
        id="control-play"
        onClick={onPlayPause}
        disabled={!api}
        aria-pressed={isPlaying}
        className={`
          group relative w-[56px] h-[56px] rounded-full flex items-center justify-center
          transition-all duration-200 flex-shrink-0
          ${isPlaying
            ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-400/40'
            : 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/40'
          }
          ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-2xl'}
        `}
      >
        {/* 🆕 V90: YouTube Logo when Original mode + paused (WHITE like Songsterr) */}
        {!isPlaying && audioSource === 'original' ? (
          <svg width="30" height="30" viewBox="0 0 68 48" className="text-white">
            {/* White rounded rectangle background (not red, matching Songsterr) */}
            <path
              d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,0,34,0,34,0S12.21,0,6.9,1.55 c-2.93,0.78-4.63,3.26-5.42,6.19C0,13.05,0,24,0,24s0,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,48,34,48,34,48s21.79,0,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C68,34.95,68,24,68,24S68,13.05,66.52,7.74z"
              fill="white"
            />
            {/* Blue play triangle (matching theme) */}
            <path d="M 45,24 27,14 27,34" fill="#0ea5e9" />
          </svg>
        ) : (
          /* Standard play/pause icons for Synth mode OR when playing */
          <svg width="26" height="26" viewBox="0 0 32 32" className="text-white" fill="currentColor">
            {isPlaying ? (
              <>
                <rect x="10" y="8" width="4" height="16" rx="1" />
                <rect x="18" y="8" width="4" height="16" rx="1" />
              </>
            ) : (
              <path d="M11 8l12 8-12 8V8z" />
            )}
          </svg>
        )}

        {/* 🎯 TOOLTIP - WIDE FORMAT */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>{isPlaying ? 'Pause' : 'Play'} <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">Space</kbd></div>
        </div>
      </button>

      {/* 🎯 SONGSTERR EXACT: VERTICAL STACKED TOGGLE (74x44 container) */}
      {showAudioToggle && (
        <div className="flex flex-col h-[44px] w-[74px] [@media(max-width:711px)]:w-[67px] flex-shrink-0 flex-grow-0 rounded-sm transition-all hover:ring-1 hover:ring-cyan-300/40">

          {/* 🔝 ORIGINAL Button (top half - 74x22) */}
          <button
            onClick={() => onAudioSourceChange?.('original')}
            disabled={!api}
            className={`
              group relative
              h-[22px] w-[74px] [@media(max-width:711px)]:w-[67px]
              flex items-center justify-center
              transition-all duration-200
              flex-shrink-0 flex-grow-0
              ${audioSource === 'original'
                ? 'bg-linear-to-b from-black/70 to-black/95 border-orange-400 text-orange-400 font-bold shadow-[inset_0_0_0_1px_rgba(255,237,213,0.28),inset_0_0_6px_rgba(249,115,22,0.22),0_0_10px_rgba(249,115,22,0.42),0_0_18px_rgba(251,146,60,0.18)]'
                : 'bg-[#60687d]/70 border-[#767f96]/40 text-white/90 hover:text-cyan-300 hover:bg-[#767f96]/75 hover:border-cyan-300/40'
              }
              ${!api ? 'opacity-50 cursor-not-allowed' : ''}
              rounded-t-[2px]
              border border-b-0
            `}
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
              h-[22px] w-[74px] [@media(max-width:711px)]:w-[67px]
              flex items-center justify-center
              transition-all duration-200
              flex-shrink-0 flex-grow-0
              ${audioSource === 'synth'
                ? 'bg-linear-to-b from-black/70 to-black/95 border-orange-400 text-orange-400 font-bold shadow-[inset_0_0_0_1px_rgba(255,237,213,0.28),inset_0_0_6px_rgba(249,115,22,0.22),0_0_10px_rgba(249,115,22,0.42),0_0_18px_rgba(251,146,60,0.18)]'
                : 'bg-[#60687d]/70 border-[#767f96]/40 text-white/90 hover:text-cyan-300 hover:bg-[#767f96]/75 hover:border-cyan-300/40'
              }
              ${!api ? 'opacity-50 cursor-not-allowed' : ''}
              rounded-b-[2px]
              border
            `}
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