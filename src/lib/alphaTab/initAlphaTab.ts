/**
 * AlphaTab Initialization Utility — V102.4
 * Date: April 21st, 2026
 * Cloned from V102.3 — vocal track profile fix.
 *
 * V102.4 CHANGES:
 * ✅ [M5] resolveTrackLayoutProfile: vocals now route to songBookPageMobile
 *         instead of songBookPageSparse. Probe confirmed: vocal track was
 *         running barsPerRow:8 (sparse) — "1 bar/row" constraint never applied.
 *         songBookPageMobile enforces barsPerRow:1 + justifyLastSystem:true.
 *
 * 🔒 V102.3 PRESERVED EXACTLY:
 *   ✅ [M1] LayoutProfileName: songBookPageMobile
 *   ✅ [M2] PROFILE_SONGBOOK_PAGE_MOBILE: barsPerRow:1, scale:0.9, minBarWidth:180
 *   ✅ [M3] LAYOUT_PROFILES: songBookPageMobile registered
 *   ✅ [M4] resolveProfileByWidth: mobile tier + sparse exception
 *   ✅ All V101.2 empirical locks unchanged
 */

import type { AlphaTabApi } from "./types";

// ── Layout Profile Types ───────────────────────────────────────────────────────

export type LayoutProfileName =
  | "compactPage"
  | "songBookPage"
  | "songBookPageDense"
  | "songBookPageDenseNarrow"
  | "songBookPageSparse"
  | "songBookPageMobile"
  | "songBookHorizontal";

export interface LayoutProfileSettings {
  notation: {
    notationMode: string;
  };
  display: {
    layoutMode: string;
    systemsLayoutMode: string;
    stretchForce: number;
    notationStaffPaddingTop: number;
    firstNotationStaffPaddingTop: number;
    effectStaffPaddingTop: number;
    minBarWidth: number;
    barsPerRow?: number;
    justifyLastSystem?: boolean;
    scale?: number;
  };
}

// ── Profile Definitions ────────────────────────────────────────────────────────

export const PROFILE_COMPACT_PAGE: LayoutProfileSettings = {
  notation: { notationMode: "GuitarPro" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "UseModelLayout",
    stretchForce: 0.8,
    notationStaffPaddingTop: 0,
    firstNotationStaffPaddingTop: 0,
    effectStaffPaddingTop: 0,
    minBarWidth: 0,
  },
};

export const PROFILE_SONGBOOK_PAGE: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 5,
    stretchForce: 0.6,
    notationStaffPaddingTop: 30,
    firstNotationStaffPaddingTop: 35,
    effectStaffPaddingTop: 10,
    minBarWidth: 60,
    justifyLastSystem: false,
    scale: 0.85,
  },
};

export const PROFILE_SONGBOOK_PAGE_DENSE: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 5,
    stretchForce: 0.6,
    notationStaffPaddingTop: 30,
    firstNotationStaffPaddingTop: 35,
    effectStaffPaddingTop: 10,
    minBarWidth: 180,
    justifyLastSystem: true,
  },
};

export const PROFILE_SONGBOOK_PAGE_DENSE_NARROW: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 3,
    stretchForce: 0.6,
    notationStaffPaddingTop: 30,
    firstNotationStaffPaddingTop: 35,
    effectStaffPaddingTop: 10,
    minBarWidth: 180,
    justifyLastSystem: true,
  },
};

export const PROFILE_SONGBOOK_PAGE_SPARSE: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 8,
    stretchForce: 0.4,
    notationStaffPaddingTop: 20,
    firstNotationStaffPaddingTop: 25,
    effectStaffPaddingTop: 6,
    minBarWidth: 40,
    justifyLastSystem: false,
  },
};

export const PROFILE_SONGBOOK_PAGE_MOBILE: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 1,
    stretchForce: 0.6,
    notationStaffPaddingTop: 30,
    firstNotationStaffPaddingTop: 35,
    effectStaffPaddingTop: 10,
    minBarWidth: 180,
    justifyLastSystem: true,
    scale: 0.9,
  },
};

export const PROFILE_SONGBOOK_HORIZONTAL: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Horizontal",
    systemsLayoutMode: "Automatic",
    stretchForce: 0.2,
    notationStaffPaddingTop: 45,
    firstNotationStaffPaddingTop: 45,
    effectStaffPaddingTop: 15,
    minBarWidth: 280,
  },
};

export const LAYOUT_PROFILES: Record<LayoutProfileName, LayoutProfileSettings> =
  {
    compactPage: PROFILE_COMPACT_PAGE,
    songBookPage: PROFILE_SONGBOOK_PAGE,
    songBookPageDense: PROFILE_SONGBOOK_PAGE_DENSE,
    songBookPageDenseNarrow: PROFILE_SONGBOOK_PAGE_DENSE_NARROW,
    songBookPageSparse: PROFILE_SONGBOOK_PAGE_SPARSE,
    songBookPageMobile: PROFILE_SONGBOOK_PAGE_MOBILE,
    songBookHorizontal: PROFILE_SONGBOOK_HORIZONTAL,
  };

// ── Track Profile Resolver ─────────────────────────────────────────────────────

// [M5] Vocals no longer match SPARSE_TRACK_RE — they are handled explicitly below.
// songBookPageSparse (barsPerRow:8) was the wrong profile for vocals; they need
// the same "1 bar/row" density as instrument tracks on mobile.
const SPARSE_TRACK_RE = /voc|voice|singer|lead\s*vocal|backing\s*vocal|lyric/i;

// [M5] Vocal detector — matches the same track names that used to trigger sparse.
// Kept as a named constant so resolveTrackLayoutProfile and resolveProfileByWidth
// both use the same regex (single source of truth).
export const VOCAL_TRACK_RE =
  /(voc|vocal|voice|singer|lyric|lyrics|vox|choir|backing\s*vocal)/i;

/**
 * resolveProfileByWidth()
 *
 * Width-tier resolver for ResizeObserver + init seeding.
 * Tiers (top-to-bottom):
 *   useHorizontal  → songBookHorizontal
 *   < 520px        → songBookPageMobile  (vocals included — barsPerRow:1)
 *   sparse (non-vocal) → songBookPageSparse
 *   < 900px        → songBookPageDenseNarrow
 *   ≥ 900px        → songBookPageDense
 */
export function resolveProfileByWidth(
  containerWidth: number,
  baseTrackProfile: LayoutProfileName,
  useHorizontal: boolean,
): LayoutProfileName {
  if (useHorizontal) return "songBookHorizontal";
  if (containerWidth < 520) return "songBookPageMobile"; // vocals + instruments both use mobile density
  if (baseTrackProfile === "songBookPageSparse") return "songBookPageSparse";
  if (containerWidth < 900) return "songBookPageDenseNarrow";
  return "songBookPageDense";
}

/**
 * resolveTrackLayoutProfile()
 *
 * [M5] Vocals now return songBookPageMobile (barsPerRow:1) instead of
 * songBookPageSparse (barsPerRow:8). Probe confirmed: vocal track was running
 * barsPerRow:8 — "1 bar/row" constraint was never being applied.
 *
 * songBookPageSparse is now reserved for non-vocal rest-heavy tracks only
 * (e.g. instrument tracks with many whole-rest bars).
 */
export function resolveTrackLayoutProfile(
  trackName: string,
  isMobile: boolean,
): LayoutProfileName {
  if (isMobile) return "songBookHorizontal";
  // [M5] Vocals → mobile density (1 bar/row). Never sparse.
  if (VOCAL_TRACK_RE.test(trackName ?? "")) return "songBookPageMobile";
  // Non-vocal sparse tracks (rest-heavy instruments) still use sparse.
  return SPARSE_TRACK_RE.test(trackName)
    ? "songBookPageSparse"
    : "songBookPageDense";
}

/**
 * resolveLayoutProfile()
 * Viewport-only resolver (no track context). Used at init and on resize.
 */
export function resolveLayoutProfile(
  isMobile: boolean,
  forceProfile?: LayoutProfileName,
): LayoutProfileName {
  if (forceProfile) return forceProfile;
  return isMobile ? "songBookHorizontal" : "songBookPageDense";
}

// ── Profile Switchers ─────────────────────────────────────────────────────────

function _mutateApiSettings(
  api: AlphaTabApi,
  alphaTab: any,
  p: LayoutProfileSettings,
): void {
  const d = (api as any).settings.display;
  const n = (api as any).settings.notation;

  n.notationMode =
    p.notation.notationMode === "SongBook"
      ? alphaTab.NotationMode.SongBook
      : alphaTab.NotationMode.GuitarPro;

  d.layoutMode =
    p.display.layoutMode === "Horizontal"
      ? alphaTab.LayoutMode.Horizontal
      : alphaTab.LayoutMode.Page;

  if (alphaTab.SystemsLayoutMode) {
    d.systemsLayoutMode =
      p.display.systemsLayoutMode === "Automatic"
        ? alphaTab.SystemsLayoutMode.Automatic
        : alphaTab.SystemsLayoutMode.UseModelLayout;
  }

  d.stretchForce = p.display.stretchForce;
  d.scale = p.display.scale ?? 1.0;
  d.notationStaffPaddingTop = p.display.notationStaffPaddingTop;
  d.firstNotationStaffPaddingTop = p.display.firstNotationStaffPaddingTop;
  d.effectStaffPaddingTop = p.display.effectStaffPaddingTop;
  d.minBarWidth = p.display.minBarWidth;
  d.justifyLastSystem = p.display.justifyLastSystem ?? false;

  if (p.display.barsPerRow !== undefined) {
    d.barsPerRow = p.display.barsPerRow;
  }
}

export function applyAlphaTabLayoutProfileSettings(
  api: AlphaTabApi,
  alphaTab: any,
  profileName: LayoutProfileName,
): void {
  const p = LAYOUT_PROFILES[profileName];
  _mutateApiSettings(api, alphaTab, p);
  (api as any).updateSettings();

  console.log(
    `📐 applyAlphaTabLayoutProfileSettings → "${profileName}" (no render)`,
    {
      notationMode: p.notation.notationMode,
      systemsLayoutMode: p.display.systemsLayoutMode,
      barsPerRow: p.display.barsPerRow ?? "auto",
      minBarWidth: p.display.minBarWidth,
      live_barsPerRow: (api as any).settings?.display?.barsPerRow,
      live_minBarWidth: (api as any).settings?.display?.minBarWidth,
    },
  );
}

export function applyAlphaTabLayoutProfile(
  api: AlphaTabApi,
  alphaTab: any,
  profileName: LayoutProfileName,
): void {
  const p = LAYOUT_PROFILES[profileName];
  _mutateApiSettings(api, alphaTab, p);
  (api as any).updateSettings();
  api.render();

  console.log(`🎼 applyAlphaTabLayoutProfile → "${profileName}"`, {
    notationMode: p.notation.notationMode,
    systemsLayoutMode: p.display.systemsLayoutMode,
    barsPerRow: p.display.barsPerRow ?? "auto",
    minBarWidth: p.display.minBarWidth,
  });
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

// ── initAlphaTab ──────────────────────────────────────────────────────────────

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
    layoutProfile = "compactPage",
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // 🔒 M1 + StrictMode blank-canvas
  settings.core.includeNoteBounds = true; // 🔒 MaestroCursor

  const profile = LAYOUT_PROFILES[layoutProfile];

  settings.display.scale = profile.display.scale ?? 1.0;
  settings.display.staveProfile = alphaTab.StaveProfile.Tab;
  settings.display.layoutMode =
    (isMobile && layoutMode === "horizontal") ||
    profile.display.layoutMode === "Horizontal"
      ? alphaTab.LayoutMode.Horizontal
      : alphaTab.LayoutMode.Page;

  settings.display.stretchForce = profile.display.stretchForce;

  if (alphaTab.SystemsLayoutMode) {
    (settings.display as any).systemsLayoutMode =
      profile.display.systemsLayoutMode === "Automatic"
        ? alphaTab.SystemsLayoutMode.Automatic
        : alphaTab.SystemsLayoutMode.UseModelLayout;
  }

  (settings.display as any).notationStaffPaddingTop =
    profile.display.notationStaffPaddingTop;
  (settings.display as any).firstNotationStaffPaddingTop =
    profile.display.firstNotationStaffPaddingTop;
  (settings.display as any).effectStaffPaddingTop =
    profile.display.effectStaffPaddingTop;
  (settings.display as any).minBarWidth = profile.display.minBarWidth;
  (settings.display as any).justifyLastSystem =
    profile.display.justifyLastSystem ?? false;

  if (profile.display.barsPerRow !== undefined) {
    (settings.display as any).barsPerRow = profile.display.barsPerRow;
  }

  if (displayOverrides) {
    for (const [key, value] of Object.entries(displayOverrides)) {
      if (key in (settings.display as any)) {
        (settings.display as any)[key] = value;
      } else {
        console.warn(
          `⚠️ initAlphaTab: displayOverride key "${key}" not found — skipped`,
        );
      }
    }
  }

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
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode =
    profile.notation.notationMode === "SongBook"
      ? alphaTab.NotationMode.SongBook
      : alphaTab.NotationMode.GuitarPro;

  if (playerMode === "synthesizer" || playerMode === "external") {
    settings.player.playerMode =
      playerMode === "synthesizer"
        ? alphaTab.PlayerMode.EnabledSynthesizer
        : alphaTab.PlayerMode.EnabledExternalMedia;

    if (playerMode === "synthesizer") settings.player.soundFont = soundFontPath;

    settings.player.scrollMode =
      scrollMode === "off"
        ? alphaTab.ScrollMode.Off
        : alphaTab.ScrollMode.Continuous;
    settings.player.enableUserInteraction = false;

    // 🔒 "Invisible Engine" — cursor ON, visual hidden
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    (settings.display as any).cursorType = 0;

    _applyScrollConfig(settings, alphaTab, container, scrollContainer);
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
  }

  console.log("[Layout bake check] V102.4 (before AlphaTabApi)", {
    layoutProfile,
    notationMode: profile.notation.notationMode,
    layoutMode: settings.display.layoutMode,
    systemsLayoutMode: (settings.display as any).systemsLayoutMode,
    barsPerRow: (settings.display as any).barsPerRow,
    minBarWidth: (settings.display as any).minBarWidth,
    stretchForce: settings.display.stretchForce,
    scale: settings.display.scale,
    notationStaffPaddingTop: (settings.display as any).notationStaffPaddingTop,
    firstNotationStaffPaddingTop: (settings.display as any)
      .firstNotationStaffPaddingTop,
    effectStaffPaddingTop: (settings.display as any).effectStaffPaddingTop,
    justifyLastSystem: (settings.display as any).justifyLastSystem,
  });

  const api = new alphaTab.AlphaTabApi(container, settings);
  console.log("[Layout API check] V102.4 (after AlphaTabApi)", {
    systemsLayoutMode: (api as any).settings?.display?.systemsLayoutMode,
    barsPerRow: (api as any).settings?.display?.barsPerRow,
    minBarWidth: (api as any).settings?.display?.minBarWidth,
    stretchForce: (api as any).settings?.display?.stretchForce,
    scale: (api as any).settings?.display?.scale,
    notationMode: (api as any).settings?.notation?.notationMode,
  });

  console.log("🎸 initAlphaTab V102.4", {
    layoutProfile,
    notationMode: profile.notation.notationMode,
    systemsLayoutMode: profile.display.systemsLayoutMode,
    barsPerRow: profile.display.barsPerRow ?? "auto",
    minBarWidth: profile.display.minBarWidth,
    justifyLastSystem: profile.display.justifyLastSystem ?? false,
    playerMode,
    scrollMode,
    isMobile,
    displayOverrides: displayOverrides ?? null,
  });

  return api;
}

/**
 * 🔒 V101.2 EMPIRICAL LOCK:
 * scrollOffsetX / scrollOffsetY must remain SEPARATE properties.
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
