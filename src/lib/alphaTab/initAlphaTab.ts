/**
 * AlphaTab Initialization Utility - V100.8
 * Date: March 13th, 2026
 *
 * 🔥 V100.8: WORKERS DISABLED — M1 + Supabase async + StrictMode stability fix
 * ✅ settings.core.useWorkers = false (prevents blank canvas race condition)
 * ✅ Log updated to reflect actual audio output path (ScriptProcessor)
 *
 * 🔒 V100.7 FEATURES (PRESERVED):
 * ✅ Cursor SYSTEM enabled (visual hidden via cursorType = 0)
 * ✅ enableCursor = true (keeps playedBeatChanged firing!)
 * ✅ enableAnimatedBeatCursor = true
 * ✅ includeNoteBounds for custom cursor
 * ✅ StaveProfile.Tab for tab-only display
 */

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  isMobile?: boolean;
  enableUserInteraction?: boolean;
  scrollContainer?: HTMLElement;
  enableLoopSelection?: boolean;
}

export async function initAlphaTab(
  config: AlphaTabConfig,
): Promise<AlphaTabApi> {
  const {
    container,
    playerMode = "disabled",
    enableCursor = false,
    layoutMode = "page",
    soundFontPath = "/soundfont/sonivox.sf2",
    isMobile = false,
    enableUserInteraction = false,
    scrollContainer,
    enableLoopSelection = false,
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  // ==================== CORE SETTINGS ====================
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;

  // 🔒 V100.8: Workers OFF — required for M1 + Supabase async + StrictMode timing
  settings.core.useWorkers = false;

  // 🎯 V100.5: CRITICAL - Enable note bounds for custom cursor!
  settings.core.includeNoteBounds = true;

  console.log("🔒 V100.8: AlphaTab workers DISABLED (M1 + StrictMode stable)");
  console.log("🎯 V100.8: includeNoteBounds ENABLED for custom cursor");

  // ==================== DISPLAY SETTINGS ====================
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;

  // Layout mode based on device type
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 V100.8: Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ V100.8: Desktop layout = Page");
  }

  settings.display.staveProfile = alphaTab.StaveProfile.Tab;
  console.log("🎼 V100.8: Using Tab profile (tab-only, time sigs auto-show)");

  // ==================== NOTATION SETTINGS ====================
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  console.log("✅ V100.8: Rhythm mode configured for tab display");

  // ==================== PLAYER SETTINGS ====================
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;

    // 🔥 V100.7: CRITICAL FIX - "Invisible Engine" pattern
    // Enable cursor SYSTEM (for playedBeatChanged events)
    // But hide the VISUAL (cursorType = 0)
    settings.player.enableCursor = true; // ← CHANGED FROM false
    settings.player.enableAnimatedBeatCursor = true; // ← CHANGED FROM false
    (settings.display as any).cursorType = 0; // ← ADDED - hides visual (0 = None)
    console.log(
      "✅ V100.8: Cursor SYSTEM enabled (visual hidden for MaestroCursor)",
    );

    settings.player.enableUserInteraction = false;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Scroll element configuration based on layout
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.8: SYNTH scrollElement = custom container");
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log(
          "✅ V100.8: SYNTH scrollElement = document.documentElement",
        );
      }
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V100.8: SYNTH scrollElement = container (Horizontal)");
    }

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log(
      "🔊 Output: Auto (AlphaTab selects best - likely AudioWorklet)",
    );
    console.log("⚡ Render workers: OFF | Audio output: ScriptProcessor");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;

    // 🔥 V100.7: CRITICAL FIX - "Invisible Engine" for external mode too
    settings.player.enableCursor = true; // ← CHANGED FROM false
    settings.player.enableAnimatedBeatCursor = true; // ← CHANGED FROM false
    (settings.display as any).cursorType = 0; // ← ADDED - hides visual (0 = None)
    console.log(
      "✅ V100.8: Cursor SYSTEM enabled (visual hidden for MaestroCursor)",
    );

    settings.player.enableUserInteraction = false;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.8: EXTERNAL scrollElement = custom container");
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log(
          "✅ V100.8: EXTERNAL scrollElement = document.documentElement",
        );
      }
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V100.8: EXTERNAL scrollElement = container");
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("⚡ Render workers: OFF | Audio output: ScriptProcessor");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
    console.log("🚫 PLAYER DISABLED");
  }

  if (!enableLoopSelection) {
    console.log(
      "🔒 V100.8: Native loop selection DISABLED (custom DOM handles)",
    );
  }

  console.log("🎸 AlphaTab V100.8 initialized:", {
    engine: settings.core.engine,
    layoutMode: settings.display.layoutMode,
    staveProfile: "Tab (tab-only)",
    playerMode: settings.player.playerMode,
    timeSignatures: "Auto-visible on tab staff",
    includeNoteBounds: true,
    cursorSystem: "ENABLED (visual hidden)",
    customCursor: "Maestro (Songsterr-style)",
    workersEnabled: false,
    isMobile,
  });

  // Create the API
  const api = new alphaTab.AlphaTabApi(container, settings);

  // Print environment info for debugging
  if (typeof window !== "undefined" && alphaTab.Environment) {
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║     AlphaTab Environment Info - V100.8                 ║");
    console.log("╚═══════════════════════════════════════════════════════╝");
    console.log(`User Agent: ${navigator.userAgent}`);
    console.log(`Screen: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`Device Pixel Ratio: ${window.devicePixelRatio}`);

    if (typeof alphaTab.Environment.printEnvironmentInfo === "function") {
      try {
        alphaTab.Environment.printEnvironmentInfo();
      } catch (e) {
        console.warn("printEnvironmentInfo() failed:", e);
      }
    }
  }

  return api;
}

/**
 * Loads a Guitar Pro file into AlphaTab
 */
export async function loadGuitarProFile(
  api: AlphaTabApi,
  fileUrl: string,
): Promise<void> {
  console.log(`📂 V100.8: Loading Guitar Pro file: ${fileUrl}`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load ${fileUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  console.log(`✅ File loaded - Size: ${uint8Array.byteLength} bytes`);
  api.load(uint8Array);
}
