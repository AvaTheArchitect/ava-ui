/**
 * MaestroCursor v4.2b - Bottom Point Base Shift Experiment
 *
 * ✅ Same as v4.2, with ONE change:
 * - Adds bottomPointBaseShift to push the point downward 1–2px
 *   WITHOUT changing the top, and WITHOUT stretching the tip itself.
 */

'use client';

// ========== TYPES & INTERFACES ==========

interface Beat {
    absolutePlaybackStart: number;
    playbackDuration?: number;
    nextBeat?: Beat | null;
    [key: string]: any;
}

interface VisualBounds {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface BeatBounds {
    visualBounds?: VisualBounds;
    realBounds?: VisualBounds;
    [key: string]: any;
}

interface PlaybackRange {
    startTick: number;
    endTick: number;
}

// ========== CONFIGURATION ==========

const DEBUG = false; // 👈 Set true to enable console logs for debugging

// ========== MAESTRO CURSOR CLASS ==========

export class MaestroCursor {
    public element: HTMLElement;

    private cursorWidth = 12;
    private topOverhang = 26;
    private bottomOverhang = 12;

    // ✅ NEW: shifts the *base* of the point down (NOT the tip length)
    // Try 1 or 2
    private bottomPointBaseShift = 2;

    private hasInitialPosition = false;
    private svgRendered = false;
    private pendingSnap = false;

    // Ratchet Protection (prevents clock jitter & handles loop resets)
    private maxTicksSeenForCurrentBeat: number = 0;
    private lastBeatStart: number = -1;
    private currentBeat: Beat | null = null;
    private currentBeatBounds: BeatBounds | null = null;

    constructor(container: HTMLElement) {
        this.element = document.createElement('div');
        this.element.id = 'maestro-cursor-v42';
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
            transform: 'translate3d(-100vw, 0px, 0px)', // Park offscreen
            transition: 'none'
        });

        container.appendChild(this.element);
    }

    /**
     * setBeat() - Discrete jump on beat changes
     * Called by playedBeatChanged or user clicks
     */
    setBeat(beat: Beat | null, beatBounds: BeatBounds | null): void {
        if (!beat) {
            this.element.style.visibility = 'hidden';
            return;
        }

        const isSameBeat = beat.absolutePlaybackStart === this.lastBeatStart;
        this.currentBeat = beat;
        this.currentBeatBounds = beatBounds;

        const vb = this.extractVisualBounds(beatBounds);
        if (!vb) return;

        const finalX = (vb.x + vb.w / 2) - (this.cursorWidth / 2);

        // ✅ CHANGED: totalHeight includes base shift so SVG has room
        const totalHeight = vb.h + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;

        const finalY = vb.y - this.topOverhang;

        // Always reset ratchet in setBeat (handles seeks correctly)
        this.lastBeatStart = beat.absolutePlaybackStart;
        this.maxTicksSeenForCurrentBeat = beat.absolutePlaybackStart;

        // First position or resize - teleport instantly
        if (!this.hasInitialPosition || this.pendingSnap) {
            this.snapTo(finalX, finalY, totalHeight);
            this.hasInitialPosition = true;
            this.pendingSnap = false;
        } else if (!isSameBeat) {
            // Normal beat change - update position
            this.draw(finalX, finalY, totalHeight);
        }

        this.ensureSVG(totalHeight, vb.h);
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '1';
    }

    /**
     * setTick() - 60fps smooth interpolation
     * Called by playerPositionChanged for frame-by-frame cursor movement
     */
    setTick(
        currentTick: number,
        beat: Beat | null,
        beatBounds: BeatBounds | null,
        nextBeatCenterX: number | null,
        playbackRange: PlaybackRange | null = null
    ): void {
        if (!beat || this.pendingSnap) return;

        const vb = this.extractVisualBounds(beatBounds);
        if (!vb) {
            if (DEBUG) console.warn('⚠️ MaestroCursor: No visual bounds available');
            return;
        }

        const beatStart = beat.absolutePlaybackStart;
        const loopEnd = (playbackRange && playbackRange.endTick > 0)
            ? playbackRange.endTick
            : Infinity;

        // ============================================
        // 0️⃣ INPUT VALIDATION & DOUBLE CLAMP (V4.2)
        // ============================================
        let effectiveTick = currentTick;

        if (playbackRange && playbackRange.endTick > 0) {
            effectiveTick = Math.min(currentTick, playbackRange.endTick - 1);
            if (currentTick !== effectiveTick && DEBUG) {
                console.log(`🛡️ Cursor-level clamp: ${currentTick} → ${effectiveTick}`);
            }
        }

        // ============================================
        // 1️⃣ RATCHET & BOUNDARY CLAMP
        // ============================================
        effectiveTick = Math.min(effectiveTick, loopEnd);
        const backwardJump = this.maxTicksSeenForCurrentBeat - effectiveTick;

        if (backwardJump > 500) {
            this.maxTicksSeenForCurrentBeat = effectiveTick;
            if (DEBUG) console.log('🔄 Loop reset detected in cursor');
        } else {
            effectiveTick = Math.max(effectiveTick, this.maxTicksSeenForCurrentBeat);
            this.maxTicksSeenForCurrentBeat = effectiveTick;
        }

        // ============================================
        // 2️⃣ TARGET X (Real Position Logic)
        // ============================================
        const currentCenterX = vb.x + (vb.w / 2);
        let rangeEndTargetX: number | null = null;
        const nextStart = beat.nextBeat?.absolutePlaybackStart ?? null;

        if (nextStart === null || nextStart > loopEnd) {
            const rb = (beatBounds as any)?.realBounds;
            rangeEndTargetX = (rb && typeof rb.x === 'number' && typeof rb.w === 'number')
                ? (rb.x + rb.w)
                : (vb.x + vb.w);

            if (DEBUG) console.log(`🎯 Range end target: ${rangeEndTargetX}`);
        }

        // ============================================
        // 3️⃣ PROGRESS & DURATION CLAMP
        // ============================================
        const beatDuration = beat.playbackDuration || 480;
        let effectiveDuration = beatDuration;

        if (loopEnd < (beatStart + beatDuration)) {
            effectiveDuration = Math.max(1, loopEnd - beatStart);
            if (DEBUG) console.log(`📐 Duration clamped: ${beatDuration} → ${effectiveDuration}`);
        }

        const safeDuration = Math.max(1, effectiveDuration);
        const progress = Math.min(
            Math.max((effectiveTick - beatStart) / safeDuration, 0),
            1
        );

        // ============================================
        // 4️⃣ MOVEMENT CALCULATION
        // ============================================
        let walkDistance = 0;
        const atLoopEnd = effectiveTick >= loopEnd;

        if (atLoopEnd && rangeEndTargetX !== null) {
            walkDistance = rangeEndTargetX - currentCenterX;
        } else if (nextBeatCenterX !== null && nextBeatCenterX > currentCenterX) {
            walkDistance = nextBeatCenterX - currentCenterX;
        } else {
            const barBounds = (beatBounds as any)?.barBounds?.visualBounds;
            const rightEdge = barBounds
                ? (barBounds.x + barBounds.w - 2)
                : (vb.x + vb.w);
            walkDistance = Math.max(rightEdge - currentCenterX, 0);
        }

        let interpolatedX = currentCenterX + (walkDistance * progress);

        // ============================================
        // 5️⃣ TRIPLE OVERSHOOT GUARD (V4.2)
        // ============================================
        if (playbackRange && rangeEndTargetX !== null) {
            interpolatedX = Math.min(interpolatedX, rangeEndTargetX);

            if (DEBUG && interpolatedX === rangeEndTargetX) {
                console.log(`🛑 Cursor clamped at loop boundary ${rangeEndTargetX}`);
            }
        }

        if (!atLoopEnd && nextBeatCenterX !== null && nextBeatCenterX > currentCenterX) {
            interpolatedX = Math.min(interpolatedX, nextBeatCenterX);
        }

        if (interpolatedX < currentCenterX - 5 && !atLoopEnd) {
            if (DEBUG) console.warn(`⚠️ Prevented backward movement: ${currentCenterX} → ${interpolatedX}`);
            interpolatedX = currentCenterX;
        }

        // ============================================
        // 6️⃣ RENDER
        // ============================================
        const finalX = interpolatedX - (this.cursorWidth / 2);

        // ✅ CHANGED: totalHeight includes base shift so SVG has room
        const totalHeight = vb.h + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;

        const finalY = vb.y - this.topOverhang;

        this.draw(finalX, finalY, totalHeight);
    }

    requestSnap(): void {
        this.pendingSnap = true;
    }

    // ========== PRIVATE METHODS ==========

    private draw(x: number, y: number, h: number): void {
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0px)`;
        this.element.style.height = `${h}px`;
    }

    private snapTo(x: number, y: number, h: number): void {
        this.element.style.transition = 'none';
        this.draw(x, y, h);
        void this.element.offsetHeight;
    }

    private extractVisualBounds(bb: BeatBounds | null): VisualBounds | null {
        if (!bb) return null;
        const b = bb.visualBounds || bb.realBounds;
        return (b && typeof b.x === 'number') ? b as VisualBounds : null;
    }

    private ensureSVG(totalHeight: number, beatHeight: number): void {
        if (this.svgRendered) return;
        this.renderSVG(totalHeight, beatHeight);
        this.svgRendered = true;
    }

    private renderSVG(totalHeight: number, beatHeight: number): void {
        const w = this.cursorWidth;      // 12 or 14
        const mid = w / 2;               // 6 or 7

        // baseY moves the *base* of the triangle down (your current win)
        const baseY = beatHeight + this.topOverhang + this.bottomPointBaseShift;

        // Tip stays 2px below svg box (same as before)
        const tipY = totalHeight + 2;

        // Rounded top corners: keep the same feel as before
        // (if you want it slightly tighter for width=12, set this to Math.min(7, mid))
        const topR = Math.min(6, mid);
        //White dot (guitar pick shape)
        const dotScale = 1.18;     // try 1.12 → 1.25
        const dotCenterX = mid;    // keep centered
        const dotCenterY = 7.5;    // center-ish for your dot (y range ~3..12)

        this.element.innerHTML = `
        <svg width="${w}" height="${totalHeight}"
             viewBox="0 0 ${w} ${totalHeight}"
             style="display:block;overflow:visible;filter:drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
            <defs>
                <filter id="maestroCursorShadow">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                    <feOffset dx="0" dy="2" />
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5" />
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <path d="
                M 0,${topR}
                Q 0,0 ${topR},0
                Q ${w},0 ${w},${topR}
                V ${baseY}
                L ${mid} ${tipY}
                L 0 ${baseY}
                Z"
                fill="rgba(168, 85, 247, 0.45)"
                filter="url(#maestroCursorShadow)" />

            <!-- White dot (centered dynamically) -->
           <path d="
    M ${mid - 3.5} 6
    C ${mid - 3.5} 4.3 ${mid - 2} 3 ${mid} 3
    C ${mid + 2} 3 ${mid + 3.5} 4.3 ${mid + 3.5} 6
    C ${mid + 3.5} 8.5 ${mid + 1} 12 ${mid} 12
    C ${mid - 1} 12 ${mid - 3.5} 8.5 ${mid - 3.5} 6
    Z"
    fill="white"
    transform="
        translate(${dotCenterX} ${dotCenterY})
        scale(${dotScale})
        translate(${-dotCenterX} ${-dotCenterY})
    "
/>
        </svg>
    `;
    }

    destroy(): void {
        if (this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
        }
    }
}