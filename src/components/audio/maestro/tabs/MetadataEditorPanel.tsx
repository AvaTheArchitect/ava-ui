'use client';

/**
 * MetadataEditorPanel.tsx
 * src/components/audio/maestro/tabs/MetadataEditorPanel.tsx
 * V3.9 — time_signature + source persisted on file replacement
 * Date: March 24th, 2026
 *
 * 🔥 V3.9 CHANGES:
 * ✅ ExtractedMeta: source field added
 * ✅ handleTabFile: source defaults to 'songsterr' on file stage
 * ✅ handleSave section C: time_signature + source written to tabs row
 *    — only when pendingFile is staged (safe: never wipes on metadata-only saves)
 *
 * 🔒 V3.8 PRESERVED:
 * ✅ Import GENRE_OPTIONS, TUNINGS, detectTuningSlug, detectInstrumentFromMidi from @/lib/song-data
 * ✅ AUDIO_ROWS: full_mix · backing
 * ✅ AudioSlotState per slot: existingId, loadedName, loadedPath, pendingFile, clearPending
 * ✅ All save sections A/B/D — UNTOUCHED
 * ✅ All UI — UNTOUCHED
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/alphaTab/supabase';
import { GENRE_OPTIONS } from '@/lib/song-data';
import { TUNINGS, detectTuningSlug, detectInstrumentFromMidi } from '@/lib/song-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'info' | 'media' | 'file';
type SaveStatus = 'idle' | 'saving' | 'success' | 'error';
type LoadStatus = 'missing-id' | 'loading' | 'not-found' | 'ready';
type VideoKey = 'main' | 'backing' | 'solo' | 'playthrough' | 'live' | 'lesson';
type AudioType = 'full_mix' | 'backing' | 'stem_source';
type SyncMode = 'simple' | 'advanced';

interface SyncPoint { bar: string; occurrence: string; videoTime: string; }

interface VideoRowData {
    url: string; syncMode: SyncMode; startOffset: string; advancedPoints: SyncPoint[];
}

type VideoState = Record<VideoKey, VideoRowData>;

interface AudioSlotState {
    existingId: string | null;
    loadedName: string;
    loadedPath: string;
    pendingFile: File | null;
    clearPending: boolean;
}

type AudioSlotMap = Record<AudioType, AudioSlotState>;

interface FormState {
    title: string; artist: string; album: string; year: string;
    genre: string; difficulty: string; instrument: string; tuning: string;
    source: string; tempo: string;                              // ← V3.9.1: source added
}

// V3.9: source added — set to 'songsterr' when a file is staged
interface ExtractedMeta {
    tempo?: number;
    tuning?: string;
    instrument?: string;
    timeSignature?: string;
    source?: string;            // ← V3.9
}

export interface MetadataEditorPanelProps {
    tabId: string | null;
    onClose?: () => void;
    onSave?: (tabId: string, patch: { title: string; artist: string; album?: string }) => void;
}

// ─── Video row definitions ────────────────────────────────────────────────────
const VIDEO_ROWS: { key: VideoKey; label: string }[] = [
    { key: 'main', label: 'Main / Full Mix' },
    { key: 'backing', label: 'Backing Track' },
    { key: 'solo', label: 'Solo Version' },
    { key: 'playthrough', label: 'Guitar Playthrough' },
    { key: 'live', label: 'Live Performance' },
    { key: 'lesson', label: 'Lesson / Tutorial' },
];
const VIDEO_KEYS: VideoKey[] = ['main', 'backing', 'solo', 'playthrough', 'live', 'lesson'];

const AUDIO_ROWS: {
    key: AudioType;
    label: string;
    hint: string;
    qualityNote?: string;
}[] = [
        {
            key: 'full_mix',
            label: 'Full Mix',
            hint: 'Complete song audio for playback as an alternative source alongside Synth and YouTube.',
        },
        {
            key: 'backing',
            label: 'Backing Track',
            hint: 'Practice audio with lead guitar removed — available as an alternate playback source.',
        },
    ];

const AUDIO_KEYS: AudioType[] = ['full_mix', 'backing'];

const EMPTY_AUDIO_SLOT = (): AudioSlotState => ({
    existingId: null, loadedName: '', loadedPath: '', pendingFile: null, clearPending: false,
});

const EMPTY_AUDIO_STATE = (): AudioSlotMap => ({
    full_mix: EMPTY_AUDIO_SLOT(),
    backing: EMPTY_AUDIO_SLOT(),
    stem_source: EMPTY_AUDIO_SLOT(),
});

const EMPTY_SYNC_POINT = (): SyncPoint => ({ bar: '', occurrence: '1', videoTime: '' });
const EMPTY_VIDEO_ROW = (): VideoRowData => ({ url: '', syncMode: 'simple', startOffset: '0', advancedPoints: [] });
const EMPTY_VIDEO_STATE = (): VideoState => ({
    main: EMPTY_VIDEO_ROW(), backing: EMPTY_VIDEO_ROW(), solo: EMPTY_VIDEO_ROW(),
    playthrough: EMPTY_VIDEO_ROW(), live: EMPTY_VIDEO_ROW(), lesson: EMPTY_VIDEO_ROW(),
});

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function extractYouTubeId(input: string): string | null {
    const s = input.trim();
    if (!s) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    try {
        const url = new URL(s);
        if (url.hostname.includes('youtube.com')) {
            const v = url.searchParams.get('v');
            if (v?.length === 11) return v;
            const m = url.pathname.match(/\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
            if (m) return m[1];
        }
        if (url.hostname === 'youtu.be') {
            const m = url.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
            if (m) return m[1];
        }
    } catch { /* not a URL */ }
    return null;
}

function isValidYouTubeInput(s: string): boolean {
    return !s.trim() || extractYouTubeId(s) !== null;
}

function isDevHost(): boolean {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.startsWith('10.');
}

function useDark(): boolean {
    const [dark, setDark] = useState(false);
    useEffect(() => {
        const check = () => {
            const attr = document.documentElement.dataset.theme;
            setDark(attr === 'dark' || (!attr && window.matchMedia('(prefers-color-scheme: dark)').matches));
        };
        check();
        const obs = new MutationObserver(check);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', check);
        return () => { obs.disconnect(); mq.removeEventListener('change', check); };
    }, []);
    return dark;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_EXTS = ['.gp', '.gpx', '.gp3', '.gp4', '.gp5', '.gp8', '.musicxml', '.capx'];
const ACCEPTED_AUDIO = ['.mp3', '.wav', '.ogg', '.flac'];

const INSTRUMENT_OPTIONS = [
    { label: 'Guitar (6-string)', value: 'guitar6' }, { label: 'Guitar (7-string)', value: 'guitar7' },
    { label: 'Guitar (12-string)', value: 'guitar12' }, { label: 'Bass (4-string)', value: 'bass4' },
    { label: 'Bass (5-string)', value: 'bass5' }, { label: 'Drums', value: 'drums' },
];

const DIFFICULTY_OPTIONS = [
    { label: 'Beginner', value: '1' }, { label: 'Intermediate', value: '2' }, { label: 'Advanced', value: '3' },
];

// V3.9.1: Source vocabulary — normalized slugs stored in tabs.source
const SOURCE_OPTIONS = [
    { label: 'Songsterr', value: 'songsterr' },
    { label: 'Ultimate Guitar', value: 'ultimate_guitar' },
    { label: 'GProTab', value: 'gprotab' },
    { label: 'MuseScore', value: 'musescore' },
    { label: '911Tabs', value: '911tabs' },
    { label: 'User Upload', value: 'user_upload' },
    { label: 'AI Generated', value: 'ai_generated' },
    { label: 'Other', value: 'other' },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const PURPLE = 'rgb(147,51,234)';
const PURPLE_HOVER = 'rgb(124,58,237)';
const RED = 'rgb(220,38,38)';
const GREEN = 'rgb(30,177,54)';
const AMBER = 'rgb(161,98,7)';

// ─── Shared primitives ────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; required?: boolean; error?: string; hint?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ label, required, error, hint, style, children }) => (
    <div style={{ marginBottom: 12, ...style }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5, fontFamily: 'inherit' }}>
            {label}{required && <span style={{ color: RED, marginLeft: 2 }}>*</span>}
        </label>
        {children}
        {hint && !error && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0', fontFamily: 'inherit' }}>{hint}</p>}
        {error && <p style={{ fontSize: 11, color: RED, margin: '3px 0 0', fontFamily: 'inherit' }}>{error}</p>}
    </div>
);

const TextInput: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; dark: boolean; hasError?: boolean; type?: string; disabled?: boolean; style?: React.CSSProperties }> = ({ value, onChange, placeholder, dark, hasError, type = 'text', disabled, style }) => {
    const [focused, setFocused] = useState(false);
    return (
        <input type={type} value={value} placeholder={placeholder} disabled={disabled}
            onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width: '100%', height: 36, padding: '0 11px', borderRadius: 6, boxSizing: 'border-box', border: `1px solid ${hasError ? RED : focused ? PURPLE : 'var(--upload-border)'}`, boxShadow: focused ? '0 0 0 3px rgba(147,51,234,0.12)' : 'none', background: dark ? 'rgb(9,9,11)' : 'white', color: 'var(--text-primary)', fontSize: 13, fontWeight: 300, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease', opacity: disabled ? 0.45 : 1, ...style }}
        />
    );
};

const SelectInput: React.FC<{ value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; placeholder: string; dark: boolean; hasError?: boolean }> = ({ value, onChange, options, placeholder, dark, hasError }) => {
    const [focused, setFocused] = useState(false);
    const cc = dark ? '%23a1a1aa' : '%2371717a';
    return (
        <select value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{ width: '100%', height: 36, padding: '0 32px 0 11px', borderRadius: 6, boxSizing: 'border-box', border: `1px solid ${hasError ? RED : focused ? PURPLE : 'var(--upload-border)'}`, boxShadow: focused ? '0 0 0 3px rgba(147,51,234,0.12)' : 'none', background: dark ? 'rgb(9,9,11)' : 'white', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 13, fontWeight: 300, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='7' viewBox='0 0 13 7' fill='${cc}'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M.744.788A1 1 0 0 1 2.157.721l4.827 4.388L11.812.721a1 1 0 0 1 1.345 1.48l-5.5 5a1 1 0 0 1-1.345 0l-5.5-5A1 1 0 0 1 .744.788'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}>
            <option value="">{placeholder}</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
};

const Divider: React.FC<{ label: string }> = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--panel-border)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: '1', color: 'var(--text-muted)', fontFamily: 'inherit' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--panel-border)' }} />
    </div>
);

const Banner: React.FC<{ type: 'success' | 'error' | 'warning'; children: React.ReactNode }> = ({ type, children }) => {
    const cfg = {
        success: { bg: 'rgba(30,177,54,0.08)', border: 'rgba(30,177,54,0.3)', color: GREEN },
        error: { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)', color: RED },
        warning: { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)', color: AMBER },
    }[type];
    return <div style={{ marginBottom: 12, padding: '9px 14px', borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 12, fontFamily: 'inherit' }}>{children}</div>;
};

const TrayAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; color?: string; dark: boolean; title?: string }> = ({ icon, label, onClick, disabled, color, dark, title }) => {
    const [hov, setHov] = useState(false);
    const fg = color ?? (hov ? PURPLE : (dark ? 'rgb(180,180,195)' : 'rgb(90,90,105)'));
    return (
        <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} title={title}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 44, padding: '5px 0', background: hov && !disabled ? (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent', border: 'none', borderRadius: 7, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'background 0.15s ease', flexShrink: 0, color: fg }}>
            {icon}
            <span style={{ fontSize: 10, fontWeight: 500, fontFamily: 'inherit', letterSpacing: '0.01em', lineHeight: 1, color: fg }}>{label}</span>
        </button>
    );
};

const SaveTrayButton: React.FC<{ status: SaveStatus; onClick: () => void; dark: boolean; isDirty: boolean }> = ({ status, onClick, dark, isDirty }) => {
    const isSaving = status === 'saving', isSuccess = status === 'success', isError = status === 'error';
    const color = isSuccess ? GREEN : isError ? RED : isDirty ? PURPLE : undefined;
    const icon = isSuccess ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    ) : isError ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    ) : isSaving ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: 'mep-spin 0.8s linear infinite' }}>
            <style>{`@keyframes mep-spin{to{transform:rotate(360deg)}}`}</style>
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10A10 10 0 0 1 2 12" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 0-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
    );
    return <TrayAction icon={icon} label={isSaving ? 'Saving…' : isSuccess ? 'Saved' : isError ? 'Error' : 'Save'} onClick={onClick} disabled={isSaving} color={color} dark={dark} title="Save changes" />;
};

const HelpTrayButton: React.FC<{ onClick: () => void; dark: boolean }> = ({ onClick, dark }) => (
    <TrayAction dark={dark} onClick={onClick} title="Help" label="Help"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" /></svg>}
    />
);

const HelpModal: React.FC<{ section: SectionKey; dark: boolean; onClose: () => void }> = ({ section, dark, onClose }) => {
    const bg = dark ? 'rgb(26,26,30)' : 'white';
    const HS: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
        <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(147,51,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{title}</div>
            </div>
            <div style={{ paddingLeft: 36 }}>{children}</div>
        </div>
    );
    const P: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 0 8px', fontFamily: 'inherit', fontWeight: 300, ...style }}>{children}</p>
    );
    const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = PURPLE }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4, background: `${color}20`, color, fontSize: 11, fontWeight: 600, fontFamily: 'monospace', marginRight: 4 }}>{children}</span>
    );
    const Row: React.FC<{ label: string; desc: string }> = ({ label, desc }) => (
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0 12px', marginBottom: 8, alignItems: 'baseline' }}>
            <Tag>{label}</Tag><P style={{ margin: 0 }}>{desc}</P>
        </div>
    );
    const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div style={{ marginTop: 6, padding: '7px 10px', borderRadius: 5, background: dark ? 'rgba(255,255,255,0.04)' : 'rgb(248,248,252)', border: '1px solid var(--panel-border)', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit', lineHeight: '1.5' }}>{children}</div>
    );
    const musicIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    const infoIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
    const playIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill={PURPLE} stroke="none" opacity="0.7" /></svg>;
    const waveIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
    const gridIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>;
    const fileIcon = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>;
    return (
        <>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 10, borderRadius: 4 }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 440, maxWidth: 'calc(100% - 40px)', maxHeight: '78%', background: bg, borderRadius: 10, boxShadow: '0 24px 48px rgba(0,0,0,0.28)', zIndex: 11, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}>
                <div style={{ flexShrink: 0, height: 48, borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, background: dark ? 'rgb(20,20,24)' : 'rgb(250,250,252)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(147,51,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: PURPLE }}>?</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                        {section === 'info' ? 'Song Info — Field Reference' : section === 'media' ? 'Media & Sync — How It Works' : 'Tab File — Format Reference'}
                    </div>
                    <button onClick={onClose} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
                        onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>×</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px', overscrollBehavior: 'contain' }}>
                    {section === 'info' && (
                        <>
                            <HS icon={musicIcon} title="Identity fields"><P>Title and Artist are required and used for search, deduplication, and display throughout the app.</P></HS>
                            <HS icon={infoIcon} title="Classification">
                                <P><strong style={{ fontWeight: 500 }}>Difficulty</strong> — Beginner = open chords, Intermediate = barre/pentatonic, Advanced = complex techniques.</P>
                                <P><strong style={{ fontWeight: 500 }}>Tuning</strong> — controls the string display in the tab renderer.</P>
                                <P><strong style={{ fontWeight: 500 }}>Tempo</strong> — sets default BPM. Falls back to the value in the Guitar Pro file.</P>
                            </HS>
                        </>
                    )}
                    {section === 'media' && (
                        <>
                            <HS icon={playIcon} title="Simple Sync">
                                <P>Best for studio recordings where the song starts at a predictable offset.</P>
                                <Row label="Bar 1 start" desc="Seconds into the video where bar 1 begins." />
                                <Tip>💡 Use Simple Sync when the video has a fixed intro but stays aligned from bar 1 onward.</Tip>
                            </HS>
                            <HS icon={waveIcon} title="Advanced Sync">
                                <P>Best for live recordings or lessons where the video drifts over time.</P>
                                <Row label="Bar" desc="Measure number in the tab." />
                                <Row label="Occurrence" desc="Which pass through that bar (1 = first, 2 = after repeat)." />
                                <Row label="Video time" desc="Seconds into the video when that bar begins." />
                                <Tip>💡 Two anchor points are usually enough for a live recording.</Tip>
                            </HS>
                            <HS icon={gridIcon} title="Video slots">
                                <P>Each slot (Main, Backing, Solo, Playthrough, Live, Lesson) is stored as an independent row in tab_youtube with its own sync settings.</P>
                            </HS>
                            <HS icon={musicIcon} title="Audio slots">
                                <P><strong style={{ fontWeight: 500 }}>Full Mix</strong> — complete song for real audio playback.</P>
                                <P><strong style={{ fontWeight: 500 }}>Backing Track</strong> — no lead guitar, for practice mode.</P>
                                <Tip>📌 The Metadata Editor manages playback-ready media. AI stem separation and tab extraction are handled in the New Tab flow.</Tip>
                            </HS>
                        </>
                    )}
                    {section === 'file' && (
                        <>
                            <HS icon={fileIcon} title="Supported formats">
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                                    {ACCEPTED_EXTS.map(e => <Tag key={e}>{e}</Tag>)}
                                </div>
                                <P>Guitar Pro files (.gp–.gp8, .gpx) are rendered natively by AlphaTab. MusicXML and Capella are also supported.</P>
                            </HS>
                            <HS icon={infoIcon} title="Auto-extracted metadata">
                                <P>When you drop a file, Maestro reads it with AlphaTab and extracts tempo, tuning, and instrument from track 1.</P>
                                <Tip>💡 If tuning shows "unknown" the file uses a non-standard MIDI tuning. Set it manually in Song Info.</Tip>
                            </HS>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

const BackButton: React.FC<{ onClick: () => void; dark: boolean }> = ({ onClick, dark }) => {
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: hov ? (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)') : 'none', border: 'none', borderRadius: 6, color: hov ? (dark ? 'white' : 'rgb(30,30,40)') : 'rgb(155,155,170)', fontSize: 13, fontWeight: 400, fontFamily: 'inherit', cursor: 'pointer', padding: '5px 10px', flexShrink: 0, transition: 'color 0.15s ease, background 0.15s ease' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Back
        </button>
    );
};

const FileIcon: React.FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
);

const TabHero: React.FC<{ icon: React.ReactNode; title: string; sub: string; dark: boolean }> = ({ icon, title, sub, dark }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, padding: '18px 20px', borderRadius: 10, background: dark ? 'rgba(147,51,234,0.07)' : 'rgba(147,51,234,0.04)', border: '1px solid rgba(147,51,234,0.13)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: 'rgba(147,51,234,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <div>
            <div style={{ fontSize: 28, fontWeight: 600, lineHeight: '1.15', color: 'var(--text-primary)', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>{title}</div>
            <div style={{ fontSize: 14, fontWeight: 300, lineHeight: '1.4', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'inherit' }}>{sub}</div>
        </div>
    </div>
);

const IconSongInfo = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>);
const IconMedia = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill={PURPLE} stroke="none" opacity="0.7" /></svg>);
const IconTabFile = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>);

const TrashButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => {
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} title="Remove this video"
            style={{ width: 32, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hov && !disabled ? 'rgba(220,38,38,0.08)' : 'transparent', border: `1px solid ${hov && !disabled ? 'rgba(220,38,38,0.3)' : 'transparent'}`, borderRadius: 6, cursor: disabled ? 'default' : 'pointer', flexShrink: 0, opacity: disabled ? 0.25 : 1, transition: 'background 0.15s ease, border-color 0.15s ease' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hov && !disabled ? RED : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.15s ease' }}>
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
        </button>
    );
};

const SyncModeToggle: React.FC<{ mode: SyncMode; onChange: (m: SyncMode) => void; dark: boolean }> = ({ mode, onChange }) => (
    <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--upload-border)', flexShrink: 0 }}>
        {(['simple', 'advanced'] as SyncMode[]).map(m => {
            const active = mode === m;
            return (
                <button key={m} onClick={() => onChange(m)}
                    style={{ padding: '0 10px', height: 24, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: active ? 600 : 400, background: active ? PURPLE : 'transparent', color: active ? 'white' : 'var(--text-muted)', transition: 'background 0.15s ease, color 0.15s ease', textTransform: 'capitalize' }}>
                    {m}
                </button>
            );
        })}
    </div>
);

// ─── VideoRow ─────────────────────────────────────────────────────────────────
const VideoRow: React.FC<{
    label: string; data: VideoRowData;
    onUrlChange: (url: string) => void; onSyncModeChange: (mode: SyncMode) => void;
    onOffsetChange: (v: string) => void; onPointsChange: (pts: SyncPoint[]) => void;
    onClear: () => void; syncOpen: boolean; onToggleSync: () => void;
    dark: boolean; error?: string;
}> = ({ label, data, onUrlChange, onSyncModeChange, onOffsetChange, onPointsChange, onClear, syncOpen, onToggleSync, dark, error }) => {
    const ytId = extractYouTubeId(data.url);
    const hasContent = !!data.url;
    const hasOffset = data.startOffset !== '0' && data.startOffset !== '';
    const hasAdvanced = data.advancedPoints.length > 0;
    const syncActive = (data.syncMode === 'simple' && hasOffset) || (data.syncMode === 'advanced' && hasAdvanced);

    const addPoint = () => onPointsChange([...data.advancedPoints, EMPTY_SYNC_POINT()]);
    const removePoint = (i: number) => onPointsChange(data.advancedPoints.filter((_, idx) => idx !== i));
    const patchPoint = (i: number, patch: Partial<SyncPoint>) =>
        onPointsChange(data.advancedPoints.map((p, idx) => idx === i ? { ...p, ...patch } : p));

    return (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'inherit' }}>{label}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 96, height: 54, flexShrink: 0, borderRadius: 5, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.05)' : 'rgb(240,240,244)', border: `1px solid ${ytId ? 'transparent' : 'var(--upload-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ytId ? (
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="var(--text-muted)" strokeWidth="1.4" opacity="0.4" />
                            <polygon points="10 8 16 12 10 16 10 8" fill="var(--text-muted)" opacity="0.3" />
                        </svg>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <TextInput value={data.url} onChange={onUrlChange} placeholder="https://www.youtube.com/watch?v=..." dark={dark} hasError={!!error} />
                        <TrashButton onClick={onClear} disabled={!hasContent} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7 }}>
                        <span style={{ fontSize: 11, color: ytId ? GREEN : 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0 }}>
                            {ytId ? '● Video detected' : '○ No video'}
                        </span>
                        <div style={{ flex: 1 }} />
                        {hasContent && <SyncModeToggle mode={data.syncMode} onChange={onSyncModeChange} dark={dark} />}
                        {hasContent && (
                            <button onClick={onToggleSync}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: syncActive ? PURPLE : 'var(--text-muted)', fontSize: 11, fontWeight: syncActive ? 500 : 400, fontFamily: 'inherit', padding: 0, transition: 'color 0.15s ease', flexShrink: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.color = PURPLE; }}
                                onMouseLeave={e => { e.currentTarget.style.color = syncActive ? PURPLE : 'var(--text-muted)'; }}>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ transform: syncOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}>
                                    <path d="M4 2l4 4-4 4" />
                                </svg>
                                {data.syncMode === 'simple' ? 'Simple Sync' : 'Advanced Sync'}
                                {syncActive && !syncOpen && (
                                    <span style={{ marginLeft: 2, opacity: 0.7 }}>
                                        {data.syncMode === 'simple' ? `· ${data.startOffset}s` : `· ${data.advancedPoints.length} pt${data.advancedPoints.length !== 1 ? 's' : ''}`}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {error && <p style={{ fontSize: 11, color: RED, margin: '4px 0 0 106px', fontFamily: 'inherit' }}>{error}</p>}
            {syncOpen && hasContent && (
                <div style={{ marginTop: 10, marginLeft: 106, paddingLeft: 14, borderLeft: '2px solid rgba(147,51,234,0.25)' }}>
                    {data.syncMode === 'simple' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: PURPLE, marginBottom: 8 }}>Simple Sync</div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>Use when the video stays aligned after bar 1.</p>
                            <Field label="Bar 1 start time (seconds)" style={{ maxWidth: 180, marginBottom: 6 }}>
                                <TextInput value={data.startOffset} onChange={onOffsetChange} placeholder="0" dark={dark} type="number" />
                            </Field>
                            {hasOffset && <button onClick={() => onOffsetChange('0')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>Reset sync</button>}
                        </div>
                    )}
                    {data.syncMode === 'advanced' && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: PURPLE, marginBottom: 8 }}>Advanced Sync</div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>Add sync points for videos that drift over time.</p>
                            {data.advancedPoints.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 28px', gap: '0 8px', marginBottom: 6 }}>
                                    {['Bar', 'Occurrence', 'Video time (s)', ''].map(h => (
                                        <div key={h} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{h}</div>
                                    ))}
                                </div>
                            )}
                            {data.advancedPoints.map((pt, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 28px', gap: '0 8px', marginBottom: 6, alignItems: 'center' }}>
                                    <TextInput value={pt.bar} onChange={v => patchPoint(i, { bar: v })} placeholder="e.g. 9" dark={dark} type="number" />
                                    <TextInput value={pt.occurrence} onChange={v => patchPoint(i, { occurrence: v })} placeholder="1" dark={dark} type="number" />
                                    <TextInput value={pt.videoTime} onChange={v => patchPoint(i, { videoTime: v })} placeholder="e.g. 32.4" dark={dark} type="number" />
                                    <button onClick={() => removePoint(i)} style={{ width: 28, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, opacity: 0.5 }}
                                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                </div>
                            ))}
                            <button onClick={addPoint} style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px dashed rgba(147,51,234,0.35)`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', color: PURPLE, fontSize: 11, fontWeight: 500, fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(147,51,234,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round"><line x1="6" y1="1" x2="6" y2="11" /><line x1="1" y1="6" x2="11" y2="6" /></svg>
                                Add sync point
                            </button>
                            {hasAdvanced && <button onClick={() => onPointsChange([])} style={{ marginTop: 8, display: 'block', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>Clear all points</button>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── AudioSlotRow ─────────────────────────────────────────────────────────────
const AudioSlotRow: React.FC<{
    label: string; hint: string; qualityNote?: string;
    slot: AudioSlotState; onFile: (file: File) => void;
    onClear: () => void; onUndoClear: () => void;
    dark: boolean; audioKey: AudioType;
}> = ({ label, hint, qualityNote, slot, onFile, onClear, onUndoClear, dark, audioKey }) => {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [audioError, setAudioError] = useState('');

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) validate(f);
    };

    const validate = (file: File) => {
        setAudioError('');
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
        if (!ACCEPTED_AUDIO.includes(ext)) { setAudioError(`Unsupported: ${ext}. Accepted: MP3, WAV, OGG, FLAC`); return; }
        onFile(file);
    };

    const hasLoaded = !!slot.loadedName && !slot.clearPending;
    const hasPending = !!slot.pendingFile;

    return (
        <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--panel-border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, fontFamily: 'inherit' }}>{label}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px', fontFamily: 'inherit' }}>{hint}</p>
            {qualityNote && (
                <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 5, background: dark ? 'rgba(147,51,234,0.07)' : 'rgba(147,51,234,0.04)', border: '1px solid rgba(147,51,234,0.18)', fontSize: 11, color: PURPLE, fontFamily: 'inherit' }}>
                    {qualityNote}
                </div>
            )}
            {hasLoaded && !hasPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '7px 12px', borderRadius: 6, background: dark ? 'rgba(30,177,54,0.08)' : 'rgba(30,177,54,0.05)', border: '1px solid rgba(30,177,54,0.25)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                    <span style={{ flex: 1, fontSize: 12, color: GREEN, fontFamily: 'inherit', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {slot.loadedName}
                    </span>
                    <button onClick={onClear} title="Remove audio" style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, color: 'var(--text-muted)', opacity: 0.7 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = RED; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            )}
            {slot.clearPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '7px 12px', borderRadius: 6, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.22)', fontSize: 12, color: RED, fontFamily: 'inherit' }}>
                    <span style={{ flex: 1 }}>Audio will be removed on save.</span>
                    <button onClick={onUndoClear} style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>Undo</button>
                </div>
            )}
            <div role="button" tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${dragOver ? PURPLE : hasPending ? GREEN : 'var(--upload-border)'}`, borderRadius: 7, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', background: dragOver ? 'rgba(147,51,234,0.04)' : 'transparent', transition: 'border-color 0.15s ease' }}>
                <span style={{ fontSize: 18 }}>{hasPending ? '✓' : '🎵'}</span>
                <span style={{ fontSize: 12, color: hasPending ? GREEN : 'var(--text-secondary)', fontWeight: hasPending ? 500 : 300, fontFamily: 'inherit', textAlign: 'center' }}>
                    {hasPending ? `Staged: ${slot.pendingFile!.name}` : hasLoaded ? 'Drop a replacement file to swap' : 'Drop file here, or click to select'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'inherit' }}>MP3 · WAV · OGG · FLAC</span>
            </div>
            <input ref={inputRef} type="file" accept={ACCEPTED_AUDIO.join(',')} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) validate(e.target.files[0]); }} />
            {audioError && <p style={{ fontSize: 11, color: RED, margin: '5px 0 0', fontFamily: 'inherit' }}>{audioError}</p>}
        </div>
    );
};

// ─── SectionNav ───────────────────────────────────────────────────────────────
const SectionNav: React.FC<{ active: SectionKey; onChange: (s: SectionKey) => void; dark: boolean }> = ({ active, onChange, dark }) => {
    const TABS: { key: SectionKey; label: string }[] = [
        { key: 'info', label: 'Song Info' }, { key: 'media', label: 'Media & Sync' }, { key: 'file', label: 'Tab File' },
    ];
    const idx = TABS.findIndex(t => t.key === active);
    return (
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--panel-border)', padding: '8px 20px', background: dark ? 'rgb(20,20,24)' : 'white' }}>
            <div style={{ position: 'relative', background: dark ? 'rgb(37,37,41)' : 'rgb(235,235,235)', borderRadius: 7, height: 34, display: 'flex', alignItems: 'center', padding: 2, boxSizing: 'border-box' }}>
                <div style={{ position: 'absolute', top: 2, left: 2, width: 'calc(33.3333% - 1.33px)', height: 'calc(100% - 4px)', background: PURPLE, borderRadius: 6, transform: `translateX(calc(${idx * 100}% + ${idx * 1.33}px))`, transition: 'transform 0.25s ease', pointerEvents: 'none', zIndex: 0 }} />
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => onChange(tab.key)} style={{ flex: 1, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 7, background: 'transparent', color: tab.key === active ? 'white' : dark ? 'rgb(148,163,184)' : 'rgb(100,100,100)', fontSize: 13, fontWeight: tab.key === active ? 500 : 300, fontFamily: 'inherit', cursor: 'pointer', position: 'relative', zIndex: 1, transition: 'color 0.25s ease' }}>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const MetadataEditorPanel: React.FC<MetadataEditorPanelProps> = ({ tabId, onClose, onSave, }) => {
    const router = useRouter();
    const dark = useDark();

    const [loadStatus, setLoadStatus] = useState<LoadStatus>(tabId ? 'loading' : 'missing-id');
    const [section, setSection] = useState<SectionKey>('info');
    const [originalFileName, setOriginalFileName] = useState('');
    const [originalUserId, setOriginalUserId] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    const [form, setFormState] = useState<FormState>({ title: '', artist: '', album: '', year: '', genre: '', difficulty: '', instrument: '', tuning: '', source: '', tempo: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'general' | VideoKey, string>>>({});
    const [dupWarning, setDupWarning] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [isDirty, setIsDirty] = useState(false);
    const [devHost] = useState(isDevHost);

    const [videos, setVideos] = useState<VideoState>(EMPTY_VIDEO_STATE());
    const [syncOpenRows, setSyncOpenRows] = useState<Set<VideoKey>>(new Set());
    const [audioSlots, setAudioSlots] = useState<AudioSlotMap>(EMPTY_AUDIO_STATE());

    const set = useCallback(<K extends keyof FormState>(k: K, v: string) => {
        setFormState(p => ({ ...p, [k]: v }));
        setErrors(p => { const n = { ...p }; delete n[k]; return n; });
        setIsDirty(true);
    }, []);

    const setVideo = useCallback((key: VideoKey, patch: Partial<VideoRowData>) => {
        setVideos(p => ({ ...p, [key]: { ...p[key], ...patch } }));
        if (patch.url !== undefined) setErrors(p => { const n = { ...p }; delete n[key]; return n; });
        setIsDirty(true);
    }, []);

    const clearVideo = useCallback((key: VideoKey) => {
        setVideos(p => ({ ...p, [key]: EMPTY_VIDEO_ROW() }));
        setSyncOpenRows(p => { const n = new Set(p); n.delete(key); return n; });
        setErrors(p => { const n = { ...p }; delete n[key]; return n; });
        setIsDirty(true);
    }, []);

    const toggleSync = useCallback((key: VideoKey) => {
        setSyncOpenRows(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
    }, []);

    const setAudioFile = useCallback((key: AudioType, file: File) => {
        setAudioSlots(p => ({ ...p, [key]: { ...p[key], pendingFile: file, clearPending: false } }));
        setIsDirty(true);
    }, []);

    const clearAudioSlot = useCallback((key: AudioType) => {
        setAudioSlots(p => ({ ...p, [key]: { ...p[key], clearPending: true, pendingFile: null } }));
        setIsDirty(true);
    }, []);

    const undoClearAudioSlot = useCallback((key: AudioType) => {
        setAudioSlots(p => ({ ...p, [key]: { ...p[key], clearPending: false } }));
        setIsDirty(true);
    }, []);

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingTimeSignature, setPendingTimeSignature] = useState<string | null>(null); // ← V3.9.2: survives applyExtractedToForm
    const [fileError, setFileError] = useState('');
    const [extractedMeta, setExtractedMeta] = useState<ExtractedMeta | null>(null);
    const [applyExtracted, setApplyExtracted] = useState<Set<string>>(new Set());
    const [dragOverTab, setDragOverTab] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const alphaTabRef = useRef<any>(null);

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!tabId) { setLoadStatus('missing-id'); return; }
        Promise.all([
            supabase.from('tabs').select('*').eq('id', tabId).single(),
            supabase.from('tab_youtube').select('*').eq('tab_id', tabId),
            supabase.from('tab_audio').select('*').eq('tab_id', tabId),
        ]).then(([{ data, error }, { data: ytRows }, { data: audioRowsData }]) => {
            if (error || !data) { setLoadStatus('not-found'); return; }
            setOriginalFileName(data.file_name && data.file_extension ? `${data.file_name}.${data.file_extension}` : '');
            setOriginalUserId(data.user_id ?? '');
            setFormState({
                title: data.title ?? '', artist: data.artist ?? '', album: data.album ?? '',
                year: data.year != null ? String(data.year) : '',
                genre: data.genre ?? '', difficulty: data.difficulty != null ? String(data.difficulty) : '',
                instrument: data.instrument ?? '', tuning: data.tuning ?? '',
                source: data.source ?? '',                      // ← V3.9.1
                tempo: data.tempo != null ? String(data.tempo) : '',
            });
            const newVideos = EMPTY_VIDEO_STATE();
            (ytRows ?? []).forEach((row: any) => {
                const key = row.video_type as VideoKey;
                if (!key || !(key in newVideos)) return;
                newVideos[key] = {
                    url: row.youtube_id ?? row.video_id ?? '',
                    syncMode: (row.sync_mode ?? row.sync_method ?? 'simple') === 'advanced' ? 'advanced' : 'simple',
                    startOffset: String(row.start_offset ?? row.simple_sync ?? 0),
                    advancedPoints: Array.isArray(row.sync_points) ? row.sync_points : Array.isArray(row.advanced_sync) ? row.advanced_sync : [],
                };
            });
            setVideos(newVideos);
            const newAudio = EMPTY_AUDIO_STATE();
            (audioRowsData ?? []).forEach((row: any) => {
                let key = row.audio_type as AudioType;
                if ((key as string) === 'reference') key = 'full_mix';
                if (!key || !(key in newAudio)) return;
                newAudio[key] = { existingId: row.id, loadedName: row.filename ?? '', loadedPath: row.file_path ?? '', pendingFile: null, clearPending: false };
            });
            setAudioSlots(newAudio);
            setLoadStatus('ready');
            setIsDirty(false);
        });
    }, [tabId]);

    const getAlphaTab = useCallback(async () => {
        if (!alphaTabRef.current) alphaTabRef.current = await import('@coderline/alphatab');
        return alphaTabRef.current;
    }, []);

    const handleTabFile = useCallback(async (file: File) => {
        setFileError(''); setExtractedMeta(null); setApplyExtracted(new Set()); setPendingFile(null);
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
        if (!ACCEPTED_EXTS.includes(ext)) { setFileError(`Unsupported: ${ext}. Accepted: ${ACCEPTED_EXTS.join(', ')}`); return; }
        try {
            const at = await getAlphaTab();
            const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer()), new at.Settings());

            // V3.9: source defaults to 'songsterr' on file stage — update to
            // 'ultimate_guitar' or 'manual_upload' as needed for other sources.
            const extracted: ExtractedMeta = {
                source: 'songsterr',
            };

            const tempoVal = score.masterBars?.[0]?.tempoAutomation?.value;
            if (tempoVal) extracted.tempo = Math.round(tempoVal);

            const mb0 = score.masterBars?.[0];
            if (mb0) extracted.timeSignature = `${mb0.timeSignatureNumerator}/${mb0.timeSignatureDenominator}`;

            const track = score.tracks?.[0];
            if (track) {
                const isPerc = track.isPercussion ?? false;
                const tunings = track.staves?.[0]?.stringTuning?.tunings;
                if (tunings?.length) {
                    const midiArr = Array.from(tunings as number[]);
                    const slug = detectTuningSlug(midiArr);
                    if (slug) extracted.tuning = slug;
                    extracted.instrument = detectInstrumentFromMidi(midiArr, isPerc) ?? undefined;
                } else if (isPerc) extracted.instrument = 'drums';
            }

            setExtractedMeta(extracted);
            setPendingTimeSignature(extracted.timeSignature ?? null);
            // V3.9.3: auto-fill Source dropdown from extracted metadata so the
            // user sees and can edit it before saving — no silent background writes.
            if (extracted.source) set('source', extracted.source);
            const auto = new Set<string>();
            if (extracted.tempo) auto.add('tempo');
            if (extracted.tuning) auto.add('tuning');
            if (extracted.instrument) auto.add('instrument');
            setApplyExtracted(auto);
            setPendingFile(file);
            setIsDirty(true);
        } catch { setFileError('Could not parse file — is this a valid Guitar Pro or MusicXML file?'); }
    }, [getAlphaTab]);

    const applyExtractedToForm = useCallback(() => {
        if (!extractedMeta) return;
        setFormState(p => ({
            ...p,
            ...(applyExtracted.has('tempo') && extractedMeta.tempo ? { tempo: String(extractedMeta.tempo) } : {}),
            ...(applyExtracted.has('tuning') && extractedMeta.tuning ? { tuning: extractedMeta.tuning } : {}),
            ...(applyExtracted.has('instrument') && extractedMeta.instrument ? { instrument: extractedMeta.instrument } : {}),
        }));
        setExtractedMeta(null); setApplyExtracted(new Set());
    }, [extractedMeta, applyExtracted]);

    const validate = useCallback((): boolean => {
        const e: Partial<Record<keyof FormState | 'general' | VideoKey, string>> = {};
        if (!form.title.trim()) e.title = 'Title is required';
        if (!form.artist.trim()) e.artist = 'Artist is required';
        if (!form.genre) e.genre = 'Genre is required';
        if (!form.difficulty) e.difficulty = 'Difficulty is required';
        if (!form.instrument) e.instrument = 'Instrument is required';
        if (!form.tuning) e.tuning = 'Tuning is required';
        if (form.year) { const y = Number(form.year); if (isNaN(y) || y < 1900 || y > new Date().getFullYear() + 1) e.year = 'Enter a valid year (1900–present)'; }
        // Tempo is optional — only validate range if the user typed something
        if (form.tempo) { const t = Number(form.tempo); if (isNaN(t) || t < 30 || t > 300) e.tempo = 'Tempo must be 30–300 BPM'; }
        for (const { key } of VIDEO_ROWS) {
            if (videos[key].url.trim() && !isValidYouTubeInput(videos[key].url))
                (e as any)[key] = 'Could not extract a valid YouTube video ID from this URL';
        }
        setErrors(e); return Object.keys(e).length === 0;
    }, [form, videos]);

    const checkDuplicate = useCallback(async () => {
        const { data } = await supabase.from('tabs').select('id')
            .ilike('title', form.title.trim()).ilike('artist', form.artist.trim()).neq('id', tabId ?? '');
        setDupWarning(data?.length ? `"${form.artist.trim()} — ${form.title.trim()}" already exists. Review before saving.` : '');
    }, [form.title, form.artist, tabId]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!validate() || !tabId) return;
        setSaveStatus('saving'); setDupWarning('');
        await checkDuplicate();
        try {
            // ── A. Tab file replacement ────────────────────────────────────────
            // V+1 fix: originalUserId is '' for legacy seeded songs (user_id = null in DB).
            // Fall back to public/tabId/filename for legacy rows without a user_id.
            if (pendingFile) {
                const ext = pendingFile.name.split('.').pop()!;
                const base = pendingFile.name.replace(/\.[^.]+$/, '');
                const storagePath = originalUserId
                    ? `${originalUserId}/${tabId}/${pendingFile.name}`
                    : `public/${tabId}/${pendingFile.name}`;
                const { error: upErr } = await supabase.storage.from('tabs').upload(storagePath, pendingFile, { upsert: true });
                if (upErr) throw upErr;
                const { error: fpErr } = await supabase.from('tabs').update({
                    file_name: base, file_extension: ext, file_path: storagePath,
                }).eq('id', tabId);
                if (fpErr) throw fpErr;
                setOriginalFileName(`${base}.${ext}`);
                setPendingFile(null);
            }

            // ── B. Per-slot tab_audio upsert / delete ─────────────────────────
            for (const key of AUDIO_KEYS) {
                const slot = audioSlots[key];
                if (slot.pendingFile && originalUserId) {
                    const audioPath = `${originalUserId}/${tabId}/audio/${key}/${slot.pendingFile.name}`;
                    const { error: auErr } = await supabase.storage.from('tabs').upload(audioPath, slot.pendingFile, { upsert: true });
                    if (auErr) throw auErr;
                    const payload = { tab_id: tabId, audio_type: key, filename: slot.pendingFile.name, file_path: audioPath, sync_mode: 'simple', simple_sync: 0, advanced_sync: [] };
                    if (slot.existingId) {
                        const { error: updErr } = await supabase.from('tab_audio').update(payload).eq('id', slot.existingId);
                        if (updErr) throw updErr;
                    } else {
                        const { data: inserted, error: insErr } = await supabase.from('tab_audio').insert(payload).select('id').single();
                        if (insErr) throw insErr;
                        if (inserted) setAudioSlots(p => ({ ...p, [key]: { ...p[key], existingId: inserted.id, loadedName: slot.pendingFile!.name, loadedPath: audioPath, pendingFile: null } }));
                    }
                    if (slot.existingId) setAudioSlots(p => ({ ...p, [key]: { ...p[key], loadedName: slot.pendingFile!.name, loadedPath: audioPath, pendingFile: null } }));
                } else if (slot.clearPending && slot.existingId) {
                    const { error: delErr } = await supabase.from('tab_audio').delete().eq('id', slot.existingId);
                    if (delErr) throw delErr;
                    setAudioSlots(p => ({ ...p, [key]: EMPTY_AUDIO_SLOT() }));
                }
            }

            // ── C. Core metadata ───────────────────────────────────────────────
            // V3.9: time_signature + source written only when a file is staged —
            // prevents wiping these fields on metadata-only saves.
            const metadataPatch: any = {
                title: form.title.trim(),
                artist: form.artist.trim(),
                album: form.album.trim() || null,
                year: form.year ? parseInt(form.year) : null,
                genre: form.genre || null,
                difficulty: form.difficulty ? parseInt(form.difficulty) : null,
                instrument: form.instrument || null,
                tuning: form.tuning || null,
                tempo: form.tempo ? parseInt(form.tempo) : null,
                source: form.source || null,                    // ← V3.9.1: always from form
            };

            if (pendingFile && pendingTimeSignature) {
                metadataPatch.time_signature = pendingTimeSignature; // ← V3.9.2: survives Apply button
            }
            // source is now form-driven — remove the extractedMeta fallback


            const { error: metaErr } = await supabase.from('tabs').update(metadataPatch).eq('id', tabId);
            if (metaErr) throw metaErr;

            // ── D. tab_youtube upsert / delete ─────────────────────────────────
            const { data: existingYt, error: ytFetchErr } = await supabase.from('tab_youtube').select('id, video_type').eq('tab_id', tabId);
            if (ytFetchErr) throw ytFetchErr;
            const existingMap = new Map<string, string>((existingYt ?? []).map((r: any) => [r.video_type as string, r.id as string]));
            for (const key of VIDEO_KEYS) {
                const v = videos[key];
                const ytId = extractYouTubeId(v.url);
                if (ytId) {
                    const payload = { tab_id: tabId, video_id: ytId, video_type: key, youtube_id: ytId, sync_mode: v.syncMode, start_offset: parseFloat(v.startOffset) || 0, sync_points: v.syncMode === 'advanced' ? v.advancedPoints : [] };
                    if (existingMap.has(key)) {
                        const { error: updErr } = await supabase.from('tab_youtube').update(payload).eq('id', existingMap.get(key)!);
                        if (updErr) throw updErr;
                    } else {
                        const { error: insErr } = await supabase.from('tab_youtube').insert(payload);
                        if (insErr) throw insErr;
                    }
                } else if (existingMap.has(key)) {
                    const { error: delErr } = await supabase.from('tab_youtube').delete().eq('id', existingMap.get(key)!);
                    if (delErr) throw delErr;
                }
            }

            const wasFileReplacement = !!pendingFile;
            setSaveStatus('success');
            setIsDirty(false);
            setPendingTimeSignature(null);
            if (tabId) onSave?.(tabId, { title: form.title.trim(), artist: form.artist.trim(), album: form.album.trim() || undefined });
            // V3.9.3: after file replacement, jump to Song Info so user can verify
            // extracted metadata. Metadata-only saves stay on current section.
            if (wasFileReplacement) setSection('info');
            setTimeout(() => setSaveStatus('idle'), 3000);

        } catch (err) {
            console.error('❌ MetadataEditorPanel save error:', err);
            const sbErr = err as any;
            const msg = sbErr?.message || sbErr?.details || sbErr?.hint
                ? `${sbErr.message ?? ''}${sbErr.details ? ` — ${sbErr.details}` : ''}`.trim()
                : 'Save failed — check console for details';
            setErrors(p => ({ ...p, general: msg }));
            setSaveStatus('error');
        }
    }, [form, videos, audioSlots, validate, checkDuplicate, pendingFile, extractedMeta, originalUserId, tabId]);

    const handleBack = useCallback(() => {
        if (onClose) { onClose(); return; }
        if (typeof window !== 'undefined' && window.history.length > 1) router.back();
        else router.push('/');
    }, [router, onClose]);

    const songLabel = [form.artist, form.title].filter(Boolean).join(' — ') || 'New Tab';
    const panelBg = dark ? 'rgb(20,20,24)' : '#fff';
    const headerBg = dark ? 'rgb(23,23,27)' : 'rgb(250,250,252)';

    return (
        <>
            <div onClick={handleBack} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 109 }} />
            <div style={{ position: 'fixed', top: 102, left: '50%', transform: 'translateX(-50%)', width: 846, maxWidth: 'calc(100vw - 32px)', height: 750, maxHeight: 'calc(100vh - 120px)', background: panelBg, borderRadius: 4, boxShadow: 'rgba(0,0,0,0.18) 0px 20px 40px -8px, rgba(0,0,0,0.12) 0px 10px 16px -6px', zIndex: 110, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', fontWeight: 300, color: 'var(--text-primary)' }}>

                {/* ── Sticky header ── */}
                <div style={{ flexShrink: 0, height: 56, background: headerBg, borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', padding: '0 16px 0 12px', gap: 10 }}>
                    <BackButton onClick={handleBack} dark={dark} />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgb(120,120,135)', marginBottom: 2, fontFamily: 'inherit' }}>Edit Metadata</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: dark ? 'rgb(220,220,232)' : 'rgb(30,30,40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 480, margin: '0 auto' }}>{songLabel}</div>
                    </div>
                    {loadStatus === 'ready' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <HelpTrayButton onClick={() => setShowHelp(v => !v)} dark={dark} />
                            <SaveTrayButton status={saveStatus} onClick={handleSave} dark={dark} isDirty={isDirty} />
                        </div>
                    )}
                </div>

                {loadStatus === 'loading' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}
                {loadStatus === 'missing-id' && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}><div style={{ fontSize: 16, fontWeight: 600 }}>No tab ID provided</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Expected: /meta-editor?id=&lt;tabId&gt;</div></div>}
                {loadStatus === 'not-found' && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}><div style={{ fontSize: 16, fontWeight: 600 }}>Tab not found</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tab exists with id "{tabId}"</div></div>}

                {loadStatus === 'ready' && (
                    <>
                        <SectionNav active={section} onChange={setSection} dark={dark} />
                        <main style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '28px 28px 48px' }}>
                            {errors.general && <Banner type="error">{errors.general}</Banner>}
                            {dupWarning && <Banner type="warning">⚠️ {dupWarning}</Banner>}
                            {saveStatus === 'success' && !errors.general && (
                                <Banner type="success">
                                    {section === 'info'
                                        ? '✓ File replaced successfully. Review extracted metadata below.'
                                        : '✓ Changes saved successfully'}
                                </Banner>
                            )}

                            {/* ════════ SONG INFO ════════ */}
                            {section === 'info' && (
                                <div>
                                    <TabHero icon={<IconSongInfo />} title="Song Info" sub="Core identity, genre, and playability details for this tab." dark={dark} />
                                    <Divider label="Identity" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                        <Field label="Title" required error={errors.title}><TextInput value={form.title} onChange={v => set('title', v)} placeholder="Song title" dark={dark} hasError={!!errors.title} /></Field>
                                        <Field label="Artist" required error={errors.artist}><TextInput value={form.artist} onChange={v => set('artist', v)} placeholder="Artist name" dark={dark} hasError={!!errors.artist} /></Field>
                                        <Field label="Album"><TextInput value={form.album} onChange={v => set('album', v)} placeholder="Album name" dark={dark} /></Field>
                                        <Field label="Year" error={errors.year}><TextInput value={form.year} onChange={v => set('year', v)} placeholder="e.g. 1990" dark={dark} type="number" hasError={!!errors.year} /></Field>
                                    </div>
                                    <Divider label="Classification" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                        <Field label="Genre" required error={errors.genre}><SelectInput value={form.genre} onChange={v => set('genre', v)} options={GENRE_OPTIONS} placeholder="Select genre" dark={dark} hasError={!!errors.genre} /></Field>
                                        <Field label="Difficulty" required error={errors.difficulty}><SelectInput value={form.difficulty} onChange={v => set('difficulty', v)} options={DIFFICULTY_OPTIONS} placeholder="Select difficulty" dark={dark} hasError={!!errors.difficulty} /></Field>
                                        <Field label="Instrument" required error={errors.instrument}><SelectInput value={form.instrument} onChange={v => set('instrument', v)} options={INSTRUMENT_OPTIONS} placeholder="Select instrument" dark={dark} hasError={!!errors.instrument} /></Field>
                                        <Field label="Tuning" required error={errors.tuning}><SelectInput value={form.tuning} onChange={v => set('tuning', v)} options={TUNINGS} placeholder="Select tuning" dark={dark} hasError={!!errors.tuning} /></Field>
                                    </div>
                                    {/* Source | Tempo — technical metadata row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                                        <Field label="Source">
                                            <SelectInput value={form.source} onChange={v => set('source', v)} options={SOURCE_OPTIONS} placeholder="Select source" dark={dark} />
                                        </Field>
                                        <Field label="Tempo (BPM)" error={errors.tempo}>
                                            <TextInput value={form.tempo} onChange={v => set('tempo', v)} placeholder="e.g. 120" dark={dark} type="number" hasError={!!errors.tempo} style={{ maxWidth: 180 }} />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* ════════ MEDIA & SYNC ════════ */}
                            {section === 'media' && (
                                <div>
                                    <TabHero icon={<IconMedia />} title="Media & Sync" sub="Link YouTube videos and upload audio tracks for this tab." dark={dark} />
                                    <div style={{ marginBottom: 16, borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', overflow: 'visible', fontSize: 13, fontFamily: 'inherit' }}>
                                        {devHost && (
                                            <div style={{ padding: '7px 12px', background: 'rgba(6,182,212,0.10)', color: 'rgb(8,145,178)', lineHeight: '1.55', borderBottom: '1px solid rgba(6,182,212,0.22)' }}>
                                                <strong>Dev tip:</strong> YouTube embeds may not work on 127.0.0.1. Use <code style={{ fontFamily: 'monospace' }}>localhost</code> instead.
                                            </div>
                                        )}
                                        <div style={{ padding: '7px 12px', background: 'rgba(6,182,212,0.04)', color: 'rgb(8,145,178)', lineHeight: '1.6' }}>
                                            Test sync in the player after saving. Start with <strong>Simple Sync</strong> and only use <strong>Advanced Sync</strong> if the video drifts.{' '}
                                            <button onClick={() => setShowHelp(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'rgb(8,145,178)', fontSize: 13, fontWeight: 600, textDecoration: 'underline', fontFamily: 'inherit' }}>
                                                See Help for details.
                                            </button>
                                        </div>
                                    </div>
                                    <Divider label="YouTube Videos" />
                                    {VIDEO_ROWS.map(({ key, label }) => (
                                        <VideoRow key={key} label={label} data={videos[key]}
                                            onUrlChange={url => setVideo(key, { url })}
                                            onSyncModeChange={syncMode => setVideo(key, { syncMode })}
                                            onOffsetChange={startOffset => setVideo(key, { startOffset })}
                                            onPointsChange={advancedPoints => setVideo(key, { advancedPoints })}
                                            onClear={() => clearVideo(key)}
                                            syncOpen={syncOpenRows.has(key)}
                                            onToggleSync={() => toggleSync(key)}
                                            dark={dark}
                                            error={(errors as any)[key]}
                                        />
                                    ))}
                                    <Divider label="Audio Tracks" />
                                    <div style={{ marginBottom: 16, borderRadius: 6, border: '1px solid rgba(6,182,212,0.3)', fontSize: 13, fontFamily: 'inherit' }}>
                                        <div style={{ padding: '7px 12px', background: 'rgba(6,182,212,0.04)', color: 'rgb(8,145,178)', lineHeight: '1.6' }}>
                                            Upload optional audio playback files. Each slot is stored independently and can be selected as a playback source when audio mode is enabled.
                                        </div>
                                    </div>
                                    {AUDIO_ROWS.map(({ key, label, hint, qualityNote }) => (
                                        <AudioSlotRow key={key} audioKey={key} label={label} hint={hint} qualityNote={qualityNote}
                                            slot={audioSlots[key]}
                                            onFile={file => setAudioFile(key, file)}
                                            onClear={() => clearAudioSlot(key)}
                                            onUndoClear={() => undoClearAudioSlot(key)}
                                            dark={dark}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* ════════ TAB FILE ════════ */}
                            {section === 'file' && (
                                <div>
                                    <TabHero icon={<IconTabFile />} title="Tab File" sub="Replace the Guitar Pro or MusicXML source file for this tab." dark={dark} />
                                    <Divider label="Current File" />
                                    {originalFileName && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 16, padding: '7px 12px', borderRadius: 6, background: dark ? 'rgba(255,255,255,0.04)' : 'rgb(248,248,250)', border: '1px solid var(--panel-border)' }}>
                                            <FileIcon />
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>{originalFileName}</span>
                                        </div>
                                    )}
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px', fontFamily: 'inherit' }}>
                                        Drop a new file below to replace the current one. Metadata will be extracted automatically.
                                    </p>
                                    <div role="button" tabIndex={0}
                                        onClick={() => fileInputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                                        onDragOver={e => { e.preventDefault(); setDragOverTab(true); }}
                                        onDragLeave={() => setDragOverTab(false)}
                                        onDrop={e => { e.preventDefault(); setDragOverTab(false); if (e.dataTransfer.files[0]) handleTabFile(e.dataTransfer.files[0]); }}
                                        style={{ border: `2px dashed ${dragOverTab ? PURPLE : pendingFile ? GREEN : 'var(--upload-border)'}`, borderRadius: 8, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', background: dragOverTab ? 'rgba(147,51,234,0.04)' : 'transparent', transition: 'border-color 0.15s ease' }}>
                                        <span style={{ fontSize: 22 }}>{pendingFile ? '✓' : '🗂️'}</span>
                                        <span style={{ fontSize: 13, color: pendingFile ? GREEN : 'var(--text-secondary)', fontWeight: pendingFile ? 500 : 300 }}>
                                            {pendingFile ? `Staged: ${pendingFile.name}` : 'Drop replacement file here, or click to select'}
                                        </span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ACCEPTED_EXTS.join('  ·  ')}</span>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS.join(',')} style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleTabFile(e.target.files[0]); }} />
                                    {fileError && <p style={{ fontSize: 12, color: RED, margin: '6px 0 0' }}>{fileError}</p>}

                                    {extractedMeta && (
                                        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(147,51,234,0.3)', background: 'rgba(147,51,234,0.05)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: PURPLE, marginBottom: 10 }}>Extracted from file</div>
                                            {extractedMeta.timeSignature && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                    Time signature: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{extractedMeta.timeSignature}</strong>
                                                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>(will be saved)</span>
                                                </div>
                                            )}
                                            {extractedMeta.source && (
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                    Source: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{extractedMeta.source}</strong>
                                                    <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>(will be saved)</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {([
                                                    { key: 'tempo', label: 'Tempo', display: extractedMeta.tempo ? `${extractedMeta.tempo} BPM` : null },
                                                    { key: 'instrument', label: 'Instrument', display: extractedMeta.instrument ? (INSTRUMENT_OPTIONS.find(o => o.value === extractedMeta.instrument)?.label ?? extractedMeta.instrument) : null },
                                                    { key: 'tuning', label: 'Tuning', display: extractedMeta.tuning ? (TUNINGS.find(t => t.value === extractedMeta.tuning)?.label ?? extractedMeta.tuning) : null },
                                                ] as const).filter(r => r.display).map(row => (
                                                    <label key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                                                        onClick={() => setApplyExtracted(prev => { const n = new Set(prev); n.has(row.key) ? n.delete(row.key) : n.add(row.key); return n; })}>
                                                        <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, border: `1px solid ${applyExtracted.has(row.key) ? PURPLE : 'var(--upload-border)'}`, background: applyExtracted.has(row.key) ? PURPLE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s ease' }}>
                                                            {applyExtracted.has(row.key) && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                                                        </div>
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                                                            {row.label}: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.display}</strong>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                            {applyExtracted.size > 0 && (
                                                <button onClick={applyExtractedToForm}
                                                    style={{ marginTop: 12, padding: '5px 14px', background: PURPLE, color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s ease' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = PURPLE_HOVER; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = PURPLE; }}>
                                                    Apply selected ({applyExtracted.size}) → Song Info
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </main>
                        {showHelp && <HelpModal section={section} dark={dark} onClose={() => setShowHelp(false)} />}
                    </>
                )}
            </div>
        </>
    );
};