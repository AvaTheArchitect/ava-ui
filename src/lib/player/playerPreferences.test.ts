/**
 * Maestro.ai — Player Preferences Tests
 * Version: V1.0.0
 * Date: August 13, 2026
 * Ticket: PLAYER-PREF-001
 */

import {
    createEmptyPlayerPrefs,
    loadPlayerPrefs,
    savePlayerPrefs,
    recordRecentSong,
    recordSelectedTrack,
    removeSelectedTrackPref,
    resolveSavedTrack,
    getMostRecentAvailableSongId,
    PLAYER_PREFS_STORAGE_KEY,
    MAX_RECENT_SONG_IDS,
    type TrackPreferenceCandidate,
} from './playerPreferences';

describe('playerPreferences', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('returns empty prefs when nothing is stored', () => {
        expect(loadPlayerPrefs()).toEqual(createEmptyPlayerPrefs());
    });

    it('returns empty prefs on malformed JSON', () => {
        window.localStorage.setItem(PLAYER_PREFS_STORAGE_KEY, '{{{not json');
        expect(loadPlayerPrefs()).toEqual(createEmptyPlayerPrefs());
    });

    it('discards an unrecognized version', () => {
        window.localStorage.setItem(
            PLAYER_PREFS_STORAGE_KEY,
            JSON.stringify({ version: 2, recentSongIds: ['a'], selectedTrackBySongId: {} }),
        );
        expect(loadPlayerPrefs()).toEqual(createEmptyPlayerPrefs());
    });

    it('round-trips a saved selected-track preference', () => {
        savePlayerPrefs(recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 2, 'Guitar'));
        expect(loadPlayerPrefs().selectedTrackBySongId['song-1']).toMatchObject({ trackIndex: 2, trackName: 'Guitar' });
    });

    const candidates: TrackPreferenceCandidate[] = [
        { index: 0, name: 'Drums', selectable: false },
        { index: 1, name: 'Guitar', selectable: true },
    ];

    it('resolves a valid saved track', () => {
        const prefs = recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 1, 'Guitar');
        expect(resolveSavedTrack(prefs, 'song-1', candidates)).toEqual({ status: 'valid', trackIndex: 1 });
    });

    it('reports missing when no entry exists', () => {
        expect(resolveSavedTrack(createEmptyPlayerPrefs(), 'song-1', candidates)).toEqual({ status: 'missing' });
    });

    it('reports invalid on out-of-range index', () => {
        const prefs = recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 9, 'Guitar');
        expect(resolveSavedTrack(prefs, 'song-1', candidates)).toEqual({ status: 'invalid', reason: 'out-of-range' });
    });

    it('reports invalid on track name mismatch', () => {
        const prefs = recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 1, 'Bass');
        expect(resolveSavedTrack(prefs, 'song-1', candidates)).toEqual({ status: 'invalid', reason: 'name-mismatch' });
    });

    it('reports invalid when the saved track is not selectable (drum/percussion)', () => {
        const prefs = recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 0, 'Drums');
        expect(resolveSavedTrack(prefs, 'song-1', candidates)).toEqual({ status: 'invalid', reason: 'not-selectable' });
    });

    it('removeSelectedTrackPref clears only the targeted song', () => {
        let prefs = recordSelectedTrack(createEmptyPlayerPrefs(), 'song-1', 1, 'Guitar');
        prefs = recordSelectedTrack(prefs, 'song-2', 0, 'Guitar');
        const cleaned = removeSelectedTrackPref(prefs, 'song-1');
        expect(cleaned.selectedTrackBySongId['song-1']).toBeUndefined();
        expect(cleaned.selectedTrackBySongId['song-2']).toBeDefined();
    });

    it('recordRecentSong dedupes and keeps most-recent first', () => {
        let prefs = createEmptyPlayerPrefs();
        prefs = recordRecentSong(prefs, 'a');
        prefs = recordRecentSong(prefs, 'b');
        prefs = recordRecentSong(prefs, 'a');
        expect(prefs.recentSongIds).toEqual(['a', 'b']);
    });

    it('recordRecentSong caps recentSongIds at the defined max', () => {
        let prefs = createEmptyPlayerPrefs();
        for (let i = 0; i < MAX_RECENT_SONG_IDS + 3; i++) {
            prefs = recordRecentSong(prefs, `song-${i}`);
        }
        expect(prefs.recentSongIds).toHaveLength(MAX_RECENT_SONG_IDS);
        expect(prefs.recentSongIds[0]).toBe(`song-${MAX_RECENT_SONG_IDS + 2}`);
    });

    it('getMostRecentAvailableSongId skips ids no longer available', () => {
        let prefs = createEmptyPlayerPrefs();
        prefs = recordRecentSong(prefs, 'gone');
        prefs = recordRecentSong(prefs, 'present');
        expect(getMostRecentAvailableSongId(prefs, new Set(['present']))).toBe('present');
    });
});
