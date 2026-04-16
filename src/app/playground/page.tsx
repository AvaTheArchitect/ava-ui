'use client';

/**
 * app/playground/page.tsx — V102 Rebuild Harness
 * Date: March 21st, 2026
 *
 * Phase 1 — single-song stability proof.
 * Rise only. No song switching, YouTube, metronome, count-in, or metadata editor.
 *
 * Phase 1 exit criteria:
 *   ✅ Rise loads and renders cleanly
 *   ✅ Cursor walks stably through all repeats
 *   ✅ Loop Off is truly off (no residual range enforcement)
 *   ✅ Click-seek is repeat-aware
 *   ✅ Double-click toggles play
 *   ⏳ Loop On + range selection — Phase 2 (BeatCustomLoopOverlay restore)
 *
 * Phase 1.5 — Song selector added (Rise + SRV Pride and Joy).
 * No other changes from Phase 1.
 */

import React, { useState, useEffect } from 'react';
import { AlphaTabRendererV102 } from '@/components/alphaTab/AlphaTabRenderer_V102';
import { supabase } from '@/lib/alphaTab/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Song config
// ─────────────────────────────────────────────────────────────────────────────

const PLAYGROUND_BUCKET = 'tabs';

const PLAYGROUND_SONGS = [
    { id: 'rise', label: 'Rise', fileName: 'rise.gp5', trackIndex: 0 },
    { id: 'srv', label: 'SRV - Pride and Joy', fileName: 'pride-and-joy.gp5', trackIndex: 1 },
] as const;

type SongId = typeof PLAYGROUND_SONGS[number]['id'];

async function getSignedUrl(fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(PLAYGROUND_BUCKET)
        .createSignedUrl(fileName, 3600);
    if (error || !data?.signedUrl) {
        throw new Error(`playground: failed to get signed URL — ${error?.message}`);
    }
    return data.signedUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
    const [selectedSongId, setSelectedSongId] = useState<SongId>('rise');
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [rendered, setRendered] = useState(false);
    const [boundsReady, setBoundsReady] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);

    // Loop state — owned here, passed into renderer → BeatCustomLoopOverlay.
    // Overlay has its own Loop ON/OFF + Clear buttons; page reflects state only.
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [playbackRange, setPlaybackRange] = useState<{ startTick: number; endTick: number } | null>(null);

    // Fetch a new signed URL whenever the selected song changes.
    // Reset all renderer state so the status panel reflects the new load cycle.
    useEffect(() => {
        setFileUrl(null);
        setUrlError(null);
        setIsPlaying(false);
        setRendered(false);
        setBoundsReady(false);
        setPlayerReady(false);
        setLoopEnabled(false);
        setPlaybackRange(null);

        const song = PLAYGROUND_SONGS.find(s => s.id === selectedSongId)!;
        getSignedUrl(song.fileName)
            .then(setFileUrl)
            .catch(err => { console.error('playground: signed URL error', err); setUrlError(err.message); });
    }, [selectedSongId]);

    const selectedSong = PLAYGROUND_SONGS.find(s => s.id === selectedSongId)!;

    return (
        <div style={{ fontFamily: 'monospace', padding: '20px' }}>

            {/* ── Status panel ───────────────────────────────────────────────────── */}
            <div style={{
                position: 'fixed', top: 20, right: 20, zIndex: 10000,
                background: '#fff', border: '2px solid #333',
                padding: '14px 16px', borderRadius: '8px', minWidth: '220px',
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>
                    🎸 V102 Playground — {selectedSong.label}
                </div>

                {/* ── Song selector ─────────────────────────────────────────────── */}
                <div style={{ marginBottom: '10px' }}>
                    {PLAYGROUND_SONGS.map(song => (
                        <button
                            key={song.id}
                            onClick={() => setSelectedSongId(song.id)}
                            style={{
                                ...btn(song.id === selectedSongId ? '#6a1b9a' : '#888'),
                                marginRight: '6px',
                                marginBottom: '4px',
                            }}
                        >
                            {song.label}
                        </button>
                    ))}
                </div>

                <div style={{ fontSize: '11px', lineHeight: '1.9', marginBottom: '10px' }}>
                    <div>URL    {fileUrl ? '✅' : urlError ? '❌' : '⏳'}</div>
                    <div>Render {rendered ? '✅' : '⏳'}</div>
                    <div>Bounds {boundsReady ? '✅' : '⏳'}</div>
                    <div>Player {playerReady ? '✅' : '⏳'}</div>
                    <div>Loop   {loopEnabled
                        ? playbackRange
                            ? `🟢 ON (${playbackRange.startTick}–${playbackRange.endTick})`
                            : '🟢 ON (no range yet)'
                        : '⚪ OFF'}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                        onClick={() => setIsPlaying(p => !p)}
                        disabled={!playerReady}
                        style={btn(playerReady ? '#2196f3' : '#ccc')}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                        Loop controls are in the overlay (bottom-right)
                    </div>
                </div>

                {urlError && (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'red' }}>
                        {urlError}
                    </div>
                )}
            </div>

            {/* ── Page header ────────────────────────────────────────────────────── */}
            <div style={{
                background: '#e3f2fd', border: '2px solid #2196f3',
                padding: '12px 16px', marginBottom: '16px', borderRadius: '8px',
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    🧪 Playground — AlphaTabRenderer V102
                </div>
                <div style={{ fontSize: '12px', color: '#555' }}>
                    Phase 1.5 · Rise + SRV · Labs v5.30 cursor engine · single transport authority
                </div>
            </div>

            {/* ── Renderer ───────────────────────────────────────────────────────── */}
            {fileUrl ? (
                <AlphaTabRendererV102
                    key={selectedSongId}
                    fileUrl={fileUrl}
                    trackIndices={[selectedSong.trackIndex]}
                    isPlaying={isPlaying}
                    onPlayStateChange={setIsPlaying}
                    onRendered={() => setRendered(true)}
                    onBoundsReady={() => setBoundsReady(true)}
                    onPlayerReady={() => setPlayerReady(true)}
                    loopEnabled={loopEnabled}
                    playbackRange={playbackRange}
                    onLoopToggle={setLoopEnabled}
                    onLoopChange={(start, end) => setPlaybackRange({ startTick: start, endTick: end })}
                    onLoopClear={() => { setPlaybackRange(null); setLoopEnabled(false); }}
                />
            ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    {urlError ?? 'Fetching signed URL…'}
                </div>
            )}
        </div>
    );
}

function btn(bg: string): React.CSSProperties {
    return {
        padding: '8px 12px', fontSize: '12px', border: 'none',
        borderRadius: '4px', cursor: bg === '#ccc' ? 'not-allowed' : 'pointer',
        background: bg, color: '#fff', fontFamily: 'monospace',
    };
}