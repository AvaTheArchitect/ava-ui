/**
 * AlphaTab Initialization Utility — V101.4-AB
 * Date: June 3rd, 2026
 * Base: V101.3-AB + lyric overlay basement spacing — LOCKED June 2026.
 *
 * V101.4 CHANGES:
 * ✅ Lyric overlay basement spacing system — Beta-ready, locked June 2026.
 *    Native EffectLyrics suppressed globally (EffectLyrics=false).
 *    Custom alphaTabLyricsOverlay.ts renders lyrics as HTML chips below staff.
 *    Conditional spacing applied per-track in AlphaTabRenderer.tsx scoreLoaded
 *    and track-change useEffect — NOT globally here.
 *    initAlphaTab defaults to hasLyrics=false (guitar-only baseline).
 *
 * LYRIC SPACING LOCK (June 2026) — apply in AlphaTabRenderer.tsx only:
 *   Lyric/vocal tracks:
 *     notationStaffPaddingTop:        7   ← section label clearance
 *     firstNotationStaffPaddingTop:   7
 *     notationStaffPaddingBottom:     20  ← lyric basement
 *     lastNotationStaffPaddingBottom: 20
 *     effectStaffPaddingBottom:       8
 *     effectBandPaddingBottom:        6
 *     systemPaddingBottom:            10
 *     lastSystemPaddingBottom:        10
 *
 *   Guitar-only/default tracks:
 *     notationStaffPaddingTop:        0
 *     firstNotationStaffPaddingTop:   0
 *     notationStaffPaddingBottom:     0
 *     lastNotationStaffPaddingBottom: 0
 *     effectStaffPaddingBottom:       0
 *     effectBandPaddingBottom:        2
 *     systemPaddingBottom:            10
 *     lastSystemPaddingBottom:        5
 *
 * REMAINING TICKETS (separate):
 *   - Optional AlphaTab bug report/PR: tie-destination lyric assignment
 *   - Loop/cursor snapping to rests or placeholder beats
 *   - Whole-rest visibility at responsive widths
 *
 * V119 notation fix:
 *   REMOVED blanket notationElements.forEach(set false).
 *   That block suppressed ALL notation elements including tuplet brackets
 *   like the "(3)" at M24, which AlphaTab renders via the notation layer.
 *   Labs does not do this suppression and "(3)" renders correctly there.
 *
 *   Repeated TAB clef hiding is now handled entirely by hideRepeatedTabClef()
 *   in universalLayoutPatches.ts (DOM-level patch post-render). That approach
 *   is safer because it operates on rendered SVG, not on AlphaTab's render
 *   settings, and it only hides specific g.at glyph groups — not all notation.
 *
 *   suppressNotationElements() in AlphaTabRenderer.tsx is also now a no-op
 *   target for removal. The renderStarted and applyThemePalette calls to it
 *   should be removed from the renderer as a follow-up cleanup.
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
  return "compactPage";
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
    `📐 [V101.4-AB] applyAlphaTabLayoutProfileSettings → "${profileName}" (no-op)`,
  );
}

export function applyAlphaTabLayoutProfile(
  _api: AlphaTabApi,
  _alphaTab: any,
  profileName: LayoutProfileName,
): void {
  console.log(
    `🎼 [V101.4-AB] applyAlphaTabLayoutProfile → "${profileName}" (no-op)`,
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
  hasLyrics?: boolean; // true = apply lyric basement spacing; false = guitar-only baseline
}

// ── initAlphaTab — V101.4-AB ──────────────────────────────────────────────────

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
    hasLyrics = false,
  } = config;

  const alphaTab = await import("@coderline/alphatab");
  const settings = new alphaTab.Settings();

  // ── GP8 first-row padding — gives effect text headroom above staff row 1 ───
  const GP8_FIRST_ROW_PADDING = 28;

  // ── Core ────────────────────────────────────────────────────────────────────
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // 🔒 M1 + StrictMode blank-canvas
  settings.core.includeNoteBounds = true; // 🔒 MaestroCursor

  // ── Display — V101.2 baseline (no grid forcing) ───────────────────────────
  settings.display.scale = 1.0;
  settings.display.stretchForce = PROFILE_COMPACT_PAGE.display.stretchForce;
  settings.display.staveProfile = alphaTab.StaveProfile.Tab;
  settings.display.layoutMode =
    isMobile && layoutMode === "horizontal"
      ? alphaTab.LayoutMode.Horizontal
      : alphaTab.LayoutMode.Page;

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

  if (!displayOverrides?.["firstSystemPaddingTop"]) {
    (settings.display as any).firstSystemPaddingTop = GP8_FIRST_ROW_PADDING;
  }

  // ── Notation ────────────────────────────────────────────────────────────────
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 20;

  // ── Suppress native lyrics — re-rendered by alphaTabLyricsOverlay.ts ────────
  // EffectLyrics=false collapses the above-staff lyric lane (probe-confirmed:
  // rows shrink from ~176px → ~139px). Lyric data still available on beat.lyrics[].
  const notationElements = (settings.notation as any).elements;
  if (notationElements instanceof Map) {
    notationElements.set((alphaTab as any).NotationElement.EffectLyrics, false);
    console.log("🎤 Native alphaTab lyrics disabled via EffectLyrics=false");
  } else {
    console.warn(
      "⚠️ initAlphaTab: notation.elements is not a Map — lyric suppression skipped",
    );
  }

  // ── Bottom padding — conditional by track lyric presence ────────────────────
  // Guitar-only tracks use minimal baseline spacing (V101.3-AB values).
  // Lyric/vocal tracks get extra basement room so the HTML lyric overlay
  // (alphaTabLyricsOverlay.ts) sits inside AlphaTab's SVG row bounds and
  // the loop highlight covers it correctly.
  //
  // Track-type detection: VOCAL_TRACK_RE heuristic on the layoutProfile name
  // passed by the caller. Falls back to guitar-only defaults.
  // Post-score-load conditional re-render is the long-term path; this is the
  // practical Beta approach.
  const isLyricTrack = hasLyrics;

  if (isLyricTrack) {
    // Lyric basement spacing — reduced from V101.4 test values toward Songsterr parity
    (settings.display as any).notationStaffPaddingBottom = 20;
    (settings.display as any).lastNotationStaffPaddingBottom = 20;
    (settings.display as any).effectStaffPaddingBottom = 8;
    (settings.display as any).effectBandPaddingBottom = 6;
    (settings.display as any).systemPaddingBottom = 12;
    (settings.display as any).lastSystemPaddingBottom = 12;
  } else {
    // Guitar-only baseline — V101.3-AB proven values, no lyric basement expansion
    (settings.display as any).notationStaffPaddingBottom = 0;
    (settings.display as any).lastNotationStaffPaddingBottom = 0;
    (settings.display as any).effectStaffPaddingBottom = 0;
    (settings.display as any).effectBandPaddingBottom = 2;
    (settings.display as any).systemPaddingBottom = 10;
    (settings.display as any).lastSystemPaddingBottom = 5;
  }

  // ── Player ──────────────────────────────────────────────────────────────────
  if (playerMode === "synthesizer") {
    settings.player.playerMode = alphaTab.PlayerMode.EnabledSynthesizer;
    settings.player.soundFont = soundFontPath;
    settings.player.scrollMode =
      scrollMode === "off"
        ? alphaTab.ScrollMode.Off
        : alphaTab.ScrollMode.Continuous;
    settings.player.enableUserInteraction = false;
    settings.player.enableCursor = true;
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

  console.log("🎸 initAlphaTab V101.4-AB ✅", {
    stretchForce: settings.display.stretchForce,
    barsPerRow: (settings.display as any).barsPerRow ?? "unset (AlphaTab auto)",
    minBarWidth:
      (settings.display as any).minBarWidth ?? "unset (AlphaTab auto)",
    notationStaffPaddingBottom: (settings.display as any)
      .notationStaffPaddingBottom,
    lastNotationStaffPaddingBottom: (settings.display as any)
      .lastNotationStaffPaddingBottom,
    effectStaffPaddingBottom: (settings.display as any)
      .effectStaffPaddingBottom,
    effectBandPaddingBottom: (settings.display as any).effectBandPaddingBottom,
    systemPaddingBottom: (settings.display as any).systemPaddingBottom,
    lastSystemPaddingBottom: (settings.display as any).lastSystemPaddingBottom,
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
