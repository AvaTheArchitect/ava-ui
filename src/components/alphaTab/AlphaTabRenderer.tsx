'use client';

/**
 * AlphaTab Renderer - STAGE 1 (Core Features Only)
 * 
 * REMOVED (for Stage 2):
 * - Loop logic (constants, handles, selection, drag)
 * - isLooping prop
 * 
 * FOCUS:
 * ✅ Double-click to play
 * ✅ Auto-scroll (landscape + portrait)
 * ✅ Orientation handling
 * ✅ Cursor rendering
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
                console.log('🎸 STAGE1: Initializing AlphaTab');

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    // 🎯 STAGE 1: Disable native user interaction (prevents drag-to-loop)
                    // We handle double-click ourselves, so we don't need AlphaTab's native interaction
                    enableUserInteraction: false,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ STAGE1: AlphaTab initialized');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ STAGE1: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                // 🔧 FIX 1: Use loadGuitarProFile correctly with api as first param
                if (fileUrl) {
                    console.log('📄 STAGE1: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    // Wait for score to be ready
                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ STAGE1: Score loaded');

                            // 🔧 FIX 2: Include tempo in SongInfo
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
                console.error('❌ STAGE1: Initialization failed:', error);
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
    }, [fileUrl, isMobile, onApiReady, onError, onRenderFinished, onScoreLoaded, playerMode, soundFontPath]); // 🔧 FIX 3: Added all dependencies

    // ==================== ORIENTATION CHANGE HANDLER ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            console.log('🔄 STAGE1: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            // 🚨 CRITICAL: Reset ALL scroll settings first to avoid conflicts
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1: Switching to LANDSCAPE (Horizontal)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

                // 🎯 CRITICAL FIX: Ensure container is scrollable
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 100));

                // Now set scroll settings
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container; // Container must be scrollable!
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15; // Fixed cursor at 15%

                console.log('✅ STAGE1: Horizontal - scrollElement=container, offsetX=15%');

            } else {
                console.log('📱 STAGE1: Switching to PORTRAIT (Page)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                // Reset container scroll
                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 100));

                // Now set scroll settings
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.body; // Use body for vertical
                (api.settings.player as any).scrollOffsetY = -200; // 🎯 FIX: Was "scrollOffset", now "scrollOffsetY"

                console.log('✅ STAGE1: Page - scrollElement=body, offsetY=-200px');
            }

            // 🚨 CRITICAL: Use await to ensure settings apply before render
            await api.updateSettings();

            // Wait a bit more for settings to fully apply
            await new Promise(resolve => setTimeout(resolve, 50));

            // Now render
            api.render();
            console.log('✅ STAGE1: Re-render complete');
        };

        // Initial setup
        handleOrientationChange();

        // Listen for orientation changes
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== CLICK INTERACTIONS ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;
        let clickTimer: NodeJS.Timeout | null = null;
        let clickCount = 0;

        const handleClick = (e: MouseEvent) => {
            clickCount++;

            if (clickCount === 1) {
                // Wait to see if it's a double-click
                clickTimer = setTimeout(() => {
                    // Single click - seek only (don't play)
                    const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        if (api.tickPosition !== undefined) {
                            api.tickPosition = beat.absolutePlaybackStart;
                            console.log('🎯 STAGE1: Single-click seek to tick:', beat.absolutePlaybackStart);
                        }
                    }

                    clickCount = 0;
                }, 250); // 250ms delay to detect double-click
            } else if (clickCount === 2) {
                // Double-click - seek AND play
                if (clickTimer) {
                    clearTimeout(clickTimer);
                    clickTimer = null;
                }

                e.preventDefault();
                e.stopPropagation();

                const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 STAGE1: Double-click at tick:', beat.absolutePlaybackStart);

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
                            console.log('✅ STAGE1: Playback started from double-click');
                        } catch (err) {
                            console.error('❌ STAGE1: Failed to start playback:', err);
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

            {/* 🎨 Stage 1 CSS Fix for Bottom Row Bleed */}
            <style jsx>{`
                .alphatab-container-stage1 {
                    /* Ensure container scrolls properly in landscape */
                    overflow-x: auto !important;
                }
                
                /* 🔧 FIX: Minimal fade at very bottom to reduce 3rd row bleed */
                /* Keeps notation visible while hiding partial rows */
                .alphatab-container-stage1 :global(.at-surface) {
                    /* Gradient mask: fully visible until very close to bottom */
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