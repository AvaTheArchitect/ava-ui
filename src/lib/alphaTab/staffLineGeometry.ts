/**
 * staffLineGeometry.ts
 *
 * CURSOR-STAFF-ANCHOR-001-B — shared staff/TAB line detector.
 *
 * Extracted from MAESTRO-LANDSCAPE-CENTERLINE-C-001-B's inline scanStaffLineCenterRel()
 * (AlphaTabRenderer.tsx) so the landscape fixed cursor can anchor to the same live-DOM
 * staff geometry centerline already detects, instead of maintaining a second detector
 * that can silently drift from it (see MAESTRO-DRUMS-001-B, where exactly that happened
 * with percussion-guard logic).
 *
 * Detection logic/tolerances are unchanged from CENTERLINE-C-001-B: this is a relocation,
 * not a re-tune. Any consumer computing a compensating shift (centerline) reads the
 * *Local values (row0 SVG-local, getBBox space); any consumer that only needs where the
 * lines actually rendered (the fixed cursor) reads the *Viewport values
 * (getBoundingClientRect space) — which reflect whatever shift/clamp centerline already
 * applied, so cursor consumers never need to know centerline's internal math at all.
 */

// Neutral (R≈G≈B) staff-line-color check for real painted TAB/staff string-line rects.
// Verified against both themes' actual rendered fill (AlphaTabRenderer's theme-resource
// block: light theme #999999/brightness 153, dark theme #555555/brightness 85).
const KNOWN_STAFF_LINE_BRIGHTNESS = [85, 153]; // dark #555555, light #999999

function isNeutralStaffLineGrey(fill: string): boolean {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fill.trim());
    if (!m) return false;
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const maxDelta = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (maxDelta > 12) return false;
    const brightness = (r + g + b) / 3;
    return KNOWN_STAFF_LINE_BRIGHTNESS.some(known => Math.abs(brightness - known) <= 12);
}

export interface StaffLineGeometry {
    /** Distinct detected staff/TAB lines — 6 for guitar, 4 for bass, etc. Not branched on by name. */
    lineCount: number;
    /** Raw qualifying rect segments before de-duplication into lines (diagnostic only). */
    candidateCount: number;
    /** Row-SVG-local y (getBBox space) — for consumers computing a compensating shift. */
    staffTopLocal: number;
    staffBottomLocal: number;
    staffCenterLocal: number;
    /** Viewport y (getBoundingClientRect space) — where the lines actually render right now. */
    staffTopViewport: number;
    staffBottomViewport: number;
    staffCenterViewport: number;
    /** staffBottomLocal - staffTopLocal. */
    span: number;
}

/**
 * Scans the first rendered staff system inside `container` for real staff/TAB line ink.
 * Returns null when fewer than 2 line candidates are found or the detected span is
 * implausible (<=0 or >150px) — callers must fall back to their own pre-existing safe
 * behavior in that case rather than guessing at a staff position that couldn't be confirmed.
 */
export function detectStaffLineGeometry(container: Element | null): StaffLineGeometry | null {
    if (!container) return null;
    const row0 = container.querySelector('svg.at-surface-svg');
    if (!row0) return null;

    const localBuckets = new Map<number, { count: number; viewportYs: number[] }>();
    for (const el of Array.from(row0.querySelectorAll('rect'))) {
        if (!isNeutralStaffLineGrey(el.getAttribute('fill') ?? '')) continue;
        let bbox: DOMRect;
        try { bbox = (el as unknown as SVGGraphicsElement).getBBox(); } catch { continue; }
        // Real staff/TAB string lines are thin (<=3px tall) horizontal segments reasonably
        // wide (>=15px) — same physical-size signature CENTERLINE-C's tiny-artifact filter
        // excludes as noise, used here instead to POSITIVELY select staff-line ink.
        if (!bbox || bbox.width < 15 || bbox.height <= 0 || bbox.height > 3) continue;
        const key = Math.round(bbox.y * 2) / 2;
        const viewportY = el.getBoundingClientRect().top;
        const bucket = localBuckets.get(key) ?? { count: 0, viewportYs: [] };
        bucket.count += 1;
        bucket.viewportYs.push(viewportY);
        localBuckets.set(key, bucket);
    }

    const localYs = Array.from(localBuckets.keys()).sort((a, b) => a - b);
    // Require at least 2 distinct line candidates spanning a plausible staff height —
    // guards against stray grey ink being mistaken for a real staff/TAB line grid.
    if (localYs.length < 2) return null;

    const staffTopLocal = localYs[0];
    const staffBottomLocal = localYs[localYs.length - 1];
    const span = staffBottomLocal - staffTopLocal;
    if (span <= 0 || span > 150) return null;

    const candidateCount = localYs.reduce((sum, y) => sum + (localBuckets.get(y)?.count ?? 0), 0);
    const avgViewportY = (localY: number): number => {
        const ys = localBuckets.get(localY)?.viewportYs ?? [];
        return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    const staffTopViewport = avgViewportY(staffTopLocal);
    const staffBottomViewport = avgViewportY(staffBottomLocal);

    return {
        lineCount: localYs.length,
        candidateCount,
        staffTopLocal,
        staffBottomLocal,
        staffCenterLocal: (staffTopLocal + staffBottomLocal) / 2,
        staffTopViewport,
        staffBottomViewport,
        staffCenterViewport: (staffTopViewport + staffBottomViewport) / 2,
        span,
    };
}
