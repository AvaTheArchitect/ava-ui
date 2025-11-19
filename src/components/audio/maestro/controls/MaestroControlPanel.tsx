'use client';

/**
 * MaestroControlPanel.tsx - V87: Button Styling & Hover Tooltips
 * Date: November 18th, 2025
 * 
 * 🔧 NEW IN V87:
 * ✅ Updated button colors to text-blue-200 (#bfdbfe) - Simon's Guitar style
 * ✅ Added hover:brightness-125 for button hover effects
 * ✅ Added hover tooltips (black bg, white text, slight transparency)
 * ✅ TrackMixerPanel button width adjusted to 264px
 * ✅ All keyboard shortcuts displayed in tooltips
 * 
 * V86: Z-INDEX !IMPORTANT FIX
 * V79: Landscape UI fix
 * V77.2: Complete panel management
 * V77: Icon-only mobile buttons
 */

import React, { useState, useEffect } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

// 🔧 V79: Updated interface to include isMobileLandscape
export interface MaestroControlPanelProps {
  api: AlphaTabApi | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  tracks: Track[];
  selectedTrack: number;
  songInfo: SongInfo | null;
  isLooping: boolean;
  hasLoopSelection: boolean;
  audioSource: 'synth' | 'original';
  trackMuteState: Map<number, boolean>;
  trackSoloState: Map<number, boolean>;
  theme: 'light' | 'dark';
  isMobileLandscape: boolean; // 🔧 V79: NEW PROP
  onPlayPause: () => void;
  onStop: () => void;
  onLoopToggle: () => void;
  onLoopRangeChange: (start: number, end: number) => void;
  onSpeedChange: (speed: number) => void;
  onTrackChange: (trackIndex: number) => void;
  onAudioSourceChange: (source: 'synth' | 'original') => void;
  onTrackMuteToggle: (trackIndex: number) => void;
  onTrackSoloToggle: (trackIndex: number) => void;
  onThemeToggle: () => void;
}

export const MaestroControlPanel: React.FC<MaestroControlPanelProps> = (props) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // V77: Mobile panel states
  const [isTrackMixerOpen, setIsTrackMixerOpen] = useState(false);
  const [isSpeedPanelOpen, setIsSpeedPanelOpen] = useState(false);

  // V77.1: Close other panels when opening one
  const handleTrackMixerToggle = () => {
    if (!isTrackMixerOpen) {
      setIsSpeedPanelOpen(false); // Close speed panel
    }
    setIsTrackMixerOpen(!isTrackMixerOpen);
  };

  const handleSpeedToggle = () => {
    if (!isSpeedPanelOpen) {
      setIsTrackMixerOpen(false); // Close track mixer
    }
    setIsSpeedPanelOpen(!isSpeedPanelOpen);
  };

  // V77.1: Close all panels when playback starts (prevents interference)
  useEffect(() => {
    if (props.isPlaying) {
      setIsTrackMixerOpen(false);
      setIsSpeedPanelOpen(false);
      setIsDrawerOpen(false);
    }
  }, [props.isPlaying]);

  // V77.2: Handle Loop toggle - close other panels
  const handleLoopToggle = () => {
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    props.onLoopToggle();
  };

  // V77.2: Handle Gear menu - close other panels
  const handleGearToggle = () => {
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsDrawerOpen(true);
  };

  // Speed presets for mobile panel
  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  const currentBPM = props.songInfo ? Math.round(props.songInfo.tempo * props.playbackSpeed) : 0;

  return (
    <>
      {/* ==================== 🔧 V79: DESKTOP LAYOUT - CONDITIONAL RENDERING ==================== */}
      {/* Show TransportBar ONLY if NOT in mobile landscape AND screen is md or larger */}
      {!props.isMobileLandscape && (
        <div className="hidden md:block">
          <TransportBar {...props} />
        </div>
      )}

      {/* ==================== 🔧 V79: MOBILE LAYOUT - LANDSCAPE OVERRIDE ==================== */}
      {/* Show mobile UI if screen < md OR if isMobileLandscape is true */}
      <div className={props.isMobileLandscape ? 'block' : 'md:hidden'}>
        {/* 🔧 V86: CRITICAL FIX - Added ! prefix to force z-index above cursor */}
        <div className="fixed bottom-0 left-0 right-0 !z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm pb-safe">
          <div className="px-6 py-4 flex items-center justify-between">

            {/* 1. Track Mixer - 🆕 V87: 264px width with icon */}
            <div className="relative z-[50]">
              <button
                onClick={handleTrackMixerToggle}
                disabled={!props.api || props.tracks.length === 0}
                className={`group relative flex items-center justify-center w-[264px] h-[74px] transition-all disabled:opacity-50 ${isTrackMixerOpen ? 'text-blue-200' : 'text-blue-200 hover:brightness-125'
                  }`}
                title="Switch tracks"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>

                {/* 🆕 V87: Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[200]">
                  Switch tracks
                </div>
              </button>

              {/* Track Mixer Panel */}
              {isTrackMixerOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[320px] max-h-[400px] overflow-y-auto z-[100]">
                  <div className="flex items-center justify-between mb-3 sticky top-0 bg-gray-900/95 pb-2 border-b border-gray-700">
                    <span className="text-sm font-bold text-blue-200">Tracks ({props.tracks.length})</span>
                    <button onClick={() => setIsTrackMixerOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-2">
                    {props.tracks.map((track, idx) => {
                      const isMuted = props.trackMuteState.get(idx) || false;
                      const isSoloed = props.trackSoloState.get(idx) || false;
                      const isSelected = idx === props.selectedTrack;
                      return (
                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${isSelected ? 'bg-blue-500/20 border border-blue-400/50' : 'bg-gray-800/50'
                          }`}>
                          <button
                            onClick={() => { props.onTrackChange(idx); setIsTrackMixerOpen(false); }}
                            className="flex-1 flex items-center gap-2 text-left"
                          >
                            <span className="text-lg">🎸</span>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-300'}`}>{track.name}</span>
                              <span className="text-xs text-gray-500">Track {idx + 1}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => props.onTrackMuteToggle(idx)}
                            className={`px-3 py-1.5 rounded text-xs font-bold ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                          >{isMuted ? '🔇' : '🔊'}</button>
                          <button
                            onClick={() => props.onTrackSoloToggle(idx)}
                            className={`px-3 py-1.5 rounded text-xs font-bold ${isSoloed ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}
                          >{isSoloed ? '🎯' : '👥'}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Speed Control - 🆕 V87: Updated colors & tooltip */}
            <div className="relative z-[50]">
              <button
                onClick={handleSpeedToggle}
                disabled={!props.api}
                className={`group relative p-2 transition-all disabled:opacity-50 ${isSpeedPanelOpen ? 'text-blue-200' : 'text-blue-200 hover:brightness-125'
                  }`}
                title="Playback speed"
              >
                <svg width="28" height="24" viewBox="0 0 32 24">
                  <path d="M 4 20 A 12 12 0 0 1 28 20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                  <path d="M 4 20 A 12 12 0 0 1 28 20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${props.playbackSpeed * 37.7} 100`} opacity="0.9" />
                  <g transform={`rotate(${(props.playbackSpeed - 0.25) * 144 - 90}, 16, 20)`}>
                    <line x1="16" y1="16" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <circle cx="16" cy="16" r="2" fill="currentColor" />
                  </g>
                </svg>

                {/* 🆕 V87: Hover Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[200]">
                  Change tempo <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-xs">Opt</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-xs">1-8</kbd>
                </div>
              </button>

              {/* Speed Panel */}
              {isSpeedPanelOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-[100]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-200">Speed</span>
                    <button onClick={() => setIsSpeedPanelOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  {props.songInfo && (
                    <div className="mb-4 text-center">
                      <div className="text-2xl font-bold text-blue-200">{currentBPM} BPM</div>
                      <div className="text-xs text-gray-500">Original: {props.songInfo.tempo} BPM</div>
                    </div>
                  )}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0.25"
                      max="1.5"
                      step="0.05"
                      value={props.playbackSpeed}
                      onChange={(e) => props.onSpeedChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {speedPresets.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => props.onSpeedChange(speed)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold ${props.playbackSpeed === speed ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                          }`}
                      >{Math.round(speed * 100)}%</button>
                    ))}
                  </div>
                  <button
                    onClick={() => props.onSpeedChange(1.0)}
                    className="w-full mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold"
                  >Reset to 100%</button>
                </div>
              )}
            </div>

            {/* 3. Loop Control - 🆕 V87: Updated colors & tooltip */}
            <button
              onClick={handleLoopToggle}
              disabled={!props.api}
              className={`group relative p-2 transition-all disabled:opacity-50 ${props.isLooping ? 'text-green-400' : 'text-blue-200 hover:brightness-125'
                }`}
              title="Toggle loop"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>

              {/* 🆕 V87: Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[200]">
                Loop <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-xs">L</kbd>
              </div>
            </button>

            {/* 4. Play/Pause - 🆕 V87: Updated colors & tooltip */}
            <button
              onClick={props.onPlayPause}
              disabled={!props.api}
              className={`group relative p-2 transition-all disabled:opacity-50 ${props.isPlaying ? 'text-orange-400 hover:brightness-125' : 'text-blue-200 hover:brightness-125'
                }`}
              title={props.isPlaying ? 'Pause' : 'Play'}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                {props.isPlaying ? (
                  <>
                    <rect x="7" y="5" width="3" height="14" rx="1" />
                    <rect x="14" y="5" width="3" height="14" rx="1" />
                  </>
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>

              {/* 🆕 V87: Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[200]">
                {props.isPlaying ? 'Pause' : 'Play'} <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-xs">Space</kbd>
              </div>
            </button>

            {/* 5. Gear Menu - Settings - 🆕 V87: Updated colors & tooltip */}
            <button
              onClick={handleGearToggle}
              className="group relative p-2 text-blue-200 hover:brightness-125 transition-all"
              title="More options"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>

              {/* 🆕 V87: Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[200]">
                More options
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Drawer - Settings Menu */}
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          audioSource={props.audioSource}
          theme={props.theme}
          onAudioSourceChange={props.onAudioSourceChange}
          onThemeToggle={props.onThemeToggle}
        />
      </div>
    </>
  );
};