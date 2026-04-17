/**
 * AlphaTab Initialization Utility — V102.3
 * Date: April 17th, 2026
 * Cloned from V102.2 — 4 mobile layout patches applied (Cipher spec).
 *
 * V102.3 CHANGES:
 * ✅ [M1] LayoutProfileName: added "songBookPageMobile"
 * ✅ [M2] PROFILE_SONGBOOK_PAGE_MOBILE: portrait phone — barsPerRow:2, scale:0.9, minBarWidth:180
 * ✅ [M3] LAYOUT_PROFILES: registered songBookPageMobile
 * ✅ [M4] resolveProfileByWidth: added < 520px mobile-page tier (instruments → mobile,
 *         vocals stay sparse); useHorizontal is now 3rd arg (was already added in V102.2 file
 *         but resolver lacked the mobile tier)
 *
 * 🔒 V102.2 PRESERVED EXACTLY (all other behavior unchanged):
 *   ✅ songBookPageDense + songBookPageSparse profiles
 *   ✅ resolveTrackLayoutProfile(trackName, isMobile)
 *   ✅ _mutateApiSettings() direct mutation pattern
 *   ✅ applyAlphaTabLayoutProfileSettings() — settings-only, no render
 *   ✅ justifyLastSystem in interface + all profiles + bake-in
 *   ✅ displayOverrides win over profile (applied after profile bake-in)
 *   ✅ resolveLayoutProfile() for viewport-only switching
 *
 * 🔒 V101.2 EMPIRICAL LOCKS:
 *   - settings.core.useWorkers = false (M1 + StrictMode blank-canvas)
 *   - settings.core.includeNoteBounds = true (MaestroCursor)
 *   - settings.player.enableUserInteraction = false
 *   - "Invisible Engine" cursor (system ON, cursorType = 0)
 *   - notation.elements Map suppression
 *   - scrollOffsetX / scrollOffsetY as SEPARATE properties (do not consolidate)
 */

import type { AlphaTabApi } from "./types";

// ── Layout Profile Types ───────────────────────────────────────────────────────

export type LayoutProfileName =
  | "compactPage" // GP layout, no reflow — pre-V102 behavior
  | "songBookPage" // Middle-ground fallback (kept for dev overrides)
  | "songBookPageDense" // Guitar/bass: full desktop (≥900px)
  | "songBookPageDenseNarrow" // Guitar/bass: narrow desktop 520–900px (devtools open)
  | "songBookPageSparse" // Vocals/rest-heavy: empty bars collapse naturally
  | "songBookPageMobile" // [M1] Portrait phone — 2 bars/row, scale 0.9
  | "songBookHorizontal"; // Mobile: SongBook reflow, horizontal strip

export interface LayoutProfileSettings {
  notation: {
    notationMode: string; // "GuitarPro" | "SongBook"
  };
  display: {
    layoutMode: string; // "Page" | "Horizontal"
    systemsLayoutMode: string; // "Automatic" | "UseModelLayout"
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

/** compactPage — pre-V102 behavior. GP mode, honors file metadata. */
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

/**
 * songBookPage — middle-ground fallback.
 * Used when track type is unknown. Kept for dev override / query-param testing.
 */
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

/**
 * songBookPageDense — Guitar/bass/drum tracks with technique text.
 *
 * minBarWidth: 180 — hard floor prevents "dive bomb" / "Half Time" / dense
 *   chord bars from collapsing to unreadable widths under Automatic layout.
 * barsPerRow: 5 — matches Songsterr desktop density for instrument tracks.
 * justifyLastSystem: true — last row stretches to match others (looks intentional).
 */
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

/**
 * songBookPageDenseNarrow — Guitar/bass on narrow desktop (520–900px).
 *
 * Triggered when devtools is docked or window is narrowed below ~900px.
 * barsPerRow: 3 — matches Songsterr "console open" reflow behavior.
 * Everything else identical to songBookPageDense.
 */
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

/**
 * songBookPageSparse — Vocals/rest-heavy tracks.
 *
 * minBarWidth: 40 — lets whole-rest bars collapse to natural width (~40–60px),
 *   matching Songsterr's "18 bars in one row" behavior for sparse vocal intros.
 * barsPerRow: 8 — allows many empty bars per row without forced wrapping.
 * justifyLastSystem: false — avoids comically wide last row for sparse content.
 * effectStaffPaddingTop: 6 — vocals rarely have dense technique staff; save space.
 */
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

/**
 * [M2] songBookPageMobile — Portrait phone page density.
 *
 * barsPerRow: 2 — iPhone portrait fits ~2 dense bars readably.
 * scale: 0.9 — slightly shrunk glyphs to recover horizontal room.
 * minBarWidth: 180 — same floor as Dense; prevents collapse on busy bars.
 * justifyLastSystem: false — avoids overstretched orphan row at bottom.
 */
export const PROFILE_SONGBOOK_PAGE_MOBILE: LayoutProfileSettings = {
  notation: { notationMode: "SongBook" },
  display: {
    layoutMode: "Page",
    systemsLayoutMode: "Automatic",
    barsPerRow: 2,
    stretchForce: 0.6,
    notationStaffPaddingTop: 24,
    firstNotationStaffPaddingTop: 28,
    effectStaffPaddingTop: 8,
    minBarWidth: 180,
    justifyLastSystem: false,
    scale: 0.9,
  },
};

/**
 * songBookHorizontal — Mobile horizontal layout (landscape phone).
 * stretchForce: 0.2 — cursor-safe. Drop to 0 after cursor validation.
 */
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

// [M3] songBookPageMobile registered
export const LAYOUT_PROFILES: Record<LayoutProfileName, LayoutProfileSettings> =
  {
    compactPage: PROFILE_COMPACT_PAGE,
    songBookPage: PROFILE_SONGBOOK_PAGE,
    songBookPageDense: PROFILE_SONGBOOK_PAGE_DENSE,
    songBookPageDenseNarrow: PROFILE_SONGBOOK_PAGE_DENSE_NARROW,
    songBookPageSparse: PROFILE_SONGBOOK_PAGE_SPARSE,
    songBookPageMobile: PROFILE_SONGBOOK_PAGE_MOBILE, // [M3]
    songBookHorizontal: PROFILE_SONGBOOK_HORIZONTAL,
  };

// ── Track Profile Resolver ─────────────────────────────────────────────────────

const SPARSE_TRACK_RE = /voc|voice|singer|lead\s*vocal|backing\s*vocal|lyric/i;

/**
 * resolveProfileByWidth()
 *
 * Width-tier resolver for ResizeObserver + init seeding.
 * Takes the base track profile (sparse vs dense) and adjusts for container width.
 *
 * Tiers (evaluated top-to-bottom):
 *   useHorizontal   → songBookHorizontal    (landscape phone / forceHorizontal)
 *   < 520px         → songBookPageMobile    (portrait phone — 2 bars/row)
 *                      vocals exception: stays songBookPageSparse
 *   sparse          → songBookPageSparse    (vocals/rest-heavy, any desktop width)
 *   < 900px         → songBookPageDenseNarrow (devtools open / narrow desktop)
 *   ≥ 900px         → songBookPageDense     (full desktop)
 */
export function resolveProfileByWidth(
  containerWidth: number,
  baseTrackProfile: LayoutProfileName,
  useHorizontal: boolean,
): LayoutProfileName {
  if (useHorizontal) return "songBookHorizontal";

  // [M4] Portrait phone: < 520px → mobile page density
  // Sparse exception: vocals stay sparse (fewer staves = more room per bar)
  if (containerWidth < 520) {
    return baseTrackProfile === "songBookPageSparse"
      ? "songBookPageSparse"
      : "songBookPageMobile";
  }

  // Sparse tracks: barsPerRow:8 handles any desktop/tablet width — no narrow tier
  if (baseTrackProfile === "songBookPageSparse") return "songBookPageSparse";

  // 520–900px — tablet or devtools-narrowed desktop
  if (containerWidth < 900) return "songBookPageDenseNarrow";

  // ≥ 900px — full desktop
  return "songBookPageDense";
}

/**
 * resolveTrackLayoutProfile()
 *
 * Picks the correct page profile for a given track name.
 * Mobile always returns songBookHorizontal regardless of track type.
 * Sparse heuristic: track name matches vocal/voice/singer keywords.
 * Everything else (guitar, bass, drums, keys) → Dense.
 */
export function resolveTrackLayoutProfile(
  trackName: string,
  isMobile: boolean,
): LayoutProfileName {
  if (isMobile) return "songBookHorizontal";
  return SPARSE_TRACK_RE.test(trackName)
    ? "songBookPageSparse"
    : "songBookPageDense";
}

/**
 * resolveLayoutProfile()
 *
 * Viewport-only resolver (no track context). Used at init time and on resize.
 * For track-aware switching, use resolveTrackLayoutProfile() instead.
 */
export function resolveLayoutProfile(
  isMobile: boolean,
  forceProfile?: LayoutProfileName,
): LayoutProfileName {
  if (forceProfile) return forceProfile;
  return isMobile ? "songBookHorizontal" : "songBookPageDense";
}

// ── Profile Switchers ─────────────────────────────────────────────────────────

/**
 * _mutateApiSettings()
 *
 * Directly mutates api.settings.display + api.settings.notation in-place.
 *
 * WHY direct mutation instead of api.updateSettings({...partial}):
 * AlphaTab's updateSettings() in this build reads from api.settings —
 * passing a partial object argument is silently ignored. Direct mutation
 * is the same pattern used by initAlphaTab() itself and is confirmed safe.
 */
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
  d.scale = p.display.scale ?? 1.0; // reset to 1.0 for dense tracks
  d.notationStaffPaddingTop = p.display.notationStaffPaddingTop;
  d.firstNotationStaffPaddingTop = p.display.firstNotationStaffPaddingTop;
  d.effectStaffPaddingTop = p.display.effectStaffPaddingTop;
  d.minBarWidth = p.display.minBarWidth;
  d.justifyLastSystem = p.display.justifyLastSystem ?? false;

  if (p.display.barsPerRow !== undefined) {
    d.barsPerRow = p.display.barsPerRow;
  }
}

/**
 * applyAlphaTabLayoutProfileSettings()
 *
 * Mutates api.settings in-place, then calls updateSettings() with no args.
 * Does NOT call api.render(). Use inside scoreLoaded before renderTracks()
 * so there is exactly one render (fired by renderTracks), not two.
 */
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

/**
 * applyAlphaTabLayoutProfile()
 *
 * Mutates api.settings in-place, calls updateSettings() (no args), then
 * calls api.render(). Use for resize / manual profile switching OUTSIDE
 * of the scoreLoaded → renderTracks flow.
 */
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

  // ── Core ──────────────────────────────────────────────────────────────────────
  settings.core.engine = "svg";
  settings.core.logLevel = 1;
  settings.core.fontDirectory =
    "https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/font/";
  settings.core.enableLazyLoading = false;
  settings.core.useWorkers = false; // 🔒 M1 + StrictMode blank-canvas
  settings.core.includeNoteBounds = true; // 🔒 MaestroCursor

  // ── Display — bake profile ────────────────────────────────────────────────────
  const profile = LAYOUT_PROFILES[layoutProfile];

  settings.display.scale = profile.display.scale ?? 1.0;
  settings.display.staveProfile = alphaTab.StaveProfile.Tab;

  settings.display.layoutMode =
    isMobile && layoutMode === "horizontal"
      ? alphaTab.LayoutMode.Horizontal
      : profile.display.layoutMode === "Horizontal"
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

  // displayOverrides applied last — always win over profile values.
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

  // Suppress AlphaTab internal metadata header (title/artist/album).
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

  // ── Notation ──────────────────────────────────────────────────────────────────
  settings.notation.rhythmMode = alphaTab.TabRhythmMode.ShowWithBars;
  settings.notation.rhythmHeight = 15;
  settings.notation.notationMode =
    profile.notation.notationMode === "SongBook"
      ? alphaTab.NotationMode.SongBook
      : alphaTab.NotationMode.GuitarPro;

  // ── Player ────────────────────────────────────────────────────────────────────
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

    // 🔒 "Invisible Engine" — cursor ON, visual hidden.
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    (settings.display as any).cursorType = 0;

    _applyScrollConfig(settings, alphaTab, container, scrollContainer);
  } else {
    settings.player.playerMode = alphaTab.PlayerMode.Disabled;
    settings.player.enableCursor = false;
  }

  // ── Diagnostic bake check (remove once stable) ────────────────────────────────
  console.log("[Layout bake check] V102.3 (before AlphaTabApi)", {
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

  // ── Instantiate ───────────────────────────────────────────────────────────────
  const api = new alphaTab.AlphaTabApi(container, settings);
  console.log("[Layout API check] V102.3 (after AlphaTabApi)", {
    systemsLayoutMode: (api as any).settings?.display?.systemsLayoutMode,
    barsPerRow: (api as any).settings?.display?.barsPerRow,
    minBarWidth: (api as any).settings?.display?.minBarWidth,
    stretchForce: (api as any).settings?.display?.stretchForce,
    scale: (api as any).settings?.display?.scale,
    notationMode: (api as any).settings?.notation?.notationMode,
  });

  console.log("🎸 initAlphaTab V102.3", {
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
 * V101.2 EMPIRICAL LOCK:
 * scrollOffsetX / scrollOffsetY must remain SEPARATE properties.
 * Single 'scrollOffset' is silently ignored by AlphaTab in this build.
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
  if (!response.ok) {
    throw new Error(`loadGuitarProFile: HTTP ${response.status} — ${fileUrl}`);
  }
  api.load(new Uint8Array(await response.arrayBuffer()));
}
