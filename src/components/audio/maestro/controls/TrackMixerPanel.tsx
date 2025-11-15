'use client';

/**
 * TrackMixerPanel.tsx - V76 Z-INDEX FIX
 * Date: November 15th, 2025
 * 
 * FIXES:
 * ✅ Dropdown z-index increased to z-[100] (above footer's z-50)
 * ✅ Ensures Track Mixer panel is always clickable on mobile
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
  const instrumentIcon = '🎸'; // TODO: Map track.name to actual instrument icons

  return (
    <div id="mixer-button" className="relative z-[50]">
      {/* Mixer Button - Shows Current Track */}
      <button
        id="control-mixer"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        disabled={!api || tracks.length === 0}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        title={`Show tracks ((T))`}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
          ${isPanelOpen
            ? 'bg-blue-500/20 border-2 border-blue-400/50'
            : 'bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80'
          }
          ${!api || tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Instrument Icon */}
        <div className="text-2xl">{instrumentIcon}</div>

        {/* Track Info */}
        <div className="flex flex-col items-start text-left">
          <div className="text-sm font-bold text-blue-200">
            {currentTrack?.name || 'No Track'}
          </div>
          <div className="text-xs text-gray-400">
            Track {selectedTrack + 1} of {tracks.length}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          width="13"
          height="8"
          viewBox="0 0 13 8"
          className={`text-gray-400 transition-transform ${isPanelOpen ? 'rotate-180' : ''
            }`}
          fill="currentColor"
        >
          <path d="M12.68 7.74a1 1 0 0 0 .06-1.42L7.38.5a1.95 1.95 0 0 0-.88-.4c-.24 0-.66.23-.88.4L.26 6.32a1 1 0 0 0 1.48 1.36l5.35-5.84c-.14.08-.46.26-.59.26-.13 0-.45-.18-.59-.26l5.35 5.84a1 1 0 0 0 1.42.06Z" />
        </svg>
      </button>

      {/* 🔧 V76: Track List Panel - Z-INDEX INCREASED TO z-[100] */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[400px] max-h-[500px] overflow-y-auto z-[100]">
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-gray-900/95 pb-2 border-b border-gray-700">
            <span className="text-sm font-bold text-blue-400">
              Track Mixer ({tracks.length} tracks)
            </span>
            <button
              onClick={() => setIsPanelOpen(false)}
              className="text-gray-500 hover:text-white"
              aria-label="Close mixer panel"
            >
              ✕
            </button>
          </div>

          {/* Track List */}
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
                      ? 'bg-blue-500/20 border border-blue-400/50'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                    }
                  `}
                >
                  {/* Track Select Button */}
                  <button
                    onClick={() => {
                      onTrackChange(idx);
                      setIsPanelOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <span className="text-lg">{instrumentIcon}</span>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-300'
                        }`}>
                        {track.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Track {idx + 1}
                      </span>
                    </div>
                  </button>

                  {/* Mute Button */}
                  <button
                    onClick={() => onMuteToggle(idx)}
                    className={`
                      px-3 py-1.5 rounded text-xs font-bold transition-all
                      ${isMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }
                    `}
                    title={isMuted ? 'Unmute track' : 'Mute track ((M))'}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => onSoloToggle(idx)}
                    className={`
                      px-3 py-1.5 rounded text-xs font-bold transition-all
                      ${isSoloed
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }
                    `}
                    title={isSoloed ? 'Unsolo track' : 'Solo track'}
                  >
                    {isSoloed ? '🎯' : '👥'}
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