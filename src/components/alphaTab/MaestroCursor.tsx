'use client';

/**
 * MaestroCursor v4.7.1
 * File: components/alphaTab/MaestroCursor.tsx
 * Date: April 29th, 2026
 * Cloned from v4.7 — tiered smoother + snapPending reason logging.
 *
 * v4.7.1 CHANGES (minimum delta from v4.7):
 * ✅ Tiered smoothing rates — baseRate for normal motion, boostedRate when
 *    renderTick trails targetTick by 120–720 ticks (barline catch-up without lunge).
 *    Snap threshold unchanged (> SEEK_JUMP_TICKS = 960 → instant).
 * ✅ requestSnap(reason) — logs call site so spurious playback snaps are visible.
 * ✅ snapPending only set by explicit seek/click, not by jumped detection.
 *    NOTE: AlphaTabRenderer.tsx must NOT call requestSnap() from the jumped
 *    branch in playerPositionChanged — see renderer patch below.
 *
 * 🔒 v4.6 PRESERVED EXACTLY (all other behavior):
 *   ✅ Backward re-anchor guard (lastAcceptedBeatStart / snapArmed)
 *   ✅ ANCHOR_BIAS_PX / VBW_INFLATION_GUARD anchor selection
 *   ✅ nextBeatCenterX frozen at setBeat(), filled-only in setTick()
 *   ✅ MODE A / MODE B walk distance logic
 *   ✅ Pause clamp at progress >= 0.999
 *   ✅ Purple teardrop SVG — same geometry
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
    private readonly ANCHOR_BIAS_PX = 6;

    private currentBeat: Beat | null = null;
    private currentNoteX = 0;
    private currentY = 0;
    private currentHeight = 0;
    private currentVbW = 0;
    private nextBeatCenterX: number | null = null;

    private beatStart = 0;
    private beatDuration = 0;         // structural duration — used as interpolation denominator
    private beatStartToUse = 0;
    private expandedBeatDuration = 0; // kept for reference / logging only

    private svgRendered = false;
    private lastSvgHeight = 0;
    private lastFinalX = -1;
    private lastFinalY = -1;
    private hasInitialPosition = false;

    // ── [v4.6] Backward re-anchor guard ─────────────────────────────────────
    private lastAcceptedBeatStart = -1;
    private snapArmed = true;
    // ────────────────────────────────────────────────────────────────────────

    // ── [v4.7] RAF smoothing state ───────────────────────────────────────────
    // targetTick: what AlphaTab/YouTube is reporting (chunked, may have gaps)
    // renderTick: what we actually draw (eased toward targetTick each frame)
    // snapPending: if true, RAF loop snaps renderTick instantly (seek only)
    private targetTick = 0;
    private renderTick = 0;
    private snapPending = false;
    private rafId: number | null = null;
    private lastRafTime = 0;

    // Tiered slew rates — absorbs barline quantization without lunging.
    // base: normal smooth motion
    // boosted: when trailing by 120–720 ticks (e.g. barline boundary catch-up)
    // snap: when delta > SEEK_JUMP_TICKS (user seek — instant)
    private readonly TICK_RATE_BASE = 2400; // ticks/sec — normal motion
    private readonly TICK_RATE_BOOSTED = 4800; // ticks/sec — catch-up zone
    private readonly BOOST_THRESHOLD = 120;  // ticks — start boosting above this
    private readonly SEEK_JUMP_TICKS = 960;  // ticks — snap instantly above this
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
        this.startRaf();
        console.log('✅ MaestroCursor v4.7: Ready');
    }

    get domElement(): HTMLElement { return this.element; }

    // ─────────────────────────────────────────────────────────────────────────
    // RAF loop — smooth renderTick toward targetTick
    // ─────────────────────────────────────────────────────────────────────────

    private startRaf(): void {
        const loop = (now: number) => {
            this.rafId = requestAnimationFrame(loop);
            if (!this.currentBeat || this.beatDuration <= 0) return;

            const dt = this.lastRafTime > 0 ? Math.min((now - this.lastRafTime) / 1000, 0.1) : 0;
            this.lastRafTime = now;

            const delta = this.targetTick - this.renderTick;
            const isSeek = Math.abs(delta) > this.SEEK_JUMP_TICKS;

            const absDelta = Math.abs(delta);

            if (this.snapPending || isSeek) {
                // Explicit seek or song/track load — instant snap
                this.renderTick = this.targetTick;
                this.snapPending = false;
            } else if (absDelta <= 48) {
                // ✅ Deadband snap — micro-deltas at barlines/beat-boundaries
                // snap instantly rather than easing. Removes the "micro-lunge"
                // feel at last-note→first-note transitions. Songsterr uses this.
                this.renderTick = this.targetTick;
            } else {
                // Tiered slew — boost rate when trailing at barline boundaries
                const rate = absDelta > this.BOOST_THRESHOLD
                    ? this.TICK_RATE_BOOSTED
                    : this.TICK_RATE_BASE;
                const maxStep = rate * dt;
                this.renderTick += Math.max(-maxStep, Math.min(delta, maxStep));
            }

            this.renderPosition(this.renderTick);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    private stopRaf(): void {
        if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // renderPosition — compute and apply cursor transform from a tick value
    // ─────────────────────────────────────────────────────────────────────────

    private renderPosition(tick: number): void {
        // ── [v4.7] Use structuralDur as denominator ───────────────────────────
        // expandedBeatDuration caused "slow then catch up" on ties/sustains.
        // beatDuration (structural) gives uniform motion across the bar.
        const denom = Math.max(1, this.beatDuration);
        let progress = (tick - this.beatStartToUse) / denom;
        progress = Math.max(0, Math.min(1, progress));

        // ── Walk distance (MODE A / MODE B) ──────────────────────────────────
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

        // ✅ Pause clamp
        const isPlaying = this.api?.player?.isPlaying ?? false;
        if (!isPlaying && progress >= 0.999) interpolatedX = this.currentNoteX;

        const finalX = interpolatedX - this.cursorWidth / 2;
        const totalH = this.currentHeight + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;
        const finalY = this.currentY - this.topOverhang;
        this.applyTransform(finalX, finalY, totalH, false);

        if (this.beatStartToUse !== this.lastLogBeat) {
            this.lastLogBeat = this.beatStartToUse;
            const mode = this.nextBeatCenterX !== null ? 'A→nextBeat' : 'B→barline';
            console.log(`[Maestro v4.7] Beat ${this.beatStartToUse} | ${mode}`, {
                renderTick: Math.round(tick),
                targetTick: Math.round(this.targetTick),
                progress: progress.toFixed(3),
                denom,
                structuralDur: this.beatDuration,
                expandedDur: this.expandedBeatDuration,
                nextBeatCenterX: this.nextBeatCenterX?.toFixed(1) ?? null,
            });
        }
    }

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

        const structuralStart = beat.absolutePlaybackStart ?? beat.playbackStart ?? 0;
        const scanStart = expandedBeatStart ?? structuralStart;

        // ── [v4.6] Backward re-anchor guard ─────────────────────────────────
        if (this.hasInitialPosition && !this.snapArmed) {
            const BACKTRACK_TICKS = 60;
            if (this.lastAcceptedBeatStart >= 0 &&
                scanStart < this.lastAcceptedBeatStart - BACKTRACK_TICKS) {
                console.log('[Maestro v4.7] out-of-order beat discarded', {
                    scanStart, lastAccepted: this.lastAcceptedBeatStart,
                });
                return;
            }
        }
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
        const centerX = vb.x + vb.w / 2;
        const VBW_INFLATION_GUARD = 16;
        const onNotesXValid = typeof bb.onNotesX === 'number';
        const withinBias = onNotesXValid && Math.abs(bb.onNotesX - centerX) <= this.ANCHOR_BIAS_PX;
        const boundsInflated = vb.w > VBW_INFLATION_GUARD;
        this.currentNoteX = (onNotesXValid && (withinBias || boundsInflated))
            ? bb.onNotesX : centerX;
        this.currentY = vb.y;
        this.currentHeight = vb.h;
        this.currentVbW = vb.w;

        this.nextBeatCenterX = null;
        const nextCandidate = preScannedNextBeat ?? null;
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

    // ── [v4.7] requestSnap: arm instant jump in RAF loop (seek only) ─────────
    public requestSnap(reason: string): void {
        this.nextBeatCenterX = null;
        this.beatStartToUse = this.beatStart;
        this.lastFinalX = -1;
        this.lastFinalY = -1;
        this.snapArmed = true;
        this.snapPending = true;
        this.lastAcceptedBeatStart = -1;
        console.log(`[MaestroCursor v4.7.1] requestSnap`, { reason, targetTick: this.targetTick, renderTick: Math.round(this.renderTick) });
    }

    /**
     * setTick — called on every playerPositionChanged.
     * [v4.7] Only updates targetTick. RAF loop handles rendering.
     * No longer does direct DOM writes — eliminates buffer-burst jitter.
     */
    setTick(tick: number, nextBeat: Beat | null = null, overrideBeatStart: number | null = null): void {
        if (!this.currentBeat || this.beatDuration <= 0) return;

        this.beatStartToUse = overrideBeatStart ?? this.beatStart;
        this.targetTick = tick;

        // Fill nextBeatCenterX if setBeat() didn't find one — NEVER clear [v4.3.5]
        if (nextBeat && this.nextBeatCenterX === null) {
            const nb = this.api?.renderer?.boundsLookup?.findBeat(nextBeat);
            if (nb?.visualBounds) {
                const nbCenter = nb.visualBounds.x + nb.visualBounds.w / 2;
                const nbInflated2 = nb.visualBounds.w > this.ANCHOR_BIAS_PX * 2.5;
                const nbOnOk2 = typeof nb.onNotesX === 'number';
                const nbWithin2 = nbOnOk2 && Math.abs(nb.onNotesX - nbCenter) <= this.ANCHOR_BIAS_PX;
                const nx = (nbOnOk2 && (nbWithin2 || nbInflated2)) ? nb.onNotesX : nbCenter;
                const sameRow = Math.abs(nb.visualBounds.y - this.currentY) < 5;
                const curBarIdx = this.currentBeat?.voice?.bar?.index ?? this.currentBeat?.voice?.bar?.masterBar?.index;
                const nextBarIdx = nextBeat?.voice?.bar?.index ?? nextBeat?.voice?.bar?.masterBar?.index;
                if (sameRow && curBarIdx === nextBarIdx) this.nextBeatCenterX = nx;
            }
        }
    }

    destroy(): void {
        this.stopRaf();
        if (this.element.parentElement) this.element.parentElement.removeChild(this.element);
        console.log('🧹 MaestroCursor v4.7: Destroyed');
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