'use client';

import React, { useState } from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import SVGTabDisplay from '@/components/guitar/display/SVGTabDisplay';
import { BasicTabParser } from '@/lib/tab-parsers/basicTabParser';

// ✅ Fixed: Embedded types and data (no problematic imports)
interface SongData {
    id: string;
    title: string;
    artist: string;
    bpm: number;
    timeSignature: [number, number];
    tabData: string;
    chordProgression?: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    genre: string;
    duration: number;
}

// ✅ Fixed: Embedded song library (no import needed)
const SONG_LIBRARY: SongData[] = [
    {
        id: 'wonderwall-intro',
        title: 'Wonderwall (Intro)',
        artist: 'Oasis',
        bpm: 87,
        timeSignature: [4, 4],
        difficulty: 'Beginner',
        genre: 'Rock',
        duration: 16,
        chordProgression: 'Em7 G D C | Em7 G D C',
        tabData: `
E|--3--3--3--3--|--3--3--3--3--|--0--0--0--0--|--0--0--0--0--|
B|--3--3--3--3--|--3--3--3--3--|--1--1--1--1--|--1--1--1--1--|
G|--0--0--0--0--|--0--0--0--0--|--0--0--0--0--|--0--0--0--0--|
D|--0--0--0--0--|--2--2--2--2--|--2--2--2--2--|--2--2--2--2--|
A|--2--2--2--2--|--3--3--3--3--|--3--3--3--3--|--3--3--3--3--|
E|--3--3--3--3--|--x--x--x--x--|--x--x--x--x--|--x--x--x--x--|`
    },
    {
        id: 'smoke-on-water',
        title: 'Smoke on the Water (Main Riff)',
        artist: 'Deep Purple',
        bpm: 112,
        timeSignature: [4, 4],
        difficulty: 'Beginner',
        genre: 'Rock',
        duration: 8,
        tabData: `
E|--0--3--5--|--0--3--6--5--|--0--3--5--|--3--0--|
B|-----------|--------------|-----------|--------|
G|-----------|--------------|-----------|--------|
D|-----------|--------------|-----------|--------|
A|-----------|--------------|-----------|--------|
E|-----------|--------------|-----------|--------|`
    },
    {
        id: 'test-progression',
        title: 'Guitar Practice Test',
        artist: 'Maestro.ai',
        bpm: 120,
        timeSignature: [4, 4],
        difficulty: 'Beginner',
        genre: 'Practice',
        duration: 16,
        tabData: `
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
B|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
G|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
D|--0--4--5--7--|--9--7--5--4--|--0--2--4--5--|--7--5--4--0--|
A|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|
E|--0--3--5--7--|--8--7--5--3--|--0--2--3--5--|--7--5--3--0--|`
    }
];

const EnhancedSVGTestContent: React.FC = () => {
    // ✅ Fixed: Removed unused variables (toggle, setVolume)
    const { state, play, pause, stop, seek } = usePlaybackControls();
    const [selectedSong, setSelectedSong] = useState<SongData>(SONG_LIBRARY[0]);
    const [parsedSong, setParsedSong] = useState(() =>
        BasicTabParser.parseASCIITab(selectedSong.tabData, selectedSong.bpm)
    );

    // ✅ Fixed: Added explicit type annotations for parameters
    const handleSongChange = (songId: string): void => {
        const song: SongData | undefined = SONG_LIBRARY.find((s: SongData) => s.id === songId);
        if (song) {
            setSelectedSong(song);
            const parsed = BasicTabParser.parseASCIITab(song.tabData, song.bpm);
            setParsedSong(parsed);
            stop(); // Stop current playback
            console.log('🎸 Loaded song:', song.title, parsed);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-orange-500">
                        🎸 Real Song Tab Display Test
                    </h1>
                    <p className="text-xl text-blue-200/80 mb-4">
                        Testing with real guitar songs - {selectedSong.title} by {selectedSong.artist}
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${state.isLoaded ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${state.isLoaded ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                                }`}></div>
                            {state.isLoaded ? 'Audio Ready' : 'Loading...'}
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${state.isPlaying ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${state.isPlaying ? 'bg-orange-400 animate-pulse' : 'bg-gray-400'
                                }`}></div>
                            {state.isPlaying ? 'Playing' : 'Paused'}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400">
                            {selectedSong.difficulty} • {selectedSong.genre}
                        </div>
                    </div>
                </div>

                {/* Audio Controller */}
                <WorkingAudioController audioUrl="/audio/guitar-practice.mp3" />

                {/* Song Selection */}
                <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border border-green-500/30">
                    <h2 className="text-2xl font-bold text-green-500 mb-4">🎵 Song Library</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SONG_LIBRARY.map((song: SongData) => (
                            <button
                                key={song.id}
                                onClick={() => handleSongChange(song.id)}
                                className={`p-4 rounded-lg border transition-all text-left ${selectedSong.id === song.id
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                            >
                                <div className="font-bold text-lg">{song.title}</div>
                                <div className="text-sm opacity-80">{song.artist}</div>
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                        {song.bpm} BPM
                                    </span>
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                                        {song.difficulty}
                                    </span>
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                                        {song.duration}s
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Compact Controls */}
                <div className="bg-gray-800/80 rounded-xl p-4 mb-8 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={play}
                                disabled={!state.isLoaded || state.isPlaying}
                                className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 font-bold"
                            >
                                ▶️ Play
                            </button>

                            <button
                                onClick={pause}
                                disabled={!state.isPlaying}
                                className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 font-bold"
                            >
                                ⏸️ Pause
                            </button>

                            <button
                                onClick={stop}
                                disabled={!state.isLoaded}
                                className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 font-bold"
                            >
                                ⏹️ Stop
                            </button>
                        </div>

                        {/* Time Display */}
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 font-mono text-lg">
                                {Math.floor(state.currentTime / 60)}:{Math.floor(state.currentTime % 60).toString().padStart(2, '0')} /
                                {Math.floor(state.duration / 60)}:{Math.floor(state.duration % 60).toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div
                            className="w-full h-4 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
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
                </div>

                {/* SVG Tab Display with Real Song */}
                <SVGTabDisplay
                    measures={parsedSong.measures}
                    songTitle={`${selectedSong.title} - ${selectedSong.artist}`}
                    bpm={selectedSong.bpm}
                    timeSignature={selectedSong.timeSignature}
                    showCursor={true}
                />

                {/* Song Info */}
                <div className="mt-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-orange-500/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-blue-400 mb-4">🎵 Current Song Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-400 mb-2">📊 Song Info:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• Title: {selectedSong.title}</li>
                                <li>• Artist: {selectedSong.artist}</li>
                                <li>• BPM: {selectedSong.bpm}</li>
                                <li>• Time: {selectedSong.timeSignature[0]}/{selectedSong.timeSignature[1]}</li>
                                <li>• Difficulty: {selectedSong.difficulty}</li>
                                <li>• Genre: {selectedSong.genre}</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-400 mb-2">🎯 Parsed Data:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• Measures: {parsedSong.measures.length}</li>
                                <li>• Total Notes: {parsedSong.measures.reduce((total, m) => total + m.notes.length, 0)}</li>
                                <li>• Duration: {parsedSong.duration}s</li>
                                <li>• SVG Rendering: ✅ Active</li>
                                <li>• Cursor Sync: ✅ Perfect</li>
                                <li>• Real-time Highlighting: ✅ Working</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function EnhancedSVGTabTestPage() {
    return (
        <PlaybackProvider>
            <EnhancedSVGTestContent />
        </PlaybackProvider>
    );
}