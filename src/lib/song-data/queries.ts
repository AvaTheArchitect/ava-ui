// src/lib/song-data/queries.ts

/**
 * Song Data — Official Query Layer
 * Phase 3A — March 14th, 2026
 *
 * Single source of truth for all Supabase → SongItem hydration.
 * Replaces the inline mapper in synth-player/page.tsx.
 *
 * Bridge note:
 *   `youtubeVideoId` and `videoStartOffset` on SongItem are bridge outputs
 *   for the player only. They are now derived from `tab_youtube` (main row),
 *   with fallback to `tabs` legacy columns during the transition.
 *   Do NOT read these from `tabs` after Phase 3D is confirmed stable.
 *
 * Execution order:
 *   Phase 3A  ← you are here: queries.ts created, mapper moved here
 *   Phase 3B  → page.tsx wired to fetchSongs()
 *   Phase 3C  → songDatabase.ts SONGS array retired
 *   Phase 3D  → bridge fallbacks removed (after all tabs have tab_youtube main rows)
 *   Phase 3E  → DB bridge columns dropped
 */

import { supabase } from '@/lib/alphaTab/supabase';
import type { SongItem } from './types';

// ─── fetchSongs ───────────────────────────────────────────────────────────────

/**
 * Fetch all published tabs and hydrate each with its main video from tab_youtube.
 *
 * Performs two parallel queries:
 *   1. tabs          — all columns
 *   2. tab_youtube   — main rows only (video_type = 'main')
 *
 * The main video row is the source of truth for:
 *   - youtubeVideoId  (youtube_id)
 *   - videoStartOffset (start_offset)
 *
 * Falls back to legacy tabs columns during Phase 3 transition.
 */
export async function fetchSongs(): Promise<SongItem[]> {
    const [tabsResult, ytResult] = await Promise.all([
        supabase.from('tabs').select('*'),
        supabase
            .from('tab_youtube')
            .select('tab_id, youtube_id, start_offset, sync_mode, sync_points')
            .eq('video_type', 'main'),
    ]);

    if (tabsResult.error) {
        console.error('❌ fetchSongs: tabs query failed', tabsResult.error);
        return [];
    }

    const tabs = tabsResult.data ?? [];
    const ytRows = ytResult.data ?? [];

    if (tabs.length === 0) {
        console.warn('fetchSongs: no tabs returned from Supabase');
        return [];
    }

    // Index main video rows by tab_id for O(1) lookup
    const mainVideoByTabId = new Map(ytRows.map(row => [row.tab_id, row]));

    return tabs.map(tab => {
        const mainVideo = mainVideoByTabId.get(tab.id);

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
            thumbnailUrl: tab.thumbnail_url ?? undefined,
            thumbnailPath: tab.thumbnail_path ?? undefined,
            status: tab.status ?? 'draft',
            updatedAt: tab.updated_at ?? undefined,
            isFavorite: false,

            // ── Bridge outputs for player — Phase 3D removes fallbacks ────────
            // Source of truth: tab_youtube main row (youtube_id, start_offset).
            // Fallback: tabs legacy columns (youtube_video_id, video_start_offset).
            // ─────────────────────────────────────────────────────────────────
            youtubeVideoId: mainVideo?.youtube_id
                ?? tab.youtube_video_id
                ?? undefined,

            videoStartOffset: mainVideo?.start_offset
                ?? tab.video_start_offset
                ?? 0,
        };
    });
}