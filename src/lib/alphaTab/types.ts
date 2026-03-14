/**
 * src/lib/alphaTab/type.ts
 *
 * Core type definitions for AlphaTab integration.
 * Based on @coderline/alphatab internal API surface used by Maestro.ai.
 *
 * NOTE: These are hand-maintained shims. AlphaTab does not ship full TypeScript
 * declarations for its internal model. AlphaTabApi is typed as `any` until the
 * official @coderline/alphatab package typings stabilize.
 *
 * Domains covered:
 *   - Playback (AlphaTabApi, PlayerState, events)
 *   - Score model (Beat, Bar, Track, MasterBar)
 *   - Cursor & bounds (CursorPosition, BeatBounds)
 *   - Tick cache (TickCache — wraps AlphaTab's internal lookup system)
 *   - Loop (LoopBoundary)
 */

// ─────────────────────────────────────────────────────────────────────────────
// API ROOT
// ─────────────────────────────────────────────────────────────────────────────

/** Full AlphaTab API surface. Typed as any until official declarations ship. */
export type AlphaTabApi = any;

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK
// ─────────────────────────────────────────────────────────────────────────────

export enum PlayerState {
  Stopped = 0,
  Playing = 1,
  Paused = 2,
}

export interface PlaybackInfo {
  volume: number;
  isMuted?: boolean;
  isSoloed?: boolean;
}

/** Payload from AlphaTab's playerPositionChanged event */
export interface PlayerPositionChangedArgs {
  /** Current playback tick (expanded — repeat-aware) */
  currentTick: number;
  /** Total duration in ticks */
  endTick: number;
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  endTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE MODEL
// ─────────────────────────────────────────────────────────────────────────────

export interface Beat {
  /** Structural tick position — NOT repeat-aware. Use tickCache for playback. */
  absolutePlaybackStart: number;
  playbackDuration: number;
  nextBeat: Beat | null;
  /** Parent voice → staff → bar chain (used for bar/repeat resolution) */
  voice?: Voice;
}

export interface Voice {
  bar?: Bar;
}

export interface Bar {
  index: number;
  masterBar?: MasterBar;
}

export interface MasterBar {
  index: number;
  /** True if this bar opens a repeat section */
  isRepeatStart: boolean;
  /** > 0 if this bar closes a repeat; value = repeat count */
  repeatCount: number;
  /** Structural start tick of this master bar */
  start: number;
}

export interface Track {
  index: number;
  name: string;
  color: any;
  playbackInfo: PlaybackInfo;
  staves?: Staff[];
}

export interface Staff {
  bars: Bar[];
}

export interface SongInfo {
  title: string;
  artist: string;
  album: string;
  tempo: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CURSOR & BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

export interface CursorPosition {
  x: number;
  y: number;
  height: number;
}

export interface VisualBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BeatBounds {
  visualBounds: VisualBounds;
  barBounds: {
    masterBarBounds: {
      visualBounds: VisualBounds;
    };
  };
}

export interface BeatLookupResult {
  beat: Beat | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TICK CACHE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TickCache wraps AlphaTab's internal tick-lookup system.
 *
 * CRITICAL RULE (per Daniel Kuschny / AlphaTab dev):
 *   Always use tickCache.getBeatStart(beat) for playback tick resolution —
 *   never beat.absolutePlaybackStart directly. The structural tick value
 *   diverges from expanded playback ticks inside repeat sections.
 *
 * Used by: MaestroCursor, BeatCustomLoopOverlay, page.tsx loop enforcer.
 */
export interface TickCache {
  /**
   * Returns the expanded (repeat-aware) playback start tick for a given beat.
   * This is the authoritative tick value for all cursor and loop logic.
   */
  getBeatStart(beat: Beat): number;

  /**
   * Returns the beat at a given expanded playback tick.
   * Used for reverse-lookup (tick → beat) in loop boundary snapping.
   */
  findBeat(tracks: Track[], tick: number): BeatLookupResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loop boundary expressed in expanded playback ticks.
 * All values must be sourced from tickCache, never from structural beat ticks.
 */
export interface LoopBoundary {
  /** Expanded tick where loop begins (inclusive) */
  startTick: number;
  /** Expanded tick where loop ends (exclusive — AlphaTab convention) */
  endTick: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER EVENTS  (AlphaTab lifecycle hooks used in page.tsx)
// ─────────────────────────────────────────────────────────────────────────────

/** Fired by AlphaTab when score render is complete and bounds are available */
export interface RenderFinishedArgs {
  totalWidth: number;
  totalHeight: number;
}

/** Fired when AlphaTab finishes loading a score file */
export interface ScoreLoadedArgs {
  score: {
    title: string;
    artist: string;
    album: string;
    tempo: number;
    tracks: Track[];
    masterBars: MasterBar[];
  };
}
