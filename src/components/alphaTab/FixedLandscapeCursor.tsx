/**
 * FixedLandscapeCursor.tsx
 * Version: v2.0-recovery+bass-height-overhang-fix
 * Date: July 23rd, 2026
 *
 * CURSOR-BASS-HEIGHT-001 correction — bass top overhang:
 * ✅ The first CURSOR-BASS-HEIGHT-001 patch computed reduced-line-count height as just
 *        span + CURSOR_TIP_GAP_PX, which correctly anchored the bottom tip but left ZERO
 *        clearance above the top staff line — the head sat inside/below the top string
 *        instead of above it (caught in Brett's Chrome Emulator smoke). Guitar's own
 *        ~20px top overhang was never an explicit term; it fell out incidentally from the
 *        CAP_HEIGHT floor (99 - 65 - 14 ≈ 20) that only guitar-scale staves hit.
 * ✅ Reduced-line-count staves now compute an explicit topOverhang term from the staff's
 *        own line spacing (lineGap = span/(lineCount-1), overhang = 1.5*lineGap) instead of
 *        relying on a floor that guitar happens to hit but bass never did. The 1.5
 *        multiplier reproduces guitar's own already-accepted overhang almost exactly when
 *        applied to guitar's numbers, so it's the same proportion, not a new tuning value.
 * 🚫 Guitar-scale branch (lineCount >= threshold) untouched — byte-identical formula to the
 *        prior patch and to the original CURSOR-STAFF-ANCHOR-001-B recovery.
 *
 * CURSOR-BASS-HEIGHT-001 — adaptive height for reduced-line-count staves:
 * ✅ CAP_HEIGHT was doing double duty: the artwork's own authored canvas size AND the
 *        height floor in updateLayout(). Guitar's real need (span+gap≈79) and bass's real
 *        need (span+gap≈53) were BOTH under CAP_HEIGHT(99), so the floor always won for
 *        both — height was always exactly 99 regardless of instrument, and the artwork was
 *        never actually redrawn relative to its own size. That's why bass rendered
 *        identically to guitar despite correctly detecting a 4-line staff.
 * ✅ Floor is now conditional on the detected lineCount (already returned by
 *        detectStaffLineGeometry() — no new helper/file needed): staves with
 *        REDUCED_HEIGHT_LINE_THRESHOLD or more lines (guitar's 6 and up) keep the exact
 *        CAP_HEIGHT floor Brett accepted, unchanged. Staves with fewer lines (bass, etc.)
 *        drop to a small artwork-minimum floor and let the real detected span drive the
 *        height down instead — geometry-driven, not song/artist/track-name-driven.
 * ✅ The artwork itself is now redrawn (not scaled) per updateLayout() call via
 *        applyCapArtwork(): same single teardrop <path> formula as always, just
 *        parametrized by the current total height instead of the hardcoded CAP_HEIGHT.
 *        TOP_RADIUS and TIP_TAPER_PX (the head rounding and the tip's taper length) stay
 *        fixed constants regardless of height — only the straight-sided middle "shaft"
 *        portion of the SAME path shrinks. No new SVG pieces, no CSS transform/scaleY.
 * 🚫 Fallback path unchanged: still the exact CAP_HEIGHT-sized artwork, top-anchored via
 *        CAP_OVERHANG_PX, exactly as before.
 *
 * CURSOR-STAFF-ANCHOR-001-B — clean visual reset:
 * ✅ v2.1 (uniform scaleY of the whole cap) and v2.2 (three-piece head/shaft/tip redraw)
 *        both failed manual Chrome Emulator smoke — the scaled version squashed the
 *        teardrop into the staff, and the three-piece version produced an unrecognizable
 *        "arrow" tip. Both are fully reverted here.
 * ✅ Restored: the original HEAD artwork below (spine <div>, single fixed-CAP_HEIGHT
 *        teardrop <svg> with its dot) is byte-for-byte the same rendering v1.9 shipped —
 *        no new path, no decomposition, no CSS scaling.
 * ✅ Kept: updateLayout()'s primary branch still anchors to detectStaffLineGeometry()'s
 *        live staff geometry instead of the flat CURSOR_TOP_OFFSET calibration constant —
 *        this is the one part of 001-B that was validated (mathematically and against six
 *        real songs) before the visual experiments went wrong, so it stays. Fallback path
 *        (detectStaffLineGeometry() returns null) is exactly the original v1.9 behavior.
 * 🚫 No new constants beyond CURSOR_TIP_GAP_PX (the only thing the validated positioning
 *        logic needs beyond what v1.9 already had). No song/artist/track-specific values.
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
 * ✅ [S20] CAP_OVERHANG_PX = 0 constant — set to 26 to re-enable Maestro overhang once
 *          staff is in final position. capSvg.style.top reads from constant, not hardcoded.
 * ✅ [S21] CAP_HEIGHT = 90 — do not tune until GP8 lane compaction lands.
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

import { detectStaffLineGeometry } from '@/lib/alphaTab/staffLineGeometry';

// [MAESTRO-CURSOR-004] Diagnostic-only, false-by-default lifecycle probe. Identifies who
// destroys this class's DOM element and why it may not be recreated (observed: the
// element disappears from the DOM entirely in Chrome Emulator after the tab/window loses
// and regains focus while idle in landscape; playback does not recreate it). No behavior
// change when false. Do not leave true.
const CURSOR_LIFECYCLE_PROBE = false;
if (CURSOR_LIFECYCLE_PROBE) {
    console.log('[CursorLifecycleProbe:loaded]', {
        isoTimestamp: new Date().toISOString(),
        file: 'FixedLandscapeCursor.tsx',
        version: 'v1.9',
    });
}

const CURSOR_WIDTH = 14;
const SPINE_WIDTH = 1;
const CAP_HEIGHT = 99;   // landscape — do not tune until GP8 lanes are normalized
const CAP_OVERHANG_PX = 0;    // set to 26 to re-enable Maestro "peeks into gutter" feel
const TOP_RADIUS = 6;
// CURSOR_TOP_OFFSET — legacy calibration constant, used only by the fallback path below
// (detectStaffLineGeometry() returned null). Kept exactly as-is for that safety-net case;
// no longer used when live staff geometry is available.
const CURSOR_TOP_OFFSET = 100;
// [CURSOR-STAFF-ANCHOR-001-B] Small, cosmetic-only clearance between the cap's tip and the
// bottom-most detected staff line so they don't visually overlap. A UI offset, not a
// layout calibration — not derived from Van Halen, Keith Urban, or any specific song.
const CURSOR_TIP_GAP_PX = 14;
// [CURSOR-BASS-HEIGHT-001] Geometry-driven height floor split — not song/artist/track
// specific. A staff with this many detected lines or more (guitar's standard 6) keeps the
// exact CAP_HEIGHT floor Brett accepted; fewer lines (bass, etc.) uses the smaller floor
// below and lets the real detected span drive the height down instead.
const REDUCED_HEIGHT_LINE_THRESHOLD = 6;
// Small artwork-minimum floor for reduced-line-count staves — just enough for the fixed
// head + tip taper to render recognizably even in a pathological near-zero-span case.
// Well below a real bass's computed height (~72px observed) so it never interferes.
const MIN_REDUCED_HEIGHT_PX = 40;
// [CURSOR-BASS-HEIGHT-001 correction] Multiplier applied to a staff's own line spacing
// (span / (lineCount-1)) to derive the top overhang for reduced-line-count staves. Chosen
// because it reproduces guitar's own already-accepted overhang almost exactly when applied
// to guitar's numbers (span 65, lineCount 6 → lineGap 13 → 1.5*13=19.5 ≈ the ~20px guitar
// gets from CAP_HEIGHT - span - CURSOR_TIP_GAP_PX) — the same visual proportion carried to
// any line count/spacing, not a new arbitrary constant.
const TOP_OVERHANG_LINE_GAP_MULTIPLIER = 1.5;
// Fixed taper length (bottom point), extracted from the historical hardcoded "capH - 8".
// Stays constant regardless of total height — the tip's own proportions never change,
// only the straight-sided shaft above it does.
const TIP_TAPER_PX = 8;
// ── CALIBRATION LOG (historical — fallback path only) ────────────────────────────────────
// Measured April 21, 2026 on iPhone landscape (Dynamic Island device):
//   headerBottom = 80px (TopMenuTray)
//   visualTop = 80 + 100 = 180px → cursorTop: 180 ✅
//   cursor tip touching G string (4th string) — correct pre-gp8-fix position.
// After gp8 lane normalization moves notation up, re-run probe and adjust if needed.
//   Target post-fix: tip at top of notation staff, ~top of high-E string area.
// ─────────────────────────────────────────────────────────────────────────────
// ── Colors ────────────────────────────────────────────────────────────────────
const SPINE_COLOR = 'rgba(168, 85, 247, 0)'; // alpha 0 — spine hidden per Brett's manual baseline, node kept (not deleted)
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
    private capPathEl: SVGPathElement | null = null;  // [CURSOR-BASS-HEIGHT-001] ref for in-place redraw

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
        // [MAESTRO-CURSOR-004] Area B — create/body-mount probe.
        if (CURSOR_LIFECYCLE_PROBE) {
            console.log('[CursorLifecycleProbe:mount]', {
                performanceNow: performance.now(),
                isoTimestamp: new Date().toISOString(),
                viewportX: parseFloat(this.el.style.left),
                top: parseFloat(this.el.style.top),
                height: parseFloat(this.el.style.height),
                visibilityState: document.visibilityState,
                hasFocus: document.hasFocus(),
                bodyContainsCursor: document.body.contains(this.el),
                containerExists: !!this.container,
                containerConnected: this.container?.isConnected ?? null,
                // Orientation/strip-mode flags (forceHorizontal, isStripMode, etc.) are not
                // cheaply available at this layer — this class receives only
                // wrapper/container/getCursorBoxX, not orientation state. See the
                // AlphaTabRenderer.tsx create-skip probe for those.
            });
            console.trace('[CursorLifecycleProbe:mount] stack');
        }
    }

    /** Atomic re-pin: left + top + height. Call from ResizeObserver + visualViewport. */
    updateLayout(): void {
        const rect = this.container.getBoundingClientRect();

        // [S18] Convert container-space X → viewport-space X for body-mounted element.
        // getFixedCursorX() returns px from container's left edge; rect.left offsets to screen.
        const cursorBoxX = this.getCursorBoxX();
        const viewportX = rect.left + cursorBoxX;

        // [CURSOR-STAFF-ANCHOR-001-B] Primary anchor: the real, final painted staff/TAB
        // line geometry — same detector CENTERLINE-C uses, read here in viewport space, so
        // whatever compensating shift (or clamp) centerline already applied is already
        // baked into these numbers. No song-specific constant involved. Artwork below is
        // untouched HEAD artwork — only this positioning math changes vs. the original.
        const geometry = detectStaffLineGeometry(this.container);

        if (geometry) {
            const tipY = geometry.staffBottomViewport + CURSOR_TIP_GAP_PX;
            let height: number;
            if (geometry.lineCount >= REDUCED_HEIGHT_LINE_THRESHOLD) {
                // Guitar-scale staves (>= threshold lines): exact pre-existing formula,
                // byte-for-byte unchanged. CAP_HEIGHT floor supplies the ~20px top
                // overhang above the staff (99 - 65 - 14 ≈ 20 for a typical guitar span) —
                // this branch is untouched by CURSOR-BASS-HEIGHT-001.
                const spineTopY = geometry.staffTopViewport;
                height = Math.max(CAP_HEIGHT, tipY - spineTopY);
            } else {
                // [CURSOR-BASS-HEIGHT-001 correction] Reduced-line-count staves (bass,
                // etc.) need an explicit top overhang term too — span + tip gap alone
                // (the original bass-height patch) left zero clearance above the top
                // string, so the head sat inside/below the top line instead of above it.
                // topOverhang is derived from the staff's own line spacing, not a fixed
                // px value: lineGap = span / (lineCount-1), overhang ≈ 1.5 * lineGap —
                // this ratio reproduces guitar's own accepted ~20px overhang almost
                // exactly (65/5=13 * 1.5≈19.5) when applied to guitar's numbers, so it's
                // the same visual proportion, not a new made-up constant, and it scales
                // naturally to whatever line count/spacing a given staff actually has.
                const lineGap = geometry.span / Math.max(1, geometry.lineCount - 1);
                const topOverhang = TOP_OVERHANG_LINE_GAP_MULTIPLIER * lineGap;
                const rawHeight = geometry.span + CURSOR_TIP_GAP_PX + topOverhang;
                height = Math.max(MIN_REDUCED_HEIGHT_PX, rawHeight);
            }
            const topY = tipY - height;

            Object.assign(this.el.style, {
                left: `${viewportX}px`,
                top: `${topY}px`,
                height: `${height}px`,
                display: 'block',
                visibility: 'visible',
                opacity: '1',
            });
            // [CURSOR-BASS-HEIGHT-001] Artwork is redrawn to fill the element exactly (not
            // scaled, not offset) — capSvg.style.top can stay 0 unconditionally now, since
            // the artwork's own canvas size always matches `height` by construction.
            this.applyCapArtwork(height);
            if (this.capSvg) this.capSvg.style.top = '0px';
            return;
        }

        // [CURSOR-STAFF-ANCHOR-001-B] Graceful fallback — staff-line detection found fewer
        // than 2 line candidates (or an implausible span). Falls through to the exact
        // pre-001-B container-relative placement, unchanged, rather than guessing at a
        // staff position that couldn't be confirmed live. A slightly-off cursor here beats
        // a blank or teleporting one.
        const headerBottom = this.getHeaderBottomFloor();
        // Math.max: rect.top is sub-pixel (~0.4) in landscape — ">" guard fails.
        // Taking the larger of the two always lands at headerBottom (80px) when
        // the container starts at viewport top, and naturally uses rect.top when
        // content is genuinely pushed below the header.
        const visualTop = Math.max(rect.top, headerBottom) + CURSOR_TOP_OFFSET;

        Object.assign(this.el.style, {
            left: `${viewportX}px`,
            top: `${visualTop}px`,
            height: `${rect.height}px`,
            display: 'block',
            visibility: 'visible',
            opacity: '1',
        });

        // [CURSOR-BASS-HEIGHT-001] Restore the artwork to its original authored size —
        // a prior call may have taken the primary (geometry) branch above and left it
        // redrawn smaller (bass) or larger; this is the exact pre-001 fallback look,
        // unconditionally, regardless of which branch ran last.
        this.applyCapArtwork(CAP_HEIGHT);
        // CAP_OVERHANG_PX = 0: cap starts flush at notation area top.
        // Set to 26 once staff is in final position to re-enable Maestro overhang.
        if (this.capSvg) this.capSvg.style.top = `${-CAP_OVERHANG_PX}px`;
    }

    /** Legacy alias — ResizeObserver calls this; routes to updateLayout(). */
    updateX(): void { this.updateLayout(); }

    destroy(): void {
        // [MAESTRO-CURSOR-004] Area A — destroy-path probe. Captured BEFORE removal so
        // "before" reflects true pre-destroy state; a second log after removal confirms
        // the element actually left the DOM (vs. e.g. being merely hidden).
        if (CURSOR_LIFECYCLE_PROBE) {
            console.log('[CursorLifecycleProbe:destroy]', {
                performanceNow: performance.now(),
                isoTimestamp: new Date().toISOString(),
                visibilityState: document.visibilityState,
                hasFocus: document.hasFocus(),
                bodyContainsCursorBefore: document.body.contains(this.el),
                elExists: !!this.el,
                containerExists: !!this.container,
                containerConnected: this.container?.isConnected ?? null,
                capSvgExists: !!this.capSvg,
                left: this.el?.style.left ?? null,
                top: this.el?.style.top ?? null,
                height: this.el?.style.height ?? null,
                display: this.el?.style.display ?? null,
                visibility: this.el?.style.visibility ?? null,
                opacity: this.el?.style.opacity ?? null,
            });
            console.trace('[CursorLifecycleProbe:destroy] stack');
        }
        if (this.el.parentElement) this.el.parentElement.removeChild(this.el);
        if (CURSOR_LIFECYCLE_PROBE) {
            console.log('[CursorLifecycleProbe:destroy] after-removal', {
                bodyContainsCursorAfter: document.body.contains(this.el),
            });
        }
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
            zIndex: '4000',
            background: 'transparent',
            overflow: 'visible',
            willChange: 'left, top, height',
        });
    }

    private renderSVG(): void {
        console.log('🔥 FixedLandscapeCursor v1.9 renderSVG');

        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const spineLeft = mid - SPINE_WIDTH / 2;

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
        Object.assign(capSvg.style, {
            display: 'block',
            position: 'absolute',
            top: '0',   // overridden by updateLayout() via CAP_OVERHANG_PX
            left: '0',
            overflow: 'visible',
            zIndex: '1',
            filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.7))', // strengthened — old 4px/0.5 was barely visible
            pointerEvents: 'none',
        });

        // Teardrop body — 'd' attribute filled in by applyCapArtwork() below, same as
        // every subsequent updateLayout() call; not hardcoded here.
        const capPath = document.createElementNS(ns, 'path');
        capPath.setAttribute('fill', this.opts.capFill);

        // White dot — MaestroCursor v4.6 geometry + transform. Fixed regardless of total
        // height (part of "the fixed head"), so authored once here and never touched again.
        const dotCenterX = mid;
        const dotCenterY = 6.5;
        const dotScale = 1.28;
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
        this.capPathEl = capPath;  // [CURSOR-BASS-HEIGHT-001] store ref for in-place redraw
        this.applyCapArtwork(CAP_HEIGHT);  // initial size before the first updateLayout()
    }

    /**
     * [CURSOR-BASS-HEIGHT-001] Redraws (does not scale) the SAME single teardrop path at
     * the given total height. TOP_RADIUS (head rounding) and TIP_TAPER_PX (tip taper
     * length) are fixed constants regardless of totalHeight — only the straight-sided
     * middle "shaft" between them (from the head's rounded corner down to where the taper
     * begins) grows or shrinks. This is what lets a reduced-line-count staff (bass) render
     * genuinely shorter while a guitar-scale staff keeps the exact accepted proportions.
     */
    private applyCapArtwork(totalHeight: number): void {
        if (!this.capSvg || !this.capPathEl) return;
        const w = CURSOR_WIDTH;
        const mid = w / 2;
        const topR = Math.min(TOP_RADIUS, mid);
        // Clamp so an extreme (pathological) small totalHeight can't invert the taper —
        // not reachable in normal use since MIN_REDUCED_HEIGHT_PX already exceeds this.
        const baseY = Math.max(topR, totalHeight - TIP_TAPER_PX);

        this.capSvg.setAttribute('width', `${w}`);
        this.capSvg.setAttribute('height', `${totalHeight}`);
        this.capSvg.setAttribute('viewBox', `0 0 ${w} ${totalHeight}`);
        this.capPathEl.setAttribute('d',
            `M 0,${topR} Q 0,0 ${topR},0 L ${w - topR},0 Q ${w},0 ${w},${topR} V ${baseY} L ${mid} ${totalHeight} L 0 ${baseY} Z`
        );
    }
}
