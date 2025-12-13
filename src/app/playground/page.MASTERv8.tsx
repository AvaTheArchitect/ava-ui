'use client';

/**
 * AlphaTab + YouTube Playground - V8 FIX: Call api.play() for Purple Notation!
 * December 10th, 2025
 * 
 * 🔧 V8 FIX: The REAL fix - call api.play() to activate AlphaTab!
 * - handler.play() starts YouTube playback
 * - api.play() activates AlphaTab's playback engine (purple notation + auto-scroll)
 * - No seeking needed - YouTube already at correct position from user's click
 * - Matches synth-player pattern that works perfectly
 * 
 * 🔧 V6 FIX: 50ms cursor sync only runs when PLAYING
 * - When paused, no cursor sync needed (YouTube not moving)
 * - Prevents stale position from overwriting user clicks
 * - Fixes: Cursor jumping back after pause → play
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';

export default function PlaygroundPage() {
    const apiRef = useRef<any>(null);
    const youtubePlayerRef = useRef<any>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null); // 🆕 Scroll container ref
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const previousVolumeRef = useRef<number>(1.0);
    const isSeekingRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false); // 🆕 V8: Ref for 50ms loop
    const seekStabilizeTimeoutRef = useRef<any>(null);

    // Hard-coded test song and video
    const fileUrl = '/data/sample-songs/real-songs/extreme-rise/extreme-rise.gp5';
    const videoId = 'iJ_AOIbj8AA';
    const videoStartOffset = 4;

    // Sync refs with state
    useEffect(() => {
        isSeekingRef.current = isSeeking;
    }, [isSeeking]);

    // 🆕 V8: Sync playing ref
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Volume management for mode switching
    useEffect(() => {
        if (!apiRef.current) return;

        if (audioSource === 'original') {
            previousVolumeRef.current = apiRef.current.masterVolume || 1.0;
            apiRef.current.masterVolume = 0;
            console.log('🔇 Synth muted for original mode');
        } else {
            apiRef.current.masterVolume = previousVolumeRef.current;
            console.log('🔊 Synth volume restored');
        }
    }, [audioSource]);

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
            console.log('✅ YouTube API Ready');
            initYouTubePlayer();
        };
    }, [audioSource]);

    const initYouTubePlayer = () => {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;
        if (youtubePlayerRef.current) return;

        youtubePlayerRef.current = new YT.Player('ytplayer', {
            videoId,
            width: '560',
            height: '315',
            playerVars: {
                autoplay: 0,
                controls: 1,
                enablejsapi: 1,
                start: videoStartOffset,
            },
            events: {
                onReady: () => {
                    console.log('✅ YouTube Player Ready');
                    setIsYouTubeReady(true);
                },
                onStateChange: (event: any) => {
                    const YT = (window as any).YT;
                    console.log(`🎬 YouTube State: ${event.data} (Seeking: ${isSeekingRef.current})`);

                    // Update playing state
                    if (event.data === YT.PlayerState.PLAYING) {
                        setIsPlaying(true);
                        console.log('▶️ V8: isPlaying = true');
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        setIsPlaying(false);
                        console.log('⏸️ V8: isPlaying = false');
                    }

                    // Clear seeking state
                    if (isSeekingRef.current) {
                        if (seekStabilizeTimeoutRef.current) {
                            clearTimeout(seekStabilizeTimeoutRef.current);
                        }

                        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
                            seekStabilizeTimeoutRef.current = setTimeout(() => {
                                console.log('✅ V8: Seek stabilized');
                                setIsSeeking(false);
                            }, 1000);
                        }
                        return;
                    }

                    // Sync AlphaTab state
                    if (apiRef.current) {
                        if (event.data === YT.PlayerState.PLAYING) {
                            apiRef.current.play();
                            console.log('▶️ AlphaTab PLAY sync');
                        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                            apiRef.current.pause();
                            console.log('⏸️ AlphaTab PAUSE sync');
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
            console.log('🔗 Attaching YouTube handler');

            output.handler = {
                get backingTrackDuration() {
                    const duration = youtubePlayerRef.current?.getDuration?.() || 0;
                    return duration * 1000;
                },
                get playbackRate() {
                    return youtubePlayerRef.current?.getPlaybackRate?.() || 1;
                },
                set playbackRate(rate: number) {
                    console.log(`🎚️ Setting playback rate: ${rate}`);
                    youtubePlayerRef.current?.setPlaybackRate?.(rate);
                },
                get masterVolume() {
                    return ((youtubePlayerRef.current?.getVolume?.() || 100) / 100);
                },
                set masterVolume(vol: number) {
                    console.log(`🔊 Setting volume: ${vol}`);
                    youtubePlayerRef.current?.setVolume?.(vol * 100);
                },
                seekTo(ms: number) {
                    setIsSeeking(true);

                    const sec = ms / 1000 + videoStartOffset;
                    console.log(`🔁 V8: Handler seekTo: ${sec.toFixed(2)}s (seeking flag SET)`);
                    youtubePlayerRef.current?.seekTo?.(sec, true);
                },
                play() {
                    console.log('▶️ Handler play()');
                    youtubePlayerRef.current?.playVideo?.();
                },
                pause() {
                    console.log('⏸️ Handler pause()');
                    youtubePlayerRef.current?.pauseVideo?.();
                },
            };

            console.log('✅ Handler attached');
        } else {
            if (output.handler) {
                output.handler = null;
                console.log('🔌 Handler detached');
            }
        }
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    // 🎯 V8: 50ms Cursor Sync - ONLY WHEN PLAYING!
    useEffect(() => {
        if (!apiRef.current?.player?.output || audioSource !== 'original' || !isYouTubeReady) {
            return;
        }

        const output = apiRef.current.player.output as any;

        if (typeof output.updatePosition !== 'function') {
            console.error('❌ output.updatePosition is not a function!');
            return;
        }

        console.log('🔄 V8: Starting 50ms cursor sync loop');

        const interval = setInterval(() => {
            // 🎯 V8: Skip if seeking OR paused
            if (isSeekingRef.current || !isPlayingRef.current) {
                return; // Don't sync when paused - no need!
            }

            if (youtubePlayerRef.current?.getCurrentTime) {
                const ytTime = youtubePlayerRef.current.getCurrentTime();
                const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                const timeMs = adjustedTime * 1000;

                try {
                    output.updatePosition(timeMs);
                } catch (err) {
                    console.error('❌ updatePosition error:', err);
                }
            }
        }, 50);

        return () => {
            console.log('⏹️ Stopping cursor sync loop');
            clearInterval(interval);
        };
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    const handlePlay = () => {
        console.log('🎮 Play button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current || !apiRef.current) {
                console.warn('⚠️ YouTube or API not ready');
                return;
            }

            // 🎯 V8 FIX: Copy synth-player pattern - just play!
            // No seeking needed - YouTube already at correct position from click
            const output = apiRef.current.player?.output as any;

            if (output?.handler) {
                // Play YouTube
                if (output.handler.play) {
                    output.handler.play();
                    console.log('▶️ V8: YouTube play() via handler');
                }

                // CRITICAL: Also call api.play() to activate AlphaTab's playback engine!
                apiRef.current.play();
                console.log('▶️ V8: AlphaTab play() - activates purple notation + auto-scroll');
            } else {
                console.warn('⚠️ Handler not available');
            }
        } else {
            // Synth mode: direct API call
            if (!apiRef.current) {
                console.warn('⚠️ API not ready');
                return;
            }
            apiRef.current.play();
        }
    };

    const handlePause = () => {
        console.log('🎮 Pause button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current) {
                console.warn('⚠️ YouTube not ready');
                return;
            }
            youtubePlayerRef.current.pauseVideo?.();
        } else {
            if (!apiRef.current) {
                console.warn('⚠️ API not ready');
                return;
            }
            apiRef.current.pause();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header Section - Fixed at top during scroll */}
            <div className="sticky top-0 z-10 bg-black border-b border-purple-500/30 pb-4 pt-4">
                <div className="max-w-5xl mx-auto px-4 space-y-4">
                    <h1 className="text-xl font-bold text-center">🎸 AlphaTab + YouTube Playground (V8)</h1>

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
                        <p className="text-purple-400 text-xs">50ms sync: {isPlaying ? '🔄 ACTIVE' : '⏸️ PAUSED'}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 pt-4 pb-8">
                {/* 🎯 FIX: Fixed height scrollable container (shows ~4 rows like Songsterr) */}
                <div
                    ref={scrollContainerRef}
                    className="w-full bg-white mb-4 overflow-y-auto"
                    style={{ height: 'min(600px, 70vh)' }}
                >
                    <AlphaTabRenderer
                        fileUrl={fileUrl}
                        playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                        soundFontPath="/soundfont/sonivox.sf2"
                        audioSource={audioSource}
                        isSeeking={isSeeking}
                        isPlaying={isPlaying}
                        scrollContainerRef={scrollContainerRef}
                        onApiReady={(api) => {
                            console.log('✅ AlphaTab API Ready');
                            apiRef.current = api;
                            setApiReady(true);
                        }}
                        onScoreLoaded={() => console.log('✅ Score loaded')}
                        onRenderFinished={() => console.log('✅ Render finished')}
                        onError={(err) => console.error('❌ Error:', err)}
                        minHeight="600px"
                    />
                </div>

                {/* Explanation Box */}
                <div className="p-4 bg-gray-900 border border-purple-500 rounded mb-4">
                    <h3 className="text-yellow-400 font-bold mb-2">🔧 V8 Fix: Call api.play() for Purple Notation!</h3>
                    <div className="text-xs space-y-2 text-gray-300">
                        <div className="p-2 bg-red-900/30 border border-red-500/50 rounded">
                            <p className="text-red-400 font-bold">❌ V7 Issue:</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>• Tried to seek to api.tickPosition (returned 1ms - wrong!)</li>
                                <li>• Seeking to wrong position broke everything</li>
                                <li>• More importantly: Never called <code className="text-purple-300">api.play()</code>!</li>
                                <li>• Purple notation needs AlphaTab's playback engine active</li>
                            </ul>
                        </div>

                        <div className="p-2 bg-green-900/30 border border-green-500/50 rounded">
                            <p className="text-green-400 font-bold">✅ V8 Fix (synth-player pattern):</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>• Step 1: <code className="text-purple-300">handler.play()</code> - Start YouTube</li>
                                <li>• Step 2: <code className="text-purple-300">api.play()</code> - Activate AlphaTab engine!</li>
                                <li>• No seeking needed - YouTube already at correct position</li>
                                <li>• 50ms loop syncs YouTube → AlphaTab via updatePosition()</li>
                                <li>• Purple notation + auto-scroll: ✅ WORKING!</li>
                            </ul>
                        </div>

                        <div className="p-2 bg-blue-900/30 border border-blue-500/50 rounded">
                            <p className="text-blue-400 font-bold">💡 Key Insight:</p>
                            <p className="text-xs mt-1">
                                AlphaTab needs <code className="text-purple-300">api.play()</code> to activate its
                                internal playback state machine. This enables purple beat cursor, auto-scroll,
                                and playerPositionChanged events. The 50ms loop's
                                <code className="text-purple-300">updatePosition()</code> calls then drive the visuals!
                            </p>
                        </div>
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
        </div>
    );
}