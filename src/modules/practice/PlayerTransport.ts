// src/modules/practice/PlayerTransport.ts

// 🎵 PLAYER TRANSPORT - Timing & Playback Control

// ✅ TypeScript interfaces
export interface TransportConfig {
  bpm: number;
  tickRate: number;
  autoStart: boolean;
}

export type TickCallback = (timestamp: number) => void;

export interface TransportState {
  isPlaying: boolean;
  bpm: number;
  currentTime: number;
  startTime: number | null;
}

class PlayerTransport {
  private onTick: TickCallback;
  private interval: NodeJS.Timeout | null;
  private bpm: number;
  private isPlaying: boolean;
  private startTime: number | null;

  constructor(onTick: TickCallback) {
    this.onTick = onTick;
    this.interval = null;
    this.bpm = 120;
    this.isPlaying = false;
    this.startTime = null;
  }

  start(tickRate: number = 100): void {
    if (this.interval) return;

    this.isPlaying = true;
    this.startTime = Date.now();

    this.interval = setInterval(() => {
      this.onTick(Date.now());
    }, tickRate);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isPlaying = false;
    this.startTime = null;
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  getBPM(): number {
    return this.bpm;
  }

  isRunning(): boolean {
    return this.isPlaying;
  }

  getElapsedTime(): number {
    return this.startTime ? Date.now() - this.startTime : 0;
  }

  getCurrentBeat(): number {
    const elapsedMs = this.getElapsedTime();
    const beatDurationMs = 60000 / this.bpm;
    return elapsedMs / beatDurationMs;
  }

  getCurrentBar(): number {
    return Math.floor(this.getCurrentBeat() / 4);
  }

  getState(): TransportState {
    return {
      isPlaying: this.isPlaying,
      bpm: this.bpm,
      currentTime: this.getElapsedTime(),
      startTime: this.startTime,
    };
  }

  // ✅ Advanced transport features
  pause(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isPlaying = false;
      // Keep startTime to resume from same position
    }
  }

  resume(tickRate: number = 100): void {
    if (!this.isPlaying && this.startTime) {
      this.isPlaying = true;
      this.interval = setInterval(() => {
        this.onTick(Date.now());
      }, tickRate);
    }
  }

  reset(): void {
    this.stop();
    this.startTime = null;
  }

  setTickCallback(callback: TickCallback): void {
    this.onTick = callback;
  }
}

export default PlayerTransport;

// ✅ Factory function for easier instantiation
export function createTransport(
  onTick: TickCallback,
  config?: Partial<TransportConfig>
): PlayerTransport {
  const transport = new PlayerTransport(onTick);

  if (config?.bpm) {
    transport.setBPM(config.bpm);
  }

  if (config?.autoStart) {
    transport.start(config.tickRate);
  }

  return transport;
}

// ✅ Helper utilities
export function createMetronomeTransport(
  onBeat: (beat: number, bar: number) => void,
  bpm: number = 120
): PlayerTransport {
  let lastBeat = -1;

  const transport = new PlayerTransport((timestamp) => {
    const currentBeat = Math.floor(transport.getCurrentBeat());
    const currentBar = Math.floor(currentBeat / 4);

    if (currentBeat !== lastBeat) {
      onBeat(currentBeat % 4, currentBar);
      lastBeat = currentBeat;
    }
  });

  transport.setBPM(bpm);
  return transport;
}
