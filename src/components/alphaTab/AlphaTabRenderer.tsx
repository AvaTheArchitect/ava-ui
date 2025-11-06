'use client';

/**
 * AlphaTab Renderer V60.5 - INITIAL CURSOR ANCHOR FIX
 * 
 * 🔧 CRITICAL FIXES:
 * ✅ Set scrollOffset during INITIALIZATION (not just on orientation change)
 * ✅ Calculate initial offset based on detected orientation
 * ✅ Prevents default cursor behavior from the very start
 * ✅ Event-driven state restoration (renderFinished handler)
 * ✅ Desktop/Portrait: scrollElement = window, scrollOffset for vertical
 * ✅ Landscape: scrollElement = container, scrollOffset for horizontal (15%)
 * ✅ Responsive: containerWidth triggers recalculation
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
const CURSOR_LEAD_IN = -40;

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

    console.log('✅ V60 Loop handles created');
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
    const apiRef = useRef<AlphaTabApi | null>(null);
    const [isLandscape, setIsLandscape] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0); // V60.3: Track container width for responsive scroll offset

    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const mouseCleanupRef = useRef<(() => void) | null>(null);
    const touchCleanupRef = useRef<(() => void) | null>(null);

    // 🆕 V60.3: Detect device type, orientation, AND container width
    useEffect(() => {
        const detectMobileDevice = () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                (window.innerWidth <= 1024 && 'ontouchstart' in window);
        };

        const checkOrientation = () => {
            const mobile = detectMobileDevice();
            setIsMobile(mobile);

            // Only use orientation logic on mobile devices
            const landscape = mobile && window.innerWidth > window.innerHeight;
            setIsLandscape(landscape);

            // V60.3: Update container width on every resize (for landscape scroll offset calculation)
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }

            console.log(`📱 V60.4 Device: ${mobile ? 'MOBILE' : 'DESKTOP'}, Orientation: ${landscape ? 'LANDSCAPE' : (mobile ? 'PORTRAIT' : 'PAGE')}, Container Width: ${containerRef.current?.clientWidth || 0}px`);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    // 🔧 V60 FIX: Initialize AlphaTab ONCE - NO isLandscape dependency!
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 V60.4: Initializing AlphaTab (ONCE) 🎸');

                // V60.4: Pass mobile detection to initAlphaTab
                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: playerMode !== 'disabled',
                    layoutMode: 'page', // Start with page layout
                    soundFontPath: playerMode === 'synthesizer' ? soundFontPath : undefined,
                    isMobile: isMobile // V60.4: Pass mobile state
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

                    console.log(`✅ Score: ${songInfo.title} (${trackList.length} tracks)`);
                    onScoreLoaded?.(songInfo, trackList);
                    setIsLoading(false);
                });

                if (playerMode === 'synthesizer') {
                    if (api.playerReady) {
                        api.playerReady.on(() => {
                            if (!isMounted) return;
                            console.log('✅ Player Ready!');
                        });
                    }
                }

                api.renderFinished.on(() => {
                    if (!isMounted) return;
                    console.log('✅ Rendering Complete');
                    setIsRendered(true);
                    onRenderFinished?.();
                });

                api.error.on((e: any) => {
                    if (!isMounted) return;
                    const errorMsg = e.message || 'Failed to load tab file';
                    console.error('❌ AlphaTab Error:', errorMsg);
                    onError?.(errorMsg);
                    setIsLoading(false);
                });

                onApiReady?.(api);
                await loadGuitarProFile(api, fileUrl);

            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
                console.error('❌ Init Error:', errorMsg);
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
                    console.log('🧹 V60: AlphaTab destroyed');
                } catch (e) {
                    console.warn('Cleanup warning:', e);
                }
            }
        };
    }, [fileUrl, playerMode, soundFontPath, onApiReady, onScoreLoaded, onRenderFinished, onError]);
    // ☝️ NO isLandscape dependency = no re-initialization!

    // 🔧 V60 FIX: Handle orientation changes with updateSettings() NOT re-initialization
    useEffect(() => {
        if (!apiRef.current || !isRendered || !containerRef.current) return;

        const api = apiRef.current;
        const containerElement = containerRef.current;
        let cursorCleanup: (() => void) | null = null;

        const applyOrientationSettings = async (isLandscapeMode: boolean) => {
            console.log(`🔄 V60: Applying ${isLandscapeMode ? 'LANDSCAPE' : 'PORTRAIT'} settings`);

            // ✅ Save playback state BEFORE changing settings
            const wasPlaying = (api as any).playerState === 1;
            const currentTick = api.tickPosition;
            const currentPlaybackRange = api.playbackRange;
            const currentTracks = api.tracks;

            console.log(`📊 V60: Saving state - Playing: ${wasPlaying}, Tick: ${currentTick}`);

            const alphaTab = await import('@coderline/alphatab');

            // Clean up previous cursor handler
            if (cursorCleanup) {
                cursorCleanup();
                cursorCleanup = null;
            }

            if (isLandscapeMode) {
                // 🎸 LANDSCAPE: Horizontal layout + manual cursor at 15%
                console.log('🎸 V60: Configuring LANDSCAPE mode');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = containerElement;

                // 🎯 Manual cursor anchoring at 15% (Songsterr style)
                const cursorHandler = (e: any) => {
                    if (!containerElement || !e.bounds) return;

                    const viewportWidth = containerElement.clientWidth;
                    const fixedCursorPosition = viewportWidth * 0.15; // 15% from left
                    const targetScroll = e.bounds.x - fixedCursorPosition;

                    containerElement.scrollTo({
                        left: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                };

                if (api.cursorUpdated) {
                    api.cursorUpdated.on(cursorHandler);
                    console.log('🎯 V60: Manual cursor anchoring enabled at 15%');

                    cursorCleanup = () => {
                        if (api.cursorUpdated) {
                            api.cursorUpdated.off(cursorHandler);
                            console.log('🧹 V60: Cursor handler removed');
                        }
                    };
                }

            } else {
                // 📱 PORTRAIT: Page layout + natural scroll + scroll offset for Dynamic Island
                console.log('📱 V60.1: Configuring PORTRAIT mode');

                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = containerElement;

                // 🔧 Dynamic Island fix: Use scrollOffset (not scrollOffsetY)
                if ((api.settings.player as any).scrollOffset !== undefined) {
                    (api.settings.player as any).scrollOffset = 100; // Push cursor down 100px
                    console.log('✅ V60.1: scrollOffset = 100 (Dynamic Island fix)');
                }
            }

            // Apply settings without destroying API
            api.updateSettings();
            console.log('✅ V60: Settings updated (no re-initialization)');

            // Trigger re-render
            api.render();
            console.log('✅ V60: Re-render triggered');

            // ✅ Restore playback state after render (with better timing)
            setTimeout(() => {
                console.log('🔄 V60.3: Restoring playback state...');

                // Restore tracks
                if (currentTracks && api.tracks !== currentTracks) {
                    api.tracks = currentTracks;
                    console.log(`✅ V60.3: Tracks restored (count: ${currentTracks.length})`);
                }

                // Restore playback range
                if (currentPlaybackRange && api.playbackRange !== undefined) {
                    api.playbackRange = currentPlaybackRange;
                    console.log(`✅ V60.3: Playback range restored`);
                }

                // Wait for render to complete before restoring tick position
                setTimeout(() => {
                    // Restore tick position
                    if (currentTick !== undefined && api.tickPosition !== undefined) {
                        api.tickPosition = currentTick;
                        console.log(`✅ V60.3: Tick position restored to ${currentTick}`);
                    }

                    // Resume playback if it was playing (with extra delay to avoid backtrack)
                    if (wasPlaying && api.play) {
                        setTimeout(() => {
                            api.play();
                            console.log('▶️ V60.3: Playback resumed');
                        }, 200);
                    }
                }, 300);
            }, 500);
        };

        // Apply initial orientation settings
        applyOrientationSettings(isLandscape);

        return () => {
            if (cursorCleanup) {
                cursorCleanup();
            }
        };
    }, [isLandscape, isRendered, isMobile, containerWidth]); // V60.4: containerWidth triggers recalculation

    // Loop control
    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            apiRef.current.isLooping = isLooping;
        }
    }, [isLooping]);

    // Create loop handles
    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

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
                console.log('📐 V60: Container resized');
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

    // Touch selection setup
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
                touchCleanupRef.current = null;
            }
        };
    }, [isRendered, enableTouchSelection, isLooping]);

    // Mouse selection setup
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
                    overflowX: 'auto',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff'
                }}
            />
        </div>
    );
};