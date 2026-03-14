'use client';

/**
 * NewTabPanel.tsx
 * V4 — Corrected visual hierarchy. No oklch, no rgba on text/buttons.
 *
 * Color contract (light mode):
 *   Primary text:    rgb(12,12,12)      ← near-black, headings / labels / key copy
 *   Secondary text:  rgb(70,70,70)      ← readable medium gray for helper copy
 *   Muted microcopy: rgb(120,120,120)   ← placeholder / privacy note / timestamps
 *   Purple:          rgb(109,40,217)    hover → rgb(124,58,237)
 *   Orange:          rgb(234,88,12)
 *   Green (link):    rgb(4,120,87)      ← strong readable green (not faded)
 *   Gray button bg:  rgb(237,237,239)   ← ONLY for explicitly disabled / neutral
 *   Input border:    rgb(209,211,213)
 *
 * Dark mode palette unchanged from V3.
 *
 * Rules enforced:
 *   1. Primary text is near-black — rgb(12,12,12) — not gray.
 *   2. Only secondary/helper copy uses gray.
 *   3. Interactive elements use accent colors; disabled-look reserved for disabled state.
 *   4. "Select File" button → purple accent, not neutral gray.
 *   5. "use YouTube link" → rgb(4,120,87), solid and intentional.
 *   6. Upload button enabled → C.purple; disabled → C.btnGrayBg.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/alphaTab/supabase';

export interface NewTabPanelProps {
    isOpen: boolean;
    onClose: () => void;
    theme?: 'light' | 'dark';
}

type FileStatus = 'validating' | 'valid' | 'invalid';

interface TabFile {
    file: File; name: string; status: FileStatus;
    title: string; artist: string; error: string;
}

interface AISettings {
    tsAuto: boolean; tsNum: number; tsDen: number;
    puAuto: boolean; puNum: number; puDen: number;
    bpmAuto: boolean; bpm: number;
    tripletAuto: boolean; tripletFeel: TripletFeel;
    instrumentMode: 'auto' | 'manual';
}

type TripletFeel = '8th' | 'Dotted 8th' | '16th' | 'No';

const TRIPLET_OPTIONS: TripletFeel[] = ['8th', 'Dotted 8th', '16th', 'No'];
const ACCEPTED_EXTS = ['.gp', '.gpx', '.gp3', '.gp4', '.gp5', '.gp8', '.musicxml', '.capx'] as const;
const ACCEPTED_EXTENSIONS = ACCEPTED_EXTS.join(',');
const MAX_FILES = 10;

const DEFAULT_SETTINGS: AISettings = {
    tsAuto: true, tsNum: 4, tsDen: 4,
    puAuto: true, puNum: 4, puDen: 4,
    bpmAuto: true, bpm: 120,
    tripletAuto: true, tripletFeel: '8th',
    instrumentMode: 'auto',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const YouTubeLogo: React.FC = () => (
    <svg width="56" height="40" viewBox="0 0 56 40" xmlns="http://www.w3.org/2000/svg" aria-label="YouTube">
        <path d="M54.84 6.26A7.04 7.04 0 0 0 49.9 1.3C45.56 0 28 0 28 0S10.44 0 6.1 1.3A7.04 7.04 0 0 0 1.16 6.26C0 10.62 0 20 0 20s0 9.38 1.16 13.74A7.04 7.04 0 0 0 6.1 38.7C10.44 40 28 40 28 40s17.56 0 21.9-1.3a7.04 7.04 0 0 0 4.94-4.96C56 29.38 56 20 56 20s0-9.38-1.16-13.74Z" fill="#FF0000" />
        <path d="M22.4 28.57 36.92 20 22.4 11.43v17.14Z" fill="#FFF" />
    </svg>
);

const AIBadge: React.FC = () => (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="9" cy="14" r="1" fill="white" stroke="none" />
            <circle cx="15" cy="14" r="1" fill="white" stroke="none" />
        </svg>
    </div>
);

const TabSheetIcon: React.FC<{ dark: boolean }> = ({ dark }) => (
    <div style={{ width: 48, height: 48, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${dark ? '#475569' : '#cbd5e1'}`, background: dark ? '#1e293b' : '#f1f5f9' }}>
        <svg width="36" height="36" viewBox="0 0 72 54">
            {[9, 18, 27, 36, 45].map((y, i) => (
                <line key={i} x1="4" y1={y} x2="68" y2={y} stroke={dark ? '#475569' : '#94a3b8'} strokeWidth="1.4" />
            ))}
            <text x="8" y="16" fontSize="9" fill={dark ? '#94a3b8' : '#64748b'} fontFamily="monospace">4</text>
            <text x="8" y="29" fontSize="9" fill={dark ? '#94a3b8' : '#64748b'} fontFamily="monospace">2</text>
            <text x="22" y="10" fontSize="9" fill={dark ? '#94a3b8' : '#64748b'} fontFamily="monospace">0</text>
            <text x="38" y="23" fontSize="9" fill={dark ? '#94a3b8' : '#64748b'} fontFamily="monospace">3</text>
        </svg>
    </div>
);

// Dashed arrow — solid rgb colors, no oklch
const StepArrow: React.FC<{ dark: boolean }> = ({ dark }) => (
    <svg width="72" height="11" viewBox="0 0 97 15" fill="none" aria-hidden>
        <line x1="0" y1="7.5" x2="88" y2="7.5"
            stroke={dark ? 'rgb(75,85,99)' : 'rgb(180,180,190)'}
            strokeWidth="1.5" strokeDasharray="6 4" />
        <path d="M86 3l8 4.5-8 4.5"
            stroke={dark ? 'rgb(100,116,139)' : 'rgb(150,150,165)'}
            strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const StatusBadge: React.FC<{ status: FileStatus }> = ({ status }) => {
    const styles: Record<FileStatus, { bg: string; color: string; label: string }> = {
        validating: { bg: 'rgba(59,130,246,0.15)', color: 'rgb(29,78,216)', label: 'Validating…' },
        valid: { bg: 'rgba(34,197,94,0.15)', color: 'rgb(21,128,61)', label: '✓ Valid' },
        invalid: { bg: 'rgba(239,68,68,0.15)', color: 'rgb(185,28,28)', label: '✗ Invalid' },
    };
    const s = styles[status];
    return (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, flexShrink: 0 }}>
            {s.label}
        </span>
    );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

interface SpinnerProps { value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean; dark: boolean; }

const Spinner: React.FC<SpinnerProps> = ({ value, onChange, min = 1, max = 64, disabled, dark }) => (
    <div style={{ display: 'flex', border: `1px solid ${dark ? 'rgb(51,65,85)' : 'rgb(203,213,225)'}`, borderRadius: 4, overflow: 'hidden' }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled}
            style={{ width: 28, height: 28, background: dark ? 'rgb(30,41,59)' : 'rgb(241,245,249)', color: dark ? 'rgb(148,163,184)' : 'rgb(100,116,139)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1 }}>−</button>
        <span style={{ width: 36, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: dark ? 'rgb(15,23,42)' : 'white', color: dark ? 'rgb(226,232,240)' : 'rgb(12,12,12)' }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled}
            style={{ width: 28, height: 28, background: dark ? 'rgb(30,41,59)' : 'rgb(241,245,249)', color: dark ? 'rgb(148,163,184)' : 'rgb(100,116,139)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1 }}>+</button>
    </div>
);

// ─── Settings Row ─────────────────────────────────────────────────────────────

const SettingsRow: React.FC<{ label: string; auto: boolean; onAutoToggle: () => void; dark: boolean; children: React.ReactNode }> =
    ({ label, auto, onAutoToggle, dark, children }) => (
        <div style={{ display: 'grid', gridTemplateColumns: '170px 80px 1fr', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: dark ? 'rgb(148,163,184)' : 'rgb(70,70,70)' }}>{label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={onAutoToggle}>
                <div style={{ width: 16, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${auto ? 'rgb(124,58,237)' : dark ? 'rgb(71,85,105)' : 'rgb(156,163,175)'}`, background: auto ? 'rgb(124,58,237)' : 'transparent' }}>
                    {auto && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                </div>
                <span style={{ fontSize: 12, color: dark ? 'rgb(100,116,139)' : 'rgb(120,120,120)' }}>Auto</span>
            </label>
            <div style={{ opacity: auto ? 0.3 : 1, pointerEvents: auto ? 'none' : 'auto' }}>{children}</div>
        </div>
    );

// ─── Main Component ───────────────────────────────────────────────────────────

export const NewTabPanel: React.FC<NewTabPanelProps> = ({ isOpen, onClose, theme = 'dark' }) => {
    const router = useRouter();
    const dark = theme === 'dark';

    /**
     * Single color source of truth.
     *
     * Light-mode hierarchy:
     *   text        → rgb(12,12,12)     Primary: headings, labels, file names, button text on light bg
     *   textSub     → rgb(70,70,70)     Secondary: helper copy, artist/title meta, step labels
     *   textMuted   → rgb(120,120,120)  Microcopy: privacy note, placeholder, OR divider label
     *   green       → rgb(4,120,87)     Accent link: "use YouTube link" — strong, intentional
     *   purple      → rgb(109,40,217)   Primary CTA accent
     *   purpleHover → rgb(124,58,237)
     *   orange      → rgb(234,88,12)    Transcribe CTA
     *   btnGrayBg   → rgb(237,237,239)  ONLY used for disabled / neutral states
     *   btnGrayText → rgb(120,120,120)  Text on disabled gray buttons
     */
    const C = {
        // ── text ──
        // Dark mode bumped toward near-white; light mode pure black.
        // Higher contrast stops the "halation" glow on dark backgrounds.
        text: dark ? 'rgb(240,240,240)' : 'rgb(0,0,0)',
        textSub: dark ? 'rgb(180,190,210)' : 'rgb(55,55,55)',
        textMuted: dark ? 'rgb(130,140,160)' : 'rgb(110,110,110)',
        // ── surfaces ──
        panelBg: dark ? 'rgb(37,37,41)' : 'rgb(255,255,255)',
        sectionBg: dark ? 'rgb(15,23,42)' : 'rgb(255,255,255)',
        sectionBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        uploadBg: dark ? 'rgba(15,23,42,0.6)' : 'rgb(250,250,252)',
        uploadBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        inputBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        dividerLine: dark ? 'rgb(51,65,85)' : 'rgb(220,220,225)',
        // ── interactive ──
        // purple-600/700 matches established Tailwind brand (see SpeedControl reset button)
        purple: 'rgb(147,51,234)',
        purpleHover: 'rgb(126,34,206)',
        orange: 'rgb(234,88,12)',
        green: dark ? 'rgb(52,211,153)' : 'rgb(4,120,87)',
        // ── neutral — ONLY for the secondary "Create blank tab" action ──
        btnGrayBg: dark ? 'rgb(51,65,85)' : 'rgb(237,237,239)',
        btnGrayText: dark ? 'rgb(203,213,225)' : 'rgb(12,12,12)',
    };

    // ── Auth ──────────────────────────────────────────────────────────────────
    const [userId, setUserId] = useState<string | null>(null);
    useEffect(() => {
        let mounted = true;
        supabase.auth.getUser().then(({ data }) => { if (mounted) setUserId(data.user?.id ?? null); });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
        return () => { mounted = false; sub.subscription.unsubscribe(); };
    }, []);

    // ── AlphaTab lazy cache ───────────────────────────────────────────────────
    const alphaTabRef = useRef<any>(null);
    const getAlphaTab = useCallback(async () => {
        if (!alphaTabRef.current) alphaTabRef.current = await import('@coderline/alphatab');
        return alphaTabRef.current;
    }, []);

    // ── State ─────────────────────────────────────────────────────────────────
    const [ytUrl, setYtUrl] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
    const [dragOver, setDragOver] = useState(false);
    const [dropHover, setDropHover] = useState(false);
    const [audioHover, setAudioHover] = useState(false);
    const [files, setFiles] = useState<TabFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadLog, setUploadLog] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasValidFiles = files.some(f => f.status === 'valid');
    const setSetting = useCallback(<K extends keyof AISettings>(k: K, v: AISettings[K]) => setSettings(s => ({ ...s, [k]: v })), []);

    const validateFile = useCallback(async (file: File): Promise<Omit<TabFile, 'file' | 'name'>> => {
        try {
            const at = await getAlphaTab();
            const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer()), new at.Settings());
            return { status: 'valid', title: score.title || file.name.replace(/\.[^.]+$/, ''), artist: score.artist || 'Unknown Artist', error: '' };
        } catch (err) {
            return { status: 'invalid', title: '', artist: '', error: err instanceof Error ? err.message : 'Parse failed' };
        }
    }, [getAlphaTab]);

    const processFiles = useCallback(async (raw: FileList | File[]) => {
        const list = Array.from(raw).slice(0, MAX_FILES);
        const entries = list.map<TabFile>(f => ({ file: f, name: f.name, status: 'validating', title: '', artist: '', error: '' }));
        setFiles(prev => [...prev, ...entries]);
        for (const entry of entries) {
            const result = await validateFile(entry.file);
            setFiles(prev => prev.map(p => p.name === entry.name ? { ...p, ...result } : p));
        }
    }, [validateFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const handleUpload = useCallback(async () => {
        if (!userId) return;
        const valid = files.filter(f => f.status === 'valid');
        if (!valid.length) return;
        setIsUploading(true); setUploadLog([]);
        let firstId: string | null = null;
        for (const f of valid) {
            try {
                const { data: row, error: e1 } = await supabase.from('tabs').insert({ title: f.title, artist: f.artist, user_id: userId, status: 'draft' }).select('id').single();
                if (e1) throw e1;
                const path = `${userId}/${row.id}/${f.file.name}`;
                const { error: e2 } = await supabase.storage.from('tabs').upload(path, f.file);
                if (e2) throw e2;
                const { error: e3 } = await supabase.from('tabs').update({ file_path: path, status: 'ready' }).eq('id', row.id);
                if (e3) throw e3;
                setUploadLog(p => [...p, `✓ ${f.artist} — ${f.title}`]);
                if (!firstId) firstId = row.id;
            } catch (err) {
                setUploadLog(p => [...p, `✗ ${f.name}: ${err instanceof Error ? err.message : JSON.stringify(err)}`]);
            }
        }
        setIsUploading(false);
        if (firstId) router.push(`/tab/${firstId}?open=meta`);
    }, [files, userId, router]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop — soft dark dim, no blur.
                Uses --overlay-modal CSS variable so all future modals
                stay consistent from a single source of truth in globals.css.
                Light mode: rgba(0,0,0,0.35) — panel pops without white washout.
                Dark mode:  rgba(0,0,0,0.65) — deeper subdued dim. */}
            <div
                className="fixed inset-0"
                style={{
                    zIndex: 109,
                    backgroundColor: 'var(--overlay-modal)',
                    transition: 'background-color 0.3s ease',
                    cursor: 'default',
                }}
                onClick={e => { e.stopPropagation(); onClose(); }}
            />

            {/* Panel */}
            <main
                id="panel-newtab"
                style={{
                    position: 'fixed', zIndex: 110,
                    top: 88, left: 'calc(50% - 423px)',  // 80px tray + 8px gap
                    width: 846, maxHeight: 'calc(100vh - 96px)',  // 80px tray + 8px gap + 8px bottom breathe
                    overflowY: 'auto', overscrollBehavior: 'contain',
                    borderRadius: 4,
                    padding: '45px 15px 40px 28px',
                    background: C.panelBg,
                    color: C.text,
                    boxShadow: 'var(--shadow-elevation)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                    fontWeight: dark ? 400 : 300,
                    WebkitFontSmoothing: dark ? 'antialiased' : 'subpixel-antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility' as const,
                    lineHeight: '1.4',
                    textAlign: 'center',
                    willChange: 'transform',
                }}
            >
                {/* ── AI SECTION ───────────────────────────────────────────── */}
                <section style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.sectionBdr}`, marginBottom: 24 }}>

                    {/* Coming Soon badge */}
                    <span style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 2,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'white', padding: '2px 8px', borderRadius: 999,
                        background: 'linear-gradient(135deg, rgb(124,58,237), rgb(79,70,229))',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.45)',
                    }}>Coming Soon</span>

                    <div style={{ padding: '28px 24px 24px', background: C.sectionBg }}>
                        {/* Title */}
                        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: C.text }}>
                            Transcribe tabs instantly with AI
                        </h1>
                        <p style={{ fontSize: 12, margin: '0 0 24px', color: C.textSub }}>
                            Paste a YouTube link and let AI create accurate guitar, bass, and drum tabs in minutes
                        </p>

                        {/* 3-step row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', justifyItems: 'center', width: '100%', marginBottom: 16 }}>
                            {[
                                { icon: <YouTubeLogo />, label: 'YouTube link', arrow: true },
                                { icon: <AIBadge />, label: 'Rapid AI transcription', arrow: true },
                                { icon: <TabSheetIcon dark={dark} />, label: 'Accurate tab', arrow: false },
                            ].map(({ icon, label, arrow }) => (
                                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56 }}>
                                        {arrow && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}><StepArrow dark={dark} /></div>}
                                        {icon}
                                    </div>
                                    {/* Step labels are secondary — they describe, not act */}
                                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: C.textSub }}>{label}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Form — 649px, ml:65, mr:55 per DevTools */}
                        <div style={{ width: 649, marginLeft: 65, marginRight: 55, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>

                            {/* new-tab-form-content — 649×~95, mt:25, mb:15 */}
                            <div id="new-tab-form-content" style={{ width: '100%', marginTop: 25, marginBottom: 15, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                {/* Audio/YouTube input — hover border mirrors Songsterr dashed input hover */}
                                <div
                                    onMouseEnter={() => setAudioHover(true)}
                                    onMouseLeave={() => setAudioHover(false)}
                                    style={{
                                        width: 388, minHeight: 55,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: `2px dashed ${audioHover ? (dark ? 'rgb(200,210,220)' : 'rgb(106,119,132)') : C.inputBdr}`,
                                        borderRadius: 8, padding: '10px 16px',
                                        cursor: 'not-allowed', fontSize: 14,
                                        fontWeight: dark ? 400 : 300,
                                        lineHeight: '1.4',
                                        color: audioHover ? (dark ? 'rgb(240,240,240)' : 'rgb(50,50,50)') : C.textMuted,
                                        background: dark ? 'rgb(15,23,42)' : 'rgb(255,255,255)',
                                        boxSizing: 'border-box', transition: 'border-color 0.15s ease, color 0.15s ease',
                                    }}>
                                    {ytUrl || 'Choose audio file'}
                                </div>

                                {/* "or use YouTube link" — accent green, not muted */}
                                <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0, color: C.textSub }}>
                                    or{' '}
                                    <span style={{ color: C.green, textDecoration: 'underline', cursor: 'not-allowed', fontWeight: 500 }}>
                                        use YouTube link
                                    </span>
                                </p>
                            </div>

                            {/* Buttons container — 388×110, auto-centered, row-gap:15 */}
                            <div style={{ width: 388, margin: '15px auto 0 auto', display: 'flex', flexDirection: 'column', rowGap: 15 }}>

                                {/* Transcribe — orange brand, coming-soon inactive.
                                    NO opacity kill — the Coming Soon badge + not-allowed cursor
                                    communicates inactive. Full color keeps brand identity. */}
                                <button disabled style={{
                                    width: 388, height: 32, borderRadius: 6,
                                    background: C.orange, color: 'white',
                                    fontSize: 14, fontWeight: 600, border: 'none', cursor: 'not-allowed',
                                }}>
                                    Transcribe tab with AI
                                </button>

                                <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 13, color: C.textMuted, fontWeight: dark ? 500 : 400 }}>
                                    <span style={{ flex: 1, height: 1, background: C.dividerLine }} />
                                    OR
                                    <span style={{ flex: 1, height: 1, background: C.dividerLine }} />
                                </div>

                                {/* Create blank tab — gray bg is correct here: neutral/secondary action */}
                                <button
                                    onClick={() => router.push('/editor')}
                                    style={{ width: 388, height: 32, borderRadius: 6, background: C.btnGrayBg, color: C.text, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                                    onMouseEnter={e => { const b = e.currentTarget; b.style.background = C.purpleHover; b.style.color = 'white'; }}
                                    onMouseLeave={e => { const b = e.currentTarget; b.style.background = C.btnGrayBg; b.style.color = C.text; }}
                                >
                                    Create blank tab
                                </button>
                            </div>

                            {/* Privacy note — inherits panel fontWeight (400 dark / 300 light) */}
                            <p style={{ marginTop: 20, fontSize: 13, color: C.textMuted }}>
                                Your tab remains private until you choose to share it
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── DIVIDER ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 1, background: C.dividerLine }} />
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.textSub, fontWeight: dark ? 500 : 400 }}>or upload a file</span>
                    <div style={{ flex: 1, height: 1, background: C.dividerLine }} />
                </div>

                {/* ── UPLOAD SECTION ───────────────────────────────────────── */}
                <section style={{ borderRadius: 8, border: `1px solid ${C.uploadBdr}`, padding: 28, textAlign: 'left', background: C.uploadBg }}>

                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: C.text }}>
                        Upload Guitar Pro or MusicXML files
                    </h2>
                    <p style={{ fontSize: 12, margin: '0 0 20px', color: C.textSub }}>
                        Files are validated client-side with AlphaTab before upload — title &amp; artist extracted automatically.
                    </p>

                    {/* Drop zone — hover: rgb(106,119,132) border + rgb(50,50,50) text (Songsterr spec)
                        drag-over overrides hover with purple accent */}
                    <div
                        role="button" tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onMouseEnter={() => setDropHover(true)}
                        onMouseLeave={() => setDropHover(false)}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${dragOver ? C.purple : dropHover ? (dark ? 'rgb(200,210,220)' : 'rgb(106,119,132)') : C.uploadBdr}`,
                            background: dragOver ? 'rgba(147,51,234,0.06)' : 'transparent',
                            borderRadius: 8, padding: 32,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                            cursor: 'pointer', transition: 'border-color 0.15s ease',
                        }}
                    >
                        <span style={{ fontSize: 32, opacity: 0.5 }}>🗂️</span>
                        <span style={{ fontSize: 14, color: dropHover ? (dark ? 'rgb(240,240,240)' : 'rgb(50,50,50)') : C.textSub, transition: 'color 0.15s ease' }}>Drop your tabs here</span>
                        {/* Select File — purple accent with hover */}
                        <button
                            onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            style={{
                                background: C.purple, color: 'white',
                                fontSize: 12, padding: '6px 20px', borderRadius: 999,
                                border: 'none', cursor: 'pointer',
                                transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.purpleHover; }}
                            onMouseLeave={e => { e.currentTarget.style.background = C.purple; }}
                        >
                            Select File
                        </button>
                        {/* Format note — microcopy, muted is correct */}
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: dark ? 400 : 300 }}>
                            Supports {ACCEPTED_EXTS.join(', ')} · up to {MAX_FILES} files
                        </span>
                    </div>
                    <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) processFiles(e.target.files); }} />

                    {/* File list */}
                    {files.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {files.map(f => (
                                <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.uploadBdr}`, background: dark ? 'rgb(15,23,42)' : 'white' }}>
                                    {/* File name — primary text */}
                                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>{f.name}</span>
                                    {/* Artist/title meta — secondary */}
                                    {f.status === 'valid' && <span style={{ fontSize: 11, flexShrink: 0, color: C.textSub }}>{f.artist} — {f.title}</span>}
                                    <StatusBadge status={f.status} />
                                    {f.error && <span style={{ fontSize: 10, color: 'rgb(185,28,28)', flexShrink: 0 }}>{f.error}</span>}
                                    <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))} style={{ fontSize: 16, lineHeight: 1, padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload log */}
                    {uploadLog.length > 0 && (
                        <div style={{ marginTop: 12, borderRadius: 6, padding: '10px 12px', border: `1px solid ${dark ? 'rgb(20,83,45)' : 'rgb(187,247,208)'}`, background: dark ? 'rgba(20,83,45,0.3)' : 'rgb(240,253,244)' }}>
                            {uploadLog.map((line, i) => (
                                <p key={i} style={{ fontSize: 12, margin: i > 0 ? '4px 0 0' : 0, color: line.startsWith('✓') ? (dark ? 'rgb(74,222,128)' : 'rgb(21,128,61)') : 'rgb(185,28,28)' }}>{line}</p>
                            ))}
                        </div>
                    )}

                    {/* Upload button:
                        - Enabled:  full purple-600, white text — matches Select File
                        - Disabled: same purple at opacity 0.38 — NEVER gray.
                          Gray on white background is invisible. Dimmed purple reads as
                          "branded but waiting" which is the correct mental model. */}
                    <button
                        onClick={handleUpload}
                        disabled={!hasValidFiles || isUploading}
                        style={{
                            width: '100%', marginTop: 16, padding: '10px 0',
                            borderRadius: 6, border: 'none',
                            background: C.purple,
                            color: 'white',
                            fontSize: 14, fontWeight: 600,
                            opacity: hasValidFiles && !isUploading ? 1 : 0.38,
                            cursor: hasValidFiles && !isUploading ? 'pointer' : 'not-allowed',
                            transition: 'opacity 0.2s ease, background-color 0.2s ease',
                        }}
                        onMouseEnter={e => { if (hasValidFiles && !isUploading) e.currentTarget.style.background = C.purpleHover; }}
                        onMouseLeave={e => { if (hasValidFiles && !isUploading) e.currentTarget.style.background = C.purple; }}
                    >
                        {isUploading ? 'Uploading…' : 'Upload'}
                    </button>

                    {/* Free Resources */}
                    <div style={{ marginTop: 32 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px', color: C.text }}>Free Resources</h3>
                        {([
                            ['Ultimate Guitar', 'Some free tabs in *.gp format', 'https://www.ultimate-guitar.com/'],
                            ['911Tabs', 'Search engine for tabs', 'https://www.911tabs.com/'],
                            ['MuseScore (Free Download filtered)', 'Some free tabs in MusicXML format', 'https://musescore.com/sheetmusic?instrument=72%2C73&recording_type=free-download'],
                            ['GProTab', 'Free Guitar Pro tabs in *.gp format', 'https://gprotab.net/'],
                        ] as const).map(([name, desc, url]) => (
                            <div key={name} style={{ marginBottom: 16 }}>
                                <a
                                    href={url} target="_blank" rel="noopener noreferrer"
                                    style={{ color: C.purple, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = C.purpleHover)}
                                    onMouseLeave={e => (e.currentTarget.style.color = C.purple)}
                                >{name}</a>
                                {/* Resource descriptions — secondary copy */}
                                <p style={{ fontSize: 11, margin: '2px 0 0', color: C.textSub }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
};