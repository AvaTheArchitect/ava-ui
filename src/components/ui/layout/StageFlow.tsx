'use client';

import React, { useState } from 'react';
import Metronome from '@/components/metronome/Metronome';
import JamEngine from '@/modules/jam/JamEngine';
import useAccessibilityToggles from '@/hooks/ui/useAccessibilityToggles';

export default function StageFlow() {
  const [showInspector, setShowInspector] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showJamEngine, setShowJamEngine] = useState(false);
  const accessibilityToggles = useAccessibilityToggles();

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <button onClick={() => setShowInspector(!showInspector)} className="bg-purple-700 text-white px-3 py-1 rounded">
          Toggle Inspector
        </button>
        <button onClick={() => setShowMetronome(!showMetronome)} className="bg-blue-700 text-white px-3 py-1 rounded">
          Toggle Metronome
        </button>
        <button onClick={() => setShowJamEngine(!showJamEngine)} className="bg-green-700 text-white px-3 py-1 rounded">
          Toggle Jam Engine
        </button>
      </div>

      {showInspector && (
        <div className="bg-gray-800 text-white p-4 rounded">
          <h3>Inspector Panel</h3>
          <p>Stage flow inspector content</p>
        </div>
      )}

      {showMetronome && (
        <Metronome onClose={() => setShowMetronome(false)} />
      )}

      {showJamEngine && (
        <JamEngine />
      )}
    </div>
  );
}