'use client';

/**
 * AlphaTab Renderer - Gemini Architecture (with Touch Selection & Dynamic File Loading)
 * November 21st, 2025
 * 
 * 🎯 RESPONSIBILITIES (Per Gemini's Plan):
 * 1. Initialize AlphaTab API (once on mount)
 * 2. Load new files when fileUrl changes (without reinitializing)
 * 3. Listen to playbackRangeChanged → notify page.tsx via callback
 * 4. Create/destroy loop handles based on isLooping prop
 * 5. Manage mouse/touch selection handlers based on isLooping prop
 * 6. Handle orientation changes
 * 
 * ✨ NEW IN THIS VERSION:
 * - Touch selection for mobile PWA (extracted from V61)
 * - Horizontal vs vertical swipe detection
 * - Double-tap to clear loop
 * - Prevents page scroll during touch drag
 * - Instant loop creation at cursor position when loop enabled (Songsterr behavior)
 * - Dynamic file loading without reinitializing AlphaTab instance
 * 
 * 🎸 SONGSTERR PARITY:
 * - Loop button ON → Instant loop at cursor position
 * - Handles control loop movement (push/pull highlight)
 * - Drag handles to reposition loop
 * - Highlight follows handles with slight lag
 * 
 * ❌ NOT RESPONSIBLE FOR:
 * - Managing isLooping state (page.tsx owns this)
 * - Deciding when to toggle loop (LoopControl.tsx handles this)
 * - Managing hasLoopSelection state (page.tsx owns this)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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

    // Loop control (passed from page.tsx)
    isLooping?: boolean;
    onLoopRangeChange?: (start: number | null, end: number | null) => void;
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

// ==================== TOUCH SELECTION (Extracted from V61) ====================

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

        // Detect vertical scroll vs horizontal selection
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
                        endTick: loopEnd
                    };

                    console.log('📱 Touch drag selection');
                }
            }
        }
    };

    const handleTouchEnd = (e: Event) => {
        const now = Date.now();
        document.body.style.overflow = '';

        const timeSinceLastTap = now - lastTapTime;
        const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 50;
        lastTapTime = now;

        // Double-tap to clear loop
        if (!touchMoved && Date.now() - touchStartTime < 400) {
            if (isDoubleTap) {
                if (api.playbackRange) {
                    api.playbackRange = null;
                    console.log('📱 Double-tap cleared loop');
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
                endTick: loopEnd
            };

            console.log('📱 Touch selection completed');
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

    console.log('✅ Touch selection attached');

    return () => {
        target.removeEventListener('touchstart', handleTouchStart as EventListener);
        target.removeEventListener('touchmove', handleTouchMove as EventListener);
        target.removeEventListener('touchend', handleTouchEnd as EventListener);
        target.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        document.body.style.overflow = '';
        console.log('🧹 Touch selection cleaned up');
    };
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
    isMobileLandscape = false,
    isLooping = false,
    onLoopRangeChange,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    // Loop handle refs
    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const mouseCleanupRef = useRef<(() => void) | null>(null);

    // Track if initial file has been loaded
    const initialFileLoadedRef = useRef(false);

    // Mobile detection
    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileKeywords.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
        return isMobileUA || (isTouchDevice && isSmallScreen);
    };

    const [isMobile] = useState(detectMobile);

    // Touch selection cleanup ref
    const touchCleanupRef = useRef<(() => void) | null>(null);

    // ==================== ALPHATAB INITIALIZATION ====================
    useEffect(() => {
        const initAndLoad = async () => {
            if (!containerRef.current) return;

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
                    enableUserInteraction: false, // We'll manage this
                    scrollContainer: scrollElement,
                });

                apiRef.current = api;
                console.log('✅ AlphaTab initialized');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 File loaded');

                // Mark initial file as loaded
                initialFileLoadedRef.current = true;

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
    }, [playerMode, soundFontPath, onApiReady, onScoreLoaded, onRenderFinished, onError, scrollContainerRef, isMobile]);
    // NOTE: fileUrl intentionally NOT in dependencies - handled separately below

    // ==================== LOAD NEW FILE WHEN URL CHANGES ====================
    useEffect(() => {
        const api = apiRef.current;

        // Skip if API not ready or initial file not yet loaded
        if (!api || !fileUrl || !initialFileLoadedRef.current) return;

        // Load new file into existing AlphaTab instance
        const loadNewFile = async () => {
            try {
                console.log(`🔄 Loading new file: ${fileUrl}`);
                await loadGuitarProFile(api, fileUrl);
                console.log('✅ New file loaded successfully');
            } catch (err) {
                console.error('❌ Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ==================== ORIENTATION HANDLING ====================
    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;

        const api = apiRef.current;
        const container = containerRef.current;
        if (!container) return;

        const updateOrientation = async () => {
            const alphaTab = await import('@coderline/alphatab');

            if (isMobileLandscape) {
                console.log('🎸 Switching to LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;
                (api.settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
            } else {
                console.log('📱 Switching to PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                const scrollElement = scrollContainerRef?.current || document.body;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffsetY = -200;
            }

            await api.updateSettings();
            window.dispatchEvent(new Event('resize'));
            await new Promise(resolve => setTimeout(resolve, 50));
            api.render();
        };

        updateOrientation();
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef]);

    // ==================== DYNAMIC USER INTERACTION CONTROL ====================
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        // Enable/disable AlphaTab's native user interaction based on loop state
        // When OFF: Disable to prevent native highlight
        // When ON: Enable to allow our custom drag selection
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();

        console.log(`🔄 api.settings.player.enableUserInteraction set to ${isLooping}`);
    }, [isLooping]);

    // ==================== INSTANT LOOP AT CURSOR (Songsterr behavior) ====================
    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) {
            return;
        }

        // When loop is turned ON, create a loop at current cursor position
        // This matches Songsterr's behavior
        if (!api.playbackRange && api.tickPosition !== undefined) {
            const currentTick = api.tickPosition;

            // Find the beat at current cursor position
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            const tickCache = (api as any).tickCache;

            if (tickCache) {
                const beatResult = tickCache.findBeat(trackIndices, currentTick);

                if (beatResult?.beat) {
                    const barStartTick = getBarStartTick(beatResult.beat);
                    const barEndTick = getBarEndTick(beatResult.beat);

                    // Create loop at cursor position
                    api.playbackRange = {
                        startTick: barStartTick,
                        endTick: barEndTick
                    };

                    console.log(`🎯 Loop auto-created at cursor: ${barStartTick} - ${barEndTick}`);
                }
            }
        }
    }, [isLooping, isRendered]);

    // ==================== CREATE LOOP HANDLES (when isLooping = true) ====================
    useEffect(() => {
        if (!containerRef.current || !isLooping) {
            // Hide handles when loop is off
            if (startHandleRef.current) startHandleRef.current.style.display = 'none';
            if (endHandleRef.current) endHandleRef.current.style.display = 'none';
            return;
        }

        const handles = createLoopHandles(containerRef.current);
        startHandleRef.current = handles.startHandle;
        endHandleRef.current = handles.endHandle;

        console.log('✅ Loop handles created');

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

    // ==================== ATTACH DRAG HANDLERS ====================
    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;
        const startHandle = startHandleRef.current;
        const endHandle = endHandleRef.current;

        if (!api || !container || !startHandle || !endHandle || !isLooping) {
            return;
        }

        dragCleanupRef.current = attachHandleDragHandlers(
            api,
            container,
            startHandle,
            endHandle,
            (startTick: number, endTick: number) => {
                // Notify page.tsx of range change
                onLoopRangeChange?.(startTick, endTick);
            }
        );

        console.log('✅ Drag handlers attached');

        return () => {
            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isLooping, onLoopRangeChange]);

    // ==================== LISTEN TO PLAYBACK RANGE CHANGES (Gemini Plan) ====================
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        const handleRangeChange = (e: any) => {
            const container = containerRef.current;
            const startHandle = startHandleRef.current;
            const endHandle = endHandleRef.current;

            if (e.playbackRange) {
                const { startTick, endTick } = e.playbackRange;

                // Notify page.tsx
                onLoopRangeChange?.(startTick, endTick);

                // Update handle positions if visible
                if (api && container && startHandle && endHandle && isLooping) {
                    updateHandlePositions(api, container, startHandle, endHandle, "rangeChanged");
                }

                console.log(`🔄 Loop range: ${startTick} - ${endTick}`);
            } else {
                // Range cleared
                onLoopRangeChange?.(null, null);

                // Hide handles
                if (startHandle) startHandle.style.display = 'none';
                if (endHandle) endHandle.style.display = 'none';

                console.log('🔄 Loop range cleared');
            }
        };

        // Gemini Plan: Listen to renderFinished to update handles
        const handleRenderFinished = () => {
            const container = containerRef.current;
            const startHandle = startHandleRef.current;
            const endHandle = endHandleRef.current;

            if (api.playbackRange && container && startHandle && endHandle && isLooping) {
                updateHandlePositions(api, container, startHandle, endHandle, "renderFinished");
            }
        };

        api.playbackRangeChanged.on(handleRangeChange);
        api.renderFinished.on(handleRenderFinished);

        return () => {
            api.playbackRangeChanged.off(handleRangeChange);
            api.renderFinished.off(handleRenderFinished);
        };
    }, [onLoopRangeChange, isLooping]);

    // ==================== SINGLE CLICK SEEK (when isLooping = false) ====================
    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) {
            return; // Only when loop is OFF
        }

        const handleClick = (e: MouseEvent) => {
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                api.tickPosition = beat.absolutePlaybackStart;
                console.log('🖱️ Single-click seek to tick', beat.absolutePlaybackStart);
            }
        };

        container.addEventListener('click', handleClick);
        console.log('✅ Single-click seek attached (loop OFF)');

        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping]);

    // ==================== DOUBLE CLICK PLAY (when isLooping = false) ====================
    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) {
            return; // Only when loop is OFF
        }

        const handleDoubleClick = (e: MouseEvent) => {
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                api.tickPosition = beat.absolutePlaybackStart;
                if (api.play) api.play();
                console.log('🖱️🖱️ Double-click play from tick', beat.absolutePlaybackStart);
            }
        };

        container.addEventListener('dblclick', handleDoubleClick);
        console.log('✅ Double-click play attached (loop OFF)');

        return () => {
            container.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered, isLooping]);

    // ==================== MOUSE DRAG SELECTION (when isLooping = true) ====================
    useEffect(() => {
        if (mouseCleanupRef.current) {
            mouseCleanupRef.current();
            mouseCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) {
            return;
        }

        let startBeat: any = null;
        let endBeat: any = null;
        let isDragging = false;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0 ||
                (e.target as HTMLElement).closest('.maestro-loop-bubble') ||
                (e.target as HTMLElement).closest('.maestro-loop-handle')) {
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
                    endTick: rawEnd
                };

                console.log('🖱️ Mouse drag started');

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
                    endTick: loopEnd
                };
            }
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            console.log('🖱️ Mouse drag completed');
            isDragging = false;
            startBeat = null;
            endBeat = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        const handleDoubleClick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.maestro-loop-bubble') ||
                (e.target as HTMLElement).closest('.maestro-loop-handle')) {
                return;
            }
            if (api.playbackRange) {
                api.playbackRange = null;
                console.log('🖱️ Double-click cleared loop');
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

    // ==================== TOUCH DRAG SELECTION (when isLooping = true) ====================
    useEffect(() => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;
        const startHandle = startHandleRef.current;
        const endHandle = endHandleRef.current;

        if (!api || !container || !isRendered || !isLooping || !isMobile) {
            return; // Only on mobile when loop is ON
        }

        if (!startHandle || !endHandle) {
            return;
        }

        // Delay setup to ensure handles are ready
        const setupTimer = setTimeout(() => {
            if (api && container && startHandle && endHandle) {
                touchCleanupRef.current = setupTouchSelection(
                    api,
                    container,
                    startHandle,
                    endHandle
                );
                console.log('✅ Touch selection setup complete');
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

    // ==================== LOOP PLAYBACK ENFORCEMENT ====================
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

                console.log(`🔁 Looped back to start (${startTick})`);
            }
        };

        api.playerPositionChanged.on(handlePlayerPositionChanged);

        return () => {
            api.playerPositionChanged.off(handlePlayerPositionChanged);
        };
    }, [isLooping]);

    // ==================== CLEAR LOOP WHEN DISABLED ====================
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        if (!isLooping && api.playbackRange) {
            api.playbackRange = null;
            console.log('🔄 Loop disabled - cleared playback range');
        }
    }, [isLooping]);

    // ==================== RENDER ====================
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
                    overflowX: 'auto',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    zIndex: 10,
                }}
            />
        </div>
    );
};