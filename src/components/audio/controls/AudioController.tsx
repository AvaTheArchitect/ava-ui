import React, { useState, useRef, useEffect } from 'react';

// 🎸 Maestro.ai Guitar Practice Generator - Audio Controller
export interface AudioControllerProps {
    audioUrl?: string;
    onTimeUpdate?: (time: number) => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
    onDurationUpdate?: (duration: number) => void;
}

/**
 * 🎸 Maestro.ai Audio Controller Component - STYLED VERSION
 * Professional audio controls for guitar practice sessions with Maestro.ai colors
 */
export const AudioController: React.FC<AudioControllerProps> = ({
    audioUrl,
    onTimeUpdate,
    onPlaybackStateChange,
    onDurationUpdate
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(0);
    const [isLooping, setIsLooping] = useState(false);
    const [volume, setVolume] = useState(0.8);

    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            const audioDuration = audio.duration;
            setDuration(audioDuration);
            setLoopEnd(audioDuration);
            console.log(`🎵 Audio loaded: ${audioDuration.toFixed(1)}s`);

            // 🔧 TRIGGER CALLBACKS to update parent state
            onTimeUpdate?.(0); // Initialize time
            onDurationUpdate?.(audioDuration); // Update duration
        };

        const handleTimeUpdate = () => {
            const time = audio.currentTime;
            setCurrentTime(time);
            onTimeUpdate?.(time); // 🔧 KEY: Update parent state

            // Handle looping for practice
            if (isLooping && time >= loopEnd) {
                audio.currentTime = loopStart;
            }
        };

        const handleLoadStart = () => {
            console.log('🎵 Audio loading started...');
        };

        const handleCanPlay = () => {
            console.log('🎵 Audio can play - duration:', audio.duration);
        };

        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            audio.removeEventListener('loadstart', handleLoadStart);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [isLooping, loopStart, loopEnd, onTimeUpdate, onDurationUpdate]);

    const togglePlayback = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (isPlaying) {
                audio.pause();
            } else {
                await audio.play();
            }

            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);
            onPlaybackStateChange?.(newPlayingState);
            console.log(`🎮 Playback: ${newPlayingState ? 'Playing' : 'Paused'}`);
        } catch (error) {
            console.error('Error toggling playback:', error);
        }
    };

    const handleSeek = (time: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = time;
        setCurrentTime(time);
    };

    const handlePlaybackRateChange = (rate: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = rate;
        setPlaybackRate(rate);
    };

    const handleVolumeChange = (newVolume: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = newVolume;
        setVolume(newVolume);
    };

    const handleStop = () => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        onPlaybackStateChange?.(false);
        onTimeUpdate?.(0);
        console.log('🛑 Audio stopped');
    };

    const setLoopRegion = (start: number, end: number) => {
        setLoopStart(start);
        setLoopEnd(end);
    };

    const formatTime = (time: number): string => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full bg-gradient-to-br from-gray-800/90 to-purple-800/90 rounded-xl p-6 border border-orange-500/40">
            <audio ref={audioRef} src={audioUrl} />

            {/* 🎮 Main Playback Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
                {/* Stop Button */}
                <button
                    onClick={handleStop}
                    className="flex items-center justify-center w-12 h-12 rounded-full text-xl
                               transition-all duration-300 transform hover:scale-110
                               bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700
                               text-white shadow-lg hover:shadow-xl"
                >
                    ⏹️
                </button>

                {/* Play/Pause Button */}
                <button
                    onClick={togglePlayback}
                    className={`
                        flex items-center justify-center w-16 h-16 rounded-full text-3xl
                        transition-all duration-300 transform hover:scale-110
                        ${isPlaying
                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                        }
                        text-white shadow-lg hover:shadow-xl
                    `}
                >
                    {isPlaying ? '⏸️' : '▶️'}
                </button>

                {/* Fast Forward */}
                <button
                    onClick={() => handleSeek(Math.min(currentTime + 10, duration))}
                    className="flex items-center justify-center w-12 h-12 rounded-full text-xl
                               transition-all duration-300 transform hover:scale-110
                               bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                               text-white shadow-lg hover:shadow-xl"
                >
                    ⏩
                </button>

                <div className="text-center ml-4">
                    <div className="text-2xl font-mono font-bold text-white mb-1">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    <div className="text-sm text-blue-200 font-bold">
                        Speed: <span className="text-orange-400">{playbackRate}x</span> |
                        Volume: <span className="text-emerald-400">{Math.round(volume * 100)}%</span>
                    </div>
                </div>
            </div>

            {/* 🎚️ Progress Bar */}
            <div className="mb-6">
                <div className="text-sm text-blue-200 mb-2 font-bold">🎵 Audio Progress</div>
                <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r 
                               [&::-webkit-slider-thumb]:from-orange-400 [&::-webkit-slider-thumb]:to-orange-600
                               [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                               [&::-webkit-slider-track]:bg-gray-700 [&::-webkit-slider-track]:rounded-lg"
                />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                    <span>0:00</span>
                    <span className="text-orange-400 font-bold">
                        {duration > 0 ? `${Math.round((currentTime / duration) * 100)}%` : '0%'}
                    </span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 🎛️ Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Speed Control */}
                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg p-4 border border-purple-500/30">
                    <label className="block text-sm font-bold text-blue-200 mb-3">
                        🏃‍♂️ Practice Speed: {playbackRate}x
                    </label>
                    <input
                        type="range"
                        min={0.25}
                        max={2}
                        step={0.25}
                        value={playbackRate}
                        onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r 
                                   [&::-webkit-slider-thumb]:from-purple-400 [&::-webkit-slider-thumb]:to-purple-600
                                   [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0.25x</span>
                        <span>1x</span>
                        <span>2x</span>
                    </div>
                </div>

                {/* Volume Control */}
                <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-lg p-4 border border-emerald-500/30">
                    <label className="block text-sm font-bold text-blue-200 mb-3">
                        🔊 Volume: {Math.round(volume * 100)}%
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.1}
                        value={volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r 
                                   [&::-webkit-slider-thumb]:from-emerald-400 [&::-webkit-slider-thumb]:to-emerald-600
                                   [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* 🔁 Loop Controls */}
            <div className="mt-6 bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-lg p-4 border border-orange-500/30">
                <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 text-blue-200 font-bold">
                        <input
                            type="checkbox"
                            checked={isLooping}
                            onChange={(e) => setIsLooping(e.target.checked)}
                            className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-white">🔁 Practice Loop</span>
                    </label>

                    <button
                        onClick={() => setLoopRegion(currentTime, currentTime + 10)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm 
                                   rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-bold"
                    >
                        Set Loop Here
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-blue-200 mb-1 font-bold">Loop Start (seconds)</label>
                        <input
                            type="number"
                            value={Math.floor(loopStart)}
                            onChange={(e) => setLoopStart(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-orange-500/30 focus:border-orange-500"
                            min="0"
                            max={duration}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-blue-200 mb-1 font-bold">Loop End (seconds)</label>
                        <input
                            type="number"
                            value={Math.floor(loopEnd)}
                            onChange={(e) => setLoopEnd(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-orange-500/30 focus:border-orange-500"
                            min="0"
                            max={duration}
                        />
                    </div>
                </div>
            </div>

            {/* 📊 Status Indicators */}
            <div className="mt-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-blue-200">
                        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                        {isPlaying ? 'Playing' : 'Paused'}
                    </span>
                    <span className="flex items-center gap-1 text-blue-200">
                        <div className={`w-2 h-2 rounded-full ${isLooping ? 'bg-orange-400 animate-pulse' : 'bg-gray-500'}`} />
                        {isLooping ? 'Loop ON' : 'Loop OFF'}
                    </span>
                </div>

                <div className="text-orange-400 font-mono font-bold">
                    Maestro.ai Audio Engine
                </div>
            </div>
        </div>
    );
};

export const PlaybackControls: React.FC<{
    isPlaying: boolean;
    onPlay: () => void;
    onPause: () => void;
    onStop: () => void;
    onRewind: () => void;
    onFastForward: () => void;
}> = ({ isPlaying, onPlay, onPause, onStop, onRewind, onFastForward }) => {
    return (
        <div className="flex justify-center gap-4 bg-gradient-to-r from-gray-800 to-purple-800 rounded-lg p-4">
            <button
                onClick={onRewind}
                className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
                ⏪
            </button>
            <button
                onClick={isPlaying ? onPause : onPlay}
                className={`p-3 text-white rounded-lg transition-all ${isPlaying
                        ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                    }`}
            >
                {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
                onClick={onStop}
                className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all"
            >
                ⏹️
            </button>
            <button
                onClick={onFastForward}
                className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
                ⏩
            </button>
        </div>
    );
};