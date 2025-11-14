'use client';

/**
 * AlphaTab Renderer - STAGE 1.2
 * November 14th, 2025 - V70: Restore Click/Tap Detection
 * V69 - Fix Loop Highlight Issue
 * V68 - Remove Rounded Corners
 * V67 - Fixed scroll container for CSS Grid layout
 * V66 - Added Menu Tray Props (isLooping, onLoopRangeChange)
 * V65 - Fixed Mobile Detection & Touch Event Logging
 * 
 * NEW IN V70:
 * ✅ Restored sophisticated unified click/tap handler (Stage 1.2 code)
 * ✅ Single-tap/click: Seek to beat position
 * ✅ Double-tap/click: Seek + Start playback
 * ✅ Separate mouse and touch event handling
 * ✅ Tap detection (vs swipe): moveX/moveY < 10px, duration < 300ms
 * 
 * NEW IN V69:
 * ✅ Changed enableUserInteraction to FALSE to prevent unwanted loop highlight
 * 
 * KEPT FROM V67 (STAGE 1.2):
 * ✅ scrollContainerRef prop - fixes auto-scroll for Grid layout
 * ✅ Passes custom scroll element to initAlphaTab
 * ✅ Prevents cursor from rendering over bottom menu tray
 * 
 * CRITICAL FIX:
 * The CSS Grid layout (grid-rows-[auto,1fr,auto]) changed the scrollable
 * container from document.body to the <main> element. This broke auto-scroll
 * because AlphaTab was still trying to scroll the wrong element.
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

    // 🆕 V67: Custom scroll container for Grid layout
    scrollContainerRef?: React.RefObject<HTMLElement>;

    // 🆕 MENU TRAY INTEGRATION (Stage 1+)
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
    isLooping,
    onLoopRangeChange, // Placeholder for future Stage 2 loop geometry features
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    // 🎯 V65: SYNCHRONOUS mobile detection - must happen before initAlphaTab
    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 1024;
        const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
        console.log(`📱 V69: Mobile detection - UA:${isMobileUA}, Touch:${isTouchDevice}, Small:${isSmallScreen} → ${mobile ? 'MOBILE' : 'DESKTOP'}`);
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
                console.log('🎸 V70: Initializing AlphaTab with custom scroll container');

                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                // 🆕 V67: Get custom scroll container (the <main> element from Grid layout)
                const customScrollContainer = scrollContainerRef?.current;

                if (customScrollContainer) {
                    console.log('✅ V70: Using custom scroll container (Grid <main> element)');
                } else {
                    console.log('⚠️ V70: No custom scroll container provided, using default');
                }

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile,
                    enableUserInteraction: false, // 🎯 V69: FALSE to prevent unwanted loop highlight
                    // 🆕 V67: Pass custom scroll container
                    scrollContainer: customScrollContainer || undefined,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ V70: AlphaTab API ready');

                // Load score
                await loadGuitarProFile(api, fileUrl);
                if (!isMounted) return;

                // Setup event handlers
                if (api.scoreLoaded) {
                    api.scoreLoaded.on((score: any) => {
                        console.log('✅ V70: Score loaded');
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
                        console.log('✅ V70: Rendering complete');
                        setIsRendered(true);
                        setIsLoading(false);
                        onRenderFinished?.();
                    });
                }

                onApiReady?.(api);

                // Start rendering
                api.render();
            } catch (error) {
                console.error('❌ V70: Initialization error:', error);
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
    }, [fileUrl, playerMode, soundFontPath, isMobile, scrollContainerRef, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // ==================== UNIFIED CLICK/TAP INTERACTION ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        // 🎯 V70: Defensive element selection
        let surface = container.querySelector('.at-surface') as HTMLElement;
        if (!surface) {
            surface = container.querySelector('.at-viewport') as HTMLElement;
        }
        if (!surface) {
            surface = container;
        }

        console.log(`🎯 V70: Attaching to element:`, surface.className || 'container', `isMobile:${isMobile}`);

        // Shared state for both mouse and touch
        let tapCount = 0;
        let tapTimer: NodeJS.Timeout | null = null;
        const TAP_DELAY = 250; // ms to wait for double tap

        // 🎯 V70: UNIFIED TAP HANDLER - works for both mouse and touch
        const handleTap = (x: number, y: number, isDoubleTap: boolean) => {
            const beat = getBeatAtPosition(api, container, x, y);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                // Always seek to the beat position
                if (api.tickPosition !== undefined) {
                    api.tickPosition = beat.absolutePlaybackStart;
                    console.log(
                        isDoubleTap
                            ? `🎵 V70: Double-tap/click at tick ${beat.absolutePlaybackStart}`
                            : `🎯 V70: Single-tap/click seek to tick ${beat.absolutePlaybackStart}`
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
                            console.log('✅ V70: Playback started from double-tap/click');
                        } catch (err) {
                            console.error('❌ V70: Failed to start playback:', err);
                        }
                    }, 50);
                }
            }
        };

        // 🖱️ MOUSE EVENTS (Desktop)
        const handleMouseClick = (e: MouseEvent) => {
            e.preventDefault();
            tapCount++;

            if (tapCount === 1) {
                // Wait to see if it's a double-click
                tapTimer = setTimeout(() => {
                    handleTap(e.clientX, e.clientY, false);
                    tapCount = 0;
                }, TAP_DELAY);
            } else if (tapCount === 2) {
                // Double-click detected
                if (tapTimer) {
                    clearTimeout(tapTimer);
                    tapTimer = null;
                }
                handleTap(e.clientX, e.clientY, true);
                tapCount = 0;
            }
        };

        // 📱 TOUCH EVENTS (Mobile/PWA)
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        const MAX_TAP_MOVE = 10; // Max pixels to still count as tap (not swipe)
        const MAX_TAP_DURATION = 300; // Max ms for a tap

        const handleTouchStart = (e: TouchEvent) => {
            console.log('👆 V70: touchstart fired');
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            console.log('👆 V70: touchend fired');
            // Prevent default to avoid synthetic click events
            e.preventDefault();

            const touch = e.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const duration = Date.now() - touchStartTime;

            // Check if it's a tap (not a swipe/drag)
            const moveX = Math.abs(touchEndX - touchStartX);
            const moveY = Math.abs(touchEndY - touchStartY);
            const isTap = moveX < MAX_TAP_MOVE && moveY < MAX_TAP_MOVE && duration < MAX_TAP_DURATION;

            console.log(`👆 V70: Touch end - moveX:${moveX}, moveY:${moveY}, duration:${duration}, isTap:${isTap}`);

            if (!isTap) {
                console.log('🚫 V70: Touch moved too much - not a tap');
                return;
            }

            tapCount++;

            if (tapCount === 1) {
                // Wait to see if it's a double-tap
                tapTimer = setTimeout(() => {
                    handleTap(touchEndX, touchEndY, false);
                    tapCount = 0;
                }, TAP_DELAY);
            } else if (tapCount === 2) {
                // Double-tap detected
                if (tapTimer) {
                    clearTimeout(tapTimer);
                    tapTimer = null;
                }
                handleTap(touchEndX, touchEndY, true);
                tapCount = 0;
            }
        };

        // 🎯 Attach event listeners
        console.log(`🎮 V70: Attaching unified click/tap handlers to:`, surface.tagName, surface.className);
        console.log(`🎮 V70: isMobile=${isMobile}, has ontouchstart=${'ontouchstart' in window}`);

        // Mouse events for desktop
        surface.addEventListener('click', handleMouseClick as EventListener);
        console.log('🖱️ V70: Mouse click listener attached');

        // Touch events for mobile/PWA - ALWAYS attach, even on desktop for safety
        surface.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
        surface.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });
        console.log('👆 V70: Touch listeners attached (passive touchstart, active touchend)');

        // Cleanup
        return () => {
            console.log('🧹 V70: Cleaning up event listeners');
            surface.removeEventListener('click', handleMouseClick as EventListener);
            surface.removeEventListener('touchstart', handleTouchStart as EventListener);
            surface.removeEventListener('touchend', handleTouchEnd as EventListener);
            if (tapTimer) clearTimeout(tapTimer);
        };
    }, [isRendered, playerMode, scoreIsLoaded, isMobile]);

    // ==================== ORIENTATION HANDLING ====================
    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;

        const handleOrientationChange = async () => {
            const isLandscape = isMobile && window.innerWidth > window.innerHeight;
            const alphaTab = await import('@coderline/alphatab');

            if (isLandscape) {
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                (api.settings.player as any).scrollElement = containerRef.current;
                (api.settings.player as any).scrollOffsetX = containerRef.current!.clientWidth * 0.15;
                (api.settings.player as any).scrollOffsetY = 0;
            } else {
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                // 🆕 V67: Use custom scroll container if available
                const scrollElement = scrollContainerRef?.current || document.body;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffsetY = -200;
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
            console.log('✅ V70: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded, scrollContainerRef, isMobile]);

    // ==================== LOOP CONTROL - MENU TRAY INTEGRATION ====================
    useEffect(() => {
        if (!apiRef.current) return;

        const api = apiRef.current;

        if (api.isLooping !== undefined) {
            api.isLooping = isLooping ?? false;
        }

        // 🎯 V69: Enable user interaction ONLY when loop is active
        if (api.settings?.player) {
            (api.settings.player as any).enableUserInteraction = isLooping ?? false;
            api.updateSettings();
        }

        if (!isLooping && api.playbackRange !== undefined) {
            api.playbackRange = null;
            console.log('🔄 V70: Loop disabled - cleared playback range');
        }

        console.log(`🔄 V70: Loop state synced - isLooping=${isLooping ?? false}, userInteraction=${isLooping ?? false}`);
    }, [isLooping]);

    // ==================== RENDER ====================
    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium">Loading tab notation...</p>
                    </div>
                </div>
            )}
            <div
                ref={containerRef}
                style={{ minHeight }}
                className="overflow-hidden"
            />
            {/* 🆕 V70: Removed rounded-xl class above for sharp corners like Songsterr */}
        </div>
    );
};