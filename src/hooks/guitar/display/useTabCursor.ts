"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// 🎸 Tab Cursor Hook Interface
interface UseTabCursorProps {
  bpm?: number;
  timeSignature?: [number, number];
  tabWidth?: number;
  enabled?: boolean;
  duration?: number; // ✅ Add real duration support
}

interface UseTabCursorReturn {
  cursorPosition: number;
  beatMarkers: BeatMarker[];
  isVisible: boolean;
  calculateCursorPosition: (currentTime: number) => number;
  calculateBeatTiming: () => BeatTiming;
  updatePosition: (currentTime: number) => void;
}

interface BeatMarker {
  position: number;
  beat: number;
  measure: number;
  time: number;
}

interface BeatTiming {
  beatsPerSecond: number;
  secondsPerBeat: number;
  beatsPerMeasure: number;
  secondsPerMeasure: number;
}

// 🎸 useTabCursor Hook - FIXED FOR REAL AUDIO DURATION
export const useTabCursor = ({
  bpm = 120,
  timeSignature = [4, 4],
  tabWidth = 0,
  enabled = true,
  duration = 240, // ✅ Default to 4 minutes instead of 10 seconds
}: UseTabCursorProps = {}): UseTabCursorReturn => {
  // 🎯 State
  const [cursorPosition, setCursorPosition] = useState(0);
  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // 🎯 Refs
  const lastUpdateTimeRef = useRef<number>(0);

  // 🎵 Calculate beat timing
  const calculateBeatTiming = useCallback((): BeatTiming => {
    const beatsPerSecond = bpm / 60;
    const secondsPerBeat = 60 / bpm;
    const beatsPerMeasure = timeSignature[0];

    return {
      beatsPerSecond,
      secondsPerBeat,
      beatsPerMeasure,
      secondsPerMeasure: secondsPerBeat * beatsPerMeasure,
    };
  }, [bpm, timeSignature]);

  // 🎯 Calculate cursor position from time - ✅ FIXED: Use real duration!
  const calculateCursorPosition = useCallback(
    (currentTime: number): number => {
      if (!enabled || tabWidth === 0 || duration === 0) return 0;

      // ✅ FIXED: Use real audio duration instead of 10-second demo loop
      const progressPercent = duration > 0 ? currentTime / duration : 0;
      const position = progressPercent * tabWidth;

      // Clamp to bounds
      return Math.max(0, Math.min(position, tabWidth));
    },
    [enabled, tabWidth, duration]
  );

  // 🎯 Generate beat markers - ✅ FIXED: Use real duration
  const generateBeatMarkers = useCallback((): BeatMarker[] => {
    if (tabWidth === 0 || duration === 0) return [];

    const timing = calculateBeatTiming();
    const markers: BeatMarker[] = [];

    // ✅ FIXED: Calculate total beats based on real duration
    const totalBeats = Math.ceil(duration / timing.secondsPerBeat);
    const totalMeasures = Math.ceil(totalBeats / timing.beatsPerMeasure);

    // Generate markers for measure starts (beat 1 of each measure)
    for (let measure = 0; measure < totalMeasures; measure++) {
      const beatIndex = measure * timing.beatsPerMeasure;
      const time = beatIndex * timing.secondsPerBeat;

      // Only add if within duration
      if (time <= duration) {
        const position = (time / duration) * tabWidth;

        markers.push({
          position,
          beat: 1, // Always measure start
          measure: measure + 1,
          time,
        });
      }
    }

    console.log(
      `🎵 Generated ${markers.length} beat markers for ${duration.toFixed(
        1
      )}s duration`
    );
    return markers;
  }, [tabWidth, duration, calculateBeatTiming]);

  // 🔄 Update cursor position
  const updatePosition = useCallback(
    (currentTime: number) => {
      if (!enabled) {
        setIsVisible(false);
        return;
      }

      const now = performance.now();
      if (now - lastUpdateTimeRef.current < 16) return; // 60fps throttle

      const newPosition = calculateCursorPosition(currentTime);
      setCursorPosition(newPosition);
      setIsVisible(true);

      lastUpdateTimeRef.current = now;

      // Debug logging
      console.log(
        `🎯 Cursor: ${currentTime.toFixed(1)}s → ${newPosition.toFixed(
          0
        )}px (${((newPosition / tabWidth) * 100).toFixed(1)}%)`
      );
    },
    [enabled, calculateCursorPosition, tabWidth]
  );

  // 🎯 Update beat markers when dependencies change
  useEffect(() => {
    if (tabWidth > 0 && duration > 0) {
      setBeatMarkers(generateBeatMarkers());
    }
  }, [tabWidth, duration, generateBeatMarkers]);

  return {
    cursorPosition,
    beatMarkers,
    isVisible,
    calculateCursorPosition,
    calculateBeatTiming,
    updatePosition,
  };
};

// 🎸 Default Export
export default useTabCursor;
