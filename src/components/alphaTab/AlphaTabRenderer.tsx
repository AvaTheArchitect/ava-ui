'use client';

/**
 * AlphaTab Renderer V38.12 - WORKING DRAG LOGIC RESTORED
 * 
 * CRITICAL FIX (V38.12):
 * ✅ Restored V13 REAL-TIME drag logic - updates range during handleMove, not after
 * ✅ Simplified beat detection - uses direct getBeatAtPosition (no measure priority)
 * ✅ Added getBarStartTick/getBarEndTick for accurate bar-level snapping
 * ✅ Handles now respond immediately to vertical/horizontal drags
 * ✅ Removed unused isLoopingEnabled parameters (fixed TypeScript errors)
 * 
 * PRESERVED FROM V38.11:
 * ✅ Handle styling: 26px bubbles, 50% D-string alignment
 * ✅ Timing buffers: -20 start, +160 end, -40 cursor lead-in
 * ✅ Handle positioning within bounds
 * 
 * WHY V13 WORKED:
 * - handleMove gets beat and updates range IMMEDIATELY (not deferred)
 * - Uses bar-level snapping (getBarStartTick/getBarEndTick)
 * - Simple, direct beat lookup at cursor position
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
    enableTouchSelection?: boolean;
    isLooping?: boolean;
}

// ==================== TIMING CONSTANTS ====================

const TICK_BUFFER_START = -20;   // Synth preparation buffer
const TICK_BUFFER_END = 160;      // Synth completion buffer
const CURSOR_LEAD_IN = -40;       // Cursor offset to sync with audio

const applyTimingBuffers = (startTick: number, endTick: number): { startTick: number; endTick: number } => {
    return {
        startTick: startTick + TICK_BUFFER_START,
        endTick: endTick + TICK_BUFFER_END
    };
};

const calculateCursorPosition = (rawTick: number): number => {
    return rawTick + CURSOR_LEAD_IN;
};

// ==================== HELPER FUNCTIONS (V13 STYLE) ====================

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

// 🔥 V13: Get bar start tick (first beat in measure)
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

// 🔥 V13: Get bar end tick (last beat in measure)
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

// ==================== HANDLE CREATION (V38.11 STYLE) ====================

const createLoopHandles = (container: HTMLElement): {
    startHandle: HTMLDivElement;
    endHandle: HTMLDivElement;
} => {
    const startHandle = document.createElement('div');
    startHandle.className = 'maestro-loop-handle maestro-loop-handle-start';
    startHandle.style.cssText = `
        position: absolute;
        width: 3px;
        background: rgba(147, 51, 234, 0.9) !important;
        border: none !important;
        border-radius: 0 !important;
        display: none;
        z-index: 1000;
        pointer-events: none;
        user-select: none !important;
        -webkit-user-select: none !important;
    `;

    const startBubble = document.createElement('div');
    startBubble.className = 'maestro-loop-bubble';
    startBubble.innerHTML = '&gt;';
    startBubble.style.cssText = `
        position: absolute;
        width: 14px;
        height: 26px;
        background: rgba(147, 51, 234, 0.95) !important;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 26px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        cursor: ew-resize;
        pointer-events: auto;
        touch-action: none;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        right: 1px;
        border-radius: 7px 0 0 7px !important;
    `;
    startHandle.appendChild(startBubble);

    const endHandle = document.createElement('div');
    endHandle.className = 'maestro-loop-handle maestro-loop-handle-end';
    endHandle.style.cssText = `
        position: absolute;
        width: 3px;
        background: rgba(147, 51, 234, 0.9) !important;
        border: none !important;
        border-radius: 0 !important;
        display: none;
        z-index: 1000;
        pointer-events: none;
        user-select: none !important;
        -webkit-user-select: none !important;
    `;

    const endBubble = document.createElement('div');
    endBubble.className = 'maestro-loop-bubble';
    endBubble.innerHTML = '&lt;';
    endBubble.style.cssText = `
        position: absolute;
        width: 14px;
        height: 26px;
        background: rgba(147, 51, 234, 0.95) !important;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 26px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        cursor: ew-resize;
        pointer-events: auto;
        touch-action: none;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        left: 1px;
        border-radius: 0 7px 7px 0 !important;
    `;
    endHandle.appendChild(endBubble);

    container.appendChild(startHandle);
    container.appendChild(endHandle);

    console.log('✅ V38.12 Handles: 26px bubbles, 50% D-string, V13 drag logic');
    return { startHandle, endHandle };
};

// ==================== HANDLE POSITIONING (V38.11 STYLE) ====================

const updateHandlePositions = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement,
    source: string = 'unknown'
) => {
    console.log(`📍 V38.12 updateHandlePositions from: ${source}`);

    if (!api.playbackRange || !api.renderer?.boundsLookup || !api.tracks) {
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
        return;
    }

    const { startTick, endTick } = api.playbackRange;
    const trackIndices = new Set(api.tracks.map((t: any) => t.index));

    try {
        if (!(api as any).tickCache) return;

        const startResult = (api as any).tickCache?.findBeat(trackIndices, startTick);
        const endResult = (api as any).tickCache?.findBeat(trackIndices, endTick);

        if (!startResult?.beat || !endResult?.beat) {
            startHandle.style.display = 'none';
            endHandle.style.display = 'none';
            return;
        }

        const startBounds = api.renderer.boundsLookup.findBeat(startResult.beat);
        const endBounds = api.renderer.boundsLookup.findBeat(endResult.beat);

        if (startBounds && endBounds) {
            const topExtension = 28;
            const dStringRatio = 0.50;

            // START Handle
            const startSelectionHeight = startBounds.realBounds.h;
            const startSelectionTop = startBounds.realBounds.y;
            const newStartHeight = startSelectionHeight + topExtension;
            const newStartTop = startSelectionTop - topExtension;

            startHandle.style.left = `${startBounds.realBounds.x - 1.5}px`;
            startHandle.style.top = `${newStartTop}px`;
            startHandle.style.height = `${newStartHeight}px`;
            startHandle.style.display = 'block';

            const startBubble = startHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
            if (startBubble) {
                const dStringOffset = startSelectionHeight * dStringRatio;
                const bubbleOffsetFromTop = startSelectionTop + dStringOffset - newStartTop;
                startBubble.style.top = `${bubbleOffsetFromTop}px`;
                startBubble.style.transform = 'translateY(-50%)';
            }

            // END Handle
            const endSelectionHeight = endBounds.realBounds.h;
            const endSelectionTop = endBounds.realBounds.y;
            const newEndHeight = endSelectionHeight + topExtension;
            const newEndTop = endSelectionTop - topExtension;

            endHandle.style.left = `${endBounds.realBounds.x + endBounds.realBounds.w - 1.5}px`;
            endHandle.style.top = `${newEndTop}px`;
            endHandle.style.height = `${newEndHeight}px`;
            endHandle.style.display = 'block';

            const endBubble = endHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
            if (endBubble) {
                const dStringOffset = endSelectionHeight * dStringRatio;
                const bubbleOffsetFromTop = endSelectionTop + dStringOffset - newEndTop;
                endBubble.style.top = `${bubbleOffsetFromTop}px`;
                endBubble.style.transform = 'translateY(-50%)';
            }

            if (source === 'resize' || source === 'renderFinished') {
                const currentRange = { startTick, endTick };
                setTimeout(() => {
                    if (api.playbackRange) {
                        api.playbackRange = null;
                        setTimeout(() => {
                            api.playbackRange = currentRange;
                        }, 10);
                    }
                }, 50);
            }
        }
    } catch (error) {
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
    }
};

// ==================== DRAG HANDLERS (V13 REAL-TIME LOGIC) ====================

const attachHandleDragHandlers = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    let isDragging = false;
    let dragTarget: 'start' | 'end' | null = null;

    const preventSelection = (e: Event) => {
        if (isDragging) {
            e.preventDefault();
            return false;
        }
    };

    const handleStart = (e: MouseEvent | TouchEvent, target: 'start' | 'end') => {
        console.log(`🎯 V38.12 ${target.toUpperCase()} DRAG START (real-time)`);

        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragTarget = target;

        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';

        const handle = target === 'start' ? startHandle : endHandle;
        const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;

        if (bubble) {
            bubble.style.pointerEvents = 'none';
            bubble.style.transform = 'translateY(-50%) scale(1.15)';
        }

        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('dragstart', preventSelection);
    };

    // 🔥 V13 LOGIC: Update range IN REAL-TIME during drag
    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragTarget || !api.playbackRange) return;

        e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // 🔥 Get beat at current position IMMEDIATELY
        const beat = getBeatAtPosition(api, container, clientX, clientY);
        if (!beat) return;

        if (dragTarget === 'start') {
            // Get raw bar start tick
            const rawStartTick = getBarStartTick(beat);
            
            // Apply timing buffer for synth
            const bufferedStart = rawStartTick + TICK_BUFFER_START;
            
            if (bufferedStart < api.playbackRange.endTick) {
                // Update range IMMEDIATELY
                api.playbackRange = {
                    startTick: bufferedStart,
                    endTick: api.playbackRange.endTick
                };
                
                // Update visual handles
                updateHandlePositions(api, container, startHandle, endHandle, 'drag-move-start');
                
                // Update cursor position with lead-in
                if (api.tickPosition !== undefined) {
                    api.tickPosition = calculateCursorPosition(rawStartTick);
                }
            }
        } else {
            // Get raw bar end tick
            const rawEndTick = getBarEndTick(beat);
            
            // Apply timing buffer for synth
            const bufferedEnd = rawEndTick + TICK_BUFFER_END;
            
            if (bufferedEnd > api.playbackRange.startTick) {
                // Update range IMMEDIATELY
                api.playbackRange = {
                    startTick: api.playbackRange.startTick,
                    endTick: bufferedEnd
                };
                
                // Update visual handles
                updateHandlePositions(api, container, startHandle, endHandle, 'drag-move-end');
            }
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;

        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);

        if (dragTarget) {
            const handle = dragTarget === 'start' ? startHandle : endHandle;
            const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;
            if (bubble) {
                bubble.style.pointerEvents = 'auto';
                bubble.style.transform = 'translateY(-50%)';
            }
        }

        console.log(`✅ V38.12 ${dragTarget?.toUpperCase()} drag completed`);
        isDragging = false;
        dragTarget = null;
    };

    const startBubble = startHandle.querySelector('.maestro-loop-bubble');
    const endBubble = endHandle.querySelector('.maestro-loop-bubble');

    if (startBubble) {
        startBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'start'), { capture: true });
        startBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'start'), { passive: false, capture: true });
    }

    if (endBubble) {
        endBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'end'), { capture: true });
        endBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'end'), { passive: false, capture: true });
    }

    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { capture: true });
    document.addEventListener('touchend', handleEnd, { capture: true });
    document.addEventListener('touchcancel', handleEnd, { capture: true });

    console.log('✅ V38.12 REAL-TIME drag handlers attached (V13 logic)');

    return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd, { capture: true });
        document.removeEventListener('touchend', handleEnd, { capture: true });
        document.removeEventListener('touchcancel', handleEnd, { capture: true });
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    };
};

// ==================== TOUCH/MOUSE SELECTION ====================

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
                    const rawStart = getBarStartTick(startBeat);
                    const rawEnd = getBarEndTick(endBeat);
                    
                    const loopStart = Math.min(rawStart, rawEnd);
                    const loopEnd = Math.max(rawStart, rawEnd);

                    const buffered = applyTimingBuffers(loopStart, loopEnd);

                    if (api.playbackRange !== undefined) {
                        api.playbackRange = buffered;
                        setTimeout(() => {
                            updateHandlePositions(api, container, startHandle, endHandle, 'touchMove');
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
            const rawStart = getBarStartTick(startBeat);
            const rawEnd = getBarEndTick(endBeat);
            
            const loopStart = Math.min(rawStart, rawEnd);
            const loopEnd = Math.max(rawStart, rawEnd);

            const buffered = applyTimingBuffers(loopStart, loopEnd);
            const cursorPos = calculateCursorPosition(loopStart);

            if (api.playbackRange !== undefined) {
                api.playbackRange = buffered;
            }

            if (api.tickPosition !== undefined) {
                api.tickPosition = cursorPos;
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

const setupMouseSelection = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('.maestro-loop-bubble')) {
            return;
        }

        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (beat) {
            isSelecting = true;
            startBeat = beat;
            endBeat = beat;

            const rawStart = getBarStartTick(beat);
            const rawEnd = getBarEndTick(beat);
            const buffered = applyTimingBuffers(rawStart, rawEnd);
            const cursorPos = calculateCursorPosition(rawStart);

            if (api.playbackRange !== undefined) {
                api.playbackRange = buffered;
                if (api.tickPosition !== undefined) {
                    api.tickPosition = cursorPos;
                }
                setTimeout(() => {
                    updateHandlePositions(api, container, startHandle, endHandle, 'mouseDown');
                }, 50);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isSelecting) return;
        e.preventDefault();

        const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
        if (beat && beat !== endBeat) {
            endBeat = beat;

            const rawStart = getBarStartTick(startBeat);
            const rawEnd = getBarEndTick(endBeat);
            
            const loopStart = Math.min(rawStart, rawEnd);
            const loopEnd = Math.max(rawStart, rawEnd);

            const buffered = applyTimingBuffers(loopStart, loopEnd);

            if (api.playbackRange !== undefined) {
                api.playbackRange = buffered;
                updateHandlePositions(api, container, startHandle, endHandle, 'mouseMove');
            }
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (!isSelecting) return;
        isSelecting = false;

        if (startBeat && endBeat) {
            const rawStart = getBarStartTick(startBeat);
            const rawEnd = getBarEndTick(endBeat);
            
            const loopStart = Math.min(rawStart, rawEnd);
            const loopEnd = Math.max(rawStart, rawEnd);

            const buffered = applyTimingBuffers(loopStart, loopEnd);
            const cursorPos = calculateCursorPosition(loopStart);

            if (api.playbackRange !== undefined) {
                api.playbackRange = buffered;
            }
            if (api.tickPosition !== undefined) {
                api.tickPosition = cursorPos;
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
    const mouseCleanupRef = useRef<(() => void) | null>(null);
    const touchCleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 🎸 🎸 Initializing AlphaTab V38.12 - WORKING DRAG LOGIC 🎸 🎸 🎸');
                console.log('🔥 V13 real-time drag + V38.11 styling + timing buffers');

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

                if (api.isLooping !== undefined) {
                    api.isLooping = true;
                }

                if (api.playerFinished) {
                    api.playerFinished.on(() => {
                        if (api.isLooping) {
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
    }, [fileUrl, playerMode, soundFontPath, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            apiRef.current.isLooping = isLooping;
            console.log(`🔄 V38.12 API isLooping: ${isLooping}`);
        }
    }, [isLooping]);

    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

        console.log('🎨 Creating V38.12 handles: 26px, 50% D-string, real-time drag');
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

    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !startHandleRef.current || !endHandleRef.current) {
            return;
        }

        const api = apiRef.current;
        const container = containerRef.current;
        const startHandle = startHandleRef.current;
        const endHandle = endHandleRef.current;

        container.style.userSelect = 'none';
        container.style.webkitUserSelect = 'none';

        updateHandlePositions(api, container, startHandle, endHandle, 'initial');

        dragCleanupRef.current = attachHandleDragHandlers(api, container, startHandle, endHandle);

        const rangeHandler = () => {
            if (containerRef.current && startHandleRef.current && endHandleRef.current) {
                updateHandlePositions(api, containerRef.current, startHandleRef.current, endHandleRef.current, 'rangeChanged');
            }
        };

        if ((api as any).playbackRangeChanged) {
            (api as any).playbackRangeChanged.on(rangeHandler);
        }

        let resizeTimer: NodeJS.Timeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                console.log('📐 V38.12 Container resized');
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    updateHandlePositions(apiRef.current, containerRef.current, startHandleRef.current, endHandleRef.current, 'resize');
                }
            }, 300);
        });

        resizeObserver.observe(container);

        const renderHandler = () => {
            console.log('🎨 V38.12 Render finished');
            setTimeout(() => {
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    updateHandlePositions(apiRef.current, containerRef.current, startHandleRef.current, endHandleRef.current, 'renderFinished');
                }
            }, 200);
        };

        if (api.renderFinished) {
            api.renderFinished.on(renderHandler);
        }

        return () => {
            clearTimeout(resizeTimer);
            resizeObserver.disconnect();

            if ((api as any).playbackRangeChanged) {
                (api as any).playbackRangeChanged.off(rangeHandler);
            }

            if (api.renderFinished) {
                api.renderFinished.off(renderHandler);
            }

            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isRendered]);

    useEffect(() => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }

        if (!enableTouchSelection || !apiRef.current || !containerRef.current || !isRendered) {
            return;
        }

        if (!startHandleRef.current || !endHandleRef.current) {
            return;
        }

        if (!isLooping) {
            console.log('🚫 V38.12 Touch OFF');
            return;
        }

        console.log('🎯 V38.12 Touch ON');

        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current && startHandleRef.current && endHandleRef.current) {
                const cleanup = setupTouchSelection(
                    apiRef.current,
                    containerRef.current,
                    startHandleRef.current,
                    endHandleRef.current
                );
                touchCleanupRef.current = cleanup;
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
            if (touchCleanupRef.current) {
                touchCleanupRef.current();
                touchCleanupRef.current = null;
            }
        };
    }, [isRendered, enableTouchSelection, isLooping]);

    useEffect(() => {
        if (mouseCleanupRef.current) {
            mouseCleanupRef.current();
            mouseCleanupRef.current = null;
        }

        if (!apiRef.current || !containerRef.current || !isRendered) {
            return;
        }

        if (!startHandleRef.current || !endHandleRef.current) {
            return;
        }

        if (!isLooping) {
            console.log('🚫 V38.12 Mouse OFF');
            return;
        }

        console.log('🖱️ V38.12 Mouse ON');

        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current && startHandleRef.current && endHandleRef.current) {
                const cleanup = setupMouseSelection(
                    apiRef.current,
                    containerRef.current,
                    startHandleRef.current,
                    endHandleRef.current
                );
                mouseCleanupRef.current = cleanup;
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
            if (mouseCleanupRef.current) {
                mouseCleanupRef.current();
                mouseCleanupRef.current = null;
            }
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