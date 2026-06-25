'use client';

/**
 * TransportBar.tsx - V99.0: Zone B flex:1 1 0% justify-end (Songsterr-matched) + Speed label aligned
 * Date: March 20th, 2026
 *
 * 🆕 V98.99 ARCHITECTURE:
 * ✅ Middle band (TrackMixer → Print): flex:4 1 0%, space-between — all gaps fluid
 * ✅ pl-[50px] fixed left bookend, no separate left cluster
 * ✅ Cell wrappers: w-[51px] desktop / w-[44px] compact, h-[74px], flex-none
 * ✅ Speed exception: w-[64px], no collapse
 * ✅ Inner buttons: w-full h-full p-0 (Songsterr .Cny52i model)
 * ✅ Zone B: [flex:1_0_auto] desktop / flex-none compact (<999px)
 * ✅ More wrapper 🔒: flex-1 mx-auto min-w-[51px] desktop /
 *                     flex-none mx-auto min-w-[48px] pr-[4px] compact
 * ✅ More button: mx-auto w-[51px] desktop / w-[44px] compact
 *
 * 🔒 PRESERVED:
 * ✅ Solo/Mute mutual exclusivity
 * ✅ All panel management / click-outside logic
 * ✅ All diagnostic logging
 * ✅ All child component props — zero child changes
 * ✅ Label hide @999px, right 50px bookend, button order
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControl } from './SpeedControl';
import { LoopControl } from './LoopControl';
import { TrackMixerPanel } from './TrackMixerPanel';
import { MetronomePanel } from './MetronomePanel';
import { CountInPanel } from './CountInPanel';
import { ExportPanel } from './ExportPanel';
import { PrintPanel } from './PrintPanel';
import type { TransportBarProps } from './MaestroControlTypes';
import type { MetronomeSoundType, SubdivisionMode } from './useSmartMetronome';

interface ExtendedTransportBarProps extends TransportBarProps {
  pitchShift?: number;
  onPitchShiftToggle?: (anchorRect: DOMRect) => void;
  isCountInEnabled?: boolean;
  onCountInToggle?: () => void;
  countInMode?: 'three-beat' | 'four-beat';
  onCountInModeChange?: (mode: 'three-beat' | 'four-beat') => void;
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
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
}

const LABEL_CLS = 'text-[10px] font-semibold uppercase tracking-normal whitespace-nowrap text-blue-200/85 [@media(max-width:999px)]:hidden';

export const TransportBar: React.FC<ExtendedTransportBarProps> = ({
  api, isPlaying, playbackSpeed, isLooping, hasLoopSelection, audioSource,
  tracks, selectedTrack, songInfo, trackMuteState, trackSoloState, theme,
  onPlayPause, onLoopToggle, onSpeedChange, onAudioSourceChange, onTrackChange,
  onTrackMuteToggle, onTrackSoloToggle, onThemeToggle,
  pitchShift = 0, onPitchShiftToggle,
  isCountInEnabled = false, onCountInToggle,
  countInMode = 'three-beat', onCountInModeChange,
  isMetronomeEnabled = false, onMetronomeToggle,
  metronomeVolume = 0.7, onMetronomeVolumeChange,
  metronomeBalance = 0, onMetronomeBalanceChange,
  metronomeSubdivision = 1, onMetronomeSubdivisionChange,
  metronomeSoundType = 'woodblock', onMetronomeSoundTypeChange,
  metronomeAccentEnabled = true, onMetronomeAccentToggle,
  onArmMetronome, currentBPM,
  masterVolume = 1.0, onMasterVolumeChange,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTrackMixerOpen, setIsTrackMixerOpen] = useState(false);
  const [isSpeedPanelOpen, setIsSpeedPanelOpen] = useState(false);
  const [isMetronomePanelOpen, setIsMetronomePanelOpen] = useState(false);
  const [isCountInPanelOpen, setIsCountInPanelOpen] = useState(false);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isPrintPanelOpen, setIsPrintPanelOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const trackMixerRef = useRef<HTMLDivElement>(null);
  const speedPanelRef = useRef<HTMLDivElement>(null);
  const metronomePanelRef = useRef<HTMLDivElement>(null);
  const countInPanelRef = useRef<HTMLDivElement>(null);
  const exportPanelRef = useRef<HTMLDivElement>(null);
  const printPanelRef = useRef<HTMLDivElement>(null);
  const tuningButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    console.log('currentBPM prop:', currentBPM);
    console.log('songInfo tempo:', songInfo?.tempo);
    console.log('Calculated BPM:', currentBPM ?? (songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 120));
    console.log('🔊 masterVolume:', masterVolume);
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
  }, [currentBPM, songInfo, playbackSpeed, masterVolume, onMetronomeToggle, onMetronomeVolumeChange,
    onMetronomeBalanceChange, onMetronomeSubdivisionChange, onMetronomeSoundTypeChange, onMetronomeAccentToggle]);

  const closeAllPanels = useCallback(() => {
    setIsMoreMenuOpen(false); setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMetronomePanelOpen(false); setIsCountInPanelOpen(false);
    setIsExportPanelOpen(false); setIsPrintPanelOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (isSpeedPanelOpen && !speedPanelRef.current?.contains(t)) setIsSpeedPanelOpen(false);
      if (isTrackMixerOpen && !trackMixerRef.current?.contains(t)) setIsTrackMixerOpen(false);
      if (isMoreMenuOpen && !moreMenuRef.current?.contains(t)) setIsMoreMenuOpen(false);
      if (isMetronomePanelOpen && !metronomePanelRef.current?.contains(t)) setIsMetronomePanelOpen(false);
      if (isCountInPanelOpen && !countInPanelRef.current?.contains(t)) setIsCountInPanelOpen(false);
      if (isExportPanelOpen && !exportPanelRef.current?.contains(t)) setIsExportPanelOpen(false);
      if (isPrintPanelOpen && !printPanelRef.current?.contains(t)) setIsPrintPanelOpen(false);
      const isCanvas = (t as Element).closest?.('.at-surface') ||
        (t as Element).closest?.('.at-viewport') ||
        (t as Element).closest?.('#alphatab-container');
      if (isCanvas) closeAllPanels();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen, isTrackMixerOpen, isSpeedPanelOpen, isMetronomePanelOpen,
    isCountInPanelOpen, isExportPanelOpen, isPrintPanelOpen, closeAllPanels]);

  useEffect(() => { if (isPlaying) closeAllPanels(); }, [isPlaying, closeAllPanels]);

  const handleTrackMixerToggle = useCallback(() => {
    setIsTrackMixerOpen(p => !p);
    setIsSpeedPanelOpen(false); setIsMoreMenuOpen(false);
    setIsMetronomePanelOpen(false); setIsCountInPanelOpen(false); setIsExportPanelOpen(false);
  }, []);
  const handleSpeedToggle = useCallback(() => {
    setIsSpeedPanelOpen(p => !p);
    setIsTrackMixerOpen(false); setIsMoreMenuOpen(false);
    setIsMetronomePanelOpen(false); setIsCountInPanelOpen(false); setIsExportPanelOpen(false);
  }, []);
  const handleMoreToggle = useCallback(() => {
    setIsMoreMenuOpen(p => !p);
    setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMetronomePanelOpen(false); setIsCountInPanelOpen(false); setIsExportPanelOpen(false);
    setIsPrintPanelOpen(false);
  }, []);
  const handleMetronomePanelToggle = useCallback(() => {
    console.log('🎵 Metronome button clicked! Current state:', isMetronomePanelOpen);
    setIsMetronomePanelOpen(p => !p);
    setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false); setIsCountInPanelOpen(false); setIsExportPanelOpen(false);
  }, [isMetronomePanelOpen, audioSource, api]);
  const handleCountInPanelToggle = useCallback(() => {
    setIsCountInPanelOpen(p => !p);
    setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false); setIsMetronomePanelOpen(false); setIsExportPanelOpen(false);
  }, []);
  const handleExportToggle = useCallback(() => {
    setIsExportPanelOpen(p => !p);
    setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false); setIsMetronomePanelOpen(false);
    setIsCountInPanelOpen(false); setIsPrintPanelOpen(false);
  }, []);
  const handlePrintToggle = useCallback(() => {
    setIsPrintPanelOpen(p => !p);
    setIsExportPanelOpen(false); setIsTrackMixerOpen(false); setIsSpeedPanelOpen(false);
    setIsMoreMenuOpen(false); setIsMetronomePanelOpen(false); setIsCountInPanelOpen(false);
  }, []);
  const handleThemeToggleClick = useCallback(() => {
    onThemeToggle?.(); setIsMoreMenuOpen(false);
  }, [onThemeToggle]);
  const handlePitchShiftClick = useCallback(() => {
    if (onPitchShiftToggle && tuningButtonRef.current) {
      onPitchShiftToggle(tuningButtonRef.current.getBoundingClientRect());
    }
    setIsMoreMenuOpen(false);
  }, [onPitchShiftToggle]);
  const handleTrackChange = useCallback((idx: number) => {
    onTrackChange(idx); setIsTrackMixerOpen(false);
  }, [onTrackChange]);
  const handleSpeedChange = useCallback((speed: number) => {
    onSpeedChange(speed);
  }, [onSpeedChange]);

  // 🎵 Mutually exclusive Solo/Mute — only clears opposite when ENABLING
  const handleSoloClick = useCallback(() => {
    const isSoloed = trackSoloState.get(selectedTrack) || false;
    const isMuted = trackMuteState.get(selectedTrack) || false;
    if (!isSoloed && isMuted) onTrackMuteToggle(selectedTrack);
    onTrackSoloToggle(selectedTrack);
  }, [selectedTrack, trackSoloState, trackMuteState, onTrackSoloToggle, onTrackMuteToggle]);
  const handleMuteClick = useCallback(() => {
    const isSoloed = trackSoloState.get(selectedTrack) || false;
    const isMuted = trackMuteState.get(selectedTrack) || false;
    if (!isMuted && isSoloed) onTrackSoloToggle(selectedTrack);
    onTrackMuteToggle(selectedTrack);
  }, [selectedTrack, trackSoloState, trackMuteState, onTrackSoloToggle, onTrackMuteToggle]);

  const [isCompactTransport, setIsCompactTransport] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 999px)');
    const updateCompactTransport = () => { setIsCompactTransport(mediaQuery.matches); };
    updateCompactTransport();
    mediaQuery.addEventListener('change', updateCompactTransport);
    return () => { mediaQuery.removeEventListener('change', updateCompactTransport); };
  }, []);

  const router = useRouter();
  const isSynthMode = audioSource === 'synth';
  const displayBPM = currentBPM ?? (songInfo ? Math.round(songInfo.tempo * playbackSpeed) : 120);
  const hasAllMetronomeCallbacks = !!(
    onMetronomeToggle && onMetronomeVolumeChange && onMetronomeBalanceChange &&
    onMetronomeSubdivisionChange && onMetronomeSoundTypeChange && onMetronomeAccentToggle
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 !z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <div className="w-full h-[74px] flex items-center">

        {/* ── MIDDLE BAND: TrackMixer → Print ─────────────────────────────────────────────────
             flex:12.4 1 0% + space-between — Songsterr-inspected ratio, fluid gaps
             pl-[50px] — fixed left bookend
             All children flex-none, wrapper owns width, button fills w-full h-full
        ─────────────────────────────────────────────────────────────────────────────────────── */}
        <div
          className="flex items-center h-full pl-[50px] [@media(max-width:900px)]:pl-5 [@media(max-width:820px)]:pl-4 min-w-0 gap-2"
          style={{ flex: isCompactTransport ? '12.4 1 0%' : '4 1 0%', justifyContent: 'space-between' }}
        >

          {/* TrackMixer */}
          <div ref={trackMixerRef} className="flex-none">
            <TrackMixerPanel
              api={api} tracks={tracks} selectedTrack={selectedTrack}
              trackMuteState={trackMuteState} trackSoloState={trackSoloState}
              onTrackChange={handleTrackChange} onMuteToggle={onTrackMuteToggle}
              onSoloToggle={onTrackSoloToggle} isPanelOpen={isTrackMixerOpen}
              onTogglePanel={handleTrackMixerToggle} masterVolume={masterVolume}
              onMasterVolumeChange={onMasterVolumeChange}
            />
          </div>

          {/* Play */}
          <div className="flex-none">
            <PlaybackControls
              api={api} isPlaying={isPlaying} audioSource={audioSource}
              onPlayPause={onPlayPause} onAudioSourceChange={onAudioSourceChange}
              showAudioToggle={true}
            />
          </div>

          {/* Speed — exception: w-[64px], no collapse */}
          <div
            ref={speedPanelRef}
            className="flex-none w-[64px] h-[74px] relative flex flex-col items-center justify-center gap-0.5"
          >
            <SpeedControl
              api={api}
              playbackSpeed={playbackSpeed}
              songInfo={songInfo}
              onSpeedChange={handleSpeedChange}
              isPanelOpen={isSpeedPanelOpen}
              onTogglePanel={handleSpeedToggle}
              currentBPM={currentBPM}
            />
            <span className={LABEL_CLS}>SPEED</span>
          </div>
          {/* Loop */}
          <div className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] relative flex flex-col items-center justify-center gap-0.5">
            <LoopControl api={api} isLooping={isLooping} hasSelection={hasLoopSelection} onLoopToggle={onLoopToggle} />
            <span className={LABEL_CLS}>LOOP</span>
          </div>

          {/* Solo */}
          {(() => {
            const isSoloed = trackSoloState.get(selectedTrack) || false;
            const soloEnabled = !!api && tracks.length > 0;
            return (
              <div className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] relative">
                <button
                  onClick={handleSoloClick}
                  disabled={!soloEnabled}
                  aria-pressed={isSoloed}
                  className={`group w-full h-full p-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200
                    ${!soloEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                    <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-white text-sm font-semibold">
                          {isSoloed ? 'Disable solo for this track' : 'Play current track solo'}
                        </span>
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">Opt</kbd>
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">M</kbd>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {isSoloed ? 'Return all tracks to normal' : 'Isolate this track for playback'}
                      </div>
                    </div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24"
                    className={`transition-colors ${isSoloed ? 'text-green-400' : 'text-blue-200'}`}
                    fill="currentColor"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  <span className={LABEL_CLS}>SOLO</span>
                </button>
              </div>
            );
          })()}

          {/* Mute */}
          {(() => {
            const isMuted = trackMuteState.get(selectedTrack) || false;
            const muteEnabled = !!api && tracks.length > 0;
            return (
              <div className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] relative">
                <button
                  onClick={handleMuteClick}
                  disabled={!muteEnabled}
                  aria-pressed={isMuted}
                  className={`group w-full h-full p-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200
                    ${!muteEnabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                    <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-white text-sm font-semibold">
                          {isMuted ? 'Unmute current track' : 'Mute current track'}
                        </span>
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">M</kbd>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {isMuted ? 'Restore audio for this track' : 'Silence this track during playback'}
                      </div>
                    </div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24"
                    className={`transition-colors ${isMuted ? 'text-green-400' : 'text-blue-200'}`}
                    fill="currentColor"
                  >
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                  <span className={LABEL_CLS}>MUTE</span>
                </button>
              </div>
            );
          })()}

          {/* Count In */}
          <div className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] relative" ref={countInPanelRef}>
            <button
              onClick={handleCountInPanelToggle}
              disabled={!api}
              className={`w-full h-full p-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200
                ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-white text-sm font-semibold">
                      {isCountInEnabled ? 'Disable count in' : 'Enable count in'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {isCountInEnabled ? 'Remove lead-in beats before playback' : 'Add lead-in beats before playback starts'}
                  </div>
                </div>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
                className={`transition-colors ${isCountInEnabled ? 'text-green-400' : 'text-blue-200'}`}
              >
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
              <span className={LABEL_CLS}>COUNT IN</span>
            </button>
            {onCountInToggle && onCountInModeChange && (
              <CountInPanel
                isEnabled={isCountInEnabled} onToggle={onCountInToggle}
                mode={countInMode} onModeChange={onCountInModeChange}
                isPanelOpen={isCountInPanelOpen} onTogglePanel={handleCountInPanelToggle}
              />
            )}
          </div>

          {/* Metronome */}
          <div className="flex-none w-[68px] [@media(max-width:999px)]:w-[44px] h-[74px] relative" ref={metronomePanelRef}>
            <button
              onClick={handleMetronomePanelToggle}
              disabled={!api || !isSynthMode}
              className={`w-full h-full p-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200
                ${!api || !isSynthMode ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-white text-sm font-semibold">
                      {!isSynthMode ? 'Synth mode only' : isMetronomeEnabled ? 'Metronome on' : 'Metronome off'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {!isSynthMode ? 'Switch to Synth to use the metronome' : isMetronomeEnabled ? 'Click to disable the metronome' : 'Click to enable the metronome'}
                  </div>
                </div>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
                className={`transition-colors ${isMetronomeEnabled && isSynthMode ? 'text-green-400' : 'text-blue-200'}`}
              >
                <path d="M12 2L4 20h16L12 2zm0 4.84L15.16 18H8.84L12 6.84z" />
                <path d="M10.5 12L12 8l1.5 4z" />
              </svg>
              <span className={LABEL_CLS}>METRONOME</span>
            </button>
            {hasAllMetronomeCallbacks ? (
              <MetronomePanel
                isEnabled={isMetronomeEnabled} onToggle={onMetronomeToggle!}
                currentBPM={displayBPM} audioSource={audioSource}
                volume={metronomeVolume} onVolumeChange={onMetronomeVolumeChange!}
                balance={metronomeBalance} onBalanceChange={onMetronomeBalanceChange!}
                subdivision={metronomeSubdivision} onSubdivisionChange={onMetronomeSubdivisionChange!}
                soundType={metronomeSoundType} onSoundTypeChange={onMetronomeSoundTypeChange!}
                accentEnabled={metronomeAccentEnabled} onAccentToggle={onMetronomeAccentToggle!}
                isPanelOpen={isMetronomePanelOpen} onTogglePanel={handleMetronomePanelToggle}
                onArmMetronome={onArmMetronome}
              />
            ) : (
              <>
                {isMetronomePanelOpen && (
                  <div className="absolute bottom-full right-0 mb-2 bg-red-900/95 border border-red-600 rounded-lg shadow-2xl p-4 min-w-[320px] z-[11000]">
                    <div className="text-white font-bold mb-2">⚠️ Metronome Error</div>
                    <div className="text-xs text-gray-300">Missing required callbacks. Check console for details.</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Export */}
          <div ref={exportPanelRef} className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] relative flex flex-col items-center justify-center gap-0.5">
            <ExportPanel
              api={api} isPanelOpen={isExportPanelOpen}
              onTogglePanel={handleExportToggle} onClose={() => setIsExportPanelOpen(false)}
            />
            <span className={LABEL_CLS}>EXPORT</span>
          </div>


        </div>
        {/* ── MIDDLE BAND end ── */}

        {/* ── ZONE B: RIGHT ANCHORED BAND ─────────────────────────────────────────────────────
             flex:2 1 0%        — Songsterr-inspected ratio (~2/14.4 of bar width)
             justify-content:flex-end — right-aligned contents
             align-items:flex-end    — Songsterr .B3a3il
             mr-[50px]          — fixed right bookend
        ─────────────────────────────────────────────────────────────────────────────────────── */}
        <div
          className="flex flex-nowrap h-full mr-[50px] [@media(max-width:900px)]:mr-5 [@media(max-width:820px)]:mr-4"
          style={{ flex: isCompactTransport ? '2 1 0%' : '1 1 0%', justifyContent: 'flex-end', alignItems: 'flex-end' }}
        >

          {/* ── 🔒 LOCK: DO NOT CHANGE More wrapper or button sizing ──────────────────────────
               Normal:  flex-1 mx-auto min-w-[51px] — wrapper centers, ghost margins from mx-auto
               <999px:  flex-none mx-auto min-w-[48px] pr-[4px] — compact cell, mx-auto maintained at all widths.
               Button:  mx-auto w-[51px] desktop / w-[44px] compact, h-full p-0
               Ghost margins live on the WRAPPER, NOT the button.
          ─────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="relative flex-1 [@media(max-width:999px)]:flex-none mx-auto min-w-[51px] [@media(max-width:999px)]:min-w-[48px] [@media(max-width:999px)]:pr-[4px] flex items-center h-[74px]"
            ref={moreMenuRef}
          >
            {/* PrintPanel: triggered from More menu, popup anchors above More button */}
            <div ref={printPanelRef} className="absolute left-1/2 -translate-x-1/2 bottom-0 w-0 overflow-visible">
              <PrintPanel
                api={api} isPanelOpen={isPrintPanelOpen}
                onTogglePanel={handlePrintToggle} onClose={() => setIsPrintPanelOpen(false)}
              />
            </div>

            <button
              onClick={handleMoreToggle}
              className="mx-auto w-[51px] [@media(max-width:999px)]:w-[44px] h-full p-0 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 hover:brightness-125"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"
                className={`transition-colors ${isMoreMenuOpen ? 'text-green-400' : 'text-blue-200'}`}
              >
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
              <span className={LABEL_CLS}>MORE</span>
            </button>

            {isMoreMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-2 min-w-[220px] z-[11000]">
                <button
                  ref={tuningButtonRef}
                  onClick={handlePitchShiftClick}
                  disabled={!isSynthMode}
                  data-tuning-button
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                    ${isSynthMode ? 'hover:bg-gray-700/50' : 'opacity-50 cursor-not-allowed'}`}
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
                      <span className={`absolute -top-1 -right-2 min-w-[16px] h-[14px] px-1 text-[9px] font-bold text-white rounded-full flex items-center justify-center
                        ${pitchShift > 0 ? 'bg-green-500' : 'bg-orange-500'}`}>
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
                <button
                  onClick={handlePrintToggle}
                  disabled={!api}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left
                    ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/50'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300 flex-shrink-0">
                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-white">Print</div>
                    <div className="text-xs text-gray-300">Print the current tab</div>
                  </div>
                  {api && <kbd className="ml-auto px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-400">P</kbd>}
                </button>
                <div className="my-2 border-t border-gray-700" />
                <div className="px-3 py-2 text-xs text-gray-500 italic">More options coming soon...</div>
              </div>
            )}
          </div>
          {/* ── 🔒 end More wrapper LOCK ── */}

          {/* Editor */}
          <div className="flex-none w-[51px] [@media(max-width:999px)]:w-[44px] h-[74px] flex flex-col items-center justify-center gap-0.5">
            <button
              onClick={() => router.push('/editor')}
              className="group relative flex flex-col items-center justify-center gap-0.5 w-full h-auto flex-shrink-0 transition-all duration-200 hover:brightness-125"
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-white text-sm font-semibold">Turn tab editor on</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">E</kbd>
                  </div>
                </div>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24"
                className="transition-colors text-blue-200" fill="currentColor"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span className={LABEL_CLS}>EDITOR</span>
            </button>
          </div>

        </div>
        {/* ── ZONE B end ── */}

      </div>
    </div>
  );
};