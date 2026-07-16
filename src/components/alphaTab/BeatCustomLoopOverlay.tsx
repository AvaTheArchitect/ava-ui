'use client';

/**
 * BeatCustomLoopOverlay v1.8.34 — Shadow-Bounded Drag Wall
 * Date: July 15th, 2026
 *
 * 🔥 V1.8.34 CHANGES (MAESTRO-LOOP-004C.5f):
 * ✅ Adds a shadow-bounded end-handle wall for metadata-contaminated
 *    single-bar spans.
 * ✅ Root is buildRects' x1 fallback: first-beat-in-bar uses the bar's raw
 *    visualBounds left edge, which can include clef/time-signature metadata.
 * ✅ Uses rect.x + rect.w as the clean shadow boundary already produced by
 *    buildRects.
 * ✅ shadowWallMin is gated by sameBar, not rects.length alone, because it
 *    protects against metadata incursion — a same-bar/minimum-span issue.
 *    rects.length === 1 was too broad because buildRects can merge same-row
 *    multi-bar spans into one rect, which let the wall fire for wider
 *    same-row/cross-bar spans and wrongly block the end handle from
 *    entering metadata when the start handle was in a different bar.
 * ✅ sameBar gate preserves M1 same-bar metadata protection while allowing
 *    cross-bar metadata travel.
 * ✅ Uses previewRange render state plus resolveBarIndexForTick — no new
 *    stored state, no new tick/pixel constants.
 * ✅ Null bar lookup (tickCache unavailable) disables the shadow wall
 *    rather than over-restricting — fail-safe is freedom, not a stuck
 *    handle.
 * ✅ wallMin/wallMax mutual collision walls are gated by sameRect, because
 *    collision between the two handle glyphs is only meaningful when both
 *    handles share the same visual rect / row segment. sameRect disables
 *    cross-row x-coordinate comparisons, which previously compared one
 *    row's rect edge against a different row's handle position.
 * ✅ sameBar and sameRect are intentionally different gates and are not
 *    unified: sameBar answers "is this a same-bar metadata case", sameRect
 *    answers "can these two glyphs visually collide". wallMin uses
 *    -Infinity when disabled (it feeds Math.max); wallMax uses Infinity
 *    when disabled (it feeds Math.min).
 * ✅ Restores cross-row M1→M6 end-handle metadata travel — wallMin no
 *    longer floors the end handle using an unrelated row's startRect.x.
 * ✅ Start-handle wallMax is also sameRect-gated to avoid the mirrored
 *    cross-row ceiling (an unrelated row's endRect capping the start
 *    handle's travel within its own row).
 * ⛔ Quarter-note mid-drag handle spacing is intentionally left unchanged
 *    because forecast/release are correct and widening the gap risks a
 *    dense-material regression.
 * ⛔ Does not change buildRects, stored ticks, resolver, magnets, min-span,
 *    forecast lead, release, rects.map, or probe code.
 *
 * 🔥 V1.8.33 CHANGES (MAESTRO-LOOP-004C.5e):
 * ✅ Allows the minimum loop span to become one adjacent real beat when that
 *    beat is shorter than MIN_LOOP_SPAN_TICKS.
 * ✅ Keeps 120 ticks as the maximum/default floor for normal material.
 * ✅ Fixes M24 60-tick pick-slide/tremolo material, where one note is shorter
 *    than the old fixed 120-tick floor and was therefore legally unreachable
 *    even after 004C.5c made the exact 120-tick boundary inclusive.
 * ✅ Start side derives effectiveMinSpanTicks from clampDur of the beat
 *    immediately before the fixed end boundary.
 * ✅ End side derives effectiveMinSpanTicks from beatDur of the candidate end
 *    beat.
 * ✅ Uses a minimum safety floor of 1 tick so zero-width and inverted spans
 *    remain rejected.
 * ⛔ Keeps 004C.5d forecastLead scaling, 004C.5c strict operators, 004C.5a
 *    clamp target (previewBeat = clampBeat / newStart = Math.max(current.startTick,
 *    clampTick)), 004C.5b wall, resolver, magnets, buildRects, release,
 *    rects.map, and probe code untouched.
 *
 * 🔥 V1.8.32 CHANGES (MAESTRO-LOOP-004C.5d):
 * ✅ Scales HANDLE_FORECAST_LEAD by local beat pixel spacing. HANDLE_FORECAST_LEAD
 *    remains declared at 12 and now acts as the maximum lead rather than a fixed
 *    lead: forecastLead = Math.min(HANDLE_FORECAST_LEAD, Math.max(2, beatSpacing * 0.25)).
 * ✅ Keeps 12px as the maximum lead at normal beat spacing (M5-class material
 *    should feel unchanged).
 * ✅ Prevents the 12px lead from consuming most of a floor-width M24 beat —
 *    at dense 32nd-note / pick-slide spacing, forecastLead shrinks to roughly
 *    4-6px instead of advancing the resolver candidate a near-full beat early.
 * ✅ Improves accepted payload freshness before release in dense material by
 *    reducing how often the smoothed candidate overshoots into the 004C.5c
 *    hard-guard rejection zone.
 * ⛔ The driver/payload staleness asymmetry this patch mitigates (activeHandleX
 *    updates unconditionally every mousemove; previewRangeRef/rects only update
 *    on accepted frames) is v1.8.5-inherited — surfaced by 004C.5b wall testing
 *    and M24 dense-material testing, not introduced here. Release remains
 *    WYSIWYG and still commits previewRangeRef.current unchanged — this patch
 *    fixes proposal freshness by scaling the smoothing lead, not by
 *    re-resolving on release. Does not change min-span guards, soft clamp,
 *    wall geometry, resolver, magnets, buildRects, rects.map, or probe code.
 *
 * 🔥 V1.8.31 CHANGES (MAESTRO-LOOP-004C.5c):
 * ✅ Makes exact MIN_LOOP_SPAN_TICKS spans legal. Fixes M24 floor-width
 *    32nd-note / pick-slide spans refusing to hold at exactly 120 ticks.
 * ✅ Changes only the hard min-span guard comparisons, from inclusive
 *    rejection to strict rejection.
 * ✅ Keeps the start soft-clamp trigger inclusive intentionally, so
 *    exact-floor start drags still pin to clampBeat / clampTick before
 *    hard-guard evaluation.
 * ✅ Zero-width and inverted ranges remain rejected because strict guards
 *    still reject spans below 120.
 * ⛔ 004C.5a soft clamp body, 004C.5b wall, resolver, magnets, buildRects,
 *    release, rects.map, and probe code remain untouched.
 *
 * 🔥 V1.8.30 CHANGES (MAESTRO-LOOP-004C.5b):
 * ✅ Adds a driver-side geometric wall so active handle glyphs cannot
 *    visually overlap during drag.
 * ✅ Wall derives from the opposite forecast rect edge (startRect/endRect)
 *    during drag, not the opposite handle's live activeHandleX pointer
 *    state.
 * ✅ Start wall uses endRect's right anchor minus one glyph width. End wall
 *    uses startRect's left anchor plus one glyph width.
 * ✅ The existing rect-span clamp runs first; the wall applies last and
 *    wins on conflict.
 * ✅ In dense one-beat geometry, where the wall bound can cross the
 *    handle's own rect-span bound, glyphs kiss/stop instead of merging or
 *    clamp-inverting — this is intentional.
 * ⛔ No tick math, resolver logic, magnet logic, min-span logic, the 004C.5a
 *    soft clamp, buildRects, release logic, rects.map, or probe code
 *    changed.
 *
 * 🔥 V1.8.29 CHANGES (MAESTRO-LOOP-004C.5a):
 * ✅ Fixes the start soft clamp choosing previousBeat during deep overshoot.
 *    clampBeat was resolved at current.endTick - 1 (the last beat before the
 *    fixed end boundary), but in the common case where current.endTick sits
 *    exactly on a beat boundary, current.endTick - clampDur === clampTick,
 *    which collapsed the `previousTick < current.endTick - clampDur` guard to
 *    `previousTick < clampTick` — true for any real previous beat. The clamp
 *    therefore almost always stepped one extra beat back onto
 *    clampBeat.previousBeat, producing a two-beat projection instead of one.
 * ✅ Pins the forecast to clampBeat's own start tick: previewBeat = clampBeat;
 *    newStart = Math.max(current.startTick, clampTick). The previousBeat
 *    branch is removed entirely — deep overshoot now floors at the last beat
 *    before the end boundary, matching Songsterr-style pinned behavior. If
 *    the loop is already at the clampBeat floor, Math.max is a no-op and the
 *    band remains pinned — expected behavior, not dead code.
 * ✅ Keeps the 004C.4 hard fixed floor (MIN_LOOP_SPAN_TICKS) completely
 *    unchanged as a separate, still-necessary guard: clampDur > 120 lets the
 *    clamp output pass through and the band pins to clampBeat; clampDur <= 120
 *    means the hard guard still rejects and the band stays at the prior legal
 *    forecast. This is expected, layered behavior, not a regression.
 * ✅ [loop-handle-start-clamp] probe log gains two primitive fields —
 *    clampBeatTick and clampBeatDuration — alongside the existing
 *    requestedTick/clampedTick/currentEndTick. No object references added.
 * ✅ Retires the clampTick dead-code warning flagged by the 004C.4a audit —
 *    clampTick now drives newStart directly instead of sitting unused.
 * ⛔ End handle path is unchanged — it has no matching soft clamp, only its
 *    own hard min-span guard, untouched here. resolveBeatWithX, magnet branch
 *    logic (including the 004C.2 same-row guards), buildRects, the
 *    handleDragEnd commit path, and the 004D.5 pointer-driver/activeHandleX
 *    layer are all untouched. The duplicate findBeat lookup remains deferred.
 *
 * 🔥 V1.8.28 CHANGES (MAESTRO-LOOP-004D.5):
 * ✅ Restores the v1.8.5 pointer-driven active handle layer, removed as dead
 *    state in MAESTRO-LOOP-004D.1b (activeHandleX/activeHandleClientXRef/
 *    dragTarget had no live reader at the time, since 004D.1 had already
 *    switched the handle glyph to render from the snapped rect boundary).
 *    dragTarget (reactive), activeHandleClientXRef, and activeHandleX are
 *    reintroduced with the same seed/update/clear lifecycle as v1.8.5:
 *    seeded in handleDragStart, updated every handleDragMove tick before beat
 *    resolution, cleared in handleDragEnd.
 * ✅ Keeps the MAESTRO-LOOP-004D.4a stable sibling mount — the driver
 *    override lives inside the existing startRect/endRect-gated sibling
 *    blocks, never back inside rects.map. Only the handle currently being
 *    dragged (startIsDragging/endIsDragging) gets the raw-pointer override;
 *    the inactive handle and idle state keep the unchanged static rect-edge
 *    position.
 * ✅ The pointer-to-overlay conversion and its clamp are geometric only —
 *    bounded to the dragged handle's own rect span (startRect/endRect x and
 *    width), never to MIN_LOOP_SPAN_TICKS or any tick/beat value. The glyph
 *    may float anywhere within that visual span; the shadow/forecast band
 *    (rects[], driven by resolveBeatWithX → adjustHandleBeatNearBarline →
 *    the 004C.2 same-row guards → the 004C.4 min-span guards → buildRects)
 *    is completely unchanged and keeps snapping independently. Release still
 *    commits previewRangeRef.current — handleDragEnd's commit path is
 *    untouched.
 * ✅ The sibling-layer coordinate math intentionally counts LOOP_X_OFFSET
 *    once. This corrects a latent v1.8.5 double-offset issue that was masked
 *    while LOOP_X_OFFSET stayed 0.
 * ✅ getActiveHandleOverlayX follows the v1.8.5 portrait contract and does
 *    not include surface.scrollLeft. Portrait remains safe because surface
 *    scrollLeft is expected to be 0; landscape/scrollLeft portability
 *    remains a separate lane.
 * ⛔ resolveBeatWithX, adjustHandleBeatNearBarline (including the 004C.2
 *    same-row guards), the 004C.4 fixed min-span invariant, buildRects, the
 *    handleDragEnd commit path, native touchstart refs, and the landscape
 *    branch are all unchanged. Diagnostic probe instrumentation is untouched
 *    and remains local/uncommitted.
 *
 * 🔥 V1.8.27 CHANGES (MAESTRO-LOOP-004C.4):
 * ✅ Two mechanisms, one symptom: the end handle's hard min-span guard and
 *    the start handle's soft clamp trigger were each independently scaled by
 *    beatDur (the drag-resolved beat's own playback duration) — for a
 *    whole/half rest (one large-duration beat), this inflated the forbidden
 *    gap unpredictably; for dense material it stayed tiny. The two handles
 *    only *appeared* symmetric — they were driven by two different
 *    mechanisms (end: a hard reject; start: a preventative soft clamp that
 *    also feeds the render path) using the same variable-scaling logic.
 * ✅ Adds MIN_LOOP_SPAN_TICKS = 120 (a 32nd-note at AlphaTab's observed
 *    480-PPQ-per-quarter scale) and unifies all three beatDur-scaled trigger
 *    sites under this one fixed invariant: the end hard guard
 *    (newEnd <= current.startTick + beatDur → + MIN_LOOP_SPAN_TICKS), the
 *    start hard guard (newStart >= current.endTick →
 *    current.endTick - MIN_LOOP_SPAN_TICKS), and the start soft-clamp
 *    trigger (same substitution). The floor is now identical regardless of
 *    which beat happens to be nearby.
 * ⛔ The soft clamp's internal resolution (clampBeat, clampDur, previous,
 *    previousTick, previewBeat reassignment, and the buildRects/
 *    setRectsWithReason render sync) is unchanged — 004C.4a's audit found
 *    this render-correction role intentional and load-bearing, distinct from
 *    the (defective) trigger threshold. resolveBeatWithX, magnet branch
 *    logic (including the 004C.2 row-wrap guards), buildRects itself, cursor
 *    logic, and playback logic are all untouched. clampTick's dead-code
 *    status and the duplicate findBeat lookup (both found during the 004C.4a
 *    audit), diagnostic probe removal, and 004D.5's pointer-driver/
 *    shadow-forecast recovery work remain deferred, separate follow-ups.
 *
 * 🔥 V1.8.26 CHANGES (MAESTRO-LOOP-004C.2):
 * ✅ Adds a same-row guard to start-last-to-next-bar (nextBeatLeft !== null &&
 *    nextBeatLeft > beatRight), mirroring the 004D.4b same-row guard already
 *    applied to end-last-to-next-bar.
 * ✅ Adds a same-row guard to end-first-hold-back (prevBeatRight !== null &&
 *    prevBeatRight < beatLeft), the same doctrine applied backward.
 * ✅ Prevents magnet branches from substituting a previous/next-row beat when
 *    the raw resolver already correctly identified the current row/bar — a
 *    three-stage diagnostic probe (raw-resolve → resolver-source →
 *    magnet-adjustment) confirmed the resolver itself was correct
 *    (getBeatAtPos's barIdx matched the geometric bar under the pointer) and
 *    the wrong state first appeared inside magnet adjustment specifically:
 *    end-first-hold-back converting rawBarIdx 20/beatIdx 0 into
 *    adjustedBarIdx 19/beatIdx 7 across a row wrap. Unknown/unavailable
 *    geometry declines the branch rather than firing blind, same fail-safe
 *    shape as the existing end-last-to-next-bar guard.
 * ⛔ Resolver behavior, constants (18/35), branch order, min-span guards,
 *    buildRects, buildBarRects, the landscape branch, and the 004D.4a stable
 *    handle layer are all unchanged. The MAESTRO-LOOP-004D.4/004C diagnostic
 *    probe remains local/uncommitted, not part of this patch. Whole-rest/
 *    half-rest barline-only movement (expected — one rest bar is one
 *    resolvable beat), the min-span floor, and raw-pointer/ghost-projection
 *    behavior remain separate follow-up lanes (MAESTRO-LOOP-004C.3+ /
 *    MAESTRO-LOOP-004D.5).
 *
 * 🔥 V1.8.25 CHANGES (MAESTRO-LOOP-004D.4b):
 * ✅ Adds a target==='end' && isLastBeatInBar(beat) && beat.nextBeat branch to
 *    adjustHandleBeatNearBarline — the forward-release mirror of the start
 *    handle's last-beat-to-next-bar branch. Closes the stall the 004D.4 probe
 *    surfaced (target:'end', isLastBeatInBar:true, branch:'no-branch-taken'):
 *    advancing the end handle past a bar's last beat previously had no
 *    release assist at all. Same END_LAST_BEAT_RELEASE_ZONE=35 damping width
 *    as the start-side mirror — no evidence the end side needs a different
 *    value.
 * ✅ Adds a primitive-only [004D4-probe] resolved-bar-changed log in
 *    handleDragMove (reads rawBeat, the RAW resolveBeatWithX output, before
 *    adjustHandleBeatNearBarline) — scoping evidence for the separate
 *    MAESTRO-LOOP-004C teleportation investigation, fires only when
 *    (target, barIdx) changes, reset per-gesture in handleDragStart.
 * ⛔ The MAESTRO-LOOP-004D.4a stable sibling handle layer (positioning,
 *    JSX structure, makePortraitHandleTouchRef, native touchstart refs),
 *    handleDragStart/Move/End behavior (beyond the two probe-only additions
 *    above), the listener lifecycle, resolveBeatWithX, buildRects, min-span
 *    guards, and the landscape branch are all unchanged. MAESTRO-LOOP-004C
 *    teleportation itself and the min-span floor remain separate, open lanes
 *    — this patch only adds scoping evidence for the former, doesn't fix it.
 *
 * 🔥 V1.8.24 CHANGES (MAESTRO-LOOP-004D.4a):
 * ✅ Portrait start/end handles lifted out of rects.map into a stable sibling
 *    handle layer, rendered after the highlight rects and gated on
 *    startRect/endRect (derived from rects[0]/rects[rects.length-1]) being
 *    non-null. Root cause (004D.4 Trace A): the handles previously lived
 *    inside rects.map with key={i}; isFirst was pinned to the always-stable
 *    index 0, but isLast tracked the MOVING index rects.length-1 — every
 *    time the loop's row-span changed (routine during an active end-handle
 *    drag), React tore down and rebuilt the end handle's DOM node (and its
 *    native touchstart listener) under the user's own finger, observed as
 *    touchstart-ref detach/attach pairs, rectsLength churn, and an
 *    unrequested handleDragEnd. The handle's DOM lifetime now depends only
 *    on rects.length > 0, never on which bar/row backs the boundary or on
 *    rect-array/key churn.
 * ✅ Highlight rect rendering (rects.map itself) is otherwise unchanged —
 *    same key={i}, same geometry, same style; it no longer has any children.
 * ✅ Handle positioning preserves the MAESTRO-LOOP-004D.1 invariant (glyph
 *    anchored to the snapped rect boundary): start left =
 *    rects[0].x + LOOP_X_OFFSET - 13.5, end left =
 *    rects[last].x + rects[last].w + LOOP_X_OFFSET - 13.5 — pixel-identical
 *    to the prior nested-`left:'-13.5px'`/`right:'-13.5px'` positions. top
 *    gets a +1 correction for the 1px borderTop the handle used to inherit
 *    from its removed parent's containing-block padding edge.
 * ⛔ makePortraitHandleTouchRef/portraitStartHandleTouchRef/
 *    portraitEndHandleTouchRef, handleDragStart/Move/End, the listener
 *    lifecycle effect, native touchstart mechanics, the pointerup/
 *    pointercancel safety net, resolveBeatWithX, adjustHandleBeatNearBarline,
 *    buildRects, min-span checks, and the landscape branch are all
 *    unchanged. The MAESTRO-LOOP-004D.4 diagnostic probe (LOOP_004D4_PROBE)
 *    is retained for post-patch verification, not removed. The confirmed
 *    secondary cause — no end-side mirror of the start handle's
 *    last-beat-in-bar→next-bar magnet branch in adjustHandleBeatNearBarline —
 *    remains separate, tracked as MAESTRO-LOOP-004D.4b, not patched here.
 *
 * 🔥 V1.8.23 CHANGES (MAESTRO-LOOP-004D.1b):
 * ✅ Removed the dead raw-pointer render state parked by V1.8.22/004D.1:
 *    dragTarget/setDragTarget, activeHandleX/setActiveHandleX, and
 *    activeHandleClientXRef, plus every write site in handleDragStart/
 *    handleDragMove/handleDragEnd. None had a live reader after 004D.1
 *    switched the handle glyph to render from the snapped rect boundary
 *    (rects[0]/rects[last]) instead of raw pointer position.
 * ⛔ dragTargetRef (the actively-read drag-target source of truth),
 *    handleDragging, the listener lifecycle effect, native touchstart refs,
 *    the pointerup/pointercancel safety net, resolveBeatWithX,
 *    adjustHandleBeatNearBarline, buildRects, min-span checks, and the
 *    landscape branch are all unchanged. Pointer-capture lifecycle itself
 *    remains parked for MAESTRO-LOOP-004D.2.
 *
 * 🔥 V1.8.22 CHANGES (MAESTRO-LOOP-004D.1):
 * ✅ Portrait start/end handle glyphs now always render at the same static
 *    rect-edge offset previously used only at rest (left:'-13.5px' / right:
 *    '-13.5px'). Removed the drag-time branch that instead followed raw
 *    activeOverlayX (pointer clientX converted to overlay space, clamped to
 *    the current rect). Since rects[0]/rects[last] are already rebuilt from
 *    the resolved+magnet-adjusted beat on every handleDragMove tick (via the
 *    existing buildRects calls), the glyph now stays glued to exactly the
 *    edge the highlight band renders — no separate tracking needed.
 * ✅ Removed now-dead getActiveHandleOverlayX()/activeOverlayX and the
 *    startIsDragging/endIsDragging flags (their only readers).
 * ⛔ [ACTIONED in V1.8.23/004D.1b] dragTarget/activeHandleX state and their
 *    setters were deliberately left firing from handleDragStart/Move/End at
 *    this version, parked rather than removed — see V1.8.23 above for the
 *    follow-up. handleDragStart/Move/End bodies, resolveBeatWithX,
 *    adjustHandleBeatNearBarline, buildRects, min-span checks, the event
 *    listener effect, native touchstart refs, the pointerup/pointercancel
 *    safety net, and the landscape branch are all unchanged.
 *
 * 🔥 V1.8.21 CHANGES (MAESTRO-LOOP-002I.2a-1, audited in 002I.2):
 * ✅ MAX_DELTA_BARS_PER_GESTURE raised 1 → 4 (resolveClampedLandscapeBoundary). Not
 *    unlimited — a conservative numeric cap, since edge auto-scroll doesn't exist yet.
 *    Crossing-prevention and equal-index/one-bar-minimum semantics unchanged.
 * ✅ landscapeHandleDragEnd now commits from landscapePreviewBarIdx (captured before
 *    clearLandscapePreview() nulls it) instead of re-resolving release coordinates via
 *    resolveLandscapeBarIndexAtX. landscapePreviewBarIdx is already the resolved+
 *    clamped, already-displayed value for the dragged boundary — committing it directly
 *    makes release provably match what the user last saw, eliminating a real race where
 *    the last preview RAF tick and the release event read time-separated pointer
 *    samples (could show e.g. M2 in preview, settle back to M1 on release). The non-
 *    dragged boundary is still read from the current range, as before.
 * ✅ Null-preview rule: if no preview was ever displayed this gesture (release before
 *    the first RAF preview tick), release is now a no-op — range unchanged, no
 *    fallback re-resolve of release coordinates. Prevents a sub-frame flick from
 *    committing a target the user never saw previewed.
 * ⛔ resolveLandscapeBarIndexAtX itself, resolveClampedLandscapeBoundary's crossing/
 *    clamp math, the RAF preview throttle, marker rendering, and the 002I.1c scroll
 *    seal (freeze/restore, native touchstart listeners) are all unchanged. No forecast/
 *    ghost span, no nearest-boundary resolver, no hysteresis in this commit.
 *
 * 🔥 V1.8.20 CHANGES (MAESTRO-LOOP-002I.1c, folds in 002I.1b — never committed
 * standalone):
 * ✅ [002I.1b] Landscape start/end hit-zones: touch-action:none was already present
 *    (V1.8.14/002D.1); added WebkitUserSelect/userSelect:none, WebkitTouchCallout:none,
 *    and WebkitTapHighlightColor:transparent directly to their static inline style —
 *    suppresses iOS's long-press text-select/callout menu and tap-highlight flash from
 *    first render, earlier than the runtime document.body.style.userSelect toggle in
 *    landscapeHandleDragStart.
 * ✅ [002I.1c Layer A] Native, explicitly non-passive touchstart listeners
 *    (makeLandscapeHitZoneTouchRef, attached via stable callback refs
 *    landscapeStartHitZoneRef/landscapeEndHitZoneRef) replace the hit-zones' React
 *    onTouchStart. React's synthetic onTouchStart can end up passive-marked (observed
 *    live as "Unable to preventDefault inside passive event listener invocation"),
 *    silently making landscapeHandleDragStart's preventDefault a no-op for touch; the
 *    native listener's { passive: false } guarantees it actually runs. Mouse is
 *    unaffected — onMouseDown unchanged.
 * ✅ [002I.1c Layer B] freezeLandscapeContainerScroll/restoreLandscapeContainerScroll:
 *    a live scroll-leak probe found the real scroller (.alphatab-container) still
 *    received scroll events during a handle drag (37 in one run) even with Layer A/the
 *    hit-zone's own touch-action. landscapeHandleDragStart now captures the container's
 *    PRIOR inline overflowX/touchAction and sets overflowX:'hidden'/touchAction:'none'
 *    for the gesture's duration; landscapeHandleDragEnd's existing unconditional cleanup
 *    block restores them exactly — covering successful commit, rotation/missing-state
 *    cancel, failed bar resolution, and the window-blur safety net (which replays
 *    landscapeHandleDragEnd unchanged). Both freeze and restore are idempotent no-ops if
 *    called when already in that state. Never writes container.scrollLeft.
 * ⛔ No drag/commit/clamp behavior change. Hit-zone geometry, pointerEvents,
 *    MAX_DELTA_BARS_PER_GESTURE, and the 002I.1 live preview are all unchanged.
 *
 * [MAESTRO-LOOP-002I.1a note] A display-only preview "ghost" guide-line patch was
 * drafted and live-tested, then reverted uncommitted before this version: it was found
 * to be visually occluded by the marker under the current one-bar clamp. Deferred to a
 * future 002I.2 once multi-bar drag gives the ghost a real visual role — not included
 * in this or the prior committed version.
 *
 * 🔥 V1.8.18 CHANGES (MAESTRO-LOOP-002I.1):
 * ✅ Live preview while dragging a landscape start/end handle: landscapePreviewBarIdx
 *    (state) + resolveLandscapePreview (RAF-throttled, consumes landscapeDragFinalPosRef
 *    at most once per frame — never scans boundsLookup per raw move event) drive a
 *    moving marker line via resolvePreviewEdgeX. The highlight band and the OTHER
 *    marker stay exactly as committed; only the actively-dragged marker moves.
 * ✅ resolveClampedLandscapeBoundary: the one-bar clamp + crossing-prevention math
 *    (previously inline in landscapeHandleDragEnd only) is now a shared function called
 *    by BOTH the preview resolver and landscapeHandleDragEnd, so preview and commit are
 *    provably WYSIWYG (identical inputs → identical output, not a mirrored copy).
 *    MAX_DELTA_BARS_PER_GESTURE is unchanged — still 1, still BETA scope.
 * ⛔ Commit is still release-only: landscapeHandleDragMove still only records pointer
 *    position (plus scheduling the preview RAF) — no rects/api.playbackRange/
 *    onLoopChange/rebuildFromPlaybackRange writes happen until landscapeHandleDragEnd.
 *    Preview clears (clearLandscapePreview) on every landscapeHandleDragEnd exit path:
 *    successful commit, rotation/missing-state cancel, failed bar resolution, and the
 *    existing window-blur safety net (which replays landscapeHandleDragEnd unchanged).
 *    No change to hit-zone size/position/pointer-events, portrait behavior, or the
 *    002G band clamp/shell fixes.
 *
 * 🔥 V1.8.17 CHANGES (MAESTRO-LOOP-002G):
 * ✅ Landscape .beat-loop-highlight-landscape band's rendered left/width are now
 *    clamped to the visible container width (bandVisibleLeft/bandVisibleRight/
 *    bandVisibleWidth) before rendering. On wide loops (4+ bars) the band's true,
 *    unclamped rect could extend far past the viewport, inflating the outer landscape
 *    shell's scrollWidth — which then got pinned to max scrollLeft (right-side white
 *    wipe, cursor/score misregistration). Companion fix in page.tsx's <main> landscape
 *    branch (overflow-x-hidden → overflow-x-clip) is the primary guard; this clamp
 *    reduces the oversized DOM footprint at the source.
 * ⛔ Visual-only: start/end handle markers, the two hit-zone divs, and all drag math
 *    still use the original unclamped `left`/`r.w` — no change to loop-tick-derived
 *    geometry, hit zones, or drag behavior.
 *
 * 🔥 V1.8.16 CHANGES (MAESTRO-LOOP-002D.2):
 * ✅ Window-blur safety net: a mouse released outside the browser window never fires
 *    window mouseup, which could leave a landscape handle drag stuck. onWindowBlur
 *    reuses landscapeHandleDragEnd unchanged (landscapeDragFinalPosRef already holds
 *    the last tracked position) — same commit-or-cancel logic as a normal release, no
 *    new branch. touchcancel was already handled (V1.8.14).
 * ✅ Pressed/active visual state (activeLandscapeDragHandle): the marker being dragged
 *    glows brighter/thicker (3px→5px, stronger boxShadow) while held. This is NOT a live
 *    range preview — it never reads/writes rects or api.playbackRange; the highlight
 *    stays exactly as last committed until release.
 * ✅ Clarified in comments that MAX_DELTA_BARS_PER_GESTURE=1 (V1.8.15) is deliberate BETA
 *    behavior compensating for the absence of live preview, not a permanent constraint.
 * ⛔ No live range preview, no multi-bar drag, no beat-level drag, no background
 *    click/drag changes, no hit-zone size change (40px already exceeds portrait's own
 *    27px precedent; no evidence from testing that it's too small) — all unchanged.
 *
 * 🔥 V1.8.15 CHANGES (MAESTRO-LOOP-002D.1B — closed and pushed):
 * ✅ Fixed resolveLandscapeBarIndexAtX's coordinate origin: it measured from
 *    .at-surface's own getBoundingClientRect() (the scrolled CONTENT — moves with
 *    scroll) and then also added landscapeScrollLeft, double-counting the scroll
 *    offset. Now measures from container's getBoundingClientRect() (the stable outer
 *    scroll-viewport box the render path's own r.x - scrollLeft math is anchored to),
 *    matching test findings exactly: correct near M1 (scrollLeft≈0), multi-bar jumps
 *    further into the song, failures near the end (error grows with scroll distance).
 * ✅ Nearest-bar fallback threshold lowered 200px → 80px.
 * ✅ New safety clamp: a single drag gesture can move a boundary at most
 *    MAX_DELTA_BARS_PER_GESTURE (1) bar from its ORIGINAL position, regardless of
 *    resolver output — defense-in-depth against any remaining coordinate imprecision,
 *    independent of whether the fix above is itself fully correct.
 * ✅ New debug flag LANDSCAPE_HANDLE_DRAG_DEBUG (default false) logs drag-start/end
 *    coordinates, score-space conversion, candidate-bar count, resolved/clamped bar
 *    indices, and commit/cancel reason — no behavior change when false.
 * ⛔ No live preview, no beat-level drag, no background click/drag changes — all
 *    unchanged from V1.8.14.
 *
 * 🔥 V1.8.14 CHANGES:
 * ✅ MAESTRO-LOOP-002D.1: Landscape handle-originated bar-by-bar drag prototype;
 *    commit-on-release only (no live preview). New, separate landscape drag state
 *    (landscapeDragTargetRef/landscapeHandleDragging/etc.) and a new bar-index-from-X
 *    resolver (resolveLandscapeBarIndexAtX, reusing boundsLookup.staffSystems[].bars[]
 *    .visualBounds — the same data source buildBarRects already uses, never beat-level
 *    buildRects/resolveBeatWithX). Interactivity added only via ~40px invisible hit
 *    zones centered on each V1.8.11 marker (pointerEvents:'auto', touchAction:'none');
 *    the highlight body and 3px markers remain non-interactive. Background click-to-
 *    create/move and beat-level editing remain guarded (LandscapeLoopClickGuard,
 *    LandscapeOnUpGuard, LandscapeDragEndGuard all untouched) — only this dedicated
 *    handle-drag path can commit, via its own started-and-ended-in-landscape check.
 *
 * 🔥 V1.8.13 CHANGES:
 * ✅ MAESTRO-LOOP-DEBUG-002: LOOP_HANDLE_DRAG_DIAG disabled before landscape drag
 *    prototype; no runtime behavior changes. Debug block preserved (not removed).
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
 *    scrolling and LandscapeLoopClickGuard/LandscapeOnUpGuard/LandscapeDragEndGuard were
 *    unaffected at the time. (Handle-originated bar-by-bar dragging was since added in
 *    V1.8.14 / LOOP-002D.1, via dedicated hit zones — see above.)
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
 * ⛔ Landscape background click-to-create/move and beat-level editing remain
 *    intentionally guarded (LandscapeLoopClickGuard, LandscapeOnUpGuard,
 *    LandscapeDragEndGuard, all untouched) — not yet authorized. (Visible-only boundary
 *    handle rendering was added in V1.8.11 / LOOP-002C; handle-originated bar-by-bar
 *    dragging — a separate, dedicated code path — was added in V1.8.14 / LOOP-002D.1.)
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
 * ✅ [SUPERSEDED by V1.8.22/MAESTRO-LOOP-004D.1, state removed in
 *    V1.8.23/004D.1b — see top of file] Active handle was pointer-driven
 *    (not tied to preview rect edge): activeHandleClientXRef tracked raw
 *    pointer clientX during drag, and the handle rendered at pointer X
 *    converted to overlay-space coordinates. As of V1.8.22 render stopped
 *    reading them; as of V1.8.23 activeHandleClientXRef/activeHandleX (and
 *    dragTarget) were removed entirely — the handle glyph renders from the
 *    snapped rect boundary instead.
 * ✅ Preview highlight = snap/forecast-driven (beat-level, same as v1.8.1).
 * ✅ Inactive handle = anchored to opposite edge of preview/committed range.
 * ✅ Grab offset removed — was causing 1–2 inch separation. Handle center
 *    tracked pointer directly with no offset math (render-side superseded by
 *    V1.8.22 — see note above; the underlying grab-offset removal itself is
 *    still correct/unrelated).
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
 *      [dragTarget state itself removed in V1.8.23/004D.1b — dragTargetRef,
 *      added later, is the live source of truth]
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
 * ✅ STAGE 4 — Landscape suppress (superseded — see V1.8.8, V1.8.10, V1.8.11, V1.8.14 above):
 *    - isLandscape prop added; returns null in landscape mode
 *    - Prevents coordinate-space mismatch until landscape loop system is designed
 *    - No longer a blanket "return null": V1.8.8 added the display-only highlight,
 *      V1.8.10 added real bar-snapped creation, V1.8.11 added visible-only boundary
 *      markers, and V1.8.14 added handle-originated bar-by-bar dragging. Background
 *      click-to-create/move and beat-level editing remain guarded.
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
    // [MAESTRO-LOOP-002D] Short-lived render bridge for landscape toggle-ON and (as of
    // LOOP-002D.1) landscape handle-drag commits. AlphaTabRenderer owns a separate effect
    // that resyncs api.playbackRange from page.tsx's own playbackRange prop; that prop is
    // still null on the same commit that writes a new range directly, so it clobbers that
    // direct write back to null before page.tsx's state round-trips back down. This ref
    // carries the just-committed tick range across that gap for the landscape display
    // branch ONLY — it is not a new long-term source of truth: onLoopChange still owns
    // page/parent state, this is never read to DECIDE drag/editing behavior, and it
    // self-clears the moment api.playbackRange settles or loopEnabled goes false.
    const pendingCommittedRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    // [MAESTRO-LOOP-002D.1] Separate landscape handle-drag state — deliberately NOT shared
    // with portrait's dragTargetRef/handleDragging/previewRangeRef below, so this prototype
    // never pulls in handleDragMove's beat-level forecast-smoothing pipeline. Commit-on-
    // release only: no live preview, so no rects/api writes happen until drag end.
    const [landscapeHandleDragging, setLandscapeHandleDragging] = useState(false);
    const landscapeDragTargetRef = useRef<'start' | 'end' | null>(null);
    const landscapeDragStartedInLandscapeRef = useRef(false);
    const landscapeDragOriginalRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    const landscapeDragFinalPosRef = useRef<{ clientX: number; clientY: number } | null>(null);
    // [MAESTRO-LOOP-002D.2] Pressed/active visual state ONLY — which handle (if any) is
    // currently being dragged, purely for a "you're holding this" glow on the existing
    // marker line. This is NOT a live range preview: it never reads/writes rects or
    // api.playbackRange, and the highlight/rects stay exactly as committed until release.
    const [activeLandscapeDragHandle, setActiveLandscapeDragHandle] = useState<'start' | 'end' | null>(null);
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
    // [MAESTRO-LOOP-DEBUG-002] Silenced ahead of the landscape drag prototype. Set true
    // to re-enable for future portrait/landscape handle-drag investigation.
    const LOOP_HANDLE_DRAG_DIAG = false;

    // [MAESTRO-LOOP-002D.1B] Landscape handle-drag bar-resolution diagnostic. Set true
    // temporarily for live testing only — logs drag start/end coordinates, the
    // score-space conversion, candidate/resolved/clamped bar indices, and the
    // commit-or-cancel reason. No behavior change when false.
    const LANDSCAPE_HANDLE_DRAG_DEBUG = false;

    // Barline magnet for loop handle drags.
    // If the resolver returns the last beat of the previous bar while the pointer
    // is already to the right of that beat, start handles should prefer the next bar.
    // If it returns the first beat of the next bar while the pointer is still left
    // of that beat, end handles should prefer the previous bar.
    const LOOP_HANDLE_BARLINE_MAGNET = true;

    // [MAESTRO-LOOP-004C.4] Fixed minimum loop span, in ticks — replaces the
    // prior duration-scaled floor (durOf(beat), i.e. the drag-resolved beat's
    // own playback duration) on both the start and end handle min-span guards
    // and the start handle's soft clamp. 120 ticks = a 32nd-note at AlphaTab's
    // observed 480-PPQ-per-quarter tick scale. The old beatDur-scaled floor
    // meant a whole/half rest (a single, large-duration beat) inflated the
    // forbidden gap unpredictably — dense bars got a tiny floor, sparse bars
    // a huge one. This constant makes the floor identical everywhere,
    // regardless of which beat happens to be nearby.
    const MIN_LOOP_SPAN_TICKS = 120;

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
    const dragTargetRef = useRef<'start' | 'end' | null>(null);

    // Preview range: set during handle drag, committed on release (fix E)
    const [previewRange, setPreviewRange] = useState<{ startTick: number; endTick: number } | null>(null);
    const previewRangeRef = useRef<{ startTick: number; endTick: number } | null>(null);
    const previewRectsRef = useRef<HighlightRect[]>([]);

    // [MAESTRO-LOOP-004D.5] Pointer driver — restored from the v1.8.5 model
    // (removed as dead state in MAESTRO-LOOP-004D.1b, since render didn't read
    // it at the time). dragTarget/activeHandleX are reactive so the sibling
    // handle layer can render an active-handle override; activeHandleClientXRef
    // mirrors activeHandleX without forcing a read during the same tick it's
    // written. Purely a render-side driver — never consulted by the resolver,
    // magnet branches, min-span guards, or the release commit path.
    const [dragTarget, setDragTarget] = useState<'start' | 'end' | null>(null);
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

            // [MAESTRO-LOOP-004C.2] Same-row guard, mirroring the 004D.4b guard
            // on end-last-to-next-bar below: nextBeatLeft > beatRight only holds
            // when beat.nextBeat sits further right on the SAME row as the
            // current beat (the ordinary interior-barline case this branch is
            // for). If beat.nextBeat is actually the first beat of the NEXT
            // ROW, its visualBounds.x sits back at that row's left margin —
            // i.e. nextBeatLeft < beatRight — so without this guard the branch
            // could pull the start handle forward across a row boundary into
            // the next row on pure horizontal overshoot, before the raw
            // resolver itself has actually moved there (same class of bug
            // 004D.4b fixed for end-last-to-next-bar, and confirmed present
            // here via the mirrored end-first-hold-back repro: rawBarIdx 20 →
            // adjustedBarIdx 19). Declines (falls through) rather than firing
            // blind when nextBeatLeft is unavailable. Threshold/zone width and
            // this branch's beat→next-bar purpose are unchanged.
            if (
                nextBeatLeft !== null &&
                nextBeatLeft > beatRight &&
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

        // [MAESTRO-LOOP-004D.4b] Backward-hold branch: the end handle is pinned on
        // the FIRST beat of its bar and the pointer is still trailing behind/near
        // the previous bar — holds the preview back at the barline instead of
        // jumping forward. This is distinct from the MAESTRO-LOOP-004D.4b mirror
        // branch below (isLastBeatInBar, forward release) — this one only fires
        // when isFirstBeatInBar is true, the new one only when isLastBeatInBar is
        // true. Note: isFirstBeatInBar and isLastBeatInBar are mutually exclusive
        // in multi-beat bars, but both can be true in one-beat bars such as
        // whole-rest bars. Branch ordering plus each branch's geometry guards
        // arbitrate those cases.
        if (target === 'end' && isFirstBeatInBar(beat) && beat.previousBeat) {
            const beatLeft = vb.x;
            const prevVb = getBeatVB(beat.previousBeat);
            const prevBeatRight = prevVb ? prevVb.x + prevVb.w : null;
            const END_BARLINE_HOLD_ZONE = 18;

            // [MAESTRO-LOOP-004C.2] Same-row guard: prevBeatRight < beatLeft
            // only holds when beat.previousBeat sits further left on the SAME
            // row as the current beat (the ordinary interior-barline case this
            // branch is for). If beat.previousBeat is actually the last beat of
            // the PREVIOUS ROW, its visualBounds sits on a different row
            // entirely — prevBeatRight is not meaningfully "left of" beatLeft
            // in the same visual line — so without this guard the branch could
            // pull the end handle backward into the previous row (confirmed via
            // probe: rawBarIdx 20/beatIdx 0 → adjustedBarIdx 19/beatIdx 7).
            // Declines (falls through) rather than firing blind when
            // prevBeatRight is unavailable or not provably same-row — this
            // supersedes the old null-skips-buffer fallback, since an
            // undetermined row can no longer be assumed safe to hold back into.
            // Threshold/zone width and this branch's hold-back purpose are
            // unchanged.
            if (
                prevBeatRight !== null &&
                prevBeatRight < beatLeft &&
                mouseX <= beatLeft &&
                mouseX <= prevBeatRight + END_BARLINE_HOLD_ZONE
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

        // [MAESTRO-LOOP-004D.4b] Forward-release mirror of the start handle's
        // last-beat-to-next-bar branch above (target==='start' && isLastBeatInBar).
        // Closes the stall the 004D.4 probe surfaced as
        // target:'end', isLastBeatInBar:true, branch:'no-branch-taken': without
        // this, advancing the end handle past a bar's last beat had no release
        // assist at all, unlike every other magnet direction. Same
        // damping/release-zone width as the start-side mirror (35) — no evidence
        // the end side's geometry needs a different value.
        if (target === 'end' && isLastBeatInBar(beat) && beat.nextBeat) {
            const beatRight = vb.x + vb.w;
            const nextVb = getBeatVB(beat.nextBeat);
            const nextBeatLeft = nextVb ? nextVb.x : null;
            const END_LAST_BEAT_RELEASE_ZONE = 35;

            // [MAESTRO-LOOP-004D.4b amend] Same-row guard: nextBeatLeft > beatRight
            // only holds when beat.nextBeat sits further right on the SAME row as
            // the current beat (the ordinary interior-barline case, where the
            // release assist should fire). At a row-end wrap, beat.nextBeat is the
            // first beat of the NEXT row, whose visualBounds.x sits back at the
            // left margin — i.e. nextBeatLeft < beatRight — so this guard blocks
            // purely-horizontal pointer overshoot at a row's right edge from
            // promoting the resolved beat across the wrap into row 2. Cross-row
            // advancement is left entirely to the raw resolver actually moving to
            // the next row (evidenced by resolved-bar-changed), not this magnet.
            if (
                nextBeatLeft !== null &&
                nextBeatLeft > beatRight &&
                mouseX >= beatRight + END_LAST_BEAT_RELEASE_ZONE
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
                        releaseZone: END_LAST_BEAT_RELEASE_ZONE,
                    });
                    return beat.nextBeat;
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

    // [MAESTRO-LOOP-002D.1] Bar-index/tick helpers for the landscape handle-drag
    // prototype. All three read only api.tickCache.masterBars / api.renderer.boundsLookup
    // — the same proven data sources buildBarRects/getExpandedBarRange already use — never
    // beat-level tickCache.findBeat or boundsLookup-based beat hit-testing.

    // Same traversal/predicate as getExpandedBarRange, returning the bar INDEX instead of
    // the tick range, so callers can compare/clamp against other boundaries by index.
    const resolveBarIndexForTick = (tick: number): number | null => {
        const tickCache = (api as any)?.tickCache;
        const masterBarsArr = (tickCache as any)?.masterBars as any[] | undefined;
        if (!masterBarsArr?.length) return null;
        for (const mb of masterBarsArr) {
            const dur = mb?.masterBar?.calculateDuration?.() ?? 0;
            if (dur <= 0) continue;
            if (tick >= mb.start && tick < mb.start + dur) {
                return mb?.masterBar?.index ?? mb?.index ?? null;
            }
        }
        return null;
    };

    // Reverse of the index→tick lookup above: given a resolved bar index, find that same
    // masterBars entry's start tick, so getExpandedBarRange can be reused unchanged.
    const getBarStartTickByIndex = (barIndex: number): number | null => {
        const tickCache = (api as any)?.tickCache;
        const masterBarsArr = (tickCache as any)?.masterBars as any[] | undefined;
        const match = masterBarsArr?.find((mb: any) => (mb?.masterBar?.index ?? mb?.index) === barIndex);
        return match?.start ?? null;
    };

    // Bar-index-from-X resolver for landscape handle drag release. Reuses the exact same
    // data source as buildBarRects (api.renderer.boundsLookup.staffSystems[].bars[].
    // visualBounds) — never beat-level buildRects/resolveBeatWithX.
    //
    // [MAESTRO-LOOP-002D.1B] Coordinate-origin fix: the landscape render path computes
    // viewport position as `r.x + LOOP_X_OFFSET - scrollLeft`, relative to the overlay
    // wrapper — a sibling OUTSIDE the scrolling container, positioned to align with
    // container's own (unscrolled) outer box. container's own getBoundingClientRect()
    // stays fixed as content scrolls INSIDE it (only its children move) — that's the
    // correct, stable origin. The previous implementation used .at-surface's own
    // getBoundingClientRect() instead: .at-surface is the scrolled CONTENT, so its rect
    // already moves with scroll, and adding landscapeScrollLeft on top of that double-
    // counted the scroll offset — an error that grows with scroll distance, matching the
    // observed "works near M1, jumps multiple bars further into the song, fails near the
    // end" pattern exactly.
    //
    // Falls back to the nearest bar only within a bounded pixel distance — beyond that,
    // returns null so the caller cancels the commit rather than guessing.
    const LANDSCAPE_BAR_RESOLVE_MAX_NEAREST_PX = 80;
    // [MAESTRO-SEEK-001e] Extracted from resolveLandscapeBarIndexAtX below so the same
    // proven staffSystems/bars visualBounds scan (exact-hit, else nearest-within-80px)
    // can be reused from a content-space X a caller already has — e.g. a live
    // scrollLeft-derived viewport anchor — without round-tripping through a synthetic
    // clientX. Pure extraction: resolveLandscapeBarIndexAtX's own behavior is unchanged,
    // it is now a thin wrapper around this. debugLabel lets callers keep their own
    // recognizable log tag; logging itself is still gated on the same existing
    // LANDSCAPE_HANDLE_DRAG_DEBUG flag as before.
    const resolveLandscapeBarIndexAtScoreX = (scoreX: number, debugLabel = '[LOOP-002D.1B][landscape-bar-resolve]'): number | null => {
        if (!api?.renderer?.boundsLookup) return null;
        const systems = api.renderer.boundsLookup.staffSystems ?? [];
        let bestIdx: number | null = null;
        let bestDist = Infinity;
        let candidateCount = 0;
        for (const sys of systems) {
            for (const mbb of (sys?.bars ?? [])) {
                const idx = mbb?.masterBar?.index ?? mbb?.index;
                if (idx == null) continue;
                for (const bar of (mbb?.bars ?? [])) {
                    const b = bar?.visualBounds;
                    if (!b) continue;
                    candidateCount++;
                    if (scoreX >= b.x && scoreX <= b.x + b.w) {
                        if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
                            console.log(debugLabel, {
                                scoreX, candidateCount, resolvedIdx: idx, exactHit: true,
                                nearestFallbackDist: null,
                            });
                        }
                        return idx;
                    }
                    const dist = scoreX < b.x ? b.x - scoreX : scoreX - (b.x + b.w);
                    if (dist < bestDist) { bestDist = dist; bestIdx = idx; }
                }
            }
        }
        const withinFallback = bestIdx != null && bestDist <= LANDSCAPE_BAR_RESOLVE_MAX_NEAREST_PX;
        if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
            console.log(debugLabel, {
                scoreX, candidateCount, resolvedIdx: withinFallback ? bestIdx : null,
                exactHit: false, nearestFallbackDist: bestIdx != null ? bestDist : null,
                nearestFallbackMaxPx: LANDSCAPE_BAR_RESOLVE_MAX_NEAREST_PX,
            });
        }
        return withinFallback ? bestIdx : null;
    };
    const resolveLandscapeBarIndexAtX = (clientX: number): number | null => {
        const containerEl = container as HTMLElement | null;
        if (!containerEl) return null;
        const containerRect = containerEl.getBoundingClientRect();
        const scoreX = (clientX - containerRect.left) - LOOP_X_OFFSET + landscapeScrollLeft;
        return resolveLandscapeBarIndexAtScoreX(scoreX);
    };
    // [MAESTRO-SEEK-001e] Fresh Loop ON toggle in landscape/strip mode: resolves the
    // start beat from the LIVE viewport position instead of api.tickPosition. Root
    // cause this fixes — after native WebKit momentum (the F+G isolation flags in
    // AlphaTabRenderer.tsx), api.tickPosition is only updated by that file's debounced
    // scroll-settle seek, which can lag the visible strip by ~150-950ms depending on
    // flick distance; toggling Loop ON inside that window previously read whatever
    // tick was current BEFORE the flick (device-confirmed: MAESTRO-SEEK-001e D2).
    // Resolves the beat under the SAME fixed cursor position AlphaTabRenderer's own
    // landscape touch-seek anchors to (getFixedCursorX/getCursorSurfaceX in
    // AlphaTabRenderer.tsx) via a synchronous, just-now read of container.scrollLeft —
    // never api.tickPosition — so it cannot inherit that staleness. The ratio/bias
    // constants are duplicated here rather than imported: AlphaTabRenderer.tsx is out
    // of scope for this patch and does not export them. Keep in sync if either changes.
    // Returns null (falls back to the existing api.tickPosition read, unchanged) for
    // portrait/desktop, a missing container/boundsLookup/tickCache, or no bar resolved
    // within the existing 80px nearest-bar tolerance — never throws, never partially
    // mutates loop/playback state.
    const LANDSCAPE_VIEWPORT_CURSOR_RATIO = 0.144; // mirrors AlphaTabRenderer.tsx CURSOR_POSITION_RATIO
    const LANDSCAPE_VIEWPORT_CURSOR_BIAS_PX = 0;   // mirrors AlphaTabRenderer.tsx CURSOR_BIAS_PX
    const resolveLandscapeViewportTick = (): number | null => {
        if (!isLandscapeRef.current || !api?.renderer?.boundsLookup) return null;
        const containerEl = container as HTMLElement | null;
        if (!containerEl) return null;
        const masterBarsArr = ((api as any)?.tickCache?.masterBars as any[]) ?? null;
        if (!masterBarsArr) return null;

        const cs = getComputedStyle(containerEl);
        const padL = parseFloat(cs.paddingLeft || '0');
        const padR = parseFloat(cs.paddingRight || '0');
        const contentW = containerEl.clientWidth - padL - padR;
        const cursorX = Math.round(padL + contentW * LANDSCAPE_VIEWPORT_CURSOR_RATIO + LANDSCAPE_VIEWPORT_CURSOR_BIAS_PX) - padL;
        const scoreX = containerEl.scrollLeft + cursorX;

        const barIdx = resolveLandscapeBarIndexAtScoreX(scoreX, '[SEEK-001e][landscape-viewport-tick]');
        if (barIdx == null) return null;

        const entry = masterBarsArr.find((mb: any) => (mb?.masterBar?.index ?? mb?.index) === barIdx);
        const tick = entry?.start;
        if (typeof tick !== 'number') return null;

        if (LANDSCAPE_LOOP_DEBUG) {
            console.log('[SEEK-001e][landscape-viewport-tick]', {
                scrollLeft: containerEl.scrollLeft, cursorX, scoreX, barIdx, tick,
            });
        }
        return tick;
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

        // [MAESTRO-SEEK-001e] Prefer a live viewport-derived tick over api.tickPosition
        // — see resolveLandscapeViewportTick above for why. Falls back to the pre-
        // existing api.tickPosition read, unchanged, for portrait/desktop or whenever
        // live resolution can't resolve a bar.
        const viewportTick = resolveLandscapeViewportTick();
        const tick = viewportTick ?? ((api as any).tickPosition ?? 0);

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

        // [MAESTRO-LOOP-004D.5] Seed the pointer driver at the exact gesture-start
        // position — restored from v1.8.5. Render-side only; does not feed the
        // resolver/magnet/min-span pipeline below.
        const { clientX } = resolveEventPosition(e as any);
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
     * handleDragMove — v1.8.22/004D.1 render model.
     * Handle glyph renders from the snapped rect boundary (rects[0]/
     * rects[last]), rebuilt from the resolved beat below — no raw-pointer
     * render state (removed in MAESTRO-LOOP-004D.1b).
     * Preview rects: computed from snapped beat (forecast) — same rects the
     * handle glyph anchors to.
     * api.playbackRange: NOT written during drag, only on release.
     */
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!dragTargetRef.current) return;
        e.preventDefault();

        const { clientX, clientY } = resolveEventPosition(e);

        // [MAESTRO-LOOP-004D.5] Raw pointer driver movement — restored from
        // v1.8.5. Updated before beat resolution below; render-side only, does
        // not feed resolveBeatWithX/adjustHandleBeatNearBarline/min-span.
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
                const beatSpacing = Math.abs(nextCenter - curCenter);
                const forecastLead = Math.min(
                    HANDLE_FORECAST_LEAD,
                    Math.max(2, beatSpacing * 0.25),
                );
                const switchX = ((curCenter + nextCenter) / 2) - forecastLead;
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
                const beatSpacing = Math.abs(nextCenter - curCenter);
                const forecastLead = Math.min(
                    HANDLE_FORECAST_LEAD,
                    Math.max(2, beatSpacing * 0.25),
                );
                const switchX = ((curCenter + nextCenter) / 2) + forecastLead;
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
            let effectiveMinSpanTicks = MIN_LOOP_SPAN_TICKS;

            if (tickCache && newStart >= current.endTick - MIN_LOOP_SPAN_TICKS) {
                const clampResult = tickCache.findBeat(trackIndices, Math.max(0, current.endTick - 1));
                const clampBeat = clampResult?.beat;
                if (clampBeat) {
                    const clampTick = tickOf(clampBeat);
                    const clampDur = durOf(clampBeat);
                    effectiveMinSpanTicks = Math.max(
                        1,
                        Math.min(MIN_LOOP_SPAN_TICKS, clampDur),
                    );

                    // When the loop is already at the clampBeat floor, Math.max is a
                    // no-op and the band simply remains pinned.
                    previewBeat = clampBeat;
                    newStart = Math.max(current.startTick, clampTick);

                    console.log('[loop-handle-start-clamp]', {
                        requestedTick: beatTick,
                        clampedTick: newStart,
                        currentEndTick: current.endTick,
                        clampBeatTick: clampTick,
                        clampBeatDuration: clampDur,
                        effectiveMinSpanTicks,
                    });
                }
            }

            if (newStart > current.endTick - effectiveMinSpanTicks) return;
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
            const effectiveMinSpanTicks = Math.max(
                1,
                Math.min(MIN_LOOP_SPAN_TICKS, beatDur),
            );
            if (newEnd < current.startTick + effectiveMinSpanTicks) return;
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
    // [MAESTRO-LOOP-004B.2] Event type widened to include PointerEvent — probe evidence
    // (trace 7/10 gesture 27) showed the touch stream can die mid-gesture while the
    // pointer stream continues and delivers pointerup, so pointerup/pointercancel now
    // also route here (see the Stage-1 listener effect below). Nothing in this
    // function's body reads a touch- or mouse-specific property of `e` — only
    // `.preventDefault()` and `.type`, both on the base Event interface — so widening
    // is safe and requires no internal branching.
    const handleDragEnd = (e: MouseEvent | TouchEvent | PointerEvent) => {
        if (!dragTargetRef.current) return;
        if (isLandscapeRef.current) {
            setDragTarget(null);
            setActiveHandleX(null);
            activeHandleClientXRef.current = 0;
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

    // [MAESTRO-LOOP-004B] Always-latest ref for handleDragStart, same pattern as
    // landscapeHandleDragStartRef below. Needed by the native touchstart callback ref
    // (Layer A, ported from 002I.1c) immediately below: that ref attaches once per
    // mounted handle element and must always invoke the CURRENT handleDragStart, not
    // whichever closure was in scope when the element first mounted — handleDragStart
    // is a plain const recreated every render, not stable.
    const handleDragStartRef = useRef(handleDragStart);
    useEffect(() => {
        handleDragStartRef.current = handleDragStart;
    });

    // [MAESTRO-LOOP-004B] Layer A — native, explicitly non-passive touchstart listeners
    // on the portrait handle DOM nodes themselves, ported from landscape's
    // makeLandscapeHitZoneTouchRef (002I.1c). React's synthetic onTouchStart can end up
    // passive-marked, silently making handleDragStart's preventDefault a no-op for
    // touch — the same class of issue landscape was hardened against. Attaching our own
    // listener with { passive: false } guarantees it actually runs. This REPLACES
    // portrait's onTouchStart JSX prop (removed below) rather than supplementing it —
    // two listeners firing on the same touchstart would double-invoke handleDragStart.
    // Mouse is untouched — onMouseDown stays on the JSX below, unchanged.
    //
    // Stable (constructed once via useState's lazy initializer) callback refs rather
    // than a useEffect, matching landscape: the handle divs mount/unmount whenever
    // rects toggles empty/non-empty, and a callback ref's own identity determines
    // whether React tears down + re-invokes it — an inline arrow function would churn
    // attach/detach every render. Each closure tracks its own currently-attached
    // element/handler so it can detach cleanly before attaching to a new element, or
    // on unmount (called with null).
    const makePortraitHandleTouchRef = (target: 'start' | 'end') => {
        let attachedEl: HTMLDivElement | null = null;
        let attachedHandler: ((ev: TouchEvent) => void) | null = null;
        return (el: HTMLDivElement | null) => {
            if (attachedEl && attachedHandler) {
                attachedEl.removeEventListener('touchstart', attachedHandler);
            }
            attachedEl = el;
            attachedHandler = null;
            if (el) {
                attachedHandler = (ev: TouchEvent) => handleDragStartRef.current(ev as any, target);
                el.addEventListener('touchstart', attachedHandler, { passive: false });
            }
        };
    };
    const [portraitStartHandleTouchRef] = useState(() => makePortraitHandleTouchRef('start'));
    const [portraitEndHandleTouchRef] = useState(() => makePortraitHandleTouchRef('end'));

    // ─────────────────────────────────────────
    // Stage 1 — Handle drag global event listeners
    // Attaches/detaches when handleDragging changes.
    // ─────────────────────────────────────────

    useEffect(() => {
        if (!handleDragging) return;

        const onMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
        const onUp = (e: MouseEvent | TouchEvent) => handleDragEnd(e);
        // [MAESTRO-LOOP-004B] Safety net for a release event that never reaches window
        // (backgrounding the app/tab mid-drag, or an OS/browser gesture reinterpretation
        // swallowing the terminating touch) — ported from landscape's onWindowBlur
        // (002D.2/002I.1c). Reuses handleDragEnd unchanged: it commits/cancels exactly
        // like a normal release, using whatever previewRangeRef/dragTargetRef already
        // hold — no new cancel/commit branch, no second cleanup path. Guarded on
        // dragTargetRef.current so a blur with no active drag is a no-op.
        const onWindowBlur = () => {
            if (!dragTargetRef.current) return;
            handleDragEnd(new MouseEvent('mouseup'));
        };

        // [MAESTRO-LOOP-004B.2] The pointer stream can close a portrait handle drag
        // after the touch stream is abandoned. Probe trace 7/10 gesture 27 showed
        // touchmove went silent, no touchend/touchcancel arrived, but pointerup did
        // arrive. These listeners are the release path for that case. Converges through
        // the same handleDragEnd as every other exit path — no second cleanup path.
        // Bubble phase, non-passive (matching touchend/touchcancel above), since
        // handleDragEnd calls preventDefault(). Scoped to active portrait dragging only,
        // same as the rest of this effect (attached/detached with handleDragging). A
        // normal gesture that fires both pointerup and touchend is safe: handleDragEnd's
        // existing `if (!dragTargetRef.current) return;` guard is a synchronous ref
        // check, so whichever of the two arrives first runs the real cleanup and the
        // second is a harmless no-op — no double commit, no new guard needed.
        const onPointerRelease = (ev: PointerEvent) => handleDragEnd(ev);

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp, { passive: false });
        window.addEventListener('touchcancel', onUp, { passive: false });
        window.addEventListener('blur', onWindowBlur);
        window.addEventListener('pointerup', onPointerRelease, { passive: false });
        window.addEventListener('pointercancel', onPointerRelease, { passive: false });

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('touchcancel', onUp);
            window.removeEventListener('blur', onWindowBlur);
            window.removeEventListener('pointerup', onPointerRelease);
            window.removeEventListener('pointercancel', onPointerRelease);
        };
    }, [handleDragging]);

    // ─────────────────────────────────────────
    // [MAESTRO-LOOP-002D.1] Landscape handle drag — commit-on-release only
    //
    // Deliberately separate from handleDragStart/Move/End above: no beat-level
    // resolveBeatWithX/buildRects, no shared state with portrait's dragTargetRef/
    // handleDragging/previewRangeRef. Only reachable from the landscape hit-zone JSX
    // below (onMouseDown/onTouchStart) — background onDown/onUp (LandscapeLoopClickGuard/
    // LandscapeOnUpGuard) and portrait's own handleDragStart/handleDragEnd
    // (LandscapeDragEndGuard) are untouched and remain fully guarded.
    //
    // [MAESTRO-LOOP-002I.1] Live preview added below (landscapePreviewBarIdx +
    // resolveClampedLandscapeBoundary). Commit itself is still release-only and
    // unchanged: landscapeHandleDragMove still only records pointer position (plus
    // scheduling a RAF-throttled preview resolve); rects/api.playbackRange are still
    // written ONLY in landscapeHandleDragEnd.
    // ─────────────────────────────────────────

    // [MAESTRO-LOOP-002I.1] Live preview state — a resolved+clamped bar index only, never
    // rects/api.playbackRange. Rendering (below) uses it purely to reposition the ACTIVE
    // marker; the highlight band and the other marker stay exactly as committed.
    const [landscapePreviewBarIdx, setLandscapePreviewBarIdx] = useState<number | null>(null);
    const landscapePreviewRafRef = useRef<number | null>(null);

    const clearLandscapePreview = () => {
        if (landscapePreviewRafRef.current != null) {
            cancelAnimationFrame(landscapePreviewRafRef.current);
            landscapePreviewRafRef.current = null;
        }
        setLandscapePreviewBarIdx(null);
    };

    // [MAESTRO-LOOP-002I.1] Shared clamp + crossing-prevention math — lifted verbatim out
    // of landscapeHandleDragEnd's inline calculation so the live preview and the commit
    // are PROVABLY WYSIWYG: identical (target, resolvedBarIndex, currentRange) inputs
    // always produce identical output because it's the same function, not a mirrored
    // copy that could drift.
    // [MAESTRO-LOOP-002I.2a-1] MAX_DELTA_BARS_PER_GESTURE raised 1 → 4 (audited in
    // 002I.2). Crossing-prevention and equal-index/one-bar-minimum semantics below are
    // untouched — only the per-gesture distance bound changed. Not unlimited: kept as a
    // conservative numeric cap per the audit (edge auto-scroll doesn't exist yet, and a
    // hard cap bounds a stray far-off mouse drag in desktop/emulator testing regardless
    // of input device).
    const resolveClampedLandscapeBoundary = (
        target: 'start' | 'end',
        resolvedBarIndex: number,
        currentRange: { startTick: number; endTick: number },
    ): {
        currentStartBarIdx: number; currentEndBarIdx: number;
        deltaClampedBarIndex: number; maxDeltaBarsPerGesture: number;
        finalStartBarIdx: number; finalEndBarIdx: number;
    } | null => {
        const currentStartBarIdx = resolveBarIndexForTick(currentRange.startTick);
        const currentEndBarIdx = resolveBarIndexForTick(Math.max(currentRange.startTick, currentRange.endTick - 1));
        if (currentStartBarIdx == null || currentEndBarIdx == null) return null;

        const MAX_DELTA_BARS_PER_GESTURE = 4;
        const originalBoundaryBarIdx = target === 'start' ? currentStartBarIdx : currentEndBarIdx;
        let deltaClampedBarIndex = resolvedBarIndex;
        if (resolvedBarIndex > originalBoundaryBarIdx + MAX_DELTA_BARS_PER_GESTURE) {
            deltaClampedBarIndex = originalBoundaryBarIdx + MAX_DELTA_BARS_PER_GESTURE;
        } else if (resolvedBarIndex < originalBoundaryBarIdx - MAX_DELTA_BARS_PER_GESTURE) {
            deltaClampedBarIndex = originalBoundaryBarIdx - MAX_DELTA_BARS_PER_GESTURE;
        }

        // Clamp by bar INDEX (never by tick arithmetic — bar durations vary with time
        // signature) so start can never pass end and vice versa. Equal indices are a
        // valid one-bar loop (the same minimum a fresh bar-snap creation produces).
        let finalStartBarIdx = currentStartBarIdx;
        let finalEndBarIdx = currentEndBarIdx;
        if (target === 'start') {
            finalStartBarIdx = Math.max(0, Math.min(deltaClampedBarIndex, currentEndBarIdx));
        } else {
            finalEndBarIdx = Math.max(deltaClampedBarIndex, currentStartBarIdx);
        }
        return {
            currentStartBarIdx, currentEndBarIdx,
            deltaClampedBarIndex, maxDeltaBarsPerGesture: MAX_DELTA_BARS_PER_GESTURE,
            finalStartBarIdx, finalEndBarIdx,
        };
    };

    // [MAESTRO-LOOP-002I.1] RAF-throttled preview resolver — consumes the latest recorded
    // pointer position (landscapeDragFinalPosRef, updated on every raw move event) at most
    // once per animation frame. Never scans boundsLookup per raw move event: the RAF gate
    // in landscapeHandleDragMove below ensures this runs at most 60x/sec regardless of
    // move-event frequency.
    const resolveLandscapePreview = () => {
        landscapePreviewRafRef.current = null;
        const target = landscapeDragTargetRef.current;
        const originalRange = landscapeDragOriginalRangeRef.current;
        const finalPos = landscapeDragFinalPosRef.current;
        if (!target || !originalRange || !finalPos || !api) return;
        const resolvedBarIndex = resolveLandscapeBarIndexAtX(finalPos.clientX);
        if (resolvedBarIndex == null) return; // out of fallback range — keep last valid preview
        const currentRange = api.playbackRange ?? originalRange;
        const clamped = resolveClampedLandscapeBoundary(target, resolvedBarIndex, currentRange);
        if (!clamped) return;
        setLandscapePreviewBarIdx(target === 'start' ? clamped.finalStartBarIdx : clamped.finalEndBarIdx);
    };

    // [MAESTRO-LOOP-002I.1c] Layer B — freezes the REAL scroller (.alphatab-container,
    // passed in as `container`) for the duration of a handle drag. A live probe found
    // scrollEventsDuringHandleDrag > 0 (37) even with the hit-zone's own touch-action:none
    // (Layer A below) — the gesture, or some other scroll source, was still reaching the
    // container. Captures the container's PRIOR inline overflowX/touchAction so they can
    // be restored EXACTLY, not reset to a guessed default — container.style.overflowX is
    // toggled elsewhere (applyAxisLock in AlphaTabRenderer sets 'auto' in landscape) and
    // must come back to whatever it actually was. Idempotent: freeze is a no-op if
    // already frozen; restore is a no-op if nothing is currently frozen (nulls the ref
    // the first time it restores, so a second call — e.g. dragEnd firing twice — does
    // nothing).
    const landscapeDragFrozenContainerStyleRef = useRef<{ overflowX: string; touchAction: string } | null>(null);

    const freezeLandscapeContainerScroll = () => {
        const el = container as HTMLElement | null;
        if (!el || landscapeDragFrozenContainerStyleRef.current) return;
        landscapeDragFrozenContainerStyleRef.current = {
            overflowX: el.style.overflowX,
            touchAction: el.style.touchAction,
        };
        el.style.overflowX = 'hidden';
        el.style.touchAction = 'none';
    };

    const restoreLandscapeContainerScroll = () => {
        const prior = landscapeDragFrozenContainerStyleRef.current;
        if (!prior) return;
        landscapeDragFrozenContainerStyleRef.current = null;
        const el = container as HTMLElement | null;
        if (!el) return;
        el.style.overflowX = prior.overflowX;
        el.style.touchAction = prior.touchAction;
    };

    const landscapeHandleDragStart = (e: React.MouseEvent | React.TouchEvent, target: 'start' | 'end') => {
        e.stopPropagation();
        e.preventDefault();
        if (!isLandscapeRef.current || !api?.playbackRange) return;
        landscapeDragTargetRef.current = target;
        landscapeDragStartedInLandscapeRef.current = true;
        landscapeDragOriginalRangeRef.current = { ...api.playbackRange };
        const { clientX, clientY } = resolveEventPosition(e as any);
        landscapeDragFinalPosRef.current = { clientX, clientY };
        setActiveLandscapeDragHandle(target);
        if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
            const range = api.playbackRange;
            console.log('[LOOP-002D.1B][landscape-drag-start]', {
                target,
                clientX, clientY,
                originalStartBarIdx: resolveBarIndexForTick(range.startTick),
                originalEndBarIdx: resolveBarIndexForTick(Math.max(range.startTick, range.endTick - 1)),
                originalRange: range,
            });
        }
        document.body.style.userSelect = 'none';
        (document.body.style as any).webkitUserSelect = 'none';
        // [MAESTRO-LOOP-002I.1c] Layer B — freeze the real scroller for this gesture.
        freezeLandscapeContainerScroll();
        setLandscapeHandleDragging(true);
    };

    const landscapeHandleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!landscapeDragTargetRef.current) return;
        // Prevent the strip from also scrolling while a handle drag that started on the
        // hit zone is in progress — this only ever runs after landscapeHandleDragStart,
        // which only fires from the hit zone itself, so background strip scroll elsewhere
        // is never affected.
        e.preventDefault();
        const { clientX, clientY } = resolveEventPosition(e);
        landscapeDragFinalPosRef.current = { clientX, clientY };
        // [MAESTRO-LOOP-002I.1] Still no rects/api writes here — commit stays release-only.
        // Only schedules a RAF-throttled preview resolve (skipped if one is already
        // pending this frame) from the position just recorded above.
        if (landscapePreviewRafRef.current == null) {
            landscapePreviewRafRef.current = requestAnimationFrame(resolveLandscapePreview);
        }
    };

    const landscapeHandleDragEnd = (e: MouseEvent | TouchEvent) => {
        const target = landscapeDragTargetRef.current;
        if (!target) return;

        const startedInLandscape = landscapeDragStartedInLandscapeRef.current;
        const originalRange = landscapeDragOriginalRangeRef.current;
        const finalPos = landscapeDragFinalPosRef.current ?? resolveEventPosition(e);
        // [MAESTRO-LOOP-002I.2a-1] Capture the last DISPLAYED preview value before
        // clearLandscapePreview() below nulls it. This — not a fresh re-resolve of
        // release coordinates — is what release commits from. Guarantees release
        // provably matches what the user last saw, eliminating the time-separated-
        // pointer-sample race between the last preview RAF tick and the release event.
        const previewBarIdxAtRelease = landscapePreviewBarIdx;

        landscapeDragTargetRef.current = null;
        landscapeDragStartedInLandscapeRef.current = false;
        landscapeDragOriginalRangeRef.current = null;
        landscapeDragFinalPosRef.current = null;
        setActiveLandscapeDragHandle(null);
        document.body.style.userSelect = '';
        (document.body.style as any).webkitUserSelect = '';
        setLandscapeHandleDragging(false);
        // [MAESTRO-LOOP-002I.1 / 002I.1c] Unconditional — covers every exit below
        // (rotation/missing-state cancel, no-preview cancel, and successful commit)
        // plus the window-blur safety net, which replays this same function. Restoring
        // the container's scroll here (not deeper, branch-specific) guarantees normal
        // landscape strip scrolling comes back regardless of which path this call takes.
        clearLandscapePreview();
        restoreLandscapeContainerScroll();

        // [LandscapeHandleDragEndGuard] Only commit when the gesture both started AND is
        // ending in landscape — mirrors the cross-mode-rotation protection
        // LandscapeDragEndGuard already provides for portrait drags, adapted for this
        // dedicated handle-originated path. Rotation mid-gesture cancels, keeping the
        // original range untouched.
        if (!startedInLandscape || !isLandscapeRef.current || !originalRange || !api) {
            if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
                console.log('[LOOP-002D.1B][landscape-drag-end]', {
                    target, reason: 'cancel-rotation-or-missing-state',
                    startedInLandscape, isLandscapeNow: isLandscapeRef.current, hasOriginalRange: !!originalRange,
                });
            }
            return;
        }

        // [MAESTRO-LOOP-002I.2a-1] Null-preview rule: if no preview was ever displayed
        // during this gesture (e.g. release before the first RAF preview tick), this is
        // a no-op — do not re-resolve release coordinates, do not move the boundary.
        // The user can only ever commit a target they actually saw.
        if (previewBarIdxAtRelease == null) {
            console.warn('[landscape-handle-drag] no preview was displayed before release — no-op, range unchanged');
            if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
                console.log('[LOOP-002D.1B][landscape-drag-end]', {
                    target, finalClientX: finalPos.clientX, finalClientY: finalPos.clientY,
                    reason: 'cancel-no-preview-displayed',
                });
            }
            return;
        }

        const currentRange = api.playbackRange ?? originalRange;
        const currentStartBarIdx = resolveBarIndexForTick(currentRange.startTick);
        const currentEndBarIdx = resolveBarIndexForTick(Math.max(currentRange.startTick, currentRange.endTick - 1));
        if (currentStartBarIdx == null || currentEndBarIdx == null) {
            console.warn('[landscape-handle-drag] could not resolve current range to bar indices — edit cancelled');
            return;
        }

        // [MAESTRO-LOOP-002I.2a-1] Commit directly from the already-resolved+clamped,
        // already-displayed preview value — landscapePreviewBarIdx (set via
        // resolveClampedLandscapeBoundary inside resolveLandscapePreview) is already the
        // final bar index for the dragged boundary, so no re-resolution of release
        // coordinates happens here. The non-dragged boundary is untouched by this
        // gesture, so it's read straight from the current range, same as before.
        let finalStartBarIdx = currentStartBarIdx;
        let finalEndBarIdx = currentEndBarIdx;
        if (target === 'start') {
            finalStartBarIdx = previewBarIdxAtRelease;
        } else {
            finalEndBarIdx = previewBarIdxAtRelease;
        }

        const startTickForRange = getBarStartTickByIndex(finalStartBarIdx);
        const endBarStartTick = getBarStartTickByIndex(finalEndBarIdx);
        if (startTickForRange == null || endBarStartTick == null) {
            console.warn('[landscape-handle-drag] tick lookup failed for previewed bar index — edit cancelled');
            return;
        }
        const endBarFullRange = getExpandedBarRange(endBarStartTick);
        if (!endBarFullRange) {
            console.warn('[landscape-handle-drag] getExpandedBarRange failed for end bar — edit cancelled');
            return;
        }

        const finalRange = { startTick: startTickForRange, endTick: endBarFullRange.endTick };

        if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
            console.log('[LOOP-002D.1B][landscape-drag-end]', {
                target,
                finalClientX: finalPos.clientX, finalClientY: finalPos.clientY,
                currentStartBarIdx, currentEndBarIdx,
                previewBarIdxAtRelease,
                finalStartBarIdx, finalEndBarIdx,
                finalRange,
                reason: 'commit-from-preview',
            });
        }

        api.playbackRange = finalRange;
        api.isLooping = true;
        // Same bridge LOOP-002D uses for toggle-on creation — this commit is subject to
        // the identical AlphaTabRenderer clobber race (see pendingCommittedRangeRef above).
        pendingCommittedRangeRef.current = finalRange;
        onLoopChange?.(finalRange.startTick, finalRange.endTick);

        let newRects: HighlightRect[] = [];
        for (let bIdx = finalStartBarIdx; bIdx <= finalEndBarIdx; bIdx++) {
            newRects = newRects.concat(buildBarRects(bIdx));
        }
        setRectsWithReason(newRects, 'landscapeHandleDragEnd');

        // Same double-RAF resync safety net LOOP-002D added for toggle-on, in case the
        // clobber effect hasn't settled by the time this render commits.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (api.playbackRange) rebuildFromPlaybackRange('landscape-handle-drag-resync');
            });
        });
    };

    // [MAESTRO-LOOP-002D.1A] landscapeHandleDragMove/End are plain consts recreated every
    // render (not useCallback — their own dependency list would cascade into the shared
    // buildBarRects/getExpandedBarRange/etc. helpers, which are out of scope to touch here).
    // These refs always hold the latest closure; the listener-attach effect below reads
    // .current at call time instead of closing over the functions directly, so eslint's
    // exhaustive-deps has nothing to flag (ref reads are exempt) with no behavior change —
    // the effect still only (re)attaches once per landscapeHandleDragging transition.
    const landscapeHandleDragMoveRef = useRef(landscapeHandleDragMove);
    const landscapeHandleDragEndRef = useRef(landscapeHandleDragEnd);
    // [MAESTRO-LOOP-002I.1c] Same always-latest pattern, for landscapeHandleDragStart —
    // needed by the native touchstart listeners (Layer A) below.
    const landscapeHandleDragStartRef = useRef(landscapeHandleDragStart);
    useEffect(() => {
        landscapeHandleDragMoveRef.current = landscapeHandleDragMove;
        landscapeHandleDragEndRef.current = landscapeHandleDragEnd;
        landscapeHandleDragStartRef.current = landscapeHandleDragStart;
    });

    // [MAESTRO-LOOP-002I.1c] Layer A — native, explicitly non-passive touchstart listeners
    // on the hit-zone DOM nodes themselves. React's synthetic onTouchStart can end up
    // passive-marked (observed live as "Unable to preventDefault inside passive event
    // listener invocation"), silently making landscapeHandleDragStart's preventDefault a
    // no-op for touch. Attaching our OWN listener with { passive: false } guarantees it
    // actually runs. Mouse is untouched — onMouseDown stays on the JSX below.
    //
    // Implemented as stable (constructed once via useState's lazy initializer, never
    // recreated) callback refs rather than a useEffect: the hit-zone divs mount/unmount
    // whenever renderRects toggles empty/non-empty (loop off, scrolled out of view, etc.),
    // and a callback ref's own identity determines whether React tears down + re-invokes
    // it — an inline arrow function would churn attach/detach every render. Each closure
    // tracks its own currently-attached element/handler so it can detach cleanly before
    // attaching to a new element, or on unmount (called with null).
    const makeLandscapeHitZoneTouchRef = (target: 'start' | 'end') => {
        let attachedEl: HTMLDivElement | null = null;
        let attachedHandler: ((ev: TouchEvent) => void) | null = null;
        return (el: HTMLDivElement | null) => {
            if (attachedEl && attachedHandler) {
                attachedEl.removeEventListener('touchstart', attachedHandler);
            }
            attachedEl = el;
            attachedHandler = null;
            if (el) {
                attachedHandler = (ev: TouchEvent) => landscapeHandleDragStartRef.current(ev as any, target);
                el.addEventListener('touchstart', attachedHandler, { passive: false });
            }
        };
    };
    const [landscapeStartHitZoneRef] = useState(() => makeLandscapeHitZoneTouchRef('start'));
    const [landscapeEndHitZoneRef] = useState(() => makeLandscapeHitZoneTouchRef('end'));

    useEffect(() => {
        if (!landscapeHandleDragging) return;

        const onMove = (e: MouseEvent | TouchEvent) => landscapeHandleDragMoveRef.current(e);
        const onEnd = (e: MouseEvent | TouchEvent) => landscapeHandleDragEndRef.current(e);
        // [MAESTRO-LOOP-002D.2] Safety net for a mouse released outside the window (no
        // mouseup ever reaches window in that case — this is the Chrome Emulator/desktop-
        // mouse equivalent of touchcancel, which is already handled above). Reuses
        // landscapeHandleDragEnd unchanged: landscapeDragFinalPosRef already holds the last
        // tracked move position, so this commits/cancels exactly like a normal release at
        // that last known position — no new cancel/commit branch, no stuck drag state.
        const onWindowBlur = () => {
            if (!landscapeDragTargetRef.current) return;
            if (LANDSCAPE_HANDLE_DRAG_DEBUG) {
                console.log('[LOOP-002D.1B][landscape-drag-end]', { reason: 'window-blur-safety-net' });
            }
            landscapeHandleDragEndRef.current(new MouseEvent('mouseup'));
        };

        window.addEventListener('mousemove', onMove, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd, { passive: false });
        window.addEventListener('touchcancel', onEnd, { passive: false });
        window.addEventListener('blur', onWindowBlur);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchend', onEnd);
            window.removeEventListener('touchcancel', onEnd);
            window.removeEventListener('blur', onWindowBlur);
        };
        // LANDSCAPE_HANDLE_DRAG_DEBUG is a hardcoded boolean literal (never changes at
        // runtime) — listing it satisfies exhaustive-deps with zero effect on when this
        // effect actually re-runs (primitives compare by value; false===false always).
    }, [landscapeHandleDragging, LANDSCAPE_HANDLE_DRAG_DEBUG]);

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

    // ── Landscape loop highlight + handle drag ────────────────────────────────
    // Stage 4 extended: shows the committed loop range in Landscape as a translucent
    // highlight behind the tab, plus (V1.8.11 / MAESTRO-LOOP-002C) visible-only start/end
    // boundary markers, plus (V1.8.14 / MAESTRO-LOOP-002D.1) ~40px invisible hit zones
    // centered on each marker that allow handle-originated bar-by-bar drag, commit-on-
    // release only. The highlight body and the 3px markers themselves remain
    // pointerEvents:'none' — only the two hit-zone divs are interactive, so tap-to-seek
    // and background click/drag remain unaffected everywhere except those hit zones.
    // Rects are in score coordinate space (0–surfaceScrollWidth); left: r.x - scrollLeft
    // converts them to
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

        // [MAESTRO-LOOP-002I.1] Resolves a preview bar index to its left/right viewport-
        // space edge X, reusing the same band filter (firstBandY/bandTolerance) and the
        // same coordinate contract (r.x + LOOP_X_OFFSET - scrollLeft) the committed
        // highlight/handles below use. Positions the live preview marker only — never
        // touches rects/api state.
        const resolvePreviewEdgeX = (barIndex: number, edge: 'start' | 'end'): number | null => {
            const barRects = buildBarRects(barIndex);
            const rect = barRects.find(r => Math.abs(r.y - firstBandY) <= bandTolerance) ?? barRects[0];
            if (!rect) return null;
            const rectLeft = rect.x + LOOP_X_OFFSET - scrollLeft;
            return edge === 'start' ? rectLeft : rectLeft + rect.w;
        };

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
                    selections. The 3px markers themselves stay pointerEvents:'none'.
                    [MAESTRO-LOOP-002D.1] Interactivity lives ONLY in the two hit-zone divs
                    below (~40px, pointerEvents:'auto', touchAction:'none') centered on each
                    marker — the highlight body above remains fully non-interactive, so strip
                    scroll and tap-to-seek are unaffected everywhere except those hit zones. */}
                {renderRects.map((r, i) => {
                    const left = r.x + LOOP_X_OFFSET - scrollLeft;
                    const top = r.y + LANDSCAPE_HIGHLIGHT_Y_OFFSET;
                    const HANDLE_HIT_ZONE_WIDTH = 40;
                    // [MAESTRO-LOOP-002G] Visual-only clamp — the highlight band's true
                    // left/width (used below by markers/hit-zones/drag, untouched) can extend
                    // far outside the viewport on wide loops, which was inflating the outer
                    // landscape shell's scrollWidth (see page.tsx overflow-x-clip change).
                    // Clamping only this band's rendered rect to the visible container width
                    // keeps its DOM footprint bounded without moving any loop-tick-derived
                    // geometry — start/end handles, hit zones, and drag math all still use
                    // the unclamped `left`/`r.w` below.
                    const bandVisibleLeft = Math.max(0, left);
                    const bandVisibleRight = Math.min(containerWidth, left + r.w);
                    const bandVisibleWidth = Math.max(0, bandVisibleRight - bandVisibleLeft);
                    // [MAESTRO-LOOP-002I.1] Preview edge X — only resolved while THIS handle
                    // is the one actively being dragged and a preview bar index exists yet.
                    // Falls back to the committed edge (`left`/`left + r.w`) otherwise, so
                    // there's never a flash of undefined position on the very first frame
                    // before the RAF preview resolver has run.
                    const previewStartLeft = (activeLandscapeDragHandle === 'start' && landscapePreviewBarIdx != null)
                        ? resolvePreviewEdgeX(landscapePreviewBarIdx, 'start')
                        : null;
                    const previewEndLeft = (activeLandscapeDragHandle === 'end' && landscapePreviewBarIdx != null)
                        ? resolvePreviewEdgeX(landscapePreviewBarIdx, 'end')
                        : null;
                    // [MAESTRO-LOOP-002I.2a-2] Ghost/forecast span geometry — display-only,
                    // derived entirely from values already computed above (committed `left`/
                    // `r.w` and the live `previewStartLeft`/`previewEndLeft`). No new state:
                    // this vanishes automatically the instant landscapeHandleDragEnd nulls
                    // activeLandscapeDragHandle/landscapePreviewBarIdx — unconditional, before
                    // any commit/cancel/no-preview branch, and every exit path (mouseup,
                    // touchend, touchcancel, window-blur replay) calls that same function.
                    // Order-independent min/max so growing and shrinking/reverse drags need no
                    // direction-specific branch. committedEdgeX is always a real number (never
                    // the one that moves), so only previewEdgeX needs a null check.
                    const committedEdgeX = activeLandscapeDragHandle === 'start' ? left : left + r.w;
                    const previewEdgeX = activeLandscapeDragHandle === 'start' ? previewStartLeft : previewEndLeft;
                    const ghostRawLeft = previewEdgeX != null ? Math.min(committedEdgeX, previewEdgeX) : 0;
                    const ghostRawRight = previewEdgeX != null ? Math.max(committedEdgeX, previewEdgeX) : 0;
                    const ghostVisibleLeft = Math.max(0, ghostRawLeft);
                    const ghostVisibleRight = Math.min(containerWidth, ghostRawRight);
                    const ghostVisibleWidth = previewEdgeX != null ? Math.max(0, ghostVisibleRight - ghostVisibleLeft) : 0;
                    return (
                        <React.Fragment key={i}>
                            <div
                                className="beat-loop-highlight-landscape"
                                style={{
                                    position: 'absolute',
                                    left: bandVisibleLeft,
                                    top,
                                    width: bandVisibleWidth,
                                    height: r.h,
                                    background: overlayColor,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 900,
                                    boxSizing: 'border-box' as const,
                                }}
                            />
                            {/* [MAESTRO-LOOP-002I.2a-2] Ghost/forecast span — translucent fill
                                from the committed edge to the live preview edge for the actively-
                                dragged handle. zIndex 899, one below the committed band's 900, so
                                it sits BEHIND the band: the band's own fill stays authoritative
                                where they overlap, and the ghost only reads as new information in
                                the non-overlapping delta — avoiding 002I.1a's original "duplicate
                                line occluded by the marker" failure. Display-only: pointerEvents
                                none, touches no playbackRange/rects/hit-zone state. */}
                            {activeLandscapeDragHandle != null && previewEdgeX != null && ghostVisibleWidth > 0 && (
                                <div
                                    className="beat-loop-ghost-span-landscape"
                                    style={{
                                        position: 'absolute',
                                        left: ghostVisibleLeft,
                                        top,
                                        width: ghostVisibleWidth,
                                        height: r.h,
                                        background: overlayColor,
                                        pointerEvents: 'none',
                                        zIndex: 899,
                                        boxSizing: 'border-box' as const,
                                    }}
                                />
                            )}
                            {/* [MAESTRO-LOOP-002D.2] Pressed-state glow ONLY (width/boxShadow) when
                                activeLandscapeDragHandle matches this handle — no range/rects
                                change, purely "you're holding this" feedback during the gesture.
                                [MAESTRO-LOOP-002I.1] Position now follows the live preview edge
                                while dragging (falls back to the committed `left` if no preview
                                is resolved yet) — still no range/rects/api.playbackRange change. */}
                            <div
                                className="beat-loop-handle-landscape beat-loop-handle-landscape-start"
                                style={{
                                    position: 'absolute',
                                    left: activeLandscapeDragHandle === 'start'
                                        ? (previewStartLeft ?? left) - 2.5
                                        : left - 1.5,
                                    top,
                                    width: activeLandscapeDragHandle === 'start' ? '5px' : '3px',
                                    height: r.h,
                                    backgroundColor: handleColor,
                                    boxShadow: activeLandscapeDragHandle === 'start'
                                        ? `0 0 14px ${handleColor}` : `0 0 8px ${handleColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 901,
                                }}
                            />
                            <div
                                className="beat-loop-handle-landscape beat-loop-handle-landscape-end"
                                style={{
                                    position: 'absolute',
                                    left: activeLandscapeDragHandle === 'end'
                                        ? (previewEndLeft ?? (left + r.w)) - 2.5
                                        : left + r.w - 1.5,
                                    top,
                                    width: activeLandscapeDragHandle === 'end' ? '5px' : '3px',
                                    height: r.h,
                                    backgroundColor: handleColor,
                                    boxShadow: activeLandscapeDragHandle === 'end'
                                        ? `0 0 14px ${handleColor}` : `0 0 8px ${handleColor}`,
                                    pointerEvents: 'none',
                                    zIndex: 901,
                                }}
                            />
                            {/* [MAESTRO-LOOP-002D.1] Start handle hit zone — interactive only here. */}
                            <div
                                className="beat-loop-handle-landscape-hitzone beat-loop-handle-landscape-hitzone-start"
                                ref={landscapeStartHitZoneRef}
                                onMouseDown={ev => landscapeHandleDragStart(ev, 'start')}
                                style={{
                                    position: 'absolute',
                                    left: left - HANDLE_HIT_ZONE_WIDTH / 2,
                                    top,
                                    width: HANDLE_HIT_ZONE_WIDTH,
                                    height: r.h,
                                    background: 'transparent',
                                    pointerEvents: 'auto',
                                    touchAction: 'none',
                                    // [MAESTRO-LOOP-002I.1b] touch-action:none (already present, above)
                                    // suppresses native panning/zooming; these three additionally
                                    // suppress iOS's long-press text-select/callout menu and the tap
                                    // highlight flash, statically from first render — independent of
                                    // (and earlier than) the runtime document.body.style.userSelect
                                    // toggle in landscapeHandleDragStart, which only takes effect once
                                    // that handler has already started running.
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    cursor: 'ew-resize',
                                    zIndex: 902,
                                }}
                            />
                            {/* [MAESTRO-LOOP-002D.1] End handle hit zone — interactive only here. */}
                            <div
                                className="beat-loop-handle-landscape-hitzone beat-loop-handle-landscape-hitzone-end"
                                ref={landscapeEndHitZoneRef}
                                onMouseDown={ev => landscapeHandleDragStart(ev, 'end')}
                                style={{
                                    position: 'absolute',
                                    left: left + r.w - HANDLE_HIT_ZONE_WIDTH / 2,
                                    top,
                                    width: HANDLE_HIT_ZONE_WIDTH,
                                    height: r.h,
                                    background: 'transparent',
                                    pointerEvents: 'auto',
                                    touchAction: 'none',
                                    // [MAESTRO-LOOP-002I.1b] Same rationale as the start hit-zone above.
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                    WebkitTapHighlightColor: 'transparent',
                                    cursor: 'ew-resize',
                                    zIndex: 902,
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </>
        );
    }

    // [MAESTRO-LOOP-004D.1] During drag, handle glyphs stay attached to the
    // snapped rect boundary; rects are rebuilt from resolved beats in
    // handleDragMove. No separate drag-time position tracking needed here.
    //
    // [MAESTRO-LOOP-004D.4a] Handle geometry computed once here, outside
    // rects.map, so the handle DOM nodes below can be rendered as fixed
    // siblings rather than as children keyed to a specific rect's array index.
    // startRect/endRect intentionally read rects[0]/rects[rects.length-1]
    // directly — the same source 004D.1 already proved carries the snapped
    // drag boundary — nothing about buildRects, the resolver, or rects itself
    // changes here.
    const startRect = rects.length > 0 ? rects[0] : null;
    const endRect = rects.length > 0 ? rects[rects.length - 1] : null;
    const startRowGeom = startRect ? getRowGeometryForRect(startRect) : null;
    const endRowGeom = endRect ? getRowGeometryForRect(endRect) : null;
    const startHandleHeight = startRowGeom
        ? Math.max(20, startRowGeom.height - LOOP_HANDLE_INSET_Y * 2) : 0;
    const endHandleHeight = endRowGeom
        ? Math.max(20, endRowGeom.height - LOOP_HANDLE_INSET_Y * 2) : 0;
    // +1 preserves the 1px borderTop the nested handle used to inherit from
    // its removed parent's containing-block padding edge (.beat-loop-highlight
    // sets borderTop: '1px solid ...') — verified via the parent's own style
    // object before this patch. Keeps the sibling handle pixel-identical to
    // the pre-004D.4a nested position.
    const startHandleTop = startRowGeom ? startRowGeom.top + 1 + LOOP_HANDLE_INSET_Y : 0;
    const endHandleTop = endRowGeom ? endRowGeom.top + 1 + LOOP_HANDLE_INSET_Y : 0;

    // [MAESTRO-LOOP-004D.5] Pointer driver render — restored from v1.8.5,
    // adapted for the 004D.4a sibling layer (no per-iteration rects.map `r`
    // to clamp against, so the clamp below uses startRect/endRect directly).
    // Only the handle currently being dragged gets an override; the inactive
    // handle and idle state keep the existing static rect-edge position
    // unchanged. This clamp is purely geometric row/rect containment — it
    // never references MIN_LOOP_SPAN_TICKS or any tick/beat value, and never
    // writes back to previewRangeRef/previewRectsRef/rects. The glyph may
    // float anywhere within its own rect's visual span while the shadow band
    // stays wherever the resolver/magnet/min-span pipeline last snapped it.
    const startIsDragging = handleDragging && dragTarget === 'start';
    const endIsDragging = handleDragging && dragTarget === 'end';
    const getActiveHandleOverlayX = (): number | null => {
        if (activeHandleX === null) return null;
        const surface = (container ?? document).querySelector('.at-surface') as HTMLElement | null;
        if (!surface) return null;
        const rect = surface.getBoundingClientRect();
        return (activeHandleX - rect.left) + LOOP_X_OFFSET;
    };
    const activeOverlayX = getActiveHandleOverlayX();

    return (
        <>
            {rects.map((r, i) => {
                const rowGeom = getRowGeometryForRect(r);
                const hlTop = rowGeom.top;
                const hlHeight = rowGeom.height;

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
                    />
                );
            })}

            {/* [MAESTRO-LOOP-004D.4a] Stable sibling handle layer — start/end handle
                DOM nodes no longer live inside rects.map, so their lifetime depends only
                on rects.length > 0, never on rect-array length/key churn during a drag.
                Positioned directly from rects[0]/rects[rects.length-1] geometry, which
                MAESTRO-LOOP-004D.1 already guarantees is the snapped drag boundary. */}
            {startRect && startRowGeom && (
                <div
                    onMouseDown={e => handleDragStart(e, 'start')}
                    ref={portraitStartHandleTouchRef}
                    style={{
                        position: 'absolute',
                        left: (startIsDragging && activeOverlayX !== null)
                            ? (() => {
                                const HANDLE_HALF_W = 13.5;
                                const HANDLE_W = 27;
                                const min = startRect.x + LOOP_X_OFFSET - HANDLE_HALF_W;
                                const max = startRect.x + startRect.w + LOOP_X_OFFSET - HANDLE_HALF_W;
                                const sameRect = rects.length === 1;
                                // non-null by construction: startRect/endRect both derive from rects.length > 0
                                const wallMax = sameRect
                                    ? endRect!.x + endRect!.w + LOOP_X_OFFSET - HANDLE_HALF_W - HANDLE_W
                                    : Infinity;
                                const rawLeft = activeOverlayX - HANDLE_HALF_W;
                                const rectClampedLeft = Math.min(Math.max(rawLeft, min), max);
                                return Math.min(rectClampedLeft, wallMax);
                            })()
                            : startRect.x + LOOP_X_OFFSET - 13.5,
                        top: startHandleTop,
                        transform: 'none',
                        width: '27px',
                        height: startHandleHeight,
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

            {endRect && endRowGeom && (
                <div
                    onMouseDown={e => handleDragStart(e, 'end')}
                    ref={portraitEndHandleTouchRef}
                    style={{
                        position: 'absolute',
                        left: (endIsDragging && activeOverlayX !== null)
                            ? (() => {
                                const HANDLE_HALF_W = 13.5;
                                const HANDLE_W = 27;
                                const min = endRect.x + LOOP_X_OFFSET - HANDLE_HALF_W;
                                const max = endRect.x + endRect.w + LOOP_X_OFFSET - HANDLE_HALF_W;
                                const sameRect = rects.length === 1;
                                // non-null by construction: startRect/endRect both derive from rects.length > 0
                                const wallMin = sameRect
                                    ? startRect!.x + LOOP_X_OFFSET - HANDLE_HALF_W + HANDLE_W
                                    : -Infinity;
                                // Same-rect corrective: rect.x can include clef/time-signature metadata
                                // while rect.x + rect.w is the clean shadow boundary produced by buildRects.
                                const activeRange = previewRange ?? api?.playbackRange ?? null;
                                const sameBar = sameRect && activeRange !== null && (() => {
                                    const startBarIdx = resolveBarIndexForTick(activeRange.startTick);
                                    const endBarIdx = resolveBarIndexForTick(
                                        Math.max(activeRange.startTick, activeRange.endTick - 1),
                                    );
                                    return startBarIdx !== null && startBarIdx === endBarIdx;
                                })();
                                const shadowWallMin = sameBar
                                    ? endRect.x + endRect.w + LOOP_X_OFFSET - HANDLE_HALF_W - HANDLE_W
                                    : -Infinity;
                                const rawLeft = activeOverlayX - HANDLE_HALF_W;
                                const rectClampedLeft = Math.min(Math.max(rawLeft, min), max);
                                return Math.max(rectClampedLeft, wallMin, shadowWallMin);
                            })()
                            : endRect.x + endRect.w + LOOP_X_OFFSET - 13.5,
                        top: endHandleTop,
                        transform: 'none',
                        width: '27px',
                        height: endHandleHeight,
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
        </>
    );
}