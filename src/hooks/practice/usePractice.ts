import React, { useState, useEffect, useCallback } from "react";

// 🎣 usePractice Hook - Created by Cipher

interface practiceState {
  isLoaded: boolean;
  isActive: boolean;
  practiceFeatures: string[];
  error?: string;
}

export function usePractice() {
  const [state, setState] = useState<practiceState>({
    isLoaded: false,
    isActive: false,
    practiceFeatures: [],
  });

  useEffect(() => {
    // Initialize practice
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        practiceFeatures: ["metronome", "tuner", "exercises", "recording"],
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

  const getPracticeCapabilities = useCallback(() => {
    return {
      metronomeSupport: true,
      tunerIntegration: true,
      exerciseGenerator: true,
      recordingCapability: true,
      brainEnhanced: true,
    };
  }, []); // ✅ Added missing closing brace and dependency array

  return {
    ...state,
    handleToggle,
    getPracticeCapabilities,
  }; // ✅ Added missing semicolon
} // ✅ Added missing closing brace for function
