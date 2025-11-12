'use client';

/**
 * AlphaTab Renderer - STAGE 1 FINAL (with Double-Click/Tap)
 * 
 * @version Nov 11, 2025
 * @updated Added double-click/tap to seek and play
 * @status iOS 18.1 PWA bug acknowledged - cannot be fixed with JavaScript
 * 
 * KNOWN ISSUE:
 * iOS 18.1 has a WebKit bug affecting PWAs on subsequent app launches:
 * - Ghost cursors appear
 * - Track switching fails
 * - Playback issues
 * - Landscape mode may not show single unified row
 * Workaround: Delete and reinstall PWA (temporary)
 * Fix: Wait for Apple iOS patch (likely 18.2)
 * 
 * WORKING FEATURES:
 * ✅ Single unified row in landscape (works on fresh install)
 * ✅ Auto-scroll in both orientations
 * ✅ Orientation switching
 * ✅ Track selection
 * ✅ Click-to-seek (single tap/click)
 * ✅ Double-click/tap to seek and play
 * ✅ No desktop loop highlight
 * ✅ Works perfectly on fresh install (iOS bug only affects reopens)
 * ✅ Works perfectly on desktop (no iOS issues)
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

    // Detect mobile device
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                (window.innerWidth <= 1024 && 'ontouchstart' in window);
            setIsMobile(mobile);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ==================== INITIALIZE ALPHATAB (ONCE) ====================
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 STAGE1-FINAL: Initializing AlphaTab');

                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile,
                    enableUserInteraction: true,   // ✅ Enables click-to-seek
                    enableLoopSelection: false,    // ✅ Prevents desktop loop highlight
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ STAGE1-FINAL: AlphaTab initialized');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ STAGE1-FINAL: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                // Load score
                if (fileUrl) {
                    console.log('📄 STAGE1-FINAL: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ STAGE1-FINAL: Score loaded');

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
                console.error('❌ STAGE1-FINAL: Initialization failed:', error);
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
            console.log('🔄 STAGE1-FINAL: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            // Reset scroll settings
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1-FINAL: Switching to LANDSCAPE');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.display.scale = 1.0;
                api.settings.display.stretchForce = 0.8;

                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';

                await new Promise(resolve => setTimeout(resolve, 100));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;

                console.log('✅ STAGE1-FINAL: Horizontal setup complete');

            } else {
                console.log('📱 STAGE1-FINAL: Switching to PORTRAIT');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.display.scale = 1.0;
                api.settings.display.stretchForce = 0.8;

                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';

                await new Promise(resolve => setTimeout(resolve, 100));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.body;
                (api.settings.player as any).scrollOffsetY = -200;

                console.log('✅ STAGE1-FINAL: Page setup complete');
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
            console.log('✅ STAGE1-FINAL: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== DOUBLE-CLICK/TAP TO SEEK AND PLAY ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        // Desktop: Double-click handler
        const handleDoubleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                console.log('🎵 Double-click at tick:', beat.absolutePlaybackStart);

                // Set cursor position
                if (api.tickPosition !== undefined) {
                    api.tickPosition = beat.absolutePlaybackStart;
                }

                // Start playback after brief delay
                setTimeout(() => {
                    try {
                        if (api.play) {
                            api.play();
                        } else if ((api as any).playPause) {
                            (api as any).playPause();
                        }
                        console.log('✅ Playback started from double-click');
                    } catch (err) {
                        console.error('❌ Failed to start playback:', err);
                    }
                }, 50);
            }
        };

        // Mobile: Double-tap handler
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;
        const DOUBLE_TAP_DELAY = 400;

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.changedTouches.length === 0) return;

            const touch = e.changedTouches[0];
            const now = Date.now();
            const timeSinceLastTap = now - lastTapTime;

            const isDoubleTap =
                timeSinceLastTap < DOUBLE_TAP_DELAY &&
                timeSinceLastTap > 50 &&
                Math.abs(touch.clientX - lastTapX) < 50 &&
                Math.abs(touch.clientY - lastTapY) < 50;

            if (isDoubleTap) {
                e.preventDefault();
                console.log('👆 Double-tap detected');

                const beat = getBeatAtPosition(api, container, lastTapX, lastTapY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 Double-tap at tick:', beat.absolutePlaybackStart);

                    // Set cursor position
                    if (api.tickPosition !== undefined) {
                        api.tickPosition = beat.absolutePlaybackStart;
                    }

                    // Start playback
                    setTimeout(() => {
                        try {
                            if (api.play) {
                                api.play();
                            } else if ((api as any).playPause) {
                                (api as any).playPause();
                            }
                            console.log('✅ Playback started from double-tap');
                        } catch (err) {
                            console.error('❌ Failed to start playback:', err);
                        }
                    }, 50);
                }

                // Reset tap tracking
                lastTapTime = 0;
            } else {
                // Record this tap for potential double-tap
                lastTapTime = now;
                lastTapX = touch.clientX;
                lastTapY = touch.clientY;
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        // Add event listeners
        if (isMobile) {
            target.addEventListener('touchend', handleTouchEnd as EventListener);
        } else {
            target.addEventListener('dblclick', handleDoubleClick as EventListener);
        }

        return () => {
            if (isMobile) {
                target.removeEventListener('touchend', handleTouchEnd as EventListener);
            } else {
                target.removeEventListener('dblclick', handleDoubleClick as EventListener);
            }
        };
    }, [isRendered, playerMode, scoreIsLoaded, isMobile]);

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
                className={`${className} ${isMobile ? 'alphatab-mobile' : 'alphatab-desktop'}`}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    maskImage: 'linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 40px), transparent 100%)',
                }}
            />

            {/* 💥 CRITICAL FIX: Force single horizontal row ONLY in mobile landscape */}
            <style jsx global>{`
                /* Only apply to mobile devices in landscape orientation */
                @media (orientation: landscape) and (max-width: 1024px) {
                    .alphatab-mobile .at-surface > svg {
                        /* Force width to be determined by content (one long row) */
                        width: max-content !important; 
                        min-width: 100%;
                        display: block !important;
                        /* CRITICAL: Prevents measures from breaking onto next row */
                        white-space: nowrap !important; 
                    }
                    
                    /* Ensure the at-surface container doesn't constrain width */
                    .alphatab-mobile .at-surface {
                        width: max-content !important;
                        min-width: 100%;
                    }
                }
                
                /* Desktop stays in normal page mode (multiple rows) */
                .alphatab-desktop .at-surface > svg {
                    /* Let desktop use normal page layout */
                    width: 100%;
                }
            `}</style>
        </div>
    );
};