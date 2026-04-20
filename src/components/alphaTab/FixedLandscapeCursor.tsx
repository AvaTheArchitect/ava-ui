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

// ── Constants (must match AlphaTabRenderer constants) ────────────────────────
// These are duplicated here for standalone rendering. The renderer passes
// cursorBoxX computed from these same values — no runtime coupling needed.
const CURSOR_WIDTH = 12;     // px — matches MaestroCursor.cursorWidth
const SPINE_WIDTH = 2;       // px — vertical spine inside the bar
const SPINE_COLOR = 'rgba(168, 85, 247, 0.85)';
const BAR_COLOR = 'rgba(168, 85, 247, 0.18)';
const GLOW_COLOR = 'rgba(168, 85, 247, 0.45)';

export interface FixedLandscapeCursorOptions {
    spineColor?: string;
    barColor?: string;
    glowColor?: string;
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
            barColor: options.barColor ?? BAR_COLOR,
            glowColor: options.glowColor ?? GLOW_COLOR,
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
        const mid = CURSOR_WIDTH / 2;
        const spineLeft = mid - SPINE_WIDTH / 2;

        this.el.innerHTML = `
            <svg
                width="${CURSOR_WIDTH}"
                height="100%"
                preserveAspectRatio="none"
                style="display:block;overflow:visible;position:absolute;top:0;left:0;"
                xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="${this.glowId}" x="-100%" y="0%" width="300%" height="100%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
                        <feFlood flood-color="${this.opts.glowColor}" result="color"/>
                        <feComposite in="color" in2="blur" operator="in" result="shadow"/>
                        <feMerge>
                            <feMergeNode in="shadow"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <!-- Subtle full-width bar -->
                <rect
                    x="0" y="0"
                    width="${CURSOR_WIDTH}" height="100%"
                    fill="${this.opts.barColor}"
                    rx="1"
                />
                <!-- Centered spine -->
                <rect
                    x="${spineLeft}" y="0"
                    width="${SPINE_WIDTH}" height="100%"
                    fill="${this.opts.spineColor}"
                    filter="url(#${this.glowId})"
                />
            </svg>`;
    }
}