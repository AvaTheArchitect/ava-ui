'use client';

/**
 * LoopControl.tsx - V69 HEIGHT STANDARDIZATION
 * Date: November 14th, 2025
 * 
 * FIXES:
 * ✅ Fixed button height to 74px (was varying with py-2)
 * ✅ Reduced gap from gap-1 to gap-0.5 for tighter spacing
 * ✅ Optimized internal layout for consistent 74px height
 * 
 * Simple loop toggle button - Songsterr style
 * 
 * STATE MANAGEMENT ONLY - No coordinate geometry!
 * Geometry/handles remain in AlphaTabRenderer.tsx
 * 
 * This component:
 * - Manages isLooping state
 * - Emits onLoopToggle callback to parent
 * - Shows visual feedback when selection exists
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
            {/* Loop Button - FIXED HEIGHT 74px */}
            <button
                id="control-loop"
                onClick={onLoopToggle}
                disabled={!api}
                aria-pressed={isLooping}
                aria-haspopup="false"
                title="Toggle Loop ((L)) - Click & drag on notation to select section"
                className={`
          flex flex-col items-center justify-center gap-0.5 px-4 h-[74px]
          rounded-lg transition-all duration-200
          ${isLooping
                        ? 'bg-blue-500/20 border-2 border-blue-400/50'
                        : 'bg-gray-800/80 border border-gray-600 hover:bg-gray-700/80'
                    }
          ${!api ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                {/* Loop Icon */}
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className={`transition-colors ${isLooping ? 'text-blue-400' : 'text-gray-400'
                        }`}
                    fill="currentColor"
                >
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>

                {/* Label + Selection Indicator */}
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Loop</span>
                    {hasSelection && isLooping && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    )}
                </div>
            </button>

            {/* Help Tooltip - Only show when loop enabled but no selection */}
            {isLooping && !hasSelection && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-blue-400/50 rounded-lg text-xs text-blue-200 whitespace-nowrap shadow-xl z-50">
                    Click & drag on notation to select loop region
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-400/50" />
                </div>
            )}
        </div>
    );
};