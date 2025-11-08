'use client';

/**
 * AlphaTab Renderer V61 - CURSOR ANCHOR FIX
 * 
 * FIXES:
 * ✅ Proper scrollAnchor for landscape mode (fixed cursor at 15%)
 * ✅ BoundsLookup safety check to prevent null errors
 * ✅ Simplified orientation handling
 * ✅ Container-based scrolling for all modes
 * ✅ Auto-scroll working in both orientations
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

const TICK_BUFFER_START = -20;
const TICK_BUFFER_END = 160;
const CURSOR_LEAD_IN = -20;

const applyTimingBuffers = (startTick: number, endTick: number): { startTick: number; endTick: number } => {
    return {
        startTick: startTick + TICK_BUFFER_START,
        endTick: endTick + TICK_BUFFER_END
    };
};

const calculateCursorPosition = (rawTick: number): number => {
    return rawTick + CURSOR_LEAD_IN;
};

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

// ==================== HANDLE CREATION ====================

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
        cursor: ew-resize;
        pointer-events: auto;
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

    startBubble.addEventListener('mousedown', (e) => e.preventDefault(), { capture: true });
    startBubble.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false, capture: true });
    startBubble.addEventListener('click', (e) => e.preventDefault(), { capture: true });

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
        cursor: ew-resize;
        pointer-events: auto;
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

    endBubble.addEventListener('mousedown', (e) => e.preventDefault(), { capture: true });
    endBubble.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false, capture: true });
    endBubble.addEventListener('click', (e) => e.preventDefault(), { capture: true });

    endHandle.appendChild(endBubble);

    container.appendChild(startHandle);
    container.appendChild(endHandle);

    console.log('✅ V61: Loop handles created');
    return { startHandle, endHandle };
};

// ==================== HANDLE POSITIONING ====================

const updateHandlePositions = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement,
    source: string = 'unknown'
) => {
    // ✅ V61: Safety check for boundsLookup
    if (!api.playbackRange || !api.renderer?.boundsLookup || !api.tracks) {
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
        return;
    }

    if (!api.renderer.boundsLookup.staffSystems ||
        api.renderer.boundsLookup.staffSystems.length === 0) {
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

        if (!startBounds?.realBounds || !endBounds?.realBounds) {
            startHandle.style.display = 'none';
            endHandle.style.display = 'none';
            return;
        }

        const HANDLE_INSET = 5;

        let startHandleTop: number;
        let startHandleHeight: number;

        if (startBounds?.barBounds?.masterBarBounds?.visualBounds) {
            const masterBounds = startBounds.barBounds.masterBarBounds.visualBounds;
            startHandleTop = masterBounds.y + HANDLE_INSET;
            startHandleHeight = masterBounds.h - (HANDLE_INSET * 2);
        } else if (startBounds?.barBounds?.visualBounds) {
            const barBounds = startBounds.barBounds.visualBounds;
            startHandleTop = barBounds.y + HANDLE_INSET;
            startHandleHeight = barBounds.h - (HANDLE_INSET * 2);
        } else {
            const staffBounds = startBounds.realBounds;
            const extraPadding = 20;
            startHandleTop = staffBounds.y - extraPadding + HANDLE_INSET;
            startHandleHeight = staffBounds.h + (extraPadding * 2) - (HANDLE_INSET * 2);
        }

        startHandle.style.left = `${startBounds.realBounds.x - 1.5}px`;
        startHandle.style.top = `${startHandleTop}px`;
        startHandle.style.height = `${startHandleHeight}px`;
        startHandle.style.display = 'block';

        const startBubble = startHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
        if (startBubble) {
            const staffBounds = startBounds.realBounds;
            const dStringOffset = staffBounds.h * 0.50;
            const bubbleAbsoluteY = staffBounds.y + dStringOffset;
            const bubbleRelativeY = bubbleAbsoluteY - startHandleTop;

            startBubble.style.top = `${bubbleRelativeY}px`;
            startBubble.style.transform = 'translateY(-50%)';
        }

        let endHandleTop: number;
        let endHandleHeight: number;

        if (endBounds?.barBounds?.masterBarBounds?.visualBounds) {
            const masterBounds = endBounds.barBounds.masterBarBounds.visualBounds;
            endHandleTop = masterBounds.y + HANDLE_INSET;
            endHandleHeight = masterBounds.h - (HANDLE_INSET * 2);
        } else if (endBounds?.barBounds?.visualBounds) {
            const barBounds = endBounds.barBounds.visualBounds;
            endHandleTop = barBounds.y + HANDLE_INSET;
            endHandleHeight = barBounds.h - (HANDLE_INSET * 2);
        } else {
            const staffBounds = endBounds.realBounds;
            const extraPadding = 20;
            endHandleTop = staffBounds.y - extraPadding + HANDLE_INSET;
            endHandleHeight = staffBounds.h + (extraPadding * 2) - (HANDLE_INSET * 2);
        }

        endHandle.style.left = `${endBounds.realBounds.x + endBounds.realBounds.w - 1.5}px`;
        endHandle.style.top = `${endHandleTop}px`;
        endHandle.style.height = `${endHandleHeight}px`;
        endHandle.style.display = 'block';

        const endBubble = endHandle.querySelector('.maestro-loop-bubble') as HTMLElement;
        if (endBubble) {
            const staffBounds = endBounds.realBounds;
            const dStringOffset = staffBounds.h * 0.50;
            const bubbleAbsoluteY = staffBounds.y + dStringOffset;
            const bubbleRelativeY = bubbleAbsoluteY - endHandleTop;

            endBubble.style.top = `${bubbleRelativeY}px`;
            endBubble.style.transform = 'translateY(-50%)';
        }

    } catch (error) {
        console.error('❌ Handle positioning error:', error);
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
    let scrollY = 0;

    const preventSelection = (e: Event) => {
        if (isDragging) {
            e.preventDefault();
            return false;
        }
    };

    const handleStart = (e: MouseEvent | TouchEvent, target: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragTarget = target;

        scrollY = window.scrollY;

        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';

        const handle = target === 'start' ? startHandle : endHandle;
        const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;

        if (bubble) {
            bubble.style.pointerEvents = 'none';
            bubble.style.transform = 'translateY(-50%) scale(1.15)';
        }

        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('dragstart', preventSelection);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragTarget || !api.playbackRange) return;

        e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const beat = getBeatAtPosition(api, container, clientX, clientY);
        if (!beat) return;

        if (dragTarget === 'start') {
            const rawStartTick = getBarStartTick(beat);
            const bufferedStart = rawStartTick + TICK_BUFFER_START;

            if (bufferedStart < api.playbackRange.endTick) {
                api.playbackRange = {
                    startTick: bufferedStart,
                    endTick: api.playbackRange.endTick
                };

                updateHandlePositions(api, container, startHandle, endHandle, 'drag-move-start');

                if (api.tickPosition !== undefined) {
                    api.tickPosition = calculateCursorPosition(rawStartTick);
                }
            }
        } else {
            const rawEndTick = getBarEndTick(beat);
            const bufferedEnd = rawEndTick + TICK_BUFFER_END;

            if (bufferedEnd > api.playbackRange.startTick) {
                api.playbackRange = {
                    startTick: api.playbackRange.startTick,
                    endTick: bufferedEnd
                };

                updateHandlePositions(api, container, startHandle, endHandle, 'drag-move-end');
            }
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;

        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        window.scrollTo(0, scrollY);

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

        isDragging = false;
        dragTarget = null;
    };

    const startBubble = startHandle.querySelector('.maestro-loop-bubble');
    const endBubble = endHandle.querySelector('.maestro-loop-bubble');

    if (startBubble) {
        startBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'start'), { capture: true });
        startBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'start'), { passive: false, capture: true });
    }

    startHandle.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'start'), { capture: true });
    startHandle.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'start'), { passive: false, capture: true });

    if (endBubble) {
        endBubble.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'end'), { capture: true });
        endBubble.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'end'), { passive: false, capture: true });
    }

    endHandle.addEventListener('mousedown', (e) => handleStart(e as MouseEvent, 'end'), { capture: true });
    endHandle.addEventListener('touchstart', (e) => handleStart(e as TouchEvent, 'end'), { passive: false, capture: true });

    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
        document.removeEventListener('touchcancel', handleEnd);
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
    };
};

// ==================== TOUCH & MOUSE SELECTION (same as before) ====================
// (Keeping your existing implementations - they're working fine)

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
        if (e.button !== 0 ||
            (e.target as HTMLElement).closest('.maestro-loop-bubble') ||
            (e.target as HTMLElement).closest('.maestro-loop-handle')) {
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
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const mouseCleanupRef = useRef<(() => void) | null>(null);
    const touchCleanupRef = useRef<(() => void) | null>(null);

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

    // Initialize AlphaTab (ONCE)
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 V61: Initializing AlphaTab');

                // Detect initial orientation
                const isLandscape = isMobile && window.innerWidth > window.innerHeight;
                const layoutMode = isLandscape ? 'horizontal' : 'page';

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode,
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile
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

                    console.log(`✅ V61: Score loaded - ${songInfo.title}`);
                    onScoreLoaded?.(songInfo, trackList);
                    setIsLoading(false);
                    setScoreIsLoaded(true); // ✅ Signal that score is ready
                });

                if (playerMode === 'synthesizer') {
                    if (api.playerReady) {
                        api.playerReady.on(() => {
                            if (!isMounted) return;
                            console.log('✅ V61: Player ready');
                        });
                    }
                }

                // ✅ V61: Wait for boundsLookup before marking as rendered
                api.renderFinished.on(() => {
                    if (!isMounted) return;

                    // Safety check for boundsLookup
                    if (api.renderer?.boundsLookup) {
                        console.log('✅ V61: Render finished - boundsLookup ready');
                        setIsRendered(true);
                        onRenderFinished?.();
                    } else {
                        console.warn('⚠️ V61: Render finished but boundsLookup not ready');
                    }
                });

                api.error.on((e: any) => {
                    if (!isMounted) return;
                    const errorMsg = e.message || 'Failed to load tab file';
                    console.error('❌ V61: AlphaTab error:', errorMsg);
                    onError?.(errorMsg);
                    setIsLoading(false);
                });

                onApiReady?.(api);
                await loadGuitarProFile(api, fileUrl);

            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
                console.error('❌ V61: Init error:', errorMsg);
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
                    console.log('🧹 V61: AlphaTab destroyed');
                } catch (e) {
                    console.warn('Cleanup warning:', e);
                }
            }
        };
    }, [fileUrl, playerMode, soundFontPath, isMobile, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // Handle orientation changes (layout switching only)
    useEffect(() => {
        if (!apiRef.current || !isRendered || !containerRef.current || !isMobile) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            const isLandscape = window.innerWidth > window.innerHeight;
            console.log(`🔄 V61.3: Orientation changed to ${isLandscape ? 'LANDSCAPE' : 'PORTRAIT'}`);
            let horizontalOffset = 0; // Initialize outside of the if/else block
            const alphaTab = await import('@coderline/alphatab');

            // Set Layout and Scroll Settings based on Orientation
            if (isLandscape) {
                // 🎸 LANDSCAPE: Horizontal layout + Container Scroll
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                // ✅ Scroll element is the container (CORRECT)
                api.settings.player.scrollElement = container;

                // ✅ Horizontal offset: Anchor cursor at 15% (CORRECT PROPERTY NAME)
                // Calculate and set the correct property
                horizontalOffset = container.clientWidth * 0.15; // Assigned here
                (api.settings.player as any).scrollOffsetX = horizontalOffset;

                // ✅ CRITICAL CLEANUP: Reset vertical offset
                (api.settings.player as any).scrollOffsetY = 0;

                console.log(`🎸 V63: Horizontal layout, scrollElement=container, scrollOffsetX=${horizontalOffset}px (15%)`);

            } else {
                // 📱 PORTRAIT: Page layout + Document Body Scroll
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                // ✅ Scroll element is the document body
                // Note: We are using document.body here, as corrected earlier
                api.settings.player.scrollElement = document.documentElement;

                // ✅ Vertical offset: Anchor cursor in the 2nd row (100px)
                (api.settings.player as any).scrollOffset = 100;

                console.log('📱 V61.3: Page layout, scrollElement=document.body, offset=100px');
            }

            // Apply settings and re-render
            api.updateSettings();
            api.render();
        };

        // Apply initial orientation
        handleOrientationChange();

        const mediaQuery = window.matchMedia('(orientation: landscape)');
        mediaQuery.addEventListener('change', handleOrientationChange);

        return () => {
            mediaQuery.removeEventListener('change', handleOrientationChange);
        };
    }, [isRendered, isMobile]);


    // Loop control - V63 FIX: Clear selection when disabled
    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            apiRef.current.isLooping = isLooping;

            // Always ensure user interaction is enabled
            (apiRef.current.settings.player as any).enableUserInteraction = true;
            apiRef.current.updateSettings();

            // 🆕 ADD THIS: Clear selection when loop is turned off
            if (!isLooping && apiRef.current.playbackRange !== undefined) {
                apiRef.current.playbackRange = null;
                console.log('🔄 V63: Loop disabled - cleared selection');
            }

            console.log(`🔄 V63: Loop=${isLooping}, UserInteraction=enabled`);
        }
    }, [isLooping]);

    // Create loop handles
    useEffect(() => {
        if (!containerRef.current || !isRendered) return;
        if (!scoreIsLoaded) return;

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
    }, [isRendered, scoreIsLoaded]);

    // Handle positioning and drag handlers
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

        let pendingResizeUpdate = false;
        let resizeTimer: NodeJS.Timeout;

        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            pendingResizeUpdate = true;

            resizeTimer = setTimeout(() => {
                console.log('📐 V61: Container resized');
            }, 150);
        });

        resizeObserver.observe(container);

        const renderHandler = () => {
            setTimeout(() => {
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    updateHandlePositions(
                        apiRef.current,
                        containerRef.current,
                        startHandleRef.current,
                        endHandleRef.current,
                        'renderFinished'
                    );
                    pendingResizeUpdate = false;
                }
            }, 100);
        };

        if (api.renderFinished) {
            api.renderFinished.on(renderHandler);
        }

        const postRenderHandler = () => {
            setTimeout(() => {
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    if (apiRef.current.playbackRange) {
                        if (pendingResizeUpdate) {
                            const currentRange = apiRef.current.playbackRange;
                            apiRef.current.playbackRange = null;

                            setTimeout(() => {
                                if (apiRef.current) {
                                    apiRef.current.playbackRange = currentRange;
                                }
                            }, 10);
                        }

                        updateHandlePositions(
                            apiRef.current,
                            containerRef.current,
                            startHandleRef.current,
                            endHandleRef.current,
                            'postRenderFinished'
                        );
                        pendingResizeUpdate = false;
                    }
                }
            }, 50);
        };

        if (api.postRenderFinished) {
            api.postRenderFinished.on(postRenderHandler);
        }

        const rangeHandler = () => {
            if (containerRef.current && startHandleRef.current && endHandleRef.current) {
                updateHandlePositions(api, containerRef.current, startHandleRef.current, endHandleRef.current, 'rangeChanged');
            }
        };

        if ((api as any).playbackRangeChanged) {
            (api as any).playbackRangeChanged.on(rangeHandler);
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

            if (api.postRenderFinished) {
                api.postRenderFinished.off(postRenderHandler);
            }

            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isRendered]);

    // Touch selection
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
            return;
        }

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

                // ✅ CRITICAL FIX: Re-enable user interaction after touch cleanup
                if (apiRef.current) {
                    (apiRef.current.settings.player as any).enableUserInteraction = true;
                    apiRef.current.updateSettings();
                    console.log('🔄 V63: Touch cleanup - enableUserInteraction restored');
                }

                touchCleanupRef.current = null;
            }
        };
    }, [isRendered, enableTouchSelection, isLooping]);

    // Mouse selection
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
            return;
        }

        if (!scoreIsLoaded) return; // Wait for score to be ready

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

                if (apiRef.current) {
                    (apiRef.current.settings.player as any).enableUserInteraction = true;
                    apiRef.current.updateSettings();
                    console.log('🔄 V63: Mouse cleanup - enableUserInteraction restored');
                }

                mouseCleanupRef.current = null;
            }
        };
    }, [isRendered, isLooping, scoreIsLoaded]);

    // ==================== DOUBLE-CLICK TO PLAY ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) return;
        if (playerMode === 'disabled') return;
        if (!scoreIsLoaded) return; // 🆕 ADD THIS LINE

        const api = apiRef.current;
        const container = containerRef.current;

        const handleDoubleClick = (e: MouseEvent) => {
            // Ignore double-clicks on loop handles
            if ((e.target as HTMLElement).closest('.maestro-loop-handle') ||
                (e.target as HTMLElement).closest('.maestro-loop-bubble')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);

            if (beat && beat.absolutePlaybackStart !== undefined) {
                console.log('🎵 V63: Double-click at tick:', beat.absolutePlaybackStart);

                // Set cursor position
                if (api.tickPosition !== undefined) {
                    api.tickPosition = beat.absolutePlaybackStart;
                }

                // Start playback after brief delay
                setTimeout(() => {
                    try {
                        if (api.play) {
                            api.play();
                        } else if ((api as any).playPause) {
                            (api as any).playPause();
                        }
                        console.log('✅ V63: Playback started from double-click');
                    } catch (err) {
                        console.error('❌ V63: Failed to start playback:', err);
                    }
                }, 50);
            }
        };

        const surface = container.querySelector('.at-surface');
        const target = (surface as HTMLElement) || container;

        target.addEventListener('dblclick', handleDoubleClick as EventListener);

        return () => {
            target.removeEventListener('dblclick', handleDoubleClick as EventListener);
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
                className={className}
                style={{
                    minHeight,
                    width: '100%',
                    overflow: 'auto',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor: '#ffffff',
                    position: 'relative'
                }}
            />
        </div>
    );
};
