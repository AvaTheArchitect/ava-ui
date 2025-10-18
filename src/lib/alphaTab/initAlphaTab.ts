// AlphaTab initialization utility - FIXED FOR NEXT.JS
// Key fix: Use ScriptProcessor instead of AudioWorklets to avoid worker issues
// SCROLL FIX: Added negative scrollOffsetY for better visibility (Songsterr-style)

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

  // MOBILE DETECTION
  const isMobile = window.innerWidth <= 768;
  console.log(
    `📱 Device type: ${isMobile ? "Mobile" : "Desktop"} (width: ${
      window.innerWidth
    }px)`
  );

  // Core settings
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // Disable rendering workers

  console.log("🔧 Core workers disabled for Next.js compatibility");

  // Display settings - ADJUSTED FOR MOBILE
  settings.display.scale = isMobile ? 0.75 : 1.0; // Smaller scale on mobile to fit more
  settings.display.stretchForce = isMobile ? 0.6 : 0.8; // Tighter spacing on mobile
  settings.display.layoutMode =
    layoutMode === "page"
      ? alphaTab.LayoutMode.Page
      : alphaTab.LayoutMode.Horizontal;
  settings.display.staveProfile = alphaTab.StaveProfile.TabMixed;

  // NEW: Set bars per row for page layout (Songsterr-style)
  if (
    layoutMode === "page" &&
    (settings.display as any).barsPerRow !== undefined
  ) {
    (settings.display as any).barsPerRow = isMobile ? 5 : -1; // 5 measures on mobile, auto on desktop
    console.log(
      `📏 Bars per row: ${isMobile ? "5 (mobile)" : "auto (desktop)"}`
    );
  }

  // NEW: Padding adjustments for mobile
  if ((settings.display as any).padding !== undefined) {
    (settings.display as any).padding = isMobile
      ? [10, 10, 10, 10] // Smaller padding on mobile
      : [40, 40, 40, 20]; // Default padding on desktop
  }

  // Notation settings - adjust for mobile
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = isMobile ? 10 : 15; // Smaller rhythm height on mobile
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  // NEW: Font size adjustments for mobile readability
  if (isMobile) {
    if ((settings.notation as any).fingeringFont !== undefined) {
      (settings.notation as any).fingeringFont = {
        family: "Georgia, serif",
        size: 10, // Smaller font on mobile
        style: "normal",
        weight: "normal",
      };
    }

    if ((settings.notation as any).tablatureFont !== undefined) {
      (settings.notation as any).tablatureFont = {
        family: "Arial, sans-serif",
        size: 9, // Smaller tab numbers on mobile
        style: "normal",
        weight: "normal",
      };
    }
  }

  // Player settings
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    settings.player.enableUserInteraction = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;

    // 🎯 SCROLL POSITION FIX - Songsterr-style positioning
    // Negative offset moves the playing bar DOWN on screen
    // This keeps one staff/row visible ABOVE the currently playing bar
    // Typical staff height is ~150-200px, so -180px keeps one row visible
    // On mobile, use less offset since screen is smaller
    settings.player.scrollOffsetY = isMobile ? -120 : -180;

    console.log(
      `📍 Scroll offset set to ${settings.player.scrollOffsetY}px (one row visible above)`
    );

    // ⚡ CRITICAL FIX FOR NEXT.JS:
    // 1. Use ScriptProcessor for playback (no AudioWorklets)
    settings.player.outputMode =
      alphaTab.PlayerOutputMode.WebAudioScriptProcessor;

    // 2. Enable workers for synthesis to actually make it work
    // Even though we disabled rendering workers, we NEED synthesis workers
    settings.core.useWorkers = false;

    console.log("🎹 SYNTHESIZER MODE enabled");
    console.log("🎼 SoundFont:", soundFontPath);
    console.log("🔧 Output: ScriptProcessor");
    console.log("⚡ Synthesis workers: DISABLED for stability");
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.enableCursor = enableCursor;
    settings.player.enableUserInteraction = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Off;

    console.log("🎵 EXTERNAL MEDIA MODE");
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;

    console.log("🚫 PLAYER DISABLED");
  }

  console.log("✅ AlphaTab settings configured:", {
    playerMode: settings.player.playerMode,
    outputMode:
      playerMode === "synthesizer" ? settings.player.outputMode : "N/A",
    enableCursor: settings.player.enableCursor,
    soundFont: playerMode === "synthesizer" ? soundFontPath : "N/A",
    scale: settings.display.scale,
    stretchForce: settings.display.stretchForce,
    isMobile: isMobile,
    scrollOffsetY:
      playerMode === "synthesizer" ? settings.player.scrollOffsetY : 0,
  });

  // Create API instance
  const api = new alphaTab.AlphaTabApi(container, settings);

  // Add resize listener to adjust on orientation change
  let resizeTimeout: NodeJS.Timeout;
  let currentIsMobile = isMobile;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newIsMobile = window.innerWidth <= 768;
      if (newIsMobile !== currentIsMobile) {
        console.log(
          `📱 Device orientation/size changed: ${
            newIsMobile ? "Mobile" : "Desktop"
          }`
        );
        currentIsMobile = newIsMobile;

        // Update settings on orientation/size change
        api.settings.display.scale = newIsMobile ? 0.75 : 1.0;
        api.settings.display.stretchForce = newIsMobile ? 0.6 : 0.8;

        // Update scroll offset for mobile vs desktop
        if (playerMode === "synthesizer") {
          api.settings.player.scrollOffsetY = newIsMobile ? -120 : -180;
        }

        // Update bars per row if the property exists
        if ((api.settings.display as any).barsPerRow !== undefined) {
          (api.settings.display as any).barsPerRow = newIsMobile ? 5 : -1;
        }

        // Update padding if the property exists
        if ((api.settings.display as any).padding !== undefined) {
          (api.settings.display as any).padding = newIsMobile
            ? [10, 10, 10, 10]
            : [40, 40, 40, 20];
        }

        // Update notation settings
        api.settings.notation.rhythmHeight = newIsMobile ? 10 : 15;

        // Apply the updated settings
        api.updateSettings();
        api.render();

        console.log(
          "✅ Settings updated for",
          newIsMobile ? "mobile" : "desktop",
          "view"
        );
      }
    }, 250);
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  // Cleanup function to remove listeners when needed
  (api as any).cleanup = () => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleResize);
  };

  return api;
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
