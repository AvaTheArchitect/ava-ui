'use client';

/**
 * TabEditorPanel.tsx
 * src/components/audio/maestro/tabs/TabEditorPanel.tsx
 *
 * Coming Soon placeholder — reached via:
 *   /tab/new?open=editor  (from NewTabPanel "Create blank tab")
 *
 * Matches Maestro.ai color scheme V29:
 *   - bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900
 *   - Orange accent (text-orange-500) for primary title
 *   - Purple glass cards (bg-blue-500/5 backdrop-blur-lg border-blue-300/20)
 */

import React from 'react';
import { useRouter } from 'next/navigation';

export default function TabEditorPanel() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex flex-col items-center justify-center px-4">

            {/* ── Glass card ────────────────────────────────────────── */}
            <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 rounded-2xl p-12 max-w-lg w-full text-center">

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="11" x2="12" y2="17" />
                        <line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-orange-500 font-bold tracking-wide text-2xl mb-2">
                    Tab Editor
                </h1>
                <p className="text-blue-200 text-sm mb-1 font-light">
                    Maestro.ai
                </p>

                {/* Coming soon badge */}
                <span className="inline-block mt-3 mb-6 text-[10px] font-bold uppercase tracking-widest text-white px-3 py-1 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 2px 8px rgba(124,58,237,0.45)' }}>
                    Coming Soon
                </span>

                <p className="text-blue-200/70 text-sm font-light leading-relaxed mb-8">
                    The built-in tab editor is on the roadmap. For now, upload a Guitar Pro or MusicXML file to get started.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #f97316, #ea580c)',
                            boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
                        }}
                    >
                        ← Back to New Tab
                    </button>

                    <button
                        onClick={() => router.push('/synth-player')}
                        className="w-full py-2.5 rounded-lg text-sm font-medium text-blue-300 border border-blue-300/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-200"
                    >
                        Return to Player
                    </button>
                </div>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-blue-200/40 text-xs font-light">
                Maestro.ai · Tab Editor · Coming Soon
            </p>
        </div>
    );
}