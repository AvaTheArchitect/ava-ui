// 🎸 tabs/page.tsx - Enhanced with Advanced Controls
'use client';

import React, { useState } from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import SVGTabDisplay from '@/components/guitar/display/SVGTabDisplay';
import { BasicTabParser, type ParsedSong } from '@/lib/tab-parsers/basicTabParser';

// 🎵 Sample song data for testing
const SAMPLE_TAB_DATA = `
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
B|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
G|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
D|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
A|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
`;

const CHORD_PROGRESSION = "C Am F G | C Am F G";

// 🎸 Enhanced Tab Content Component (inside provider)
const EnhancedTabContent: React.FC = () => {
    const { state, play, pause, stop, seek, setVolume } = usePlaybackControls();
    const [selectedTab, setSelectedTab] = useState<'sample' | 'chords'>('sample');
    const [parsedSong, setParsedSong] = useState<ParsedSong>(() =>
        BasicTabParser.parseASCIITab(SAMPLE_TAB_DATA, 120)
    );

    // 🎛️ Enhanced audio controls state
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [loop, setLoop] = useState(false);

    // 🎵 Handle tab type selection
    const handleTabChange = (tabType: 'sample' | 'chords'): void => {
        setSelectedTab(tabType);

        if (tabType === 'sample') {
            const parsed = BasicTabParser.parseASCIITab(SAMPLE_TAB_DATA, 120);
            setParsedSong(parsed);
        } else {
            const parsed = BasicTabParser.parseChordProgression(CHORD_PROGRESSION, 100);
            setParsedSong(parsed);
        }

        stop(); // Stop current playback
        console.log('🎸 Switched to:', tabType);
    };

    // 🎛️ Enhanced audio controls
    const handlePlaybackRateChange = (newRate: number) => {
        const clampedRate = Math.max(0.5, Math.min(2.0, newRate));
        setPlaybackRate(clampedRate);
        // Note: HTML5 audio playbackRate would need to be implemented in WorkingAudioController
        console.log('🎶 Playback rate:', clampedRate);
    };

    const handleLoopToggle = () => {
        setLoop(!loop);
        // Note: Loop functionality would need to be implemented in WorkingAudioController
        console.log('🔄 Loop:', !loop);
    };

    return (
        // ✅ CORRECT Maestro.ai Color Scheme - Same as your existing design
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">

            {/* Header - Same style as your existing design */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4 text-orange-500 tracking-wide">
                    🎸 Audio-Synced Tablature
                </h1>
                <p className="text-xl text-blue-200/80 mb-4">
                    Guitar Practice with Real-Time Audio Synchronization
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${state.isLoaded ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${state.isLoaded ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                        {state.isLoaded ? '🎸 Loaded' : '⏳ Loading...'}
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${state.isPlaying ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${state.isPlaying ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                        {state.isPlaying ? '▶️ Playing' : '⏸️ Stopped'}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto space-y-8">

                {/* 🎛️ Audio Controller */}
                <WorkingAudioController audioUrl="/audio/guitar-practice.mp3" />

                {/* 🎯 Tab Type Selection */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400">🎵 Tab Type Selection</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleTabChange('sample')}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${selectedTab === 'sample'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-gradient-to-r from-gray-500/50 to-gray-600/50 text-blue-200'
                                }`}
                        >
                            🎸 Guitar Tab (Lead)
                        </button>
                        <button
                            onClick={() => handleTabChange('chords')}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${selectedTab === 'chords'
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'bg-gradient-to-r from-gray-500/50 to-gray-600/50 text-blue-200'
                                }`}
                        >
                            🎼 Chord Progression
                        </button>
                    </div>
                </div>

                {/* 🎵 Audio Status Panel - From your existing design */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-orange-500">
                        🎵 Audio Status
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                            <div className="text-blue-200/70 text-xs uppercase tracking-wide mb-1">Track</div>
                            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${state.isLoaded ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {state.isLoaded ? '🎸 Loaded' : '⏳ Loading...'}
                            </div>
                        </div>

                        <div>
                            <div className="text-blue-200/70 text-xs uppercase tracking-wide mb-1">Status</div>
                            <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${state.isPlaying ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                {state.isPlaying ? '▶️ Playing' : '⏸️ Stopped'}
                            </div>
                        </div>

                        <div>
                            <div className="text-blue-200/70 text-xs uppercase tracking-wide mb-1">Time</div>
                            <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-orange-500/20 text-orange-400 font-mono">
                                {state.currentTime.toFixed(1)}s / {state.duration.toFixed(1)}s
                            </div>
                        </div>

                        <div>
                            <div className="text-blue-200/70 text-xs uppercase tracking-wide mb-1">Volume</div>
                            <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-400">
                                {Math.round(state.volume * 100)}%
                            </div>
                        </div>

                        <div>
                            <div className="text-blue-200/70 text-xs uppercase tracking-wide mb-1">Speed</div>
                            <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-400">
                                {Math.round(playbackRate * 100)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🎛️ Enhanced Audio Controls - From your existing design */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-orange-500">
                        🎛️ Enhanced Audio Controls
                    </h2>

                    {/* Playback Controls */}
                    <div className="flex gap-4 items-center mb-6">
                        <button
                            onClick={play}
                            disabled={!state.isLoaded || state.isPlaying}
                            className={`py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${!state.isLoaded
                                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                }`}
                        >
                            ▶️ Play Guitar Track
                        </button>

                        <button
                            onClick={pause}
                            disabled={!state.isPlaying}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:from-gray-500/20 disabled:to-gray-500/20 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            ⏸️ Pause
                        </button>

                        <button
                            onClick={stop}
                            disabled={!state.isLoaded}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg disabled:from-gray-500/20 disabled:to-gray-500/20 disabled:text-gray-500 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            ⏹️ Stop
                        </button>

                        <button
                            onClick={handleLoopToggle}
                            disabled={!state.isLoaded}
                            className={`py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${loop
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-gradient-to-r from-gray-500/50 to-gray-600/50 text-blue-200'
                                }`}
                        >
                            🔄 Loop: {loop ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Enhanced Controls Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Volume Control */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-blue-200">
                                🎚️ Volume: {Math.round(state.volume * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={state.volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        {/* Speed Control */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-blue-200">
                                🎶 Speed: {Math.round(playbackRate * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={playbackRate}
                                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-green-400 font-semibold">
                        ✅ Enhanced controls with Maestro.ai hook integration
                    </div>
                </div>

                {/* 🔍 Debug Panel - From your existing design */}
                <div className="bg-yellow-500/10 backdrop-blur-lg rounded-2xl border border-yellow-500/20 p-6">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-3">🔍 Orange Cursor Debug</h3>
                    <div className="text-yellow-200 text-sm space-y-2">
                        <p><strong>Current Time:</strong> {state.currentTime.toFixed(3)}s</p>
                        <p><strong>Is Playing:</strong> {state.isPlaying ? '✅ Yes' : '❌ No'}</p>
                        <p><strong>Progress:</strong> {state.duration > 0 ? ((state.currentTime / state.duration) * 100).toFixed(1) : 0}%</p>
                        <p><strong>Tab Type:</strong> {selectedTab === 'sample' ? 'Lead Guitar' : 'Chord Progression'}</p>
                        <p><strong>Measures:</strong> {parsedSong.measures.length}</p>
                        <p><strong>Total Notes:</strong> {parsedSong.measures.reduce((total, m) => total + m.notes.length, 0)}</p>
                    </div>

                    {/* Manual Orange Cursor Test */}
                    <div className="mt-4">
                        <p className="text-xs text-yellow-300 mb-2">Manual cursor test (should move when playing):</p>
                        <div className="relative w-full h-6 bg-white/10 rounded-lg">
                            <div
                                className="absolute top-0 h-full rounded transition-all duration-100"
                                style={{
                                    backgroundColor: '#f97316', // orange-500
                                    width: '3px',
                                    left: `${state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0}%`,
                                    transform: 'translateX(-50%)',
                                    zIndex: 10
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 🎸 SVG Tab Display */}
                <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-orange-500">
                        🎸 Audio-Synced Tablature
                    </h2>

                    <SVGTabDisplay
                        measures={parsedSong.measures}
                        songTitle={`${parsedSong.title} - ${selectedTab === 'sample' ? 'Lead Guitar' : 'Chord Progression'}`}
                        bpm={Math.round(parsedSong.bpm * playbackRate)}
                        timeSignature={parsedSong.timeSignature}
                        showCursor={true}
                    />
                </div>

                {/* 🎵 Progress Bar - From your existing design */}
                {state.isLoaded && state.duration > 0 && (
                    <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
                        <div className="flex justify-between text-sm text-blue-200 mb-3">
                            <span>🎵 guitar-practice.mp3</span>
                            <span>{Math.round((state.currentTime / state.duration) * 100)}%</span>
                        </div>

                        <div
                            className="w-full bg-white/10 rounded-full h-4 cursor-pointer relative"
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const clickX = e.clientX - rect.left;
                                const percentage = clickX / rect.width;
                                const seekTime = percentage * state.duration;
                                seek(seekTime);
                            }}
                        >
                            <div
                                className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all"
                                style={{ width: `${(state.currentTime / state.duration) * 100}%` }}
                            ></div>

                            {/* Time markers */}
                            <div className="absolute inset-0 flex justify-between items-center px-3 text-xs text-white font-bold">
                                <span>{Math.floor(state.currentTime / 60)}:{(state.currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                                <span>{Math.floor(state.duration / 60)}:{(state.duration % 60).toFixed(0).padStart(2, '0')}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Same as your existing design */}
            <div className="text-center mt-12 pt-8 border-t border-white/10 text-blue-200/70 text-sm max-w-6xl mx-auto">
                🔧 Enhanced Audio Sync | SVG Tablature Display | {new Date().toLocaleDateString()}
            </div>
        </div>
    );
};

// 🎸 Main Page Component with Provider
export default function TabsPage() {
    return (
        <PlaybackProvider>
            <EnhancedTabContent />
        </PlaybackProvider>
    );
}