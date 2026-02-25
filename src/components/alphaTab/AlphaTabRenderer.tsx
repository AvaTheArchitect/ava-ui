'use client';

/**
 * AlphaTab Renderer - V101: Mobile PWA Cursor Fix
 * Base: V99.4 (Clean Build)
 * Date: February 24th, 2026
 *
 * 🎉 V101 CHANGES:
 * ✅ handleRenderFinished extracted as named function (PWA race fix)
 * ✅ ALL event listeners registered BEFORE loadGuitarProFile (critical order fix)
 * ✅ DOM-aware cursor creation (needsCreation pattern from Cipher)
 * ✅ Mobile-safe anchor retry loop (replaces 200ms single-shot)
 * ✅ alreadyRendered SVG check (fires handler if event was missed)
 * ✅ Native cursor hidden (was confusing mobile testing)
 *
 * 🔒 PROTECTED CRITICAL FIXES (DO NOT MODIFY WITHOUT REVIEW):
 * 1️⃣  V98.115 FIX #1 - Pause Reset Prevention
 * 2️⃣  V98.115 FIX #2 - Drag Flicker Prevention
 * 3️⃣  V98.120 - Loop State Tracking
 * 4️⃣  V98.122/V98.124 - Ironclad Enforcer
 * 5️⃣  V98.123 - Listener Attachment
 * 6️⃣  V98.125 - Manual Positioning Lock + Sticky Range Cleanup
 * 7️⃣  V98.126 - Track Change Cursor Re-Anchor + Cipher Enhancements
 * 8️⃣  V99.0 - Audio Hard Reset + Bounds Retry + Tighter Loop Detection
 * 9️⃣  V99.1 - Authority Seek - GP5 Repeat Fix
 * 🔟  V99.2 - Authority-First Beat Handler
 * 1️⃣1️⃣ V99.3 - Dual Track Index + Audio Clock Authority
 * 1️⃣2️⃣ V99.4 - Clean Build (Drag Selection Removed)
 * 1️⃣3️⃣ V101  - Mobile PWA Cursor Fix (event registration order + DOM-aware creation)
 */

// 🎯 VERSION TRACKING
const ALPHATAB_RENDERER_VERSION = 'v101';
const VERSION_DATE = 'February 24th, 2026';
const ALPHATAB_PACKAGE_VERSION = '1.8.1';

// 🛠️ DEBUG FLAGS (Production: Set all to false)
const DEBUG = true;
const DEBUG_PLAYER_STATE = true;
const DEBUG_LOOP_BOUNDARY = true;
const DEBUG_BOUNDARY_ENFORCER = true;
const DEBUG_ENFORCER_CONDITIONS = true;
const DEBUG_RANGE_LISTENER = true;
const DEBUG_MANUAL_POSITION = true;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initAlphaTab, loadGuitarProFile } from '@/lib/alphaTab/initAlphaTab';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';
import { CustomLoopOverlay } from '@/components/alphaTab/CustomLoopOverlay';
import { MaestroCursor } from '@/components/alphaTab/MaestroCursor';

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
    selectedTrackIndex?: number;
}

// ==================== ANIMATION CONTROL ====================

const setLoopCursorMode = (api: AlphaTabApi, isLooping: boolean) => {
    try {
        const playerSettings = api.settings.player as any;
        playerSettings.enableCursorAnimation = !isLooping;
        api.updateSettings();
    } catch (err) {
        // Silent
    }
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

    const offsets = [0, -4, 4, -8, 8];
    for (const offset of offsets) {
        const beat = api.renderer.boundsLookup.getBeatAtPos(relX + offset, relY);
        if (beat) return beat;
    }

    return null;
};

const getSnappedBarBoundaries = (
    api: AlphaTabApi,
    startTick: number,
    endTick: number
): { startTick: number; endTick: number } | null => {
    const score = api.score;
    if (!score?.masterBars) return null;

    let startBar: any = null;
    let endBar: any = null;

    for (const bar of score.masterBars) {
        const barStart = bar.start;
        const barEnd = barStart + bar.calculateDuration();
        if (startTick >= barStart && startTick < barEnd) { startBar = bar; break; }
    }

    const searchEndTick = Math.max(endTick - 1, startTick);
    for (const bar of score.masterBars) {
        const barStart = bar.start;
        const barEnd = barStart + bar.calculateDuration();
        if (searchEndTick >= barStart && searchEndTick < barEnd) { endBar = bar; break; }
    }

    if (!startBar || !endBar) return null;
    return {
        startTick: startBar.start,
        endTick: endBar.start + endBar.calculateDuration()
    };
};

const getBarBoundariesFromMaster = (api: AlphaTabApi, beat: any): { startTick: number; endTick: number } | null => {
    if (!beat) return null;

    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;
    if (!master) return null;

    if (master.startTick !== undefined && master.endTick !== undefined) {
        return { startTick: master.startTick, endTick: master.endTick };
    }

    if (Array.isArray(master.beats) && master.beats.length > 0) {
        const first = master.beats[0];
        const last = master.beats[master.beats.length - 1];
        return {
            startTick: first.absolutePlaybackStart,
            endTick: last.absolutePlaybackStart + (last.playbackDuration || 0)
        };
    }

    return null;
};

const getBarBoundaries = (beat: any): { startTick: number; endTick: number } | null => {
    if (!beat?.voice?.bar) return null;
    const masterBar = beat.voice.bar.masterBar;
    if (!masterBar) return null;
    return {
        startTick: masterBar.start,
        endTick: masterBar.start + masterBar.calculateDuration()
    };
};

const getFirstBeatInBar = (api: AlphaTabApi, beat: any): any => {
    if (!beat) return beat;

    const bounds = api.renderer?.boundsLookup?.findBeat(beat);
    const master = (bounds as any)?.barBounds?.masterBarBounds;

    if (master) {
        if (master.firstBeat) return master.firstBeat;
        if (Array.isArray(master.beats) && master.beats.length > 0) return master.beats[0];
    }

    if ((beat as any).beatIndexInBar === 0) return beat;

    if (beat.voice?.bar?.voices) {
        for (const voice of beat.voice.bar.voices) {
            if (voice.beats?.length > 0) {
                const firstBeat = voice.beats[0];
                if (firstBeat.index === 0 || (firstBeat as any).beatIndexInBar === 0) return firstBeat;
            }
        }
    }

    try {
        const tickCache = (api as any).tickCache;
        if (tickCache && beat.absolutePlaybackStart !== undefined) {
            const trackIndices = api.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]);
            for (let t = beat.absolutePlaybackStart; t >= Math.max(0, beat.absolutePlaybackStart - 2000); t--) {
                const res = tickCache.findBeat(trackIndices, t);
                if (res?.beat && (res.beat as any).beatIndexInBar === 0) return res.beat;
            }
        }
    } catch (err) {
        // Ignore
    }

    return beat;
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
    audioSource = 'synth',
    isLooping = false,
    onLoopRangeChange,
    isSeeking = false,
    isPlaying = false,
    theme = 'light',
    selectedTrackIndex = 0,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<AlphaTabApi | null>(null);
    const cursorRef = useRef<MaestroCursor | null>(null);
    const lastLayoutModeRef = useRef<string | null>(null);
    const lastUpdateTickRef = useRef<number>(-1);
    const lastLoadedFileRef = useRef<string>('');
    const lastThemeRef = useRef<string>('');
    const initialFileLoadedRef = useRef(false);
    const playbackRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);

    // ============================================
    // 🔥 V99.3: DUAL TRACK INDEX REFS
    // ============================================
    const cursorTrackIndicesRef = useRef<Set<number>>(new Set([0]));
    const allTrackIndicesRef = useRef<Set<number>>(new Set([0]));

    // ============================================
    // 🔒 CRITICAL FIX BLOCK - DO NOT MODIFY 🔒
    // ============================================
    const isDraggingRef = useRef<boolean>(false);
    const lastStableRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    const isPlayingRef = useRef<boolean>(false);
    const isLoopingRef = useRef<boolean>(false);
    const lastEnforcerTriggerRef = useRef<number>(0);
    const manualPositioningLockRef = useRef<number>(0);
    const lastUserSeekTickRef = useRef<number | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isRendered, setIsRendered] = useState(false);
    const [scoreIsLoaded, setScoreIsLoaded] = useState(false);
    const [renderCycle, setRenderCycle] = useState(0);

    const detectMobile = (): boolean => {
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileKeywords.test(userAgent);
        const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
        return isMobileUA || (isTouchDevice && isSmallScreen);
    };

    const [isMobile] = useState(detectMobile());

    // ============================================
    // 🔥 V99.1: AUTHORITY SEEK HELPER
    // ============================================
    const authoritySeekToTick = useCallback((api: AlphaTabApi, tick: number, beat?: any) => {
        if (api.player?.seekTicks) api.player.seekTicks(tick);
        api.tickPosition = tick;
        lastUserSeekTickRef.current = tick;
        lastUpdateTickRef.current = tick;

        if (beat && cursorRef.current && api.renderer?.boundsLookup) {
            const beatBounds = api.renderer.boundsLookup.findBeat(beat);
            if (beatBounds) {
                cursorRef.current.requestSnap();
                cursorRef.current.setBeat(beat, beatBounds);
                cursorRef.current.setTick(tick, beat, beatBounds, null, null);
            }
        }

        if (DEBUG) console.log(`🛡️ V99.1: Authority seek to tick ${tick}`);
    }, []);

    // ============================================
    // 🔒 CRITICAL: V98.120 Loop State Sync 🔒
    // ============================================
    useEffect(() => {
        isLoopingRef.current = !!isLooping;
        if (DEBUG) console.log(`🔄 isLoopingRef synced: ${isLoopingRef.current}`);
    }, [isLooping]);

    // ========== INIT ALPHATAB ==========

    useEffect(() => {
        let destroyed = false;

        const initAndLoad = async () => {
            if (!containerRef.current) return;
            if (apiRef.current) return;

            try {
                setIsLoading(true);
                setRenderCycle(rc => rc + 1);

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

                if (destroyed) { api.destroy(); return; }

                apiRef.current = api;
                (window as any).__at = api;

                // ============================================
                // 🩹 TEMP FIX: AlphaTab 1.8.1 Cursor Bug (GitHub #2546)
                // ============================================
                api.customCursorHandler = {
                    onAttach() { },
                    onDetach() { },
                    placeBeatCursor(beatCursor: any, beatBounds: any) {
                        const barBounds = beatBounds.barBounds.masterBarBounds.visualBounds;
                        beatCursor.setBounds(beatBounds.onNotesX, barBounds.y, 1, barBounds.h);
                    },
                    placeBarCursor(barCursor: any, beatBounds: any) {
                        const barBounds = beatBounds.barBounds.masterBarBounds.visualBounds;
                        barCursor.setBounds(barBounds.x, barBounds.y, barBounds.w, barBounds.h);
                    },
                    transitionBeatCursor(beatCursor: any, beatBounds: any) {
                        this.placeBeatCursor(beatCursor, beatBounds);
                    }
                };

                if (DEBUG) console.log('🩹 Applied AlphaTab 1.8.1 cursor positioning fix');

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                // ============================================================
                // 🔥 V101: REGISTER ALL EVENTS BEFORE loadGuitarProFile
                // On iPhone 16 Pro Max the GPU renders so fast that renderFinished
                // fires before the listener attaches if we register after load.
                // ============================================================

                // ============================================================
                // 🔥 V101: handleRenderFinished — named function (not inline)
                // Allows both .on() registration AND manual call for PWA race fix
                // ============================================================
                const handleRenderFinished = () => {
                    console.log('🧩 renderFinished fired', {
                        hasContainer: !!containerRef.current,
                        hasCursor: !!cursorRef.current,
                        ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'
                    });

                    setIsRendered(true);
                    setIsLoading(false);
                    setRenderCycle(rc => rc + 1);
                    onRenderFinished?.();

                    lastUpdateTickRef.current = -1;

                    if (!containerRef.current) return;
                    const host = containerRef.current;

                    if (host.style.position !== 'relative') host.style.position = 'relative';

                    // ============================================================
                    // 🔥 V101: DOM-AWARE CURSOR CREATION (Cipher needsCreation fix)
                    // Checks DOM presence, not just ref — handles PWA reflow/remount
                    // ============================================================
                    let needsCreation = false;

                    if (!cursorRef.current) {
                        needsCreation = true;
                    } else {
                        const el = cursorRef.current.element;
                        if (!el || !host.contains(el)) {
                            cursorRef.current.destroy();
                            cursorRef.current = null;
                            needsCreation = true;
                        }
                    }

                    if (needsCreation) {
                        cursorRef.current = new MaestroCursor(host);
                        api.cursorHandler = cursorRef.current;
                        console.log('🟣 MaestroCursor created/recreated', {
                            hostExists: !!host,
                            hostChildren: host.childElementCount
                        });
                    } else {
                        const existingCursor = cursorRef.current;
                        if (existingCursor) {
                            const el = existingCursor.element;
                            if (el && !host.contains(el)) host.appendChild(el);
                            existingCursor.requestSnap();
                        }
                        console.log('🟢 MaestroCursor reused');
                    }

                    // ============================================================
                    // 🔥 V101: MOBILE-SAFE ANCHOR — retry loop
                    // Replaces 200ms single-shot timeout (too fast for mobile)
                    // ============================================================
                    const anchorCursorAtStart = (attempt = 0) => {
                        const cursor = cursorRef.current;
                        if (!cursor || !api.renderer?.boundsLookup) return;

                        const tickCache = (api as any).tickCache;
                        if (!tickCache) {
                            if (attempt < 10) setTimeout(() => anchorCursorAtStart(attempt + 1), attempt < 3 ? 100 : 200);
                            return;
                        }

                        const trackIndices = cursorTrackIndicesRef.current;
                        const targetTick = needsCreation ? 0 : (api.tickPosition ?? 0);
                        const beatResult = tickCache.findBeat(trackIndices, targetTick);

                        if (!beatResult?.beat) {
                            if (attempt < 10) setTimeout(() => anchorCursorAtStart(attempt + 1), attempt < 3 ? 100 : 200);
                            return;
                        }

                        const beatBounds = api.renderer.boundsLookup.findBeat(beatResult.beat);
                        if (!beatBounds) {
                            if (attempt < 5) setTimeout(() => anchorCursorAtStart(attempt + 1), 80);
                            return;
                        }

                        cursor.requestSnap();
                        cursor.setBeat(beatResult.beat, beatBounds);
                        if (DEBUG) console.log(`✅ Cursor anchored at tick ${targetTick} (attempt ${attempt + 1})`);
                    };

                    setTimeout(() => anchorCursorAtStart(0), 150);

                    // ============================================================
                    // 🔥 V101: Hide native cursors — MaestroCursor is the authority
                    // ============================================================
                    setTimeout(() => {
                        const nativeCursors = host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor');
                        nativeCursors.forEach((n) => ((n as HTMLElement).style.display = 'none'));
                    }, 100);

                    // ============================================================
                    // 🔍 DIAGNOSTIC (remove before production)
                    // ============================================================
                    setTimeout(() => {
                        const el = cursorRef.current?.element;
                        console.log('📍 Cursor el exists:', !!el);
                        console.log('📍 In DOM:', el ? document.contains(el) : false);
                        console.log('📍 Visibility:', el?.style.visibility);
                        console.log('📍 Transform:', el?.style.transform);
                        console.log('📍 tickCache:', !!(api as any).tickCache);
                        console.log('📍 DOM query:', document.querySelector('#maestro-cursor-v43'));
                    }, 1000);
                };

                // ✅ Register listener BEFORE file load
                api.renderFinished.on(handleRenderFinished);

                // 🔍 DIAGNOSTIC: Manual trigger for iPhone console testing
                // Test with: window.__maestroInitCursor?.()
                (window as any).__maestroInitCursor = handleRenderFinished;

                // ============================================================
                // scoreLoaded — registered before file load
                // ============================================================
                api.scoreLoaded.on((score: any) => {
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

                    allTrackIndicesRef.current = new Set(score.tracks.map((t: any) => t.index));
                    cursorTrackIndicesRef.current = new Set([selectedTrackIndex ?? 0]);

                    if (api && !destroyed) {
                        // 🔒 V99.0: AUDIO HARD RESET
                        const allTracks = score.tracks;
                        api.changeTrackSolo(allTracks, false);
                        api.changeTrackMute(allTracks, false);
                        allTracks.forEach((track: any) => {
                            if (!track.playbackInfo?.volume || track.playbackInfo.volume === 0) {
                                track.playbackInfo.volume = 16;
                            }
                        });
                        api.updateSettings();
                        api.render();

                        if (DEBUG) console.log('🛡️ V99.0: Audio Engine Hard-Reset. All tracks active, Solo/Mute cleared.');
                        lastThemeRef.current = '';
                    }
                });

                // ============================================
                // 🔒 CRITICAL: V98.115 FIX #1 - Playing State Tracking 🔒
                // ============================================
                api.playerStateChanged.on((e: any) => {
                    const stopped = !!e?.stopped;
                    const state = e?.state ?? e?.playerState ?? (stopped ? 'stopped' : 'unknown');
                    const stateNames: Record<number, string> = { 0: 'PAUSED', 1: 'PLAYING', 2: 'STOPPED' };
                    const stateName = typeof state === 'number' ? (stateNames[state] || `UNKNOWN(${state})`) : String(state);

                    const wasPlaying = isPlayingRef.current;
                    isPlayingRef.current = (state === 1 || state === 'playing') && !stopped;

                    // 🔥 V99.1: AUTHORITY RE-SYNC ON PLAY
                    if (!wasPlaying && isPlayingRef.current) {
                        const pendingSeek = lastUserSeekTickRef.current;
                        if (pendingSeek != null && api.player?.seekTicks) {
                            api.player.seekTicks(pendingSeek);
                            api.tickPosition = pendingSeek;
                            if (DEBUG) console.log(`🛡️ V99.1: Authority re-sync on PLAY → tick ${pendingSeek}`);
                        }
                    }

                    if (DEBUG_PLAYER_STATE) {
                        console.log(`🎵 Player state: ${stateName}`, { state, stopped, tick: api.tickPosition, wasPlaying, nowPlaying: isPlayingRef.current });
                        if (state === 2 && isLooping && playbackRangeRef.current) {
                            console.error('🚨 UNEXPECTED STOP during loop playback');
                        }
                    }
                });

                // ============================================
                // 🔥 V99.3: playedBeatChanged with SNAP-BACK GUARD
                // ============================================
                api.playedBeatChanged.on((eventBeat: any) => {
                    const cursor = cursorRef.current;
                    if (!cursor || !api.renderer?.boundsLookup) return;

                    const audioTick = api.player?.tickPosition ?? api.tickPosition ?? 0;
                    const eventTick = eventBeat?.absolutePlaybackStart ?? 0;
                    const isSnapBack = isPlayingRef.current && Math.abs(audioTick - eventTick) > 1000;

                    if (isSnapBack) {
                        const tickCache = (api as any).tickCache;
                        if (!tickCache) return;

                        const tryTicks = [audioTick, audioTick - 1, audioTick - 10].filter(t => t >= 0);
                        let resolved: any = null;
                        for (const t of tryTicks) {
                            const r = tickCache.findBeat(allTrackIndicesRef.current, t);
                            if (r?.beat) { resolved = r; break; }
                        }
                        if (!resolved?.beat) return;

                        const beatBounds = api.renderer.boundsLookup.findBeat(resolved.beat);
                        if (!beatBounds) return;

                        cursor.setBeat(resolved.beat, beatBounds);
                        if (DEBUG) console.log(`⚖️ V99.3 Timeline Correction (beatChanged)`, { audioTick, eventTick });
                    } else {
                        const beatBounds = api.renderer.boundsLookup.findBeat(eventBeat);
                        cursor.setBeat(eventBeat, beatBounds);
                    }

                    if (DEBUG) {
                        const tick = isSnapBack ? audioTick : eventTick;
                        console.log(`🎵 Beat changed: M${Math.floor(tick / 1920) + 1}, tick ${tick}${isSnapBack ? ' (corrected)' : ''}`);
                    }
                });

                // ============================================
                // 🔥 V98.125/V99.3: playerPositionChanged
                // ============================================
                api.playerPositionChanged.on((e: any) => {
                    const cursor = cursorRef.current;
                    if (!cursor || !api.renderer?.boundsLookup) return;

                    const eventTick = e.currentTick;
                    const audioTick = api.player?.tickPosition ?? api.tickPosition ?? eventTick;
                    const isSnapBack = isPlayingRef.current && Math.abs(audioTick - eventTick) > 1000;
                    const newTick = isSnapBack ? audioTick : eventTick;

                    if (isSnapBack && DEBUG) {
                        console.log(`⚖️ V99.3 AUTHORITY OVERRIDE (snap-back)`, { audioTick, eventTick, delta: audioTick - eventTick });
                    }

                    const now = Date.now();

                    const timeSinceManualPosition = now - manualPositioningLockRef.current;
                    if (timeSinceManualPosition < 150) {
                        if (DEBUG_MANUAL_POSITION) console.log(`🔒 Ignoring position update (${timeSinceManualPosition}ms since manual lock)`);
                        return;
                    }

                    const loopActive = isLoopingRef.current;
                    const playing = isPlayingRef.current;
                    const activeRange = loopActive
                        ? (playbackRangeRef.current || lastStableRangeRef.current)
                        : null;

                    const isDraggingLoop = (window as any).__maestroIsDraggingLoop;
                    const isManualSeek = (window as any).__maestroManualSeek || (api as any)._isTeleporting || isDraggingLoop;

                    if (isDraggingLoop) {
                        console.log('🔒 V99.23: Blocking cursor update - drag in progress');
                        return;
                    }

                    const effectiveTick = (activeRange && activeRange.endTick > activeRange.startTick)
                        ? Math.min(newTick, activeRange.endTick - 1)
                        : newTick;

                    if (DEBUG_LOOP_BOUNDARY && activeRange && Math.abs(newTick - activeRange.endTick) < 50) {
                        console.log(`🧱 Near loop end: raw=${newTick} clamped=${effectiveTick} end=${activeRange.endTick}`);
                    }

                    const lastTick = lastUpdateTickRef.current;

                    // ============================================
                    // 🔒 V98.122/V98.124/V98.125: IRONCLAD ENFORCER 🔒
                    // ============================================
                    if (loopActive && activeRange && !isManualSeek) {
                        const { startTick, endTick } = activeRange;
                        const PREEMPTIVE_MARGIN = 250;

                        if (playing && effectiveTick >= (endTick - PREEMPTIVE_MARGIN)) {
                            const COOLDOWN_MS = 300;
                            if (now - lastEnforcerTriggerRef.current > COOLDOWN_MS) {
                                if (DEBUG_BOUNDARY_ENFORCER) console.log("🔄 V99.17: Pre-emptive Loop Reset");

                                try {
                                    cursor.requestSnap();
                                    api.tickPosition = startTick;
                                    if (api.player && typeof (api.player as any).seekTicks === 'function') {
                                        (api.player as any).seekTicks(startTick);
                                    }
                                    setTimeout(() => {
                                        if (api.isLooping && !api.player?.isPlaying) {
                                            api.player?.play();
                                            if (DEBUG_BOUNDARY_ENFORCER) console.log("▶️ Forced play after loop reset");
                                        }
                                    }, 20);
                                } catch (err) {
                                    console.error("🚨 Enforcer Error:", err);
                                }

                                lastEnforcerTriggerRef.current = now;
                                return;
                            }
                        }
                    }

                    // ============================================
                    // 🔒 V99.17: SMART PAUSE GUARD 🔒
                    // ============================================
                    const isTeleport = Math.abs(effectiveTick - lastTick) > 100;
                    const isLoopStartTeleport = activeRange && Math.abs(effectiveTick - activeRange.startTick) < 20;
                    const isNaturalWraparound = activeRange &&
                        Math.abs(lastTick - activeRange.endTick) < 100 &&
                        Math.abs(effectiveTick - activeRange.startTick) < 100;
                    const manualSeekTimestamp = (window as any).__maestroManualSeek;
                    const isRecentManualSeek = manualSeekTimestamp && (Date.now() - manualSeekTimestamp) < 500;

                    if (!playing) {
                        if (effectiveTick === 0 && lastTick > 1000 && !isTeleport && !isRecentManualSeek) {
                            if (DEBUG) console.log('🛑 V99.17: Blocking transient M1 reset');
                            return;
                        }
                        if (isTeleport || isLoopStartTeleport || isNaturalWraparound || isRecentManualSeek || isDraggingLoop) {
                            if (DEBUG) console.log(`🚀 V99.17: Position allowed (${lastTick} → ${effectiveTick})`);
                        } else {
                            if (lastTick > 0 && lastTick !== effectiveTick) return;
                        }
                    }

                    if (isRecentManualSeek && (isTeleport || isNaturalWraparound)) {
                        delete (window as any).__maestroManualSeek;
                    }

                    lastUpdateTickRef.current = effectiveTick;

                    // ============================================
                    // 🔒 V98.115 FIX #2 - Drag Selection Lock 🔒
                    // ============================================
                    if (loopActive && isDraggingRef.current) {
                        if (!activeRange) { if (DEBUG) console.log('🛑 Ignoring frame: range disappeared during drag'); return; }
                        if (activeRange.startTick === 0 && lastTick > 1000) { if (DEBUG) console.log('🛑 Ignoring transient startTick=0 during drag'); return; }
                    }

                    // ============================================
                    // 🔥 V99.1: LOOP RESET DETECTION
                    // ============================================
                    const prevTick = lastUpdateTickRef.current;
                    const currTick = effectiveTick;
                    const isValidRange = !!activeRange && activeRange.endTick > activeRange.startTick;
                    const isLoopReset = loopActive && playing && isValidRange && prevTick >= 0 && currTick < prevTick && Math.abs(currTick - prevTick) > 100;

                    if (isLoopReset) {
                        if (DEBUG) console.log(`🔄 Loop reset detected - tick jumped from ${prevTick} to ${currTick}`);
                        cursor.requestSnap();
                    }

                    lastUpdateTickRef.current = effectiveTick;

                    const tickCache = (api as any).tickCache;
                    if (!tickCache) return;

                    // ============================================
                    // 🔥 V99.3: BEAT LOOKUP SCOPE SWITCH
                    // ============================================
                    const indicesForBeatLookup = isSnapBack
                        ? allTrackIndicesRef.current
                        : cursorTrackIndicesRef.current;

                    const beatResult = tickCache.findBeat(indicesForBeatLookup, effectiveTick);

                    if (!beatResult?.beat) {
                        const isNearSongEnd = effectiveTick > 0 && api.score?.masterBars
                            && effectiveTick >= (api.score.masterBars[api.score.masterBars.length - 1]?.start ?? Infinity);
                        if (DEBUG && !(isNearSongEnd && !loopActive)) console.warn(`⚠️ No beat found for tick ${effectiveTick}`);
                        return;
                    }

                    const beatBounds = api.renderer.boundsLookup.findBeat(beatResult.beat);
                    if (!beatBounds) {
                        if (DEBUG) console.warn(`⚠️ No bounds for beat at tick ${effectiveTick}`);
                        return;
                    }

                    const rangeForLookahead = (activeRange && activeRange.endTick > activeRange.startTick) ? activeRange : null;
                    const rangeEnd = rangeForLookahead?.endTick ?? null;

                    let nextBeatCenterX: number | null = null;
                    const nb = beatResult.beat.nextBeat;
                    if (nb) {
                        const nbStart = nb.absolutePlaybackStart;
                        if (rangeEnd === null || nbStart < (rangeEnd - 1)) {
                            try {
                                const nbBounds = api.renderer.boundsLookup.findBeat(nb);
                                if (nbBounds?.visualBounds) {
                                    nextBeatCenterX = nbBounds.visualBounds.x + (nbBounds.visualBounds.w / 2);
                                }
                            } catch (err) {
                                if (DEBUG) console.warn('⚠️ Failed to get next beat bounds:', err);
                            }
                        } else {
                            if (DEBUG) console.log(`🛑 Next beat ${nbStart} past range end ${rangeEnd}`);
                        }
                    }

                    try {
                        cursor.setTick(effectiveTick, beatResult.beat, beatBounds, nextBeatCenterX, rangeForLookahead);
                    } catch (err) {
                        console.error('🚨 [MaestroCursor] setTick crashed - playback continues:', err);
                    }
                });

                // ============================================================
                // 🔥 V101: NOW load the file — all listeners are registered
                // ============================================================
                await loadGuitarProFile(api, fileUrl);
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

                // ============================================================
                // ⚡ V101: PWA RACE SAFETY NET
                // If renderFinished fired during the await above (unlikely but
                // possible on very fast devices), manually trigger now.
                // ============================================================
                const alreadyRendered = !!containerRef.current?.querySelector('.at-surface svg, .at-viewport svg');
                if (alreadyRendered && !cursorRef.current) {
                    console.log('⚡ PWA: AlphaTab already rendered before listener check — manually triggering cursor init');
                    handleRenderFinished();
                }

                onApiReady?.(api);

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                setIsLoading(false);
                onError?.(errorMsg);
            }
        };

        initAndLoad();

        return () => {
            destroyed = true;
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
            if (apiRef.current) {
                try { apiRef.current.destroy(); } catch (e) { /* Silent */ }
                apiRef.current = null;
            }
            delete (window as any).__at;
        };
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();
    }, [playerMode]);

    // ========== EXTERNAL MEDIA HANDLER ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        const output = api.player.output as any;
        if (externalMediaHandler) {
            output.handler = externalMediaHandler;
            return () => { if (api.player?.output) (api.player.output as any).handler = null; };
        } else {
            if (output.handler) output.handler = null;
        }
    }, [externalMediaHandler]);

    // ========== FILE LOADING ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !initialFileLoadedRef.current) return;
        if (lastLoadedFileRef.current === fileUrl) return;

        const loadNewFile = async () => {
            try {
                lastThemeRef.current = '';
                await loadGuitarProFile(api, fileUrl);
                lastLoadedFileRef.current = fileUrl;
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                onError?.(errorMsg);
            }
        };

        loadNewFile();
    }, [fileUrl, onError]);

    // ========== ORIENTATION ==========

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded || !containerRef.current) return;

        const api = apiRef.current;
        const container = containerRef.current;

        const isLandscape = isMobileLandscape || (isMobile && window.innerWidth > window.innerHeight);
        const targetLayoutMode = isLandscape ? 'horizontal' : 'page';

        if (lastLayoutModeRef.current === targetLayoutMode) return;
        lastLayoutModeRef.current = targetLayoutMode;

        const applyLayoutMode = async () => {
            const alphaTab = await import('@coderline/alphatab');

            if (isLandscape) {
                const scrollElement = scrollContainerRef?.current || container;
                api.settings.player.scrollElement = scrollElement;
                api.settings.display.layoutMode = alphaTab.LayoutMode.Horizontal;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                (api.settings.player as any).scrollOffset = scrollElement.clientWidth * 0.25;
                await api.updateSettings();
                await new Promise((r) => setTimeout(r, 200));
                api.render();
            } else {
                const scrollElement = scrollContainerRef?.current || document.documentElement;
                api.settings.player.scrollElement = scrollElement;
                api.settings.display.layoutMode = alphaTab.LayoutMode.Page;
                api.settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
                (api.settings.player as any).scrollOffset = 100;
                await api.updateSettings();
                await new Promise((r) => setTimeout(r, 100));
                api.render();
            }
        };

        applyLayoutMode();
    }, [isMobileLandscape, isRendered, scoreIsLoaded, scrollContainerRef, isMobile]);

    // ========== THEME ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isRendered || lastThemeRef.current === theme) return;

        const applyTheme = async () => {
            const alphaTab = await import('@coderline/alphatab');
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
        };

        applyTheme();
    }, [theme, isRendered, renderCycle]);

    // ========== LOOP MODE CONTROL ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        (api.settings.player as any).enableLoop = !!isLooping;
        api.updateSettings();
        setLoopCursorMode(api, isLooping);
        return () => { if (api) setLoopCursorMode(api, false); };
    }, [isLooping]);

    // ============================================
    // 🔒 CRITICAL: V98.123 LISTENER ATTACHMENT FIX 🔒
    // ============================================
    useEffect(() => {
        const api = apiRef.current;

        if (!api || !scoreIsLoaded) {
            if (DEBUG_RANGE_LISTENER) console.log('🔌 Range listener NOT attached - API not ready', { hasApi: !!api, scoreIsLoaded });
            return;
        }

        if (DEBUG_RANGE_LISTENER) console.log('🔌 V98.123: Attaching playbackRangeChanged listener');

        if (api.playbackRange) {
            playbackRangeRef.current = api.playbackRange;
            lastStableRangeRef.current = api.playbackRange;
        }

        const handleRangeChange = (e: any) => {
            const fromEvent = e?.playbackRange ?? null;
            const fromApi = api.playbackRange ?? null;
            const next = fromEvent || fromApi;

            if (next) {
                lastStableRangeRef.current = next;
                if (DEBUG_RANGE_LISTENER) console.log(`🧷 Stable Range Memory Locked: ${next.startTick} - ${next.endTick}`);
            }

            if (!next && isLoopingRef.current && isPlayingRef.current) {
                if (DEBUG_RANGE_LISTENER) console.log('🧷 Ignoring transient playbackRange=null while playing');
                return;
            }

            if (!next && !isLoopingRef.current) {
                lastStableRangeRef.current = null;
                if (DEBUG_RANGE_LISTENER) console.log('🧹 Cleared stable range (loop OFF, range null)');
            }

            playbackRangeRef.current = next;
            next ? onLoopRangeChange?.(next.startTick, next.endTick) : onLoopRangeChange?.(null, null);
        };

        api.playbackRangeChanged.on(handleRangeChange);
        if (DEBUG_RANGE_LISTENER) console.log('🔌 ✅ Listener attached successfully');

        return () => {
            if (DEBUG_RANGE_LISTENER) console.log('🔌 Detaching playbackRangeChanged listener');
            api.playbackRangeChanged.off(handleRangeChange);
        };
    }, [onLoopRangeChange, scoreIsLoaded]);

    // ========== LOOP AUTO-INIT ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !containerRef.current || !isRendered || !isLooping) return;

        if (!api.playbackRange && api.tickPosition !== undefined) {
            const tickCache = (api as any).tickCache;
            if (!tickCache) return;

            const beatResult = tickCache.findBeat(cursorTrackIndicesRef.current, api.tickPosition);
            if (!beatResult?.beat) return;

            const firstBeat = getFirstBeatInBar(api, beatResult.beat);
            const boundaries = getBarBoundariesFromMaster(api, firstBeat) || getBarBoundaries(firstBeat);

            if (boundaries) {
                const snapped = getSnappedBarBoundaries(api, boundaries.startTick, boundaries.endTick);
                if (snapped) api.playbackRange = { startTick: snapped.startTick, endTick: snapped.endTick };
            }
        }
    }, [isLooping, isRendered]);

    // ========== SINGLE CLICK SEEK ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;
        if (!api || !container || !isRendered || isLooping) return;

        const target = (container.querySelector('.at-surface') as HTMLElement) || container;

        const handleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) return;
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat?.absolutePlaybackStart !== undefined) {
                if (DEBUG) console.log(`🎯 SEEK TO: tick ${beat.absolutePlaybackStart} (M${Math.floor(beat.absolutePlaybackStart / 1920) + 1})`);
                authoritySeekToTick(api, beat.absolutePlaybackStart, beat);
            }
        };

        target.addEventListener('click', handleClick);
        return () => target.removeEventListener('click', handleClick);
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, renderCycle, authoritySeekToTick]);

    // ========== DOUBLE CLICK PLAY ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;
        if (!api || !container || !isRendered || isLooping) return;

        const target = (container.querySelector('.at-surface') as HTMLElement) || container;

        const handleDoubleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) return;
            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat?.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;
                if (audioSource === 'synth') {
                    api.tickPosition = tickPosition;
                    api.play?.();
                } else {
                    const output = api.player?.output as any;
                    if (output?.handler) {
                        api.tickPosition = tickPosition;
                        output.handler.play?.();
                        api.play();
                    }
                }
            }
        };

        target.addEventListener('dblclick', handleDoubleClick);
        return () => target.removeEventListener('dblclick', handleDoubleClick);
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]);

    // ========== CLEAR LOOP WHEN DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api || isLooping) return;
        if (api.playbackRange) api.playbackRange = null;
        playbackRangeRef.current = null;
        lastStableRangeRef.current = null;
    }, [isLooping]);

    // ============================================
    // 🔥 V99.0/V99.3: TRACK CHANGE CURSOR RE-ANCHOR
    // ============================================
    useEffect(() => {
        const api = apiRef.current;
        const cursor = cursorRef.current;
        if (!api || !cursor || !isRendered || !scoreIsLoaded) return;

        cursorTrackIndicesRef.current = new Set([selectedTrackIndex ?? 0]);

        const tickCache = (api as any).tickCache;
        if (!tickCache || !api.renderer?.boundsLookup) return;

        const attemptReAnchor = (retryCount: number = 0) => {
            const targetTick = api.tickPosition ?? 0;
            const tryTicks = [targetTick, targetTick - 1, targetTick - 10, targetTick - 120].filter(t => t >= 0);
            let beatResult: any = null;

            for (const t of tryTicks) {
                const res = tickCache.findBeat(cursorTrackIndicesRef.current, t);
                if (res?.beat) { beatResult = { ...res, resolvedTick: t }; break; }
            }

            if (!beatResult?.beat) {
                const res0 = tickCache.findBeat(cursorTrackIndicesRef.current, 0);
                if (res0?.beat) beatResult = { ...res0, resolvedTick: 0 };
            }

            const isNearSongEnd = targetTick > 0 && api.score?.masterBars
                && targetTick >= (api.score.masterBars[api.score.masterBars.length - 1]?.start ?? Infinity);

            if (!beatResult?.beat) {
                if (DEBUG && !isNearSongEnd && retryCount === 0) console.warn('⚠️ Track change: no beat found', { selectedTrackIndex, targetTick });
                return;
            }

            const beatBounds = api.renderer.boundsLookup.findBeat(beatResult.beat);

            if (!beatBounds) {
                if (retryCount < 3) {
                    retryCount === 0
                        ? requestAnimationFrame(() => attemptReAnchor(retryCount + 1))
                        : setTimeout(() => attemptReAnchor(retryCount + 1), 80);
                } else if (DEBUG) {
                    console.warn('⚠️ Track change: beat has no bounds after retries', { selectedTrackIndex });
                }
                return;
            }

            const anchorTick = beatResult.beat.absolutePlaybackStart ?? beatResult.resolvedTick;
            const loopActive = isLoopingRef.current;
            const activeRange = loopActive ? (playbackRangeRef.current || lastStableRangeRef.current) : null;
            const rangeForCursor = (activeRange && activeRange.endTick > activeRange.startTick) ? activeRange : null;

            cursor.requestSnap();
            cursor.setBeat(beatResult.beat, beatBounds);
            cursor.setTick(anchorTick, beatResult.beat, beatBounds, null, rangeForCursor);

            if (DEBUG) console.log('✅ Track change: cursor re-anchored', { selectedTrackIndex, anchorTick, retriesNeeded: retryCount });
        };

        attemptReAnchor(0);
    }, [selectedTrackIndex, isRendered, scoreIsLoaded, renderCycle]);

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
                className="alphatab-container"
                style={{
                    position: 'relative',
                    width: '100%',
                    minHeight,
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    backgroundColor,
                    paddingLeft: 'env(safe-area-inset-left, 0px)',
                    paddingRight: 'env(safe-area-inset-right, 0px)',
                    zIndex: 10,
                }}
            />

            <CustomLoopOverlay
                api={apiRef.current}
                isLooping={isLooping}
                theme={theme}
            />
        </div>
    );
};