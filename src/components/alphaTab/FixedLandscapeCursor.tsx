/**
 * FixedLandscapeCursor.tsx
 * Version: v1.9
 * Date: April 21st, 2026
 *
 * v1.9 CHANGES:
 * ✅ [S17] getHeaderBottomFloor() — geometry-based scan (r.top <= 1) instead of
 *          class-name matching. Catches Tailwind "fixed top-0 inset-x-0" header
 *          that has no "menu"/"header" keyword. Returns 80px on current iPhone landscape.
 * ✅ [S18] Viewport X conversion: viewportX = rect.left + cursorBoxX.
 *          body-mount means left is screen space, not container space. Without this,
 *          left:182px = 182px from screen edge, not 182px into the music strip.
 * ✅ [S19] updateLayout() — atomic: left + top + height in one shot.
 *          "Peace treaty" top: rect.top if trustworthy (>0), else headerBottomFloor.
 *          height: rect.height (spans notation area only, not full viewport).
 * ✅ [S20] capSvg ref stored → capSvg.style.top = '-26px' Maestro overhang.
 *          Cap peeks 26px into gutter above staff, matching portrait MaestroCursor feel.
 * ✅ [S21] CAP_HEIGHT = 50 — proportional to landscape notation strip height.
 *
 * 🔒 v1.6–v1.8 PRESERVED:
 *   ✅ document.body mount (iOS overflow:hidden fixed-trap bypass)
 *   ✅ DOM API renderSVG — no innerHTML, no Safari sibling-drop bug
 *   ✅ Spine as plain <div>, cap as createElementNS <svg>
 *   ✅ CSS drop-shadow, dot transform matching MaestroCursor v4.6
 *   ✅ Purple colors, no shared DOM IDs, P2 dual-mount safe
 *
 * AlphaTabRenderer.tsx — NO call-site changes needed.
 *   landscapeCursorRef.current = new FixedLandscapeCursor(wrapper, h, () => getFixedCursorX(h));
 *   ResizeObserver + visualViewport already call updateLayout() via updateX() alias.
 */

const CURSOR_WIDTH = 12;
const SPINE_WIDTH = 2;
const CAP_HEIGHT = 50;   // [S21] proportional to landscape strip (~300px tall)
const TOP_RADIUS = 6;
// ── Colors ────────────────────────────────────────────────────────────────────
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
    private container: HTMLElement;
    private getCursorBoxX: () => number;
    private opts: Required<FixedLandscapeCursorOptions>;
    private capSvg: SVGSVGElement | null = null;  // [S20] ref for overhang update

    constructor(
        wrapper: HTMLElement,
        container: HTMLElement,
        getCursorBoxX: () => number,
        options: FixedLandscapeCursorOptions = {},
    ) {
        this.container = container;
        this.getCursorBoxX = getCursorBoxX;
        this.opts = {
            spineColor: options.spineColor ?? SPINE_COLOR,
            capFill: options.capFill ?? CAP_FILL,
            dotFill: options.dotFill ?? DOT_FILL,
        };

        this.el = document.createElement('div');
        this.el.className = 'maestro-landscape-cursor';

        this.applyBaseStyles();
        this.renderSVG();

        // [S10] Body-mount escapes iOS overflow:hidden fixed-positioning trap.
        document.body.appendChild(this.el);

        this.updateLayout();  // set left + top + height after mount
        console.log('✅ FixedLandscapeCursor v1.9: body-mounted', {
            viewportX: parseFloat(this.el.style.left),
            top: parseFloat(this.el.style.top),
            height: parseFloat(this.el.style.height),
        });
    }

    /** Atomic re-pin: left + top + height. Call from ResizeObserver + visualViewport. */
    updateLayout(): void {
        const rect = this.container.getBoundingClientRect();

        // [S18] Convert container-space X → viewport-space X for body-mounted element.
        // getFixedCursorX() returns px from container's left edge; rect.left offsets to screen.
        const cursorBoxX = this.getCursorBoxX();
        const viewportX = rect.left + cursorBoxX;

        // [S17] "Peace treaty" Y: use rect.top if Safari reports it correctly (> 0).
        // If container starts at y:0 (fixed TopMenuTray is an overlay, not layout flow),
        // fall back to the measured bottom of any top-pinned fixed element.
        const headerBottom = this.getHeaderBottomFloor();
        // Math.max: rect.top is sub-pixel (~0.4) in landscape — ">" guard fails.
        // Taking the larger of the two always lands at headerBottom (80px) when
        // the container starts at viewport top, and naturally uses rect.top when
        // content is genuinely pushed below the header.
        const visualTop = Math.max(rect.top, headerBottom);

        Object.assign(this.el.style, {
            left: `${viewportX}px`,
            top: `${visualTop}px`,
            height: `${rect.height}px`,
            display: 'block',
            visibility: 'visible',
            opacity: '1',
        });

        // [S20] Maestro overhang — cap peeks 26px above notation strip top.
        if (this.capSvg) this.capSvg.style.top = '-26px';
    }

    /** Legacy alias — ResizeObserver calls this; routes to updateLayout(). */
    updateX(): void { this.updateLayout(); }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor v1.9: destroyed');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /**
     * [S17] Geometry-based fixed-header scan. Matches on r.top <= 1 (pinned to
     * viewport top), NOT class names. Catches Tailwind "fixed top-0 inset-x-0"
     * without needing to know the element's class. Returns largest bottom edge found.
     * Console output confirmed: TopMenuTray bottom = 80.0px on iPhone landscape.
     */
    private getHeaderBottomFloor(): number {
        let maxBottom = 0;
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
            if (el === this.el) continue;                          // skip self
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.height <= 0) continue;
            if (r.top <= 1 && r.bottom > maxBottom) maxBottom = r.bottom;
        }
        return Math.round(maxBottom);
    }

    /** Base styles only — no top/height (those come from updateLayout). */
    private applyBaseStyles(): void {
        Object.assign(this.el.style, {
            position: 'fixed',
            width: `${CURSOR_WIDTH}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: '20000',
            background: 'transparent',
            overflow: 'visible',
            willChange: 'left, top, height',
        });
    }

    private renderSVG(): void {
        console.log('🔥 FixedLandscapeCursor v1.9 renderSVG');

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;

        // Spine — fills notation area (top:0/bottom:0 relative to cursor el)
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

        // Cap — top overridden to -26px in updateLayout() for Maestro overhang [S20]
        const ns = 'http://www.w3.org/2000/svg';
        const capSvg = document.createElementNS(ns, 'svg');
        capSvg.setAttribute('width', `${w}`);
        capSvg.setAttribute('height', `${capH}`);
        capSvg.setAttribute('viewBox', `0 0 ${w} ${capH}`);
        Object.assign(capSvg.style, {
            display: 'block',
            position: 'absolute',
            top: '0',   // overridden to -26px by updateLayout()
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

        // White dot — MaestroCursor v4.6 geometry + transform
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

        this.capSvg = capSvg;  // [S20] store ref for overhang update
    }
}