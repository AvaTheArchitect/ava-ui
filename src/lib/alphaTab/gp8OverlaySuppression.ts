"use client";

/**
 * gp8OverlaySuppression.ts
 * Date: April 21st, 2026 — v1.1
 *
 * P4 Lane Phase 1 (Suppression-only):
 * Hides layout-toxic FX/comment text nodes that AlphaTab places in the layout
 * flow (italic Georgia tech text above staff). These inflate bar widths and
 * cause the "FX text garble" visible in landscape strip mode.
 *
 * v1.1: Exclude technique tokens (LetRing, dive bomb) from suppression —
 * they are note-adjacent effects, not comment-lane content. They get their
 * own lane in P4 Phase 4+. Suppressing them into the FX lane caused
 * bar-number overlap on rows with tight headroom.
 *
 * Rules:
 *   - Only hides <text>/<tspan> nodes — never <g> (glyph clusters stay safe)
 *   - Idempotent via data-maestro-suppressed="1"
 *   - Returns Promise<void> resolving after 2× rAF + mutations complete
 *   - TECH_TEXT_PAT / KEEP_TECH_TEXT_PAT kept in sync with gp8LayoutEngineV2.ts
 *
 * Pipeline position (AlphaTabRenderer renderFinished):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)       ← GP8 only
 *   await runGp8OverlaySuppression(h)   ← GP8 only, this file
 *   curtain drop
 */

import {
  isBarNumber,
  isHeaderBoldGeorgia,
  isStaffSvg,
  getRowAnchors,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Detection patterns (keep in sync with gp8LayoutEngineV2.ts) ──────────────

const TECH_TEXT_PAT =
  /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;

const KEEP_TECH_TEXT_PAT =
  /^(finger slide|pick slide|turn volume knob to \d+|three whammy dips?)$/i;

// 🔒 v1.1: Technique tokens excluded from FX overlay lane.
// These are note-adjacent effects (not comment-lane content).
// They will get their own lane in P4 Phase 4+.
const TECHNIQUE_TOKEN_PAT = /^(let\s*ring|letring|dive\s*bomb)$/i;

const TRACK_LABELS = /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i;

// ── Predicate ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this element is layout-toxic tech text that should be hidden.
 * "Layout-toxic" = italic Georgia, above staff, matches TECH_TEXT_PAT.
 * Never suppresses: bar numbers, bold section/header labels, maestro-owned nodes,
 * track labels, keep-listed items, technique tokens, or nodes already suppressed.
 */
function isLayoutToxicTechText(el: SVGElement, staffTopY: number): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "text" && tag !== "tspan") return false;
  if (isBarNumber(el)) return false;
  if (isHeaderBoldGeorgia(el)) return false;
  if (el.hasAttribute("data-maestro")) return false;
  if (el.getAttribute("data-maestro-suppressed") === "1") return false;

  const style = (el.getAttribute("style") ?? "").toLowerCase();
  // Tech text is italic Georgia, non-bold
  if (
    !style.includes("italic") ||
    !style.includes("georgia") ||
    style.includes("bold")
  )
    return false;

  const txt = (el.textContent ?? "").trim();
  if (!txt) return false;
  if (TRACK_LABELS.test(txt)) return false;
  if (TECHNIQUE_TOKEN_PAT.test(txt)) return false; // 🔒 v1.1: skip technique tokens
  if (!TECH_TEXT_PAT.test(txt)) return false;
  if (KEEP_TECH_TEXT_PAT.test(txt)) return false;

  // Only suppress above-staff nodes — don't touch anything inside the staff zone
  const y = parseFloat(el.getAttribute("y") ?? "NaN");
  if (!Number.isFinite(y) || y >= staffTopY - 1) return false;

  return true;
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * runGp8OverlaySuppression — hides layout-toxic tech/FX text before curtain drop.
 * Caller must await. Wrapped in withPatchTimeout() at call site like other passes.
 */
export function runGp8OverlaySuppression(
  containerEl: HTMLElement,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgRows = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );
      let suppressed = 0;
      const sample: Array<{ txt: string; y: string | null }> = [];

      svgRows.forEach((svg) => {
        if (!isStaffSvg(svg)) return;
        const { staffTopY } = getRowAnchors(svg);

        svg.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
          if (!isLayoutToxicTechText(el, staffTopY)) return;
          el.setAttribute("display", "none");
          el.setAttribute("data-maestro-suppressed", "1");
          suppressed++;
          if (sample.length < 12) {
            sample.push({
              txt: (el.textContent ?? "").trim().slice(0, 60),
              y: el.getAttribute("y"),
            });
          }
        });
      });

      if (suppressed) {
        console.log("[P4] gp8OverlaySuppression:", {
          rows: svgRows.length,
          suppressed,
          sample,
        });
      } else {
        console.log("[P4] gp8OverlaySuppression: nothing suppressed");
      }
      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
