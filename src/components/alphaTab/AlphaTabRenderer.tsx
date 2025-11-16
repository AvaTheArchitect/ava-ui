'use client';

/**
 * AlphaTab Renderer - STAGE 1.2
 * November 15th, 2025 - V78: Landscape Mode Integration
 * 
 * 🔧 NEW IN V78:
 * ✅ Uses isMobileLandscape prop from page.tsx (consistent orientation detection)
 * ✅ Removed internal resize listener (page.tsx handles orientation now)
 * ✅ Horizontal layout + auto-scroll for mobile landscape
 * ✅ Page layout + vertical scroll for portrait/desktop
 * ✅ Proper scrollElement configuration for Grid layout
 * ✅ RESTORED: Inline styles + JSX styles for overflow/touch handling
 * 
 * V70: Restore Click/Tap Detection
 * V69: Fix Loop Highlight Issue
 * V68: Remove Rounded Corners
 * V67: Fixed scroll container for CSS Grid layout
 */

import React, { useEffect, useRef, useState } from 'react';
import { initAlphaTab, loadGuitarProFile } from '@/lib/alphaTab/initAlphaTab';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

export interface AlphaTabRendererProps {
    fileUrl: string;
    onApiReady?: (api: AlphaTabApi) => void;
    onScoreLoaded?: (info: SongInfo, tracks: Track[]) => void;
    onRenderFinished?: () => void;
    onError?: (error: string) => void;
    className?: string;
    minHeight?: string;
    playerMode?: 'disabled' | 'external' | 'synthesizer';
    soundFontPath?: string;

    // V67: Custom scroll container for Grid layout
    scrollContainerRef?: React.RefObject<HTMLElement>;

    // 🆕 V78: Landscape orientation state from page.tsx
    isMobileLandscape?: boolean;

    // MENU TRAY INTEGRATION (Stage 1+)
    isLooping?: boolean;
    onLoopRangeChange?: (start: number, end: number) => void;
}

// ==================== HELPER FUNCTIONS ====================

const getBeatAtPosition = (
    api: AlphaTabApi,
    container: HTMLElement,
    x: number,
    y: number
) => {
    if (!api.renderer?.boundsLookup) return null;
    const rect = container.getBoundingClientRect();
    const relX = x - rect.left + container.scrollLeft;
    const relY = y - rect.top + container.scrollTop;
    return api.renderer.boundsLookup.getBeatAtPos(relX, relY);
};

// ==================== REACT COMPONENT ====================

export const AlphaTabRenderer: React.FC<AlphaTabRendererProps> = ({
    fileUrl,
    onApiReady,
    onScoreLoaded,
    onRenderFinished,
    onError,
    className = '',
    minHeight = '600px',
    playerMode = 'external',
    soundFontPath = '/soundfont/sonivox.sf2',
    scrollContainerRef,
    isMobileLandscape = false, // 🆕 V78: Default to false
    isLooping,
    onLoopRangeChange,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    // Mobile detection
    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 1024;
        const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
        console.log(`📱 V78: Mobile detection - ${mobile ? 'MOBILE' : 'DESKTOP'}`);
        return mobile;
    };

    const [isMobile] = useState(() => detectMobile());

    // ==================== INITIALIZE ALPHATAB (ONCE) ====================
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 V78: Initializing AlphaTab');

                // 🔧 V78: Use prop for initial layout mode
                const layoutMode = isMobileLandscape ? 'horizontal' : 'page';
                console.log(`📱 V78: Initial layout mode: ${layoutMode}`);

                const customScrollContainer = scrollContainerRef?.current;

                if (customScrollContainer) {
                    console.log('✅ V78: Using custom scroll container (Grid <main> element)');
                } else {
                    console.log('⚠️ V78: No custom scroll container provided');
                }

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile,
                    enableUserInteraction: false,
                    scrollContainer: customScrollContainer || undefined,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ V78: AlphaTab API ready');

                // Load score
                await loadGuitarProFile(api, fileUrl);
                if (!isMounted) return;

                // Setup event handlers
                if (api.scoreLoaded) {
                    api.scoreLoaded.on((score: any) => {
                        console.log('✅ V78: Score loaded');
                        const trackList = Array.from({ length: score.tracks.length }, (_, i) => ({
                            index: i,
                            name: score.tracks[i].name,
                            color: score.tracks[i].color,
                            playbackInfo: {
                                volume: score.tracks[i].playbackInfo?.volume || 1,
                                isMuted: false,
                                isSoloed: false,
                            },
                        }));

                        const info = {
                            title: score.title,
                            artist: score.artist,
                            album: score.album,
                            tempo: score.tempo,
                        };

                        setScoreIsLoaded(true);
                        onScoreLoaded?.(info, trackList);
                    });
                }

                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ V78: Rendering complete');
                        setIsRendered(true);
                        setIsLoading(false);
                        onRenderFinished?.();
                    });
                }

                onApiReady?.(api);

                // Start rendering
                api.render();
            } catch (error) {
                console.error('❌ V78: Initialization error:', error);
                if (isMounted) {
                    setIsLoading(false);
                    onError?.(error instanceof Error ? error.message : 'Unknown error');
                }
            }
        };

        initialize();

        return () => {
            isMounted = false;
        };
    }, [fileUrl, playerMode, soundFontPath, isMobile, isMobileLandscape, scrollContainerRef, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // ==================== UNIFIED CLICK/TAP INTERACTION ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        // Defensive element selection
        let surface = container.querySelector('.at-surface') as HTMLElement;
        if (!surface) {
            surface = container.querySelector('.at-viewport') as HTMLElement;
        }
        if (!surface) {
            surface = container;
        }

        console.log(`🎯 V78: Attaching click/tap handlers`);

        // Shared state for both mouse and touch
        let tapCount = 0;
        let tapTimer: NodeJS.Timeout | null = null;
        const TAP_DELAY = 250; // ms to wait for double tap

        // UNIFIED TAP HANDLER - works for both mouse and touch
        const handleTap = (x: number, y: number, isDoubleTap: boolean) => {
            const beat = getBeatAtPosition(api, container, x, y);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                // Always seek to the beat position
                if (api.tickPosition !== undefined) {
                    api.tickPosition = beat.absolutePlaybackStart;
                    console.log(
                        isDoubleTap
                            ? `🎵 V78: Double-tap at tick ${beat.absolutePlaybackStart}`
                            : `🎯 V78: Single-tap seek to tick ${beat.absolutePlaybackStart}`
                    );
                }

                // If double tap, also start playback
                if (isDoubleTap) {
                    setTimeout(() => {
                        try {
                            if (api.play) {
                                api.play();
                            } else if ((api as any).playPause) {
                                (api as any).playPause();
                            }
                            console.log('✅ V78: Playback started from double-tap');
                        } catch (err) {
                            console.error('❌ V78: Failed to start playback:', err);
                        }
                    }, 50);
                }
            }
        };

        // MOUSE EVENTS (Desktop)
        const handleMouseClick = (e: MouseEvent) => {
            e.preventDefault();
            tapCount++;

            if (tapCount === 1) {
                tapTimer = setTimeout(() => {
                    handleTap(e.clientX, e.clientY, false);
                    tapCount = 0;
                }, TAP_DELAY);
            } else if (tapCount === 2) {
                if (tapTimer) {
                    clearTimeout(tapTimer);
                    tapTimer = null;
                }
                handleTap(e.clientX, e.clientY, true);
                tapCount = 0;
            }
        };

        // TOUCH EVENTS (Mobile/PWA)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        const MAX_TAP_MOVE = 10;
        const MAX_TAP_DURATION = 300;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();

            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const duration = Date.now() - touchStartTime;

            const moveX = Math.abs(touchEndX - touchStartX);
            const moveY = Math.abs(touchEndY - touchStartY);
            const isTap = moveX < MAX_TAP_MOVE && moveY < MAX_TAP_MOVE && duration < MAX_TAP_DURATION;

            if (!isTap) return;

            tapCount++;

            if (tapCount === 1) {
                tapTimer = setTimeout(() => {
                    handleTap(touchEndX, touchEndY, false);
                    tapCount = 0;
                }, TAP_DELAY);
            } else if (tapCount === 2) {
                if (tapTimer) {
                    clearTimeout(tapTimer);
                    tapTimer = null;
                }
                handleTap(touchEndX, touchEndY, true);
                tapCount = 0;
            }
        };

        // Attach event listeners
        surface.addEventListener('click', handleMouseClick as EventListener);
        surface.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
        surface.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });

        // Cleanup
        return () => {
            surface.removeEventListener('click', handleMouseClick as EventListener);
            surface.removeEventListener('touchstart', handleTouchStart as EventListener);
            surface.removeEventListener('touchend', handleTouchEnd as EventListener);
            if (tapTimer) clearTimeout(tapTimer);
        };
    }, [isRendered, playerMode, scoreIsLoaded, isMobile]);

    // ==================== 🔧 V78: ORIENTATION HANDLING (PROP-DRIVEN) ====================
    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;
        if (!container) return;

        const updateOrientation = async () => {
            const alphaTab = await import('@coderline/alphatab');

            console.log(`🔄 V78: Orientation change - Landscape: ${isMobileLandscape}`);

            if (isMobileLandscape) {
                // 🎸 LANDSCAPE: Horizontal layout + container scroll
                console.log('🎸 V78: Switching to LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
                (api.settings.player as any).scrollOffsetY = 0;

                console.log(`✅ V78: Horizontal scroll - element: container, offsetX: 15%`);
            } else {
                // 📱 PORTRAIT/DESKTOP: Page layout + Grid container scroll
                console.log('📱 V78: Switching to PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                const scrollElement = scrollContainerRef?.current || document.body;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffsetY = -200;
                (api.settings.player as any).scrollOffsetX = 0;

                console.log(`✅ V78: Vertical scroll - element: ${scrollContainerRef?.current ? '<main>' : 'document.body'}, offsetY: -200px`);
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
            console.log('✅ V78: Re-render complete');
        };

        updateOrientation();
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef]);
    // 🔧 V78: No resize listener - page.tsx handles orientation detection

    // ==================== LOOP CONTROL ====================
    useEffect(() => {
        if (!apiRef.current) return;

        const api = apiRef.current;

        if (api.isLooping !== undefined) {
            api.isLooping = isLooping ?? false;
        }

        if (api.settings?.player) {
            (api.settings.player as any).enableUserInteraction = isLooping ?? false;
            api.updateSettings();
        }

        if (!isLooping && api.playbackRange !== undefined) {
            api.playbackRange = null;
            console.log('🔄 V78: Loop disabled');
        }

        console.log(`🔄 V78: Loop state - isLooping=${isLooping ?? false}`);
    }, [isLooping]);

    // ==================== RENDER ====================
    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium">
                            {playerMode === 'synthesizer'
                                ? 'Loading tab & initializing synthesizer...'
                                : 'Loading tab...'}
                        </p>
                    </div>
                </div>
            )}

            {/* 🔧 V78: RESTORED inline styles + className for overflow/touch handling */}
            <div
                ref={containerRef}
                className={`${className} alphatab-container-stage1`}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                }}
            />

            {/* 🔧 V78: RESTORED Stage 1 CSS Fix for touch/overflow */}
            <style jsx>{`
                .alphatab-container-stage1 {
                    overflow-x: auto !important;
                    /* Allow touch interactions */
                    touch-action: manipulation;
                    -webkit-user-select: none;
                    user-select: none;
                }
                
                /* Minimal fade at bottom to reduce 3rd row bleed */
                .alphatab-container-stage1 :global(.at-surface) {
                    -webkit-mask-image: linear-gradient(to bottom, 
                        black 0%, 
                        black calc(100% - 30px), 
                        rgba(0,0,0,0.3) calc(100% - 15px),
                        transparent 100%
                    );
                    mask-image: linear-gradient(to bottom, 
                        black 0%, 
                        black calc(100% - 30px), 
                        rgba(0,0,0,0.3) calc(100% - 15px),
                        transparent 100%
                    );
                    /* Allow touch interactions on SVG */
                    touch-action: manipulation;
                }
            `}</style>
        </div>
    );
};