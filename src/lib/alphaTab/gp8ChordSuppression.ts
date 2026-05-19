"use client";

/**
 * gp8ChordSuppression.ts — Chord Phase 1 (suppression only)
 * Date: April 22, 2026 — v1.0
 *
 * Suppresses AlphaTab-native chord name text nodes so they no longer
 * affect layout. Phase 2 will re-render them as overlay chips in the
 * header band above the staff.
 *
 * Target signature (confirmed from DOM probe):
 *   <text text-anchor="middle"
 *         style="stroke: none; font:italic 12px Georgia, serif; dominant-baseline: hanging">
 *     Am
 *   </text>
 *
 * Detected characteristics:
 *   - style contains: italic + Georgia
 *   - text-anchor="middle"
 *   - chord token text: Am, G5, Em7, Bsus4/E, Bsus4, F#m, N.C., etc.
 *
 * Safety rules:
 *   - Only touches staff SVG rows (isStaffSvg)
 *   - Only touches <text>/<tspan> (never <g>, <path>, <rect>)
 *   - Idempotent via data-maestro-chord-suppressed="1"
 *   - Never touches maestro-owned nodes
 *
 * Validation probe (paste in console after deploy):
 *   document.querySelectorAll('[data-maestro-chord-suppressed="1"]').length  // > 0
 *   document.querySelectorAll('[data-maestro-lane-type="fx"]').length        // unchanged
 *   document.querySelectorAll('[data-maestro-lane-type="pm"]').length        // unchanged
 *
 * Pipeline position (AlphaTabRenderer renderFinished, GP8 only):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)
 *   await runGp8OverlaySuppression(h)
 *   await runGp8PmSuppression(h)
 *   await runGp8ChordSuppression(h)      ← this file
 *   const fxHandle = await runGp8OverlayLanes(h)
 *   const pmHandle = await runGp8PmOverlay(h)
 *   curtain drop
 */

import { isStaffSvg } from "@/lib/alphaTab/universalLayoutPatches";

// ── Chord token pattern ────────────────────────────────────────────────────────
// Root (A–G) + optional accidental + optional quality/extensions + optional slash bass.
// Covers: Am, G5, Em7, Bsus4/E, F#m7b5, Bbmaj7, C#m, Ddim, Eaug, G7sus4, etc.
const CHORD_PAT =
  /^[A-G](?:#|b)?(?:(?:maj|min|m|dim|aug|sus|add|ø|o)?\d*)*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?$/;

// Allow-list for common tokens that don't match the strict regex
const CHORD_ALLOW = new Set(["N.C.", "NC"]);

// ── Predicate ─────────────────────────────────────────────────────────────────

function isChordTextNode(el: SVGElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "text" && tag !== "tspan") return false;
  if (el.getAttribute("data-maestro-chord-suppressed") === "1") return false;
  if (el.hasAttribute("data-maestro")) return false; // never touch maestro-owned nodes

  const txt = (el.textContent ?? "").trim();
  if (!txt) return false;

  if (!CHORD_ALLOW.has(txt) && !CHORD_PAT.test(txt)) return false;

  const style = (el.getAttribute("style") ?? "").toLowerCase();
  if (!style.includes("italic") || !style.includes("georgia")) return false;

  // text-anchor="middle" is the reliable safety lock from the probe
  const anchor = (el.getAttribute("text-anchor") ?? "").toLowerCase();
  if (anchor !== "middle") return false;

  return true;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * runGp8ChordSuppression — hides native chord name text nodes before curtain drop.
 * Caller must await. Wrapped in withPatchTimeout() at call site like other passes.
 */
export function runGp8ChordSuppression(
  containerEl: HTMLElement,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgs = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );
      let suppressed = 0;
      const sample: Array<{ txt: string; y: string | null }> = [];

      for (const svg of svgs) {
        if (!isStaffSvg(svg)) continue;

        svg.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
          if (!isChordTextNode(el)) return;
          el.setAttribute("display", "none");
          el.setAttribute("data-maestro-chord-suppressed", "1");
          suppressed++;
          if (sample.length < 12) {
            sample.push({
              txt: (el.textContent ?? "").trim().slice(0, 40),
              y: el.getAttribute("y"),
            });
          }
        });
      }

      console.log("[P4-CHORD] gp8ChordSuppression:", { suppressed, sample });
      resolve();
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
