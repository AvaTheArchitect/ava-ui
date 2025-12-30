'use client';

/**
 * CountInOverlay.tsx - V2: VISIBLE CANVAS BACKGROUND
 * Date: December 29th, 2025
 * 
 * 🆕 NEW IN V2:
 * ✅ Canvas visible behind countdown (no blur, minimal dimming)
 * ✅ Transparent background allows tablature to show through
 * ✅ Green circle stands out but doesn't block view
 * 
 * 🎵 Features:
 * ✅ Circular green overlay (Songsterr mobile style)
 * ✅ Large white countdown numbers: 3 → 2 → 1
 * ✅ "COUNT IN ON" label below number
 * ✅ Smooth fade-in/fade-out
 * ✅ Auto-closes after countdown
 * ✅ Centered on screen
 */

import React, { useEffect, useState } from 'react';

interface CountInOverlayProps {
    /** Current countdown number (3, 2, 1, or 0 when finished) */
    count: number;
    /** Whether the overlay should be visible */
    isVisible: boolean;
    /** Called when countdown completes */
    onComplete?: () => void;
}

export const CountInOverlay: React.FC<CountInOverlayProps> = ({
    count,
    isVisible,
    onComplete,
}) => {
    const [shouldRender, setShouldRender] = useState(isVisible);

    // Handle visibility transitions
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
        } else {
            // Delay unmount to allow fade-out animation
            const timeout = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timeout);
        }
    }, [isVisible]);

    // Call onComplete when count reaches 0
    useEffect(() => {
        if (count === 0 && isVisible) {
            onComplete?.();
        }
    }, [count, isVisible, onComplete]);

    if (!shouldRender) return null;

    return (
        <div
            className={`
        fixed inset-0 z-[10000] flex items-center justify-center
        bg-black/10
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
            style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
        >
            {/* Circular Countdown Container */}
            <div
                className={`
          flex flex-col items-center justify-center
          w-[200px] h-[200px]
          bg-green-500 rounded-full
          shadow-2xl
          transition-transform duration-300
          ${isVisible ? 'scale-100' : 'scale-95'}
        `}
            >
                {/* Countdown Number */}
                {count > 0 && (
                    <div className="text-white font-bold text-[80px] leading-none tabular-nums animate-pulse">
                        {count}
                    </div>
                )}

                {/* Label */}
                <div className="text-white font-semibold text-[14px] uppercase tracking-wider mt-2">
                    COUNT IN ON
                </div>
            </div>
        </div>
    );
};