/**
 * Maestro.ai — E2E score readiness and cursor-engine stages (R0–R7)
 * Version: V1.0.1
 * Date: October 10, 2026
 * Ticket: MAESTRO-QA-PLAYWRIGHT-FIXTURE-001
 *
 * Staged, bounded readiness for /synth-player loaded with the bundled original fixture
 * (tests/e2e/fixtures/maestro-e2e-fixture-001.alphatex; provenance and musical structure are documented in
 * fixtureBackend.ts). Browser behaviour of everything below is NOT RUN at the time of writing.
 *
 * ACCEPTANCE GATES (R0–R6) AND A REPORT-ONLY STAGE (R7)
 *   R0 shell hydrated            existing waitForShellReady (html[data-theme] and main #maestro-player)
 *   R1 transport engaged         ledger: catalogue queries answered and URL resolution requested with the sole fixture path
 *   R2 API initialized and owned exactly one main #maestro-player .alphatab-container; window.__at is an AlphaTab API whose
 *                                container.element IS that container (the debug alias alone is never trusted)
 *   R3 fixture delivered, loaded the pinned fixture bytes were served, and api.score matches the independently written model
 *   R4 score rendered            completed bounds, four rendered bars, non-zero surface, and stable measured rects (below)
 *   R5 engine selected           window.__maestroCursorEngine is set and equals the expected engine
 *   R6 cursor instantiated/owned exactly one cursor element, with the expected id, a child of the SAME container,
 *                                and window.__maestroCursor.element is that element; identity unchanged for 5 frames
 *   R7 cursor visible            REPORT-ONLY (never fails): computed visibility/opacity, inline transform, rects
 *   Engine selection alone does not prove instantiation: R5 and R6 are separate gates.
 *
 * R4 GEOMETRY STABILITY (follows the principle of waitForGeometryStable in geometry.ts)
 *   geometry.ts's function is closed over its fixed shell target list (SHELL_TARGETS), so it cannot sample
 *   .alphatab-container or the AlphaTab surface without modifying that file. Its PRINCIPLE is reused here instead:
 *   each animation frame the container and the rendered surface DOMRect x, y, width and height are rounded to
 *   1/R4_RECT_SCALE = 0.01 CSS px and compared with the previous frame's rounded values for EXACT equality (no
 *   tolerance). R4_STABLE_COMPARISONS = 5 consecutive unchanged frame-to-frame comparisons are required (that is,
 *   six identical frames), the same count as GEOMETRY_STABLE_FRAMES. Precision and count are fixed by this
 *   documented contract, not derived from runtime results, and the 1 px viewport-containment tolerance of
 *   geometry.ts is deliberately NOT used. Any frame in which a readiness or identity check fails resets the count.
 *   The surface is the AlphaTab canvas element (api.canvasElement.element, div.at-surface). The surface type is
 *   source-backed: initAlphaTab.ts sets settings.core.engine = "svg", AlphaTab appends div.at-surface to
 *   api.container and its SVG engine emits <svg class="at-surface-svg">; the live api.settings.core.engine value is
 *   asserted rather than assumed.
 *
 * DELIBERATE-404 ABSENCE OBSERVATION (V1.0.1)
 *   After the confirmed fixture 404 and the product's classified loading error, observeLoadFailureAbsence() runs a
 *   bounded requestAnimationFrame observation. Every frame it requires the current owned API and container (the same
 *   ownership tie as R2, with unchanged identity from frame to frame), api.score null, zero cursor elements in the
 *   document, and the document-start observer's sticky cursor flag still false. ABSENCE_STABLE_COMPARISONS = 5
 *   consecutive unchanged frame-to-frame comparisons are required (six frames). Ownership loss or change, a score
 *   appearing, cursor insertion, a missing document-start observation or a true sticky flag is an immediate
 *   violation, not a retry. There is no fixed sleep; the wall-clock bound is STAGE_BUDGET_MS.absenceObservation,
 *   capped by the overall deadline. A pass means cursor absence THROUGH THE BOUNDED OBSERVATION ENDPOINT, not
 *   permanent absence.
 *
 * TICK FAMILIES (kept distinct)
 *   bar-relative    beat.playbackStart                       0, 960, 1920, 2880 inside every bar
 *   score-relative  masterBar.start / beat.absolutePlaybackStart   0 ... 14400 (bars start 0, 3840, 7680, 11520)
 *   generated MIDI  api.tickCache lookup ticks               OBSERVATION ONLY; never a gate
 *
 * TIMING
 *   One explicit overall deadline (OVERALL_DEADLINE_MS) bounds navigation and every stage; each stage waits
 *   min(its budget, remaining). Existing helper timeouts are accounted for: R0 uses SHELL_READY_TIMEOUT_MS, the
 *   navigation budget stays below the config's navigationTimeout, and the spec raises the per-test timeout to
 *   TEST_TIMEOUT_MS so the deadline (not the 90 s config default) governs. In-page waits are requestAnimationFrame
 *   loops bounded by a wall-clock timer; the Node-side ledger wait is event-driven. There are no fixed sleeps.
 *   In-page elapsed time (performance.now) and Node-side elapsed time (Date.now) are different clocks and are
 *   reported separately.
 */

import type { ConsoleMessage, Page } from '@playwright/test';
import { FIXTURE_SHA256, describeUnexpected, type TransportLedger } from './fixtureBackend';
import { SHELL_READY_TIMEOUT_MS, waitForShellReady } from './ready';

// ── Budgets and constants ───────────────────────────────────────────────────────────────────────────

export const OVERALL_DEADLINE_MS = 120_000;
/** Headroom above the deadline for fixture teardown and final assertions; replaces the 90 s config default for this spec. */
export const TEST_TIMEOUT_MS = 135_000;
/** Stays below the config's navigationTimeout (60 s). */
export const NAVIGATION_BUDGET_MS = 45_000;

export const STAGE_BUDGET_MS = {
    R0: SHELL_READY_TIMEOUT_MS,
    R1: 20_000,
    R2: 30_000,
    R3: 20_000,
    R4: 30_000,
    R5: 20_000,
    R6: 20_000,
    R7: 5_000,
    classifiedFailure: 20_000,
    absenceObservation: 10_000,
} as const;

/** Rect values are rounded to 1/100 = 0.01 CSS px before frame-to-frame comparison. */
export const R4_RECT_SCALE = 100;
/** Consecutive unchanged frame-to-frame comparisons required (six identical frames). */
export const R4_STABLE_COMPARISONS = 5;
export const R6_STABLE_COMPARISONS = 5;
/** Consecutive unchanged frame-to-frame comparisons required by the deliberate-404 absence observation (six frames). */
export const ABSENCE_STABLE_COMPARISONS = 5;
/** Frame cap guarding a degenerate fast-rAF loop; the wall-clock budget is the operative bound. */
export const MAX_FRAMES = 3600;

/** Source-backed: initAlphaTab.ts sets settings.core.engine = "svg". */
export const SURFACE_ENGINE = 'svg';

export type CursorEngineName = 'cursor2' | 'cursor3';

/** Element ids hard-coded by the two cursor constructors (MaestroCursor2.tsx / MaestroCursor3.tsx). */
export const CURSOR_ELEMENT_ID: Readonly<Record<CursorEngineName, string>> = {
    cursor2: 'maestro-cursor-v2',
    cursor3: 'maestro-cursor-v3',
};

// ── Deadline ────────────────────────────────────────────────────────────────────────────────────────

export interface Deadline {
    readonly totalMs: number;
    elapsedMs(): number;
    remainingMs(): number;
    /** min(stageMs, remaining); throws if the overall deadline is already exhausted. */
    budget(label: string, stageMs: number): number;
}

export function createDeadline(totalMs: number): Deadline {
    const startedAt = Date.now();
    const elapsedMs = (): number => Date.now() - startedAt;
    const remainingMs = (): number => totalMs - elapsedMs();
    const budget = (label: string, stageMs: number): number => {
        const left = remainingMs();
        if (left <= 0) {
            throw new Error(`Overall deadline of ${totalMs}ms exhausted before ${label}.`);
        }
        return Math.max(1, Math.floor(Math.min(stageMs, left)));
    };
    return { totalMs, elapsedMs, remainingMs, budget };
}

// ── Expected model (independently written from the musical design; never read from parsed output) ──

export const TICKS_PER_QUARTER = 960;
const BAR_COUNT = 4;
const BEATS_PER_BAR = 4;
const BAR_TICKS = BEATS_PER_BAR * TICKS_PER_QUARTER; // 3840
const TEMPO_BPM = 96;
const A2_MIDI = 45;
const STANDARD_TUNING_HIGH_TO_LOW = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2
/** AlphaTab Note.string typing: "1 is the lowest string", so E2 = 1 and A2 = 2. */
const A_STRING_MODEL_INDEX = 2;
const GM_PROGRAM_STEEL_GUITAR = 25;

export interface FingerprintTrack {
    name: string;
    staffCount: number;
    tuning: number[];
    program: number;
}

export interface FingerprintBar {
    index: number;
    /** Score-relative ticks (masterBar.start). */
    scoreRelativeStart: number;
    numerator: number;
    denominator: number;
    durationTicks: number;
}

export interface FingerprintBeat {
    barIndex: number;
    indexInBar: number;
    /** AlphaTab Duration enum value; 4 = quarter. */
    duration: number;
    /** Bar-relative ticks (beat.playbackStart). */
    barRelativeStart: number;
    /** Score-relative ticks (beat.absolutePlaybackStart). */
    scoreRelativeStart: number;
    durationTicks: number;
    noteCount: number;
    fret: number | null;
    stringIndex: number | null;
    midiPitch: number | null;
}

export interface ScoreFingerprint {
    title: string;
    artist: string;
    tempo: number;
    trackCount: number;
    masterBarCount: number;
    track: FingerprintTrack | null;
    masterBars: FingerprintBar[];
    beats: FingerprintBeat[];
}

export interface ExpectedModel extends ScoreFingerprint {
    barCount: number;
    totalTicks: number;
}

function buildExpectedModel(): ExpectedModel {
    const masterBars: FingerprintBar[] = [];
    for (let bar = 0; bar < BAR_COUNT; bar += 1) {
        masterBars.push({ index: bar, scoreRelativeStart: bar * BAR_TICKS, numerator: 4, denominator: 4, durationTicks: BAR_TICKS });
    }
    const beats: FingerprintBeat[] = [];
    for (let i = 0; i < BAR_COUNT * BEATS_PER_BAR; i += 1) {
        const barIndex = Math.floor(i / BEATS_PER_BAR);
        const indexInBar = i % BEATS_PER_BAR;
        beats.push({
            barIndex,
            indexInBar,
            duration: 4,
            barRelativeStart: indexInBar * TICKS_PER_QUARTER,
            scoreRelativeStart: barIndex * BAR_TICKS + indexInBar * TICKS_PER_QUARTER,
            durationTicks: TICKS_PER_QUARTER,
            noteCount: 1,
            fret: i,
            stringIndex: A_STRING_MODEL_INDEX,
            midiPitch: A2_MIDI + i,
        });
    }
    return {
        title: 'Maestro E2E Fixture 001',
        artist: 'Maestro QA',
        tempo: TEMPO_BPM,
        trackCount: 1,
        masterBarCount: BAR_COUNT,
        track: { name: 'Maestro E2E Guitar', staffCount: 1, tuning: STANDARD_TUNING_HIGH_TO_LOW.slice(), program: GM_PROGRAM_STEEL_GUITAR },
        masterBars,
        beats,
        barCount: BAR_COUNT,
        totalTicks: BAR_COUNT * BAR_TICKS,
    };
}

export const EXPECTED_MODEL: ExpectedModel = buildExpectedModel();

/** Generated-MIDI / tick-lookup reference values from the Node verification (Phase B1); OBSERVATION ONLY in the browser. */
export const GENERATED_MIDI_REFERENCE = {
    masterBarStarts: [0, 3840, 7680, 11520],
    masterBarEnds: [3840, 7680, 11520, 15360],
    /** Per-beat lookup ranges are bar-relative in the lookup, unlike the absolute bar ranges. */
    firstBarBeatRanges: [
        [0, 960],
        [960, 1920],
        [1920, 2880],
        [2880, 3840],
    ],
};

/** Deep copy of the expected model as a fingerprint; used by browser-free controls as a conforming sample. */
export function cloneExpectedAsFingerprint(): ScoreFingerprint {
    return JSON.parse(JSON.stringify(EXPECTED_MODEL)) as ScoreFingerprint;
}

/** Returns human-readable mismatches between a parsed-score fingerprint and the expected model (empty = match). */
export function compareScoreFingerprint(actual: ScoreFingerprint, expected: ExpectedModel): string[] {
    const mismatches: string[] = [];
    const check = (label: string, want: unknown, got: unknown): void => {
        if (JSON.stringify(want) !== JSON.stringify(got)) {
            mismatches.push(`${label}: expected ${JSON.stringify(want)}, actual ${JSON.stringify(got)}`);
        }
    };
    check('title', expected.title, actual.title);
    check('artist', expected.artist, actual.artist);
    check('tempo (BPM)', expected.tempo, actual.tempo);
    check('track count', expected.trackCount, actual.trackCount);
    check('masterBar count', expected.masterBarCount, actual.masterBarCount);
    check('track (name, staff count, tuning, GM program)', expected.track, actual.track);
    check('masterBars (score-relative start, time signature, duration ticks)', expected.masterBars, actual.masterBars);
    check('beat count', expected.beats.length, actual.beats.length);
    expected.beats.forEach((beat, i) => {
        check(`beats[${i}] (bar-relative and score-relative ticks, duration, fret, string, pitch)`, beat, actual.beats[i] === undefined ? null : actual.beats[i]);
    });
    return mismatches;
}

// ── In-page stage runner (self-contained: it is serialized and executed inside the page) ───────────

type StageName = 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7';

interface StageArgs {
    stage: StageName;
    timeoutMs: number;
    maxFrames: number;
    /** 0 = resolve on the first ready frame; N > 0 = require N consecutive unchanged frame-to-frame comparisons. */
    stableComparisons: number;
    rectScale: number;
    expectedBarCount: number;
    expectedSurfaceEngine: string;
}

export interface StageResult {
    ok: boolean;
    stage: StageName;
    frames: number;
    inPageElapsedMs: number;
    reason: string;
    observed: Record<string, unknown>;
}

interface Sample {
    ready: boolean;
    reason: string;
    observed: Record<string, unknown>;
    signature: string | null;
    refs: unknown[] | null;
}

interface RectNumbers {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface NoteLike {
    fret: number;
    string: number;
    realValue: number;
}
interface BeatLike {
    index: number;
    duration: number;
    playbackStart: number;
    absolutePlaybackStart: number;
    playbackDuration: number;
    notes: NoteLike[];
}
interface StaffLike {
    tuning: number[];
    bars: Array<{ voices: Array<{ beats: BeatLike[] }> }>;
}
interface TrackLike {
    name: string;
    staves: StaffLike[];
    playbackInfo: { program: number };
}
interface MasterBarLike {
    index: number;
    start: number;
    timeSignatureNumerator: number;
    timeSignatureDenominator: number;
    calculateDuration(): number;
}
interface ScoreLike {
    title: string;
    artist: string;
    tempo: number;
    tracks: TrackLike[];
    masterBars: MasterBarLike[];
}
interface BoundsLike {
    isFinished?: boolean;
    staffSystems?: Array<{ bars?: unknown[] }>;
}
interface TickLookupBeatLike {
    start: number;
    end: number;
    nextBeat?: TickLookupBeatLike | null;
}
interface TickLookupBarLike {
    start: number;
    end: number;
    firstBeat?: TickLookupBeatLike | null;
}
interface ApiLike {
    load?: unknown;
    container?: { element?: unknown };
    canvasElement?: { element?: unknown };
    settings?: { core?: { engine?: unknown } };
    score?: ScoreLike | null;
    renderer?: { boundsLookup?: BoundsLike | null };
    tickCache?: { masterBars?: TickLookupBarLike[] } | null;
}

async function runStageInPage(args: StageArgs): Promise<StageResult> {
    const w = window as unknown as Record<string, unknown>;
    const started = performance.now();
    let frames = 0;
    let consecutive = 0;
    let previousSignature: string | null = null;
    let previousRefs: unknown[] | null = null;
    let lastReason = 'no sample taken';
    let lastObserved: Record<string, unknown> = {};

    const round = (value: number): number => Math.round(value * args.rectScale) / args.rectScale;
    const rectOf = (el: Element): RectNumbers => {
        const r = el.getBoundingClientRect();
        return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
    };
    const notReady = (reason: string, observed: Record<string, unknown>): Sample => ({
        ready: false,
        reason,
        observed,
        signature: null,
        refs: null,
    });
    const sameRefs = (a: unknown[] | null, b: unknown[] | null): boolean => {
        if (a === null || b === null || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    };

    // Ties the debug alias to the CURRENT renderer: the API's own root container must be the one
    // .alphatab-container inside main #maestro-player.
    const resolveOwned = (): { api: ApiLike; container: HTMLElement } | string => {
        const containers = document.querySelectorAll('main #maestro-player .alphatab-container');
        if (containers.length !== 1) {
            return 'expected exactly one main #maestro-player .alphatab-container, found ' + containers.length;
        }
        const container = containers[0] as HTMLElement;
        const api = w['__at'] as ApiLike | undefined;
        if (!api || typeof api.load !== 'function') return 'window.__at is missing or is not an AlphaTab API';
        const owner = api.container ? api.container.element : undefined;
        if (owner !== container) {
            return 'window.__at.container.element is not the current .alphatab-container (the API is not owned by this renderer)';
        }
        if (!container.classList.contains('alphaTab')) return 'the container lacks the alphaTab class AlphaTab adds on init';
        return { api, container };
    };

    const readFingerprint = (score: ScoreLike): ScoreFingerprint => {
        const tracks = score.tracks || [];
        const track = tracks.length > 0 ? tracks[0] : null;
        const staff = track && track.staves && track.staves.length > 0 ? track.staves[0] : null;
        const masterBars = (score.masterBars || []).map((mb) => ({
            index: mb.index,
            scoreRelativeStart: mb.start,
            numerator: mb.timeSignatureNumerator,
            denominator: mb.timeSignatureDenominator,
            durationTicks: mb.calculateDuration(),
        }));
        const beats: FingerprintBeat[] = [];
        if (staff && staff.bars) {
            for (let barIndex = 0; barIndex < staff.bars.length; barIndex += 1) {
                const voice = staff.bars[barIndex].voices[0];
                const voiceBeats = voice && voice.beats ? voice.beats : [];
                for (let b = 0; b < voiceBeats.length; b += 1) {
                    const beat = voiceBeats[b];
                    const note = beat.notes && beat.notes.length > 0 ? beat.notes[0] : null;
                    beats.push({
                        barIndex,
                        indexInBar: beat.index,
                        duration: beat.duration,
                        barRelativeStart: beat.playbackStart,
                        scoreRelativeStart: beat.absolutePlaybackStart,
                        durationTicks: beat.playbackDuration,
                        noteCount: beat.notes ? beat.notes.length : 0,
                        fret: note ? note.fret : null,
                        stringIndex: note ? note.string : null,
                        midiPitch: note ? note.realValue : null,
                    });
                }
            }
        }
        return {
            title: score.title,
            artist: score.artist,
            tempo: score.tempo,
            trackCount: tracks.length,
            masterBarCount: (score.masterBars || []).length,
            track: track
                ? {
                      name: track.name,
                      staffCount: track.staves ? track.staves.length : 0,
                      tuning: staff ? (Array.prototype.slice.call(staff.tuning) as number[]) : [],
                      program: track.playbackInfo ? track.playbackInfo.program : -1,
                  }
                : null,
            masterBars,
            beats,
        };
    };

    const sampleOnce = (): Sample => {
        // R7 and R5 do not need the API ownership tie.
        if (args.stage === 'R5') {
            const value = w['__maestroCursorEngine'];
            return typeof value === 'string'
                ? { ready: true, reason: 'engine global is set', observed: { engineGlobal: value }, signature: null, refs: null }
                : notReady('window.__maestroCursorEngine is not set yet', { engineGlobalType: typeof value });
        }
        if (args.stage === 'R7') {
            const cursors = document.querySelectorAll('#maestro-cursor-v2, #maestro-cursor-v3');
            if (cursors.length !== 1) return notReady('cursor element count is ' + cursors.length, { present: false, count: cursors.length });
            const el = cursors[0] as HTMLElement;
            const style = window.getComputedStyle(el);
            const rect = rectOf(el);
            const containerEl = document.querySelector('main #maestro-player .alphatab-container');
            const containerRect = containerEl ? rectOf(containerEl) : null;
            const intersectsContainer =
                containerRect !== null &&
                rect.x < containerRect.x + containerRect.width &&
                rect.x + rect.width > containerRect.x &&
                rect.y < containerRect.y + containerRect.height &&
                rect.y + rect.height > containerRect.y;
            const insideViewport =
                rect.x < window.innerWidth && rect.x + rect.width > 0 && rect.y < window.innerHeight && rect.y + rect.height > 0;
            const inlineTransform = el.style.transform;
            const observed = {
                present: true,
                id: el.id,
                visibility: style.visibility,
                opacity: style.opacity,
                inlineTransform,
                rect,
                intersectsContainer,
                insideViewport,
            };
            const visible =
                style.visibility === 'visible' && parseFloat(style.opacity) > 0 && inlineTransform.indexOf('-100vw') === -1 && intersectsContainer;
            return visible
                ? { ready: true, reason: 'cursor is visible', observed, signature: null, refs: null }
                : notReady('cursor is present but not visible', observed);
        }

        const owned = resolveOwned();
        if (typeof owned === 'string') return notReady(owned, {});
        const api = owned.api;
        const container = owned.container;

        if (args.stage === 'R2') {
            return {
                ready: true,
                reason: 'API is owned by the current container',
                observed: { containerClassName: container.className },
                signature: null,
                refs: null,
            };
        }

        if (args.stage === 'R3') {
            const score = api.score;
            if (!score) return notReady('api.score is null (no score loaded yet)', {});
            return {
                ready: true,
                reason: 'a score is loaded',
                observed: { fingerprint: readFingerprint(score) },
                signature: null,
                refs: null,
            };
        }

        if (args.stage === 'R4') {
            const engine = api.settings && api.settings.core ? api.settings.core.engine : undefined;
            if (engine !== args.expectedSurfaceEngine) {
                return notReady('api.settings.core.engine is ' + String(engine) + ', expected ' + args.expectedSurfaceEngine, {});
            }
            const surface = api.canvasElement ? api.canvasElement.element : undefined;
            if (!(surface instanceof HTMLElement)) return notReady('api.canvasElement.element is not an element', {});
            if (!surface.classList.contains('at-surface')) return notReady('the surface lacks the at-surface class', {});
            if (surface.parentElement !== container) return notReady('the surface is not a direct child of the owned container', {});
            const bounds = api.renderer ? api.renderer.boundsLookup : null;
            if (!bounds) return notReady('renderer.boundsLookup is missing', {});
            if (bounds.isFinished !== true) return notReady('boundsLookup.isFinished is not true', {});
            const systems = bounds.staffSystems || [];
            let renderedBars = 0;
            for (let i = 0; i < systems.length; i += 1) {
                const bars = systems[i].bars;
                renderedBars += bars ? bars.length : 0;
            }
            if (systems.length < 1 || renderedBars !== args.expectedBarCount) {
                return notReady('rendered bars is ' + renderedBars + ' across ' + systems.length + ' system(s), expected ' + args.expectedBarCount, {});
            }
            const svgs = surface.querySelectorAll('svg.at-surface-svg');
            let nonZeroSvg = false;
            for (let i = 0; i < svgs.length; i += 1) {
                const r = svgs[i].getBoundingClientRect();
                if (r.width > 0 && r.height > 0) nonZeroSvg = true;
            }
            const containerRect = rectOf(container);
            const surfaceRect = rectOf(surface);
            const observed = {
                systems: systems.length,
                renderedBars,
                svgCount: svgs.length,
                containerRect,
                surfaceRect,
                rectScale: args.rectScale,
            };
            if (svgs.length < 1 || !nonZeroSvg) return notReady('no non-zero svg.at-surface-svg inside the surface', observed);
            if (surfaceRect.width <= 0 || surfaceRect.height <= 0 || containerRect.width <= 0 || containerRect.height <= 0) {
                return notReady('container or surface has a zero-size rect', observed);
            }
            return {
                ready: true,
                reason: 'rendered; checking frame-to-frame stability',
                observed,
                signature: JSON.stringify([containerRect, surfaceRect]),
                refs: [api, container, surface, bounds],
            };
        }

        // R6
        const cursors = document.querySelectorAll('#maestro-cursor-v2, #maestro-cursor-v3');
        const observedCounts = {
            total: cursors.length,
            v2: document.querySelectorAll('#maestro-cursor-v2').length,
            v3: document.querySelectorAll('#maestro-cursor-v3').length,
        };
        if (cursors.length !== 1) return notReady('expected exactly one cursor element, found ' + cursors.length, observedCounts);
        const cursorEl = cursors[0] as HTMLElement;
        if (cursorEl.parentElement !== container) return notReady('the cursor element is not a child of the owned container', observedCounts);
        const ownedCursor = w['__maestroCursor'] as { element?: unknown } | undefined;
        if (!ownedCursor || ownedCursor.element !== cursorEl) {
            return notReady('window.__maestroCursor.element is not the cursor element in the container', observedCounts);
        }
        return {
            ready: true,
            reason: 'cursor is unique and owned; checking identity stability',
            observed: { cursorId: cursorEl.id, counts: observedCounts },
            signature: 'cursor:' + cursorEl.id,
            refs: [api, container, cursorEl],
        };
    };

    return await new Promise<StageResult>((resolve) => {
        let settled = false;
        const finish = (ok: boolean, reason: string): void => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve({
                ok,
                stage: args.stage,
                frames,
                inPageElapsedMs: Math.round((performance.now() - started) * 100) / 100,
                reason,
                observed: lastObserved,
            });
        };
        const timer = window.setTimeout(() => finish(false, 'wall-clock timeout: ' + lastReason), args.timeoutMs);
        const step = (): void => {
            if (settled) return;
            frames += 1;
            const sample = sampleOnce();
            lastReason = sample.reason;
            lastObserved = sample.observed;
            if (sample.ready) {
                if (args.stableComparisons === 0) {
                    finish(true, sample.reason);
                    return;
                }
                if (sample.signature !== null && sample.signature === previousSignature && sameRefs(previousRefs, sample.refs)) {
                    consecutive += 1;
                } else {
                    consecutive = 0;
                }
                previousSignature = sample.signature;
                previousRefs = sample.refs;
                if (consecutive >= args.stableComparisons) {
                    finish(true, 'stable for ' + consecutive + ' consecutive frame-to-frame comparisons');
                    return;
                }
            } else {
                consecutive = 0;
                previousSignature = null;
                previousRefs = null;
            }
            if (frames >= args.maxFrames) {
                finish(false, 'frame cap reached: ' + lastReason);
                return;
            }
            window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    });
}

// ── In-page absence observation for the deliberate-404 control (self-contained: serialized into the page) ──

interface AbsenceArgs {
    timeoutMs: number;
    maxFrames: number;
    /** Consecutive unchanged frame-to-frame comparisons required (each compares owned API and container identity). */
    stableComparisons: number;
}

export interface AbsenceResult {
    ok: boolean;
    /** Non-null when a violation was seen (ownership lost or changed, score appeared, cursor inserted, observation missing). A timeout leaves it null. */
    violation: string | null;
    frames: number;
    consecutiveComparisons: number;
    inPageElapsedMs: number;
    reason: string;
    observed: Record<string, unknown>;
}

async function observeAbsenceInPage(args: AbsenceArgs): Promise<AbsenceResult> {
    const w = window as unknown as Record<string, unknown>;
    const started = performance.now();
    let frames = 0;
    let consecutive = 0;
    let previousApi: unknown = null;
    let previousContainer: unknown = null;
    let lastObserved: Record<string, unknown> = {};

    // One frame: returns a violation (null when the frame satisfies every condition) and whether this frame could be
    // compared with a previous conforming frame (the owned API and container identities must be unchanged).
    const sampleOnce = (): { violation: string | null; compared: boolean } => {
        const containers = document.querySelectorAll('main #maestro-player .alphatab-container');
        const cursorCount = document.querySelectorAll('#maestro-cursor-v2, #maestro-cursor-v3').length;
        const api = w['__at'] as ApiLike | undefined;
        const observation = w['__e2eDocStart'] as { cursorElementEverSeen?: unknown } | undefined;
        lastObserved = {
            containerCount: containers.length,
            apiPresent: !!api,
            cursorElementCount: cursorCount,
            stickyCursorFlag: observation ? observation.cursorElementEverSeen : 'observation-missing',
        };

        if (containers.length !== 1) {
            return { violation: 'ownership lost: expected exactly one main #maestro-player .alphatab-container, found ' + containers.length, compared: false };
        }
        const container = containers[0] as HTMLElement;
        if (!api || typeof api.load !== 'function') {
            return { violation: 'ownership lost: window.__at is missing or is not an AlphaTab API', compared: false };
        }
        const owner = api.container ? api.container.element : undefined;
        if (owner !== container) {
            return { violation: 'ownership lost: window.__at.container.element is not the current .alphatab-container', compared: false };
        }
        if (!container.classList.contains('alphaTab')) {
            return { violation: 'ownership lost: the container lacks the alphaTab class AlphaTab adds on init', compared: false };
        }
        const hadPrevious = previousApi !== null;
        if (hadPrevious && (previousApi !== api || previousContainer !== container)) {
            return { violation: 'ownership changed: the owned API or container identity differs from the previous frame', compared: false };
        }
        previousApi = api;
        previousContainer = container;

        const score = api.score;
        lastObserved['scoreIsNull'] = score === null || score === undefined;
        if (score !== null && score !== undefined) return { violation: 'a score appeared (api.score is no longer null)', compared: false };
        if (cursorCount !== 0) return { violation: 'a cursor element was inserted (count ' + cursorCount + ')', compared: false };
        if (!observation) return { violation: 'the document-start observation is missing', compared: false };
        if (observation.cursorElementEverSeen !== false) {
            return { violation: 'the document-start observer reports that a cursor element was inserted', compared: false };
        }
        return { violation: null, compared: hadPrevious };
    };

    return await new Promise<AbsenceResult>((resolve) => {
        let settled = false;
        const finish = (ok: boolean, violation: string | null, reason: string): void => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            resolve({
                ok,
                violation,
                frames,
                consecutiveComparisons: consecutive,
                inPageElapsedMs: Math.round((performance.now() - started) * 100) / 100,
                reason,
                observed: lastObserved,
            });
        };
        const timer = window.setTimeout(() => finish(false, null, 'wall-clock timeout before ' + args.stableComparisons + ' consecutive comparisons completed'), args.timeoutMs);
        const step = (): void => {
            if (settled) return;
            frames += 1;
            const sample = sampleOnce();
            if (sample.violation !== null) {
                finish(false, sample.violation, sample.violation);
                return;
            }
            if (sample.compared) consecutive += 1;
            if (consecutive >= args.stableComparisons) {
                finish(true, null, 'conditions held for ' + consecutive + ' consecutive frame-to-frame comparisons');
                return;
            }
            if (frames >= args.maxFrames) {
                finish(false, null, 'frame cap reached before ' + args.stableComparisons + ' consecutive comparisons completed');
                return;
            }
            window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    });
}

// ── Node-side stage runner ──────────────────────────────────────────────────────────────────────────

export class StageFailure extends Error {
    stage: string;
    constructor(stage: string, message: string) {
        super(message);
        this.name = 'StageFailure';
        this.stage = stage;
    }
}

export interface StageRecord {
    stage: string;
    nodeElapsedMs: number;
    inPageElapsedMs: number | null;
    frames: number | null;
    note: string;
}

const STAGE_LABEL: Readonly<Record<StageName, string>> = {
    R2: 'AlphaTab API initialized and owned by the current renderer container',
    R3: 'fixture score loaded',
    R4: 'score rendered with stable measured rects',
    R5: 'cursor engine selected',
    R6: 'cursor instantiated and owned',
    R7: 'cursor visibility (report-only)',
};

function safeJson(value: unknown, maxLength = 1600): string {
    const text = JSON.stringify(value);
    return text.length > maxLength ? text.slice(0, maxLength) + '…(truncated)' : text;
}

async function evaluateStage(
    page: Page,
    deadline: Deadline,
    stage: StageName,
    budgetMs: number,
    overrides: Partial<StageArgs>,
): Promise<{ result: StageResult; nodeElapsedMs: number }> {
    const timeoutMs = deadline.budget(stage, budgetMs);
    const args: StageArgs = {
        stage,
        timeoutMs,
        maxFrames: MAX_FRAMES,
        stableComparisons: 0,
        rectScale: R4_RECT_SCALE,
        expectedBarCount: EXPECTED_MODEL.barCount,
        expectedSurfaceEngine: SURFACE_ENGINE,
        ...overrides,
    };
    const nodeStarted = Date.now();
    const result = await page.evaluate(runStageInPage, args);
    return { result, nodeElapsedMs: Date.now() - nodeStarted };
}

async function requireStage(
    page: Page,
    deadline: Deadline,
    stages: StageRecord[],
    stage: StageName,
    budgetMs: number,
    overrides: Partial<StageArgs>,
): Promise<StageResult> {
    const { result, nodeElapsedMs } = await evaluateStage(page, deadline, stage, budgetMs, overrides);
    stages.push({ stage, nodeElapsedMs, inPageElapsedMs: result.inPageElapsedMs, frames: result.frames, note: result.reason });
    if (!result.ok) {
        throw new StageFailure(
            stage,
            `${stage} (${STAGE_LABEL[stage]}) not satisfied after ${nodeElapsedMs}ms Node-side / ${result.inPageElapsedMs}ms in-page: ` +
                `${result.reason}; observed=${safeJson(result.observed)}`,
        );
    }
    return result;
}

function assertNoUnexpected(ledger: TransportLedger, stage: string): void {
    const unexpected = ledger.snapshot().unexpected;
    if (unexpected.length > 0) {
        throw new StageFailure(stage, `${stage}: unexpected request(s) recorded: ${describeUnexpected(unexpected)}`);
    }
}

/** Navigates (bounded) and waits for R0. Shared by the acceptance cases and the 404 control. */
export async function navigateAndWaitForShell(page: Page, deadline: Deadline, urlPath: string, stages: StageRecord[]): Promise<void> {
    const navStarted = Date.now();
    const response = await page.goto(urlPath, { waitUntil: 'domcontentloaded', timeout: deadline.budget('navigation', NAVIGATION_BUDGET_MS) });
    if (response === null) throw new StageFailure('navigation', 'navigation produced no response');
    if (response.status() >= 400) throw new StageFailure('navigation', `navigation returned HTTP ${response.status()}`);
    stages.push({ stage: 'navigation', nodeElapsedMs: Date.now() - navStarted, inPageElapsedMs: null, frames: null, note: `HTTP ${response.status()}` });

    const r0Started = Date.now();
    await waitForShellReady(page, deadline.budget('R0', STAGE_BUDGET_MS.R0));
    stages.push({ stage: 'R0', nodeElapsedMs: Date.now() - r0Started, inPageElapsedMs: null, frames: null, note: 'shell hydrated' });
}

/** R1: the catalogue queries were answered and the URL resolution asked for the sole fixture path. */
export async function waitForCatalogueAndResolution(ledger: TransportLedger, deadline: Deadline, stages: StageRecord[]): Promise<void> {
    const started = Date.now();
    await ledger.waitFor(
        (l) =>
            l.counts.catalogueTabs >= 1 &&
            l.counts.catalogueYoutube >= 1 &&
            (l.counts.signBatchPathsOk >= 1 || l.counts.signSingle >= 1),
        deadline.budget('R1', STAGE_BUDGET_MS.R1),
        'R1 catalogue discovery and URL resolution',
    );
    stages.push({ stage: 'R1', nodeElapsedMs: Date.now() - started, inPageElapsedMs: null, frames: null, note: 'catalogue and URL resolution engaged' });
}

/** R2 on its own (also used by the 404 control to prove an owned API exists). */
export async function waitForOwnedApi(page: Page, deadline: Deadline, stages: StageRecord[]): Promise<void> {
    await requireStage(page, deadline, stages, 'R2', STAGE_BUDGET_MS.R2, {});
}

export interface R4Stability {
    frames: number;
    stableComparisons: number;
    rectPrecisionCssPx: number;
    systems: unknown;
    renderedBars: unknown;
    containerRect: unknown;
    surfaceRect: unknown;
}

export interface R7Observation {
    state: 'visible' | 'hidden' | 'absent' | 'timeout' | 'error';
    detail: Record<string, unknown>;
}

export interface TickCacheObservation {
    present: boolean;
    masterBarStarts: number[];
    masterBarEnds: number[];
    firstBarBeatRanges: number[][];
}

export interface AcceptanceReport {
    stages: StageRecord[];
    engineGlobal: string;
    cursorId: string;
    r4: R4Stability;
    r7: R7Observation;
    tickCache: TickCacheObservation | null;
}

export interface AcceptanceInput {
    page: Page;
    ledger: TransportLedger;
    deadline: Deadline;
    /** Path plus optional query, e.g. '/synth-player?cursorEngine=cursor2'. */
    urlPath: string;
    expectedEngine: CursorEngineName;
}

function observeTickCacheInPage(): TickCacheObservation {
    const w = window as unknown as Record<string, unknown>;
    const api = w['__at'] as ApiLike | undefined;
    const cache = api ? api.tickCache : null;
    if (!cache) return { present: false, masterBarStarts: [], masterBarEnds: [], firstBarBeatRanges: [] };
    const bars = cache.masterBars || [];
    const ranges: number[][] = [];
    let beat: TickLookupBeatLike | null | undefined = bars.length > 0 ? bars[0].firstBeat : null;
    let guard = 0;
    while (beat && guard < 64) {
        ranges.push([beat.start, beat.end]);
        beat = beat.nextBeat;
        guard += 1;
    }
    return {
        present: true,
        masterBarStarts: bars.map((b) => b.start),
        masterBarEnds: bars.map((b) => b.end),
        firstBarBeatRanges: ranges,
    };
}

/**
 * Runs R0–R6 as gates (each bounded by the shared overall deadline), then R7 and the tickCache observation as
 * report-only. Throws StageFailure with a stage-specific message on the first unmet gate.
 */
export async function runAcceptanceStages(input: AcceptanceInput): Promise<AcceptanceReport> {
    const { page, ledger, deadline, urlPath, expectedEngine } = input;
    const stages: StageRecord[] = [];

    await navigateAndWaitForShell(page, deadline, urlPath, stages);
    assertNoUnexpected(ledger, 'R0');

    await waitForCatalogueAndResolution(ledger, deadline, stages);
    assertNoUnexpected(ledger, 'R1');

    await requireStage(page, deadline, stages, 'R2', STAGE_BUDGET_MS.R2, {});
    assertNoUnexpected(ledger, 'R2');

    // R3: the pinned fixture bytes were actually served, then the loaded score matches the independent model.
    const r3Started = Date.now();
    await ledger.waitFor((l) => l.counts.fixtureServed >= 1, deadline.budget('R3', STAGE_BUDGET_MS.R3), 'R3 fixture bytes delivered');
    const served = ledger.snapshot().servedFixtureSha256;
    if (served.length < 1 || !served.every((digest) => digest === FIXTURE_SHA256)) {
        throw new StageFailure('R3', `R3: served fixture digest(s) ${safeJson(served)} do not equal the pin ${FIXTURE_SHA256}`);
    }
    const r3 = await requireStage(page, deadline, stages, 'R3', STAGE_BUDGET_MS.R3, {});
    const mismatches = compareScoreFingerprint(r3.observed['fingerprint'] as ScoreFingerprint, EXPECTED_MODEL);
    if (mismatches.length > 0) {
        throw new StageFailure('R3', `R3 (fixture score loaded): the loaded score does not match the expected model: ${safeJson(mismatches.slice(0, 12))}`);
    }
    stages.push({ stage: 'R3-comparison', nodeElapsedMs: Date.now() - r3Started, inPageElapsedMs: null, frames: null, note: 'score matches the expected model' });
    assertNoUnexpected(ledger, 'R3');

    // R4: completed bounds, four rendered bars, non-zero surface, and exactly stable measured rects.
    const r4 = await requireStage(page, deadline, stages, 'R4', STAGE_BUDGET_MS.R4, { stableComparisons: R4_STABLE_COMPARISONS });
    assertNoUnexpected(ledger, 'R4');

    // R5: engine selected.
    const r5 = await requireStage(page, deadline, stages, 'R5', STAGE_BUDGET_MS.R5, {});
    const engineGlobal = String(r5.observed['engineGlobal']);
    if (engineGlobal !== expectedEngine) {
        throw new StageFailure('R5', `R5 (cursor engine selected): window.__maestroCursorEngine is "${engineGlobal}", expected "${expectedEngine}"`);
    }
    assertNoUnexpected(ledger, 'R5');

    // R6: cursor instantiated and owned (engine selection alone is not enough).
    const r6 = await requireStage(page, deadline, stages, 'R6', STAGE_BUDGET_MS.R6, { stableComparisons: R6_STABLE_COMPARISONS });
    const cursorId = String(r6.observed['cursorId']);
    if (cursorId !== CURSOR_ELEMENT_ID[expectedEngine]) {
        throw new StageFailure(
            'R6',
            `R6 (cursor instantiated and owned): the cursor element id is "${cursorId}", expected "${CURSOR_ELEMENT_ID[expectedEngine]}" for ${expectedEngine}`,
        );
    }
    assertNoUnexpected(ledger, 'R6');

    // R7 and the tickCache observation are REPORT-ONLY: neither can fail the case.
    let r7: R7Observation;
    try {
        const { result, nodeElapsedMs } = await evaluateStage(page, deadline, 'R7', STAGE_BUDGET_MS.R7, {});
        stages.push({ stage: 'R7', nodeElapsedMs, inPageElapsedMs: result.inPageElapsedMs, frames: result.frames, note: result.reason });
        const present = result.observed['present'] === true;
        r7 = { state: result.ok ? 'visible' : present ? 'hidden' : 'absent', detail: result.observed };
    } catch (e) {
        r7 = { state: 'error', detail: { message: e instanceof Error ? e.message : String(e) } };
    }
    let tickCache: TickCacheObservation | null = null;
    try {
        tickCache = await page.evaluate(observeTickCacheInPage);
    } catch {
        tickCache = null;
    }

    return {
        stages,
        engineGlobal,
        cursorId,
        r4: {
            frames: r4.frames,
            stableComparisons: R4_STABLE_COMPARISONS,
            rectPrecisionCssPx: 1 / R4_RECT_SCALE,
            systems: r4.observed['systems'],
            renderedBars: r4.observed['renderedBars'],
            containerRect: r4.observed['containerRect'],
            surfaceRect: r4.observed['surfaceRect'],
        },
        r7,
        tickCache,
    };
}

// ── Deliberate-404 negative control support ─────────────────────────────────────────────────────────

export interface LoadingFailureWatcher {
    /** Resolves with the matched text once; rejects when `timeoutMs` elapses without a match. */
    wait(timeoutMs: number): Promise<string>;
    dispose(): void;
}

/**
 * Watches console errors for the product's classified loading failure (initAlphaTab.ts loadGuitarProFile throws
 * "loadGuitarProFile: HTTP <status>", which AlphaTabRenderer logs via init().catch(console.error)). Only the matched
 * token is kept, so URLs in the message are not recorded. Attach BEFORE navigation.
 */
export function watchLoadingFailure(page: Page, pattern: RegExp): LoadingFailureWatcher {
    let matched: string | null = null;
    let waiters: Array<(text: string) => void> = [];
    const onConsole = (message: ConsoleMessage): void => {
        if (message.type() !== 'error') return;
        const found = pattern.exec(message.text());
        if (found === null) return;
        if (matched === null) matched = found[0];
        const pending = waiters;
        waiters = [];
        for (const resolve of pending) resolve(matched);
    };
    page.on('console', onConsole);
    return {
        wait(timeoutMs: number): Promise<string> {
            if (matched !== null) return Promise.resolve(matched);
            return new Promise<string>((resolve, reject) => {
                const timer = setTimeout(() => {
                    waiters = waiters.filter((w) => w !== onMatch);
                    reject(new Error(`No classified loading failure matching ${pattern} within ${timeoutMs}ms.`));
                }, timeoutMs);
                const onMatch = (text: string): void => {
                    clearTimeout(timer);
                    resolve(text);
                };
                waiters.push(onMatch);
            });
        },
        dispose(): void {
            page.off('console', onConsole);
        },
    };
}

/**
 * Bounded absence observation for the deliberate-404 control. Run it AFTER the confirmed fixture 404 and the classified
 * product error. Resolves only when ABSENCE_STABLE_COMPARISONS consecutive frame-to-frame comparisons all held the owned
 * API/container, a null score, zero cursor elements and a false sticky cursor flag. Throws StageFailure on any violation
 * (ownership loss or change, score appearance, cursor insertion, missing observation, true sticky flag) or on the bound
 * elapsing. The result is cursor absence through this bounded endpoint, not permanent absence.
 */
export async function observeLoadFailureAbsence(page: Page, deadline: Deadline, stages: StageRecord[]): Promise<AbsenceResult> {
    const args: AbsenceArgs = {
        timeoutMs: deadline.budget('404-absence', STAGE_BUDGET_MS.absenceObservation),
        maxFrames: MAX_FRAMES,
        stableComparisons: ABSENCE_STABLE_COMPARISONS,
    };
    const nodeStarted = Date.now();
    const result = await page.evaluate(observeAbsenceInPage, args);
    const nodeElapsedMs = Date.now() - nodeStarted;
    stages.push({ stage: '404-absence', nodeElapsedMs, inPageElapsedMs: result.inPageElapsedMs, frames: result.frames, note: result.reason });
    if (!result.ok) {
        const kind = result.violation !== null ? 'VIOLATED' : 'not completed';
        throw new StageFailure(
            '404-absence',
            `404-absence (bounded observation after the classified loading failure) ${kind} after ${nodeElapsedMs}ms Node-side / ${result.inPageElapsedMs}ms in-page: ` +
                `${result.reason}; observed=${safeJson(result.observed)}`,
        );
    }
    return result;
}

export interface LoadFailureState {
    apiPresent: boolean;
    /** null when no API exists; otherwise whether api.score is null/undefined. */
    scoreIsNull: boolean | null;
    cursorElementCount: number;
}

export async function readLoadFailureState(page: Page): Promise<LoadFailureState> {
    return page.evaluate((): LoadFailureState => {
        const w = window as unknown as Record<string, unknown>;
        const api = w['__at'] as { score?: unknown } | undefined;
        return {
            apiPresent: !!api,
            scoreIsNull: api ? api.score === null || api.score === undefined : null,
            cursorElementCount: document.querySelectorAll('#maestro-cursor-v2, #maestro-cursor-v3').length,
        };
    });
}
