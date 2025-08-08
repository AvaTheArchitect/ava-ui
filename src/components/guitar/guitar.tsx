
'use client';

import React from 'react';
import { useGuitar } from '@/hooks/guitar/useGuitar';

interface GuitarProps {
  className?: string;
  children?: React.ReactNode;
}

const Guitar: React.FC<GuitarProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    handleToggle
  } = useGuitar();

  if (!isLoaded) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 border-3 border-cyan-300/30 border-t-cyan-400 rounded-full animate-spin-slow"></div>
        <div className="text-white text-xl">Loading guitar...</div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-8 min-h-screen bg-cyber-gradient text-white ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 bg-title-gradient bg-clip-text text-transparent animate-shimmer bg-size-200">
          🎸 guitar
        </h1>
        <p className="text-xl text-gray-400 mb-0">
          Music Development Component - Created by Cipher.ai
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">

        {/* Guitar Features Card */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-400/20 hover:border-cyan-400/30 overflow-hidden">
          {/* Gradient top border on hover */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-title-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎯 guitar Features
          </h3>
          <p className="text-gray-300 mb-6">
            Enhanced with music development capabilities and Cipher Brain Intelligence
          </p>

          {/* Practice Controls */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleToggle}
              className={`flex-1 bg-button-gradient text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 ${isActive
                ? 'bg-active-gradient animate-pulse-slow'
                : 'bg-start-gradient hover:shadow-cyan-400/40'
                }`}
              type="button"
            >
              {isActive ? '⏹️ Stop' : '▶️ Start'} guitar
            </button>
          </div>

          {/* Status Info */}
          <div className="flex justify-between items-center py-4 px-4 bg-black/30 rounded-lg text-sm">
            <div className={`flex items-center gap-2 font-semibold ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
              <span>●</span>
              {isActive ? 'Active' : 'Inactive'}
            </div>
            <div className="font-bold text-cyan-400 text-lg">
              Current: C Major
            </div>
          </div>
        </div>

        {/* Tuning Display Card */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-400/20 hover:border-cyan-400/30 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-title-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎵 Guitar Tuning
          </h3>

          <div className="flex flex-col gap-3">
            {['E', 'A', 'D', 'G', 'B', 'E'].map((note, index) => (
              <div key={index} className="grid grid-cols-[2rem_2rem_1fr] items-center gap-4 p-3 bg-white/5 rounded-lg transition-colors duration-300 hover:bg-white/10">
                <div className="font-bold text-gray-400 text-center">
                  {6 - index}
                </div>
                <div className="font-bold text-xl text-cyan-400 text-center">
                  {note}
                </div>
                <div className="h-2 bg-white/10 rounded overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-green-400 to-green-400 rounded transition-all duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chord Grid Card */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-400/20 hover:border-cyan-400/30 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-title-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🎸 Quick Chords
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {['C', 'G', 'Am', 'F', 'D', 'Em', 'Dm', 'A'].map((chord, index) => (
              <button
                key={chord}
                className={`bg-white/10 border-2 border-white/20 text-white py-6 px-4 rounded-xl font-bold text-lg cursor-pointer transition-all duration-300 hover:bg-cyan-400/20 hover:border-cyan-400 hover:scale-105 ${index === 0 ? 'bg-start-gradient border-cyan-400 text-black shadow-lg shadow-cyan-400/50' : ''
                  }`}
                type="button"
              >
                {chord}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Controls Card */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-400/20 hover:border-cyan-400/30 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-title-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🔊 Audio Controls
          </h3>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <label className="font-semibold text-cyan-400 text-base">Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="75"
                className="w-full h-2 bg-white/20 rounded outline-none transition-all duration-300 hover:bg-white/30 slider-thumb"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-semibold text-cyan-400 text-base">Speed</label>
              <input
                type="range"
                min="50"
                max="150"
                defaultValue="100"
                className="w-full h-2 bg-white/20 rounded outline-none transition-all duration-300 hover:bg-white/30 slider-thumb"
              />
            </div>
          </div>
        </div>

        {/* AI Features Card */}
        <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-400/20 hover:border-cyan-400/30 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-title-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
            🧠 AI Features
          </h3>

          <div className="flex flex-col gap-6">
            {[
              { icon: '🎯', title: 'Smart Practice', desc: 'AI-powered practice recommendations' },
              { icon: '📊', title: 'Progress Tracking', desc: 'Real-time performance analytics' },
              { icon: '🎵', title: 'Chord Recognition', desc: 'Automatic chord detection' },
              { icon: '🎸', title: 'Technique Analysis', desc: 'Playing technique feedback' }
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl transition-all duration-300 hover:bg-white/10 hover:translate-x-1">
                <div className="text-3xl min-w-12 text-center">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <h4 className="m-0 mb-2 text-cyan-400 text-lg">{feature.title}</h4>
                  <p className="m-0 text-gray-300 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Children */}
      {children && (
        <div className="col-span-full mt-8">
          {children}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-8 border-t border-white/10 text-gray-400 text-sm">
        🔧 Created by Cipher  | {new Date().toLocaleDateString()}
      </div>

      {/* Custom Styles for Slider */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: linear-gradient(45deg, #00f5ff, #0080ff);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0, 245, 255, 0.3);
          transition: all 0.3s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 15px rgba(0, 245, 255, 0.5);
        }
        
        .bg-size-200 {
          background-size: 200% 200%;
        }
      `}</style>
    </div>
  );
};

export default Guitar;