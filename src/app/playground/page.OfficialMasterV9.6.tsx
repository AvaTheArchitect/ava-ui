'use client';

/**
 * AlphaTab + YouTube Playground - V9.6: FIX SEEKING REF RACE CONDITION
 * December 13th, 2025
 * 
 * 🔧 V9.6 CRITICAL FIX:
 * ✅ Set isSeekingRef.current = true SYNCHRONOUSLY in handler.seekTo()
 * ✅ This prevents 50ms loop from running before React state updates
 * ✅ Fixes: Cursor jumping when clicking while playing
 * ✅ The race condition: setIsSeeking(true) is async, ref update via useEffect is also async
 * 
 * **The Race Condition (V9.5):**
 * 1. handler.seekTo() calls setIsSeeking(true) - ASYNC
 * 2. 50ms loop runs, checks isSeekingRef.current - still FALSE!
 * 3. Loop updates cursor to OLD position
 * 4. useEffect runs, sets isSeekingRef.current = true - TOO LATE!
 * 
 * **The Fix (V9.6):**
 * 1. handler.seekTo() sets isSeekingRef.current = true - SYNC!
 * 2. 50ms loop runs, checks isSeekingRef.current - TRUE! ✅
 * 3. Loop skips update, cursor stays at seek position
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

    // Volume management for mode switching
    useEffect(() => {
        if (!apiRef.current) return;

        if (audioSource === 'original') {
            previousVolumeRef.current = apiRef.current.masterVolume || 1.0;
            apiRef.current.masterVolume = 0;
            console.log('🔇 V9.6: Synth muted for original mode');
        } else {
            apiRef.current.masterVolume = previousVolumeRef.current;
            console.log('🔊 V9.6: Synth volume restored');
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
                console.log(`🎚️ V9.6: Setting playback rate: ${rate}`);
                youtubePlayerRef.current?.setPlaybackRate?.(rate);
            },
            get masterVolume() {
                return ((youtubePlayerRef.current?.getVolume?.() || 100) / 100);
            },
            set masterVolume(vol: number) {
                console.log(`🔊 V9.6: Setting volume: ${vol}`);
                youtubePlayerRef.current?.setVolume?.(vol * 100);
            },
            seekTo(ms: number) {
                // 🔧 V9.6 CRITICAL FIX: Set ref SYNCHRONOUSLY before async state update!
                isSeekingRef.current = true;
                console.log(`🔒 V9.6: isSeekingRef.current = true (SYNC)`);
                
                setIsSeeking(true); // Async state update

                const sec = ms / 1000 + videoStartOffset;
                const YT = (window as any).YT;
                const state = youtubePlayerRef.current?.getPlayerState?.();

                if (state !== YT?.PlayerState.PAUSED && state !== YT?.PlayerState.PLAYING) {
                    // Player not ready - defer seek
                    initialSeekRef.current = sec;
                    console.log(`⏱️ V9.6: Deferring seek to ${sec.toFixed(2)}s (player not ready, state=${state})`);
                } else {
                    // Player ready - seek immediately AND clear deferred seek!
                    youtubePlayerRef.current?.seekTo?.(sec, true);
                    initialSeekRef.current = -1;
                    console.log(`🔁 V9.6: Immediate seek to ${sec.toFixed(2)}s (state=${state}, deferred CLEARED)`);
                }
            },
            play() {
                console.log('▶️ V9.6: Handler play()');
                
                // Apply deferred seek on play (only if still pending)
                if (initialSeekRef.current >= 0) {
                    console.log(`⏱️ V9.6: Applying deferred seek to ${initialSeekRef.current}s on play`);
                    youtubePlayerRef.current?.seekTo?.(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                } else {
                    console.log('✅ V9.6: No deferred seek pending');
                }
                
                youtubePlayerRef.current?.playVideo?.();
            },
            pause() {
                console.log('⏸️ V9.6: Handler pause()');
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
            console.log('✅ V9.6: YouTube API Ready');
            initYouTubePlayer();
        };
    }, [audioSource]);

    const initYouTubePlayer = () => {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;
        if (youtubePlayerRef.current) return;

        // Store initial seek instead of applying it
        initialSeekRef.current = videoStartOffset;
        console.log(`⏱️ V9.6: Initial seek deferred to ${videoStartOffset}s`);

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
                    console.log('✅ V9.6: YouTube Player Ready (no auto-seek)');
                    setIsYouTubeReady(true);
                    setIsSeeking(false);
                    isSeekingRef.current = false;
                },
                onStateChange: (event: any) => {
                    const YT = (window as any).YT;
                    console.log(`🎬 V9.6: YouTube State: ${event.data} (Seeking: ${isSeekingRef.current})`);

                    // Update playing state
                    if (event.data === YT.PlayerState.PLAYING) {
                        setIsPlaying(true);
                        isPlayingRef.current = true;
                        console.log('▶️ V9.6: isPlaying = true');
                    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                        console.log('⏸️ V9.6: isPlaying = false');
                    }

                    // Clear seeking state
                    if (isSeekingRef.current) {
                        if (!seekStabilizeTimeoutRef.current && 
                            (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED)) {
                            console.log(`⏱️ V9.6: Starting 500ms seek stabilization timer`);
                            seekStabilizeTimeoutRef.current = setTimeout(() => {
                                console.log('✅ V9.6: Seek stabilized');
                                setIsSeeking(false);
                                isSeekingRef.current = false;
                                seekStabilizeTimeoutRef.current = null;
                            }, 500);
                        }
                        return;
                    }

                    // Sync AlphaTab state
                    if (apiRef.current) {
                        if (event.data === YT.PlayerState.PLAYING) {
                            apiRef.current.play();
                            console.log('▶️ V9.6: AlphaTab PLAY sync');
                        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                            apiRef.current.pause();
                            console.log('⏸️ V9.6: AlphaTab PAUSE sync');
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
            console.log('🔗 V9.6: Attaching YouTube handler to AlphaTab');
            output.handler = youTubeHandlerInstance;
            console.log('✅ V9.6: Handler attached');
        } else {
            if (output.handler) {
                output.handler = null;
                console.log('🔌 V9.6: Handler detached');
            }
        }
    }, [audioSource, isYouTubeReady, youTubeHandlerInstance]);

    // 50ms Cursor Sync - ONLY WHEN PLAYING!
    useEffect(() => {
        if (!apiRef.current?.player?.output || audioSource !== 'original' || !isYouTubeReady) {
            return;
        }

        const output = apiRef.current.player.output as any;

        if (typeof output.updatePosition !== 'function') {
            console.error('❌ V9.6: output.updatePosition is not a function!');
            return;
        }

        console.log('🔄 V9.6: Starting 50ms cursor sync loop');

        const interval = setInterval(() => {
            // 🔧 V9.6: Check ref directly (synchronously updated in handler.seekTo)
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
                    console.error('❌ V9.6: updatePosition error:', err);
                }
            }
        }, 50);

        return () => {
            console.log('⏹️ V9.6: Stopping cursor sync loop');
            clearInterval(interval);
        };
    }, [audioSource, isYouTubeReady, videoStartOffset]);

    // Ensure handler attached when player ready
    useEffect(() => {
        if (!apiRef.current || !playerReady || !apiRef.current.player?.output) return;

        const output = apiRef.current.player.output as any;

        if (audioSource === 'original' && isYouTubeReady && youTubeHandlerInstance) {
            output.handler = youTubeHandlerInstance;
            console.log('🔗 V9.6: Handler attached/verified on player ready');
        }

        return () => {
            if (apiRef.current?.player?.output) {
                const output = apiRef.current.player.output as any;
                if (output.handler) {
                    output.handler = null;
                    console.log('🔌 V9.6: Handler detached on cleanup');
                }
            }
        };
    }, [apiRef.current, playerReady, audioSource, isYouTubeReady, youTubeHandlerInstance]);

    const handlePlay = () => {
        console.log('🎮 V9.6: Play button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current || !apiRef.current) {
                console.warn('⚠️ V9.6: YouTube or API not ready');
                return;
            }

            const output = apiRef.current.player?.output as any;

            if (output?.handler) {
                // Play YouTube (applies deferred seek if needed)
                if (output.handler.play) {
                    output.handler.play();
                    console.log('▶️ V9.6: YouTube play() via handler');
                }

                // Activate AlphaTab's playback engine
                apiRef.current.play();
                console.log('▶️ V9.6: AlphaTab play() - activates purple notation + auto-scroll');
            } else {
                console.warn('⚠️ V9.6: Handler not available');
            }
        } else {
            if (!apiRef.current) {
                console.warn('⚠️ V9.6: API not ready');
                return;
            }
            apiRef.current.play();
        }
    };

    const handlePause = () => {
        console.log('🎮 V9.6: Pause button clicked, mode:', audioSource);

        if (audioSource === 'original') {
            if (!youtubePlayerRef.current) {
                console.warn('⚠️ V9.6: YouTube not ready');
                return;
            }
            youtubePlayerRef.current.pauseVideo?.();
        } else {
            if (!apiRef.current) {
                console.warn('⚠️ V9.6: API not ready');
                return;
            }
            apiRef.current.pause();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-black border-b border-purple-500/30 pb-4 pt-4">
                <div className="max-w-5xl mx-auto px-4 space-y-4">
                    <h1 className="text-xl font-bold text-center">🎸 AlphaTab + YouTube Playground (V9.6 - SYNC REF FIX!)</h1>

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
                {/* Fixed height scrollable container */}
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
                            console.log('✅ V9.6: AlphaTab API Ready');
                            apiRef.current = api;
                            setApiReady(true);

                            if (api.playerReady) {
                                api.playerReady.on(() => {
                                    console.log('✅ V9.6: AlphaTab Player Ready');
                                    setPlayerReady(true);

                                    if (audioSource === 'original' && isYouTubeReady && api.player?.output) {
                                        const output = api.player.output as any;
                                        output.handler = youTubeHandlerInstance;
                                        console.log('🔗 V9.6: Handler attached on player ready');
                                    }
                                });
                            }
                        }}
                        onScoreLoaded={() => console.log('✅ V9.6: Score loaded')}
                        onRenderFinished={() => console.log('✅ V9.6: Render finished')}
                        onError={(err) => console.error('❌ V9.6: Error:', err)}
                        minHeight="600px"
                    />
                </div>

                {/* Fix Explanation Box */}
                <div className="p-4 bg-gray-900 border border-green-500 rounded mb-4">
                    <h3 className="text-green-400 font-bold mb-2">✅ V9.6 Fix: Synchronous Seeking Ref!</h3>
                    <div className="text-xs space-y-2 text-gray-300">
                        <div className="p-2 bg-red-900/30 border border-red-500/50 rounded">
                            <p className="text-red-400 font-bold">❌ V9.5 Race Condition:</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>1. handler.seekTo() calls <code>setIsSeeking(true)</code> - ASYNC!</li>
                                <li>2. 50ms loop runs, checks <code>isSeekingRef.current</code> - still FALSE!</li>
                                <li>3. Loop calls updatePosition() with OLD time - cursor jumps back!</li>
                                <li>4. useEffect updates ref - TOO LATE!</li>
                            </ul>
                        </div>

                        <div className="p-2 bg-green-900/30 border border-green-500/50 rounded">
                            <p className="text-green-400 font-bold">✅ V9.6 Fix:</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>1. handler.seekTo() sets <code className="text-purple-300">isSeekingRef.current = true</code> - SYNC! ✅</li>
                                <li>2. 50ms loop runs, checks ref - TRUE! Skips update! ✅</li>
                                <li>3. Cursor stays at seeked position ✅</li>
                            </ul>
                        </div>

                        <div className="p-2 bg-purple-900/30 border border-purple-500/50 rounded">
                            <p className="text-purple-400 font-bold">🧪 What to Test:</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>1. Press Play, then single-click m3 → cursor should move AND stay! ✅</li>
                                <li>2. Double-click m5 → should play from m5, no jump! ✅</li>
                                <li>3. While paused, click around → cursor should move immediately ✅</li>
                                <li>4. Watch for <code className="text-green-300">🔒 V9.6: isSeekingRef.current = true (SYNC)</code></li>
                            </ul>
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