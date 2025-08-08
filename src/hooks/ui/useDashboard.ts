import { useState, useEffect, useCallback } from "react";

// 🎣 useDashboard Hook - Created by Cipher

interface DashboardState {
  isLoaded: boolean;
  isActive: boolean;
  error?: string;
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    isLoaded: false,
    isActive: false,
  });

  useEffect(() => {
    // Initialize Dashboard
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
  };
} // ✅ Added missing closing brace for function
