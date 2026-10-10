/**
 * Maestro.ai — Phase 1 unauthenticated shell smoke
 * Version: V1.0.0
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-E2E-001
 *
 * Shell-only: loads /synth-player with no session and no song. Runs under both Playwright
 * projects (desktop Chromium, mobile Chromium emulation). DOM-only mechanism — no mouse,
 * touch, playback, or geometry assertions — so it proves nothing about cursor engines,
 * AlphaTab, or real-device behavior. No score is loaded (the renderer mounts only when a
 * signed song URL exists), so cursor-engine resolution is intentionally NOT asserted here.
 * Requires an already-running, separately authorized dev server; see playwright.config.ts.
 */

import { expect, test } from '@playwright/test';
import { waitForShellReady } from './helpers/ready';

const SHELL_PATH = '/synth-player';

// Console policy: only clearly fatal / runtime-breaking text fails a test. Everything else
// (404 resource noise, DevTools hints, Next/React dev warnings, AlphaTab/Supabase logging)
// is deliberately ignored. Uncaught exceptions and unhandled rejections are caught
// separately via `pageerror`, so this list targets errors that are logged, not thrown.
const FATAL_CONSOLE_PATTERNS: readonly RegExp[] = [
    /\bUncaught\b/,
    /\bUnhandled (?:Runtime Error|Promise Rejection|rejection)\b/i,
    /Application error: a client-side exception/,
    /Hydration failed/,
    /Minified React error/,
    /Maximum update depth exceeded/,
    /ChunkLoadError/,
];

function isFatalConsoleText(text: string): boolean {
    return FATAL_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe('/synth-player shell (unauthenticated)', () => {
    test('control: fatal-console matcher flags fatal text and ignores benign text', () => {
        // Positive controls.
        expect(isFatalConsoleText('Uncaught TypeError: x is not a function')).toBe(true);
        expect(isFatalConsoleText('Error: Hydration failed because the server rendered HTML did not match')).toBe(true);
        expect(isFatalConsoleText('Application error: a client-side exception has occurred')).toBe(true);
        // Negative controls.
        expect(isFatalConsoleText('Failed to load resource: the server responded with a status of 404 (Not Found)')).toBe(false);
        expect(isFatalConsoleText('Download the React DevTools for a better development experience')).toBe(false);
        expect(isFatalConsoleText('APP AUTH STATE (session) { hasSession: false, hasError: false }')).toBe(false);
    });

    test('loads without HTTP error or redirect', async ({ page }) => {
        const response = await page.goto(SHELL_PATH, { waitUntil: 'domcontentloaded' });
        expect(response, 'navigation produced no response').not.toBeNull();
        expect(response!.status()).toBeLessThan(400);

        await waitForShellReady(page);
        expect(new URL(page.url()).pathname).toBe(SHELL_PATH);
    });

    test('reaches the shell-ready state', async ({ page }) => {
        await page.goto(SHELL_PATH, { waitUntil: 'domcontentloaded' });
        await waitForShellReady(page);

        await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);
        await expect(page.locator('main #maestro-player')).toHaveCount(1);
        // Negative control: with no song there is no score, so neither cursor engine
        // instance exists. If this ever fails, the suite is no longer shell-only.
        await expect(page.locator('#maestro-cursor-v2, #maestro-cursor-v3')).toHaveCount(0);
    });

    test('has no pageerror or fatal console error during initial render', async ({ page }) => {
        const pageErrors: string[] = [];
        const fatalConsole: string[] = [];
        // Listeners attach before navigation so nothing during initial render is missed.
        page.on('pageerror', (error) => pageErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error' && isFatalConsoleText(message.text())) {
                fatalConsole.push(message.text());
            }
        });

        await page.goto(SHELL_PATH, { waitUntil: 'domcontentloaded' });
        await waitForShellReady(page);

        expect(pageErrors, 'uncaught page errors during initial render').toEqual([]);
        expect(fatalConsole, 'fatal console errors during initial render').toEqual([]);
    });
});
