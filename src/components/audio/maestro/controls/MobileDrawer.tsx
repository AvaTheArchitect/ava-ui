'use client';

/**
 * MobileDrawer.tsx - V71 GEAR MENU REDESIGN
 * Date: November 14th, 2025
 * 
 * CHANGES:
 * ✅ Synth/Original toggle moved here (from bottom tray)
 * ✅ Clean slide-up drawer design
 * ✅ Future: Light/Dark theme toggle
 * ✅ Future: Metronome, Tuner, Count-in, Print
 * 
 * Accessed via Gear ⚙️ icon in bottom-right corner
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
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
        onClick={onClose}
      />

      {/* Drawer Panel - Slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden">
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-t-2xl shadow-2xl border-t-2 border-purple-500/50 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Close settings"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            
            {/* ==================== AUDIO SOURCE TOGGLE ==================== */}
            {/* Moved from bottom tray to gear menu (Songsterr pattern) */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Audio Source
              </h3>
              <AudioSourceToggle
                audioSource={audioSource}
                onChange={onAudioSourceChange}
              />
            </div>

            {/* ==================== THEME TOGGLE ==================== */}
            {/* Future implementation */}
            {onThemeToggle && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Appearance
                </h3>
                <button
                  onClick={onThemeToggle}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {theme === 'dark' ? '🌙' : '☀️'}
                    </span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-200">
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Switch to {theme === 'dark' ? 'light' : 'dark'} theme
                      </div>
                    </div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
              </div>
            )}

            {/* ==================== PLAYBACK TOOLS ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Playback Tools
              </h3>
              <div className="space-y-2">
                
                {/* Metronome - Stub */}
                <button
                  disabled
                  onClick={onMetronomeToggle}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-2xl">🎵</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Metronome</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>

                {/* Count-in - Stub */}
                <button
                  disabled
                  onClick={onCountInToggle}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-2xl">⏱️</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Count In</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>

                {/* Tuner - Stub */}
                <button
                  disabled
                  onClick={onTunerOpen}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-2xl">🎸</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Tuner</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>
              </div>
            </div>

            {/* ==================== UTILITIES ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Utilities
              </h3>
              <div className="space-y-2">
                
                {/* Print - Stub */}
                <button
                  disabled
                  onClick={onPrintOpen}
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-2xl">🖨️</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Print</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>

                {/* Export - Stub */}
                <button
                  disabled
                  className="w-full flex items-center gap-3 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-2xl">📤</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Export</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Safe area padding at bottom */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </>
  );
};