/**
 * FixedLandscapeCursor.tsx
 * Version: v1.1
 * Date: April 20th, 2026
 *
 * Landscape fixed-position cursor overlay for Maestro.ai horizontal strip mode.
 * Extracted from AlphaTabRenderer V113 LandscapeFixedCursorOverlay class.
 *
 * Architecture mirrors MaestroCursor.tsx:
 *   - 12px wide container, position = desired center
 *   - translateX(-50%) centers the shape on the anchor (eliminates right-edge bias)
 *   - Single SVG: spine (full height) + teardrop cap (fixed px) in one coordinate system
 *   - Dumb visual class: no beat/tick knowledge, just position + render
 *
 * v1.1 CHANGES:
 *   - Single SVG, no viewBox: spine <rect height="100%"> fills natively;
 *     cap <path> renders at literal pixel coords — no mobile Safari scaling distortion
 *   - SVG Z-order: spine first (behind), cap+dot second (on top) — seamless join
 *   - Filter tightened to 200% — prevents mobile Safari memory clipping on 12px element
 *   - Unique glowId per instance — safe for P2 dual-mount
 *   - overflow:visible on container — glow/shadow not clipped at 12px wall
 *
 * Coordinate spaces:
 *   cursorBoxX  → container box space (padL + contentW * ratio) — used for CSS left
 *   cursorSurfaceX → SVG/surface space (cursorBoxX - padL)       — used for scroll math
 *   Computed externally in AlphaTabRenderer; this class is purely visual.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const CURSOR_WIDTH = 12;    // px — matches MaestroCursor.cursorWidth
const SPINE_WIDTH = 2;     // px — vertical spine (Songsterr-style)
const CAP_HEIGHT = 40;    // px — teardrop cap height
const TOP_RADIUS = 6;     // px — rounded top corners (matches MaestroCursor topR)
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
    private glowId: string;
    private opts: Required<FixedLandscapeCursorOptions>;

    /**
     * @param wrapper       — the NON-scrolling parent div (overlay's position:absolute parent)
     * @param container     — the .alphatab-container — kept for API symmetry
     * @param getCursorBoxX — fn returning cursorBoxX in container box space
     * @param options       — optional color overrides
     */
    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,
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
        this.el.className = 'maestro-landscape-cursor';

        const x = getCursorBoxX();
        this.applyStyles(x);
        this.renderSVG();

        wrapper.appendChild(this.el);
        console.log('✅ FixedLandscapeCursor v1.1: attached at x=', x);
    }

    updateX(): void {
        this.el.style.left = `${this.getCursorBoxX()}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor: destroyed');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private applyStyles(x: number): void {
        Object.assign(this.el.style, {
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: `${x}px`,
            width: `${CURSOR_WIDTH}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: '20000',
            background: 'transparent',
            overflow: 'visible',   // glow/shadow must not be clipped at 12px boundary
            willChange: 'left',
        });
    }

    private renderSVG(): void {
        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = TOP_RADIUS;
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;   // cap body ends here, then tapers to point

        // Single SVG, no viewBox:
        //   - <rect height="100%"> fills the overlay natively (no scaling)
        //   - cap <path> uses literal px coords (0–40px) — always renders at correct size
        //   - SVG Z-order: spine first (behind), cap+dot group second (on top)
        //   - filter: 200% bounds prevents mobile Safari clipping on narrow element
        this.el.innerHTML = `
            <svg
                width="${w}" height="100%"
                style="display:block;position:absolute;top:0;left:0;overflow:visible;"
                xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="${this.glowId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
                        <feOffset dx="0" dy="1"/>
                        <feComponentTransfer>
                            <feFuncA type="linear" slope="0.5"/>
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <!-- Spine: behind the cap, full height -->
                <rect
                    x="${spineLeft}" y="0"
                    width="${SPINE_WIDTH}" height="100%"
                    fill="${this.opts.spineColor}"
                    filter="url(#${this.glowId})"
                />

                <!-- Cap + dot: on top of spine, fixed pixel coords -->
                <g filter="url(#${this.glowId})">
                    <path
                        d="M 0,${topR}
                           Q 0,0 ${topR},0
                           L ${w - topR},0
                           Q ${w},0 ${w},${topR}
                           V ${baseY}
                           L ${mid} ${capH}
                           L 0 ${baseY}
                           Z"
                        fill="${this.opts.capFill}"
                    />
                    <path
                        d="M ${mid - 3.5} 6
                           C ${mid - 3.5} 4.3 ${mid - 2} 3 ${mid} 3
                           C ${mid + 2} 3 ${mid + 3.5} 4.3 ${mid + 3.5} 6
                           C ${mid + 3.5} 8.5 ${mid + 1} 12 ${mid} 12
                           C ${mid - 1} 12 ${mid - 3.5} 8.5 ${mid - 3.5} 6 Z"
                        fill="${this.opts.dotFill}"
                    />
                </g>
            </svg>`;
    }
}