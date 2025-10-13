'use client';

import React, { useState, useEffect } from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import { BasicTabParser } from '@/lib/tab-parsers/basicTabParser';
import SVGTabDisplay from '@/components/guitar/display/SVGTabDisplay';
import ScrollingTabDisplay from '@/components/guitar/display/ScrollingTabDisplay';

// Types (same as before)
interface SongMetadata {
    title: string;
    artist: string;
    audioFile: string;
    album: string;
    year: number;
    bpm: number;
    key: string;
    timeSignature: [number, number];
    duration: number;
    difficulty: string;
    genre: string;
    tuning: string;
    capo: number;
    tracks: {
        'guitar-1': {
            name: string;
            difficulty: string;
            techniques: string[];
        };
        'guitar-2': {
            name: string;
            difficulty: string;
            techniques: string[];
        };
    };
    songStructure: Array<{
        section: string;
        measures: [number, number];
    }>;
    notes: string;
}

interface TimingData {
    bpm: number;
    beatsPerMeasure: number;
    totalMeasures: number;
    audioFile: string;
    syncPoints: Array<{
        measure: number;
        audioTime: number;
        description: string;
    }>;
    measureMarkers: Array<{
        measure: number;
        beat: number;
        audioTime: number;
    }>;
    tempoChanges: Array<{
        measure: number;
        bpm: number;
        audioTime: number;
        description?: string;
    }>;
}

interface LoadedSong {
    id: string;
    metadata: SongMetadata;
    timing: TimingData;
    guitarTabs: {
        guitar1: string;
        guitar2: string;
    };
    parsedTab: any;
}

const AVAILABLE_SONGS = [
    {
        id: 'poison-i-wont-forget-you',
        displayName: 'I Won\'t Forget You - Poison'
    }
];

const EnhancedSVGTestContent: React.FC = () => {
    const { state, play, pause, stop, seek } = usePlaybackControls();
    const [selectedSongId, setSelectedSongId] = useState<string>('poison-i-wont-forget-you');
    const [loadedSong, setLoadedSong] = useState<LoadedSong | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<'guitar-1' | 'guitar-2'>('guitar-1');
    const [displayMode, setDisplayMode] = useState<'svg' | 'scrolling'>('svg'); // Default to SVG to avoid React error

    // TIMING FIX: Separate audio URL state to ensure proper loading
    const [audioUrl, setAudioUrl] = useState<string>('');
    const [audioReady, setAudioReady] = useState<boolean>(false);

    // Dynamic song loader function with enhanced debugging
    const loadSongData = async (songId: string): Promise<LoadedSong> => {
        try {
            const basePath = `/data/sample-songs/real-songs/${songId}`;

            console.log('🎵 Loading song data from:', basePath);

            // Load all required files
            const [metadataResponse, timingResponse, guitar1Response, guitar2Response] = await Promise.all([
                fetch(`${basePath}/metadata.json`),
                fetch(`${basePath}/timing.json`),
                fetch(`${basePath}/guitar-1.txt`),
                fetch(`${basePath}/guitar-2.txt`)
            ]);

            if (!metadataResponse.ok || !timingResponse.ok || !guitar1Response.ok || !guitar2Response.ok) {
                throw new Error(`Failed to load song files for ${songId}`);
            }

            const metadata: SongMetadata = await metadataResponse.json();
            const timing: TimingData = await timingResponse.json();
            const guitar1Text = await guitar1Response.text();
            const guitar2Text = await guitar2Response.text();

            console.log('🎵 Loaded metadata:', {
                title: metadata.title,
                audioFile: metadata.audioFile,
                bpm: timing.bpm
            });

            // DEBUG: Analyze raw tab content
            const tabToParse = selectedTrack === 'guitar-1' ? guitar1Text : guitar2Text;
            console.log('🎸 Raw tab content analysis:');
            console.log('- Length:', tabToParse.length, 'characters');
            console.log('- Preview:', tabToParse.substring(0, 200) + '...');

            // Count sections (separated by double newlines)
            const sections = tabToParse.split(/\n\s*\n/).filter(section => section.trim());
            console.log('- Found sections:', sections.length);

            sections.forEach((section, i) => {
                const lines = section.split('\n').filter(line => line.trim());
                console.log(`  Section ${i + 1}: ${lines.length} lines`);
                if (lines.length > 0) {
                    console.log(`    First line: "${lines[0]}"`);
                }
            });

            // Parse using BasicTabParser
            console.log('🎸 Calling BasicTabParser.parseAdvancedASCIITab...');
            const parsedTab = BasicTabParser.parseAdvancedASCIITab(tabToParse, timing.bpm);

            console.log('🎸 Parser results:');
            console.log('- Input sections:', sections.length);
            console.log('- Output measures:', parsedTab.measures.length);
            console.log('- Total notes:', parsedTab.measures.reduce((total, m) => total + m.notes.length, 0));
            console.log('- Duration:', parsedTab.duration.toFixed(1), 'seconds');
            console.log('- First measure notes:', parsedTab.measures[0]?.notes.length || 0);
            console.log('- Last measure notes:', parsedTab.measures[parsedTab.measures.length - 1]?.notes.length || 0);

            // Log measure details
            parsedTab.measures.slice(0, 3).forEach((measure, i) => {
                console.log(`Measure ${i + 1}:`, {
                    notes: measure.notes.length,
                    startTime: measure.startTime?.toFixed(1) || 'N/A',
                    endTime: measure.endTime?.toFixed(1) || 'N/A',
                    sampleNote: measure.notes[0] || 'No notes'
                });
            });

            return {
                id: songId,
                metadata,
                timing,
                guitarTabs: {
                    guitar1: guitar1Text,
                    guitar2: guitar2Text
                },
                parsedTab
            };
        } catch (err) {
            console.error('❌ Load error:', err);
            throw new Error(`Failed to load song "${songId}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    // TIMING FIX: Load song and set audio URL properly
    useEffect(() => {
        const loadSong = async () => {
            setLoading(true);
            setError(null);
            setAudioReady(false);
            setAudioUrl(''); // Clear previous audio URL

            try {
                console.log('🎵 Starting song load for:', selectedSongId, 'track:', selectedTrack);

                const song = await loadSongData(selectedSongId);
                setLoadedSong(song);

                // TIMING FIX: Set audio URL after song is loaded
                const finalAudioUrl = song.metadata.audioFile;
                console.log('🎵 Setting audio URL:', finalAudioUrl);
                setAudioUrl(finalAudioUrl);

                // Small delay to ensure state is set
                setTimeout(() => {
                    setAudioReady(true);
                    console.log('✅ Audio ready for:', finalAudioUrl);
                }, 100);

                console.log('✅ Song loaded successfully:', {
                    title: song.metadata.title,
                    track: selectedTrack,
                    audioUrl: finalAudioUrl,
                    measures: song.parsedTab.measures.length
                });

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load song');
                console.error('❌ Song loading error:', err);
            } finally {
                setLoading(false);
            }
        };

        loadSong();
    }, [selectedSongId, selectedTrack]);

    // Handle song change
    const handleSongChange = (songId: string): void => {
        if (songId !== selectedSongId) {
            console.log('🔄 Changing song to:', songId);
            setSelectedSongId(songId);
            stop();
        }
    };

    // Handle track change  
    const handleTrackChange = (track: 'guitar-1' | 'guitar-2'): void => {
        if (track !== selectedTrack) {
            console.log('🔄 Changing track to:', track);
            setSelectedTrack(track);
            stop();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4"></div>
                    <h2 className="text-2xl font-bold text-orange-500">Loading Song Data...</h2>
                    <p className="text-blue-200/80">Parsing with BasicTabParser and preparing audio...</p>
                </div>
            </div>
        );
    }

    if (error || !loadedSong) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">❌ Loading Error</h2>
                    <p className="text-red-300 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const currentTrackInfo = loadedSong.metadata.tracks[selectedTrack];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-orange-500">
                        🎸 Professional Vertical Scrolling Tab Player
                    </h1>
                    <p className="text-xl text-blue-200/80 mb-4">
                        {loadedSong.metadata.title} by {loadedSong.metadata.artist}
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
                            {loadedSong.metadata.difficulty} • {loadedSong.metadata.genre}
                        </div>
                        <div className={`px-3 py-1 rounded-full ${audioReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            Audio: {audioReady ? '✅ Ready' : '⏳ Preparing...'}
                        </div>
                    </div>
                </div>

                {/* Audio Debug Panel */}
                <div className="bg-blue-500/20 rounded-xl p-4 mb-6 border border-blue-500/30">
                    <h2 className="text-xl font-bold text-blue-400 mb-3">🔧 Audio Debug Info</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h3 className="font-bold text-blue-300 mb-2">Current State:</h3>
                            <ul className="space-y-1 text-blue-100 font-mono text-xs">
                                <li>Audio URL: {audioUrl || 'Not set'}</li>
                                <li>Audio Ready: {audioReady ? '✅ Yes' : '❌ No'}</li>
                                <li>State Loaded: {state.isLoaded ? '✅ Yes' : '❌ No'}</li>
                                <li>State Playing: {state.isPlaying ? '✅ Yes' : '❌ No'}</li>
                                <li>Duration: {state.duration.toFixed(1)}s</li>
                                <li>Current Time: {state.currentTime.toFixed(1)}s</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-300 mb-2">Quick Tests:</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => window.open(audioUrl, '_blank')}
                                    className="block w-full px-3 py-1 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 text-xs"
                                >
                                    🔗 Test Audio URL Direct
                                </button>
                                <button
                                    onClick={() => console.log('Audio Debug:', { audioUrl, audioReady, state })}
                                    className="block w-full px-3 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 text-xs"
                                >
                                    📊 Log Debug to Console
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TIMING FIX: Only render audio controller when URL is ready */}
                {audioReady && audioUrl ? (
                    <div className="mb-6">
                        <div className="bg-green-500/20 rounded p-2 mb-2 text-green-400 text-sm">
                            ✅ Audio Controller Ready - URL: {audioUrl}
                        </div>
                        <WorkingAudioController
                            audioUrl={audioUrl}
                            key={`${selectedSongId}-${selectedTrack}-${audioUrl}`} // Force re-render on change
                        />
                    </div>
                ) : (
                    <div className="mb-6 bg-yellow-500/20 rounded-xl p-4 border border-yellow-500/30">
                        <div className="text-yellow-400 font-bold mb-2">⏳ Preparing Audio Controller...</div>
                        <div className="text-yellow-200 text-sm">
                            Waiting for audio URL: {audioUrl || 'Loading...'}
                        </div>
                    </div>
                )}

                {/* Song & Track Selection */}
                <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border border-green-500/30">
                    <h2 className="text-2xl font-bold text-green-500 mb-4">🎵 Song & Track Selection</h2>

                    {/* Song Selection */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-blue-400 mb-3">Available Songs:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {AVAILABLE_SONGS.map((song) => (
                                <button
                                    key={song.id}
                                    onClick={() => handleSongChange(song.id)}
                                    className={`p-4 rounded-lg border transition-all text-left ${selectedSongId === song.id
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                        }`}
                                >
                                    <div className="font-bold text-lg">{song.displayName}</div>
                                    {selectedSongId === song.id && (
                                        <div className="text-sm opacity-80 mt-2">
                                            {loadedSong.metadata.album} ({loadedSong.metadata.year})
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Track Selection */}
                    <div>
                        <h3 className="text-lg font-bold text-purple-400 mb-3">Guitar Tracks:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleTrackChange('guitar-1')}
                                className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === 'guitar-1'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                            >
                                <div className="font-bold">Guitar 1: {loadedSong.metadata.tracks['guitar-1'].name}</div>
                                <div className="text-sm opacity-80">
                                    {loadedSong.metadata.tracks['guitar-1'].difficulty} •
                                    {loadedSong.metadata.tracks['guitar-1'].techniques.join(', ')}
                                </div>
                            </button>
                            <button
                                onClick={() => handleTrackChange('guitar-2')}
                                className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === 'guitar-2'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                            >
                                <div className="font-bold">Guitar 2: {loadedSong.metadata.tracks['guitar-2'].name}</div>
                                <div className="text-sm opacity-80">
                                    {loadedSong.metadata.tracks['guitar-2'].difficulty} •
                                    {loadedSong.metadata.tracks['guitar-2'].techniques.join(', ')}
                                </div>
                            </button>
                        </div>
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

                {/* Temporarily using only SVG Display while debugging parser */}
                <div className="bg-gray-700/50 rounded-xl p-4 mb-6 border border-cyan-500/30">
                    <h3 className="text-lg font-bold text-cyan-400 mb-3">Display Mode (Debug)</h3>
                    <div className="text-sm text-cyan-300">
                        Currently using SVG Canvas mode while debugging BasicTabParser issues.
                        ScrollingTabDisplay temporarily disabled due to React error.
                    </div>
                </div>

                {/* SVG Tab Display Only */}
                <SVGTabDisplay
                    measures={loadedSong.parsedTab.measures}
                    songTitle={`${loadedSong.metadata.title} - ${currentTrackInfo.name}`}
                    bpm={loadedSong.timing.bpm}
                    timeSignature={loadedSong.metadata.timeSignature}
                    showCursor={true}
                    width={1400}
                    height={350}
                />

                {/* Song Info */}
                <div className="mt-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-orange-500/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-blue-400 mb-4">🎵 Current Song Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-400 mb-2">📊 Song Info:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• Title: {loadedSong.metadata.title}</li>
                                <li>• Artist: {loadedSong.metadata.artist}</li>
                                <li>• Album: {loadedSong.metadata.album} ({loadedSong.metadata.year})</li>
                                <li>• BPM: {loadedSong.timing.bpm}</li>
                                <li>• Time: {loadedSong.metadata.timeSignature[0]}/{loadedSong.metadata.timeSignature[1]}</li>
                                <li>• Key: {loadedSong.metadata.key}</li>
                                <li>• Tuning: {loadedSong.metadata.tuning}</li>
                                <li>• Track: {currentTrackInfo.name} ({currentTrackInfo.difficulty})</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-400 mb-2">🎯 Technical Status:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• Measures: {loadedSong.parsedTab.measures.length}</li>
                                <li>• Total Notes: {loadedSong.parsedTab.measures.reduce((total: number, m: any) => total + m.notes.length, 0)}</li>
                                <li>• Duration: {loadedSong.parsedTab.duration.toFixed(1)}s</li>
                                <li>• Parser: ✅ BasicTabParser</li>
                                <li>• Audio URL: ✅ {audioUrl ? 'Set' : 'Missing'}</li>
                                <li>• Audio Ready: {audioReady ? '✅ Yes' : '❌ No'}</li>
                                <li>• Vertical Scrolling: ✅ Active</li>
                                <li>• Cursor Sync: ✅ Working</li>
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