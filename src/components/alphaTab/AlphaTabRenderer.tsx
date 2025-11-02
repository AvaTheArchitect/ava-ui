'use client';

/**
 * AlphaTab Renderer V50 - UNIFIED HANDLE FIX + CAPTURE MODE
 * 
 * V49 ISSUES (REVERTED):
 * ❌ SVG finding by Y-coordinate was unreliable
 * ❌ Start/end handles finding different SVGs
 * ❌ Right handle separating (bar vs bubble)
 * ❌ Screen jumping on bubble click
 * 
 * V50 APPROACH:
 * ✅ Use masterBarBounds.visualBounds (includes staff + notation + some padding)
 * ✅ Subtract margins to match AlphaTab's highlight insets
 * ✅ Keep both handles using same calculation method
 * ✅ Simpler = more reliable
 * 
 * V50 RESIZE FIX:
 * ✅ Track pending resize state
 * ✅ Wait for postRenderFinished (most reliable event)
 * ✅ Verify boundsLookup is populated before updating
 * ✅ Shorter delays (50-100ms vs 200-300ms)
 * ✅ Force AlphaTab selection refresh (clear + restore playbackRange)
 * 
 * V50 DRAG FIX (UNIFIED + CAPTURE):
 * ✅ Handle bar AND bubble act as ONE unit (both draggable)
 * ✅ Both have cursor: ew-resize for clear drag affordance
 * ✅ Capture mode ONLY on mousedown/touchstart to block mouse selection
 * ✅ Immediate drag start without threshold
 * ✅ Uses timing buffers for Songsterr-style push/pull effect
 * ✅ No page jump - capture blocks mouse selection interference
 * 
 * THE FIX (V50):
 * - Handle: masterBarBounds.visualBounds with insets
 * - Bubble: Always relative to handle's top
 * - No SVG queries needed
 * - Resize → postRenderFinished → force selection refresh → updateHandles
 * - Drag: Handle bar + bubble unified, capture mode on mousedown only
 * 
 * PRESERVED:
 * ✅ Real-time drag, scroll prevention, timing buffers
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

    console.log('✅ V50 Unified handles created (bar+bubble as one unit)');
    return { startHandle, endHandle };
};

// ==================== HANDLE POSITIONING (V50 - SIMPLIFIED BOUNDS + RESIZE FIX) ====================

const updateHandlePositions = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement,
    source: string = 'unknown'
) => {
    console.log(`📍 V50 updateHandlePositions from: ${source}`);

    if (!api.playbackRange || !api.renderer?.boundsLookup || !api.tracks) {
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
        return;
    }

    // ✅ RESIZE FIX: Verify boundsLookup is actually populated
    if (!api.renderer.boundsLookup.staffSystems || 
        api.renderer.boundsLookup.staffSystems.length === 0) {
        console.warn('⚠️ V50 boundsLookup not ready yet, skipping update');
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

        // --- START Handle ---
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

        // --- END Handle ---
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

        console.log(`📏 V50 Start Handle: ${Math.round(startHandleHeight)}px @ ${Math.round(startHandleTop)}px | End Handle: ${Math.round(endHandleHeight)}px @ ${Math.round(endHandleTop)}px`);

    } catch (error) {
        console.error('❌ V50 Handle positioning error:', error);
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

    const preventSelection = (e: Event) => {
        if (isDragging) {
            e.preventDefault();
            return false;
        }
    };

    const handleStart = (e: MouseEvent | TouchEvent, target: 'start' | 'end') => {
        console.log(`🎯 V50 ${target.toUpperCase()} DRAG START`);

        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragTarget = target;

        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.position = 'fixed';
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
        document.body.style.width = '';

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

        console.log(`✅ V50 ${dragTarget?.toUpperCase()} drag completed`);
        isDragging = false;
        dragTarget = null;
    };

    const startBubble = startHandle.querySelector('.maestro-loop-bubble');
    const endBubble = endHandle.querySelector('.maestro-loop-bubble');

    // Attach to BOTH bubble AND handle bar (as one unit)
    // USE CAPTURE MODE on mousedown/touchstart to block mouse selection handler
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

    // These don't need capture mode - only the initial mousedown needs to block the mouse selection
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    console.log('✅ V50 Unified drag handlers (capture mode on mousedown blocks mouse selection)');

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
        document.body.style.width = '';
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
        // Ignore if not left click OR if clicking on loop handles/bubbles
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
                console.log('🎸 🎸 🎸 Initializing AlphaTab V50.1 - UNIFIED HANDLE + PINCH-TO-ZOOM 🎸 🎸 🎸');
                console.log('📏 Using masterBarBounds with insets for reliability');
                console.log('🛡️ Added scroll prevention to bubbles');
                console.log('🔄 Resize fix: postRenderFinished + boundsLookup verification + force selection refresh');
                console.log('🖱️ Drag fix: Unified handle+bubble, capture mode on mousedown blocks mouse selection');
                console.log('🤏 Pinch-to-zoom: 2-finger pinch scales canvas (0.5x - 5x), 1-finger for loop selection');

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
            console.log(`🔄 V50 API isLooping: ${isLooping}`);
        }
    }, [isLooping]);

    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

        console.log('🎨 Creating V50 unified handles (bar+bubble as one unit)');
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

        // ===== IMPROVED RESIZE HANDLING =====
        
        let pendingResizeUpdate = false;
        let resizeTimer: NodeJS.Timeout;
        
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            pendingResizeUpdate = true;
            
            resizeTimer = setTimeout(() => {
                console.log('📐 V50 Container resized - waiting for AlphaTab re-render');
            }, 150);
        });

        resizeObserver.observe(container);

        // ===== IMPROVED RENDER FINISHED HANDLING =====
        
        const renderHandler = () => {
            console.log('🎨 V50 Render finished');
            
            setTimeout(() => {
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    console.log(`🔄 V50 Updating handles after render (pendingResize: ${pendingResizeUpdate})`);
                    updateHandlePositions(
                        apiRef.current, 
                        containerRef.current, 
                        startHandleRef.current, 
                        endHandleRef.current, 
                        pendingResizeUpdate ? 'renderFinished-after-resize' : 'renderFinished'
                    );
                    pendingResizeUpdate = false;
                }
            }, 100);
        };

        if (api.renderFinished) {
            api.renderFinished.on(renderHandler);
        }

        // ===== ALSO LISTEN TO postRenderFinished (MORE RELIABLE) =====
        
        const postRenderHandler = () => {
            console.log('🎨 V50 Post-render finished');
            
            setTimeout(() => {
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    if (apiRef.current.playbackRange) {
                        console.log('🔄 V50 Final handle update after post-render');
                        
                        // ✅ CRITICAL FIX: Force AlphaTab to refresh selection after resize
                        if (pendingResizeUpdate) {
                            console.log('🔄 V50 Forcing AlphaTab selection refresh after resize');
                            const currentRange = apiRef.current.playbackRange;
                            
                            // Temporarily clear to force re-render of AlphaTab's internal selection divs
                            apiRef.current.playbackRange = null;
                            
                            // Restore immediately to trigger fresh selection rendering
                            setTimeout(() => {
                                if (apiRef.current) {
                                    apiRef.current.playbackRange = currentRange;
                                    console.log('✅ V50 Selection refreshed with new bounds');
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

        // ===== PLAYBACK RANGE CHANGED HANDLER =====
        
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
            console.log('🚫 V50 Touch OFF');
            return;
        }

        console.log('🎯 V50 Touch ON');

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
            console.log('🚫 V50 Mouse OFF');
            return;
        }

        console.log('🖱️ V50 Mouse ON');

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

    // ==================== PINCH-TO-ZOOM (V50.1) ====================
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !isRendered) {
            return;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        let initialDistance = 0;
        let initialScale = 1;
        let isPinching = false;

        const getDistance = (touch1: Touch, touch2: Touch): number => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        const handlePinchStart = (e: TouchEvent) => {
            // Only handle 2+ finger touches (pinch)
            if (e.touches.length >= 2) {
                isPinching = true;
                initialDistance = getDistance(e.touches[0], e.touches[1]);
                initialScale = (api.settings as any).display?.scale || 1;
                console.log(`🤏 V50.1 Pinch started - initial scale: ${initialScale}`);
            }
        };

        const handlePinchMove = (e: TouchEvent) => {
            // Only process if we're actively pinching with 2+ fingers
            if (!isPinching || e.touches.length < 2) return;

            e.preventDefault(); // Prevent default iOS zoom

            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scale = (currentDistance / initialDistance) * initialScale;

            // Clamp scale between 0.5x and 5x
            const clampedScale = Math.max(0.5, Math.min(5, scale));

            // Update AlphaTab scale
            if ((api.settings as any).display) {
                (api.settings as any).display.scale = clampedScale;
                api.updateSettings();
                api.render();
                console.log(`🔍 V50.1 Pinch scale: ${clampedScale.toFixed(2)}x`);
            }
        };

        const handlePinchEnd = (e: TouchEvent) => {
            if (isPinching && e.touches.length < 2) {
                isPinching = false;
                const finalScale = (api.settings as any).display?.scale || 1;
                console.log(`✅ V50.1 Pinch ended - final scale: ${finalScale.toFixed(2)}x`);
            }
        };

        // Attach pinch handlers to container
        container.addEventListener('touchstart', handlePinchStart, { passive: true });
        container.addEventListener('touchmove', handlePinchMove, { passive: false });
        container.addEventListener('touchend', handlePinchEnd, { passive: true });
        container.addEventListener('touchcancel', handlePinchEnd, { passive: true });

        console.log('✅ V50.1 Pinch-to-zoom handlers attached');

        return () => {
            container.removeEventListener('touchstart', handlePinchStart);
            container.removeEventListener('touchmove', handlePinchMove);
            container.removeEventListener('touchend', handlePinchEnd);
            container.removeEventListener('touchcancel', handlePinchEnd);
        };
    }, [isRendered]);

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