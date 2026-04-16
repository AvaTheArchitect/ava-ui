'use client';

/**
 * v1.1 changes (V105 renderer compat):
 *   ✅ Renderer D1 gate now blocks out-of-order beats upstream — cursor
 *      out-of-order guard is defense-in-depth, not primary filter.
 *   ✅ stayPutMode: hard freeze → micro-drift (4px over beat duration).
 *      Eliminates visible pause on bend clusters sharing same onNotesX.
 *      AlphaTab internal anchor bias on shuffle beats (filed to Daniel)
 *      amplifies hard-freeze perception — micro-drift masks it cleanly.
 *   ✅ lastValidRatio: ratio memory now only updates from clean scans
 *      (expandedDur >= MIN_PRIMARY_BEAT_TICKS AND ratio in [0.5, 3.0]).
 * MaestroCursor2.tsx — "Songsterr Edition" v1.1
 * File: components/alphaTab/MaestroCursor2.tsx
 * Date: April 13, 2026
 *
 * Philosophy: ANCHOR-LERP, not hitbox-math.
 *   Cursor walks from onNotesX(beat N) → onNotesX(beat N+1) over the
 *   expanded beat duration. Zero knowledge of visual box widths required.
 *
 * A/B TEST SETUP:
 *   Import attachMaestroCursorV2 in page.tsx, swap one line, compare live.
 *   When satisfied, delete MaestroCursor.tsx and promote this to primary.
 *
 * Three "Mole Killers" (per Gemini blueprint):
 *   [M1] onNotesX Priority     — anchors on note head, not box center
 *   [M2] Hard Snap on tick≤0   — forces M1 position, kills measure-1 skip
 *   [M3] LERP is invincible     — constant walk speed ignores SVG box widths
 *
 * Ported invariants from v4.6.1 that are genre-agnostic:
 *   ✅ MIN_PRIMARY_BEAT_TICKS  — grace note / pick-scrap guard (X skip, Y update)
 *   ✅ expandedBeatDuration    — scan truth denominator (SRV shuffle fix)
 *   ✅ Monotonic tick gate     — kills AlphaTab worker jitter
 *   ✅ requestSnap()           — resets lastTickApplied for backward seeks
 *   ✅ SOFT backstep clamp     — no freeze-then-lurch on phantom backward ticks
 *
 * Visual: Songsterr-style teal semi-transparent bar + thin solid spine.
 *   Use CSS var(--at-cursor-color) if present, else teal fallback.
 *   Width: 14px (matches Songsterr bar width at default zoom).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Min tick duration to be treated as a primary (anchoring) beat.
 *  Below this → true grace note ornament → skip X anchor, update Y only.
 *  30 ticks = 1/64 note at 480 PPQ. Intentionally lower than v4.6.1's 120
 *  so that pick slides (60 ticks = 1/32) and finger slides anchor correctly.
 *  True AlphaTab grace notes carry beat.graceType != null — a tick guard
 *  alone is too coarse for slides at fast tempos. */
const MIN_PRIMARY_BEAT_TICKS = 30;

/** Soft backward-step tolerance in px. Allows minor float noise (Rise)
 *  but blocks phantom backward jumps (SRV jitter). DO NOT set to 0. */
const BACKSTEP_PX = 2;

/** Cursor bar visual width in px (centered on anchor via transform). */
const BAR_WIDTH = 14;

/** Teal fill — Songsterr green-teal. Swap to purple to match v4.6.1. */
const BAR_COLOR = 'rgba(0, 204, 170, 0.42)';
const SPINE_COLOR = 'rgba(0, 220, 185, 0.85)';

// ─── Class ────────────────────────────────────────────────────────────────────

export class MaestroCursorV2 {
    public element: HTMLElement;
    private api: any;

    // Current beat geometry
    private currentNoteX = 0;   // onNotesX of active beat (left edge of walk)
    private currentY = 0;
    private currentH = 0;

    // LERP targets
    private nextNoteX: number | null = null;  // onNotesX of next primary beat
    // True when next beat exists + same row but same X (bend cluster, stacked notes).
    // PARK MODE uses this to stay put rather than glide to barline.
    private stayPutMode = false;

    // Timing (scan truth — not structural)
    private beatStart = 0;
    private expandedBeatDuration = 0;
    // Last valid shuffle ratio — preserved across beats so a bad scan on one
    // beat can fall back to the ratio established by the beats around it.
    // Resets to 1.0 on requestSnap(). Range clamped to [0.5, 3.0].
    private lastValidRatio = 1.0;

    // Monotonic tick gate
    private lastTickApplied = -1;

    // Transform cache (skip redundant DOM writes)
    private lastX = -9999;
    private lastY = -9999;
    private lastH = -1;

    // State flags
    private hasInitialPosition = false;
    private snapPending = false;

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
            zIndex: '99998',          // one below v4.6.1 for A/B layering
            willChange: 'transform',
            overflow: 'visible',
            visibility: 'hidden',
            opacity: '0',
            transform: 'translate3d(-100vw, 0px, 0px)',
        });

        container.appendChild(this.element);
        this._renderBarSVG(80); // placeholder height until first setBeat
        console.log('✅ MaestroCursorV2 (Songsterr Edition): Ready');
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Called by renderer on every beat entry (activeBeatsChanged / playerPositionChanged).
     *
     * Signature mirrors v4.6.1 for drop-in renderer compat:
     *   setBeat(beat, nextBeat?, nextExpandedBeatStart?, expandedBeatStart?)
     *
     * [M1] Uses onNotesX as the walk origin. Falls back to vb.x if absent.
     * [Grace] beatDuration < MIN_PRIMARY_BEAT_TICKS → Y update only, X untouched.
     */
    setBeat(
        beat: any | null,
        preScannedNextBeat: any | null = null,
        nextExpandedBeatStart: number | null = null,
        expandedBeatStart: number | null = null,
    ): void {
        if (!beat) { this._hide(); return; }

        const dur = beat.playbackDuration ?? beat.duration ?? 0;
        const bb = this.api?.renderer?.boundsLookup?.findBeat(beat);
        if (!bb?.visualBounds) { this._hide(); return; }
        const vb = bb.visualBounds;

        // ── Grace note guard ─────────────────────────────────────────────────
        // Pick-scraps, rakes, ornaments: update Y position but NEVER mutate
        // the X anchors — current LERP glide continues uninterrupted.
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

        // [SRV Fix] expandedBeatDuration = scan delta, not structural notation value.
        // SRV shuffle: structural=320, expanded=640 → without this, progress hits 1.0
        // early and the cursor parks + snaps = pendulum. Rise: delta ≈ structural → safe.
        const computedDur = nextExpandedBeatStart != null
            ? nextExpandedBeatStart - scanStart
            : dur;
        const computedRatio = dur > 0 ? computedDur / dur : 1;

        if (computedDur >= MIN_PRIMARY_BEAT_TICKS && computedRatio >= 0.5 && computedRatio <= 3.0) {
            // Valid scan result — update ratio memory and use it.
            // SRV beat 600: computedDur=40, ratio=0.05 → FAILS this branch correctly.
            this.expandedBeatDuration = computedDur;
            this.lastValidRatio = computedRatio;
        } else {
            // Bad scan: negative, sub-threshold, or implausible ratio.
            // Use last known shuffle ratio so the cursor walks at the right tempo.
            // SRV beat 600: lastValidRatio=1.25 → fallback = 840×1.25 = 1050.
            this.expandedBeatDuration = Math.round(dur * this.lastValidRatio);
            if (this.expandedBeatDuration < MIN_PRIMARY_BEAT_TICKS) {
                this.expandedBeatDuration = dur; // final safety net
            }
        }

        // [Out-of-order guard] If this beat's anchor is behind lastX on the same
        // row and no requestSnap() was called, it's a late-arriving slide/grace
        // pickup from the renderer. Discard entirely — don't overwrite the good
        // state (expandedDur, nextNoteX, stayPutMode) set by the beat that already
        // fired. The cursor continues its current walk uninterrupted.
        const newNoteX = typeof bb.onNotesX === 'number' ? bb.onNotesX : vb.x;
        const sameRowAsLast = Math.abs(vb.y - this.lastY) < 5;
        const isOutOfOrder = sameRowAsLast && this.lastX > -9000
            && (newNoteX - BAR_WIDTH / 2) < this.lastX - BACKSTEP_PX;
        if (isOutOfOrder) {
            console.log('[CursorV2] out-of-order beat discarded', { scanStart, newNoteX: newNoteX.toFixed(1) });
            return;
        }

        this.currentNoteX = newNoteX;
        this.currentY = vb.y;
        this.currentH = vb.h;

        // ── Resolve next anchor (LERP target) ────────────────────────────────
        // Renderer is responsible for supplying a sane preScannedNextBeat.
        // Cursor must NOT fall back to beat.nextBeat (structural) — that would
        // fight the renderer contract and cause skips on slide pickups (SRV M1).
        // If preScannedNextBeat is behind or missing → PARK MODE for this beat.
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
                        // Next beat same row, same X — bend cluster / stacked notes.
                        this.stayPutMode = true;
                    }
                }
            }
        }

        // Store beat ref for PARK MODE masterBar lookup in setTick()
        (this as any)._currentBeat = beat;

        // Snap to beat origin — forward-only guard on same row.
        // If new anchor is behind lastX on the same staff row (e.g. two beats share
        // the same onNotesX, or a bend cluster renders at identical pixel), don't
        // snap backward. A true hard snap is only needed for row changes or after
        // requestSnap() (which resets lastX to -9999).
        const finalX = this.currentNoteX - BAR_WIDTH / 2;
        const finalY = this.currentY;
        const sameRow = Math.abs(finalY - this.lastY) < 5;
        const isBackward = sameRow && this.lastX > -9000 && finalX < this.lastX - BACKSTEP_PX;
        this._applyTransform(finalX, finalY, this.currentH, /* snap */ !isBackward);
        this.hasInitialPosition = true;
        this._show();

        console.log('[CursorV2] setBeat', {
            scanStart,
            expandedDur: this.expandedBeatDuration,
            ratio: dur > 0 ? (this.expandedBeatDuration / dur).toFixed(2) : 'n/a',
            currentNoteX: this.currentNoteX.toFixed(1),
            nextNoteX: (this.nextNoteX as number | null)?.toFixed(1) ?? '—',
        });
    }

    /**
     * Called on every playerPositionChanged. Direct render — NO RAF.
     *
     * Signature mirrors v4.6.1 (3-arg) for drop-in compat.
     *
     * [M3] LERP is invincible: interpolated position is purely geometric
     *   (onNotesX A → onNotesX B). Box widths, vb.w, hitbox math: irrelevant.
     */
    setTick(
        tick: number,
        _nextBeat: any | null = null,
        overrideBeatStart: number | null = null,
    ): void {
        if (!this.hasInitialPosition || this.expandedBeatDuration <= 0) return;

        // Monotonic tick gate — kills worker jitter (e.g. 5282→5281→5283).
        // Reset by requestSnap() so backward seeks (loop wrap, click) still work.
        if (this.lastTickApplied >= 0 && tick < this.lastTickApplied) return;
        this.lastTickApplied = tick;

        const beatStart = overrideBeatStart ?? this.beatStart;
        let progress = (tick - beatStart) / this.expandedBeatDuration;
        progress = Math.max(0, Math.min(1, progress));

        // ── [M3] LERP walk ───────────────────────────────────────────────────
        let interpolatedX: number;

        if (this.nextNoteX !== null && this.nextNoteX > this.currentNoteX) {
            // WALK MODE: note-to-note LERP — the "Mole Killer."
            interpolatedX = this.currentNoteX + (this.nextNoteX - this.currentNoteX) * progress;
            interpolatedX = Math.min(interpolatedX, this.nextNoteX);
        } else if (this.stayPutMode) {
            // STAY PUT: next beat same row, same X (bend cluster / stacked notes).
            // Micro-drift 4px max over the beat duration — avoids hard-freeze
            // perception on clusters where AlphaTab's anchor bias is visible.
            // Does NOT glide to barline — just breathes forward slightly.
            const STAY_DRIFT_PX = 4;
            interpolatedX = this.currentNoteX + STAY_DRIFT_PX * progress;
        } else {
            // PARK MODE: no valid next anchor (last beat in system / cross-row).
            // Glide to the right edge of the masterbar — same as v4.6.1 Mode B legacy.
            const masterBar = this.currentBeat?.voice?.bar?.masterBar;
            const mbBounds = masterBar
                ? this.api?.renderer?.boundsLookup?.findMasterBar?.(masterBar)
                : null;
            const barRight = mbBounds?.visualBounds
                ? mbBounds.visualBounds.x + mbBounds.visualBounds.w
                : this.currentNoteX + 24; // graceful fallback
            interpolatedX = this.currentNoteX + (barRight - this.currentNoteX) * progress;
        }

        // Pause clamp — don't drift to barline while paused at loop end.
        const isPlaying = this.api?.player?.isPlaying ?? false;
        if (!isPlaying && progress >= 0.999) {
            interpolatedX = this.currentNoteX;
        }

        const finalX = interpolatedX - BAR_WIDTH / 2;
        this._applyTransform(finalX, this.currentY, this.currentH, false);
    }

    /**
     * Call before seeks, loop wraps, song switch, and tick === 0.
     * Resets monotonic gate so backward ticks are accepted again.
     * [M2] Combined with the tick≤0 guard in page.tsx, kills M1 skip.
     */
    public requestSnap(): void {
        this.nextNoteX = null;
        this.stayPutMode = false;
        this.lastValidRatio = 1.0; // reset ratio on seek/loop/song-switch
        this.lastTickApplied = -1;
        this.lastX = -9999;
        this.lastY = -9999;
        console.log('[CursorV2] requestSnap — gate reset');
    }

    public destroy(): void {
        this.element.parentElement?.removeChild(this.element);
        console.log('🧹 MaestroCursorV2: Destroyed');
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    // Convenience ref — needed for PARK MODE masterBar lookup.
    private get currentBeat(): any { return (this as any)._currentBeat ?? null; }

    private _applyTransform(x: number, y: number, h: number, snap: boolean): void {
        // [Fix C port] Soft backstep clamp — not hard drop.
        // Allows 0–(BACKSTEP_PX-1)px float noise; blocks larger phantom reversal.
        const sameRow = Math.abs(y - this.lastY) < 5;
        if (!snap && sameRow && this.lastX > -9000 && x < this.lastX - BACKSTEP_PX) {
            x = this.lastX;
        }

        // Half-pixel quantization — kills subpixel shimmer
        x = Math.round(x * 2) / 2;
        y = Math.round(y * 2) / 2;

        // Deadband — skip DOM write when movement is imperceptible
        if (
            Math.abs(x - this.lastX) < 0.5 &&
            Math.abs(y - this.lastY) < 0.8 &&
            !snap
        ) return;

        this.lastX = x;
        this.lastY = y;

        if (snap) this.element.style.transition = 'none';
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0px)`;

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

    /**
     * Songsterr-style teal vertical bar SVG.
     * Structure: semi-transparent fill bar + 1px solid spine centered at x=BAR_WIDTH/2.
     * No teardrop — clean A/B visual contrast vs v4.6.1 purple teardrop.
     */
    private _renderBarSVG(h: number): void {
        const w = BAR_WIDTH;
        const spineX = w / 2;

        this.element.innerHTML = `
            <svg width="${w}" height="${h}"
                 viewBox="0 0 ${w} ${h}"
                 style="display:block;overflow:visible;">
                <!-- Semi-transparent fill bar -->
                <rect x="0" y="0" width="${w}" height="${h}"
                      fill="${BAR_COLOR}"
                      rx="2" ry="2"/>
                <!-- Solid spine — the "teal red line" -->
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