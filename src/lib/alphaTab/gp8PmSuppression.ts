"use client";

/**
 * gp8PmSuppression.ts — P4 PM Phase 1
 * Date: April 22, 2026 — v1.0
 *
 * Suppresses native AlphaTab PM primitives so they no longer participate
 * in AlphaTab's layout/spacing engine. PM overlay re-render is Phase 2.
 *
 * Why this matters:
 *   Native PM in AlphaTab layout flow forces tempo clusters and context
 *   markers upward (observed: removing PM drops tempo to Lane 2 correctly).
 *   Suppressing PM and re-rendering as overlay breaks that coupling.
 *
 * Primitives detected (from SVG probe April 22, 2026):
 *   Label:   <text italic Georgia>P.M.</text>     — italic Georgia, exact match
 *   Dash:    <rect fill="#000000" ~9×1.44>        — short horizontal rail
 *   End-cap: <rect fill="#000000" ~1.44×9>        — vertical terminator
 *
 * Anchoring strategy:
 *   - Detect each "P.M." label → read its (x, y)
 *   - Suppress only dashes + end-caps in the same Y band and to the right
 *   - Never globally suppress black rects (would nuke rests/beams)
 *
 * Idempotency:
 *   - Labels:   data-maestro-pm-suppressed="label"
 *   - Dashes:   data-maestro-pm-suppressed="dash"
 *   - End-caps: data-maestro-pm-suppressed="endcap"
 *
 * Pipeline position (AlphaTabRenderer renderFinished, before curtain drop):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)          ← GP8 only
 *   await runGp8OverlaySuppression(h)      ← GP8 only
 *   await runGp8PmSuppression(h)           ← GP8 only, this file
 *   const laneHandle = await runGp8OverlayLanes(h.containerEl)
 *   curtain drop
 *
 * Phase 2 (TODO): re-render suppressed PM as HTML overlay in gp8OverlayLanes
 *   so AlphaTab spacing is fully decoupled from PM geometry.
 */

import {
  isStaffSvg,
  getRowAnchors,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Thresholds (from SVG probe) ───────────────────────────────────────────────

const PM_Y_BAND_TOL = 8; // px: how far a dash/endcap Y can stray from label Y
const PM_MIN_X_AFTER_LABEL = 10; // px: dashes start at least this far right of label x

// Dash: ~9w × 1.44h
const DASH_W_MIN = 6;
const DASH_W_MAX = 14;
const DASH_H_MIN = 1.0;
const DASH_H_MAX = 2.2;

// End-cap: ~1.44w × 9h
const CAP_W_MIN = 1.0;
const CAP_W_MAX = 2.2;
const CAP_H_MIN = 6;
const CAP_H_MAX = 14;

// ── Detectors ─────────────────────────────────────────────────────────────────

function isPmLabel(t: SVGTextElement): boolean {
  if ((t.textContent ?? "").trim() !== "P.M.") return false;
  if (t.getAttribute("data-maestro-pm-suppressed")) return false;
  const style = (t.getAttribute("style") ?? "").toLowerCase();
  return style.includes("italic") && style.includes("georgia");
}

function isPmDash(r: SVGRectElement): boolean {
  if (r.getAttribute("data-maestro-pm-suppressed")) return false;
  if ((r.getAttribute("fill") ?? "").toLowerCase() !== "#000000") return false;
  const w = parseFloat(r.getAttribute("width") ?? "0");
  const h = parseFloat(r.getAttribute("height") ?? "0");
  return (
    w >= DASH_W_MIN && w <= DASH_W_MAX && h >= DASH_H_MIN && h <= DASH_H_MAX
  );
}

function isPmEndCap(r: SVGRectElement): boolean {
  if (r.getAttribute("data-maestro-pm-suppressed")) return false;
  if ((r.getAttribute("fill") ?? "").toLowerCase() !== "#000000") return false;
  const w = parseFloat(r.getAttribute("width") ?? "0");
  const h = parseFloat(r.getAttribute("height") ?? "0");
  return w >= CAP_W_MIN && w <= CAP_W_MAX && h >= CAP_H_MIN && h <= CAP_H_MAX;
}

// ── Suppression helpers ───────────────────────────────────────────────────────

function suppress(el: Element, role: "label" | "dash" | "endcap"): void {
  el.setAttribute("display", "none");
  el.setAttribute("data-maestro-pm-suppressed", role);
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * runGp8PmSuppression — hides native PM label + rail primitives per staff SVG row.
 * Anchors dash/endcap detection to each label's position — no global rect suppression.
 * Returns Promise<void>; caller must await before curtain drop.
 */
export function runGp8PmSuppression(containerEl: HTMLElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgRows = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );

      let totalLabels = 0;
      let totalDashes = 0;
      let totalCaps = 0;

      for (const svg of svgRows) {
        if (!isStaffSvg(svg)) continue;

        // Collect all candidate rects once per SVG (cheaper than querying per label)
        const rects = Array.from(svg.querySelectorAll<SVGRectElement>("rect"));
        const dashCandidates = rects.filter(isPmDash);
        const endCapCandidates = rects.filter(isPmEndCap);

        const labels = Array.from(
          svg.querySelectorAll<SVGTextElement>("text"),
        ).filter(isPmLabel);

        for (const label of labels) {
          const pmX = parseFloat(label.getAttribute("x") ?? "NaN");
          const pmY = parseFloat(label.getAttribute("y") ?? "NaN");
          if (!Number.isFinite(pmX) || !Number.isFinite(pmY)) continue;

          suppress(label, "label");
          totalLabels++;

          // Dashes: same Y band, to the right of label
          for (const r of dashCandidates) {
            const rx = parseFloat(r.getAttribute("x") ?? "NaN");
            const ry = parseFloat(r.getAttribute("y") ?? "NaN");
            if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
            if (rx < pmX + PM_MIN_X_AFTER_LABEL) continue;
            if (Math.abs(ry - (pmY - 1)) > PM_Y_BAND_TOL) continue;
            suppress(r, "dash");
            totalDashes++;
          }

          // End-caps: same Y band (wider tolerance — taller element), right of label
          for (const r of endCapCandidates) {
            const rx = parseFloat(r.getAttribute("x") ?? "NaN");
            const ry = parseFloat(r.getAttribute("y") ?? "NaN");
            if (!Number.isFinite(rx) || !Number.isFinite(ry)) continue;
            if (rx < pmX + PM_MIN_X_AFTER_LABEL) continue;
            // End-cap y is pmY - ~4 (top of 9px cap whose center ≈ pmY)
            if (Math.abs(ry - (pmY - 5)) > PM_Y_BAND_TOL + 8) continue;
            suppress(r, "endcap");
            totalCaps++;
          }
        }
      }

      console.log("[P4-PM] runGp8PmSuppression:", {
        rows: svgRows.length,
        labels: totalLabels,
        dashes: totalDashes,
        caps: totalCaps,
      });
      resolve();
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}

/**
 * Validation probe — paste in console after deploy:
 *
 * (() => {
 *   const labels = document.querySelectorAll('[data-maestro-pm-suppressed="label"]').length;
 *   const dashes = document.querySelectorAll('[data-maestro-pm-suppressed="dash"]').length;
 *   const caps   = document.querySelectorAll('[data-maestro-pm-suppressed="endcap"]').length;
 *   console.log("[P4-PM] suppressed", { labels, dashes, caps });
 * })();
 *
 * Expected: labels > 0, dashes > 0, caps > 0
 * Then visually confirm: PM rails gone from SVG, tempo cluster drops to Lane 2.
 */
