'use client';

/**
 * NewTabPanel.tsx — V5.7
 * Date: August 15th, 2026
 *
 * V5.7 CHANGES (NEWTAB-DUPLICATE-UPLOAD-GUARD-001):
 * ✅ Stable staged-file id (crypto.randomUUID, with fallback) replaces
 *    key={f.name} — fixes React duplicate-key warnings for same-named files
 * ✅ In-panel duplicate staging guard — a file already staged, or repeated
 *    within the same drop/select batch (matched by name+size+lastModified),
 *    is skipped with a friendly "Duplicate skipped" uploadLog line instead
 *    of being staged twice
 * ✅ Friendly handling for Supabase 23505 / unique_song_version — no longer
 *    surfaces raw database JSON; shows a friendly duplicate-song message and
 *    continues processing remaining files
 *
 * V5.6 CHANGES (UPLOAD-HARDENING-001 patch 4):
 * ✅ Batch metadata note styling aligned with the main helper text above it
 *    (same font size/color) for readability — was too muted/small
 *
 * V5.5 CHANGES (UPLOAD-HARDENING-001 patch 3):
 * ✅ Batch upload metadata note added below the upload section's helper
 *    text — clarifies that MetadataEditor opens for one uploaded tab and
 *    remaining uploaded tabs are edited from My Tabs
 *
 * V5.4 CHANGES (UPLOAD-HARDENING-001 patch 2):
 * ✅ Reset staged upload files/log/done state whenever the panel opens
 *    (isOpen useEffect) — fixes a previously uploaded GP file remaining
 *    visible in the file list/log after closing and reopening NewTab
 *
 * V5.3 CHANGES (beta hardening — UPLOAD-HARDENING-001):
 * ✅ DEV_USER_ID bypass removed entirely — effectiveUserId is userId only
 * ✅ Filenames sanitized (sanitizeFileName) before entering any storage path;
 *    file_name/file_extension now derived from the sanitized name
 * ✅ Orphan-row rollback — a failed storage upload or metadata update after
 *    the tabs insert now deletes the just-inserted row instead of leaving
 *    an orphaned draft
 * ✅ MAX_FILES enforced cumulatively across drop/select events, not per batch
 *
 * V5.2 CHANGES (all upload bugs fixed):
 * ✅ effectiveUserId used everywhere (insert, path, storage) — never raw userId
 * ✅ file_name + file_extension written on update (MetadataEditor Tab File tab fix)
 * ✅ fileExt is null (not '') when no extension — safe for Supabase null checks
 * ✅ onClose() + onTabUploaded?.(firstId) replaces router.push — no 404
 * ✅ onClick={handleUpload} on Upload button — was missing in V4/early V5
 * ✅ useRouter removed — no longer needed
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/alphaTab/supabase';

export interface NewTabPanelProps {
    isOpen: boolean;
    onClose: () => void;
    theme?: 'light' | 'dark';
    /** Called after a tab is successfully uploaded — refreshes My Tabs song list. */
    onTabAdded?: () => void;
    /** Called with the new tab's ID — parent opens MetadataEditorPanel instead of routing. */
    onTabUploaded?: (tabId: string) => void;
}

type FileStatus = 'validating' | 'valid' | 'invalid';

interface TabFile {
    id: string; file: File; name: string; status: FileStatus;
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

/** Strips path separators, ".." sequences, and non-word/dot/hyphen characters
 *  so a filename can never alter the intended Supabase Storage path structure. */
function sanitizeFileName(name: string): string {
    return name.replace(/[\\/]/g, '_').replace(/\.\./g, '_').replace(/[^\w.-]/g, '_');
}

/** Identity signature for duplicate-staging detection — not a storage path,
 *  so raw name/size/lastModified are fine here (no sanitization needed). */
function fileSignature(f: { name: string; size: number; lastModified: number }): string {
    return `${f.name.trim().toLowerCase()}|${f.size}|${f.lastModified}`;
}

/** Stable per-staged-file id for React keys and state matching — independent
 *  of filename, so two different files sharing a name never collide. */
function makeStagedId(f: File): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${f.name}-${f.size}-${f.lastModified}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Detects Supabase's unique_song_version constraint violation (23505) so it
 *  can be shown as a friendly message instead of raw database JSON. */
function isDuplicateSongVersionError(err: unknown): boolean {
    const e = err as { code?: string; message?: string; details?: string } | null;
    if (!e) return false;
    if (e.code === '23505') return true;
    return /unique_song_version/i.test(`${e.message ?? ''} ${e.details ?? ''}`);
}

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

export const NewTabPanel: React.FC<NewTabPanelProps> = ({ isOpen, onClose, theme = 'dark', onTabAdded, onTabUploaded }) => {
    const dark = theme === 'dark';

    const C = {
        text: dark ? 'rgb(240,240,240)' : 'rgb(0,0,0)',
        textSub: dark ? 'rgb(180,190,210)' : 'rgb(55,55,55)',
        textMuted: dark ? 'rgb(130,140,160)' : 'rgb(110,110,110)',
        panelBg: dark ? 'rgb(37,37,41)' : 'rgb(255,255,255)',
        sectionBg: dark ? 'rgb(15,23,42)' : 'rgb(255,255,255)',
        sectionBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        uploadBg: dark ? 'rgba(15,23,42,0.6)' : 'rgb(250,250,252)',
        uploadBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        inputBdr: dark ? 'rgb(51,65,85)' : 'rgb(209,211,213)',
        dividerLine: dark ? 'rgb(51,65,85)' : 'rgb(220,220,225)',
        purple: 'rgb(147,51,234)',
        purpleHover: 'rgb(126,34,206)',
        orange: 'rgb(234,88,12)',
        green: dark ? 'rgb(52,211,153)' : 'rgb(4,120,87)',
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

    // Reset staged upload state every time the panel opens — covers auto-close
    // after a successful upload, backdrop close, and any future close path.
    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setUploadLog([]);
            setUploadDone(false);
        }
    }, [isOpen]);

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
    const [uploadDone, setUploadDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const hasValidFiles = files.some(f => f.status === 'valid');
    const setSetting = useCallback(<K extends keyof AISettings>(k: K, v: AISettings[K]) => setSettings(s => ({ ...s, [k]: v })), []);

    const validateFile = useCallback(async (file: File): Promise<Omit<TabFile, 'id' | 'file' | 'name'>> => {
        try {
            const at = await getAlphaTab();
            const score = at.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(await file.arrayBuffer()), new at.Settings());
            return { status: 'valid', title: score.title || file.name.replace(/\.[^.]+$/, ''), artist: score.artist || 'Unknown Artist', error: '' };
        } catch (err) {
            return { status: 'invalid', title: '', artist: '', error: err instanceof Error ? err.message : 'Parse failed' };
        }
    }, [getAlphaTab]);

    const processFiles = useCallback(async (raw: FileList | File[]) => {
        const incoming = Array.from(raw);

        // Duplicate guard: skip a file already staged, or repeated within
        // this same drop/select batch, before it ever reaches state.
        const existingSigs = new Set(files.map(f => fileSignature(f.file)));
        const seenBatchSigs = new Set<string>();
        const duplicateNames: string[] = [];
        const deduped: File[] = [];
        for (const f of incoming) {
            const sig = fileSignature(f);
            if (existingSigs.has(sig) || seenBatchSigs.has(sig)) {
                duplicateNames.push(f.name);
                continue;
            }
            seenBatchSigs.add(sig);
            deduped.push(f);
        }

        const remaining = Math.max(0, MAX_FILES - files.length);
        const list = deduped.slice(0, remaining);

        if (duplicateNames.length) {
            setUploadLog(prev => [...prev, ...duplicateNames.map(n => `Duplicate skipped: ${n} is already staged.`)]);
        }

        if (!list.length) {
            if (!duplicateNames.length) {
                setUploadLog([`✗ Limit reached — up to ${MAX_FILES} files per upload.`]);
            }
            return;
        }
        const entries = list.map<TabFile>(f => ({ id: makeStagedId(f), file: f, name: f.name, status: 'validating', title: '', artist: '', error: '' }));
        setFiles(prev => [...prev, ...entries]);
        for (const entry of entries) {
            const result = await validateFile(entry.file);
            setFiles(prev => prev.map(p => p.id === entry.id ? { ...p, ...result } : p));
        }
    }, [validateFile, files]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const handleUpload = useCallback(async () => {
        console.log('[NewTabPanel] handleUpload fired', { userId, fileCount: files.length, hasValidFiles });

        const effectiveUserId = userId;

        if (!effectiveUserId) {
            setUploadLog(['✗ Not signed in — please sign in to upload tabs.']);
            return;
        }
        const valid = files.filter(f => f.status === 'valid');
        if (!valid.length) return;

        setIsUploading(true);
        setUploadLog([]);
        setUploadDone(false);
        let firstId: string | null = null;

        for (const f of valid) {
            let insertedRowId: string | null = null;
            try {
                // Step 1: Insert row with effectiveUserId
                const { data: row, error: e1 } = await supabase
                    .from('tabs')
                    .insert({ title: f.title, artist: f.artist, user_id: effectiveUserId, status: 'draft' })
                    .select('id')
                    .single();
                if (e1) throw e1;
                insertedRowId = row.id;

                // Step 2: Upload file to storage using effectiveUserId
                const safeName = sanitizeFileName(f.file.name);
                const dotIdx = safeName.lastIndexOf('.');
                const fileName = dotIdx > 0 ? safeName.slice(0, dotIdx) : safeName;
                const fileExt = dotIdx > 0 ? safeName.slice(dotIdx + 1) : null;
                const path = `${effectiveUserId}/${row.id}/${safeName}`;

                const { error: e2 } = await supabase.storage.from('tabs').upload(path, f.file);
                if (e2) throw e2;

                // Step 3: Write file_path + file_name + file_extension so
                // MetadataEditorPanel "Tab File" tab shows the file correctly.
                const { error: e3 } = await supabase
                    .from('tabs')
                    .update({ file_path: path, file_name: fileName, file_extension: fileExt, status: 'ready' })
                    .eq('id', row.id);
                if (e3) throw e3;

                setUploadLog(p => [...p, `✓ ${f.artist} — ${f.title}`]);
                if (!firstId) firstId = row.id;
            } catch (err) {
                if (insertedRowId) {
                    const { error: cleanupErr } = await supabase.from('tabs').delete().eq('id', insertedRowId);
                    if (cleanupErr) console.error('[NewTabPanel] orphan-row cleanup failed', insertedRowId, cleanupErr);
                }
                if (isDuplicateSongVersionError(err)) {
                    setUploadLog(p => [...p, `Duplicate skipped: ${f.name} — this song/version already exists in My Tabs.`]);
                } else {
                    setUploadLog(p => [...p, `✗ ${f.name}: ${err instanceof Error ? err.message : JSON.stringify(err)}`]);
                }
            }
        }

        setIsUploading(false);
        if (firstId) {
            setUploadDone(true);
            onTabAdded?.();                   // refresh My Tabs list
            await new Promise(r => setTimeout(r, 900));
            onClose();                        // close NewTabPanel
            onTabUploaded?.(firstId);         // parent opens MetadataEditorPanel
        }
    }, [files, userId, hasValidFiles, onClose, onTabAdded, onTabUploaded]);

    if (!isOpen) return null;

    return (
        <>
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

            <main
                id="panel-newtab"
                style={{
                    position: 'fixed', zIndex: 110,
                    top: 88, left: 'calc(50% - 423px)',
                    width: 846, maxHeight: 'calc(100vh - 96px)',
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

                    <span style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 2,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'white', padding: '2px 8px', borderRadius: 999,
                        background: 'linear-gradient(135deg, rgb(124,58,237), rgb(79,70,229))',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.45)',
                    }}>Coming Soon</span>

                    <div style={{ padding: '28px 24px 24px', background: C.sectionBg }}>
                        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px', color: C.text }}>
                            Transcribe tabs instantly with AI
                        </h1>
                        <p style={{ fontSize: 12, margin: '0 0 24px', color: C.textSub }}>
                            Paste a YouTube link and let AI create accurate guitar, bass, and drum tabs in minutes
                        </p>

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
                                    <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: C.textSub }}>{label}</h3>
                                </div>
                            ))}
                        </div>

                        <div style={{ width: 649, marginLeft: 65, marginRight: 55, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                            <div id="new-tab-form-content" style={{ width: '100%', marginTop: 25, marginBottom: 15, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                                <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0, color: C.textSub }}>
                                    or{' '}
                                    <span style={{ color: C.green, textDecoration: 'underline', cursor: 'not-allowed', fontWeight: 500 }}>
                                        use YouTube link
                                    </span>
                                </p>
                            </div>

                            <div style={{ width: 388, margin: '15px auto 0 auto', display: 'flex', flexDirection: 'column', rowGap: 15 }}>
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

                                <button
                                    onClick={() => { window.location.href = '/editor'; }}
                                    style={{ width: 388, height: 32, borderRadius: 6, background: C.btnGrayBg, color: C.text, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background-color 0.2s ease, color 0.2s ease' }}
                                    onMouseEnter={e => { const b = e.currentTarget; b.style.background = C.purpleHover; b.style.color = 'white'; }}
                                    onMouseLeave={e => { const b = e.currentTarget; b.style.background = C.btnGrayBg; b.style.color = C.text; }}
                                >
                                    Create blank tab
                                </button>
                            </div>

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
                    <p style={{ fontSize: 12, margin: '0 0 6px', color: C.textSub }}>
                        Files are validated client-side with AlphaTab before upload — title &amp; artist extracted automatically.
                    </p>
                    <p style={{ fontSize: 12, margin: '0 0 20px', color: C.textSub }}>
                        Batch uploads: after upload, the metadata editor opens for one new tab. Edit the remaining uploaded tabs from My Tabs.
                    </p>

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
                        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: dark ? 400 : 300 }}>
                            Supports {ACCEPTED_EXTS.join(', ')} · up to {MAX_FILES} files
                        </span>
                    </div>
                    <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} multiple style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.length) processFiles(e.target.files); }} />

                    {/* File list */}
                    {files.length > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {files.map(f => (
                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 6, padding: '8px 12px', border: `1px solid ${C.uploadBdr}`, background: dark ? 'rgb(15,23,42)' : 'white' }}>
                                    <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}>{f.name}</span>
                                    {f.status === 'valid' && <span style={{ fontSize: 11, flexShrink: 0, color: C.textSub }}>{f.artist} — {f.title}</span>}
                                    <StatusBadge status={f.status} />
                                    {f.error && <span style={{ fontSize: 10, color: 'rgb(185,28,28)', flexShrink: 0 }}>{f.error}</span>}
                                    <button onClick={() => setFiles(p => p.filter(x => x.id !== f.id))}
                                        style={{ fontSize: 16, lineHeight: 1, padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>×</button>
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

                    {/* 🔒 onClick={handleUpload} — never remove */}
                    <button
                        onClick={handleUpload}
                        disabled={!hasValidFiles || isUploading}
                        style={{
                            width: '100%', marginTop: 16, padding: '10px 0',
                            borderRadius: 6, border: 'none',
                            background: C.purple, color: 'white',
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
                                <a href={url} target="_blank" rel="noopener noreferrer"
                                    style={{ color: C.purple, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = C.purpleHover)}
                                    onMouseLeave={e => (e.currentTarget.style.color = C.purple)}
                                >{name}</a>
                                <p style={{ fontSize: 11, margin: '2px 0 0', color: C.textSub }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </>
    );
};