/**
 * 🎵 useAudioAnimationFrame - Real-time Audio Visual Sync Hook
 * ===========================================================
 * Provides 60fps precision for Songsterr-style visual sync
 */

import { useEffect, useRef, useCallback } from "react";

export interface AudioFrameData {
  currentTime: number;
  duration: number;
  progress: number; // 0-1
  isPlaying: boolean;
  timestamp: number;
}

export type AnimationCallback = (frameData: AudioFrameData) => void;

export interface AudioAnimationOptions {
  enabled?: boolean;
  throttleMs?: number; // Throttle updates for performance
  onlyWhenPlaying?: boolean;
}

/**
 * 🎯 Real-time audio animation frame hook
 * Perfect for tab cursors, fret highlights, visual meters
 */
export const useAudioAnimationFrame = (
  audioRef: React.RefObject<HTMLAudioElement>,
  onFrameUpdate: AnimationCallback,
  options: AudioAnimationOptions = {}
) => {
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const { enabled = true, throttleMs = 0, onlyWhenPlaying = true } = options;

  const frameLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;

    const now = performance.now();
    const isPlaying = !audio.paused && !audio.ended;

    // Skip if only updating when playing and audio is paused
    if (onlyWhenPlaying && !isPlaying) {
      animationFrameRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    // Throttle updates if specified
    if (throttleMs > 0 && now - lastUpdateRef.current < throttleMs) {
      animationFrameRef.current = requestAnimationFrame(frameLoop);
      return;
    }

    lastUpdateRef.current = now;

    const frameData: AudioFrameData = {
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
      progress: audio.duration ? audio.currentTime / audio.duration : 0,
      isPlaying,
      timestamp: now,
    };

    onFrameUpdate(frameData);

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(frameLoop);
  }, [audioRef, onFrameUpdate, enabled, throttleMs, onlyWhenPlaying]);

  useEffect(() => {
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(frameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [frameLoop, enabled]);

  // Manual start/stop controls
  const start = useCallback(() => {
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(frameLoop);
    }
  }, [frameLoop]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  return { start, stop, isRunning: !!animationFrameRef.current };
};

/**
 * 🎼 Specialized hook for tab/notation sync
 */
export const useTabSyncFrame = (
  audioRef: React.RefObject<HTMLAudioElement>,
  onTabUpdate: (time: number, progress: number) => void,
  enabled: boolean = true
) => {
  return useAudioAnimationFrame(
    audioRef,
    useCallback(
      (frameData) => {
        onTabUpdate(frameData.currentTime, frameData.progress);
      },
      [onTabUpdate]
    ),
    { enabled, onlyWhenPlaying: true }
  );
};

/**
 * 🎸 Specialized hook for fretboard highlights
 */
export const useFretboardSyncFrame = (
  audioRef: React.RefObject<HTMLAudioElement>,
  onFretUpdate: (time: number, isPlaying: boolean) => void,
  enabled: boolean = true
) => {
  return useAudioAnimationFrame(
    audioRef,
    useCallback(
      (frameData) => {
        onFretUpdate(frameData.currentTime, frameData.isPlaying);
      },
      [onFretUpdate]
    ),
    { enabled, throttleMs: 16 } // ~60fps
  );
};

/**
 * 🔁 Specialized hook for loop region visualization
 */
export const useLoopSyncFrame = (
  audioRef: React.RefObject<HTMLAudioElement>,
  loopStart: number,
  loopEnd: number,
  onLoopUpdate: (isInLoop: boolean, progress: number) => void,
  enabled: boolean = true
) => {
  return useAudioAnimationFrame(
    audioRef,
    useCallback(
      (frameData) => {
        const isInLoop =
          frameData.currentTime >= loopStart &&
          frameData.currentTime <= loopEnd;
        const loopProgress = isInLoop
          ? (frameData.currentTime - loopStart) / (loopEnd - loopStart)
          : 0;
        onLoopUpdate(isInLoop, loopProgress);
      },
      [loopStart, loopEnd, onLoopUpdate]
    ),
    { enabled }
  );
};

export default useAudioAnimationFrame;
