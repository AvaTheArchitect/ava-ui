'use client';

/**
 * TransportBar.tsx
 * Desktop bottom bar - Songsterr-style horizontal control layout
 * Fixed at bottom of screen, contains all playback controls
 */

import React from 'react';
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
  onPlayPause,
  onLoopToggle,
  onSpeedChange,
  onAudioSourceChange,
  onTrackChange,
  onTrackMuteToggle,
  onTrackSoloToggle,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 border-t border-purple-500/30 shadow-2xl backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Track Mixer + Playback */}
          <div className="flex items-center gap-4">
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
              showAudioToggle={true} // Desktop shows inline
            />
          </div>

          {/* Center Section: Control Buttons */}
          <div className="flex items-center gap-3">
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

            {/* Solo Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Solo mode (Coming soon)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="text-xs text-gray-500">Solo</span>
            </button>

            {/* Mute Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Mute mode (Coming soon)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
              <span className="text-xs text-gray-500">Mute</span>
            </button>

            {/* Count-in Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Count in (Coming soon) ((C))"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
              <span className="text-xs text-gray-500">Count in</span>
            </button>

            {/* Metronome Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Metronome (Coming soon) ((N))"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M12 2L6 8h12l-6-6zm0 20l6-6H6l6 6zM8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z" />
              </svg>
              <span className="text-xs text-gray-500">Metronome</span>
            </button>
          </div>

          {/* Right Section: Utility Buttons */}
          <div className="flex items-center gap-3">
            {/* Export Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Export (Coming soon)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
              </svg>
              <span className="text-xs text-gray-500">Export</span>
            </button>

            {/* Print Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="Print (Coming soon) ((P))"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              <span className="text-xs text-gray-500">Print</span>
            </button>

            {/* More Menu Button - Stub */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 opacity-50 cursor-not-allowed"
              title="More options (Coming soon)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-500" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
              <span className="text-xs text-gray-500">More</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};