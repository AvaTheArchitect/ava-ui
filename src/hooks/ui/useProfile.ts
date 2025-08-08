import { useState, useEffect, useCallback } from "react";

// 🎣 useProfile Hook - Created by Cipher Lightning Route Fix

interface ProfileState {
  isLoaded: boolean;
  isActive: boolean;
  userProfile: {
    name: string;
    email: string;
    instrument: string;
    level: string;
  } | null;
  error?: string;
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>({
    isLoaded: false,
    isActive: false,
    userProfile: null,
  });

  useEffect(() => {
    // Initialize Profile
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        userProfile: {
          name: "Musician",
          email: "",
          instrument: "guitar",
          level: "intermediate",
        },
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

  const updateProfile = useCallback(
    (profileData: Partial<ProfileState["userProfile"]>) => {
      setState((prev) => ({
        ...prev,
        userProfile: prev.userProfile
          ? { ...prev.userProfile, ...profileData }
          : null,
      }));
    },
    []
  );

  return {
    ...state,
    handleToggle,
    updateProfile,
  };
} // ✅ Added missing closing brace for function
