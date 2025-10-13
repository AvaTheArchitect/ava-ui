// Beat lookup and navigation utilities
// Helpers for finding beats, handling rests, and lookahead logic

import type { AlphaTabApi, Beat, BeatBounds } from './types';

/**
 * Find the beat at a given time across specified tracks
 */
export function findBeatAtTime(
    api: AlphaTabApi,
    timeMs: number,
    trackIndices?: number[]
): Beat | null {
    if (!api?.tickCache) return null;

    const tracks = trackIndices || Array.from({ length: api.score?.tracks?.length || 0 }, (_, i) => i);
    const trackSet = new Set(tracks);
    const result = api.tickCache.findBeat(trackSet, timeMs);

    return result?.beat || null;
}

/**
 * Get bounds for a beat, returns null if no bounds available
 */
export function getBeatBounds(api: AlphaTabApi, beat: Beat): BeatBounds | null {
    if (!api?.renderer?.boundsLookup || !beat) return null;
    return api.renderer.boundsLookup.findBeat(beat);
}

/**
 * Find next beat with valid bounds (skipping rests/empty beats)
 * Looks up to maxDepth beats ahead
 */
export function findNextValidBeat(
    api: AlphaTabApi,
    currentBeat: Beat,
    currentY: number,
    maxDepth: number = 10
): { beat: Beat; bounds: BeatBounds } | null {
    let nextBeat: Beat | null = currentBeat.nextBeat;
    let searchDepth = 0;

    while (nextBeat && searchDepth < maxDepth) {
        const nextBounds = getBeatBounds(api, nextBeat);

        // Found valid bounds on same line
        if (nextBounds && 
            nextBounds.barBounds.masterBarBounds.visualBounds.y === currentY) {
            return { beat: nextBeat, bounds: nextBounds };
        }

        nextBeat = nextBeat.nextBeat;
        searchDepth++;
    }

    return null;
}

/**
 * Calculate interpolation progress between two beats
 */
export function calculateBeatProgress(
    currentTimeMs: number,
    currentBeat: Beat,
    nextBeat: Beat
): number {
    const beatStartMs = currentBeat.absolutePlaybackStart;
    const totalDurationMs = nextBeat.absolutePlaybackStart - beatStartMs;
    const elapsedMs = currentTimeMs - beatStartMs;

    return Math.min(1, Math.max(0, elapsedMs / totalDurationMs));
}

/**
 * Estimate cursor movement when no next beat is available
 * Uses tempo-based estimation
 */
export function estimateCursorMovement(
    currentTimeMs: number,
    currentBeat: Beat,
    currentX: number,
    estimatedSpacingPx: number = 80
): number {
    const beatStartMs = currentBeat.absolutePlaybackStart;
    const beatDurationMs = currentBeat.playbackDuration;

    if (beatDurationMs <= 0) return currentX;

    const elapsedInBeat = currentTimeMs - beatStartMs;
    const progress = Math.min(1, elapsedInBeat / beatDurationMs);

    return currentX + estimatedSpacingPx * progress;
}

/**
 * Convert beat time to pixel position with interpolation
 */
export function beatTimeToPosition(
    api: AlphaTabApi,
    timeMs: number,
    trackIndices?: number[]
): { x: number; y: number; height: number } | null {
    const beat = findBeatAtTime(api, timeMs, trackIndices);
    if (!beat) return null;

    const bounds = getBeatBounds(api, beat);
    if (!bounds) return null;

    const currentY = bounds.visualBounds.y;
    const currentX = bounds.visualBounds.x;
    const height = bounds.visualBounds.h;

    // Try to interpolate with next beat
    const nextValid = findNextValidBeat(api, beat, currentY);
    if (nextValid) {
        const progress = calculateBeatProgress(timeMs, beat, nextValid.beat);
        const nextX = nextValid.bounds.visualBounds.x;
        const interpolatedX = currentX + (nextX - currentX) * progress;

        return { x: interpolatedX, y: currentY, height };
    }

    // Fallback to estimation
    const estimatedX = estimateCursorMovement(timeMs, beat, currentX);
    return { x: estimatedX, y: currentY, height };
}