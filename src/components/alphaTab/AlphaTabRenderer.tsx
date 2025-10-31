'use client';

/**
 * AlphaTab Renderer V38.2 - SELECTION HANDLER CLEANUP FIX
 * 
 * Key Fixes:
 * - Fixed mouse/touch selection handlers not being cleaned up when Loop disabled
 * - Now properly removes event listeners when isLooping becomes false
 * - Added cleanup refs for better handler lifecycle management
 * - Removed isLooping from initialization useEffect dependencies (prevents reinitialization)
 * - Added better guards in drag handlers to prevent spurious warnings
 * 
 * Previous Features:
 * - Measure-priority beat detection
 * - Selection overlay refresh after resize
 * - Proper handle positioning
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
    isLooping?: boolean; // Used to enable/disable selection, NOT for reinitialization
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

// 🆕 V37: Measure-priority beat finder with detailed logging
const findBeatWithMeasurePriority = (
    api: AlphaTabApi,
    container: HTMLElement,
    x: number,
    y: number,
    searchRadius: number = 30
): { beat: any; isMeasureStart: boolean } | null => {
    let finalBeat = null;
    let bestMeasureStartBeat = null;
    let bestDistance = Infinity;
    let bestBeatDistance = Infinity;

    const rect = container.getBoundingClientRect();
    const relX = x - rect.left + container.scrollLeft;

    // Search in a horizontal range around the point
    for (let offsetX = -searchRadius; offsetX <= searchRadius; offsetX += 5) {
        const testX = x + offsetX;
        const beat = getBeatAtPosition(api, container, testX, y);

        if (beat) {
            const distance = Math.abs(offsetX);

            // Prioritize beats that are at measure starts (index 0)
            if (beat.index === 0) {
                if (distance < bestDistance) {
                    bestMeasureStartBeat = beat;
                    bestDistance = distance;
                    console.log(`🎯 V38.2 Found measure start at offset ${offsetX}px, tick=${beat.absolutePlaybackStart}`);
                }
            }

            // Keep track of closest beat overall as fallback
            if (distance < bestBeatDistance) {
                finalBeat = beat;
                bestBeatDistance = distance;
            }
        }
    }

    // Prefer measure start beat if found within reasonable distance
    const selectedBeat = bestMeasureStartBeat || finalBeat;
    if (!selectedBeat) return null;

    if (bestMeasureStartBeat) {
        console.log(`✅ V38.2 Using MEASURE START at ${bestMeasureStartBeat.absolutePlaybackStart}, distance=${bestDistance}px from cursor`);
    } else if (finalBeat) {
        console.log(`⚠️ V38 No measure start found, using closest BEAT at ${finalBeat.absolutePlaybackStart}, index=${finalBeat.index}`);
    }

    return {
        beat: selectedBeat,
        isMeasureStart: selectedBeat.index === 0
    };
};

// ==================== LOOP HANDLE CREATION ====================

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

    console.log('✅ V38.2 Measure-Priority handles created');
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
    console.log(`📍 V38 updateHandlePositions from: ${source}`);

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
                const dStringOffset = startSelectionHeight * 0.50;
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
                const dStringOffset = endSelectionHeight * 0.50;
                const bubbleOffsetFromTop = endSelectionTop + dStringOffset - newEndTop;
                endBubble.style.top = `${bubbleOffsetFromTop}px`;
                endBubble.style.transform = 'translateY(-50%)';
            }

            // Force AlphaTab to refresh its selection overlay after resize
            if (source === 'resize' || source === 'renderFinished') {
                console.log('🔄 V38 Forcing selection overlay refresh');
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

// ==================== DRAG HANDLERS ====================

const attachHandleDragHandlers = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandle: HTMLDivElement,
    endHandle: HTMLDivElement
) => {
    let isDragging = false;
    let dragTarget: 'start' | 'end' | null = null;
    let dragStartY = 0;

    const preventSelection = (e: Event) => {
        if (isDragging) {
            e.preventDefault();
            return false;
        }
    };

    const handleStart = (e: MouseEvent | TouchEvent, target: 'start' | 'end') => {
        console.log(`🎯 V38 ${target.toUpperCase()} DRAG START`);

        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragTarget = target;

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragStartY = clientY;

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

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragTarget) return;

        e.preventDefault();
        e.stopPropagation();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const handle = dragTarget === 'start' ? startHandle : endHandle;
        const containerRect = container.getBoundingClientRect();
        const relX = clientX - containerRect.left + container.scrollLeft;

        // VISUAL DRAG ONLY - no API updates
        const newLeft = relX - 1.5;
        handle.style.left = `${newLeft}px`;

        // Store for handleEnd
        (handle as any)._currentDragX = relX;
        (handle as any)._currentDragY = clientY;
    };

    const handleEnd = (e?: MouseEvent | TouchEvent) => {
        // 🆕 V38: BETTER GUARD - Only process if we're actually dragging
        if (!isDragging || !dragTarget) {
            // Silently return without logging if not dragging
            return;
        }

        // 🆕 V38: GUARD - Must have playbackRange
        if (!api.playbackRange) {
            console.log(`⚠️ V38 DRAG END but no playback range`);
            isDragging = false;
            dragTarget = null;
            document.body.style.overflow = '';
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.removeEventListener('selectstart', preventSelection);
            document.removeEventListener('dragstart', preventSelection);
            return;
        }

        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log(`🎯 V38 ${dragTarget.toUpperCase()} DRAG END - Snapping...`);

        document.body.style.overflow = '';
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);

        const handle = dragTarget === 'start' ? startHandle : endHandle;
        const bubble = handle.querySelector('.maestro-loop-bubble') as HTMLElement;

        if (bubble) {
            bubble.style.pointerEvents = 'auto';
            bubble.style.transform = 'translateY(-50%)';
        }

        // Get final position
        const finalX = (handle as any)._currentDragX || 0;
        const finalY = (handle as any)._currentDragY || dragStartY;
        delete (handle as any)._currentDragX;
        delete (handle as any)._currentDragY;

        const containerRect = container.getBoundingClientRect();
        const absoluteX = finalX + containerRect.left - container.scrollLeft;

        console.log(`🎯 V38 Final position: X=${finalX}, Y=${finalY}`);

        // Use measure-priority finder
        const result = findBeatWithMeasurePriority(api, container, absoluteX, finalY, 30);

        if (!result) {
            console.warn(`⚠️ V38 No beat found near X=${finalX}, Y=${finalY}`);
            setTimeout(() => {
                updateHandlePositions(api, container, startHandle, endHandle, 'handleEnd (no beat)');
            }, 50);
            isDragging = false;
            dragTarget = null;
            return;
        }

        const finalBeat = result.beat;
        const isMeasureStart = result.isMeasureStart;
        const beatStartTick = finalBeat.absolutePlaybackStart;
        const beatEndTick = beatStartTick + finalBeat.playbackDuration;

        console.log(`✅ V38 FINAL BEAT: ${beatStartTick} - ${beatEndTick}, Measure Start: ${isMeasureStart}, Beat Index: ${finalBeat.index}`);
        console.log(`📊 V38 Current loop: ${api.playbackRange.startTick} → ${api.playbackRange.endTick}`);

        let needsUpdate = false;
        let finalStartTick = api.playbackRange.startTick;
        let finalEndTick = api.playbackRange.endTick;

        // Save cursor BEFORE any changes
        const savedCursor = api.tickPosition;
        console.log(`💾 V38 Saved cursor position: ${savedCursor}`);

        if (dragTarget === 'start') {
            if (beatStartTick < api.playbackRange.endTick && beatStartTick !== api.playbackRange.startTick) {
                finalStartTick = beatStartTick;
                needsUpdate = true;
                console.log(`✅ V38 START SNAP: ${beatStartTick}`);
            } else if (beatStartTick === api.playbackRange.startTick) {
                console.log(`ℹ️ V38 START already at this measure (tick ${beatStartTick})`);
            }
        } else {
            if (beatEndTick > api.playbackRange.startTick && beatEndTick !== api.playbackRange.endTick) {
                finalEndTick = beatEndTick;
                needsUpdate = true;
                console.log(`✅ V38 END SNAP: ${beatEndTick}`);
            } else if (beatEndTick === api.playbackRange.endTick) {
                console.log(`ℹ️ V38 END already at this measure (tick ${beatEndTick})`);
            }
        }

        if (needsUpdate) {
            // Update range
            api.playbackRange = { startTick: finalStartTick, endTick: finalEndTick };
            console.log(`✅ V38 API Updated: ${finalStartTick} → ${finalEndTick}`);

            // Cursor logic: Move to START on START drag, preserve on END drag
            setTimeout(() => {
                if (dragTarget === 'start') {
                    if (api.tickPosition !== undefined) {
                        api.tickPosition = finalStartTick;
                        console.log(`➡️ V38 Cursor moved to START: ${finalStartTick}`);
                    }
                } else {
                    if (api.tickPosition !== undefined && savedCursor !== undefined) {
                        api.tickPosition = savedCursor;
                        console.log(`➡️ V38 Cursor RESTORED: ${savedCursor}`);
                    }
                }
            }, 10);
        } else {
            console.log(`🟡 V38 No tick change, but forcing handle re-position`);
        }

        // ALWAYS update handle positions after drag
        setTimeout(() => {
            updateHandlePositions(api, container, startHandle, endHandle, 'handleEnd (forced update)');
        }, 50);

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

    console.log('✅ V38 MEASURE-PRIORITY drag handlers attached');

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
                    const loopStart = Math.min(
                        startBeat.absolutePlaybackStart,
                        endBeat.absolutePlaybackStart
                    );
                    const loopEnd = Math.max(
                        startBeat.absolutePlaybackStart + startBeat.playbackDuration,
                        endBeat.absolutePlaybackStart + endBeat.playbackDuration
                    );

                    if (api.playbackRange !== undefined) {
                        api.playbackRange = { startTick: loopStart, endTick: loopEnd };
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
            const loopStart = Math.min(
                startBeat.absolutePlaybackStart,
                endBeat.absolutePlaybackStart
            );
            const loopEnd = Math.max(
                startBeat.absolutePlaybackStart + startBeat.playbackDuration,
                endBeat.absolutePlaybackStart + endBeat.playbackDuration
            );

            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick: loopStart, endTick: loopEnd };
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

        const result = findBeatWithMeasurePriority(api, container, e.clientX, e.clientY, 30);
        if (result) {
            const beat = result.beat;
            isSelecting = true;
            startBeat = beat;
            endBeat = beat;

            const beatStartTick = beat.absolutePlaybackStart;
            const beatEndTick = beatStartTick + beat.playbackDuration;

            console.log(`🖱️ V38 Mouse DOWN: Measure Start=${result.isMeasureStart}, Tick=${beatStartTick}`);

            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick: beatStartTick, endTick: beatEndTick };
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

        const result = findBeatWithMeasurePriority(api, container, e.clientX, e.clientY, 30);
        if (result && result.beat !== endBeat) {
            const beat = result.beat;
            endBeat = beat;

            const loopStart = Math.min(
                startBeat.absolutePlaybackStart,
                endBeat.absolutePlaybackStart
            );
            const loopEnd = Math.max(
                startBeat.absolutePlaybackStart + startBeat.playbackDuration,
                endBeat.absolutePlaybackStart + endBeat.playbackDuration
            );

            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick: loopStart, endTick: loopEnd };
                updateHandlePositions(api, container, startHandle, endHandle, 'mouseMove');
            }
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (!isSelecting) return;
        isSelecting = false;

        if (startBeat && endBeat) {
            const loopStart = Math.min(
                startBeat.absolutePlaybackStart,
                endBeat.absolutePlaybackStart
            );
            const loopEnd = Math.max(
                startBeat.absolutePlaybackStart + startBeat.playbackDuration,
                endBeat.absolutePlaybackStart + endBeat.playbackDuration
            );

            if (api.playbackRange !== undefined) {
                api.playbackRange = { startTick: loopStart, endTick: loopEnd };
            }
            if (api.tickPosition !== undefined) {
                api.tickPosition = loopStart;
            }

            console.log(`🖱️ V38 Mouse UP: Final loop ${loopStart} → ${loopEnd}`);
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
    isLooping = true // Default to true
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

    // 🆕 V38: CRITICAL FIX - Removed isLooping from dependencies!
    // This was causing full reinitialization every time loop button was toggled
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 🎸 🎸 Initializing AlphaTab V38.2 - HANDLER CLEANUP FIX 🎸 🎸 🎸');

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

                // Enable looping by default
                if (api.isLooping !== undefined) {
                    api.isLooping = true;
                }

                if (api.playerFinished) {
                    api.playerFinished.on(() => {
                        // Loop handled by parent via api.isLooping
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
    // ☝️ NOTE: isLooping removed from dependencies! This prevents reinitialization

    // 🆕 V38.1: Separate useEffect to update api.isLooping without reinitializing
    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            apiRef.current.isLooping = isLooping;
            console.log(`🔄 V38.2 API isLooping set to: ${isLooping}`);
        }
    }, [isLooping]);

    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

        console.log('🎨 Creating V38 loop handles...');
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
                console.log('📐 V38 Container resized - updating handles');
                if (containerRef.current && startHandleRef.current && endHandleRef.current && apiRef.current) {
                    updateHandlePositions(apiRef.current, containerRef.current, startHandleRef.current, endHandleRef.current, 'resize');
                }
            }, 300);
        });

        resizeObserver.observe(container);

        const renderHandler = () => {
            console.log('🎨 V38 Render finished - forcing handle update');
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
        // Clean up existing handlers first
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

        // 🆕 V38.2: Only setup if loop is enabled
        if (!isLooping) {
            console.log('🚫 V38.2 Touch selection DISABLED (Loop is OFF)');
            return;
        }

        console.log('🎯 V38.2 Setting up touch selection (Loop is ON)');

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
        // Clean up existing handlers first
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

        // 🆕 V38.2: Only setup if loop is enabled
        if (!isLooping) {
            console.log('🚫 V38.2 Mouse selection DISABLED (Loop is OFF)');
            return;
        }

        console.log('🖱️ V38.2 Setting up mouse selection (Loop is ON)');

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