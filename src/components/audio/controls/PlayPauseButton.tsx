'use client';

import React, { useState, useCallback } from 'react';
import * as Tone from 'tone';

// 🎵 PlayPauseButton Props Interface
interface PlayPauseButtonProps {
    /** Optional audio source URL or file */
    audioSource?: string;
    /** Callback when play state changes */
    onPlayStateChange?: (isPlaying: boolean) => void;
    /** Custom styling classes */
    className?: string;
    /** Button size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Disabled state */
    disabled?: boolean;
}

// 🎵 PlayPauseButton Component
export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
    audioSource,
    onPlayStateChange,
    className = '',
    size = 'md',
    disabled = false,
}) => {
    // 🎶 State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [player, setPlayer] = useState<Tone.Player | null>(null);

    // 🎯 Size Variants
    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-12 h-12 text-lg',
        lg: 'w-16 h-16 text-xl',
    };

    // 🎵 Initialize Audio Context (required for Tone.js)
    const initializeAudio = useCallback(async () => {
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log('🎵 Audio context started');
        }
    }, []);

    // ▶️ Play Function
    const handlePlay = useCallback(async () => {
        try {
            setIsLoading(true);
            await initializeAudio();

            if (audioSource && !player) {
                // Create new player with audio source
                const newPlayer = new Tone.Player({
                    url: audioSource,
                    autostart: false,
                    onload: () => {
                        console.log('🎵 Audio loaded successfully');
                        setIsLoading(false);
                    },
                }).toDestination();

                setPlayer(newPlayer);
                await Tone.loaded();
                newPlayer.start();
            } else if (player) {
                // Resume existing player
                player.start();
            } else {
                // No audio source - just toggle state for visual feedback
                console.log('🎵 Play button pressed (no audio source)');
                setIsLoading(false);
            }

            setIsPlaying(true);
            onPlayStateChange?.(true);
        } catch (error) {
            console.error('❌ Error playing audio:', error);
            setIsLoading(false);
        }
    }, [audioSource, player, initializeAudio, onPlayStateChange]);

    // ⏸️ Pause Function
    const handlePause = useCallback(() => {
        try {
            if (player) {
                player.stop();
            }

            setIsPlaying(false);
            onPlayStateChange?.(false);
            console.log('⏸️ Audio paused');
        } catch (error) {
            console.error('❌ Error pausing audio:', error);
        }
    }, [player, onPlayStateChange]);

    // 🎯 Main Click Handler
    const handleClick = useCallback(async () => {
        if (disabled || isLoading) return;

        if (isPlaying) {
            handlePause();
        } else {
            await handlePlay();
        }
    }, [disabled, isLoading, isPlaying, handlePause, handlePlay]);

    // 🎨 Dynamic Classes
    const buttonClasses = `
    ${sizeClasses[size]}
    flex items-center justify-center
    rounded-full
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    ${disabled || isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isPlaying
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
        }
    ${className}
  `.trim();

    return (
        <button
            onClick={handleClick}
            disabled={disabled || isLoading}
            className={buttonClasses}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause Audio' : 'Play Audio'}
        >
            {isLoading ? (
                // 🔄 Loading Spinner
                <div className="animate-spin rounded-full border-2 border-white border-t-transparent w-1/2 h-1/2"></div>
            ) : isPlaying ? (
                // ⏸️ Pause Icon
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-1/2 h-1/2">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
            ) : (
                // ▶️ Play Icon
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-1/2 h-1/2 ml-0.5">
                    <path d="M8 5v14l11-7z" />
                </svg>
            )}
        </button>
    );
};

// 🎵 Default Export
export default PlayPauseButton;