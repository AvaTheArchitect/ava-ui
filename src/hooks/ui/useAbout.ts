import { useState, useEffect, useCallback } from "react";

// 🎣 useAbout Hook - Created by Cipher

interface AboutState {
  isLoaded: boolean;
  isActive: boolean;
  error?: string;
}

export function useAbout() {
  const [state, setState] = useState<AboutState>({
    isLoaded: false,
    isActive: false,
  });

  useEffect(() => {
    // Initialize about
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
  }, []); //

  return {
    ...state,
    handleToggle,
  };
}
