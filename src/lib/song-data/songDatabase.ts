// src/lib/song-data/songDatabase.ts

/**
 * Song Database
 * Phase 3C — March 14th, 2026
 *
 * 🔥 Phase 3C CHANGES:
 * ✅ SONGS array removed — songs now fetched via fetchSongs() in queries.ts
 * ✅ loadInitialSongData() seed removed — page.tsx boots with empty shell state
 *
 * 🔒 PRESERVED:
 * ✅ DEFAULT_PLAYLISTS — retained until playlist persistence is Supabase-backed
 *    Once a user_playlists table exists and page.tsx loads playlists from Supabase,
 *    this can be removed and this file retired entirely.
 */

import { ClientPlaylist } from "./types";

export const DEFAULT_PLAYLISTS: ClientPlaylist[] = [
  {
    id: "playlist-1",
    name: "My Shred List",
    songIds: [],
    createdAt: Date.now(),
  },
  {
    id: "playlist-2",
    name: "80s Hair Metal",
    songIds: [],
    createdAt: Date.now(),
  },
];
