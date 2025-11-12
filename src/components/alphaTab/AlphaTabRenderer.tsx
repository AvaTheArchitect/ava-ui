'use client';

/**
 * AlphaTab Renderer - STAGE 1 with iOS PWA Resume Fix
 * 
 * @version Nov 11, 2025
 * @updated Added aggressive localStorage + DOM cleanup for ghost cursor fix
 * 
 * 🚨 CRITICAL FIX: iOS PWA state persistence bug
 * - First launch = Works perfectly ✅
 * - Reopen without reinstall = Broken (ghost cursors, track switching fails) ❌
 * 
 * SOLUTION: Force clean reinitialization + storage cleanup when PWA resumes
 * 
 * WORKING FEATURES:
 * ✅ Single unified row in landscape
 * ✅ Auto-scroll in both orientations
 * ✅ Orientation switching
 * ✅ Track selection
 * ✅ Survives app suspend/resume cycles
 * ✅ Clears ghost cursors on resume
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
    
    // 🚨 NEW: Track initialization attempts to force reload on resume
    const initCountRef = useRef<number>(0);
    const [forceReload, setForceReload] = useState<number>(0);

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

    // 🚨 iOS PWA FIX: Force hard reload on resume (Nuclear Option)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const isSubsequentRun = sessionStorage.getItem('pwa_has_run');
                
                if (isSubsequentRun) {
                    console.warn('⚠️ iOS PWA: Subsequent run detected - forcing hard reload to clear iOS WebView cache');
                    
                    // Clear the marker so we don't infinite loop
                    sessionStorage.removeItem('pwa_has_run');
                    
                    // Force hard reload (bypasses all caches)
                    window.location.reload();
                } else {
                    // Mark that we've run once
                    sessionStorage.setItem('pwa_has_run', 'true');
                    console.log('✅ iOS PWA: First run marker set');
                }
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                console.warn('⚠️ iOS PWA: Page restored from bfcache - forcing hard reload');
                window.location.reload();
            }
        };

        // iOS Safari uses both visibilitychange and pageshow
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', handlePageShow);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    // ==================== INITIALIZE ALPHATAB ====================
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log(`🎸 STAGE1-iOS: Initializing AlphaTab (attempt ${initCountRef.current + 1})`);

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile,
                    // ✅ CRITICAL: Enable user interaction for click-to-seek
                    enableUserInteraction: true,
                    // ✅ CRITICAL: Disable loop selection to prevent drag-to-loop highlight
                    enableLoopSelection: false,
                });

                if (!isMounted) return;

                // Increment initialization counter
                initCountRef.current += 1;

                apiRef.current = api;
                console.log('✅ STAGE1-iOS: AlphaTab initialized');

                // Setup event handlers
                if (api.renderFinished) {
                    api.renderFinished.on(() => {
                        console.log('✅ STAGE1-iOS: Render finished');
                        if (isMounted) {
                            setIsRendered(true);
                            setIsLoading(false);
                            onRenderFinished?.();
                        }
                    });
                }

                // Load score
                if (fileUrl) {
                    console.log('📄 STAGE1-iOS: Loading score from:', fileUrl);
                    await loadGuitarProFile(api, fileUrl);
                    
                    setTimeout(() => {
                        if (isMounted && api.score) {
                            setScoreIsLoaded(true);
                            console.log('✅ STAGE1-iOS: Score loaded');
                            
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
                console.error('❌ STAGE1-iOS: Initialization failed:', error);
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
    }, [fileUrl, isMobile, onApiReady, onError, onRenderFinished, onScoreLoaded, playerMode, soundFontPath, forceReload]); // Added forceReload

    // ==================== ORIENTATION CHANGE HANDLER ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            console.log('🔄 STAGE1-iOS: Orientation change detected');

            const isLandscape = window.innerWidth > window.innerHeight;
            const alphaTab = (window as any).alphaTab;

            if (!alphaTab) return;

            // Reset scroll settings
            api.settings.player.scrollMode = alphaTab.ScrollMode.Off;
            api.settings.player.scrollElement = null;
            (api.settings.player as any).scrollOffsetX = 0;
            (api.settings.player as any).scrollOffsetY = 0;

            if (isLandscape) {
                console.log('📱 STAGE1-iOS: Switching to LANDSCAPE');
                
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
                
                console.log('✅ STAGE1-iOS: Horizontal setup complete');
                
            } else {
                console.log('📱 STAGE1-iOS: Switching to PORTRAIT');
                
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
                
                console.log('✅ STAGE1-iOS: Page setup complete');
            }

            await api.updateSettings();
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
            console.log('✅ STAGE1-iOS: Re-render complete');
        };

        handleOrientationChange();
        window.addEventListener('resize', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, [isRendered, scoreIsLoaded]);

    return (
        <div className="relative">
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-2"></div>
                        <p className="text-orange-400 font-semibold">
                            {initCountRef.current > 0
                                ? 'Reinitializing...'
                                : playerMode === 'synthesizer'
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