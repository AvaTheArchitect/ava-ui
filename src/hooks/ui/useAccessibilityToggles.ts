import { useState, useEffect, useCallback } from "react";

// 🎯 Accessibility state interface
export interface AccessibilityState {
  // Visual accessibility
  voiceConfirm: boolean;
  contrastBoost: boolean;
  reducedMotion: boolean;
  largeText: boolean;

  // Audio accessibility
  audioHints: boolean;
  chordAnnouncements: boolean;
  metronomeVoice: boolean;
  screenReaderMode: boolean;

  // Motor accessibility
  keyboardNavigation: boolean;
  stickyKeys: boolean;
  longPressDelay: number;

  // Music-specific accessibility
  colorBlindSupport: boolean;
  simplifiedNotation: boolean;
  tabFontSize: "small" | "medium" | "large" | "xl";
}

// 🎯 Accessibility actions interface
export interface AccessibilityActions {
  // Visual toggles
  toggleVoice: () => void;
  toggleContrast: () => void;
  toggleReducedMotion: () => void;
  toggleLargeText: () => void;

  // Audio toggles
  toggleAudioHints: () => void;
  toggleChordAnnouncements: () => void;
  toggleMetronomeVoice: () => void;
  toggleScreenReader: () => void;

  // Motor toggles
  toggleKeyboardNav: () => void;
  toggleStickyKeys: () => void;
  setLongPressDelay: (delay: number) => void;

  // Music-specific toggles
  toggleColorBlindSupport: () => void;
  toggleSimplifiedNotation: () => void;
  setTabFontSize: (size: AccessibilityState["tabFontSize"]) => void;

  // Utility actions
  resetToDefaults: () => void;
  savePreferences: () => void;
  loadPreferences: () => void;
}

// 🎯 Combined return type
export type UseAccessibilityToggles = AccessibilityState & AccessibilityActions;

// 🎯 Default accessibility settings
const defaultSettings: AccessibilityState = {
  // Visual
  voiceConfirm: true,
  contrastBoost: false,
  reducedMotion: false,
  largeText: false,

  // Audio
  audioHints: false,
  chordAnnouncements: false,
  metronomeVoice: false,
  screenReaderMode: false,

  // Motor
  keyboardNavigation: true,
  stickyKeys: false,
  longPressDelay: 500,

  // Music-specific
  colorBlindSupport: false,
  simplifiedNotation: false,
  tabFontSize: "medium",
};

// 🎯 Storage key for persistence
const STORAGE_KEY = "maestro-accessibility-preferences";

export default function useAccessibilityToggles(): UseAccessibilityToggles {
  const [settings, setSettings] = useState<AccessibilityState>(defaultSettings);

  // 🔄 Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.warn("Failed to load accessibility preferences:", error);
    }
  }, []);

  // 🔄 Apply visual effects when settings change
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    // High contrast mode
    if (settings.contrastBoost) {
      body.classList.add("contrast-boost");
      root.style.setProperty("--accessibility-contrast", "high");
    } else {
      body.classList.remove("contrast-boost");
      root.style.setProperty("--accessibility-contrast", "normal");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      body.classList.add("reduced-motion");
      root.style.setProperty("--accessibility-motion", "reduced");
    } else {
      body.classList.remove("reduced-motion");
      root.style.setProperty("--accessibility-motion", "normal");
    }

    // Large text
    if (settings.largeText) {
      body.classList.add("large-text");
      root.style.setProperty("--accessibility-text-scale", "1.25");
    } else {
      body.classList.remove("large-text");
      root.style.setProperty("--accessibility-text-scale", "1");
    }

    // Color blind support
    if (settings.colorBlindSupport) {
      body.classList.add("colorblind-support");
    } else {
      body.classList.remove("colorblind-support");
    }

    // Keyboard navigation
    if (settings.keyboardNavigation) {
      body.classList.add("keyboard-navigation");
    } else {
      body.classList.remove("keyboard-navigation");
    }

    // Tab font size
    root.style.setProperty(
      "--tab-font-size",
      getTabFontSizeValue(settings.tabFontSize)
    );
  }, [settings]);

  // 🔄 Announce changes to screen readers
  const announceChange = useCallback(
    (message: string) => {
      if (settings.voiceConfirm && settings.screenReaderMode) {
        // Create temporary element for screen reader announcement
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.setAttribute("aria-atomic", "true");
        announcement.className = "sr-only";
        announcement.textContent = message;
        document.body.appendChild(announcement);

        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    },
    [settings.voiceConfirm, settings.screenReaderMode]
  );

  // 🔄 Save to localStorage
  const savePreferences = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      announceChange("Accessibility preferences saved");
    } catch (error) {
      console.warn("Failed to save accessibility preferences:", error);
    }
  }, [settings, announceChange]);

  // 🔄 Auto-save when settings change
  useEffect(() => {
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [settings, savePreferences]);

  // 🎯 Visual toggle functions
  const toggleVoice = useCallback(() => {
    setSettings((prev) => ({ ...prev, voiceConfirm: !prev.voiceConfirm }));
    announceChange(
      `Voice confirmation ${settings.voiceConfirm ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.voiceConfirm]);

  const toggleContrast = useCallback(() => {
    setSettings((prev) => ({ ...prev, contrastBoost: !prev.contrastBoost }));
    announceChange(
      `High contrast ${settings.contrastBoost ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.contrastBoost]);

  const toggleReducedMotion = useCallback(() => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
    announceChange(
      `Reduced motion ${settings.reducedMotion ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.reducedMotion]);

  const toggleLargeText = useCallback(() => {
    setSettings((prev) => ({ ...prev, largeText: !prev.largeText }));
    announceChange(`Large text ${settings.largeText ? "disabled" : "enabled"}`);
  }, [announceChange, settings.largeText]);

  // 🎯 Audio toggle functions
  const toggleAudioHints = useCallback(() => {
    setSettings((prev) => ({ ...prev, audioHints: !prev.audioHints }));
    announceChange(
      `Audio hints ${settings.audioHints ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.audioHints]);

  const toggleChordAnnouncements = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      chordAnnouncements: !prev.chordAnnouncements,
    }));
    announceChange(
      `Chord announcements ${
        settings.chordAnnouncements ? "disabled" : "enabled"
      }`
    );
  }, [announceChange, settings.chordAnnouncements]);

  const toggleMetronomeVoice = useCallback(() => {
    setSettings((prev) => ({ ...prev, metronomeVoice: !prev.metronomeVoice }));
    announceChange(
      `Metronome voice ${settings.metronomeVoice ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.metronomeVoice]);

  const toggleScreenReader = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      screenReaderMode: !prev.screenReaderMode,
    }));
    announceChange(
      `Screen reader mode ${settings.screenReaderMode ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.screenReaderMode]);

  // 🎯 Motor accessibility functions
  const toggleKeyboardNav = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      keyboardNavigation: !prev.keyboardNavigation,
    }));
    announceChange(
      `Keyboard navigation ${
        settings.keyboardNavigation ? "disabled" : "enabled"
      }`
    );
  }, [announceChange, settings.keyboardNavigation]);

  const toggleStickyKeys = useCallback(() => {
    setSettings((prev) => ({ ...prev, stickyKeys: !prev.stickyKeys }));
    announceChange(
      `Sticky keys ${settings.stickyKeys ? "disabled" : "enabled"}`
    );
  }, [announceChange, settings.stickyKeys]);

  const setLongPressDelay = useCallback(
    (delay: number) => {
      setSettings((prev) => ({
        ...prev,
        longPressDelay: Math.max(100, Math.min(2000, delay)),
      }));
      announceChange(`Long press delay set to ${delay} milliseconds`);
    },
    [announceChange]
  );

  // 🎯 Music-specific accessibility functions
  const toggleColorBlindSupport = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      colorBlindSupport: !prev.colorBlindSupport,
    }));
    announceChange(
      `Color blind support ${
        settings.colorBlindSupport ? "disabled" : "enabled"
      }`
    );
  }, [announceChange, settings.colorBlindSupport]);

  const toggleSimplifiedNotation = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      simplifiedNotation: !prev.simplifiedNotation,
    }));
    announceChange(
      `Simplified notation ${
        settings.simplifiedNotation ? "disabled" : "enabled"
      }`
    );
  }, [announceChange, settings.simplifiedNotation]);

  const setTabFontSize = useCallback(
    (size: AccessibilityState["tabFontSize"]) => {
      setSettings((prev) => ({ ...prev, tabFontSize: size }));
      announceChange(`Tab font size set to ${size}`);
    },
    [announceChange]
  );

  // 🎯 Utility functions
  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
    announceChange("Accessibility settings reset to defaults");
  }, [announceChange]);

  const loadPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings((prev) => ({ ...prev, ...parsedSettings }));
        announceChange("Accessibility preferences loaded");
      }
    } catch (error) {
      console.warn("Failed to load accessibility preferences:", error);
      announceChange("Failed to load preferences");
    }
  }, [announceChange]);

  return {
    // State
    ...settings,

    // Visual actions
    toggleVoice,
    toggleContrast,
    toggleReducedMotion,
    toggleLargeText,

    // Audio actions
    toggleAudioHints,
    toggleChordAnnouncements,
    toggleMetronomeVoice,
    toggleScreenReader,

    // Motor actions
    toggleKeyboardNav,
    toggleStickyKeys,
    setLongPressDelay,

    // Music-specific actions
    toggleColorBlindSupport,
    toggleSimplifiedNotation,
    setTabFontSize,

    // Utility actions
    resetToDefaults,
    savePreferences,
    loadPreferences,
  };
}

// 🎯 Helper function for tab font sizes
function getTabFontSizeValue(size: AccessibilityState["tabFontSize"]): string {
  switch (size) {
    case "small":
      return "0.8rem";
    case "medium":
      return "1rem";
    case "large":
      return "1.25rem";
    case "xl":
      return "1.5rem";
    default:
      return "1rem";
  }
}

// 🎯 Helper function to check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 🎯 Helper function to detect high contrast preference
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: high)").matches;
}
