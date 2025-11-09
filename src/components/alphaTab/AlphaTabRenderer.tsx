'use client';

/**
 * AlphaTab Renderer - STAGE 1 PROPER FIX
 * 
 * KEY CHANGE:
 * ✅ enableUserInteraction: true (native AlphaTab handling restored)
 * ✅ enableLoopSelection: false (only disables drag-to-loop)
 * ✅ Removed all custom click handling (AlphaTab does it natively)
 * 
 * BENEFITS:
 * - Single-click seek works natively
 * - Double-click play works natively  
 * - Track selection works natively
 * - Single cursor (no duplicates)
 * - No need to re-implement AlphaTab features
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
                console.log('🎸 STAGE1-PROPER: Initializing AlphaTab');

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    // 🎯 PROPER FIX: Let AlphaTab handle user interactions natively
                    // We only disable the drag-to-loop selection via enableLoopSelection
                    enableUserInteraction: true,
                    isMobile,
                });

                if (!isMounted) return;

                // 🔧 CRITICAL: Disable loop selection AFTER initialization
                // This prevents the drag-to-loop highlight while keeping native clicks
                if (api.settings?.player) {
                    (api.settings.player as any).enableLoopSelection = false;
                    console.log('✅ STAGE1-PROPER: Loop selection disabled (drag-to-loop prevented)');
                }

                apiRef.current = api;
                console.log('✅ STAGE1-PROPER: AlphaTab initialized with native interactions');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ STAGE1-PROPER: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                if (fileUrl) {
                    console.log('📄 STAGE1-PROPER: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);

                    // Wait for score to be ready
                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ STAGE1-PROPER: Score loaded');

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
                console.error('❌ STAGE1-PROPER: Initialization failed:', error);
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
            console.log('🔄 STAGE1-PROPER: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            // 🚨 CRITICAL: Reset ALL scroll settings first
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1-PROPER: Switching to LANDSCAPE (Horizontal)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;

                // Enhanced CSS for true single-row horizontal layout
                container.style.overflowX = 'auto';
                container.style.overflowY = 'hidden';
                container.style.whiteSpace = 'nowrap';
                container.style.width = '100%';
                container.style.display = 'flex';
                container.style.flexWrap = 'nowrap';

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 150));

                // Set scroll settings
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;

                console.log('✅ STAGE1-PROPER: Horizontal - single row mode active');

            } else {
                console.log('📱 STAGE1-PROPER: Switching to PORTRAIT (Page)');

                // Set layout mode
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;

                // Reset container CSS
                container.style.overflowX = 'auto';
                container.style.overflowY = 'auto';
                container.style.whiteSpace = 'normal';
                container.style.display = 'block';
                container.style.flexWrap = 'wrap';

                // Wait for DOM to settle
                await new Promise(resolve => setTimeout(resolve, 150));

                // Use document.documentElement for page scroll
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = document.documentElement;
                (api.settings.player as any).scrollOffsetY = -200;

                console.log('✅ STAGE1-PROPER: Page - multi-row mode active');
            }

            // Apply settings and wait before render
            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now render
            api.render();
            console.log('✅ STAGE1-PROPER: Re-render complete');
        };

        // Initial setup
        handleOrientationChange();

        // Listen for orientation changes
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    // ==================== NO CUSTOM CLICK HANDLERS NEEDED ====================
    // AlphaTab's native user interaction handles:
    // - Single-click to seek
    // - Double-click to play
    // - Track selection on click
    // We've only disabled drag-to-loop via enableLoopSelection: false

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
                
                /* 🔧 FIX: Minimal fade at very bottom to reduce 3rd row bleed */
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
                }

                /* 🔧 FIX: Force single row in horizontal mode */
                .alphatab-container-stage1 :global(.at-surface > *) {
                    display: inline-block !important;
                    vertical-align: top !important;
                }
                
                /* 🔧 FIX: Prevent wrapping of staff elements */
                .alphatab-container-stage1 :global(.at-viewport) {
                    white-space: nowrap !important;
                }
            `}</style>
        </div>
    );
};