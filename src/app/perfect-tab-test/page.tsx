'use client';

import React from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import TabDisplay from '@/components/guitar/display/TabDisplay';

// 🎸 Main Content Component (inside provider)
const TestContent: React.FC = () => {
    const { state, play, pause, stop, toggle, seek, setVolume } = usePlaybackControls();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* 🎸 Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-orange-500">
                        🎸 Maestro.ai - Fixed Audio Test
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                            state.isLoaded ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                state.isLoaded ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            {state.isLoaded ? 'Audio Ready' : 'Loading...'}
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                            state.isPlaying ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                state.isPlaying ? 'bg-orange-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                            {state.isPlaying ? 'Playing' : 'Paused'}
                        </div>
                    </div>
                </div>

                {/* 🎛️ Audio Controller (Hidden - just handles audio logic) */}
                <WorkingAudioController audioUrl="/audio/guitar-practice.mp3" />

                {/* 🎮 Playback Controls */}
                <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border border-blue-500/30">
                    <h2 className="text-2xl font-bold text-blue-500 mb-4">🎮 Playback Controls</h2>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={play}
                            disabled={!state.isLoaded || state.isPlaying}
                            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50"
                        >
                            ▶️ Play
                        </button>

                        <button
                            onClick={pause}
                            disabled={!state.isPlaying}
                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50"
                        >
                            ⏸️ Pause
                        </button>

                        <button
                            onClick={stop}
                            disabled={!state.isLoaded}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50"
                        >
                            ⏹️ Stop
                        </button>

                        <button
                            onClick={toggle}
                            disabled={!state.isLoaded}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50"
                        >
                            🔄 Toggle
                        </button>

                        {/* Time Display */}
                        <div className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 font-mono">
                            {Math.floor(state.currentTime / 60)}:{Math.floor(state.currentTime % 60).toString().padStart(2, '0')} / 
                            {Math.floor(state.duration / 60)}:{Math.floor(state.duration % 60).toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-blue-400 min-w-[4rem]">Progress:</span>
                            <div 
                                className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
                                onClick={(e) => {
                                    if (!state.isLoaded) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const percent = x / rect.width;
                                    const time = percent * state.duration;
                                    seek(time);
                                }}
                            >
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-blue-500"
                                    style={{
                                        width: state.duration > 0 ? `${(state.currentTime / state.duration) * 100}%` : '0%'
                                    }}
                                />
                            </div>
                            <span className="text-sm text-blue-400 font-mono min-w-[3rem]">
                                {state.duration > 0 ? `${Math.round((state.currentTime / state.duration) * 100)}%` : '0%'}
                            </span>
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-400 min-w-[4rem]">🔊 Volume:</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={state.volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-700 rounded-lg"
                        />
                        <span className="text-sm text-blue-400 font-mono min-w-[3rem]">
                            {Math.round(state.volume * 100)}%
                        </span>
                    </div>
                </div>

                {/* 🎸 Guitar Tab Display */}
                <div className="bg-gray-800/80 rounded-xl p-6 border border-orange-500/30">
                    <h2 className="text-2xl font-bold text-orange-500 mb-4">🎸 Guitar Tab with Cursor</h2>
                    <TabDisplay
                        bpm={120}
                        timeSignature={[4, 4] as [number, number]}
                        showCursor={true}
                        title="Audio Sync Test"
                    />
                </div>

                {/* 🔍 Debug Status */}
                <div className="mt-8 bg-gray-800/80 rounded-xl p-6 border border-cyan-500/30">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">🔍 System Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                            <div className="text-green-400 font-bold">Audio Status</div>
                            <div className="text-white">{state.isLoaded ? '✅ Loaded' : '⏳ Loading'}</div>
                        </div>
                        <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-500/30">
                            <div className="text-orange-400 font-bold">Playback</div>
                            <div className="text-white">{state.isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
                        </div>
                        <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                            <div className="text-blue-400 font-bold">Current Time</div>
                            <div className="text-white font-mono">{state.currentTime.toFixed(1)}s</div>
                        </div>
                        <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                            <div className="text-purple-400 font-bold">Duration</div>
                            <div className="text-white font-mono">{state.duration.toFixed(1)}s</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎸 Main Page Component with Provider
export default function PerfectTabTestPage() {
    return (
        <PlaybackProvider>
            <TestContent />
        </PlaybackProvider>
    );
}