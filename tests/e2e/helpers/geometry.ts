/**
 * Maestro.ai — E2E shell geometry helper (DOM measurement + invariant checks)
 * Version: V1.0.1
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-VISUAL-001
 *
 * Opt-in helper for tests/e2e/visual.e2e.ts. Scope: the unauthenticated /synth-player SHELL
 * only (no score, no AlphaTab, no cursor).
 *
 * - measureShellGeometry: ONE in-page snapshot (a single clock) of viewport, media-query
 *   state, document overflow, and shell target rects / computed styles / scroll metrics.
 * - waitForGeometryStable: polled readiness — document.fonts.ready, then consecutive
 *   identical animation-frame samples of the target rects, bounded by a frame cap and an
 *   overall wall-clock timeout. No fixed sleeps; the single timer is the timeout bound only.
 * - checkShellInvariants: pure function over a snapshot; only source-backed invariants.
 *   No numeric baselines are encoded here — absolute rects are reported, never asserted.
 *
 * Source backing (verified by reading, not by running):
 *   - top tray switch is CSS-only: src/app/globals.css .maestro-tray-desktop/.maestro-tray-mobile
 *   - desktop bar: [data-transport-bar] (TransportBar.tsx), wrapper hidden below 650px
 *   - mobile bar: [data-maestro-control-panel] (MaestroControlPanel.tsx), hidden at >=650px
 *   - both bars are `fixed bottom-0`, so a displayed bar's bottom edge meets the viewport bottom
 * Mobile emulation here is Chromium viewport/UA emulation only.
 * Chromium emulation does not establish iOS safe-area behavior.
 * It is not iPhone/PWA validation.
 */

import type { Page } from '@playwright/test';

/** Sub-pixel slack for rect-vs-viewport comparisons, in CSS px. */
export const GEOMETRY_TOLERANCE_PX = 1;
/** Required number of consecutive frame-to-frame identical samples (=> stable+1 identical frames). */
export const GEOMETRY_STABLE_FRAMES = 5;
/** Hard cap on sampled animation frames. */
export const GEOMETRY_MAX_FRAMES = 300;
/** Overall wall-clock bound for font readiness + stability sampling. */
export const GEOMETRY_TIMEOUT_MS = 10_000;

export type TargetKey =
    | 'rootShell'
    | 'main'
    | 'playerHost'
    | 'trayDesktop'
    | 'trayMobile'
    | 'transportBar'
    | 'mobileControlPanel';

export interface TargetSpec {
    key: TargetKey;
    selector: string;
    /** Measure the matched element's parentElement instead of the match itself. */
    parent?: boolean;
}

/**
 * Shell targets. rootShell is main's parent (the grid wrapper in page.tsx has no id/class hook);
 * the two trays and the two bottom bars are each always rendered in non-landscape shells, with
 * visibility decided by CSS media queries.
 *
 * trayDesktop uses .maestro-tray-desktop, not [data-top-menu-tray]: that attribute is shared by
 * both tray headers in TopMenuTray.tsx (the mobile header and the desktop header), so it matches
 * two elements. .maestro-tray-desktop is on the desktop header only, and is the class that
 * globals.css toggles for the tray switch.
 */
export const SHELL_TARGETS: readonly TargetSpec[] = [
    { key: 'rootShell', selector: 'main', parent: true },
    { key: 'main', selector: 'main' },
    { key: 'playerHost', selector: 'main #maestro-player' },
    { key: 'trayDesktop', selector: '.maestro-tray-desktop' },
    { key: 'trayMobile', selector: '.maestro-tray-mobile' },
    { key: 'transportBar', selector: '[data-transport-bar]' },
    { key: 'mobileControlPanel', selector: '[data-maestro-control-panel]' },
];

export const MEDIA_QUERIES = {
    pointerFine: '(pointer: fine)',
    pointerCoarse: '(pointer: coarse)',
    hoverHover: '(hover: hover)',
    orientationPortrait: '(orientation: portrait)',
    orientationLandscape: '(orientation: landscape)',
    displayModeStandalone: '(display-mode: standalone)',
    minWidth650: '(min-width: 650px)',
    maxWidth649: '(max-width: 649px)',
    trayMobileByHeight: '(max-height: 599px) and (max-width: 1024px)',
} as const;

export type MediaKey = keyof typeof MEDIA_QUERIES;

export interface RectSample {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface TargetStyle {
    display: string;
    visibility: string;
    position: string;
    overflowX: string;
    overflowY: string;
    paddingTop: string;
    paddingBottom: string;
    width: string;
    height: string;
    right: string;
    bottom: string;
}

export interface ScrollMetrics {
    clientWidth: number;
    scrollWidth: number;
    clientHeight: number;
    scrollHeight: number;
}

export interface TargetMeasurement {
    selector: string;
    relation: 'self' | 'parent';
    /** Number of resolved elements. Exactly 1 is required for the target to be usable. */
    count: number;
    /** First resolved element: computed display !== none, visibility === visible, nonzero rect. */
    displayed: boolean;
    rect: RectSample | null;
    style: TargetStyle | null;
    scroll: ScrollMetrics | null;
}

export interface DocumentMeasurement extends ScrollMetrics {
    overflowX: string;
    overflowY: string;
}

export interface ShellGeometrySnapshot {
    viewport: {
        innerWidth: number;
        innerHeight: number;
        visualViewportWidth: number | null;
        visualViewportHeight: number | null;
        devicePixelRatio: number;
    };
    media: Record<MediaKey, boolean>;
    html: DocumentMeasurement;
    body: DocumentMeasurement;
    targets: Record<TargetKey, TargetMeasurement>;
}

/**
 * One in-page snapshot. All values come from a single evaluate call, so they share one clock
 * and one layout state. The in-page function must be self-contained (it is serialized), so it
 * only uses its arguments and browser globals.
 */
export async function measureShellGeometry(page: Page): Promise<ShellGeometrySnapshot> {
    return page.evaluate(
        ({ targets, queries }) => {
            const round = (v: number): number => Math.round(v * 100) / 100;
            const toRect = (r: DOMRect): RectSample => ({
                x: round(r.x),
                y: round(r.y),
                width: round(r.width),
                height: round(r.height),
                top: round(r.top),
                right: round(r.right),
                bottom: round(r.bottom),
                left: round(r.left),
            });
            const scrollOf = (el: Element): ScrollMetrics => ({
                clientWidth: el.clientWidth,
                scrollWidth: el.scrollWidth,
                clientHeight: el.clientHeight,
                scrollHeight: el.scrollHeight,
            });
            const docOf = (el: Element): DocumentMeasurement => {
                const cs = getComputedStyle(el);
                return {
                    clientWidth: el.clientWidth,
                    scrollWidth: el.scrollWidth,
                    clientHeight: el.clientHeight,
                    scrollHeight: el.scrollHeight,
                    overflowX: cs.overflowX,
                    overflowY: cs.overflowY,
                };
            };

            const out = {} as Record<TargetKey, TargetMeasurement>;
            for (const t of targets) {
                const matched = Array.from(document.querySelectorAll(t.selector));
                const resolved: Element[] = [];
                for (const el of matched) {
                    const picked = t.parent ? el.parentElement : el;
                    if (picked !== null) resolved.push(picked);
                }
                const first = resolved.length > 0 ? resolved[0] : null;
                if (first === null) {
                    out[t.key] = {
                        selector: t.selector,
                        relation: t.parent ? 'parent' : 'self',
                        count: resolved.length,
                        displayed: false,
                        rect: null,
                        style: null,
                        scroll: null,
                    };
                    continue;
                }
                const cs = getComputedStyle(first);
                const r = first.getBoundingClientRect();
                out[t.key] = {
                    selector: t.selector,
                    relation: t.parent ? 'parent' : 'self',
                    count: resolved.length,
                    displayed:
                        cs.display !== 'none' &&
                        cs.visibility === 'visible' &&
                        r.width > 0 &&
                        r.height > 0,
                    rect: toRect(r),
                    style: {
                        display: cs.display,
                        visibility: cs.visibility,
                        position: cs.position,
                        overflowX: cs.overflowX,
                        overflowY: cs.overflowY,
                        paddingTop: cs.paddingTop,
                        paddingBottom: cs.paddingBottom,
                        width: cs.width,
                        height: cs.height,
                        right: cs.right,
                        bottom: cs.bottom,
                    },
                    scroll: scrollOf(first),
                };
            }

            const media = {} as Record<MediaKey, boolean>;
            for (const key of Object.keys(queries) as MediaKey[]) {
                media[key] = window.matchMedia(queries[key]).matches;
            }

            return {
                viewport: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    visualViewportWidth: window.visualViewport ? round(window.visualViewport.width) : null,
                    visualViewportHeight: window.visualViewport ? round(window.visualViewport.height) : null,
                    devicePixelRatio: window.devicePixelRatio,
                },
                media,
                html: docOf(document.documentElement),
                body: docOf(document.body),
                targets: out,
            };
        },
        { targets: SHELL_TARGETS, queries: MEDIA_QUERIES },
    );
}

export interface GeometryStabilityResult {
    /** Animation frames sampled before stability. */
    frames: number;
    /** Consecutive frame-to-frame identical samples at resolution. */
    consecutiveStable: number;
    fontsReady: boolean;
    elapsedMs: number;
}

export interface GeometryStabilityOptions {
    stableFrames?: number;
    maxFrames?: number;
    timeoutMs?: number;
}

/**
 * Polls (per animation frame) until the target rects and viewport are identical for
 * `stableFrames` consecutive frame-to-frame comparisons, after document.fonts.ready.
 * Bounded by `maxFrames` and an overall wall-clock `timeoutMs` (which also covers a page that
 * never delivers animation frames). On failure, throws with the final two samples.
 */
export async function waitForGeometryStable(
    page: Page,
    options: GeometryStabilityOptions = {},
): Promise<GeometryStabilityResult> {
    const stableFrames = options.stableFrames ?? GEOMETRY_STABLE_FRAMES;
    const maxFrames = options.maxFrames ?? GEOMETRY_MAX_FRAMES;
    const timeoutMs = options.timeoutMs ?? GEOMETRY_TIMEOUT_MS;

    const outcome = await page.evaluate(
        async ({ targets, stableFrames, maxFrames, timeoutMs }) => {
            const started = performance.now();
            const round = (v: number): number => Math.round(v * 100) / 100;
            // Sample = viewport + per-target match count and rounded rect, as a comparable string.
            const sample = (): string => {
                const rects: Record<string, { n: number; r: number[] } | null> = {};
                for (const t of targets) {
                    const matched = Array.from(document.querySelectorAll(t.selector));
                    const first = matched.length > 0 ? matched[0] : null;
                    const el = first === null ? null : t.parent ? first.parentElement : first;
                    if (el === null) {
                        rects[t.key] = null;
                        continue;
                    }
                    const r = el.getBoundingClientRect();
                    rects[t.key] = { n: matched.length, r: [round(r.x), round(r.y), round(r.width), round(r.height)] };
                }
                return JSON.stringify({ vw: window.innerWidth, vh: window.innerHeight, rects });
            };

            const state = {
                frames: 0,
                consecutive: 0,
                fontsReady: false,
                prev: null as string | null,
                last: null as string | null,
                cancelled: false,
            };
            let timer: ReturnType<typeof setTimeout> | undefined;
            const timedOut = new Promise<'wall-clock-timeout'>((resolve) => {
                timer = setTimeout(() => resolve('wall-clock-timeout'), timeoutMs);
            });
            const run = async (): Promise<'stable' | 'max-frames'> => {
                await document.fonts.ready;
                state.fontsReady = true;
                return new Promise((resolve) => {
                    const step = () => {
                        if (state.cancelled) return;
                        state.frames += 1;
                        const current = sample();
                        state.consecutive = state.last !== null && current === state.last ? state.consecutive + 1 : 0;
                        state.prev = state.last;
                        state.last = current;
                        if (state.consecutive >= stableFrames) {
                            resolve('stable');
                            return;
                        }
                        if (state.frames >= maxFrames) {
                            resolve('max-frames');
                            return;
                        }
                        requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                });
            };

            const reason = await Promise.race([run(), timedOut]);
            state.cancelled = true;
            if (timer !== undefined) clearTimeout(timer);
            const parse = (s: string | null): unknown => (s === null ? null : JSON.parse(s));
            return {
                ok: reason === 'stable',
                reason,
                frames: state.frames,
                consecutiveStable: state.consecutive,
                fontsReady: state.fontsReady,
                elapsedMs: round(performance.now() - started),
                lastSamples: { previous: parse(state.prev), final: parse(state.last) },
            };
        },
        { targets: SHELL_TARGETS, stableFrames, maxFrames, timeoutMs },
    );

    if (!outcome.ok) {
        throw new Error(
            `Shell geometry not stable (${outcome.reason}) after ${outcome.frames} frame(s), ` +
                `${outcome.elapsedMs}ms, fontsReady=${outcome.fontsReady}, ` +
                `consecutiveStable=${outcome.consecutiveStable}/${stableFrames}. ` +
                `Last two samples: ${JSON.stringify(outcome.lastSamples)}`,
        );
    }
    return {
        frames: outcome.frames,
        consecutiveStable: outcome.consecutiveStable,
        fontsReady: outcome.fontsReady,
        elapsedMs: outcome.elapsedMs,
    };
}

/**
 * Source-backed invariants over one snapshot. Returns human-readable violations (empty = all
 * hold). A target that is missing or duplicated is reported explicitly and the checks that
 * depend on it are skipped rather than guessed.
 *
 *  1. No horizontal overflow on the document (html) and on main.
 *  2. Exactly one top tray is displayed (trayDesktop xor trayMobile).
 *  3. Exactly one bottom bar is displayed (transportBar xor mobileControlPanel).
 *  4. The displayed bottom bar's bottom edge meets the viewport bottom (+/- tolerance).
 *  5. main is displayed and lies within the viewport (+/- tolerance).
 */
export function checkShellInvariants(snapshot: ShellGeometrySnapshot): string[] {
    const tol = GEOMETRY_TOLERANCE_PX;
    const violations: string[] = [];

    const single = (key: TargetKey): TargetMeasurement | null => {
        const t = snapshot.targets[key];
        if (t.count === 0) {
            violations.push(`target ${key} (${t.selector}) is missing`);
            return null;
        }
        if (t.count > 1) {
            violations.push(`target ${key} (${t.selector}) is duplicated: ${t.count} matches`);
            return null;
        }
        return t;
    };

    single('rootShell');
    const main = single('main');
    single('playerHost');
    const trayDesktop = single('trayDesktop');
    const trayMobile = single('trayMobile');
    const transportBar = single('transportBar');
    const mobileControlPanel = single('mobileControlPanel');

    // 1. Horizontal overflow.
    if (snapshot.html.scrollWidth > snapshot.html.clientWidth) {
        violations.push(
            `document horizontal overflow: html.scrollWidth ${snapshot.html.scrollWidth} > clientWidth ${snapshot.html.clientWidth}`,
        );
    }
    if (main !== null && main.scroll !== null && main.scroll.scrollWidth > main.scroll.clientWidth) {
        violations.push(
            `main horizontal overflow: scrollWidth ${main.scroll.scrollWidth} > clientWidth ${main.scroll.clientWidth}`,
        );
    }

    // 2. Exactly one top tray displayed.
    if (trayDesktop !== null && trayMobile !== null) {
        const displayed = [trayDesktop, trayMobile].filter((t) => t.displayed).length;
        if (displayed !== 1) {
            violations.push(`expected exactly 1 top tray displayed, found ${displayed}`);
        }
    }

    // 3 + 4. Exactly one bottom bar displayed, and it sits on the viewport bottom.
    if (transportBar !== null && mobileControlPanel !== null) {
        const bars = [transportBar, mobileControlPanel].filter((t) => t.displayed);
        if (bars.length !== 1) {
            violations.push(`expected exactly 1 bottom bar displayed, found ${bars.length}`);
        } else if (bars[0].rect !== null) {
            const gap = Math.abs(bars[0].rect.bottom - snapshot.viewport.innerHeight);
            if (gap > tol) {
                violations.push(
                    `displayed bottom bar (${bars[0].selector}) bottom edge ${bars[0].rect.bottom} is ${round2(gap)}px from viewport bottom ${snapshot.viewport.innerHeight} (tolerance ${tol}px)`,
                );
            }
        }
    }

    // 5. main displayed and within the viewport.
    if (main !== null) {
        if (!main.displayed || main.rect === null) {
            violations.push('main is not displayed (computed display/visibility or zero-size rect)');
        } else {
            const r = main.rect;
            const { innerWidth, innerHeight } = snapshot.viewport;
            if (r.left < -tol || r.top < -tol || r.right > innerWidth + tol || r.bottom > innerHeight + tol) {
                violations.push(
                    `main is outside viewport ${innerWidth}x${innerHeight}: left ${r.left}, top ${r.top}, right ${r.right}, bottom ${r.bottom} (tolerance ${tol}px)`,
                );
            }
        }
    }

    return violations;
}

function round2(v: number): number {
    return Math.round(v * 100) / 100;
}
