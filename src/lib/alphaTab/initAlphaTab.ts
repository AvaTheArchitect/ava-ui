// AlphaTab initialization utility - V60.5 INITIAL CURSOR ANCHOR FIX
// Critical: Set scrollOffset during initialization to prevent default cursor behavior

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  isMobile?: boolean;
  initialScrollOffset?: number; // V60.5: Initial scroll offset for consistent startup
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
    isMobile = false,
    initialScrollOffset = 0, // V60.5: Default to 0 if not provided
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

  // ✅ V60.5: KEEP scale/stretchForce to prevent responsive mode triggering
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;

  // ✅ V60.5: Layout mode based on device type AND initial orientation
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 V60.5: Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ V60.5: Desktop layout = Page (forced)");
  }

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
    settings.player.scrollElement = container;

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

    // ✅ V60.5: Always use Continuous scroll mode
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // ✅ V60.5: Set initial scrollElement based on layout mode
    // Page layout (portrait/desktop): window scrolls
    // Horizontal layout (landscape): container scrolls
    if (layoutMode === "page") {
      settings.player.scrollElement = window;
      console.log("✅ V60.5: Initial scrollElement = window (Page layout)");
    } else {
      settings.player.scrollElement = container;
      console.log(
        "✅ V60.5: Initial scrollElement = container (Horizontal layout)"
      );
    }

    // ✅ V60.5: CRITICAL - Set initial scrollOffset to prevent default cursor behavior
    // This ensures cursor anchoring works from the very start
    if (initialScrollOffset > 0) {
      (settings.player as any).scrollOffset = initialScrollOffset;
      console.log(
        `✅ V60.5: Initial scrollOffset = ${initialScrollOffset}px (cursor anchored from start)`
      );
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("✅ V60.5: Scroll mode = Continuous");
    console.log(
      "✅ V60.5: Initial settings configured (will update on orientation changes)"
    );
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;

    console.log("🚫 PLAYER DISABLED");
  }

  console.log("✅ AlphaTab settings configured:", {
    playerMode: settings.player.playerMode,
    scrollMode: settings.player.scrollMode,
    layoutMode: settings.display.layoutMode,
    scale: settings.display.scale,
    stretchForce: settings.display.stretchForce,
    outputMode:
      playerMode === "synthesizer" ? settings.player.outputMode : "N/A",
    enableCursor: settings.player.enableCursor,
    isMobile,
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
