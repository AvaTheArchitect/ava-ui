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

        const info: Record<string, any> = {
            'API Ready': '✅',
            'Score Loaded': api.score ? '✅' : '❌',
            'Renderer Ready': api.renderer ? '✅' : '❌',
            'BoundsLookup': api.renderer?.boundsLookup ? '✅' : '❌',
            'TickCache': api.tickCache ? '✅' : '❌',
            'Rendered Tracks': api.tracks?.length || 0,
            'Total Tracks': api.score?.tracks?.length || 0,
            'Current Time': `${currentTime.toFixed(2)}s`,
            'Playing': isPlaying ? '▶️' : '⏸️'
        };

        // Try to find current beat
        if (api.tickCache && api.tracks?.length > 0) {
            try {
                const trackIndices = api.tracks.map((t: any) => t.index);
                const trackSet = new Set(trackIndices);
                const result = api.tickCache.findBeat(trackSet, currentTime * 1000);
                info['Beat Found'] = result?.beat ? '✅' : '❌';

                if (result?.beat && api.renderer?.boundsLookup) {
                    const bounds = api.renderer.boundsLookup.findBeat(result.beat);
                    info['Beat Bounds'] = bounds ? '✅' : '❌';
                    if (bounds) {
                        info['Cursor X'] = Math.floor(bounds.visualBounds.x);
                        info['Cursor Y'] = Math.floor(bounds.visualBounds.y);
                    }
                }
            } catch (e) {
                info['Beat Lookup Error'] = e instanceof Error ? e.message : 'Unknown';
            }
        }

        setDebugInfo(info);
    }, [api, currentTime, isPlaying]);

    return (
        <div className="bg-gray-900/80 rounded-lg p-4 border border-blue-500/30">
            <h3 className="text-blue-400 font-bold mb-2">🔍 Debug Info</h3>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {Object.entries(debugInfo).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="text-gray-400">{key}:</span>
                        <span className="text-green-400">{String(value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};