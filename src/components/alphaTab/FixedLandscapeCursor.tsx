/**
 * FixedLandscapeCursor.tsx
 * Version: v1.2
 * Date: April 20th, 2026
 * Cloned from v1.1 — iOS Safari cap rendering fix.
 *
 * v1.2 CHANGES:
 * ✅ [S1] Two-SVG split: spine and cap are now separate <svg> elements.
 *         Root cause of "cap not painting": single SVG with height="100%" clips
 *         content outside its coordinate space on iOS Safari. The cap path
 *         (literal 0–40px coords) was invisible because the SVG's layout height
 *         is measured (not intrinsic) and clip-path fires silently.
 *         Confirmed by probe: capExists: false on v1.1 single-SVG approach.
 * ✅ [S2] CSS drop-shadow on cap SVG — mirrors MaestroCursor.renderSVG() approach.
 *         Removed SVG <filter> defs entirely. MaestroCursor uses CSS drop-shadow;
 *         inline SVG filters cause silent rendering failures on mobile Safari.
 * ✅ [S3] Cap SVG: explicit viewBox="0 0 {w} {capH}" + fixed height={capH}.
 *         Spine SVG: height="100%", no viewBox — fills strip height natively.
 *
 * 🔒 v1.1 PRESERVED EXACTLY:
 *   ✅ 12px width / 2px spine / 40px cap / 6px topR — same geometry
 *   ✅ translateX(-50%) centering on cursorBoxX
 *   ✅ overflow:visible on container
 *   ✅ updateX() / destroy() API unchanged
 *   ✅ P2 dual-mount safe (no shared DOM IDs)
 *
 * Verification probe after deploy (landscape mode):
 *   const el = document.querySelector('.maestro-landscape-cursor');
 *   const svgs = el?.querySelectorAll('svg');
 *   console.log({ svgCount: svgs?.length, capRect: svgs?.[1]?.getBoundingClientRect() });
 *   // Expected: svgCount: 2, capRect: { width: 12, height: 40, ... }
 */

const CURSOR_WIDTH = 12;
const SPINE_WIDTH = 2;
const CAP_HEIGHT = 40;
const TOP_RADIUS = 6;
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
    private opts: Required<FixedLandscapeCursorOptions>;

    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,       // kept for API symmetry
        getCursorBoxX: () => number,
        options: FixedLandscapeCursorOptions = {},
    ) {
        this.getCursorBoxX = getCursorBoxX;
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
        console.log('✅ FixedLandscapeCursor v1.2: attached at x=', x);
    }

    updateX(): void {
        this.el.style.left = `${this.getCursorBoxX()}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor v1.2: destroyed');
    }

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
            overflow: 'visible',
            willChange: 'left',
        });
    }

    private renderSVG(): void {
        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;

        // [S1] Two separate SVGs — required for iOS Safari correctness:
        //
        // SVG 1 — Spine: height="100%", no viewBox.
        //   <rect height="100%"> fills the full strip height natively.
        //   z-index:0 (behind cap).
        //
        // SVG 2 — Cap: height="${capH}", viewBox="0 0 ${w} ${capH}".
        //   Renders at literal pixel coords (0–40px) — never clipped by layout.
        //   z-index:1 (on top of spine).
        //   [S2] CSS drop-shadow matches MaestroCursor approach — SVG <filter>
        //   is unreliable on mobile Safari; CSS filter is GPU-composited.
        this.el.innerHTML = `
            <svg
                width="${w}" height="100%"
                style="display:block;position:absolute;top:0;left:0;overflow:visible;z-index:0;"
                xmlns="http://www.w3.org/2000/svg">
                <rect
                    x="${spineLeft}" y="0"
                    width="${SPINE_WIDTH}" height="100%"
                    fill="${this.opts.spineColor}"
                />
            </svg>
            <svg
                width="${w}" height="${capH}"
                viewBox="0 0 ${w} ${capH}"
                style="display:block;position:absolute;top:0;left:0;overflow:visible;z-index:1;filter:drop-shadow(0px 2px 4px rgba(0,0,0,0.5));"
                xmlns="http://www.w3.org/2000/svg">
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
            </svg>`;
    }
}