'use client';

import React, { useState, useEffect } from 'react';
import { PlaybackProvider, usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import { WorkingAudioController } from '@/components/audio/controls/WorkingAudioController';
import ScrollingTabDisplay from '@/components/guitar/display/ScrollingTabDisplay';
import { TabMeasure } from '@/lib/tab-parsers/basicTabParser';

// MJTF JSON interfaces
interface MJTFSong {
    title: string;
    artist: string;
    tuning: string[];
    capo?: number;
    tempo: number;
    timeSignature: string;
    audioFile: string;
    measures: MJTFMeasure[];
}

interface MJTFMeasure {
    number: number;
    beats: MJTFBeat[];
}

interface MJTFBeat {
    time: number;
    notes: MJTFNote[];
}

interface MJTFNote {
    string: number;
    fret: number;
    duration: number;
    technique?: string[];
}

const MJTFTestContent: React.FC = () => {
    const { state, play, pause, stop, seek } = usePlaybackControls();
    const [mjtfSong, setMjtfSong] = useState<MJTFSong | null>(null);
    const [convertedMeasures, setConvertedMeasures] = useState<TabMeasure[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<'guitar-1' | 'guitar-2'>('guitar-1');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load JSON files
    useEffect(() => {
        const loadJSONSong = async () => {
            try {
                setLoading(true);
                setError(null);

                console.log(`Loading JSON file: ${selectedTrack}.json`);

                const response = await fetch(`/data/sample-songs/real-songs/poison-i-wont-forget-you/${selectedTrack}.json`);

                if (!response.ok) {
                    throw new Error(`Failed to load ${selectedTrack}.json`);
                }

                const jsonSong: MJTFSong = await response.json();
                setMjtfSong(jsonSong);

                // Convert to TabMeasure format
                const measures = convertJSONToTabMeasures(jsonSong);
                setConvertedMeasures(measures);

                console.log('Song loaded successfully');
                console.log(`Track: ${selectedTrack}`);
                console.log(`Measures: ${measures.length}`);
                console.log(`Notes: ${measures.reduce((total, m) => total + m.notes.length, 0)}`);

            } catch (err) {
                console.error('Error loading JSON song:', err);
                setError(err instanceof Error ? err.message : 'Failed to load song');
            } finally {
                setLoading(false);
            }
        };

        loadJSONSong();
    }, [selectedTrack]);

    // Convert MJTF JSON to TabMeasure[] format
    const convertJSONToTabMeasures = (song: MJTFSong): TabMeasure[] => {
        const timeSignature = parseTimeSignature(song.timeSignature);
        const beatDuration = 60 / song.tempo;
        const measureDuration = beatDuration * timeSignature[0];

        return song.measures.map((measure, index) => {
            const measureStartTime = index * measureDuration;
            const measureEndTime = measureStartTime + measureDuration;

            // Extract all notes from all beats
            const notes = measure.beats.flatMap(beat =>
                beat.notes.map(note => ({
                    fret: note.fret,
                    string: note.string - 1, // Convert 1-6 to 0-5
                    time: measureStartTime + (beat.time * beatDuration),
                    duration: note.duration * beatDuration,
                    technique: note.technique?.[0]
                }))
            );

            return {
                id: `measure-${measure.number}`,
                startTime: measureStartTime,
                endTime: measureEndTime,
                notes: notes.sort((a, b) => a.time - b.time),
                timeSignature: timeSignature
            } as TabMeasure;
        });
    };

    // Parse time signature string
    const parseTimeSignature = (timeSignature: string): [number, number] => {
        const parts = timeSignature.split('/');
        if (parts.length === 2) {
            return [parseInt(parts[0]), parseInt(parts[1])];
        }
        return [4, 4];
    };

    // Handle track change
    const handleTrackChange = (track: 'guitar-1' | 'guitar-2') => {
        if (track !== selectedTrack) {
            setSelectedTrack(track);
            stop();
            console.log(`Switching to: ${track}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4"></div>
                    <h2 className="text-2xl font-bold text-orange-500">Loading Song...</h2>
                    <p className="text-blue-200/80">Preparing tablature display</p>
                </div>
            </div>
        );
    }

    if (error || !mjtfSong) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Loading Error</h2>
                    <p className="text-red-300 mb-4">{error}</p>
                    <p className="text-yellow-300 mb-4 text-sm">
                        Make sure {selectedTrack}.json exists in: /public/data/sample-songs/real-songs/poison-i-wont-forget-you/
                    </p>
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 text-orange-500">
                        Clean JSON Tab Player
                    </h1>
                    <p className="text-xl text-blue-200/80 mb-4">
                        {mjtfSong.title} by {mjtfSong.artist} - {selectedTrack.replace('-', ' ')}
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
                        <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">
                            No ASCII Parsing
                        </div>
                    </div>
                </div>

                {/* Audio Controller */}
                <WorkingAudioController audioUrl={mjtfSong.audioFile} />

                {/* Track Selection */}
                <div className="bg-gray-800/80 rounded-xl p-6 mb-8 border border-green-500/30">
                    <h2 className="text-2xl font-bold text-green-500 mb-4">Track Selection</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleTrackChange('guitar-1')}
                            className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === 'guitar-1'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                }`}
                        >
                            <div className="font-bold text-lg">Guitar 1 - Lead</div>
                            <div className="text-sm opacity-80 mt-2">
                                Lead guitar with techniques
                            </div>
                        </button>

                        <button
                            onClick={() => handleTrackChange('guitar-2')}
                            className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === 'guitar-2'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                                }`}
                        >
                            <div className="font-bold text-lg">Guitar 2 - Rhythm</div>
                            <div className="text-sm opacity-80 mt-2">
                                Rhythm guitar and chords
                            </div>
                        </button>
                    </div>
                </div>

                {/* Audio Controls */}
                <div className="bg-gray-800/80 rounded-xl p-4 mb-8 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={play}
                                disabled={!state.isLoaded || state.isPlaying}
                                className="px-6 py-3 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 font-bold"
                            >
                                Play
                            </button>

                            <button
                                onClick={pause}
                                disabled={!state.isPlaying}
                                className="px-6 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30 hover:bg-yellow-500/30 disabled:opacity-50 font-bold"
                            >
                                Pause
                            </button>

                            <button
                                onClick={stop}
                                disabled={!state.isLoaded}
                                className="px-6 py-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 font-bold"
                            >
                                Stop
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

                {/* Debug Info */}
                <div className="bg-green-500/20 rounded-xl p-4 mb-6 border border-green-500/30">
                    <h3 className="text-lg font-bold text-green-400 mb-2">Debug Info</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-green-300">Data Source:</span>
                            <div className="text-white font-mono">JSON Direct</div>
                        </div>
                        <div>
                            <span className="text-green-300">Measures:</span>
                            <div className="text-white font-mono">{convertedMeasures.length}</div>
                        </div>
                        <div>
                            <span className="text-green-300">Notes:</span>
                            <div className="text-white font-mono">{convertedMeasures.reduce((total, m) => total + m.notes.length, 0)}</div>
                        </div>
                        <div>
                            <span className="text-green-300">BPM:</span>
                            <div className="text-white font-mono">{mjtfSong.tempo}</div>
                        </div>
                    </div>
                </div>

                {/* Full Scrollable Tab Display */}
                <div className="bg-gray-800/80 rounded-xl p-6 border border-purple-500/30">
                    <h2 className="text-2xl font-bold text-purple-400 mb-4">Full Tablature Sheet</h2>
                    <ScrollingTabDisplay
                        measures={convertedMeasures}
                        songTitle={`${mjtfSong.title} - ${selectedTrack.replace('-', ' ')}`}
                        artist={mjtfSong.artist}
                        bpm={mjtfSong.tempo}
                        timeSignature={parseTimeSignature(mjtfSong.timeSignature)}
                        showCursor={true}
                        autoScroll={true}
                        measuresPerLine={4}
                        stringSpacing={25}
                        staffLineSpacing={200}
                        visibleStaffLines={20}
                        enableVerticalScrollbar={true}
                        className="bg-white rounded-lg shadow-2xl"
                    />
                </div>

                {/* Song Information */}
                <div className="mt-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-orange-500/20 rounded-xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-blue-400 mb-4">Song Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold text-green-400 mb-2">Song Info:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>Title: {mjtfSong.title}</li>
                                <li>Artist: {mjtfSong.artist}</li>
                                <li>BPM: {mjtfSong.tempo}</li>
                                <li>Time: {mjtfSong.timeSignature}</li>
                                <li>Tuning: {mjtfSong.tuning.join('-')}</li>
                                <li>Data Format: Clean JSON</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-orange-400 mb-2">Current Track:</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>Track: {selectedTrack.replace('-', ' ')}</li>
                                <li>Measures: {convertedMeasures.length}</li>
                                <li>Total Notes: {convertedMeasures.reduce((total, m) => total + m.notes.length, 0)}</li>
                                <li>Vertical Scrolling: Enabled</li>
                                <li>Full Sheet Display: Active</li>
                                <li>TabMeasureRenderer: Working</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CleanJSONTestPage() {
    return (
        <PlaybackProvider>
            <MJTFTestContent />
        </PlaybackProvider>
    );
}