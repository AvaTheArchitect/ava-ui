// AlphaTab initialization utility - FIXED FOR LANDSCAPE SCROLLING V53
// Key fix: Enable proper scrolling for external mode in both orientations

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
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

    // 🎯 V53 BEST PRACTICE: Set neutral defaults, let component handle specifics
    // The AlphaTabRenderer will dynamically adjust scrollMode and scrollAnchor
    // based on orientation (landscape vs portrait)
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
    settings.player.scrollElement = container;
    // Note: scrollAnchor is set in component (might not exist in all AlphaTab versions)

    console.log("🎵 EXTERNAL MEDIA MODE - Neutral scroll defaults set");
    console.log("   Component will handle orientation-specific behavior");
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
