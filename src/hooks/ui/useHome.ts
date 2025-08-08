import React, { useState, useEffect, useCallback } from "react";

// 🎣 useHome Hook - Created by Cipher Lightning Route Fix

interface homeState {
  isLoaded: boolean;
  isActive: boolean;
  error?: string;
}

export function useHome() {
  const [state, setState] = useState<homeState>({
    isLoaded: false,
    isActive: false,
  });

  useEffect(() => {
    // Initialize home
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

  return {
    ...state,
    handleToggle,
  }; // ✅ Added missing closing brace
}
