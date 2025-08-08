import { useState, useEffect, useCallback } from 'react';

// 🎣 useTheory Hook - Created by Cipher Lightning Route Fix

interface TheoryState {
  isLoaded: boolean;
  isActive: boolean;
  theoryFeatures: string[];
  currentKey: string;
  currentScale: string;
  chordProgressions: string[];
  intervals: string[];
  error?: string;
}

export function useTheory() {
  const [state, setState] = useState<TheoryState>({
    isLoaded: false,
    isActive: false,
    theoryFeatures: [],
    currentKey: 'C',
    currentScale: 'major',
    chordProgressions: [],
    intervals: [],
  });

  useEffect(() => {
    // Initialize Theory
    const timer = setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isLoaded: true,
        theoryFeatures: ['scales', 'chords', 'progressions', 'intervals', 'analysis'],
        chordProgressions: ['I-V-vi-IV', 'ii-V-I', 'vi-IV-I-V'],
        intervals: ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd']
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isActive: !prev.isActive 
    }));
  }, []); // ✅ Added missing closing brace and dependency array

  const setKey = useCallback((key: string) => {
    setState(prev => ({ ...prev, currentKey: key }));
  }, []);

  const setScale = useCallback((scale: string) => {
    setState(prev => ({ ...prev, currentScale: scale }));
  }, []);

  const getTheoryCapabilities = useCallback(() => {
    return {
      scaleAnalysis: true,
      chordProgression: true,
      harmonyAnalysis: true,
      intervalTraining: true,
      keyDetection: true
    };
  }, []);

  return {
    ...state,
    handleToggle,
    setKey,
    setScale,
    getTheoryCapabilities,
  };
} // ✅ Added missing closing brace for function