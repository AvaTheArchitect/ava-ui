'use client';

/**
 * MaestroControlPanel.tsx - V76 MOBILE FIX
 * Date: November 15th, 2025
 * 
 * 🔧 V76 FIXES:
 * ✅ Mobile now uses REAL components (TrackMixerPanel, SpeedControl, LoopControl)
 * ✅ Replaced placeholder buttons with actual working components
 * ✅ Components have z-[50] fix for clickable buttons
 * 
 * MOBILE CHANGES (Songsterr-style):
 * ✅ Bottom tray: 5 buttons with real functionality
 * ✅ Clean, minimal mobile UI
 * ✅ Synth/Original in Gear menu
 * 
 * DESKTOP: Unchanged (TransportBar)
 */

import React, { useState } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import { TrackMixerPanel } from './TrackMixerPanel';
import { SpeedControl } from './SpeedControl';
import { LoopControl } from './LoopControl';
import type { MaestroControlPanelProps } from './MaestroControlTypes';

export const MaestroControlPanel: React.FC<MaestroControlPanelProps> = (props) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {/* ==================== DESKTOP LAYOUT (md: and up) ==================== */}
      <div className="hidden md:block">
        <TransportBar {...props} />
      </div>

      {/* ==================== 🔧 V76: MOBILE LAYOUT - REAL COMPONENTS ==================== */}
      <div className="md:hidden">
        {/* Compact Bottom Bar - 5 Functional Buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm pb-safe">
          <div className="px-6 py-4 flex items-center justify-between">

            {/* 🔧 V76: 1. Track Mixer - REAL COMPONENT */}
            <div className="flex-shrink-0">
              <TrackMixerPanel
                api={props.api}
                tracks={props.tracks}
                selectedTrack={props.selectedTrack}
                trackMuteState={props.trackMuteState}
                trackSoloState={props.trackSoloState}
                onTrackChange={props.onTrackChange}
                onMuteToggle={props.onTrackMuteToggle}
                onSoloToggle={props.onTrackSoloToggle}
              />
            </div>

            {/* 🔧 V76: 2. Speed Control - REAL COMPONENT */}
            <div className="flex-shrink-0">
              <SpeedControl
                api={props.api}
                playbackSpeed={props.playbackSpeed}
                songInfo={props.songInfo}
                onSpeedChange={props.onSpeedChange}
              />
            </div>

            {/* 🔧 V76: 3. Loop Control - REAL COMPONENT */}
            <div className="flex-shrink-0">
              <LoopControl
                api={props.api}
                isLooping={props.isLooping}
                hasSelection={props.hasLoopSelection}
                onLoopToggle={props.onLoopToggle}
              />
            </div>

            {/* 4. Play/Pause - Small Arrow Icon */}
            <button
              onClick={props.onPlayPause}
              disabled={!props.api}
              className={`p-2 transition-colors disabled:opacity-50 flex-shrink-0 ${
                props.isPlaying
                  ? 'text-orange-400 hover:text-orange-300'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
              title={props.isPlaying ? 'Pause' : 'Play'}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                {props.isPlaying ? (
                  // Pause Icon
                  <>
                    <rect x="7" y="5" width="3" height="14" rx="1" />
                    <rect x="14" y="5" width="3" height="14" rx="1" />
                  </>
                ) : (
                  // Play Icon (Triangle)
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>

            {/* 5. Gear Menu - Settings */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors flex-shrink-0"
              title="More options"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Drawer - Settings Menu (Gear Icon) */}
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