/**
 * Maestro.ai — Opt-in cursor-engine verification on the bundled original fixture
 * Version: V1.0.1
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-FIXTURE-001
 *
 * Scope: /synth-player loaded with the original AlphaTex fixture (provenance and structure: fixtureBackend.ts)
 * through a TEST-SIDE simulated catalogue / URL-resolution / font transport, so the real page, resolver, renderer,
 * AlphaTab and cursor code run unchanged beneath it. It verifies, per Playwright project, that
 *     plain /synth-player              -> cursor3 (MaestroCursorV3)
 *     /synth-player?cursorEngine=cursor3 -> cursor3
 *     /synth-player?cursorEngine=cursor2 -> cursor2 (MaestroCursorV2)
 * with readiness gates R0–R6 and a report-only R7 (scoreReady.ts). The simulated backend carries no authentication
 * state, session, credential or token and touches no real Supabase resource; this spec does NOT establish real
 * Supabase / auth integration, playback, loop, seek, landscape or iPhone/PWA behaviour.
 *
 * Opt-in flag (default run: every test here is skipped and nothing is installed or captured):
 *   E2E_FIXTURE=1   run the fixture cursor-engine tests. Unset, empty or 0 = off; any other value fails the load.
 * Fresh-state category used by every browser case: NEW BROWSER CONTEXT (Playwright's per-test context), with service
 * workers blocked. No storage is seeded, cleared or injected, and no product-owned global is set by the tests.
 *
 * REPOSITORY PATHS (V1.0.1): every fixture and installed-font path comes from resolveRepoRoot(config), i.e. the
 * directory containing the absolute config.configFile (verified to hold playwright.config.ts and package.json). It is
 * never config.rootDir, which Playwright sets to the testDir (tests/e2e).
 *
 * VALIDATION ENDPOINT (V1.0.1): in every browser case the authoritative ledger snapshot, page-error list and
 * fatal-console list are collected in ONE synchronous step that runs after the LAST awaited browser read and
 * report-only observation, and the unexpected-request / page-error / fatal-console checks are the final statements of
 * the case. Requests, page errors or console errors arising after that step, including during context teardown, are
 * NOT covered. The deliberate-404 case allows only the product's classified "loadGuitarProFile: HTTP 404" failure:
 * any other page error or fatal console error is unrelated and fails it. Its cursor-absence claim holds through the
 * bounded observation endpoint (scoreReady.ts observeLoadFailureAbsence) only, not permanently.
 *
 * Every Playwright invocation for this ticket must pass `--output /private/tmp/maestro-e2e-fixture-001-output`.
 * Evidence limits: Chromium emulation against a dev server; browser behaviour of everything here was NOT RUN when
 * this file was written. It is not iPhone/PWA validation, and Chromium emulation does not establish iOS safe-area
 * behaviour.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import {
    FIXTURE_BYTE_LENGTH,
    FIXTURE_ROW,
    FIXTURE_SHA256,
    FIXTURE_STORAGE_PATH,
    FONT_PINS,
    PATH_SIGN_SINGLE_AND_FIXTURE,
    REPO_ROOT_MARKER_FILES,
    SIGNED_URL_RELATIVE,
    TransportLedger,
    buildCatalogueTabsBody,
    buildCatalogueYoutubeBody,
    buildSignBatchBody,
    buildSignSingleBody,
    classifyRequest,
    describeResolvedPaths,
    describeUnexpected,
    installDocStartObserver,
    installFixtureTransport,
    loadPinnedFixture,
    loadPinnedFonts,
    readDocStartObservation,
    readEngineKeyNow,
    resolveRepoRoot,
    signBatchPathsMatch,
    verifyFixtureBytes,
    type LedgerSnapshot,
    type RequestClass,
} from './helpers/fixtureBackend';
import {
    ABSENCE_STABLE_COMPARISONS,
    CURSOR_ELEMENT_ID,
    EXPECTED_MODEL,
    GENERATED_MIDI_REFERENCE,
    NAVIGATION_BUDGET_MS,
    OVERALL_DEADLINE_MS,
    R4_RECT_SCALE,
    R4_STABLE_COMPARISONS,
    STAGE_BUDGET_MS,
    TEST_TIMEOUT_MS,
    cloneExpectedAsFingerprint,
    compareScoreFingerprint,
    createDeadline,
    navigateAndWaitForShell,
    observeLoadFailureAbsence,
    readLoadFailureState,
    runAcceptanceStages,
    waitForCatalogueAndResolution,
    waitForOwnedApi,
    watchLoadingFailure,
    type CursorEngineName,
    type StageRecord,
} from './helpers/scoreReady';

const SHELL_PATH = '/synth-player';
const STAGES_JSON_LABEL = '[CURSOR-ENGINE-STAGES-JSON]';
const CONTROL_404_JSON_LABEL = '[CURSOR-ENGINE-404-JSON]';

/** The one failure the deliberate-404 control tolerates: the product's own classified loading error. */
const CLASSIFIED_404_PATTERN = /loadGuitarProFile: HTTP 404/;

/** Stated in every case's evidence log: exactly what the final request / error validation does and does not cover. */
const VALIDATION_ENDPOINT =
    'the synchronous final-evidence collection that follows the last awaited browser read and report-only observation of the case; ' +
    'requests, page errors and console errors arising after it, including during context teardown, are not covered';

function readFlag(name: string): boolean {
    const raw = process.env[name];
    if (raw === undefined || raw === '' || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${name}="${raw}" is not valid: set ${name}=1 to enable it, or leave it unset (or 0 / empty) to disable it.`);
}

const fixtureEnabled = readFlag('E2E_FIXTURE');

// Same fatal-console policy as smoke.e2e.ts: only clearly fatal text fails; uncaught errors arrive via `pageerror`.
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

function resolveDevOrigin(testInfo: TestInfo): string {
    const baseURL = testInfo.project.use.baseURL;
    if (!baseURL) throw new Error('The project has no baseURL; the dev-server origin cannot be determined.');
    return new URL(baseURL).origin;
}

function expectedSearch(query: string): string {
    return query === '' ? '' : `?${query}`;
}

// ── Final evidence: page errors, fatal console errors and the authoritative ledger snapshot ─────────

interface ErrorTracker {
    pageErrors: string[];
    fatalConsole: string[];
}

/** Attach BEFORE navigation so nothing during initial render is missed. */
function trackErrors(page: Page): ErrorTracker {
    const tracker: ErrorTracker = { pageErrors: [], fatalConsole: [] };
    page.on('pageerror', (error) => tracker.pageErrors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && isFatalConsoleText(message.text())) tracker.fatalConsole.push(message.text());
    });
    return tracker;
}

/** Messages that do NOT match the deliberately allowed pattern; every message when no pattern is allowed. */
function unrelatedMessages(messages: readonly string[], allowed: RegExp | null): string[] {
    return allowed === null ? messages.slice() : messages.filter((message) => !allowed.test(message));
}

interface EndpointEvidence {
    ledger: LedgerSnapshot;
    unrelatedPageErrors: string[];
    unrelatedFatalConsole: string[];
    allowedPageErrorCount: number;
    allowedFatalConsoleCount: number;
}

/**
 * The single synchronous collection point (the validation endpoint). Call it after the last awaited read of the case.
 * `allowed` is the one deliberately tolerated failure (the 404 control); acceptance cases pass null.
 */
function collectEndpointEvidence(ledger: TransportLedger, tracker: ErrorTracker, allowed: RegExp | null): EndpointEvidence {
    const unrelatedPageErrors = unrelatedMessages(tracker.pageErrors, allowed);
    const unrelatedFatalConsole = unrelatedMessages(tracker.fatalConsole, allowed);
    return {
        ledger: ledger.snapshot(),
        unrelatedPageErrors,
        unrelatedFatalConsole,
        allowedPageErrorCount: tracker.pageErrors.length - unrelatedPageErrors.length,
        allowedFatalConsoleCount: tracker.fatalConsole.length - unrelatedFatalConsole.length,
    };
}

/** Pure: every way the endpoint evidence is not clean (empty = clean). Unexpected requests, unrelated page errors, unrelated fatal console errors. */
function endpointViolations(evidence: EndpointEvidence): string[] {
    const violations: string[] = [];
    if (evidence.ledger.unexpected.length > 0) {
        violations.push(`unexpected backend/external request(s) (aborted and recorded): ${describeUnexpected(evidence.ledger.unexpected)}`);
    }
    for (const message of evidence.unrelatedPageErrors) violations.push(`uncaught page error: ${message}`);
    for (const message of evidence.unrelatedFatalConsole) violations.push(`fatal console error: ${message}`);
    return violations;
}

/** The final statement of every browser case. */
function expectCleanEndpoint(evidence: EndpointEvidence): void {
    expect(endpointViolations(evidence), 'unexpected requests, page errors and fatal console errors through the validation endpoint').toEqual([]);
}

interface CaseOptions {
    query: string;
    expectedEngine: CursorEngineName;
}

/** One browser acceptance (or fail-safe negative-control) case: R0–R6 gates, R7 report, fresh-context evidence. */
async function runAcceptanceCase(context: BrowserContext, page: Page, testInfo: TestInfo, options: CaseOptions): Promise<void> {
    const { query, expectedEngine } = options;
    const deadline = createDeadline(OVERALL_DEADLINE_MS);
    const repoRoot = resolveRepoRoot(testInfo.config);
    const tracker = trackErrors(page);

    // Both are installed, and awaited, BEFORE the first navigation.
    await installDocStartObserver(context);
    const ledger = await installFixtureTransport(context, {
        devOrigin: resolveDevOrigin(testInfo),
        repoRoot,
        fixtureMode: 'serve',
    });

    const urlPath = query === '' ? SHELL_PATH : `${SHELL_PATH}?${query}`;
    const report = await runAcceptanceStages({ page, ledger, deadline, urlPath, expectedEngine });

    // Every awaited evidence read happens before the endpoint collection below.
    const docStart = await readDocStartObservation(page);
    const keyAfter = await readEngineKeyNow(page);
    const serviceWorkerCount = context.serviceWorkers().length;

    // VALIDATION ENDPOINT: the authoritative snapshot, taken after all awaited reads and report-only observations.
    const endpoint = collectEndpointEvidence(ledger, tracker, null);
    const snapshot = endpoint.ledger;

    // Emitted before asserting, so a failing run still carries its evidence.
    console.log(
        `${STAGES_JSON_LABEL} ${JSON.stringify({
            project: testInfo.project.name,
            urlPath,
            expectedEngine,
            engineGlobal: report.engineGlobal,
            cursorId: report.cursorId,
            overallDeadlineMs: OVERALL_DEADLINE_MS,
            overallElapsedMs: deadline.elapsedMs(),
            stages: report.stages,
            r4: report.r4,
            r7: report.r7,
            tickCacheObservation: report.tickCache,
            generatedMidiReference: GENERATED_MIDI_REFERENCE,
            engineKeyAtDocumentStart: docStart === null ? 'no-observation' : docStart.engineKey,
            engineKeyAfterLoad: keyAfter.value,
            docStart,
            ledger: snapshot,
            serviceWorkerCount,
            validationEndpoint: VALIDATION_ENDPOINT,
            pageErrorCount: tracker.pageErrors.length,
            fatalConsoleCount: tracker.fatalConsole.length,
        })}`,
    );

    // Fresh-context evidence: observed before any application code ran; never seeded by the test.
    expect(docStart, 'the document-start observation was recorded').not.toBeNull();
    expect(docStart!.search, 'location.search at document start').toBe(expectedSearch(query));
    expect(docStart!.engineKeyReadError, 'engine storage key was readable at document start').toBe(false);
    expect(docStart!.engineKey, 'maestro_cursor_engine is absent at document start').toBeNull();
    expect(docStart!.hasEngineGlobal, '__maestroCursorEngine absent at document start').toBe(false);
    expect(docStart!.hasCursorGlobal, '__maestroCursor absent at document start').toBe(false);
    expect(keyAfter.readError, 'engine storage key was readable after load').toBe(false);
    expect(keyAfter.value, 'maestro_cursor_engine is still absent after load (the resolver never writes it)').toBeNull();
    // Positive control for the observer: it did see the cursor element appear.
    expect(docStart!.cursorElementEverSeen, 'the observer saw the cursor element inserted').toBe(true);

    // Transport evidence.
    expect(snapshot.knownBlocked.every((r) => r.what === 'youtube-iframe-api'), 'only the known YouTube iframe API request was blocked').toBe(true);
    expect(snapshot.counts.fixtureServed, 'fixture bytes served').toBeGreaterThanOrEqual(1);
    expect(snapshot.counts.fixtureNotFound, 'no deliberate 404 in the serve mode').toBe(0);
    expect(snapshot.servedFixtureSha256.every((digest) => digest === FIXTURE_SHA256), 'every served fixture response equals the pinned SHA-256').toBe(true);
    expect(serviceWorkerCount, 'no service worker is active in the context').toBe(0);

    // Final statements of the case (validation.md: report console/page error state, not just the targeted assertion).
    expectCleanEndpoint(endpoint);
}

/** Negative control: the fixture request is answered with a deliberate 404. */
async function runFixture404Control(context: BrowserContext, page: Page, testInfo: TestInfo): Promise<void> {
    const deadline = createDeadline(OVERALL_DEADLINE_MS);
    const repoRoot = resolveRepoRoot(testInfo.config);
    const tracker = trackErrors(page);
    // Attached before navigation. The product classifies the failure itself: loadGuitarProFile throws
    // "loadGuitarProFile: HTTP 404" and the renderer logs it via init().catch(console.error).
    const watcher = watchLoadingFailure(page, CLASSIFIED_404_PATTERN);
    try {
        await installDocStartObserver(context);
        const ledger = await installFixtureTransport(context, {
            devOrigin: resolveDevOrigin(testInfo),
            repoRoot,
            fixtureMode: 'not-found',
        });
        const stages: StageRecord[] = [];

        await navigateAndWaitForShell(page, deadline, SHELL_PATH, stages);
        await waitForCatalogueAndResolution(ledger, deadline, stages);
        // The API exists and is owned by the current renderer container, so the failure below is a load failure,
        // not an absent renderer.
        await waitForOwnedApi(page, deadline, stages);

        // (1) The intended fixture request was made and was answered with the deliberate 404.
        await ledger.waitFor(
            (l) => l.counts.fixtureNotFound >= 1,
            deadline.budget('fixture 404', STAGE_BUDGET_MS.R3),
            'the intended fixture request was answered with the deliberate 404',
        );
        // (2) A bounded, classified loading failure. An arbitrary timeout or an unrelated error cannot satisfy this.
        const classified = await watcher.wait(deadline.budget('classified loading failure', STAGE_BUDGET_MS.classifiedFailure));
        // (3) Bounded frame-by-frame observation of the failed state: owned API, null score, no cursor element, sticky
        // cursor flag still false, ABSENCE_STABLE_COMPARISONS consecutive unchanged comparisons. A violation rejects.
        const absence = await observeLoadFailureAbsence(page, deadline, stages);

        // Every awaited evidence read happens before the endpoint collection below.
        const docStart = await readDocStartObservation(page);
        const state = await readLoadFailureState(page);

        // VALIDATION ENDPOINT: the authoritative snapshot, taken after all awaited reads. Only the classified 404
        // failure is allowed; any other page error or fatal console error is unrelated.
        const endpoint = collectEndpointEvidence(ledger, tracker, CLASSIFIED_404_PATTERN);
        const snapshot = endpoint.ledger;
        console.log(
            `${CONTROL_404_JSON_LABEL} ${JSON.stringify({
                project: testInfo.project.name,
                classifiedFailure: classified,
                stages,
                absenceObservation: {
                    frames: absence.frames,
                    consecutiveComparisons: absence.consecutiveComparisons,
                    requiredComparisons: ABSENCE_STABLE_COMPARISONS,
                    inPageElapsedMs: absence.inPageElapsedMs,
                    observed: absence.observed,
                    claim: 'cursor absence through the bounded observation endpoint, not permanent absence',
                },
                state,
                cursorElementEverSeen: docStart === null ? 'no-observation' : docStart.cursorElementEverSeen,
                ledger: snapshot,
                validationEndpoint: VALIDATION_ENDPOINT,
                pageErrorCount: tracker.pageErrors.length,
                fatalConsoleCount: tracker.fatalConsole.length,
                allowedClassifiedPageErrors: endpoint.allowedPageErrorCount,
                allowedClassifiedFatalConsole: endpoint.allowedFatalConsoleCount,
            })}`,
        );

        expect(classified, 'the product classified the failure as an HTTP 404 fixture load failure').toBe('loadGuitarProFile: HTTP 404');
        expect(snapshot.counts.fixtureNotFound, 'the fixture request was answered with the deliberate 404').toBeGreaterThanOrEqual(1);
        expect(snapshot.counts.fixtureServed, 'no fixture bytes were served').toBe(0);
        expect(absence.consecutiveComparisons, 'bounded absence observation completed its consecutive comparisons').toBeGreaterThanOrEqual(ABSENCE_STABLE_COMPARISONS);
        expect(state.apiPresent, 'the owned AlphaTab API exists at the observation endpoint').toBe(true);
        expect(state.scoreIsNull, 'no score was loaded through the observation endpoint').toBe(true);
        expect(state.cursorElementCount, 'no cursor element is present at the observation endpoint (bounded, not permanent absence)').toBe(0);
        expect(docStart, 'the document-start observation was recorded').not.toBeNull();
        expect(docStart!.cursorElementEverSeen, 'no cursor element was ever inserted through the observation endpoint').toBe(false);

        // Final statements of the case: unexpected requests, and page / fatal console errors other than the classified failure.
        expectCleanEndpoint(endpoint);
    } finally {
        watcher.dispose();
    }
}

test.describe('cursor engine on the bundled fixture (opt-in: E2E_FIXTURE=1)', () => {
    test.skip(!fixtureEnabled, 'opt-in only: set E2E_FIXTURE=1 to run the bundled-fixture cursor-engine verification');
    // The explicit overall deadline (OVERALL_DEADLINE_MS) governs readiness; this raises the 90 s config default to cover it.
    test.describe.configure({ timeout: TEST_TIMEOUT_MS });
    // Playwright documents that routes do not see requests served by a service worker; block them for this spec.
    test.use({ serviceWorkers: 'block' });

    test('control: request classifier matches the actual matching contract, and simulated bodies are well-formed', () => {
        const DEV = 'http://127.0.0.1:3000';
        const BACKEND = 'https://backend.example.invalid';
        const FONT_BASE = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/';
        const unexpected = (reason: string, hostClass: string): RequestClass => ({ kind: 'unexpected', reason, hostClass }) as RequestClass;

        const cases: Array<{ label: string; method: string; href: string; expected: RequestClass }> = [
            // Positive: same-origin application traffic is continued.
            { label: 'same-origin page', method: 'GET', href: `${DEV}/synth-player?cursorEngine=cursor2`, expected: { kind: 'same-origin-continue' } },
            // Positive: backend matching is exact METHOD + exact PATHNAME and HOST-AGNOSTIC. These two lines document that
            // the same pathname on a DIFFERENT host (or on the dev origin) is answered too: the classifier does not
            // reject a different backend host.
            { label: 'catalogue tabs, other host', method: 'GET', href: `${BACKEND}/rest/v1/tabs?select=*`, expected: { kind: 'catalogue-tabs' } },
            { label: 'catalogue tabs, dev origin', method: 'GET', href: `${DEV}/rest/v1/tabs`, expected: { kind: 'catalogue-tabs' } },
            { label: 'catalogue youtube', method: 'GET', href: `${BACKEND}/rest/v1/tab_youtube?select=tab_id`, expected: { kind: 'catalogue-youtube' } },
            { label: 'sign batch', method: 'POST', href: `${BACKEND}/storage/v1/object/sign/tabs`, expected: { kind: 'sign-batch' } },
            { label: 'sign single', method: 'POST', href: `${BACKEND}${PATH_SIGN_SINGLE_AND_FIXTURE}`, expected: { kind: 'sign-single' } },
            { label: 'fixture bytes', method: 'GET', href: `${BACKEND}${PATH_SIGN_SINGLE_AND_FIXTURE}`, expected: { kind: 'fixture-bytes' } },
            { label: 'font woff2', method: 'GET', href: `${FONT_BASE}Bravura.woff2`, expected: { kind: 'font', file: 'Bravura.woff2' } },
            { label: 'font woff', method: 'GET', href: `${FONT_BASE}Bravura.woff`, expected: { kind: 'font', file: 'Bravura.woff' } },
            { label: 'font otf', method: 'GET', href: `${FONT_BASE}Bravura.otf`, expected: { kind: 'font', file: 'Bravura.otf' } },
            { label: 'youtube iframe api (any query)', method: 'GET', href: 'https://www.youtube.com/iframe_api?origin=x', expected: { kind: 'youtube-iframe-api' } },
            // Negative: wrong method / other paths under a Supabase service prefix are not simulated.
            { label: 'wrong method on tabs', method: 'POST', href: `${BACKEND}/rest/v1/tabs`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'longer path under tabs', method: 'GET', href: `${BACKEND}/rest/v1/tabs/extra`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'other table', method: 'GET', href: `${BACKEND}/rest/v1/other_table`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'auth user', method: 'GET', href: `${BACKEND}/auth/v1/user`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'realtime', method: 'GET', href: `${BACKEND}/realtime/v1/websocket`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'functions', method: 'POST', href: `${BACKEND}/functions/v1/some-fn`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'storage, other object', method: 'GET', href: `${BACKEND}/storage/v1/object/sign/tabs/other.gp`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'storage, public object', method: 'GET', href: `${BACKEND}/storage/v1/object/public/tabs/x`, expected: unexpected('backend-path-not-simulated', 'other') },
            { label: 'dev origin, unsimulated backend path', method: 'GET', href: `${DEV}/auth/v1/user`, expected: unexpected('backend-path-not-simulated', 'dev-origin') },
            // Negative: fonts and YouTube are restricted to their specified origins and requests.
            { label: 'jsdelivr, unpinned font file', method: 'GET', href: `${FONT_BASE}Bravura.svg`, expected: unexpected('font-origin-other-request', 'cdn.jsdelivr.net') },
            { label: 'jsdelivr, other package', method: 'GET', href: 'https://cdn.jsdelivr.net/npm/other@1/index.js', expected: unexpected('font-origin-other-request', 'cdn.jsdelivr.net') },
            { label: 'jsdelivr font, wrong method', method: 'POST', href: `${FONT_BASE}Bravura.woff2`, expected: unexpected('font-origin-other-request', 'cdn.jsdelivr.net') },
            { label: 'font path on another origin', method: 'GET', href: 'https://other.example.invalid/npm/@coderline/alphatab@latest/dist/font/Bravura.woff2', expected: unexpected('external-origin', 'other') },
            { label: 'youtube, other request', method: 'GET', href: 'https://www.youtube.com/watch?v=abc', expected: unexpected('youtube-origin-other-request', 'www.youtube.com') },
            { label: 'youtube iframe api, wrong method', method: 'POST', href: 'https://www.youtube.com/iframe_api', expected: unexpected('youtube-origin-other-request', 'www.youtube.com') },
            { label: 'iframe_api on another origin', method: 'GET', href: 'https://other.example.invalid/iframe_api', expected: unexpected('external-origin', 'other') },
            // Negative: anything else is external.
            { label: 'external script', method: 'GET', href: 'https://example.invalid/script.js', expected: unexpected('external-origin', 'other') },
            { label: 'same host, different port', method: 'GET', href: 'http://127.0.0.1:3001/synth-player', expected: unexpected('external-origin', 'other') },
            { label: 'non-http scheme', method: 'GET', href: 'data:text/plain,hi', expected: unexpected('non-http-scheme', 'other') },
        ];
        for (const c of cases) {
            expect(classifyRequest(c.method, new URL(c.href), DEV), `classification of "${c.label}"`).toEqual(c.expected);
        }

        // Simulated bodies are well-formed and carry no credential-shaped text.
        const catalogue = JSON.parse(buildCatalogueTabsBody()) as Array<Record<string, unknown>>;
        expect(catalogue).toHaveLength(1);
        expect(catalogue[0]).toEqual(FIXTURE_ROW);
        expect(`${FIXTURE_ROW.file_name}.${FIXTURE_ROW.file_extension}`).toBe(FIXTURE_STORAGE_PATH);
        expect(JSON.parse(buildCatalogueYoutubeBody())).toEqual([]);
        const batch = JSON.parse(buildSignBatchBody()) as Array<{ error: unknown; path: string; signedURL: string }>;
        expect(batch).toEqual([{ error: null, path: FIXTURE_STORAGE_PATH, signedURL: SIGNED_URL_RELATIVE }]);
        expect(batch[0].signedURL.startsWith('/')).toBe(true);
        expect(batch[0].signedURL).not.toContain('?');
        expect(JSON.parse(buildSignSingleBody())).toEqual({ signedURL: SIGNED_URL_RELATIVE });
        for (const body of [buildCatalogueTabsBody(), buildCatalogueYoutubeBody(), buildSignBatchBody(), buildSignSingleBody()]) {
            expect(body, 'simulated body must not look like a credential').not.toMatch(/token|apikey|authorization|bearer|jwt|secret/i);
        }

        // Batch-sign body validation inspects only the paths field.
        expect(signBatchPathsMatch(JSON.stringify({ expiresIn: 3600, paths: [FIXTURE_STORAGE_PATH] }))).toBe(true);
        expect(signBatchPathsMatch(JSON.stringify({ paths: [FIXTURE_STORAGE_PATH] }))).toBe(true);
        expect(signBatchPathsMatch(JSON.stringify({ paths: ['other.gp'] }))).toBe(false);
        expect(signBatchPathsMatch(JSON.stringify({ paths: [FIXTURE_STORAGE_PATH, 'other.gp'] }))).toBe(false);
        expect(signBatchPathsMatch(JSON.stringify({ paths: [] }))).toBe(false);
        expect(signBatchPathsMatch(JSON.stringify({ paths: FIXTURE_STORAGE_PATH }))).toBe(false);
        expect(signBatchPathsMatch(JSON.stringify({ expiresIn: 3600 }))).toBe(false);
        expect(signBatchPathsMatch('not json')).toBe(false);
        expect(signBatchPathsMatch(JSON.stringify(null))).toBe(false);
        expect(signBatchPathsMatch(null)).toBe(false);
    });

    test('control: repository root resolver, fixture bytes and installed AlphaTab fonts match their pins', () => {
        const config = test.info().config;

        // The one shared resolver: the directory containing the absolute config.configFile, with both marker files.
        const repoRoot = resolveRepoRoot(config);
        expect(path.isAbsolute(repoRoot), 'the resolved repository root is absolute').toBe(true);
        expect(repoRoot, 'the root is the directory containing config.configFile').toBe(path.dirname(config.configFile as string));
        for (const marker of REPO_ROOT_MARKER_FILES) {
            expect(fs.existsSync(path.join(repoRoot, marker)), `${marker} exists in the resolved repository root`).toBe(true);
        }

        // Negative controls: a missing, empty or relative configFile, and directories lacking the marker files, all fail clearly.
        expect(() => resolveRepoRoot({}), 'configFile absent').toThrow(/configFile is not set/);
        expect(() => resolveRepoRoot({ configFile: null }), 'configFile null').toThrow(/configFile is not set/);
        expect(() => resolveRepoRoot({ configFile: '' }), 'configFile empty').toThrow(/configFile is not set/);
        expect(() => resolveRepoRoot({ configFile: 'playwright.config.ts' }), 'configFile relative').toThrow(/not an absolute path/);
        expect(
            () => resolveRepoRoot({ configFile: path.join(repoRoot, 'tests', 'e2e', 'playwright.config.ts') }),
            'tests/e2e is the directory config.rootDir resolves to under testDir "./tests/e2e"; it lacks the marker files',
        ).toThrow(/does not contain/);
        expect(
            () => resolveRepoRoot({ configFile: path.join(os.tmpdir(), 'maestro-e2e-no-such-root', 'playwright.config.ts') }),
            'a directory that does not exist',
        ).toThrow(/does not contain/);

        // Every resolved fixture and installed-font path exists.
        const resolved = describeResolvedPaths(repoRoot);
        expect(resolved.repoRoot).toBe(repoRoot);
        expect(fs.existsSync(resolved.fixture), 'resolved fixture path exists').toBe(true);
        expect(fs.existsSync(resolved.alphatabPackageJson), 'resolved installed AlphaTab package.json exists').toBe(true);
        expect(Object.keys(resolved.fonts).sort()).toEqual(Object.keys(FONT_PINS).sort());
        for (const file of Object.keys(resolved.fonts)) {
            expect(fs.existsSync(resolved.fonts[file]), `resolved installed font ${file} exists`).toBe(true);
        }
        // A root that does not hold the files fails clearly rather than reading something else.
        expect(() => loadPinnedFixture(path.join(os.tmpdir(), 'maestro-e2e-no-such-root')), 'fixture missing under a wrong root').toThrow(/does not exist as a file/);
        expect(() => loadPinnedFonts(path.join(os.tmpdir(), 'maestro-e2e-no-such-root')), 'fonts missing under a wrong root').toThrow(/does not exist as a file/);

        const fixture = loadPinnedFixture(repoRoot);
        expect(fixture.byteLength).toBe(FIXTURE_BYTE_LENGTH);
        expect(fixture.sha256).toBe(FIXTURE_SHA256);
        expect(verifyFixtureBytes(fixture.bytes).ok).toBe(true);
        // Negative controls: a one-byte change and a truncation must both fail the pin.
        const flipped = Buffer.from(fixture.bytes);
        flipped[flipped.length - 1] = flipped[flipped.length - 1] ^ 0x01;
        expect(verifyFixtureBytes(flipped).ok, 'a flipped byte must fail the pin').toBe(false);
        expect(verifyFixtureBytes(fixture.bytes.subarray(0, fixture.bytes.length - 1)).ok, 'a truncated copy must fail the pin').toBe(false);

        const fonts = loadPinnedFonts(repoRoot);
        expect(Object.keys(fonts).sort()).toEqual(Object.keys(FONT_PINS).sort());
        for (const file of Object.keys(FONT_PINS)) {
            expect(fonts[file].byteLength, `${file} byte length`).toBe(FONT_PINS[file].byteLength);
            expect(fonts[file].sha256, `${file} sha256`).toBe(FONT_PINS[file].sha256);
            expect(fonts[file].contentType, `${file} content type`).toBe(FONT_PINS[file].contentType);
        }
    });

    test('control: score comparator, tick families, R4 contract, deadline helper and error partition discriminate', () => {
        // Conforming sample matches; each perturbation is detected (positive and negative controls).
        expect(compareScoreFingerprint(cloneExpectedAsFingerprint(), EXPECTED_MODEL)).toEqual([]);
        const perturbations: Array<[string, (f: ReturnType<typeof cloneExpectedAsFingerprint>) => void, string]> = [
            ['tempo 100', (f) => { f.tempo = 100; }, 'tempo (BPM)'],
            ['two tracks', (f) => { f.trackCount = 2; }, 'track count'],
            ['one bar removed', (f) => { f.masterBars.pop(); f.masterBarCount = 3; }, 'masterBar count'],
            ['wrong tuning', (f) => { if (f.track) f.track.tuning[5] = 38; }, 'track'],
            ['swapped frets 5 and 6', (f) => { const a = f.beats[5].fret; f.beats[5].fret = f.beats[6].fret; f.beats[6].fret = a; }, 'beats[5]'],
            ['wrong pitch on beat 15', (f) => { f.beats[15].midiPitch = 61; }, 'beats[15]'],
            ['wrong string index', (f) => { f.beats[0].stringIndex = 4; }, 'beats[0]'],
            ['15 beats', (f) => { f.beats.pop(); }, 'beat count'],
            // The two tick families must not be conflated: swapping them on beat 5 is detected.
            ['bar-relative and score-relative ticks swapped on beat 5', (f) => {
                const bar = f.beats[5].barRelativeStart;
                f.beats[5].barRelativeStart = f.beats[5].scoreRelativeStart;
                f.beats[5].scoreRelativeStart = bar;
            }, 'beats[5]'],
        ];
        for (const [label, mutate, expectedPart] of perturbations) {
            const sample = cloneExpectedAsFingerprint();
            mutate(sample);
            const mismatches = compareScoreFingerprint(sample, EXPECTED_MODEL);
            expect(mismatches.length, `perturbation "${label}" must be detected`).toBeGreaterThan(0);
            expect(mismatches.join('\n'), `perturbation "${label}" names its field`).toContain(expectedPart);
        }

        // Independent structure: tick families are distinct and consistent.
        expect(EXPECTED_MODEL.totalTicks).toBe(15360);
        expect(EXPECTED_MODEL.beats).toHaveLength(16);
        expect(EXPECTED_MODEL.masterBars.map((b) => b.scoreRelativeStart)).toEqual(GENERATED_MIDI_REFERENCE.masterBarStarts);
        expect(EXPECTED_MODEL.beats[5].barRelativeStart).toBe(960);
        expect(EXPECTED_MODEL.beats[5].scoreRelativeStart).toBe(4800);
        for (const beat of EXPECTED_MODEL.beats) {
            expect(beat.scoreRelativeStart).toBe(beat.barIndex * 3840 + beat.barRelativeStart);
            expect(beat.midiPitch).toBe(45 + (beat.fret as number));
        }
        expect(CURSOR_ELEMENT_ID).toEqual({ cursor2: 'maestro-cursor-v2', cursor3: 'maestro-cursor-v3' });

        // R4 sampling contract (documented, not derived from runtime results): 0.01 CSS px, five unchanged comparisons.
        expect(1 / R4_RECT_SCALE).toBe(0.01);
        expect(R4_STABLE_COMPARISONS).toBe(5);
        // Deliberate-404 absence observation contract: five consecutive unchanged frame-to-frame comparisons.
        expect(ABSENCE_STABLE_COMPARISONS).toBe(5);

        // Deadline accounting: budgets never exceed what remains, and an exhausted deadline throws.
        expect(TEST_TIMEOUT_MS).toBeGreaterThan(OVERALL_DEADLINE_MS);
        expect(NAVIGATION_BUDGET_MS).toBeLessThan(60_000);
        const live = createDeadline(60_000);
        expect(live.budget('stage', 10)).toBe(10);
        expect(live.budget('stage', 1_000_000)).toBeLessThanOrEqual(60_000);
        expect(() => createDeadline(0).budget('stage', 10)).toThrow(/exhausted/);

        // Error partition: with no allowance every message is unrelated; with the classified-404 allowance only that failure is tolerated.
        expect(unrelatedMessages([], null)).toEqual([]);
        expect(unrelatedMessages(['Uncaught TypeError: x'], null)).toEqual(['Uncaught TypeError: x']);
        expect(unrelatedMessages(['Uncaught (in promise) Error: loadGuitarProFile: HTTP 404'], CLASSIFIED_404_PATTERN)).toEqual([]);
        expect(unrelatedMessages(['Uncaught TypeError: x', 'Error: loadGuitarProFile: HTTP 404'], CLASSIFIED_404_PATTERN)).toEqual(['Uncaught TypeError: x']);
        expect(unrelatedMessages(['Error: loadGuitarProFile: HTTP 500'], CLASSIFIED_404_PATTERN)).toEqual(['Error: loadGuitarProFile: HTTP 500']);

        // Endpoint evidence (pure endpointViolations): a clean endpoint has no violations; an unexpected request, an unrelated
        // page error or an unrelated fatal console error each produces one.
        const clean = collectEndpointEvidence(new TransportLedger(), { pageErrors: [], fatalConsole: [] }, null);
        expect(endpointViolations(clean), 'clean endpoint').toEqual([]);
        const withUnexpected = new TransportLedger();
        withUnexpected.addUnexpected({ method: 'GET', pathname: '/x', reason: 'external-origin', hostClass: 'other' });
        expect(endpointViolations(collectEndpointEvidence(withUnexpected, { pageErrors: [], fatalConsole: [] }, null)), 'unexpected request').toHaveLength(1);
        expect(endpointViolations(collectEndpointEvidence(new TransportLedger(), { pageErrors: ['boom'], fatalConsole: [] }, null)), 'page error').toHaveLength(1);
        expect(endpointViolations(collectEndpointEvidence(new TransportLedger(), { pageErrors: [], fatalConsole: ['Uncaught x'] }, null)), 'fatal console').toHaveLength(1);
        const allowedOnly = collectEndpointEvidence(
            new TransportLedger(),
            { pageErrors: ['Error: loadGuitarProFile: HTTP 404'], fatalConsole: ['Uncaught (in promise) Error: loadGuitarProFile: HTTP 404'] },
            CLASSIFIED_404_PATTERN,
        );
        expect(allowedOnly.allowedPageErrorCount).toBe(1);
        expect(allowedOnly.allowedFatalConsoleCount).toBe(1);
        expect(endpointViolations(allowedOnly), 'the classified failure alone is tolerated').toEqual([]);
        const unrelatedAlongside = collectEndpointEvidence(
            new TransportLedger(),
            { pageErrors: ['Error: loadGuitarProFile: HTTP 404', 'ReferenceError: y'], fatalConsole: [] },
            CLASSIFIED_404_PATTERN,
        );
        expect(endpointViolations(unrelatedAlongside), 'an unrelated error alongside the classified failure still fails').toHaveLength(1);
    });

    test('acceptance: plain /synth-player resolves to cursor3 (MaestroCursorV3)', async ({ context, page }, testInfo) => {
        await runAcceptanceCase(context, page, testInfo, { query: '', expectedEngine: 'cursor3' });
    });

    test('acceptance: ?cursorEngine=cursor3 resolves to cursor3 (MaestroCursorV3)', async ({ context, page }, testInfo) => {
        // The default is also cursor3, so this case alone cannot distinguish a honoured query from the default;
        // the cursor2 case and the invalid-value control below carry that proof.
        await runAcceptanceCase(context, page, testInfo, { query: 'cursorEngine=cursor3', expectedEngine: 'cursor3' });
    });

    test('acceptance: ?cursorEngine=cursor2 resolves to cursor2 (MaestroCursorV2)', async ({ context, page }, testInfo) => {
        await runAcceptanceCase(context, page, testInfo, { query: 'cursorEngine=cursor2', expectedEngine: 'cursor2' });
    });

    test('negative control: invalid ?cursorEngine=CURSOR2 fails safe to cursor3', async ({ context, page }, testInfo) => {
        await runAcceptanceCase(context, page, testInfo, { query: 'cursorEngine=CURSOR2', expectedEngine: 'cursor3' });
    });

    test('negative control: deliberate fixture 404 yields a classified loading failure and no cursor', async ({ context, page }, testInfo) => {
        await runFixture404Control(context, page, testInfo);
    });
});
