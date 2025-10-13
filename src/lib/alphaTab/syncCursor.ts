// Cursor synchronization engine
// Handles smooth beat-to-beat interpolation with rest fallback

import type { AlphaTabApi, CursorPosition, BeatBounds, Beat } from "./types";

export interface SyncCursorOptions {
  api: AlphaTabApi;
  currentTimeMs: number;
  lastKnownPosition: CursorPosition;
  isPlaying: boolean;
}

export interface SyncCursorResult {
  position: CursorPosition;
  debugInfo: string;
}

/**
 * Computes cursor position with smooth interpolation across beats
 * Includes fallback logic for rests and missing bounds
 */
export function syncCursor(options: SyncCursorOptions): SyncCursorResult {
  const { api, currentTimeMs, lastKnownPosition, isPlaying } = options;

  // Comprehensive API readiness check
  if (!api) {
    return { position: lastKnownPosition, debugInfo: "⚠️ API is null" };
  }
  if (!api.score) {
    return { position: lastKnownPosition, debugInfo: "⚠️ Score not loaded" };
  }
  if (!api.renderer) {
    return { position: lastKnownPosition, debugInfo: "⚠️ Renderer not ready" };
  }
  if (!api.renderer.boundsLookup) {
    return {
      position: lastKnownPosition,
      debugInfo: "⚠️ BoundsLookup not ready",
    };
  }
  if (!api.tickCache) {
    return { position: lastKnownPosition, debugInfo: "⚠️ TickCache not ready" };
  }

  try {
    // Find current beat - use only rendered tracks
    const renderedTracks = api.tracks || [];
    if (renderedTracks.length === 0) {
      return {
        position: lastKnownPosition,
        debugInfo: "⚠️ No tracks rendered",
      };
    }

    const trackIndices = renderedTracks.map((t: any) => t.index);
    const trackSet = new Set(trackIndices);
    const result = api.tickCache.findBeat(trackSet, currentTimeMs);

    if (!result?.beat) {
      return {
        position: lastKnownPosition,
        debugInfo: "⚠️ No beat found",
      };
    }

    const currentBeat: Beat = result.beat;
    const currentBeatBounds: BeatBounds | null =
      api.renderer.boundsLookup.findBeat(currentBeat);

    if (!currentBeatBounds) {
      // No bounds for current beat - estimate from last position
      const estimatedSpeed = 40; // pixels per second
      const deltaTime = 1 / 60; // 60fps
      const newX = lastKnownPosition.x + estimatedSpeed * deltaTime;

      return {
        position: { ...lastKnownPosition, x: newX },
        debugInfo: "📍 Estimating from last position",
      };
    }

    // Extract current position
    const currentX = currentBeatBounds.visualBounds.x;
    const currentY = currentBeatBounds.visualBounds.y;
    const height = currentBeatBounds.visualBounds.h;

    const beatStartMs = currentBeat.absolutePlaybackStart;
    const beatDurationMs = currentBeat.playbackDuration;

    // Look for next beat with valid bounds (skip rests)
    let nextBeat: Beat | null = currentBeat.nextBeat;
    let nextBeatBounds: BeatBounds | null = null;
    let searchDepth = 0;
    const maxSearchDepth = 10;

    while (nextBeat && searchDepth < maxSearchDepth) {
      nextBeatBounds = api.renderer.boundsLookup.findBeat(nextBeat);

      // Found valid bounds on same line
      if (
        nextBeatBounds &&
        nextBeatBounds.barBounds.masterBarBounds.visualBounds.y === currentY
      ) {
        break;
      }

      nextBeat = nextBeat.nextBeat;
      nextBeatBounds = null;
      searchDepth++;
    }

    let finalX = currentX;
    let progress = 0;
    let mode = "static";

    // Interpolate to next valid beat if found
    if (nextBeatBounds && nextBeat) {
      const nextX = nextBeatBounds.visualBounds.x;
      const totalDurationMs = nextBeat.absolutePlaybackStart - beatStartMs;
      const elapsedSinceCurrentBeat = currentTimeMs - beatStartMs;
      progress = Math.min(
        1,
        Math.max(0, elapsedSinceCurrentBeat / totalDurationMs)
      );

      // Smooth linear interpolation across entire duration (including rests)
      finalX = currentX + (nextX - currentX) * progress;
      mode = "interpolating";
    } else if (beatDurationMs > 0) {
      // No next beat found - estimate movement based on tempo
      const estimatedSpacing = 80; // pixels per beat
      const elapsedInBeat = currentTimeMs - beatStartMs;
      progress = Math.min(1, elapsedInBeat / beatDurationMs);
      finalX = currentX + estimatedSpacing * progress;
      mode = "estimating";
    }

    const newPosition: CursorPosition = { x: finalX, y: currentY, height };

    const debugInfo =
      isPlaying && Math.floor(currentTimeMs / 1000) % 5 === 0
        ? `✅ ${mode} at X: ${Math.floor(finalX)}px (${Math.floor(
            progress * 100
          )}%)`
        : `✅ Cursor at ${Math.floor(currentTimeMs / 1000)}s`;

    return { position: newPosition, debugInfo };
  } catch (err) {
    const errMsg = `❌ ${err instanceof Error ? err.message : "Unknown error"}`;
    console.error(errMsg, err);
    return {
      position: lastKnownPosition,
      debugInfo: errMsg,
    };
  }
}
