'use client';

import React from 'react';

export default function SongwriterPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-orange-500 tracking-wide mb-4">
                    📝 Songwriter's Studio
                </h1>
                <p className="text-xl text-blue-200/80">
                    AI-powered songwriting and composition tools
                </p>
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-white/5 rounded-lg p-8 border border-orange-500/20">
                    <h2 className="text-2xl font-bold text-orange-400 mb-6">✍️ Coming Soon</h2>
                    <p className="text-blue-200/80">
                        Lyric assistance, chord progressions, and song structure guidance.
                    </p>
                </div>
            </div>
        </div>
    );
}
