// AlphaTab initialization utility - V55 STATIC CURSOR FIX
// Key change: scrollOffsetX configured for Songsterr-style fixed cursor

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  cursorPosition?: number; // NEW: Cursor position as percentage (0-1), default 0.15 (15%)
}

export async function initAlphaTab(
  config: AlphaTabConfig
): Promise<AlphaTabApi> {
  const {
    container,
    playerMode = "disabled",
    enableCursor = false,
    layoutMode = "page",
    soundFontPath = "/soundfont/sonivox.sf2",
    cursorPosition = 0.15, // Default: cursor at 15% from left (Songsterr style)
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  // Core settings
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // Disable rendering workers

  console.log("🔧 Core workers disabled for Next.js compatibility");

  // Display settings
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;
  settings.display.layoutMode =
    layoutMode === "page"
      ? alphaTab.LayoutMode.Page
      : alphaTab.LayoutMode.Horizontal;
  settings.display.staveProfile = alphaTab.StaveProfile.TabMixed;

  // Notation settings
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  // Player settings
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    settings.player.enableUserInteraction = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // ⚡ CRITICAL FIX FOR NEXT.JS:
    // 1. Use ScriptProcessor for playback (no AudioWorklets)
    settings.player.outputMode =
      alphaTab.PlayerOutputMode.WebAudioScriptProcessor;

    // 2. Enable workers for synthesis to actually make it work
    // Even though we disabled rendering workers, we NEED synthesis workers
    settings.core.useWorkers = true;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔧 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: ENABLED");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;
    settings.player.enableUserInteraction = true;

    // ✅ V55: CRITICAL FIX - Set scroll mode to Continuous
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // ✅ V55: SONGSTERR-STYLE STATIC CURSOR
    // Calculate scrollOffsetX to keep cursor at fixed position
    const containerWidth = container.clientWidth;
    const cursorPixelPosition = containerWidth * cursorPosition;

    // Set NEGATIVE scrollOffsetX to keep cursor stationary
    // This makes AlphaTab scroll content LEFT, cursor appears fixed on screen
    settings.player.scrollOffsetX = -cursorPixelPosition;

    // Keep scrollElement as container
    settings.player.scrollElement = container;

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("✅ V55: Scroll mode = Continuous");
    console.log(
      `✅ V55: Static cursor at ${(cursorPosition * 100).toFixed(
        0
      )}% (${cursorPixelPosition.toFixed(0)}px)`
    );
    console.log(`✅ V55: scrollOffsetX = ${settings.player.scrollOffsetX}px`);
    console.log("✅ V55: Scroll element = container");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;

    console.log("🚫 PLAYER DISABLED");
  }

  console.log("✅ AlphaTab settings configured:", {
    playerMode: settings.player.playerMode,
    scrollMode: settings.player.scrollMode,
    outputMode:
      playerMode === "synthesizer" ? settings.player.outputMode : "N/A",
    enableCursor: settings.player.enableCursor,
    soundFont: playerMode === "synthesizer" ? soundFontPath : "N/A",
    scrollOffsetX:
      playerMode === "external" ? settings.player.scrollOffsetX : "N/A",
  });

  return new alphaTab.AlphaTabApi(container, settings);
}

export async function loadGuitarProFile(
  api: AlphaTabApi,
  fileUrl: string
): Promise<void> {
  console.log(`📂 Loading Guitar Pro file: ${fileUrl}`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: Failed to load file from ${fileUrl}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  console.log(`✅ File loaded - Size: ${uint8Array.byteLength} bytes`);
  api.load(uint8Array);
}
