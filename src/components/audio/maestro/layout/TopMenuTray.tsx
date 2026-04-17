'use client';

/**
 * TopMenuTray.tsx
 * Version v1.4
 * Updated: April 16th, 2026
 *
 * V1.4 CHANGES (Option A — "dumb component" architecture):
 * ✅ Removed internal scroll listener, isHeaderVisible state, and transform style.
 *    Visibility is now 100% owned by synth-player/page.tsx (single source of truth).
 * ✅ Dynamic Island fix retained: header height = calc(80px + env(safe-area-inset-top))
 *    inner row: paddingTop env(safe-area-inset-top), height calc(100% - env(safe-area-inset-top))
 * ✅ safe-area-pt class added to <header> for Tailwind compatibility.
 *
 * V1.3 → V1.4 removed:
 *   - useState(isHeaderVisible)
 *   - useEffect scroll listener
 *   - transform: isHeaderVisible ? translateY(0) : translateY(-100%)
 *
 * V1.2 PRESERVED EXACTLY:
 * ✅ Songsterr flex grid spec (all widths, gaps, groups)
 * ✅ NavButton active/hover/default color states
 * ✅ Tab/Chord toggle (not yet wired to AlphaTab renderer)
 * ✅ Back button / future logo slot
 *
 * Flex grid spec (measured from Songsterr, adapted for Maestro.ai):
 *
 *  ← Left-to-Right ────────────────────────────────────────────────────────────
 *  50px   left end padding
 *  86×80  Back / Future Logo slot
 *  30.5px gap
 *  130×80 Chord/Tab toggle
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
 */

import React, { useState, useCallback } from 'react';
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
        ? 'rgb(167,139,250)'
        : hovered
            ? 'rgb(226,232,240)'
            : 'rgb(148,163,184)';

    return (
        <button
            onClick={onClick}
            title={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                width,
                height: 80,
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                padding: 0,
                border: 'none', background: 'none', cursor: 'pointer',
                color, transition: 'color 0.15s ease',
                fontFamily: 'songsterr, -apple-system, system-ui, Arial, sans-serif',
            }}
        >
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

            <span style={{
                fontSize: 10, fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
                {label}
            </span>

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
    const handleBack = useCallback(() => {
        onBack ? onBack() : window.history.back();
    }, [onBack]);

    const handleViewModeToggle = useCallback(() => {
        onViewModeChange?.(viewMode === 'tab' ? 'chord' : 'tab');
    }, [viewMode, onViewModeChange]);

    return (
        // [V1.3] Dynamic Island fix:
        // - header height absorbs env(safe-area-inset-top) so the bar expands above the notch
        // - translateY(-100%) still hides the full expanded bar correctly
        // - inner row uses paddingTop to push content below the notch
        <header
            style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                zIndex: 111,
                // 🔒 V1.3: expanded height — safe-area absorbed here, not on wrapper
                height: 'calc(80px + env(safe-area-inset-top))',
                width: '100%',
                background: 'rgb(23,23,23)',
                borderBottom: '1px solid rgba(124,58,237,0.3)',
                fontFamily: 'songsterr, -apple-system, system-ui, "system-ui", Arial, sans-serif',
                fontWeight: 300,
                lineHeight: '18.4px',
                colorScheme: 'light',
                // 🔒 V1.4: No transform here — page.tsx wrapper owns slide animation.
            }}
        >
            {/*
             * [V1.4] Pattern 1: boxSizing + paddingTop keeps height:'100%' intact.
             * paddingTop pushes content below the notch without shrinking the row.
             * This eliminates the "dead black area under buttons" regression from V1.3.
             */}
            <div style={{
                height: '100%',
                boxSizing: 'border-box',
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 50,
                paddingRight: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>

                {/* ── LEFT GROUP ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
                    <NavButton
                        icon={<TabModeIcon mode={viewMode} />}
                        label={viewMode === 'tab' ? 'Tab' : 'Chord'}
                        width={130}
                        active={viewMode === 'chord'}
                        onClick={handleViewModeToggle}
                    />
                </div>

                {/* ── CENTER GROUP ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <NavButton icon={<SearchIcon />} label="Search" width={60} onClick={() => { }} />
                    <Gap w={24.5} />
                    <NavButton icon={<MyTabsIcon />} label="My Tabs" width={60} onClick={onSongSelectorOpen} />
                    <Gap w={24.5} />
                    <NavButton icon={<NewTabIcon />} label="New Tab" width={86} onClick={() => onNewTabOpen?.()} />
                </div>

                {/* ── RIGHT GROUP ── */}
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