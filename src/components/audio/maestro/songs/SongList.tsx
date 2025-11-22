'use client';

/**
 * SongList.tsx - Song List Renderer
 * November 21st, 2025
 * 
 * Renders a list of songs using SongItemComponent.
 * Handles empty states and list titles.
 */

import React from 'react';
import { SongItem, Playlist } from '@/lib/song-data';
import { SongItemComponent } from './SongItem';

export interface SongListProps {
    songs: SongItem[];
    title: string;
    currentSongId: string | null;
    playlists: Playlist[];
    onSongSelect: (songId: string) => void;
    onToggleFavorite: (songId: string) => void;
    onPlaylistAction: (type: 'add' | 'remove', songId: string, playlistId: string) => void;
    emptyMessage?: string;
}

export const SongList: React.FC<SongListProps> = ({
    songs,
    title,
    currentSongId,
    playlists,
    onSongSelect,
    onToggleFavorite,
    onPlaylistAction,
    emptyMessage = 'No songs found in this list.',
}) => {
    return (
        <div className="p-6">
            {/* List Header */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-purple-400">
                    {title}
                    <span className="ml-2 text-sm text-gray-400">({songs.length})</span>
                </h3>
            </div>

            {/* Song List or Empty State */}
            {songs.length === 0 ? (
                <div className="text-center py-12">
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        className="mx-auto mb-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-gray-400 italic">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {songs.map(song => (
                        <SongItemComponent
                            key={song.id}
                            song={song}
                            isCurrent={song.id === currentSongId}
                            playlists={playlists}
                            onSelect={onSongSelect}
                            onToggleFavorite={onToggleFavorite}
                            onPlaylistAction={onPlaylistAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};