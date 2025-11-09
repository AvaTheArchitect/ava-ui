'use client';

/**
 * AlphaTab Renderer - STAGE 1 FIXED
 * 
 * FIXES APPLIED:
 * ✅ Fixed single/double-click using refs (not local variables)
 * ✅ Added CSS for true Horizontal single-row layout
 * ✅ Fixed orientation handler to prevent multiple rows in landscape
 * 
 * FOCUS:
 * ✅ Double-click to play
 * ✅ Single-click to seek
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

    // 🔧 FIX: Use refs for click tracking to persist between renders
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
    const clickCountRef = useRef<number>(0);
    const lastClickTimeRef = useRef<number>(0);

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
                    // We handle clicks ourselves
                    enableUserInteraction: false,
                });

                if (!isMounted) return;

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

                if (fileUrl) {
                    console.log('📄 STAGE1-FIXED: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    // Wait for score to be ready
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

            // 🚨 CRITICAL: Reset ALL scroll settings first
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1-FIXED: Switching to LANDSCAPE (Horizontal)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

                // 🔧 FIX: Enhanced CSS for true single-row horizontal layout
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';
                container.style.width = '100%';
                container.style.display = 'flex'; // Force flex layout
                container.style.flexWrap = 'nowrap'; // Prevent wrapping

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 150));

                // Now set scroll settings
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;

                console.log('✅ STAGE1-FIXED: Horizontal - single row mode active');

            } else {
                console.log('📱 STAGE1-FIXED: Switching to PORTRAIT (Page)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                // Reset container CSS
                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';
                container.style.display = 'block'; // Reset to block
                container.style.flexWrap = 'wrap'; // Reset wrap

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 150));

                // Use document.documentElement for page scroll
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.documentElement;
                (api.settings.player as any).scrollOffsetY = -200;

                console.log('✅ STAGE1-FIXED: Page - multi-row mode active');
            }

            // Apply settings and wait before render
            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now render
            api.render();
            console.log('✅ STAGE1-FIXED: Re-render complete');
        };

        // Initial setup
        handleOrientationChange();

        // Listen for orientation changes
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== CLICK INTERACTIONS (FIXED) ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        // 🔧 FIX: Improved double-click detection using refs
        const handleClick = (e: MouseEvent) => {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;

            // Reset if too much time has passed (>400ms)
            if (timeSinceLastClick > 400) {
                clickCountRef.current = 0;
            }

            clickCountRef.current++;
            lastClickTimeRef.current = now;

            if (clickCountRef.current === 1) {
                // First click - wait to see if double-click follows
                if (clickTimerRef.current) {
                    clearTimeout(clickTimerRef.current);
                }

                clickTimerRef.current = setTimeout(() => {
                    // Single click confirmed - seek only (don't play)
                    const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        if (api.tickPosition !== undefined) {
                            api.tickPosition = beat.absolutePlaybackStart;
                            console.log('🎯 STAGE1-FIXED: Single-click seek to tick:', beat.absolutePlaybackStart);
                        }
                    }

                    clickCountRef.current = 0;
                }, 250); // 250ms window for double-click

            } else if (clickCountRef.current === 2) {
                // Double-click detected - seek AND play
                if (clickTimerRef.current) {
                    clearTimeout(clickTimerRef.current);
                    clickTimerRef.current = null;
                }

                e.preventDefault();
                e.stopPropagation();

                const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 STAGE1-FIXED: Double-click at tick:', beat.absolutePlaybackStart);

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
                            console.log('✅ STAGE1-FIXED: Playback started from double-click');
                        } catch (err) {
                            console.error('❌ STAGE1-FIXED: Failed to start playback:', err);
                        }
                    }, 50);
                }

                clickCountRef.current = 0;
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('click', handleClick as EventListener);

        return () => {
            target.removeEventListener('click', handleClick as EventListener);
            if (clickTimerRef.current) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
            }
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

            {/* 🎨 Enhanced CSS for proper layout modes */}
            <style jsx>{`
                .alphatab-container-stage1 {
                    overflow-x: auto !important;
                }
                
                /* 🔧 FIX: Force single row in horizontal mode */
                .alphatab-container-stage1 :global(.at-surface) {
                    /* Gradient mask for bottom row bleed */
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

                /* 🔧 FIX: Ensure horizontal layout stays in single row */
                .alphatab-container-stage1 :global(.at-surface > *) {
                    display: inline-block !important;
                    vertical-align: top !important;
                }
                
                /* 🔧 FIX: Prevent wrapping of staff elements in horizontal mode */
                .alphatab-container-stage1 :global(.at-viewport) {
                    white-space: nowrap !important;
                }
            `}</style>
        </div>
    );
};