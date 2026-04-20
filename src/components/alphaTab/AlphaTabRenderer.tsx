'use client';

/**
 * AlphaTabRenderer.tsx
 * Current version: V111
 * Date: April 19th, 2026
 * Cloned from V110 — Landscape scroll + anchor improvements.
 *
 * V111 CHANGES:
 * ✅ [L8-fix] landscapeInitialAnchor: retry-until-ready (polls up to 1000ms)
 *            so it can't fire before tickCache/boundsLookup exist.
 *            Uses reachable-beat probe (beatX >= cursorX + margin) instead of
 *            CLEF_THRESHOLD — fixes delta=-71 misalignment on songs where
 *            firstNoteX < fixedCursorX. Also takes targetScrollLeftRef to
 *            sync the LERP loop start position.
 * ✅ [L7-fix] startLandscapeScrollLoop: RAF loop now reads live tickPosition
 *            from api and computes within-beat interpolated targetX
 *            (curBeatX → nextBeatX). Sustained notes/vibrato/bends scroll
 *            continuously instead of pausing between beats. Falls back to
 *            beat-snap if next beat unavailable. Now takes `api` param.
 * ✅ [L2-fix] landscape playerPositionChanged branch: caches curBeat + nextBeat
 *            + expandedStart/dur into landscapeScrollStateRef so the RAF loop
 *            reads geometry without calling findBeat every frame.
 * ✅ [debug]  window.__atV111 + window.__at alias for Cipher console probes.
 *
 * 🔒 V110 PRESERVED EXACTLY (all behavior unchanged):
 *   ✅ [L1-fix] LandscapeFixedCursorOverlay attaches to non-scrolling wrapper
 *   ✅ [L3] Tap = play/pause in landscape (no seek)
 *   ✅ [L4] renderFinished cursor gate (portrait vs landscape)
 *   ✅ [L5] landscapeCursorRef lifecycle (destroy on unmount/switch)
 *   ✅ [L6] forceHorizontal effect cursor cleanup
 *   ✅ Portrait MaestroCursor V1 engine — byte-for-byte V110
 *   ✅ All V108/V107/V106 preserved locks
 *
 * CURSOR_POSITION_RATIO = 0.12:
 *   115px on a 956px iPad — keeps beat-1 (onNotesX ≈ 120px) reachable:
 *   scrollLeft = 120 - 115 = +5px (valid). Was 0.20 (191px) → delta=-71 (impossible).
 *   If a song's first note is even further left, lower to 0.10. Single constant, nothing else moves.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    initAlphaTab,
    loadGuitarProFile,
    resolveLayoutProfile,
    resolveProfileByWidth,
    resolveTrackLayoutProfile,
    applyAlphaTabLayoutProfile,
    applyAlphaTabLayoutProfileSettings,
    type LayoutProfileName,
} from '@/lib/alphaTab/initAlphaTab';
import { attachMaestroCursor, MaestroCursor } from '@/components/alphaTab/MaestroCursor';
import BeatCustomLoopOverlay from '@/components/alphaTab/BeatCustomLoopOverlay';
import { runGp8LayoutEngine } from '@/lib/alphaTab/gp8LayoutEngine';
import { runGp8LayoutEngineV2 } from '@/lib/alphaTab/gp8LayoutEngineV2';
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
    scrollContainer?: HTMLElement | null;
    forceHorizontal?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CURSOR_POSITION_RATIO = 0.12;   // 12% from left ≈ 115px on 956px iPad
// Ensures beat-1 (onNotesX ≈ 120px) is reachable:
// scrollLeft = beatX - cursorX = 120 - 115 = +5px ✅
// (Was 0.20 = 191px → beat-1 unreachable, delta=-71)
const SCROLL_EASE = 0.18;             // LERP factor per RAF frame (0=no move, 1=instant)

// ── [L1-fix] Landscape Fixed Cursor Overlay ───────────────────────────────────
// Attaches to the NON-scrolling wrapper (containerRef.current.parentElement).
// This means it stays visually fixed while .alphatab-container scrolls beneath it.
class LandscapeFixedCursorOverlay {
    private el: HTMLElement;
    private wrapper: HTMLElement;

    constructor(wrapper: HTMLElement, containerWidth: number) {
        this.wrapper = wrapper;
        this.el = document.createElement('div');
        this.el.id = 'maestro-landscape-cursor';
        const x = Math.round(containerWidth * CURSOR_POSITION_RATIO);
        Object.assign(this.el.style, {
            position: 'absolute',
            top: '0',
            left: `${x}px`,
            width: '2px',
            height: '100%',
            background: 'rgba(168, 85, 247, 0.85)',
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.55)',
            pointerEvents: 'none',
            zIndex: '1001',
            willChange: 'left',
        });
        wrapper.appendChild(this.el);
        console.log('✅ LandscapeFixedCursorOverlay: attached to wrapper at x=', x);
    }

    updateX(containerWidth: number): void {
        const x = Math.round(containerWidth * CURSOR_POSITION_RATIO);
        this.el.style.left = `${x}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 LandscapeFixedCursorOverlay: destroyed');
    }
}

// ── [L8-fix] Landscape initial anchor — retry-until-ready ────────────────────
// Polls up to maxMs for tickCache + boundsLookup to be populated,
// then snaps scrollLeft so the first reachable notehead aligns to the fixed cursor.
// "Reachable" means beatX >= fixedCursorX + margin (so scrollLeft stays >= 0).
// Also syncs targetScrollLeftRef so the LERP loop starts from correct position.
function landscapeInitialAnchor(
    container: HTMLElement,
    api: any,
    targetScrollLeftRef: React.MutableRefObject<number>,
    maxMs = 1000,
): void {
    const deadline = performance.now() + maxMs;

    const step = () => {
        const tickCache = (api as any)?.tickCache;
        const bounds = api?.renderer?.boundsLookup;

        if (!tickCache?.findBeat || !bounds?.findBeat) {
            if (performance.now() < deadline) requestAnimationFrame(step);
            else console.warn('⚠️ V111 landscapeInitialAnchor: timed out waiting for bounds');
            return;
        }

        const trackSet: Set<number> = api?.tracks
            ? new Set(api.tracks.map((t: any) => t.index as number))
            : new Set([0]);
        const fixedCursorX = Math.round(container.clientWidth * CURSOR_POSITION_RATIO);
        const REACH_MARGIN = 16; // px — breathing room so beat sits just left of cursor
        const reachableFloor = fixedCursorX + REACH_MARGIN;

        const PROBE_TICKS = [0, 60, 120, 240, 480, 720, 960];

        for (const probe of PROBE_TICKS) {
            const r = tickCache.findBeat(trackSet, probe);
            const bb = r?.beat ? bounds.findBeat(r.beat) : null;
            if (!bb?.visualBounds) continue;
            const beatX = typeof bb.onNotesX === 'number'
                ? bb.onNotesX
                : bb.visualBounds.x + bb.visualBounds.w / 2;
            if (beatX >= reachableFloor) {
                const snap = Math.max(0, beatX - fixedCursorX);
                container.scrollLeft = snap;
                targetScrollLeftRef.current = snap;
                console.log('📍 V111 landscapeInitialAnchor ✅ reachable beat found', {
                    beatX, fixedCursorX, reachableFloor, snap, probe,
                });
                return;
            }
        }

        // No beat is reachable (firstNoteX < fixedCursorX + margin).
        // Leave at 0 — RAF loop catches up at beat 2+.
        container.scrollLeft = 0;
        targetScrollLeftRef.current = 0;
        console.log('📍 V111 landscapeInitialAnchor → no reachable beat, scrollLeft=0', {
            fixedCursorX, reachableFloor,
        });
    };

    requestAnimationFrame(step);
}

// ─── Locked helpers (unchanged from V110) ────────────────────────────────────

const GP8_DISPLAY_OVERRIDES: Record<string, number> = {
    firstSystemPaddingTop: 12,
    notationStaffPaddingBottom: 10,
    lastNotationStaffPaddingBottom: 12,
    lyricLinesPaddingBetween: 10,
    trackStaffPaddingBetween: 2,
    systemPaddingBottom: 8,
    effectStaffPaddingBottom: 6,
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

function applyAxisLock(container: HTMLElement, api: any): void {
    const isH = api?.settings?.display?.layoutMode === 1;
    container.style.overflowX = isH ? 'auto' : 'hidden';
    container.style.overflowY = isH ? 'hidden' : 'auto';
    (container.style as any).webkitOverflowScrolling = 'touch';
    container.style.minHeight = isH ? 'auto' : '600px';
    const scrollEl = (api?.renderer?.framer?.scrollElement as HTMLElement | null | undefined);
    if (scrollEl && scrollEl !== container) {
        scrollEl.style.overflowX = isH ? 'auto' : 'hidden';
        scrollEl.style.overflowY = isH ? 'hidden' : 'auto';
    }
    console.log(`🔒 applyAxisLock isH=${isH}`);
}

function getTrackSet(api: any): Set<number> {
    return api.tracks
        ? new Set<number>(api.tracks.map((t: any) => t.index as number))
        : new Set<number>([0]);
}

function forceRevealSurface(host: HTMLElement, cancelRef: { current: number }, label = 'forceReveal', maxMs = 3000): void {
    const start = performance.now();
    const cancelToken = cancelRef.current;
    const tick = () => {
        if (cancelRef.current !== cancelToken) return;
        const surf = host.querySelector('.at-surface') as HTMLElement | null;
        if (!surf) { if (performance.now() - start < maxMs) requestAnimationFrame(tick); return; }
        surf.style.visibility = 'visible';
        surf.style.opacity = '1';
        (surf.style as any).webkitOpacity = '1';
        surf.style.fontSize = '';
        surf.style.lineHeight = '';
        surf.style.overflow = '';
        surf.style.pointerEvents = '';
        void surf.getBoundingClientRect();
        const cs = getComputedStyle(surf);
        const ok = cs.opacity !== '0' && cs.visibility !== 'hidden' && cs.fontSize !== '0px' && cs.lineHeight !== '0px';
        if (!ok && performance.now() - start < maxMs) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

function showCurtain(curtain: HTMLDivElement | null): void { if (curtain) curtain.style.display = 'block'; }
function hideCurtainAtomic(curtain: HTMLDivElement | null): void { if (curtain) curtain.style.display = 'none'; }

function isSurfacePaintable(host: HTMLElement): boolean {
    const surf = host.querySelector('.at-surface') as HTMLElement | null;
    if (!surf) return false;
    const cs = getComputedStyle(surf);
    if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.fontSize === '0px' || cs.lineHeight === '0px' || cs.overflow === 'hidden') return false;
    const svgs = surf.querySelectorAll('svg');
    if (!svgs.length) return false;
    for (const svg of Array.from(svgs).slice(0, 3)) {
        const r = (svg as SVGSVGElement).getBoundingClientRect();
        if (r.width > 10 && r.height > 10) return true;
    }
    return false;
}

function resolveNextBeatExpanded(api: any, trackSet: Set<number>, expandedStart: number, curBeat: any): { nextBeat: any | null; nextStart: number | null } {
    const tickCache = (api as any).tickCache;
    if (!tickCache?.findBeat) return { nextBeat: null, nextStart: null };
    const curAbs = curBeat?.absolutePlaybackStart ?? 0;
    const curMbIdx = curBeat?.voice?.bar?.masterBar?.index;
    const curBb = api?.renderer?.boundsLookup?.findBeat?.(curBeat);
    const curX = curBb?.visualBounds
        ? (typeof curBb.onNotesX === 'number' ? curBb.onNotesX : curBb.visualBounds.x + curBb.visualBounds.w / 2)
        : null;
    let didLogSkip = false;
    for (let t = expandedStart + 1; t <= expandedStart + 4000; t++) {
        const r = tickCache.findBeat(trackSet, t);
        if (!r?.beat) continue;
        const b = r.beat;
        if (b.absolutePlaybackStart === curAbs && b?.voice?.bar?.masterBar?.index === curMbIdx) continue;
        if (b.absolutePlaybackStart <= curAbs) {
            if (!didLogSkip) { didLogSkip = true; console.log('[resolveNextBeatExpanded] skipped backward', { curAbs, bAbs: b.absolutePlaybackStart }); }
            continue;
        }
        if (curX !== null) {
            const cBb = api?.renderer?.boundsLookup?.findBeat?.(b);
            if (cBb?.visualBounds) {
                const cX = typeof cBb.onNotesX === 'number' ? cBb.onNotesX : cBb.visualBounds.x + cBb.visualBounds.w / 2;
                if (cX < curX - 6) continue;
            }
        }
        return { nextBeat: b, nextStart: t };
    }
    return { nextBeat: null, nextStart: null };
}

function getVisualKeyForBeat(api: any, beat: any): string | null {
    const bb = api?.renderer?.boundsLookup?.findBeat?.(beat);
    const vb = bb?.visualBounds;
    if (!vb) return null;
    return `${Math.round(vb.x)}:${Math.round(vb.y)}`;
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
    scrollContainer,
    forceHorizontal = false,
}: AlphaTabRendererV102Props) {

    const containerRef = useRef<HTMLDivElement>(null);
    const curtainRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const cursorRef = useRef<MaestroCursor | null>(null);
    const landscapeCursorRef = useRef<LandscapeFixedCursorOverlay | null>(null);

    // ── [L7] LERP scroll refs ─────────────────────────────────────────────────
    const targetScrollLeftRef = useRef<number>(0);
    const landscapeScrollRafRef = useRef<number | null>(null);

    // ── [L2-fix] Shared scroll state: written by playerPositionChanged,
    //             read by RAF loop — avoids findBeat on every animation frame ──
    const landscapeScrollStateRef = useRef<{
        curBeatX: number;
        nextBeatX: number;
        beatStart: number;
        beatDur: number;
        lastTick: number;
    } | null>(null);

    const initTokenRef = useRef(0);
    const trackIndicesRef = useRef(trackIndices);
    useEffect(() => { trackIndicesRef.current = trackIndices; }, [trackIndices]);

    const forceHorizontalRef = useRef<boolean>(!!forceHorizontal);
    useEffect(() => { forceHorizontalRef.current = !!forceHorizontal; }, [forceHorizontal]);

    const alphaTabModuleRef = useRef<any>(null);
    const activeProfileRef = useRef<LayoutProfileName | null>(null);
    const baseTrackProfileRef = useRef<LayoutProfileName | null>(null);
    const isApplyingProfileRef = useRef(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSettling, setIsSettling] = useState(true);

    const loopEnabledRef = useRef(loopEnabled);
    const playbackRangeRef = useRef(playbackRange);
    const isPlayingRef = useRef(isPlaying);
    const seekInProgressRef = useRef(false);
    const seekTokenRef = useRef(0);
    const resumeTimerRef = useRef<number | null>(null);
    const seekFreezeUntilRef = useRef<number>(0);
    const seekTargetTickRef = useRef<number | null>(null);

    const renderTokenRef = useRef(0);
    const activeRendersRef = useRef(0);
    const revealTimerRef = useRef<number | null>(null);
    const hasRevealedRef = useRef(false);
    const QUIET_MS = 250;
    const isSettlingRef = useRef(true);
    const forceRevealCancelRef = useRef(0);

    const lastTickRef = useRef<number | null>(null);
    const stableCurBeatRef = useRef<any>(null);
    const stableExpandedBeatStartRef = useRef<number>(0);
    const stableNextBeatRef = useRef<any>(null);
    const stableNextExpandedBeatStartRef = useRef<number | null>(null);
    const stableVisualKeyRef = useRef<string | null>(null);
    const lastRegressionLogRef = useRef<string>('');
    const reAnchorCountRef = useRef<{ beat: number; count: number }>({ beat: -1, count: 0 });
    const lastAcceptedBeatStartRef = useRef<number>(-1);
    const allowBacktrackUntilRef = useRef<number>(0);

    const resetBeatAcceptance = () => {
        lastAcceptedBeatStartRef.current = -1;
        allowBacktrackUntilRef.current = Date.now() + 600;
    };

    loopEnabledRef.current = loopEnabled;
    playbackRangeRef.current = playbackRange;
    isPlayingRef.current = isPlaying;

    useEffect(() => { isSettlingRef.current = isSettling; }, [isSettling]);

    // ── [L7-fix] LERP scroll loop — with within-beat interpolation ────────────
    // Receives api so it can read live tickPosition every RAF frame.
    // This makes sustained notes/bends scroll continuously between beat events.
    const startLandscapeScrollLoop = useCallback((container: HTMLElement, api: any) => {
        if (landscapeScrollRafRef.current !== null) return;

        const loop = () => {
            // Within-beat interpolation: curBeatX → nextBeatX over beatDur ticks
            const state = landscapeScrollStateRef.current;
            if (state && state.beatDur > 0) {
                const liveTick = (api as any)?.tickPosition ?? state.lastTick;
                const progress = Math.max(0, Math.min(1,
                    (liveTick - state.beatStart) / state.beatDur
                ));
                const interpolatedX = state.curBeatX + (state.nextBeatX - state.curBeatX) * progress;
                const fixedCursorX = Math.round(container.clientWidth * CURSOR_POSITION_RATIO);
                const maxScroll = container.scrollWidth - container.clientWidth;
                targetScrollLeftRef.current = Math.max(0, Math.min(
                    interpolatedX - fixedCursorX,
                    maxScroll
                ));
            }

            // LERP toward target
            const target = targetScrollLeftRef.current;
            const current = container.scrollLeft;
            const delta = target - current;
            if (Math.abs(delta) > 0.5) {
                container.scrollLeft = current + delta * SCROLL_EASE;
            }

            landscapeScrollRafRef.current = requestAnimationFrame(loop);
        };

        landscapeScrollRafRef.current = requestAnimationFrame(loop);
        console.log('🎬 V111 landscape scroll loop started (with beat interpolation)');
    }, []);

    const stopLandscapeScrollLoop = useCallback(() => {
        if (landscapeScrollRafRef.current !== null) {
            cancelAnimationFrame(landscapeScrollRafRef.current);
            landscapeScrollRafRef.current = null;
            console.log('⏹ V111 landscape scroll loop stopped');
        }
    }, []);

    const applyScrollMode = useCallback(async (enabled: boolean) => {
        const api = apiRef.current;
        if (!api) return;
        const alphaTab = await import('@coderline/alphatab');
        (api.settings.player as any).scrollMode = enabled
            ? (alphaTab as any).ScrollMode.Continuous
            : (alphaTab as any).ScrollMode.Off;
        await api.updateSettings();
    }, []);

    // ── Main init effect ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        if (apiRef.current) return;
        if (!fileUrl) return;

        let destroyed = false;
        const token = ++initTokenRef.current;

        const cleanUrl = fileUrl.split('?')[0];
        const fileExt = cleanUrl.split('.').pop()?.toLowerCase() ?? '';
        const isGP8 = fileExt === 'gp';

        console.log('🎼 V111 layout check:', { fileUrl, cleanUrl, fileExt, isGP8 });

        const init = async () => {
            const container = containerRef.current!;
            await waitForContainerWidth(container);
            if (destroyed || token !== initTokenRef.current) return;

            const alphaTab = await import('@coderline/alphatab');
            alphaTabModuleRef.current = alphaTab;

            const vvW = window.visualViewport?.width ?? window.innerWidth;
            const vvH = window.visualViewport?.height ?? window.innerHeight;
            const isLandscape = (vvW > vvH) || (window.matchMedia?.('(orientation: landscape)')?.matches ?? false);
            const containerW = containerRef.current?.clientWidth ?? vvW;
            const useHorizontal = forceHorizontal || (isLandscape && containerW < 480);
            const base = 'songBookPageDense' as LayoutProfileName;
            const initProfile = resolveProfileByWidth(containerW, base, useHorizontal);
            activeProfileRef.current = initProfile;

            const api = await initAlphaTab({
                container,
                playerMode: 'synthesizer',
                soundFontPath,
                layoutMode: 'page',
                scrollMode: 'off',
                scrollContainer: scrollContainer ?? undefined,
                layoutProfile: initProfile,
                ...(isGP8 && { displayOverrides: GP8_DISPLAY_OVERRIDES }),
            });
            if (destroyed || token !== initTokenRef.current) { api.destroy(); return; }

            apiRef.current = api;
            if (typeof window !== 'undefined') {
                (window as any).__atV111 = api;
                (window as any).__at = api; // universal probe alias for Cipher
            }

            if (containerRef.current) applyAxisLock(containerRef.current, api);

            api.customCursorHandler = {
                onAttach() { },
                onDetach() { },
                placeBeatCursor(beatCursor: any, beatBounds: any) {
                    const b = beatBounds.barBounds.masterBarBounds.visualBounds;
                    beatCursor.setBounds(beatBounds.onNotesX, b.y, 1, b.h);
                },
                placeBarCursor(barCursor: any, beatBounds: any) {
                    const b = beatBounds.barBounds.masterBarBounds.visualBounds;
                    barCursor.setBounds(b.x, b.y, b.w, b.h);
                },
                transitionBeatCursor(beatCursor: any, beatBounds: any) {
                    this.placeBeatCursor(beatCursor, beatBounds);
                },
            };

            onApiReady?.(api as unknown as AlphaTabApi);

            api.scoreLoaded.on(() => {
                const score = api.score;
                if (!score?.tracks?.length) return;

                const _norm = (s: string) => (s ?? '').toLowerCase().trim().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');
                const _isVocal = (n: string) => /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal)/i.test(_norm(n));
                const _isDrum = (n: string) => ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'].some(kw => _norm(n).includes(kw));
                const _isBass = (n: string) => _norm(n).includes('bass');
                const _scoreTrack = (n: string): number => {
                    const nn = _norm(n);
                    if (_isVocal(n)) return -9999;
                    if (_isDrum(n)) return -9999;
                    if (_isBass(n)) return -200;
                    let s = 0;
                    if (nn.includes('distortion')) s += 120;
                    if (nn.includes('overdriven') || nn.includes('overdrive')) s += 110;
                    if (nn.includes('acoustic')) s += 105;
                    if (nn.includes('clean')) s += 95;
                    if (/(guit|guitar|gtr)/.test(nn)) s += 60;
                    if (nn.includes('rhythm guitar') || nn.includes('rhythm gtr')) s += 25;
                    if (nn.includes('lead guitar') || nn.includes('lead gtr')) s += 15;
                    if (/(overdub|right ear|left ear|solo overdub|sitar|banjo|harmonica|tenor sax|clarinet|strings|synth|pad|orch|piano|organ|delay|fx|effect|bus|click|guide|reference)/.test(nn)) s -= 40;
                    return s;
                };

                let winnerIdx = 0, winnerScore = -9999;
                for (let i = 0; i < score.tracks.length; i++) {
                    const sc = _scoreTrack(score.tracks[i]?.name ?? '');
                    if (sc > winnerScore) { winnerScore = sc; winnerIdx = i; }
                }
                if (winnerScore <= 0) {
                    const fb = score.tracks.findIndex((t: any) => !_isVocal(t?.name ?? '') && !_isDrum(t?.name ?? ''));
                    if (fb >= 0) winnerIdx = fb;
                }

                trackIndicesRef.current = [winnerIdx];
                const tr = [score.tracks[winnerIdx]].filter(Boolean);
                if (!tr.length) return;

                const primaryTrackName = (tr[0] as any)?.name ?? '';
                const w2 = containerRef.current?.clientWidth ?? window.innerWidth;
                const useHorizontalNow = forceHorizontalRef.current;
                const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
                const trackProfile = resolveProfileByWidth(w2, baseProfile, useHorizontalNow);
                const at = alphaTabModuleRef.current;
                baseTrackProfileRef.current = baseProfile;
                if (at && trackProfile !== activeProfileRef.current) {
                    activeProfileRef.current = trackProfile;
                    applyAlphaTabLayoutProfileSettings(api, at, trackProfile);
                    if (containerRef.current) applyAxisLock(containerRef.current, api);
                }

                if (trackProfile === 'songBookPageSparse') {
                    const scoreAny = score as any;
                    const renderedTrack = tr[0] as any;
                    if (renderedTrack) { renderedTrack.systemsLayout = null; renderedTrack.defaultSystemsLayout = 0; }
                    scoreAny.systemsLayout = null;
                    scoreAny.defaultSystemsLayout = 0;
                }

                api.renderTracks(tr);
                console.log(`✅ V111: scoreLoaded → renderTracks([${winnerIdx}]) profile="${trackProfile}"`);

                if (onScoreLoaded && api.score) {
                    const info: SongInfo = { title: api.score.title ?? '', artist: api.score.artist ?? '', album: api.score.album ?? '' } as SongInfo;
                    onScoreLoaded(info, (api.score.tracks ?? []) as Track[]);
                }
            });

            api.renderStarted.on(() => {
                activeRendersRef.current += 1;
                renderTokenRef.current += 1;
                forceRevealCancelRef.current += 1;
                isSettlingRef.current = true;
                setIsSettling(true);
                lastAcceptedBeatStartRef.current = -1;
                if (revealTimerRef.current !== null) { window.clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
                hasRevealedRef.current = false;
                showCurtain(curtainRef.current);
                stopLandscapeScrollLoop();
            });

            const waitForPaintableSurface = (host: HTMLElement, tok: number): Promise<boolean> =>
                new Promise(resolve => {
                    let streak = 0, i = 0;
                    const step = () => {
                        if (renderTokenRef.current !== tok || activeRendersRef.current !== 0) return resolve(false);
                        forceRevealSurface(host, forceRevealCancelRef, 'paintableCheck');
                        if (isSurfacePaintable(host)) { streak++; if (streak >= 2) return resolve(true); }
                        else streak = 0;
                        if (++i < 60) requestAnimationFrame(step); else resolve(false);
                    };
                    requestAnimationFrame(step);
                });

            const ensureCursorAndAnchorOnce = (tok: number): Promise<boolean> =>
                new Promise(resolve => {
                    const host = containerRef.current;
                    if (!host || renderTokenRef.current !== tok) return resolve(false);
                    if (!cursorRef.current) {
                        cursorRef.current = attachMaestroCursor(api, host);
                    } else {
                        const el = cursorRef.current.element;
                        if (!el || !host.contains(el)) { cursorRef.current.destroy(); cursorRef.current = attachMaestroCursor(api, host); }
                    }
                    host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor').forEach(n => ((n as HTMLElement).style.display = 'none'));
                    const step = () => {
                        if (renderTokenRef.current !== tok) return resolve(false);
                        forceRevealSurface(host, forceRevealCancelRef, 'anchorStep');
                        const tickCache = (api as any).tickCache;
                        const bounds = api.renderer?.boundsLookup;
                        if (!tickCache || !bounds) { requestAnimationFrame(step); return; }
                        const tick = api.tickPosition ?? 0;
                        const r = tickCache.findBeat(getTrackSet(api), tick);
                        if (!r?.beat) { requestAnimationFrame(step); return; }
                        if (!bounds.findBeat(r.beat)) { requestAnimationFrame(step); return; }
                        cursorRef.current?.requestSnap();
                        cursorRef.current?.setBeat(r.beat);
                        cursorRef.current?.setTick(tick);
                        resolve(true);
                    };
                    requestAnimationFrame(step);
                });

            api.renderFinished.on(() => {
                activeRendersRef.current = Math.max(0, activeRendersRef.current - 1);
                const tokenAtFinish = renderTokenRef.current;
                if (activeRendersRef.current !== 0) return;
                if (revealTimerRef.current !== null) window.clearTimeout(revealTimerRef.current);

                revealTimerRef.current = window.setTimeout(async () => {
                    revealTimerRef.current = null;
                    if (activeRendersRef.current !== 0) return;
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    const h = containerRef.current;
                    if (!h) return;

                    forceRevealSurface(h, forceRevealCancelRef, 'preWait');
                    const okPaint = await waitForPaintableSurface(h, tokenAtFinish);
                    if (!okPaint) return;

                    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    if (activeRendersRef.current !== 0) return;

                    if (isGP8) {
                        runGp8LayoutEngineV2(h);
                        forceRevealSurface(h, forceRevealCancelRef, 'postGp8Patch');
                    }

                    // ── [L4] Cursor: portrait vs landscape ───────────────────
                    const isStripRender = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);

                    if (!isStripRender) {
                        // Portrait: beat-anchored MaestroCursor V1
                        const okCursor = await ensureCursorAndAnchorOnce(tokenAtFinish);
                        if (!okCursor) return;
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        if (activeRendersRef.current !== 0) return;
                    } else {
                        // Landscape: destroy portrait cursor, attach fixed overlay
                        if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
                        if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        if (activeRendersRef.current !== 0) return;

                        // ── [L1-fix] Attach to NON-scrolling wrapper ──────────
                        const wrapper = h.parentElement;
                        if (wrapper) {
                            landscapeCursorRef.current = new LandscapeFixedCursorOverlay(wrapper, h.clientWidth);
                        }

                        // ── [L8-fix] Retry-until-ready anchor + sync target ───
                        landscapeInitialAnchor(h, api, targetScrollLeftRef);

                        // ── [L7-fix] Start LERP+interpolation scroll loop ─────
                        startLandscapeScrollLoop(h, api);
                    }

                    forceRevealSurface(h, forceRevealCancelRef, 'preDrop');
                    h.getBoundingClientRect();
                    (h.querySelector('.at-surface') as HTMLElement | null)?.getBoundingClientRect();

                    hideCurtainAtomic(curtainRef.current);
                    hasRevealedRef.current = true;
                    console.log('🟢 V111 curtain dropped', { token: tokenAtFinish, isStripRender });

                    const hContainer = containerRef.current;
                    if (hContainer) applyAxisLock(hContainer, api);

                    requestAnimationFrame(() => forceRevealSurface(h, forceRevealCancelRef, 'postDrop'));
                    isSettlingRef.current = false;
                    setIsLoading(false);
                    setIsSettling(false);
                    onRendered?.();
                    onBoundsReady?.();
                    isApplyingProfileRef.current = false;
                }, QUIET_MS);
            });

            const notifyPlayerReady = () => { if (api.isReadyForPlayback) onPlayerReady?.(); };
            api.playerReady?.on(() => setTimeout(notifyPlayerReady, 100));
            api.soundFontLoaded?.on(() => { console.log('✅ V111: Soundfont loaded'); notifyPlayerReady(); });

            let stateDebounce: ReturnType<typeof setTimeout>;
            api.playerStateChanged.on((e: any) => {
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) onPlayStateChange(playing);
                }, 50);
            });

            // 🔒🔒🔒 CURSOR / SCROLL ENGINE — V111 ────────────────────────────
            api.playerPositionChanged.on((e: any) => {
                if (isSettlingRef.current) return;

                const tickRaw = e.currentTick ?? e.tickPosition;
                if (tickRaw == null) return;

                // ── [L2-fix] Landscape: cache beat geometry into ref — RAF loop reads it ─
                const isStripMode = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);

                if (isStripMode) {
                    const container = containerRef.current;
                    if (!container) return;
                    const tickCache = (api as any).tickCache;
                    const bounds = api?.renderer?.boundsLookup;
                    if (!tickCache || !bounds) return;
                    const trackSet = getTrackSet(api);

                    const r = tickCache.findBeat(trackSet, tickRaw);
                    const bb = r?.beat ? bounds.findBeat(r.beat) : null;
                    if (!bb?.visualBounds) return;

                    const curBeatX = typeof bb.onNotesX === 'number'
                        ? bb.onNotesX
                        : bb.visualBounds.x + bb.visualBounds.w / 2;

                    const beat = r.beat;
                    const beatAbsStart = beat.absolutePlaybackStart ?? tickRaw;
                    const structuralDur = (beat.playbackDuration ?? beat.duration ?? 480) || 480;

                    // Scan back to find true expanded start of this beat
                    let expandedStart = beatAbsStart;
                    for (let t = tickRaw - 1; t >= Math.max(tickRaw - 4096, beatAbsStart - 1); t--) {
                        const rr = tickCache.findBeat(trackSet, t);
                        if (!rr?.beat || rr.beat.absolutePlaybackStart !== beatAbsStart) {
                            expandedStart = t + 1;
                            break;
                        }
                    }

                    const { nextBeat, nextStart } = resolveNextBeatExpanded(api, trackSet, expandedStart, beat);
                    const expandedDur = (typeof nextStart === 'number' && nextStart > expandedStart)
                        ? nextStart - expandedStart
                        : structuralDur;

                    // Resolve next beat X — only advance forward (no backward interpolation at row wraps)
                    let nextBeatX = curBeatX;
                    if (nextBeat) {
                        const nbb = bounds.findBeat(nextBeat);
                        if (nbb?.visualBounds) {
                            nextBeatX = typeof nbb.onNotesX === 'number'
                                ? nbb.onNotesX
                                : nbb.visualBounds.x + nbb.visualBounds.w / 2;
                            if (nextBeatX < curBeatX) nextBeatX = curBeatX; // clamp row-wrap
                        }
                    }

                    // Write to shared state — RAF loop reads this every frame
                    landscapeScrollStateRef.current = {
                        curBeatX,
                        nextBeatX,
                        beatStart: expandedStart,
                        beatDur: Math.max(structuralDur * 0.75, Math.min(expandedDur, structuralDur * 2.5)),
                        lastTick: tickRaw,
                    };

                    return; // RAF loop owns the actual scroll
                }

                // ── Portrait cursor engine (🔒 unchanged from V110) ───────────
                if (!cursorRef.current) return;

                const FAR_TICKS = 240;
                if (seekFreezeUntilRef.current > Date.now() && seekTargetTickRef.current != null) {
                    if (Math.abs(tickRaw - seekTargetTickRef.current) > FAR_TICKS) return;
                }

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
                    resetBeatAcceptance();
                    stableCurBeatRef.current = null;
                    stableExpandedBeatStartRef.current = 0;
                    stableNextBeatRef.current = null;
                    stableNextExpandedBeatStartRef.current = null;
                    stableVisualKeyRef.current = null;
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
                                if (vbIdx === ownerMbIdx && vOcc === ownerOccurrence) { targetMbb = mbb; break outer2; }
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
                                        if (beatExpandedStart <= tick && tick < beatExpandedStart + bDur) { curBeat = beat; break outer3; }
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

                const isSameBeat = (a: any, b: any): boolean =>
                    !!(a && b && a.absolutePlaybackStart === b.absolutePlaybackStart &&
                        a.voice?.bar?.masterBar?.index === b.voice?.bar?.masterBar?.index);

                const sameStructural = isSameBeat(curBeat, stableCurBeatRef.current);
                const curVisualKey = getVisualKeyForBeat(api, curBeat);
                const sameVisual = curVisualKey !== null && stableVisualKeyRef.current !== null && curVisualKey === stableVisualKeyRef.current;
                const shouldReAnchor = !sameStructural || !sameVisual || jumped;

                if (shouldReAnchor) {
                    const inSeekFreeze = seekFreezeUntilRef.current > Date.now() && seekTargetTickRef.current != null;
                    if (inSeekFreeze) {
                        const beatAbsForGate = curBeat.absolutePlaybackStart ?? tick;
                        if (beatAbsForGate < (seekTargetTickRef.current! - 120)) return;
                    }

                    const MIN_BACKTRACK_TICKS = 120;
                    const incomingStart = curBeat.absolutePlaybackStart ?? tick;
                    const isActuallyPlaying = (api.playerState ?? 0) === 1;
                    const inBypassWindow = Date.now() < allowBacktrackUntilRef.current;

                    if (stableCurBeatRef.current) {
                        const prevAbs = stableCurBeatRef.current.absolutePlaybackStart ?? -1;
                        if (incomingStart >= 0 && prevAbs >= 0 && incomingStart < prevAbs) {
                            const regKey = `${incomingStart}:${prevAbs}`;
                            if (lastRegressionLogRef.current !== regKey) { lastRegressionLogRef.current = regKey; console.warn('[V111] structural regression discarded', { incomingStart, prevAbs, tick }); }
                            return;
                        }
                    }

                    if (!isActuallyPlaying || inBypassWindow) {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    } else if (lastAcceptedBeatStartRef.current >= 0 && incomingStart < lastAcceptedBeatStartRef.current - MIN_BACKTRACK_TICKS) {
                        console.warn('[V111] dropped out-of-order beat', { incomingStart, lastAccepted: lastAcceptedBeatStartRef.current });
                        return;
                    } else {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    }
                    stableCurBeatRef.current = curBeat;
                    stableVisualKeyRef.current = curVisualKey;

                    const beatId = curBeat.absolutePlaybackStart ?? 0;
                    if (beatId === reAnchorCountRef.current.beat) { reAnchorCountRef.current.count++; }
                    else { reAnchorCountRef.current = { beat: beatId, count: 1 }; }

                    const beatAbsStart = curBeat.absolutePlaybackStart ?? tick;
                    const structuralDur = (curBeat.playbackDuration ?? curBeat.duration ?? 480) || 480;
                    let expandedBeatStart = beatAbsStart;
                    for (let t = tick - 1; t >= Math.max(tick - 8192, beatAbsStart - 1); t--) {
                        const r2 = tickCache.findBeat(trackSet, t);
                        if (!r2?.beat || !isSameBeat(r2.beat, curBeat)) { expandedBeatStart = t + 1; break; }
                    }

                    const { nextBeat: resolvedNextBeat, nextStart: nextExpandedStart } =
                        resolveNextBeatExpanded(api, trackSet, expandedBeatStart, curBeat);

                    let guardedStart = Math.max(beatAbsStart, expandedBeatStart);
                    if (typeof nextExpandedStart === 'number' && nextExpandedStart > guardedStart) {
                        guardedStart = Math.min(guardedStart, nextExpandedStart - 1);
                    }

                    let computedDur = structuralDur;
                    if (typeof nextExpandedStart === 'number' && nextExpandedStart > guardedStart) {
                        computedDur = nextExpandedStart - guardedStart;
                    }
                    const minDur = Math.max(60, Math.round(structuralDur * 0.75));
                    const maxDur = Math.round(structuralDur * 2.5);
                    computedDur = Math.max(minDur, Math.min(maxDur, computedDur));
                    const ratio = computedDur / structuralDur;
                    if (ratio < 0.5 || ratio > 2.5 || !Number.isFinite(ratio)) { guardedStart = beatAbsStart; computedDur = structuralDur; }
                    if (!Number.isFinite(computedDur) || computedDur < 30) { guardedStart = beatAbsStart; computedDur = structuralDur; }
                    if (typeof nextExpandedStart === 'number' && nextExpandedStart <= beatAbsStart) {
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                    }

                    stableExpandedBeatStartRef.current = guardedStart;
                    stableNextBeatRef.current = resolvedNextBeat;
                    stableNextExpandedBeatStartRef.current = typeof nextExpandedStart === 'number' ? nextExpandedStart : null;

                    cursorRef.current.setBeat(curBeat, resolvedNextBeat, nextExpandedStart ?? null, guardedStart);
                }

                cursorRef.current.setTick(tick, stableNextBeatRef.current, stableExpandedBeatStartRef.current);
            });
            // 🔒🔒🔒 END CURSOR/SCROLL ENGINE 🔒🔒🔒

            await loadGuitarProFile(api, fileUrl);
        };

        init().catch(console.error);

        return () => {
            destroyed = true;
            ++initTokenRef.current;
            activeRendersRef.current = 0;
            renderTokenRef.current = 0;
            hasRevealedRef.current = false;
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null; // [L2-fix] clear on unmount
            if (revealTimerRef.current !== null) { window.clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
            if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
            setIsLoading(true);
            setIsSettling(true);
            showCurtain(curtainRef.current);
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
            if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
            if (apiRef.current) { apiRef.current.destroy(); apiRef.current = null; }
            lastAcceptedBeatStartRef.current = -1;
            lastRegressionLogRef.current = '';
            lastTickRef.current = null;
            stableCurBeatRef.current = null;
            stableExpandedBeatStartRef.current = 0;
            stableNextBeatRef.current = null;
            stableNextExpandedBeatStartRef.current = null;
            stableVisualKeyRef.current = null;
        };
    }, [fileUrl, startLandscapeScrollLoop, stopLandscapeScrollLoop]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api?.score?.tracks?.length) return;
        const tr = trackIndices.map((i: number) => api.score.tracks[i]).filter(Boolean);
        if (!tr.length) return;

        const primaryTrackName = (tr[0] as any)?.name ?? '';
        const w = containerRef.current?.clientWidth ?? window.innerWidth;
        const useHorizontalNow = forceHorizontalRef.current;
        const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
        const trackProfile = resolveProfileByWidth(w, baseProfile, useHorizontalNow);
        const at = alphaTabModuleRef.current;
        baseTrackProfileRef.current = baseProfile;
        if (at && trackProfile !== activeProfileRef.current) {
            activeProfileRef.current = trackProfile;
            applyAlphaTabLayoutProfileSettings(api, at, trackProfile);
            if (containerRef.current) applyAxisLock(containerRef.current, api);
        }

        const isStripNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
        if (isStripNow) {
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null;
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
        } else {
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null;
            if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
        }

        hasRevealedRef.current = false;
        showCurtain(curtainRef.current);
        api.renderTracks(tr);
    }, [trackIndices, stopLandscapeScrollLoop]);

    useEffect(() => {
        if (isSettling) return;
        const api = apiRef.current;
        if (!api?.isReadyForPlayback) return;
        let cancelled = false;
        const run = async () => {
            if (isPlaying) {
                await applyScrollMode(true);
                if (cancelled) return;
                api.play();
            } else {
                api.pause();
                applyScrollMode(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [isPlaying, isSettling, applyScrollMode]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        api.playbackRange = (loopEnabled && playbackRange) ? playbackRange : null;
    }, [loopEnabled, playbackRange]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            if (isApplyingProfileRef.current) return;
            const api = apiRef.current;
            const at = alphaTabModuleRef.current;
            if (!api || !at) return;
            const w = el.clientWidth;
            const base = baseTrackProfileRef.current ?? 'songBookPageDense';
            const useHorizontal = forceHorizontalRef.current;
            const nextProfile = resolveProfileByWidth(w, base, useHorizontal);
            if (nextProfile === activeProfileRef.current) return;
            hasRevealedRef.current = false;
            showCurtain(curtainRef.current);
            isApplyingProfileRef.current = true;
            activeProfileRef.current = nextProfile;
            applyAlphaTabLayoutProfile(api, at, nextProfile);
            applyAxisLock(el, api);
            if (landscapeCursorRef.current) landscapeCursorRef.current.updateX(el.clientWidth);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const api = apiRef.current;
        const at = alphaTabModuleRef.current;
        const el = containerRef.current;
        if (!api || !at || !el) return;
        const w = el.clientWidth;
        const base = baseTrackProfileRef.current ?? 'songBookPageDense';
        const nextProfile = resolveProfileByWidth(w, base, forceHorizontalRef.current);
        if (nextProfile === activeProfileRef.current) return;

        if (forceHorizontalRef.current) {
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null;
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
        } else {
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null;
            if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
        }

        hasRevealedRef.current = false;
        showCurtain(curtainRef.current);
        isApplyingProfileRef.current = true;
        activeProfileRef.current = nextProfile;
        applyAlphaTabLayoutProfile(api, at, nextProfile);
        applyAxisLock(el, api);
    }, [forceHorizontal, stopLandscapeScrollLoop]);

    // 🔒 CLICK-TO-SEEK — portrait only
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let cancelled = false;
        let detach: (() => void) | undefined;

        const tryAttach = (attempt = 0) => {
            if (cancelled) return;
            const surface = container.querySelector('.at-surface') as HTMLElement | null;
            if (!surface) { if (attempt < 20) setTimeout(() => tryAttach(attempt + 1), 150); return; }

            const findClosestBeatAtPos = (x: number, y: number, anchorBeat?: any): any | null => {
                const api = apiRef.current;
                const tickCache = (api as any)?.tickCache;
                const bounds = api?.renderer?.boundsLookup;
                if (!tickCache || !bounds) return null;
                const trackSet = getTrackSet(api);
                const mbIdx = anchorBeat?.voice?.bar?.masterBar?.index ?? null;
                const masterBarsArr = ((tickCache as any).masterBars as any[]) ?? [];
                const currentTick = api?.tickPosition ?? 0;
                let mbStart = 0, mbDuration = 3840;
                if (mbIdx != null) {
                    let bestDist = Infinity;
                    for (const mb of masterBarsArr) {
                        if (mb?.masterBar?.index !== mbIdx) continue;
                        const dur = mb.masterBar?.calculateDuration?.() ?? 3840;
                        const dist = Math.abs(mb.start - currentTick);
                        if (dist < bestDist) { bestDist = dist; mbStart = mb.start; mbDuration = dur; }
                    }
                }
                const STEPS = 32;
                const stepSize = Math.max(1, Math.floor(mbDuration / STEPS));
                const seenAbs = new Set<number>();
                const rowBeats: Array<{ beat: any; onX: number }> = [];
                for (let t = mbStart; t < mbStart + mbDuration; t += stepSize) {
                    const r = tickCache.findBeat(trackSet, t);
                    const b = r?.beat;
                    if (!b) continue;
                    const abs = b.absolutePlaybackStart ?? -1;
                    if (seenAbs.has(abs)) continue;
                    seenAbs.add(abs);
                    const bb = bounds.findBeat?.(b);
                    const vb = bb?.visualBounds;
                    if (!vb) continue;
                    if (Math.abs(vb.y - y) > 20) continue;
                    rowBeats.push({ beat: b, onX: vb.x + vb.w / 2 });
                }
                if (!rowBeats.length) return null;
                rowBeats.sort((a, b) => a.onX - b.onX);
                const EPS = 8;
                const forward = rowBeats.find(rb => rb.onX >= x - EPS);
                const chosen = forward ?? rowBeats[rowBeats.length - 1];
                const chosenBb = bounds.findBeat?.(chosen.beat);
                const chosenVbW = chosenBb?.visualBounds?.w ?? 8;
                const maxDx = chosenVbW <= 16 ? Math.max(12, chosenVbW * 1.6) : 24;
                return Math.abs(chosen.onX - x) <= maxDx ? chosen.beat : null;
            };

            const publishCursorAtTick = (expandedTick: number) => {
                const api = apiRef.current;
                const cursor = cursorRef.current;
                if (!api || !cursor) return;
                const tickCache = (api as any).tickCache;
                const bounds = api.renderer?.boundsLookup;
                if (!tickCache || !bounds) return;
                const trackSet = getTrackSet(api);
                const r = tickCache.findBeat(trackSet, expandedTick);
                if (!r?.beat || !bounds.findBeat(r.beat)) return;
                const isSameBeatLocal = (a: any, b: any) =>
                    a && b && a.absolutePlaybackStart === b.absolutePlaybackStart &&
                    a.voice?.bar?.masterBar?.index === b.voice?.bar?.masterBar?.index;
                let expandedStart = expandedTick;
                for (let t = expandedTick - 1; t >= expandedTick - 8192; t--) {
                    const rr = tickCache.findBeat(trackSet, t);
                    if (!rr?.beat || !isSameBeatLocal(rr.beat, r.beat)) { expandedStart = t + 1; break; }
                }
                const { nextBeat: nextBeatForCursor, nextStart: nextStartForCursor } =
                    resolveNextBeatExpanded(api, trackSet, expandedStart, r.beat);
                stableExpandedBeatStartRef.current = expandedStart;
                stableNextBeatRef.current = nextBeatForCursor;
                stableNextExpandedBeatStartRef.current = nextStartForCursor;
                stableCurBeatRef.current = r.beat;
                cursor.requestSnap();
                cursor.setBeat(r.beat, nextBeatForCursor, nextStartForCursor, expandedStart);
                cursor.setTick(expandedTick, nextBeatForCursor, expandedStart);
            };

            const handleClick = (ev: MouseEvent) => {
                if (ev.detail > 1) return;
                const api = apiRef.current;
                if (!api) return;

                // ── [L3] Landscape: tap = play/pause only ─────────────────────
                const isStripMode = forceHorizontalRef.current || (api.settings?.display?.layoutMode === 1);
                if (isStripMode) {
                    if (!api.isReadyForPlayback) return;
                    if ((api.playerState ?? 0) === 1) { api.pause(); onPlayStateChange(false); }
                    else { api.play(); onPlayStateChange(true); }
                    return;
                }

                // Portrait click-to-seek (🔒 unchanged from V110)
                if (loopEnabledRef.current) return;
                const rect = surface.getBoundingClientRect();
                const containerEl = containerRef.current!;
                const scrollEl = (api.renderer?.framer?.scrollElement as HTMLElement | null | undefined) ?? containerEl;
                const sx = scrollEl.scrollLeft ?? 0;
                const sy = scrollEl.scrollTop ?? 0;
                const x = (ev.clientX - rect.left) + sx;
                const y = (ev.clientY - rect.top) + sy;

                const bds = api.renderer?.boundsLookup;
                let beat = bds?.getBeatAtPos?.(x, y) ?? null;
                if (beat) {
                    const bb2 = bds?.findBeat?.(beat);
                    const vbW2 = bb2?.visualBounds?.w ?? 1;
                    const cx2 = bb2 ? (bb2.visualBounds.x + vbW2 / 2) : null;
                    const dx2 = cx2 != null ? Math.abs(cx2 - x) : Infinity;
                    const tightMax = Math.max(12, vbW2 * 1.6);
                    const tooFar = vbW2 <= 16 ? dx2 > tightMax : dx2 > 40;
                    if (vbW2 === 0 || tooFar) beat = null;
                }
                const tickCache = (api as any).tickCache;
                const e2Beat = findClosestBeatAtPos(x, y, beat ?? undefined);
                if (e2Beat) {
                    if (!beat) { beat = e2Beat; }
                    else {
                        const sameMb = (e2Beat?.voice?.bar?.masterBar?.index) === (beat?.voice?.bar?.masterBar?.index);
                        if (sameMb) {
                            const bb = bds?.findBeat?.(beat);
                            const cx = bb ? (bb.visualBounds.x + bb.visualBounds.w / 2) : null;
                            const dxB = cx != null ? Math.abs(cx - x) : Infinity;
                            if (dxB > 24) beat = e2Beat;
                        }
                    }
                }

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
                    Math.abs(curr - currentTick) < Math.abs(prev - currentTick) ? curr : prev);
                const EPS_IN = 2;
                const beatDurForClamp = beat.playbackDuration ?? beat.duration ?? 480;
                const safeTarget = Math.min(target + EPS_IN, target + Math.max(0, beatDurForClamp - 1));
                seekTargetTickRef.current = safeTarget;
                seekFreezeUntilRef.current = Date.now() + 250;

                const playerStateNow = api.playerState ?? 0;
                const wasPlaying = playerStateNow === 1;
                const tok = ++seekTokenRef.current;
                if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
                if (wasPlaying) { seekInProgressRef.current = true; api.pause(); }
                const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                if (seekTicks) seekTicks(safeTarget);
                api.tickPosition = safeTarget;
                resetBeatAcceptance();
                publishCursorAtTick(safeTarget);

                if (wasPlaying) {
                    resumeTimerRef.current = window.setTimeout(() => {
                        resumeTimerRef.current = null;
                        if (seekTokenRef.current !== tok) return;
                        api.tickPosition = safeTarget;
                        resetBeatAcceptance();
                        if ((api.playerState ?? 0) === 0) api.play();
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
        return () => {
            cancelled = true;
            detach?.();
            if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
        };
    }, [fileUrl]);

    const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';

    return (
        <div className={`relative ${className ?? ''}`}>
            {isLoading && (
                <div className={`absolute inset-0 flex items-center justify-center z-40 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl`}>
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
                        <p className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            Loading tab &amp; initializing synthesizer…
                        </p>
                    </div>
                </div>
            )}

            <div ref={curtainRef} className="absolute inset-0 pointer-events-none"
                style={{ background: bgColor, display: 'block', zIndex: 5000 }} />

            {/*
             * Non-scrolling wrapper — position:relative.
             * LandscapeFixedCursorOverlay attaches here so it stays visually
             * fixed while .alphatab-container (its sibling) scrolls beneath.
             */}
            <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate' as any }}>
                <div
                    ref={containerRef}
                    className="alphatab-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        overflow: 'hidden',
                        WebkitOverflowScrolling: 'touch' as any,
                        background: bgColor,
                        paddingLeft: 'env(safe-area-inset-left, 0px)',
                        paddingRight: 'env(safe-area-inset-right, 0px)',
                    }}
                />
                {apiRef.current && !isSettling && (
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
});

export const AlphaTabRenderer = AlphaTabRendererV102;