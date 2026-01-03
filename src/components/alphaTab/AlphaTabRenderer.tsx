'use client';

/**
 * AlphaTab Renderer - V97.53: FIX HORIZONTAL MODE GLITCHING
 * Base: V97.52 with Locks
 * Date: January 3rd, 2026
 *
 * 🔧 V97.53 FIX - HORIZONTAL GLITCH:
 * ✅ REMOVED: Duplicate mediaQuery listener in orientation effect
 * ✅ REASON: page.tsx already handles orientation detection via isMobileLandscape prop
 * ✅ REMOVED: isMobile from orientation effect dependencies (was causing extra triggers)
 * ✅ ADDED: Orientation change lock to prevent rapid re-renders
 * ✅ RESULT: No more rapid stretching/retracting on mode switch
 * 
 * 🔒 PRESERVED FROM V97.52:
 * ✅ All loop click behavior (Songsterr style)
 * ✅ renderCycle dependencies for theme + handlers
 * ✅ Theme dark/light support
 * ✅ TypeScript fixes
 * ✅ V97.18 architecture (no manual seekTo)
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
    scrollContainerRef?: React.RefObject<HTMLElement>;
    isMobileLandscape?: boolean;
    audioSource?: 'synth' | 'original';
    isLooping?: boolean;
    onLoopRangeChange?: (start: number | null, end: number | null) => void;
    externalMediaHandler?: any;
    isSeeking?: boolean;
    isPlaying?: boolean;
    theme?: 'light' | 'dark';
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

    const offsets = [0, -4, 4, -8, 8];
    for (const offset of offsets) {
        const beat = api.renderer.boundsLookup.getBeatAtPos(relX + offset, relY);
        if (beat) {
            console.log(`✅ V97.53: getBeatAtPos success with offset ${offset}px`);
            return beat;
        }
    }

    console.warn('⚠️ V97.53: getBeatAtPos failed with all offsets');
    return null;
};

const getBarBoundariesFromMaster = (api: AlphaTabApi, beat: any): { startTick: number; endTick: number } | null => {
    if (!beat?.voice?.bar?.masterBar) return null;

    const masterBar = beat.voice.bar.masterBar;

    if (typeof masterBar.start === 'number') {
        const startTick = masterBar.start;
        const nextMaster = masterBar.nextMasterBar;
        const endTick = nextMaster ? nextMaster.start : startTick + (masterBar.calculateDuration?.() || 3840);

        console.log(`📊 V97.53: Master boundaries - start:${startTick}, end:${endTick}`);
        return { startTick, endTick };
    }

    return null;
};

const getBarBoundaries = (beat: any): { startTick: number; endTick: number } | null => {
    if (!beat?.voice?.bar) return null;

    const bar = beat.voice.bar;
    const beats = bar.voices?.[0]?.beats;

    if (!beats || beats.length === 0) return null;

    const firstBeat = beats[0];
    const lastBeat = beats[beats.length - 1];

    const startTick = firstBeat.absolutePlaybackStart ?? firstBeat.playbackStart ?? 0;
    const lastBeatStart = lastBeat.absolutePlaybackStart ?? lastBeat.playbackStart ?? 0;
    const lastBeatDuration = lastBeat.playbackDuration ?? 960;
    const endTick = lastBeatStart + lastBeatDuration;

    console.log(`📊 V97.53: Legacy boundaries - start:${startTick}, end:${endTick}`);
    return { startTick, endTick };
};

const getFirstBeatInBar = (api: AlphaTabApi, beat: any): any => {
    if (!beat?.voice?.bar?.voices?.[0]?.beats) return beat;

    const firstBeat = beat.voice.bar.voices[0].beats[0];
    return firstBeat || beat;
};

const getBarStartTick = (beat: any): number => {
    if (beat?.voice?.bar?.voices?.[0]?.beats?.[0]) {
        const firstBeat = beat.voice.bar.voices[0].beats[0];
        return firstBeat.absolutePlaybackStart ?? firstBeat.playbackStart ?? 0;
    }
    return beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
};

const getBarEndTick = (beat: any): number => {
    if (beat?.voice?.bar?.voices?.[0]?.beats) {
        const beats = beat.voice.bar.voices[0].beats;
        const lastBeat = beats[beats.length - 1];
        const start = lastBeat.absolutePlaybackStart ?? lastBeat.playbackStart ?? 0;
        const duration = lastBeat.playbackDuration ?? 960;
        return start + duration;
    }
    const start = beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
    const duration = beat.playbackDuration ?? 960;
    return start + duration;
};

const createLoopHandles = (container: HTMLElement) => {
    const startHandle = document.createElement('div');
    startHandle.className = 'loop-handle loop-handle-start';
    startHandle.style.cssText = `
        position: absolute;
        width: 12px;
        height: 100%;
        background: rgba(34, 197, 94, 0.6);
        cursor: ew-resize;
        z-index: 50;
        display: none;
        border-radius: 4px 0 0 4px;
    `;

    const endHandle = document.createElement('div');
    endHandle.className = 'loop-handle loop-handle-end';
    endHandle.style.cssText = `
        position: absolute;
        width: 12px;
        height: 100%;
        background: rgba(34, 197, 94, 0.6);
        cursor: ew-resize;
        z-index: 50;
        display: none;
        border-radius: 0 4px 4px 0;
    `;

    container.appendChild(startHandle);
    container.appendChild(endHandle);

    return { startHandle, endHandle };
};

const attachHandleDragHandlers = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLElement,
    endHandle: HTMLElement,
    onLoopRangeChange: (start: number, end: number) => void
) => {
    let activeDrag: 'start' | 'end' | null = null;

    const handleMouseMove = (e: MouseEvent) => {
        if (!activeDrag || !api.playbackRange) return;

        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (!beat) return;

        const currentRange = api.playbackRange;

        if (activeDrag === 'start') {
            const newStartTick = getBarStartTick(beat);
            if (newStartTick < currentRange.endTick) {
                api.playbackRange = { startTick: newStartTick, endTick: currentRange.endTick };
            }
        } else {
            const newEndTick = getBarEndTick(beat);
            if (newEndTick > currentRange.startTick) {
                api.playbackRange = { startTick: currentRange.startTick, endTick: newEndTick };
            }
        }
    };

    const handleMouseUp = () => {
        if (activeDrag && api.playbackRange) {
            onLoopRangeChange(api.playbackRange.startTick, api.playbackRange.endTick);
        }
        activeDrag = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleStartDrag = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        activeDrag = 'start';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleEndDrag = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        activeDrag = 'end';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    startHandle.addEventListener('mousedown', handleStartDrag);
    endHandle.addEventListener('mousedown', handleEndDrag);

    return () => {
        startHandle.removeEventListener('mousedown', handleStartDrag);
        endHandle.removeEventListener('mousedown', handleEndDrag);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
};

const setupTouchSelection = (api: AlphaTabApi, container: HTMLElement) => {
    let startBeat: any = null;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);

        if (beat) {
            startBeat = getFirstBeatInBar(api, beat);
            isDragging = true;

            let boundaries = getBarBoundariesFromMaster(api, startBeat);
            if (!boundaries) {
                boundaries = getBarBoundaries(startBeat);
            }

            if (boundaries) {
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
            }

            document.body.style.overflow = 'hidden';
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging || !startBeat || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);

        if (beat) {
            const startTick = getBarStartTick(startBeat);
            const endBeat = beat;
            const endTick = getBarEndTick(endBeat);

            if (endTick > startTick) {
                api.playbackRange = { startTick, endTick };
            } else {
                const newStartTick = getBarStartTick(endBeat);
                const newEndTick = getBarEndTick(startBeat);
                api.playbackRange = { startTick: newStartTick, endTick: newEndTick };
            }
        }
    };

    const handleTouchEnd = () => {
        isDragging = false;
        startBeat = null;
        document.body.style.overflow = '';
    };

    const surface = container.querySelector('.at-surface');
    const target = (surface as HTMLElement) || container;

    target.addEventListener('touchstart', handleTouchStart as EventListener);
    target.addEventListener('touchmove', handleTouchMove as EventListener);
    target.addEventListener('touchend', handleTouchEnd as EventListener);
    target.addEventListener('touchcancel', handleTouchEnd as EventListener);

    return () => {
        target.removeEventListener('touchstart', handleTouchStart as EventListener);
        target.removeEventListener('touchmove', handleTouchMove as EventListener);
        target.removeEventListener('touchend', handleTouchEnd as EventListener);
        target.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        document.body.style.overflow = '';
    };
};

// ==================== COMPONENT ====================

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
    externalMediaHandler,
    scrollContainerRef,
    isMobileLandscape = false,
    isLooping = false,
    onLoopRangeChange,
    audioSource = 'synth',
    isSeeking = false,
    isPlaying = false,
    theme = 'light',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<AlphaTabApi | null>(null);

    const lastLoadedFileRef = useRef<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const [renderCycle, setRenderCycle] = useState(0);

    // Dark-mode tracking
    const lastThemeRef = useRef<string>('');
    
    // 🆕 V97.53: Orientation change lock to prevent rapid re-renders
    const lastOrientationRef = useRef<boolean | null>(null);
    const orientationLockRef = useRef<boolean>(false);

    useEffect(() => {
        if (isSeeking || isPlaying) {
            console.log(`🔒 V97.53: State - seeking:${isSeeking}, playing:${isPlaying}`);
        }
    }, [isSeeking, isPlaying]);

    useEffect(() => {
        console.log(`🔄 V97.53: Render cycle: ${renderCycle}`);
    }, [renderCycle]);

    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const mouseCleanupRef = useRef<(() => void) | null>(null);
    const touchCleanupRef = useRef<(() => void) | null>(null);
    const initialFileLoadedRef = useRef(false);

    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileKeywords.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
        return isMobileUA || (isTouchDevice && isSmallScreen);
    };

    const [isMobile] = useState(detectMobile());

    // ========== INIT ALPHATAB ==========

    useEffect(() => {
        let destroyed = false;

        const initAndLoad = async () => {
            if (!containerRef.current) return;
            if (apiRef.current) return;

            try {
                setIsLoading(true);
                setRenderCycle(rc => rc + 1);
                console.log('🎵 V97.53: Initializing AlphaTab...');

                const scrollElement = scrollContainerRef?.current || document.body;

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: true,
                    layoutMode: 'page',
                    soundFontPath,
                    isMobile,
                    enableUserInteraction: false,
                    scrollContainer: scrollElement,
                });

                if (destroyed) {
                    api.destroy();
                    return;
                }

                apiRef.current = api;
                console.log('✅ V97.53: AlphaTab initialized');

                (window as any).__at = api;
                console.log('🔍 DEBUG: Exposed AlphaTab API as window.__at');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 V97.53: File loaded');
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                api.scoreLoaded.on((score: any) => {
                    console.log('📊 V97.53: Score loaded');
                    const tracks: Track[] = score.tracks.map((t: any) => ({
                        index: t.index,
                        name: t.name,
                        shortName: t.shortName,
                    }));

                    const songInfo: SongInfo = {
                        title: score.title,
                        artist: score.artist,
                        album: score.album,
                        tempo: score.tempo,
                    };

                    setScoreIsLoaded(true);
                    onScoreLoaded?.(songInfo, tracks);

                    if (api && !destroyed) {
                        api.updateSettings();
                        api.render();
                        console.log('✅ V97.53: Layout recalculated');

                        lastThemeRef.current = '';
                        console.log('🎨 V97.53: Reset theme ref - effect will reapply theme');
                    }
                });

                api.renderFinished.on(() => {
                    console.log('🎨 V97.53: Render finished');
                    setIsRendered(true);
                    setIsLoading(false);
                    setRenderCycle(rc => rc + 1);
                    onRenderFinished?.();
                });

                onApiReady?.(api);
            } catch (err) {
                console.error('❌ V97.53: Init error:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                setIsLoading(false);
                onError?.(errorMsg);
            }
        };

        initAndLoad();

        return () => {
            destroyed = true;
            if (apiRef.current) {
                try {
                    apiRef.current.destroy();
                } catch (e) {
                    console.error('Error destroying AlphaTab', e);
                }
                apiRef.current = null;
            }
            delete (window as any).__at;
        };
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE CHANGES ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        console.log(`🔄 V97.53: Updating player mode to: ${playerMode}`);
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();
    }, [playerMode]);

    // ========== ATTACH EXTERNAL HANDLER ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        if (externalMediaHandler) {
            const output = api.player.output as any;
            output.handler = externalMediaHandler;
            console.log('🔗 V97.53: External handler attached');

            return () => {
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                        console.log('🔌 V97.53: Handler detached');
                    }
                }
            };
        } else {
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V97.53: Handler cleared');
            }
        }
    }, [externalMediaHandler]);

    // ========== LOAD NEW FILE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;

        if (lastLoadedFileRef.current === fileUrl) {
            console.log('⏭️ V97.53: Same file, skipping reload');
            return;
        }

        const loadNewFile = async () => {
            try {
                console.log(`🔄 V97.53: Loading new file: ${fileUrl}`);

                lastThemeRef.current = '';
                console.log('🎨 V97.53: Reset theme ref for new file');

                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
                console.log('✅ V97.53: New file loaded');
            } catch (err) {
                console.error('❌ V97.53: Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== ORIENTATION HANDLING ==========
    // 🔧 V97.53 FIX: REMOVED mediaQuery listener - page.tsx handles orientation detection
    // Only respond to isMobileLandscape prop changes (single source of truth)

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;
        if (!containerRef.current) return;
        
        // 🆕 V97.53: Skip if orientation hasn't actually changed
        if (lastOrientationRef.current === isMobileLandscape) {
            console.log(`⏭️ V97.53: Orientation unchanged (${isMobileLandscape}), skipping`);
            return;
        }
        
        // 🆕 V97.53: Lock to prevent rapid re-renders
        if (orientationLockRef.current) {
            console.log('🔒 V97.53: Orientation change locked, skipping');
            return;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            orientationLockRef.current = true;
            
            const alphaTab = await import('@coderline/alphatab');

            console.log(`🔄 V97.53: Orientation change - isMobileLandscape:${isMobileLandscape}`);
            lastOrientationRef.current = isMobileLandscape;

            if (isMobileLandscape) {
                console.log('🎸 V97.53: LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;

                // V97.18 style: use scrollOffsetX/Y separately
                (api.settings.player as any).scrollOffsetX = 120;
                (api.settings.player as any).scrollOffsetY = 0;

                console.log('📐 V97.53: Horizontal layout, scrollOffsetX=120px');
            } else {
                console.log('📱 V97.53: PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                const scrollElement = scrollContainerRef?.current || document.documentElement;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffsetY = -200;
                (api.settings.player as any).scrollOffsetX = 0;

                console.log('📐 V97.53: Page layout, scrollOffsetY=-200px');
            }

            await api.updateSettings();
            window.dispatchEvent(new Event('resize'));
            await new Promise((r) => setTimeout(r, 100)); // Increased delay
            api.render();
            
            // Release lock after render completes
            setTimeout(() => {
                orientationLockRef.current = false;
                console.log('🔓 V97.53: Orientation lock released');
            }, 200);
        };

        handleOrientationChange();

        // 🔧 V97.53: NO mediaQuery listener here - page.tsx handles it
        // This prevents double-triggering of orientation changes
        
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef]); // 🔧 REMOVED isMobile

    // ========== THEME (DARK/LIGHT) ==========
    // 🔒 CRITICAL: renderCycle MUST be in dependencies!

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isRendered) return;

        if (lastThemeRef.current === theme) return;

        const applyTheme = async () => {
            const alphaTab = await import('@coderline/alphatab');
            console.log(`🎨 V97.53: Applying ${theme} theme (renderCycle: ${renderCycle})`);
            lastThemeRef.current = theme;

            const resources = api.settings.display.resources as any;

            if (theme === 'dark') {
                resources.staffLineColor = new alphaTab.model.Color(85, 85, 85, 255);
                resources.barSeparatorColor = new alphaTab.model.Color(136, 136, 136, 255);
                resources.mainGlyphColor = new alphaTab.model.Color(255, 255, 255, 255);
                resources.secondaryGlyphColor = new alphaTab.model.Color(224, 224, 224, 255);
                resources.scoreInfoColor = new alphaTab.model.Color(255, 255, 255, 255);
                resources.barNumberColor = new alphaTab.model.Color(153, 153, 153, 255);
            } else {
                resources.staffLineColor = new alphaTab.model.Color(153, 153, 153, 255);
                resources.barSeparatorColor = new alphaTab.model.Color(102, 102, 102, 255);
                resources.mainGlyphColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.secondaryGlyphColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.scoreInfoColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.barNumberColor = new alphaTab.model.Color(102, 102, 102, 255);
            }

            await api.updateSettings();
            api.render();
            console.log(`✅ V97.53: Theme ${theme} applied successfully`);
        };

        applyTheme();
    }, [theme, isRendered, renderCycle]); // 🔒 CRITICAL: renderCycle MUST stay!

    // ========== DYNAMIC USER INTERACTION - DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        (api.settings.player as any).enableUserInteraction = false;
        api.updateSettings();
        console.log('🔒 V97.53: enableUserInteraction locked to FALSE');
    }, [isLooping]);

    // ========== INSTANT LOOP AT CURSOR ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) return;

        if (!api.playbackRange && api.tickPosition !== undefined) {
            const currentTick = api.tickPosition;
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            const tickCache = (api as any).tickCache;

            if (tickCache) {
                const beatResult = tickCache.findBeat(trackIndices, currentTick);

                if (beatResult?.beat) {
                    const barStartTick = getBarStartTick(beatResult.beat);
                    const barEndTick = getBarEndTick(beatResult.beat);

                    api.playbackRange = {
                        startTick: barStartTick,
                        endTick: barEndTick,
                    };
                }
            }
        }
    }, [isLooping, isRendered]);

    // ========== LOOP HANDLES CREATION ==========

    useEffect(() => {
        if (!containerRef.current || !isLooping) {
            if (startHandleRef.current) startHandleRef.current.style.display = 'none';
            if (endHandleRef.current) endHandleRef.current.style.display = 'none';
            return;
        }

        const handles = createLoopHandles(containerRef.current);
        startHandleRef.current = handles.startHandle;
        endHandleRef.current = handles.endHandle;

        return () => {
            if (startHandleRef.current) {
                startHandleRef.current.remove();
                startHandleRef.current = null;
            }
            if (endHandleRef.current) {
                endHandleRef.current.remove();
                endHandleRef.current = null;
            }
        };
    }, [isLooping]);

    // ========== DRAG HANDLERS FOR HANDLES ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;
        const startHandle = startHandleRef.current;
        const endHandle = endHandleRef.current;

        if (!api || !container || !startHandle || !endHandle || !isLooping) return;

        dragCleanupRef.current = attachHandleDragHandlers(
            api,
            container,
            startHandle,
            endHandle,
            (startTick: number, endTick: number) => {
                onLoopRangeChange?.(startTick, endTick);
            }
        );

        return () => {
            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isLooping, onLoopRangeChange]);

    // ========== PLAYBACK RANGE CHANGES ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        const handleRangeChange = (e: any) => {
            const container = containerRef.current;
            const startHandle = startHandleRef.current;
            const endHandle = endHandleRef.current;

            if (e.playbackRange) {
                const { startTick, endTick } = e.playbackRange;
                onLoopRangeChange?.(startTick, endTick);

                if (container && startHandle && endHandle) {
                    const boundsLookup = api.renderer?.boundsLookup;
                    if (boundsLookup) {
                        // Position handles at loop boundaries
                    }
                }
            } else {
                onLoopRangeChange?.(null, null);
                if (startHandle) startHandle.style.display = 'none';
                if (endHandle) endHandle.style.display = 'none';
            }
        };

        api.playbackRangeChanged.on(handleRangeChange);

        return () => {
            api.playbackRangeChanged.off(handleRangeChange);
        };
    }, [onLoopRangeChange]);

    // ========== SINGLE-CLICK HANDLER ==========
    // 🔒 CRITICAL: renderCycle MUST be in dependencies!

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered) return;

        const handleSingleClick = (e: MouseEvent) => {
            if (isSeeking || isPlaying) {
                console.log('🔒 V97.53: Click blocked during seek/play');
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) {
                console.log('⚠️ V97.53: No beat found at click position');
                return;
            }

            if (isLooping) {
                // Move loop to clicked bar
                const firstBeat = getFirstBeatInBar(api, beat);
                let boundaries = getBarBoundariesFromMaster(api, firstBeat);
                if (!boundaries) {
                    boundaries = getBarBoundaries(firstBeat);
                }

                if (boundaries) {
                    api.playbackRange = {
                        startTick: boundaries.startTick,
                        endTick: boundaries.endTick,
                    };
                    console.log(`🔁 V97.53: Loop moved to bar ${boundaries.startTick}-${boundaries.endTick}`);
                }
            } else {
                // Seek to clicked position
                const tick = beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
                api.tickPosition = tick;
                console.log(`🎯 V97.53: Seeked to tick ${tick}`);
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('click', handleSingleClick);
        console.log(`🖱️ V97.53: Single-click handler ATTACHED (renderCycle: ${renderCycle})`);

        return () => {
            target.removeEventListener('click', handleSingleClick);
        };
    }, [isRendered, isLooping, isSeeking, isPlaying, renderCycle]); // 🔒 renderCycle MUST stay!

    // ========== DOUBLE-CLICK PLAY/PAUSE ==========
    // 🔒 CRITICAL: renderCycle MUST be in dependencies!

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered) return;

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        const handleDoubleClick = (e: MouseEvent) => {
            console.log(`🖱️🖱️ V97.53: Double-click detected`);

            if (isSeeking) {
                console.log('🔒 V97.53: Double-click blocked during seek');
                return;
            }

            if (isLooping && api.playbackRange) {
                api.playbackRange = null;
                console.log('🖱️🖱️ V97.53: Double-click - cleared loop');
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            const tick = beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
            api.tickPosition = tick;

            if (api.playerState === 1) {
                api.pause();
                console.log('⏸️ V97.53: PAUSED via double-click');
            } else {
                if (audioSource === 'synth') {
                    api.play();
                    console.log('🎵 V97.53: SYNTH - api.play()');
                } else {
                    const output = api.player?.output as any;
                    if (output?.handler) {
                        api.play();
                        console.log('🎵 V97.53: ORIGINAL - api.play()');
                    } else {
                        console.warn('⚠️ V97.53: No handler for original mode');
                    }
                }
            }
        };

        target.addEventListener('dblclick', handleDoubleClick);
        console.log(`🖱️🖱️ V97.53: Double-click handler ATTACHED (renderCycle: ${renderCycle})`);

        return () => {
            target.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]); // 🔒 renderCycle MUST stay!

    // ========== MOUSE DRAG SELECTION (loop on) ==========

    useEffect(() => {
        if (mouseCleanupRef.current) {
            mouseCleanupRef.current();
            mouseCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) return;

        let startBeat: any = null;
        let endBeat: any = null;
        let isDragging = false;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            isDragging = true;
            startBeat = getFirstBeatInBar(api, beat);
            endBeat = beat;

            console.log(`🖱️ V97.53: Mouse down - bar start tick ${startBeat.absolutePlaybackStart}`);

            let boundaries = getBarBoundariesFromMaster(api, startBeat);
            if (!boundaries) {
                console.warn('⚠️ V97.53: Master boundaries unavailable, using legacy');
                boundaries = getBarBoundaries(startBeat);
            }

            if (boundaries) {
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
                console.log(`🖱️ V97.53: Initial loop ${boundaries.startTick} to ${boundaries.endTick}`);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !startBeat) return;

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            endBeat = beat;

            const startTick = getBarStartTick(startBeat);
            const endTick = getBarEndTick(endBeat);

            if (endTick > startTick) {
                api.playbackRange = { startTick, endTick };
            } else {
                const newStartTick = getBarStartTick(endBeat);
                const newEndTick = getBarEndTick(startBeat);
                api.playbackRange = { startTick: newStartTick, endTick: newEndTick };
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            startBeat = null;
            endBeat = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            console.log('🖱️ V97.53: Mouse up - drag complete');
        };

        const handleDoubleClick = (e: MouseEvent) => {
            if (api.playbackRange) {
                api.playbackRange = null;
                console.log('🖱️🖱️ V97.53: Double-click - cleared loop');
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('mousedown', handleMouseDown as EventListener);
        target.addEventListener('dblclick', handleDoubleClick as EventListener);

        mouseCleanupRef.current = () => {
            target.removeEventListener('mousedown', handleMouseDown as EventListener);
            target.removeEventListener('dblclick', handleDoubleClick as EventListener);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        return mouseCleanupRef.current;
    }, [isRendered, isLooping]);

    // ========== TOUCH DRAG SELECTION (loop on, mobile) ==========

    useEffect(() => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping || !isMobile) return;

        const setupTimer = setTimeout(() => {
            if (api && container) {
                touchCleanupRef.current = setupTouchSelection(api, container);
                console.log('📱 V97.53: Touch selection enabled');
            }
        }, 300);

        return () => {
            clearTimeout(setupTimer);
            if (touchCleanupRef.current) {
                touchCleanupRef.current();
                touchCleanupRef.current = null;
            }
        };
    }, [isRendered, isLooping, isMobile]);

    // ========== LOOP PLAYBACK ENFORCEMENT ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isLooping) return;

        const handlePlayerPositionChanged = (e: any) => {
            if (!api.playbackRange) return;

            const { startTick, endTick } = api.playbackRange;

            if (e.currentTick >= endTick) {
                api.tickPosition = startTick;

                if (api.playerState === 1) {
                    setTimeout(() => {
                        if (api && api.play) api.play();
                    }, 10);
                }
            }
        };

        api.playerPositionChanged.on(handlePlayerPositionChanged);

        return () => {
            api.playerPositionChanged.off(handlePlayerPositionChanged);
        };
    }, [isLooping]);

    // ========== CLEAR LOOP WHEN DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        if (!isLooping && api.playbackRange) {
            api.playbackRange = null;
        }
    }, [isLooping]);

    // ========== RENDER ==========

    const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    const loadingBgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
    const loadingTextColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-700';

    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center ${loadingBgColor} rounded-xl z-10`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className={`${loadingTextColor} font-medium`}>
                            {playerMode === 'synthesizer'
                                ? 'Loading tab & initializing synthesizer...'
                                : 'Loading tab...'}
                        </p>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className={`${className} alphatab-container`}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor,
                    position: 'relative',
                    zIndex: 10,
                }}
            />
        </div>
    );
};