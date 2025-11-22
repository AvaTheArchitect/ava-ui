'use client';

/**
 * STAGE 2 - Song Selection Integration
 * November 21st, 2025 - V93: SONG SELECTOR + TOP MENU TRAY
 * 
 * 🆕 NEW IN V93:
 * ✅ Integrated TopMenuTray (replaces old header)
 * ✅ Added SongSelector modal with tabs (All Songs, Favorites, Playlists)
 * ✅ Dynamic song loading via currentFileUrl
 * ✅ Playlist management (create, add/remove songs)
 * ✅ Favorite toggling with star button
 * ✅ Song state persistence (in-memory for now)
 * 
 * 🔒 PRESERVED FROM V92:
 * ✅ Loop functionality (isLooping, hasLoopSelection)
 * ✅ Mobile landscape detection
 * ✅ Auto-hide header behavior
 * ✅ All playback controls (play/pause, stop, speed, etc.)
 * ✅ Track mixer (mute/solo)
 * ✅ Theme toggle
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray } from '@/components/audio/maestro/layout';
import { SongSelector } from '@/components/audio/maestro/songs';
import {
    loadInitialSongData,
    getSongById,
    SongState,
    SongItem
} from '@/lib/song-data';
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

    // ==================== V93: SONG STATE MANAGEMENT ====================
    const [songState, setSongState] = useState<SongState>(() => loadInitialSongData());
    const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);

    // Get current song from state
    const currentSong = useMemo(() => {
        return getSongById(songState.songs, songState.currentSongId || '');
    }, [songState.songs, songState.currentSongId]);

    // Dynamic file URL for AlphaTabRenderer
    const currentFileUrl = currentSong?.fileUrl || '/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3';

    // ==================== AUTO-HIDE HEADER STATE ====================
    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
    const lastScrollY = useRef<number>(0);

    // ==================== MOBILE LANDSCAPE DETECTION ====================
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

    // ==================== SCROLL HANDLER - LOCKS HEADER DURING PLAYBACK ====================
    const handleScroll = useCallback(() => {
        if (!mainScrollContainerRef.current) return;

        // Lock header hidden during playback (prevents stuttering)
        if (isPlaying) {
            setIsHeaderVisible(false);
            lastScrollY.current = mainScrollContainerRef.current.scrollTop;
            return; // Exit early - don't process scroll during playback
        }

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
    }, [isPlaying]);

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

    // ==================== ORIENTATION DETECTION ====================
    useEffect(() => {
        const checkOrientation = () => {
            // Only enable landscape mode on mobile/touch devices
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isLandscape = window.matchMedia('(orientation: landscape)').matches;

            // Check HEIGHT not WIDTH for landscape detection
            // Landscape phones always have height < 600px, regardless of width
            const isCompactHeight = window.innerHeight < 600;

            // Only set landscape mode if ALL THREE conditions are met
            setIsMobileLandscape(isTouchDevice && isLandscape && isCompactHeight);

            console.log(`🔄 V93: Orientation check - Touch:${isTouchDevice}, Landscape:${isLandscape}, Height:${window.innerHeight}, MobileLandscape:${isTouchDevice && isLandscape && isCompactHeight}`);
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
        console.log('✅ V93: API Ready');
        setApi(alphaTabApi);

        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ V93: Player Ready');
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
        console.log(`✅ V93: Score loaded - ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ V93: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V93 ERROR: ${errorMsg}`);
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
            console.log(`🔄 V93: Track ${trackIndex}`);

            // Clear loop when changing tracks (temporary until measure-based loop)
            if (isLooping && api.playbackRange) {
                api.playbackRange = null;
                setHasLoopSelection(false);
                console.log('🔄 V93: Cleared loop on track change');
            }

            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    }, [api, isLooping]);

    // ==================== LOOP HANDLERS ====================
    const handleLoopToggle = useCallback(() => {
        if (!api) return;

        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (newLoopState) {
            console.log('🔄 V93 (page.tsx): Loop enabled');
        } else {
            console.log('🔄 V93 (page.tsx): Loop disabled');
            setHasLoopSelection(false);

            if (api.playbackRange) {
                api.playbackRange = null;
            }
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number | null, end: number | null) => {
        if (start !== null && end !== null) {
            setHasLoopSelection(true);
            console.log(`🔁 V93 (page.tsx): Loop selection active: ${start} - ${end}`);
        } else {
            setHasLoopSelection(false);
            console.log('🔁 V93 (page.tsx): Loop selection cleared');
        }
    }, []);

    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) {
            api.playbackSpeed = speed;
            console.log(`🎚️ V93: Speed: ${Math.round(speed * 100)}%`);
        }
    }, [api]);

    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        console.log(`🎵 V93: Audio: ${source}`);
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
        console.log(`${!isMuted ? '🔇' : '🔊'} V93: ${track.name}`);
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
        console.log(`${!isSoloed ? '🎯' : '👥'} V93: Solo ${track.name}`);
    }, [api, trackSoloState]);

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        console.log(`🎨 V93: Theme: ${newTheme}`);
    }, [theme]);

    // ==================== V93: SONG HANDLERS ====================
    const handleSongSelect = useCallback((songId: string) => {
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
        console.log('🎵 V93: Song selected:', songId);
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(song =>
                song.id === songId ? { ...song, isFavorite: !song.isFavorite } : song
            )
        }));
        console.log('⭐ V93: Favorite toggled:', songId);
    }, []);

    const handleCreatePlaylist = useCallback((name: string) => {
        const newPlaylist = {
            id: `playlist-${Date.now()}`,
            name: name,
            songIds: [],
            createdAt: Date.now()
        };
        setSongState(prev => ({
            ...prev,
            playlists: [...prev.playlists, newPlaylist]
        }));
        console.log('📁 V93: Playlist created:', name);
    }, []);

    const handlePlaylistAction = useCallback((
        type: 'add' | 'remove',
        songId: string,
        playlistId: string
    ) => {
        setSongState(prev => ({
            ...prev,
            playlists: prev.playlists.map(playlist => {
                if (playlist.id === playlistId) {
                    const songExists = playlist.songIds.includes(songId);

                    if (type === 'add' && !songExists) {
                        return { ...playlist, songIds: [...playlist.songIds, songId] };
                    }

                    if (type === 'remove' && songExists) {
                        return { ...playlist, songIds: playlist.songIds.filter(id => id !== songId) };
                    }
                }
                return playlist;
            })
        }));
        console.log(`📁 V93: ${type === 'add' ? 'Added to' : 'Removed from'} playlist:`, playlistId);
    }, []);

    // ==================== DYNAMIC USER INTERACTION CONTROL ====================
    useEffect(() => {
        if (!api) return;

        // Dynamically enable/disable user interaction based on loop state
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();

        console.log(`🔄 V93: api.settings.player.enableUserInteraction set to ${isLooping}`);

    }, [api, isLooping]);

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">
            {/* Grid: 0px header, flexible main, 0px footer (both fixed outside flow) */}

            {/* ==================== V93: TOP MENU TRAY (FIXED HEADER) ==================== */}
            <div
                className={`
                    fixed top-0 inset-x-0 w-full z-50
                    transform transition-transform duration-300 ease-in-out
                    ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}
                `}
            >
                <TopMenuTray
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => setIsSongSelectorOpen(true)}
                />
            </div>

            {/* ==================== V93: SONG SELECTOR MODAL ==================== */}
            <SongSelector
                isOpen={isSongSelectorOpen}
                onClose={() => setIsSongSelectorOpen(false)}
                songs={songState.songs}
                playlists={songState.playlists}
                currentSongId={songState.currentSongId}
                onSongSelect={handleSongSelect}
                onToggleFavorite={handleToggleFavorite}
                onPlaylistAction={handlePlaylistAction}
                onCreatePlaylist={handleCreatePlaylist}
            />

            {/* ==================== MAIN CONTENT - DYNAMIC PADDING ==================== */}
            <main
                ref={mainScrollContainerRef}
                className={`
                    w-full pb-32 overscroll-y-contain
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

                {/* Canvas wrapper */}
                <div
                    id="maestro-player"
                    className={`
                        bg-white
                        ${isMobileLandscape ? 'min-w-[200vw] inline-block' : 'w-full'}
                    `}
                >
                    <AlphaTabRenderer
                        fileUrl={currentFileUrl}
                        playerMode="synthesizer"
                        soundFontPath="/soundfont/sonivox.sf2"
                        scrollContainerRef={mainScrollContainerRef}
                        isMobileLandscape={isMobileLandscape}
                        onApiReady={handleApiReady}
                        onScoreLoaded={handleScoreLoaded}
                        onRenderFinished={handleRenderFinished}
                        onError={handleError}
                        minHeight="600px"
                        isLooping={isLooping}
                        onLoopRangeChange={handleLoopRangeChange}
                    />
                </div>

                {/* Practice Notes - HIDDEN IN MOBILE LANDSCAPE */}
                {!isMobileLandscape && (
                    <div className="px-4 mt-8">
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
                )}

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

            {/* ==================== FIXED FOOTER (OUTSIDE GRID FLOW) ==================== */}
            <footer className="fixed bottom-0 inset-x-0 w-full z-50">
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
                        isMobileLandscape={isMobileLandscape}
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