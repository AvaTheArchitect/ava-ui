// src/lib/song-data/songLoader.ts

/**
 * Song Loader - November 21st, 2025
 *
 * Utility functions for managing song data.
 * Currently uses hardcoded data from songDatabase.ts
 * Future: File system scanning and dynamic metadata extraction
 */

import { SongItem, ClientPlaylist, SongState } from "./types";
import { SONGS, DEFAULT_PLAYLISTS } from "./songDatabase";

/**
 * Load initial song state
 * Uses hardcoded data for Phase 1
 *
 * @returns Initial song state with all songs and default playlists
 */
export const loadInitialSongData = (): SongState => {
  return {
    songs: [...SONGS],
    playlists: [...DEFAULT_PLAYLISTS],
    currentSongId: SONGS[0].id,
  };
};

/**
 * Get song by ID
 *
 * @param songs - Array of songs
 * @param id - Song ID to find
 * @returns Song item or undefined
 */
export const getSongById = (
  songs: SongItem[],
  id: string,
): SongItem | undefined => {
  return songs.find((song) => song.id === id);
};

/**
 * Get favorite songs
 *
 * @param songs - Array of songs
 * @returns Array of favorite songs
 */
export const getFavoriteSongs = (songs: SongItem[]): SongItem[] => {
  return songs.filter((song) => song.isFavorite);
};

/**
 * Get songs in a playlist
 *
 * @param songs - Array of all songs
 * @param playlist - ClientPlaylist to get songs from
 * @returns Array of songs in playlist
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
 * Search songs by title or artist
 *
 * @param songs - Array of songs
 * @param query - Search query
 * @returns Filtered songs
 */
export const searchSongs = (songs: SongItem[], query: string): SongItem[] => {
  if (!query.trim()) return songs;

  const lowerQuery = query.toLowerCase();
  return songs.filter(
    (song) =>
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery) ||
      song.album?.toLowerCase().includes(lowerQuery),
  );
};

/**
 * Sort songs by various criteria
 *
 * @param songs - Array of songs
 * @param sortBy - Sort criteria
 * @returns Sorted songs
 */
export const sortSongs = (
  songs: SongItem[],
  sortBy: "title" | "artist" | "difficulty" = "artist",
): SongItem[] => {
  return [...songs].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "artist":
        return a.artist.localeCompare(b.artist);
      case "difficulty":
        return (a.difficulty || 0) - (b.difficulty || 0);
      default:
        return 0;
    }
  });
};

/**
 * Get difficulty label
 *
 * 1 = Beginner, 2 = Intermediate, 3 = Advanced
 * Aligned with DB Difficulty type in types.ts
 *
 * @param difficulty - Difficulty number (1–3)
 * @returns Human-readable difficulty label
 */
export const getDifficultyLabel = (difficulty?: number): string => {
  switch (difficulty) {
    case 1:
      return "Beginner";
    case 2:
      return "Intermediate";
    case 3:
      return "Advanced";
    default:
      return "";
  }
};

/**
 * Get difficulty color class (Tailwind)
 *
 * @param difficulty - Difficulty number (1–3)
 * @returns Tailwind color class
 */
export const getDifficultyColor = (difficulty?: number): string => {
  switch (difficulty) {
    case 1:
      return "text-green-400";
    case 2:
      return "text-yellow-400";
    case 3:
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

/**
 * Filter songs by instrument, tuning, difficulty, and genre.
 * All filters are additive (AND logic) — unset filters are skipped.
 *
 * @param songs   - Array of SongItem to filter
 * @param filters - SongFilters object from MyTabsPanel state
 * @returns Filtered array
 */
export const filterSongs = (
  songs: SongItem[],
  filters: {
    instrument?: string;
    tuning?: string;
    difficulty?: number | "any";
    genre?: string;
  },
): SongItem[] => {
  return songs.filter((song) => {
    if (filters.instrument && filters.instrument !== "any") {
      if (song.instrument !== filters.instrument) return false;
    }
    if (filters.tuning && filters.tuning !== "any") {
      if (song.tuning !== filters.tuning) return false;
    }
    if (filters.difficulty && filters.difficulty !== "any") {
      if (song.difficulty !== filters.difficulty) return false;
    }
    if (filters.genre && filters.genre !== "any") {
      if (song.genre !== filters.genre) return false;
    }
    return true;
  });
};
