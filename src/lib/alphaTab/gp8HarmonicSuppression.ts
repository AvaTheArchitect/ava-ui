"use client";

/**
 * gp8HarmonicSuppression.ts — Harmonic Phase 1 (suppression only)
 * Date: April 23, 2026 — v1.0
 *
 * Suppresses native AlphaTab harmonic SMuFL glyphs so the overlay
 * can re-render them as labelled technique chips ("P.H." / "N.H.")
 * in Global Lane 4, consistent with Songsterr's engraving.
 *
 * Confirmed codepoints (from DOM probe, Ozzy / Warrant gp8 files):
 *   e4e3 — natural/artificial harmonic indicator (open diamond style)
 *   e4e4 — pinch harmonic indicator (filled diamond)
 *   e4e6 — harmonic variant (tapped / other; confirm with more songs)
 *
 * Label mapping (pragmatic, reversible):
 *   e4e4 → "P.H."   (pinch harmonic — confirmed in Ozzy dump)
 *   e4e3 → "H."     (natural — defer to Daniel for exact semantic)
 *   e4e6 → "H."     (variant — defer to Daniel)
 *   unknown cp → render original alphaTab glyph (safe fallback)
 *
 * Native-hidden guard (same rule as vibrato v1.1):
 *   Some harmonic glyph groups are already display:"none" in AlphaTab's SVG.
 *   These are stamped native-hidden="1" BEFORE we hide anything, so the overlay
 *   can filter them out (prevents ghost chips like the vibrato teleport case).
 *
 * Applies to ALL GP file types (gp4/5/7/8).
 *
 * Pipeline position (AlphaTabRenderer renderFinished, before curtain drop):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8VibratoSuppression(h)
 *   await runGp8HarmonicSuppression(h)      ← this file (all GP types)
 *   const harmonicHandle = await runGp8HarmonicOverlay(h)
 *   if (isGP8) { ... GP8-only passes ... }
 *   window.dispatchEvent(new Event('maestro:overlays-ready'))
 *   curtain drop
 *
 * Validation probes:
 *   document.querySelectorAll('[data-maestro-harm-suppressed="1"]').length  // > 0
 *   document.querySelector('[data-maestro-harm-suppressed="1"]').style.display  // "none"
 */

import { isStaffSvg } from "@/lib/alphaTab/universalLayoutPatches";

// ── SMuFL codepoints (harmonic indicators) ────────────────────────────────────
const HARMONIC_CODEPOINTS = new Set(["e4e3", "e4e4", "e4e6"]);

// ── Label mapping ─────────────────────────────────────────────────────────────
export const HARMONIC_CP_LABEL: Record<string, string> = {
  e4e4: "P.H.",
  e4e3: "H.",
  e4e6: "H.",
};

// ── Predicate ─────────────────────────────────────────────────────────────────

function isHarmonicGlyph(el: SVGTextElement): boolean {
  const txt = (el.textContent ?? "").trim();
  if (!txt) return false;
  const cp = txt.codePointAt(0)?.toString(16).toLowerCase();
  return !!cp && HARMONIC_CODEPOINTS.has(cp);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function runGp8HarmonicSuppression(
  containerEl: HTMLElement,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgRows = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );

      let suppressed = 0;
      let nativeHiddenSkipped = 0;
      const sample: Array<{
        cp: string;
        label: string;
        transform: string | null;
        nativeHidden: string;
        ancestorHidden: string;
      }> = [];

      for (const svg of svgRows) {
        if (!isStaffSvg(svg)) continue;

        svg.querySelectorAll<SVGTextElement>("text").forEach((el) => {
          if (!isHarmonicGlyph(el)) return;

          const parentG = el.closest<SVGGElement>("g");
          if (!parentG) return;
          if (parentG.getAttribute("data-maestro-harm-suppressed") === "1")
            return;

          const cp =
            (el.textContent ?? "")
              .trim()
              .codePointAt(0)
              ?.toString(16)
              .toLowerCase() ?? "";

          // 🔑 Stamp native visibility BEFORE hiding (three-condition — vibrato v1.1 lesson).
          // <text> child display is NOT reliable; check the <g> and its ancestors.
          const nativeHidden =
            (parentG.getAttribute("display") ?? "").trim().toLowerCase() ===
              "none" ||
            getComputedStyle(parentG).display === "none" ||
            !!parentG.closest('[display="none"]');

          parentG.dataset.maestroHarmNativeHidden = nativeHidden ? "1" : "0";
          parentG.dataset.maestroHarmNativeDisplay =
            parentG.getAttribute("display") ?? "";
          parentG.dataset.maestroHarmAncestorHidden = parentG.closest(
            '[display="none"]',
          )
            ? "1"
            : "0";
          parentG.dataset.maestroHarmCp = cp;

          if (nativeHidden) nativeHiddenSkipped++;

          parentG.setAttribute("display", "none");
          parentG.setAttribute("data-maestro-harm-suppressed", "1");
          suppressed++;

          if (sample.length < 8) {
            sample.push({
              cp,
              label: HARMONIC_CP_LABEL[cp] ?? "H.",
              transform: parentG.getAttribute("transform"),
              nativeHidden: nativeHidden ? "1" : "0",
              ancestorHidden: parentG.dataset.maestroHarmAncestorHidden,
            });
          }
        });
      }

      console.log("[P4-HARM] runGp8HarmonicSuppression:", {
        rows: svgRows.length,
        suppressed,
        nativeHiddenSkipped,
        sample,
      });

      resolve();
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
