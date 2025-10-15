'use client';

import React from 'react';
import { useTheory } from '@/hooks/theory/useTheory';

interface TheoryProps {
  className?: string;
  children?: React.ReactNode;
}

const Theory: React.FC<TheoryProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    theoryFeatures,
    handleToggle,
    getTheoryCapabilities
  } = useTheory();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading music theory...</div>
      </div>
    );
  }

  const capabilities = getTheoryCapabilities();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
          🎼 Music Theory
        </h1>
        <p className="text-xl text-blue-200/80 mb-0">
          Interactive Music Theory Learning - Created by Cipher.ai
        </p>
      </div>

      {/* Content Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

        {/* Theory Features Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 Theory Features
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Interactive music theory with AI-powered explanations and examples
          </p>
          <button
            onClick={handleToggle}
            className={`w-full bg-gradient-to-r text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg ${isActive
                ? 'from-orange-500 to-red-500 hover:shadow-orange-400/40 animate-pulse'
                : 'from-cyan-400 to-blue-500 hover:shadow-cyan-400/40'
              }`}
            type="button"
          >
            {isActive ? '⏹️ Stop' : '▶️ Start'} Theory
          </button>
        </div>

        {/* Core Concepts Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            📚 Core Concepts
          </h3>

          {/* Theory Concepts Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {theoryFeatures.map((feature, index) => (
              <div key={feature} className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
                <div className="text-2xl mb-2">
                  {index === 0 ? '🎵' : index === 1 ? '🎸' : index === 2 ? '🔄' : '🔍'}
                </div>
                <div className="text-blue-200 text-sm capitalize">{feature}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Lessons Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎓 Interactive Lessons
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Step-by-step lessons with visual aids and audio examples
          </p>
          <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-400/40">
            📖 Start Lesson
          </button>
        </div>

        {/* Scales & Modes Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎵 Scales & Modes
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Explore major, minor, pentatonic, and modal scales with examples
          </p>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-400/40">
            🎼 Explore Scales
          </button>
        </div>

        {/* Chord Theory Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎸 Chord Theory
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Build and understand triads, 7th chords, and extensions
          </p>
          <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-400/40">
            🎹 Chord Builder
          </button>
        </div>

        {/* Interval Training Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎧 Interval Training
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Develop perfect pitch and interval recognition skills
          </p>
          <button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-400/40">
            👂 Train Ears
          </button>
        </div>

        {/* Quick Theory Tools */}
        <div className="lg:col-span-2 xl:col-span-3 bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            ⚡ Quick Theory Tools
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎼 Circle of 5ths
            </button>
            <button className="bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎹 Key Finder
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎵 Progression Builder
            </button>
            <button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              📊 Analysis Tool
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
        🔧 Created by Cipher.ai | Interactive Music Theory | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default Theory;