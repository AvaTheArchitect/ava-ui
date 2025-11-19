'use client';

/**
 * TrackMixerPanel.tsx - V90: 44px Button Height
 * Date: November 19th, 2025
 * 
 * 🔧 NEW IN V90:
 * ✅ Button outline height reduced from 74px to 44px (matches other buttons)
 * ✅ Container maintains 74px height for vertical alignment
 * ✅ Button centered vertically with items-center
 * 
 * KEPT FROM V87.2:
 * ✅ Panel size ~630px width (Songsterr size)
 * ✅ WIDE tooltip format
 * ✅ Label "TRACK" in 12px uppercase
 */

import React, { useState } from 'react';
import type { TrackMixerPanelProps } from './MaestroControlTypes';

export const TrackMixerPanel: React.FC<TrackMixerPanelProps> = ({
  api,
  tracks,
  selectedTrack,
  trackMuteState,
  trackSoloState,
  onTrackChange,
  onMuteToggle,
  onSoloToggle,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const currentTrack = tracks[selectedTrack];
  const instrumentIcon = '🎸';

  return (
    <div id="mixer-button" className="relative z-[50] h-[74px] flex items-center">
      {/* 🔧 V90: Button reduced to 44px height, container stays 74px for alignment */}
      <button
        id="control-mixer"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        disabled={!api || tracks.length === 0}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        className={`
          group relative flex items-center gap-3 px-4 w-[264px] h-[44px] rounded-lg transition-all duration-200
          ${isPanelOpen
            ? 'bg-blue-500/10 border-2 border-blue-400/30'
            : 'bg-blue-500/5 border border-blue-300/20 hover:bg-blue-500/10 hover:border-blue-400/30 hover:brightness-125'
          }
          ${!api || tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Instrument Icon */}
        <div className="text-2xl flex-shrink-0">{instrumentIcon}</div>

        {/* Track Info */}
        <div className="flex flex-col items-start text-left gap-0.5 flex-1 min-w-0">
          <div className="text-sm font-bold text-blue-200 leading-tight truncate w-full">
            {currentTrack?.name || 'No Track'}
          </div>
          <div className="text-[12px] uppercase text-blue-200/70 leading-tight whitespace-nowrap tracking-wide">
            TRACK {selectedTrack + 1} OF {tracks.length}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          width="13"
          height="8"
          viewBox="0 0 13 8"
          className={`text-blue-200/70 transition-transform flex-shrink-0 ${isPanelOpen ? 'rotate-180' : ''
            }`}
          fill="currentColor"
        >
          <path d="M6.5 8L0 0h13L6.5 8z" />
        </svg>

        {/* 🎯 SONGSTERR TOOLTIP - WIDE FORMAT */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Show tracks <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">T</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Switch tracks <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Ctrl</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Shift</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">↓↑</kbd></div>
        </div>
      </button>

      {/* Track Dropdown Panel - 🔧 V87.2: Increased to ~630px width */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 w-[630px] max-h-[692px] overflow-y-auto z-[100]">
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-gray-900/95 pb-2 border-b border-gray-700">
            <span className="text-sm font-bold text-blue-200">
              Tracks ({tracks.length})
            </span>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
              aria-label="Close track selector"
            >
              ✕
            </button>
          </div>

          {/* Scrollable track list */}
          <div className="space-y-2">
            {tracks.map((track, idx) => {
              const isMuted = trackMuteState.get(idx) || false;
              const isSoloed = trackSoloState.get(idx) || false;
              const isSelected = idx === selectedTrack;

              return (
                <div
                  key={idx}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isSelected
                      ? 'bg-blue-500/20 border border-blue-400/40'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                    }
                  `}
                >
                  {/* Track Name */}
                  <button
                    onClick={() => {
                      onTrackChange(idx);
                      setIsPanelOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <span className="text-lg">🎸</span>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm font-medium truncate ${isSelected ? 'text-blue-200' : 'text-gray-300'
                          }`}
                      >
                        {track.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Track {idx + 1}
                      </span>
                    </div>
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => onSoloToggle(idx)}
                    className={`
                      px-3 py-1.5 rounded text-xs font-bold transition-colors
                      ${isSoloed
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }
                    `}
                    title="Solo this track"
                  >
                    S
                  </button>

                  {/* Mute Button */}
                  <button
                    onClick={() => onMuteToggle(idx)}
                    className={`
                      px-3 py-1.5 rounded text-xs font-bold transition-colors
                      ${isMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }
                    `}
                    title="Mute this track"
                  >
                    M
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};