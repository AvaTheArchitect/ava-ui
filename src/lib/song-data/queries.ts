// src/lib/song-data/queries.ts

/**
 * Song Data — Official Query Layer
 * Phase 3D — March 14th, 2026
 *
 * V+1: file_path mapped into SongItem — required for replaced-file signed URL resolution.
 *      Replaced files live at nested paths (user_id/tab_id/filename), not bucket root.
 *      page.tsx uses file_path first, falling back to file_name.file_extension for legacy files.
 *
 * Single source of truth for all Supabase → SongItem hydration.
 * Replaces the inline mapper in synth-player/page.tsx.
 *
 * Bridge note:
 *   `youtubeVideoId` and `videoStartOffset` on SongItem are bridge outputs
 *   for the player only. They are now derived from `tab_youtube` (main row),
 *   with fallback to `tabs` legacy columns during the transition.
 *   Do NOT read these from `tabs` after Phase 3E is confirmed stable.
 *
 * Execution order:
 *   Phase 3A  — queries.ts created, mapper moved here
 *   Phase 3B  — page.tsx wired to fetchSongs()
 *   Phase 3C  — songDatabase.ts SONGS array retired
 *   Phase 3D  ← you are here: all 6 tab_youtube slots hydrated into youtubeVariants
 *   Phase 3E  — bridge fallbacks removed (after all tabs have tab_youtube main rows)
 */

import { supabase } from "@/lib/alphaTab/supabase";
import type { SongItem } from "./types";

// ─── fetchSongs ───────────────────────────────────────────────────────────────

/**
 * Fetch all tabs and hydrate each with all video slots from tab_youtube.
 *
 * Performs two parallel queries:
 *   1. tabs        — all columns
 *   2. tab_youtube — ALL rows per tab (all 6 video slots, no video_type filter)
 *
 * youtubeVideoId + videoStartOffset: derived from main row, bridge fallback to tabs columns.
 * youtubeVariants: all 6 slots — drives YouTubePlayer dropdown visibility.
 *   Only slots with a real youtube_id are included, so the dropdown only shows
 *   what actually exists in tab_youtube.
 */
export async function fetchSongs(): Promise<SongItem[]> {
  const [tabsResult, ytResult] = await Promise.all([
    supabase.from("tabs").select("*"),
    supabase
      .from("tab_youtube")
      .select(
        "tab_id, video_type, youtube_id, start_offset, sync_mode, sync_points",
      ),
  ]);

  if (tabsResult.error) {
    console.error("❌ fetchSongs: tabs query failed", tabsResult.error);
    return [];
  }

  const tabs = tabsResult.data ?? [];
  const ytRows = ytResult.data ?? [];

  if (tabs.length === 0) {
    console.warn("fetchSongs: no tabs returned from Supabase");
    return [];
  }

  // Group ALL tab_youtube rows by tab_id for O(1) lookup
  const ytRowsByTabId = new Map<string, typeof ytRows>();
  for (const row of ytRows) {
    if (!ytRowsByTabId.has(row.tab_id)) ytRowsByTabId.set(row.tab_id, []);
    ytRowsByTabId.get(row.tab_id)!.push(row);
  }

  const VALID_TYPES = new Set([
    "main",
    "backing",
    "solo",
    "playthrough",
    "live",
    "lesson",
  ]);

  return tabs.map((tab) => {
    const tabYtRows = ytRowsByTabId.get(tab.id) ?? [];
    const mainVideo = tabYtRows.find((r) => r.video_type === "main");

    // Build youtubeVariants — only include slots that have a real youtube_id
    const variants: SongItem["youtubeVariants"] = {};
    for (const row of tabYtRows) {
      if (row.youtube_id && row.video_type && VALID_TYPES.has(row.video_type)) {
        (variants as Record<string, string>)[row.video_type] = row.youtube_id;
      }
    }
    const hasVariants = Object.keys(variants).length > 0;

    return {
      id: tab.id,
      title: tab.title,
      artist: tab.artist,
      album: tab.album ?? undefined,
      difficulty: tab.difficulty ?? undefined,
      instrument: tab.instrument ?? undefined,
      tuning: tab.tuning ?? undefined,
      genre: tab.genre ?? undefined,
      tempo: tab.tempo ?? undefined,
      file_name: tab.file_name,
      file_extension: tab.file_extension,
      file_path: tab.file_path ?? undefined, // ← ADD: nested path for replaced files
      thumbnailUrl: tab.thumbnail_url ?? undefined,
      thumbnailPath: tab.thumbnail_path ?? undefined,
      status: tab.status ?? "draft",
      updatedAt: tab.updated_at ?? undefined,
      isFavorite: false,

      // ── Hydrated from tab_youtube ─────────────────────────────────────
      // youtubeVideoId + videoStartOffset: main row, bridge fallback for Phase 3E
      // youtubeVariants: all 6 slots — drives YouTubePlayer dropdown visibility
      // ─────────────────────────────────────────────────────────────────
      youtubeVideoId:
        mainVideo?.youtube_id ?? tab.youtube_video_id ?? undefined,

      videoStartOffset: mainVideo?.start_offset ?? tab.video_start_offset ?? 0,

      youtubeVariants: hasVariants ? variants : undefined,
    };
  });
}
