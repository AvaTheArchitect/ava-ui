'use client';

/**
 * STAGE 3 - YouTube Integration with Dynamic Mode Switching
 * Updated for single AlphaTab instance + proper playerMode switching
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray } from '@/components/audio/maestro/layout';
import { SongSelector } from '@/components/audio/maestro/songs';
import { YouTubePlayer } from '@/components/audio/maestro/media/YouTubePlayer';
import {
    loadInitialSongData,
    getSongById,
    SongState,
} from '@/lib/song-data';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

const SCROLL_THRESHOLD = 50;

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

    // ==================== SONG STATE MANAGEMENT ====================
    const [songState, setSongState] = useState<SongState>(() => loadInitialSongData());
    const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);

    const currentSong = useMemo(() => {
        return getSongById(songState.songs, songState.currentSongId || '');
    }, [songState.songs, songState.currentSongId]);

    const currentFileUrl =
        currentSong?.fileUrl ||
        '/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3';

    // ==================== YOUTUBE PLAYER STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const youtubePlayerRef = useRef<any>(null);
    const youtubeTimeRef = useRef<number>(0); // ms for AlphaTab sync

    const defaultYouTubeId = useMemo(() => {
        const videoId = currentSong?.youtubeVideoId || null;
        console.log(`🎬 Song: ${currentSong?.title} by ${currentSong?.artist}`);
        console.log(`🎬 YouTube ID: ${videoId}`);
        return videoId;
    }, [currentSong]);

    const activeVideoId = currentVideoId || defaultYouTubeId;

    useEffect(() => {
        // reset explicit override when song changes
        setCurrentVideoId(null);
    }, [defaultYouTubeId]);

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

    // Update display every 500ms while playing
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);
        return () => clearInterval(interval);
    }, [isPlaying]);

    // ==================== SCROLL HANDLER ====================
    const handleScroll = useCallback(() => {
        if (!mainScrollContainerRef.current) return;

        if (isPlaying) {
            setIsHeaderVisible(false);
            lastScrollY.current = mainScrollContainerRef.current.scrollTop;
            return;
        }

        const currentScrollY = mainScrollContainerRef.current.scrollTop;
        const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';

        if (scrollDirection === 'down' && currentScrollY > SCROLL_THRESHOLD) {
            setIsHeaderVisible(false);
        } else if (scrollDirection === 'up' || currentScrollY <= SCROLL_THRESHOLD) {
            setIsHeaderVisible(true);
        }

        lastScrollY.current = currentScrollY;
    }, [isPlaying]);

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
            const isTouchDevice =
                'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isLandscape = window.matchMedia('(orientation: landscape)').matches;
            const isCompactHeight = window.innerHeight < 600;
            setIsMobileLandscape(isTouchDevice && isLandscape && isCompactHeight);
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
    const handleApiReady = useCallback(
        (alphaTabApi: AlphaTabApi) => {
            console.log('✅ API Ready');
            setApi(alphaTabApi);

            if (alphaTabApi.playerReady) {
                alphaTabApi.playerReady.on(() => {
                    console.log('✅ Player Ready');
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
                    setDisplayTime(e.currentTime);
                });
            }

            // Beat click → seek YouTube in original mode
            if (alphaTabApi.beatMouseDown) {
                alphaTabApi.beatMouseDown.on((beat: any) => {
                    console.log(
                        `🖱️ Beat clicked, audioSource: ${audioSource}`
                    );
                    if (audioSource === 'original' && youtubePlayerRef.current) {
                        const beatTimeMs = beat.playbackStart; // ms from AlphaTab
                        const ytTimeSeconds =
                            beatTimeMs / 1000 +
                            (currentSong?.videoStartOffset || 0);
                        console.log(
                            `🔁 Seeking YouTube to ${ytTimeSeconds.toFixed(2)}s`
                        );
                        youtubePlayerRef.current.seekTo(ytTimeSeconds, true);
                        youtubeTimeRef.current = beatTimeMs;
                        currentTimeRef.current = beatTimeMs;
                        setDisplayTime(beatTimeMs);
                    }
                });
            }
        },
        [audioSource, currentSong]
    );

    const handleScoreLoaded = useCallback(
        (info: SongInfo, trackList: Track[]) => {
            console.log(`✅ Score loaded - ${info.title}`);
            setSongInfo(info);
            setTracks(trackList);
            setSelectedTrack(0);
            setError(null);
            setTrackMuteState(
                new Map(trackList.map((_, index) => [index, false]))
            );
            setTrackSoloState(
                new Map(trackList.map((_, index) => [index, false]))
            );
        },
        []
    );

    const handleRenderFinished = useCallback(() => {
        console.log('✅ Render complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    // ==================== PLAYBACK CONTROLS ====================
    const handlePlayPause = useCallback(
        () => {
            console.log(
                '🎮 Play button clicked, source:',
                audioSource,
                'ytRef:',
                youtubePlayerRef.current
            );

            if (audioSource === 'original') {
                // control YouTube directly
                if (!youtubePlayerRef.current) return;
                if (isPlaying) {
                    youtubePlayerRef.current.pauseVideo();
                    setIsPlaying(false);
                } else {
                    youtubePlayerRef.current.playVideo();
                    setIsPlaying(true);
                }
            } else {
                // synth mode → AlphaTab
                if (!api) return;
                if (isPlaying) {
                    api.pause();
                } else {
                    api.play();
                }
            }
        },
        [api, isPlaying, audioSource]
    );

    const handleStop = useCallback(
        () => {
            if (audioSource === 'original') {
                if (!youtubePlayerRef.current) return;
                youtubePlayerRef.current.pauseVideo();
                youtubePlayerRef.current.seekTo(
                    currentSong?.videoStartOffset || 0,
                    true
                );
                youtubeTimeRef.current = 0;
                currentTimeRef.current = 0;
                setDisplayTime(0);
            } else {
                if (!api) return;
                api.stop();
                currentTimeRef.current = 0;
                setDisplayTime(0);
            }
            setIsPlaying(false);
        },
        [api, audioSource, currentSong]
    );

    const handleTrackChange = useCallback(
        (trackIndex: number) => {
            if (api?.score?.tracks) {
                console.log(`🔄 Track ${trackIndex}`);

                // stop playback when switching tracks
                if (audioSource === 'original') {
                    youtubePlayerRef.current?.pauseVideo();
                    setIsPlaying(false);
                } else if (isPlaying) {
                    api.stop();
                }

                // clear loop when switching tracks
                if (isLooping && api.playbackRange) {
                    api.playbackRange = null;
                    setHasLoopSelection(false);
                }

                api.renderTracks([api.score.tracks[trackIndex]]);
                setSelectedTrack(trackIndex);
            }
        },
        [api, isLooping, audioSource, isPlaying]
    );

    const handleLoopToggle = useCallback(
        () => {
            if (!api) return;
            const newLoopState = !isLooping;
            setIsLooping(newLoopState);

            if (!newLoopState && api.playbackRange) {
                api.playbackRange = null;
            }
        },
        [api, isLooping]
    );

    const handleLoopRangeChange = useCallback(
        (start: number | null, end: number | null) => {
            setHasLoopSelection(start !== null && end !== null);
        },
        []
    );

    const handleSpeedChange = useCallback(
        (speed: number) => {
            setPlaybackSpeed(speed);
            if (audioSource === 'original') {
                youtubePlayerRef.current?.setPlaybackRate(speed);
            } else if (api) {
                api.playbackSpeed = speed;
            }
            console.log(`🎚️ Speed: ${Math.round(speed * 100)}%`);
        },
        [api, audioSource]
    );

    const handleAudioSourceChange = useCallback(
        (source: 'synth' | 'original') => {
            console.log(`🎵 Audio source → ${source}`);

            // Stop current playback before switching
            if (audioSource === 'original') {
                youtubePlayerRef.current?.pauseVideo();
            } else if (api) {
                api.stop();
            }

            setIsPlaying(false);
            setAudioSource(source);

            if (source === 'original') {
                if (activeVideoId) {
                    setIsYouTubePlayerVisible(true);
                }
            } else {
                setIsYouTubePlayerVisible(false);
            }
        },
        [api, activeVideoId, audioSource]
    );

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        console.log(`🔄 Variant: ${newVideoId}`);
        setCurrentVideoId(newVideoId);
    }, []);

    const handleTrackMuteToggle = useCallback(
        (trackIndex: number) => {
            if (!api || !api.score) return;
            const track = api.score.tracks[trackIndex];
            const isMuted = trackMuteState.get(trackIndex) || false;
            api.changeTrackMute([track], !isMuted);
            setTrackMuteState((prev) => {
                const newMap = new Map(prev);
                newMap.set(trackIndex, !isMuted);
                return newMap;
            });
        },
        [api, trackMuteState]
    );

    const handleTrackSoloToggle = useCallback(
        (trackIndex: number) => {
            if (!api || !api.score) return;
            const track = api.score.tracks[trackIndex];
            const isSoloed = trackSoloState.get(trackIndex) || false;
            api.changeTrackSolo([track], !isSoloed);
            setTrackSoloState((prev) => {
                const newMap = new Map(prev);
                if (!isSoloed) {
                    prev.forEach((_, key) => newMap.set(key, key === trackIndex));
                } else {
                    newMap.set(trackIndex, false);
                }
                return newMap;
            });
        },
        [api, trackSoloState]
    );

    const handleThemeToggle = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    const handleSongSelect = useCallback((songId: string) => {
        setSongState((prev) => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState((prev) => ({
            ...prev,
            songs: prev.songs.map((song) =>
                song.id === songId
                    ? { ...song, isFavorite: !song.isFavorite }
                    : song
            ),
        }));
    }, []);

    const handleCreatePlaylist = useCallback((name: string) => {
        const newPlaylist = {
            id: `playlist-${Date.now()}`,
            name,
            songIds: [],
            createdAt: Date.now(),
        };
        setSongState((prev) => ({
            ...prev,
            playlists: [...prev.playlists, newPlaylist],
        }));
    }, []);

    const handlePlaylistAction = useCallback(
        (type: 'add' | 'remove', songId: string, playlistId: string) => {
            setSongState((prev) => ({
                ...prev,
                playlists: prev.playlists.map((playlist) => {
                    if (playlist.id === playlistId) {
                        const songExists = playlist.songIds.includes(songId);

                        if (type === 'add' && !songExists) {
                            return {
                                ...playlist,
                                songIds: [...playlist.songIds, songId],
                            };
                        }

                        if (type === 'remove' && songExists) {
                            return {
                                ...playlist,
                                songIds: playlist.songIds.filter(
                                    (id) => id !== songId
                                ),
                            };
                        }
                    }
                    return playlist;
                }),
            }));
        },
        []
    );

    // ==================== ENABLE USER INTERACTION (redundant but safe) ====================
    useEffect(() => {
        if (!api) return;
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();
    }, [api, isLooping]);

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">
            <div
                className={`fixed top-0 inset-x-0 w-full z-50 transform transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
                <TopMenuTray
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => setIsSongSelectorOpen(true)}
                />
            </div>

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

            <main
                ref={mainScrollContainerRef}
                className={`w-full pb-32 overscroll-y-contain ${isHeaderVisible ? 'pt-16' : 'pt-0'
                    } ${isMobileLandscape
                        ? 'overflow-x-auto overflow-y-hidden'
                        : 'overflow-y-auto overflow-x-hidden'
                    } transition-[padding] duration-300 ease-in-out`}
            >
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <h3 className="text-red-400 font-bold mb-2">Error</h3>
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                <div
                    id="maestro-player"
                    className={`bg-white ${isMobileLandscape ? 'min-w-[200vw] inline-block' : 'w-full'
                        }`}
                >
                    {/* Single AlphaTab instance; mode controlled via playerMode */}
                    <AlphaTabRenderer
                        fileUrl={currentFileUrl}
                        playerMode={
                            audioSource === 'original' ? 'external' : 'synthesizer'
                        }
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

                {!isMobileLandscape && (
                    <div className="px-4 mt-8">
                        <div className="max-w-4xl mx-auto bg-gray-800/50 border border-purple-500/30 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-purple-300 mb-4">
                                📝 Practice Notes
                            </h3>
                            <div className="space-y-3 text-gray-300">
                                <p className="text-sm">
                                    <strong className="text-white">Strumming:</strong>{' '}
                                    Down, Down-Up, Up-Down-Up
                                </p>
                                <p className="text-sm">
                                    <strong className="text-white">Focus:</strong> Clean
                                    transitions
                                </p>
                                <p className="text-sm text-gray-400 italic">
                                    💡 Use Loop for difficult sections
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="hidden lg:block px-4 mt-4">
                    <DebugPanel
                        api={api}
                        currentTime={displayTime}
                        isPlaying={isPlaying}
                    />
                </div>

                <div className="h-24 px-4"></div>
            </main>

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

            {/* YouTube Player for original mode */}
            {audioSource === 'original' &&
                isYouTubePlayerVisible &&
                activeVideoId && (
                    <YouTubePlayer
                        ref={youtubePlayerRef}
                        videoId={activeVideoId}
                        isVisible={isYouTubePlayerVisible}
                        onClose={() => setIsYouTubePlayerVisible(false)}
                        currentTime={displayTime}
                        isPlaying={isPlaying}
                        onTimeUpdate={(ytTimeMs) => {
                            youtubeTimeRef.current = ytTimeMs;
                            currentTimeRef.current = ytTimeMs;
                            setDisplayTime(ytTimeMs);
                        }}
                        onPlayStateChange={(playing) => {
                            setIsPlaying(playing);
                        }}
                        isMobileLandscape={isMobileLandscape}
                        videoVariants={currentSong?.youtubeVariants}
                        onVariantChange={handleVideoVariantChange}
                        videoStartOffset={currentSong?.videoStartOffset}
                    />
                )}
        </div>
    );
}
