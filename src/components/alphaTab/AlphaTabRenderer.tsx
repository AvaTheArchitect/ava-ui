'use client';

/**
 * AlphaTabRenderer_V103.tsx
 * Date: March 26th, 2026
 * Cloned from V102.7 — Phase 1 forensic diagnostic added (no normalization changes)
 *
 * V103 CHANGES (diagnostic only):
 * ✅ PHASE 1 FORENSIC block added — runs at the TOP of the isGP8 setTimeout (350ms),
 *    BEFORE any normalization writes, so all captured Y/bbox values are raw.
 * ✅ Finds the densest annotation row (max fx:/P.M./tuning:/N.B. nodes) in Track 3
 * ✅ Dumps full node inventory grouped by lane classification
 * ✅ Flags unclassified nodes for Phase 2 review
 * ✅ Lane guards written independently — NOT shared with lyric/NOT_LYRIC patterns
 * ✅ Zero normalization changes — existing V102.7 normalization block preserved exactly
 * ✅ GP8 layout logic extracted to lib/alphaTab/gp8LayoutEngine.ts (behavior-preserving)
 *
 * 🔒 V102.7 PRESERVED EXACTLY (normalization block untouched):
 *   ✅ GP8_DISPLAY_OVERRIDES frozen at Stage 3 baseline
 *   ✅ barNumberY anchor, TEMPO_ROW_GAP, SIMPLE_ROW_GAP, section marker normalization
 *   ✅ Unified tempo lane fix (single vs. multi-tempo), MutationObserver
 *   ✅ scoreLoaded: renderTracks([selectedTrack])
 *   ✅ trackIndices useEffect: renderTracks([selectedTrack])
 *   ✅ MaestroCursor v4.5, cursor engine lock, all event listeners
 *   ✅ BeatCustomLoopOverlay, click-to-seek, double-click-to-play
 *   ✅ DOM-aware cursor creation/recreation
 *   ✅ Retry-based initial anchor loop
 *   ✅ Post-paint fallback render (M1 cold-boot guard)
 */

import React, { useEffect, useRef, useState } from 'react';
import { initAlphaTab, loadGuitarProFile } from '@/lib/alphaTab/initAlphaTab';
import { attachMaestroCursor, MaestroCursor } from '@/components/alphaTab/MaestroCursor';
import BeatCustomLoopOverlay from '@/components/alphaTab/BeatCustomLoopOverlay';
import { runGp8LayoutEngine } from '@/lib/alphaTab/gp8LayoutEngine';
// gp8LaneMap.ts is the lane authority — imported by gp8LayoutEngine, not the renderer directly.
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

export interface AlphaTabRendererV102Props {
    fileUrl: string;
    trackIndices?: number[];
    isPlaying: boolean;
    onPlayStateChange: (playing: boolean) => void;
    onRendered?: () => void;
    onBoundsReady?: () => void;
    onPlayerReady?: () => void;
    onApiReady?: (api: AlphaTabApi) => void;
    onScoreLoaded?: (songInfo: SongInfo, tracks: Track[]) => void;
    loopEnabled: boolean;
    playbackRange: { startTick: number; endTick: number } | null;
    onLoopToggle: (enabled: boolean) => void;
    onLoopChange: (startTick: number, endTick: number) => void;
    onLoopClear: () => void;
    soundFontPath?: string;
    theme?: 'light' | 'dark';
    className?: string;
}

// ─── GP7/GP8 layout profile ───────────────────────────────────────────────────
// 🔒 FROZEN BASELINE — March 25, 2026 (Stage 3 / V29)
// Geometry reduction history:
//   Stage 1: bottom-side reduction → broke lyric lane, reverted
//   Stage 2: top/effect-side reduction → normal rows 196→192, tempo 229→225, lyrics safe
//   Stage 3: pushed top-side harder → normal ~190, tempo ~215, diminishing returns
// Remaining overage (~+30 normal, ~+40 tempo) is NOT in these padding keys.
// Further global reductions hurt Half Time row (145→143, target 179) more than they help.
// DO NOT CHANGE these values. Handle Half Time and residual row height separately.
const GP8_DISPLAY_OVERRIDES: Record<string, number> = {
    firstSystemPaddingTop: 12,
    firstNotationStaffPaddingTop: 0,
    notationStaffPaddingTop: 0,
    notationStaffPaddingBottom: 10,      // locked — reducing breaks lyric lane
    lastNotationStaffPaddingBottom: 12,  // locked
    lyricLinesPaddingBetween: 10,        // locked
    trackStaffPaddingBetween: 2,
    systemPaddingBottom: 8,              // locked
    effectStaffPaddingTop: 0,
    effectStaffPaddingBottom: 6,         // locked
};

async function waitForContainerWidth(el: HTMLElement, maxWait = 3000): Promise<void> {
    const deadline = Date.now() + maxWait;
    return new Promise(resolve => {
        const check = () => {
            if (el.clientWidth > 0 || Date.now() >= deadline) { resolve(); return; }
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    });
}

function getTrackSet(api: any): Set<number> {
    return api.tracks
        ? new Set<number>(api.tracks.map((t: any) => t.index as number))
        : new Set<number>([0]);
}

export const AlphaTabRendererV102 = React.memo(function AlphaTabRendererV102({
    fileUrl,
    trackIndices = [0],
    isPlaying,
    onPlayStateChange,
    onRendered,
    onBoundsReady,
    onPlayerReady,
    onApiReady,
    onScoreLoaded,
    loopEnabled,
    playbackRange,
    onLoopToggle,
    onLoopChange,
    onLoopClear,
    soundFontPath = '/soundfont/sonivox.sf2',
    theme = 'light',
    className,
}: AlphaTabRendererV102Props) {

    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const cursorRef = useRef<MaestroCursor | null>(null);
    const initTokenRef = useRef(0);

    const [isLoading, setIsLoading] = useState(true);
    const [surfaceReady, setSurfaceReady] = useState(false);

    const loopEnabledRef = useRef(loopEnabled);
    const playbackRangeRef = useRef(playbackRange);
    const isPlayingRef = useRef(isPlaying);
    const seekInProgressRef = useRef(false);

    const lastTickRef = useRef<number | null>(null);
    const stableCurBeatRef = useRef<any>(null);
    const stableExpandedBeatStartRef = useRef<number>(0);
    const stableNextBeatRef = useRef<any>(null);

    loopEnabledRef.current = loopEnabled;
    playbackRangeRef.current = playbackRange;
    isPlayingRef.current = isPlaying;

    useEffect(() => {
        if (!containerRef.current) return;
        if (apiRef.current) return;
        if (!fileUrl) return;

        let destroyed = false;
        const token = ++initTokenRef.current;

        // ── V102.6: Detect GP7/GP8 by extension ──────────────────────────────
        const cleanUrl = fileUrl.split('?')[0];
        const fileExt = cleanUrl.split('.').pop()?.toLowerCase() ?? '';
        const isGP8 = fileExt === 'gp';

        console.log('🎼 V102.6 layout check:', { fileUrl, cleanUrl, fileExt, isGP8 });

        const init = async () => {
            const container = containerRef.current!;

            await waitForContainerWidth(container);
            if (destroyed || token !== initTokenRef.current) return;

            const api = await initAlphaTab({
                container,
                playerMode: 'synthesizer',
                soundFontPath,
                layoutMode: 'page',
                scrollMode: 'off',
                ...(isGP8 && { displayOverrides: GP8_DISPLAY_OVERRIDES }),
            });
            if (destroyed || token !== initTokenRef.current) { api.destroy(); return; }

            apiRef.current = api;
            if (typeof window !== 'undefined') (window as any).__atV102 = api;

            if (isGP8) {
                const d = api.settings?.display as any;
                console.log('🎼 V102.6 post-init display values:', {
                    firstSystemPaddingTop: d?.firstSystemPaddingTop,
                    systemPaddingTop: d?.systemPaddingTop,
                    systemPaddingBottom: d?.systemPaddingBottom,
                    lastSystemPaddingBottom: d?.lastSystemPaddingBottom,
                    firstNotationStaffPaddingTop: d?.firstNotationStaffPaddingTop,
                    notationStaffPaddingTop: d?.notationStaffPaddingTop,
                    notationStaffPaddingBottom: d?.notationStaffPaddingBottom,
                    lastNotationStaffPaddingBottom: d?.lastNotationStaffPaddingBottom,
                    effectStaffPaddingTop: d?.effectStaffPaddingTop,
                    effectStaffPaddingBottom: d?.effectStaffPaddingBottom,
                    effectBandPaddingBottom: d?.effectBandPaddingBottom,
                    trackStaffPaddingBetween: d?.trackStaffPaddingBetween,
                    lyricLinesPaddingBetween: d?.lyricLinesPaddingBetween,
                    padding: d?.padding,
                    hideInfo: d?.hideInfo,
                    stretchForce: d?.stretchForce,
                });
            }

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
                },
            };

            onApiReady?.(api as unknown as AlphaTabApi);

            api.scoreLoaded.on(() => {
                const score = api.score;
                if (score?.tracks?.length) {
                    const tracksToRender = trackIndices
                        .map((i: number) => score.tracks[i])
                        .filter(Boolean);
                    if (tracksToRender.length) {
                        api.renderTracks(tracksToRender);
                        console.log(`✅ V102.5: scoreLoaded → renderTracks([${trackIndices.join(', ')}])`);
                    }
                }
                if (onScoreLoaded && api.score) {
                    const info: SongInfo = {
                        title: api.score.title ?? '',
                        artist: api.score.artist ?? '',
                        album: api.score.album ?? '',
                    } as SongInfo;
                    onScoreLoaded(info, (api.score.tracks ?? []) as Track[]);
                }
            });

            api.renderStarted.on(() => { /* bounds invalidated */ });

            // GP8 layout engine — fires from renderFinished with setTimeout(0) + double-RAF.
            // setTimeout(0) pushes us behind AlphaTab's own next-frame work.
            // Double-RAF then ensures we run after AlphaTab's deferred SVG mutations settle.
            let gp8PatchTimer: number | null = null;
            api.renderFinished.on(() => {
                setIsLoading(false);
                onRendered?.();

                const surface = containerRef.current?.querySelector('.at-surface') as HTMLElement | null;
                if (isGP8 && surface) surface.style.visibility = 'hidden';

                if (isGP8) {
                    if (gp8PatchTimer !== null) window.clearTimeout(gp8PatchTimer);
                    gp8PatchTimer = window.setTimeout(() => {
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                const host = containerRef.current;
                                if (host) runGp8LayoutEngine({ rootEl: host, surfaceEl: surface });
                            });
                        });
                    }, 0);
                }

                setTimeout(() => {
                    if (!api.renderer?.boundsLookup?.staffSystems) {
                        console.warn('⚠️ V102: Bounds not ready after renderFinished delay');
                        return;
                    }
                    onBoundsReady?.();

                    const host = containerRef.current;
                    if (!host) return;

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
                        cursorRef.current = attachMaestroCursor(api, host);
                        setSurfaceReady(true);
                    } else if (cursorRef.current) {
                        const el = cursorRef.current.element;
                        if (el && !host.contains(el)) host.appendChild(el);
                        cursorRef.current.requestSnap();
                        setSurfaceReady(true);
                    }

                    setTimeout(() => {
                        host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor')
                            .forEach(n => ((n as HTMLElement).style.display = 'none'));
                    }, 100);

                    // ── GP8 layout engine ─────────────────────────────────────
                    // Triggered via renderFinished + double-RAF above.
                    // Surface visibility is managed there too.
                    if (!isGP8) {
                        if (surface) surface.style.visibility = 'visible';
                    }

                    const anchorCursor = (attempt = 0) => {
                        if (!cursorRef.current || !api.renderer?.boundsLookup) return;
                        const tickCache = (api as any).tickCache;
                        if (!tickCache) {
                            if (attempt < 10) setTimeout(() => anchorCursor(attempt + 1), attempt < 3 ? 100 : 200);
                            return;
                        }
                        const tick = needsCreation ? 0 : (api.tickPosition ?? 0);
                        const r = tickCache.findBeat(getTrackSet(api), tick);
                        if (!r?.beat) {
                            if (attempt < 10) setTimeout(() => anchorCursor(attempt + 1), attempt < 3 ? 100 : 200);
                            return;
                        }
                        cursorRef.current.requestSnap();
                        cursorRef.current.setBeat(r.beat);
                        cursorRef.current.setTick(tick);
                    };
                    setTimeout(() => anchorCursor(0), 150);

                }, 200);
            });

            const notifyPlayerReady = () => { if (api.isReadyForPlayback) onPlayerReady?.(); };
            api.playerReady?.on(() => setTimeout(notifyPlayerReady, 100));
            api.soundFontLoaded?.on(() => {
                console.log('✅ V102: Soundfont loaded');
                notifyPlayerReady();
            });

            let stateDebounce: ReturnType<typeof setTimeout>;
            api.playerStateChanged.on((e: any) => {
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) onPlayStateChange(playing);
                }, 50);
            });

            // 🔒🔒🔒 CURSOR ENGINE LOCK — DO NOT MODIFY 🔒🔒🔒
            api.playerPositionChanged.on((e: any) => {
                if (!cursorRef.current) return;

                const tickRaw = e.currentTick ?? e.tickPosition;
                if (tickRaw == null) return;

                const range = playbackRangeRef.current;
                if (loopEnabledRef.current && range) {
                    const SAFETY_MARGIN = 120;
                    if (tickRaw >= range.endTick - SAFETY_MARGIN) {
                        cursorRef.current.requestSnap();
                        api.tickPosition = range.startTick;
                        return;
                    }
                }

                const tick = tickRaw;
                const lastTick = lastTickRef.current;
                const jumped = lastTick != null && Math.abs(tick - lastTick) > 2000;
                lastTickRef.current = tick;
                if (jumped) {
                    cursorRef.current.requestSnap();
                    stableCurBeatRef.current = null;
                    stableExpandedBeatStartRef.current = 0;
                }

                const trackSet = getTrackSet(api);
                const tickCache = (api as any).tickCache;
                if (!tickCache) return;

                let curBeat: any = null;

                const masterBarsArr = (tickCache as any).masterBars as any[];
                if (masterBarsArr?.length) {
                    const occurrenceMap = new Map<number, number>();
                    let ownerMbIdx: number | null = null;
                    let ownerOccurrence = 0;
                    let ownerExpandedStart = 0;

                    for (const mb of masterBarsArr) {
                        const mbIdx = mb?.masterBar?.index;
                        if (mbIdx == null) continue;
                        const occ = occurrenceMap.get(mbIdx) ?? 0;
                        occurrenceMap.set(mbIdx, occ + 1);
                        const dur = mb.masterBar?.calculateDuration?.() ?? 0;
                        if (tick >= mb.start && tick < mb.start + dur) {
                            ownerMbIdx = mbIdx;
                            ownerOccurrence = occ;
                            ownerExpandedStart = mb.start;
                        }
                    }

                    if (ownerMbIdx != null) {
                        const systems = api.renderer?.boundsLookup?.staffSystems ?? [];
                        const visualOccMap = new Map<number, number>();
                        let targetMbb: any = null;

                        outer2: for (const sys of systems) {
                            for (const mbb of ((sys as any)?.bars ?? [])) {
                                const vbIdx = (mbb as any)?.masterBar?.index ?? (mbb as any)?.index;
                                if (vbIdx == null) continue;
                                const vOcc = visualOccMap.get(vbIdx) ?? 0;
                                visualOccMap.set(vbIdx, vOcc + 1);
                                if (vbIdx === ownerMbIdx && vOcc === ownerOccurrence) {
                                    targetMbb = mbb;
                                    break outer2;
                                }
                            }
                        }

                        if (targetMbb) {
                            outer3: for (const barBounds of ((targetMbb as any)?.bars ?? [])) {
                                for (const voiceBounds of ((barBounds as any)?.voices ?? [])) {
                                    for (const beatBounds of ((voiceBounds as any)?.beats ?? [])) {
                                        const beat = (beatBounds as any)?.beat;
                                        if (!beat) continue;
                                        const bOffset = beat.playbackStart ?? 0;
                                        const bDur = beat.playbackDuration ?? beat.duration ?? 0;
                                        const beatExpandedStart = ownerExpandedStart + bOffset;
                                        if (beatExpandedStart <= tick && tick < beatExpandedStart + bDur) {
                                            curBeat = beat;
                                            break outer3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (!curBeat) {
                    const r = tickCache.findBeat(trackSet, tick);
                    if (!r?.beat) return;
                    curBeat = r.beat;
                }

                const isSameBeat = (a: any, b: any): boolean => {
                    if (!a || !b) return false;
                    return (
                        a.absolutePlaybackStart === b.absolutePlaybackStart &&
                        a.voice?.bar?.masterBar?.index === b.voice?.bar?.masterBar?.index
                    );
                };

                if (!isSameBeat(curBeat, stableCurBeatRef.current) || jumped) {
                    stableCurBeatRef.current = curBeat;

                    let expandedBeatStart = tick;
                    for (let t = tick - 1; t >= tick - 2000; t--) {
                        const r = tickCache.findBeat(trackSet, t);
                        if (!r?.beat || !isSameBeat(r.beat, curBeat)) {
                            expandedBeatStart = t + 1;
                            break;
                        }
                    }
                    stableExpandedBeatStartRef.current = expandedBeatStart;

                    let scannedNextBeat: any = null;
                    for (let t = expandedBeatStart + 1; t <= expandedBeatStart + 4000; t++) {
                        const r = tickCache.findBeat(trackSet, t);
                        if (r?.beat && !isSameBeat(r.beat, curBeat)) {
                            scannedNextBeat = r.beat;
                            break;
                        }
                    }
                    stableNextBeatRef.current = scannedNextBeat;
                    cursorRef.current.setBeat(curBeat);
                }

                cursorRef.current.setTick(
                    tick,
                    stableNextBeatRef.current,
                    stableExpandedBeatStartRef.current,
                );
            });
            // 🔒🔒🔒 END CURSOR ENGINE LOCK 🔒🔒🔒

            await loadGuitarProFile(api, fileUrl);

            if (container.clientWidth === 0) {
                requestAnimationFrame(() => {
                    if (container.clientWidth > 0 && apiRef.current) {
                        console.warn('⚠️ V102.5: Post-paint fallback — re-rendering');
                        apiRef.current.render();
                    }
                });
            }
        };

        init().catch(console.error);

        return () => {
            destroyed = true;
            ++initTokenRef.current;
            setSurfaceReady(false);
            setIsLoading(true);
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
            if (apiRef.current) { apiRef.current.destroy(); apiRef.current = null; }
            lastTickRef.current = null;
            stableCurBeatRef.current = null;
            stableExpandedBeatStartRef.current = 0;
            stableNextBeatRef.current = null;
        };
    }, [fileUrl]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api?.score?.tracks?.length) return;
        const tracksToRender = trackIndices
            .map((i: number) => api.score.tracks[i])
            .filter(Boolean);
        if (!tracksToRender.length) return;
        api.renderTracks(tracksToRender);
        console.log(`🎸 V102.5: renderTracks → [${trackIndices.join(', ')}]`);
    }, [trackIndices]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api?.isReadyForPlayback) return;
        if (isPlaying) { api.play(); } else { api.pause(); }
    }, [isPlaying]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        api.playbackRange = (loopEnabled && playbackRange) ? playbackRange : null;
    }, [loopEnabled, playbackRange]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        let detach: (() => void) | undefined;

        const tryAttach = (attempt = 0) => {
            if (cancelled) return;
            const surface = container.querySelector('.at-surface') as HTMLElement | null;
            if (!surface) {
                if (attempt < 20) setTimeout(() => tryAttach(attempt + 1), 150);
                return;
            }

            const handleClick = (ev: MouseEvent) => {
                const api = apiRef.current;
                if (!api || loopEnabledRef.current) return;

                const rect = surface.getBoundingClientRect();
                const scrollEl = api.renderer?.framer?.scrollElement as HTMLElement | undefined;
                const sx = scrollEl?.scrollLeft ?? surface.scrollLeft ?? 0;
                const sy = scrollEl?.scrollTop ?? surface.scrollTop ?? 0;
                const x = (ev.clientX - rect.left) + sx;
                const y = (ev.clientY - rect.top) + sy;

                const beat = api.renderer?.boundsLookup?.getBeatAtPos?.(x, y);
                const tickCache = (api as any).tickCache;
                if (!beat || !tickCache?.masterBars) return;

                const mbIdx = beat.voice?.bar?.masterBar?.index;
                const offset = beat.playbackStart ?? 0;
                if (mbIdx == null) return;

                const currentTick = api.tickPosition ?? 0;
                const candidates: number[] = tickCache.masterBars
                    .filter((mb: any) => mb.masterBar?.index === mbIdx)
                    .map((mb: any) => mb.start + offset);
                if (!candidates.length) return;

                const target = candidates.reduce((prev: number, curr: number) =>
                    Math.abs(curr - currentTick) < Math.abs(prev - currentTick) ? curr : prev
                );

                const wasPlaying = (api.playerState ?? 0) !== 0;
                if (wasPlaying) {
                    seekInProgressRef.current = true;
                    api.pause();
                }

                const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                if (seekTicks) seekTicks(target);
                api.tickPosition = target;
                cursorRef.current?.requestSnap();

                if (wasPlaying) {
                    setTimeout(() => {
                        if (seekTicks) seekTicks(target);
                        api.tickPosition = target;
                        api.play();
                        requestAnimationFrame(() => { seekInProgressRef.current = false; });
                    }, 30);
                }
            };

            const handleDblClick = () => {
                const api = apiRef.current;
                if (!api?.isReadyForPlayback) return;
                if (api.playerState !== 0) { api.pause(); onPlayStateChange(false); }
                else { api.play(); onPlayStateChange(true); }
            };

            surface.addEventListener('click', handleClick);
            surface.addEventListener('dblclick', handleDblClick);
            detach = () => {
                surface.removeEventListener('click', handleClick);
                surface.removeEventListener('dblclick', handleDblClick);
            };
        };

        tryAttach();
        return () => { cancelled = true; detach?.(); };
    }, [fileUrl]);

    const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';

    return (
        <div className={`relative ${className ?? ''}`}>
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center z-20 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            Loading tab &amp; initializing synthesizer…
                        </p>
                    </div>
                </div>
            )}
            <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate' as any }}>
                <div
                    ref={containerRef}
                    className="alphatab-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: '600px',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch' as any,
                        background: bgColor,
                        paddingLeft: 'env(safe-area-inset-left, 0px)',
                        paddingRight: 'env(safe-area-inset-right, 0px)',
                    }}
                />
                {apiRef.current && surfaceReady && (
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 900 }}>
                        <BeatCustomLoopOverlay
                            api={apiRef.current}
                            container={containerRef.current}
                            loopEnabled={loopEnabled}
                            onLoopToggle={onLoopToggle}
                            onLoopChange={onLoopChange}
                            onLoopClear={onLoopClear}
                        />
                    </div>
                )}
            </div>
        </div>
    );
});// Stable entrypoint aliases (deploy-safe)
// - Pages import AlphaTabRendererV102
// - Older code can import AlphaTabRenderer
export const AlphaTabRenderer = AlphaTabRendererV102;
