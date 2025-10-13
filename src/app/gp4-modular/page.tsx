'use client';

import React, { useState, useCallback } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { TrackSelector } from '@/components/alphaTab/TrackSelector';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

function GP4ModularContent() {
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Use playback controls from the provider
    const { state, play, pause, stop, seek } = usePlaybackControls();

    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ AlphaTab API ready');
        setApi(alphaTabApi);
    }, []);

    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        // Use the actual metadata from the GPX/GP5 file
        setSongInfo(info);
        setTracks(trackList);
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ Render finished - cursor ready');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        setError(errorMsg);
    }, []);

    const handleTrackChange = useCallback((trackIndex: number) => {
        setSelectedTrack(trackIndex);
    }, []);

    // Sync AlphaTab cursor with MP3 playback
    React.useEffect(() => {
        if (api && state.isPlaying && state.currentTime > 0) {
            const timeMs = state.currentTime * 1000;
            api.tickPosition = timeMs;
        }
    }, [api, state.isPlaying, state.currentTime]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
            {/* Header */}
            <div className="bg-gray-800/90 border-b border-gray-700 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-orange-500 mb-2">
                        {songInfo?.title || 'Guitar Tab Player'}
                    </h1>
                    <p className="text-xl text-gray-300">{songInfo?.artist || 'Loading...'}</p>
                    {songInfo?.album && (
                        <p className="text-gray-400 mt-1">Album: {songInfo.album}</p>
                    )}
                    <p className="text-sm text-green-400 mt-2">
                        ✅ Testing GP5 File - Checking for Sync Point Data
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                {/* External MP3 Controller */}
                <WorkingAudioController audioUrl="/data/sample-songs/real-songs/cinderella-hot-and-bothered/audio.mp3" />

                {/* Playback Controls */}
                <div className="bg-gray-800/80 rounded-xl p-6 mb-6 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={play}
                                disabled={state.duration === 0 || state.isPlaying}
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
                                disabled={state.duration === 0}
                                className="px-8 py-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 font-bold text-lg transition-all"
                            >
                                ⏹️ Stop
                            </button>
                        </div>

                        <div className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 font-mono text-xl">
                            {Math.floor(state.currentTime / 60)}:{Math.floor(state.currentTime % 60).toString().padStart(2, '0')} / {Math.floor(state.duration / 60)}:{Math.floor(state.duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                        className="w-full h-4 bg-gray-700 rounded-full overflow-hidden cursor-pointer hover:h-5 transition-all"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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

                {/* Debug Info */}
                <div className="mb-6">
                    <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-600">
                        <h3 className="text-sm font-bold text-gray-400 mb-2">Debug Info - GP5 Sync Point Test</h3>
                        <div className="text-xs text-gray-300 font-mono space-y-1">
                            <p>API Ready: {api ? '✅' : '❌'}</p>
                            <p>Score Loaded: {songInfo ? '✅' : '❌'}</p>
                            <p>Tracks Found: {tracks.length}</p>
                            <p>MP3 Playing: {state.isPlaying ? '▶️' : '⏸️'}</p>
                            <p>Current Time: {state.currentTime.toFixed(1)}s</p>
                            <p className="text-yellow-400 mt-2">👀 Check console for sync point messages</p>
                        </div>
                    </div>
                </div>

                {/* Track Selector */}
                <TrackSelector
                    api={api}
                    tracks={tracks}
                    selectedTrack={selectedTrack}
                    onTrackChange={handleTrackChange}
                />

                {tracks.length > 1 && <div className="mb-6" />}

                {/* AlphaTab Renderer */}
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                    <AlphaTabRenderer
                        fileUrl="/data/sample-songs/real-songs/cinderella-hot-and-bothered/cinderella-hot-and-bothered.gp5"
                        onApiReady={handleApiReady}
                        onScoreLoaded={handleScoreLoaded}
                        onRenderFinished={handleRenderFinished}
                        onError={handleError}
                        minHeight="600px"
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mt-6 bg-red-500/20 rounded-xl p-6 border border-red-500/30">
                        <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function GP4ModularPage() {
    return (
        <PlaybackProvider>
            <GP4ModularContent />
        </PlaybackProvider>
    );
}