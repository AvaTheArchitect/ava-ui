"use client";

/**
 * gp8VibratoOverlay.ts — Vibrato Phase 2
 * Date: April 23, 2026 — v1.7
 *
 * v1.7 CHANGES (bend clamp — Arial label text, not SMuFL e241):
 * ✅ Probe confirmed: bend collision object = Arial <text> "full"/"2"/etc, NOT e241.
 *    vibRect left 552.7–589.6 overlaps "full" left 545.6–564.7 in X — proof of hit.
 * ✅ collectBendLabelRects() scans for fontFamily:Arial + BEND_LABEL_RE content.
 * ✅ Removed BEND_CPS / e241 / collectBendGlyphRects — wrong target.
 * ✅ Bend clamp pass runs after PM clamp (reads post-PM chip position).
 *
 * v1.6 CHANGES (bend-aware clamp — e241 SMuFL glyph — SUPERSEDED by v1.7):
 * ✅ Handle now exposes updatePlacement() + updateClamp() separately.
 * ✅ update() preserved as combined convenience (placement sync, clamp 2×rAF).
 * ✅ Orchestrator in AlphaTabRenderer calls vib.updatePlacement() first,
 *    then schedules vib.updateClamp() after 2×rAF (PM rects fully settled).
 * ✅ window.__maestroVibUpdate now calls both sync (debug only).
 * ✅ Added [P4-VIBRATO] handle-null guard log to confirm handle is alive.
 *
 * v1.3 LOCKED (unchanged):
 * ✅ Reverted findPairedTabSvg — caused displacement regression (v20/v21).
 * ✅ Fixed nearLabels compile error (was undefined in v19).
 * ✅ DY_MAX_PX = 140 guard prevents cross-system PM false positives.
 * ✅ Two-phase update: placement synchronous, PM clamp 2×rAF deferred.
 * ✅ 3×rAF ResizeObserver scheduleUpdate (DevTools docking resilience).
 *
 * v1.0 LOCKED (unchanged):
 * ✅ Font: "alphaTab" (36px confirmed via getComputedStyle probe).
 * ✅ Glyph text copied verbatim from suppressed <text> (eab2/eab3).
 * ✅ X from parent <g> transform — reliable across all GP file types.
 * ✅ Native translate Y ignored (header-band noise).
 * ✅ data-maestro-lane-type="technique", data-maestro-technique-kind="vibrato".
 *
 * Lane assignment:
 *   Vibratos are technique lane — same priority band as PM (Lane 2).
 *   When vibrato X-overlaps PM and is within DY_MAX_PX in Y → yields upward.
 *
 * Pipeline position (AlphaTabRenderer renderFinished, before curtain drop):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8VibratoSuppression(h)           ← Phase 1 (all GP types)
 *   const vibratoHandle = await runGp8VibratoOverlay(h)  ← this file
 *   if (isGP8) { ... GP8-only passes ... }
 *   curtain drop
 *
 * Orchestrator call order (AlphaTabRenderer ResizeObserver):
 *   pm.update();
 *   chord.update();
 *   fx.update();
 *   vib.updatePlacement();                              ← sync
 *   requestAnimationFrame(() =>
 *     requestAnimationFrame(() => vib.updateClamp())   ← deferred, PM rects settled
 *   );
 */

import {
  getRowAnchors,
  isStaffSvg,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Gp8VibratoOverlayOptions = {
  debug?: boolean;
  zIndex?: number;
  fontSizePx?: number;
};

export type Gp8VibratoOverlayHandle = {
  /** Place chips at their computed Y positions. Synchronous. */
  updatePlacement: () => void;
  /** Clamp chips above overlapping PM labels. Reads live rects — call after PM settles. */
  updateClamp: () => void;
  /** Combined convenience: placement sync + clamp 2×rAF. */
  update: () => void;
  destroy: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const VIBRATO_OVERLAY_ROOT_ID = "maestro-gp8-vibrato-overlay-root";
const TECH_ABOVE_BAR_NUM_PX = -14; // 🔒 negative = below barNumberY (Lane 2 technique band)
const TECH_LANE_OFFSET_PX = 20; // fallback: staffTopY - this
const VIBRATO_ABOVE_PM_PX = 2; // clearance above PM top on X-conflict
const VIBRATO_ABOVE_BEND_PX = 2; // clearance above bend label top on X-conflict
const DY_MAX_PX = 140; // max viewport Y gap — prevents cross-system teleports (PM clamp)
const BEND_DY_MAX_PX = 200; // wider than PM — lower-string vibratos sit further from bend label Y
const BEND_X_PAD_PX = 6; // expand bend label rect ±6px in X — catches "almost touching" near-misses

// Matches bend label text content (Arial 14px, plain text — not SMuFL).
// Probe confirmed: "full", "2" etc. are the collision objects, NOT e241.
// Numeric forms like "2" cover AlphaTab's integer bend amounts.
const BEND_LABEL_RE =
  /^(full|prebend|rel|hold|¼|½|¾|1¼|1½|1¾|2|2½|3|\d+(?:\/\d+)?)$/i;

const DEFAULTS: Required<Gp8VibratoOverlayOptions> = {
  debug: false,
  zIndex: 17200,
  fontSizePx: 36, // 🔒 confirmed: getComputedStyle(text).fontSize = "36px"
};

// ── Internal types ─────────────────────────────────────────────────────────────

type VibratoEntry = {
  svg: SVGSVGElement;
  x: number;
  normalizedY: number;
  glyphText: string;
  cp: string;
  chip: HTMLDivElement;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function parseTranslate(
  transform: string | null,
): { x: number; y: number } | null {
  if (!transform) return null;
  const m = transform.match(/translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/);
  if (!m) return null;
  const x = parseFloat(m[1]);
  const y = parseFloat(m[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

// Collect bend label rects from native SVG <text> nodes (Arial font, plain text).
// "full", "2", "1¾" etc. are drawn as Arial — NOT alphaTab SMuFL glyphs.
// Probe: vibRect left 552.7–589.6 overlapped "full" left 545.6–564.7 ✅
// When "2" appears at multiple Y positions (notation + TAB layers), nearest-by-Y
// in the clamp loop picks the correct one.
function collectBendLabelRects(svg: SVGSVGElement): DOMRect[] {
  const out: DOMRect[] = [];
  const texts = svg.querySelectorAll<SVGTextElement>("text");
  for (const t of texts) {
    const ff = getComputedStyle(t).fontFamily ?? "";
    // Must be Arial (or sans-serif fallback) — exclude alphaTab SMuFL glyphs.
    if (ff.toLowerCase().includes("alphatab")) continue;
    const txt = (t.textContent ?? "").trim();
    if (!BEND_LABEL_RE.test(txt)) continue;
    out.push(t.getBoundingClientRect());
  }
  return out;
}

// ── Root ───────────────────────────────────────────────────────────────────────

function getOrCreateVibratoRoot(
  containerEl: HTMLElement,
  zIndex: number,
): HTMLDivElement {
  let root = containerEl.querySelector<HTMLDivElement>(
    `#${VIBRATO_OVERLAY_ROOT_ID}`,
  );
  if (!root) {
    root = document.createElement("div");
    root.id = VIBRATO_OVERLAY_ROOT_ID;
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

function clearVibratoRoot(root: HTMLElement): void {
  root
    .querySelectorAll('[data-maestro-lane-type="technique"]')
    .forEach((n) => n.remove());
}

// ── Chip builder ───────────────────────────────────────────────────────────────

function buildVibratoChip(
  glyphText: string,
  cp: string,
  opts: Required<Gp8VibratoOverlayOptions>,
): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "technique");
  chip.setAttribute("data-maestro-technique-kind", "vibrato");
  chip.setAttribute("data-maestro-vibrato-cp", cp);
  chip.textContent = glyphText;
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    fontFamily: "alphaTab",
    fontStyle: "normal",
    fontSize: `${opts.fontSizePx}px`,
    lineHeight: "1",
    color: "#000000",
    whiteSpace: "nowrap",
    userSelect: "none",
    WebkitUserSelect: "none",
    // ⚠️ No global translateX(-50%) — AlphaTab's <g> translate X is a left-origin
    // for most vibratos. Centering shifts by glyphWidth/2 which is destructive for
    // long strings (Warrant txtLen=69, width=377px → 189px unwanted shift).
    // Bend-context-only centering pending bend primitive identification (Probe A).
  });
  if (opts.debug) chip.style.outline = "1px solid rgba(255,100,0,0.6)";
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

// ── Public API ─────────────────────────────────────────────────────────────────

export async function runGp8VibratoOverlay(
  containerEl: HTMLElement,
  options: Gp8VibratoOverlayOptions = {},
): Promise<Gp8VibratoOverlayHandle> {
  const opts: Required<Gp8VibratoOverlayOptions> = { ...DEFAULTS, ...options };

  await nextFrame();
  await nextFrame();

  if (getComputedStyle(containerEl).position === "static") {
    containerEl.style.position = "relative";
  }

  const root = getOrCreateVibratoRoot(containerEl, opts.zIndex);
  clearVibratoRoot(root);

  const suppressedGs = Array.from(
    containerEl.querySelectorAll<SVGGElement>(
      '[data-maestro-vibrato-suppressed="1"]',
    ),
  );

  const entries: VibratoEntry[] = [];

  for (const g of suppressedGs) {
    const svg = g.closest<SVGSVGElement>("svg.at-surface-svg");
    if (!svg || !isStaffSvg(svg)) continue;

    const tf = parseTranslate(g.getAttribute("transform"));
    if (!tf) continue;

    const textEl = g.querySelector("text");
    const glyphText = textEl?.textContent ?? "";
    if (!glyphText) continue;

    const cp = glyphText.codePointAt(0)?.toString(16) ?? "";

    // Y from notation SVG anchors (v16 baseline — visually correct).
    // findPairedTabSvg tried in v20/v21 but caused regression; reverted.
    const { staffTopY, barNumberY } = getRowAnchors(svg);
    const normalizedY =
      barNumberY > 10
        ? Math.max(2, barNumberY - TECH_ABOVE_BAR_NUM_PX)
        : Math.max(2, staffTopY - TECH_LANE_OFFSET_PX);

    const chip = buildVibratoChip(glyphText, cp, opts);
    root.appendChild(chip);
    entries.push({ svg, x: tf.x, normalizedY, glyphText, cp, chip });
  }

  if (opts.debug) console.log("[P4-VIBRATO] entries =", entries.length);

  // ── Phase 1: Placement (synchronous) ────────────────────────────────────────
  const runPlacement = () => {
    for (const e of entries) {
      placeChip(e.chip, root, e.svg, e.x, e.normalizedY - opts.fontSizePx);
      e.chip.dataset.maestroRow = e.svg.dataset.maestroRowKey ?? "";
    }
  };

  // ── Phase 2: PM clamp (call after PM overlay has settled) ───────────────────
  const runPmClamp = () => {
    const rr = root.getBoundingClientRect();

    const allPmLabels = Array.from(
      containerEl.querySelectorAll<HTMLElement>(
        '[data-maestro-lane-type="pm"][data-maestro-pm-role="label"]',
      ),
    );
    const allPmPrimitives = Array.from(
      containerEl.querySelectorAll<HTMLElement>(
        '[data-maestro-lane-type="pm"]',
      ),
    );

    for (const e of entries) {
      const vibRect = e.chip.getBoundingClientRect();

      // Step 1: X-overlap candidates
      const xOverlappingLabels = allPmLabels.filter((pm) => {
        const r = pm.getBoundingClientRect();
        return vibRect.left < r.right && vibRect.right > r.left;
      });
      if (!xOverlappingLabels.length) continue;

      // Step 2: Hard Y guard — reject PM labels from other systems.
      //   Cross-system X-overlaps produce 1000–2000px teleports without this.
      const nearLabels = xOverlappingLabels.filter((pm) => {
        const r = pm.getBoundingClientRect();
        return Math.abs(r.top - vibRect.top) <= DY_MAX_PX;
      });
      if (!nearLabels.length) continue;

      // Step 3: Pick nearest-by-Y among near candidates
      const vibCenterY = (vibRect.top + vibRect.bottom) / 2;
      let closestLabel: HTMLElement | null = null;
      let closestDy = Infinity;
      for (const pm of nearLabels) {
        const r = pm.getBoundingClientRect();
        const dy = Math.abs((r.top + r.bottom) / 2 - vibCenterY);
        if (dy < closestDy) {
          closestDy = dy;
          closestLabel = pm;
        }
      }
      if (!closestLabel) continue;

      const pmGroup = closestLabel.dataset.maestroPmGroup;
      const groupPrimitives = pmGroup
        ? allPmPrimitives.filter((pm) => pm.dataset.maestroPmGroup === pmGroup)
        : [closestLabel];

      const pmTopRel = closestLabel.getBoundingClientRect().top - rr.top;

      const xOverlaps = groupPrimitives.some((pm) => {
        const r = pm.getBoundingClientRect();
        return vibRect.left < r.right && vibRect.right > r.left;
      });
      if (!xOverlaps) continue;

      const vibBottomRel = vibRect.bottom - rr.top;
      const requiredVibBottom = pmTopRel - VIBRATO_ABOVE_PM_PX;
      const overlap = vibBottomRel - requiredVibBottom;
      if (overlap > 0) {
        const cssTop = parseFloat(e.chip.style.top) || 0;
        e.chip.style.top = `${cssTop - overlap}px`;
        if (opts.debug)
          console.log(
            `[P4-VIBRATO] PM clamp ↑ ${overlap.toFixed(1)}px (dy=${closestDy.toFixed(0)})`,
          );
      }
    }

    // ── Bend clamp ────────────────────────────────────────────────────────────
    // Runs after PM clamp so final chip position is what bend reads.
    // Only triggers when cp e241 (confirmed Ozzy probe) overlaps vibrato in X
    // and is within BEND_DY_MAX_PX in Y — same guard as PM to prevent teleports.
    for (const e of entries) {
      const bendRects = collectBendLabelRects(e.svg);
      if (!bendRects.length) continue;

      const vibRect = e.chip.getBoundingClientRect();
      const xCandidates = bendRects.filter(
        (r) =>
          vibRect.left < r.right + BEND_X_PAD_PX &&
          vibRect.right > r.left - BEND_X_PAD_PX,
      );
      if (!xCandidates.length) continue;

      const vibCenterY = (vibRect.top + vibRect.bottom) / 2;
      let closestBend: DOMRect | null = null;
      let bestDy = Infinity;
      for (const r of xCandidates) {
        const dy = Math.abs((r.top + r.bottom) / 2 - vibCenterY);
        if (dy < bestDy) {
          bestDy = dy;
          closestBend = r;
        }
      }
      if (!closestBend || bestDy > BEND_DY_MAX_PX) continue;

      const vibBottomRel = vibRect.bottom - rr.top;
      const bendTopRel = closestBend.top - rr.top;
      const requiredVibBottom = bendTopRel - VIBRATO_ABOVE_BEND_PX;
      const overlap = vibBottomRel - requiredVibBottom;
      if (overlap > 0) {
        const cssTop = parseFloat(e.chip.style.top) || 0;
        e.chip.style.top = `${cssTop - overlap}px`;
        if (opts.debug)
          console.log(
            `[P4-VIBRATO] BEND clamp ↑ ${overlap.toFixed(1)}px (dy=${bestDy.toFixed(0)})`,
          );
      }
    }
  };

  let clampRaf1 = 0,
    clampRaf2 = 0;

  // ── Exported surface ─────────────────────────────────────────────────────────

  /** Placement only — synchronous. Safe to call while PM is still settling. */
  const updatePlacement = () => runPlacement();

  /** Clamp only — reads live PM rects. Call after PM overlay has settled. */
  const updateClamp = () => runPmClamp();

  /**
   * Combined: placement sync + clamp after 2×rAF.
   * Used by the overlay's own internal triggers (visualViewport resize).
   * Orchestrator should prefer calling updatePlacement() + updateClamp()
   * separately for precise ordering.
   */
  const update = () => {
    runPlacement();
    cancelAnimationFrame(clampRaf1);
    cancelAnimationFrame(clampRaf2);
    clampRaf1 = requestAnimationFrame(() => {
      clampRaf2 = requestAnimationFrame(() => runPmClamp());
    });
  };

  // Manual debug trigger — calls both sync (no rAF delay) for REPL inspection
  if (typeof window !== "undefined") {
    (window as any).__maestroVibUpdate = () => {
      runPlacement();
      runPmClamp();
    };
  }

  update();

  // ResizeObserver intentionally disabled — AlphaTabRenderer owns the
  // container ResizeObserver and calls overlay handles in fixed priority
  // order via the orchestrator effect. Enabling a local observer here
  // would race the renderer's orchestrated updates and produce stale rects.
  // visualViewport still handled for mobile zoom (doesn't conflict with renderer RO).
  let raf1 = 0,
    raf2 = 0,
    raf3 = 0;
  const scheduleUpdate = () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    cancelAnimationFrame(raf3);
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        raf3 = requestAnimationFrame(() => update());
      });
    });
  };
  window.visualViewport?.addEventListener("resize", scheduleUpdate);

  return {
    updatePlacement,
    updateClamp,
    update,
    destroy: () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
      cancelAnimationFrame(clampRaf1);
      cancelAnimationFrame(clampRaf2);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
      if (root.parentElement) root.parentElement.removeChild(root);
      if (typeof window !== "undefined")
        delete (window as any).__maestroVibUpdate;
    },
  };
}
