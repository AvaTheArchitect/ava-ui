'use client';

/**
 * MobileDrawer.tsx - V96: CENTERED MODAL FIX (Songsterr Style)
 * Date: January 5th, 2026
 * 
 * 🔧 NEW IN V96:
 * ✅ Changed from bottom-anchored drawer to CENTERED MODAL
 * ✅ Constrained width (max-w-md) instead of full-width
 * ✅ Rounded corners ALL AROUND (not just top)
 * ✅ Centered on screen (both vertical & horizontal)
 * ✅ More compact, professional Songsterr-style appearance
 * 
 * 🔒 PRESERVED FROM V95:
 * ✅ isMobileLandscape prop support
 * ✅ Audio Source radio button cards
 * ✅ Original option shows "YouTube Player"
 * ✅ Active state with colored borders and badges
 * ✅ All functionality intact
 * 
 * Accessed via Gear ⚙️ icon in bottom-right corner
 */

import React from 'react';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  audioSource: 'synth' | 'original';
  theme?: 'light' | 'dark';
  onAudioSourceChange: (source: 'synth' | 'original') => void;
  onThemeToggle?: () => void;
  onMetronomeToggle?: () => void;
  onCountInToggle?: () => void;
  onTunerOpen?: () => void;
  onPrintOpen?: () => void;
  isMobileLandscape?: boolean;
}

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
  isMobileLandscape = false,
}) => {
  if (!isOpen) return null;

  // V96: Show drawer if on mobile (md:hidden) OR in landscape mode
  const visibilityClass = isMobileLandscape ? 'block' : 'md:hidden';

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] ${visibilityClass}`}
        onClick={onClose}
      />

      {/* 🆕 V96: CENTERED MODAL - Changed from bottom-anchored to center-positioned */}
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${visibilityClass}`}>
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          
          {/* Header - Fixed at top */}
          <div className="bg-gray-900/95 backdrop-blur-sm px-6 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
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

          {/* Content - Scrollable */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">

            {/* ==================== AUDIO SOURCE (V94: RADIO CARDS) ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Audio Source
              </h3>

              {/* Synth Option */}
              <button
                onClick={() => onAudioSourceChange('synth')}
                className={`
                  w-full p-4 rounded-lg mb-2 text-left
                  border transition-all
                  ${audioSource === 'synth'
                    ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Radio Circle */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${audioSource === 'synth' ? 'border-cyan-500' : 'border-gray-500'}
                    `}>
                      {audioSource === 'synth' && (
                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="text-2xl">🎹</div>

                    {/* Text */}
                    <div>
                      <div className="font-semibold text-white">Synth</div>
                      <div className="text-xs text-gray-400">MIDI Synthesizer</div>
                    </div>
                  </div>

                  {/* Active Badge */}
                  {audioSource === 'synth' && (
                    <div className="text-xs font-semibold text-cyan-500 bg-cyan-500/20 px-2 py-1 rounded">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>

              {/* Original Option (V94: YouTube Player) */}
              <button
                onClick={() => onAudioSourceChange('original')}
                className={`
                  w-full p-4 rounded-lg text-left
                  border transition-all
                  ${audioSource === 'original'
                    ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Radio Circle */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${audioSource === 'original' ? 'border-orange-500' : 'border-gray-500'}
                    `}>
                      {audioSource === 'original' && (
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="text-2xl">▶️</div>

                    {/* Text */}
                    <div>
                      <div className="font-semibold text-white">Original</div>
                      <div className="text-xs text-gray-400">YouTube Player</div>
                    </div>
                  </div>

                  {/* Active Badge */}
                  {audioSource === 'original' && (
                    <div className="text-xs font-semibold text-orange-500 bg-orange-500/20 px-2 py-1 rounded">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* ==================== THEME TOGGLE ==================== */}
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
          </div>
        </div>
      </div>
    </>
  );
};