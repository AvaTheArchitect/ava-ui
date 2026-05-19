'use client';

/**
 * Synth Player Page — Phase 4 V102.16
 * Date: May 2026
 * Cloned from V102.15 — GPU-composited tray animation polish.
 *
 * V102.16 CHANGES:
 * ✅ [VA1] TopMenuTray wrapper: duration-300 → duration-200 ease-out + will-change-transform.
 *          200ms ease-out matches Songsterr's snappier slide feel.
 *          will-change-transform promotes the layer to GPU before animation fires.
 *          No intent-guard logic touched.
 *
 * V102.15 LOCKED EXACTLY:
 * ✅ [TG4-clean] All unconditional diagnostic logs removed (module, render, effect).
 * ✅ Remaining debug output gated behind localStorage.getItem('maestro_header_debug') === '1'.
 * ✅ Intent-guard architecture locked — do not modify without a new version tag.
 * ✅ [TG1] wheel → window capture, filtered by el.contains(target). Sets userScrollIntentUntilRef 700ms on scroll-up.
 * ✅ [TG2] pointerdown → window capture, same filter. Scrollbar heuristic: clientX > rect.right - 20. Sets intent 1000ms.
 * ✅ [TG3] scroll-up reveal gated by userScrollIntentUntilRef.current > performance.now().
 *          Programmatic auto-scroll (note click / cursor) cannot reveal tray.
 * ✅ [TG-cleanup] Both window listeners removed with matching { capture: true }.
 * ✅ [PS1b] Tray hides immediately when isPlaying → true.
 * ✅ [PS3-removed] No auto-restore on pause.
 * ✅ All V102.11/V102.10/V102.9/V102.7 changes intact.
 */

import React, {
    useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { supabase } from '@/lib/alphaTab/supabase';
// 🔒 DEPLOYMENT ENTRYPOINT — always import from AlphaTabRenderer, never from versioned files.
import { AlphaTabRendererV102 } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray, MobileToolsSlideout } from '@/components/audio/maestro/layout';
import { MyTabsPanel } from '@/components/audio/maestro/tabs/MyTabsPanel';
import { NewTabPanel } from '@/components/audio/maestro/tabs/NewTabPanel';
import { MetadataEditorPanel } from '@/components/audio/maestro/tabs/MetadataEditorPanel';
import { YouTubePlayer } from '@/components/audio/maestro/media/YouTubePlayer';
import {
    CountInOverlay,
    useSmartMetronome,
    type MetronomeSoundType,
    type SubdivisionMode,
} from '@/components/audio/maestro/controls';
import { fetchSongs } from '@/lib/song-data/queries';
import { getSongById, type SongState } from '@/lib/song-data';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

const SCROLL_THRESHOLD = 50;

// ── V102.6: Cursor A/B toggle ─────────────────────────────────────────────────
const CURSOR_V2_ACTIVE = true;
// ─────────────────────────────────────────────────────────────────────────────

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
    const [playerReady, setPlayerReady] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    // [C5] audioSource is now state — was 'synth' as const
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');

    // ==================== YOUTUBE STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const youtubePlayerRef = useRef<any>(null);
    const pauseTransitionRef = useRef<boolean>(false);

    // ==================== MASTER VOLUME ====================
    const [masterVolume, setMasterVolume] = useState<number>(1.0);
    const masterVolumeRef = useRef<number>(1.0);
    useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);

    // ==================== COUNT IN ====================
    const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(false);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const [countdownValue, setCountdownValue] = useState<number>(0);
    const [countInMode, setCountInMode] = useState<'three-beat' | 'four-beat'>('three-beat');

    // ==================== METRONOME ====================
    const [isMetronomeEnabled, setIsMetronomeEnabled] = useState<boolean>(false);
    const [metronomeVolume, setMetronomeVolume] = useState<number>(0.7);
    const [metronomeBalance, setMetronomeBalance] = useState<number>(0);
    const [metronomeSoundType, setMetronomeSoundType] = useState<MetronomeSoundType>('woodblock');
    const [metronomeSubdivision, setMetronomeSubdivision] = useState<SubdivisionMode>(1);
    const [metronomeAccentEnabled, setMetronomeAccentEnabled] = useState<boolean>(true);
    const [currentBPM, setCurrentBPM] = useState<number>(120);

    const { effectiveBPM, armMetronome } = useSmartMetronome({
        isEnabled: isMetronomeEnabled,
        currentBPM,
        audioSource,
        isPlaying,
        isCountingDown,
        volume: metronomeVolume,
        balance: metronomeBalance,
        soundType: metronomeSoundType,
        subdivision: metronomeSubdivision,
        accentEnabled: metronomeAccentEnabled,
    });

    // ==================== PITCH SHIFT ====================
    const [pitchShift, setPitchShift] = useState<number>(0);
    const [tuningData, setTuningData] = useState<number[]>([64, 59, 55, 50, 45, 40]);
    const [isPitchPopoverOpen, setIsPitchPopoverOpen] = useState<boolean>(false);
    const [pitchPopoverAnchor, setPitchPopoverAnchor] = useState<{ top: number; left: number } | null>(null);

    // ==================== LOOP STATE ====================
    const [isLooping, setIsLooping] = useState<boolean>(false);
    const [hasLoopSelection, setHasLoopSelection] = useState<boolean>(false);
    const [playbackRange, setPlaybackRange] = useState<{ startTick: number; endTick: number } | null>(null);

    // ==================== TRACK MIXER ====================
    const [trackMuteState, setTrackMuteState] = useState<Map<number, boolean>>(new Map());
    const [trackSoloState, setTrackSoloState] = useState<Map<number, boolean>>(new Map());
    const originalTrackVolsRef = useRef<Map<number, number>>(new Map());

    // ==================== THEME ====================
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // ==================== SONG STATE ====================
    const [songState, setSongState] = useState<SongState>({ songs: [], playlists: [], currentSongId: null });
    const [isSongSelectorOpen, setIsSongSelectorOpen] = useState(false);
    const [isNewTabOpen, setIsNewTabOpen] = useState(false);
    const [metaEditorState, setMetaEditorState] = useState<{ tabId: string | null; source: 'mytabs' | 'newtab' | null }>
        ({ tabId: null, source: null });

    // ==================== SIGNED URL CACHE ====================
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const signedUrlCacheRef = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());
    const signedUrlRetryRef = useRef<Set<string>>(new Set());

    // ==================== FETCH SONGS + BATCH SIGN ====================
    // [C1] Extracted to useCallback so NewTabPanel can trigger a re-fetch after upload.
    // ?? preserves the currently playing song instead of jumping back to index 0.
    const refetchSongs = useCallback(async () => {
        const songs = await fetchSongs();
        if (!songs.length) return;
        const paths = songs
            .map(s => s.file_path || (s.file_name && s.file_extension ? `${s.file_name}.${s.file_extension}` : null))
            .filter(Boolean) as string[];
        const { data: urlData } = await supabase.storage.from('tabs').createSignedUrls(paths, 3600);
        if (urlData) {
            const expiresAt = Date.now() + 55 * 60 * 1000;
            urlData.forEach(entry => {
                if (entry.path && entry.signedUrl)
                    signedUrlCacheRef.current.set(entry.path, { url: entry.signedUrl, expiresAt });
            });
            console.log(`✅ Phase 3: Batch signed ${urlData.length} URLs`);
        }
        const sortedSongs = songs
            .slice()
            .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base' }));
        setSongState(prev => ({
            ...prev,
            songs: sortedSongs,
            currentSongId: prev.currentSongId ?? sortedSongs[0]?.id ?? null,
        }));
    }, []);
    useEffect(() => { refetchSongs(); }, [refetchSongs]);

    const currentSong = useMemo(
        () => getSongById(songState.songs, songState.currentSongId || ''),
        [songState.songs, songState.currentSongId],
    );

    // Derived YouTube ID — after currentSong so the reference is valid
    const defaultYouTubeId = useMemo(() =>
        (currentSong as any)?.youtubeVideoId ?? null,
        [currentSong]);
    const activeVideoId = currentVideoId || defaultYouTubeId;

    // Reset video override when song changes
    useEffect(() => {
        setCurrentVideoId(null);
        setIsYouTubeReady(false);
    }, [defaultYouTubeId]);

    // ==================== SIGNED URL RESOLVER ====================
    useEffect(() => {
        // [C4] Support file_path-only rows (new uploads) alongside legacy file_name+extension rows.
        const path =
            currentSong?.file_path ||
            (currentSong?.file_name && currentSong?.file_extension
                ? `${currentSong.file_name}.${currentSong.file_extension}`
                : null);
        if (!path) return;
        setSignedUrl(null);
        setSongInfo(null);
        setTracks([]);
        setSelectedTrack(0);
        setError(null);
        signedUrlRetryRef.current.delete(path);
        const cached = signedUrlCacheRef.current.get(path);
        if (cached && cached.expiresAt > Date.now()) {
            setSignedUrl(cached.url);
        } else {
            supabase.storage.from('tabs').createSignedUrl(path, 3600).then(({ data, error }) => {
                if (error || !data?.signedUrl) {
                    setError(`Failed to load tab for "${currentSong?.title ?? 'this tab'}"`);
                    return;
                }
                const expiresAt = Date.now() + 55 * 60 * 1000;
                signedUrlCacheRef.current.set(path, { url: data.signedUrl, expiresAt });
                setSignedUrl(data.signedUrl);
            });
        }
    }, [currentSong]);

    // ==================== EXTERNAL CLOCK DRIVER ====================
    // RAF-based monotonic clock driver for Original mode cursor.
    // - Monotonic clamp prevents AlphaTab seeing backward time (main jitter cause).
    // - RAF produces smoother cursor motion than setInterval.
    // - State dedup in handleYouTubeStateChange prevents api.play() spam during buffering.
    const lastDrivenMsRef = useRef<number>(0);
    const externalClockRafRef = useRef<number | null>(null);
    const SEEK_BACKWARD_THRESHOLD_MS = 800; // treat as user seek if time jumps back > this

    useEffect(() => {
        if (audioSource !== 'original') return;
        if (!api || !isYouTubeReady) return;
        const out = (api.player?.output as any) ?? null;
        if (!out || typeof out.updatePosition !== 'function') return;

        const tick = () => {
            if (isPlayingRef.current && youtubePlayerRef.current?.getCurrentTime) {
                const ytSecs = youtubePlayerRef.current.getCurrentTime();
                const offset = (currentSong as any)?.videoStartOffset ?? 0;
                const rawMs = Math.max(0, ytSecs - offset) * 1000;
                const lastMs = lastDrivenMsRef.current;
                // Allow genuine user seeks (big backward jump), otherwise clamp monotonic
                const isBigBackwardSeek = rawMs < lastMs - SEEK_BACKWARD_THRESHOLD_MS;
                const timeMs = isBigBackwardSeek ? rawMs : Math.max(lastMs, rawMs);
                lastDrivenMsRef.current = timeMs;
                out.updatePosition(timeMs);
                currentTimeRef.current = timeMs;
            }
            externalClockRafRef.current = requestAnimationFrame(tick);
        };

        externalClockRafRef.current = requestAnimationFrame(tick);
        return () => {
            if (externalClockRafRef.current !== null) {
                cancelAnimationFrame(externalClockRafRef.current);
                externalClockRafRef.current = null;
            }
            lastDrivenMsRef.current = 0;
        };
    }, [audioSource, api, isYouTubeReady, currentSong]);

    // ==================== TIME TRACKING ====================
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    useEffect(() => {
        if (!isPlaying) return;
        const id = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);
        return () => clearInterval(id);
    }, [isPlaying]);

    // ==================== SCROLL / LAYOUT ====================
    const mainScrollContainerRef = useRef<HTMLElement>(null);
    const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
    const [isMobileLandscape, setIsMobileLandscape] = useState<boolean>(false);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let last: boolean | null = null;
        const check = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
                const land = typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches;
                const compact = typeof window !== 'undefined' && window.innerHeight < 600;
                const v = touch && land && compact;
                if (last !== v) { last = v; setIsMobileLandscape(v); }
            }, 150);
        };
        check();
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', check);
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('resize', check);
            window.removeEventListener('orientationchange', check);
        };
    }, []);

    // ==================== TRAY AUTO-HIDE (scroll + playback) ====================
    // Songsterr rule: tray hides when playing starts, ONLY comes back from:
    //   (a) manual scroll-up gesture while paused, or (b) scrolling to within 10px of top.
    // No auto-restore on pause — user must actively scroll up to reveal.
    //
    // [TG1] wheel → window capture: AlphaTab's .at-surface SVG swallows wheel events
    //        before they bubble to <main>. Capture on window sees them first.
    // [TG2] pointerdown → window capture: same reason. Scrollbar detection via clientX.
    // [TG3] scroll-up reveal gated by userScrollIntentUntilRef — note clicks that cause
    //        programmatic auto-scroll no longer accidentally reveal the tray.

    // [PS2] Tracks previous scrollTop for direction detection.
    const lastScrollTopRef = useRef<number>(0);
    // [TG3] Set by wheel/scrollbar-pointer events; gating scroll-up → show tray.
    const userScrollIntentUntilRef = useRef<number>(0);
    // [PS2] Unused guards kept for forward compatibility.
    const suppressHeaderRevealUntilRef = useRef<number>(0);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    // [TG1] True when the pointer went down on the scroll container's scrollbar/rail.
    const isPointerOnScrollbarRef = useRef<boolean>(false);

    // [PS1b] Hide tray the moment playback starts.
    useEffect(() => {
        if (isPlaying) setIsHeaderVisible(false);
    }, [isPlaying]);

    // [PS2 + TG1/TG2/TG3] Scroll / wheel / pointer intent listeners.
    useEffect(() => {
        const el = mainScrollContainerRef.current;
        if (!el) return;

        // [TG1] Wheel on window capture — AlphaTab canvas swallows bubble path.
        // Filter: only act when target is inside <main>.
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as Node)) return;
            if (e.deltaY < 0) userScrollIntentUntilRef.current = performance.now() + 700;
        };
        window.addEventListener('wheel', onWheel, { passive: true, capture: true });

        // [TG2] Pointerdown on window capture — same reason.
        // Scrollbar heuristic: clientX near the right edge of <main>'s bounding rect.
        const onPointerDown = (e: PointerEvent) => {
            if (!el.contains(e.target as Node)) return;
            pointerStartRef.current = { x: e.clientX, y: e.clientY };
            const rect = el.getBoundingClientRect();
            const isScrollbar = e.clientX > rect.right - 20;
            isPointerOnScrollbarRef.current = isScrollbar;
            if (isScrollbar) userScrollIntentUntilRef.current = performance.now() + 1000;
        };
        window.addEventListener('pointerdown', onPointerDown, { capture: true });

        // [PS2] Scroll direction → show/hide tray.
        //   scroll down    → always hide
        //   scroll up      → show ONLY when not playing AND user intent confirmed [TG3]
        //   within 10px    → always show (user scrolled back to top)
        const onScroll = () => {
            const curr = el.scrollTop;
            const prev = lastScrollTopRef.current;
            // Belt-and-suspenders: OR both checks. isPlayingRef can lag during
            // seek-pause; api.playerState can be null between loads. [PS2-fix]
            const atApi = (window as any).__at;
            const liveIsPlaying = isPlayingRef.current || (atApi?.playerState ?? 0) === 1;
            if (curr < 10) {
                setIsHeaderVisible(true);
            } else if (curr > prev + 4) {
                setIsHeaderVisible(false);
            } else if (curr < prev - 4 && !liveIsPlaying) {
                // [TG3] Only reveal on confirmed user scroll-up intent (wheel or scrollbar pointer).
                // Programmatic auto-scroll from note clicks will not have set this window.
                if (userScrollIntentUntilRef.current > performance.now()) {
                    setIsHeaderVisible(true);
                }
            }
            lastScrollTopRef.current = curr;
        };
        el.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('wheel', onWheel, { capture: true });
            window.removeEventListener('pointerdown', onPointerDown, { capture: true });
            el.removeEventListener('scroll', onScroll);
        };
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data, error }) => {
            console.log('APP SESSION', data, error);
        });
        supabase.auth.getUser().then(({ data, error }) => {
            console.log('APP USER', data, error);
        });
    }, []);

    // ==================== BPM ====================
    useEffect(() => {
        if (api?.score?.masterBars?.[0]) {
            setCurrentBPM(api.score.masterBars[0].tempoAutomation?.value || 120);
        }
    }, [api, songInfo]);

    // ==================== PANEL REFS ====================
    const slideoutCloseRef = useRef<(() => void) | null>(null);
    const closeControlPanelsRef = useRef<(() => void) | null>(null);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // ==================== SHELL CALLBACKS ====================

    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ Phase 3: API ready');
        setApi(alphaTabApi);
        alphaTabApi.masterVolume = masterVolumeRef.current;
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime;
                durationRef.current = e.endTime;
            });
        }
    }, []);

    /** onScoreLoaded — V102.7: Songsterr-style tone-first track scoring. */
    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ Phase 3 V102.7: Score loaded — ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, i) => [i, false])));
        setTrackSoloState(new Map(trackList.map((_, i) => [i, false])));
        if (api?.score?.tracks) {
            const vols = new Map<number, number>();
            api.score.tracks.forEach((t: any, i: number) => {
                vols.set(i, (t.playbackInfo?.volume ?? 15) / 16);
            });
            originalTrackVolsRef.current = vols;
        }
        setPitchShift(0);

        // ── Track classifier helpers ──────────────────────────────────────────
        const normalize = (s: string) =>
            s.toLowerCase().trim().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

        const isDrumTrack = (t: Track) => {
            const n = normalize(t.name ?? '');
            return ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'].some(kw => n.includes(kw));
        };

        const isBassTrack = (t: Track) => normalize(t.name ?? '').includes('bass');

        // [V102.7] Vocal supreme override — must win before any guitar check.
        const isVocalTrack = (t: Track) =>
            /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal|chorus\s*vocal)/i
                .test(normalize(t.name ?? ''));

        const isAnyGuitarTrack = (t: Track) => {
            const n = normalize(t.name ?? '');
            if (isDrumTrack(t) || isBassTrack(t) || isVocalTrack(t)) return false;
            return ['guit', 'guitar', 'gtr', 'rhythm', 'acoustic', 'clean', 'dist', 'overdrive']
                .some(kw => n.includes(kw));
        };

        const guitarDefaultScore = (t: Track): number => {
            const n = normalize(t.name ?? '');
            if (isVocalTrack(t)) return -9999;
            if (isDrumTrack(t)) return -9999;
            if (isBassTrack(t)) return -200;
            let s = 0;
            if (n.includes('distortion')) s += 120;
            if (n.includes('overdriven') || n.includes('overdrive')) s += 110;
            if (n.includes('acoustic')) s += 105;
            if (n.includes('clean')) s += 95;
            if (/(guit|guitar|gtr)/.test(n)) s += 60;
            if (n.includes('rhythm guitar') || n.includes('rhythm gtr')) s += 25;
            if (n.includes('lead guitar') || n.includes('lead gtr')) s += 15;
            if (/(overdub|right ear|left ear|solo overdub|sitar|banjo|harmonica|tenor sax|clarinet|strings|synth|pad|orch|piano|organ|delay|fx|effect|bus|click|guide|reference)/.test(n)) s -= 40;
            return s;
        };

        const pickDefaultTrackIndex = (tl: Track[]): number => {
            let bestIdx = -1, bestScore = -9999;
            for (let i = 0; i < tl.length; i++) {
                const sc = guitarDefaultScore(tl[i]);
                if (sc > bestScore) { bestScore = sc; bestIdx = i; }
            }
            if (bestIdx >= 0 && bestScore > 0) return bestIdx;
            const anyG = tl.findIndex(isAnyGuitarTrack);
            if (anyG >= 0) return anyG;
            const nonVocal = tl.findIndex(t => !isVocalTrack(t) && !isDrumTrack(t));
            return nonVocal >= 0 ? nonVocal : 0;
        };

        trackList.forEach((t, i) => {
            const raw = t.name ?? '';
            console.log(`🎯 Track[${i}] raw="${raw}"`, {
                isDrum: isDrumTrack(t),
                isBass: isBassTrack(t),
                isVocal: isVocalTrack(t),
                isGuitar: isAnyGuitarTrack(t),
                score: guitarDefaultScore(t),
            });
        });

        const trackIndex = pickDefaultTrackIndex(trackList);
        console.log(`🎸 V102.7: Default track → ${trackIndex} (raw="${trackList[trackIndex]?.name ?? 'Unnamed'}")`);
        setSelectedTrack(trackIndex);
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ Phase 3: Render finished');
        setTimeout(() => {
            if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
        }, 150);
    }, []);

    // ==================== PLAY / PAUSE ====================
    const handlePlayPause = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    const handleStop = useCallback(() => {
        if (!api) return;
        api.stop();
        currentTimeRef.current = 0;
        setDisplayTime(0);
        setIsPlaying(false);
    }, [api]);

    // ==================== TRACK CHANGE ====================
    const DRUM_GUARD_KEYWORDS = ['drum', 'perc', 'kit', 'hh', 'snare', 'kick'];
    const handleTrackChange = useCallback((trackIndex: number) => {
        const trackName = (tracks[trackIndex]?.name ?? '').toLowerCase();
        if (DRUM_GUARD_KEYWORDS.some(kw => trackName.includes(kw))) {
            console.warn(`🥁 Phase 3: Drum track selection ignored (index ${trackIndex} — "${tracks[trackIndex]?.name}"). Restore in Phase 4.`);
            return;
        }
        setSelectedTrack(trackIndex);
    }, [tracks]);

    // ==================== LOOP ====================
    const clearLoopFully = useCallback(() => {
        setIsLooping(false);
        setHasLoopSelection(false);
        setPlaybackRange(null);
        if (api) {
            api.isLooping = false;
            api.playbackRange = null;
        }
    }, [api]);

    const handleLoopToggle = useCallback(() => {
        if (isLooping) {
            clearLoopFully();
        } else {
            setIsLooping(true);
        }
    }, [isLooping, clearLoopFully]);

    // ==================== YOUTUBE MEDIA HANDLER ====================
    // Bridges AlphaTab's playback engine to the YouTube player — restored from V98.67.
    const youTubeMediaHandlerInstance = useMemo(() => ({
        play: () => { youtubePlayerRef.current?.playVideo?.(); },
        pause: () => { youtubePlayerRef.current?.pauseVideo?.(); },
        seekTo: (milliseconds: number) => {
            const offset = (currentSong as any)?.videoStartOffset ?? 0;
            const seconds = milliseconds / 1000 + offset;
            youtubePlayerRef.current?.seekTo?.(seconds, true);
        },
        get currentTime() {
            if (!youtubePlayerRef.current?.getCurrentTime) return 0;
            const offset = (currentSong as any)?.videoStartOffset ?? 0;
            return Math.max(0, youtubePlayerRef.current.getCurrentTime() - offset) * 1000;
        },
        get duration() {
            return (youtubePlayerRef.current?.getDuration?.() ?? 0) * 1000;
        },
    }), [currentSong]);

    // ==================== YOUTUBE HANDLERS ====================
    const handleYouTubeClose = useCallback(() => {
        setIsYouTubePlayerVisible(false);
        setIsYouTubeReady(false);
    }, []);

    const handleYouTubePlayerReady = useCallback(() => {
        setIsYouTubeReady(true);
        // ✅ Mute synth only once YouTube is confirmed live — avoids total silence
        // if the handler attaches late or the iframe takes a moment to initialize.
        if (api) api.masterVolume = 0;
        console.log('[page] YouTube ready — synth muted');
    }, [api]);

    const handleYouTubeTimeUpdate = useCallback((time: number) => {
        currentTimeRef.current = time;
        setDisplayTime(time);
    }, []);

    const lastYtStateRef = useRef<number | null>(null);
    const handleYouTubeStateChange = useCallback((event: any) => {
        if (pauseTransitionRef.current) return;
        const state = event.data;
        // Dedupe — ignore repeated states and buffering churn (-1, 3)
        if (lastYtStateRef.current === state) return;
        lastYtStateRef.current = state;
        if (state === 1) {
            setIsPlaying(true);
            api?.play?.();
        } else if (state === 2) {
            setIsPlaying(false);
            if (api) { pauseTransitionRef.current = true; api.pause(); setTimeout(() => { pauseTransitionRef.current = false; }, 200); }
        } else if (state === 0) {
            setIsPlaying(false);
            api?.stop?.();
        }
        // Ignore -1 (unstarted) and 3 (buffering) — don't poke AlphaTab
    }, [api]);

    const handleVideoVariantChange = useCallback((newVideoId: string) => {
        setCurrentVideoId(newVideoId);
    }, []);

    // ==================== AUDIO SOURCE CHANGE ====================
    // [C5] Restored from V98.67 — mutes synth when switching to YouTube, restores on return.
    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        if (source === 'original') {
            // Don't mute yet — wait for handleYouTubePlayerReady to confirm iframe is live
            setIsYouTubePlayerVisible(true);
        } else {
            setIsYouTubePlayerVisible(false);
            setIsYouTubeReady(false);
            // Restore synth volume immediately on switch back
            if (api) api.masterVolume = masterVolumeRef.current;
        }
    }, [api]);

    // ==================== SPEED / VOLUME ====================
    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) api.playbackSpeed = speed;
    }, [api]);

    const handleMasterVolumeChange = useCallback((volume: number) => {
        setMasterVolume(volume);
        if (api) api.masterVolume = volume;
    }, [api]);

    // ==================== MUTE / SOLO ====================
    const handleTrackMuteToggle = useCallback((idx: number) => {
        if (!api?.score) return;
        const isMuted = trackMuteState.get(idx) || false;
        api.changeTrackMute([api.score.tracks[idx]], !isMuted);
        setTrackMuteState(prev => { const m = new Map(prev); m.set(idx, !isMuted); return m; });
    }, [api, trackMuteState]);

    const handleTrackSoloToggle = useCallback((idx: number) => {
        if (!api?.score?.tracks) return;
        const isSoloed = trackSoloState.get(idx) || false;
        const nextSoloed = !isSoloed;

        console.group(`🔴 ENTER handleTrackSoloToggle idx=${idx} "${api.score.tracks[idx]?.name}" isSoloed=${isSoloed} → nextSoloed=${nextSoloed}`);
        console.log('trackSoloState:', [...trackSoloState.entries()].map(([k, v]) => `[${k}]=${v}`));
        console.log('trackMuteState:', [...trackMuteState.entries()].map(([k, v]) => `[${k}]=${v}`));
        console.log('api.tracks (rendered):', api.tracks?.map((t: any) => `[${t.index}] ${t.name}`));
        console.log('api.score.tracks:', api.score.tracks.map((t: any, i: number) => `[${i}] ${t.name}`));

        api.score.tracks.forEach((track: any, i: number) => {
            if (nextSoloed) {
                const finalMute = i !== idx;
                console.log(`🟢 SOLO ON — applyMute([${i}] "${track.name}") → finalMute=${finalMute}`);
                api.changeTrackMute([track], finalMute);
            } else {
                const restoredMute = trackMuteState.get(i) || false;
                console.log(`  restoreTrackMute([${i}] "${track.name}") → ${restoredMute}`);
                api.changeTrackMute([track], restoredMute);
            }
        });
        console.groupEnd();

        setTrackSoloState(prev => {
            const m = new Map(prev);
            if (nextSoloed) { prev.forEach((_, k) => m.set(k, k === idx)); }
            else m.set(idx, false);
            return m;
        });
    }, [api, trackSoloState, trackMuteState]);

    // ==================== SONG LIBRARY ====================
    const handleSongSelect = useCallback((songId: string) => {
        if (songId === songState.currentSongId) {
            setIsSongSelectorOpen(false);
            return;
        }
        setIsPlaying(false);
        setPlayerReady(false);
        if (api) {
            api.isLooping = false;
            api.playbackRange = null;
        }
        setApi(null);
        setIsLooping(false);
        setHasLoopSelection(false);
        setPlaybackRange(null);
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
        if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
    }, [songState.currentSongId, api]);

    const handleMetadataSave = useCallback((
        savedTabId: string,
        patch: { title: string; artist: string; album?: string }
    ) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(s =>
                s.id === savedTabId ? { ...s, ...patch } : s
            ),
        }));
    }, []);

    const handleToggleFavorite = useCallback((songId: string) => {
        setSongState(prev => ({
            ...prev,
            songs: prev.songs.map(s => s.id === songId ? { ...s, isFavorite: !s.isFavorite } : s),
        }));
    }, []);

    const handleCreatePlaylist = useCallback((name: string) => {
        setSongState(prev => ({
            ...prev,
            playlists: [...prev.playlists, { id: `playlist-${Date.now()}`, name, songIds: [], createdAt: Date.now() }],
        }));
    }, []);

    const handlePlaylistAction = useCallback((type: 'add' | 'remove', songId: string, playlistId: string) => {
        setSongState(prev => ({
            ...prev,
            playlists: prev.playlists.map(pl => {
                if (pl.id !== playlistId) return pl;
                const exists = pl.songIds.includes(songId);
                if (type === 'add' && !exists) return { ...pl, songIds: [...pl.songIds, songId] };
                if (type === 'remove' && exists) return { ...pl, songIds: pl.songIds.filter(id => id !== songId) };
                return pl;
            }),
        }));
    }, []);

    const handleDeletePlaylist = useCallback((playlistId: string) => {
        setSongState(prev => ({ ...prev, playlists: prev.playlists.filter(p => p.id !== playlistId) }));
    }, []);

    // ==================== MISC ====================
    const handleThemeToggle = useCallback(() => setTheme(p => p === 'dark' ? 'light' : 'dark'), []);

    // [TH1] Sync theme to document root so globals.css [data-theme='dark'] selectors fire.
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    const handleCountInToggle = useCallback(() => setIsCountInEnabled(p => !p), []);
    const handleMetronomeToggle = useCallback(() => setIsMetronomeEnabled(p => !p), []);
    const handlePitchShiftToggle = useCallback((anchor?: { top: number; left: number }) => {
        setIsPitchPopoverOpen(p => { if (!p && anchor) setPitchPopoverAnchor(anchor); return !p; });
    }, []);

    const trackIndices = useMemo(() => [selectedTrack], [selectedTrack]);

    // 🔒 Single source of truth for header visibility.
    // [PS1] Hide during playback. Landscape always shows (controls must stay reachable).
    // [PS2] isHeaderVisible tracks scroll direction — set by scroll listener above.
    const isHeaderShown = isMobileLandscape || (isHeaderVisible && !isPlaying);

    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">

            {/* ── TopMenuTray wrapper owns slide animation; tray itself is dumb ── */}
            {/* [VA1] GPU-composited slide: will-change-transform + 200ms ease-out (was duration-300 ease). */}
            <div className={`fixed top-0 inset-x-0 w-full z-50 will-change-transform transform transition-transform duration-200 ease-out ${isHeaderShown ? 'translate-y-0' : '-translate-y-full'}`}>
                <TopMenuTray
                    isPlaying={isPlaying}  // ← [PS4] v1.6 prop — parent reads for shell class
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => setIsSongSelectorOpen(true)}
                    onNewTabOpen={() => setIsNewTabOpen(true)}
                />
            </div>

            <MyTabsPanel
                isOpen={isSongSelectorOpen}
                onClose={() => setIsSongSelectorOpen(false)}
                songs={songState.songs}
                playlists={songState.playlists}
                currentSong={songState.songs.find(s => s.id === songState.currentSongId) ?? null}
                onSongSelect={handleSongSelect}
                onToggleFavorite={handleToggleFavorite}
                onPlaylistAction={handlePlaylistAction}
                onCreatePlaylist={handleCreatePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                isDarkMode={theme === 'dark'}
                onEditMetadata={(songId) => setMetaEditorState({ tabId: songId, source: 'mytabs' })}
            />

            {/* [C2] onTabAdded fires refetchSongs → My Tabs updates immediately after upload */}
            {/* [C3] onTabUploaded closes panel + opens MetadataEditorPanel for the new tab */}
            <NewTabPanel
                isOpen={isNewTabOpen}
                onClose={() => setIsNewTabOpen(false)}
                theme={theme}
                onTabAdded={refetchSongs}
                onTabUploaded={(tabId) => {
                    setIsNewTabOpen(false);
                    setMetaEditorState({ tabId, source: 'newtab' });
                }}
            />

            {metaEditorState.tabId && (
                <MetadataEditorPanel
                    tabId={metaEditorState.tabId}
                    onSave={handleMetadataSave}
                    onClose={() => {
                        const src = metaEditorState.source;
                        setMetaEditorState({ tabId: null, source: null });
                        if (src === 'mytabs') setIsSongSelectorOpen(true);
                    }}
                />
            )}

            {/*
             * [P1] <main> landscape fix:
             *   - ternary now wrapped in ${} so it actually executes
             *   - 100vh → 100dvh (fixes iOS dynamic toolbar clipping)
             *   - overflow-y-hidden → overflow-y-auto (allows Page-mode vertical scroll)
             *   - header padding applies in BOTH portrait and landscape (removed !isMobileLandscape guard)
             *   - style prop removed (maxWidth/100vw was strip-mode pairing)
             */}
            <main
                ref={mainScrollContainerRef}
                className={`
        w-full
        ${isMobileLandscape
                        ? 'overflow-x-hidden overflow-y-hidden overscroll-none [touch-action:pan-x]'
                        : 'pb-32 overflow-y-auto overflow-x-hidden overscroll-y-contain'}
        ${isHeaderShown && !isMobileLandscape ? 'pt-[calc(79px+env(safe-area-inset-top))]' : 'pt-0'}
        transition-[padding] duration-300
                `}
            >
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {/*
                 * [P2] #maestro-player strip-mode removed:
                 *   - inline-block / width:max-content / h-full → all gone (these forced strip layout)
                 *   - paddingBottom → safe-area-aware calc so last bar clears the fixed footer
                 *   - className simplified to w-full (works portrait + landscape)
                 */}
                {/* [TH3-restored] Dark wrapper matches AlphaTab dark canvas — eliminates white gutter bleed. */}
                <div
                    id="maestro-player"
                    className={`relative w-full ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                    style={{
                        paddingBottom: isMobileLandscape
                            ? 'env(safe-area-inset-bottom, 0px)'  // landscape: no bottom push
                            : 'calc(74px + env(safe-area-inset-bottom) + 24px)',  // portrait: TransportBar clearance
                    }}
                >
                    {signedUrl && (
                        <AlphaTabRendererV102
                            playerMode={audioSource === 'synth' ? 'synthesizer' : 'external'}
                            externalMediaHandler={audioSource === 'original' ? youTubeMediaHandlerInstance : undefined}
                            key={signedUrl}
                            fileUrl={signedUrl}
                            trackIndices={trackIndices}
                            scrollContainer={mainScrollContainerRef.current}
                            isPlaying={isPlaying}
                            onPlayStateChange={setIsPlaying}
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRendered={handleRenderFinished}
                            onBoundsReady={() => { }}
                            onPlayerReady={() => setPlayerReady(true)}
                            loopEnabled={isLooping}
                            playbackRange={playbackRange}
                            onLoopToggle={(enabled) => {
                                if (!enabled) clearLoopFully();
                                else setIsLooping(true);
                            }}
                            onLoopChange={(start, end) => {
                                setPlaybackRange({ startTick: start, endTick: end });
                                setHasLoopSelection(true);
                            }}
                            onLoopClear={clearLoopFully}
                            theme={theme}
                            forceHorizontal={isMobileLandscape}
                        />
                    )}
                </div>

                {false && (
                    <div className="hidden lg:block px-4 mt-4">
                        <DebugPanel api={api} currentTime={displayTime} isPlaying={isPlaying} />
                    </div>
                )}
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
                        onLoopRangeChange={(start, end) => setHasLoopSelection(start !== null && end !== null)}
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
                        onMetronomeSubdivisionChange={(s: number) => setMetronomeSubdivision(s as SubdivisionMode)}
                        metronomeSoundType={metronomeSoundType}
                        onMetronomeSoundTypeChange={(s: string) => setMetronomeSoundType(s as MetronomeSoundType)}
                        metronomeAccentEnabled={metronomeAccentEnabled}
                        onMetronomeAccentToggle={() => setMetronomeAccentEnabled(p => !p)}
                        onArmMetronome={armMetronome}
                        currentBPM={currentBPM}
                        onSlideoutShouldClose={() => slideoutCloseRef.current?.()}
                        registerCloseAllPanels={(fn) => { closeControlPanelsRef.current = fn; }}
                    />
                )}
            </footer>

            <CountInOverlay
                count={countdownValue}
                isVisible={isCountingDown}
                mode={countInMode}
                onComplete={() => { }}
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
                        onMetronomeSubdivisionChange={(s: number) => setMetronomeSubdivision(s as SubdivisionMode)}
                        metronomeSoundType={metronomeSoundType}
                        onMetronomeSoundTypeChange={(s: string) => setMetronomeSoundType(s as MetronomeSoundType)}
                        metronomeAccentEnabled={metronomeAccentEnabled}
                        onMetronomeAccentToggle={() => setMetronomeAccentEnabled(p => !p)}
                        showEdgeTab={true}
                        onArmMetronome={armMetronome}
                        isMobileLandscape={isMobileLandscape}
                        onOtherPanelOpened={() => { closeControlPanelsRef.current?.(); }}
                    />
                </div>
            )}
            {/* [C5] YouTube player — always mounted to prevent flash, isVisible controls display */}
            <div style={{
                position: 'fixed', bottom: isMobileLandscape ? 0 : 80,
                right: isMobileLandscape ? 0 : 16, zIndex: 40,
                width: 240, height: 427, borderRadius: 8, overflow: 'hidden',
                display: audioSource === 'original' && isYouTubePlayerVisible && activeVideoId ? 'block' : 'none',
            }}>
                <YouTubePlayer
                    ref={youtubePlayerRef}
                    videoId={activeVideoId ?? ''}
                    isVisible={audioSource === 'original' && isYouTubePlayerVisible}
                    onClose={handleYouTubeClose}
                    currentTime={displayTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={handleYouTubeTimeUpdate}
                    onStateChange={handleYouTubeStateChange}
                    onPlayerReady={handleYouTubePlayerReady}
                    isMobileLandscape={isMobileLandscape}
                    videoVariants={(currentSong as any)?.youtubeVariants}
                    onVariantChange={handleVideoVariantChange}
                    videoStartOffset={(currentSong as any)?.videoStartOffset}
                />
            </div>
        </div>
    );
}