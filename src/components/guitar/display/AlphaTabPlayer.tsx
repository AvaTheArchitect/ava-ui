import React, { useEffect, useRef, useState } from 'react';

// Type definitions for alphaTab
type AlphaTabApi = any; // Will be typed properly after import
type Settings = any;
type Track = {
    index: number;
    name: string;
    color: any;
};

/**
 * Professional Guitar Tab Player using alphaTab
 * Built on Songsterr's proven architecture
 */
const AlphaTabPlayer: React.FC = () => {
    const alphaTabRef = useRef<HTMLDivElement>(null);
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initAlphaTab = async () => {
            try {
                // Import alphaTab
                const alphaTab = await import('@coderline/alphatab');

                if (!alphaTabRef.current) return;

                // Create settings instance properly
                const settings = new alphaTab.Settings();

                // Configure core settings
                settings.core.engine = 'svg';
                settings.core.logLevel = 1;
                settings.core.enableLazyLoading = false;
                settings.core.useWorkers = true;

                // Configure display settings
                settings.display.scale = 1.0;
                settings.display.stretchForce = 0.8;
                settings.display.layoutMode = alphaTab.LayoutMode.Page;
                settings.display.staveProfile = alphaTab.StaveProfile.Tab;

                // Configure notation settings
                settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
                settings.notation.rhythmHeight = 15;
                settings.notation.notationMode = alphaTab.NotationMode.SongBook;

                // Configure player settings
                settings.player.enablePlayer = true;
                settings.player.enableCursor = true;
                settings.player.enableUserInteraction = true;
                settings.player.soundFont = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2';
                settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

                // Create alphaTab instance
                const alphaTabApi = new alphaTab.AlphaTabApi(alphaTabRef.current, settings);

                // Setup event listeners
                alphaTabApi.scoreLoaded.on((score: any) => {
                    console.log('Score loaded:', score);
                    setTracks(score.tracks.map((t: any, i: number) => ({
                        index: i,
                        name: t.name,
                        color: t.color
                    })));
                    setIsReady(true);
                    setError(null);
                });

                alphaTabApi.renderFinished.on(() => {
                    console.log('Rendering complete');
                });

                alphaTabApi.playerReady.on(() => {
                    console.log('Player ready');
                });

                alphaTabApi.playerStateChanged.on((e: any) => {
                    setIsPlaying(e.state === 1); // 1 = playing
                });

                alphaTabApi.playerPositionChanged.on((e: any) => {
                    setCurrentTime(e.currentTime / 1000);
                    setDuration(e.endTime / 1000);
                });

                alphaTabApi.error.on((e: any) => {
                    console.error('AlphaTab error:', e);
                    setError(e.message || 'Failed to load tab file');
                });

                // Load the GP4 file
                const response = await fetch('/data/sample-songs/real-songs/poison-i-wont-forget-you/guitar-1.gp4');
                if (!response.ok) throw new Error('Failed to load GP4 file');

                const arrayBuffer = await response.arrayBuffer();
                alphaTabApi.load(new Uint8Array(arrayBuffer));

                setApi(alphaTabApi);

                // Cleanup
                return () => {
                    if (alphaTabApi) {
                        alphaTabApi.destroy();
                    }
                };
            } catch (err) {
                console.error('Init error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            }
        };

        initAlphaTab();
    }, []);

    const handlePlay = () => {
        if (api) api.playPause();
    };

    const handleStop = () => {
        if (api) api.stop();
    };

    const handleTrackChange = (trackIndex: number) => {
        if (api && api.score) {
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!api || duration === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const timeMs = percent * duration * 1000;
        api.tickPosition = timeMs;
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <div className="bg-gray-800/90 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-orange-500 mb-2">
                        Guitar Tab Player
                    </h1>
                    <p className="text-gray-400">Powered by alphaTab - Songsterr Architecture</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                        <h3 className="text-red-400 font-bold mb-2">Error Loading Tab</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Track Selection */}
                {tracks.length > 0 && (
                    <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border border-green-500/30">
                        <h2 className="text-xl font-bold text-green-400 mb-4">Select Track</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {tracks.map((track) => (
                                <button
                                    key={track.index}
                                    onClick={() => handleTrackChange(track.index)}
                                    className={`p-3 rounded-lg border transition-all ${selectedTrack === track.index
                                            ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                            : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                        }`}
                                >
                                    <div className="font-bold">{track.name || `Track ${track.index + 1}`}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Player Controls */}
                {isReady && (
                    <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border border-blue-500/30">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handlePlay}
                                    className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 font-bold transition-all"
                                >
                                    {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                                </button>
                                <button
                                    onClick={handleStop}
                                    className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 font-bold transition-all"
                                >
                                    ⏹️ Stop
                                </button>
                            </div>

                            <div className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 font-mono text-lg">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div
                            className="w-full h-4 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-blue-500 transition-all duration-100"
                                style={{
                                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* alphaTab Render Container */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                    <div
                        ref={alphaTabRef}
                        className="at-surface"
                        style={{ minHeight: '400px' }}
                    />
                </div>

                {/* Info Panel */}
                <div className="mt-6 bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
                    <h3 className="text-blue-400 font-bold mb-2">Implementation Notes</h3>
                    <ul className="text-blue-300 text-sm space-y-1">
                        <li>✅ Uses alphaTab's native SVG renderer (like Songsterr)</li>
                        <li>✅ Built-in cursor synchronization</li>
                        <li>✅ Auto-scrolling during playback</li>
                        <li>✅ GP3/4/5/X file format support</li>
                        <li>✅ Multiple track rendering</li>
                        <li>✅ Professional tab notation</li>
                    </ul>
                </div>
            </div>

            {/* Loading Overlay */}
            {!isReady && !error && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold text-orange-500">Loading Tab...</h2>
                        <p className="text-gray-400 mt-2">Parsing GP4 file with alphaTab</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlphaTabPlayer;