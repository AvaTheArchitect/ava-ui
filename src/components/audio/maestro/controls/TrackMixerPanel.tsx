'use client';

/**
 * TrackMixerPanel.tsx — V102.3: TWO-STAGE BREAKPOINTS + CHEVRON FIX
 * Date: March 19th, 2026
 *
 * 🆕 V102.3 UPDATES:
 * ✅ Compact trigger breakpoint: 960px → 1200px (collapses BEFORE label hide at 960px)
 * ✅ Compact chevron: points UP when closed (rotate-180 default), DOWN when open — matches Songsterr
 * ✅ Compression order now correct: mixer collapses first → labels hide second → More lane last
 *
 * 🔒 PRESERVED FROM V102.2:
 * ✅ HeadstockIcon PNG from public/icons/lag-guitar-headstock.png
 * ✅ Full desktop (≥1201px): w-[264px] rich layout
 * ✅ Compact desktop (≤1200px): w-[86px] icon + chevron only
 * ✅ Panel popup — UNTOUCHED
 * ✅ All audio/volume/track logic — UNTOUCHED
 */

import React, { useState, useRef } from 'react';
import type { TrackMixerPanelProps } from './MaestroControlTypes';

interface ExtendedTrackMixerPanelProps extends TrackMixerPanelProps {
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
}

// HeadstockIcon — loads from public/icons/lag-guitar-headstock.png
// brightness(0) crushes original colors to black, then chain colorizes to blue-200.
const HeadstockIcon = ({ className }: { className?: string }) => (
  <img
    src="/icons/lag-guitar-headstock.png"
    alt=""
    aria-hidden="true"
    width={22}
    height={40}
    className={className}
    style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(190deg) brightness(1.4)' }}
  />
);

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
  const [isVolumeDrawerOpen, setIsVolumeDrawerOpen] = useState(false);
  const [isAIAutoSwitchEnabled, setIsAIAutoSwitchEnabled] = useState(false);

  const handleToggle = () => onTogglePanel?.();

  const handleClose = () => {
    if (isPanelOpen) onTogglePanel?.();
    setIsVolumeDrawerOpen(false);
  };

  const handleTrackChange = (trackIndex: number) => {
    onTrackChange(trackIndex);
    console.log(`🎯 V102.3: Track change → ${trackIndex} (${tracks[trackIndex]?.name ?? 'Unknown'})`);
  };

  // ── EXECUTION VERIFY: log fires BEFORE onSoloToggle so a crash/short-circuit
  //    in the handler doesn't hide the click. If 🔴 SOLO BUTTON CLICK appears
  //    but 🔴 ENTER handleTrackSoloToggle does NOT → prop is stale/wrong handler.
  const handleSoloToggle = (trackIndex: number) => {
    console.log(`🔴 SOLO BUTTON CLICK in TrackMixerPanel — trackIndex=${trackIndex} "${tracks[trackIndex]?.name ?? 'Unknown'}"`);
    onSoloToggle(trackIndex);
    console.log(`🎯 V102.3: Solo toggle → ${trackIndex} (${tracks[trackIndex]?.name ?? 'Unknown'})`);
  };

  const masterVolumeThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMasterVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (api) api.masterVolume = vol;
    if (masterVolumeThrottleRef.current) clearTimeout(masterVolumeThrottleRef.current);
    masterVolumeThrottleRef.current = setTimeout(() => {
      onMasterVolumeChange?.(vol);
    }, 50);
  };

  const handleTrackVolumeChange = (trackIndex: number, volume: number) => {
    if (api?.score?.tracks[trackIndex]) {
      const track = api.score.tracks[trackIndex];
      api.changeTrackVolume([track], volume / 16);
      track.playbackInfo.volume = volume;
      console.log(`🔊 V102.3: ${track.name} volume → ${volume}/16`);
    }
  };

  const handleResetAllVolumes = () => {
    if (api?.score?.tracks) {
      api.score.tracks.forEach((track: any) => {
        if (track) {
          api.changeTrackVolume([track], 1.0);
          if (track.playbackInfo) track.playbackInfo.volume = 16;
        }
      });
      console.log('🔊 V102.3: Reset all track volumes to 16/16');
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
          group relative flex items-center h-[44px] rounded-sm transition-all duration-200
          w-[264px] [@media(max-width:1200px)]:w-[86px]
          px-4 [@media(max-width:1200px)]:px-0
          gap-3 [@media(max-width:1200px)]:gap-0
          ${isPanelOpen
            ? 'bg-blue-500/10 border-2 border-blue-400/30'
            : 'bg-blue-500/5 border border-blue-300/20 hover:border-cyan-300/40 hover:bg-cyan-300/5'
          }
          ${!api || tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* ── COMPACT STATE (≤1200px): headstock icon + chevron only ── */}
        <div className="hidden [@media(max-width:1200px)]:flex items-center w-full h-full">
          {/* Icon cell — 46px */}
          <div className="flex items-center justify-center w-[46px] h-full">
            <HeadstockIcon className="text-blue-200" />
          </div>
          {/* Chevron cell — 40px. Points UP when closed (panel is above), DOWN when open */}
          <div className="flex items-center justify-center w-[40px] h-full">
            <svg
              width="13" height="8" viewBox="0 0 13 8"
              className={`transition-all shrink-0 ${isPanelOpen ? 'text-green-400' : 'text-blue-300/70 group-hover:text-cyan-300/70'} ${isPanelOpen ? '' : 'rotate-180'}`}
              fill="currentColor"
            >
              <path d="M6.5 8L0 0h13L6.5 8z" />
            </svg>
          </div>
        </div>

        {/* ── FULL DESKTOP STATE (≥1201px): headstock SVG + track info + chevron ── */}
        <div className="flex [@media(max-width:1200px)]:hidden items-center gap-3 w-full">
          <HeadstockIcon className="text-blue-200 flex-shrink-0" />
          <div className="flex flex-col items-start text-left gap-0.5 flex-1 min-w-0">
            <div className={`text-sm font-bold leading-tight truncate w-full transition-colors ${isPanelOpen ? 'text-green-400' : 'text-blue-300 group-hover:text-cyan-300'}`}>
              {currentTrack?.name || 'No Track'}
            </div>
            <div className={`text-[12px] uppercase leading-tight whitespace-nowrap tracking-wide transition-colors ${isPanelOpen ? 'text-green-400/70' : 'text-blue-300/60 group-hover:text-cyan-300/80'}`}>
              TRACK {selectedTrack + 1} OF {tracks.length}
            </div>
          </div>
          {/* Full desktop chevron — UP when closed (panel opens above), DOWN when open */}
          <svg
            width="13" height="8" viewBox="0 0 13 8"
            className={`transition-all shrink-0 ${isPanelOpen ? 'text-green-400' : 'text-blue-300/70 group-hover:text-cyan-300/70'} ${isPanelOpen ? '' : 'rotate-180'}`}
            fill="currentColor"
          >
            <path d="M6.5 8L0 0h13L6.5 8z" />
          </svg>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Show tracks <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">T</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Switch tracks <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Ctrl</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Shift</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">↓↑</kbd></div>
        </div>
      </button>

      {/* ── Panel popup — UNTOUCHED ── */}
      {isPanelOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 w-[630px] max-h-[580px] overflow-y-auto z-[100]">

          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-700 h-[48px]">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs font-medium text-purple-300 whitespace-nowrap">🤖 AI AutoSwitch</span>
              <span className="text-[10px] text-gray-500 italic">(P4)</span>
              <button
                onClick={() => setIsAIAutoSwitchEnabled(!isAIAutoSwitchEnabled)}
                disabled={true}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-not-allowed opacity-50 ${isAIAutoSwitchEnabled ? 'bg-purple-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isAIAutoSwitchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 w-[275px]">
              <button
                onClick={() => {
                  if (api?.score?.tracks) {
                    api.score.tracks.forEach((track: any) => {
                      if (track) api.changeTrackMute([track], true);
                    });
                    console.log('🔇 V102.3: Muted all tracks');
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
                type="range" min="0" max="1" step="0.01"
                value={masterVolume}
                onChange={handleMasterVolumeChange}
                disabled={!api}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs text-blue-200 w-10 text-right">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
            <button
              onClick={() => setIsVolumeDrawerOpen(!isVolumeDrawerOpen)}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 hover:bg-gray-700/50 rounded transition-colors"
              title="Individual track volumes"
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                className={`text-blue-300 transition-transform ${isVolumeDrawerOpen ? 'rotate-180' : ''}`}
                fill="currentColor"
              >
                <path d="M6 9L1 3h10L6 9z" />
              </svg>
            </button>
            <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors ml-1" aria-label="Close">✕</button>
          </div>

          {isVolumeDrawerOpen && (
            <div className="mb-3 space-y-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Track Volumes (0–16)</span>
                <button
                  onClick={handleResetAllVolumes}
                  disabled={!api}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-[10px] font-bold text-white transition-colors"
                >
                  Reset All
                </button>
              </div>
              {tracks.map((track, idx) => {
                const vol = api?.score?.tracks[idx]?.playbackInfo?.volume ?? 16;
                return (
                  <div key={idx} className="flex items-center gap-2 py-1">
                    <span className="text-[11px] text-gray-300 truncate w-32">{track.name}</span>
                    <input
                      type="range" min="0" max="16"
                      value={vol}
                      onChange={(e) => handleTrackVolumeChange(idx, parseInt(e.target.value))}
                      disabled={!api}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <span className="text-[11px] text-gray-400 w-8 text-right">{vol}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            {tracks.map((track, idx) => {
              const isMuted = trackMuteState.get(idx) || false;
              const isSoloed = trackSoloState.get(idx) || false;
              const isSelected = idx === selectedTrack;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all
                    ${isSelected ? 'bg-blue-500/20 border border-blue-400/40' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}
                >
                  <button onClick={() => handleTrackChange(idx)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                    <span className="text-base">🎸</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-xs font-medium truncate ${isSelected ? 'text-blue-200' : 'text-gray-200'}`}>{track.name}</span>
                      <span className="text-[10px] text-gray-500">Track {idx + 1}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => onMuteToggle(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >M</button>
                  <button
                    onClick={() => handleSoloToggle(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${isSoloed ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                  >S</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};