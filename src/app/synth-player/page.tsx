'use client';

/**
 * Synth Player Page — Phase 4 V102.7
 * Date: April 15th, 2026
 * Cloned from V102.6 — awaiting next patch set.
 *
 * V102.7 CHANGES:
 * ✅ [Pending] isVocalTrack() — vocal supreme override in track classifier
 *    Fixes: "Lead Vocals" → isGuitar: true (caused by 'lead' keyword in isAnyGuitarTrack)
 *    Fix A: isVocalTrack() added and applied to isPrimaryGuitarTrack + isAnyGuitarTrack guards
 *    Fix B: 'lead' removed from isAnyGuitarTrack keyword list (full phrase 'lead guitar'
 *            already handled by isPrimaryGuitarTrack)
 *    Side effect resolved: default track selection now correctly skips vocal tracks,
 *    and V106's resolveTrackLayoutProfile() routes vocals to songBookPageSparse correctly.
 *
 * V102.6 PRESERVED EXACTLY:
 * ✅ CURSOR_V2_ACTIVE = true (MaestroCursorV2)
 * ✅ All transport/loop/mixer behavior
 * ✅ Song switching, signed URL cache
 * ✅ AlphaTabRendererV102 from AlphaTabRenderer_V106
 */

import React, {
    useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { supabase } from '@/lib/alphaTab/supabase';
// page.tsx — change path only, name stays identical
import { AlphaTabRendererV102 } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import { TopMenuTray, MobileToolsSlideout } from '@/components/audio/maestro/layout';
import { MyTabsPanel } from '@/components/audio/maestro/tabs/MyTabsPanel';
import { NewTabPanel } from '@/components/audio/maestro/tabs/NewTabPanel';
import { MetadataEditorPanel } from '@/components/audio/maestro/tabs/MetadataEditorPanel';
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

    const audioSource = 'synth' as const;

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
    useEffect(() => {
        async function load() {
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
                currentSongId: sortedSongs[0]?.id ?? null,
            }));
        }
        load();
    }, []);

    const currentSong = useMemo(
        () => getSongById(songState.songs, songState.currentSongId || ''),
        [songState.songs, songState.currentSongId],
    );

    // ==================== SIGNED URL RESOLVER ====================
    useEffect(() => {
        if (!currentSong?.file_name || !currentSong?.file_extension) return;
        setSignedUrl(null);
        setSongInfo(null);
        setTracks([]);
        setSelectedTrack(0);
        setError(null);
        const path =
            currentSong.file_path ||
            `${currentSong.file_name}.${currentSong.file_extension}`;
        signedUrlRetryRef.current.delete(path);
        const cached = signedUrlCacheRef.current.get(path);
        if (cached && cached.expiresAt > Date.now()) {
            setSignedUrl(cached.url);
        } else {
            supabase.storage.from('tabs').createSignedUrl(path, 3600).then(({ data, error }) => {
                if (error || !data?.signedUrl) {
                    setError(`Failed to load tab for "${currentSong.title}"`);
                    return;
                }
                const expiresAt = Date.now() + 55 * 60 * 1000;
                signedUrlCacheRef.current.set(path, { url: data.signedUrl, expiresAt });
                setSignedUrl(data.signedUrl);
            });
        }
    }, [currentSong]);

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
        return () => { if (timer) clearTimeout(timer); window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check); };
    }, []);

    // ==================== AUTH DIAGNOSTICS ====================
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
        // Expanded regex catches: Lead Vocals, Backing Vocals, Vox, Choir, etc.
        const isVocalTrack = (t: Track) =>
            /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal|chorus\s*vocal)/i
                .test(normalize(t.name ?? ''));

        const isAnyGuitarTrack = (t: Track) => {
            const n = normalize(t.name ?? '');
            if (isDrumTrack(t) || isBassTrack(t) || isVocalTrack(t)) return false;
            // NOTE: bare 'lead' intentionally excluded — catches "Lead Vocals" as false positive.
            // "lead guitar" is handled as an explicit phrase in guitarDefaultScore.
            return ['guit', 'guitar', 'gtr', 'rhythm', 'acoustic', 'clean', 'dist', 'overdrive']
                .some(kw => n.includes(kw));
        };

        // ── [V102.7] Songsterr-style tone-first scoring ───────────────────────
        // Mirrors observed Songsterr defaults across all tested songs:
        //   GnR / Van Halen / Ozzy / Def Leppard → Distortion Guitar
        //   Poison / SRV / Cinderella           → Overdriven Guitar
        //   Warrant / She Talks to Angels        → Acoustic Guitar
        // "Lead Guitar" is a secondary signal — Songsterr rarely defaults to it
        // when a tone-style track exists.
        const guitarDefaultScore = (t: Track): number => {
            const n = normalize(t.name ?? '');
            if (isVocalTrack(t)) return -9999;
            if (isDrumTrack(t)) return -9999;
            if (isBassTrack(t)) return -200;  // last resort if no guitar exists
            let s = 0;
            // Tone-style guitar tracks (strongest signal — matches Songsterr defaults)
            if (n.includes('distortion')) s += 120;
            if (n.includes('overdriven') || n.includes('overdrive')) s += 110;
            if (n.includes('acoustic')) s += 105;
            if (n.includes('clean')) s += 95;
            // Generic guitar presence
            if (/(guit|guitar|gtr)/.test(n)) s += 60;
            // Role phrases — only as full phrases, never bare 'lead'
            if (n.includes('rhythm guitar') || n.includes('rhythm gtr')) s += 25;
            if (n.includes('lead guitar') || n.includes('lead gtr')) s += 15;
            // Penalize specialty / overdub / non-standard instrument tracks
            if (/(overdub|right ear|left ear|solo overdub|sitar|banjo|harmonica|tenor sax|clarinet|strings|synth|pad|orch|piano|organ|delay|fx|effect|bus|click|guide|reference)/.test(n)) s -= 40;
            return s;
        };

        const pickDefaultTrackIndex = (tl: Track[]): number => {
            // 1) Best guitar by tone-first score
            let bestIdx = -1, bestScore = -9999;
            for (let i = 0; i < tl.length; i++) {
                const sc = guitarDefaultScore(tl[i]);
                if (sc > bestScore) { bestScore = sc; bestIdx = i; }
            }
            if (bestIdx >= 0 && bestScore > 0) return bestIdx;
            // 2) Any guitar-ish track (still excludes vocals)
            const anyG = tl.findIndex(isAnyGuitarTrack);
            if (anyG >= 0) return anyG;
            // 3) First non-vocal, non-drum track
            const nonVocal = tl.findIndex(t => !isVocalTrack(t) && !isDrumTrack(t));
            return nonVocal >= 0 ? nonVocal : 0;
        };

        // Diagnostics — one line per track, all flags visible.
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
    const handleCountInToggle = useCallback(() => setIsCountInEnabled(p => !p), []);
    const handleMetronomeToggle = useCallback(() => setIsMetronomeEnabled(p => !p), []);
    const handlePitchShiftToggle = useCallback((anchor?: { top: number; left: number }) => {
        setIsPitchPopoverOpen(p => { if (!p && anchor) setPitchPopoverAnchor(anchor); return !p; });
    }, []);

    const trackIndices = useMemo(() => [selectedTrack], [selectedTrack]);

    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">

            <div className={`fixed top-0 inset-x-0 w-full z-50 transform transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <TopMenuTray
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

            <NewTabPanel isOpen={isNewTabOpen} onClose={() => setIsNewTabOpen(false)} theme={theme} />

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

            <main
                ref={mainScrollContainerRef}
                className={`
                    w-full overscroll-y-contain
                    ${isMobileLandscape
                        ? 'h-[calc(100vh-80px)] overflow-x-auto overflow-y-hidden relative'
                        : 'pb-32 overflow-y-auto overflow-x-hidden'}
                    ${!isMobileLandscape && isHeaderVisible ? 'pt-[79px]' : 'pt-0'}
                    transition-[padding] duration-300
                `}
                style={isMobileLandscape ? { maxWidth: '100vw', width: '100vw' } : undefined}
            >
                {error && (
                    <div className="px-4 mb-4">
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <p className="text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                <div
                    id="maestro-player"
                    className={`relative bg-white ${isMobileLandscape ? 'h-full' : 'w-full'}`}
                    style={isMobileLandscape ? {
                        paddingTop: '50px', paddingBottom: '450px',
                        display: 'inline-block', minWidth: '100%', width: 'max-content',
                    } : undefined}
                >
                    {signedUrl && (
                        <AlphaTabRendererV102
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
                        onAudioSourceChange={() => { }}
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
        </div>
    );
}