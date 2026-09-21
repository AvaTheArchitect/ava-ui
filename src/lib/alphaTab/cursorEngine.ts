/**
 * Maestro.ai — Cursor Engine Runtime Selector
 * Version: V1.0.0
 * Date: September 21, 2026
 * Ticket: CURSOR3-RAF-AB-REPLACEMENT-001
 *
 * Resolves which page-layout cursor engine (Cursor2 or Cursor3) AlphaTabRenderer
 * attaches. The caller-supplied default always applies unless an exact-value opt-in
 * (?cursorEngine=cursor2|cursor3, or localStorage maestro_cursor_engine) is present.
 * Resolved lazily, client-side only, once per page load — switching engines requires
 * a reload. No React or Next.js dependency (deliberately no useSearchParams).
 *
 * Policy (the URL is authoritative for a test run):
 *   1. overrideEnabled false        → default; query and localStorage are ignored.
 *   2. No query param               → a valid localStorage value, otherwise default.
 *   3. Valid query param            → the query value wins over localStorage.
 *   4. Invalid query param present  → default. localStorage is NOT consulted, so a typo
 *      such as ?cursorEngine=CURSOR2 fails safe instead of silently using a stale
 *      stored cursor3.
 */

export type CursorEngine = 'cursor2' | 'cursor3';

export const CURSOR_ENGINE_QUERY_PARAM = 'cursorEngine';
export const CURSOR_ENGINE_STORAGE_KEY = 'maestro_cursor_engine';
export const CURSOR_ENGINE_GLOBAL = '__maestroCursorEngine';

let resolvedCursorEngine: CursorEngine | null = null;

type QueryCursorEngine =
    | { status: 'absent' }
    | { status: 'valid'; engine: CursorEngine }
    | { status: 'invalid' };

// Exact-value gate: only the two literal engine names are accepted. Anything else
// ('1', 'true', 'CURSOR3', '', unknown, whitespace-padded) is not a valid engine.
function parseCursorEngine(value: unknown): CursorEngine | null {
    return value === 'cursor2' || value === 'cursor3' ? value : null;
}

// A param that is present but empty or malformed (?cursorEngine, ?cursorEngine=) is
// 'invalid', not 'absent' — presence alone makes the URL authoritative.
function readQueryCursorEngine(): QueryCursorEngine {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has(CURSOR_ENGINE_QUERY_PARAM)) return { status: 'absent' };
        const engine = parseCursorEngine(params.get(CURSOR_ENGINE_QUERY_PARAM));
        return engine !== null ? { status: 'valid', engine } : { status: 'invalid' };
    } catch {
        // If the URL cannot be read we cannot know whether it carries a query override.
        // Fail safe to the default rather than fall through to stored state.
        return { status: 'invalid' };
    }
}

function readStoredCursorEngine(): CursorEngine | null {
    try {
        return parseCursorEngine(window.localStorage.getItem(CURSOR_ENGINE_STORAGE_KEY));
    } catch {
        return null;
    }
}

export function resolveCursorEngine(
    defaultEngine: CursorEngine,
    overrideEnabled: boolean,
): CursorEngine {
    if (resolvedCursorEngine !== null) return resolvedCursorEngine;

    // No window (SSR/prerender): return the default without caching, so a later
    // client-side call still resolves against the real environment.
    if (typeof window === 'undefined') return defaultEngine;

    let override: CursorEngine | null = null;
    if (overrideEnabled) {
        const query = readQueryCursorEngine();
        if (query.status === 'valid') {
            override = query.engine;
        } else if (query.status === 'absent') {
            override = readStoredCursorEngine();
        }
        // 'invalid': override stays null → default. Never fall through to localStorage.
    }
    const resolved: CursorEngine = override ?? defaultEngine;

    resolvedCursorEngine = resolved;
    try {
        (window as any)[CURSOR_ENGINE_GLOBAL] = resolved;
    } catch {
        // The global is a diagnostic hook only; it must never affect engine selection.
    }
    return resolved;
}

// Test-only: clears the once-per-page-load cache and the diagnostic global.
export function resetCursorEngineResolutionForTests(): void {
    resolvedCursorEngine = null;
    if (typeof window !== 'undefined') {
        try {
            delete (window as any)[CURSOR_ENGINE_GLOBAL];
        } catch {
            // ignore
        }
    }
}
