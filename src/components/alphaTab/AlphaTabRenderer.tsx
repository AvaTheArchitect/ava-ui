'use client';

/**
 * AlphaTab Renderer - V97.57: REMOVE DUPLICATE ORIENTATION LISTENER
 * Base: V97.56 + Critical Fix
 * Date: January 3rd, 2026
 *
 * 🔧 V97.57 CRITICAL FIX - ROOT CAUSE FOUND:
 * ❌ REMOVED: Internal mediaQuery listener (was causing double-fire)
 * ✅ FIXED: Now ONLY responds to isMobileLandscape prop changes
 * ✅ REASON: synth-player/page.tsx already has orientation detection
 * 
 * 🎯 The Problem (V97.56 and earlier):
 * - synth-player detects rotation → updates isMobileLandscape prop
 * - AlphaTabRenderer prop changes → triggers orientation effect
 * - mediaQuery listener ALSO fires → triggers effect AGAIN
 * - Result: Double/triple renders = glitching + state corruption
 * 
 * 🎯 The Solution (V97.57):
 * - Parent (synth-player) handles ALL orientation detection
 * - AlphaTabRenderer just responds to prop changes
 * - NO internal mediaQuery listener
 * - Single, clean render on orientation change
 * 
 * 🔒 PRESERVED FROM V97.56:
 * ✅ V97.24's simple orientation handling (scrollOffset at 25%)
 * ✅ AudioContext resume for synth mode
 * ✅ Single-click loop move (Songsterr behavior)
 * ✅ renderCycle dependencies for handlers
 * ✅ V97.18 architecture
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
    scrollContainerRef?: React.RefObject<HTMLElement>;
    isMobileLandscape?: boolean;
    audioSource?: 'synth' | 'original';
    isLooping?: boolean;
    onLoopRangeChange?: (start: number | null, end: number | null) => void;
    externalMediaHandler?: any;
    isSeeking?: boolean;
    isPlaying?: boolean;
    theme?: 'light' | 'dark';
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

    const offsets = [0, -4, 4, -8, 8];
    for (const offset of offsets) {
        const beat = api.renderer.boundsLookup.getBeatAtPos(relX + offset, relY);
        if (beat) {
            console.log(`✅ V97.57: getBeatAtPos success with offset ${offset}px`);
            return beat;
        }
    }

    console.warn('⚠️ V97.57: getBeatAtPos failed with all offsets');
    return null;
};

const getBarBoundariesFromMaster = (api: AlphaTabApi, beat: any): { startTick: number; endTick: number } | null => {
    if (!beat) return null;

    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;

    if (!master) {
        console.warn('🔍 V97.57: No masterBarBounds available');
        return null;
    }

    if (master.startTick !== undefined && master.endTick !== undefined) {
        console.log('✅ V97.57: Using master.startTick/endTick:', {
            startTick: master.startTick,
            endTick: master.endTick
        });
        return { startTick: master.startTick, endTick: master.endTick };
    }

    if (Array.isArray(master.beats) && master.beats.length > 0) {
        const first = master.beats[0];
        const last = master.beats[master.beats.length - 1];
        const startTick = first.absolutePlaybackStart;
        const endTick = last.absolutePlaybackStart + (last.playbackDuration || 0);

        console.log('✅ V97.57: Calculated from master.beats[]:', {
            startTick,
            endTick,
            beatCount: master.beats.length
        });
        return { startTick, endTick };
    }

    console.warn('⚠️ V97.57: Master has no startTick/endTick or beats[]');
    return null;
};

const getBarBoundaries = (beat: any): { startTick: number; endTick: number } | null => {
    if (!beat || !beat.voice || !beat.voice.bar) {
        console.warn('🔍 V97.57: getBarBoundaries - invalid beat structure');
        return null;
    }

    const bar = beat.voice.bar;
    let barStartTick = Number.MAX_SAFE_INTEGER;
    let barEndTick = 0;

    for (const voice of bar.voices) {
        if (voice.beats && voice.beats.length > 0) {
            const firstBeat = voice.beats[0];
            const lastBeat = voice.beats[voice.beats.length - 1];

            const voiceStart = firstBeat.absolutePlaybackStart;
            const voiceEnd = lastBeat.absolutePlaybackStart + lastBeat.playbackDuration;

            barStartTick = Math.min(barStartTick, voiceStart);
            barEndTick = Math.max(barEndTick, voiceEnd);
        }
    }

    const result = barStartTick !== Number.MAX_SAFE_INTEGER
        ? { startTick: barStartTick, endTick: barEndTick }
        : null;

    console.log('🔍 V97.57: getBarBoundaries (legacy fallback):', result);
    return result;
};

const getFirstBeatInBar = (api: AlphaTabApi, beat: any): any => {
    if (!beat) return beat;

    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;

    if (master) {
        if (master.firstBeat) {
            console.log(`✅ V97.57: Using master.firstBeat at tick ${master.firstBeat.absolutePlaybackStart}`);
            return master.firstBeat;
        }

        if (Array.isArray(master.beats) && master.beats.length > 0) {
            console.log(`✅ V97.57: Using master.beats[0] at tick ${master.beats[0].absolutePlaybackStart}`);
            return master.beats[0];
        }
    }

    if ((beat as any).beatIndexInBar === 0) {
        console.log(`✅ V97.57: Beat already first (beatIndexInBar=0) at tick ${beat.absolutePlaybackStart}`);
        return beat;
    }

    if (beat.voice?.bar?.voices) {
        const bar = beat.voice.bar;
        for (const voice of bar.voices) {
            if (voice.beats && voice.beats.length > 0) {
                const firstBeat = voice.beats[0];
                if (firstBeat.index === 0 || (firstBeat as any).beatIndexInBar === 0) {
                    console.log(`✅ V97.57: Found first beat via voice scan at tick ${firstBeat.absolutePlaybackStart}`);
                    return firstBeat;
                }
            }
        }
    }

    try {
        const tickCache = (api as any).tickCache;
        if (tickCache && beat.absolutePlaybackStart !== undefined) {
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            for (let t = beat.absolutePlaybackStart; t >= Math.max(0, beat.absolutePlaybackStart - 2000); t--) {
                const res = tickCache.findBeat(trackIndices, t);
                if (res?.beat && (res.beat as any).beatIndexInBar === 0) {
                    console.log(`✅ V97.57: Found first beat via tickCache scan at tick ${res.beat.absolutePlaybackStart}`);
                    return res.beat;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ V97.57: tickCache scan failed:', err);
    }

    console.warn('⚠️ V97.57: Could not find first beat, using original');
    return beat;
};

// ==================== TOUCH SELECTION ====================

const setupTouchSelection = (
    api: AlphaTabApi,
    container: HTMLElement
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
            startBeat = getFirstBeatInBar(api, beat);
            endBeat = beat;
            console.log(`📱 V97.57: Touch start - forced to bar start tick ${startBeat.absolutePlaybackStart}`);
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
                    let startBoundaries = getBarBoundariesFromMaster(api, startBeat);
                    let endBoundaries = getBarBoundariesFromMaster(api, endBeat);

                    if (!startBoundaries) startBoundaries = getBarBoundaries(startBeat);
                    if (!endBoundaries) endBoundaries = getBarBoundaries(endBeat);

                    if (startBoundaries && endBoundaries) {
                        const loopStart = Math.min(startBoundaries.startTick, endBoundaries.startTick);
                        const loopEnd = Math.max(startBoundaries.endTick, endBoundaries.endTick);

                        api.playbackRange = {
                            startTick: loopStart,
                            endTick: loopEnd,
                        };
                        console.log(`📱 V97.57: Touch drag - ${loopStart} to ${loopEnd}`);
                    }
                }
            }
        }
    };

    const handleTouchEnd = () => {
        const now = Date.now();
        document.body.style.overflow = '';

        const timeSinceLastTap = now - lastTapTime;
        const isDoubleTap =
            timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 50;
        lastTapTime = now;

        if (!touchMoved && Date.now() - touchStartTime < 400) {
            if (isDoubleTap && api.playbackRange) {
                api.playbackRange = null;
                console.log('📱 V97.57: Double-tap - cleared loop');
            }
        }

        isSelecting = false;
        startBeat = null;
        endBeat = null;
        touchMoved = false;
    };

    const surface = container.querySelector('.at-surface');
    const target = (surface as HTMLElement) || container;

    target.addEventListener('touchstart', handleTouchStart as EventListener, {
        passive: true,
    });
    target.addEventListener('touchmove', handleTouchMove as EventListener, {
        passive: false,
    });
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

// ==================== COMPONENT ====================

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
    externalMediaHandler,
    scrollContainerRef,
    isMobileLandscape = false,
    isLooping = false,
    onLoopRangeChange,
    audioSource = 'synth',
    isSeeking = false,
    isPlaying = false,
    theme = 'light',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<AlphaTabApi | null>(null);

    const lastLoadedFileRef = useRef<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const [renderCycle, setRenderCycle] = useState(0);

    const lastThemeRef = useRef<string>('');

    useEffect(() => {
        if (isSeeking || isPlaying) {
            console.log(`🔒 V97.57: State - seeking:${isSeeking}, playing:${isPlaying}`);
        }
    }, [isSeeking, isPlaying]);

    useEffect(() => {
        console.log(`🔄 V97.57: Render cycle: ${renderCycle}`);
    }, [renderCycle]);

    const startHandleRef = useRef<HTMLDivElement | null>(null);
    const endHandleRef = useRef<HTMLDivElement | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    const mouseCleanupRef = useRef<(() => void) | null>(null);
    const touchCleanupRef = useRef<(() => void) | null>(null);
    const initialFileLoadedRef = useRef(false);

    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileKeywords.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
        return isMobileUA || (isTouchDevice && isSmallScreen);
    };

    const [isMobile] = useState(detectMobile());

    // ========== INIT ALPHATAB ==========

    useEffect(() => {
        let destroyed = false;

        const initAndLoad = async () => {
            if (!containerRef.current) return;
            if (apiRef.current) return;

            try {
                setIsLoading(true);
                setRenderCycle(rc => rc + 1);
                console.log('🎵 V97.57: Initializing AlphaTab...');

                const scrollElement = scrollContainerRef?.current || document.body;

                const api = await initAlphaTab({
                    container: containerRef.current,
                    playerMode,
                    enableCursor: true,
                    layoutMode: 'page',
                    soundFontPath,
                    isMobile,
                    enableUserInteraction: false,
                    scrollContainer: scrollElement,
                });

                if (destroyed) {
                    api.destroy();
                    return;
                }

                apiRef.current = api;
                console.log('✅ V97.57: AlphaTab initialized');

                (window as any).__at = api;
                console.log('🔍 DEBUG: Exposed AlphaTab API as window.__at');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 V97.57: File loaded');
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                api.scoreLoaded.on((score: any) => {
                    console.log('📊 V97.57: Score loaded');
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

                    if (api && !destroyed) {
                        api.updateSettings();
                        api.render();
                        console.log('✅ V97.57: Layout recalculated');

                        lastThemeRef.current = '';
                        console.log('🎨 V97.57: Reset theme ref - effect will reapply theme');
                    }
                });

                api.renderFinished.on(() => {
                    console.log('🎨 V97.57: Render finished');
                    setIsRendered(true);
                    setIsLoading(false);
                    setRenderCycle(rc => rc + 1);
                    onRenderFinished?.();
                });

                onApiReady?.(api);
            } catch (err) {
                console.error('❌ V97.57: Init error:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                setIsLoading(false);
                onError?.(errorMsg);
            }
        };

        initAndLoad();

        return () => {
            destroyed = true;
            if (apiRef.current) {
                try {
                    apiRef.current.destroy();
                } catch (e) {
                    console.error('Error destroying AlphaTab', e);
                }
                apiRef.current = null;
            }
            delete (window as any).__at;
        };
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE CHANGES + AUDIOCONTEXT RESUME ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        console.log(`🔄 V97.57: Updating player mode to: ${playerMode}`);
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();

        // 🔧 V97.57: Resume AudioContext when switching to synth mode
        if (playerMode === 'synthesizer') {
            api.render();

            setTimeout(() => {
                const audioCtx = (api.player as any)?.audioContext;
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume().then(() => {
                        console.log('🎵 V97.57: AudioContext resumed for Synth mode');
                    }).catch((err: any) => {
                        console.warn('⚠️ V97.57: Failed to resume AudioContext:', err);
                    });
                } else {
                    console.log(`🎵 V97.57: AudioContext state: ${audioCtx?.state || 'unknown'}`);
                }
            }, 100);
        }
    }, [playerMode]);

    // ========== ATTACH EXTERNAL HANDLER ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        if (externalMediaHandler) {
            const output = api.player.output as any;
            output.handler = externalMediaHandler;
            console.log('🔗 V97.57: External handler attached');

            return () => {
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                        console.log('🔌 V97.57: Handler detached');
                    }
                }
            };
        } else {
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V97.57: Handler cleared');
            }
        }
    }, [externalMediaHandler]);

    // ========== LOAD NEW FILE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;

        if (lastLoadedFileRef.current === fileUrl) {
            console.log('⏭️ V97.57: Same file, skipping reload');
            return;
        }

        const loadNewFile = async () => {
            try {
                console.log(`🔄 V97.57: Loading new file: ${fileUrl}`);

                lastThemeRef.current = '';
                console.log('🎨 V97.57: Reset theme ref for new file');

                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
                console.log('✅ V97.57: New file loaded');
            } catch (err) {
                console.error('❌ V97.57: Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== ORIENTATION HANDLING - V97.57 CRITICAL FIX ==========
    // 🚫 REMOVED: Internal mediaQuery listener (was causing duplicate triggers)
    // ✅ NOW: Only responds to isMobileLandscape prop changes (parent manages detection)

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;
        if (!containerRef.current) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const handleOrientationChange = async () => {
            const alphaTab = await import('@coderline/alphatab');

            const isLandscape = isMobileLandscape || (isMobile && window.innerWidth > window.innerHeight);

            console.log(`🔄 V97.57: Orientation - isLandscape:${isLandscape}, isMobile:${isMobile}`);

            if (isLandscape) {
                console.log('🎸 V97.57: LANDSCAPE mode (V97.24 settings)');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                api.settings.player.scrollElement = container;

                // 🎯 V97.57: V97.24's proven setting - single scrollOffset at 25%
                const horizontalOffset = container.clientWidth * 0.25;
                (api.settings.player as any).scrollOffset = horizontalOffset;

                console.log(`📐 V97.57: Horizontal layout, scrollOffset=${horizontalOffset.toFixed(0)}px (25% of ${container.clientWidth}px)`);
            } else {
                console.log('📱 V97.57: PORTRAIT/DESKTOP mode (V97.24 settings)');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                const scrollElement = scrollContainerRef?.current || document.documentElement;
                api.settings.player.scrollElement = scrollElement;

                // 🎯 V97.57: V97.24's proven setting - single scrollOffset at 100px
                (api.settings.player as any).scrollOffset = 100;

                console.log('📐 V97.57: Page layout, scrollOffset=100px');
            }

            // 🎯 V97.57: V97.24's simple render (NO aggressive sequence)
            await api.updateSettings();
            window.dispatchEvent(new Event('resize'));
            await new Promise((r) => setTimeout(r, 50));
            api.render();
        };

        handleOrientationChange();

        // 🚫 V97.57: REMOVED mediaQuery listener - parent handles orientation
        // This was causing duplicate triggers with synth-player/page.tsx

    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef, isMobile]);

    // ========== THEME (DARK/LIGHT) ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isRendered) return;

        if (lastThemeRef.current === theme) return;

        const applyTheme = async () => {
            const alphaTab = await import('@coderline/alphatab');
            console.log(`🎨 V97.57: Applying ${theme} theme (renderCycle: ${renderCycle})`);
            lastThemeRef.current = theme;

            const resources = api.settings.display.resources as any;

            if (theme === 'dark') {
                resources.staffLineColor = new alphaTab.model.Color(85, 85, 85, 255);
                resources.barSeparatorColor = new alphaTab.model.Color(136, 136, 136, 255);
                resources.mainGlyphColor = new alphaTab.model.Color(255, 255, 255, 255);
                resources.secondaryGlyphColor = new alphaTab.model.Color(224, 224, 224, 255);
                resources.scoreInfoColor = new alphaTab.model.Color(255, 255, 255, 255);
                resources.barNumberColor = new alphaTab.model.Color(153, 153, 153, 255);
            } else {
                resources.staffLineColor = new alphaTab.model.Color(153, 153, 153, 255);
                resources.barSeparatorColor = new alphaTab.model.Color(102, 102, 102, 255);
                resources.mainGlyphColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.secondaryGlyphColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.scoreInfoColor = new alphaTab.model.Color(0, 0, 0, 255);
                resources.barNumberColor = new alphaTab.model.Color(102, 102, 102, 255);
            }

            await api.updateSettings();
            api.render();
            console.log(`✅ V97.57: Theme ${theme} applied successfully`);
        };

        applyTheme();
    }, [theme, isRendered, renderCycle]);

    // ========== DYNAMIC USER INTERACTION - DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        (api.settings.player as any).enableUserInteraction = false;
        api.updateSettings();
        console.log('🔒 V97.57: enableUserInteraction locked to FALSE');
    }, [isLooping]);

    // ========== INSTANT LOOP AT CURSOR ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) return;

        if (!api.playbackRange && api.tickPosition !== undefined) {
            const currentTick = api.tickPosition;
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            const tickCache = (api as any).tickCache;

            if (tickCache) {
                const beatResult = tickCache.findBeat(trackIndices, currentTick);

                if (beatResult?.beat) {
                    const firstBeat = getFirstBeatInBar(api, beatResult.beat);

                    let boundaries = getBarBoundariesFromMaster(api, firstBeat);
                    if (!boundaries) {
                        console.warn('⚠️ V97.57: Master boundaries unavailable, using legacy');
                        boundaries = getBarBoundaries(firstBeat);
                    }

                    if (boundaries) {
                        api.playbackRange = {
                            startTick: boundaries.startTick,
                            endTick: boundaries.endTick,
                        };
                        console.log(`🔁 V97.57: Initial loop - bar ${boundaries.startTick} to ${boundaries.endTick}`);
                    }
                }
            }
        }
    }, [isLooping, isRendered]);

    // ========== LOOP HANDLES CLEANUP ==========

    useEffect(() => {
        if (startHandleRef.current) {
            startHandleRef.current.remove();
            startHandleRef.current = null;
        }
        if (endHandleRef.current) {
            endHandleRef.current.remove();
            endHandleRef.current = null;
        }
    }, [isLooping]);

    // ========== DRAG CLEANUP ==========

    useEffect(() => {
        return () => {
            if (dragCleanupRef.current) {
                dragCleanupRef.current();
                dragCleanupRef.current = null;
            }
        };
    }, [isLooping, onLoopRangeChange]);

    // ========== PLAYBACK RANGE CHANGES ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        const handleRangeChange = (e: any) => {
            if (e.playbackRange) {
                const { startTick, endTick } = e.playbackRange;
                onLoopRangeChange?.(startTick, endTick);
            } else {
                onLoopRangeChange?.(null, null);
            }
        };

        const handleRenderFinished = () => {
            // AlphaTab native handles reposition automatically
        };

        api.playbackRangeChanged.on(handleRangeChange);
        api.renderFinished.on(handleRenderFinished);

        return () => {
            api.playbackRangeChanged.off(handleRangeChange);
            api.renderFinished.off(handleRenderFinished);
        };
    }, [onLoopRangeChange, isLooping, fileUrl]);

    // ========== SINGLE CLICK SEEK (loop off) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) {
            console.log(`🔍 V97.57: Click handler NOT attached (isLooping=${isLooping})`);
            return;
        }

        console.log(`🖱️ V97.57: Single-click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.57: Click BLOCKED (seeking && playing)`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;
                api.tickPosition = tickPosition;
                console.log(`🖱️ V97.57: Single-click seek to ${tickPosition}ms`);
            }
        };

        target.addEventListener('click', handleClick);

        return () => {
            target.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]);

    // ========== SINGLE CLICK LOOP MOVE (loop on) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) {
            return;
        }

        console.log(`🔁 V97.57: Loop-move click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleLoopMoveClick = (e: MouseEvent) => {
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            const firstBeat = getFirstBeatInBar(api, beat);

            let boundaries = getBarBoundariesFromMaster(api, firstBeat);
            if (!boundaries) {
                console.warn('⚠️ V97.57: Master boundaries unavailable, using legacy');
                boundaries = getBarBoundaries(firstBeat);
            }

            if (boundaries) {
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
                console.log(`🔁 V97.57: Loop moved to bar ${boundaries.startTick} - ${boundaries.endTick}`);
            }
        };

        target.addEventListener('click', handleLoopMoveClick);

        return () => {
            target.removeEventListener('click', handleLoopMoveClick);
        };
    }, [isRendered, isLooping, renderCycle]);

    // ========== DOUBLE CLICK PLAY (loop off) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) return;

        console.log(`🖱️🖱️ V97.57: Double-click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleDoubleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.57: Double-click BLOCKED`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                console.log(`🖱️🖱️ V97.57: Double-click at ${tickPosition}ms`);

                if (audioSource === 'synth') {
                    api.tickPosition = tickPosition;
                    api.play?.();
                    console.log('🎵 V97.57: SYNTH - play');
                } else {
                    const output = api.player?.output as any;

                    if (output?.handler) {
                        api.tickPosition = tickPosition;

                        if (output.handler.play) {
                            console.log('🎬 V97.57: ORIGINAL - handler.play()');
                            output.handler.play();
                        }

                        api.play();
                        console.log('🎵 V97.57: ORIGINAL - api.play()');
                    } else {
                        console.warn('⚠️ V97.57: No handler for original mode');
                    }
                }
            }
        };

        target.addEventListener('dblclick', handleDoubleClick);

        return () => {
            target.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]);

    // ========== MOUSE DRAG SELECTION (loop on) ==========

    useEffect(() => {
        if (mouseCleanupRef.current) {
            mouseCleanupRef.current();
            mouseCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) return;

        let startBeat: any = null;
        let endBeat: any = null;
        let isDragging = false;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            isDragging = true;

            startBeat = getFirstBeatInBar(api, beat);
            endBeat = beat;

            console.log(`🖱️ V97.57: Mouse down - bar start tick ${startBeat.absolutePlaybackStart}`);

            let boundaries = getBarBoundariesFromMaster(api, startBeat);
            if (!boundaries) {
                console.warn('⚠️ V97.57: Master boundaries unavailable, using legacy');
                boundaries = getBarBoundaries(startBeat);
            }

            if (boundaries) {
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
                console.log(`🖱️ V97.57: Initial loop ${boundaries.startTick} to ${boundaries.endTick}`);
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !startBeat) return;
            e.preventDefault();

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat || beat === endBeat) return;

            endBeat = beat;

            let startBoundaries = getBarBoundariesFromMaster(api, startBeat);
            let endBoundaries = getBarBoundariesFromMaster(api, endBeat);

            if (!startBoundaries) startBoundaries = getBarBoundaries(startBeat);
            if (!endBoundaries) endBoundaries = getBarBoundaries(endBeat);

            if (startBoundaries && endBoundaries) {
                const loopStart = Math.min(startBoundaries.startTick, endBoundaries.startTick);
                const loopEnd = Math.max(startBoundaries.endTick, endBoundaries.endTick);

                api.playbackRange = {
                    startTick: loopStart,
                    endTick: loopEnd,
                };
                console.log(`🖱️ V97.57: Mouse drag - ${loopStart} to ${loopEnd}`);
            }
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            startBeat = null;
            endBeat = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            console.log('🖱️ V97.57: Mouse up - drag complete');
        };

        const handleDoubleClick = (e: MouseEvent) => {
            if (api.playbackRange) {
                api.playbackRange = null;
                console.log('🖱️🖱️ V97.57: Double-click - cleared loop');
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

    // ========== TOUCH DRAG SELECTION (loop on, mobile) ==========

    useEffect(() => {
        if (touchCleanupRef.current) {
            touchCleanupRef.current();
            touchCleanupRef.current = null;
        }

        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping || !isMobile) return;

        const setupTimer = setTimeout(() => {
            if (api && container) {
                touchCleanupRef.current = setupTouchSelection(api, container);
                console.log('📱 V97.57: Touch selection enabled');
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

    // ========== LOOP PLAYBACK ENFORCEMENT ==========

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
            }
        };

        api.playerPositionChanged.on(handlePlayerPositionChanged);

        return () => {
            api.playerPositionChanged.off(handlePlayerPositionChanged);
        };
    }, [isLooping]);

    // ========== CLEAR LOOP WHEN DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        if (!isLooping && api.playbackRange) {
            api.playbackRange = null;
        }
    }, [isLooping]);

    // ========== RENDER ==========

    const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    const loadingBgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
    const loadingTextColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-700';

    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center ${loadingBgColor} rounded-xl z-10`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className={`${loadingTextColor} font-medium`}>
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
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor,
                    position: 'relative',
                    zIndex: 10,
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                }}
            />
        </div>
    );
};