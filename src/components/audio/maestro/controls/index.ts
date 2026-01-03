/**
 * Maestro Controls - Export Barrel
 * Date: December 30th, 2025
 *
 * Centralizes exports for clean imports
 *
 * Usage:
 * import { MaestroControlPanel } from '@/components/audio/maestro/controls';
 */

// Main Orchestrator
export { MaestroControlPanel } from "./MaestroControlPanel";

// Desktop Layout
export { TransportBar } from "./TransportBar";

// Mobile Layout
export { MobileDrawer } from "./MobileDrawer";

// Individual Controls
export { PlaybackControls } from "./PlaybackControls";
export { SpeedControl } from "./SpeedControl";
export { LoopControl } from "./LoopControl";
export { TrackMixerPanel } from "./TrackMixerPanel";
export { AudioSourceToggle } from "./AudioSourceToggle";

// 🆕 Count-In & Metronome Features
export { CountInOverlay } from "./CountInOverlay";
export { useSmartMetronome } from "./useSmartMetronome";
export { CountInPanel } from "./CountInPanel";

// Metronome types
export type { MetronomeSoundType, SubdivisionMode } from "./useSmartMetronome";
export { MetronomePanel } from "./MetronomePanel";

// Types
export * from "./MaestroControlTypes";
