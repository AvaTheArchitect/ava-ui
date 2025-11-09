'use client';

/**
 * AlphaTab Renderer - STAGE 1 FIXED (No Loop, Native Interaction Disabled)
 * 
 * FIXES:
 * ✅ Disabled AlphaTab's native user interaction (fixes double cursors + loop highlight)
 * ✅ Implemented touch-based double-tap for mobile (replaces unreliable dblclick)
 * ✅ Single playback system (no conflicting cursors)
 * 
 * FOCUS:
 * ✅ Double-tap/click to play
 * ✅ Auto-scroll (landscape + portrait)
 * ✅ Orientation handling
 * ✅ Track switching
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
                console.log('🎸 STAGE1-FIXED: Initializing AlphaTab');

                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                });

                if (!isMounted) return;

                // 🚨 CRITICAL FIX #1: Disable AlphaTab's native user interaction
                // This prevents: double cursors, loop selection highlights, native click handlers
                if (api.settings?.player) {
                    api.settings.player.enableUserInteraction = false;
                    await api.updateSettings();
                    console.log('✅ STAGE1-FIXED: Native user interaction DISABLED');
                }

                apiRef.current = api;
                console.log('✅ STAGE1-FIXED: AlphaTab initialized');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ STAGE1-FIXED: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                // Load score
                if (fileUrl) {
                    console.log('📄 STAGE1-FIXED: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);
                    
                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ STAGE1-FIXED: Score loaded');
                            
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
                console.error('❌ STAGE1-FIXED: Initialization failed:', error);
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
            console.log('🔄 STAGE1-FIXED: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            // Reset scroll settings
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1-FIXED: Switching to LANDSCAPE');
                
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
                
            } else {
                console.log('📱 STAGE1-FIXED: Switching to PORTRAIT');
                
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
            console.log('✅ STAGE1-FIXED: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== 🚨 FIX #2: TOUCH-BASED DOUBLE-TAP FOR MOBILE ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;
        if (!isMobile) return; // Only use touch handling on mobile

        const api = apiRef.current;
        const container = containerRef.current;

        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;
        const DOUBLE_TAP_DELAY = 300; // ms
        const DOUBLE_TAP_DISTANCE = 50; // px

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.changedTouches.length === 0) return;
            
            const touch = e.changedTouches[0];
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTapTime;
            
            // Check if this is a double-tap
            const isDoubleTap = timeDiff < DOUBLE_TAP_DELAY &&
                Math.abs(touch.clientX - lastTapX) < DOUBLE_TAP_DISTANCE &&
                Math.abs(touch.clientY - lastTapY) < DOUBLE_TAP_DISTANCE;

            if (isDoubleTap) {
                e.preventDefault();
                console.log('👆 STAGE1-FIXED: Double-tap detected');

                const beat = getBeatAtPosition(api, container, lastTapX, lastTapY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 STAGE1-FIXED: Seeking to tick:', beat.absolutePlaybackStart);

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
                            console.log('✅ STAGE1-FIXED: Playback started from double-tap');
                        } catch (err) {
                            console.error('❌ STAGE1-FIXED: Failed to start playback:', err);
                        }
                    }, 50);
                }

                // Reset tap tracking
                lastTapTime = 0;
            } else {
                // Record this tap for potential double-tap
                lastTapTime = currentTime;
                lastTapX = touch.clientX;
                lastTapY = touch.clientY;
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('touchend', handleTouchEnd as EventListener);

        return () => {
            target.removeEventListener('touchend', handleTouchEnd as EventListener);
        };
    }, [isRendered, playerMode, scoreIsLoaded, isMobile]);

    // ==================== DESKTOP: DOUBLE-CLICK HANDLER ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;
        if (isMobile) return; // Only use double-click on desktop

        const api = apiRef.current;
        const container = containerRef.current;

        const handleDoubleClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                console.log('🎵 STAGE1-FIXED: Double-click at tick:', beat.absolutePlaybackStart);

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
                        console.log('✅ STAGE1-FIXED: Playback started from double-click');
                    } catch (err) {
                        console.error('❌ STAGE1-FIXED: Failed to start playback:', err);
                    }
                }, 50);
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('dblclick', handleDoubleClick as EventListener);

        return () => {
            target.removeEventListener('dblclick', handleDoubleClick as EventListener);
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
                className={className}
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
        </div>
    );
};