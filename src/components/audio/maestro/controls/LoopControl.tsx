'use client';

/**
 * LoopControl.tsx - V87.2: Remove Box + Wide Tooltip + 12px Label
 * Date: November 18th, 2025
 * 
 * 🔧 NEW IN V87.2:
 * ✅ Removed box/background (clean like Speed button)
 * ✅ Label "LOOP" uppercase 12px
 * ✅ Tooltip WIDE not tall
 * ✅ Green icon when active
 */

import React from 'react';
import type { LoopControlProps } from './MaestroControlTypes';

export const LoopControl: React.FC<LoopControlProps> = ({
    api,
    isLooping,
    hasSelection,
    onLoopToggle,
}) => {
    return (
        <div id="c-loop" className="relative">
            <button
                id="control-loop"
                onClick={onLoopToggle}
                disabled={!api}
                aria-pressed={isLooping}
                className={`
          group relative flex flex-col items-center justify-center gap-1 px-4 py-2 h-[74px]
          transition-all duration-200 hover:brightness-125
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                {/* Loop Icon - Green when active, blue when inactive */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className={`transition-colors ${isLooping ? 'text-green-400' : 'text-blue-200'}`}
                    fill="currentColor"
                >
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>

                {/* Label + Selection Indicator */}
                <div className="flex items-center gap-1">
                    <span className="text-[12px] uppercase text-blue-200/70 tracking-wide">LOOP</span>
                    {hasSelection && isLooping && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                </div>

                {/* 🎯 TOOLTIP - WIDE FORMAT */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
                    <div>Toggle Loop <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">L</kbd></div>
                    <div className="text-gray-400 text-[11px] mt-1">Click & drag on notation to select section</div>
                </div>
            </button>

            {/* Help Tooltip - when loop enabled but no selection */}
            {isLooping && !hasSelection && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-blue-400/50 rounded-lg text-xs text-blue-200 whitespace-nowrap shadow-xl z-50">
                    Click & drag on notation to select loop region
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-400/50" />
                </div>
            )}
        </div>
    );
};