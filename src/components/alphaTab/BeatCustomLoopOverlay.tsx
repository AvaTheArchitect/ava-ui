'use client';

/**
 * BeatCustomLoopOverlay v1.8.12 — Loop Diagnostic Flags Disabled
 * Date: July 7th, 2026
 *
 * 🔥 V1.8.12 CHANGES:
 * ✅ MAESTRO-LOOP-DEBUG-001: MOBILE_LOOP_TAP_DEBUG, PAGE_ROW_DEBUG, and
 *    LANDSCAPE_LOOP_DEBUG set back to false — stale loop diagnostic flags disabled;
 *    no runtime loop behavior changes. Debug blocks themselves are preserved (not
 *    removed) for future investigation; flip the relevant flag back to true to re-enable.
 *
 * 🔥 V1.8.11 CHANGES:
 * ✅ MAESTRO-LOOP-002C: Visible-only landscape loop start/end boundary markers,
 *    rendered in the same landscape display branch as the highlight, derived from the
 *    SAME deduped/viewport-clipped representative rect (never a fresh/unrelated
 *    rects[0]/rects[last]). Purely decorative — pointerEvents:'none', no onMouseDown/
 *    onTouchStart/touchAction. No drag, no click-to-seek, no gesture changes; strip
 *    scrolling and LandscapeLoopClickGuard/LandscapeOnUpGuard/LandscapeDragEndGuard are
 *    unaffected. Draggable/interactive landscape handles remain a separate, later lane.
 *
 * 🔥 V1.8.10 CHANGES (MAESTRO-LOOP-002 series):
 * ✅ LOOP-002A / LOOP-002A.1: Debug-only landscape hit-test instrumentation
 *    (LOOP_LANDSCAPE_HITTEST_DEBUG, default false — no behavior change when off).
 *    LOOP-002A.1 added a debug-only bypass of the loop-must-already-exist gate so the
 *    probe still logs from a cold, no-loop landscape state.
 * ✅ LOOP-002B: LandscapeToggleOnGuard relaxed — toggling Loop ON in landscape now
 *    creates a real bar-snapped range via the same commitBarSnap/getExpandedBarRange
 *    path portrait already used (tickCache-based, layout-independent). The button-level
 *    restriction this depended on (MaestroControlPanel.tsx) was also removed, since it
 *    existed only to prevent a fake/inert landscape ON.
 * ✅ Pending-range bridge (pendingCommittedRangeRef): AlphaTabRenderer independently
 *    resyncs api.playbackRange from page.tsx's own playbackRange prop, which is still
 *    null on the same commit commitBarSnap runs in — clobbering commitBarSnap's direct
 *    write before page.tsx's state round-trips back down. The bridge carries the
 *    just-committed range across that gap for the landscape display branch only; it
 *    self-clears once api.playbackRange settles or loopEnabled goes false, and is never
 *    used for handle drag/editing or to bypass onLoopChange.
 * ⛔ Landscape click-to-create and drag-to-edit remain intentionally guarded
 *    (LandscapeLoopClickGuard, LandscapeOnUpGuard, LandscapeDragEndGuard) — not yet
 *    authorized, reserved for a later phase. (Visible-only, non-interactive boundary
 *    handle rendering was added in V1.8.11 / LOOP-002C above — draggable handles are
 *    still guarded and unimplemented.)
 *
 * 🔥 V1.8.9 CHANGES:
 * ✅ [LoopOverlayCursorReanchor]
 *    Routes loop-overlay click seeks through AlphaTabRenderer publishCursorAtTick
 *    so Cursor2/Cursor3 receive the same requestSnap + setBeat + setTick anchor chain
 *    as normal notation clicks.
 * ✅ V117 backtrack timing fix: __maestroAllowBacktrackUntil is now set BEFORE
 *    api.tickPosition so backward loop clicks are not blocked when
 *    playerPositionChanged fires synchronously from the tickPosition setter.
 *
 * 🔥 V1.8.8 CHANGES:
 * ✅ Landscape display-only loop highlight: replaces the unconditional
 *    `if (isLandscape) return null` with a dedicated Landscape render path.
 *    Shows the committed loop range as a translucent highlight behind the tab.
 *    No drag, no api.playbackRange writes (still true as of V1.8.11 — V1.8.11 added
 *    visible-only, non-interactive boundary markers; draggable handles remain
 *    unimplemented). Uses rects already
 *    computed by rebuildFromPlaybackRange (rectsCount: 13 confirmed in logs).
 *    Rects are scrollLeft-adjusted to viewport space (score coords 0–35000+,
 *    container is the scroll element, overlay wrapper is a sibling outside it).
 *    Deduplicates to the first y-band (topmost staff row) for MVP safety.
 *    TODO: match the y-band of FixedLandscapeCursor (active track row).
 *    Diagnostic: [landscape-loop-highlight-render] on every Landscape render.
 * ✅ LANDSCAPE_HIGHLIGHT_Y_OFFSET = -28 — probe-confirmed vertical
 *    alignment on iPhone 16 Pro Max + Chrome emulator June 2026.
 *    r.y is score-space while the Landscape overlay render path needs
 *    a small visual Y correction relative to the overlay host.
 *    -28 is probe-confirmed. Tune if GP8 lane compaction changes row
 *    geometry. Do not hardcode raw number.
 *
 * 🔥 V1.8.7 CHANGES:
 * ✅ [LandscapeOnUpGuard] onUp clears isDragging/startBeat/endBeat and returns
 *    early when isLandscapeRef.current. Prevents cross-mode gesture race where
 *    onDown fires in Page mode, device rotates, and onUp fires in Landscape
 *    committing a single-beat range over the full bar-to-bar range. Do not remove.
 * ✅ [LandscapeDragEndGuard] handleDragEnd returns early and clears dragTargetRef
 *    when isLandscapeRef.current. Prevents handle drag interrupted by rotation
 *    from writing a contaminated range. Do not remove.
 * ✅ [LandscapeToggleOnGuard] toggle-on useEffect returns early when
 *    isLandscapeRef.current. Prevents toggle-on recovery from writing a single-bar
 *    range during Landscape session while overlay render is suppressed. Do not remove.
 *
 * 🔥 V1.8.4 CHANGES:
 * ✅ Loop reseat global flag: commitBarSnap sets window.__maestroLoopReseat
 *    with { tick, at, reason } on every click-to-move and toggle-ON reseat.
 *    AlphaTabRenderer playerPositionChanged consumes this flag to flush all
 *    stable refs and re-prime the cursor from the expanded bar start tick,
 *    preventing pick/slide/tie material from priming the cursor to the wrong
 *    visual beat on the first loop pass.
 * ✅ Flag is set BEFORE requestSnap so the renderer sees it on the very next
 *    playerPositionChanged event after the reseat.
 * ✅ BeatCustomLoopOverlay owns the flag write-only. AlphaTabRenderer owns
 *    the flag read + clear. No other files touch __maestroLoopReseat.
 *
 * ✅ Click-to-move cursor reseat: commitBarSnap now always parks cursor at
 *    newRange.startTick after setting api.playbackRange. Uses the expanded
 *    bar start from getExpandedBarRange — never the clicked/nearest beat tick.
 *    Sequence: api.playbackRange → api.isLooping → api.tickPosition →
 *    api.player?.seekTicks → onLoopChange → __maestroManualSeek → requestSnap.
 * ✅ smartCursorSnap NOT used for click-to-move (it uses nearest-boundary
 *    heuristic which can park outside the loop). Reseat is always startTick.
 * ✅ Handle dragEnd retains smartCursorSnap (containment check still useful
 *    when dragging handle to a range the cursor is already inside).
 *
 * ✅ Active handle = pointer-driven (not tied to preview rect edge).
 *    activeHandleClientXRef tracks raw pointer clientX during drag.
 *    Handle renders at pointer X converted to overlay-space coordinates.
 * ✅ Preview highlight = snap/forecast-driven (beat-level, same as v1.8.1).
 * ✅ Inactive handle = anchored to opposite edge of preview/committed range.
 * ✅ Grab offset removed — was causing 1–2 inch separation. Handle center
 *    now tracks pointer directly with no offset math.
 * ✅ api.playbackRange committed only on dragEnd (fix E preserved).
 * ✅ Transition fix (fix A) preserved — no positional animation.
 *
 * ✅ A — Positional transition removed: loop rect never animates position/size.
 *         Only opacity/shadow may transition. Clicking a new measure is instant.
 * ✅ B — Grab offset: pointer-to-handle-center delta stored on dragStart,
 *         applied during dragMove so finger stays attached to handle.
 * ✅ D — LOOP_X_OFFSET = 55 added as diagnostic constant (set to 0 to disable).
 *         If overlay aligns correctly with 55, coordinate host fix is confirmed.
 * ✅ E — Preview/forecast model for handle drag:
 *         - While dragging: preview rects computed from pointer beat, NOT committed
 *         - previewRange state holds the forecasted tick range during drag
 *         - On mouseup/touchend: previewRange is committed to api.playbackRange
 *         - buildRects used for preview (beat-level, same as drag-selection path)
 *         - commitBarSnap preserved for toggle-on and click bar-snap ONLY
 *
 * ✅ STAGE 1 — Handle state + drag event wiring:
 *    - isDragging / dragTarget state added (separate from loop-creation isDragging ref)
 *    - handleDragStart / handleDragMove / handleDragEnd ported from V99.8
 *    - handleDragMove calls commitBarSnap (repeat-safe) — NOT V99.8's structural snapToBar
 *    - smartCursorSnap ported as-is (uses window.__maestroCursor)
 *    - isDragging listener useEffect attached/detached on dragTarget change
 *    - Touch events (touchstart/touchmove/touchend) wired alongside mouse events
 *
 * ✅ STAGE 2 — Handle JSX:
 *    - Highlight rects: pointer-events managed per-child (rects = none, tabs = auto)
 *    - Start handle rendered inside first rect (› tab, left edge)
 *    - End handle rendered inside last rect (‹ tab, right edge)
 *    - Handle tabs have explicit pointerEvents: 'auto'
 *
 * ✅ STAGE 3 — Wrapper pointer-events note:
 *    - BeatCustomLoopOverlay now manages pointer-events internally
 *    - AlphaTabRenderer wrapper div must remove pointer-events-none (see note below)
 *    - Highlight rects stay pointer-events: none; handle tabs are auto
 *
 * ✅ STAGE 4 — Landscape suppress (superseded — see V1.8.8, V1.8.10, V1.8.11 above):
 *    - isLandscape prop added; returns null in landscape mode
 *    - Prevents coordinate-space mismatch until landscape loop system is designed
 *    - No longer a blanket "return null": V1.8.8 added the display-only highlight,
 *      V1.8.10 added real bar-snapped creation, and V1.8.11 added visible-only boundary
 *      markers. Click-to-create/drag-to-edit and draggable handles remain guarded.
 *
 * 🔒 ALL V1.7.6 INTERNALS PRESERVED — nothing removed:
 *    tickOf, durOf, loHi, resolveBeatWithX, commitBarSnap, getBarEdgesFromBeat,
 *    getExpandedBarRange, buildBarRects, buildRects, toggle-snap useEffect,
 *    re-render sync useEffect, clearLoop
 *
 * ✅ TOGGLE-ON PLAY-HEAD BOUNDARY GUARD:
 *    Root cause confirmed via logs: api.tickPosition = 92160 at toggle time
 *    (exactly the startTick of barIdx 25 / visual bar 26). AlphaTab advances
 *    its internal play-head to the next bar boundary when playback stops —
 *    "where playback will resume FROM" not "where the cursor visually is."
 *    findBeat(92160) correctly returned barIdx 25, so the snap went to bar 26
 *    even though the cursor was visually in bar 25.
 *
 *    Fix (PRIMARY): after findBeat resolves a beat, if isFirstBeatInBar(beat)
 *    AND tickOf(beat) === tick exactly → the play-head is at a bar boundary.
 *    Back up to previousBeat so commitBarSnap gets the bar the user was IN.
 *
 *    Fix (SECONDARY): retain forward-bias guard from original v1.7.6 intent —
 *    if tick >= beatBarRange.endTick, advance snapBeat to nextBeat. Handles
 *    the rare forward-drift case where findBeat returns a beat the tick has
 *    already passed.
 *
 * 🔥 V1.7.5 CHANGES:
 * ✅ beatCrossedRef REPLACES sameBeat CHECK: v1.7.4's intent gate checked
 *    `sameBeat` (tickOf(lo) === tickOf(hi)) at mouseup time. This failed when
 *    the resolver returned a different beat at mouseup than at mousedown due to
 *    tiny trackpad drift — sameBeat became false even though the user never
 *    intentionally dragged. Result: bar-snap didn't fire, "stuck on 1–2 beats."
 *
 *    Fix: beatCrossedRef tracks whether any onMove event ever resolved a
 *    different beat tick than the mousedown beat. This is the ground truth of
 *    "did a drag happen" — immune to resolver drift at mouseup time.
 *
 * ✅ ZERO FAN-OUT: onDown no longer calls setRects at all. The single-beat
 *    rect that caused the "fan-out" animation (small rect → full bar on mouseup)
 *    is never painted. Rects only appear from:
 *      - onMove (drag feedback — first paint when user actually moves)
 *      - onUp bar-snap (full bar painted directly)
 *      - onUp beat-level (final drag range painted)
 *
 *    The 80ms deferred timer from v1.7.4 is removed — it didn't work because
 *    click-holds (press, hesitate, release) exceeded the timer and still showed
 *    the single-beat rect before bar-snap.
 *
 * ✅ V1.7.4 IMPROVEMENTS PRESERVED:
 *    - getBarEdgesFromBeat: beat graph traversal (previousBeat/nextBeat)
 *    - getExpandedBarRange: structural fallback for non-repeat edge cases
 *    - commitBarSnap accepts beat object (no re-resolution by tick)
 *    - Single-authority onUp (no onClick handler, no isDragCommitted)
 *    - All v1.6 code intact (buildRects, resolveBeatWithX, midpoint trimming)
 *
 * INTENT GATE TRUTH TABLE:
 *   beatCrossed | pixelDist | Result
 *   false       | < 10      | Bar-snap ✅ (clean click)
 *   false       | ≥ 10      | Beat-level (v1.6) — trackpad drift, harmless
 *   true        | any       | Beat-level (v1.6) ✅ — real drag
 *
 * Previous versions:
 * 🔥 V1.7.4: Beat-first bar-snap (getBarEdgesFromBeat), structural fallback
 * 🔥 V1.7.3: Single-authority onUp, removed isDragCommitted/onClick dual-path
 * 🔥 V1.7.2: getExpandedBarRange for repeat-safe bar-snap ticks
 * 🔥 V1.7:   Bar-snap on toggle + click
 * 🔥 V1.6:   Expanded tick resolution — tickOf() via tickCache.getBeatStart()
 * 🔥 V1.5:   Midpoint-Interspace Magnet-Snap
 * 🔥 V1.4–V1.0: See git history
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V1.6 NOTES (preserved — do not remove):
 *
 * beat.absolutePlaybackStart is structural (pass-1 only). In a repeat x3
 * section, all three passes of Measure 25 share the same absolutePlaybackStart
 * (e.g. 96000). tickOf() uses tickCache.getBeatStart(beat) which returns the
 * correct expanded tick from the engine's repeat-aware MIDI timeline.
 * Reference: CoderLine/alphaTab#2548, AlphaTabApiBase.ts:3241
 * Fallback: absolutePlaybackStart when tickCache/getBeatStart unavailable.
 * Fallback warns once only.
 * container prop — scopes .at-surface query for multi-instance safety.
 */

import React, { useEffect, useRef, useState } from 'react';

interface HighlightRect { x: number; y: number; w: number; h: number; }

interface Props {
    api: any;
    container?: HTMLElement | null;
    loopEnabled: boolean;
    onLoopToggle?: (enabled: boolean) => void;
    onLoopChange?: (startTick: number, endTick: number) => void;
    onLoopClear?: () => void;
    /** Stage 4: suppress overlay in landscape until coordinate-space fix is built */
    isLandscape?: boolean;
    /** Routes loop-overlay click seeks through AlphaTabRenderer's publishCursorAtTick. Returns true on success, false if the publish ref was not ready (triggers fallback). */
    onLoopClickSeek?: (tick: number) => boolean;
}

export default function BeatCustomLoopOverlay({
    api, container, loopEnabled, onLoopToggle, onLoopChange, onLoopClear,
    isLandscape = false, onLoopClickSeek,
}: Props) {

    const loopRef = useRef(loopEnabled);
    const isLandscapeRef = useRef(isLandscape);
    // [MAESTRO-LOOP-002D] Short-lived render bridge for landscape toggle-ON only.
    // AlphaTabRenderer owns a separate effect that resyncs api.playbackRange from
    // page.tsx's own playbackRange prop; that prop is still null on the same commit
    // commitBarSnap runs in, so it clobbers commitBarSnap's direct write back to null
    // before page.tsx's state round-trips back down. This ref carries the just-committed
    // tick range across that gap for the landscape display branch ONLY — it is not a new
    // long-term source of truth: onLoopChange still owns page/parent state, this is never
    // read for handle drag/editing, and it self-clears the moment api.playbackRange
    // settles or loopEnabled goes false.
    const pendingCommittedRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    const isDragging = useRef(false);
    const startBeat = useRef<any>(null);
    const endBeat = useRef<any>(null);
    const downXRef = useRef<number>(0);
    const downYRef = useRef<number>(0);
    const downTickRef = useRef<number | null>(null);
    const beatCrossedRef = useRef(false);
    const rescueRafPendingRef = useRef(false);

    // Click/drag discriminator shared by onMove and onUp.
    // Prevents micro-drift from painting beat-level preview before onUp bar-snaps.
    const LOOP_CLICK_INTENT_DIST = 24;

    // TEMP diagnostic for handle drag snap sensitivity near barlines.
    // Set false after tuning handle forecast behavior.
    const LOOP_HANDLE_DRAG_DIAG = true;

    // Barline magnet for loop handle drags.
    // If the resolver returns the last beat of the previous bar while the pointer
    // is already to the right of that beat, start handles should prefer the next bar.
    // If it returns the first beat of the next bar while the pointer is still left
    // of that beat, end handles should prefer the previous bar.
    const LOOP_HANDLE_BARLINE_MAGNET = true;

    // Gate for verbose loop overlay diagnostics. Set true to re-enable.
    // [loop-overlay-rebuild] is always on — it confirms self-heal in production.
    const LOOP_OVERLAY_DEBUG = false;

    // Mobile loop tap diagnostic. [MAESTRO-LOOP-DEBUG-001] Silenced — root cause
    // confirmed. Set true to re-enable for future investigation.
    const MOBILE_LOOP_TAP_DEBUG = false;

    // Sprint A: Page-mode loop/cursor row mismatch diagnostic.
    // [MAESTRO-LOOP-DEBUG-001] Silenced ahead of LOOP-002D. Set true to re-enable.
    const PAGE_ROW_DEBUG = false;

    // Sprint B: Landscape loop overlay + cursor-prime diagnostic.
    // [MAESTRO-LOOP-DEBUG-001] Silenced ahead of LOOP-002D. Set true to re-enable.
    const LANDSCAPE_LOOP_DEBUG = false;

    // [MAESTRO-LOOP-002A] Read-only landscape hit-test probe. Logs what resolveBeatWithX/
    // buildRects would resolve for a landscape tap, WITHOUT creating/moving a loop, setting
    // api.playbackRange/api.isLooping, or calling onLoopChange. Does not relax any landscape
    // guard — the guarded return in onDown still returns after logging. Must stay false here;
    // flip locally only for manual LOOP-002A hit-test investigation.
    const LOOP_LANDSCAPE_HITTEST_DEBUG = false;

    // ── Landscape highlight geometry constants ────────────────────────
    const LOOP_X_OFFSET = 0;                    // ← change to 55 to test gutter alignment
    const LANDSCAPE_HIGHLIGHT_Y_OFFSET = -28;   // probe-confirmed June 2026 iPhone 16 Pro Max

    // ── Stage 1: Handle drag state ───────────────────────────────────────────
    const [handleDragging, setHandleDragging] = useState(false);
    const [dragTarget, setDragTarget] = useState<'start' | 'end' | null>(null);
    const dragTargetRef = useRef<'start' | 'end' | null>(null);

    // Preview range: set during handle drag, committed on release (fix E)
    const [previewRange, setPreviewRange] = useState<{ startTick: number; endTick: number } | null>(null);
    const previewRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    const previewRectsRef = useRef<HighlightRect[]>([]);

    // Active handle pointer tracking — raw clientX, no offset math (fix v1.8.2)
    const activeHandleClientXRef = useRef<number>(0);
    const [activeHandleX, setActiveHandleX] = useState<number | null>(null);

    // 🔒 Warn once only
    const tickCacheWarnedRef = useRef(false);

    const [rects, setRects] = useState<HighlightRect[]>([]);

    // Landscape display-only highlight: tracks container scrollLeft to position
    // rects in viewport space (score x-coords span 0–35000+, container is viewport-wide).
    const [landscapeScrollLeft, setLandscapeScrollLeft] = useState(0);
    const scrollRafRef = useRef<number | null>(null);
    const rectsRef = useRef<HighlightRect[]>([]);

    useEffect(() => {
        rectsRef.current = rects;
    }, [rects]);

    useEffect(() => { loopRef.current = loopEnabled; }, [loopEnabled]);
    useEffect(() => { isLandscapeRef.current = isLandscape; }, [isLandscape]);
    // [MAESTRO-LOOP-002D] Clear the pending-range bridge the moment Loop turns off —
    // it must never outlive the loop it was bridging for.
    useEffect(() => {
        if (!loopEnabled) pendingCommittedRangeRef.current = null;
    }, [loopEnabled]);

    // Landscape display-only highlight: sync scrollLeft so rects are positioned
    // in viewport space. container (alphatab-container) is the scroll element in
    // Landscape (overflow-x: auto). The overlay wrapper is a sibling outside the
    // scroll container, so left: r.x - scrollLeft converts score coords to viewport.
    useEffect(() => {
        if (!isLandscape || !api) {
            setLandscapeScrollLeft(0);
            return;
        }
        const scrollEl = container as HTMLElement | null;
        if (!scrollEl) return;
        const sync = () => {
            if (scrollRafRef.current !== null) return;
            scrollRafRef.current = requestAnimationFrame(() => {
                scrollRafRef.current = null;
                setLandscapeScrollLeft(scrollEl.scrollLeft ?? 0);
            });
        };
        sync();
        scrollEl.addEventListener('scroll', sync, { passive: true });
        return () => {
            scrollEl.removeEventListener('scroll', sync);
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
        };
    }, [isLandscape, api, container]);


    useEffect(() => {
        if (loopEnabled) return;
        // Tray Loop OFF (or any external disable) → clear all overlay state.
        // Mirrors the internal clearLoop() path so the tray button and the
        // Clear button produce identical results.
        setRectsWithReason([], 'loopEnabled-false-clear');
        startBeat.current = null;
        endBeat.current = null;
        beatCrossedRef.current = false;
        isDragging.current = false;
        // api.playbackRange and api.isLooping are cleared by the page/renderer
        // via onLoopClear / loopEnabled=false prop — this hook only owns the visual state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loopEnabled]);

    // ─────────────────────────────────────────
    // Beat geometry helpers (unchanged from v1.6)
    // ─────────────────────────────────────────

    const getBeatVB = (beat: any) =>
        api?.renderer?.boundsLookup?.findBeat(beat)?.visualBounds ?? null;

    const beatCenter = (beat: any): number | null => {
        const vb = getBeatVB(beat);
        return vb ? vb.x + vb.w / 2 : null;
    };

    const isFirstBeatInBar = (beat: any): boolean => {
        const prev = beat?.previousBeat;
        if (!prev) return true;
        const curBar = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
        const prevBar = prev?.voice?.bar?.index ?? prev?.voice?.bar?.masterBar?.index;
        return curBar !== prevBar;
    };

    const isLastBeatInBar = (beat: any): boolean => {
        const next = beat?.nextBeat;
        if (!next) return true;
        const curBar = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
        const nextBar = next?.voice?.bar?.index ?? next?.voice?.bar?.masterBar?.index;
        return curBar !== nextBar;
    };

    const adjustHandleBeatNearBarline = (
        beat: any,
        mouseX: number,
        target: 'start' | 'end' | null,
    ): any => {
        if (!LOOP_HANDLE_BARLINE_MAGNET || !beat || !target) return beat;
        const vb = getBeatVB(beat);
        if (!vb) return beat;

        if (target === 'start' && isLastBeatInBar(beat) && beat.nextBeat) {
            const beatRight = vb.x + vb.w;
            const nextVb = getBeatVB(beat.nextBeat);
            const nextBeatLeft = nextVb ? nextVb.x : null;
            const START_BARLINE_RELEASE_ZONE = 35;

            // Pull the start handle forward to the next barline once the pointer
            // has clearly moved past the previous bar's last beat. Do not wait
            // for the next bar's first beat visualBounds — that can sit well to
            // the right of the actual barline and makes the left handle miss
            // barline snaps when the pointer is visually centered on the barline.
            if (
                mouseX >= beatRight + START_BARLINE_RELEASE_ZONE
            ) {
                const nextBarIdx = beat.nextBeat?.voice?.bar?.index
                    ?? beat.nextBeat?.voice?.bar?.masterBar?.index;
                const curBarIdx = beat?.voice?.bar?.index
                    ?? beat?.voice?.bar?.masterBar?.index;
                if (nextBarIdx != null && nextBarIdx !== curBarIdx) {
                    console.log('[loop-handle-barline-magnet]', {
                        target,
                        action: 'last-beat-to-next-bar',
                        fromTick: tickOf(beat),
                        toTick: tickOf(beat.nextBeat),
                        mouseX: Number(mouseX.toFixed(1)),
                        beatRight: Number(beatRight.toFixed(1)),
                        nextBeatLeft: nextBeatLeft == null ? null : Number(nextBeatLeft.toFixed(1)),
                        releaseZone: START_BARLINE_RELEASE_ZONE,
                    });
                    return beat.nextBeat;
                }
            }
        }

        if (target === 'start' && isFirstBeatInBar(beat) && beat.nextBeat) {
            const beatRight = vb.x + vb.w;
            const nextBarIdx = beat.nextBeat?.voice?.bar?.index
                ?? beat.nextBeat?.voice?.bar?.masterBar?.index;
            const curBarIdx = beat?.voice?.bar?.index
                ?? beat?.voice?.bar?.masterBar?.index;
            const START_FIRST_BEAT_RELEASE_ZONE = 18;

            // Once the pointer is clearly past the first beat/rest of the bar,
            // let the start preview release from the barline and forecast toward
            // the next beat. This mirrors the right-handle feel in reverse.
            if (
                nextBarIdx === curBarIdx &&
                mouseX >= beatRight + START_FIRST_BEAT_RELEASE_ZONE
            ) {
                console.log('[loop-handle-barline-magnet]', {
                    target,
                    action: 'first-beat-to-next-beat',
                    fromTick: tickOf(beat),
                    toTick: tickOf(beat.nextBeat),
                    mouseX: Number(mouseX.toFixed(1)),
                    beatRight: Number(beatRight.toFixed(1)),
                    releaseZone: START_FIRST_BEAT_RELEASE_ZONE,
                });
                return beat.nextBeat;
            }
        }

        if (target === 'end' && isFirstBeatInBar(beat) && beat.previousBeat) {
            const beatLeft = vb.x;
            const prevVb = getBeatVB(beat.previousBeat);
            const prevBeatRight = prevVb ? prevVb.x + prevVb.w : null;
            const END_BARLINE_HOLD_ZONE = 18;

            // Only hold the end handle back to the previous bar while the pointer
            // is still near the previous bar's last visible beat. Once the pointer
            // has clearly moved into the new bar, allow the preview to forecast
            // into the first beat instead of sticking to the barline until beatLeft.
            if (
                mouseX <= beatLeft &&
                (prevBeatRight == null || mouseX <= prevBeatRight + END_BARLINE_HOLD_ZONE)
            ) {
                const prevBarIdx = beat.previousBeat?.voice?.bar?.index
                    ?? beat.previousBeat?.voice?.bar?.masterBar?.index;
                const curBarIdx = beat?.voice?.bar?.index
                    ?? beat?.voice?.bar?.masterBar?.index;
                if (prevBarIdx != null && prevBarIdx !== curBarIdx) {
                    console.log('[loop-handle-barline-magnet]', {
                        target,
                        action: 'first-beat-to-previous-bar',
                        fromTick: tickOf(beat),
                        toTick: tickOf(beat.previousBeat),
                        mouseX: Number(mouseX.toFixed(1)),
                        beatLeft: Number(beatLeft.toFixed(1)),
                        prevBeatRight: prevBeatRight == null ? null : Number(prevBeatRight.toFixed(1)),
                        holdZone: END_BARLINE_HOLD_ZONE,
                    });
                    return beat.previousBeat;
                }
            }
        }

        return beat;
    };

    // ─────────────────────────────────────────
    // Tick resolution (unchanged from v1.6)
    // ─────────────────────────────────────────

    /** 🔒 V1.6 — DO NOT replace with beat.absolutePlaybackStart */
    const tickOf = (beat: any): number => {
        const tickCache = (api as any)?.tickCache;
        if (tickCache && typeof tickCache.getBeatStart === 'function') {
            return tickCache.getBeatStart(beat);
        }
        if (!tickCacheWarnedRef.current) {
            tickCacheWarnedRef.current = true;
            console.warn('⚠️ tickCache.getBeatStart unavailable — falling back to absolutePlaybackStart (repeat sections may be wrong)');
        }
        return beat?.absolutePlaybackStart ?? 0;
    };

    const durOf = (b: any): number => b?.playbackDuration ?? b?.duration ?? 0;

    const loHi = (a: any, b: any): [any, any] =>
        tickOf(a) <= tickOf(b) ? [a, b] : [b, a];

    // ─────────────────────────────────────────
    // Bar-edge helpers (V1.7.4 — beat-first graph traversal)
    // ─────────────────────────────────────────

    /**
     * V1.7.4 — Walks the beat's linked list (previousBeat/nextBeat) to find
     * first and last beats in the same bar. 100% reliable — no tickCache needed.
     */
    const getBarEdgesFromBeat = (beat: any): { first: any; last: any } | null => {
        if (!beat) return null;
        const barIdx = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
        if (barIdx == null) return null;

        let first = beat;
        while (first.previousBeat) {
            const prevBarIdx = first.previousBeat?.voice?.bar?.index
                ?? first.previousBeat?.voice?.bar?.masterBar?.index;
            if (prevBarIdx !== barIdx) break;
            first = first.previousBeat;
        }

        let last = beat;
        while (last.nextBeat) {
            const nextBarIdx = last.nextBeat?.voice?.bar?.index
                ?? last.nextBeat?.voice?.bar?.masterBar?.index;
            if (nextBarIdx !== barIdx) break;
            last = last.nextBeat;
        }

        return { first, last };
    };

    /**
     * V1.7.4 — Expanded bar range with structural fallback.
     * Primary: tickCache.masterBars traversal (repeat-safe).
     * Fallback: beat's own masterBar data (structural — wrong in repeats).
     */
    const getExpandedBarRange = (tick: number, beat?: any): { startTick: number; endTick: number } | null => {
        const tickCache = (api as any)?.tickCache;
        const masterBarsArr = (tickCache as any)?.masterBars as any[];

        if (masterBarsArr?.length) {
            for (const mb of masterBarsArr) {
                const dur = mb?.masterBar?.calculateDuration?.() ?? 0;
                if (dur <= 0) continue;
                if (tick >= mb.start && tick < mb.start + dur) {
                    return { startTick: mb.start, endTick: mb.start + dur };
                }
            }
        }

        if (beat) {
            const mb = beat?.voice?.bar?.masterBar;
            if (mb) {
                const start = mb.start ?? 0;
                const dur = typeof mb.calculateDuration === 'function'
                    ? mb.calculateDuration() : (mb.duration ?? 1920);
                if (dur > 0) {
                    console.warn('⚠️ getExpandedBarRange: masterBars miss — using structural fallback');
                    return { startTick: start, endTick: start + dur };
                }
            }
        }

        return null;
    };

    /**
     * V1.7.5 — Direct bar geometry renderer. Bypasses buildRects entirely.
     * No midpoint trimming, no center averaging, no merge heuristics.
     * Draws exact visualBounds of the bar — zero fan-out possible.
     *
     * Used by commitBarSnap ONLY. Drag path still uses buildRects.
     */
    const buildBarRects = (barIndex: number): HighlightRect[] => {
        const results: HighlightRect[] = [];
        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        for (const sys of systems) {
            for (const mbb of (sys?.bars ?? [])) {
                const idx = mbb?.masterBar?.index ?? mbb?.index;
                if (idx !== barIndex) continue;
                for (const bar of (mbb?.bars ?? [])) {
                    const b = bar?.visualBounds;
                    if (!b) continue;
                    results.push({ x: b.x, y: b.y, w: b.w, h: b.h });
                }
            }
        }
        return results;
    };

    // ── Fresh-attack resolver for end handle reseat ───────────────────────────────
    const isFreshAttackBeat = (beat: any): boolean => {
        if (!beat) return false;
        if (beat.isRest) return false;
        const notes: any[] = beat.notes ?? [];
        if (!notes.length) return false;
        return !notes.every((n: any) =>
            n.isTieDestination === true ||
            n.tieDestination === true ||
            n.isGhost === true ||
            n.isLetRingDestination === true
        );
    };

    const resolveEndHandleFreshAttack = (
        endTick: number,
        loopStartTick: number,
    ): { beat: any; tick: number } | null => {
        const tickCache = (api as any)?.tickCache;
        const trackSet = api?.tracks
            ? new Set(api.tracks.map((t: any) => t.index as number))
            : new Set([0]);
        if (!tickCache?.findBeat) return null;
        for (let t = endTick - 1; t >= loopStartTick; t--) {
            const r = tickCache.findBeat(trackSet, t);
            if (!r?.beat) continue;
            if (isFreshAttackBeat(r.beat)) {
                return { beat: r.beat, tick: r.beat.absolutePlaybackStart ?? t };
            }
        }
        return null;
    };

    const resolveStartHandleFreshAttack = (
        startTick: number,
        loopEndTick: number,
    ): { beat: any; tick: number } | null => {
        const tickCache = (api as any)?.tickCache;
        const trackSet = api?.tracks
            ? new Set(api.tracks.map((t: any) => t.index as number))
            : new Set([0]);
        if (!tickCache?.findBeat) return null;
        for (let t = startTick; t < loopEndTick; t++) {
            const r = tickCache.findBeat(trackSet, t);
            if (!r?.beat) continue;
            if (isFreshAttackBeat(r.beat)) {
                return { beat: r.beat, tick: r.beat.absolutePlaybackStart ?? t };
            }
        }
        return null;
    };

    /**
     * V1.7.5 — Unified bar-snap commit. Accepts a BEAT OBJECT.
     * Uses buildBarRects for geometry (direct bar bounds — no midpoint math).
     * Uses getExpandedBarRange for ticks (repeat-safe).
     * Returns true on success, false if helpers fail (falls through to beat-level).
     */
    const commitBarSnap = (beat: any, source: string): boolean => {
        const clickedTick = tickOf(beat);
        if (MOBILE_LOOP_TAP_DEBUG) {
            console.log('[mobile-loop-commit-probe]', {
                reason: 'commitBarSnap-entry',
                source,
                clickedTick,
                beatBarIdx: beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index ?? null,
                apiTickBefore: (api as any)?.tickPosition ?? null,
                playbackRange: api?.playbackRange ?? null,
                loopEnabled: loopRef.current,
                hasPlayer: !!(api as any)?.player,
                hasSeekTicks: typeof (api as any)?.player?.seekTicks === 'function',
            });
        }
        // 🔥 V1.7.6: Grace-skip — applies to ALL callers (click + toggle-ON).
        // graceType===2 beats are pre-bar slide-in anchors whose ticks fall
        // inside the PREVIOUS bar's playback range. Walk forward same-bar to
        // the first non-grace beat so getExpandedBarRange gets the right tick.
        let snapBeat = beat;
        if (snapBeat?.graceType === 2) {
            const snapBarIdx = snapBeat?.voice?.bar?.index
                ?? snapBeat?.voice?.bar?.masterBar?.index;
            let candidate = snapBeat.nextBeat;
            while (candidate) {
                const candBarIdx = candidate?.voice?.bar?.index
                    ?? candidate?.voice?.bar?.masterBar?.index;
                if (candBarIdx !== snapBarIdx) break; // overshot — keep original
                if (candidate.graceType !== 2) { snapBeat = candidate; break; }
                candidate = candidate.nextBeat;
            }
        }

        const range = getExpandedBarRange(tickOf(snapBeat), snapBeat);
        const barIdx = snapBeat?.voice?.bar?.index ?? snapBeat?.voice?.bar?.masterBar?.index;

        if (!range || barIdx == null) {
            console.warn(`⚠️ commitBarSnap(${source}): helpers returned null`, {
                hasRange: !!range, barIdx,
                tick: tickOf(snapBeat),
            });
            return false;
        }

        const { startTick, endTick } = range;

        console.log(`🎼 BeatLoop bar-snap (${source}):`, {
            startTick, endTick, barIdx,
        });

        api.playbackRange = { startTick, endTick };
        api.isLooping = true;
        // [MAESTRO-LOOP-002D] Bridge for the landscape display branch only (see
        // pendingCommittedRangeRef declaration). Harmless for the 'click' source too —
        // that path is unreachable in landscape (LandscapeLoopClickGuard/LandscapeOnUpGuard
        // are untouched), and this ref is never read outside the landscape render branch.
        pendingCommittedRangeRef.current = { startTick, endTick };
        // Clear override when loop is moved — new loop start takes precedence
        (window as any).__maestroLoopPlayStartOverrideTick = null;

        // Toggle ON has no mouse-click target, so keep the proven startTick reseat.
        // Click-to-move is Songsterr-style: loop snaps bar-to-bar, but the cursor
        // stays at the clicked beat/tick instead of being forced to the bar start.
        if (source === 'toggle ON') {
            if (api.tickPosition !== undefined) {
                api.tickPosition = startTick;
            }
            api.player?.seekTicks?.(startTick);

            // V1.8.4: set reseat flag BEFORE requestSnap so AlphaTabRenderer
            // sees it on the very next playerPositionChanged after seek.
            // Renderer flushes all stable refs and re-primes from startTick,
            // preventing pick/slide/tie content from mis-priming the cursor
            // on the first loop pass.
            (window as any).__maestroLoopReseat = {
                tick: startTick,
                at: Date.now(),
                reason: source,
            };

            (window as any).__maestroManualSeek = Date.now();
            const cursor = (window as any).__maestroCursor;
            cursor?.requestSnap?.('loop-toggle-on');
        } else if (source === 'click') {
            // V1.8.8: Arm the manual-seek globals BEFORE api.tickPosition / seekTicks
            // so AlphaTabRenderer's playerPositionChanged sees the freeze gate already
            // armed if the setter fires the event synchronously.
            const manualSeekNow = Date.now();
            (window as any).__maestroManualSeek = manualSeekNow;
            // V1.8.5: Tell AlphaTabRenderer's seek-freeze gate which tick to
            // expect. Without this, a stale seekTargetTickRef (e.g. 0 from a
            // prior touch/landscape seek) would filter out the clickedTick event
            // and both AlphaTab-internal startTick seeks, leaving cursor frozen.
            (window as any).__maestroManualSeekTargetTick = clickedTick;
            // V117/V1.8.9: Set allowBacktrack BEFORE api.tickPosition — the setter may
            // fire playerPositionChanged synchronously; backtrack guard must be armed first.
            (window as any).__maestroAllowBacktrackUntil = Date.now() + 600;
            if (api.tickPosition !== undefined) {
                api.tickPosition = clickedTick;
            }
            api.player?.seekTicks?.(clickedTick);
            (window as any).__maestroLastIntentionalTick = clickedTick;
            (window as any).__maestroLastIntentionalTickAt = Date.now();
            if (PAGE_ROW_DEBUG) {
                const surfaceEl = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
                const surfaceRect = surfaceEl?.getBoundingClientRect() ?? null;
                const vbProbe = getBeatVB(snapBeat);
                const systems: any[] = api?.renderer?.boundsLookup?.staffSystems ?? [];
                const resolvedBeatSystemIndex = systems.findIndex((sys: any) =>
                    (sys?.bars ?? []).some((mbb: any) =>
                        (mbb?.masterBar?.index ?? mbb?.index) === barIdx
                    )
                );
                const barRectsProbe = buildBarRects(barIdx);
                console.log('[page-loop-cursor-row-probe]', {
                    reason: 'commitBarSnap-click',
                    clickedTick,
                    clickedBarIdx: barIdx,
                    startTick,
                    endTick,
                    clientX: downXRef.current,
                    clientY: downYRef.current,
                    surfaceRectTop: surfaceRect?.top ?? null,
                    surfaceRectLeft: surfaceRect?.left ?? null,
                    surfaceScrollTop: surfaceEl?.scrollTop ?? 0,
                    windowScrollY: typeof window !== 'undefined' ? window.scrollY : null,
                    visualViewportOffsetTop: typeof window !== 'undefined' ? (window.visualViewport?.offsetTop ?? 0) : null,
                    visualViewportHeight: typeof window !== 'undefined' ? (window.visualViewport?.height ?? null) : null,
                    resolvedBeatX: vbProbe ? vbProbe.x + vbProbe.w / 2 : null,
                    resolvedBeatY: vbProbe?.y ?? null,
                    resolvedBeatSystemIndex,
                    resolvedBeatBarIdx: barIdx,
                    firstBarRectX: barRectsProbe[0]?.x ?? null,
                    firstBarRectY: barRectsProbe[0]?.y ?? null,
                    isStripRender: isLandscape,
                    manualSeekTargetTick: (window as any).__maestroManualSeekTargetTick ?? null,
                    manualSeekAge: (window as any).__maestroManualSeek
                        ? Date.now() - (window as any).__maestroManualSeek : null,
                });
            }
            const didPublishLoopClickSeek = onLoopClickSeek?.(clickedTick) === true;
            if (!didPublishLoopClickSeek) {
                const cursor = (window as any).__maestroCursor;
                cursor?.requestSnap?.('loop-click-cursor');
            }
            if (MOBILE_LOOP_TAP_DEBUG) {
                console.log('[mobile-loop-cursor-probe]', {
                    reason: 'commitBarSnap-click-cursor',
                    source,
                    clickedTick,
                    startTick,
                    endTick,
                    apiTickAfter: (api as any)?.tickPosition ?? null,
                    calledSeekTicks: typeof (api as any)?.player?.seekTicks === 'function',
                    calledRequestSnapReason: 'via-onLoopClickSeek→publishCursorAtTick',
                    hasCursor: !!(window as any).__maestroCursor,
                    manualSeekFlag: (window as any).__maestroManualSeek ?? null,
                    manualSeekTargetTick: (window as any).__maestroManualSeekTargetTick ?? null,
                    loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                    loopPlayStartOverrideTick: (window as any).__maestroLoopPlayStartOverrideTick ?? null,
                    note: '__maestroLoopReseat NOT set on click — only toggle-ON. __maestroManualSeekTargetTick set to clickedTick.',
                });
            }
            console.log('🎼 BeatLoop click cursor re-anchored via publishCursorAtTick:', {
                clickedTick,
                barStartTick: startTick,
                barEndTick: endTick,
            });
        }

        setRectsWithReason(buildBarRects(barIdx), `commitBarSnap:${source}`);
        onLoopChange?.(startTick, endTick);
        logLoopOverlayState(`commitBarSnap:${source}`);
        return true;
    };

    // ─────────────────────────────────────────
    // Rect builder — midpoint-interspace trimming (unchanged from v1.6)
    // ─────────────────────────────────────────

    const buildRects = (lo: any, hi: any): HighlightRect[] => {
        if (!lo || !hi || !api?.renderer?.boundsLookup) return [];

        const loBarIdx = lo?.voice?.bar?.index ?? lo?.voice?.bar?.masterBar?.index;
        const hiBarIdx = hi?.voice?.bar?.index ?? hi?.voice?.bar?.masterBar?.index;
        if (loBarIdx == null || hiBarIdx == null) return [];

        const minBar = Math.min(loBarIdx, hiBarIdx);
        const maxBar = Math.max(loBarIdx, hiBarIdx);

        let x1Global: number | null = null;
        const loVB = getBeatVB(lo);
        if (isFirstBeatInBar(lo)) {
            x1Global = null;
        } else {
            const prevCenter = beatCenter(lo.previousBeat);
            const curCenter = beatCenter(lo);
            if (prevCenter != null && curCenter != null) {
                x1Global = (prevCenter + curCenter) / 2;
            } else if (loVB) {
                x1Global = loVB.x;
            }
        }

        let x2Global: number | null = null;
        const hiVB = getBeatVB(hi);
        if (isLastBeatInBar(hi)) {
            x2Global = null;
        } else {
            const curCenter = beatCenter(hi);
            const nextCenter = beatCenter(hi.nextBeat);
            if (curCenter != null && nextCenter != null) {
                x2Global = (curCenter + nextCenter) / 2;
            } else if (hiVB) {
                x2Global = hiVB.x + hiVB.w;
            }
        }

        const results: HighlightRect[] = [];
        const systems = api.renderer.boundsLookup.staffSystems ?? [];

        for (const sys of systems) {
            for (const mbb of (sys?.bars ?? [])) {
                const idx = mbb?.masterBar?.index ?? mbb?.index;
                if (idx == null || idx < minBar || idx > maxBar) continue;

                for (const bar of (mbb?.bars ?? [])) {
                    const b = bar?.visualBounds;
                    if (!b) continue;

                    const x1 = (idx === minBar && x1Global != null) ? x1Global : b.x;
                    const x2 = (idx === maxBar && x2Global != null) ? x2Global : b.x + b.w;
                    const w = Math.max(x2 - x1, 2);

                    const last = results[results.length - 1];
                    if (last && Math.abs(last.y - b.y) < 4 && Math.abs((last.x + last.w) - x1) < 6) {
                        last.w = (x1 + w) - last.x;
                    } else {
                        results.push({ x: x1, y: b.y, w, h: b.h });
                    }
                }
            }
        }

        return results;
    };

    const logLoopOverlayState = (reason: string) => {
        if (!LOOP_OVERLAY_DEBUG) return;
        const apiRange = api?.playbackRange ?? null;
        const loopEl = (container ?? document).querySelector('.beat-loop-highlight') as HTMLElement | null;
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        console.log('[loop-overlay-probe]', {
            reason,
            loopEnabled,
            apiRange,
            previewRange: previewRangeRef?.current ?? null,
            rectsCount: rects?.length ?? null,
            hasLoopEl: !!loopEl,
            loopDisplay: loopEl ? getComputedStyle(loopEl).display : null,
            loopOpacity: loopEl ? getComputedStyle(loopEl).opacity : null,
            surfaceFound: !!surface,
            surfaceW: surface?.scrollWidth ?? null,
            systemsLength: systems.length,
            firstSystemBars: (systems?.[0] as any)?.bars?.length ?? null,
        });
    };

    const setRectsWithReason = (next: typeof rects, reason: string) => {
        if (LOOP_OVERLAY_DEBUG) {
            console.log('[loop-overlay-setRects]', {
                reason,
                nextCount: next.length,
                loopEnabled: loopRef.current,
                apiRange: api?.playbackRange ?? null,
            });
        }
        setRects(next);
    };

    // ─────────────────────────────────────────
    // Beat resolver (unchanged from v1.6)
    // ─────────────────────────────────────────

    const resolveBeatWithX = (e: MouseEvent): { beat: any; mouseX: number } | null => {
        const engine = (api as any)?.boundsLookup ?? api?.renderer?.boundsLookup;
        if (!engine) return null;

        const surface = (e.target as HTMLElement).closest?.('.at-surface') as HTMLElement | null;
        if (!surface) return null;

        const domRect = surface.getBoundingClientRect();
        const x = (e.clientX - domRect.left) + (surface.scrollLeft ?? 0);
        const y = (e.clientY - domRect.top) + (surface.scrollTop ?? 0);

        const raw = engine.getBeatAtPos(x, y);
        const beat = raw?.beat ?? raw ?? null;
        if (beat) return { beat, mouseX: x };

        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        let nearestBeat: any = null;
        let nearestDist = Infinity;

        for (const sys of systems) {
            const sb = sys?.visualBounds ?? sys?.realBounds;
            if (!sb || y < sb.y - 10 || y > sb.y + sb.h + 10) continue;

            for (const mbb of (sys?.bars ?? [])) {
                for (const bar of (mbb?.bars ?? [])) {
                    const b = bar?.visualBounds;
                    if (!b || x < b.x - 20 || x > b.x + b.w + 20) continue;

                    const tickCache = (api as any).tickCache;
                    const trackIndices = api.tracks
                        ? new Set(api.tracks.map((t: any) => t.index))
                        : new Set([0]);

                    if (tickCache) {
                        const mb = mbb?.masterBar;
                        const barStart = mbb?.start ?? mb?.start ?? 0;
                        const barDur = typeof mb?.calculateDuration === 'function'
                            ? mb.calculateDuration() : (mb?.duration ?? 1920);

                        for (let t = barStart; t < barStart + barDur; t += 30) {
                            const r = tickCache.findBeat(trackIndices, t);
                            if (!r?.beat) continue;
                            const vb = getBeatVB(r.beat);
                            if (!vb) continue;
                            const cx = vb.x + vb.w / 2;
                            const dist = Math.abs(cx - x);
                            if (dist < nearestDist) {
                                nearestDist = dist;
                                nearestBeat = r.beat;
                            }
                        }
                    }
                }
            }
        }

        return nearestBeat ? { beat: nearestBeat, mouseX: x } : null;
    };

    // ─────────────────────────────────────────
    // Helper: Check if pointer is inside loop highlight area
    // ─────────────────────────────────────────

    const isPointerInsideLoopHighlight = (e: MouseEvent): boolean => {
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        if (!surface || !rectsRef.current.length) return false;

        const domRect = surface.getBoundingClientRect();
        const x = (e.clientX - domRect.left) + (surface.scrollLeft ?? 0) - LOOP_X_OFFSET;
        const y = (e.clientY - domRect.top) + (surface.scrollTop ?? 0);

        return rectsRef.current.some(r =>
            x >= r.x &&
            x <= r.x + r.w &&
            y >= r.y - 60 &&
            y <= r.y + r.h + 60
        );
    };

    // ─────────────────────────────────────────
    // Mouse handlers — v1.7.5: beatCrossed gate + zero fan-out
    // ─────────────────────────────────────────

    useEffect(() => {
        if (!api) return;
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        if (!surface) { console.error('❌ BeatOverlay: .at-surface not found'); return; }

        // ── onDown — record anchors, NO rect painting ─────────
        // V1.7.5: Do NOT call setRects here. This eliminates fan-out entirely.
        // On click: onUp paints the full bar directly (no single-beat flash).
        // On drag: first onMove paints the drag range (imperceptible delay).
        const onDown = (e: MouseEvent) => {
            // [MAESTRO-LOOP-002A.1] Debug-only bypass. LOOP-002A's probe never logged because
            // it sat behind this original `if (!loopRef.current) return;` — at the time, in
            // landscape, Loop could only be enabled when a loop already existed (LOOP-001A's
            // button gating), so testing "where creation would be expected" (no loop yet) meant
            // loopRef.current was false and this line returned before the landscape block below
            // was ever reached. LOOP-001A's button restriction was since removed by LOOP-002B
            // (landscape ON now creates a real bar-snapped loop, so it no longer needs to stay
            // disabled with no loop present) — this bypass is kept as-is since it's still
            // needed for probing with the debug flag on. When the debug flag is false,
            // debugLandscapeProbe is always false, so this line is byte-for-byte identical to
            // the original `if (!loopRef.current) return;` — no production change.
            const debugLandscapeProbe = LOOP_LANDSCAPE_HITTEST_DEBUG && isLandscapeRef.current;
            if (!loopRef.current && !debugLandscapeProbe) return;
            if (isLandscapeRef.current) {
                // [MAESTRO-LOOP-002A][LandscapeHitTest] Read-only probe only — this is the
                // LandscapeLoopClickGuard. The guard itself is unchanged: no range is created,
                // no ref/state used for dragging/selection is touched, and we still return
                // below exactly as before. resolveBeatWithX/buildRects are pure read-only
                // functions (verified: they only read api.renderer.boundsLookup/api.tickCache
                // and return computed values — no writes to api, refs, or state), so calling
                // them here for logging is safe.
                if (LOOP_LANDSCAPE_HITTEST_DEBUG) {
                    // [MAESTRO-LOOP-002A.1] Best-effort capture so a debug tap doesn't also
                    // trigger AlphaTab's own tap-to-seek/play on the same gesture. This cannot
                    // be guaranteed to suppress AlphaTab's internal click handling if that
                    // behavior isn't a separate DOM listener on .at-surface — verify with the
                    // manual test whether playback still starts.
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation?.();
                    const surfaceEl = (e.target as HTMLElement)?.closest?.('.at-surface') as HTMLElement | null;
                    const surfaceRect = surfaceEl?.getBoundingClientRect() ?? null;
                    const diagBeat = resolveBeatWithX(e);
                    const probeRects = diagBeat?.beat ? buildRects(diagBeat.beat, diagBeat.beat) : [];

                    const yBands: number[] = [];
                    for (const r of probeRects) {
                        const band = Math.round(r.y / 4) * 4;
                        if (!yBands.includes(band)) yBands.push(band);
                    }

                    console.log('[LOOP-002A][LandscapeHitTest]', {
                        pointer: {
                            clientX: Number(e.clientX.toFixed(1)),
                            clientY: Number(e.clientY.toFixed(1)),
                            pointerType: (e as any).pointerType ?? null,
                        },
                        surfaceRect: surfaceRect ? {
                            left: Number(surfaceRect.left.toFixed(1)),
                            top: Number(surfaceRect.top.toFixed(1)),
                            width: Number(surfaceRect.width.toFixed(1)),
                            height: Number(surfaceRect.height.toFixed(1)),
                            scrollLeft: surfaceEl?.scrollLeft ?? null,
                            scrollTop: surfaceEl?.scrollTop ?? null,
                        } : null,
                        resolvedMouseX: diagBeat?.mouseX != null ? Number(diagBeat.mouseX.toFixed(1)) : null,
                        resolvedBeatTick: diagBeat?.beat ? tickOf(diagBeat.beat) : null,
                        resolvedBeatBarIdx: diagBeat?.beat?.voice?.bar?.index
                            ?? diagBeat?.beat?.voice?.bar?.masterBar?.index ?? null,
                        beatResolved: !!diagBeat?.beat,
                        // Single-beat probe range (lo === hi) — buildRects doesn't return
                        // per-rect tick data, so this is the only start/end available here.
                        probeRangeStartTick: diagBeat?.beat ? tickOf(diagBeat.beat) : null,
                        probeRangeEndTick: diagBeat?.beat ? tickOf(diagBeat.beat) : null,
                        buildRects: {
                            totalRects: probeRects.length,
                            distinctYBands: yBands.length,
                            multipleTrackLanesDetected: yBands.length > 1,
                            yBands,
                            firstRects: probeRects.slice(0, 5).map(r => ({
                                x: Number(r.x.toFixed(1)),
                                y: Number(r.y.toFixed(1)),
                                w: Number(r.w.toFixed(1)),
                                h: Number(r.h.toFixed(1)),
                            })),
                        },
                        currentApiPlaybackRange: api?.playbackRange ?? null,
                        currentApiIsLooping: (api as any)?.isLooping ?? null,
                        note: 'read-only probe — no loop created/moved, no api writes, guard still returns below',
                    });
                }
                return;
            }
            if (MOBILE_LOOP_TAP_DEBUG) {
                const diagBeat = resolveBeatWithX(e);
                console.log('[mobile-loop-tap-probe]', {
                    reason: 'onDown',
                    eventType: 'mousedown',
                    pointerType: (e as any).pointerType ?? null,
                    clientX: Number(e.clientX.toFixed(1)),
                    clientY: Number(e.clientY.toFixed(1)),
                    mouseX: diagBeat?.mouseX != null ? Number(diagBeat.mouseX.toFixed(1)) : null,
                    resolvedBeatTick: diagBeat?.beat ? tickOf(diagBeat.beat) : null,
                    resolvedBeatBarIdx: diagBeat?.beat?.voice?.bar?.index
                        ?? diagBeat?.beat?.voice?.bar?.masterBar?.index ?? null,
                    wasInsideHighlight: rectsRef.current.length > 0 && isPointerInsideLoopHighlight(e),
                    loopEnabled: loopRef.current,
                    apiTickBefore: (api as any)?.tickPosition ?? null,
                    playbackRange: api?.playbackRange ?? null,
                    targetTagName: (e.target as HTMLElement)?.tagName ?? null,
                    targetInAtSurface: !!(e.target as HTMLElement)?.closest?.('.at-surface'),
                });
            }
            // Clicking the existing loop highlight should not move/recreate the loop.
            // Handles stop propagation separately, so handle drags still work.
            if (isPointerInsideLoopHighlight(e)) {
                // Click inside existing loop highlight — seek cursor only, do not move loop.
                const result = resolveBeatWithX(e);
                if (result?.beat) {
                    const seekTick = tickOf(result.beat);
                    (window as any).__maestroAllowBacktrackUntil = Date.now() + 300;
                    (window as any).__maestroLastIntentionalTick = seekTick;
                    (window as any).__maestroLastIntentionalTickAt = Date.now();
                    if (api.tickPosition !== undefined) api.tickPosition = seekTick;
                    api.player?.seekTicks?.(seekTick);
                    (window as any).__maestroManualSeek = Date.now();
                    (window as any).__maestroLoopPlayStartOverrideTick = seekTick;
                    (window as any).__maestroCursor?.requestSnap?.('loop-highlight-click-cursor');
                    console.log('[loop-highlight-click-cursor]', {
                        seekTick,
                        loopStartTick: (api.playbackRange as any)?.startTick,
                        loopEndTick: (api.playbackRange as any)?.endTick,
                    });
                }
                return;
            }
            const result = resolveBeatWithX(e);
            if (!result) return;

            isDragging.current = true;
            downXRef.current = e.clientX;
            downYRef.current = e.clientY;
            startBeat.current = result.beat;
            endBeat.current = result.beat;
            downTickRef.current = tickOf(result.beat);
            beatCrossedRef.current = false;
        };

        // ── onMove — beatCrossed tracking + gated painting ──
        // V1.7.5: setRects ONLY fires after a beat boundary is crossed.
        // This prevents single-beat rect flash on clicks (fan-out source).
        //
        // CRITICAL: Paint in the SAME event that detects the crossing, not
        // the next one. Without this, the user has to overshoot to beat 2
        // and then the rect only appears on the following mousemove — feels
        // like a one-frame lag / "have to drag past then come back."
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current || !startBeat.current) return;
            const result = resolveBeatWithX(e);
            if (!result) return;

            endBeat.current = result.beat;

            // Track whether the user ever crossed a beat boundary, but only
            // promote to drag intent after the pointer moves beyond click-drift.
            // This prevents a micro beat-level preview flash before onUp later
            // reclassifies the gesture as click-intent and bar-snaps.
            const curTick = tickOf(result.beat);
            const dx = e.clientX - downXRef.current;
            const dy = e.clientY - downYRef.current;
            const pixelDist = Math.sqrt(dx * dx + dy * dy);
            if (
                downTickRef.current != null &&
                curTick !== downTickRef.current &&
                pixelDist > LOOP_CLICK_INTENT_DIST
            ) {
                beatCrossedRef.current = true;
            }

            // Only paint rects once a real drag is confirmed (beat crossed + beyond click drift).
            // Clean clicks now paint only once from onUp via commitBarSnap.
            if (!beatCrossedRef.current) return;

            const [lo, hi] = loHi(startBeat.current, result.beat);
            setRectsWithReason(buildRects(lo, hi), 'onMove-drag-preview');
        };

        // ── onUp — SOLE AUTHORITY (v1.7.3+ architecture) ─────
        //
        // V1.7.5 Intent Gate:
        //   Bar-snap: !beatCrossedRef.current AND pixelDist < CLICK_DIST
        //   Beat-level: everything else (v1.6 path — always the fallback)
        //
        // WHY beatCrossedRef is better than sameBeat:
        //   sameBeat (tickOf(lo) === tickOf(hi)) checks resolver state at mouseup.
        //   If the resolver drifts to an adjacent beat due to tiny trackpad movement,
        //   sameBeat becomes false and bar-snap fails → "stuck on 1–2 beats."
        //   beatCrossedRef tracks what happened DURING the gesture — if no onMove
        //   ever resolved a different beat, it's a click. Period.
        const onUp = (e: MouseEvent) => {
            if (!isDragging.current) return;
            if (isLandscapeRef.current) {
                isDragging.current = false;
                startBeat.current = null;
                endBeat.current = null;
                return;
            }
            isDragging.current = false;

            const sb = startBeat.current;
            const eb = endBeat.current;
            if (!sb) return;

            const dx = (e?.clientX ?? downXRef.current) - downXRef.current;
            const dy = (e?.clientY ?? downYRef.current) - downYRef.current;
            const pixelDist = Math.sqrt(dx * dx + dy * dy);
            const isClickIntent = pixelDist <= LOOP_CLICK_INTENT_DIST;

            if (MOBILE_LOOP_TAP_DEBUG) {
                console.log('[mobile-loop-tap-probe]', {
                    reason: 'onUp',
                    eventType: 'mouseup',
                    pointerType: (e as any).pointerType ?? null,
                    clientX: Number(e.clientX.toFixed(1)),
                    clientY: Number(e.clientY.toFixed(1)),
                    pixelDist: Number(pixelDist.toFixed(1)),
                    isClickIntent,
                    beatCrossed: beatCrossedRef.current,
                    willBarSnap: !beatCrossedRef.current || isClickIntent,
                    startBeatTick: sb ? tickOf(sb) : null,
                    startBeatBarIdx: sb?.voice?.bar?.index ?? sb?.voice?.bar?.masterBar?.index ?? null,
                    apiTickBefore: (api as any)?.tickPosition ?? null,
                    playbackRange: api?.playbackRange ?? null,
                    loopEnabled: loopRef.current,
                });
            }

            // ── Click → bar-snap ───────────────────────────────
            // Treat small pointer movement as click intent even if the beat resolver
            // briefly crosses into an adjacent beat. Real-world click drift can hit
            // ~17–21px on trackpad/mouse release, so this guard prevents rare
            // one-beat loop commits during normal bar-to-bar click moves.
            if (!beatCrossedRef.current || isClickIntent) {
                console.log('🎼 BeatLoop click-intent bar-snap:', {
                    pixelDist: pixelDist.toFixed(1),
                    clickIntent: isClickIntent,
                    clickIntentDist: LOOP_CLICK_INTENT_DIST,
                    beatCrossed: beatCrossedRef.current,
                });
                if (commitBarSnap(sb, 'click')) return;
                // If bar-snap helpers fail, fall through to beat-level
            }

            // ── Drag → v1.6 beat-level commit ──────────────────
            const [lo, hi] = loHi(sb, eb ?? sb);
            const startTick = tickOf(lo);
            const endTick = tickOf(hi) + durOf(hi);

            console.log('🎼 BeatLoop committed:', {
                startTick,
                endTick,
                pixelDist: pixelDist.toFixed(1),
                beatCrossed: beatCrossedRef.current,
                loAbsStart: lo?.absolutePlaybackStart,
                hiAbsStart: hi?.absolutePlaybackStart,
                expandedMatch: startTick !== lo?.absolutePlaybackStart ? '✅ expanded' : '⚠️ structural (no repeat)',
            });

            api.playbackRange = { startTick, endTick };
            api.isLooping = true;
            setRectsWithReason(buildRects(lo, hi), 'onUp-drag-commit');
            onLoopChange?.(startTick, endTick);
        };

        // ── [mobile-loop-tap-probe] Touch diagnostic — no behavior change ──────
        // Confirms whether touchstart reaches the surface on mobile/PWA.
        // If this log never fires, iOS is absorbing the touch upstream (AlphaTab SVG).
        // If it fires but [mobile-loop-tap-probe] reason:'onDown' never fires,
        // iOS is not synthesizing mousedown (touch was preventDefault'd upstream).
        const onTouchDiag = (e: TouchEvent) => {
            if (!MOBILE_LOOP_TAP_DEBUG || !loopRef.current) return;
            const t = e.touches[0] ?? e.changedTouches?.[0] ?? null;
            console.log('[mobile-loop-tap-probe]', {
                reason: 'touchstart-surface',
                eventType: 'touchstart',
                clientX: t ? Number(t.clientX.toFixed(1)) : null,
                clientY: t ? Number(t.clientY.toFixed(1)) : null,
                loopEnabled: loopRef.current,
                apiTickBefore: (api as any)?.tickPosition ?? null,
                playbackRange: api?.playbackRange ?? null,
                targetTagName: (e.target as HTMLElement)?.tagName ?? null,
                targetInAtSurface: !!(e.target as HTMLElement)?.closest?.('.at-surface'),
            });
        };

        surface.addEventListener('mousedown', onDown);
        surface.addEventListener('touchstart', onTouchDiag, { passive: true });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            surface.removeEventListener('mousedown', onDown);
            surface.removeEventListener('touchstart', onTouchDiag);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api, container]);

    // ─────────────────────────────────────────
    // Toggle-snap — bar highlight on loop ON (V1.7)
    // ─────────────────────────────────────────

    useEffect(() => {
        if (!loopEnabled || !api) return;
        // [MAESTRO-LOOP-002B] LandscapeToggleOnGuard relaxed: bar-snap creation is now
        // authorized in landscape (range math is tickCache-based via getExpandedBarRange,
        // layout-independent — unlike the click/drag path's boundsLookup-based hit-testing,
        // which remains guarded and untouched). commitBarSnap's rect population
        // (buildBarRects) and the landscape display branch's own y-band dedup are the exact
        // same pipeline already exercised by the verified-healthy "create in portrait, rotate
        // to landscape" baseline — this just lets it run starting from landscape instead.
        // LandscapeLoopClickGuard/LandscapeOnUpGuard/LandscapeDragEndGuard and handle
        // rendering remain fully guarded — this effect never renders/drags handles.
        if (api.playbackRange) return;

        const tick = (api as any).tickPosition ?? 0;

        const tickCache = (api as any)?.tickCache;
        if (tickCache) {
            const trackIndices = api.tracks
                ? new Set(api.tracks.map((t: any) => t.index))
                : new Set([0]);
            const result = tickCache.findBeat(trackIndices, tick);
            if (result?.beat) {
                const snapBeat = result.beat;
                commitBarSnap(snapBeat, 'toggle ON');
                // [MAESTRO-LOOP-002C] AlphaTabRenderer owns a separate effect
                // (api.playbackRange = (loopEnabled && playbackRange) ? playbackRange : null)
                // that resyncs api.playbackRange from page.tsx's own playbackRange state.
                // That state is still null on THIS render (onLoopChange's setPlaybackRange
                // hasn't round-tripped back down as a prop yet), so that effect clobbers
                // commitBarSnap's write back to null in the same commit's effects phase —
                // and since none of this component's OWN props change afterward, it never
                // re-renders to pick up the eventual correct value once page.tsx's state
                // does catch up. Re-check on a later tick (reusing the existing double-RAF
                // pattern already used elsewhere in this file for the same "wait for a
                // settle" purpose) and resync via the existing rebuildFromPlaybackRange —
                // no new source of truth, just an extra read of the same api.playbackRange
                // once the clobber has had time to resolve.
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (api.playbackRange) rebuildFromPlaybackRange('toggle-ON-resync');
                    });
                });
                return;
            }
        }

        const range = getExpandedBarRange(tick);
        if (range) {
            console.log('🎼 BeatLoop bar-snap (toggle ON, tick-only fallback):', range);
            api.playbackRange = { startTick: range.startTick, endTick: range.endTick };
            api.isLooping = true;
            // [MAESTRO-LOOP-002D] Same bridge as the commitBarSnap path above.
            pendingCommittedRangeRef.current = { startTick: range.startTick, endTick: range.endTick };

            // V1.8.4: set reseat flag on fallback path too — same contract as
            // commitBarSnap. Renderer flushes stale refs on next position event.
            (window as any).__maestroLoopReseat = {
                tick: range.startTick,
                at: Date.now(),
                reason: 'toggle-ON-fallback',
            };

            onLoopChange?.(range.startTick, range.endTick);
            // [MAESTRO-LOOP-002C] Same resync as the commitBarSnap path above.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (api.playbackRange) rebuildFromPlaybackRange('toggle-ON-fallback-resync');
                });
            });
        }
    }, [loopEnabled]);

    // ─────────────────────────────────────────
    // Re-render sync — rebuild rects after AlphaTab layout changes
    // ─────────────────────────────────────────

    const rebuildFromPlaybackRange = (reason = 'unknown') => {
        const range = api.playbackRange;
        if (!range) return;

        const tickCache = (api as any)?.tickCache;
        if (!tickCache) return;

        // Guard: skip if boundsLookup is in a partial/transitional state
        const systems = api?.renderer?.boundsLookup?.staffSystems;
        if (!systems?.length) return;

        const trackIndices = api.tracks
            ? new Set(api.tracks.map((t: any) => t.index))
            : new Set([0]);

        const startResult = tickCache.findBeat(trackIndices, range.startTick);
        const endResult = tickCache.findBeat(trackIndices, range.endTick - 1);
        if (!startResult?.beat || !endResult?.beat) return;

        const startBarIdx = startResult.beat?.voice?.bar?.index
            ?? startResult.beat?.voice?.bar?.masterBar?.index;
        const endBarIdx = endResult.beat?.voice?.bar?.index
            ?? endResult.beat?.voice?.bar?.masterBar?.index;

        const rectsCountBefore = rectsRef.current.length;
        let resolvedRects: HighlightRect[] = [];

        // Full-bar selection → buildBarRects (clean, no midpoint math)
        if (startBarIdx != null && startBarIdx === endBarIdx
            && isFirstBeatInBar(startResult.beat)
            && isLastBeatInBar(endResult.beat)) {
            const barRects = buildBarRects(startBarIdx);
            if (barRects.length && barRects.every(r => r.w > 0)) {
                resolvedRects = barRects;
            }
        }

        // Beat-level fallback: not a full-bar selection, or barRects were zero-width
        if (!resolvedRects.length) {
            const [lo, hi] = loHi(startResult.beat, endResult.beat);
            const beatRects = buildRects(lo, hi);
            if (beatRects.length && beatRects.every(r => r.w > 0)) {
                resolvedRects = beatRects;
            }
        }

        console.log('[loop-overlay-rebuild]', {
            reason,
            startTick: range.startTick,
            endTick: range.endTick,
            rectsCountBefore,
            rectsCountAfter: resolvedRects.length,
            systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? 0,
        });

        if (resolvedRects.length) {
            setRectsWithReason(resolvedRects, `rebuildFromPlaybackRange:${reason}`);
        }

        if (LANDSCAPE_LOOP_DEBUG && isLandscape) {
            const firstR = resolvedRects[0] ?? null;
            const systems: any[] = api?.renderer?.boundsLookup?.staffSystems ?? [];
            const firstRectSystemIndex = firstR == null ? -1 : systems.findIndex((sys: any) =>
                (sys?.bars ?? []).some((mbb: any) => {
                    const b = mbb?.visualBounds ?? mbb?.bars?.[0]?.visualBounds;
                    return b && Math.abs(b.y - firstR.y) < 4;
                })
            );
            const surfaceEl = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
            console.log('[landscape-loop-overlay-rects]', {
                reason: 'landscape-loop-overlay-rects',
                isLandscape: true,
                landscapeDisplayRendererEnabled: true,
                rectsCount: resolvedRects.length,
                firstRectTop: firstR?.y ?? null,
                firstRectLeft: firstR?.x ?? null,
                firstRectWidth: firstR?.w ?? null,
                firstRectSystemIndex,
                startBarIdx,
                endBarIdx,
                surfaceScrollWidth: surfaceEl?.scrollWidth ?? null,
                surfaceScrollLeft: surfaceEl?.scrollLeft ?? null,
            });
        }
        if (PAGE_ROW_DEBUG && !isLandscape) {
            const firstR = resolvedRects[0] ?? null;
            console.log('[page-loop-cursor-row-probe]', {
                reason: 'loop-overlay-rebuild-after-click',
                startTick: range.startTick,
                endTick: range.endTick,
                rectsCount: resolvedRects.length,
                firstRectTop: firstR?.y ?? null,
                firstRectLeft: firstR?.x ?? null,
                firstRectBarIdx: startBarIdx,
            });
        }
    };

    /**
     * V1.7.5 — When AlphaTab re-renders (dev tools open/close, window resize,
     * fullscreen toggle, container width change), all internal coordinates shift
     * but the overlay rects are stale. Hook renderFinished to rebuild rects from
     * the current playbackRange using fresh geometry.
     *
     * Uses buildRects (beat-level midpoint trimming) for drag ranges and
     * buildBarRects for full-bar ranges. Both produce correct output because
     * isFirstBeatInBar/isLastBeatInBar handle the full-bar case naturally.
     */
    useEffect(() => {
        if (!api) return;

        const handleRenderFinished = () => {
            // 🔥 Cancel any in-progress drag — layout changes invalidate all
            // gesture state. Without this, isDragging stays true after resize
            // and mousemove hijacks the overlay (ghost-drag).
            isDragging.current = false;
            startBeat.current = null;
            endBeat.current = null;
            beatCrossedRef.current = false;

            // Double-RAF: wait for layout to fully settle.
            // Frame 1 → DOM resized, AlphaTab begins reflow
            // Frame 2 → boundsLookup fully populated with final coords
            // Opening dev tools causes multiple resize events + layout passes.
            // Single RAF was too early — rebuilt from transitional geometry,
            // causing rects to "fall down" or stick at wrong bar edges.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (LOOP_OVERLAY_DEBUG) console.log('[loop-overlay-renderFinished-gate]', {
                        loopRef: !!loopRef.current,
                        loopEnabled,
                        hasApiRange: !!api.playbackRange,
                        apiRange: api.playbackRange ?? null,
                        rectsCount: rectsRef?.current?.length ?? rects.length,
                    });
                    if (api.playbackRange) {
                        rebuildFromPlaybackRange('renderFinished');
                    }
                    logLoopOverlayState('renderFinished-rebuild');
                });
            });
        };

        api.renderer.renderFinished.on(handleRenderFinished);
        return () => {
            api.renderer.renderFinished.off(handleRenderFinished);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api]);

    useEffect(() => {
        if (!loopEnabled || rects.length > 0 || !api?.playbackRange) return;
        logLoopOverlayState('loopEnabled-but-rectsEmpty');
        if (rescueRafPendingRef.current) return;
        rescueRafPendingRef.current = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                rescueRafPendingRef.current = false;
                if (!api?.playbackRange) return;
                if ((rectsRef?.current?.length ?? rects.length) > 0) return;
                rebuildFromPlaybackRange('loopEnabled-but-rectsEmpty-rescue');
            });
        });
    }, [loopEnabled, rects.length, api, isLandscape]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!LOOP_OVERLAY_DEBUG) return;
        console.log('[loop-overlay-loopEnabled-change]', {
            loopEnabled,
            apiRange: api?.playbackRange ?? null,
        });
    }, [loopEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!LOOP_OVERLAY_DEBUG) return;
        console.log('[loop-overlay-rects-change]', {
            rectsCount: rects.length,
            loopEnabled,
            apiRange: api?.playbackRange ?? null,
        });
    }, [rects.length, loopEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        (window as any).__maestroProbeLoopOverlay = () => logLoopOverlayState('manual');
        return () => { delete (window as any).__maestroProbeLoopOverlay; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ─────────────────────────────────────────
    // Stage 1 — smartCursorSnap (ported as-is from V99.8)
    // ─────────────────────────────────────────

    const smartCursorSnap = () => {
        const cursor = (window as any).__maestroCursor;
        if (cursor && typeof cursor.requestSnap === 'function') {
            cursor.requestSnap('loop-handle-drag');
        }
    };

    // ─────────────────────────────────────────
    // Stage 1 — resolveEventPosition (mouse + touch unified)
    // ─────────────────────────────────────────

    const resolveEventPosition = (e: MouseEvent | TouchEvent): { clientX: number; clientY: number } => {
        if ('touches' in e && e.touches.length > 0) {
            return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        }
        if ('changedTouches' in e && e.changedTouches.length > 0) {
            return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
        }
        return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
    };

    // ─────────────────────────────────────────
    // Stage 1 — Handle drag handlers
    // ─────────────────────────────────────────

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, target: 'start' | 'end') => {
        e.stopPropagation();
        e.preventDefault();
        dragTargetRef.current = target;
        setDragTarget(target);
        setHandleDragging(true);

        const { clientX } = resolveEventPosition(e as any);
        // v1.8.2: seed active handle at exact pointer position — no offset
        activeHandleClientXRef.current = clientX;
        setActiveHandleX(clientX);

        const range = api?.playbackRange;
        if (range) {
            previewRangeRef.current = { ...range };
            setPreviewRange({ ...range });
        }

        (window as any).__maestroIsDraggingLoop = true;
        (window as any).__maestroActiveHandle = target;

        const cursor = (window as any).__maestroCursor;
        if (cursor && typeof cursor.setDragging === 'function') cursor.setDragging(true);

        document.body.style.userSelect = 'none';
        (document.body.style as any).webkitUserSelect = 'none';
        document.body.classList.add('loop-dragging');
    };

    /**
     * handleDragMove — v1.8.2 pointer-driven model.
     * Active handle: tracks raw clientX directly (no offset math).
     * Preview rects: computed from snapped beat (forecast).
     * api.playbackRange: NOT written during drag, only on release.
     */
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!dragTargetRef.current) return;
        e.preventDefault();

        const { clientX, clientY } = resolveEventPosition(e);

        // v1.8.2: active handle tracks raw pointer — no offset
        activeHandleClientXRef.current = clientX;
        setActiveHandleX(clientX);

        // Forecast: resolve beat at pointer for preview highlight
        const syntheticEvent = {
            clientX,
            clientY,
            target: (() => {
                const surface = (container ?? document).querySelector('.at-surface');
                return surface ?? document.body;
            })(),
        } as unknown as MouseEvent;

        const result = resolveBeatWithX(syntheticEvent);
        if (!result?.beat) return;

        const rawBeat = result.beat;
        let beat = adjustHandleBeatNearBarline(rawBeat, result.mouseX, dragTargetRef.current);

        // ── Handle forecast smoothing (start handle: prefer next beat only after pointer passes midpoint) ──
        // AlphaTab's getBeatAtPos can hand us the next beat before the pointer
        // visually feels close enough to it. For handle drags, re-check the
        // pointer against the inter-beat midpoint so the preview forecast stays
        // within a small visual lead instead of jumping a full beat ahead.
        const HANDLE_FORECAST_LEAD = 12;
        if (dragTargetRef.current === 'start' && beat?.nextBeat) {
            const curCenter = beatCenter(beat);
            const nextCenter = beatCenter(beat.nextBeat);
            const curBarIdx = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
            const nextBarIdx = beat.nextBeat?.voice?.bar?.index
                ?? beat.nextBeat?.voice?.bar?.masterBar?.index;
            if (curCenter != null && nextCenter != null && curBarIdx === nextBarIdx) {
                const switchX = ((curCenter + nextCenter) / 2) - HANDLE_FORECAST_LEAD;
                if (result.mouseX > switchX) {
                    beat = beat.nextBeat;
                    if (LOOP_HANDLE_DRAG_DIAG) {
                        console.log('[loop-handle-forecast-smooth]', {
                            target: dragTargetRef.current,
                            action: 'hold-next-beat-until-pushed-left',
                            mouseX: Number(result.mouseX.toFixed(1)),
                            switchX: Number(switchX.toFixed(1)),
                            toTick: tickOf(beat),
                        });
                    }
                }
            }
        }
        if (dragTargetRef.current === 'end' && beat?.nextBeat) {
            const curCenter = beatCenter(beat);
            const nextCenter = beatCenter(beat.nextBeat);
            const curBarIdx = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
            const nextBarIdx = beat.nextBeat?.voice?.bar?.index
                ?? beat.nextBeat?.voice?.bar?.masterBar?.index;
            if (curCenter != null && nextCenter != null && curBarIdx === nextBarIdx) {
                const switchX = ((curCenter + nextCenter) / 2) + HANDLE_FORECAST_LEAD;
                if (result.mouseX > switchX) {
                    beat = beat.nextBeat;
                    if (LOOP_HANDLE_DRAG_DIAG) {
                        console.log('[loop-handle-forecast-smooth]', {
                            target: dragTargetRef.current,
                            action: 'advance-next-beat',
                            mouseX: Number(result.mouseX.toFixed(1)),
                            switchX: Number(switchX.toFixed(1)),
                            toTick: tickOf(beat),
                        });
                    }
                }
            }
        }

        const beatTick = tickOf(beat);
        const beatDur = durOf(beat);
        const current = previewRangeRef.current ?? api?.playbackRange;
        if (!current) return;

        // 🔬 TEMP handle-drag resolver probe — used to tune barline magnet/dead-zone.
        // This is diagnostic only; it does not affect previewRange or playbackRange.
        if (LOOP_HANDLE_DRAG_DIAG) {
            const vb = getBeatVB(beat);
            const barIdx = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
            const edges = getBarEdgesFromBeat(beat);
            console.log('[loop-handle-drag-resolve]', {
                dragTarget: dragTargetRef.current,
                clientX: Number(clientX.toFixed(1)),
                mouseX: Number(result.mouseX.toFixed(1)),
                beatTick,
                beatDur,
                barIdx,
                rawBeatTick: tickOf(rawBeat),
                adjusted: rawBeat !== beat,
                isFirstBeatInBar: isFirstBeatInBar(beat),
                isLastBeatInBar: isLastBeatInBar(beat),
                firstTickInBar: edges?.first ? tickOf(edges.first) : null,
                lastTickInBar: edges?.last ? tickOf(edges.last) : null,
                vbX: vb ? Number(vb.x.toFixed(1)) : null,
                vbW: vb ? Number(vb.w.toFixed(1)) : null,
                currentStartTick: current.startTick,
                currentEndTick: current.endTick,
            });
        }

        let nextPreview: { startTick: number; endTick: number };
        const trackIndices = api.tracks
            ? new Set(api.tracks.map((t: any) => t.index))
            : new Set([0]);
        const tickCache = (api as any)?.tickCache;

        if (dragTargetRef.current === 'start') {
            let previewBeat = beat;
            let newStart = beatTick;

            if (tickCache && newStart >= current.endTick - beatDur) {
                const clampResult = tickCache.findBeat(trackIndices, Math.max(0, current.endTick - 1));
                const clampBeat = clampResult?.beat;
                if (clampBeat) {
                    const clampTick = tickOf(clampBeat);
                    const clampDur = durOf(clampBeat);
                    const previous = clampBeat.previousBeat;
                    const previousTick = previous ? tickOf(previous) : null;
                    if (previous && previousTick != null && previousTick < current.endTick - clampDur) {
                        previewBeat = previous;
                        newStart = previousTick;
                    } else {
                        previewBeat = clampBeat;
                        newStart = Math.max(current.startTick, current.endTick - clampDur);
                    }
                    console.log('[loop-handle-start-clamp]', {
                        requestedTick: beatTick,
                        clampedTick: newStart,
                        currentEndTick: current.endTick,
                    });
                }
            }

            if (newStart >= current.endTick) return;
            nextPreview = { startTick: newStart, endTick: current.endTick };
            if (tickCache) {
                const endResult = tickCache.findBeat(trackIndices, current.endTick - 1);
                if (endResult?.beat) {
                    const [lo, hi] = loHi(previewBeat, endResult.beat);
                    const preview = buildRects(lo, hi);
                    previewRectsRef.current = preview;
                    setRectsWithReason(preview, 'handleDragMove-start-preview');
                }
            }
        } else {
            const newEnd = beatTick + beatDur;
            if (newEnd <= current.startTick + beatDur) return;
            nextPreview = { startTick: current.startTick, endTick: newEnd };
            if (tickCache) {
                const startResult = tickCache.findBeat(trackIndices, current.startTick);
                if (startResult?.beat) {
                    const [lo, hi] = loHi(startResult.beat, beat);
                    const preview = buildRects(lo, hi);
                    previewRectsRef.current = preview;
                    setRectsWithReason(preview, 'handleDragMove-end-preview');
                }
            }
        }

        previewRangeRef.current = nextPreview;
        setPreviewRange(nextPreview);
    };

    // TODO [LoopCursorFreezeDuringHandleDrag]:
    // Songsterr-style polish: while user drags a loop handle, freeze the visible
    // cursor at its current position and visually mark it inactive/gray. Do not
    // reseat cursor during drag preview. On mouseup:
    //   - if cursor is still inside the new playbackRange, keep it parked there
    //   - if cursor is outside the new playbackRange, decide whether to keep it
    //     outside until Play or reseat to loop start
    //   - next Play should follow existing rules:
    //       highlight-click override starts from clicked tick once
    //       otherwise loop starts from playbackRange.startTick
    // This is visual/UX polish only. Do not change loop range math or handle snap.
    /**
     * handleDragEnd — Fix E: commits previewRange to api.playbackRange on release.
     * Nothing is written to api during drag — only on mouseup/touchend.
     */
    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
        if (!dragTargetRef.current) return;
        if (isLandscapeRef.current) {
            dragTargetRef.current = null;
            return;
        }
        e.preventDefault();
        const releasedHandle = dragTargetRef.current;

        // Fix E: commit preview → api only on release
        const finalRange = previewRangeRef.current;
        if (finalRange && api) {
            api.playbackRange = finalRange;
            api.isLooping = true;
            onLoopChange?.(finalRange.startTick, finalRange.endTick);
            logLoopOverlayState('handleDragEnd-committed');
            // ── End handle fresh-attack reseat ───────────────────────────────────────────
            const endReseat = resolveEndHandleFreshAttack(
                finalRange.endTick,
                finalRange.startTick,
            );
            const resolvedEndBeat = endReseat?.beat ?? null;
            const originalResult = (api as any)?.tickCache?.findBeat?.(
                api?.tracks ? new Set(api.tracks.map((t: any) => t.index)) : new Set([0]),
                finalRange.endTick - 1,
            );
            const originalBeat = originalResult?.beat ?? null;
            console.log('[loop-end-fresh-attack]', {
                loopEndTick: finalRange.endTick,
                originalTick: originalBeat?.absolutePlaybackStart,
                originalIsRest: !!originalBeat?.isRest,
                originalNotesLength: (originalBeat?.notes ?? []).length,
                replacementTick: endReseat?.tick,
                replacementBeat: !!resolvedEndBeat,
                replacementIsFresh: resolvedEndBeat ? isFreshAttackBeat(resolvedEndBeat) : null,
            });
            // ── Handle-release fresh-attack candidate only ────────────────────────────────
            // Diagnostic only: during handle drag release, do not force cursor parking.
            // Songsterr-style behavior keeps cursor movement separate from loop handle moves.
            {
                const startCandidate = releasedHandle === 'start'
                    ? resolveStartHandleFreshAttack(finalRange.startTick, finalRange.endTick)
                    : null;
                const endCandidate = releasedHandle === 'end'
                    ? endReseat
                    : null;
                console.log('[loop-handle-reseat-candidate]', {
                    releasedHandle,
                    startTick: finalRange.startTick,
                    endTick: finalRange.endTick,
                    startCandidateTick: startCandidate?.tick ?? null,
                    endCandidateTick: endCandidate?.tick ?? null,
                    note: 'candidate only; cursor not moved during handle release',
                });
            }
            // ── END handle-release fresh-attack candidate only ────────────────────────────
        }

        previewRangeRef.current = null;
        setPreviewRange(null);
        setActiveHandleX(null);
        activeHandleClientXRef.current = 0;

        dragTargetRef.current = null;
        setDragTarget(null);
        setHandleDragging(false);

        // Clear global flags FIRST, then unfreeze cursor
        (window as any).__maestroIsDraggingLoop = false;
        (window as any).__maestroActiveHandle = null;

        const cursor = (window as any).__maestroCursor;
        if (cursor) {
            if (typeof cursor.setDragging === 'function') cursor.setDragging(false);
            if (typeof cursor.requestSnap === 'function') cursor.requestSnap('loop-handle-drag-end');
        }

        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        document.body.classList.remove('loop-dragging');

        smartCursorSnap();
    };

    // ─────────────────────────────────────────
    // Stage 1 — Handle drag global event listeners
    // Attaches/detaches when handleDragging changes.
    // ─────────────────────────────────────────

    useEffect(() => {
        if (!handleDragging) return;

        const onMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
        const onUp = (e: MouseEvent | TouchEvent) => handleDragEnd(e);

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp, { passive: false });
        window.addEventListener('touchcancel', onUp, { passive: false });

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('touchcancel', onUp);
        };
    }, [handleDragging]);

    // ─────────────────────────────────────────
    // Clear
    // ─────────────────────────────────────────

    const clearLoop = () => {
        api.isLooping = false;
        api.playbackRange = null;
        startBeat.current = null;
        endBeat.current = null;
        setRectsWithReason([], 'clearLoop');
        onLoopClear?.();
    };

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────

    // Stage 4: suppress in landscape — coordinate-space mismatch until
    // a scrollLeft-aware landscape loop system is built as a separate sprint.
    // ── Compute active handle overlay-space X ─────────────────────────────────
    // Converts raw clientX to position relative to the overlay's containing rect.
    // The overlay wrapper is position:relative inside alphatab-content-host,
    // so we subtract the host's left edge from clientX.
    const getActiveHandleOverlayX = (): number | null => {
        if (activeHandleX === null) return null;
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        if (!surface) return null;
        const rect = surface.getBoundingClientRect();
        const overlayX = (activeHandleX - rect.left) + LOOP_X_OFFSET;
        return Math.min(Math.max(overlayX, 0), rect.width);
    };
    const activeOverlayX = getActiveHandleOverlayX();

    // ── V99.8-matched color palette ──────────────────────────────────────────
    const handleColor = '#9333ea';
    const tabColor = '#9c47f0';
    const overlayColor = 'rgba(100, 116, 139, 0.12)';
    const borderColor = 'rgba(129, 140, 248, 0.2)';
    // Fix A: NO positional transition — loop rect moves must be instant.
    // Only shadow/color transitions are allowed on handles.
    const handleColorTransition = 'background-color 150ms ease-in-out, box-shadow 150ms ease-in-out';

    const LOOP_ROW_PAD_Y = 7;
    const LOOP_HANDLE_INSET_Y = 10;
    const FALLBACK_EXTEND = 50;

    // ── [V1.8.5] Row-aware geometry helper — DOM-rect-based ──────────────────
    // r.y is the AlphaTab bar visual top in the same rendered surface space
    // used by the overlay divs. getBoundingClientRect() gives real DOM positions
    // relative to .at-surface, which is what the overlay needs.
    // SVG attributes (y, height, viewBox) are NOT used — they are in SVG internal
    // coordinates, not DOM/surface coordinates.
    const getRowGeometryForRect = (r: HighlightRect): { top: number; height: number } => {
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        if (!surface) {
            return {
                top: r.y - FALLBACK_EXTEND,
                height: r.h + FALLBACK_EXTEND * 2,
            };
        }
        const surfaceRect = surface.getBoundingClientRect();
        const surfaceScrollTop = surface.scrollTop ?? 0;
        const svgs = Array.from(
            surface.querySelectorAll<SVGSVGElement>('svg.at-surface-svg')
        );
        if (!svgs.length) {
            return {
                top: r.y - FALLBACK_EXTEND,
                height: r.h + FALLBACK_EXTEND * 2,
            };
        }
        const rows = svgs.map(svg => {
            const rect = svg.getBoundingClientRect();
            const top = (rect.top - surfaceRect.top) + surfaceScrollTop;
            const height = rect.height;
            return { svg, top, height, bottom: top + height };
        }).filter(row => row.height > 0);
        // Pick the DOM SVG row that contains r.y, or closest if slightly outside
        // (bar visual top can sit near an effect lane at the row boundary).
        let match = rows.find(row => r.y >= row.top - 4 && r.y <= row.bottom + 4);
        if (!match) {
            match = rows.reduce((best, row) => {
                const d = Math.min(Math.abs(r.y - row.top), Math.abs(r.y - row.bottom));
                const bestD = Math.min(Math.abs(r.y - best.top), Math.abs(r.y - best.bottom));
                return d < bestD ? row : best;
            }, rows[0]);
        }
        if (!match || match.height <= 0) {
            return {
                top: r.y - FALLBACK_EXTEND,
                height: r.h + FALLBACK_EXTEND * 2,
            };
        }
        return {
            top: match.top + LOOP_ROW_PAD_Y,
            height: Math.max(20, match.height - LOOP_ROW_PAD_Y * 2),
        };
    };

    // ── Landscape display-only loop highlight ────────────────────────────────
    // Stage 4 extended: shows the committed loop range in Landscape as a
    // translucent highlight behind the tab, plus (V1.8.11 / MAESTRO-LOOP-002C)
    // visible-only start/end boundary markers. No drag, no writes to api.playbackRange
    // — the boundary markers are pointerEvents:'none' with no onMouseDown/onTouchStart/
    // touchAction, so this remains display-only, not interactive. Rects are in score
    // coordinate space (0–surfaceScrollWidth); left: r.x - scrollLeft converts them to
    // viewport-relative position.
    //
    // Deduplication: groups rects by y-band and picks the first (topmost) staff
    // row. Multiple rects arise because each instrument/staff in the score
    // produces one rect per bar — e.g. 6 tracks × 2 bars = 12 rects.
    // TODO: match the y-band used by FixedLandscapeCursor (active track row).
    if (isLandscape) {
        // [MAESTRO-LOOP-002D] The real value has settled — the bridge is no longer
        // needed. Cleared here (not just superseded by ?? below) so a later, unrelated
        // transient null on api.playbackRange can't incorrectly resurrect a stale bridge.
        if (api?.playbackRange && pendingCommittedRangeRef.current) {
            pendingCommittedRangeRef.current = null;
        }
        // api.playbackRange is the primary source of truth; the bridge only covers the
        // gap between commitBarSnap's direct write and AlphaTabRenderer's own
        // page-state-driven resync effect catching up (see pendingCommittedRangeRef
        // declaration) — only ever consulted while loopEnabled is true, never for
        // handle drag/editing, and never used to bypass onLoopChange.
        const lsRange = (api?.playbackRange ?? (loopEnabled ? pendingCommittedRangeRef.current : null)) as { startTick: number; endTick: number } | null;
        const scrollLeft = landscapeScrollLeft;
        const containerWidth = (container as HTMLElement | null)?.clientWidth ?? 390;
        const surfaceEl = (container ?? document).querySelector?.('.at-surface') as HTMLElement | null;
        const surfaceW = surfaceEl?.scrollWidth ?? 0;

        if (!lsRange || !rects.length) {
            console.log('[landscape-loop-highlight-render]', {
                startTick: lsRange?.startTick ?? null,
                endTick: lsRange?.endTick ?? null,
                rectsCount: rects.length,
                renderedRectsCount: 0,
                scrollLeft,
                containerW: containerWidth,
                surfaceW,
                firstRenderedRect: null,
                isDisplayOnly: true,
                geometryMode: 'landscape-direct-rect-y-band-filter',
                note: 'no range or no rects',
            });
            return null;
        }

        // Sort by y then x to ensure topmost band is selected reliably.
        // NOTE: FixedLandscapeCursor is NOT responsible for horizontal scrolling.
        //   Landscape scroll is owned by AlphaTabRenderer.tsx via
        //   startLandscapeScrollLoop, landscapeScrollStateRef, primeLandscapeState.
        //   FixedLandscapeCursor is body-mounted and fixed at viewport X; it only
        //   updates top/height. Do not touch AlphaTabRenderer or FixedLandscapeCursor
        //   for scrollLeft tracking — use landscapeScrollLeft state here.
        const sorted = [...rects].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const firstBandY = sorted[0]?.y ?? 0;
        const bandTolerance = 8;
        const bandRects = sorted.filter(r => Math.abs(r.y - firstBandY) <= bandTolerance);

        // Clip to visible viewport in viewport space (score x → viewport x via scrollLeft).
        const visibleRects = bandRects.filter(r => {
            const left = r.x + LOOP_X_OFFSET - scrollLeft;
            const right = left + r.w;
            return right >= -60 && left <= containerWidth + 60;
        });

        const representativeRect = visibleRects[0] ?? null;
        const renderRects = representativeRect ? [representativeRect] : [];
        console.log('[landscape-loop-highlight-render]', {
            startTick: lsRange.startTick,
            endTick: lsRange.endTick,
            rectsCount: rects.length,
            bandRectsCount: bandRects.length,
            visibleRectsCount: visibleRects.length,
            renderedRectsCount: renderRects.length,
            firstBandY,
            bandTolerance,
            firstRenderedRect: renderRects[0] ?? null,
            scrollLeft,
            containerW: containerWidth,
            surfaceW,
            landscapeHighlightYOffset: LANDSCAPE_HIGHLIGHT_Y_OFFSET,
            geometryMode: 'landscape-direct-rect-single-representative',
            isDisplayOnly: true,
        });

        if (!renderRects.length) return null;
        return (
            <>
                {/* [MAESTRO-LOOP-002C] Visible-only start/end boundary markers. Derived from
                    the SAME renderRects entry the highlight above uses (already the deduped,
                    viewport-clipped representative rect) — never a fresh/unrelated
                    rects[0]/rects[last] that could point at a different track lane. Since a
                    landscape-created loop is always a single bar (commitBarSnap snaps to one
                    barIdx), renderRects has exactly one entry, so its left edge is the start
                    boundary and its right edge is the end boundary — no separate first/last
                    rect lookup needed the way the portrait branch requires for multi-bar
                    selections. Purely decorative: pointerEvents:'none', no onMouseDown/
                    onTouchStart/touchAction, so strip scroll and tap-to-seek are unaffected. */}
                {renderRects.map((r, i) => {
                    const left = r.x + LOOP_X_OFFSET - scrollLeft;
                    const top = r.y + LANDSCAPE_HIGHLIGHT_Y_OFFSET;
                    return (
                        <React.Fragment key={i}>
                            <div
                                className="beat-loop-highlight-landscape"
                                style={{
                                    position: 'absolute',
                                    left,
                                    top,
                                    width: r.w,
                                    height: r.h,
                                    background: overlayColor,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 900,
                                    boxSizing: 'border-box' as const,
                                }}
                            />
                            <div
                                className="beat-loop-handle-landscape beat-loop-handle-landscape-start"
                                style={{
                                    position: 'absolute',
                                    left: left - 1.5,
                                    top,
                                    width: '3px',
                                    height: r.h,
                                    backgroundColor: handleColor,
                                    boxShadow: `0 0 8px ${handleColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 901,
                                }}
                            />
                            <div
                                className="beat-loop-handle-landscape beat-loop-handle-landscape-end"
                                style={{
                                    position: 'absolute',
                                    left: left + r.w - 1.5,
                                    top,
                                    width: '3px',
                                    height: r.h,
                                    backgroundColor: handleColor,
                                    boxShadow: `0 0 8px ${handleColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 901,
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </>
        );
    }

    return (
        <>
            {rects.map((r, i) => {
                const isFirst = i === 0;
                const isLast = i === rects.length - 1;

                const rowGeom = getRowGeometryForRect(r);
                const hlTop = rowGeom.top;
                const hlHeight = rowGeom.height;
                const handleHeight = Math.max(20, hlHeight - LOOP_HANDLE_INSET_Y * 2);

                const startIsDragging = handleDragging && dragTarget === 'start';
                const endIsDragging = handleDragging && dragTarget === 'end';

                return (
                    <div
                        key={i}
                        className="beat-loop-highlight"
                        style={{
                            position: 'absolute',
                            left: r.x + LOOP_X_OFFSET,
                            top: hlTop,
                            width: r.w,
                            height: hlHeight,
                            background: overlayColor,
                            borderTop: `1px solid ${borderColor}`,
                            borderBottom: `1px solid ${borderColor}`,
                            pointerEvents: 'none',
                            zIndex: 900,
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* ── Start handle ── */}
                        {isFirst && (
                            <div
                                onMouseDown={e => handleDragStart(e, 'start')}
                                onTouchStart={e => handleDragStart(e, 'start')}
                                style={{
                                    position: 'absolute',
                                    ...(startIsDragging && activeOverlayX !== null
                                        ? (() => {
                                            const HANDLE_HALF_W = 13.5;
                                            const rawActiveLeft = activeOverlayX - r.x - HANDLE_HALF_W;
                                            const clampedActiveLeft = Math.min(
                                                Math.max(rawActiveLeft, -HANDLE_HALF_W),
                                                r.w - HANDLE_HALF_W,
                                            );
                                            return { left: clampedActiveLeft };
                                        })()
                                        : { left: '-13.5px' }
                                    ),
                                    top: LOOP_HANDLE_INSET_Y,
                                    transform: 'none',
                                    width: '27px',
                                    height: handleHeight,
                                    cursor: 'ew-resize',
                                    zIndex: 1001,
                                    pointerEvents: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    touchAction: 'none',
                                    userSelect: 'none',
                                }}
                            >
                                {/* Vertical glowing bar — spans full handle height */}
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: 0,
                                    width: '3px',
                                    height: '100%',
                                    backgroundColor: handleColor,
                                    boxShadow: `0 0 8px ${handleColor}`,
                                    transition: handleColorTransition,
                                }} />
                                {/* Arrow tab — centered on vertical bar */}
                                <div style={{
                                    position: 'absolute',
                                    left: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '14px',
                                    height: '32px',
                                    backgroundColor: tabColor,
                                    borderRadius: '4px 0 0 4px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '28px',
                                    fontWeight: '900',
                                    fontFamily: "'Courier New', monospace",
                                    transition: handleColorTransition,
                                }}>›</div>
                            </div>
                        )}

                        {/* ── End handle ── */}
                        {isLast && (
                            <div
                                onMouseDown={e => handleDragStart(e, 'end')}
                                onTouchStart={e => handleDragStart(e, 'end')}
                                style={{
                                    position: 'absolute',
                                    ...(endIsDragging && activeOverlayX !== null
                                        ? (() => {
                                            const HANDLE_HALF_W = 13.5;
                                            const rawActiveLeft = activeOverlayX - r.x - HANDLE_HALF_W;
                                            const clampedActiveLeft = Math.min(
                                                Math.max(rawActiveLeft, -HANDLE_HALF_W),
                                                r.w - HANDLE_HALF_W,
                                            );
                                            return { left: clampedActiveLeft, right: 'unset' };
                                        })()
                                        : { right: '-13.5px' }
                                    ),
                                    top: LOOP_HANDLE_INSET_Y,
                                    transform: 'none',
                                    width: '27px',
                                    height: handleHeight,
                                    cursor: 'ew-resize',
                                    zIndex: 1001,
                                    pointerEvents: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    touchAction: 'none',
                                    userSelect: 'none',
                                }}
                            >
                                {/* Vertical glowing bar — spans full handle height */}
                                <div style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: 0,
                                    width: '3px',
                                    height: '100%',
                                    backgroundColor: handleColor,
                                    boxShadow: `0 0 8px ${handleColor}`,
                                    transition: handleColorTransition,
                                }} />
                                {/* Arrow tab — centered on vertical bar */}
                                <div style={{
                                    position: 'absolute',
                                    right: '0',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '14px',
                                    height: '32px',
                                    backgroundColor: tabColor,
                                    borderRadius: '0 4px 4px 0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '28px',
                                    fontWeight: '900',
                                    fontFamily: "'Courier New', monospace",
                                    transition: handleColorTransition,
                                }}>‹</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}