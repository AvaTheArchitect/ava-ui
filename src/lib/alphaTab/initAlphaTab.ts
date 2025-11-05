// AlphaTab initialization utility - V57 CORRECT FIX
// Key: ScrollMode.Off for external mode - let V53 manual anchoring handle everything

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  cursorPosition?: number;
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
    cursorPosition = 0.15,
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  // Core settings
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false;

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
    settings.player.outputMode =
      alphaTab.PlayerOutputMode.WebAudioScriptProcessor;

    settings.core.useWorkers = true;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔧 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: ENABLED");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;
    settings.player.enableUserInteraction = true;

    // ✅ V57: CRITICAL - Use ScrollMode.Off for external mode
    // Let V53's manual cursor anchoring handle ALL scrolling
    settings.player.scrollMode = alphaTab.ScrollMode.Off;

    // ✅ V57: Optional - set scrollOffsetX for additional cursor positioning help
    // This works WITH V53's manual anchoring as a fallback
    if (layoutMode === "horizontal") {
      const containerWidth = container.clientWidth;
      const cursorPixelPosition = containerWidth * cursorPosition;
      settings.player.scrollOffsetX = -cursorPixelPosition;

      console.log("🎸 LANDSCAPE MODE");
      console.log(
        `✅ V57: Cursor target at ${(cursorPosition * 100).toFixed(0)}%`
      );
      console.log(
        `✅ V57: scrollOffsetX = ${settings.player.scrollOffsetX}px (backup positioning)`
      );
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("✅ V57: ScrollMode = Off (V53 manual anchoring in control)");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;

    console.log("🚫 PLAYER DISABLED");
  }

  console.log("✅ AlphaTab settings configured:", {
    playerMode: settings.player.playerMode,
    scrollMode: playerMode === "external" ? "Off" : settings.player.scrollMode,
    layoutMode: layoutMode,
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
