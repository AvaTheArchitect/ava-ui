"use client"

import React from "react"
// ✅ JamEngine 
import JamEngine from '@/modules/jam/JamEngine'
// ✅ ToolPanel 
import ToolPanel from "@/components/tools/ToolPanel"

export default function JamZone() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
                    🎸 Jam Zone
                </h1>
                <p className="text-xl text-blue-200/80 mb-0">
                    Live Jamming & Real-Time Music Creation - Beta Testing
                </p>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Main Jam Engine */}
                <JamEngine />

                {/* Additional Tools Panel */}
                <ToolPanel title="Jam Tools">
                    <div className="space-y-4">
                        <p className="text-blue-200">
                            🎵 Additional jam tools and effects will appear here
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                                🎛️ Effects
                            </button>
                            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                                🎵 Loops
                            </button>
                            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                                🎹 Synth
                            </button>
                            <button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                                🎤 Record
                            </button>
                        </div>
                    </div>
                </ToolPanel>
            </div>

            {/* Footer */}
            <div className="text-center mt-12 pt-8 border-t border-white/10 text-blue-200/70 text-sm max-w-6xl mx-auto">
                🔧 Beta Testing Mode | Real-Time Jamming Engine | {new Date().toLocaleDateString()}
            </div>
        </div>
    )
}