'use client';

/**
 * TopMenuTray.tsx
 * Version v2.1.0
 * Updated: June 26th, 2026
 *
 * V2.1.0 CHANGES — Maestro black chrome + purple accent lock:
 * ✅ TopMenuTray surface restored to black/neutral gradient chrome.
 * ✅ Purple-filled tray surface removed; bottom TransportBar remains the purple gradient system.
 * ✅ Mobile and desktop TopMenuTray share the same black gradient:
 *    linear-gradient(to bottom right, rgb(3,7,18), rgb(17,24,39), rgb(3,7,18)).
 * ✅ Mobile and desktop TopMenuTray share a solid Maestro purple bottom accent:
 *    2px solid rgba(168,85,247,1).
 * ✅ Mobile and desktop TopMenuTray share a subtle purple accent glow:
 *    boxShadow: 0 1px 6px rgba(168,85,247,0.35).
 * ✅ Desktop icon system preserved:
 *    resting #93c5fd, hover #67e8f9, active #4ade80.
 * ✅ Mobile icon token system preserved:
 *    MOBILE_TRANSPORT_CYAN and MOBILE_ACTIVE unchanged.
 * ✅ No layout, height, z-index, breakpoint, or menu behavior changes.
 *
 * 🔒 CURRENT mobile/desktop shell selection — [MAESTRO-UI-002]:
 * ✅ There is no isMobileTopTray JS/matchMedia state anymore. Both <MobileTopMenuTray>
 *    and the desktop <header> below are always rendered; visibility is CSS-only via the
 *    .maestro-tray-mobile / .maestro-tray-desktop classes (globals.css), which avoids the
 *    matchMedia first-render flash and hydration mismatch the old JS-state approach had.
 * ✅ globals.css switches to the mobile shell on:
 *           Portrait:  max-width 649px (aligned with the TransportBar breakpoint).
 *           Landscape: max-height 600px and max-width 1024px — the height threshold
 *                      matches page.tsx's isMobileLandscape (touch && orientation:landscape
 *                      && innerHeight < 600) so the two systems agree on when this
 *                      component's mobile shell should be showing.
 *           Either condition triggers the 5-icon mobile shell.
 *
 * 🔒 V2.0.4 PRESERVED (historical — MB1's matchMedia state was later replaced by the
 *    CSS-only dual-shell model described above):
 * ✅ [MB4b] Mobile blue token path preserved, now aligned with tray color token usage.
 * ✅ [MB8]  BackIcon: chevron-style (< shape), strokeWidth 2.5.
 * ✅ [MB1]  isMobileTopTray state via matchMedia — own useEffect, own cleanup.
 * ✅ [MB2]  MobileTopMenuTray: separate render path, desktop/tablet untouched.
 * ✅ [MB3]  Mobile icons: Back, MyTabs/Star, Tab/Chord, Tuner, More ⋮
 * ✅ [MB5]  flex:1 spread, 64px min hit area, no labels.
 * ✅ [MB6]  TunerIcon (U-shaped fork), MoreIcon (vertical dots).
 * ✅ [MB6b] TunerIcon: two prongs → U-curve → stem → base.
 * ✅ [MB7]  No labels, no overflow, evenly spaced.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
    isPlaying?: boolean;  // ← [PS2] used by parent to toggle .is-playing on shell
    isNarrow?: boolean;   // ← [RN1] optional external override; falls back to matchMedia
}

// ─── Layout helpers (desktop/tablet) ─────────────────────────────────────────

const FlexibleGap = ({ width, minWidth = 8 }: { width: number; minWidth?: number }) => (
    <div aria-hidden="true" style={{ width, minWidth, flexShrink: 1 }} />
);

// ─── Icons — desktop/tablet ───────────────────────────────────────────────────

// [MB8] Chevron-style back arrow — works at both 20px (desktop) and 24px (mobile).
const BackIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);

const MyTabsIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

const NewTabIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
);

const HelpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const InboxIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const ProfileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const TabModeIcon = ({ mode, size = 20 }: { mode: TabMode; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
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

// ─── Icons — mobile only ──────────────────────────────────────────────────────

// [MB6b] TunerIcon — U-shaped tuning fork: two prongs, U-curve, stem, base.
const TunerIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="3" x2="8" y2="11" />
        <line x1="16" y1="3" x2="16" y2="11" />
        <path d="M8 11 Q8 15 12 15 Q16 15 16 11" />
        <line x1="12" y1="15" x2="12" y2="21" />
        <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
);

// [MB6] MoreIcon — vertical dots.
const MoreIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
);

// ─── Mobile button ────────────────────────────────────────────────────────────

// [MB4c] Cyan uses Tailwind v4 token var(--color-cyan-400) to match mobile TransportBar text-cyan-400. MOBILE_ACTIVE green is reserved for future active states.
const MOBILE_TRANSPORT_CYAN = 'var(--color-cyan-400)';
const MOBILE_ACTIVE = 'rgb(34,197,94)';

interface MobileButtonProps {
    icon: React.ReactNode;
    label: string;  // title/a11y only — not rendered
    onClick: () => void;
    active?: boolean;
}

const MobileButton: React.FC<MobileButtonProps> = ({ icon, label, onClick, active }) => {
    const color = active ? MOBILE_ACTIVE : MOBILE_TRANSPORT_CYAN;
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            style={{
                flex: 1,
                height: '100%',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color,
                transition: 'color 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            {icon}
        </button>
    );
};

// ─── Mobile top tray ─────────────────────────────────────────────────────────

interface MobileTopMenuTrayProps {
    onBack: () => void;
    viewMode: TabMode;
    onSongSelectorOpen: () => void;
    className?: string;
}

const MobileTopMenuTray: React.FC<MobileTopMenuTrayProps> = ({
    onBack, viewMode, onSongSelectorOpen, className,
}) => (
    <header
        data-top-menu-tray
        className={className}
        style={{
            position: 'relative',
            height: 'calc(64px + env(safe-area-inset-top))',
            width: '100%',
            background: 'linear-gradient(to bottom right, rgb(3,7,18), rgb(17,24,39), rgb(3,7,18))',
            borderBottom: '2px solid rgba(168,85,247,1)',
            boxShadow: '0 1px 6px rgba(168,85,247,0.35)',
            boxSizing: 'border-box',
            paddingTop: 'env(safe-area-inset-top)',
            alignItems: 'stretch',
            overflowX: 'hidden',
            overflowY: 'hidden',
        }}
    >
        {/* 1. Back */}
        <MobileButton label="Back" icon={<BackIcon size={24} />} onClick={onBack} />
        {/* 2. My Tabs / Favorites */}
        <MobileButton label="My Tabs" icon={<MyTabsIcon size={24} />} onClick={onSongSelectorOpen} />
        {/* 3. Tab / Chord — visual only for now */}
        <MobileButton label="Tab / Chord" icon={<TabModeIcon mode={viewMode} size={24} />} onClick={() => { /* parked */ }} />
        {/* 4. Tuner — visual only for now */}
        <MobileButton label="Tuner" icon={<TunerIcon size={24} />} onClick={() => { /* parked */ }} />
        {/* 5. More ⋮ — visual only for now */}
        <MobileButton label="More" icon={<MoreIcon size={24} />} onClick={() => { /* parked */ }} />
    </header>
);

// ─── Nav Button (desktop/tablet) ──────────────────────────────────────────────

interface NavButtonProps {
    icon: React.ReactNode;
    label: string;
    width?: number;
    compactWidth?: number;
    active?: boolean;
    badge?: number;
    onClick: () => void;
    isNarrow?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({
    icon, label, width = 86, compactWidth = 52, active, badge, onClick, isNarrow,
}) => {
    const [hovered, setHovered] = useState(false);

    const color = active
        ? '#4ade80'
        : hovered
            ? '#67e8f9'
            : '#93c5fd';

    const resolvedWidth = isNarrow ? compactWidth : width;

    return (
        <button
            onClick={onClick}
            title={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                width: resolvedWidth,
                height: 80,
                flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3,
                padding: 0,
                border: 'none', background: 'none', cursor: 'pointer',
                color, transition: 'color 0.15s ease, width 0.15s ease',
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

            {!isNarrow && (
                <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    WebkitTextStroke: '0.4px transparent',
                }}>
                    {label}
                </span>
            )}

            {active && (
                <span style={{
                    position: 'absolute', bottom: 0,
                    left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2, borderRadius: 999,
                    background: '#4ade80',
                }} />
            )}
        </button>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TopMenuTray: React.FC<TopMenuTrayProps> = ({
    currentSong: _currentSong,
    onSongSelectorOpen,
    onNewTabOpen,
    viewMode = 'tab',
    onViewModeChange,
    inboxCount = 0,
    onBack,
    isPlaying: _isPlaying,
    isNarrow,
}) => {
    // [RC1d] Desktop/tablet compact — 968px, safely above mobile threshold.
    const [internalNarrow, setInternalNarrow] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 968px)');
        const onChange = (e: MediaQueryListEvent) => setInternalNarrow(e.matches);
        setInternalNarrow(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    const narrow = isNarrow ?? internalNarrow;

    const handleBack = useCallback(() => {
        if (onBack) {
            onBack();
        } else {
            window.history.back();
        }
    }, [onBack]);

    const handleViewModeToggle = useCallback(() => {
        onViewModeChange?.(viewMode === 'tab' ? 'chord' : 'tab');
    }, [viewMode, onViewModeChange]);

    // ── Both shells always rendered; CSS controls visibility (no matchMedia flash) ─
    const gapMin = narrow ? 4 : 8;

    return (
        <>
            <MobileTopMenuTray
                className="maestro-tray-mobile"
                onBack={handleBack}
                viewMode={viewMode}
                onSongSelectorOpen={onSongSelectorOpen}
            />

            <header
                data-top-menu-tray
                className="maestro-tray-desktop"
                style={{
                position: 'relative',
                height: 'calc(80px + env(safe-area-inset-top))',
                width: '100%',
                background: 'linear-gradient(to bottom right, rgb(3,7,18), rgb(17,24,39), rgb(3,7,18))',
                borderBottom: '2px solid rgba(168,85,247,1)',
                boxShadow: '0 1px 6px rgba(168,85,247,0.35)',
                fontFamily: 'songsterr, -apple-system, system-ui, "system-ui", Arial, sans-serif',
                fontWeight: 300,
                lineHeight: '18.4px',
                colorScheme: 'light',
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch' as any,
            }}
        >
            <div style={{
                height: '100%',
                boxSizing: 'border-box',
                paddingTop: 'env(safe-area-inset-top)',
                paddingLeft: 16,
                paddingRight: 16,
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
                            width: narrow ? 52 : 86, height: 80, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: 'none', cursor: 'pointer',
                            color: '#93c5fd',
                            transition: 'color 0.15s ease, width 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#67e8f9'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#93c5fd'; }}
                    >
                        <BackIcon />
                    </button>
                    <FlexibleGap width={30.5} minWidth={gapMin} />
                    <NavButton
                        icon={<TabModeIcon mode={viewMode} />}
                        label={viewMode === 'tab' ? 'Tab' : 'Chord'}
                        width={130}
                        compactWidth={56}
                        active={viewMode === 'chord'}
                        onClick={handleViewModeToggle}
                        isNarrow={narrow}
                    />
                </div>

                {/* ── CENTER GROUP ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <NavButton icon={<SearchIcon />} label="Search" width={60} compactWidth={44} onClick={() => { }} isNarrow={narrow} />
                    <FlexibleGap width={24.5} minWidth={gapMin} />
                    <NavButton icon={<MyTabsIcon />} label="My Tabs" width={60} compactWidth={44} onClick={onSongSelectorOpen} isNarrow={narrow} />
                    <FlexibleGap width={24.5} minWidth={gapMin} />
                    <NavButton icon={<NewTabIcon />} label="New Tab" width={86} compactWidth={52} onClick={() => onNewTabOpen?.()} isNarrow={narrow} />
                </div>

                {/* ── RIGHT GROUP ── */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <FlexibleGap width={24.5} minWidth={gapMin} />
                    <NavButton icon={<HelpIcon />} label="Help" width={86} compactWidth={52} onClick={() => { }} isNarrow={narrow} />
                    <FlexibleGap width={24.5} minWidth={gapMin} />
                    <NavButton icon={<InboxIcon />} label="Inbox" width={86} compactWidth={52} badge={inboxCount} onClick={() => { }} isNarrow={narrow} />
                    <NavButton icon={<ProfileIcon />} label="Profile" width={86} compactWidth={52} onClick={() => { }} isNarrow={narrow} />
                </div>

            </div>
        </header>
        </>
    );
};