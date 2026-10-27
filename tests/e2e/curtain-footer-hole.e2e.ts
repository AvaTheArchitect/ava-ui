/**
 * Maestro.ai — Opt-in regression gate for the Desktop curtain footer hole and the narrow-portrait curtain stacking (held-404 paint acceptance, rule-state controls, successful-load structural sampling)
 * Version: V1.0.2
 * Date: October 25, 2026
 * Ticket: PLAYER-CONTROLS-PERSISTENT-SHELL-001; PLAYER-CONTROLS-MOBILE-PERSISTENT-SHELL-001
 *
 * Scope: /synth-player loaded with the unchanged bundled fixture through the existing test-side simulated transport
 * (helpers/fixtureBackend.ts). It checks the CSS-only footer-hole rule (globals.css, hook [data-maestro-curtain] plus the
 * .maestro-curtain-band class set by page.tsx) against the REAL app: on Desktop the curtain keeps its box but must leave the
 * TransportBar footprint unpainted. It also checks the narrow-portrait stacking rule in the same stylesheet: below 650px the
 * curtain keeps its box and fill but ranks at 49, beneath the z-50 mobile bar (PLAYER-CONTROLS-MOBILE-PERSISTENT-SHELL-001; a
 * narrow portrait correction, not a statement about wider coarse-pointer layouts or rotation). N1 and N2 establish TRAY EXPOSURE
 * ONLY: that the bar's footprint paints above the curtain, and that the curtain paints over it without the rule. They say nothing
 * about score or cursor concealment, about the other layers that rank above the curtain, or about a physical iPhone. This file
 * imports helpers/chromeObserver.ts (the test-owned observer and its
 * classification) read-only and leaves its independent checks (transport removal, replacement, hiding, off-screen
 * movement, document identity) untouched; L1 re-asserts those same findings over its observation window. That observer
 * was first written for the exploratory tests/e2e/chrome-occlusion.e2e.ts investigation spec, which is not part of this
 * change and is neither imported nor required here (historical provenance only).
 *
 * THREE EVIDENCE CLASSES, kept apart and never merged or used to upgrade one another
 *   1. HELD-404 PAINT ACCEPTANCE (P1, P2; N1 and N2 under the narrower claim CLAIM_PHONE_TRAY_EXPOSURE). The deliberate-404 state holds the curtain displayed over a loaded shell, so
 *      one stable page yields every capture. Supports painted-pixel claims in that state only. It is not a successful load.
 *   2. SUCCESSFUL-LOAD STRUCTURAL SAMPLING (L1). Frame-sampled computed style of the curtain plus the existing observer's
 *      transport and tray findings, over a time-based window. No pixel is captured. It is not paint proof and not continuous.
 *   3. LIVE HUMAN OR BROWSER OBSERVATION (outside this file). Cipher's one refresh and one song selection on the patched dev
 *      app, and Brett's visual confirmation, are a separate class. This file produces none of it and never counts it.
 * Geometric overlap between the curtain box and the transport footprint is EXPECTED BY DESIGN and is never a painted failure:
 * overlap kind is only an applicability precondition of the paint cases, and displayed-overlay-overlap is reported by L1, never
 * asserted. Only painted pixels and computed styles are judged.
 *
 * Cases (this file implements these six only)
 *   control  browser-free controls: pixel evaluator, viewport agreement, bracket differences, finally-restoration, the
 *            observation-endpoint judgement, and the real sampler source run in an isolated vm context on scripted timelines.
 *   P1       Desktop 1280x720, held 404: PARTIAL overlap (curtain box 80..680 over a footer at 645..720).
 *   P2       Desktop 1280x640, held 404: FULL overlap (the whole footer lies inside the curtain box).
 *   N1       Desktop project at 649x720 (pointer still fine): below the 650px breakpoint, so the Desktop rule must be inactive and
 *            the phone stacking rule active (curtain rank 49); the mobile bar footprint is judged exposed (PARTIAL overlap).
 *   L1       Desktop 1280x720, SUCCESSFUL load, time-based observation window (policy below).
 *   N2       Mobile emulation project (Pixel 7, coarse pointer, touch) at 412x700: the Desktop rule must be inactive and the phone
 *            stacking rule active; the same exposed-footprint judgement (PARTIAL overlap).
 * No rotation case, no playback, no authentication, no real backend, no storage seeding.
 *
 * L1 OBSERVATION POLICY (page clock, performance.now() read at the start of each requestAnimationFrame callback)
 *   Start anchor: the instant of the first sampled frame in which exactly one [data-maestro-curtain] element was present and
 *   displayed by computed style (display not none, visibility visible, opacity above 0). Frames before it, document start to
 *   first curtain display, count toward neither duration; the offset of the anchor from document start is reported.
 *   Endpoint, judged on CURRENT state at every frame: the curtain is present exactly once and hidden, at least 5000 ms have
 *   passed since the anchor, and the hidden settling interval is at least 2000 ms. The settling interval is the CONTINUOUS run
 *   of hidden frames that began at the latest observed curtain hide (a displayed-to-hidden transition) or, after an unknown
 *   interval, at the first hidden frame that resumes observation following a hide observed since the last display. An unknown
 *   frame (absent or ambiguous) breaks the run and contributes nothing to it, so displayed, hidden, absent, hidden restarts the
 *   2000 ms at the second hidden stretch. Absence before the first displayed anchor is legitimate and counts toward nothing.
 *   Cap: 15000 ms after the anchor. A re-show (hidden or unknown to displayed) cancels a previously satisfied endpoint: the
 *   latest hide moves and the 2000 ms restart; cancellations are counted and reported. A curtain that is displayed (active) or
 *   unknown (absent or ambiguous) at the cap is INCOMPLETE, never a pass, as is a curtain whose continuous hidden run is
 *   shorter than 2000 ms at the cap. The deadline binds establishment: a callback that arrives more than 15000 ms after the
 *   anchor cannot establish a NEW endpoint even if every condition then holds (INCOMPLETE: conditions met only after the
 *   deadline); an endpoint already established by an earlier callback and still satisfied stands. The Node side reads the
 *   final state through one stop() read and re-derives the endpoint from the reported times.
 *   Anchor not established: the sampler is read once after the acceptance stages and the target wait return. If no displayed
 *   frame has been sampled by then, no observation wait is started, the case is reported INCOMPLETE ("the curtain was never
 *   observed displayed") and fails. Reaching the anchor therefore costs no wait beyond those stages' own budgets under the 120 s
 *   overall deadline, and it is bounded independently of the 15000 ms cap.
 *   Observation is active from document start (observer) and from the first sampled frame (sampler) until the sampler's single
 *   stop() read and, immediately after it, the observer's finish read. Re-shows reset settling only while the sampler is running,
 *   that is until stop(). No claim of any kind covers an event after those reads; a reload or second song selection is not covered.
 *
 * PAINT CASE MECHANISM. Captures per case (viewport PNGs, scale css, animations disabled, caret hidden, the Next dev indicator
 * hidden for the capture only):
 *   rule       the page as it is.
 *   old        P1, P2, N1 and N2: the .maestro-curtain-band class is removed from the renderer root (an intervention) so the
 *              curtain is as it was before the rules: on P1 and P2 it paints its whole box, on N1 and N2 it ranks 5000 and covers
 *              the mobile bar. POSITIVE CONTROL: proves the evaluator can see a covered footer or bar in this very page. If the
 *              intervention has no effect (background-image not none on P1 and P2, z-index not 5000 on N1 and N2) the case is
 *              INVALID CAPTURE.
 *   reference  the curtain's inline display is set to none (what hideCurtainAtomic does).
 * Every intervention runs inside its own try/finally that restores the prior state even when a step throws, records whether the
 * restoration took, and the final probed state must equal the initial one. Cross-evaluation controls run on the same images:
 * on P1 and P2 the rule capture judged by the 'old' model must FAIL and the old capture judged by the 'hole' model must FAIL; on
 * N1 and N2 the rule capture judged by the 'covered' model must FAIL and the old capture judged by the 'stack' model must FAIL.
 * The phone cases (N1, N2) judge ONLY the mobile bar footprint (helpers/paintEvidence.ts, models 'stack' and 'covered'): shell
 * layers that rank above the curtain by design (the header, the slide-out and its edge tab) also paint inside the curtain box,
 * so the whole-box model of P1 and P2 does not apply to them.
 *
 * VIEWPORT AND SCREENSHOT VALIDITY. Screenshots use scale 'css', so a PNG must have exactly the CONFIGURED viewport's size
 * (page.viewportSize()). window.innerWidth/innerHeight must equal the configured viewport. Any disagreement is reported as an
 * explicit validity issue (VIEWPORT-DISAGREEMENT or SCREENSHOT-DIMENSION-DISAGREEMENT) and the case is INVALID CAPTURE.
 *
 * BRACKETING LIMIT. Each capture is bracketed by two read-only probes (viewport, devicePixelRatio, rule media state, every
 * curtain style and geometry field, transport and tray geometry and style, scroll, load state) and any difference is a validity
 * issue. Bracketing compares two instants only: it cannot exclude a change that begins and ends between the two reads, and it
 * does not identify the frame the browser rasterised. A load-state read that fails (before or after a capture, or in the
 * initial or final state read) is itself a validity issue: two failed reads are never accepted as evidence that the loading
 * state was stable.
 *
 * What fails a case: a failed precondition (build lacks the hook or either rule, media state, curtain rank or overlap kind differs
 * from the case), a validity issue, a FAIL or INVALID CAPTURE verdict, an incomplete observation endpoint, an unexpected request,
 * or a page or fatal console error. PARTIAL fails every held-404 case here: each of P1, P2, N1 and N2 carries a painted claim (a
 * case with neither rule active, none today, would be the only kind to accept PARTIAL).
 *
 * Opt-in flag (default run: every test here is skipped, nothing is installed, captured or written):
 *   E2E_FOOTERHOLE=1   run this file. Unset, empty or 0 = off; any other value fails the load.
 * Desktop project only except N2 (mobile project only). Fresh-state category: NEW BROWSER CONTEXT per test, service workers
 * blocked, no storage seeded or cleared; the song is reached through the simulated catalogue without a click.
 *
 * Invocation: one worker, no retries, one repeat, explicit opt-in flag, ambient flags of the other specs cleared. H is a NEW
 * durable evidence directory created before the run. Playwright empties its --output directory when a run starts, so the
 * runner output goes to a new subdirectory of H and the invocation log goes to H/logs, outside every runner-managed directory:
 *   cd ~/Development/maestro-ai
 *   env -u E2E_CHROME -u E2E_CHROME_SCREENSHOTS -u E2E_CHROME_VIDEO -u E2E_CHROME_CURTAIN_ISOLATION -u E2E_GEOMETRY -u E2E_SCREENSHOTS -u E2E_FIXTURE \
 *     E2E_FOOTERHOLE=1 E2E_BASE_URL=http://127.0.0.1:3000 node_modules/.bin/playwright test tests/e2e/curtain-footer-hole.e2e.ts \
 *     --project=chromium-desktop --workers=1 --retries=0 --repeat-each=1 --reporter=list --global-timeout=900000 \
 *     --output "$H/runner-output/desktop" > "$H/logs/<step>.log" 2>&1; echo $? > "$H/logs/<step>.exit"
 *
 * Evidence limits: one headless Chromium, one OS; Playwright's Desktop Chrome preset has a classic 15px scrollbar gutter
 * (measured per run), so the overlay-scrollbar branch of the rule (gutter 0) is NOT exercised in the real app; the fixture's
 * curtain root is its 600px min-height, not a real song's thousands of pixels (the rule's layers are viewport-fixed, so the
 * footer geometry is the same, which is INFERRED); no Safari, WebKit or Firefox; no physical device or installed PWA; a
 * coarse-pointer viewport at or above 650px is not covered (neither rule applies there), nor are rotation and mobile landscape.
 * The phone cases judge the mobile bar footprint only: other pixels inside the curtain box are not judged, and score coverage
 * under the narrow-portrait rank is not evidenced by this file (the held 404 loads no score). That the tray is positioned and
 * rendered correctly on an iPhone is not evidenced either. Browser behaviour of everything here is NOT RUN when this file is written.
 */

import { createHash } from 'crypto';
import * as vm from 'vm';
import { errors, expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import {
    describeUnexpected,
    installDocStartObserver,
    installFixtureTransport,
    resolveRepoRoot,
    type TransportLedger,
} from './helpers/fixtureBackend';
import { GEOMETRY_TOLERANCE_PX } from './helpers/geometry';
import {
    ABSENCE_STABLE_COMPARISONS,
    MAX_FRAMES,
    OVERALL_DEADLINE_MS,
    R4_STABLE_COMPARISONS,
    STAGE_BUDGET_MS,
    TEST_TIMEOUT_MS,
    createDeadline,
    navigateAndWaitForShell,
    observeLoadFailureAbsence,
    readLoadFailureState,
    runAcceptanceStages,
    waitForCatalogueAndResolution,
    waitForOwnedApi,
    watchLoadingFailure,
    type Deadline,
    type LoadFailureState,
    type StageRecord,
} from './helpers/scoreReady';
import {
    REQUIRED_TARGET_KEYS,
    TARGET_DEFS,
    classifyObservation,
    finishChromeObserver,
    installChromeObserver,
    isDisplayedByStyle,
    trackMainFrameNavigations,
    waitForObserverTargets,
} from './helpers/chromeObserver';
import {
    checkViewportAgreement,
    decodePng,
    encodePng,
    evaluatePaint,
    overlapKind,
    parseOpaqueRgb,
    worseVerdict,
    type OverlapKind,
    type PaintEvaluation,
    type PaintInput,
    type PaintVariant,
    type PaintVerdict,
    type Rect,
    type Rgb,
    type ViewportAgreement,
} from './helpers/paintEvidence';

const SHELL_PATH = '/synth-player';
const DESKTOP_PROJECT = 'chromium-desktop';
const MOBILE_PROJECT = 'chromium-mobile-emulation';
const OUTPUT_JSON_LABEL = '[FOOTER-HOLE-JSON]';
const CLASSIFIED_404_PATTERN = /loadGuitarProFile: HTTP 404/;

/** The Desktop footer-hole rule's documented activation condition (globals.css). */
const RULE_MEDIA_QUERY = '(min-width: 650px) and (pointer: fine)';
/** The narrow-portrait stacking rule's activation condition (globals.css): the exact complement of the 650px query that hides the mobile bar. */
const PHONE_RULE_MEDIA_QUERY = 'not all and (min-width: 650px)';
/** The curtain's computed z-index: its inline rank, and the rank the phone stacking rule sets. */
const DEFAULT_CURTAIN_Z_INDEX = '5000';
const PHONE_CURTAIN_Z_INDEX = '49';
const BAND_CLASS = 'maestro-curtain-band';
const CURTAIN_SELECTOR = '[data-maestro-curtain]';
const HIDE_DEV_INDICATOR_CSS = 'nextjs-portal { display: none !important; }';
const RECT_SCALE = 100;
const CAPTURE_BUDGET_MS = 15_000;

/** The L1 observation policy, in page-clock milliseconds. See the header for the precise anchor and endpoint definitions. */
const OBSERVATION_POLICY = {
    anchor:
        'the page-clock instant (performance.now() at the start of the requestAnimationFrame callback) of the first sampled frame in which exactly one [data-maestro-curtain] element was present and displayed by computed style',
    minFromAnchorMs: 5_000,
    minAfterLatestHideMs: 2_000,
    capFromAnchorMs: 15_000,
    settlingInterval:
        'the continuous run of hidden frames from the latest observed hide, or from the first hidden frame that resumes observation after an unknown interval; absent or ambiguous frames never contribute to it',
    reShow: 'a re-show cancels a previously satisfied endpoint; the 2000 ms restart from the latest hide',
    atCap: 'a curtain that is displayed or unknown at the cap, or whose continuous hidden run is shorter than 2000 ms, is INCOMPLETE and never a pass',
    deadline: 'a callback more than 15000 ms after the anchor cannot establish a new endpoint; an endpoint already established and still satisfied stands',
} as const;
/** Node-side wall-clock margin above the page-clock cap, so a throttled frame loop is reported as incomplete rather than hanging. */
const OBSERVATION_NODE_MARGIN_MS = 10_000;
/** Safety cap on sampled frames (about five minutes at 60 Hz); the time-based cap is the operative bound. */
const SAMPLER_FRAME_SAFETY_CAP = 18_000;

function readFlag(name: string): boolean {
    const raw = process.env[name];
    if (raw === undefined || raw === '' || raw === '0') return false;
    if (raw === '1') return true;
    throw new Error(`${name}="${raw}" is not valid: set ${name}=1 to enable it, or leave it unset (or 0 / empty) to disable it.`);
}

const footerHoleEnabled = readFlag('E2E_FOOTERHOLE');

const TITLE_CONTROL = 'control: evaluator, viewport agreement, bracketing, finally-restoration, observation endpoint and sampler timelines discriminate';
const TITLE_P1 = 'paint: P1 partial overlap, Desktop 1280x720, held 404';
const TITLE_P2 = 'paint: P2 full overlap, Desktop 1280x640, held 404';
const TITLE_N1 = 'phone: N1 below the 650px breakpoint, Desktop project at 649x720, Desktop rule inactive, mobile bar exposed, held 404';
const TITLE_L1 = 'observe: L1 successful load, Desktop 1280x720, time-based window after the first curtain display';
const TITLE_N2 = 'phone: N2 coarse pointer, mobile emulation project at 412x700, Desktop rule inactive, mobile bar exposed, held 404';

// ── Evidence classes and standing disclosures (emitted with every result) ────────────────────────────

interface ClaimClass {
    class: string;
    state: string;
    supports: readonly string[];
    doesNotSupport: readonly string[];
}

const CLAIM_HELD_404_PAINT: ClaimClass = {
    class: 'held-404 paint acceptance',
    state: 'deliberate 404: the curtain stays displayed over a loaded shell; this is not a successful load',
    supports: ['painted pixels of the real app in the held state: footer footprint exposed and the rest of the curtain box painted where the Desktop rule is active (P1, P2), within the stated scope'],
    doesNotSupport: [
        'any claim about a successful load or the reveal',
        'continuous persistence over time',
        'Safari, WebKit, Firefox, a physical device or an installed PWA',
        'geometric overlap as a defect',
    ],
};

/** The claim of the phone cases (N1, N2): tray exposure and nothing else. Emitted instead of CLAIM_HELD_404_PAINT for them. */
const CLAIM_PHONE_TRAY_EXPOSURE: ClaimClass = {
    class: 'phone tray exposure (held 404)',
    state: 'deliberate 404: the curtain stays displayed over a loaded shell at a phone width; no score is loaded and this is not a successful load',
    supports: [
        'the mobile bar footprint (inset 2px) paints above the curtain where the narrow-portrait stacking rule is active, and the curtain paints over it when that rule is removed',
        'the Desktop footer-hole rule is inactive at these widths (computed style and media state)',
    ],
    doesNotSupport: [
        'tray exposure beyond the judged footprint: no other pixel inside the curtain box is judged',
        'score or cursor concealment while the curtain is displayed (the held 404 loads no score)',
        'the other layers that rank above the curtain under the rule (header, slide-out and its edge tab, dialogs)',
        'the tray safe-area padding, its positioning or its rendering on a physical iPhone',
        'landscape, rotation, or coarse-pointer layouts at or above 650px',
        'any claim about a successful load or the reveal, or continuous persistence over time',
        'Safari, WebKit, Firefox, a physical device or an installed PWA',
    ],
};

const CLAIM_SUCCESSFUL_LOAD_STRUCTURAL: ClaimClass = {
    class: 'successful-load structural sampling',
    state: 'successful natural load of the unchanged fixture; frame-sampled; no pixel is captured or decoded',
    supports: [
        'the computed style of the curtain (rule active or not) in every sampled displayed frame',
        'single node identity and no removal, replacement, hiding or off-screen movement of the tray and transport bar in the sampled frames',
        'the time-based observation policy outcome (settled or incomplete)',
    ],
    doesNotSupport: [
        'painted exposure of the footer (the held-404 cases evidence paint)',
        'anything between sampled frames',
        "any event after the reads that close the observation (the sampler's stop() read, then the observer's finish read)",
        'a reload, a second song selection, Safari, a physical device or an installed PWA',
    ],
};

const LIVE_OBSERVATION_NOTE =
    "A third class, live human or browser observation (Cipher's refresh and song selection on the patched dev app, Brett's visual confirmation), is not produced by this file and is never merged into, counted with or used to upgrade either class above.";

const GEOMETRY_NOTE =
    'Geometric overlap between the curtain box and the transport footprint is expected by design and is never a painted failure; overlap kind is only an applicability precondition of the held-404 paint cases.';

const BRACKET_LIMIT =
    'each capture is bracketed by two read-only probes before and after the screenshot call; bracketing compares two instants only, cannot exclude a change that begins and ends between them, and does not identify the frame the browser rasterised';

const FATAL_CONSOLE_PATTERNS: readonly RegExp[] = [
    /\bUncaught\b/,
    /\bUnhandled (?:Runtime Error|Promise Rejection|rejection)\b/i,
    /Application error: a client-side exception/,
    /Hydration failed/,
    /Minified React error/,
    /Maximum update depth exceeded/,
    /ChunkLoadError/,
];

interface ErrorTracker {
    pageErrors: string[];
    fatalConsole: string[];
}

/** Same fatal-console policy as the existing specs (their copies are module-local, so reusing them would mean editing them). */
function trackErrors(page: Page): ErrorTracker {
    const tracker: ErrorTracker = { pageErrors: [], fatalConsole: [] };
    page.on('pageerror', (error) => tracker.pageErrors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'error' && FATAL_CONSOLE_PATTERNS.some((pattern) => pattern.test(message.text()))) tracker.fatalConsole.push(message.text());
    });
    return tracker;
}

/** The one failure the 404 cases tolerate is the product's own classified loading error. */
function endpointViolations(ledger: TransportLedger, tracker: ErrorTracker, allow404: boolean): string[] {
    const violations: string[] = [];
    const snapshot = ledger.snapshot();
    if (snapshot.unexpected.length > 0) violations.push(`unexpected backend/external request(s): ${describeUnexpected(snapshot.unexpected)}`);
    const keep = (message: string): boolean => !(allow404 && CLASSIFIED_404_PATTERN.test(message));
    for (const message of tracker.pageErrors.filter(keep)) violations.push(`uncaught page error: ${message}`);
    for (const message of tracker.fatalConsole.filter(keep)) violations.push(`fatal console error: ${message}`);
    return violations;
}

function describeError(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function selectorOf(key: string): string {
    const def = TARGET_DEFS.find((candidate) => candidate.key === key);
    if (def === undefined || def.selector === undefined) throw new Error(`target "${key}" has no selector in TARGET_DEFS`);
    return def.selector;
}

function resolveDevOrigin(testInfo: TestInfo): string {
    const baseURL = testInfo.project.use.baseURL;
    if (!baseURL) throw new Error('The project has no baseURL; the dev-server origin cannot be determined.');
    return new URL(baseURL).origin;
}

function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

// ── In-page probe (read-only) and bracket comparison ────────────────────────────────────────────────

type ChromeKey = 'trayDesktop' | 'trayMobile' | 'transportBar' | 'mobileBar';

interface ProbeArgs {
    curtainSelector: string;
    chrome: Array<{ key: ChromeKey; selector: string }>;
    ruleQuery: string;
    phoneRuleQuery: string;
    bandClass: string;
    mainSelector: string;
    rectScale: number;
}

interface ProbeRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ProbeCurtain {
    rect: ProbeRect;
    display: string;
    visibility: string;
    opacity: string;
    position: string;
    zIndex: string;
    pointerEvents: string;
    color: string;
    backgroundColor: string;
    backgroundImage: string;
    backgroundAttachment: string;
    backgroundSize: string;
    backgroundPosition: string;
    inlineBackgroundColor: string;
    inlineDisplay: string;
    parentHasBandClass: boolean;
}

interface ChromeEntry {
    key: ChromeKey;
    selector: string;
    count: number;
    rect: ProbeRect | null;
    display: string | null;
    visibility: string | null;
    opacity: string | null;
}

interface PaintProbe {
    innerWidth: number;
    innerHeight: number;
    devicePixelRatio: number;
    rootFontPx: number;
    ruleMediaMatches: boolean;
    phoneRuleMediaMatches: boolean;
    pointerFine: boolean;
    pointerCoarse: boolean;
    curtainCount: number;
    curtain: ProbeCurtain | null;
    chrome: ChromeEntry[];
    /** The Desktop footer-hole rule: the rule on the shared selector that declares a background property. */
    ruleInStylesheets: { found: boolean; mediaCondition: string | null };
    /** The phone stacking rule: the rule on the shared selector that declares z-index. Reported separately, so it can never replace the Desktop rule here. */
    phoneRuleInStylesheets: { found: boolean; mediaCondition: string | null };
    mainScrollTop: number | null;
    documentScrollTop: number;
}

/**
 * One in-page read. It changes nothing. Avoids optional chaining, nullish coalescing and object spread because Playwright
 * serializes this function's source text into the page; raw style values are returned and displayed-state is derived Node-side
 * with the existing isDisplayedByStyle.
 */
function probeInPage(a: ProbeArgs): PaintProbe {
    const round = (value: number): number => Math.round(value * a.rectScale) / a.rectScale;
    const rectOf = (el: Element): ProbeRect => {
        const box = el.getBoundingClientRect();
        return { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) };
    };

    const curtains = Array.from(document.querySelectorAll(a.curtainSelector));
    let curtain: ProbeCurtain | null = null;
    if (curtains.length === 1) {
        const el = curtains[0] as HTMLElement;
        const style = window.getComputedStyle(el);
        const parent = el.parentElement;
        curtain = {
            rect: rectOf(el),
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            position: style.position,
            zIndex: style.zIndex,
            pointerEvents: style.pointerEvents,
            color: style.color,
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            backgroundAttachment: style.backgroundAttachment,
            backgroundSize: style.backgroundSize,
            backgroundPosition: style.backgroundPosition,
            inlineBackgroundColor: el.style.backgroundColor,
            inlineDisplay: el.style.display,
            parentHasBandClass: parent !== null && parent.classList.contains(a.bandClass),
        };
    }

    const chrome = a.chrome.map((item): ChromeEntry => {
        const found = Array.from(document.querySelectorAll(item.selector));
        if (found.length !== 1) {
            return { key: item.key, selector: item.selector, count: found.length, rect: null, display: null, visibility: null, opacity: null };
        }
        const style = window.getComputedStyle(found[0]);
        return { key: item.key, selector: item.selector, count: 1, rect: rectOf(found[0]), display: style.display, visibility: style.visibility, opacity: style.opacity };
    });

    // The rules are looked up by selector text anywhere in the loaded stylesheets, so a media-query rewrite by the build
    // pipeline cannot hide them; the enclosing media condition is reported as found. The Desktop rule and the phone rule share
    // one selector, so each is told apart by the declaration it exists for (the Desktop rule declares background properties, the
    // phone rule declares z-index) and each keeps its own enclosing media condition: neither can replace the other in what is
    // reported, whatever their order in the stylesheet.
    let found = false;
    let mediaCondition: string | null = null;
    let phoneFound = false;
    let phoneMediaCondition: string | null = null;
    const declares = (style: CSSStyleDeclaration, prefix: string): boolean => {
        for (let j = 0; j < style.length; j += 1) {
            if (style[j].indexOf(prefix) === 0) return true;
        }
        return false;
    };
    const scan = (rules: CSSRuleList, enclosing: string | null): void => {
        for (let i = 0; i < rules.length; i += 1) {
            const rule = rules[i] as CSSRule & { cssRules?: CSSRuleList; selectorText?: string; conditionText?: string; media?: MediaList; style?: CSSStyleDeclaration };
            if (typeof rule.selectorText === 'string' && rule.style !== undefined) {
                if (rule.selectorText.indexOf('maestro-curtain-band') >= 0 && rule.selectorText.indexOf('data-maestro-curtain') >= 0) {
                    if (declares(rule.style, 'background')) {
                        found = true;
                        mediaCondition = enclosing;
                    }
                    if (declares(rule.style, 'z-index')) {
                        phoneFound = true;
                        phoneMediaCondition = enclosing;
                    }
                }
            }
            if (rule.cssRules !== undefined) {
                const condition = typeof rule.conditionText === 'string' ? rule.conditionText : rule.media !== undefined ? rule.media.mediaText : enclosing;
                scan(rule.cssRules, condition);
            }
        }
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            scan(sheet.cssRules, null);
        } catch {
            // a stylesheet that cannot be read (cross-origin) cannot hold the same-origin rule
        }
    }

    const main = document.querySelector(a.mainSelector);
    const scrolling = document.scrollingElement;
    return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        rootFontPx: parseFloat(window.getComputedStyle(document.documentElement).fontSize),
        ruleMediaMatches: window.matchMedia(a.ruleQuery).matches,
        phoneRuleMediaMatches: window.matchMedia(a.phoneRuleQuery).matches,
        pointerFine: window.matchMedia('(pointer: fine)').matches,
        pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
        curtainCount: curtains.length,
        curtain,
        chrome,
        ruleInStylesheets: { found, mediaCondition },
        phoneRuleInStylesheets: { found: phoneFound, mediaCondition: phoneMediaCondition },
        mainScrollTop: main === null ? null : main.scrollTop,
        documentScrollTop: scrolling === null ? 0 : scrolling.scrollTop,
    };
}

const CHROME_PROBE_TARGETS: Array<{ key: ChromeKey; selector: string }> = [
    { key: 'trayDesktop', selector: selectorOf('trayDesktop') },
    { key: 'trayMobile', selector: selectorOf('trayMobile') },
    { key: 'transportBar', selector: selectorOf('transportBar') },
    { key: 'mobileBar', selector: selectorOf('mobileBar') },
];

function buildProbeArgs(): ProbeArgs {
    return {
        curtainSelector: CURTAIN_SELECTOR,
        chrome: CHROME_PROBE_TARGETS,
        ruleQuery: RULE_MEDIA_QUERY,
        phoneRuleQuery: PHONE_RULE_MEDIA_QUERY,
        bandClass: BAND_CLASS,
        mainSelector: selectorOf('main'),
        rectScale: RECT_SCALE,
    };
}

async function readProbe(page: Page): Promise<PaintProbe> {
    return page.evaluate(probeInPage, buildProbeArgs());
}

function chromeEntry(probe: PaintProbe, key: ChromeKey): ChromeEntry {
    const entry = probe.chrome.find((candidate) => candidate.key === key);
    if (entry === undefined) throw new Error(`the probe holds no entry for ${key}`);
    return entry;
}

/** Exactly one match, a nonzero rectangle, and displayed by computed style (the existing isDisplayedByStyle). */
function entryDisplayed(entry: ChromeEntry): boolean {
    return (
        entry.count === 1 &&
        entry.rect !== null &&
        entry.rect.width > 0 &&
        entry.rect.height > 0 &&
        entry.display !== null &&
        entry.visibility !== null &&
        entry.opacity !== null &&
        isDisplayedByStyle(entry.display, entry.visibility, entry.opacity)
    );
}

/** Every bracketed field, flattened to a string per key so two probes can be compared field by field. */
function flattenProbe(probe: PaintProbe, load: LoadFailureState | null): Record<string, string> {
    const out: Record<string, string> = {};
    const put = (key: string, value: unknown): void => {
        out[key] = JSON.stringify(value);
    };
    put('viewport.inner', [probe.innerWidth, probe.innerHeight]);
    put('viewport.devicePixelRatio', probe.devicePixelRatio);
    put('viewport.rootFontPx', probe.rootFontPx);
    put('media.ruleMatches', probe.ruleMediaMatches);
    put('media.phoneRuleMatches', probe.phoneRuleMediaMatches);
    put('curtain.count', probe.curtainCount);
    if (probe.curtain === null) {
        put('curtain', null);
    } else {
        for (const [field, value] of Object.entries(probe.curtain)) put(`curtain.${field}`, value);
    }
    for (const entry of probe.chrome) {
        put(`${entry.key}.count`, entry.count);
        put(`${entry.key}.rect`, entry.rect);
        put(`${entry.key}.style`, [entry.display, entry.visibility, entry.opacity]);
    }
    put('scroll.main', probe.mainScrollTop);
    put('scroll.document', probe.documentScrollTop);
    put('load', load);
    return out;
}

function describeProbeDifferences(a: Record<string, string>, b: Record<string, string>): string[] {
    const differences: string[] = [];
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    for (const key of keys) {
        if (a[key] !== b[key]) differences.push(`${key}: ${a[key] === undefined ? '(absent)' : a[key]} -> ${b[key] === undefined ? '(absent)' : b[key]}`);
    }
    return differences;
}

/** A load-failure state read that either produced a state or failed; a failed read is never silently treated as a value. */
interface LoadStateRead {
    state: LoadFailureState | null;
    error: string | null;
}

async function readLoadState(page: Page): Promise<LoadStateRead> {
    try {
        return { state: await readLoadFailureState(page), error: null };
    } catch (error) {
        return { state: null, error: describeError(error) };
    }
}

interface BracketResult {
    /** Fields that differ between the two probes. Two failed load-state reads compare equal here, which is why they are reported separately. */
    differences: string[];
    /** One issue per failed load-state read, plus one more when both failed. Any entry means the loading state is not evidenced. */
    loadStateIssues: string[];
}

function describeBracket(
    before: PaintProbe,
    after: PaintProbe,
    loadBefore: LoadStateRead,
    loadAfter: LoadStateRead,
    labels: { before: string; after: string },
): BracketResult {
    const loadStateIssues: string[] = [];
    const unavailable = (read: LoadStateRead, when: string): string =>
        `LOAD-STATE-UNAVAILABLE: the load-failure state could not be read ${when} (${read.error === null ? 'no state returned' : read.error}); the loading state is not evidenced`;
    if (loadBefore.state === null) loadStateIssues.push(unavailable(loadBefore, labels.before));
    if (loadAfter.state === null) loadStateIssues.push(unavailable(loadAfter, labels.after));
    if (loadBefore.state === null && loadAfter.state === null) {
        loadStateIssues.push('LOAD-STATE-UNAVAILABLE: both reads failed, and two failed reads are never accepted as evidence that the loading state was stable');
    }
    return {
        differences: describeProbeDifferences(flattenProbe(before, loadBefore.state), flattenProbe(after, loadAfter.state)),
        loadStateIssues,
    };
}

/** Everything about one capture that makes the capture set unusable: viewport and size disagreements, failed load-state reads and bracket differences. */
function captureInvalidations(record: CaptureRecord): string[] {
    const reasons: string[] = [];
    for (const issue of record.viewportAgreement.issues) reasons.push(`${record.name} capture: ${issue}`);
    for (const issue of record.loadStateIssues) reasons.push(`${record.name} capture: ${issue}`);
    if (record.bracketDifferences.length > 0) {
        reasons.push(`${record.name} capture: the probed state differs between the reads before and after the screenshot: ${record.bracketDifferences.join('; ')}`);
    }
    return reasons;
}

// ── Interventions: each restores in its own finally ──────────────────────────────────────────────────

interface InterventionArgs {
    curtainSelector: string;
    bandClass: string;
    kind: 'band-class' | 'curtain-display';
    /** band-class: whether the class is present afterwards. */
    classPresent: boolean;
    /** curtain-display: the inline display value to set. */
    displayValue: string;
}

interface InterventionResult {
    ok: boolean;
    classPresent: boolean | null;
    priorInlineDisplay: string | null;
    inlineDisplay: string | null;
}

/** The only writes this file makes to the page. Each touches one thing on the one curtain element or its renderer root. */
async function intervene(page: Page, args: InterventionArgs): Promise<InterventionResult> {
    return page.evaluate((a: InterventionArgs): InterventionResult => {
        const found = document.querySelectorAll(a.curtainSelector);
        if (found.length !== 1) return { ok: false, classPresent: null, priorInlineDisplay: null, inlineDisplay: null };
        const el = found[0] as HTMLElement;
        const parent = el.parentElement;
        const prior = el.style.display;
        if (a.kind === 'band-class') {
            if (parent === null) return { ok: false, classPresent: null, priorInlineDisplay: prior, inlineDisplay: prior };
            if (a.classPresent) parent.classList.add(a.bandClass);
            else parent.classList.remove(a.bandClass);
        } else {
            el.style.display = a.displayValue;
        }
        return {
            ok: true,
            classPresent: parent === null ? null : parent.classList.contains(a.bandClass),
            priorInlineDisplay: prior,
            inlineDisplay: el.style.display,
        };
    }, args);
}

interface InterventionRecord {
    name: string;
    applied: boolean | null;
    restoreResult: 'restored' | 'failed' | 'not-attempted';
    detail: string | null;
}

interface InterventionSpec {
    name: string;
    apply: () => Promise<InterventionResult>;
    /** Idempotent: it puts back the state read BEFORE the intervention, whether or not apply completed. */
    restore: () => Promise<InterventionResult>;
    isRestored: (result: InterventionResult) => boolean;
}

/**
 * Runs `body` with the intervention applied. The restoration always runs in a finally block, even when apply or body throws;
 * its outcome is recorded and never thrown, so the original error (if any) still propagates.
 */
async function withIntervention<T>(spec: InterventionSpec, log: InterventionRecord[], body: (applied: InterventionResult) => Promise<T>): Promise<T> {
    const record: InterventionRecord = { name: spec.name, applied: null, restoreResult: 'not-attempted', detail: null };
    log.push(record);
    try {
        const applied = await spec.apply();
        record.applied = applied.ok;
        return await body(applied);
    } finally {
        try {
            const restored = await spec.restore();
            record.restoreResult = spec.isRestored(restored) ? 'restored' : 'failed';
            if (record.restoreResult === 'failed') record.detail = `the restoration call returned ${JSON.stringify(restored)}`;
        } catch (error) {
            record.restoreResult = 'failed';
            record.detail = describeError(error);
        }
    }
}

function bandClassRemoval(page: Page): InterventionSpec {
    const set = (present: boolean) => (): Promise<InterventionResult> =>
        intervene(page, { curtainSelector: CURTAIN_SELECTOR, bandClass: BAND_CLASS, kind: 'band-class', classPresent: present, displayValue: '' });
    return {
        name: `remove the ${BAND_CLASS} class from the renderer root`,
        apply: set(false),
        restore: set(true),
        isRestored: (result) => result.ok && result.classPresent === true,
    };
}

function curtainHidden(page: Page, priorInlineDisplay: string): InterventionSpec {
    const set = (value: string) => (): Promise<InterventionResult> =>
        intervene(page, { curtainSelector: CURTAIN_SELECTOR, bandClass: BAND_CLASS, kind: 'curtain-display', classPresent: true, displayValue: value });
    return {
        name: 'set the curtain inline display to none',
        apply: set('none'),
        restore: set(priorInlineDisplay),
        isRestored: (result) => result.ok && result.inlineDisplay === priorInlineDisplay,
    };
}

// ── Held-404 paint cases: P1, P2, N1 and N2 ──────────────────────────────────────────────────────────

interface PaintCaseSpec {
    id: 'P1' | 'P2' | 'N1' | 'N2';
    title: string;
    project: string;
    /** Null keeps the project's own viewport (no case does now). */
    viewport: { width: number; height: number } | null;
    /** The Desktop footer-hole rule: active (P1, P2) or inactive (N1, N2). */
    expectation: 'rule-active' | 'rule-inactive';
    /** The narrow-portrait stacking rule: active (N1, N2: curtain rank 49, mobile bar footprint judged) or inactive (P1, P2: rank 5000). */
    phoneRule: 'active' | 'inactive';
    /** Required geometric relation of the curtain box to the judged footprint (the transport bar, or the mobile bar when the phone rule is active): an applicability precondition, never a failure criterion. */
    overlap: OverlapKind | null;
}

const CASE_P1: PaintCaseSpec = { id: 'P1', title: TITLE_P1, project: DESKTOP_PROJECT, viewport: { width: 1280, height: 720 }, expectation: 'rule-active', phoneRule: 'inactive', overlap: 'partial' };
const CASE_P2: PaintCaseSpec = { id: 'P2', title: TITLE_P2, project: DESKTOP_PROJECT, viewport: { width: 1280, height: 640 }, expectation: 'rule-active', phoneRule: 'inactive', overlap: 'full' };
const CASE_N1: PaintCaseSpec = { id: 'N1', title: TITLE_N1, project: DESKTOP_PROJECT, viewport: { width: 649, height: 720 }, expectation: 'rule-inactive', phoneRule: 'active', overlap: 'partial' };
// 412 is the Pixel 7 preset width; 700 is chosen so that the 600px fixture curtain (box 80..680) overlaps the 81px mobile bar (619..700).
const CASE_N2: PaintCaseSpec = { id: 'N2', title: TITLE_N2, project: MOBILE_PROJECT, viewport: { width: 412, height: 700 }, expectation: 'rule-inactive', phoneRule: 'active', overlap: 'partial' };

type CaptureName = 'rule' | 'old' | 'reference';

interface CaptureRecord {
    name: CaptureName;
    fileName: string;
    sha256: string;
    bytes: number;
    png: { width: number; height: number };
    configuredViewport: { width: number; height: number };
    viewportAgreement: ViewportAgreement;
    /** Fields that differ between the probe before and the probe after the screenshot call. Empty means the compared fields matched. */
    bracketDifferences: string[];
    /** Failed load-state reads around the screenshot. Empty means both reads produced a state; a non-empty list makes the capture invalid. */
    loadStateIssues: string[];
}

interface CapturedImage {
    record: CaptureRecord;
    png: Buffer;
}

/** One viewport PNG (scale css), bracketed by two probes. The PNG size is compared with the CONFIGURED viewport. */
async function captureWithBracket(
    page: Page,
    testInfo: TestInfo,
    spec: PaintCaseSpec,
    name: CaptureName,
    configured: { width: number; height: number },
    deadline: Deadline,
): Promise<CapturedImage> {
    const before = await readProbe(page);
    const loadBefore = await readLoadState(page);
    const fileName = `footer-hole-${spec.id}-${name}-${configured.width}x${configured.height}.png`;
    const png = await page.screenshot({
        path: testInfo.outputPath(fileName),
        type: 'png',
        scale: 'css',
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        style: HIDE_DEV_INDICATOR_CSS,
        timeout: deadline.budget(`capture ${name}`, CAPTURE_BUDGET_MS),
    });
    const after = await readProbe(page);
    const loadAfter = await readLoadState(page);
    const decoded = decodePng(png);
    const bracket = describeBracket(before, after, loadBefore, loadAfter, { before: 'before the screenshot', after: 'after the screenshot' });
    return {
        png,
        record: {
            name,
            fileName,
            sha256: sha256(png),
            bytes: png.length,
            png: { width: decoded.width, height: decoded.height },
            configuredViewport: configured,
            viewportAgreement: checkViewportAgreement({
                configured,
                inner: { width: before.innerWidth, height: before.innerHeight },
                devicePixelRatio: before.devicePixelRatio,
                png: { width: decoded.width, height: decoded.height },
            }),
            bracketDifferences: bracket.differences,
            loadStateIssues: bracket.loadStateIssues,
        },
    };
}

/** State preconditions of a case. Each names the unmet condition and implies no product cause. Viewport validity is checked separately. */
function preconditionViolations(spec: PaintCaseSpec, probe: PaintProbe): string[] {
    const violations: string[] = [];
    if (probe.curtainCount !== 1 || probe.curtain === null) {
        violations.push(`${CURTAIN_SELECTOR} resolves to ${probe.curtainCount} element(s), expected exactly one (the served build may predate the hook)`);
        return violations;
    }
    const curtain = probe.curtain;
    const transport = chromeEntry(probe, 'transportBar');
    const mobileBar = chromeEntry(probe, 'mobileBar');
    const phone = spec.phoneRule === 'active';
    if (!probe.ruleInStylesheets.found) violations.push('no loaded stylesheet holds the Desktop footer-hole rule for .maestro-curtain-band > [data-maestro-curtain] (a rule declaring a background property; the served build may predate it)');
    if (!probe.phoneRuleInStylesheets.found) violations.push('no loaded stylesheet holds the phone stacking rule for .maestro-curtain-band > [data-maestro-curtain] (a rule declaring z-index; the served build may predate it)');
    if (!curtain.parentHasBandClass) violations.push(`the renderer root lacks the ${BAND_CLASS} class (the served build may predate page.tsx's className)`);
    if (curtain.display !== 'block' || curtain.visibility !== 'visible' || !(parseFloat(curtain.opacity) > 0)) violations.push('the curtain is not displayed by computed style');
    const expectedZIndex = phone ? PHONE_CURTAIN_Z_INDEX : DEFAULT_CURTAIN_Z_INDEX;
    if (curtain.position !== 'absolute' || curtain.zIndex !== expectedZIndex || curtain.pointerEvents !== 'none') {
        violations.push(
            `the curtain position/z-index/pointer-events are ${curtain.position}/${curtain.zIndex}/${curtain.pointerEvents}, expected absolute/${expectedZIndex}/none (the phone stacking rule is ${phone ? 'active' : 'inactive'} in this case)`,
        );
    }
    if (probe.phoneRuleMediaMatches !== phone) {
        violations.push(`matchMedia('${PHONE_RULE_MEDIA_QUERY}') is ${probe.phoneRuleMediaMatches}, but this case requires it to be ${phone}`);
    }
    const fill = parseOpaqueRgb(curtain.inlineBackgroundColor);
    if (fill === null) violations.push(`the curtain inline background colour "${curtain.inlineBackgroundColor}" is not an opaque rgb value`);
    if (spec.expectation === 'rule-active') {
        if (!probe.ruleMediaMatches) violations.push(`matchMedia('${RULE_MEDIA_QUERY}') is false, but this case requires the rule's media condition to hold`);
        if ((curtain.backgroundImage.match(/linear-gradient/g) || []).length !== 2) {
            violations.push(`the curtain background-image is "${curtain.backgroundImage}", expected two linear-gradient layers`);
        }
        if (!/^fixed(, fixed)*$/.test(curtain.backgroundAttachment)) violations.push(`the curtain background-attachment is "${curtain.backgroundAttachment}", expected fixed`);
        if (curtain.backgroundColor !== 'rgba(0, 0, 0, 0)') violations.push(`the curtain background-color is "${curtain.backgroundColor}", expected transparent`);
        const computedColor = parseOpaqueRgb(curtain.color);
        if (fill !== null && (computedColor === null || fill.join(',') !== computedColor.join(','))) {
            violations.push(`the curtain computed colour "${curtain.color}" does not equal its inline fill "${curtain.inlineBackgroundColor}"`);
        }
        if (!entryDisplayed(transport) || transport.rect === null) {
            violations.push('the Desktop transport bar is not exactly one displayed element');
        } else if (spec.overlap !== null) {
            const kind = overlapKind(curtain.rect, transport.rect);
            if (kind !== spec.overlap) {
                violations.push(`the curtain box overlaps the transport footprint as '${kind}', but this case is only applicable to '${spec.overlap}' (an applicability precondition, not a paint failure)`);
            }
        }
    } else {
        if (probe.ruleMediaMatches) violations.push(`matchMedia('${RULE_MEDIA_QUERY}') is true, but this negative control requires it to be false`);
        if (curtain.backgroundImage !== 'none') violations.push(`the curtain background-image is "${curtain.backgroundImage}", expected none (rule inactive)`);
        if (curtain.backgroundAttachment !== 'scroll') violations.push(`the curtain background-attachment is "${curtain.backgroundAttachment}", expected scroll (rule inactive)`);
        const computed = parseOpaqueRgb(curtain.backgroundColor);
        if (fill !== null && (computed === null || fill.join(',') !== computed.join(','))) {
            violations.push(`the curtain background-color "${curtain.backgroundColor}" differs from its inline fill "${curtain.inlineBackgroundColor}" (rule inactive means the fill is untouched)`);
        }
        if (phone) {
            if (!entryDisplayed(mobileBar) || mobileBar.rect === null) {
                violations.push('the mobile control bar is not exactly one displayed element');
            } else if (spec.overlap !== null) {
                const kind = overlapKind(curtain.rect, mobileBar.rect);
                if (kind !== spec.overlap) {
                    violations.push(`the curtain box overlaps the mobile bar footprint as '${kind}', but this case is only applicable to '${spec.overlap}' (an applicability precondition, not a paint failure)`);
                }
            }
        }
    }
    return violations;
}

function toRect(rect: ProbeRect): Rect {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

interface EvaluationSet {
    rule: PaintEvaluation;
    old: PaintEvaluation | null;
    crossRuleAsOld: PaintEvaluation | null;
    crossOldAsHole: PaintEvaluation | null;
}

async function runPaintCase(page: Page, context: BrowserContext, testInfo: TestInfo, spec: PaintCaseSpec): Promise<void> {
    const deadline = createDeadline(OVERALL_DEADLINE_MS);
    const repoRoot = resolveRepoRoot(testInfo.config);
    const tracker = trackErrors(page);
    const stages: StageRecord[] = [];
    /** The phone stacking rule is active in this case: the judged footprint is the mobile bar and the models are 'stack' and 'covered'. */
    const phone = spec.phoneRule === 'active';
    const ruleModel: PaintVariant = phone ? 'stack' : 'hole';
    const oldModel: PaintVariant = phone ? 'covered' : 'old';
    /** A case with a rule under test also takes the old-behaviour capture (class removed) as its positive control. */
    const reverts = spec.expectation === 'rule-active' || phone;
    if (spec.viewport !== null) await page.setViewportSize(spec.viewport);
    const configured = page.viewportSize();
    await installDocStartObserver(context);
    const ledger = await installFixtureTransport(context, { devOrigin: resolveDevOrigin(testInfo), repoRoot, fixtureMode: 'not-found' });

    const reasons: string[] = [];
    /** Reasons that make the capture set unusable: reported INVALID CAPTURE, never a pass or a failure. */
    const invalidating: string[] = [];
    const invalidate = (reason: string): void => {
        reasons.push(reason);
        invalidating.push(reason);
    };
    const interventions: InterventionRecord[] = [];
    const captures: CaptureRecord[] = [];
    let flowError: string | null = null;
    let initialProbe: PaintProbe | null = null;
    let initialAgreement: ViewportAgreement | null = null;
    let initialLoadRead: LoadStateRead | null = null;
    let finalLoadRead: LoadStateRead | null = null;
    let evaluation: EvaluationSet | null = null;
    let preconditions: string[] = [];
    let verdict: PaintVerdict = 'INVALID CAPTURE';

    const noteCapture = (shot: CapturedImage): CapturedImage => {
        captures.push(shot.record);
        for (const reason of captureInvalidations(shot.record)) invalidate(reason);
        return shot;
    };

    const watcher = watchLoadingFailure(page, CLASSIFIED_404_PATTERN);
    try {
        // Same prerequisites as the accepted deliberate-404 flow: the curtain stays displayed over a loaded shell.
        await navigateAndWaitForShell(page, deadline, SHELL_PATH, stages);
        await waitForCatalogueAndResolution(ledger, deadline, stages);
        await waitForOwnedApi(page, deadline, stages);
        await ledger.waitFor((l) => l.counts.fixtureNotFound >= 1, deadline.budget('fixture 404', STAGE_BUDGET_MS.R3), 'the fixture request was answered with the deliberate 404');
        await watcher.wait(deadline.budget('classified loading failure', STAGE_BUDGET_MS.classifiedFailure));
        const absence = await observeLoadFailureAbsence(page, deadline, stages);
        if (absence.consecutiveComparisons < ABSENCE_STABLE_COMPARISONS) reasons.push('the bounded absence observation did not complete its comparisons');

        const initial = await readProbe(page);
        const initialLoad = await readLoadState(page);
        initialLoadRead = initialLoad;
        if (initialLoad.state === null) {
            invalidate(
                `LOAD-STATE-UNAVAILABLE: the load-failure state could not be read in the initial state read (${initialLoad.error === null ? 'no state returned' : initialLoad.error}); the loading state is not evidenced and no capture is taken`,
            );
        }
        initialProbe = initial;
        initialAgreement = checkViewportAgreement({
            configured,
            inner: { width: initial.innerWidth, height: initial.innerHeight },
            devicePixelRatio: initial.devicePixelRatio,
            png: null,
        });
        for (const issue of initialAgreement.issues) invalidate(issue);
        preconditions = preconditionViolations(spec, initial);

        if (preconditions.length === 0 && initialAgreement.ok && initialLoad.state !== null && initial.curtain !== null && configured !== null) {
            const fill = parseOpaqueRgb(initial.curtain.inlineBackgroundColor) as Rgb;
            const transport = chromeEntry(initial, 'transportBar');
            const mobileBar = chromeEntry(initial, 'mobileBar');
            const chromeRects = initial.chrome.filter((entry) => entryDisplayed(entry)).map((entry) => toRect(entry.rect as ProbeRect));
            const baseInput: Omit<PaintInput, 'variant'> = {
                viewport: { width: configured.width, height: configured.height },
                box: toRect(initial.curtain.rect),
                // The judged footprint: the Desktop transport bar when the Desktop rule is active, the mobile bar when the phone rule is.
                footer: spec.expectation === 'rule-active' && transport.rect !== null ? toRect(transport.rect) : phone && mobileBar.rect !== null ? toRect(mobileBar.rect) : null,
                // A case with neither rule claims nothing about chrome pixels: displayed chrome is counted and left out. The phone
                // cases judge only the bar footprint, so nothing is left out there.
                ignore: spec.expectation === 'rule-inactive' && !phone ? chromeRects : [],
                fill,
                rootFontPx: initial.rootFontPx,
            };

            const ruleShot = noteCapture(await captureWithBracket(page, testInfo, spec, 'rule', configured, deadline));

            let oldShot: CapturedImage | null = null;
            if (reverts) {
                oldShot = await withIntervention(bandClassRemoval(page), interventions, async (applied) => {
                    const now = await readProbe(page);
                    if (!applied.ok || now.curtain === null || now.curtain.parentHasBandClass || (phone ? now.curtain.zIndex !== DEFAULT_CURTAIN_Z_INDEX : now.curtain.backgroundImage !== 'none')) {
                        invalidate(`the old-behaviour intervention did not take effect (class still present or ${phone ? 'z-index not 5000' : 'background-image not none'}): the positive control is unavailable`);
                        return null;
                    }
                    return noteCapture(await captureWithBracket(page, testInfo, spec, 'old', configured, deadline));
                });
            }

            const referenceShot = await withIntervention(curtainHidden(page, initial.curtain.inlineDisplay), interventions, async (applied) => {
                const now = await readProbe(page);
                if (!applied.ok || now.curtain === null || now.curtain.display !== 'none') {
                    invalidate('the reference state was not reached (the curtain display is not none)');
                    return null;
                }
                return noteCapture(await captureWithBracket(page, testInfo, spec, 'reference', configured, deadline));
            });

            // Every intervention has been through its finally block here: verify the restorations and the final state.
            for (const record of interventions) {
                if (record.restoreResult !== 'restored') invalidate(`intervention "${record.name}" was not restored (${record.restoreResult}${record.detail === null ? '' : `: ${record.detail}`})`);
            }
            const finalProbe = await readProbe(page);
            const finalLoad = await readLoadState(page);
            finalLoadRead = finalLoad;
            const finalBracket = describeBracket(initial, finalProbe, initialLoad, finalLoad, { before: 'in the initial state read', after: 'in the final state read' });
            for (const issue of finalBracket.loadStateIssues) invalidate(issue);
            if (finalBracket.differences.length > 0) invalidate(`the final probed state differs from the initial one after the restorations: ${finalBracket.differences.join('; ')}`);

            if (invalidating.length === 0 && referenceShot !== null) {
                const variantForRule: PaintVariant = reverts ? ruleModel : 'old';
                evaluation = { rule: evaluatePaint({ ...baseInput, variant: variantForRule }, ruleShot.png, referenceShot.png), old: null, crossRuleAsOld: null, crossOldAsHole: null };
                if (reverts && oldShot !== null) {
                    evaluation.old = evaluatePaint({ ...baseInput, variant: oldModel }, oldShot.png, referenceShot.png);
                    evaluation.crossRuleAsOld = evaluatePaint({ ...baseInput, variant: oldModel }, ruleShot.png, referenceShot.png);
                    evaluation.crossOldAsHole = evaluatePaint({ ...baseInput, variant: ruleModel }, oldShot.png, referenceShot.png);
                }
            }
        }
    } catch (error) {
        flowError = describeError(error);
    } finally {
        watcher.dispose();
    }

    // Verdict. INVALID CAPTURE outranks FAIL: an invalid capture supports neither a pass nor a failure claim.
    if (flowError !== null) {
        reasons.unshift(`the case flow failed: ${flowError}; no product cause is implied`);
        for (const record of interventions) {
            if (record.restoreResult !== 'restored') reasons.push(`intervention "${record.name}" restoration: ${record.restoreResult}${record.detail === null ? '' : ` (${record.detail})`}`);
        }
    } else if (preconditions.length > 0) {
        reasons.push(...preconditions);
    } else if (invalidating.length === 0 && evaluation !== null) {
        verdict = evaluation.rule.verdict;
        for (const item of [evaluation.rule, evaluation.old, evaluation.crossRuleAsOld, evaluation.crossOldAsHole]) {
            if (item !== null) reasons.push(...item.invalidReasons, ...item.failReasons, ...item.partialReasons);
        }
        if (reverts) {
            // The positive control and the cross-evaluations must behave as modelled, or the check cannot be trusted.
            if (evaluation.old === null) {
                verdict = worseVerdict(verdict, 'INVALID CAPTURE');
                reasons.push('the old-behaviour capture is missing');
            } else if (evaluation.old.verdict !== 'PASS') {
                verdict = worseVerdict(verdict, 'INVALID CAPTURE');
                reasons.push(`positive control: the old-behaviour capture did not match the '${oldModel}' model (${evaluation.old.verdict}); the evaluator cannot be trusted on this page`);
            }
            if (evaluation.crossRuleAsOld !== null && evaluation.crossRuleAsOld.verdict !== 'FAIL') {
                verdict = worseVerdict(verdict, 'INVALID CAPTURE');
                reasons.push(`negative control: the rule capture judged by the '${oldModel}' model was ${evaluation.crossRuleAsOld.verdict}, expected FAIL`);
            }
            if (evaluation.crossOldAsHole !== null && evaluation.crossOldAsHole.verdict !== 'FAIL') {
                verdict = worseVerdict(verdict, 'INVALID CAPTURE');
                reasons.push(`negative control: the old capture judged by the '${ruleModel}' model was ${evaluation.crossOldAsHole.verdict}, expected FAIL`);
            }
        }
    } else if (invalidating.length === 0) {
        reasons.push('no evaluation was produced');
    }

    const endpoint = endpointViolations(ledger, tracker, true);
    const browser = context.browser();
    console.log(
        `${OUTPUT_JSON_LABEL} ${JSON.stringify({
            case: spec.id,
            title: spec.title,
            project: testInfo.project.name,
            browserVersion: browser === null ? null : browser.version(),
            evidenceClass: phone ? CLAIM_PHONE_TRAY_EXPOSURE : CLAIM_HELD_404_PAINT,
            liveObservationNote: LIVE_OBSERVATION_NOTE,
            geometryNote: GEOMETRY_NOTE,
            bracketLimit: BRACKET_LIMIT,
            expectation: spec.expectation,
            phoneRule: spec.phoneRule,
            applicableOverlap: spec.overlap,
            configuredViewport: configured,
            fixtureMode: 'not-found',
            freshState: 'new browser context, service workers blocked, no storage seeded',
            initialViewportAgreement: initialAgreement,
            loadStateReads: { initial: initialLoadRead, final: finalLoadRead },
            initialProbe,
            preconditionViolations: preconditions,
            interventions,
            captures,
            evaluation,
            outcome: { id: spec.id, verdict, reasons, validityIssues: invalidating },
            endpointViolations: endpoint,
            stages,
            nodeElapsedMs: deadline.elapsedMs(),
            limits: PAINT_LIMITS,
        })}`,
    );

    expect(flowError, `the case flow completed (${flowError ?? 'no error'})`).toBeNull();
    expect(preconditions, 'the page state meets the case preconditions').toEqual([]);
    expect(invalidating, 'INVALID CAPTURE: explicit validity issues (viewport, screenshot size, bracketing, interventions)').toEqual([]);
    if (reverts) {
        expect(verdict, `${spec.id} painted verdict (must be PASS; PARTIAL does not pass a case with an active rule): ${reasons.join(' | ')}`).toBe('PASS');
    } else {
        expect(['PASS', 'PARTIAL'], `${spec.id} painted verdict was ${verdict}: ${reasons.join(' | ')}`).toContain(verdict);
    }
    expect(interventions.filter((record) => record.restoreResult !== 'restored'), 'every intervention was restored').toEqual([]);
    expect(endpoint, 'unexpected requests, page errors and fatal console errors').toEqual([]);
}

const PAINT_LIMITS: readonly string[] = [
    'painted evidence is taken in the deliberate-404 state (the curtain stays displayed), not during a successful load',
    'one headless Chromium on one OS; no Safari, WebKit or Firefox, no physical device, no installed PWA',
    "the Desktop Chrome preset has a classic 15px scrollbar gutter, so the rule's overlay-scrollbar branch (gutter 0) is not exercised in the real app",
    "the fixture's curtain root is its 600px min-height; a real song's root is thousands of pixels, which is INFERRED to give the same footer geometry because the rule's layers are viewport-fixed",
    'captures use animations disabled, caret hidden and the Next dev indicator hidden for the capture only; the reference is made by setting the curtain inline display to none and restoring it',
    'PNG pixels are compared exactly outside a 2px margin around the curtain box and the right-column edge; no timing is measured',
    'N1 and N2 prove the Desktop rule inactive and the phone stacking rule active by computed style and media state, and judge only the mobile bar footprint (inset 2px) by pixels, so they establish tray exposure only: other pixels inside the curtain box are not judged because shell layers that rank above the curtain by design also paint there (INFERRED from source, not measured)',
    'score coverage under the phone rank is not evidenced here: the held 404 loads no score, so that the curtain still hides it follows only from the unchanged box and fill and a rank above the score layer (INFERRED)',
    'that the mobile bar is positioned and rendered correctly on an iPhone, its safe-area padding included, is not evidenced; rotation, mobile landscape and coarse-pointer viewports at or above 650px are not covered',
    BRACKET_LIMIT,
    'a coarse-pointer viewport at or above 650px, rotation, zoom and device pixel ratio above 1 are not covered',
];

// ── L1: successful load, per-frame curtain style sampling, time-based observation window ─────────────

const SAMPLER_KEY = '__e2eFooterHoleSampler';

/**
 * Plain JavaScript (not a transpiled function) so no helper binding can leak into the page. Config is injected as JSON. The
 * same text is installed as the init script and run in an isolated vm context by the browser-free controls.
 */
const SAMPLER_SOURCE = `(function () {
    'use strict';
    if (window.top !== window) return;
    var CFG = __CONFIG__;
    if (window[CFG.key] !== undefined) return;
    var ids = new WeakMap();
    var nextId = 1;
    var idOf = function (el) { var v = ids.get(el); if (v === undefined) { v = nextId; nextId += 1; ids.set(el, v); } return v; };
    var mq = window.matchMedia(CFG.ruleQuery);
    var s = {
        frames: 0, nowMs: 0, curtainState: 'unknown',
        resolvedFrames: 0, ambiguousFrames: 0, absentFrames: 0, displayedFrames: 0, hiddenFrames: 0,
        episodes: 0, anchorMs: null, anchorFrame: null, firstHideMs: null, latestHideMs: null, latestShowMs: null,
        hiddenRunStartMs: null,
        hides: 0, reShowsAfterFirstHide: 0,
        satisfiedNow: false, firstSatisfiedMs: null, cancellationsByReShow: 0, cancellationsByUnknown: 0,
        capReached: false, capSnapshot: null, frameCapReached: false, stopped: false,
        ruleMediaActiveDisplayedFrames: 0, ruleActiveDisplayedFrames: 0, ruleInactiveDisplayedFrames: 0, firstInactiveSample: null,
        identities: [], innerWidth: null, innerHeight: null, viewportChanges: 0
    };
    var prevState = null;
    var hideSeen = false;
    var snapshot = function () {
        var copy = JSON.parse(JSON.stringify(s));
        copy.sinceAnchorMs = s.anchorMs === null ? null : s.nowMs - s.anchorMs;
        copy.sinceLatestHideMs = s.latestHideMs === null ? null : s.nowMs - s.latestHideMs;
        copy.sinceHiddenRunMs = s.hiddenRunStartMs === null ? null : s.nowMs - s.hiddenRunStartMs;
        return copy;
    };
    var frame = function () {
        if (s.stopped) return;
        var t = window.performance.now();
        s.frames += 1;
        s.nowMs = t;
        if (s.innerWidth !== null && (s.innerWidth !== window.innerWidth || s.innerHeight !== window.innerHeight)) s.viewportChanges += 1;
        s.innerWidth = window.innerWidth;
        s.innerHeight = window.innerHeight;
        var found = document.querySelectorAll(CFG.curtainSelector);
        var state = 'unknown';
        var cs = null;
        if (found.length === 1) {
            s.resolvedFrames += 1;
            cs = window.getComputedStyle(found[0]);
            state = cs.display !== 'none' && cs.visibility === 'visible' && parseFloat(cs.opacity) > 0 ? 'displayed' : 'hidden';
            var id = idOf(found[0]);
            if (s.identities.indexOf(id) < 0 && s.identities.length < 8) s.identities.push(id);
        } else if (found.length > 1) { s.ambiguousFrames += 1; } else { s.absentFrames += 1; }
        if (state === 'displayed') {
            s.displayedFrames += 1;
            if (s.anchorMs === null) { s.anchorMs = t; s.anchorFrame = s.frames; }
            if (prevState !== 'displayed') {
                s.episodes += 1;
                s.latestShowMs = t;
                if (s.firstHideMs !== null) s.reShowsAfterFirstHide += 1;
            }
            hideSeen = false;
            s.hiddenRunStartMs = null;
            if (mq.matches) {
                s.ruleMediaActiveDisplayedFrames += 1;
                var layers = (cs.backgroundImage.match(/linear-gradient/g) || []).length;
                var active = layers === 2 && cs.backgroundAttachment.indexOf('fixed') === 0 && cs.backgroundColor === 'rgba(0, 0, 0, 0)';
                if (active) { s.ruleActiveDisplayedFrames += 1; }
                else {
                    s.ruleInactiveDisplayedFrames += 1;
                    if (s.firstInactiveSample === null) s.firstInactiveSample = { frame: s.frames, backgroundImage: cs.backgroundImage.slice(0, 160), backgroundAttachment: cs.backgroundAttachment, backgroundColor: cs.backgroundColor };
                }
            }
        } else if (state === 'hidden') {
            s.hiddenFrames += 1;
            if (prevState === 'displayed') {
                s.hides += 1;
                s.latestHideMs = t;
                if (s.firstHideMs === null) s.firstHideMs = t;
                hideSeen = true;
                s.hiddenRunStartMs = t;
            } else if (prevState !== 'hidden' && hideSeen) {
                s.hiddenRunStartMs = t;
            }
        } else {
            s.hiddenRunStartMs = null;
        }
        var sinceAnchor = s.anchorMs === null ? null : t - s.anchorMs;
        var wasSat = s.satisfiedNow;
        var met = state === 'hidden' && sinceAnchor !== null && s.hiddenRunStartMs !== null && sinceAnchor >= CFG.minFromAnchorMs && (t - s.hiddenRunStartMs) >= CFG.minAfterLatestHideMs;
        var blockedLate = met && !wasSat && sinceAnchor > CFG.capFromAnchorMs;
        var sat = met && !blockedLate;
        if (wasSat && !sat) { if (state === 'displayed') { s.cancellationsByReShow += 1; } else { s.cancellationsByUnknown += 1; } }
        if (sat && s.firstSatisfiedMs === null) s.firstSatisfiedMs = t;
        s.satisfiedNow = sat;
        s.curtainState = state;
        prevState = state;
        if (s.anchorMs !== null && !sat && sinceAnchor >= CFG.capFromAnchorMs) {
            s.capReached = true;
            s.capSnapshot = {
                atMs: t, sinceAnchorMs: sinceAnchor, curtainState: state,
                sinceLatestHideMs: s.latestHideMs === null ? null : t - s.latestHideMs,
                sinceHiddenRunMs: s.hiddenRunStartMs === null ? null : t - s.hiddenRunStartMs,
                conditionsMetButLate: blockedLate
            };
            s.stopped = true;
            return;
        }
        if (s.frames >= CFG.maxFrames) { s.frameCapReached = true; s.stopped = true; return; }
        window.requestAnimationFrame(frame);
    };
    window[CFG.key] = {
        status: snapshot,
        stop: function () { s.stopped = true; return snapshot(); }
    };
    window.requestAnimationFrame(frame);
})();`;

type CurtainState = 'displayed' | 'hidden' | 'unknown';

interface SamplerStatus {
    frames: number;
    nowMs: number;
    curtainState: CurtainState;
    resolvedFrames: number;
    ambiguousFrames: number;
    absentFrames: number;
    displayedFrames: number;
    hiddenFrames: number;
    episodes: number;
    anchorMs: number | null;
    anchorFrame: number | null;
    firstHideMs: number | null;
    latestHideMs: number | null;
    latestShowMs: number | null;
    hiddenRunStartMs: number | null;
    hides: number;
    reShowsAfterFirstHide: number;
    satisfiedNow: boolean;
    firstSatisfiedMs: number | null;
    cancellationsByReShow: number;
    cancellationsByUnknown: number;
    capReached: boolean;
    capSnapshot: {
        atMs: number;
        sinceAnchorMs: number;
        curtainState: CurtainState;
        sinceLatestHideMs: number | null;
        sinceHiddenRunMs: number | null;
        /** Every settle condition held at this callback, but it arrived after the deadline, so no new endpoint could be established. */
        conditionsMetButLate: boolean;
    } | null;
    frameCapReached: boolean;
    stopped: boolean;
    ruleMediaActiveDisplayedFrames: number;
    ruleActiveDisplayedFrames: number;
    ruleInactiveDisplayedFrames: number;
    firstInactiveSample: { frame: number; backgroundImage: string; backgroundAttachment: string; backgroundColor: string } | null;
    identities: number[];
    innerWidth: number | null;
    innerHeight: number | null;
    viewportChanges: number;
    sinceAnchorMs: number | null;
    sinceLatestHideMs: number | null;
    sinceHiddenRunMs: number | null;
}

function buildSamplerSource(): string {
    const config = {
        key: SAMPLER_KEY,
        curtainSelector: CURTAIN_SELECTOR,
        ruleQuery: RULE_MEDIA_QUERY,
        maxFrames: SAMPLER_FRAME_SAFETY_CAP,
        minFromAnchorMs: OBSERVATION_POLICY.minFromAnchorMs,
        minAfterLatestHideMs: OBSERVATION_POLICY.minAfterLatestHideMs,
        capFromAnchorMs: OBSERVATION_POLICY.capFromAnchorMs,
    };
    return SAMPLER_SOURCE.replace('__CONFIG__', JSON.stringify(config));
}

type WaitOutcome = 'ready' | 'bound-elapsed' | 'not-waited';

interface ObservationJudgement {
    settled: boolean;
    reasons: string[];
}

/**
 * Judges the observation from the sampler's final read. The endpoint is re-derived from the reported times rather than
 * trusted from the in-page flag; an active or unknown curtain at the cap is incomplete, never a pass.
 */
function judgeObservationEndpoint(status: SamplerStatus | null, wait: WaitOutcome): ObservationJudgement {
    if (status === null) return { settled: false, reasons: ['incomplete: the in-page sampler could not be read'] };
    if (status.anchorMs === null) return { settled: false, reasons: ['incomplete: the curtain was never observed displayed, so the start anchor was not established'] };
    const reasons: string[] = [];
    if (status.frameCapReached) reasons.push('incomplete: the sampler frame safety cap was reached before the endpoint');
    if (status.satisfiedNow) {
        if (status.curtainState !== 'hidden') reasons.push(`incomplete: the endpoint flag is set but the final curtain state is ${status.curtainState}`);
        if (status.sinceAnchorMs === null || status.sinceAnchorMs < OBSERVATION_POLICY.minFromAnchorMs) {
            reasons.push(`incomplete: ${String(status.sinceAnchorMs)} ms since the anchor, less than the required ${OBSERVATION_POLICY.minFromAnchorMs} ms`);
        }
        if (status.sinceHiddenRunMs === null || status.sinceHiddenRunMs < OBSERVATION_POLICY.minAfterLatestHideMs) {
            reasons.push(
                `incomplete: ${String(status.sinceHiddenRunMs)} ms of continuous known-hidden observation, less than the required ${OBSERVATION_POLICY.minAfterLatestHideMs} ms`,
            );
        }
        return { settled: reasons.length === 0, reasons };
    }
    if (status.capReached && status.capSnapshot !== null) {
        const snap = status.capSnapshot;
        if (snap.curtainState === 'displayed') {
            reasons.push(`incomplete: the curtain was active (displayed) at the ${OBSERVATION_POLICY.capFromAnchorMs} ms cap`);
        } else if (snap.curtainState === 'unknown') {
            reasons.push(`incomplete: the curtain state was unknown (absent or ambiguous) at the ${OBSERVATION_POLICY.capFromAnchorMs} ms cap`);
        } else if (snap.conditionsMetButLate) {
            reasons.push(
                `incomplete: the settle conditions were met only by a callback ${snap.sinceAnchorMs} ms after the anchor, after the ${OBSERVATION_POLICY.capFromAnchorMs} ms deadline; an endpoint cannot be established after the deadline`,
            );
        } else if (snap.sinceHiddenRunMs === null) {
            reasons.push(
                `incomplete: the curtain was hidden at the ${OBSERVATION_POLICY.capFromAnchorMs} ms cap but no continuous hidden run following an observed hide was in progress (an unknown interval interrupted it, or the hide was not observed)`,
            );
        } else {
            reasons.push(
                `incomplete: the curtain was hidden at the cap but only ${snap.sinceHiddenRunMs} ms of continuous known-hidden observation (${String(snap.sinceLatestHideMs)} ms since its latest hide), less than the required ${OBSERVATION_POLICY.minAfterLatestHideMs} ms`,
            );
        }
    } else {
        reasons.push(`incomplete: neither the endpoint nor the cap was reached (${wait}); the curtain state at the last sampled frame was ${status.curtainState}`);
    }
    if (status.cancellationsByReShow > 0) reasons.push(`a re-show cancelled a previously satisfied endpoint ${status.cancellationsByReShow} time(s)`);
    return { settled: false, reasons };
}

/** Resolves when the sampler reports the endpoint, the cap or a stop; a Node-side bound elapsing is reported, not thrown. */
async function waitForObservationEndpoint(page: Page, timeoutMs: number): Promise<WaitOutcome> {
    try {
        await page.waitForFunction(
            (key: string): boolean => {
                const w = window as unknown as Record<string, { status?: () => { satisfiedNow: boolean; capReached: boolean; stopped: boolean } } | undefined>;
                const handle = w[key];
                if (handle === undefined || typeof handle.status !== 'function') return false;
                const state = handle.status();
                return state.satisfiedNow === true || state.capReached === true || state.stopped === true;
            },
            SAMPLER_KEY,
            { timeout: timeoutMs },
        );
        return 'ready';
    } catch (error) {
        if (error instanceof errors.TimeoutError) return 'bound-elapsed';
        throw error;
    }
}

async function readSamplerStatus(page: Page): Promise<SamplerStatus | null> {
    return page
        .evaluate((key: string): SamplerStatus | null => {
            const w = window as unknown as Record<string, { status?: () => SamplerStatus } | undefined>;
            const handle = w[key];
            return handle !== undefined && typeof handle.status === 'function' ? handle.status() : null;
        }, SAMPLER_KEY)
        .catch(() => null);
}

/** The one final read: it stops the sampler and returns its state. */
async function stopSampler(page: Page): Promise<SamplerStatus | null> {
    return page
        .evaluate((key: string): SamplerStatus | null => {
            const w = window as unknown as Record<string, { stop?: () => SamplerStatus } | undefined>;
            const handle = w[key];
            return handle !== undefined && typeof handle.stop === 'function' ? handle.stop() : null;
        }, SAMPLER_KEY)
        .catch(() => null);
}

async function runL1(page: Page, context: BrowserContext, testInfo: TestInfo): Promise<void> {
    const deadline = createDeadline(OVERALL_DEADLINE_MS);
    const repoRoot = resolveRepoRoot(testInfo.config);
    const tracker = trackErrors(page);
    const navigations = trackMainFrameNavigations(page);
    const viewport = { width: 1280, height: 720 };
    await page.setViewportSize(viewport);
    const configured = page.viewportSize();
    await installDocStartObserver(context);
    const observer = await installChromeObserver(context, { settleComparisons: R4_STABLE_COMPARISONS, maxFrames: MAX_FRAMES, tolerancePx: GEOMETRY_TOLERANCE_PX });
    await context.addInitScript({ content: buildSamplerSource() });
    const ledger = await installFixtureTransport(context, { devOrigin: resolveDevOrigin(testInfo), repoRoot, fixtureMode: 'serve' });

    let flowError: string | null = null;
    let waitError: string | null = null;
    let wait: WaitOutcome = 'not-waited';
    let stages: StageRecord[] = [];
    try {
        const acceptance = await runAcceptanceStages({ page, ledger, deadline, urlPath: SHELL_PATH, expectedEngine: 'cursor3' });
        stages = acceptance.stages;
    } catch (error) {
        flowError = describeError(error);
    }
    if (flowError === null) {
        try {
            await waitForObserverTargets(page, REQUIRED_TARGET_KEYS, deadline.budget('chrome targets', STAGE_BUDGET_MS.R2));
            const early = await readSamplerStatus(page);
            if (early !== null && early.anchorMs !== null) {
                wait = await waitForObservationEndpoint(page, deadline.budget('observation window', OBSERVATION_POLICY.capFromAnchorMs + OBSERVATION_NODE_MARGIN_MS));
            }
        } catch (error) {
            waitError = describeError(error);
        }
    }

    // Every awaited browser read precedes the endpoint; the sampler's stop() read is the final state read and the observer
    // finish, which follows it, is the last awaited read of the case.
    const sampler = await stopSampler(page);
    const finished = await finishChromeObserver(page);
    const navigationSnapshot = navigations.snapshot();
    navigations.dispose();
    const endpoint = endpointViolations(ledger, tracker, false);

    const judgement = judgeObservationEndpoint(sampler, wait);
    const agreement = checkViewportAgreement({
        configured,
        inner: sampler !== null && sampler.innerWidth !== null && sampler.innerHeight !== null ? { width: sampler.innerWidth, height: sampler.innerHeight } : { width: -1, height: -1 },
        devicePixelRatio: 1,
        png: null,
    });

    // The observer's own settle endpoint is not used here: the time-based policy above is the L1 endpoint (requireSettle false).
    const classification = classifyObservation({
        report: finished.ok ? finished.report : null,
        readError: finished.ok ? null : finished.error,
        docStarts: observer.docStarts,
        mainFrameNavigations: navigationSnapshot.count,
        expectedViewport: viewport,
        requiredTargets: REQUIRED_TARGET_KEYS,
        requireSettle: false,
    });
    // displayed-overlay-overlap is geometry by design and is reported, never asserted. Every other mechanism is a finding.
    const independentFindings = classification.mechanisms.filter((m) => m.mechanism !== 'displayed-overlay-overlap');
    const report = finished.ok ? finished.report : null;
    const chromeSummary: Record<string, unknown> = {};
    for (const key of ['transportBar', 'trayDesktop']) {
        const agg = report === null ? undefined : report.targets[key];
        chromeSummary[key] =
            agg === undefined
                ? null
                : {
                      identitiesDistinct: agg.identitiesDistinct,
                      replacedCount: agg.replacedCount,
                      removalEpisodes: agg.removalEpisodes,
                      hiddenStyleFrames: agg.hiddenStyleFrames,
                      offscreenFrames: agg.offscreenFrames,
                      partialOffscreenFrames: agg.partialOffscreenFrames,
                      framesPresent: agg.framesPresent,
                      lastRect: agg.lastRect,
                  };
    }
    const browser = context.browser();

    console.log(
        `${OUTPUT_JSON_LABEL} ${JSON.stringify({
            case: 'L1',
            title: TITLE_L1,
            project: testInfo.project.name,
            browserVersion: browser === null ? null : browser.version(),
            evidenceClass: CLAIM_SUCCESSFUL_LOAD_STRUCTURAL,
            liveObservationNote: LIVE_OBSERVATION_NOTE,
            geometryNote: GEOMETRY_NOTE,
            freshState: 'new browser context, service workers blocked, no storage seeded',
            configuredViewport: configured,
            viewportAgreement: agreement,
            observationPolicy: OBSERVATION_POLICY,
            anchorOffsetFromDocumentStartMs: sampler === null ? null : sampler.anchorMs,
            waitOutcome: wait,
            judgement,
            sampler,
            chromeSummary,
            curtainEpisodesObservedByChromeObserver: report === null ? null : report.curtain.toDisplayed,
            samplerEpisodes: sampler === null ? null : sampler.episodes,
            classification: { captureValidity: classification.captureValidity, validityReasons: classification.validityReasons, mechanisms: classification.mechanisms, notes: classification.notes },
            independentFindings,
            flow: { flowError, waitError },
            endpointViolations: endpoint,
            stages,
            nodeElapsedMs: deadline.elapsedMs(),
            limits: [
                'frame-sampled at requestAnimationFrame cadence: a change that begins and ends between two sampled frames, and anything painted between frames, is not observed',
                'the endpoint is judged on the sampler state at its final stop() read; a re-show after that read is not observed',
                'node identity is tracked per frame within this document only; a reload or a second song selection is not covered',
                'no pixel is captured here: this case evidences the computed rule state and structural persistence, not painted exposure (the held-404 cases evidence paint)',
                'a second curtain episode is reported when it occurs and is never required',
                'the sampler and the chrome observer locate the curtain differently (hook versus computed-style locator) and sample on separate frame callbacks; their episode counts are compared for information only',
                `the chrome observer keeps its own ${MAX_FRAMES}-frame cap (about 60 s at 60 Hz, fewer on a faster display) from document start; reaching it is reported by the classification as an incomplete capture and fails the case`,
                'one headless Chromium on one OS; no Safari, WebKit or Firefox, no physical device, no installed PWA',
            ],
        })}`,
    );

    expect(flowError, `the acceptance flow completed (${flowError ?? 'no error'})`).toBeNull();
    expect(waitError, `the bounded waits completed (${waitError ?? 'no error'})`).toBeNull();
    expect(sampler, 'the in-page curtain sampler was installed and readable').not.toBeNull();
    if (sampler === null) return;
    expect(agreement.issues, 'VIEWPORT validity: the configured viewport and the page agree').toEqual([]);
    expect(sampler.viewportChanges, 'the page viewport did not change during the window').toBe(0);
    expect(judgement.settled, `the time-based observation endpoint was reached (${judgement.reasons.join(' | ')})`).toBe(true);
    expect(sampler.ambiguousFrames, 'the curtain never resolved to more than one element').toBe(0);
    expect(sampler.displayedFrames, 'the curtain was displayed in at least one sampled frame (otherwise nothing was evidenced)').toBeGreaterThan(0);
    expect(sampler.ruleMediaActiveDisplayedFrames, 'the rule media condition held while the curtain was displayed').toBeGreaterThan(0);
    expect(sampler.ruleInactiveDisplayedFrames, `no displayed frame computed the curtain without the rule (first: ${JSON.stringify(sampler.firstInactiveSample)})`).toBe(0);
    expect(classification.captureValidity, `capture validity: ${classification.validityReasons.join(' | ')}`).toBe('valid');
    // The independent checks, unchanged in meaning and now over the observation window.
    expect(independentFindings, 'no removal, replacement, hiding or off-screen movement of the tray or transport bar').toEqual([]);
    for (const key of ['transportBar', 'trayDesktop']) {
        const agg = report === null ? undefined : report.targets[key];
        expect(agg, `${key} was aggregated`).toBeDefined();
        if (agg === undefined) continue;
        expect(agg.identitiesDistinct, `${key} kept a single node identity`).toBe(1);
        expect(agg.removalEpisodes + agg.replacedCount + agg.hiddenStyleFrames + agg.offscreenFrames + agg.partialOffscreenFrames, `${key} showed no removal, replacement, hiding or off-screen movement`).toBe(0);
    }
    expect(endpoint, 'unexpected requests, page errors and fatal console errors').toEqual([]);
}

// ── Browser-free controls ───────────────────────────────────────────────────────────────────────────

const SCENE = { width: 1280, height: 720 } as const;
const PAGE_BG: Rgb = [243, 244, 246];
const FILL: Rgb = [255, 255, 255];
const TRAY: Rgb = [10, 14, 30];
const FOOTER_BG: Rgb = [88, 28, 135];
const FOOTER_BORDER: Rgb = [168, 85, 247];
const GUTTER: Rgb = [250, 250, 250];
const SCENE_BOX: Rect = { x: 0, y: 80, width: 1265, height: 600 };
const SCENE_FOOTER: Rect = { x: 0, y: 645, width: 1265, height: 75 };

function paintRect(buffer: Buffer, rect: Rect, color: Rgb): void {
    for (let y = Math.max(0, rect.y); y < Math.min(SCENE.height, rect.y + rect.height); y += 1) {
        for (let x = Math.max(0, rect.x); x < Math.min(SCENE.width, rect.x + rect.width); x += 1) {
            const i = (y * SCENE.width + x) * 3;
            buffer[i] = color[0];
            buffer[i + 1] = color[1];
            buffer[i + 2] = color[2];
        }
    }
}

/** The page as the real app shows it with the curtain hidden: gutter, page, tray, footer and its top border. */
function sceneReference(pageBg: Rgb): Buffer {
    const buffer = Buffer.alloc(SCENE.width * SCENE.height * 3);
    paintRect(buffer, { x: 0, y: 0, width: SCENE.width, height: SCENE.height }, pageBg);
    paintRect(buffer, { x: 1265, y: 0, width: 15, height: SCENE.height }, GUTTER);
    paintRect(buffer, { x: 0, y: 0, width: 1265, height: 80 }, TRAY);
    paintRect(buffer, SCENE_FOOTER, FOOTER_BG);
    paintRect(buffer, { x: 0, y: 645, width: 1265, height: 1 }, FOOTER_BORDER);
    return buffer;
}

/** A shell layer above the curtain (an edge tab) and the bar's translucent top border composited over the curtain instead of the page. */
const SHELL_TAB: Rgb = [249, 115, 22];
const BORDER_OVER_FILL: Rgb = [200, 150, 255];

/**
 * 'rule' and 'old' also serve the phone stacking models, with the footer rows standing for the mobile bar: 'rule' paints the
 * curtain beneath the bar (the footprint rows show the page), 'old' paints it over the bar. The last three modes exist only for those.
 */
type SceneMode = 'rule' | 'old' | 'gap' | 'holeTooHigh' | 'wrongFill' | 'noCurtain' | 'shellLayer' | 'borderRow' | 'footprintDefect';

function sceneDisplayed(reference: Buffer, mode: SceneMode): Buffer {
    const out = Buffer.from(reference);
    if (mode === 'noCurtain') return out;
    const fill: Rgb = mode === 'wrongFill' ? [250, 0, 255] : FILL;
    const paintedUntil = mode === 'old' ? 680 : mode === 'holeTooHigh' ? 635 : 645;
    paintRect(out, { x: 0, y: 80, width: 1265, height: paintedUntil - 80 }, fill);
    if (mode === 'gap') paintRect(out, { x: 0, y: 300, width: 1265, height: 40 }, PAGE_BG);
    if (mode === 'shellLayer') paintRect(out, { x: 1240, y: 300, width: 12, height: 80 }, SHELL_TAB);
    if (mode === 'borderRow') paintRect(out, { x: 0, y: 645, width: 1265, height: 1 }, BORDER_OVER_FILL);
    if (mode === 'footprintDefect') paintRect(out, { x: 300, y: 650, width: 400, height: 3 }, [1, 2, 3]);
    return out;
}

function sceneInput(variant: PaintVariant, overrides: Partial<PaintInput> = {}): PaintInput {
    return {
        variant,
        viewport: { width: SCENE.width, height: SCENE.height },
        box: SCENE_BOX,
        footer: SCENE_FOOTER,
        ignore: [],
        fill: FILL,
        rootFontPx: 16,
        ...overrides,
    };
}

function evalScene(variant: PaintVariant, mode: SceneMode, pageBg: Rgb = PAGE_BG, overrides: Partial<PaintInput> = {}): PaintEvaluation {
    const reference = sceneReference(pageBg);
    const displayed = sceneDisplayed(reference, mode);
    return evaluatePaint(sceneInput(variant, overrides), encodePng(SCENE.width, SCENE.height, displayed), encodePng(SCENE.width, SCENE.height, reference));
}

function makeControlProbe(mutate?: (probe: PaintProbe) => void): PaintProbe {
    const entry = (key: ChromeKey, selector: string, rect: ProbeRect | null): ChromeEntry => ({
        key,
        selector,
        count: rect === null ? 0 : 1,
        rect,
        display: rect === null ? null : 'block',
        visibility: rect === null ? null : 'visible',
        opacity: rect === null ? null : '1',
    });
    const probe: PaintProbe = {
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 1,
        rootFontPx: 16,
        ruleMediaMatches: true,
        phoneRuleMediaMatches: false,
        pointerFine: true,
        pointerCoarse: false,
        curtainCount: 1,
        curtain: {
            rect: { x: 0, y: 80, width: 1265, height: 600 },
            display: 'block',
            visibility: 'visible',
            opacity: '1',
            position: 'absolute',
            zIndex: '5000',
            pointerEvents: 'none',
            color: 'rgb(255, 255, 255)',
            backgroundColor: 'rgba(0, 0, 0, 0)',
            backgroundImage: 'linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255)), linear-gradient(rgb(255, 255, 255), rgb(255, 255, 255))',
            backgroundAttachment: 'fixed, fixed',
            backgroundSize: '100% 645px, 15px 100%',
            backgroundPosition: '0% 0%, 100% 0%',
            inlineBackgroundColor: 'rgb(255, 255, 255)',
            inlineDisplay: 'block',
            parentHasBandClass: true,
        },
        chrome: [
            entry('trayDesktop', '.maestro-tray-desktop', { x: 0, y: 0, width: 1265, height: 80 }),
            entry('trayMobile', '.maestro-tray-mobile', null),
            entry('transportBar', '[data-transport-bar]', { x: 0, y: 645, width: 1265, height: 75 }),
            entry('mobileBar', '[data-maestro-control-panel]', null),
        ],
        ruleInStylesheets: { found: true, mediaCondition: '(min-width: 650px) and (pointer: fine)' },
        phoneRuleInStylesheets: { found: true, mediaCondition: 'not all and (min-width: 650px)' },
        mainScrollTop: 0,
        documentScrollTop: 0,
    };
    if (mutate !== undefined) mutate(probe);
    return probe;
}

/** The same probe as a phone case sees it (N1's shape: 649x720, the Desktop rule off, the phone rule on, the mobile bar displayed). */
function makePhoneControlProbe(mutate?: (probe: PaintProbe) => void): PaintProbe {
    return makeControlProbe((probe) => {
        probe.innerWidth = 649;
        probe.ruleMediaMatches = false;
        probe.phoneRuleMediaMatches = true;
        if (probe.curtain !== null) {
            probe.curtain.rect = { x: 0, y: 80, width: 634, height: 600 };
            probe.curtain.zIndex = PHONE_CURTAIN_Z_INDEX;
            probe.curtain.backgroundColor = 'rgb(255, 255, 255)';
            probe.curtain.backgroundImage = 'none';
            probe.curtain.backgroundAttachment = 'scroll';
            probe.curtain.backgroundSize = 'auto';
            probe.curtain.backgroundPosition = '0% 0%';
        }
        const transport = chromeEntry(probe, 'transportBar');
        transport.rect = { x: 0, y: 0, width: 0, height: 0 };
        const bar = chromeEntry(probe, 'mobileBar');
        bar.count = 1;
        bar.rect = { x: 0, y: 639, width: 634, height: 81 };
        bar.display = 'block';
        bar.visibility = 'visible';
        bar.opacity = '1';
        if (mutate !== undefined) mutate(probe);
    });
}

/**
 * Runs the REAL probeInPage source (the text Playwright serializes into the page) in an isolated vm context against scripted
 * stylesheets. No browser is involved. Only the stylesheet scan is scripted; the curtain and the chrome resolve to nothing.
 */
function runProbeOverSheets(sheets: readonly unknown[]): PaintProbe {
    const sandbox: Record<string, unknown> = {
        document: { querySelectorAll: () => [], querySelector: () => null, styleSheets: sheets, scrollingElement: null, documentElement: {} },
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 1,
        getComputedStyle: () => ({ fontSize: '16px' }),
        matchMedia: () => ({ matches: false }),
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const probe = vm.runInContext(`(${probeInPage.toString()})`, sandbox) as (a: ProbeArgs) => PaintProbe;
    return JSON.parse(JSON.stringify(probe(buildProbeArgs()))) as PaintProbe;
}

type ScenarioState = 'displayed' | 'hidden' | 'absent' | 'ambiguous';
type ScenarioStep = readonly [number, ScenarioState];

function ramp(from: number, to: number, step: number, state: ScenarioState): ScenarioStep[] {
    const steps: ScenarioStep[] = [];
    for (let t = from; t <= to; t += step) steps.push([t, state]);
    return steps;
}

/**
 * Runs the REAL sampler source (the text installed in the page) in an isolated vm context against a scripted timeline of
 * clock readings and curtain states, one animation frame per step. No browser is involved.
 */
function runSamplerScenario(steps: readonly ScenarioStep[]): SamplerStatus {
    const clock = { now: 0 };
    const current: { state: ScenarioState } = { state: 'absent' };
    const frame: { pending: (() => void) | null } = { pending: null };
    const element = {};
    const style = (display: string): Record<string, string> => ({
        display,
        visibility: 'visible',
        opacity: '1',
        backgroundImage: 'linear-gradient(red, red), linear-gradient(red, red)',
        backgroundAttachment: 'fixed, fixed',
        backgroundColor: 'rgba(0, 0, 0, 0)',
    });
    const sandbox: Record<string, unknown> = {
        performance: { now: () => clock.now },
        matchMedia: () => ({ matches: true }),
        innerWidth: 1280,
        innerHeight: 720,
        requestAnimationFrame: (callback: () => void) => {
            frame.pending = callback;
            return 1;
        },
        document: { querySelectorAll: () => (current.state === 'absent' ? [] : current.state === 'ambiguous' ? [element, {}] : [element]) },
        getComputedStyle: () => style(current.state === 'displayed' ? 'block' : 'none'),
    };
    sandbox.window = sandbox;
    sandbox.top = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(buildSamplerSource(), sandbox);
    for (const [t, state] of steps) {
        clock.now = t;
        current.state = state;
        const callback = frame.pending;
        frame.pending = null;
        if (callback === null) break;
        callback();
    }
    const handle = sandbox[SAMPLER_KEY] as { status: () => unknown };
    return JSON.parse(JSON.stringify(handle.status())) as SamplerStatus;
}

test.describe('curtain footer hole regression gate (opt-in: E2E_FOOTERHOLE=1)', () => {
    test.skip(!footerHoleEnabled, 'opt-in only: set E2E_FOOTERHOLE=1 to run the curtain footer-hole regression gate');
    test.describe.configure({ timeout: TEST_TIMEOUT_MS });
    test.use({ serviceWorkers: 'block' });
    // Requests no context or page fixture, so a test skipped here creates no browser context.
    test.beforeEach(({ isMobile }, testInfo) => {
        const mobileOnly = testInfo.title === TITLE_N2;
        const wanted = mobileOnly ? MOBILE_PROJECT : DESKTOP_PROJECT;
        test.skip(testInfo.project.name !== wanted || (mobileOnly ? isMobile !== true : isMobile === true), `${testInfo.title} runs on ${wanted} only`);
    });

    test(TITLE_CONTROL, async () => {
        // 1. Geometry classification (by measured rectangles only), colour parsing and the PNG codec.
        expect(overlapKind(SCENE_BOX, SCENE_FOOTER)).toBe('partial');
        expect(overlapKind({ x: 0, y: 80, width: 1265, height: 600 }, { x: 0, y: 565, width: 1265, height: 75 })).toBe('full');
        expect(overlapKind({ x: 0, y: 80, width: 1265, height: 400 }, SCENE_FOOTER)).toBe('none');
        expect(parseOpaqueRgb('rgb(255, 255, 255)')).toEqual([255, 255, 255]);
        expect(parseOpaqueRgb('rgba(26, 26, 26, 1)')).toEqual([26, 26, 26]);
        expect(parseOpaqueRgb('rgba(0, 0, 0, 0)')).toBeNull();
        expect(parseOpaqueRgb('transparent')).toBeNull();
        const sample = Buffer.from(Array.from({ length: 5 * 3 * 3 }, (_unused, n) => (n * 7) & 255));
        expect(decodePng(encodePng(5, 3, sample)).rgb.equals(sample)).toBe(true);

        // 2. Viewport agreement: configured viewport, innerWidth/innerHeight and the scale 'css' PNG size.
        const configured = { width: 1280, height: 720 };
        expect(checkViewportAgreement({ configured, inner: { width: 1280, height: 720 }, devicePixelRatio: 1, png: { width: 1280, height: 720 } })).toEqual({ ok: true, issues: [] });
        const innerOff = checkViewportAgreement({ configured, inner: { width: 980, height: 720 }, devicePixelRatio: 1, png: null });
        expect(innerOff.ok).toBe(false);
        expect(innerOff.issues.join(' | ')).toContain('VIEWPORT-DISAGREEMENT');
        const pngOff = checkViewportAgreement({ configured, inner: { width: 1280, height: 720 }, devicePixelRatio: 2, png: { width: 2560, height: 1440 } });
        expect(pngOff.ok).toBe(false);
        expect(pngOff.issues.join(' | ')).toContain('SCREENSHOT-DIMENSION-DISAGREEMENT');
        expect(checkViewportAgreement({ configured: null, inner: { width: 1280, height: 720 }, devicePixelRatio: 1, png: null }).issues.join(' | ')).toContain('VIEWPORT-UNAVAILABLE');

        // 3. Pixel evaluator. Positive controls: each model accepts the capture it describes.
        expect(evalScene('hole', 'rule').verdict, 'hole model, rule capture').toBe('PASS');
        expect(evalScene('old', 'old').verdict, 'old model, old capture').toBe('PASS');
        // Negative controls: each model rejects the other's capture, and each defect is detected.
        const ruleAsOld = evalScene('old', 'rule');
        expect(ruleAsOld.verdict, 'old model, rule capture').toBe('FAIL');
        expect(ruleAsOld.categories['painted'].mismatch, 'the footer rows inside the box are the mismatches').toBeGreaterThan(0);
        const oldAsHole = evalScene('hole', 'old');
        expect(oldAsHole.verdict, 'hole model, old capture').toBe('FAIL');
        expect(oldAsHole.categories['exposed'].mismatch, 'the covered footer rows are the mismatches').toBeGreaterThan(0);
        expect(evalScene('hole', 'gap').verdict, 'an uncovered band in the score area').toBe('FAIL');
        expect(evalScene('hole', 'holeTooHigh').verdict, 'the curtain stops 10px short of the footer top (the hole edge is 10px too high)').toBe('FAIL');
        expect(evalScene('hole', 'wrongFill').verdict, 'a curtain of the wrong colour').toBe('FAIL');
        expect(evalScene('hole', 'noCurtain').verdict, 'no curtain painted at all').toBe('FAIL');
        const whitePage = evalScene('hole', 'rule', FILL);
        expect(whitePage.verdict, 'painted region indistinguishable from the page under it').toBe('PARTIAL');
        expect(whitePage.partialReasons.join(' | ')).toContain('cannot be told from the page under it');
        const noOverlap = evalScene('hole', 'rule', PAGE_BG, { footer: { x: 0, y: 700, width: 1265, height: 20 }, box: { x: 0, y: 80, width: 1265, height: 400 } });
        expect(['INVALID CAPTURE', 'FAIL']).toContain(noOverlap.verdict);
        expect(noOverlap.invalidReasons.join(' | ')).toContain('not applicable');
        const drift = evalScene('hole', 'rule', PAGE_BG, { footer: { x: 0, y: 640, width: 1265, height: 80 } });
        expect(drift.verdict, 'measured footer no longer matches the rule constant').toBe('FAIL');
        expect(drift.failReasons.join(' | ')).toContain('no longer mirrors the transport bar');
        const chromeFillsBand = evalScene('old', 'old', PAGE_BG, { ignore: [{ x: 0, y: 640, width: SCENE.width, height: 80 }] });
        expect(chromeFillsBand.ignoredPixels).toBeGreaterThan(0);
        expect(chromeFillsBand.bandExamined, 'chrome covers the whole zone an active rule would leave unpainted').toBe(0);
        expect(chromeFillsBand.verdict).toBe('PARTIAL');
        const wrongSize = evaluatePaint(sceneInput('hole'), encodePng(5, 3, sample), encodePng(5, 3, sample));
        expect(wrongSize.verdict).toBe('INVALID CAPTURE');
        expect(wrongSize.invalidReasons.join(' | ')).toContain('SCREENSHOT-DIMENSION-DISAGREEMENT');

        // 3b. The phone stacking models judge only the mobile bar footprint (inset by the edge margin) inside the box. In the shared scene
        // the footer rows 645..720 stand for the bar: 'rule' paints the curtain beneath it, 'old' paints the curtain over it.
        expect(evalScene('stack', 'rule').verdict, 'stack model, curtain beneath the bar').toBe('PASS');
        expect(evalScene('covered', 'old').verdict, 'covered model, curtain over the bar').toBe('PASS');
        const stackedAsCovered = evalScene('covered', 'rule');
        expect(stackedAsCovered.verdict, 'covered model, stacked capture').toBe('FAIL');
        expect(stackedAsCovered.categories['painted'].mismatch, 'the bar rows beneath the curtain are the mismatches').toBeGreaterThan(0);
        const coveredAsStack = evalScene('stack', 'old');
        expect(coveredAsStack.verdict, 'stack model, covered capture').toBe('FAIL');
        expect(coveredAsStack.categories['exposed'].mismatch, 'the covered bar rows are the mismatches').toBeGreaterThan(0);
        expect(evalScene('covered', 'noCurtain').verdict, 'no curtain: nothing covers the bar, so the positive control fails').toBe('FAIL');
        expect(evalScene('stack', 'noCurtain').verdict, 'the stack model alone cannot see a missing curtain; the covered capture is the positive control').toBe('PASS');
        expect(evalScene('stack', 'footprintDefect').verdict, 'a defect inside the footprint').toBe('FAIL');
        expect(evalScene('stack', 'borderRow').verdict, "the bar's top border row lies inside the 2px inset and is not judged").toBe('PASS');
        // A shell layer that ranks above the curtain elsewhere in the box is outside the footprint models and inside the whole-box
        // model, which is why the phone cases do not use the latter.
        expect(evalScene('stack', 'shellLayer').verdict, 'stack model, a tab painted above the curtain elsewhere in the box').toBe('PASS');
        expect(evalScene('hole', 'shellLayer').verdict, 'the whole-box model rejects the same capture').toBe('FAIL');
        const noBarOverlap = evalScene('stack', 'rule', PAGE_BG, { footer: { x: 0, y: 700, width: 1265, height: 20 }, box: { x: 0, y: 80, width: 1265, height: 400 } });
        expect(noBarOverlap.verdict).toBe('INVALID CAPTURE');
        expect(noBarOverlap.invalidReasons.join(' | ')).toContain('not applicable');
        const coveredNoOverlap = evalScene('covered', 'old', PAGE_BG, { footer: { x: 0, y: 700, width: 1265, height: 20 }, box: { x: 0, y: 80, width: 1265, height: 400 } });
        expect(coveredNoOverlap.verdict).toBe('INVALID CAPTURE');
        expect(coveredNoOverlap.invalidReasons.join(' | ')).toContain('not applicable');
        const fillEqualsBar = evalScene('stack', 'rule', PAGE_BG, { fill: FOOTER_BG });
        expect(fillEqualsBar.verdict, 'a fill equal to the bar cannot discriminate').toBe('PARTIAL');
        expect(fillEqualsBar.partialReasons.join(' | ')).toContain('cannot be told from the fill');
        expect(evalScene('stack', 'rule', PAGE_BG, { footer: null }).verdict, 'no footprint measured').toBe('INVALID CAPTURE');
        expect(evalScene('covered', 'old', PAGE_BG, { footer: null }).verdict, 'no footprint measured').toBe('INVALID CAPTURE');

        // 3c. State preconditions follow the case: the curtain rank, both media states, both rules in the stylesheets and the judged footprint.
        const violationsOf = (spec: PaintCaseSpec, probe: PaintProbe): string => preconditionViolations(spec, probe).join(' | ');
        expect(preconditionViolations(CASE_P1, makeControlProbe()), 'a Desktop case on a Desktop probe').toEqual([]);
        expect(preconditionViolations(CASE_N1, makePhoneControlProbe()), 'a phone case on a phone probe').toEqual([]);
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { if (p.curtain !== null) p.curtain.zIndex = DEFAULT_CURTAIN_Z_INDEX; })), 'a phone case whose rank is still 5000').toContain('expected absolute/49/none');
        expect(violationsOf(CASE_P1, makeControlProbe((p) => { if (p.curtain !== null) p.curtain.zIndex = PHONE_CURTAIN_Z_INDEX; })), 'a Desktop case whose rank is 49').toContain('expected absolute/5000/none');
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { p.phoneRuleMediaMatches = false; }))).toContain(`matchMedia('${PHONE_RULE_MEDIA_QUERY}') is false`);
        expect(violationsOf(CASE_P1, makeControlProbe((p) => { p.phoneRuleMediaMatches = true; }))).toContain(`matchMedia('${PHONE_RULE_MEDIA_QUERY}') is true`);
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { p.ruleMediaMatches = true; }))).toContain('this negative control requires it to be false');
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { p.phoneRuleInStylesheets = { found: false, mediaCondition: null }; }))).toContain('phone stacking rule');
        expect(violationsOf(CASE_P1, makeControlProbe((p) => { p.ruleInStylesheets = { found: false, mediaCondition: null }; }))).toContain('Desktop footer-hole rule');
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { chromeEntry(p, 'mobileBar').rect = null; }))).toContain('mobile control bar');
        expect(violationsOf(CASE_N1, makePhoneControlProbe((p) => { chromeEntry(p, 'mobileBar').rect = { x: 0, y: 690, width: 634, height: 81 }; }))).toContain("only applicable to 'partial'");

        // 4. Bracketing: every bracketed field is compared and a difference is named; identical probes differ nowhere.
        const base = makeControlProbe();
        const baseLoad: LoadFailureState = { apiPresent: true, scoreIsNull: true, cursorElementCount: 0 };
        const flatBase = flattenProbe(base, baseLoad);
        expect(describeProbeDifferences(flatBase, flattenProbe(makeControlProbe(), baseLoad)), 'identical probes').toEqual([]);
        const probeDiff = (mutate: (probe: PaintProbe) => void, load: LoadFailureState = baseLoad): string =>
            describeProbeDifferences(flatBase, flattenProbe(makeControlProbe(mutate), load)).join(' | ');
        expect(probeDiff((p) => { if (p.curtain !== null) p.curtain.display = 'none'; })).toContain('curtain.display');
        expect(probeDiff((p) => { if (p.curtain !== null) p.curtain.rect = { x: 0, y: 80, width: 1265, height: 601 }; })).toContain('curtain.rect');
        expect(probeDiff((p) => { if (p.curtain !== null) p.curtain.parentHasBandClass = false; })).toContain('curtain.parentHasBandClass');
        expect(probeDiff((p) => { if (p.curtain !== null) p.curtain.backgroundImage = 'none'; })).toContain('curtain.backgroundImage');
        expect(probeDiff((p) => { chromeEntry(p, 'transportBar').rect = { x: 0, y: 646, width: 1265, height: 74 }; })).toContain('transportBar.rect');
        expect(probeDiff((p) => { chromeEntry(p, 'trayDesktop').opacity = '0.5'; })).toContain('trayDesktop.style');
        expect(probeDiff((p) => { p.mainScrollTop = 10; })).toContain('scroll.main');
        expect(probeDiff((p) => { p.innerWidth = 1281; })).toContain('viewport.inner');
        expect(probeDiff((p) => { p.phoneRuleMediaMatches = true; })).toContain('media.phoneRuleMatches');
        expect(probeDiff(() => undefined, { apiPresent: true, scoreIsNull: true, cursorElementCount: 1 })).toContain('load');
        expect(entryDisplayed(chromeEntry(base, 'transportBar'))).toBe(true);
        expect(entryDisplayed(chromeEntry(base, 'mobileBar'))).toBe(false);

        // 4b. Rule discovery. The Desktop rule and the phone rule share one selector; each is found by the declaration it exists for and
        // is reported with its own media condition, in either stylesheet order. The REAL probe source runs over scripted stylesheets.
        const sharedSelector = '.maestro-curtain-band > [data-maestro-curtain]';
        const styleOf = (...props: string[]): unknown => Object.assign(props.slice(), { getPropertyValue: (name: string): string => (props.indexOf(name) >= 0 ? '1' : '') });
        const desktopRule = { selectorText: sharedSelector, style: styleOf('background-color', 'background-image', 'background-repeat', 'background-attachment', 'background-position', 'background-size') };
        const phoneRule = { selectorText: sharedSelector, style: styleOf('z-index') };
        const inMedia = (conditionText: string, rule: unknown): unknown => ({ conditionText, cssRules: [rule] });
        const desktopMedia = '(min-width: 650px) and (pointer: fine)';
        const phoneMedia = 'not all and (min-width: 650px)';
        for (const order of ['Desktop first', 'phone first'] as const) {
            const rules = order === 'Desktop first' ? [inMedia(desktopMedia, desktopRule), inMedia(phoneMedia, phoneRule)] : [inMedia(phoneMedia, phoneRule), inMedia(desktopMedia, desktopRule)];
            const discovered = runProbeOverSheets([{ cssRules: rules }]);
            expect(discovered.ruleInStylesheets, `${order}: the Desktop rule keeps its own media condition`).toEqual({ found: true, mediaCondition: desktopMedia });
            expect(discovered.phoneRuleInStylesheets, `${order}: the phone rule keeps its own media condition`).toEqual({ found: true, mediaCondition: phoneMedia });
        }
        expect(runProbeOverSheets([{ cssRules: [inMedia(phoneMedia, phoneRule)] }]).ruleInStylesheets, 'the phone rule alone is not the Desktop rule').toEqual({ found: false, mediaCondition: null });
        expect(runProbeOverSheets([{ cssRules: [inMedia(desktopMedia, desktopRule)] }]).phoneRuleInStylesheets, 'the Desktop rule alone is not the phone rule').toEqual({ found: false, mediaCondition: null });
        const noDeclaration = { selectorText: sharedSelector, style: styleOf('color') };
        const otherSelector = { selectorText: '.another-class > [data-other]', style: styleOf('z-index', 'background-image') };
        const neither = runProbeOverSheets([{ cssRules: [inMedia(desktopMedia, noDeclaration), inMedia(phoneMedia, otherSelector)] }]);
        expect(neither.ruleInStylesheets.found, 'the selector without the declaration, and the declaration without the selector, are neither rule').toBe(false);
        expect(neither.phoneRuleInStylesheets.found).toBe(false);
        const rewritten = runProbeOverSheets([{ cssRules: [inMedia('not all and (width >= 650px)', phoneRule)] }]);
        expect(rewritten.phoneRuleInStylesheets, 'a media-query rewrite by the build pipeline does not hide the rule').toEqual({ found: true, mediaCondition: 'not all and (width >= 650px)' });

        // 5. Finally-restoration: the restoration runs when the body throws, when apply throws, and its failure is recorded.
        const okResult = (ok: boolean): InterventionResult => ({ ok, classPresent: true, priorInlineDisplay: 'block', inlineDisplay: 'block' });
        const log: InterventionRecord[] = [];
        const calls = { restore: 0 };
        const restoring = (name: string, apply: InterventionSpec['apply'], restore: InterventionSpec['restore']): InterventionSpec => ({
            name,
            apply,
            restore: async () => {
                calls.restore += 1;
                return restore();
            },
            isRestored: (result) => result.ok,
        });
        await expect(withIntervention(restoring('body throws', async () => okResult(true), async () => okResult(true)), log, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
        expect(calls.restore, 'restoration ran after the body threw').toBe(1);
        expect(log[0]).toMatchObject({ applied: true, restoreResult: 'restored' });
        await expect(withIntervention(restoring('apply throws', async () => { throw new Error('apply failed'); }, async () => okResult(true)), log, async () => 'unreached')).rejects.toThrow('apply failed');
        expect(calls.restore, 'restoration ran after apply threw').toBe(2);
        expect(log[1]).toMatchObject({ applied: null, restoreResult: 'restored' });
        const normal = await withIntervention(restoring('normal', async () => okResult(true), async () => okResult(true)), log, async (applied) => applied.ok);
        expect(normal).toBe(true);
        expect(log[2]).toMatchObject({ applied: true, restoreResult: 'restored' });
        await withIntervention(restoring('restore not effective', async () => okResult(true), async () => okResult(false)), log, async () => undefined);
        expect(log[3].restoreResult).toBe('failed');
        expect(log[3].detail).not.toBeNull();
        await expect(withIntervention(restoring('restore throws', async () => okResult(true), async () => { throw new Error('page closed'); }), log, async () => 'body result')).resolves.toBe('body result');
        expect(log[4]).toMatchObject({ restoreResult: 'failed', detail: 'Error: page closed' });

        // 6. The REAL sampler source on scripted timelines (page-clock ms; one frame per step), judged by the Node-side endpoint rule.
        // 6a. Clean load: initial absence is legitimate and counts toward nothing; anchor 200, hide 1500, endpoint first satisfied at
        // the first frame at or after anchor + 5000 ms (5500).
        const clean = runSamplerScenario([[0, 'absent'], [100, 'absent'], [200, 'displayed'], [700, 'displayed'], [1500, 'hidden'], ...ramp(2000, 7000, 500, 'hidden')]);
        expect(clean).toMatchObject({
            anchorMs: 200,
            latestHideMs: 1500,
            hiddenRunStartMs: 1500,
            absentFrames: 2,
            hides: 1,
            episodes: 1,
            reShowsAfterFirstHide: 0,
            firstSatisfiedMs: 5500,
            satisfiedNow: true,
            cancellationsByReShow: 0,
            capReached: false,
            ruleMediaActiveDisplayedFrames: 2,
            ruleInactiveDisplayedFrames: 0,
        });
        expect(judgeObservationEndpoint(clean, 'ready')).toEqual({ settled: true, reasons: [] });
        // 6b. A re-show cancels a satisfied endpoint; a later hide restarts the 2000 ms and the endpoint is satisfied again.
        const reshow = runSamplerScenario([[200, 'displayed'], ...ramp(1500, 6000, 500, 'hidden'), [6500, 'displayed'], [7000, 'displayed'], ...ramp(8000, 10500, 500, 'hidden')]);
        expect(reshow).toMatchObject({ firstSatisfiedMs: 5500, cancellationsByReShow: 1, episodes: 2, reShowsAfterFirstHide: 1, latestHideMs: 8000, hiddenRunStartMs: 8000, satisfiedNow: true });
        expect(judgeObservationEndpoint(reshow, 'ready').settled).toBe(true);
        // 6c. A curtain still displayed at the 15000 ms cap is incomplete.
        const activeAtCap = runSamplerScenario([[0, 'absent'], ...ramp(200, 15200, 1000, 'displayed')]);
        expect(activeAtCap).toMatchObject({ capReached: true, stopped: true, satisfiedNow: false });
        const activeJudged = judgeObservationEndpoint(activeAtCap, 'ready');
        expect(activeJudged.settled).toBe(false);
        expect(activeJudged.reasons.join(' | ')).toContain('active (displayed)');
        // 6d. A curtain whose state is unknown (absent) at the cap is incomplete.
        const unknownAtCap = runSamplerScenario([[200, 'displayed'], [1500, 'hidden'], ...ramp(3200, 15200, 1000, 'absent')]);
        expect(unknownAtCap.capSnapshot).toMatchObject({ curtainState: 'unknown' });
        expect(judgeObservationEndpoint(unknownAtCap, 'ready').reasons.join(' | ')).toContain('unknown');
        // 6e. A curtain never displayed: no anchor, incomplete.
        const neverDisplayed = runSamplerScenario(ramp(0, 6000, 500, 'hidden'));
        expect(neverDisplayed.anchorMs).toBeNull();
        expect(judgeObservationEndpoint(neverDisplayed, 'ready').reasons.join(' | ')).toContain('never observed displayed');
        // 6f. Hidden less than 2000 ms before the cap: incomplete, with the continuous hidden time named.
        const lateHide = runSamplerScenario([[200, 'displayed'], ...ramp(1200, 14200, 1000, 'displayed'), [14300, 'hidden'], [15200, 'hidden']]);
        expect(lateHide.capSnapshot).toMatchObject({ curtainState: 'hidden', sinceLatestHideMs: 900, sinceHiddenRunMs: 900, conditionsMetButLate: false });
        expect(judgeObservationEndpoint(lateHide, 'ready').reasons.join(' | ')).toContain('900 ms of continuous known-hidden observation');
        // 6g. The Node side re-derives the endpoint: a satisfied flag with too little time is not accepted.
        expect(judgeObservationEndpoint({ ...clean, sinceAnchorMs: 4000 }, 'ready').settled).toBe(false);
        expect(judgeObservationEndpoint({ ...clean, sinceHiddenRunMs: 1500 }, 'ready').settled).toBe(false);
        expect(judgeObservationEndpoint({ ...clean, sinceHiddenRunMs: null }, 'ready').settled).toBe(false);
        expect(judgeObservationEndpoint({ ...clean, curtainState: 'displayed' }, 'ready').settled).toBe(false);
        expect(judgeObservationEndpoint(null, 'not-waited').settled).toBe(false);
        // 6h. Neither the endpoint nor the cap reached before the Node-side bound.
        const midway = runSamplerScenario([[200, 'displayed'], [1500, 'hidden'], ...ramp(2000, 3000, 500, 'hidden')]);
        expect(judgeObservationEndpoint(midway, 'bound-elapsed').reasons.join(' | ')).toContain('neither the endpoint nor the cap was reached');

        // 6i. Unknown intervals do not contribute to the hidden settling interval: displayed, hidden, absent (or ambiguous), hidden.
        // The previous rule counted the whole time since the hide at 1500 and was satisfied at the first resumed frame (6000).
        const unknownThenHidden = (unknown: 'absent' | 'ambiguous', until: number): SamplerStatus =>
            runSamplerScenario([[200, 'displayed'], [1500, 'hidden'], [2000, 'hidden'], ...ramp(2500, 5500, 500, unknown), ...ramp(6000, until, 500, 'hidden')]);
        for (const unknown of ['absent', 'ambiguous'] as const) {
            const resumed = unknownThenHidden(unknown, 7500);
            expect(resumed, `${unknown}: only 1500 ms of continuous hidden observation by 7500`).toMatchObject({
                satisfiedNow: false,
                firstSatisfiedMs: null,
                latestHideMs: 1500,
                hiddenRunStartMs: 6000,
                capReached: false,
            });
            expect(unknown === 'absent' ? resumed.absentFrames : resumed.ambiguousFrames, `${unknown} frames were observed`).toBeGreaterThan(0);
            expect(judgeObservationEndpoint(resumed, 'bound-elapsed').settled).toBe(false);
            const settledAfter = unknownThenHidden(unknown, 8000);
            expect(settledAfter).toMatchObject({ satisfiedNow: true, firstSatisfiedMs: 8000, hiddenRunStartMs: 6000 });
            expect(judgeObservationEndpoint(settledAfter, 'ready').settled).toBe(true);
        }
        // 6j. An endpoint satisfied before an unknown interval is cancelled by it and needs a fresh 2000 ms of hidden observation.
        const settledThenUnknown = (until: number): SamplerStatus =>
            runSamplerScenario([[200, 'displayed'], ...ramp(1500, 6000, 500, 'hidden'), [6500, 'absent'], ...ramp(7000, until, 500, 'hidden')]);
        expect(settledThenUnknown(8500)).toMatchObject({ firstSatisfiedMs: 5500, cancellationsByUnknown: 1, hiddenRunStartMs: 7000, satisfiedNow: false });
        expect(settledThenUnknown(9500)).toMatchObject({ firstSatisfiedMs: 5500, cancellationsByUnknown: 1, hiddenRunStartMs: 7000, satisfiedNow: true });
        // 6k. A hide that happened inside an unknown interval was never observed: hidden frames alone do not start a settling run.
        const unobservedHide = runSamplerScenario([[200, 'displayed'], [1500, 'absent'], ...ramp(2000, 9000, 500, 'hidden')]);
        expect(unobservedHide).toMatchObject({ satisfiedNow: false, firstSatisfiedMs: null, latestHideMs: null, hiddenRunStartMs: null });

        // 6l. The 15000 ms deadline binds establishment. The last hide is at 14800 (the deadline is 15200 for an anchor at 200) and
        // the next callback arrives at 17000. Every condition holds there (hidden run 2200 ms), but a delayed callback cannot
        // establish a new endpoint after the deadline. The previous rule accepted it.
        const lateCallback = runSamplerScenario([[200, 'displayed'], ...ramp(1200, 14200, 1000, 'displayed'), [14800, 'hidden'], [17000, 'hidden']]);
        expect(lateCallback).toMatchObject({ satisfiedNow: false, firstSatisfiedMs: null, capReached: true, stopped: true });
        expect(lateCallback.capSnapshot).toMatchObject({ curtainState: 'hidden', sinceAnchorMs: 16800, sinceHiddenRunMs: 2200, conditionsMetButLate: true });
        const lateJudged = judgeObservationEndpoint(lateCallback, 'ready');
        expect(lateJudged.settled).toBe(false);
        expect(lateJudged.reasons.join(' | ')).toContain('after the 15000 ms deadline');
        // 6m. A callback exactly at the deadline may still establish the endpoint: anchor 200, deadline 15200, hide 13000.
        const atDeadline = runSamplerScenario([[200, 'displayed'], ...ramp(1200, 12200, 1000, 'displayed'), [13000, 'hidden'], [14000, 'hidden'], [15200, 'hidden']]);
        expect(atDeadline).toMatchObject({ satisfiedNow: true, firstSatisfiedMs: 15200, capReached: false });
        expect(judgeObservationEndpoint(atDeadline, 'ready').settled).toBe(true);
        // 6n. An endpoint established before the deadline stands through a later delayed callback (only a NEW establishment is barred).
        const standing = runSamplerScenario([[0, 'absent'], [100, 'absent'], [200, 'displayed'], [700, 'displayed'], [1500, 'hidden'], ...ramp(2000, 7000, 500, 'hidden'), [20000, 'hidden']]);
        expect(standing).toMatchObject({ satisfiedNow: true, firstSatisfiedMs: 5500, capReached: false });
        expect(judgeObservationEndpoint(standing, 'ready').settled).toBe(true);

        // 7. Load-state evidence: a failed read is an explicit issue, and two failed reads are never evidence of stability.
        const okRead: LoadStateRead = { state: baseLoad, error: null };
        const failedRead: LoadStateRead = { state: null, error: 'Error: page closed' };
        const readLabels = { before: 'before the screenshot', after: 'after the screenshot' };
        expect(describeBracket(base, makeControlProbe(), okRead, okRead, readLabels), 'two successful identical reads').toEqual({ differences: [], loadStateIssues: [] });
        const bothFailed = describeBracket(base, makeControlProbe(), failedRead, failedRead, readLabels);
        expect(bothFailed.differences, 'two null reads compare equal, which is why they are not accepted as stability').toEqual([]);
        expect(bothFailed.loadStateIssues, 'each failed read and the pair are explicit issues').toHaveLength(3);
        expect(bothFailed.loadStateIssues.join(' | ')).toContain('LOAD-STATE-UNAVAILABLE');
        expect(bothFailed.loadStateIssues.join(' | ')).toContain('page closed');
        expect(bothFailed.loadStateIssues.join(' | ')).toContain('two failed reads are never accepted');
        const afterFailed = describeBracket(base, makeControlProbe(), okRead, failedRead, readLabels);
        expect(afterFailed.loadStateIssues).toHaveLength(1);
        expect(afterFailed.loadStateIssues[0]).toContain('after the screenshot');
        expect(afterFailed.differences.join(' | ')).toContain('load');
        expect(describeBracket(base, makeControlProbe(), failedRead, okRead, readLabels).loadStateIssues[0]).toContain('before the screenshot');
        // The capture-level rule: a capture with an unreadable load state is invalid; a clean capture is not.
        const cleanRecord: CaptureRecord = {
            name: 'rule',
            fileName: 'footer-hole-control.png',
            sha256: '',
            bytes: 0,
            png: { width: 1280, height: 720 },
            configuredViewport: { width: 1280, height: 720 },
            viewportAgreement: { ok: true, issues: [] },
            bracketDifferences: [],
            loadStateIssues: [],
        };
        expect(captureInvalidations(cleanRecord)).toEqual([]);
        const unreadable = captureInvalidations({ ...cleanRecord, loadStateIssues: bothFailed.loadStateIssues });
        expect(unreadable).toHaveLength(3);
        expect(unreadable.join(' | ')).toContain('rule capture: LOAD-STATE-UNAVAILABLE');
        expect(captureInvalidations({ ...cleanRecord, bracketDifferences: ['curtain.display: "block" -> "none"'] })).toHaveLength(1);
        expect(captureInvalidations({ ...cleanRecord, viewportAgreement: { ok: false, issues: ['VIEWPORT-DISAGREEMENT: x'] } })).toHaveLength(1);
    });

    test(TITLE_P1, async ({ context, page }, testInfo) => {
        await runPaintCase(page, context, testInfo, CASE_P1);
    });

    test(TITLE_P2, async ({ context, page }, testInfo) => {
        await runPaintCase(page, context, testInfo, CASE_P2);
    });

    test(TITLE_N1, async ({ context, page }, testInfo) => {
        await runPaintCase(page, context, testInfo, CASE_N1);
    });

    test(TITLE_L1, async ({ context, page }, testInfo) => {
        await runL1(page, context, testInfo);
    });

    test(TITLE_N2, async ({ context, page }, testInfo) => {
        await runPaintCase(page, context, testInfo, CASE_N2);
    });
});
