'use client';

/**
 * ExportPanel.tsx - V1.2: ICON-ONLY TRIGGER, LABEL OWNED BY TRANSPORTBAR
 * Date: March 19th, 2026
 *
 * 🆕 V1.2 UPDATES:
 * ✅ Trigger button: px-4 + flex-col removed → w-full p-0 flex items-center justify-center
 * ✅ EXPORT label span removed — label now rendered by TransportBar via LABEL_CLS
 * ✅ Outer wrapper: w-full added so it fills the 51px cell TransportBar provides
 *
 * 🔒 PRESERVED FROM V1.1:
 * ✅ Tooltip (suppressed when panel open)
 * ✅ Download SVG icon + green active state
 * ✅ isPanelOpen / onTogglePanel / onClose props
 * ✅ Format picker popup — UNTOUCHED
 * ✅ MIDI locked badge, Guitar Pro handler — UNTOUCHED
 * ✅ Panel dimensions, padding, two-tone spec — UNTOUCHED
 */

import React from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';

interface ExportPanelProps {
    api: AlphaTabApi | null;
    isPanelOpen: boolean;
    onTogglePanel: () => void;
    onClose: () => void;
    onExportMidi?: () => void;
    onExportGuitarPro?: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
    api,
    isPanelOpen,
    onTogglePanel,
    onClose,
    onExportMidi,
    onExportGuitarPro,
}) => {
    const handleGuitarPro = () => {
        if (onExportGuitarPro) {
            onExportGuitarPro();
        } else {
            console.log('🎸 Export as Guitar Pro requested');
        }
        onClose();
    };

    return (
        // w-full: fills the 51px wrapper cell TransportBar provides
        <div className="relative w-full">

            {/* Trigger — icon only, label now owned by TransportBar */}
            <button
                onClick={onTogglePanel}
                disabled={!api}
                className={`group relative flex items-center justify-center w-full p-0 transition-all duration-200
          ${!api ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}
        `}
            >
                {/* Tooltip — suppressed when panel is open */}
                {!isPanelOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[12000] whitespace-nowrap">
                        <div className="bg-gray-900/95 border border-gray-700 rounded-lg shadow-2xl px-3 py-2">
                            <span className="text-white text-sm font-semibold">Download tab</span>
                        </div>
                    </div>
                )}

                <svg
                    width="24" height="24" viewBox="0 0 24 24"
                    className={`transition-colors ${isPanelOpen ? 'text-green-400' : 'text-blue-300 group-hover:text-cyan-300'}`}
                    fill="currentColor"
                >
                    <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
                </svg>
            </button>

            {/* ── Format picker popup — UNTOUCHED from V1.1 ── */}
            {isPanelOpen && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[11000] w-[250px] rounded-lg overflow-hidden shadow-maestro"
                    style={{ border: '1px solid var(--panel-border)' }}
                >
                    <div
                        className="flex items-center justify-center p-5"
                        style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--section-border)' }}
                    >
                        <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Choose file format
                        </span>
                    </div>

                    <div className="p-5 flex items-center justify-between" style={{ background: 'var(--section-bg)' }}>
                        <div className="relative">
                            <button
                                disabled
                                title="Export as MIDI (all tracks) — coming soon"
                                className="flex items-center justify-center w-[97.5px] h-[26px] px-[14px] rounded bg-gray-800 text-gray-400 text-[12px] font-medium cursor-not-allowed border border-gray-600/60 whitespace-nowrap"
                            >
                                MIDI
                            </button>
                            <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg width="7" height="9" viewBox="0 0 7 9" fill="white">
                                    <path d="M5.5 3.5H5V2.25C5 1.01 3.99 0 2.75 0S.5 1.01.5 2.25V3.5H0V8.5H5.5V3.5zM1.5 2.25C1.5 1.56 2.06 1 2.75 1S4 1.56 4 2.25V3.5H1.5V2.25zM3 6.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5v-.75c0-.28.22-.5.5-.5s.5.22.5.5V6.5z" />
                                </svg>
                            </span>
                        </div>

                        <button
                            onClick={handleGuitarPro}
                            title="Export as Guitar Pro (all tracks)"
                            className="flex items-center justify-center w-[97.5px] h-[26px] px-[14px] rounded bg-purple-600/80 hover:bg-purple-500/90 active:bg-purple-700 text-white text-[12px] font-medium transition-colors border border-purple-500/50 whitespace-nowrap"
                        >
                            Guitar Pro
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};