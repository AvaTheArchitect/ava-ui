/**
 * Maestro.ai — alphaTab Log Level Runtime Resolver
 * Version: V1.0.0
 * Date: September 21, 2026
 * Ticket: ALPHATAB-DEBUG-LOGLEVEL-DEVTOOLS-PERF-001
 *
 * Resolves the alphaTab core log level that initAlphaTab applies. alphaTab logs through
 * console.debug at its Debug level (a "Position changed" line on every synth position
 * update, plus per-sample soundfont logs), which floods the DevTools Verbose console during
 * normal playback. The caller-supplied default (Warning, set in initAlphaTab) therefore
 * applies unless an exact-value opt-in is present: ?alphaTabLogLevel=<name>, or
 * localStorage maestro_alphatab_log_level=<name>, where <name> is one of
 * debug | info | warn | error | none.
 *
 * Resolved lazily, client-side only, once per page load — changing the level requires a
 * reload. No React, Next.js or alphaTab dependency: the returned name is mapped to
 * alphaTab's own LogLevel enum by the caller (see alphaTabLogLevelKey), so alphaTab stays
 * the source of truth for the numeric values.
 *
 * Policy (the URL is authoritative for a diagnostic run):
 *   1. overrideEnabled false        → default; query and localStorage are ignored.
 *   2. No query param               → a valid localStorage value, otherwise default.
 *   3. Valid query param            → the query value wins over localStorage.
 *   4. Invalid query param present  → default. localStorage is NOT consulted, so a typo
 *      such as ?alphaTabLogLevel=DEBUG fails safe instead of silently using a stale
 *      stored debug.
 */

export type AlphaTabLogLevelName = 'debug' | 'info' | 'warn' | 'error' | 'none';

// Member names of alphaTab's exported LogLevel enum (see alphaTab.d.ts). The numeric
// values are deliberately NOT duplicated here.
export type AlphaTabLogLevelKey = 'Debug' | 'Info' | 'Warning' | 'Error' | 'None';

export const ALPHATAB_LOG_LEVEL_QUERY_PARAM = 'alphaTabLogLevel';
export const ALPHATAB_LOG_LEVEL_STORAGE_KEY = 'maestro_alphatab_log_level';
export const ALPHATAB_LOG_LEVEL_GLOBAL = '__maestroAlphaTabLogLevel';

export const ALPHATAB_LOG_LEVEL_KEYS: Readonly<Record<AlphaTabLogLevelName, AlphaTabLogLevelKey>> = {
    debug: 'Debug',
    info: 'Info',
    warn: 'Warning',
    error: 'Error',
    none: 'None',
};

const ALPHATAB_LOG_LEVEL_NAMES: readonly AlphaTabLogLevelName[] = [
    'debug',
    'info',
    'warn',
    'error',
    'none',
];

let resolvedAlphaTabLogLevel: AlphaTabLogLevelName | null = null;

type QueryAlphaTabLogLevel =
    | { status: 'absent' }
    | { status: 'valid'; level: AlphaTabLogLevelName }
    | { status: 'invalid' };

// Exact-value gate: only the five literal names are accepted. Anything else
// ('1', 'true', 'DEBUG', 'WARN', 'warning', '', whitespace-padded, unknown, and
// prototype keys such as 'toString') is not a valid level.
function parseAlphaTabLogLevel(value: unknown): AlphaTabLogLevelName | null {
    return (ALPHATAB_LOG_LEVEL_NAMES as readonly unknown[]).includes(value)
        ? (value as AlphaTabLogLevelName)
        : null;
}

// A param that is present but empty or malformed (?alphaTabLogLevel, ?alphaTabLogLevel=) is
// 'invalid', not 'absent' — presence alone makes the URL authoritative.
function readQueryAlphaTabLogLevel(): QueryAlphaTabLogLevel {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has(ALPHATAB_LOG_LEVEL_QUERY_PARAM)) return { status: 'absent' };
        const level = parseAlphaTabLogLevel(params.get(ALPHATAB_LOG_LEVEL_QUERY_PARAM));
        return level !== null ? { status: 'valid', level } : { status: 'invalid' };
    } catch {
        // If the URL cannot be read we cannot know whether it carries a query override.
        // Fail safe to the default rather than fall through to stored state.
        return { status: 'invalid' };
    }
}

function readStoredAlphaTabLogLevel(): AlphaTabLogLevelName | null {
    try {
        return parseAlphaTabLogLevel(window.localStorage.getItem(ALPHATAB_LOG_LEVEL_STORAGE_KEY));
    } catch {
        return null;
    }
}

// Pure: maps a level name to the member name of alphaTab's LogLevel enum, so the caller
// can index the enum (alphaTab.LogLevel[key]) without this module importing alphaTab.
export function alphaTabLogLevelKey(name: AlphaTabLogLevelName): AlphaTabLogLevelKey {
    return ALPHATAB_LOG_LEVEL_KEYS[name];
}

export function resolveAlphaTabLogLevel(
    defaultLevel: AlphaTabLogLevelName,
    overrideEnabled: boolean,
): AlphaTabLogLevelName {
    if (resolvedAlphaTabLogLevel !== null) return resolvedAlphaTabLogLevel;

    // No window (SSR/prerender): return the default without caching, so a later
    // client-side call still resolves against the real environment.
    if (typeof window === 'undefined') return defaultLevel;

    let override: AlphaTabLogLevelName | null = null;
    if (overrideEnabled) {
        const query = readQueryAlphaTabLogLevel();
        if (query.status === 'valid') {
            override = query.level;
        } else if (query.status === 'absent') {
            override = readStoredAlphaTabLogLevel();
        }
        // 'invalid': override stays null → default. Never fall through to localStorage.
    }
    const resolved: AlphaTabLogLevelName = override ?? defaultLevel;

    resolvedAlphaTabLogLevel = resolved;
    try {
        (window as any)[ALPHATAB_LOG_LEVEL_GLOBAL] = resolved;
    } catch {
        // The global is a diagnostic hook only; it must never affect level selection.
    }
    return resolved;
}

// Test-only: clears the once-per-page-load cache and the diagnostic global.
export function resetAlphaTabLogLevelResolutionForTests(): void {
    resolvedAlphaTabLogLevel = null;
    if (typeof window !== 'undefined') {
        try {
            delete (window as any)[ALPHATAB_LOG_LEVEL_GLOBAL];
        } catch {
            // ignore
        }
    }
}
