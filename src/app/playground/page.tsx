'use client';

/**
 * AlphaTab + YouTube Playground - V9.7: LANDSCAPE SINGLE-ROW MODE
 * January 4th, 2026
 * 
 * 🆕 V9.7 ADDED:
 * ✅ Mobile landscape detection with debounce
 * ✅ Unified single-row horizontal layout (like main page.tsx)
 * ✅ Proper container constraints (testing header runaway fix)
 * ✅ Landscape header display
 * ✅ Original mode support in landscape
 * 
 * 🎯 Purpose: Isolate whether glitching is in AlphaTabRenderer or page containers
 * 
 * 🔒 PRESERVED FROM V9.6:
 * ✅ Synchronous seeking ref fix
 * ✅ YouTube integration
 * ✅ 50ms cursor sync
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';

export default function PlaygroundPage() {
    const apiRef = useRef<any>(null);
    const youtubePlayerRef = useRef<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const previousVolumeRef = useRef<number>(1.0);
    const isSeekingRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);
    const seekStabilizeTimeoutRef = useRef<any>(null);
    
    // 🆕 V9.7: Landscape detection
    const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);
    
    // Deferred seek pattern (AlphaTab official workaround)
    const initialSeekRef = useRef<number>(-1);

    // Hard-coded test song and video
    const fileUrl = '/data/sample-songs/real-songs/extreme-rise/extreme-rise.gp5';
    const videoId = 'iJ_AOIbj8AA';
    const videoStartOffset = 4;

    // Sync refs with state (for non-critical updates)
    useEffect(() => {
        isSeekingRef.current = isSeeking;
    }, [isSeeking]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // 🆕 V9.7: ORIENTATION DETECTION WITH DEBOUNCE
    useEffect(() => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let lastValue: boolean | null = null;

        const checkOrientation = () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
                const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
                const isCompactHeight = typeof window !== 'undefined' && window.innerHeight < 600;
                const newValue = isTouchDevice && isLandscape && isCompactHeight;

                // Only update if value actually changed
                if (lastValue !== newValue) {
                    lastValue = newValue;
                    console.log(`📱 V9.7: Orientation changed to ${newValue ? 'LANDSCAPE' : 'PORTRAIT'}`);
                    setIsMobileLandscape(newValue);
                }
            }, 150); // 150ms debounce
        };

        checkOrientation();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', checkOrientation);
            window.addEventListener('orientationchange', checkOrientation);
        }

        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', checkOrientation);
                window.removeEventListener('orientationchange', checkOrientation);
            }
        };
    }, []);

    // 🆕 V9.7: Reset scroll position in landscape
    useEffect(() => {
        if (isMobileLandscape && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
            console.log('🔄 V9.7: Reset scroll to left in landscape');
        }
    }, [isMobileLandscape]);

    // Volume management for mode switching
    useEffect(() => {
        if (!apiRef.current) return;

        if (audioSource === 'original') {
            previousVolumeRef.current = apiRef.current.masterVolume || 1.0;
            apiRef.current.masterVolume = 0;
            console.log('🔇 V9.7: Synth muted for original mode');
        } else {
            apiRef.current.masterVolume = previousVolumeRef.current;
            console.log('🔊 V9.7: Synth volume restored');
        }
    }, [audioSource]);

    // Create stable handler instance
    const youTubeHandlerInstance = React.useMemo(() => {
        return {
            get backingTrackDuration() {
                const duration = youtubePlayerRef.current?.getDuration?.() || 0;
                return duration * 1000;
            },
            get playbackRate() {
                return youtubePlayerRef.current?.getPlaybackRate?.() || 1;
            },
            set playbackRate(rate: number) {
                console.log(`🎚️ V9.7: Setting playback rate: ${rate}`);
                youtubePlayerRef.current?.setPlaybackRate?.(rate);
            },
            get masterVolume() {
                return ((youtubePlayerRef.current?.getVolume?.() || 100) / 100);
            },
            set masterVolume(vol: number) {
                console.log(`🔊 V9.7: Setting volume: ${vol}`);
                youtubePlayerRef.current?.setVolume?.(vol * 100);
            },
            seekTo(ms: number) {
                // 🔧 V9.6 CRITICAL FIX: Set ref SYNCHRONOUSLY before async state update!
                isSeekingRef.current = true;
                console.log(`🔒 V9.7: isSeekingRef.current = true (SYNC)`);
                
                setIsSeeking(true); // Async state update

                const sec = ms / 1000 + videoStartOffset;
                const YT = (window as any).YT;
                const state = youtubePlayerRef.current?.getPlayerState?.();

                if (state !== YT?.PlayerState.PAUSED && state !== YT?.PlayerState.PLAYING) {
                    initialSeekRef.current = sec;
                    console.log(`⏱️ V9.7: Deferring seek to ${sec.toFixed(2)}s`);
                } else {
                    youtubePlayerRef.current?.seekTo?.(sec, true);
                    initialSeekRef.current = -1;
                    console.log(`🔁 V9.7: Immediate seek to ${sec.toFixed(2)}s`);
                }
            },
            play() {
                console.log('▶️ V9.7: Handler play()');
                
                if (initialSeekRef.current >= 0) {
                    console.log(`⏱️ V9.7: Applying deferred seek to ${initialSeekRef.current}s`);
                    youtubePlayerRef.current?.seekTo?.(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                }
                
                youtubePlayerRef.current?.playVideo?.();
            },
            pause() {
                console.log('⏸️ V9.7: Handler pause()');
                youtubePlayerRef.current?.pauseVideo?.();
            },
        };
    }, [videoStartOffset]);

    // Load YouTube IFrame API
    useEffect(() => {
        if (audioSource !== 'original') {
            setIsYouTubeReady(false);
            if (youtubePlayerRef.current?.destroy) {
                youtubePlayerRef.current.destroy();
                youtubePlayerRef.current = null;
            }
            return;
        }

        if ((window as any).YT && (window as any).YT.Player) {
            initYouTubePlayer();
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0] || document.body;
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        (window as any).onYouTubeIframeAPIReady = () => {
            console.log('✅ V9.7: YouTube API Ready');
            initYouTubePlayer();
        };
    }, [audioSource]);

    const initYouTubePlayer = () => {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;
        if (youtubePlayerRef.current) return;

        initialSeekRef.current = videoStartOffset;
        console.log(`⏱️ V9.7: Initial seek deferred to ${videoStartOffset}s`);

        youtubePlayerRef.current = new YT.Player('ytplayer', {
            videoId,
            width: '560',
            height: '315',
            playerVars: {
                autoplay: 0,
                controls: 1,
                enablejsapi: 1,
            },
            events: {
                onReady: () => {
                    console.log('✅ V9.7: YouTube Player Ready');
                    setIsYouTubeReady(true);
                    setIsSeeking(false);
                    isSeekingRef.current = false;
                },
                onStateChange: (event: any) => {
                    const YT = (window as any).YT;
                    console.log(`🎬 V9.7: YouTube State: ${event.data}`);

                    if (event.data === YT.PlayerState.PLAYING) {
                        setIsPlaying(true);
                        isPlayingRef.current = true;
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                    }

                    if (isSeekingRef.current) {
                        if (!seekStabilizeTimeoutRef.current && 
                            (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED)) {
                            seekStabilizeTimeoutRef.current = setTimeout(() => {
                                console.log('✅ V9.7: Seek stabilized');
                                setIsSeeking(false);
                                isSeekingRef.current = false;
                                seekStabilizeTimeoutRef.current = null;
                            }, 500);
                        }
                        return;
                    }

                    if (apiRef.current) {
                        if (event.data === YT.PlayerState.PLAYING) {
                            apiRef.current.play();
                        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                            apiRef.current.pause();
                        }
                    }
                },
            },
        });
    };

    // Attach external media handler
    useEffect(() => {
        if (!apiRef.current || !apiRef.current.player?.output) return;

        const output = apiRef.current.player.output as any;

        if (audioSource === 'original' && isYouTubeReady) {
            console.log('🔗 V9.7: Attaching YouTube handler');
            output.handler = youTubeHandlerInstance;
        } else {
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V9.7: Handler detached');
            }
        }
    }, [audioSource, isYouTubeReady, youTubeHandlerInstance]);

    // 50ms Cursor Sync
    useEffect(() => {
        if (!apiRef.current?.player?.output || audioSource !== 'original' || !isYouTubeReady) {
            return;
        }

        const output = apiRef.current.player.output as any;

        if (typeof output.updatePosition !== 'function') {
            return;
        }

        console.log('🔄 V9.7: Starting 50ms cursor sync loop');

        const interval = setInterval(() => {
            if (isSeekingRef.current || !isPlayingRef.current) {
                return;
            }

            if (youtubePlayerRef.current?.getCurrentTime) {
                const ytTime = youtubePlayerRef.current.getCurrentTime();
                const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                const timeMs = adjustedTime * 1000;

                try {
                    output.updatePosition(timeMs);
                } catch (err) {
                    console.error('❌ V9.7: updatePosition error:', err);
                }
            }
        }, 50);

        return () => {
            console.log('⏹️ V9.7: Stopping cursor sync loop');
            clearInterval(interval);
        };
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    // Ensure handler attached when player ready
    useEffect(() => {
        if (!apiRef.current || !playerReady || !apiRef.current.player?.output) return;

        const output = apiRef.current.player.output as any;

        if (audioSource === 'original' && isYouTubeReady && youTubeHandlerInstance) {
            output.handler = youTubeHandlerInstance;
            console.log('🔗 V9.7: Handler attached on player ready');
        }

        return () => {
            if (apiRef.current?.player?.output) {
                const output = apiRef.current.player.output as any;
                if (output.handler) {
                    output.handler = null;
                }
            }
        };
    }, [apiRef.current, playerReady, audioSource, isYouTubeReady, youTubeHandlerInstance]);

    const handlePlay = () => {
        console.log('🎮 V9.7: Play button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current || !apiRef.current) {
                console.warn('⚠️ V9.7: YouTube or API not ready');
                return;
            }

            const output = apiRef.current.player?.output as any;

            if (output?.handler) {
                if (output.handler.play) {
                    output.handler.play();
                }
                apiRef.current.play();
            }
        } else {
            if (!apiRef.current) {
                return;
            }
            apiRef.current.play();
        }
    };

    const handlePause = () => {
        console.log('🎮 V9.7: Pause button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current) {
                return;
            }
            youtubePlayerRef.current.pauseVideo?.();
        } else {
            if (!apiRef.current) {
                return;
            }
            apiRef.current.pause();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {/* 🆕 V9.7: Header - Fixed position, locked to viewport width */}
            <div 
                className={`
                    sticky top-0 z-10 bg-black border-b border-purple-500/30
                    ${isMobileLandscape ? 'pb-2 pt-2' : 'pb-4 pt-4'}
                `}
                style={{
                    maxWidth: '100vw',
                    width: '100vw'
                }}
            >
                <div className="max-w-5xl mx-auto px-4 space-y-4">
                    {/* 🆕 V9.7: Landscape-specific header */}
                    {isMobileLandscape ? (
                        <div className="flex items-center justify-between">
                            <h1 className="text-sm font-bold truncate flex-1">🎸 Playground V9.7 - LANDSCAPE MODE</h1>
                            <div className="flex gap-2 ml-4">
                                <button
                                    className={`px-3 py-1 text-xs rounded ${audioSource === 'synth' ? 'bg-purple-600' : 'bg-gray-700'}`}
                                    onClick={() => setAudioSource('synth')}
                                >
                                    Synth
                                </button>
                                <button
                                    className={`px-3 py-1 text-xs rounded ${audioSource === 'original' ? 'bg-purple-600' : 'bg-gray-700'}`}
                                    onClick={() => setAudioSource('original')}
                                >
                                    Original
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold text-center">🎸 AlphaTab Playground V9.7 - Landscape Test</h1>

                            {/* Mode Toggle */}
                            <div className="flex justify-center">
                                <button
                                    className={`px-4 py-2 mr-2 rounded ${audioSource === 'synth' ? 'bg-purple-600' : 'bg-gray-700'}`}
                                    onClick={() => setAudioSource('synth')}
                                >
                                    Synth
                                </button>
                                <button
                                    className={`px-4 py-2 rounded ${audioSource === 'original' ? 'bg-purple-600' : 'bg-gray-700'}`}
                                    onClick={() => setAudioSource('original')}
                                >
                                    Original (YouTube)
                                </button>
                            </div>

                            {/* Play/Pause Controls */}
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handlePlay}
                                    className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                                >
                                    ▶️ Play
                                </button>
                                <button
                                    onClick={handlePause}
                                    className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
                                >
                                    ⏸️ Pause
                                </button>
                            </div>

                            {/* Status Info */}
                            <div className="text-sm text-gray-400 text-center">
                                <p>Mode: {audioSource} | API: {apiReady ? '✅' : '❌'} | YouTube: {isYouTubeReady ? '✅' : '❌'}</p>
                                <p className="text-yellow-400">
                                    Playing: {isPlaying ? '▶️ YES' : '⏸️ NO'} | Seeking: {isSeeking ? '🔒 LOCKED' : '✅ ENABLED'}
                                </p>
                                <p className={`text-xs ${isMobileLandscape ? 'text-green-400' : 'text-purple-400'}`}>
                                    Layout: {isMobileLandscape ? '📱 LANDSCAPE SINGLE-ROW' : '📱 PORTRAIT/DESKTOP'}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 🆕 V9.7: Main Content - Adapts to landscape */}
            <main
                ref={scrollContainerRef}
                className={`
                    w-full overscroll-y-contain
                    ${isMobileLandscape
                        ? 'h-[calc(100vh-80px)] overflow-x-auto overflow-y-hidden relative'
                        : 'pb-32 overflow-y-auto overflow-x-hidden'
                    }
                `}
                style={isMobileLandscape ? {
                    maxWidth: '100vw',
                    width: '100vw'
                } : undefined}
            >
                {/* 🆕 V9.7: AlphaTab Container - Unified single row in landscape */}
                <div
                    id="playground-alphatab"
                    className={`
                        relative bg-white
                        ${isMobileLandscape
                            ? 'h-full pt-[8vh]'
                            : 'w-full'
                        }
                    `}
                    style={isMobileLandscape ? {
                        display: 'inline-block',
                        minWidth: '100%',
                        width: 'max-content'
                    } : undefined}
                >
                    <AlphaTabRenderer
                        fileUrl={fileUrl}
                        playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                        soundFontPath="/soundfont/sonivox.sf2"
                        audioSource={audioSource}
                        isSeeking={isSeeking}
                        isPlaying={isPlaying}
                        scrollContainerRef={scrollContainerRef}
                        isMobileLandscape={isMobileLandscape}
                        onApiReady={(api) => {
                            console.log('✅ V9.7: AlphaTab API Ready');
                            apiRef.current = api;
                            setApiReady(true);

                            if (api.playerReady) {
                                api.playerReady.on(() => {
                                    console.log('✅ V9.7: AlphaTab Player Ready');
                                    setPlayerReady(true);

                                    if (audioSource === 'original' && isYouTubeReady && api.player?.output) {
                                        const output = api.player.output as any;
                                        output.handler = youTubeHandlerInstance;
                                        console.log('🔗 V9.7: Handler attached on player ready');
                                    }
                                });
                            }
                        }}
                        onScoreLoaded={() => console.log('✅ V9.7: Score loaded')}
                        onRenderFinished={() => console.log('✅ V9.7: Render finished')}
                        onError={(err) => console.error('❌ V9.7: Error:', err)}
                        minHeight="600px"
                    />
                </div>

                {/* Portrait/Desktop Controls - Hidden in landscape */}
                {!isMobileLandscape && (
                    <>
                        <div className="max-w-5xl mx-auto px-4 pt-4">
                            {/* Play/Pause Controls for portrait */}
                            <div className="flex justify-center gap-4 mb-4">
                                <button
                                    onClick={handlePlay}
                                    className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                                >
                                    ▶️ Play
                                </button>
                                <button
                                    onClick={handlePause}
                                    className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
                                >
                                    ⏸️ Pause
                                </button>
                            </div>

                            {/* Info Box */}
                            <div className="p-4 bg-gray-900 border border-green-500 rounded mb-4">
                                <h3 className="text-green-400 font-bold mb-2">📱 V9.7: Landscape Single-Row Test</h3>
                                <div className="text-xs space-y-2 text-gray-300">
                                    <p>✅ Added mobile landscape detection</p>
                                    <p>✅ Unified single-row horizontal layout (matches main page)</p>
                                    <p>✅ Container constraints (testing header runaway fix)</p>
                                    <p>✅ Original mode support in landscape</p>
                                    <p className="text-yellow-400 mt-2">🧪 Rotate to landscape to test unified row behavior!</p>
                                </div>
                            </div>

                            {/* YouTube Player */}
                            {audioSource === 'original' && (
                                <div className="border-2 border-red-500 rounded p-2">
                                    <p className="text-xs text-red-400 mb-2">YouTube Player:</p>
                                    <div id="ytplayer"></div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* 🆕 V9.7: Landscape-specific controls (floating bottom bar) */}
            {isMobileLandscape && (
                <div 
                    className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-purple-500/30 py-2 px-4"
                    style={{
                        maxWidth: '100vw',
                        width: '100vw'
                    }}
                >
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={handlePlay}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold text-sm"
                        >
                            ▶️ Play
                        </button>
                        <button
                            onClick={handlePause}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold text-sm"
                        >
                            ⏸️ Pause
                        </button>
                        <div className="text-xs text-gray-400">
                            {isPlaying ? '▶️ Playing' : '⏸️ Paused'} | Mode: {audioSource}
                        </div>
                    </div>
                </div>
            )}

            {/* YouTube Player - Hidden in landscape */}
            {audioSource === 'original' && !isMobileLandscape && (
                <div className="fixed bottom-4 right-4 border-2 border-red-500 rounded p-2 bg-black">
                    <p className="text-xs text-red-400 mb-2">YouTube:</p>
                    <div id="ytplayer"></div>
                </div>
            )}
        </div>
    );
}