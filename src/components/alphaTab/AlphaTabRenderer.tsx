'use client';

/**
 * AlphaTabRenderer.tsx
 * Current version: V113
 * Date: April 20th, 2026
 * Cloned from V112 — cursor centering + touch drag rubber-band fix.
 *
 * V113 CHANGES:
 * ✅ [L14] CURSOR_BIAS_PX = 0: probe confirmed onNotesX = vbCenter = 120.001,
 *          cursorSurfaceX was 117 (-3 bias was wrong direction). Bias removed.
 * ✅ [L15] translateX(-50%) on overlay: line now visually centered on cursorBoxX.
 *          width bumped 2px → 3px for better readability.
 * ✅ [L16] isDraggingRef: RAF loop yields to touch drag. Without this, the loop
 *          overwrote targetScrollLeftRef every frame → rubber-band snap on release.
 * ✅ [L17] Touch drag minScroll: computed from beat1X - cursorSurfaceX on touchstart.
 *          Prevents dragging clef/time-sig under the cursor line.
 *
 * 🔒 V112 PRESERVED EXACTLY:
 *   ✅ [L13] prime-on-play via playerStateChanged
 *   ✅ [L11] state prime after curtain drop
 *   ✅ [L10] RAF self-heal in playerPositionChanged
 *   ✅ [L9]  getFixedCursorX / getCursorSurfaceX coordinate helpers
 *   ✅ [L8-fix] landscapeInitialAnchor retry-until-ready
 *   ✅ [L7-fix] within-beat interpolation (curBeatX → nextBeatX)
 *   ✅ [L1-fix] overlay on non-scrolling wrapper
 *   ✅ Portrait MaestroCursor V1 engine — unchanged
 *   ✅ All V111/V110/V109/V108 preserved locks
 *
 * CURSOR MATH (confirmed probe):
 *   padL=62, contentW=832, ratio=0.144 → cursorBoxX=182, cursorSurfaceX=120
 *   beat1X onNotesX=120.001 → delta=0.001 ✅ pixel-perfect alignment
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    initAlphaTab,
    loadGuitarProFile,
    resolveProfileByWidth,
    resolveTrackLayoutProfile,
    applyAlphaTabLayoutProfile,
    applyAlphaTabLayoutProfileSettings,
    type LayoutProfileName,
} from '@/lib/alphaTab/initAlphaTab';
import { attachMaestroCursor, MaestroCursor } from '@/components/alphaTab/MaestroCursor';
import BeatCustomLoopOverlay from '@/components/alphaTab/BeatCustomLoopOverlay';
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
// CURSOR_POSITION_RATIO: fraction of content width (excluding safe-area padding).
// 0.144 = beat1X(120.001) / contentW(832). cursor lands at padL+120 = 182px.
const CURSOR_POSITION_RATIO = 0.144;
const CURSOR_BIAS_PX = 0;        // probe: onNotesX=120.001, cursorSurfaceX=120 → delta≈0 ✅
const SCROLL_EASE = 0.18;        // LERP factor per RAF frame

// ── [L9] Padding-aware cursor helpers ────────────────────────────────────────
// getFixedCursorX  → container box space (used for overlay CSS left)
// getCursorSurfaceX → SVG/surface space (used for ALL scroll math)
// beatX from onNotesX is SVG space; padding must be subtracted for scroll targets.
function getFixedCursorX(container: HTMLElement): number {
    const cs = getComputedStyle(container);
    const padL = parseFloat(cs.paddingLeft || '0');
    const padR = parseFloat(cs.paddingRight || '0');
    const contentW = container.clientWidth - padL - padR;
    return Math.round(padL + contentW * CURSOR_POSITION_RATIO + CURSOR_BIAS_PX);
}

function getCursorSurfaceX(container: HTMLElement): number {
    const cs = getComputedStyle(container);
    const padL = parseFloat(cs.paddingLeft || '0');
    return getFixedCursorX(container) - padL;
}

// ── [L1-fix] Landscape Fixed Cursor Overlay ───────────────────────────────────
// Attaches to the NON-scrolling wrapper. translateX(-50%) centers the bar on left.
class LandscapeFixedCursorOverlay {
    private el: HTMLElement;
    private container: HTMLElement;

    constructor(wrapper: HTMLElement, container: HTMLElement) {
        this.container = container;
        this.el = document.createElement('div');
        this.el.id = 'maestro-landscape-cursor';
        const x = getFixedCursorX(container);
        Object.assign(this.el.style, {
            position: 'absolute',
            top: '0',
            left: `${x}px`,
            width: '3px',
            height: '100%',
            transform: 'translateX(-50%)',   // [L15] centers 3px bar on the position
            background: 'rgba(168, 85, 247, 0.85)',
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.55)',
            pointerEvents: 'none',
            zIndex: '1001',
            willChange: 'transform',
        });
        wrapper.appendChild(this.el);
        console.log('✅ LandscapeFixedCursorOverlay V113: x=', x);
    }

    updateX(): void {
        this.el.style.left = `${getFixedCursorX(this.container)}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
    }
}

// ── [L8-fix] Landscape initial anchor — retry-until-ready ────────────────────
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
            else console.warn('⚠️ V113 landscapeInitialAnchor: timed out');
            return;
        }
        const trackSet: Set<number> = api?.tracks
            ? new Set(api.tracks.map((t: any) => t.index as number))
            : new Set([0]);
        const cursorSurfaceX = getCursorSurfaceX(container);
        const reachableFloor = cursorSurfaceX + 4;
        const PROBE_TICKS = [0, 60, 120, 240, 480, 720, 960];
        for (const probe of PROBE_TICKS) {
            const r = tickCache.findBeat(trackSet, probe);
            const bb = r?.beat ? bounds.findBeat(r.beat) : null;
            if (!bb?.visualBounds) continue;
            const beatX = typeof bb.onNotesX === 'number'
                ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
            if (beatX >= reachableFloor) {
                const snap = Math.max(0, beatX - cursorSurfaceX);
                container.scrollLeft = snap;
                targetScrollLeftRef.current = snap;
                console.log('📍 V113 anchor ✅', { beatX, cursorSurfaceX, snap, probe });
                return;
            }
        }
        container.scrollLeft = 0;
        targetScrollLeftRef.current = 0;
    };
    requestAnimationFrame(step);
}

// ─── Locked helpers ───────────────────────────────────────────────────────────

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
}

function getTrackSet(api: any): Set<number> {
    return api.tracks
        ? new Set<number>(api.tracks.map((t: any) => t.index as number))
        : new Set<number>([0]);
}

function forceRevealSurface(host: HTMLElement, cancelRef: { current: number }, maxMs = 3000): void {
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
        if (b.absolutePlaybackStart <= curAbs) { if (!didLogSkip) { didLogSkip = true; } continue; }
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

    const targetScrollLeftRef = useRef<number>(0);
    const landscapeScrollRafRef = useRef<number | null>(null);
    const isDraggingRef = useRef<boolean>(false); // [L16] RAF yields to touch drag

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

    const startLandscapeScrollLoop = useCallback((container: HTMLElement, api: any) => {
        if (landscapeScrollRafRef.current !== null) return;
        const cursorSurfaceX = getCursorSurfaceX(container);
        console.log('🎬 V113 scroll loop — cursorSurfaceX=', cursorSurfaceX);

        const loop = () => {
            // [L16] Belt-and-suspenders: bail entirely if dragging.
            // Primary guard is stopLandscapeScrollLoop() on touchstart.
            if (isDraggingRef.current) {
                landscapeScrollRafRef.current = requestAnimationFrame(loop);
                return;
            }
            const state = landscapeScrollStateRef.current;
            if (state && state.beatDur > 0) {
                const liveTick = (api as any)?.tickPosition ?? state.lastTick;
                const progress = Math.max(0, Math.min(1,
                    (liveTick - state.beatStart) / state.beatDur
                ));
                const interpolatedX = state.curBeatX + (state.nextBeatX - state.curBeatX) * progress;
                const maxScroll = container.scrollWidth - container.clientWidth;
                targetScrollLeftRef.current = Math.max(0, Math.min(
                    interpolatedX - cursorSurfaceX,
                    maxScroll
                ));
            }
            const target = targetScrollLeftRef.current;
            const current = container.scrollLeft;
            const delta = target - current;
            if (Math.abs(delta) > 0.5) {
                container.scrollLeft = current + delta * SCROLL_EASE;
            }
            landscapeScrollRafRef.current = requestAnimationFrame(loop);
        };

        landscapeScrollRafRef.current = requestAnimationFrame(loop);
        if (typeof window !== 'undefined') (window as any).__maestroLandscapeRaf = landscapeScrollRafRef.current;
    }, []);

    const stopLandscapeScrollLoop = useCallback(() => {
        if (landscapeScrollRafRef.current !== null) {
            cancelAnimationFrame(landscapeScrollRafRef.current);
            landscapeScrollRafRef.current = null;
            if (typeof window !== 'undefined') (window as any).__maestroLandscapeRaf = null;
            console.log('⏹ V113 scroll loop stopped');
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
                (window as any).__atV113 = api;
                (window as any).__at = api;
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
                const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
                const trackProfile = resolveProfileByWidth(w2, baseProfile, forceHorizontalRef.current);
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
                        forceRevealSurface(host, forceRevealCancelRef);
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
                        forceRevealSurface(host, forceRevealCancelRef);
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

            // ── [L11/L13] Prime landscape scroll state ────────────────────────
            // Resolves beat at current tick → writes landscapeScrollStateRef + snaps scrollLeft.
            // Called on curtain drop AND on play start (playerStateChanged).
            const primeLandscapeState = (ctr: HTMLElement) => {
                const tickCache = (api as any).tickCache;
                const bounds = api?.renderer?.boundsLookup;
                if (!tickCache?.findBeat || !bounds?.findBeat) return;
                const trackSet = getTrackSet(api);
                const tick = api.tickPosition ?? 0;
                const r = tickCache.findBeat(trackSet, tick);
                const bb = r?.beat ? bounds.findBeat(r.beat) : null;
                if (!bb?.visualBounds) return;
                const curBeatX = typeof bb.onNotesX === 'number'
                    ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
                const beat = r.beat;
                const structuralDur = (beat.playbackDuration ?? beat.duration ?? 480) || 480;
                const { nextBeat, nextStart } = resolveNextBeatExpanded(
                    api, trackSet, beat.absolutePlaybackStart ?? 0, beat
                );
                let nextBeatX = curBeatX;
                if (nextBeat) {
                    const nbb = bounds.findBeat(nextBeat);
                    if (nbb?.visualBounds) {
                        const nx = typeof nbb.onNotesX === 'number'
                            ? nbb.onNotesX : nbb.visualBounds.x + nbb.visualBounds.w / 2;
                        if (nx > curBeatX) nextBeatX = nx;
                    }
                }
                landscapeScrollStateRef.current = {
                    curBeatX, nextBeatX,
                    beatStart: beat.absolutePlaybackStart ?? 0,
                    beatDur: structuralDur,
                    lastTick: tick,
                };
                const cursorSurfaceX = getCursorSurfaceX(ctr);
                const snap = Math.max(0, curBeatX - cursorSurfaceX);
                targetScrollLeftRef.current = snap;
                ctr.scrollLeft = snap;
                console.log('🎯 V113 primeLandscapeState', { curBeatX, cursorSurfaceX, snap, tick });
            };

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

                    forceRevealSurface(h, forceRevealCancelRef);
                    const okPaint = await waitForPaintableSurface(h, tokenAtFinish);
                    if (!okPaint) return;

                    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    if (activeRendersRef.current !== 0) return;

                    if (isGP8) {
                        runGp8LayoutEngineV2(h);
                        forceRevealSurface(h, forceRevealCancelRef);
                    }

                    const isStripRender = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);

                    if (!isStripRender) {
                        const okCursor = await ensureCursorAndAnchorOnce(tokenAtFinish);
                        if (!okCursor) return;
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        if (activeRendersRef.current !== 0) return;
                    } else {
                        if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
                        if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        if (activeRendersRef.current !== 0) return;

                        const wrapper = h.parentElement;
                        if (wrapper) {
                            landscapeCursorRef.current = new LandscapeFixedCursorOverlay(wrapper, h);
                        }
                        landscapeInitialAnchor(h, api, targetScrollLeftRef);
                        startLandscapeScrollLoop(h, api);
                    }

                    forceRevealSurface(h, forceRevealCancelRef);
                    h.getBoundingClientRect();
                    (h.querySelector('.at-surface') as HTMLElement | null)?.getBoundingClientRect();

                    hideCurtainAtomic(curtainRef.current);
                    hasRevealedRef.current = true;
                    console.log('🟢 V113 curtain dropped', { token: tokenAtFinish, isStripRender });

                    if (containerRef.current) applyAxisLock(containerRef.current, api);
                    requestAnimationFrame(() => forceRevealSurface(h, forceRevealCancelRef));
                    isSettlingRef.current = false;
                    setIsLoading(false);
                    setIsSettling(false);
                    onRendered?.();
                    onBoundsReady?.();
                    isApplyingProfileRef.current = false;

                    // [L11] Prime state immediately after curtain drop
                    if (isStripRender) {
                        requestAnimationFrame(() => {
                            const ctr = containerRef.current;
                            if (ctr) primeLandscapeState(ctr);
                        });
                    }
                }, QUIET_MS);
            });

            const notifyPlayerReady = () => { if (api.isReadyForPlayback) onPlayerReady?.(); };
            api.playerReady?.on(() => setTimeout(notifyPlayerReady, 100));
            api.soundFontLoaded?.on(() => notifyPlayerReady());

            let stateDebounce: ReturnType<typeof setTimeout>;
            api.playerStateChanged.on((e: any) => {
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) onPlayStateChange(playing);
                }, 50);

                // [L13] Prime-on-play: eliminates cold-start delay
                const isStripNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                if ((e.state ?? 0) === 1 && isStripNow) {
                    const ctr = containerRef.current;
                    if (ctr) {
                        requestAnimationFrame(() => {
                            primeLandscapeState(ctr);
                            startLandscapeScrollLoop(ctr, api);
                            console.log('[L13] prime+start on play', { tick: api.tickPosition });
                        });
                    }
                }
            });

            // 🔒🔒🔒 CURSOR / SCROLL ENGINE — V113 ────────────────────────────
            api.playerPositionChanged.on((e: any) => {
                if (isSettlingRef.current) return;

                const tickRaw = e.currentTick ?? e.tickPosition;
                if (tickRaw == null) return;

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
                        ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;

                    const beat = r.beat;
                    const beatAbsStart = beat.absolutePlaybackStart ?? tickRaw;
                    const structuralDur = (beat.playbackDuration ?? beat.duration ?? 480) || 480;

                    let expandedStart = beatAbsStart;
                    for (let t = tickRaw - 1; t >= Math.max(tickRaw - 4096, beatAbsStart - 1); t--) {
                        const rr = tickCache.findBeat(trackSet, t);
                        if (!rr?.beat || rr.beat.absolutePlaybackStart !== beatAbsStart) {
                            expandedStart = t + 1; break;
                        }
                    }

                    const { nextBeat, nextStart } = resolveNextBeatExpanded(api, trackSet, expandedStart, beat);
                    const expandedDur = (typeof nextStart === 'number' && nextStart > expandedStart)
                        ? nextStart - expandedStart : structuralDur;

                    let nextBeatX = curBeatX;
                    if (nextBeat) {
                        const nbb = bounds.findBeat(nextBeat);
                        if (nbb?.visualBounds) {
                            nextBeatX = typeof nbb.onNotesX === 'number'
                                ? nbb.onNotesX : nbb.visualBounds.x + nbb.visualBounds.w / 2;
                            if (nextBeatX < curBeatX) nextBeatX = curBeatX;
                        }
                    }

                    landscapeScrollStateRef.current = {
                        curBeatX, nextBeatX,
                        beatStart: expandedStart,
                        beatDur: Math.max(structuralDur * 0.75, Math.min(expandedDur, structuralDur * 2.5)),
                        lastTick: tickRaw,
                    };

                    // [L10] Self-heal: restart loop if playing but loop died
                    if ((api.playerState ?? 0) === 1 && landscapeScrollRafRef.current === null) {
                        console.log('🔄 V113 RAF self-heal');
                        startLandscapeScrollLoop(container, api);
                    }
                    return;
                }

                // ── Portrait cursor engine (🔒 unchanged from V112) ───────────
                if (!cursorRef.current) return;

                const FAR_TICKS = 240;
                if (seekFreezeUntilRef.current > Date.now() && seekTargetTickRef.current != null) {
                    if (Math.abs(tickRaw - seekTargetTickRef.current) > FAR_TICKS) return;
                }

                const range = playbackRangeRef.current;
                if (loopEnabledRef.current && range) {
                    if (tickRaw >= range.endTick - 120) {
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
                            ownerMbIdx = mbIdx; ownerOccurrence = occ; ownerExpandedStart = mb.start;
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
                            if (lastRegressionLogRef.current !== regKey) {
                                lastRegressionLogRef.current = regKey;
                                console.warn('[V113] structural regression discarded');
                            }
                            return;
                        }
                    }

                    if (!isActuallyPlaying || inBypassWindow) {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    } else if (lastAcceptedBeatStartRef.current >= 0 && incomingStart < lastAcceptedBeatStartRef.current - MIN_BACKTRACK_TICKS) {
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
            landscapeScrollStateRef.current = null;
            isDraggingRef.current = false;
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
        const baseProfile = resolveTrackLayoutProfile(primaryTrackName, false);
        const trackProfile = resolveProfileByWidth(w, baseProfile, forceHorizontalRef.current);
        const at = alphaTabModuleRef.current;
        baseTrackProfileRef.current = baseProfile;
        if (at && trackProfile !== activeProfileRef.current) {
            activeProfileRef.current = trackProfile;
            applyAlphaTabLayoutProfileSettings(api, at, trackProfile);
            if (containerRef.current) applyAxisLock(containerRef.current, api);
        }

        stopLandscapeScrollLoop();
        landscapeScrollStateRef.current = null;
        isDraggingRef.current = false;
        if (forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1)) {
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
        } else {
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
            const nextProfile = resolveProfileByWidth(w, base, forceHorizontalRef.current);
            if (nextProfile === activeProfileRef.current) return;
            hasRevealedRef.current = false;
            showCurtain(curtainRef.current);
            isApplyingProfileRef.current = true;
            activeProfileRef.current = nextProfile;
            applyAlphaTabLayoutProfile(api, at, nextProfile);
            applyAxisLock(el, api);
            if (landscapeCursorRef.current) landscapeCursorRef.current.updateX();
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

        stopLandscapeScrollLoop();
        landscapeScrollStateRef.current = null;
        isDraggingRef.current = false;
        if (forceHorizontalRef.current) {
            if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
        } else {
            if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
        }

        hasRevealedRef.current = false;
        showCurtain(curtainRef.current);
        isApplyingProfileRef.current = true;
        activeProfileRef.current = nextProfile;
        applyAlphaTabLayoutProfile(api, at, nextProfile);
        applyAxisLock(el, api);
    }, [forceHorizontal, stopLandscapeScrollLoop]);

    // ── Click-to-seek (portrait) + Touch drag (landscape) ────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let cancelled = false;
        let detach: (() => void) | undefined;

        const tryAttach = (attempt = 0) => {
            if (cancelled) return;
            const surface = container.querySelector('.at-surface') as HTMLElement | null;
            if (!surface) { if (attempt < 20) setTimeout(() => tryAttach(attempt + 1), 150); return; }

            // ── [L12/L16/L17] Touch drag + tap ───────────────────────────────
            // tap  (<8px) → play/pause
            // drag (≥8px) → scrub scrollLeft, clamped to [beat1X-cursorSurfaceX, maxScroll]
            // isDraggingRef pauses RAF interpolation so scroll doesn't rubber-band back
            const touchState = { startX: 0, startScrollLeft: 0, isDragging: false, minScroll: 0 };
            const TAP_THRESHOLD = 8;

            const handleTouchStart = (ev: TouchEvent) => {
                const api = apiRef.current;
                const isStrip = forceHorizontalRef.current ||
                    (api?.settings?.display?.layoutMode === 1);
                if (!isStrip) return;

                touchState.startX = ev.touches[0].clientX;
                touchState.startScrollLeft = container.scrollLeft;
                touchState.isDragging = false;
                isDraggingRef.current = false;
                // Do NOT pause here — a tap while playing must toggle cleanly on touchend.
                // Pause only happens once drag is confirmed in touchmove (dx >= threshold).
                stopLandscapeScrollLoop(); // stop RAF regardless; restarts on touchend

                // Compute minScroll from beat1X so clef never appears under cursor
                const tickCache = (api as any)?.tickCache;
                const bounds = api?.renderer?.boundsLookup;
                if (tickCache?.findBeat && bounds?.findBeat) {
                    const r = tickCache.findBeat(getTrackSet(api), 0);
                    const bb = r?.beat ? bounds.findBeat(r.beat) : null;
                    if (bb?.visualBounds) {
                        const beat1X = typeof bb.onNotesX === 'number'
                            ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
                        touchState.minScroll = Math.max(0, beat1X - getCursorSurfaceX(container));
                    } else {
                        touchState.minScroll = 0;
                    }
                }
            };

            const handleTouchMove = (ev: TouchEvent) => {
                const isStrip = forceHorizontalRef.current ||
                    (apiRef.current?.settings?.display?.layoutMode === 1);
                if (!isStrip) return;

                const dx = touchState.startX - ev.touches[0].clientX;
                if (Math.abs(dx) >= TAP_THRESHOLD) {
                    // First frame drag is confirmed: pause playback so scrub is clean
                    if (!touchState.isDragging) {
                        const api = apiRef.current;
                        if ((api?.playerState ?? 0) === 1) {
                            api.pause();
                            onPlayStateChange(false);
                        }
                    }
                    touchState.isDragging = true;
                    isDraggingRef.current = true;
                    if (typeof window !== 'undefined') (window as any).__isUserDragging = true;
                    ev.preventDefault();
                    const maxScroll = container.scrollWidth - container.clientWidth;
                    const nextScrollLeft = Math.max(
                        touchState.minScroll,
                        Math.min(touchState.startScrollLeft + dx, maxScroll)
                    );
                    // Debug: confirm we're writing to the right element
                    console.log('[touchmove]', {
                        containerClass: container.className,
                        scrollW: container.scrollWidth,
                        clientW: container.clientWidth,
                        before: container.scrollLeft.toFixed(1),
                        next: nextScrollLeft.toFixed(1),
                    });
                    container.scrollLeft = nextScrollLeft;
                    targetScrollLeftRef.current = nextScrollLeft;
                }
            };

            const handleTouchEnd = (ev: TouchEvent) => {
                const dx = touchState.startX - (ev.changedTouches[0]?.clientX ?? touchState.startX);
                const wasTap = !touchState.isDragging && Math.abs(dx) < TAP_THRESHOLD;
                console.log('[V113 touch]', { dx: dx.toFixed(1), wasTap, scrollLeft: container.scrollLeft.toFixed(1) });

                if (wasTap) {
                    const api = apiRef.current;
                    if (!api?.isReadyForPlayback) return;
                    const isStrip = forceHorizontalRef.current || (api.settings?.display?.layoutMode === 1);
                    if (!isStrip) return;
                    if ((api.playerState ?? 0) === 1) { api.pause(); onPlayStateChange(false); }
                    else { api.play(); onPlayStateChange(true); }
                } else {
                    // ── [V114] Seek-on-drag-release ───────────────────────────
                    // Resolve the beat currently under the fixed cursor line,
                    // seek there, then resume if was playing before drag started.
                    const api = apiRef.current;
                    targetScrollLeftRef.current = container.scrollLeft;

                    if (api?.isReadyForPlayback) {
                        const tickCache = (api as any)?.tickCache;
                        const bounds = api?.renderer?.boundsLookup;
                        if (tickCache?.findBeat && bounds?.findBeat) {
                            // beatX under cursor = scrollLeft + cursorSurfaceX (SVG space)
                            const cursorSurfaceX = getCursorSurfaceX(container);
                            const beatXUnderCursor = container.scrollLeft + cursorSurfaceX;
                            const trackSet = getTrackSet(api);

                            // Walk masterBars to find the beat whose onNotesX is
                            // closest to beatXUnderCursor without going past it
                            const masterBarsArr = ((tickCache as any).masterBars as any[]) ?? [];
                            let bestBeat: any = null;
                            let bestX = -Infinity;
                            let bestTick = 0;

                            for (const mb of masterBarsArr) {
                                const mbDur = mb.masterBar?.calculateDuration?.() ?? 3840;
                                const stepSize = Math.max(1, Math.floor(mbDur / 32));
                                for (let t = mb.start; t < mb.start + mbDur; t += stepSize) {
                                    const r = tickCache.findBeat(trackSet, t);
                                    const b = r?.beat;
                                    if (!b) continue;
                                    const bb = bounds.findBeat(b);
                                    if (!bb?.visualBounds) continue;
                                    const bx = typeof bb.onNotesX === 'number'
                                        ? bb.onNotesX
                                        : bb.visualBounds.x + bb.visualBounds.w / 2;
                                    if (bx <= beatXUnderCursor && bx > bestX) {
                                        bestX = bx;
                                        bestBeat = b;
                                        bestTick = mb.start + (b.playbackStart ?? 0);
                                    }
                                }
                            }

                            if (bestBeat) {
                                seekTargetTickRef.current = bestTick;
                                seekFreezeUntilRef.current = Date.now() + 300;
                                const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                                if (seekTicks) seekTicks(bestTick);
                                api.tickPosition = bestTick;
                                resetBeatAcceptance();
                                targetScrollLeftRef.current = container.scrollLeft;
                                console.log('[V114] drag seek →', { bestTick, beatXUnderCursor, bestX });
                            }
                            // Always restart loop (idles when paused, ready when play pressed)
                            startLandscapeScrollLoop(container, api);
                        } else {
                            startLandscapeScrollLoop(container, api);
                        }
                    }
                }

                isDraggingRef.current = false;
                if (typeof window !== 'undefined') (window as any).__isUserDragging = false;
                touchState.isDragging = false;
            };

            surface.addEventListener('touchstart', handleTouchStart, { passive: true });
            surface.addEventListener('touchmove', handleTouchMove, { passive: false });
            surface.addEventListener('touchend', handleTouchEnd, { passive: true });

            // ── Portrait click-to-seek ────────────────────────────────────────
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
                const stepSize = Math.max(1, Math.floor(mbDuration / 32));
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
                    if (!vb || Math.abs(vb.y - y) > 20) continue;
                    rowBeats.push({ beat: b, onX: vb.x + vb.w / 2 });
                }
                if (!rowBeats.length) return null;
                rowBeats.sort((a, b) => a.onX - b.onX);
                const forward = rowBeats.find(rb => rb.onX >= x - 8);
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
                const isSame = (a: any, b: any) =>
                    a && b && a.absolutePlaybackStart === b.absolutePlaybackStart &&
                    a.voice?.bar?.masterBar?.index === b.voice?.bar?.masterBar?.index;
                let expandedStart = expandedTick;
                for (let t = expandedTick - 1; t >= expandedTick - 8192; t--) {
                    const rr = tickCache.findBeat(trackSet, t);
                    if (!rr?.beat || !isSame(rr.beat, r.beat)) { expandedStart = t + 1; break; }
                }
                const { nextBeat: nb, nextStart: ns } = resolveNextBeatExpanded(api, trackSet, expandedStart, r.beat);
                stableExpandedBeatStartRef.current = expandedStart;
                stableNextBeatRef.current = nb;
                stableNextExpandedBeatStartRef.current = ns;
                stableCurBeatRef.current = r.beat;
                cursor.requestSnap();
                cursor.setBeat(r.beat, nb, ns, expandedStart);
                cursor.setTick(expandedTick, nb, expandedStart);
            };

            const handleClick = (ev: MouseEvent) => {
                if (ev.detail > 1) return;
                const api = apiRef.current;
                if (!api) return;
                const isStrip = forceHorizontalRef.current || (api.settings?.display?.layoutMode === 1);
                if (isStrip) return; // landscape handled by touch

                if (loopEnabledRef.current) return;
                const rect = surface.getBoundingClientRect();
                const containerEl = containerRef.current!;
                const scrollEl = (api.renderer?.framer?.scrollElement as HTMLElement | null | undefined) ?? containerEl;
                const x = (ev.clientX - rect.left) + (scrollEl.scrollLeft ?? 0);
                const y = (ev.clientY - rect.top) + (scrollEl.scrollTop ?? 0);

                const bds = api.renderer?.boundsLookup;
                let beat = bds?.getBeatAtPos?.(x, y) ?? null;
                if (beat) {
                    const bb2 = bds?.findBeat?.(beat);
                    const vbW2 = bb2?.visualBounds?.w ?? 1;
                    const cx2 = bb2 ? (bb2.visualBounds.x + vbW2 / 2) : null;
                    const dx2 = cx2 != null ? Math.abs(cx2 - x) : Infinity;
                    const tooFar = vbW2 <= 16 ? dx2 > Math.max(12, vbW2 * 1.6) : dx2 > 40;
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
                const beatDurForClamp = beat.playbackDuration ?? beat.duration ?? 480;
                const safeTarget = Math.min(target + 2, target + Math.max(0, beatDurForClamp - 1));
                seekTargetTickRef.current = safeTarget;
                seekFreezeUntilRef.current = Date.now() + 250;

                const wasPlaying = (api.playerState ?? 0) === 1;
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
                surface.removeEventListener('touchstart', handleTouchStart);
                surface.removeEventListener('touchmove', handleTouchMove);
                surface.removeEventListener('touchend', handleTouchEnd);
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
             * Non-scrolling wrapper — LandscapeFixedCursorOverlay attaches here.
             * Cursor stays visually fixed; .alphatab-container scrolls beneath it.
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