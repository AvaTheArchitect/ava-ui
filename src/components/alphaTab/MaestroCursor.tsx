'use client';

/**
 * MaestroCursor v4.6
 * File: components/alphaTab/MaestroCursor.tsx
 * Date: April 12th, 2026
 * Cloned from v4.5.2 — backward re-anchor guard added.
 *
 * v4.6 CHANGES (minimum delta from v4.5.2):
 * ✅ lastAcceptedBeatStart + snapArmed — protect against stale post-seek re-anchors.
 *    Mirrors the protection CursorV2 already proved effective. requestSnap() rearms
 *    so legitimate backward seeks (loopback, click-back) are always accepted.
 * ✅ requestSnap() resets both fields — gate is open after every snap.
 *
 * ROOT CAUSE this fixes: after a click-to-seek with a large tick delta (jumped=true),
 * playerPositionChanged calls requestSnap() then immediately calls setBeat() with the
 * beat at safeTarget (which may be 1-2 ticks before the clicked beat, i.e. prev bar).
 * v4.5.2 accepted this and overwrote the correctly-published click position.
 * v4.6 discards any setBeat whose scanStart is meaningfully behind lastAcceptedBeatStart
 * unless snapArmed is true (i.e. a requestSnap just fired).
 *
 * NOTE: With V105's clickedExpandedStart clamp applied to handleClick,
 * safeTarget no longer lands in the previous beat, so this guard becomes
 * "belt and suspenders" — it protects against any remaining edge cases.
 *
 * 🔒 v4.5.2 PRESERVED EXACTLY (all other behavior byte-for-byte):
 *   ✅ expandedBeatDuration denominator (FixA)
 *   ✅ PAUSE CLAMP: progress >= 0.999 + stopped → parks at note head
 *   ✅ Two-mode walk (MODE A / MODE B)
 *   ✅ nextBeatCenterX frozen at setBeat(), filled-only (never cleared) in setTick()
 *   ✅ No RAF in setTick() — direct rendering
 *   ✅ 3-arg setTick() contract unchanged
 *   ✅ Purple teardrop SVG — same geometry (cursorWidth=12)
 */

interface Beat {
    absolutePlaybackStart?: number;
    playbackStart?: number;
    playbackDuration?: number;
    duration?: number;
    nextBeat?: Beat | null;
    voice?: any;
    [key: string]: any;
}

export class MaestroCursor {
    public element: HTMLElement;
    private api: any;

    private readonly cursorWidth = 12;
    private readonly topOverhang = 26;
    private readonly bottomOverhang = 12;
    private readonly bottomPointBaseShift = 2;
    // Max px difference between onNotesX and visual center before we prefer center.
    // alphaTab's onNotesX drifts left on shuffle down-strums and right on chord stacks.
    // 6px keeps normal beats unchanged while correcting biased anchors.
    private readonly ANCHOR_BIAS_PX = 6;

    private currentBeat: Beat | null = null;
    private currentNoteX = 0;
    private currentY = 0;
    private currentHeight = 0;
    private currentVbW = 0;
    private nextBeatCenterX: number | null = null;

    private beatStart = 0;
    private beatDuration = 0;
    private beatStartToUse = 0;
    private expandedBeatDuration = 0;

    private svgRendered = false;
    private lastSvgHeight = 0;
    private lastFinalX = -1;
    private lastFinalY = -1;
    private hasInitialPosition = false;

    // ── [v4.6] Backward re-anchor guard ─────────────────────────────────────
    // Prevents stale post-seek playerPositionChanged from overwriting a
    // correctly-published click position.
    // snapArmed=true after requestSnap() — allows any beat unconditionally.
    // Once a beat is accepted, snapArmed=false and the backtrack gate activates.
    private lastAcceptedBeatStart = -1;
    private snapArmed = true;
    // ────────────────────────────────────────────────────────────────────────

    private lastLogBeat = -1;

    constructor(api: any, container: HTMLElement) {
        this.api = api;
        this.element = document.createElement('div');
        this.element.id = 'maestro-cursor-v4';
        this.element.className = 'maestro-cursor-icursor';
        Object.assign(this.element.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            pointerEvents: 'none',
            zIndex: '99999',
            willChange: 'transform',
            width: `${this.cursorWidth}px`,
            overflow: 'visible',
            visibility: 'hidden',
            opacity: '0',
            transform: 'translate3d(-100vw, 0px, 0px)',
        });
        container.appendChild(this.element);
        console.log('✅ MaestroCursor v4.6: Ready');
    }

    get domElement(): HTMLElement { return this.element; }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    setBeat(
        beat: Beat | null,
        preScannedNextBeat: Beat | null = null,
        nextExpandedBeatStart: number | null = null,
        expandedBeatStart: number | null = null,
    ): void {
        if (!beat) { this.hide(); return; }

        // ── Compute scanStart for the guard (before any state mutation) ──────
        const structuralStart = beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
        const scanStart = expandedBeatStart ?? structuralStart;

        // ── [v4.6] Backward re-anchor guard ─────────────────────────────────
        // After a click-to-seek, playerPositionChanged may fire with a stale beat
        // (from safeTarget landing 1-2 ticks before the clicked beat).
        // jumped=true → requestSnap() was called → snapArmed=true → that beat is accepted.
        // With V105's clickedExpandedStart clamp, safeTarget no longer lands in the
        // previous beat, but this guard remains as belt-and-suspenders protection.
        //
        // Gate logic: discard only if ALL of these are true:
        //   1. hasInitialPosition — not the very first beat placement
        //   2. !snapArmed — a requestSnap has NOT just fired (which would legitimately allow any beat)
        //   3. scanStart is meaningfully behind lastAcceptedBeatStart (> BACKTRACK_TICKS)
        if (this.hasInitialPosition && !this.snapArmed) {
            const BACKTRACK_TICKS = 60; // tuned: covers 1-2 ticks of EPS drift, not real backward seeks
            if (this.lastAcceptedBeatStart >= 0 &&
                scanStart < this.lastAcceptedBeatStart - BACKTRACK_TICKS) {
                console.log('[Maestro v4.6] out-of-order beat discarded', {
                    scanStart, lastAccepted: this.lastAcceptedBeatStart,
                });
                return;
            }
        }
        // Accept this beat — update guard state
        this.lastAcceptedBeatStart = scanStart;
        this.snapArmed = false;
        // ────────────────────────────────────────────────────────────────────

        this.currentBeat = beat;
        this.beatStart = scanStart;
        this.beatDuration = beat.playbackDuration ?? beat.duration ?? 0;
        this.beatStartToUse = this.beatStart;

        this.expandedBeatDuration = nextExpandedBeatStart != null
            ? Math.max(0, nextExpandedBeatStart - this.beatStart)
            : this.beatDuration;

        const bb = this.api?.renderer?.boundsLookup?.findBeat(beat);
        if (!bb?.visualBounds) { this.hide(); return; }

        const vb = bb.visualBounds;
        // [v4.6] Guarded anchor selection — prefer onNotesX when close to visual center.
        // Use this.ANCHOR_BIAS_PX throughout (class field, no local shadow).
        //
        // Three-way logic:
        //   1. onNotesX within ANCHOR_BIAS_PX of center → use onNotesX (they agree)
        //   2. onNotesX biased BUT vb.w > VBW_INFLATION_GUARD → use onNotesX anyway.
        //      Bend/pitch-helper annotations (<24>, <17>) inflate vb.w, so centerX
        //      drifts into the label region rather than the notehead. onNotesX is
        //      more reliable here. This is the regression vs v4.5 on bend notes.
        //   3. onNotesX biased AND vb.w normal → use centerX.
        //      Catches shuffle down-strum (left bias) and chord dyads (right bias).
        const centerX = vb.x + vb.w / 2;
        const VBW_INFLATION_GUARD = 16; // px; normal noteheads ~8px, bend annotations push wider
        const onNotesXValid = typeof bb.onNotesX === 'number';
        const withinBias = onNotesXValid && Math.abs(bb.onNotesX - centerX) <= this.ANCHOR_BIAS_PX;
        const boundsInflated = vb.w > VBW_INFLATION_GUARD;
        this.currentNoteX = (onNotesXValid && (withinBias || boundsInflated))
            ? bb.onNotesX
            : centerX;
        this.currentY = vb.y;
        this.currentHeight = vb.h;
        this.currentVbW = vb.w;

        // ── Resolve nextBeatCenterX and FREEZE ────────────────────────────────
        this.nextBeatCenterX = null;
        const nextCandidate = preScannedNextBeat ?? null; // structural beat.nextBeat intentionally removed — renderer contract only
        if (nextCandidate) {
            const nb = this.api?.renderer?.boundsLookup?.findBeat(nextCandidate);
            if (nb?.visualBounds) {
                const nbCenter = nb.visualBounds.x + nb.visualBounds.w / 2;
                const nbInflated = nb.visualBounds.w > VBW_INFLATION_GUARD;
                const nbOnNotesOk = typeof nb.onNotesX === 'number';
                const nbWithin = nbOnNotesOk && Math.abs(nb.onNotesX - nbCenter) <= this.ANCHOR_BIAS_PX;
                const nx = (nbOnNotesOk && (nbWithin || nbInflated)) ? nb.onNotesX : nbCenter;
                const sameRow = Math.abs(nb.visualBounds.y - this.currentY) < 5;
                const curBarIdx = beat?.voice?.bar?.index ?? beat?.voice?.bar?.masterBar?.index;
                const nextBarIdx = nextCandidate?.voice?.bar?.index ?? nextCandidate?.voice?.bar?.masterBar?.index;
                if (sameRow && curBarIdx === nextBarIdx) this.nextBeatCenterX = nx;
            }
        }

        const finalX = this.currentNoteX - this.cursorWidth / 2;
        const totalH = vb.h + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;
        const finalY = vb.y - this.topOverhang;
        this.applyTransform(finalX, finalY, totalH, !this.hasInitialPosition);
        this.hasInitialPosition = true;
        this.show();
    }

    // ── [v4.6] requestSnap: rearm the guard ──────────────────────────────────
    public requestSnap(): void {
        this.nextBeatCenterX = null;
        this.beatStartToUse = this.beatStart;
        this.lastFinalX = -1;
        this.lastFinalY = -1;
        this.snapArmed = true;   // [v4.6] allow next beat unconditionally
        this.lastAcceptedBeatStart = -1;     // [v4.6] reset accepted baseline
        console.log('[Maestro v4.6] requestSnap — gate reset');
    }

    /**
     * Called on every playerPositionChanged. Direct render — NO RAF.
     * [FixA] Uses expandedBeatDuration as denominator when available.
     */
    setTick(tick: number, nextBeat: Beat | null = null, overrideBeatStart: number | null = null): void {
        if (!this.currentBeat || this.beatDuration <= 0) return;

        this.beatStartToUse = overrideBeatStart ?? this.beatStart;

        // Fill nextBeatCenterX if setBeat() didn't find one — NEVER clear. [v4.3.5]
        if (nextBeat && this.nextBeatCenterX === null) {
            const nb = this.api?.renderer?.boundsLookup?.findBeat(nextBeat);
            if (nb?.visualBounds) {
                const nbCenter = nb.visualBounds.x + nb.visualBounds.w / 2;
                const nbInflated2 = nb.visualBounds.w > this.ANCHOR_BIAS_PX * 2.5; // reuse field; ~16px
                const nbOnOk2 = typeof nb.onNotesX === 'number';
                const nbWithin2 = nbOnOk2 && Math.abs(nb.onNotesX - nbCenter) <= this.ANCHOR_BIAS_PX;
                const nx = (nbOnOk2 && (nbWithin2 || nbInflated2)) ? nb.onNotesX : nbCenter;
                const sameRow = Math.abs(nb.visualBounds.y - this.currentY) < 5;
                const curBarIdx = this.currentBeat?.voice?.bar?.index ?? this.currentBeat?.voice?.bar?.masterBar?.index;
                const nextBarIdx = nextBeat?.voice?.bar?.index ?? nextBeat?.voice?.bar?.masterBar?.index;
                if (sameRow && curBarIdx === nextBarIdx) this.nextBeatCenterX = nx;
            }
        }

        // ── Progress ── [FixA] expanded denominator ───────────────────────────
        const denom = Math.max(1, this.expandedBeatDuration > 0 ? this.expandedBeatDuration : this.beatDuration);
        let progress = (tick - this.beatStartToUse) / denom;
        progress = Math.max(0, Math.min(1, progress));

        // ── Walk distance ─────────────────────────────────────────────────────
        let walkDistance: number;
        if (this.nextBeatCenterX !== null && this.nextBeatCenterX > this.currentNoteX) {
            walkDistance = this.nextBeatCenterX - this.currentNoteX;        // MODE A
        } else {
            const masterBar = this.currentBeat?.voice?.bar?.masterBar;
            const mbBounds = this.api?.renderer?.boundsLookup?.findMasterBar?.(masterBar);
            walkDistance = mbBounds?.visualBounds
                ? (mbBounds.visualBounds.x + mbBounds.visualBounds.w) - this.currentNoteX
                : this.currentVbW;                                          // MODE B
        }

        let interpolatedX = this.currentNoteX + walkDistance * progress;
        if (this.nextBeatCenterX !== null && this.nextBeatCenterX > this.currentNoteX) {
            interpolatedX = Math.min(interpolatedX, this.nextBeatCenterX);  // MODE A overshoot guard
        }

        // ✅ Pause clamp — must stay below interpolatedX calculation
        const isPlaying = this.api?.player?.isPlaying ?? false;
        if (!isPlaying && progress >= 0.999) interpolatedX = this.currentNoteX;

        const finalX = interpolatedX - this.cursorWidth / 2;
        const totalH = this.currentHeight + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;
        const finalY = this.currentY - this.topOverhang;
        this.applyTransform(finalX, finalY, totalH, false);

        if (this.beatStartToUse !== this.lastLogBeat) {
            this.lastLogBeat = this.beatStartToUse;
            const mode = this.nextBeatCenterX !== null ? 'A→nextBeat' : 'B→barline';
            console.log(`[Maestro v4.6] Beat ${this.beatStartToUse} | ${mode}`, {
                tick,
                progress: progress.toFixed(3),
                denom,
                expandedDur: this.expandedBeatDuration,
                structuralDur: this.beatDuration,
                ratio: this.beatDuration > 0 ? (this.expandedBeatDuration / this.beatDuration).toFixed(2) : 'n/a',
                nextBeatCenterX: this.nextBeatCenterX?.toFixed(1) ?? null,
            });
        }
    }

    destroy(): void {
        if (this.element.parentElement) this.element.parentElement.removeChild(this.element);
        console.log('🧹 MaestroCursor v4.6: Destroyed');
    }

    // ── Helpers (unchanged from v4.5.2) ──────────────────────────────────────

    private applyTransform(x: number, y: number, h: number, snap: boolean): void {
        if (Math.abs(x - this.lastFinalX) < 0.5 && Math.abs(y - this.lastFinalY) < 0.5) return;
        this.lastFinalX = x;
        this.lastFinalY = y;
        if (snap) this.element.style.transition = 'none';
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
        this.element.style.height = `${h}px`;
        if (!this.svgRendered || Math.abs(h - this.lastSvgHeight) > 5) {
            this.renderSVG(h, this.currentHeight);
            this.svgRendered = true;
            this.lastSvgHeight = h;
        }
    }

    private show(): void { this.element.style.visibility = 'visible'; this.element.style.opacity = '1'; }
    private hide(): void { this.element.style.visibility = 'hidden'; this.element.style.opacity = '0'; }

    private renderSVG(totalHeight: number, beatHeight: number): void {
        const w = this.cursorWidth;
        const mid = w / 2;
        const baseY = beatHeight + this.topOverhang + this.bottomPointBaseShift;
        const tipY = totalHeight + 2;
        const topR = Math.min(6, mid);
        const dotCenterX = mid;
        const dotCenterY = 7.5;
        const dotScale = 1.18;

        this.element.innerHTML = `
            <svg width="${w}" height="${totalHeight}"
                 viewBox="0 0 ${w} ${totalHeight}"
                 style="display:block;overflow:visible;filter:drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
                <defs>
                    <filter id="maestroCursorShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                        <feOffset dx="0" dy="2"/>
                        <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>
                <path d="M 0,${topR} Q 0,0 ${topR},0 Q ${w},0 ${w},${topR} V ${baseY} L ${mid} ${tipY} L 0 ${baseY} Z"
                    fill="rgba(168, 85, 247, 0.45)" filter="url(#maestroCursorShadow)"/>
                <path d="M ${mid - 3.5} 6 C ${mid - 3.5} 4.3 ${mid - 2} 3 ${mid} 3 C ${mid + 2} 3 ${mid + 3.5} 4.3 ${mid + 3.5} 6
                    C ${mid + 3.5} 8.5 ${mid + 1} 12 ${mid} 12 C ${mid - 1} 12 ${mid - 3.5} 8.5 ${mid - 3.5} 6 Z"
                    fill="white"
                    transform="translate(${dotCenterX} ${dotCenterY}) scale(${dotScale}) translate(${-dotCenterX} ${-dotCenterY})"/>
            </svg>`;
    }
}

export function attachMaestroCursor(api: any, container: HTMLElement): MaestroCursor {
    return new MaestroCursor(api, container);
}