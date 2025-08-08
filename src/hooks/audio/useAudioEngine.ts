import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";

// ✅ TypeScript Interfaces
export interface AudioEngineConfig {
  sampleRate?: number;
  bufferSize?: number;
  latencyHint?: "interactive" | "balanced" | "playback";
}

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  context: AudioContext | null;
}

export interface PlayBufferOptions {
  id?: string;
  loop?: boolean;
  startTime?: number;
  duration?: number;
  gain?: number;
}

export interface AudioEngineProviderProps {
  children: React.ReactNode;
  config?: AudioEngineConfig;
}

// ✅ EXPLICIT RETURN TYPE for the hook
export interface AudioEngineReturn extends AudioEngineState {
  initializeAudioEngine: () => Promise<void>;
  loadAudioBuffer: (url: string) => Promise<AudioBuffer | null>;
  playBuffer: (
    buffer: AudioBuffer,
    options?: PlayBufferOptions
  ) => AudioBufferSourceNode | null;
  stopSource: (id: string) => void;
  setMasterVolume: (volume: number) => void;
  getCurrentTime: () => number;
  createGainNode: () => GainNode | null;
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
}

// ✅ CREATE CONTEXT with explicit type
const AudioEngineContext = createContext<AudioEngineReturn | null>(null);

// ✅ Custom Hook with explicit return type
export const useAudioEngine = (
  config: AudioEngineConfig = {}
): AudioEngineReturn => {
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    context: null,
  });

  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  const initializeAudioEngine = useCallback(async (): Promise<void> => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error("AudioContext not supported in this browser");
      }

      const context = new AudioContextClass({
        latencyHint: config.latencyHint || "interactive",
        sampleRate: config.sampleRate || 44100,
      }) as AudioContext;

      if (context.state === "suspended") {
        await context.resume();
      }

      const masterGain = context.createGain();
      masterGain.connect(context.destination);

      contextRef.current = context;
      masterGainRef.current = masterGain;

      setState((prev) => ({
        ...prev,
        isInitialized: true,
        context: context,
      }));
    } catch (error) {
      console.error("Failed to initialize audio engine:", error);
    }
  }, [config]);

  const loadAudioBuffer = useCallback(
    async (url: string): Promise<AudioBuffer | null> => {
      if (!contextRef.current) return null;

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await contextRef.current.decodeAudioData(
          arrayBuffer
        );
        return audioBuffer;
      } catch (error) {
        console.error("Failed to load audio buffer:", error);
        return null;
      }
    },
    []
  );

  const playBuffer = useCallback(
    (
      buffer: AudioBuffer,
      options: PlayBufferOptions = {}
    ): AudioBufferSourceNode | null => {
      if (!contextRef.current || !masterGainRef.current) return null;

      const source = contextRef.current.createBufferSource();
      const gainNode = contextRef.current.createGain();

      source.buffer = buffer;
      source.loop = options.loop || false;

      gainNode.gain.value = options.gain !== undefined ? options.gain : 1;

      source.connect(gainNode);
      gainNode.connect(masterGainRef.current);

      const startTime = options.startTime || 0;
      const duration = options.duration;

      source.start(contextRef.current.currentTime, startTime, duration);

      if (options.id) {
        sourcesRef.current.set(options.id, source);
      }

      return source;
    },
    []
  );

  const stopSource = useCallback((id: string): void => {
    const source = sourcesRef.current.get(id);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        console.warn("Source already stopped:", error);
      }
      sourcesRef.current.delete(id);
    }
  }, []);

  const setMasterVolume = useCallback((volume: number): void => {
    if (masterGainRef.current && contextRef.current) {
      masterGainRef.current.gain.setValueAtTime(
        volume,
        contextRef.current.currentTime
      );
      setState((prev) => ({ ...prev, volume }));
    }
  }, []);

  const getCurrentTime = useCallback((): number => {
    return contextRef.current?.currentTime || 0;
  }, []);

  // ✅ ADDED: createGainNode implementation
  const createGainNode = useCallback((): GainNode | null => {
    if (!contextRef.current) return null;
    return contextRef.current.createGain();
  }, []);

  useEffect(() => {
    return () => {
      // ✅ FIXED: Copy ref to variable to avoid stale closure
      const currentSources = sourcesRef.current;
      currentSources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // ✅ FIXED: Removed unused parameter 'e'
          // Source might already be stopped
        }
      });
      currentSources.clear();

      if (contextRef.current && contextRef.current.state !== "closed") {
        contextRef.current.close();
      }
    };
  }, []);

  // ✅ FIXED: Added missing createGainNode to return object
  return {
    ...state,
    initializeAudioEngine,
    loadAudioBuffer,
    playBuffer,
    stopSource,
    setMasterVolume,
    getCurrentTime,
    createGainNode,
    audioContext: contextRef.current,
    masterGain: masterGainRef.current,
  };
};

// ✅ Provider Component
export const AudioEngineProvider: React.FC<AudioEngineProviderProps> = ({
  children,
  config,
}) => {
  const audioEngine = useAudioEngine(config);

  useEffect(() => {
    const handleUserInteraction = (): void => {
      if (!audioEngine.isInitialized) {
        audioEngine.initializeAudioEngine();
      }
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [audioEngine]);

  return React.createElement(
    AudioEngineContext.Provider,
    { value: audioEngine },
    children
  );
};

// ✅ Context Hook
export const useAudioEngineContext = (): AudioEngineReturn => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error(
      "useAudioEngineContext must be used within AudioEngineProvider"
    );
  }
  return context;
};

export default useAudioEngine;
