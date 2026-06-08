'use client';

/**
 * AlphaTabRenderer.tsx
 * Current version: V126
 * Date: June 8th, 2026
 * Loop/Cursor sprint locked — see V120 LOOP/CURSOR LOCKS section.
 *
 * V126 LOCKS (portrait touch-seek interference fix):
 * ✅ [PortraitTouchEndGuard] handleTouchEnd else-branch (drag-seek) is now
 *         gated on isStripEnd (landscape/strip mode only), matching handleTouchStart
 *         and handleTouchMove. In portrait, handleTouchStart returns early so
 *         touchState.startX stays 0 → dx = -clientX (always large) → wasTap = false
 *         → else-branch ran on every portrait touchend → seeked to tick 0 →
 *         poisoned seekTargetTickRef 300ms before BeatCustomLoopOverlay's
 *         synthesized mousedown. Fix: wrap seek block in if (isStripEnd).
 *         Cleanup lines (isDraggingRef, __isUserDragging, touchState.isDragging)
 *         remain unconditional. Do not remove.
 *
 * V125 LOCKS (mobile loop tap cursor fix):
 * ✅ [LoopClickSeekFreeze] __maestroManualSeekTargetTick global bridge.
 *         BeatCustomLoopOverlay commitBarSnap (click path) sets target tick.
 *         AlphaTabRenderer playerPositionChanged consumes it on the first event,
 *         updates seekTargetTickRef, and resets seekFreezeUntilRef to a fresh
 *         300ms window. Fixes mobile loop tap cursor park blocked by stale
 *         seekTargetTickRef=0 from prior touch-seek freeze. AlphaTab's internal
 *         api.playbackRange startTick-seek is also correctly filtered
 *         (|7681-8160|=479 > FAR_TICKS=240). Do not remove.
 *
 * V124 LOCKS (orientation rotation fixes confirmed):
 * ✅ [OrientationPrimeSnap] snapPortraitToBeatRow() — one-shot S1 vertical
 *     snap after strip-to-page renderFinished. Called from
 *     ensureCursorAndAnchorOnce after setBeat/setTick. Fixes Landscape scroll
 *     → Portrait page anchor mismatch (scrollTop stayed at 0 while cursor
 *     was correctly primed to the live tick). Do not remove.
 *
 * ✅ [CursorBeatOrdering] lastBeatX/lastBeatY added to MaestroCursor2.
 *     Separates beat ordering guard from _applyTransform animation floor-clamp.
 *     Fixes active-playback Landscape → Portrait cursor barline pause caused
 *     by setTick LERP advancing lastX past same-row note-heads after prime.
 *     Do not remove.
 *
 * V123 DIAGNOSTIC (probes confirmed, ORIENTATION_ANCHOR_DEBUG now false):
 * 🔍 [orientation-anchor-probe] Landscape scroll → Portrait anchor diagnostic.
 *     Probes: landscape-scroll, orientation-change, portrait-s1-snap,
 *     orientation-cursor-probe (song-load, loop-play-start).
 *     lastLandscapeVisibleBarRef: diagnostic ref only — not wired to behavior.
 *
 * V123.1 DIAGNOSTIC PATCH:
 * 🔍 [orientation-bar-shape-probe] Multi-path mbb resolver for mostVisibleBarIdx.
 *     Fires (throttled 1s) only when all paths return null — reveals actual AlphaTab
 *     bar bounds object shape so the correct property path can be hard-coded.
 *     barIdxResolved field added to landscape-scroll probe for at-a-glance status.
 * 🔍 [orientation-s1-gap-probe] Confirms that setBeat/setTick inside
 *     ensureCursorAndAnchorOnce do NOT trigger playerPositionChanged — S1 vertical
 *     snap will not fire after strip-to-page. currentScrollTop vs expectedAnchorIdx
 *     will quantify the gap.
 *
 * V120 LOOP/CURSOR LOCKS:
 * 🔒 [LoopClick] Click-to-move is Songsterr-style: loop snaps bar-to-bar but
 *         cursor parks at clickedTick. Do not force cursor back to barStartTick.
 *         Toggle ON remains the exception: still reseats to startTick.
 *
 * 🔒 [LoopPlayStart] Play-start primes to live api.playbackRange.startTick
 *         immediately before api.play(). Prevents cursor catch-up delay after
 *         click-to-move parks cursor inside the loop range.
 *
 * 🔒 [LoopLeadIn] loop-play-start preserves tied/slide lead-in beats at the
 *         loop boundary. Do not replace the protected start beat with the first
 *         visible/fresh attack during loop-play-start reseat.
 *
 * 🔒 [LoopReseatReasonBridge] activeLoopReseatReasonRef and
 *         loopPlayStartPreserveAbsRef preserve the original reseat reason/beat
 *         after window.__maestroLoopReseat is cleared by the reseat guard.
 *         Required: AlphaTab may resolve the same boundary beat across many
 *         cursor passes before playback advances off it.
 *
 * 🔒 [LoopVisibleBeatReplacement] Zero-width/tie → first-visible-attack
 *         replacement is valid for loop-reseat/loop-wrap paths, but must be
 *         skipped while curBeat.absolutePlaybackStart matches
 *         loopPlayStartPreserveAbsRef. Never remove this beat-identity guard.
 *
 * 🔒 [LoopEndXClamp] MaestroCursor2 loopEndX is a visual-only interpolation cap.
 *         It must only be active when the loop end is mid-bar AND on the same
 *         visual row as the current beat. Never apply it to barline-to-barline
 *         endings or intermediate rows — cursor will pause/bounce at row ends.
 *         Guard: sameRow && !loopEndsOnBarline (repeat-safe via tickCache.getBeatStart).
 *
 * ✅ [LoopHighlightClick] Clicking inside existing loop highlight seeks cursor
 *         to clicked beat. Loop range unchanged. Next Play starts from clicked
 *         position (one-shot override via __maestroLoopPlayStartOverrideTick).
 *         Override clears on loop-move and after first Play use; stale values
 *         are range-validated before use.
 *
 * ✅ [LoopOverlayRebuild] BeatCustomLoopOverlay self-heals after renderFinished/
 *         resize/track switch via rescue useEffect: if loopEnabled && rects empty
 *         && api.playbackRange exists, rebuilds rects in double-RAF. Deduplicated
 *         by rescueRafPendingRef. Do not remove this rescue path.
 *
 * V119 LOCKS:
 * 🔒 [TH] AlphaTab score palette — applied via api.settings.display.resources on theme change.
 *         Gated on !isSettling. lastThemeRef dedupes + resets to null on score reload.
 *         6 resources: staffLine, barSeparator, mainGlyph, secondaryGlyph, scoreInfo, barNumber.
 *         Dark values from V94.6 confirmed-stable probe. api.render() follows updateSettings().
 * 🔒 [colorPatch] Title/artist brand colors survive every render including theme-triggered ones.
 *         Fill guard removed — after dark palette, AT sets real white fill (null guard was blocking).
 *         Guards kept: font.includes('32px') + text-anchor=middle → #38bdf8 (title).
 *                      font.includes('20px') + text-anchor=middle → #60a5fa (artist).
 * 🔒 [page.tsx TH3] #maestro-player wrapper is theme-aware: bg-[#1a1a1a] dark / bg-white light.
 *         Safe now that alphaTab palette is active — no more black-on-black regression risk.
 * 🔒 [TH-notationFix] notation.elements re-suppressed before updateSettings() in applyThemePalette.
 *         api.updateSettings() resets the notation.elements Map to AlphaTab defaults,
 *         re-enabling the TAB clef on every system + shifting bar-1 right of the clef.
 *         Same blanket-false forEach as initAlphaTab, applied pre-updateSettings each palette call.
 * 🔒 [Stage 1 cleanup] Production console noise reduced.
 *         colorPatch logs removed — patch confirmed locked, no longer needs A/B proof.
 *         Routine dev logs gated behind isRendererDebugEnabled() (localStorage maestro_renderer_debug).
 *         Gated: curtain dropped, [profile] ×2, external handler attach, [TH] palette applied.
 *         All warn/error/recovery logs preserved unconditionally.
 *
 * V118 LOCKS (carried forward):
 * 🔒 [S1] Portrait/page mode = ScrollMode.Off. S1 owns all vertical row snapping.
 *         AlphaTab VerticalContinuousScrollHandler confirmed as the scroll thief
 *         (stack trace: doScroll → BrowserUiFacade.scrollToY → scrollTo smooth).
 *         Disabling Continuous eliminates drift entirely (verified: drift=0 at 60ms+200ms).
 * 🔒 [S1] Horizontal/strip mode = ScrollMode.Continuous (unchanged — native AlphaTab).
 * 🔒 [S1] ABS row-boundary snap: DOM SVG rects, scrollRect.top subtracted for
 *         scroll-container coords, height>100 && width>500 filter, anchorIdx=0→top=0.
 * 🔒 [S1] Previous-row ABS clearance: prevBottomAbs vs safeTopAbsAfterTarget prediction.
 * 🔒 [S1] easeOutCubic RAF tween 150ms — natural slide feel, no native smooth-scroll.
 *         Cancels if new anchorIdx arrives mid-tween. Final frame forces scrollTop=target.
 *         s1AnimRafRef cancelled on unmount.
 * 🔒 [S1] All diagnostic logs gated behind maestro_snap_debug — zero production noise.
 *         scrollTo interceptor removed. Unconditional FINAL APPLY log removed.
 *
 * ✅ [F1] Unified isLandscape() helper — 40px hysteresis, matches resize stabilizer.
 * ✅ [F3] reassertLayout clears stale isApplyingProfileRef/activeRendersRef before
 *         executing a confirmed orientation flip (landscape→portrait stuck fix).
 * ✅ [F4] renderFinished: post-render collapse → hardReset() instead of api.render()
 *         retry. AlphaTab geometry corrupts on live LayoutMode switch (Daniel confirmed);
 *         only full instance recreation is reliable.
 *
 * V115 ADDS:
 * ✅ [P1] playerMode / externalMediaHandler props on AlphaTabRendererV102Props
 * ✅ [P2] Destructured with safe defaults (playerMode = 'synthesizer')
 * ✅ [P3] playerModeRef / externalMediaHandlerRef synced via useEffect
 * ✅ [P4] initAlphaTab now receives playerModeRef.current (not hardcoded 'synthesizer')
 * ✅ [P5] Handler attached inside playerReady — earliest point player.output exists
 * ✅ [P6] useEffect syncs handler when prop changes after init (guards external-only)
 * ✅ [P7] useEffect switches PlayerMode enum when playerMode prop changes
 *
 * 🔒 V114-clean PRESERVED EXACTLY (all locks carry forward):
 *   ✅ [L17] Touch drag minScroll: computed from beat1X - cursorSurfaceX on touchstart.
 *   ✅ [L16] isDraggingRef: RAF loop yields to touch drag.
 *   ✅ [L15] translateX(-50%) on overlay: line centered on cursorBoxX.
 *   ✅ [L14] CURSOR_BIAS_PX = 0: probe confirmed onNotesX = vbCenter = 120.001.
 *   ✅ [L13] prime-on-play via playerStateChanged
 *   ✅ [L11] state prime after curtain drop
 *   ✅ [L10] RAF self-heal in playerPositionChanged
 *   ✅ [L9]  getFixedCursorX / getCursorSurfaceX coordinate helpers
 *   ✅ [L8-fix] landscapeInitialAnchor retry-until-ready
 *   ✅ [L7-fix] within-beat interpolation (curBeatX → nextBeatX)
 *   ✅ [L1-fix] overlay on non-scrolling wrapper
 *   ✅ Portrait MaestroCursor V1 engine — unchanged
 *   ✅ All V112/V111/V110/V109/V108 preserved locks
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
import { attachMaestroCursorV2, MaestroCursorV2 } from '@/components/alphaTab/MaestroCursor2';
import { FixedLandscapeCursor } from '@/components/alphaTab/FixedLandscapeCursor';
import BeatCustomLoopOverlay from '@/components/alphaTab/BeatCustomLoopOverlay';
import { runGp8LayoutEngineV2 } from '@/lib/alphaTab/gp8LayoutEngineV2';
import { runGp8ChordOverlay, type Gp8ChordOverlayHandle } from '@/lib/alphaTab/gp8ChordOverlay';
import { runGp8ChordSuppression } from '@/lib/alphaTab/gp8ChordSuppression';
import { runGp8OverlaySuppression } from '@/lib/alphaTab/gp8OverlaySuppression';
import { runGp8OverlayLanes, type Gp8OverlayLaneHandle } from '@/lib/alphaTab/gp8OverlayLanes';
import { runGp8PmOverlay, type Gp8PmOverlayHandle } from '@/lib/alphaTab/gp8PmOverlay';
import { runGp8PmSuppression } from '@/lib/alphaTab/gp8PmSuppression';
import { runGp8VibratoOverlay, type Gp8VibratoOverlayHandle } from '@/lib/alphaTab/gp8VibratoOverlay';
import { runGp8VibratoSuppression } from '@/lib/alphaTab/gp8VibratoSuppression';
import { runUniversalLayoutPatches } from '@/lib/alphaTab/universalLayoutPatches';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';
import { runAlphaTabLyricsOverlay, type AlphaTabLyricsOverlayHandle } from '@/lib/alphaTab/alphaTabLyricsOverlay';

// ─── [P1] Props interface ─────────────────────────────────────────────────────
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
    playerMode?: 'disabled' | 'external' | 'synthesizer';
    externalMediaHandler?: any;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CURSOR_POSITION_RATIO = 0.144;
const CURSOR_BIAS_PX = 0;
const SCROLL_EASE = 0.18;
const MOBILE_LANDSCAPE_MAX_W = 900;
const HARD_RESET_COOLDOWN_MS = 4000;
// [orientation-anchor-probe] V123 diagnostic flag — probes confirmed, silenced for V124
const ORIENTATION_ANCHOR_DEBUG = false;
// [loop-click-reseat-probe] Diagnostic flag — set false to silence after root cause confirmed
const LOOP_CLICK_RESEAT_DEBUG = true;
const SCORE_TITLE_CYAN = '#38bdf8';   // [colorPatch] A/B — brighter cyan score title
const SCORE_ARTIST_BLUE = '#60a5fa';  // [colorPatch] A/B — artist/subtitle blue

// ── [F1] Unified orientation helper — 40px hysteresis ────────────────────────
function isDeviceLandscape(): boolean {
    const vvW = window.visualViewport?.width ?? window.innerWidth;
    const vvH = window.visualViewport?.height ?? window.innerHeight;
    const mqLandscape = window.matchMedia?.('(orientation: landscape)')?.matches ?? false;
    return (vvW > vvH + 40) || mqLandscape;
}

// ── [L9] Padding-aware cursor helpers ────────────────────────────────────────
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

type LandscapeFixedCursorOverlay = FixedLandscapeCursor;

type MaestroCursorLike = {
    element: HTMLElement;
    destroy: () => void;
    requestSnap: (reason?: string) => void;
    setBeat: (
        beat: any | null,
        preScannedNextBeat?: any | null,
        nextExpandedBeatStart?: number | null,
        expandedBeatStart?: number | null,
    ) => void;
    setLoopEndX: (x: number | null) => void;
    setTick: (
        tick: number,
        nextBeat?: any | null,
        overrideBeatStart?: number | null,
    ) => void;
};

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
            else console.warn('⚠️ V117 landscapeInitialAnchor: timed out');
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

// ── [S1] Snap debug — activate: localStorage.setItem('maestro_snap_debug','1') ──
function isSnapDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).get('snapDebug') === '1') return true;
    try { return localStorage.getItem('maestro_snap_debug') === '1'; } catch { return false; }
}

// ── Renderer debug — activate: localStorage.setItem('maestro_renderer_debug','1') ──
function isRendererDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('maestro_renderer_debug') === '1'; } catch { return false; }
}

// ── [S1] Portrait system-snap helper ─────────────────────────────────────────
// Returns the index of the staff system that contains pixel-y `y`.
function findSystemIndexForY(systems: any[], y: number): number {
    for (let i = 0; i < systems.length; i++) {
        const vb = systems[i]?.visualBounds;
        if (vb && y >= vb.y && y < vb.y + vb.h) return i;
    }
    return -1;
}

// ── Redundant rest suppression (tick-collision strategy) ─────────────────────
const ENABLE_REDUNDANT_REST_STRIP = false;

function stripRedundantRests(score: any): void {
    try {
        for (const track of score?.tracks ?? []) {
            for (const staff of track?.staves ?? []) {
                for (const bar of staff?.bars ?? []) {
                    const voices: any[] = bar?.voices ?? [];
                    if (!voices.length) continue;
                    const noteStarts = new Set<number>();
                    let barHasAnyNotes = false;
                    for (const v of voices) {
                        for (const b of (v?.beats ?? [])) {
                            if ((b?.notes?.length ?? 0) > 0) {
                                barHasAnyNotes = true;
                                const s: number = b.start ?? b.playbackStart ?? b.absolutePlaybackStart ?? 0;
                                noteStarts.add(s);
                            }
                        }
                    }
                    if (!barHasAnyNotes) continue;
                    for (const v of voices) {
                        const beats: any[] = v?.beats ?? [];
                        if (!beats.length) continue;
                        v.beats = beats.filter((b: any) => {
                            if ((b?.notes?.length ?? 0) > 0) return true;
                            if (b?.isRest) {
                                const s: number = b.start ?? b.playbackStart ?? b.absolutePlaybackStart ?? 0;
                                if (noteStarts.has(s)) return false;
                            }
                            return true;
                        });
                    }
                }
            }
        }
        console.log('[rests] stripRedundantRests applied');
    } catch (e) {
        console.warn('[rests] stripRedundantRests failed (non-fatal):', e);
    }
}

function isGp8Url(fileUrl: string): boolean {
    const u = (fileUrl ?? '').toLowerCase();
    return (
        u.includes('.gp8') ||
        u.endsWith('.gp') ||
        u.includes('.gp?') ||
        u.includes('.gp&') ||
        /[?&](filename|file|name)=([^&]+)\.gp8?($|&)/.test(u)
    );
}

// ─── [P2] Component ───────────────────────────────────────────────────────────
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
    playerMode = 'synthesizer',
    externalMediaHandler,
}: AlphaTabRendererV102Props) {

    const containerRef = useRef<HTMLDivElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);
    const curtainRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const cursorRef = useRef<MaestroCursorLike | null>(null);
    const landscapeCursorRef = useRef<LandscapeFixedCursorOverlay | null>(null);
    const gp8OverlayHandleRef = useRef<Gp8OverlayLaneHandle | null>(null);
    const gp8PmOverlayHandleRef = useRef<Gp8PmOverlayHandle | null>(null);
    const gp8ChordOverlayHandleRef = useRef<Gp8ChordOverlayHandle | null>(null);
    const gp8VibratoOverlayHandleRef = useRef<Gp8VibratoOverlayHandle | null>(null);
    const lyricsOverlayHandleRef = useRef<AlphaTabLyricsOverlayHandle | null>(null);

    const targetScrollLeftRef = useRef<number>(0);
    const landscapeScrollRafRef = useRef<number | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const trackHasLyricsRef = useRef<boolean>(false);

    const landscapeScrollStateRef = useRef<{
        curBeatX: number;
        nextBeatX: number;
        beatStart: number;
        beatDur: number;
        lastTick: number;
    } | null>(null);

    const initTokenRef = useRef(0);
    const scoreBytesRef = useRef<Uint8Array | null>(null);
    const lastHardResetAtRef = useRef<number>(0);
    const trackIndicesRef = useRef(trackIndices);
    useEffect(() => { trackIndicesRef.current = trackIndices; }, [trackIndices]);
    useEffect(() => { scoreBytesRef.current = null; }, [fileUrl]);

    const forceHorizontalRef = useRef<boolean>(!!forceHorizontal);

    const playerModeRef = useRef(playerMode);
    const externalMediaHandlerRef = useRef(externalMediaHandler);
    const lastThemeRef = useRef<'light' | 'dark' | null>(null); // [TH] tracks last applied palette
    useEffect(() => { playerModeRef.current = playerMode; }, [playerMode]);
    useEffect(() => { externalMediaHandlerRef.current = externalMediaHandler; }, [externalMediaHandler]);

    const alphaTabModuleRef = useRef<any>(null);
    const activeProfileRef = useRef<LayoutProfileName | null>(null);
    const baseTrackProfileRef = useRef<LayoutProfileName | null>(null);
    const isApplyingProfileRef = useRef(false);
    const lastWantStripRef = useRef<boolean | null>(null);

    const reassertRafRef = useRef<number | null>(null);
    const lastReassertTokenRef = useRef<number | null>(null);
    const collapseFixAttemptsRef = useRef(0);
    const isRecoveringCollapseRef = useRef(false);
    const isHardResettingRef = useRef(false);
    const stabilizeRafRef = useRef<number | null>(null);
    const stableFramesRef = useRef(0);
    const lastStableWRef = useRef(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isSettling, setIsSettling] = useState(true);
    const [resetKey, setResetKey] = useState(0);
    const [showGutters, setShowGutters] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 768 : true
    );

    useEffect(() => {
        const update = () => setShowGutters(window.innerWidth >= 768);
        window.addEventListener('resize', update);
        window.visualViewport?.addEventListener('resize', update);
        return () => {
            window.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('resize', update);
        };
    }, []);

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
    const lastAnchorSysRef = useRef<number>(-1);
    // [S1] RAF handle for the portrait scroll tween — cancelled on new snap or user scroll.
    const s1AnimRafRef = useRef<number | null>(null);
    // ── [orientation-anchor-probe] Diagnostic refs — V123, remove after diagnosis ──
    const lastLandscapeVisibleBarRef = useRef<{
        barIdx: number;
        startTick: number;
        at: number;
        scrollLeft: number;
    } | null>(null);
    const landscapeScrollProbeRafRef = useRef<number | null>(null);
    // [reseat-bar-gate] Bar index floor set on loop reseat — rejects pre-bar continuation beats.
    const reseatMinBarIdxRef = useRef<number | null>(null);
    const reseatMinBarUntilRef = useRef<number>(0);
    // [LoopReseatReasonBridge] — do not remove these two refs together.
    // loop-play-start reason is cleared from window.__maestroLoopReseat before the
    // visible-beat resolver runs. These refs bridge the reason and protected boundary
    // beat across repeated AlphaTab cursor passes at the same absolutePlaybackStart.
    const activeLoopReseatReasonRef = useRef<string | null>(null);
    const loopPlayStartPreserveAbsRef = useRef<number | null>(null);

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

        // ── [orientation-anchor-probe] Landscape scroll listener — diagnostic only ──
        if (ORIENTATION_ANCHOR_DEBUG && !(container as any).__orientationScrollProbeAttached) {
            (container as any).__orientationScrollProbeAttached = true;
            container.addEventListener('scroll', () => {
                if (landscapeScrollProbeRafRef.current !== null) return;
                landscapeScrollProbeRafRef.current = requestAnimationFrame(() => {
                    landscapeScrollProbeRafRef.current = null;
                    const scrollLeft = container.scrollLeft;
                    const containerW = container.clientWidth;
                    const surface = container.querySelector('.at-surface') as HTMLElement | null;
                    const surfaceW = surface?.scrollWidth ?? 0;
                    const apiTickPosition = (api as any)?.tickPosition ?? null;
                    const isPlaying = isPlayingRef?.current ?? null;

                    let mostVisibleBarIdx: number | null = null;
                    let mostVisibleBarStartTick: number | null = null;
                    let mostVisibleBarX: number | null = null;
                    let mostVisibleBarW: number | null = null;
                    try {
                        const systems = (api as any)?.renderer?.boundsLookup?.staffSystems ?? [];
                        let bestOverlap = -1;
                        const viewL = scrollLeft;
                        const viewR = scrollLeft + containerW;
                        for (const sys of systems) {
                            for (const mbb of ((sys as any)?.bars ?? [])) {
                                const vb = (mbb as any)?.visualBounds;
                                if (!vb) continue;
                                const barL = vb.x;
                                const barR = vb.x + vb.w;
                                const overlap = Math.max(0, Math.min(barR, viewR) - Math.max(barL, viewL));
                                if (overlap > bestOverlap) {
                                    bestOverlap = overlap;
                                    // Try all plausible AlphaTab bar bounds object shapes
                                    const resolvedIdx =
                                        (mbb as any)?.masterBar?.index ??
                                        (mbb as any)?.bar?.masterBar?.index ??
                                        (mbb as any)?.bar?.index ??
                                        (mbb as any)?.masterBarBounds?.masterBar?.index ??
                                        (mbb as any)?.index ??
                                        null;
                                    mostVisibleBarIdx = resolvedIdx;
                                    mostVisibleBarX = vb.x;
                                    mostVisibleBarW = vb.w;

                                    if (resolvedIdx === null) {
                                        const now = Date.now();
                                        const lastShapeLog = (container as any).__lastBarShapeLogAt ?? 0;
                                        if (now - lastShapeLog > 1000) {
                                            (container as any).__lastBarShapeLogAt = now;
                                            console.log('[orientation-bar-shape-probe]', {
                                                keys: Object.keys(mbb ?? {}),
                                                masterBarIndex: (mbb as any)?.masterBar?.index ?? null,
                                                barIndex: (mbb as any)?.bar?.index ?? null,
                                                barMasterBarIndex: (mbb as any)?.bar?.masterBar?.index ?? null,
                                                masterBarBoundsIndex: (mbb as any)?.masterBarBounds?.masterBar?.index ?? null,
                                                index: (mbb as any)?.index ?? null,
                                                visualBounds: vb,
                                            });
                                        }
                                    }

                                    try {
                                        const mbArr = ((api as any).tickCache as any)?.masterBars ?? [];
                                        const match = mbArr.find((mb: any) => mb?.masterBar?.index === mostVisibleBarIdx);
                                        mostVisibleBarStartTick = match?.start ?? null;
                                    } catch { mostVisibleBarStartTick = null; }
                                }
                            }
                        }
                    } catch { /* non-fatal */ }

                    if (mostVisibleBarIdx != null) {
                        lastLandscapeVisibleBarRef.current = {
                            barIdx: mostVisibleBarIdx,
                            startTick: mostVisibleBarStartTick ?? 0,
                            at: Date.now(),
                            scrollLeft,
                        };
                    }

                    console.log('[orientation-anchor-probe]', {
                        reason: 'landscape-scroll',
                        scrollLeft,
                        containerW,
                        surfaceW,
                        apiTickPosition,
                        isPlaying,
                        mostVisibleBarIdx,
                        mostVisibleBarStartTick,
                        mostVisibleBarX,
                        mostVisibleBarW,
                        barIdxResolved: mostVisibleBarIdx !== null,
                    });
                });
            }, { passive: true });
        }

        const cursorSurfaceX = getCursorSurfaceX(container);

        const loop = () => {
            const nativeBeat = container.querySelector('.at-cursor-beat') as HTMLElement | null;
            if (nativeBeat && nativeBeat.style.display !== 'none') {
                nativeBeat.style.display = 'none';
                nativeBeat.style.opacity = '0';
            }
            if (isDraggingRef.current) {
                landscapeScrollRafRef.current = requestAnimationFrame(loop);
                return;
            }
            if ((api as any)?.playerState !== 1) {
                targetScrollLeftRef.current = container.scrollLeft;
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
        }
    }, []);

    // ── [S1-prime] One-shot S1 portrait snap — called after orientation change ──
    // setBeat/setTick do NOT fire playerPositionChanged, so S1 never auto-fires
    // after strip-to-page. This helper runs the same math and tween so the page
    // lands at the correct row immediately after cursor prime.
    const snapPortraitToBeatRow = useCallback((reason: string, beat: any): void => {
        const api = apiRef.current;
        if (!api) return;

        // Mirror playerPositionChanged isStripMode guard — skip in landscape/strip
        const isStripMode = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
        if (isStripMode) return;

        const snapBounds = api.renderer?.boundsLookup;
        const snapSystems = snapBounds?.staffSystems ?? [];
        const snapBb = snapBounds?.findBeat?.(beat);
        const beatY = snapBb?.visualBounds?.y;
        if (beatY == null || snapSystems.length === 0) return;

        const sysIdx = findSystemIndexForY(snapSystems, beatY);
        if (sysIdx < 0) return;
        const anchorIdx = Math.max(0, sysIdx - 1);

        // Always update lastAnchorSysRef — prevents next playerPositionChanged from
        // double-firing or skipping the snap for the same row.
        lastAnchorSysRef.current = anchorIdx;

        const scrollEl = (api.settings.player as any).scrollElement
            ?? scrollContainer
            ?? containerRef.current;
        if (!scrollEl) return;

        const scrollElEl = scrollEl as HTMLElement;
        const header = document.querySelector('[data-top-menu-tray]') as HTMLElement | null;
        const isPlayingNow = (api.playerState ?? 0) === 1;
        const headerH = (!isPlayingNow && header && getComputedStyle(header).display !== 'none')
            ? header.getBoundingClientRect().height : 0;
        const GAP = 8;
        const maxScroll = Math.max(0, scrollElEl.scrollHeight - scrollElEl.clientHeight);
        const scrollRect = scrollElEl.getBoundingClientRect();

        const allSvgs = Array.from(scrollElEl.querySelectorAll<SVGElement>('.at-surface svg'));
        const staffRows = allSvgs.filter(el => {
            const r = el.getBoundingClientRect();
            return r.height > 100 && r.width > 500;
        });

        let target: number;
        if (anchorIdx === 0) {
            target = 0;
        } else if (staffRows.length > anchorIdx) {
            const rowRect = staffRows[anchorIdx].getBoundingClientRect();
            target = Math.max(0, scrollElEl.scrollTop + rowRect.top - scrollRect.top - headerH - GAP);
        } else {
            const anchorVb = (snapSystems[anchorIdx] as any)?.visualBounds;
            target = Math.max(0, (anchorVb?.y ?? 0) - headerH - GAP);
        }

        const currentVb = (snapSystems[sysIdx] as any)?.visualBounds;
        const currentTop = currentVb?.y ?? 0;
        target = Math.min(target, Math.max(0, currentTop - headerH - GAP));

        // Previous-row clearance — same absolute-coordinate prediction as S1
        {
            const safeOffset = headerH + GAP;
            const prevRow = anchorIdx > 0 ? (staffRows[anchorIdx - 1] ?? null) : null;
            if (prevRow) {
                const prevRect = prevRow.getBoundingClientRect();
                const prevBottomAbs = scrollElEl.scrollTop + (prevRect.bottom - scrollRect.top);
                const safeTopAbsAfterTarget = target + safeOffset;
                const danglingAfterTarget = prevBottomAbs - safeTopAbsAfterTarget;
                if (danglingAfterTarget > 0.5) {
                    target = Math.max(0, target + danglingAfterTarget + 3);
                }
            }
        }

        target = Math.min(target, maxScroll);

        if (ORIENTATION_ANCHOR_DEBUG) {
            console.log('[orientation-s1-prime-snap]', {
                reason,
                curBeatAbs: beat?.absolutePlaybackStart ?? null,
                curBeatBarIdx: beat?.voice?.bar?.masterBar?.index ?? null,
                sysIdx,
                anchorIdx,
                fromScroll: Math.round(scrollElEl.scrollTop),
                target: Math.round(target),
                delta: Math.round(target - scrollElEl.scrollTop),
            });
        }

        if (s1AnimRafRef.current !== null) {
            cancelAnimationFrame(s1AnimRafRef.current);
            s1AnimRafRef.current = null;
        }

        const tweenFrom = scrollElEl.scrollTop;
        const tweenTo = target;
        const tweenDelta = tweenTo - tweenFrom;
        const TWEEN_MS = 150;
        const snapAnchor = anchorIdx;

        if (Math.abs(tweenDelta) < 2) {
            scrollElEl.scrollTop = tweenTo;
        } else {
            const startTime = performance.now();
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const step = (now: number) => {
                if (lastAnchorSysRef.current !== snapAnchor) return;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / TWEEN_MS, 1);
                scrollElEl.scrollTop = tweenFrom + tweenDelta * easeOutCubic(progress);
                if (progress < 1) {
                    s1AnimRafRef.current = requestAnimationFrame(step);
                } else {
                    scrollElEl.scrollTop = tweenTo;
                    s1AnimRafRef.current = null;
                }
            };
            s1AnimRafRef.current = requestAnimationFrame(step);
        }
    }, [scrollContainer]);

    // ── Stuck horizontal strip helper ─────────────────────────────────────────
    const checkStuckHorizontalStrip = useCallback((api: any, el: HTMLElement) => {
        const containerW = el.clientWidth || (window.visualViewport?.width ?? window.innerWidth);
        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        const firstBars = (systems?.[0] as any)?.bars?.length ?? 0;
        const surface = el.querySelector('.at-surface') as HTMLElement | null;
        const surfaceW = surface?.scrollWidth ?? 0;
        const vv = window.visualViewport;
        const viewportW = vv?.width ?? window.innerWidth;
        const viewportH = vv?.height ?? window.innerHeight;
        const isTouchDevice = typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0;
        const isSmallMobileViewport = Math.min(viewportW, viewportH) <= 600;
        const isMobileLandscapeCandidate = isTouchDevice && isSmallMobileViewport && isDeviceLandscape() && containerW < MOBILE_LANDSCAPE_MAX_W;
        const wantStrip = forceHorizontalRef.current || isMobileLandscapeCandidate;
        return {
            stuck: !wantStrip && (firstBars > 40 || surfaceW > containerW * 3),
            wantStrip, firstBars, containerW, surfaceW,
        };
    }, []);

    const hardReset = useCallback(() => {
        if (isHardResettingRef.current) return;
        const now = Date.now();
        if (now - lastHardResetAtRef.current < HARD_RESET_COOLDOWN_MS) {
            console.warn('[V117] hardReset skipped — cooldown active');
            return;
        }
        lastHardResetAtRef.current = now;
        isHardResettingRef.current = true;
        console.warn('[V117] hardReset: destroying wedged AlphaTab instance');
        stopLandscapeScrollLoop();
        landscapeScrollStateRef.current = null;
        if (cursorRef.current) { cursorRef.current.destroy(); cursorRef.current = null; }
        if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
        gp8OverlayHandleRef.current?.destroy(); gp8OverlayHandleRef.current = null;
        gp8PmOverlayHandleRef.current?.destroy(); gp8PmOverlayHandleRef.current = null;
        gp8ChordOverlayHandleRef.current?.destroy(); gp8ChordOverlayHandleRef.current = null;
        gp8VibratoOverlayHandleRef.current?.destroy(); gp8VibratoOverlayHandleRef.current = null;
        lyricsOverlayHandleRef.current?.destroy(); lyricsOverlayHandleRef.current = null;
        if (apiRef.current) { apiRef.current.destroy(); apiRef.current = null; }
        collapseFixAttemptsRef.current = 0;
        lastReassertTokenRef.current = null;
        isRecoveringCollapseRef.current = false;
        showCurtain(curtainRef.current);
        setIsLoading(true);
        setIsSettling(true);
        requestAnimationFrame(() => {
            isHardResettingRef.current = false;
            setResetKey(k => k + 1);
        });
    }, [stopLandscapeScrollLoop]);

    const reassertLayout = useCallback(() => {
        if (reassertRafRef.current != null) cancelAnimationFrame(reassertRafRef.current);
        reassertRafRef.current = requestAnimationFrame(async () => {
            reassertRafRef.current = null;
            const api = apiRef.current;
            const at = alphaTabModuleRef.current;
            const el = containerRef.current;
            if (!api || !at || !el) return;
            if (activeRendersRef.current !== 0) return;
            if (isApplyingProfileRef.current) return;

            const containerW = el.clientWidth || (window.visualViewport?.width ?? window.innerWidth);
            const vv = window.visualViewport;
            const viewportW = vv?.width ?? window.innerWidth;
            const viewportH = vv?.height ?? window.innerHeight;
            const isTouchDevice = typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0;
            const isSmallMobileViewport = Math.min(viewportW, viewportH) <= 600;
            const isMobileLandscapeCandidate = isTouchDevice && isSmallMobileViewport && isDeviceLandscape() && containerW < MOBILE_LANDSCAPE_MAX_W;
            const wantStrip = forceHorizontalRef.current || isMobileLandscapeCandidate;
            const previousWantStrip = lastWantStripRef.current;
            const stripTransition =
                previousWantStrip === true && wantStrip === false ? 'strip-to-page' :
                    previousWantStrip === false && wantStrip === true ? 'page-to-strip' :
                        'none';
            lastWantStripRef.current = wantStrip;
            const wantLayout = wantStrip
                ? (at as any).LayoutMode?.Horizontal
                : (at as any).LayoutMode?.Page;
            if (wantLayout == null) return;

            const currentLayout = api.settings.display.layoutMode;
            const needsFlip = currentLayout !== wantLayout;
            const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
            const firstBars = (systems?.[0] as any)?.bars?.length ?? 0;

            // ── Stuck horizontal strip detection ─────────────────────────────
            // Symptom: wantStrip=false but DOM is still in giant horizontal mode.
            // Indicators: firstBars > 40 OR surface scrollWidth >> containerWidth.
            // This happens when rotation/resize fires before AlphaTab finishes
            // transitioning, leaving a stale landscape strip in page mode.
            const surface = el.querySelector('.at-surface') as HTMLElement | null;
            const surfaceW = surface?.scrollWidth ?? 0;
            const stuckHorizontalStrip =
                !wantStrip &&
                (firstBars > 40 || surfaceW > containerW * 3);

            const looksCollapsed = !wantStrip
                && currentLayout === (at as any).LayoutMode?.Page
                && systems.length === 1
                && firstBars > 40;

            // Log every reassertLayout decision for diagnostics.
            console.warn('[V117] reassertLayout', {
                needsFlip,
                looksCollapsed,
                stuckHorizontalStrip,
                wantStrip,
                forceHorizontal: forceHorizontalRef.current,
                isTouchDevice,
                viewportW,
                viewportH,
                isSmallMobileViewport,
                isMobileLandscapeCandidate,
                previousWantStrip,
                stripTransition,
                isDeviceLandscape: isDeviceLandscape(),
                containerW,
                windowInnerWidth: window.innerWidth,
                windowInnerHeight: window.innerHeight,
                visualViewportWidth: vv?.width,
                visualViewportHeight: vv?.height,
                mobileLandscapeMaxW: MOBILE_LANDSCAPE_MAX_W,
                firstBars,
                surfaceW,
                currentLayout,
            });

            if (!needsFlip && !looksCollapsed && !stuckHorizontalStrip) return;

            // ── Wait for stable container width (2 RAF frames) ────────────────
            // iOS/Chrome viewport dimensions can be unstable during rotation.
            // Firing recovery on an unstable width picks the wrong profile.
            const w1 = el.clientWidth;
            await new Promise<void>(resolve => requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            }));

            // Re-read after settling — bail if another render started.
            if (activeRendersRef.current !== 0) return;
            if (isApplyingProfileRef.current) return;
            const w3 = el.clientWidth;
            if (Math.abs(w3 - w1) > 4) {
                // Width still moving — defer; resize handler will re-trigger.
                console.warn('[V117] reassertLayout deferred — width unstable', { w1, w3 });
                return;
            }

            isApplyingProfileRef.current = false;
            if (activeRendersRef.current > 1) activeRendersRef.current = 0;

            if (stuckHorizontalStrip) {
                // ── Strip-stuck recovery ──────────────────────────────────────
                // Destroy landscape artifacts before forcing page mode.
                console.warn('[V117] stuckHorizontalStrip recovery — forcing Page mode');
                stopLandscapeScrollLoop();
                landscapeScrollStateRef.current = null;
                if (landscapeCursorRef.current) {
                    landscapeCursorRef.current.destroy();
                    landscapeCursorRef.current = null;
                }
                api.settings.display.layoutMode = (at as any).LayoutMode.Page;
                if ((at as any).SystemsLayoutMode) {
                    (api.settings.display as any).systemsLayoutMode =
                        (at as any).SystemsLayoutMode.Automatic;
                }
                await api.updateSettings();
                api.render();
                applyAxisLock(el, api);
                return;
            }

            // ── Normal flip / collapse recovery ──────────────────────────────
            api.settings.display.layoutMode = wantLayout;
            if (!wantStrip && (at as any).SystemsLayoutMode) {
                (api.settings.display as any).systemsLayoutMode =
                    (at as any).SystemsLayoutMode.Automatic;
            }
            await api.updateSettings();
            api.render();
            applyAxisLock(el, api);
            if (!wantStrip) {
                stopLandscapeScrollLoop();
                landscapeScrollStateRef.current = null;
                if (landscapeCursorRef.current) {
                    landscapeCursorRef.current.destroy();
                    landscapeCursorRef.current = null;
                }
            }
        });
    }, [stopLandscapeScrollLoop, checkStuckHorizontalStrip]);

    // ── forceHorizontal transition — pre-clear landscape on strip→page ────────────
    useEffect(() => {
        const previous = forceHorizontalRef.current;
        const next = !!forceHorizontal;
        forceHorizontalRef.current = next;
        if (previous === true && next === false) {
            console.warn('[V117] forceHorizontal strip-to-page preclear');
            stopLandscapeScrollLoop();
            landscapeScrollStateRef.current = null;
            if (landscapeCursorRef.current) {
                landscapeCursorRef.current.destroy();
                landscapeCursorRef.current = null;
            }
            void (async () => {
                const api = apiRef.current;
                const at = alphaTabModuleRef.current;
                const el = containerRef.current;
                if (api && at && el) {
                    api.settings.display.layoutMode = (at as any).LayoutMode.Page;
                    if ((at as any).SystemsLayoutMode) {
                        (api.settings.display as any).systemsLayoutMode =
                            (at as any).SystemsLayoutMode.Automatic;
                    }
                    await api.updateSettings();
                    api.render();
                    applyAxisLock(el, api);
                } else {
                    requestAnimationFrame(() => reassertLayout());
                }
            })();
        }
    }, [forceHorizontal, reassertLayout, stopLandscapeScrollLoop]);

    // ── Scroll mode ownership ─────────────────────────────────────────────────
    // Portrait/page mode: ScrollMode.Off — S1 owns all vertical row snapping.
    //   AlphaTab's VerticalContinuousScrollHandler was confirmed (via stack trace)
    //   to fight S1 with a smooth scrollTo() after each snap, drifting ~20-40px.
    // Landscape/horizontal mode: ScrollMode.Continuous — native AlphaTab scroll
    //   handles the horizontal strip; S1 does not run in this mode.
    const applyScrollMode = useCallback(async (enabled: boolean) => {
        const api = apiRef.current;
        if (!api) return;
        const alphaTab = await import('@coderline/alphatab');
        const isStrip = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
        // Never enable Continuous in portrait — it fights S1. [S1-ownership]
        const useMode = (enabled && isStrip)
            ? (alphaTab as any).ScrollMode.Continuous
            : (alphaTab as any).ScrollMode.Off;
        (api.settings.player as any).scrollMode = useMode;
        await api.updateSettings();
    }, []);

    // ── Main init effect ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        if (apiRef.current) return;
        if (!fileUrl) return;

        let destroyed = false;
        const token = ++initTokenRef.current;

        if (typeof window !== 'undefined') (window as any).__LAST_FILE_URL__ = fileUrl;

        const isGP8 = isGp8Url(fileUrl);

        const init = async () => {
            const container = containerRef.current!;
            await waitForContainerWidth(container);
            if (destroyed || token !== initTokenRef.current) return;

            const alphaTab = await import('@coderline/alphatab');
            alphaTabModuleRef.current = alphaTab;
            if (typeof window !== 'undefined') (window as any).__alphaTab = alphaTab;

            const containerW = containerRef.current?.clientWidth ?? (window.visualViewport?.width ?? window.innerWidth);
            const useHorizontal = forceHorizontal || (isDeviceLandscape() && containerW < MOBILE_LANDSCAPE_MAX_W);
            const base = 'songBookPageDense' as LayoutProfileName;
            const initProfile = resolveProfileByWidth(containerW, base, useHorizontal);
            activeProfileRef.current = initProfile;

            const api = await initAlphaTab({
                container,
                playerMode: playerModeRef.current,
                soundFontPath,
                layoutMode: 'page',
                scrollMode: 'off',
                scrollContainer: scrollContainer ?? undefined,
                layoutProfile: initProfile,
                hasLyrics: false,
            });
            if (destroyed || token !== initTokenRef.current) { api.destroy(); return; }

            apiRef.current = api;
            if (typeof window !== 'undefined') {
                (window as any).__atV115 = api;
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

                if (isRendererDebugEnabled()) console.log('[profile]', { primaryTrackName, trackProfile, forceHorizontal: forceHorizontalRef.current });

                // ── Lyric detection → conditional basement spacing ────────────────────────
                // Scan the selected track's score model for any beat with lyric data.
                // If found, apply expanded basement padding so AlphaTab's SVG row bounds
                // include the HTML lyric overlay area (alphaTabLyricsOverlay.ts).
                // Uses api.updateSettings() + renderTracks — no re-init needed.
                // ── Lyric detection → conditional basement spacing ────────────────────────
                const selectedTrack = score.tracks[winnerIdx] as any;
                const trackHasLyrics = selectedTrack?.staves?.some((stave: any) =>
                    stave.bars?.some((bar: any) =>
                        bar.voices?.[0]?.beats?.some((beat: any) =>
                            Array.isArray(beat.lyrics) && (beat.lyrics[0] ?? "").trim() !== ""
                        )
                    )
                ) ?? false;

                trackHasLyricsRef.current = trackHasLyrics;

                if (trackHasLyrics /* or changedTrackHasLyrics */) {
                    // Small top clearance so loop highlight doesn't scrape section names.
                    (api.settings.display as any).notationStaffPaddingTop = 7;
                    (api.settings.display as any).firstNotationStaffPaddingTop = 7;
                    // Lyric basement spacing — probe-confirmed June 2026.
                    (api.settings.display as any).notationStaffPaddingBottom = 20;
                    (api.settings.display as any).lastNotationStaffPaddingBottom = 20;
                    (api.settings.display as any).effectStaffPaddingBottom = 8;
                    (api.settings.display as any).effectBandPaddingBottom = 6;
                    (api.settings.display as any).systemPaddingBottom = 10;
                    (api.settings.display as any).lastSystemPaddingBottom = 10;
                } else {
                    // Guitar-only baseline — no lyric basement expansion.
                    (api.settings.display as any).notationStaffPaddingTop = 0;
                    (api.settings.display as any).firstNotationStaffPaddingTop = 0;
                    (api.settings.display as any).notationStaffPaddingBottom = 0;
                    (api.settings.display as any).lastNotationStaffPaddingBottom = 0;
                    (api.settings.display as any).effectStaffPaddingBottom = 0;
                    (api.settings.display as any).effectBandPaddingBottom = 2;
                    (api.settings.display as any).systemPaddingBottom = 10;
                    (api.settings.display as any).lastSystemPaddingBottom = 5;
                }

                console.log('[lyrics-spacing]', {
                    winnerIdx,
                    trackName: primaryTrackName,
                    selectedTrackName: selectedTrack?.name,
                    trackHasLyrics,
                    notationStaffPaddingTop: (api.settings.display as any).notationStaffPaddingTop,
                    firstNotationStaffPaddingTop: (api.settings.display as any).firstNotationStaffPaddingTop,
                    notationStaffPaddingBottom: (api.settings.display as any).notationStaffPaddingBottom,
                    systemPaddingBottom: (api.settings.display as any).systemPaddingBottom,
                });
                // ── END lyric detection ───────────────────────────────────────────────────

                if (ENABLE_REDUNDANT_REST_STRIP) stripRedundantRests(api.score);

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
                gp8OverlayHandleRef.current?.destroy(); gp8OverlayHandleRef.current = null;
                gp8PmOverlayHandleRef.current?.destroy(); gp8PmOverlayHandleRef.current = null;
                gp8ChordOverlayHandleRef.current?.destroy(); gp8ChordOverlayHandleRef.current = null;
                gp8VibratoOverlayHandleRef.current?.destroy(); gp8VibratoOverlayHandleRef.current = null;
                lyricsOverlayHandleRef.current?.destroy(); lyricsOverlayHandleRef.current = null;
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
                    const attachCursor = () => attachMaestroCursorV2(api, host);
                    if (!cursorRef.current) {
                        cursorRef.current = attachCursor();
                    } else {
                        const el = cursorRef.current.element;
                        if (!el || !host.contains(el)) { cursorRef.current.destroy(); cursorRef.current = attachCursor(); }
                    }
                    (window as any).__maestroCursor = cursorRef.current;
                    host.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor').forEach(n => ((n as HTMLElement).style.display = 'none'));
                    const trackSet = getTrackSet(api);
                    const step = () => {
                        if (renderTokenRef.current !== tok) return resolve(false);
                        forceRevealSurface(host, forceRevealCancelRef);
                        const tickCache = (api as any).tickCache;
                        const bounds = api.renderer?.boundsLookup;
                        if (!tickCache || !bounds) { requestAnimationFrame(step); return; }
                        const tick = api.tickPosition ?? 0;
                        const r = tickCache.findBeat(trackSet, tick);
                        if (!r?.beat) { requestAnimationFrame(step); return; }
                        if (!bounds.findBeat(r.beat)) { requestAnimationFrame(step); return; }
                        cursorRef.current?.requestSnap('song-load');
                        if (ORIENTATION_ANCHOR_DEBUG) {
                            console.log('[orientation-cursor-probe]', {
                                reason: 'song-load-prime',
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                curBeatAbs: r?.beat?.absolutePlaybackStart ?? null,
                                curBeatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                                isLandscape: isDeviceLandscape(),
                                wantStrip: forceHorizontalRef.current,
                            });
                        }
                        cursorRef.current?.setBeat(r.beat);
                        cursorRef.current?.setTick(tick);
                        // ── [orientation-s1-gap-probe] Does song-load-prime trigger S1 snap? ──
                        if (ORIENTATION_ANCHOR_DEBUG) {
                            // Match exactly what S1 uses in playerPositionChanged
                            const scrollEl = (apiRef.current?.settings?.player as any)?.scrollElement
                                ?? (apiRef.current?.renderer?.framer?.scrollElement as HTMLElement | null | undefined)
                                ?? scrollContainer
                                ?? containerRef.current;
                            const currentScrollTop = (scrollEl as HTMLElement | null)?.scrollTop ?? null;
                            const snapBounds = apiRef.current?.renderer?.boundsLookup;
                            const snapSystems = snapBounds?.staffSystems ?? [];
                            const snapBb = snapBounds?.findBeat?.(r.beat);
                            const beatY = snapBb?.visualBounds?.y ?? null;
                            const sysIdx = beatY != null ? findSystemIndexForY(snapSystems as any[], beatY) : null;
                            console.log('[orientation-s1-gap-probe]', {
                                reason: 'song-load-prime-no-s1',
                                note: 'setBeat/setTick do NOT fire playerPositionChanged — S1 snap will NOT run here',
                                apiTickPosition: (apiRef.current as any)?.tickPosition ?? null,
                                curBeatAbs: r?.beat?.absolutePlaybackStart ?? null,
                                curBeatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                                beatY,
                                resolvedSysIdx: sysIdx,
                                expectedAnchorIdx: sysIdx != null ? Math.max(0, sysIdx - 1) : null,
                                currentScrollTop,
                                s1WouldFireOnNextPositionChanged: false,
                            });
                        }
                        snapPortraitToBeatRow('song-load-prime', r.beat);
                        resolve(true);
                    };
                    requestAnimationFrame(step);
                });

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

                    if (isRecoveringCollapseRef.current) {
                        const sysList = apiRef.current?.renderer?.boundsLookup?.staffSystems ?? [];
                        if (sysList.length > 1) {
                            isRecoveringCollapseRef.current = false;
                            collapseFixAttemptsRef.current = 0;
                            console.log('[V117] collapse recovery succeeded');
                        } else {
                            isRecoveringCollapseRef.current = false;
                            collapseFixAttemptsRef.current = 0;
                            console.warn('[V117] collapse persists after hardReset — revealing as-is');
                        }
                        hideCurtainAtomic(curtainRef.current);
                        hasRevealedRef.current = true;
                        isSettlingRef.current = false;
                        setIsLoading(false);
                        setIsSettling(false);
                        onRendered?.();
                        onBoundsReady?.();
                        isApplyingProfileRef.current = false;
                        return;
                    }

                    const withPatchTimeout = (p: Promise<void>, label: string, ms = 1000): Promise<void> => {
                        let t: number | null = null;
                        const timeout = new Promise<void>(resolve => {
                            t = window.setTimeout(() => {
                                console.warn(`[patch-timeout] ${label} exceeded ${ms}ms — revealing anyway`);
                                resolve();
                            }, ms);
                        });
                        return Promise.race([p, timeout]).finally(() => {
                            if (t !== null) window.clearTimeout(t);
                        });
                    };

                    await withPatchTimeout(runUniversalLayoutPatches(h), 'universalLayoutPatches');
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    await withPatchTimeout(runGp8VibratoSuppression(h), 'gp8VibratoSuppression');
                    if (renderTokenRef.current !== tokenAtFinish) return;
                    gp8VibratoOverlayHandleRef.current?.destroy();
                    gp8VibratoOverlayHandleRef.current = await runGp8VibratoOverlay(h);

                    if (isGP8) {
                        await withPatchTimeout(runGp8LayoutEngineV2(h), 'gp8LayoutEngineV2');
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        await withPatchTimeout(runGp8OverlaySuppression(h), 'gp8OverlaySuppression');
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        await withPatchTimeout(runGp8PmSuppression(h), 'gp8PmSuppression');
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        await withPatchTimeout(runGp8ChordSuppression(h), 'gp8ChordSuppression');
                        if (renderTokenRef.current !== tokenAtFinish) return;
                        gp8OverlayHandleRef.current?.destroy();
                        gp8OverlayHandleRef.current = await runGp8OverlayLanes(h);
                        gp8PmOverlayHandleRef.current?.destroy();
                        gp8PmOverlayHandleRef.current = await runGp8PmOverlay(h);
                        gp8ChordOverlayHandleRef.current?.destroy();
                        gp8ChordOverlayHandleRef.current = await runGp8ChordOverlay(h);
                    }

                    window.dispatchEvent(new Event('maestro:overlays-ready'));

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
                            landscapeCursorRef.current = new FixedLandscapeCursor(
                                wrapper, h, () => getFixedCursorX(h)
                            );
                        }
                        h.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor')
                            .forEach(n => {
                                (n as HTMLElement).style.display = 'none';
                                (n as HTMLElement).style.opacity = '0';
                            });
                        landscapeInitialAnchor(h, api, targetScrollLeftRef);
                        startLandscapeScrollLoop(h, api);
                    }

                    // ── [F4] Post-render collapse detection ───────────────────
                    const postSystems = api?.renderer?.boundsLookup?.staffSystems ?? [];
                    const postIsPage = (api?.settings?.display?.layoutMode ?? -1) === 0;
                    const postFirstBars = (postSystems[0] as any)?.bars?.length ?? 0;
                    if (postIsPage && postSystems.length === 1 && postFirstBars > 4) {
                        console.warn('[V117] post-render collapse detected — hardReset to recover');
                        hardReset();
                        return;
                    }
                    collapseFixAttemptsRef.current = 0;

                    // ── Post-render stuck-strip check ─────────────────────────
                    requestAnimationFrame(() => {
                        requestAnimationFrame(async () => {
                            const _api = apiRef.current;
                            const _at = alphaTabModuleRef.current;
                            const _el = containerRef.current;
                            if (!_api || !_at || !_el) return;
                            if (activeRendersRef.current !== 0) return;
                            const strip = checkStuckHorizontalStrip(_api, _el);
                            console.warn('[V117] post-render strip check', {
                                ...strip,
                                forceHorizontal: forceHorizontalRef.current,
                                isDeviceLandscape: isDeviceLandscape(),
                                windowInnerWidth: window.innerWidth,
                                windowInnerHeight: window.innerHeight,
                                visualViewportWidth: window.visualViewport?.width,
                                visualViewportHeight: window.visualViewport?.height,
                                mobileLandscapeMaxW: MOBILE_LANDSCAPE_MAX_W,
                            });
                            if (strip.stuck) {
                                console.warn('[V117] stuckHorizontalStrip recovery — post-render');
                                stopLandscapeScrollLoop();
                                landscapeScrollStateRef.current = null;
                                if (landscapeCursorRef.current) {
                                    landscapeCursorRef.current.destroy();
                                    landscapeCursorRef.current = null;
                                }
                                _api.settings.display.layoutMode = (_at as any).LayoutMode.Page;
                                if ((_at as any).SystemsLayoutMode) {
                                    (_api.settings.display as any).systemsLayoutMode =
                                        (_at as any).SystemsLayoutMode.Automatic;
                                }
                                await _api.updateSettings();
                                _api.render();
                                applyAxisLock(_el, _api);
                            }
                        });
                    });
                    // ── END post-render strip check ───────────────────────────

                    forceRevealSurface(h, forceRevealCancelRef);
                    h.getBoundingClientRect();
                    (h.querySelector('.at-surface') as HTMLElement | null)?.getBoundingClientRect();

                    // ── [colorPatch] A/B — force title/artist brand colors after every render ──
                    // Fill guard removed: after dark palette apply, alphaTab sets a real white fill,
                    // so null/undefined check was skipping both elements in dark mode.
                    // Font+anchor guards are specific enough — no other score text matches both.
                    {
                        const svgTexts = Array.from(
                            h.querySelectorAll<SVGTextElement>('.at-surface svg text') ?? []
                        );
                        svgTexts.forEach((el) => {
                            const font = el.style.font ?? '';
                            const anchor = el.getAttribute('text-anchor');
                            if (anchor !== 'middle') return;

                            if (font.includes('32px')) {
                                el.setAttribute('fill', SCORE_TITLE_CYAN);
                            } else if (font.includes('20px')) {
                                el.setAttribute('fill', SCORE_ARTIST_BLUE);
                            }
                        });
                    }

                    hideCurtainAtomic(curtainRef.current);
                    hasRevealedRef.current = true;
                    if (isRendererDebugEnabled()) console.log('🟢 V119 curtain dropped', { token: tokenAtFinish, isStripRender });

                    if (containerRef.current) applyAxisLock(containerRef.current, api);
                    requestAnimationFrame(() => forceRevealSurface(h, forceRevealCancelRef));
                    isSettlingRef.current = false;
                    setIsLoading(false);
                    setIsSettling(false);
                    onRendered?.();
                    onBoundsReady?.();
                    isApplyingProfileRef.current = false;

                    console.log('[loop-render-probe]', {
                        reason: 'renderFinished-stable',
                        loopEnabled: loopEnabledRef.current,
                        playbackRangeRef: playbackRangeRef.current,
                        apiPlaybackRange: (api.playbackRange as any) ?? null,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: (api?.renderer?.boundsLookup?.staffSystems?.[0] as any)?.bars?.length ?? null,
                    });

                    // ── Maestro lyric overlay ─────────────────────────────────
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const contentHost =
                                containerRef.current?.closest('.alphatab-content-host') as HTMLElement | null
                                ?? containerRef.current;
                            if (contentHost) {
                                lyricsOverlayHandleRef.current?.destroy();
                                lyricsOverlayHandleRef.current = runAlphaTabLyricsOverlay(
                                    contentHost,
                                    api,
                                    theme,
                                );
                            }
                        });
                    });
                    // ── END lyric overlay ─────────────────────────────────────

                    if (isStripRender) {
                        requestAnimationFrame(() => {
                            const ctr = containerRef.current;
                            if (ctr) primeLandscapeState(ctr);
                        });
                    }
                }, QUIET_MS);
            });

            // ─── [P5] notifyPlayerReady ───────────────────────────────────────
            const notifyPlayerReady = () => {
                if (!api.isReadyForPlayback) return;
                if (playerModeRef.current === 'external' && api.player?.output) {
                    const out = api.player.output as any;
                    out.handler = externalMediaHandlerRef.current ?? null;
                    if (isRendererDebugEnabled()) console.log('[renderer] external handler attached on playerReady', !!out.handler);
                }
                onPlayerReady?.();
            };
            api.playerReady?.on(() => setTimeout(notifyPlayerReady, 100));
            api.soundFontLoaded?.on(() => notifyPlayerReady());

            let stateDebounce: ReturnType<typeof setTimeout>;
            api.playerStateChanged.on((e: any) => {
                if ((e.state ?? 0) === 1 && hasRevealedRef.current && isSettlingRef.current) {
                    console.warn('[V117] isSettling stuck on play — force clearing');
                    isSettlingRef.current = false;
                    setIsSettling(false);
                }
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) onPlayStateChange(playing);
                }, 50);
                const isStripNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                if ((e.state ?? 0) === 1 && isStripNow) {
                    const ctr = containerRef.current;
                    if (ctr) {
                        requestAnimationFrame(() => {
                            primeLandscapeState(ctr);
                            startLandscapeScrollLoop(ctr, api);
                        });
                    }
                }
            });

            // 🔒🔒🔒 CURSOR / SCROLL ENGINE ───────────────────────────────────
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

                    if ((api.playerState ?? 0) === 1 && landscapeScrollRafRef.current === null) {
                        startLandscapeScrollLoop(container, api);
                    }
                    return;
                }

                // ── Portrait cursor engine ────────────────────────────────────
                if (!cursorRef.current) return;

                // V1.8.5: Consume loop-click seek target from BeatCustomLoopOverlay.
                // commitBarSnap (click path) sets __maestroManualSeekTargetTick = clickedTick
                // alongside __maestroManualSeek. If seekTargetTickRef is stale (e.g. 0 from
                // a prior touch/landscape seek still inside its 300ms freeze window), the gate
                // below would filter out clickedTick events because |tickRaw - 0| >> FAR_TICKS.
                // Updating seekTargetTickRef here ensures the gate targets the correct tick.
                {
                    const pendingTarget = (window as any).__maestroManualSeekTargetTick;
                    const manualSeekTs = (window as any).__maestroManualSeek;
                    if (pendingTarget != null && manualSeekTs && Date.now() - manualSeekTs < 500) {
                        seekTargetTickRef.current = pendingTarget;
                        seekFreezeUntilRef.current = Date.now() + 300;
                        (window as any).__maestroManualSeekTargetTick = null;
                    }
                }

                const FAR_TICKS = 240;
                if (seekFreezeUntilRef.current > Date.now() && seekTargetTickRef.current != null) {
                    if (Math.abs(tickRaw - seekTargetTickRef.current) > FAR_TICKS) {
                        if (LOOP_CLICK_RESEAT_DEBUG) {
                            console.log('[loop-click-reseat-probe]', {
                                reason: 'seekFreeze-gate-return',
                                tickRaw,
                                seekTargetTick: seekTargetTickRef.current,
                                diff: Math.abs(tickRaw - seekTargetTickRef.current),
                                FAR_TICKS,
                                playbackRangeStartTick: (playbackRangeRef.current ?? (api?.playbackRange as any))?.startTick ?? null,
                                manualSeekAge: (window as any).__maestroManualSeek
                                    ? Date.now() - (window as any).__maestroManualSeek : null,
                            });
                        }
                        return;
                    }
                }

                // ── [loop-wrap] Live range + safety margin ────────────────────
                // Use live api.playbackRange as fallback in case React state
                // (playbackRangeRef) is stale — BeatCustomLoopOverlay writes
                // directly to api.playbackRange, not through React state.
                // Restore -120 margin (Labs strategy) so we wrap before the
                // final tick rather than at/after it — prevents overshoot on
                // both cursors.
                const liveRange = playbackRangeRef.current ?? (api.playbackRange as { startTick: number; endTick: number } | null);
                const LOOP_WRAP_MARGIN = 30; // reduced from 120 — 120 was too aggressive for 60-tick slide subdivisions
                if (loopEnabledRef.current && liveRange) {
                    // ── [loop-click-reseat-probe] below-startTick diagnostic ──────────────
                    if (LOOP_CLICK_RESEAT_DEBUG && tickRaw < liveRange.startTick) {
                        console.log('[loop-click-reseat-probe]', {
                            reason: 'tick-below-loop-startTick',
                            tickRaw,
                            liveRangeStartTick: liveRange.startTick,
                            liveRangeEndTick: liveRange.endTick,
                            delta: liveRange.startTick - tickRaw,
                            isPlaying: (api.playerState ?? 0) === 1,
                            manualSeekAge: (window as any).__maestroManualSeek
                                ? Date.now() - (window as any).__maestroManualSeek : null,
                            loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                        });
                    }
                    if (tickRaw >= liveRange.endTick - LOOP_WRAP_MARGIN) {
                        if (LOOP_CLICK_RESEAT_DEBUG) {
                            console.log('[loop-click-reseat-probe]', {
                                reason: 'loop-wrap-guard-fired',
                                tickRaw,
                                liveRangeStartTick: liveRange.startTick,
                                liveRangeEndTick: liveRange.endTick,
                                endTickMinusMargin: liveRange.endTick - LOOP_WRAP_MARGIN,
                                isPlaying: (api.playerState ?? 0) === 1,
                                manualSeekAge: (window as any).__maestroManualSeek
                                    ? Date.now() - (window as any).__maestroManualSeek : null,
                            });
                        }
                        cursorRef.current.requestSnap('loop-wrap');
                        resetBeatAcceptance();
                        stableCurBeatRef.current = null;
                        stableExpandedBeatStartRef.current = 0;
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                        stableVisualKeyRef.current = null;
                        lastTickRef.current = null;
                        allowBacktrackUntilRef.current = Date.now() + 300;
                        const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                        if (seekTicks) seekTicks(liveRange.startTick);
                        api.tickPosition = liveRange.startTick;
                        return;
                    }
                }

                const tick = tickRaw;
                const lastTick = lastTickRef.current;

                // ── V1.8.4: Loop reseat guard ─────────────────────────────────────────────
                // BeatCustomLoopOverlay sets window.__maestroLoopReseat on commitBarSnap
                // (click-to-move) and toggle-ON. Flushing stable cursor refs here prevents
                // slide/tie/pick-slide content on the FIRST loop pass from mis-priming the
                // cursor to a later beat (cursor jumps ahead and parks until player catches up).
                // Guard window: 800ms from reseat, tick within 960 ticks of loop start.
                // Does NOT return — normal playerPositionChanged logic continues with clean refs.
                {
                    const reseatFlag = (window as any).__maestroLoopReseat;
                    const RESEAT_WINDOW_MS = 800;
                    const RESEAT_TICK_SLOP = 960;
                    if (
                        reseatFlag &&
                        Date.now() - reseatFlag.at < RESEAT_WINDOW_MS &&
                        Math.abs(tick - reseatFlag.tick) < RESEAT_TICK_SLOP
                    ) {
                        activeLoopReseatReasonRef.current = reseatFlag.reason ?? null;
                        if (reseatFlag.reason === 'loop-play-start') {
                            loopPlayStartPreserveAbsRef.current = reseatFlag.tick ?? null;
                        }
                        (window as any).__maestroLoopReseat = null;
                        console.log(`🔁 Loop reseat guard fired (${reseatFlag.reason}):`, {
                            liveTick: tick,
                            reseatTick: reseatFlag.tick,
                        });
                        cursorRef.current?.requestSnap(reseatFlag.reason ?? 'loop-reseat');
                        stableCurBeatRef.current = null;
                        stableVisualKeyRef.current = null;
                        stableExpandedBeatStartRef.current = 0;
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                        lastTickRef.current = null;
                        lastAcceptedBeatStartRef.current = -1;
                        allowBacktrackUntilRef.current = Date.now() + 600;
                        reAnchorCountRef.current = { beat: -1, count: 0 };
                        // [reseat-bar-gate] Resolve the loop start bar index so we can
                        // reject any continuation beat from the previous measure during
                        // the reseat window (pick/finger-slide tails park the cursor back).
                        try {
                            const reseatTickCache = (api as any).tickCache;
                            const reseatTrackSet = getTrackSet(api);
                            const reseatResult = reseatTickCache?.findBeat?.(reseatTrackSet, reseatFlag.tick);
                            const reseatBeat = reseatResult?.beat ?? null;
                            const reseatBarIdx = reseatBeat?.voice?.bar?.masterBar?.index
                                ?? reseatBeat?.voice?.bar?.index
                                ?? null;
                            reseatMinBarIdxRef.current =
                                typeof reseatBarIdx === 'number' ? reseatBarIdx : null;
                            reseatMinBarUntilRef.current = Date.now() + 900;
                            if (isRendererDebugEnabled()) console.log('[reseat-bar-gate] set', { reseatBarIdx, tick: reseatFlag.tick });
                        } catch {
                            reseatMinBarIdxRef.current = null;
                            reseatMinBarUntilRef.current = 0;
                        }
                        // Do not return — let normal logic continue with clean refs
                        // so the cursor primes correctly from the current loop start tick.
                    }
                }

                const delta = lastTick != null ? Math.abs(tick - lastTick) : 0;
                const jumped = delta > 2000;
                const hugeJump = delta > 30000;
                lastTickRef.current = tick;

                if (jumped) {
                    if (hugeJump) cursorRef.current.requestSnap('huge-jump');
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

                // ── [loop-start-visible-beat] Replace zero-width tie beat ────
                // During the reseat window, AlphaTab may resolve the loop start
                // tick to a tied continuation beat (vbW=0, all notes isTieDestination).
                // This makes the cursor park on an invisible/zero-width position.
                // Example: M24 tick 88320 → vbW=0, tied 3s6T 3s5T.
                // First visible attack is at 89280 → vbW=6.8, notes 0s4 0s3.
                //
                // Fix: scan forward inside the loop range for the first beat that:
                //   - has visualBounds.w > 0
                //   - has at least one non-tie-destination note
                //   - absolutePlaybackStart >= loopStartTick
                // Only runs during reseat window — does not affect normal playback,
                // loop OFF, or click-to-seek.
                if (
                    reseatMinBarIdxRef.current != null &&
                    Date.now() < reseatMinBarUntilRef.current
                ) {
                    const loopStartTick = liveRange?.startTick ?? playbackRangeRef.current?.startTick ?? tick;
                    const loopEndTick = liveRange?.endTick ?? playbackRangeRef.current?.endTick ?? (loopStartTick + 99999);
                    const bounds = api?.renderer?.boundsLookup;

                    const beatIsVisible = (b: any): boolean => {
                        if (!b) return false;
                        const bb = bounds?.findBeat?.(b);
                        const vbW = bb?.visualBounds?.w ?? 0;
                        if (vbW <= 0) return false;
                        const hasAttack = b.notes?.some((n: any) => !n.isTieDestination);
                        return !!hasAttack;
                    };

                    // [LoopLeadIn] Preserve boundary beat while AlphaTab keeps resolving the same
                    // absolutePlaybackStart. Prevents tied/slide lead-ins jumping to first visible
                    // attack on first play pass. Clears naturally when playback advances.
                    const curBeatAbs = curBeat?.absolutePlaybackStart ?? null;
                    const preservedLoopStartAbs = loopPlayStartPreserveAbsRef.current;
                    const activeReseatReason =
                        activeLoopReseatReasonRef.current ??
                        (preservedLoopStartAbs != null && curBeatAbs === preservedLoopStartAbs
                            ? 'loop-play-start'
                            : null) ??
                        (window as any).__maestroLoopReseat?.reason ??
                        null;
                    const isLoopPlayStart =
                        activeReseatReason === 'loop-play-start' &&
                        preservedLoopStartAbs != null &&
                        curBeatAbs === preservedLoopStartAbs;

                    // Clear once playback advances past the protected beat
                    if (preservedLoopStartAbs != null && curBeatAbs !== preservedLoopStartAbs) {
                        loopPlayStartPreserveAbsRef.current = null;
                    }

                    if (isLoopPlayStart) {
                        // Do not replace loop start beat with first visible attack.
                        // Tied/slide lead-in beats at loop boundary should be visually honored.
                        activeLoopReseatReasonRef.current = null;
                        // Skip the replacement — fall through to normal cursor logic with original curBeat
                    } else {
                        if (!beatIsVisible(curBeat)) {
                            const originalAbs = curBeat?.absolutePlaybackStart;
                            const originalVbW = bounds?.findBeat?.(curBeat)?.visualBounds?.w ?? 0;
                            let replacement: any = null;

                            // Scan forward up to 1920 ticks (one bar) inside the loop
                            for (let probe = loopStartTick + 1; probe <= Math.min(loopStartTick + 1920, loopEndTick); probe++) {
                                const r = tickCache?.findBeat?.(trackSet, probe);
                                if (!r?.beat) continue;
                                const bAbs = r.beat?.absolutePlaybackStart ?? probe;
                                if (bAbs < loopStartTick) continue;
                                if (beatIsVisible(r.beat)) {
                                    replacement = r.beat;
                                    break;
                                }
                            }

                            if (replacement) {
                                const repBb = bounds?.findBeat?.(replacement);
                                console.log('[loop-start-visible-beat]', {
                                    loopStartTick,
                                    originalAbs,
                                    originalVbW,
                                    replacementAbs: replacement?.absolutePlaybackStart,
                                    replacementVbW: repBb?.visualBounds?.w,
                                    reason: 'zero-width tie beat replaced with first visible attack',
                                });
                                curBeat = replacement;
                            }
                        }
                        activeLoopReseatReasonRef.current = null;
                    } // end isLoopPlayStart else
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
                            const allowBacktrack =
                                Date.now() < ((window as any).__maestroAllowBacktrackUntil ?? 0);
                            if (allowBacktrack) {
                                console.log('[V117] structural regression allowed — manual backtrack seek');
                            } else {
                                const regKey = `${incomingStart}:${prevAbs}`;
                                if (lastRegressionLogRef.current !== regKey) {
                                    lastRegressionLogRef.current = regKey;
                                    console.warn('[V117] structural regression discarded');
                                }
                                if (LOOP_CLICK_RESEAT_DEBUG) {
                                    console.log('[loop-click-reseat-probe]', {
                                        reason: 'V117-regression-return',
                                        incomingStart,
                                        prevAbs,
                                        tick,
                                        liveRangeStartTick: liveRange?.startTick ?? null,
                                        manualSeekAge: (window as any).__maestroManualSeek
                                            ? Date.now() - (window as any).__maestroManualSeek : null,
                                    });
                                }
                                return;
                            }
                        }
                    }

                    if (!isActuallyPlaying || inBypassWindow) {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    } else if (lastAcceptedBeatStartRef.current >= 0 && incomingStart < lastAcceptedBeatStartRef.current - MIN_BACKTRACK_TICKS) {
                        if (LOOP_CLICK_RESEAT_DEBUG) {
                            console.log('[loop-click-reseat-probe]', {
                                reason: 'D1-backtrack-guard-return',
                                incomingStart,
                                lastAcceptedBeatStart: lastAcceptedBeatStartRef.current,
                                diff: lastAcceptedBeatStartRef.current - incomingStart,
                                MIN_BACKTRACK_TICKS,
                                tick,
                                liveRangeStartTick: liveRange?.startTick ?? null,
                                inBypassWindow,
                                manualSeekAge: (window as any).__maestroManualSeek
                                    ? Date.now() - (window as any).__maestroManualSeek : null,
                            });
                        }
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

                    if (loopEnabledRef.current && liveRange?.endTick != null) {
                        const endBeatResult = tickCache.findBeat(trackSet, liveRange.endTick - 1);
                        const endBb = endBeatResult?.beat
                            ? api?.renderer?.boundsLookup?.findBeat?.(endBeatResult.beat)
                            : null;
                        const endVb = endBb?.visualBounds ?? null;
                        const loopEndVisualX = endVb
                            ? endVb.x + endVb.w
                            : null;
                        // Only clamp when curBeat is on the same visual row as the loop end beat.
                        // Cross-row: loopEndX from a different row causes pause/backward interpolation.
                        const curBb = api?.renderer?.boundsLookup?.findBeat?.(curBeat);
                        const curVb = curBb?.visualBounds ?? null;
                        const sameRow = curVb && endVb && Math.abs(curVb.y - endVb.y) < 5;

                        // Only clamp mid-bar loop endings.
                        // Barline-to-barline: liveRange.endTick - 1 is the last beat before the barline.
                        // Clamping there pauses the cursor on the final chord instead of drifting to barline.
                        // Uses tickCache.getBeatStart for repeat-safe expanded tick; absolutePlaybackStart
                        // as fallback. Bar index check on nextBeat confirms true bar boundary.
                        const endBeat = endBeatResult?.beat ?? null;
                        const endBeatStart = endBeat
                            ? ((api as any)?.tickCache?.getBeatStart?.(endBeat) ?? endBeat?.absolutePlaybackStart ?? null)
                            : null;
                        const endBeatDur = endBeat?.playbackDuration ?? endBeat?.duration ?? null;
                        const endBeatNext = endBeat?.nextBeat ?? null;
                        const endBeatBarIdx = endBeat?.voice?.bar?.index ?? endBeat?.voice?.bar?.masterBar?.index;
                        const nextBeatBarIdx = endBeatNext?.voice?.bar?.index ?? endBeatNext?.voice?.bar?.masterBar?.index;
                        const loopEndsOnBarline =
                            endBeat != null &&
                            endBeatStart != null &&
                            endBeatDur != null &&
                            (endBeatStart + endBeatDur) === liveRange.endTick &&
                            (endBeatNext == null || nextBeatBarIdx !== endBeatBarIdx);

                        cursorRef.current.setLoopEndX(
                            sameRow && !loopEndsOnBarline ? loopEndVisualX : null
                        );
                    } else {
                        cursorRef.current.setLoopEndX(null);
                    }

                    cursorRef.current.setBeat(curBeat, resolvedNextBeat, nextExpandedStart ?? null, guardedStart);
                }

                cursorRef.current.setTick(tick, stableNextBeatRef.current, stableExpandedBeatStartRef.current);

                // ── [S1] Songsterr-style snap-to-system scroll (portrait only) ──
                // DOM SVG rows measured directly — includes effect lanes in bounding rect.
                // scrollRect.top subtracted so rowRect.top is scroll-container-relative.
                // height>100 AND width>500 filters title (~69px) and tuning (~60px) SVGs.
                {
                    const snapBounds = api.renderer?.boundsLookup;
                    const snapSystems = snapBounds?.staffSystems ?? [];
                    const snapBb = snapBounds?.findBeat?.(curBeat);
                    const beatY = snapBb?.visualBounds?.y;

                    if (beatY != null && snapSystems.length > 0) {
                        const sysIdx = findSystemIndexForY(snapSystems, beatY);
                        const anchorIdx = Math.max(0, sysIdx - 1);

                        if (sysIdx >= 0 && anchorIdx !== lastAnchorSysRef.current) {
                            lastAnchorSysRef.current = anchorIdx;

                            const scrollEl = (api.settings.player as any).scrollElement
                                ?? scrollContainer
                                ?? containerRef.current;

                            if (scrollEl) {
                                const scrollElEl = scrollEl as HTMLElement;
                                const header = document.querySelector('[data-top-menu-tray]') as HTMLElement | null;
                                const isPlayingNow = (api.playerState ?? 0) === 1;
                                const headerH = (!isPlayingNow && header
                                    && getComputedStyle(header).display !== 'none')
                                    ? header.getBoundingClientRect().height : 0;
                                const GAP = 8;
                                const maxScroll = Math.max(0, scrollElEl.scrollHeight - scrollElEl.clientHeight);
                                const scrollRect = scrollElEl.getBoundingClientRect();

                                const allSvgs = Array.from(
                                    scrollElEl.querySelectorAll<SVGElement>('.at-surface svg')
                                );
                                const staffRows = allSvgs.filter(el => {
                                    const r = el.getBoundingClientRect();
                                    return r.height > 100 && r.width > 500;
                                });

                                if (isSnapDebugEnabled()) {
                                    console.table(staffRows.map((svg, idx) => {
                                        const r = svg.getBoundingClientRect();
                                        return {
                                            idx,
                                            topViewport: Math.round(r.top),
                                            topInScroll: Math.round(r.top - scrollRect.top),
                                            height: Math.round(r.height),
                                            width: Math.round(r.width),
                                            scrollTop: Math.round(scrollElEl.scrollTop),
                                            targetIfSnapped: Math.round(
                                                scrollElEl.scrollTop + r.top - scrollRect.top - headerH - GAP
                                            ),
                                            className: svg.getAttribute('class') ?? '',
                                        };
                                    }));
                                    console.log('[S1 snap choice]', {
                                        anchorIdx, sysIdx,
                                        staffRowsLength: staffRows.length,
                                        headerH, GAP,
                                        currentScrollTop: scrollElEl.scrollTop,
                                        chosenHeight: staffRows[anchorIdx]?.getBoundingClientRect().height,
                                    });
                                }

                                let target: number;
                                if (anchorIdx === 0) {
                                    target = 0;
                                } else if (staffRows.length > anchorIdx) {
                                    const rowRect = staffRows[anchorIdx].getBoundingClientRect();
                                    target = Math.max(
                                        0,
                                        scrollElEl.scrollTop + rowRect.top - scrollRect.top - headerH - GAP
                                    );
                                } else {
                                    const anchorVb = (snapSystems[anchorIdx] as any)?.visualBounds;
                                    target = Math.max(0, (anchorVb?.y ?? 0) - headerH - GAP);
                                }

                                const currentVb = (snapSystems[sysIdx] as any)?.visualBounds;
                                const currentTop = currentVb?.y ?? 0;
                                target = Math.min(target, Math.max(0, currentTop - headerH - GAP));

                                // ── Previous-row clearance — absolute-coordinate prediction [S1-clearance] ──
                                // Old: measured prevRect.bottom in current viewport → same value
                                //      every tick → giant repeated correction → slam/bounce.
                                // New: converts prevRect.bottom to scroll-content coordinates,
                                //      then checks whether it will still be visible AFTER target
                                //      is applied. Only corrects if it would still dangle.
                                {
                                    const safeOffset = headerH + GAP;
                                    const targetBeforeClearance = target;
                                    const prevRow = anchorIdx > 0 ? (staffRows[anchorIdx - 1] ?? null) : null;
                                    let danglingAfterTarget = 0;
                                    let prevBottomAbs: number | null = null;
                                    let safeTopAbsAfterTarget: number | null = null;

                                    if (prevRow) {
                                        const prevRect = prevRow.getBoundingClientRect();
                                        // Convert viewport-relative bottom → scroll-content absolute y
                                        prevBottomAbs = scrollElEl.scrollTop + (prevRect.bottom - scrollRect.top);
                                        // Where the safe top line will sit after target is applied
                                        safeTopAbsAfterTarget = target + safeOffset;
                                        danglingAfterTarget = prevBottomAbs - safeTopAbsAfterTarget;
                                        // ε=0.5 avoids sub-pixel jitter; +3 prevents SVG hairline ghost
                                        if (danglingAfterTarget > 0.5) {
                                            target = Math.max(0, target + danglingAfterTarget + 3);
                                        }
                                    }

                                    if (isSnapDebugEnabled()) {
                                        console.log('[S1 prev-row clearance ABS]', {
                                            anchorIdx,
                                            scrollTopBefore: Math.round(scrollElEl.scrollTop),
                                            safeOffset,
                                            targetBeforeClearance: Math.round(targetBeforeClearance),
                                            prevBottomAbs: prevBottomAbs != null ? Math.round(prevBottomAbs) : null,
                                            safeTopAbsAfterTarget: safeTopAbsAfterTarget != null ? Math.round(safeTopAbsAfterTarget) : null,
                                            danglingAfterTarget: Math.round(danglingAfterTarget),
                                            targetAfterClearance: Math.round(target),
                                        });
                                    }
                                }

                                target = Math.min(target, maxScroll);

                                if (isSnapDebugEnabled()) {
                                    console.log('[S1 snap apply]', {
                                        anchorIdx, sysIdx,
                                        target: Math.round(target),
                                        fromScroll: Math.round(scrollElEl.scrollTop),
                                        delta: Math.round(target - scrollElEl.scrollTop),
                                    });
                                }

                                // ── [S1] Portrait scroll tween — easeOutCubic, 150ms ─────
                                // S1 owns vertical scrolling (ScrollMode.Off confirmed).
                                // Cancels if a new snap fires mid-tween or user scrolls.
                                if (s1AnimRafRef.current !== null) {
                                    cancelAnimationFrame(s1AnimRafRef.current);
                                    s1AnimRafRef.current = null;
                                }
                                const tweenFrom = scrollElEl.scrollTop;
                                const tweenTo = target;
                                const tweenDelta = tweenTo - tweenFrom;
                                const TWEEN_MS = 150;
                                const snapAnchor = anchorIdx; // capture for cancel guard

                                if (ORIENTATION_ANCHOR_DEBUG) {
                                    console.log('[orientation-anchor-probe]', {
                                        reason: 'portrait-s1-snap',
                                        apiTickPosition: (api as any)?.tickPosition ?? null,
                                        resolvedBeatTick: tick,
                                        resolvedBeatBarIdx: curBeat?.voice?.bar?.masterBar?.index ?? null,
                                        s1AnchorIdx: anchorIdx,
                                        s1SysIdx: sysIdx,
                                        s1TargetScrollTop: tweenTo,
                                        currentScrollTop: tweenFrom,
                                        lastLandscapeVisibleBar: lastLandscapeVisibleBarRef.current,
                                    });
                                }

                                if (Math.abs(tweenDelta) < 2) {
                                    // Already there — skip tween
                                    scrollElEl.scrollTop = tweenTo;
                                } else {
                                    const startTime = performance.now();
                                    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

                                    const step = (now: number) => {
                                        // Cancel if a newer snap took over
                                        if (lastAnchorSysRef.current !== snapAnchor) return;
                                        const elapsed = now - startTime;
                                        const progress = Math.min(elapsed / TWEEN_MS, 1);
                                        scrollElEl.scrollTop = tweenFrom + tweenDelta * easeOutCubic(progress);
                                        if (progress < 1) {
                                            s1AnimRafRef.current = requestAnimationFrame(step);
                                        } else {
                                            // Force exact landing
                                            scrollElEl.scrollTop = tweenTo;
                                            s1AnimRafRef.current = null;
                                        }
                                    };
                                    s1AnimRafRef.current = requestAnimationFrame(step);
                                }

                                // ── Drift check — debug only ──────────────────────────────
                                if (isSnapDebugEnabled()) {
                                    const driftCheck = (delay: number) => {
                                        window.setTimeout(() => {
                                            if (lastAnchorSysRef.current !== anchorIdx) return;
                                            const drift = scrollElEl.scrollTop - target;
                                            const scrollRectNow = scrollElEl.getBoundingClientRect();
                                            const prevNow = staffRows[anchorIdx - 1]?.getBoundingClientRect();
                                            const safeNow = scrollRectNow.top + headerH + GAP;
                                            const prevDanglingNow = prevNow ? prevNow.bottom - safeNow : null;
                                            console.log('[S1 DRIFT CHECK]', {
                                                delay, anchorIdx,
                                                target: Math.round(target),
                                                scrollTopNow: Math.round(scrollElEl.scrollTop),
                                                drift: Math.round(drift),
                                                prevDanglingNow: prevDanglingNow != null ? Math.round(prevDanglingNow) : null,
                                            });
                                        }, delay);
                                    };
                                    driftCheck(60);
                                    driftCheck(200);
                                }
                            }
                        }
                    }
                }
            });
            // 🔒🔒🔒 END CURSOR/SCROLL ENGINE 🔒🔒🔒

            // [F5] Load from byte cache on reset; prime cache on first load.
            if (scoreBytesRef.current) {
                api.load(scoreBytesRef.current.buffer);
            } else {
                fetch(fileUrl)
                    .then(r => r.arrayBuffer())
                    .then(buf => { if (!destroyed) scoreBytesRef.current = new Uint8Array(buf); })
                    .catch(() => { });
                await loadGuitarProFile(api, fileUrl);
            }
        };

        init().catch(console.error);

        (window as any).__maestroProbeRendererLoop = () => {
            const _api = apiRef.current;
            console.log('[loop-render-probe]', {
                reason: 'manual',
                loopEnabled: loopEnabledRef.current,
                playbackRangeRef: playbackRangeRef.current,
                apiPlaybackRange: (_api?.playbackRange as any) ?? null,
                systemsLength: _api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                firstSystemBars: (_api?.renderer?.boundsLookup?.staffSystems?.[0] as any)?.bars?.length ?? null,
            });
        };

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
            gp8OverlayHandleRef.current?.destroy(); gp8OverlayHandleRef.current = null;
            gp8PmOverlayHandleRef.current?.destroy(); gp8PmOverlayHandleRef.current = null;
            gp8ChordOverlayHandleRef.current?.destroy(); gp8ChordOverlayHandleRef.current = null;
            gp8VibratoOverlayHandleRef.current?.destroy(); gp8VibratoOverlayHandleRef.current = null;
            if (apiRef.current) { apiRef.current.destroy(); apiRef.current = null; }
            lastAcceptedBeatStartRef.current = -1;
            lastRegressionLogRef.current = '';
            lastTickRef.current = null;
            stableCurBeatRef.current = null;
            stableExpandedBeatStartRef.current = 0;
            stableNextBeatRef.current = null;
            stableNextExpandedBeatStartRef.current = null;
            stableVisualKeyRef.current = null;
            lastAnchorSysRef.current = -1;
            lastThemeRef.current = null; // [TH] force palette re-apply on next reveal
            reseatMinBarIdxRef.current = null;  // [reseat-bar-gate] clear on unmount
            reseatMinBarUntilRef.current = 0;
            activeLoopReseatReasonRef.current = null;
            loopPlayStartPreserveAbsRef.current = null;
            if (s1AnimRafRef.current !== null) {
                cancelAnimationFrame(s1AnimRafRef.current);
                s1AnimRafRef.current = null;
            }
            delete (window as any).__maestroProbeRendererLoop;
        };
    }, [fileUrl, startLandscapeScrollLoop, stopLandscapeScrollLoop, snapPortraitToBeatRow, resetKey]);

    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        const tracks = api.score?.tracks;
        if (!tracks || !Array.isArray(tracks) || tracks.length === 0) return;

        let cancelled = false;
        const raf = requestAnimationFrame(() => {
            if (cancelled) return;

            const tracks = api.score?.tracks;
            if (!tracks?.length) return;
            const safeIndices = (trackIndices ?? [])
                .filter((i): i is number => Number.isFinite(i))
                .map(i => Math.floor(i))
                .filter(i => i >= 0 && i < tracks.length);

            if (safeIndices.length === 0) {
                console.warn('[V117] renderTracks skipped: no valid track indices', { trackIndices, tracksLen: tracks.length });
                return;
            }

            const tr = safeIndices.map(i => tracks[i]).filter(Boolean);
            const bad = tr.find(t => !(t as any)?.staves);
            if (bad) {
                console.warn('[V117] renderTracks skipped: track missing staves');
                return;
            }

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
            cursorRef.current?.requestSnap('track-change');

            // ── Lyric detection → conditional basement spacing (track change) ──────
            const changedTrack = tr[0] as any;
            const changedTrackHasLyrics = changedTrack?.staves?.some((stave: any) =>
                stave.bars?.some((bar: any) =>
                    bar.voices?.[0]?.beats?.some((beat: any) =>
                        Array.isArray(beat.lyrics) && (beat.lyrics[0] ?? "").trim() !== ""
                    )
                )
            ) ?? false;

            trackHasLyricsRef.current = changedTrackHasLyrics;

            if (changedTrackHasLyrics) {
                (api.settings.display as any).notationStaffPaddingTop = 7;
                (api.settings.display as any).firstNotationStaffPaddingTop = 7;
                (api.settings.display as any).notationStaffPaddingBottom = 20;
                (api.settings.display as any).lastNotationStaffPaddingBottom = 20;
                (api.settings.display as any).effectStaffPaddingBottom = 8;
                (api.settings.display as any).effectBandPaddingBottom = 6;
                (api.settings.display as any).systemPaddingBottom = 10;
                (api.settings.display as any).lastSystemPaddingBottom = 10;
            } else {
                (api.settings.display as any).notationStaffPaddingTop = 0;
                (api.settings.display as any).firstNotationStaffPaddingTop = 0;
                (api.settings.display as any).notationStaffPaddingBottom = 0;
                (api.settings.display as any).lastNotationStaffPaddingBottom = 0;
                (api.settings.display as any).effectStaffPaddingBottom = 0;
                (api.settings.display as any).effectBandPaddingBottom = 2;
                (api.settings.display as any).systemPaddingBottom = 10;
                (api.settings.display as any).lastSystemPaddingBottom = 5;
            }

            console.log('[lyrics-spacing track-change]', {
                trackName: primaryTrackName,
                changedTrackHasLyrics,
                notationStaffPaddingTop: (api.settings.display as any).notationStaffPaddingTop,
                firstNotationStaffPaddingTop: (api.settings.display as any).firstNotationStaffPaddingTop,
                notationStaffPaddingBottom: (api.settings.display as any).notationStaffPaddingBottom,
                systemPaddingBottom: (api.settings.display as any).systemPaddingBottom,
            });
            // ── END lyric detection (track change) ────────────────────────────────

            try {
                api.renderTracks(tr);

            } catch (err) {
                console.error('[V117] renderTracks failed', err, { safeIndices });
            }
        });

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
        };
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

                // ── Loop-start cursor re-prime ────────────────────────────────────────────
                // When loop is ON, re-prime cursor to playbackRange.startTick before play.
                // Without this, cursor sits at the last clicked/parked position until the
                // first playerPositionChanged fires — causing a visible catch-up delay.
                // Uses live api.playbackRange (not React state) so BeatCustomLoopOverlay
                // writes are always respected even if React state is stale.
                const liveLoopRange = loopEnabledRef.current
                    ? (api.playbackRange as { startTick: number; endTick: number } | null)
                    : null;
                if (liveLoopRange?.startTick != null) {
                    const overrideTick = (window as any).__maestroLoopPlayStartOverrideTick;
                    const hasValidOverride =
                        typeof overrideTick === 'number' &&
                        overrideTick >= liveLoopRange.startTick &&
                        overrideTick < liveLoopRange.endTick;
                    const primeT = hasValidOverride ? overrideTick : liveLoopRange.startTick;
                    if (hasValidOverride) {
                        (window as any).__maestroLoopPlayStartOverrideTick = null;
                    }
                    if (LOOP_CLICK_RESEAT_DEBUG) {
                        console.log('[loop-click-reseat-probe]', {
                            reason: 'playerStateChanged-loop-prime',
                            isPlaying,
                            primeT,
                            hasValidOverride,
                            overrideTick,
                            liveLoopRangeStartTick: liveLoopRange.startTick,
                            liveLoopRangeEndTick: liveLoopRange.endTick,
                            apiTickBefore: (api as any)?.tickPosition ?? null,
                            manualSeekAge: (window as any).__maestroManualSeek
                                ? Date.now() - (window as any).__maestroManualSeek : null,
                            loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                            loopPlayStartOverrideTick: (window as any).__maestroLoopPlayStartOverrideTick ?? null,
                        });
                    }
                    if (api.tickPosition !== undefined) api.tickPosition = primeT;
                    api.player?.seekTicks?.(primeT);
                    (window as any).__maestroLoopReseat = {
                        tick: primeT,
                        at: Date.now(),
                        reason: 'loop-play-start',
                    };
                    (window as any).__maestroManualSeek = Date.now();
                    (window as any).__maestroCursor?.requestSnap?.('loop-play-start');
                    if (ORIENTATION_ANCHOR_DEBUG) {
                        console.log('[orientation-cursor-probe]', {
                            reason: 'loop-play-start-prime',
                            apiTickPosition: (api as any)?.tickPosition ?? null,
                            primeT,
                            isLandscape: isDeviceLandscape(),
                            wantStrip: forceHorizontalRef.current,
                            lastLandscapeVisibleBar: lastLandscapeVisibleBarRef.current,
                        });
                    }
                }
                // ── END loop-start cursor re-prime ────────────────────────────────────────

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
        const STABLE_TOLERANCE = 2;
        const STABLE_FRAMES_NEEDED = 2;

        const runWhenStable = () => {
            if (stabilizeRafRef.current != null) cancelAnimationFrame(stabilizeRafRef.current);
            stableFramesRef.current = 0;
            lastStableWRef.current = 0;

            const tick = () => {
                const el = containerRef.current;
                if (!el) return;
                const containerW = el.clientWidth || (window.visualViewport?.width ?? window.innerWidth);
                const isPortrait = !isDeviceLandscape();
                const isDesktop = containerW >= MOBILE_LANDSCAPE_MAX_W;

                const withinTolerance = Math.abs(containerW - lastStableWRef.current) <= STABLE_TOLERANCE;
                if (withinTolerance) { stableFramesRef.current++; }
                else { stableFramesRef.current = 0; lastStableWRef.current = containerW; }

                if (stableFramesRef.current < STABLE_FRAMES_NEEDED) {
                    stabilizeRafRef.current = requestAnimationFrame(tick);
                    return;
                }

                stabilizeRafRef.current = null;

                if (isDesktop && !isPortrait) {
                    stopLandscapeScrollLoop();
                    if (landscapeCursorRef.current) { landscapeCursorRef.current.destroy(); landscapeCursorRef.current = null; }
                }

                landscapeCursorRef.current?.updateLayout();
                reassertLayout();
            };

            stabilizeRafRef.current = requestAnimationFrame(tick);
        };

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const onResize = () => {
            if (debounceTimer !== null) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => { debounceTimer = null; runWhenStable(); }, 100);
        };

        window.addEventListener('resize', onResize);
        window.visualViewport?.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.visualViewport?.removeEventListener('resize', onResize);
            if (debounceTimer !== null) clearTimeout(debounceTimer);
            if (stabilizeRafRef.current != null) cancelAnimationFrame(stabilizeRafRef.current);
        };
    }, [reassertLayout, stopLandscapeScrollLoop]);

    useEffect(() => {
        return () => {
            if (reassertRafRef.current != null) cancelAnimationFrame(reassertRafRef.current);
            if (stabilizeRafRef.current != null) cancelAnimationFrame(stabilizeRafRef.current);
            reassertRafRef.current = null;
            stabilizeRafRef.current = null;
        };
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let raf1 = 0, raf2 = 0, raf3 = 0;
        const schedule = () => {
            cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); cancelAnimationFrame(raf3);
            raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    raf3 = requestAnimationFrame(() => {
                        gp8PmOverlayHandleRef.current?.update();
                        gp8ChordOverlayHandleRef.current?.update();
                        gp8OverlayHandleRef.current?.update();
                        gp8VibratoOverlayHandleRef.current?.updatePlacement();
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            gp8VibratoOverlayHandleRef.current?.updateClamp();
                        }));
                    });
                });
            });
        };
        const ro = new ResizeObserver(schedule);
        ro.observe(el);
        window.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('resize', schedule);
        window.addEventListener('maestro:overlays-ready', schedule);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('resize', schedule);
            window.removeEventListener('maestro:overlays-ready', schedule);
            cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); cancelAnimationFrame(raf3);
        };
    }, []);

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
            if (landscapeCursorRef.current) landscapeCursorRef.current.updateLayout();
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

            const touchState = { startX: 0, startScrollLeft: 0, isDragging: false, minScroll: 0 };
            const TAP_THRESHOLD = 8;

            const handleTouchStart = (ev: TouchEvent) => {
                const api = apiRef.current;
                const isStrip = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                if (!isStrip) return;
                touchState.startX = ev.touches[0].clientX;
                touchState.startScrollLeft = container.scrollLeft;
                touchState.isDragging = false;
                isDraggingRef.current = false;
                stopLandscapeScrollLoop();
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
                const isStrip = forceHorizontalRef.current || (apiRef.current?.settings?.display?.layoutMode === 1);
                if (!isStrip) return;
                const dx = touchState.startX - ev.touches[0].clientX;
                if (Math.abs(dx) >= TAP_THRESHOLD) {
                    if (!touchState.isDragging) {
                        const api = apiRef.current;
                        if ((api?.playerState ?? 0) === 1) { api.pause(); onPlayStateChange(false); }
                    }
                    touchState.isDragging = true;
                    isDraggingRef.current = true;
                    if (typeof window !== 'undefined') (window as any).__isUserDragging = true;
                    ev.preventDefault();
                    const maxScroll = container.scrollWidth - container.clientWidth;
                    container.scrollLeft = Math.max(touchState.minScroll, Math.min(touchState.startScrollLeft + dx, maxScroll));
                    targetScrollLeftRef.current = container.scrollLeft;
                }
            };

            const handleTouchEnd = (ev: TouchEvent) => {
                const dx = touchState.startX - (ev.changedTouches[0]?.clientX ?? touchState.startX);
                const wasTap = !touchState.isDragging && Math.abs(dx) < TAP_THRESHOLD;
                if (wasTap) {
                    const api = apiRef.current;
                    if (!api?.isReadyForPlayback) return;
                    const isStrip = forceHorizontalRef.current || (api.settings?.display?.layoutMode === 1);
                    if (!isStrip) return;
                    try {
                        if ((api.playerState ?? 0) === 1) { api.pause(); onPlayStateChange(false); }
                        else { api.play(); onPlayStateChange(true); }
                    } catch (e) {
                        console.warn('[V117] tap play/pause swallowed AudioWorklet error', e);
                    }
                } else {
                    const api = apiRef.current;
                    // Portrait mode: handleTouchStart returns early so touchState.startX
                    // stays 0, making dx always large and wasTap always false. Without
                    // this guard the drag-seek branch ran on every portrait touchend,
                    // seeked to tick 0 (bestBeat fallback), and poisoned seekTargetTickRef
                    // 300ms before BeatCustomLoopOverlay's synthesized mousedown.
                    const isStripEnd = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                    if (isStripEnd) {
                        targetScrollLeftRef.current = container.scrollLeft;
                        if (api?.isReadyForPlayback) {
                            const tickCache = (api as any)?.tickCache;
                            const bounds = api?.renderer?.boundsLookup;
                            if (tickCache?.findBeat && bounds?.findBeat) {
                                const cursorSurfaceX = getCursorSurfaceX(container);
                                const beatXUnderCursor = container.scrollLeft + cursorSurfaceX;
                                const trackSet = getTrackSet(api);
                                const masterBarsArr = ((tickCache as any).masterBars as any[]) ?? [];
                                let bestBeat: any = null, bestX = -Infinity, bestTick = 0;
                                const BEAT_EPSILON = 2;
                                for (const mb of masterBarsArr) {
                                    const mbDur = mb.masterBar?.calculateDuration?.() ?? 3840;
                                    const stepSize = Math.max(1, Math.floor(mbDur / 32));
                                    for (let t = mb.start; t < mb.start + mbDur; t += stepSize) {
                                        const r = tickCache.findBeat(trackSet, t);
                                        const b = r?.beat;
                                        if (!b) continue;
                                        const bb = bounds.findBeat(b);
                                        if (!bb?.visualBounds) continue;
                                        const bx = typeof bb.onNotesX === 'number' ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
                                        if (bx <= beatXUnderCursor + BEAT_EPSILON && bx > bestX) { bestX = bx; bestBeat = b; bestTick = mb.start + (b.playbackStart ?? 0); }
                                    }
                                }
                                if (!bestBeat && container.scrollLeft <= touchState.minScroll + 2) { bestTick = 0; bestBeat = true; }
                                if (bestBeat) {
                                    seekTargetTickRef.current = bestTick;
                                    seekFreezeUntilRef.current = Date.now() + 300;
                                    const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                                    if (seekTicks) seekTicks(bestTick);
                                    api.tickPosition = bestTick;
                                    resetBeatAcceptance();
                                    landscapeScrollStateRef.current = null;
                                }
                                cursorRef.current?.requestSnap('touch-seek');
                                resetBeatAcceptance();
                                targetScrollLeftRef.current = container.scrollLeft;
                                if ((api.playerState ?? 0) === 1) startLandscapeScrollLoop(container, api);
                            } else {
                                startLandscapeScrollLoop(container, api);
                            }
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
                cursor.requestSnap('click-seek');
                cursor.setBeat(r.beat, nb, ns, expandedStart);
                cursor.setTick(expandedTick, nb, expandedStart);
            };

            const handleClick = (ev: MouseEvent) => {
                if (ev.detail > 1) return;
                const api = apiRef.current;
                if (!api) return;
                const isStrip = forceHorizontalRef.current || (api.settings?.display?.layoutMode === 1);
                if (isStrip) return;
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

    // ─── [TH] AlphaTab resource palette — applied on theme change ───────────────
    // Gated on !isSettling: api.render() is only safe once the score is revealed.
    // lastThemeRef dedupes repeated calls (e.g. strict-mode double-fire).
    // Resources sourced from V94.6 confirmed probe — these values were stable.
    // Note: colorPatch fill guard (null / "undefined") naturally skips title/artist
    // in dark mode because AlphaTab will set a real white hex on scoreInfoColor.
    useEffect(() => {
        if (isSettling) return;
        const api = apiRef.current;
        if (!api) return;
        if (lastThemeRef.current === theme) return;
        lastThemeRef.current = theme;

        const applyThemePalette = async () => {
            const alphaTab = await import('@coderline/alphatab');
            const Color = (alphaTab as any).model.Color;
            const resources = api.settings.display.resources as any;
            if (theme === 'dark') {
                resources.staffLineColor = new Color(85, 85, 85, 255);
                resources.barSeparatorColor = new Color(136, 136, 136, 255);
                resources.mainGlyphColor = new Color(255, 255, 255, 255);
                resources.secondaryGlyphColor = new Color(224, 224, 224, 255);
                resources.scoreInfoColor = new Color(255, 255, 255, 255);
                resources.barNumberColor = new Color(153, 153, 153, 255);
            } else {
                resources.staffLineColor = new Color(153, 153, 153, 255);
                resources.barSeparatorColor = new Color(102, 102, 102, 255);
                resources.mainGlyphColor = new Color(0, 0, 0, 255);
                resources.secondaryGlyphColor = new Color(0, 0, 0, 255);
                resources.scoreInfoColor = new Color(0, 0, 0, 255);
                resources.barNumberColor = new Color(102, 102, 102, 255);
            }
            await api.updateSettings();
            api.render();
            if (isRendererDebugEnabled()) console.log('[TH] palette applied:', theme);
        };

        applyThemePalette().catch(console.error);
    }, [theme, isSettling]);

    // ─── [P6] Sync handler when prop changes after init ──────────────────────
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        const attach = () => {
            const out = (api.player?.output as any) ?? null;
            if (!out) return;
            out.handler = playerMode === 'external' ? (externalMediaHandler ?? null) : null;
        };
        const attachOnce = () => { attach(); api.playerReady?.off(attachOnce); };
        if (!api.player?.output) {
            api.playerReady?.on(attachOnce);
            return () => { api.playerReady?.off(attachOnce); };
        }
        attach();
    }, [playerMode, externalMediaHandler]);

    // ─── [P7] Switch PlayerMode enum when prop changes ────────────────────────
    useEffect(() => {
        const api = apiRef.current;
        const at = alphaTabModuleRef.current;
        if (!api || !at) return;
        const modeMap: Record<string, any> = {
            synthesizer: (at as any).PlayerMode?.EnabledSynthesizer,
            external: (at as any).PlayerMode?.EnabledExternalMedia,
            disabled: (at as any).PlayerMode?.Disabled,
        };
        const mode = modeMap[playerMode ?? 'synthesizer'];
        if (mode == null) return;
        (api.settings.player as any).playerMode = mode;
        api.updateSettings();
    }, [playerMode]);

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

            <div style={{ position: 'relative', zIndex: 10, isolation: 'isolate' as any }}>
                {/*
                    Shell — carries the reading-column inset.
                    🔒 55px = Songsterr parity (2.2cm gutter, probe-confirmed)
                */}
                <div
                    ref={shellRef}
                    className="alphatab-shell"
                    style={{
                        position: 'relative',
                        width: '100%',
                        boxSizing: 'border-box' as const,
                        paddingLeft: (forceHorizontal || !showGutters) ? 'env(safe-area-inset-left, 0px)' : '55px',
                        paddingRight: (forceHorizontal || !showGutters) ? 'env(safe-area-inset-right, 0px)' : '55px',
                    }}
                >
                    {/*
                      alphatab-content-host — shared coordinate origin for containerRef + loop overlay.
                      shellRef owns the 55px gutters via padding. absolute inset-0 inside shellRef
                      still starts at the outer padding edge, so the overlay was 55px off.
                      This inner host sits inside the padded content box — containerRef and the
                      overlay both use this as their position:relative ancestor, so visualBounds
                      x/y coords from AlphaTab map 1:1 to overlay left/top with no gutter offset.
                    */}
                    <div className="alphatab-content-host" style={{ position: 'relative' }}>
                        <div
                            ref={containerRef}
                            className="alphatab-container"
                            style={{
                                position: 'relative',
                                width: '100%',
                                overflow: 'hidden',
                                WebkitOverflowScrolling: 'touch' as any,
                                background: bgColor,
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
                                    isLandscape={forceHorizontal}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export const AlphaTabRenderer = AlphaTabRendererV102;