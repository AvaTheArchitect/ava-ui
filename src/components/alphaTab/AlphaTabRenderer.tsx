'use client';

/**
 * AlphaTabRenderer.tsx
 * Current version: V145.17-LOCKED
 * Date: June 29th, 2026
 * Loop/Cursor sprint locked — see V120 LOOP/CURSOR LOCKS section.
 *
 * V145.17-LOCKED Patch:
 * ✅ [MAESTRO-CURSOR-001] Resolves Dense Slide / Gliss Cursor Boundary Collapse
 *        by keeping the unconditional same-bar micro-backtrack allowance out
 *        of the V117 guard, removing over-broad dense-slide candidate
 *        rejections, making left-of-current row-aware, and preserving
 *        M24/M128 validated behavior. The V145.14-PROBE diagnostic scaffolding
 *        (module-level probe state/logger/window dump helpers) used to
 *        isolate this has been removed. Validated: M24 DevTools open/closed at
 *        25%, M24 click-seek (first/middle pick slide, finger slide), M24 loop
 *        mid-M23-to-end-M24, M128 dive bomb, SRV slide, repeat first-note
 *        attack unchanged.
 *        LOCK NOTES:
 *        - Do not reintroduce the unconditional same-bar micro-backtrack
 *          allowance in the V117 guard.
 *        - Do not restore the fixed 14px same-row rejection in
 *          resolveNextBeatExpanded.
 *        - Do not restore the fixed 120-tick duration rejection for dense
 *          slide/gliss candidates.
 *        - Keep left-of-current rejection row-aware; only reject
 *          visually-left candidates on the same rendered row/system.
 *        - Do not promote dense slide/gliss passages to barline/next-measure
 *          fallback while valid local anchors remain.
 *        - Future page/mobile scroll snapping must not rewrite beat
 *          candidates, stable beat ownership, or Cursor2 interpolation.
 *
 * V145.16-A/B Patch (EXPERIMENTAL — local A/B test state, not a committed production lock):
 * ✅ [M24DurationRejectAB] Keeps the confirmed M128 14px-filter fix and M24
 *        row-aware left guard, then disables the 120-tick duration rejection
 *        after the M24 probe showed legitimate 60-tick dense-slide candidates
 *        being rejected as durationBelowThreshold before next-measure fallback.
 *
 * V145.15-A/B Patch (EXPERIMENTAL — local A/B test state, not a committed production lock):
 * ✅ [M24RowAwareLeftGuard] Tests a row-aware left-of-current guard in
 *        resolveNextBeatExpanded after the M24 boundary probe showed forward
 *        candidates being rejected as leftOfCurrent during row/system wrap,
 *        followed by premature next-measure fallback.
 *
 * V145.14-PROBE Patch (TEMPORARY DIAGNOSTIC — not for commit):
 * ✅ [M24BoundaryProbe] Temporary M24 boundary-ownership probe for dense-slide
 *        bounce. Logs whether cursor alternates between local slide anchors
 *        and bar-right/M25 fallback targets. Not for commit.
 *
 * V145.12-A/B Patch (EXPERIMENTAL — local A/B test state, not a committed production lock):
 * ✅ [M24DenseSlideBounceAB] The unconditional same-bar micro-backtrack allowance
 *        stays removed from the V117 backtrack guard. V117 A/B reset (local-ref
 *        bypass restored) and the resolveNextBeatExpanded same-row 14px candidate
 *        filter are being isolated one at a time to find the M24 dense-slide
 *        bounce cause. Not for commit until a single confirmed cause is found.
 *
 * V145.12 Patch:
 * ✅ [LoopOverlayCursorReanchor] Pass onLoopClickSeek={(tick) => publishCursorAtTick(tick)}
 *        to BeatCustomLoopOverlay so loop-overlay click seeks reuse the full
 *        requestSnap + setBeat + setTick anchor chain (see BeatCustomLoopOverlay v1.8.9).
 *
 * V145.11 Patch:
 * ✅ [ExactOnsetClickSeek]
 *        Fixes post-repeat manual click/play first-note silence by seeking
 *        Page-mode clicks to the exact expanded NoteOn boundary instead of
 *        target + 2, allowing AlphaSynth to schedule the first note/chord
 *        attack correctly.
 *
 * V145.10 Patch:
 * ✅ [RepeatOwnerTransitionSnap]
 *        Native repeat/volta transitions are detected by playback owner masterBar
 *        discontinuity, not only by raw tick delta. This triggers requestSnap('repeat-jump')
 *        before renderer gates/setBeat so visually-left repeat destinations are accepted.
 *
 * V145.9 Patch:
 * ✅ [RepeatJumpCursorSnap]
 *        Normal repeat/volta jumps now call requestSnap('repeat-jump')
 *        before renderer stable beat refs are cleared, preventing stale cursor ordering
 *        guards from rejecting visually-left repeat destinations.
 *
 * V145.8 Patch:
 * ✅ [S1ActiveRowComfortZone]
 *        S1 active-row comfort-zone auto-scroll tuning.
 *        Row 2 now triggers first meaningful scroll via sysIdx tracking.
 *        Active row targets a larger focal-zone offset (280px vs prior 100px).
 *        Larger offset means less initial scroll — target formula subtracts
 *        the offset, so active row settles lower in the viewport.
 *        Keeps Row 1/context visible while Row 2 becomes active;
 *        Row 3 remains previewable below. Can be tuned to 300 if needed.
 *        TopMenu visible overlap measured directly for headerH.
 *        snapPortraitToBeatRow aligned with playerPositionChanged S1 semantics.
 *
 * V145.7 Locks:
 * ✅ [RemovePlayStartBeatNormalization]
 *        Removes the V145-only non-loop play-start seek normalization absent in V134LOCKED.
 *        Prevents stale intentional tick reuse from seeking playback backward/restarting audio during play-start.
 *
 * V145.6 Locks:
 * ✅ [Cursor2BoundaryGuard]
 *        Preserves pending hard snap when bounds lookup fails.
 *        Clears stale nextNoteX/stayPutMode state on hard snap consume.
 * V145.4 LOCKS:
 * ✅ [LoopToggleReseatAnchorFix] loop-toggle-on and toggle ON reseat reasons
 *         are now treated the same as loop-play-start for the visible-beat
 *         replacement guard. Prevents the first-visible-attack forward scan
 *         from skipping the loop start beat and parking the cursor at beat 2
 *         during a loop toggle reseat. loopPlayStartPreserveAbsRef is also
 *         set for toggle-on reasons. Do not remove.
 *
 * V145.3 LOCKS:
 * ✅ [SongEndHoldGuard] prevents stale-start overrides from converting a valid
 *         song-end hold anchor into api tick 0/1 during rotation. Guards all three
 *         stale-start override call sites: getRotationAnchorTick, landscapeInitialAnchor,
 *         and primeLandscapeState.
 *
 * V145.2.1 LOCKS:
 * ✅ [PagePlayStartHardSnapGateFix] opens the Page play-start hard snap gate and
 *         defers it one RAF so song-load/remount primes cannot consume the final
 *         playback hard snap. No playerState/seek-age conditions that could prevent
 *         firing. Page-mode only (!forceHorizontalRef.current).
 *
 * V145.2 LOCKS:
 * ✅ [PageCursorPlayStartHardSnap] requests a Page cursor hard snap before playback
 *         starts after recent manual seek, preventing MaestroCursorV2 from animating
 *         from stale downstream interpolation memory.
 *
 * V145.1 LOCKS:
 * ✅ [PrimeLandscapeStateStartOverride] applies the stale-start anchor override directly
 *         inside primeLandscapeState so corrected song-start API truth cannot be
 *         overwritten by stale preRotation/intentional ticks. Runs after V144.6 repair.
 * ✅ [StartBeatReachabilityTolerance] allows M1 beat 1 to snap in landscapeInitialAnchor
 *         when its X is within 8px of the reachable floor (e.g. beatX 120, floor 124).
 *
 * V145 LOCKS:
 * ✅ [StaleStartAnchorOverride] prevents stale mid-M1 rotation anchors from overriding
 *         actual stopped/paused API truth near song start. If api.tickPosition is near 0
 *         and stale preRotation/lastStable anchors are far ahead, getRotationAnchorTick
 *         and landscapeInitialAnchor use the API start tick instead.
 *         Page click and Landscape touch-seek now publish __maestroLastIntentionalTick
 *         and update preRotationAnchorTickRef so user seeks become authoritative.
 *
 * V144.9 LOCKS:
 * ✅ [PlaybackEngagementGate] limits Landscape playback noise suppression to
 *         actively playing streams only. Paused/stopped/manual/rotation ticks
 *         are treated as authoritative so Page ↔ Landscape cursor authority does
 *         not drift inside M1. V144.8 song-end hold remains untouched.
 *
 * V144.8 LOCKS:
 * ✅ [SongEndHoldPlayerState1Guard] suppresses proven post-completion Page reset
 *         ticks where AlphaTab emits tickRaw<=1 while playerState is still 1/2,
 *         while preserving explicit seek/restart-to-start actions.
 *         Diagnostic probes retained for one validation pass.
 *
 * V144.7 LOCKS:
 * ✅ [SongEndHoldCursor] suppresses automatic visual cursor reset to M1 after
 *         natural song completion. tickRaw <= 1 emitted by AlphaTab after
 *         playback ends is treated as end-reset noise when lastTick > 10000 and
 *         no loop is active. Stable anchor preserved at final song position.
 *         Intentional restart (user presses Play) and rewind are unaffected.
 *         Landscape restart-on-Play behavior is preserved — do not modify it.
 *         Portrait path only: suppresses playerState === 0 only. playerState === 1
 *         is always passed through to avoid blocking intentional restarts.
 *
 * V144.6 LOCKS:
 * ✅ [PrimeLandscapeStableAnchorScrollRepair] primeLandscapeState uses
 *         primeScrollTick instead of the raw candidate tick when the candidate
 *         is stale (>960 ticks from stable anchor while not playing, no loop).
 *         Prevents Landscape strip from priming to stale end-of-song position
 *         after user repositions Page cursor. Visual/scroll only — does not
 *         override playback position. Do not remove the _shouldReprimeLandscapeScroll
 *         guard or the primeScrollTick substitution in all three use sites.
 *
 * V144.5 LOCKS:
 * ✅ [DiagnosticLogThrottle] shouldLogDiagnostic() rate-limits high-frequency
 *         debug logs (micro-tick-flood-probe, landscape-visual-loop-sync,
 *         playback-live-stable-anchor, rotation-stable-anchor stable-anchor-updated)
 *         to max once per 750ms or 240-tick advance. Warnings/errors unthrottled.
 *         AlphaSynth Position Changed is library-internal — not our code, not touched.
 *
 * V144.4 LOCKS:
 * ✅ [LandscapeMicroDelta24Guard] expands Landscape micro-delta skip threshold to
 *         24 ticks so tiny 13–18 tick playback noise no longer triggers expensive
 *         beat/state writes while RAF owns smooth motion.
 *
 * V144.3 LOCKS:
 * ✅ [ExistingFutureAnchorRepair] repairs already-poisoned future stable anchors
 *         when a future candidate is rejected: if the existing stable tick is also
 *         far ahead of api.tickPosition, it is overwritten with api.tickPosition.
 * ✅ [LandscapeMicroDelta12Guard] expands Landscape micro-delta skip threshold
 *         to 12 ticks (from 6) while RAF owns smooth playback.
 * ✅ [HardEndResetGuard] rejects tick 0/1 end resets regardless of rotation/settling
 *         gates when Loop is off and lastTick > 10000.
 *
 * V144.2 LOCKS:
 * ✅ [FutureTickAnchorPoisonGuard] rejects stable-anchor candidates that are
 *         far ahead of api.tickPosition (gap > 960) outside rotation/settling,
 *         preventing Landscape from jumping forward after Page playback.
 *         Mirrors the existing LowTickAnchorPoisonGuard in the same function.
 *
 * V144.1 LOCKS:
 * ✅ [LandscapeNoiseGuardLogThrottle] keeps V144 skip behavior but rate-limits
 *         guard diagnostics so Safari is not flooded during dense M128 playback.
 *         Logs at most once per 120-tick or 500ms window per reason; each log
 *         includes skippedCount so the total rate is still observable.
 *
 * V144 LOCKS:
 * ✅ [LandscapePlaybackNoiseGuard] skips expensive Landscape state rewrites for
 *         2–6 tick micro-deltas while RAF owns smooth playback.
 * ✅ [SameBeatBackwardResetGuard] rejects noisy same-beat backward resets like
 *         489239 → 487681 when Loop is off.
 * ✅ [EndResetTickGuard] rejects bogus tick 0/1 resets near the end when no
 *         loop/playbackRange is active.
 *
 * V143.4 LOCKS:
 * ✅ [LandscapeRightRunwayFix] ensures the horizontal strip has enough trailing
 *         scrollable width to center final measures during rotation/prime snaps.
 *         ensureLandscapeRunwayForSnap() is called at both landscapeInitialAnchor
 *         and primeLandscapeState snap-write sites; scrollLeft is deferred one RAF
 *         so the browser processes the expanded scrollWidth before the write.
 *         Fixes browser-clamped containerScrollLeft: 34966 when targetScrollLeft
 *         is 35406.85 during M128/M129 Landscape rotation.
 *
 * V143.3 LOCKS:
 * ✅ [PageScrollResetRecovery] re-applies the correct Page scroll target if
 *         MAIN.scrollTop is reset after top-padding/layout restoration. Checks
 *         at 250ms and 750ms after the final snap write; only fires when not in
 *         Landscape, targetTop > 1000, and actualScrollTop has collapsed < 100.
 * ✅ [LowTickAnchorPoisonGuard] prevents early-song ticks (< 5000) from
 *         replacing a valid late-song rotation anchor when api.tickPosition is
 *         far later (diff > 10000). Fixes tick 1921 replacing anchor 487683.
 *
 * V143.1 LOCKS:
 * ✅ [V139-MisfireGuard] scheduleLandscapeMismatchRecovery is now gated at
 *         three sites: (1) call site in renderFinished only schedules if device
 *         is still in intended strip mode, (2) execution body re-checks strip
 *         intent at deferred-timeout fire time (device may have rotated since
 *         schedule), (3) Page render path cancels any pending recovery timeout
 *         immediately via clearTimeout on pendingLandscapeMismatchRecoveryRef.
 *         Fixes double-render / tray-disappear / scroll-bounce sequence seen
 *         during Landscape → Page rotation. Do not remove any of the three sites.
 *
 * V143 LOCKS:
 * ✅ [PageScrollAuthorityFix] Page view snap/drift positioning now detects
 *         the true vertical scroll authority when .alphatab-container is
 *         full-height and non-scrollable. It preserves native container
 *         scrolling when available, otherwise targets the real scroll parent
 *         or window. Fixes correct-anchor-but-scrolls-to-top behavior after
 *         rotating back to Page.
 * ✅ [PlaybackLiveStableAnchor-LoopSafety] live Landscape anchor promotion now
 *         accepts meaningful backward jumps (>240 ticks) as Custom Loop wrap
 *         resets, while still throttling micro-tick forward updates.
 *
 * V142 LOCKS:
 * ✅ [PlaybackLiveStableAnchor] lastStableRotationAnchorTickRef is now promoted
 *         from live playback sources: Landscape playerPositionChanged ticks when
 *         playerState===1 and tick advances meaningfully, accepted portrait beats
 *         that pass regression/backtrack guards, and the best live tick from
 *         api.tickPosition and landscapeScrollState.lastTick captured immediately
 *         before api.pause(). Fixes rotation-to-Page returning to stale manual
 *         anchor after playback advanced into M129. Do not remove any of the
 *         three promotion sites.
 *
 * V141 LOCKS:
 * ✅ [LandscapeTrailingScrollPaddingScopeFix] removes the trailing spacer
 *         immediately outside healthy Landscape/Horizontal strip mode and
 *         increases pad sizing to containerW - fixedCursorCenterX + safety.
 *         Prevents Page/Portrait blank-screen leakage while giving final
 *         measures enough scroll room to pass under the fixed cursor.
 *
 * V140 LOCKS:
 * ✅ [LandscapeTrailingScrollPadding] adds a dedicated horizontal trailing
 *         spacer inside the AlphaTab scroll container during Landscape mode.
 *         This expands scrollWidth beyond the AlphaTab surface width,
 *         preventing browser scrollLeft clamping and allowing late-song
 *         measures like M128/M129 to scroll completely under the fixed
 *         Landscape cursor line. Does not alter playbackRange, AlphaSynth,
 *         or loop range mapping.
 *
 * V139 LOCKS:
 * ✅ [DeferredLandscapeMismatchRecovery] detects Landscape viewport stuck in
 *         AlphaTab Page geometry and schedules a one-shot delayed recovery
 *         outside renderFinished using setTimeout + double RAF. Prevents the
 *         V137 blank-canvas regression while still recovering from layoutMode 0 /
 *         firstSystemBars <= 2 mismatch.
 * ✅ [TickOneSnapGuard] prevents snap success paths from writing tick 0/1 into
 *         lastStableRotationAnchorTickRef during rotation/settling.
 *
 * V138 HOTFIX:
 * ✅ [LandscapePageMismatchRecoveryDiagnosticOnly] keeps detection and
 *         rescueTick preservation, but disables active updateSettings/render
 *         inside renderFinished after real iPhone blank-canvas regression.
 *         StableAnchorPoisonGuard remains active. Active layout recovery must
 *         be reintroduced later outside AlphaTab renderFinished lifecycle.
 *
 * V137 LOCKS (landscape page-layout mismatch + stable anchor poison guard):
 * ✅ [StableAnchorPoisonGuard] prevents lastStableRotationAnchorTickRef from
 *         being overwritten by beginning-of-song tick 0/1 drift when a larger
 *         trusted stable or intentional tick exists.
 * ✅ [LandscapePageMismatchRecovery] — detection helpers and rescueTick
 *         preservation remain. Active reassert disabled in V138 (see above).
 *
 * V136 LOCKS (rotation stable anchor):
 * ✅ [RotationStableAnchorRef] lastStableRotationAnchorTickRef remembers
 *         the last trusted visible/intentional anchor tick before AlphaTab
 *         enters hybrid rotation/render states. It updates only from trusted
 *         sources: accepted non-settling beats, successful portrait snap,
 *         and successful landscape prime. orientation-flip-start now prefers
 *         this stable anchor before api.tickPosition or landscapeScrollState,
 *         preventing poisoned bar-start drift from being frozen as the
 *         rotation anchor. Do not remove. Phase 2 visual curtain/bounce
 *         suppression is separate.
 *
 * V135 LOCKS (rotation anchor freeze phase 1):
 * ✅ [RotationAnchorFreeze] Phase 1: preRotationAnchorTickRef captures
 *         the intended cursor tick at orientation-flip-start. While
 *         rotationGateActiveRef is true, landscapeInitialAnchor,
 *         primeLandscapeState, and ensureCursorAndAnchorOnce prefer this
 *         ref over api.tickPosition / getIntentionalTick(). The capture is
 *         one-shot per active rotation gate so repeated orientation/render
 *         cycles cannot overwrite a good anchor with AlphaTab's degraded
 *         bar-start tick. Prevents rotation from snapping to beat 1 of the
 *         same bar/loop measure. Do not remove. Phase 2 visual curtain /
 *         bounce suppression is separate.
 *
 * V134 LOCKS (Landscape loop visual completion):
 * ✅ [LandscapeZeroDeltaFallback] lastGoodLandscapeVisualDeltaXRef
 *         stores the last positive visualDeltaX from normal Landscape
 *         beat-to-beat movement. When AlphaTab returns a zero-width
 *         visual segment during loop playback (nextBeatX <= curBeatX + 1),
 *         effectiveNextBeatX is synthesized from the last good delta.
 *         Confirmed: AlphaTab returns the same X for all ticks 7200→7680
 *         and null at loop end 7680. Prevents final loop beat from
 *         visually freezing while audio continues. Do not remove.
 *
 * ✅ [LandscapeNativeLoopWrapSnap] Detects native AlphaTab loop wrap
 *         inside the live playerPositionChanged strip path using
 *         previousTick near playbackRange.endTick and tickRaw near
 *         playbackRange.startTick. Hard-snaps container.scrollLeft and
 *         targetScrollLeftRef to the loop start immediately. Prevents
 *         the first beat after wrap from being visually skipped while
 *         scroll easing catches up. Do not remove.
 *
 * V133 LOCKS (loop-wrap override clear + Landscape loop highlight):
 * ✅ [LoopWrapOverrideClear] __maestroLoopPlayStartOverrideTick and
 *         OverrideTickAt cleared at loop-wrap guard in playerPositionChanged
 *         before seekTicks(liveRange.startTick). Prevents stale inside-highlight
 *         click override (e.g. 7201) from being consumed as primeT when
 *         playerStateChanged re-fires isPlaying useEffect after internal
 *         AlphaTab pause→resume. Do not remove.
 *
 * ✅ [LandscapeLoopHighlight] BeatCustomLoopOverlay v1.8.8 — display-only
 *         Landscape loop highlight. landscapeScrollLeft state synced via
 *         RAF-throttled scroll listener. Deduplicates to first y-band (topmost
 *         staff row). Clips to scrollLeft viewport. pointerEvents: none.
 *         No handles, no drag, no api.playbackRange writes.
 *         [landscape-loop-highlight-render] diagnostic on every Landscape render.
 *         Do not add interaction without separate review. Do not remove.
 *
 * V132 LOCKS (cross-mode gesture guards + intentional tick TTL):
 * ✅ [LandscapeOnUpGuard] onUp clears isDragging/startBeat/endBeat
 *         and returns early when isLandscapeRef.current. Prevents
 *         cross-mode gesture race where onDown in Page mode sets
 *         isDragging=true, device rotates, and onUp fires in Landscape
 *         committing a single-beat range over the full bar-to-bar range.
 *         Do not remove.
 *
 * ✅ [LandscapeDragEndGuard] handleDragEnd returns early and clears
 *         dragTargetRef when isLandscapeRef.current. Prevents handle drag
 *         interrupted by rotation from writing a contaminated range.
 *         Do not remove.
 *
 * ✅ [LandscapeToggleOnGuard] toggle-on useEffect returns early when
 *         isLandscapeRef.current. Prevents toggle-on recovery from writing
 *         a single-bar range during Landscape session while overlay render
 *         is suppressed. Do not remove.
 *
 * ✅ [IntentionalTickTTL30s] getIntentionalTick() TTL extended from
 *         10s to 30s. Covers normal click → wait → rotate usage pattern.
 *         Do not reduce below 15s.
 *
 * V131 LOCKS (landscape playback anchor scope):
 * ✅ [LandscapePlaybackAnchorScope] primeLandscapeState uses live
 *         api.tickPosition during active playback instead of stale
 *         getIntentionalTick(). getIntentionalTick() remains for
 *         rotation/render anchoring only when not actively playing.
 *         Prevents Landscape scroll state from freezing at a parked
 *         cursor tick while audio plays from loop startTick.
 *         __maestroLoopPlayStartOverrideTick is cleared after first
 *         Play use or re-verified as already one-shot. Do not remove
 *         the active-playback tick guard.
 *
 * V130 LOCKS (landscape loop click guard):
 * ✅ [LandscapeLoopClickGuard] BeatCustomLoopOverlay onDown is gated on
 *         !isLandscapeRef.current. Landscape overlay rendering is intentionally
 *         suppressed, so Landscape pointer/click interaction must also be
 *         suppressed. Prevents invisible Landscape overlay interactions from
 *         reaching commitBarSnap or beat-level fallback and overwriting a correct
 *         Page-view bar-to-bar playbackRange with a tiny single-beat range
 *         (~221 ticks). Matches existing if (isLandscape) return null render
 *         suppress pattern. Do not remove.
 *
 * V129 LOCKS (cursor transition curtain):
 * ✅ [CursorTransitionCurtain] FixedLandscapeCursor is below the transition curtain.
 *     FixedLandscapeCursor z-index is 4000, below curtain z-index 5000 but above
 *     score/loop layers during normal playback. Strip-to-page preclear now calls
 *     showCurtain(curtainRef.current) before cursor teardown/render flip. Prevents
 *     body-mounted landscape cursor from visibly sliding/floating above the score
 *     while AlphaTab switches between HorizontalScreen and PageView. Do not remove.
 *
 * V128 LOCKS (rotation intentional tick anchor):
 * ✅ [RotationIntentionalTickAnchor] Durable last-intentional cursor tick.
 *     BeatCustomLoopOverlay writes __maestroLastIntentionalTick and
 *     __maestroLastIntentionalTickAt on loop click and inside-highlight
 *     cursor click. AlphaTabRenderer getIntentionalTick() prefers this
 *     recent user-intended beat before api.tickPosition during
 *     landscapeInitialAnchor, ensureCursorAndAnchorOnce / snapPortraitToBeatRow,
 *     and primeLandscapeState. Prevents rotation from trusting AlphaTab's
 *     playbackRange/startTick bounce after the visible cursor was correctly
 *     parked on a later beat. TTL: 10 seconds. Do not remove.
 *
 * V127 LOCKS (page loop cursor regression + landscape anchor):
 * ✅ [LoopClickBacktrack] commitBarSnap click path sets
 *         __maestroAllowBacktrackUntil = Date.now() + 600. Allows
 *         playerPositionChanged regression guard to accept intentional cursor
 *         movement to an earlier tapped beat/bar. Matches manual handleClick
 *         pattern. Do not remove.
 *
 * ✅ [ClickSeekBacktrackParity]
 *         Arms window.__maestroAllowBacktrackUntil during normal notation click-seek,
 *         matching LoopOverlay behavior so AlphaSynth same-bar lookahead events
 *         cannot be blocked by V117 before cursor.setBeat/setTick.
 *
 * ✅ [LandscapeAnchorCurrentTick] landscapeInitialAnchor prepends
 *         api.tickPosition to PROBE_TICKS. Ensures current beat position is
 *         tried before early-song fallback probes, preventing Landscape
 *         rotation from degrading exact beat position to bar start/scrollLeft=0.
 *         Do not remove.
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
import { attachMaestroCursorV3 } from '@/components/alphaTab/MaestroCursor3';
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
// Sprint C: Every Maestro-originated seek — labels call site, exposes getIntentionalTick() leak.
const SEEK_DIAGNOSTIC_DEBUG = true;
// Sprint A: Page-mode loop/cursor row mismatch diagnostic.
const PAGE_ROW_DEBUG = true;
// Sprint B: Landscape loop overlay + cursor-prime diagnostic.
const LANDSCAPE_LOOP_DEBUG = true;
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
    hasPendingHardSnap: () => boolean;
};

function getIntentionalTick(): number | null {
    const t = (window as any).__maestroLastIntentionalTick;
    const at = (window as any).__maestroLastIntentionalTickAt ?? 0;
    return typeof t === 'number' && Date.now() - at < 30000 ? t : null;
}

// ─── [LandscapeRightRunwayFix] V143.4 ────────────────────────────────────────
// Ensures .maestro-landscape-scroll-spacer gives the container enough right-edge
// scrollable runway to reach targetScrollLeft without browser clamping.
// Bypasses the healthyStrip guard intentionally — callers are already confirmed
// in Landscape strip mode. Returns beforeScrollW and addedRunwayPx for logging.
function ensureLandscapeRunwayForSnap(
    container: HTMLElement,
    targetScrollLeft: number,
    _reason: string,
): { beforeScrollW: number; addedRunwayPx: number } {
    const beforeScrollW = container.scrollWidth;
    const clientW = container.clientWidth;
    const neededScrollW = Math.ceil(targetScrollLeft) + clientW;
    if (beforeScrollW >= neededScrollW) {
        return { beforeScrollW, addedRunwayPx: 0 };
    }
    const surface = container.querySelector('.at-surface') as HTMLElement | null;
    const surfaceW = surface ? (surface.scrollWidth || Math.round(surface.getBoundingClientRect().width)) : 0;
    if (!surfaceW) return { beforeScrollW, addedRunwayPx: 0 };
    const shortage = neededScrollW - surfaceW;
    const runwayPx = Math.max(clientW, Math.ceil(shortage) + 16);
    let spacer = container.querySelector('.maestro-landscape-scroll-spacer') as HTMLElement | null;
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'maestro-landscape-scroll-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        container.appendChild(spacer);
    }
    Object.assign(spacer.style, {
        position: 'absolute',
        left: `${surfaceW}px`,
        top: '0px',
        width: `${runwayPx}px`,
        height: '1px',
        pointerEvents: 'none',
        opacity: '0',
        zIndex: '0',
    });
    return { beforeScrollW, addedRunwayPx: runwayPx };
}

// ── [L8-fix] Landscape initial anchor — retry-until-ready ────────────────────
function landscapeInitialAnchor(
    container: HTMLElement,
    api: any,
    targetScrollLeftRef: React.MutableRefObject<number>,
    maxMs = 1000,
    overrideTick?: number,
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
        // [RotationAnchorFreeze] overrideTick is the frozen pre-rotation anchor;
        // fall back to getIntentionalTick() then api.tickPosition if not provided.
        let liveTick = overrideTick ?? getIntentionalTick() ?? (api as any)?.tickPosition ?? 0;
        // [StaleStartAnchorOverride] V145: if the resolved tick is a stale far-ahead
        // anchor but the API is near song start and stopped, prefer the actual API tick.
        const _liaApiTick = Number((api as any)?.tickPosition ?? 0);
        const _liaPlayerState = Number((api as any)?.playerState ?? -1);
        if (
            _liaPlayerState === 0 &&
            Number.isFinite(_liaApiTick) && _liaApiTick >= 0 && _liaApiTick <= 24 &&
            Number.isFinite(liveTick) && liveTick > 960 && (liveTick - _liaApiTick) > 480
        ) {
            // [SongEndHoldGuard] V145.3: liveTick > 10000 with api near start means this
            // is a post-song-end-hold rotation, not a stale M1 anchor. Preserve the deep anchor.
            const _looksLikeSongEndHold = liveTick > 10000;
            if (_looksLikeSongEndHold) {
                console.warn('[song-end-hold-rotation-preserve]', {
                    reason: 'skip-stale-start-override-for-song-end-hold',
                    callSite: 'landscapeInitialAnchor',
                    apiTickPosition: _liaApiTick,
                    playerState: _liaPlayerState,
                    liveTick,
                    overrideTick: overrideTick ?? null,
                    intentionalTick: getIntentionalTick(),
                });
            } else {
                if (isRendererDebugEnabled()) {
                    console.warn('[rotation-anchor-start-override]', {
                        reason: 'landscapeInitialAnchor-stale-start-anchor-overridden',
                        staleLiveTick: liveTick,
                        apiTickPosition: _liaApiTick,
                        overrideTick: overrideTick ?? null,
                        intentionalTick: getIntentionalTick(),
                        playerState: _liaPlayerState,
                    });
                }
                liveTick = _liaApiTick;
            }
        }
        const PROBE_TICKS = [liveTick, 0, 60, 120, 240, 480, 720, 960];
        if (isRendererDebugEnabled()) {
            console.log('[landscape-cursor-prime-probe]', {
                reason: 'landscapeInitialAnchor-start',
                currentApiTick: api.tickPosition,
                playbackRange: api?.playbackRange ?? null,
                loopEnabled: !!(api?.playbackRange),
                probeTicks: PROBE_TICKS,
                reachableFloor,
                cursorSurfaceX,
                currentScrollLeft: container.scrollLeft,
            });
        }
        for (const probe of PROBE_TICKS) {
            const r = tickCache.findBeat(trackSet, probe);
            const bb = r?.beat ? bounds.findBeat(r.beat) : null;
            if (!bb?.visualBounds) {
                if (isRendererDebugEnabled()) {
                    console.log('[landscape-cursor-prime-probe]', {
                        reason: 'landscapeInitialAnchor-probe',
                        probeTick: probe,
                        beatX: null,
                        reachableFloor,
                        wouldSnap: false,
                        currentApiTick: api.tickPosition,
                    });
                }
                continue;
            }
            const beatX = typeof bb.onNotesX === 'number'
                ? bb.onNotesX : bb.visualBounds.x + bb.visualBounds.w / 2;
            // [StartBeatReachabilityTolerance] V145.1: allow M1 beat 1 to snap when its
            // X is only a few px left of the reachable floor (e.g. beatX 120, floor 124).
            const START_REACHABLE_TOLERANCE_PX = 8;
            const _isSongStartProbe = probe <= 24;
            const _canSnap =
                beatX >= reachableFloor ||
                (_isSongStartProbe && beatX >= reachableFloor - START_REACHABLE_TOLERANCE_PX);
            if (isRendererDebugEnabled()) {
                console.log('[landscape-cursor-prime-probe]', {
                    reason: 'landscapeInitialAnchor-probe',
                    probeTick: probe,
                    beatX: Number(beatX.toFixed(1)),
                    reachableFloor,
                    wouldSnap: _canSnap,
                    isSongStartProbe: _isSongStartProbe,
                    currentApiTick: api.tickPosition,
                });
            }
            if (_canSnap) {
                const snap = Math.max(0, beatX - cursorSurfaceX);
                if (isRendererDebugEnabled()) {
                    console.log('[rotation-anchor-resolution]', {
                        reason: 'landscapeInitialAnchor-snap',
                        source: 'landscapeInitialAnchor',
                        requestedTick: liveTick,
                        resolvedBeatTick: r?.beat?.absolutePlaybackStart ?? null,
                        resolvedBeatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                        resolvedBeatX: Number(beatX.toFixed(1)),
                        resolvedBeatY: bb?.visualBounds?.y ?? null,
                        containerScrollLeft: container.scrollLeft,
                        containerScrollTop: container.scrollTop,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                    });
                    // [rotation-anchor-gate-probe] Point 10: before scrollLeft hard snap (landscapeInitialAnchor)
                    console.log('[rotation-anchor-gate-probe]', {
                        reason: 'before-scrollLeft-snap-landscapeInitialAnchor',
                        rotationGateActive: null,
                        preRotationAnchorTick: null,
                        lastStableRotationAnchorTick: null,
                        isLandscape: true,
                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                        apiTickPosition: api?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: null,
                        loopEnabled: null,
                        playbackRange: api?.playbackRange ?? null,
                        intentionalTick: liveTick,
                        landscapeScrollState: null,
                        containerScrollLeft: container.scrollLeft,
                        containerScrollTop: container.scrollTop,
                        containerClientW: container.clientWidth,
                        containerClientH: container.clientHeight,
                        containerScrollW: container.scrollWidth,
                        containerScrollH: container.scrollHeight,
                        surfaceW: container.querySelector('.at-surface')?.scrollWidth ?? null,
                        surfaceH: container.querySelector('.at-surface')?.scrollHeight ?? null,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                        snapTarget: snap,
                    });
                }
                // [LandscapeRightRunwayFix] V143.4: ensure runway before write, then defer one RAF.
                const { beforeScrollW: _liaBefore, addedRunwayPx: _liaAdded } =
                    ensureLandscapeRunwayForSnap(container, snap, 'landscapeInitialAnchor');
                requestAnimationFrame(() => {
                    if (isRendererDebugEnabled()) {
                        console.log('[landscape-right-runway]', {
                            reason: 'landscapeInitialAnchor',
                            targetScrollLeft: snap,
                            beforeScrollW: _liaBefore,
                            afterScrollW: container.scrollWidth,
                            clientW: container.clientWidth,
                            beforeMaxScrollLeft: _liaBefore - container.clientWidth,
                            afterMaxScrollLeft: container.scrollWidth - container.clientWidth,
                            addedRunwayPx: _liaAdded,
                        });
                    }
                    container.scrollLeft = snap;
                    targetScrollLeftRef.current = snap;
                });
                return;
            }
        }
        if (isRendererDebugEnabled()) {
            console.log('[landscape-cursor-prime-probe]', {
                reason: 'landscapeInitialAnchor-fallthrough',
                note: 'no probe tick matched reachableFloor — scrollLeft set to 0',
                currentApiTick: api.tickPosition,
                playbackRange: api?.playbackRange ?? null,
            });
        }
        // [rotation-anchor-gate-probe] Point 10: before scrollLeft=0 fallthrough (landscapeInitialAnchor)
        if (isRendererDebugEnabled()) {
            console.log('[rotation-anchor-gate-probe]', {
                reason: 'before-scrollLeft-zero-fallthrough-landscapeInitialAnchor',
                rotationGateActive: null,
                preRotationAnchorTick: null,
                lastStableRotationAnchorTick: null,
                isLandscape: true,
                layoutMode: api?.settings?.display?.layoutMode ?? null,
                apiTickPosition: api?.tickPosition ?? null,
                playerState: (api as any)?.playerState ?? null,
                isPlayingRef: null,
                loopEnabled: null,
                playbackRange: api?.playbackRange ?? null,
                intentionalTick: liveTick,
                landscapeScrollState: null,
                containerScrollLeft: container.scrollLeft,
                containerScrollTop: container.scrollTop,
                containerClientW: container.clientWidth,
                containerClientH: container.clientHeight,
                containerScrollW: container.scrollWidth,
                containerScrollH: container.scrollHeight,
                surfaceW: container.querySelector('.at-surface')?.scrollWidth ?? null,
                surfaceH: container.querySelector('.at-surface')?.scrollHeight ?? null,
                systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                note: 'no probe tick matched — snapping to 0',
            });
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
                // Only reject visually-left candidates when they're on the same rendered
                // row/system. A forward-in-time candidate that wrapped to the next
                // row/system can appear left of curX in raw pixel space — that's a
                // layout artifact, not a backward-in-time candidate.
                const _cSameRow = Math.abs(cBb.visualBounds.y - (curBb?.visualBounds?.y ?? cBb.visualBounds.y)) < 5;
                if (_cSameRow && cX < curX - 6) continue;
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

// ── [S1] A/B scroll-engine flag ──────────────────────────────────────────────
// true  → current Maestro S1 custom scroll (default, no behavior change)
// false → bypass S1; portrait can use native AlphaTab ScrollMode.Continuous
// S1 and native scroll must not run together; the flag enforces mutual exclusion.
const MAESTRO_USE_S1_CUSTOM_SCROLL = true;

// ── Cursor engine flag ───────────────────────────────────────────────────────
// false → Cursor2 (production default); true → Cursor3 experimental RAF-slew engine
const MAESTRO_USE_CURSOR3 = false;

// [S1] Active row focal-zone offset. Target places the active row headerH + S1_ACTIVE_ROW_COMFORT_Y
// below the scroll container top. 280px is the first tuned focal-zone value — larger offset means
// less initial scroll because the target formula subtracts this offset, so the active row settles
// lower in the viewport. Keeps Row 1/context visible when Row 2 activates; Row 3 stays previewable.
// Can be tuned to 300 if the active row still feels too high.
const S1_ACTIVE_ROW_COMFORT_Y = 280;

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

// ─── [PageScrollAuthorityFix] V143 scroll authority helpers ──────────────────
type PageScrollAuthority =
    | { scrollEl: HTMLElement; kind: 'element'; scrollTop: number; canScroll: true }
    | { scrollEl: Window; kind: 'window'; scrollTop: number; canScroll: true }
    | { scrollEl: null; kind: 'none'; scrollTop: 0; canScroll: false };

function getPageScrollAuthority(container: HTMLElement | null): PageScrollAuthority {
    if (!container || typeof window === 'undefined') {
        return { scrollEl: null, kind: 'none', scrollTop: 0, canScroll: false };
    }
    let n: HTMLElement | null = container;
    while (n) {
        const canScroll = n.scrollHeight > n.clientHeight + 5;
        const cs = window.getComputedStyle(n);
        const overflowY = cs.overflowY;
        if (canScroll && /(auto|scroll|overlay)/.test(overflowY)) {
            return { scrollEl: n, kind: 'element', scrollTop: n.scrollTop, canScroll: true };
        }
        n = n.parentElement;
    }
    const doc = document.documentElement;
    const body = document.body;
    const windowScrollH = Math.max(doc.scrollHeight, body?.scrollHeight ?? 0);
    if (windowScrollH > window.innerHeight + 5) {
        return {
            scrollEl: window,
            kind: 'window',
            scrollTop: window.scrollY || doc.scrollTop || body?.scrollTop || 0,
            canScroll: true,
        };
    }
    return { scrollEl: null, kind: 'none', scrollTop: 0, canScroll: false };
}

function getPageAuthorityScrollTop(authority: PageScrollAuthority): number {
    if (!authority.canScroll) return 0;
    if (authority.kind === 'element') return authority.scrollEl.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || document.body?.scrollTop || 0;
}

function setPageAuthorityScrollTop(authority: PageScrollAuthority, top: number): void {
    if (!authority.canScroll) return;
    const nextTop = Math.max(0, top);
    if (authority.kind === 'element') { authority.scrollEl.scrollTop = nextTop; return; }
    window.scrollTo({ top: nextTop, behavior: 'auto' });
}

// [V143.1 page-scroll-authority-result diagnostics] ─────────────────────────
function describeScrollAuthority(authority: PageScrollAuthority): any {
    if (!authority.canScroll) {
        return { kind: authority.kind };
    }
    if (authority.kind === 'element') {
        const el = authority.scrollEl;
        const r = el.getBoundingClientRect();
        return {
            kind: 'element',
            tag: el.tagName,
            id: el.id || '',
            className: String(el.className || ''),
            scrollTop: el.scrollTop,
            clientH: el.clientHeight,
            scrollH: el.scrollHeight,
            rectY: Math.round(r.y),
            rectH: Math.round(r.height),
            overflowY: window.getComputedStyle(el).overflowY,
        };
    }
    return {
        kind: 'window',
        scrollTop:
            window.scrollY ||
            document.documentElement.scrollTop ||
            document.body?.scrollTop ||
            0,
        innerH: window.innerHeight,
        docScrollH: document.documentElement.scrollHeight,
        bodyScrollH: document.body?.scrollHeight ?? null,
    };
}
function logPageScrollApplyResult(params: {
    reason: string;
    phase: string;
    authority: PageScrollAuthority;
    targetTop: number;
    container: HTMLElement;
    anchorTick?: number | null;
}) {
    if (!isRendererDebugEnabled()) return;
    const { reason, phase, authority, targetTop, container, anchorTick } = params;
    console.log('[page-scroll-authority-result]', {
        reason,
        phase,
        anchorTick: anchorTick ?? null,
        targetTop,
        authority: describeScrollAuthority(authority),
        actualAuthorityScrollTop: getPageAuthorityScrollTop(authority),
        containerScrollTop: container.scrollTop,
        containerIsScrollable: container.scrollHeight > container.clientHeight + 5,
        containerRectY: Math.round(container.getBoundingClientRect().y),
        visualViewportH: window.visualViewport?.height ?? null,
        innerHeight: window.innerHeight,
    });
}

function computePageAuthorityTargetTop(params: {
    authority: PageScrollAuthority;
    container: HTMLElement;
    targetRect: DOMRect;
    desiredViewportY: number;
}): number {
    const { authority, container, targetRect, desiredViewportY } = params;
    const currentAuthorityTop = getPageAuthorityScrollTop(authority);
    if (container.scrollHeight > container.clientHeight + 5) {
        const containerRect = container.getBoundingClientRect();
        return container.scrollTop + (targetRect.top - containerRect.top) - desiredViewportY;
    }
    if (authority.kind === 'element') {
        const authorityRect = authority.scrollEl.getBoundingClientRect();
        return currentAuthorityTop + (targetRect.top - authorityRect.top) - desiredViewportY;
    }
    return currentAuthorityTop + targetRect.top - desiredViewportY;
}
// ── END scroll authority helpers ──────────────────────────────────────────────

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

    // [RotationAnchorFreeze] V135: one-shot pre-rotation anchor gate.
    const rotationGateActiveRef = useRef<boolean>(false);
    const preRotationAnchorTickRef = useRef<number | null>(null);
    const lastOrientationModeRef = useRef<'page' | 'landscape' | null>(null);
    // [RotationStableAnchorRef] V136: proactive memory of the last trusted anchor tick,
    // updated only from stable/accepted sources (never from settling/rotation drift).
    const lastStableRotationAnchorTickRef = useRef<number | null>(null);
    // [DeferredLandscapeMismatchRecovery] V139: one-shot deferred recovery state.
    const pendingLandscapeMismatchRecoveryRef = useRef<number | null>(null);
    const landscapeMismatchRecoveryAttemptsRef = useRef<number>(0);

    // [RotationAnchorFreeze / RotationStableAnchorRef] Returns the best tick for rotation anchoring.
    // Priority: frozen pre-rotation tick (gate active) → last stable anchor → intentional → landscapeState → api.tickPosition
    const getRotationAnchorTick = useCallback((api: any): number => {
        // Resolve candidate from the priority chain.
        let candidateTick: number;
        if (rotationGateActiveRef.current && preRotationAnchorTickRef.current != null) {
            candidateTick = preRotationAnchorTickRef.current;
        } else if (lastStableRotationAnchorTickRef.current != null) {
            candidateTick = lastStableRotationAnchorTickRef.current;
        } else {
            const intentional = getIntentionalTick();
            if (intentional != null) {
                candidateTick = intentional;
            } else {
                const landscapeState = landscapeScrollStateRef.current;
                if (landscapeState?.lastTick != null) candidateTick = landscapeState.lastTick;
                else if (landscapeState?.beatStart != null) candidateTick = landscapeState.beatStart;
                else candidateTick = (api as any)?.tickPosition ?? 0;
            }
        }
        // [StaleStartAnchorOverride] V145: when stopped/paused and api.tickPosition is
        // near song start but the candidate is a stale mid-song anchor, prefer the actual
        // API tick. Targets the observed stale-1921-vs-real-3 regression.
        const _apiTick = Number((api as any)?.tickPosition ?? 0);
        const _playerState = Number((api as any)?.playerState ?? -1);
        const _intentionalTick = getIntentionalTick();
        const _isStoppedOrPaused = _playerState === 0 || !isPlayingRef.current;
        const _apiNearSongStart = Number.isFinite(_apiTick) && _apiTick >= 0 && _apiTick <= 24;
        const _candidateFarAhead =
            Number.isFinite(candidateTick) &&
            candidateTick > 960 &&
            (candidateTick - _apiTick) > 480;
        const _noFreshIntentionalTick =
            typeof _intentionalTick !== 'number' ||
            Math.abs(_intentionalTick - _apiTick) > 480;
        if (
            _isStoppedOrPaused &&
            _apiNearSongStart &&
            _candidateFarAhead &&
            _noFreshIntentionalTick &&
            !loopEnabledRef.current &&
            !(api?.playbackRange)
        ) {
            // [SongEndHoldGuard] V145.3: if the candidate and both anchor refs are all
            // deep in the song (> 10000) while api is near start and stopped, this is a
            // post-song-end-hold rotation. Preserve the deep anchor.
            const _preRotationDeep =
                Number.isFinite(preRotationAnchorTickRef.current) &&
                (preRotationAnchorTickRef.current ?? 0) > 10000;
            const _lastStableDeep =
                Number.isFinite(lastStableRotationAnchorTickRef.current) &&
                (lastStableRotationAnchorTickRef.current ?? 0) > 10000;
            const _candidateDeep = Number.isFinite(candidateTick) && candidateTick > 10000;
            const _looksLikeSongEndHold = _candidateDeep && (_preRotationDeep || _lastStableDeep);
            if (_looksLikeSongEndHold) {
                preRotationAnchorTickRef.current = candidateTick;
                lastStableRotationAnchorTickRef.current = candidateTick;
                console.warn('[song-end-hold-rotation-preserve]', {
                    reason: 'skip-stale-start-override-for-song-end-hold',
                    callSite: 'getRotationAnchorTick',
                    apiTickPosition: _apiTick,
                    playerState: _playerState,
                    isPlayingRef: isPlayingRef.current,
                    candidateTick,
                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                    loopEnabled: loopEnabledRef.current,
                    playbackRange: api?.playbackRange ?? null,
                });
            } else {
                if (isRendererDebugEnabled()) {
                    console.warn('[rotation-anchor-start-override]', {
                        reason: 'stale-start-anchor-overridden',
                        candidateTick,
                        apiTickPosition: _apiTick,
                        playerState: _playerState,
                        isPlayingRef: isPlayingRef.current,
                        intentionalTick: _intentionalTick,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        landscapeScrollState: landscapeScrollStateRef.current,
                    });
                }
                preRotationAnchorTickRef.current = _apiTick;
                lastStableRotationAnchorTickRef.current = _apiTick;
                candidateTick = _apiTick;
            }
        }
        return candidateTick;
    }, []);

    // [RotationStableAnchorRef] Records a trusted anchor tick from stable sources only.
    // Must not be called during settling or from passive AlphaTab drift.
    const setLastStableRotationAnchorTick = useCallback((tick: number | null | undefined, source: string) => {
        if (typeof tick !== 'number' || !Number.isFinite(tick) || tick <= 0) return;
        // [StableAnchorPoisonGuard] Reject tick <= 1 if a larger known-good anchor or intentional tick exists.
        const existing = lastStableRotationAnchorTickRef.current;
        const intentional = getIntentionalTick?.() ?? null;
        const manualIntentional =
            typeof window !== 'undefined'
                ? ((window as any).__maestroLastIntentionalTick ?? null)
                : null;
        const isBeginningPoison =
            tick <= 1 &&
            (
                (existing != null && existing > 1) ||
                (intentional != null && intentional > 1) ||
                (manualIntentional != null && manualIntentional > 1)
            );
        if (isBeginningPoison) {
            if (LANDSCAPE_LOOP_DEBUG) {
                console.warn('[rotation-stable-anchor]', {
                    reason: 'stable-anchor-poison-rejected',
                    source,
                    rejectedTick: tick,
                    existingStableTick: existing,
                    intentionalTick: intentional,
                    manualIntentionalTick: manualIntentional,
                    apiTickPosition: apiRef.current?.tickPosition ?? null,
                    rotationGateActive: rotationGateActiveRef.current,
                    isSettling: isSettlingRef.current,
                });
            }
            return;
        }
        // [TickOneSnapGuard] Reject tick <= 1 from snap sources while rotation or settling is active.
        const isRotationOrSettling = rotationGateActiveRef.current || isSettlingRef.current;
        const isSnapSource =
            source === 'snapPortraitToBeatRow-success' ||
            source === 'primeLandscapeState-success';
        if (tick <= 1 && isSnapSource && isRotationOrSettling) {
            if (LANDSCAPE_LOOP_DEBUG) {
                console.warn('[rotation-stable-anchor]', {
                    reason: 'stable-anchor-tick-one-snap-rejected-during-rotation',
                    source,
                    rejectedTick: tick,
                    existingStableTick: lastStableRotationAnchorTickRef.current,
                    intentionalTick: getIntentionalTick(),
                    manualIntentionalTick:
                        typeof window !== 'undefined' ? ((window as any).__maestroLastIntentionalTick ?? null) : null,
                    apiTickPosition: apiRef.current?.tickPosition ?? null,
                    rotationGateActive: rotationGateActiveRef.current,
                    isSettling: isSettlingRef.current,
                });
            }
            return;
        }
        // [LowTickAnchorPoisonGuard] V143.3: Reject early-song ticks that would overwrite a
        // far-later valid anchor. Guards against e.g. tick 1921 replacing anchor 487683.
        const _apiTick = (apiRef.current as any)?.tickPosition ?? null;
        const _isLowTickPoison =
            tick < 5000 &&
            typeof _apiTick === 'number' &&
            _apiTick > 10000 &&
            (_apiTick - tick) > 10000;
        if (_isLowTickPoison) {
            console.warn('[rotation-stable-anchor] low-tick-anchor-poison-rejected', {
                source,
                candidateTick: tick,
                apiTickPosition: _apiTick,
                existingStableTick: lastStableRotationAnchorTickRef.current ?? null,
                reason: 'candidate-low-but-api-far-later',
            });
            return;
        }
        // [FutureTickAnchorPoisonGuard] V144.2: Reject candidates far ahead of the live API
        // tick outside rotation/settling. Guards against e.g. 489600 replacing 486723.
        const _futureGap = typeof _apiTick === 'number' ? tick - _apiTick : 0;
        const _futureTickPoison =
            typeof _apiTick === 'number' &&
            _apiTick > 10000 &&
            tick > 10000 &&
            _futureGap > 960 &&
            !rotationGateActiveRef.current &&
            !isSettlingRef.current;
        if (_futureTickPoison) {
            // [ExistingFutureAnchorRepair] V144.3: if the existing stable anchor is also
            // far ahead of api.tickPosition, repair it now rather than leaving a bad anchor.
            const _existingStable = lastStableRotationAnchorTickRef.current;
            const _existingFutureGap =
                typeof _existingStable === 'number' && typeof _apiTick === 'number'
                    ? _existingStable - _apiTick
                    : 0;
            if (
                typeof _existingStable === 'number' &&
                _apiTick > 10000 &&
                _existingStable > 10000 &&
                _existingFutureGap > 960 &&
                !rotationGateActiveRef.current &&
                !isSettlingRef.current
            ) {
                lastStableRotationAnchorTickRef.current = _apiTick;
                console.warn('[rotation-stable-anchor] existing-future-anchor-repaired', {
                    source,
                    oldStableTick: _existingStable,
                    repairedToTick: _apiTick,
                    apiTickPosition: _apiTick,
                    existingFutureGap: _existingFutureGap,
                    reason: 'existing-stable-far-ahead-of-api',
                });
            }
            console.warn('[rotation-stable-anchor] future-tick-anchor-poison-rejected', {
                source,
                candidateTick: tick,
                apiTickPosition: _apiTick,
                futureGap: _futureGap,
                existingStableTick: lastStableRotationAnchorTickRef.current ?? null,
                reason: 'candidate-far-ahead-of-api',
            });
            return;
        }
        lastStableRotationAnchorTickRef.current = tick;
        if (LANDSCAPE_LOOP_DEBUG && shouldLogDiagnostic('rotation-stable-anchor-updated', tick, 1000, 480)) {
            console.log('[rotation-stable-anchor]', {
                reason: 'stable-anchor-updated',
                source,
                tick,
                apiTickPosition: apiRef.current?.tickPosition ?? null,
                rotationGateActive: rotationGateActiveRef.current,
                isSettling: isSettlingRef.current,
            });
        }
    }, []);

    // [LandscapeNoiseGuardLogThrottle] V144.1: log at most once per 120-tick or 500ms window per reason.
    const shouldLogLandscapeNoiseGuard = useCallback((reason: string, tickRaw: number) => {
        const now = performance.now();
        const prev = lastLandscapeNoiseGuardLogRef.current[reason];
        if (!prev) {
            lastLandscapeNoiseGuardLogRef.current[reason] = { tick: tickRaw, time: now, count: 1 };
            return true;
        }
        prev.count += 1;
        const tickDelta = Math.abs(tickRaw - prev.tick);
        const timeDelta = now - prev.time;
        if (tickDelta >= 120 || timeDelta >= 500) {
            prev.tick = tickRaw;
            prev.time = now;
            return true;
        }
        return false;
    }, []);

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
    const playStartHardSnapInFlightRef = useRef(false);
    const playStartHardSnapArmedAtRef = useRef<number | null>(null);
    const playStartHardSnapFallbackTimerRef = useRef<number | null>(null);
    const playStartHardSnapAlreadyArmedRef = useRef(false);
    const resumeTickGateUntilRef = useRef<number>(0);
    const resumeTickGateAnchorRef = useRef<number | null>(null);
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
    const lastPlaybackOwnerRef = useRef<{ mbIdx: number; occurrence: number | null } | null>(null);
    const stableCurBeatRef = useRef<any>(null);
    const stableExpandedBeatStartRef = useRef<number>(0);
    const publishCursorAtTickRef = useRef<((tick: number) => void) | null>(null);
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
    const lastLoggedExpandedStartRef = useRef<number>(-1);
    const lastGoodLandscapeVisualDeltaXRef = useRef<number>(37);
    // [LandscapeNoiseGuardLogThrottle] V144.1: per-reason log throttle state.
    const lastLandscapeNoiseGuardLogRef = useRef<Record<string, { tick: number; time: number; count: number }>>({});
    // [DiagnosticLogThrottle] V144.5: per-label throttle state for high-frequency debug logs.
    const lastDiagnosticLogRef = useRef<Record<string, { time: number; tick: number; count: number }>>({});
    const shouldLogDiagnostic = useCallback((label: string, tick?: number | null, minMs = 750, minTickDelta = 240): boolean => {
        const now = performance.now();
        const safeTick = typeof tick === 'number' ? tick : -1;
        const prev = lastDiagnosticLogRef.current[label];
        if (!prev) {
            lastDiagnosticLogRef.current[label] = { time: now, tick: safeTick, count: 1 };
            return true;
        }
        prev.count += 1;
        const timeDelta = now - prev.time;
        const tickDelta = safeTick >= 0 && prev.tick >= 0 ? Math.abs(safeTick - prev.tick) : 0;
        if (timeDelta >= minMs || tickDelta >= minTickDelta) {
            prev.time = now;
            prev.tick = safeTick;
            return true;
        }
        return false;
    }, []);
    const loopWrapInProgressRef = useRef<boolean>(false);
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
                if (isRendererDebugEnabled() && shouldLogDiagnostic('landscape-visual-loop-sync', liveTick)) {
                    console.log('[landscape-visual-loop-sync]', {
                        reason: 'raf-read',
                        liveTick,
                        playerState: (api as any)?.playerState ?? null,
                        playbackRange: api?.playbackRange ?? null,
                        stateBeatStart: state?.beatStart ?? null,
                        stateBeatDur: state?.beatDur ?? null,
                        stateLastTick: state?.lastTick ?? null,
                        curBeatX: state?.curBeatX ?? null,
                        nextBeatX: state?.nextBeatX ?? null,
                        rawProgress: (liveTick - state.beatStart) / state.beatDur,
                        clampedProgress: progress,
                        interpolatedX,
                        targetScrollLeft: targetScrollLeftRef.current,
                        currentScrollLeft: container.scrollLeft,
                    });
                }
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
    }, [shouldLogDiagnostic]);

    const stopLandscapeScrollLoop = useCallback(() => {
        if (landscapeScrollRafRef.current !== null) {
            cancelAnimationFrame(landscapeScrollRafRef.current);
            landscapeScrollRafRef.current = null;
            if (typeof window !== 'undefined') (window as any).__maestroLandscapeRaf = null;
        }
    }, []);

    // [page-scroll-authority-probe] Walks DOM ancestors to identify the true vertical scroll parent.
    // Plain function — reads only DOM/window, no refs, no useCallback needed.
    function getScrollParentProbe(el: HTMLElement | null) {
        const chain: Array<Record<string, unknown>> = [];
        let n: HTMLElement | null = el;
        while (n && chain.length < 10) {
            const cs = window.getComputedStyle(n);
            chain.push({
                tag: n.tagName,
                className: String(n.className || ''),
                id: n.id || '',
                scrollTop: n.scrollTop,
                clientH: n.clientHeight,
                scrollH: n.scrollHeight,
                canScrollY: n.scrollHeight > n.clientHeight + 5,
                overflowY: cs.overflowY,
                rectY: Math.round(n.getBoundingClientRect().y),
                rectH: Math.round(n.getBoundingClientRect().height),
            });
            n = n.parentElement;
        }
        return {
            windowScrollY: window.scrollY,
            docScrollTop: document.documentElement.scrollTop,
            bodyScrollTop: document.body?.scrollTop,
            chain,
        };
    }

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
        if (!MAESTRO_USE_S1_CUSTOM_SCROLL) return;

        if (isRendererDebugEnabled()) {
            const _c = containerRef.current;
            console.log('[page-scroll-authority-probe]', {
                reason: 'snapPortraitToBeatRow',
                anchorTick: beat?.absolutePlaybackStart ?? api?.tickPosition,
                apiTickPosition: api?.tickPosition,
                containerScrollTop: _c?.scrollTop ?? null,
                containerClientH: _c?.clientHeight ?? null,
                containerScrollH: _c?.scrollHeight ?? null,
                containerRectY: _c ? Math.round(_c.getBoundingClientRect().y) : null,
                trueScrollTop: _c
                    ? (_c.scrollHeight === _c.clientHeight
                        ? window.scrollY || document.documentElement.scrollTop || document.body?.scrollTop || 0
                        : _c.scrollTop)
                    : null,
                outerBoundingY: _c ? _c.getBoundingClientRect().y : null,
                containerIsScrollable: _c ? _c.scrollHeight > _c.clientHeight + 5 : null,
                trueScroll: _c ? getScrollParentProbe(_c) : null,
            });
        }

        const snapBounds = api.renderer?.boundsLookup;
        const snapSystems = snapBounds?.staffSystems ?? [];
        const snapBb = snapBounds?.findBeat?.(beat);
        const beatY = snapBb?.visualBounds?.y;
        if (beatY == null || snapSystems.length === 0) return;

        const sysIdx = findSystemIndexForY(snapSystems, beatY);
        if (sysIdx < 0) return;
        // Always update lastAnchorSysRef — prevents next playerPositionChanged from
        // double-firing or skipping the snap for the same row.
        lastAnchorSysRef.current = sysIdx;

        const scrollEl = (api.settings.player as any).scrollElement
            ?? scrollContainer
            ?? containerRef.current;
        if (!scrollEl) return;

        const scrollElEl = scrollEl as HTMLElement;
        const header = document.querySelector('[data-top-menu-tray]') as HTMLElement | null;
        const GAP = 8;
        const maxScroll = Math.max(0, scrollElEl.scrollHeight - scrollElEl.clientHeight);
        const scrollRect = scrollElEl.getBoundingClientRect();
        const headerRect = header?.getBoundingClientRect() ?? null;
        const trayBottomInScroll = headerRect ? headerRect.bottom - scrollRect.top : 0;
        const headerH = Math.max(0, trayBottomInScroll);

        const allSvgs = Array.from(scrollElEl.querySelectorAll<SVGElement>('.at-surface svg'));
        const staffRows = allSvgs.filter(el => {
            const r = el.getBoundingClientRect();
            return r.height > 100 && r.width > 500;
        });

        // [S1-ActiveRow] Comfort-zone target: place active row headerH + COMFORT_Y below scroll top.
        const activeRowRect = staffRows[sysIdx]?.getBoundingClientRect() ?? null;
        const anchorRowRect: DOMRect | null = activeRowRect; // [PageScrollAuthorityFix] V143: saved for authority tween
        let clearanceAdjust = 0; // [PageScrollAuthorityFix] V143: tracked for authority tween
        let target: number;
        if (sysIdx === 0) {
            target = 0;
        } else if (activeRowRect) {
            const activeRowViewportTop = activeRowRect.top - scrollRect.top;
            target = Math.max(0, scrollElEl.scrollTop + activeRowViewportTop - headerH - S1_ACTIVE_ROW_COMFORT_Y);
        } else {
            const activeVb = (snapSystems[sysIdx] as any)?.visualBounds;
            target = Math.max(0, (activeVb?.y ?? 0) - headerH - S1_ACTIVE_ROW_COMFORT_Y);
        }

        // Previous-row clearance — same absolute-coordinate prediction as S1
        {
            const safeOffset = headerH + GAP;
            const prevRow = sysIdx > 0 ? (staffRows[sysIdx - 1] ?? null) : null;
            if (prevRow) {
                const prevRect = prevRow.getBoundingClientRect();
                const prevBottomAbs = scrollElEl.scrollTop + (prevRect.bottom - scrollRect.top);
                const safeTopAbsAfterTarget = target + safeOffset;
                const danglingAfterTarget = prevBottomAbs - safeTopAbsAfterTarget;
                if (danglingAfterTarget > 0.5) {
                    clearanceAdjust = danglingAfterTarget + 3; // [PageScrollAuthorityFix]
                    target = Math.max(0, target + clearanceAdjust);
                }
            }
        }

        target = Math.min(target, maxScroll);

        if (s1AnimRafRef.current !== null) {
            cancelAnimationFrame(s1AnimRafRef.current);
            s1AnimRafRef.current = null;
        }

        // [PageScrollAuthorityFix] V143: detect real scroll authority when container is full-height.
        const _snapAuthority = getPageScrollAuthority(scrollElEl);
        const _snapContainerScrollable = scrollElEl.scrollHeight > scrollElEl.clientHeight + 5;
        const tweenFrom = _snapContainerScrollable
            ? scrollElEl.scrollTop
            : getPageAuthorityScrollTop(_snapAuthority);
        let tweenTo = target;
        if (!_snapContainerScrollable && _snapAuthority.canScroll) {
            if (sysIdx === 0) {
                tweenTo = 0;
            } else if (anchorRowRect !== null) {
                tweenTo = Math.max(
                    0,
                    computePageAuthorityTargetTop({
                        authority: _snapAuthority,
                        container: scrollElEl,
                        targetRect: anchorRowRect,
                        desiredViewportY: headerH + S1_ACTIVE_ROW_COMFORT_Y,
                    }) + clearanceAdjust
                );
            }
        }
        if (isRendererDebugEnabled()) {
            console.log('[page-scroll-authority-apply]', {
                reason: 'snapPortraitToBeatRow',
                anchorTick: beat?.absolutePlaybackStart ?? apiRef.current?.tickPosition,
                targetTop: tweenTo,
                authorityKind: _snapAuthority.kind,
                beforeScrollTop: tweenFrom,
                containerScrollTop: scrollElEl.scrollTop,
                containerIsScrollable: _snapContainerScrollable,
                containerRectY: Math.round(scrollElEl.getBoundingClientRect().y),
                targetRectY: anchorRowRect !== null ? Math.round(anchorRowRect.top) : null,
                desiredViewportY: headerH + S1_ACTIVE_ROW_COMFORT_Y,
            });
        }
        const tweenDelta = tweenTo - tweenFrom;
        const TWEEN_MS = 150;
        const snapAnchor = sysIdx;

        if (isRendererDebugEnabled()) {
            // [rotation-anchor-resolution] snapPortraitToBeatRow — resolved scroll target
            console.log('[rotation-anchor-resolution]', {
                reason: 'snapPortraitToBeatRow-snap',
                source: 'snapPortraitToBeatRow',
                requestedTick: (apiRef.current as any)?.tickPosition ?? null,
                resolvedBeatTick: beat?.absolutePlaybackStart ?? null,
                resolvedBeatBarIdx: beat?.voice?.bar?.masterBar?.index ?? null,
                resolvedBeatX: null,
                resolvedBeatY: (snapBb as any)?.visualBounds?.y ?? null,
                containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                containerScrollTop: (scrollElEl as HTMLElement).scrollTop,
                systemsLength: snapSystems.length,
                firstSystemBars: (snapSystems[0] as any)?.bars?.length ?? null,
                sysIdx,
                tweenFrom: Math.round(tweenFrom),
                tweenTo: Math.round(tweenTo),
            });
            // [rotation-anchor-gate-probe] Point 10: before scrollTop snap (snapPortraitToBeatRow)
            console.log('[rotation-anchor-gate-probe]', {
                reason: 'before-scrollTop-snap-snapPortraitToBeatRow',
                rotationGateActive: rotationGateActiveRef.current,
                preRotationAnchorTick: preRotationAnchorTickRef.current,
                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                isLandscape: forceHorizontalRef.current || (apiRef.current?.settings?.display?.layoutMode === 1),
                layoutMode: apiRef.current?.settings?.display?.layoutMode ?? null,
                apiTickPosition: (apiRef.current as any)?.tickPosition ?? null,
                playerState: (apiRef.current as any)?.playerState ?? null,
                isPlayingRef: isPlayingRef.current,
                loopEnabled: loopEnabledRef.current,
                playbackRange: apiRef.current?.playbackRange ?? null,
                intentionalTick: getIntentionalTick(),
                landscapeScrollState: landscapeScrollStateRef.current ?? null,
                containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                containerScrollTop: (scrollElEl as HTMLElement).scrollTop,
                containerClientW: containerRef.current?.clientWidth ?? null,
                containerClientH: containerRef.current?.clientHeight ?? null,
                containerScrollW: containerRef.current?.scrollWidth ?? null,
                containerScrollH: containerRef.current?.scrollHeight ?? null,
                surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                systemsLength: snapSystems.length,
                firstSystemBars: (snapSystems[0] as any)?.bars?.length ?? null,
                snapTarget: Math.round(tweenTo),
            });
        }

        const _snapAnchorTick = beat?.absolutePlaybackStart ?? (apiRef.current as any)?.tickPosition ?? null;

        // [PageScrollResetRecovery] V143.3: re-apply scroll if MAIN.scrollTop is reset by top-padding restore.
        const restorePageScrollIfReset = (phase: string) => {
            const currentTop = _snapContainerScrollable
                ? scrollElEl.scrollTop
                : getPageAuthorityScrollTop(_snapAuthority);
            const shouldRestore =
                !isDeviceLandscape() &&
                tweenTo > 50 &&
                currentTop < 100;
            if (isRendererDebugEnabled()) {
                console.log('[page-scroll-authority-restore]', {
                    reason: 'snapPortraitToBeatRow',
                    phase,
                    anchorTick: beat?.absolutePlaybackStart ?? (apiRef.current as any)?.tickPosition ?? null,
                    targetTop: tweenTo,
                    currentTop,
                    shouldRestore,
                    authorityKind: _snapAuthority.kind,
                    containerScrollTop: scrollElEl.scrollTop,
                    containerIsScrollable: _snapContainerScrollable,
                });
            }
            if (!shouldRestore) return;
            if (_snapContainerScrollable) {
                scrollElEl.scrollTop = tweenTo;
            } else {
                setPageAuthorityScrollTop(_snapAuthority, tweenTo);
            }
            logPageScrollApplyResult({
                reason: 'snapPortraitToBeatRow',
                phase: `${phase}-after-restore`,
                authority: _snapAuthority,
                targetTop: tweenTo,
                container: scrollElEl,
                anchorTick: beat?.absolutePlaybackStart ?? (apiRef.current as any)?.tickPosition ?? null,
            });
        };

        if (Math.abs(tweenDelta) < 2) {
            if (_snapContainerScrollable) { scrollElEl.scrollTop = tweenTo; }
            else { setPageAuthorityScrollTop(_snapAuthority, tweenTo); }
            logPageScrollApplyResult({
                reason: 'snapPortraitToBeatRow',
                phase: 'immediate-after-write',
                authority: _snapAuthority,
                targetTop: tweenTo,
                container: scrollElEl,
                anchorTick: _snapAnchorTick,
            });
            window.setTimeout(() => {
                logPageScrollApplyResult({
                    reason: 'snapPortraitToBeatRow',
                    phase: 'after-250ms',
                    authority: _snapAuthority,
                    targetTop: tweenTo,
                    container: scrollElEl,
                    anchorTick: _snapAnchorTick,
                });
                restorePageScrollIfReset('after-250ms-reset-check');
            }, 250);
            window.setTimeout(() => {
                logPageScrollApplyResult({
                    reason: 'snapPortraitToBeatRow',
                    phase: 'after-750ms',
                    authority: _snapAuthority,
                    targetTop: tweenTo,
                    container: scrollElEl,
                    anchorTick: _snapAnchorTick,
                });
                restorePageScrollIfReset('after-750ms-reset-check');
            }, 750);
        } else {
            const startTime = performance.now();
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const step = (now: number) => {
                if (lastAnchorSysRef.current !== snapAnchor) return;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / TWEEN_MS, 1);
                const _nextTop = tweenFrom + tweenDelta * easeOutCubic(progress);
                if (_snapContainerScrollable) { scrollElEl.scrollTop = _nextTop; }
                else { setPageAuthorityScrollTop(_snapAuthority, _nextTop); }
                if (progress < 1) {
                    s1AnimRafRef.current = requestAnimationFrame(step);
                } else {
                    if (_snapContainerScrollable) { scrollElEl.scrollTop = tweenTo; }
                    else { setPageAuthorityScrollTop(_snapAuthority, tweenTo); }
                    logPageScrollApplyResult({
                        reason: 'snapPortraitToBeatRow',
                        phase: 'tween-final-after-write',
                        authority: _snapAuthority,
                        targetTop: tweenTo,
                        container: scrollElEl,
                        anchorTick: _snapAnchorTick,
                    });
                    s1AnimRafRef.current = null;
                }
            };
            s1AnimRafRef.current = requestAnimationFrame(step);
            window.setTimeout(() => {
                logPageScrollApplyResult({
                    reason: 'snapPortraitToBeatRow',
                    phase: 'after-250ms',
                    authority: _snapAuthority,
                    targetTop: tweenTo,
                    container: scrollElEl,
                    anchorTick: _snapAnchorTick,
                });
                restorePageScrollIfReset('after-250ms-reset-check');
            }, 250);
            window.setTimeout(() => {
                logPageScrollApplyResult({
                    reason: 'snapPortraitToBeatRow',
                    phase: 'after-750ms',
                    authority: _snapAuthority,
                    targetTop: tweenTo,
                    container: scrollElEl,
                    anchorTick: _snapAnchorTick,
                });
                restorePageScrollIfReset('after-750ms-reset-check');
            }, 750);
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
        const stuckPageLayoutInLandscape =
            wantStrip &&
            isDeviceLandscape() &&
            forceHorizontalRef.current &&
            firstBars != null &&
            firstBars <= 2 &&
            surfaceW <= containerW * 2;
        return {
            stuck: (!wantStrip && (firstBars > 40 || surfaceW > containerW * 3)) || stuckPageLayoutInLandscape,
            stuckPageLayoutInLandscape,
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

    // [LandscapePageMismatchRecovery] Helpers to detect viewport/layout desync.
    const isLandscapeViewport = (): boolean => {
        if (typeof window === 'undefined') return false;
        const vv = window.visualViewport;
        const w = vv?.width ?? window.innerWidth;
        const h = vv?.height ?? window.innerHeight;
        return w > h;
    };
    const isAlphaTabPageLayoutWhileLandscape = (api: any): boolean => {
        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        const firstBars = systems?.[0]?.bars?.length ?? null;
        const layoutMode = api?.settings?.display?.layoutMode ?? null;
        const scrollMode = api?.settings?.player?.scrollMode ?? null;
        return (
            isLandscapeViewport() &&
            layoutMode === 0 &&
            scrollMode === 0 &&
            systems.length > 0 &&
            firstBars != null &&
            firstBars <= 2
        );
    };

    // [DeferredLandscapeMismatchRecovery] One-shot debounced recovery scheduled outside renderFinished.
    // isAlphaTabPageLayoutWhileLandscape is a plain helper reading only refs/window — stable, omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const scheduleLandscapeMismatchRecovery = useCallback((source: string, rescueTick: number) => {
        if (pendingLandscapeMismatchRecoveryRef.current != null) return;
        pendingLandscapeMismatchRecoveryRef.current = window.setTimeout(() => {
            pendingLandscapeMismatchRecoveryRef.current = null;
            requestAnimationFrame(() => {
                requestAnimationFrame(async () => {
                    const api = apiRef.current;
                    const at = alphaTabModuleRef.current;
                    if (!api || !at) return;
                    // [V139-MisfireGuard] V143.1: Re-check strip intent at execution time.
                    // The deferred timeout may fire after the user has already rotated to Portrait.
                    const _execIntendedStrip =
                        forceHorizontalRef.current === true &&
                        isDeviceLandscape() === true;
                    if (!_execIntendedStrip) {
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-layout-mismatch]', {
                                reason: 'deferred-landscape-recovery-cancelled-not-strip',
                                forceHorizontal: forceHorizontalRef.current,
                                isDeviceLandscape: isDeviceLandscape(),
                                apiTickPosition: api?.tickPosition ?? null,
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                note: 'device no longer in strip mode at execution time — cancelling',
                            });
                        }
                        return;
                    }
                    if (!isAlphaTabPageLayoutWhileLandscape(api)) return;
                    if (landscapeMismatchRecoveryAttemptsRef.current >= 2) {
                        if (isRendererDebugEnabled()) {
                            console.warn('[rotation-layout-mismatch]', {
                                reason: 'deferred-landscape-recovery-max-attempts',
                                source,
                                rescueTick,
                                attempts: landscapeMismatchRecoveryAttemptsRef.current,
                            });
                        }
                        return;
                    }
                    landscapeMismatchRecoveryAttemptsRef.current += 1;
                    if (rescueTick > 1) {
                        preRotationAnchorTickRef.current = rescueTick;
                        lastStableRotationAnchorTickRef.current = rescueTick;
                    }
                    rotationGateActiveRef.current = true;
                    if (isRendererDebugEnabled()) {
                        console.warn('[rotation-layout-mismatch]', {
                            reason: 'deferred-landscape-layout-reassert',
                            source,
                            rescueTick,
                            attempts: landscapeMismatchRecoveryAttemptsRef.current,
                            apiTickPosition: api?.tickPosition ?? null,
                            layoutMode: api?.settings?.display?.layoutMode ?? null,
                            scrollMode: api?.settings?.player?.scrollMode ?? null,
                            systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                            firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                        });
                    }
                    api.settings.display.layoutMode = (at as any).LayoutMode.Horizontal;
                    api.settings.player.scrollMode = (at as any).ScrollMode.Continuous;
                    await api.updateSettings();
                    api.render();
                    // renderFinished will handle padding via healthyLandscapeStrip; belt-and-suspenders call here.
                    requestAnimationFrame(() => ensureLandscapeTrailingScrollPadding('deferred-landscape-recovery'));
                });
            });
        }, 80);
    }, []); // isAlphaTabPageLayoutWhileLandscape reads only refs/window — all deps stable

    // [LandscapeTrailingScrollPaddingScopeFix] Removes spacer immediately when leaving Landscape.
    const removeLandscapeTrailingPadding = useCallback((reason: string) => {
        const spacer = document.querySelector('.maestro-landscape-scroll-spacer');
        if (spacer?.parentElement) spacer.remove();
        if (isRendererDebugEnabled()) {
            console.log('[landscape-trailing-padding-remove]', { reason });
        }
    }, []);

    // [LandscapeTrailingScrollPadding] Inserts/updates a spacer that expands scrollWidth beyond
    // the AlphaTab surface so late-song measures can scroll under the fixed Landscape cursor.
    const ensureLandscapeTrailingScrollPadding = useCallback((reason: string) => {
        if (typeof document === 'undefined') return;
        const api = apiRef.current;
        const container = document.querySelector('.alphatab-container.alphaTab') as HTMLElement | null;
        const surface = document.querySelector('.at-surface') as HTMLElement | null;
        if (!api || !container || !surface) return;
        // [LandscapeTrailingScrollPaddingScopeFix] Guard: only run in healthy Landscape strip mode.
        const isHorizontal = api?.settings?.display?.layoutMode === 1;
        const viewportIsLandscape = container.clientWidth > container.clientHeight;
        const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
        const firstBars = (systems?.[0] as any)?.bars?.length ?? null;
        const isHealthyStrip =
            (forceHorizontalRef.current || isHorizontal) &&
            viewportIsLandscape &&
            (firstBars == null || firstBars > 2);
        if (!isHealthyStrip) {
            removeLandscapeTrailingPadding('not-healthy-landscape');
            return;
        }
        const surfaceW = surface.scrollWidth || Math.round(surface.getBoundingClientRect().width);
        const containerW = container.clientWidth;
        if (!surfaceW || !containerW || surfaceW <= containerW) return;
        const scrollWBefore = container.scrollWidth;
        const cursor = document.querySelector('.maestro-landscape-cursor') as HTMLElement | null;
        const containerRect = container.getBoundingClientRect();
        const cursorRect = cursor?.getBoundingClientRect();
        const cursorCenterX = cursorRect
            ? Math.round(cursorRect.left + cursorRect.width / 2 - containerRect.left)
            : 182;
        const trailingPad = Math.max(720, Math.round(containerW - cursorCenterX + 96));
        let spacer = container.querySelector('.maestro-landscape-scroll-spacer') as HTMLElement | null;
        if (!spacer) {
            spacer = document.createElement('div');
            spacer.className = 'maestro-landscape-scroll-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            container.appendChild(spacer);
        }
        Object.assign(spacer.style, {
            position: 'absolute',
            left: `${surfaceW}px`,
            top: '0px',
            width: `${trailingPad}px`,
            height: '1px',
            pointerEvents: 'none',
            opacity: '0',
            zIndex: '0',
        });
        if (isRendererDebugEnabled()) {
            console.log('[landscape-trailing-padding-probe]', {
                reason,
                containerW,
                containerH: container.clientHeight,
                surfaceW,
                scrollWBefore,
                scrollWAfter: container.scrollWidth,
                maxScrollLeftBefore: scrollWBefore - containerW,
                maxScrollLeftAfter: container.scrollWidth - containerW,
                cursorCenterX,
                trailingPad,
                layoutMode: api.settings.display.layoutMode,
                forceHorizontal: forceHorizontalRef.current,
            });
        }
    }, [removeLandscapeTrailingPadding]);

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
            if (isRendererDebugEnabled()) {
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
            }

            if (!needsFlip && !looksCollapsed && !stuckHorizontalStrip) return;

            // [RotationStableAnchorRef] Prefer the proactively-recorded stable anchor
            // over any passive source. One-shot guard unchanged from V135.
            const nextAnchorTick =
                (lastStableRotationAnchorTickRef.current != null && lastStableRotationAnchorTickRef.current > 0)
                    ? lastStableRotationAnchorTickRef.current
                    : preRotationAnchorTickRef.current
                    ?? getIntentionalTick()
                    ?? landscapeScrollStateRef.current?.lastTick
                    ?? landscapeScrollStateRef.current?.beatStart
                    ?? ((api as any)?.tickPosition ?? 0);
            if (!rotationGateActiveRef.current || preRotationAnchorTickRef.current == null) {
                preRotationAnchorTickRef.current = nextAnchorTick;
            }
            rotationGateActiveRef.current = true;
            lastOrientationModeRef.current = wantStrip ? 'landscape' : 'page';
            if (isRendererDebugEnabled()) {
                console.log('[rotation-anchor-gate-probe]', {
                    reason: 'orientation-flip-start',
                    rotationGateActive: rotationGateActiveRef.current,
                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                    lastOrientationMode: lastOrientationModeRef.current,
                    isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                    layoutMode: api?.settings?.display?.layoutMode ?? null,
                    apiTickPosition: api?.tickPosition ?? null,
                    playerState: (api as any)?.playerState ?? null,
                    isPlayingRef: isPlayingRef.current,
                    loopEnabled: loopEnabledRef.current,
                    playbackRange: api?.playbackRange ?? null,
                    intentionalTick: getIntentionalTick(),
                    landscapeScrollState: landscapeScrollStateRef.current ?? null,
                    containerScrollLeft: el?.scrollLeft ?? null,
                    containerScrollTop: el?.scrollTop ?? null,
                    containerClientW: el?.clientWidth ?? null,
                    containerClientH: el?.clientHeight ?? null,
                    containerScrollW: el?.scrollWidth ?? null,
                    containerScrollH: el?.scrollHeight ?? null,
                    surfaceW: el?.querySelector('.at-surface')?.scrollWidth ?? null,
                    surfaceH: el?.querySelector('.at-surface')?.scrollHeight ?? null,
                    systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                    firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                });
            }

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
                if (isRendererDebugEnabled()) console.warn('[V117] reassertLayout deferred — width unstable', { w1, w3 });
                return;
            }

            isApplyingProfileRef.current = false;
            if (activeRendersRef.current > 1) activeRendersRef.current = 0;

            if (stuckHorizontalStrip) {
                // ── Strip-stuck recovery ──────────────────────────────────────
                // Destroy landscape artifacts before forcing page mode.
                console.warn('[V117] stuckHorizontalStrip recovery — forcing Page mode');
                removeLandscapeTrailingPadding('stuckHorizontalStrip-page-recovery');
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
                removeLandscapeTrailingPadding('strip-to-page-flip');
                stopLandscapeScrollLoop();
                landscapeScrollStateRef.current = null;
                if (landscapeCursorRef.current) {
                    landscapeCursorRef.current.destroy();
                    landscapeCursorRef.current = null;
                }
            }
        });
    }, [stopLandscapeScrollLoop, checkStuckHorizontalStrip, removeLandscapeTrailingPadding]);

    // ── forceHorizontal transition — pre-clear landscape on strip→page ────────────
    useEffect(() => {
        const previous = forceHorizontalRef.current;
        const next = !!forceHorizontal;
        forceHorizontalRef.current = next;
        if (previous === true && next === false) {
            console.warn('[V117] forceHorizontal strip-to-page preclear');
            // [RotationStableAnchorRef] forceHorizontal flip — same stable-first priority.
            const nextAnchorTickFH =
                (lastStableRotationAnchorTickRef.current != null && lastStableRotationAnchorTickRef.current > 0)
                    ? lastStableRotationAnchorTickRef.current
                    : preRotationAnchorTickRef.current
                    ?? getIntentionalTick()
                    ?? landscapeScrollStateRef.current?.lastTick
                    ?? landscapeScrollStateRef.current?.beatStart
                    ?? ((apiRef.current as any)?.tickPosition ?? 0);
            if (!rotationGateActiveRef.current || preRotationAnchorTickRef.current == null) {
                preRotationAnchorTickRef.current = nextAnchorTickFH;
            }
            rotationGateActiveRef.current = true;
            lastOrientationModeRef.current = 'landscape';
            if (isRendererDebugEnabled()) {
                console.log('[rotation-anchor-gate-probe]', {
                    reason: 'orientation-flip-start-forceHorizontal',
                    rotationGateActive: rotationGateActiveRef.current,
                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                    lastOrientationMode: lastOrientationModeRef.current,
                    isLandscape: true,
                    layoutMode: apiRef.current?.settings?.display?.layoutMode ?? null,
                    apiTickPosition: apiRef.current?.tickPosition ?? null,
                    playerState: (apiRef.current as any)?.playerState ?? null,
                    isPlayingRef: isPlayingRef.current,
                    loopEnabled: loopEnabledRef.current,
                    playbackRange: apiRef.current?.playbackRange ?? null,
                    intentionalTick: getIntentionalTick(),
                    landscapeScrollState: landscapeScrollStateRef.current ?? null,
                    containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                    containerScrollTop: containerRef.current?.scrollTop ?? null,
                    containerClientW: containerRef.current?.clientWidth ?? null,
                    containerClientH: containerRef.current?.clientHeight ?? null,
                    containerScrollW: containerRef.current?.scrollWidth ?? null,
                    containerScrollH: containerRef.current?.scrollHeight ?? null,
                    surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                    surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                    systemsLength: apiRef.current?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                    firstSystemBars: apiRef.current?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                });
            }
            showCurtain(curtainRef.current);
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
                    removeLandscapeTrailingPadding('forceHorizontal-strip-to-page');
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
    }, [forceHorizontal, reassertLayout, stopLandscapeScrollLoop, removeLandscapeTrailingPadding]);

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
        // Never enable Continuous in portrait when S1 owns scroll. [S1-ownership]
        // MAESTRO_USE_S1_CUSTOM_SCROLL=false allows native Continuous in portrait for A/B testing.
        const useMode = (enabled && (isStrip || !MAESTRO_USE_S1_CUSTOM_SCROLL))
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
                // [rotation-anchor-gate-probe] Point 2: renderStarted
                if (isRendererDebugEnabled()) {
                    console.log('[rotation-anchor-gate-probe]', {
                        reason: 'renderStarted',
                        rotationGateActive: rotationGateActiveRef.current,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        lastOrientationMode: lastOrientationModeRef.current,
                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                        apiTickPosition: api?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        intentionalTick: getIntentionalTick(),
                        landscapeScrollState: landscapeScrollStateRef.current ?? null,
                        containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                        containerScrollTop: containerRef.current?.scrollTop ?? null,
                        containerClientW: containerRef.current?.clientWidth ?? null,
                        containerClientH: containerRef.current?.clientHeight ?? null,
                        containerScrollW: containerRef.current?.scrollWidth ?? null,
                        containerScrollH: containerRef.current?.scrollHeight ?? null,
                        surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                        surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                    });
                }
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
                    const attachCursor = MAESTRO_USE_CURSOR3
                        ? () => attachMaestroCursorV3(api, host)
                        : () => attachMaestroCursorV2(api, host);
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
                        // [RotationAnchorFreeze] Prefer frozen pre-rotation tick while gate is active.
                        const tick = getRotationAnchorTick(api);
                        const r = tickCache.findBeat(trackSet, tick);
                        if (!r?.beat) { requestAnimationFrame(step); return; }
                        if (!bounds.findBeat(r.beat)) { requestAnimationFrame(step); return; }
                        // [PagePlayStartSongLoadGuard] Block song-load cursor prime during play-start
                        // handoff. Two conditions:
                        // 1. playStartHardSnapInFlightRef is true — play-start hard snap was armed.
                        // 2. _nearPendingPlayStart — catches the specific observed shape where
                        //    seekTargetTick ≈ lastTickRef while playerState=0 and isSettling=true,
                        //    meaning renderFinished fired after seekTicks but before api.play().
                        {
                            const _playerState = (api as any)?.playerState ?? null;
                            const _seekTarget = seekTargetTickRef.current;
                            const _lastTick = lastTickRef.current;
                            const _playStartArmAge =
                                playStartHardSnapArmedAtRef.current != null
                                    ? performance.now() - playStartHardSnapArmedAtRef.current
                                    : Infinity;
                            const _nearPendingPlayStart =
                                _playStartArmAge < 1500 &&
                                _playerState === 0 &&
                                isSettlingRef.current &&
                                !!cursorRef.current &&
                                _seekTarget != null &&
                                _lastTick != null &&
                                Math.abs(_seekTarget - _lastTick) <= 8;
                            if (playStartHardSnapInFlightRef.current || _nearPendingPlayStart) {
                                if (isRendererDebugEnabled()) {
                                    console.warn('[page-cursor-reset-source]', {
                                        reason: 'blocked-song-load-prime-play-start-handoff',
                                        anchorTick: tick,
                                        beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                        apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                        playerState: _playerState,
                                        isSettling: isSettlingRef.current,
                                        seekTargetTick: _seekTarget,
                                        lastTickRef: _lastTick,
                                        lastStableAnchor: lastStableRotationAnchorTickRef.current,
                                        playStartHardSnapInFlight: playStartHardSnapInFlightRef.current,
                                        playStartArmAge: _playStartArmAge,
                                        nearPendingPlayStart: _nearPendingPlayStart,
                                    });
                                }
                                return resolve(true);
                            }
                        }
                        // [RedundantSettlingPrimeGuard] Block late song-load primes that fire during
                        // layout settling when the cursor is already positioned at the anchor tick.
                        // Prevents the cursor from flying forward on Play when ensureCursorAndAnchorOnce
                        // re-runs after layout settles and redundantly re-primes the same position.
                        {
                            const _playerState = (api as any)?.playerState ?? null;
                            const _seekTarget = seekTargetTickRef.current;
                            const _lastTick = lastTickRef.current;
                            const _lastStable = lastStableRotationAnchorTickRef.current;
                            const _redundantSettlingPrime =
                                !rotationGateActiveRef.current &&
                                _playerState === 0 &&
                                isSettlingRef.current &&
                                !!cursorRef.current &&
                                _lastStable != null &&
                                _lastTick != null &&
                                Math.abs(_lastStable - tick) <= 8 &&
                                Math.abs(_lastTick - tick) <= 8 &&
                                r?.beat?.absolutePlaybackStart != null;
                            if (_redundantSettlingPrime) {
                                if (isRendererDebugEnabled()) {
                                    console.warn('[page-cursor-reset-source]', {
                                        reason: 'blocked-redundant-settling-song-load-prime',
                                        anchorTick: tick,
                                        beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                        apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                        playerState: _playerState,
                                        isSettling: isSettlingRef.current,
                                        seekTargetTick: _seekTarget,
                                        lastTickRef: _lastTick,
                                        lastStableAnchor: _lastStable,
                                        cursorExists: !!cursorRef.current,
                                    });
                                }
                                // Safe paused-cursor repaint: restore cursor visibility without
                                // running the full song-load prime stack (no requestSnap, no snapPortraitToBeatRow).
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        if (renderTokenRef.current !== tok) return;
                                        if (!cursorRef.current) return;
                                        if ((api as any)?.playerState !== 0) return;
                                        if (forceHorizontalRef.current) return;
                                        if (playStartHardSnapInFlightRef.current) return;
                                        {
                                            const _pendingHardSnap = cursorRef.current?.hasPendingHardSnap?.() ?? false;

                                            if (_pendingHardSnap) {
                                                if (isRendererDebugEnabled()) {
                                                    console.warn('[page-cursor-reset-source]', {
                                                        reason: 'skipped-safe-paused-repaint-pending-hard-snap',
                                                        anchorTick: tick,
                                                        beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                                        apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                                        playerState: (api as any)?.playerState ?? null,
                                                        isSettling: isSettlingRef.current,
                                                        lastTickRef: lastTickRef.current,
                                                        seekTargetTick: seekTargetTickRef.current,
                                                        lastStableAnchor: lastStableRotationAnchorTickRef.current,
                                                        hasPendingHardSnap: cursorRef.current?.hasPendingHardSnap?.() ?? null,
                                                    });
                                                }
                                                return;
                                            }
                                        }
                                        try {
                                            const _repaintEs = r.beat?.absolutePlaybackStart ?? tick;
                                            const { nextBeat: _repaintNb, nextStart: _repaintNs } = resolveNextBeatExpanded(api, trackSet, _repaintEs, r.beat);
                                            cursorRef.current.setBeat(r.beat, _repaintNb, _repaintNs ?? null, _repaintEs);
                                            cursorRef.current.setTick(tick);
                                            if (isRendererDebugEnabled()) {
                                                console.warn('[page-cursor-reset-source]', {
                                                    reason: 'safe-paused-cursor-repaint-after-blocked-prime',
                                                    anchorTick: tick,
                                                    beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                                    apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                                    playerState: (api as any)?.playerState ?? null,
                                                    isSettling: isSettlingRef.current,
                                                    lastTickRef: lastTickRef.current,
                                                    lastStableAnchor: lastStableRotationAnchorTickRef.current,
                                                });
                                            }
                                        } catch (err) {
                                            if (isRendererDebugEnabled()) {
                                                console.warn('[page-cursor-reset-source]', {
                                                    reason: 'safe-paused-cursor-repaint-after-blocked-prime-error',
                                                    error: err instanceof Error ? err.message : String(err),
                                                });
                                            }
                                        }
                                    });
                                });
                                return resolve(true);
                            }
                        }
                        if (isRendererDebugEnabled()) {
                            const stack = new Error().stack;
                            console.warn('[page-cursor-reset-source]', {
                                reason: 'about-to-requestSnap-song-load',
                                callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                                anchorTick: tick,
                                beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                beatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                lastTickRef: lastTickRef.current ?? null,
                                lastStableAnchor: lastStableRotationAnchorTickRef.current ?? null,
                                seekTargetTick: seekTargetTickRef.current ?? null,
                                seekFreezeActive: seekFreezeUntilRef.current > Date.now(),
                                loopEnabled: loopEnabledRef.current,
                                isSettling: isSettlingRef.current,
                            });
                        }
                        const _songLoadEs = r.beat?.absolutePlaybackStart ?? tick;
                        const { nextBeat: _songLoadNb, nextStart: _songLoadNs } = resolveNextBeatExpanded(api, trackSet, _songLoadEs, r.beat);
                        cursorRef.current?.requestSnap('song-load');
                        cursorRef.current?.setBeat(r.beat, _songLoadNb, _songLoadNs ?? null, _songLoadEs);
                        cursorRef.current?.setTick(tick);
                        // [rotation-anchor-gate-probe] Point 8: before snapPortraitToBeatRow
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-anchor-gate-probe]', {
                                reason: 'before-snapPortraitToBeatRow',
                                rotationGateActive: rotationGateActiveRef.current,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                apiTickPosition: api?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                isPlayingRef: isPlayingRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                                intentionalTick: getIntentionalTick(),
                                landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                                containerScrollTop: containerRef.current?.scrollTop ?? null,
                                containerClientW: containerRef.current?.clientWidth ?? null,
                                containerClientH: containerRef.current?.clientHeight ?? null,
                                containerScrollW: containerRef.current?.scrollWidth ?? null,
                                containerScrollH: containerRef.current?.scrollHeight ?? null,
                                surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                                surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                                systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                                beatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                                beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                            });
                        }
                        if (isRendererDebugEnabled()) {
                            const _c = containerRef.current;
                            console.log('[page-scroll-authority-probe]', {
                                reason: 'ensureCursorAndAnchorOnce-before-snap',
                                anchorTick: tick,
                                apiTickPosition: api?.tickPosition,
                                containerScrollTop: _c?.scrollTop ?? null,
                                containerClientH: _c?.clientHeight ?? null,
                                containerScrollH: _c?.scrollHeight ?? null,
                                containerRectY: _c ? Math.round(_c.getBoundingClientRect().y) : null,
                                trueScrollTop: _c
                                    ? (_c.scrollHeight === _c.clientHeight
                                        ? window.scrollY || document.documentElement.scrollTop || document.body?.scrollTop || 0
                                        : _c.scrollTop)
                                    : null,
                                outerBoundingY: _c ? _c.getBoundingClientRect().y : null,
                                containerIsScrollable: _c ? _c.scrollHeight > _c.clientHeight + 5 : null,
                                trueScroll: _c ? getScrollParentProbe(_c) : null,
                            });
                        }
                        if (isRendererDebugEnabled()) {
                            const _c = containerRef.current;
                            const _eAuthority = getPageScrollAuthority(_c);
                            console.log('[page-scroll-authority-apply]', {
                                reason: 'ensureCursorAndAnchorOnce',
                                anchorTick: tick,
                                authorityKind: _eAuthority.kind,
                                beforeScrollTop: getPageAuthorityScrollTop(_eAuthority),
                                containerScrollTop: _c?.scrollTop ?? null,
                                containerIsScrollable: _c ? _c.scrollHeight > _c.clientHeight + 5 : null,
                                containerRectY: _c ? Math.round(_c.getBoundingClientRect().y) : null,
                            });
                        }
                        if (isRendererDebugEnabled()) {
                            const stack = new Error().stack;
                            console.warn('[page-cursor-reset-source]', {
                                reason: 'about-to-snapPortraitToBeatRow-song-load-prime',
                                callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                                anchorTick: tick,
                                beatAbsStart: r?.beat?.absolutePlaybackStart ?? null,
                                beatBarIdx: r?.beat?.voice?.bar?.masterBar?.index ?? null,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                lastTickRef: lastTickRef.current ?? null,
                            });
                        }
                        snapPortraitToBeatRow('song-load-prime', r.beat);
                        // [RotationStableAnchorRef] Portrait snap resolved — record as stable anchor.
                        setLastStableRotationAnchorTick(tick, 'snapPortraitToBeatRow-success');
                        // [RotationAnchorFreeze] Portrait snap committed — clear gate so playback
                        // tick tracking resumes normally.
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-anchor-gate-probe]', {
                                reason: 'rotation-gate-cleared',
                                clearedAt: 'ensureCursorAndAnchorOnce',
                                finalTick: tick,
                                apiTickPosition: api?.tickPosition ?? null,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                            });
                        }
                        rotationGateActiveRef.current = false;
                        preRotationAnchorTickRef.current = null;
                        // [rotation-anchor-gate-probe] Point 9: after snapPortraitToBeatRow (tween may still be in progress)
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-anchor-gate-probe]', {
                                reason: 'after-snapPortraitToBeatRow',
                                rotationGateActive: rotationGateActiveRef.current,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                apiTickPosition: api?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                isPlayingRef: isPlayingRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                                intentionalTick: getIntentionalTick(),
                                landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                                containerScrollTop: containerRef.current?.scrollTop ?? null,
                                containerClientW: containerRef.current?.clientWidth ?? null,
                                containerClientH: containerRef.current?.clientHeight ?? null,
                                containerScrollW: containerRef.current?.scrollWidth ?? null,
                                containerScrollH: containerRef.current?.scrollHeight ?? null,
                                surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                                surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                                systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                            });
                        }
                        resolve(true);
                    };
                    requestAnimationFrame(step);
                });

            const primeLandscapeState = (ctr: HTMLElement) => {
                if (loopWrapInProgressRef.current) {
                    if (isRendererDebugEnabled()) console.log(
                        '[landscape-loop-wrap-visual-snap]',
                        { reason: 'primeLandscapeState-blocked-during-wrap' }
                    );
                    return;
                }
                const tickCache = (api as any).tickCache;
                const bounds = api?.renderer?.boundsLookup;
                if (!tickCache?.findBeat || !bounds?.findBeat) return;
                const trackSet = getTrackSet(api);
                // [LandscapePlaybackAnchorScope] Use live api.tickPosition while playing.
                // [RotationAnchorFreeze] While paused/stopped, prefer the frozen pre-rotation
                // anchor tick so rotation cannot degrade to AlphaTab's bar-start tick.
                const isActivelyPlaying = isPlayingRef.current || (api as any)?.playerState === 1;
                const tick = isActivelyPlaying
                    ? ((api as any)?.tickPosition ?? 0)
                    : getRotationAnchorTick(api);
                // [PrimeLandscapeStableAnchorScrollRepair] V144.6: If candidate tick is stale
                // (far from stable anchor / api.tickPosition while not playing), use the
                // stable/API anchor for visual scroll priming. This prevents Landscape from
                // scrolling to stale end-of-song position after user repositions Page cursor.
                const _primeCandidateTick = tick;
                const _primeApiTick = typeof (api as any)?.tickPosition === 'number'
                    ? (api as any).tickPosition : null;
                const _primeStableTick = lastStableRotationAnchorTickRef.current ?? null;
                const _primeAnchorTick =
                    typeof _primeStableTick === 'number' && _primeStableTick > 0
                        ? _primeStableTick
                        : typeof _primeApiTick === 'number' && _primeApiTick > 0
                            ? _primeApiTick
                            : null;
                const _primeCandidateGap =
                    typeof _primeAnchorTick === 'number'
                        ? Math.abs(_primeCandidateTick - _primeAnchorTick)
                        : 0;
                const _shouldReprimeLandscapeScroll =
                    typeof _primeAnchorTick === 'number' &&
                    _primeCandidateTick > 10000 &&
                    _primeAnchorTick > 10000 &&
                    _primeCandidateGap > 960 &&
                    !isPlayingRef.current &&
                    ((api as any)?.playerState ?? 0) === 0 &&
                    !(api?.playbackRange) &&
                    !loopEnabledRef.current;
                let primeScrollTick = _shouldReprimeLandscapeScroll
                    ? _primeAnchorTick
                    : _primeCandidateTick;
                if (_shouldReprimeLandscapeScroll && isRendererDebugEnabled()) {
                    console.warn('[primeLandscapeState-anchor-repair]', {
                        reason: 'using-stable-anchor-for-prime-scroll',
                        candidateTick: _primeCandidateTick,
                        primeScrollTick,
                        apiTickPosition: _primeApiTick,
                        lastStableRotationAnchorTick: _primeStableTick,
                        candidateVsAnchorGap: _primeCandidateGap,
                        playerState: (api as any)?.playerState ?? null,
                        playbackRange: api?.playbackRange ?? null,
                        loopEnabled: loopEnabledRef.current,
                    });
                }
                // [PrimeLandscapeStartOverride] V145.1: if API/player truth is near song
                // start while stopped/paused, prevent stale preRotation/intentional ticks
                // from priming Landscape mid-M1. Runs after V144.6 repair so it takes
                // precedence over any stale anchor that repair may have selected.
                {
                    const _apiTick = Number((api as any)?.tickPosition ?? 0);
                    const _playerState = Number((api as any)?.playerState ?? -1);
                    const _intentionalTick = getIntentionalTick?.() ?? null;
                    const _isStoppedOrPaused = _playerState === 0 || isPlayingRef.current === false;
                    const _apiNearSongStart = Number.isFinite(_apiTick) && _apiTick >= 0 && _apiTick <= 24;
                    const _primeFarAhead =
                        Number.isFinite(primeScrollTick) &&
                        primeScrollTick > 480 &&
                        (primeScrollTick - _apiTick) > 240;
                    // An intentional tick near start CONFIRMS API truth; it must not protect
                    // a stale preRotationAnchorTick like 961.
                    const _intentionalNearStart =
                        typeof _intentionalTick === 'number' &&
                        _intentionalTick >= 0 &&
                        _intentionalTick <= 24;
                    const _intentionalMatchesApi =
                        typeof _intentionalTick !== 'number' ||
                        Math.abs(_intentionalTick - _apiTick) <= 24;
                    if (
                        _isStoppedOrPaused &&
                        _apiNearSongStart &&
                        _primeFarAhead &&
                        (_intentionalNearStart || _intentionalMatchesApi) &&
                        !loopEnabledRef.current &&
                        !(api?.playbackRange)
                    ) {
                        // [SongEndHoldGuard] V145.3: if primeScrollTick and the anchor refs
                        // are all deep in the song (> 10000) while api is near start, this is
                        // a post-song-end-hold rotation. Preserve the deep anchor.
                        const _preRotationDeep =
                            Number.isFinite(preRotationAnchorTickRef.current) &&
                            (preRotationAnchorTickRef.current ?? 0) > 10000;
                        const _lastStableDeep =
                            Number.isFinite(lastStableRotationAnchorTickRef.current) &&
                            (lastStableRotationAnchorTickRef.current ?? 0) > 10000;
                        const _primeDeep =
                            Number.isFinite(primeScrollTick) && primeScrollTick > 10000;
                        const _looksLikeSongEndHold =
                            _primeDeep && (_preRotationDeep || _lastStableDeep);
                        if (_looksLikeSongEndHold) {
                            preRotationAnchorTickRef.current = primeScrollTick;
                            lastStableRotationAnchorTickRef.current = primeScrollTick;
                            console.warn('[song-end-hold-rotation-preserve]', {
                                reason: 'skip-stale-start-override-for-song-end-hold',
                                callSite: 'primeLandscapeState',
                                apiTickPosition: _apiTick,
                                playerState: _playerState,
                                isPlayingRef: isPlayingRef.current,
                                candidateTick: primeScrollTick,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                            });
                        } else {
                            if (isRendererDebugEnabled()) {
                                console.warn('[primeLandscapeState-start-override]', {
                                    reason: 'stale-prime-scroll-tick-overridden',
                                    primeScrollTickBefore: primeScrollTick,
                                    apiTickPosition: _apiTick,
                                    playerState: _playerState,
                                    isPlayingRef: isPlayingRef.current,
                                    intentionalTick: _intentionalTick,
                                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                    landscapeScrollState: landscapeScrollStateRef.current,
                                });
                            }
                            primeScrollTick = _apiTick;
                            preRotationAnchorTickRef.current = _apiTick;
                            lastStableRotationAnchorTickRef.current = _apiTick;
                        }
                    }
                }
                if (isRendererDebugEnabled()) {
                    const intentionalT = getIntentionalTick();
                    const isLandscapeNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                    console.log('[maestro-seek-diagnostic]', {
                        reason: 'primeLandscapeState-SCROLL-NOT-A-SEEK',
                        callSite: 'primeLandscapeState',
                        targetTick: tick,
                        isActivelyPlaying,
                        tickSource: isActivelyPlaying ? 'api.tickPosition' : 'getIntentionalTick()',
                        isLandscape: isLandscapeNow,
                        isPlaying: (api?.playerState ?? 0) === 1,
                        loopEnabled: loopEnabledRef.current,
                        playbackRangeRef: playbackRangeRef.current,
                        apiPlaybackRange: api?.playbackRange ?? null,
                        liveLoopRangeRef: loopEnabledRef.current ? (api?.playbackRange ?? null) : null,
                        loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                        lastIntentionalTick: intentionalT,
                        manualSeekAge: (window as any).__maestroManualSeek
                            ? Date.now() - (window as any).__maestroManualSeek : null,
                        apiTickPosition: api.tickPosition,
                        scrollDivergence: tick - (api?.tickPosition ?? 0),
                        note: !isActivelyPlaying && intentionalT !== null && Math.abs(intentionalT - (api?.tickPosition ?? 0)) > 240
                            ? 'paused — intentional tick used for anchor (ok when not playing)'
                            : isActivelyPlaying
                                ? 'playing — using live api.tickPosition (scroll will track audio)'
                                : 'ok',
                    });
                }
                if (isRendererDebugEnabled()) {
                    console.log('[landscape-cursor-prime-probe]', {
                        reason: 'primeLandscapeState-start',
                        inputTick: tick,
                        apiTickPosition: api.tickPosition,
                        playbackRange: api?.playbackRange ?? null,
                        loopEnabled: loopEnabledRef.current,
                        currentScrollLeft: ctr.scrollLeft,
                    });
                }
                const r = tickCache.findBeat(trackSet, primeScrollTick);
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
                    lastTick: primeScrollTick,
                };
                if (isRendererDebugEnabled()) {
                    console.log('[landscape-visual-loop-sync]', {
                        reason: 'write-primeLandscapeState',
                        apiTickPosition: api?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        isActivelyPlaying,
                        tickUsed: tick,
                        tickSource: isActivelyPlaying ? 'api.tickPosition' : 'getIntentionalTick-or-api.tickPosition',
                        playbackRange: api?.playbackRange ?? null,
                        loopEnabled: loopEnabledRef.current,
                        resolvedBeatTick: beat?.absolutePlaybackStart ?? null,
                        resolvedBeatBarIdx: beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index ?? null,
                        curBeatX,
                        nextBeatX,
                        beatStart: beat?.absolutePlaybackStart ?? null,
                        beatDur: structuralDur,
                        scrollLeftBefore: ctr.scrollLeft,
                        targetScrollLeft: Math.max(0, curBeatX - getCursorSurfaceX(ctr)),
                    });
                }
                const cursorSurfaceX = getCursorSurfaceX(ctr);
                const snap = Math.max(0, curBeatX - cursorSurfaceX);
                if (isRendererDebugEnabled()) {
                    console.log('[landscape-cursor-prime-probe]', {
                        reason: 'primeLandscapeState-end',
                        inputTick: tick,
                        resolvedBeatTick: beat.absolutePlaybackStart ?? tick,
                        resolvedBeatBarIdx: beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index ?? null,
                        resolvedBeatX: Number(curBeatX.toFixed(1)),
                        scrollLeftBefore: ctr.scrollLeft,
                        scrollLeftAfter: snap,
                        targetScrollLeft: snap,
                    });
                }
                if (isRendererDebugEnabled()) {
                    console.log('[rotation-anchor-resolution]', {
                        reason: 'primeLandscapeState-snap',
                        source: 'primeLandscapeState',
                        requestedTick: tick,
                        resolvedBeatTick: beat?.absolutePlaybackStart ?? null,
                        resolvedBeatBarIdx: beat?.voice?.bar?.masterBar?.index ?? null,
                        resolvedBeatX: Number(curBeatX.toFixed(1)),
                        resolvedBeatY: bb?.visualBounds?.y ?? null,
                        containerScrollLeft: ctr.scrollLeft,
                        containerScrollTop: ctr.scrollTop,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                    });
                    // [rotation-anchor-gate-probe] Point 10: before scrollLeft hard snap (primeLandscapeState)
                    console.log('[rotation-anchor-gate-probe]', {
                        reason: 'before-scrollLeft-snap-primeLandscapeState',
                        rotationGateActive: rotationGateActiveRef.current,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                        apiTickPosition: api?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        intentionalTick: getIntentionalTick(),
                        landscapeScrollState: landscapeScrollStateRef.current ?? null,
                        containerScrollLeft: ctr?.scrollLeft ?? null,
                        containerScrollTop: ctr?.scrollTop ?? null,
                        containerClientW: ctr?.clientWidth ?? null,
                        containerClientH: ctr?.clientHeight ?? null,
                        containerScrollW: ctr?.scrollWidth ?? null,
                        containerScrollH: ctr?.scrollHeight ?? null,
                        surfaceW: ctr?.querySelector('.at-surface')?.scrollWidth ?? null,
                        surfaceH: ctr?.querySelector('.at-surface')?.scrollHeight ?? null,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                        snapTarget: snap,
                    });
                }
                // [LandscapeRightRunwayFix] V143.4: ensure runway before write, then defer one RAF.
                const { beforeScrollW: _primeBefore, addedRunwayPx: _primeAdded } =
                    ensureLandscapeRunwayForSnap(ctr, snap, 'primeLandscapeState');
                requestAnimationFrame(() => {
                    if (isRendererDebugEnabled()) {
                        console.log('[landscape-right-runway]', {
                            reason: 'primeLandscapeState',
                            targetScrollLeft: snap,
                            beforeScrollW: _primeBefore,
                            afterScrollW: ctr.scrollWidth,
                            clientW: ctr.clientWidth,
                            beforeMaxScrollLeft: _primeBefore - ctr.clientWidth,
                            afterMaxScrollLeft: ctr.scrollWidth - ctr.clientWidth,
                            addedRunwayPx: _primeAdded,
                        });
                    }
                    targetScrollLeftRef.current = snap;
                    ctr.scrollLeft = snap;
                    // [RotationStableAnchorRef] Landscape snap resolved — record as stable anchor.
                    // [StableAnchorPoisonGuard] Only write if tick is confirmed trusted (not passive api.tickPosition drift).
                    const trustedPrimeTick =
                        primeScrollTick > 1 &&
                        (
                            preRotationAnchorTickRef.current === primeScrollTick ||
                            lastStableRotationAnchorTickRef.current === primeScrollTick ||
                            getIntentionalTick() === primeScrollTick ||
                            ((window as any).__maestroLastIntentionalTick === primeScrollTick) ||
                            // [V144.6] Also trust when we repaired to stable anchor
                            _shouldReprimeLandscapeScroll
                        );
                    if (trustedPrimeTick) {
                        setLastStableRotationAnchorTick(primeScrollTick, 'primeLandscapeState-success');
                    } else if (LANDSCAPE_LOOP_DEBUG) {
                        console.warn('[rotation-stable-anchor]', {
                            reason: 'primeLandscapeState-stable-update-skipped',
                            tick,
                            preRotationAnchorTick: preRotationAnchorTickRef.current,
                            lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                            intentionalTick: getIntentionalTick(),
                            manualIntentionalTick: (window as any).__maestroLastIntentionalTick ?? null,
                            apiTickPosition: api?.tickPosition ?? null,
                            layoutMode: api?.settings?.display?.layoutMode ?? null,
                            systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                            firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                        });
                    }
                });
            };

            api.renderFinished.on(() => {
                // [rotation-anchor-gate-probe] Point 3: renderFinished
                if (isRendererDebugEnabled()) {
                    console.log('[rotation-anchor-gate-probe]', {
                        reason: 'renderFinished',
                        rotationGateActive: rotationGateActiveRef.current,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        lastOrientationMode: lastOrientationModeRef.current,
                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                        apiTickPosition: api?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        intentionalTick: getIntentionalTick(),
                        landscapeScrollState: landscapeScrollStateRef.current ?? null,
                        containerScrollLeft: containerRef.current?.scrollLeft ?? null,
                        containerScrollTop: containerRef.current?.scrollTop ?? null,
                        containerClientW: containerRef.current?.clientWidth ?? null,
                        containerClientH: containerRef.current?.clientHeight ?? null,
                        containerScrollW: containerRef.current?.scrollWidth ?? null,
                        containerScrollH: containerRef.current?.scrollHeight ?? null,
                        surfaceW: containerRef.current?.querySelector('.at-surface')?.scrollWidth ?? null,
                        surfaceH: containerRef.current?.querySelector('.at-surface')?.scrollHeight ?? null,
                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                    });
                }
                // [DeferredLandscapeMismatchRecovery] V139: reset attempt counter when healthy.
                {
                    const _rfSystems = api?.renderer?.boundsLookup?.staffSystems ?? [];
                    const _rfFirstBars = (_rfSystems?.[0] as any)?.bars?.length ?? null;
                    const healthyLandscapeStrip =
                        isLandscapeViewport() &&
                        api?.settings?.display?.layoutMode === 1 &&
                        _rfFirstBars != null &&
                        _rfFirstBars > 2;
                    if (healthyLandscapeStrip) {
                        landscapeMismatchRecoveryAttemptsRef.current = 0;
                        ensureLandscapeTrailingScrollPadding('renderFinished-healthy');
                    }
                }
                // [LandscapePageMismatchRecoveryDiagnosticOnly] V138/V139: detect viewport/layout desync,
                // preserve rescue tick, and schedule deferred recovery outside renderFinished.
                if (isAlphaTabPageLayoutWhileLandscape(api)) {
                    const manualIntentional: number | null =
                        typeof window !== 'undefined' && typeof (window as any).__maestroLastIntentionalTick === 'number'
                            ? (window as any).__maestroLastIntentionalTick
                            : null;
                    const rescueTick =
                        lastStableRotationAnchorTickRef.current ??
                        getIntentionalTick() ??
                        manualIntentional ??
                        preRotationAnchorTickRef.current ??
                        0;
                    if (isRendererDebugEnabled()) {
                        console.warn('[rotation-layout-mismatch]', {
                            reason: 'landscape-viewport-page-layout-detected-diagnostic-only',
                            rescueTick,
                            apiTickPosition: api?.tickPosition ?? null,
                            layoutMode: api?.settings?.display?.layoutMode ?? null,
                            scrollMode: api?.settings?.player?.scrollMode ?? null,
                            systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                            firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                            surfaceW: document.querySelector('.at-surface')?.scrollWidth ?? null,
                            surfaceH: document.querySelector('.at-surface')?.scrollHeight ?? null,
                        });
                    }
                    if (rescueTick > 1) {
                        // Preserve the good tick before the deferred render.
                        preRotationAnchorTickRef.current = rescueTick;
                        lastStableRotationAnchorTickRef.current = rescueTick;
                    }
                    // [V139-MisfireGuard] V143.1: Only schedule recovery if we are still intentionally
                    // in Landscape strip mode. Do NOT fire during intentional return to Page/portrait.
                    const _intendedStrip =
                        forceHorizontalRef.current === true &&
                        isDeviceLandscape() === true;
                    if (_intendedStrip) {
                        scheduleLandscapeMismatchRecovery('renderFinished-diagnostic-mismatch', rescueTick);
                    } else {
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-layout-mismatch]', {
                                reason: 'landscape-recovery-skipped-not-in-strip-mode',
                                rescueTick,
                                forceHorizontal: forceHorizontalRef.current,
                                isDeviceLandscape: isDeviceLandscape(),
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                note: 'intentional Page return — V139 recovery suppressed',
                            });
                        }
                    }
                }
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
                        removeLandscapeTrailingPadding('renderFinished-not-landscape-strip');
                        // [V139-MisfireGuard] V143.1: Cancel any pending Landscape mismatch recovery
                        // when we are confirmed rendering Page mode. Prevents the deferred timeout
                        // from firing after we've already committed to Portrait/Page layout.
                        if (pendingLandscapeMismatchRecoveryRef.current != null) {
                            window.clearTimeout(pendingLandscapeMismatchRecoveryRef.current);
                            pendingLandscapeMismatchRecoveryRef.current = null;
                            if (isRendererDebugEnabled()) {
                                console.log('[rotation-layout-mismatch]', {
                                    reason: 'cancel-landscape-recovery-on-page-render',
                                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                    apiTickPosition: api?.tickPosition ?? null,
                                    note: 'Page render confirmed — pending V139 recovery cancelled',
                                });
                            }
                        }
                        if (isRendererDebugEnabled()) {
                            const _c = h;
                            console.log('[page-scroll-authority-probe]', {
                                reason: 'renderFinished-strip-to-page',
                                anchorTick: api?.tickPosition ?? null,
                                apiTickPosition: api?.tickPosition,
                                containerScrollTop: _c?.scrollTop ?? null,
                                containerClientH: _c?.clientHeight ?? null,
                                containerScrollH: _c?.scrollHeight ?? null,
                                containerRectY: _c ? Math.round(_c.getBoundingClientRect().y) : null,
                                trueScrollTop: _c
                                    ? (_c.scrollHeight === _c.clientHeight
                                        ? window.scrollY || document.documentElement.scrollTop || document.body?.scrollTop || 0
                                        : _c.scrollTop)
                                    : null,
                                outerBoundingY: _c ? _c.getBoundingClientRect().y : null,
                                containerIsScrollable: _c ? _c.scrollHeight > _c.clientHeight + 5 : null,
                                trueScroll: _c ? getScrollParentProbe(_c) : null,
                            });
                        }
                        // [PlayStartHardSnapInFlightGuard] Skip song-load cursor prime while
                        // play-start hard snap is armed. ensureCursorAndAnchorOnce would consume
                        // forceHardSnapNextSetBeat and call snapPortraitToBeatRow before the first
                        // live playerPositionChanged setBeat. Only guard when the cursor already
                        // exists — initial creation must still proceed when cursorRef is null.
                        if (playStartHardSnapInFlightRef.current && cursorRef.current) {
                            return;
                        }
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
                        if (isRendererDebugEnabled()) {
                            const systems = api?.renderer?.boundsLookup?.staffSystems ?? [];
                            console.log('[landscape-cursor-prime-probe]', {
                                reason: 'landscape-cursor-created',
                                apiTickPosition: api.tickPosition,
                                playbackRange: api?.playbackRange ?? null,
                                loopEnabled: loopEnabledRef.current,
                                systemsLength: systems.length,
                                firstSystemBars: (systems[0] as any)?.bars?.length ?? null,
                                surfaceW: h.querySelector('.at-surface')?.scrollWidth ?? null,
                                containerW: h.clientWidth,
                                containerScrollLeft: h.scrollLeft,
                            });
                        }
                        h.querySelectorAll('.at-cursor-bar, .at-cursor-beat, .at-cursor')
                            .forEach(n => {
                                (n as HTMLElement).style.display = 'none';
                                (n as HTMLElement).style.opacity = '0';
                            });
                        // [rotation-anchor-gate-probe] Point 4: before landscapeInitialAnchor
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-anchor-gate-probe]', {
                                reason: 'before-landscapeInitialAnchor',
                                rotationGateActive: rotationGateActiveRef.current,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                apiTickPosition: api?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                isPlayingRef: isPlayingRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                                intentionalTick: getIntentionalTick(),
                                landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                containerScrollLeft: h?.scrollLeft ?? null,
                                containerScrollTop: h?.scrollTop ?? null,
                                containerClientW: h?.clientWidth ?? null,
                                containerClientH: h?.clientHeight ?? null,
                                containerScrollW: h?.scrollWidth ?? null,
                                containerScrollH: h?.scrollHeight ?? null,
                                surfaceW: h?.querySelector('.at-surface')?.scrollWidth ?? null,
                                surfaceH: h?.querySelector('.at-surface')?.scrollHeight ?? null,
                                systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                            });
                        }
                        landscapeInitialAnchor(
                            h,
                            api,
                            targetScrollLeftRef,
                            1000,
                            // [RotationAnchorFreeze] Pass frozen pre-rotation tick as override.
                            rotationGateActiveRef.current ? preRotationAnchorTickRef.current ?? undefined : undefined,
                        );
                        // [rotation-anchor-gate-probe] Point 5: after landscapeInitialAnchor called (async RAF — snap not yet applied)
                        if (isRendererDebugEnabled()) {
                            console.log('[rotation-anchor-gate-probe]', {
                                reason: 'after-landscapeInitialAnchor-called',
                                rotationGateActive: rotationGateActiveRef.current,
                                preRotationAnchorTick: preRotationAnchorTickRef.current,
                                lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                layoutMode: api?.settings?.display?.layoutMode ?? null,
                                apiTickPosition: api?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                                isPlayingRef: isPlayingRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                                intentionalTick: getIntentionalTick(),
                                landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                containerScrollLeft: h?.scrollLeft ?? null,
                                containerScrollTop: h?.scrollTop ?? null,
                                containerClientW: h?.clientWidth ?? null,
                                containerClientH: h?.clientHeight ?? null,
                                containerScrollW: h?.scrollWidth ?? null,
                                containerScrollH: h?.scrollHeight ?? null,
                                surfaceW: h?.querySelector('.at-surface')?.scrollWidth ?? null,
                                surfaceH: h?.querySelector('.at-surface')?.scrollHeight ?? null,
                                systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                            });
                        }
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

                    if (isRendererDebugEnabled()) {
                        console.log('[loop-render-probe]', {
                            reason: 'renderFinished-stable',
                            loopEnabled: loopEnabledRef.current,
                            playbackRangeRef: playbackRangeRef.current,
                            apiPlaybackRange: (api.playbackRange as any) ?? null,
                            systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                            firstSystemBars: (api?.renderer?.boundsLookup?.staffSystems?.[0] as any)?.bars?.length ?? null,
                        });
                    }

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
                            if (ctr) {
                                // [rotation-anchor-gate-probe] Point 6: before primeLandscapeState (renderFinished RAF)
                                if (isRendererDebugEnabled()) {
                                    console.log('[rotation-anchor-gate-probe]', {
                                        reason: 'before-primeLandscapeState-renderFinished',
                                        rotationGateActive: rotationGateActiveRef.current,
                                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                                        apiTickPosition: api?.tickPosition ?? null,
                                        playerState: (api as any)?.playerState ?? null,
                                        isPlayingRef: isPlayingRef.current,
                                        loopEnabled: loopEnabledRef.current,
                                        playbackRange: api?.playbackRange ?? null,
                                        intentionalTick: getIntentionalTick(),
                                        landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                        containerScrollLeft: ctr?.scrollLeft ?? null,
                                        containerScrollTop: ctr?.scrollTop ?? null,
                                        containerClientW: ctr?.clientWidth ?? null,
                                        containerClientH: ctr?.clientHeight ?? null,
                                        containerScrollW: ctr?.scrollWidth ?? null,
                                        containerScrollH: ctr?.scrollHeight ?? null,
                                        surfaceW: ctr?.querySelector('.at-surface')?.scrollWidth ?? null,
                                        surfaceH: ctr?.querySelector('.at-surface')?.scrollHeight ?? null,
                                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                                    });
                                }
                                primeLandscapeState(ctr);
                                // [RotationAnchorFreeze] Landscape snap committed — clear gate.
                                if (isRendererDebugEnabled()) {
                                    console.log('[rotation-anchor-gate-probe]', {
                                        reason: 'rotation-gate-cleared',
                                        clearedAt: 'renderFinished-landscape',
                                        finalTick: preRotationAnchorTickRef.current,
                                        apiTickPosition: api?.tickPosition ?? null,
                                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                    });
                                }
                                rotationGateActiveRef.current = false;
                                preRotationAnchorTickRef.current = null;
                                // [rotation-anchor-gate-probe] Point 7: after primeLandscapeState (renderFinished RAF)
                                if (isRendererDebugEnabled()) {
                                    console.log('[rotation-anchor-gate-probe]', {
                                        reason: 'after-primeLandscapeState-renderFinished',
                                        rotationGateActive: rotationGateActiveRef.current,
                                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                        layoutMode: api?.settings?.display?.layoutMode ?? null,
                                        apiTickPosition: api?.tickPosition ?? null,
                                        playerState: (api as any)?.playerState ?? null,
                                        isPlayingRef: isPlayingRef.current,
                                        loopEnabled: loopEnabledRef.current,
                                        playbackRange: api?.playbackRange ?? null,
                                        intentionalTick: getIntentionalTick(),
                                        landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                        containerScrollLeft: ctr?.scrollLeft ?? null,
                                        containerScrollTop: ctr?.scrollTop ?? null,
                                        containerClientW: ctr?.clientWidth ?? null,
                                        containerClientH: ctr?.clientHeight ?? null,
                                        containerScrollW: ctr?.scrollWidth ?? null,
                                        containerScrollH: ctr?.scrollHeight ?? null,
                                        surfaceW: ctr?.querySelector('.at-surface')?.scrollWidth ?? null,
                                        surfaceH: ctr?.querySelector('.at-surface')?.scrollHeight ?? null,
                                        systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                        firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                                    });
                                }
                                ensureLandscapeTrailingScrollPadding('primeLandscapeState-renderFinished');
                            }
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
                if (isRendererDebugEnabled()) {
                    const stack = new Error().stack;
                    console.log('[landscape-playback-state-sync]', {
                        reason: 'playerStateChanged-raw',
                        rawEvent: e,
                        state: e?.state ?? e ?? null,
                        apiPlayerState: (api as any)?.playerState ?? null,
                        apiTickPosition: (api as any)?.tickPosition ?? null,
                        isPlayingRef: isPlayingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                        callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                    });
                }
                if (isRendererDebugEnabled()) {
                    console.log('[landscape-playback-state-sync]', {
                        reason: 'playerStateChanged',
                        state: e?.state ?? e ?? null,
                        apiPlayerState: (api as any)?.playerState ?? null,
                        apiTickPosition: (api as any)?.tickPosition ?? null,
                        isPlayingRef: isPlayingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        liveLoopRangeRef: loopEnabledRef.current ? (api?.playbackRange ?? null) : null,
                        landscapeScrollState: landscapeScrollStateRef.current,
                        isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                        loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                        loopPlayStartOverrideTick: (window as any).__maestroLoopPlayStartOverrideTick ?? null,
                    });
                }
                if ((e.state ?? 0) === 1 && hasRevealedRef.current && isSettlingRef.current) {
                    console.warn('[V117] isSettling stuck on play — force clearing');
                    isSettlingRef.current = false;
                    setIsSettling(false);
                }
                if ((e.state ?? 0) === 1) {
                    playStartHardSnapInFlightRef.current = false;
                    playStartHardSnapArmedAtRef.current = null;
                    playStartHardSnapAlreadyArmedRef.current = false;
                    if (playStartHardSnapFallbackTimerRef.current !== null) {
                        window.clearTimeout(playStartHardSnapFallbackTimerRef.current);
                        playStartHardSnapFallbackTimerRef.current = null;
                    }
                }
                if (seekInProgressRef.current) return;
                clearTimeout(stateDebounce);
                stateDebounce = setTimeout(() => {
                    const playing = (e.state ?? 0) === 1;
                    if (playing !== isPlayingRef.current) {
                        if (isRendererDebugEnabled() && !playing) {
                            console.log('[landscape-playback-state-sync]', {
                                reason: 'onPlayStateChange-false-call',
                                apiPlayerState: (api as any)?.playerState ?? null,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: api?.playbackRange ?? null,
                                landscapeScrollState: landscapeScrollStateRef.current,
                            });
                        }
                        onPlayStateChange(playing);
                    }
                }, 50);
                const isStripNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                if ((e.state ?? 0) === 1 && isStripNow) {
                    const ctr = containerRef.current;
                    if (ctr) {
                        requestAnimationFrame(() => {
                            // [rotation-anchor-gate-probe] Point 6: before primeLandscapeState (playerStateChanged play-start)
                            if (isRendererDebugEnabled()) {
                                console.log('[rotation-anchor-gate-probe]', {
                                    reason: 'before-primeLandscapeState-playerStateChanged',
                                    rotationGateActive: rotationGateActiveRef.current,
                                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                    isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                    layoutMode: api?.settings?.display?.layoutMode ?? null,
                                    apiTickPosition: api?.tickPosition ?? null,
                                    playerState: (api as any)?.playerState ?? null,
                                    isPlayingRef: isPlayingRef.current,
                                    loopEnabled: loopEnabledRef.current,
                                    playbackRange: api?.playbackRange ?? null,
                                    intentionalTick: getIntentionalTick(),
                                    landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                    containerScrollLeft: ctr?.scrollLeft ?? null,
                                    containerScrollTop: ctr?.scrollTop ?? null,
                                    containerClientW: ctr?.clientWidth ?? null,
                                    containerClientH: ctr?.clientHeight ?? null,
                                    containerScrollW: ctr?.scrollWidth ?? null,
                                    containerScrollH: ctr?.scrollHeight ?? null,
                                    surfaceW: ctr?.querySelector('.at-surface')?.scrollWidth ?? null,
                                    surfaceH: ctr?.querySelector('.at-surface')?.scrollHeight ?? null,
                                    systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                    firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                                });
                            }
                            primeLandscapeState(ctr);
                            // [rotation-anchor-gate-probe] Point 7: after primeLandscapeState (playerStateChanged play-start)
                            if (isRendererDebugEnabled()) {
                                console.log('[rotation-anchor-gate-probe]', {
                                    reason: 'after-primeLandscapeState-playerStateChanged',
                                    rotationGateActive: rotationGateActiveRef.current,
                                    preRotationAnchorTick: preRotationAnchorTickRef.current,
                                    lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                                    isLandscape: forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1),
                                    layoutMode: api?.settings?.display?.layoutMode ?? null,
                                    apiTickPosition: api?.tickPosition ?? null,
                                    playerState: (api as any)?.playerState ?? null,
                                    isPlayingRef: isPlayingRef.current,
                                    loopEnabled: loopEnabledRef.current,
                                    playbackRange: api?.playbackRange ?? null,
                                    intentionalTick: getIntentionalTick(),
                                    landscapeScrollState: landscapeScrollStateRef.current ?? null,
                                    containerScrollLeft: ctr?.scrollLeft ?? null,
                                    containerScrollTop: ctr?.scrollTop ?? null,
                                    containerClientW: ctr?.clientWidth ?? null,
                                    containerClientH: ctr?.clientHeight ?? null,
                                    containerScrollW: ctr?.scrollWidth ?? null,
                                    containerScrollH: ctr?.scrollHeight ?? null,
                                    surfaceW: ctr?.querySelector('.at-surface')?.scrollWidth ?? null,
                                    surfaceH: ctr?.querySelector('.at-surface')?.scrollHeight ?? null,
                                    systemsLength: api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                                    firstSystemBars: api?.renderer?.boundsLookup?.staffSystems?.[0]?.bars?.length ?? null,
                                });
                            }
                            startLandscapeScrollLoop(ctr, api);
                        });
                    }
                }
            });

            // 🔒🔒🔒 CURSOR / SCROLL ENGINE ───────────────────────────────────
            api.playerPositionChanged.on((e: any) => {
                if (isRendererDebugEnabled()) {
                    const isStripModeProbe = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                    if ((isStripModeProbe || loopEnabledRef.current) && shouldLogDiagnostic('landscape-visual-loop-sync', e.currentTick ?? e.tickPosition ?? null)) {
                        console.log('[landscape-visual-loop-sync]', {
                            reason: 'playerPositionChanged-entry',
                            tickRaw: e.currentTick ?? e.tickPosition ?? null,
                            isSettling: isSettlingRef.current,
                            isStripMode: isStripModeProbe,
                            playerState: (api as any)?.playerState ?? null,
                            isPlayingRef: isPlayingRef.current,
                            playbackRange: api?.playbackRange ?? null,
                            existingLandscapeScrollState: landscapeScrollStateRef.current,
                        });
                    }
                }
                if (isRendererDebugEnabled()) {
                    const isStripProbe = forceHorizontalRef.current ||
                        (api?.settings?.display?.layoutMode === 1);
                    if (isStripProbe && (api?.playerState ?? 0) === 1 && shouldLogDiagnostic('landscape-visual-loop-sync', e.currentTick ?? e.tickPosition ?? null)) {
                        console.log('[landscape-visual-loop-sync]', {
                            reason: 'playerPositionChanged-settling-gate',
                            tickRaw: e.currentTick ?? e.tickPosition ?? null,
                            isSettling: isSettlingRef.current,
                            playerState: (api as any)?.playerState ?? null,
                            willReturn: isSettlingRef.current,
                        });
                    }
                }
                if (isSettlingRef.current) return;

                const tickRaw = e.currentTick ?? e.tickPosition;
                if (tickRaw == null) return;

                if (isRendererDebugEnabled() && shouldLogDiagnostic('micro-tick-flood-probe', tickRaw)) {
                    const _lastT = landscapeScrollStateRef.current?.lastTick ?? lastTickRef.current ?? null;
                    const _delta = _lastT != null ? Math.abs(tickRaw - _lastT) : null;
                    const _isStrip = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                    const _probeState = landscapeScrollStateRef.current;
                    const _probeRange = api?.playbackRange ?? null;
                    const _probeNoLoop = !loopEnabledRef.current && _probeRange == null;
                    const _probeNoGate = !rotationGateActiveRef.current && !isSettlingRef.current;
                    const _probeWouldSkipEndReset =
                        _probeNoLoop && _probeState != null && _probeState.lastTick > 10000 && tickRaw <= 1;
                    const _probeWouldSkipSameBeat =
                        _probeNoLoop && _probeNoGate && _probeState != null &&
                        tickRaw < _probeState.lastTick &&
                        tickRaw <= _probeState.beatStart + 4 &&
                        _probeState.lastTick > _probeState.beatStart + 120;
                    const _probeWouldSkipMicroDelta =
                        _probeNoLoop && _probeNoGate && _probeState != null &&
                        _delta != null && _delta <= 24;
                    console.log('[micro-tick-flood-probe]', {
                        reason: 'playerPositionChanged',
                        tickRaw,
                        lastTick: _lastT,
                        delta: _delta,
                        playerState: (api as any)?.playerState ?? null,
                        isStripMode: _isStrip,
                        rotationGateActive: rotationGateActiveRef.current,
                        isSettling: isSettlingRef.current,
                        loopEnabled: loopEnabledRef.current,
                        playbackRange: _probeRange,
                        noiseGuardWouldSkipEndReset: _probeWouldSkipEndReset,
                        noiseGuardWouldSkipSameBeatReset: _probeWouldSkipSameBeat,
                        noiseGuardWouldSkipMicroDelta: _probeWouldSkipMicroDelta,
                        didRunExpensiveSync: !isSettlingRef.current && _isStrip &&
                            !_probeWouldSkipEndReset && !_probeWouldSkipSameBeat && !_probeWouldSkipMicroDelta,
                        didWriteLandscapeState: !isSettlingRef.current && _isStrip &&
                            !_probeWouldSkipEndReset && !_probeWouldSkipSameBeat && !_probeWouldSkipMicroDelta,
                        didRenderLoopHighlight: !isSettlingRef.current && _isStrip && loopEnabledRef.current,
                    });
                }

                const isStripMode = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);

                if (isStripMode) {
                    const container = containerRef.current;
                    if (!container) return;

                    // ── [LandscapePlaybackNoiseGuard] V144 ────────────────────
                    const _existingState = landscapeScrollStateRef.current;
                    const _playerState = (api as any)?.playerState ?? 0;
                    const _playbackRange = api?.playbackRange ?? null;
                    const _noLoop = !loopEnabledRef.current && _playbackRange == null;
                    const _noGate = !rotationGateActiveRef.current && !isSettlingRef.current;
                    // [PlaybackEngagementGate] V144.9: noise guards apply only during active playback.
                    // Paused/stopped/manual/rotation ticks are authoritative and must pass through.
                    const _playbackEngaged = isPlayingRef.current === true && _playerState === 1;

                    // [HardEndResetGuard] V144.3: reject tick 0/1 end resets regardless of
                    // rotation gate or settling — fires before tickCache.findBeat unconditionally.
                    const _isEndResetNoise =
                        _noLoop &&
                        _existingState != null &&
                        _existingState.lastTick > 10000 &&
                        tickRaw <= 1;
                    if (_isEndResetNoise) {
                        if (shouldLogLandscapeNoiseGuard('end-reset-tick-skipped', tickRaw)) {
                            console.warn('[landscape-playback-noise-guard]', {
                                reason: 'end-reset-tick-skipped',
                                skippedCount: lastLandscapeNoiseGuardLogRef.current['end-reset-tick-skipped']?.count ?? null,
                                tickRaw,
                                lastTick: _existingState.lastTick,
                                playerState: _playerState,
                                playbackRange: _playbackRange,
                                loopEnabled: loopEnabledRef.current,
                                rotationGateActive: rotationGateActiveRef.current,
                                isSettling: isSettlingRef.current,
                            });
                        }
                        return;
                    }

                    // Part 2 — Same-beat backward reset guard: reject noisy rewinds to beat start.
                    if (
                        _noLoop &&
                        _noGate &&
                        _existingState != null &&
                        tickRaw < _existingState.lastTick &&
                        tickRaw <= _existingState.beatStart + 4 &&
                        _existingState.lastTick > _existingState.beatStart + 120
                    ) {
                        if (_playbackEngaged) {
                            if (shouldLogLandscapeNoiseGuard('same-beat-backward-reset-skipped', tickRaw)) {
                                console.warn('[landscape-playback-noise-guard]', {
                                    reason: 'same-beat-backward-reset-skipped',
                                    skippedCount: lastLandscapeNoiseGuardLogRef.current['same-beat-backward-reset-skipped']?.count ?? null,
                                    tickRaw,
                                    lastTick: _existingState.lastTick,
                                    beatStart: _existingState.beatStart,
                                    beatDur: _existingState.beatDur,
                                    playerState: _playerState,
                                    playbackRange: _playbackRange,
                                    loopEnabled: loopEnabledRef.current,
                                });
                            }
                            return;
                        } else if (shouldLogDiagnostic('landscape-guard-bypassed-not-playing', tickRaw)) {
                            console.warn('[landscape-playback-noise-guard]', {
                                reason: 'guard-bypassed-not-playing',
                                guard: 'same-beat-backward-reset',
                                tickRaw,
                                lastTick: _existingState?.lastTick ?? null,
                                beatStart: _existingState?.beatStart ?? null,
                                playerState: _playerState,
                                isPlayingRef: isPlayingRef.current,
                                isSettling: isSettlingRef.current,
                                rotationGateActive: rotationGateActiveRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: _playbackRange,
                            });
                        }
                    }

                    // [LandscapeMicroDelta24Guard] V144.4: skip expensive sync for ≤24 tick deltas.
                    if (
                        _noLoop &&
                        _noGate &&
                        _existingState != null &&
                        Math.abs(tickRaw - _existingState.lastTick) <= 24
                    ) {
                        if (_playbackEngaged) {
                            if (LANDSCAPE_LOOP_DEBUG && shouldLogLandscapeNoiseGuard('micro-delta-skipped', tickRaw)) {
                                console.log('[landscape-playback-noise-guard]', {
                                    reason: 'micro-delta-skipped',
                                    skippedCount: lastLandscapeNoiseGuardLogRef.current['micro-delta-skipped']?.count ?? null,
                                    tickRaw,
                                    lastTick: _existingState.lastTick,
                                    delta: Math.abs(tickRaw - _existingState.lastTick),
                                    beatStart: _existingState.beatStart,
                                    playerState: _playerState,
                                    playbackRange: _playbackRange,
                                    loopEnabled: loopEnabledRef.current,
                                });
                            }
                            return;
                        } else if (shouldLogDiagnostic('landscape-guard-bypassed-not-playing', tickRaw)) {
                            console.warn('[landscape-playback-noise-guard]', {
                                reason: 'guard-bypassed-not-playing',
                                guard: 'micro-delta',
                                tickRaw,
                                lastTick: _existingState?.lastTick ?? null,
                                beatStart: _existingState?.beatStart ?? null,
                                playerState: _playerState,
                                isPlayingRef: isPlayingRef.current,
                                isSettling: isSettlingRef.current,
                                rotationGateActive: rotationGateActiveRef.current,
                                loopEnabled: loopEnabledRef.current,
                                playbackRange: _playbackRange,
                            });
                        }
                    }
                    // ── END LandscapePlaybackNoiseGuard ───────────────────────

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

                    if (isRendererDebugEnabled() && expandedStart !== lastLoggedExpandedStartRef.current) {
                        lastLoggedExpandedStartRef.current = expandedStart;
                        console.log('[landscape-visual-segment-map]', {
                            tickRaw,
                            playbackRange: api?.playbackRange ?? null,
                            beatAbsStart,
                            expandedStart,
                            structuralDur,
                            expandedDur,
                            resolvedBeatTick: beat?.absolutePlaybackStart ?? null,
                            resolvedBeatBarIdx: beat?.voice?.bar?.index ??
                                beat?.voice?.bar?.masterBar?.index ?? null,
                            curBeatX,
                            nextBeatX,
                            visualDeltaX: nextBeatX - curBeatX,
                            beatDurUsed: Math.max(
                                structuralDur * 0.75,
                                Math.min(expandedDur, structuralDur * 2.5)
                            ),
                            notesCount: beat?.notes?.length ?? null,
                            hasVisualMovement: Math.abs(nextBeatX - curBeatX) > 1,
                        });
                    }

                    if (isRendererDebugEnabled() && loopEnabledRef.current &&
                        api?.playbackRange && nextBeatX <= curBeatX + 1) {

                        const liveRange = api.playbackRange as { startTick: number; endTick: number };
                        const probeTicksArr = [
                            tickRaw + 60, tickRaw + 120, tickRaw + 240, tickRaw + 480,
                            liveRange.endTick
                        ];
                        const lookAheadResults = probeTicksArr.map(probeTick => {
                            try {
                                const pr = tickCache.findBeat(trackSet, probeTick);
                                const pb = pr?.beat ? bounds.findBeat(pr.beat) : null;
                                const px = pb?.visualBounds
                                    ? (typeof pb.onNotesX === 'number'
                                        ? pb.onNotesX
                                        : pb.visualBounds.x + pb.visualBounds.w / 2)
                                    : null;
                                return {
                                    probeTick,
                                    beatAbsStart: pr?.beat?.absolutePlaybackStart ?? null,
                                    beatBarIdx: pr?.beat?.voice?.bar?.index ??
                                        pr?.beat?.voice?.bar?.masterBar?.index ?? null,
                                    x: px,
                                    deltaFromCur: px != null ? px - curBeatX : null,
                                };
                            } catch { return { probeTick, error: true }; }
                        });

                        if (isRendererDebugEnabled()) {
                            console.log('[landscape-zero-delta-segment-probe]', {
                                tickRaw,
                                playbackRange: api?.playbackRange ?? null,
                                beatAbsStart,
                                expandedStart,
                                structuralDur,
                                expandedDur,
                                curBeatX,
                                nextBeatX,
                                visualDeltaX: nextBeatX - curBeatX,
                                loopEndTick: liveRange.endTick,
                                lookAheadResults,
                            });
                        }
                    }

                    let effectiveNextBeatX = nextBeatX;
                    const visualDeltaX = nextBeatX - curBeatX;

                    if (visualDeltaX > 1) {
                        lastGoodLandscapeVisualDeltaXRef.current = visualDeltaX;
                    } else if (
                        loopEnabledRef.current &&
                        api?.playbackRange &&
                        nextBeatX <= curBeatX + 1
                    ) {
                        effectiveNextBeatX = curBeatX + lastGoodLandscapeVisualDeltaXRef.current;

                        if (isRendererDebugEnabled()) {
                            console.log('[landscape-zero-delta-fallback]', {
                                tickRaw,
                                playbackRange: api?.playbackRange ?? null,
                                beatAbsStart,
                                expandedStart,
                                structuralDur,
                                expandedDur,
                                curBeatX,
                                originalNextBeatX: nextBeatX,
                                effectiveNextBeatX,
                                fallbackDeltaX: lastGoodLandscapeVisualDeltaXRef.current,
                            });
                        }
                    }

                    {
                        const previousLandscapeState = landscapeScrollStateRef.current;
                        const previousTick = previousLandscapeState?.lastTick ?? null;
                        const range = api?.playbackRange as { startTick: number; endTick: number } | null;
                        const nativeLoopWrapped =
                            loopEnabledRef.current &&
                            range != null &&
                            previousTick != null &&
                            previousTick >= range.endTick - 240 &&
                            tickRaw <= range.startTick + 120;

                        if (nativeLoopWrapped) {
                            console.log('[landscape-native-loop-wrap-detected]', {
                                tickRaw,
                                previousTick,
                                playbackRange: range,
                                previousLandscapeState,
                                apiTickPosition: api?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                            });
                            const snap = Math.max(0, curBeatX - getCursorSurfaceX(container));
                            targetScrollLeftRef.current = snap;
                            container.scrollLeft = snap;
                            console.log('[landscape-native-loop-wrap-visual-snap]', {
                                tickRaw,
                                previousTick,
                                snap,
                                scrollLeftAfter: container.scrollLeft,
                                curBeatX,
                                effectiveNextBeatX,
                                playbackRange: range,
                            });
                        }
                    }

                    if (isRendererDebugEnabled() && shouldLogDiagnostic('landscape-visual-loop-sync', tickRaw)) {
                        console.log('[landscape-visual-loop-sync]', {
                            reason: 'write-playerPositionChanged-live',
                            tickRaw,
                            apiTickPosition: api?.tickPosition ?? null,
                            playerState: (api as any)?.playerState ?? null,
                            isPlayingRef: isPlayingRef.current,
                            playbackRange: api?.playbackRange ?? null,
                            loopEnabled: loopEnabledRef.current,
                            previousLandscapeScrollState: landscapeScrollStateRef.current,
                            beatAbsStart,
                            expandedStart,
                            structuralDur,
                            expandedDur,
                            resolvedBeatTick: beat?.absolutePlaybackStart ?? null,
                            resolvedBeatBarIdx: beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index ?? null,
                            curBeatX,
                            nextBeatX,
                            originalNextBeatX: nextBeatX,
                            effectiveNextBeatX,
                            usedZeroDeltaFallback: effectiveNextBeatX !== nextBeatX,
                            lastGoodLandscapeVisualDeltaX: lastGoodLandscapeVisualDeltaXRef.current,
                            beatStart: expandedStart,
                            beatDur: Math.max(structuralDur * 0.75, Math.min(expandedDur, structuralDur * 2.5)),
                        });
                    }
                    landscapeScrollStateRef.current = {
                        curBeatX, nextBeatX: effectiveNextBeatX,
                        beatStart: expandedStart,
                        beatDur: Math.max(structuralDur * 0.75, Math.min(expandedDur, structuralDur * 2.5)),
                        lastTick: tickRaw,
                    };

                    if ((api.playerState ?? 0) === 1 && landscapeScrollRafRef.current === null) {
                        startLandscapeScrollLoop(container, api);
                    }
                    // [PlaybackLiveStableAnchor] V142: Promote live Landscape playback tick to stable anchor.
                    // Stable anchor was only updating from manual seeks/snaps, so playback could advance
                    // while rotation still used the old manual tick.
                    {
                        const _prevStable = lastStableRotationAnchorTickRef.current ?? 0;
                        const _shouldPromote =
                            tickRaw > 1 &&
                            !rotationGateActiveRef.current &&
                            !isSettlingRef.current &&
                            (api as any)?.playerState === 1 &&
                            (tickRaw > _prevStable + 30 || tickRaw < _prevStable - 240); // V143: allow Custom Loop backward wraps
                        if (_shouldPromote) {
                            setLastStableRotationAnchorTick(tickRaw, 'playerPositionChanged-live-landscape');
                            if (isRendererDebugEnabled() && shouldLogDiagnostic('playback-live-stable-anchor', tickRaw ?? null, 1000, 480)) {
                                console.log('[playback-live-stable-anchor]', {
                                    reason: 'playerPositionChanged-live-landscape',
                                    tickRaw,
                                    previousStable: _prevStable,
                                    apiTickPosition: (api as any)?.tickPosition ?? null,
                                    playerState: (api as any)?.playerState ?? null,
                                    landscapeScrollState: landscapeScrollStateRef.current,
                                });
                            }
                        }
                    }
                    return;
                }

                // ── Portrait cursor engine ────────────────────────────────────
                if (!cursorRef.current) return;

                // [SongEndHoldCursor] V144.8: In portrait path, reject tickRaw <= 1 at song end
                // when no loop is active and lastTick was deep in the song.
                // V144.8: Diagnostic confirmed AlphaTab emits tickRaw=1 while playerState=1
                // after natural completion — broadened from playerState===0 to 0|1|2.
                // Intentional seek-to-start bypasses the guard via _recentStartSeek.
                {
                    const _lastTick = lastTickRef.current ?? 0;
                    const _playerState = (api as any)?.playerState ?? -1;
                    const _intentionalTick = getIntentionalTick();
                    const _recentStartSeek =
                        (seekFreezeUntilRef.current > Date.now() && (seekTargetTickRef.current ?? Infinity) <= 1) ||
                        (typeof _intentionalTick === 'number' && _intentionalTick <= 1);
                    const _isEndResetNoise =
                        tickRaw <= 1 &&
                        !loopEnabledRef.current &&
                        !(api?.playbackRange) &&
                        _lastTick > 10000 &&
                        (_playerState === 0 || _playerState === 1 || _playerState === 2) &&
                        !_recentStartSeek;
                    // [V144.8] Always probe low ticks to confirm guard behavior
                    if (tickRaw <= 1) {
                        if (isRendererDebugEnabled()) {
                            console.warn('[song-end-hold-probe]', {
                                reason: 'portrait-low-tick-received',
                                tickRaw,
                                lastTick: _lastTick,
                                playerState: _playerState,
                                isEndResetNoiseConditionMet: _isEndResetNoise,
                                recentStartSeek: _recentStartSeek,
                                intentionalTick: _intentionalTick,
                                loopEnabled: loopEnabledRef.current,
                                hasPlaybackRange: !!(api?.playbackRange),
                                lastTickDeep: _lastTick > 10000,
                            });
                        }
                    }
                    if (_isEndResetNoise) {
                        if (isRendererDebugEnabled()) {
                            console.warn('[song-end-hold]', {
                                reason: 'suppress-portrait-end-reset-tick',
                                tickRaw,
                                lastTick: _lastTick,
                                playerState: _playerState,
                                recentStartSeek: _recentStartSeek,
                                intentionalTick: _intentionalTick,
                                seekTargetTick: seekTargetTickRef.current ?? null,
                                seekFreezeActive: seekFreezeUntilRef.current > Date.now(),
                                note: 'AlphaTab emitted post-completion tickRaw<=1 while playerState may still be 1',
                            });
                        }
                        return;
                    }
                }

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
                        if (isRendererDebugEnabled()) {
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
                // [LoopClickReseatFix] V1.8.7: During a manual loop-selection, BeatCustomLoopOverlay
                // writes api.playbackRange directly (before React state catches up). Prefer the
                // live api value in that window so the wrap guard uses the new range — not the
                // previous one — and does not falsely wrap a downward loop-click back to the old start.
                const _manualSeekAt = (window as any).__maestroManualSeek as number | undefined;
                const _recentManualSeek =
                    typeof _manualSeekAt === 'number' && Date.now() - _manualSeekAt < 500;
                const _apiRange = api.playbackRange as { startTick: number; endTick: number } | null;
                const liveRange = _recentManualSeek
                    ? (_apiRange ?? playbackRangeRef.current)
                    : (playbackRangeRef.current ?? _apiRange);
                const LOOP_WRAP_MARGIN = 30; // reduced from 120 — 120 was too aggressive for 60-tick slide subdivisions
                if (loopEnabledRef.current && liveRange) {
                    // ── [loop-click-reseat-probe] below-startTick diagnostic ──────────────
                    if (isRendererDebugEnabled() && tickRaw < liveRange.startTick) {
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
                        loopWrapInProgressRef.current = true;
                        if (isRendererDebugEnabled()) {
                            console.log('[landscape-playback-state-sync]', {
                                reason: 'loop-wrap-guard-enter',
                                tickRaw,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                apiPlayerState: (api as any)?.playerState ?? null,
                                liveRange: liveRange ?? null,
                                shouldWrap: liveRange ? tickRaw >= liveRange.endTick : false,
                                loopEnabled: loopEnabledRef.current,
                                landscapeScrollState: landscapeScrollStateRef.current,
                            });
                        }
                        if (isRendererDebugEnabled()) {
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
                        lastPlaybackOwnerRef.current = null;
                        if (isRendererDebugEnabled()) {
                            const stack = new Error().stack;
                            console.warn('[page-cursor-reset-source]', {
                                reason: 'lastTickRef-cleared',
                                site: 'loop-wrap',
                                callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                                previousLastTick: lastTickRef.current,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                            });
                        }
                        lastTickRef.current = null;
                        allowBacktrackUntilRef.current = Date.now() + 300;
                        const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                        if (isRendererDebugEnabled()) {
                            const isLandscapeNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                            console.log('[maestro-seek-diagnostic]', {
                                reason: 'loop-wrap',
                                callSite: 'playerPositionChanged-loop-wrap-guard',
                                targetTick: liveRange.startTick,
                                isLandscape: isLandscapeNow,
                                isPlaying: (api?.playerState ?? 0) === 1,
                                loopEnabled: loopEnabledRef.current,
                                playbackRangeRef: playbackRangeRef.current,
                                apiPlaybackRange: api?.playbackRange ?? null,
                                liveLoopRangeRef: liveRange,
                                loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                                lastIntentionalTick: getIntentionalTick(),
                                manualSeekAge: (window as any).__maestroManualSeek
                                    ? Date.now() - (window as any).__maestroManualSeek : null,
                                tickRaw,
                                LOOP_WRAP_MARGIN,
                                playbackRangeRefMatchesApi:
                                    playbackRangeRef.current?.startTick === (api?.playbackRange as any)?.startTick &&
                                    playbackRangeRef.current?.endTick === (api?.playbackRange as any)?.endTick,
                            });
                        }
                        // [LandscapeWrapOverrideClear] Clear pending play-start override
                        // before wrap seek. If seekTicks triggers an internal pause→resume,
                        // the isPlaying useEffect must use liveRange.startTick, not a stale
                        // inside-highlight click override (e.g. 7201 within [3840, 7680]).
                        (window as any).__maestroLoopPlayStartOverrideTick = null;
                        (window as any).__maestroLoopPlayStartOverrideTickAt = null;
                        if (isRendererDebugEnabled()) {
                            console.log('[landscape-playback-state-sync]', {
                                reason: 'loop-wrap-seek-start',
                                targetTick: liveRange.startTick,
                                tickRaw,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                apiPlayerState: (api as any)?.playerState ?? null,
                                playbackRange: api?.playbackRange ?? null,
                                landscapeScrollState: landscapeScrollStateRef.current,
                            });
                        }
                        if (seekTicks) seekTicks(liveRange.startTick);
                        api.tickPosition = liveRange.startTick;
                        if (isRendererDebugEnabled()) {
                            console.log('[landscape-playback-state-sync]', {
                                reason: 'loop-wrap-seek-after',
                                targetTick: liveRange.startTick,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                apiPlayerState: (api as any)?.playerState ?? null,
                                playbackRange: api?.playbackRange ?? null,
                            });
                        }
                        const isStripNow = forceHorizontalRef.current ||
                            (api?.settings?.display?.layoutMode === 1);
                        const wrapContainer = containerRef.current;
                        if (isStripNow && wrapContainer) {
                            const wrapTickCache = (api as any).tickCache;
                            const wrapBounds = api?.renderer?.boundsLookup;
                            const wrapTrackSet = getTrackSet(api);
                            if (wrapTickCache?.findBeat && wrapBounds?.findBeat) {
                                const wrapR = wrapTickCache.findBeat(wrapTrackSet, liveRange.startTick);
                                const wrapBb = wrapR?.beat ? wrapBounds.findBeat(wrapR.beat) : null;
                                if (wrapBb?.visualBounds) {
                                    const wrapCurBeatX = typeof wrapBb.onNotesX === 'number'
                                        ? wrapBb.onNotesX
                                        : wrapBb.visualBounds.x + wrapBb.visualBounds.w / 2;
                                    const { nextBeat: wrapNextBeat } = resolveNextBeatExpanded(
                                        api, wrapTrackSet, liveRange.startTick, wrapR.beat
                                    );
                                    let wrapNextBeatX = wrapCurBeatX;
                                    if (wrapNextBeat) {
                                        const wnBb = wrapBounds.findBeat(wrapNextBeat);
                                        if (wnBb?.visualBounds) {
                                            const wnx = typeof wnBb.onNotesX === 'number'
                                                ? wnBb.onNotesX
                                                : wnBb.visualBounds.x + wnBb.visualBounds.w / 2;
                                            if (wnx > wrapCurBeatX) wrapNextBeatX = wnx;
                                        }
                                    }
                                    landscapeScrollStateRef.current = {
                                        curBeatX: wrapCurBeatX,
                                        nextBeatX: wrapNextBeatX,
                                        beatStart: liveRange.startTick,
                                        beatDur: wrapR.beat?.playbackDuration ?? 480,
                                        lastTick: liveRange.startTick,
                                    };
                                    const wrapSnap = Math.max(0, wrapCurBeatX - getCursorSurfaceX(wrapContainer));
                                    const scrollLeftBefore = wrapContainer.scrollLeft;
                                    targetScrollLeftRef.current = wrapSnap;
                                    wrapContainer.scrollLeft = wrapSnap;
                                    if (isRendererDebugEnabled()) {
                                        console.log('[landscape-loop-wrap-visual-snap]', {
                                            reason: 'loop-wrap-visual-snap',
                                            targetTick: liveRange.startTick,
                                            curBeatX: wrapCurBeatX,
                                            nextBeatX: wrapNextBeatX,
                                            snap: wrapSnap,
                                            scrollLeftBefore,
                                            scrollLeftAfter: wrapContainer.scrollLeft,
                                            playbackRange: api?.playbackRange ?? null,
                                        });
                                    }
                                }
                            }
                        }
                        loopWrapInProgressRef.current = false;
                        return;
                    }
                }

                const tick = tickRaw;
                const lastTick = lastTickRef.current;

                // ── [resume-tick-gate] Suppress stale pre-resume frames ───────────────────
                {
                    const _resumeGateAnchor = resumeTickGateAnchorRef.current;
                    const _resumeGateActive =
                        _resumeGateAnchor != null &&
                        _resumeGateAnchor > 24 &&
                        performance.now() < resumeTickGateUntilRef.current;

                    const _isStalePreResumeTick =
                        _resumeGateActive &&
                        tick + 24 < _resumeGateAnchor;

                    if (_isStalePreResumeTick) {
                        if (isRendererDebugEnabled()) {
                            console.warn('[resume-tick-gate]', {
                                reason: 'blocked-stale-pre-resume-tick',
                                tick,
                                resumeGateAnchor: _resumeGateAnchor,
                                delta: tick - _resumeGateAnchor,
                                apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                playerState: (api as any)?.playerState ?? null,
                                lastTickRef: lastTickRef.current,
                                lastStableAnchor: lastStableRotationAnchorTickRef.current,
                                preRotationAnchor: preRotationAnchorTickRef.current,
                                seekTargetTick: seekTargetTickRef.current,
                                gateRemainingMs: Math.round(resumeTickGateUntilRef.current - performance.now()),
                            });
                        }
                        return;
                    }

                    if (_resumeGateActive && tick + 24 >= _resumeGateAnchor) {
                        const _isActuallyPlayingForResumeGate =
                            Number((api as any)?.playerState ?? 0) === 1 || isPlayingRef.current === true;

                        if (_isActuallyPlayingForResumeGate) {
                            resumeTickGateUntilRef.current = 0;
                            resumeTickGateAnchorRef.current = null;
                            if (isRendererDebugEnabled()) {
                                console.warn('[resume-tick-gate]', {
                                    reason: 'accepted-live-resume-or-later-tick',
                                    tick,
                                    resumeGateAnchor: _resumeGateAnchor,
                                    apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                    playerState: (api as any)?.playerState ?? null,
                                    isPlayingRef: isPlayingRef.current,
                                });
                            }
                        } else if (isRendererDebugEnabled()) {
                            console.warn('[resume-tick-gate]', {
                                reason: 'kept-gate-on-paused-repaint',
                                tick,
                                resumeGateAnchor: _resumeGateAnchor,
                                apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                                playerState: (api as any)?.playerState ?? null,
                                isPlayingRef: isPlayingRef.current,
                                gateRemainingMs: Math.round(resumeTickGateUntilRef.current - performance.now()),
                            });
                        }
                    }
                }

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
                        // [LoopToggleReseatAnchorFix] V145.4: preserve loop-start beat for
                        // toggle-on reasons so the visible-beat replacement guard can protect it.
                        if (reseatFlag.reason === 'loop-toggle-on' || reseatFlag.reason === 'toggle ON') {
                            loopPlayStartPreserveAbsRef.current = reseatFlag.tick ?? null;
                        }
                        (window as any).__maestroLoopReseat = null;
                        if (isRendererDebugEnabled()) {
                            console.log(`🔁 Loop reseat guard fired (${reseatFlag.reason}):`, {
                                liveTick: tick,
                                reseatTick: reseatFlag.tick,
                            });
                        }
                        cursorRef.current?.requestSnap(reseatFlag.reason ?? 'loop-reseat');
                        stableCurBeatRef.current = null;
                        stableVisualKeyRef.current = null;
                        stableExpandedBeatStartRef.current = 0;
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                        lastPlaybackOwnerRef.current = null;
                        if (isRendererDebugEnabled()) {
                            const stack = new Error().stack;
                            console.warn('[page-cursor-reset-source]', {
                                reason: 'lastTickRef-cleared',
                                site: 'loop-reseat',
                                callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                                previousLastTick: lastTickRef.current,
                                apiTickPosition: (api as any)?.tickPosition ?? null,
                                playerState: (api as any)?.playerState ?? null,
                            });
                        }
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

                let didHandleJumpSnap = false;
                if (jumped) {
                    if (hugeJump) {
                        cursorRef.current?.requestSnap('huge-jump');
                    } else {
                        cursorRef.current?.requestSnap('repeat-jump');
                    }
                    didHandleJumpSnap = true;
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
                let ownerMbIdx: number | null = null;
                let ownerOccurrence = 0;
                let ownerExpandedStart = 0;

                if (masterBarsArr?.length) {
                    const occurrenceMap = new Map<number, number>();

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

                    // [RepeatOwnerTransitionSnap] V145.10: detect repeat/volta by owner masterBar
                    // discontinuity when expanded ticks are monotonic (delta stays small).
                    const previousPlaybackOwner = lastPlaybackOwnerRef.current;
                    const hasPlaybackOwner = typeof ownerMbIdx === 'number';
                    const ownerMbIdxJumped =
                        previousPlaybackOwner !== null &&
                        hasPlaybackOwner &&
                        (
                            (ownerMbIdx as number) < previousPlaybackOwner.mbIdx ||
                            (ownerMbIdx as number) > previousPlaybackOwner.mbIdx + 1
                        );

                    if (ownerMbIdxJumped && !didHandleJumpSnap) {
                        cursorRef.current?.requestSnap('repeat-jump');
                        resetBeatAcceptance();
                        stableCurBeatRef.current = null;
                        stableExpandedBeatStartRef.current = 0;
                        stableNextBeatRef.current = null;
                        stableNextExpandedBeatStartRef.current = null;
                        stableVisualKeyRef.current = null;
                    }

                    if (hasPlaybackOwner) {
                        lastPlaybackOwnerRef.current = {
                            mbIdx: ownerMbIdx as number,
                            occurrence: typeof ownerOccurrence === 'number' ? ownerOccurrence : null,
                        };
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
                    // [LoopToggleReseatAnchorFix] V145.4: guard for toggle-on reseat.
                    // Conditions (all required):
                    //   1. activeReseatReason is toggle-on
                    //   2. liveRange.startTick is known
                    //   3. curBeatAbs is at or within 120 ticks of loop start
                    //   4. live tick is within 120 ticks of loop start (not later in the loop)
                    const _isToggleOnReseat =
                        (activeReseatReason === 'loop-toggle-on' ||
                            activeReseatReason === 'toggle ON') &&
                        liveRange?.startTick != null &&
                        curBeatAbs != null &&
                        (curBeatAbs === liveRange.startTick ||
                            curBeatAbs === preservedLoopStartAbs ||
                            Math.abs(curBeatAbs - liveRange.startTick) <= 120) &&
                        Math.abs(tick - liveRange.startTick) <= 120;

                    const isLoopPlayStart =
                        (activeReseatReason === 'loop-play-start' &&
                            preservedLoopStartAbs != null &&
                            curBeatAbs === preservedLoopStartAbs) ||
                        _isToggleOnReseat;

                    // Clear once playback advances past the protected beat
                    if (preservedLoopStartAbs != null && curBeatAbs !== preservedLoopStartAbs) {
                        loopPlayStartPreserveAbsRef.current = null;
                    }

                    if (isLoopPlayStart) {
                        // Do not replace loop start beat with first visible attack.
                        // Tied/slide lead-in beats at loop boundary should be visually honored.
                        if (_isToggleOnReseat && isRendererDebugEnabled()) {
                            console.log('[loop-toggle-reseat-anchor-fix]', {
                                reason: 'toggle-on-loop-start-preserved',
                                curBeatAbs,
                                liveRangeStartTick: liveRange?.startTick ?? null,
                                activeReseatReason,
                                loopPlayStartPreserveAbs: loopPlayStartPreserveAbsRef.current,
                                tick,
                                note: 'visible-beat replacement skipped — cursor stays at loop start',
                            });
                        }
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
                            const _v117Now = Date.now();
                            const _v117GlobalUntil = (window as any).__maestroAllowBacktrackUntil ?? 0;
                            const _v117GlobalRemaining = _v117GlobalUntil - _v117Now;
                            const _v117LocalUntil = allowBacktrackUntilRef.current ?? 0;
                            const _v117LocalRemaining = _v117LocalUntil - _v117Now;
                            const _v117LastIntentionalTick = (window as any).__maestroLastIntentionalTick;
                            const _v117BackDelta = prevAbs - incomingStart;
                            const _v117TickLeadFromIncoming = tick - incomingStart;

                            const incomingBarIdx = curBeat?.voice?.bar?.index
                                ?? curBeat?.voice?.bar?.masterBar?.index ?? null;
                            const prevBarIdx = stableCurBeatRef.current?.voice?.bar?.index
                                ?? stableCurBeatRef.current?.voice?.bar?.masterBar?.index ?? null;

                            const sameBarIntentionalBacktrack =
                                incomingBarIdx === prevBarIdx &&
                                incomingStart >= 0 &&
                                prevAbs >= 0 &&
                                incomingStart < prevAbs &&
                                typeof _v117LastIntentionalTick === 'number' &&
                                Math.abs(_v117LastIntentionalTick - prevAbs) <= 2 &&
                                _v117BackDelta > 0 &&
                                _v117BackDelta <= 720 &&
                                _v117TickLeadFromIncoming >= 0 &&
                                _v117TickLeadFromIncoming <= 720;

                            const allowBacktrack =
                                _v117GlobalRemaining > 0 ||
                                _v117LocalRemaining > 0 ||
                                sameBarIntentionalBacktrack;

                            if (allowBacktrack) {
                                if (isRendererDebugEnabled()) {
                                    console.log('[V117] structural regression allowed — manual backtrack seek', {
                                        sameBarIntentionalBacktrack,
                                    });
                                }
                            } else {
                                const regKey = `${incomingStart}:${prevAbs}`;
                                if (lastRegressionLogRef.current !== regKey) {
                                    lastRegressionLogRef.current = regKey;
                                    if (isRendererDebugEnabled()) {
                                        console.warn('[V117] structural regression discarded');
                                    }
                                }
                                if (isRendererDebugEnabled()) {
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
                                if (PAGE_ROW_DEBUG) {
                                    console.log('[page-loop-cursor-row-probe]', {
                                        reason: 'V117-regression-blocked-cursor',
                                        incomingStart,
                                        prevAbs,
                                        incomingBarIdx,
                                        prevBarIdx,
                                        tick,
                                        liveRangeStartTick: liveRange?.startTick ?? null,
                                        manualSeekAge: (window as any).__maestroManualSeek
                                            ? Date.now() - (window as any).__maestroManualSeek : null,
                                        allowBacktrackUntil: (window as any).__maestroAllowBacktrackUntil ?? null,
                                        allowBacktrackActive: Date.now()
                                            < ((window as any).__maestroAllowBacktrackUntil ?? 0),
                                        note: 'cursor blocked — loop click did not set __maestroAllowBacktrackUntil',
                                        backDelta: _v117BackDelta,
                                        tickLeadFromIncoming: _v117TickLeadFromIncoming,
                                        lastIntentionalTick: _v117LastIntentionalTick,
                                        allowBacktrack,
                                        sameBarIntentionalBacktrack,
                                    });
                                }
                                return;
                            }
                        }
                    }

                    if (!isActuallyPlaying || inBypassWindow) {
                        lastAcceptedBeatStartRef.current = incomingStart;
                    } else if (lastAcceptedBeatStartRef.current >= 0 && incomingStart < lastAcceptedBeatStartRef.current - MIN_BACKTRACK_TICKS) {
                        if (isRendererDebugEnabled()) {
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

                    // [RotationStableAnchorRef] [PlaybackLiveStableAnchor] V142: Record accepted beat.
                    // Guard: skip during settling or rotation gate. Avoid overwriting a newer live
                    // playback anchor with a much older accepted beat.
                    if (!rotationGateActiveRef.current && !isSettlingRef.current) {
                        const _beatTick = curBeat?.absolutePlaybackStart ?? tick;
                        const _prevStable = lastStableRotationAnchorTickRef.current ?? 0;
                        if (_beatTick > 1 && _beatTick > _prevStable - 240) {
                            setLastStableRotationAnchorTick(_beatTick, 'playerPositionChanged-accepted-beat');
                        }
                    }

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

                        cursorRef.current?.setLoopEndX?.(
                            sameRow && !loopEndsOnBarline ? loopEndVisualX : null
                        );
                    } else {
                        cursorRef.current?.setLoopEndX?.(null);
                    }

                    if (isRendererDebugEnabled()) {
                        const stack = new Error().stack;
                        console.warn('[page-cursor-reset-source]', {
                            reason: 'about-to-setBeat',
                            callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                            beatStart: curBeat?.absolutePlaybackStart ?? null,
                            beatBarIdx: curBeat?.voice?.bar?.masterBar?.index ?? curBeat?.voice?.bar?.index ?? null,
                            guardedStart,
                            apiTickPosition: (api as any)?.tickPosition ?? null,
                            playerState: (api as any)?.playerState ?? null,
                            lastTickRef: lastTickRef.current ?? null,
                            tick,
                        });
                    }
                    cursorRef.current.setBeat(curBeat, resolvedNextBeat, nextExpandedStart ?? null, guardedStart);
                }

                cursorRef.current.setTick(tick, stableNextBeatRef.current, stableExpandedBeatStartRef.current);

                // ── [S1] Songsterr-style snap-to-system scroll (portrait only) ──
                // DOM SVG rows measured directly — includes effect lanes in bounding rect.
                // scrollRect.top subtracted so rowRect.top is scroll-container-relative.
                // height>100 AND width>500 filters title (~69px) and tuning (~60px) SVGs.
                // Gated by MAESTRO_USE_S1_CUSTOM_SCROLL — false bypasses S1 so native
                // AlphaTab Continuous scroll can run without interference.
                if (MAESTRO_USE_S1_CUSTOM_SCROLL) {
                    const snapBounds = api.renderer?.boundsLookup;
                    const snapSystems = snapBounds?.staffSystems ?? [];
                    const snapBb = snapBounds?.findBeat?.(curBeat);
                    const beatY = snapBb?.visualBounds?.y;

                    if (beatY != null && snapSystems.length > 0) {
                        const sysIdx = findSystemIndexForY(snapSystems, beatY);
                        const previousSysIdx = lastAnchorSysRef.current;

                        if (sysIdx >= 0 && sysIdx !== lastAnchorSysRef.current) {
                            lastAnchorSysRef.current = sysIdx;
                            if (isRendererDebugEnabled()) {
                                const _c = containerRef.current;
                                console.log('[page-scroll-authority-probe]', {
                                    reason: 'S1-drift-check',
                                    anchorTick: curBeat?.absolutePlaybackStart ?? tick,
                                    sysIdx,
                                    apiTickPosition: api?.tickPosition,
                                    containerScrollTop: _c?.scrollTop ?? null,
                                    containerClientH: _c?.clientHeight ?? null,
                                    containerScrollH: _c?.scrollHeight ?? null,
                                    containerRectY: _c ? Math.round(_c.getBoundingClientRect().y) : null,
                                    trueScrollTop: _c
                                        ? (_c.scrollHeight === _c.clientHeight
                                            ? window.scrollY || document.documentElement.scrollTop || document.body?.scrollTop || 0
                                            : _c.scrollTop)
                                        : null,
                                    outerBoundingY: _c ? _c.getBoundingClientRect().y : null,
                                    containerIsScrollable: _c ? _c.scrollHeight > _c.clientHeight + 5 : null,
                                    trueScroll: _c ? getScrollParentProbe(_c) : null,
                                });
                            }

                            const scrollEl = (api.settings.player as any).scrollElement
                                ?? scrollContainer
                                ?? containerRef.current;

                            if (scrollEl) {
                                const scrollElEl = scrollEl as HTMLElement;
                                const header = document.querySelector('[data-top-menu-tray]') as HTMLElement | null;
                                const GAP = 8;
                                const maxScroll = Math.max(0, scrollElEl.scrollHeight - scrollElEl.clientHeight);
                                const scrollRect = scrollElEl.getBoundingClientRect();
                                const headerRect = header?.getBoundingClientRect() ?? null;
                                const trayBottomInScroll = headerRect ? headerRect.bottom - scrollRect.top : 0;
                                const headerH = Math.max(0, trayBottomInScroll);

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
                                        sysIdx,
                                        staffRowsLength: staffRows.length,
                                        headerH, GAP,
                                        currentScrollTop: scrollElEl.scrollTop,
                                        activeRowHeight: staffRows[sysIdx]?.getBoundingClientRect().height,
                                    });
                                }

                                // [S1-ActiveRow] Comfort-zone target: place active row headerH + COMFORT_Y
                                // below the scroll container top. sysIdx === 0 stays at top.
                                const activeRowRect = staffRows[sysIdx]?.getBoundingClientRect() ?? null;
                                const _s1ActiveRowRect: DOMRect | null = activeRowRect; // [PageScrollAuthorityFix] V143
                                let _s1ClearanceAdjust = 0; // [PageScrollAuthorityFix] V143
                                let target: number;
                                if (sysIdx === 0) {
                                    target = 0;
                                } else if (activeRowRect) {
                                    const activeRowViewportTop = activeRowRect.top - scrollRect.top;
                                    target = Math.max(
                                        0,
                                        scrollElEl.scrollTop + activeRowViewportTop - headerH - S1_ACTIVE_ROW_COMFORT_Y
                                    );
                                } else {
                                    const activeVb = (snapSystems[sysIdx] as any)?.visualBounds;
                                    target = Math.max(0, (activeVb?.y ?? 0) - headerH - S1_ACTIVE_ROW_COMFORT_Y);
                                }

                                // ── Previous-row clearance — absolute-coordinate prediction [S1-clearance] ──
                                // Old: measured prevRect.bottom in current viewport → same value
                                //      every tick → giant repeated correction → slam/bounce.
                                // New: converts prevRect.bottom to scroll-content coordinates,
                                //      then checks whether it will still be visible AFTER target
                                //      is applied. Only corrects if it would still dangle.
                                {
                                    const safeOffset = headerH + GAP;
                                    const targetBeforeClearance = target;
                                    const prevRow = sysIdx > 0 ? (staffRows[sysIdx - 1] ?? null) : null;
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
                                            _s1ClearanceAdjust = danglingAfterTarget + 3; // [PageScrollAuthorityFix]
                                            target = Math.max(0, target + _s1ClearanceAdjust);
                                        }
                                    }

                                    if (isSnapDebugEnabled()) {
                                        console.log('[S1 prev-row clearance ABS]', {
                                            sysIdx,
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

                                // [S1-ActiveRow] Prevent backward recoil on normal forward row advance.
                                // Loop wrap, upward seek, and restart allow backward scroll (no clamp).
                                const isForwardRowAdvance = previousSysIdx >= 0 && sysIdx > previousSysIdx;
                                if (isForwardRowAdvance) {
                                    target = Math.max(scrollElEl.scrollTop, target);
                                }

                                target = Math.min(target, maxScroll);

                                if (isSnapDebugEnabled()) {
                                    console.log('[S1 snap apply]', {
                                        sysIdx, previousSysIdx, isForwardRowAdvance,
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
                                // [PageScrollAuthorityFix] V143: detect real scroll authority.
                                const _s1Authority = getPageScrollAuthority(scrollElEl);
                                const _s1ContainerScrollable = scrollElEl.scrollHeight > scrollElEl.clientHeight + 5;
                                const tweenFrom = _s1ContainerScrollable
                                    ? scrollElEl.scrollTop
                                    : getPageAuthorityScrollTop(_s1Authority);
                                let tweenTo = target;
                                if (!_s1ContainerScrollable && _s1Authority.canScroll) {
                                    if (sysIdx === 0) {
                                        tweenTo = 0;
                                    } else if (_s1ActiveRowRect !== null) {
                                        tweenTo = Math.max(
                                            0,
                                            computePageAuthorityTargetTop({
                                                authority: _s1Authority,
                                                container: scrollElEl,
                                                targetRect: _s1ActiveRowRect,
                                                desiredViewportY: headerH + S1_ACTIVE_ROW_COMFORT_Y,
                                            }) + _s1ClearanceAdjust
                                        );
                                    }
                                }
                                if (isRendererDebugEnabled()) {
                                    console.log('[page-scroll-authority-apply]', {
                                        reason: 'S1-drift-check',
                                        anchorTick: curBeat?.absolutePlaybackStart ?? tick,
                                        targetTop: tweenTo,
                                        authorityKind: _s1Authority.kind,
                                        beforeScrollTop: tweenFrom,
                                        containerScrollTop: scrollElEl.scrollTop,
                                        containerIsScrollable: _s1ContainerScrollable,
                                        containerRectY: Math.round(scrollElEl.getBoundingClientRect().y),
                                    });
                                }
                                const tweenDelta = tweenTo - tweenFrom;
                                const TWEEN_MS = 150;
                                const snapAnchor = sysIdx; // capture for cancel guard

                                const _s1AnchorTick = curBeat?.absolutePlaybackStart ?? tick ?? null;
                                if (Math.abs(tweenDelta) < 2) {
                                    // Already there — skip tween
                                    if (_s1ContainerScrollable) { scrollElEl.scrollTop = tweenTo; }
                                    else { setPageAuthorityScrollTop(_s1Authority, tweenTo); }
                                    logPageScrollApplyResult({
                                        reason: 'S1-drift-check',
                                        phase: 'immediate-after-write',
                                        authority: _s1Authority,
                                        targetTop: tweenTo,
                                        container: scrollElEl,
                                        anchorTick: _s1AnchorTick,
                                    });
                                    window.setTimeout(() => {
                                        logPageScrollApplyResult({
                                            reason: 'S1-drift-check',
                                            phase: 'after-250ms',
                                            authority: _s1Authority,
                                            targetTop: tweenTo,
                                            container: scrollElEl,
                                            anchorTick: _s1AnchorTick,
                                        });
                                    }, 250);
                                    window.setTimeout(() => {
                                        logPageScrollApplyResult({
                                            reason: 'S1-drift-check',
                                            phase: 'after-750ms',
                                            authority: _s1Authority,
                                            targetTop: tweenTo,
                                            container: scrollElEl,
                                            anchorTick: _s1AnchorTick,
                                        });
                                    }, 750);
                                } else {
                                    const startTime = performance.now();
                                    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

                                    const step = (now: number) => {
                                        // Cancel if a newer snap took over
                                        if (lastAnchorSysRef.current !== snapAnchor) return;
                                        const elapsed = now - startTime;
                                        const progress = Math.min(elapsed / TWEEN_MS, 1);
                                        const _nextTop = tweenFrom + tweenDelta * easeOutCubic(progress);
                                        if (_s1ContainerScrollable) { scrollElEl.scrollTop = _nextTop; }
                                        else { setPageAuthorityScrollTop(_s1Authority, _nextTop); }
                                        if (progress < 1) {
                                            s1AnimRafRef.current = requestAnimationFrame(step);
                                        } else {
                                            // Force exact landing
                                            if (_s1ContainerScrollable) { scrollElEl.scrollTop = tweenTo; }
                                            else { setPageAuthorityScrollTop(_s1Authority, tweenTo); }
                                            logPageScrollApplyResult({
                                                reason: 'S1-drift-check',
                                                phase: 'tween-final-after-write',
                                                authority: _s1Authority,
                                                targetTop: tweenTo,
                                                container: scrollElEl,
                                                anchorTick: _s1AnchorTick,
                                            });
                                            s1AnimRafRef.current = null;
                                        }
                                    };
                                    s1AnimRafRef.current = requestAnimationFrame(step);
                                    window.setTimeout(() => {
                                        logPageScrollApplyResult({
                                            reason: 'S1-drift-check',
                                            phase: 'after-250ms',
                                            authority: _s1Authority,
                                            targetTop: tweenTo,
                                            container: scrollElEl,
                                            anchorTick: _s1AnchorTick,
                                        });
                                    }, 250);
                                    window.setTimeout(() => {
                                        logPageScrollApplyResult({
                                            reason: 'S1-drift-check',
                                            phase: 'after-750ms',
                                            authority: _s1Authority,
                                            targetTop: tweenTo,
                                            container: scrollElEl,
                                            anchorTick: _s1AnchorTick,
                                        });
                                    }, 750);
                                }

                                // ── Drift check — debug only ──────────────────────────────
                                if (isSnapDebugEnabled()) {
                                    const driftCheck = (delay: number) => {
                                        window.setTimeout(() => {
                                            if (lastAnchorSysRef.current !== sysIdx) return;
                                            const drift = scrollElEl.scrollTop - target;
                                            const scrollRectNow = scrollElEl.getBoundingClientRect();
                                            const prevNow = staffRows[sysIdx - 1]?.getBoundingClientRect();
                                            const safeNow = scrollRectNow.top + headerH + GAP;
                                            const prevDanglingNow = prevNow ? prevNow.bottom - safeNow : null;
                                            console.log('[S1 DRIFT CHECK]', {
                                                delay, sysIdx,
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
            if (isRendererDebugEnabled()) {
                const _api = apiRef.current;
                console.log('[loop-render-probe]', {
                    reason: 'manual',
                    loopEnabled: loopEnabledRef.current,
                    playbackRangeRef: playbackRangeRef.current,
                    apiPlaybackRange: (_api?.playbackRange as any) ?? null,
                    systemsLength: _api?.renderer?.boundsLookup?.staffSystems?.length ?? null,
                    firstSystemBars: (_api?.renderer?.boundsLookup?.staffSystems?.[0] as any)?.bars?.length ?? null,
                });
            }
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
            if (pendingLandscapeMismatchRecoveryRef.current != null) { window.clearTimeout(pendingLandscapeMismatchRecoveryRef.current); pendingLandscapeMismatchRecoveryRef.current = null; }
            landscapeMismatchRecoveryAttemptsRef.current = 0;
            document.querySelector('.maestro-landscape-scroll-spacer')?.remove();
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
            if (isRendererDebugEnabled()) {
                const stack = new Error().stack;
                console.warn('[page-cursor-reset-source]', {
                    reason: 'lastTickRef-cleared',
                    site: 'hardReset-fileUrl-effect',
                    callStack: stack?.split('\n').slice(1, 4).join(' | ') ?? null,
                    previousLastTick: lastTickRef.current,
                    apiTickPosition: (apiRef.current as any)?.tickPosition ?? null,
                    playerState: (apiRef.current as any)?.playerState ?? null,
                });
            }
            lastTickRef.current = null;
            lastPlaybackOwnerRef.current = null;
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
            lastStableRotationAnchorTickRef.current = null;
            if (s1AnimRafRef.current !== null) {
                cancelAnimationFrame(s1AnimRafRef.current);
                s1AnimRafRef.current = null;
            }
            delete (window as any).__maestroProbeRendererLoop;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileUrl, startLandscapeScrollLoop, stopLandscapeScrollLoop, snapPortraitToBeatRow, getRotationAnchorTick, setLastStableRotationAnchorTick, resetKey]);

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
                // Uses live api.playbackRange with playbackRangeRef.current as fallback so that
                // BeatCustomLoopOverlay writes are respected AND rotation races (where AlphaTab
                // temporarily resets api.playbackRange to null while loopEnabledRef is still true)
                // are handled correctly. Fallback prevents PlayStartBeatNormalization from running
                // in Loop mode and ensures the loop re-prime can fire even after api.playbackRange reset.
                const liveLoopRange = loopEnabledRef.current
                    ? ((api.playbackRange ?? playbackRangeRef.current) as { startTick: number; endTick: number } | null)
                    : null;
                if (liveLoopRange?.startTick != null) {
                    const overrideTick = (window as any).__maestroLoopPlayStartOverrideTick;
                    const hasValidOverride =
                        typeof overrideTick === 'number' &&
                        overrideTick >= liveLoopRange.startTick &&
                        overrideTick < liveLoopRange.endTick;
                    const primeT = hasValidOverride ? overrideTick : liveLoopRange.startTick;
                    // [LandscapePlaybackAnchorScope] One-shot: clear override after first Play use.
                    // Also clears the timestamp companion so BeatCustomLoopOverlay TTL checks
                    // don't resurrect a stale override after it was consumed here.
                    if (hasValidOverride) {
                        (window as any).__maestroLoopPlayStartOverrideTick = null;
                        (window as any).__maestroLoopPlayStartOverrideTickAt = null;
                    }
                    if (isRendererDebugEnabled()) {
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
                    if (isRendererDebugEnabled()) {
                        const isLandscapeNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                        console.log('[maestro-seek-diagnostic]', {
                            reason: 'loop-play-start',
                            callSite: 'isPlaying-useEffect',
                            targetTick: primeT,
                            isLandscape: isLandscapeNow,
                            isPlaying: (api?.playerState ?? 0) === 1,
                            loopEnabled: loopEnabledRef.current,
                            playbackRangeRef: playbackRangeRef.current,
                            apiPlaybackRange: api?.playbackRange ?? null,
                            liveLoopRangeRef: liveLoopRange,
                            loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                            lastIntentionalTick: getIntentionalTick(),
                            loopPlayStartOverrideTick: overrideTick,
                            hasValidOverride,
                            manualSeekAge: (window as any).__maestroManualSeek
                                ? Date.now() - (window as any).__maestroManualSeek : null,
                            // KEY QUESTION: is primeT driven by intentional tick or loop start?
                            primeTSource: hasValidOverride ? '__maestroLoopPlayStartOverrideTick' : 'liveLoopRange.startTick',
                            primeTMatchesIntentionalTick: primeT === getIntentionalTick(),
                            primeTMatchesLoopStart: primeT === liveLoopRange.startTick,
                            note: hasValidOverride && primeT !== liveLoopRange.startTick
                                ? 'OVERRIDE ACTIVE — seekTicks will go to override, not loop start. This is the likely source of seek-to-7201.'
                                : 'seeking to loop start (correct)',
                        });
                    }
                    if (isRendererDebugEnabled()) {
                        console.log('[explicit-seek-probe]', {
                            reason: 'loop-play-start-seekTicks',
                            seekTargetTick: primeT,
                            seekTargetMs: null,
                            beforeTick: (api as any)?.tickPosition ?? null,
                            playerState: (api as any)?.playerState ?? null,
                            lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                            preRotationAnchorTick: preRotationAnchorTickRef.current,
                            landscapeScrollState: landscapeScrollStateRef.current,
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
                }
                // ── END loop-start cursor re-prime ────────────────────────────────────────

                if (isRendererDebugEnabled()) {
                    console.log('[pause-anchor-normalization-probe]', {
                        reason: 'api.play-call',
                        beforeApiTick: (api as any)?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        landscapeScrollState: landscapeScrollStateRef.current,
                    });
                }
                // [PlayStartHardSnapInFlightGuard] Arm before seekTicks so any synchronous or
                // immediately-queued playerPositionChanged / renderFinished work sees the guard
                // as true. requestSnap('play-start-hard-snap') is still deferred until after
                // normalization. Fallback clear prevents the ref from sticking if api.play()
                // fails or playerStateChanged never fires with state 1.
                if (!forceHorizontalRef.current && cursorRef.current) {
                    if (playStartHardSnapFallbackTimerRef.current !== null) {
                        window.clearTimeout(playStartHardSnapFallbackTimerRef.current);
                        playStartHardSnapFallbackTimerRef.current = null;
                    }
                    // Capture previous in-flight state before overwriting it.
                    // Only reset the already-armed guard when this is a genuinely new play
                    // attempt. If the effect re-runs mid-handoff (playStartHardSnapInFlightRef
                    // already true), do NOT clear a snap that was already armed for this run.
                    const _wasAlreadyInFlight = playStartHardSnapInFlightRef.current;
                    playStartHardSnapInFlightRef.current = true;
                    playStartHardSnapArmedAtRef.current = performance.now();
                    if (!_wasAlreadyInFlight) {
                        playStartHardSnapAlreadyArmedRef.current = false;
                    }
                    playStartHardSnapFallbackTimerRef.current = window.setTimeout(() => {
                        playStartHardSnapFallbackTimerRef.current = null;
                        playStartHardSnapInFlightRef.current = false;
                        playStartHardSnapArmedAtRef.current = null;
                        playStartHardSnapAlreadyArmedRef.current = false;
                    }, 1500);
                }
                // [RemovePlayStartBeatNormalization] V145.7: removed — see lock note at top of file.
                const didNormalizeAndSeekForPlayStart = false;
                // [PagePlayStartHardSnapGateFix] V145.3: synchronous after normalization,
                // before api.play(). The previous RAF deferral was a race — a queued
                // paused-position playerPositionChanged could fire before the RAF, calling
                // setBeat with stale lastTickApplied=1443 before forceHardSnapNextSetBeat
                // was armed. Running here guarantees lastTickApplied=-1 and
                // forceHardSnapNextSetBeat=true before any audio-worker event can land.
                // Skip re-arm when normalization already called seekTicks — hard snap was
                // already armed before the seek, and arming again would produce a second
                // play-start-hard-snap that survives until the next live setBeat.
                if (!forceHorizontalRef.current && !didNormalizeAndSeekForPlayStart && !playStartHardSnapAlreadyArmedRef.current) {
                    if (isRendererDebugEnabled()) {
                        console.warn('[page-cursor-reset-source]', {
                            reason: 'about-to-request-play-start-hard-snap',
                            site: 'post-normalization-fallback',
                            didNormalizeAndSeekForPlayStart,
                            playStartHardSnapInFlight: playStartHardSnapInFlightRef.current,
                            apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                            playerState: (api as any)?.playerState ?? null,
                            lastTickRef: lastTickRef.current,
                            seekTargetTick: seekTargetTickRef.current,
                            lastStableAnchor: lastStableRotationAnchorTickRef.current,
                        });
                    }
                    cursorRef.current?.requestSnap?.('play-start-hard-snap');
                    playStartHardSnapAlreadyArmedRef.current = true;
                    if (isRendererDebugEnabled()) {
                        console.warn('[page-play-start-hard-snap]', {
                            reason: 'sync-after-normalization',
                            apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                            playerState: Number((api as any)?.playerState ?? -1),
                            isPlayingRef: isPlayingRef.current,
                            seekTargetTick: seekTargetTickRef.current ?? null,
                            lastIntentionalTick:
                                typeof window !== 'undefined'
                                    ? (window as any).__maestroLastIntentionalTick ?? null
                                    : null,
                            rotationGateActive: rotationGateActiveRef.current,
                            isSettling: isSettlingRef.current,
                            forceHorizontal: forceHorizontalRef.current,
                            layoutMode: (api as any)?.settings?.display?.layoutMode ?? null,
                            lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                            preRotationAnchorTick: preRotationAnchorTickRef.current,
                        });
                    }
                }
                {
                    const _resumeGateAnchor =
                        Number((api as any)?.tickPosition ?? 0) ||
                        lastTickRef.current ||
                        lastStableRotationAnchorTickRef.current ||
                        preRotationAnchorTickRef.current ||
                        null;
                    if (_resumeGateAnchor != null && _resumeGateAnchor > 24) {
                        resumeTickGateAnchorRef.current = _resumeGateAnchor;
                        resumeTickGateUntilRef.current = performance.now() + 400;
                    }
                }
                // [LoopPlaybackRangeRotationRestore] If loop is active and liveLoopRange was
                // recovered from playbackRangeRef.current (rotation race: api.playbackRange is
                // null but React state still has the range), restore api.playbackRange before
                // api.play() so AlphaTab actually loops. Without this, api.play() would start
                // without a loop range and play through to the end of the song.
                if (loopEnabledRef.current && liveLoopRange != null && api.playbackRange == null) {
                    console.warn('[loop-playback-range-restore]', {
                        reason: 'restored-api-playbackRange-before-play',
                        liveLoopRange,
                        apiPlaybackRangeBefore: api.playbackRange ?? null,
                        apiTickPosition: Number((api as any)?.tickPosition ?? 0),
                        lastTickRef: lastTickRef.current,
                        lastStableAnchor: lastStableRotationAnchorTickRef.current,
                        preRotationAnchor: preRotationAnchorTickRef.current,
                        playerState: (api as any)?.playerState ?? null,
                    });
                    api.playbackRange = liveLoopRange;
                }
                api.play();
            } else {
                if (isRendererDebugEnabled()) {
                    console.log('[pause-anchor-normalization-probe]', {
                        reason: 'api.pause-call',
                        beforeApiTick: (api as any)?.tickPosition ?? null,
                        playerState: (api as any)?.playerState ?? null,
                        isPlayingRef: isPlayingRef.current,
                        playbackRange: api?.playbackRange ?? null,
                        lastStableRotationAnchorTick: lastStableRotationAnchorTickRef.current,
                        preRotationAnchorTick: preRotationAnchorTickRef.current,
                        landscapeScrollState: landscapeScrollStateRef.current,
                    });
                }
                // [PlaybackLiveStableAnchor] V142: Capture live tick before AlphaTab normalizes on pause.
                // AlphaTab can silently seek backward to a beat/bar boundary after pause.
                // Preserve the latest valid live visual/audio tick first.
                {
                    const _apiTick = (api as any)?.tickPosition;
                    const _landscapeLastTick = landscapeScrollStateRef.current?.lastTick ?? null;
                    const _candidates = [_apiTick, _landscapeLastTick]
                        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 1);
                    const _livePauseTick = _candidates.length ? Math.max(..._candidates) : null;
                    if (_livePauseTick && _livePauseTick > 1) {
                        const _prevStable = lastStableRotationAnchorTickRef.current ?? null;
                        setLastStableRotationAnchorTick(_livePauseTick, 'pre-pause-live-anchor');
                        if (isRendererDebugEnabled() && shouldLogDiagnostic('playback-live-stable-anchor', _livePauseTick ?? null, 1000, 480)) {
                            console.log('[playback-live-stable-anchor]', {
                                reason: 'pre-pause-capture',
                                livePauseTick: _livePauseTick,
                                previousStable: _prevStable,
                                apiTickPosition: _apiTick ?? null,
                                landscapeLastTick: _landscapeLastTick,
                                playerState: (api as any)?.playerState ?? null,
                                landscapeScrollState: landscapeScrollStateRef.current,
                            });
                        }
                    }
                }
                api.pause();
                applyScrollMode(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [isPlaying, isSettling, applyScrollMode, setLastStableRotationAnchorTick, shouldLogDiagnostic]);

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
                        if ((api?.playerState ?? 0) === 1) {
                            if (isRendererDebugEnabled()) {
                                console.log('[landscape-playback-state-sync]', {
                                    reason: 'onPlayStateChange-false-call',
                                    apiPlayerState: (api as any)?.playerState ?? null,
                                    apiTickPosition: (api as any)?.tickPosition ?? null,
                                    loopEnabled: loopEnabledRef.current,
                                    playbackRange: api?.playbackRange ?? null,
                                    landscapeScrollState: landscapeScrollStateRef.current,
                                });
                            }
                            api.pause(); onPlayStateChange(false);
                        }
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
                        if ((api.playerState ?? 0) === 1) {
                            if (isRendererDebugEnabled()) {
                                console.log('[landscape-playback-state-sync]', {
                                    reason: 'onPlayStateChange-false-call',
                                    apiPlayerState: (api as any)?.playerState ?? null,
                                    apiTickPosition: (api as any)?.tickPosition ?? null,
                                    loopEnabled: loopEnabledRef.current,
                                    playbackRange: api?.playbackRange ?? null,
                                    landscapeScrollState: landscapeScrollStateRef.current,
                                });
                            }
                            api.pause(); onPlayStateChange(false);
                        } else { api.play(); onPlayStateChange(true); }
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
                                    // [StaleStartAnchorOverride] V145: publish authoritative intent so
                                    // rotation/prime paths trust this seek over stale cached anchors.
                                    (window as any).__maestroLastIntentionalTick = bestTick;
                                    (window as any).__maestroLastIntentionalTickAt = Date.now();
                                    preRotationAnchorTickRef.current = bestTick;
                                    const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                                    if (isRendererDebugEnabled()) {
                                        const isLandscapeNow = forceHorizontalRef.current || (api?.settings?.display?.layoutMode === 1);
                                        console.log('[maestro-seek-diagnostic]', {
                                            reason: 'touch-drag-seek',
                                            callSite: 'handleTouchEnd',
                                            targetTick: bestTick,
                                            isLandscape: isLandscapeNow,
                                            isPlaying: (api?.playerState ?? 0) === 1,
                                            loopEnabled: loopEnabledRef.current,
                                            playbackRangeRef: playbackRangeRef.current,
                                            apiPlaybackRange: api?.playbackRange ?? null,
                                            liveLoopRangeRef: loopEnabledRef.current
                                                ? (api?.playbackRange ?? null) : null,
                                            loopReseatFlag: (window as any).__maestroLoopReseat ?? null,
                                            lastIntentionalTick: getIntentionalTick(),
                                            manualSeekAge: (window as any).__maestroManualSeek
                                                ? Date.now() - (window as any).__maestroManualSeek : null,
                                            scrollLeft: container.scrollLeft,
                                            beatXUnderCursor,
                                            bestX,
                                        });
                                    }
                                    if (seekTicks) seekTicks(bestTick);
                                    api.tickPosition = bestTick;
                                    resetBeatAcceptance();
                                    setLastStableRotationAnchorTick(bestTick, 'touch-seek');
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
            publishCursorAtTickRef.current = publishCursorAtTick;

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
                // [ExactOnsetClickSeek] V145.11: seek to exact expanded NoteOn boundary.
                // target + 2 caused AlphaSynth to miss the first NoteOn after repeat clicks.
                const safeTarget = target;
                seekTargetTickRef.current = safeTarget;
                seekFreezeUntilRef.current = Date.now() + 250;
                // [StaleStartAnchorOverride] V145: publish authoritative intent so
                // rotation/prime paths trust this seek over stale cached anchors.
                (window as any).__maestroLastIntentionalTick = safeTarget;
                (window as any).__maestroLastIntentionalTickAt = Date.now();
                preRotationAnchorTickRef.current = safeTarget;
                const wasPlaying = (api.playerState ?? 0) === 1;
                const tok = ++seekTokenRef.current;
                if (resumeTimerRef.current !== null) { window.clearTimeout(resumeTimerRef.current); resumeTimerRef.current = null; }
                if (wasPlaying) { seekInProgressRef.current = true; api.pause(); }
                const seekTicks = api.player?.seekTicks?.bind(api.player) ?? api.seekTicks?.bind(api);
                if (seekTicks) seekTicks(safeTarget);
                // [ClickSeekBacktrackParity] Arm V117 backtrack window before api.tickPosition
                // which can synchronously fire playerPositionChanged. Without this, AlphaSynth
                // same-bar lookahead events (e.g. tick 480 after seek to 600) are blocked by
                // V117 because only BeatCustomLoopOverlay previously set this global.
                (window as any).__maestroAllowBacktrackUntil = Date.now() + 600;
                api.tickPosition = safeTarget;
                resetBeatAcceptance();
                setLastStableRotationAnchorTick(safeTarget, 'click-seek');
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
                if (api.playerState !== 0) {
                    if (isRendererDebugEnabled()) {
                        console.log('[landscape-playback-state-sync]', {
                            reason: 'onPlayStateChange-false-call',
                            apiPlayerState: (api as any)?.playerState ?? null,
                            apiTickPosition: (api as any)?.tickPosition ?? null,
                            loopEnabled: loopEnabledRef.current,
                            playbackRange: api?.playbackRange ?? null,
                            landscapeScrollState: landscapeScrollStateRef.current,
                        });
                    }
                    api.pause(); onPlayStateChange(false);
                } else { api.play(); onPlayStateChange(true); }
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
                                    onLoopClickSeek={(tick) => {
                                        const publishCursorAtTick = publishCursorAtTickRef.current;
                                        if (!publishCursorAtTick) return false;
                                        publishCursorAtTick(tick);
                                        return true;
                                    }}
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