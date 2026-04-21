/**
 * FixedLandscapeCursor.tsx
 * Version: v1.6
 * Date: April 20th, 2026
 *
 * v1.6 CHANGES:
 * ✅ [S10] Mount on document.body instead of wrapper.
 *          Root cause: iOS Safari treats position:fixed as position:absolute when
 *          any ancestor has overflow:hidden. <main> has overflow-x/y-hidden in
 *          landscape — this trapped the cursor inside that scroll container.
 *          document.body has no overflow containment, so fixed positioning works
 *          correctly and z-index:20000 competes in the true global stacking context.
 * ✅ [S11] High-contrast debug colors: black spine, red cap.
 *          Confirms rendering+visibility before restoring purple palette.
 *          Revert SPINE_COLOR/CAP_FILL to purple after confirmed working.
 * 🔒 v1.5 PRESERVED: getViewportX(), DOM API renderSVG, dot transform, destroy()
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
// ── Debug colors — revert to purple after confirmed working ──────────────────
const SPINE_COLOR = 'rgba(0, 0, 0, 1)';        // [S11] black — max contrast
const CAP_FILL = 'rgba(255, 0, 0, 0.95)';   // [S11] red — unmissable
const DOT_FILL = 'white';

export interface FixedLandscapeCursorOptions {
    spineColor?: string;
    capFill?: string;
    dotFill?: string;
}

export class FixedLandscapeCursor {
    private el: HTMLElement;
    private container: HTMLElement;   // [S7] stored for viewport X conversion
    private getCursorBoxX: () => number;
    private opts: Required<FixedLandscapeCursorOptions>;

    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,
        getCursorBoxX: () => number,
        options: FixedLandscapeCursorOptions = {},
    ) {
        this.container = container;   // [S7]
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
        console.log('✅ FixedLandscapeCursor v1.6: body-mounted at viewportX=', x);
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
        console.log('🧹 FixedLandscapeCursor v1.6: destroyed');
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
        console.log('🔥 FixedLandscapeCursor v1.6 renderSVG — BODY MOUNT + DEBUG COLORS');

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;

        // Spine — plain <div>, full height
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

        // Cap — single SVG via DOM API (no innerHTML, no Safari sibling-drop)
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

        // Teardrop body
        const capPath = document.createElementNS(ns, 'path');
        capPath.setAttribute('d',
            `M 0,${topR} Q 0,0 ${topR},0 L ${w - topR},0 Q ${w},0 ${w},${topR} V ${baseY} L ${mid} ${capH} L 0 ${baseY} Z`
        );
        capPath.setAttribute('fill', this.opts.capFill);

        // White dot — matches MaestroCursor v4.6 geometry + transform [S8]
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