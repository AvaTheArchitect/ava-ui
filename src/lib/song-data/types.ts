/**
 * src/lib/song-data/types.ts
 *
 * Maestro Tabs Platform — Core Data Models
 * V2.4 — March 24th, 2026
 *
 * 🔥 V2.4 CHANGES:
 * ✅ SongItem.file_path added — nested storage path for replaced GP files
 *    (user_id/tab_id/filename). page.tsx uses file_path first, falling back
 *    to file_name.file_extension for legacy root-level files.
 * ✅ Tab.file_path added — mirrors tabs.file_path DB column (text, nullable)
 *
 * 🔒 V2.3 PRESERVED:
 * ✅ Genre + GenreLabels removed — now canonical in src/lib/song-data/genres.ts
 *    Re-exported here via './genres' so all existing imports remain unbroken.
 *
 * 🔒 V2.2 PRESERVED:
 * ✅ SongItem.youtubeVideoId + videoStartOffset marked as legacy bridge fields
 * ✅ SongItem.genre tightened to Genre (DB is now controlled, only valid values)
 * ✅ TabYoutubeRow fields updated to match actual tab_youtube schema
 *    (youtube_id, start_offset, sync_points — replaces old video_id/simple_sync/advanced_sync)
 * ✅ TabAudioRow fields updated to match actual tab_audio schema
 *    (file_path added, advanced_sync → unknown jsonb)
 *
 * 🔒 V2.1 CORRECTIONS (PRESERVED):
 * ✅ SongItem.difficulty tightened to Difficulty (1|2|3)
 * ✅ Tab.difficulty tightened to Difficulty (1|2|3)
 * ✅ Tab.search_vector changed from string → unknown (tsvector, client never reads it)
 * ✅ TabVersion noted as client/internal type (camelCase intentional, not a DB row)
 *
 * 🔒 V2 PRESERVED:
 * ✅ SongItem extended with thumbnailUrl, thumbnailPath, status, updatedAt (camelCase)
 * ✅ Tab redefined to match actual Supabase tabs table (snake_case DB row)
 * ✅ TabYoutubeRow added (tab_youtube relational table)
 * ✅ TabAudioRow added (tab_audio relational table)
 *
 * 🔒 V1 PRESERVED:
 * ✅ Instrument, Difficulty, SongItem, SongState
 * ✅ Playlist, ClientPlaylist, PlaylistSong, Favorite
 * ✅ SongSortOption, SongFilters, SongSelectorProps
 * ✅ file_name + file_extension on SongItem
 * ✅ youtubeVideoId / videoStartOffset stay camelCase on SongItem
 *
 * CONVENTION:
 *   DB row types  → snake_case  (Tab, TabYoutubeRow, TabAudioRow)
 *   UI/client types → camelCase  (SongItem, ClientPlaylist, SongState)
 *   page.tsx maps snake_case → camelCase on fetch
 *
 * NOTE: AlphaTab integration types (Beat, BeatBounds, CursorPosition, etc.)
 * live separately in src/types/alphatab.ts — do not merge here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// GENRE  (canonical source: ./genres — re-exported for backwards compatibility)
// ─────────────────────────────────────────────────────────────────────────────

import type { Genre } from "./genres";
export type { Genre } from "./genres";
export { GenreLabels } from "./genres";

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUMENT
// ─────────────────────────────────────────────────────────────────────────────

export type Instrument =
  | "guitar6"
  | "guitar7"
  | "guitar12"
  | "bass4"
  | "bass5"
  | "drums";

export const InstrumentLabels: Record<Instrument, string> = {
  guitar6: "Guitar (6-string)",
  guitar7: "Guitar (7-string)",
  guitar12: "Guitar (12-string)",
  bass4: "Bass (4-string)",
  bass5: "Bass (5-string)",
  drums: "Drums",
};

// ─────────────────────────────────────────────────────────────────────────────
// DIFFICULTY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1 = Beginner
 * 2 = Intermediate
 * 3 = Advanced
 */
export type Difficulty = 1 | 2 | 3;

export const DifficultyLabels: Record<Difficulty, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

// ─────────────────────────────────────────────────────────────────────────────
// TUNING  (plain string slug — stored directly on tabs row, no join table)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tuning is stored as a plain string slug on the tabs table (e.g. 'std6', 'dropD', '12dadgad').
 * Filtering requires matching BOTH instrument AND tuning to prevent cross-instrument results
 * (e.g. a 12-string tab must not appear when filtering 6-string tunings).
 *
 * Previous tuningId / foreign-key approach is no longer used.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SONG  (Supabase DB row — legacy shape, kept for reference)
// ─────────────────────────────────────────────────────────────────────────────

export type Song = {
  id: string;

  title: string;
  artist: string;
  album?: string;

  /**
   * Normalized fields for fast, punctuation/case-insensitive search
   */
  normalizedTitle: string;
  normalizedArtist: string;

  instrument: Instrument;
  difficulty: Difficulty;
  genre?: Genre; // tightened — DB only stores valid Genre values

  /** Reference to the tunings table */
  tuningId: string;

  /** Release year — used for future Year filter */
  year?: number;

  createdAt: string;
  createdBy?: string;

  playCount?: number;
  lastPlayed?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// SONG ITEM  (client-side model — used by MyTabsPanel, page.tsx, songState)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SongItem is the hydrated, client-facing representation of a song.
 * All fields are camelCase — page.tsx maps snake_case Supabase columns here.
 *
 * isFavorite MUST remain a derived/client-side field — never stored on the
 * song row itself, as it is per-user state from the favorites table.
 */
export interface SongItem {
  /** Unique ID (Supabase UUID) */
  id: string;

  title: string;
  artist: string;
  album?: string;

  /**
   * Full path to Guitar Pro file (relative to /public)
   * @deprecated Hardcoded songs only — being replaced by file_name + Supabase signed URLs
   */
  fileUrl?: string;

  /**
   * Supabase Storage filename slug (e.g. "extreme-rise")
   * Used to generate signed URLs via supabase.storage.from('tabs').createSignedUrl()
   */
  file_name?: string;

  /**
   * Supabase Storage file extension without dot (e.g. "gp5", "gp4", "gpx", "gp3")
   * Full Storage path = `${file_name}.${file_extension}`
   */
  file_extension?: string;

  /**
   * Full nested Storage path for replaced files (e.g. "user_id/tab_id/filename.gp5").
   * Takes priority over file_name + file_extension in signed URL resolution.
   * Legacy root-level files will have this as undefined — fallback applies.
   */
  file_path?: string; // ← ADD V2.4

  difficulty?: Difficulty;
  coverUrl?: string;

  /**
   * Derived from the Favorites join table per authenticated user.
   * Never stored on the song row itself.
   */
  isFavorite: boolean;

  instrument?: Instrument;
  genre?: Genre;
  tuning?: string;
  year?: number;
  tempo?: number;

  // ── YouTube Integration ──

  /**
   * @legacy Bridge field — maps from tabs.youtube_video_id.
   * Will eventually derive from tab_youtube main row once player is refactored.
   * Do not use as the primary source for new media features.
   */
  youtubeVideoId?: string;

  youtubeVariants?: {
    main?: string;
    backing?: string;
    solo?: string;
    playthrough?: string;
    live?: string;
    lesson?: string;
  };

  /**
   * @legacy Bridge field — maps from tabs.video_start_offset.
   * Will eventually derive from tab_youtube main row start_offset.
   */
  videoStartOffset?: number;

  // ── V2: Thumbnail + Editor Status ──

  /** maps from tabs.thumbnail_url */
  thumbnailUrl?: string;

  /** maps from tabs.thumbnail_path */
  thumbnailPath?: string;

  /**
   * Publishing status — e.g. 'draft', 'published', 'archived'
   * maps from tabs.status
   */
  status?: string;

  /** maps from tabs.updated_at */
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB  (Supabase tabs table — DB row, snake_case)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the actual Supabase tabs table columns exactly.
 * Use this for raw Supabase query results before mapping to SongItem.
 *
 * Mapping pattern:
 *   tabs.youtube_video_id  → SongItem.youtubeVideoId
 *   tabs.video_start_offset → SongItem.videoStartOffset
 *   tabs.thumbnail_url     → SongItem.thumbnailUrl
 *   tabs.thumbnail_path    → SongItem.thumbnailPath
 *   tabs.updated_at        → SongItem.updatedAt
 *   tabs.file_path         → SongItem.file_path
 */
export type Tab = {
  id: string;
  user_id?: string;

  title: string;
  artist: string;
  album?: string;

  difficulty?: Difficulty;
  genre?: string;
  tuning?: string;
  year?: number;
  tempo?: number;
  instrument?: string;
  time_signature?: string;

  file_name?: string;
  file_extension?: string;
  file_path?: string; // ← ADD V2.4
  slug?: string;
  version?: string;
  source?: string;

  is_public?: boolean;
  is_official?: boolean;

  youtube_video_id?: string;
  video_start_offset?: number;
  thumbnail_url?: string;
  thumbnail_path?: string;
  status?: string;

  search_vector?: unknown; // tsvector — DB-generated, client never reads directly

  created_at?: string;
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB YOUTUBE ROW  (tab_youtube relational table — DB row, snake_case)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the actual tab_youtube table columns exactly (snake_case DB row).
 * One row per video slot per tab (video_type distinguishes slots).
 *
 * Normalized design — videos no longer live on the tabs row.
 */
export type TabYoutubeRow = {
  id: string;
  tab_id: string;
  video_type?: string; // 'main' | 'backing' | 'solo' | 'playthrough' | 'live' | 'lesson'
  youtube_id?: string; // YouTube video ID (11-char)
  sync_mode?: string; // 'simple' | 'advanced'
  start_offset?: number; // seconds, default 0 (simple sync)
  sync_points?: unknown; // jsonb — SyncPoint[] for advanced mode
  thumbnail_url?: string;
  thumbnail_path?: string;
  created_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB AUDIO ROW  (tab_audio relational table — DB row, snake_case)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the actual tab_audio table columns exactly (snake_case DB row).
 * One row per audio reference file per tab.
 */
export type TabAudioRow = {
  id: string;
  tab_id: string;
  audio_type?: string; // e.g. 'reference', 'full_mix', 'backing', 'stem_source'
  filename?: string;
  file_path?: string; // Supabase Storage path
  sync_mode?: string; // 'simple' | 'advanced'
  simple_sync?: number; // offset in seconds (simple mode)
  advanced_sync?: unknown; // jsonb — SyncPoint[] for advanced mode
  created_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// TAB VERSION  (client/internal type — camelCase intentional, not a DB row type)
// ─────────────────────────────────────────────────────────────────────────────

export type TabVersion = {
  id: string;
  tabId: string;
  versionNumber: number;
  storagePath: string;
  createdAt: string;
  createdBy?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYLIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DB-layer Playlist — userId is required (server/Supabase use)
 */
export type Playlist = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
};

/**
 * Client-side Playlist — used by MyTabsPanel and songState.
 * songIds is a denormalized array for UI convenience; authoritative
 * order lives in PlaylistSong.orderIndex in the DB.
 */
export interface ClientPlaylist {
  id: string;
  name: string;
  songIds: string[];
  createdAt?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYLIST SONG  (join table)
// ─────────────────────────────────────────────────────────────────────────────

export type PlaylistSong = {
  id: string;
  playlistId: string;
  songId: string;
  /** Authoritative display order within the playlist */
  orderIndex: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// FAVORITE  (join table)
// ─────────────────────────────────────────────────────────────────────────────

export type Favorite = {
  id: string;
  userId: string;
  songId: string;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// USER SONG ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

export type UserSongActivity = {
  id: string;
  userId: string;
  songId: string;
  lastPlayed: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// SONG STATE  (client-side page.tsx state shape)
// ─────────────────────────────────────────────────────────────────────────────

export interface SongState {
  songs: SongItem[];
  playlists: ClientPlaylist[];
  currentSongId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SORT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type SongSortOption =
  | "artist_asc"
  | "artist_desc"
  | "title_asc"
  | "title_desc"
  | "date_added"
  | "last_played";
// genre sort intentionally omitted — Genre is a filter, not a sort axis

// ─────────────────────────────────────────────────────────────────────────────
// FILTER STATE
// ─────────────────────────────────────────────────────────────────────────────

export type SongFilters = {
  instrument?: Instrument;
  tuning?: string; // plain slug — match against tabs.tuning column
  difficulty?: Difficulty;
  genre?: Genre;
  year?: number; // reserved for future Year filter UI
};

// ─────────────────────────────────────────────────────────────────────────────
// SONG SELECTOR PROPS  (MyTabsPanel / legacy SongSelector)
// ─────────────────────────────────────────────────────────────────────────────

export interface SongSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  songs: SongItem[];
  playlists: ClientPlaylist[];
  currentSongId: string | null;
  onSongSelect: (songId: string) => void;
  onToggleFavorite: (songId: string) => void;
  onPlaylistAction: (
    type: "add" | "remove",
    songId: string,
    playlistId: string,
  ) => void;
  onCreatePlaylist: (name: string) => void;
}
