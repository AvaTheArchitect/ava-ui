'use client';

/**
 * Synth Player Page — Phase 3
 * Date: March 17th, 2026
 *
 * Phase 3 changes (surgical — do not expand scope):
 *   ✅ AlphaTabRenderer → AlphaTabRendererV102
 *   ✅ Song switching disabled (TopMenuTray renders but selector is no-op)
 *   ✅ fetchSongs() + signed URL cache kept — production loading path under test
 *   ✅ onApiReady / onScoreLoaded / onRenderFinished wired to existing handlers
 *   ✅ enableUserInteraction=isLooping effect REMOVED — V102 locks it off permanently
 *
 * Dormant (restored in Phase 4+):
 *   YouTube, metronome, count-in, pitch shift, metadata editor, song switching
 *
 * 🔒 Do not modify AlphaTabRendererV102 transport/loop engine from this file.
 */

import React, {
    useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { supabase } from '@/lib/alphaTab/supabase';
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

    // audioSource locked to 'synth' for Phase 3 — YouTube dormant
    const audioSource = 'synth' as const;

    // ==================== MASTER VOLUME ====================
    const [masterVolume, setMasterVolume] = useState<number>(1.0);
    const masterVolumeRef = useRef<number>(1.0);
    useEffect(() => { masterVolumeRef.current = masterVolume; }, [masterVolume]);

    // ==================== COUNT IN (dormant Phase 3) ====================
    const [isCountInEnabled, setIsCountInEnabled] = useState<boolean>(false);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const [countdownValue, setCountdownValue] = useState<number>(0);
    const [countInMode, setCountInMode] = useState<'three-beat' | 'four-beat'>('three-beat');

    // ==================== METRONOME (dormant Phase 3) ====================
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

    // ==================== PITCH SHIFT (dormant Phase 3) ====================
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

    // ==================== THEME ====================
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // ==================== SONG STATE ====================
    const [songState, setSongState] = useState<SongState>({ songs: [], playlists: [], currentSongId: null });

    // Phase 3: song switching disabled — panels kept but selector is no-op
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
                .filter(s => s.file_name && s.file_extension)
                .map(s => `${s.file_name}.${s.file_extension}`);
            const { data: urlData } = await supabase.storage.from('tabs').createSignedUrls(paths, 3600);
            if (urlData) {
                const expiresAt = Date.now() + 55 * 60 * 1000;
                urlData.forEach(entry => {
                    if (entry.path && entry.signedUrl)
                        signedUrlCacheRef.current.set(entry.path, { url: entry.signedUrl, expiresAt });
                });
                console.log(`✅ Phase 3: Batch signed ${urlData.length} URLs`);
            }
            setSongState(prev => ({ ...prev, songs, currentSongId: songs[0]?.id ?? null }));
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
        const path = `${currentSong.file_name}.${currentSong.file_extension}`;
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

    // ==================== SHELL CALLBACKS (V102 interface) ====================

    /** onApiReady — mirrors old handleApiReady but without YouTube wiring (dormant). */
    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ Phase 3: API ready');
        setApi(alphaTabApi);
        alphaTabApi.masterVolume = masterVolumeRef.current;
        // playerStateChanged and playerPositionChanged are owned by V102 transport engine.
        // Page only needs position for time display.
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime;
                durationRef.current = e.endTime;
            });
        }
    }, []);

    /** onScoreLoaded — mirrors old handleScoreLoaded. Guitar-first track logic preserved. */
    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ Phase 3: Score loaded — ${info.title}`);
        setSongInfo(info);
        setTracks(trackList);
        setError(null);
        setTrackMuteState(new Map(trackList.map((_, i) => [i, false])));
        setTrackSoloState(new Map(trackList.map((_, i) => [i, false])));

        if (api?.score?.tracks?.[0]?.staves?.[0]?.stringTuning?.tunings) {
            setTuningData(api.score.tracks[0].staves[0].stringTuning.tunings);
        }
        setPitchShift(0);

        // V100 guitar-first smart default track
        const GUITAR = ['guitar', 'gtr', 'lead', 'rhythm', 'gtrs', 'acoustic', 'clean', 'dist'];
        const BASS = ['bass'];
        const findKw = (kws: string[]) =>
            trackList.findIndex(t => kws.some(kw => (t.name ?? '').toLowerCase().includes(kw)));
        const gi = findKw(GUITAR);
        const bi = findKw(BASS);
        setSelectedTrack(gi >= 0 ? gi : bi >= 0 ? bi : 0);
        // Note: track render is handled by V102 via trackIndices prop — no api.renderTracks here.
    }, [api]);

    /** onRenderFinished — scroll reset only. */
    const handleRenderFinished = useCallback(() => {
        console.log('✅ Phase 3: Render finished');
        setTimeout(() => {
            if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
        }, 150);
    }, []);

    // ==================== PLAY / PAUSE ====================
    // Phase 3: synth only, no count-in wiring (dormant).
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
    const handleTrackChange = useCallback((trackIndex: number) => {
        // V102 re-renders the track via trackIndices prop — state update triggers remount-safe re-render.
        setSelectedTrack(trackIndex);
        if (api?.score?.tracks) {
            api.score.tracks.forEach((track: any, idx: number) => {
                api.changeTrackMute([track], trackMuteState.get(idx) || false);
                api.changeTrackSolo([track], trackSoloState.get(idx) || false);
            });
        }
    }, [api, trackMuteState, trackSoloState]);

    // ==================== LOOP ====================
    // Shared full-clear — called by tray Loop OFF, Clear button, and song change.
    // Must match the overlay's internal clearLoop() path exactly:
    //   api.playbackRange = null + api.isLooping = false + page state reset.
    // The loopEnabled→false prop watcher in BeatCustomLoopOverlay clears rects/beats.
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
            // Bar snap on toggle-ON is handled by BeatCustomLoopOverlay's
            // loopEnabled useEffect — no direct api call needed here.
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
        if (!api?.score) return;
        const isSoloed = trackSoloState.get(idx) || false;
        api.changeTrackSolo([api.score.tracks[idx]], !isSoloed);
        setTrackSoloState(prev => {
            const m = new Map(prev);
            if (!isSoloed) { prev.forEach((_, k) => m.set(k, k === idx)); }
            else m.set(idx, false);
            return m;
        });
    }, [api, trackSoloState]);

    // ==================== SONG LIBRARY (Phase 3: switching disabled) ====================
    // handleSongSelect kept for when switching is re-enabled in Phase 4.
    const handleSongSelect = useCallback((songId: string) => {
        setIsLooping(false);
        setHasLoopSelection(false);
        setPlaybackRange(null);
        setSongState(prev => ({ ...prev, currentSongId: songId }));
        setIsSongSelectorOpen(false);
        if (mainScrollContainerRef.current) mainScrollContainerRef.current.scrollTop = 0;
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

    // ==================== RENDER ====================
    return (
        <div className="h-screen grid grid-rows-[0px,1fr,0px] bg-gradient-to-br from-purple-900 via-gray-900 to-black overflow-x-hidden">

            {/* TopMenuTray — renders current song, song selector no-op for Phase 3 */}
            <div className={`fixed top-0 inset-x-0 w-full z-50 transform transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <TopMenuTray
                    currentSong={currentSong || null}
                    onSongSelectorOpen={() => { /* Phase 3: song switching disabled */ }}
                    onNewTabOpen={() => setIsNewTabOpen(true)}
                />
            </div>

            {/* Panels — kept but song switching wired to no-op above */}
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
                            trackIndices={[selectedTrack]}
                            isPlaying={isPlaying}
                            onPlayStateChange={setIsPlaying}
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRendered={handleRenderFinished}
                            onBoundsReady={() => { /* bounds ready — V102 manages internally */ }}
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
                        onLoopRangeChange={(start, end) => setHasLoopSelection(start !== null && end !== null)}
                        onSpeedChange={handleSpeedChange}
                        onTrackChange={handleTrackChange}
                        onAudioSourceChange={() => { /* Phase 3: source locked to synth */ }}
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