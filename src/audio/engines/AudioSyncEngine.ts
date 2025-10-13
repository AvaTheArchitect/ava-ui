// 🎵 AudioSyncEngine - Audio-visual synchronization engine for real-time playback
// Clean TypeScript implementation for Maestro Music App

export interface AudioSyncEngineConfig {
  sampleRate: number;
  bufferSize: number;
  channels: number;
  enableEffects?: boolean;
  enableAnalysis?: boolean;
}

export interface AudioSyncEngineState {
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  tempo: number;
  isInitialized: boolean;
}

export interface AudioEffect {
  type: "reverb" | "delay" | "eq" | "compressor" | "distortion";
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface AnalyserData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
}

export type AudioSyncEngineEventType =
  | "initialized"
  | "started"
  | "stopped"
  | "paused"
  | "volumeChanged"
  | "tempoChanged"
  | "effectApplied"
  | "error"
  | "disposed";

export interface AudioSyncEngineEvent {
  type: AudioSyncEngineEventType;
  engine: AudioSyncEngine;
  data?: any;
}

export class AudioSyncEngine {
  private audioContext: AudioContext | null = null;
  private config: AudioSyncEngineConfig;
  private state: AudioSyncEngineState;
  private gainNode: GainNode | null = null;
  private effectsChain: AudioNode[] = [];
  private analyser: AnalyserNode | null = null;
  private eventListeners: Map<AudioSyncEngineEventType, Function[]> = new Map();

  constructor(config: Partial<AudioSyncEngineConfig> = {}) {
    this.config = {
      sampleRate: 44100,
      bufferSize: 4096,
      channels: 2,
      enableEffects: true,
      enableAnalysis: true,
      ...config,
    };

    this.state = {
      isPlaying: false,
      currentTime: 0,
      volume: 1.0,
      tempo: 120,
      isInitialized: false,
    };

    console.log(`🎵 AudioSyncEngine created with config:`, this.config);
  }

  async initialize(): Promise<void> {
    try {
      // Create AudioContext with specified sample rate
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: "interactive",
      });

      // Create core audio nodes
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(
        this.state.volume,
        this.audioContext.currentTime
      );

      // Setup effects chain if enabled
      if (this.config.enableEffects) {
        await this.setupEffectsChain();
      }

      // Setup analyser if enabled
      if (this.config.enableAnalysis) {
        this.setupAnalyser();
      }

      // Connect audio graph
      this.connectAudioGraph();

      this.state.isInitialized = true;
      this.emit("initialized", { engine: this });

      console.log(`✅ AudioSyncEngine initialized successfully`);
      console.log(`🎚️ Sample Rate: ${this.audioContext.sampleRate}Hz`);
      console.log(`🔊 Buffer Size: ${this.config.bufferSize} samples`);
      console.log(`📊 Channels: ${this.config.channels}`);
    } catch (error) {
      console.error(`❌ Failed to initialize AudioSyncEngine:`, error);
      this.emit("error", { error, engine: this });
      throw error;
    }
  }

  private async setupEffectsChain(): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Create reverb with impulse response
      const convolver = this.audioContext.createConvolver();
      const reverbBuffer = await this.createReverbImpulseResponse(2, 2, false);
      convolver.buffer = reverbBuffer;

      // Create delay
      const delay = this.audioContext.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.3, this.audioContext.currentTime);

      // Create EQ (3-band using BiquadFilters)
      const lowShelf = this.audioContext.createBiquadFilter();
      lowShelf.type = "lowshelf";
      lowShelf.frequency.setValueAtTime(320, this.audioContext.currentTime);
      lowShelf.gain.setValueAtTime(0, this.audioContext.currentTime);

      const peaking = this.audioContext.createBiquadFilter();
      peaking.type = "peaking";
      peaking.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      peaking.Q.setValueAtTime(1, this.audioContext.currentTime);
      peaking.gain.setValueAtTime(0, this.audioContext.currentTime);

      const highShelf = this.audioContext.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.setValueAtTime(3200, this.audioContext.currentTime);
      highShelf.gain.setValueAtTime(0, this.audioContext.currentTime);

      // Create compressor
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
      compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      this.effectsChain = [
        lowShelf,
        peaking,
        highShelf,
        compressor,
        delay,
        convolver,
      ];
      console.log(
        `🎛️ Effects chain created: ${this.effectsChain.length} effects`
      );
    } catch (error) {
      console.error(`❌ Failed to setup effects chain:`, error);
      this.effectsChain = [];
    }
  }

  private setupAnalyser(): void {
    if (!this.audioContext) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    console.log(`📊 Analyser setup complete`);
  }

  private connectAudioGraph(): void {
    if (!this.audioContext || !this.gainNode) return;

    let currentNode: AudioNode = this.gainNode;

    // Connect effects chain in series
    for (const effect of this.effectsChain) {
      currentNode.connect(effect);
      currentNode = effect;
    }

    // Connect analyser (if enabled) and destination
    if (this.analyser) {
      currentNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } else {
      currentNode.connect(this.audioContext.destination);
    }

    console.log(
      `🔗 Audio graph connected: ${this.effectsChain.length + 1} nodes`
    );
  }

  private async createReverbImpulseResponse(
    duration: number,
    decay: number,
    reverse: boolean
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const n = reverse ? length - i : i;
        channelData[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      }
    }

    return impulse;
  }

  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      await this.initialize();
    }

    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }

    this.state.isPlaying = true;
    this.emit("started", { engine: this });
    console.log(`▶️ AudioSyncEngine started`);
  }

  stop(): void {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.emit("stopped", { engine: this });
    console.log(`⏹️ AudioSyncEngine stopped`);
  }

  pause(): void {
    this.state.isPlaying = false;
    this.emit("paused", { engine: this });
    console.log(`⏸️ AudioSyncEngine paused`);
  }

  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(
        clampedVolume,
        this.audioContext.currentTime
      );
      this.state.volume = clampedVolume;
      this.emit("volumeChanged", { volume: clampedVolume, engine: this });
      console.log(`🔊 Volume set to: ${Math.round(clampedVolume * 100)}%`);
    }
  }

  setTempo(tempo: number): void {
    const clampedTempo = Math.max(60, Math.min(200, tempo));
    this.state.tempo = clampedTempo;
    this.emit("tempoChanged", { tempo: clampedTempo, engine: this });
    console.log(`🥁 Tempo set to: ${clampedTempo} BPM`);
  }

  applyEffect(effect: AudioEffect): void {
    if (!this.audioContext) {
      console.warn("Cannot apply effect: AudioContext not initialized");
      return;
    }

    console.log(`🎛️ Applying effect: ${effect.type}`, effect.parameters);

    // Find and configure the effect in the chain
    // This is a simplified implementation - in practice, you'd need more sophisticated effect management
    switch (effect.type) {
      case "eq":
        this.configureEQ(effect.parameters);
        break;
      case "compressor":
        this.configureCompressor(effect.parameters);
        break;
      case "delay":
        this.configureDelay(effect.parameters);
        break;
      case "reverb":
        this.configureReverb(effect.parameters);
        break;
      default:
        console.warn(`Unsupported effect type: ${effect.type}`);
    }

    this.emit("effectApplied", { effect, engine: this });
  }

  private configureEQ(params: Record<string, number>): void {
    const eqNodes = this.effectsChain.filter(
      (node) => node instanceof BiquadFilterNode
    ) as BiquadFilterNode[];

    eqNodes.forEach((node, index) => {
      if (params[`gain${index}`] !== undefined && this.audioContext) {
        node.gain.setValueAtTime(
          params[`gain${index}`],
          this.audioContext.currentTime
        );
      }
    });
  }

  private configureCompressor(params: Record<string, number>): void {
    const compressor = this.effectsChain.find(
      (node) => node instanceof DynamicsCompressorNode
    ) as DynamicsCompressorNode;

    if (compressor && this.audioContext) {
      if (params.threshold !== undefined) {
        compressor.threshold.setValueAtTime(
          params.threshold,
          this.audioContext.currentTime
        );
      }
      if (params.ratio !== undefined) {
        compressor.ratio.setValueAtTime(
          params.ratio,
          this.audioContext.currentTime
        );
      }
      if (params.attack !== undefined) {
        compressor.attack.setValueAtTime(
          params.attack,
          this.audioContext.currentTime
        );
      }
      if (params.release !== undefined) {
        compressor.release.setValueAtTime(
          params.release,
          this.audioContext.currentTime
        );
      }
    }
  }

  private configureDelay(params: Record<string, number>): void {
    const delay = this.effectsChain.find(
      (node) => node instanceof DelayNode
    ) as DelayNode;

    if (delay && this.audioContext && params.time !== undefined) {
      delay.delayTime.setValueAtTime(
        params.time,
        this.audioContext.currentTime
      );
    }
  }

  private configureReverb(params: Record<string, number>): void {
    // Reverb configuration would require regenerating the impulse response
    // This is a placeholder for more complex reverb parameter handling
    console.log("Reverb configuration:", params);
  }

  getAnalyserData(): AnalyserData | null {
    if (!this.analyser) {
      return null;
    }

    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    const timeData = new Uint8Array(this.analyser.frequencyBinCount);

    this.analyser.getByteFrequencyData(frequencyData);
    this.analyser.getByteTimeDomainData(timeData);

    return { frequencyData, timeData };
  }

  getState(): AudioSyncEngineState {
    return { ...this.state };
  }

  getCurrentTime(): number {
    return this.audioContext?.currentTime || 0;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  // Event system with proper typing
  on(
    event: AudioSyncEngineEventType,
    callback: (data: AudioSyncEngineEvent) => void
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(
    event: AudioSyncEngineEventType,
    callback: (data: AudioSyncEngineEvent) => void
  ): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: AudioSyncEngineEventType, data: any): void {
    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const eventData: AudioSyncEngineEvent = {
        type: event,
        engine: this,
        data,
      };
      callbacks.forEach((callback) => {
        try {
          callback(eventData);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  dispose(): void {
    // Clean up audio resources
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch((error) => {
        console.error("Error closing AudioContext:", error);
      });
    }

    this.audioContext = null;
    this.gainNode = null;
    this.analyser = null;
    this.effectsChain = [];
    this.eventListeners.clear();

    this.state.isInitialized = false;
    this.emit("disposed", { engine: this });
    console.log(`🗑️ AudioSyncEngine disposed`);
  }
}

export default AudioSyncEngine;
