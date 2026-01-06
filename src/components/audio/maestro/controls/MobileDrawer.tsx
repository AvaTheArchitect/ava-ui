'use client';

/**
 * MobileDrawer.tsx - V97: COMPACT BOTTOM POPUP (Songsterr Style)
 * Date: January 5th, 2026
 * 
 * 🔧 NEW IN V97:
 * ✅ COMPACT popup positioned near bottom (not centered)
 * ✅ Smaller width (max-w-sm) for mobile-appropriate size
 * ✅ Reduced padding and tighter spacing
 * ✅ Lower max-height for less screen coverage
 * ✅ Removed Playback Tools section (Count In, Metronome, Tuner)
 * ✅ These tools now live in MobileToolsSlideout instead
 * ✅ Focused on Settings only: Audio Source, Theme, Utilities
 * 
 * 🔒 PRESERVED FROM V96:
 * ✅ Rounded corners all around
 * ✅ isMobileLandscape prop support
 * ✅ Audio Source radio button cards
 * ✅ Theme toggle functionality
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
  onPrintOpen,
  isMobileLandscape = false,
}) => {
  if (!isOpen) return null;

  // V97: Show drawer if on mobile OR in landscape mode
  const visibilityClass = isMobileLandscape ? 'block' : 'md:hidden';

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] ${visibilityClass}`}
        onClick={onClose}
      />

      {/* 🆕 V97: COMPACT BOTTOM POPUP - positioned near bottom, smaller size */}
      <div className={`fixed inset-x-0 bottom-0 z-[9999] flex items-end justify-center pb-24 px-4 ${visibilityClass}`}>
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-2xl shadow-2xl border-2 border-purple-500/50 w-full max-w-sm max-h-[65vh] overflow-hidden flex flex-col">
          
          {/* Header - Compact */}
          <div className="bg-gray-900/95 backdrop-blur-sm px-4 py-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-base font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Close settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable, Compact Spacing */}
          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1">

            {/* ==================== AUDIO SOURCE ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Audio Source
              </h3>

              {/* Synth Option - Compact */}
              <button
                onClick={() => onAudioSourceChange('synth')}
                className={`
                  w-full p-3 rounded-lg mb-2 text-left
                  border transition-all
                  ${audioSource === 'synth'
                    ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Radio Circle */}
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${audioSource === 'synth' ? 'border-cyan-500' : 'border-gray-500'}
                    `}>
                      {audioSource === 'synth' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="text-xl">🎹</div>

                    {/* Text */}
                    <div>
                      <div className="text-sm font-semibold text-white">Synth</div>
                      <div className="text-xs text-gray-400">MIDI Synthesizer</div>
                    </div>
                  </div>

                  {/* Active Badge */}
                  {audioSource === 'synth' && (
                    <div className="text-xs font-semibold text-cyan-500 bg-cyan-500/20 px-2 py-0.5 rounded">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>

              {/* Original Option - Compact */}
              <button
                onClick={() => onAudioSourceChange('original')}
                className={`
                  w-full p-3 rounded-lg text-left
                  border transition-all
                  ${audioSource === 'original'
                    ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Radio Circle */}
                    <div className={`
                      w-4 h-4 rounded-full border-2 flex items-center justify-center
                      ${audioSource === 'original' ? 'border-orange-500' : 'border-gray-500'}
                    `}>
                      {audioSource === 'original' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className="text-xl">▶️</div>

                    {/* Text */}
                    <div>
                      <div className="text-sm font-semibold text-white">Original</div>
                      <div className="text-xs text-gray-400">YouTube Player</div>
                    </div>
                  </div>

                  {/* Active Badge */}
                  {audioSource === 'original' && (
                    <div className="text-xs font-semibold text-orange-500 bg-orange-500/20 px-2 py-0.5 rounded">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* ==================== THEME TOGGLE ==================== */}
            {onThemeToggle && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Appearance
                </h3>
                <button
                  onClick={onThemeToggle}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
              </div>
            )}



            {/* ==================== UTILITIES ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Utilities
              </h3>
              <div className="space-y-2">

                {/* Print - Stub */}
                <button
                  disabled
                  onClick={onPrintOpen}
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-xl">🖨️</span>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-gray-400">Print</div>
                    <div className="text-xs text-gray-600">Coming soon</div>
                  </div>
                </button>

                {/* Export - Stub */}
                <button
                  disabled
                  className="w-full flex items-center gap-2 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-xl">📤</span>
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