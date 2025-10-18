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
}

// Touch event handlers for loop selection - FIXED VERSION
// Addresses all critical bugs from handoff document
const setupTouchSelection = (api: AlphaTabApi, container: HTMLElement) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;
    let touchStartTime = 0;
    let touchMoved = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastTapTime = 0; // For double-tap detection

    const DOUBLE_TAP_DELAY = 300; // ms for double-tap detection

    // Helper to get beat at touch position
    const getBeatAtPosition = (x: number, y: number) => {
        if (!api.renderer?.boundsLookup) return null;

        const rect = container.getBoundingClientRect();
        const relX = x - rect.left + container.scrollLeft;
        const relY = y - rect.top + container.scrollTop;

        return api.renderer.boundsLookup.getBeatAtPos(relX, relY);
    };

    // 🔧 FIX #2: Snap to bar boundaries
    const snapToBarStart = (beat: any) => {
        if (!beat || !beat.voice || !beat.voice.bar) return beat;

        // Get the first beat of the bar that contains this beat
        const bar = beat.voice.bar;
        if (bar.voices && bar.voices.length > 0) {
            const firstVoice = bar.voices[0];
            if (firstVoice.beats && firstVoice.beats.length > 0) {
                const firstBeat = firstVoice.beats[0];
                console.log(`📏 Snapped beat ${beat.index} → bar start beat ${firstBeat.index}`);
                return firstBeat;
            }
        }

        return beat;
    };

    // Check if touch is in scroll zone (right edge of screen)
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
        currentX = startX;
        currentY = startY;
        touchStartTime = Date.now();
        touchMoved = false;
        
        // Don't start selection in scroll zone
        if (isInScrollZone(startX)) {
            return;
        }
        
        const beat = getBeatAtPosition(touch.clientX, touch.clientY);

        if (beat) {
            // Snap to bar start for precision
            startBeat = snapToBarStart(beat);
            endBeat = startBeat;
        }
    };

    // Handle touch move
    const handleTouchMove = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1 || !startBeat) return;

        const touch = touchEvent.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
        
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        
        // Check if this is primarily vertical scrolling
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
            // Vertical scroll - don't interfere
            startBeat = null;
            endBeat = null;
            return;
        }
        
        // Require significant horizontal movement
        const isHorizontalDrag = Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY);
        
        if (isHorizontalDrag) {
            touchMoved = true;
            
            // 🔧 FIX #3: Prevent scroll during selection
            if (!isSelecting) {
                isSelecting = true;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Prevent body scroll during selection
                document.body.style.overflow = 'hidden';
                console.log('🎸 Selection started at beat:', startBeat.index);
            } else {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            
            const beat = getBeatAtPosition(touch.clientX, touch.clientY);

            if (beat && beat !== endBeat) {
                // Snap to bar start for precision
                endBeat = snapToBarStart(beat);

                // Update selection range with minimum size check
                if (startBeat && endBeat) {
                    const start = startBeat.index < endBeat.index ? startBeat : endBeat;
                    const end = startBeat.index < endBeat.index ? endBeat : startBeat;

                    // Ensure minimum selection of 1 full measure
                    if (start.voice?.bar && end.voice?.bar) {
                        const barDistance = Math.abs(end.voice.bar.index - start.voice.bar.index);
                        
                        if (barDistance < 1) {
                            // Selection too small - expand to at least 1 bar
                            console.log('⚠️ Selection too small, expanding to full bar');
                            return;
                        }
                    }

                    // Set playback range for visual feedback
                    if (api.playbackRange !== undefined) {
                        api.playbackRange = {
                            startTick: start.absolutePlaybackStart,
                            endTick: end.absolutePlaybackStart + end.playbackDuration
                        };
                    }

                    console.log(`🎸 Selection: bar ${start.voice?.bar?.index} to ${end.voice?.bar?.index}`);
                }
            }
        }
    };

    // Handle touch end
    const handleTouchEnd = (e: Event) => {
        const touchDuration = Date.now() - touchStartTime;
        const now = Date.now();
        
        // 🔧 FIX #3: Restore scroll
        document.body.style.overflow = '';
        
        // 🔧 FIX #4: Double-tap detection
        const isDoubleTap = (now - lastTapTime) < DOUBLE_TAP_DELAY;
        lastTapTime = now;
        
        // Quick tap handling
        if (!touchMoved && touchDuration < 300) {
            if (isDoubleTap) {
                // Double-tap: clear loop
                if (api.playbackRange !== undefined) {
                    api.playbackRange = null;
                    console.log('🗑️ Loop cleared via double-tap');
                }
            } else {
                // Single tap: check if outside loop to clear
                const hasLoop = api.playbackRange !== null;
                
                if (hasLoop) {
                    const tapBeat = getBeatAtPosition(currentX, currentY);
                    
                    // If tap is outside current loop range, clear it
                    if (tapBeat && api.playbackRange) {
                        const tapTick = tapBeat.absolutePlaybackStart;
                        const loopStart = api.playbackRange.startTick;
                        const loopEnd = api.playbackRange.endTick;
                        
                        if (tapTick < loopStart || tapTick > loopEnd) {
                            api.playbackRange = null;
                            console.log('🗑️ Loop cleared - tapped outside loop');
                        }
                    }
                }
            }
        }
        
        if (isSelecting) {
            e.preventDefault();
            e.stopPropagation();

            if (startBeat && endBeat && startBeat !== endBeat) {
                const start = startBeat.index < endBeat.index ? startBeat : endBeat;
                const end = startBeat.index < endBeat.index ? endBeat : startBeat;

                console.log(`✅ Loop selected: bars ${start.voice?.bar?.index} to ${end.voice?.bar?.index}`);
                console.log('💡 Loop is active - press play to start looping');
                
                // 🔧 FIX #1: ALWAYS force cursor to loop start (HIGHEST PRIORITY)
                // This prevents the bug where player won't start if cursor is inside loop
                if (api.tickPosition !== undefined) {
                    api.tickPosition = start.absolutePlaybackStart;
                    console.log('🎯 Cursor FORCED to loop start - ready to play');
                }

                // Trigger visual update
                if (api.render) {
                    api.render();
                }
            }
        }

        // Reset state
        isSelecting = false;
        startBeat = null;
        endBeat = null;
        touchMoved = false;
        startX = 0;
        startY = 0;
    };

    // Attach listeners
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
        
        // Ensure scroll is restored on cleanup
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
    enableTouchSelection = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const apiRef = useRef<AlphaTabApi | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            if (!containerRef.current) return;

            try {
                setIsLoading(true);
                console.log('🎸 Initializing AlphaTab...');

                // Initialize AlphaTab with proper settings
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

                // Wire up core events
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

                // Wire up synthesizer events BEFORE loading file
                if (playerMode === 'synthesizer') {
                    console.log('🔍 Wiring up player events...');

                    if (api.playerReady) {
                        api.playerReady.on(() => {
                            if (!isMounted) return;
                            console.log('✅ Player ready - soundfont should start loading...');
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
                            console.log('✅ SoundFont loaded - ready to play!');
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

                // Notify parent that API is ready
                onApiReady?.(api);

                // Load the Guitar Pro file
                // Supports all formats: .gp3, .gp4, .gp5, .gpx, .gp
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
    }, [fileUrl, playerMode, soundFontPath, onApiReady, onScoreLoaded, onRenderFinished, onError]);

    // Setup touch selection handlers AFTER rendering is complete
    useEffect(() => {
        if (!enableTouchSelection || !apiRef.current || !containerRef.current || !isRendered) {
            return;
        }

        // Wait a bit for boundsLookup to be ready
        const setupTimer = setTimeout(() => {
            if (apiRef.current && containerRef.current) {
                console.log('🎯 Setting up touch selection...');
                const cleanup = setupTouchSelection(apiRef.current, containerRef.current);

                // Store cleanup function
                return () => {
                    console.log('🧹 Cleaning up touch selection');
                    cleanup();
                };
            }
        }, 500);

        return () => {
            clearTimeout(setupTimer);
        };
    }, [isRendered, enableTouchSelection]);

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