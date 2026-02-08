'use client';

/**
 * TrackMixerPanel.tsx - V99.0: BAND PROTECTION + TRUTH IN LOGGING
 * Date: February 6th, 2026
 * 
 * 🎯 NEW IN V99.0:
 * ✅ Track change uses visibleTracks (not renderTracks) - preserves full band audio
 * ✅ Removed auto-solo on track change - band plays continuously
 * ✅ Solo toggle uses visibleTracks + render (not renderTracks) - no engine narrowing
 * ✅ Updated logs to show Visible vs Engine track counts (prevents confusion)
 * ✅ Band restore on unsolo with explicit unmute
 * 
 * 🔒 PRESERVED FROM V98.62:
 * ✅ Master volume control functionality
 * ✅ Expandable drawer for individual track volumes
 * ✅ Compact Songsterr-style 48px top row
 * ✅ Mute/Solo buttons with engine sync
 * ✅ Volume sliders (0-16 range) for each track
 */

import React, { useState, useEffect } from 'react';
import type { TrackMixerPanelProps } from './MaestroControlTypes';

interface ExtendedTrackMixerPanelProps extends TrackMixerPanelProps {
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
}

export const TrackMixerPanel: React.FC<ExtendedTrackMixerPanelProps> = ({
  api,
  tracks,
  selectedTrack,
  trackMuteState,
  trackSoloState,
  onTrackChange,
  onMuteToggle,
  onSoloToggle,
  isPanelOpen = false,
  onTogglePanel,
  masterVolume = 1.0,
  onMasterVolumeChange,
}) => {
  const currentTrack = tracks[selectedTrack];
  const instrumentIcon = '🎸';

  // Local state for volume drawer and AI AutoSwitch
  const [isVolumeDrawerOpen, setIsVolumeDrawerOpen] = useState(false);
  const [isAIAutoSwitchEnabled, setIsAIAutoSwitchEnabled] = useState(false);

  // 🐛 DEBUG: Log when masterVolume prop changes
  useEffect(() => {
    console.log(`🎚️ V99.0: TrackMixerPanel received masterVolume prop: ${masterVolume}`);
    console.log(`🎚️ V99.0: onMasterVolumeChange callback: ${onMasterVolumeChange ? 'EXISTS ✅' : 'MISSING ❌'}`);
  }, [masterVolume, onMasterVolumeChange]);

  const handleToggle = () => {
    if (onTogglePanel) {
      onTogglePanel();
    }
  };

  const handleClose = () => {
    if (onTogglePanel && isPanelOpen) {
      onTogglePanel();
    }
    setIsVolumeDrawerOpen(false);
  };

  // ============================================
  // 🎯 V99.0: TRACK CHANGE - VISUAL ISOLATION WITHOUT AUDIO DESTRUCTION
  // Uses visibleTracks instead of renderTracks to preserve full band audio
  // ============================================
  const handleTrackChange = (trackIndex: number) => {
    onTrackChange(trackIndex);

    if (api?.score?.tracks?.length) {
      const selectedTrack = api.score.tracks[trackIndex];

      // ❌ OLD WAY (BAND THIEF): 
      // api.changeTrackSolo([selectedTrack], true);  // <- This muted the band!
      // api.renderTracks([selectedTrack]);           // <- This narrowed engine to 1 track!

      // ✅ V99.0 MAESTRO WAY: Toggle visibility without destroying audio engine
      api.settings.notation.visibleTracks = [selectedTrack.index];
      api.updateSettings();
      api.render();

      console.log(`🎯 V99.0: Visual switch to ${selectedTrack.name}`);
      console.log(`   - Notation: 1 track visible`);
      console.log(`   - Audio Engine: ${api.score.tracks.length} tracks active 🎸🥁🎤`);
      console.log(`   - Solo Mode: ${selectedTrack.playbackInfo?.isSolo ? 'ACTIVE' : 'OFF'}`);

      // 🔍 DEBUG: Verify band is still in engine (use score.tracks, not __at.tracks)
      if (typeof window !== 'undefined' && (window as any).__at) {
        const visibleTracks = (window as any).__at.tracks?.length;
        const engineTracks = (window as any).__at.score?.tracks?.length;
        console.log(`🛡️ V99.0: Visible: ${visibleTracks}, Engine: ${engineTracks}`);
      }
    }
  };

  // ============================================
  // 🎯 V99.0: SOLO TOGGLE - AUDIO ONLY (NO ENGINE NARROWING)
  // Uses changeTrackSolo for audio, visibleTracks for visuals
  // NEVER calls renderTracks (prevents engine collapse)
  // ============================================
  const handleSoloToggle = (trackIndex: number) => {
    // 1. Update React state (so 'S' button turns yellow)
    onSoloToggle(trackIndex);

    if (!api?.score?.tracks?.length) return;

    const track = api.score.tracks[trackIndex];
    const isCurrentlySoloed = trackSoloState.get(trackIndex);
    const willBeSoloed = !isCurrentlySoloed;

    if (willBeSoloed) {
      // ✅ AUDIO ONLY: Solo the track
      api.changeTrackSolo([track], true);

      // ✅ VISUAL: Keep notation focused on this track
      api.settings.notation.visibleTracks = [track.index];
      api.updateSettings();
      api.render(); // Refresh visuals WITHOUT narrowing engine

      console.log(`🎯 V99.0: AUDIO SOLO → ${track.name} (engine preserved at ${api.score.tracks.length} tracks)`);
    } else {
      // ✅ AUDIO: Clear solo on ALL tracks (defensive)
      api.changeTrackSolo(api.score.tracks, false);
      api.changeTrackMute(api.score.tracks, false);

      // ✅ VISUAL: Refresh (band is already unmuted)
      api.updateSettings();
      api.render();

      console.log(`🎯 V99.0: BAND RESTORED → Multi-track audio active (${api.score.tracks.length} tracks)`);
    }
  };

  // 🎵 V98.61: Master volume handler
  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);

    // IMMEDIATE: Set API directly (for instant audio response)
    if (api) {
      api.masterVolume = newVolume;
    }

    // ALSO: Call callback for React state (for slider sync)
    if (onMasterVolumeChange) {
      onMasterVolumeChange(newVolume);
    }

    console.log(`🔊 V99.0: Master volume → ${Math.round(newVolume * 100)}%`);
  };

  // 🎵 V98.61: Individual track volume handler
  const handleTrackVolumeChange = (trackIndex: number, volume: number) => {
    if (api?.score?.tracks[trackIndex]) {
      const track = api.score.tracks[trackIndex];
      api.changeTrackVolume([track], volume / 16);
      track.playbackInfo.volume = volume;
      console.log(`🔊 V99.0: ${track.name} volume → ${volume}/16`);
    }
  };

  // 🎵 V98.61: Reset all volumes
  const handleResetAllVolumes = () => {
    if (api?.score?.tracks) {
      api.score.tracks.forEach((track: any) => {
        if (track) {
          api.changeTrackVolume([track], 1.0);
          if (track.playbackInfo) {
            track.playbackInfo.volume = 16;
          }
        }
      });
      console.log('🔊 V99.0: Reset all track volumes to 16/16');
    }
  };

  return (
    <div id="mixer-button" className="relative z-[50] h-[74px] flex items-center">
      <button
        id="control-mixer"
        onClick={handleToggle}
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
          className={`text-blue-200/70 transition-transform flex-shrink-0 ${isPanelOpen ? 'rotate-180' : ''}`}
          fill="currentColor"
        >
          <path d="M6.5 8L0 0h13L6.5 8z" />
        </svg>

        {/* SONGSTERR TOOLTIP */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Show tracks <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">T</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Switch tracks <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Ctrl</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Shift</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">↓↑</kbd></div>
        </div>
      </button>

      {/* Track Dropdown Panel - Compact Songsterr-style */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 w-[630px] max-h-[580px] overflow-y-auto z-[100]">

          {/* 🎯 V98.62: COMPACT TOP ROW - Songsterr Style (48px height) */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-700 h-[48px]">

            {/* AI Track AutoSwitch - Left Side */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-medium text-purple-300 whitespace-nowrap">🤖 AI AutoSwitch</span>
              <span className="text-[10px] text-gray-500 italic">(P4)</span>
              <button
                onClick={() => setIsAIAutoSwitchEnabled(!isAIAutoSwitchEnabled)}
                disabled={true}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-not-allowed opacity-50 ${isAIAutoSwitchEnabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAIAutoSwitchEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
              </button>
            </div>

            {/* Spacer to push Master Volume to right */}
            <div className="flex-1" />

            {/* Master Volume - Right Side (narrower ~275px) */}
            <div className="flex items-center gap-2 w-[275px]">
              <button
                onClick={() => {
                  // Mute all tracks
                  if (api?.score?.tracks) {
                    api.score.tracks.forEach((track: any) => {
                      if (track) {
                        api.changeTrackMute([track], true);
                      }
                    });
                    console.log('🔇 V99.0: Muted all tracks');
                  }
                }}
                disabled={!api}
                className="text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title="Mute all tracks"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </button>
              <span className="text-xs font-medium text-blue-200 uppercase whitespace-nowrap">Master</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={handleMasterVolumeChange}
                disabled={!api}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-blue-200 w-10 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>

            {/* Volume Drawer Toggle - Right Side */}
            <button
              onClick={() => setIsVolumeDrawerOpen(!isVolumeDrawerOpen)}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors"
              title="Individual track volumes"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className={`text-blue-300 transition-transform ${isVolumeDrawerOpen ? 'rotate-180' : ''}`}
                fill="currentColor"
              >
                <path d="M6 9L1 3h10L6 9z" />
              </svg>
            </button>

            {/* Close Button - Far Right */}
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-white transition-colors ml-1"
              aria-label="Close track selector"
            >
              ✕
            </button>
          </div>

          {/* 🎵 V98.62: VOLUME DRAWER - Expandable */}
          {isVolumeDrawerOpen && (
            <div className="mb-3 space-y-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Track Volumes (0-16)</span>
                <button
                  onClick={handleResetAllVolumes}
                  disabled={!api}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] font-bold text-white transition-colors"
                >
                  Reset All
                </button>
              </div>

              {tracks.map((track, idx) => {
                const trackVolume = api?.score?.tracks[idx]?.playbackInfo?.volume ?? 16;

                return (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <span className="text-[11px] text-gray-300 truncate w-32">
                      {track.name}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      value={trackVolume}
                      onChange={(e) => handleTrackVolumeChange(idx, parseInt(e.target.value))}
                      disabled={!api}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-[11px] text-gray-400 w-8 text-right">
                      {trackVolume}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 🎵 Scrollable Track List - Compact */}
          <div className="space-y-1.5">
            {tracks.map((track, idx) => {
              const isMuted = trackMuteState.get(idx) || false;
              const isSoloed = trackSoloState.get(idx) || false;
              const isSelected = idx === selectedTrack;

              return (
                <div
                  key={idx}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg transition-all
                    ${isSelected
                      ? 'bg-blue-500/20 border border-blue-400/40'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                    }
                  `}
                >
                  {/* Track Name - Clickable */}
                  <button
                    onClick={() => handleTrackChange(idx)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    <span className="text-base">🎸</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-200' : 'text-gray-200'
                        }`}>
                        {track.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Track {idx + 1}
                      </span>
                    </div>
                  </button>

                  {/* Mute Button */}
                  <button
                    onClick={() => onMuteToggle(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${isMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                  >
                    M
                  </button>

                  {/* Solo Button */}
                  <button
                    onClick={() => handleSoloToggle(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${isSoloed
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                  >
                    S
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