'use client';

/**
 * Custom Loop Overlay - V98.33 - VISUAL ONLY (No Audio Sync)
 * Date: January 14th, 2026
 *
 * 🎯 PURPOSE: Render visual loop overlay ONLY
 * 
 * 🔧 V98.33 CRITICAL CHANGE:
 * ✅ REMOVED audio sync logic (was conflicting with V98.39 watchdog)
 * ✅ AlphaTabRenderer V98.39 now handles ALL audio loop enforcement
 * ✅ CustomLoopOverlay is now purely visual - no audio touching
 * 
 * 🔒 PRESERVED FROM V98.32:
 * ✅ visualBounds property access for coordinates
 * ✅ Multi-system support (calculates rectangles for each system)
 * ✅ Uses tickCache.findBeat() for position lookup
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { AlphaTabApi } from '@/lib/alphaTab/types';

interface CustomLoopOverlayProps {
    api: AlphaTabApi | null;
    isLooping: boolean;
    theme?: 'light' | 'dark';
}

export const CustomLoopOverlay: React.FC<CustomLoopOverlayProps> = ({
    api,
    isLooping,
    theme = 'light',
}) => {
    const [overlayStyles, setOverlayStyles] = useState<React.CSSProperties[]>([]);

    /**
     * 🎯 V98.32: Calculate overlay using tickCache (V98.31 method) + visualBounds fix
     */
    const updateBounds = useCallback(() => {
        if (!api || !api.playbackRange || !isLooping) {
            setOverlayStyles([]);
            return;
        }

        if (!api.renderer?.boundsLookup) {
            console.warn('⚠️ V98.32: boundsLookup not available');
            return;
        }

        try {
            const { startTick, endTick } = api.playbackRange;

            // Use tickCache to find beats (same method as V98.31)
            const trackIndices = api.tracks
                ? new Set(api.tracks.map((t: any) => t.index))
                : new Set([0]);
            const tickCache = (api as any).tickCache;

            if (!tickCache) {
                console.warn('⚠️ V98.32: tickCache not available');
                return;
            }

            // Find beats at start and end
            const startBeatResult = tickCache.findBeat(trackIndices, startTick);
            const endBeatResult = tickCache.findBeat(trackIndices, endTick - 1);

            if (!startBeatResult?.beat || !endBeatResult?.beat) {
                console.warn('⚠️ V98.32: Could not find beats');
                return;
            }

            // Get bounds for the beats
            const startBounds = api.renderer.boundsLookup.findBeat(startBeatResult.beat);
            const endBounds = api.renderer.boundsLookup.findBeat(endBeatResult.beat);

            if (!startBounds || !endBounds) {
                console.warn('⚠️ V98.32: Could not find beat bounds');
                return;
            }

            // Extract bar bounds from beat bounds
            const startBarBounds = (startBounds as any)?.barBounds;
            const endBarBounds = (endBounds as any)?.barBounds;

            if (!startBarBounds) {
                console.warn('⚠️ V98.32: Could not find bar bounds');
                return;
            }

            // 🎯 V98.32 FIX: Access coordinates via visualBounds property
            const startVis = startBarBounds.visualBounds;
            const endVis = endBarBounds?.visualBounds || startVis;

            // Check if loop spans multiple systems (different Y positions)
            const isMultiSystem = Math.abs(startVis.y - endVis.y) > 50; // 50px threshold

            if (isMultiSystem) {
                // 🎯 Multi-system loop: Create separate rectangles for each line
                const rectangles: React.CSSProperties[] = [];

                // Start bar (from loop start to end of its system)
                const startMasterBounds = (startBarBounds as any).masterBarBounds;
                if (startMasterBounds?.staffSystemBounds) {
                    const systemBounds = startMasterBounds.staffSystemBounds.visualBounds;
                    const startRectWidth = (systemBounds.x + systemBounds.w) - startVis.x;

                    rectangles.push({
                        left: `${startVis.x}px`,
                        top: `${startVis.y}px`,
                        width: `${startRectWidth}px`,
                        height: `${startVis.h}px`,
                        position: 'absolute' as const,
                        backgroundColor: theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(0, 0, 0, 0.15)',
                        pointerEvents: 'none' as const,
                        zIndex: 997,
                    });
                }

                // End bar (from start of its system to loop end)
                const endMasterBounds = (endBarBounds as any)?.masterBarBounds;
                if (endMasterBounds?.staffSystemBounds) {
                    const systemBounds = endMasterBounds.staffSystemBounds.visualBounds;
                    const endRectWidth = (endVis.x + endVis.w) - systemBounds.x;

                    rectangles.push({
                        left: `${systemBounds.x}px`,
                        top: `${endVis.y}px`,
                        width: `${endRectWidth}px`,
                        height: `${endVis.h}px`,
                        position: 'absolute' as const,
                        backgroundColor: theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(0, 0, 0, 0.15)',
                        pointerEvents: 'none' as const,
                        zIndex: 997,
                    });
                }

                setOverlayStyles(rectangles);
                console.log(`🎯 V98.32: Multi-system loop - ${rectangles.length} rectangles`);
            } else {
                // 🎯 Single-system loop: One rectangle from start to end
                const x = startVis.x;
                const y = startVis.y;
                const width = (endVis.x + endVis.w) - startVis.x;
                const height = startVis.h;

                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: theme === 'dark'
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.15)',
                    pointerEvents: 'none',
                    zIndex: 997,
                };

                setOverlayStyles([style]);
                console.log(`🎯 V98.32: Loop overlay positioned at (${x}, ${y}) size ${width}x${height}`);
            }
        } catch (err) {
            console.error('❌ V98.32: Error:', err);
            setOverlayStyles([]);
        }
    }, [api, isLooping, theme]);

    /**
     * 🔧 V98.33: REMOVED AUDIO SYNC (Conflicts with V98.39 Watchdog)
     * The AlphaTabRenderer watchdog now handles all audio loop enforcement.
     * CustomLoopOverlay ONLY renders the visual overlay - no audio touching!
     */
    // Audio sync removed - handled by AlphaTabRenderer V98.39 watchdog

    /**
     * Update overlay positions on:
     * - Playback range change
     * - Window resize
     * - Render finish (layout change)
     */
    useEffect(() => {
        if (!api || !isLooping) {
            setOverlayStyles([]);
            return;
        }

        // Initial positioning
        updateBounds();

        // Listen for render finished (layout changes)
        const handleRenderFinished = () => {
            console.log('🎨 V98.32: Render finished, updating overlay');
            // Delay to ensure bounds are available
            setTimeout(updateBounds, 100);
        };

        api.renderFinished?.on(handleRenderFinished);

        // Listen for window resize
        const handleResize = () => {
            console.log('📐 V98.32: Window resized, updating overlay');
            updateBounds();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            api.renderFinished?.off(handleRenderFinished);
            window.removeEventListener('resize', handleResize);
        };
    }, [api, isLooping, updateBounds]);

    /**
     * Update when playback range changes
     */
    useEffect(() => {
        if (!api) return;

        const handleRangeChanged = () => {
            console.log('🔄 V98.32: Playback range changed, updating overlay');
            updateBounds();
        };

        api.playbackRangeChanged?.on(handleRangeChanged);

        return () => {
            api.playbackRangeChanged?.off(handleRangeChanged);
        };
    }, [api, updateBounds]);

    if (!isLooping || overlayStyles.length === 0) {
        return null;
    }

    return (
        <>
            {overlayStyles.map((style, index) => (
                <div
                    key={`loop-overlay-${index}`}
                    className="custom-loop-overlay"
                    style={style}
                />
            ))}
        </>
    );
};