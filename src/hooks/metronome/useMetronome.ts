import { useState, useEffect, useCallback } from "react";

// 🎣 useMetronome Hook - Created by Cipher Lightning Route Fix

interface MetronomeState {
  isLoaded: boolean;
  isActive: boolean;
  bpm: number;
  isPlaying: boolean;
  timeSignature: { beats: number; noteValue: number };
  currentBeat: number;
  error?: string;
}

export function useMetronome() {
  const [state, setState] = useState<MetronomeState>({
    isLoaded: false,
    isActive: false,
    bpm: 120,
    isPlaying: false,
    timeSignature: { beats: 4, noteValue: 4 },
    currentBeat: 0,
  });

  useEffect(() => {
    // Initialize Metronome
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  }, []); // ✅ Added missing closing brace and dependency array

  const setBpm = useCallback((bpm: number) => {
    setState((prev) => ({ ...prev, bpm: Math.max(40, Math.min(200, bpm)) }));
  }, []);

  const startMetronome = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const stopMetronome = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, []);

  return {
    ...state,
    handleToggle,
    setBpm,
    startMetronome,
    stopMetronome,
  };
} // ✅ Added missing closing brace for function
