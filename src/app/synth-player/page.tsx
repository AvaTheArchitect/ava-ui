'use client';

/**
 * STAGE 4 - Synth + YouTube + Pitch Shift + Count-In + Headless Metronome
 * V99.3 — MetadataEditorPanel wired as in-app overlay
 *
 * 🔥 V99.3 CHANGES:
 * ✅ MetadataEditorPanel import added
 * ✅ metaEditorState: { tabId, source } drives open/close
 * ✅ MyTabsPanel.onEditMetadata → opens MetadataEditorPanel, closes MyTabs
 * ✅ MetadataEditorPanel.onClose → returns to MyTabs if source === 'mytabs'
 * ✅ /meta-editor route kept as dev/testing fallback (unchanged)
 *
 * 🔒 V99.2.1 PRESERVED:
 * ✅ NewTabPanel wired
 * ✅ Batch signed URLs + search RPC
 * ✅ All existing features preserved
 *
 * ✅ STEP 1:  Imports — SongSelector removed, MyTabsPanel + NewTabPanel added
 * ✅ STEP 2:  New state — isNewTabOpen
 * ✅ STEP 3:  Supabase batch signed URL loader (replaces loadInitialSongData seed)
 * ✅ STEP 4:  Supabase signed URL resolver per song
 * ✅ STEP 5:  searchTabs RPC callback
 * ✅ STEP 6:  AlphaTabRenderer gated on signedUrl, key={signedUrl}, fileUrl={signedUrl}
 * ✅ STEP 7:  handleDeletePlaylist added
 * ✅ STEP 8:  TopMenuTray gets onNewTabOpen prop
 * ✅ STEP 9:  SongSelector replaced with MyTabsPanel + NewTabPanel
 *
 * 🔒 V98.67 BASE PRESERVED:
 * ✅ Canvas reload bug fix (key no longer includes audioSource)
 * ✅ Master volume ref pattern
 * ✅ Pitch shift with tuning detection
 * ✅ Count-in with 3-beat and 4-beat modes
 * ✅ Headless metronome
 * ✅ AudioContext state logging
 * ✅ Track isolation with selectedTrackIndex
 */

import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from 'react';
// ✅ STEP 1: Supabase client
import { supabase } from '@/lib/alphaTab/supabase';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray, MobileToolsSlideout } from '@/components/audio/maestro/layout';
// ✅ STEP 1: SongSelector removed, MyTabsPanel + NewTabPanel added
import { MyTabsPanel } from '@/components/audio/maestro/tabs/MyTabsPanel';
import { NewTabPanel } from '@/components/audio/maestro/tabs/NewTabPanel';
// ✅ V99.3: MetadataEditorPanel in-app overlay
import { MetadataEditorPanel } from '@/components/audio/maestro/tabs/MetadataEditorPanel';
import { YouTubePlayer } from '@/components/audio/maestro/media/YouTubePlayer';
import {
    CountInOverlay,
    useSmartMetronome,
    type MetronomeSoundType,
    type SubdivisionMode
} from '@/components/audio/maestro/controls';
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

    // ==================== MASTER VOLUME STATE ====================
    const [masterVolume, setMasterVolume] = useState<number>(1.0);
    const masterVolumeRef = useRef<number>(1.0);

    useEffect(() => {
        masterVolumeRef.current = masterVolume;
    }, [masterVolume]);

    const pauseTransitionRef = useRef<boolean>(false);

    // ==================== COUNT IN STATE ====================
    const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(false);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const [countdownValue, setCountdownValue] = useState<number>(0);

    // ==================== METRONOME STATE ====================
    const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(false);
    const [metronomeVolume, setMetronomeVolume] = useState<number>(0.7);
    const [metronomeBalance, setMetronomeBalance] = useState<number>(0);
    const [metronomeSoundType, setMetronomeSoundType] = useState<MetronomeSoundType>('woodblock');
    const [metronomeSubdivision, setMetronomeSubdivision] = useState<SubdivisionMode>(1);
    const [metronomeAccentEnabled, setMetronomeAccentEnabled] = useState<boolean>(true);
    const [countInMode, setCountInMode] = useState<'three-beat' | 'four-beat'>('three-beat');
    const [currentBPM, setCurrentBPM] = useState<number>(120);

    // ==================== METRONOME HOOK ====================
    const { effectiveBPM, armMetronome } = useSmartMetronome({
        isEnabled: isMetronomeEnabled,
        currentBPM: currentBPM,
        audioSource: audioSource,
        isPlaying: isPlaying,
        isCountingDown: isCountingDown,
        volume: metronomeVolume,
        balance: metronomeBalance,
        soundType: metronomeSoundType,
        subdivision: metronomeSubdivision,
        accentEnabled: metronomeAccentEnabled,
    });

    // ==================== PITCH SHIFT STATE ====================
    const [pitchShift, setPitchShift] = useState<number>(0);
    const [tuningData, setTuningData] = useState<number[]>([64, 59, 55, 50, 45, 40]);
    const [isPitchPopoverOpen, setIsPitchPopoverOpen] = useState<boolean>(false);
    const [pitchPopoverAnchor, setPitchPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

    // ==================== LOOP STATE ====================
    const [isLooping, setIsLooping] = useState<boolean>(false);
    const [hasLoopSelection, setHasLoopSelection] = useState<boolean>(false);

    // ==================== TRACK MIXER STATE ====================
    const [trackMuteState, setTrackMuteState] = useState<Map<number, boolean>>(new Map());
    const [trackSoloState, setTrackSoloState] = useState<Map<number, boolean>>(new Map());

    // ==================== THEME STATE ====================
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // ==================== SONG STATE — seeded locally, replaced by Supabase async ====================
    // loadInitialSongData() guarantees the UI is never blank on boot.
    // The Supabase effect below overwrites this once the fetch resolves.
    const [songState, setSongState] = useState<SongState>(
        loadInitialSongData()
    );
    const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);
    // ✅ STEP 2: New state
    const [isNewTabOpen, setIsNewTabOpen] = useState(false);

    // ✅ V99.3: Meta editor overlay state — null tabId = closed
    const [metaEditorState, setMetaEditorState] = useState<{
        tabId: string | null;
        source: 'mytabs' | 'newtab' | null;
    }>({ tabId: null, source: null });

    // ✅ STEP 3: Signed URL state — gates AlphaTabRenderer mount
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    // Batch URL cache — keyed by "file_name.file_extension"
    const signedUrlCacheRef = useRef<Map<string, string>>(new Map());

    // ✅ STEP 3: Supabase — fetch all songs + batch sign all URLs on mount
    useEffect(() => {
        async function loadSongsFromDB() {
            const { data, error } = await supabase.from('tabs').select('*');
            console.log("SUPABASE TABS RESULT:", { data, error });
            if (error) {
                console.error("SUPABASE ERROR:", error);
                return;
            }
            if (!data || data.length === 0) {
                console.warn("SUPABASE RETURNED NO TABS — local seed remains active");
                return;
            }

            // ✅ V99.3: Full mapper — snake_case DB → camelCase SongItem
            const formattedSongs = data.map(tab => ({
                id: tab.id,
                title: tab.title,
                artist: tab.artist,
                album: tab.album ?? '',
                difficulty: tab.difficulty ?? undefined,
                instrument: tab.instrument ?? undefined,
                tuning: tab.tuning ?? undefined,
                genre: tab.genre ?? undefined,
                tempo: tab.tempo ?? undefined,
                file_name: tab.file_name,
                file_extension: tab.file_extension,
                // ── Thumbnail + editor status ──
                thumbnailUrl: tab.thumbnail_url ?? undefined,
                thumbnailPath: tab.thumbnail_path ?? undefined,
                status: tab.status ?? 'draft',
                updatedAt: tab.updated_at ?? undefined,
                // ── Legacy bridge fields ─────────────────────────────────────
                // These map from tabs columns for current player compatibility.
                // TODO: replace with tab_youtube main row once player is refactored.
                // ─────────────────────────────────────────────────────────────
                youtubeVideoId: tab.youtube_video_id ?? undefined,
                videoStartOffset: tab.video_start_offset ?? 0,
                isFavorite: false,
            }));

            // Batch sign all files — 1 request, 1hr expiry
            const paths = data
                .filter(t => t.file_name && t.file_extension)
                .map(t => `${t.file_name}.${t.file_extension}`);

            const { data: urlData } = await supabase.storage
                .from('tabs')
                .createSignedUrls(paths, 60 * 60);

            if (urlData) {
                urlData.forEach(entry => {
                    if (entry.path && entry.signedUrl)
                        signedUrlCacheRef.current.set(entry.path, entry.signedUrl);
                });
            }

            setSongState(prev => ({
                ...prev,
                songs: formattedSongs,
                currentSongId: formattedSongs[0]?.id ?? null,
            }));
        }
        loadSongsFromDB();
    }, []);

    const currentSong = useMemo(
        () => getSongById(songState.songs, songState.currentSongId || ''),
        [songState.songs, songState.currentSongId],
    );

    // ✅ STEP 4: Supabase — resolve signed URL from cache per song
    useEffect(() => {
        if (!currentSong?.file_name || !currentSong?.file_extension) return;
        const path = `${currentSong.file_name}.${currentSong.file_extension}`;
        const cached = signedUrlCacheRef.current.get(path);
        if (cached) {
            setSignedUrl(cached);
        } else {
            // Fallback — should rarely fire after batch sign
            supabase.storage.from('tabs').createSignedUrl(path, 3600).then(({ data }) => {
                if (data?.signedUrl) setSignedUrl(data.signedUrl);
            });
        }
    }, [currentSong]);

    // ✅ STEP 5: Supabase search RPC
    const searchTabs = useCallback(async (query: string) => {
        if (!query.trim()) return [];
        const { data, error } = await supabase.rpc('search_tabs', { q: query });
        if (error) return [];
        return data ?? [];
    }, []);

    // ==================== YOUTUBE PLAYER STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const youtubePlayerRef = useRef<any>(null);

    const initialSeekRef = useRef<number>(-1);
    const postSeekLockUntilRef = useRef<number>(0);

    const defaultYouTubeId = useMemo(() => {
        const videoId = currentSong?.youtubeVideoId || null;
        console.log(`🎬 V98.67: Current song: ${currentSong?.title} by ${currentSong?.artist}`);
        console.log(`🎬 V98.67: YouTube ID: ${videoId}`);
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

    // ==================== PANEL COORDINATION ====================
    const slideoutCloseRef = useRef<(() => void) | null>(null);
    const closeControlPanelsRef = useRef<(() => void) | null>(null);

    // Sync refs
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        isSeekingRef.current = isSeeking;
    }, [isSeeking]);

    // ==================== BPM TRACKING ====================
    useEffect(() => {
        if (api?.score?.masterBars?.[0]) {
            const tempo = api.score.masterBars[0].tempoAutomation?.value || 120;
            setCurrentBPM(tempo);
            console.log('🎵 Current BPM:', tempo);
        }
    }, [api, songInfo]);

    // ==================== PITCH SHIFT HANDLER ====================
    const handlePitchShiftChange = useCallback((semitones: number) => {
        console.log(`🎵 V98.67: handlePitchShiftChange called with ${semitones} semitones`);
        setPitchShift(semitones);

        if (api) {
            console.log(`🎵 V98.67: API exists, checking score...`);
            if (api.score?.tracks) {
                try {
                    const allTracks = api.score.tracks;
                    console.log(`🎵 V98.67: Calling changeTrackTranspositionPitch on ${allTracks.length} tracks`);
                    api.changeTrackTranspositionPitch(allTracks, semitones);
                    console.log(`✅ V98.67: Audio pitch shifted by ${semitones} semitones`);
                } catch (err) {
                    console.error('❌ V98.67: changeTrackTranspositionPitch error:', err);
                }
            } else {
                console.warn('⚠️ V98.67: No score or tracks available');
            }
        } else {
            console.warn('⚠️ V98.67: API not available');
        }
    }, [api]);

    const handlePitchShiftToggle = useCallback((anchorRect?: { top: number; left: number }) => {
        if (audioSource !== 'synth') {
            console.log('⚠️ V98.67: Pitch shift only available in Synth mode');
            return;
        }

        setIsPitchPopoverOpen(prev => {
            if (!prev && anchorRect) {
                setPitchPopoverAnchor(anchorRect);
            }
            return !prev;
        });
    }, [audioSource]);

    // ==================== MASTER VOLUME HANDLER ====================
    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolume(volume);
        if (api) {
            api.masterVolume = volume;
            console.log(`🔊 V98.67: Master volume → ${Math.round(volume * 100)}%`);
        }
    }, [api]);

    // ==================== COUNT IN TOGGLE ====================
    const handleCountInToggle = useCallback(() => {
        setIsCountInEnabled(prev => !prev);
        console.log('🔔 Count In toggled:', !isCountInEnabled);
    }, [isCountInEnabled]);

    // ==================== METRONOME HANDLERS ====================
    const handleMetronomeToggle = useCallback(() => {
        if (audioSource === 'original') {
            console.log('⚠️ Metronome only works in Synth mode');
            return;
        }
        setIsMetronomeEnabled(prev => !prev);
    }, [audioSource]);

    // ==================== RESET PITCH ON SONG CHANGE ====================
    useEffect(() => {
        if (pitchShift !== 0) {
            setPitchShift(0);
            if (api?.score?.tracks) {
                try {
                    api.changeTrackTranspositionPitch(api.score.tracks, 0);
                } catch (err) {
                    // API may not be ready
                }
            }
            console.log('🔄 V98.67: Pitch reset on song change');
        }
    }, [signedUrl]);

    // ==================== EXTERNAL MEDIA HANDLER ====================
    const youTubeMediaHandlerInstance = useMemo(() => {
        console.log('🎬 V98.67: Creating YouTube handler instance');

        return {
            play: () => {
                console.log('▶️ V98.67: Handler.play() called');

                if (initialSeekRef.current >= 0 && youtubePlayerRef.current?.seekTo) {
                    console.log(`⏱️ V98.67: Applying deferred seek to ${initialSeekRef.current.toFixed(2)}s on play`);
                    youtubePlayerRef.current.seekTo(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                    postSeekLockUntilRef.current = performance.now() + 200;
                }

                if (youtubePlayerRef.current?.playVideo) {
                    youtubePlayerRef.current.playVideo();
                }
            },

            pause: () => {
                console.log('⏸️ V98.67: Handler.pause() called');
                youtubePlayerRef.current?.pauseVideo?.();
            },

            seekTo: (milliseconds: number) => {
                if (pauseTransitionRef.current) return;

                isSeekingRef.current = true;
                setIsSeeking(true);

                const offset = currentSong?.videoStartOffset || 0;
                const seconds = milliseconds / 1000 + offset;

                const player = youtubePlayerRef.current;
                if (!player) return;

                const YT = (typeof window !== 'undefined' && (window as any).YT) || null;
                if (!YT || !YT.PlayerState) {
                    initialSeekRef.current = seconds;
                    return;
                }

                const state = player.getPlayerState?.();
                const isSeekableState = state === YT.PlayerState.PAUSED || state === YT.PlayerState.PLAYING;

                if (!isSeekableState || !isYouTubeReady) {
                    initialSeekRef.current = seconds;
                    setTimeout(() => {
                        setIsSeeking(false);
                        isSeekingRef.current = false;
                    }, 100);
                    return;
                }

                if (state === YT.PlayerState.PAUSED) {
                    player.seekTo(seconds, false);
                    initialSeekRef.current = seconds;
                } else {
                    player.seekTo(seconds, true);
                    initialSeekRef.current = -1;
                }

                postSeekLockUntilRef.current = performance.now() + 200;
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
                    return Math.max(0, ytTime - offset) * 1000;
                }
                return 0;
            },

            get duration() {
                return youtubePlayerRef.current?.getDuration ? youtubePlayerRef.current.getDuration() * 1000 : 0;
            },
        };
    }, [currentSong?.videoStartOffset, isYouTubeReady]);

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
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let lastValue: boolean | null = null;

        const checkOrientation = () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            debounceTimer = setTimeout(() => {
                const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
                const isCompactHeight = typeof window !== 'undefined' && window.innerHeight < 600;
                const newValue = isTouchDevice && isLandscape && isCompactHeight;

                if (lastValue !== newValue) {
                    lastValue = newValue;
                    console.log(`📱 V98.67: Orientation changed to ${newValue ? 'LANDSCAPE' : 'PORTRAIT'}`);
                    setIsMobileLandscape(newValue);
                }
            }, 150);
        };

        checkOrientation();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', checkOrientation);
            window.addEventListener('orientationchange', checkOrientation);
        }

        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', checkOrientation);
                window.removeEventListener('orientationchange', checkOrientation);
            }
        };
    }, []);

    useEffect(() => {
        if (isMobileLandscape && mainScrollContainerRef.current) {
            mainScrollContainerRef.current.scrollLeft = 0;

            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                }
            }, 100);

            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                }
            }, 300);

            setTimeout(() => {
                if (mainScrollContainerRef.current) {
                    mainScrollContainerRef.current.scrollLeft = 0;
                }
            }, 500);
        }
    }, [isMobileLandscape]);

    // ==================== EVENT HANDLERS ====================
    const handleApiReady = useCallback(
        (alphaTabApi: AlphaTabApi) => {
            console.log('✅ V98.67: API Ready');
            setApi(alphaTabApi);

            alphaTabApi.masterVolume = masterVolumeRef.current;
            console.log(`🔊 V98.67: Initialized api.masterVolume = ${masterVolumeRef.current}`);

            if (alphaTabApi.playerReady) {
                alphaTabApi.playerReady.on(() => {
                    console.log('✅ V98.67: Player Ready');
                    setPlayerReady(true);

                    if (alphaTabApi.player?.output) {
                        const output = alphaTabApi.player.output as any;

                        if (output.context) {
                            console.log('🔊 V98.67: AudioContext state:', output.context.state);

                            if (output.context.state === 'suspended') {
                                console.warn('⚠️ V98.67: AudioContext SUSPENDED - needs play button click');
                            } else if (output.context.state === 'running') {
                                console.log('✅ V98.67: AudioContext RUNNING - audio ready!');
                            }
                        }
                    }

                    if (alphaTabApi.player?.output && youTubeMediaHandlerInstance) {
                        const output = alphaTabApi.player.output as any;
                        output.handler = youTubeMediaHandlerInstance;
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
            console.log(`✅ V98.67: Score loaded - ${info.title}`);
            setSongInfo(info);
            setTracks(trackList);
            setSelectedTrack(0);
            setError(null);
            setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
            setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));

            if (api?.score?.tracks) {
                console.log('🔊 V98.67: TRACK VOLUME CHECK:');
                api.score.tracks.forEach((track: any, idx: number) => {
                    const volume = track.playbackInfo?.volume;
                    console.log(`  Track ${idx} (${track.name}):`, {
                        volume: volume,
                        volumeNormalized: volume ? volume / 16 : 'undefined',
                        isMuted: track.playbackInfo?.isMute,
                        isSolo: track.playbackInfo?.isSolo,
                    });

                    if (volume === undefined || volume === 0) {
                        console.warn(`⚠️ V98.67: Track ${idx} has invalid volume! Setting to 16`);
                        track.playbackInfo.volume = 16;
                        api.changeTrackVolume([track], 1.0);
                    }
                });
            }

            if (api?.score?.tracks?.[0]?.staves?.[0]) {
                const staff = api.score.tracks[0].staves[0];
                if (staff.stringTuning && staff.stringTuning.tunings) {
                    setTuningData(staff.stringTuning.tunings);
                    console.log('🎸 V98.67: Tuning extracted:', staff.stringTuning.tunings);
                }
            }

            setPitchShift(0);
        },
        [api],
    );

    // V98.67 baseline handleRenderFinished — no resize dispatch
    const handleRenderFinished = useCallback(() => {
        console.log('✅ V98.67: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V98.67 ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    // ==================== PLAY/PAUSE WITH COUNT-IN ====================
    const handlePlayPause = useCallback(async () => {
        if (!api) return;

        if (audioSource === 'synth' && api.player?.output) {
            const output = api.player.output as any;
            if (output.context && output.context.state === 'suspended') {
                console.log('🔊 V98.67: Resuming AudioContext...');
                try {
                    await output.context.resume();
                    console.log('✅ V98.67: AudioContext resumed!');
                } catch (err) {
                    console.error('❌ V98.67: Failed to resume AudioContext:', err);
                }
            }
        }

        if (!isPlaying && isCountInEnabled) {
            const maxCount = countInMode === 'four-beat' ? 4 : 3;
            console.log(`🔔 Starting ${maxCount}-beat countdown...`);
            setIsCountingDown(true);

            for (let i = maxCount; i > 0; i--) {
                setCountdownValue(i);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setCountdownValue(0);
            setIsCountingDown(false);
            setIsCountInEnabled(false);
            console.log('✅ Countdown complete, Count In auto-disabled');
        }

        if (audioSource === 'original') {
            const output = api.player?.output as any;
            if (output?.handler) {
                if (isPlaying) {
                    pauseTransitionRef.current = true;
                    output.handler.pause();
                    api.pause();
                    setTimeout(() => { pauseTransitionRef.current = false; }, 300);
                } else {
                    output.handler.play();
                    api.play();
                    initialSeekRef.current = -1;
                }
            }
        } else {
            if (isPlaying) {
                api.pause();
            } else {
                api.play();
            }
        }
    }, [api, audioSource, isPlaying, isCountInEnabled, countInMode]);

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
                if (isLooping && api.playbackRange) {
                    api.playbackRange = null;
                    setHasLoopSelection(false);
                }

                // 🎸 V98.89: Change VISUAL track only, preserve audio state
                api.renderTracks([api.score.tracks[trackIndex]]);

                // 🔊 V98.89: CRITICAL - Ensure all backing tracks remain audible
                // Only mute/solo if explicitly requested via UI
                api.score.tracks.forEach((track: any, idx: number) => {
                    const shouldBeMuted = trackMuteState.get(idx) || false;
                    const shouldBeSolo = trackSoloState.get(idx) || false;

                    api.changeTrackMute([track], shouldBeMuted);
                    api.changeTrackSolo([track], shouldBeSolo);
                });

                console.log(`🎸 V98.89: Switched to Track ${trackIndex}, backing tracks preserved`);
                setSelectedTrack(trackIndex);
            }
        },
        [api, isLooping, trackMuteState, trackSoloState],
    );

    const handleLoopToggle = useCallback(() => {
        if (!api) return;
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);
        if (!newLoopState) {
            setHasLoopSelection(false);
            if (api.playbackRange) api.playbackRange = null;
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number | null, end: number | null) => {
        setHasLoopSelection(start !== null && end !== null);
    }, []);

    const handleSpeedChange = useCallback(
        (speed: number) => {
            setPlaybackSpeed(speed);
            if (api) api.playbackSpeed = speed;
        },
        [api],
    );

    // 🔥 V98.67: FIXED AUDIO SOURCE CHANGE (NO MORE CANVAS RELOAD BUG)
    const handleAudioSourceChange = useCallback(
        (source: 'synth' | 'original') => {
            console.log(`🎵 V98.67: Audio source changing to: ${source}`);
            setAudioSource(source);

            // Reset pitch shift when switching to YouTube mode
            if (source === 'original' && pitchShift !== 0) {
                setPitchShift(0);
                if (api?.score?.tracks) {
                    try {
                        api.changeTrackTranspositionPitch(api.score.tracks, 0);
                    } catch (err) {
                        console.error('❌ V98.67: Reset pitch error:', err);
                    }
                }
            }

            // 🔥 V98.67: KEY FIX - Mute/unmute like v98.6 working version
            if (api) {
                if (source === 'original') {
                    api.masterVolume = 0;
                    console.log('🔇 V98.67: AlphaTab synth MUTED');
                } else {
                    api.masterVolume = masterVolume; // Restore user's volume
                    console.log(`🔊 V98.67: AlphaTab synth UNMUTED (${Math.round(masterVolume * 100)}%)`);
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
        [api, activeVideoId, pitchShift, masterVolume],
    );

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        setCurrentVideoId(newVideoId);
        initialSeekRef.current = -1;
    }, []);

    const handleYouTubeClose = useCallback(() => {
        setIsYouTubePlayerVisible(false);
        setIsYouTubeReady(false);
    }, []);

    const handleYouTubeTimeUpdate = useCallback((time: number) => {
        currentTimeRef.current = time;
        setDisplayTime(time);
    }, []);

    const handleYouTubePlayerReady = useCallback(() => {
        console.log('✅ V98.67: YouTube player ready');
        setIsYouTubeReady(true);
        setIsSeeking(false);
        isSeekingRef.current = false;
    }, []);

    const handleYouTubeStateChange = useCallback(
        (event: any) => {
            if (event.data === 1) {
                setIsPlaying(true);
            } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
            }

            if (isSeekingRef.current) {
                if (!seekStabilizeTimeoutRef.current && (event.data === 1 || event.data === 2)) {
                    seekStabilizeTimeoutRef.current = setTimeout(() => {
                        setIsSeeking(false);
                        isSeekingRef.current = false;
                        seekStabilizeTimeoutRef.current = null;
                    }, 500);
                }
                return;
            }

            if (pauseTransitionRef.current) return;

            if (api) {
                if (event.data === 1) {
                    api.play();
                } else if (event.data === 2) {
                    pauseTransitionRef.current = true;
                    api.pause();
                    setTimeout(() => { pauseTransitionRef.current = false; }, 200);
                } else if (event.data === 0) {
                    api.stop();
                }
            }
        },
        [api],
    );

    useEffect(() => {
        if (!api || audioSource !== 'original' || !isYouTubeReady) return;
        if (!api.player?.output) return;

        const output = api.player.output as any;
        if (typeof output.updatePosition !== 'function') return;

        const syncInterval = setInterval(() => {
            const now = performance.now();
            if (now < postSeekLockUntilRef.current) return;
            if (isSeekingRef.current || !isPlayingRef.current) return;
            if (pauseTransitionRef.current) return;
            if (!youtubePlayerRef.current?.getCurrentTime) return;

            const ytTime = youtubePlayerRef.current.getCurrentTime();
            const offset = currentSong?.videoStartOffset || 0;
            const timeMs = Math.max(0, ytTime - offset) * 1000;

            try {
                output.updatePosition(timeMs);
            } catch (err) {
                console.error('❌ V98.67: updatePosition error:', err);
            }
            currentTimeRef.current = timeMs;
        }, 50);

        return () => clearInterval(syncInterval);
    }, [api, audioSource, isYouTubeReady, currentSong?.videoStartOffset]);

    useEffect(() => {
        if (!api || !playerReady || !api.player?.output) return;
        const output = api.player.output as any;
        if (youTubeMediaHandlerInstance) {
            output.handler = youTubeMediaHandlerInstance;
        }
        return () => {
            if (api.player?.output) {
                const out = api.player.output as any;
                if (out.handler) out.handler = null;
            }
        };
    }, [api, playerReady, youTubeMediaHandlerInstance]);

    useEffect(() => {
        if (!api) return;
        (api.settings.player as any).enableUserInteraction = isLooping;
        api.updateSettings();
    }, [api, isLooping]);

    // ==================== SONG LIBRARY ====================
    const handleSongSelect = useCallback((songId: string) => {
        setIsLooping(false);
        setHasLoopSelection(false);
        if (api?.playbackRange) {
            api.playbackRange = null;
        }
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
    }, [api]);

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
                            return { ...playlist, songIds: playlist.songIds.filter(id => id !== songId) };
                        }
                    }
                    return playlist;
                }),
            }));
        },
        [],
    );

    // ✅ STEP 7: handleDeletePlaylist
    const handleDeletePlaylist = useCallback((playlistId: string) => {
        setSongState(prev => ({
            ...prev,
            playlists: prev.playlists.filter(p => p.id !== playlistId),
        }));
    }, []);

    const handleThemeToggle = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

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
                {/* ✅ STEP 8: onNewTabOpen added */}
                <TopMenuTray
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => setIsSongSelectorOpen(true)}
                    onNewTabOpen={() => setIsNewTabOpen(true)}
                />
            </div>

            {/* ✅ STEP 9: MyTabsPanel — pencil triggers MetadataEditorPanel overlay */}
            <MyTabsPanel
                isOpen={isSongSelectorOpen}
                onClose={() => setIsSongSelectorOpen(false)}
                songs={songState.songs}
                playlists={songState.playlists}
                currentSong={songState.songs.find(s => s.id === songState.currentSongId) ?? null}
                onSongSelect={handleSongSelect}
                onToggleFavorite={handleToggleFavorite}
                onPlaylistAction={(type, songId, playlistId) => handlePlaylistAction(type, songId, playlistId)}
                onCreatePlaylist={handleCreatePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                isDarkMode={theme === 'dark'}
                onEditMetadata={(songId) =>
                    setMetaEditorState({ tabId: songId, source: 'mytabs' })
                }
            />

            {/* NewTabPanel */}
            <NewTabPanel
                isOpen={isNewTabOpen}
                onClose={() => setIsNewTabOpen(false)}
                theme={theme}
            />

            {/* ✅ V99.3: MetadataEditorPanel — in-app overlay, peer to MyTabsPanel */}
            {metaEditorState.tabId && (
                <MetadataEditorPanel
                    tabId={metaEditorState.tabId}
                    onClose={() => {
                        const src = metaEditorState.source;
                        setMetaEditorState({ tabId: null, source: null });
                        if (src === 'mytabs') setIsSongSelectorOpen(true);
                        // src === 'newtab' → add setIsNewTabOpen(true) when wiring NewTabPanel
                    }}
                />
            )}

            <main
                ref={mainScrollContainerRef}
                className={`
                    w-full overscroll-y-contain
                    ${isMobileLandscape
                        ? 'h-[calc(100vh-80px)] overflow-x-auto overflow-y-hidden relative'
                        : 'pb-32 overflow-y-auto overflow-x-hidden'
                    }
                    ${!isMobileLandscape && isHeaderVisible ? 'pt-16' : 'pt-0'}
                    transition-[padding] duration-300 ease-in-out
                `}
                style={isMobileLandscape ? {
                    maxWidth: '100vw',
                    width: '100vw'
                } : undefined}
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
                        relative bg-white
                        ${isMobileLandscape
                            ? 'h-full'
                            : 'w-full'
                        }
                    `}
                    style={isMobileLandscape ? {
                        paddingTop: '50px',
                        paddingBottom: '450px',
                        display: 'inline-block',
                        minWidth: '100%',
                        width: 'max-content',
                    } : undefined}
                >
                    {/* ✅ STEP 6: AlphaTabRenderer gated on signedUrl.
                        key={signedUrl} forces clean remount on song change —
                        this is the fix for the blank canvas rendering bug. */}
                    {signedUrl && (
                        <AlphaTabRenderer
                            key={signedUrl}
                            fileUrl={signedUrl}
                            playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                            externalMediaHandler={youTubeMediaHandlerInstance}
                            soundFontPath="/soundfont/sonivox.sf2"
                            scrollContainerRef={mainScrollContainerRef}
                            isMobileLandscape={isMobileLandscape}
                            isSeeking={isSeeking}
                            isPlaying={isPlaying}
                            selectedTrackIndex={selectedTrack}
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRenderFinished={handleRenderFinished}
                            onError={handleError}
                            minHeight="600px"
                            isLooping={isLooping}
                            onLoopRangeChange={handleLoopRangeChange}
                            audioSource={audioSource}
                            theme={theme}
                        />
                    )}
                </div>

                {!isMobileLandscape && (
                    <div className="px-4 mt-8">
                        <div className="max-w-4xl mx-auto bg-gray-800/50 border border-purple-500/30 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-purple-300 mb-4">📝 Practice Notes</h3>
                            <div className="space-y-3 text-gray-300">
                                <p className="text-sm"><strong className="text-white">Strumming Pattern:</strong> Down, Down-Up, Up-Down-Up</p>
                                <p className="text-sm"><strong className="text-white">Key Points:</strong> Focus on clean transitions between chords.</p>
                                <p className="text-sm"><strong className="text-white">Practice Tip:</strong> Start at 75% speed and gradually increase tempo.</p>
                                <p className="text-sm text-gray-400 italic">💡 Use the Loop button to repeat difficult sections</p>
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
                        masterVolume={masterVolume}
                        onMasterVolumeChange={handleMasterVolumeChange}
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
                        pitchShift={pitchShift}
                        onPitchShiftToggle={handlePitchShiftToggle}
                        isCountInEnabled={isCountInEnabled}
                        onCountInToggle={handleCountInToggle}
                        countInMode={countInMode}
                        onCountInModeChange={setCountInMode}
                        isMetronomeEnabled={isMetronomeEnabled}
                        onMetronomeToggle={handleMetronomeToggle}
                        metronomeVolume={metronomeVolume}
                        onMetronomeVolumeChange={setMetronomeVolume}
                        metronomeBalance={metronomeBalance}
                        onMetronomeBalanceChange={setMetronomeBalance}
                        metronomeSubdivision={metronomeSubdivision}
                        onMetronomeSubdivisionChange={(subdivision: number) => setMetronomeSubdivision(subdivision as SubdivisionMode)}
                        metronomeSoundType={metronomeSoundType}
                        onMetronomeSoundTypeChange={(sound: string) => setMetronomeSoundType(sound as MetronomeSoundType)}
                        metronomeAccentEnabled={metronomeAccentEnabled}
                        onMetronomeAccentToggle={() => setMetronomeAccentEnabled(prev => !prev)}
                        onArmMetronome={armMetronome}
                        currentBPM={currentBPM}
                        onSlideoutShouldClose={() => slideoutCloseRef.current?.()}
                        registerCloseAllPanels={(closeFunc) => {
                            closeControlPanelsRef.current = closeFunc;
                        }}
                    />
                )}
            </footer>

            <CountInOverlay
                count={countdownValue}
                isVisible={isCountingDown}
                mode={countInMode}
                onComplete={() => console.log('🎵 Countdown complete')}
            />

            {!isMobileLandscape && (
                <div className="md:hidden" style={{ zIndex: 50 }}>
                    <MobileToolsSlideout
                        isCountInEnabled={isCountInEnabled}
                        onCountInToggle={handleCountInToggle}
                        countInMode={countInMode}
                        onCountInModeChange={setCountInMode}
                        isMetronomeEnabled={isMetronomeEnabled}
                        onMetronomeToggle={handleMetronomeToggle}
                        currentBPM={currentBPM}
                        audioSource={audioSource}
                        metronomeVolume={metronomeVolume}
                        onMetronomeVolumeChange={setMetronomeVolume}
                        metronomeBalance={metronomeBalance}
                        onMetronomeBalanceChange={setMetronomeBalance}
                        metronomeSubdivision={metronomeSubdivision}
                        onMetronomeSubdivisionChange={(subdivision: number) => setMetronomeSubdivision(subdivision as SubdivisionMode)}
                        metronomeSoundType={metronomeSoundType}
                        onMetronomeSoundTypeChange={(sound: string) => setMetronomeSoundType(sound as MetronomeSoundType)}
                        metronomeAccentEnabled={metronomeAccentEnabled}
                        onMetronomeAccentToggle={() => setMetronomeAccentEnabled(prev => !prev)}
                        showEdgeTab={true}
                        onArmMetronome={armMetronome}
                        isMobileLandscape={isMobileLandscape}
                        onOtherPanelOpened={() => {
                            closeControlPanelsRef.current?.();
                        }}
                    />
                </div>
            )}

            {audioSource === 'original' && isYouTubePlayerVisible && activeVideoId && (
                <div
                    className="youtube-player-container"
                    style={{
                        position: 'fixed',
                        bottom: isMobileLandscape ? 0 : 80,
                        right: isMobileLandscape ? 0 : 16,
                        zIndex: 40,
                        width: '240px',
                        height: '427px',
                        maxWidth: '240px',
                        maxHeight: '427px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        borderRadius: '8px',
                    }}
                >
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
                </div>
            )}
        </div>
    );
}