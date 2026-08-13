'use client';

/**
 * Synth Player Page — Phase 4 V102.22
 * Date: July 11, 2026
 * Cloned from V102.21-isolation — MAESTRO-UI-009A closed candidate: portrait shell uses
 * h-screen with valid minmax row to avoid iOS standalone PWA cold-start h-dvh viewport
 * lock; mobile landscape preserves h-dvh valid-grid UI-006C behavior.
 *
 * RECENT CLOSED LANES (see individual patch history for detail):
 * ✅ MAESTRO-DRUMS-001-C closed (hotfix on 001-B): the bare "tom" fallback
 *        keyword substring-matched any track name CONTAINING "tom" — "'78
 *        Frankenstrat Custom" (Van Halen guitar), "Tommy Shannon" (SRV bass),
 *        "Tom Keifer" (Cinderella guitar) — wrongly blocking legitimate tracks
 *        and skewing the default-track picker (e.g. Van Halen falling back to
 *        Bass). Keyword fallback narrowed to whole-word/whole-phrase drum terms
 *        only (drum, drums, percussion, percussions, "drum kit", snare, kick,
 *        cymbal, hi-hat/hihat) — no artist/person-name filtering of any kind.
 *        track.isPercussion (now AND-corroborated with staff.isPercussion when
 *        present) remains the primary, audit-confirmed-zero-false-positive check.
 * ✅ MAESTRO-DRUMS-001-B closed: drum/percussion track selection could reach
 *        AlphaTab's renderTracks() and crash its internal Horizontal-layout code
 *        (StaffSystem.addBars), blanking the score — worst for tracks named after
 *        the drummer (e.g. Cinderella's "Fred Courey") that carried no drum-related
 *        keyword. Track selection and the default-track picker now check AlphaTab's
 *        own track.isPercussion field first (keywords are a fallback only); a second,
 *        independent guard in AlphaTabRenderer.tsx also blocks renderTracks() itself
 *        from ever receiving a percussion track.
 * ✅ MAESTRO-AUTH-LOG-SANITIZE-001 closed: the session-bootstrap effect logged full
 *        Supabase session/user objects (access_token, refresh_token, JWT claims,
 *        email) to the browser console on every load. Replaced with boolean/metadata
 *        diagnostics only (hasSession, hasUser, userEmailPresent, role, hasError) —
 *        getSession()/getUser() calls and all auth/RLS/MyTabs/song-loading behavior
 *        are unchanged.
 * ✅ MAESTRO-VIDEO-004 closed: No-video empty-state panel is a gateway, not an inline
 *        editor — removed the disabled paste/sync controls; "Add Main / Full Mix Video"
 *        opens MetadataEditorPanel on Media & Sync with the Main / Full Mix row scrolled
 *        into view and highlighted. Other slot rows (Lesson, Playthrough, Live, Solo, etc.)
 *        remain manually selectable for Practice Generator/lesson-style tabs.
 *        tabs.youtube_video_id/video_start_offset stay untouched — tab_youtube remains
 *        the sole write path.
 *        [004C] handleMetadataSave now also calls refetchSongs() after every Metadata
 *        Editor save, so a newly-saved tab_youtube main row (youtubeVideoId/videoVariants/
 *        videoStartOffset, re-derived via fetchSongs()'s queries.ts bridge) reaches Original
 *        Mode immediately — no hard refresh needed. Safe under PLAYER-003: the signed URL
 *        resolver keys off file-identity primitives, not the currentSong reference, so this
 *        does not reload the score or reset the selected track.
 * ✅ MAESTRO-PLAYER-003 closed: Signed URL resolver is keyed by playable file identity
 *        primitives instead of currentSong object reference, preventing metadata-only
 *        saves from clearing/reloading the active score, tracks, and selected track.
 * ✅ MAESTRO-PLAYER-002 closed: A1 playerReady latch + D/B destroyed-generation guards
 *        retained in AlphaTabRenderer.tsx; diagnostic probe removed.
 * ✅ MAESTRO-UI-002 closed: TopMenuTray landscape CSS threshold aligned to JS
 *        isMobileLandscape's innerHeight < 600 via globals.css max-height: 599px (was 500px).
 * ✅ MAESTRO-UI-004 closed: page-level YouTube wrapper simplified to a visibility-only gate;
 *        YouTubePlayer.tsx is now the single positioning authority for the media panel.
 *
 * MAESTRO-UI-002 (LOCKED — desktop + Safari LAN manual scroll pass):
 * ✅ Wheel: wheel-down hides immediately; wheel-up marks reveal intent, applied on the next
 *        onScroll delta < 0 tick. Both cooldown-protected (160ms, headerToggleLockUntilRef).
 * ✅ Scrollbar drag: explicit, direction-based hide/reveal off isPointerOnScrollbarRef — real
 *        scrollbar drags are intercepted before onScroll's ambient delta thresholds.
 * ✅ Mobile touch: touchstart/touchmove/touchend/touchcancel run on window capture, filtered
 *        by isTouchOnMainScrollSurface (target- and point-based containment; excludes the
 *        TopMenu tray and interactive controls). touchmove toggles hide/reveal directly off
 *        finger direction past a 2px deadzone. recentTouchActivityUntilRef and
 *        touchMomentumRevealIntentUntilRef bridge native momentum/inertial scroll after
 *        finger-lift — with continuation renewal for long sustained flicks and a deferred
 *        recheck if a valid reveal is ever blocked only by the cooldown lock.
 * ✅ Paused canvas-up reveal: any delta < 0 while !isPlayingRef.current reveals — S1 only
 *        scrolls during active playback, so isPlaying === false already proves a given
 *        upward scroll can't be a programmatic correction.
 * ✅ Playback/S1 protection preserved: the [TG3-PlaybackGuard] recent-intent gate still
 *        requires real manual/touch intent to reveal while isPlayingRef.current is true, so
 *        AlphaTab/S1 programmatic scroll corrections cannot self-reveal the tray.
 * ✅ requestHeaderHide unchanged — a playback-requested hide still arbitrates against a live
 *        manual-reveal window (defers instead of stomping it) exactly as before.
 * ✅ AlphaTabRenderer.tsx / the V145.26 S1 playback resolver are untouched throughout — this
 *        lane only changes whether/when page.tsx applies a hide/reveal AlphaTab already
 *        requested, never the resolver's own scroll target math.
 *        Open/parked, not addressed by this lane: MAESTRO-MOBILE-CHORDS-001 (mobile
 *        chord-chart row handling) and a GP8 row-bound layout sliver remain open, tracked
 *        separately.
 *
 * V102.17 CHANGES:
 * ✅ TopMenuTray reveals immediately on manual upward scroll/pull.
 * ✅ Manual reveal works during playback; playback-start still hides the tray once.
 * ✅ <main> top padding is stable; removed padding-transition feedback loop.
 * ✅ Desktop/fine-pointer fixed chrome reserves native scrollbar gutter with pointer-fine:right-3.75
 *    applied to TopMenuTray wrapper, page.tsx footer wrapper, TransportBar fixed root,
 *    and MaestroControlPanel mobile fixed root.
 * ✅ <main> uses [scrollbar-gutter:stable] to prevent scrollbar width pulse / AlphaTab re-render jitter.
 * ✅ Native scrollbar drag stabilized with branch-aware 160ms cooldown and pointer-direction gating.
 *    - curr < 10: always reveals, bypasses cooldown.
 *    - delta > 4: hides only outside cooldown window.
 *    - delta < 0: reveals immediately for wheel/trackpad; for scrollbar drag requires confirmed
 *      upward pointer movement (pointerDeltaYRef < 0) or cooldown expiry as fallback.
 * ✅ Pointer cleanup now covers pointerup, pointercancel, and mouseup via shared resetScrollbarPointer.
 * ✅ No cursor/AlphaTabRenderer logic touched.
 *
 * V102.16 CHANGES:
 * ✅ [VA1] TopMenuTray wrapper: duration-300 → duration-200 ease-out + will-change-transform.
 *          200ms ease-out matches Songsterr's snappier slide feel.
 *          will-change-transform promotes the layer to GPU before animation fires.
 *
 * V102.15 REFERENCE (intent-guard baseline — scroll reveal logic extended in V102.17):
 * ✅ [TG4-clean] All unconditional diagnostic logs removed (module, render, effect).
 * ✅ Remaining debug output gated behind localStorage.getItem('maestro_header_debug') === '1'.
 * ✅ [TG1] wheel → window capture, filtered by el.contains(target). Sets userScrollIntentUntilRef 700ms on scroll-up.
 * ✅ [TG2] pointerdown → window capture, same filter. Scrollbar heuristic: clientX > rect.right - 20. Sets intent 1000ms.
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
import {
    loadPlayerPrefs,
    savePlayerPrefs,
    recordRecentSong,
    getMostRecentAvailableSongId,
    recordSelectedTrack,
    removeSelectedTrackPref,
    resolveSavedTrack,
    type TrackPreferenceCandidate,
} from '@/lib/player/playerPreferences';

const SCROLL_THRESHOLD = 50;

// ── V102.6: Cursor A/B toggle ─────────────────────────────────────────────────
const CURSOR_V2_ACTIVE = true;
// ─────────────────────────────────────────────────────────────────────────────

// [MAESTRO-DRUMS-001-B] Reliable drum/percussion detection. AlphaTab 1.8.1 can
// throw deep inside its own Horizontal-layout code (StaffSystem.addBars) when
// rendering certain percussion staves, blanking the score. track.isPercussion
// (AlphaTab's own field, backed by staff.isPercussion / MIDI channel 10) is
// the primary signal — name keywords are a fallback only, since some catalog
// tracks are named after the drummer and carry no drum-related keyword at all
// (e.g. Cinderella's percussion track displays as "Fred Courey").
//
// [MAESTRO-DRUMS-001-C hotfix] The original fallback keyword list included a
// bare "tom" substring match, which false-positived on any track name merely
// CONTAINING "tom" — "'78 Frankenstrat Custom" (Van Halen guitar tracks),
// "Tommy Shannon" (SRV bass), "Tom Keifer" (Cinderella guitar) — none of which
// are percussion, wrongly blocking them and skewing the default-track picker
// (e.g. Van Halen falling back to Bass once its Guitar track was wrongly
// zeroed out). Audit confirmed track.isPercussion + staff.isPercussion have
// ZERO false positives across the full 10-song catalog, so they're combined
// as the primary check. The keyword fallback is now whole-word/whole-phrase
// only, deliberately narrowed to unambiguous drum terms with no artist/person
// name filtering of any kind — "tom", "custom", "Tommy", "Tom", "kit", "perc",
// and "hh" are all deliberately excluded since they collide with ordinary
// words/names; only these exact terms remain: drum, drums, percussion,
// percussions, "drum kit" (as a phrase, not bare "kit"), snare, kick, cymbal,
// hi-hat, hihat.
const DRUM_GUARD_KEYWORDS_RE = /\b(drums?|percussions?|drum\s*kit|snare|kick|cymbal|hi-?hat)\b/i;
function isDrumOrPercussionTrack(t: Track | null | undefined): boolean {
    if (!t) return false;
    const anyT = t as any;
    if (anyT.isPercussion === true) {
        const staves = anyT.staves as { isPercussion?: boolean }[] | undefined;
        // Corroborate with staff-level metadata when present; track.isPercussion
        // alone has shown zero false positives in audit, so its absence isn't
        // treated as disqualifying — only an explicit staff-level mismatch would.
        return !staves || staves.length === 0 || staves.some(s => s.isPercussion === true);
    }
    return DRUM_GUARD_KEYWORDS_RE.test(t.name ?? '');
}

export default function SynthPlayerPage() {
    // ==================== API & CORE STATE ====================
    const [api, setApi] = useState<AlphaTabApi | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTrack, setSelectedTrack] = useState<number>(0);
    // [PLAYER-PREF-001] Forces AlphaTabRenderer's trackIndices-reactive correction
    // effect to re-run even when a restored track index is 0 — setSelectedTrack(0)
    // is a React no-op when selectedTrack is already 0 (post song-switch reset), so
    // trackIndices alone wouldn't change and the correction effect would never fire.
    const [trackRenderRequestId, setTrackRenderRequestId] = useState<number>(0);
    const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    // ==================== PLAYBACK STATE ====================
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const isPlayingRef = useRef<boolean>(false);
    const [playerReady, setPlayerReady] = useState<boolean>(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
    const playbackSpeedRef = useRef<number>(1.0);
    // [C5] audioSource is now state — was 'synth' as const
    const [audioSource, setAudioSource] = useState<'synth' | 'original'>('synth');

    // ==================== YOUTUBE STATE ====================
    const [isYouTubePlayerVisible, setIsYouTubePlayerVisible] = useState(false);
    const [isYouTubeReady, setIsYouTubeReady] = useState(false);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    // [MAESTRO-VIDEO-003C] Source selector reflects only what's actually playable — this
    // drives the no-video empty-state panel WITHOUT ever setting audioSource to
    // 'original' when there's no video, so Synth stays selected/active underneath it.
    const [showNoVideoPanel, setShowNoVideoPanel] = useState(false);
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
    // [CURSOR-ZINDEX-PANEL-001] True while Track Mixer specifically is open (reported by
    // MaestroControlPanel) — the one MaestroControlPanel-owned panel with a confirmed
    // visual conflict with the landscape cursor. Combined with isSongSelectorOpen (My
    // Tabs) below to drive AlphaTabRenderer's suppressLandscapeCursor prop. Speed/Drawer
    // are intentionally excluded — no confirmed overlap.
    const [isMobileTrackMixerOpen, setIsMobileTrackMixerOpen] = useState(false);
    // [MAESTRO-VIDEO-004/004A] 'novideo' source: opened via the no-video panel's
    // Add Main / Full Mix Video action — routes MetadataEditorPanel straight to
    // Media & Sync / Main / Full Mix.
    const [metaEditorState, setMetaEditorState] = useState<{ tabId: string | null; source: 'mytabs' | 'newtab' | 'novideo' | null }>
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
        // [PLAYER-PREF-001] prev.currentSongId ?? ... only ever fires on first hydration
        // (currentSongId is non-null on every later refetchSongs call), so this restoration
        // never re-fires on upload/metadata-save-triggered refetches.
        const savedSongId = getMostRecentAvailableSongId(loadPlayerPrefs(), new Set(sortedSongs.map(s => s.id)));
        setSongState(prev => ({
            ...prev,
            songs: sortedSongs,
            currentSongId: prev.currentSongId ?? savedSongId ?? sortedSongs[0]?.id ?? null,
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
    // [MAESTRO-PLAYER-003] Keyed by playable file identity (id + file path/name/extension),
    // not the currentSong object. MetadataEditorPanel saves (title/tempo/tuning/time_signature/
    // etc.) always allocate a new currentSong reference even when the underlying file is
    // unchanged — depending on the object itself would re-fire this resolver on every
    // metadata-only save, wiping tracks/selectedTrack/songInfo and forcing an unnecessary
    // score reparse (which can land the track heuristic on a different/rest-only track).
    // These primitives only change on an actual song switch or a tab-file replacement.
    const currentSongId = currentSong?.id ?? null;
    // [PLAYER-PREF-001] Lets handleScoreLoaded/handleTrackChange read the current song id
    // without adding currentSongId to their own dependency arrays.
    const currentSongIdRef = useRef<string | null>(null);
    useEffect(() => { currentSongIdRef.current = currentSongId; }, [currentSongId]);
    const currentSongFilePath = currentSong?.file_path ?? null;
    const currentSongFileName = currentSong?.file_name ?? null;
    const currentSongFileExtension = currentSong?.file_extension ?? null;
    const currentSongTitle = currentSong?.title ?? null;
    useEffect(() => {
        // [C4] Support file_path-only rows (new uploads) alongside legacy file_name+extension rows.
        const path =
            currentSongFilePath ||
            (currentSongFileName && currentSongFileExtension
                ? `${currentSongFileName}.${currentSongFileExtension}`
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
                    setError(`Failed to load tab for "${currentSongTitle ?? 'this tab'}"`);
                    return;
                }
                const expiresAt = Date.now() + 55 * 60 * 1000;
                signedUrlCacheRef.current.set(path, { url: data.signedUrl, expiresAt });
                setSignedUrl(data.signedUrl);
            });
        }
    }, [currentSongId, currentSongFilePath, currentSongFileName, currentSongFileExtension, currentSongTitle]);

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
    // MAESTRO-SCROLL-001: synchronous header intent. S1 reads this, never the
    // transform-animated DOM rect. Mirrors the isPlayingRef pattern (line 79/487).
    const headerIntentRef = useRef<boolean>(true);
    const setHeaderVisible = useCallback((v: boolean) => {
        headerIntentRef.current = v;   // synchronous — before React commit or CSS transition
        setIsHeaderVisible(v);
    }, []);

    // MAESTRO-SCROLL-001: passed to AlphaTabRenderer so the live S1 scroll path can
    // request the hide itself (Row-1 hide trigger) instead of reading tray DOM geometry.
    // [MAESTRO-UI-002] Arbitrates against a recent manual reveal: if the user just revealed
    // the tray (scroll-up, upward touch drag), the hide is deferred instead of immediately
    // stomping it, then re-validated once the reveal window expires. This does not change
    // when/why AlphaTabRenderer *requests* a hide (V145.26 S1 resolver untouched) — only
    // whether/when page.tsx applies it.
    const requestHeaderHide = useCallback(() => {
        if (!headerIntentRef.current) return;

        const now = Date.now();
        if (now >= manualHeaderRevealIntentUntilRef.current) {
            if (deferredHeaderHideTimerRef.current != null) {
                clearTimeout(deferredHeaderHideTimerRef.current);
                deferredHeaderHideTimerRef.current = null;
            }
            setHeaderVisible(false);
            return;
        }

        // Manual reveal intent still active — defer rather than override it immediately.
        if (deferredHeaderHideTimerRef.current != null) return; // already scheduled

        const delay = Math.max(0, manualHeaderRevealIntentUntilRef.current - now);
        deferredHeaderHideTimerRef.current = setTimeout(() => {
            deferredHeaderHideTimerRef.current = null;
            const curr = mainScrollContainerRef.current?.scrollTop ?? 0;
            const canApply = Boolean(
                headerIntentRef.current &&
                isPlayingRef.current &&
                mainScrollContainerRef.current &&
                curr > 80 &&
                Date.now() >= manualHeaderRevealIntentUntilRef.current
            );
            if (canApply) {
                setHeaderVisible(false);
            }
        }, delay);
    }, [setHeaderVisible]);
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
                const narrowResponsive = typeof window !== 'undefined' && window.innerWidth < 1024;
                const v = land && compact && (touch || narrowResponsive);
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
    const headerToggleLockUntilRef = useRef<number>(0);
    const lastPointerYRef = useRef<number>(0);
    const pointerDeltaYRef = useRef<number>(0);

    // [MAESTRO-UI-002] Manual reveal-intent arbitration — separate from the generic
    // userScrollIntentUntilRef (TG3) above, which only gates whether a scroll-up delta is
    // allowed to reveal at all. This ref means "the user recently made an upward/manual
    // reveal gesture; do not let playback's S1 row-advance hide request immediately
    // override it." The V145.26 S1 playback resolver/scroll math itself is untouched by
    // this — only whether/when page.tsx applies the hide that AlphaTabRenderer requests.
    const manualHeaderRevealIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002B] Mirrors manualHeaderRevealIntentUntilRef for the opposite direction:
    // protects a deliberate wheel/scrollbar-drag-down hide from being immediately undone by
    // the curr < 10 "always reveal near top" guard in the scroll handler below, while
    // scrollTop is still within the near-top band right at the start of the gesture. This is
    // a separate concern from playback S1 hide intent (requestHeaderHide above) — manual
    // hide/reveal intent is arbitrated here in page.tsx only; the V145.26 S1 playback
    // resolver in AlphaTabRenderer.tsx is untouched.
    const manualHeaderHideIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002] True while a touch is active on the scroll root; lets touchmove
    // extend intent without preventDefault or otherwise interfering with native scroll.
    const isTouchActiveRef = useRef<boolean>(false);
    const lastTouchYRef = useRef<number>(0);
    // [MAESTRO-UI-002F] Direction of the most recent past-deadzone touchmove in the current
    // gesture — reset at touchstart, set by touchmove, read at touchend/touchcancel to decide
    // whether to bridge into momentum scroll. Only ever written from real touch events.
    const lastTouchIntentDirectionRef = useRef<'hide' | 'reveal' | null>(null);
    // [MAESTRO-UI-002F] Bridges mobile inertial/momentum scroll after touch-up: native
    // momentum keeps firing onScroll delta < 0 events with no active touch and an expired
    // userScrollIntentUntilRef, so the existing hasRecentUserIntent gate alone rejects a
    // fast upward flick's momentum tail. Set only from onTouchMove/onTouchEnd (never from
    // playback/programmatic scroll) — see the onScroll delta < 0 branch below for where it's
    // read.
    const touchMomentumRevealIntentUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002G] Proves recent real touch ownership of the scroll, independent of
    // direction — unlike touchMomentumRevealIntentUntilRef (armed only by a reveal-direction
    // touchmove), this is set by touchstart/touchmove/touchend regardless of direction. Fast
    // mobile "thumb spin" scrolling can produce delta < 0 scroll events without ever crossing
    // the dy > 2 touchmove deadzone (Safari sometimes coalesces/reports scroll deltas that
    // don't line up 1:1 with raw touchmove Y deltas), so hasMomentumRevealIntent alone can
    // still miss it. Only ever written from real touchstart/touchmove/touchend — never from
    // playback/programmatic scroll. Date.now()-based, matching touchMomentumRevealIntentUntilRef.
    const recentTouchActivityUntilRef = useRef<number>(0);
    // [MAESTRO-UI-002I] Direction of the most recent delta in onScroll — 'up' only ever set
    // when the tick was touch-owned (see hasTouchOwnedUpwardMomentum below), 'down' set on
    // any downward delta regardless of source. Currently write-only scaffolding/diagnostic
    // state (not yet read by any gating logic) — kept simple per spec ("add if useful").
    const lastManualScrollDirectionRef = useRef<'up' | 'down' | null>(null);
    // [MAESTRO-UI-002] Single in-flight deferred-hide timer so a playback hide request
    // received during an active manual-reveal window never stacks more than one timer.
    const deferredHeaderHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // [MAESTRO-UI-002C] Single in-flight deferred top-reveal recheck timer — see the
    // curr < 10 branch below. Distinct from deferredHeaderHideTimerRef (that one defers a
    // playback hide; this one rechecks a reveal that curr < 10 could not apply immediately
    // because manualHeaderHideIntentUntilRef was still live).
    const deferredTopRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // [MAESTRO-UI-002G] Single in-flight deferred timer for the onScroll delta < 0 branch's
    // "reveal was valid but blocked only by headerToggleLockUntilRef cooldown" case. Kept
    // separate from deferredTopRevealTimerRef (that one is specifically the curr < 10
    // position-based recheck) for semantic clarity — different trigger, different re-checks.
    const deferredTouchRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // [MAESTRO-UI-002] Marks a manual reveal-type gesture (scroll-up, upward touch drag).
    // requestHeaderHide (above) checks this before applying a playback-requested hide.
    const markManualHeaderRevealIntent = useCallback((durationMs = 700) => {
        manualHeaderRevealIntentUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002B] Marks a manual hide-type gesture (deliberate wheel-down,
    // scrollbar-drag-down). The curr < 10 guard below checks this before auto-revealing.
    const markManualHeaderHideIntent = useCallback((durationMs = 700) => {
        manualHeaderHideIntentUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002G] Marks real, direction-agnostic touch ownership of the scroll. Called
    // from touchstart/touchmove/touchend only — proves "a real touch gesture recently owned
    // this scroll," which onScroll's delta < 0 branch can use as a reveal reason even when
    // neither the generic user-intent window nor the reveal-direction momentum bridge caught it.
    const markRecentTouchActivity = useCallback((durationMs = 2200) => {
        recentTouchActivityUntilRef.current = Date.now() + durationMs;
    }, []);

    // [MAESTRO-UI-002] Clear any pending deferred hide on unmount only — this timer's
    // lifetime is independent of the listener-registration effect below.
    useEffect(() => {
        return () => {
            if (deferredHeaderHideTimerRef.current != null) {
                clearTimeout(deferredHeaderHideTimerRef.current);
                deferredHeaderHideTimerRef.current = null;
            }
            // [MAESTRO-UI-002C] Same lifetime concern for the deferred top-reveal recheck timer.
            if (deferredTopRevealTimerRef.current != null) {
                clearTimeout(deferredTopRevealTimerRef.current);
                deferredTopRevealTimerRef.current = null;
            }
            // [MAESTRO-UI-002G] Same lifetime concern for the deferred touch-reveal recheck timer.
            if (deferredTouchRevealTimerRef.current != null) {
                clearTimeout(deferredTouchRevealTimerRef.current);
                deferredTouchRevealTimerRef.current = null;
            }
        };
    }, []);

    // [PS1b] Hide tray when playback starts, but only if already scrolled past top.
    useEffect(() => {
        if (isPlaying) {
            const curr = mainScrollContainerRef.current?.scrollTop ?? 0;
            if (curr > 80) setHeaderVisible(false);
        }
    }, [isPlaying, setHeaderVisible]);

    // [PS2 + TG1/TG2/TG3] Scroll / wheel / pointer intent listeners.
    useEffect(() => {
        const el = mainScrollContainerRef.current;
        if (!el) return;

        // [TG1] Wheel on window capture — AlphaTab canvas swallows bubble path.
        // Filter: only act when target is inside <main>.
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as Node)) return;
            if (e.deltaY < 0) {
                userScrollIntentUntilRef.current = performance.now() + 700;
                markManualHeaderRevealIntent(); // [MAESTRO-UI-002] wheel-up is a reveal gesture
            } else if (e.deltaY > 0) {
                // [MAESTRO-UI-002B] Deliberate wheel-down is a manual HIDE gesture — hide
                // immediately instead of waiting for an accumulated onScroll delta > 4. Near
                // the top/start of a gesture a single wheel tick is often smaller than that
                // threshold (fine-grained trackpad deltas especially), so the tray felt like
                // it "waited" for Row 2 to approach instead of responding to the gesture.
                // Tied strictly to the wheel event — never fires from S1/programmatic scroll.
                userScrollIntentUntilRef.current = performance.now() + 700;
                markManualHeaderHideIntent(); // protects against the curr < 10 guard below
                // [MAESTRO-UI-002G] Pure additive clear of the direction-agnostic touch-
                // ownership ref — a deliberate wheel-down gesture is definitionally not touch,
                // so any stale recent-touch-activity window from an earlier gesture shouldn't
                // linger. Does not read/write anything else in this branch; the existing
                // hide decision/timing above and below is unchanged.
                recentTouchActivityUntilRef.current = 0;
                const nowP = performance.now();
                if (headerIntentRef.current && nowP >= headerToggleLockUntilRef.current) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = nowP + 160;
                }
            }
        };
        window.addEventListener('wheel', onWheel, { passive: true, capture: true });

        // [TG2] Pointerdown on window capture — same reason.
        // Scrollbar heuristic: clientX near the right edge of <main>'s bounding rect.
        const onPointerDown = (e: PointerEvent) => {
            if (!el.contains(e.target as Node)) return;
            pointerStartRef.current = { x: e.clientX, y: e.clientY };
            lastPointerYRef.current = e.clientY;
            pointerDeltaYRef.current = 0;
            const rect = el.getBoundingClientRect();
            const isScrollbar = e.clientX > rect.right - 20;
            isPointerOnScrollbarRef.current = isScrollbar;
            userScrollIntentUntilRef.current = isScrollbar
                ? performance.now() + 1000
                : performance.now() + 500;
        };
        window.addEventListener('pointerdown', onPointerDown, { capture: true });

        // Track pointer Y during native scrollbar drag.
        // Do not filter by el.contains(e.target) — pointer capture changes target during drag.
        const onPointerMove = (e: PointerEvent) => {
            if (!isPointerOnScrollbarRef.current) return;
            pointerDeltaYRef.current = e.clientY - lastPointerYRef.current;
            lastPointerYRef.current = e.clientY;
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });

        // Shared reset for all pointer-release events so scrollbar state never lingers.
        const resetScrollbarPointer = () => {
            isPointerOnScrollbarRef.current = false;
            pointerDeltaYRef.current = 0;
            lastPointerYRef.current = 0;
            pointerStartRef.current = null;
        };
        const onPointerUp = resetScrollbarPointer;
        const onPointerCancel = resetScrollbarPointer;
        const onMouseUp = resetScrollbarPointer;
        window.addEventListener('pointerup', onPointerUp, { capture: true });
        window.addEventListener('pointercancel', onPointerCancel, { capture: true });
        window.addEventListener('mouseup', onMouseUp, { capture: true });

        // [MAESTRO-UI-002] Touch-specific intent — mobile Safari/touch inertia can outlast
        // the 500ms pointerdown window above (userScrollIntentUntilRef). These listeners only
        // extend intent/mark reveal; they never preventDefault and never touch scrollTop, so
        // native touch scrolling on <main> is left completely alone. Registered on window
        // capture (not the scroll container) so nothing else attaches a second, competing
        // touch path — this is the single source of truth for touch-driven header intent.
        const TOUCH_DIRECTION_DEADZONE = 2;
        const isInteractiveOrTrayTouchTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) return false;
            return !!target.closest('button, a, input, select, textarea, [role="button"], [data-top-menu-tray]');
        };

        // [MAESTRO-UI-002H] Validates that a touch belongs to the score/scroll surface, not
        // just window-capture "somewhere on the page." e.target on touch events is reliable
        // per spec (fixed to the touchstart target for the life of the series), but plain
        // target-based containment was observed missing legitimate score-surface gestures
        // (svg score rows / .at-surface / the score wrapper div) in mobile Safari — likely
        // AlphaTab re-parenting/re-creating SVG nodes around the moment a gesture starts, so
        // e.target can reference a node that's momentarily not (yet) a descendant of <main>.
        // document.elementFromPoint gives an independent, geometry-based cross-check that
        // isn't affected by that: if either resolves inside <main> and neither resolves to an
        // interactive control or the TopMenu tray, the touch is treated as scroll-surface.
        const isTouchOnMainScrollSurface = (e: TouchEvent): boolean => {
            const container = mainScrollContainerRef.current;
            if (!container) return false;
            const touch = e.touches[0] ?? e.changedTouches[0];
            const target = e.target;
            const targetInMain = target instanceof Node && container.contains(target);
            const pointEl = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
            const pointInMain = pointEl instanceof Node && container.contains(pointEl);
            if (!targetInMain && !pointInMain) return false;
            if (isInteractiveOrTrayTouchTarget(target) || isInteractiveOrTrayTouchTarget(pointEl)) return false;
            return true;
        };

        const onTouchStart = (e: TouchEvent) => {
            if (!isTouchOnMainScrollSurface(e)) return; // [MAESTRO-UI-002H] do not arm header behavior
            isTouchActiveRef.current = true;
            lastTouchYRef.current = e.touches[0]?.clientY ?? 0;
            // [MAESTRO-UI-002F] Fresh gesture — no direction established yet. Prevents a
            // later plain tap (no qualifying touchmove) from inheriting a stale 'reveal'/
            // 'hide' direction left over from an earlier, unrelated gesture.
            lastTouchIntentDirectionRef.current = null;
            // [MAESTRO-UI-002G] Direction-agnostic — only proves recent real touch ownership.
            // Does not toggle header visibility.
            markRecentTouchActivity();
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });

        const onTouchMove = (e: TouchEvent) => {
            // [MAESTRO-UI-002H] If this touch was never armed by a valid touchstart, only
            // proceed when this move itself lands on the scroll surface (self-heals a
            // touchmove arriving without a matching touchstart, e.g. multi-touch edge cases).
            if (!isTouchActiveRef.current && !isTouchOnMainScrollSurface(e)) return;
            const y = e.touches[0]?.clientY ?? lastTouchYRef.current;
            const dy = y - lastTouchYRef.current;
            lastTouchYRef.current = y;
            // [MAESTRO-UI-002] Extend generic user-scroll intent on every touchmove,
            // regardless of the direction deadzone below.
            userScrollIntentUntilRef.current = performance.now() + 700;
            // [MAESTRO-UI-002G] Direction-agnostic — every touchmove (even within the
            // deadzone) proves continued real touch ownership.
            markRecentTouchActivity();

            // [MAESTRO-UI-002D/H] A drag starting on a button/link/input/the TopMenu tray must
            // not itself flip header visibility. Structurally redundant now that
            // isTouchOnMainScrollSurface (above) already excludes these before isTouchActiveRef
            // is ever set — kept as a defensive re-check.
            if (isInteractiveOrTrayTouchTarget(e.target)) return;

            // [MAESTRO-UI-002D] Explicit directional touch intent — mirrors the explicit
            // scrollbar-drag branch in onScroll below: bypasses the accumulated-delta
            // inference entirely and toggles immediately (cooldown-checked) instead of
            // waiting for a native `scroll` event, closing the gap where mobile Safari/touch
            // inertia can outlast the older intent-only-marking approach.
            const nowP = performance.now();
            if (dy < -TOUCH_DIRECTION_DEADZONE) {
                // Finger moved up-screen → content scrolls down → user wants header hidden.
                lastTouchIntentDirectionRef.current = 'hide'; // [MAESTRO-UI-002F]
                manualHeaderRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002F] A fresh hide gesture invalidates any still-live momentum
                // reveal bridge from an earlier reveal gesture in this same touch series.
                touchMomentumRevealIntentUntilRef.current = 0;
                markManualHeaderHideIntent();
                const canHide = headerIntentRef.current && nowP >= headerToggleLockUntilRef.current;
                if (canHide) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = nowP + 160;
                }
            } else if (dy > TOUCH_DIRECTION_DEADZONE) {
                // Finger moved down-screen → content scrolls up — the same reveal direction
                // as onWheel's deltaY < 0.
                lastTouchIntentDirectionRef.current = 'reveal'; // [MAESTRO-UI-002F]
                // [MAESTRO-UI-002F] Pre-arms the momentum-reveal bridge as soon as an active
                // reveal-direction drag is seen — onTouchEnd (below) re-extends it once the
                // gesture actually ends, so momentum scroll immediately after touch-up can
                // still pass the onScroll delta < 0 gate.
                touchMomentumRevealIntentUntilRef.current = Date.now() + 1800;
                manualHeaderHideIntentUntilRef.current = 0;
                markManualHeaderRevealIntent();
                const canReveal = !headerIntentRef.current && nowP >= headerToggleLockUntilRef.current;
                if (canReveal) {
                    setHeaderVisible(true);
                    headerToggleLockUntilRef.current = nowP + 160;
                    clearDeferredTopReveal();
                }
            }
        };
        window.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });

        const onTouchEnd = () => {
            // [MAESTRO-UI-002H] Capture before clearing — only a touch that was actually
            // armed (passed isTouchOnMainScrollSurface at touchstart, or self-healed in
            // onTouchMove) gets to mark activity / extend the momentum bridge. Otherwise a
            // touchend for an untracked touch (e.g. one that started on a button) could
            // re-arm the bridge off a stale lastTouchIntentDirectionRef left by an earlier,
            // unrelated valid gesture.
            const wasActive = isTouchActiveRef.current;
            isTouchActiveRef.current = false;
            if (wasActive) {
                // [MAESTRO-UI-002G] Direction-agnostic — re-extends recent-touch-ownership so
                // momentum scroll immediately after touch-up (any direction) is still
                // attributable to a real user gesture, not just the reveal-direction bridge below.
                markRecentTouchActivity();
                // [MAESTRO-UI-002F] Bridge mobile inertial/momentum scroll: only when the last
                // active touchmove direction in this gesture was reveal/upward, extend both the
                // dedicated momentum-reveal window and the generic user-intent window so the
                // native momentum `scroll` events that keep arriving after touch-up (with
                // isTouchActiveRef already false) can still pass onScroll's delta < 0 reveal
                // gate. A 'hide' last-direction sets no reveal momentum. Never changes visibility
                // directly here — only extends the windows the onScroll gate itself reads.
                if (lastTouchIntentDirectionRef.current === 'reveal') {
                    touchMomentumRevealIntentUntilRef.current = Date.now() + 1800;
                    // [MAESTRO-UI-002F] userScrollIntentUntilRef is performance.now()-based
                    // everywhere else it's written (onWheel/onTouchMove/onPointerDown) and read
                    // (onScroll's hasRecentUserIntent) — performance.now() used here to match,
                    // not Date.now(), to avoid desyncing that shared ref's units.
                    userScrollIntentUntilRef.current = performance.now() + 1800;
                }
            }
        };
        window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });

        // [MAESTRO-UI-002C] Deferred top-reveal recheck helpers — see the curr < 10 branch
        // in onScroll below. If reveal there is suppressed only by a live
        // manualHeaderHideIntentUntilRef window (not by playback), and no further scroll
        // event fires before that window naturally expires (e.g. scrollTop is already
        // pinned at 0 after a scrollbar drag back to the top), the header would otherwise
        // stay stranded hidden forever. This schedules exactly one recheck for that expiry.
        const clearDeferredTopReveal = () => {
            if (deferredTopRevealTimerRef.current != null) {
                clearTimeout(deferredTopRevealTimerRef.current);
                deferredTopRevealTimerRef.current = null;
            }
        };
        const scheduleDeferredTopReveal = (hideIntentUntil: number) => {
            if (deferredTopRevealTimerRef.current != null) return; // avoid stacking timers
            const delay = Math.max(0, hideIntentUntil - Date.now()) + 20;
            deferredTopRevealTimerRef.current = setTimeout(() => {
                deferredTopRevealTimerRef.current = null;
                const stillNearTop = (mainScrollContainerRef.current?.scrollTop ?? 0) < 10;
                if (stillNearTop && !headerIntentRef.current) {
                    setHeaderVisible(true);
                }
            }, delay);
        };

        // [MAESTRO-UI-002G/I] Deferred touch-reveal recheck — see the onScroll delta < 0
        // branch below. Covers the case where hasReasonToReveal (touch activity/momentum) was
        // true but the reveal was blocked only by the headerToggleLockUntilRef cooldown, so
        // the reveal isn't simply lost — it's rechecked once the cooldown expires. iOS fast
        // flicks are event-sparse: there may be no later scroll event to retry once the lock
        // naturally expires, so this schedules exactly one recheck instead of waiting for one.
        const scheduleDeferredTouchReveal = (lockRemainingMs: number) => {
            if (deferredTouchRevealTimerRef.current != null) return; // avoid stacking timers
            const scrollTopAtSchedule = mainScrollContainerRef.current?.scrollTop ?? 0;
            const delay = Math.max(0, lockRemainingMs) + 20;
            deferredTouchRevealTimerRef.current = setTimeout(() => {
                deferredTouchRevealTimerRef.current = null;
                if (headerIntentRef.current) return;
                const container = mainScrollContainerRef.current;
                if (!container) return;
                const scrollTopNow = container.scrollTop;
                const scrollMovedUpEnough = scrollTopNow < scrollTopAtSchedule || scrollTopNow < 10;
                if (!scrollMovedUpEnough) return;
                const stillWithinTouchWindow =
                    Date.now() < recentTouchActivityUntilRef.current ||
                    Date.now() < touchMomentumRevealIntentUntilRef.current ||
                    scrollTopNow < 10;
                if (!stillWithinTouchWindow) return;
                setHeaderVisible(true);
                headerToggleLockUntilRef.current = performance.now() + 160;
                manualHeaderHideIntentUntilRef.current = 0;
                touchMomentumRevealIntentUntilRef.current = 0;
            }, delay);
        };

        // [PS2] Scroll direction → show/hide tray.
        //   curr < 10    → always show (position-based, bypasses cooldown)
        //   delta > 4    → hide, cooldown-protected
        //   delta < 0    → show: immediately for wheel/trackpad; for scrollbar drag requires
        //                   upward pointer direction or cooldown expiry as fallback
        const onScroll = () => {
            const now = performance.now();
            const curr = el.scrollTop;
            const prev = lastScrollTopRef.current;
            const delta = curr - prev;
            const inCooldown = now < headerToggleLockUntilRef.current;

            lastScrollTopRef.current = curr;

            // [MAESTRO-UI-002C] Direction reversal clears the opposing manual intent — a
            // stale hide-intent from an earlier wheel/scrollbar-drag-down (or vice versa)
            // must not keep suppressing the opposite gesture once the user has clearly
            // reversed direction. `delta` above is always a fresh per-event scrollTop
            // difference; there is no separate shared accumulator elsewhere to reset.
            if (delta < 0) manualHeaderHideIntentUntilRef.current = 0;
            if (delta > 0) {
                manualHeaderRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002F] Any real downward scroll — whether it originated from
                // wheel-down, scrollbar-drag-down, or touch-hide — invalidates a stale
                // momentum-reveal bridge from an earlier upward gesture. This single choke
                // point (every scroll event passes through here first) covers all three
                // sources without needing to touch the wheel-down or scrollbar-drag branches
                // below, which stay byte-identical.
                touchMomentumRevealIntentUntilRef.current = 0;
                // [MAESTRO-UI-002I] Does not renew any upward reveal window — only records
                // direction.
                lastManualScrollDirectionRef.current = 'down';
            }

            // [MAESTRO-UI-002C] Explicit scrollbar-drag direction — bypasses the accumulated
            // delta > 4 / ambient delta < 0 thresholds below entirely. isPointerOnScrollbarRef
            // is only ever set true by a real pointerdown on the scrollbar rail (onPointerDown
            // above, filtered by el.contains(e.target)) and cleared on release — never true
            // for content clicks, the Play button, or S1's programmatic scroll — so this is
            // genuine explicit user intent, not an inference from ambient scroll deltas.
            if (isPointerOnScrollbarRef.current && delta !== 0) {
                if (!inCooldown) {
                    headerToggleLockUntilRef.current = now + 160;
                    if (delta > 0) {
                        setHeaderVisible(false);
                        markManualHeaderHideIntent();
                        // [MAESTRO-UI-002G] Pure additive clear — see the matching comment in
                        // onWheel's deltaY > 0 branch. Does not change this branch's existing
                        // hide decision/timing.
                        recentTouchActivityUntilRef.current = 0;
                    } else {
                        setHeaderVisible(true);
                        markManualHeaderRevealIntent();
                        clearDeferredTopReveal();
                    }
                }
                return;
            }

            if (curr < 10) {
                // Position-based: always reveal at top, no cooldown gate.
                // MAESTRO-SCROLL-001: gated on !isPlayingRef so Row-1 hide-on-sysIdx>=1
                // isn't fought by a near-top scroll event during active playback.
                // [MAESTRO-UI-002B] Also gated on manualHeaderHideIntentUntilRef so a
                // just-requested deliberate wheel/scrollbar-drag-down hide isn't immediately
                // reverted while scrollTop is still within the near-top band.
                // [MAESTRO-UI-002H] Already-visible short-circuit, checked first: iOS
                // rubber-band bounce at the top fires many curr < 10 scroll events in rapid
                // succession while the header is already shown. Without this, every single
                // one refreshed headerToggleLockUntilRef, which could keep the 160ms cooldown
                // lock perpetually extended for as long as the bounce lasted.
                if (headerIntentRef.current) return;
                const hideIntentUntil = manualHeaderHideIntentUntilRef.current;
                if (!isPlayingRef.current) {
                    if (Date.now() >= hideIntentUntil) {
                        setHeaderVisible(true);
                        clearDeferredTopReveal();
                        headerToggleLockUntilRef.current = now + 160;
                    } else {
                        // [MAESTRO-UI-002C] Suppressed only by a live hide-intent window —
                        // schedule a recheck for when it expires (see helper above).
                        scheduleDeferredTopReveal(hideIntentUntil);
                        headerToggleLockUntilRef.current = now + 160;
                    }
                } else {
                    headerToggleLockUntilRef.current = now + 160;
                }
                return;
            }

            if (delta > 4) {
                // Downward: cooldown-protected to block rapid mid-animation flip-flops.
                if (!inCooldown) {
                    setHeaderVisible(false);
                    headerToggleLockUntilRef.current = now + 160;
                }
                return;
            }

            if (delta < 0) {
                // [TG3-PlaybackGuard] Require recent human scroll intent so AlphaTab/S1/native
                // programmatic scroll corrections cannot reveal TopMenuTray during playback.
                // wheel/trackpad set this ref in onWheel; scrollbar/touch set it in onPointerDown.
                const hasRecentUserIntent = userScrollIntentUntilRef.current > now;
                // [MAESTRO-UI-002F] Mobile inertial/momentum scroll keeps firing delta < 0
                // scroll events after touch-up, with isTouchActiveRef already false and
                // userScrollIntentUntilRef possibly already expired — hasRecentUserIntent
                // alone then rejects a fast upward flick's momentum tail. Only set by real
                // touchmove/touchend (never playback/programmatic scroll) — see
                // touchMomentumRevealIntentUntilRef above.
                const hasMomentumRevealIntent = Date.now() < touchMomentumRevealIntentUntilRef.current;
                // [MAESTRO-UI-002G] Fast mobile "thumb spin" upward scrolling can produce
                // delta < 0 scroll events without ever crossing the dy > 2 touchmove deadzone
                // (Safari doesn't always report scroll deltas 1:1 with raw touchmove Y), so
                // hasMomentumRevealIntent alone can still miss it. recentTouchActivityUntilRef
                // is direction-agnostic — it only proves a real touch gesture recently owned
                // this scroll, set from touchstart/touchmove/touchend only, never playback.
                const hasRecentTouchActivity = Date.now() < recentTouchActivityUntilRef.current;
                // [MAESTRO-UI-002J] While paused, the [TG3-PlaybackGuard] recent-intent gate
                // exists specifically to stop AlphaTab/S1 programmatic scroll corrections from
                // revealing the tray during playback — it was never meant to also gate manual
                // paused navigation. isPlayingRef.current false means this delta < 0 cannot be
                // a programmatic S1 correction (S1 only scrolls during active playback), so the
                // canvas visibly moving upward is reason enough on its own, independent of
                // whether any touch/wheel intent window happens to still be live.
                const isPausedCanvasUpReveal = !isPlayingRef.current;
                const hasReasonToReveal =
                    hasRecentUserIntent || hasMomentumRevealIntent || hasRecentTouchActivity || isPausedCanvasUpReveal;

                // [MAESTRO-UI-002I] Momentum continuation renewal — a long, sustained upward
                // flick can outlast the original momentum/touch-activity window if scroll
                // events keep arriving slower than that window's duration. Renewing on every
                // touch-owned delta < 0 tick keeps it alive for as long as momentum keeps
                // producing scroll events. Guarded inherently: hasTouchOwnedUpwardMomentum can
                // only be true if recentTouchActivityUntilRef/touchMomentumRevealIntentUntilRef
                // was already live, and both are only ever set by real
                // touchstart/touchmove/touchend — never by playback/programmatic S1 scroll —
                // so this can never manufacture a touch-owned window out of nothing.
                const hasTouchOwnedUpwardMomentum = hasRecentTouchActivity || hasMomentumRevealIntent;
                if (hasTouchOwnedUpwardMomentum) {
                    recentTouchActivityUntilRef.current = Date.now() + 700;
                    touchMomentumRevealIntentUntilRef.current = Date.now() + 700;
                    lastManualScrollDirectionRef.current = 'up';
                }

                if (headerIntentRef.current && hasTouchOwnedUpwardMomentum) {
                    // [MAESTRO-UI-002I] Already visible and this tick is touch-owned — the
                    // renewal above already extended the windows; nothing more to apply.
                    // Avoids the same redundant re-lock/re-reveal churn UI-002H fixed for
                    // curr < 10, scoped narrowly to the touch-owned case so wheel/pointer-
                    // driven reveal behavior below is completely untouched.
                    return;
                }

                const isScrollbarDrag = isPointerOnScrollbarRef.current;
                const isScrollbarDragUp = pointerDeltaYRef.current < 0;
                // Allow reveal when:
                //   - human/momentum/touch intent confirmed AND not a scrollbar drag (wheel/trackpad/touch)
                //   - human/momentum/touch intent confirmed AND scrollbar drag with confirmed upward pointer
                //   - human/momentum/touch intent confirmed AND scrollbar drag direction unknown: allow after cooldown
                const allowReveal =
                    hasReasonToReveal &&
                    (
                        !isScrollbarDrag ||
                        isScrollbarDragUp ||
                        !inCooldown
                    );
                if (allowReveal) {
                    setHeaderVisible(true);
                    headerToggleLockUntilRef.current = now + 160;
                    markManualHeaderRevealIntent(); // [MAESTRO-UI-002] confirmed manual reveal
                    manualHeaderHideIntentUntilRef.current = 0; // [MAESTRO-UI-002F] see requirement 4
                    clearDeferredTopReveal(); // [MAESTRO-UI-002C] a real reveal just happened
                    // [MAESTRO-UI-002F/G] Clear after a successful reveal (preferred over
                    // letting them expire naturally) so neither bridge can cause a second,
                    // unrelated reveal-toggle later in the same momentum tail.
                    touchMomentumRevealIntentUntilRef.current = 0;
                    recentTouchActivityUntilRef.current = 0;
                } else {
                    // [MAESTRO-UI-002I] allowReveal is false here. Under the (unchanged)
                    // formula above that only happens via the scrollbar-drag-direction-
                    // unknown-in-cooldown case (real scrollbar drags never reach this branch —
                    // intercepted earlier) or when hasReasonToReveal itself is false. Compute
                    // lockRemaining/headerHidden explicitly (rather than only inCooldown) so
                    // a header that's already visible doesn't get a pointless deferred timer
                    // scheduled.
                    const lockRemaining = headerToggleLockUntilRef.current - now;
                    const headerHidden = !headerIntentRef.current;
                    if (headerHidden && hasReasonToReveal && lockRemaining > 0) {
                        // [MAESTRO-UI-002I] Blocked only by the cooldown lock — iOS fast
                        // flicks are event-sparse, so there may be no later scroll event once
                        // the lock naturally expires. Defer instead of losing the reveal.
                        scheduleDeferredTouchReveal(lockRemaining);
                    }
                }
            }
        };
        el.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('wheel', onWheel, { capture: true });
            window.removeEventListener('pointerdown', onPointerDown, { capture: true });
            window.removeEventListener('pointermove', onPointerMove, { capture: true });
            window.removeEventListener('pointerup', onPointerUp, { capture: true });
            window.removeEventListener('pointercancel', onPointerCancel, { capture: true });
            window.removeEventListener('mouseup', onMouseUp, { capture: true });
            window.removeEventListener('touchstart', onTouchStart, { capture: true });
            window.removeEventListener('touchmove', onTouchMove, { capture: true });
            window.removeEventListener('touchend', onTouchEnd, { capture: true });
            window.removeEventListener('touchcancel', onTouchEnd, { capture: true });
            el.removeEventListener('scroll', onScroll);
        };
    }, [setHeaderVisible, markManualHeaderRevealIntent, markManualHeaderHideIntent, markRecentTouchActivity]);

    useEffect(() => {
        // [MAESTRO-AUTH-LOG-SANITIZE-001] Redacted — this previously logged the full
        // session/user objects (access_token, refresh_token, JWT claims, email) to the
        // browser console. Boolean/metadata-only diagnostic now; getSession()/getUser()
        // calls themselves are unchanged, so auth/session behavior is untouched.
        supabase.auth.getSession().then(({ data, error }) => {
            console.log('APP AUTH STATE (session)', {
                hasSession: Boolean(data?.session),
                hasError: Boolean(error),
            });
        });
        supabase.auth.getUser().then(({ data, error }) => {
            console.log('APP AUTH STATE (user)', {
                hasUser: Boolean(data?.user),
                userEmailPresent: Boolean(data?.user?.email),
                role: data?.user?.role ?? null,
                hasError: Boolean(error),
            });
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
        alphaTabApi.playbackSpeed = playbackSpeedRef.current;
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

        // [MAESTRO-DRUMS-001-B] Delegates to the shared isPercussion-primary
        // detector (see module scope above) instead of a local keyword-only
        // check, so the default-track picker never scores a drum/percussion
        // track above 0 even when its name carries no drum keyword.
        const isDrumTrack = isDrumOrPercussionTrack;

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

        // [PLAYER-PREF-001] Restore a saved track only if it's still valid against this
        // load's live track list; an invalid saved entry is explicitly removed (not left
        // as unrepaired garbage) and the deterministic heuristic above is used instead —
        // the heuristic result itself is never written back as a manual preference.
        const candidates: TrackPreferenceCandidate[] = trackList.map((t, i) => ({
            index: i,
            name: t.name ?? '',
            selectable: !isDrumTrack(t),
        }));
        const songIdForRestore = currentSongIdRef.current;
        let trackIndex: number;
        if (songIdForRestore) {
            const prefs = loadPlayerPrefs();
            const result = resolveSavedTrack(prefs, songIdForRestore, candidates);
            if (result.status === 'valid') {
                trackIndex = result.trackIndex;
            } else {
                trackIndex = pickDefaultTrackIndex(trackList);
                if (result.status === 'invalid') {
                    savePlayerPrefs(removeSelectedTrackPref(prefs, songIdForRestore));
                }
            }
        } else {
            trackIndex = pickDefaultTrackIndex(trackList);
        }
        console.log(`🎸 V102.7: Default track → ${trackIndex} (raw="${trackList[trackIndex]?.name ?? 'Unnamed'}")`);
        setSelectedTrack(trackIndex);
        // [PLAYER-PREF-001] Unconditional — must fire even when trackIndex equals the
        // current selectedTrack (the index-0 restore case) so AlphaTabRenderer's
        // correction effect still re-applies the final track choice.
        setTrackRenderRequestId(prev => prev + 1);
    }, []);

    const handleRenderFinished = useCallback(() => {
        console.log('✅ Phase 3: Render finished');
        setTimeout(() => {
            if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
        }, 150);
    }, []);

    // ==================== PLAY / PAUSE ====================
    const handlePlayPause = useCallback(() => {
        // [MAESTRO-VIDEO-003C] After the source-selector fix, handleAudioSourceChange never
        // sets audioSource to 'original' when there's no video, so this condition should be
        // unreachable via normal UI flow. Kept as dead-man insurance for the transient
        // window right after a video-song's Original mode switches to a no-video song
        // (before the 003B fallback effect flips audioSource back to synth) and any other
        // stale/unexpected state — never remove.
        if (audioSource === 'original' && !activeVideoId) return;
        setIsPlaying(p => !p);
    }, [audioSource, activeVideoId]);

    const handleStop = useCallback(() => {
        if (!api) return;
        api.stop();
        currentTimeRef.current = 0;
        setDisplayTime(0);
        setIsPlaying(false);
    }, [api]);

    // ==================== TRACK CHANGE ====================
    const handleTrackChange = useCallback((trackIndex: number) => {
        const track = tracks[trackIndex];
        if (isDrumOrPercussionTrack(track)) {
            console.warn(`🥁 Drum tracks are temporarily unavailable — selection blocked (index ${trackIndex} — "${track?.name}").`);
            return;
        }
        setSelectedTrack(trackIndex);
        // [PLAYER-PREF-001] Only an explicit manual selection is persisted as a preference —
        // the default-track heuristic never reaches this function.
        const songId = currentSongIdRef.current;
        if (songId) {
            savePlayerPrefs(recordSelectedTrack(loadPlayerPrefs(), songId, trackIndex, track?.name ?? ''));
        }
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
        // [MAESTRO-VIDEO-003C] Source selector reflects only what's actually playable —
        // intercept BEFORE setAudioSource so 'original' is never entered when there's
        // nothing to play. Synth stays selected/active; the empty-state panel communicates
        // why Original isn't available.
        if (source === 'original' && !activeVideoId) {
            setShowNoVideoPanel(true);
            return;
        }
        setShowNoVideoPanel(false);
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
    }, [api, activeVideoId]);

    // [MAESTRO-VIDEO-003B] Songsterr-style safety fallback: if the current song has no
    // video while Original is active, fall back to Synth (reusing handleAudioSourceChange
    // so isYouTubePlayerVisible/isYouTubeReady/masterVolume all settle consistently, same
    // as any manual switch-to-Synth). Keyed ONLY on activeVideoId, not audioSource — this
    // effect must re-evaluate when video availability changes (i.e. on a song switch), but
    // NOT on every audioSource toggle, otherwise explicitly selecting Original on a
    // no-video song would be immediately stomped back to Synth on the same render.
    useEffect(() => {
        if (!activeVideoId && audioSource === 'original') {
            handleAudioSourceChange('synth');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVideoId]);

    // [MAESTRO-VIDEO-003C] Dismiss the no-video panel on any song/video-context change —
    // a stale panel from a previous no-video song must not carry into the next one
    // (whether the next song has a video or is itself another no-video song).
    useEffect(() => {
        setShowNoVideoPanel(false);
    }, [activeVideoId]);

    // ==================== SPEED / VOLUME ====================
    const handleSpeedChange = useCallback((speed: number) => {
        playbackSpeedRef.current = speed;
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
        // [PLAYER-PREF-001] Recency is recorded only on explicit manual song choice — the
        // automatic first-song fallback in refetchSongs never calls this.
        savePlayerPrefs(recordRecentSong(loadPlayerPrefs(), songId));
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
        // [MAESTRO-VIDEO-004C] Re-derive youtubeVideoId/videoVariants/videoStartOffset from
        // tab_youtube via the same fetchSongs() bridge queries.ts already uses, so Original
        // Mode sees a Media & Sync video save immediately instead of requiring a hard
        // refresh. Reuses the same refetchSongs() NewTabPanel already calls after uploads.
        // Safe for PLAYER-003: the signed URL resolver is keyed on file-identity primitives
        // (id/file_path/file_name/file_extension/title) derived from currentSong, not the
        // object reference itself — none of those change from a tab_youtube-only save, so
        // the new songs array/currentSong reference from this refetch does not re-trigger
        // the resolver, reload the score, or reset the selected track.
        refetchSongs();
    }, [refetchSongs]);

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
    // [PS1b] Playback hides tray once on start (useEffect above). Manual scroll restores it.
    // [PS2] isHeaderVisible tracks scroll direction — set by scroll listener above.
    const isHeaderShown = isMobileLandscape || isHeaderVisible;

    return (
        // [MAESTRO-LOOP-002G.3] grid-cols-[minmax(0,1fr)]: the mobile-landscape <main> below
        // now uses overflow-x-clip/overflow-y-clip (002G/002G.1) instead of overflow-hidden.
        // overflow:clip prevents the shell from scrolling but — unlike overflow:hidden —
        // does not establish the same scroll-container/min-width:auto suppression, so this
        // grid track's implicit column (previously sized `auto`) could stretch to AlphaTab's
        // full intrinsic strip width (confirmed live: ~35898px) instead of the viewport.
        // minmax(0, 1fr) explicitly allows the track to shrink below that content width,
        // keeping the page viewport-sized while the inner .alphatab-container remains the
        // real horizontal scroller. Columns prevent AlphaTab's intrinsic WIDTH from blowing
        // out the shell. Applied unconditionally (both orientations) — orthogonal to the
        // height split below (width, not height).
        //
        // [MAESTRO-UI-006C] Row model, corrected. The old grid-rows-[0px,1fr,0px] used
        // commas between top-level tracks, which is invalid grid-template-rows syntax
        // (compiles to `0px,1fr,0px`) — browsers drop the whole declaration, so this ran as
        // an implicit, content-sized single row, never a real three-row grid (confirmed
        // live: 006B's attempt to make the row template valid exposed that the fixed
        // header/footer/overlays are position:fixed and out of flow, and <main> — the only
        // real in-flow child — auto-placed into the first 0px track and collapsed to zero
        // height). grid-rows-[minmax(0,1fr)] is the honest model and is now used
        // unconditionally by both orientations (see UI-009A below for why height still
        // differs by orientation).
        //
        // [MAESTRO-UI-009A] CLOSED CANDIDATE. Bisection (known-good d8110cb vs known-bad
        // 89e31f3) convicted this div's h-screen→h-dvh change as the cause of the iPhone
        // PWA portrait cold-start bottom gutter: h-dvh/100dvh consults the same WebKit
        // dynamic-viewport tracker that window.innerHeight/visualViewport.height read
        // from, and an on-device debug probe caught that tracker reporting a transient
        // short value (894px vs the true 956px) on cold portrait launch, self-correcting
        // only once a resize/visualViewport-resize event fires shortly after mount.
        // h-screen does not consult that tracker, so it paints the true full height
        // immediately and lets WebKit self-correct in the background instead of locking
        // the shell to the bad transient value. Portrait therefore stays on h-screen;
        // mobile landscape keeps h-dvh (the UI-006C strip-drift fix, unaffected by this
        // bug). Both orientations now share the same valid grid-rows-[minmax(0,1fr)] —
        // the invalid legacy grid-rows-[0px,1fr,0px] template is gone from both branches.
        // Confirmed on-device via a (now removed) debug-gated probe: repeated cold
        // launches, a landscape sweep, and return-to-portrait all passed with no gutter.
        <div
            className={`
        grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden
        ${isMobileLandscape ? 'h-dvh' : 'h-screen'}
    `}
        >

            {/* ── TopMenuTray wrapper owns slide animation; tray itself is dumb ── */}
            {/* [VA1] GPU-composited slide: will-change-transform + 200ms ease-out (was duration-300 ease). */}
            <div className={`fixed top-0 left-0 right-0 pointer-fine:right-3.75 w-auto z-50 will-change-transform transform transition-transform duration-200 ease-out ${isHeaderShown ? 'translate-y-0' : '-translate-y-full'}`}>
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
                    // [MAESTRO-VIDEO-004] 'novideo' opens straight to Media & Sync with the
                    // Main / Full Mix row scrolled into view and briefly highlighted.
                    initialSection={metaEditorState.source === 'novideo' ? 'media' : undefined}
                    focusMainVideoRow={metaEditorState.source === 'novideo'}
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
             *   - style prop removed (maxWidth/100vw was strip-mode pairing)
             *
             * [MAESTRO-UI-002] Header top padding is intentionally still gated on
             * !isMobileLandscape below (pt-0 in landscape, pt-[calc(80px+...)] otherwise) —
             * landscape mode relies on TopMenuTray's CSS shell query (globals.css, now
             * max-height: 600px to match isMobileLandscape's own innerHeight < 600 threshold)
             * rendering its compact mobile shell instead of the tall desktop one, so zero
             * reserved padding is correct once those two thresholds agree.
             *
             * [MAESTRO-LOOP-002G] Landscape branch: overflow-x-hidden → overflow-x-clip.
             * A wide landscape loop-highlight band (BeatCustomLoopOverlay) could inflate
             * this shell's scrollWidth; overflow-x-hidden still creates a scroll container
             * whose scrollLeft can be pinned to max (right-side white wipe, cursor/score
             * misregistration). overflow-x-clip clips overflow without creating a
             * horizontal scroll container, so scrollLeft stays pinned to 0.
             *
             * [MAESTRO-LOOP-002G.1] Both axes must be `clip` — overflow-x:clip paired with
             * overflow-y:hidden computes back to overflow-x:hidden per CSS overflow
             * behavior (a mixed clip/hidden pair resolves to hidden), silently re-enabling
             * programmatic scrollLeft and reintroducing the wipe. Confirmed live: with
             * overflow-y forced to clip, getComputedStyle(outer).overflowX reports 'clip'
             * and scrollLeft stays 0.
             */}
            <main
                ref={mainScrollContainerRef}
                className={`
        w-full
        ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}
        ${isMobileLandscape
                        ? 'overflow-x-clip overflow-y-clip overscroll-none [touch-action:pan-x]'
                        : 'pb-32 overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable]'}
        ${!isMobileLandscape ? 'pt-[calc(80px+env(safe-area-inset-top))]' : 'pt-0'}
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
                {/* [MAESTRO-LAYOUT-001B] The 74px below is the desktop TransportBar height
                    (TransportBar.tsx, h-[74px]) — also mirrored in YouTubePlayer.tsx's desktop
                    bottom offset (md:bottom-[74px]). Keep all three in sync if it changes. */}
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
                            trackRenderRequestId={trackRenderRequestId}
                            scrollContainer={mainScrollContainerRef.current}
                            headerVisibleRef={headerIntentRef}
                            onRequestHeaderHide={requestHeaderHide}
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
                            suppressLandscapeCursor={isMobileLandscape && (isMobileTrackMixerOpen || isSongSelectorOpen)}
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

            <footer className="fixed bottom-0 left-0 right-0 pointer-fine:right-3.75 w-auto z-50">
                <MaestroControlPanel
                    api={api}
                    playerReady={playerReady}
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
                    onCursorBlockingPanelOpenChange={setIsMobileTrackMixerOpen}
                />
            </footer>

            <CountInOverlay
                count={countdownValue}
                isVisible={isCountingDown}
                mode={countInMode}
                onComplete={() => { }}
            />

            {/* [MAESTRO-LAYOUT-001B] min-width:650px marks the desktop threshold, paired with the
                max-width:649px complement in globals.css's TopMenuTray shell query and
                MobileToolsSlideout.tsx's MOBILE_SWIPE_MEDIA_QUERY — same intentional
                inclusive-CSS-max split as the documented 599/600 landscape-height pairing. */}
            {!isMobileLandscape && (
                <div className="block [@media(min-width:650px)]:hidden" style={{ zIndex: 50 }}>
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
            {/* [C5] YouTube player — always mounted to prevent flash, isVisible controls display.
                [MAESTRO-VIDEO-001] YouTubePlayer visibility is gated by activeVideoId so it
                does not mount/init with an empty videoId. */}
            <YouTubePlayer
                ref={youtubePlayerRef}
                videoId={activeVideoId || ''}
                isVisible={audioSource === 'original' && isYouTubePlayerVisible && !!activeVideoId}
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

            {/* [MAESTRO-VIDEO-003C/004A] Songsterr-style empty state — rendered in the same
                bottom-docked slot YouTubePlayer normally occupies. Driven by showNoVideoPanel,
                NOT audioSource === 'original' — audioSource stays 'synth' the whole time this
                is open, since the source selector must only reflect what's actually playable.
                [004A] This is a gateway, not an inline editor: no inline paste/sync controls —
                the only action routes into MetadataEditorPanel → Media & Sync, where the real
                tab_youtube save path (and the other slot rows, for Practice Generator/lesson
                tabs) already lives. */}
            {showNoVideoPanel && !activeVideoId && (
                <div
                    className={`fixed z-40 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden flex flex-col ${isMobileLandscape
                        ? 'w-[230px] bottom-[80px] right-0'
                        : 'w-[52vw] bottom-[80px] right-0 md:w-[355px] md:bottom-[74px] md:right-4'
                        }`}
                >
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-600 text-white text-[10px] font-bold shrink-0">▶</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">Sync tab with YouTube video</span>
                        <button
                            type="button"
                            onClick={() => setShowNoVideoPanel(false)}
                            aria-label="Dismiss"
                            className="shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-lg leading-none px-1"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            No Main / Full Mix video is linked for this song. Add a YouTube video in Media &amp; Sync.
                        </p>
                        {/* [MAESTRO-VIDEO-004A] Opens the existing Metadata Editor straight to
                            Media & Sync → Main / Full Mix, the row that actually feeds Original
                            Mode (tab_youtube main row → queries.ts bridge → activeVideoId). Main
                            is only pre-focused guidance — Media & Sync still exposes every other
                            slot row (Lesson, Tutorial, Playthrough, Live, Solo, etc.) for
                            Practice Generator/lesson-style tabs that need a different slot. */}
                        {currentSong && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNoVideoPanel(false);
                                    setMetaEditorState({ tabId: currentSong.id, source: 'novideo' });
                                }}
                                className="w-full px-3 py-2 text-sm font-bold rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                            >
                                Add Main / Full Mix Video
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
