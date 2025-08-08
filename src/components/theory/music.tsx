'use client';

import React from 'react';
import { useMusic } from '@/hooks/theory/useMusic';

interface MusicProps {
  className?: string;
  children?: React.ReactNode;
}

const Music: React.FC<MusicProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    handleToggle
  } = useMusic();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading music...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
          🎵 Music
        </h1>
        <p className="text-xl text-blue-200/80 mb-0">
          Music Development Component - Created by Cipher
        </p>
      </div>

      {/* Content Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Music Features Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 Music Features
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
            {isActive ? '⏹️ Stop' : '▶️ Start'} Music
          </button>
        </div>

        {/* Music Capabilities Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎵 Music Capabilities
          </h3>

          {/* Music Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎸</div>
              <div className="text-blue-200 text-sm">Guitar Integration</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎤</div>
              <div className="text-blue-200 text-sm">Vocal Processing</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎵</div>
              <div className="text-blue-200 text-sm">Music Theory</div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg text-center font-medium border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105">
              <div className="text-2xl mb-2">🎧</div>
              <div className="text-blue-200 text-sm">Audio Analysis</div>
            </div>
          </div>
        </div>

        {/* Audio Engine Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🔊 Audio Engine
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Advanced Web Audio API integration for real-time processing
          </p>
          <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-400/40">
            🎛️ Audio Settings
          </button>
        </div>

        {/* Music Library Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            📚 Music Library
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Browse and organize your practice songs and chord progressions
          </p>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-400/40">
            📖 Browse Library
          </button>
        </div>

        {/* Practice Tools Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🛠️ Practice Tools
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Metronome, tuner, and other essential practice utilities
          </p>
          <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-400/40">
            🎯 Practice Tools
          </button>
        </div>

        {/* AI Music Assistant Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🤖 AI Music Assistant
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Get personalized recommendations and practice suggestions
          </p>
          <button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-400/40">
            🧠 AI Assistant
          </button>
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
        🔧 Created by Cipher  | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default Music;