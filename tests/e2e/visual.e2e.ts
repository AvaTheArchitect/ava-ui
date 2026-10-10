/**
 * Maestro.ai — Opt-in shell geometry + targeted screenshot verification
 * Version: V1.0.1
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-VISUAL-001
 *
 * Scope: the unauthenticated /synth-player SHELL only (no score, AlphaTab, cursor, or loop
 * overlay — those need the later bundled-score fixture). Mechanism: DOM measurement
 * (getBoundingClientRect / getComputedStyle / matchMedia); no mouse, touch, playback input.
 *
 * Opt-in flags (default run: every test here is skipped, nothing is captured):
 *   E2E_GEOMETRY=1     run the geometry tests (DOM-only; creates no screenshots)
 *   E2E_SCREENSHOTS=1  additionally capture ONE viewport PNG per project, only after the
 *                      measurement and every invariant passed. Requires E2E_GEOMETRY=1;
 *                      setting it alone fails the load with a clear error.
 *
 * Screenshot contract: page.screenshot (not toHaveScreenshot; no goldens), viewport-only,
 * scale 'css' (one PNG pixel per CSS pixel, so expected PNG size equals the project's
 * viewport size and no fractional-DPR rounding is involved; device-pixel detail is NOT
 * captured), animations disabled, caret hidden, Next dev indicator hidden for the capture
 * only. Path: testInfo.outputPath('shell-<project>.png') under the ignored test-results/.
 *
 * Evidence limits: Chromium emulation (desktop + Pixel 7 preset) against a dev server. Not
 * iPhone/Safari/PWA validation. Chromium emulation does not establish iOS safe-area behavior.
 * Requires an already-running, separately authorized dev server.
 */

import * as fs from 'fs';
import { expect, test } from '@playwright/test';
import {
    SHELL_TARGETS,
    checkShellInvariants,
    measureShellGeometry,
    waitForGeometryStable,
    type RectSample,
    type ShellGeometrySnapshot,
    type TargetKey,
    type TargetMeasurement,
} from './helpers/geometry';
import { waitForShellReady } from './helpers/ready';

const SHELL_PATH = '/synth-player';
const GEOMETRY_JSON_LABEL = '[SHELL-GEOMETRY-JSON]';
const SCREENSHOT_JSON_LABEL = '[SHELL-SCREENSHOT-JSON]';
const HIDE_DEV_INDICATOR_CSS = 'nextjs-portal { display: none !important; }';

function readFlag(name: string): boolean {
    const raw = process.env[name];
    if (raw === undefined || raw === '' || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${name}="${raw}" is not valid: set ${name}=1 to enable it, or leave it unset.`);
}

const geometryEnabled = readFlag('E2E_GEOMETRY');
const screenshotsEnabled = readFlag('E2E_SCREENSHOTS');
if (screenshotsEnabled && !geometryEnabled) {
    throw new Error(
        'E2E_SCREENSHOTS=1 requires E2E_GEOMETRY=1: screenshots are only taken after shell geometry has been measured and verified. ' +
            'Set both (E2E_GEOMETRY=1 E2E_SCREENSHOTS=1), or unset E2E_SCREENSHOTS.',
    );
}

/** Pure PNG IHDR parse (signature + IHDR chunk header = first 24 bytes). */
function parsePngSize(head: Buffer): { width: number; height: number } {
    if (
        head.length < 24 ||
        head.readUInt32BE(0) !== 0x89504e47 ||
        head.readUInt32BE(4) !== 0x0d0a1a0a ||
        head.toString('ascii', 12, 16) !== 'IHDR'
    ) {
        throw new Error('not a PNG: signature/IHDR header not found in the first 24 bytes');
    }
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

function readPngSize(filePath: string): { width: number; height: number } {
    const fd = fs.openSync(filePath, 'r');
    try {
        const head = Buffer.alloc(24);
        const read = fs.readSync(fd, head, 0, 24, 0);
        return parsePngSize(head.subarray(0, read));
    } finally {
        fs.closeSync(fd);
    }
}

// ── Synthetic snapshots for the browser-free invariant-checker controls ─────────────────
function rect(x: number, y: number, width: number, height: number): RectSample {
    return { x, y, width, height, top: y, right: x + width, bottom: y + height, left: x };
}

function makeTarget(key: TargetKey, overrides: Partial<TargetMeasurement> = {}): TargetMeasurement {
    const spec = SHELL_TARGETS.find((t) => t.key === key);
    if (spec === undefined) throw new Error(`unknown target key ${key}`);
    return {
        selector: spec.selector,
        relation: spec.parent ? 'parent' : 'self',
        count: 1,
        displayed: true,
        rect: rect(0, 0, 100, 50),
        style: null,
        scroll: { clientWidth: 1280, scrollWidth: 1280, clientHeight: 720, scrollHeight: 720 },
        ...overrides,
    };
}

/** A conforming desktop-like 1280x720 snapshot; `mutate` derives a deliberately broken variant. */
function makeSnapshot(mutate?: (s: ShellGeometrySnapshot) => void): ShellGeometrySnapshot {
    const hidden = { displayed: false, rect: rect(0, 0, 0, 0) };
    const doc = { clientWidth: 1280, scrollWidth: 1280, clientHeight: 720, scrollHeight: 720, overflowX: 'hidden', overflowY: 'hidden' };
    const snapshot: ShellGeometrySnapshot = {
        viewport: {
            innerWidth: 1280,
            innerHeight: 720,
            visualViewportWidth: 1280,
            visualViewportHeight: 720,
            devicePixelRatio: 1,
        },
        media: {
            pointerFine: true,
            pointerCoarse: false,
            hoverHover: true,
            orientationPortrait: false,
            orientationLandscape: true,
            displayModeStandalone: false,
            minWidth650: true,
            maxWidth649: false,
            trayMobileByHeight: false,
        },
        html: { ...doc },
        body: { ...doc },
        targets: {
            rootShell: makeTarget('rootShell', { rect: rect(0, 0, 1280, 720) }),
            main: makeTarget('main', { rect: rect(0, 0, 1280, 720) }),
            playerHost: makeTarget('playerHost', { rect: rect(0, 80, 1280, 400) }),
            trayDesktop: makeTarget('trayDesktop', { rect: rect(0, 0, 1280, 80) }),
            trayMobile: makeTarget('trayMobile', hidden),
            transportBar: makeTarget('transportBar', { rect: rect(0, 646, 1280, 74) }),
            mobileControlPanel: makeTarget('mobileControlPanel', hidden),
        },
    };
    if (mutate) mutate(snapshot);
    return snapshot;
}

test.describe('shell geometry (opt-in: E2E_GEOMETRY=1)', () => {
    test.skip(!geometryEnabled, 'opt-in only: set E2E_GEOMETRY=1 to run shell geometry verification');

    test('control: invariant checker accepts a conforming snapshot and flags each violation', () => {
        // Positive controls: a conforming snapshot, and a 0.6px bottom-bar gap (inside the 1px tolerance).
        expect(checkShellInvariants(makeSnapshot())).toEqual([]);
        expect(
            checkShellInvariants(
                makeSnapshot((s) => {
                    s.targets.transportBar.rect = rect(0, 646.6, 1280, 74);
                }),
            ),
        ).toEqual([]);

        // Negative controls: each broken variant must produce its specific violation.
        const cases: Array<[string, (s: ShellGeometrySnapshot) => void, string]> = [
            ['document overflow', (s) => { s.html.scrollWidth = 1400; }, 'document horizontal overflow'],
            ['main overflow', (s) => { s.targets.main.scroll!.scrollWidth = 1500; }, 'main horizontal overflow'],
            ['two trays displayed', (s) => { s.targets.trayMobile.displayed = true; }, 'expected exactly 1 top tray displayed, found 2'],
            ['no tray displayed', (s) => { s.targets.trayDesktop.displayed = false; }, 'expected exactly 1 top tray displayed, found 0'],
            ['two bars displayed', (s) => { s.targets.mobileControlPanel.displayed = true; }, 'expected exactly 1 bottom bar displayed, found 2'],
            ['no bar displayed', (s) => { s.targets.transportBar.displayed = false; }, 'expected exactly 1 bottom bar displayed, found 0'],
            ['bar off viewport bottom', (s) => { s.targets.transportBar.rect = rect(0, 641, 1280, 74); }, 'from viewport bottom'],
            ['main outside viewport', (s) => { s.targets.main.rect = rect(0, 0, 1300, 720); }, 'main is outside viewport'],
            ['main not displayed', (s) => { s.targets.main.displayed = false; }, 'main is not displayed'],
            ['missing target', (s) => { s.targets.trayDesktop.count = 0; }, 'trayDesktop (.maestro-tray-desktop) is missing'],
            ['duplicate target', (s) => { s.targets.transportBar.count = 2; }, 'transportBar ([data-transport-bar]) is duplicated: 2 matches'],
        ];
        for (const [label, mutate, expected] of cases) {
            const violations = checkShellInvariants(makeSnapshot(mutate));
            expect(violations.join('\n'), `negative control "${label}"`).toContain(expected);
        }

        // Tolerance-edge controls (tolerance 1px; viewport 1280x720). Each case moves exactly one
        // edge of one target: 1px past the edge must pass, 1.5px past must fail, and a failure must
        // be the single intended violation (so the comparison under test is the one that fired).
        const toleranceEdgeCases: Array<[string, (s: ShellGeometrySnapshot) => void, boolean, string[]]> = [
            // Bottom-bar bottom edge vs viewport bottom (720), on both sides of it.
            ['bar bottom 1px above viewport bottom', (s) => { s.targets.transportBar.rect = rect(0, 645, 1280, 74); }, true, []],
            ['bar bottom 1.5px above viewport bottom', (s) => { s.targets.transportBar.rect = rect(0, 644.5, 1280, 74); }, false, ['from viewport bottom']],
            ['bar bottom 1px below viewport bottom', (s) => { s.targets.transportBar.rect = rect(0, 647, 1280, 74); }, true, []],
            ['bar bottom 1.5px below viewport bottom', (s) => { s.targets.transportBar.rect = rect(0, 647.5, 1280, 74); }, false, ['from viewport bottom']],
            // main's four edges vs the viewport.
            ['main left 1px outside', (s) => { s.targets.main.rect = rect(-1, 0, 1280, 720); }, true, []],
            ['main left 1.5px outside', (s) => { s.targets.main.rect = rect(-1.5, 0, 1280, 720); }, false, ['main is outside viewport', 'left -1.5']],
            ['main top 1px outside', (s) => { s.targets.main.rect = rect(0, -1, 1280, 720); }, true, []],
            ['main top 1.5px outside', (s) => { s.targets.main.rect = rect(0, -1.5, 1280, 720); }, false, ['main is outside viewport', 'top -1.5']],
            ['main right 1px outside', (s) => { s.targets.main.rect = rect(0, 0, 1281, 720); }, true, []],
            ['main right 1.5px outside', (s) => { s.targets.main.rect = rect(0, 0, 1281.5, 720); }, false, ['main is outside viewport', 'right 1281.5']],
            ['main bottom 1px outside', (s) => { s.targets.main.rect = rect(0, 0, 1280, 721); }, true, []],
            ['main bottom 1.5px outside', (s) => { s.targets.main.rect = rect(0, 0, 1280, 721.5); }, false, ['main is outside viewport', 'bottom 721.5']],
        ];
        for (const [label, mutate, shouldPass, expectedParts] of toleranceEdgeCases) {
            const violations = checkShellInvariants(makeSnapshot(mutate));
            if (shouldPass) {
                expect(violations, `tolerance edge "${label}" must pass`).toEqual([]);
            } else {
                expect(violations, `tolerance edge "${label}" must produce exactly one violation`).toHaveLength(1);
                for (const part of expectedParts) {
                    expect(violations[0], `tolerance edge "${label}"`).toContain(part);
                }
            }
        }

        // PNG header parser control (in memory; no file is written).
        const png = Buffer.alloc(24);
        png.writeUInt32BE(0x89504e47, 0);
        png.writeUInt32BE(0x0d0a1a0a, 4);
        png.writeUInt32BE(13, 8);
        png.write('IHDR', 12, 'ascii');
        png.writeUInt32BE(412, 16);
        png.writeUInt32BE(839, 20);
        expect(parsePngSize(png)).toEqual({ width: 412, height: 839 });
        expect(() => parsePngSize(Buffer.alloc(24))).toThrow('not a PNG');
    });

    test('measures shell geometry and satisfies source-backed invariants', async ({ page, browser }, testInfo) => {
        await page.goto(SHELL_PATH, { waitUntil: 'domcontentloaded' });
        await waitForShellReady(page);
        const stability = await waitForGeometryStable(page);
        const snapshot = await measureShellGeometry(page);
        const violations = checkShellInvariants(snapshot);

        // Emitted before asserting, so a failing run still carries its measurements.
        console.log(
            `${GEOMETRY_JSON_LABEL} ${JSON.stringify({
                project: testInfo.project.name,
                browserVersion: browser.version(),
                baseURL: testInfo.project.use.baseURL ?? null,
                url: page.url(),
                userAgent: await page.evaluate(() => navigator.userAgent),
                viewportSize: page.viewportSize(),
                stability,
                violations,
                snapshot,
            })}`,
        );

        expect(violations, 'shell geometry invariant violations').toEqual([]);

        // Capture only after successful measurement + assertions, and only when opted in.
        if (!screenshotsEnabled) return;

        const viewport = page.viewportSize();
        if (viewport === null) {
            throw new Error('page.viewportSize() is null: cannot define the expected screenshot dimensions');
        }
        const filePath = testInfo.outputPath(`shell-${testInfo.project.name}.png`);
        await page.screenshot({
            path: filePath,
            type: 'png',
            fullPage: false,
            scale: 'css',
            animations: 'disabled',
            caret: 'hide',
            style: HIDE_DEV_INDICATOR_CSS,
        });
        const bytes = fs.statSync(filePath).size;
        const actual = readPngSize(filePath);
        console.log(
            `${SCREENSHOT_JSON_LABEL} ${JSON.stringify({
                project: testInfo.project.name,
                path: filePath,
                scale: 'css',
                expected: viewport,
                actual,
                bytes,
                devicePixelRatio: snapshot.viewport.devicePixelRatio,
                devIndicatorHiddenDuringCaptureOnly: true,
            })}`,
        );
        expect(bytes, 'screenshot file size in bytes').toBeGreaterThan(0);
        expect(actual, 'PNG pixel size at scale "css" must equal the viewport CSS size').toEqual({
            width: viewport.width,
            height: viewport.height,
        });
    });
});
