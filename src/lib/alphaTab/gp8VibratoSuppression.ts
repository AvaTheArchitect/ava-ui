"use client";

/**
 * gp8VibratoSuppression.ts — Vibrato Phase 1 (suppression only)
 * Date: April 23, 2026 — v1.1
 *
 * v1.1 CHANGES (native-hidden stamp — teleport prevention):
 * ✅ Stamps data-maestro-vibrato-native-hidden BEFORE applying display:none.
 *    Three-condition check: g attr + computed + ancestor (probe confirmed all three
 *    fire on ghost vibrato: gAttr="none", gCS.display="none", ancestorDispNone=true).
 *    gp8VibratoOverlay filters native-hidden="1" entries — no ghost chips rendered.
 * ✅ Stamps data-maestro-vibrato-ancestor-hidden for diagnostics.
 * ⚠️  Checking <text> display is NOT sufficient — AlphaTab hides the <g> / ancestor,
 *    not the <text> child (tCS.display="block" even on ghost vibratos).
 *
 * v1.0 LOCKED (unchanged):
 * ✅ SMuFL codepoints eab2/eab3 confirmed in GP5 + GP8 files.
 * ✅ Suppresses parent <g> (not <text>) — position lives in g.transform.
 * ✅ Idempotency via data-maestro-vibrato-suppressed="1".
 * ✅ Applies to ALL GP file types unconditionally.
 */

import { isStaffSvg } from "@/lib/alphaTab/universalLayoutPatches";

// ── SMuFL codepoints (guitar vibrato strokes) ─────────────────────────────────
// eab2: guitarVibratoStrokeDown (SMuFL range EAB0–EABF)
// eab3: guitarVibratoStrokeUp
// Both confirmed present in GP5 + GP8 files via DOM probe.
const VIBRATO_CODEPOINTS = new Set(["eab2", "eab3"]);

// ── Predicate ─────────────────────────────────────────────────────────────────

function isVibratoGlyph(el: SVGTextElement): boolean {
  if (el.getAttribute("data-maestro-vibrato-suppressed")) return false;

  const txt = (el.textContent ?? "").trim();
  if (!txt) return false;

  const cp = txt.codePointAt(0)?.toString(16).toLowerCase();
  return !!cp && VIBRATO_CODEPOINTS.has(cp);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function runGp8VibratoSuppression(
  containerEl: HTMLElement,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgRows = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );

      let suppressed = 0;
      let nativeHiddenSkipped = 0;
      const sample: Array<{ cp: string; transform: string | null; nativeHidden: string; ancestorHidden: string }> = [];

      for (const svg of svgRows) {
        if (!isStaffSvg(svg)) continue;

        svg.querySelectorAll<SVGTextElement>("text").forEach((el) => {
          if (!isVibratoGlyph(el)) return;

          const parentG = el.closest<SVGGElement>("g");
          if (!parentG) return;
          if (parentG.getAttribute("data-maestro-vibrato-suppressed") === "1") return;

          // 🔑 Stamp native visibility BEFORE hiding — three-condition check (v1.1).
          // Probe on ghost vibrato: gAttr="none", gCS.display="none", ancestor hidden.
          // <text> child is NOT reliable: tCS.display="block" even on native-hidden glyphs.
          const nativeHidden =
            (parentG.getAttribute("display") ?? "").trim().toLowerCase() === "none" ||
            getComputedStyle(parentG).display === "none" ||
            !!parentG.closest('[display="none"]');

          parentG.dataset.maestroVibratoNativeHidden  = nativeHidden ? "1" : "0";
          parentG.dataset.maestroVibratoNativeDisplay = parentG.getAttribute("display") ?? "";
          parentG.dataset.maestroVibratoAncestorHidden =
            parentG.closest('[display="none"]') ? "1" : "0";

          if (nativeHidden) nativeHiddenSkipped++;

          parentG.setAttribute("display", "none");
          parentG.setAttribute("data-maestro-vibrato-suppressed", "1");
          suppressed++;

          if (sample.length < 8) {
            const cp = (el.textContent ?? "").trim().codePointAt(0)?.toString(16) ?? "";
            sample.push({ cp, transform: parentG.getAttribute("transform"), nativeHidden: parentG.dataset.maestroVibratoNativeHidden ?? "", ancestorHidden: parentG.dataset.maestroVibratoAncestorHidden ?? "" });
          }
        });
      }

      console.log("[P4-VIBRATO] runGp8VibratoSuppression:", {
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