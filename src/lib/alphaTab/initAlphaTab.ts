/**
 * AlphaTab Initialization Utility - V92
 * Date: November 19th, 2025
 *
 * 🆕 V92: Added enableLoopSelection flag for custom loop handle architecture
 * ✅ V70: Version number update (no code changes)
 * ✅ V69: Fixed loop highlight (enableUserInteraction defaults to false)
 * ✅ V68: Added title/artist display control
 * ✅ V67: Added scrollContainer parameter for CSS Grid layout
 *
 * 🎯 V92 LOOP ARCHITECTURE (Per Gemini's Roadmap):
 * - enableLoopSelection: false → Disables AlphaTab's native loop UI completely
 * - enableUserInteraction: false → Disables AlphaTab's built-in beat selection
 * - Custom DOM handles in loopHandles.ts control loop functionality
 * - No more "Mystery Loop" highlight on drag
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
  enableLoopSelection?: boolean; // 🆕 V92: NEW - Controls AlphaTab's native loop UI
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
    enableUserInteraction = false, // 🔒 V69: Default FALSE - prevents unwanted loop highlight
    scrollContainer,
    enableLoopSelection = false, // 🆕 V92: Default FALSE - custom handles only
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

  console.log("🔧 V92: Core workers disabled for Next.js compatibility");

  // ==================== DISPLAY SETTINGS ====================
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;

  // Layout mode based on device type
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 V92: Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ V92: Desktop layout = Page");
  }

  settings.display.staveProfile = alphaTab.StaveProfile.TabMixed;

  // ==================== NOTATION SETTINGS ====================
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  // ==================== PLAYER SETTINGS ====================
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;

    // 🔒 V92: LOCKED - Never allow AlphaTab's native user interaction
    settings.player.enableUserInteraction = false;

    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Scroll element configuration based on layout
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      // 🆕 V67: Use custom scroll container if provided
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log(
          "✅ V92: SYNTH: scrollElement = custom container (Grid layout)"
        );
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V92: SYNTH: scrollElement = document.documentElement");
      }
    } else {
      // Horizontal layout
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V92: SYNTH: scrollElement = container (Horizontal)");
    }

    // ⚡ CRITICAL FOR NEXT.JS:
    settings.player.outputMode =
      alphaTab.PlayerOutputMode.WebAudioScriptProcessor;
    settings.core.useWorkers = true;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔊 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: ENABLED");
    console.log("🔒 User Interaction: DISABLED (custom handles only)");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;

    // 🔒 V92: LOCKED - Never allow AlphaTab's native user interaction
    settings.player.enableUserInteraction = false;

    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // Scroll element configuration
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      if (scrollContainer) {
        (settings.player as any).scrollElement = scrollContainer;
        (settings.player as any).scrollOffsetY = -200;
        (settings.player as any).scrollOffsetX = 0;
        console.log("✅ V92: EXTERNAL: scrollElement = custom container");
      } else {
        (settings.player as any).scrollElement = document.documentElement;
        (settings.player as any).scrollOffsetY = 100;
        (settings.player as any).scrollOffsetX = 0;
        console.log(
          "✅ V92: EXTERNAL: scrollElement = document.documentElement"
        );
      }
    } else {
      (settings.player as any).scrollElement = container;
      (settings.player as any).scrollOffsetX = container.clientWidth * 0.15;
      (settings.player as any).scrollOffsetY = 0;
      console.log("✅ V92: EXTERNAL: scrollElement = container");
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("🔒 User Interaction: DISABLED (custom handles only)");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
    console.log("🚫 PLAYER DISABLED");
  }

  // 🆕 V92: CRITICAL - Disable AlphaTab's native loop selection UI
  // This prevents the "Mystery Loop" gray highlight on drag
  if (!enableLoopSelection) {
    // AlphaTab doesn't have a direct enableLoopSelection setting,
    // but disabling enableUserInteraction already prevents it.
    // This flag is for future extensibility and documentation.
    console.log(
      "🔒 V92: Native loop selection DISABLED (custom DOM handles only)"
    );
  }

  console.log("🎸 AlphaTab V92 initialized:", {
    engine: settings.core.engine,
    layoutMode: settings.display.layoutMode,
    playerMode: settings.player.playerMode,
    enableCursor: settings.player.enableCursor,
    enableUserInteraction: false, // Always false in V92
    enableLoopSelection: enableLoopSelection,
    scrollContainer: scrollContainer ? "custom" : "default",
    isMobile,
  });

  return new alphaTab.AlphaTabApi(container, settings);
}

/**
 * Loads a Guitar Pro file into AlphaTab
 */
export async function loadGuitarProFile(
  api: AlphaTabApi,
  fileUrl: string
): Promise<void> {
  console.log(`📂 V92: Loading Guitar Pro file: ${fileUrl}`);

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
