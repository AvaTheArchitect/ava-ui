'use client';

/**
 * LoopControl.tsx - V87.6: Selection dot removed — green icon is the only active state indicator
 * Date: March 21st, 2026
 *
 * 🆕 V87.4:
 * ✅ Selection indicator dot: [@media(max-width:960px)]:hidden
 *    Prevents dot from pushing LOOP label down at 44px compact size
 *
 * 🔒 PRESERVED FROM V87.3:
 * ✅ Label removed — lives in TransportBar LABEL_CLS
 * ✅ Selection indicator dot kept at full width (state feedback)
 * ✅ Wide tooltip format (Toggle Loop + L kbd + subtitle)
 * ✅ Green icon when active, blue when inactive
 * ✅ Help tooltip when looping but no selection made
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
                  group relative flex flex-col items-center justify-center gap-0.5
                  w-full p-0
                  transition-all duration-200 hover:brightness-125
                  ${!api ? 'opacity-50 cursor-not-allowed' : ''}
                `}
            >
                {/* Loop icon — green when active */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className={`transition-colors ${isLooping ? 'text-green-400' : 'text-blue-300 group-hover:text-cyan-300'}`}
                    fill="currentColor"
                >
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>



                {/* Tooltip — wide format */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-[7px] pb-[10px] bg-black/95 text-white text-[13px] leading-[18px] tracking-[0.4px] rounded-lg opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-out pointer-events-none z-[11000] whitespace-nowrap">
                    <div>Toggle Loop <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[11px]">L</kbd></div>
                    <div className="text-gray-400 text-[11px] mt-1">Click & drag on notation to select section</div>
                </div>
            </button>

            {/* Help tooltip — when loop enabled but no selection made */}
            {isLooping && !hasSelection && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-blue-400/50 rounded-lg text-xs text-blue-200 whitespace-nowrap shadow-xl z-50">
                    Click & drag on notation to select loop region
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-400/50" />
                </div>
            )}
        </div>
    );
};