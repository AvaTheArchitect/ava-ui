'use client';

/**
 * AlphaTab Renderer - V100: CLEAN (No Drag Selection)
 * Base: V99.3 (Dual Track Index + Audio Clock Authority)
 * Date: February 12th, 2026
 * 
 * 🔒 Note for Claude:
 * Cursor Solo vs Audio Playback Separation (DO NOT MERGE):
 * cursorTrackIndicesRef is cursor-only (tickCache/findBeat while paused).
 * The smooth scroll behavior relies on high-frequency e.currentTick updates during - 
 * playerPositionChanged these must remain untouched unless absolutely necessary.
 * allTrackIndicesRef is playback truth (tickCache/findBeat while playing).
 * Audio playback must remain full-band unless user mutes tracks.
 * Do not set api.tracks = [soloTrack].
 * Do not mute other tracks when solo changes.
 * Preserve the scoreLoaded block that unmutes all tracks and restores volume defaults.
 *
 * 🎉 V99.4 CHANGES (Clean Build):
 * ❌ REMOVED: All drag selection code (mouse + touch handlers)
 * ❌ REMOVED: calculateDynamicMargin, setupTouchSelection functions
 * ❌ REMOVED: Unused refs (startHandleRef, endHandleRef, dragCleanupRef, mouseCleanupRef, touchCleanupRef, marginRef)
 * ✅ KEPT: All V99.3 critical systems (dual track index, audio clock authority, beat lookups)
 * ✅ KEPT: Loop auto-init logic (unchanged)
 * ✅ KEPT: Single/double click seek (unchanged)
 * 
 * 🎯 PRESERVED FROM V99.3:
 * ✅ Dual track index refs (cursorTrackIndicesRef vs allTrackIndicesRef)
 * ✅ Audio clock authority (playerPositionChanged uses api.player.tickPosition over e.currentTick)
 * ✅ Beat lookup scope switching (all tracks while playing, selected track while paused)
 * ✅ playedBeatChanged re-resolve (snap-back guard)
 * ✅ Authority seek (forces both audio + visual on click)
 * ✅ Play re-sync (reasserts seek on play start)
 * ✅ Tighter loop detection
 * ✅ All V99.2 and earlier fixes
 * 
 * 🔒 PROTECTED CRITICAL FIXES (DO NOT MODIFY WITHOUT REVIEW):
 * 
 * 1️⃣ V98.115 FIX #1 - Pause Reset Prevention
 * 2️⃣ V98.115 FIX #2 - Drag Flicker Prevention (refs kept for future use)
 * 3️⃣ V98.120 - Loop State Tracking
 * 4️⃣ V98.122/V98.124 - Ironclad Enforcer
 * 5️⃣ V98.123 - Listener Attachment
 * 6️⃣ V98.125 - Manual Positioning Lock + Sticky Range Cleanup
 * 7️⃣ V98.126 - Track Change Cursor Re-Anchor + Cipher Enhancements
 * 8️⃣ V99.0 - Audio Hard Reset + Bounds Retry + Tighter Loop Detection
 * 9️⃣ V99.1 - Authority Seek - GP5 Repeat Fix
 * 🔟 V99.2 - Authority-First Beat Handler
 * 1️⃣1️⃣ V99.3 - Dual Track Index + Audio Clock Authority
 * 1️⃣2️⃣ V99.4 - Clean Build (Drag Selection Removed)
 */

// 🎯 VERSION TRACKING
const ALPHATAB_RENDERER_VERSION = 'v99.4';
const VERSION_DATE = 'February 9th, 2026';
const ALPHATAB_PACKAGE_VERSION = '1.8.1';

// 🛠️ DEBUG FLAGS (Production: Set all to false)
const DEBUG = true; // Master switch for cursor/beat logs
const DEBUG_PLAYER_STATE = true; // Track player state changes
const DEBUG_LOOP_BOUNDARY = true; // Log near loop end behavior
const DEBUG_BOUNDARY_ENFORCER = true; // Log boundary enforcer actions
const DEBUG_ENFORCER_CONDITIONS = true; // Log WHY enforcer doesn't trigger
const DEBUG_RANGE_LISTENER = true; // Log listener attachment + range changes
const DEBUG_MANUAL_POSITION = true; // Log manual positioning lock actions

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
        if (isLooping) {
            playerSettings.enableCursorAnimation = false;
        } else {
            playerSettings.enableCursorAnimation = true;
        }
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

        if (startTick >= barStart && startTick < barEnd) {
            startBar = bar;
            break;
        }
    }

    const searchEndTick = Math.max(endTick - 1, startTick);

    for (const bar of score.masterBars) {
        const barStart = bar.start;
        const barEnd = barStart + bar.calculateDuration();

        if (searchEndTick >= barStart && searchEndTick < barEnd) {
            endBar = bar;
            break;
        }
    }

    if (!startBar || !endBar) return null;

    const snappedStart = startBar.start;
    const snappedEnd = endBar.start + endBar.calculateDuration();

    return { startTick: snappedStart, endTick: snappedEnd };
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
        const startTick = first.absolutePlaybackStart;
        const endTick = last.absolutePlaybackStart + (last.playbackDuration || 0);
        return { startTick, endTick };
    }

    return null;
};

const getBarBoundaries = (beat: any): { startTick: number; endTick: number } | null => {
    if (!beat || !beat.voice || !beat.voice.bar) return null;

    const bar = beat.voice.bar;
    const masterBar = bar.masterBar;

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
        const bar = beat.voice.bar;
        for (const voice of bar.voices) {
            if (voice.beats && voice.beats.length > 0) {
                const firstBeat = voice.beats[0];
                if (firstBeat.index === 0 || (firstBeat as any).beatIndexInBar === 0) {
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
                    return res.beat;
                }
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
    // cursorTrackIndicesRef → selected track only (visual focus, used when paused)
    // allTrackIndicesRef → all tracks (playback truth, used when playing)
    // ============================================
    const cursorTrackIndicesRef = useRef<Set<number>>(new Set([0]));
    const allTrackIndicesRef = useRef<Set<number>>(new Set([0]));
    // ============================================
    // 🔒 END DUAL TRACK INDEX REFS 🔒
    // ============================================

    // ============================================
    // 🔒 CRITICAL FIX BLOCK - DO NOT MODIFY 🔒
    // V98.115 FIX #1: Pause Reset Prevention
    // V98.115 FIX #2: Drag Flicker Prevention (refs kept for future use)
    // V98.120: Loop State Tracking
    // V98.124: Enforcer Cooldown
    // V98.125: Manual Positioning Lock
    // ============================================
    const isDraggingRef = useRef<boolean>(false); // FIX #2: Track drag state (kept for future use)
    const lastStableRangeRef = useRef<{ startTick: number; endTick: number } | null>(null); // FIX #2: Stable range during drag
    const isPlayingRef = useRef<boolean>(false); // FIX #1: Track playing state
    const isLoopingRef = useRef<boolean>(false); // V98.120: Synced from isLooping prop (prevents stale closure)
    const lastEnforcerTriggerRef = useRef<number>(0); // V98.124: Enforcer cooldown timestamp
    const manualPositioningLockRef = useRef<number>(0); // 🔥 V98.125: Manual positioning lock timestamp
    const lastUserSeekTickRef = useRef<number | null>(null); // 🔥 V99.1: Authority seek - remember last user seek
    // ============================================
    // 🔒 END CRITICAL FIX BLOCK 🔒
    // ============================================

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
    // Forces BOTH audio player AND visual tick to seek position
    // Prevents "jump back" on play in GP5 files with repeat mapping issues
    // ============================================
    const authoritySeekToTick = useCallback((api: AlphaTabApi, tick: number, beat?: any) => {
        // 1️⃣ Force the AUDIO engine to the tick
        if (api.player?.seekTicks) {
            api.player.seekTicks(tick);
        }

        // 2️⃣ Update the API tick (visual/state)
        api.tickPosition = tick;

        // 3️⃣ Remember this seek so PLAY can reassert it
        lastUserSeekTickRef.current = tick;

        // 4️⃣ Keep internal lastUpdate aligned
        lastUpdateTickRef.current = tick;

        // 5️⃣ Snap Maestro cursor immediately if we have beat/bounds
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
    // DO NOT REMOVE - Prevents stale closure in playerPositionChanged
    // ============================================
    useEffect(() => {
        isLoopingRef.current = !!isLooping;
        if (DEBUG) console.log(`🔄 isLoopingRef synced: ${isLoopingRef.current}`);
    }, [isLooping]);
    // ============================================
    // 🔒 END LOOP STATE SYNC 🔒
    // ============================================

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

                if (destroyed) {
                    api.destroy();
                    return;
                }

                apiRef.current = api;
                (window as any).__at = api;

                // ============================================
                // 🩹 TEMP FIX: AlphaTab 1.8.1 Cursor Bug (GitHub #2546)
                // Remove once AlphaTab releases official fix for startBeatX
                // ✅ Uses onNotesX instead of incorrect startBeatX
                // ✅ Affects native cursor (hidden, but used for events)
                // ✅ MaestroCursor unaffected (calculates independently)
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

                if (DEBUG) {
                    console.log('🩹 Applied AlphaTab 1.8.1 cursor positioning fix');
                }
                // ============================================
                // 🔒 END TEMP FIX 🔒
                // ============================================

                api.settings.display.lastSystemPaddingBottom = 300;
                await api.updateSettings();

                await loadGuitarProFile(api, fileUrl);
                initialFileLoadedRef.current = true;
                lastLoadedFileRef.current = fileUrl;

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

                    // ============================================
                    // 🔥 V99.3: Initialize BOTH track refs
                    // allTrackIndicesRef = all tracks (playback truth, never changes)
                    // cursorTrackIndicesRef = selected track (visual focus)
                    // ============================================
                    allTrackIndicesRef.current = new Set(score.tracks.map((t: any) => t.index));
                    cursorTrackIndicesRef.current = new Set([selectedTrackIndex ?? 0]);

                    if (api && !destroyed) {
                        // ============================================
                        // 🔒 V99.0: AUDIO HARD RESET 🔒
                        // Ensures clean slate: no ghost Solo/Mute states
                        // ============================================
                        const allTracks = score.tracks;

                        // 1️⃣ Clear ALL Solo states (prevents track isolation)
                        api.changeTrackSolo(allTracks, false);

                        // 2️⃣ Clear ALL Mute states (ensures full band)
                        api.changeTrackMute(allTracks, false);

                        // 3️⃣ Standardize volume levels
                        allTracks.forEach((track: any) => {
                            if (!track.playbackInfo?.volume || track.playbackInfo.volume === 0) {
                                track.playbackInfo.volume = 16;
                            }
                        });

                        api.updateSettings();
                        api.render();

                        if (DEBUG) {
                            console.log('🛡️ V99.0: Audio Engine Hard-Reset. All tracks active, Solo/Mute cleared.');
                        }

                        lastThemeRef.current = '';
                    }
                });

                // ============================================
                // 🔒 CRITICAL: V98.115 FIX #1 - Playing State Tracking 🔒
                // DO NOT REMOVE - Required for pause reset prevention
                // ============================================
                api.playerStateChanged.on((e: any) => {
                    const stopped = !!e?.stopped;
                    const state = e?.state ?? e?.playerState ?? (stopped ? 'stopped' : 'unknown');
                    const stateNames: Record<number, string> = {
                        0: 'PAUSED',
                        1: 'PLAYING',
                        2: 'STOPPED'
                    };
                    const stateName = typeof state === 'number'
                        ? (stateNames[state] || `UNKNOWN(${state})`)
                        : String(state);

                    const wasPlaying = isPlayingRef.current;
                    isPlayingRef.current = (state === 1 || state === 'playing') && !stopped;

                    // ============================================
                    // 🔥 V99.1: AUTHORITY RE-SYNC ON PLAY
                    // Reasserts last user seek when play starts (fixes GP5 repeat "jump back")
                    // ============================================
                    if (!wasPlaying && isPlayingRef.current) {
                        const pendingSeek = lastUserSeekTickRef.current;
                        if (pendingSeek != null && api.player?.seekTicks) {
                            api.player.seekTicks(pendingSeek);
                            api.tickPosition = pendingSeek;
                            if (DEBUG) {
                                console.log(`🛡️ V99.1: Authority re-sync on PLAY → tick ${pendingSeek}`);
                            }
                        }
                    }

                    if (DEBUG_PLAYER_STATE) {
                        console.log(`🎵 Player state: ${stateName}`, {
                            state,
                            stopped,
                            tick: api.tickPosition,
                            wasPlaying,
                            nowPlaying: isPlayingRef.current
                        });

                        if (state === 2 && isLooping && playbackRangeRef.current) {
                            console.error('🚨 UNEXPECTED STOP during loop playback');
                            console.log('   Range:', playbackRangeRef.current);
                            console.log('   Current tick:', api.tickPosition);
                            console.log('   Loop enabled:', (api.settings.player as any).enableLoop);
                        }
                    }
                });
                // ============================================
                // 🔒 END PLAYING STATE TRACKING 🔒
                // ============================================
                api.renderFinished.on(() => {

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

                        if (host.style.position !== 'relative') {
                            host.style.position = 'relative';
                        }

                        // ============================================================
                        // 🔥 MOBILE-SAFE CURSOR CREATION
                        // DOM-aware, not just ref-aware — handles PWA reflow/remount
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
                        // 🔥 MOBILE-SAFE ANCHOR: Retry loop
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
                        // 🔍 DIAGNOSTIC
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

                        setTimeout(() => {
                            const nativeCursors = host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor');
                            // nativeCursors.forEach((n) => ((n as HTMLElement).style.display = 'none'));
                        }, 100);
                    };

                    // Register for future renders (track changes, re-renders)
                    api.renderFinished.on(handleRenderFinished);

                    // ⚡ PWA RACE FIX: If AlphaTab already rendered before listener attached, fire manually
                    // Check for .at-surface SVG — most reliable signal that render completed
                    const alreadyRendered = !!containerRef.current?.querySelector('.at-surface svg, .at-viewport svg');
                    if (alreadyRendered) {
                        console.log('⚡ PWA: AlphaTab already rendered — manually triggering cursor init');
                        handleRenderFinished();
                    }
                    // ============================================================
                    // 🔒 END: ...TO HERE (full replacement boundary)
                    // ============================================================
                });
                // ============================================
                // 🔥 V99.3: playedBeatChanged with SNAP-BACK GUARD
                // Uses event beat directly for smooth cursor visuals.
                // Only re-resolves from tickCache when audio clock disagrees
                // with event beat by >1000 ticks (GP5 repeat snap-back).
                // ============================================
                api.playedBeatChanged.on((eventBeat: any) => {
                    const cursor = cursorRef.current;
                    if (!cursor || !api.renderer?.boundsLookup) return;

                    // Check for snap-back: audio clock vs event beat
                    const audioTick = api.player?.tickPosition ?? api.tickPosition ?? 0;
                    const eventTick = eventBeat?.absolutePlaybackStart ?? 0;
                    const isSnapBack = isPlayingRef.current && Math.abs(audioTick - eventTick) > 1000;

                    if (isSnapBack) {
                        // ✅ Snap-back detected: re-resolve beat from audio clock using all tracks
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

                        if (DEBUG) {
                            console.log(`⚖️ V99.3 Timeline Correction (beatChanged)`, { audioTick, eventTick });
                        }
                    } else {
                        // ✅ Normal: use event beat directly (smooth visuals)
                        const beatBounds = api.renderer.boundsLookup.findBeat(eventBeat);
                        cursor.setBeat(eventBeat, beatBounds);
                    }

                    if (DEBUG) {
                        const tick = isSnapBack ? audioTick : eventTick;
                        const measureNum = Math.floor(tick / 1920) + 1;
                        console.log(`🎵 Beat changed: M${measureNum}, tick ${tick}${isSnapBack ? ' (corrected)' : ''}`);
                    }
                });
                // ============================================
                // 🔒 END V99.3 playedBeatChanged SNAP-BACK GUARD 🔒
                // ============================================

                // ============================================
                // 🔥 V98.125: ENHANCED playerPositionChanged
                // V99.3: Audio clock authority + dual track index scope
                // ============================================
                api.playerPositionChanged.on((e: any) => {
                    const cursor = cursorRef.current;
                    if (!cursor || !api.renderer?.boundsLookup) return;

                    // ============================================
                    // 🔥 V99.3: AUDIO CLOCK AUTHORITY (SNAP-BACK GUARD)
                    // Uses eventTick for smooth 60fps cursor interpolation.
                    // Only overrides to audioTick when a large disagreement is
                    // detected (the GP5 repeat snap-back case, delta > 1000).
                    // This preserves MaestroCursor's smooth linear interpolation
                    // while still catching repeat-mapping bugs.
                    // ============================================
                    const eventTick = e.currentTick;
                    const audioTick = api.player?.tickPosition ?? api.tickPosition ?? eventTick;
                    const isSnapBack = isPlayingRef.current && Math.abs(audioTick - eventTick) > 1000;
                    const newTick = isSnapBack ? audioTick : eventTick;

                    // Diagnostic: show when authority override kicks in
                    if (isSnapBack) {
                        if (DEBUG) {
                            console.log(`⚖️ V99.3 AUTHORITY OVERRIDE (snap-back)`, { audioTick, eventTick, delta: audioTick - eventTick });
                        }
                    }
                    // ============================================
                    // 🔒 END AUDIO CLOCK AUTHORITY 🔒
                    // ============================================

                    const now = Date.now();

                    // ============================================
                    // 🔥 V98.125: MANUAL POSITIONING LOCK GUARD
                    // Ignores position updates for 150ms after manual cursor anchoring
                    // Prevents playerPositionChanged from overwriting loop selection anchors
                    // ============================================
                    const timeSinceManualPosition = now - manualPositioningLockRef.current;
                    if (timeSinceManualPosition < 150) {
                        if (DEBUG_MANUAL_POSITION) {
                            console.log(`🔒 Ignoring position update (${timeSinceManualPosition}ms since manual lock)`);
                        }
                        return; // Skip update - manual positioning in progress
                    }
                    // ============================================
                    // 🔒 END MANUAL POSITIONING LOCK GUARD 🔒
                    // ============================================

                    const loopActive = isLoopingRef.current;
                    const playing = isPlayingRef.current;
                    // 🔥 V98.125: Only use sticky range when loop is actually ON
                    const activeRange = loopActive
                        ? (playbackRangeRef.current || lastStableRangeRef.current)
                        : null;

                    // Change the condition to false to stop the spam without breaking the logic flow
                    if (false && loopActive && newTick > 94000) {
                        console.log('🧪 ENFORCER GATES @ tick', newTick, {
                            loopActive,
                            playing,
                            liveRange: !!playbackRangeRef.current,
                            stableRange: !!lastStableRangeRef.current,
                            activeRange: !!activeRange,
                            rangeStart: activeRange?.startTick,
                            rangeEnd: activeRange?.endTick,
                        });
                    }
                    // ============================================
                    // 🔒 CRITICAL: V98.122/V98.124/V98.125 IRONCLAD ENFORCER 🔒
                    // DO NOT REMOVE - Prevents cursor overshoot & player stop at loop end
                    // V98.125: Added activeRange validation guard
                    // ============================================
                    // ============================================
                    // 1. SENSORS: Calculate current state (V99.17)
                    // ============================================
                    const isDraggingLoop = (window as any).__maestroIsDraggingLoop;
                    // Capture which handle is moving from the global window object
                    const movingHandle = (window as any).__maestroActiveHandle;

                    const isManualSeek = (window as any).__maestroManualSeek || (api as any)._isTeleporting || isDraggingLoop;

                    // Logic: If dragging, pin the effectiveTick to the handle to prevent jumping.
                    // We use '?? newTick' as a fallback to satisfy TypeScript's null-check.
                    // 🆕 V99.23: FREEZE cursor during drag (don't move it to handle)
                    if (isDraggingLoop) {
                        console.log('🔒 V99.23: Blocking cursor update - drag in progress');
                        return; // Exit early - don't update cursor at all during drag
                    }

                    const effectiveTick = (activeRange && activeRange.endTick > activeRange.startTick)
                        ? Math.min(newTick, activeRange.endTick - 1)
                        : newTick;

                    if (DEBUG_LOOP_BOUNDARY && activeRange && Math.abs(newTick - activeRange.endTick) < 50) {
                        console.log(`🧱 Near loop end: raw=${newTick} clamped=${effectiveTick} end=${activeRange.endTick}`);
                    }

                    const lastTick = lastUpdateTickRef.current;

                    // ============================================
                    // 2. 🛡️ V99.17 CRASH-PROOF ENFORCER
                    // ============================================
                    if (loopActive && activeRange && !isManualSeek) {
                        const { startTick, endTick } = activeRange;

                        // Trigger slightly before the end to beat AlphaTab's auto-stop
                        const PREEMPTIVE_MARGIN = 250;

                        if (playing && effectiveTick >= (endTick - PREEMPTIVE_MARGIN)) {
                            const COOLDOWN_MS = 300;
                            if (now - lastEnforcerTriggerRef.current > COOLDOWN_MS) {

                                if (DEBUG_BOUNDARY_ENFORCER) console.log("🔄 V99.17: Pre-emptive Loop Reset");

                                try {
                                    cursor.requestSnap();

                                    // SAFE SEEK: Use tickPosition first, then try seekTicks if it exists
                                    api.tickPosition = startTick;
                                    if (api.player && typeof (api.player as any).seekTicks === 'function') {
                                        (api.player as any).seekTicks(startTick);
                                    }

                                    // Force resume if alphaTab auto-paused at the boundary
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
                                return; // Block this frame
                            }
                        }
                    }


                    // ============================================
                    // 🔒 END ADAPTIVE ENFORCER 🔒
                    // ============================================

                    // ============================================
                    // 🔒 CRITICAL: V98.115 FIX #1 - Pause Guard 🔒
                    // DO NOT REMOVE - Prevents cursor reset to M1 on pause
                    // ============================================
                    // ============================================
                    // 🔒 V99.17 SMART PAUSE GUARD (Integrated)
                    // ============================================

                    // 1. Detect Large Jumps
                    const isTeleport = Math.abs(effectiveTick - lastTick) > 100;

                    // 2. Detect Loop Start Jumps (Manual click to start)
                    const isLoopStartTeleport = activeRange && Math.abs(effectiveTick - activeRange.startTick) < 20;

                    // 3. Detect Natural Wraparound (End -> Start jump)
                    const isNaturalWraparound = activeRange &&
                        Math.abs(lastTick - activeRange.endTick) < 100 &&
                        Math.abs(effectiveTick - activeRange.startTick) < 100;

                    // 4. Manual Seek Timestamp (Overlay interaction)
                    const manualSeekTimestamp = (window as any).__maestroManualSeek;
                    const isRecentManualSeek = manualSeekTimestamp && (Date.now() - manualSeekTimestamp) < 500;

                    if (!playing) {
                        // 🛑 GATE A: Block transient resets to Measure 1
                        if (effectiveTick === 0 && lastTick > 1000 && !isTeleport && !isRecentManualSeek) {
                            if (DEBUG) console.log('🛑 V99.17: Blocking transient M1 reset');
                            return;
                        }

                        // 🟢 GATE B: Allow Legitimate Jumps
                        if (isTeleport || isLoopStartTeleport || isNaturalWraparound || isRecentManualSeek || isDraggingLoop) {
                            if (DEBUG) console.log(`🚀 V99.17: Position allowed (${lastTick} → ${effectiveTick})`);
                            // Fall through to update lastUpdateTickRef.current
                        } else {
                            // 🛑 GATE C: Freeze on micro-jitters
                            if (lastTick > 0 && lastTick !== effectiveTick) {
                                return;
                            }
                        }
                    }

                    // 🧹 Cleanup manual seek flag
                    if (isRecentManualSeek && (isTeleport || isNaturalWraparound)) {
                        delete (window as any).__maestroManualSeek;
                    }

                    // Finalize the update
                    lastUpdateTickRef.current = effectiveTick;
                    // ============================================
                    // 🔒 END PAUSE GUARD 🔒
                    // ============================================

                    // ============================================
                    // 🔒 CRITICAL: V98.115 FIX #2 - Drag Selection Lock 🔒
                    // DO NOT REMOVE - Prevents cursor flicker during drag (refs kept for future use)
                    // ============================================
                    if (loopActive && isDraggingRef.current) {
                        if (!activeRange) {
                            if (DEBUG) console.log('🛑 Ignoring frame: range disappeared during drag');
                            return;
                        }
                        if (activeRange.startTick === 0 && lastTick > 1000) {
                            if (DEBUG) console.log('🛑 Ignoring transient startTick=0 during drag');
                            return;
                        }
                    }
                    // ============================================
                    // 🔒 END DRAG SELECTION LOCK 🔒
                    // ============================================

                    // ============================================
                    // 🔥 V99.1: LOOP RESET DETECTION (LOOP-ONLY + PLAYING + VALID RANGE)
                    // Compare EFFECTIVE ticks to avoid false positives (e.g., end-of-song 667200 → 1)
                    // ============================================
                    const prevTick = lastUpdateTickRef.current;
                    const currTick = effectiveTick;
                    const isValidRange = !!activeRange && activeRange.endTick > activeRange.startTick;

                    const isLoopReset =
                        loopActive &&          // Gate 1: loop mode must be ON
                        playing &&             // Gate 2: must be actively playing
                        isValidRange &&        // Gate 3: must have a real range
                        prevTick >= 0 &&       // Gate 4: prev tick must be valid
                        currTick < prevTick && // Gate 5: backwards jump
                        Math.abs(currTick - prevTick) > 100;

                    if (isLoopReset) {
                        if (DEBUG) console.log(`🔄 Loop reset detected - tick jumped from ${prevTick} to ${currTick}`);
                        cursor.requestSnap();
                    }

                    lastUpdateTickRef.current = effectiveTick;

                    const tickCache = (api as any).tickCache;

                    if (!tickCache) return;

                    // ============================================
                    // 🔥 V99.3: BEAT LOOKUP SCOPE SWITCH
                    // Snap-back detected: use all tracks (prevents fallback into repeat section)
                    // Normal / paused: use selected track (visual focus)
                    // ============================================
                    const indicesForBeatLookup = isSnapBack
                        ? allTrackIndicesRef.current       // ✅ Snap-back: all tracks (prevents repeat fallback)
                        : cursorTrackIndicesRef.current;   // ✅ Normal: selected track (visual focus)

                    const beatResult = tickCache.findBeat(indicesForBeatLookup, effectiveTick);
                    // ============================================
                    // 🔒 END BEAT LOOKUP SCOPE SWITCH 🔒
                    // ============================================

                    if (!beatResult?.beat) {
                        // 🔥 V99.0: Suppress warning at song end when not looping (benign noise)
                        const isNearSongEnd = effectiveTick > 0 && api.score?.masterBars
                            && effectiveTick >= (api.score.masterBars[api.score.masterBars.length - 1]?.start ?? Infinity);

                        if (DEBUG && !(isNearSongEnd && !loopActive)) {
                            console.warn(`⚠️ No beat found for tick ${effectiveTick}`);
                        }
                        return;
                    }

                    const beatBounds = api.renderer.boundsLookup.findBeat(beatResult.beat);
                    if (!beatBounds) {
                        if (DEBUG) console.warn(`⚠️ No bounds for beat at tick ${effectiveTick}`);
                        return;
                    }

                    // 🔥 V98.125: Validate range before using for lookahead
                    const rangeForLookahead = (activeRange && activeRange.endTick > activeRange.startTick)
                        ? activeRange
                        : null;
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
                        cursor.setTick(
                            effectiveTick,
                            beatResult.beat,
                            beatBounds,
                            nextBeatCenterX,
                            rangeForLookahead
                        );
                    } catch (err) {
                        console.error('🚨 [MaestroCursor] setTick crashed - playback continues:', err);
                    }
                });

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

            if (cursorRef.current) {
                cursorRef.current.destroy();
                cursorRef.current = null;
            }

            if (apiRef.current) {
                try {
                    apiRef.current.destroy();
                } catch (e) {
                    // Silent
                }
                apiRef.current = null;
            }
            delete (window as any).__at;
        };
    }, [fileUrl, soundFontPath, scrollContainerRef, isMobile, playerMode]);

    // ========== PLAYER MODE, HANDLER, FILE LOADING ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        (api.settings.player as any).playerMode = playerMode;
        api.updateSettings();
    }, [playerMode]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !api.player?.output) return;

        if (externalMediaHandler) {
            const output = api.player.output as any;
            output.handler = externalMediaHandler;

            return () => {
                if (api.player?.output) {
                    const output = api.player.output as any;
                    if (output.handler) {
                        output.handler = null;
                    }
                }
            };
        } else {
            const output = api.player.output as any;
            if (output.handler) {
                output.handler = null;
            }
        }
    }, [externalMediaHandler]);

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

    // ========== ORIENTATION, THEME, LOOPS ==========

    useEffect(() => {
        if (!apiRef.current || !isRendered || !scoreIsLoaded) return;
        if (!containerRef.current) return;

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

                const horizontalOffset = scrollElement.clientWidth * 0.25;
                (api.settings.player as any).scrollOffset = horizontalOffset;

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

    useEffect(() => {
        const api = apiRef.current;
        if (!api || !isRendered) return;

        if (lastThemeRef.current === theme) return;

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

        const playerSettings = api.settings.player as any;
        playerSettings.enableLoop = !!isLooping;
        api.updateSettings();

        setLoopCursorMode(api, isLooping);

        return () => {
            if (api) {
                setLoopCursorMode(api, false);
            }
        };
    }, [isLooping]);

    // ============================================
    // 🔒 CRITICAL: V98.123 LISTENER ATTACHMENT FIX 🔒
    // DO NOT REMOVE - Ensures listener attaches AFTER API is ready
    // Root cause: useEffect ran before API ready, never re-ran
    // Fix: Added scoreIsLoaded dependency to trigger re-run
    // ============================================
    useEffect(() => {
        const api = apiRef.current;

        if (!api || !scoreIsLoaded) {
            if (DEBUG_RANGE_LISTENER) {
                console.log('🔌 Range listener NOT attached - API not ready', {
                    hasApi: !!api,
                    scoreIsLoaded
                });
            }
            return;
        }

        if (DEBUG_RANGE_LISTENER) {
            console.log('🔌 ========================================');
            console.log('🔌 V98.123: Attaching playbackRangeChanged listener');
            console.log('🔌 ========================================');
        }

        if (api.playbackRange) {
            playbackRangeRef.current = api.playbackRange;
            lastStableRangeRef.current = api.playbackRange;
            if (DEBUG_RANGE_LISTENER) {
                console.log('🔌 INIT: Populated refs from api.playbackRange', api.playbackRange);
            }
        }

        const handleRangeChange = (e: any) => {
            const fromEvent = e?.playbackRange ?? null;
            const fromApi = api.playbackRange ?? null;
            const next = fromEvent || fromApi;

            if (DEBUG_RANGE_LISTENER) {
                console.log('🔌 Range change event fired', {
                    fromEvent,
                    fromApi,
                    selected: next,
                    live: playbackRangeRef.current,
                    stable: lastStableRangeRef.current
                });
            }

            if (next) {
                lastStableRangeRef.current = next;
                if (DEBUG_RANGE_LISTENER) {
                    console.log(`🧷 Stable Range Memory Locked: ${next.startTick} - ${next.endTick}`);
                }
            }

            if (!next && isLoopingRef.current && isPlayingRef.current) {
                if (DEBUG_RANGE_LISTENER) {
                    console.log('🧷 Ignoring transient playbackRange=null while playing');
                }
                return;
            }

            // 🔥 V98.125: Clear sticky range when playbackRange becomes null and loop is OFF
            if (!next && !isLoopingRef.current) {
                lastStableRangeRef.current = null;
                if (DEBUG_RANGE_LISTENER) {
                    console.log('🧹 Cleared stable range (loop OFF, range null)');
                }
            }

            playbackRangeRef.current = next;

            if (next) {
                onLoopRangeChange?.(next.startTick, next.endTick);
            } else {
                onLoopRangeChange?.(null, null);
            }
        };

        api.playbackRangeChanged.on(handleRangeChange);

        if (DEBUG_RANGE_LISTENER) {
            console.log('🔌 ✅ Listener attached successfully');
        }

        return () => {
            if (DEBUG_RANGE_LISTENER) {
                console.log('🔌 Detaching playbackRangeChanged listener');
            }
            api.playbackRangeChanged.off(handleRangeChange);
        };
    }, [onLoopRangeChange, scoreIsLoaded]);
    // ============================================
    // 🔒 END LISTENER ATTACHMENT FIX 🔒
    // ============================================

    // ========== LOOP AUTO-INIT (Preserved from V99.3) ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || !isLooping) return;

        if (!api.playbackRange && api.tickPosition !== undefined) {
            const currentTick = api.tickPosition;
            const trackIndices = cursorTrackIndicesRef.current;
            const tickCache = (api as any).tickCache;

            if (tickCache) {
                const beatResult = tickCache.findBeat(trackIndices, currentTick);

                if (beatResult?.beat) {
                    const firstBeat = getFirstBeatInBar(api, beatResult.beat);

                    let boundaries = getBarBoundariesFromMaster(api, firstBeat);
                    if (!boundaries) {
                        boundaries = getBarBoundaries(firstBeat);
                    }

                    if (boundaries) {
                        const snapped = getSnappedBarBoundaries(api, boundaries.startTick, boundaries.endTick);
                        if (snapped) {
                            api.playbackRange = {
                                startTick: snapped.startTick,
                                endTick: snapped.endTick,
                            };
                        }
                    }
                }
            }
        }
    }, [isLooping, isRendered]);

    // ========== SINGLE CLICK SEEK ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) {
            return;
        }

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                if (DEBUG) console.log(`🎯 SEEK TO: tick ${tickPosition} (M${Math.floor(tickPosition / 1920) + 1})`);

                // 🔥 V99.1: Use Authority Seek (audio + visual + cursor)
                authoritySeekToTick(api, tickPosition, beat);

                if (DEBUG) console.log(`✅ SEEK: Authority seek completed`);
            }
        };

        target.addEventListener('click', handleClick);

        return () => {
            target.removeEventListener('click', handleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, renderCycle, authoritySeekToTick]);

    // ========== DOUBLE CLICK PLAY ==========

    useEffect(() => {
        const api = apiRef.current;
        const container = containerRef.current;

        if (!api || !container || !isRendered || isLooping) return;

        const surface = container.querySelector('.at-surface') as HTMLElement | null;
        const target = surface || container;

        const handleDoubleClick = (e: MouseEvent) => {
            if (isSeeking && isPlaying) {
                return;
            }

            const beat = getBeatAtPosition(api, container, e.clientX, e.clientY);
            if (beat && beat.absolutePlaybackStart !== undefined) {
                const tickPosition = beat.absolutePlaybackStart;

                if (audioSource === 'synth') {
                    api.tickPosition = tickPosition;
                    api.play?.();
                } else {
                    const output = api.player?.output as any;

                    if (output?.handler) {
                        api.tickPosition = tickPosition;

                        if (output.handler.play) {
                            output.handler.play();
                        }

                        api.play();
                    }
                }
            }
        };

        target.addEventListener('dblclick', handleDoubleClick);

        return () => {
            target.removeEventListener('dblclick', handleDoubleClick);
        };
    }, [isRendered, isLooping, audioSource, isSeeking, isPlaying, fileUrl, renderCycle]);

    // ========== CLEAR LOOP WHEN DISABLED ==========

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;

        if (!isLooping) {
            if (api.playbackRange) {
                api.playbackRange = null;
            }
            // 🔥 V98.125: Clear sticky refs when loop mode is disabled
            playbackRangeRef.current = null;
            lastStableRangeRef.current = null;
        }
    }, [isLooping]);

    // ============================================
    // 🔥 V99.0/V99.3: TRACK CHANGE CURSOR RE-ANCHOR WITH BOUNDS RETRY
    // Cursor-only: updates cursorTrackIndicesRef + repositions cursor
    // V99.3: Only updates cursorTrackIndicesRef (allTrackIndicesRef stays unchanged)
    // DOES NOT change api.tracks or mute state (audio remains full band)
    // ============================================
    useEffect(() => {
        const api = apiRef.current;
        const cursor = cursorRef.current;
        if (!api || !cursor || !isRendered || !scoreIsLoaded) return;

        // ============================================
        // 🔥 V99.3: Only update CURSOR visual scope
        // allTrackIndicesRef stays unchanged (set once in scoreLoaded)
        // ============================================
        cursorTrackIndicesRef.current = new Set([selectedTrackIndex ?? 0]);

        const tickCache = (api as any).tickCache;
        if (!tickCache || !api.renderer?.boundsLookup) return;

        const attemptReAnchor = (retryCount: number = 0) => {
            // Prefer current tick position
            const targetTick = api.tickPosition ?? 0;

            // Try exact tick, then small fallbacks (handles "end tick" / gaps)
            const tryTicks = [targetTick, targetTick - 1, targetTick - 10, targetTick - 120].filter(t => t >= 0);
            let beatResult: any = null;

            for (const t of tryTicks) {
                const res = tickCache.findBeat(cursorTrackIndicesRef.current, t);
                if (res?.beat) {
                    beatResult = { ...res, resolvedTick: t };
                    break;
                }
            }

            // Hard fallback to tick 0 if all else fails
            if (!beatResult?.beat) {
                const res0 = tickCache.findBeat(cursorTrackIndicesRef.current, 0);
                if (res0?.beat) {
                    beatResult = { ...res0, resolvedTick: 0 };
                }
            }

            // 🔥 V99.0: Suppress warning at song end (treat as benign noise)
            const isNearSongEnd = targetTick > 0 && api.score?.masterBars
                && targetTick >= (api.score.masterBars[api.score.masterBars.length - 1]?.start ?? Infinity);

            if (!beatResult?.beat) {
                if (DEBUG && !isNearSongEnd && retryCount === 0) {
                    console.warn('⚠️ Track change: no beat found to re-anchor cursor', {
                        selectedTrackIndex,
                        targetTick
                    });
                }
                return;
            }

            const beat = beatResult.beat;
            const beatBounds = api.renderer.boundsLookup.findBeat(beat);

            // 🔥 V99.0: BOUNDS RETRY LOGIC
            // If bounds aren't ready, retry after render settles
            if (!beatBounds) {
                if (retryCount < 3) {
                    if (DEBUG && retryCount === 0) {
                        console.log(`🔄 Track change: bounds not ready, retrying... (attempt ${retryCount + 1})`);
                    }

                    // Try again after next frame
                    if (retryCount === 0) {
                        requestAnimationFrame(() => attemptReAnchor(retryCount + 1));
                    } else {
                        // Subsequent retries use setTimeout for longer delay
                        setTimeout(() => attemptReAnchor(retryCount + 1), 80);
                    }
                    return;
                }

                // Final failure after retries
                if (DEBUG) {
                    console.warn('⚠️ Track change: beat has no bounds after retries', {
                        selectedTrackIndex,
                        tick: beatResult.resolvedTick,
                        retries: retryCount
                    });
                }
                return;
            }

            // 🔥 V98.126 CIPHER TWEAK #1: Use beat's own start tick (prevents drift in GP3/repeat files)
            const anchorTick = beat.absolutePlaybackStart ?? beatResult.resolvedTick;

            // 🔥 V98.126 CIPHER TWEAK #2: Respect loop mode when re-anchoring
            const loopActive = isLoopingRef.current;
            const activeRange = loopActive
                ? (playbackRangeRef.current || lastStableRangeRef.current)
                : null;
            const rangeForCursor = (activeRange && activeRange.endTick > activeRange.startTick)
                ? activeRange
                : null;

            // Re-anchor cursor to new track's beat/bounds
            cursor.requestSnap();
            cursor.setBeat(beat, beatBounds);
            cursor.setTick(anchorTick, beat, beatBounds, null, rangeForCursor);

            if (DEBUG) {
                console.log('✅ Track change: cursor re-anchored', {
                    selectedTrackIndex,
                    targetTick,
                    resolvedTick: beatResult.resolvedTick,
                    anchorTick,
                    loopActive,
                    rangeActive: !!rangeForCursor,
                    retriesNeeded: retryCount
                });
            }
        };

        // Start re-anchor attempt
        attemptReAnchor(0);

    }, [selectedTrackIndex, isRendered, scoreIsLoaded, renderCycle]);
    // ============================================
    // 🔒 END TRACK CHANGE CURSOR RE-ANCHOR 🔒
    // ============================================

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