'use client';

/**
 * STAGE 2 - Song Selection + YouTube Integration
 * December 5th, 2025 - V94.7.2 + V96.3.1: HANDLER STABILITY FIX
 * 
 * 🐛 FIXED IN V94.7.2:
 * ✅ Handler no longer recreates on every play/pause (uses ref instead of closure)
 * ✅ isPlayingRef syncs with isPlaying state automatically
 * ✅ Handler only recreates when song changes (stable reference)
 * ✅ Eliminates handler detach/reattach spam
 * 
 * 🐛 FIXED IN V96.3.1:
 * ✅ Pause enforcement starts immediately (no 100ms delay)
 * ✅ Checks every 50ms initially for faster response
 * ✅ Eliminates brief auto-play flash on first seek
 * 
 * 🆕 INTEGRATED V96.3:
 * ✅ Added onSeeking callback support
 * ✅ 50ms cursor sync pauses during YouTube seeks
 * ✅ Fixes cursor "snap-back" when seeking during playback
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
  SongItem 
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
    const isPlayingRef = useRef<boolean>(false); // 🎯 V94.7.2: Ref for handler closure
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

    const currentFileUrl = currentSong?.fileUrl || '/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3';

    // ==================== YOUTUBE PLAYER STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [isYouTubeSeeking, setIsYouTubeSeeking] = useState(false); // 🆕 V96.3: Track seeking state
    const youtubePlayerRef = useRef<any>(null);

    const defaultYouTubeId = useMemo(() => {
        const videoId = currentSong?.youtubeVideoId || null;
        console.log(`🎬 V94.7.2: Current song: ${currentSong?.title} by ${currentSong?.artist}`);
        console.log(`🎬 V94.7.2: YouTube ID: ${videoId}`);
        return videoId;
    }, [currentSong]);

    const activeVideoId = currentVideoId || defaultYouTubeId;

    useEffect(() => {
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

    // 🎯 V94.7.2: Sync isPlaying state to ref for handler closure
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // V94.7.2: STABLE EXTERNAL MEDIA HANDLER (for AlphaTab to control YouTube)
    const youTubeMediaHandlerInstance = useMemo(() => {
        console.log('🎬 V94.7: Creating YouTube handler instance');
        return {
            play: () => {
                console.log('▶️ V94.7: Handler.play() called');
                if (youtubePlayerRef.current?.playVideo) {
                    youtubePlayerRef.current.playVideo();
                    console.log('✅ V94.7: YouTube playVideo() executed');
                } else {
                    console.warn('⚠️ V94.7: YouTube player ref not ready');
                }
            },
            pause: () => {
                console.log('⏸️ V94.7: Handler.pause() called');
                if (youtubePlayerRef.current?.pauseVideo) {
                    youtubePlayerRef.current.pauseVideo();
                    console.log('✅ V94.7: YouTube pauseVideo() executed');
                } else {
                    console.warn('⚠️ V94.7: YouTube player ref not ready');
                }
            },
            seekTo: (milliseconds: number) => {
                const seconds = milliseconds / 1000 + (currentSong?.videoStartOffset || 0);
                console.log(`🎯 V94.7: Handler.seekTo(${milliseconds}ms) -> ${seconds.toFixed(1)}s, isPlaying: ${isPlaying}`);
                
                if (youtubePlayerRef.current?.seekTo) {
                    // 🎯 V94.7 FIX: Use allowSeekAhead based on playing state
                    // false = less aggressive buffering when paused (prevents auto-play)
                    // true = normal buffering when playing (smooth seeking)
                    const allowSeekAhead = isPlaying;
                    
                    youtubePlayerRef.current.seekTo(seconds, allowSeekAhead);
                    console.log(`✅ V94.7: YouTube seekTo() executed (allowSeekAhead=${allowSeekAhead})`);
                    
                    // ❌ REMOVED: Synchronous pauseVideo() - doesn't work during buffering!
                    // Let YouTubePlayer component handle pause enforcement with async loop
                } else {
                    console.warn('⚠️ V94.7: YouTube player ref not ready');
                }
            },
            // Required getters for IExternalMediaHandler interface
            get currentTime() {
                if (youtubePlayerRef.current?.getCurrentTime) {
                    const ytTime = youtubePlayerRef.current.getCurrentTime();
                    const adjustedTime = Math.max(0, ytTime - (currentSong?.videoStartOffset || 0));
                    return adjustedTime * 1000;
                }
                return 0;
            },
            get duration() {
                if (youtubePlayerRef.current?.getDuration) {
                    return youtubePlayerRef.current.getDuration() * 1000;
                }
                return 0;
            },
        };
    }, [currentSong?.videoStartOffset, isPlaying]); // ✅ Added isPlaying dependency

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
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ V94.7.2: API Ready');
        setApi(alphaTabApi);

        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ V94.7.2: Player Ready');
                setPlayerReady(true);
                
                // V94.7.2: Attach handler immediately when player is ready
                if (alphaTabApi.player?.output && youTubeMediaHandlerInstance) {
                    const output = alphaTabApi.player.output as any;
                    output.handler = youTubeMediaHandlerInstance;
                    console.log('🔗 V94.7.2: Handler attached on player ready');
                }
            });
        }

        if (alphaTabApi.playerStateChanged) {
            alphaTabApi.playerStateChanged.on((e: any) => {
                // Only update isPlaying from AlphaTab when in synth mode
                if (audioSource === 'synth') {
                    setIsPlaying(e.state === 1);
                }
            });
        }

        // V94.7.2: CURSOR SYNC - Updates YouTube when AlphaTab cursor moves
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime;
                durationRef.current = e.endTime;
                // KEY: Update displayTime so YouTube sees cursor changes
                setDisplayTime(e.currentTime);
            });
        }
    }, [youTubeMediaHandlerInstance, audioSource]);

    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ V94.7.2: Score loaded - ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ V94.7.2: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V94.7.2 ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    const handlePlayPause = useCallback(() => {
        if (!api) return;
        
        console.log(`🎮 V94.7.2: handlePlayPause - mode: ${audioSource}, isPlaying: ${isPlaying}`);
        
        if (audioSource === 'original') {
            // Original mode: Control YouTube via handler
            const output = api.player?.output as any;
            if (output?.handler) {
                if (isPlaying) {
                    console.log('⏸️ V94.7.2: Pausing via handler');
                    output.handler.pause();
                } else {
                    console.log('▶️ V94.7.2: Playing via handler');
                    output.handler.play();
                }
            } else {
                console.warn('⚠️ V94.7.2: No handler available for original mode');
            }
        } else {
            // Synth mode: Control AlphaTab
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

    const handleTrackChange = useCallback((trackIndex: number) => {
        if (api?.score?.tracks) {
            console.log(`🔄 V94.7.2: Track ${trackIndex}`);
            
            if (isLooping && api.playbackRange) {
                api.playbackRange = null;
                setHasLoopSelection(false);
            }
            
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    }, [api, isLooping]);

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

    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) {
            api.playbackSpeed = speed;
            console.log(`🎚️ V94.7.2: Speed: ${Math.round(speed * 100)}%`);
        }
    }, [api]);

    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        console.log(`🎵 V94.7.2: Audio: ${source}`);
        
        // Mute/unmute AlphaTab synth based on audio source
        if (api) {
            if (source === 'original') {
                api.masterVolume = 0;
                console.log('🔇 V94.7.2: AlphaTab synth muted');
            } else {
                api.masterVolume = 1;
                console.log('🔊 V94.7.2: AlphaTab synth unmuted');
            }
        }
        
        // Auto-show YouTube player when switching to "original"
        if (source === 'original' && activeVideoId) {
            setIsYouTubePlayerVisible(true);
        }
        
        // Hide YouTube player when switching to "synth"
        if (source === 'synth') {
            setIsYouTubePlayerVisible(false);
        }
    }, [api, activeVideoId]);

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        console.log(`🔄 V94.7.2: Variant changed: ${newVideoId}`);
        setCurrentVideoId(newVideoId);
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
    }, [api, trackSoloState]);

    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }, [theme]);

    const handleSongSelect = useCallback((songId: string) => {
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(song => 
                song.id === songId ? { ...song, isFavorite: !song.isFavorite } : song
            )
        }));
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
    }, []);

    // V94.7.2: YOUTUBE STATE CHANGE HANDLER
    // This is the KEY FIX - syncs YouTube's actual state with React state
    const handleYouTubeStateChange = useCallback((event: any) => {
        // YouTube player states: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
        console.log('🎬 V94.7.2: YouTube state change:', event.data);
        
        if (event.data === 1) {
            // Playing
            setIsPlaying(true);
            console.log('▶️ V94.7.2: YouTube playing -> setIsPlaying(true)');
        } else if (event.data === 2 || event.data === 0) {
            // Paused or Ended
            setIsPlaying(false);
            console.log('⏸️ V94.7.2: YouTube paused/ended -> setIsPlaying(false)');
        }
    }, []);

    // V94.7.2: 50MS CURSOR SYNC LOOP - FIXED with api.timePosition
    // When YouTube plays, update AlphaTab cursor position every 50ms
    // 🆕 V96.3: Pauses during YouTube seeking to avoid cursor fight
    useEffect(() => {
        if (!api || audioSource !== 'original') {
            return;
        }

        // Only sync when actually playing AND not seeking
        if (!isPlaying || isYouTubeSeeking) return;

        console.log('🔄 V94.7.2: Starting 50ms cursor sync loop (using api.timePosition)');

        const syncInterval = setInterval(() => {
            if (!youtubePlayerRef.current || isYouTubeSeeking) return; // Skip if seeking

            const ytTime = youtubePlayerRef.current.getCurrentTime?.() || 0;
            const adjustedTime = Math.max(0, ytTime - (currentSong?.videoStartOffset || 0));
            const timeMs = adjustedTime * 1000;

            // FIX: Use the public API setter for timePosition
            // This moves the visual cursor without trying to control playback
            api.timePosition = timeMs;

            // Update our time ref for display
            currentTimeRef.current = timeMs;
        }, 50);

        return () => {
            clearInterval(syncInterval);
            console.log('⏹️ V94.7.2: Stopped cursor sync loop');
        };
    }, [api, audioSource, isPlaying, isYouTubeSeeking, currentSong?.videoStartOffset]);

    // V94.7.2: ENSURE HANDLER IS ATTACHED (Backup/Reattach)
    useEffect(() => {
        if (!api || !playerReady || !api.player?.output) return;
        
        const output = api.player.output as any;
        
        // Always ensure handler is attached when we have both API and handler ready
        if (youTubeMediaHandlerInstance) {
            output.handler = youTubeMediaHandlerInstance;
            console.log('🔗 V94.7.2: Handler attached/verified in page.tsx');
        }
        
        return () => {
            // Clean up on unmount
            if (api.player?.output) {
                const output = api.player.output as any;
                if (output.handler) {
                    output.handler = null;
                    console.log('🔌 V94.7.2: Handler detached on cleanup');
                }
            }
        };
    }, [api, playerReady, youTubeMediaHandlerInstance]);

    // ==================== ENABLE USER INTERACTION ====================
    useEffect(() => {
        if (!api) return;
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();
    }, [api, isLooping]);

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
                    w-full pb-32 overscroll-y-contain
                    ${isHeaderVisible ? 'pt-16' : 'pt-0'}
                    ${isMobileLandscape
                        ? 'overflow-x-auto overflow-y-hidden'
                        : 'overflow-y-auto overflow-x-hidden'
                    }
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

                <div
                    id="maestro-player"
                    className={`
                        bg-white
                        ${isMobileLandscape ? 'min-w-[200vw] inline-block' : 'w-full'}
                    `}
                >
                    {/* V94.7.2: Keep playerMode as "synthesizer", pass handler for external control */}
                    <AlphaTabRenderer
                        fileUrl={currentFileUrl}
                        playerMode="synthesizer"
                        externalMediaHandler={youTubeMediaHandlerInstance}
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
                        audioSource={audioSource}
                    />
                </div>

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

            {audioSource === 'original' && isYouTubePlayerVisible && activeVideoId && (
                <YouTubePlayer
                    ref={youtubePlayerRef}
                    videoId={activeVideoId}
                    isVisible={isYouTubePlayerVisible}
                    onClose={() => setIsYouTubePlayerVisible(false)}
                    currentTime={displayTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={(time) => {
                        currentTimeRef.current = time;
                        setDisplayTime(time);
                    }}
                    onStateChange={handleYouTubeStateChange}
                    onSeeking={(isSeeking) => {
                        console.log(`🎯 V96.3.1: YouTube seeking: ${isSeeking}`);
                        setIsYouTubeSeeking(isSeeking);
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