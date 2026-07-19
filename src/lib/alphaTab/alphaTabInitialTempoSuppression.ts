"use client";

/**
 * alphaTabInitialTempoSuppression.ts
 * MAESTRO-LANDSCAPE-FIT-001-B1-B
 *
 * Hides the initial/pre-system tempo glyph ("♩ = 139" or equivalent) that
 * AlphaTab renders above the first system. Format-agnostic — operates only
 * on the rendered SVG and api.score.tempo, not on any Guitar Pro version-
 * specific structure. Intentionally NOT part of gp8OverlaySuppression.ts:
 * that pipeline is GP8-gated and targets a different element class (italic
 * Georgia comment/FX text); this glyph uses the engraving font and would
 * never match that predicate anyway.
 *
 * Caller is responsible for landscape/horizontal-only gating — this helper
 * has no orientation awareness of its own, matching the convention already
 * used by the sibling gp8* suppression helpers (they don't know they're
 * GP8-only either; the call site decides).
 *
 * Classifier identity (see MAESTRO-LANDSCAPE-FIT-001-B1-CB-SWEEP):
 *   - primary key: leftmost SVG-space x among tempo-glyph-pattern <text>
 *     nodes, via getBBox() (scroll-position independent).
 *   - at most one suppression per render.
 *   - deliberately does NOT gate on y-position relative to the staff
 *     system. FIT-001-B1-PROTO proved that gate stops matching once
 *     firstSystemPaddingTop drops below ~20 — exactly the range B1-B
 *     operates in — because the glyph's own y is fixed while the
 *     system's y shrinks with padding, so a y-based gate silently stops
 *     suppressing right when suppression matters most.
 *   - api.score.tempo is read as a sanity assertion only, never as the
 *     selector: a future score with a mid-song tempo change back to the
 *     same BPM would make value-matching ambiguous as an *identity*, even
 *     though it's a fine post-hoc check that the right glyph was picked.
 */

const TEMPO_GLYPH_PATTERN = /=\s*\d/;
const SANITY_LOG_PREFIX = "[alphaTabInitialTempoSuppression]";

export function runAlphaTabInitialTempoSuppression(
  containerEl: HTMLElement,
  api: any,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      const svgRows = Array.from(
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
      );

      const candidates: Array<{ el: SVGTextElement; x: number }> = [];
      for (const svg of svgRows) {
        for (const el of Array.from(
          svg.querySelectorAll<SVGTextElement>("text"),
        )) {
          if (!TEMPO_GLYPH_PATTERN.test(el.textContent ?? "")) continue;
          let bbox: SVGRect;
          try {
            bbox = el.getBBox();
          } catch {
            continue;
          }
          candidates.push({ el, x: bbox.x });
        }
      }

      let leftmostText: string | null = null;
      if (candidates.length) {
        candidates.sort((a, b) => a.x - b.x);
        const leftmost = candidates[0];
        leftmost.el.setAttribute("display", "none");
        leftmost.el.setAttribute(
          "data-maestro-initial-tempo-suppressed",
          "1",
        );
        leftmostText = leftmost.el.textContent ?? null;
      }

      // Sanity-only — see file header. Never used to pick the candidate.
      const expectedTempo = api?.score?.tempo;
      if (
        leftmostText != null &&
        expectedTempo != null &&
        !leftmostText.includes(String(Math.round(expectedTempo)))
      ) {
        console.warn(
          `${SANITY_LOG_PREFIX} sanity mismatch — leftmost tempo glyph does not contain the expected score tempo`,
          { leftmostText, expectedTempo },
        );
      }

      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
