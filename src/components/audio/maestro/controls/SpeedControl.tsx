'use client';

/**
 * SpeedControl.tsx - V92.6: position:fixed viewport-anchored panel — master blueprint
 * Date: March 23rd, 2026
 *
 * 🆕 V92.6 — TRANSPORT PANEL POSITIONING BLUEPRINT:
 * ✅ Panel is position:fixed — immune to parent container height variance
 * ✅ bottom is locked to TRANSPORT_BAR_HEIGHT (74px) — always flush with TransportBar top edge
 * ✅ left is measured from triggerRef.getBoundingClientRect() on open — correct horizontal anchor
 * ✅ Viewport clamp prevents right-edge overflow on narrow screens / mobile
 * ✅ No more manual bottom-[Xpx] nudging — this pattern is stable across all screen sizes
 *
 * 📐 BLUEPRINT — apply this pattern to all transport popups:
 *   1. const triggerRef = useRef<HTMLButtonElement>(null)
 *   2. On open: measure triggerRef.current.getBoundingClientRect().left → setPanelLeft()
 *   3. Panel: position fixed, bottom TRANSPORT_BAR_HEIGHT, left via inline style (clamped)
 *   4. z-[200] — above notation canvas, below any true modal overlays
 *
 * 🔒 PRESERVED FROM V92.5:
 * ✅ globals.css design tokens (panel-bg, panel-border, section-bg, text tiers, maestro-purple)
 * ✅ currentBPM prop + baseBPM fallback chain
 * ✅ Trigger button — fixed dark chrome, UNTOUCHED
 * ✅ Speed panel layout, sizing, preset grid — UNTOUCHED
 */

import React, { useCallback, useRef, useState } from 'react';
import type { SpeedControlProps } from './MaestroControlTypes';

// ─── Shared constant — import this in every transport panel file ──────────────
const TRANSPORT_BAR_HEIGHT = 74; // px — TransportBar fixed height
const PANEL_WIDTH = 280;         // px — min-w for clamp calculation

interface ExtendedSpeedControlProps extends SpeedControlProps {
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  currentBPM?: number; // engine-derived BPM from page.tsx (api.score.masterBars[0])
}

export const SpeedControl: React.FC<ExtendedSpeedControlProps> = ({
  api,
  playbackSpeed,
  songInfo,
  onSpeedChange,
  isPanelOpen = false,
  onTogglePanel,
  currentBPM: currentBPMProp,
}) => {
  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
  const baseBPM = currentBPMProp ?? songInfo?.tempo ?? 0;
  const currentBPM = baseBPM ? Math.round(baseBPM * playbackSpeed) : 0;

  // ── Blueprint step 1: ref on the trigger ─────────────────────────────────
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelLeft, setPanelLeft] = useState(0);

  // ── Blueprint step 2: measure on open ────────────────────────────────────
  const handleToggle = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Clamp: prevent panel from overflowing right edge of viewport
      const clamped = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8);
      setPanelLeft(clamped);
    }
    if (onTogglePanel) onTogglePanel();
  }, [onTogglePanel]);

  const handleClose = useCallback(() => {
    if (onTogglePanel && isPanelOpen) onTogglePanel();
  }, [onTogglePanel, isPanelOpen]);

  const handleSpeedChange = useCallback((speed: number) => {
    onSpeedChange(speed);
  }, [onSpeedChange]);

  const handleReset = useCallback(() => {
    onSpeedChange(1.0);
  }, [onSpeedChange]);

  return (
    <div id="c-speed" className="relative z-[50] w-full">

      {/* ── Trigger — fixed dark chrome, UNTOUCHED ── */}
      <button
        ref={triggerRef}
        id="control-speed"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-pressed={isPanelOpen}
        disabled={!api}
        className={`
          group relative flex items-center justify-center
          w-full p-0
          transition-all duration-200 hover:brightness-125
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Icon + Percentage */}
        <div className="flex items-center justify-center gap-1 h-[24px]">
          <svg width="24" height="18" viewBox="0 0 28 20" className={`flex-shrink-0 transition-colors ${isPanelOpen ? 'text-green-400' : 'text-blue-300 group-hover:text-cyan-300'}`}>
            <path d="M 2 16 A 12 12 0 0 1 26 16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path
              d="M 2 16 A 12 12 0 0 1 26 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${playbackSpeed * 37.7} 100`}
              opacity="0.9"
              className={playbackSpeed > 1 ? 'text-orange-500' : ''}
            />
            <g transform={`rotate(${(playbackSpeed - 0.25) * 144 - 90}, 14, 16)`}>
              <line x1="14" y1="16" x2="14" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="14" cy="16" r="2" fill="currentColor" />
            </g>
          </svg>
          <span className="font-bold text-[12px] tabular-nums leading-none text-blue-300 group-hover:text-cyan-300">
            {Math.round(playbackSpeed * 100)}%
          </span>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
          <div>Open speed panel <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">S</kbd></div>
          <div className="text-gray-400 text-[11px] mt-1">Change tempo <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Opt</kbd> <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">1-8</kbd> | <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">A/D</kbd> for 1 bpm</div>
        </div>
      </button>

      {/* ── Speed Panel — Blueprint step 3: fixed, bottom locked, left measured ── */}
      {isPanelOpen && (
        <div
          className="fixed rounded-lg shadow-maestro p-4 min-w-[280px] z-[200] overflow-hidden
            bg-[var(--panel-bg)] border border-[var(--panel-border)]"
          style={{
            bottom: TRANSPORT_BAR_HEIGHT,
            left: panelLeft,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 h-5">
            <span className="text-sm font-bold leading-none text-[var(--text-primary)]">
              Playback Speed
            </span>
            <button
              onClick={handleClose}
              className="leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close speed panel"
            >
              ✕
            </button>
          </div>

          {/* BPM Display */}
          {baseBPM > 0 && (
            <div className="mb-4 text-center h-[52px] flex flex-col justify-center rounded-md bg-[var(--section-bg)]">
              <div className="text-2xl font-bold tabular-nums leading-tight text-[var(--text-primary)]">
                {currentBPM} <span className="text-lg">BPM</span>
              </div>
              <div className="text-[11px] tabular-nums leading-none mt-1 text-[var(--text-muted)]">
                Original: {Math.round(baseBPM)} BPM
              </div>
            </div>
          )}

          {/* Slider */}
          <div className="mb-5 h-6 flex items-center">
            <input
              type="range" min="0.25" max="1.5" step="0.05"
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-400
                bg-[var(--section-border)]"
            />
          </div>

          {/* Speed Presets */}
          <div className="grid grid-cols-3 gap-2 h-[84px]">
            {speedPresets.map((speed) => (
              <button
                key={speed}
                onClick={(e) => { e.stopPropagation(); handleSpeedChange(speed); }}
                className={`px-2 py-2 rounded-lg text-sm font-bold tabular-nums transition-all border-2 ${Math.abs(playbackSpeed - speed) < 0.01
                    ? 'bg-blue-600 text-white border-blue-400'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--section-bg)]'
                  }`}
              >
                {Math.round(speed * 100)}%
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="w-full mt-3 h-10 rounded-lg text-sm font-bold transition-all border-2 border-transparent
              bg-maestro-purple text-white hover:brightness-110"
          >
            Reset to 100%
          </button>
        </div>
      )}
    </div>
  );
};