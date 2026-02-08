/**
 * Maestro Control Panel - Shared Type Definitions
 * Centralizes all interfaces for menu tray components
 * MaestroControlTypes.ts - V98.62: MASTER VOLUME TYPES
 * Date: January 15th, 2026
 * 
 * 🆕 V98.62 UPDATES:
 * ✅ Added masterVolume and onMasterVolumeChange to MaestroControlPanelProps
 * ✅ Added masterVolume and onMasterVolumeChange to TransportBarProps
 * ✅ Added masterVolume and onMasterVolumeChange to TrackMixerPanelProps
 * 
 * 🔒 PRESERVED:
 * ✅ Theme and onThemeToggle props
 * ✅ All existing interfaces unchanged
 */
import type { AlphaTabApi, Track, SongInfo } from "@/lib/alphaTab/types";

// ==================== MAIN CONTROL PANEL ====================

export interface MaestroControlPanelProps {
  // AlphaTab API
  api: AlphaTabApi | null;

  // Playback State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;

  // Track State
  tracks: Track[];
  selectedTrack: number;
  songInfo: SongInfo | null;

  // Loop State
  isLooping: boolean;
  hasLoopSelection: boolean;

  // Audio Source
  audioSource: "synth" | "original";

  // Track Mixer State
  trackMuteState: Map<number, boolean>;
  trackSoloState: Map<number, boolean>;

  // Theme
  theme?: "light" | "dark";

  // 🎵 V98.62: Master Volume
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;

  // Callbacks
  onPlayPause: () => void;
  onStop: () => void;
  onLoopToggle: () => void;
  onLoopRangeChange?: (start: number, end: number) => void;
  onSpeedChange: (speed: number) => void;
  onTrackChange: (index: number) => void;
  onAudioSourceChange: (source: "synth" | "original") => void;
  onTrackMuteToggle: (index: number) => void;
  onTrackSoloToggle: (index: number) => void;
  onThemeToggle?: () => void;
}

// ==================== INDIVIDUAL COMPONENTS ====================

export interface PlaybackControlsProps {
  api: AlphaTabApi | null;
  isPlaying: boolean;
  audioSource: "synth" | "original";
  onPlayPause: () => void;
  onStop?: () => void;
  onAudioSourceChange: (source: "synth" | "original") => void;
  showAudioToggle?: boolean; // Desktop shows inline, mobile in drawer
}

export interface SpeedControlProps {
  api: AlphaTabApi | null;
  playbackSpeed: number;
  songInfo: SongInfo | null;
  onSpeedChange: (speed: number) => void;
}

export interface LoopControlProps {
  api: AlphaTabApi | null;
  isLooping: boolean;
  hasSelection: boolean;
  onLoopToggle: () => void;
}

export interface TrackMixerPanelProps {
  api: AlphaTabApi | null;
  tracks: Track[];
  selectedTrack: number;
  trackMuteState: Map<number, boolean>;
  trackSoloState: Map<number, boolean>;
  onTrackChange: (index: number) => void;
  onMuteToggle: (index: number) => void;
  onSoloToggle: (index: number) => void;
  
  // 🎵 V98.62: Master Volume
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
}

export interface AudioSourceToggleProps {
  audioSource: "synth" | "original";
  onChange: (source: "synth" | "original") => void;
  disabled?: boolean;
}

export interface TransportBarProps {
  // Desktop bottom bar wrapper
  api: AlphaTabApi | null;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  hasLoopSelection: boolean;
  audioSource: "synth" | "original";
  tracks: Track[];
  selectedTrack: number;
  songInfo: SongInfo | null;
  trackMuteState: Map<number, boolean>;
  trackSoloState: Map<number, boolean>;
  theme?: "light" | "dark";
  
  // 🎵 V98.62: Master Volume
  masterVolume?: number;
  onMasterVolumeChange?: (volume: number) => void;
  
  onPlayPause: () => void;
  onLoopToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onAudioSourceChange: (source: "synth" | "original") => void;
  onTrackChange: (index: number) => void;
  onTrackMuteToggle: (index: number) => void;
  onTrackSoloToggle: (index: number) => void;
  onThemeToggle?: () => void;         
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  audioSource: "synth" | "original";
  theme?: "light" | "dark";
  onAudioSourceChange: (source: "synth" | "original") => void;
  onThemeToggle?: () => void;
  // Stub buttons for future features
  onMetronomeToggle?: () => void;
  onCountInToggle?: () => void;
  onTunerOpen?: () => void;
  onPrintOpen?: () => void;
}

// ==================== HELPER TYPES ====================

export type ControlButtonVariant =
  | "primary"
  | "secondary"
  | "active"
  | "disabled";

export interface ControlButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  variant?: ControlButtonVariant;
  disabled?: boolean;
  ariaPressed?: boolean;
  ariaHasPopup?: boolean;
  tooltip?: string;
  keyboardShortcut?: string;
  className?: string;
}