'use client';

/**
 * STAGE 1 - Synth Player Page
 * 
 * CHANGES FROM V63:
 * ✅ isLooping defaults to FALSE (was true)
 * ✅ isLooping prop REMOVED from AlphaTabRenderer (loop logic removed)
 * ✅ isRenderReady state added for Track 1 fix
 * ✅ Using proper TrackSelector and DebugPanel components
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { TrackSelector } from '@/components/alphaTab/TrackSelector';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

export default function SynthPlayerPage() {
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Player state
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playerReady, setPlayerReady] = useState<boolean>(false);

    // CRITICAL FIX: Use refs for position tracking to avoid re-renders
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    // Update display every 500ms instead of every position change
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);

        return () => clearInterval(interval);
    }, [isPlaying]);

    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ STAGE1: API Ready');
        setApi(alphaTabApi);

        // Wire up player state events
        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ STAGE1: Player Ready!');
                setPlayerReady(true);
            });
        }

        if (alphaTabApi.playerStateChanged) {
            alphaTabApi.playerStateChanged.on((e: any) => {
                const playing = e.state === 1;
                setIsPlaying(playing);

                // Only reset on finished
                if (e.state === 2) {
                    currentTimeRef.current = 0;
                    setDisplayTime(0);
                }
            });
        }

        // CRITICAL FIX: Store position in ref, not state
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime / 1000;
                durationRef.current = e.endTime / 1000;
            });
        }
    }, []);

    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ STAGE1: Score: ${info.title} (${trackList.length} tracks)`);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ STAGE1: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    const handleTrackChange = useCallback((trackIndex: number) => {
        console.log(`🔄 STAGE1: Track changed to ${trackIndex}`);
        setSelectedTrack(trackIndex);
    }, []);

    const handlePlay = useCallback(() => {
        if (!api) return;
        try {
            if (api.play) {
                api.play();
            } else if ((api as any).playPause) {
                (api as any).playPause();
            }
            console.log('▶️ Play');
        } catch (err) {
            console.error(`❌ Play error:`, err);
        }
    }, [api]);

    const handlePause = useCallback(() => {
        if (!api) return;
        try {
            if (api.pause) {
                api.pause();
            } else if ((api as any).playPause) {
                (api as any).playPause();
            }
            console.log('⏸️ Pause');
        } catch (err) {
            console.error(`❌ Pause error:`, err);
        }
    }, [api]);

    const handleStop = useCallback(() => {
        if (!api) return;
        try {
            if (api.stop) {
                api.stop();
            }
            currentTimeRef.current = 0;
            setDisplayTime(0);
            if (api.tickPosition !== undefined) {
                api.tickPosition = 0;
            }
            console.log('⏹️ Stop');
        } catch (err) {
            console.error(`❌ Stop error:`, err);
        }
    }, [api]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-gray-800/90 rounded-xl p-6 border border-blue-500/30">
                    <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500 mb-2">
                        Maestro Guitar Tab Player - STAGE 1
                    </h1>
                    <p className="text-gray-400">
                        Core Features: Double-click to play • Auto-scroll • Orientation support
                    </p>
                    <p className="text-yellow-400 text-sm mt-1">
                        ⚠️ Loop handles temporarily disabled for Stage 1 testing
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                        <h3 className="text-red-400 font-bold mb-2">Error</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Track Selector - Using proper component */}
                <TrackSelector
                    api={api}
                    tracks={tracks}
                    selectedTrack={selectedTrack}
                    onTrackChange={handleTrackChange}
                />

                {/* Player Controls */}
                {playerReady && (
                    <div className="bg-gray-800/80 rounded-xl p-6 border border-purple-500/30">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePlay}
                                    disabled={!api || isPlaying}
                                    className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
                                >
                                    ▶️ Play
                                </button>
                                <button
                                    onClick={handlePause}
                                    disabled={!api || !isPlaying}
                                    className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
                                >
                                    ⏸️ Pause
                                </button>
                                <button
                                    onClick={handleStop}
                                    disabled={!api}
                                    className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all"
                                >
                                    ⏹️ Stop
                                </button>
                            </div>

                            {/* Time Display */}
                            <div className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30 font-mono text-lg">
                                {formatTime(displayTime)} / {formatTime(displayDuration)}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 via-purple-500 to-blue-500 transition-all"
                                style={{
                                    width: displayDuration > 0 ? `${(displayTime / displayDuration) * 100}%` : '0%'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* AlphaTab Renderer - STAGE 1: NO isLooping or enableTouchSelection */}
                <div id="maestro-player" className="bg-white rounded-xl shadow-2xl">
                    <AlphaTabRenderer
                        fileUrl="/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3"
                        playerMode="synthesizer"
                        soundFontPath="/soundfont/sonivox.sf2"
                        onApiReady={handleApiReady}
                        onScoreLoaded={handleScoreLoaded}
                        onRenderFinished={handleRenderFinished}
                        onError={handleError}
                        minHeight="600px"
                    />
                </div>

                {/* Debug Panel - Using proper component */}
                <DebugPanel
                    api={api}
                    currentTime={displayTime}
                    isPlaying={isPlaying}
                />
            </div>
        </div>
    );
}