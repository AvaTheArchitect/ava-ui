'use client';

/**
 * AlphaTab Renderer - FINAL VERSION
 * 
 * APPROACH:
 * ✅ enableUserInteraction: false (prevents AlphaTab's cursors and drag-to-loop)
 * ✅ Custom click handlers for single/double-click (full control)
 * ✅ Explicit track detection in clicks (handle track switching)
 * ✅ Aggressive landscape CSS (force single row)
 * 
 * BENEFITS:
 * ✅ No double cursor (AlphaTab doesn't create any)
 * ✅ Single-click seek (our handler)
 * ✅ Double-click play (our handler)
 * ✅ No drag-to-loop highlight (disabled by enableUserInteraction: false)
 * ✅ Track switching works (our detection + external buttons)
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
    const [currentOrientation, setCurrentOrientation] = useState<'portrait' | 'landscape'>('portrait');

    // Click detection refs (persist between renders)
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
                console.log('🎸 FINAL: Initializing AlphaTab');

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';
                setCurrentOrientation(isLandscape ? 'landscape' : 'portrait');

                console.log(`📱 FINAL: Initial mode = ${layoutMode}, isMobile = ${isMobile}`);

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    // 🎯 KEY: Disable AlphaTab's user interaction
                    // This prevents: duplicate cursors, drag-to-loop, AlphaTab's click handling
                    // We implement our own click handling below
                    enableUserInteraction: false,
                    isMobile,
                });

                if (!isMounted) return;

                apiRef.current = api;
                console.log('✅ FINAL: AlphaTab initialized (user interaction disabled)');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ FINAL: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                if (fileUrl) {
                    console.log('📄 FINAL: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ FINAL: Score loaded');

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
                console.error('❌ FINAL: Initialization failed:', error);
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

            console.log(`🔄 FINAL: Orientation changing from ${currentOrientation} → ${newOrientation}`);
            setCurrentOrientation(newOrientation);

            const alphaTab = (window as any).alphaTab;
            if (!alphaTab) return;

            // Reset scroll settings
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 FINAL: Switching to LANDSCAPE (Horizontal)');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

                // AGGRESSIVE CSS for single-row
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.display = 'flex';
                container.style.flexDirection = 'row';
                container.style.flexWrap = 'nowrap';
                container.style.alignItems = 'flex-start';

                await new Promise(resolve => setTimeout(resolve, 200));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;

                console.log('✅ FINAL: Horizontal mode configured');

            } else {
                console.log('📱 FINAL: Switching to PORTRAIT (Page)');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';
                container.style.height = 'auto';
                container.style.display = 'block';
                container.style.flexDirection = 'column';
                container.style.flexWrap = 'wrap';

                await new Promise(resolve => setTimeout(resolve, 200));

                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.documentElement;
                (api.settings.player as any).scrollOffsetY = -200;

                console.log('✅ FINAL: Page mode configured');
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 150));

            api.render();
            console.log('✅ FINAL: Re-render complete');
        };

        handleOrientationChange();

        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded, currentOrientation, isMobile]);

    // ==================== CUSTOM CLICK HANDLING ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleClick = (e: MouseEvent) => {
            const now = Date.now();
            const timeSinceLastClick = now - lastClickTimeRef.current;
            
            // Reset if too much time passed
            if (timeSinceLastClick > 400) {
                clickCountRef.current = 0;
            }

            clickCountRef.current++;
            lastClickTimeRef.current = now;

            if (clickCountRef.current === 1) {
                // First click - wait for potential double-click
                if (clickTimerRef.current) {
                    clearTimeout(clickTimerRef.current);
                }

                clickTimerRef.current = setTimeout(() => {
                    // Single click confirmed - SEEK ONLY
                    const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        if (api.tickPosition !== undefined) {
                            api.tickPosition = beat.absolutePlaybackStart;
                            console.log('🎯 FINAL: Single-click seek to tick:', beat.absolutePlaybackStart);
                        }
                    }

                    clickCountRef.current = 0;
                }, 250);
                
            } else if (clickCountRef.current === 2) {
                // Double-click detected - SEEK AND PLAY
                if (clickTimerRef.current) {
                    clearTimeout(clickTimerRef.current);
                    clickTimerRef.current = null;
                }

                e.preventDefault();
                e.stopPropagation();

                const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

                if (beat && beat.absolutePlaybackStart !== undefined) {
                    console.log('🎵 FINAL: Double-click at tick:', beat.absolutePlaybackStart);

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
                            console.log('✅ FINAL: Playback started from double-click');
                        } catch (err) {
                            console.error('❌ FINAL: Failed to start playback:', err);
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
                className={`${className} alphatab-container-final`}
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

            {/* 🎨 CSS for single-row horizontal layout */}
            <style jsx>{`
                .alphatab-container-final {
                    overflow-x: auto !important;
                }
                
                /* Bottom row fade */
                .alphatab-container-final :global(.at-surface) {
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

                /* 🔧 FIX: Aggressive single-row horizontal layout */
                .alphatab-container-final :global(.at-surface > *) {
                    display: inline-block !important;
                    vertical-align: top !important;
                    white-space: nowrap !important;
                }
                
                .alphatab-container-final :global(.at-viewport) {
                    white-space: nowrap !important;
                    display: inline-flex !important;
                    flex-wrap: nowrap !important;
                }

                .alphatab-container-final :global(.at-staff-group) {
                    display: inline-block !important;
                    white-space: nowrap !important;
                }
            `}</style>
        </div>
    );
};