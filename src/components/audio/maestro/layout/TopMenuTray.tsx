'use client';

/**
 * TopMenuTray.tsx
 * Updated: March 2026
 *
 * Flex grid spec (measured from Songsterr, adapted for Maestro.ai):
 *
 *  ← Left-to-Right ────────────────────────────────────────────────────────────
 *  50px   left end padding
 *  86×80  Back / Future Logo slot
 *  30.5px gap
 *  130×80 Chord/Tab toggle  (was "Menu Plus" in Songsterr — not yet wired to AlphaTab)
 *  30.5px gap
 *  ─── center group ────────────────────────────────────────────────────────────
 *  60×80  Search
 *  24.5px gap
 *  60×80  My Tabs
 *  24.5px gap
 *  86×80  New Tab
 *  ─── right group ─────────────────────────────────────────────────────────────
 *  24.5px gap
 *  86×80  Help
 *  24.5px gap
 *  86×80  Inbox
 *  86×80  Profile
 *  20px   right end padding
 *  ─────────────────────────────────────────────────────────────────────────────
 *  Total ≈ 904px  ✓ matches spec
 *
 * NavButton:
 *   - explicit width + height: 80px fills full tray height
 *   - flex-col centered, no horizontal padding (box width drives centering)
 *   - active  → purple-400  rgb(167,139,250)
 *   - hover   → slate-200   rgb(226,232,240)
 *   - default → slate-400   rgb(148,163,184)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SongItem } from '@/lib/song-data';

export type TabMode = 'tab' | 'chord';

export interface TopMenuTrayProps {
    currentSong: SongItem | null;
    onSongSelectorOpen: () => void;
    onNewTabOpen?: () => void;
    viewMode?: TabMode;
    onViewModeChange?: (mode: TabMode) => void;
    inboxCount?: number;
    onBack?: () => void;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

/** Explicit pixel gap between flex children */
const Gap = ({ w }: { w: number }) => (
    <div style={{ width: w, flexShrink: 0 }} />
);

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

const MyTabsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const NewTabIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
);

const HelpIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const InboxIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const ProfileIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

/**
 * TabModeIcon — visual indicator for the chord/tab toggle NavButton.
 * Staff lines = tab mode | dot grid = chord mode.
 * Not yet wired to AlphaTab renderer — toggle logic is ready.
 */
const TabModeIcon = ({ mode }: { mode: TabMode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {mode === 'tab' ? (
            <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="3" y1="14" x2="21" y2="14" />
                <line x1="3" y1="18" x2="21" y2="18" />
            </>
        ) : (
            <>
                <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
            </>
        )}
    </svg>
);

// ─── Nav Button ───────────────────────────────────────────────────────────────

interface NavButtonProps {
    icon: React.ReactNode;
    label: string;
    /** Explicit box width from flex grid spec — default 86 */
    width?: number;
    active?: boolean;
    badge?: number;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({
    icon, label, width = 86, active, badge, onClick,
}) => {
    const [hovered, setHovered] = useState(false);

    const color = active
        ? 'rgb(167,139,250)'    // purple-400
        : hovered
            ? 'rgb(226,232,240)'    // slate-200
            : 'rgb(148,163,184)';   // slate-400

    return (
        <button
            onClick={onClick}
            title={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                // ── Flex grid box ──
                width,
                height: 80,
                flexShrink: 0,
                // ── Inner layout ──
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                padding: 0,
                // ── Reset ──
                border: 'none', background: 'none', cursor: 'pointer',
                // ── Color ──
                color, transition: 'color 0.15s ease',
                fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
            }}
        >
            {/* Icon + optional badge */}
            <div style={{ position: 'relative' }}>
                {icon}
                {badge != null && badge > 0 && (
                    <span style={{
                        position: 'absolute', top: -6, right: -6,
                        minWidth: 16, height: 16, padding: '0 3px',
                        borderRadius: 999,
                        background: 'rgb(220,38,38)', color: 'white',
                        fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                    }}>
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>

            {/* Label */}
            <span style={{
                fontSize: 10, fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
                {label}
            </span>

            {/* Active underline */}
            {active && (
                <span style={{
                    position: 'absolute', bottom: 0,
                    left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2, borderRadius: 999,
                    background: 'rgb(167,139,250)',
                }} />
            )}
        </button>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TopMenuTray: React.FC<TopMenuTrayProps> = ({
    currentSong,
    onSongSelectorOpen,
    onNewTabOpen,
    viewMode = 'tab',
    onViewModeChange,
    inboxCount = 0,
    onBack,
}) => {
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            if (y > lastScrollY.current && y > 100) setIsHeaderVisible(false);
            else if (y < lastScrollY.current) setIsHeaderVisible(true);
            lastScrollY.current = y;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleBack = useCallback(() => {
        onBack ? onBack() : window.history.back();
    }, [onBack]);

    const handleViewModeToggle = useCallback(() => {
        onViewModeChange?.(viewMode === 'tab' ? 'chord' : 'tab');
    }, [viewMode, onViewModeChange]);

    return (
        <header
            style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                zIndex: 111,
                height: 80,
                width: '100%',
                background: 'rgb(23,23,23)',
                borderBottom: '1px solid rgba(124,58,237,0.3)',
                fontFamily: 'songsterr, -apple-system, system-ui, "system-ui", Arial, sans-serif',
                fontWeight: 300,
                lineHeight: '18.4px',
                colorScheme: 'light',
                transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.3s ease-in-out',
            }}
        >
            {/*
             * Single flex row — exact box widths and gaps from spec.
             * Three logical groups separated by justify-between:
             *   [Left: Back + ChordTab]  [Center: Search + MyTabs + NewTab]  [Right: Help + Inbox + Profile]
             * paddingLeft: 50, paddingRight: 20 are the end paddings from spec.
             */}
            <div style={{
                height: '100%',
                paddingLeft: 50,
                paddingRight: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>

                {/* ── LEFT GROUP: Back/Logo (86) + 30.5 gap + ChordTab (130) ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>

                    {/* 86×80 — Back button / Future Logo slot */}
                    <button
                        onClick={handleBack}
                        title="Back"
                        style={{
                            width: 86, height: 80, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: 'rgb(148,163,184)',
                            transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgb(226,232,240)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgb(148,163,184)'; }}
                    >
                        <BackIcon />
                    </button>

                    <Gap w={30.5} />

                    {/* 130×80 — Chord/Tab toggle (not yet wired to AlphaTab renderer) */}
                    <NavButton
                        icon={<TabModeIcon mode={viewMode} />}
                        label={viewMode === 'tab' ? 'Tab' : 'Chord'}
                        width={130}
                        active={viewMode === 'chord'}
                        onClick={handleViewModeToggle}
                    />
                </div>

                {/* ── CENTER GROUP: Search (60) + 24.5 + MyTabs (60) + 24.5 + NewTab (86) ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <NavButton icon={<SearchIcon />} label="Search" width={60} onClick={() => { }} />
                    <Gap w={24.5} />
                    <NavButton icon={<MyTabsIcon />} label="My Tabs" width={60} onClick={onSongSelectorOpen} />
                    <Gap w={24.5} />
                    <NavButton icon={<NewTabIcon />} label="New Tab" width={86} onClick={() => onNewTabOpen?.()} />
                </div>

                {/* ── RIGHT GROUP: 24.5 + Help (86) + 24.5 + Inbox (86) + Profile (86) ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <Gap w={24.5} />
                    <NavButton icon={<HelpIcon />} label="Help" width={86} onClick={() => { }} />
                    <Gap w={24.5} />
                    <NavButton icon={<InboxIcon />} label="Inbox" width={86} badge={inboxCount} onClick={() => { }} />
                    <NavButton icon={<ProfileIcon />} label="Profile" width={86} onClick={() => { }} />
                </div>

            </div>
        </header>
    );
};
