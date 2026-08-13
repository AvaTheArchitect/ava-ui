/**
 * Maestro.ai — Player Preferences
 * Version: V1.0.0
 * Date: August 13, 2026
 * Ticket: PLAYER-PREF-001
 *
 * Browser-local player preferences for last-used song and selected track.
 * No Supabase/profile sync, no AlphaTab type dependency — see ticket scope.
 */

export const PLAYER_PREFS_STORAGE_KEY = 'maestro:playerPrefs:v1';
const PLAYER_PREFS_VERSION = 1 as const;

/** Cap on remembered "recently opened" songs. Phase 1 only reads index 0. */
export const MAX_RECENT_SONG_IDS = 5;

export type SelectedTrackPref = {
    trackIndex: number;
    trackName: string;
    updatedAt: string;
};

export type MaestroPlayerPrefsV1 = {
    version: 1;
    recentSongIds: string[];
    selectedTrackBySongId: Record<string, SelectedTrackPref>;
};

/** Caller-supplied track metadata — deliberately not the AlphaTab `Track` type. */
export type TrackPreferenceCandidate = {
    index: number;
    name: string;
    selectable: boolean;
};

export type ResolveSavedTrackResult =
    | { status: 'valid'; trackIndex: number }
    | { status: 'missing' }
    | { status: 'invalid'; reason: 'out-of-range' | 'name-mismatch' | 'not-selectable' };

export function createEmptyPlayerPrefs(): MaestroPlayerPrefsV1 {
    return { version: PLAYER_PREFS_VERSION, recentSongIds: [], selectedTrackBySongId: {} };
}

function isSelectedTrackPref(v: unknown): v is SelectedTrackPref {
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return (
        Number.isInteger(o.trackIndex) &&
        (o.trackIndex as number) >= 0 &&
        typeof o.trackName === 'string' &&
        typeof o.updatedAt === 'string'
    );
}

/** Structural repair only — semantic validity against live tracks is resolveSavedTrack's job. */
function sanitizePlayerPrefs(raw: unknown): MaestroPlayerPrefsV1 {
    if (!raw || typeof raw !== 'object') return createEmptyPlayerPrefs();
    const o = raw as Record<string, unknown>;
    if (o.version !== PLAYER_PREFS_VERSION) return createEmptyPlayerPrefs();

    const recentSongIds = Array.isArray(o.recentSongIds)
        ? o.recentSongIds.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT_SONG_IDS)
        : [];

    const selectedTrackBySongId: Record<string, SelectedTrackPref> = {};
    if (o.selectedTrackBySongId && typeof o.selectedTrackBySongId === 'object') {
        for (const [songId, entry] of Object.entries(o.selectedTrackBySongId as Record<string, unknown>)) {
            if (songId && isSelectedTrackPref(entry)) selectedTrackBySongId[songId] = entry;
        }
    }

    return { version: PLAYER_PREFS_VERSION, recentSongIds, selectedTrackBySongId };
}

export function loadPlayerPrefs(): MaestroPlayerPrefsV1 {
    if (typeof window === 'undefined') return createEmptyPlayerPrefs();
    try {
        const raw = window.localStorage.getItem(PLAYER_PREFS_STORAGE_KEY);
        if (!raw) return createEmptyPlayerPrefs();
        return sanitizePlayerPrefs(JSON.parse(raw));
    } catch {
        return createEmptyPlayerPrefs();
    }
}

export function savePlayerPrefs(prefs: MaestroPlayerPrefsV1): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(PLAYER_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // Storage unavailable/full (private browsing, quota) — best-effort only,
        // must never break playback.
    }
}

export function recordRecentSong(prefs: MaestroPlayerPrefsV1, songId: string): MaestroPlayerPrefsV1 {
    if (!songId) return prefs;
    const recentSongIds = [songId, ...prefs.recentSongIds.filter(id => id !== songId)].slice(0, MAX_RECENT_SONG_IDS);
    return { ...prefs, recentSongIds };
}

export function getMostRecentAvailableSongId(
    prefs: MaestroPlayerPrefsV1,
    availableSongIds: ReadonlySet<string>,
): string | null {
    return prefs.recentSongIds.find(id => availableSongIds.has(id)) ?? null;
}

export function recordSelectedTrack(
    prefs: MaestroPlayerPrefsV1,
    songId: string,
    trackIndex: number,
    trackName: string,
): MaestroPlayerPrefsV1 {
    if (!songId) return prefs;
    return {
        ...prefs,
        selectedTrackBySongId: {
            ...prefs.selectedTrackBySongId,
            [songId]: { trackIndex, trackName, updatedAt: new Date().toISOString() },
        },
    };
}

/** Explicit repair path — drops a song's saved track entry once it's proven invalid. */
export function removeSelectedTrackPref(prefs: MaestroPlayerPrefsV1, songId: string): MaestroPlayerPrefsV1 {
    if (!songId || !(songId in prefs.selectedTrackBySongId)) return prefs;
    const { [songId]: _removed, ...rest } = prefs.selectedTrackBySongId;
    return { ...prefs, selectedTrackBySongId: rest };
}

/**
 * Pure resolution against caller-supplied candidates. Every entry that reaches
 * this function is already structurally well-formed (sanitizePlayerPrefs drops
 * malformed ones at load time) — this only judges semantic validity: range,
 * name match, and selectability (drum/percussion, decided by the caller).
 */
export function resolveSavedTrack(
    prefs: MaestroPlayerPrefsV1,
    songId: string,
    candidates: TrackPreferenceCandidate[],
): ResolveSavedTrackResult {
    const entry = prefs.selectedTrackBySongId[songId];
    if (!entry) return { status: 'missing' };
    if (entry.trackIndex < 0 || entry.trackIndex >= candidates.length) {
        return { status: 'invalid', reason: 'out-of-range' };
    }
    const candidate = candidates[entry.trackIndex];
    if (candidate.name !== entry.trackName) return { status: 'invalid', reason: 'name-mismatch' };
    if (!candidate.selectable) return { status: 'invalid', reason: 'not-selectable' };
    return { status: 'valid', trackIndex: entry.trackIndex };
}
