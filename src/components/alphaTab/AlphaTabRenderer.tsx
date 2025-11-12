'use client';

/**
 * AlphaTab Renderer - STAGE 1 (Core Features Only)
 * V65 - Fixed Mobile Detection & Touch Event Logging
 * 
 * REMOVED (for Stage 2):
 * - Loop logic (constants, handles, selection, drag)
 * - isLooping prop
 * 
 * FOCUS:
 * ✅ Double-click/tap to play
 * ✅ Single-click/tap to seek
 * ✅ Auto-scroll (landscape + portrait)
 * ✅ Orientation handling
 * ✅ Cursor rendering
 * ✅ Track switching
 * ✅ Mobile PWA touch support
 * 
 * V65 FIXES:
 * - Synchronous mobile detection (before initAlphaTab)
 * - Defensive element selection (.at-surface fallback chain)
 * - Extensive touch event logging for debugging
 * - Always attach touch listeners (not just on mobile)
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
        console.log(`📱 V65: Mobile detection - UA:${isMobileUA}, Touch:${isTouchDevice}, Small:${isSmallScreen} → ${mobile ? 'MOBILE' : 'DESKTOP'}`);
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
                console.log('🎸 V65: Initializing AlphaTab');

                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                console.log(`📐 V65: Layout decision - isMobile:${isMobile}, isLandscape:${isLandscape} → ${layoutMode}`);

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    enableUserInteraction: false,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ V65: AlphaTab initialized');

                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ V65: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                if (fileUrl) {
                    console.log('📄 V65: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ V65: Score loaded');

                            const info: SongInfo = {
                                title: api.score.title || 'Unknown',
                                artist: api.score.artist || 'Unknown',
                                album: api.score.album || '',
                                tempo: api.score.tempo || 120,
                            };
                            const tracks: Track[] = api.score.tracks.map((t: any) => ({
                                index: t.index,
                                name: t.name,
                            }));
                            onScoreLoaded?.(info, tracks);
                        }
                    }, 100);
                }

                onApiReady?.(api);

            } catch (error) {
                console.error('❌ V65: Initialization failed:', error);
                if (isMounted) {
                    onError?.(`Failed to initialize: ${error}`);
                    setIsLoading(false);
                }
            }
        };

        initialize();

        return () => {
            isMounted = false;
        };
    }, [fileUrl, isMobile, onApiReady, onError, onRenderFinished, onScoreLoaded, playerMode, soundFontPath]);

    // ==================== ORIENTATION CHANGE HANDLER ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            console.log('🔄 V65: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 V65: Switching to LANDSCAPE');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';

                await new Promise(resolve => setTimeout(resolve, 100));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
            } else {
                console.log('📱 V65: Switching to PORTRAIT');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';

                await new Promise(resolve => setTimeout(resolve, 100));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.body;
                (api.settings.player as any).scrollOffsetY = -200;
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
            console.log('✅ V65: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== UNIFIED CLICK/TAP INTERACTION ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        // 🎯 V65: More defensive element selection
        let surface = container.querySelector('.at-surface') as HTMLElement;
        if (!surface) {
            surface = container.querySelector('.at-viewport') as HTMLElement;
        }
        if (!surface) {
            surface = container;
        }

        console.log(`🎯 V65: Attaching to element:`, surface.className || 'container', `isMobile:${isMobile}`);

        // Shared state for both mouse and touch
        let tapCount = 0;
        let tapTimer: NodeJS.Timeout | null = null;
        const TAP_DELAY = 250; // ms to wait for double tap

        // 🎯 V65: UNIFIED TAP HANDLER - works for both mouse and touch
        const handleTap = (x: number, y: number, isDoubleTap: boolean) => {
            const beat = getBeatAtPosition(api, container, x, y);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                // Always seek to the beat position
                if (api.tickPosition !== undefined) {
                    api.tickPosition = beat.absolutePlaybackStart;
                    console.log(
                        isDoubleTap
                            ? `🎵 V65: Double-tap/click at tick ${beat.absolutePlaybackStart}`
                            : `🎯 V65: Single-tap/click seek to tick ${beat.absolutePlaybackStart}`
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
                            console.log('✅ V65: Playback started from double-tap/click');
                        } catch (err) {
                            console.error('❌ V65: Failed to start playback:', err);
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
            console.log('👆 V65: touchstart fired');
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            console.log('👆 V65: touchend fired');
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

            console.log(`👆 V65: Touch end - moveX:${moveX}, moveY:${moveY}, duration:${duration}, isTap:${isTap}`);

            if (!isTap) {
                console.log('🚫 V65: Touch moved too much - not a tap');
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
        console.log(`🎮 V65: Attaching unified click/tap handlers to:`, surface.tagName, surface.className);
        console.log(`🎮 V65: isMobile=${isMobile}, has ontouchstart=${'ontouchstart' in window}`);

        // Mouse events for desktop
        surface.addEventListener('click', handleMouseClick as EventListener);
        console.log('🖱️ V65: Mouse click listener attached');

        // Touch events for mobile/PWA - ALWAYS attach, even on desktop for safety
        surface.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
        surface.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });
        console.log('👆 V65: Touch listeners attached (passive touchstart, active touchend)');

        // Cleanup
        return () => {
            console.log('🧹 V65: Cleaning up event listeners');
            surface.removeEventListener('click', handleMouseClick as EventListener);
            surface.removeEventListener('touchstart', handleTouchStart as EventListener);
            surface.removeEventListener('touchend', handleTouchEnd as EventListener);
            if (tapTimer) clearTimeout(tapTimer);
        };
    }, [isRendered, playerMode, scoreIsLoaded]);

    return (
        <div className="relative">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-2"></div>
                        <p className="text-orange-400 font-semibold">
                            {playerMode === 'synthesizer'
                                ? 'Loading tab & initializing synthesizer...'
                                : 'Loading tab...'}
                        </p>
                    </div>
                </div>
            )}

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

            {/* Stage 1 CSS Fix */}
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