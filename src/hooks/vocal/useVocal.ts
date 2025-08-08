import { useState, useEffect, useCallback } from "react";

interface VocalState {
  isLoaded: boolean;
  isActive: boolean;
  vocalFeatures: string[];
  error?: string;
}

export function useVocal() {
  const [state, setState] = useState<VocalState>({
    isLoaded: false,
    isActive: false,
    vocalFeatures: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        vocalFeatures: ["pitch", "harmony", "breathing", "exercises"],
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  }, []);

  return {
    ...state,
    handleToggle,
  };
}
