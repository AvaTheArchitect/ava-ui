// src/app/tuner/page.tsx
'use client';

import TunerDial from '@/components/tuner/TunerDial';

export default function TunerPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
                    🎸 Guitar Tuner
                </h1>
                <p className="text-xl text-blue-200/80 mb-0">
                    Professional Guitar Tuning - Created by Cipher.ai
                </p>
            </div>

            {/* Main Tuner */}
            <div className="max-w-2xl mx-auto">
                <TunerDial />
            </div>

            {/* Footer */}
            <div className="text-center mt-12 pt-8 border-t border-white/10 text-blue-200/70 text-sm max-w-6xl mx-auto">
                🔧 Created by Cipher.ai | Simon's Flaming Guitar Circle Tuner™ Preview | {new Date().toLocaleDateString()}
            </div>
        </div>
    );
}