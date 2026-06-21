'use client';

/**
 * MyTabsPanel.tsx
 * src/components/audio/maestro/tabs/MyTabsPanel.tsx
 * v3.6 — 2026-06-20
 *
 * 🔒 v3 FEATURES (PRESERVED):
 * Panel spec: desktop max 846×750, mobile responsive width/max-height, top:102, centered, z-index:110
 * Padding: 45 top / 28 left / 15 right
 * Backdrop:      var(--overlay-modal)    — globals.css
 * Panel shadow:  var(--shadow-elevation) — globals.css
 *
 * Pure UI component — no Supabase calls.
 * All data arrives via props from page.tsx → songState.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SongItem, ClientPlaylist } from '@/lib/song-data/types';
import {
    getFavoriteSongs,
    filterSongs,
    searchSongs,
    sortSongs,
    getDifficultyLabel,
} from '@/lib/song-data/songLoader';
import { GENRE_OPTIONS } from '@/lib/song-data';
import { TUNINGS } from '@/lib/song-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'favorites' | 'all' | 'playlists';
type SortOption = 'artist' | 'title' | 'date_added' | 'last_played';
type SortDir = 'az' | 'za';
type Instrument = 'any' | 'guitar6' | 'guitar7' | 'guitar12' | 'bass4' | 'bass5' | 'drums';
type Difficulty = 'any' | 1 | 2 | 3;
type Tuning = string;
type PlaylistSort = 'az' | 'za';
type Genre = 'any' | 'rock' | 'metal' | 'blues' | 'country' | 'worship';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MyTabsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    songs: SongItem[];
    playlists?: ClientPlaylist[];
    currentSong: SongItem | null;
    onSongSelect: (songId: string) => void;
    onToggleFavorite?: (songId: string) => void;
    onPlaylistAction?: (type: 'add' | 'remove', songId: string, playlistId: string) => void;
    onCreatePlaylist?: (name: string) => void;
    onRenamePlaylist?: (playlistId: string, newName: string) => void;
    onDeletePlaylist?: (playlistId: string) => void;
    isDarkMode?: boolean;
    onEditMetadata?: (songId: string) => void;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const getTheme = (dark: boolean) => ({
    panelBg: dark ? 'rgb(23,23,23)' : 'rgb(255,255,255)',
    border: dark ? 'rgba(124,58,237,0.3)' : 'rgb(217,217,217)',
    text: dark ? 'rgb(240,240,240)' : 'rgb(50,50,50)',
    textMuted: dark ? 'rgb(148,163,184)' : 'rgb(130,130,130)',
    inputBg: dark ? 'rgb(37,37,41)' : 'rgb(235,235,235)',
    inputBorder: dark ? 'rgb(55,65,81)' : 'rgb(217,217,217)',
    rowHover: dark ? 'rgba(147,51,234,0.08)' : 'rgb(245,245,245)',
    rowActive: dark ? 'rgba(147,51,234,0.18)' : 'rgb(235,235,235)',
    tabContainerBg: dark ? 'rgb(37,37,41)' : 'rgb(235,235,235)',
    tabInactiveText: dark ? 'rgb(148,163,184)' : 'rgb(100,100,100)',
    dropdownBg: dark ? 'rgb(30,30,34)' : 'rgb(255,255,255)',
    dropdownShadow: 'rgba(0,0,0,0.18) 0px 8px 20px 0px',
    filterBtnBg: dark ? 'rgb(37,37,41)' : 'rgb(255,255,255)',
    filterBtnBorder: dark ? 'rgb(55,65,81)' : 'rgb(217,217,217)',
    favStarFilled: 'rgb(234,179,8)',
});

// ─── Local filter option arrays ───────────────────────────────────────────────

const MY_TABS_GENRE_OPTIONS: { label: string; value: string }[] = [
    { label: 'Any genre', value: 'any' },
    ...GENRE_OPTIONS,
];

// ─── Data ─────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
    { label: 'By artist', value: 'artist' },
    { label: 'By title', value: 'title' },
    { label: 'By date added', value: 'date_added' },
    { label: 'By last played', value: 'last_played' },
];

const DIFFICULTY_OPTIONS: { label: string; value: string | number }[] = [
    { label: 'Any difficulty', value: 'any' },
    { label: 'Beginner', value: 1 },
    { label: 'Intermediate', value: 2 },
    { label: 'Advanced', value: 3 },
];

const DIFF_TO_DOTS: Record<number, number> = { 1: 2, 2: 4, 3: 6 };

const FILTER_RESPONSIVE_CSS = `@media(max-width:600px){.mytabs-filter-root{display:block!important;position:static!important}.mytabs-filter-btn{width:100%!important;min-width:0!important;padding-left:6px!important;padding-right:6px!important}.mytabs-filter-label{display:none!important}.mytabs-filter-row{padding-left:4px!important;padding-right:4px!important;gap:6px!important;flex-wrap:nowrap!important;position:relative}.mytabs-filter-menu{left:8px!important;right:8px!important;width:auto!important;max-width:none!important}}@media(max-width:764px){.mytabs-panel{top:calc(64px + env(safe-area-inset-top))!important;max-height:calc(100dvh - 64px - env(safe-area-inset-top))!important;}}`;
const DOT_PURPLE = 'rgb(147,51,234)';
const DOT_EMPTY = 'rgb(188,188,189)';
const RED = 'rgb(220,38,38)';
const GREEN = '#1EB136';

// ─── AZToggle ─────────────────────────────────────────────────────────────────

const AZToggle: React.FC<{
    value: SortDir | PlaylistSort;
    onChange: (v: 'az' | 'za') => void;
    theme: ReturnType<typeof getTheme>;
}> = ({ value, onChange, theme: th }) => (
    <button
        onClick={() => onChange(value === 'az' ? 'za' : 'az')}
        style={{
            display: 'flex', alignItems: 'center', gap: 4,
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700, color: th.textMuted,
            fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
            padding: 0,
        }}
    >
        {value === 'az' ? 'A-Z' : 'Z-A'}
        <svg width="11" height="7" viewBox="0 0 13 7" fill={th.textMuted}
            style={{ transform: value === 'za' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
            <path fillRule="evenodd" clipRule="evenodd"
                d="M.744.788A1 1 0 0 1 2.157.721l4.827 4.388L11.812.721a1 1 0 0 1 1.345 1.48l-5.5 5a1 1 0 0 1-1.345 0l-5.5-5A1 1 0 0 1 .744.788" />
        </svg>
    </button>
);

// ─── DifficultyDots ───────────────────────────────────────────────────────────

const DifficultyDots: React.FC<{ difficulty?: number }> = ({ difficulty }) => {
    const [hovered, setHovered] = useState(false);
    if (difficulty == null) return null;
    const filled = DIFF_TO_DOTS[difficulty] ?? 0;
    const label = getDifficultyLabel(difficulty);
    const gradients = Array.from({ length: 8 }, (_, i) =>
        `radial-gradient(circle farthest-side, ${i < filled ? DOT_PURPLE : DOT_EMPTY} 70%, transparent)`
    ).join(', ');
    const positions = Array.from({ length: 8 }, (_, i) => `${i * 6}px 0px`).join(', ');
    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    width: 46, height: 4, cursor: 'pointer',
                    backgroundImage: gradients,
                    backgroundPosition: positions,
                    backgroundSize: '4px 4px',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            {hovered && (
                <div style={{
                    position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                    padding: '4px 8px', background: 'rgba(20,20,20,0.92)', color: 'rgb(240,240,240)',
                    fontSize: 11, whiteSpace: 'nowrap', borderRadius: 4,
                    pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}>
                    {label}
                </div>
            )}
        </div>
    );
};

// ─── SongRowPopup ─────────────────────────────────────────────────────────────

const SongRowPopup: React.FC<{
    song: SongItem;
    playlists: ClientPlaylist[];
    theme: ReturnType<typeof getTheme>;
    anchorRect: DOMRect | null;
    onAddToPlaylist?: (songId: string, playlistId: string) => void;
    onRemoveFavorite?: (songId: string) => void;
    onClose: () => void;
}> = ({ song, playlists, theme: th, anchorRect, onAddToPlaylist, onRemoveFavorite, onClose }) => {
    const [trashHovered, setTrashHovered] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    const fixedStyle: React.CSSProperties = anchorRect
        ? {
            position: 'fixed' as const,
            right: window.innerWidth - anchorRect.right,
            bottom: window.innerHeight - anchorRect.top + 6,
        }
        : { position: 'fixed' as const, right: 16, bottom: 100 };

    return (
        <div ref={ref} style={{
            ...fixedStyle,
            width: 200, zIndex: 9999,
            background: th.dropdownBg, borderRadius: 6,
            boxShadow: th.dropdownShadow, border: `1px solid ${th.border}`,
            overflow: 'hidden',
        }}>
            <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${th.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.textMuted, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Add to playlist:
                </div>
                {playlists.length === 0 ? (
                    <div style={{ fontSize: 12, color: th.textMuted, padding: '2px 0 6px' }}>No playlists yet</div>
                ) : playlists.map(pl => (
                    <button key={pl.id}
                        onClick={() => { onAddToPlaylist?.(song.id, pl.id); onClose(); }}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '6px 0', border: 'none', background: 'none',
                            fontSize: 13, color: th.text, cursor: 'pointer',
                            fontFamily: 'inherit', fontWeight: 300,
                        }}
                    >
                        {pl.name}
                    </button>
                ))}
            </div>
            <button
                onMouseEnter={() => setTrashHovered(true)}
                onMouseLeave={() => setTrashHovered(false)}
                onClick={() => { onRemoveFavorite?.(song.id); onClose(); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 14px',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 300,
                    background: trashHovered ? RED : 'transparent',
                    color: trashHovered ? 'white' : th.text,
                    transition: 'background 0.15s ease, color 0.15s ease',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Remove from favorites
            </button>
        </div>
    );
};

// ─── TabButton ────────────────────────────────────────────────────────────────

const TabButton: React.FC<{
    active: boolean;
    theme: ReturnType<typeof getTheme>;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, theme: th, onClick, children }) => {
    const [hovered, setHovered] = useState(false);
    const color = active ? 'rgb(255,255,255)' : hovered ? DOT_PURPLE : th.tabInactiveText;
    return (
        <button onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1, height: 28, minWidth: 55,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, padding: '0 10px',
                border: 'none', borderRadius: 7, background: 'transparent',
                color, fontSize: 13, fontWeight: active ? 500 : 300,
                fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
                cursor: 'pointer', transition: 'color 0.25s ease',
                position: 'relative', zIndex: 1,
            }}
        >
            {children}
        </button>
    );
};

// ─── FilterDropdown ───────────────────────────────────────────────────────────

const FilterDropdown: React.FC<{
    icon: React.ReactNode;
    options: { label: string; value: string | number }[];
    value: string | number;
    onChange: (v: string | number) => void;
    theme: ReturnType<typeof getTheme>;
    tooltip?: string;
    header?: React.ReactNode;
    topRow?: React.ReactNode;
    listMaxHeight?: number;
    align?: 'left' | 'right';
    menuWidth?: number | string;
    formatSelectedLabel?: (label: string) => string;
}> = ({ icon, options, value, onChange, theme: th, tooltip, header, topRow, listMaxHeight = 320, align = 'left', menuWidth = 260, formatSelectedLabel }) => {
    const [open, setOpen] = useState(false);
    const [showTip, setShowTip] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const rawSelectedLabel = options.find(o => o.value === value)?.label ?? '';
    const selectedLabel = formatSelectedLabel ? formatSelectedLabel(rawSelectedLabel) : rawSelectedLabel;
    const showLabel = value !== 'any' && value !== '';

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="mytabs-filter-root" style={{ position: 'relative', display: 'inline-block' }}>
            {showTip && !open && tooltip && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: '50%',
                    transform: 'translateX(-50%)', marginBottom: 6,
                    padding: '4px 8px',
                    background: 'rgba(20,20,20,0.92)', color: 'rgb(240,240,240)',
                    fontSize: 11, whiteSpace: 'nowrap', borderRadius: 4,
                    pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 400,
                }}>
                    {tooltip}
                </div>
            )}
            <button
                className="mytabs-filter-btn"
                onClick={() => { setOpen(p => !p); setShowTip(false); }}
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 40, padding: '0 10px', borderRadius: 4,
                    border: `1px solid ${th.filterBtnBorder}`,
                    background: th.filterBtnBg, color: th.text,
                    cursor: 'pointer', fontSize: 13, fontWeight: 300,
                    fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
                    minWidth: 0,
                }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                    {icon}
                    {showLabel && (
                        <span className="mytabs-filter-label" style={{
                            display: 'block',
                            marginTop: 2,
                            fontSize: 10,
                            fontWeight: 600,
                            lineHeight: '11.5px',
                            color: 'rgb(115,115,115)',
                            maxWidth: 103,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
                        }}>
                            {selectedLabel}
                        </span>
                    )}
                </span>
                <svg width="13" height="7" viewBox="0 0 13 7" fill={th.textMuted}
                    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}>
                    <path fillRule="evenodd" clipRule="evenodd"
                        d="M.744.788A1 1 0 0 1 2.157.721l4.827 4.388L11.812.721a1 1 0 0 1 1.345 1.48l-5.5 5a1 1 0 0 1-1.345 0l-5.5-5A1 1 0 0 1 .744.788" />
                </svg>
            </button>
            {open && (
                <div className="mytabs-filter-menu" style={{
                    position: 'absolute', top: '100%',
                    ...(align === 'right' ? { right: 0 } : { left: 0 }),
                    marginTop: 4,
                    width: menuWidth, maxWidth: 'calc(100vw - 32px)',
                    background: th.dropdownBg, borderRadius: 4,
                    boxShadow: th.dropdownShadow, border: `1px solid ${th.border}`,
                    zIndex: 200, overflow: 'hidden',
                }}>
                    {header && (
                        <div style={{ padding: '10px 14px 6px', borderBottom: `1px solid ${th.border}` }}>
                            {header}
                        </div>
                    )}
                    <ul role="listbox" style={{
                        listStyle: 'none', margin: 0, padding: '4px 0',
                        maxHeight: listMaxHeight, overflowY: 'auto', overscrollBehavior: 'contain',
                    }}>
                        {topRow && (
                            <li role="option" aria-disabled="true" aria-selected={false} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '9px 14px', cursor: 'not-allowed',
                                fontSize: 13, fontWeight: 500,
                                fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
                                color: th.textMuted, opacity: 0.5,
                            }}>
                                {topRow}
                            </li>
                        )}
                        {options.map(opt => {
                            const sel = opt.value === value;
                            return (
                                <li key={String(opt.value)} role="option" aria-selected={sel}
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLLIElement).style.background = th.rowHover; }}
                                    onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLLIElement).style.background = 'transparent'; }}
                                    style={{
                                        padding: '9px 14px', cursor: 'pointer',
                                        fontSize: 13, fontWeight: sel ? 500 : 300,
                                        fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
                                        background: sel ? DOT_PURPLE : 'transparent',
                                        color: sel ? 'white' : th.text,
                                    }}
                                >
                                    {opt.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSort = () => (
    <svg width="21" height="18" viewBox="0 0 21 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="5" r="3" />
        <path d="M1 17c0-3.314 2.686-6 6-6" />
        <path d="M14 3v8M17 3h-3M17 8h-3" strokeLinecap="round" />
        <circle cx="17" cy="11" r="2" fill="currentColor" stroke="none" />
    </svg>
);
const IconInstrument = () => (
    <svg width="21" height="18" viewBox="0 0 21 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2l-8 8a3 3 0 0 0 4.2 4.2l8-8" strokeLinecap="round" />
        <circle cx="7.5" cy="12.5" r="2" />
        <line x1="15" y1="1" x2="18" y2="4" strokeLinecap="round" />
    </svg>
);
const IconTuning = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="9" y1="2" x2="9" y2="14" strokeLinecap="round" />
        <path d="M6 5c0-1.657 1.343-3 3-3s3 1.343 3 3" />
        <circle cx="9" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);
const IconDifficulty = () => (
    <svg width="28" height="15" viewBox="0 0 28 15" fill="currentColor">
        <rect x="0" y="9" width="6" height="6" rx="1" opacity="1" />
        <rect x="8" y="5" width="6" height="10" rx="1" opacity="0.6" />
        <rect x="16" y="1" width="6" height="14" rx="1" opacity="0.35" />
    </svg>
);
const IconGenre = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h12M3 9h8M3 13h5" />
        <circle cx="14" cy="13" r="2" />
        <path d="M14 11V7" />
    </svg>
);
const IconStar = ({ filled, color }: { filled: boolean; color: string }) => (
    <svg width="14" height="14" viewBox="0 0 24 24"
        fill={filled ? color : 'none'} stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);
const IconPencil = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const IconTrash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const MyTabsPanel: React.FC<MyTabsPanelProps> = ({
    isOpen,
    onClose,
    songs,
    playlists = [],
    currentSong,
    onSongSelect,
    onToggleFavorite,
    onPlaylistAction,
    onCreatePlaylist,
    onRenamePlaylist,
    onDeletePlaylist,
    isDarkMode = false,
    onEditMetadata,
}) => {
    const t = getTheme(isDarkMode);

    const [category, setCategory] = useState<Category>('all');
    const [sort, setSort] = useState<SortOption>('title');
    const [sortDir, setSortDir] = useState<SortDir>('az');
    const [instrument, setInstrument] = useState<Instrument>('any');
    const [tuning, setTuning] = useState<Tuning>('any');
    const [difficulty, setDifficulty] = useState<Difficulty>('any');
    const [genre, setGenre] = useState<Genre>('any');
    const [search, setSearch] = useState('');
    const [openPopupSongId, setOpenPopupSongId] = useState<string | null>(null);
    const [popupAnchorRect, setPopupAnchorRect] = useState<DOMRect | null>(null);
    const [playlistSort, setPlaylistSort] = useState<PlaylistSort>('az');
    const [creatingPlaylist, setCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [hoveredTrashId, setHoveredTrashId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [hoveredPlaylistId, setHoveredPlaylistId] = useState<string | null>(null);

    const handleCategoryChange = useCallback((cat: Category) => {
        setCategory(cat);
        setConfirmDeleteId(null);
        setRenamingId(null);
        setRenameValue('');
        setOpenPopupSongId(null);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const displayedSongs = useMemo(() => {
        let list = category === 'favorites' ? getFavoriteSongs(songs) : [...songs];
        list = searchSongs(list, search);
        list = filterSongs(list, { instrument: 'any', tuning, difficulty, genre });
        if (sort === 'title' || sort === 'artist') list = sortSongs(list, sort);
        if (sortDir === 'za') list = [...list].reverse();
        return list;
    }, [songs, category, search, instrument, tuning, difficulty, genre, sort, sortDir]);

    const sortedPlaylists = useMemo(() =>
        [...playlists].sort((a, b) =>
            playlistSort === 'az' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        ), [playlists, playlistSort]);

    useEffect(() => {
        if (category !== 'playlists') return;
        const stillExists = playlists.some(p => p.id === selectedPlaylistId);
        if (!stillExists) setSelectedPlaylistId(sortedPlaylists[0]?.id ?? null);
    }, [category, playlists, sortedPlaylists, selectedPlaylistId]);

    const selectedPlaylist = useMemo(() =>
        playlists.find(p => p.id === selectedPlaylistId) ?? null,
        [playlists, selectedPlaylistId]
    );

    const selectedPlaylistSongs = useMemo(() => {
        if (!selectedPlaylist) return [];
        let list = songs.filter(s => selectedPlaylist.songIds.includes(s.id));
        if (sort === 'title' || sort === 'artist') list = sortSongs(list, sort);
        if (playlistSort === 'za') list = [...list].reverse();
        return list;
    }, [songs, selectedPlaylist, sort, playlistSort]);

    const plFiltersDisabled = !selectedPlaylist || selectedPlaylist.songIds.length === 0;

    const handleFavClick = useCallback((e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        onToggleFavorite?.(songId);
    }, [onToggleFavorite]);

    const commitRename = useCallback((id: string) => {
        const trimmed = renameValue.trim();
        if (trimmed) onRenamePlaylist?.(id, trimmed);
        setRenamingId(null);
        setRenameValue('');
    }, [renameValue, onRenamePlaylist]);

    const handleOpenPopup = useCallback((e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        if (openPopupSongId === songId) {
            setOpenPopupSongId(null);
            setPopupAnchorRect(null);
        } else {
            setOpenPopupSongId(songId);
            setPopupAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
        }
    }, [openPopupSongId]);

    const handleEditMetadata = useCallback((e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        onClose();
        onEditMetadata?.(songId);
    }, [onClose, onEditMetadata]);

    const TABS: { key: Category; label: string }[] = [
        { key: 'favorites', label: `Favorites (${getFavoriteSongs(songs).length})` },
        { key: 'all', label: `All Songs (${songs.length})` },
        { key: 'playlists', label: `Playlists (${playlists.length})` },
    ];
    const activeIdx = TABS.findIndex(tab => tab.key === category);

    if (!isOpen) return null;

    const playlistFilterDropdowns = (
        <>
            <FilterDropdown icon={<IconSort />} value={sort} theme={t} tooltip="Sort song list"
                onChange={v => setSort(v as SortOption)} options={SORT_OPTIONS} />
            <FilterDropdown icon={<IconInstrument />} value={instrument} theme={t} tooltip="Filter by instrument"
                onChange={v => setInstrument(v as Instrument)}
                options={[
                    { label: 'Any instruments', value: 'any' },
                    { label: 'Guitar (6-string)', value: 'guitar6' },
                    { label: 'Guitar (7-string)', value: 'guitar7' },
                    { label: 'Guitar (12-string)', value: 'guitar12' },
                    { label: 'Bass (4-string)', value: 'bass4' },
                    { label: 'Bass (5-string)', value: 'bass5' },
                    { label: 'Drums', value: 'drums' },
                ]}
            />
            <FilterDropdown icon={<IconTuning />} value={tuning} theme={t} tooltip="Filter by tuning"
                onChange={v => setTuning(String(v))} listMaxHeight={280}
                topRow={<>Add custom tuning <span style={{ fontSize: 18, lineHeight: 1 }}>+</span></>}
                options={TUNINGS}
            />
            <FilterDropdown icon={<IconDifficulty />} value={difficulty} theme={t} tooltip="Filter by difficulty"
                onChange={v => setDifficulty(v === 'any' ? 'any' : Number(v) as Difficulty)}
                options={DIFFICULTY_OPTIONS}
            />
        </>
    );

    return (
        <>
            <style>{FILTER_RESPONSIVE_CSS}</style>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 109,
                background: 'var(--overlay-modal)',
            }} />

            {/* Panel */}
            <div className="mytabs-panel" style={{
                position: 'fixed', top: 102, left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 110,
                width: 'min(846px, calc(100vw - 24px))',
                maxHeight: 'calc(100dvh - 110px)',
                background: t.panelBg, borderRadius: 4,
                boxShadow: 'var(--shadow-elevation)',
                paddingTop: 45, paddingLeft: 28, paddingRight: 15,
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))' as React.CSSProperties['paddingBottom'],
                boxSizing: 'border-box',
                fontFamily: 'songsterr, -apple-system, system-ui, "system-ui", Arial, sans-serif',
                fontWeight: 300, lineHeight: '18.4px', color: t.text,
                colorScheme: isDarkMode ? 'dark' : 'light',
                overscrollBehavior: 'contain',
                display: 'flex', flexDirection: 'column',
            }}>

                {/* ── Search header ── */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 200,
                    width: '100%', minHeight: 72, background: t.panelBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12,
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: t.text, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        My tabs
                    </h2>
                    <input type="search" placeholder="Search favorites"
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            flex: 1, minWidth: 0, maxWidth: 609, height: 44, padding: '0 18px', borderRadius: 22,
                            border: `1px solid ${t.inputBorder}`,
                            background: t.inputBg, color: t.text,
                            fontSize: 14, fontWeight: 300, fontFamily: 'inherit', outline: 'none',
                        }}
                    />
                </div>

                {/* ── Category tabs: sliding purple pill ── */}
                <div style={{ width: '100%', height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 8, boxSizing: 'border-box' }}>
                    <div style={{
                        position: 'relative', width: '100%', height: 36,
                        background: t.tabContainerBg, borderRadius: 7,
                        display: 'flex', alignItems: 'center',
                        padding: 2, boxSizing: 'border-box',
                    }}>
                        <div style={{
                            position: 'absolute', top: 2, left: 2,
                            width: 'calc(33.3333% - 1.33px)', height: 'calc(100% - 4px)',
                            background: DOT_PURPLE, borderRadius: 6,
                            transform: `translateX(calc(${activeIdx * 100}% + ${activeIdx * 1.33}px))`,
                            transition: 'transform 0.25s ease',
                            pointerEvents: 'none', zIndex: 0,
                        }} />
                        {TABS.map(tab => (
                            <TabButton key={tab.key} active={tab.key === category} theme={t}
                                onClick={() => handleCategoryChange(tab.key)}>
                                {tab.label}
                            </TabButton>
                        ))}
                    </div>
                </div>

                {/* ── Filter row — Favorites / All Songs only ── */}
                {category !== 'playlists' && (
                    <div style={{ width: '100%', flexShrink: 0, paddingTop: 15 }}>
                        <div className="mytabs-filter-row" style={{
                            width: '100%',
                            paddingLeft: 27, paddingRight: 25, boxSizing: 'border-box',
                            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 15,
                        }}>
                            <div style={{ flex: '0 1 auto', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FilterDropdown icon={<IconSort />} value={sort} theme={t} tooltip="Sort song list"
                                    onChange={v => setSort(v as SortOption)} options={SORT_OPTIONS} />
                            </div>
                            <div style={{ flex: '1 1 44px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FilterDropdown icon={<IconGenre />} value={genre} theme={t} tooltip="Filter by genre"
                                    onChange={v => setGenre(v as Genre)} options={MY_TABS_GENRE_OPTIONS} />
                            </div>
                            <div style={{ flex: '1 1 44px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FilterDropdown icon={<IconInstrument />} value={instrument} theme={t} tooltip="Filter by instrument"
                                    onChange={v => setInstrument(v as Instrument)}
                                    options={[
                                        { label: 'Any instruments', value: 'any' },
                                        { label: 'Guitar', value: 'guitar' },
                                        { label: 'Bass', value: 'bass' },
                                        { label: 'Drums', value: 'drums' },
                                    ]}
                                />
                            </div>
                            <div style={{ flex: '1 1 44px', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FilterDropdown icon={<IconTuning />} value={tuning} theme={t} tooltip="Filter by tuning"
                                    onChange={v => setTuning(String(v))} listMaxHeight={380} align="right" menuWidth={340}
                                    topRow={<>Add custom tuning <span style={{ fontSize: 18, lineHeight: 1 }}>+</span></>}
                                    options={TUNINGS}
                                    formatSelectedLabel={(label) => label.split('(')[0].trim()}
                                />
                            </div>
                            <div style={{ flex: '0 1 auto', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FilterDropdown icon={<IconDifficulty />} value={difficulty} theme={t} tooltip="Filter by difficulty"
                                    onChange={v => setDifficulty(v === 'any' ? 'any' : Number(v) as Difficulty)}
                                    options={DIFFICULTY_OPTIONS} align="right"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── A-Z sort row ── */}
                {category !== 'playlists' && (
                    <div style={{ width: '100%', height: 55, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 6, boxSizing: 'border-box' }}>
                        <div style={{ width: 194 }}>
                            <AZToggle value={sortDir} onChange={setSortDir} theme={t} />
                        </div>
                    </div>
                )}

                {/* ── Song list ── */}
                {category !== 'playlists' && (
                    <ul style={{
                        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
                        listStyle: 'none', margin: 0, padding: '8px 0',
                    }}>
                        {displayedSongs.length === 0 ? (
                            <li style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                {category === 'favorites' && search === '' && instrument === 'any' && tuning === 'any' && difficulty === 'any' && genre === 'any' ? (
                                    <div style={{ fontSize: 14, color: t.textMuted, textAlign: 'center' }}>
                                        No favorites yet — click the ★ on any song to save it.
                                    </div>
                                ) : (
                                    <>
                                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none"
                                            stroke={t.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ opacity: 0.55, marginBottom: 4 }}>
                                            <circle cx="30" cy="30" r="22" />
                                            <line x1="46" y1="46" x2="64" y2="64" />
                                            <circle cx="23" cy="26" r="2" fill={t.textMuted} stroke="none" />
                                            <circle cx="37" cy="26" r="2" fill={t.textMuted} stroke="none" />
                                            <path d="M23 38 Q30 33 37 38" />
                                        </svg>
                                        <div style={{ fontSize: 17, fontWeight: 600, color: t.text }}>Tabs not found</div>
                                        <button
                                            onClick={() => {
                                                setSearch('');
                                                setInstrument('any');
                                                setTuning('any');
                                                setDifficulty('any');
                                                setGenre('any');
                                            }}
                                            style={{ marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit' }}
                                        >
                                            <span style={{ color: GREEN, fontWeight: 500 }}>Reset filter</span>
                                            <span style={{ color: t.textMuted }}>
                                                {' '}to see {category === 'favorites' ? getFavoriteSongs(songs).length : songs.length} songs
                                            </span>
                                        </button>
                                    </>
                                )}
                            </li>
                        ) : displayedSongs.map(song => {
                            const isActive = currentSong?.id === song.id;
                            return (
                                <li key={song.id}
                                    onClick={() => { onSongSelect(song.id); onClose(); }}
                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLLIElement).style.background = t.rowHover; }}
                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLLIElement).style.background = 'transparent'; }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 14px 10px 6px', borderRadius: 6,
                                        cursor: 'pointer', marginRight: 8,
                                        background: isActive ? t.rowActive : 'transparent',
                                        transition: 'background 0.12s ease',
                                    }}
                                >
                                    <button onClick={e => handleFavClick(e, song.id)}
                                        title={song.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                        style={{ flexShrink: 0, padding: 2, border: 'none', background: 'none', cursor: 'pointer' }}>
                                        <IconStar filled={song.isFavorite} color={song.isFavorite ? t.favStarFilled : t.textMuted} />
                                    </button>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 16, fontWeight: isActive ? 500 : 300, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {song.title}
                                        </div>
                                        <div style={{ fontSize: 15, color: t.textMuted, marginTop: 2 }}>
                                            {song.artist}
                                            {song.difficulty != null && (
                                                <span style={{ marginLeft: 8, opacity: 0.7 }}>· {getDifficultyLabel(song.difficulty)}</span>
                                            )}
                                        </div>
                                    </div>
                                    {!['bass', 'drums'].includes(instrument) && <DifficultyDots difficulty={song.difficulty} />}
                                    <button
                                        onClick={e => handleEditMetadata(e, song.id)}
                                        title="Edit metadata"
                                        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}
                                    >
                                        <IconPencil />
                                    </button>
                                    <button
                                        onClick={e => handleOpenPopup(e, song.id)}
                                        title="Add to playlist / remove"
                                        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 18, lineHeight: 1, fontFamily: 'inherit' }}
                                    >
                                        +
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* ── SongRowPopup ── */}
                {openPopupSongId && category !== 'playlists' && (() => {
                    const song = songs.find(s => s.id === openPopupSongId);
                    if (!song) return null;
                    return (
                        <SongRowPopup
                            song={song} playlists={playlists} theme={t} anchorRect={popupAnchorRect}
                            onAddToPlaylist={(sId, pId) => onPlaylistAction?.('add', sId, pId)}
                            onRemoveFavorite={id => onToggleFavorite?.(id)}
                            onClose={() => { setOpenPopupSongId(null); setPopupAnchorRect(null); }}
                        />
                    );
                })()}

                {/* ══ Playlists tab ══ */}
                {category === 'playlists' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

                        <div style={{ display: 'flex', alignItems: 'center', columnGap: 40, height: 55, flexShrink: 0 }}>
                            <div style={{ width: 194, flexShrink: 0 }}>
                                {onCreatePlaylist && (
                                    <button
                                        onClick={() => { setCreatingPlaylist(true); setNewPlaylistName(''); }}
                                        style={{ width: '100%', height: 32, padding: '0 14px', borderRadius: 6, border: 'none', background: GREEN, color: 'white', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
                                    >
                                        Create playlist
                                    </button>
                                )}
                            </div>
                            <div style={{
                                flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                opacity: plFiltersDisabled ? 0.35 : 1,
                                pointerEvents: plFiltersDisabled ? 'none' : 'auto',
                                transition: 'opacity 0.2s ease',
                            }}>
                                {playlistFilterDropdowns}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flex: 1, columnGap: 40, overflow: 'hidden', minHeight: 0 }}>

                            {/* Left: playlist list */}
                            <div style={{ width: 194, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div style={{ padding: '0 0 10px', flexShrink: 0 }}>
                                    <AZToggle value={playlistSort} onChange={setPlaylistSort} theme={t} />
                                </div>

                                {creatingPlaylist && (
                                    <input
                                        autoFocus type="text" placeholder="New playlist" maxLength={30}
                                        value={newPlaylistName}
                                        onChange={e => setNewPlaylistName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newPlaylistName.trim()) { onCreatePlaylist?.(newPlaylistName.trim()); setCreatingPlaylist(false); setNewPlaylistName(''); }
                                            if (e.key === 'Escape') { setCreatingPlaylist(false); setNewPlaylistName(''); }
                                        }}
                                        onBlur={() => { if (newPlaylistName.trim()) onCreatePlaylist?.(newPlaylistName.trim()); setCreatingPlaylist(false); setNewPlaylistName(''); }}
                                        style={{ width: '100%', height: 30, padding: '0 8px', boxSizing: 'border-box', border: `1px solid ${t.inputBorder}`, borderBottom: `2px solid ${DOT_PURPLE}`, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: 'inherit', fontWeight: 300, outline: 'none', borderRadius: 4, marginBottom: 4, flexShrink: 0 }}
                                    />
                                )}

                                <ul style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', listStyle: 'none', margin: 0, padding: 0, textAlign: 'left' }}>
                                    {sortedPlaylists.length === 0 && !creatingPlaylist ? (
                                        <li style={{ fontSize: 13, color: t.textMuted, padding: '8px 0' }}>No playlists yet</li>
                                    ) : sortedPlaylists.map(pl => {
                                        const isSelected = selectedPlaylistId === pl.id;
                                        const pendingDelete = confirmDeleteId === pl.id;
                                        const trashHot = hoveredTrashId === pl.id || pendingDelete;
                                        const isRenaming = renamingId === pl.id;
                                        const showIcons = hoveredPlaylistId === pl.id || pendingDelete;

                                        return (
                                            <li key={pl.id}
                                                onMouseEnter={() => setHoveredPlaylistId(pl.id)}
                                                onMouseLeave={() => setHoveredPlaylistId(null)}
                                                style={{ display: 'flex', alignItems: 'center', minHeight: 30, padding: '4px 0', background: pendingDelete ? 'rgba(220,38,38,0.06)' : 'transparent', borderRadius: 4, transition: 'background 0.15s ease' }}
                                            >
                                                {isRenaming ? (
                                                    <input autoFocus type="text" maxLength={30} value={renameValue}
                                                        onChange={e => setRenameValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') commitRename(pl.id); if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); } }}
                                                        onBlur={() => commitRename(pl.id)}
                                                        style={{ flex: 1, height: 26, padding: '0 6px', boxSizing: 'border-box', border: `1px solid ${t.inputBorder}`, borderBottom: `2px solid ${DOT_PURPLE}`, background: t.inputBg, color: t.text, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, outline: 'none', borderRadius: 4 }}
                                                    />
                                                ) : (
                                                    <>
                                                        <span
                                                            onClick={() => setSelectedPlaylistId(pl.id)}
                                                            style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: isSelected ? 500 : 300, color: pendingDelete ? RED : isSelected ? GREEN : t.text, cursor: 'pointer', transition: 'color 0.15s ease', paddingRight: 2 }}
                                                        >
                                                            {pl.name}
                                                        </span>
                                                        {showIcons && (
                                                            <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                                                {!pendingDelete && (
                                                                    <button title="Rename playlist"
                                                                        onClick={() => { setRenamingId(pl.id); setRenameValue(pl.name); setConfirmDeleteId(null); }}
                                                                        style={{ padding: 3, border: 'none', borderRadius: 3, cursor: 'pointer', background: 'none', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <IconPencil />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    title={pendingDelete ? 'Click again to confirm delete' : 'Delete playlist'}
                                                                    onMouseEnter={() => setHoveredTrashId(pl.id)}
                                                                    onMouseLeave={() => setHoveredTrashId(null)}
                                                                    onClick={() => {
                                                                        if (pendingDelete) {
                                                                            onDeletePlaylist?.(pl.id);
                                                                            setConfirmDeleteId(null);
                                                                            if (selectedPlaylistId === pl.id) setSelectedPlaylistId(sortedPlaylists.find(p => p.id !== pl.id)?.id ?? null);
                                                                        } else { setConfirmDeleteId(pl.id); }
                                                                    }}
                                                                    style={{ padding: 3, border: 'none', borderRadius: 3, cursor: 'pointer', background: trashHot ? RED : 'none', color: trashHot ? 'white' : t.textMuted, transition: 'background 0.15s ease, color 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <IconTrash />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Right: selected playlist songs */}
                            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', minHeight: 0 }}>
                                {playlists.length === 0 && !creatingPlaylist ? (
                                    <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <svg width="64" height="72" viewBox="0 0 64 72" fill="none" stroke={t.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8, opacity: 0.6 }}>
                                            <line x1="38" y1="4" x2="38" y2="8" /><line x1="36" y1="6" x2="40" y2="6" />
                                            <line x1="46" y1="1" x2="47" y2="4" /><line x1="44" y1="2" x2="48" y2="3" />
                                            <path d="M16 20 L20 58 Q20 62 24 62 L40 62 Q44 62 44 58 L48 20 Z" />
                                            <line x1="13" y1="20" x2="51" y2="20" strokeWidth="2.5" />
                                            <path d="M24 20 Q24 14 32 14 Q40 14 40 20" />
                                        </svg>
                                        <div style={{ fontSize: 18, fontWeight: 600, color: t.text }}>You have no playlists</div>
                                        <div style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', lineHeight: '20px' }}>
                                            Create a playlist and go to{' '}
                                            <button onClick={() => handleCategoryChange('favorites')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DOT_PURPLE, fontSize: 13, fontFamily: 'inherit' }}>Favorites</button>
                                            {' '}or{' '}
                                            <button onClick={() => handleCategoryChange('all')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: DOT_PURPLE, fontSize: 13, fontFamily: 'inherit' }}>All Songs</button>
                                            {' '}to fill it with songs.
                                        </div>
                                    </div>
                                ) : selectedPlaylist && selectedPlaylistSongs.length === 0 ? (
                                    <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 18, fontWeight: 600, color: t.text }}>Playlist is empty</div>
                                        <div style={{ fontSize: 13, color: t.textMuted }}>
                                            <button onClick={() => handleCategoryChange('favorites')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: GREEN, fontSize: 13, fontFamily: 'inherit' }}>Go to Favorites</button>
                                            {' '}to fill it with songs
                                        </div>
                                    </div>
                                ) : selectedPlaylist ? (
                                    <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
                                        {selectedPlaylistSongs.map((song, i) => {
                                            const isActive = currentSong?.id === song.id;
                                            return (
                                                <li key={song.id}
                                                    onClick={() => { onSongSelect(song.id); onClose(); }}
                                                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLLIElement).style.background = t.rowHover; }}
                                                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLLIElement).style.background = 'transparent'; }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 6, cursor: 'pointer', background: isActive ? t.rowActive : 'transparent', transition: 'background 0.12s ease' }}
                                                >
                                                    <span style={{ width: 22, textAlign: 'right', flexShrink: 0, fontSize: 12, color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 16, fontWeight: isActive ? 600 : 500, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                                                        <div style={{ fontSize: 15, color: t.textMuted, marginTop: 2 }}>{song.artist}</div>
                                                    </div>
                                                    <DifficultyDots difficulty={song.difficulty} />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};