'use client';

/**
 * STAGE 4 - Synth + YouTube Deferred Seek Architecture
 * December 15th, 2025 - V98.8: LANDSCAPE SCROLL RESET
 *
 * 🔧 V98.8 LANDSCAPE FIXES:
 * ✅ Reduced padding to pt-[12vh] - staff higher, room for notation
 * ✅ Reset scrollLeft to 0 when entering landscape - keeps M1 visible
 * ✅ Cursor should now be visible at start position
 *
 * 🔧 V98.7 LANDSCAPE FIXES:
 * ✅ Fixed height container (100vh - 80px bottom bar)
 * ✅ No vertical scroll/movement in landscape
 * ✅ Song title overlay in landscape mode
 */

import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from 'react';
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
    const isPlayingRef = useRef<boolean>(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const isSeekingRef = useRef<boolean>(false);
    const seekStabilizeTimeoutRef = useRef<any>(null);
    const [playerReady, setPlayerReady] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');

    // Pause transition flag - ignore seeks during pause
    const pauseTransitionRef = useRef<boolean>(false);

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

    const currentSong = useMemo(
        () => getSongById(songState.songs, songState.currentSongId || ''),
        [songState.songs, songState.currentSongId],
    );

    const currentFileUrl =
        currentSong?.fileUrl ||
        '/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3';

    // ==================== YOUTUBE PLAYER STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const youtubePlayerRef = useRef<any>(null);

    // Deferred seek and post-seek lock
    const initialSeekRef = useRef<number>(-1);
    const postSeekLockUntilRef = useRef<number>(0);

    const defaultYouTubeId = useMemo(() => {
        const videoId = currentSong?.youtubeVideoId || null;
        console.log(`🎬 V98.6: Current song: ${currentSong?.title} by ${currentSong?.artist}`);
        console.log(`🎬 V98.6: YouTube ID: ${videoId}`);
        return videoId;
    }, [currentSong]);

    const activeVideoId = currentVideoId || defaultYouTubeId;

    useEffect(() => {
        setCurrentVideoId(null);
        setIsYouTubeReady(false);
        initialSeekRef.current = -1;
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

    // Sync refs
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        isSeekingRef.current = isSeeking;
    }, [isSeeking]);

    // ==================== V98.6: EXTERNAL MEDIA HANDLER ====================
    const youTubeMediaHandlerInstance = useMemo(() => {
        console.log('🎬 V98.6: Creating YouTube handler instance');

        return {
            play: () => {
                console.log('▶️ V98.6: Handler.play() called');

                // 🆕 V98.6: Always apply deferred seek on play with allowSeekAhead=true
                if (initialSeekRef.current >= 0 && youtubePlayerRef.current?.seekTo) {
                    console.log(
                        `⏱️ V98.6: Applying deferred seek to ${initialSeekRef.current.toFixed(2)}s on play`,
                    );
                    youtubePlayerRef.current.seekTo(initialSeekRef.current, true); // allowSeekAhead=true!
                    initialSeekRef.current = -1;
                    postSeekLockUntilRef.current = performance.now() + 200;
                }

                if (youtubePlayerRef.current?.playVideo) {
                    youtubePlayerRef.current.playVideo();
                    console.log('✅ V98.6: YouTube playVideo() executed');
                } else {
                    console.warn('⚠️ V98.6: YouTube player ref not ready in play()');
                }
            },

            pause: () => {
                console.log('⏸️ V98.6: Handler.pause() called');
                if (youtubePlayerRef.current?.pauseVideo) {
                    youtubePlayerRef.current.pauseVideo();
                    console.log('✅ V98.6: YouTube pauseVideo() executed');
                } else {
                    console.warn('⚠️ V98.6: YouTube player ref not ready in pause()');
                }
            },

            seekTo: (milliseconds: number) => {
                // Ignore seeks during pause transition (api.pause() triggers handler.seekTo internally)
                if (pauseTransitionRef.current) {
                    console.log('⏭️ V98.6: Ignoring seek during pause transition');
                    return;
                }

                // Synchronous seeking guard
                isSeekingRef.current = true;
                setIsSeeking(true);

                const offset = currentSong?.videoStartOffset || 0;
                const seconds = milliseconds / 1000 + offset;
                console.log(
                    `🎯 V98.6: Handler.seekTo(${milliseconds}ms) -> ${seconds.toFixed(2)}s`,
                );

                const player = youtubePlayerRef.current;
                if (!player) {
                    console.warn('⚠️ V98.6: YouTube player not ready in seekTo');
                    return;
                }

                const YT = (typeof window !== 'undefined' && (window as any).YT) || null;
                if (!YT || !YT.PlayerState) {
                    console.warn('⚠️ V98.6: YouTube API not loaded - deferring seek');
                    initialSeekRef.current = seconds;
                    return;
                }

                const state = player.getPlayerState?.();
                const isSeekableState =
                    state === YT.PlayerState.PAUSED || state === YT.PlayerState.PLAYING;

                if (!isSeekableState || !isYouTubeReady) {
                    console.log(
                        `⏱️ V98.6: Deferring seek to ${seconds.toFixed(2)}s (state=${state}, ready=${isYouTubeReady})`,
                    );
                    initialSeekRef.current = seconds;
                    setTimeout(() => {
                        setIsSeeking(false);
                        isSeekingRef.current = false;
                    }, 100);
                    return;
                }

                // 🆕 V98.6 FIX: When PAUSED, allowSeekAhead=false means unbuffered seeks fail!
                // Solution: Do immediate seek for visual feedback, but ALSO store as deferred
                // to guarantee it applies on play with allowSeekAhead=true

                if (state === YT.PlayerState.PAUSED) {
                    // Paused: Try immediate seek but ALSO store as deferred
                    player.seekTo(seconds, false); // Try with allowSeekAhead=false first
                    initialSeekRef.current = seconds; // Store for guaranteed re-apply on play
                    console.log(
                        `⏸️ V98.6: Paused seek - immediate + stored deferred at ${seconds.toFixed(2)}s`,
                    );
                } else {
                    // Playing: Immediate seek with allowSeekAhead=true
                    player.seekTo(seconds, true);
                    initialSeekRef.current = -1; // Clear - immediate should work when playing
                    console.log(
                        `▶️ V98.6: Playing seek - immediate at ${seconds.toFixed(2)}s (allowSeekAhead=true)`,
                    );
                }

                postSeekLockUntilRef.current = performance.now() + 200;

                // Clear seeking state after stabilization
                setTimeout(() => {
                    setIsSeeking(false);
                    isSeekingRef.current = false;
                }, 300);
            },

            get currentTime() {
                const player = youtubePlayerRef.current;
                if (player?.getCurrentTime) {
                    const ytTime = player.getCurrentTime();
                    const offset = currentSong?.videoStartOffset || 0;
                    const adjustedTime = Math.max(0, ytTime - offset);
                    return adjustedTime * 1000;
                }
                return 0;
            },

            get duration() {
                const player = youtubePlayerRef.current;
                return player?.getDuration ? player.getDuration() * 1000 : 0;
            },
        };
    }, [currentSong?.videoStartOffset, isYouTubeReady]);

    // Update display every 500ms
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
                typeof window !== 'undefined' &&
                ('ontouchstart' in window || navigator.maxTouchPoints > 0);
            const isLandscape =
                typeof window !== 'undefined' &&
                window.matchMedia('(orientation: landscape)').matches;
            const isCompactHeight =
                typeof window !== 'undefined' && window.innerHeight < 600;
            setIsMobileLandscape(isTouchDevice && isLandscape && isCompactHeight);
        };

        checkOrientation();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', checkOrientation);
            window.addEventListener('orientationchange', checkOrientation);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', checkOrientation);
                window.removeEventListener('orientationchange', checkOrientation);
            }
        };
    }, []);

    // 🆕 V98.8: Reset scroll position when entering landscape mode
    useEffect(() => {
        if (isMobileLandscape && mainScrollContainerRef.current) {
            // Reset to start (M1) when rotating to landscape
            // Use multiple delays to catch after AlphaTab re-renders
            mainScrollContainerRef.current.scrollLeft = 0;

            // Also reset after short delay (after initial render)
            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                    console.log('🔄 V98.8: Reset scroll to M1 (100ms)');
                }
            }, 100);

            // And again after AlphaTab finishes re-rendering
            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                    console.log('🔄 V98.8: Reset scroll to M1 (300ms)');
                }
            }, 300);

            // Final reset after full re-render
            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                    console.log('🔄 V98.8: Reset scroll to M1 (500ms)');
                }
            }, 500);
        }
    }, [isMobileLandscape]);

    // ==================== EVENT HANDLERS ====================
    const handleApiReady = useCallback(
        (alphaTabApi: AlphaTabApi) => {
            console.log('✅ V98.6: API Ready');
            setApi(alphaTabApi);

            if (alphaTabApi.playerReady) {
                alphaTabApi.playerReady.on(() => {
                    console.log('✅ V98.6: Player Ready');
                    setPlayerReady(true);

                    if (alphaTabApi.player?.output && youTubeMediaHandlerInstance) {
                        const output = alphaTabApi.player.output as any;
                        output.handler = youTubeMediaHandlerInstance;
                        console.log('🔗 V98.6: Handler attached on player ready');
                    }
                });
            }

            if (alphaTabApi.playerStateChanged) {
                alphaTabApi.playerStateChanged.on((e: any) => {
                    if (audioSource === 'synth') {
                        setIsPlaying(e.state === 1);
                    }
                });
            }

            if (alphaTabApi.playerPositionChanged) {
                alphaTabApi.playerPositionChanged.on((e: any) => {
                    currentTimeRef.current = e.currentTime;
                    durationRef.current = e.endTime;
                });
            }
        },
        [youTubeMediaHandlerInstance, audioSource],
    );

    const handleScoreLoaded = useCallback(
        (info: SongInfo, trackList: Track[]) => {
            console.log(`✅ V98.6: Score loaded - ${info.title}`);
            setSongInfo(info);
            setTracks(trackList);
            setSelectedTrack(0);
            setError(null);
            setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
            setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
        },
        [],
    );

    const handleRenderFinished = useCallback(() => {
        console.log('✅ V98.6: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V98.6 ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    // handlePlayPause with pause transition protection
    const handlePlayPause = useCallback(() => {
        if (!api) return;

        console.log(
            `🎮 V98.6: handlePlayPause - mode: ${audioSource}, isPlaying: ${isPlaying}`,
        );

        if (audioSource === 'original') {
            const output = api.player?.output as any;
            if (output?.handler) {
                if (isPlaying) {
                    // Set pause transition flag BEFORE calling pause
                    pauseTransitionRef.current = true;
                    console.log('🔒 V98.6: Pause transition started');

                    console.log('⏸️ V98.6: Pausing via handler + api.pause()');
                    output.handler.pause();
                    api.pause();

                    // Clear pause transition flag after a delay
                    setTimeout(() => {
                        pauseTransitionRef.current = false;
                        console.log('🔓 V98.6: Pause transition ended');
                    }, 300);
                } else {
                    console.log('▶️ V98.6: Playing via handler + api.play()');
                    output.handler.play();
                    api.play();
                }
            } else {
                console.warn('⚠️ V98.6: No handler available for original mode');
            }
        } else {
            if (isPlaying) {
                api.pause();
            } else {
                api.play();
            }
        }
    }, [api, isPlaying, audioSource]);

    const handleStop = useCallback(() => {
        if (!api) return;
        api.stop();
        currentTimeRef.current = 0;
        setDisplayTime(0);
        setIsPlaying(false);
    }, [api]);

    const handleTrackChange = useCallback(
        (trackIndex: number) => {
            if (api?.score?.tracks) {
                console.log(`🔄 V98.6: Track ${trackIndex}`);

                if (isLooping && api.playbackRange) {
                    api.playbackRange = null;
                    setHasLoopSelection(false);
                }

                api.renderTracks([api.score.tracks[trackIndex]]);
                setSelectedTrack(trackIndex);
            }
        },
        [api, isLooping],
    );

    const handleLoopToggle = useCallback(() => {
        if (!api) return;

        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (!newLoopState) {
            setHasLoopSelection(false);
            if (api.playbackRange) {
                api.playbackRange = null;
            }
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number | null, end: number | null) => {
        setHasLoopSelection(start !== null && end !== null);
    }, []);

    const handleSpeedChange = useCallback(
        (speed: number) => {
            setPlaybackSpeed(speed);
            if (api) {
                api.playbackSpeed = speed;
                console.log(`🎚️ V98.6: Speed: ${Math.round(speed * 100)}%`);
            }
        },
        [api],
    );

    const handleAudioSourceChange = useCallback(
        (source: 'synth' | 'original') => {
            setAudioSource(source);
            console.log(`🎵 V98.6: Audio: ${source}`);

            if (api) {
                if (source === 'original') {
                    api.masterVolume = 0;
                    console.log('🔇 V98.6: AlphaTab synth muted');
                } else {
                    api.masterVolume = 1;
                    console.log('🔊 V98.6: AlphaTab synth unmuted');
                }
            }

            if (source === 'original' && activeVideoId) {
                setIsYouTubePlayerVisible(true);
            }

            if (source === 'synth') {
                setIsYouTubePlayerVisible(false);
                setIsYouTubeReady(false);
            }
        },
        [api, activeVideoId],
    );

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        console.log(`🔄 V98.6: Variant changed: ${newVideoId}`);
        setCurrentVideoId(newVideoId);
        initialSeekRef.current = -1;
    }, []);

    const handleYouTubeClose = useCallback(() => {
        setIsYouTubePlayerVisible(false);
        setIsYouTubeReady(false);
        console.log('🎬 V98.6: YouTube player closed');
    }, []);

    const handleYouTubeTimeUpdate = useCallback((time: number) => {
        currentTimeRef.current = time;
        setDisplayTime(time);
    }, []);

    const handleYouTubePlayerReady = useCallback(() => {
        console.log('✅ V98.6: YouTube player is ready!');
        setIsYouTubeReady(true);
        setIsSeeking(false);
        isSeekingRef.current = false;
    }, []);

    // YouTube state change handler with pause protection
    const handleYouTubeStateChange = useCallback(
        (event: any) => {
            console.log(
                `🎬 V98.6: YouTube state change: ${event.data} (Seeking: ${isSeekingRef.current}, PauseTransition: ${pauseTransitionRef.current})`,
            );

            if (event.data === 1) {
                setIsPlaying(true);
                console.log('▶️ V98.6: isPlaying = true');
            } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
                console.log('⏸️ V98.6: isPlaying = false');
            }

            if (isSeekingRef.current) {
                if (!seekStabilizeTimeoutRef.current && (event.data === 1 || event.data === 2)) {
                    console.log('⏱️ V98.6: Starting 500ms seek stabilization timer');
                    seekStabilizeTimeoutRef.current = setTimeout(() => {
                        console.log('✅ V98.6: Seek stabilized');
                        setIsSeeking(false);
                        isSeekingRef.current = false;
                        seekStabilizeTimeoutRef.current = null;
                    }, 500);
                }
                return;
            }

            // Don't sync AlphaTab during pause transition
            if (pauseTransitionRef.current) {
                console.log('⏭️ V98.6: Skipping AlphaTab sync during pause transition');
                return;
            }

            if (api) {
                if (event.data === 1) {
                    api.play();
                    console.log('▶️ V98.6: AlphaTab PLAY sync');
                } else if (event.data === 2) {
                    // Set pause transition before calling api.pause()
                    pauseTransitionRef.current = true;
                    api.pause();
                    setTimeout(() => {
                        pauseTransitionRef.current = false;
                    }, 200);
                    console.log('⏸️ V98.6: AlphaTab PAUSE sync');
                } else if (event.data === 0) {
                    api.stop();
                    console.log('⏹️ V98.6: AlphaTab STOP sync');
                }
            }
        },
        [api],
    );

    // 50ms CURSOR SYNC LOOP
    useEffect(() => {
        if (!api || audioSource !== 'original' || !isYouTubeReady) return;
        if (!api.player?.output) return;

        const output = api.player.output as any;
        if (typeof output.updatePosition !== 'function') {
            console.error('❌ V98.6: output.updatePosition is not a function!');
            return;
        }

        console.log('🔄 V98.6: Starting 50ms cursor sync loop');

        const syncInterval = setInterval(() => {
            const now = performance.now();

            if (now < postSeekLockUntilRef.current) {
                return;
            }

            if (isSeekingRef.current || !isPlayingRef.current) {
                return;
            }

            // Also skip during pause transition
            if (pauseTransitionRef.current) {
                return;
            }

            if (!youtubePlayerRef.current?.getCurrentTime) return;

            const ytTime = youtubePlayerRef.current.getCurrentTime();
            const offset = currentSong?.videoStartOffset || 0;
            const adjustedTime = Math.max(0, ytTime - offset);
            const timeMs = adjustedTime * 1000;

            try {
                output.updatePosition(timeMs);
            } catch (err) {
                console.error('❌ V98.6: updatePosition error:', err);
            }

            currentTimeRef.current = timeMs;
        }, 50);

        return () => {
            clearInterval(syncInterval);
            console.log('⏹️ V98.6: Stopped cursor sync loop');
        };
    }, [api, audioSource, isYouTubeReady, currentSong?.videoStartOffset]);

    // ENSURE HANDLER IS ATTACHED
    useEffect(() => {
        if (!api || !playerReady || !api.player?.output) return;

        const output = api.player.output as any;

        if (youTubeMediaHandlerInstance) {
            output.handler = youTubeMediaHandlerInstance;
            console.log('🔗 V98.6: Handler attached/verified in page.tsx');
        }

        return () => {
            if (api.player?.output) {
                const out = api.player.output as any;
                if (out.handler) {
                    out.handler = null;
                    console.log('🔌 V98.6: Handler detached on cleanup');
                }
            }
        };
    }, [api, playerReady, youTubeMediaHandlerInstance]);

    // ENABLE USER INTERACTION
    useEffect(() => {
        if (!api) return;
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();
    }, [api, isLooping]);

    // ==================== SONG LIBRARY ====================
    const handleSongSelect = useCallback((songId: string) => {
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(song =>
                song.id === songId ? { ...song, isFavorite: !song.isFavorite } : song,
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
        setSongState(prev => ({
            ...prev,
            playlists: [...prev.playlists, newPlaylist],
        }));
    }, []);

    const handlePlaylistAction = useCallback(
        (type: 'add' | 'remove', songId: string, playlistId: string) => {
            setSongState(prev => ({
                ...prev,
                playlists: prev.playlists.map(playlist => {
                    if (playlist.id === playlistId) {
                        const songExists = playlist.songIds.includes(songId);

                        if (type === 'add' && !songExists) {
                            return { ...playlist, songIds: [...playlist.songIds, songId] };
                        }

                        if (type === 'remove' && songExists) {
                            return {
                                ...playlist,
                                songIds: playlist.songIds.filter(id => id !== songId),
                            };
                        }
                    }
                    return playlist;
                }),
            }));
        },
        [],
    );

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }, [theme]);

    // TRACK MIXER
    const handleTrackMuteToggle = useCallback(
        (trackIndex: number) => {
            if (!api || !api.score) return;
            const track = api.score.tracks[trackIndex];
            const isMuted = trackMuteState.get(trackIndex) || false;
            api.changeTrackMute([track], !isMuted);
            setTrackMuteState(prev => {
                const newMap = new Map(prev);
                newMap.set(trackIndex, !isMuted);
                return newMap;
            });
        },
        [api, trackMuteState],
    );

    const handleTrackSoloToggle = useCallback(
        (trackIndex: number) => {
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
        },
        [api, trackSoloState],
    );

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">
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
                className={`
                    w-full overscroll-y-contain
                    ${isMobileLandscape
                        ? 'h-[calc(100vh-80px)] overflow-x-auto overflow-y-hidden'
                        : 'pb-32 overflow-y-auto overflow-x-hidden'
                    }
                    ${!isMobileLandscape && isHeaderVisible ? 'pt-16' : 'pt-0'}
                    transition-[padding] duration-300 ease-in-out
                `}
            >
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <h3 className="text-red-400 font-bold mb-2">Error</h3>
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {/* 🆕 V98.7: Landscape song title overlay */}
                {isMobileLandscape && currentSong && (
                    <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-gray-900/90 to-transparent py-2 px-4">
                        <div className="text-white text-sm font-semibold truncate">
                            {currentSong.artist} - {currentSong.title}
                        </div>
                    </div>
                )}

                <div
                    id="maestro-player"
                    className={`
                        bg-white
                        ${isMobileLandscape
                            ? 'min-w-[200vw] inline-block flex-shrink-0 pt-[12vh]'
                            : 'w-full'
                        }
                    `}
                /* V98.8: pt-[12vh] positions staff higher, leaving room for notation below */
                >
                    <AlphaTabRenderer
                        fileUrl={currentFileUrl}
                        playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                        externalMediaHandler={youTubeMediaHandlerInstance}
                        soundFontPath="/soundfont/sonivox.sf2"
                        scrollContainerRef={mainScrollContainerRef}
                        isMobileLandscape={isMobileLandscape}
                        isSeeking={isSeeking}
                        isPlaying={isPlaying}
                        onApiReady={handleApiReady}
                        onScoreLoaded={handleScoreLoaded}
                        onRenderFinished={handleRenderFinished}
                        onError={handleError}
                        minHeight="600px"
                        isLooping={isLooping}
                        onLoopRangeChange={handleLoopRangeChange}
                        audioSource={audioSource}
                        theme={theme}  // 🆕 V98.6: Pass theme to AlphaTab for dark mode
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
                                    <strong className="text-white">Strumming Pattern:</strong> Down, Down-Up,
                                    Up-Down-Up
                                </p>
                                <p className="text-sm">
                                    <strong className="text-white">Key Points:</strong> Focus on clean
                                    transitions between chords. Watch finger placement on the bends in measure
                                    157.
                                </p>
                                <p className="text-sm">
                                    <strong className="text-white">Practice Tip:</strong> Start at 75% speed and
                                    gradually increase tempo as you gain confidence.
                                </p>
                                <p className="text-sm text-gray-400 italic">
                                    💡 Use the Loop button to repeat difficult sections
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="hidden lg:block px-4 mt-4">
                    <DebugPanel api={api} currentTime={displayTime} isPlaying={isPlaying} />
                </div>

                <div className="h-24 px-4" />
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

            {audioSource === 'original' && isYouTubePlayerVisible && activeVideoId && (
                <YouTubePlayer
                    ref={youtubePlayerRef}
                    videoId={activeVideoId}
                    isVisible={isYouTubePlayerVisible}
                    onClose={handleYouTubeClose}
                    currentTime={displayTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={handleYouTubeTimeUpdate}
                    onStateChange={handleYouTubeStateChange}
                    onPlayerReady={handleYouTubePlayerReady}
                    isMobileLandscape={isMobileLandscape}
                    videoVariants={currentSong?.youtubeVariants}
                    onVariantChange={handleVideoVariantChange}
                    videoStartOffset={currentSong?.videoStartOffset}
                />
            )}
        </div>
    );
}