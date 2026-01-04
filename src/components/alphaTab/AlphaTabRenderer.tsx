'use client';

/**
 * AlphaTab Renderer - V97.55: LANDSCAPE GLITCH FIX
 * Base: V97.54 Songsterr Loop Click Behavior
 * Date: January 4th, 2026
 *
 * 🔧 V97.55 CRITICAL FIX - LANDSCAPE MODE GLITCHING:
 * ✅ FIXED: Rendering loop when switching to Original mode in landscape
 * ✅ FIXED: Auto-scroll breaking after mode switch
 * ✅ FIXED: 10-20 second glitching/resizing in landscape
 * 
 * 🎯 Root Cause:
 * - Orientation effect was running on EVERY prop change
 * - No check for actual layout mode change
 * - Created infinite render loop until stabilization
 * - Corrupted scroll container during loop
 * 
 * 🎯 Solution:
 * - Added lastLayoutModeRef check (was declared but unused!)
 * - Only apply orientation changes when layout mode ACTUALLY changes
 * - Prevents unnecessary api.render() calls
 * - Preserves scroll container integrity
 * 
 * 🔒 PRESERVED FROM V97.54:
 * ✅ Songsterr loop click behavior
 * ✅ All existing functionality
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

// 🆕 V97.48: Robust beat detection with x-offset attempts (catches bar-line clicks)
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

    // Try exact position then small offsets left/right to catch clicks on bar lines
    const offsets = [0, -4, 4, -8, 8];
    for (const offset of offsets) {
        const beat = api.renderer.boundsLookup.getBeatAtPos(relX + offset, relY);
        if (beat) {
            console.log(`✅ V97.52: getBeatAtPos success with offset ${offset}px`);
            return beat;
        }
    }

    console.warn('⚠️ V97.51: getBeatAtPos failed with all offsets');
    return null;
};

// 🆕 V97.48: Prefer authoritative master start/end ticks if present
const getBarBoundariesFromMaster = (api: AlphaTabApi, beat: any): { startTick: number; endTick: number } | null => {
    if (!beat) return null;

    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;

    if (!master) {
        console.warn('🔍 V97.51: No masterBarBounds available');
        return null;
    }

    // Prefer authoritative master ticks
    if (master.startTick !== undefined && master.endTick !== undefined) {
        console.log('✅ V97.51: Using master.startTick/endTick:', {
            startTick: master.startTick,
            endTick: master.endTick
        });
        return { startTick: master.startTick, endTick: master.endTick };
    }

    // Fallback: Calculate from master.beats array
    if (Array.isArray(master.beats) && master.beats.length > 0) {
        const first = master.beats[0];
        const last = master.beats[master.beats.length - 1];
        const startTick = first.absolutePlaybackStart;
        const endTick = last.absolutePlaybackStart + (last.playbackDuration || 0);

        console.log('✅ V97.51: Calculated from master.beats[]:', {
            startTick,
            endTick,
            beatCount: master.beats.length
        });
        return { startTick, endTick };
    }

    console.warn('⚠️ V97.51: Master has no startTick/endTick or beats[]');
    return null;
};

// Get the full bar boundaries for proper bar-to-bar looping (legacy fallback)
const getBarBoundaries = (beat: any): { startTick: number; endTick: number } | null => {
    if (!beat || !beat.voice || !beat.voice.bar) {
        console.warn('🔍 V97.51: getBarBoundaries - invalid beat structure');
        return null;
    }

    const bar = beat.voice.bar;
    let barStartTick = Number.MAX_SAFE_INTEGER;
    let barEndTick = 0;

    // Find the earliest start and latest end across all voices in this bar
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

    console.log('🔍 V97.51: getBarBoundaries (legacy fallback):', result);
    return result;
};

// 🆕 V97.48: Prefer master-provided first beat with robust fallback chain
const getFirstBeatInBar = (api: AlphaTabApi, beat: any): any => {
    if (!beat) return beat;

    // Try masterBar.beats[0] first (most authoritative)
    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;

    if (master) {
        // Priority 1: master.firstBeat
        if (master.firstBeat) {
            console.log(`✅ V97.51: Using master.firstBeat at tick ${master.firstBeat.absolutePlaybackStart}`);
            return master.firstBeat;
        }

        // Priority 2: master.beats[0]
        if (Array.isArray(master.beats) && master.beats.length > 0) {
            console.log(`✅ V97.51: Using master.beats[0] at tick ${master.beats[0].absolutePlaybackStart}`);
            return master.beats[0];
        }
    }

    // Fallback 1: Check if current beat is already first (beatIndexInBar === 0)
    if ((beat as any).beatIndexInBar === 0) {
        console.log(`✅ V97.51: Beat already first (beatIndexInBar=0) at tick ${beat.absolutePlaybackStart}`);
        return beat;
    }

    // Fallback 2: Check beat.voice.bar.voices structure
    if (beat.voice?.bar?.voices) {
        const bar = beat.voice.bar;
        for (const voice of bar.voices) {
            if (voice.beats && voice.beats.length > 0) {
                const firstBeat = voice.beats[0];
                if (firstBeat.index === 0 || (firstBeat as any).beatIndexInBar === 0) {
                    console.log(`✅ V97.51: Found first beat via voice scan at tick ${firstBeat.absolutePlaybackStart}`);
                    return firstBeat;
                }
            }
        }
    }

    // Fallback 3: Scan tickCache backwards to find beatIndexInBar === 0
    try {
        const tickCache = (api as any).tickCache;
        if (tickCache && beat.absolutePlaybackStart !== undefined) {
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            // Search backwards up to 2000 ticks
            for (let t = beat.absolutePlaybackStart; t >= Math.max(0, beat.absolutePlaybackStart - 2000); t--) {
                const res = tickCache.findBeat(trackIndices, t);
                if (res?.beat && (res.beat as any).beatIndexInBar === 0) {
                    console.log(`✅ V97.51: Found first beat via tickCache scan at tick ${res.beat.absolutePlaybackStart}`);
                    return res.beat;
                }
            }
        }
    } catch (err) {
        console.warn('⚠️ V97.51: tickCache scan failed:', err);
    }

    console.warn('⚠️ V97.51: Could not find first beat, using original');
    return beat;
};

// ==================== TOUCH SELECTION - Bar-to-bar snapping ====================

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
            console.log(`📱 V97.51: Touch start - forced to bar start tick ${startBeat.absolutePlaybackStart}`);
        }
    };

    const handleTouchMove = (e: Event) => {
        const touchEvent = e as TouchEvent;
        if (touchEvent.touches.length !== 1) return;

        const touch = touchEvent.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (!startBeat) return;

        // cancel if mostly vertical scroll
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
                    // 🆕 V97.51: Try master boundaries first for both start and end
                    let startBoundaries = getBarBoundariesFromMaster(api, startBeat);
                    let endBoundaries = getBarBoundariesFromMaster(api, endBeat);

                    // Fallback to legacy if master unavailable
                    if (!startBoundaries) startBoundaries = getBarBoundaries(startBeat);
                    if (!endBoundaries) endBoundaries = getBarBoundaries(endBeat);

                    if (startBoundaries && endBoundaries) {
                        const loopStart = Math.min(startBoundaries.startTick, endBoundaries.startTick);
                        const loopEnd = Math.max(startBoundaries.endTick, endBoundaries.endTick);

                        api.playbackRange = {
                            startTick: loopStart,
                            endTick: loopEnd,
                        };
                        console.log(`📱 V97.51: Touch drag - ${loopStart} to ${loopEnd}`);
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

        // short tap / double-tap to clear loop
        if (!touchMoved && Date.now() - touchStartTime < 400) {
            if (isDoubleTap && api.playbackRange) {
                api.playbackRange = null;
                console.log('📱 V97.51: Double-tap - cleared loop');
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
    const lastLayoutModeRef = useRef<string | null>(null);

    const lastLoadedFileRef = useRef<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const [renderCycle, setRenderCycle] = useState(0);

    // Dark-mode tracking
    const lastThemeRef = useRef<string>('');

    useEffect(() => {
        if (isSeeking || isPlaying) {
            console.log(`🔒 V97.51: State - seeking:${isSeeking}, playing:${isPlaying}`);
        }
    }, [isSeeking, isPlaying]);

    useEffect(() => {
        console.log(`🔄 V97.51: Render cycle: ${renderCycle}`);
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
                console.log('🎵 V97.51: Initializing AlphaTab...');

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
                console.log('✅ V97.51: AlphaTab initialized');

                // 🔍 TEMPORARY: Expose API for debugging
                (window as any).__at = api;
                console.log('🔍 DEBUG: Exposed AlphaTab API as window.__at');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                console.log('📂 V97.51: File loaded');
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                api.scoreLoaded.on((score: any) => {
                    console.log('📊 V97.51: Score loaded');
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
                        console.log('✅ V97.51: Layout recalculated');

                        // 🎨 V97.51: Reset theme ref so theme effect will reapply
                        // Theme application happens in the theme effect, not here
                        lastThemeRef.current = '';
                        console.log('🎨 V97.51: Reset theme ref - effect will reapply theme');
                    }
                });

                api.renderFinished.on(() => {
                    console.log('🎨 V97.51: Render finished');
                    setIsRendered(true);
                    setIsLoading(false);
                    setRenderCycle(rc => rc + 1);
                    onRenderFinished?.();
                });

                onApiReady?.(api);
            } catch (err) {
                console.error('❌ V97.51: Init error:', err);
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
            // Cleanup debug exposure
            delete (window as any).__at;
        };
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE CHANGES ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        console.log(`🔄 V97.51: Updating player mode to: ${playerMode}`);
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();
    }, [playerMode]);

    // ========== ATTACH EXTERNAL HANDLER ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        if (externalMediaHandler) {
            const output = api.player.output as any;
            output.handler = externalMediaHandler;
            console.log('🔗 V97.51: External handler attached');

            return () => {
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                        console.log('🔌 V97.51: Handler detached');
                    }
                }
            };
        } else {
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V97.51: Handler cleared');
            }
        }
    }, [externalMediaHandler]);

    // ========== LOAD NEW FILE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;

        if (lastLoadedFileRef.current === fileUrl) {
            console.log('⏭️ V97.51: Same file, skipping reload');
            return;
        }

        const loadNewFile = async () => {
            try {
                console.log(`🔄 V97.51: Loading new file: ${fileUrl}`);

                // Reset theme ref so it will reapply when file loads
                lastThemeRef.current = '';
                console.log('🎨 V97.51: Reset theme ref for new file');

                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
                console.log('✅ V97.51: New file loaded');
            } catch (err) {
                console.error('❌ V97.51: Error loading new file:', err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== ORIENTATION HANDLING - V97.55 CRITICAL FIX ==========
    // 🔧 V97.55: Only apply when ACTUAL layout mode changes, not on every prop change

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;
        if (!containerRef.current) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const isLandscape = isMobileLandscape || (isMobile && window.innerWidth > window.innerHeight);
        const targetLayoutMode = isLandscape ? 'horizontal' : 'page';

        // 🔧 V97.55: CRITICAL FIX - Skip if layout mode hasn't ACTUALLY changed
        if (lastLayoutModeRef.current === targetLayoutMode) {
            console.log(`⏭️ V97.55: Layout mode unchanged (${targetLayoutMode}), skipping orientation update`);
            return;
        }

        console.log(`🔄 V97.55: Layout mode CHANGED: ${lastLayoutModeRef.current} → ${targetLayoutMode}`);
        lastLayoutModeRef.current = targetLayoutMode;

        const applyLayoutMode = async () => {
            const alphaTab = await import('@coderline/alphatab');

            if (isLandscape) {
                console.log('🎸 V97.55: Applying LANDSCAPE mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                const scrollElement = scrollContainerRef?.current || container;
                api.settings.player.scrollElement = scrollElement;

                const horizontalOffset = scrollElement.clientWidth * 0.25;
                (api.settings.player as any).scrollOffset = horizontalOffset;

                console.log(`📐 V97.55: Horizontal layout, scrollOffset=${horizontalOffset.toFixed(0)}px`);
            } else {
                console.log('📱 V97.55: Applying PORTRAIT/DESKTOP mode');
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                const scrollElement = scrollContainerRef?.current || document.documentElement;
                api.settings.player.scrollElement = scrollElement;
                (api.settings.player as any).scrollOffset = 100;

                console.log('📐 V97.55: Page layout, scrollOffset=100px');
            }

            await api.updateSettings();
            await new Promise((r) => setTimeout(r, 100));
            api.render();
        };

        applyLayoutMode();

    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef, isMobile]);

    // ========== THEME (DARK/LIGHT) ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isRendered) return;

        if (lastThemeRef.current === theme) return;

        const applyTheme = async () => {
            const alphaTab = await import('@coderline/alphatab');
            console.log(`🎨 V97.51: Applying ${theme} theme (renderCycle: ${renderCycle})`);
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
            console.log(`✅ V97.51: Theme ${theme} applied successfully`);
        };

        applyTheme();
    }, [theme, isRendered, renderCycle]);

    // ========== DYNAMIC USER INTERACTION - DISABLED ==========
    // 🚨 V97.51: ALWAYS keep enableUserInteraction = false
    // Reason: AlphaTab's internal selection conflicts with our custom handlers

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        // Always FALSE - we use custom handlers exclusively
        (api.settings.player as any).enableUserInteraction = false;
        api.updateSettings();
        console.log('🔒 V97.51: enableUserInteraction locked to FALSE');
    }, [isLooping]);

    // ========== INSTANT LOOP AT CURSOR - Bar-to-bar snapping ==========

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

                    // Try master boundaries first, fallback to legacy calculation
                    let boundaries = getBarBoundariesFromMaster(api, firstBeat);
                    if (!boundaries) {
                        console.warn('⚠️ V97.51: Master boundaries unavailable, using legacy');
                        boundaries = getBarBoundaries(firstBeat);
                    }

                    if (boundaries) {
                        api.playbackRange = {
                            startTick: boundaries.startTick,
                            endTick: boundaries.endTick,
                        };
                        console.log(`🔁 V97.51: Initial loop - bar ${boundaries.startTick} to ${boundaries.endTick}`);
                    }
                }
            }
        }
    }, [isLooping, isRendered]);

    // ========== LOOP HANDLES CREATION (DISABLED - Using AlphaTab native handles) ==========

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

    // ========== DRAG HANDLERS FOR HANDLES (DISABLED - Using AlphaTab native handles) ==========

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
            console.log(`🔍 V97.51: Click handler NOT attached (isLooping=${isLooping})`);
            return;
        }

        console.log(`🖱️ V97.51: Single-click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.51: Click BLOCKED (seeking && playing)`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;
                // V97.18 Architecture: ONLY set api.tickPosition
                api.tickPosition = tickPosition;
                console.log(`🖱️ V97.51: Single-click seek to ${tickPosition}ms`);
            }
        };

        target.addEventListener('click', handleClick);

        return () => {
            target.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]);

    // ========== SINGLE CLICK LOOP MOVE (loop on) - SONGSTERR BEHAVIOR ==========
    // 🆕 V97.52: Click to move loop highlight to new bar (like Songsterr)

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) {
            return;
        }

        console.log(`🔁 V97.52: Loop-move click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleLoopMoveClick = (e: MouseEvent) => {
            // Get the clicked beat
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (!beat) return;

            // Find first beat in the bar
            const firstBeat = getFirstBeatInBar(api, beat);

            // Try master boundaries first, fallback to legacy
            let boundaries = getBarBoundariesFromMaster(api, firstBeat);
            if (!boundaries) {
                console.warn('⚠️ V97.52: Master boundaries unavailable, using legacy');
                boundaries = getBarBoundaries(firstBeat);
            }

            if (boundaries) {
                // Move loop to this bar
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
                console.log(`🔁 V97.52: Loop moved to bar ${boundaries.startTick} - ${boundaries.endTick}`);
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

        console.log(`🖱️🖱️ V97.51: Double-click handler ATTACHED (renderCycle: ${renderCycle})`);

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleDoubleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                console.log(`🔒 V97.51: Double-click BLOCKED`);
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                console.log(`🖱️🖱️ V97.51: Double-click at ${tickPosition}ms`);

                if (audioSource === 'synth') {
                    // V97.18 Architecture: set position, then play
                    api.tickPosition = tickPosition;
                    api.play?.();
                    console.log('🎵 V97.51: SYNTH - play');
                } else {
                    const output = api.player?.output as any;

                    if (output?.handler) {
                        // V97.18 Architecture: set position, then call handler methods
                        api.tickPosition = tickPosition;

                        if (output.handler.play) {
                            console.log('🎬 V97.51: ORIGINAL - handler.play()');
                            output.handler.play();
                        }

                        api.play();
                        console.log('🎵 V97.51: ORIGINAL - api.play()');
                    } else {
                        console.warn('⚠️ V97.51: No handler for original mode');
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

            // Force start beat to first beat in bar
            startBeat = getFirstBeatInBar(api, beat);
            endBeat = beat;

            console.log(`🖱️ V97.51: Mouse down - bar start tick ${startBeat.absolutePlaybackStart}`);

            // Try master boundaries first, fallback to legacy
            let boundaries = getBarBoundariesFromMaster(api, startBeat);
            if (!boundaries) {
                console.warn('⚠️ V97.51: Master boundaries unavailable, using legacy');
                boundaries = getBarBoundaries(startBeat);
            }

            if (boundaries) {
                api.playbackRange = {
                    startTick: boundaries.startTick,
                    endTick: boundaries.endTick,
                };
                console.log(`🖱️ V97.51: Initial loop ${boundaries.startTick} to ${boundaries.endTick}`);
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

            // Try master boundaries first for both start and end
            let startBoundaries = getBarBoundariesFromMaster(api, startBeat);
            let endBoundaries = getBarBoundariesFromMaster(api, endBeat);

            // Fallback to legacy if master unavailable
            if (!startBoundaries) startBoundaries = getBarBoundaries(startBeat);
            if (!endBoundaries) endBoundaries = getBarBoundaries(endBeat);

            if (startBoundaries && endBoundaries) {
                const loopStart = Math.min(startBoundaries.startTick, endBoundaries.startTick);
                const loopEnd = Math.max(startBoundaries.endTick, endBoundaries.endTick);

                api.playbackRange = {
                    startTick: loopStart,
                    endTick: loopEnd,
                };
                console.log(`🖱️ V97.51: Mouse drag - ${loopStart} to ${loopEnd}`);
            }
        };

        const handleMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            startBeat = null;
            endBeat = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            console.log('🖱️ V97.51: Mouse up - drag complete');
        };

        const handleDoubleClick = (e: MouseEvent) => {
            if (api.playbackRange) {
                api.playbackRange = null;
                console.log('🖱️🖱️ V97.51: Double-click - cleared loop');
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
                console.log('📱 V97.51: Touch selection enabled');
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