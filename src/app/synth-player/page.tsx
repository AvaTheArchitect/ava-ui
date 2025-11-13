'use client';

/**
 * STAGE 1.2 - Synth Player with Mobile-First PWA Layout
 * November 13th, 2025
 * NEW IN STAGE 1.2:
 * ✅ Mobile-first CSS Grid architecture (grid-rows-[auto,1fr,auto])
 * ✅ Top menu tray placeholder (for future implementation)
 * ✅ Main content area with overflow-y-auto (scrolls independently)
 * ✅ Fixed bottom menu tray (MaestroControlPanel)
 * ✅ Proper safe-area-inset handling for mobile PWA
 * ✅ Responsive breakpoints (md: and lg:)
 * 
 * KEPT FROM STAGE 1+:
 * ✅ MaestroControlPanel integration
 * ✅ All playback controls and state management
 * ✅ Loop, speed, track mixer functionality
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

export default function SynthPlayerPage() {
    // ==================== API & CORE STATE ====================
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ==================== PLAYBACK STATE ====================
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [playerReady, setPlayerReady] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');

    // ==================== LOOP STATE ====================
    const [isLooping, setIsLooping] = useState<boolean>(false);
    const [hasLoopSelection, setHasLoopSelection] = useState<boolean>(false);

    // ==================== TRACK MIXER STATE ====================
    const [trackMuteState, setTrackMuteState] = useState<Map<number, boolean>>(new Map());
    const [trackSoloState, setTrackSoloState] = useState<Map<number, boolean>>(new Map());

    // ==================== THEME STATE ====================
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // ==================== TIME TRACKING ====================
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    // Update display every 500ms to avoid excessive re-renders
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // ==================== EVENT HANDLERS ====================
    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ STAGE1.2: API Ready');
        setApi(alphaTabApi);

        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ STAGE1.2: Player Ready');
                setPlayerReady(true);
            });
        }

        if (alphaTabApi.playerStateChanged) {
            alphaTabApi.playerStateChanged.on((e: any) => {
                setIsPlaying(e.state === 1);
            });
        }

        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime;
                durationRef.current = e.endTime;
            });
        }
    }, []);

    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ STAGE1.2: Score loaded - ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ STAGE1.2: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    const handlePlayPause = useCallback(() => {
        if (!api) return;
        if (isPlaying) {
            api.pause();
        } else {
            api.play();
        }
    }, [api, isPlaying]);

    const handleStop = useCallback(() => {
        if (!api) return;
        api.stop();
        currentTimeRef.current = 0;
        setDisplayTime(0);
        setIsPlaying(false);
    }, [api]);

    const handleTrackChange = useCallback((trackIndex: number) => {
        if (api?.score?.tracks) {
            console.log(`🔄 STAGE1.2: Track ${trackIndex}`);
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    }, [api]);

    const handleLoopToggle = useCallback(() => {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (!newLoopState) {
            setHasLoopSelection(false);
            if (api?.playbackRange !== undefined) {
                api.playbackRange = null;
            }
            console.log('🔄 Loop disabled');
        } else {
            console.log('🔄 Loop enabled');
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number, end: number) => {
        if (!api) return;
        setHasLoopSelection(true);
        api.playbackRange = { startTick: start, endTick: end };
        console.log(`🔁 Loop range: ${start} - ${end}`);
    }, [api]);

    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) {
            api.playbackSpeed = speed;
            console.log(`🎚️ Speed: ${Math.round(speed * 100)}%`);
        }
    }, [api]);

    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        console.log(`🎵 Audio: ${source}`);
    }, []);

    const handleTrackMuteToggle = useCallback((trackIndex: number) => {
        if (!api || !api.score) return;
        const track = api.score.tracks[trackIndex];
        const isMuted = trackMuteState.get(trackIndex) || false;
        api.changeTrackMute([track], !isMuted);
        setTrackMuteState(prev => {
            const newMap = new Map(prev);
            newMap.set(trackIndex, !isMuted);
            return newMap;
        });
        console.log(`${!isMuted ? '🔇' : '🔊'} ${track.name}`);
    }, [api, trackMuteState]);

    const handleTrackSoloToggle = useCallback((trackIndex: number) => {
        if (!api || !api.score) return;
        const track = api.score.tracks[trackIndex];
        const isSoloed = trackSoloState.get(trackIndex) || false;
        api.changeTrackSolo([track], !isSoloed);
        setTrackSoloState(prev => {
            const newMap = new Map(prev);
            if (!isSoloed) {
                prev.forEach((_, key) => newMap.set(key, key === trackIndex));
            } else {
                newMap.set(trackIndex, false);
            }
            return newMap;
        });
        console.log(`${!isSoloed ? '🎯' : '👥'} Solo ${track.name}`);
    }, [api, trackSoloState]);

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        console.log(`🎨 Theme: ${newTheme}`);
    }, [theme]);

    // ==================== SCROLL CONTAINER REF ====================
    // CRITICAL: Pass this to AlphaTab so it knows where to scroll
    const mainScrollContainerRef = useRef<HTMLElement>(null);

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[auto,1fr,auto] bg-gradient-to-br from-purple-900 via-gray-900 to-black">
            {/* ==================== TOP MENU TRAY (PLACEHOLDER) ==================== */}
            <header className="w-full bg-gray-900/95 border-b border-purple-500/30 backdrop-blur-sm">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Left: Back/Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Back"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Center: Song Title (Desktop only) */}
                    <div className="hidden md:block text-center flex-1">
                        <h1 className="text-lg font-bold text-white truncate">
                            {songInfo ? `${songInfo.artist} - ${songInfo.title}` : 'Maestro Guitar Tab Player'}
                        </h1>
                        <p className="text-xs text-gray-400">Stage 1.2 - Mobile-First PWA</p>
                    </div>

                    {/* Right: Settings/More */}
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="Star"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </button>
                        <button
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden"
                            title="More options"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" className="text-gray-400" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* ==================== MAIN CONTENT AREA ==================== */}
            <main 
                ref={mainScrollContainerRef}
                className="w-full overflow-y-auto pb-32"
            >
                {/* 👆 pb-32 (128px) outer padding for menu clearance */}
                <div className="max-w-7xl mx-auto p-4 space-y-4 pb-24">
                    {/* 👆 pb-24 (96px) inner padding = 224px total clearance */}
                    {/* Mobile Title (shown only on mobile) */}
                    <div className="md:hidden text-center mb-4">
                        <h2 className="text-xl font-bold text-white truncate">
                            {songInfo ? songInfo.title : 'Loading...'}
                        </h2>
                        <p className="text-sm text-gray-400">{songInfo?.artist || 'Maestro Player'}</p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <h3 className="text-red-400 font-bold mb-2">Error</h3>
                            <p className="text-red-300">{error}</p>
                        </div>
                    )}

                    {/* AlphaTab Renderer */}
                    <div id="maestro-player" className="bg-white rounded-xl shadow-2xl">
                        <AlphaTabRenderer
                            fileUrl="/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3"
                            playerMode="synthesizer"
                            soundFontPath="/soundfont/sonivox.sf2"
                            scrollContainerRef={mainScrollContainerRef}
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRenderFinished={handleRenderFinished}
                            onError={handleError}
                            minHeight="600px"
                            isLooping={isLooping}
                            onLoopRangeChange={handleLoopRangeChange}
                        />
                    </div>

                    {/* Debug Panel (hidden on mobile, visible on desktop) */}
                    <div className="hidden lg:block">
                        <DebugPanel
                            api={api}
                            currentTime={displayTime}
                            isPlaying={isPlaying}
                        />
                    </div>
                </div>
            </main>

            {/* ==================== BOTTOM MENU TRAY ==================== */}
            <footer className="w-full">
                {playerReady && (
                    <MaestroControlPanel
                        api={api}
                        isPlaying={isPlaying}
                        currentTime={displayTime}
                        duration={displayDuration}
                        playbackSpeed={playbackSpeed}
                        tracks={tracks}
                        selectedTrack={selectedTrack}
                        songInfo={songInfo}
                        isLooping={isLooping}
                        hasLoopSelection={hasLoopSelection}
                        audioSource={audioSource}
                        trackMuteState={trackMuteState}
                        trackSoloState={trackSoloState}
                        theme={theme}
                        onPlayPause={handlePlayPause}
                        onStop={handleStop}
                        onLoopToggle={handleLoopToggle}
                        onLoopRangeChange={handleLoopRangeChange}
                        onSpeedChange={handleSpeedChange}
                        onTrackChange={handleTrackChange}
                        onAudioSourceChange={handleAudioSourceChange}
                        onTrackMuteToggle={handleTrackMuteToggle}
                        onTrackSoloToggle={handleTrackSoloToggle}
                        onThemeToggle={handleThemeToggle}
                    />
                )}
            </footer>
        </div>
    );
}