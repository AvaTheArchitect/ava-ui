'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';

// 🎵 Playback State Interface
export interface PlaybackState {
  isPlaying: boolean;
  isLoaded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

// 🎮 Playback Controls Interface  
export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

// 🎯 Complete Context Interface
interface PlaybackContextType {
  state: PlaybackState;
  updateState: (newState: Partial<PlaybackState>) => void;
  registerControls: (controls: PlaybackControls) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

// 🎵 Create Context
const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

// 🎯 Default State
const defaultState: PlaybackState = {
  isPlaying: false,
  isLoaded: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
};

// 🎵 Provider Component with Fixed Loop Prevention
export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlaybackState>(defaultState);
  const controlsRef = useRef<PlaybackControls | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<string>('');

  // 🔄 Update state with enhanced loop prevention
  const updateState = useCallback((newState: Partial<PlaybackState>) => {
    // Create a hash of the new state to detect duplicate updates
    const stateHash = JSON.stringify(newState);

    // Prevent duplicate updates within a short timeframe
    if (stateHash === lastUpdateRef.current) {
      return;
    }
    lastUpdateRef.current = stateHash;

    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Longer debounce to prevent rapid flashing
    updateTimeoutRef.current = setTimeout(() => {
      setState((prev) => {
        // Check if state actually changed with tolerance for floating point
        const hasChanged = Object.keys(newState).some(key => {
          const typedKey = key as keyof PlaybackState;
          const oldVal = prev[typedKey];
          const newVal = newState[typedKey];

          // For numbers, use tolerance
          if (typeof oldVal === 'number' && typeof newVal === 'number') {
            return Math.abs(oldVal - newVal) > 0.01;
          }

          return oldVal !== newVal;
        });

        if (!hasChanged) {
          return prev;
        }

        const newStateComplete = { ...prev, ...newState };
        console.log('🔄 Hook state updated:', newState);
        return newStateComplete;
      });
    }, 100); // Longer debounce to prevent flashing
  }, []);

  // 🎯 Register control callbacks (called by audio controller)
  const registerControls = useCallback((controls: PlaybackControls) => {
    console.log('🎮 Controls registered');
    controlsRef.current = controls;
  }, []);

  // 🎮 Control functions that delegate to registered controller
  const play = useCallback(() => {
    console.log('🎮 Hook play called');
    if (controlsRef.current?.play) {
      controlsRef.current.play();
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  const pause = useCallback(() => {
    console.log('🎮 Hook pause called');
    if (controlsRef.current?.pause) {
      controlsRef.current.pause();
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  const stop = useCallback(() => {
    console.log('🎮 Hook stop called');
    if (controlsRef.current?.stop) {
      controlsRef.current.stop();
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  const toggle = useCallback(() => {
    console.log('🎮 Hook toggle called');
    if (controlsRef.current?.toggle) {
      controlsRef.current.toggle();
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  const seek = useCallback((time: number) => {
    console.log('🎮 Hook seek called:', time);
    if (controlsRef.current?.seek) {
      controlsRef.current.seek(time);
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    console.log('🎮 Hook setVolume called:', volume);
    if (controlsRef.current?.setVolume) {
      controlsRef.current.setVolume(volume);
    } else {
      console.warn('⚠️ No audio controller registered');
    }
  }, []);

  // 🎯 Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    state,
    updateState,
    registerControls,
    play,
    pause,
    stop,
    toggle,
    seek,
    setVolume,
  }), [state, updateState, registerControls, play, pause, stop, toggle, seek, setVolume]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <PlaybackContext.Provider value={contextValue}>
      {children}
    </PlaybackContext.Provider>
  );
};

// 🎵 Hook to use playback controls
export const usePlaybackControls = () => {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlaybackControls must be used within a PlaybackProvider');
  }
  return context;
};