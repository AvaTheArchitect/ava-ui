'use client';

/**
 * MaestroControlPanel.tsx - V99: RESTORED YOUTUBE LOGO SVG
 * Date: January 2nd, 2026
 * 
 * 🔧 NEW IN V99:
 * ✅ RESTORED proper YouTube logo SVG path from V93 (rounded rectangle, not ellipse)
 * ✅ Uses authentic YouTube logo path that matches Songsterr exactly
 * ✅ viewBox="0 0 68 48" for correct aspect ratio
 * 
 * 🔒 PRESERVED FROM V98:
 * ✅ All count-in functionality
 * ✅ All metronome functionality  
 * ✅ Diagnostic logging
 * ✅ Canvas click detection
 * ✅ Panel coordination
 * ✅ Desktop TransportBar with all props
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';
import type { MetronomeSoundType, SubdivisionMode } from './useSmartMetronome';

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
  isMobileLandscape: boolean;
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
  pitchShift?: number;
  onPitchShiftToggle?: (anchorRect: DOMRect) => void;
  // Count In props
  isCountInEnabled?: boolean;
  onCountInToggle?: () => void;
  countInMode?: 'three-beat' | 'four-beat';
  onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;
  // Metronome props
  isMetronomeEnabled?: boolean;
  onMetronomeToggle?: () => void;
  metronomeVolume?: number;
  onMetronomeVolumeChange?: (volume: number) => void;
  metronomeBalance?: number;
  onMetronomeBalanceChange?: (balance: number) => void;
  metronomeSubdivision?: SubdivisionMode;
  onMetronomeSubdivisionChange?: (subdivision: SubdivisionMode) => void;
  metronomeSoundType?: MetronomeSoundType;
  onMetronomeSoundTypeChange?: (sound: MetronomeSoundType) => void;
  metronomeAccentEnabled?: boolean;
  onMetronomeAccentToggle?: () => void;
  onArmMetronome?: () => Promise<void>;
  currentBPM?: number;
}

export const MaestroControlPanel: React.FC<MaestroControlPanelProps> = (props) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTrackMixerOpen, setIsTrackMixerOpen] = useState(false);
  const [isSpeedPanelOpen, setIsSpeedPanelOpen] = useState(false);

  // Close all panels helper
  const closeAllPanels = useCallback(() => {
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsDrawerOpen(false);
  }, []);

  // Canvas click detection - close panels when clicking on AlphaTab surface
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      const isCanvasClick = target.closest?.('.at-surface') ||
        target.closest?.('.at-viewport') ||
        target.closest?.('#alphatab-container');

      if (isCanvasClick) {
        closeAllPanels();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeAllPanels]);

  // Close other panels when opening one
  const handleTrackMixerToggle = () => {
    if (!isTrackMixerOpen) {
      setIsSpeedPanelOpen(false);
    }
    setIsTrackMixerOpen(!isTrackMixerOpen);
  };

  const handleSpeedToggle = () => {
    if (!isSpeedPanelOpen) {
      setIsTrackMixerOpen(false);
    }
    setIsSpeedPanelOpen(!isSpeedPanelOpen);
  };

  // Close all panels when playback starts
  useEffect(() => {
    if (props.isPlaying) {
      closeAllPanels();
    }
  }, [props.isPlaying, closeAllPanels]);

  // Handle Loop toggle
  const handleLoopToggle = () => {
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    props.onLoopToggle();
  };

  // Handle Gear menu
  const handleGearToggle = () => {
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsDrawerOpen(true);
  };

  // Handle Track Change
  const handleTrackChange = (trackIndex: number) => {
    props.onTrackChange(trackIndex);
    setIsTrackMixerOpen(false);
  };

  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];

  // V97: Ensure currentBPM calculation matches what page.tsx provides
  const currentBPM = props.currentBPM ?? (props.songInfo ? Math.round(props.songInfo.tempo * props.playbackSpeed) : 120);

  // V99: DIAGNOSTIC logging
  useEffect(() => {
    console.log('=== MAESTRO CONTROL PANEL V99 ===');
    console.log('Passing to TransportBar - currentBPM:', currentBPM);
    console.log('Has onMetronomeToggle:', !!props.onMetronomeToggle);
    console.log('Has onMetronomeVolumeChange:', !!props.onMetronomeVolumeChange);
    console.log('Has all callbacks:', !!(
      props.onMetronomeToggle &&
      props.onMetronomeVolumeChange &&
      props.onMetronomeBalanceChange &&
      props.onMetronomeSubdivisionChange &&
      props.onMetronomeSoundTypeChange &&
      props.onMetronomeAccentToggle
    ));
  }, [currentBPM, props.onMetronomeToggle, props.onMetronomeVolumeChange, props.onMetronomeBalanceChange,
    props.onMetronomeSubdivisionChange, props.onMetronomeSoundTypeChange, props.onMetronomeAccentToggle]);

  return (
    <>
      {/* DESKTOP LAYOUT */}
      {!props.isMobileLandscape && (
        <div className="hidden md:block">
          <TransportBar
            api={props.api}
            isPlaying={props.isPlaying}
            playbackSpeed={props.playbackSpeed}
            isLooping={props.isLooping}
            hasLoopSelection={props.hasLoopSelection}
            audioSource={props.audioSource}
            tracks={props.tracks}
            selectedTrack={props.selectedTrack}
            songInfo={props.songInfo}
            trackMuteState={props.trackMuteState}
            trackSoloState={props.trackSoloState}
            theme={props.theme}
            onPlayPause={props.onPlayPause}
            onLoopToggle={props.onLoopToggle}
            onSpeedChange={props.onSpeedChange}
            onAudioSourceChange={props.onAudioSourceChange}
            onTrackChange={props.onTrackChange}
            onTrackMuteToggle={props.onTrackMuteToggle}
            onTrackSoloToggle={props.onTrackSoloToggle}
            onThemeToggle={props.onThemeToggle}
            pitchShift={props.pitchShift}
            onPitchShiftToggle={props.onPitchShiftToggle}
            // Count In props
            isCountInEnabled={props.isCountInEnabled}
            onCountInToggle={props.onCountInToggle}
            countInMode={props.countInMode}
            onCountInModeChange={props.onCountInModeChange}
            // Metronome props - V97: Pass currentBPM explicitly
            isMetronomeEnabled={props.isMetronomeEnabled}
            onMetronomeToggle={props.onMetronomeToggle}
            metronomeVolume={props.metronomeVolume}
            onMetronomeVolumeChange={props.onMetronomeVolumeChange}
            metronomeBalance={props.metronomeBalance}
            onMetronomeBalanceChange={props.onMetronomeBalanceChange}
            metronomeSubdivision={props.metronomeSubdivision}
            onMetronomeSubdivisionChange={props.onMetronomeSubdivisionChange}
            metronomeSoundType={props.metronomeSoundType}
            onMetronomeSoundTypeChange={props.onMetronomeSoundTypeChange}
            metronomeAccentEnabled={props.metronomeAccentEnabled}
            onMetronomeAccentToggle={props.onMetronomeAccentToggle}
            onArmMetronome={props.onArmMetronome}
            currentBPM={currentBPM}
          />
        </div>
      )}

      {/* MOBILE LAYOUT */}
      <div className={props.isMobileLandscape ? 'block' : 'md:hidden'}>
        <div className="fixed bottom-0 left-0 right-0 !z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm pb-safe">
          <div className="h-[80px] px-6 flex items-center justify-between">

            {/* 1. Track Mixer */}
            <div className="relative z-[50] flex-shrink-0">
              <button
                onClick={handleTrackMixerToggle}
                disabled={!props.api || props.tracks.length === 0}
                className={`w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${isTrackMixerOpen ? 'text-cyan-400' : 'text-cyan-400 hover:text-cyan-300'}`}
                title="Track mixer"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="3" height="18" rx="1" />
                  <rect x="10.5" y="3" width="3" height="18" rx="1" />
                  <rect x="18" y="3" width="3" height="18" rx="1" />
                  <circle cx="4.5" cy="8" r="2" fill="currentColor" />
                  <circle cx="12" cy="14" r="2" fill="currentColor" />
                  <circle cx="19.5" cy="10" r="2" fill="currentColor" />
                </svg>
              </button>

              {/* Track Mixer Panel */}
              {isTrackMixerOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] max-h-[400px] overflow-y-auto z-[100]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-400">Tracks</span>
                    <button onClick={() => setIsTrackMixerOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-2">
                    {props.tracks.map((track, idx) => {
                      const isActive = props.selectedTrack === idx;
                      const isMuted = props.trackMuteState.get(idx) || false;
                      const isSoloed = props.trackSoloState.get(idx) || false;

                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                          <button
                            onClick={() => handleTrackChange(idx)}
                            className="flex-1 text-left flex flex-col gap-0.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-400' : 'bg-gray-600'}`} />
                              <span className={`text-sm font-medium ${isActive ? 'text-blue-300' : 'text-gray-300'}`}>{track.name}</span>
                              <span className="text-xs text-gray-500">Track {idx + 1}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => props.onTrackMuteToggle(idx)}
                            className={`px-3 py-1.5 rounded text-xs font-bold ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                          >M</button>
                          <button
                            onClick={() => props.onTrackSoloToggle(idx)}
                            className={`px-3 py-1.5 rounded text-xs font-bold ${isSoloed ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}
                          >S</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Speed Control */}
            <div className="relative z-[50] flex-shrink-0">
              <button
                onClick={handleSpeedToggle}
                disabled={!props.api}
                className={`w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${isSpeedPanelOpen ? 'text-cyan-400' : 'text-cyan-400 hover:text-cyan-300'}`}
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
              </button>

              {/* Speed Panel */}
              {isSpeedPanelOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-[100]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-blue-400">Speed</span>
                    <button onClick={() => setIsSpeedPanelOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                  {props.songInfo && (
                    <div className="mb-4 text-center">
                      <div className="text-2xl font-bold text-cyan-400">{currentBPM} BPM</div>
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
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {speedPresets.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => props.onSpeedChange(speed)}
                        className={`px-3 py-2 rounded-lg text-sm font-bold ${props.playbackSpeed === speed ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                      >
                        {Math.round(speed * 100)}%
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => props.onSpeedChange(1.0)}
                    className="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-bold"
                  >
                    Reset to 100%
                  </button>
                </div>
              )}
            </div>

            {/* 3. Loop */}
            <button
              onClick={handleLoopToggle}
              disabled={!props.api}
              className={`w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${props.isLooping ? 'text-green-400 hover:text-green-300' : 'text-cyan-400 hover:text-cyan-300'}`}
              title={props.isLooping ? 'Loop enabled' : 'Loop disabled'}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            </button>

            {/* 🔧 V99: RESTORED YOUTUBE LOGO - 4. Play/Pause */}
            <button
              onClick={props.onPlayPause}
              disabled={!props.api}
              className={`w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${props.audioSource === 'original' && !props.isPlaying
                ? '' /* YouTube button has its own colors */
                : props.isPlaying
                  ? 'text-orange-400 hover:text-orange-300'
                  : 'text-cyan-400 hover:text-cyan-300'
                }`}
              title={props.isPlaying ? 'Pause' : 'Play'}
            >
              {/* V99: YouTube Logo when in Original mode and paused - RESTORED proper SVG path */}
              {!props.isPlaying && props.audioSource === 'original' ? (
                <svg width="32" height="32" viewBox="0 0 68 48">
                  {/* Red rounded rectangle background - AUTHENTIC YouTube logo path */}
                  <path
                    d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,0,34,0,34,0S12.21,0,6.9,1.55 c-2.93,0.78-4.63,3.26-5.42,6.19C0,13.05,0,24,0,24s0,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,48,34,48,34,48s21.79,0,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C68,34.95,68,24,68,24S68,13.05,66.52,7.74z"
                    fill="#FF0000"
                  />
                  {/* White play triangle */}
                  <path d="M 45,24 27,14 27,34" fill="white" />
                </svg>
              ) : (
                /* Standard play/pause icons for synth mode OR when playing */
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
              )}
            </button>

            {/* 5. Gear (Settings) */}
            <button
              onClick={handleGearToggle}
              className="w-[44px] h-[44px] flex items-center justify-center rounded-lg transition-colors flex-shrink-0 text-cyan-400 hover:text-cyan-300"
              title="Settings"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>

          </div>
        </div>

        {/* Mobile Drawer */}
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          audioSource={props.audioSource}
          theme={props.theme}
          onAudioSourceChange={props.onAudioSourceChange}
          onThemeToggle={props.onThemeToggle}
          isMobileLandscape={props.isMobileLandscape}
        />
      </div>
    </>
  );
};