'use client';

/**
 * STAGE 1.2 - Synth Player with Mobile-First PWA Layout
 * November 14th, 2025 - V74: Fixed Header + Landscape Scroll
 * 
 * 🔧 NEW IN V74:
 * ✅ Header now position: fixed (removed from Grid flow)
 * ✅ Grid changed to grid-rows-[0px,1fr,auto] (header height = 0)
 * ✅ Dynamic padding-top on <main> (pt-16 when visible, pt-0 when hidden)
 * ✅ Canvas immediately fills space when header hides (no purple gap)
 * ✅ Simplified landscape overflow logic for horizontal auto-scroll
 * 
 * NEW IN V73:
 * ✅ Added overflow-x-hidden to outermost grid container (prevents desktop overflow)
 * ✅ Fixed orientation detection to only trigger on mobile/touch devices
 * ✅ Desktop now always uses portrait mode (standard vertical scroll)
 * ✅ Mobile landscape uses horizontal scroll with 200vw canvas width
 * 
 * NEW IN V72:
 * ✅ Auto-hide header on scroll (Google AI scroll-and-hide pattern)
 * ✅ Landscape orientation detection and responsive behavior
 * ✅ Hide practice notes in landscape mode (canvas-only view)
 * ✅ Conditional overflow (vertical portrait, horizontal landscape)
 * ✅ Horizontal auto-scroll support for landscape mode
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

// Scroll threshold for hiding header
const SCROLL_THRESHOLD = 50; // px

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

    // ==================== V72: AUTO-HIDE HEADER STATE ====================
    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
    const lastScrollY = useRef<number>(0);

    // ==================== V73: MOBILE-ONLY ORIENTATION STATE ====================
    const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);

    // ==================== TIME TRACKING ====================
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    // ==================== SCROLL CONTAINER REF ====================
    const mainScrollContainerRef = useRef<HTMLElement>(null);

    // Update display every 500ms to avoid excessive re-renders
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // ==================== V72: SCROLL HANDLER (AUTO-HIDE HEADER) ====================
    const handleScroll = useCallback(() => {
        if (!mainScrollContainerRef.current) return;

        const currentScrollY = mainScrollContainerRef.current.scrollTop;
        const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';

        // Hide when scrolling DOWN past threshold
        if (scrollDirection === 'down' && currentScrollY > SCROLL_THRESHOLD) {
            setIsHeaderVisible(false);
        }
        // Show when scrolling UP or at top
        else if (scrollDirection === 'up' || currentScrollY <= SCROLL_THRESHOLD) {
            setIsHeaderVisible(true);
        }

        lastScrollY.current = currentScrollY;
    }, []);

    // Attach scroll listener
    useEffect(() => {
        const scrollElement = mainScrollContainerRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScroll, { passive: true });
        }
        return () => {
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);

    // ==================== V73: MOBILE-ONLY ORIENTATION DETECTION ====================
    useEffect(() => {
        const checkOrientation = () => {
            // Only enable landscape mode on mobile/touch devices
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isLandscape = window.matchMedia('(orientation: landscape)').matches;
            const isSmallScreen = window.innerWidth < 768; // md breakpoint
            
            // Only set landscape mode if ALL THREE conditions are met
            setIsMobileLandscape(isTouchDevice && isLandscape && isSmallScreen);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // ==================== EVENT HANDLERS ====================
    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ V74: API Ready');
        setApi(alphaTabApi);

        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ V74: Player Ready');
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
        console.log(`✅ V74: Score loaded - ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ V74: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V74 ERROR: ${errorMsg}`);
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
            console.log(`🔄 V74: Track ${trackIndex}`);
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
            console.log('🔄 V74: Loop disabled');
        } else {
            console.log('🔄 V74: Loop enabled');
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number, end: number) => {
        if (!api) return;
        setHasLoopSelection(true);
        api.playbackRange = { startTick: start, endTick: end };
        console.log(`🔁 V74: Loop range: ${start} - ${end}`);
    }, [api]);

    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) {
            api.playbackSpeed = speed;
            console.log(`🎚️ V74: Speed: ${Math.round(speed * 100)}%`);
        }
    }, [api]);

    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        console.log(`🎵 V74: Audio: ${source}`);
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
        console.log(`${!isMuted ? '🔇' : '🔊'} V74: ${track.name}`);
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
        console.log(`${!isSoloed ? '🎯' : '👥'} V74: Solo ${track.name}`);
    }, [api, trackSoloState]);

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        console.log(`🎨 V74: Theme: ${newTheme}`);
    }, [theme]);

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[0px,1fr,auto] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">
            {/* 🔧 V74: Grid now has 0px top row, header is position: fixed below ^^^^^^^^ */}
            
            {/* ==================== 🔧 V74: FIXED HEADER (OUTSIDE GRID FLOW) ==================== */}
            <header
                className={`
                    fixed top-0 inset-x-0 w-full z-50
                    bg-gray-900/95 border-b border-purple-500/30 backdrop-blur-sm
                    transform transition-transform duration-300 ease-in-out
                    ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}
                `}
            >
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

            {/* ==================== 🔧 V74: MAIN CONTENT - DYNAMIC PADDING ==================== */}
            <main
                ref={mainScrollContainerRef}
                className={`
                    w-full pb-32
                    ${isHeaderVisible ? 'pt-16' : 'pt-0'}
                    ${isMobileLandscape
                        ? 'overflow-x-auto overflow-y-hidden'
                        : 'overflow-y-auto overflow-x-hidden'
                    }
                    transition-[padding] duration-300 ease-in-out
                `}
            >
                {/* Error Display */}
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <h3 className="text-red-400 font-bold mb-2">Error</h3>
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {/* 🔧 V73: AlphaTab Container - Mobile Landscape-aware width */}
                <div
                    id="maestro-player"
                    className={`
                        bg-white
                        ${isMobileLandscape ? 'min-w-[200vw] inline-block' : 'w-full'}
                    `}
                >
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

                {/* 🔧 V74: Practice Notes - HIDDEN IN MOBILE LANDSCAPE */}
                <div className={`${isMobileLandscape ? 'hidden' : 'block'} px-4 mt-8`}>
                    <div className="max-w-4xl mx-auto bg-gray-800/50 border border-purple-500/30 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-purple-300 mb-4">📝 Practice Notes</h3>
                        <div className="space-y-3 text-gray-300">
                            <p className="text-sm">
                                <strong className="text-white">Strumming Pattern:</strong> Down, Down-Up, Up-Down-Up
                            </p>
                            <p className="text-sm">
                                <strong className="text-white">Key Points:</strong> Focus on clean transitions between chords.
                                Watch finger placement on the bends in measure 157.
                            </p>
                            <p className="text-sm">
                                <strong className="text-white">Practice Tip:</strong> Start at 75% speed and gradually increase
                                tempo as you gain confidence.
                            </p>
                            <p className="text-sm text-gray-400 italic">
                                💡 Use the Loop button to repeat difficult sections
                            </p>
                        </div>
                    </div>
                </div>

                {/* Debug Panel (hidden on mobile, visible on desktop) */}
                <div className="hidden lg:block px-4 mt-4">
                    <DebugPanel
                        api={api}
                        currentTime={displayTime}
                        isPlaying={isPlaying}
                    />
                </div>

                {/* Bottom clearance spacer */}
                <div className="h-24 px-4"></div>
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