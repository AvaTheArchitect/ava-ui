'use client';

/**
 * PrintPanel.tsx - V1.1: ICON-ONLY TRIGGER, LABEL OWNED BY TRANSPORTBAR
 * Date: March 19th, 2026
 *
 * 🆕 V1.1 UPDATES:
 * ✅ Trigger button: px-4 + flex-col removed → w-full p-0 flex items-center justify-center
 * ✅ PRINT label span removed — label now rendered by TransportBar via LABEL_CLS
 * ✅ Outer wrapper: w-full added so it fills the 51px cell TransportBar provides
 *
 * 🔒 PRESERVED FROM V1.0:
 * ✅ Tooltip (suppressed when panel open)
 * ✅ Printer SVG icon + green active state
 * ✅ isPanelOpen / onTogglePanel / onClose props
 * ✅ Zoom panel popup — UNTOUCHED
 * ✅ handleZoomOut / handleZoomIn / handlePrint logic — UNTOUCHED
 * ✅ useEffect canvas reset on close — UNTOUCHED
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

interface PrintPanelProps {
    api: AlphaTabApi | null;
    isPanelOpen: boolean;
    onTogglePanel: () => void;
    onClose: () => void;
}

const ZOOM_STEPS = [50, 60, 70, 80, 90, 95, 100, 110, 120, 130, 150];
const DEFAULT_ZOOM_INDEX = 6; // 100%

export const PrintPanel: React.FC<PrintPanelProps> = ({
    api,
    isPanelOpen,
    onTogglePanel,
    onClose,
}) => {
    const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

    const zoomPct = ZOOM_STEPS[zoomIndex];
    const canZoomOut = zoomIndex > 0;
    const canZoomIn = zoomIndex < ZOOM_STEPS.length - 1;

    useEffect(() => {
        if (!isPanelOpen && api) {
            api.settings.display.scale = 1.0;
            api.updateSettings();
            api.render();
            setZoomIndex(DEFAULT_ZOOM_INDEX);
        }
    }, [isPanelOpen, api]);

    const handleZoomOut = useCallback(() => {
        setZoomIndex(i => {
            const next = Math.max(0, i - 1);
            if (api) {
                api.settings.display.scale = ZOOM_STEPS[next] / 100;
                api.updateSettings();
                api.render();
            }
            return next;
        });
    }, [api]);

    const handleZoomIn = useCallback(() => {
        setZoomIndex(i => {
            const next = Math.min(ZOOM_STEPS.length - 1, i + 1);
            if (api) {
                api.settings.display.scale = ZOOM_STEPS[next] / 100;
                api.updateSettings();
                api.render();
            }
            return next;
        });
    }, [api]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    const handlePrint = useCallback(() => {
        if (!api) return;
        api.print(undefined, {
            display: {
                scale: zoomPct / 100,
                padding: [10, 10, 10, 10],
            },
            player: { enableCursor: false },
            notation: {
                elements: {
                    scoreTitle: true,
                    scoreArtist: true,
                    trackNames: false,
                    guitarTuning: false,
                },
            },
        });
        onClose();
    }, [api, zoomPct, onClose]);

    return (
        // w-full: fills the 51px wrapper cell TransportBar provides
        <div className="relative w-full">

            {/* Trigger — icon only, label now owned by TransportBar */}
            <button
                onClick={isPanelOpen ? handleClose : onTogglePanel}
                disabled={!api}
                className={`group relative flex items-center justify-center w-full p-0 transition-all duration-200
          ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}
        `}
            >
                {/* Tooltip — suppressed when panel is open */}
                {!isPanelOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                        <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2">
                            <div className="flex items-center gap-1.5 justify-center">
                                <span className="text-white text-sm font-semibold">Print tab</span>
                                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300 font-mono">P</kbd>
                            </div>
                        </div>
                    </div>
                )}

                <svg width="24" height="24" viewBox="0 0 24 24"
                    className={`transition-colors ${isPanelOpen ? 'text-green-400' : 'text-blue-200'}`}
                    fill="currentColor"
                >
                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
                </svg>
            </button>

            {/* ── Print panel popup — UNTOUCHED from V1.0 ── */}
            {isPanelOpen && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[11000] w-[220px] rounded-lg overflow-hidden shadow-maestro"
                    style={{ border: '1px solid var(--panel-border)' }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b"
                        style={{ background: 'var(--panel-bg)', borderColor: 'var(--section-border)' }}
                    >
                        <button
                            onClick={handleZoomOut}
                            disabled={!canZoomOut}
                            title="Zoom Out"
                            className={`w-8 h-8 flex items-center justify-center rounded border transition-colors
                ${canZoomOut ? 'hover:bg-black/10 dark:hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                                <path d="M5 11 h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>

                        <span
                            className="text-sm font-semibold tabular-nums min-w-[48px] text-center"
                            style={{ color: 'var(--text-primary)' }}
                            aria-label="Zoom"
                        >
                            {zoomPct}%
                        </span>

                        <button
                            onClick={handleZoomIn}
                            disabled={!canZoomIn}
                            title="Zoom In"
                            className={`w-8 h-8 flex items-center justify-center rounded border transition-colors
                ${canZoomIn ? 'hover:bg-black/10 dark:hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                            style={{ color: 'var(--text-primary)', borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                                <path d="M5 11 h12 M11 5 v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-center" style={{ background: 'var(--section-bg)' }}>
                        <button
                            onClick={handlePrint}
                            className="w-full flex items-center justify-center h-[30px] rounded bg-purple-600/80 hover:bg-purple-500/90 active:bg-purple-700 text-white text-[13px] font-semibold transition-colors border border-purple-500/50"
                        >
                            Print
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};