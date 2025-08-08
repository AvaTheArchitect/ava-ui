'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface MetronomeProps {
  onClose: () => void;
}

export default function Metronome({ onClose }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (isPlaying) {
      console.log('Metronome playing at', bpm, 'BPM');
      // Add metronome logic here
    }
  }, [isPlaying, bpm]);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-white">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Metronome</h3>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          ×
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-white/70 mb-2">Tempo: {bpm} BPM</label>
          <input
            type="range"
            min="60"
            max="200"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-white/70 mb-2">Volume: {Math.round(volume * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? 'Stop' : 'Start'}
          </button>
          
          <button
            onClick={() => setBpm(120)}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold"
          >
            Reset
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {[60, 80, 120, 140].map(tempo => (
            <button
              key={tempo}
              onClick={() => setBpm(tempo)}
              className={`
                bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl text-sm
                ${bpm === tempo ? 'bg-blue-500/30 ring-2 ring-blue-400' : ''}
              `}
            >
              {tempo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}