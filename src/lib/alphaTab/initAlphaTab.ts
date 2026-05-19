/**
 * AlphaTab Initialization Utility — V101.2-AB
 * Date: May 1st, 2026
 * Base: V101.2 exact clone + minimal additions to compile with current renderer.
 *
 * PURPOSE: A/B baseline against V104. Uses V101.2's "let AlphaTab do its thing"
 * philosophy — no barsPerRow, no minBarWidth, no grid lock.
 *
 * MINIMAL ADDITIONS over V101.2 (required for renderer compatibility):
 * ✅ LayoutProfileName type + LayoutProfileSettings interface (renderer imports these)
 * ✅ Stub LAYOUT_PROFILES map (single "compactPage" entry — renderer uses it at init)
 * ✅ resolveProfileByWidth() — returns "compactPage" always (no grid forcing)
 * ✅ resolveTrackLayoutProfile() — stub, returns "compactPage"
 * ✅ resolveLayoutProfile() — stub, returns "compactPage"
 * ✅ isNativeLayoutEnabled() — stub returns false (not needed in this baseline)
 * ✅ VOCAL_TRACK_RE — exported (renderer may reference it)
 * ✅ applyAlphaTabLayoutProfile/Settings() — no-ops with logging
 *
 * 🔒 V101.2 EMPIRICAL LOCK: scrollOffsetX / scrollOffsetY must remain SEPARATE.
 */

import type { AlphaTabApi } from "./types";

// ── Minimal type stubs (renderer compatibility) ───────────────────────────────

export type LayoutProfileName =
  | "compactPage"
  | "songBookPage"
  | "songBookPageDense"
  | "songBookPageDenseMedium"
  | "songBookPageDenseNarrow"
  | "songBookPageSparse"
  | "songBookPageMobile"
  | "songBookHorizontal"
  | "songBookPageNativeTest"
  | "songBookPageNativeCap5"
  | "songBookPageNativeCap4"
  | "songBookPageNativeCap3";

export interface LayoutProfileSettings {
  notation: { notationMode: string };
  display: {
    layoutMode: string;
    systemsLayoutMode: string;
    stretchForce: number;
    notationStaffPaddingTop: number;
    firstNotationStaffPaddingTop: number;
    effectStaffPaddingTop: number;
    minBarWidth?: number;
    barsPerRow?: number;
    justifyLastSystem?: boolean;
    scale?: number;
  };
}

const PROFILE_COMPACT_PAGE: LayoutProfileSettings = {
  notation: { notationMode: "GuitarPro" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "UseModelLayout",
    stretchForce: 1.2, // 🔒 locked May 1, 2026 — probe-confirmed good spacing
    notationStaffPaddingTop: 0,
    firstNotationStaffPaddingTop: 0,
    effectStaffPaddingTop: 0,
  },
};

export const LAYOUT_PROFILES: Record<LayoutProfileName, LayoutProfileSettings> =
  {
    compactPage: PROFILE_COMPACT_PAGE,
    songBookPage: PROFILE_COMPACT_PAGE,
    songBookPageDense: PROFILE_COMPACT_PAGE,
    songBookPageDenseMedium: PROFILE_COMPACT_PAGE,
    songBookPageDenseNarrow: PROFILE_COMPACT_PAGE,
    songBookPageSparse: PROFILE_COMPACT_PAGE,
    songBookPageMobile: PROFILE_COMPACT_PAGE,
    songBookHorizontal: PROFILE_COMPACT_PAGE,
    songBookPageNativeTest: PROFILE_COMPACT_PAGE,
    songBookPageNativeCap5: PROFILE_COMPACT_PAGE,
    songBookPageNativeCap4: PROFILE_COMPACT_PAGE,
    songBookPageNativeCap3: PROFILE_COMPACT_PAGE,
  };

// ── Stubs (renderer compatibility) ───────────────────────────────────────────

export function isNativeLayoutEnabled(): boolean {
  return false;
}

export const VOCAL_TRACK_RE =
  /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal)/i;

export function resolveProfileByWidth(
  _containerWidth: number,
  _baseTrackProfile: LayoutProfileName,
  _useHorizontal: boolean,
): LayoutProfileName {
  return "compactPage"; // V101.2-AB: no grid forcing — let AlphaTab decide
}

export function resolveTrackLayoutProfile(
  _trackName: string,
  _isMobile: boolean,
): LayoutProfileName {
  return "compactPage";
}

export function resolveLayoutProfile(
  _isMobile: boolean,
  _forceProfile?: LayoutProfileName,
): LayoutProfileName {
  return "compactPage";
}

export function applyAlphaTabLayoutProfileSettings(
  _api: AlphaTabApi,
  _alphaTab: any,
  profileName: LayoutProfileName,
): void {
  console.log(
    `📐 [V101.2-AB] applyAlphaTabLayoutProfileSettings → "${profileName}" (no-op)`,
  );
}

export function applyAlphaTabLayoutProfile(
  _api: AlphaTabApi,
  _alphaTab: any,
  profileName: LayoutProfileName,
): void {
  console.log(
    `🎼 [V101.2-AB] applyAlphaTabLayoutProfile → "${profileName}" (no-op)`,
  );
}

// ── AlphaTabConfig ────────────────────────────────────────────────────────────

export interface AlphaTabConfig {
  container: HTMLElement;
  playerMode?: "disabled" | "external" | "synthesizer";
  enableCursor?: boolean;
  layoutMode?: "page" | "horizontal";
  soundFontPath?: string;
  isMobile?: boolean;
  scrollContainer?: HTMLElement;
  enableLoopSelection?: boolean;
  scrollMode?: "off" | "continuous";
  displayOverrides?: Record<string, number>;
  layoutProfile?: LayoutProfileName;
}

// ── initAlphaTab — V101.2 exact ──────────────────────────────────────────────

export async function initAlphaTab(
  config: AlphaTabConfig,
): Promise<AlphaTabApi> {
  const {
    container,
    playerMode = "disabled",
    layoutMode = "page",
    soundFontPath = "/soundfont/sonivox.sf2",
    isMobile = false,
    scrollContainer,
    scrollMode = "continuous",
    displayOverrides,
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  // ── Core ────────────────────────────────────────────────────────────────────
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // 🔒 M1 + StrictMode blank-canvas
  settings.core.includeNoteBounds = true; // 🔒 MaestroCursor

  // ── Display — V101.2 baseline (no grid forcing) ──────────────────────────────
  settings.display.scale = 1.0;
  settings.display.stretchForce = PROFILE_COMPACT_PAGE.display.stretchForce; // wire from profile — change value there, not here
  settings.display.staveProfile = alphaTab.StaveProfile.Tab;
  settings.display.layoutMode =
    isMobile && layoutMode === "horizontal"
      ? alphaTab.LayoutMode.Horizontal
      : alphaTab.LayoutMode.Page;

  // No barsPerRow — let AlphaTab decide row breaks natively.
  // No minBarWidth — AlphaTab uses its own default.
  // No justifyLastSystem — AlphaTab default.

  if (displayOverrides) {
    for (const [key, value] of Object.entries(displayOverrides)) {
      if (key in (settings.display as any))
        (settings.display as any)[key] = value;
      else
        console.warn(
          `⚠️ initAlphaTab: displayOverride "${key}" not found — skipped`,
        );
    }
  }

  // ── Notation ────────────────────────────────────────────────────────────────
  const notationElements = (settings.notation as any).elements;
  if (notationElements instanceof Map) {
    notationElements.forEach((_: boolean, key: unknown) =>
      notationElements.set(key, false),
    );
  } else {
    console.warn(
      "⚠️ initAlphaTab: notation.elements is not a Map — header suppression skipped",
    );
  }

  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 20;
  settings.notation.notationMode = alphaTab.NotationMode.SongBook;

  // ── Player ──────────────────────────────────────────────────────────────────
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.scrollMode =
      scrollMode === "off"
        ? alphaTab.ScrollMode.Off
        : alphaTab.ScrollMode.Continuous;
    settings.player.enableUserInteraction = false;
    settings.player.enableCursor = true; // 🔒 Invisible Engine
    settings.player.enableAnimatedBeatCursor = true;
    (settings.display as any).cursorType = 0;
    _applyScrollConfig(settings, alphaTab, container, scrollContainer);
  } else if (playerMode === "external") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledExternalMedia;
    settings.player.scrollMode =
      scrollMode === "off"
        ? alphaTab.ScrollMode.Off
        : alphaTab.ScrollMode.Continuous;
    settings.player.enableUserInteraction = false;
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    (settings.display as any).cursorType = 0;
    _applyScrollConfig(settings, alphaTab, container, scrollContainer);
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
  }

  const api = new alphaTab.AlphaTabApi(container, settings);

  console.log("🎸 initAlphaTab V101.2-AB ✅", {
    stretchForce: settings.display.stretchForce,
    barsPerRow: (settings.display as any).barsPerRow ?? "unset (AlphaTab auto)",
    minBarWidth:
      (settings.display as any).minBarWidth ?? "unset (AlphaTab auto)",
    playerMode,
    scrollMode,
    isMobile,
    displayOverrides: displayOverrides ?? null,
  });

  return api;
}

// ── Scroll Config ─────────────────────────────────────────────────────────────
/**
 * 🔒 V101.2 EMPIRICAL LOCK: scrollOffsetX / scrollOffsetY must remain SEPARATE.
 */
function _applyScrollConfig(
  settings: any,
  alphaTab: any,
  container: HTMLElement,
  scrollContainer?: HTMLElement,
) {
  if (settings.display.layoutMode === alphaTab.LayoutMode.Page) {
    const el = scrollContainer ?? container;
    settings.player.scrollElement = el;
    (settings.player as any).scrollOffsetY = scrollContainer ? -200 : 100;
    (settings.player as any).scrollOffsetX = 0;
  } else {
    settings.player.scrollElement = container;
    (settings.player as any).scrollOffsetX = container.clientWidth * 0.25;
    (settings.player as any).scrollOffsetY = 0;
  }
}

// ── File Loader ───────────────────────────────────────────────────────────────

export async function loadGuitarProFile(
  api: AlphaTabApi,
  fileUrl: string,
): Promise<void> {
  const response = await fetch(fileUrl);
  if (!response.ok)
    throw new Error(`loadGuitarProFile: HTTP ${response.status} — ${fileUrl}`);
  api.load(new Uint8Array(await response.arrayBuffer()));
}
