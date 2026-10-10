/**
 * Maestro.ai — Playwright E2E configuration (Phase 1: unauthenticated shell smoke)
 * Version: V1.0.0
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-E2E-001
 *
 * Repo-owned, localhost-only, Chromium-only. This config deliberately has NO webServer
 * block: the suite expects an already-running, separately authorized dev server whose
 * identity (PID/PPID/cwd/port/HEAD/dirty state) is established per .claude/rules/runtime.md
 * before any result is reported. It also has no auth, storageState, or credentials, and
 * trace/screenshot/video are off so no automation artifact is created implicitly.
 * Mobile project is viewport/UA emulation only — never a substitute for real iPhone PWA
 * validation (.claude/rules/playwright.md, validation.md).
 */

import { defineConfig, devices } from '@playwright/test';

// Preferred authoritative dev server is 127.0.0.1:3000. E2E_BASE_URL exists only so a
// server that Next.js moved to another port can be targeted explicitly; it is refused
// unless it is loopback, keeping Phase 1 localhost-only.
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';
const baseHost = new URL(baseURL).hostname;
if (baseHost !== '127.0.0.1' && baseHost !== 'localhost') {
    throw new Error(`playwright.config: baseURL host "${baseHost}" is not loopback; Phase 1 is localhost-only.`);
}

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/*.e2e.ts',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    forbidOnly: true,
    // Deterministic budgets. A cold `next dev` compile of /synth-player can be slow, so
    // navigation gets more headroom than actions; readiness polling has its own bound.
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: 'list',
    use: {
        baseURL,
        actionTimeout: 15_000,
        navigationTimeout: 60_000,
        trace: 'off',
        screenshot: 'off',
        video: 'off',
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            // Chromium-based emulation preset (not an iPhone/WebKit preset, which would
            // imply fidelity this suite does not have).
            name: 'chromium-mobile-emulation',
            use: { ...devices['Pixel 7'] },
        },
    ],
});
