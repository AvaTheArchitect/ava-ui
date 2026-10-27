/**
 * Maestro.ai — E2E paint evidence helper (PNG codec, viewport agreement and region-model evaluation for the Desktop curtain footer hole and the narrow-portrait curtain stacking)
 * Version: V1.0.1
 * Date: October 25, 2026
 * Ticket: PLAYER-CONTROLS-PERSISTENT-SHELL-001; PLAYER-CONTROLS-MOBILE-PERSISTENT-SHELL-001
 *
 * Pure Node helpers for tests/e2e/curtain-footer-hole.e2e.ts. No browser, no product import, no image library (none is
 * installed): an 8-bit non-interlaced PNG decoder and encoder built on zlib, checkViewportAgreement(), and evaluatePaint(),
 * which judges one capture taken with the curtain displayed against a matched reference capture taken with the curtain hidden
 * (same page, same scroll). The expected painted regions come from MEASURED rectangles and the rule's documented constants,
 * never from the capture under test; the reference supplies only the expected value of pixels the curtain must not paint.
 * Rectangle intersection reuses intersectRects from chromeObserver.ts (read-only import; that file's code is not modified).
 *
 * Coordinate contract. Every capture is a viewport PNG taken with scale 'css', so one PNG pixel is one CSS pixel and the PNG
 * must have exactly the CONFIGURED viewport's size (page.viewportSize()). evaluatePaint takes that configured viewport, never
 * window.innerWidth/innerHeight. checkViewportAgreement() reports a disagreement between the configured viewport, the page's
 * innerWidth/innerHeight and the PNG size as an explicit validity issue; every coordinate comparison is meaningless while one
 * exists, so callers treat it as INVALID CAPTURE.
 *
 * Constants mirror existing source and are checked, not trusted: FOOTER_HEIGHT_PX is the TransportBar's 74px plus its 1px
 * top border (the rule's calc(100vh - 75px)); RIGHT_COLUMN_REM is the rule's 0.9375rem right-edge column (Tailwind
 * right-3.75 on the footer). A measured footer that no longer starts at viewport height minus FOOTER_HEIGHT_PX is reported
 * as a FAIL (the rule's constant has drifted from the bar), not silently absorbed.
 *
 * Geometric overlap between the curtain box and the footer footprint is an APPLICABILITY precondition of the 'hole' model
 * (no overlap means nothing can be exposed), never a failure: it is reported as INVALID CAPTURE when absent.
 *
 * Two further models serve the narrow-portrait stacking rule (globals.css), under which the curtain keeps its box and fill but
 * ranks beneath the z-50 mobile bar. They judge ONLY the bar's measured footprint where the curtain box overlaps it, inset by
 * EDGE_MARGIN_PX on every side (the bar's translucent top border composites over a different backdrop in the two captures):
 * 'stack' expects those pixels to equal the reference (the bar is what is painted), 'covered' expects them to equal the fill (the
 * curtain is painted over the bar, which is what the same page does without the rule). No other pixel inside the box is judged,
 * because shell layers that rank above the curtain by design (the header, the slide-out and its edge tab) also paint there;
 * pixels outside the box are still compared with the reference. No tray dimension appears in either model: the footprint is
 * measured. The same overlap precondition applies and is reported as INVALID CAPTURE when absent.
 *
 * Verdicts: PASS | FAIL | PARTIAL | INVALID CAPTURE, ranked INVALID > FAIL > PARTIAL > PASS. PARTIAL means every examined
 * pixel matched but the capture could not discriminate the claim (for example the painted region is the same colour as the
 * page under it). Nothing here measures timing, and nothing here replaces Safari, physical-device or installed-PWA checks.
 */

import * as zlib from 'zlib';
import { intersectRects } from './chromeObserver';

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Rgb = readonly [number, number, number];

export interface DecodedPng {
    width: number;
    height: number;
    /** Tightly packed RGB, three bytes per pixel, row-major. Alpha, when present, is dropped. */
    rgb: Buffer;
}

export type PaintVariant = 'hole' | 'old' | 'stack' | 'covered';
export type PaintVerdict = 'PASS' | 'FAIL' | 'PARTIAL' | 'INVALID CAPTURE';

export const FOOTER_HEIGHT_PX = 75;
export const RIGHT_COLUMN_REM = 0.9375;
/** Pixels excluded on either side of the curtain box edges and of the right-column edge (anti-aliasing and rounding). */
export const EDGE_MARGIN_PX = 2;
/** A claim is only judged discriminating when at least this many examined pixels differ from the fill in the reference... */
export const MIN_DISCRIMINATING_PX = 500;
/** ...and at least this fraction of the examined pixels of that region do. */
export const MIN_DISCRIMINATING_FRACTION = 0.5;
const GEOMETRY_SCALE = 100;

// ── PNG codec (8-bit RGB or RGBA, non-interlaced) ───────────────────────────────────────────────────

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([length, body, crc]);
}

/** Encodes tightly packed RGB as an 8-bit PNG. Used by the browser-free controls to build synthetic captures. */
export function encodePng(width: number, height: number, rgb: Buffer): Buffer {
    const stride = width * 3;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y += 1) {
        raw[y * (stride + 1)] = 0;
        rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8;
    header[9] = 2;
    return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

export function decodePng(buf: Buffer): DecodedPng {
    if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG: signature not found');
    let offset = 8;
    let width = 0;
    let height = 0;
    let depth = 0;
    let colorType = 0;
    let interlace = 0;
    const idat: Buffer[] = [];
    while (offset + 12 <= buf.length) {
        const length = buf.readUInt32BE(offset);
        const type = buf.toString('ascii', offset + 4, offset + 8);
        const data = buf.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            depth = data[8];
            colorType = data[9];
            interlace = data[12];
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }
    if (depth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG (bit depth ${depth}, colour type ${colorType}, interlace ${interlace})`);
    }
    const bytesPerPixel = colorType === 6 ? 4 : 3;
    const stride = width * bytesPerPixel;
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const out = Buffer.alloc(height * stride);
    let p = 0;
    for (let y = 0; y < height; y += 1) {
        const filter = raw[p];
        p += 1;
        for (let i = 0; i < stride; i += 1) {
            const x = raw[p];
            p += 1;
            const a = i >= bytesPerPixel ? out[y * stride + i - bytesPerPixel] : 0;
            const b = y > 0 ? out[(y - 1) * stride + i] : 0;
            const c = y > 0 && i >= bytesPerPixel ? out[(y - 1) * stride + i - bytesPerPixel] : 0;
            let value: number;
            if (filter === 0) value = x;
            else if (filter === 1) value = x + a;
            else if (filter === 2) value = x + b;
            else if (filter === 3) value = x + ((a + b) >> 1);
            else if (filter === 4) {
                const pa = Math.abs(b - c);
                const pb = Math.abs(a - c);
                const pc = Math.abs(a + b - 2 * c);
                value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
            } else throw new Error(`bad PNG filter type ${filter}`);
            out[y * stride + i] = value & 255;
        }
    }
    if (bytesPerPixel === 3) return { width, height, rgb: out };
    const rgb = Buffer.alloc(width * height * 3);
    for (let i = 0, j = 0; i < out.length; i += 4, j += 3) {
        rgb[j] = out[i];
        rgb[j + 1] = out[i + 1];
        rgb[j + 2] = out[i + 2];
    }
    return { width, height, rgb };
}

/** Parses an opaque computed or inline colour ("rgb(r, g, b)" or "rgba(r, g, b, 1)"). Null for anything else, including alpha below 1. */
export function parseOpaqueRgb(text: string | null): Rgb | null {
    if (text === null) return null;
    const match = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/.exec(text.trim());
    if (match === null) return null;
    if (match[4] !== undefined && Number(match[4]) !== 1) return null;
    const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (channels.some((value) => value > 255)) return null;
    return [channels[0], channels[1], channels[2]];
}

// ── Viewport agreement ──────────────────────────────────────────────────────────────────────────────

export interface ViewportAgreementInput {
    /** page.viewportSize(): the configured viewport. Null when Playwright reports none. */
    configured: { width: number; height: number } | null;
    /** window.innerWidth and window.innerHeight read in the page. */
    inner: { width: number; height: number };
    devicePixelRatio: number;
    /** The PNG's pixel size, or null when no capture is involved. */
    png: { width: number; height: number } | null;
}

export interface ViewportAgreement {
    ok: boolean;
    /** Each issue is an explicit validity issue: any one of them makes every coordinate comparison in the case invalid. */
    issues: string[];
}

export function checkViewportAgreement(input: ViewportAgreementInput): ViewportAgreement {
    const issues: string[] = [];
    const { configured, inner, png } = input;
    if (configured === null) {
        issues.push('VIEWPORT-UNAVAILABLE: page.viewportSize() returned null, so the configured viewport cannot be compared with anything');
        return { ok: false, issues };
    }
    if (inner.width !== configured.width || inner.height !== configured.height) {
        issues.push(
            `VIEWPORT-DISAGREEMENT: window.innerWidth x innerHeight is ${inner.width}x${inner.height} but the configured viewport is ${configured.width}x${configured.height} ` +
                `(devicePixelRatio ${input.devicePixelRatio}); the layout viewport and the screenshot's CSS-pixel scale differ, so coordinates measured in the page do not map onto the capture`,
        );
    }
    if (png !== null && (png.width !== configured.width || png.height !== configured.height)) {
        issues.push(
            `SCREENSHOT-DIMENSION-DISAGREEMENT: the scale 'css' PNG is ${png.width}x${png.height} but the configured viewport is ${configured.width}x${configured.height}; ` +
                'one PNG pixel is not one CSS pixel of the configured viewport',
        );
    }
    return { ok: issues.length === 0, issues };
}

// ── Geometry ────────────────────────────────────────────────────────────────────────────────────────

export type OverlapKind = 'none' | 'partial' | 'full';

/**
 * How the curtain box covers the footer footprint, by measured rectangles only (geometry, not paint). 'full' means the
 * footer lies entirely inside the box (to half a pixel); 'partial' means a nonzero part of it does.
 */
export function overlapKind(box: Rect, footer: Rect): OverlapKind {
    if (intersectRects(box, footer, GEOMETRY_SCALE).area <= 0) return 'none';
    const tol = 0.5;
    const inside =
        footer.x >= box.x - tol &&
        footer.y >= box.y - tol &&
        footer.x + footer.width <= box.x + box.width + tol &&
        footer.y + footer.height <= box.y + box.height + tol;
    return inside ? 'full' : 'partial';
}

// ── Evaluator ───────────────────────────────────────────────────────────────────────────────────────

export interface PaintInput {
    /**
     * 'hole': the footer-hole rule is expected active. 'old': the curtain is expected to paint its whole box. 'stack': the curtain
     * is expected beneath the bar footprint. 'covered': the curtain is expected over the bar footprint.
     */
    variant: PaintVariant;
    /** The CONFIGURED viewport (page.viewportSize()), which the scale 'css' PNGs must match exactly. */
    viewport: { width: number; height: number };
    /** The curtain's border box as measured in the page (viewport coordinates, not clipped). */
    box: Rect;
    /** The transport footprint (or, for 'stack' and 'covered', the mobile bar footprint) as measured in the page. Required for those three variants. */
    footer: Rect | null;
    /** Displayed chrome rectangles whose pixels are counted separately and never required to equal the fill. */
    ignore: readonly Rect[];
    /** The curtain fill, read from its inline style (independent of the stylesheet that may override it). */
    fill: Rgb;
    rootFontPx: number;
}

export interface CategoryResult {
    total: number;
    mismatch: number;
    first: Array<{ x: number; y: number; got: Rgb; want: Rgb }>;
}

export interface PaintEvaluation {
    verdict: PaintVerdict;
    invalidReasons: string[];
    failReasons: string[];
    partialReasons: string[];
    /**
     * painted: inside the box where the curtain must paint; exposed: inside box and footer where it must not; outside-box.
     * 'stack' and 'covered' use exposed and painted respectively, for the bar footprint only.
     */
    categories: Record<string, CategoryResult>;
    /** Pixels of a region whose reference value differs from the fill, so that a match on the fill is evidence of paint. */
    discrimination: {
        painted: { examined: number; referenceDiffersFromFill: number };
        exposed: { examined: number; referenceDiffersFromFill: number };
    };
    /** Examined painted pixels lying where an active rule would leave a hole (below vh - 75, left of the right column). */
    bandExamined: number;
    ignoredPixels: number;
    model: {
        boxClipped: Rect;
        footerTop: number | null;
        holeTopConstant: number;
        rightColumnPx: number;
        marginPx: number;
    };
}

const MAX_FIRST_MISMATCHES = 5;

function pixel(png: DecodedPng, x: number, y: number): Rgb {
    const i = (y * png.width + x) * 3;
    return [png.rgb[i], png.rgb[i + 1], png.rgb[i + 2]];
}

function sameRgb(a: Rgb, b: Rgb): boolean {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function within(rect: Rect, x: number, y: number): boolean {
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function rank(verdict: PaintVerdict): number {
    return verdict === 'INVALID CAPTURE' ? 3 : verdict === 'FAIL' ? 2 : verdict === 'PARTIAL' ? 1 : 0;
}

export function evaluatePaint(input: PaintInput, displayedPng: Buffer, referencePng: Buffer): PaintEvaluation {
    const displayed = decodePng(displayedPng);
    const reference = decodePng(referencePng);
    const { width: vw, height: vh } = input.viewport;
    const rightColumnPx = RIGHT_COLUMN_REM * input.rootFontPx;
    const holeTopConstant = vh - FOOTER_HEIGHT_PX;
    const boxL = Math.max(0, input.box.x);
    const boxR = Math.min(vw, input.box.x + input.box.width);
    const boxT = Math.max(0, input.box.y);
    const boxB = Math.min(vh, input.box.y + input.box.height);
    const footer = input.footer;
    const footprintOnly = input.variant === 'stack' || input.variant === 'covered';

    const result: PaintEvaluation = {
        verdict: 'PASS',
        invalidReasons: [],
        failReasons: [],
        partialReasons: [],
        categories: {},
        discrimination: { painted: { examined: 0, referenceDiffersFromFill: 0 }, exposed: { examined: 0, referenceDiffersFromFill: 0 } },
        bandExamined: 0,
        ignoredPixels: 0,
        model: {
            boxClipped: { x: boxL, y: boxT, width: Math.max(0, boxR - boxL), height: Math.max(0, boxB - boxT) },
            footerTop: footer === null ? null : footer.y,
            holeTopConstant,
            rightColumnPx,
            marginPx: EDGE_MARGIN_PX,
        },
    };
    const conclude = (): PaintEvaluation => {
        const worst = Math.max(
            result.invalidReasons.length > 0 ? 3 : 0,
            result.failReasons.length > 0 ? 2 : 0,
            result.partialReasons.length > 0 ? 1 : 0,
        );
        result.verdict = (['PASS', 'PARTIAL', 'FAIL', 'INVALID CAPTURE'] as const)[worst];
        return result;
    };

    if (displayed.width !== vw || displayed.height !== vh || reference.width !== vw || reference.height !== vh) {
        result.invalidReasons.push(
            `SCREENSHOT-DIMENSION-DISAGREEMENT: capture size ${displayed.width}x${displayed.height} / ${reference.width}x${reference.height}, expected the configured viewport ${vw}x${vh} CSS pixels for both`,
        );
        return conclude();
    }
    if (!(boxR > boxL) || !(boxB > boxT)) {
        result.invalidReasons.push('the curtain box has no area inside the viewport');
        return conclude();
    }
    if (footprintOnly && footer === null) {
        result.invalidReasons.push(`the '${input.variant}' model needs the measured bar footprint rectangle`);
        return conclude();
    }
    if (input.variant === 'hole') {
        if (footer === null) {
            result.invalidReasons.push("the 'hole' model needs the measured footer rectangle");
            return conclude();
        }
        if (Math.abs(footer.y - holeTopConstant) > 1 || Math.abs(footer.height - FOOTER_HEIGHT_PX) > 1) {
            result.failReasons.push(
                `the measured footer starts at y ${footer.y} with height ${footer.height}, but the rule's constant assumes y ${holeTopConstant} (viewport height ${vh} - ${FOOTER_HEIGHT_PX}) and height ${FOOTER_HEIGHT_PX}: the rule no longer mirrors the transport bar`,
            );
        }
    }

    const bump = (name: string, ok: boolean, x: number, y: number, got: Rgb, want: Rgb): void => {
        let category = result.categories[name];
        if (category === undefined) {
            category = { total: 0, mismatch: 0, first: [] };
            result.categories[name] = category;
        }
        category.total += 1;
        if (!ok) {
            category.mismatch += 1;
            if (category.first.length < MAX_FIRST_MISMATCHES) category.first.push({ x, y, got, want });
        }
    };

    const footerLeft = footer === null ? 0 : footer.x;
    const footerRight = footer === null ? 0 : footer.x + footer.width;
    const columnX = vw - rightColumnPx;
    for (let y = 0; y < vh; y += 1) {
        for (let x = 0; x < vw; x += 1) {
            const inBox = x >= boxL && x < boxR && y >= boxT && y < boxB;
            const nearBoxEdge =
                x >= boxL - EDGE_MARGIN_PX &&
                x < boxR + EDGE_MARGIN_PX &&
                y >= boxT - EDGE_MARGIN_PX &&
                y < boxB + EDGE_MARGIN_PX &&
                (Math.abs(x - boxL) <= EDGE_MARGIN_PX ||
                    Math.abs(x - boxR) <= EDGE_MARGIN_PX ||
                    Math.abs(y - boxT) <= EDGE_MARGIN_PX ||
                    Math.abs(y - boxB) <= EDGE_MARGIN_PX);
            if (nearBoxEdge) continue;
            if (input.variant === 'hole' && inBox && columnX < boxR && Math.abs(x - columnX) <= EDGE_MARGIN_PX) continue;
            if (input.ignore.some((rect) => within(rect, x, y))) {
                result.ignoredPixels += 1;
                continue;
            }
            const got = pixel(displayed, x, y);
            const ref = pixel(reference, x, y);
            if (!inBox) {
                bump('outside-box', sameRgb(got, ref), x, y, got, ref);
                continue;
            }
            if (footprintOnly) {
                // Only the bar footprint, inset by the edge margin, is judged inside the box: shell layers that rank above the curtain by design also paint elsewhere in it.
                const inFootprint =
                    footer !== null &&
                    x >= footerLeft + EDGE_MARGIN_PX &&
                    x < footerRight - EDGE_MARGIN_PX &&
                    y >= footer.y + EDGE_MARGIN_PX &&
                    y < footer.y + footer.height - EDGE_MARGIN_PX;
                if (!inFootprint) continue;
                if (input.variant === 'stack') {
                    bump('exposed', sameRgb(got, ref), x, y, got, ref);
                    result.discrimination.exposed.examined += 1;
                    if (!sameRgb(ref, input.fill)) result.discrimination.exposed.referenceDiffersFromFill += 1;
                } else {
                    bump('painted', sameRgb(got, input.fill), x, y, got, input.fill);
                    result.discrimination.painted.examined += 1;
                    if (!sameRgb(ref, input.fill)) result.discrimination.painted.referenceDiffersFromFill += 1;
                }
                continue;
            }
            const inFooter = footer !== null && x >= footerLeft && x < footerRight && y >= footer.y && y < footer.y + footer.height;
            if (input.variant === 'hole' && inFooter && x < columnX) {
                bump('exposed', sameRgb(got, ref), x, y, got, ref);
                result.discrimination.exposed.examined += 1;
                if (!sameRgb(ref, input.fill)) result.discrimination.exposed.referenceDiffersFromFill += 1;
                continue;
            }
            bump('painted', sameRgb(got, input.fill), x, y, got, input.fill);
            result.discrimination.painted.examined += 1;
            if (!sameRgb(ref, input.fill)) result.discrimination.painted.referenceDiffersFromFill += 1;
            if (y >= holeTopConstant && x < columnX) result.bandExamined += 1;
        }
    }

    for (const [name, category] of Object.entries(result.categories)) {
        if (category.mismatch > 0) {
            result.failReasons.push(`${name}: ${category.mismatch} of ${category.total} examined pixels differ from the model`);
        }
    }
    const painted = result.categories['painted'];
    if (input.variant !== 'stack' && (painted === undefined || painted.total === 0)) {
        result.invalidReasons.push(
            input.variant === 'covered'
                ? 'no covered-footprint pixels were examined: the bar footprint does not overlap the curtain box in this state (the model is not applicable)'
                : 'no painted-region pixels were examined',
        );
    }
    const exposed = result.categories['exposed'];
    if ((input.variant === 'hole' || input.variant === 'stack') && (exposed === undefined || exposed.total === 0)) {
        result.invalidReasons.push(
            input.variant === 'stack'
                ? 'no exposed-footprint pixels were examined: the bar footprint does not overlap the curtain box in this state (the model is not applicable)'
                : 'no exposed-footer pixels were examined: the footer does not overlap the curtain box in this state (the model is not applicable)',
        );
    }
    const weak = (region: { examined: number; referenceDiffersFromFill: number }): boolean =>
        region.referenceDiffersFromFill < MIN_DISCRIMINATING_PX || region.referenceDiffersFromFill < MIN_DISCRIMINATING_FRACTION * region.examined;
    if (result.discrimination.painted.examined > 0 && weak(result.discrimination.painted)) {
        result.partialReasons.push(
            `the painted region cannot be told from the page under it: only ${result.discrimination.painted.referenceDiffersFromFill} of ${result.discrimination.painted.examined} examined pixels differ from the fill in the reference`,
        );
    }
    if ((input.variant === 'hole' || input.variant === 'stack') && result.discrimination.exposed.examined > 0 && weak(result.discrimination.exposed)) {
        result.partialReasons.push(
            `the exposed ${input.variant === 'stack' ? 'bar footprint' : 'footer'} cannot be told from the fill: only ${result.discrimination.exposed.referenceDiffersFromFill} of ${result.discrimination.exposed.examined} examined pixels differ from the fill in the reference`,
        );
    }
    if (input.variant === 'old' && result.bandExamined === 0) {
        result.partialReasons.push(
            `no pixels were examined in the zone an active rule would leave unpainted (y >= ${holeTopConstant}, x < ${columnX}) outside displayed chrome: the pixel check cannot discriminate there`,
        );
    }
    return conclude();
}

export function worseVerdict(a: PaintVerdict, b: PaintVerdict): PaintVerdict {
    return rank(a) >= rank(b) ? a : b;
}
