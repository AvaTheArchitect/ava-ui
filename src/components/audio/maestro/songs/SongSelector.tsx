'use client';

/**
 * SongSelector.tsx - Main Song Selection Modal
 * November 21st, 2025 | Fixed March 14th, 2026
 *
 * Fix: Playlist → ClientPlaylist (Playlist is DB row, has no songIds)
 */

import React, { useState, useMemo } from 'react';
import {
    SongSelectorProps,
    ClientPlaylist,
    SongItem,
    getFavoriteSongs,
    searchSongs,
    getPlaylistSongs
} from '@/lib/song-data';
import { SongList } from './SongList';

type TabType = 'favorites' | 'all' | 'playlists';

export const SongSelector: React.FC<SongSelectorProps> = ({
    isOpen,
    onClose,
    songs,
    playlists,
    currentSongId,
    onSongSelect,
    onToggleFavorite,
    onPlaylistAction,
    onCreatePlaylist,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('favorites');
    const [searchQuery, setSearchQuery] = useState('');
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

    const filteredSongs = useMemo(() => searchSongs(songs, searchQuery), [songs, searchQuery]);
    const favoriteSongs = useMemo(() => getFavoriteSongs(filteredSongs), [filteredSongs]);

    const handleCreatePlaylist = () => {
        if (newPlaylistName.trim()) {
            onCreatePlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
        }
    };

    const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);
    const playlistSongs = selectedPlaylist ? getPlaylistSongs(songs, selectedPlaylist) : [];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white">My Tabs</h2>
                    <button onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        title="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 border-b border-gray-700 bg-gray-700/30">
                    <input type="text" placeholder="Search songs and artists..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900/50 text-white px-4 py-3 rounded-lg placeholder-gray-400 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all outline-none"
                    />
                </div>

                <div className="flex border-b border-gray-700 bg-gray-700/20">
                    <TabButton name="Favorites" isActive={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} count={favoriteSongs.length} />
                    <TabButton name="All Songs" isActive={activeTab === 'all'} onClick={() => setActiveTab('all')} count={filteredSongs.length} />
                    <TabButton name="Playlists" isActive={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} count={playlists.length} />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'favorites' && (
                        <SongList songs={favoriteSongs} title="Favorites" currentSongId={currentSongId}
                            playlists={playlists} onSongSelect={onSongSelect} onToggleFavorite={onToggleFavorite}
                            onPlaylistAction={onPlaylistAction}
                            emptyMessage="No favorite songs yet. Click the star to add songs to your favorites!" />
                    )}
                    {activeTab === 'all' && (
                        <SongList songs={filteredSongs} title="All Songs" currentSongId={currentSongId}
                            playlists={playlists} onSongSelect={onSongSelect} onToggleFavorite={onToggleFavorite}
                            onPlaylistAction={onPlaylistAction}
                            emptyMessage="No songs found matching your search." />
                    )}
                    {activeTab === 'playlists' && (
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-purple-400 mb-4">
                                Your Playlists ({playlists.length})
                            </h3>
                            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Create New Playlist</h4>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Playlist name..."
                                        value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleCreatePlaylist()}
                                        className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg placeholder-gray-400 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all outline-none"
                                    />
                                    <button onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()}
                                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                                        Create
                                    </button>
                                </div>
                            </div>

                            {playlists.length === 0 ? (
                                <div className="text-center py-12">
                                    <svg width="64" height="64" viewBox="0 0 24 24" className="mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <p className="text-gray-400 italic">No playlists yet. Create one above!</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {playlists.map((playlist: ClientPlaylist) => (
                                        <button key={playlist.id}
                                            onClick={() => setSelectedPlaylistId(
                                                selectedPlaylistId === playlist.id ? null : playlist.id
                                            )}
                                            className={`w-full text-left p-4 rounded-lg transition-all ${selectedPlaylistId === playlist.id ? 'bg-purple-600 shadow-lg' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-white">{playlist.name}</h4>
                                                    <p className="text-sm text-gray-400">{playlist.songIds.length} songs</p>
                                                </div>
                                                <svg width="20" height="20" viewBox="0 0 24 24"
                                                    className={`transition-transform ${selectedPlaylistId === playlist.id ? 'rotate-180' : ''}`}
                                                    fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                            {selectedPlaylistId === playlist.id && playlistSongs.length > 0 && (
                                                <div className="mt-4 space-y-2 pt-4 border-t border-purple-400/30">
                                                    {playlistSongs.map((song: SongItem) => (
                                                        <div key={song.id}
                                                            onClick={e => { e.stopPropagation(); onSongSelect(song.id); }}
                                                            className="p-3 bg-purple-700/30 rounded-lg hover:bg-purple-700/50 cursor-pointer transition-colors">
                                                            <p className="text-white font-medium">{song.title}</p>
                                                            <p className="text-sm text-purple-200">{song.artist}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ name: string; isActive: boolean; onClick: () => void; count?: number }> = ({ name, isActive, onClick, count }) => (
    <button onClick={onClick}
        className={`px-6 py-3 text-sm font-semibold transition-all relative ${isActive ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
        {name}
        {count !== undefined && (
            <span className={`ml-2 text-xs ${isActive ? 'text-purple-300' : 'text-gray-500'}`}>({count})</span>
        )}
    </button>
);