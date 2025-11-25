'use client';

/**
 * YouTube Player Component - November 24th, 2025 - V94.2.1
 * 
 * 🐛 FIXED IN V94.2.1:
 * ✅ Infinite buffering wheel when seeking while paused
 * ✅ Now waits for buffering to complete before pausing
 * ✅ Recursive check prevents pausing during buffering state
 * ✅ All ESLint warnings resolved (removed unused error vars)
 * 
 * 🎯 CRITICAL FIX IN V94.2:
 * ✅ Tracks user's INTENDED playback state separately from YouTube's actual state
 * ✅ Prevents auto-play bug on second/subsequent seeks
 * ✅ Fixes buffering state transition issues
 * 
 * 🎯 OPTIMIZED IN V94.1.1:
 * ✅ Reduced timeout from 100ms → 50ms (faster response)
 * ✅ Uses allowSeekAhead=false when paused (less buffering)
 * ✅ Only pauses if video actually started playing
 * ✅ Minimizes loading spinner delay
 * 
 * 🐛 FIXED IN V94.1:
 * ✅ Prevents auto-play after seeking when paused
 * ✅ Checks player state before seeking
 * ✅ Ensures video stays paused after cursor click
 * 
 * 🔒 PRESERVED FROM V94:
 * ✅ Embedded YouTube player for "original" audio source
 * ✅ Positioned lower-right, above bottom transport bar
 * ✅ Syncs with AlphaTab playback position
 * ✅ Video variant switching
 * ✅ Based on Songsterr's implementation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// YouTube IFrame API types
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface YouTubePlayerProps {
    videoId: string;
    isVisible: boolean;
    onClose: () => void;
    currentTime: number;        // AlphaTab time (ms)
    isPlaying: boolean;          // AlphaTab playing state
    onTimeUpdate: (time: number) => void; // Callback when YouTube seeks
    isMobileLandscape?: boolean;
    videoVariants?: {            // Available video variants
        main?: string;
        backing?: string;
        solo?: string;
        playthrough?: string;
    };
    onVariantChange?: (videoId: string) => void; // Callback when variant changes
    videoStartOffset?: number;   // 🆕 Video start offset in seconds (like ?t=4)
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
    videoId,
    isVisible,
    onClose,
    currentTime,
    isPlaying,
    onTimeUpdate,
    isMobileLandscape = false,
    videoVariants,
    onVariantChange,
    videoStartOffset = 0, // 🆕 Default to 0 if not provided
}) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<'main' | 'backing' | 'solo' | 'playthrough'>('main');
    const lastSyncTimeRef = useRef<number>(0);
    const isSyncingRef = useRef<boolean>(false);

    // 🎯 V94.2: Track user's INTENDED playback state (separate from YouTube's actual state)
    // This prevents auto-play bugs when YouTube buffers during seeking
    const userIntendedPlayingRef = useRef<boolean>(false);

    // Load YouTube IFrame API
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            setIsAPIReady(true);
            return;
        }

        // Load API script
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        // API ready callback
        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ V94.2: YouTube IFrame API Ready');
            setIsAPIReady(true);
        };

        return () => {
            window.onYouTubeIframeAPIReady = () => { };
        };
    }, []);

    // Initialize YouTube player (ONLY when video changes or visibility changes)
    useEffect(() => {
        if (!isAPIReady || !isVisible || !containerRef.current) return;

        console.log(`🎬 V94.2: Initializing YouTube player: ${videoId}`);
        if (videoStartOffset > 0) {
            console.log(`⏱️ V94.2: Video start offset: ${videoStartOffset}s (measure 1 = ${videoStartOffset}s in video)`);
        }

        playerRef.current = new window.YT.Player(containerRef.current, {
            videoId: videoId,
            width: '100%',
            height: '100%',
            playerVars: {
                // 🎯 SONGSTERR CONFIGURATION (exact match)
                autoplay: 0,
                controls: 0,        // ← Hide YouTube controls (Songsterr uses this)
                disablekb: 1,       // ← Disable keyboard shortcuts
                showinfo: 0,
                rel: 0,
                modestbranding: 0,
                fs: 0,              // ← Disable fullscreen button
                cc_load_policy: 0,  // No captions
                iv_load_policy: 3,  // No annotations
                enablejsapi: 1,     // ← CRITICAL for API control
                start: videoStartOffset, // 🆕 Start at offset (like ?t=4)

                // 🆕 CRITICAL CORS PARAMETERS (from Songsterr)
                widgetid: 1,        // Widget identifier (Songsterr uses 4)
                origin: window.location.origin,
                // Note: forigin requires full page URL, might need to add later
            },
            events: {
                onReady: (event: any) => {
                    console.log('✅ V94.2: YouTube player ready');

                    // 🆕 Apply offset on initialization
                    if (videoStartOffset > 0) {
                        console.log(`⏱️ V94.2: Seeking to offset: ${videoStartOffset}s`);
                        event.target.seekTo(videoStartOffset, true);
                    }
                },
                onStateChange: (event: any) => {
                    // 🆕 BIDIRECTIONAL SYNC: YouTube state → AlphaTab
                    const state = event.data;
                    console.log(`🎬 V94.2: YouTube state: ${state}`);

                    // State codes: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)

                    // This will be handled by the play/pause sync effect
                    // We'll add a separate effect for monitoring YouTube time
                },
            },
        });

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                console.log('🗑️ V94.2: Destroying YouTube player');
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [isAPIReady, isVisible, videoId, videoStartOffset]); // ✅ Re-init if offset changes

    // Sync play/pause with AlphaTab (ONLY when isPlaying changes)
    useEffect(() => {
        if (!playerRef.current || !playerRef.current.playVideo) return;

        // 🎯 V94.2: Update user's intended state
        userIntendedPlayingRef.current = isPlaying;

        try {
            if (isPlaying) {
                console.log('▶️ V94.2: YouTube play (user intended)');
                playerRef.current.playVideo();
            } else {
                console.log('⏸️ V94.2: YouTube pause (user intended)');
                playerRef.current.pauseVideo();
            }
        } catch {
            // YouTube player not initialized yet - ignore
        }
    }, [isPlaying]); // ✅ Only trigger when isPlaying changes

    // 🆕 BIDIRECTIONAL SYNC: Monitor YouTube time continuously
    useEffect(() => {
        if (!playerRef.current || !playerRef.current.getCurrentTime) return;

        // Poll YouTube time every 100ms to keep AlphaTab in sync
        const interval = setInterval(() => {
            try {
                const ytTime = playerRef.current.getCurrentTime();

                // 🆕 APPLY OFFSET: YouTube time (absolute) → AlphaTab time (relative to measure 1)
                // If video has 4s intro, YouTube reports 4.0s but AlphaTab should be at 0.0s
                const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                const ytTimeMs = adjustedTime * 1000;

                // Notify parent of YouTube's time (for AlphaTab sync)
                onTimeUpdate(ytTimeMs);
            } catch {
                // Player not ready yet - ignore
            }
        }, 100); // Poll every 100ms for smooth sync

        return () => clearInterval(interval);
    }, [onTimeUpdate, videoStartOffset]);

    // Sync time position with AlphaTab (throttled to avoid jitter)
    // This syncs AlphaTab → YouTube when user seeks in tab
    useEffect(() => {
        if (!playerRef.current || !playerRef.current.getCurrentTime || isSyncingRef.current) return;

        try {
            // AlphaTab time is relative to measure 1 (0 = measure 1)
            // YouTube time needs to be absolute (add offset)
            const alphaTabTimeSeconds = currentTime / 1000;
            const youtubeTimeSeconds = alphaTabTimeSeconds + videoStartOffset; // Add offset

            // Get current YouTube time
            const currentYTTime = playerRef.current.getCurrentTime();
            const timeDiff = Math.abs(youtubeTimeSeconds - currentYTTime);

            // Only sync if time difference > 1 second (avoid constant micro-adjustments)
            if (timeDiff > 1.0) {
                isSyncingRef.current = true;
                console.log(`🔁 V94.2: Syncing YouTube time: ${youtubeTimeSeconds.toFixed(1)}s (AlphaTab: ${alphaTabTimeSeconds.toFixed(1)}s + offset: ${videoStartOffset}s)`);

                // 🎯 V94.2 CRITICAL FIX: Use user's INTENDED state, not YouTube's actual state
                // This prevents auto-play bugs when buffering completes after seeking
                const userWantsPaused = !userIntendedPlayingRef.current;

                // Seek to new position
                // Use allowSeekAhead=false when user wants paused (less buffering)
                playerRef.current.seekTo(youtubeTimeSeconds, !userWantsPaused);

                // 🎯 CRITICAL FIX: If user intended to be paused, force pause after seek
                if (userWantsPaused) {
                    // Wait for buffering to complete, THEN pause
                    const checkAndPause = () => {
                        if (playerRef.current && playerRef.current.getPlayerState) {
                            const currentState = playerRef.current.getPlayerState();

                            // 🐛 V94.2.1: ONLY pause if PLAYING, NOT if BUFFERING
                            // Pausing while buffering can cause infinite spinner
                            if (currentState === window.YT.PlayerState.PLAYING) {
                                playerRef.current.pauseVideo();
                                console.log('⏸️ V94.2.1: Enforced user-intended pause after buffering complete');
                            } else if (currentState === window.YT.PlayerState.BUFFERING) {
                                // Still buffering - check again later
                                setTimeout(checkAndPause, 100);
                            }
                        }
                    };

                    // Start checking after initial seek completes
                    setTimeout(checkAndPause, 100);
                }

                lastSyncTimeRef.current = youtubeTimeSeconds;

                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 500);
            }
        } catch {
            // Player not ready yet, skip sync
            console.log('⏭️ V94.2: YouTube player not ready for sync');
        }
    }, [currentTime, videoStartOffset]);

    // Handle close button
    const handleClose = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pauseVideo();
        }
        onClose();
    }, [onClose]);

    // 🆕 Handle video variant change
    const handleVariantChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const variant = event.target.value as 'main' | 'backing' | 'solo' | 'playthrough';
        setSelectedVariant(variant);

        console.log(`🔄 V94.2: Variant selected: ${variant}`);
        console.log(`🔄 V94.2: Available variants:`, videoVariants);

        if (videoVariants && videoVariants[variant]) {
            const newVideoId = videoVariants[variant];
            console.log(`🔄 V94.2: Switching to ${variant} video: ${newVideoId}`);

            // Notify parent to change video
            if (onVariantChange && newVideoId) {
                onVariantChange(newVideoId);
            }
        } else {
            console.warn(`⚠️ V94.2: No video ID found for variant: ${variant}`);
        }
    }, [videoVariants, onVariantChange]);

    if (!isVisible) return null;

    return (
        <div
            className={`
        fixed z-40 
        bg-black rounded-lg overflow-hidden
        shadow-2xl border border-gray-700
        ${isMobileLandscape
                    ? 'bottom-2 right-2 w-48 h-28'      // Smaller in landscape
                    : 'bottom-[74px] right-4 w-[355px] h-[200px]' // Desktop/portrait - sits ON TOP of bottom tray
                }
      `}
        >
            {/* Video Container */}
            <div ref={containerRef} className="w-full h-full bg-black" />

            {/* Controls Overlay */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-2 flex items-start justify-between">
                {/* Video Variant Selector */}
                <label className="flex items-center gap-2 text-xs text-white/90">
                    <span className="hidden sm:inline">Synced video:</span>
                    <select
                        value={selectedVariant}
                        onChange={handleVariantChange}
                        className="
              bg-black/60 text-white text-xs rounded px-2 py-1
              border border-white/20 
              focus:outline-none focus:border-purple-500
            "
                    >
                        <option value="main" disabled={!videoVariants?.main}>
                            Full mix
                        </option>
                        <option value="backing" disabled={!videoVariants?.backing}>
                            Backing track {!videoVariants?.backing && '(unavailable)'}
                        </option>
                        <option value="solo" disabled={!videoVariants?.solo}>
                            Solo {!videoVariants?.solo && '(unavailable)'}
                        </option>
                        <option value="playthrough" disabled={!videoVariants?.playthrough}>
                            Playthrough {!videoVariants?.playthrough && '(unavailable)'}
                        </option>
                    </select>
                </label>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="
            p-1.5 rounded-md
            bg-black/60 hover:bg-black/80
            border border-white/20 hover:border-white/40
            transition-colors
          "
                    title="Close video"
                >
                    <svg width="12" height="12" viewBox="0 0 14 14" className="text-white">
                        <rect width="1.3" height="18" y="1" rx="0.75" transform="rotate(-45 0 1)" fill="currentColor" />
                        <rect width="1.3" height="18" x="12.7" rx="0.75" transform="rotate(45 12.7 0)" fill="currentColor" />
                    </svg>
                </button>
            </div>

            {/* Future: Audio Upload Button (bottom-left) */}
            {/* <div className="absolute bottom-2 left-2">
        <button
          className="p-2 rounded-md bg-black/60 hover:bg-black/80 border border-white/20"
          title="Upload audio file to remove YouTube player"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" className="text-white">
            <path d="M9 2L9 12M5 8L9 12L13 8" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        </button>
      </div> */}
        </div>
    );
};