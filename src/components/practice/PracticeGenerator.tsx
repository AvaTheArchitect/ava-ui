// src/modules/practice/PracticeGenerator.tsx
import React, { useEffect, useState, useCallback } from "react";
import PlayerTransport from "@/modules/practice/PlayerTransport";
import { generateChordTimeline, ChordEvent } from "@/modules/practice/ChordProgressionEngine";
import VisualPracticeHUD from "@/components/practice/VisualPracticeHUD";
import ToolPanel from "@/components/tools/ToolPanel";
import TunerDial from "@/components/tuner/TunerDial";

// ✅ TypeScript interfaces
interface PracticeGeneratorProps {
  initialChords?: string[];
  initialBpm?: number;
  autoStart?: boolean;
}

type ActiveTool = "none" | "tuner" | "metronome" | "settings";

const defaultChords = ["Em", "C", "D", "G"];
const defaultBpm = 100;

export default function PracticeGenerator({
  initialChords = defaultChords,
  initialBpm = defaultBpm,
  autoStart = true
}: PracticeGeneratorProps) {
  // ✅ State management
  const [currentChord, setCurrentChord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [chords, setChords] = useState(initialChords);
  const [activeTool, setActiveTool] = useState<ActiveTool>("none"); // ✅ Added missing state
  const [transport, setTransport] = useState<PlayerTransport | null>(null);
  const [timeline, setTimeline] = useState<ChordEvent[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);

  // ✅ Generate chord timeline when chords or BPM change
  useEffect(() => {
    const newTimeline = generateChordTimeline(chords, bpm);
    setTimeline(newTimeline);
  }, [chords, bpm]);

  // ✅ Transport management
  const handleTick = useCallback((timestamp: number) => {
    if (timeline.length === 0) return;

    // Find current chord based on timestamp
    const elapsedTime = timestamp - (transport?.getState().startTime || 0);
    const currentEvent = timeline.find(event =>
      elapsedTime >= event.startTime && elapsedTime < event.endTime
    );

    if (currentEvent) {
      setCurrentChord(currentEvent.chord);
      const newIndex = timeline.indexOf(currentEvent);
      if (newIndex !== currentChordIndex) {
        setCurrentChordIndex(newIndex);
      }
    }
  }, [timeline, transport, currentChordIndex]);

  // ✅ Initialize transport
  useEffect(() => {
    const newTransport = new PlayerTransport(handleTick);
    newTransport.setBPM(bpm);
    setTransport(newTransport);

    if (autoStart) {
      newTransport.start();
      setIsPlaying(true);
    }

    return () => {
      newTransport.stop();
    };
  }, [handleTick, bpm, autoStart]);

  // ✅ Transport controls
  const startPractice = useCallback(() => {
    if (transport && !isPlaying) {
      transport.start();
      setIsPlaying(true);
    }
  }, [transport, isPlaying]);

  const stopPractice = useCallback(() => {
    if (transport && isPlaying) {
      transport.stop();
      setIsPlaying(false);
      setCurrentChord(null);
      setCurrentChordIndex(0);
    }
  }, [transport, isPlaying]);

  const pausePractice = useCallback(() => {
    if (transport && isPlaying) {
      transport.pause();
      setIsPlaying(false);
    }
  }, [transport, isPlaying]);

  const resumePractice = useCallback(() => {
    if (transport && !isPlaying) {
      transport.resume();
      setIsPlaying(true);
    }
  }, [transport, isPlaying]);

  // ✅ Settings management
  const handleBpmChange = useCallback((newBpm: number) => {
    setBpm(newBpm);
    if (transport) {
      transport.setBPM(newBpm);
    }
  }, [transport]);

  const handleChordsChange = useCallback((newChords: string[]) => {
    setChords(newChords);
    setCurrentChordIndex(0);
  }, []);

  return (
    <div className="practice-generator-container">
      {/* ✅ Main Practice Interface */}
      <VisualPracticeHUD
        bpm={bpm}
        currentChord={currentChord}
        chords={chords}
        currentIndex={currentChordIndex}
        isPlaying={isPlaying}
        onStart={startPractice}
        onStop={stopPractice}
        onPause={pausePractice}
        onResume={resumePractice}
        onBpmChange={handleBpmChange}
        onChordsChange={handleChordsChange}
      />

      {/* ✅ Tool Panels */}
      {activeTool === "tuner" && (
        <ToolPanel title="Tuner">
          <TunerDial onClose={() => setActiveTool("none")} />
        </ToolPanel>
      )}

      {activeTool === "metronome" && (
        <ToolPanel title="Metronome">
          <div className="metronome-controls">
            <h3>BPM: {bpm}</h3>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
            />
          </div>
        </ToolPanel>
      )}

      {activeTool === "settings" && (
        <ToolPanel title="Practice Settings">
          <div className="practice-settings">
            <h3>Chord Progression</h3>
            <div className="chord-inputs">
              {chords.map((chord, index) => (
                <input
                  key={index}
                  type="text"
                  value={chord}
                  onChange={(e) => {
                    const newChords = [...chords];
                    newChords[index] = e.target.value;
                    handleChordsChange(newChords);
                  }}
                  className="chord-input"
                />
              ))}
            </div>
          </div>
        </ToolPanel>
      )}

      {/* ✅ Tool Selector */}
      <div className="tool-selector">
        <button onClick={() => setActiveTool("tuner")}>Tuner</button>
        <button onClick={() => setActiveTool("metronome")}>Metronome</button>
        <button onClick={() => setActiveTool("settings")}>Settings</button>
        <button onClick={() => setActiveTool("none")}>Close Tools</button>
      </div>
    </div>
  );
}

// ✅ Export types for other components
export type { ActiveTool, PracticeGeneratorProps };