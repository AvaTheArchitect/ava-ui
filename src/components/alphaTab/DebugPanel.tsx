'use client';

import React, { useState, useEffect } from 'react';
import type { AlphaTabApi } from '@/lib/alphaTab/types';

export interface DebugPanelProps {
    api: AlphaTabApi | null;
    currentTime: number;
    isPlaying: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ api, currentTime, isPlaying }) => {
    const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!api) {
            setDebugInfo({ status: 'API not ready' });
            return;
        }

        // Function to update debug info
        const updateDebugInfo = () => {
            const info: Record<string, any> = {
                '🎯 API Ready': '✅',
                '📄 Score Loaded': api.score ? '✅' : '❌',
                '🎨 Renderer Ready': api.renderer ? '✅' : '❌',
                '📍 BoundsLookup': api.renderer?.boundsLookup ? '✅' : '❌',
                '⏱️ TickCache': (api as any).tickCache ? '✅' : '❌',
                '🎸 Rendered Tracks': api.tracks?.length || 0,
                '📊 Total Tracks': api.score?.tracks?.length || 0,
                '⏰ Current Time': `${currentTime.toFixed(2)}s`,
                '▶️ Status': isPlaying ? 'Playing' : 'Paused'
            };

            // 🆕 V2.1: Display rendered track numbers (1-indexed for users)
            if (api.tracks && api.tracks.length > 0) {
                const trackNumbers = api.tracks.map((t: any) => t.index + 1).join(', ');
                info['🎵 Active Track(s)'] = trackNumbers;
            }

            // 🆕 V2: Add total measures
            if (api.score?.masterBars) {
                info['📏 Total Measures'] = api.score.masterBars.length;
            }

            // 🆕 V2: Add loop range information
            if (api.playbackRange) {
                info['🔄 Loop Active'] = '✅';
                info['🎯 Loop Start Tick'] = api.playbackRange.startTick;
                info['🎯 Loop End Tick'] = api.playbackRange.endTick;

                // Calculate loop start/end measures
                if ((api as any).tickCache && api.tracks?.length > 0) {
                    try {
                        const trackIndices = api.tracks.map((t: any) => t.index);
                        const trackSet = new Set(trackIndices);

                        const startBeatResult = (api as any).tickCache.findBeat(trackSet, api.playbackRange.startTick);
                        const endBeatResult = (api as any).tickCache.findBeat(trackSet, api.playbackRange.endTick);

                        if (startBeatResult?.beat) {
                            const startMeasure = startBeatResult.beat.voice.bar.masterBar.index + 1;
                            info['📍 Loop Start Measure'] = startMeasure;
                        }

                        if (endBeatResult?.beat) {
                            const endMeasure = endBeatResult.beat.voice.bar.masterBar.index + 1;
                            info['📍 Loop End Measure'] = endMeasure;
                        }

                        if (startBeatResult?.beat && endBeatResult?.beat) {
                            const startMeasure = startBeatResult.beat.voice.bar.masterBar.index + 1;
                            const endMeasure = endBeatResult.beat.voice.bar.masterBar.index + 1;
                            const measureCount = endMeasure - startMeasure + 1;
                            info['📊 Loop Measures'] = `${measureCount} measure${measureCount !== 1 ? 's' : ''}`;
                        }
                    } catch (e) {
                        info['⚠️ Loop Measure Error'] = 'Cannot calculate';
                    }
                }
            } else {
                info['🔄 Loop Active'] = '❌';
            }

            // Try to find current beat and measure
            if ((api as any).tickCache && api.tracks?.length > 0) {
                try {
                    const trackIndices = api.tracks.map((t: any) => t.index);
                    const trackSet = new Set(trackIndices);

                    // Use tickPosition if available, otherwise use currentTime
                    const currentTick = api.tickPosition ?? (currentTime * 1000);
                    const result = (api as any).tickCache.findBeat(trackSet, currentTick);

                    info['🎵 Beat Found'] = result?.beat ? '✅' : '❌';

                    if (result?.beat) {
                        const beat = result.beat;

                        // 🆕 V2: Show current measure
                        const currentMeasure = beat.voice.bar.masterBar.index + 1;
                        info['📍 Current Measure'] = currentMeasure;

                        // 🆕 V2: Show beat index within measure
                        info['🎼 Beat in Measure'] = `${beat.index + 1}`;

                        // 🆕 V2: Show time signature
                        const timeSignature = beat.voice.bar.masterBar.timeSignatureNumerator + '/' +
                            beat.voice.bar.masterBar.timeSignatureDenominator;
                        info['⏱️ Time Signature'] = timeSignature;

                        // Show beat tick
                        info['🎯 Current Tick'] = beat.absolutePlaybackStart;

                        // Show bounds if available
                        if (api.renderer?.boundsLookup) {
                            const bounds = api.renderer.boundsLookup.findBeat(result.beat);
                            info['📦 Beat Bounds'] = bounds ? '✅' : '❌';
                            if (bounds) {
                                info['🖱️ Cursor X'] = Math.floor(bounds.visualBounds.x);
                                info['🖱️ Cursor Y'] = Math.floor(bounds.visualBounds.y);
                                info['📏 Bound Width'] = Math.floor(bounds.visualBounds.w);
                            }
                        }
                    }
                } catch (e) {
                    info['⚠️ Beat Lookup Error'] = e instanceof Error ? e.message : 'Unknown';
                }
            }

            // 🆕 V2: Add tempo information
            if (api.score) {
                info['🎵 Tempo (BPM)'] = api.score.tempo || 'N/A';
            }

            setDebugInfo(info);
        };

        // CRITICAL FIX: Listen for multiple events to update all fields
        const handlers: (() => void)[] = [];

        // 1. Score loaded event - updates track counts
        if (api.scoreLoaded) {
            const scoreLoadedHandler = () => {
                console.log('✅ Score loaded - updating debug panel');
                updateDebugInfo();
            };
            api.scoreLoaded.on(scoreLoadedHandler);
            handlers.push(() => api.scoreLoaded?.off(scoreLoadedHandler));
        }

        // 2. Render finished event - updates BoundsLookup and TickCache
        if (api.renderFinished) {
            const renderFinishedHandler = () => {
                console.log('✅ Render finished - updating debug panel');
                updateDebugInfo();
            };
            api.renderFinished.on(renderFinishedHandler);
            handlers.push(() => api.renderFinished?.off(renderFinishedHandler));
        }

        // 3. Player state changed - updates playing status
        if ((api as any).playerStateChanged) {
            const playerStateHandler = () => {
                updateDebugInfo();
            };
            (api as any).playerStateChanged.on(playerStateHandler);
            handlers.push(() => (api as any).playerStateChanged?.off(playerStateHandler));
        }

        // 🆕 V2: Listen for playback range changes
        if ((api as any).playbackRangeChanged) {
            const rangeHandler = () => {
                console.log('🔄 Playback range changed - updating debug panel');
                updateDebugInfo();
            };
            (api as any).playbackRangeChanged.on(rangeHandler);
            handlers.push(() => (api as any).playbackRangeChanged?.off(rangeHandler));
        }

        // 🆕 V2: Listen for position changes during playback
        if ((api as any).playerPositionChanged) {
            let lastMeasure = -1;
            const positionHandler = () => {
                // Only update if we've moved to a different measure (reduce UI updates)
                if ((api as any).tickCache && api.tracks?.length > 0) {
                    try {
                        const trackIndices = api.tracks.map((t: any) => t.index);
                        const trackSet = new Set(trackIndices);
                        const currentTick = api.tickPosition ?? 0;
                        const result = (api as any).tickCache.findBeat(trackSet, currentTick);

                        if (result?.beat) {
                            const currentMeasure = result.beat.voice.bar.masterBar.index;
                            if (currentMeasure !== lastMeasure) {
                                lastMeasure = currentMeasure;
                                updateDebugInfo();
                            }
                        }
                    } catch (e) {
                        // Ignore errors during rapid position updates
                    }
                }
            };
            (api as any).playerPositionChanged.on(positionHandler);
            handlers.push(() => (api as any).playerPositionChanged?.off(positionHandler));
        }

        // Update immediately if score/renderer already loaded
        if (api.score || api.renderer) {
            updateDebugInfo();
        }

        // Cleanup all listeners
        return () => {
            handlers.forEach(cleanup => cleanup());
        };
    }, [api, currentTime, isPlaying]);

    return (
        <div className="bg-gray-900/80 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-blue-400 font-bold text-lg">🔍 Debug Info V2.1</h3>
                <div className="text-xs text-gray-500">1-indexed Track Numbers</div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono">
                {Object.entries(debugInfo).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center py-0.5">
                        <span className="text-gray-400 mr-2">{key}:</span>
                        <span className={`font-semibold ${String(value).includes('✅') ? 'text-green-400' :
                                String(value).includes('❌') ? 'text-red-400' :
                                    key.includes('Measure') ? 'text-yellow-400' :
                                        key.includes('Loop') ? 'text-blue-400' :
                                            key.includes('Tick') ? 'text-purple-400' :
                                                'text-green-400'
                            }`}>
                            {String(value)}
                        </span>
                    </div>
                ))}
            </div>

            {/* 🆕 V2: Quick measure navigation display */}
            {api?.score?.masterBars && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Measure Navigation:</div>
                    <div className="text-xs text-blue-300">
                        {debugInfo['📍 Current Measure'] && (
                            <span>
                                Measure <strong className="text-yellow-400">{debugInfo['📍 Current Measure']}</strong> of <strong>{api.score.masterBars.length}</strong>
                            </span>
                        )}
                        {debugInfo['📍 Loop Start Measure'] && debugInfo['📍 Loop End Measure'] && (
                            <span className="ml-3">
                                | Loop: <strong className="text-blue-400">{debugInfo['📍 Loop Start Measure']}</strong> → <strong className="text-blue-400">{debugInfo['📍 Loop End Measure']}</strong>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};