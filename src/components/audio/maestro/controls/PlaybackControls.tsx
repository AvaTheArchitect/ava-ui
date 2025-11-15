'use client';

/**
 * PlaybackControls.tsx - V69 VERTICAL STACK LAYOUT
 * Date: November 14th, 2025
 * 
 * MAJOR CHANGES:
 * ✅ Synth/Original now STACKED VERTICALLY (like Songsterr Image 2)
 * ✅ Total height: 74px to match tray height
 * ✅ Play button: 60px diameter (fits within 74px)
 * ✅ Each audio option: ~33px tall (stacks to ~70px)
 * ✅ Maintains round play button (not square like Songsterr)
 * 
 * Core play/pause button with integrated Audio Source Toggle (desktop)
 * Follows Songsterr pattern: Play button + Audio source stacked vertically
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
      {/* Play/Pause Button - Reduced to 60px to fit 74px constraint */}
      <button
        id="control-play"
        onClick={onPlayPause}
        disabled={!api}
        aria-pressed={isPlaying}
        data-can-play={!!api}
        title={`Play ((Space)) | Stop ((S))`}
        className={`
          relative w-[60px] h-[60px] rounded-full flex items-center justify-center
          transition-all duration-200 flex-shrink-0
          ${isPlaying
            ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-400/40'
            : 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/40'
          }
          ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-2xl'}
        `}
      >
        {/* Play/Pause Icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          className="text-white"
          fill="currentColor"
        >
          {isPlaying ? (
            // Pause Icon
            <>
              <rect x="10" y="8" width="4" height="16" rx="1" />
              <rect x="18" y="8" width="4" height="16" rx="1" />
            </>
          ) : (
            // Play Icon
            <path d="M11 8l12 8-12 8V8z" />
          )}
        </svg>
      </button>

      {/* Audio Source Toggle - VERTICAL STACK (Like Songsterr Image 2) */}
      {showAudioToggle && (
        <div
          id="control-source"
          role="radiogroup"
          aria-label="Switch audio source. Press ((V)) to toggle"
          title="Switch audio source ((V))"
          className="flex flex-col gap-1 bg-gray-800/80 rounded-lg px-3 py-1.5 border border-gray-600 h-[70px] justify-center"
        >
          {/* Synth Option - TOP */}
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 transition-colors">
            <input
              type="radio"
              name="audio-source"
              value="synth"
              checked={audioSource === 'synth'}
              onChange={() => onAudioSourceChange('synth')}
              className="sr-only"
            />
            <span
              className={`
                w-3 h-3 rounded-full border-2 transition-colors flex-shrink-0
                ${audioSource === 'synth'
                  ? 'border-cyan-400 bg-cyan-400'
                  : 'border-gray-500 bg-transparent'
                }
              `}
            />
            <span
              className={`text-xs font-medium transition-colors whitespace-nowrap ${
                audioSource === 'synth' ? 'text-cyan-400' : 'text-gray-400'
              }`}
            >
              🎹 Synth
            </span>
          </label>

          {/* Original (YouTube) Option - BOTTOM */}
          <label className="flex items-center gap-2 cursor-not-allowed hover:bg-gray-700/50 rounded px-2 py-1 transition-colors opacity-60">
            <input
              type="radio"
              name="audio-source"
              value="original"
              checked={audioSource === 'original'}
              onChange={() => onAudioSourceChange('original')}
              className="sr-only"
              disabled // TODO: Remove when YouTube player implemented
            />
            <span
              className={`
                w-3 h-3 rounded-full border-2 transition-colors flex-shrink-0
                ${audioSource === 'original'
                  ? 'border-red-500 bg-red-500'
                  : 'border-gray-600 bg-transparent'
                }
              `}
            />
            <span
              className={`text-xs font-medium transition-colors whitespace-nowrap ${
                audioSource === 'original' ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              ▶️ Original
            </span>
          </label>
        </div>
      )}
    </div>
  );
};