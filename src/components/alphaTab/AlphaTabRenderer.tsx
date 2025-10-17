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

// Touch event handlers for loop selection
const setupTouchSelection = (api: AlphaTabApi, container: HTMLElement) => {
    let startBeat: any = null;
    let endBeat: any = null;
    let isSelecting = false;
    let touchStartTime = 0;
    let touchMoved = false;

    // Helper to get beat at touch position
    const getBeatAtPosition = (x: number, y: number) => {
        if (!api.renderer?.boundsLookup) return null;

        // Convert touch coordinates to container-relative
        const rect = container.getBoundingClientRect();
        const relX = x - rect.left + container.scrollLeft;
        const relY = y - rect.top + container.scrollTop;

        return api.renderer.boundsLookup.getBeatAtPos(relX, relY);
    };

    // Handle touch start
    const handleTouchStart = (e: Event) => {
        const touchEvent = e as TouchEvent;
        // Only handle single-finger touch
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        touchStartTime = Date.now();
        touchMoved = false;

        const beat = getBeatAtPosition(touch.clientX, touch.clientY);

        if (beat) {
            startBeat = beat;
            endBeat = beat;
            // Don't set isSelecting yet - wait for movement
        }
    };

    // Handle touch move
    const handleTouchMove = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1 || !startBeat) return;

        touchMoved = true;

        const touch = touchEvent.touches[0];
        const beat = getBeatAtPosition(touch.clientX, touch.clientY);

        if (beat && beat !== endBeat) {
            // Only start selecting if user has moved significantly
            if (!isSelecting) {
                isSelecting = true;
                e.preventDefault();
                e.stopPropagation();
                console.log('🎸 Selection started at beat:', startBeat.index);
            }

            endBeat = beat;

            // Update selection range in AlphaTab
            if (startBeat && endBeat) {
                // Ensure correct order
                const start = startBeat.index < endBeat.index ? startBeat : endBeat;
                const end = startBeat.index < endBeat.index ? endBeat : startBeat;

                // Set playback range
                if (api.playbackRange !== undefined) {
                    api.playbackRange = {
                        startTick: start.absolutePlaybackStart,
                        endTick: end.absolutePlaybackStart + end.playbackDuration
                    };
                }

                console.log(`🎸 Selection: beat ${start.index} to ${end.index}`);
            }
        }
    };

    // Handle touch end
    const handleTouchEnd = (e: Event) => {
        const touchDuration = Date.now() - touchStartTime;

        // If it was a quick tap without movement, clear any loop selection
        if (!touchMoved && touchDuration < 300) {
            if (api.playbackRange !== undefined) {
                api.playbackRange = null;
                console.log('🎸 Loop cleared - ready for full playback');
            }
        }

        if (isSelecting) {
            e.preventDefault();
            e.stopPropagation();

            if (startBeat && endBeat) {
                const start = startBeat.index < endBeat.index ? startBeat : endBeat;
                const end = startBeat.index < endBeat.index ? endBeat : startBeat;

                console.log(`✅ Loop selected: beats ${start.index} to ${end.index}`);

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
    };

    // Attach listeners with passive: false to allow preventDefault
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