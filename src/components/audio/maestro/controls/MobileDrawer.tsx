'use client';

/**
 * MobileDrawer.tsx - V99: RIGHT-ALIGNED MINI POPUP (Songsterr Match)
 * Date: January 5th, 2026
 * 
 * 🔧 NEW IN V99:
 * ✅ ANCHORED TO BOTTOM-RIGHT (not centered)
 * ✅ 50% smaller than V98 (220px width)
 * ✅ Reduced height (320px max) to prevent cutoff in landscape
 * ✅ Positioned with `justify-end` at far right edge
 * ✅ TIGHT to bottom tray (pb-[80px]) and right edge (no padding)
 * ✅ AUTO-CLOSE on selections (Synth/Original/Theme)
 * ✅ Even tighter spacing and smaller fonts
 * 
 * 🔒 PRESERVED:
 * ✅ Audio Source, Theme, Utilities
 * ✅ All functionality intact
 * 
 * Accessed via Gear ⚙️ icon
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

  const visibilityClass = isMobileLandscape ? 'block' : 'md:hidden';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] ${visibilityClass}`}
        onClick={onClose}
      />

      {/* 🔥 V99: FAR RIGHT, TIGHT TO BOTTOM TRAY - no gaps */}
      <div className={`fixed right-0 bottom-0 z-[9999] flex items-end justify-end pb-[80px] ${visibilityClass}`}>
        <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-xl shadow-2xl border-2 border-purple-500/50 w-[220px] max-h-[320px] overflow-hidden flex flex-col">
          
          {/* Header - Minimal */}
          <div className="bg-gray-900/95 backdrop-blur-sm px-2 py-1.5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-sm font-bold text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-0.5 text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          {/* Content - Even tighter spacing */}
          <div className="px-2 py-1.5 space-y-1.5 overflow-y-auto flex-1">

            {/* AUDIO SOURCE - Minimal spacing */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Audio Source
              </h3>

              {/* Synth - Micro compact */}
              <button
                onClick={() => {
                  onAudioSourceChange('synth');
                  onClose(); // Auto-close drawer
                }}
                className={`
                  w-full p-1.5 rounded-lg mb-1 text-left border transition-all
                  ${audioSource === 'synth'
                    ? 'bg-cyan-500/20 border-cyan-500 ring-1 ring-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${audioSource === 'synth' ? 'border-cyan-500' : 'border-gray-500'}`}>
                      {audioSource === 'synth' && <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                    </div>
                    <div className="text-lg">🎹</div>
                    <div>
                      <div className="text-xs font-semibold text-white leading-tight">Synth</div>
                      <div className="text-[10px] text-gray-400 leading-tight">MIDI Synthesizer</div>
                    </div>
                  </div>
                  {audioSource === 'synth' && (
                    <div className="text-[9px] font-bold text-cyan-500 bg-cyan-500/20 px-1.5 py-0.5 rounded">ACTIVE</div>
                  )}
                </div>
              </button>

              {/* Original - Micro compact */}
              <button
                onClick={() => {
                  onAudioSourceChange('original');
                  onClose(); // Auto-close drawer
                }}
                className={`
                  w-full p-1.5 rounded-lg text-left border transition-all
                  ${audioSource === 'original'
                    ? 'bg-orange-500/20 border-orange-500 ring-1 ring-orange-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${audioSource === 'original' ? 'border-orange-500' : 'border-gray-500'}`}>
                      {audioSource === 'original' && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                    </div>
                    <div className="text-lg">▶️</div>
                    <div>
                      <div className="text-xs font-semibold text-white leading-tight">Original</div>
                      <div className="text-[10px] text-gray-400 leading-tight">YouTube Player</div>
                    </div>
                  </div>
                  {audioSource === 'original' && (
                    <div className="text-[9px] font-bold text-orange-500 bg-orange-500/20 px-1.5 py-0.5 rounded">ACTIVE</div>
                  )}
                </div>
              </button>
            </div>

            {/* THEME TOGGLE - Minimal */}
            {onThemeToggle && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Appearance
                </h3>
                <button
                  onClick={() => {
                    onThemeToggle();
                    onClose(); // Auto-close drawer
                  }}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <div className="text-left">
                      <div className="text-xs font-medium text-gray-200 leading-tight">
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        Switch to {theme === 'dark' ? 'light' : 'dark'}
                      </div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
              </div>
            )}

            {/* UTILITIES - Minimal */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Utilities
              </h3>
              <div className="space-y-1">
                {/* Print */}
                <button
                  disabled
                  onClick={onPrintOpen}
                  className="w-full flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-lg">🖨️</span>
                  <div className="text-left flex-1">
                    <div className="text-xs font-medium text-gray-400 leading-tight">Print</div>
                    <div className="text-[10px] text-gray-600 leading-tight">Coming soon</div>
                  </div>
                </button>

                {/* Export */}
                <button
                  disabled
                  className="w-full flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-800/30 border border-gray-700/50 opacity-50 cursor-not-allowed"
                >
                  <span className="text-lg">📤</span>
                  <div className="text-left flex-1">
                    <div className="text-xs font-medium text-gray-400 leading-tight">Export</div>
                    <div className="text-[10px] text-gray-600 leading-tight">Coming soon</div>
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