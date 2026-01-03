'use client';

/**
 * TransportBar.tsx - V97: DIAGNOSTIC VERSION + FIXES
 * Date: January 1st, 2026
 * 
 * 🔧 FIXES FROM V94:
 * ✅ Removed currentBPM = 120 default (was masking actual BPM)
 * ✅ Removed empty callback fallbacks (|| (() => {}))
 * ✅ Added console.log diagnostics for button clicks
 * ✅ Added prop validation checks
 * ✅ Conditional MetronomePanel rendering (only if callbacks exist)
 * 
 * 🐛 DIAGNOSTICS:
 * ✅ Logs when metronome button is clicked
 * ✅ Logs current BPM value
 * ✅ Logs which callbacks are missing
 * ✅ Shows panel state changes
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControl } from './SpeedControl';
import { LoopControl } from './LoopControl';
import { TrackMixerPanel } from './TrackMixerPanel';
import { MetronomePanel } from './MetronomePanel';
import { CountInPanel } from './CountInPanel';
import type { TransportBarProps } from './MaestroControlTypes';
import type { MetronomeSoundType, SubdivisionMode } from './useSmartMetronome';

interface ExtendedTransportBarProps extends TransportBarProps {
  pitchShift?: number;
  onPitchShiftToggle?: (anchorRect: DOMRect) => void;
  // Count In props
  isCountInEnabled?: boolean;
  onCountInToggle?: () => void;
  countInMode?: 'three-beat' | 'four-beat';
  onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;
  // Metronome props - NO DEFAULTS
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

export const TransportBar: React.FC<ExtendedTransportBarProps> = ({
  api,
  isPlaying,
  playbackSpeed,
  isLooping,
  hasLoopSelection,
  audioSource,
  tracks,
  selectedTrack,
  songInfo,
  trackMuteState,
  trackSoloState,
  theme,
  onPlayPause,
  onLoopToggle,
  onSpeedChange,
  onAudioSourceChange,
  onTrackChange,
  onTrackMuteToggle,
  onTrackSoloToggle,
  onThemeToggle,
  pitchShift = 0,
  onPitchShiftToggle,
  isCountInEnabled = false,
  onCountInToggle,
  countInMode = 'three-beat',
  onCountInModeChange,
  // 🔧 V97: No defaults on metronome props
  isMetronomeEnabled = false,
  onMetronomeToggle,
  metronomeVolume = 0.7,
  onMetronomeVolumeChange,
  metronomeBalance = 0,
  onMetronomeBalanceChange,
  metronomeSubdivision = 1,
  onMetronomeSubdivisionChange,
  metronomeSoundType = 'woodblock',
  onMetronomeSoundTypeChange,
  metronomeAccentEnabled = true,
  onMetronomeAccentToggle,
  onArmMetronome,
  currentBPM, // 🔧 NO DEFAULT - use actual value
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTrackMixerOpen, setIsTrackMixerOpen] = useState(false);
  const [isSpeedPanelOpen, setIsSpeedPanelOpen] = useState(false);
  const [isMetronomePanelOpen, setIsMetronomePanelOpen] = useState(false);
  const [isCountInPanelOpen, setIsCountInPanelOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const trackMixerRef = useRef<HTMLDivElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const metronomePanelRef = useRef<HTMLDivElement>(null);
  const countInPanelRef = useRef<HTMLDivElement>(null);
  const tuningButtonRef = useRef<HTMLButtonElement>(null);

  // 🐛 DIAGNOSTIC: Log prop validation on mount
  useEffect(() => {
    console.log('=== TRANSPORTBAR V97 DIAGNOSTIC ===');
    console.log('currentBPM prop:', currentBPM);
    console.log('songInfo tempo:', songInfo?.tempo);
    console.log('Calculated BPM:', currentBPM ?? (songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 120));

    const missingCallbacks: string[] = [];
    if (!onMetronomeToggle) missingCallbacks.push('onMetronomeToggle');
    if (!onMetronomeVolumeChange) missingCallbacks.push('onMetronomeVolumeChange');
    if (!onMetronomeBalanceChange) missingCallbacks.push('onMetronomeBalanceChange');
    if (!onMetronomeSubdivisionChange) missingCallbacks.push('onMetronomeSubdivisionChange');
    if (!onMetronomeSoundTypeChange) missingCallbacks.push('onMetronomeSoundTypeChange');
    if (!onMetronomeAccentToggle) missingCallbacks.push('onMetronomeAccentToggle');

    if (missingCallbacks.length > 0) {
      console.warn('⚠️ Missing metronome callbacks:', missingCallbacks);
    } else {
      console.log('✅ All metronome callbacks present');
    }
  }, [currentBPM, songInfo, playbackSpeed, onMetronomeToggle, onMetronomeVolumeChange,
    onMetronomeBalanceChange, onMetronomeSubdivisionChange, onMetronomeSoundTypeChange,
    onMetronomeAccentToggle]);

  const closeAllPanels = useCallback(() => {
    setIsMoreMenuOpen(false);
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsMetronomePanelOpen(false);
    setIsCountInPanelOpen(false);
  }, []);

  // Click-outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedInsideSpeed = speedPanelRef.current?.contains(target);
      const clickedInsideTrack = trackMixerRef.current?.contains(target);
      const clickedInsideMore = moreMenuRef.current?.contains(target);
      const clickedInsideMetronome = metronomePanelRef.current?.contains(target);
      const clickedInsideCountIn = countInPanelRef.current?.contains(target);

      if (isSpeedPanelOpen && !clickedInsideSpeed) setIsSpeedPanelOpen(false);
      if (isTrackMixerOpen && !clickedInsideTrack) setIsTrackMixerOpen(false);
      if (isMoreMenuOpen && !clickedInsideMore) setIsMoreMenuOpen(false);
      if (isMetronomePanelOpen && !clickedInsideMetronome) setIsMetronomePanelOpen(false);
      if (isCountInPanelOpen && !clickedInsideCountIn) setIsCountInPanelOpen(false);

      const isCanvasClick = (target as Element).closest?.('.at-surface') ||
        (target as Element).closest?.('.at-viewport') ||
        (target as Element).closest?.('#alphatab-container');

      if (isCanvasClick) closeAllPanels();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen, isTrackMixerOpen, isSpeedPanelOpen, isMetronomePanelOpen, isCountInPanelOpen, closeAllPanels]);

  useEffect(() => {
    if (isPlaying) closeAllPanels();
  }, [isPlaying, closeAllPanels]);

  const handleTrackMixerToggle = useCallback(() => {
    setIsTrackMixerOpen(prev => !prev);
    setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false);
    setIsMetronomePanelOpen(false);
    setIsCountInPanelOpen(false);
  }, []);

  const handleSpeedToggle = useCallback(() => {
    setIsSpeedPanelOpen(prev => !prev);
    setIsTrackMixerOpen(false);
    setIsMoreMenuOpen(false);
    setIsMetronomePanelOpen(false);
    setIsCountInPanelOpen(false);
  }, []);

  const handleMoreToggle = useCallback(() => {
    setIsMoreMenuOpen(prev => !prev);
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsMetronomePanelOpen(false);
    setIsCountInPanelOpen(false);
  }, []);

  const handleMetronomePanelToggle = useCallback(() => {
    console.log('🎵 Metronome button clicked! Current state:', isMetronomePanelOpen);
    console.log('audioSource:', audioSource, 'isSynthMode:', audioSource === 'synth');
    console.log('api:', api ? 'present' : 'missing');

    setIsMetronomePanelOpen(prev => {
      const newState = !prev;
      console.log('🎵 Panel state changing to:', newState);
      return newState;
    });
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false);
    setIsCountInPanelOpen(false);
  }, [isMetronomePanelOpen, audioSource, api]);

  const handleCountInPanelToggle = useCallback(() => {
    setIsCountInPanelOpen(prev => !prev);
    setIsTrackMixerOpen(false);
    setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false);
    setIsMetronomePanelOpen(false);
  }, []);

  const handleThemeToggleClick = useCallback(() => {
    if (onThemeToggle) {
      onThemeToggle();
    }
    setIsMoreMenuOpen(false);
  }, [onThemeToggle]);

  const handlePitchShiftClick = useCallback(() => {
    if (onPitchShiftToggle && tuningButtonRef.current) {
      const rect = tuningButtonRef.current.getBoundingClientRect();
      onPitchShiftToggle(rect);
    }
    setIsMoreMenuOpen(false);
  }, [onPitchShiftToggle]);

  const handleTrackChange = useCallback((trackIndex: number) => {
    onTrackChange(trackIndex);
    setIsTrackMixerOpen(false);
  }, [onTrackChange]);

  const handleSpeedChange = useCallback((speed: number) => {
    onSpeedChange(speed);
  }, [onSpeedChange]);

  const isSynthMode = audioSource === 'synth';

  // 🔧 V97: Calculate BPM with proper fallback
  const displayBPM = currentBPM ?? (songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 120);

  // 🐛 Check if we have all required metronome callbacks
  const hasAllMetronomeCallbacks = !!(
    onMetronomeToggle &&
    onMetronomeVolumeChange &&
    onMetronomeBalanceChange &&
    onMetronomeSubdivisionChange &&
    onMetronomeSoundTypeChange &&
    onMetronomeAccentToggle
  );

  console.log('🎵 Render check - hasAllMetronomeCallbacks:', hasAllMetronomeCallbacks);
  console.log('🎵 isMetronomePanelOpen:', isMetronomePanelOpen);

  return (
    <div className="fixed bottom-0 left-0 right-0 !z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto h-[74px] flex items-center">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-[50px] pl-[50px]">
          <div ref={trackMixerRef}>
            <TrackMixerPanel
              api={api}
              tracks={tracks}
              selectedTrack={selectedTrack}
              trackMuteState={trackMuteState}
              trackSoloState={trackSoloState}
              onTrackChange={handleTrackChange}
              onMuteToggle={onTrackMuteToggle}
              onSoloToggle={onTrackSoloToggle}
              isPanelOpen={isTrackMixerOpen}
              onTogglePanel={handleTrackMixerToggle}
            />
          </div>

          <PlaybackControls
            api={api}
            isPlaying={isPlaying}
            audioSource={audioSource}
            onPlayPause={onPlayPause}
            onAudioSourceChange={onAudioSourceChange}
            showAudioToggle={true}
          />
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex-1 flex items-center justify-evenly">
          <div ref={speedPanelRef}>
            <SpeedControl
              api={api}
              playbackSpeed={playbackSpeed}
              songInfo={songInfo}
              onSpeedChange={handleSpeedChange}
              isPanelOpen={isSpeedPanelOpen}
              onTogglePanel={handleSpeedToggle}
            />
          </div>

          <LoopControl
            api={api}
            isLooping={isLooping}
            hasSelection={hasLoopSelection}
            onLoopToggle={onLoopToggle}
          />

          {/* Solo - Stub */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">SOLO</span>
          </button>

          {/* Mute - Stub */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">MUTE</span>
          </button>

          {/* Count In */}
          <div className="relative" ref={countInPanelRef}>
            <button
              onClick={handleCountInPanelToggle}
              disabled={!api}
              className={`group relative flex flex-col items-center justify-center gap-0.5 px-6 h-[74px] transition-all duration-200 ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'
                }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={`transition-colors ${isCountInEnabled ? 'text-green-400' : 'text-blue-200'}`}>
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
              <span className={`text-[12px] uppercase tracking-wide transition-colors ${isCountInEnabled ? 'text-green-400/70' : 'text-blue-200/70'}`}>
                COUNT IN
              </span>
            </button>

            {onCountInToggle && onCountInModeChange && (
              <CountInPanel
                isEnabled={isCountInEnabled}
                onToggle={onCountInToggle}
                mode={countInMode}
                onModeChange={onCountInModeChange}
                isPanelOpen={isCountInPanelOpen}
                onTogglePanel={handleCountInPanelToggle}
              />
            )}
          </div>

          {/* Metronome - 🐛 DIAGNOSTIC VERSION */}
          <div className="relative" ref={metronomePanelRef}>
            <button
              onClick={(e) => {
                console.log('🎵 BUTTON CLICK EVENT FIRED!', e);
                handleMetronomePanelToggle();
              }}
              disabled={!api || !isSynthMode}
              className={`group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] transition-all duration-200 ${!api || !isSynthMode ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'
                }`}
              title={!isSynthMode ? 'Metronome only works in Synth mode' : isMetronomeEnabled ? 'Metronome ON' : 'Metronome OFF'}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`transition-colors ${isMetronomeEnabled && isSynthMode ? 'text-green-400' : 'text-blue-200'}`}
              >
                <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                <path d="M10.5 12L12 8l1.5 4z" />
              </svg>
              <span className={`text-[12px] uppercase tracking-wide transition-colors ${isMetronomeEnabled && isSynthMode ? 'text-green-400/70' : 'text-blue-200/70'
                }`}>
                METRONOME
              </span>
            </button>

            {/* 🔧 V97: Only render panel if all callbacks exist */}
            {hasAllMetronomeCallbacks ? (
              <MetronomePanel
                isEnabled={isMetronomeEnabled}
                onToggle={onMetronomeToggle!}
                currentBPM={displayBPM}
                audioSource={audioSource}
                volume={metronomeVolume}
                onVolumeChange={onMetronomeVolumeChange!}
                balance={metronomeBalance}
                onBalanceChange={onMetronomeBalanceChange!}
                subdivision={metronomeSubdivision}
                onSubdivisionChange={onMetronomeSubdivisionChange!}
                soundType={metronomeSoundType}
                onSoundTypeChange={onMetronomeSoundTypeChange!}
                accentEnabled={metronomeAccentEnabled}
                onAccentToggle={onMetronomeAccentToggle!}
                isPanelOpen={isMetronomePanelOpen}
                onTogglePanel={handleMetronomePanelToggle}
                onArmMetronome={onArmMetronome}
              />
            ) : (
              <div>
                {isMetronomePanelOpen && (
                  <div className="absolute bottom-full right-0 mb-2 bg-red-900/95 border border-red-600 rounded-lg shadow-2xl p-4 min-w-[320px] z-[11000]">
                    <div className="text-white font-bold mb-2">⚠️ Metronome Error</div>
                    <div className="text-xs text-gray-300">
                      Missing required callbacks. Check console for details.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export - Stub */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">EXPORT</span>
          </button>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center pr-[50px]">
          <div className="flex items-center">
            {/* Print - Stub */}
            <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">PRINT</span>
            </button>

            {/* MORE Menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={handleMoreToggle}
                className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] transition-all duration-200 hover:brightness-125"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`transition-colors ${isMoreMenuOpen ? 'text-green-400' : 'text-blue-200'}`}
                >
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
                <span className="text-[12px] uppercase text-blue-200/70 tracking-wide">MORE</span>
              </button>

              {isMoreMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-2 min-w-[220px] z-[11000]">
                  <button
                    ref={tuningButtonRef}
                    onClick={handlePitchShiftClick}
                    disabled={!isSynthMode}
                    data-tuning-button
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${isSynthMode ? 'hover:bg-gray-700/50' : 'opacity-50 cursor-not-allowed'
                      }`}
                  >
                    <div className="relative">
                      <svg width="20" height="20" viewBox="0 0 20 24" fill="none">
                        <path
                          d="M6 2V10C6 12 4 13 4 13V17C4 18 5 19 6 19H14C15 19 16 18 16 17V13C16 13 14 12 14 10V2H12V9C12 9.5 11.5 10 11 10H9C8.5 10 8 9.5 8 9V2H6Z"
                          fill={isSynthMode ? '#60a5fa' : '#6b7280'}
                        />
                        <rect x="4" y="17" width="12" height="2" rx="1" fill={isSynthMode ? '#60a5fa' : '#6b7280'} />
                      </svg>
                      {pitchShift !== 0 && (
                        <span className={`absolute -top-1 -right-2 min-w-[16px] h-[14px] px-1 text-[9px] font-bold text-white rounded-full flex items-center justify-center ${pitchShift > 0 ? 'bg-green-500' : 'bg-orange-500'
                          }`}>
                          {pitchShift > 0 ? `+${pitchShift}` : pitchShift}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Pitch Shift</div>
                      <div className="text-xs text-gray-300">
                        {isSynthMode ? (pitchShift === 0 ? 'Original tuning' : `${pitchShift > 0 ? '+' : ''}${pitchShift} semitones`) : 'Synth mode only'}
                      </div>
                    </div>
                    {isSynthMode && <kbd className="ml-auto px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-400">R</kbd>}
                  </button>

                  <div className="my-2 border-t border-gray-700" />

                  <button onClick={handleThemeToggleClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors text-left">
                    <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</div>
                      <div className="text-xs text-gray-300">Switch to {theme === 'dark' ? 'light' : 'dark'} theme</div>
                    </div>
                  </button>

                  <div className="my-2 border-t border-gray-700" />
                  <div className="px-3 py-2 text-xs text-gray-500 italic">More options coming soon...</div>
                </div>
              )}
            </div>

            <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed ml-4">
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">EDITOR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};