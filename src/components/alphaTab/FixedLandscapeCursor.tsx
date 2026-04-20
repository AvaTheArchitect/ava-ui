/**
 * FixedLandscapeCursor.tsx
 * Version: v1.0
 * Date: April 20th, 2026
 *
 * Landscape fixed-position cursor overlay for Maestro.ai horizontal strip mode.
 * Extracted from AlphaTabRenderer V113 LandscapeFixedCursorOverlay class.
 *
 * Architecture mirrors MaestroCursor.tsx:
 *   - 12px wide container, position = desired center
 *   - translateX(-50%) centers the shape on the anchor (eliminates right-edge bias)
 *   - 2px spine down the center (Songsterr-style)
 *   - Dumb visual class: no beat/tick knowledge, just position + render
 *
 * Centering math (matches MaestroCursor's finalX = anchor - cursorWidth/2):
 *   left = cursorBoxX (container box space, includes padL)
 *   transform: translateX(-50%) → visual center lands on cursorBoxX
 *
 * Coordinate spaces:
 *   cursorBoxX  → container box space (padL + contentW * ratio) — used for CSS left
 *   cursorSurfaceX → SVG/surface space (cursorBoxX - padL)       — used for scroll math
 *   These are computed externally (getFixedCursorX / getCursorSurfaceX in AlphaTabRenderer)
 *   and passed in. This class is purely visual.
 *
 * Usage:
 *   const cursor = new FixedLandscapeCursor(wrapper, container);
 *   cursor.updateX();        // call on resize
 *   cursor.destroy();        // call on unmount / mode switch
 */

// ── Constants ────────────────────────────────────────────────────────────────
const CURSOR_WIDTH = 12;       // px — matches MaestroCursor.cursorWidth
const SPINE_WIDTH = 2;        // px — vertical spine (Songsterr-style)
const CAP_HEIGHT = 40;       // px — teardrop cap height (matches MaestroCursor topOverhang≈26 + cap)
const TOP_RADIUS = 6;        // px — rounded top corners (matches MaestroCursor topR)
const SPINE_COLOR = 'rgba(168, 85, 247, 0.85)';
const CAP_FILL = 'rgba(168, 85, 247, 0.45)';
const DOT_FILL = 'white';

export interface FixedLandscapeCursorOptions {
    spineColor?: string;
    capFill?: string;
    dotFill?: string;
}

export class FixedLandscapeCursor {
    private el: HTMLElement;
    private getCursorBoxX: () => number;
    private glowId: string;               // unique per instance — avoids SVG filter id collisions
    private opts: Required<FixedLandscapeCursorOptions>;

    /**
     * @param wrapper      — the NON-scrolling parent div (overlay's position:absolute parent)
     * @param container    — the .alphatab-container (scrolling) — used for width computation
     * @param getCursorBoxX — fn that returns cursorBoxX in container box space
     *                        (pass in getFixedCursorX(container) from AlphaTabRenderer)
     */
    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,       // kept for API symmetry with AlphaTabRenderer call site
        getCursorBoxX: () => number,
        options: FixedLandscapeCursorOptions = {},
    ) {
        this.getCursorBoxX = getCursorBoxX;
        this.glowId = `fcGlow_${Math.random().toString(36).slice(2)}`;
        this.opts = {
            spineColor: options.spineColor ?? SPINE_COLOR,
            capFill: options.capFill ?? CAP_FILL,
            dotFill: options.dotFill ?? DOT_FILL,
        };

        this.el = document.createElement('div');
        // Use className, not id — avoids collisions if mounted more than once
        this.el.className = 'maestro-landscape-cursor';

        const x = getCursorBoxX();
        this.applyStyles(x);
        this.renderSVG();

        wrapper.appendChild(this.el);
        console.log('✅ FixedLandscapeCursor v1.0: attached at x=', x);
    }

    /** Re-pin after container resize. Call from ResizeObserver. */
    updateX(): void {
        const x = this.getCursorBoxX();
        this.el.style.left = `${x}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor: destroyed');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private applyStyles(x: number): void {
        Object.assign(this.el.style, {
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: `${x}px`,
            width: `${CURSOR_WIDTH}px`,
            // translateX(-50%) centers the 12px bar on the anchor position.
            // This matches MaestroCursor's: finalX = anchor - cursorWidth/2
            // Without this, `left` positions the LEFT EDGE, causing right-edge bias.
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: '1001',
            // Subtle bar background + spine via SVG (see renderSVG)
            background: 'transparent',
            overflow: 'visible',
            willChange: 'left',
        });
    }

    private renderSVG(): void {
        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const r = TOP_RADIUS;
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;

        // Teardrop cap (same geometry as MaestroCursor, fixed at top):
        //   rounded rectangle top, pointed tip at capH
        // Spine continues below cap to bottom of overlay (100% height - capH)
        this.el.innerHTML = `
            <svg
                width="${w}"
                height="100%"
                preserveAspectRatio="none"
                style="display:block;overflow:visible;position:absolute;top:0;left:0;"
                xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="${this.glowId}" x="-100%" y="-20%" width="300%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                        <feOffset dx="0" dy="2"/>
                        <feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>
                        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>

                <!-- Full-height spine (Songsterr-style vertical line) -->
                <rect
                    x="${spineLeft}" y="0"
                    width="${SPINE_WIDTH}" height="100%"
                    fill="${this.opts.spineColor}"
                    filter="url(#${this.glowId})"
                />

                <!-- Teardrop cap — mirrors MaestroCursor rounded-top + pointed-bottom path -->
                <path
                    d="M 0,${r} Q 0,0 ${r},0 Q ${w},0 ${w},${r} V ${capH - 6} L ${mid} ${capH} L 0 ${capH - 6} Z"
                    fill="${this.opts.capFill}"
                    filter="url(#${this.glowId})"
                />

                <!-- White teardrop dot inside cap (matches MaestroCursor inner dot) -->
                <path
                    d="M ${mid - 3} 5.5
                       C ${mid - 3} 3.8 ${mid - 1.8} 2.7 ${mid} 2.7
                       C ${mid + 1.8} 2.7 ${mid + 3} 3.8 ${mid + 3} 5.5
                       C ${mid + 3} 7.8 ${mid + 0.8} 11 ${mid} 11
                       C ${mid - 0.8} 11 ${mid - 3} 7.8 ${mid - 3} 5.5 Z"
                    fill="${this.opts.dotFill}"
                />
            </svg>`;
    }
}
