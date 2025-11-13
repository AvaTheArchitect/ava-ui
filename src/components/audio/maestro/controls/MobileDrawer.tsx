'use client';

/**
 * MobileDrawer.tsx
 * Right-slide drawer for mobile - Better ergonomics than top dropdown
 * Contains Audio Source, Theme Toggle, and utility buttons
 */

import React from 'react';
import { AudioSourceToggle } from './AudioSourceToggle';
import type { MobileDrawerProps } from './MaestroControlTypes';

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  audioSource,
  theme = 'dark',
  onAudioSourceChange,
  onThemeToggle,
  onMetronomeToggle,
  onCountInToggle,
  onTunerOpen,
  onPrintOpen,
}) => {
  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 w-80 max-w-[85vw]
          bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900
          border-l border-purple-500/30 shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-blue-400">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            aria-label="Close settings"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto h-[calc(100vh-73px)] p-4 space-y-6">
          
          {/* Audio Source Selection */}
          <div>
            <AudioSourceToggle
              audioSource={audioSource}
              onChange={onAudioSourceChange}
            />
          </div>

          {/* Theme Toggle */}
          {onThemeToggle && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Theme
              </div>
              <button
                onClick={onThemeToggle}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50 transition-all"
              >
                <div className="text-2xl">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-300">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Toggle appearance
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                </svg>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Playback Tools Section */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Playback Tools
            </div>
            <div className="space-y-2">
              
              {/* Metronome - Stub */}
              <button
                onClick={onMetronomeToggle}
                disabled={!onMetronomeToggle}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700 opacity-50 cursor-not-allowed"
              >
                <div className="text-2xl">🎵</div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-500">Metronome</div>
                  <div className="text-xs text-gray-600">Coming soon</div>
                </div>
              </button>

              {/* Count In - Stub */}
              <button
                onClick={onCountInToggle}
                disabled={!onCountInToggle}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700 opacity-50 cursor-not-allowed"
              >
                <div className="text-2xl">⏱️</div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-500">Count In</div>
                  <div className="text-xs text-gray-600">Coming soon</div>
                </div>
              </button>

              {/* Tuner - Stub */}
              <button
                onClick={onTunerOpen}
                disabled={!onTunerOpen}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700 opacity-50 cursor-not-allowed"
              >
                <div className="text-2xl">🎸</div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-500">Tuner</div>
                  <div className="text-xs text-gray-600">Coming soon</div>
                </div>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Export & Print Section */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Export & Print
            </div>
            <div className="space-y-2">
              
              {/* Print - Stub */}
              <button
                onClick={onPrintOpen}
                disabled={!onPrintOpen}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 border border-gray-700 opacity-50 cursor-not-allowed"
              >
                <div className="text-2xl">🖨️</div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-500">Print</div>
                  <div className="text-xs text-gray-600">Coming soon</div>
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Spacer for Safe Area */}
          <div className="h-20" />
        </div>
      </div>
    </>
  );
};