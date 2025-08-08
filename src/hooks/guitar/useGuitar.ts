"use client";

import { useState, useEffect } from "react";

export interface GuitarState {
  isLoaded: boolean;
  isActive: boolean;
  isPlaying: boolean;
  currentChord: string;
  tuning: string[];
  volume: number;
  bpm: number;
  handleToggle: () => void;
  playChord: (chord: string) => void;
  setVolume: (volume: number) => void;
  setBpm: (bpm: number) => void;
  startPractice: () => void;
  stopPractice: () => void;
}

export const useGuitar = (): GuitarState => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChord, setCurrentChord] = useState("C");
  const [volume, setVolumeState] = useState(0.7);
  const [bpm, setBpmState] = useState(120);

  // Standard guitar tuning
  const [tuning] = useState(["E", "A", "D", "G", "B", "E"]);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  const playChord = (chord: string) => {
    setCurrentChord(chord);
    console.log(`Playing chord: ${chord}`);
    // TODO: Integrate with audio engine
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  const setBpm = (newBpm: number) => {
    setBpmState(Math.max(60, Math.min(200, newBpm)));
  };

  const startPractice = () => {
    setIsPlaying(true);
    setIsActive(true);
    console.log("Starting guitar practice session");
    // TODO: Start metronome, backing track, etc.
  };

  const stopPractice = () => {
    setIsPlaying(false);
    console.log("Stopping guitar practice session");
    // TODO: Stop all audio
  };

  return {
    isLoaded,
    isActive,
    isPlaying,
    currentChord,
    tuning,
    volume,
    bpm,
    handleToggle,
    playChord,
    setVolume,
    setBpm,
    startPractice,
    stopPractice,
  };
};
