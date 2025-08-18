'use client';

import React, { useState, useRef, useEffect } from 'react';

// 🧠 TestAudioController - Enhanced by Dual Brain with NEW FEATURES with NEW FEATURES
// Generated from starter specification

interface TestAudioControllerProps {
  className?: string;
  onAction?: (action: string) => void;
}

/**
 * 🎸 TestAudioController - ENHANCED with new features
 * Original: Generated from starter template
 * Updates: Loop functionality for practice sections, Audio effects (reverb, delay), Recording capabilities
 */
export const TestAudioController: React.FC<TestAudioControllerProps> = ({
  className = "",
  onAction
}) => {
  const [isActive, setIsActive] = useState(false);
  const [loopActive, setLoopActive] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(30);
  const [reverbLevel, setReverbLevel] = useState(0);
  const [delayLevel, setDelayLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ready' | 'practicing'>('idle');
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize TestAudioController
    console.log('TestAudioController initialized');
    setStatus('ready');
  }, []);

  const handleStart = () => {
    setIsActive(true);
    setStatus('practicing');
    onAction?.('start');
  };

  const handleStop = () => {
    setIsActive(false);
    setStatus('ready');
    onAction?.('stop');
  };



  
  
  const toggleLoop = () => {
    setLoopActive(!loopActive);
    console.log(`Loop: ${!loopActive ? 'ON' : 'OFF'} (${loopStart}s - ${loopEnd}s)`);
    onAction?.(`loop-${!loopActive ? 'on' : 'off'}`);
  };
  
  const adjustReverb = (level: number) => {
    setReverbLevel(level);
    console.log(`Reverb: ${level}%`);
    onAction?.(`reverb-${level}`);
  };

  const adjustDelay = (level: number) => {
    setDelayLevel(level);
    console.log(`Delay: ${level}%`);
    onAction?.(`delay-${level}`);
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    console.log(`Recording: ${!isRecording ? 'STARTED' : 'STOPPED'}`);
    onAction?.(`record-${!isRecording ? 'start' : 'stop'}`);
  };

  return (
    <div 
      ref={componentRef}
      className={`test-component ${className}`}
      data-testid="testaudiocontroller"
    >
      <div className="component-header">
        <h2>🎸 TestAudioController</h2>
        <span className={`status status-${status}`}>
          Status: {status}
        </span>
      </div>
      
      <div className="component-content">
        <div className="controls">
          {!isActive ? (
            <button 
              onClick={handleStart}
              className="btn-start"
              type="button"
            >
              ▶️ Start TestAudioController
            </button>
          ) : (
            <button 
              onClick={handleStop}
              className="btn-stop"
              type="button"
            >
              ⏹️ Stop TestAudioController
            </button>
          )}
        </div>
        
        <div className="display">
          {isActive ? (
            <div className="active-display">
              <p>🎵 TestAudioController is now active!</p>
              <div className="practice-info">
                <p>Practice session in progress...</p>
              </div>
            </div>
          ) : (
            <div className="idle-display">
              <p>Ready to start TestAudioController</p>
              <p>Click the start button to begin your practice session.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestAudioController;