'use client';

/**
 * YouTube Player Component - December 13th, 2025 - V97.16: SAFE YT.PlayerState GUARD
 * 
 * 🔧 V97.16: CRITICAL FIX - Guard YT.PlayerState usage
 * ✅ Checks YouTube API is loaded before accessing YT.PlayerState
 * ✅ Defers seek if API or player state are not ready
 * ✅ Keeps AlphaTab official auto-play workaround behavior
 * 
 * 🔒 PRESERVED FROM V97.15:
 * ✅ Tracks initialSeek to prevent auto-play after first seek
 * ✅ Only applies seekTo when player is PAUSED or PLAYING (not UNSTARTED)
 * ✅ Defers initial seek until first play() call
 * ✅ React.memo, onStateChange, onPlayerReady, heartbeat
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
    onPlayerReady?: () => void;
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

// 🔒 Memoized component
export const YouTubePlayer = React.memo(
    React.forwardRef<any, YouTubePlayerProps>(({
        videoId,
        isVisible,
        onClose,
        currentTime,
        isPlaying,
        onPlayStateChange,
        onTimeUpdate,
        onStateChange,
        onSeeking,
        onPlayerReady,
        isMobileLandscape = false,
        videoVariants,
        onVariantChange,
        videoStartOffset = 0,
    }, ref) => {
        const playerRef = useRef<any>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const [isAPIReady, setIsAPIReady] = useState(false);
        const [selectedVariant, setSelectedVariant] = useState<'main' | 'backing' | 'solo' | 'playthrough'>('main');

        // Track initial seek to prevent auto-play
        const initialSeekRef = useRef<number>(-1);

        // Expose YouTube player instance
        useImperativeHandle(ref, () => ({
            playVideo: () => {
                // Apply deferred initial seek on first play
                if (initialSeekRef.current >= 0) {
                    console.log(`⏱️ V97.16: Applying deferred seek to ${initialSeekRef.current}s on play`);
                    playerRef.current?.seekTo?.(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                }
                playerRef.current?.playVideo?.();
            },
            pauseVideo: () => playerRef.current?.pauseVideo?.(),
            // 🔧 V97.16: SAFE YT.PlayerState CHECK + DEFERRED SEEK
            seekTo: (seconds: number, allowSeekAhead: boolean) => {
                if (!playerRef.current) {
                    console.warn('⚠️ V97.16: Player ref not ready');
                    return;
                }

                // 🎯 V97.16: Check if YouTube API is loaded
                const YT = (window as any).YT;
                if (!YT || !YT.PlayerState) {
                    console.warn('⚠️ V97.16: YouTube API not loaded - deferring seek');
                    initialSeekRef.current = seconds;
                    return;
                }

                const state = playerRef.current.getPlayerState?.();

                // Defer if player not ready
                if (state !== YT.PlayerState.PAUSED && state !== YT.PlayerState.PLAYING) {
                    initialSeekRef.current = seconds;
                    console.log(`⏱️ V97.16: Deferring seek to ${seconds}s (state=${state})`);
                } else {
                    playerRef.current.seekTo(seconds, allowSeekAhead);
                    console.log(`⏱️ V97.16: Immediate seek to ${seconds}s (state=${state})`);
                }
            },
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
                console.log('✅ V97.16: YouTube IFrame API Ready');
                setIsAPIReady(true);
            };

            return () => {
                window.onYouTubeIframeAPIReady = () => {};
            };
        }, []);

        // ==================== PLAYER INITIALIZATION ====================
        useEffect(() => {
            if (!isAPIReady || !isVisible || !containerRef.current) return;

            console.log(`🎬 V97.16: Initializing YouTube player: ${videoId}`);
            if (videoStartOffset > 0) {
                console.log(`⏱️ V97.16: Video start offset: ${videoStartOffset}s`);
                // Store initial seek instead of applying it (prevents auto-play)
                initialSeekRef.current = videoStartOffset;
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
                    // Do not use 'start' param - causes auto-play
                    // start: videoStartOffset,
                    widgetid: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: (event: any) => {
                        console.log('✅ V97.16: YouTube player ready (no auto-seek)');

                        // Do not seek here - let it happen on first play
                        // This prevents the auto-play bug

                        if (onPlayerReady) {
                            console.log('📢 V97.16: Notifying parent - YouTube player is ready');
                            onPlayerReady();
                        }
                    },
                    onStateChange: (event: any) => {
                        const state = event.data;
                        console.log(`🎬 V97.16: YouTube state: ${state}`);

                        if (onStateChange) {
                            onStateChange(event);
                        }

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
                    console.log('🗑️ V97.16: Destroying YouTube player');
                    playerRef.current.destroy();
                    playerRef.current = null;
                }
                // Reset initial seek tracker
                initialSeekRef.current = -1;
            };
        }, [isAPIReady, isVisible, videoId, videoStartOffset, onStateChange, onPlayStateChange, onPlayerReady]);

        // ==================== YOUTUBE TIME HEARTBEAT ====================
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
                    // Player not ready
                }
            }, 50);

            return () => clearInterval(interval);
        }, [onTimeUpdate, videoStartOffset]);

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

            console.log(`🔄 V97.16: Variant selected: ${variant}`);

            if (videoVariants && videoVariants[variant]) {
                const newVideoId = videoVariants[variant];
                console.log(`🔄 V97.16: Switching to ${variant} video: ${newVideoId}`);

                if (onVariantChange && newVideoId) {
                    onVariantChange(newVideoId);
                }
            } else {
                console.warn(`⚠️ V97.16: No video ID found for variant: ${variant}`);
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
    })
);

YouTubePlayer.displayName = 'YouTubePlayer';
