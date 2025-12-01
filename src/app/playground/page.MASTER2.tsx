'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';

// Date for Records: November 29th, 2025 - FINAL MASTER BLUEPRINT w/ HIDDEN SEEK REMOVED

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

type AudioSource = 'synth' | 'original';

export default function PlaygroundPage() {
    const apiRef = useRef<any>(null);
    const youtubePlayerRef = useRef<any>(null);
    const [audioSource, setAudioSource] = useState<AudioSource>('synth');
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const previousVolumeRef = useRef<number>(1.0);
    const isSeekingRef = useRef<boolean>(false);
    const seekStabilizeTimeoutRef = useRef<number | null>(null);
    const lastSeekTimeRef = useRef<number>(0);
    const initialSeekRef = useRef<number>(-1); // 🎯 Persistent ref for initialSeek guard
    const SEEK_COOLDOWN_MS = 100;
    const updateTimerRef = useRef<number | null>(null);

    const fileUrl = '/data/sample-songs/real-songs/extreme-rise/extreme-rise.gp5';
    const videoId = 'iJ_AOIbj8AA';
    const videoStartOffset = 4;

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

    useEffect(() => {
        if (audioSource !== 'original') {
            setIsYouTubeReady(false);
            if (youtubePlayerRef.current?.destroy) {
                youtubePlayerRef.current.destroy();
                youtubePlayerRef.current = null;
            }
            if (updateTimerRef.current !== null) {
                window.clearInterval(updateTimerRef.current);
                updateTimerRef.current = null;
            }
            initialSeekRef.current = -1; // Reset initialSeek when switching away
            return;
        }

        if (window.YT && window.YT.Player) {
            initYouTubePlayer();
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0] || document.body;
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ YouTube API Ready');
            initYouTubePlayer();
        };
    }, [audioSource]);

    const startUpdateLoop = (api: any, player: any) => {
        if (updateTimerRef.current !== null) {
            window.clearInterval(updateTimerRef.current);
        }
        console.log('🔄 Starting cursor update loop (YouTube → AlphaTab)');
        updateTimerRef.current = window.setInterval(() => {
            if (isSeekingRef.current) return;
            if (!player?.getCurrentTime || !api?.player?.output?.updatePosition) return;
            const ytTime = player.getCurrentTime();
            const adjustedTime = Math.max(0, ytTime - videoStartOffset);
            const timeMs = adjustedTime * 1000;
            (api.player.output as any).updatePosition(timeMs);
        }, 50);
    };

    const initYouTubePlayer = () => {
        const YT = window.YT;
        if (!YT || !YT.Player || youtubePlayerRef.current) return;
        const container = document.getElementById('ytplayer');
        if (!container) return;

        youtubePlayerRef.current = new YT.Player(container, {
            videoId,
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
                    console.log('✅ YouTube Player Ready');
                    setIsYouTubeReady(true);
                    // ✅ REMOVED: Unguarded seekTo(videoStartOffset) - was causing autoplay [web:56]
                    if (apiRef.current) startUpdateLoop(apiRef.current, event.target);
                },
                onStateChange: (event: any) => {
                    const YT = window.YT;
                    const state = event.data;
                    console.log(`🎬 YouTube State: ${state} (Seeking: ${isSeekingRef.current})`);

                    if (isSeekingRef.current) {
                        if (seekStabilizeTimeoutRef.current !== null) {
                            window.clearTimeout(seekStabilizeTimeoutRef.current);
                        }
                        if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED) {
                            seekStabilizeTimeoutRef.current = window.setTimeout(() => {
                                console.log('✅ Seek stabilized, resuming cursor sync');
                                isSeekingRef.current = false;
                                if (apiRef.current?.player?.output && youtubePlayerRef.current) {
                                    const output = apiRef.current.player.output as any;
                                    const ytTime = youtubePlayerRef.current.getCurrentTime();
                                    const adjustedTime = Math.max(0, ytTime - videoStartOffset);
                                    const timeMs = adjustedTime * 1000;
                                    output.updatePosition?.(timeMs);
                                    console.log(`🎯 Force cursor sync to: ${Math.round(timeMs)}ms`);
                                }
                            }, 200);
                        }
                        return;
                    }

                    if (apiRef.current) {
                        if (state === YT.PlayerState.PLAYING) {
                            apiRef.current.play();
                            console.log('▶️ AlphaTab PLAY sync');
                            if (youtubePlayerRef.current) startUpdateLoop(apiRef.current, youtubePlayerRef.current);
                        } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
                            apiRef.current.pause();
                            console.log('⏸️ AlphaTab PAUSE sync');
                        }
                    }
                },
            },
        });
    };

    useEffect(() => {
        if (!apiRef.current || !apiRef.current.player?.output) return;
        const output = apiRef.current.player.output as any;

        if (audioSource === 'original' && isYouTubeReady && youtubePlayerRef.current) {
            console.log('🔗 Attaching YouTube handler w/ initialSeekRef AUTO-PLAY FIX');
            const YT = window.YT;

            // Reset initialSeek when attaching new handler
            initialSeekRef.current = -1;

            output.handler = {
                get backingTrackDuration() {
                    return (youtubePlayerRef.current?.getDuration?.() || 0) * 1000;
                },
                get playbackRate() {
                    return youtubePlayerRef.current?.getPlaybackRate?.() || 1;
                },
                set playbackRate(rate: number) {
                    console.log(`🎚️ Playback rate: ${rate}`);
                    youtubePlayerRef.current?.setPlaybackRate?.(rate);
                },
                get masterVolume() {
                    return (youtubePlayerRef.current?.getVolume?.() || 100) / 100;
                },
                set masterVolume(vol: number) {
                    console.log(`🔊 Volume: ${vol}`);
                    youtubePlayerRef.current?.setVolume?.(vol * 100);
                },
                seekTo(ms: number) {
                    if (!youtubePlayerRef.current) return;

                    // 🎯 FIX 1: DEBOUNCE - Block seeks faster than 100ms
                    const now = Date.now();
                    if (now - lastSeekTimeRef.current < SEEK_COOLDOWN_MS) {
                        console.log('⏳ Seek debounced');
                        return;
                    }
                    lastSeekTimeRef.current = now;

                    isSeekingRef.current = true;

                    const player = youtubePlayerRef.current;
                    const seconds = ms / 1000 + videoStartOffset;
                    const state = player.getPlayerState();

                    console.log(`🔁 seekTo: ${seconds.toFixed(3)}s, state=${state}`);

                    // 🎯 FIX 2: INITIAL SEEK GUARD - USE PERSISTENT REF
                    if (state !== YT.PlayerState.PAUSED && state !== YT.PlayerState.PLAYING) {
                        initialSeekRef.current = seconds;
                        console.log(`📍 Stored initialSeek: ${seconds.toFixed(3)}s (prevents autoplay)`);
                    } else {
                        player.seekTo(seconds, true);
                        console.log(`🎯 Executed seekTo: ${seconds.toFixed(3)}s`);
                    }
                },
                play() {
                    if (!youtubePlayerRef.current) return;

                    // 🎯 CRITICAL FIX: Execute stored initialSeek BEFORE playVideo
                    if (initialSeekRef.current >= 0) {
                        console.log(`▶️ Executing stored initialSeek: ${initialSeekRef.current.toFixed(3)}s`);
                        youtubePlayerRef.current.seekTo(initialSeekRef.current, true);
                        initialSeekRef.current = -1; // Reset persistent ref
                    }

                    console.log('▶️ Handler play()');
                    youtubePlayerRef.current.playVideo();
                },
                pause() {
                    if (!youtubePlayerRef.current) return;
                    console.log('⏸️ Handler pause()');
                    youtubePlayerRef.current.pauseVideo();
                },
            };

            console.log('✅ Handler attached w/ initialSeekRef & seek fixes');
            startUpdateLoop(apiRef.current, youtubePlayerRef.current);
        } else {
            if (output.handler) {
                output.handler = null;
                console.log('🔌 Handler detached');
            }
            if (updateTimerRef.current !== null) {
                window.clearInterval(updateTimerRef.current);
                updateTimerRef.current = null;
            }
        }
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    const handlePlay = () => {
        console.log('🎮 Play, mode:', audioSource);
        if (audioSource === 'original') {
            youtubePlayerRef.current?.playVideo?.();
        } else {
            apiRef.current?.play();
        }
    };

    const handlePause = () => {
        console.log('🎮 Pause, mode:', audioSource);
        if (audioSource === 'original') {
            youtubePlayerRef.current?.pauseVideo?.();
        } else {
            apiRef.current?.pause();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
            <h1 className="text-xl font-bold mb-4">AlphaTab + YouTube FINAL MASTER BLUEPRINT</h1>

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
                    audioSource={audioSource}
                    onApiReady={(api) => {
                        console.log('✅ AlphaTab API Ready');
                        apiRef.current = api;
                        setApiReady(true);
                        if (youtubePlayerRef.current) startUpdateLoop(api, youtubePlayerRef.current);
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
                <div className="mt-4 w-full max-w-3xl aspect-video bg-black">
                    <div id="ytplayer" className="w-full h-full" />
                </div>
            )}
        </div>
    );
}
