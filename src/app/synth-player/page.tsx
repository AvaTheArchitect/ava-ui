'use client';

/**
 * STAGE 1+ - Synth Player with Maestro Control Panel
 * 
 * CHANGES FROM PREVIOUS STAGE 1:
 * ✅ Integrated MaestroControlPanel (replaces embedded controls)
 * ✅ Added audio source state (synth/original)
 * ✅ Added loop state management (isLooping, hasLoopSelection)
 * ✅ Added track mute/solo state Maps
 * ✅ Added songInfo state
 * ✅ Added playback speed control
 * ✅ Kept all existing Stage 1 safety measures
 * ✅ Added theme state (for future light/dark toggle)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlphaTabRenderer } from '@/components/alphaTab/AlphaTabRenderer';
import { DebugPanel } from '@/components/alphaTab/DebugPanel';
import { MaestroControlPanel } from '@/components/audio/maestro/controls';
import type { AlphaTabApi, Track, SongInfo } from '@/lib/alphaTab/types';

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

    // ==================== TIME TRACKING (Refs to avoid re-renders) ====================
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const [displayTime, setDisplayTime] = useState<number>(0);
    const [displayDuration, setDisplayDuration] = useState<number>(0);

    // Update display every 500ms instead of every position change
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setDisplayTime(currentTimeRef.current);
            setDisplayDuration(durationRef.current);
        }, 500);

        return () => clearInterval(interval);
    }, [isPlaying]);

    // ==================== API READY HANDLER ====================
    const handleApiReady = useCallback((alphaTabApi: AlphaTabApi) => {
        console.log('✅ API Ready');
        setApi(alphaTabApi);

        // Wire up player state events
        if (alphaTabApi.playerReady) {
            alphaTabApi.playerReady.on(() => {
                console.log('✅ Player Ready!');
                setPlayerReady(true);
            });
        }

        if (alphaTabApi.playerStateChanged) {
            alphaTabApi.playerStateChanged.on((e: any) => {
                const playing = e.state === 1;
                setIsPlaying(playing);

                // Reset on finished
                if (e.state === 2) {
                    currentTimeRef.current = 0;
                    setDisplayTime(0);
                }
            });
        }

        // CRITICAL: Store position in ref, not state
        if (alphaTabApi.playerPositionChanged) {
            alphaTabApi.playerPositionChanged.on((e: any) => {
                currentTimeRef.current = e.currentTime / 1000;
                durationRef.current = e.endTime / 1000;
            });
        }

        // 🚨 STAGE 1 SAFETY: Block AlphaTab's native drag-to-loop
        if (alphaTabApi.playbackRangeChanged) {
            const handlePlaybackRangeChanged = () => {
                if (alphaTabApi.playbackRange !== null) {
                    alphaTabApi.playbackRange = null;
                    if ((alphaTabApi as any).setSelection) {
                        (alphaTabApi as any).setSelection(0, 0, 0, 0);
                    }
                    console.log('🚫 STAGE 1: Blocked native loop selection');
                }
            };

            alphaTabApi.playbackRangeChanged.on(handlePlaybackRangeChanged);
        }
    }, []);

    // ==================== SCORE LOADED HANDLER ====================
    const handleScoreLoaded = useCallback((info: SongInfo, trackList: Track[]) => {
        console.log(`✅ Score: ${info.title} (${trackList.length} tracks)`);
        setSongInfo(info);
        setTracks(trackList);
        setSelectedTrack(0);
        setError(null);

        // Initialize track mute/solo state
        setTrackMuteState(new Map(trackList.map((_, index) => [index, false])));
        setTrackSoloState(new Map(trackList.map((_, index) => [index, false])));
    }, []);

    // ==================== RENDER FINISHED HANDLER ====================
    const handleRenderFinished = useCallback(() => {
        console.log('✅ Rendering Complete');
    }, []);

    // ==================== ERROR HANDLER ====================
    const handleError = useCallback((errorMsg: string) => {
        console.error(`❌ ERROR: ${errorMsg}`);
        setError(errorMsg);
    }, []);

    // ==================== PLAYBACK CONTROLS ====================
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

    // ==================== TRACK CHANGE HANDLER ====================
    const handleTrackChange = useCallback((trackIndex: number) => {
        if (api?.score?.tracks) {
            console.log(`🔄 Track ${trackIndex}`);
            api.renderTracks([api.score.tracks[trackIndex]]);
            setSelectedTrack(trackIndex);
        }
    }, [api]);

    // ==================== LOOP HANDLERS ====================
    const handleLoopToggle = useCallback(() => {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        // Clear selection when disabling loop
        if (!newLoopState) {
            setHasLoopSelection(false);
            if (api?.playbackRange !== undefined) {
                api.playbackRange = null;
            }
            console.log('🔄 Loop disabled - selection cleared');
        } else {
            console.log('🔄 Loop enabled');
        }
    }, [api, isLooping]);

    const handleLoopRangeChange = useCallback((start: number, end: number) => {
        if (!api) return;

        setHasLoopSelection(true);
        api.playbackRange = { startTick: start, endTick: end };
        console.log(`🔁 Loop range set: ${start} - ${end}`);
    }, [api]);

    // ==================== SPEED CONTROL HANDLER ====================
    const handleSpeedChange = useCallback((speed: number) => {
        setPlaybackSpeed(speed);
        if (api) {
            api.playbackSpeed = speed;
            console.log(`🎚️ Speed: ${Math.round(speed * 100)}%`);
        }
    }, [api]);

    // ==================== AUDIO SOURCE HANDLER ====================
    const handleAudioSourceChange = useCallback((source: 'synth' | 'original') => {
        setAudioSource(source);
        console.log(`🎵 Audio source: ${source}`);
        // TODO: Implement YouTube player switch when ready
    }, []);

    // ==================== TRACK MUTE/SOLO HANDLERS ====================
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

        console.log(`${!isMuted ? '🔇' : '🔊'} ${track.name}`);
    }, [api, trackMuteState]);

    const handleTrackSoloToggle = useCallback((trackIndex: number) => {
        if (!api || !api.score) return;

        const track = api.score.tracks[trackIndex];
        const isSoloed = trackSoloState.get(trackIndex) || false;

        api.changeTrackSolo([track], !isSoloed);
        setTrackSoloState(prev => {
            const newMap = new Map(prev);
            if (!isSoloed) {
                // Solo this track, unsolo all others
                prev.forEach((_, key) => newMap.set(key, key === trackIndex));
            } else {
                // Unsolo this track
                newMap.set(trackIndex, false);
            }
            return newMap;
        });

        console.log(`${!isSoloed ? '🎯' : '👥'} Solo ${track.name}`);
    }, [api, trackSoloState]);

    // ==================== THEME TOGGLE HANDLER ====================
    const handleThemeToggle = useCallback(() => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        console.log(`🎨 Theme: ${newTheme}`);
        // TODO: Implement actual theme switching in AlphaTab canvas
    }, [theme]);

    return (
        <>
            {/* Main Content Area */}
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white p-8 pb-32">
                <div className="max-w-7xl mx-auto space-y-6 pb-24">

                    {/* Header */}
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500 mb-2">
                            Maestro Guitar Tab Player - STAGE 1+
                        </h1>
                        <p className="text-gray-400">
                            Core Features: Professional Menu Tray • Responsive Design • Full Controls
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                            <h3 className="text-red-400 font-bold mb-2">Error</h3>
                            <p className="text-red-300">{error}</p>
                        </div>
                    )}

                    {/* AlphaTab Renderer */}
                    <div id="maestro-player" className="bg-white rounded-xl shadow-2xl">
                        <AlphaTabRenderer
                            fileUrl="/data/sample-songs/real-songs/ozzy-no-more-tears/ozzy-no-more-tears.gp3"
                            playerMode="synthesizer"
                            soundFontPath="/soundfont/sonivox.sf2"
                            onApiReady={handleApiReady}
                            onScoreLoaded={handleScoreLoaded}
                            onRenderFinished={handleRenderFinished}
                            onError={handleError}
                            minHeight="600px"
                            isLooping={isLooping}
                            onLoopRangeChange={handleLoopRangeChange}
                        />
                    </div>

                    {/* Debug Panel - Kept for development */}
                    <DebugPanel
                        api={api}
                        currentTime={displayTime}
                        isPlaying={isPlaying}
                    />
                </div>
            </div>

            {/* Maestro Control Panel - OUTSIDE content container for true fixed positioning */}
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
        </>
    );
}