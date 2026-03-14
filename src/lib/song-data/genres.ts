// src/lib/song-data/genres.ts

/**
 * Genre Data — Canonical Source
 * March 14th, 2026
 *
 * Single source of truth for all genre types, labels, and UI option arrays.
 * Import from '@/lib/song-data' — do not define genres inline elsewhere.
 *
 * Note: 'Any genre' filter option is intentionally excluded here.
 * Build it locally in filter UIs:
 *   const filterOptions = [{ label: 'Any genre', value: 'any' }, ...GENRE_OPTIONS];
 */

export type Genre = "rock" | "metal" | "blues" | "country" | "worship";

export const GenreLabels: Record<Genre, string> = {
  rock: "Rock",
  metal: "Metal",
  blues: "Blues",
  country: "Country",
  worship: "Worship",
};

/** UI-ready options array — used by SelectInput in MetadataEditorPanel and MyTabsPanel */
export const GENRE_OPTIONS: { label: string; value: Genre }[] = [
  { label: "Rock", value: "rock" },
  { label: "Metal", value: "metal" },
  { label: "Blues", value: "blues" },
  { label: "Country", value: "country" },
  { label: "Worship", value: "worship" },
];
