'use client';

/**
 * AlphaTabRenderer.tsx
 * Current version: V108
 * Date: April 18th, 2026
 * Cloned from V107 — 4 Cipher patches applied (horizontal mode stabilization).
 *
 * V108 CHANGES:
 * ✅ [C1] JSX: removed minHeight from React style — applyAxisLock() owns it imperatively.
 *         overflow: 'hidden' as neutral default (applyAxisLock overrides both axes).
 * ✅ [C2] centerHorizontalStrip: tick<480 now probes for first real note past clef region
 *         (beatX > 120) instead of blindly scrollLeft=0 which left cursor on TAB clef.
 * ✅ [C3] Click sx/sy: containerRef used as fallback when framer.scrollElement is null —
 *         framer.scrollElement is null in this AlphaTab build; surface.scrollLeft is always 0.
 * ✅ [C4] Curtain z-index: 30 → 5000 — AlphaTab internal .at-cursors sits at z:1000;
 *         curtain must be above all layers to fully hide intermediate render state.
 * ✅ [C5] trackIndices useEffect: added missing applyAxisLock() call after profile apply.
 *
 * 🔒 V106 PRESERVED EXACTLY (all behavior unchanged):
 *   ✅ [P1–P4] Layout profile system (resolveLayoutProfile, applyAlphaTabLayoutProfile,
 *              alphaTabModuleRef, activeProfileRef, isApplyingProfileRef)
 *   ✅ [P3] init(): module stash + profile bake at construction
 *   ✅ [P3b] renderFinished: isApplyingProfileRef.current = false
 *   ✅ [P4] ResizeObserver: width-tier profile switching (resolveProfileByWidth)
 *   ✅ GP8_DISPLAY_OVERRIDES: 3 zero-padding keys removed (SongBook profile owns them)
 *   ✅ Patches A–D (expandedBeatStart, resolveNextBeatExpanded, publishCursorAtTick, click)
 *   ✅ MaestroCursorV2 (attachMaestroCursorV2)
 *   ✅ Curtain state machine (renderTokenRef, hasRevealedRef, QUIET_MS=250)
 *   ✅ Auto-scroll contract (scrollContainer at init, applyScrollMode post-READY)
 *   ✅ GP8 layout engine hook (runGp8LayoutEngineV2)
 *   ✅ stableVisualKeyRef + getVisualKeyForBeat() — SRV Layer 1a
 *   ✅ D1 monotonic beat gate + bypass window
 *   ✅ seekFreezeUntilRef / seekTargetTickRef (250ms freeze)
 *   ✅ Click-to-seek single-flight (seekTokenRef + resumeTimerRef)
 *   ✅ E2 same-masterBar sticky override guard
 *   ✅ BeatCustomLoopOverlay, double-click-to-play
 *
 *  🔒 DEPLOYMENT ENTRYPOINT — DO NOT import AlphaTabRenderer_V### directly in pages.
 *  This file is the single committed export. Versioned backups stay local as
 *  AlphaTabRenderer_V107.tsx.LOCKED etc. Active version: V107 (April 16, 2026).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    initAlphaTab,
    loadGuitarProFile,
    resolveLayoutProfile,
    resolveProfileByWidth,                  // [V102.2] width-tier resolver for ResizeObserver
    resolveTrackLayoutProfile,              // [V102.2] track-aware profile picker
    applyAlphaTabLayoutProfile,
    applyAlphaTabLayoutProfileSettings,    // [V102.2] settings-only, no render
    type LayoutProfileName,
} from '@/lib/alphaTab/initAlphaTab';
import { attachMaestroCursorV2, MaestroCursorV2 } from '@/components/alphaTab/MaestroCursor2';
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
    forceHorizontal?: boolean; // 🔒 explicit strip mode — passed from page.tsx isMobileLandscape
}

// ─── Auto-scroll contract ─────────────────────────────────────────────────────
// 🔒 LOCKED — DO NOT CHANGE without understanding the pump/flash regression history.
// Rule 1: scrollContainer wired at initAlphaTab (not in applyScrollMode).
// Rule 2: applyScrollMode() ONLY toggles scrollMode + updateSettings().
// Rule 3: applyScrollMode(true) ONLY after READY (isSettling=false).
// Rule 4: updateSettings() required for AT 1.8.x to pick up scrollMode changes.
// ─────────────────────────────────────────────────────────────────────────────

// 🔒 FROZEN BASELINE — March 25, 2026 (Stage 3 / V29).
// [P1] 3 zero-padding keys removed — SongBook profile owns headroom now:
//   firstNotationStaffPaddingTop, notationStaffPaddingTop, effectStaffPaddingTop
const GP8_DISPLAY_OVERRIDES: Record<string, number> = {
    firstSystemPaddingTop: 12,
    // firstNotationStaffPaddingTop ← REMOVED — SongBook profile owns this
    // notationStaffPaddingTop      ← REMOVED — SongBook profile owns this
    notationStaffPaddingBottom: 10,
    lastNotationStaffPaddingBottom: 12,
    lyricLinesPaddingBetween: 10,
    trackStaffPaddingBetween: 2,
    systemPaddingBottom: 8,
    // effectStaffPaddingTop        ← REMOVED — SongBook profile owns this
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

// ── [H1] Imperative axis lock — called after every profile apply + renderFinished.
// React conditional styles on apiRef.current don't trigger re-renders, so the
// overflow axis was never actually flipping in horizontal mode.
function applyAxisLock(container: HTMLElement, api: any): void {
    const isH = api?.settings?.display?.layoutMode === 1;
    container.style.overflowX = isH ? 'auto' : 'hidden';
    container.style.overflowY = isH ? 'hidden' : 'auto';
    (container.style as any).webkitOverflowScrolling = 'touch';
    // [H-height] In horizontal strip mode, don't let minHeight:600px create a tall
    // empty container that pushes the strip to an odd vertical position.
    // 'auto' lets the container shrink to the strip's natural height.
    container.style.minHeight = isH ? 'auto' : '600px';
    // Also lock framer scroll element if AlphaTab is using a different one.
    const scrollEl = (api?.renderer?.framer?.scrollElement as HTMLElement | null | undefined);
    if (scrollEl && scrollEl !== container) {
        scrollEl.style.overflowX = isH ? 'auto' : 'hidden';
        scrollEl.style.overflowY = isH ? 'hidden' : 'auto';
    }
    console.log(`🔒 applyAxisLock isH=${isH}`, {
        overflowX: container.style.overflowX,
        overflowY: container.style.overflowY,
        minHeight: container.style.minHeight,
    });
}

// ── [C2] Center horizontal strip — improved first-note seek ──────────────────
// tick<480: probes forward to find first beat whose onNotesX is past the clef
// region (>120px), then positions it near the left edge with breathing room.
// Mid-song: centers viewport on the beat at tickPosition.
function centerHorizontalStrip(container: HTMLElement, api: any): void {
    if (api?.settings?.display?.layoutMode !== 1) return;
    const scrollEl: HTMLElement =
        (api?.renderer?.framer?.scrollElement as HTMLElement | null | undefined) ??
        container;
    const tickCache = (api as any)?.tickCache;
    const bounds = api?.renderer?.boundsLookup;
    if (!tickCache?.findBeat || !bounds?.findBeat) { scrollEl.scrollLeft = 0; return; }
    const trackSet: Set<number> = api?.tracks
        ? new Set(api.tracks.map((t: any) => t.index as number))
        : new Set([0]);

    const tick = api?.tickPosition ?? 0;

    if (tick < 480) {
        // Probe to first real note past clef region — clef occupies ~0–120px.
        // Only scroll if the note is NOT already comfortably visible at scrollLeft=0.
        // (e.g. beatX=120 on a 956px viewport → naturally visible, don't scroll.)
        for (const probe of [0, 60, 120, 240, 480]) {
            const r = tickCache.findBeat(trackSet, probe);
            const bb = r?.beat ? bounds.findBeat(r.beat) : null;
            if (!bb?.visualBounds) continue;
            const beatX = typeof bb.onNotesX === 'number' ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
            if (beatX > 120) {
                const clientW = scrollEl.clientWidth;
                // Already visible in left 60% of viewport → leave at 0 (natural position).
                // Only scroll when note is deep into strip (beyond half the viewport width).
                if (beatX < clientW * 0.6) {
                    scrollEl.scrollLeft = 0;
                    console.log('📍 V108 centerHorizontal → first note naturally visible, no scroll', { beatX, clientW });
                } else {
                    scrollEl.scrollLeft = Math.max(0, beatX - 40);
                    console.log('📍 V108 centerHorizontal → first note scrolled', { beatX, scrollLeft: scrollEl.scrollLeft });
                }
                return;
            }
        }
        scrollEl.scrollLeft = 0;
        console.log('📍 V108 centerHorizontal → start fallback');
        return;
    }

    // Mid-song → center viewport on current beat
    const r = tickCache.findBeat(trackSet, tick);
    const bb = r?.beat ? bounds.findBeat(r.beat) : null;
    if (!bb?.visualBounds) { scrollEl.scrollLeft = 0; return; }
    const beatX = typeof bb.onNotesX === 'number' ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
    scrollEl.scrollLeft = Math.max(0, beatX - scrollEl.clientWidth / 2);
    console.log('📍 V108 centerHorizontal → beat', { tick, beatX, scrollLeft: scrollEl.scrollLeft });
}

function getTrackSet(api: any): Set<number> {
    return api.tracks
        ? new Set<number>(api.tracks.map((t: any) => t.index as number))
        : new Set<number>([0]);
}

function forceRevealSurface(
    host: HTMLElement,
    cancelRef: { current: number },
    label = 'forceReveal',
    maxMs = 3000,
): void {
    const start = performance.now();
    const cancelToken = cancelRef.current;
    const tick = () => {
        if (cancelRef.current !== cancelToken) return;
        const surf = host.querySelector('.at-surface') as HTMLElement | null;
        if (!surf) {
            if (performance.now() - start < maxMs) requestAnimationFrame(tick);
            return;
        }
        surf.style.visibility = 'visible';
        surf.style.opacity = '1';
        (surf.style as any).webkitOpacity = '1';
        surf.style.fontSize = '';
        surf.style.lineHeight = '';
        surf.style.overflow = '';
        surf.style.pointerEvents = '';
        void surf.getBoundingClientRect();
        const cs = getComputedStyle(surf);
        const ok = cs.opacity !== '0'
            && cs.visibility !== 'hidden'
            && cs.fontSize !== '0px'
            && cs.lineHeight !== '0px';
        if (!ok && performance.now() - start < maxMs) requestAnimationFrame(tick);
        else if (!ok) console.warn(`⚠️ ${label}: surface still hidden after ${maxMs}ms`);
    };
    requestAnimationFrame(tick);
}

function showCurtain(curtain: HTMLDivElement | null): void {
    if (curtain) curtain.style.display = 'block';
}
function hideCurtainAtomic(curtain: HTMLDivElement | null): void {
    if (curtain) curtain.style.display = 'none';
}

function isSurfacePaintable(host: HTMLElement): boolean {
    const surf = host.querySelector('.at-surface') as HTMLElement | null;
    if (!surf) return false;
    const cs = getComputedStyle(surf);
    if (cs.opacity === '0' || cs.visibility === 'hidden' ||
        cs.fontSize === '0px' || cs.lineHeight === '0px' || cs.overflow === 'hidden') return false;
    const svgs = surf.querySelectorAll('svg');
    if (!svgs.length) return false;
    for (const svg of Array.from(svgs).slice(0, 3)) {
        const r = (svg as SVGSVGElement).getBoundingClientRect();
        if (r.width > 10 && r.height > 10) return true;
    }
    return false;
}

/**
 * [Cipher Fix A] Resolve the true next beat for cursor interpolation.
 * Kept for reference; replaced by resolveNextBeatExpanded in the timing path.
 */
function resolveNextBeat(api: any, curBeat: any, trackSet: Set<number>): any | null {
    const curStart = curBeat?.absolutePlaybackStart;
    if (typeof curStart !== 'number') return null;
    let nb = curBeat?.nextBeat;
    while (nb) {
        const nbStart = nb?.absolutePlaybackStart;
        if (typeof nbStart === 'number' && nbStart > curStart) return nb;
        nb = nb?.nextBeat ?? null;
    }
    const tickCache = (api as any).tickCache;
    if (!tickCache?.findBeat) return null;
    const probes = [1, 2, 3, 5, 10, 20, 40, 60, 120, 240, 480];
    for (const d of probes) {
        const r = tickCache.findBeat(trackSet, curStart + d);
        const b = r?.beat;
        const bs = b?.absolutePlaybackStart;
        if (b && typeof bs === 'number' && bs > curStart) return b;
    }
    return null;
}

/**
 * [B] Resolve next beat AND its expanded tick (t from forward scan).
 * Returns nextStart in EXPANDED (playback) time — correct for shuffle/repeat songs.
 *
 * [V105.1] Skip candidates whose absolutePlaybackStart <= curBeat's — these are late
 * pickup/ornament beats (e.g. beat 480 arriving after beat 600 in SRV).
 */
function resolveNextBeatExpanded(
    api: any,
    trackSet: Set<number>,
    expandedStart: number,
    curBeat: any,
): { nextBeat: any | null; nextStart: number | null } {
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

        if (b.absolutePlaybackStart === curAbs &&
            b?.voice?.bar?.masterBar?.index === curMbIdx) continue;

        if (b.absolutePlaybackStart <= curAbs) {
            if (!didLogSkip) {
                didLogSkip = true;
                console.log('[resolveNextBeatExpanded] skipped backward candidate', {
                    curAbs, bAbs: b.absolutePlaybackStart, firstT: t,
                });
            }
            continue;
        }

        if (curX !== null) {
            const cBb = api?.renderer?.boundsLookup?.findBeat?.(b);
            if (cBb?.visualBounds) {
                const cX = typeof cBb.onNotesX === 'number'
                    ? cBb.onNotesX
                    : cBb.visualBounds.x + cBb.visualBounds.w / 2;
                if (cX < curX - 6) continue;
            }
        }

        return { nextBeat: b, nextStart: t };
    }
    return { nextBeat: null, nextStart: null };
}

/** [SRV Layer 1a] Rounded "column key" for a beat's visual position. */
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
    const cursorRef = useRef<MaestroCursorV2 | null>(null);
    const initTokenRef = useRef(0);
    // 🔒 trackIndicesRef — keeps scoreLoaded from reading stale closure value.
    // Without this, scoreLoaded always renders [0] because init() captures the
    // prop at mount time. The ref is always current, so the first renderTracks()
    // call uses the correct winning track index set by page.tsx handleScoreLoaded.
    const trackIndicesRef = useRef(trackIndices);
    useEffect(() => { trackIndicesRef.current = trackIndices; }, [trackIndices]);

    // ── [Q5] forceHorizontalRef — stable ref so all [] closures read current value, not stale prop.
    // Without this, ResizeObserver + init closures capture the mount-time prop and never update.
    const forceHorizontalRef = useRef<boolean>(!!forceHorizontal);
    useEffect(() => { forceHorizontalRef.current = !!forceHorizontal; }, [forceHorizontal]);

    // ── [P2] Layout profile refs ──────────────────────────────────────────────
    const alphaTabModuleRef = useRef<any>(null);
    const activeProfileRef = useRef<LayoutProfileName | null>(null);
    const baseTrackProfileRef = useRef<LayoutProfileName | null>(null); // 🔒 sparse vs dense — read by ResizeObserver
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

        console.log('🎼 V107 layout check:', { fileUrl, cleanUrl, fileExt, isGP8 });

        const init = async () => {
            const container = containerRef.current!;
            await waitForContainerWidth(container);
            if (destroyed || token !== initTokenRef.current) return;

            // ── [P3] Stash module, resolve + bake layout profile ──────────────
            const alphaTab = await import('@coderline/alphatab');
            alphaTabModuleRef.current = alphaTab;

            // Use container width (not window) to match ResizeObserver tier logic.
            // < 480px = true phone → horizontal. Tablets stay in page mode.
            // 🔒 vvW/vvH first — containerW uses vvW as fallback (not window.innerWidth).
            const vvW = window.visualViewport?.width ?? window.innerWidth;
            const vvH = window.visualViewport?.height ?? window.innerHeight;
            const isLandscape = (vvW > vvH) || (window.matchMedia?.('(orientation: landscape)')?.matches ?? false);
            const containerW = containerRef.current?.clientWidth ?? vvW;
            const useHorizontal = forceHorizontal || (isLandscape && containerW < 480);
            // [M4] Seed via resolveProfileByWidth — iPhone portrait gets songBookPageMobile
            // immediately instead of waiting for ResizeObserver to correct from Dense.
            const base = 'songBookPageDense' as LayoutProfileName;
            const initProfile = resolveProfileByWidth(containerW, base, useHorizontal);
            activeProfileRef.current = initProfile;
            console.log('🎼 V107 initProfile:', initProfile, { vvW, vvH, isLandscape, useHorizontal, forceHorizontal, containerW });

            const api = await initAlphaTab({
                container,
                playerMode: 'synthesizer',
                soundFontPath,
                layoutMode: 'page',
                scrollMode: 'off',
                scrollContainer: scrollContainer ?? undefined,
                layoutProfile: initProfile,  // [P3] bake profile at construction
                ...(isGP8 && { displayOverrides: GP8_DISPLAY_OVERRIDES }),
            });
            if (destroyed || token !== initTokenRef.current) { api.destroy(); return; }

            apiRef.current = api;
            if (typeof window !== 'undefined') (window as any).__atV107 = api;

            // [H1] Axis lock immediately after init — before any render fires.
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

                // ── Auto-pick best default track (Songsterr-style tone-first) ─
                // Must run INSIDE scoreLoaded — this is the only place score.tracks
                // is available before renderTracks fires. The trackIndices prop is
                // always [0] at mount time; the prop update from page.tsx arrives
                // too late to influence the first render.
                const _norm = (s: string) =>
                    (s ?? '').toLowerCase().trim().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');
                const _isVocal = (n: string) =>
                    /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal)/i.test(_norm(n));
                const _isDrum = (n: string) =>
                    ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'].some(kw => _norm(n).includes(kw));
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
                // Fallback: first non-vocal non-drum if no guitar found
                if (winnerScore <= 0) {
                    const fb = score.tracks.findIndex((t: any) =>
                        !_isVocal(t?.name ?? '') && !_isDrum(t?.name ?? ''));
                    if (fb >= 0) winnerIdx = fb;
                }

                // Update ref BEFORE profile detection — ResizeObserver reads it
                trackIndicesRef.current = [winnerIdx];
                console.log('🎯 V107 auto-pick (scoreLoaded)', {
                    winnerIdx,
                    winnerName: score.tracks[winnerIdx]?.name,
                    winnerScore,
                });

                const tr = [score.tracks[winnerIdx]].filter(Boolean);
                if (!tr.length) return;

                const primaryTrackName = (tr[0] as any)?.name ?? ''; // [V107] fix: was undefined in scoreLoaded scope

                // ── [Q2] Track-aware profile detection (two-step, width-tiered) ──────────────
                // Step 1: classify sparse vs dense ONLY — never pass mobile=true here.
                //         baseProfile stores the track-type context for ResizeObserver.
                // Step 2: width-tier via resolveProfileByWidth → portrait phone gets songBookPageMobile.
                const w2 = containerRef.current?.clientWidth ?? window.innerWidth;
                const useHorizontalNow = forceHorizontalRef.current;
                const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
                const trackProfile = resolveProfileByWidth(w2, baseProfile, useHorizontalNow);
                const at = alphaTabModuleRef.current;
                baseTrackProfileRef.current = baseProfile; // 🔒 sparse/dense only — ResizeObserver reads this
                if (at && trackProfile !== activeProfileRef.current) {
                    activeProfileRef.current = trackProfile;
                    applyAlphaTabLayoutProfileSettings(api, at, trackProfile);
                    // [H1] Axis lock after profile apply (scoreLoaded path)
                    if (containerRef.current) applyAxisLock(containerRef.current, api);
                }

                // ── [B] Wipe baked GP8 systemsLayout for sparse tracks ────────
                if (trackProfile === 'songBookPageSparse') {
                    const scoreAny = score as any;
                    const renderedTrack = tr[0] as any;
                    if (renderedTrack) {
                        renderedTrack.systemsLayout = null;
                        renderedTrack.defaultSystemsLayout = 0;
                    }
                    scoreAny.systemsLayout = null;
                    scoreAny.defaultSystemsLayout = 0;
                    console.log('🧨 V107: wiped baked systemsLayout for sparse track', { track: primaryTrackName });
                }

                api.renderTracks(tr);
                console.log(`✅ V107: scoreLoaded → renderTracks([${winnerIdx}]) profile="${trackProfile}"`);

                if (onScoreLoaded && api.score) {
                    const info: SongInfo = {
                        title: api.score.title ?? '',
                        artist: api.score.artist ?? '',
                        album: api.score.album ?? '',
                    } as SongInfo;
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
                if (revealTimerRef.current !== null) {
                    window.clearTimeout(revealTimerRef.current);
                    revealTimerRef.current = null;
                }
                // 🔒 [Curtain fix] Always raise curtain on every render — unconditional.
                // Old: if (!hasRevealedRef.current) showCurtain(...)
                // Problem: after first reveal, hasRevealedRef stays true → curtain never
                // re-raises on profile switches / rotation / track changes → user sees
                // unpatched AlphaTab layout + cursor animating into place.
                hasRevealedRef.current = false;
                showCurtain(curtainRef.current);
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
                        cursorRef.current = attachMaestroCursorV2(api, host);
                    } else {
                        const el = cursorRef.current.element;
                        if (!el || !host.contains(el)) {
                            cursorRef.current.destroy();
                            cursorRef.current = attachMaestroCursorV2(api, host);
                        }
                    }
                    host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor')
                        .forEach(n => ((n as HTMLElement).style.display = 'none'));
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

                    await new Promise<void>(r =>
                        requestAnimationFrame(() => requestAnimationFrame(() => r()))
                    );
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    if (activeRendersRef.current !== 0) return;

                    if (isGP8) {
                        runGp8LayoutEngineV2(h);
                        forceRevealSurface(h, forceRevealCancelRef, 'postGp8Patch');
                    }

                    const okCursor = await ensureCursorAndAnchorOnce(tokenAtFinish);
                    if (!okCursor) return;
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    if (activeRendersRef.current !== 0) return;

                    forceRevealSurface(h, forceRevealCancelRef, 'preDrop');
                    h.getBoundingClientRect();
                    (h.querySelector('.at-surface') as HTMLElement | null)?.getBoundingClientRect();

                    hideCurtainAtomic(curtainRef.current);
                    hasRevealedRef.current = true;
                    console.log('🟢 V107 curtain dropped', { token: tokenAtFinish });

                    // [H1] Final axis lock enforcement after render settles.
                    // [H2] Center strip mode — anchors scrollLeft so clef isn't first visible.
                    const hContainer = containerRef.current;
                    if (hContainer) {
                        applyAxisLock(hContainer, api);
                        requestAnimationFrame(() =>
                            requestAnimationFrame(() => centerHorizontalStrip(hContainer, api))
                        );
                    }

                    requestAnimationFrame(() => forceRevealSurface(h, forceRevealCancelRef, 'postDrop'));
                    isSettlingRef.current = false;
                    setIsLoading(false);
                    setIsSettling(false);
                    onRendered?.();
                    onBoundsReady?.();
                    isApplyingProfileRef.current = false; // [P3b] release resize guard
                }, QUIET_MS);
            });

            const notifyPlayerReady = () => { if (api.isReadyForPlayback) onPlayerReady?.(); };
            api.playerReady?.on(() => setTimeout(notifyPlayerReady, 100));
            api.soundFontLoaded?.on(() => { console.log('✅ V107: Soundfont loaded'); notifyPlayerReady(); });

            let stateDebounce: ReturnType<typeof setTimeout>;
            api.playerStateChanged.on((e: any) => {
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) onPlayStateChange(playing);
                }, 50);
            });

            // 🔒🔒🔒 CURSOR ENGINE LOCK — V107 + SRV Layers 1a / 2a / 2b / 2c 🔒🔒🔒
            api.playerPositionChanged.on((e: any) => {
                if (isSettlingRef.current) return;
                if (!cursorRef.current) return;

                const tickRaw = e.currentTick ?? e.tickPosition;
                if (tickRaw == null) return;

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

                const sameStructural = isSameBeat(curBeat, stableCurBeatRef.current);
                const curVisualKey = getVisualKeyForBeat(api, curBeat);
                const sameVisual = curVisualKey !== null
                    && stableVisualKeyRef.current !== null
                    && curVisualKey === stableVisualKeyRef.current;
                const shouldReAnchor = !sameStructural || !sameVisual || jumped;

                if (shouldReAnchor) {
                    const inSeekFreeze = seekFreezeUntilRef.current > Date.now() &&
                        seekTargetTickRef.current != null;
                    if (inSeekFreeze) {
                        const beatAbsForGate = curBeat.absolutePlaybackStart ?? tick;
                        if (beatAbsForGate < (seekTargetTickRef.current! - 120)) {
                            return;
                        }
                    }

                    const MIN_BACKTRACK_TICKS = 120;
                    const incomingStart = curBeat.absolutePlaybackStart ?? tick;
                    const isActuallyPlaying = (api.playerState ?? 0) === 1;
                    const inBypassWindow = Date.now() < allowBacktrackUntilRef.current;

                    // [V105.2] Structural regression guard — unconditional.
                    if (stableCurBeatRef.current) {
                        const prevAbs = stableCurBeatRef.current.absolutePlaybackStart ?? -1;
                        if (incomingStart >= 0 && prevAbs >= 0 && incomingStart < prevAbs) {
                            const regKey = `${incomingStart}:${prevAbs}`;
                            if (lastRegressionLogRef.current !== regKey) {
                                lastRegressionLogRef.current = regKey;
                                console.warn('[V107] structural regression discarded', {
                                    incomingStart, prevAbs, tick,
                                });
                            }
                            return;
                        }
                    }

                    if (!isActuallyPlaying || inBypassWindow) {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    } else if (
                        lastAcceptedBeatStartRef.current >= 0 &&
                        incomingStart < lastAcceptedBeatStartRef.current - MIN_BACKTRACK_TICKS
                    ) {
                        console.warn('[V107] dropped out-of-order beat', {
                            incomingStart, lastAccepted: lastAcceptedBeatStartRef.current,
                        });
                        return;
                    } else {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    }
                    stableCurBeatRef.current = curBeat;
                    stableVisualKeyRef.current = curVisualKey;

                    const beatId = curBeat.absolutePlaybackStart ?? 0;
                    if (beatId === reAnchorCountRef.current.beat) {
                        reAnchorCountRef.current.count++;
                        if (reAnchorCountRef.current.count > 1)
                            console.warn(`[V107] ⚠️ Re-anchor ${reAnchorCountRef.current.count}x on beat ${beatId}`);
                    } else {
                        reAnchorCountRef.current = { beat: beatId, count: 1 };
                    }

                    // ── [Patch A] expandedBeatStart: default to beatAbsStart, extended window ──
                    const beatAbsStart = curBeat.absolutePlaybackStart ?? tick;
                    const structuralDur = (curBeat.playbackDuration ?? curBeat.duration ?? 480) || 480;
                    let expandedBeatStart = beatAbsStart;
                    for (let t = tick - 1; t >= Math.max(tick - 8192, beatAbsStart - 1); t--) {
                        const r2 = tickCache.findBeat(trackSet, t);
                        if (!r2?.beat || !isSameBeat(r2.beat, curBeat)) { expandedBeatStart = t + 1; break; }
                    }

                    // ── [Patch B] resolveNextBeatExpanded — expanded clock ────
                    const { nextBeat: resolvedNextBeat, nextStart: nextExpandedStart } =
                        resolveNextBeatExpanded(api, trackSet, expandedBeatStart, curBeat);

                    // 🔍 DUR_CHECK — diagnostic, remove once stable
                    const _structuralDur = structuralDur;
                    const _expandedDur = typeof nextExpandedStart === 'number' && nextExpandedStart > expandedBeatStart
                        ? nextExpandedStart - expandedBeatStart
                        : _structuralDur;
                    console.log('🧪 DUR_CHECK', {
                        beatStart: beatAbsStart,
                        structuralDur: _structuralDur,
                        expandedStart: expandedBeatStart,
                        expandedDur: _expandedDur,
                        ratio: _structuralDur > 0 ? (_expandedDur / _structuralDur).toFixed(2) : 'n/a',
                        nextStart: nextExpandedStart ?? null,
                        nextBeatExists: !!resolvedNextBeat,
                    });

                    // ── guardedStart: both sides in expanded time ────
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
                    if (ratio < 0.5 || ratio > 2.5 || !Number.isFinite(ratio)) {
                        guardedStart = beatAbsStart;
                        computedDur = structuralDur;
                    }

                    const MIN_EXPANDED = 30;
                    if (!Number.isFinite(computedDur) || computedDur < MIN_EXPANDED) {
                        guardedStart = beatAbsStart;
                        computedDur = structuralDur;
                    }
                    if (typeof nextExpandedStart === 'number' && nextExpandedStart <= beatAbsStart) {
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                    }

                    stableExpandedBeatStartRef.current = guardedStart;
                    stableNextBeatRef.current = resolvedNextBeat;
                    stableNextExpandedBeatStartRef.current = typeof nextExpandedStart === 'number' ? nextExpandedStart : null;

                    console.log('[V107→Cursor] setBeat args', {
                        beatAbs: beatAbsStart,
                        expandedBeatStart: guardedStart,
                        nextExpandedBeatStart: nextExpandedStart ?? null,
                        hasPreScannedNextBeat: !!resolvedNextBeat,
                    });
                    cursorRef.current.setBeat(
                        curBeat,
                        resolvedNextBeat,
                        nextExpandedStart ?? null,
                        guardedStart,
                    );
                }

                cursorRef.current.setTick(tick, stableNextBeatRef.current, stableExpandedBeatStartRef.current);
            });
            // 🔒🔒🔒 END CURSOR ENGINE LOCK 🔒🔒🔒

            await loadGuitarProFile(api, fileUrl);

            if (container.clientWidth === 0) {
                requestAnimationFrame(() => {
                    if (container.clientWidth > 0 && apiRef.current) {
                        console.warn('⚠️ V107: Post-paint fallback — re-rendering');
                        apiRef.current.render();
                    }
                });
            }
        };

        init().catch(console.error);

        return () => {
            destroyed = true;
            ++initTokenRef.current;
            activeRendersRef.current = 0;
            renderTokenRef.current = 0;
            hasRevealedRef.current = false;
            if (revealTimerRef.current !== null) { window.clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
            if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
            setIsLoading(true);
            setIsSettling(true);
            showCurtain(curtainRef.current);
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
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
    }, [fileUrl]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api?.score?.tracks?.length) return;
        const tr = trackIndices.map((i: number) => api.score.tracks[i]).filter(Boolean);
        if (!tr.length) return;

        // ── [Q4] Track switch: same two-step pattern as scoreLoaded ──────────────
        const primaryTrackName = (tr[0] as any)?.name ?? '';
        const w = containerRef.current?.clientWidth ?? window.innerWidth;
        const useHorizontalNow = forceHorizontalRef.current;
        const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
        const trackProfile = resolveProfileByWidth(w, baseProfile, useHorizontalNow);
        const at = alphaTabModuleRef.current;
        baseTrackProfileRef.current = baseProfile; // 🔒 sparse/dense only for ResizeObserver
        if (at && trackProfile !== activeProfileRef.current) {
            activeProfileRef.current = trackProfile;
            applyAlphaTabLayoutProfileSettings(api, at, trackProfile);
            // [C5] Axis lock after track-switch profile apply (was missing call site)
            if (containerRef.current) applyAxisLock(containerRef.current, api);
            console.log(`🎸 V108: track switch → profile="${trackProfile}" base="${baseProfile}" [${trackIndices.join(', ')}]`);
        }

        hasRevealedRef.current = false;
        showCurtain(curtainRef.current);
        api.renderTracks(tr);
        console.log(`🎸 V107: renderTracks → [${trackIndices.join(', ')}]`);
    }, [trackIndices]);

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

    // ── [P4] ResizeObserver — width-tier profile switching ────────────────────
    // Replaces window.addEventListener('resize') which misses devtools dock/undock.
    // ResizeObserver fires on the actual container — matches Songsterr's behavior
    // where opening devtools docked-right drops bars per row.
    //
    // Width tiers (dense tracks only):
    //   ≥ 900px → songBookPageDense      (5 bars/row, full desktop)
    //   768–900px → songBookPageDenseNarrow (3 bars/row, devtools open)
    //   < 768px → songBookHorizontal     (mobile)
    //
    // Sparse tracks: no narrow tier — barsPerRow:8 handles any desktop width.
    // Guard resets via isApplyingProfileRef.current = false in renderFinished.
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
            // [Q3] Read ref — not captured prop. Stale closure bug fixed.
            const useHorizontal = forceHorizontalRef.current;
            const nextProfile = resolveProfileByWidth(w, base, useHorizontal);
            if (nextProfile === activeProfileRef.current) return;
            // [Curtain fix] Raise before ResizeObserver-driven render.
            hasRevealedRef.current = false;
            showCurtain(curtainRef.current);
            isApplyingProfileRef.current = true;
            activeProfileRef.current = nextProfile;
            applyAlphaTabLayoutProfile(api, at, nextProfile);
            console.log(`📐 V107 ResizeObserver → profile="${nextProfile}" w=${w}px useHorizontal=${useHorizontal}`);
            applyAxisLock(el, api); // [H1]
        });

        ro.observe(el);
        return () => ro.disconnect();
    }, []); // intentional empty deps — all reads via refs

    // ── [Q6] forceHorizontal reactive effect ─────────────────────────────────
    // Fires immediately when page.tsx toggles isMobileLandscape — no ResizeObserver delay.
    // This is the authoritative landscape switch; ResizeObserver is a fallback for width tiers.
    useEffect(() => {
        const api = apiRef.current;
        const at = alphaTabModuleRef.current;
        const el = containerRef.current;
        if (!api || !at || !el) return;
        const w = el.clientWidth;
        const base = baseTrackProfileRef.current ?? 'songBookPageDense';
        const nextProfile = resolveProfileByWidth(w, base, forceHorizontalRef.current);
        if (nextProfile === activeProfileRef.current) return;
        // [Curtain fix] Raise before profile-driven render — renderStarted may fire
        // after some DOM churn is already visible without this guard.
        hasRevealedRef.current = false;
        showCurtain(curtainRef.current);
        isApplyingProfileRef.current = true;
        activeProfileRef.current = nextProfile;
        applyAlphaTabLayoutProfile(api, at, nextProfile);
        console.log(`🔄 V107 forceHorizontal → profile="${nextProfile}" forceH=${forceHorizontal}`);
        applyAxisLock(el, api); // [H1]
    }, [forceHorizontal]);

    // 🔒🔒🔒 CLICK-TO-SEEK — LOCKED CONTRACT (unchanged from V104.10) 🔒🔒🔒
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
                let sampledTotal = 0, resolvedBounds = 0, sameRow = 0;

                for (let t = mbStart; t < mbStart + mbDuration; t += stepSize) {
                    const r = tickCache.findBeat(trackSet, t);
                    const b = r?.beat;
                    if (!b) continue;
                    const abs = b.absolutePlaybackStart ?? -1;
                    if (seenAbs.has(abs)) continue;
                    seenAbs.add(abs);
                    sampledTotal++;
                    const bb = bounds.findBeat?.(b);
                    const vb = bb?.visualBounds;
                    if (!vb) continue;
                    resolvedBounds++;
                    if (Math.abs(vb.y - y) > 20) continue;
                    sameRow++;
                    rowBeats.push({ beat: b, onX: vb.x + vb.w / 2 });
                }

                console.log('🧭 findClosestBeatAtPos stats', {
                    mbIdx, mbStart, mbDuration, sampledTotal, resolvedBounds, sameRow,
                    clickX: +x.toFixed(1), clickY: +y.toFixed(1),
                    rowBeats: rowBeats.map(rb => ({
                        abs: rb.beat.absolutePlaybackStart,
                        onX: +rb.onX.toFixed(1),
                        dx: +(Math.abs(rb.onX - x)).toFixed(1),
                    })),
                });

                if (!rowBeats.length) return null;
                rowBeats.sort((a, b) => a.onX - b.onX);
                const EPS = 8;
                const forward = rowBeats.find(rb => rb.onX >= x - EPS);
                const chosen = forward ?? rowBeats[rowBeats.length - 1];
                const chosenBb = bounds.findBeat?.(chosen.beat);
                const chosenVbW = chosenBb?.visualBounds?.w ?? 8;
                const maxDx = chosenVbW <= 16
                    ? Math.max(12, chosenVbW * 1.6)
                    : 24;
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
                    a && b &&
                    a.absolutePlaybackStart === b.absolutePlaybackStart &&
                    a.voice?.bar?.masterBar?.index === b.voice?.bar?.masterBar?.index;

                let expandedStart = expandedTick;
                for (let t = expandedTick - 1; t >= expandedTick - 8192; t--) {
                    const rr = tickCache.findBeat(trackSet, t);
                    if (!rr?.beat || !isSameBeatLocal(rr.beat, r.beat)) { expandedStart = t + 1; break; }
                }

                const { nextBeat: nextBeatForCursor, nextStart: nextStartForCursor } =
                    resolveNextBeatExpanded(api, trackSet, expandedStart, r.beat);

                // [V105.3] Sync stable refs immediately after click publish.
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
                if (!api || loopEnabledRef.current) return;

                const rect = surface.getBoundingClientRect();
                // [C3] sx/sy: containerRef is the real scroll element when framer.scrollElement
                // is null (confirmed null in this AlphaTab build — surface.scrollLeft is always 0).
                const containerEl = containerRef.current!;
                const scrollEl = (api.renderer?.framer?.scrollElement as HTMLElement | null | undefined) ?? containerEl;
                const sx = scrollEl.scrollLeft ?? 0;
                const sy = scrollEl.scrollTop ?? 0;
                const x = (ev.clientX - rect.left) + sx;
                const y = (ev.clientY - rect.top) + sy;

                console.log('🖱️ CLICK_SEEK raw', {
                    clientX: ev.clientX, clientY: ev.clientY,
                    rectLeft: rect.left, rectTop: rect.top,
                    sx, sy, x, y,
                    layoutMode: api.settings?.display?.layoutMode ?? null,
                    scrollElIs: scrollEl === surface ? 'surface' : scrollEl === containerEl ? 'container' : 'framer',
                    playerState: api.playerState ?? null,
                    tickPosition: api.tickPosition ?? null,
                });

                const bds = api.renderer?.boundsLookup;

                // [Patch D] reject zero-width or far-away getBeatAtPos results.
                let beat = bds?.getBeatAtPos?.(x, y) ?? null;
                if (beat) {
                    const bb2 = bds?.findBeat?.(beat);
                    const vbW2 = bb2?.visualBounds?.w ?? 1;
                    const cx2 = bb2 ? (bb2.visualBounds.x + vbW2 / 2) : null;
                    const dx2 = cx2 != null ? Math.abs(cx2 - x) : Infinity;
                    const tightMax = Math.max(12, vbW2 * 1.6);
                    const tooFar = vbW2 <= 16 ? dx2 > tightMax : dx2 > 40;
                    if (vbW2 === 0 || tooFar) {
                        console.warn('🖱️ CLICK_SEEK getBeatAtPos rejected (degenerate/far)', {
                            dx: +dx2.toFixed(1), vbW: vbW2, tightMax: +tightMax.toFixed(1),
                            beatAbs: beat.absolutePlaybackStart,
                        });
                        beat = null;
                    }
                }
                const tickCache = (api as any).tickCache;
                if (!beat) console.warn('🖱️ CLICK_SEEK no beat at pos', { x, y });

                // E2: same-masterBar sticky override only
                const e2Beat = findClosestBeatAtPos(x, y, beat ?? undefined);
                if (e2Beat) {
                    if (!beat) {
                        beat = e2Beat;
                        console.log('🖱️ CLICK_SEEK E2 fallback (null)', { to: e2Beat.absolutePlaybackStart });
                    } else {
                        const sameMb =
                            (e2Beat?.voice?.bar?.masterBar?.index) ===
                            (beat?.voice?.bar?.masterBar?.index);
                        if (sameMb) {
                            const bb = bds?.findBeat?.(beat);
                            const cx = bb ? (bb.visualBounds.x + bb.visualBounds.w / 2) : null;
                            const dxB = cx != null ? Math.abs(cx - x) : Infinity;
                            if (dxB > 24) {
                                console.log('🖱️ CLICK_SEEK E2 sticky override (same bar)', {
                                    from: beat.absolutePlaybackStart, to: e2Beat.absolutePlaybackStart,
                                    dxB: +dxB.toFixed(1),
                                });
                                beat = e2Beat;
                            }
                        }
                    }
                }

                if (!beat) { console.warn('🖱️ CLICK_SEEK no beat after fallback', { x, y }); return; }
                if (!tickCache?.masterBars) return;

                if (bds) {
                    const pickedBb = bds.findBeat?.(beat);
                    console.log('🖱️ CLICK_SEEK beat metrics', {
                        onNotesX: pickedBb?.onNotesX ?? null,
                        vbX: pickedBb?.visualBounds?.x ?? null,
                        vbW: pickedBb?.visualBounds?.w ?? null,
                        clickX: x,
                        dx: pickedBb && typeof pickedBb.onNotesX === 'number'
                            ? +(Math.abs(pickedBb.onNotesX - x)).toFixed(1) : null,
                    });
                }

                console.log('🖱️ CLICK_SEEK beat', {
                    beatAbs: beat.absolutePlaybackStart,
                    beatStart: beat.playbackStart,
                    beatDur: beat.playbackDuration ?? beat.duration ?? null,
                    mbIdx: beat.voice?.bar?.masterBar?.index ?? null,
                    barIdx: beat.voice?.bar?.index ?? null,
                });

                const mbIdx = beat.voice?.bar?.masterBar?.index;
                const offset = beat.playbackStart ?? 0;
                if (mbIdx == null) return;

                // ── [Phase 2] Horizontal mode: seek directly to absolutePlaybackStart ──
                // In Horizontal strip, the "closest candidate to currentTick" heuristic
                // picks the wrong repeat occurrence → cursor teleports to clef + wrong playback.
                // Fix: bypass candidate disambiguation entirely; seek to the beat's absolute tick.
                const isHorizontal = (api.settings?.display?.layoutMode === 1);
                if (isHorizontal) {
                    const beatAbs = beat.absolutePlaybackStart ?? 0;
                    const beatDurH = beat.playbackDuration ?? beat.duration ?? 480;
                    const EPS_IN = 2;
                    const safeTarget = Math.min(beatAbs + EPS_IN, beatAbs + Math.max(0, beatDurH - 1));
                    seekTargetTickRef.current = safeTarget;
                    seekFreezeUntilRef.current = Date.now() + 250;
                    const playerStateNow = api.playerState ?? 0;
                    const wasPlaying = playerStateNow === 1;
                    const tok = ++seekTokenRef.current;
                    if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
                    if (wasPlaying) { seekInProgressRef.current = true; api.pause(); }
                    const seekTicksH = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                    if (seekTicksH) seekTicksH(safeTarget);
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
                    console.log('🖱️ CLICK_SEEK horizontal direct', { beatAbs, safeTarget });
                    return; // skip masterBar candidate disambiguation in horizontal
                }

                // ── Page mode: candidate disambiguation (existing logic) ──────────
                const currentTick = api.tickPosition ?? 0;
                const candidates: number[] = tickCache.masterBars
                    .filter((mb: any) => mb.masterBar?.index === mbIdx)
                    .map((mb: any) => mb.start + offset);
                if (!candidates.length) return;

                const target = candidates.reduce((prev: number, curr: number) =>
                    Math.abs(curr - currentTick) < Math.abs(prev - currentTick) ? curr : prev
                );

                console.log('🖱️ CLICK_SEEK candidates', {
                    mbIdx, offset, currentTick,
                    candidates: candidates.slice(0, 6), target,
                });

                const EPS_IN = 2;
                const beatDurForClamp = beat.playbackDuration ?? beat.duration ?? 480;
                const safeTarget = Math.min(
                    target + EPS_IN,
                    target + Math.max(0, beatDurForClamp - 1),
                );
                seekTargetTickRef.current = safeTarget;
                seekFreezeUntilRef.current = Date.now() + 250;

                const playerStateNow = api.playerState ?? 0;
                const wasPlaying = playerStateNow === 1;

                const tok = ++seekTokenRef.current;
                if (resumeTimerRef.current !== null) {
                    window.clearTimeout(resumeTimerRef.current);
                    resumeTimerRef.current = null;
                }

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
            if (resumeTimerRef.current !== null) {
                window.clearTimeout(resumeTimerRef.current);
                resumeTimerRef.current = null;
            }
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

            <div
                ref={curtainRef}
                className="absolute inset-0 pointer-events-none"
                style={{ background: bgColor, display: 'block', zIndex: 5000 }}
            />

            <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate' as any }}>
                <div
                    ref={containerRef}
                    className="alphatab-container"
                    style={{
                        position: 'relative',
                        width: '100%',
                        // 🔒 [C1] minHeight absent — applyAxisLock() owns imperatively:
                        //   horizontal → 'auto', page → '600px'
                        // 🔒 [C1] overflow:'hidden' as neutral default — applyAxisLock()
                        //   overrides both axes immediately after init + every profile apply.
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

// Stable entrypoint aliases (deploy-safe)
// - Pages import AlphaTabRendererV102
// - Older code can import AlphaTabRenderer
export const AlphaTabRenderer = AlphaTabRendererV102;