import React, { useState, useRef, useEffect } from 'react';
import { startAudioAnimationLoop, FFTResult, SpectralFeatures, HarmonicAnalysis, OnsetDetection } from '@brain/shared/audioSyncUtils';

export interface AudioControllerProps {
    audioUrl?: string;
    onTimeUpdate?: (time: number) => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
    onAudioAnalysis?: (data: {
        spectralData?: FFTResult;
        spectralFeatures?: SpectralFeatures;
        harmonicData?: HarmonicAnalysis;
        onsetData?: OnsetDetection;
    }) => void;
}

export const AudioController: React.FC<AudioControllerProps> = ({
    audioUrl,
    onTimeUpdate,
    onPlaybackStateChange,
    onAudioAnalysis
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [loopStart, setLoopStart] = useState(0);
    const [loopEnd, setLoopEnd] = useState(0);
    const [isLooping, setIsLooping] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameRef = useRef<(() => void) | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

    // Initialize Web Audio API
    useEffect(() => {
        const initWebAudio = async () => {
            const audio = audioRef.current;
            if (!audio || audioContextRef.current) return;

            try {
                // Create AudioContext
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

                // Create source node from audio element
                sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);

                // Create analyser node
                analyserNodeRef.current = audioContextRef.current.createAnalyser();
                analyserNodeRef.current.fftSize = 2048;
                analyserNodeRef.current.smoothingTimeConstant = 0.8;

                // Connect: source -> analyser -> destination
                sourceNodeRef.current.connect(analyserNodeRef.current);
                analyserNodeRef.current.connect(audioContextRef.current.destination);

                console.log('🎵 Web Audio API initialized');
            } catch (error) {
                console.error('Failed to initialize Web Audio API:', error);
            }
        };

        if (audioUrl) {
            initWebAudio();
        }

        return () => {
            // Cleanup Web Audio API
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [audioUrl]);

    // Connect to Brain audioSync when playing
    useEffect(() => {
        if (isPlaying && analyserNodeRef.current && audioContextRef.current) {
            // Start the Brain-powered animation loop with advanced analysis
            const stopAnimation = startAudioAnimationLoop({
                fps: 60,
                analyzerNode: analyserNodeRef.current,
                audioContext: audioContextRef.current,
                enableAdvancedAnalysis: true, // Enable pitch detection, etc.

                onFrame: (audioData, timestamp) => {
                    // Basic audio data callback - 60fps while playing
                    if (audioRef.current) {
                        const currentTime = audioRef.current.currentTime;
                        console.log(`🎵 Audio frame: ${currentTime.toFixed(2)}s`);

                        // Future: Send to MaestroBrain for coordination
                        // Future: Update tab cursor, fret highlights, etc.
                    }
                },

                onSpectralData: (spectralData) => {
                    // Real-time frequency analysis
                    onAudioAnalysis?.({ spectralData });
                },

                onSpectralFeatures: (features) => {
                    // Advanced spectral features (brightness, rolloff, etc.)
                    onAudioAnalysis?.({ spectralFeatures: features });
                },

                onHarmonicData: (harmonics) => {
                    // Harmonic analysis for pitch detection
                    onAudioAnalysis?.({ harmonicData: harmonics });
                },

                onOnsetData: (onsets) => {
                    // Beat/onset detection for rhythm analysis
                    onAudioAnalysis?.({ onsetData: onsets });
                }
            });

            animationFrameRef.current = stopAnimation;

        } else if (animationFrameRef.current) {
            // Stop animation when paused
            animationFrameRef.current();
            animationFrameRef.current = null;
        }

        // Cleanup on unmount
        return () => {
            if (animationFrameRef.current) {
                animationFrameRef.current();
            }
        };
    }, [isPlaying, onAudioAnalysis]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setLoopEnd(audio.duration);
        };

        const handleTimeUpdate = () => {
            const time = audio.currentTime;
            setCurrentTime(time);
            onTimeUpdate?.(time);

            // Handle looping
            if (isLooping && time >= loopEnd) {
                audio.currentTime = loopStart;
            }
        };

        const handlePlay = () => {
            // Resume AudioContext if suspended (required for some browsers)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('play', handlePlay);
        };
    }, [isLooping, loopStart, loopEnd, onTimeUpdate]);

    const togglePlayback = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        try {
            if (isPlaying) {
                audio.pause();
            } else {
                // Resume AudioContext if needed
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }
                await audio.play();
            }

            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);
            onPlaybackStateChange?.(newPlayingState);
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
        <div className="audio-controller">
            <audio
                ref={audioRef}
                src={audioUrl}
                crossOrigin="anonymous" // Required for Web Audio API
            />

            <div className="playback-controls">
                <button onClick={togglePlayback}>
                    {isPlaying ? '⏸️' : '▶️'}
                </button>

                <div className="time-display">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>

            <div className="progress-bar">
                <input
                    type="range"
                    min={0}
                    max={duration}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="progress-slider"
                />
            </div>

            <div className="speed-control">
                <label>Speed: {playbackRate}x</label>
                <input
                    type="range"
                    min={0.25}
                    max={2}
                    step={0.25}
                    value={playbackRate}
                    onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                />
            </div>

            <div className="loop-controls">
                <label>
                    <input
                        type="checkbox"
                        checked={isLooping}
                        onChange={(e) => setIsLooping(e.target.checked)}
                    />
                    Loop
                </label>

                <div className="loop-region">
                    <input
                        type="number"
                        value={Math.floor(loopStart)}
                        onChange={(e) => setLoopStart(Number(e.target.value))}
                        placeholder="Start (s)"
                    />
                    <input
                        type="number"
                        value={Math.floor(loopEnd)}
                        onChange={(e) => setLoopEnd(Number(e.target.value))}
                        placeholder="End (s)"
                    />
                </div>

                <button onClick={() => setLoopRegion(currentTime, currentTime + 10)}>
                    Set Loop Here
                </button>
            </div>

            {/* Audio Analysis Debug Info (can be removed in production) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="audio-debug" style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                    <div>Web Audio: {audioContextRef.current ? '✅' : '❌'}</div>
                    <div>Analyzer: {analyserNodeRef.current ? '✅' : '❌'}</div>
                    <div>Animation: {animationFrameRef.current ? '🎬' : '⏸️'}</div>
                </div>
            )}
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
        <div className="playback-controls">
            <button onClick={onRewind}>⏪</button>
            <button onClick={isPlaying ? onPause : onPlay}>
                {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button onClick={onStop}>⏹️</button>
            <button onClick={onFastForward}>⏩</button>
        </div>
    );
};