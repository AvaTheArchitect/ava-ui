'use client';

/**
 * AlphaTab Renderer - STAGE 1.2 (Auto-Scroll Fix)  November 13th, 2025
 * V67 - Fixed scroll container for CSS Grid layout
 * V66 - Added Menu Tray Props (isLooping, onLoopRangeChange)
 * V65 - Fixed Mobile Detection & Touch Event Logging
 * 
 * NEW IN V67 (STAGE 1.2):
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
    onLoopRangeChange,
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
        console.log(`📱 V67: Mobile detection - UA:${isMobileUA}, Touch:${isTouchDevice}, Small:${isSmallScreen} → ${mobile ? 'MOBILE' : 'DESKTOP'}`);
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
                console.log('🎸 V67: Initializing AlphaTab with custom scroll container');

                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                // 🆕 V67: Get custom scroll container (the <main> element from Grid layout)
                const customScrollContainer = scrollContainerRef?.current;

                if (customScrollContainer) {
                    console.log('✅ V67: Using custom scroll container (Grid <main> element)');
                } else {
                    console.log('⚠️ V67: No custom scroll container provided, using default');
                }

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile,
                    enableUserInteraction: true,
                    // 🆕 V67: Pass custom scroll container
                    scrollContainer: customScrollContainer || undefined,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ V67: AlphaTab API ready');

                // Load score
                await loadGuitarProFile(api, fileUrl);
                if (!isMounted) return;

                // Setup event handlers
                if (api.scoreLoaded) {
                    api.scoreLoaded.on((score: any) => {
                        console.log('✅ V67: Score loaded');
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
                        console.log('✅ V67: Rendering complete');
                        setIsRendered(true);
                        setIsLoading(false);
                        onRenderFinished?.();
                    });
                }

                onApiReady?.(api);

                // Start rendering
                api.render();
            } catch (error) {
                console.error('❌ V67: Initialization error:', error);
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
    }, [fileUrl, playerMode, soundFontPath, isMobile, scrollContainerRef]);

    // ==================== CLICK/TAP TO SEEK ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleClick = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const result = getBeatAtPosition(api, container, clientX, clientY);
            if (result?.beat) {
                api.tickPosition = result.beat.absolutePlaybackStart;
                console.log(`🎯 V67: Seek to tick ${result.beat.absolutePlaybackStart}`);
            }
        };

        container.addEventListener('click', handleClick);
        container.addEventListener('touchend', handleClick as EventListener);

        return () => {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('touchend', handleClick as EventListener);
        };
    }, [isRendered]);

    // ==================== DOUBLE-CLICK/TAP TO PLAY ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleDoubleClick = () => {
            if (api.playerState === 1) {
                api.pause();
            } else {
                api.play();
            }
            console.log('▶️ V67: Double-click play/pause');
        };

        container.addEventListener('dblclick', handleDoubleClick);

        return () => {
            container.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered]);

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
            console.log('✅ V67: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded, scrollContainerRef]);

    // ==================== LOOP CONTROL - MENU TRAY INTEGRATION ====================
    useEffect(() => {
        if (!apiRef.current) return;
        
        const api = apiRef.current;
        
        if (api.isLooping !== undefined) {
            api.isLooping = isLooping ?? false;
        }
        
        if (api.settings?.player) {
            (api.settings.player as any).enableUserInteraction = true;
            api.updateSettings();
        }
        
        if (!isLooping && api.playbackRange !== undefined) {
            api.playbackRange = null;
            console.log('🔄 V67: Loop disabled - cleared playback range');
        }
        
        console.log(`🔄 V67: Loop state synced - isLooping=${isLooping ?? false}`);
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
                className="rounded-xl overflow-hidden"
            />
        </div>
    );
};