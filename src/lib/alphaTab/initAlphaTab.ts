/**
 * AlphaTab Initialization Utility - STAGE 1 CLEAN
 *
 * @version Nov 11, 2025
 * @updated Added enableUserInteraction and enableLoopSelection parameters
 *
 * ✅ enableUserInteraction: Controls click-to-seek behavior
 * ✅ enableLoopSelection: Controls drag-to-loop highlight (desktop)
 * ✅ Scale/stretchForce preserved (creates single unified row in landscape)
 * ✅ Proper scroll element handling for both orientations
 *
 * Path: src/lib/alphaTab/initAlphaTab.ts
 */

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  isMobile?: boolean;
  // ✅ NEW: Control user interaction (click-to-seek)
  enableUserInteraction?: boolean;
  // ✅ NEW: Control loop selection specifically (drag-to-loop highlight)
  enableLoopSelection?: boolean;
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
    enableUserInteraction = true, // ✅ Default true - enables click-to-seek
    enableLoopSelection = false, // ✅ Default false - prevents desktop loop highlight
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

  // 🎯 CRITICAL: Scale + stretchForce create single unified row in landscape
  // Without these, horizontal mode wraps into multiple rows
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;
  console.log("🎸 Scale/stretchForce set for unified row display");

  // Layout mode based on device type AND initial orientation
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ Desktop layout = Page (forced)");
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

    // ✅ Use parameter values
    settings.player.enableUserInteraction = enableUserInteraction;
    (settings.player as any).enableLoopSelection = enableLoopSelection;

    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Initial scroll settings (will be updated by orientation handler)
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      (settings.player as any).scrollElement = document.body;
      (settings.player as any).scrollOffsetY = -200;
      (settings.player as any).scrollOffsetX = 0;
      console.log(
        "✅ SYNTH: scrollElement = document.body, scrollOffsetY = -200px"
      );
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ SYNTH: scrollElement = container, scrollOffsetX = 15%");
    }

    // CRITICAL FIX FOR NEXT.JS:
    settings.player.outputMode =
      alphaTab.PlayerOutputMode.WebAudioScriptProcessor;
    settings.core.useWorkers = true;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔊 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: ENABLED");
    console.log(
      `🖱️ User Interaction: ${enableUserInteraction ? "ENABLED" : "DISABLED"}`
    );
    console.log(
      `🔄 Loop Selection: ${enableLoopSelection ? "ENABLED" : "DISABLED"}`
    );
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;

    // ✅ Use parameter values
    settings.player.enableUserInteraction = enableUserInteraction;
    (settings.player as any).enableLoopSelection = enableLoopSelection;

    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Initial scroll settings (will be updated by orientation handler)
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      (settings.player as any).scrollElement = document.body;
      (settings.player as any).scrollOffsetY = -200;
      (settings.player as any).scrollOffsetX = 0;
      console.log(
        "✅ EXTERNAL: scrollElement = document.body, scrollOffsetY = -200px"
      );
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log(
        "✅ EXTERNAL: scrollElement = container, scrollOffsetX = 15%"
      );
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("✅ Scroll mode = Continuous (AlphaTab auto-scroll)");
    console.log(
      `🖱️ User Interaction: ${enableUserInteraction ? "ENABLED" : "DISABLED"}`
    );
    console.log(
      `🔄 Loop Selection: ${enableLoopSelection ? "ENABLED" : "DISABLED"}`
    );
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
    settings.player.enableUserInteraction = false;

    console.log("🚫 PLAYER DISABLED");
  }

  console.log("🎸 AlphaTab initialized with settings:", {
    engine: settings.core.engine,
    layoutMode: settings.display.layoutMode,
    playerMode: settings.player.playerMode,
    enableUserInteraction: settings.player.enableUserInteraction,
    scale: settings.display.scale,
    stretchForce: settings.display.stretchForce,
  });

  const api = new alphaTab.AlphaTabApi(container, settings);

  return api as AlphaTabApi;
}

export async function loadGuitarProFile(
  api: AlphaTabApi,
  fileUrl: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    fetch(fileUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        const uint8Array = new Uint8Array(arrayBuffer);
        api.load(uint8Array);
        resolve();
      })
      .catch((error) => {
        console.error("Failed to load Guitar Pro file:", error);
        reject(error);
      });
  });
}
