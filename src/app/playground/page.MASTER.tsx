'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';

export default function PlaygroundPage() {
    const apiRef = useRef<any>(null);
    const youtubePlayerRef = useRef<any>(null);
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const previousVolumeRef = useRef<number>(1.0);
    const isSeekingRef = useRef<boolean>(false); // Track seek operations
    const seekStabilizeTimeoutRef = useRef<any>(null); // Debounce seek completion

    // Hard-coded test song and video
    const fileUrl = '/data/sample-songs/real-songs/extreme-rise/extreme-rise.gp5';
    const videoId = 'iJ_AOIbj8AA';
    const videoStartOffset = 4; // seconds

    // Volume management for mode switching
    useEffect(() => {
        if (!apiRef.current) return;

        if (audioSource === 'original') {
            // Mute synth in original mode to prevent audio conflicts
            previousVolumeRef.current = apiRef.current.masterVolume || 1.0;
            apiRef.current.masterVolume = 0;
            console.log('🔇 Synth muted for original mode');
        } else {
            // Restore volume in synth mode
            apiRef.current.masterVolume = previousVolumeRef.current;
            console.log('🔊 Synth volume restored');
        }
    }, [audioSource]);

    // Load YouTube IFrame API only when entering "original" mode
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

                    // Handle seek completion with debounce
                    if (isSeekingRef.current) {
                        // Clear any pending stabilization timeout
                        if (seekStabilizeTimeoutRef.current) {
                            clearTimeout(seekStabilizeTimeoutRef.current);
                        }

                        // Check if seek reached stable state
                        if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
                            // Wait 200ms for YouTube to fully stabilize after seek
                            seekStabilizeTimeoutRef.current = setTimeout(() => {
                                console.log('✅ Seek stabilized, resuming cursor sync');
                                isSeekingRef.current = false;
                                
                                // Force immediate cursor position update
                                if (apiRef.current?.player?.output && youtubePlayerRef.current) {
                                    const output = apiRef.current.player.output as any;
                                    const ytTime = youtubePlayerRef.current.getCurrentTime();
                                    const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                                    const timeMs = adjustedTime * 1000;
                                    output.updatePosition?.(timeMs);
                                    console.log(`🎯 Force cursor sync to: ${timeMs.toFixed(0)}ms`);
                                }
                            }, 200);
                        }
                        return;
                    }

                    // Normal sync (not during seek)
                    if (apiRef.current) {
                        if (event.data === YT.PlayerState.PLAYING) {
                            apiRef.current.play();
                            console.log('▶️ AlphaTab PLAY sync (External Media)');
                        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                            apiRef.current.pause();
                            console.log('⏸️ AlphaTab PAUSE sync (External Media)');
                        }
                    }
                },
            },
        });
    };

    // Attach external media handler when in original mode
    useEffect(() => {
        if (!apiRef.current || !apiRef.current.player?.output) return;

        const output = apiRef.current.player.output as any;

        if (audioSource === 'original' && isYouTubeReady) {
            console.log('🔗 Attaching YouTube handler to AlphaTab');

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
                    // 🎯 CRITICAL FIX: Mark seeking to prevent cursor desync
                    isSeekingRef.current = true;
                    
                    // Convert AlphaTab time (relative to score start) to YouTube time (absolute)
                    const sec = ms / 1000 + videoStartOffset;
                    console.log(`🔁 Handler seekTo: ${sec.toFixed(2)}s (seeking flag SET)`);
                    
                    // Seek YouTube - onStateChange will clear the seeking flag
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

            console.log('✅ Handler attached successfully');
        } else {
            if (output.handler) {
                output.handler = null;
                console.log('🔌 Handler detached');
            }
        }
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    // Cursor sync: poll YouTube and feed AlphaTab in original mode
    useEffect(() => {
        if (!apiRef.current?.player?.output || audioSource !== 'original' || !isYouTubeReady) {
            return;
        }

        const output = apiRef.current.player.output as any;
        console.log('🔄 Starting cursor update loop');

        const interval = setInterval(() => {
            // 🎯 CRITICAL: Don't update cursor during seek operations OR if user is clicking
            if (isSeekingRef.current) {
                return;
            }

            if (youtubePlayerRef.current?.getCurrentTime && output.updatePosition) {
                const ytTime = youtubePlayerRef.current.getCurrentTime();
                const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                const timeMs = adjustedTime * 1000;

                // Update AlphaTab cursor position
                output.updatePosition(timeMs);
            }
        }, 50);

        return () => {
            console.log('⏹️ Stopping cursor update loop');
            clearInterval(interval);
        };
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    // Top-level controls: branch on audioSource
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
            // Note: Don't call api.stop() - it resets cursor to start
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
            <h1 className="text-xl font-bold mb-4">AlphaTab + YouTube Playground</h1>

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
                    playerMode="synthesizer"
                    soundFontPath="/soundfont/sonivox.sf2"
                    audioSource={audioSource} // 🎯 CRITICAL: Pass audioSource prop
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
            </div>

            {audioSource === 'original' && (
                <div className="mt-4">
                    <div id="ytplayer"></div>
                </div>
            )}
        </div>
    );
}