'use client';

/**
 * MaestroControlPanel.tsx
 * Main responsive orchestrator for Maestro menu tray
 * Switches between TransportBar (desktop) and Mobile layout with drawer
 */

import React, { useState, useEffect } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import { PlaybackControls } from './PlaybackControls';
import { SpeedControl } from './SpeedControl';
import { LoopControl } from './LoopControl';
import type { MaestroControlPanelProps } from './MaestroControlTypes';

export const MaestroControlPanel: React.FC<MaestroControlPanelProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Detect mobile/tablet breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind 'md' breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop: Full TransportBar
  if (!isMobile) {
    return (
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
        onPlayPause={props.onPlayPause}
        onLoopToggle={props.onLoopToggle}
        onSpeedChange={props.onSpeedChange}
        onAudioSourceChange={props.onAudioSourceChange}
        onTrackChange={props.onTrackChange}
        onTrackMuteToggle={props.onTrackMuteToggle}
        onTrackSoloToggle={props.onTrackSoloToggle}
      />
    );
  }

  // Mobile: Simplified bottom bar + drawer
  return (
    <>
      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl md:hidden">
        <div className="flex items-center justify-around px-4 py-3 gap-2">
          
          {/* Track Indicator (Left) */}
          <button
            onClick={() => {
              // TODO: Open track selector sheet on mobile
              console.log('Track selector - mobile implementation needed');
            }}
            disabled={!props.api || props.tracks.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-600"
          >
            <span className="text-lg">🎸</span>
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-bold text-blue-200 truncate max-w-[100px]">
                {props.tracks[props.selectedTrack]?.name || 'Track'}
              </span>
              <span className="text-[10px] text-gray-500">
                {props.selectedTrack + 1}/{props.tracks.length}
              </span>
            </div>
          </button>

          {/* Speed Control */}
          <SpeedControl
            api={props.api}
            playbackSpeed={props.playbackSpeed}
            songInfo={props.songInfo}
            onSpeedChange={props.onSpeedChange}
          />

          {/* Loop Control */}
          <LoopControl
            api={props.api}
            isLooping={props.isLooping}
            hasSelection={props.hasLoopSelection}
            onLoopToggle={props.onLoopToggle}
          />

          {/* Play Button (Center - No inline audio toggle on mobile) */}
          <PlaybackControls
            api={props.api}
            isPlaying={props.isPlaying}
            audioSource={props.audioSource}
            onPlayPause={props.onPlayPause}
            onAudioSourceChange={props.onAudioSourceChange}
            showAudioToggle={false} // Mobile hides inline toggle
          />

          {/* Settings Drawer Button (Right) */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80 transition-all"
            aria-label="Open settings drawer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Settings Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        audioSource={props.audioSource}
        theme={props.theme}
        onAudioSourceChange={props.onAudioSourceChange}
        onThemeToggle={props.onThemeToggle}
      />
    </>
  );
};