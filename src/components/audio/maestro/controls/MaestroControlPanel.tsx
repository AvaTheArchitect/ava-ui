'use client';

/**
 * MaestroControlPanel.tsx - STAGE 1.2 RESPONSIVE VERSION
 * 
 * NEW IN STAGE 1.2:
 * ✅ Responsive layout switching:
 *    - Mobile: Compact bottom bar with drawer for secondary controls
 *    - Desktop (md+): Full TransportBar with all controls visible
 * ✅ Uses Tailwind breakpoints (md:) for visibility control
 * ✅ MobileDrawer for overflow controls (Synth/YouTube toggle, settings)
 * 
 * ARCHITECTURE:
 * - Main orchestrator component
 * - Delegates to TransportBar (desktop) or mobile compact layout
 * - Manages MobileDrawer state
 */

import React, { useState } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import { PlaybackControls } from './PlaybackControls';
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

      {/* ==================== MOBILE LAYOUT (< md:) ==================== */}
      <div className="md:hidden">
        {/* Compact Bottom Bar - Essential Controls Only */}
        {/* 🔧 V67: Increased z-index to 9999 to prevent cursor overlap */}
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm pb-safe">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Play/Pause Button */}
            <div className="flex-shrink-0">
              <button
                onClick={props.onPlayPause}
                disabled={!props.api}
                className={`
                                    w-14 h-14 rounded-full flex items-center justify-center
                                    transition-all duration-200 shadow-lg
                                    ${props.isPlaying
                    ? 'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                    : 'bg-gradient-to-br from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600'
                  }
                                    ${!props.api ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                title={props.isPlaying ? 'Pause' : 'Play'}
              >
                {props.isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-white" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" className="text-white" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Middle Section: Speed + Loop */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <SpeedControl
                api={props.api}
                playbackSpeed={props.playbackSpeed}
                songInfo={props.songInfo}
                onSpeedChange={props.onSpeedChange}
              />

              <LoopControl
                api={props.api}
                isLooping={props.isLooping}
                hasSelection={props.hasLoopSelection}
                onLoopToggle={props.onLoopToggle}
              />
            </div>

            {/* Right: More Menu Button (Opens Drawer) */}
            <div className="flex-shrink-0">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-12 h-12 rounded-lg bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80 transition-all flex items-center justify-center"
                title="More options"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer - Secondary Controls */}
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