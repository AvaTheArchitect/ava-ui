"use client";

/**
 * gp8ChordOverlay.ts — Chord Phase 2
 * Date: April 22, 2026 — v1.0
 *
 * Re-renders suppressed chord name text nodes as position:absolute HTML overlay
 * chips in the header band above the staff. AlphaTab's native chord Y is ignored
 * (it renders ~89px below staffTopY, i.e. under the tab notation).
 *
 * Probe data (14 rows, same song):
 *   delta(chordY → staffTopY) ≈ +89.2px consistently → native Y is under-staff,
 *   not noisy like PM, but still wrong direction. Normalize from barNumberY.
 *
 * Lane stack (bottom → top, above staff):
 *   barNumberY          ← anchor
 *   PM      baseline    ← barNumberY - 14px  (PM_ABOVE_BAR_NUM_PX)
 *   Chord   baseline    ← barNumberY - 28px  (CHORD_ABOVE_BAR_NUM_PX) ← this file
 *   Tempo               ← higher
 *   FX                  ← higher
 *   Marker              ← ceiling
 *
 * PM→Chord clamp:
 *   If chord baseline would overlap PM overlay chips in the same row,
 *   chord row shifts UP. Row-level shift preserves relative horizontal stacking.
 *
 * Pipeline position (AlphaTabRenderer renderFinished, GP8 only):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)
 *   await runGp8OverlaySuppression(h)
 *   await runGp8PmSuppression(h)
 *   await runGp8ChordSuppression(h)
 *   const fxHandle     = await runGp8OverlayLanes(h)      ← zIndex 18000
 *   const pmHandle     = await runGp8PmOverlay(h)         ← zIndex 17500
 *   const chordHandle  = await runGp8ChordOverlay(h)      ← zIndex 17000, this file
 *   curtain drop
 *
 * Validation probes (console):
 *   document.querySelectorAll('[data-maestro-lane-type="chord"]').length  // === suppressed chord count
 *   document.querySelectorAll('[data-maestro-chord-suppressed="1"]').length // still > 0
 *
 * Handle API mirrors FX/PM (update / destroy).
 * Store in a ref; call destroy() on re-render / unmount / track switch.
 */

import {
  getRowAnchors,
  isStaffSvg,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Gp8ChordOverlayOptions = {
  debug?: boolean;
  zIndex?: number; // default 17000 (below PM 17500, below FX 18000)
  fontSizePx?: number;
};

export type Gp8ChordOverlayHandle = {
  update: () => void;
  destroy: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const CHORD_OVERLAY_ROOT_ID = "maestro-gp8-chord-overlay-root";
const CHORD_ABOVE_BAR_NUM_PX = 16; // 🔧 locked: chord sits 2px above PM (PM = 14)
const CHORD_LANE_OFFSET_PX = 34; // fallback: staffTopY - this (when barNumberY unreliable)
const CHORD_ABOVE_PM_PX = 4; // clearance above PM overlay baseline before chord top

const DEFAULTS: Required<Gp8ChordOverlayOptions> = {
  debug: false,
  zIndex: 17000,
  fontSizePx: 12, // matches AlphaTab "12px Georgia"
};

// ── Internal types ─────────────────────────────────────────────────────────────

type ChordEntry = {
  svg: SVGSVGElement;
  x: number; // SVG-space X from suppressed text (reliable)
  normalizedY: number; // computed from barNumberY, NOT from native text y
  text: string;
  chip: HTMLDivElement;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function parseNum(el: Element, attr: string): number | null {
  const v = parseFloat(el.getAttribute(attr) ?? "");
  return Number.isFinite(v) ? v : null;
}

// ── Root ───────────────────────────────────────────────────────────────────────

function getOrCreateChordRoot(
  containerEl: HTMLElement,
  zIndex: number,
): HTMLDivElement {
  let root = containerEl.querySelector<HTMLDivElement>(
    `#${CHORD_OVERLAY_ROOT_ID}`,
  );
  if (!root) {
    root = document.createElement("div");
    root.id = CHORD_OVERLAY_ROOT_ID;
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

function clearChordRoot(root: HTMLElement): void {
  root
    .querySelectorAll('[data-maestro-lane-type="chord"]')
    .forEach((n) => n.remove());
}

// ── Chip builder ───────────────────────────────────────────────────────────────

function buildChordChip(
  txt: string,
  opts: Required<Gp8ChordOverlayOptions>,
): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "chord");
  chip.setAttribute("data-maestro-pm-role", "label"); // reuse role vocab for consistency
  chip.textContent = txt;
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: `${opts.fontSizePx}px`,
    lineHeight: "1",
    color: "rgba(17,17,17,0.92)",
    whiteSpace: "nowrap",
    userSelect: "none",
    WebkitUserSelect: "none",
    transformOrigin: "top center", // text-anchor="middle" equivalent
    transform: "translateX(-50%)", // center on x coordinate (matches AlphaTab text-anchor)
  });
  if (opts.debug) chip.style.outline = "1px solid rgba(200,100,0,0.6)";
  return chip;
}

// ── Placement ──────────────────────────────────────────────────────────────────

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

// ── Entry point ────────────────────────────────────────────────────────────────

/**
 * runGp8ChordOverlay
 * Queries suppressed chord nodes, renders HTML overlay chips in the header
 * band at a row-anchor-normalized baseline. Native chord Y is discarded.
 *
 * Returns handle — call destroy() on re-render / unmount / track switch.
 */
export async function runGp8ChordOverlay(
  containerEl: HTMLElement,
  options: Gp8ChordOverlayOptions = {},
): Promise<Gp8ChordOverlayHandle> {
  const opts: Required<Gp8ChordOverlayOptions> = { ...DEFAULTS, ...options };

  // Double rAF — layout stable before reading rects
  await nextFrame();
  await nextFrame();

  if (getComputedStyle(containerEl).position === "static") {
    containerEl.style.position = "relative";
  }

  const root = getOrCreateChordRoot(containerEl, opts.zIndex);
  clearChordRoot(root);

  const suppressed = Array.from(
    containerEl.querySelectorAll<SVGTextElement>(
      '[data-maestro-chord-suppressed="1"]',
    ),
  );

  const entries: ChordEntry[] = [];

  for (const t of suppressed) {
    const svg = t.closest<SVGSVGElement>("svg.at-surface-svg");
    if (!svg || !isStaffSvg(svg)) continue;

    const txt = (t.textContent ?? "").trim();
    if (!txt) continue;

    const x = parseNum(t, "x");
    if (x == null) continue;

    const { staffTopY, barNumberY } = getRowAnchors(svg);
    const normalizedY =
      barNumberY > 10
        ? Math.max(2, barNumberY - CHORD_ABOVE_BAR_NUM_PX)
        : Math.max(2, staffTopY - CHORD_LANE_OFFSET_PX);

    const chip = buildChordChip(txt, opts);
    root.appendChild(chip);
    entries.push({ svg, x, normalizedY, text: txt, chip });
  }

  if (opts.debug)
    console.log("[P4-CHORD] gp8ChordOverlay: entries =", entries.length);

  // ── update: place → PM clamp ──────────────────────────────────────────────
  const update = () => {
    // Step 1: base placement at normalized Y + stamp stable row key
    for (const e of entries) {
      placeChip(e.chip, root, e.svg, e.x, e.normalizedY);
      e.chip.dataset.maestroLaneType = "chord";
      // Use DOM-order row key stamped by universalLayoutPatches (same key as PM/FX)
      e.chip.dataset.maestroRow = e.svg.dataset.maestroRowKey ?? "";
    }

    // Step 2: PM→Chord clamp — chord shifts UP if it overlaps PM in the same row.
    // Query containerEl (not svg) because PM chips are HTML divs in the PM overlay
    // root, which is a sibling of the SVG rows — svg.querySelectorAll never finds them.
    // Filter by stable data-maestro-row key so we only compare same-row chips.
    const rr = root.getBoundingClientRect();

    const rowMap = new Map<SVGSVGElement, number[]>();
    for (let i = 0; i < entries.length; i++) {
      const svg = entries[i].svg;
      if (!rowMap.has(svg)) rowMap.set(svg, []);
      rowMap.get(svg)!.push(i);
    }

    for (const [svg, idxs] of rowMap.entries()) {
      const rowKey = svg.dataset.maestroRowKey ?? "";
      if (!rowKey) continue;

      // Find PM label chips in the same row via containerEl + stable row key
      const pmChips = Array.from(
        containerEl.querySelectorAll<HTMLDivElement>(
          `[data-maestro-lane-type="pm"][data-maestro-pm-role="label"][data-maestro-row="${rowKey}"]`,
        ),
      );
      if (!pmChips.length) continue;

      // Also collect PM dashes — they extend the horizontal footprint of each PM span
      const pmDashes = Array.from(
        containerEl.querySelectorAll<HTMLDivElement>(
          `[data-maestro-lane-type="pm"][data-maestro-pm-role="dash"][data-maestro-row="${rowKey}"]`,
        ),
      );
      // All PM primitives with their rendered X extents
      const allPmRects = [...pmChips, ...pmDashes].map((el) =>
        el.getBoundingClientRect(),
      );

      // pmTopRel: topmost PM label in this row (shared origin = root rect)
      let pmTopRel = Infinity;
      for (const pmChip of pmChips) {
        const t = pmChip.getBoundingClientRect().top - rr.top;
        if (t < pmTopRel) pmTopRel = t;
      }
      const requiredChordBottom = pmTopRel - CHORD_ABOVE_PM_PX;

      // Per-chip X-aware clamp:
      // Chords and PM share Lane 2 — only push chord up when they actually
      // overlap horizontally. If chord is at x=200 and PM is at x=400,
      // no vertical shift needed (they coexist side-by-side in the same band).
      for (const i of idxs) {
        const chordRect = entries[i].chip.getBoundingClientRect();

        // X-overlap check against all PM primitives in this row
        const xOverlaps = allPmRects.some(
          (pmRect) =>
            chordRect.left < pmRect.right && chordRect.right > pmRect.left,
        );
        if (!xOverlaps) continue; // different X position — no conflict, stay in Lane 2

        // Genuine X conflict: shift chord up so its bottom clears PM top
        const chordBottomRel = chordRect.bottom - rr.top;
        const overlap = chordBottomRel - requiredChordBottom;
        if (overlap > 0) {
          const cssTop = parseFloat(entries[i].chip.style.top) || 0;
          entries[i].chip.style.top = `${cssTop - overlap}px`;
          if (opts.debug)
            console.log(
              `[P4-CHORD] X-conflict clamp row ${rowKey} shift ↑ ${overlap.toFixed(1)}px`,
            );
        }
      }
    }
  };

  update();

  const onResize = () => update();
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);

  return {
    update,
    destroy: () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      if (root.parentElement) root.parentElement.removeChild(root);
    },
  };
}
