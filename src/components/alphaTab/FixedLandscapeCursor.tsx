/**
 * FixedLandscapeCursor.tsx
 * Version: v1.8
 * Date: April 20th, 2026
 *
 * v1.8 CHANGES:
 * ✅ [S14] cursor element IS the notation area — top + height set on el itself.
 *          Children (spine, cap) use top:0 relative to el. Cleaner than threading
 *          topOffset through renderSVG (v1.7 approach, which broke when containerTop=0).
 * ✅ [S15] updateLayout() — updates left + top + height atomically.
 *          Call from ResizeObserver (replace updateX()) and after mount.
 *          Handles TopMenuTray height changes, orientation, iOS visual viewport shifts.
 * ✅ [S16] getContainerTop() — scans fixed-position headers for their bottom edge.
 *          container.getBoundingClientRect().top = 0 in landscape (container starts
 *          at viewport top, just visually covered by fixed TopMenuTray). Trusting
 *          the container rect was the v1.7 bug — header scan is the correct approach.
 *
 * 🔒 v1.6/v1.7 PRESERVED:
 *   ✅ document.body mount (iOS overflow:hidden trap bypass)
 *   ✅ DOM API renderSVG — no innerHTML, no Safari sibling-drop bug
 *   ✅ Spine as plain <div>, cap as createElementNS <svg>
 *   ✅ CSS drop-shadow, dot transform matching MaestroCursor v4.6
 *   ✅ Purple colors, no shared DOM IDs, P2 dual-mount safe
 *
 * AlphaTabRenderer.tsx call site — NO CHANGES needed:
 *   landscapeCursorRef.current = new FixedLandscapeCursor(wrapper, h, () => getFixedCursorX(h));
 * ResizeObserver — change updateX() → updateLayout():
 *   if (landscapeCursorRef.current) landscapeCursorRef.current.updateLayout();
 */

const CURSOR_WIDTH = 12;
const SPINE_WIDTH = 2;
const CAP_HEIGHT = 90;  // matches Cipher v1.7 disk — taller feels proportional to portrait
const TOP_RADIUS = 6;
// ── Colors ────────────────────────────────────────────────────────────────────
const SPINE_COLOR = 'rgba(168, 85, 247, 0.85)';  // purple — matches MaestroCursor
const CAP_FILL = 'rgba(168, 85, 247, 0.45)';  // purple translucent
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

        const x = this.getViewportX();
        const top = this.getContainerTop();
        this.applyStyles(x, top);
        this.renderSVG();

        // [S10] Mount on document.body — escapes overflow:hidden containment.
        // iOS Safari: position:fixed inside overflow:hidden ancestor → acts like
        // position:absolute. document.body has no overflow trap. destroy() uses
        // parentElement.removeChild so cleanup works regardless of mount point.
        document.body.appendChild(this.el);
        console.log('✅ FixedLandscapeCursor v1.8: body-mounted', { viewportX: x, top });
    }

    /** Re-pin left + top + height in one shot. Call from ResizeObserver + after mount. */
    updateLayout(): void {
        const x = this.getViewportX();
        const top = this.getContainerTop();
        this.el.style.left = `${x}px`;
        this.el.style.top = `${top}px`;
        this.el.style.height = `${Math.max(0, window.innerHeight - top)}px`;
    }

    /** Legacy compat — ResizeObserver should prefer updateLayout(). */
    updateX(): void {
        this.el.style.left = `${this.getViewportX()}px`;
    }

    destroy(): void {
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        console.log('🧹 FixedLandscapeCursor v1.8: destroyed');
    }

    // ── Private ───────────────────────────────────────────────────────────────

    /** Viewport-space X for position:fixed elements. */
    private getViewportX(): number {
        const rect = this.container.getBoundingClientRect();
        return rect.left + this.getCursorBoxX();
    }

    /**
     * Viewport-space top of visible notation area = bottom edge of fixed header.
     * container.getBoundingClientRect().top = 0 in landscape — the container
     * starts at viewport top but is visually covered by the fixed TopMenuTray.
     * Trusting the container rect gives 0 (v1.7 bug). Instead, scan all
     * fixed-position elements for the one with the largest bottom edge.
     */
    private getContainerTop(): number {
        let maxBottom = 0;
        const candidates = document.querySelectorAll(
            'header, nav, [data-topmenutray], .top-menu-tray, [class*="TopMenu"], [class*="top-menu"]'
        );
        for (const el of Array.from(candidates)) {
            const cs = getComputedStyle(el as HTMLElement);
            if (cs.position !== 'fixed') continue;
            const r = (el as HTMLElement).getBoundingClientRect();
            if (r.bottom > maxBottom) maxBottom = r.bottom;
        }
        // Fallback: if no fixed header found, use safe-area top inset (~0 on most devices)
        return Math.round(maxBottom);
    }

    private applyStyles(x: number, top: number): void {
        Object.assign(this.el.style, {
            // [S14] el IS the notation area — top + height position it below header.
            // Children use top:0 relative to this element (no topOffset threading needed).
            position: 'fixed',
            top: `${top}px`,
            height: `${Math.max(0, window.innerHeight - top)}px`,
            left: `${x}px`,
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
        console.log('🔥 FixedLandscapeCursor v1.8 renderSVG');

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        const capH = CAP_HEIGHT;
        const spineLeft = mid - SPINE_WIDTH / 2;
        const baseY = capH - 8;

        // Spine — plain <div>. top:0 = top of el = top of notation area. [S14]
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

        // Cap — single SVG via DOM API (no innerHTML, no Safari sibling-drop bug)
        const ns = 'http://www.w3.org/2000/svg';

        const capSvg = document.createElementNS(ns, 'svg');
        capSvg.setAttribute('width', `${w}`);
        capSvg.setAttribute('height', `${capH}`);
        capSvg.setAttribute('viewBox', `0 0 ${w} ${capH}`);
        Object.assign(capSvg.style, {
            display: 'block',
            position: 'absolute',
            top: '0',   // [S14] top of el = top of notation area
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