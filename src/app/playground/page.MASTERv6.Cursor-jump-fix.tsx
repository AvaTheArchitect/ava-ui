'use client';

/**
 * AlphaTab + YouTube Playground - V6 FIX: Only Sync When Playing
 * December 9th, 2025
 * 
 * 🔧 V6 FIX: 50ms cursor sync only runs when PLAYING
 * - When paused, no cursor sync needed (YouTube not moving)
 * - Prevents stale position from overwriting user clicks
 * - Fixes: Cursor jumping back after pause → play
 * 
 * 🔧 V5 FIX: Pass isPlaying state to AlphaTabRenderer
 * - Only block clicks when BOTH seeking AND playing
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';

export default function PlaygroundPage() {
    const apiRef = useRef<any>(null);
    const youtubePlayerRef = useRef<any>(null);
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const previousVolumeRef = useRef<number>(1.0);
    const isSeekingRef = useRef<boolean>(false);
    const isPlayingRef = useRef<boolean>(false); // 🆕 V6: Ref for 50ms loop
    const seekStabilizeTimeoutRef = useRef<any>(null);

    // Hard-coded test song and video
    const fileUrl = '/data/sample-songs/real-songs/extreme-rise/extreme-rise.gp5';
    const videoId = 'iJ_AOIbj8AA';
    const videoStartOffset = 4;

    // Sync refs with state
    useEffect(() => {
        isSeekingRef.current = isSeeking;
    }, [isSeeking]);

    // 🆕 V6: Sync playing ref
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
                        console.log('▶️ V6: isPlaying = true');
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        setIsPlaying(false);
                        console.log('⏸️ V6: isPlaying = false');
                    }

                    // Clear seeking state
                    if (isSeekingRef.current) {
                        if (seekStabilizeTimeoutRef.current) {
                            clearTimeout(seekStabilizeTimeoutRef.current);
                        }

                        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
                            seekStabilizeTimeoutRef.current = setTimeout(() => {
                                console.log('✅ V6: Seek stabilized');
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
                    console.log(`🔁 V6: Handler seekTo: ${sec.toFixed(2)}s (seeking flag SET)`);
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

    // 🎯 V6 CRITICAL FIX: 50ms Cursor Sync - ONLY WHEN PLAYING!
    useEffect(() => {
        if (!apiRef.current?.player?.output || audioSource !== 'original' || !isYouTubeReady) {
            return;
        }

        const output = apiRef.current.player.output as any;

        if (typeof output.updatePosition !== 'function') {
            console.error('❌ output.updatePosition is not a function!');
            return;
        }

        console.log('🔄 V6: Starting 50ms cursor sync loop');

        const interval = setInterval(() => {
            // 🎯 V6 FIX: Skip if seeking OR paused
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
            if (!youtubePlayerRef.current) {
                console.warn('⚠️ YouTube not ready');
                return;
            }
            youtubePlayerRef.current.playVideo?.();
        } else {
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
        <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
            <h1 className="text-xl font-bold mb-4">🎸 AlphaTab + YouTube Playground (V6)</h1>

            <div className="mb-4">
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

            <div className="w-full max-w-5xl bg-white">
                <AlphaTabRenderer
                    fileUrl={fileUrl}
                    playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                    soundFontPath="/soundfont/sonivox.sf2"
                    audioSource={audioSource}
                    isSeeking={isSeeking}
                    isPlaying={isPlaying}
                    onApiReady={(api) => {
                        console.log('✅ AlphaTab API Ready');
                        apiRef.current = api;
                        setApiReady(true);
                    }}
                    onScoreLoaded={() => console.log('✅ Score loaded')}
                    onRenderFinished={() => console.log('✅ Render finished')}
                    onError={(err) => console.error('❌ Error:', err)}
                />
            </div>

            <div className="mt-4 flex gap-4">
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

            <div className="mt-4 text-sm text-gray-400">
                <p>Mode: {audioSource}</p>
                <p>API Ready: {apiReady ? '✅' : '❌'}</p>
                <p>YouTube Ready: {isYouTubeReady ? '✅' : '❌'}</p>
                <p className="text-yellow-400">
                    Playing: {isPlaying ? '▶️ YES' : '⏸️ NO'} |
                    Seeking: {isSeeking ? '🔒 LOCKED' : '✅ ENABLED'}
                </p>
                <p className="text-purple-400 text-xs mt-1">
                    50ms sync: {isPlaying ? '🔄 ACTIVE' : '⏸️ PAUSED'}
                </p>
            </div>

            <div className="mt-4 p-4 bg-gray-900 border border-purple-500 rounded max-w-2xl">
                <h3 className="text-yellow-400 font-bold mb-2">🔧 V6 Fix: Cursor Sync Only When Playing</h3>
                <div className="text-xs space-y-2 text-gray-300">
                    <div className="p-2 bg-red-900/30 border border-red-500/50 rounded">
                        <p className="text-red-400 font-bold">❌ V5 Issue:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                            <li>1. User clicks to m6 while paused</li>
                            <li>2. Seeking flag clears after 1000ms</li>
                            <li>3. 50ms loop resumes (even though paused!)</li>
                            <li>4. Loop gets stale YouTube position (m17)</li>
                            <li>5. Calls updatePosition(m17) → cursor jumps back!</li>
                            <li>6. User presses Play → starts from wrong spot</li>
                        </ul>
                    </div>

                    <div className="p-2 bg-green-900/30 border border-green-500/50 rounded">
                        <p className="text-green-400 font-bold">✅ V6 Fix:</p>
                        <ul className="mt-1 space-y-1 text-xs">
                            <li>• 50ms loop checks: <code className="text-purple-300">!isPlayingRef.current</code></li>
                            <li>• When paused: loop skips (no cursor updates)</li>
                            <li>• When playing: loop runs (smooth cursor tracking)</li>
                            <li>• User clicks stay locked in place!</li>
                            <li>• Play button starts from correct position</li>
                        </ul>
                    </div>
                </div>
            </div>

            {audioSource === 'original' && (
                <div className="mt-4 border-2 border-red-500 rounded p-2">
                    <p className="text-xs text-red-400 mb-2">YouTube Player:</p>
                    <div id="ytplayer"></div>
                </div>
            )}
        </div>
    );
}