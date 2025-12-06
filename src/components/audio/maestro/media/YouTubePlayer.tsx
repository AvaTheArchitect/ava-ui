'use client';

/**
 * YouTube Player Component - December 5th, 2025 - V96.4 SIMPLIFIED
 * 
 * 🆕 SIMPLIFIED IN V96.4:
 * ✅ Nuclear approach: Aggressively pause after ANY seek when user is paused
 * ✅ Removed complex state tracking - just check and pause repeatedly
 * ✅ Simpler, more reliable - if paused, stay paused!
 * ✅ 100ms rapid checks for 2 seconds = catches any auto-play
 * 
 * 🔒 PRESERVED:
 * ✅ onStateChange callback for parent state sync
 * ✅ Drift sync works during playback too
 * ✅ forwardRef for imperative methods
 * ✅ Time updates, offset support
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';

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
    currentTime: number;
    isPlaying: boolean;
    onPlayStateChange?: (isPlaying: boolean) => void;
    onTimeUpdate?: (time: number) => void;
    onStateChange?: (event: any) => void;
    onSeeking?: (isSeeking: boolean) => void;
    isMobileLandscape?: boolean;
    videoVariants?: {
        main?: string;
        backing?: string;
        solo?: string;
        playthrough?: string;
    };
    onVariantChange?: (videoId: string) => void;
    videoStartOffset?: number;
}

export const YouTubePlayer = React.forwardRef<any, YouTubePlayerProps>(({
    videoId,
    isVisible,
    onClose,
    currentTime,
    isPlaying,
    onPlayStateChange,
    onTimeUpdate,
    onStateChange,
    onSeeking,
    isMobileLandscape = false,
    videoVariants,
    onVariantChange,
    videoStartOffset = 0,
}, ref) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAPIReady, setIsAPIReady] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState<'main' | 'backing' | 'solo' | 'playthrough'>('main');
    const lastSyncTimeRef = useRef<number>(0);
    const isSyncingRef = useRef<boolean>(false);
    const pauseEnforcementTimerRef = useRef<any>(null); // 🆕 V96.4: Simple timer ref

    // Expose YouTube player instance to parent via ref
    useImperativeHandle(ref, () => ({
        playVideo: () => playerRef.current?.playVideo?.(),
        pauseVideo: () => playerRef.current?.pauseVideo?.(),
        seekTo: (seconds: number, allowSeekAhead: boolean) =>
            playerRef.current?.seekTo?.(seconds, allowSeekAhead),
        getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
        getDuration: () => playerRef.current?.getDuration?.() || 0,
        getVolume: () => playerRef.current?.getVolume?.() || 100,
        setVolume: (volume: number) => playerRef.current?.setVolume?.(volume),
        getPlaybackRate: () => playerRef.current?.getPlaybackRate?.() || 1,
        setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate?.(rate),
        getPlayerState: () => playerRef.current?.getPlayerState?.() || -1,
    }), []);

    // ==================== YOUTUBE API LOADING ====================
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            setIsAPIReady(true);
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ V96.4: YouTube IFrame API Ready');
            setIsAPIReady(true);
        };

        return () => {
            window.onYouTubeIframeAPIReady = () => { };
        };
    }, []);

    // ==================== PLAYER INITIALIZATION ====================
    useEffect(() => {
        if (!isAPIReady || !isVisible || !containerRef.current) return;

        console.log(`🎬 V96.4: Initializing YouTube player: ${videoId}`);
        if (videoStartOffset > 0) {
            console.log(`⏱️ V96.4: Video start offset: ${videoStartOffset}s`);
        }

        playerRef.current = new window.YT.Player(containerRef.current, {
            videoId: videoId,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                showinfo: 0,
                rel: 0,
                modestbranding: 0,
                fs: 0,
                cc_load_policy: 0,
                iv_load_policy: 3,
                enablejsapi: 1,
                start: videoStartOffset,
                widgetid: 1,
                origin: window.location.origin,
            },
            events: {
                onReady: (event: any) => {
                    console.log('✅ V96.4: YouTube player ready');

                    if (videoStartOffset > 0) {
                        console.log(`⏱️ V96.4: Seeking to offset: ${videoStartOffset}s`);
                        event.target.seekTo(videoStartOffset, true);
                    }
                },
                onStateChange: (event: any) => {
                    const state = event.data;
                    console.log(`🎬 V96.4: YouTube state: ${state}`);

                    // Pass state change to parent
                    if (onStateChange) {
                        onStateChange(event);
                    }

                    // Keep existing onPlayStateChange for backwards compatibility
                    if (state === window.YT.PlayerState.PLAYING && onPlayStateChange) {
                        onPlayStateChange(true);
                    } else if (state === window.YT.PlayerState.PAUSED && onPlayStateChange) {
                        onPlayStateChange(false);
                    } else if (state === window.YT.PlayerState.ENDED && onPlayStateChange) {
                        onPlayStateChange(false);
                    }
                },
            },
        });

        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                console.log('🗑️ V96.4: Destroying YouTube player');
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [isAPIReady, isVisible, videoId, videoStartOffset, onStateChange, onPlayStateChange]);

    // ==================== YOUTUBE TIME HEARTBEAT (YouTube → AlphaTab) ====================
    useEffect(() => {
        if (!playerRef.current || !onTimeUpdate) return;

        const interval = setInterval(() => {
            try {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                    const ytTime = playerRef.current.getCurrentTime();
                    const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                    const ytTimeMs = adjustedTime * 1000;
                    onTimeUpdate(ytTimeMs);
                }
            } catch {
                // Player not ready - ignore
            }
        }, 50);

        return () => clearInterval(interval);
    }, [onTimeUpdate, videoStartOffset]);

    // ==================== SEEK SYNC (AlphaTab → YouTube) - SIMPLIFIED ====================
    useEffect(() => {
        if (!playerRef.current || !playerRef.current.getCurrentTime || isSyncingRef.current) return;

        try {
            const alphaTabTimeSeconds = currentTime / 1000;
            const youtubeTimeSeconds = alphaTabTimeSeconds + videoStartOffset;
            const currentYTTime = playerRef.current.getCurrentTime();
            const timeDiff = Math.abs(youtubeTimeSeconds - currentYTTime);

            // 🎯 V96.4: Sync when drift > 1s (works both paused AND playing)
            if (timeDiff > 1.0) {
                isSyncingRef.current = true;

                const mode = isPlaying ? 'PLAYING' : 'PAUSED';
                console.log(`🔁 V96.4: Drift sync (${mode}, drift=${timeDiff.toFixed(1)}s) → ${youtubeTimeSeconds.toFixed(1)}s`);

                // Notify parent we're seeking (pauses their 50ms loop)
                if (onSeeking) {
                    onSeeking(true);
                }

                // Execute the seek
                playerRef.current.seekTo(youtubeTimeSeconds, true);

                // 🆕 V96.4 NUCLEAR OPTION: If user was paused, aggressively enforce pause
                if (!isPlaying) {
                    // Clear any existing pause enforcement timer
                    if (pauseEnforcementTimerRef.current) {
                        clearInterval(pauseEnforcementTimerRef.current);
                    }

                    let checkCount = 0;
                    const MAX_CHECKS = 20; // 2 seconds max (20 * 100ms)

                    console.log('🛑 V96.4: Starting aggressive pause enforcement');

                    // 🎯 SIMPLE: Just keep checking and pausing until it sticks
                    pauseEnforcementTimerRef.current = setInterval(() => {
                        checkCount++;

                        if (!playerRef.current) {
                            clearInterval(pauseEnforcementTimerRef.current);
                            if (onSeeking) onSeeking(false);
                            return;
                        }

                        const state = playerRef.current.getPlayerState?.();

                        // If it's playing, PAUSE IT!
                        if (state === window.YT.PlayerState.PLAYING) {
                            console.log(`⏸️ V96.4: Caught auto-play, pausing! (check ${checkCount})`);
                            playerRef.current.pauseVideo();
                        }

                        // Stop checking after timeout or if successfully paused
                        if (checkCount >= MAX_CHECKS || state === window.YT.PlayerState.PAUSED) {
                            clearInterval(pauseEnforcementTimerRef.current);
                            if (onSeeking) onSeeking(false);

                            if (state === window.YT.PlayerState.PAUSED) {
                                console.log(`✅ V96.4: Pause enforced successfully (after ${checkCount} checks)`);
                            } else {
                                console.log(`⏱️ V96.4: Pause enforcement timeout (after ${checkCount} checks)`);
                            }
                        }
                    }, 100); // Check every 100ms
                } else {
                    // Playing - just let it seek and continue
                    setTimeout(() => {
                        if (onSeeking) onSeeking(false);
                    }, 300);
                }

                lastSyncTimeRef.current = youtubeTimeSeconds;

                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 500);
            }
        } catch (error) {
            console.log('⏭️ V96.4: YouTube player not ready for seek');
        }
    }, [currentTime, videoStartOffset, isPlaying, onSeeking]);

    // Cleanup pause enforcement timer on unmount
    useEffect(() => {
        return () => {
            if (pauseEnforcementTimerRef.current) {
                clearInterval(pauseEnforcementTimerRef.current);
            }
        };
    }, []);

    // ==================== UI HANDLERS ====================
    const handleClose = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pauseVideo();
        }
        onClose();
    }, [onClose]);

    const handleVariantChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const variant = event.target.value as 'main' | 'backing' | 'solo' | 'playthrough';
        setSelectedVariant(variant);

        console.log(`🔄 V96.4: Variant selected: ${variant}`);

        if (videoVariants && videoVariants[variant]) {
            const newVideoId = videoVariants[variant];
            console.log(`🔄 V96.4: Switching to ${variant} video: ${newVideoId}`);

            if (onVariantChange && newVideoId) {
                onVariantChange(newVideoId);
            }
        } else {
            console.warn(`⚠️ V96.4: No video ID found for variant: ${variant}`);
        }
    }, [videoVariants, onVariantChange]);

    if (!isVisible) return null;

    // ==================== RENDER ====================
    return (
        <div
            className={`
                fixed z-40 
                bg-black rounded-lg overflow-hidden
                shadow-2xl border border-gray-700
                ${isMobileLandscape
                    ? 'bottom-2 right-2 w-48 h-28'
                    : 'bottom-[74px] right-4 w-[355px] h-[200px]'
                }
            `}
        >
            <div ref={containerRef} className="w-full h-full bg-black" />

            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-2 flex items-start justify-between">
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
        </div>
    );
});

YouTubePlayer.displayName = 'YouTubePlayer';