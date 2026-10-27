/**
 * Maestro.ai — E2E chrome observer (tray, footer and curtain observation for tray-disappearance classification)
 * Version: V1.0.3
 * Date: October 25, 2026
 * Ticket: PLAYER-CONTROLS-PERSISTENT-SHELL-001
 *
 * Observation-only helper for tests/e2e/chrome-occlusion.e2e.ts (opt-in E2E_CHROME=1, Desktop project only). Browser
 * behaviour of everything below is NOT RUN at the time of writing: the only checks performed are static (type-check,
 * lint, jest test listing).
 *
 * CONTRACT
 *   - Test-owned observation state only. The in-page observer reads the DOM (getComputedStyle, getBoundingClientRect,
 *     querySelectorAll, MutationObserver, requestAnimationFrame) and reads window.__at and #control-play. It writes
 *     nothing the product reads: no product DOM or style mutation, no product global, no API method call, no storage,
 *     no lifecycle hook. Its own state lives in one test-owned global (CHROME_OBSERVER_GLOBAL) and one test-owned
 *     exposed function (CHROME_OBSERVER_POST_BINDING). Node identity is kept in a WeakMap, never as a node property.
 *   - No general CSS stacking or paint-order engine. For the curtain and footer pair the observer records raw computed
 *     style evidence along each ancestor chain and lists the ancestor values that can matter; it derives no paint
 *     order. Paint-order conclusions stay INFERRED; painted occlusion is NOT MEASURED (no pixel is captured here).
 *   - Geometric intersection and displayed-overlay overlap are separate measures. A hidden curtain can keep its
 *     rectangle, so the displayed overlap is zero whenever the curtain is not displayed by computed style.
 *   - Several mechanisms can coexist in one capture; classification reports every one that was observed.
 *   - A target absent before it mounts is a PENDING observation, not a failure. It becomes an incomplete capture only
 *     at a bounded endpoint. "Missing" (never resolved, or removed) and "ambiguous" (more than one match) are distinct.
 *   - Document identity (a per-document id plus performance.timeOrigin, posted at document start) is recorded
 *     separately from main-frame navigation events: a navigation count alone does not prove a whole-document reload.
 *   - Distinct curtain instances are counted, not attributed: they do not identify their cause.
 *   - The "curtain-settled" endpoint is a CURRENT-STATE judgement, never a latched flag. The test arms a fresh
 *     observation epoch after R6 (armSettle), which resets only test-owned settle state. The endpoint holds only while
 *     the curtain is hidden, every required structure is present with unchanged node identity, and the renderer-root
 *     and container rectangles are unchanged for the required consecutive comparisons; it is judged on the final
 *     observation. The document-start sequence is kept as separate, historical evidence and never satisfies it.
 *   - Stored samples and output are bounded (OBSERVER_CAPS, MAX_OUTPUT_CHARS). Every bounded list keeps its EARLIEST
 *     entries; later entries are dropped, counted and reported, both in the report and in the emitted JSON (events,
 *     keyframes, ancestor snapshots, curtain instances, per-target node identities, viewport records). Aggregate
 *     counters stay complete even when a list is truncated.
 *   - No fixed sleeps. In-page work is requestAnimationFrame-driven and ends on an explicit stop or the frame cap;
 *     Node-side waits are page.waitForFunction polls bounded by a caller-supplied timeout.
 *   - Rects are rounded to 1/RECT_SCALE CSS px (the scoreReady.ts convention). No predicted overlap dimension is
 *     encoded anywhere: every size is measured at run time.
 *
 * SERIALIZATION MODEL
 *   Playwright cannot ship closures, so the observer is built as ONE script string: the source text of the
 *   EMBEDDED_HELPERS functions plus the source text of observeChromeInPage, concatenated inside an IIFE, with every
 *   input passed as JSON data (ObserverArgs). The embedded helpers and the in-page function therefore must not
 *   reference module-scope constants, imports or Node APIs, and must avoid syntax Playwright's transpiler may rewrite
 *   with outer helper bindings (optional chaining, nullish coalescing, object spread). The same helper functions are
 *   exercised in Node by the D0 controls, including an isolated-context evaluation of the exact embedded bundle.
 */

import { errors, type BrowserContext, type Frame, type Page } from '@playwright/test';

// ── Public constants ────────────────────────────────────────────────────────────────────────────────

export const CHROME_OBSERVER_GLOBAL = '__e2eChromeObs';
export const CHROME_OBSERVER_POST_BINDING = '__e2eChromeObsPost';
/** Rects are rounded to 1/RECT_SCALE = 0.01 CSS px (the scoreReady.ts R4 convention). */
export const RECT_SCALE = 100;
/**
 * Locator condition for the renderer's curtain: the COMPUTED z-index of an absolutely positioned, pointer-events:none sibling.
 * 5000 is the curtain's inline rank and holds at 650px and wider; below 650px in portrait globals.css ranks it at 49, where this
 * locator finds nothing. The committed specs use the observer at Desktop width only.
 */
export const CURTAIN_Z_INDEX_LOCATOR = '5000';
export const CURTAIN_SEARCH_DEPTH = 8;
export const ANCESTOR_DEPTH = 16;
export const CONTROL_PLAY_ID = 'control-play';
export const DOC_START_CAP = 16;
export const NAVIGATION_CAP = 50;
/** Storage bound for the emitted JSON line, in characters. A storage bound, not a timing threshold. */
export const MAX_OUTPUT_CHARS = 120_000;
/** In-page storage bounds. Anything beyond a cap is counted in the report's truncation block, never silently lost. */
export const OBSERVER_CAPS = {
    events: 400,
    keyframes: 48,
    ancestorSnapshots: 6,
    identitiesPerTarget: 8,
    curtainInstances: 16,
    viewports: 8,
} as const;

// ── Types ───────────────────────────────────────────────────────────────────────────────────────────

export type TargetRole = 'chrome' | 'structure' | 'context';
export type DeriveKind = 'nearest-fixed-ancestor' | 'closest-footer' | 'curtain' | 'parent';
export type TargetStatus = 'pending' | 'present' | 'ambiguous' | 'removed';
export type IdentityRelation = 'first' | 'same' | 'replaced';
export type ViewportRelation = 'no-rect' | 'inside' | 'partial' | 'outside';
export type CaptureValidity = 'valid' | 'incomplete' | 'invalid';
export type Mechanism =
    | 'removed'
    | 'replaced'
    | 'hidden-by-style'
    | 'offscreen'
    | 'partially-offscreen'
    | 'displayed-overlay-overlap'
    | 'document-replaced';

export interface TargetDef {
    key: string;
    role: TargetRole;
    /** Selector-resolved targets. Mutually exclusive with derive/from. */
    selector?: string;
    /** Derived targets are resolved from the single element of an earlier target named by `from`. */
    derive?: DeriveKind;
    from?: string;
}

export interface RectNumbers {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IntersectionResult extends RectNumbers {
    area: number;
}

export interface OverlapMeasure {
    /** Rectangle intersection regardless of whether the curtain is displayed. */
    geometric: IntersectionResult;
    /** The same intersection, but zero unless the curtain is displayed by computed style. */
    displayed: IntersectionResult;
}

export interface BoundedStore {
    items: unknown[];
    cap: number;
    dropped: number;
}

export interface DocumentIdentity {
    docId: string;
    timeOrigin: number;
    url: string;
    readyState: string;
    navType: string | null;
}

export type DocStartPost = DocumentIdentity;

export interface TargetAggregate {
    key: string;
    role: TargetRole;
    status: TargetStatus;
    everSeen: boolean;
    matchCountLast: number;
    framesPending: number;
    framesPresent: number;
    framesAmbiguous: number;
    framesRemoved: number;
    removalEpisodes: number;
    replacedCount: number;
    /** The earliest distinct node identities resolved for this target, capped at OBSERVER_CAPS.identitiesPerTarget. */
    identities: number[];
    /** Distinct node identities ever resolved for this target. Complete even when the identities list is capped. */
    identitiesDistinct: number;
    /** Distinct identities beyond the list cap (never listed). identitiesDistinct = identities.length + identitiesOmitted. */
    identitiesOmitted: number;
    hiddenStyleFrames: number;
    hiddenStyleEpisodes: number;
    offscreenFrames: number;
    partialOffscreenFrames: number;
    displayedFrames: number;
    lastRect: RectNumbers | null;
    firstPresentFrame: number | null;
    /** MutationObserver removal records touching this target's last known element (may include moves). */
    mutationRemovals: number;
}

export interface OverlapAggregate {
    target: string;
    geometricFrames: number;
    displayedFrames: number;
    displayedEpisodes: number;
    maxGeometricArea: number;
    maxDisplayedArea: number;
    maxDisplayed: {
        frame: number;
        curtainRect: RectNumbers;
        targetRect: RectNumbers;
        intersection: IntersectionResult;
    } | null;
}

export interface CurtainInstance {
    id: number;
    firstFrame: number;
    displayedIntervals: number;
    displayedFrames: number;
    lastDisplayed: boolean;
}

export interface CurtainAggregate {
    instances: CurtainInstance[];
    instancesTotal: number;
    instancesDropped: number;
    toDisplayed: number;
    toHidden: number;
    /** Per instance: displayed intervals beyond the first. A new instance's first display is not a re-show. */
    reShowCount: number;
    displayedFrames: number;
    resolvedFrames: number;
    locator: string;
}

export interface ViewportRecord {
    width: number;
    height: number;
    visualWidth: number | null;
    visualHeight: number | null;
}

export interface ViewportLedger {
    /** The earliest distinct viewport sizes, capped at `cap`. */
    records: ViewportRecord[];
    /** Distinct width x height keys already counted (listed or omitted). */
    seen: Set<string>;
    cap: number;
    /** Distinct viewport sizes ever seen. Complete even when the records list is capped. */
    distinct: number;
    /** Distinct viewport sizes beyond the cap (never listed). distinct = records.length + omitted. */
    omitted: number;
}

export type SettleStepEvent = 'idle' | 'none' | 'reset' | 'reached' | 'resatisfied';

/** One frame's view of the settle conditions, built from the frame's resolved targets. */
export interface SettleSample {
    /** True when every required structure is present (exactly one match) and the curtain is not displayed. */
    conditionsMet: boolean;
    /** The first unmet condition (for example "container:removed" or "curtain-displayed"); null when the conditions are met. */
    blocker: string | null;
    /** Curtain display state by computed style; null when the curtain is not present. */
    curtainDisplayed: boolean | null;
    /** Node identities of the required structures plus the rectangles of the geometry structures; '' when not met. */
    signature: string;
}

export interface SettleSnapshot {
    /** False until the test arms the epoch. The document-start tracker is armed from the first frame. */
    armed: boolean;
    /** 0 for the document-start tracker and before any arming; 1, 2, ... for each arming. */
    epochId: number;
    /** Frames already sampled when the epoch was armed; the first epoch frame is armedAfterFrame + 1. */
    armedAfterFrame: number | null;
    /** Page-clock time of the arming. */
    armedAtMs: number | null;
    /** First frame of the current stable sequence (its baseline frame); null while no sequence is running. */
    sequenceStartFrame: number | null;
    /** Consecutive unchanged frame-to-frame comparisons in the current sequence. */
    consecutive: number;
    /** The endpoint, judged on the most recent sampled frame: a sequence is running and has reached the required comparisons. */
    satisfiedNow: boolean;
    /** Latched: the required comparisons were reached at least once since arming. Historical evidence, never proof of current stability. */
    reached: boolean;
    reachedFrame: number | null;
    /** Times a running sequence was broken (curtain shown, required structure missing, identity or geometry changed). */
    resets: number;
    /** Resets that broke a sequence which was satisfying the endpoint at the time. */
    invalidationsAfterReached: number;
    lastResetReason: string | null;
    lastResetFrame: number | null;
    /** The first unmet condition at the most recent sampled frame; null when the conditions are met. */
    currentBlocker: string | null;
    /** Hidden-to-displayed curtain transitions since arming. */
    reShowsSinceArm: number;
    lastReShowFrame: number | null;
}

export interface SettleTracker extends SettleSnapshot {
    /** Signature of the running sequence's baseline; null while no sequence is running. */
    signature: string | null;
    curtainDisplayedPrev: boolean | null;
}

export interface SettleReport {
    comparisonsRequired: number;
    /** Document-start sequence: latched first-settle evidence. NOT the endpoint and NOT proof of current stability. */
    historical: SettleSnapshot;
    /** The current endpoint: armed by the test after R6 and judged on the final observation. */
    epoch: SettleSnapshot;
}

export interface SettleArmResult {
    armed: boolean;
    epochId: number;
    armedAfterFrame: number | null;
    armedAtMs: number | null;
    reason: string | null;
}

export interface ReadinessProxies {
    controlPlayPresent: boolean;
    controlPlayDisabled: boolean | null;
    apiPresent: boolean;
    apiId: number | null;
    isReadyForPlayback: boolean | null;
    scoreLoaded: boolean | null;
}

export interface EnvironmentEvidence {
    pointerFine: boolean;
    hoverHover: boolean;
    maxTouchPoints: number;
    devicePixelRatio: number;
    dataTheme: string | null;
    mainScrollbarGutterPx: number | null;
}

export interface ScrollState {
    mainScrollTop: number | null;
    mainScrollHeight: number | null;
    mainClientHeight: number | null;
    documentScrollTop: number;
}

export interface FrameTarget {
    status: TargetStatus;
    matchCount: number;
    id: number | null;
    rect: RectNumbers | null;
    displayed: boolean | null;
    hidden: boolean | null;
    relation: ViewportRelation | null;
}

export interface ObserverEvent {
    frame: number;
    tMs: number;
    kind: string;
    changes: Array<{ target: string; from: string; to: string }>;
    detail: string | null;
}

export interface KeyframeRecord {
    frame: number;
    tMs: number;
    reason: string;
    viewport: { width: number; height: number };
    scroll: ScrollState;
    targets: Record<string, FrameTarget>;
    overlapAreas: Record<string, { geometric: number; displayed: number }>;
    readiness: ReadinessProxies;
}

export interface AncestorEntry {
    tag: string;
    id: string;
    classes: string;
    position: string;
    zIndex: string;
    display: string;
    visibility: string;
    opacity: string;
    overflowX: string;
    overflowY: string;
    pointerEvents: string;
    transform: string;
    filter: string;
    backdropFilter: string;
    perspective: string;
    isolation: string;
    mixBlendMode: string;
    willChange: string;
    contain: string;
    clipPath: string;
    /** Evidence list only: computed values that can matter to stacking. No paint order is derived from it. */
    contextRelevantNonInitial: string[];
}

export interface AncestorChain {
    entries: AncestorEntry[];
    truncated: boolean;
}

export interface AncestorSnapshot {
    reason: string;
    frame: number;
    tMs: number;
    chains: Record<string, AncestorChain | null>;
    evidenceNote: string;
}

export interface ObserverStatus {
    frames: number;
    finished: boolean;
    stopped: boolean;
    frameCapReached: boolean;
    targets: Record<string, TargetStatus>;
    matchCounts: Record<string, number>;
    /** The current settle epoch has been armed by the test. */
    settleArmed: boolean;
    /** The endpoint, judged on the most recent sampled frame of the current epoch (not a latched flag). */
    settleSatisfiedNow: boolean;
    /** Consecutive unchanged comparisons in the current epoch's running sequence. */
    settleConsecutive: number;
    /** Latched within the epoch: the threshold was reached at least once. Historical evidence only. */
    settleReachedInEpoch: boolean;
    settleBlocker: string | null;
    curtainDisplayed: boolean | null;
    errors: number;
}

export interface ObserverReport {
    schema: 1;
    docId: string;
    finished: boolean;
    frames: number;
    frameCap: number;
    frameCapReached: boolean;
    elapsedMs: number;
    /** The earliest distinct viewport sizes, capped at OBSERVER_CAPS.viewports. */
    viewports: ViewportRecord[];
    /** Distinct viewport sizes seen. Complete even when the viewports list is capped. */
    viewportDistinct: number;
    targets: Record<string, TargetAggregate>;
    overlaps: Record<string, OverlapAggregate>;
    curtain: CurtainAggregate;
    settle: SettleReport;
    readiness: ReadinessProxies;
    controlPlayFirstEnabledFrame: number | null;
    environment: EnvironmentEvidence | null;
    scroll: ScrollState | null;
    events: ObserverEvent[];
    keyframes: KeyframeRecord[];
    ancestorEvidence: AncestorSnapshot[];
    truncation: {
        eventsDropped: number;
        keyframesDropped: number;
        ancestorSnapshotsDropped: number;
        curtainInstancesDropped: number;
        /** Sum over all targets of distinct node identities that were counted but not listed. */
        identityRecordsOmitted: number;
        /** Distinct viewport sizes that were counted but not listed. */
        viewportRecordsOmitted: number;
    };
    observerErrors: { count: number; first: string | null };
    mutationObserverRecords: number;
    documentIdentity: DocumentIdentity;
}

export interface ObserverArgs {
    observerKey: string;
    postBinding: string;
    rectScale: number;
    tolerancePx: number;
    settleComparisons: number;
    maxFrames: number;
    curtainZIndex: string;
    curtainSearchDepth: number;
    ancestorDepth: number;
    controlPlayId: string;
    targets: TargetDef[];
    /** Structures that must be present, with unchanged node identity, for a settle sequence to continue. */
    settleRequiredKeys: string[];
    /** Structures whose rectangles must be unchanged for a settle sequence to continue. */
    settleGeometryKeys: string[];
    caps: {
        events: number;
        keyframes: number;
        ancestorSnapshots: number;
        identitiesPerTarget: number;
        curtainInstances: number;
        viewports: number;
    };
}

export interface ChromeObserverOptions {
    settleComparisons: number;
    maxFrames: number;
    tolerancePx: number;
}

export interface ChromeObserverHandle {
    docStarts: DocStartPost[];
    docStartsDropped: number;
}

// ── Target definitions ──────────────────────────────────────────────────────────────────────────────

/**
 * Order matters: a derived target is resolved from the single element of an EARLIER target. Selectors are the
 * product's existing hooks (this helper adds no test hooks to the product). The curtain is not located by a hook: it
 * is located by DOM position (a sibling of an ancestor of the container) and computed-style matching (position
 * absolute, z-index CURTAIN_Z_INDEX_LOCATOR, pointer-events none), and must resolve to exactly one element. This
 * locator was written before the renderer gained its data-maestro-curtain attribute and still does not use it; the
 * footer-hole regression spec reads that attribute separately.
 */
export const TARGET_DEFS: ReadonlyArray<TargetDef> = [
    { key: 'trayDesktop', role: 'chrome', selector: '.maestro-tray-desktop' },
    { key: 'transportBar', role: 'chrome', selector: '[data-transport-bar]' },
    { key: 'trayMobile', role: 'context', selector: '.maestro-tray-mobile' },
    { key: 'mobileBar', role: 'context', selector: '[data-maestro-control-panel]' },
    { key: 'main', role: 'structure', selector: 'main' },
    { key: 'playerHost', role: 'structure', selector: 'main #maestro-player' },
    { key: 'container', role: 'structure', selector: 'main #maestro-player .alphatab-container' },
    { key: 'topTrayWrapper', role: 'structure', derive: 'nearest-fixed-ancestor', from: 'trayDesktop' },
    { key: 'footer', role: 'structure', derive: 'closest-footer', from: 'transportBar' },
    { key: 'curtain', role: 'structure', derive: 'curtain', from: 'container' },
    { key: 'rendererRoot', role: 'structure', derive: 'parent', from: 'curtain' },
];

export const CHROME_TARGET_KEYS: readonly string[] = TARGET_DEFS.filter((def) => def.role === 'chrome').map((def) => def.key);

/** Targets a capture needs before it can be called complete. Context targets are recorded but never required. */
export const REQUIRED_TARGET_KEYS: readonly string[] = [
    'trayDesktop',
    'transportBar',
    'footer',
    'main',
    'playerHost',
    'container',
    'curtain',
];

/**
 * Structures that must be present, with unchanged node identity, for a settle sequence to continue: every required
 * target plus the renderer root. Their rectangles are NOT part of the settle signature (see SETTLE_GEOMETRY_KEYS);
 * the chrome targets' rectangles are observed separately through the overlap and viewport-relation measures.
 */
export const SETTLE_REQUIRED_KEYS: readonly string[] = [...REQUIRED_TARGET_KEYS, 'rendererRoot'];

/** Structures whose rectangles must be unchanged (compared exactly, at RECT_SCALE precision) for a settle sequence to continue. */
export const SETTLE_GEOMETRY_KEYS: readonly string[] = ['rendererRoot', 'container'];

/** Keys the in-page function addresses by literal name; the D0 controls assert each exists in TARGET_DEFS. */
export const IN_PAGE_KEY_DEPENDENCIES: readonly string[] = [
    'main',
    'container',
    'curtain',
    'rendererRoot',
    'footer',
    'transportBar',
    'topTrayWrapper',
    'trayDesktop',
];

// ── Embedded pure helpers (self-contained: no module-scope references, no ?. ?? or object spread) ────

function roundTo(value: number, scale: number): number {
    return Math.round(value * scale) / scale;
}

function intersectRects(a: RectNumbers | null, b: RectNumbers | null, scale: number): IntersectionResult {
    const none: IntersectionResult = { x: 0, y: 0, width: 0, height: 0, area: 0 };
    if (a === null || b === null) return none;
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const width = Math.min(a.x + a.width, b.x + b.width) - left;
    const height = Math.min(a.y + a.height, b.y + b.height) - top;
    if (!(width > 0) || !(height > 0)) return none;
    const w = roundTo(width, scale);
    const h = roundTo(height, scale);
    if (!(w > 0) || !(h > 0)) return none;
    return { x: roundTo(left, scale), y: roundTo(top, scale), width: w, height: h, area: roundTo(w * h, scale) };
}

function viewportRelation(rect: RectNumbers | null, width: number, height: number, tolerance: number): ViewportRelation {
    if (rect === null || !(rect.width > 0) || !(rect.height > 0)) return 'no-rect';
    const overlap = intersectRects(rect, { x: 0, y: 0, width: width, height: height }, 100);
    if (overlap.area === 0) return 'outside';
    const beyond =
        rect.x < -tolerance ||
        rect.y < -tolerance ||
        rect.x + rect.width > width + tolerance ||
        rect.y + rect.height > height + tolerance;
    return beyond ? 'partial' : 'inside';
}

function isDisplayedByStyle(display: string, visibility: string, opacity: string): boolean {
    return display !== 'none' && visibility === 'visible' && parseFloat(opacity) > 0;
}

function resolveTargetStatus(matchCount: number, everSeen: boolean): TargetStatus {
    if (matchCount === 0) return everSeen ? 'removed' : 'pending';
    return matchCount === 1 ? 'present' : 'ambiguous';
}

function identityRelation(previousId: number | null, currentId: number | null): IdentityRelation | null {
    if (currentId === null) return null;
    if (previousId === null) return 'first';
    return previousId === currentId ? 'same' : 'replaced';
}

function boundedPush(store: BoundedStore, item: unknown): boolean {
    if (store.items.length >= store.cap) {
        store.dropped += 1;
        return false;
    }
    store.items.push(item);
    return true;
}

function measureOverlap(
    curtainRect: RectNumbers | null,
    curtainDisplayed: boolean,
    targetRect: RectNumbers | null,
    scale: number,
): OverlapMeasure {
    const geometric = intersectRects(curtainRect, targetRect, scale);
    const displayed = curtainDisplayed ? geometric : intersectRects(null, null, scale);
    return { geometric: geometric, displayed: displayed };
}

function makeEmptyTargetAggregate(key: string, role: TargetRole): TargetAggregate {
    return {
        key: key,
        role: role,
        status: 'pending',
        everSeen: false,
        matchCountLast: 0,
        framesPending: 0,
        framesPresent: 0,
        framesAmbiguous: 0,
        framesRemoved: 0,
        removalEpisodes: 0,
        replacedCount: 0,
        identities: [],
        identitiesDistinct: 0,
        identitiesOmitted: 0,
        hiddenStyleFrames: 0,
        hiddenStyleEpisodes: 0,
        offscreenFrames: 0,
        partialOffscreenFrames: 0,
        displayedFrames: 0,
        lastRect: null,
        firstPresentFrame: null,
        mutationRemovals: 0,
    };
}

function makeEmptyOverlapAggregate(target: string): OverlapAggregate {
    return {
        target: target,
        geometricFrames: 0,
        displayedFrames: 0,
        displayedEpisodes: 0,
        maxGeometricArea: 0,
        maxDisplayedArea: 0,
        maxDisplayed: null,
    };
}

/**
 * Counts a node identity for a target. The list keeps the earliest `cap` distinct identities; the rest are counted in
 * identitiesOmitted, so identitiesDistinct stays complete. Returns true when the identity was new for this target.
 */
function recordIdentity(agg: TargetAggregate, seen: Set<number>, id: number, cap: number): boolean {
    if (seen.has(id)) return false;
    seen.add(id);
    agg.identitiesDistinct += 1;
    if (agg.identities.length < cap) agg.identities.push(id);
    else agg.identitiesOmitted += 1;
    return true;
}

function makeViewportLedger(cap: number): ViewportLedger {
    return { records: [], seen: new Set<string>(), cap: cap, distinct: 0, omitted: 0 };
}

/**
 * Counts a viewport size. The list keeps the earliest `cap` distinct sizes; the rest are counted in omitted, so
 * distinct stays complete. Returns true when the size was new.
 */
function recordViewport(
    ledger: ViewportLedger,
    width: number,
    height: number,
    visualWidth: number | null,
    visualHeight: number | null,
): boolean {
    const key = width + 'x' + height;
    if (ledger.seen.has(key)) return false;
    ledger.seen.add(key);
    ledger.distinct += 1;
    if (ledger.records.length < ledger.cap) {
        ledger.records.push({ width: width, height: height, visualWidth: visualWidth, visualHeight: visualHeight });
    } else {
        ledger.omitted += 1;
    }
    return true;
}

function makeSettleTracker(armed: boolean, epochId: number, armedAfterFrame: number | null, armedAtMs: number | null): SettleTracker {
    return {
        armed: armed,
        epochId: epochId,
        armedAfterFrame: armedAfterFrame,
        armedAtMs: armedAtMs,
        sequenceStartFrame: null,
        consecutive: 0,
        satisfiedNow: false,
        reached: false,
        reachedFrame: null,
        resets: 0,
        invalidationsAfterReached: 0,
        lastResetReason: null,
        lastResetFrame: null,
        currentBlocker: null,
        reShowsSinceArm: 0,
        lastReShowFrame: null,
        signature: null,
        curtainDisplayedPrev: null,
    };
}

/**
 * Starts a fresh epoch: returns a NEW tracker, so nothing from earlier frames (including an earlier stable interval)
 * is inherited. The first epoch frame is framesSampled + 1.
 */
function armSettleTracker(previous: SettleTracker, framesSampled: number, atMs: number): SettleTracker {
    return makeSettleTracker(true, previous.epochId + 1, framesSampled, atMs);
}

/**
 * Advances a tracker by one sampled frame. `required` is the number of consecutive unchanged comparisons (>= 1). A
 * sequence starts on the first frame whose conditions are met (its baseline); each later frame with the same signature
 * is one unchanged comparison. A frame whose conditions are not met, or whose signature differs, breaks a running
 * sequence (counted as a reset); a changed signature also becomes the new baseline.
 */
function stepSettleTracker(tracker: SettleTracker, frame: number, sample: SettleSample, required: number): SettleStepEvent {
    if (!tracker.armed) return 'idle';
    const wasSatisfied = tracker.satisfiedNow;
    if (sample.curtainDisplayed !== null) {
        if (tracker.curtainDisplayedPrev === false && sample.curtainDisplayed === true) {
            tracker.reShowsSinceArm += 1;
            tracker.lastReShowFrame = frame;
        }
        tracker.curtainDisplayedPrev = sample.curtainDisplayed;
    }
    tracker.currentBlocker = sample.blocker;
    let resetReason: string | null = null;
    if (!sample.conditionsMet) {
        if (tracker.signature !== null) resetReason = sample.blocker === null ? 'conditions-not-met' : sample.blocker;
        tracker.signature = null;
        tracker.sequenceStartFrame = null;
        tracker.consecutive = 0;
    } else if (tracker.signature === null) {
        tracker.signature = sample.signature;
        tracker.sequenceStartFrame = frame;
        tracker.consecutive = 0;
    } else if (tracker.signature === sample.signature) {
        tracker.consecutive += 1;
    } else {
        resetReason = 'identity-or-geometry-changed';
        tracker.signature = sample.signature;
        tracker.sequenceStartFrame = frame;
        tracker.consecutive = 0;
    }
    let event: SettleStepEvent = 'none';
    if (resetReason !== null) {
        tracker.resets += 1;
        tracker.lastResetReason = resetReason;
        tracker.lastResetFrame = frame;
        if (wasSatisfied) tracker.invalidationsAfterReached += 1;
        event = 'reset';
    }
    tracker.satisfiedNow = tracker.signature !== null && tracker.consecutive >= required;
    if (tracker.satisfiedNow && !wasSatisfied) {
        if (tracker.reached) {
            event = 'resatisfied';
        } else {
            tracker.reached = true;
            tracker.reachedFrame = frame;
            event = 'reached';
        }
    }
    return event;
}

function snapshotSettleTracker(tracker: SettleTracker): SettleSnapshot {
    return {
        armed: tracker.armed,
        epochId: tracker.epochId,
        armedAfterFrame: tracker.armedAfterFrame,
        armedAtMs: tracker.armedAtMs,
        sequenceStartFrame: tracker.sequenceStartFrame,
        consecutive: tracker.consecutive,
        satisfiedNow: tracker.satisfiedNow,
        reached: tracker.reached,
        reachedFrame: tracker.reachedFrame,
        resets: tracker.resets,
        invalidationsAfterReached: tracker.invalidationsAfterReached,
        lastResetReason: tracker.lastResetReason,
        lastResetFrame: tracker.lastResetFrame,
        currentBlocker: tracker.currentBlocker,
        reShowsSinceArm: tracker.reShowsSinceArm,
        lastReShowFrame: tracker.lastReShowFrame,
    };
}

/**
 * Builds one frame's settle sample. The conditions are met when every required structure resolved to exactly one
 * element and the curtain is not displayed. The signature joins the required structures' node identities with the
 * geometry structures' rectangles, so a replaced node or a moved or resized rectangle changes it.
 */
function buildSettleSample(frameTargets: Record<string, FrameTarget>, requiredKeys: string[], geometryKeys: string[]): SettleSample {
    const curtain = frameTargets['curtain'];
    const curtainDisplayed: boolean | null = curtain !== undefined && curtain.status === 'present' ? curtain.displayed === true : null;
    let blocker: string | null = null;
    for (const key of requiredKeys) {
        const target = frameTargets[key];
        if (target === undefined) {
            blocker = key + ':undefined';
            break;
        }
        if (target.status !== 'present') {
            blocker = key + ':' + target.status;
            break;
        }
    }
    if (blocker === null && curtainDisplayed === true) blocker = 'curtain-displayed';
    if (blocker !== null) {
        return { conditionsMet: false, blocker: blocker, curtainDisplayed: curtainDisplayed, signature: '' };
    }
    const ids: Array<number | null> = [];
    for (const key of requiredKeys) ids.push(frameTargets[key].id);
    const rects: Array<RectNumbers | null> = [];
    for (const key of geometryKeys) rects.push(frameTargets[key] === undefined ? null : frameTargets[key].rect);
    return { conditionsMet: true, blocker: null, curtainDisplayed: curtainDisplayed, signature: JSON.stringify([ids, rects]) };
}

/** Single source of truth for what is embedded in the page and what the D0 controls exercise. Keys equal function names. */
export const EMBEDDED_HELPERS = {
    roundTo,
    intersectRects,
    viewportRelation,
    isDisplayedByStyle,
    resolveTargetStatus,
    identityRelation,
    boundedPush,
    measureOverlap,
    makeEmptyTargetAggregate,
    makeEmptyOverlapAggregate,
    recordIdentity,
    makeViewportLedger,
    recordViewport,
    makeSettleTracker,
    armSettleTracker,
    stepSettleTracker,
    snapshotSettleTracker,
    buildSettleSample,
};

export function buildHelperBundleSource(): string {
    return Object.values(EMBEDDED_HELPERS)
        .map((fn) => fn.toString())
        .join('\n');
}

export {
    roundTo,
    intersectRects,
    viewportRelation,
    isDisplayedByStyle,
    resolveTargetStatus,
    identityRelation,
    boundedPush,
    measureOverlap,
    makeEmptyTargetAggregate,
    makeEmptyOverlapAggregate,
    recordIdentity,
    makeViewportLedger,
    recordViewport,
    makeSettleTracker,
    armSettleTracker,
    stepSettleTracker,
    snapshotSettleTracker,
    buildSettleSample,
};

// ── In-page observer (serialized: self-contained apart from the embedded helpers and its JSON argument) ───

function observeChromeInPage(args: ObserverArgs): void {
    if (window.top !== window) return;
    const w = window as unknown as Record<string, unknown>;
    if (w[args.observerKey] !== undefined) return;

    const scale = args.rectScale;
    const startedAt = performance.now();
    const stamp = (): number => roundTo(performance.now() - startedAt, scale);

    const navEntries = performance.getEntriesByType('navigation');
    const navEntry = navEntries.length > 0 ? (navEntries[0] as PerformanceNavigationTiming) : null;
    const documentIdentity: DocumentIdentity = {
        docId: String(performance.timeOrigin) + '/' + Math.random().toString(36).slice(2, 10),
        timeOrigin: performance.timeOrigin,
        url: window.location.pathname + window.location.search,
        readyState: document.readyState,
        navType: navEntry === null ? null : navEntry.type,
    };

    const postBinding = w[args.postBinding];
    if (typeof postBinding === 'function') {
        try {
            const pending: unknown = (postBinding as (payload: unknown) => unknown)(documentIdentity);
            if (pending !== null && typeof pending === 'object' && typeof (pending as { catch?: unknown }).catch === 'function') {
                (pending as Promise<unknown>).catch(() => undefined);
            }
        } catch {
            // The binding was unavailable or rejected: Node-side reads still record this document's identity.
        }
    }

    const identities = new WeakMap<object, number>();
    let nextIdentity = 1;
    const identityOf = (obj: object): number => {
        const known = identities.get(obj);
        if (known !== undefined) return known;
        const id = nextIdentity;
        nextIdentity += 1;
        identities.set(obj, id);
        return id;
    };

    const events: ObserverEvent[] = [];
    const keyframes: KeyframeRecord[] = [];
    const ancestorEvidence: AncestorSnapshot[] = [];
    const eventStore: BoundedStore = { items: events, cap: args.caps.events, dropped: 0 };
    const keyframeStore: BoundedStore = { items: keyframes, cap: args.caps.keyframes, dropped: 0 };
    const ancestorStore: BoundedStore = { items: ancestorEvidence, cap: args.caps.ancestorSnapshots, dropped: 0 };

    const aggs: Record<string, TargetAggregate> = {};
    const overlapAggs: Record<string, OverlapAggregate> = {};
    const chromeKeys: string[] = [];
    const lastIds: Record<string, number | null> = {};
    const lastEls: Record<string, Element | null> = {};
    const identitySeen: Record<string, Set<number>> = {};
    const prevStatus: Record<string, TargetStatus> = {};
    const prevHidden: Record<string, boolean> = {};
    const prevDisplayedOverlap: Record<string, boolean> = {};
    const prevSub: Record<string, string> = {};
    for (const def of args.targets) {
        aggs[def.key] = makeEmptyTargetAggregate(def.key, def.role);
        lastIds[def.key] = null;
        lastEls[def.key] = null;
        identitySeen[def.key] = new Set<number>();
        prevStatus[def.key] = 'pending';
        prevHidden[def.key] = false;
        prevDisplayedOverlap[def.key] = false;
        if (def.role === 'chrome') {
            chromeKeys.push(def.key);
            overlapAggs[def.key] = makeEmptyOverlapAggregate(def.key);
        }
    }

    const instanceState = new Map<number, CurtainInstance>();
    const curtainAgg = {
        instancesTotal: 0,
        toDisplayed: 0,
        toHidden: 0,
        reShowCount: 0,
        displayedFrames: 0,
        resolvedFrames: 0,
    };

    const viewportLedger = makeViewportLedger(args.caps.viewports);
    let lastFrameTargets: Record<string, FrameTarget> = {};
    let lastReadiness: ReadinessProxies | null = null;
    let lastEnvironment: EnvironmentEvidence | null = null;
    let lastScroll: ScrollState | null = null;
    let firstEnabledFrame: number | null = null;
    let firstResolutionCaptured = false;
    let overlapOnsetCaptured = false;
    let frames = 0;
    let stopped = false;
    let finished = false;
    let frameCapReached = false;
    let rafId: number | null = null;
    // Historical evidence: the document-start sequence. The endpoint is the epoch tracker, armed by the test after R6.
    const historicalSettle = makeSettleTracker(true, 0, 0, 0);
    let epochSettle = makeSettleTracker(false, 0, null, null);
    let moRecords = 0;
    const observerErrors: { count: number; first: string | null } = { count: 0, first: null };

    const recordError = (error: unknown): void => {
        observerErrors.count += 1;
        if (observerErrors.first === null) {
            observerErrors.first = error instanceof Error ? error.message : String(error);
        }
    };

    const queryAll = (selector: string): Element[] => Array.from(document.querySelectorAll(selector));

    const fixedAncestorOf = (el: Element): Element[] => {
        let node: Element | null = el.parentElement;
        let depth = 0;
        while (node !== null && depth < args.ancestorDepth) {
            if (window.getComputedStyle(node).position === 'fixed') return [node];
            node = node.parentElement;
            depth += 1;
        }
        return [];
    };

    const curtainsOf = (container: Element): Element[] => {
        const found: Element[] = [];
        const host = document.querySelector('main #maestro-player');
        let child: Element = container;
        let node: Element | null = container.parentElement;
        let depth = 0;
        while (node !== null && depth < args.curtainSearchDepth) {
            if (host !== null && node === host) break;
            for (const sibling of Array.from(node.children)) {
                if (sibling === child) continue;
                const cs = window.getComputedStyle(sibling);
                if (cs.position === 'absolute' && cs.zIndex === args.curtainZIndex && cs.pointerEvents === 'none') {
                    found.push(sibling);
                }
            }
            child = node;
            node = node.parentElement;
            depth += 1;
        }
        return found;
    };

    const derive = (kind: DeriveKind, base: Element): Element[] => {
        if (kind === 'nearest-fixed-ancestor') return fixedAncestorOf(base);
        if (kind === 'closest-footer') {
            const footer = base.closest('footer');
            return footer === null ? [] : [footer];
        }
        if (kind === 'curtain') return curtainsOf(base);
        const parent = base.parentElement;
        return parent === null ? [] : [parent];
    };

    const resolveAll = (): Record<string, Element[]> => {
        const out: Record<string, Element[]> = {};
        for (const def of args.targets) {
            let found: Element[] = [];
            if (def.selector !== undefined) {
                found = queryAll(def.selector);
            } else if (def.derive !== undefined && def.from !== undefined) {
                const base = out[def.from];
                if (base !== undefined && base.length === 1) found = derive(def.derive, base[0]);
            }
            out[def.key] = found;
        }
        return out;
    };

    const rectOf = (el: Element): RectNumbers => {
        const r = el.getBoundingClientRect();
        return { x: roundTo(r.x, scale), y: roundTo(r.y, scale), width: roundTo(r.width, scale), height: roundTo(r.height, scale) };
    };

    const checkVisibilityOf = (el: Element): boolean | null => {
        const fn = (el as unknown as {
            checkVisibility?: (options?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
        }).checkVisibility;
        if (typeof fn !== 'function') return null;
        try {
            return fn.call(el, { checkOpacity: true, checkVisibilityCSS: true });
        } catch {
            return null;
        }
    };

    const entryOf = (node: Element): AncestorEntry => {
        const cs = window.getComputedStyle(node);
        const prop = (name: string): string => cs.getPropertyValue(name);
        const clip = (value: string): string => (value.length > 80 ? value.slice(0, 80) + '...' : value);
        const absent = (value: string): boolean => value === '' || value === 'none';
        const nonInitial: string[] = [];
        if (cs.position === 'fixed' || cs.position === 'sticky') nonInitial.push('position:' + cs.position);
        if (cs.position !== 'static' && cs.zIndex !== 'auto') nonInitial.push('positioned-z-index:' + cs.zIndex);
        if (cs.opacity !== '1') nonInitial.push('opacity:' + cs.opacity);
        if (!absent(prop('transform'))) nonInitial.push('transform');
        if (!absent(prop('filter'))) nonInitial.push('filter');
        if (!absent(prop('backdrop-filter'))) nonInitial.push('backdrop-filter');
        if (!absent(prop('perspective'))) nonInitial.push('perspective');
        if (!absent(prop('clip-path'))) nonInitial.push('clip-path');
        if (prop('isolation') === 'isolate') nonInitial.push('isolation:isolate');
        const blend = prop('mix-blend-mode');
        if (blend !== '' && blend !== 'normal') nonInitial.push('mix-blend-mode:' + blend);
        const willChange = prop('will-change');
        if (willChange !== '' && willChange !== 'auto') nonInitial.push('will-change:' + willChange);
        const contain = prop('contain');
        if (!absent(contain)) nonInitial.push('contain:' + contain);
        return {
            tag: node.tagName.toLowerCase(),
            id: node.id,
            classes: clip(node.getAttribute('class') || ''),
            position: cs.position,
            zIndex: cs.zIndex,
            display: cs.display,
            visibility: cs.visibility,
            opacity: cs.opacity,
            overflowX: cs.overflowX,
            overflowY: cs.overflowY,
            pointerEvents: cs.pointerEvents,
            transform: clip(prop('transform')),
            filter: clip(prop('filter')),
            backdropFilter: clip(prop('backdrop-filter')),
            perspective: prop('perspective'),
            isolation: prop('isolation'),
            mixBlendMode: blend,
            willChange: willChange,
            contain: contain,
            clipPath: clip(prop('clip-path')),
            contextRelevantNonInitial: nonInitial,
        };
    };

    const chainOf = (el: Element): AncestorChain => {
        const entries: AncestorEntry[] = [];
        let truncated = false;
        let node: Element | null = el;
        while (node !== null) {
            if (entries.length >= args.ancestorDepth) {
                truncated = true;
                break;
            }
            entries.push(entryOf(node));
            node = node.parentElement;
        }
        return { entries: entries, truncated: truncated };
    };

    const captureAncestors = (reason: string): void => {
        const chains: Record<string, AncestorChain | null> = {};
        for (const key of ['curtain', 'footer', 'transportBar', 'topTrayWrapper', 'trayDesktop']) {
            const el = lastEls[key];
            chains[key] = el !== null && el !== undefined ? chainOf(el) : null;
        }
        if (ancestorStore.items.length >= ancestorStore.cap) {
            ancestorStore.dropped += 1;
            return;
        }
        boundedPush(ancestorStore, {
            reason: reason,
            frame: frames,
            tMs: stamp(),
            chains: chains,
            evidenceNote: 'raw computed-style evidence only; no paint order is derived and no pixel is captured',
        });
    };

    const readReadiness = (detailed: boolean): ReadinessProxies => {
        const cp = document.getElementById(args.controlPlayId);
        const apiRaw = w['__at'];
        const apiPresent = apiRaw !== undefined && apiRaw !== null;
        let apiId: number | null = null;
        let isReady: boolean | null = null;
        let scoreLoaded: boolean | null = null;
        if (apiPresent && typeof apiRaw === 'object') {
            apiId = identityOf(apiRaw as object);
            if (detailed) {
                try {
                    const candidate = (apiRaw as { isReadyForPlayback?: unknown }).isReadyForPlayback;
                    isReady = typeof candidate === 'boolean' ? candidate : null;
                    const score = (apiRaw as { score?: unknown }).score;
                    scoreLoaded = score !== null && score !== undefined;
                } catch {
                    isReady = null;
                    scoreLoaded = null;
                }
            }
        }
        return {
            controlPlayPresent: cp !== null,
            controlPlayDisabled: cp === null ? null : (cp as HTMLButtonElement).disabled === true,
            apiPresent: apiPresent,
            apiId: apiId,
            isReadyForPlayback: isReady,
            scoreLoaded: scoreLoaded,
        };
    };

    const readScroll = (): ScrollState => {
        const mainEl = lastEls['main'];
        const scrolling = document.scrollingElement;
        const has = mainEl !== null && mainEl !== undefined;
        return {
            mainScrollTop: has ? roundTo((mainEl as Element).scrollTop, scale) : null,
            mainScrollHeight: has ? (mainEl as Element).scrollHeight : null,
            mainClientHeight: has ? (mainEl as Element).clientHeight : null,
            documentScrollTop: scrolling === null ? 0 : roundTo(scrolling.scrollTop, scale),
        };
    };

    const readEnvironment = (): EnvironmentEvidence => {
        const mainEl = lastEls['main'];
        const has = mainEl !== null && mainEl !== undefined;
        return {
            pointerFine: window.matchMedia('(pointer: fine)').matches,
            hoverHover: window.matchMedia('(hover: hover)').matches,
            maxTouchPoints: navigator.maxTouchPoints,
            devicePixelRatio: window.devicePixelRatio,
            dataTheme: document.documentElement.getAttribute('data-theme'),
            mainScrollbarGutterPx: has ? (mainEl as HTMLElement).offsetWidth - (mainEl as HTMLElement).clientWidth : null,
        };
    };

    const buildKeyframe = (
        reason: string,
        frameTargets: Record<string, FrameTarget>,
        overlapNow: Record<string, OverlapMeasure>,
        vp: { width: number; height: number },
    ): KeyframeRecord => {
        const overlapAreas: Record<string, { geometric: number; displayed: number }> = {};
        for (const key of chromeKeys) {
            overlapAreas[key] = { geometric: overlapNow[key].geometric.area, displayed: overlapNow[key].displayed.area };
        }
        return {
            frame: frames,
            tMs: stamp(),
            reason: reason,
            viewport: vp,
            scroll: readScroll(),
            targets: frameTargets,
            overlapAreas: overlapAreas,
            readiness: readReadiness(true),
        };
    };

    const runFrame = (isFinal: boolean): void => {
        frames += 1;
        const tMs = stamp();
        const vp = { width: window.innerWidth, height: window.innerHeight };
        const vv = window.visualViewport;
        recordViewport(
            viewportLedger,
            vp.width,
            vp.height,
            vv === null ? null : roundTo(vv.width, scale),
            vv === null ? null : roundTo(vv.height, scale),
        );

        const resolved = resolveAll();
        const frameTargets: Record<string, FrameTarget> = {};
        for (const def of args.targets) {
            const matches = resolved[def.key];
            const agg = aggs[def.key];
            const status = resolveTargetStatus(matches.length, agg.everSeen);
            agg.status = status;
            agg.matchCountLast = matches.length;
            const ft: FrameTarget = {
                status: status,
                matchCount: matches.length,
                id: null,
                rect: null,
                displayed: null,
                hidden: null,
                relation: null,
            };
            if (status === 'present') {
                const el = matches[0];
                const id = identityOf(el);
                if (identityRelation(lastIds[def.key], id) === 'replaced') agg.replacedCount += 1;
                lastIds[def.key] = id;
                recordIdentity(agg, identitySeen[def.key], id, args.caps.identitiesPerTarget);
                agg.everSeen = true;
                agg.framesPresent += 1;
                if (agg.firstPresentFrame === null) agg.firstPresentFrame = frames;
                lastEls[def.key] = el;
                const cs = window.getComputedStyle(el);
                const rect = rectOf(el);
                const displayed = isDisplayedByStyle(cs.display, cs.visibility, cs.opacity);
                const hidden = !displayed || checkVisibilityOf(el) === false;
                const relation = viewportRelation(rect, vp.width, vp.height, args.tolerancePx);
                ft.id = id;
                ft.rect = rect;
                ft.displayed = displayed;
                ft.hidden = hidden;
                ft.relation = relation;
                agg.lastRect = rect;
                if (displayed) agg.displayedFrames += 1;
                if (hidden) {
                    agg.hiddenStyleFrames += 1;
                    if (!prevHidden[def.key]) agg.hiddenStyleEpisodes += 1;
                }
                prevHidden[def.key] = hidden;
                if (relation === 'outside') agg.offscreenFrames += 1;
                else if (relation === 'partial') agg.partialOffscreenFrames += 1;
            } else if (status === 'ambiguous') {
                agg.framesAmbiguous += 1;
                lastEls[def.key] = null;
            } else if (status === 'removed') {
                agg.framesRemoved += 1;
                if (prevStatus[def.key] === 'present') agg.removalEpisodes += 1;
                lastEls[def.key] = null;
                prevHidden[def.key] = false;
            } else {
                agg.framesPending += 1;
            }
            prevStatus[def.key] = status;
            frameTargets[def.key] = ft;
        }
        lastFrameTargets = frameTargets;

        const curtainFt = frameTargets['curtain'];
        const curtainRect = curtainFt.status === 'present' ? curtainFt.rect : null;
        const curtainDisplayed = curtainFt.status === 'present' && curtainFt.displayed === true;

        const overlapNow: Record<string, OverlapMeasure> = {};
        for (const key of chromeKeys) {
            const t = frameTargets[key];
            const targetRect = t.status === 'present' ? t.rect : null;
            const measure = measureOverlap(curtainRect, curtainDisplayed, targetRect, scale);
            overlapNow[key] = measure;
            const oa = overlapAggs[key];
            if (measure.geometric.area > 0) oa.geometricFrames += 1;
            if (measure.geometric.area > oa.maxGeometricArea) oa.maxGeometricArea = measure.geometric.area;
            const displayedNow = measure.displayed.area > 0;
            if (displayedNow) {
                oa.displayedFrames += 1;
                if (!prevDisplayedOverlap[key]) oa.displayedEpisodes += 1;
                if (measure.displayed.area > oa.maxDisplayedArea) {
                    oa.maxDisplayedArea = measure.displayed.area;
                    oa.maxDisplayed = {
                        frame: frames,
                        curtainRect: curtainRect as RectNumbers,
                        targetRect: targetRect as RectNumbers,
                        intersection: measure.displayed,
                    };
                }
            }
            prevDisplayedOverlap[key] = displayedNow;
        }

        if (curtainFt.status === 'present' && curtainFt.id !== null) {
            curtainAgg.resolvedFrames += 1;
            let inst = instanceState.get(curtainFt.id);
            if (inst === undefined) {
                inst = { id: curtainFt.id, firstFrame: frames, displayedIntervals: 0, displayedFrames: 0, lastDisplayed: false };
                instanceState.set(curtainFt.id, inst);
                curtainAgg.instancesTotal += 1;
                boundedPush(eventStore, {
                    frame: frames,
                    tMs: tMs,
                    kind: 'curtain-instance',
                    changes: [],
                    detail: 'instance id ' + curtainFt.id,
                });
            }
            if (curtainDisplayed) {
                curtainAgg.displayedFrames += 1;
                inst.displayedFrames += 1;
                if (!inst.lastDisplayed) {
                    inst.displayedIntervals += 1;
                    curtainAgg.toDisplayed += 1;
                    if (inst.displayedIntervals >= 2) curtainAgg.reShowCount += 1;
                }
            } else if (inst.lastDisplayed) {
                curtainAgg.toHidden += 1;
            }
            inst.lastDisplayed = curtainDisplayed;
        }

        const changes: Array<{ target: string; from: string; to: string }> = [];
        for (const def of args.targets) {
            const t = frameTargets[def.key];
            let sub =
                t.status +
                '|' +
                (t.id === null ? '-' : String(t.id)) +
                '|' +
                (t.hidden === true ? 'H' : '-') +
                (t.displayed === true ? 'D' : '-') +
                '|' +
                (t.relation === null ? '-' : t.relation);
            if (def.role === 'chrome') {
                const om = overlapNow[def.key];
                sub += '|g' + (om.geometric.area > 0 ? '1' : '0') + 'd' + (om.displayed.area > 0 ? '1' : '0');
            }
            const before = prevSub[def.key];
            if (before !== sub) {
                changes.push({ target: def.key, from: before === undefined ? '(none)' : before, to: sub });
                prevSub[def.key] = sub;
            }
        }
        if (changes.length > 0) {
            boundedPush(eventStore, { frame: frames, tMs: tMs, kind: 'state-change', changes: changes, detail: null });
            if (keyframeStore.items.length < keyframeStore.cap) {
                boundedPush(keyframeStore, buildKeyframe('state-change', frameTargets, overlapNow, vp));
            } else {
                keyframeStore.dropped += 1;
            }
        }

        if (
            !firstResolutionCaptured &&
            curtainFt.status === 'present' &&
            frameTargets['footer'].status === 'present' &&
            frameTargets['transportBar'].status === 'present'
        ) {
            firstResolutionCaptured = true;
            captureAncestors('first-resolution');
        }
        if (!overlapOnsetCaptured) {
            for (const key of chromeKeys) {
                if (overlapNow[key].displayed.area > 0) overlapOnsetCaptured = true;
            }
            if (overlapOnsetCaptured) captureAncestors('first-displayed-overlap');
        }

        const settleSample = buildSettleSample(frameTargets, args.settleRequiredKeys, args.settleGeometryKeys);
        const historicalEvent = stepSettleTracker(historicalSettle, frames, settleSample, args.settleComparisons);
        if (historicalEvent === 'reached') {
            boundedPush(eventStore, {
                frame: frames,
                tMs: tMs,
                kind: 'historical-settle-reached',
                changes: [],
                detail: 'document-start sequence; historical evidence, not the endpoint',
            });
        }
        const epochEvent = stepSettleTracker(epochSettle, frames, settleSample, args.settleComparisons);
        if (epochEvent === 'reached' || epochEvent === 'resatisfied') {
            boundedPush(eventStore, {
                frame: frames,
                tMs: tMs,
                kind: epochEvent === 'reached' ? 'settle-reached' : 'settle-resatisfied',
                changes: [],
                detail: 'epoch ' + epochSettle.epochId,
            });
        } else if (epochEvent === 'reset') {
            boundedPush(eventStore, {
                frame: frames,
                tMs: tMs,
                kind: 'settle-reset',
                changes: [],
                detail: 'epoch ' + epochSettle.epochId + ': ' + epochSettle.lastResetReason,
            });
        }

        const readiness = readReadiness(false);
        if (readiness.controlPlayDisabled === false && firstEnabledFrame === null) firstEnabledFrame = frames;
        lastReadiness = readiness;

        if (isFinal) {
            lastReadiness = readReadiness(true);
            lastEnvironment = readEnvironment();
            lastScroll = readScroll();
            captureAncestors('final');
        }
    };

    const mo = new MutationObserver((records: MutationRecord[]) => {
        try {
            moRecords += records.length;
            for (const record of records) {
                if (record.removedNodes.length === 0) continue;
                for (const removed of Array.from(record.removedNodes)) {
                    if (!(removed instanceof Element)) continue;
                    for (const key of chromeKeys) {
                        const el = lastEls[key];
                        if (el !== null && el !== undefined && (removed === el || removed.contains(el))) {
                            aggs[key].mutationRemovals += 1;
                            boundedPush(eventStore, {
                                frame: frames,
                                tMs: stamp(),
                                kind: 'mutation-removal',
                                changes: [],
                                detail: key,
                            });
                        }
                    }
                }
            }
        } catch (error) {
            recordError(error);
        }
    });
    mo.observe(document, { childList: true, subtree: true });

    const loop = (): void => {
        rafId = null;
        if (stopped) return;
        try {
            runFrame(false);
        } catch (error) {
            recordError(error);
        }
        if (stopped) return;
        if (frames >= args.maxFrames) {
            frameCapReached = true;
            stopped = true;
            return;
        }
        rafId = window.requestAnimationFrame(loop);
    };

    const status = (): ObserverStatus => {
        const targets: Record<string, TargetStatus> = {};
        const matchCounts: Record<string, number> = {};
        for (const def of args.targets) {
            targets[def.key] = aggs[def.key].status;
            matchCounts[def.key] = aggs[def.key].matchCountLast;
        }
        const curtainFt = lastFrameTargets['curtain'];
        return {
            frames: frames,
            finished: finished,
            stopped: stopped,
            frameCapReached: frameCapReached,
            targets: targets,
            matchCounts: matchCounts,
            settleArmed: epochSettle.armed,
            settleSatisfiedNow: epochSettle.satisfiedNow,
            settleConsecutive: epochSettle.consecutive,
            settleReachedInEpoch: epochSettle.reached,
            settleBlocker: epochSettle.currentBlocker,
            curtainDisplayed: curtainFt === undefined || curtainFt.status !== 'present' ? null : curtainFt.displayed === true,
            errors: observerErrors.count,
        };
    };

    /** Starts a fresh settle epoch. Only test-owned settle state is reset; nothing earlier is inherited. */
    const armSettle = (): SettleArmResult => {
        if (finished) {
            return {
                armed: false,
                epochId: epochSettle.epochId,
                armedAfterFrame: epochSettle.armedAfterFrame,
                armedAtMs: epochSettle.armedAtMs,
                reason: 'the observer was already finished',
            };
        }
        const armedAt = stamp();
        epochSettle = armSettleTracker(epochSettle, frames, armedAt);
        boundedPush(eventStore, {
            frame: frames,
            tMs: armedAt,
            kind: 'settle-armed',
            changes: [],
            detail: 'epoch ' + epochSettle.epochId + ' armed after frame ' + frames,
        });
        return {
            armed: true,
            epochId: epochSettle.epochId,
            armedAfterFrame: epochSettle.armedAfterFrame,
            armedAtMs: epochSettle.armedAtMs,
            reason: null,
        };
    };

    const buildReport = (): ObserverReport => {
        const allInstances = Array.from(instanceState.values());
        const listed = allInstances.slice(0, args.caps.curtainInstances);
        let identityRecordsOmitted = 0;
        for (const def of args.targets) identityRecordsOmitted += aggs[def.key].identitiesOmitted;
        return {
            schema: 1,
            docId: documentIdentity.docId,
            finished: finished,
            frames: frames,
            frameCap: args.maxFrames,
            frameCapReached: frameCapReached,
            elapsedMs: stamp(),
            viewports: viewportLedger.records,
            viewportDistinct: viewportLedger.distinct,
            targets: aggs,
            overlaps: overlapAggs,
            curtain: {
                instances: listed,
                instancesTotal: curtainAgg.instancesTotal,
                instancesDropped: allInstances.length - listed.length,
                toDisplayed: curtainAgg.toDisplayed,
                toHidden: curtainAgg.toHidden,
                reShowCount: curtainAgg.reShowCount,
                displayedFrames: curtainAgg.displayedFrames,
                resolvedFrames: curtainAgg.resolvedFrames,
                locator:
                    'sibling of a container ancestor: position=absolute, z-index=' +
                    args.curtainZIndex +
                    ', pointer-events=none',
            },
            settle: {
                comparisonsRequired: args.settleComparisons,
                historical: snapshotSettleTracker(historicalSettle),
                epoch: snapshotSettleTracker(epochSettle),
            },
            readiness:
                lastReadiness === null
                    ? {
                          controlPlayPresent: false,
                          controlPlayDisabled: null,
                          apiPresent: false,
                          apiId: null,
                          isReadyForPlayback: null,
                          scoreLoaded: null,
                      }
                    : lastReadiness,
            controlPlayFirstEnabledFrame: firstEnabledFrame,
            environment: lastEnvironment,
            scroll: lastScroll,
            events: events,
            keyframes: keyframes,
            ancestorEvidence: ancestorEvidence,
            truncation: {
                eventsDropped: eventStore.dropped,
                keyframesDropped: keyframeStore.dropped,
                ancestorSnapshotsDropped: ancestorStore.dropped,
                curtainInstancesDropped: allInstances.length - listed.length,
                identityRecordsOmitted: identityRecordsOmitted,
                viewportRecordsOmitted: viewportLedger.omitted,
            },
            observerErrors: observerErrors,
            mutationObserverRecords: moRecords,
            documentIdentity: documentIdentity,
        };
    };

    const finish = (): ObserverReport => {
        if (!finished) {
            finished = true;
            stopped = true;
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
            mo.disconnect();
            try {
                runFrame(true);
            } catch (error) {
                recordError(error);
            }
        }
        return buildReport();
    };

    w[args.observerKey] = { status: status, finish: finish, armSettle: armSettle };
    rafId = window.requestAnimationFrame(loop);
}

// ── Script construction (Node side) ─────────────────────────────────────────────────────────────────

export function buildObserverArgs(options: ChromeObserverOptions): ObserverArgs {
    return {
        observerKey: CHROME_OBSERVER_GLOBAL,
        postBinding: CHROME_OBSERVER_POST_BINDING,
        rectScale: RECT_SCALE,
        tolerancePx: options.tolerancePx,
        settleComparisons: options.settleComparisons,
        maxFrames: options.maxFrames,
        curtainZIndex: CURTAIN_Z_INDEX_LOCATOR,
        curtainSearchDepth: CURTAIN_SEARCH_DEPTH,
        ancestorDepth: ANCESTOR_DEPTH,
        controlPlayId: CONTROL_PLAY_ID,
        targets: TARGET_DEFS.map((def) => ({ ...def })),
        settleRequiredKeys: SETTLE_REQUIRED_KEYS.slice(),
        settleGeometryKeys: SETTLE_GEOMETRY_KEYS.slice(),
        caps: { ...OBSERVER_CAPS },
    };
}

/** The exact script text installed as an init script: embedded helpers, then the observer called with JSON data. */
export function buildObserverScript(args: ObserverArgs): string {
    return [
        '(function () {',
        "'use strict';",
        buildHelperBundleSource(),
        '(' + observeChromeInPage.toString() + ')(' + JSON.stringify(args) + ');',
        '})();',
    ].join('\n');
}

function isDocStartPost(value: unknown): value is DocStartPost {
    if (value === null || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v['docId'] === 'string' &&
        typeof v['timeOrigin'] === 'number' &&
        typeof v['url'] === 'string' &&
        typeof v['readyState'] === 'string' &&
        (v['navType'] === null || typeof v['navType'] === 'string')
    );
}

/**
 * Installs the observer as an init script on the context, plus the test-owned exposed function that receives each
 * document's identity at document start. Call, and await, BEFORE the first navigation.
 */
export async function installChromeObserver(context: BrowserContext, options: ChromeObserverOptions): Promise<ChromeObserverHandle> {
    const handle: ChromeObserverHandle = { docStarts: [], docStartsDropped: 0 };
    await context.exposeFunction(CHROME_OBSERVER_POST_BINDING, (payload: unknown): void => {
        if (!isDocStartPost(payload) || handle.docStarts.length >= DOC_START_CAP) {
            handle.docStartsDropped += 1;
            return;
        }
        handle.docStarts.push(payload);
    });
    await context.addInitScript({ content: buildObserverScript(buildObserverArgs(options)) });
    return handle;
}

// ── Node-side reads and bounded waits ───────────────────────────────────────────────────────────────

export class CaptureIncomplete extends Error {
    endpoint: string;
    constructor(endpoint: string, message: string) {
        super(message);
        this.name = 'CaptureIncomplete';
        this.endpoint = endpoint;
    }
}

export async function readObserverStatus(page: Page): Promise<ObserverStatus | null> {
    return page.evaluate((key: string): ObserverStatus | null => {
        const w = window as unknown as Record<string, { status?: () => ObserverStatus } | undefined>;
        const observer = w[key];
        return observer !== undefined && typeof observer.status === 'function' ? observer.status() : null;
    }, CHROME_OBSERVER_GLOBAL);
}

export function describeTargetShortfall(required: readonly string[], status: ObserverStatus | null, timeoutMs: number): string {
    if (status === null) {
        return (
            'required targets not resolved within ' +
            timeoutMs +
            'ms: the observer status could not be read (observer missing from the current document, or the page closed); ' +
            'no product cause is implied'
        );
    }
    const missing: string[] = [];
    const ambiguous: string[] = [];
    for (const key of required) {
        const state = status.targets[key];
        if (state === 'present') continue;
        if (state === 'ambiguous') ambiguous.push(key + '(' + status.matchCounts[key] + ' matches)');
        else missing.push(key + '(' + (state === undefined ? 'not defined' : state) + ')');
    }
    return (
        'required targets not resolved to exactly one element within ' +
        timeoutMs +
        'ms: missing=[' +
        missing.join(', ') +
        '] ambiguous=[' +
        ambiguous.join(', ') +
        ']; frames sampled ' +
        status.frames +
        '; no product cause is implied'
    );
}

export function describeSettleShortfall(status: ObserverStatus | null, comparisonsRequired: number, timeoutMs: number): string {
    if (status === null) {
        return (
            "endpoint 'curtain-settled' not reached within " +
            timeoutMs +
            'ms: the observer status could not be read (observer missing from the current document, or the page closed); ' +
            'no product cause is implied'
        );
    }
    if (!status.settleArmed) {
        return (
            "endpoint 'curtain-settled' not reached within " +
            timeoutMs +
            'ms: the settle epoch was never armed (it starts only after R6 completes); frames sampled ' +
            status.frames +
            '; no product cause is implied'
        );
    }
    return (
        "endpoint 'curtain-settled' not reached within " +
        timeoutMs +
        'ms: ' +
        status.settleConsecutive +
        ' of ' +
        comparisonsRequired +
        ' consecutive comparisons in the current epoch; current blocker: ' +
        (status.settleBlocker === null ? '(none)' : status.settleBlocker) +
        '; the threshold was reached earlier in this epoch: ' +
        String(status.settleReachedInEpoch) +
        '; curtain displayed at the last sample: ' +
        String(status.curtainDisplayed) +
        '; frames sampled ' +
        status.frames +
        '; observations are recorded, no product cause is implied'
    );
}

/** Bounded wait for every required target to resolve to exactly one element. Absent targets are pending until the bound. */
export async function waitForObserverTargets(page: Page, required: readonly string[], timeoutMs: number): Promise<void> {
    try {
        await page.waitForFunction(
            (arg: { key: string; keys: string[] }): boolean => {
                const w = window as unknown as Record<string, { status?: () => ObserverStatus } | undefined>;
                const observer = w[arg.key];
                if (observer === undefined || typeof observer.status !== 'function') return false;
                const targets = observer.status().targets;
                return arg.keys.every((k) => targets[k] === 'present');
            },
            { key: CHROME_OBSERVER_GLOBAL, keys: required.slice() },
            { timeout: timeoutMs },
        );
    } catch (error) {
        if (!(error instanceof errors.TimeoutError)) throw error;
        const status = await readObserverStatus(page).catch(() => null);
        throw new CaptureIncomplete('required-targets', describeTargetShortfall(required, status, timeoutMs));
    }
}

/**
 * Arms a fresh settle epoch in the current document. Call it once, from the test, after R6 has completed: it resets
 * only test-owned settle state and nothing earlier (including an earlier stable interval) counts toward the endpoint.
 */
export async function armCurtainSettleEpoch(page: Page): Promise<SettleArmResult> {
    const result = await page.evaluate((key: string): SettleArmResult | null => {
        const w = window as unknown as Record<string, { armSettle?: () => SettleArmResult } | undefined>;
        const observer = w[key];
        return observer !== undefined && typeof observer.armSettle === 'function' ? observer.armSettle() : null;
    }, CHROME_OBSERVER_GLOBAL);
    if (result === null) {
        throw new CaptureIncomplete(
            'settle-epoch-arm',
            'the settle epoch could not be armed: the observer is not installed in the current document; no product cause is implied',
        );
    }
    if (!result.armed) {
        throw new CaptureIncomplete(
            'settle-epoch-arm',
            'the settle epoch could not be armed: ' + (result.reason === null ? 'no reason given' : result.reason) + '; no product cause is implied',
        );
    }
    return result;
}

/**
 * Bounded wait for the CURRENT settle endpoint of the armed epoch: the curtain hidden, every required structure present
 * with unchanged identity, and the renderer-root and container rectangles unchanged for the required comparisons. The
 * poll reads current state, not a latched flag; the authoritative judgement is the one at the final observation.
 */
export async function waitForCurtainSettled(page: Page, comparisonsRequired: number, timeoutMs: number): Promise<void> {
    try {
        await page.waitForFunction(
            (key: string): boolean => {
                const w = window as unknown as Record<string, { status?: () => ObserverStatus } | undefined>;
                const observer = w[key];
                if (observer === undefined || typeof observer.status !== 'function') return false;
                const current = observer.status();
                return current.settleArmed === true && current.settleSatisfiedNow === true;
            },
            CHROME_OBSERVER_GLOBAL,
            { timeout: timeoutMs },
        );
    } catch (error) {
        if (!(error instanceof errors.TimeoutError)) throw error;
        const status = await readObserverStatus(page).catch(() => null);
        throw new CaptureIncomplete('curtain-settled', describeSettleShortfall(status, comparisonsRequired, timeoutMs));
    }
}

export type ObserverReadResult = { ok: true; report: ObserverReport } | { ok: false; error: string };

/** Stops sampling, disconnects the MutationObserver and returns the report. This is the last awaited browser read of a case. */
export async function finishChromeObserver(page: Page): Promise<ObserverReadResult> {
    try {
        const report = await page.evaluate((key: string): ObserverReport | null => {
            const w = window as unknown as Record<string, { finish?: () => ObserverReport } | undefined>;
            const observer = w[key];
            return observer !== undefined && typeof observer.finish === 'function' ? observer.finish() : null;
        }, CHROME_OBSERVER_GLOBAL);
        if (report === null) return { ok: false, error: 'the observer is not installed in the current document' };
        return { ok: true, report: report };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// ── Main-frame navigation tracking (Node clock; separate from document identity) ─────────────────────

export interface NavigationRecord {
    nodeElapsedMs: number;
    path: string;
}

export interface NavigationTracker {
    snapshot(): { count: number; dropped: number; entries: NavigationRecord[] };
    dispose(): void;
}

export function trackMainFrameNavigations(page: Page): NavigationTracker {
    const startedAt = Date.now();
    const entries: NavigationRecord[] = [];
    let count = 0;
    let dropped = 0;
    const listener = (frame: Frame): void => {
        if (frame !== page.mainFrame()) return;
        count += 1;
        let path = '(unparseable url)';
        try {
            const url = new URL(frame.url());
            path = url.pathname + url.search;
        } catch {
            // keep the placeholder: the URL is not needed for the count
        }
        if (entries.length >= NAVIGATION_CAP) {
            dropped += 1;
            return;
        }
        entries.push({ nodeElapsedMs: Date.now() - startedAt, path: path });
    };
    page.on('framenavigated', listener);
    return {
        snapshot: () => ({ count: count, dropped: dropped, entries: entries.slice() }),
        dispose: () => {
            page.off('framenavigated', listener);
        },
    };
}

// ── Classification (pure; no knowledge of any hypothesis or predicted dimension) ────────────────────

export interface MechanismFinding {
    mechanism: Mechanism;
    target: string;
    evidence: string;
}

export interface Classification {
    captureValidity: CaptureValidity;
    validityReasons: string[];
    mechanisms: MechanismFinding[];
    /** True only for a VALID capture in which no mechanism was observed. It never implies RESOLVED. */
    nonReproduction: boolean;
    notes: string[];
}

export interface ClassificationInput {
    report: ObserverReport | null;
    readError: string | null;
    docStarts: readonly DocStartPost[];
    mainFrameNavigations: number;
    expectedViewport: { width: number; height: number };
    requiredTargets: readonly string[];
    requireSettle: boolean;
}

function buildClassification(
    invalid: string[],
    incomplete: string[],
    mechanisms: MechanismFinding[],
    notes: string[],
): Classification {
    const captureValidity: CaptureValidity = invalid.length > 0 ? 'invalid' : incomplete.length > 0 ? 'incomplete' : 'valid';
    return {
        captureValidity: captureValidity,
        validityReasons: invalid.concat(incomplete),
        mechanisms: mechanisms,
        nonReproduction: captureValidity === 'valid' && mechanisms.length === 0,
        notes: notes,
    };
}

export function classifyObservation(input: ClassificationInput): Classification {
    const invalid: string[] = [];
    const incomplete: string[] = [];
    const mechanisms: MechanismFinding[] = [];
    const notes: string[] = [];
    const report = input.report;

    if (report === null) {
        incomplete.push('incomplete: observer report unavailable' + (input.readError === null ? '' : ': ' + input.readError));
        return buildClassification(invalid, incomplete, mechanisms, notes);
    }

    if (report.observerErrors.count > 0) {
        invalid.push(
            'invalid: the observer recorded ' +
                report.observerErrors.count +
                ' internal error(s); first: ' +
                (report.observerErrors.first === null ? '(none)' : report.observerErrors.first),
        );
    }

    const expected = input.expectedViewport;
    if (report.viewports.length === 0) {
        incomplete.push('incomplete: no viewport sample was recorded');
    } else if (
        report.viewportDistinct !== 1 ||
        report.viewports[0].width !== expected.width ||
        report.viewports[0].height !== expected.height
    ) {
        invalid.push(
            'invalid: viewport differs from the expected ' +
                expected.width +
                'x' +
                expected.height +
                '; observed ' +
                report.viewports.map((v) => v.width + 'x' + v.height).join(', ') +
                (report.truncation.viewportRecordsOmitted > 0
                    ? ' (the viewport record list is truncated: ' +
                      report.viewports.length +
                      ' of ' +
                      report.viewportDistinct +
                      ' distinct viewports listed, earliest first; ' +
                      report.truncation.viewportRecordsOmitted +
                      ' omitted)'
                    : ''),
        );
    }

    if (report.frameCapReached) {
        incomplete.push('incomplete: the frame cap (' + report.frameCap + ') was reached before the capture finished');
    }

    for (const key of input.requiredTargets) {
        const agg = report.targets[key];
        if (agg === undefined) {
            invalid.push('invalid: required target ' + key + ' has no aggregate (target definition and observer disagree)');
            continue;
        }
        if (agg.framesAmbiguous > 0) {
            invalid.push(
                'invalid: required target ' +
                    key +
                    ' resolved to more than one element in ' +
                    agg.framesAmbiguous +
                    ' sampled frame(s) (ambiguous, not missing)',
            );
        } else if (!agg.everSeen) {
            incomplete.push(
                'incomplete: required target ' +
                    key +
                    ' was never resolved (pending at the endpoint; last match count ' +
                    agg.matchCountLast +
                    ')',
            );
        }
    }

    // The settle endpoint is judged on the CURRENT state at the final observation, in the epoch the test armed after R6.
    // The latched `reached` flag and the document-start sequence are historical evidence and never satisfy it.
    const settle = report.settle;
    const epoch = settle.epoch;
    if (input.requireSettle) {
        if (!epoch.armed) {
            incomplete.push(
                "incomplete: endpoint 'curtain-settled' was never armed: its epoch starts only after R6 completes; no product cause is implied",
            );
        } else if (!epoch.satisfiedNow) {
            incomplete.push(
                "incomplete: endpoint 'curtain-settled' not satisfied at the final observation (epoch " +
                    epoch.epochId +
                    ', armed after frame ' +
                    epoch.armedAfterFrame +
                    '): ' +
                    epoch.consecutive +
                    ' of ' +
                    settle.comparisonsRequired +
                    ' consecutive comparisons; current blocker ' +
                    (epoch.currentBlocker === null ? '(none)' : epoch.currentBlocker) +
                    (epoch.reached
                        ? '; the threshold had been reached at frame ' +
                          epoch.reachedFrame +
                          ' and was invalidated afterwards (' +
                          epoch.invalidationsAfterReached +
                          ' time(s); last reset: ' +
                          epoch.lastResetReason +
                          ' at frame ' +
                          epoch.lastResetFrame +
                          ')'
                        : '') +
                    '; no product cause is implied',
            );
        }
        if (settle.historical.reached && !(epoch.armed && epoch.satisfiedNow)) {
            notes.push(
                'a document-start stable sequence was observed (reached at frame ' +
                    settle.historical.reachedFrame +
                    ') but it is historical evidence and does not satisfy the current endpoint',
            );
        }
    }
    if (epoch.armed) {
        if (epoch.reShowsSinceArm > 0) {
            notes.push(
                'curtain re-shown ' +
                    epoch.reShowsSinceArm +
                    ' time(s) after the settle epoch was armed (last at frame ' +
                    epoch.lastReShowFrame +
                    ')',
            );
        }
        if (epoch.satisfiedNow && epoch.resets > 0) {
            notes.push(
                'the settle sequence was reset ' +
                    epoch.resets +
                    ' time(s) within the epoch before the final satisfied sequence (last reset: ' +
                    epoch.lastResetReason +
                    ' at frame ' +
                    epoch.lastResetFrame +
                    '; the final sequence began at frame ' +
                    epoch.sequenceStartFrame +
                    ')',
            );
        }
    }

    const truncation = report.truncation;
    if (truncation.eventsDropped > 0) {
        notes.push(
            'event list truncated in page: the earliest ' +
                report.events.length +
                ' events are retained and ' +
                truncation.eventsDropped +
                ' later event(s) were dropped; aggregate counters stay complete',
        );
    }
    if (truncation.keyframesDropped > 0) {
        notes.push(
            'keyframe list truncated in page: the earliest ' +
                report.keyframes.length +
                ' keyframes are retained and ' +
                truncation.keyframesDropped +
                ' later keyframe(s) were dropped; aggregate counters stay complete',
        );
    }
    if (truncation.ancestorSnapshotsDropped > 0) {
        notes.push(
            'ancestor snapshots truncated in page: the earliest ' +
                report.ancestorEvidence.length +
                ' are retained and ' +
                truncation.ancestorSnapshotsDropped +
                ' later snapshot(s) were dropped',
        );
    }
    if (truncation.curtainInstancesDropped > 0) {
        notes.push(
            'curtain instance list truncated in page: the first ' +
                report.curtain.instances.length +
                ' instances (in first-seen order) are listed and ' +
                truncation.curtainInstancesDropped +
                ' further instance(s) are counted but not listed; instance counters stay complete',
        );
    }
    for (const key of Object.keys(report.targets)) {
        const agg = report.targets[key];
        if (agg.identitiesOmitted > 0) {
            notes.push(
                'identity list truncated in page for ' +
                    key +
                    ': ' +
                    agg.identities.length +
                    ' of ' +
                    agg.identitiesDistinct +
                    ' distinct node identities listed (earliest first), ' +
                    agg.identitiesOmitted +
                    ' omitted; the replacement count stays complete (' +
                    agg.replacedCount +
                    ')',
            );
        }
    }

    const documentIds = new Set<string>(input.docStarts.map((post) => post.docId));
    documentIds.add(report.documentIdentity.docId);
    if (input.docStarts.length === 0) {
        notes.push('no document-start post was received: document identity rests on the final document id only');
    }
    if (documentIds.size > 1) {
        mechanisms.push({
            mechanism: 'document-replaced',
            target: 'document',
            evidence: documentIds.size + ' distinct document ids observed; main-frame navigation events ' + input.mainFrameNavigations,
        });
    } else if (input.mainFrameNavigations > 1) {
        notes.push(
            'main-frame navigation events ' +
                input.mainFrameNavigations +
                ' with one observed document id: a navigation count alone is not document replacement',
        );
    }

    for (const key of CHROME_TARGET_KEYS) {
        const agg = report.targets[key];
        if (agg === undefined) continue;
        if (agg.removalEpisodes > 0) {
            mechanisms.push({
                mechanism: 'removed',
                target: key,
                evidence:
                    'removal episodes ' +
                    agg.removalEpisodes +
                    ', frames absent ' +
                    agg.framesRemoved +
                    ', mutation removal records ' +
                    agg.mutationRemovals,
            });
        }
        if (agg.replacedCount > 0) {
            mechanisms.push({
                mechanism: 'replaced',
                target: key,
                evidence:
                    'node identity changed ' +
                    agg.replacedCount +
                    ' time(s); identities listed ' +
                    agg.identities.join(',') +
                    (agg.identitiesOmitted > 0
                        ? ' (' + agg.identitiesOmitted + ' more distinct identities are not listed; ' + agg.identitiesDistinct + ' distinct in total)'
                        : ''),
            });
        }
        if (agg.mutationRemovals > 0 && agg.removalEpisodes === 0 && agg.replacedCount === 0) {
            notes.push(
                'mutation removal record(s) for ' +
                    key +
                    ' (' +
                    agg.mutationRemovals +
                    ') without a frame-visible removal or replacement: may be a move or re-parent',
            );
        }
        if (agg.hiddenStyleFrames > 0) {
            mechanisms.push({
                mechanism: 'hidden-by-style',
                target: key,
                evidence: 'hidden in ' + agg.hiddenStyleFrames + ' frame(s) over ' + agg.hiddenStyleEpisodes + ' episode(s)',
            });
        }
        if (agg.offscreenFrames > 0) {
            mechanisms.push({
                mechanism: 'offscreen',
                target: key,
                evidence: 'rectangle fully outside the viewport in ' + agg.offscreenFrames + ' frame(s)',
            });
        }
        if (agg.partialOffscreenFrames > 0) {
            mechanisms.push({
                mechanism: 'partially-offscreen',
                target: key,
                evidence: 'rectangle partly outside the viewport in ' + agg.partialOffscreenFrames + ' frame(s)',
            });
        }
        const overlap = report.overlaps[key];
        if (overlap !== undefined) {
            if (overlap.displayedFrames > 0) {
                mechanisms.push({
                    mechanism: 'displayed-overlay-overlap',
                    target: key,
                    evidence:
                        'displayed curtain overlaps in ' +
                        overlap.displayedFrames +
                        ' frame(s) over ' +
                        overlap.displayedEpisodes +
                        ' episode(s); max displayed area ' +
                        overlap.maxDisplayedArea +
                        '. Geometry and display state only: paint order is INFERRED and painted occlusion is NOT MEASURED',
                });
            } else if (overlap.maxGeometricArea > 0) {
                notes.push(
                    'geometric intersection with a non-displayed curtain for ' +
                        key +
                        ' (max area ' +
                        overlap.maxGeometricArea +
                        '): not displayed-overlay overlap',
                );
            }
        }
    }

    return buildClassification(invalid, incomplete, mechanisms, notes);
}

// ── Bounded output ──────────────────────────────────────────────────────────────────────────────────

export type BoundablePayload = { report: ObserverReport | null; [key: string]: unknown };

/** What the emitted JSON keeps when a bounded list is reduced: always the earliest entries. */
export const OUTPUT_RETENTION_POLICY = 'earliest entries are retained; later entries are omitted';

export interface OutputTruncation {
    keyframesOmitted: number;
    eventsOmitted: number;
    ancestorSnapshotsOmitted: number;
    /** What the emitted report still carries of each reducible list (the earliest entries). */
    retained: { keyframes: number; events: number; ancestorSnapshots: number };
    policy: string;
    /** True when the JSON still exceeds the bound after every bounded array was emptied. */
    overflowAfterReduction: boolean;
}

export interface BoundedOutput {
    json: string;
    truncation: OutputTruncation;
}

/**
 * Serializes the payload within maxChars by halving the keyframe, then event, then ancestor-snapshot arrays, keeping the
 * earliest entries of each. Every reduction is reported in the emitted JSON as outputTruncation, with the retained
 * counts; an unavoidable overflow is flagged, never hidden.
 */
export function boundObserverOutput(payload: BoundablePayload, maxChars: number): BoundedOutput {
    const truncation: OutputTruncation = {
        keyframesOmitted: 0,
        eventsOmitted: 0,
        ancestorSnapshotsOmitted: 0,
        retained: { keyframes: 0, events: 0, ancestorSnapshots: 0 },
        policy: OUTPUT_RETENTION_POLICY,
        overflowAfterReduction: false,
    };
    const base = payload.report;
    const render = (report: ObserverReport | null): string => JSON.stringify({ ...payload, report: report, outputTruncation: truncation });
    if (base === null) return { json: render(null), truncation: truncation };

    let keyframes = base.keyframes;
    let events = base.events;
    let ancestors = base.ancestorEvidence;
    const build = (): ObserverReport => ({ ...base, keyframes: keyframes, events: events, ancestorEvidence: ancestors });
    const syncRetained = (): void => {
        truncation.retained = { keyframes: keyframes.length, events: events.length, ancestorSnapshots: ancestors.length };
    };

    syncRetained();
    let json = render(build());
    while (json.length > maxChars && (keyframes.length > 0 || events.length > 0 || ancestors.length > 0)) {
        if (keyframes.length > 0) {
            const next = keyframes.slice(0, Math.floor(keyframes.length / 2));
            truncation.keyframesOmitted += keyframes.length - next.length;
            keyframes = next;
        } else if (events.length > 0) {
            const next = events.slice(0, Math.floor(events.length / 2));
            truncation.eventsOmitted += events.length - next.length;
            events = next;
        } else {
            const next = ancestors.slice(0, Math.floor(ancestors.length / 2));
            truncation.ancestorSnapshotsOmitted += ancestors.length - next.length;
            ancestors = next;
        }
        syncRetained();
        json = render(build());
    }
    if (json.length > maxChars) {
        truncation.overflowAfterReduction = true;
        json = render(build());
    }
    return { json: json, truncation: truncation };
}
