/**
 * Maestro.ai — E2E fixture backend transport (test-side simulated catalogue, URL resolution, fixture bytes, fonts)
 * Version: V1.0.1
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-FIXTURE-001
 *
 * FIXTURE PROVENANCE AND STRUCTURE
 *   tests/e2e/fixtures/maestro-e2e-fixture-001.alphatex is ORIGINAL notation authored by Claude Code for Brett
 *   in this ticket. It is not derived from, and contains no content of, any existing song, score, tab or
 *   third-party material. Its musical structure, verified in Node against the installed AlphaTab 1.8.1
 *   importer (Phase B1; browser behaviour is NOT RUN):
 *     - title "Maestro E2E Fixture 001", artist "Maestro QA"; one track "Maestro E2E Guitar", one staff,
 *       General MIDI program 25, standard tuning E4 B3 G3 D3 A2 E2
 *     - 96 BPM; four bars, each 4/4; four quarter notes per bar, sixteen beats in total
 *     - beat i (0..15) is the A string at fret i, i.e. MIDI pitch 45 + i
 *     - no repeats, tempo changes, ties, effects or lyrics
 *     - AlphaTab uses 960 ticks per quarter note, so a 4/4 bar is 3840 ticks and the score is 15360 ticks.
 *       Three tick families are kept apart throughout these helpers: bar-relative (beat.playbackStart),
 *       score-relative (masterBar.start / beat.absolutePlaybackStart) and generated MIDI / tick-lookup ticks.
 *
 * TRANSPORT CONTRACT (test-side routing; nothing here is product code)
 *   /synth-player normally gets its score through Supabase (a catalogue query, then storage signed URLs) and
 *   then fetches the signed URL. This module simulates exactly those HTTP responses at the Playwright network
 *   layer, so the REAL page, resolver, renderer, AlphaTab and cursor code run unchanged beneath it. It
 *   fabricates no authentication state, session, credential or access token, and it contacts no real Supabase
 *   resource: every backend-shaped request is either answered by a simulated response or aborted and recorded.
 *   It does NOT establish real Supabase, storage or auth integration.
 *
 *   One context-level route (installed before navigation) dispatches every request through the pure
 *   classifyRequest() below, so the matching contract is a single reviewable function:
 *     - simulated backend responses are matched on exact METHOD and exact PATHNAME and are HOST-AGNOSTIC:
 *       the same pathname on a different host would also be answered by the simulation. This module does not
 *       claim to reject a different backend host.
 *     - any other pathname under a Supabase service prefix is aborted and recorded as unexpected.
 *     - font responses are restricted to https://cdn.jsdelivr.net; the YouTube iframe API block is restricted
 *       to https://www.youtube.com/iframe_api. Known blocked requests are recorded separately from unexpected.
 *     - only same-origin requests to the project's baseURL origin are continued; everything else is aborted.
 *   Handlers never read, log or store request headers or bodies. The single exception is the batch-sign
 *   request, whose JSON body is parsed solely to compare its `paths` field with the fixture path.
 *
 * REPOSITORY ROOT (V1.0.1)
 *   Playwright's config.rootDir is the config's testDir (tests/e2e under this repository's config), NOT the
 *   repository root. resolveRepoRoot() therefore derives the root only from the directory containing the absolute
 *   config.configFile, and accepts that directory only if it contains both playwright.config.ts and package.json.
 *   It never uses config.rootDir, the working directory or a hard-coded path. Every fixture and installed-font path
 *   is resolved from that root by describeResolvedPaths() and checked for existence before it is read.
 *
 * REMAINING EXTERNAL DEPENDENCIES (not interceptable here): the dev server's own compile-time next/font/google
 *   fetch, the dev server itself, same-origin soundfont/worklet assets, OS text fonts, and Web Audio support in
 *   headless Chromium. Browser behaviour of all of this is NOT RUN.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext, Page, Request, Route } from '@playwright/test';

// ── Accepted fixture pin ────────────────────────────────────────────────────────────────────────────

export const FIXTURE_RELATIVE_PATH = 'tests/e2e/fixtures/maestro-e2e-fixture-001.alphatex';
export const FIXTURE_FILE_NAME = 'maestro-e2e-fixture-001';
export const FIXTURE_FILE_EXTENSION = 'alphatex';
/** Storage path the page builds from the catalogue row: `${file_name}.${file_extension}` (page.tsx). */
export const FIXTURE_STORAGE_PATH = `${FIXTURE_FILE_NAME}.${FIXTURE_FILE_EXTENSION}`;
export const FIXTURE_BYTE_LENGTH = 224;
export const FIXTURE_SHA256 = '7d3708d1bf17e3dd12a7fd53b6cd2af0ac1d2e862a2615702aaba5a04208e5ca';

/** Placeholder id for the simulated catalogue row. No reader on the song path validates UUID shape. */
export const FIXTURE_ROW_ID = '00000000-0000-4000-8000-0000000e2e01';

/** The one simulated `tabs` row; field set is what queries.ts fetchSongs() maps. */
export const FIXTURE_ROW = {
    id: FIXTURE_ROW_ID,
    title: 'Maestro E2E Fixture 001',
    artist: 'Maestro QA',
    album: null,
    difficulty: null,
    instrument: null,
    tuning: null,
    genre: null,
    tempo: null,
    file_name: FIXTURE_FILE_NAME,
    file_extension: FIXTURE_FILE_EXTENSION,
    file_path: null,
    thumbnail_url: null,
    thumbnail_path: null,
    status: 'published',
    updated_at: null,
    youtube_video_id: null,
    video_start_offset: null,
};

// ── Exact paths (backend matching is host-agnostic; see header) ──────────────────────────────────────

export const PATH_CATALOGUE_TABS = '/rest/v1/tabs';
export const PATH_CATALOGUE_YOUTUBE = '/rest/v1/tab_youtube';
export const PATH_SIGN_BATCH = '/storage/v1/object/sign/tabs';
/** POST resolves one signed URL; GET of the same pathname downloads the fixture bytes. */
export const PATH_SIGN_SINGLE_AND_FIXTURE = `/storage/v1/object/sign/tabs/${FIXTURE_STORAGE_PATH}`;
/** storage-js prepends its own /storage/v1 base to this relative value to build the signed URL. */
export const SIGNED_URL_RELATIVE = `/object/sign/tabs/${FIXTURE_STORAGE_PATH}`;
export const BACKEND_PATH_PREFIXES = ['/rest/v1/', '/auth/v1/', '/storage/v1/', '/realtime/v1/', '/functions/v1/'] as const;

// ── Fonts and YouTube (origin-restricted) ───────────────────────────────────────────────────────────

export const FONT_ORIGIN = 'https://cdn.jsdelivr.net';
export const FONT_PATH_PREFIX = '/npm/@coderline/alphatab@latest/dist/font/';
export const YOUTUBE_ORIGIN = 'https://www.youtube.com';
export const YOUTUBE_IFRAME_API_PATH = '/iframe_api';

/** The font pins below describe the AlphaTab version in node_modules; a version change must be a deliberate edit. */
export const INSTALLED_ALPHATAB_VERSION = '1.8.1';
const ALPHATAB_PACKAGE_JSON = 'node_modules/@coderline/alphatab/package.json';
const INSTALLED_FONT_DIRECTORY = 'node_modules/@coderline/alphatab/dist/font';

export interface FontPin {
    contentType: string;
    byteLength: number;
    sha256: string;
}

/** Installed AlphaTab 1.8.1 font files the page can request (woff2 first; woff and otf are later fallbacks in the same src list). */
export const FONT_PINS: Readonly<Record<string, FontPin>> = {
    'Bravura.woff2': {
        contentType: 'font/woff2',
        byteLength: 313348,
        sha256: '181e0e7c4889f9ad57dde0a11988fa61b941617aa499ecdb9dfd4713896c2b19',
    },
    'Bravura.woff': {
        contentType: 'font/woff',
        byteLength: 550388,
        sha256: '22a46a8480b8eecaa43ece95ec63b45599c8ef6d1ab24f0621834a8be01d4dd9',
    },
    'Bravura.otf': {
        contentType: 'font/otf',
        byteLength: 507976,
        sha256: '883a86a8cfe77db6597b8ef56b9cf6efb079b0631a283a323945a41f976fb483',
    },
};

// ── Repository root and resolved paths ──────────────────────────────────────────────────────────────

/** Files whose joint presence identifies the repository root (checked in the directory containing the config file). */
export const REPO_ROOT_MARKER_FILES = ['playwright.config.ts', 'package.json'] as const;

export interface RepoRootConfig {
    /** Playwright's FullConfig.configFile: optional in its typings, an absolute path when set. */
    readonly configFile?: string | null;
}

function isExistingFile(absolutePath: string): boolean {
    try {
        return fs.statSync(absolutePath).isFile();
    } catch {
        return false;
    }
}

function requireExistingFile(absolutePath: string, what: string): void {
    if (!isExistingFile(absolutePath)) {
        throw new Error(`${what} does not exist as a file at ${absolutePath}.`);
    }
}

/**
 * The ONE resolver for the repository root, shared by every call site. The root is the directory containing
 * config.configFile, which must be present and absolute, and that directory is accepted only if it contains every
 * REPO_ROOT_MARKER_FILES entry. It never uses config.rootDir (Playwright sets that to the testDir, tests/e2e under
 * this repository's config), the working directory, or a hard-coded path. Throws a clear error otherwise.
 */
export function resolveRepoRoot(config: RepoRootConfig): string {
    const configFile = config.configFile;
    if (configFile === undefined || configFile === null || configFile === '') {
        throw new Error(
            'Playwright config.configFile is not set, so the repository root cannot be derived. ' +
                'config.rootDir is not used: Playwright sets it to the testDir, not the repository root.',
        );
    }
    if (!path.isAbsolute(configFile)) {
        throw new Error(`Playwright config.configFile "${configFile}" is not an absolute path, so the repository root cannot be derived safely.`);
    }
    const candidate = path.dirname(configFile);
    const missing = REPO_ROOT_MARKER_FILES.filter((marker) => !isExistingFile(path.join(candidate, marker)));
    if (missing.length > 0) {
        throw new Error(
            `The directory containing config.configFile (${candidate}) does not contain ${missing.join(' and ')}, ` +
                `so it is not accepted as the repository root (it must contain ${REPO_ROOT_MARKER_FILES.join(' and ')}).`,
        );
    }
    return candidate;
}

export interface ResolvedPaths {
    repoRoot: string;
    fixture: string;
    alphatabPackageJson: string;
    fonts: Record<string, string>;
}

/** Absolute paths the loaders read, all derived from `repoRoot`. Existence is checked where each file is read. */
export function describeResolvedPaths(repoRoot: string): ResolvedPaths {
    const fonts: Record<string, string> = {};
    for (const file of Object.keys(FONT_PINS)) {
        fonts[file] = path.join(repoRoot, INSTALLED_FONT_DIRECTORY, file);
    }
    return {
        repoRoot,
        fixture: path.join(repoRoot, FIXTURE_RELATIVE_PATH),
        alphatabPackageJson: path.join(repoRoot, ALPHATAB_PACKAGE_JSON),
        fonts,
    };
}

// ── Pinned byte loaders ─────────────────────────────────────────────────────────────────────────────

export function sha256Hex(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export interface FixtureVerification {
    ok: boolean;
    byteLength: number;
    sha256: string;
}

export function verifyFixtureBytes(bytes: Buffer): FixtureVerification {
    const sha256 = sha256Hex(bytes);
    return {
        ok: bytes.length === FIXTURE_BYTE_LENGTH && sha256 === FIXTURE_SHA256,
        byteLength: bytes.length,
        sha256,
    };
}

export interface PinnedFixture {
    bytes: Buffer;
    byteLength: number;
    sha256: string;
}

/** Reads the accepted fixture (repoRoot from resolveRepoRoot) and throws unless it exists and its size and SHA-256 equal the pin. */
export function loadPinnedFixture(repoRoot: string): PinnedFixture {
    const fixturePath = describeResolvedPaths(repoRoot).fixture;
    requireExistingFile(fixturePath, 'The accepted fixture');
    const bytes = fs.readFileSync(fixturePath);
    const verification = verifyFixtureBytes(bytes);
    if (!verification.ok) {
        throw new Error(
            `Fixture ${FIXTURE_RELATIVE_PATH} does not match its pin: expected ${FIXTURE_BYTE_LENGTH} bytes / sha256 ${FIXTURE_SHA256}, ` +
                `found ${verification.byteLength} bytes / sha256 ${verification.sha256}.`,
        );
    }
    return { bytes, byteLength: verification.byteLength, sha256: verification.sha256 };
}

export interface PinnedFont {
    file: string;
    contentType: string;
    bytes: Buffer;
    byteLength: number;
    sha256: string;
}

/**
 * Reads the installed AlphaTab fonts (repoRoot from resolveRepoRoot) and throws unless every resolved path exists, the
 * package version matches and every size/SHA-256 equals the pins.
 */
export function loadPinnedFonts(repoRoot: string): Record<string, PinnedFont> {
    const resolved = describeResolvedPaths(repoRoot);
    requireExistingFile(resolved.alphatabPackageJson, 'The installed @coderline/alphatab package.json');
    const pkg = JSON.parse(fs.readFileSync(resolved.alphatabPackageJson, 'utf8')) as { version?: unknown };
    if (pkg.version !== INSTALLED_ALPHATAB_VERSION) {
        throw new Error(
            `Installed @coderline/alphatab is ${String(pkg.version)}, but the font pins in fixtureBackend.ts are for ${INSTALLED_ALPHATAB_VERSION}. ` +
                'Update FONT_PINS deliberately before running.',
        );
    }
    const fonts: Record<string, PinnedFont> = {};
    for (const file of Object.keys(FONT_PINS)) {
        const pin = FONT_PINS[file];
        const fontPath = resolved.fonts[file];
        requireExistingFile(fontPath, `The installed AlphaTab font ${file}`);
        const bytes = fs.readFileSync(fontPath);
        const sha256 = sha256Hex(bytes);
        if (bytes.length !== pin.byteLength || sha256 !== pin.sha256) {
            throw new Error(
                `Installed font ${file} does not match its pin: expected ${pin.byteLength} bytes / sha256 ${pin.sha256}, ` +
                    `found ${bytes.length} bytes / sha256 ${sha256}.`,
            );
        }
        fonts[file] = { file, contentType: pin.contentType, bytes, byteLength: bytes.length, sha256 };
    }
    return fonts;
}

// ── Simulated response bodies (pure) ────────────────────────────────────────────────────────────────

export function buildCatalogueTabsBody(): string {
    return JSON.stringify([FIXTURE_ROW]);
}

export function buildCatalogueYoutubeBody(): string {
    return JSON.stringify([]);
}

/** storage-js createSignedUrls response shape; the signed URL carries no query string and no token. */
export function buildSignBatchBody(): string {
    return JSON.stringify([{ error: null, path: FIXTURE_STORAGE_PATH, signedURL: SIGNED_URL_RELATIVE }]);
}

/** storage-js createSignedUrl response shape. */
export function buildSignSingleBody(): string {
    return JSON.stringify({ signedURL: SIGNED_URL_RELATIVE });
}

export function buildFixtureNotFoundBody(): string {
    return JSON.stringify({ error: 'not_found', message: 'Object not found' });
}

/**
 * Compares ONLY the `paths` field of a batch-sign request body with the sole fixture path. The body is parsed but
 * never logged, and no other field (or any header) is inspected.
 */
export function signBatchPathsMatch(rawBody: string | null): boolean {
    if (rawBody === null) return false;
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawBody);
    } catch {
        return false;
    }
    if (typeof parsed !== 'object' || parsed === null) return false;
    const paths = (parsed as { paths?: unknown }).paths;
    return Array.isArray(paths) && paths.length === 1 && paths[0] === FIXTURE_STORAGE_PATH;
}

// ── Request classification (pure; this IS the matching contract) ────────────────────────────────────

export type HostClass = 'dev-origin' | 'cdn.jsdelivr.net' | 'www.youtube.com' | 'other';

export type UnexpectedReason =
    | 'backend-path-not-simulated'
    | 'external-origin'
    | 'font-origin-other-request'
    | 'youtube-origin-other-request'
    | 'non-http-scheme';

export type RequestClass =
    | { kind: 'catalogue-tabs' }
    | { kind: 'catalogue-youtube' }
    | { kind: 'sign-batch' }
    | { kind: 'sign-single' }
    | { kind: 'fixture-bytes' }
    | { kind: 'font'; file: string }
    | { kind: 'youtube-iframe-api' }
    | { kind: 'same-origin-continue' }
    | { kind: 'unexpected'; reason: UnexpectedReason; hostClass: HostClass };

function hostClassOf(url: URL, devOrigin: string): HostClass {
    if (url.origin === devOrigin) return 'dev-origin';
    if (url.hostname === 'cdn.jsdelivr.net') return 'cdn.jsdelivr.net';
    if (url.hostname === 'www.youtube.com') return 'www.youtube.com';
    return 'other';
}

/**
 * Classification order (first match wins):
 *   1. non-http(s) scheme                      -> unexpected
 *   2. origin https://www.youtube.com          -> GET /iframe_api is the known block; anything else unexpected
 *   3. origin https://cdn.jsdelivr.net         -> GET of a pinned font file under FONT_PATH_PREFIX; anything else unexpected
 *   4. exact METHOD + exact PATHNAME, ANY host -> the simulated catalogue / URL-resolution / fixture-bytes responses
 *   5. pathname under a Supabase service prefix-> unexpected (not simulated)
 *   6. origin equals devOrigin                 -> continue to the dev server
 *   7. everything else                         -> unexpected (external origin)
 * Step 4 is host-agnostic on purpose: a different host serving the same method+pathname would also be answered.
 */
export function classifyRequest(method: string, url: URL, devOrigin: string): RequestClass {
    const hostClass = hostClassOf(url, devOrigin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { kind: 'unexpected', reason: 'non-http-scheme', hostClass };
    }
    const m = method.toUpperCase();

    if (url.origin === YOUTUBE_ORIGIN) {
        return m === 'GET' && url.pathname === YOUTUBE_IFRAME_API_PATH
            ? { kind: 'youtube-iframe-api' }
            : { kind: 'unexpected', reason: 'youtube-origin-other-request', hostClass };
    }

    if (url.origin === FONT_ORIGIN) {
        if (m === 'GET' && url.pathname.startsWith(FONT_PATH_PREFIX)) {
            const file = url.pathname.slice(FONT_PATH_PREFIX.length);
            if (Object.prototype.hasOwnProperty.call(FONT_PINS, file)) return { kind: 'font', file };
        }
        return { kind: 'unexpected', reason: 'font-origin-other-request', hostClass };
    }

    if (m === 'GET' && url.pathname === PATH_CATALOGUE_TABS) return { kind: 'catalogue-tabs' };
    if (m === 'GET' && url.pathname === PATH_CATALOGUE_YOUTUBE) return { kind: 'catalogue-youtube' };
    if (m === 'POST' && url.pathname === PATH_SIGN_BATCH) return { kind: 'sign-batch' };
    if (m === 'POST' && url.pathname === PATH_SIGN_SINGLE_AND_FIXTURE) return { kind: 'sign-single' };
    if (m === 'GET' && url.pathname === PATH_SIGN_SINGLE_AND_FIXTURE) return { kind: 'fixture-bytes' };

    if (BACKEND_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
        return { kind: 'unexpected', reason: 'backend-path-not-simulated', hostClass };
    }

    if (url.origin === devOrigin) return { kind: 'same-origin-continue' };
    return { kind: 'unexpected', reason: 'external-origin', hostClass };
}

// ── Ledger ──────────────────────────────────────────────────────────────────────────────────────────

export interface UnexpectedRecord {
    method: string;
    /** Pathname only: query strings and headers are never recorded (a real signed URL carries a token). */
    pathname: string;
    reason: UnexpectedReason | 'sign-batch-paths-mismatch' | 'handler-error';
    hostClass: HostClass;
}

export interface KnownBlockedRecord {
    method: string;
    pathname: string;
    what: 'youtube-iframe-api';
}

export interface LedgerCounts {
    catalogueTabs: number;
    catalogueYoutube: number;
    signBatch: number;
    signBatchPathsOk: number;
    signSingle: number;
    fixtureServed: number;
    fixtureNotFound: number;
    sameOriginContinued: number;
    fonts: Record<string, number>;
}

export interface LedgerSnapshot {
    counts: LedgerCounts;
    /** SHA-256 of the bytes actually handed to route.fulfill, one entry per served fixture response. */
    servedFixtureSha256: string[];
    knownBlocked: KnownBlockedRecord[];
    unexpected: UnexpectedRecord[];
}

export function describeUnexpected(records: readonly UnexpectedRecord[]): string {
    return records.map((r) => `${r.method} ${r.pathname} [${r.reason}; ${r.hostClass}]`).join(', ');
}

type CountKey = Exclude<keyof LedgerCounts, 'fonts'>;

/** Records what the transport answered, blocked or aborted. Event-driven waits replace polling intervals. */
export class TransportLedger {
    private counts: LedgerCounts = {
        catalogueTabs: 0,
        catalogueYoutube: 0,
        signBatch: 0,
        signBatchPathsOk: 0,
        signSingle: 0,
        fixtureServed: 0,
        fixtureNotFound: 0,
        sameOriginContinued: 0,
        fonts: {},
    };
    private servedFixtureSha256: string[] = [];
    private knownBlocked: KnownBlockedRecord[] = [];
    private unexpected: UnexpectedRecord[] = [];
    private listeners: Array<() => void> = [];

    snapshot(): LedgerSnapshot {
        return JSON.parse(
            JSON.stringify({
                counts: this.counts,
                servedFixtureSha256: this.servedFixtureSha256,
                knownBlocked: this.knownBlocked,
                unexpected: this.unexpected,
            }),
        ) as LedgerSnapshot;
    }

    bump(key: CountKey): void {
        this.counts[key] += 1;
        this.notify();
    }

    bumpFont(file: string): void {
        this.counts.fonts[file] = (this.counts.fonts[file] || 0) + 1;
        this.notify();
    }

    addServedFixtureSha256(digest: string): void {
        this.servedFixtureSha256.push(digest);
        this.notify();
    }

    addKnownBlocked(record: KnownBlockedRecord): void {
        this.knownBlocked.push(record);
        this.notify();
    }

    addUnexpected(record: UnexpectedRecord): void {
        this.unexpected.push(record);
        this.notify();
    }

    /**
     * Resolves when `predicate` holds for the ledger. Rejects immediately if ANY unexpected request has been
     * recorded (an unexpected request is never allowed to be waited out), or when `timeoutMs` elapses. The only
     * timer is the timeout bound; there is no polling interval and no fixed sleep.
     */
    waitFor(predicate: (snapshot: LedgerSnapshot) => boolean, timeoutMs: number, label: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const evaluate = (): 'ready' | 'unexpected' | 'pending' => {
                const snap = this.snapshot();
                if (snap.unexpected.length > 0) return 'unexpected';
                return predicate(snap) ? 'ready' : 'pending';
            };
            const rejectUnexpected = (): void =>
                reject(new Error(`${label}: unexpected request(s) recorded: ${describeUnexpected(this.snapshot().unexpected)}`));

            const first = evaluate();
            if (first === 'ready') {
                resolve();
                return;
            }
            if (first === 'unexpected') {
                rejectUnexpected();
                return;
            }
            const timer = setTimeout(() => {
                this.detach(listener);
                reject(new Error(`${label}: not satisfied within ${timeoutMs}ms; ledger=${JSON.stringify(this.snapshot())}`));
            }, timeoutMs);
            const listener = (): void => {
                const state = evaluate();
                if (state === 'pending') return;
                clearTimeout(timer);
                this.detach(listener);
                if (state === 'ready') resolve();
                else rejectUnexpected();
            };
            this.listeners.push(listener);
        });
    }

    private detach(listener: () => void): void {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    private notify(): void {
        for (const listener of this.listeners.slice()) listener();
    }
}

// ── Router ──────────────────────────────────────────────────────────────────────────────────────────

export type FixtureMode = 'serve' | 'not-found';

export interface TransportOptions {
    /** Origin of the project's baseURL (the dev server). Only this origin is ever continued to the network. */
    devOrigin: string;
    /**
     * Absolute repository root as returned by resolveRepoRoot(): the directory containing config.configFile, which
     * holds playwright.config.ts and package.json. It is NOT config.rootDir, which Playwright sets to the testDir
     * (tests/e2e). Used to read the pinned fixture and the installed AlphaTab fonts.
     */
    repoRoot: string;
    /** 'not-found' makes the fixture-bytes response a deliberate 404 for the negative control. */
    fixtureMode: FixtureMode;
}

const CORS_HEADERS: Record<string, string> = { 'access-control-allow-origin': '*' };

interface Router {
    devOrigin: string;
    fixtureMode: FixtureMode;
    fixture: PinnedFixture;
    fonts: Record<string, PinnedFont>;
    ledger: TransportLedger;
}

async function fulfillJson(route: Route, body: string): Promise<void> {
    await route.fulfill({ status: 200, contentType: 'application/json', headers: CORS_HEADERS, body });
}

async function abortRequest(route: Route): Promise<void> {
    await route.abort('blockedbyclient').catch(() => undefined);
}

async function dispatch(route: Route, request: Request, url: URL, cls: RequestClass, router: Router): Promise<void> {
    const method = request.method();
    const ledger = router.ledger;
    switch (cls.kind) {
        case 'catalogue-tabs':
            ledger.bump('catalogueTabs');
            await fulfillJson(route, buildCatalogueTabsBody());
            return;
        case 'catalogue-youtube':
            ledger.bump('catalogueYoutube');
            await fulfillJson(route, buildCatalogueYoutubeBody());
            return;
        case 'sign-batch': {
            ledger.bump('signBatch');
            if (!signBatchPathsMatch(request.postData())) {
                ledger.addUnexpected({
                    method,
                    pathname: url.pathname,
                    reason: 'sign-batch-paths-mismatch',
                    hostClass: hostClassOf(url, router.devOrigin),
                });
                await abortRequest(route);
                return;
            }
            ledger.bump('signBatchPathsOk');
            await fulfillJson(route, buildSignBatchBody());
            return;
        }
        case 'sign-single':
            ledger.bump('signSingle');
            await fulfillJson(route, buildSignSingleBody());
            return;
        case 'fixture-bytes':
            if (router.fixtureMode === 'not-found') {
                ledger.bump('fixtureNotFound');
                await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    headers: CORS_HEADERS,
                    body: buildFixtureNotFoundBody(),
                });
                return;
            }
            ledger.addServedFixtureSha256(sha256Hex(router.fixture.bytes));
            ledger.bump('fixtureServed');
            await route.fulfill({
                status: 200,
                contentType: 'application/octet-stream',
                headers: CORS_HEADERS,
                body: router.fixture.bytes,
            });
            return;
        case 'font': {
            const font = router.fonts[cls.file];
            ledger.bumpFont(cls.file);
            await route.fulfill({ status: 200, contentType: font.contentType, headers: CORS_HEADERS, body: font.bytes });
            return;
        }
        case 'youtube-iframe-api':
            ledger.addKnownBlocked({ method, pathname: url.pathname, what: 'youtube-iframe-api' });
            await abortRequest(route);
            return;
        case 'same-origin-continue':
            ledger.bump('sameOriginContinued');
            await route.continue();
            return;
        case 'unexpected':
            ledger.addUnexpected({ method, pathname: url.pathname, reason: cls.reason, hostClass: cls.hostClass });
            await abortRequest(route);
            return;
    }
}

/**
 * Installs the single context-level dispatcher route. Call it, and await it, BEFORE the first navigation.
 * Returns the ledger the spec asserts against.
 */
export async function installFixtureTransport(context: BrowserContext, options: TransportOptions): Promise<TransportLedger> {
    const fixture = loadPinnedFixture(options.repoRoot);
    const fonts = loadPinnedFonts(options.repoRoot);
    const ledger = new TransportLedger();
    const router: Router = { devOrigin: options.devOrigin, fixtureMode: options.fixtureMode, fixture, fonts, ledger };

    await context.route(
        () => true,
        async (route, request) => {
            let url: URL;
            try {
                url = new URL(request.url());
            } catch {
                ledger.addUnexpected({ method: request.method(), pathname: '(unparseable url)', reason: 'external-origin', hostClass: 'other' });
                await abortRequest(route);
                return;
            }
            try {
                await dispatch(route, request, url, classifyRequest(request.method(), url, options.devOrigin), router);
            } catch {
                ledger.addUnexpected({
                    method: request.method(),
                    pathname: url.pathname,
                    reason: 'handler-error',
                    hostClass: hostClassOf(url, options.devOrigin),
                });
                await abortRequest(route);
            }
        },
    );
    return ledger;
}

// ── Fresh-context observation (observation-only init script) ───────────────────────────────────────

export interface DocStartObservation {
    /** location.search at document start. */
    search: string;
    /** localStorage 'maestro_cursor_engine' at document start, before any application code. */
    engineKey: string | null;
    engineKeyReadError: boolean;
    /** Whether the product globals already existed at document start (they must not). */
    hasEngineGlobal: boolean;
    hasCursorGlobal: boolean;
    /** True if a #maestro-cursor-v2/-v3 element was ever inserted into the document (MutationObserver). */
    cursorElementEverSeen: boolean;
}

/**
 * Registers an init script that only OBSERVES: it records the engine storage key, the query string and the product
 * globals at document start into a test-owned variable (`__e2eDocStart`), and watches for cursor elements. It
 * writes nothing the product reads, seeds no storage and injects no product-owned global.
 */
export async function installDocStartObserver(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
        if (window.top !== window) return;
        const w = window as unknown as Record<string, unknown>;
        let engineKey: string | null = null;
        let engineKeyReadError = false;
        try {
            engineKey = window.localStorage.getItem('maestro_cursor_engine');
        } catch {
            engineKeyReadError = true;
        }
        const observation: DocStartObservation = {
            search: window.location.search,
            engineKey,
            engineKeyReadError,
            hasEngineGlobal: '__maestroCursorEngine' in w,
            hasCursorGlobal: '__maestroCursor' in w,
            cursorElementEverSeen: false,
        };
        w['__e2eDocStart'] = observation;

        const isCursorNode = (node: Node): boolean => {
            if (!(node instanceof Element)) return false;
            if (node.id === 'maestro-cursor-v2' || node.id === 'maestro-cursor-v3') return true;
            return node.querySelector('#maestro-cursor-v2, #maestro-cursor-v3') !== null;
        };
        const observer = new MutationObserver((records) => {
            for (const record of records) {
                for (const added of Array.from(record.addedNodes)) {
                    if (isCursorNode(added)) observation.cursorElementEverSeen = true;
                }
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    });
}

export async function readDocStartObservation(page: Page): Promise<DocStartObservation | null> {
    return page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        const value = w['__e2eDocStart'];
        return value === undefined ? null : (value as DocStartObservation);
    });
}

export interface EngineKeyReading {
    value: string | null;
    readError: boolean;
}

/** Reads ONLY the engine storage key now (after load). No other storage key is read or required to be empty. */
export async function readEngineKeyNow(page: Page): Promise<EngineKeyReading> {
    return page.evaluate((): EngineKeyReading => {
        try {
            return { value: window.localStorage.getItem('maestro_cursor_engine'), readError: false };
        } catch {
            return { value: null, readError: true };
        }
    });
}
