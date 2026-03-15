// src/lib/song-data/songLoader.ts

/**
 * Song Loader
 * Phase 3C — March 14th, 2026
 *
 * 🔥 Phase 3C CHANGES:
 * ✅ SONGS import removed — songs are now fetched via fetchSongs() in queries.ts
 * ✅ loadInitialSongData() removed — page.tsx boots with empty shell state
 *
 * 🔒 PRESERVED:
 * ✅ All utility functions — getSongById, getFavoriteSongs, getPlaylistSongs,
 *    searchSongs, sortSongs, filterSongs, getDifficultyLabel, getDifficultyColor
 */

import { SongItem, ClientPlaylist } from './types';

/**
 * Get song by ID
 */
export const getSongById = (
    songs: SongItem[],
    id: string,
): SongItem | undefined => {
    return songs.find(song => song.id === id);
};

/**
 * Get favorite songs
 */
export const getFavoriteSongs = (songs: SongItem[]): SongItem[] => {
    return songs.filter(song => song.isFavorite);
};

/**
 * Get songs in a playlist
 */
export const getPlaylistSongs = (
    songs: SongItem[],
    playlist: ClientPlaylist,
): SongItem[] => {
    return playlist.songIds
        .map((id: string) => getSongById(songs, id))
        .filter((song): song is SongItem => song !== undefined);
};

/**
 * Search songs by title, artist, or album
 */
export const searchSongs = (songs: SongItem[], query: string): SongItem[] => {
    if (!query.trim()) return songs;
    const lowerQuery = query.toLowerCase();
    return songs.filter(song =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery) ||
        song.album?.toLowerCase().includes(lowerQuery),
    );
};

/**
 * Sort songs by title, artist, or difficulty
 */
export const sortSongs = (
    songs: SongItem[],
    sortBy: 'title' | 'artist' | 'difficulty' = 'artist',
): SongItem[] => {
    return [...songs].sort((a, b) => {
        switch (sortBy) {
            case 'title':    return a.title.localeCompare(b.title);
            case 'artist':   return a.artist.localeCompare(b.artist);
            case 'difficulty': return (a.difficulty || 0) - (b.difficulty || 0);
            default:         return 0;
        }
    });
};

/**
 * Get difficulty label
 * 1 = Beginner, 2 = Intermediate, 3 = Advanced
 */
export const getDifficultyLabel = (difficulty?: number): string => {
    switch (difficulty) {
        case 1:  return 'Beginner';
        case 2:  return 'Intermediate';
        case 3:  return 'Advanced';
        default: return '';
    }
};

/**
 * Get difficulty color class (Tailwind)
 */
export const getDifficultyColor = (difficulty?: number): string => {
    switch (difficulty) {
        case 1:  return 'text-green-400';
        case 2:  return 'text-yellow-400';
        case 3:  return 'text-red-400';
        default: return 'text-gray-400';
    }
};

/**
 * Filter songs by instrument, tuning, difficulty, and genre.
 * All filters are additive (AND logic) — unset filters are skipped.
 */
export const filterSongs = (
    songs: SongItem[],
    filters: {
        instrument?: string;
        tuning?: string;
        difficulty?: number | 'any';
        genre?: string;
    },
): SongItem[] => {
    return songs.filter(song => {
        if (filters.instrument && filters.instrument !== 'any') {
            if (song.instrument !== filters.instrument) return false;
        }
        if (filters.tuning && filters.tuning !== 'any') {
            if (song.tuning !== filters.tuning) return false;
        }
        if (filters.difficulty && filters.difficulty !== 'any') {
            if (song.difficulty !== filters.difficulty) return false;
        }
        if (filters.genre && filters.genre !== 'any') {
            if (song.genre !== filters.genre) return false;
        }
        return true;
    });
};