'use client';

/**
 * Last Updated June 12th, 2026
 * Version V1.5
 * File: components/alphaTab/MaestroCursor2.tsx
 *
 * V1.5 LOCKS:
 * ✅ [FirstTickSmallMoveBypass] After a fresh setBeat/hard-snap anchor, Cursor2 allows
 *    the first few live setTick transforms to render even when movement is under the
 *    normal 0.5px suppression threshold. This eliminates direct chord-start micro-pause
 *    on slow/long chords while preserving the normal tiny-move throttle afterward.
 *
 * V1.2 patch (loop-reseat out-of-order guard fix):
 *   ✅ requestSnap() now fully resets the out-of-order guard state:
 *      lastX, lastY reset to -9999 so the next setBeat() is never rejected
 *      as "out-of-order" after a loop reseat or seek.
 *      Root cause: on loop-reseat, CursorV2 still had stale lastX from the
 *      previous pass. The first valid beat in M24 (newNoteX ~923) was behind
 *      stale lastX, so it was discarded as out-of-order. Subsequent passes
 *      worked because lastX had naturally advanced past that point.
 *      Fix: requestSnap() is the correct reset boundary — it already clears
 *      lastTickApplied; now it also clears lastX/lastY so the order guard
 *      starts fresh. hasInitialPosition is NOT reset — the cursor remains
 *      visible between loop passes.
 *
 * v1.1 changes (V105 renderer compat):
 *   ✅ Renderer D1 gate now blocks out-of-order beats upstream — cursor
 *      out-of-order guard is defense-in-depth, not primary filter.
 *   ✅ stayPutMode: hard freeze → micro-drift (4px over beat duration).
 *   ✅ lastValidRatio: ratio memory only updates from clean scans.
 *
 * V1.1 patch (V115 renderer compat):
 *   ✅ requestSnap(_reason?: string) — optional reason arg for interface parity.
 *
 * Philosophy: ANCHOR-LERP, not hitbox-math.
 * Three "Mole Killers":
 *   [M1] onNotesX Priority     — anchors on note head, not box center
 *   [M2] Hard Snap on tick≤0   — forces M1 position, kills measure-1 skip
 *   [M3] LERP is invincible    — constant walk speed ignores SVG box widths
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PRIMARY_BEAT_TICKS = 30;

// [PageCursorPlayStartHardSnap] V145.2 — clear interpolation memory on click/touch/play-start hard snaps.
// These reasons trigger forceHardSnapNextSetBeat so the following setBeat fully resets
// interpolation state instead of inheriting stale tween position from a previous session.
const HARD_SNAP_REASONS = new Set([
    'click-seek',
    'touch-seek',
    'song-load',
    'huge-jump',
    'loop-wrap',
    'loop-reseat',
    'play-start-hard-snap',
]);
const BACKSTEP_PX = 2;
const BAR_WIDTH = 14;
const BAR_COLOR = 'rgba(0, 204, 170, 0.42)';
const SPINE_COLOR = 'rgba(0, 220, 185, 0.85)';
function cursor2DiagEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        (window as any).CURSOR2_DIAG === true ||
        (window as any).LANDSCAPE_LOOP_DEBUG === true ||
        window.localStorage?.getItem('CURSOR2_DIAG') === 'true'
    );
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class MaestroCursorV2 {
    public element: HTMLElement;
    private api: any;

    private currentNoteX = 0;
    private currentY = 0;
    private currentH = 0;

    private nextNoteX: number | null = null;
    private stayPutMode = false;
    // [LoopEndXClamp] Visual-only interpolation ceiling for mid-bar loop endings.
    // Set by AlphaTabRenderer via setLoopEndX(). Must be null for barline-to-barline
    // loops and intermediate rows — see LoopEndXClamp lock in AlphaTabRenderer.tsx.
    private loopEndX: number | null = null;

    private beatStart = 0;
    private expandedBeatDuration = 0;
    private lastValidRatio = 1.0;

    private lastTickApplied = -1;

    private lastX = -9999;
    private lastY = -9999;
    private lastH = -1;

    private lastBeatX = -9999;   // note-head X of last accepted setBeat (ordering guard only)
    private lastBeatY = -9999;   // vb.y of last accepted setBeat (ordering guard only)

    private hasInitialPosition = false;
    // [PageCursorPlayStartHardSnap] V145.2: set by requestSnap for HARD_SNAP_REASONS;
    // causes the next setBeat to flush all interpolation state before re-anchoring.
    private forceHardSnapNextSetBeat = false;
    private tickDiagCount = 0;
    private forceRenderSmallMoveTicks = 0;
    private isLiveTickTransform = false;

    // [ClickSeekRowStartSuppress] V145.6: set by requestSnap for manual seek reasons
    // so the immediately following setBeat does not arm a row-start glide.
    private suppressNextRowStart = false;

    // [RowStartAnchorGlide] V145.6: temporary left-barline anchor for row transitions.
    private rowStartX: number | null = null;
    private rowStartY: number | null = null;
    private rowStartTargetX: number | null = null;
    private rowStartBeatStart: number | null = null;

    // [RowStartOffsetDecay] V1.6: decaying visual offset so the row-start distance
    // spreads across 2 beats instead of being crammed into one beat's Math.pow curve.
    private rowStartOffsetX: number | null = null;
    private rowStartOffsetBeatStart: number | null = null;
    private rowStartOffsetDuration: number | null = null;

    constructor(api: any, container: HTMLElement) {
        this.api = api;

        this.element = document.createElement('div');
        this.element.id = 'maestro-cursor-v2';
        this.element.className = 'maestro-cursor-v2';

        Object.assign(this.element.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: `${BAR_WIDTH}px`,
            pointerEvents: 'none',
            zIndex: '99998',
            willChange: 'transform',
            overflow: 'visible',
            visibility: 'hidden',
            opacity: '0',
            transform: 'translate3d(-100vw, 0px, 0px)',
            transition: 'none',
        });

        container.appendChild(this.element);
        this._renderBarSVG(80);
        console.log('✅ MaestroCursorV2 (Songsterr Edition): Ready');
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    setBeat(
        beat: any | null,
        preScannedNextBeat: any | null = null,
        nextExpandedBeatStart: number | null = null,
        expandedBeatStart: number | null = null,
    ): void {
        console.warn('[maestro-cursor2-reset-source]', {
            method: 'setBeat',
            beatStart: beat?.absolutePlaybackStart ?? null,
            beatBarIdx: beat?.voice?.bar?.masterBar?.index ?? beat?.voice?.bar?.index ?? null,
            nextBeatStart: preScannedNextBeat?.absolutePlaybackStart ?? null,
            guardedStart: expandedBeatStart,
            callStack: new Error().stack?.split('\n').slice(1, 4).join(' | ') ?? null,
        });
        if (!beat) { this._hide(); return; }

        const _incomingScanStart =
            expandedBeatStart ??
            beat?.absolutePlaybackStart ??
            beat?.playbackStart ??
            null;
        if (cursor2DiagEnabled()) {
            console.warn('[cursor2-interpolation-probe]', {
                phase: 'setBeat-entry',
                incomingScanStart: _incomingScanStart,
                incomingBeatAbsStart: beat?.absolutePlaybackStart ?? null,
                incomingBeatPlaybackStart: beat?.playbackStart ?? null,
                incomingBeatDuration: beat?.playbackDuration ?? beat?.duration ?? null,
                incomingBeatBarIdx:
                    beat?.voice?.bar?.masterBar?.index ??
                    beat?.voice?.bar?.index ??
                    null,
                preScannedNextBeatStart:
                    preScannedNextBeat?.absolutePlaybackStart ??
                    preScannedNextBeat?.playbackStart ??
                    null,
                preScannedNextBeatBarIdx:
                    preScannedNextBeat?.voice?.bar?.masterBar?.index ??
                    preScannedNextBeat?.voice?.bar?.index ??
                    null,
                nextExpandedBeatStart,
                expandedBeatStart,
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                apiPlaybackRangeStart: (this.api as any)?.playbackRange?.startTick ?? null,
                apiPlaybackRangeEnd: (this.api as any)?.playbackRange?.endTick ?? null,
                currentNoteXBefore: this.currentNoteX,
                beatStartBefore: this.beatStart,
                expandedBeatDurationBefore: this.expandedBeatDuration,
                nextNoteXBefore: this.nextNoteX,
                loopEndX: this.loopEndX,
                forceHardSnapNextSetBeat: this.forceHardSnapNextSetBeat,
            });
            console.warn('[cursor2-setbeat-timing-probe]', {
                incomingScanStart: _incomingScanStart,
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                previousBeatStart: this.beatStart,
                previousLastX: this.lastX,
                previousCurrentNoteX: this.currentNoteX,
                previousNextNoteX: this.nextNoteX,
                previousExpandedBeatDuration: this.expandedBeatDuration,
            });
        }

        // [PageCursorPlayStartHardSnap] V145.2: flush stale interpolation memory so this
        // setBeat hard-places the cursor without animating from a previous tween position.
        if (this.forceHardSnapNextSetBeat) {
            const _prevX = this.currentNoteX;
            const _prevY = this.currentY;
            this.beatStart = 0;
            this.expandedBeatDuration = 0;
            this.lastValidRatio = 1.0;
            this.lastTickApplied = -1;
            this.forceHardSnapNextSetBeat = false;
            console.warn('[maestro-cursor2-hard-snap]', {
                reason: 'forceHardSnapNextSetBeat',
                phase: 'setBeat',
                scanStart: beat?.absolutePlaybackStart ?? null,
                currentNoteX: _prevX,
                currentY: _prevY,
                previousRenderX: this.lastX,
                previousTargetX: this.nextNoteX,
                forceHardSnapNextSetBeat: false,
            });
        }

        const dur = beat.playbackDuration ?? beat.duration ?? 0;
        const bb = this.api?.renderer?.boundsLookup?.findBeat(beat);
        if (!bb?.visualBounds) { this._hide(); return; }
        const vb = bb.visualBounds;

        // ── Grace note guard ─────────────────────────────────────────────────
        if (dur < MIN_PRIMARY_BEAT_TICKS && this.hasInitialPosition) {
            this.currentY = vb.y;
            this.currentH = vb.h;
            return;
        }

        // ── Primary beat — full anchor update ───────────────────────────────
        const scanStart = expandedBeatStart
            ?? beat.absolutePlaybackStart
            ?? beat.playbackStart
            ?? 0;

        this.beatStart = scanStart;

        const computedDur = nextExpandedBeatStart != null
            ? nextExpandedBeatStart - scanStart
            : dur;
        const computedRatio = dur > 0 ? computedDur / dur : 1;

        if (computedDur >= MIN_PRIMARY_BEAT_TICKS && computedRatio >= 0.5 && computedRatio <= 3.0) {
            this.expandedBeatDuration = computedDur;
            this.lastValidRatio = computedRatio;
        } else {
            this.expandedBeatDuration = Math.round(dur * this.lastValidRatio);
            if (this.expandedBeatDuration < MIN_PRIMARY_BEAT_TICKS) {
                this.expandedBeatDuration = dur;
            }
        }

        // ── Out-of-order guard ───────────────────────────────────────────────
        // Defense-in-depth: renderer D1 gate is primary filter.
        // lastBeatX/lastBeatY track only setBeat-accepted positions; setTick
        // interpolation advancing lastX cannot contaminate this guard.
        const newNoteX = typeof bb.onNotesX === 'number' ? bb.onNotesX : vb.x;
        const sameRowAsLast = Math.abs(vb.y - this.lastBeatY) < 5;
        const isOutOfOrder = sameRowAsLast && this.lastBeatX > -9000
            && newNoteX < this.lastBeatX - BACKSTEP_PX;
        if (isOutOfOrder) {
            console.log('[CursorV2] out-of-order beat discarded', { scanStart, newNoteX: newNoteX.toFixed(1) });
            return;
        }

        this.tickDiagCount = 0;
        // [FirstTickSmallMoveBypass] V1.5: after a new anchor, allow the first few
        // live tick transforms through even if movement is below the normal 0.5px
        // suppression threshold. This prevents slow chord starts from visually freezing.
        this.forceRenderSmallMoveTicks = 4;

        // Capture previous position before overwriting — used by the robust row-change
        // detector below, which must survive play-start-hard-snap clearing lastBeatY.
        const previousRowY = this.currentY;
        const previousRowX = this.currentNoteX;

        this.currentNoteX = newNoteX;
        this.currentY = vb.y;
        this.currentH = vb.h;

        // ── Row-start glide anchor ────────────────────────────────────────────
        // [RowStartAnchorGlide] V145.6: on a row transition, record the row's left
        // barline so setTick can glide from there to the first notehead.
        // Two signals arm rowChanged so direct-start on the last beat before a wrap
        // is also caught even when play-start-hard-snap has cleared lastBeatY/-9999.
        const yRowChanged =
            (this.lastBeatY > -9000 && Math.abs(vb.y - this.lastBeatY) >= 5) ||
            (previousRowY > 0 && Math.abs(vb.y - previousRowY) >= 5);
        const xWrappedLeft =
            previousRowX > -9000 &&
            newNoteX < previousRowX - 50;
        const rowChanged = (yRowChanged || xWrappedLeft) && !this.suppressNextRowStart;
        // [ClickSeekRowStartSuppress] V145.6: consume the suppression flag now regardless
        // of whether rowChanged fired, so it does not bleed into the next natural beat.
        this.suppressNextRowStart = false;
        if (rowChanged) {
            const _masterBar = beat?.voice?.bar?.masterBar;
            const _mbBounds = _masterBar
                ? this.api?.renderer?.boundsLookup?.findMasterBar?.(_masterBar)
                : null;
            const _mbX = _mbBounds?.visualBounds?.x ?? null;
            if (_mbX !== null && isFinite(_mbX) && _mbX < this.currentNoteX) {
                this.rowStartX = _mbX - BAR_WIDTH / 2;
                this.rowStartY = this.currentY;
                this.rowStartTargetX = this.currentNoteX - BAR_WIDTH / 2;
                this.rowStartBeatStart = scanStart;
                // rowStartOffset arming removed — A/B confirmed the runway pullback
                // causes Beat 1 to land late at row wraps. Offset fields stay null;
                // rowStartX/Y/Target/BeatStart still anchor the visual snap position.
                this.rowStartOffsetX = null;
                this.rowStartOffsetBeatStart = null;
                this.rowStartOffsetDuration = null;
            } else {
                this.rowStartX = null;
                this.rowStartY = null;
                this.rowStartTargetX = null;
                this.rowStartBeatStart = null;
                this.rowStartOffsetX = null;
                this.rowStartOffsetBeatStart = null;
                this.rowStartOffsetDuration = null;
            }
        } else {
            // Normal same-row beat change — clear visual anchor fields only.
            // rowStartOffset* fields must NOT be cleared here; they decay independently
            // over rowStartOffsetDuration ticks and are only cleared by:
            //   1. setTick when elapsed >= rowStartOffsetDuration
            //   2. requestSnap (explicit seek/reset)
            //   3. a new row-start offset arming and replacing them
            this.rowStartX = null;
            this.rowStartY = null;
            this.rowStartTargetX = null;
            this.rowStartBeatStart = null;
        }

        // ── Resolve next anchor (LERP target) ────────────────────────────────
        this.nextNoteX = null;
        this.stayPutMode = false;
        const nextCandidate = preScannedNextBeat ?? null;

        if (nextCandidate) {
            const nextDur = nextCandidate.playbackDuration ?? nextCandidate.duration ?? 0;
            if (nextDur >= MIN_PRIMARY_BEAT_TICKS) {
                const nb = this.api?.renderer?.boundsLookup?.findBeat(nextCandidate);
                if (nb?.visualBounds) {
                    const nx = typeof nb.onNotesX === 'number'
                        ? nb.onNotesX
                        : nb.visualBounds.x;
                    const sameRow = Math.abs(nb.visualBounds.y - this.currentY) < 5;
                    if (sameRow && nx > this.currentNoteX + 0.5) {
                        this.nextNoteX = nx;
                    } else if (sameRow && nx <= this.currentNoteX + 0.5) {
                        this.stayPutMode = true;
                    }
                }
            }
        }

        (this as any)._currentBeat = beat;

        const finalX = this.currentNoteX - BAR_WIDTH / 2;
        const finalY = this.currentY;
        const sameRow = Math.abs(finalY - this.lastBeatY) < 5;
        const isBackward = sameRow && this.lastBeatX > -9000
            && finalX < (this.lastBeatX - BAR_WIDTH / 2) - BACKSTEP_PX;
        if (cursor2DiagEnabled()) {
            console.warn('[cursor2-interpolation-probe]', {
                phase: 'setBeat-resolved',
                scanStart,
                computedDur,
                computedRatio,
                finalExpandedBeatDuration: this.expandedBeatDuration,
                currentNoteX: this.currentNoteX,
                currentY: this.currentY,
                currentH: this.currentH,
                nextNoteX: this.nextNoteX,
                stayPutMode: this.stayPutMode,
                finalX,
                finalY,
                isBackward,
                lastX: this.lastX,
                lastY: this.lastY,
                lastBeatX: this.lastBeatX,
                lastBeatY: this.lastBeatY,
                loopEndX: this.loopEndX,
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                apiPlaybackRangeStart: (this.api as any)?.playbackRange?.startTick ?? null,
            });
        }
        this._applyTransform(finalX, finalY, this.currentH, /* snap */ !isBackward);
        // [RowStartAnchorGlide] V145.6: prime lastX to the glide origin so the backstep
        // clamp in _applyTransform doesn't suppress the first row-start glide frames.
        // The snap above set lastX to currentNoteX - BAR_WIDTH/2 (the notehead); row-start
        // glide will try to go left of that, which would trigger the clamp without this reset.
        if (this.rowStartX !== null) {
            this.lastX = this.rowStartX;
        }
        this.hasInitialPosition = true;
        this.lastBeatX = this.currentNoteX;
        this.lastBeatY = this.currentY;
        this._show();

        console.log('[CursorV2] setBeat', {
            scanStart,
            expandedDur: this.expandedBeatDuration,
            ratio: dur > 0 ? (this.expandedBeatDuration / dur).toFixed(2) : 'n/a',
            currentNoteX: this.currentNoteX.toFixed(1),
            currentY: Number(this.currentY.toFixed(1)),
            nextNoteX: (this.nextNoteX as number | null)?.toFixed(1) ?? '—',
            beatBarIdx: beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index ?? null,
        });
    }

    setLoopEndX(x: number | null): void {
        if (cursor2DiagEnabled()) {
            const masterBar = this.currentBeat?.voice?.bar?.masterBar;
            const mbBounds = masterBar
                ? this.api?.renderer?.boundsLookup?.findMasterBar?.(masterBar)
                : null;
            console.warn('[cursor2-interpolation-probe]', {
                phase: 'setLoopEndX',
                incomingLoopEndX: x,
                previousLoopEndX: this.loopEndX,
                currentBeatStart: this.beatStart,
                currentNoteX: this.currentNoteX,
                currentBeatBarIdx:
                    this.currentBeat?.voice?.bar?.masterBar?.index ??
                    this.currentBeat?.voice?.bar?.index ??
                    null,
                masterBarX: mbBounds?.visualBounds?.x ?? null,
                masterBarRight: mbBounds?.visualBounds
                    ? mbBounds.visualBounds.x + mbBounds.visualBounds.w
                    : null,
                apiPlaybackRangeStart: (this.api as any)?.playbackRange?.startTick ?? null,
                apiPlaybackRangeEnd: (this.api as any)?.playbackRange?.endTick ?? null,
            });
        }
        this.loopEndX = x;
    }

    setTick(
        tick: number,
        _nextBeat: any | null = null,
        overrideBeatStart: number | null = null,
    ): void {
        if (!this.hasInitialPosition || this.expandedBeatDuration <= 0) return;

        if (this.lastTickApplied >= 0 && tick < this.lastTickApplied) return;
        this.lastTickApplied = tick;

        const beatStart = overrideBeatStart ?? this.beatStart;
        let progress = (tick - beatStart) / this.expandedBeatDuration;
        progress = Math.max(0, Math.min(1, progress));

        let interpolatedX: number;

        if (this.nextNoteX !== null && this.nextNoteX > this.currentNoteX) {
            interpolatedX = this.currentNoteX + (this.nextNoteX - this.currentNoteX) * progress;
            interpolatedX = Math.min(interpolatedX, this.nextNoteX);
        } else if (this.stayPutMode) {
            const STAY_DRIFT_PX = 4;
            interpolatedX = this.currentNoteX + STAY_DRIFT_PX * progress;
        } else {
            const masterBar = this.currentBeat?.voice?.bar?.masterBar;
            const mbBounds = masterBar
                ? this.api?.renderer?.boundsLookup?.findMasterBar?.(masterBar)
                : null;
            const barRight = mbBounds?.visualBounds
                ? mbBounds.visualBounds.x + mbBounds.visualBounds.w
                : this.currentNoteX + 24;
            const effectiveRight = this.loopEndX !== null
                ? Math.min(barRight, this.loopEndX)
                : barRight;
            interpolatedX = this.currentNoteX + (effectiveRight - this.currentNoteX) * progress;
        }

        const isPlaying = this.api?.player?.isPlaying ?? false;
        if (!isPlaying && progress >= 0.999) {
            interpolatedX = this.currentNoteX;
        }

        let finalX = interpolatedX - BAR_WIDTH / 2;

        // [RowStartOffsetDecay] V1.6: apply a decaying visual offset so the cursor starts
        // at the left barline and converges to normal interpolation over 2 beats.
        // Replaces the single-beat Math.pow curve that caused vacuum/sling into beat 1.
        if (
            this.rowStartOffsetX !== null &&
            this.rowStartOffsetBeatStart !== null &&
            this.rowStartOffsetDuration !== null
        ) {
            const elapsed = tick - this.rowStartOffsetBeatStart;
            const decayProgress = Math.max(0, Math.min(1, elapsed / this.rowStartOffsetDuration));
            const remainingOffset = Math.pow(1 - decayProgress, 2.35);
            finalX = finalX + this.rowStartOffsetX * remainingOffset;
            if (decayProgress >= 1) {
                this.rowStartOffsetX = null;
                this.rowStartOffsetBeatStart = null;
                this.rowStartOffsetDuration = null;
            }
        }

        const _shouldDiagTick =
            cursor2DiagEnabled() &&
            (this.tickDiagCount < 8 || this.loopEndX !== null);
        if (_shouldDiagTick) {
            const masterBar = this.currentBeat?.voice?.bar?.masterBar;
            const mbBounds = masterBar
                ? this.api?.renderer?.boundsLookup?.findMasterBar?.(masterBar)
                : null;
            const mbX = mbBounds?.visualBounds?.x ?? null;
            const mbRight = mbBounds?.visualBounds
                ? mbBounds.visualBounds.x + mbBounds.visualBounds.w
                : null;
            console.warn('[cursor2-interpolation-probe]', {
                phase: 'setTick',
                tick,
                beatStart: overrideBeatStart ?? this.beatStart,
                expandedBeatDuration: this.expandedBeatDuration,
                progress,
                currentNoteX: this.currentNoteX,
                nextNoteX: this.nextNoteX,
                stayPutMode: this.stayPutMode,
                loopEndX: this.loopEndX,
                masterBarX: mbX,
                masterBarRight: mbRight,
                loopEndInsideCurrentBar:
                    this.loopEndX !== null &&
                    mbX !== null &&
                    mbRight !== null &&
                    this.loopEndX >= mbX &&
                    this.loopEndX <= mbRight,
                interpolatedX,
                finalX,
                lastX: this.lastX,
                lastY: this.lastY,
                wouldSkipSmallMove:
                    Math.abs(finalX - this.lastX) < 0.5 &&
                    Math.abs(this.currentY - this.lastY) < 0.8,
                tinyMoveBypassActive: true,
                isLiveTickTransform: this.isLiveTickTransform,
                forceRenderSmallMoveTicks: this.forceRenderSmallMoveTicks,
                wouldBackstepClamp:
                    Math.abs(this.currentY - this.lastY) < 5 &&
                    this.lastX > -9000 &&
                    finalX < this.lastX - BACKSTEP_PX,
                lastTickApplied: this.lastTickApplied,
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                apiPlaybackRangeStart: (this.api as any)?.playbackRange?.startTick ?? null,
            });
            this.tickDiagCount++;
        }
        if (
            cursor2DiagEnabled() &&
            (
                progress < 0.03 ||
                Math.abs(progress - 0.25) < 0.01 ||
                Math.abs(progress - 0.50) < 0.01 ||
                Math.abs(progress - 0.75) < 0.01 ||
                progress > 0.92
            )
        ) {
            console.log('[cursor2-playback-milestone-probe]', {
                tick,
                beatStart: overrideBeatStart ?? this.beatStart,
                progress,
                currentNoteX: this.currentNoteX,
                nextNoteX: this.nextNoteX,
                interpolatedX,
                finalX,
                lastX: this.lastX,
                currentY: this.currentY,
                styleTransform: this.element.style.transform,
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                currentBeatBarIdx:
                    this.currentBeat?.voice?.bar?.masterBar?.index ??
                    this.currentBeat?.voice?.bar?.index ??
                    null,
            });
        }
        this.isLiveTickTransform = true;
        try {
            this._applyTransform(finalX, this.currentY, this.currentH, false);
        } finally {
            this.isLiveTickTransform = false;
        }
    }

    /**
     * requestSnap — resets all order-tracking state so the next setBeat()
     * is never rejected as out-of-order after a seek or loop reseat.
     *
     * V1.2: lastX and lastY are now reset to -9999 here (previously only
     * reset at construction). This is the fix for CursorV2 rejecting the
     * first valid M24 beat after a loop-reseat because lastX still pointed
     * to a position from the previous loop pass.
     *
     * hasInitialPosition is intentionally NOT reset — the cursor bar stays
     * visible between loop passes rather than flickering hidden.
     */
    public requestSnap(_reason?: string): void {
        console.warn('[maestro-cursor2-reset-source]', {
            method: 'requestSnap',
            reason: _reason ?? 'unknown',
            callStack: new Error().stack?.split('\n').slice(1, 4).join(' | ') ?? null,
        });
        if (cursor2DiagEnabled()) {
            console.warn('[cursor2-interpolation-probe]', {
                phase: 'requestSnap',
                reason: _reason ?? 'unknown',
                apiTickPosition: (this.api as any)?.tickPosition ?? null,
                apiPlaybackRangeStart: (this.api as any)?.playbackRange?.startTick ?? null,
                apiPlaybackRangeEnd: (this.api as any)?.playbackRange?.endTick ?? null,
                intentionalTick:
                    typeof window !== 'undefined'
                        ? (window as any).__maestroLastIntentionalTick ?? null
                        : null,
                currentNoteX: this.currentNoteX,
                currentY: this.currentY,
                beatStart: this.beatStart,
                expandedBeatDuration: this.expandedBeatDuration,
                nextNoteX: this.nextNoteX,
                stayPutMode: this.stayPutMode,
                loopEndX: this.loopEndX,
                lastX: this.lastX,
                lastY: this.lastY,
                lastBeatX: this.lastBeatX,
                lastBeatY: this.lastBeatY,
                lastTickApplied: this.lastTickApplied,
                forceHardSnapNextSetBeat: this.forceHardSnapNextSetBeat,
            });
        }
        // [PlayStartHardSnapTargetPreserve] V145.5.3:
        // For play-start-hard-snap, the cursor is already anchored on the clicked beat.
        // Wiping nextNoteX/stayPutMode destroys the active lerp target, causing fallback
        // to masterBarRight and a visible BAM when the next setBeat lands.
        const preserveActivePlaybackTarget = _reason === 'play-start-hard-snap';
        if (!preserveActivePlaybackTarget) {
            this.nextNoteX = null;
            this.stayPutMode = false;
        }
        this.lastValidRatio = 1.0;
        this.lastTickApplied = -1;
        this.lastX = -9999;     // [V1.2] reset animation floor-clamp on seek/reseat
        this.lastY = -9999;     // [V1.2] reset animation floor-clamp on seek/reseat
        this.lastBeatX = -9999; // reset ordering guard
        this.lastBeatY = -9999; // reset ordering guard
        this.rowStartX = null;
        this.rowStartY = null;
        this.rowStartTargetX = null;
        this.rowStartBeatStart = null;
        this.rowStartOffsetX = null;
        this.rowStartOffsetBeatStart = null;
        this.rowStartOffsetDuration = null;
        // [ClickSeekRowStartSuppress] V145.6: manual seeks snap to the clicked beat position
        // directly — suppress row-start glide arming for the immediately following setBeat.
        if (
            _reason === 'click-seek' ||
            _reason === 'touch-seek' ||
            _reason === 'loop-reseat'
        ) {
            this.suppressNextRowStart = true;
        }
        // [PageCursorPlayStartHardSnap] V145.2: hard-snap reasons flush all interpolation
        // memory on the next setBeat so stale tween state cannot cause a visual lunge.
        if (_reason && HARD_SNAP_REASONS.has(_reason)) {
            this.forceHardSnapNextSetBeat = true;
            // [PlayStartHardSnapDurationPreserve] V145.5.2:
            // Do not clear expandedBeatDuration for play-start-hard-snap.
            // On direct chord starts, the clicked beat is already correctly anchored.
            // Clearing duration makes setTick return early until the next setBeat,
            // causing the visible jump to the next row/beat.
            if (_reason !== 'play-start-hard-snap') {
                this.expandedBeatDuration = 0;
            }
            console.warn('[maestro-cursor2-hard-snap]', {
                reason: _reason,
                phase: 'requestSnap',
                currentNoteX: this.currentNoteX,
                currentY: this.currentY,
                previousRenderX: this.lastX,
                previousTargetX: this.nextNoteX,
                forceHardSnapNextSetBeat: true,
            });
        }
        console.log('[CursorV2] requestSnap', { reason: _reason ?? 'unknown' });
    }

    public destroy(): void {
        this.element.parentElement?.removeChild(this.element);
        console.log('🧹 MaestroCursorV2: Destroyed');
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private get currentBeat(): any { return (this as any)._currentBeat ?? null; }

    private _applyTransform(x: number, y: number, h: number, snap: boolean): void {
        const sameRow = Math.abs(y - this.lastY) < 5;
        if (!snap && sameRow && this.lastX > -9000 && x < this.lastX - BACKSTEP_PX) {
            x = this.lastX;
        }

        // [FirstTickSmallMoveBypass] V1.5: live setTick transforms bypass subpixel
        // suppression entirely — slow tempo / long chords can move <0.5px per tick,
        // and suppressing those frames creates the visible chord-start micro-pause.
        // Non-live transforms keep the existing quantization/throttle.
        const isLiveTick = this.isLiveTickTransform === true;
        const bypassTinyMove =
            isLiveTick ||
            (!snap && this.forceRenderSmallMoveTicks > 0);
        const renderX = bypassTinyMove ? x : Math.round(x * 2) / 2;
        const renderY = Math.round(y * 2) / 2;

        if (cursor2DiagEnabled() && this.tickDiagCount <= 8) {
            console.warn('[cursor2-apply-transform-probe]', {
                isLiveTickTransform: this.isLiveTickTransform,
                isLiveTick,
                bypassTinyMove,
                snap,
                x,
                renderX,
                renderY,
                lastX: this.lastX,
                forceRenderSmallMoveTicks: this.forceRenderSmallMoveTicks,
            });
        }

        const isTinyMove =
            Math.abs(renderX - this.lastX) < 0.5 &&
            Math.abs(renderY - this.lastY) < 0.8 &&
            !snap;
        // Live setTick movement must not be suppressed just because it is subpixel.
        if (isTinyMove && !bypassTinyMove) return;
        if (!isLiveTick && !snap && this.forceRenderSmallMoveTicks > 0) {
            this.forceRenderSmallMoveTicks--;
        }

        this.lastX = renderX;
        this.lastY = renderY;

        this.element.style.transition = 'none';
        this.element.style.transform = `translate3d(${renderX}px, ${renderY}px, 0px)`;

        // [cursor2-dom-transform-probe] V145.5 diagnostic — confirm DOM receives transform
        if (cursor2DiagEnabled()) {
            const _domProbeKey = `dom-probe-${this.beatStart}`;
            const _domProbeCount = ((this as any).__domProbeCount ??= {});
            _domProbeCount[_domProbeKey] = (_domProbeCount[_domProbeKey] ?? 0) + 1;
            if (_domProbeCount[_domProbeKey] <= 20) {
                console.log('[cursor2-dom-transform-probe]', {
                    renderX,
                    renderY,
                    styleTransform: this.element.style.transform,
                    elementId: this.element.id,
                    elementClassName: this.element.className,
                    opacity: this.element.style.opacity,
                    visibility: this.element.style.visibility,
                    isLiveTick: this.isLiveTickTransform,
                    parentClassName: this.element.parentElement?.className ?? null,
                    parentId: this.element.parentElement?.id ?? null,
                    probeCount: _domProbeCount[_domProbeKey],
                });
            }
        }

        if (Math.abs(h - this.lastH) > 2) {
            this.element.style.height = `${h}px`;
            this._renderBarSVG(h);
            this.lastH = h;
        }
    }

    private _show(): void {
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '1';
    }

    private _hide(): void {
        this.element.style.visibility = 'hidden';
        this.element.style.opacity = '0';
    }

    private _renderBarSVG(h: number): void {
        const w = BAR_WIDTH;
        const spineX = w / 2;

        this.element.innerHTML = `
            <svg width="${w}" height="${h}"
                 viewBox="0 0 ${w} ${h}"
                 style="display:block;overflow:visible;">
                <rect x="0" y="0" width="${w}" height="${h}"
                      fill="${BAR_COLOR}"
                      rx="2" ry="2"/>
                <line x1="${spineX}" y1="0"
                      x2="${spineX}" y2="${h}"
                      stroke="${SPINE_COLOR}"
                      stroke-width="1.5"
                      stroke-linecap="round"/>
            </svg>`;
    }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function attachMaestroCursorV2(
    api: any,
    container: HTMLElement,
): MaestroCursorV2 {
    return new MaestroCursorV2(api, container);
}