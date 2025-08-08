import { useState, useEffect, useCallback } from "react";

// 🎣 useSettings Hook - Created by Cipher Lightning Route Fix

interface SettingsState {
  isLoaded: boolean;
  isActive: boolean;
  theme: "light" | "dark" | "auto";
  audioSettings: {
    sampleRate: number;
    bufferSize: number;
    inputDevice: string;
    outputDevice: string;
  };
  appSettings: {
    autoSave: boolean;
    notifications: boolean;
    language: string;
  };
  error?: string;
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({
    isLoaded: false,
    isActive: false,
    theme: "dark",
    audioSettings: {
      sampleRate: 44100,
      bufferSize: 1024,
      inputDevice: "default",
      outputDevice: "default",
    },
    appSettings: {
      autoSave: true,
      notifications: true,
      language: "en",
    },
  });

  useEffect(() => {
    // Initialize Settings
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

  const updateTheme = useCallback((theme: "light" | "dark" | "auto") => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const updateAudioSettings = useCallback(
    (audioSettings: Partial<SettingsState["audioSettings"]>) => {
      setState((prev) => ({
        ...prev,
        audioSettings: { ...prev.audioSettings, ...audioSettings },
      }));
    },
    []
  );

  const updateAppSettings = useCallback(
    (appSettings: Partial<SettingsState["appSettings"]>) => {
      setState((prev) => ({
        ...prev,
        appSettings: { ...prev.appSettings, ...appSettings },
      }));
    },
    []
  );

  return {
    ...state,
    handleToggle,
    updateTheme,
    updateAudioSettings,
    updateAppSettings,
  };
} // ✅ Added missing closing brace for function
