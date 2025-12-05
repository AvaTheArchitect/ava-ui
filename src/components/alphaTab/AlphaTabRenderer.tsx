'use client';

/**
 * AlphaTab Renderer - Fixed for Layout Issues
 * Date for Records: November 29th, 2025
 * 
 * 🎯 KEY FIXES:
 * - Removed playerMode from init dependencies (prevents multiple canvas)
 * - Added layout recalculation after render for files with non-standard notation
 * - Dual-mode double-click play (synth vs original/YouTube)
 * - Proper audioSource prop support
 * - ✅ Layout stabilization for Extreme-Rise complex repeat jumps
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
    externalMediaHandler?: any; // Add this line
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
    externalMediaHandler, // Add this
    scrollContainerRef,
    isMobileLandscape = false,
    isLooping = false,
    onLoopRangeChange,
    audioSource = 'synth',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<AlphaTabApi | null>(null);

    // 🎯 Debug: Log when audioSource changes
    useEffect(() => {
        console.log(`🔊 AlphaTabRenderer received audioSource: ${audioSource}`);
    }, [audioSource]);

    const lastLoadedFileRef = useRef<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);

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

    // ========== INIT ALPHATAB (single instance - playerMode NOT in deps) ==========

    useEffect(() => {
        let destroyed = false;

        const initAndLoad = async () => {
            if (!containerRef.current) return;
            if (apiRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎵 Initializing AlphaTab...');

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
                console.log('✅ AlphaTab initialized');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 File loaded');
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                api.scoreLoaded.on((score: any) => {
                    console.log('📊 Score loaded');
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

                    // 🎯 CRITICAL FIX: SYNCHRONOUS LAYOUT STABILIZATION
                    // Fixes Extreme-Rise repeat seek failures & click offsets
                    if (api && !destroyed) {
                        api.updateSettings();
                        api.render();
                        console.log('✅ Layout recalculated SYNCHRONOUSLY for complex files');
                    }
                });

                api.renderFinished.on(() => {
                    console.log('🎨 Render finished');
                    setIsRendered(true);
                    setIsLoading(false);
                    onRenderFinished?.();
                });

                onApiReady?.(api);
            } catch (err) {
                console.error('❌ Init error:', err);
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
        // 🎯 playerMode intentionally NOT in dependencies
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile]);

    // ========== PLAYER MODE CHANGES (no re-init) ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        console.log(`🔄 Updating player mode to: ${playerMode}`);
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();
        console.log('✅ Player mode updated on existing AlphaTab instance');
    }, [playerMode]);
    // ========== ATTACH EXTERNAL HANDLER TO API OUTPUT ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        // Only attach handler when we have one
        if (externalMediaHandler) {
            const output = api.player.output as any;
            output.handler = externalMediaHandler;
            console.log('🔗 V94.5: External handler attached to API output');

            return () => {
                // Clean up handler on unmount or when handler changes
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                        console.log('🔌 V94.5: Handler detached');
                    }
                }
            };
        } else {
            // No handler provided, make sure none is attached
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V94.5: Handler cleared (none provided)');
            }
        }
    }, [externalMediaHandler]);
    // ========== LOAD NEW FILE INTO SAME INSTANCE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;

        if (lastLoadedFileRef.current === fileUrl) {
            console.log('⏭️ Same file, skipping reload');
            return;
        }

        const loadNewFile = async () => {
            try {
                console.log(`🔄 Loading new file: ${fileUrl}`);
                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
                console.log('✅ New file loaded');
            } catch (err) {
                console.error('❌ Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== ORIENTATION HANDLING ==========

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;
        if (!container) return;

        const updateOrientation = async () => {
            const alphaTab = await import('@coderline/alphatab');

            if (isMobileLandscape) {
                console.log('🎸 LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
            } else {
                console.log('📱 PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                const scrollElement = scrollContainerRef?.current || document.body;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffsetY = -200;
            }

            await api.updateSettings();
            window.dispatchEvent(new Event('resize'));
            await new Promise((r) => setTimeout(r, 50));
            api.render();
        };

        updateOrientation();
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef]);

    // ========== DYNAMIC USER INTERACTION (loop on/off) ==========

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

    // ========== LISTEN TO PLAYBACK RANGE CHANGES ==========

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

        if (!api || !container || !isRendered || isLooping) return;

        const handleClick = (e: MouseEvent) => {
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                api.tickPosition = beat.absolutePlaybackStart;
                console.log('🖱️ Single-click seek to', beat.absolutePlaybackStart);
            }
        };

        container.addEventListener('click', handleClick);

        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping]);


// ========== DOUBLE CLICK PLAY (loop off) - Dual Mode Support ==========

useEffect(() => {
    const api = apiRef.current;
    const container = containerRef.current;

    if (!api || !container || !isRendered || isLooping) return;

    const handleDoubleClick = (e: MouseEvent) => {
        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (beat && beat.absolutePlaybackStart !== undefined) {
            const tickPosition = beat.absolutePlaybackStart;

            // ALWAYS seek cursor first (works for BOTH modes)
            api.tickPosition = tickPosition;

            // Branch playback by mode - audioSource captured from dependencies
            console.log(`🖱️🖱️ Double-click in ${audioSource} mode`);

            if (audioSource === 'synth') {
                // Synth mode: use AlphaTab's built-in player
                if (api.play) api.play();
                console.log('🖱️🖱️ Synth: Double-click play from', tickPosition);
            } else {
                // Original mode: use external handler (YouTube)
                const output = api.player?.output as any;
                
                console.log('🔍 V94.5: Checking handler...', {
                    hasOutput: !!output,
                    hasHandler: !!output?.handler,
                    hasPlay: !!output?.handler?.play,
                    handler: output?.handler
                });
                
                if (output?.handler?.play) {
                    console.log('🎬 V94.5: Calling handler.play()');
                    output.handler.play();
                    console.log('🎬 Original: Double-click play via handler from', tickPosition);
                } else {
                    console.warn('⚠️ Original mode: No external handler available');
                    console.warn('⚠️ Output:', output);
                    console.warn('⚠️ Handler:', output?.handler);
                }
            }
        }
    };

    container.addEventListener('dblclick', handleDoubleClick);

    return () => {
        container.removeEventListener('dblclick', handleDoubleClick);
    };
}, [isRendered, isLooping, audioSource]); // 🎯 audioSource in dependencies fixes stale closure

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
