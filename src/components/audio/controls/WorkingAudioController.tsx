'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { usePlaybackControls, PlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';

interface WorkingAudioControllerProps {
    audioUrl: string;
}

export const WorkingAudioController: React.FC<WorkingAudioControllerProps> = ({ audioUrl }) => {
    const { updateState, registerControls } = usePlaybackControls();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentUrlRef = useRef<string>('');
    const isInitializingRef = useRef<boolean>(false);
    const lastTimeUpdateRef = useRef<number>(0);

    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isControlsRegistered, setIsControlsRegistered] = useState(false);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    // Debug logger
    const addDebugLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(`🔍 AudioController: ${logEntry}`);
        setDebugLog(prev => [...prev.slice(-10), logEntry]); // Keep last 10 entries
    }, []);

    // 🔧 SMOOTH: Initialize audio player with smooth time updates
    const initializeAudio = useCallback((url: string) => {
        if (isInitializingRef.current) {
            addDebugLog('⚠️ Already initializing, skipping');
            return () => { };
        }

        isInitializingRef.current = true;
        addDebugLog(`🎵 Starting SMOOTH initialization with URL: ${url}`);

        // Clean up previous player
        if (audioRef.current) {
            addDebugLog('🧹 Cleaning up previous audio element');
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }

        // Reset states
        setIsAudioReady(false);
        setIsControlsRegistered(false);
        lastTimeUpdateRef.current = 0;

        // Update initial state
        updateState({
            isLoaded: false,
            isPlaying: false,
            currentTime: 0,
            duration: 0
        });

        // Create new audio element
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.volume = 0.8;
        audio.crossOrigin = 'anonymous';

        addDebugLog('✅ Created new Audio element');

        // 🎯 Event Handlers with SMOOTH time updates
        const handleLoadedMetadata = () => {
            addDebugLog(`✅ SMOOTH: Metadata loaded - Duration: ${audio.duration}s`);

            if (!isNaN(audio.duration) && audio.duration > 0) {
                updateState({
                    duration: audio.duration,
                    isLoaded: true
                });

                setIsAudioReady(true);
                addDebugLog(`✅ SMOOTH: Audio ready set to true`);
            } else {
                addDebugLog(`❌ Invalid duration: ${audio.duration}`);
            }
        };

        // 🔧 FIXED: Remove throttling for smooth updates
        const handleTimeUpdate = () => {
            const currentTime = audio.currentTime;

            // Only update if time actually changed (prevents excessive identical updates)
            if (Math.abs(currentTime - lastTimeUpdateRef.current) > 0.05) { // 50ms precision
                updateState({
                    currentTime: currentTime
                });
                lastTimeUpdateRef.current = currentTime;

                // Debug time updates occasionally
                if (Math.floor(currentTime * 4) % 10 === 0) { // Every 2.5 seconds
                    addDebugLog(`⏰ Time: ${currentTime.toFixed(2)}s`);
                }
            }
        };

        const handlePlay = () => {
            addDebugLog('▶️ SMOOTH: Playing');
            updateState({ isPlaying: true });
        };

        const handlePause = () => {
            addDebugLog('⏸️ SMOOTH: Paused');
            updateState({ isPlaying: false });
        };

        const handleEnded = () => {
            addDebugLog('🏁 SMOOTH: Ended');
            updateState({
                isPlaying: false,
                currentTime: 0
            });
        };

        const handleError = (e: Event) => {
            const target = e.target as HTMLAudioElement;
            addDebugLog(`❌ SMOOTH: Error - ${target.error?.message}`);
            updateState({
                isPlaying: false,
                isLoaded: false
            });
            setIsAudioReady(false);
        };

        // Add essential event listeners
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Set source and store reference
        audioRef.current = audio;
        currentUrlRef.current = url;

        // Load the audio
        addDebugLog('🎵 SMOOTH: Setting src and loading');
        audio.src = url;
        audio.load();

        // Mark initialization complete
        isInitializingRef.current = false;
        addDebugLog('✅ SMOOTH: Initialization complete');

        // Return cleanup function
        return () => {
            addDebugLog('🧹 SMOOTH: Cleanup function called');
            if (audio) {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('play', handlePlay);
                audio.removeEventListener('pause', handlePause);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('error', handleError);
                audio.pause();
                audio.src = '';
            }
            isInitializingRef.current = false;
        };
    }, [updateState, addDebugLog]);

    // 🔧 Initialize only when truly needed
    useEffect(() => {
        if (!audioUrl) {
            addDebugLog('❌ No audio URL provided');
            return;
        }

        const needsInit = currentUrlRef.current !== audioUrl || !audioRef.current || !isAudioReady;

        if (!needsInit) {
            addDebugLog('⏭️ SMOOTH: No initialization needed');
            return;
        }

        addDebugLog(`🔄 SMOOTH: URL or state changed - Need init: ${needsInit}`);
        const cleanup = initializeAudio(audioUrl);
        return cleanup;
    }, [audioUrl, initializeAudio]);

    // 🎮 Create control methods
    const createControls = useCallback((): PlaybackControls => ({
        play: async () => {
            if (!audioRef.current) {
                addDebugLog('❌ No audio element for play');
                return;
            }

            addDebugLog('🎮 PLAY command');
            try {
                await audioRef.current.play();
                addDebugLog('✅ Play successful');
            } catch (error) {
                addDebugLog(`❌ Play failed: ${error}`);
            }
        },

        pause: () => {
            if (!audioRef.current) {
                addDebugLog('❌ No audio element for pause');
                return;
            }
            addDebugLog('🎮 PAUSE command');
            audioRef.current.pause();
        },

        stop: () => {
            if (!audioRef.current) {
                addDebugLog('❌ No audio element for stop');
                return;
            }

            addDebugLog('🎮 STOP command');
            const audio = audioRef.current;
            audio.pause();
            audio.currentTime = 0;

            updateState({
                isPlaying: false,
                currentTime: 0
            });
        },

        toggle: () => {
            if (!audioRef.current) return;
            if (audioRef.current.paused) {
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        },

        seek: (time: number) => {
            if (!audioRef.current) return;
            addDebugLog(`🎮 SEEK to ${time}s`);
            audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration));
        },

        setVolume: (volume: number) => {
            if (!audioRef.current) return;
            const clampedVolume = Math.max(0, Math.min(1, volume));
            audioRef.current.volume = clampedVolume;
            updateState({ volume: clampedVolume });
        }
    }), [updateState, addDebugLog]);

    // 🔧 Register controls only once when ready
    useEffect(() => {
        if (isAudioReady && !isControlsRegistered && audioRef.current) {
            addDebugLog('🎮 SMOOTH: Registering controls');

            const controls = createControls();
            registerControls(controls);
            setIsControlsRegistered(true);
            addDebugLog('✅ SMOOTH: Controls registered');
        }
    }, [isAudioReady, isControlsRegistered, createControls, registerControls, addDebugLog]);

    // Render debug info
    return (
        <div className="bg-cyan-500/20 rounded-xl p-4 mb-4 border border-cyan-500/30">
            <h3 className="text-cyan-400 font-bold mb-2">🔍 SMOOTH Audio Controller</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-cyan-300 font-semibold mb-1">Status:</h4>
                    <div className="text-xs text-cyan-100 space-y-1 font-mono">
                        <div>URL: {audioUrl}</div>
                        <div>Ready: {isAudioReady ? '✅' : '❌'}</div>
                        <div>Registered: {isControlsRegistered ? '✅' : '❌'}</div>
                        <div>Element: {audioRef.current ? '✅' : '❌'}</div>
                        <div>Duration: {audioRef.current?.duration?.toFixed(1) || 0}s</div>
                        <div>Last Update: {lastTimeUpdateRef.current.toFixed(2)}s</div>
                    </div>
                </div>
                <div>
                    <h4 className="text-cyan-300 font-semibold mb-1">Recent Logs:</h4>
                    <div className="text-xs text-cyan-100 space-y-1 font-mono max-h-24 overflow-y-auto">
                        {debugLog.slice(-5).map((log, index) => (
                            <div key={index}>{log}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Manual Test Buttons with Timing Tests */}
            <div className="mt-3 flex gap-2 flex-wrap">
                <button
                    onClick={() => audioRef.current?.play()}
                    className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs"
                >
                    🎮 Direct Play
                </button>
                <button
                    onClick={() => audioRef.current?.pause()}
                    className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs"
                >
                    🎮 Direct Pause
                </button>
                <button
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = 10;
                            addDebugLog(`Manual seek to 10s`);
                        }
                    }}
                    className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                >
                    🎮 Seek 10s
                </button>
                <button
                    onClick={() => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = 30;
                            addDebugLog(`Manual seek to 30s`);
                        }
                    }}
                    className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs"
                >
                    🎮 Seek 30s
                </button>
                <button
                    onClick={() => {
                        addDebugLog(`Current audio time: ${audioRef.current?.currentTime}s`);
                        console.log('Audio Debug:', {
                            currentTime: audioRef.current?.currentTime,
                            duration: audioRef.current?.duration,
                            paused: audioRef.current?.paused,
                            readyState: audioRef.current?.readyState
                        });
                    }}
                    className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs"
                >
                    📊 Log Audio State
                </button>
            </div>
        </div>
    );
};