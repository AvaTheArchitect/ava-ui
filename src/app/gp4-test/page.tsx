'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';

// Type definitions for alphaTab
type AlphaTabApi = any;
type AlphaTabScore = any;

interface Track {
    index: number;
    name: string;
    color: any;
}

interface SongInfo {
    title: string;
    artist: string;
    album: string;
    tempo: number;
}

function GP4TestContent() {
    const { state, play, pause, stop, seek } = usePlaybackControls();
    const alphaTabRef = useRef<HTMLDivElement>(null);
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [cursorDebug, setCursorDebug] = useState<string>('Waiting for playback...');
    const lastKnownPosition = useRef({ x: 0, y: 0, height: 100 }); // Track last valid position

    // Sync custom cursor with audio playback - Smooth interpolation with tempo-based fallback
    useEffect(() => {
        if (!api || !api.score || !api.renderer?.boundsLookup || !api.tickCache) return;

        const timeMs = state.currentTime * 1000;

        try {
            const cursor = document.getElementById('custom-maestro-cursor') as HTMLElement;
            if (!cursor) {
                if (state.currentTime > 0) setCursorDebug('⚠️ Custom cursor not created yet');
                return;
            }

            const tracks = Array.from({ length: api.score.tracks.length }, (_, i) => i);
            const trackSet = new Set(tracks);
            const result = api.tickCache.findBeat(trackSet, timeMs);

            if (result && result.beat) {
                const currentBeatBounds = api.renderer.boundsLookup.findBeat(result.beat);

                if (currentBeatBounds) {
                    const currentBeat = result.beat;
                    const beatStartMs = currentBeat.absolutePlaybackStart;
                    const beatDurationMs = currentBeat.playbackDuration;

                    // Look for next beat with valid bounds (skip rests)
                    let nextBeat = currentBeat.nextBeat;
                    let nextBeatBounds = null;
                    let searchDepth = 0;
                    const maxSearchDepth = 10; // Look up to 10 beats ahead

                    while (nextBeat && searchDepth < maxSearchDepth) {
                        nextBeatBounds = api.renderer.boundsLookup.findBeat(nextBeat);

                        // Found valid bounds on same line
                        if (nextBeatBounds &&
                            nextBeatBounds.barBounds.masterBarBounds.visualBounds.y ===
                            currentBeatBounds.barBounds.masterBarBounds.visualBounds.y) {
                            break;
                        }

                        // This beat didn't work, try the next one
                        nextBeat = nextBeat.nextBeat;
                        nextBeatBounds = null;
                        searchDepth++;
                    }

                    const currentX = currentBeatBounds.visualBounds.x;
                    const currentY = currentBeatBounds.visualBounds.y;
                    const height = currentBeatBounds.visualBounds.h;

                    let finalX = currentX;
                    let progress = 0;

                    // Interpolate to next valid beat if found
                    if (nextBeatBounds && nextBeat) {
                        const nextX = nextBeatBounds.visualBounds.x;
                        const totalDurationMs = nextBeat.absolutePlaybackStart - beatStartMs;
                        const elapsedSinceCurrentBeat = timeMs - beatStartMs;
                        progress = Math.min(1, Math.max(0, elapsedSinceCurrentBeat / totalDurationMs));

                        // Smooth linear interpolation across entire duration (including rests)
                        finalX = currentX + (nextX - currentX) * progress;
                    } else if (beatDurationMs > 0) {
                        // No next beat found - estimate movement based on tempo
                        // Average spacing in guitar tabs is ~50-100px per beat
                        const estimatedSpacing = 80; // pixels per beat
                        const elapsedInBeat = timeMs - beatStartMs;
                        progress = Math.min(1, elapsedInBeat / beatDurationMs);
                        finalX = currentX + estimatedSpacing * progress;
                    }

                    // Store and update position
                    lastKnownPosition.current = { x: finalX, y: currentY, height };

                    cursor.style.left = `${finalX}px`;
                    cursor.style.top = `${currentY}px`;
                    cursor.style.height = `${height}px`;
                    cursor.style.display = 'block';

                    if (state.isPlaying && Math.floor(state.currentTime) % 5 === 0) {
                        const mode = nextBeatBounds ? 'interpolating' : 'estimating';
                        console.log(`✅ Cursor ${mode} at X: ${Math.floor(finalX)}px (${Math.floor(progress * 100)}%)`);
                    }

                    setCursorDebug(`✅ Cursor at ${Math.floor(state.currentTime)}s - X: ${Math.floor(finalX)}px`);
                } else {
                    // Current beat has no bounds - continue from last position using tempo estimate
                    const estimatedSpeed = 40; // pixels per second (adjust based on tempo)
                    const deltaTime = 1 / 60; // assume 60fps update rate
                    lastKnownPosition.current.x += estimatedSpeed * deltaTime;

                    cursor.style.left = `${lastKnownPosition.current.x}px`;
                    cursor.style.top = `${lastKnownPosition.current.y}px`;
                    cursor.style.height = `${lastKnownPosition.current.height}px`;
                    cursor.style.display = 'block';
                }

                // Smooth auto-scroll
                if (state.isPlaying) {
                    const surfaceEl = document.querySelector('.at-surface') as HTMLElement;
                    if (surfaceEl) {
                        const cursorX = parseFloat(cursor.style.left) || lastKnownPosition.current.x;
                        const viewportWidth = surfaceEl.clientWidth;
                        const scrollLeft = surfaceEl.scrollLeft;

                        if (cursorX > scrollLeft + viewportWidth - 300 || cursorX < scrollLeft + 100) {
                            surfaceEl.scrollTo({
                                left: Math.max(0, cursorX - viewportWidth / 2),
                                behavior: 'smooth'
                            });
                        }
                    }
                }
            } else {
                cursor.style.display = 'block';
            }
        } catch (err) {
            const errMsg = `❌ ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.error(errMsg, err);
            setCursorDebug(errMsg);
        }
    }, [api, state.currentTime, state.isPlaying]);

    useEffect(() => {
        const initAlphaTab = async () => {
            try {
                if (!alphaTabRef.current) {
                    console.error('alphaTabRef is null');
                    return;
                }

                console.log('Step 1: Starting alphaTab initialization...');

                const alphaTab = await import('@coderline/alphatab');
                console.log('Step 2: alphaTab imported successfully');

                const settings = new alphaTab.Settings();
                console.log('Step 3: Settings created');

                settings.core.engine = 'svg';
                settings.core.logLevel = 1;
                settings.core.enableLazyLoading = false;
                settings.core.useWorkers = false;
                settings.core.fontDirectory = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/';
                console.log('Step 4: Core settings configured');

                settings.display.scale = 1.0;
                settings.display.stretchForce = 0.8;
                settings.display.layoutMode = alphaTab.LayoutMode.Page;
                settings.display.staveProfile = alphaTab.StaveProfile.Tab;
                console.log('Step 5: Display settings configured');

                settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
                settings.notation.rhythmHeight = 15;
                settings.notation.notationMode = alphaTab.NotationMode.SongBook;
                console.log('Step 6: Notation settings configured');

                settings.player.playerMode = alphaTab.PlayerMode.Disabled; // CRITICAL: Disable alphaTab player completely
                settings.player.enableCursor = false; // We'll create our own cursor
                settings.player.enableUserInteraction = true;
                settings.player.scrollMode = alphaTab.ScrollMode.Off; // We'll handle scrolling manually
                console.log('Step 7: Player DISABLED - using custom cursor for external MP3');

                console.log('Step 8: Creating AlphaTab API instance...');
                const alphaTabApi = new alphaTab.AlphaTabApi(alphaTabRef.current, settings);
                console.log('Step 8: AlphaTab API created');

                const timeoutId = setTimeout(() => {
                    console.error('TIMEOUT: AlphaTab failed to load after 30 seconds');
                    setError('AlphaTab initialization timeout - check console for details');
                    setLoading(false);
                }, 30000);

                alphaTabApi.scoreLoaded.on((score: AlphaTabScore) => {
                    console.log('SCORE LOADED SUCCESSFULLY!', score);
                    clearTimeout(timeoutId);

                    setSongInfo({
                        title: 'I Won\'t Forget You', // Override incorrect GP4 file spelling
                        artist: score.artist || 'Poison',
                        album: score.album || 'Open Up and Say... Ahh!',
                        tempo: score.tempo || 103
                    });

                    const trackList: Track[] = score.tracks.map((track: any, idx: number) => ({
                        index: idx,
                        name: track.name || `Track ${idx + 1}`,
                        color: track.color
                    }));

                    console.log(`Found ${trackList.length} tracks:`, trackList.map(t => t.name));
                    setTracks(trackList);
                    setLoading(false);
                    setError(null);
                });

                alphaTabApi.renderFinished.on(() => {
                    console.log('✅ Rendering complete');

                    // Create our own custom cursor element
                    setTimeout(() => {
                        const surface = document.querySelector('.at-surface');
                        if (surface && !document.getElementById('custom-maestro-cursor')) {
                            const cursor = document.createElement('div');
                            cursor.id = 'custom-maestro-cursor';
                            cursor.style.cssText = `
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 2px;
                                height: 100px;
                                background: rgba(34, 197, 94, 0.9);
                                pointer-events: none;
                                z-index: 9999;
                                display: block;
                                transition: left 50ms linear;
                            `;
                            surface.appendChild(cursor);
                            console.log('✅ Custom cursor created');
                        }
                    }, 500);
                });

                alphaTabApi.playerReady.on(() => {
                    console.log('alphaTab player ready - keeping paused for external audio');
                    if (alphaTabApi.isReadyForPlayback) {
                        alphaTabApi.pause();
                    }
                });

                alphaTabApi.playerStateChanged.on((e: any) => {
                    if (e.state === 1) {
                        console.log('alphaTab player tried to start - pausing it (external audio controls playback)');
                        alphaTabApi.pause();
                    }
                });

                // Handle beat clicks for seeking
                alphaTabApi.beatMouseUp.on((beat: any) => {
                    if (beat && beat.absolutePlaybackStart !== undefined) {
                        console.log('Beat clicked - seeking to position:', beat.absolutePlaybackStart);
                        const timeInSeconds = beat.absolutePlaybackStart / 1000;
                        seek(timeInSeconds);
                        alphaTabApi.tickPosition = beat.absolutePlaybackStart;
                    }
                });

                alphaTabApi.soundFontLoaded.on(() => {
                    console.log('SoundFont loaded - cursor elements should now render');
                });

                alphaTabApi.error.on((e: any) => {
                    console.error('AlphaTab ERROR:', e);
                    clearTimeout(timeoutId);
                    setError(e.message || 'Failed to load tab file');
                    setLoading(false);
                });

                console.log('Step 9: Fetching GP4 file...');
                const response = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-1.gp4');
                console.log('Step 9: Fetch completed - Status:', response.status, 'OK:', response.ok);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Failed to load GP4 file`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                console.log(`Step 10: GP4 file loaded - Size: ${uint8Array.byteLength} bytes`);
                console.log('Step 11: Calling alphaTabApi.load()...');
                alphaTabApi.load(uint8Array);
                console.log('Step 11: api.load() called - Waiting for scoreLoaded event...');

                setApi(alphaTabApi);

            } catch (err) {
                console.error('INITIALIZATION ERROR:', err);
                console.error('Error details:', {
                    message: err instanceof Error ? err.message : 'Unknown error',
                    stack: err instanceof Error ? err.stack : undefined
                });
                setError(err instanceof Error ? err.message : 'Failed to initialize alphaTab');
                setLoading(false);
            }
        };

        initAlphaTab();

        return () => {
            if (api) {
                console.log('Cleanup: destroying AlphaTab API');
                api.destroy();
            }
        };
    }, []);

    const handleTrackChange = (trackIndex: number) => {
        if (api && api.score) {
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {loading && (
                <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4 mx-auto"></div>
                        <h2 className="text-2xl font-bold text-orange-500">Loading GP4 File...</h2>
                        <p className="text-blue-200/80 mt-2">Parsing with alphaTab engine</p>
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center z-50 p-8">
                    <div className="text-center max-w-2xl">
                        <h2 className="text-2xl font-bold text-red-500 mb-4">Failed to Load Tab</h2>
                        <p className="text-red-300 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-gray-800/90 border-b border-gray-700 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-orange-500 mb-2">
                        {songInfo?.title || 'Guitar Tab Player'}
                    </h1>
                    <p className="text-xl text-gray-300">{songInfo?.artist || 'Loading...'}</p>
                    {songInfo?.album && (
                        <p className="text-gray-400 mt-1">Album: {songInfo.album}</p>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div style={{ display: 'none' }}>
                    <WorkingAudioController audioUrl="/audio/songs/poison-i-wont-forget-you/audio.mp3" />
                </div>

                <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={play}
                                disabled={!state.isLoaded || state.isPlaying}
                                className="px-8 py-4 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 font-bold text-lg transition-all"
                            >
                                ▶️ Play
                            </button>
                            <button
                                onClick={pause}
                                disabled={!state.isPlaying}
                                className="px-8 py-4 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 font-bold text-lg transition-all"
                            >
                                ⏸️ Pause
                            </button>
                            <button
                                onClick={stop}
                                disabled={!state.isLoaded}
                                className="px-8 py-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 font-bold text-lg transition-all"
                            >
                                ⏹️ Stop
                            </button>
                        </div>

                        <div className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 font-mono text-xl">
                            {Math.floor(state.currentTime / 60)}:{Math.floor(state.currentTime % 60).toString().padStart(2, '0')} / {Math.floor(state.duration / 60)}:{Math.floor(state.duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Cursor Debug Indicator */}
                    <div className="mb-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-600">
                        <p className="text-xs text-gray-400 font-mono">
                            <span className="text-green-400">Cursor Status:</span> {cursorDebug}
                        </p>
                    </div>

                    <div
                        className="w-full h-4 bg-gray-700 rounded-full overflow-hidden cursor-pointer hover:h-5 transition-all"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            if (!state.isLoaded) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percent = x / rect.width;
                            const time = percent * state.duration;
                            seek(time);
                        }}
                    >
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-blue-500 transition-all duration-100"
                            style={{
                                width: state.duration > 0 ? `${(state.currentTime / state.duration) * 100}%` : '0%'
                            }}
                        />
                    </div>
                </div>

                {tracks.length > 1 && (
                    <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border border-green-500/30">
                        <h2 className="text-2xl font-bold text-green-500 mb-4">Select Track</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {tracks.map((track) => (
                                <button
                                    key={track.index}
                                    onClick={() => handleTrackChange(track.index)}
                                    className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === track.index
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                        }`}
                                >
                                    <div className="font-bold text-lg">{track.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                    <div
                        ref={alphaTabRef}
                        className="at-surface"
                        style={{ minHeight: '600px' }}
                    />
                </div>

                <div className="mt-6 bg-blue-500/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-green-400 mb-3">✓ Songsterr-Style Features Active</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-300">
                        <ul className="space-y-2">
                            <li>✓ Thin green cursor (Songsterr-style)</li>
                            <li>✓ Smooth cursor animation</li>
                            <li>✓ Auto-scroll enabled</li>
                            <li>✓ Click-to-seek anywhere in tab</li>
                        </ul>
                        <ul className="space-y-2">
                            <li>✓ Real MP3 audio sync</li>
                            <li>✓ Multi-track rendering</li>
                            <li>✓ Professional notation (GP4)</li>
                            <li>✓ Continuous scroll mode</li>
                        </ul>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-500/30">
                        <p className="text-sm text-blue-200">
                            💡 <strong>Tip:</strong> Click anywhere in the tab to jump to that position instantly!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GP4TestPage() {
    return (
        <PlaybackProvider>
            <GP4TestContent />
        </PlaybackProvider>
    );
}