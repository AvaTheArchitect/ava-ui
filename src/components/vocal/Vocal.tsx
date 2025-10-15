'use client';

import React from 'react';
import { useVocal } from '@/hooks/vocal/useVocal';
import VocalModule from '@/modules/vocal/VocalModule';; // ✅ Import the brain engine

interface VocalProps {
  className?: string;
  children?: React.ReactNode;
}

const Vocal: React.FC<VocalProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    handleToggle
  } = useVocal();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading Singer's Corner...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
          🎤 Singer's Corner
        </h1>
        <p className="text-xl text-blue-200/80 mb-0">
          Vocal Training & Development - Created by Cipher.ai
        </p>
      </div>
      {/* ADD THIS - The AI Vocal Module */}
      <div className="max-w-6xl mx-auto mb-12">
        <VocalModule
          onAnalysisComplete={(result) => console.log('🎤 AI Result:', result)}
          className="w-full"
        />
      </div>
      {/* Content Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* Vocal Features Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 Vocal Features
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Enhanced with music development capabilities and Cipher Brain Intelligence
          </p>
          <button
            onClick={handleToggle}
            className={`w-full bg-gradient-to-r text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg ${isActive
              ? 'from-orange-500 to-red-500 hover:shadow-orange-400/40 animate-pulse'
              : 'from-cyan-400 to-blue-500 hover:shadow-cyan-400/40'
              }`}
            type="button"
          >
            {isActive ? '⏹️ Stop' : '▶️ Start'} Vocal Training
          </button>
        </div>

        {/* Vocal Techniques Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎵 Vocal Techniques
          </h3>

          {/* Vocal Techniques Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🫁</div>
              <div className="text-blue-200 text-sm">Breath Control</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎤</div>
              <div className="text-blue-200 text-sm">Vocal Processing</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎵</div>
              <div className="text-blue-200 text-sm">Pitch Training</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎧</div>
              <div className="text-blue-200 text-sm">Audio Analysis</div>
            </div>
          </div>
        </div>

        {/* Vocal Warmups Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🔥 Vocal Warmups
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Essential vocal exercises to prepare your voice for singing
          </p>
          <button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-400/40">
            🎵 Start Warmup
          </button>
        </div>

        {/* Pitch Training Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 Pitch Training
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Develop perfect pitch and intonation with AI-powered feedback
          </p>
          <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-400/40">
            🎼 Train Pitch
          </button>
        </div>

        {/* Voice Analysis Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            📊 Voice Analysis
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Real-time analysis of vocal range, tone, and performance metrics
          </p>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-400/40">
            🔍 Analyze Voice
          </button>
        </div>

        {/* Karaoke Mode Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎤 Karaoke Mode
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Practice with backing tracks and real-time vocal guidance
          </p>
          <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-400/40">
            🎵 Karaoke
          </button>
        </div>

        {/* Quick Vocal Exercises */}
        <div className="lg:col-span-2 xl:col-span-3 bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            ⚡ Quick Vocal Exercises
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🫁 Breathing
            </button>
            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎵 Scales
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎤 Articulation
            </button>
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎯 Range Extend
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {children && (
        <div className="col-span-full bg-white/5 rounded-2xl p-8 border border-white/10 mt-8 max-w-6xl mx-auto">
          {children}
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-white/10 text-blue-200/70 text-sm max-w-6xl mx-auto">
        🔧 Created by Cipher.ai | Singer's Corner | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default Vocal;