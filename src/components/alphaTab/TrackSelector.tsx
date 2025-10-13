'use client';

import React from 'react';
import type { AlphaTabApi, Track } from '@/lib/alphaTab/types';

export interface TrackSelectorProps {
    api: AlphaTabApi | null;
    tracks: Track[];
    selectedTrack: number;
    onTrackChange: (trackIndex: number) => void;
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
    api,
    tracks,
    selectedTrack,
    onTrackChange
}) => {
    const handleTrackChange = (trackIndex: number) => {
        if (api?.score) {
            console.log(`Switching to track ${trackIndex}: ${tracks[trackIndex]?.name}`);
            api.renderTracks([api.score.tracks[trackIndex]]);
            onTrackChange(trackIndex);
        }
    };

    if (tracks.length <= 1) {
        return null; // Don't show selector for single-track songs
    }

    return (
        <div className="bg-gray-800/80 rounded-xl p-6 border border-green-500/30">
            <h2 className="text-2xl font-bold text-green-500 mb-4">Select Track</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tracks.map((track) => (
                    <button
                        key={track.index}
                        onClick={() => handleTrackChange(track.index)}
                        className={`p-4 rounded-lg border transition-all text-left ${selectedTrack === track.index
                                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                            }`}
                    >
                        <div className="font-bold text-lg">{track.name}</div>
                        <div className="text-sm text-gray-400 mt-1">Track {track.index + 1}</div>
                    </button>
                ))}
            </div>
        </div>
    );
};