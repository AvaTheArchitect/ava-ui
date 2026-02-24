/**
 * MaestroCursor v4.3 - onNotesX Fix for Double-Digit Centering
 *
 * ✅ Based on v4.2b + AlphaTab 1.8.1 cursor bug fix
 * ✅ Uses beatBounds.onNotesX (actual note position) instead of calculating from visualBounds
 * ✅ Fixes off-center cursor on double-digit frets (10-25) in GP3 files
 * ✅ Aligns with native cursor fix (GitHub #2546)
 *
 * Changes from v4.2b:
 * - extractVisualBounds() → extractBeatPosition() (returns bounds + noteX)
 * - setBeat() uses pos.noteX for positioning
 * - setTick() uses pos.noteX as currentCenterX
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
        this.element.id = 'maestro-cursor-v43';
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

        // ✅ V4.3: Use extractBeatPosition to get onNotesX
        const pos = this.extractBeatPosition(beatBounds);
        if (!pos) return;

        const vb = pos.bounds;

        // ✅ V4.3: Use pos.noteX (actual note position) instead of calculated center
        const finalX = pos.noteX - (this.cursorWidth / 2);

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
        playbackRange: PlaybackRange | null = null,
        isDragging: boolean = false
    ): void {
        if (!beat || this.pendingSnap) return;

        // ✅ V4.3: Use extractBeatPosition to get onNotesX
        const pos = this.extractBeatPosition(beatBounds);
        if (!pos) {
            if (DEBUG) console.warn('⚠️ MaestroCursor: No beat position available');
            return;
        }

        const vb = pos.bounds;

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

        if (isDragging) {
            // 🔓 LOCK REMOVED: Allow free movement during drag
            this.maxTicksSeenForCurrentBeat = effectiveTick;
        } else {
            const backwardJump = this.maxTicksSeenForCurrentBeat - effectiveTick;
            if (backwardJump > 500) {
                this.maxTicksSeenForCurrentBeat = effectiveTick;
            } else {
                effectiveTick = Math.max(effectiveTick, this.maxTicksSeenForCurrentBeat);
                this.maxTicksSeenForCurrentBeat = effectiveTick;
            }
        }
        // ============================================
        // 2️⃣ TARGET X (Real Position Logic)
        // ============================================
        // ✅ V4.3: Use pos.noteX (actual note position) as starting point
        const currentCenterX = pos.noteX;

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
        const totalHeight = vb.h + this.topOverhang + this.bottomOverhang + this.bottomPointBaseShift;
        const finalY = vb.y - this.topOverhang;

        this.draw(finalX, finalY, totalHeight);
    }

    requestSnap(): void {
        this.pendingSnap = true;
    }

    /**
        * 🆕 V99.23: Set dragging visual state
        * Adds/removes .is-dragging class and prevents movement
        */
    public setDragging(isDragging: boolean): void {
        if (isDragging) {
            this.element.classList.add('is-dragging');
            console.log('🔒 V99.23: Cursor frozen for drag');
        } else {
            this.element.classList.remove('is-dragging');
            console.log('🔓 V99.23: Cursor unfrozen');
        }
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

    /**
     * ✅ V4.3: NEW METHOD - Extracts beat position using onNotesX
     * Returns both visualBounds and the actual note X coordinate
     * Fixes off-center cursor on double-digit frets (GP3 files)
     */
    private extractBeatPosition(bb: BeatBounds | null): { bounds: VisualBounds; noteX: number } | null {
        if (!bb) return null;

        const bounds = bb.visualBounds || bb.realBounds;
        if (!bounds || typeof bounds.x !== 'number') return null;

        // ✅ Use onNotesX (actual note position from AlphaTab renderer)
        // Falls back to center calculation if onNotesX unavailable (shouldn't happen in 1.8.1+)
        const noteX = typeof (bb as any).onNotesX === 'number'
            ? (bb as any).onNotesX
            : (bounds.x + bounds.w / 2);

        if (DEBUG && (bb as any).onNotesX === undefined) {
            console.warn('⚠️ onNotesX unavailable, using fallback calculation');
        }

        return {
            bounds: bounds as VisualBounds,
            noteX
        };
    }

    private ensureSVG(totalHeight: number, beatHeight: number): void {
        if (this.svgRendered) return;
        this.renderSVG(totalHeight, beatHeight);
        this.svgRendered = true;
    }

    private renderSVG(totalHeight: number, beatHeight: number): void {
        const w = this.cursorWidth;
        const mid = w / 2;

        const baseY = beatHeight + this.topOverhang + this.bottomPointBaseShift;
        const tipY = totalHeight + 2;
        const topR = Math.min(6, mid);

        const dotScale = 1.18;
        const dotCenterX = mid;
        const dotCenterY = 7.5;

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