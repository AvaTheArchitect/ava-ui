/**
 * FixedLandscapeCursor.tsx
 * Version: v1.7
 * Date: April 20th, 2026
 *
 * v1.7 CHANGES:
 * ✅ [S12] containerTop offset: cap and spine now start at container.getBoundingClientRect().top
 *          instead of top:0 (viewport top). Positions teardrop at notation area, not
 *          behind TopMenuTray. containerTop stored in constructor — valid post-curtain-drop.
 * ✅ [S13] Purple colors restored (confirmed rendering in v1.6 debug pass).
 * 🔒 v1.6 PRESERVED: document.body mount, getViewportX(), DOM API renderSVG, dot transform
 *
 * 🔒 v1.4 PRESERVED EXACTLY:
 *   ✅ position: fixed (stacking context bypass — cap above TopMenuTray)
 *   ✅ DOM API renderSVG — no innerHTML, no Safari sibling-drop bug
 *   ✅ Spine as plain <div>, cap as single createElementNS <svg>
 *   ✅ CSS drop-shadow on cap (no SVG filter defs)
 *   ✅ Constructor signature unchanged — AlphaTabRenderer.tsx needs no edits
 *   ✅ No shared DOM IDs — P2 dual-mount safe
 */

const CURSOR_WIDTH = 12;
const SPINE_WIDTH = 2;
const CAP_HEIGHT = 40;
const TOP_RADIUS = 6;
// ── Colors ────────────────────────────────────────────────────────────────────
const SPINE_COLOR = 'rgba(168, 85, 247, 0.85)';   // purple — matches MaestroCursor
const CAP_FILL = 'rgba(168, 85, 247, 0.45)';   // purple translucent
const DOT_FILL = 'white';

export interface FixedLandscapeCursorOptions {
    spineColor?: string;
    capFill?: string;
    dotFill?: string;
}

export class FixedLandscapeCursor {
    private el: HTMLElement;
    private container: HTMLElement;
    private containerTop: number = 0;  // [S12] viewport-space top of notation area
    private getCursorBoxX: () => number;
    private opts: Required<FixedLandscapeCursorOptions>;

    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,
        getCursorBoxX: () => number,
        options: FixedLandscapeCursorOptions = {},
    ) {
        this.container = container;
        // [S12] Snapshot container top at mount time (post curtain-drop, layout stable).
        // Used to offset cap + spine so they start at the notation area, not viewport top.
        this.containerTop = Math.round(container.getBoundingClientRect().top);
        this.getCursorBoxX = getCursorBoxX;
        this.opts = {
            spineColor: options.spineColor ?? SPINE_COLOR,
            capFill: options.capFill ?? CAP_FILL,
            dotFill: options.dotFill ?? DOT_FILL,
        };

        this.el = document.createElement('div');
        this.el.className = 'maestro-landscape-cursor';

        const x = this.getViewportX();   // [S7] viewport space
        this.applyStyles(x);
        this.renderSVG();

        // [S10] Mount on document.body — escapes overflow:hidden containment.
        // iOS Safari: position:fixed inside overflow:hidden ancestor → acts like
        // position:absolute. <main> has overflow-x/y-hidden in landscape.
        // document.body has no overflow trap. destroy() uses parentElement.removeChild
        // so cleanup works correctly regardless of mount point.
        document.body.appendChild(this.el);
        console.log('✅ FixedLandscapeCursor v1.7: body-mounted', { viewportX: x, containerTop: this.containerTop });
    }

    // [S7] viewport-space X for position:fixed elements
    private getViewportX(): number {
        const rect = this.container.getBoundingClientRect();
        return rect.left + this.getCursorBoxX();
    }

    updateX(): void {
        this.el.style.left = `${this.getViewportX()}px`;  // [S7]
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor v1.7: destroyed');  // ← was v1.6
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private applyStyles(x: number): void {
        Object.assign(this.el.style, {
            // position:fixed — bypasses stacking context hierarchy.
            // Competes globally at z-index:20000 > TopMenuTray(50) > everything.
            // left uses viewport X (rect.left + cursorBoxX), not container-relative.
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
        console.log('🔥 FixedLandscapeCursor v1.7 renderSVG — containerTop=', this.containerTop);

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;
        const topOffset = `${this.containerTop}px`;  // [S12] was missing — caused TS2304

        // Spine — plain <div>, starts at notation area top
        const spineDiv = document.createElement('div');
        Object.assign(spineDiv.style, {
            position: 'absolute',
            top: topOffset,   // notation area, not viewport top
            bottom: '0',
            left: `${spineLeft}px`,
            width: `${SPINE_WIDTH}px`,
            background: this.opts.spineColor,
            zIndex: '0',
            pointerEvents: 'none',
        });

        // Cap — single SVG via DOM API (no innerHTML, no Safari sibling-drop)
        const ns = 'http://www.w3.org/2000/svg';

        const capSvg = document.createElementNS(ns, 'svg');
        capSvg.setAttribute('width', `${w}`);
        capSvg.setAttribute('height', `${capH}`);
        capSvg.setAttribute('viewBox', `0 0 ${w} ${capH}`);
        Object.assign(capSvg.style, {
            display: 'block',
            position: 'absolute',
            top: topOffset,   // notation area, not viewport top
            left: '0',
            overflow: 'visible',
            zIndex: '1',
            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
            pointerEvents: 'none',
        });

        // Teardrop body
        const capPath = document.createElementNS(ns, 'path');
        capPath.setAttribute('d',
            `M 0,${topR} Q 0,0 ${topR},0 L ${w - topR},0 Q ${w},0 ${w},${topR} V ${baseY} L ${mid} ${capH} L 0 ${baseY} Z`
        );
        capPath.setAttribute('fill', this.opts.capFill);

        // White dot — MaestroCursor v4.6 geometry + transform [S8]
        const dotCenterX = mid;
        const dotCenterY = 7.5;
        const dotScale = 1.18;
        const dotPath = document.createElementNS(ns, 'path');
        dotPath.setAttribute('d',
            `M ${mid - 3.5} 6 C ${mid - 3.5} 4.3 ${mid - 2} 3 ${mid} 3 C ${mid + 2} 3 ${mid + 3.5} 4.3 ${mid + 3.5} 6 C ${mid + 3.5} 8.5 ${mid + 1} 12 ${mid} 12 C ${mid - 1} 12 ${mid - 3.5} 8.5 ${mid - 3.5} 6 Z`
        );
        dotPath.setAttribute('fill', this.opts.dotFill);
        dotPath.setAttribute('transform',
            `translate(${dotCenterX} ${dotCenterY}) scale(${dotScale}) translate(${-dotCenterX} ${-dotCenterY})`
        );

        capSvg.appendChild(capPath);
        capSvg.appendChild(dotPath);

        this.el.innerHTML = '';
        this.el.appendChild(spineDiv);
        this.el.appendChild(capSvg);
    }
}