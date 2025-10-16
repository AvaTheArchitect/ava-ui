'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { TrackSelector } from '@/components/alphaTab/TrackSelector';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

export default function SynthPlayerPage() {
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Track mute/solo state management
    const [trackMuteState, setTrackMuteState] = useState<Map<number, boolean>>(new Map());
    const [trackSoloState, setTrackSoloState] = useState<Map<number, boolean>>(new Map());

    // Loop state
    const [isLooping, setIsLooping] = useState<boolean>(true);
    const [hasSelection, setHasSelection] = useState<boolean>(false);

    // Diagnostic state - limited to 30 entries
    const [diagnostics, setDiagnostics] = useState<string[]>([]);
    const addDiagnostic = useCallback((msg: string) => {
        setDiagnostics(prev => {
            const newDiagnostics = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
            return newDiagnostics.slice(-30);
        });
        console.log('📊', msg);
    }, []);

    // Player state
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [soundFontLoaded, setSoundFontLoaded] = useState<boolean>(false);
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
        }, 500); // Update UI only twice per second

        return () => clearInterval(interval);
    }, [isPlaying]);

    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        addDiagnostic('✅ API Ready');
        setApi(alphaTabApi);

        // Enable looping by default
        if (alphaTabApi.isLooping !== undefined) {
            alphaTabApi.isLooping = true;
            addDiagnostic('🔄 Loop enabled by default');
        }

        // Wire up player state events
        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                addDiagnostic('✅ Player Ready!');
                setPlayerReady(true);
            });
        }

        // UPDATE the playerStateChanged handler - REMOVE the reset logic:
        if (alphaTabApi.playerStateChanged) {
            alphaTabApi.playerStateChanged.on((e: any) => {
                const playing = e.state === 1;
                addDiagnostic(`🎹 ${playing ? 'Playing' : e.state === 0 ? 'Paused' : 'Finished'} (state: ${e.state})`);
                setIsPlaying(playing);

                // Only reset on finished, NOT on pause/stop
                // The stop button will handle its own reset
                if (e.state === 2) { // 2 = Finished playing
                    currentTimeRef.current = 0;
                    setDisplayTime(0);
                    addDiagnostic('✅ Playback finished - reset to start');
                }
                // Do NOT reset on state 0 (paused) - let pause maintain position
            });
        }

        // CRITICAL FIX: Store position in ref, not state
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                // Update refs directly - NO React re-render
                currentTimeRef.current = e.currentTime / 1000;
                durationRef.current = e.endTime / 1000;
            });
        }

        // Listen for playback range changes
        if (alphaTabApi.playbackRangeChanged) {
            alphaTabApi.playbackRangeChanged.on((e: any) => {
                if (e.playbackRange) {
                    addDiagnostic(`🎯 Loop range set: ${e.playbackRange.startTick} → ${e.playbackRange.endTick}`);
                    setHasSelection(true);
                } else {
                    addDiagnostic('🔄 Loop range cleared');
                    setHasSelection(false);
                }
            });
        }

        if (alphaTabApi.beatMouseUp) {
            alphaTabApi.beatMouseUp.on((beat: any) => {
                if (beat?.absolutePlaybackStart !== undefined) {
                    alphaTabApi.tickPosition = beat.absolutePlaybackStart;
                    addDiagnostic(`🎯 Seeking to tick ${beat.absolutePlaybackStart}`);
                }
            });
        }

        if (alphaTabApi.soundFontLoaded) {
            alphaTabApi.soundFontLoaded.on(() => {
                addDiagnostic('✅ SoundFont Loaded!');
                setSoundFontLoaded(true);
            });
        }

        if (alphaTabApi.soundFontLoadFailed) {
            alphaTabApi.soundFontLoadFailed.on((e: any) => {
                addDiagnostic(`❌ SoundFont Failed: ${e?.message || 'Unknown error'}`);
            });
        }
    }, [addDiagnostic]);

    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        addDiagnostic(`✅ Score: ${info.title} (${trackList.length} tracks)`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);

        // Initialize track mute/solo state - all tracks start unmuted and unsoloed
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, [addDiagnostic]);

    const handleRenderFinished = useCallback(() => {
        addDiagnostic('✅ Rendering Complete');
    }, [addDiagnostic]);

    const handleError = useCallback((errorMsg: string) => {
        addDiagnostic(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, [addDiagnostic]);

    const handleTrackChange = useCallback((trackIndex: number) => {
        if (api?.score?.tracks) {
            addDiagnostic(`🔄 Track ${trackIndex}`);
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    }, [api, addDiagnostic]);

    const toggleLoop = useCallback(() => {
        if (!api) return;

        const newLoopState = !isLooping;
        api.isLooping = newLoopState;
        setIsLooping(newLoopState);
        addDiagnostic(`🔄 Loop ${newLoopState ? 'enabled' : 'disabled'}`);
    }, [api, isLooping, addDiagnostic]);

    const clearSelection = useCallback(() => {
        if (!api) return;

        api.playbackRange = null;
        setHasSelection(false);
        addDiagnostic('🗑️ Selection cleared');
    }, [api, addDiagnostic]);

    const handleMuteToggle = useCallback((trackIndex: number) => {
        if (!api || !api.score) return;

        const track = api.score.tracks[trackIndex];
        const isMuted = trackMuteState.get(trackIndex) || false;

        api.changeTrackMute([track], !isMuted);
        setTrackMuteState(prev => {
            const newMap = new Map(prev);
            newMap.set(trackIndex, !isMuted);
            return newMap;
        });

        addDiagnostic(`${!isMuted ? '🔇' : '🔊'} ${track.name}`);
    }, [api, trackMuteState, addDiagnostic]);

    const handleSoloToggle = useCallback((trackIndex: number) => {
        if (!api || !api.score) return;

        const track = api.score.tracks[trackIndex];
        const isSoloed = trackSoloState.get(trackIndex) || false;

        api.changeTrackSolo([track], !isSoloed);
        setTrackSoloState(prev => {
            const newMap = new Map(prev);
            if (!isSoloed) {
                prev.forEach((_, key) => newMap.set(key, key === trackIndex));
            } else {
                newMap.set(trackIndex, false);
            }
            return newMap;
        });

        addDiagnostic(`${!isSoloed ? '🎯' : '👥'} Solo ${track.name}`);
    }, [api, trackSoloState, addDiagnostic]);

    const handlePlay = () => {
        if (!api) {
            addDiagnostic('❌ API not ready');
            return;
        }

        if (!soundFontLoaded) {
            addDiagnostic('🔧 Attempting to initialize audio...');

            try {
                if (api._player) {
                    addDiagnostic('🔧 Calling playPause to initialize audio...');
                    api.playPause();
                } else {
                    addDiagnostic('❌ No player wrapper!');
                }
            } catch (err: any) {
                addDiagnostic(`❌ Error: ${err.message || err}`);
            }
            return;
        }

        addDiagnostic('▶️ Play');
        api.playPause();
    };

    // UPDATE handleStop to explicitly reset everything:
    const handleStop = () => {
        if (api) {
            addDiagnostic('⏹️ Stop');
            api.stop();

            // Force reset everything on stop
            currentTimeRef.current = 0;
            setDisplayTime(0);
            setIsPlaying(false);

            // Force the API to reset position
            if (api.tickPosition !== undefined) {
                api.tickPosition = 0;
            }

            // Optional: Force update the display immediately
            setTimeout(() => {
                setDisplayTime(0);
            }, 50);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!api || !soundFontLoaded || displayDuration === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const targetTime = percent * displayDuration;

        // Convert time to ticks and seek
        const targetTick = Math.floor((targetTime / displayDuration) * (durationRef.current * 1000));
        api.tickPosition = targetTick;
        addDiagnostic(`⏩ Seek to ${formatTime(targetTime)}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-orange-500 mb-2">
                        🎹 AlphaTab Synthesizer Player
                    </h1>
                    <p className="text-gray-400">
                        Testing Ozzy Osbourne - No More Tears (GP3 format)
                    </p>
                </div>

                {/* Status Grid */}
                <div className="mb-6 grid grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg ${api ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <div className="text-xs text-gray-300">API</div>
                        <div className="text-lg font-bold">{api ? '✅' : '⏳'}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${tracks.length > 0 ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <div className="text-xs text-gray-300">Score</div>
                        <div className="text-lg font-bold">{tracks.length > 0 ? `✅ ${tracks.length}` : '⏳'}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${playerReady ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <div className="text-xs text-gray-300">Player</div>
                        <div className="text-lg font-bold">{playerReady ? '✅' : '⏳'}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${soundFontLoaded ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <div className="text-xs text-gray-300">SoundFont</div>
                        <div className="text-lg font-bold">{soundFontLoaded ? '✅' : '⏳'}</div>
                    </div>
                </div>

                {/* Event Log */}
                <div className="mb-6 bg-gray-800/80 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-blue-400">📊 Event Log</h3>
                        <button
                            onClick={() => setDiagnostics([])}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="bg-black/50 rounded p-3 max-h-48 overflow-y-auto font-mono text-xs">
                        {diagnostics.length === 0 ? (
                            <div className="text-gray-500">Waiting for events...</div>
                        ) : (
                            diagnostics.slice(-20).map((msg, i) => (
                                <div key={i} className="text-green-400">{msg}</div>
                            ))
                        )}
                    </div>
                </div>

                {/* Debug Panel */}
                <div className="mb-6">
                    <DebugPanel
                        api={api}
                        currentTime={displayTime}
                        isPlaying={isPlaying}
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500 rounded-xl p-4">
                        <p className="text-red-300">❌ {error}</p>
                    </div>
                )}

                {/* Song Info */}
                {songInfo && (
                    <div className="mb-6 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-xl p-6 border border-orange-500/30">
                        <h2 className="text-2xl font-bold text-orange-500 mb-1">
                            {songInfo.title}
                        </h2>
                        <div className="flex gap-4 text-sm text-gray-300">
                            <span>👤 {songInfo.artist}</span>
                            {songInfo.album && <span>💿 {songInfo.album}</span>}
                            <span>🎵 {songInfo.tempo} BPM</span>
                        </div>
                    </div>
                )}

                {/* Player Controls */}
                <div className="mb-6 bg-gray-800/80 rounded-xl p-6 border border-gray-600">
                    {!soundFontLoaded && api && (
                        <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 text-yellow-200 text-sm">
                            ⚠️ <strong>Click Play to initialize player.</strong>
                            (Browsers require user interaction to start audio)
                        </div>
                    )}

                    {/* Transport Controls Row */}
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={handlePlay}
                            className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${api
                                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                }`}
                            disabled={!api}
                        >
                            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                        </button>

                        <button
                            onClick={handleStop}
                            disabled={!soundFontLoaded}
                            className={`px-8 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${soundFontLoaded
                                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                }`}
                        >
                            ⏹️ Stop
                        </button>

                        <button
                            onClick={toggleLoop}
                            disabled={!api}
                            className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${isLooping
                                ? 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400'
                                : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                                }`}
                            title={isLooping ? 'Loop enabled' : 'Loop disabled'}
                        >
                            🔄 Loop {isLooping && '✓'}
                        </button>

                        {hasSelection && (
                            <button
                                onClick={clearSelection}
                                disabled={!api}
                                className="px-6 py-3 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 text-white transition-all"
                            >
                                🗑️ Clear Selection
                            </button>
                        )}

                        <div className="ml-auto text-purple-400 font-mono">
                            {formatTime(displayTime)} / {formatTime(displayDuration)}
                        </div>
                    </div>

                    {/* Progress bar with GRADIENT */}
                    <div
                        className="w-full bg-gray-700 rounded-full h-3 overflow-hidden cursor-pointer"
                        onClick={handleProgressBarClick}
                        title="Click to seek"
                    >
                        <div
                            className="bg-gradient-to-r from-orange-500 to-blue-500 h-full transition-all duration-500"
                            style={{
                                width: displayDuration > 0 ? `${(displayTime / displayDuration) * 100}%` : '0%'
                            }}
                        />
                    </div>

                    {hasSelection && (
                        <div className="mt-2 text-xs text-blue-400 flex items-center gap-2">
                            🎯 Loop range selected - playback will repeat this section
                        </div>
                    )}
                </div>

                {/* Track Selector */}
                {tracks.length > 1 && (
                    <>
                        <TrackSelector
                            api={api}
                            tracks={tracks}
                            selectedTrack={selectedTrack}
                            onTrackChange={handleTrackChange}
                        />

                        {/* Track Mixer */}
                        <div className="mb-6 bg-gray-800/80 rounded-xl p-6 border border-gray-600">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-purple-400">🎛️ Track Mixer</h3>
                                <button
                                    onClick={() => {
                                        if (api?.score?.tracks) {
                                            api.score.tracks.forEach((track: any) => {
                                                if (track) {
                                                    api.changeTrackVolume([track], 1.0);
                                                    if (track.playbackInfo) {
                                                        track.playbackInfo.volume = 16;
                                                    }
                                                }
                                            });
                                            setTracks([...tracks]);
                                            addDiagnostic('🔊 Reset all volumes to 16/16');
                                        }
                                    }}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold"
                                    disabled={!api}
                                >
                                    🔊 Reset All Volumes
                                </button>
                            </div>
                            <div className="space-y-3">
                                {tracks.map((track, idx) => {
                                    const isMuted = trackMuteState.get(idx) || false;
                                    const isSoloed = trackSoloState.get(idx) || false;
                                    const trackVolume = api?.score?.tracks[idx]?.playbackInfo?.volume ?? 16;

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg transition-colors ${isSoloed ? 'bg-yellow-900/50 border-2 border-yellow-500' :
                                                isMuted ? 'bg-red-900/30 border border-red-500/50' :
                                                    'bg-gray-900/50 border border-gray-700'
                                                }`}
                                        >
                                            {/* Track Info */}
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-white truncate">{track.name}</div>
                                                    <div className="text-xs text-gray-400">
                                                        Track {idx + 1} • Vol: {trackVolume}/16 •
                                                        {isSoloed && ' 🎯 SOLO'}
                                                        {isMuted && ' 🔇 MUTED'}
                                                        {!isSoloed && !isMuted && ' 🔊 PLAYING'}
                                                    </div>
                                                </div>

                                                {/* Mute Button */}
                                                <button
                                                    onClick={() => handleMuteToggle(idx)}
                                                    className={`px-4 py-2 rounded-lg font-bold transition-all ${isMuted
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-green-600 text-white hover:bg-green-700'
                                                        }`}
                                                    disabled={!api}
                                                >
                                                    {isMuted ? '🔇 Muted' : '🔊 On'}
                                                </button>

                                                {/* Solo Button */}
                                                <button
                                                    onClick={() => handleSoloToggle(idx)}
                                                    className={`px-4 py-2 rounded-lg font-bold transition-all text-sm ${isSoloed
                                                        ? 'bg-yellow-400 text-black border-2 border-yellow-200 shadow-lg'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                                        }`}
                                                    disabled={!api}
                                                    title={isSoloed ? 'Click to unsolo' : 'Click to solo this track'}
                                                >
                                                    {isSoloed ? '🎯 SOLO' : '👥 Solo'}
                                                </button>
                                            </div>

                                            {/* Volume Slider */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400 w-16">Volume:</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="16"
                                                    value={trackVolume}
                                                    onChange={(e) => {
                                                        const newVolume = parseInt(e.target.value);
                                                        if (api?.score?.tracks[idx]) {
                                                            const track = api.score.tracks[idx];
                                                            api.changeTrackVolume([track], newVolume / 16);
                                                            track.playbackInfo.volume = newVolume;
                                                            setTracks([...tracks]);
                                                            addDiagnostic(`🔊 ${track.name} volume: ${newVolume}/16`);
                                                        }
                                                    }}
                                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    disabled={!api}
                                                />
                                                <span className="text-xs text-white w-8">{trackVolume}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* AlphaTab Renderer with ID wrapper for CSS specificity */}
                <div id="maestro-player" className="bg-white rounded-xl shadow-2xl overflow-hidden">
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

                {/* Info Panel */}
                <div className="mt-6 bg-blue-500/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-blue-400 mb-3">🔍 Features & Controls</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-blue-300 mb-2">✓ Active Features</h4>
                            <ul className="text-blue-200 space-y-1 text-sm">
                                <li>✓ Loop mode {isLooping && '(enabled)'}</li>
                                <li>✓ Section selection (click & drag on notation)</li>
                                <li>✓ Gradient progress bar (orange → blue)</li>
                                <li>✓ Click progress bar to seek</li>
                                <li>✓ Individual track mute/solo</li>
                                <li>✓ Volume control per track</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-yellow-300 mb-2">🎸 How to Use Loop</h4>
                            <div className="text-yellow-200 space-y-2 text-sm">
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>Enable Loop mode (button should show ✓)</li>
                                    <li>Click and drag on the notation to select bars</li>
                                    <li>Selected section will be highlighted in purple</li>
                                    <li>Press Play - it will loop the selected section</li>
                                    <li>Click "Clear Selection" to loop entire song</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}