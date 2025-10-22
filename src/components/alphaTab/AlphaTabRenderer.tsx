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

// 🆕 CREATE REAL DOM HANDLES - Songsterr Style
// This function creates actual <div> elements for start/end handles
const createLoopHandles = (container: HTMLElement): {
    startHandle: HTMLDivElement;
    endHandle: HTMLDivElement;
} => {
    // Create START handle (>)
    const startHandle = document.createElement('div');
    startHandle.className = 'maestro-loop-handle maestro-loop-handle-start';
    startHandle.innerHTML = '&gt;'; // > character
    startHandle.style.cssText = `
        position: absolute;
        width: 24px;
        height: 24px;
        background: rgba(147, 51, 234, 0.95);
        border-radius: 50%;
        border: 2px solid #fff;
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 24px;
        text-align: center;
        cursor: ew-resize;
        z-index: 1001;
        display: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    `;

    // Create END handle (<)
    const endHandle = document.createElement('div');
    endHandle.className = 'maestro-loop-handle maestro-loop-handle-end';
    endHandle.innerHTML = '&lt;'; // < character
    endHandle.style.cssText = `
        position: absolute;
        width: 24px;
        height: 24px;
        background: rgba(147, 51, 234, 0.95);
        border-radius: 50%;
        border: 2px solid #fff;
        color: #fff;
        font-size: 14px;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        line-height: 24px;
        text-align: center;
        cursor: ew-resize;
        z-index: 1001;
        display: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    `;

    // Append to container
    container.appendChild(startHandle);
    container.appendChild(endHandle);

    console.log('✅ Real DOM handles created');
    return { startHandle, endHandle };
};

// 🆕 UPDATE HANDLE POSITIONS - Uses AlphaTab's BoundsLookup API
// This positions the handles at the correct beat locations
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

    // Get track indices for beat lookup
    const trackIndices = new Set(api.tracks.map((t: any) => t.index));

    try {
        // Find beats at start and end ticks using AlphaTab's TickCache
        const startResult = (api as any).tickCache?.findBeat(trackIndices, startTick);
        const endResult = (api as any).tickCache?.findBeat(trackIndices, endTick);

        if (startResult?.beat && endResult?.beat) {
            // Get visual bounds for these beats
            const startBounds = api.renderer.boundsLookup.findBeat(startResult.beat);
            const endBounds = api.renderer.boundsLookup.findBeat(endResult.beat);

            if (startBounds && endBounds) {
                // Position START handle at left edge of first beat
                const startX = startBounds.realBounds.x - 15; // 15px offset from edge
                const startY = startBounds.realBounds.y + (startBounds.realBounds.h / 2) - 12; // Center vertically

                startHandle.style.left = `${startX}px`;
                startHandle.style.top = `${startY}px`;
                startHandle.style.display = 'block';

                // Position END handle at right edge of last beat
                const endX = endBounds.realBounds.x + endBounds.realBounds.w + 15; // 15px offset from edge
                const endY = endBounds.realBounds.y + (endBounds.realBounds.h / 2) - 12; // Center vertically

                endHandle.style.left = `${endX}px`;
                endHandle.style.top = `${endY}px`;
                endHandle.style.display = 'block';

                console.log(`🎯 Handles positioned: Start(${Math.round(startX)}, ${Math.round(startY)}), End(${Math.round(endX)}, ${Math.round(endY)})`);
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not position handles:', error);
        startHandle.style.display = 'none';
        endHandle.style.display = 'none';
    }
};

// Touch event handlers for loop selection - V6 with REAL DOM HANDLES
const setupTouchSelection = (
    api: AlphaTabApi,
    container: HTMLElement,
    startHandleRef: HTMLDivElement,
    endHandleRef: HTMLDivElement
) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;
    let isDraggingStart = false;
    let isDraggingEnd = false;
    let touchStartTime = 0;
    let touchMoved = false;
    let startX = 0;
    let startY = 0;
    let lastTapTime = 0;

    const DOUBLE_TAP_DELAY = 400;
    const HANDLE_TOUCH_AREA = 60; // 60px touch area for handles

    // Helper to get beat at touch position
    const getBeatAtPosition = (x: number, y: number) => {
        if (!api.renderer?.boundsLookup) return null;

        const rect = container.getBoundingClientRect();
        const relX = x - rect.left + container.scrollLeft;
        const relY = y - rect.top + container.scrollTop;

        return api.renderer.boundsLookup.getBeatAtPos(relX, relY);
    };

    // Get bar start tick
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

    // Get bar end tick
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

    // 🆕 IMPROVED: Check if touch is on REAL START handle
    const isTouchingStartHandle = (x: number, y: number): boolean => {
        if (startHandleRef.style.display === 'none') return false;

        const rect = startHandleRef.getBoundingClientRect();
        const handleCenterX = rect.left + rect.width / 2;
        const handleCenterY = rect.top + rect.height / 2;

        const distanceX = Math.abs(x - handleCenterX);
        const distanceY = Math.abs(y - handleCenterY);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        const isNear = distance < HANDLE_TOUCH_AREA;
        if (isNear) {
            console.log(`🎯 START handle touched! Distance: ${Math.round(distance)}px`);
        }
        return isNear;
    };

    // 🆕 IMPROVED: Check if touch is on REAL END handle
    const isTouchingEndHandle = (x: number, y: number): boolean => {
        if (endHandleRef.style.display === 'none') return false;

        const rect = endHandleRef.getBoundingClientRect();
        const handleCenterX = rect.left + rect.width / 2;
        const handleCenterY = rect.top + rect.height / 2;

        const distanceX = Math.abs(x - handleCenterX);
        const distanceY = Math.abs(y - handleCenterY);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        const isNear = distance < HANDLE_TOUCH_AREA;
        if (isNear) {
            console.log(`🎯 END handle touched! Distance: ${Math.round(distance)}px`);
        }
        return isNear;
    };

    // Check if touch is in scroll zone
    const isInScrollZone = (x: number) => {
        const rect = container.getBoundingClientRect();
        const rightEdge = rect.right;
        const scrollZoneWidth = 40;
        return x > (rightEdge - scrollZoneWidth);
    };

    // Handle touch start
    const handleTouchStart = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        touchStartTime = Date.now();
        touchMoved = false;

        if (isInScrollZone(startX)) {
            return;
        }

        // 🆕 Check REAL handles FIRST
        if (isTouchingStartHandle(startX, startY)) {
            isDraggingStart = true;
            e.preventDefault();
            e.stopPropagation();
            document.body.style.overflow = 'hidden';
            startHandleRef.style.transform = 'scale(1.15)';
            console.log('🎯 START handle grabbed');
            return;
        }

        if (isTouchingEndHandle(startX, startY)) {
            isDraggingEnd = true;
            e.preventDefault();
            e.stopPropagation();
            document.body.style.overflow = 'hidden';
            endHandleRef.style.transform = 'scale(1.15)';
            console.log('🎯 END handle grabbed');
            return;
        }

        // Allow new selection if not touching handles
        const beat = getBeatAtPosition(touch.clientX, touch.clientY);
        if (beat) {
            startBeat = beat;
            endBeat = beat;
            console.log('🎯 Touch started on beat:', beat.index);
        }
    };

    // Handle touch move
    const handleTouchMove = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // Handle dragging loop start
        if (isDraggingStart) {
            touchMoved = true;
            e.preventDefault();
            e.stopPropagation();
            document.body.style.overflow = 'hidden';

            const beat = getBeatAtPosition(touch.clientX, touch.clientY);
            if (beat && api.playbackRange) {
                const newStartTick = getBarStartTick(beat);

                if (newStartTick < api.playbackRange.endTick) {
                    api.playbackRange = {
                        startTick: newStartTick,
                        endTick: api.playbackRange.endTick
                    };
                    console.log(`◀️ Adjusting START: ${newStartTick}`);
                }
            }
            return;
        }

        // Handle dragging loop end
        if (isDraggingEnd) {
            touchMoved = true;
            e.preventDefault();
            e.stopPropagation();
            document.body.style.overflow = 'hidden';

            const beat = getBeatAtPosition(touch.clientX, touch.clientY);
            if (beat && api.playbackRange) {
                const newEndTick = getBarEndTick(beat);

                if (newEndTick > api.playbackRange.startTick) {
                    api.playbackRange = {
                        startTick: api.playbackRange.startTick,
                        endTick: newEndTick
                    };
                    console.log(`▶️ Adjusting END: ${newEndTick}`);
                }
            }
            return;
        }

        // Normal selection
        if (!startBeat) return;

        // Prioritize vertical scrolling
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            startBeat = null;
            endBeat = null;
            return;
        }

        // Require horizontal movement
        const isHorizontalDrag = Math.abs(deltaX) > 30;

        if (isHorizontalDrag) {
            touchMoved = true;

            if (!isSelecting) {
                isSelecting = true;
                document.body.style.overflow = 'hidden';
                console.log('🎸 Selection started');
            }

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const beat = getBeatAtPosition(touch.clientX, touch.clientY);

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
                        console.log(`🎸 Loop: ${loopStart} → ${loopEnd}`);
                    }
                }
            }
        }
    };

    // Handle touch end
    const handleTouchEnd = (e: Event) => {
        const touchDuration = Date.now() - touchStartTime;
        const now = Date.now();

        // Restore scroll
        document.body.style.overflow = '';

        // Reset handle scale
        startHandleRef.style.transform = '';
        endHandleRef.style.transform = '';

        // Handle end of dragging
        if (isDraggingStart || isDraggingEnd) {
            console.log('✅ Loop adjusted via handle drag');

            if (api.playbackRange && api.tickPosition !== undefined) {
                api.tickPosition = api.playbackRange.startTick;
                console.log('🎯 Cursor moved to loop start');
            }

            isDraggingStart = false;
            isDraggingEnd = false;
            touchMoved = false;
            return;
        }

        // Double-tap detection
        const timeSinceLastTap = now - lastTapTime;
        const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 50;
        lastTapTime = now;

        if (!touchMoved && touchDuration < 400) {
            if (isDoubleTap) {
                if (api.playbackRange !== undefined) {
                    api.playbackRange = null;
                    console.log('🗑️ Loop cleared via double-tap');

                    if (api.tickPosition !== undefined) {
                        api.tickPosition = 0;
                    }
                }
            }
            console.log('👆 Single tap detected - ignoring');
        }

        // Handle drag selection
        if (isSelecting && startBeat && endBeat) {
            e.preventDefault();
            e.stopPropagation();

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

            console.log(`✅ Loop finalized: ${loopStart} → ${loopEnd}`);

            if (api.tickPosition !== undefined) {
                api.tickPosition = loopStart;
                console.log(`🎯 Cursor FORCED to loop start: ${loopStart}`);
            }

            if (api.render) {
                api.render();
            }
        }

        // Reset state
        isSelecting = false;
        isDraggingStart = false;
        isDraggingEnd = false;
        startBeat = null;
        endBeat = null;
        touchMoved = false;
        startX = 0;
        startY = 0;
    };

    // Attach listeners to container
    const surface = container.querySelector('.at-surface');
    const target = surface || container;

    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: false });
    target.addEventListener('touchcancel', handleTouchEnd as EventListener, { passive: false });

    // Return cleanup function
    return () => {
        target.removeEventListener('touchstart', handleTouchStart as EventListener);
        target.removeEventListener('touchmove', handleTouchMove as EventListener);
        target.removeEventListener('touchend', handleTouchEnd as EventListener);
        target.removeEventListener('touchcancel', handleTouchEnd as EventListener);
        document.body.style.overflow = '';
    };
};

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

    // 🆕 Refs for REAL DOM handles
    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);

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

                // iOS FIX: Handle playerFinished event
                if (api.playerFinished) {
                    api.playerFinished.on(() => {
                        console.log('🔄 Player finished. isLooping:', isLooping);

                        if (isLooping && api.isLooping) {
                            console.log('🔁 Restarting playback for iOS loop...');
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

                    console.log('✅ Score loaded:', score.title);

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

                    console.log(`Found ${trackList.length} tracks`);
                    onScoreLoaded?.(songInfo, trackList);
                    setIsLoading(false);
                });

                if (playerMode === 'synthesizer') {
                    console.log('🔍 Wiring up player events...');

                    if (api.playerReady) {
                        api.playerReady.on(() => {
                            if (!isMounted) return;
                            console.log('✅ Player ready');
                        });
                    }

                    if (api.soundFontLoad) {
                        api.soundFontLoad.on((e: any) => {
                            if (!isMounted) return;
                            console.log(`🎼 Loading soundfont: ${Math.round((e.loaded / e.total) * 100)}%`);
                        });
                    }

                    if (api.soundFontLoaded) {
                        api.soundFontLoaded.on(() => {
                            if (!isMounted) return;
                            console.log('✅ SoundFont loaded');
                        });
                    }

                    if (api.soundFontLoadFailed) {
                        api.soundFontLoadFailed.on((e: any) => {
                            if (!isMounted) return;
                            console.error('❌ SoundFont load FAILED:', e);
                        });
                    }
                }

                api.renderFinished.on(() => {
                    if (!isMounted) return;
                    console.log('✅ Rendering complete');
                    setIsRendered(true);
                    onRenderFinished?.();
                });

                api.error.on((e: any) => {
                    if (!isMounted) return;
                    const errorMsg = e.message || 'Failed to load tab file';
                    console.error('❌ AlphaTab error:', errorMsg);
                    onError?.(errorMsg);
                    setIsLoading(false);
                });

                onApiReady?.(api);
                await loadGuitarProFile(api, fileUrl);

            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
                console.error('❌ AlphaTabRenderer error:', errorMsg);
                onError?.(errorMsg);
                setIsLoading(false);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            if (apiRef.current) {
                console.log('🧹 Cleaning up AlphaTab API');
                try {
                    apiRef.current.destroy();
                } catch (e) {
                    console.warn('Cleanup warning:', e);
                }
            }
        };
    }, [fileUrl, playerMode, soundFontPath, isLooping, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // Sync isLooping prop with API
    useEffect(() => {
        if (apiRef.current && apiRef.current.isLooping !== undefined) {
            console.log(`🔄 Syncing loop state: ${isLooping}`);
            apiRef.current.isLooping = isLooping;
        }
    }, [isLooping]);

    // 🆕 CREATE REAL DOM HANDLES after rendering
    useEffect(() => {
        if (!containerRef.current || !isRendered) return;

        console.log('🎨 Creating real DOM handles...');
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

    // 🆕 UPDATE HANDLE POSITIONS when playback range changes
    useEffect(() => {
        if (!apiRef.current || !containerRef.current || !startHandleRef.current || !endHandleRef.current) {
            return;
        }

        const api = apiRef.current;

        // Initial position update
        updateHandlePositions(api, containerRef.current, startHandleRef.current, endHandleRef.current);

        // Listen for playback range changes
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
        };
    }, [isRendered]);

    // Setup touch selection with REAL handles
    useEffect(() => {
        if (!enableTouchSelection || !apiRef.current || !containerRef.current || !isRendered) {
            return;
        }

        if (!isLooping) {
            console.log('🔒 Touch selection DISABLED - loop is OFF');
            return;
        }

        if (!startHandleRef.current || !endHandleRef.current) {
            console.log('⏳ Waiting for handles to be created...');
            return;
        }

        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current && startHandleRef.current && endHandleRef.current) {
                console.log('🎯 Setting up touch selection with REAL handles...');
                const cleanup = setupTouchSelection(
                    apiRef.current,
                    containerRef.current,
                    startHandleRef.current,
                    endHandleRef.current
                );

                return () => {
                    console.log('🧹 Cleaning up touch selection');
                    cleanup();
                };
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
        };
    }, [isRendered, enableTouchSelection, isLooping]);

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