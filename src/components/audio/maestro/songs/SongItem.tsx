'use client';

/**
 * SongItem.tsx - Individual Song Card
 * November 21st, 2025 | Fixed March 14th, 2026
 *
 * Fix: Playlist → ClientPlaylist (Playlist is DB row, has no songIds)
 */

import React, { useState, useRef, useEffect } from 'react';
import { SongItem, ClientPlaylist, getDifficultyLabel, getDifficultyColor } from '@/lib/song-data';

export interface SongItemProps {
    song: SongItem;
    isCurrent: boolean;
    playlists: ClientPlaylist[];
    onSelect: (songId: string) => void;
    onToggleFavorite: (songId: string) => void;
    onPlaylistAction: (type: 'add' | 'remove', songId: string, playlistId: string) => void;
}

export const SongItemComponent: React.FC<SongItemProps> = ({
    song,
    isCurrent,
    playlists,
    onSelect,
    onToggleFavorite,
    onPlaylistAction,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isMenuOpen]);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite(song.id);
    };

    const handleToggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    const handlePlaylistAction = (type: 'add' | 'remove', playlistId: string) => {
        onPlaylistAction(type, song.id, playlistId);
        setIsMenuOpen(false);
    };

    return (
        <div
            onClick={() => onSelect(song.id)}
            className={`
        flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all duration-200
        ${isCurrent
                    ? 'bg-purple-600/90 shadow-lg ring-2 ring-purple-400'
                    : 'bg-gray-700/50 hover:bg-gray-600/50'
                }
      `}
        >
            <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-bold truncate ${isCurrent ? 'text-white' : 'text-blue-200'}`}>
                    {song.title}
                </h3>
                <p className={`text-sm truncate ${isCurrent ? 'text-purple-200' : 'text-gray-400'}`}>
                    {song.artist}
                    {song.album && <span className="text-gray-500 mx-2">•</span>}
                    {song.album && <span className="italic">{song.album}</span>}
                </p>
            </div>

            <div className="flex items-center gap-2 relative">
                {song.difficulty && (
                    <div className="hidden sm:flex items-center gap-1" title={getDifficultyLabel(song.difficulty)}>
                        {[1, 2, 3, 4, 5].map(level => (
                            <div
                                key={level}
                                className={`w-1.5 h-4 rounded-sm ${level <= (song.difficulty || 0)
                                    ? getDifficultyColor(song.difficulty)
                                    : 'bg-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                )}

                <button
                    onClick={handleToggleFavorite}
                    title={song.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    className={`
            p-2 rounded-full transition-colors
            ${song.isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-white'}
            ${isCurrent ? 'bg-purple-700/50 hover:bg-purple-700' : 'hover:bg-gray-500/50'}
          `}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24"
                        fill={song.isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor" strokeWidth={song.isFavorite ? '0' : '2'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </button>

                <div ref={menuRef} className="relative">
                    <button
                        onClick={handleToggleMenu}
                        title="Add to playlist"
                        className={`
              p-2 rounded-full transition-colors
              ${isCurrent
                                ? 'bg-purple-700/50 hover:bg-purple-700 text-white'
                                : 'bg-gray-600/50 hover:bg-gray-500 text-gray-300'
                            }
            `}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 rounded-lg shadow-2xl border border-gray-600 z-50 overflow-hidden">
                            <div className="p-2 border-b border-gray-700 bg-gray-700/50">
                                <h4 className="text-xs font-semibold text-gray-300 uppercase">Add to Playlist</h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {playlists.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-400 italic">No playlists yet</div>
                                ) : (
                                    playlists.map(playlist => {
                                        const inPlaylist = playlist.songIds.includes(song.id);
                                        return (
                                            <button
                                                key={playlist.id}
                                                onClick={e => { e.stopPropagation(); handlePlaylistAction(inPlaylist ? 'remove' : 'add', playlist.id); }}
                                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-purple-600 transition-colors flex justify-between items-center"
                                            >
                                                <span className="truncate">{playlist.name}</span>
                                                {inPlaylist && <span className="text-xs text-green-400 ml-2">✓ Added</span>}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};