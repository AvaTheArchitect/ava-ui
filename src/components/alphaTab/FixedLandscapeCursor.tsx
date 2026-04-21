/**
 * FixedLandscapeCursor.tsx
 * Version: v1.4
 * Date: April 20th, 2026
 * Cloned from v1.2 — DOM API replaces innerHTML (iOS Safari SVG parse fix).
 *
 * v1.3 CHANGES:
 * ✅ [S4] renderSVG() uses document.createElementNS() throughout — no innerHTML.
 *         Root cause of svgCount=1: iOS Safari's HTML parser drops the second
 *         sibling <svg> when set via innerHTML inside a <div>. DOM API bypasses
 *         the parser entirely — elements are created directly in the SVG namespace.
 * ✅ [S5] Spine is now a plain <div> — no SVG at all. A colored div is simpler,
 *         paint-order safe, and avoids any SVG coordinate-space ambiguity.
 * ✅ [S6] Cap is a single <svg> created via createElementNS, with explicit
 *         viewBox="0 0 12 40" and CSS drop-shadow (matches MaestroCursor approach).
 *
 * 🔒 v1.2 PRESERVED EXACTLY (all non-renderSVG behavior):
 *   ✅ CURSOR_WIDTH=12 / SPINE_WIDTH=2 / CAP_HEIGHT=40 / TOP_RADIUS=6 — same geometry
 *   ✅ CURSOR_POSITION_RATIO=0.144 computed externally — this class is purely visual
 *   ✅ applyStyles(): translateX(-50%) centering, overflow:visible, z-index:20000
 *   ✅ updateX() / destroy() API — unchanged
 *   ✅ No shared DOM IDs — P2 dual-mount safe
 *   ✅ Constructor signature unchanged — AlphaTabRenderer.tsx requires no edits
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

    /**
     * @param wrapper       — NON-scrolling parent div (overlay's position:absolute parent)
     * @param container     — .alphatab-container — kept for API symmetry / future use
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
        console.log('✅ FixedLandscapeCursor v1.4: attached at x=', x);
    }

    updateX(): void {
        this.el.style.left = `${this.getCursorBoxX()}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor v1.3: destroyed');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private applyStyles(x: number): void {
        Object.assign(this.el.style, {
            // [v1.4] position: fixed — bypasses all stacking context inheritance.
            // The wrapper has z-index:10 (below TopMenuTray z-index:50), which caused
            // the teardrop cap (top 40px) to paint behind the header.
            // fixed elements compete in the global stacking context at their own z-index.
            // z-index: 20000 > header (50) > everything else — cap always visible.
            // left: Xpx in fixed = Xpx from viewport left — correct for full-width pages.
            position: 'fixed',
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
        console.log('🔥 FixedLandscapeCursor v1.4 renderSVG — TEARDROP BUILD ACTIVE');

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;

        // ── [S5] Spine — plain <div>, no SVG ─────────────────────────────────
        // A colored div is simpler than an SVG rect and avoids coordinate-space
        // ambiguity on iOS Safari (height:"100%" in SVG can behave unexpectedly
        // inside absolutely-positioned containers).
        const spineDiv = document.createElement('div');
        Object.assign(spineDiv.style, {
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: `${spineLeft}px`,
            width: `${SPINE_WIDTH}px`,
            background: this.opts.spineColor,
            zIndex: '0',
            pointerEvents: 'none',
        });

        // ── [S4/S6] Cap — single SVG via DOM API ─────────────────────────────
        // createElementNS bypasses the HTML parser entirely — no sibling-drop bug.
        // viewBox="0 0 12 40" with fixed height=40 pins the coordinate space so
        // path coords (0–40px) always match the rendered element exactly.
        // CSS drop-shadow matches MaestroCursor — no SVG <filter> defs needed.
        const ns = 'http://www.w3.org/2000/svg';

        const capSvg = document.createElementNS(ns, 'svg');
        capSvg.setAttribute('width', `${w}`);
        capSvg.setAttribute('height', `${capH}`);
        capSvg.setAttribute('viewBox', `0 0 ${w} ${capH}`);
        Object.assign(capSvg.style, {
            display: 'block',
            position: 'absolute',
            top: '0',
            left: '0',
            overflow: 'visible',
            zIndex: '1',
            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
            pointerEvents: 'none',
        });

        // Teardrop body — rounded top, pointed bottom
        const capPath = document.createElementNS(ns, 'path');
        capPath.setAttribute('d',
            `M 0,${topR} Q 0,0 ${topR},0 L ${w - topR},0 Q ${w},0 ${w},${topR} V ${baseY} L ${mid} ${capH} L 0 ${baseY} Z`
        );
        capPath.setAttribute('fill', this.opts.capFill);

        // White dot — same geometry as MaestroCursor v4.6
        const dotPath = document.createElementNS(ns, 'path');
        dotPath.setAttribute('d',
            `M ${mid - 3.5} 6 C ${mid - 3.5} 4.3 ${mid - 2} 3 ${mid} 3 C ${mid + 2} 3 ${mid + 3.5} 4.3 ${mid + 3.5} 6 C ${mid + 3.5} 8.5 ${mid + 1} 12 ${mid} 12 C ${mid - 1} 12 ${mid - 3.5} 8.5 ${mid - 3.5} 6 Z`
        );
        dotPath.setAttribute('fill', this.opts.dotFill);

        capSvg.appendChild(capPath);
        capSvg.appendChild(dotPath);

        // Clear and mount — no innerHTML anywhere in this method
        this.el.innerHTML = '';
        this.el.appendChild(spineDiv);
        this.el.appendChild(capSvg);
    }
}