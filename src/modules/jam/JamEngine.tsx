'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AudioTrack {
    id: string;
    name: string;
    volume: number;
    muted: boolean;
    solo: boolean;
}

export default function JamEngine() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [masterVolume, setMasterVolume] = useState(75);
    const [bpm, setBpm] = useState(120);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Audio tracks for multi-track jamming
    const [tracks, setTracks] = useState<AudioTrack[]>([
        { id: '1', name: 'Guitar', volume: 80, muted: false, solo: false },
        { id: '2', name: 'Bass', volume: 70, muted: false, solo: false },
        { id: '3', name: 'Drums', volume: 85, muted: false, solo: false },
        { id: '4', name: 'Keys', volume: 60, muted: false, solo: false },
    ]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const animationRef = useRef<number>();

    // Simulate audio progress
    useEffect(() => {
        if (isPlaying) {
            const updateTime = () => {
                setCurrentTime(prev => {
                    const newTime = prev + 0.1;
                    return newTime >= duration ? 0 : newTime;
                });
                animationRef.current = requestAnimationFrame(updateTime);
            };
            animationRef.current = requestAnimationFrame(updateTime);
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, duration]);

    // Set duration on mount
    useEffect(() => {
        setDuration(180); // 3 minutes for demo
    }, []);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        if (!isRecording) {
            console.log('🎤 Recording started...');
        } else {
            console.log('🛑 Recording stopped');
        }
    };

    const updateTrackVolume = (trackId: string, volume: number) => {
        setTracks(tracks.map(track =>
            track.id === trackId ? { ...track, volume } : track
        ));
    };

    const toggleMute = (trackId: string) => {
        setTracks(tracks.map(track =>
            track.id === trackId ? { ...track, muted: !track.muted } : track
        ));
    };

    const toggleSolo = (trackId: string) => {
        setTracks(tracks.map(track =>
            track.id === trackId ? { ...track, solo: !track.solo } : track
        ));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 rounded-2xl p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-cyan-400 flex items-center gap-2">
                    🎸 Live Jam Engine
                    {isRecording && <span className="animate-pulse text-red-400 text-lg">🔴 REC</span>}
                </h2>

                {/* Status Indicators */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-sm">{isPlaying ? 'Playing' : 'Stopped'}</span>
                    </div>
                    <div className="bg-white/10 rounded-lg px-3 py-1">
                        <span className="text-sm font-mono">{bpm} BPM</span>
                    </div>
                </div>
            </div>

            {/* Transport Controls */}
            <div className="bg-white/5 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                    {/* Record Button */}
                    <button
                        onClick={toggleRecording}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-105 ${isRecording
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                : 'bg-white/20 hover:bg-red-500 text-white'
                            }`}
                    >
                        ⏺️
                    </button>

                    {/* Play/Pause Button */}
                    <button
                        onClick={togglePlay}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white flex items-center justify-center text-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/40"
                    >
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>

                    {/* Stop Button */}
                    <button
                        onClick={() => {
                            setIsPlaying(false);
                            setCurrentTime(0);
                        }}
                        className="w-12 h-12 rounded-full bg-white/20 hover:bg-orange-500 text-white flex items-center justify-center font-bold transition-all duration-300 hover:scale-105"
                    >
                        ⏹️
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-blue-200/70">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 border border-white/20">
                        <div
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-100 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Master Controls */}
                <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-blue-200/70">MASTER</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-200/50">🔊</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={masterVolume}
                                onChange={(e) => setMasterVolume(Number(e.target.value))}
                                className="w-24"
                            />
                            <span className="text-xs text-blue-200/70 w-8">{masterVolume}%</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-blue-200/70">TEMPO</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setBpm(Math.max(60, bpm - 5))}
                                className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-all duration-300"
                            >
                                -5
                            </button>
                            <span className="font-mono text-sm w-12 text-center">{bpm}</span>
                            <button
                                onClick={() => setBpm(Math.min(200, bpm + 5))}
                                className="bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-all duration-300"
                            >
                                +5
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Multi-Track Mixer */}
            <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                    🎛️ Live Mixer
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tracks.map((track) => (
                        <div key={track.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                            {/* Track Name */}
                            <div className="text-center mb-3">
                                <h4 className="font-semibold text-white">{track.name}</h4>
                            </div>

                            {/* Volume Slider */}
                            <div className="mb-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={track.volume}
                                    onChange={(e) => updateTrackVolume(track.id, Number(e.target.value))}
                                    className="w-full h-2 bg-white/20 rounded-lg appearance-none slider"
                                    style={{
                                        background: `linear-gradient(to right, #00f5ff 0%, #00f5ff ${track.volume}%, rgba(255,255,255,0.2) ${track.volume}%, rgba(255,255,255,0.2) 100%)`
                                    }}
                                />
                                <div className="text-center text-xs text-blue-200/70 mt-1">
                                    {track.volume}%
                                </div>
                            </div>

                            {/* Track Controls */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleMute(track.id)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${track.muted
                                            ? 'bg-red-500 text-white'
                                            : 'bg-white/20 hover:bg-white/30 text-blue-200'
                                        }`}
                                >
                                    {track.muted ? 'MUTED' : 'MUTE'}
                                </button>
                                <button
                                    onClick={() => toggleSolo(track.id)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${track.solo
                                            ? 'bg-yellow-500 text-black'
                                            : 'bg-white/20 hover:bg-white/30 text-blue-200'
                                        }`}
                                >
                                    {track.solo ? 'SOLO' : 'SOLO'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Beta Notice */}
            <div className="mt-6 bg-orange-500/20 border border-orange-400/50 rounded-lg p-4">
                <p className="text-orange-200 text-sm flex items-center gap-2">
                    🚀 <strong>Beta Feature:</strong> Real-time audio processing, live input monitoring, and AI-powered jamming features coming soon!
                </p>
            </div>

            {/* Hidden audio element for future real audio */}
            <audio ref={audioRef} />
        </div>
    );
}