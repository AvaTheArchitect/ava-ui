'use client';

import React from 'react';
import { useHome } from '@/hooks/ui/useHome';

interface HomeProps {
  className?: string;
  children?: React.ReactNode;
}

const Home: React.FC<HomeProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    handleToggle
  } = useHome();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading home...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
          🏠 Home
        </h1>
        <p className="text-xl text-blue-200/80 mb-0">
          Application Component - Created by Cipher Lightning Route Fix
        </p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* Home Features Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 Home Features
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Built with modern React patterns and Cipher development tools
          </p>
          <button
            onClick={handleToggle}
            className={`w-full bg-gradient-to-r text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg ${
              isActive 
                ? 'from-orange-500 to-red-500 hover:shadow-orange-400/40 animate-pulse' 
                : 'from-cyan-400 to-blue-500 hover:shadow-cyan-400/40'
            }`}
            type="button"
          >
            {isActive ? '⏹️ Stop' : '▶️ Start'} Home
          </button>
        </div>

        {/* Welcome Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎵 Welcome to Maestro.ai
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Your complete AI-powered music practice suite for guitar and vocals
          </p>
          <button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40">
            🚀 Get Started
          </button>
        </div>

        {/* Quick Links Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🔗 Quick Links
          </h3>
          <div className="flex flex-col gap-3">
            <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎸 Practice Generator
            </button>
            <button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎤 Singer's Corner
            </button>
            <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              🎶 Jam Zone
            </button>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            📊 Recent Activity
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Track your practice sessions and progress over time
          </p>
          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-400/40">
            📈 View Progress
          </button>
        </div>

        {/* AI Features Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🧠 AI Features
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Powered by Cipher Brain Intelligence for personalized learning
          </p>
          <button className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-400/40">
            🤖 Explore AI
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            ⚙️ Preferences
          </h3>
          <p className="text-blue-200 mb-6 leading-relaxed">
            Customize your Maestro.ai experience and practice settings
          </p>
          <button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40">
            🎛️ Settings
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
        🔧 Created by Cipher Lightning Route Fix | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default Home;