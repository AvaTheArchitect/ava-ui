'use client';

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
    enableTouchSelection?: boolean;
    isLooping?: boolean;
}

// ==================== SHARED HELPER FUNCTIONS ====================
// These are used by drag, touch, and mouse handlers - defined ONCE

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

// ==================== LOOP HANDLE CREATION ====================

const createLoopHandles = (container: HTMLElement): {
    startHandle: HTMLDivElement;
    endHandle: HTMLDivElement;
} => {
    // START HANDLE - Purple line (thicker, like Songsterr)
    const startHandle = document.createElement('div');
    startHandle.className = 'maestro-loop-handle maestro-loop-handle-start';
    startHandle.style.cssText = `
        position: absolute;
        width: 3px;
        background: rgba(147, 51, 234, 0.9) !important;
        border: none !important;
        display: none;
        z-index: 1000;
        pointer-events: none;
    `;

    // START BUBBLE - Tab shape poking LEFT (compact like Songsterr)
    const startBubble = document.createElement('div');
    startBubble.className = 'maestro-loop-bubble';
    startBubble.innerHTML = '&gt;';
    startBubble.style.cssText = `
        position: absolute;
        width: 12px;
        height: 24px;
        background: rgba(147, 51, 234, 0.95) !important;
        border-radius: 6px 0 0 6px;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 24px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        cursor: ew-resize;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        right: 1px;
    `;

    startHandle.appendChild(startBubble);

    // END HANDLE - Purple line (thicker, like Songsterr)
    const endHandle = document.createElement('div');
    endHandle.className = 'maestro-loop-handle maestro-loop-handle-end';
    endHandle.style.cssText = `
        position: absolute;
        width: 3px;
        background: rgba(147, 51, 234, 0.9) !important;
        border: none !important;
        display: none;
        z-index: 1000;
        pointer-events: none;
    `;

    // END BUBBLE - Tab shape poking RIGHT (compact like Songsterr)
    const endBubble = document.createElement('div');
    endBubble.className = 'maestro-loop-bubble';
    endBubble.innerHTML = '&lt;';
    endBubble.style.cssText = `
        position: absolute;
        width: 12px;
        height: 24px;
        background: rgba(147, 51, 234, 0.95) !important;
        border-radius: 0 6px 6px 0;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 24px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        cursor: ew-resize;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        left: 1px;
    `;

    endHandle.appendChild(endBubble);

    container.appendChild(startHandle);
    container.appendChild(endHandle);

    console.log('✅ Loop handles created');
    return { startHandle, endHandle };
};

// ==================== HANDLE POSITIONING ====================

// 🆕 V18: Reverted to 3px line (working), keeps 28px height extension, bubble centered
const updateHandlePositions = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    if (!api.playbackRange || !api.renderer?.boundsLookup || !api.tracks) {
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
        return;
    }

    const { startTick, endTick } = api.playbackRange;
    const trackIndices = new Set(api.tracks.map((t: any) => t.index));

    try {
        const startResult = (api as any).tickCache?.findBeat(trackIndices, startTick);
        const endResult = (api as any).tickCache?.findBeat(trackIndices, endTick);

        if (startResult?.beat && endResult?.beat) {
            const startBounds = api.renderer.boundsLookup.findBeat(startResult.beat);
            const endBounds = api.renderer.boundsLookup.findBeat(endResult.beat);

            if (startBounds && endBounds) {
                // ✅ Songsterr-style: Line extends far above (25-30px)
                const topExtension = 28; // Extend 28px above selection (almost to top of gray overlay)

                // --- START Handle ---
                const startSelectionHeight = startBounds.realBounds.h;
                const startSelectionTop = startBounds.realBounds.y;
                const startSelectionCenterY = startSelectionTop + (startSelectionHeight / 2);

                // Line extends above, stops at bottom of selection
                const newStartHeight = startSelectionHeight + topExtension;
                const newStartTop = startSelectionTop - topExtension;

                startHandle.style.left = `${startBounds.realBounds.x - 1.5}px`; // Center 3px line
                startHandle.style.top = `${newStartTop}px`;
                startHandle.style.height = `${newStartHeight}px`;
                startHandle.style.display = 'block';

                // Position bubble at CENTER of SELECTION (not center of handle)
                const startBubble = startHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
                if (startBubble) {
                    const bubbleOffsetFromTop = startSelectionCenterY - newStartTop;
                    startBubble.style.top = `${bubbleOffsetFromTop}px`;
                    startBubble.style.transform = 'translateY(-50%)';
                }

                // --- END Handle ---
                const endSelectionHeight = endBounds.realBounds.h;
                const endSelectionTop = endBounds.realBounds.y;
                const endSelectionCenterY = endSelectionTop + (endSelectionHeight / 2);

                // Line extends above, stops at bottom of selection
                const newEndHeight = endSelectionHeight + topExtension;
                const newEndTop = endSelectionTop - topExtension;

                endHandle.style.left = `${endBounds.realBounds.x + endBounds.realBounds.w - 1.5}px`; // Center 3px line
                endHandle.style.top = `${newEndTop}px`;
                endHandle.style.height = `${newEndHeight}px`;
                endHandle.style.display = 'block';

                // Position bubble at CENTER of SELECTION (not center of handle)
                const endBubble = endHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
                if (endBubble) {
                    const bubbleOffsetFromTop = endSelectionCenterY - newEndTop;
                    endBubble.style.top = `${bubbleOffsetFromTop}px`;
                    endBubble.style.transform = 'translateY(-50%)';
                }

                console.log(`🎯 V18 Handles: 3px line, extends ${topExtension}px above, bubble centered on selection`);
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not position handles:', error);
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
    }
};

// ==================== DRAG HANDLERS ====================

const attachHandleDragHandlers = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    let isDragging = false;
    let dragTarget: 'start' | 'end' | null = null;

    const handleStart = (e: MouseEvent | TouchEvent, target: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragTarget = target;
        document.body.style.overflow = 'hidden';

        const handle = target === 'start' ? startHandle : endHandle;
        const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;
        if (bubble) {
            bubble.style.transform = 'translateY(-50%) scale(1.15)';
        }

        console.log(`🎯 ${target.toUpperCase()} handle drag started`);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragTarget || !api.playbackRange) return;

        e.preventDefault();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const beat = getBeatAtPosition(api, container, clientX, clientY);
        if (!beat) return;

        if (dragTarget === 'start') {
            const newStartTick = getBarStartTick(beat);
            if (newStartTick < api.playbackRange.endTick) {
                api.playbackRange = {
                    startTick: newStartTick,
                    endTick: api.playbackRange.endTick
                };
                updateHandlePositions(api, container, startHandle, endHandle);
            }
        } else {
            const newEndTick = getBarEndTick(beat);
            if (newEndTick > api.playbackRange.startTick) {
                api.playbackRange = {
                    startTick: api.playbackRange.startTick,
                    endTick: newEndTick
                };
                updateHandlePositions(api, container, startHandle, endHandle);
            }
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;

        document.body.style.overflow = '';

        if (dragTarget) {
            const handle = dragTarget === 'start' ? startHandle : endHandle;
            const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;
            if (bubble) {
                bubble.style.transform = 'translateY(-50%)';
            }
        }

        isDragging = false;
        dragTarget = null;
        console.log('✅ Handle drag completed');
    };

    const startBubble = startHandle.querySelector('.maestro-loop-bubble');
    const endBubble = endHandle.querySelector('.maestro-loop-bubble');

    if (startBubble) {
        startBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'start'));
        startBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'start'), { passive: false });
    }

    if (endBubble) {
        endBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'end'));
        endBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'end'), { passive: false });
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    console.log('✅ Drag handlers attached');

    return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
    };
};

// ==================== TOUCH SELECTION ====================

const setupTouchSelection = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
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
                    const startTick = getBarStartTick(startBeat);
                    const endTick = getBarEndTick(endBeat);

                    const loopStart = Math.min(startTick, endTick);
                    const loopEnd = Math.max(startTick, endTick);

                    if (api.playbackRange !== undefined) {
                        api.playbackRange = {
                            startTick: loopStart,
                            endTick: loopEnd
                        };

                        setTimeout(() => {
                            updateHandlePositions(api, container, startHandle, endHandle);
                        }, 50);
                    }
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

        if (!touchMoved && Date.now() - touchStartTime < 400) {
            if (isDoubleTap) {
                if (api.playbackRange !== undefined) {
                    api.playbackRange = null;
                    if (api.tickPosition !== undefined) {
                        api.tickPosition = 0;
                    }
                }
            }
        }

        if (isSelecting && startBeat && endBeat) {
            const startTick = getBarStartTick(startBeat);
            const endTick = getBarEndTick(endBeat);

            const loopStart = Math.min(startTick, endTick);
            const loopEnd = Math.max(startTick, endTick);

            if (api.playbackRange !== undefined) {
                api.playbackRange = {
                    startTick: loopStart,
                    endTick: loopEnd
                };
            }

            if (api.tickPosition !== undefined) {
                api.tickPosition = loopStart;
            }
        }

        isSelecting = false;
        startBeat = null;
        endBeat = null;
        touchMoved = false;
    };

    const surface = container.querySelector('.at-surface');
    const target = surface || container;

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

// ==================== MOUSE SELECTION ====================

const setupMouseSelection = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;
    let mouseMoved = false;

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('.maestro-loop-bubble')) {
            return;
        }

        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (beat) {
            isSelecting = true;
            mouseMoved = false;
            startBeat = beat;
            endBeat = beat;

            const startTick = getBarStartTick(beat);
            const endTick = getBarEndTick(beat);
            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick, endTick };
                setTimeout(() => {
                    updateHandlePositions(api, container, startHandle, endHandle);
                }, 50);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        e.preventDefault();
        mouseMoved = true;

        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (beat && beat !== endBeat) {
            endBeat = beat;

            const startTick = getBarStartTick(startBeat);
            const endTick = getBarEndTick(endBeat);

            const loopStart = Math.min(startTick, endTick);
            const loopEnd = Math.max(startTick, endTick);

            if (api.playbackRange !== undefined) {
                api.playbackRange = {
                    startTick: loopStart,
                    endTick: loopEnd
                };
                updateHandlePositions(api, container, startHandle, endHandle);
            }
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (!isSelecting) return;
        isSelecting = false;

        if (startBeat && endBeat) {
            const startTick = getBarStartTick(startBeat);
            const endTick = getBarEndTick(endBeat);
            const loopStart = Math.min(startTick, endTick);
            const loopEnd = Math.max(startTick, endTick);

            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick: loopStart, endTick: loopEnd };
            }
            if (api.tickPosition !== undefined) {
                api.tickPosition = loopStart;
            }
        }

        startBeat = null;
        endBeat = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleDoubleClick = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest('.maestro-loop-bubble')) {
            return;
        }
        if (api.playbackRange !== undefined) {
            api.playbackRange = null;
            if (api.tickPosition !== undefined) {
                api.tickPosition = 0;
            }
        }
    };

    const surface = container.querySelector('.at-surface');
    const target = surface || container;

    target.addEventListener('mousedown', handleMouseDown as EventListener);
    target.addEventListener('dblclick', handleDoubleClick as EventListener);

    console.log('✅ Mouse selection enabled');

    return () => {
        target.removeEventListener('mousedown', handleMouseDown as EventListener);
        target.removeEventListener('dblclick', handleDoubleClick as EventListener);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
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
    enableTouchSelection = true,
    isLooping = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);

    // Initialize AlphaTab
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 Initializing AlphaTab...');

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode: 'page',
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined
                });

                if (!isMounted) {
                    api.destroy();
                    return;
                }

                apiRef.current = api;

                if (api.playerFinished) {
                    api.playerFinished.on(() => {
                        if (isLooping && api.isLooping) {
                            setTimeout(() => {
                                if (isMounted && api) {
                                    api.play();
                                }
                            }, 100);
                        }
                    });
                }

                api.scoreLoaded.on((score: any) => {
                    if (!isMounted) return;

                    const songInfo: SongInfo = {
                        title: score.title || 'Unknown',
                        artist: score.artist || 'Unknown Artist',
                        album: score.album || '',
                        tempo: score.tempo || 120
                    };

                    const trackList: Track[] = score.tracks.map((track: any, idx: number) => ({
                        index: idx,
                        name: track.name || `Track ${idx + 1}`,
                        color: track.color
                    }));

                    onScoreLoaded?.(songInfo, trackList);
                    setIsLoading(false);
                });

                if (playerMode === 'synthesizer') {
                    if (api.playerReady) {
                        api.playerReady.on(() => {
                            if (!isMounted) return;
                            console.log('✅ Player ready');
                        });
                    }
                }

                api.renderFinished.on(() => {
                    if (!isMounted) return;
                    setIsRendered(true);
                    onRenderFinished?.();
                });

                api.error.on((e: any) => {
                    if (!isMounted) return;
                    const errorMsg = e.message || 'Failed to load tab file';
                    onError?.(errorMsg);
                    setIsLoading(false);
                });

                onApiReady?.(api);
                await loadGuitarProFile(api, fileUrl);

            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
                onError?.(errorMsg);
                setIsLoading(false);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            if (apiRef.current) {
                try {
                    apiRef.current.destroy();
                } catch (e) {
                    console.warn('Cleanup warning:', e);
                }
            }
        };
    }, [fileUrl, playerMode, soundFontPath, isLooping, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // Sync isLooping prop to API
    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            apiRef.current.isLooping = isLooping;
        }
    }, [isLooping]);

    // Create loop handles
    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

        console.log('🎨 Creating loop handles...');
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
    }, [isRendered]);

    // Setup handle drag handlers
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !startHandleRef.current || !endHandleRef.current) {
            return;
        }

        const api = apiRef.current;

        updateHandlePositions(api, containerRef.current, startHandleRef.current, endHandleRef.current);

        dragCleanupRef.current = attachHandleDragHandlers(
            api,
            containerRef.current,
            startHandleRef.current,
            endHandleRef.current
        );

        const handler = () => {
            if (containerRef.current && startHandleRef.current && endHandleRef.current) {
                updateHandlePositions(api, containerRef.current, startHandleRef.current, endHandleRef.current);
            }
        };

        if ((api as any).playbackRangeChanged) {
            (api as any).playbackRangeChanged.on(handler);
        }

        return () => {
            if ((api as any).playbackRangeChanged) {
                (api as any).playbackRangeChanged.off(handler);
            }
            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isRendered]);

    // Setup touch selection
    useEffect(() => {
        if (!enableTouchSelection || !apiRef.current || !containerRef.current || !isRendered || !isLooping) {
            return;
        }

        if (!startHandleRef.current || !endHandleRef.current) {
            return;
        }

        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current && startHandleRef.current && endHandleRef.current) {
                console.log('🎯 Setting up touch selection...');
                const cleanup = setupTouchSelection(
                    apiRef.current,
                    containerRef.current,
                    startHandleRef.current,
                    endHandleRef.current
                );
                return () => {
                    cleanup();
                };
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
        };
    }, [isRendered, enableTouchSelection, isLooping]);

    // Setup mouse selection
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered || !isLooping) {
            return;
        }

        if (!startHandleRef.current || !endHandleRef.current) {
            return;
        }

        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current && startHandleRef.current && endHandleRef.current) {
                console.log('🎯 Setting up mouse selection...');
                const cleanup = setupMouseSelection(
                    apiRef.current,
                    containerRef.current,
                    startHandleRef.current,
                    endHandleRef.current
                );
                return () => {
                    cleanup();
                };
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
        };
    }, [isRendered, isLooping]);

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
                className={className}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    backgroundColor: '#ffffff'
                }}
            />
        </div>
    );
};