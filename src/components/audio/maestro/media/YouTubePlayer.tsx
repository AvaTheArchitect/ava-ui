'use client';

/**
 * YouTube Player Component - March 14th, 2026 - V99: Dynamic slot awareness
 *
 * 🔥 V99 CHANGES:
 * ✅ videoVariants expanded to all 6 tab_youtube slots (main, backing, solo,
 *    playthrough, live, lesson) — matches SongItem.youtubeVariants + queries.ts
 * ✅ Dropdown renders all 6 slots dynamically — only shows slots with a real video ID
 * ✅ selectedVariant type updated to include 'live' | 'lesson'
 * ✅ lesson maps to "Tutorial" in the player UI
 *
 * 🔒 V98.2 FEATURES (PRESERVED):
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
        live?: string;
        lesson?: string;
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
        // All 6 tab_youtube slot types — dropdown surfaces whichever have a real video ID
        const [selectedVariant, setSelectedVariant] = useState<'main' | 'backing' | 'solo' | 'playthrough' | 'live' | 'lesson'>('main');

        // Track initial seek to prevent auto-play
        const initialSeekRef = useRef<number>(-1);

        // Expose YouTube player instance
        useImperativeHandle(ref, () => ({
            playVideo: () => {
                // Apply deferred initial seek on first play
                if (initialSeekRef.current >= 0) {
                    console.log(`⏱️ V98: Applying deferred seek to ${initialSeekRef.current}s on play`);
                    playerRef.current?.seekTo?.(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                }
                playerRef.current?.playVideo?.();
            },
            pauseVideo: () => playerRef.current?.pauseVideo?.(),
            seekTo: (seconds: number, allowSeekAhead: boolean) => {
                if (!playerRef.current) {
                    console.warn('⚠️ V98: Player ref not ready');
                    return;
                }

                const YT = (window as any).YT;
                if (!YT || !YT.PlayerState) {
                    console.warn('⚠️ V98: YouTube API not loaded - deferring seek');
                    initialSeekRef.current = seconds;
                    return;
                }

                const state = playerRef.current.getPlayerState?.();

                if (state !== YT.PlayerState.PAUSED && state !== YT.PlayerState.PLAYING) {
                    initialSeekRef.current = seconds;
                    console.log(`⏱️ V98: Deferring seek to ${seconds}s (state=${state})`);
                } else {
                    playerRef.current.seekTo(seconds, allowSeekAhead);
                    console.log(`⏱️ V98: Immediate seek to ${seconds}s (state=${state})`);
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
                console.log('✅ V98: YouTube IFrame API Ready');
                setIsAPIReady(true);
            };

            return () => {
                window.onYouTubeIframeAPIReady = () => { };
            };
        }, []);

        // ==================== PLAYER INITIALIZATION ====================
        useEffect(() => {
            if (!isAPIReady || !isVisible || !containerRef.current) return;

            console.log(`🎬 V98: Initializing YouTube player: ${videoId}`);
            if (videoStartOffset > 0) {
                console.log(`⏱️ V98: Video start offset: ${videoStartOffset}s`);
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
                    widgetid: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: (event: any) => {
                        console.log('✅ V98: YouTube player ready (no auto-seek)');
                        if (onPlayerReady) {
                            console.log('📢 V98: Notifying parent - YouTube player is ready');
                            onPlayerReady();
                        }
                    },
                    onStateChange: (event: any) => {
                        const state = event.data;
                        console.log(`🎬 V98: YouTube state: ${state}`);

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
                    console.log('🗑️ V98: Destroying YouTube player');
                    playerRef.current.destroy();
                    playerRef.current = null;
                }
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
            const variant = event.target.value as 'main' | 'backing' | 'solo' | 'playthrough' | 'live' | 'lesson';
            setSelectedVariant(variant);

            console.log(`🔄 V99: Variant selected: ${variant}`);

            const newVideoId = videoVariants?.[variant];
            if (newVideoId) {
                console.log(`🔄 V99: Switching to ${variant} video: ${newVideoId}`);
                onVariantChange?.(newVideoId);
            } else {
                console.warn(`⚠️ V99: No video ID found for variant: ${variant}`);
            }
        }, [videoVariants, onVariantChange]);

        if (!isVisible) return null;

        // ==================== RENDER - SONGSTERR STYLE ====================
        return (
            <div
                className={`
                    fixed z-40 
                    bg-black overflow-hidden
                    shadow-2xl border border-gray-300
                    flex flex-col
                    ${isMobileLandscape
                        ? 'bottom-[80px] right-0 w-[180px]'
                        : 'bottom-[80px] right-0 w-[52vw] md:bottom-[74px] md:right-4 md:w-[320px]'
                    }
                `}
            >
                {/* Menu bar — all 6 slots rendered dynamically.
                    Only options with a real youtube_id from tab_youtube are shown.
                    Compact playback labels (lesson → "Tutorial"). */}
                <div className="bg-white border-b border-gray-200 px-2 py-1.5 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                        <span className="text-gray-500 text-[10px] md:text-xs">Synced video:</span>
                        <select
                            value={selectedVariant}
                            onChange={handleVariantChange}
                            className="
                                bg-white text-gray-800 text-[10px] md:text-xs
                                border border-gray-300 rounded px-1 py-0.5
                                focus:outline-none focus:border-blue-500
                                cursor-pointer
                            "
                        >
                            {videoVariants?.main && <option value="main">Full mix</option>}
                            {videoVariants?.backing && <option value="backing">Backing track</option>}
                            {videoVariants?.solo && <option value="solo">Solo</option>}
                            {videoVariants?.playthrough && <option value="playthrough">Playthrough</option>}
                            {videoVariants?.live && <option value="live">Live</option>}
                            {videoVariants?.lesson && <option value="lesson">Tutorial</option>}
                            {/* Fallback: no variants available */}
                            {!videoVariants?.main && !videoVariants?.backing && !videoVariants?.solo &&
                                !videoVariants?.playthrough && !videoVariants?.live && !videoVariants?.lesson && (
                                    <option value="main" disabled>Full mix</option>
                                )}
                        </select>
                    </label>

                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-500 hover:text-gray-800 transition-colors"
                        title="Close video"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* Video container */}
                <div
                    ref={containerRef}
                    className={`
                        w-full bg-black
                        ${isMobileLandscape ? 'h-[100px]' : 'h-[58vw] md:h-[180px]'}
                    `}
                />
            </div>
        );
    })
);

YouTubePlayer.displayName = 'YouTubePlayer';