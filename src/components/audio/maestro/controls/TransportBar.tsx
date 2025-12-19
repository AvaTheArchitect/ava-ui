'use client';

/**
 * TransportBar.tsx - V89: ENABLED MORE MENU WITH THEME TOGGLE
 * Date: December 18th, 2025
 * 
 * 🆕 NEW IN V89:
 * ✅ MORE button now enabled with dropdown panel
 * ✅ Theme toggle (Dark/Light mode) in MORE menu
 * ✅ Click outside to close dropdown
 * ✅ Panel closes when theme is toggled
 * 
 * 🔒 PRESERVED FROM V88:
 * ✅ FIXED HEIGHT (74px flat)
 * ✅ Three-section layout
 * ✅ All other buttons remain as-is
 */

import React, { useState, useRef, useEffect } from 'react';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControl } from './SpeedControl';
import { LoopControl } from './LoopControl';
import { TrackMixerPanel } from './TrackMixerPanel';
import type { TransportBarProps } from './MaestroControlTypes';

export const TransportBar: React.FC<TransportBarProps> = ({
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
}) => {
  // 🆕 V89: State for MORE menu
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // 🆕 V89: Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  // 🆕 V89: Close menu when playback starts
  useEffect(() => {
    if (isPlaying) {
      setIsMoreMenuOpen(false);
    }
  }, [isPlaying]);

  // 🆕 V89: Handle theme toggle from MORE menu
  const handleThemeToggleClick = () => {
    if (onThemeToggle) {
      onThemeToggle();
    }
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 !z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm">
      {/* 🔒 FIXED: h-[74px] = exact 74px height */}
      <div className="max-w-screen-2xl mx-auto h-[74px] flex items-center">

        {/* 🔒 LEFT SECTION: Track Mixer + Play - 50px left padding */}
        <div className="flex items-center gap-[50px] pl-[50px]">
          <TrackMixerPanel
            api={api}
            tracks={tracks}
            selectedTrack={selectedTrack}
            trackMuteState={trackMuteState}
            trackSoloState={trackSoloState}
            onTrackChange={onTrackChange}
            onMuteToggle={onTrackMuteToggle}
            onSoloToggle={onTrackSoloToggle}
          />

          <PlaybackControls
            api={api}
            isPlaying={isPlaying}
            audioSource={audioSource}
            onPlayPause={onPlayPause}
            onAudioSourceChange={onAudioSourceChange}
            showAudioToggle={true}
          />
        </div>

        {/* 🔒 MIDDLE SECTION: Speed + Loop + Future Controls */}
        <div className="flex-1 flex items-center justify-evenly">
          <SpeedControl
            api={api}
            playbackSpeed={playbackSpeed}
            songInfo={songInfo}
            onSpeedChange={onSpeedChange}
          />

          <LoopControl
            api={api}
            isLooping={isLooping}
            hasSelection={hasLoopSelection}
            onLoopToggle={onLoopToggle}
          />

          {/* Solo */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">SOLO</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              Solo mode (Coming soon)
            </div>
          </button>

          {/* Mute */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">MUTE</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              Mute mode (Coming soon)
            </div>
          </button>

          {/* Count In */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-6 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">COUNT IN</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              <div>Count in <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">C</kbd></div>
            </div>
          </button>

          {/* Metronome */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M12 2L6 8h12l-6-6zm0 20l6-6H6l6 6zM8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">METRONOME</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              <div>Metronome <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">N</kbd></div>
            </div>
          </button>

          {/* Export */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">EXPORT</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              Export (Coming soon)
            </div>
          </button>
        </div>

        {/* 🔒 RIGHT SECTION: Print + More + Editor - 50px right padding */}
        <div className="flex items-center pr-[50px]">
          {/* Print + More grouped together (NO gap) */}
          <div className="flex items-center">
            {/* Print */}
            <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed">
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">PRINT</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
                Print (Coming soon)
              </div>
            </button>

            {/* 🆕 V89: MORE - Now enabled with dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] transition-colors ${isMoreMenuOpen ? 'text-purple-400' : 'text-blue-400 hover:text-blue-300'
                  }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" className="currentColor" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
                <span className={`text-[12px] uppercase tracking-wide ${isMoreMenuOpen ? 'text-purple-400' : 'text-blue-400/70'
                  }`}>MORE</span>

                {/* Tooltip - only show when menu is closed */}
                {!isMoreMenuOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
                    More options
                  </div>
                )}
              </button>

              {/* 🆕 V89: MORE Dropdown Menu */}
              {isMoreMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-2 min-w-[200px] z-[11000]">
                  {/* Theme Toggle */}
                  <button
                    onClick={handleThemeToggleClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <span className="text-xl">
                      {theme === 'dark' ? '☀️' : '🌙'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-200">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Switch to {theme === 'dark' ? 'light' : 'dark'} theme
                      </div>
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-gray-700" />

                  {/* Future options placeholder */}
                  <div className="px-3 py-2 text-xs text-gray-500 italic">
                    More options coming soon...
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor button - separate from Print/More group */}
          <button disabled className="group relative flex flex-col items-center justify-center gap-0.5 px-4 h-[74px] opacity-50 cursor-not-allowed ml-4">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-blue-400" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            <span className="text-[12px] uppercase text-blue-400/70 tracking-wide">EDITOR</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out whitespace-nowrap pointer-events-none z-[11000]">
              <div>Turn tab editor on <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">E</kbd></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};