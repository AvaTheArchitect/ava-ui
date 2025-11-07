// AlphaTab initialization utility - V61.2 SCROLL ELEMENT FIX
// Fixed: scrollElement and scrollOffset are now set conditionally
// based on layoutMode (window for 'page', container for 'horizontal')

import type { AlphaTabApi } from "./types";

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  isMobile?: boolean;
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

  // ✅ V61: KEEP scale/stretchForce to prevent responsive mode triggering
  settings.display.scale = 1.0;
  settings.display.stretchForce = 0.8;

  // ✅ V61: Layout mode based on device type AND initial orientation
  if (isMobile) {
    settings.display.layoutMode =
      layoutMode === "page"
        ? alphaTab.LayoutMode.Page
        : alphaTab.LayoutMode.Horizontal;
    console.log(`📱 V61: Mobile layout = ${layoutMode}`);
  } else {
    settings.display.layoutMode = alphaTab.LayoutMode.Page;
    console.log("🖥️ V61: Desktop layout = Page (forced)");
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

    // ✅ V62: Set scrollElement and scrollOffsetY based on initial layout mode
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      settings.player.scrollElement = document.documentElement; // For page scroll
      settings.player.scrollOffsetY = 100; // Vertical offset
      console.log(
        "✅ V62: SYNTH: scrollElement = document.documentElement, scrollOffsetY = 100px"
      );
    } else {
      settings.player.scrollElement = container; // For container scroll
      settings.player.scrollOffsetX = container.clientWidth * 0.15; // Horizontal offset
      console.log(
        "✅ V62: SYNTH: scrollElement = container, scrollOffsetX = 15%"
      );
    }

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
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // ✅ V62: Set scrollElement and scrollOffsetY based on initial layout mode
    if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
      settings.player.scrollElement = document.documentElement; // For page scroll
      settings.player.scrollOffsetY = 100; // Vertical offset
      console.log(
        "✅ V62: EXTERNAL: scrollElement = document.documentElement, scrollOffsetY = 100px"
      );
    } else {
      settings.player.scrollElement = container; // For container scroll
      settings.player.scrollOffsetX = container.clientWidth * 0.15; // Horizontal offset
      console.log(
        "✅ V62: EXTERNAL: scrollElement = container, scrollOffsetX = 15%"
      );
    }

    console.log("🎵 EXTERNAL MEDIA MODE");
    console.log("✅ V62: Scroll mode = Continuous (AlphaTab auto-scroll)");
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
    scrollAnchor: (settings.player as any).scrollAnchor,
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
