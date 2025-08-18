'use client';

import React, { useState, useRef, useEffect } from 'react';

interface GuitarTab {
  id: string;
  title: string;
  artist: string;
  tuning: string[];
  bpm: number;
  timeSignature: string;
  tabs: TabMeasure[];
}

interface TabMeasure {
  strings: string[];
  timing: number[];
}

interface TabPlayerProps {
  tabData?: GuitarTab;
  className?: string;
  onTabChange?: (position: number) => void;
}

export const TabPlayer: React.FC<TabPlayerProps> = ({
  tabData,
  className = "",
  onTabChange
}) => {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onTabChange?.(currentPosition);
  };

  if (!tabData) {
    return (
      <div className={`tab-player ${className}`}>
        <p>No tab data available</p>
      </div>
    );
  }

  return (
    <div className={`tab-player ${className}`} data-testid="tabplayer">
      <div className="tab-header">
        <h4>🎼 {tabData.title} - {tabData.artist}</h4>
      </div>

      <div className="tab-controls">
        <button onClick={handlePlay} className="btn-playback">
          {isPlaying ? '⏹️ Stop' : '▶️ Play'}
        </button>
      </div>

      <div className="tab-display">
        {tabData.tabs.map((measure, index) => (
          <div key={index} className="tab-measure">
            {measure.strings.map((stringNotes, stringIndex) => (
              <div key={stringIndex} className="tab-string">
                {stringNotes}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabPlayer;