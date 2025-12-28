/**
 * AlphaTab Initialization Utility - V100.4
 * Date: December 23rd, 2025
 *
 * 🔧 V100.4: SIMPLIFIED - USE TAB-ONLY PROFILE
 * ✅ Uses StaveProfile.Tab for tab-only display
 * ✅ Time signatures appear automatically on tab staff
 * ✅ NO score manipulation needed - settings handle everything
 * ✅ All player mode configurations preserved
 *
 * CRITICAL: For AlphaTab 1.6.3, the correct way to show only tablature
 * is to use StaveProfile.Tab in settings, NOT to manipulate staves after loading.
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
  config: AlphaTabConfig
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
  settings.core.useWorkers = false;

  console.log("🔧 V100.4: Core workers disabled for Next.js compatibility");

  // ==================== DISPLAY SETTINGS ====================
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;

  // Layout mode based on device type
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 V100.4: Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ V100.4: Desktop layout = Page");
  }

  // 🎯 V100.4: CRITICAL - Use Tab profile for tab-only display
  // This is the CORRECT way for AlphaTab 1.6.3
  // Time signatures will automatically appear on the tab staff
  settings.display.staveProfile = alphaTab.StaveProfile.Tab;
  console.log("🎼 V100.4: Using Tab profile (tab-only, time sigs auto-show)");

  // ==================== NOTATION SETTINGS ====================
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  console.log("✅ V100.4: Rhythm mode configured for tab display");

  // ==================== PLAYER SETTINGS ====================
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    settings.player.enableUserInteraction = false;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Scroll element configuration based on layout
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.4: SYNTH scrollElement = custom container");
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.4: SYNTH scrollElement = document.documentElement");
      }
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V100.4: SYNTH scrollElement = container (Horizontal)");
    }

    settings.player.outputMode = alphaTab.PlayerOutputMode.WebAudioScriptProcessor;
    settings.core.useWorkers = true;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔊 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: ENABLED");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;
    settings.player.enableUserInteraction = false;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.4: EXTERNAL scrollElement = custom container");
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V100.4: EXTERNAL scrollElement = document.documentElement");
      }
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V100.4: EXTERNAL scrollElement = container");
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
    console.log("🚫 PLAYER DISABLED");
  }

  if (!enableLoopSelection) {
    console.log("🔒 V100.4: Native loop selection DISABLED (custom DOM handles)");
  }

  console.log("🎸 AlphaTab V100.4 initialized:", {
    engine: settings.core.engine,
    layoutMode: settings.display.layoutMode,
    staveProfile: "Tab (tab-only)",
    playerMode: settings.player.playerMode,
    timeSignatures: "Auto-visible on tab staff",
    isMobile,
  });

  // Create the API
  const api = new alphaTab.AlphaTabApi(container, settings);

  // Print environment info for debugging
  if (typeof window !== "undefined" && alphaTab.Environment) {
    console.log("╔═══════════════════════════════════════════════════════╗");
    console.log("║     AlphaTab Environment Info                          ║");
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
  fileUrl: string
): Promise<void> {
  console.log(`📂 V100.4: Loading Guitar Pro file: ${fileUrl}`);

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load ${fileUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  console.log(`✅ File loaded - Size: ${uint8Array.byteLength} bytes`);
  api.load(uint8Array);
}