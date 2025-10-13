// Core type definitions for alphaTab integration
// Based on Songsterr architecture analysis

export type AlphaTabApi = any; // Will be properly typed after @coderline/alphatab import

export interface CursorPosition {
    x: number;
    y: number;
    height: number;
}

export interface Track {
    index: number;
    name: string;
    color: any;
}

export interface SongInfo {
    title: string;
    artist: string;
    album: string;
    tempo: number;
}

export interface BeatBounds {
    visualBounds: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    barBounds: {
        masterBarBounds: {
            visualBounds: {
                y: number;
            };
        };
    };
}

export interface Beat {
    absolutePlaybackStart: number;
    playbackDuration: number;
    nextBeat: Beat | null;
}

export interface BeatLookupResult {
    beat: Beat | null;
}