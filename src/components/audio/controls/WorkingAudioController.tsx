'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { usePlaybackControls, PlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';

interface WorkingAudioControllerProps {
    audioUrl: string;
}

export const WorkingAudioController: React.FC<WorkingAudioControllerProps> = ({ audioUrl }) => {
    const { updateState, registerControls } = usePlaybackControls();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isInitializedRef = useRef(false);
    const currentUrlRef = useRef<string>('');

    // 🎯 Initialize audio player ONLY when URL changes or first time
    useEffect(() => {
        // Skip if already initialized with same URL
        if (isInitializedRef.current && currentUrlRef.current === audioUrl) {
            console.log('🎵 Skipping re-initialization - same URL');
            return;
        }

        // Clean up previous player if exists
        if (audioRef.current) {
            console.log('🧹 Cleaning up previous player');
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        console.log('🎵 Initializing working player...');

        // Create new audio element
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.volume = 0.8;

        // Set up event listeners BEFORE setting src
        const handleLoadedMetadata = () => {
            console.log('✅ External audio loaded successfully');
            updateState({
                duration: audio.duration,
                isLoaded: true
            });
        };

        const handleTimeUpdate = () => {
            updateState({
                currentTime: audio.currentTime
            });
        };

        const handleEnded = () => {
            updateState({
                isPlaying: false,
                currentTime: 0
            });
        };

        const handlePlay = () => {
            updateState({ isPlaying: true });
        };

        const handlePause = () => {
            updateState({ isPlaying: false });
        };

        const handleError = (e: Event) => {
            console.error('❌ Audio error:', e);
            updateState({
                isPlaying: false,
                isLoaded: false
            });
        };

        // Add all event listeners
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('error', handleError);

        // Set source and store reference
        console.log('🎵 Trying external audio:', audioUrl);
        audio.src = audioUrl;
        audioRef.current = audio;
        currentUrlRef.current = audioUrl;
        isInitializedRef.current = true;

        console.log('✅ Player initialized successfully');

        // Return cleanup function
        return () => {
            if (audio) {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('play', handlePlay);
                audio.removeEventListener('pause', handlePause);
                audio.removeEventListener('error', handleError);
                audio.pause();
                audio.src = '';
            }
        };
    }, [audioUrl, updateState]); // Only depend on audioUrl

    // 🎮 Create control methods that will be registered with the hook
    const createControls = useCallback((): PlaybackControls => ({
        play: () => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for play');
                return;
            }
            console.log('🎮 Hook calling play');
            console.log('▶️ Starting playback from position:', audioRef.current.currentTime);

            audioRef.current.play()
                .then(() => {
                    console.log('✅ Playing!');
                })
                .catch((error) => {
                    console.error('❌ Play failed:', error);
                });
        },

        pause: () => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for pause');
                return;
            }
            console.log('⏸️ Pausing playback');
            audioRef.current.pause();
        },

        stop: () => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for stop');
                return;
            }
            console.log('⏹️ Stopping playback');

            const audio = audioRef.current;

            // ✅ Better approach: Temporarily disable conflicting event handlers
            const originalPause = audio.onpause;
            const originalTimeUpdate = audio.ontimeupdate;

            // Disable handlers that might interfere
            audio.onpause = null;
            audio.ontimeupdate = null;

            // Perform stop operations
            audio.pause();
            audio.currentTime = 0;

            // Immediately force the correct state
            updateState({
                isPlaying: false,
                currentTime: 0
            });

            // Re-enable handlers after state is set
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.onpause = originalPause;
                    audioRef.current.ontimeupdate = originalTimeUpdate;
                }
                console.log('✅ Stop completed, handlers restored');
            }, 50); // Longer delay to ensure state update processes
        },

        toggle: () => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for toggle');
                return;
            }
            if (audioRef.current.paused) {
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        },

        seek: (time: number) => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for seek');
                return;
            }
            console.log('⏭️ Seeking to:', time);
            audioRef.current.currentTime = time;
        },

        setVolume: (volume: number) => {
            if (!audioRef.current) {
                console.error('❌ No audio element available for setVolume');
                return;
            }
            console.log('🔊 Setting volume to:', volume);
            audioRef.current.volume = volume;
            updateState({ volume });
        }
    }), [updateState]);

    // 🎯 Register controls with the hook (only when audio is ready)
    useEffect(() => {
        if (isInitializedRef.current && audioRef.current) {
            const controls = createControls();
            registerControls(controls);
            console.log('🎮 Controls registered with hook');
        }
    }, [createControls, registerControls]);

    // This component doesn't render anything visible
    return null;
};