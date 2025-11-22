// src/lib/song-data/types.ts

/**
 * Song Data Types - November 21st, 2025
 *
 * Core type definitions for song selection system.
 * AlphaTab automatically extracts metadata from Guitar Pro files,
 * so we only store essential loading information.
 */

export interface SongItem {
  /** Unique ID (derived from folder name) */
  id: string;

  /** Display title */
  title: string;

  /** Artist name */
  artist: string;

  /** Album name (optional) */
  album?: string;

  /** Full path to Guitar Pro file (relative to /public) */
  fileUrl: string;

  /** Difficulty rating (1-5 scale) */
  difficulty?: number;

  /** Path to album art/cover image (optional) */
  coverUrl?: string;

  /** User favorite status */
  isFavorite: boolean;
}

export interface Playlist {
  /** Unique playlist ID */
  id: string;

  /** Playlist name */
  name: string;

  /** Array of song IDs in this playlist */
  songIds: string[];

  /** Creation timestamp */
  createdAt?: number;
}

export interface SongState {
  /** All available songs */
  songs: SongItem[];

  /** User's playlists */
  playlists: Playlist[];

  /** Currently selected song ID */
  currentSongId: string | null;
}

export interface SongSelectorProps {
  /** Modal open state */
  isOpen: boolean;

  /** Close handler */
  onClose: () => void;

  /** All songs */
  songs: SongItem[];

  /** User playlists */
  playlists: Playlist[];

  /** Current song ID */
  currentSongId: string | null;

  /** Song selection handler */
  onSongSelect: (songId: string) => void;

  /** Toggle favorite handler */
  onToggleFavorite: (songId: string) => void;

  /** Playlist action handler */
  onPlaylistAction: (
    type: "add" | "remove",
    songId: string,
    playlistId: string
  ) => void;

  /** Create playlist handler */
  onCreatePlaylist: (name: string) => void;
}
