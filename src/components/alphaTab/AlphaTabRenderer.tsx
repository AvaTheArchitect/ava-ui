'use client';

/**
 * AlphaTab Renderer - V97.21: DYNAMIC ISLAND OFFSET FIX
 * Date for Records: December 17th, 2025
 * 
 * 🔧 V97.21 TWEAK - CLEAR iPHONE DYNAMIC ISLAND:
 * ✅ Increased scrollOffset from 15% to 25% for Dynamic Island clearance
 * ✅ On iPhone 16 Pro Max landscape (~932px), this gives ~233px offset
 * 
 * 🔧 V97.21 CRITICAL FIX - MOBILE LANDSCAPE CURSOR OFF-SCREEN:
 * ✅ Uses `scrollOffset` (NOT scrollOffsetX/scrollOffsetY!)
 * ✅ Dynamic % offset for landscape: container.clientWidth * 0.25
 * ✅ Uses container directly as scrollElement in landscape
 * ✅ ScrollMode.Continuous (numeric 1) for proper auto-scroll
 * ✅ Added orientation change listener for live rotation handling
 * 
 * 🔒 PRESERVED FROM V97.18:
 * ✅ Block clicks when (seeking=true AND playing=true)
 * ✅ External media handler integration
 * ✅ Purple notation + auto-scroll
 * ✅ Just set api.tickPosition - AlphaTab handles seekTo automatically
 */

import React, { useEffect, useRef, useState } from 'react';
import { initAlphaTab, loadGuitarProFile } from '@/lib/alphaTab/initAlphaTab';
import { createLoopHandles, updateHandlePositions, attachHandleDragHandlers } from '@/lib/alphaTab/loopHandles';
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

const getBarStartTick = (beat: any): number => {
    if (!beat || !beat.voice || !beat.voice.bar) {
        return beat?.absolutePlaybackStart || 0;
    }
    const bar = beat.voice.bar;
    let firstBeatTick = beat.absolutePlaybackStart;
    if (bar.voices && bar.voices.length > 0) {
        for (const voice of bar.voices) {
            if (voice.beats && voice.beats.length > 0) {
                const firstBeat = voice.beats[0];
                if (firstBeat.absolutePlaybackStart < firstBeatTick) {
                    firstBeatTick = firstBeat.absolutePlaybackStart;
                }
            }
        }
    }
    return firstBeatTick;
};

const getBarEndTick = (beat: any): number => {
    if (!beat || !beat.voice || !beat.voice.bar) {
        return beat?.absolutePlaybackStart + beat?.playbackDuration || 0;
    }
    const bar = beat.voice.bar;
    let lastBeatEnd = beat.absolutePlaybackStart + beat.playbackDuration;
    if (bar.voices && bar.voices.length > 0) {
        for (const voice of bar.voices) {
            if (voice.beats && voice.beats.length > 0) {
                const lastBeat = voice.beats[voice.beats.length - 1];
                const beatEnd = lastBeat.absolutePlaybackStart + lastBeat.playbackDuration;
                if (beatEnd > lastBeatEnd) {
                    lastBeatEnd = beatEnd;
                }
            }
        }
    }
    return lastBeatEnd;
};

// ==================== TOUCH SELECTION ====================

const setupTouchSelection = (
    api: AlphaTabApi,
    container: HTMLElement,
    _startHandle: HTMLDivElement,
    _endHandle: HTMLDivElement
) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;
    let touchStartTime = 0;
    let touchMoved = false;
    let startX = 0;
    let startY = 0;
    let lastTapTime = 0;

    const DOUBLE_TAP_DELAY = 400;

    const handleTouchStart = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        touchStartTime = Date.now();
        touchMoved = false;

        const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);
        if (beat) {
            startBeat = beat;
            endBeat = beat;
        }
    };

    const handleTouchMove = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (!startBeat) return;

        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            startBeat = null;
            endBeat = null;
            return;
        }

        const isHorizontalDrag = Math.abs(deltaX) > 30;

        if (isHorizontalDrag) {
            touchMoved = true;

            if (!isSelecting) {
                isSelecting = true;
                document.body.style.overflow = 'hidden';
            }

            e.preventDefault();

            const beat = getBeatAtPosition(api, container, touch.clientX, touch.clientY);

            if (beat && beat !== endBeat) {
                endBeat = beat;

                if (startBeat && endBeat) {
                    const rawStart = getBarStartTick(startBeat);
                    const rawEnd = getBarEndTick(endBeat);

                    const loopStart = Math.min(rawStart, rawEnd);
                    const loopEnd = Math.max(rawStart, rawEnd);

                    api.playbackRange = {
                        startTick: loopStart,
                        endTick: loopEnd,
                    };
                }
            }
        }
    };

    const handleTouchEnd = () => {
        const now = Date.now();
        document.body.style.overflow = '';

        const timeSinceLastTap = now - lastTapTime;
        const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 50;
        lastTapTime = now;

        if (!touchMoved && Date.now() - touchStartTime < 400) {
            if (isDoubleTap) {
                if (api.playbackRange) {
                    api.playbackRange = null;
                }
            }
        }

        if (isSelecting && startBeat && endBeat) {
            const rawStart = getBarStartTick(startBeat);
            const rawEnd = getBarEndTick(endBeat);

            const loopStart = Math.min(rawStart, rawEnd);
            const loopEnd = Math.max(rawStart, rawEnd);

            api.playbackRange = {
                startTick: loopStart,
                endTick: loopEnd,
            };
        }

        isSelecting = false;
        startBeat = null;
        endBeat = null;
        touchMoved = false;
    };

    const surface = container.querySelector('.at-surface');
    const target = (surface as HTMLElement) || container;

    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
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
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<AlphaTabApi | null>(null);

    const lastLoadedFileRef = useRef<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const [renderCycle, setRenderCycle] = useState(0);

    useEffect(() => {
        if (isSeeking || isPlaying) {
            console.log(`🔒 V97.20: State - seeking:${isSeeking}, playing:${isPlaying}`);
        }
    }, [isSeeking, isPlaying]);

    useEffect(() => {
        console.log(`🔄 V97.19: Render cycle: ${renderCycle} (debug only)`);
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
                console.log('🎵 V97.19: Initializing AlphaTab...');

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
                console.log('✅ V97.19: AlphaTab initialized');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 V97.19: File loaded');
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                api.scoreLoaded.on((score: any) => {
                    console.log('📊 V97.19: Score loaded');
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
                        console.log('✅ V97.19: Layout recalculated');
                    }
                });

                api.renderFinished.on(() => {
                    console.log('🎨 V97.19: Render finished');
                    setIsRendered(true);
                    setIsLoading(false);
                    setRenderCycle(rc => rc + 1);
                    onRenderFinished?.();
                });

                onApiReady?.(api);
            } catch (err) {
                console.error('❌ V97.19: Init error:', err);
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
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE CHANGES ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        console.log(`🔄 V97.19: Updating player mode to: ${playerMode}`);
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
            console.log('🔗 V97.19: External handler attached');

            return () => {
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                        console.log('🔌 V97.19: Handler detached');
                    }
                }
            };
        } else {
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V97.19: Handler cleared');
            }
        }
    }, [externalMediaHandler]);

    // ========== LOAD NEW FILE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;

        if (lastLoadedFileRef.current === fileUrl) {
            console.log('⏭️ V97.19: Same file, skipping reload');
            return;
        }

        const loadNewFile = async () => {
            try {
                console.log(`🔄 V97.19: Loading new file: ${fileUrl}`);
                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
                console.log('✅ V97.19: New file loaded');
            } catch (err) {
                console.error('❌ V97.19: Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== V97.20 FIX: ORIENTATION HANDLING (exact V61 approach) ==========

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;
        if (!containerRef.current) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            const alphaTab = await import('@coderline/alphatab');
            
            // Check actual orientation (more reliable than prop)
            const isLandscape = isMobileLandscape || (isMobile && window.innerWidth > window.innerHeight);
            
            console.log(`🔄 V97.20: Orientation - isLandscape:${isLandscape}, isMobile:${isMobile}, containerWidth:${container.clientWidth}`);

            if (isLandscape) {
                // 🎸 LANDSCAPE: Horizontal layout + Container Scroll
                console.log('🎸 V97.20: LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                
                // ✅ V97.20: Use numeric value 1 for Continuous (per AlphaTab docs)
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                // ✅ V97.20 FIX: Use container directly as scrollElement
                api.settings.player.scrollElement = container;

                // ✅ V97.21 FIX: Use `scrollOffset` (NOT scrollOffsetX!)
                // Increased from 0.15 to 0.25 to clear iPhone Dynamic Island
                const horizontalOffset = container.clientWidth * 0.25;
                (api.settings.player as any).scrollOffset = horizontalOffset;

                console.log(`📐 V97.20: Horizontal layout, scrollElement=container, scrollOffset=${horizontalOffset.toFixed(0)}px (15% of ${container.clientWidth}px)`);

            } else {
                // 📱 PORTRAIT/DESKTOP: Page layout
                console.log('📱 V97.20: PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                
                // ✅ Use scrollContainerRef or document.documentElement for portrait
                const scrollElement = scrollContainerRef?.current || document.documentElement;
                api.settings.player.scrollElement = scrollElement;
                
                // ✅ V97.20: Use scrollOffset for vertical too (100px from V61)
                (api.settings.player as any).scrollOffset = 100;

                console.log('📐 V97.20: Page layout, scrollOffset=100px');
            }

            // Apply settings and re-render
            await api.updateSettings();
            window.dispatchEvent(new Event('resize'));
            await new Promise((r) => setTimeout(r, 50));
            api.render();
        };

        // Apply initial orientation
        handleOrientationChange();

        // Listen for orientation changes (live rotation)
        const mediaQuery = window.matchMedia('(orientation: landscape)');
        const handleMediaChange = () => {
            console.log('📱 V97.20: Orientation change detected');
            handleOrientationChange();
        };
        
        mediaQuery.addEventListener('change', handleMediaChange);

        return () => {
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef, isMobile]);

    // ========== DYNAMIC USER INTERACTION ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();
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

                if (api && container && startHandle && endHandle && isLooping) {
                    updateHandlePositions(api, container, startHandle, endHandle, 'rangeChanged');
                }
            } else {
                onLoopRangeChange?.(null, null);

                if (startHandle) startHandle.style.display = 'none';
                if (endHandle) endHandle.style.display = 'none';
            }
        };

        const handleRenderFinished = () => {
            const container = containerRef.current;
            const startHandle = startHandleRef.current;
            const endHandle = endHandleRef.current;

            if (api.playbackRange && container && startHandle && endHandle && isLooping) {
                updateHandlePositions(api, container, startHandle, endHandle, 'renderFinished');
            }
        };

        api.playbackRangeChanged.on(handleRangeChange);
        api.renderFinished.on(handleRenderFinished);

        return () => {
            api.playbackRangeChanged.off(handleRangeChange);
            api.renderFinished.off(handleRenderFinished);
        };
    }, [onLoopRangeChange, isLooping]);

    // ========== SINGLE CLICK SEEK (loop off) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) {
            console.log(`🔍 V97.19: Click handler NOT attached - api:${!!api}, container:${!!container}, isRendered:${isRendered}, isLooping:${isLooping}`);
            return;
        }

        console.log(`🖱️ V97.19: Single-click handler ATTACHED (audioSource=${audioSource})`);

        const handleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.19: Click BLOCKED (seeking=true, playing=true)`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                if (audioSource === 'original') {
                    console.log(`🖱️ V97.19: Single-click at ${tickPosition}ms (ORIGINAL mode)`);
                    api.tickPosition = tickPosition;
                    console.log(`📍 V97.19: api.tickPosition set (AlphaTab calls handler.seekTo internally)`);

                    setTimeout(() => {
                        console.log(`🔍 V97.19 DEBUG: After 200ms - api.tickPosition = ${api.tickPosition}, isPlaying=${isPlaying}`);
                    }, 200);
                } else {
                    api.tickPosition = tickPosition;
                    console.log(`🖱️ V97.19: Single-click seek to ${tickPosition}ms (SYNTH mode)`);
                }
            }
        };

        container.addEventListener('click', handleClick);

        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying]);


    // ========== DOUBLE CLICK PLAY (loop off) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) return;

        console.log(`🖱️🖱️ V97.19: Double-click handler ATTACHED (audioSource=${audioSource})`);

        const handleDoubleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.19: Double-click BLOCKED (seeking=true, playing=true)`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                console.log(`🖱️🖱️ V97.19: Double-click at ${tickPosition}ms (mode=${audioSource})`);

                if (audioSource === 'synth') {
                    api.tickPosition = tickPosition;
                    if (api.play) api.play();
                    console.log('🎵 V97.19: SYNTH - cursor set + api.play()');
                } else {
                    const output = api.player?.output as any;

                    if (output?.handler) {
                        api.tickPosition = tickPosition;
                        console.log(`📍 V97.19: api.tickPosition set (AlphaTab calls handler.seekTo internally)`);

                        if (output.handler.play) {
                            console.log('🎬 V97.19: ORIGINAL - handler.play()');
                            output.handler.play();
                        }

                        api.play();
                        console.log('🎵 V97.19: ORIGINAL - api.play() for purple notation');

                        setTimeout(() => {
                            console.log(`🔍 V97.19 DEBUG: After 200ms - api.tickPosition = ${api.tickPosition}`);
                        }, 200);
                    } else {
                        console.warn('⚠️ V97.19: No handler available for original mode');
                    }
                }
            }
        };

        container.addEventListener('dblclick', handleDoubleClick);

        return () => {
            container.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying]);

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
            if (
                e.button !== 0 ||
                (e.target as HTMLElement).closest('.maestro-loop-bubble') ||
                (e.target as HTMLElement).closest('.maestro-loop-handle')
            ) {
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat) {
                isDragging = true;
                startBeat = beat;
                endBeat = beat;

                const rawStart = getBarStartTick(beat);
                const rawEnd = getBarEndTick(beat);

                api.playbackRange = {
                    startTick: rawStart,
                    endTick: rawEnd,
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat !== endBeat) {
                endBeat = beat;

                const rawStart = getBarStartTick(startBeat);
                const rawEnd = getBarEndTick(endBeat);

                const loopStart = Math.min(rawStart, rawEnd);
                const loopEnd = Math.max(rawStart, rawEnd);

                api.playbackRange = {
                    startTick: loopStart,
                    endTick: loopEnd,
                };
            }
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            startBeat = null;
            endBeat = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        const handleDoubleClick = (e: MouseEvent) => {
            if (
                (e.target as HTMLElement).closest('.maestro-loop-bubble') ||
                (e.target as HTMLElement).closest('.maestro-loop-handle')
            ) {
                return;
            }
            if (api.playbackRange) {
                api.playbackRange = null;
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
        const startHandle = startHandleRef.current;
        const endHandle = endHandleRef.current;

        if (!api || !container || !isRendered || !isLooping || !isMobile) return;
        if (!startHandle || !endHandle) return;

        const setupTimer = setTimeout(() => {
            if (api && container && startHandle && endHandle) {
                touchCleanupRef.current = setupTouchSelection(
                    api,
                    container,
                    startHandle,
                    endHandle
                );
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

    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-700 font-medium">
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
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    zIndex: 10,
                }}
            />
        </div>
    );
};