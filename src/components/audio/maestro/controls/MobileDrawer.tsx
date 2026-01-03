'use client';

/**
 * MobileDrawer.tsx - V96: PITCH SHIFT CONTROLS ADDED
 * Date: January 2nd, 2026
 * 
 * 🔧 NEW IN V96:
 * ✅ Added Pitch Shift section with +/- controls
 * ✅ Shows current semitone offset (+12 to -12 range)
 * ✅ Restore original tuning button
 * ✅ Only active in Synth mode (disabled in Original mode)
 * ✅ Matches desktop TuningOverlay functionality
 * 
 * 🔒 PRESERVED FROM V95:
 * ✅ Landscape mode compatibility (isMobileLandscape prop)
 * ✅ Audio Source radio button cards
 * ✅ Theme toggle
 * ✅ Stub controls for future features
 * 
 * Accessed via Gear ⚙️ icon in bottom-right corner
 */

import React from 'react';

const MIN_PITCH = -12;
const MAX_PITCH = 12;

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
  // 🆕 V96: Pitch Shift props
  pitchShift?: number;
  onPitchShiftChange?: (semitones: number) => void;
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
  pitchShift = 0,
  onPitchShiftChange,
}) => {
  if (!isOpen) return null;

  const visibilityClass = isMobileLandscape ? 'block' : 'md:hidden';
  const isSynthMode = audioSource === 'synth';
  const semitoneText = Math.abs(pitchShift) === 1 ? 'semitone' : 'semitones';

  // 🆕 V96: Pitch shift handlers
  const handlePitchStepDown = () => {
    if (isSynthMode && pitchShift > MIN_PITCH && onPitchShiftChange) {
      onPitchShiftChange(pitchShift - 1);
    }
  };

  const handlePitchStepUp = () => {
    if (isSynthMode && pitchShift < MAX_PITCH && onPitchShiftChange) {
      onPitchShiftChange(pitchShift + 1);
    }
  };

  const handlePitchRestore = () => {
    if (isSynthMode && onPitchShiftChange) {
      onPitchShiftChange(0);
    }
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] ${visibilityClass}`}
        onClick={onClose}
      />

      {/* Drawer Panel - Slides up from bottom */}
      <div className={`fixed bottom-0 left-0 right-0 z-[9999] ${visibilityClass}`}>
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

            {/* 🆕 V96: ==================== PITCH SHIFT ==================== */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Pitch Shift
              </h3>

              {!isSynthMode && (
                <div className="mb-3 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                  <p className="text-sm text-orange-300">
                    ⚠️ Pitch shift only works in Synth mode
                  </p>
                </div>
              )}

              <div className={`p-4 rounded-lg border ${
                isSynthMode 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-gray-800/30 border-gray-700/50 opacity-50'
              }`}>
                {/* +/- Controls */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  {/* Step Down Button */}
                  <button
                    onClick={handlePitchStepDown}
                    disabled={!isSynthMode || pitchShift <= MIN_PITCH}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all
                      ${isSynthMode && pitchShift > MIN_PITCH
                        ? 'bg-gray-700 hover:bg-gray-600 active:scale-95' 
                        : 'bg-gray-700/30 cursor-not-allowed'
                      }`}
                  >
                    <svg width="20" height="3" viewBox="0 0 20 3">
                      <rect width="20" height="3" rx="1.5" fill={isSynthMode ? '#fff' : '#666'} />
                    </svg>
                  </button>

                  {/* Current Value Display */}
                  <div className="text-center min-w-[80px]">
                    <span className={`text-3xl font-bold block leading-none
                      ${pitchShift === 0 ? 'text-gray-400'
                        : pitchShift > 0 ? 'text-green-500' : 'text-orange-500'
                      }`}>
                      {pitchShift > 0 ? `+${pitchShift}` : pitchShift}
                    </span>
                    <span className="text-[11px] uppercase text-gray-400 mt-1 block">
                      {semitoneText}
                    </span>
                  </div>

                  {/* Step Up Button */}
                  <button
                    onClick={handlePitchStepUp}
                    disabled={!isSynthMode || pitchShift >= MAX_PITCH}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all
                      ${isSynthMode && pitchShift < MAX_PITCH
                        ? 'bg-gray-700 hover:bg-gray-600 active:scale-95'
                        : 'bg-gray-700/30 cursor-not-allowed'
                      }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <rect x="9" y="0" width="2" height="20" rx="1" fill={isSynthMode ? '#fff' : '#666'} />
                      <rect x="0" y="9" width="20" height="2" rx="1" fill={isSynthMode ? '#fff' : '#666'} />
                    </svg>
                  </button>
                </div>

                {/* Restore Button */}
                <button
                  onClick={handlePitchRestore}
                  disabled={!isSynthMode || pitchShift === 0}
                  className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all
                    ${isSynthMode && pitchShift !== 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-98'
                      : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Restore original tuning
                </button>

                {/* Info Text */}
                <p className="text-xs text-gray-400 text-center mt-3">
                  Transpose up or down by semitones
                </p>
              </div>
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

            {/* Safe area padding at bottom */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </>
  );
};