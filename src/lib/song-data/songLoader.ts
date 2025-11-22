// src/lib/song-data/songLoader.ts

/**
 * Song Loader - November 21st, 2025
 * 
 * Utility functions for managing song data.
 * Currently uses hardcoded data from songDatabase.ts
 * Future: File system scanning and dynamic metadata extraction
 */

import { SongItem, Playlist, SongState } from './types';
import { SONGS, DEFAULT_PLAYLISTS } from './songDatabase';

/**
 * Load initial song state
 * Uses hardcoded data for Phase 1
 * 
 * @returns Initial song state with all songs and default playlists
 */
export const loadInitialSongData = (): SongState => {
  return {
    songs: [...SONGS], // Clone to prevent mutation
    playlists: [...DEFAULT_PLAYLISTS],
    currentSongId: SONGS[0].id, // Start with first song (Ozzy)
  };
};

/**
 * Get song by ID
 * 
 * @param songs - Array of songs
 * @param id - Song ID to find
 * @returns Song item or undefined
 */
export const getSongById = (songs: SongItem[], id: string): SongItem | undefined => {
  return songs.find(song => song.id === id);
};

/**
 * Get favorite songs
 * 
 * @param songs - Array of songs
 * @returns Array of favorite songs
 */
export const getFavoriteSongs = (songs: SongItem[]): SongItem[] => {
  return songs.filter(song => song.isFavorite);
};

/**
 * Get songs in a playlist
 * 
 * @param songs - Array of all songs
 * @param playlist - Playlist to get songs from
 * @returns Array of songs in playlist
 */
export const getPlaylistSongs = (songs: SongItem[], playlist: Playlist): SongItem[] => {
  return playlist.songIds
    .map(id => getSongById(songs, id))
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
  return songs.filter(song => 
    song.title.toLowerCase().includes(lowerQuery) ||
    song.artist.toLowerCase().includes(lowerQuery) ||
    song.album?.toLowerCase().includes(lowerQuery)
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
  sortBy: 'title' | 'artist' | 'difficulty' = 'artist'
): SongItem[] => {
  return [...songs].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'artist':
        return a.artist.localeCompare(b.artist);
      case 'difficulty':
        return (a.difficulty || 0) - (b.difficulty || 0);
      default:
        return 0;
    }
  });
};

/**
 * Get difficulty label
 * 
 * @param difficulty - Difficulty number (1-5)
 * @returns Human-readable difficulty label
 */
export const getDifficultyLabel = (difficulty?: number): string => {
  if (!difficulty) return 'Unknown';
  
  switch (difficulty) {
    case 1: return 'Beginner';
    case 2: return 'Easy';
    case 3: return 'Intermediate';
    case 4: return 'Advanced';
    case 5: return 'Expert';
    default: return 'Unknown';
  }
};

/**
 * Get difficulty color class (Tailwind)
 * 
 * @param difficulty - Difficulty number (1-5)
 * @returns Tailwind color class
 */
export const getDifficultyColor = (difficulty?: number): string => {
  if (!difficulty) return 'text-gray-400';
  
  switch (difficulty) {
    case 1: return 'text-green-400';
    case 2: return 'text-blue-400';
    case 3: return 'text-yellow-400';
    case 4: return 'text-orange-400';
    case 5: return 'text-red-400';
    default: return 'text-gray-400';
  }
};