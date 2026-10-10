/**
 * Maestro.ai — E2E shell readiness helper
 * Version: V1.0.0
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-E2E-001
 *
 * Polls existing page state to decide the /synth-player shell is hydrated. No sleeps,
 * no product hooks. "Ready" means BOTH:
 *   1. <html data-theme="..."> exists. src/app/synth-player/page.tsx sets it only inside a
 *      client-side useEffect ([TH1]), and the SSR layout never renders it, so its presence
 *      proves React hydrated and ran effects — unlike #maestro-player, which is also in
 *      the server-rendered HTML.
 *   2. main #maestro-player is attached (the player host the shell always renders).
 * This says nothing about a score, AlphaTab API, or cursor: with no signed song URL the
 * renderer is not mounted at all (page.tsx renders it only when signedUrl is set).
 */

import { errors, type Page } from '@playwright/test';

export const SHELL_READY_TIMEOUT_MS = 30_000;

export async function waitForShellReady(
    page: Page,
    timeoutMs: number = SHELL_READY_TIMEOUT_MS,
): Promise<void> {
    try {
        await page.waitForFunction(
            () =>
                document.documentElement.hasAttribute('data-theme') &&
                document.querySelector('main #maestro-player') !== null,
            undefined,
            { timeout: timeoutMs },
        );
    } catch (err) {
        if (!(err instanceof errors.TimeoutError)) throw err;
        const state = await page
            .evaluate(() => ({
                url: location.href,
                readyState: document.readyState,
                dataTheme: document.documentElement.getAttribute('data-theme'),
                hasMain: document.querySelector('main') !== null,
                hasPlayerHost: document.querySelector('main #maestro-player') !== null,
            }))
            .catch(() => 'page state unavailable');
        throw new Error(
            `Shell not ready after ${timeoutMs}ms (expected html[data-theme] and main #maestro-player). ` +
                `Observed: ${JSON.stringify(state)}`,
        );
    }
}
