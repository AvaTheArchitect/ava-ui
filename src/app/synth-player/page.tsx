'use client';

/**
 * STAGE 4 - Synth + YouTube + Pitch Shift + Count-In + Headless Metronome
 * January 4th, 2026 - V98.22: FIXED ALPHATAB INTERNAL HEADER + 2-ROW LAYOUT
 *
 * 🔧 V98.20 LATEST UPDATE - FIXED CONTAINER CONSTRAINTS:
 * ✅ Fixed YouTube Player container to properly constrain child component:
 *    - Added overflow: 'hidden' to prevent player from escaping container
 *    - Added explicit constraints with max-width/max-height
 *    - Player now properly respects 240x427 portrait dimensions
 *    - Fixed z-index to appear BELOW Mobile Drawer (z-index: 40)
 *    - Player slides up onto canvas AFTER drawer closes
 * ✅ Fixed Mobile Drawer full-screen issue in landscape:
 *    - Mobile Drawer now has higher z-index (z-index: 50)
 *    - Drawer appears as small overlay in lower right (not full-screen)
 * ✅ Fixed landscape header to show artist/title at start:
 *    - Removed `right-0` to prevent width constraint
 *    - Header now properly displays full artist/title text
 * 
 * 🔧 V98.19 PREVIOUS UPDATE:
 * ✅ Fixed YouTube Player to use PORTRAIT ratio (9:16) like Songsterr:
 *    - Changed from 400x225 (16:9 landscape) to 240x427 (9:16 portrait)
 *    - Player is now TALLER than WIDE in BOTH orientations (matches Songsterr)
 *    - Bottom padding updated to 450px to account for taller player
 *    - Prevents vertical space competition with AlphaTab
 *    - Player stays same size when rotating between portrait/landscape
 * 
 * 🔧 V98.18 PREVIOUS UPDATE:
 * ✅ Fixed YouTube Player Vertical Space Competition:
 *    - YouTube player locked to 400x225px in BOTH orientations (same as Songsterr)
 *    - Wrapped in fixed-size container to prevent shrinking/growing
 *    - Staff no longer gets pushed down when YT player appears
 *    - Header locked to 100vw with single-line text (no drift)
 *    - Maestro-player has bottom padding (240px) to account for YT player height
 *    - Fixes the 10-20 second cascade loop completely
 *    - Root cause: YT player was competing with AlphaTab for vertical space
 * 
 * 🔧 V98.17 PREVIOUS UPDATE:
 * ✅ Fixed Cascading Glitch with Container Constraints:
 *    - Main container locked to 100vw max-width (prevents viewport expansion)
 *    - Removed w-max from maestro-player (was causing reflow)
 *    - Added inline-block style with width: max-content for AlphaTab expansion
 *    - Prevents parent containers from inheriting massive width
 *    - Header stays at screen width with explicit maxWidth style
 *    - Fixes rendering loop and header positioning issues
 *    - Only content scrolls horizontally, viewport stays locked
 * 
 * 🔧 V98.16 PREVIOUS UPDATE:
 * ✅ Fixed Cascading Glitch on Mobile Landscape Mode Switch:
 *    - Added 150ms debounce to orientation detection
 *    - Prevents feedback loop: page.tsx resize → AlphaTabRenderer re-render → api.render() → DOM change → resize event
 *    - Only updates state when orientation ACTUALLY changes (not on every resize)
 *    - Fixes 337-cycle cascade when switching from synth to original mode
 *    - Console logs orientation changes for debugging
 * 
 * 🔧 V98.15 PREVIOUS UPDATE:
 * ✅ Desktop Metronome Button Integration:
 *    - Added isMetronomeEnabled and onMetronomeToggle to MaestroControlPanel
 *    - Metronome button now appears in desktop TransportBar
 *    - Triangle icon shows in bottom menu tray
 *    - Auto-grays out in YouTube mode (shows "Synth mode only" tooltip)
 *    - Button turns GREEN when enabled, BLUE when disabled
 *    - Works alongside mobile MobileToolsSlideout
 * 
 * 🔧 V98.15 PREVIOUS FIXES:
 * ✅ Mobile PWA Audio Context Fix (Complete):
 *    - useSmartMetronome V3 now properly returns armMetronome function
 *    - Destructured armMetronome from hook (no workaround needed)
 *    - Pass armMetronome to MobileToolsSlideout as onArmMetronome
 *    - Mobile browsers recognize metronome toggle as user interaction
 *    - Audio context properly initialized on first metronome toggle
 *    - Check console for "🔊 Audio Context Armed via User Gesture"
 * ✅ Issue #1 (No metronome sound):
 *    - Audio context now properly resumed for mobile
 *    - Added debug logging for tick events
 *    - Check console for "🥁 Metronome tick" messages
 * ✅ Issue #2 (Controls in wrong place):
 *    - Removed MetronomeSettings modal
 *    - All metronome controls now INSIDE MobileToolsSlideout
 *    - Collapsible "Options" section for inline controls
 * ✅ Issue #3 (4-beat count-in not working):
 *    - Updated CountInOverlay with mode prop
 *    - Updated handlePlayPause to support both 3-beat and 4-beat
 *    - Count-in mode buttons work correctly in slideout
 * 
 * 🆕 V98.15 FEATURES:
 * ✅ Count-in with tick sound (3-beat or 4-beat)
 * ✅ Auto-disable Count In after countdown
 * ✅ CountInOverlay component with mode support
 * ✅ useSmartMetronome V3 headless hook:
 *    - BPM sync from AlphaTab score
 *    - Playback speed compensation
 *    - Volume and stereo balance controls
 *    - Subdivision modes (quarter, eighth, triplet, sixteenth notes)
 *    - Accent toggle for downbeat emphasis
 *    - 7 sound types: Woodblock, Click, Beep, Drum Stick, Electronic, Kick Drum, Snare Drum
 *    - Auto-disable in YouTube mode (synth only)
 *    - armMetronome function for mobile PWA audio context initialization
 * ✅ Desktop TransportBar integration:
 *    - Professional triangle metronome icon
 *    - Active in Synth mode (blue/green)
 *    - Grayed out in YouTube mode
 *    - Tooltip shows mode requirements
 * ✅ MobileToolsSlideout with inline controls:
 *    - Professional metronome icon (triangle shape)
 *    - All metronome controls inside (no separate modal)
 *    - Optional orange visual aid tab (toggleable)
 *    - BPM display
 *    - Count-in mode selector (3-beat/4-beat)
 *    - Audio context arming button for mobile
 * ✅ BPM tracking from AlphaTab score tempo
 */

import React, {
    useState,
    useCallback,
    useRef,
    useEffect,
    useMemo,
} from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { TuningOverlay } from '@/components/alphaTab/TuningOverlay';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray, MobileToolsSlideout } from '@/components/audio/maestro/layout';
import { SongSelector } from '@/components/audio/maestro/songs';
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

    // Pause transition flag
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
        console.log(`🎬 V98.15: Current song: ${currentSong?.title} by ${currentSong?.artist}`);
        console.log(`🎬 V98.15: YouTube ID: ${videoId}`);
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
    // 🔧 V98.22: Bidirectional panel coordination
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
        console.log(`🎵 V98.15: handlePitchShiftChange called with ${semitones} semitones`);
        setPitchShift(semitones);

        if (api) {
            console.log(`🎵 V98.15: API exists, checking score...`);
            if (api.score?.tracks) {
                try {
                    const allTracks = api.score.tracks;
                    console.log(`🎵 V98.15: Calling changeTrackTranspositionPitch on ${allTracks.length} tracks`);
                    api.changeTrackTranspositionPitch(allTracks, semitones);
                    console.log(`✅ V98.15: Audio pitch shifted by ${semitones} semitones`);
                } catch (err) {
                    console.error('❌ V98.15: changeTrackTranspositionPitch error:', err);
                }
            } else {
                console.warn('⚠️ V98.15: No score or tracks available');
            }
        } else {
            console.warn('⚠️ V98.15: API not available');
        }
    }, [api]);

    const handlePitchShiftToggle = useCallback((anchorRect?: { top: number; left: number }) => {
        if (audioSource !== 'synth') {
            console.log('⚠️ V98.15: Pitch shift only available in Synth mode');
            return;
        }

        setIsPitchPopoverOpen(prev => {
            if (!prev && anchorRect) {
                setPitchPopoverAnchor(anchorRect);
            }
            return !prev;
        });
    }, [audioSource]);

    // ==================== COUNT IN TOGGLE ====================
    const handleCountInToggle = useCallback(() => {
        setIsCountInEnabled(prev => !prev);
        console.log('🔔 Count In toggled:', !isCountInEnabled);
    }, [isCountInEnabled]);

    // ==================== METRONOME HANDLERS ====================
    const handleMetronomeToggle = useCallback(() => {
        // Auto-disable if in YouTube mode
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
            console.log('🔄 V98.15: Pitch reset on song change');
        }
    }, [currentFileUrl]);

    // ==================== EXTERNAL MEDIA HANDLER ====================
    const youTubeMediaHandlerInstance = useMemo(() => {
        console.log('🎬 V98.15: Creating YouTube handler instance');

        return {
            play: () => {
                console.log('▶️ V98.15: Handler.play() called');

                if (initialSeekRef.current >= 0 && youtubePlayerRef.current?.seekTo) {
                    console.log(`⏱️ V98.15: Applying deferred seek to ${initialSeekRef.current.toFixed(2)}s on play`);
                    youtubePlayerRef.current.seekTo(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                    postSeekLockUntilRef.current = performance.now() + 200;
                }

                if (youtubePlayerRef.current?.playVideo) {
                    youtubePlayerRef.current.playVideo();
                }
            },

            pause: () => {
                console.log('⏸️ V98.15: Handler.pause() called');
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
    // 🔧 V98.16: Added debounce to prevent cascade loop on mode switch
    useEffect(() => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let lastValue: boolean | null = null;

        const checkOrientation = () => {
            // Clear any pending debounce
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }

            // Debounce to prevent cascade from rapid resize events
            debounceTimer = setTimeout(() => {
                const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                const isLandscape = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
                const isCompactHeight = typeof window !== 'undefined' && window.innerHeight < 600;
                const newValue = isTouchDevice && isLandscape && isCompactHeight;

                // 🔧 V98.16: Only update state if value ACTUALLY changed
                if (lastValue !== newValue) {
                    lastValue = newValue;
                    console.log(`📱 V98.16: Orientation changed to ${newValue ? 'LANDSCAPE' : 'PORTRAIT'}`);
                    setIsMobileLandscape(newValue);
                }
            }, 150); // 150ms debounce prevents cascade
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

    // Reset scroll position in landscape
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
            console.log('✅ V98.15: API Ready');
            setApi(alphaTabApi);

            if (alphaTabApi.playerReady) {
                alphaTabApi.playerReady.on(() => {
                    console.log('✅ V98.15: Player Ready');
                    setPlayerReady(true);

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

    // ==================== SCORE LOADED WITH TUNING EXTRACTION ====================
    const handleScoreLoaded = useCallback(
        (info: SongInfo, trackList: Track[]) => {
            console.log(`✅ V98.15: Score loaded - ${info.title}`);
            setSongInfo(info);
            setTracks(trackList);
            setSelectedTrack(0);
            setError(null);
            setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
            setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));

            // Extract tuning data
            if (api?.score?.tracks?.[0]?.staves?.[0]) {
                const staff = api.score.tracks[0].staves[0];
                if (staff.stringTuning && staff.stringTuning.tunings) {
                    setTuningData(staff.stringTuning.tunings);
                    console.log('🎸 V98.15: Tuning extracted:', staff.stringTuning.tunings);
                }
            }

            setPitchShift(0);
        },
        [api],
    );

    const handleRenderFinished = useCallback(() => {
        console.log('✅ V98.15: Rendering Complete');
    }, []);

    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ V98.15 ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    // ==================== PLAY/PAUSE WITH COUNT-IN ====================
    const handlePlayPause = useCallback(async () => {
        if (!api) return;

        // ========== COUNT-IN LOGIC (SUPPORTS BOTH MODES) ==========
        if (!isPlaying && isCountInEnabled) {
            const maxCount = countInMode === 'four-beat' ? 4 : 3;
            console.log(`🔔 Starting ${maxCount}-beat countdown...`);
            setIsCountingDown(true);

            // Countdown (visual only - CountInOverlay handles sound)
            for (let i = maxCount; i > 0; i--) {
                setCountdownValue(i);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setCountdownValue(0);
            setIsCountingDown(false);
            setIsCountInEnabled(false); // Auto-disable after use
            console.log('✅ Countdown complete, Count In auto-disabled');
        }

        // ========== EXISTING PLAYBACK LOGIC ==========
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

    // ==================== AUDIO SOURCE CHANGE WITH PITCH RESET ====================
    const handleAudioSourceChange = useCallback(
        (source: 'synth' | 'original') => {
            setAudioSource(source);

            if (source === 'original' && pitchShift !== 0) {
                setPitchShift(0);
                if (api?.score?.tracks) {
                    try {
                        api.changeTrackTranspositionPitch(api.score.tracks, 0);
                    } catch (err) {
                        console.error('❌ V98.15: Reset pitch error:', err);
                    }
                }
            }

            if (api) {
                api.masterVolume = source === 'original' ? 0 : 1;
            }

            if (source === 'original' && activeVideoId) {
                setIsYouTubePlayerVisible(true);
            }

            if (source === 'synth') {
                setIsYouTubePlayerVisible(false);
                setIsYouTubeReady(false);
            }
        },
        [api, activeVideoId, pitchShift],
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
        console.log('✅ V98.15: YouTube player ready');
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

    // 50ms CURSOR SYNC LOOP
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
                console.error('❌ V98.15: updatePosition error:', err);
            }
            currentTimeRef.current = timeMs;
        }, 50);

        return () => clearInterval(syncInterval);
    }, [api, audioSource, isYouTubeReady, currentSong?.videoStartOffset]);

    // ENSURE HANDLER IS ATTACHED
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

    // ENABLE USER INTERACTION
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

    const handleThemeToggle = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    // ==================== RENDER ====================
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

            {/* 🔧 V98.22: Landscape header - BELOW TopMenuTray */}
            {isMobileLandscape && currentSong && (
                <div
                    className="fixed left-0 right-0 z-40 bg-gradient-to-b from-gray-900/90 to-transparent py-1 px-4"
                    style={{
                        // Position below TopMenuTray (which is ~64px tall)
                        top: '64px',
                        width: '100vw',
                        maxWidth: '100vw',
                    }}
                >
                    <div className="flex items-center justify-center gap-2 text-white text-xs font-medium">
                        {/* 🔧 V98.22: Songsterr format - "Artist | Title" */}
                        <span className="truncate">{currentSong.artist}</span>
                        <span className="text-gray-400">|</span>
                        <span className="truncate">{currentSong.title}</span>
                    </div>
                </div>
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
                    // 🔧 V98.21: Lock viewport width, allow horizontal scroll for content
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
                        // 🔧 V98.22: Reduced top padding (smaller 2-row header)
                        paddingTop: '50px',  // Header height (was 60px)
                        paddingBottom: '450px',  // YouTube player + controls
                        display: 'inline-block',
                        minWidth: '100%',
                        width: 'max-content',
                    } : undefined}
                >
                    <TuningOverlay
                        api={api}
                        tuning={tuningData}
                        pitchShift={pitchShift}
                        onPitchShiftChange={handlePitchShiftChange}
                        isSynthMode={audioSource === 'synth'}
                        theme={theme}
                        isReady={playerReady && !!songInfo}
                        isPlaying={isPlaying}
                        isPopoverOpen={isPitchPopoverOpen}
                        onPopoverToggle={setIsPitchPopoverOpen}
                        popoverAnchor={pitchPopoverAnchor}
                    />

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
                        theme={theme}
                    />
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
                        onSlideoutShouldClose={() => slideoutCloseRef.current?.()} // 🔧 V98.22: Panel coordination
                        registerCloseAllPanels={(closeFunc) => {
                            closeControlPanelsRef.current = closeFunc;
                        }} // 🔧 V98.22: Register close function
                    />
                )}
            </footer>

            {/* COUNT IN OVERLAY - Updated with mode support */}
            <CountInOverlay
                count={countdownValue}
                isVisible={isCountingDown}
                mode={countInMode}
                onComplete={() => console.log('🎵 Countdown complete')}
            />

            {/* 🆕 MOBILE TOOLS SLIDEOUT - Hidden on desktop */}
            {/* 🔧 V98.22: Completely disabled in landscape to prevent phantom drawer */}
            {!isMobileLandscape && (
                <div className="md:hidden" style={{ zIndex: 50 }}>
                    <MobileToolsSlideout
                        // Count-in
                        isCountInEnabled={isCountInEnabled}
                        onCountInToggle={handleCountInToggle}
                        countInMode={countInMode}
                        onCountInModeChange={setCountInMode}

                        // Metronome
                        isMetronomeEnabled={isMetronomeEnabled}
                        onMetronomeToggle={handleMetronomeToggle}
                        currentBPM={currentBPM}
                        audioSource={audioSource}

                        // Metronome inline controls (inside slideout)
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

                        // Visual aid
                        showEdgeTab={true}

                        // 🔧 Audio arming function for mobile PWA
                        onArmMetronome={armMetronome}

                        // 🔧 V98.22: Bidirectional panel coordination
                        isMobileLandscape={isMobileLandscape}
                        onOtherPanelOpened={() => {
                            // Close Track Mixer/Speed/Gear when slideout opens
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
                        zIndex: 40, // BELOW Mobile Drawer (z-index: 50)
                        // 🔧 V98.21 CRITICAL: PORTRAIT RATIO (9:16) like Songsterr
                        width: '240px',
                        height: '427px',
                        maxWidth: '240px',
                        maxHeight: '427px',
                        flexShrink: 0, // 🔧 V98.21: Prevents fighting with AlphaTab for space
                        overflow: 'hidden', // Force player to stay within bounds
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