'use client';

/**
 * MaestroControlPanel.tsx - V71 MOBILE REDESIGN
 * Date: November 14th, 2025
 * 
 * MOBILE CHANGES (Songsterr-style):
 * ✅ Bottom tray: 5 icon-only buttons (no text labels)
 * ✅ No visible boxes/backgrounds on buttons
 * ✅ Small play arrow icon (not large round button)
 * ✅ Synth/Original moved to Gear menu
 * ✅ Clean, minimal mobile UI
 * 
 * DESKTOP: Unchanged (V70 TransportBar)
 */

import React, { useState } from 'react';
import { TransportBar } from './TransportBar';
import { MobileDrawer } from './MobileDrawer';
import type { MaestroControlPanelProps } from './MaestroControlTypes';

export const MaestroControlPanel: React.FC<MaestroControlPanelProps> = (props) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {/* ==================== DESKTOP LAYOUT (md: and up) ==================== */}
      <div className="hidden md:block">
        <TransportBar {...props} />
      </div>

      {/* ==================== MOBILE LAYOUT (< md:) - V71 REDESIGN ==================== */}
      <div className="md:hidden">
        {/* Compact Bottom Bar - 5 Icon-Only Buttons (Songsterr Style) */}
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm pb-safe">
          <div className="px-6 py-4 flex items-center justify-between">

            {/* 1. Track Mixer - Far Left */}
            <button
              onClick={() => {/* TODO: Open track selector */ }}
              disabled={!props.api || props.tracks.length === 0}
              className="p-2 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
              title="Switch tracks"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </button>

            {/* 2. Speed Control */}
            <button
              onClick={() => {/* TODO: Open speed panel */ }}
              disabled={!props.api}
              className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
              title="Playback speed"
            >
              {/* Speedometer Icon */}
              <svg width="28" height="24" viewBox="0 0 32 24">
                <path
                  d="M 4 20 A 12 12 0 0 1 28 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.5"
                />
                <path
                  d="M 4 20 A 12 12 0 0 1 28 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${props.playbackSpeed * 37.7} 100`}
                  opacity="0.9"
                />
                <g transform={`rotate(${(props.playbackSpeed - 0.25) * 144 - 90}, 16, 20)`}>
                  <line x1="16" y1="20" x2="16" y2="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="16" cy="20" r="2" fill="currentColor" />
                </g>
              </svg>
            </button>

            {/* 3. Loop Control */}
            <button
              onClick={props.onLoopToggle}
              disabled={!props.api}
              className={`p-2 transition-colors disabled:opacity-50 ${props.isLooping ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
                }`}
              title="Toggle loop"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            </button>

            {/* 4. Play/Pause - Small Arrow Icon (Far Right) */}
            <button
              onClick={props.onPlayPause}
              disabled={!props.api}
              className={`p-2 transition-colors disabled:opacity-50 ${props.isPlaying
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

            {/* 5. Gear Menu - Settings (Far Right Corner) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
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
          onAudioSourceChange={props.onAudioSourceChange}
        // Future: onThemeToggle, onMetronomeToggle, etc.
        />
      </div>
    </>
  );
};