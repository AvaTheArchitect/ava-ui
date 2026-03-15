// src/components/audio/maestro/songs/index.ts

/**
 * Song Selection Components - Export Barrel
 * March 15th, 2026
 *
 * Song library and playlist management UI.
 * Note: SongSelector/SongList/SongItem are legacy components, superseded by
 * MyTabsPanel. Retained for compilation compatibility — retire when ready.
 */

export { SongSelector } from "./SongSelector";
export { SongList } from "./SongList";
export { SongItemComponent } from "./SongItem";

export type { SongItemProps } from "./SongItem";
export type { SongListProps } from "./SongList";
