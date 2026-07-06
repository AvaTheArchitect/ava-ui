'use client';

/**
 * YouTube Player Component
 * V99.3 — MAESTRO-UI-004: landscape panel redocked to measured Songsterr-style geometry.
 * Date: July 5th, 2026
 *
 * LAYOUT MATRIX (all 5 cases):
 * ─────────────────────────────────────────────────────────────────
 * Mobile landscape   (any variant):   230×235px (35px header + 200px video),
 *                                      safe-area-aware right offset,
 *                                      bottom-[80px] above MaestroControlPanel
 *                                      mobile bar                        🔒 locked
 * Mobile portrait    normal variant:  52vw wide  58vw video h            🔒 backup
 * Mobile portrait    large variant:   full-width 548px tall               ← same as "big" normal was before
 * Desktop            normal variant:  355×235px  right-4 md:bottom-[74px] 🔒 locked
 * Desktop            large variant:   min(912px,95vw)×548px right-4       🔒 locked
 * ─────────────────────────────────────────────────────────────────
 *
 * Bottom clearance: use CSS var approach when TransportBar height is confirmed.
 * Currently: landscape=80px, portrait-mobile=80px, desktop=74px.
 *
 * MAESTRO-UI-004 (page.tsx + this file):
 * ✅ The page-level wrapper around <YouTubePlayer> in page.tsx is visibility-only — it
 *        carries no position/size styles. It's kept (not removed) solely because its
 *        display gate also checks activeVideoId, which this component's isVisible prop
 *        does not. This file owns all positioning/sizing for every layout case above.
 * ✅ iframe/embed init, time-heartbeat, and variant-change/sync logic are unchanged by
 *        this lane — only the outer container's className/style geometry moved.
 * ⏳ Future cleanup (not done): fold activeVideoId into the isVisible path so the page.tsx
 *        wrapper can be removed entirely.
 *
 * V99.1 PRESERVED:
 * ✅ isLargeVariant (playthrough | lesson)
 * ✅ onVariantTypeChange prop
 * ✅ All 6 slot types + dynamic dropdown
 * ✅ Deferred seek / initialSeekRef pattern
 * ✅ All imperative handle methods
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

type VariantKey = 'main' | 'backing' | 'solo' | 'playthrough' | 'live' | 'lesson';

interface YouTubePlayerProps {
    videoId: string;
    isVisible: boolean;
    onClose: () => void;
    currentTime: number;
    isPlaying: boolean;
    onPlayStateChange?: (isPlaying: boolean) => void;
    onTimeUpdate?: (time: number) => void;
    onStateChange?: (event: any) => void;
    onSeeking?: (isSeeking: boolean) => void;
    onPlayerReady?: () => void;
    isMobileLandscape?: boolean;
    videoVariants?: {
        main?: string;
        backing?: string;
        solo?: string;
        playthrough?: string;
        live?: string;
        lesson?: string;
    };
    onVariantChange?: (videoId: string) => void;
    onVariantTypeChange?: (variant: VariantKey) => void;
    videoStartOffset?: number;
}

export const YouTubePlayer = React.memo(
    React.forwardRef<any, YouTubePlayerProps>(({
        videoId,
        isVisible,
        onClose,
        currentTime,
        isPlaying,
        onPlayStateChange,
        onTimeUpdate,
        onStateChange,
        onSeeking,
        onPlayerReady,
        isMobileLandscape = false,
        videoVariants,
        onVariantChange,
        onVariantTypeChange,
        videoStartOffset = 0,
    }, ref) => {
        const playerRef = useRef<any>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const [isAPIReady, setIsAPIReady] = useState(false);
        const [selectedVariant, setSelectedVariant] = useState<VariantKey>('main');
        const initialSeekRef = useRef<number>(-1);

        const isLargeVariant = selectedVariant === 'playthrough' || selectedVariant === 'lesson';

        // Reset local variant selector when the song/default video changes so stale
        // Playthrough/Tutorial state does not carry into the next song.
        useEffect(() => {
            setSelectedVariant('main');
        }, [videoVariants?.main]);

        useImperativeHandle(ref, () => ({
            playVideo: () => {
                if (initialSeekRef.current >= 0) {
                    playerRef.current?.seekTo?.(initialSeekRef.current, true);
                    initialSeekRef.current = -1;
                }
                playerRef.current?.playVideo?.();
            },
            pauseVideo: () => playerRef.current?.pauseVideo?.(),
            seekTo: (seconds: number, allowSeekAhead: boolean) => {
                if (!playerRef.current) { console.warn('⚠️ V98: Player ref not ready'); return; }
                const YT = (window as any).YT;
                if (!YT || !YT.PlayerState) { initialSeekRef.current = seconds; return; }
                const state = playerRef.current.getPlayerState?.();
                if (state !== YT.PlayerState.PAUSED && state !== YT.PlayerState.PLAYING) {
                    initialSeekRef.current = seconds;
                } else {
                    playerRef.current.seekTo(seconds, allowSeekAhead);
                }
            },
            getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
            getDuration: () => playerRef.current?.getDuration?.() || 0,
            getVolume: () => playerRef.current?.getVolume?.() || 100,
            setVolume: (volume: number) => playerRef.current?.setVolume?.(volume),
            getPlaybackRate: () => playerRef.current?.getPlaybackRate?.() || 1,
            setPlaybackRate: (rate: number) => playerRef.current?.setPlaybackRate?.(rate),
            getPlayerState: () => playerRef.current?.getPlayerState?.() || -1,
        }), []);

        // ── YouTube API loading ───────────────────────────────────────────────
        useEffect(() => {
            if (window.YT && window.YT.Player) { setIsAPIReady(true); return; }
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const first = document.getElementsByTagName('script')[0];
            first.parentNode?.insertBefore(tag, first);
            window.onYouTubeIframeAPIReady = () => { setIsAPIReady(true); };
            return () => { window.onYouTubeIframeAPIReady = () => {}; };
        }, []);

        // ── Player initialization ─────────────────────────────────────────────
        useEffect(() => {
            if (!isAPIReady || !isVisible || !containerRef.current) return;
            if (videoStartOffset > 0) initialSeekRef.current = videoStartOffset;
            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 0, controls: 0, disablekb: 1, showinfo: 0,
                    rel: 0, modestbranding: 0, fs: 0, cc_load_policy: 0,
                    iv_load_policy: 3, enablejsapi: 1, widgetid: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => { onPlayerReady?.(); },
                    onStateChange: (event: any) => {
                        onStateChange?.(event);
                        if (event.data === window.YT.PlayerState.PLAYING) onPlayStateChange?.(true);
                        else if (event.data === window.YT.PlayerState.PAUSED) onPlayStateChange?.(false);
                        else if (event.data === window.YT.PlayerState.ENDED) onPlayStateChange?.(false);
                    },
                },
            });
            return () => {
                playerRef.current?.destroy?.();
                playerRef.current = null;
                initialSeekRef.current = -1;
            };
        }, [isAPIReady, isVisible, videoId, videoStartOffset, onStateChange, onPlayStateChange, onPlayerReady]);

        // ── Time heartbeat ────────────────────────────────────────────────────
        useEffect(() => {
            if (!playerRef.current || !onTimeUpdate) return;
            const id = setInterval(() => {
                try {
                    if (playerRef.current?.getCurrentTime) {
                        onTimeUpdate(Math.max(0, playerRef.current.getCurrentTime() - videoStartOffset) * 1000);
                    }
                } catch { /* not ready */ }
            }, 50);
            return () => clearInterval(id);
        }, [onTimeUpdate, videoStartOffset]);

        // ── UI handlers ───────────────────────────────────────────────────────
        const handleClose = useCallback(() => {
            playerRef.current?.pauseVideo?.();
            onClose();
        }, [onClose]);

        const handleVariantChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
            const variant = e.target.value as VariantKey;
            setSelectedVariant(variant);
            onVariantTypeChange?.(variant);
            const newVideoId = videoVariants?.[variant];
            if (newVideoId) onVariantChange?.(newVideoId);
            else console.warn(`⚠️ V99: No video ID for variant: ${variant}`);
        }, [videoVariants, onVariantChange, onVariantTypeChange]);

        if (!isVisible) return null;

        // ── Layout resolution ─────────────────────────────────────────────────
        // Priority: landscape > desktop (md+) > mobile portrait
        // Mobile portrait large reuses the "big" footprint — readable for tutorials.

        return (
            <div
                className={`
                    fixed z-40 bg-black overflow-hidden shadow-2xl border border-gray-300 flex flex-col
                    ${isMobileLandscape
                        ? (isLargeVariant
                            // [MAESTRO-UI-005B] Landscape Playthrough/Tutorial: larger custom
                            // 16:9 docked panel instead of the locked compact companion
                            // footprint. Height stays natural (see style below) — driven by
                            // the 35px header + the video container's own calc-based height.
                            ? 'w-[min(432px,55vw)]'
                            // 🔒 Landscape normal: locked 230×235 companion panel — unchanged
                            // from MAESTRO-UI-004 (230×235 container, 35px header, 200px video).
                            : 'w-[230px]')
                        // Desktop (md+): Songsterr exact pixel sizes
                        // Mobile portrait: 52vw normal | full-width large
                        : isLargeVariant
                            // [MAESTRO-UI-005A] Mobile portrait: no forced height class here —
                            // the panel's height is driven by the 35px header + aspect-video
                            // area below instead. Desktop (md+) keeps its exact prior height via
                            // md:h-[min(548px,85vh)] (identical value, now breakpoint-scoped).
                            ? 'bottom-[80px] right-0 w-full md:bottom-[74px] md:right-4 md:w-[min(912px,95vw)] md:h-[min(548px,85vh)]'
                            : 'bottom-[80px] right-0 w-[52vw] md:bottom-[74px] md:right-4 md:w-[355px]'
                    }
                `}
                style={{
                    height: isMobileLandscape
                        ? (isLargeVariant
                            // [MAESTRO-UI-005B] Landscape Playthrough/Tutorial: no forced
                            // container height — driven by the 35px header + the video
                            // container's own calc-based 16:9 height below.
                            ? undefined
                            // [MAESTRO-UI-004.3] Landscape normal: fixed 235px, matching
                            // Songsterr's measured container height (35px header + 200px
                            // video, no extra padding/border). Unchanged from UI-004.
                            : '235px')
                        : isLargeVariant
                            // [MAESTRO-UI-005A] Mobile portrait Playthrough/Tutorial uses natural
                            // header + aspect-video height to avoid the old forced-height
                            // letterbox/takeover panel. Desktop's 548px cap now lives in the
                            // md:h-[...] class above instead of here.
                            ? undefined
                            // Normal: 235px desktop (fixed) | auto mobile (58vw video drives it)
                            : undefined,
                    // [MAESTRO-UI-005B] Landscape: deliberately flush-right (0px), replacing the
                    // prior safe-area-aware max(0px, env(safe-area-inset-right)) offset. This
                    // follows the old Songsterr-style tradeoff — the video may approach the
                    // physical right edge, but the interactive header stays inboard enough, and
                    // preserving score/staff real estate takes priority. The visible left/right
                    // white gutters some devices show in landscape are a separate, pre-existing
                    // canvas/safe-area layout concern, not caused by this panel — out of scope
                    // here, tracked as a future MAESTRO-UI-006 audit. Portrait keeps its plain
                    // right-0/right-4 classes above, untouched.
                    right: isMobileLandscape ? '0px' : undefined,
                    // [MAESTRO-UI-004.4] Landscape: bottom-anchored above the visible
                    // MaestroControlPanel mobile bar. 80px = MaestroControlPanel mobile bar
                    // h-[80px], the visible landscape footer. Do not use the 96px
                    // desktop/footer-wrapper measurement; that was the wrong bar for this
                    // landscape layout. Replaces the UI-004.1 top: 72px anchor — the reference
                    // panel is bottom-anchored above its footer, not top-anchored under its
                    // header. Unchanged by UI-005B — applies to both normal and large landscape.
                    bottom: isMobileLandscape ? '80px' : undefined,
                }}
            >
                {/* Top bar — 35px, matches Songsterr */}
                <div className="bg-white border-b border-gray-200 px-2 py-1.5 flex items-center justify-between" style={{ height: 35, flexShrink: 0 }}>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                        <span className="text-gray-500 text-[10px] md:text-xs">Synced video:</span>
                        <select
                            value={selectedVariant}
                            onChange={handleVariantChange}
                            className="bg-white text-gray-800 text-[10px] md:text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                            {videoVariants?.main && <option value="main">Full mix</option>}
                            {videoVariants?.backing && <option value="backing">Backing track</option>}
                            {videoVariants?.solo && <option value="solo">Solo</option>}
                            {videoVariants?.playthrough && <option value="playthrough">Playthrough</option>}
                            {videoVariants?.live && <option value="live">Live</option>}
                            {videoVariants?.lesson && <option value="lesson">Tutorial</option>}
                            {!videoVariants?.main && !videoVariants?.backing && !videoVariants?.solo &&
                             !videoVariants?.playthrough && !videoVariants?.live && !videoVariants?.lesson && (
                                <option value="main" disabled>Full mix</option>
                            )}
                        </select>
                    </label>
                    <button onClick={handleClose} className="p-1 text-gray-500 hover:text-gray-800 transition-colors" title="Close video">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* Video container
                    🔒 Mobile portrait normal: h-[58vw] (backup locked)
                    [MAESTRO-UI-004.3] Mobile landscape normal: h-[200px], matching Songsterr's
                       measured 230×200 video area under its 35px header (230 + 35 = 235
                       container height). Unchanged from UI-004. Desktop normal: 200px (235
                       total - 35 bar).
                    [MAESTRO-UI-005A.1] Mobile portrait Playthrough/Tutorial forces video height
                       from viewport width (inline style, not the aspect-video class) to avoid
                       the iframe's default 300×150 intrinsic sizing winning out — matches
                       Songsterr-style full-width 16:9 page-view video. Desktop (md+) restores
                       the original flex-1-fills-remaining-height behavior against the
                       md:h-[...] container above; md:flex-1's explicit flex-basis: 0% makes the
                       inline height/aspectRatio below inert at desktop, so no !important or
                       extra gating is needed to keep desktop unchanged.
                    [MAESTRO-UI-005B] Mobile landscape Playthrough/Tutorial: same must-apply
                       inline-style approach as portrait, scaled to the landscape panel's own
                       w-[min(432px,55vw)] width instead of 100vw. Not relying on aspect-video
                       alone here either, for the same iframe-intrinsic-sizing reason as
                       UI-005A.1. */}
                <div
                    ref={containerRef}
                    className={`
                        w-full bg-black
                        ${isMobileLandscape
                            ? (isLargeVariant
                                // [MAESTRO-UI-005B] No height class — inline style below
                                // supplies the calc-based 16:9 height.
                                ? ''
                                : 'h-[200px]')
                            : isLargeVariant
                                ? 'md:aspect-auto md:flex-1'
                                : 'h-[58vw] md:h-[200px]'
                        }
                    `}
                    style={
                        isLargeVariant
                            ? (isMobileLandscape
                                ? {
                                      // [MAESTRO-UI-005B] Must-apply 16:9 sizing, scaled to the
                                      // landscape panel's own clamped width.
                                      height: 'calc(min(432px, 55vw) * 9 / 16)',
                                      aspectRatio: '16 / 9',
                                  }
                                : {
                                      // [MAESTRO-UI-005A.1] Must-apply 16:9 sizing — the
                                      // aspect-video utility alone wasn't forcing the iframe's
                                      // actual height, so this gives the container a genuinely
                                      // definite (non-auto) height that the iframe's
                                      // height="100%" can resolve against.
                                      height: 'calc(100vw * 9 / 16)',
                                      aspectRatio: '16 / 9',
                                  })
                            : undefined
                    }
                />
            </div>
        );
    })
);

YouTubePlayer.displayName = 'YouTubePlayer';