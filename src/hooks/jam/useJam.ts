import { useState, useEffect, useCallback } from "react";

// 🎣 useJam Hook - Created by Cipher.ai

interface JamState {
  isLoaded: boolean;
  isActive: boolean;
  musicFeatures: string[];
  error?: string;
}

export function useJam() {
  const [state, setState] = useState<JamState>({
    isLoaded: false,
    isActive: false,
    musicFeatures: [],
  });

  useEffect(() => {
    // Initialize Jam
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        musicFeatures: ["guitar", "vocal", "audio", "theory"],
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

  const getJamCapabilities = useCallback(() => {
    return {
      guitarSupport: true,
      vocalHarmony: true,
      backingTracks: true,
      realTimeJam: true,
      recordingCapability: true,
    };
  }, []);

  return {
    ...state,
    handleToggle,
    getJamCapabilities,
  };
} // ✅ Added missing closing brace for function
