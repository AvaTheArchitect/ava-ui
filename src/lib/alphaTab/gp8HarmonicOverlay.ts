"use client";

/**
 * gp8HarmonicOverlay.ts — Harmonic Phase 2 (model-driven label overlay)
 * Date: April 23, 2026 — v2.0
 *
 * v2.0 REWRITE — model-driven, not SVG glyph scrape:
 * ✅ Source of truth: score model (note.harmonicValue / note.harmonicType).
 *    Glyph scrape (v1.0) caused false positives on every empty measure.
 * ✅ Detection: hv > 0 && hv <= 8 && fret <= 6 → "pinch-ish" rule.
 *    Confirmed probe: exactly measures 27/35/63/136/144, 13 unique beatIds, zero FP.
 * ✅ One chip per beatId (de-duped) — no per-note spam.
 * ✅ X from boundsLookup.findBeat(beat).visualBounds (same as cursor engine).
 * ✅ Y in Lane 4 via barNumberY normalization (same as vibrato).
 * ✅ Label: "P.H." — Songsterr parity; revisit if Daniel confirms semantic enum.
 * ✅ No dash rail (P6+ when spacing is tuned).
 * ✅ No clamp logic (defer until P6 lane stack is settled).
 *
 * gp8HarmonicSuppression.ts still runs to prevent native glyph layout inflation.
 * It is NOT the data source for this overlay.
 *
 * Signature: runGp8HarmonicOverlay(containerEl, api, options?)
 *   api is required — boundsLookup + score.tracks are the data source.
 *
 * Pipeline position (AlphaTabRenderer renderFinished):
 *   await runGp8HarmonicSuppression(h)
 *   const harmonicHandle = await runGp8HarmonicOverlay(h, api)
 *   ...
 *   window.dispatchEvent(new Event('maestro:overlays-ready'))
 */

import {
  getRowAnchors,
  isStaffSvg,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Gp8HarmonicOverlayOptions = {
  debug?: boolean;
  zIndex?: number;
};

export type Gp8HarmonicOverlayHandle = {
  update: () => void;
  destroy: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const HARMONIC_OVERLAY_ROOT_ID = "maestro-gp8-harmonic-overlay-root";
const TECH_ABOVE_BAR_NUM_PX = 28; // Lane 4 — positive offset: barNumberY - 28 = above bar number
const TECH_LANE_OFFSET_PX = 34; // fallback: staffTopY - this
const PH_LABEL = "P.H.";

// Pinch-harmonic detection (confirmed via probe: hv=3.2/4, fret=3/5, track 0).
// Natural harmonics (hv=12/15, fret=12/15) excluded by fret <= 6.
const PH_HV_MAX = 8; // harmonicValue ceiling
const PH_FRET_MAX = 6; // fret ceiling

const DEFAULTS: Required<Gp8HarmonicOverlayOptions> = {
  debug: false,
  zIndex: 17100, // below vibrato (17200)
};

// ── Internal types ─────────────────────────────────────────────────────────────

type PhEntry = {
  svg: SVGSVGElement;
  x: number;
  normalizedY: number;
  chip: HTMLDivElement;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function getOrCreateRoot(
  containerEl: HTMLElement,
  zIndex: number,
): HTMLDivElement {
  let root = containerEl.querySelector<HTMLDivElement>(
    `#${HARMONIC_OVERLAY_ROOT_ID}`,
  );
  if (!root) {
    root = document.createElement("div");
    root.id = HARMONIC_OVERLAY_ROOT_ID;
    containerEl.appendChild(root);
  }
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: String(zIndex),
    overflow: "visible",
  });
  return root;
}

function clearRoot(root: HTMLElement): void {
  root
    .querySelectorAll('[data-maestro-technique-kind="pinch-harmonic"]')
    .forEach((n) => n.remove());
}

function buildChip(opts: Required<Gp8HarmonicOverlayOptions>): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "technique");
  chip.setAttribute("data-maestro-technique-kind", "pinch-harmonic");
  chip.textContent = PH_LABEL;
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontStyle: "italic",
    fontSize: "11px",
    lineHeight: "1",
    color: "#000000",
    whiteSpace: "nowrap",
    userSelect: "none",
    WebkitUserSelect: "none",
  });
  if (opts.debug) chip.style.outline = "1px solid rgba(0,150,255,0.6)";
  return chip;
}

function placeChip(
  chip: HTMLElement,
  root: HTMLElement,
  svg: SVGSVGElement,
  x: number,
  y: number,
): void {
  const rr = root.getBoundingClientRect();
  const sr = svg.getBoundingClientRect();
  chip.style.left = `${sr.left - rr.left + x}px`;
  chip.style.top = `${sr.top - rr.top + y}px`;
}

// Read staff line band directly from SVG <rect> attributes — same coordinate
// space as bb.visualBounds.y. The grey staff lines (fill #A5A5A5) give us the
// true vertical extent of each row in AlphaTab layout units.
function getStaffBandY(
  svg: SVGSVGElement,
): { top: number; bottom: number } | null {
  const rects = Array.from(
    svg.querySelectorAll<SVGRectElement>(
      'rect[fill="#A5A5A5"], rect[fill="#a5a5a5"]',
    ),
  );
  if (!rects.length) return null;
  let top = Infinity,
    bottom = -Infinity;
  for (const r of rects) {
    const y = parseFloat(r.getAttribute("y") ?? "NaN");
    const h = parseFloat(r.getAttribute("height") ?? "NaN");
    if (!Number.isFinite(y) || !Number.isFinite(h)) continue;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + h);
  }
  return Number.isFinite(top) && Number.isFinite(bottom)
    ? { top, bottom }
    : null;
}

// Resolve staff SVG in pure SVG coordinate space.
// vb.y (from bb.visualBounds) is AlphaTab layout space — never mix with DOMRects.
// Staff-line band gives us the true row extents in the same space.
function resolveSvgForBeat(
  vb: { x: number; y: number },
  containerEl: HTMLElement,
  debug = false,
): SVGSVGElement | null {
  const svgs = Array.from(
    containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
  ).filter(isStaffSvg);

  const PAD_TOP = 80;
  const PAD_BOTTOM = 120;
  let best: SVGSVGElement | null = null;
  let bestDist = Infinity;

  for (const svg of svgs) {
    const band = getStaffBandY(svg);
    if (!band) continue;
    // True containment: beat Y is within this row's padded band → immediate match
    if (vb.y >= band.top - PAD_TOP && vb.y <= band.bottom + PAD_BOTTOM)
      return svg;
    // Fallback: track closest band center for rows without containment
    const center = (band.top + band.bottom) / 2;
    const dist = Math.abs(vb.y - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = svg;
    }
  }
  if (debug)
    console.log(
      "[P4-HARM] resolveSvg fallback dist=",
      bestDist.toFixed(1),
      "vb.y=",
      vb.y,
    );
  return best;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function runGp8HarmonicOverlay(
  containerEl: HTMLElement,
  api: any,
  options: Gp8HarmonicOverlayOptions = {},
): Promise<Gp8HarmonicOverlayHandle> {
  const opts: Required<Gp8HarmonicOverlayOptions> = { ...DEFAULTS, ...options };

  await nextFrame();
  await nextFrame();

  if (getComputedStyle(containerEl).position === "static") {
    containerEl.style.position = "relative";
  }

  const root = getOrCreateRoot(containerEl, opts.zIndex);
  clearRoot(root);

  // ── Collect pinch-harmonic beats from score model ─────────────────────────
  const seenBeatIds = new Set<number>();
  const phBeats: any[] = [];

  const renderedTrackIndices: Set<number> = api?.tracks
    ? new Set(api.tracks.map((t: any) => t.index as number))
    : new Set([0]);

  const tracks: any[] = api?.score?.tracks ?? [];
  for (const track of tracks) {
    if (!renderedTrackIndices.has(track.index)) continue;
    for (const staff of track.staves ?? []) {
      for (const bar of staff.bars ?? []) {
        for (const voice of bar.voices ?? []) {
          for (const beat of voice.beats ?? []) {
            if (seenBeatIds.has(beat.id)) continue;
            const notes: any[] = beat.notes ?? [];
            const isPinchish = notes.some((n) => {
              const hv = (n.harmonicValue ?? 0) as number;
              const fret = (n.fret ?? 99) as number;
              return hv > 0 && hv <= PH_HV_MAX && fret <= PH_FRET_MAX;
            });
            if (!isPinchish) continue;
            seenBeatIds.add(beat.id);
            phBeats.push(beat);
          }
        }
      }
    }
  }

  if (opts.debug)
    console.log("[P4-HARM] model beats =", phBeats.length, "beatIds:", [
      ...seenBeatIds,
    ]);

  // ── Build entries ─────────────────────────────────────────────────────────
  // bounds.findBeat() requires the same beat object reference that the renderer
  // indexed. Score-model traversal may yield different instances, so we resolve
  // via tickCache (same strategy as the cursor engine) to get the renderer's beat.
  const bounds = api?.renderer?.boundsLookup;
  const tickCache = (api as any)?.tickCache;
  const renderedTrackSet: Set<number> = api?.tracks
    ? new Set(api.tracks.map((t: any) => t.index as number))
    : new Set([0]);

  const entries: PhEntry[] = [];
  let noTick = 0,
    noBounds = 0,
    noSvg = 0;

  for (const beat of phBeats) {
    // Resolve the tick for this beat: absolutePlaybackStart is the expanded tick
    const tick = beat.absolutePlaybackStart ?? beat.playbackStart ?? null;
    if (tick == null) {
      noTick++;
      continue;
    }

    // Look up the renderer's canonical beat object via tickCache
    const r = tickCache?.findBeat?.(renderedTrackSet, tick);
    const rendererBeat = r?.beat ?? beat; // fallback to model beat if tickCache misses

    const bb = bounds?.findBeat?.(rendererBeat);
    if (!bb?.visualBounds) {
      // tickCache miss — try model beat directly
      const bb2 = bounds?.findBeat?.(beat);
      if (!bb2?.visualBounds) {
        noBounds++;
        continue;
      }
      const vb2 = bb2.visualBounds;
      const svg2 = resolveSvgForBeat(
        { x: vb2.x, y: vb2.y },
        containerEl,
        opts.debug,
      );
      if (!svg2) {
        noSvg++;
        continue;
      }
      const { staffTopY, barNumberY } = getRowAnchors(svg2);
      const normalizedY =
        barNumberY > 10
          ? Math.max(2, barNumberY - TECH_ABOVE_BAR_NUM_PX)
          : Math.max(2, staffTopY - TECH_LANE_OFFSET_PX);
      const chip = buildChip(opts);
      root.appendChild(chip);
      entries.push({ svg: svg2, x: vb2.x + vb2.w / 2, normalizedY, chip });
      continue;
    }

    const vb = bb.visualBounds;
    const svg = resolveSvgForBeat(
      { x: vb.x, y: vb.y },
      containerEl,
      opts.debug,
    );
    if (!svg) {
      noSvg++;
      continue;
    }

    const { staffTopY, barNumberY } = getRowAnchors(svg);
    const normalizedY =
      barNumberY > 10
        ? Math.max(2, barNumberY - TECH_ABOVE_BAR_NUM_PX)
        : Math.max(2, staffTopY - TECH_LANE_OFFSET_PX);

    const chip = buildChip(opts);
    root.appendChild(chip);
    entries.push({ svg, x: vb.x + vb.w / 2, normalizedY, chip });
  }

  if (opts.debug)
    console.log(
      "[P4-HARM] placed entries =",
      entries.length,
      "| noTick:",
      noTick,
      "noBounds:",
      noBounds,
      "noSvg:",
      noSvg,
    );

  // ── Placement ─────────────────────────────────────────────────────────────
  const runPlacement = () => {
    for (const e of entries) {
      placeChip(e.chip, root, e.svg, e.x, e.normalizedY - 11);
      e.chip.dataset.maestroRow = e.svg.dataset.maestroRowKey ?? "";
    }
  };

  const update = () => {
    runPlacement();
    // PM clamp deferred — add post-P6 when lane stack is settled
  };

  if (typeof window !== "undefined") {
    (window as any).__maestroHarmUpdate = () => runPlacement();
  }

  update();

  return {
    update,
    destroy: () => {
      clearRoot(root);
      if (root.parentElement) root.parentElement.removeChild(root);
      if (typeof window !== "undefined")
        delete (window as any).__maestroHarmUpdate;
    },
  };
}
