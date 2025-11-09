'use client';

/**
 * AlphaTab Renderer - COMPLETE PWA FIX
 * 
 * FIXES:
 * ✅ Reliable mobile detection (checks multiple signals)
 * ✅ Force enableCursor: false consistently 
 * ✅ Touch event handlers (not just click)
 * ✅ More aggressive landscape CSS
 * ✅ Consistent state management
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

// 🔧 FIX: More reliable mobile detection
const detectMobile = (): boolean => {
    // Check multiple signals
    const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = window.innerWidth <= 1024;
    
    // Mobile if ANY of these are true
    const isMobile = userAgent || (touchScreen && smallScreen);
    
    console.log('📱 PWA-FIX: Mobile detection:', {
        userAgent,
        touchScreen,
        smallScreen,
        maxTouchPoints: navigator.maxTouchPoints,
        innerWidth: window.innerWidth,
        RESULT: isMobile
    });
    
    return isMobile;
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
    const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Touch/Click detection refs
    const lastTouchTimeRef = useRef<number>(0);
    const touchCountRef = useRef<number>(0);
    const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Detect mobile device (RELIABLE)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            const mobile = detectMobile();
            setIsMobile(mobile);
        };
        
        // Check immediately
        checkMobile();
        
        // Re-check on resize
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
                console.log('🎸 PWA-FIX: Initializing AlphaTab');

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';
                setCurrentOrientation(isLandscape ? 'landscape' : 'portrait');

                console.log(`📱 PWA-FIX: Initial mode = ${layoutMode}, isMobile = ${isMobile}`);

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: false, // 🔧 FIX: Explicitly disable cursor
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    enableUserInteraction: false, // Disable AlphaTab's handlers
                    isMobile,
                });

                if (!isMounted) return;

                // 🔧 FIX: Force disable cursor AGAIN after init
                if (api.settings?.player) {
                    api.settings.player.enableCursor = false;
                    (api.settings.player as any).enableLoopSelection = false;
                    console.log('✅ PWA-FIX: Force-disabled cursor and loop selection');
                }

                apiRef.current = api;
                console.log('✅ PWA-FIX: AlphaTab initialized');

                // Dump settings to console for debugging
                console.log('🔍 PWA-FIX: Settings dump:', {
                    enableCursor: api.settings?.player?.enableCursor,
                    enableUserInteraction: api.settings?.player?.enableUserInteraction,
                    enableLoopSelection: (api.settings?.player as any)?.enableLoopSelection,
                    layoutMode: api.settings?.display?.layoutMode,
                    isMobile
                });

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ PWA-FIX: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                if (fileUrl) {
                    console.log('📄 PWA-FIX: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ PWA-FIX: Score loaded');

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
                console.error('❌ PWA-FIX: Initialization failed:', error);
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
        if (!isMobile) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            const newOrientation = isLandscape ? 'landscape' : 'portrait';

            if (newOrientation === currentOrientation) {
                return;
            }

            console.log(`🔄 PWA-FIX: Orientation changing from ${currentOrientation} → ${newOrientation}`);
            setCurrentOrientation(newOrientation);

            const alphaTab = (window as any).alphaTab;
            if (!alphaTab) return;

            // Reset scroll settings
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 PWA-FIX: Switching to LANDSCAPE (Horizontal)');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

                // 🔧 FIX: ULTRA-AGGRESSIVE CSS for single-row
                container.style.overflowX = 'scroll';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';
                container.style.width = '100%';
                container.style.maxWidth = '100vw';
                container.style.height = '100%';
                container.style.display = 'block'; // Change to block with nowrap
                
                // Force the at-surface to be inline
                const surface = container.querySelector('.at-surface') as HTMLElement;
                if (surface) {
                    surface.style.whiteSpace = 'nowrap';
                    surface.style.display = 'inline-block';
                }

                await new Promise(resolve => setTimeout(resolve, 250));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;

                console.log('✅ PWA-FIX: Horizontal mode configured');

            } else {
                console.log('📱 PWA-FIX: Switching to PORTRAIT (Page)');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';
                container.style.height = 'auto';
                container.style.maxWidth = '100%';
                container.style.display = 'block';
                
                const surface = container.querySelector('.at-surface') as HTMLElement;
                if (surface) {
                    surface.style.whiteSpace = 'normal';
                    surface.style.display = 'block';
                }

                await new Promise(resolve => setTimeout(resolve, 250));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.documentElement;
                (api.settings.player as any).scrollOffsetY = -200;

                console.log('✅ PWA-FIX: Page mode configured');
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 200));

            api.render();
            console.log('✅ PWA-FIX: Re-render complete');
        };

        handleOrientationChange();

        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded, currentOrientation, isMobile]);

    // ==================== TOUCH EVENT HANDLING ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;
        if (!isMobile) return; // Only on mobile

        const api = apiRef.current;
        const container = containerRef.current;

        console.log('👆 PWA-FIX: Setting up TOUCH handlers');

        const handleTouch = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            const now = Date.now();
            const timeSinceLastTouch = now - lastTouchTimeRef.current;

            // Reset if too much time passed
            if (timeSinceLastTouch > 400) {
                touchCountRef.current = 0;
            }

            touchCountRef.current++;
            lastTouchTimeRef.current = now;

            if (touchCountRef.current === 1) {
                // First touch - wait for potential double-tap
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                }

                touchTimerRef.current = setTimeout(() => {
                    // Single tap confirmed - SEEK ONLY
                    const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);

                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        if (api.tickPosition !== undefined) {
                            api.tickPosition = beat.absolutePlaybackStart;
                            console.log('🎯 PWA-FIX: Single-tap seek to tick:', beat.absolutePlaybackStart);
                        }
                    }

                    touchCountRef.current = 0;
                }, 250);

            } else if (touchCountRef.current === 2) {
                // Double-tap detected - SEEK AND PLAY
                if (touchTimerRef.current) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }

                e.preventDefault();
                e.stopPropagation();

                const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 PWA-FIX: Double-tap at tick:', beat.absolutePlaybackStart);

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
                            console.log('✅ PWA-FIX: Playback started from double-tap');
                        } catch (err) {
                            console.error('❌ PWA-FIX: Failed to start playback:', err);
                        }
                    }, 50);
                }

                touchCountRef.current = 0;
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('touchstart', handleTouch as EventListener, { passive: false });

        return () => {
            target.removeEventListener('touchstart', handleTouch as EventListener);
            if (touchTimerRef.current) {
                clearTimeout(touchTimerRef.current);
                touchTimerRef.current = null;
            }
        };
    }, [isRendered, playerMode, scoreIsLoaded, isMobile]);

    // ==================== MOUSE EVENT HANDLING (Desktop) ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;
        if (isMobile) return; // Only on desktop

        const api = apiRef.current;
        const container = containerRef.current;

        console.log('🖱️ PWA-FIX: Setting up MOUSE handlers');

        let clickTimer: NodeJS.Timeout | null = null;
        let clickCount = 0;
        let lastClickTime = 0;

        const handleClick = (e: MouseEvent) => {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTime;

            if (timeSinceLastClick > 400) {
                clickCount = 0;
            }

            clickCount++;
            lastClickTime = now;

            if (clickCount === 1) {
                if (clickTimer) clearTimeout(clickTimer);

                clickTimer = setTimeout(() => {
                    // Single click - SEEK ONLY
                    const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        if (api.tickPosition !== undefined) {
                            api.tickPosition = beat.absolutePlaybackStart;
                            console.log('🎯 PWA-FIX: Single-click seek to tick:', beat.absolutePlaybackStart);
                        }
                    }

                    clickCount = 0;
                }, 250);

            } else if (clickCount === 2) {
                if (clickTimer) {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                }

                e.preventDefault();
                e.stopPropagation();

                const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 PWA-FIX: Double-click at tick:', beat.absolutePlaybackStart);

                    if (api.tickPosition !== undefined) {
                        api.tickPosition = beat.absolutePlaybackStart;
                    }

                    setTimeout(() => {
                        try {
                            if (api.play) {
                                api.play();
                            } else if ((api as any).playPause) {
                                (api as any).playPause();
                            }
                            console.log('✅ PWA-FIX: Playback started from double-click');
                        } catch (err) {
                            console.error('❌ PWA-FIX: Failed to start playback:', err);
                        }
                    }, 50);
                }

                clickCount = 0;
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('click', handleClick as EventListener);

        return () => {
            target.removeEventListener('click', handleClick as EventListener);
            if (clickTimer) clearTimeout(clickTimer);
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
                className={`${className} alphatab-container-pwa-fix`}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                }}
            />

            {/* 🎨 AGGRESSIVE CSS for landscape single-row */}
            <style jsx global>{`
                .alphatab-container-pwa-fix {
                    overflow-x: auto !important;
                }
                
                /* 🔧 FIX: Ultra-aggressive single-row enforcement */
                .alphatab-container-pwa-fix .at-surface,
                .alphatab-container-pwa-fix .at-surface > svg {
                    white-space: nowrap !important;
                    display: inline-block !important;
                }
                
                .alphatab-container-pwa-fix .at-viewport {
                    white-space: nowrap !important;
                }
                
                .alphatab-container-pwa-fix .at-staff-group {
                    display: inline-block !important;
                    white-space: nowrap !important;
                }
                
                /* Bottom row fade */
                .alphatab-container-pwa-fix .at-surface {
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
                }
            `}</style>
        </div>
    );
};