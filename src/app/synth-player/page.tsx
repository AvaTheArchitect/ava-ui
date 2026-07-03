'use client';

/**
 * Synth Player Page — Phase 4 V102.17
 * Date: June 27, 2026
 * Cloned from V102.16 — TopMenuTray scroll reveal + native scrollbar gutter stabilization.
 *
 * MAESTRO-UI-002J (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Adds isPausedCanvasUpReveal to onScroll's delta < 0 hasReasonToReveal: probe evidence
 *        showed the canvas visibly scrolling upward while paused (isPlaying: false) still hit
 *        reason: 'no-recent-user-intent' when every touch/wheel/momentum intent window had
 *        already expired, so reveal only ever happened via the onScroll curr < 10 near-top
 *        fallback. The [TG3-PlaybackGuard] recent-intent gate exists to stop AlphaTab/S1
 *        programmatic scroll corrections from revealing the tray mid-playback — S1 only
 *        scrolls during active playback, so isPlayingRef.current === false already proves this
 *        delta < 0 can't be a programmatic S1 correction, making the canvas moving upward
 *        reason enough on its own while paused, independent of any intent-window state.
 *        isPausedCanvasUpReveal = !isPlayingRef.current, folded into the existing
 *        hasReasonToReveal OR-chain — reuses the existing allowReveal/apply block unchanged,
 *        so it inherits setHeaderVisible(true), the manualHeaderHideIntentUntilRef/
 *        deferredTopReveal clears, and the 160ms headerToggleLockUntilRef cooldown for free.
 *        When isPlayingRef.current is true, isPausedCanvasUpReveal is false and
 *        hasReasonToReveal falls back to exactly the pre-existing three checks — playback
 *        protection is unchanged. New probe reason: 'paused-canvas-up' (the last fallback in
 *        the appliedReason chain, after applied/momentum-reveal/recent-touch-activity).
 *        onWheel (both hide and up-reveal-marking), the scrollbar-explicit branch,
 *        touchmove's directional branches, and requestHeaderHide are unchanged. The V145.26
 *        S1 playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002I (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Two additions on top of UI-002G's deferred-touch-reveal/momentum-bridge machinery,
 *        aimed at long/sparse-event mobile flicks:
 *        (1) Momentum continuation renewal — a touch-owned delta < 0 onScroll tick (i.e.
 *        hasRecentTouchActivity or hasMomentumRevealIntent is live) now renews both windows
 *        to Date.now() + 700 and sets the new lastManualScrollDirectionRef to 'up', so a
 *        long sustained upward flick's own scroll events keep the window alive instead of
 *        letting it expire mid-flick. Inherently guarded: renewal can only extend a window
 *        that was already live, and both refs are only ever set by real touch events, never
 *        playback/programmatic scroll. If the header is already visible on a touch-owned
 *        tick, skips the redundant re-lock/re-reveal (same churn-avoidance pattern UI-002H
 *        applied to curr < 10), logging reason: 'momentum-renewed'.
 *        (2) scheduleDeferredTouchReveal now takes an explicit lockRemaining and gained the
 *        full re-check/probe surface from the spec (aborted-header-visible/aborted-no-main/
 *        aborted-scroll-not-up/aborted-no-touch-window/fired-applied), and the delta < 0
 *        "blocked by cooldown" branch now computes headerHidden/lockRemaining explicitly and
 *        distinguishes cooldown-deferred (schedules) from cooldown (nothing to defer,
 *        already visible) from no-recent-user-intent.
 *        Important finding, reported in detail: allowReveal's existing formula was
 *        deliberately left unchanged (bypasses cooldown entirely for any non-scrollbar-drag
 *        source, which covers touch) to avoid any risk to desktop wheel-up responsiveness —
 *        so cooldown-deferred remains reachable today mainly through the scrollbar-drag-
 *        direction-unknown-in-cooldown edge case (dead code for real scrollbar drags, which
 *        never reach this branch), same as before. The momentum-renewal fix (1) is the one
 *        that actually targets the reported long-flick/sparse-event symptom. onWheel, the
 *        scrollbar-explicit branch, and requestHeaderHide are unchanged. The V145.26 S1
 *        playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002H (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Fixes the actual root cause behind UI-002G's remaining mid-document touch-reveal
 *        gap: touchstart/touchmove/touchend were already window-capture (not on <main>), but
 *        onTouchStart's el.contains(e.target) filter was observed (via a window-capture edge
 *        probe) silently rejecting legitimate score-surface gestures — svg score rows,
 *        .at-surface, the score wrapper div — leaving the touch never armed, so the whole
 *        touch-directional path (UI-002D/F/G) sat out and only the onScroll curr < 10
 *        rubber-band-at-top fallback ever caught the reveal. Adds isTouchOnMainScrollSurface
 *        (target-based containment OR document.elementFromPoint geometry-based containment,
 *        both excluding the TopMenu tray / buttons / links / inputs / selects / textareas) as
 *        the new touchstart gate — reuses window capture / passive: true, no preventDefault,
 *        no duplicate listener path. onTouchMove keeps working purely off isTouchActiveRef for
 *        an already-armed gesture (only re-checks isTouchOnMainScrollSurface to self-heal a
 *        move that arrives without a matching touchstart). onTouchEnd now only marks activity/
 *        arms the momentum bridge when the touch was actually active, so an untracked
 *        touchend (e.g. from a tap on a button) can't re-arm the bridge off a stale
 *        lastTouchIntentDirectionRef left by an earlier gesture. Also fixes a lock-churn bug
 *        in onScroll's curr < 10 branch: iOS rubber-band bounce at the top fired many curr < 10
 *        events while the header was already visible, each one needlessly refreshing
 *        headerToggleLockUntilRef — now short-circuits with reason: 'already-visible' before
 *        touching setHeaderVisible or the lock at all. onWheel, the scrollbar-explicit branch,
 *        and requestHeaderHide are unchanged. The V145.26 S1 playback resolver in
 *        AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002G (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Adds a direction-agnostic touch-ownership bridge for onScroll's delta < 0 reveal branch:
 *        fast mobile "thumb spin" upward scrolling could still require several swipes before
 *        the tray revealed, because Safari sometimes reports momentum scroll deltas that
 *        don't line up 1:1 with raw touchmove Y deltas, so UI-002F's reveal-direction-only
 *        momentum bridge (touchMomentumRevealIntentUntilRef) could miss it. New
 *        recentTouchActivityUntilRef (Date.now()-based, markRecentTouchActivity() helper) is
 *        set from touchstart/touchmove/touchend regardless of direction — it only proves "a
 *        real touch gesture recently owned this scroll," never toggling visibility itself.
 *        onScroll's delta < 0 hasReasonToReveal now also accepts a live
 *        recentTouchActivityUntilRef window. Also adds a deferredTouchRevealTimerRef safety
 *        net (mirroring UI-002C's deferredTopRevealTimerRef) for the case where a touch/
 *        momentum-backed reveal is valid but blocked only by the headerToggleLockUntilRef
 *        cooldown — currently unreachable given the existing allowReveal formula (real
 *        scrollbar drags never reach this branch), kept as defense in depth. Cleared on a
 *        successful reveal, and by two pure additive one-line clears inside onWheel's
 *        deltaY > 0 branch and the scrollbar-explicit hide branch (neither branch's existing
 *        hide decision/timing changed) — deliberately NOT cleared inside touch-hide, per
 *        spec, since the point is touch ownership, not direction. Probe gets a
 *        recentTouchActivityRemaining field and onScroll-delta-lt-0's reason now
 *        distinguishes applied/momentum-reveal/recent-touch-activity/cooldown/
 *        no-recent-user-intent. requestHeaderHide, the wheel-down branch's own hide logic,
 *        and the scrollbar branch's own hide/reveal logic are otherwise unchanged. The
 *        V145.26 S1 playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002F (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Bridges mobile inertial/momentum scroll for reveal: UI-002E's probe showed repeated
 *        onScroll-delta-lt-0 events after a fast upward flick with isTouchActive: false and
 *        userIntentRemaining: 0 — native momentum keeps firing delta < 0 scroll events after
 *        touch-up, but both intent windows had already expired, so the reveal gate rejected
 *        them. Adds lastTouchIntentDirectionRef (set by onTouchMove past the deadzone, reset
 *        at touchstart) and touchMomentumRevealIntentUntilRef (armed by onTouchMove's reveal
 *        branch, re-extended to Date.now() + 1800 by onTouchEnd/onTouchCancel only when the
 *        last active-gesture direction was 'reveal'). onScroll's delta < 0 branch now accepts
 *        either hasRecentUserIntent OR a live touchMomentumRevealIntentUntilRef window.
 *        Momentum ref is only ever written from real touchmove/touchend, cleared on any real
 *        downward scroll delta (single choke point at the top of onScroll — covers wheel-down/
 *        scrollbar-drag-down/touch-hide without touching those branches) and after a
 *        successful reveal. Also fixes a units bug in the UI-002E probe itself:
 *        userIntentRemaining compared a performance.now()-based ref against Date.now(),
 *        always reading 0 — diagnostic-only fix, the real userScrollIntentUntilRef gate
 *        elsewhere was never affected. The wheel-down immediate-hide path, the desktop
 *        scrollbar explicit branch, and requestHeaderHide are unchanged. The V145.26 S1
 *        playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002E (TEMPORARY DIAGNOSTIC — not for commit):
 * ✅ Adds a tiny header-intent probe ring buffer (headerIntentProbeState, 80 events max) to
 *        help diagnose why mobile touch reveal is still sometimes sluggish/missed on Safari
 *        LAN and Chrome mobile emulator. Records from onTouchMove (before branching, the
 *        hide/reveal branches, the interactive/tray skip), requestHeaderHide (immediate/
 *        deferred/blocked/deferred-fire), and onScroll's curr < 10 and delta < 0 reveal
 *        paths. Read-only: every recorded value is already computed by the real logic; no
 *        branch, threshold, or condition was changed to make this observable (guard booleans
 *        like canHide/canReveal/canApply are pure extractions of the pre-existing inline
 *        conditions). Console output only when localStorage.getItem('maestro_header_debug')
 *        === '1'; dump with window.__maestroDumpHeaderIntentProbe(), clear with
 *        window.__maestroClearHeaderIntentProbe(). No behavior change.
 *
 * MAESTRO-UI-002D (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Makes mobile touchmove directional and explicit, matching the UI-002C scrollbar-drag
 *        branch: onTouchMove now computes dy against a small (2px) deadzone and, past that
 *        deadzone, clears the opposing manual-intent ref and toggles header visibility
 *        immediately (cooldown-checked via headerToggleLockUntilRef) instead of only marking
 *        reveal intent and waiting for a later onScroll delta — closing the sluggish/missed
 *        hide-reveal gap reported on mobile Safari/Chrome mobile emulator. Touches starting
 *        on an interactive control (button/link/input/select/textarea) or the TopMenu tray
 *        never toggle the header directly (the tray is already excluded by the existing
 *        el.contains(e.target) check in onTouchStart, since it isn't a descendant of <main>).
 *        userScrollIntentUntilRef is still extended on every touchmove regardless of the
 *        deadzone. Momentum/inertial scroll after finger-lift is untouched — touchmove stops
 *        firing at that point, so any hide/reveal during momentum is still owned entirely by
 *        the existing onScroll delta handling. The UI-002B wheel-down path, the UI-002C
 *        scrollbar-drag branch, and requestHeaderHide (playback S1 hide) are unchanged. The
 *        V145.26 S1 playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002C (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Fixes two scrollbar-drag issues left by UI-002B: (1) drag-down then drag-back-to-top
 *        could leave the tray stranded hidden at scrollTop 0 because manualHeaderHideIntentUntilRef
 *        stayed live and no further scroll event arrived to recheck it once the window
 *        expired; (2) drag-up mid-document could have delayed/missed reveal because it relied
 *        on the same accumulated-delta inference as ambient scroll. onScroll now: (a) clears
 *        the opposing manual intent ref on any direction reversal (delta < 0 clears
 *        manualHeaderHideIntentUntilRef, delta > 0 clears manualHeaderRevealIntentUntilRef);
 *        (b) treats an active scrollbar drag (isPointerOnScrollbarRef) as fully explicit,
 *        directional intent — bypasses the accumulated delta > 4 / delta < 0 thresholds
 *        entirely and hides/reveals immediately (cooldown-checked); (c) adds a
 *        deferredTopRevealTimerRef safety net — when curr < 10 would reveal but is
 *        suppressed only by a still-live hide-intent window, schedules exactly one recheck
 *        for when that window expires, so the header can never stay stranded hidden with no
 *        further scroll event to re-evaluate it. The UI-002B wheel-down immediate-hide path
 *        in onWheel is unchanged. Manual hide/reveal intent remains a page.tsx-only concern,
 *        fully separate from playback S1 hide intent (requestHeaderHide) — the V145.26 S1
 *        playback resolver in AlphaTabRenderer.tsx is untouched.
 *
 * MAESTRO-UI-002B (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Adds manual header-HIDE-intent arbitration (manualHeaderHideIntentUntilRef,
 *        markManualHeaderHideIntent) mirroring UI-002A's reveal-intent ref for the opposite
 *        direction. Fixes: a deliberate wheel-down gesture near the top/start of playback
 *        did not hide the tray immediately — it waited for either an accumulated onScroll
 *        delta > 4 (a single fine-grained wheel/trackpad tick is often smaller than that) or
 *        for S1's Row 1 → Row 2 auto-hide trigger. onWheel now hides immediately on
 *        deltaY > 0 (cooldown-protected), and marks manual hide intent so the curr < 10
 *        "always reveal near top" guard doesn't immediately undo it while scrollTop is still
 *        small. Scrollbar-drag-down gets the same top-guard protection (isPointerOnScrollbarRef
 *        is only ever set by a real pointerdown on the rail, never programmatic scroll).
 *        Manual scroll/touch reveal intent and manual hide intent remain two separate,
 *        independently-arbitrated concerns from playback S1 hide intent — nothing here
 *        changes when/why AlphaTabRenderer requests a hide, only whether/when page.tsx's own
 *        position-based reveal guard is allowed to override a just-requested manual hide. The
 *        V145.26 S1 playback resolver/scroll math in AlphaTabRenderer.tsx, and the existing
 *        Row 1 → Row 2 auto-hide trigger, are intentionally untouched.
 *
 * MAESTRO-UI-002A (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Adds manual header-reveal-intent arbitration (manualHeaderRevealIntentUntilRef,
 *        markManualHeaderRevealIntent, deferredHeaderHideTimerRef) so a playback-driven
 *        requestHeaderHide() call from AlphaTabRenderer's S1 row-advance trigger no longer
 *        immediately stomps a tray the user just manually revealed (scroll-up, upward touch
 *        drag) — the hide is deferred until the manual-reveal window expires, then
 *        re-validated (still playing, scrollTop > 80, window actually expired) before
 *        applying. Manual scroll/touch reveal intent is a separate concern from playback S1
 *        hide intent — the two are arbitrated in requestHeaderHide, not merged into one ref.
 *        Adds passive touchstart/touchmove/touchend/touchcancel listeners (no preventDefault)
 *        to extend userScrollIntentUntilRef and mark manual-reveal intent on upward touch
 *        drags, closing the gap where mobile Safari/touch inertia can outlast the existing
 *        500ms pointerdown intent window. The V145.26 S1 playback resolver/scroll math in
 *        AlphaTabRenderer.tsx is intentionally untouched — this only changes whether/when
 *        page.tsx applies a hide that AlphaTab already requested.
 *
 * MAESTRO-UI-001 candidate (checkpoint, not yet OFFICIAL or LOCKED):
 * ✅ Synchronous headerIntentRef, S1 sysIdx-driven TopMenu hide after Row 1,
 *        playback-safe near-top reveal gate.
 *        MAESTRO-UI-002 remains open: manual scroll-down TopMenu hide
 *        responsiveness is a separate lane, not addressed here.
 *
 * V102.17 CHANGES:
 * ✅ TopMenuTray reveals immediately on manual upward scroll/pull.
 * ✅ Manual reveal works during playback; playback-start still hides the tray once.
 * ✅ <main> top padding is stable; removed padding-transition feedback loop.
 * ✅ Desktop/fine-pointer fixed chrome reserves native scrollbar gutter with pointer-fine:right-3.75
 *    applied to TopMenuTray wrapper, page.tsx footer wrapper, TransportBar fixed root,
 *    and MaestroControlPanel mobile fixed root.
 * ✅ <main> uses [scrollbar-gutter:stable] to prevent scrollbar width pulse / AlphaTab re-render jitter.
 * ✅ Native scrollbar drag stabilized with branch-aware 160ms cooldown and pointer-direction gating.
 *    - curr < 10: always reveals, bypasses cooldown.
 *    - delta > 4: hides only outside cooldown window.
 *    - delta < 0: reveals immediately for wheel/trackpad; for scrollbar drag requires confirmed
 *      upward pointer movement (pointerDeltaYRef < 0) or cooldown expiry as fallback.
 * ✅ Pointer cleanup now covers pointerup, pointercancel, and mouseup via shared resetScrollbarPointer.
 * ✅ No cursor/AlphaTabRenderer logic touched.
 *
 * V102.16 CHANGES:
 * ✅ [VA1] TopMenuTray wrapper: duration-300 → duration-200 ease-out + will-change-transform.
 *          200ms ease-out matches Songsterr's snappier slide feel.
 *          will-change-transform promotes the layer to GPU before animation fires.
 *
 * V102.15 REFERENCE (intent-guard baseline — scroll reveal logic extended in V102.17):
 * ✅ [TG4-clean] All unconditional diagnostic logs removed (module, render, effect).
 * ✅ Remaining debug output gated behind localStorage.getItem('maestro_header_debug') === '1'.
 * ✅ [TG1] wheel → window capture, filtered by el.contains(target). Sets userScrollIntentUntilRef 700ms on scroll-up.
 * ✅ [TG2] pointerdown → window capture, same filter. Scrollbar heuristic: clientX > rect.right - 20. Sets intent 1000ms.
 * ✅ [TG-cleanup] Both window listeners removed with matching { capture: true }.
 * ✅ [PS1b] Tray hides immediately when isPlaying → true.
 * ✅ [PS3-removed] No auto-restore on pause.
 * ✅ All V102.11/V102.10/V102.9/V102.7 changes intact.
 */

import React, {
    useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { supabase } from '@/lib/alphaTab/supabase';
// 🔒 DEPLOYMENT ENTRYPOINT — always import from AlphaTabRenderer, never from versioned files.
import { AlphaTabRendererV102 } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray, MobileToolsSlideout } from '@/components/audio/maestro/layout';
import { MyTabsPanel } from '@/components/audio/maestro/tabs/MyTabsPanel';
import { NewTabPanel } from '@/components/audio/maestro/tabs/NewTabPanel';
import { MetadataEditorPanel } from '@/components/audio/maestro/tabs/MetadataEditorPanel';
import { YouTubePlayer } from '@/components/audio/maestro/media/YouTubePlayer';
import {
    CountInOverlay,
    useSmartMetronome,
    type MetronomeSoundType,
    type SubdivisionMode,
} from '@/components/audio/maestro/controls';
import { fetchSongs } from '@/lib/song-data/queries';
import { getSongById, type SongState } from '@/lib/song-data';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

const SCROLL_THRESHOLD = 50;

// ── V102.6: Cursor A/B toggle ─────────────────────────────────────────────────
const CURSOR_V2_ACTIVE = true;
// ─────────────────────────────────────────────────────────────────────────────

// ── [MAESTRO-UI-002E] Header-intent probe — TEMPORARY DIAGNOSTIC, not for commit ──
// Tiny ring buffer for mobile touch/header-intent gates, in the spirit of
// AlphaTabRenderer's S1BoundaryProbe but much smaller. Read-only: every value recorded is
// already computed by the real hide/reveal logic below — this only records it, never applies
// anything and never changes a threshold or branch. Console output only when
// localStorage.getItem('maestro_header_debug') === '1'; dump with
// window.__maestroDumpHeaderIntentProbe(), clear with window.__maestroClearHeaderIntentProbe().
type HeaderIntentProbeEvent = Record<string, unknown>;
const HEADER_INTENT_PROBE_MAX_EVENTS = 80;
const headerIntentProbeState: { events: HeaderIntentProbeEvent[] } = { events: [] };

function isHeaderDebugEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('maestro_header_debug') === '1'; } catch { return false; }
}

function recordHeaderIntentProbe(evt: HeaderIntentProbeEvent): void {
    headerIntentProbeState.events.push(evt);
    if (headerIntentProbeState.events.length > HEADER_INTENT_PROBE_MAX_EVENTS) {
        headerIntentProbeState.events.shift();
    }
    if (isHeaderDebugEnabled()) {
        console.log('[header-intent-probe]', evt);
    }
}

if (typeof window !== 'undefined') {
    (window as any).__maestroDumpHeaderIntentProbe = () => ({
        count: headerIntentProbeState.events.length,
        events: headerIntentProbeState.events.slice(-HEADER_INTENT_PROBE_MAX_EVENTS),
    });
    (window as any).__maestroClearHeaderIntentProbe = () => {
        headerIntentProbeState.events.length = 0;
    };
}

export default function SynthPlayerPage() {
    // ==================== API & CORE STATE ====================
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ==================== PLAYBACK STATE ====================
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);
    const [playerReady, setPlayerReady] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    // [C5] audioSource is now state — was 'synth' as const
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');

    // ==================== YOUTUBE STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const youtubePlayerRef = useRef<any>(null);
    const pauseTransitionRef = useRef<boolean>(false);

    // ==================== MASTER VOLUME ====================
    const [masterVolume, setMasterVolume] = useState<number>(1.0);
    const masterVolumeRef = useRef<number>(1.0);
    useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);

    // ==================== COUNT IN ====================
    const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(false);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const [countdownValue, setCountdownValue] = useState<number>(0);
    const [countInMode, setCountInMode] = useState<'three-beat' | 'four-beat'>('three-beat');

    // ==================== METRONOME ====================
    const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(false);
    const [metronomeVolume, setMetronomeVolume] = useState<number>(0.7);
    const [metronomeBalance, setMetronomeBalance] = useState<number>(0);
    const [metronomeSoundType, setMetronomeSoundType] = useState<MetronomeSoundType>('woodblock');
    const [metronomeSubdivision, setMetronomeSubdivision] = useState<SubdivisionMode>(1);
    const [metronomeAccentEnabled, setMetronomeAccentEnabled] = useState<boolean>(true);
    const [currentBPM, setCurrentBPM] = useState<number>(120);

    const { effectiveBPM, armMetronome } = useSmartMetronome({
        isEnabled: isMetronomeEnabled,
        currentBPM,
        audioSource,
        isPlaying,
        isCountingDown,
        volume: metronomeVolume,
        balance: metronomeBalance,
        soundType: metronomeSoundType,
        subdivision: metronomeSubdivision,
        accentEnabled: metronomeAccentEnabled,
    });

    // ==================== PITCH SHIFT ====================
    const [pitchShift, setPitchShift] = useState<number>(0);
    const [tuningData, setTuningData] = useState<number[]>([64, 59, 55, 50, 45, 40]);
    const [isPitchPopoverOpen, setIsPitchPopoverOpen] = useState<boolean>(false);
    const [pitchPopoverAnchor, setPitchPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

    // ==================== LOOP STATE ====================
    const [isLooping, setIsLooping] = useState<boolean>(false);
    const [hasLoopSelection, setHasLoopSelection] = useState<boolean>(false);
    const [playbackRange, setPlaybackRange] = useState<{ startTick: number; endTick: number } | null>(null);

    // ==================== TRACK MIXER ====================
    const [trackMuteState, setTrackMuteState] = useState<Map<number, boolean>>(new Map());
    const [trackSoloState, setTrackSoloState] = useState<Map<number, boolean>>(new Map());
    const originalTrackVolsRef = useRef<Map<number, number>>(new Map());

    // ==================== THEME ====================
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // ==================== SONG STATE ====================
    const [songState, setSongState] = useState<SongState>({ songs: [], playlists: [], currentSongId: null });
    const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);
    const [isNewTabOpen, setIsNewTabOpen] = useState(false);
    const [metaEditorState, setMetaEditorState] = useState<{ tabId: string | null; source: 'mytabs' | 'newtab' | null }>
        ({ tabId: null, source: null });

    // ==================== SIGNED URL CACHE ====================
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());
    const signedUrlRetryRef = useRef<Set<string>>(new Set());

    // ==================== FETCH SONGS + BATCH SIGN ====================
    // [C1] Extracted to useCallback so NewTabPanel can trigger a re-fetch after upload.
    // ?? preserves the currently playing song instead of jumping back to index 0.
    const refetchSongs = useCallback(async () => {
        const songs = await fetchSongs();
        if (!songs.length) return;
        const paths = songs
            .map(s => s.file_path || (s.file_name && s.file_extension ? `${s.file_name}.${s.file_extension}` : null))
            .filter(Boolean) as string[];
        const { data: urlData } = await supabase.storage.from('tabs').createSignedUrls(paths, 3600);
        if (urlData) {
            const expiresAt = Date.now() + 55 * 60 * 1000;
            urlData.forEach(entry => {
                if (entry.path && entry.signedUrl)
                    signedUrlCacheRef.current.set(entry.path, { url: entry.signedUrl, expiresAt });
            });
            console.log(`✅ Phase 3: Batch signed ${urlData.length} URLs`);
        }
        const sortedSongs = songs
            .slice()
            .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' }));
        setSongState(prev => ({
            ...prev,
            songs: sortedSongs,
            currentSongId: prev.currentSongId ?? sortedSongs[0]?.id ?? null,
        }));
    }, []);
    useEffect(() => { refetchSongs(); }, [refetchSongs]);

    const currentSong = useMemo(
        () => getSongById(songState.songs, songState.currentSongId || ''),
        [songState.songs, songState.currentSongId],
    );

    // Derived YouTube ID — after currentSong so the reference is valid
    const defaultYouTubeId = useMemo(() =>
        (currentSong as any)?.youtubeVideoId ?? null,
        [currentSong]);
    const activeVideoId = currentVideoId || defaultYouTubeId;

    // Reset video override when song changes
    useEffect(() => {
        setCurrentVideoId(null);
        setIsYouTubeReady(false);
    }, [defaultYouTubeId]);

    // ==================== SIGNED URL RESOLVER ====================
    useEffect(() => {
        // [C4] Support file_path-only rows (new uploads) alongside legacy file_name+extension rows.
        const path =
            currentSong?.file_path ||
            (currentSong?.file_name && currentSong?.file_extension
                ? `${currentSong.file_name}.${currentSong.file_extension}`
                : null);
        if (!path) return;
        setSignedUrl(null);
        setSongInfo(null);
        setTracks([]);
        setSelectedTrack(0);
        setError(null);
        signedUrlRetryRef.current.delete(path);
        const cached = signedUrlCacheRef.current.get(path);
        if (cached && cached.expiresAt > Date.now()) {
            setSignedUrl(cached.url);
        } else {
            supabase.storage.from('tabs').createSignedUrl(path, 3600).then(({ data, error }) => {
                if (error || !data?.signedUrl) {
                    setError(`Failed to load tab for "${currentSong?.title ?? 'this tab'}"`);
                    return;
                }
                const expiresAt = Date.now() + 55 * 60 * 1000;
                signedUrlCacheRef.current.set(path, { url: data.signedUrl, expiresAt });
                setSignedUrl(data.signedUrl);
            });
        }
    }, [currentSong]);

    // ==================== EXTERNAL CLOCK DRIVER ====================
    // RAF-based monotonic clock driver for Original mode cursor.
    // - Monotonic clamp prevents AlphaTab seeing backward time (main jitter cause).
    // - RAF produces smoother cursor motion than setInterval.
    // - State dedup in handleYouTubeStateChange prevents api.play() spam during buffering.
    const lastDrivenMsRef = useRef<number>(0);
    const externalClockRafRef = useRef<number | null>(null);
    const SEEK_BACKWARD_THRESHOLD_MS = 800; // treat as user seek if time jumps back > this

    useEffect(() => {
        if (audioSource !== 'original') return;
        if (!api || !isYouTubeReady) return;
        const out = (api.player?.output as any) ?? null;
        if (!out || typeof out.updatePosition !== 'function') return;

        const tick = () => {
            if (isPlayingRef.current && youtubePlayerRef.current?.getCurrentTime) {
                const ytSecs = youtubePlayerRef.current.getCurrentTime();
                const offset = (currentSong as any)?.videoStartOffset ?? 0;
                const rawMs = Math.max(0, ytSecs - offset) * 1000;
                const lastMs = lastDrivenMsRef.current;
                // Allow genuine user seeks (big backward jump), otherwise clamp monotonic
                const isBigBackwardSeek = rawMs < lastMs - SEEK_BACKWARD_THRESHOLD_MS;
                const timeMs = isBigBackwardSeek ? rawMs : Math.max(lastMs, rawMs);
                lastDrivenMsRef.current = timeMs;
                out.updatePosition(timeMs);
                currentTimeRef.current = timeMs;
            }
            externalClockRafRef.current = requestAnimationFrame(tick);
        };

        externalClockRafRef.current = requestAnimationFrame(tick);
        return () => {
            if (externalClockRafRef.current !== null) {
                cancelAnimationFrame(externalClockRafRef.current);
                externalClockRafRef.current = null;
            }
            lastDrivenMsRef.current = 0;
        };
    }, [audioSource, api, isYouTubeReady, currentSong]);

    // ==================== TIME TRACKING ====================
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    useEffect(() => {
        if (!isPlaying) return;
        const id = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);
        return () => clearInterval(id);
    }, [isPlaying]);

    // ==================== SCROLL / LAYOUT ====================
    const mainScrollContainerRef = useRef<HTMLElement>(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
    // MAESTRO-SCROLL-001: synchronous header intent. S1 reads this, never the
    // transform-animated DOM rect. Mirrors the isPlayingRef pattern (line 79/487).
    const headerIntentRef = useRef<boolean>(true);
    const setHeaderVisible = useCallback((v: boolean) => {
        headerIntentRef.current = v;   // synchronous — before React commit or CSS transition
        setIsHeaderVisible(v);
    }, []);

    // [MAESTRO-UI-002E] Assembles the shared header-intent probe fields from component-scope
    // refs and forwards to the module-level ring buffer (recordHeaderIntentProbe above).
    // Diagnostic only — reads existing refs, computes nothing that feeds back into any
    // hide/reveal decision. headerIntentRef.current stands in for the isHeaderVisible state
    // value: setHeaderVisible always writes headerIntentRef synchronously, so the two are
    // never observably out of sync at any call site that would invoke this probe.
    const probeHeaderIntent = useCallback((label: string, extra: Record<string, unknown> = {}) => {
        const nowP = performance.now();
        const dateNow = Date.now();
        recordHeaderIntentProbe({
            label,
            nowP,
            dateNow,
            scrollTop: mainScrollContainerRef.current?.scrollTop ?? null,
            headerIntent: headerIntentRef.current,
            isHeaderVisible: headerIntentRef.current,
            isPlaying: isPlayingRef.current,
            lockRemaining: Math.max(0, headerToggleLockUntilRef.current - nowP),
            revealIntentRemaining: Math.max(0, manualHeaderRevealIntentUntilRef.current - dateNow),
            hideIntentRemaining: Math.max(0, manualHeaderHideIntentUntilRef.current - dateNow),
            // [MAESTRO-UI-002F] Fix: userScrollIntentUntilRef is always written in
            // performance.now() units (onWheel/onTouchMove/onPointerDown) — comparing it
            // against dateNow (Date.now()) made this field read 0 unconditionally. Diagnostic
            // field only; does not touch the real userScrollIntentUntilRef gate anywhere else.
            userIntentRemaining: Math.max(0, userScrollIntentUntilRef.current - nowP),
            // [MAESTRO-UI-002F] Verifies the momentum-reveal bridge is active — see
            // touchMomentumRevealIntentUntilRef.
            touchMomentumRevealRemaining: Math.max(0, touchMomentumRevealIntentUntilRef.current - dateNow),
            // [MAESTRO-UI-002G] Verifies the direction-agnostic touch-ownership bridge is
            // active — see recentTouchActivityUntilRef.
            recentTouchActivityRemaining: Math.max(0, recentTouchActivityUntilRef.current - dateNow),
            isTouchActive: isTouchActiveRef.current,
            isPointerOnScrollbar: isPointerOnScrollbarRef.current,
            ...extra,
        });
    }, []);

    // MAESTRO-SCROLL-001: passed to AlphaTabRenderer so the live S1 scroll path can
    // request the hide itself (Row-1 hide trigger) instead of reading tray DOM geometry.
    // [MAESTRO-UI-002] Arbitrates against a recent manual reveal: if the user just revealed
    // the tray (scroll-up, upward touch drag), the hide is deferred instead of immediately
    // stomping it, then re-validated once the reveal window expires. This does not change
    // when/why AlphaTabRenderer *requests* a hide (V145.26 S1 resolver untouched) — only
    // whether/when page.tsx applies it.
    const requestHeaderHide = useCallback(() => {
        if (!headerIntentRef.current) {
            // [MAESTRO-UI-002E] Diagnostic only.
            probeHeaderIntent('requestHeaderHide', { action: 'none', reason: 'already-hidden' });
            return;
        }

        const now = Date.now();
        if (now >= manualHeaderRevealIntentUntilRef.current) {
            if (deferredHeaderHideTimerRef.current != null) {
                clearTimeout(deferredHeaderHideTimerRef.current);
                deferredHeaderHideTimerRef.current = null;
            }
            setHeaderVisible(false);
            probeHeaderIntent('requestHeaderHide', { action: 'hide', reason: 'immediate' });
            return;
        }

        // Manual reveal intent still active — defer rather than override it immediately.
        if (deferredHeaderHideTimerRef.current != null) {
            probeHeaderIntent('requestHeaderHide', { action: 'none', reason: 'defer-already-scheduled' });
            return; // already scheduled
        }

        const delay = Math.max(0, manualHeaderRevealIntentUntilRef.current - now);
        probeHeaderIntent('requestHeaderHide', { action: 'none', reason: 'deferred' });
        deferredHeaderHideTimerRef.current = setTimeout(() => {
            deferredHeaderHideTimerRef.current = null;
            const curr = mainScrollContainerRef.current?.scrollTop ?? 0;
            const canApply = Boolean(
                headerIntentRef.current &&
                isPlayingRef.current &&
                mainScrollContainerRef.current &&
                curr > 80 &&
                Date.now() >= manualHeaderRevealIntentUntilRef.current
            );
            if (canApply) {
                setHeaderVisible(false);
            }
            // [MAESTRO-UI-002E] Diagnostic only.
            probeHeaderIntent('requestHeaderHide-deferred-fire', {
                action: canApply ? 'hide' : 'none',
                reason: canApply ? 'deferred-applied' : 'deferred-revalidation-failed',
            });
        }, delay);
    }, [setHeaderVisible, probeHeaderIntent]);
    const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let last: boolean | null = null;
        const check = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                const land = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
                const compact = typeof window !== 'undefined' && window.innerHeight < 600;
                const v = touch && land && compact;
                if (last !== v) { last = v; setIsMobileLandscape(v); }
            }, 150);
        };
        check();
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', check);
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('resize', check);
            window.removeEventListener('orientationchange', check);
        };
    }, []);

    // ==================== TRAY AUTO-HIDE (scroll + playback) ====================
    // Songsterr rule: tray hides when playing starts, ONLY comes back from:
    //   (a) manual scroll-up gesture while paused, or (b) scrolling to within 10px of top.
    // No auto-restore on pause — user must actively scroll up to reveal.
    //
    // [TG1] wheel → window capture: AlphaTab's .at-surface SVG swallows wheel events
    //        before they bubble to <main>. Capture on window sees them first.
    // [TG2] pointerdown → window capture: same reason. Scrollbar detection via clientX.
    // [TG3] scroll-up reveal gated by userScrollIntentUntilRef — note clicks that cause
    //        programmatic auto-scroll no longer accidentally reveal the tray.

    // [PS2] Tracks previous scrollTop for direction detection.
    const lastScrollTopRef = useRef<number>(0);
    // [TG3] Set by wheel/scrollbar-pointer events; gating scroll-up → show tray.
    const userScrollIntentUntilRef = useRef<number>(0);
    // [PS2] Unused guards kept for forward compatibility.
    const suppressHeaderRevealUntilRef = useRef<number>(0);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    // [TG1] True when the pointer went down on the scroll container's scrollbar/rail.
    const isPointerOnScrollbarRef = useRef<boolean>(false);
    const headerToggleLockUntilRef = useRef<number>(0);
    const lastPointerYRef = useRef<number>(0);
    const pointerDeltaYRef = useRef<number>(0);

    // [MAESTRO-UI-002] Manual reveal-intent arbitration — separate from the generic
    // userScrollIntentUntilRef (TG3) above, which only gates whether a scroll-up delta is
    // allowed to reveal at all. This ref means "the user recently made an upward/manual
    // reveal gesture; do not let playback's S1 row-advance hide request immediately
    // override it." The V145.26 S1 playback resolver/scroll math itself is untouched by
    // this — only whether/when page.tsx applies the hide that AlphaTabRenderer requests.
    const manualHeaderRevealIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002B] Mirrors manualHeaderRevealIntentUntilRef for the opposite direction:
    // protects a deliberate wheel/scrollbar-drag-down hide from being immediately undone by
    // the curr < 10 "always reveal near top" guard in the scroll handler below, while
    // scrollTop is still within the near-top band right at the start of the gesture. This is
    // a separate concern from playback S1 hide intent (requestHeaderHide above) — manual
    // hide/reveal intent is arbitrated here in page.tsx only; the V145.26 S1 playback
    // resolver in AlphaTabRenderer.tsx is untouched.
    const manualHeaderHideIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002] True while a touch is active on the scroll root; lets touchmove
    // extend intent without preventDefault or otherwise interfering with native scroll.
    const isTouchActiveRef = useRef<boolean>(false);
    const lastTouchYRef = useRef<number>(0);
    // [MAESTRO-UI-002F] Direction of the most recent past-deadzone touchmove in the current
    // gesture — reset at touchstart, set by touchmove, read at touchend/touchcancel to decide
    // whether to bridge into momentum scroll. Only ever written from real touch events.
    const lastTouchIntentDirectionRef = useRef<'hide' | 'reveal' | null>(null);
    // [MAESTRO-UI-002F] Bridges mobile inertial/momentum scroll after touch-up: native
    // momentum keeps firing onScroll delta < 0 events with no active touch and an expired
    // userScrollIntentUntilRef, so the existing hasRecentUserIntent gate alone rejects a
    // fast upward flick's momentum tail. Set only from onTouchMove/onTouchEnd (never from
    // playback/programmatic scroll) — see the onScroll delta < 0 branch below for where it's
    // read.
    const touchMomentumRevealIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002G] Proves recent real touch ownership of the scroll, independent of
    // direction — unlike touchMomentumRevealIntentUntilRef (armed only by a reveal-direction
    // touchmove), this is set by touchstart/touchmove/touchend regardless of direction. Fast
    // mobile "thumb spin" scrolling can produce delta < 0 scroll events without ever crossing
    // the dy > 2 touchmove deadzone (Safari sometimes coalesces/reports scroll deltas that
    // don't line up 1:1 with raw touchmove Y deltas), so hasMomentumRevealIntent alone can
    // still miss it. Only ever written from real touchstart/touchmove/touchend — never from
    // playback/programmatic scroll. Date.now()-based, matching touchMomentumRevealIntentUntilRef.
    const recentTouchActivityUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002I] Direction of the most recent delta in onScroll — 'up' only ever set
    // when the tick was touch-owned (see hasTouchOwnedUpwardMomentum below), 'down' set on
    // any downward delta regardless of source. Currently write-only scaffolding/diagnostic
    // state (not yet read by any gating logic) — kept simple per spec ("add if useful").
    const lastManualScrollDirectionRef = useRef<'up' | 'down' | null>(null);
    // [MAESTRO-UI-002] Single in-flight deferred-hide timer so a playback hide request
    // received during an active manual-reveal window never stacks more than one timer.
    const deferredHeaderHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // [MAESTRO-UI-002C] Single in-flight deferred top-reveal recheck timer — see the
    // curr < 10 branch below. Distinct from deferredHeaderHideTimerRef (that one defers a
    // playback hide; this one rechecks a reveal that curr < 10 could not apply immediately
    // because manualHeaderHideIntentUntilRef was still live).
    const deferredTopRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // [MAESTRO-UI-002G] Single in-flight deferred timer for the onScroll delta < 0 branch's
    // "reveal was valid but blocked only by headerToggleLockUntilRef cooldown" case. Kept
    // separate from deferredTopRevealTimerRef (that one is specifically the curr < 10
    // position-based recheck) for semantic clarity — different trigger, different re-checks.
    const deferredTouchRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // [MAESTRO-UI-002] Marks a manual reveal-type gesture (scroll-up, upward touch drag).
    // requestHeaderHide (above) checks this before applying a playback-requested hide.
    const markManualHeaderRevealIntent = useCallback((durationMs = 700) => {
        manualHeaderRevealIntentUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002B] Marks a manual hide-type gesture (deliberate wheel-down,
    // scrollbar-drag-down). The curr < 10 guard below checks this before auto-revealing.
    const markManualHeaderHideIntent = useCallback((durationMs = 700) => {
        manualHeaderHideIntentUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002G] Marks real, direction-agnostic touch ownership of the scroll. Called
    // from touchstart/touchmove/touchend only — proves "a real touch gesture recently owned
    // this scroll," which onScroll's delta < 0 branch can use as a reveal reason even when
    // neither the generic user-intent window nor the reveal-direction momentum bridge caught it.
    const markRecentTouchActivity = useCallback((durationMs = 2200) => {
        recentTouchActivityUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002] Clear any pending deferred hide on unmount only — this timer's
    // lifetime is independent of the listener-registration effect below.
    useEffect(() => {
        return () => {
            if (deferredHeaderHideTimerRef.current != null) {
                clearTimeout(deferredHeaderHideTimerRef.current);
                deferredHeaderHideTimerRef.current = null;
            }
            // [MAESTRO-UI-002C] Same lifetime concern for the deferred top-reveal recheck timer.
            if (deferredTopRevealTimerRef.current != null) {
                clearTimeout(deferredTopRevealTimerRef.current);
                deferredTopRevealTimerRef.current = null;
            }
            // [MAESTRO-UI-002G] Same lifetime concern for the deferred touch-reveal recheck timer.
            if (deferredTouchRevealTimerRef.current != null) {
                clearTimeout(deferredTouchRevealTimerRef.current);
                deferredTouchRevealTimerRef.current = null;
            }
        };
    }, []);

    // [PS1b] Hide tray when playback starts, but only if already scrolled past top.
    useEffect(() => {
        if (isPlaying) {
            const curr = mainScrollContainerRef.current?.scrollTop ?? 0;
            if (curr > 80) setHeaderVisible(false);
        }
    }, [isPlaying, setHeaderVisible]);

    // [PS2 + TG1/TG2/TG3] Scroll / wheel / pointer intent listeners.
    useEffect(() => {
        const el = mainScrollContainerRef.current;
        if (!el) return;

        // [TG1] Wheel on window capture — AlphaTab canvas swallows bubble path.
        // Filter: only act when target is inside <main>.
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as Node)) return;
            if (e.deltaY < 0) {
                userScrollIntentUntilRef.current = performance.now() + 700;
                markManualHeaderRevealIntent(); // [MAESTRO-UI-002] wheel-up is a reveal gesture
            } else if (e.deltaY > 0) {
                // [MAESTRO-UI-002B] Deliberate wheel-down is a manual HIDE gesture — hide
                // immediately instead of waiting for an accumulated onScroll delta > 4. Near
                // the top/start of a gesture a single wheel tick is often smaller than that
                // threshold (fine-grained trackpad deltas especially), so the tray felt like
                // it "waited" for Row 2 to approach instead of responding to the gesture.
                // Tied strictly to the wheel event — never fires from S1/programmatic scroll.
                userScrollIntentUntilRef.current = performance.now() + 700;
                markManualHeaderHideIntent(); // protects against the curr < 10 guard below
                // [MAESTRO-UI-002G] Pure additive clear of the direction-agnostic touch-
                // ownership ref — a deliberate wheel-down gesture is definitionally not touch,
                // so any stale recent-touch-activity window from an earlier gesture shouldn't
                // linger. Does not read/write anything else in this branch; the existing
                // hide decision/timing above and below is unchanged.
                recentTouchActivityUntilRef.current = 0;
                const nowP = performance.now();
                if (headerIntentRef.current && nowP >= headerToggleLockUntilRef.current) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = nowP + 160;
                }
            }
        };
        window.addEventListener('wheel', onWheel, { passive: true, capture: true });

        // [TG2] Pointerdown on window capture — same reason.
        // Scrollbar heuristic: clientX near the right edge of <main>'s bounding rect.
        const onPointerDown = (e: PointerEvent) => {
            if (!el.contains(e.target as Node)) return;
            pointerStartRef.current = { x: e.clientX, y: e.clientY };
            lastPointerYRef.current = e.clientY;
            pointerDeltaYRef.current = 0;
            const rect = el.getBoundingClientRect();
            const isScrollbar = e.clientX > rect.right - 20;
            isPointerOnScrollbarRef.current = isScrollbar;
            userScrollIntentUntilRef.current = isScrollbar
                ? performance.now() + 1000
                : performance.now() + 500;
        };
        window.addEventListener('pointerdown', onPointerDown, { capture: true });

        // Track pointer Y during native scrollbar drag.
        // Do not filter by el.contains(e.target) — pointer capture changes target during drag.
        const onPointerMove = (e: PointerEvent) => {
            if (!isPointerOnScrollbarRef.current) return;
            pointerDeltaYRef.current = e.clientY - lastPointerYRef.current;
            lastPointerYRef.current = e.clientY;
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });

        // Shared reset for all pointer-release events so scrollbar state never lingers.
        const resetScrollbarPointer = () => {
            isPointerOnScrollbarRef.current = false;
            pointerDeltaYRef.current = 0;
            lastPointerYRef.current = 0;
            pointerStartRef.current = null;
        };
        const onPointerUp = resetScrollbarPointer;
        const onPointerCancel = resetScrollbarPointer;
        const onMouseUp = resetScrollbarPointer;
        window.addEventListener('pointerup', onPointerUp, { capture: true });
        window.addEventListener('pointercancel', onPointerCancel, { capture: true });
        window.addEventListener('mouseup', onMouseUp, { capture: true });

        // [MAESTRO-UI-002] Touch-specific intent — mobile Safari/touch inertia can outlast
        // the 500ms pointerdown window above (userScrollIntentUntilRef). These listeners only
        // extend intent/mark reveal; they never preventDefault and never touch scrollTop, so
        // native touch scrolling on <main> is left completely alone. Registered on window
        // capture (not the scroll container) so nothing else attaches a second, competing
        // touch path — this is the single source of truth for touch-driven header intent.
        const TOUCH_DIRECTION_DEADZONE = 2;
        const isInteractiveOrTrayTouchTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) return false;
            return !!target.closest('button, a, input, select, textarea, [role="button"], [data-top-menu-tray]');
        };

        // [MAESTRO-UI-002H] Validates that a touch belongs to the score/scroll surface, not
        // just window-capture "somewhere on the page." e.target on touch events is reliable
        // per spec (fixed to the touchstart target for the life of the series), but plain
        // target-based containment was observed missing legitimate score-surface gestures
        // (svg score rows / .at-surface / the score wrapper div) in mobile Safari — likely
        // AlphaTab re-parenting/re-creating SVG nodes around the moment a gesture starts, so
        // e.target can reference a node that's momentarily not (yet) a descendant of <main>.
        // document.elementFromPoint gives an independent, geometry-based cross-check that
        // isn't affected by that: if either resolves inside <main> and neither resolves to an
        // interactive control or the TopMenu tray, the touch is treated as scroll-surface.
        const isTouchOnMainScrollSurface = (e: TouchEvent): boolean => {
            const container = mainScrollContainerRef.current;
            if (!container) return false;
            const touch = e.touches[0] ?? e.changedTouches[0];
            const target = e.target;
            const targetInMain = target instanceof Node && container.contains(target);
            const pointEl = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
            const pointInMain = pointEl instanceof Node && container.contains(pointEl);
            if (!targetInMain && !pointInMain) return false;
            if (isInteractiveOrTrayTouchTarget(target) || isInteractiveOrTrayTouchTarget(pointEl)) return false;
            return true;
        };

        const onTouchStart = (e: TouchEvent) => {
            if (!isTouchOnMainScrollSurface(e)) return; // [MAESTRO-UI-002H] do not arm header behavior
            isTouchActiveRef.current = true;
            lastTouchYRef.current = e.touches[0]?.clientY ?? 0;
            // [MAESTRO-UI-002F] Fresh gesture — no direction established yet. Prevents a
            // later plain tap (no qualifying touchmove) from inheriting a stale 'reveal'/
            // 'hide' direction left over from an earlier, unrelated gesture.
            lastTouchIntentDirectionRef.current = null;
            // [MAESTRO-UI-002G] Direction-agnostic — only proves recent real touch ownership.
            // Does not toggle header visibility.
            markRecentTouchActivity();
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });

        const onTouchMove = (e: TouchEvent) => {
            // [MAESTRO-UI-002H] If this touch was never armed by a valid touchstart, only
            // proceed when this move itself lands on the scroll surface (self-heals a
            // touchmove arriving without a matching touchstart, e.g. multi-touch edge cases).
            if (!isTouchActiveRef.current && !isTouchOnMainScrollSurface(e)) return;
            const y = e.touches[0]?.clientY ?? lastTouchYRef.current;
            const prevY = lastTouchYRef.current; // [MAESTRO-UI-002E] pre-update value, for probe's lastTouchY
            const dy = y - lastTouchYRef.current;
            lastTouchYRef.current = y;
            // [MAESTRO-UI-002] Extend generic user-scroll intent on every touchmove,
            // regardless of the direction deadzone below.
            userScrollIntentUntilRef.current = performance.now() + 700;
            // [MAESTRO-UI-002G] Direction-agnostic — every touchmove (even within the
            // deadzone) proves continued real touch ownership.
            markRecentTouchActivity();

            // [MAESTRO-UI-002E] Diagnostic-only capture before any branching below — never
            // read by hide/reveal logic.
            const touchTargetEl = e.target instanceof Element ? e.target : null;
            probeHeaderIntent('onTouchMove', {
                dy,
                lastTouchY: prevY,
                currentY: y,
                targetTag: touchTargetEl?.tagName ?? null,
                targetClass: touchTargetEl ? String(touchTargetEl.className).slice(0, 60) : null,
            });

            // [MAESTRO-UI-002D/H] A drag starting on a button/link/input/the TopMenu tray must
            // not itself flip header visibility. Structurally redundant now that
            // isTouchOnMainScrollSurface (above) already excludes these before isTouchActiveRef
            // is ever set — kept as a defensive re-check and because it produces its own
            // distinct diagnostic probe event below.
            if (isInteractiveOrTrayTouchTarget(e.target)) {
                // [MAESTRO-UI-002E] Diagnostic only.
                probeHeaderIntent('onTouchMove-skip', {
                    dy, currentY: y, action: 'none', reason: 'interactive-or-tray-target',
                    skippedInteractiveOrTray: true,
                });
                return;
            }

            // [MAESTRO-UI-002D] Explicit directional touch intent — mirrors the explicit
            // scrollbar-drag branch in onScroll below: bypasses the accumulated-delta
            // inference entirely and toggles immediately (cooldown-checked) instead of
            // waiting for a native `scroll` event, closing the gap where mobile Safari/touch
            // inertia can outlast the older intent-only-marking approach.
            const nowP = performance.now();
            if (dy < -TOUCH_DIRECTION_DEADZONE) {
                // Finger moved up-screen → content scrolls down → user wants header hidden.
                lastTouchIntentDirectionRef.current = 'hide'; // [MAESTRO-UI-002F]
                manualHeaderRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002F] A fresh hide gesture invalidates any still-live momentum
                // reveal bridge from an earlier reveal gesture in this same touch series.
                touchMomentumRevealIntentUntilRef.current = 0;
                markManualHeaderHideIntent();
                const canHide = headerIntentRef.current && nowP >= headerToggleLockUntilRef.current;
                if (canHide) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = nowP + 160;
                    probeHeaderIntent('onTouchMove-hide', { dy, currentY: y, action: 'hide', reason: 'applied' });
                } else {
                    // [MAESTRO-UI-002E] Diagnostic only — distinguishes "already hidden" from
                    // "blocked by cooldown" without changing the gate above.
                    probeHeaderIntent('onTouchMove-hide', {
                        dy, currentY: y, action: 'none',
                        reason: !headerIntentRef.current ? 'already-hidden' : 'cooldown',
                    });
                }
            } else if (dy > TOUCH_DIRECTION_DEADZONE) {
                // Finger moved down-screen → content scrolls up — the same reveal direction
                // as onWheel's deltaY < 0.
                lastTouchIntentDirectionRef.current = 'reveal'; // [MAESTRO-UI-002F]
                // [MAESTRO-UI-002F] Pre-arms the momentum-reveal bridge as soon as an active
                // reveal-direction drag is seen — onTouchEnd (below) re-extends it once the
                // gesture actually ends, so momentum scroll immediately after touch-up can
                // still pass the onScroll delta < 0 gate.
                touchMomentumRevealIntentUntilRef.current = Date.now() + 1800;
                manualHeaderHideIntentUntilRef.current = 0;
                markManualHeaderRevealIntent();
                const canReveal = !headerIntentRef.current && nowP >= headerToggleLockUntilRef.current;
                if (canReveal) {
                    setHeaderVisible(true);
                    headerToggleLockUntilRef.current = nowP + 160;
                    clearDeferredTopReveal();
                    probeHeaderIntent('onTouchMove-reveal', { dy, currentY: y, action: 'reveal', reason: 'applied' });
                } else {
                    // [MAESTRO-UI-002E] Diagnostic only — distinguishes "already visible" from
                    // "blocked by cooldown" without changing the gate above.
                    probeHeaderIntent('onTouchMove-reveal', {
                        dy, currentY: y, action: 'none',
                        reason: headerIntentRef.current ? 'already-visible' : 'cooldown',
                    });
                }
            }
        };
        window.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });

        const onTouchEnd = () => {
            // [MAESTRO-UI-002H] Capture before clearing — only a touch that was actually
            // armed (passed isTouchOnMainScrollSurface at touchstart, or self-healed in
            // onTouchMove) gets to mark activity / extend the momentum bridge. Otherwise a
            // touchend for an untracked touch (e.g. one that started on a button) could
            // re-arm the bridge off a stale lastTouchIntentDirectionRef left by an earlier,
            // unrelated valid gesture.
            const wasActive = isTouchActiveRef.current;
            isTouchActiveRef.current = false;
            if (wasActive) {
                // [MAESTRO-UI-002G] Direction-agnostic — re-extends recent-touch-ownership so
                // momentum scroll immediately after touch-up (any direction) is still
                // attributable to a real user gesture, not just the reveal-direction bridge below.
                markRecentTouchActivity();
                // [MAESTRO-UI-002F] Bridge mobile inertial/momentum scroll: only when the last
                // active touchmove direction in this gesture was reveal/upward, extend both the
                // dedicated momentum-reveal window and the generic user-intent window so the
                // native momentum `scroll` events that keep arriving after touch-up (with
                // isTouchActiveRef already false) can still pass onScroll's delta < 0 reveal
                // gate. A 'hide' last-direction sets no reveal momentum. Never changes visibility
                // directly here — only extends the windows the onScroll gate itself reads.
                if (lastTouchIntentDirectionRef.current === 'reveal') {
                    touchMomentumRevealIntentUntilRef.current = Date.now() + 1800;
                    // [MAESTRO-UI-002F] userScrollIntentUntilRef is performance.now()-based
                    // everywhere else it's written (onWheel/onTouchMove/onPointerDown) and read
                    // (onScroll's hasRecentUserIntent) — performance.now() used here to match,
                    // not Date.now(), to avoid desyncing that shared ref's units.
                    userScrollIntentUntilRef.current = performance.now() + 1800;
                }
                // [MAESTRO-UI-002E] Diagnostic only.
                probeHeaderIntent('onTouchEnd', {
                    lastTouchIntentDirection: lastTouchIntentDirectionRef.current,
                    action: 'none',
                    reason: lastTouchIntentDirectionRef.current === 'reveal' ? 'momentum-armed' : 'no-momentum',
                });
            }
        };
        window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });

        // [MAESTRO-UI-002C] Deferred top-reveal recheck helpers — see the curr < 10 branch
        // in onScroll below. If reveal there is suppressed only by a live
        // manualHeaderHideIntentUntilRef window (not by playback), and no further scroll
        // event fires before that window naturally expires (e.g. scrollTop is already
        // pinned at 0 after a scrollbar drag back to the top), the header would otherwise
        // stay stranded hidden forever. This schedules exactly one recheck for that expiry.
        const clearDeferredTopReveal = () => {
            if (deferredTopRevealTimerRef.current != null) {
                clearTimeout(deferredTopRevealTimerRef.current);
                deferredTopRevealTimerRef.current = null;
            }
        };
        const scheduleDeferredTopReveal = (hideIntentUntil: number) => {
            if (deferredTopRevealTimerRef.current != null) return; // avoid stacking timers
            const delay = Math.max(0, hideIntentUntil - Date.now()) + 20;
            deferredTopRevealTimerRef.current = setTimeout(() => {
                deferredTopRevealTimerRef.current = null;
                const stillNearTop = (mainScrollContainerRef.current?.scrollTop ?? 0) < 10;
                if (stillNearTop && !headerIntentRef.current) {
                    setHeaderVisible(true);
                }
            }, delay);
        };

        // [MAESTRO-UI-002G/I] Deferred touch-reveal recheck — see the onScroll delta < 0
        // branch below. Covers the case where hasReasonToReveal (touch activity/momentum) was
        // true but the reveal was blocked only by the headerToggleLockUntilRef cooldown, so
        // the reveal isn't simply lost — it's rechecked once the cooldown expires. iOS fast
        // flicks are event-sparse: there may be no later scroll event to retry once the lock
        // naturally expires, so this schedules exactly one recheck instead of waiting for one.
        const scheduleDeferredTouchReveal = (lockRemainingMs: number) => {
            if (deferredTouchRevealTimerRef.current != null) return; // avoid stacking timers
            const scrollTopAtSchedule = mainScrollContainerRef.current?.scrollTop ?? 0;
            const delay = Math.max(0, lockRemainingMs) + 20;
            deferredTouchRevealTimerRef.current = setTimeout(() => {
                deferredTouchRevealTimerRef.current = null;
                if (headerIntentRef.current) {
                    probeHeaderIntent('onScroll-deferred-touch-reveal-fire', { action: 'none', reason: 'aborted-header-visible' });
                    return;
                }
                const container = mainScrollContainerRef.current;
                if (!container) {
                    probeHeaderIntent('onScroll-deferred-touch-reveal-fire', { action: 'none', reason: 'aborted-no-main' });
                    return;
                }
                const scrollTopNow = container.scrollTop;
                const scrollMovedUpEnough = scrollTopNow < scrollTopAtSchedule || scrollTopNow < 10;
                if (!scrollMovedUpEnough) {
                    probeHeaderIntent('onScroll-deferred-touch-reveal-fire', {
                        action: 'none', reason: 'aborted-scroll-not-up',
                        scheduledScrollTop: scrollTopAtSchedule, currentScrollTop: scrollTopNow,
                    });
                    return;
                }
                const stillWithinTouchWindow =
                    Date.now() < recentTouchActivityUntilRef.current ||
                    Date.now() < touchMomentumRevealIntentUntilRef.current ||
                    scrollTopNow < 10;
                if (!stillWithinTouchWindow) {
                    probeHeaderIntent('onScroll-deferred-touch-reveal-fire', {
                        action: 'none', reason: 'aborted-no-touch-window',
                        scheduledScrollTop: scrollTopAtSchedule, currentScrollTop: scrollTopNow,
                    });
                    return;
                }
                setHeaderVisible(true);
                headerToggleLockUntilRef.current = performance.now() + 160;
                manualHeaderHideIntentUntilRef.current = 0;
                touchMomentumRevealIntentUntilRef.current = 0;
                probeHeaderIntent('onScroll-deferred-touch-reveal-fire', {
                    action: 'reveal', reason: 'fired-applied',
                    scheduledScrollTop: scrollTopAtSchedule, currentScrollTop: scrollTopNow,
                });
            }, delay);
        };

        // [PS2] Scroll direction → show/hide tray.
        //   curr < 10    → always show (position-based, bypasses cooldown)
        //   delta > 4    → hide, cooldown-protected
        //   delta < 0    → show: immediately for wheel/trackpad; for scrollbar drag requires
        //                   upward pointer direction or cooldown expiry as fallback
        const onScroll = () => {
            const now = performance.now();
            const curr = el.scrollTop;
            const prev = lastScrollTopRef.current;
            const delta = curr - prev;
            const inCooldown = now < headerToggleLockUntilRef.current;

            lastScrollTopRef.current = curr;

            // [MAESTRO-UI-002C] Direction reversal clears the opposing manual intent — a
            // stale hide-intent from an earlier wheel/scrollbar-drag-down (or vice versa)
            // must not keep suppressing the opposite gesture once the user has clearly
            // reversed direction. `delta` above is always a fresh per-event scrollTop
            // difference; there is no separate shared accumulator elsewhere to reset.
            if (delta < 0) manualHeaderHideIntentUntilRef.current = 0;
            if (delta > 0) {
                manualHeaderRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002F] Any real downward scroll — whether it originated from
                // wheel-down, scrollbar-drag-down, or touch-hide — invalidates a stale
                // momentum-reveal bridge from an earlier upward gesture. This single choke
                // point (every scroll event passes through here first) covers all three
                // sources without needing to touch the wheel-down or scrollbar-drag branches
                // below, which stay byte-identical.
                touchMomentumRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002I] Does not renew any upward reveal window — only records
                // direction.
                lastManualScrollDirectionRef.current = 'down';
            }

            // [MAESTRO-UI-002C] Explicit scrollbar-drag direction — bypasses the accumulated
            // delta > 4 / ambient delta < 0 thresholds below entirely. isPointerOnScrollbarRef
            // is only ever set true by a real pointerdown on the scrollbar rail (onPointerDown
            // above, filtered by el.contains(e.target)) and cleared on release — never true
            // for content clicks, the Play button, or S1's programmatic scroll — so this is
            // genuine explicit user intent, not an inference from ambient scroll deltas.
            if (isPointerOnScrollbarRef.current && delta !== 0) {
                if (!inCooldown) {
                    headerToggleLockUntilRef.current = now + 160;
                    if (delta > 0) {
                        setHeaderVisible(false);
                        markManualHeaderHideIntent();
                        // [MAESTRO-UI-002G] Pure additive clear — see the matching comment in
                        // onWheel's deltaY > 0 branch. Does not change this branch's existing
                        // hide decision/timing.
                        recentTouchActivityUntilRef.current = 0;
                    } else {
                        setHeaderVisible(true);
                        markManualHeaderRevealIntent();
                        clearDeferredTopReveal();
                    }
                }
                return;
            }

            if (curr < 10) {
                // Position-based: always reveal at top, no cooldown gate.
                // MAESTRO-SCROLL-001: gated on !isPlayingRef so Row-1 hide-on-sysIdx>=1
                // isn't fought by a near-top scroll event during active playback.
                // [MAESTRO-UI-002B] Also gated on manualHeaderHideIntentUntilRef so a
                // just-requested deliberate wheel/scrollbar-drag-down hide isn't immediately
                // reverted while scrollTop is still within the near-top band.
                // [MAESTRO-UI-002H] Already-visible short-circuit, checked first: iOS
                // rubber-band bounce at the top fires many curr < 10 scroll events in rapid
                // succession while the header is already shown. Without this, every single
                // one refreshed headerToggleLockUntilRef, which could keep the 160ms cooldown
                // lock perpetually extended for as long as the bounce lasted.
                if (headerIntentRef.current) {
                    probeHeaderIntent('onScroll-curr-lt-10', { action: 'none', reason: 'already-visible' });
                    return;
                }
                const hideIntentUntil = manualHeaderHideIntentUntilRef.current;
                if (!isPlayingRef.current) {
                    if (Date.now() >= hideIntentUntil) {
                        setHeaderVisible(true);
                        clearDeferredTopReveal();
                        headerToggleLockUntilRef.current = now + 160;
                        // [MAESTRO-UI-002E] Diagnostic only.
                        probeHeaderIntent('onScroll-curr-lt-10', { action: 'reveal', reason: 'applied' });
                    } else {
                        // [MAESTRO-UI-002C] Suppressed only by a live hide-intent window —
                        // schedule a recheck for when it expires (see helper above).
                        scheduleDeferredTopReveal(hideIntentUntil);
                        headerToggleLockUntilRef.current = now + 160;
                        // [MAESTRO-UI-002E] Diagnostic only.
                        probeHeaderIntent('onScroll-curr-lt-10', { action: 'none', reason: 'deferred-hide-intent-live' });
                    }
                } else {
                    headerToggleLockUntilRef.current = now + 160;
                    // [MAESTRO-UI-002E] Diagnostic only.
                    probeHeaderIntent('onScroll-curr-lt-10', { action: 'none', reason: 'playing' });
                }
                return;
            }

            if (delta > 4) {
                // Downward: cooldown-protected to block rapid mid-animation flip-flops.
                if (!inCooldown) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = now + 160;
                }
                return;
            }

            if (delta < 0) {
                // [TG3-PlaybackGuard] Require recent human scroll intent so AlphaTab/S1/native
                // programmatic scroll corrections cannot reveal TopMenuTray during playback.
                // wheel/trackpad set this ref in onWheel; scrollbar/touch set it in onPointerDown.
                const hasRecentUserIntent = userScrollIntentUntilRef.current > now;
                // [MAESTRO-UI-002F] Mobile inertial/momentum scroll keeps firing delta < 0
                // scroll events after touch-up, with isTouchActiveRef already false and
                // userScrollIntentUntilRef possibly already expired — hasRecentUserIntent
                // alone then rejects a fast upward flick's momentum tail. Only set by real
                // touchmove/touchend (never playback/programmatic scroll) — see
                // touchMomentumRevealIntentUntilRef above.
                const hasMomentumRevealIntent = Date.now() < touchMomentumRevealIntentUntilRef.current;
                // [MAESTRO-UI-002G] Fast mobile "thumb spin" upward scrolling can produce
                // delta < 0 scroll events without ever crossing the dy > 2 touchmove deadzone
                // (Safari doesn't always report scroll deltas 1:1 with raw touchmove Y), so
                // hasMomentumRevealIntent alone can still miss it. recentTouchActivityUntilRef
                // is direction-agnostic — it only proves a real touch gesture recently owned
                // this scroll, set from touchstart/touchmove/touchend only, never playback.
                const hasRecentTouchActivity = Date.now() < recentTouchActivityUntilRef.current;
                // [MAESTRO-UI-002J] While paused, the [TG3-PlaybackGuard] recent-intent gate
                // exists specifically to stop AlphaTab/S1 programmatic scroll corrections from
                // revealing the tray during playback — it was never meant to also gate manual
                // paused navigation. isPlayingRef.current false means this delta < 0 cannot be
                // a programmatic S1 correction (S1 only scrolls during active playback), so the
                // canvas visibly moving upward is reason enough on its own, independent of
                // whether any touch/wheel intent window happens to still be live.
                const isPausedCanvasUpReveal = !isPlayingRef.current;
                const hasReasonToReveal =
                    hasRecentUserIntent || hasMomentumRevealIntent || hasRecentTouchActivity || isPausedCanvasUpReveal;

                // [MAESTRO-UI-002I] Momentum continuation renewal — a long, sustained upward
                // flick can outlast the original momentum/touch-activity window if scroll
                // events keep arriving slower than that window's duration. Renewing on every
                // touch-owned delta < 0 tick keeps it alive for as long as momentum keeps
                // producing scroll events. Guarded inherently: hasTouchOwnedUpwardMomentum can
                // only be true if recentTouchActivityUntilRef/touchMomentumRevealIntentUntilRef
                // was already live, and both are only ever set by real
                // touchstart/touchmove/touchend — never by playback/programmatic S1 scroll —
                // so this can never manufacture a touch-owned window out of nothing.
                const hasTouchOwnedUpwardMomentum = hasRecentTouchActivity || hasMomentumRevealIntent;
                if (hasTouchOwnedUpwardMomentum) {
                    recentTouchActivityUntilRef.current = Date.now() + 700;
                    touchMomentumRevealIntentUntilRef.current = Date.now() + 700;
                    lastManualScrollDirectionRef.current = 'up';
                }

                if (headerIntentRef.current && hasTouchOwnedUpwardMomentum) {
                    // [MAESTRO-UI-002I] Already visible and this tick is touch-owned — the
                    // renewal above already extended the windows; nothing more to apply.
                    // Avoids the same redundant re-lock/re-reveal churn UI-002H fixed for
                    // curr < 10, scoped narrowly to the touch-owned case so wheel/pointer-
                    // driven reveal behavior below is completely untouched.
                    probeHeaderIntent('onScroll-delta-lt-0', { action: 'none', reason: 'momentum-renewed' });
                    return;
                }

                const isScrollbarDrag = isPointerOnScrollbarRef.current;
                const isScrollbarDragUp = pointerDeltaYRef.current < 0;
                // Allow reveal when:
                //   - human/momentum/touch intent confirmed AND not a scrollbar drag (wheel/trackpad/touch)
                //   - human/momentum/touch intent confirmed AND scrollbar drag with confirmed upward pointer
                //   - human/momentum/touch intent confirmed AND scrollbar drag direction unknown: allow after cooldown
                const allowReveal =
                    hasReasonToReveal &&
                    (
                        !isScrollbarDrag ||
                        isScrollbarDragUp ||
                        !inCooldown
                    );
                if (allowReveal) {
                    setHeaderVisible(true);
                    headerToggleLockUntilRef.current = now + 160;
                    markManualHeaderRevealIntent(); // [MAESTRO-UI-002] confirmed manual reveal
                    manualHeaderHideIntentUntilRef.current = 0; // [MAESTRO-UI-002F] see requirement 4
                    clearDeferredTopReveal(); // [MAESTRO-UI-002C] a real reveal just happened
                    // [MAESTRO-UI-002F/G] Clear after a successful reveal (preferred over
                    // letting them expire naturally) so neither bridge can cause a second,
                    // unrelated reveal-toggle later in the same momentum tail.
                    touchMomentumRevealIntentUntilRef.current = 0;
                    recentTouchActivityUntilRef.current = 0;
                    // [MAESTRO-UI-002E] Diagnostic only.
                    let appliedReason: string;
                    if (hasRecentUserIntent) appliedReason = 'applied';
                    else if (hasMomentumRevealIntent) appliedReason = 'momentum-reveal';
                    else if (hasRecentTouchActivity) appliedReason = 'recent-touch-activity';
                    // [MAESTRO-UI-002J] isPausedCanvasUpReveal is hasReasonToReveal's last
                    // fallback — if none of the three touch/user-intent reasons applied, this
                    // is why hasReasonToReveal was true.
                    else appliedReason = 'paused-canvas-up';
                    probeHeaderIntent('onScroll-delta-lt-0', { action: 'reveal', reason: appliedReason });
                } else {
                    // [MAESTRO-UI-002I] allowReveal is false here. Under the (unchanged)
                    // formula above that only happens via the scrollbar-drag-direction-
                    // unknown-in-cooldown case (real scrollbar drags never reach this branch —
                    // intercepted earlier) or when hasReasonToReveal itself is false. Compute
                    // lockRemaining/headerHidden explicitly (rather than only inCooldown) so
                    // this reads the same way the requirement describes it, and so a header
                    // that's already visible doesn't get a pointless deferred timer scheduled.
                    const lockRemaining = headerToggleLockUntilRef.current - now;
                    const headerHidden = !headerIntentRef.current;
                    if (headerHidden && hasReasonToReveal && lockRemaining > 0) {
                        // [MAESTRO-UI-002I] Blocked only by the cooldown lock — iOS fast
                        // flicks are event-sparse, so there may be no later scroll event once
                        // the lock naturally expires. Defer instead of losing the reveal.
                        scheduleDeferredTouchReveal(lockRemaining);
                        // [MAESTRO-UI-002E] Diagnostic only.
                        probeHeaderIntent('onScroll-delta-lt-0', { action: 'none', reason: 'cooldown-deferred' });
                    } else if (hasReasonToReveal) {
                        // Valid reason, but header already visible (nothing to defer) — or
                        // lockRemaining resolved to <= 0 at the exact instant checked.
                        // [MAESTRO-UI-002E] Diagnostic only.
                        probeHeaderIntent('onScroll-delta-lt-0', { action: 'none', reason: 'cooldown' });
                    } else {
                        // [MAESTRO-UI-002E] Diagnostic only.
                        probeHeaderIntent('onScroll-delta-lt-0', { action: 'none', reason: 'no-recent-user-intent' });
                    }
                }
            }
        };
        el.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('wheel', onWheel, { capture: true });
            window.removeEventListener('pointerdown', onPointerDown, { capture: true });
            window.removeEventListener('pointermove', onPointerMove, { capture: true });
            window.removeEventListener('pointerup', onPointerUp, { capture: true });
            window.removeEventListener('pointercancel', onPointerCancel, { capture: true });
            window.removeEventListener('mouseup', onMouseUp, { capture: true });
            window.removeEventListener('touchstart', onTouchStart, { capture: true });
            window.removeEventListener('touchmove', onTouchMove, { capture: true });
            window.removeEventListener('touchend', onTouchEnd, { capture: true });
            window.removeEventListener('touchcancel', onTouchEnd, { capture: true });
            el.removeEventListener('scroll', onScroll);
        };
    }, [setHeaderVisible, markManualHeaderRevealIntent, markManualHeaderHideIntent, probeHeaderIntent, markRecentTouchActivity]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            console.log('APP SESSION', data, error);
        });
        supabase.auth.getUser().then(({ data, error }) => {
            console.log('APP USER', data, error);
        });
    }, []);

    // ==================== BPM ====================
    useEffect(() => {
        if (api?.score?.masterBars?.[0]) {
            setCurrentBPM(api.score.masterBars[0].tempoAutomation?.value || 120);
        }
    }, [api, songInfo]);

    // ==================== PANEL REFS ====================
    const slideoutCloseRef = useRef<(() => void) | null>(null);
    const closeControlPanelsRef = useRef<(() => void) | null>(null);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // ==================== SHELL CALLBACKS ====================

    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ Phase 3: API ready');
        setApi(alphaTabApi);
        alphaTabApi.masterVolume = masterVolumeRef.current;
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime;
                durationRef.current = e.endTime;
            });
        }
    }, []);

    /** onScoreLoaded — V102.7: Songsterr-style tone-first track scoring. */
    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ Phase 3 V102.7: Score loaded — ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, i) => [i, false])));
        setTrackSoloState(new Map(trackList.map((_, i) => [i, false])));
        if (api?.score?.tracks) {
            const vols = new Map<number, number>();
            api.score.tracks.forEach((t: any, i: number) => {
                vols.set(i, (t.playbackInfo?.volume ?? 15) / 16);
            });
            originalTrackVolsRef.current = vols;
        }
        setPitchShift(0);

        // ── Track classifier helpers ──────────────────────────────────────────
        const normalize = (s: string) =>
            s.toLowerCase().trim().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

        const isDrumTrack = (t: Track) => {
            const n = normalize(t.name ?? '');
            return ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'].some(kw => n.includes(kw));
        };

        const isBassTrack = (t: Track) => normalize(t.name ?? '').includes('bass');

        // [V102.7] Vocal supreme override — must win before any guitar check.
        const isVocalTrack = (t: Track) =>
            /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal|chorus\s*vocal)/i
                .test(normalize(t.name ?? ''));

        const isAnyGuitarTrack = (t: Track) => {
            const n = normalize(t.name ?? '');
            if (isDrumTrack(t) || isBassTrack(t) || isVocalTrack(t)) return false;
            return ['guit', 'guitar', 'gtr', 'rhythm', 'acoustic', 'clean', 'dist', 'overdrive']
                .some(kw => n.includes(kw));
        };

        const guitarDefaultScore = (t: Track): number => {
            const n = normalize(t.name ?? '');
            if (isVocalTrack(t)) return -9999;
            if (isDrumTrack(t)) return -9999;
            if (isBassTrack(t)) return -200;
            let s = 0;
            if (n.includes('distortion')) s += 120;
            if (n.includes('overdriven') || n.includes('overdrive')) s += 110;
            if (n.includes('acoustic')) s += 105;
            if (n.includes('clean')) s += 95;
            if (/(guit|guitar|gtr)/.test(n)) s += 60;
            if (n.includes('rhythm guitar') || n.includes('rhythm gtr')) s += 25;
            if (n.includes('lead guitar') || n.includes('lead gtr')) s += 15;
            if (/(overdub|right ear|left ear|solo overdub|sitar|banjo|harmonica|tenor sax|clarinet|strings|synth|pad|orch|piano|organ|delay|fx|effect|bus|click|guide|reference)/.test(n)) s -= 40;
            return s;
        };

        const pickDefaultTrackIndex = (tl: Track[]): number => {
            let bestIdx = -1, bestScore = -9999;
            for (let i = 0; i < tl.length; i++) {
                const sc = guitarDefaultScore(tl[i]);
                if (sc > bestScore) { bestScore = sc; bestIdx = i; }
            }
            if (bestIdx >= 0 && bestScore > 0) return bestIdx;
            const anyG = tl.findIndex(isAnyGuitarTrack);
            if (anyG >= 0) return anyG;
            const nonVocal = tl.findIndex(t => !isVocalTrack(t) && !isDrumTrack(t));
            return nonVocal >= 0 ? nonVocal : 0;
        };

        trackList.forEach((t, i) => {
            const raw = t.name ?? '';
            console.log(`🎯 Track[${i}] raw="${raw}"`, {
                isDrum: isDrumTrack(t),
                isBass: isBassTrack(t),
                isVocal: isVocalTrack(t),
                isGuitar: isAnyGuitarTrack(t),
                score: guitarDefaultScore(t),
            });
        });

        const trackIndex = pickDefaultTrackIndex(trackList);
        console.log(`🎸 V102.7: Default track → ${trackIndex} (raw="${trackList[trackIndex]?.name ?? 'Unnamed'}")`);
        setSelectedTrack(trackIndex);
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ Phase 3: Render finished');
        setTimeout(() => {
            if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
        }, 150);
    }, []);

    // ==================== PLAY / PAUSE ====================
    const handlePlayPause = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    const handleStop = useCallback(() => {
        if (!api) return;
        api.stop();
        currentTimeRef.current = 0;
        setDisplayTime(0);
        setIsPlaying(false);
    }, [api]);

    // ==================== TRACK CHANGE ====================
    const DRUM_GUARD_KEYWORDS = ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'];
    const handleTrackChange = useCallback((trackIndex: number) => {
        const trackName = (tracks[trackIndex]?.name ?? '').toLowerCase();
        if (DRUM_GUARD_KEYWORDS.some(kw => trackName.includes(kw))) {
            console.warn(`🥁 Phase 3: Drum track selection ignored (index ${trackIndex} — "${tracks[trackIndex]?.name}"). Restore in Phase 4.`);
            return;
        }
        setSelectedTrack(trackIndex);
    }, [tracks]);

    // ==================== LOOP ====================
    const clearLoopFully = useCallback(() => {
        setIsLooping(false);
        setHasLoopSelection(false);
        setPlaybackRange(null);
        if (api) {
            api.isLooping = false;
            api.playbackRange = null;
        }
    }, [api]);

    const handleLoopToggle = useCallback(() => {
        if (isLooping) {
            clearLoopFully();
        } else {
            setIsLooping(true);
        }
    }, [isLooping, clearLoopFully]);

    // ==================== YOUTUBE MEDIA HANDLER ====================
    // Bridges AlphaTab's playback engine to the YouTube player — restored from V98.67.
    const youTubeMediaHandlerInstance = useMemo(() => ({
        play: () => { youtubePlayerRef.current?.playVideo?.(); },
        pause: () => { youtubePlayerRef.current?.pauseVideo?.(); },
        seekTo: (milliseconds: number) => {
            const offset = (currentSong as any)?.videoStartOffset ?? 0;
            const seconds = milliseconds / 1000 + offset;
            youtubePlayerRef.current?.seekTo?.(seconds, true);
        },
        get currentTime() {
            if (!youtubePlayerRef.current?.getCurrentTime) return 0;
            const offset = (currentSong as any)?.videoStartOffset ?? 0;
            return Math.max(0, youtubePlayerRef.current.getCurrentTime() - offset) * 1000;
        },
        get duration() {
            return (youtubePlayerRef.current?.getDuration?.() ?? 0) * 1000;
        },
    }), [currentSong]);

    // ==================== YOUTUBE HANDLERS ====================
    const handleYouTubeClose = useCallback(() => {
        setIsYouTubePlayerVisible(false);
        setIsYouTubeReady(false);
    }, []);

    const handleYouTubePlayerReady = useCallback(() => {
        setIsYouTubeReady(true);
        // ✅ Mute synth only once YouTube is confirmed live — avoids total silence
        // if the handler attaches late or the iframe takes a moment to initialize.
        if (api) api.masterVolume = 0;
        console.log('[page] YouTube ready — synth muted');
    }, [api]);

    const handleYouTubeTimeUpdate = useCallback((time: number) => {
        currentTimeRef.current = time;
        setDisplayTime(time);
    }, []);

    const lastYtStateRef = useRef<number | null>(null);
    const handleYouTubeStateChange = useCallback((event: any) => {
        if (pauseTransitionRef.current) return;
        const state = event.data;
        // Dedupe — ignore repeated states and buffering churn (-1, 3)
        if (lastYtStateRef.current === state) return;
        lastYtStateRef.current = state;
        if (state === 1) {
            setIsPlaying(true);
            api?.play?.();
        } else if (state === 2) {
            setIsPlaying(false);
            if (api) { pauseTransitionRef.current = true; api.pause(); setTimeout(() => { pauseTransitionRef.current = false; }, 200); }
        } else if (state === 0) {
            setIsPlaying(false);
            api?.stop?.();
        }
        // Ignore -1 (unstarted) and 3 (buffering) — don't poke AlphaTab
    }, [api]);

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        setCurrentVideoId(newVideoId);
    }, []);

    // ==================== AUDIO SOURCE CHANGE ====================
    // [C5] Restored from V98.67 — mutes synth when switching to YouTube, restores on return.
    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        if (source === 'original') {
            // Don't mute yet — wait for handleYouTubePlayerReady to confirm iframe is live
            setIsYouTubePlayerVisible(true);
        } else {
            setIsYouTubePlayerVisible(false);
            setIsYouTubeReady(false);
            // Restore synth volume immediately on switch back
            if (api) api.masterVolume = masterVolumeRef.current;
        }
    }, [api]);

    // ==================== SPEED / VOLUME ====================
    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) api.playbackSpeed = speed;
    }, [api]);

    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolume(volume);
        if (api) api.masterVolume = volume;
    }, [api]);

    // ==================== MUTE / SOLO ====================
    const handleTrackMuteToggle = useCallback((idx: number) => {
        if (!api?.score) return;
        const isMuted = trackMuteState.get(idx) || false;
        api.changeTrackMute([api.score.tracks[idx]], !isMuted);
        setTrackMuteState(prev => { const m = new Map(prev); m.set(idx, !isMuted); return m; });
    }, [api, trackMuteState]);

    const handleTrackSoloToggle = useCallback((idx: number) => {
        if (!api?.score?.tracks) return;
        const isSoloed = trackSoloState.get(idx) || false;
        const nextSoloed = !isSoloed;

        console.group(`🔴 ENTER handleTrackSoloToggle idx=${idx} "${api.score.tracks[idx]?.name}" isSoloed=${isSoloed} → nextSoloed=${nextSoloed}`);
        console.log('trackSoloState:', [...trackSoloState.entries()].map(([k, v]) => `[${k}]=${v}`));
        console.log('trackMuteState:', [...trackMuteState.entries()].map(([k, v]) => `[${k}]=${v}`));
        console.log('api.tracks (rendered):', api.tracks?.map((t: any) => `[${t.index}] ${t.name}`));
        console.log('api.score.tracks:', api.score.tracks.map((t: any, i: number) => `[${i}] ${t.name}`));

        api.score.tracks.forEach((track: any, i: number) => {
            if (nextSoloed) {
                const finalMute = i !== idx;
                console.log(`🟢 SOLO ON — applyMute([${i}] "${track.name}") → finalMute=${finalMute}`);
                api.changeTrackMute([track], finalMute);
            } else {
                const restoredMute = trackMuteState.get(i) || false;
                console.log(`  restoreTrackMute([${i}] "${track.name}") → ${restoredMute}`);
                api.changeTrackMute([track], restoredMute);
            }
        });
        console.groupEnd();

        setTrackSoloState(prev => {
            const m = new Map(prev);
            if (nextSoloed) { prev.forEach((_, k) => m.set(k, k === idx)); }
            else m.set(idx, false);
            return m;
        });
    }, [api, trackSoloState, trackMuteState]);

    // ==================== SONG LIBRARY ====================
    const handleSongSelect = useCallback((songId: string) => {
        if (songId === songState.currentSongId) {
            setIsSongSelectorOpen(false);
            return;
        }
        setIsPlaying(false);
        setPlayerReady(false);
        if (api) {
            api.isLooping = false;
            api.playbackRange = null;
        }
        setApi(null);
        setIsLooping(false);
        setHasLoopSelection(false);
        setPlaybackRange(null);
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
        if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
    }, [songState.currentSongId, api]);

    const handleMetadataSave = useCallback((
        savedTabId: string,
        patch: { title: string; artist: string; album?: string }
    ) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(s =>
                s.id === savedTabId ? { ...s, ...patch } : s
            ),
        }));
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(s => s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s),
        }));
    }, []);

    const handleCreatePlaylist = useCallback((name: string) => {
        setSongState(prev => ({
            ...prev,
            playlists: [...prev.playlists, { id: `playlist-${Date.now()}`, name, songIds: [], createdAt: Date.now() }],
        }));
    }, []);

    const handlePlaylistAction = useCallback((type: 'add' | 'remove', songId: string, playlistId: string) => {
        setSongState(prev => ({
            ...prev,
            playlists: prev.playlists.map(pl => {
                if (pl.id !== playlistId) return pl;
                const exists = pl.songIds.includes(songId);
                if (type === 'add' && !exists) return { ...pl, songIds: [...pl.songIds, songId] };
                if (type === 'remove' && exists) return { ...pl, songIds: pl.songIds.filter(id => id !== songId) };
                return pl;
            }),
        }));
    }, []);

    const handleDeletePlaylist = useCallback((playlistId: string) => {
        setSongState(prev => ({ ...prev, playlists: prev.playlists.filter(p => p.id !== playlistId) }));
    }, []);

    // ==================== MISC ====================
    const handleThemeToggle = useCallback(() => setTheme(p => p === 'dark' ? 'light' : 'dark'), []);

    // [TH1] Sync theme to document root so globals.css [data-theme='dark'] selectors fire.
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    const handleCountInToggle = useCallback(() => setIsCountInEnabled(p => !p), []);
    const handleMetronomeToggle = useCallback(() => setIsMetronomeEnabled(p => !p), []);
    const handlePitchShiftToggle = useCallback((anchor?: { top: number; left: number }) => {
        setIsPitchPopoverOpen(p => { if (!p && anchor) setPitchPopoverAnchor(anchor); return !p; });
    }, []);

    const trackIndices = useMemo(() => [selectedTrack], [selectedTrack]);

    // 🔒 Single source of truth for header visibility.
    // [PS1b] Playback hides tray once on start (useEffect above). Manual scroll restores it.
    // [PS2] isHeaderVisible tracks scroll direction — set by scroll listener above.
    const isHeaderShown = isMobileLandscape || isHeaderVisible;

    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">

            {/* ── TopMenuTray wrapper owns slide animation; tray itself is dumb ── */}
            {/* [VA1] GPU-composited slide: will-change-transform + 200ms ease-out (was duration-300 ease). */}
            <div className={`fixed top-0 left-0 right-0 pointer-fine:right-3.75 w-auto z-50 will-change-transform transform transition-transform duration-200 ease-out ${isHeaderShown ? 'translate-y-0' : '-translate-y-full'}`}>
                <TopMenuTray
                    isPlaying={isPlaying}  // ← [PS4] v1.6 prop — parent reads for shell class
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => setIsSongSelectorOpen(true)}
                    onNewTabOpen={() => setIsNewTabOpen(true)}
                />
            </div>

            <MyTabsPanel
                isOpen={isSongSelectorOpen}
                onClose={() => setIsSongSelectorOpen(false)}
                songs={songState.songs}
                playlists={songState.playlists}
                currentSong={songState.songs.find(s => s.id === songState.currentSongId) ?? null}
                onSongSelect={handleSongSelect}
                onToggleFavorite={handleToggleFavorite}
                onPlaylistAction={handlePlaylistAction}
                onCreatePlaylist={handleCreatePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                isDarkMode={theme === 'dark'}
                onEditMetadata={(songId) => setMetaEditorState({ tabId: songId, source: 'mytabs' })}
            />

            {/* [C2] onTabAdded fires refetchSongs → My Tabs updates immediately after upload */}
            {/* [C3] onTabUploaded closes panel + opens MetadataEditorPanel for the new tab */}
            <NewTabPanel
                isOpen={isNewTabOpen}
                onClose={() => setIsNewTabOpen(false)}
                theme={theme}
                onTabAdded={refetchSongs}
                onTabUploaded={(tabId) => {
                    setIsNewTabOpen(false);
                    setMetaEditorState({ tabId, source: 'newtab' });
                }}
            />

            {metaEditorState.tabId && (
                <MetadataEditorPanel
                    tabId={metaEditorState.tabId}
                    onSave={handleMetadataSave}
                    onClose={() => {
                        const src = metaEditorState.source;
                        setMetaEditorState({ tabId: null, source: null });
                        if (src === 'mytabs') setIsSongSelectorOpen(true);
                    }}
                />
            )}

            {/*
             * [P1] <main> landscape fix:
             *   - ternary now wrapped in ${} so it actually executes
             *   - 100vh → 100dvh (fixes iOS dynamic toolbar clipping)
             *   - overflow-y-hidden → overflow-y-auto (allows Page-mode vertical scroll)
             *   - header padding applies in BOTH portrait and landscape (removed !isMobileLandscape guard)
             *   - style prop removed (maxWidth/100vw was strip-mode pairing)
             */}
            <main
                ref={mainScrollContainerRef}
                className={`
        w-full
        ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}
        ${isMobileLandscape
                        ? 'overflow-x-hidden overflow-y-hidden overscroll-none [touch-action:pan-x]'
                        : 'pb-32 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]'}
        ${!isMobileLandscape ? 'pt-[calc(79px+env(safe-area-inset-top))]' : 'pt-0'}
    `}
            >
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {/*
                 * [P2] #maestro-player strip-mode removed:
                 *   - inline-block / width:max-content / h-full → all gone (these forced strip layout)
                 *   - paddingBottom → safe-area-aware calc so last bar clears the fixed footer
                 *   - className simplified to w-full (works portrait + landscape)
                 */}
                {/* [TH3-restored] Dark wrapper matches AlphaTab dark canvas — eliminates white gutter bleed. */}
                <div
                    id="maestro-player"
                    className={`relative w-full ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                    style={{
                        paddingBottom: isMobileLandscape
                            ? 'env(safe-area-inset-bottom, 0px)'  // landscape: no bottom push
                            : 'calc(74px + env(safe-area-inset-bottom) + 24px)',  // portrait: TransportBar clearance
                    }}
                >
                    {signedUrl && (
                        <AlphaTabRendererV102
                            playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                            externalMediaHandler={audioSource === 'original' ? youTubeMediaHandlerInstance : undefined}
                            key={signedUrl}
                            fileUrl={signedUrl}
                            trackIndices={trackIndices}
                            scrollContainer={mainScrollContainerRef.current}
                            headerVisibleRef={headerIntentRef}
                            onRequestHeaderHide={requestHeaderHide}
                            isPlaying={isPlaying}
                            onPlayStateChange={setIsPlaying}
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRendered={handleRenderFinished}
                            onBoundsReady={() => { }}
                            onPlayerReady={() => setPlayerReady(true)}
                            loopEnabled={isLooping}
                            playbackRange={playbackRange}
                            onLoopToggle={(enabled) => {
                                if (!enabled) clearLoopFully();
                                else setIsLooping(true);
                            }}
                            onLoopChange={(start, end) => {
                                setPlaybackRange({ startTick: start, endTick: end });
                                setHasLoopSelection(true);
                            }}
                            onLoopClear={clearLoopFully}
                            theme={theme}
                            forceHorizontal={isMobileLandscape}
                        />
                    )}
                </div>

                {false && (
                    <div className="hidden lg:block px-4 mt-4">
                        <DebugPanel api={api} currentTime={displayTime} isPlaying={isPlaying} />
                    </div>
                )}
                <div className="h-24 px-4" />
            </main>

            <footer className="fixed bottom-0 left-0 right-0 pointer-fine:right-3.75 w-auto z-50">
                <MaestroControlPanel
                    api={api}
                    playerReady={playerReady}
                    isPlaying={isPlaying}
                    currentTime={displayTime}
                    duration={displayDuration}
                    playbackSpeed={playbackSpeed}
                    tracks={tracks}
                    selectedTrack={selectedTrack}
                    songInfo={songInfo}
                    isLooping={isLooping}
                    hasLoopSelection={hasLoopSelection}
                    audioSource={audioSource}
                    trackMuteState={trackMuteState}
                    trackSoloState={trackSoloState}
                    theme={theme}
                    isMobileLandscape={isMobileLandscape}
                    masterVolume={masterVolume}
                    onMasterVolumeChange={handleMasterVolumeChange}
                    onPlayPause={handlePlayPause}
                    onStop={handleStop}
                    onLoopToggle={handleLoopToggle}
                    onLoopRangeChange={(start, end) => setHasLoopSelection(start !== null && end !== null)}
                    onSpeedChange={handleSpeedChange}
                    onTrackChange={handleTrackChange}
                    onAudioSourceChange={handleAudioSourceChange}
                    onTrackMuteToggle={handleTrackMuteToggle}
                    onTrackSoloToggle={handleTrackSoloToggle}
                    onThemeToggle={handleThemeToggle}
                    pitchShift={pitchShift}
                    onPitchShiftToggle={handlePitchShiftToggle}
                    isCountInEnabled={isCountInEnabled}
                    onCountInToggle={handleCountInToggle}
                    countInMode={countInMode}
                    onCountInModeChange={setCountInMode}
                    isMetronomeEnabled={isMetronomeEnabled}
                    onMetronomeToggle={handleMetronomeToggle}
                    metronomeVolume={metronomeVolume}
                    onMetronomeVolumeChange={setMetronomeVolume}
                    metronomeBalance={metronomeBalance}
                    onMetronomeBalanceChange={setMetronomeBalance}
                    metronomeSubdivision={metronomeSubdivision}
                    onMetronomeSubdivisionChange={(s: number) => setMetronomeSubdivision(s as SubdivisionMode)}
                    metronomeSoundType={metronomeSoundType}
                    onMetronomeSoundTypeChange={(s: string) => setMetronomeSoundType(s as MetronomeSoundType)}
                    metronomeAccentEnabled={metronomeAccentEnabled}
                    onMetronomeAccentToggle={() => setMetronomeAccentEnabled(p => !p)}
                    onArmMetronome={armMetronome}
                    currentBPM={currentBPM}
                    onSlideoutShouldClose={() => slideoutCloseRef.current?.()}
                    registerCloseAllPanels={(fn) => { closeControlPanelsRef.current = fn; }}
                />
            </footer>

            <CountInOverlay
                count={countdownValue}
                isVisible={isCountingDown}
                mode={countInMode}
                onComplete={() => { }}
            />

            {!isMobileLandscape && (
                <div className="block [@media(min-width:650px)]:hidden" style={{ zIndex: 50 }}>
                    <MobileToolsSlideout
                        isCountInEnabled={isCountInEnabled}
                        onCountInToggle={handleCountInToggle}
                        countInMode={countInMode}
                        onCountInModeChange={setCountInMode}
                        isMetronomeEnabled={isMetronomeEnabled}
                        onMetronomeToggle={handleMetronomeToggle}
                        currentBPM={currentBPM}
                        audioSource={audioSource}
                        metronomeVolume={metronomeVolume}
                        onMetronomeVolumeChange={setMetronomeVolume}
                        metronomeBalance={metronomeBalance}
                        onMetronomeBalanceChange={setMetronomeBalance}
                        metronomeSubdivision={metronomeSubdivision}
                        onMetronomeSubdivisionChange={(s: number) => setMetronomeSubdivision(s as SubdivisionMode)}
                        metronomeSoundType={metronomeSoundType}
                        onMetronomeSoundTypeChange={(s: string) => setMetronomeSoundType(s as MetronomeSoundType)}
                        metronomeAccentEnabled={metronomeAccentEnabled}
                        onMetronomeAccentToggle={() => setMetronomeAccentEnabled(p => !p)}
                        showEdgeTab={true}
                        onArmMetronome={armMetronome}
                        isMobileLandscape={isMobileLandscape}
                        onOtherPanelOpened={() => { closeControlPanelsRef.current?.(); }}
                    />
                </div>
            )}
            {/* [C5] YouTube player — always mounted to prevent flash, isVisible controls display */}
            <div style={{
                position: 'fixed', bottom: isMobileLandscape ? 0 : 80,
                right: isMobileLandscape ? 0 : 16, zIndex: 40,
                width: 240, height: 427, borderRadius: 8, overflow: 'hidden',
                display: audioSource === 'original' && isYouTubePlayerVisible && activeVideoId ? 'block' : 'none',
            }}>
                <YouTubePlayer
                    ref={youtubePlayerRef}
                    videoId={activeVideoId ?? ''}
                    isVisible={audioSource === 'original' && isYouTubePlayerVisible}
                    onClose={handleYouTubeClose}
                    currentTime={displayTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={handleYouTubeTimeUpdate}
                    onStateChange={handleYouTubeStateChange}
                    onPlayerReady={handleYouTubePlayerReady}
                    isMobileLandscape={isMobileLandscape}
                    videoVariants={(currentSong as any)?.youtubeVariants}
                    onVariantChange={handleVideoVariantChange}
                    videoStartOffset={(currentSong as any)?.videoStartOffset}
                />
            </div>
        </div>
    );
}