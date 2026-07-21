"use client";

/**
 * alphaTabInitialTempoSuppression.ts
 * MAESTRO-LANDSCAPE-FIT-001-B1-B + MAESTRO-LANDSCAPE-FIT-001-B1-C
 * + MAESTRO-TEMPO-SUPPRESS-002-B + MAESTRO-TEMPO-GLYPH-SUPPRESS-001-B
 *
 * MAESTRO-TEMPO-GLYPH-SUPPRESS-001-B — Duplicate glyph twins + equivalence
 * clusters. GLYPH-SUPPRESS-001-A audited why Poison/Cinderella/Extreme still
 * showed a visible glyph residue after 002-B fixed the numeric-text
 * duplicate, and why Pride and Joy's swing/feel marking survived entirely.
 * ✅ Coincident duplicate glyph suppression: the paired-glyph classifier's
 *        "one glyph suppressed" rule left an untouched, position-matched
 *        twin visible on Poison/Cinderella/Extreme — same shape of bug
 *        002-B fixed for numeric text, same DUPLICATE_POSITION_EPSILON
 *        reused. Position-matched twins of the already-selected glyph only.
 * ✅ Compound note-equivalence cluster detector: some songs (Pride and Joy)
 *        render the initial tempo as "(<glyph> = <glyph>)" using italic
 *        Georgia punctuation fragments for the parens/equals — no fragment
 *        contains a digit, so the numeric classifier never anchors here and
 *        the paired-glyph search (which only runs relative to an
 *        already-suppressed numeric text) never engages with it. New,
 *        independent row[0]-only detector: requires a complete left-to-right
 *        "(" → "=" → ")" triplet, compact (span/y-delta bounded), before
 *        suppressing the three punctuation fragments plus any glyph-pattern
 *        note icons whose x falls within the paren span. Does not touch
 *        isolated "(" / ")" characters embedded in longer strings (e.g.
 *        "R.I.P. ... (1954-1990)") — the exact-trim match requires the
 *        fragment be its own whole text node.
 * ✅ Both extensions stay row[0]-only (inherited from 002-B), protecting
 *        Van Halen's row[12] and Ozzy's rows 8/9/9/10/10/12 legitimate
 *        mid-song tempo marks by construction — they're never in the pool.
 * 🚫 No global italic-Georgia sweep — P.H./P.M./LetRing/R.I.P./N.B./pick-
 *        slide/s.guit. and other gp8Overlay/annotation text is untouched;
 *        that's gp8OverlaySuppression.ts's territory, not this file's. No
 *        AlphaTabRenderer.tsx change.
 *
 * MAESTRO-TEMPO-SUPPRESS-002-B — Row[0] scoping + coincident duplicate fix.
 * TEMPO-SUPPRESS-002-A audited why Poison/Cinderella/Extreme showed visible
 * tempo residue after suppression while Van Halen suppressed cleanly, and why
 * Ozzy suppressed the wrong element entirely.
 * ✅ Candidate pool restricted to svg.at-surface-svg row[0] only. bbox.x is
 *        local to each row's own coordinate space — pooling candidates
 *        across rows before sorting by x compared incommensurable values
 *        (Ozzy: a row[9] candidate's local x read smaller than row[0]'s
 *        real initial mark, so the wrong row got suppressed). The initial
 *        tempo mark is by definition at the start of the score.
 * ✅ Coincident-duplicate suppression: after selecting and suppressing the
 *        leftmost row[0] candidate, any other row[0] tempo-pattern text at
 *        the same x/y SVG attributes (within a small epsilon) is suppressed
 *        too — Poison/Cinderella/Extreme each render the initial tempo mark
 *        as two separate DOM text nodes at identical attribute positions;
 *        one logical mark, two nodes. Position-matched only — not a sweep
 *        of every row[0] candidate.
 * ✅ Van Halen's row[12]-style legitimate mid-song tempo marks remain
 *        protected by construction: row[0]-only scoping removes them from
 *        the pool entirely, and they don't share the suppressed mark's x/y
 *        attributes regardless.
 * 🚫 No change to the paired glyph classifier's own logic (still runs only
 *        after a text candidate is suppressed, same SVG, attribute-space
 *        positions), no broad glyph sweep, no AlphaTabRenderer.tsx change —
 *        B1 strip recovery is unrelated to this classifier.
 *
 * Hides the initial/pre-system tempo mark that AlphaTab renders above the
 * first system, as a pair: the numeric text ("= 139" or equivalent) and its
 * paired native quarter-note glyph. Format-agnostic — operates only on the
 * rendered SVG and api.score.tempo, not on any Guitar Pro version-specific
 * structure. Intentionally NOT part of gp8OverlaySuppression.ts: that
 * pipeline is GP8-gated and targets a different element class (italic
 * Georgia comment/FX text); this mark uses the engraving font and would
 * never match that predicate anyway.
 *
 * TempoClusterManager (src/lib/alphaTab/TempoClusterManager.ts) is
 * intentionally not involved here — per MAESTRO-TEMPO-CLUSTER-LANDSCAPE-A,
 * it is currently dormant (gp8LayoutEngineV2's MODE is "diagnose", zero DOM
 * writes) and produces none of the elements this file suppresses. The
 * quarter-note glyph this file hides is native AlphaTab output, not a
 * TempoClusterManager artifact.
 *
 * Caller is responsible for landscape/horizontal-only gating — this helper
 * has no orientation awareness of its own, matching the convention already
 * used by the sibling gp8* suppression helpers (they don't know they're
 * GP8-only either; the call site decides).
 *
 * Text classifier identity (see MAESTRO-LANDSCAPE-FIT-001-B1-CB-SWEEP,
 * unchanged by B1-C):
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
 *
 * Paired glyph classifier identity (new in B1-C):
 *   - runs only after a tempo text candidate was actually suppressed —
 *     no independent glyph sweep.
 *   - candidate must have no real printable textContent (empty, or a
 *     single non-printable/PUA codepoint — observed U+ECA5 live, the
 *     same default glyph character TempoClusterManager.ts itself uses),
 *     an inline style containing "font-size: 70%", and sit inside a
 *     native `g.at` group — this is deliberately narrow so it cannot
 *     catch unrelated musical symbols (ornaments, dynamics, etc.
 *     elsewhere in the row) that happen to share one of those traits
 *     individually. The "no real printable text" test mirrors the one
 *     already established by gp8OverlaySuppression.ts and
 *     TempoClusterManager.ts (`!tt || /^[\x20-\x7E]+$/.test(tt)`),
 *     reused rather than reinvented.
 *   - positions for the pairing distance are read from SVG attributes,
 *     not getBoundingClientRect()/getBBox() — an empty/icon-only glyph's
 *     bbox can be unreliable (observed h≈102px for a single glyph in
 *     TEMPO-CLUSTER-LANDSCAPE-A's audit). The glyph `<text>` itself
 *     usually carries no `x`/`y` of its own; live inspection found the
 *     position instead lives on its ancestor `<g>`'s
 *     `transform="translate(x y)"` — the same attribute
 *     TempoClusterManager.ts already parses for this exact purpose —
 *     so that's read as a fallback when the text node has none.
 *   - candidate must be within 100px to the left of the suppressed
 *     tempo text's own x attribute; nearest candidate wins; at most one
 *     glyph suppressed per render.
 *   - if no candidate satisfies every constraint, none is suppressed —
 *     no fallback, no broadening.
 */

const TEMPO_GLYPH_PATTERN = /=\s*\d/;
const SANITY_LOG_PREFIX = "[alphaTabInitialTempoSuppression]";
const GLYPH_FONT_SIZE_PATTERN = /font-size:\s*70%/;
const GLYPH_MAX_LEFT_DISTANCE = 100;
// [MAESTRO-TEMPO-SUPPRESS-002-B] Attribute-space epsilon for recognizing a
// coincident duplicate of the just-suppressed initial tempo text — see file
// header. Audit measurements found exact attribute matches (e.g.
// 118.30640000000001 on both nodes); this tolerance is generous headroom,
// not a re-tuned magic number. Reused by GLYPH-SUPPRESS-001-B for the
// analogous coincident-duplicate-glyph case.
const DUPLICATE_POSITION_EPSILON = 0.5;
// [MAESTRO-TEMPO-GLYPH-SUPPRESS-001-B] Compound note-equivalence cluster
// (e.g. Pride and Joy's "(<glyph> = <glyph>)" swing/feel marking) — see file
// header. Audit measured the punctuation span at ~80px (115.9 to 196.3);
// this is generous headroom, not a re-tuned magic number.
const ITALIC_GEORGIA_PATTERN = /font:\s*italic\s*12px\s*Georgia/i;
const EQUIVALENCE_CLUSTER_MAX_SPAN = 250;
const EQUIVALENCE_CLUSTER_MAX_Y_DELTA = 12;

export interface AlphaTabInitialTempoSuppressionDiagnostics {
  tempoTextCandidateCount: number;
  tempoTextSuppressedCount: number;
  suppressedTempoText: string | null;
  duplicateTempoTextSuppressedCount: number;
  tempoGlyphCandidateCount: number;
  tempoGlyphSuppressedCount: number;
  suppressedGlyphAnchor: { x: number; y: number } | null;
  duplicateTempoGlyphSuppressedCount: number;
  equivalenceTempoClusterSuppressedCount: number;
}

let lastDiagnostics: AlphaTabInitialTempoSuppressionDiagnostics | null = null;

/** Introspection only — does not affect the suppression pass itself. */
export function getLastAlphaTabInitialTempoSuppressionDiagnostics(): AlphaTabInitialTempoSuppressionDiagnostics | null {
  return lastDiagnostics;
}

export function runAlphaTabInitialTempoSuppression(
  containerEl: HTMLElement,
  api: any,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run = () => {
      // [MAESTRO-TEMPO-SUPPRESS-002-B] Row[0] only — see file header. bbox.x
      // is local to each svg.at-surface-svg row's own coordinate space, so
      // pooling candidates across rows before sorting by x compared
      // incommensurable values (TEMPO-SUPPRESS-002-A's Ozzy finding: a row[9]
      // candidate's local x could read smaller than row[0]'s real initial
      // mark, causing the wrong row to be suppressed). The initial tempo
      // mark is by definition at the start of the score.
      const row0 = containerEl.querySelector<SVGSVGElement>(
        "svg.at-surface-svg",
      );
      const svgRows = row0 ? [row0] : [];

      // ── Text classifier (unchanged selection logic from B1-B, row[0]-scoped) ──
      const textCandidates: Array<{ el: SVGTextElement; x: number; svg: SVGSVGElement }> = [];
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
          textCandidates.push({ el, x: bbox.x, svg });
        }
      }

      let leftmostText: string | null = null;
      let suppressedTextEl: SVGTextElement | null = null;
      let suppressedTextSvg: SVGSVGElement | null = null;
      let duplicateTempoTextSuppressedCount = 0;
      if (textCandidates.length) {
        textCandidates.sort((a, b) => a.x - b.x);
        const leftmost = textCandidates[0];
        leftmost.el.setAttribute("display", "none");
        leftmost.el.setAttribute(
          "data-maestro-initial-tempo-suppressed",
          "1",
        );
        leftmostText = leftmost.el.textContent ?? null;
        suppressedTextEl = leftmost.el;
        suppressedTextSvg = leftmost.svg;

        // [MAESTRO-TEMPO-SUPPRESS-002-B] Coincident duplicate suppression —
        // see file header. TEMPO-SUPPRESS-002-A found Poison/Cinderella/
        // Extreme each render the initial tempo mark as two separate <text>
        // DOM nodes at identical x/y attributes (one logical mark, two
        // nodes) — the "at most one suppression" rule then left an
        // untouched, visible twin. This suppresses position-matched twins of
        // the already-selected mark only — not a broader sweep, and not a
        // second independent candidate selection.
        const leftmostX = parseFloat(leftmost.el.getAttribute("x") ?? "NaN");
        const leftmostY = parseFloat(leftmost.el.getAttribute("y") ?? "NaN");
        if (Number.isFinite(leftmostX) && Number.isFinite(leftmostY)) {
          for (const candidate of textCandidates) {
            if (candidate.el === leftmost.el) continue;
            const cx = parseFloat(candidate.el.getAttribute("x") ?? "NaN");
            const cy = parseFloat(candidate.el.getAttribute("y") ?? "NaN");
            if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
            if (
              Math.abs(cx - leftmostX) > DUPLICATE_POSITION_EPSILON ||
              Math.abs(cy - leftmostY) > DUPLICATE_POSITION_EPSILON
            ) {
              continue;
            }
            candidate.el.setAttribute("display", "none");
            candidate.el.setAttribute(
              "data-maestro-initial-tempo-suppressed",
              "1",
            );
            duplicateTempoTextSuppressedCount += 1;
          }
        }
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

      // ── Paired glyph classifier (new in B1-C) ───────────────────────────
      // Only runs after a text candidate was actually suppressed, in the
      // same SVG, using attribute-space (not bbox) positions throughout.
      let glyphCandidateCount = 0;
      let glyphSuppressedCount = 0;
      let suppressedGlyphAnchor: { x: number; y: number } | null = null;
      let duplicateTempoGlyphSuppressedCount = 0;

      if (suppressedTextEl && suppressedTextSvg) {
        const tempoTextX = parseFloat(
          suppressedTextEl.getAttribute("x") ?? "NaN",
        );
        if (Number.isFinite(tempoTextX)) {
          const glyphCandidates: Array<{
            el: SVGTextElement;
            x: number;
            y: number;
            dx: number;
          }> = [];
          for (const el of Array.from(
            suppressedTextSvg.querySelectorAll<SVGTextElement>("text"),
          )) {
            if (el === suppressedTextEl) continue;
            const txt = el.textContent ?? "";
            // Native glyph icons render via a single non-printable/PUA codepoint
            // (observed: U+ECA5, the same default TempoClusterManager.ts uses),
            // not literal whitespace — same "no real printable text" test already
            // established by gp8OverlaySuppression.ts / TempoClusterManager.ts.
            if (txt && /^[\x20-\x7E]+$/.test(txt)) continue;
            const style = el.getAttribute("style") ?? "";
            if (!GLYPH_FONT_SIZE_PATTERN.test(style)) continue;
            const parentG = el.closest("g.at");
            if (!parentG) continue; // native AlphaTab glyph group only
            // The glyph <text> itself often carries no x/y — position comes from
            // its ancestor <g>'s transform="translate(x y)", the same attribute
            // TempoClusterManager.ts already parses for this exact purpose.
            let gx = parseFloat(el.getAttribute("x") ?? "NaN");
            let gy = parseFloat(el.getAttribute("y") ?? "NaN");
            if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
              const transform = parentG.getAttribute("transform") ?? "";
              const m = transform.match(
                /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/,
              );
              if (!m) continue;
              gx = parseFloat(m[1]);
              gy = parseFloat(m[2]);
            }
            if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;
            const dx = tempoTextX - gx;
            if (dx < 0 || dx > GLYPH_MAX_LEFT_DISTANCE) continue; // must be left of text, within range
            glyphCandidates.push({ el, x: gx, y: gy, dx });
          }
          glyphCandidateCount = glyphCandidates.length;

          if (glyphCandidates.length) {
            glyphCandidates.sort((a, b) => a.dx - b.dx); // nearest first
            const nearest = glyphCandidates[0];
            nearest.el.setAttribute("display", "none");
            nearest.el.setAttribute(
              "data-maestro-initial-tempo-glyph-suppressed",
              "1",
            );
            glyphSuppressedCount = 1;
            suppressedGlyphAnchor = { x: nearest.x, y: nearest.y };

            // [MAESTRO-TEMPO-GLYPH-SUPPRESS-001-B] Coincident duplicate glyph
            // suppression — see file header. Poison/Cinderella/Extreme each
            // render the paired glyph as two coincident DOM nodes (one
            // logical glyph, two nodes); the "one glyph suppressed" rule
            // above left an untouched, visible twin. Suppresses
            // position-matched twins of the already-selected glyph only.
            for (const candidate of glyphCandidates) {
              if (candidate.el === nearest.el) continue;
              if (
                Math.abs(candidate.x - nearest.x) > DUPLICATE_POSITION_EPSILON ||
                Math.abs(candidate.y - nearest.y) > DUPLICATE_POSITION_EPSILON
              ) {
                continue;
              }
              candidate.el.setAttribute("display", "none");
              candidate.el.setAttribute(
                "data-maestro-initial-tempo-glyph-suppressed",
                "1",
              );
              duplicateTempoGlyphSuppressedCount += 1;
            }
          }
        }
      }

      // ── Compound note-equivalence cluster (new in GLYPH-SUPPRESS-001-B) ──
      // Row[0]-only — see file header. Some songs (e.g. Pride and Joy) render
      // the initial tempo as a swing/feel equivalence marking —
      // "(<glyph> = <glyph>)" — using italic Georgia punctuation fragments
      // for the parens/equals and separate glyph-pattern text nodes for the
      // note icons. No fragment contains a digit, so the numeric classifier
      // above never anchors here and the paired-glyph search (which only
      // runs relative to an already-suppressed numeric text) never engages
      // with this cluster. Detected and suppressed independently, still
      // row[0]-only, still leftmost-first (at most one cluster per render).
      let equivalenceTempoClusterSuppressedCount = 0;
      if (row0) {
        const openParens: Array<{ el: SVGTextElement; x: number; y: number }> = [];
        const equalsSigns: Array<{ el: SVGTextElement; x: number; y: number }> = [];
        const closeParens: Array<{ el: SVGTextElement; x: number; y: number }> = [];
        for (const el of Array.from(
          row0.querySelectorAll<SVGTextElement>("text"),
        )) {
          const style = el.getAttribute("style") ?? "";
          if (!ITALIC_GEORGIA_PATTERN.test(style)) continue;
          const trimmed = (el.textContent ?? "").trim();
          if (trimmed !== "(" && trimmed !== "=" && trimmed !== ")") continue;
          let bbox: SVGRect;
          try {
            bbox = el.getBBox();
          } catch {
            continue;
          }
          const entry = { el, x: bbox.x, y: bbox.y };
          if (trimmed === "(") openParens.push(entry);
          else if (trimmed === "=") equalsSigns.push(entry);
          else closeParens.push(entry);
        }

        if (openParens.length && equalsSigns.length && closeParens.length) {
          openParens.sort((a, b) => a.x - b.x);
          const openParen = openParens[0];
          const equalsCandidate = equalsSigns
            .filter((e) => e.x > openParen.x)
            .sort((a, b) => a.x - b.x)[0];
          const closeParen = equalsCandidate
            ? closeParens
                .filter((e) => e.x > equalsCandidate.x)
                .sort((a, b) => a.x - b.x)[0]
            : undefined;
          if (
            equalsCandidate &&
            closeParen &&
            closeParen.x - openParen.x <= EQUIVALENCE_CLUSTER_MAX_SPAN &&
            Math.abs(equalsCandidate.y - openParen.y) <= EQUIVALENCE_CLUSTER_MAX_Y_DELTA &&
            Math.abs(closeParen.y - openParen.y) <= EQUIVALENCE_CLUSTER_MAX_Y_DELTA
          ) {
            for (const frag of [openParen, equalsCandidate, closeParen]) {
              frag.el.setAttribute("display", "none");
              frag.el.setAttribute(
                "data-maestro-initial-tempo-equivalence-suppressed",
                "1",
              );
              equivalenceTempoClusterSuppressedCount += 1;
            }

            // Note-icon glyphs inside the parenthetical span.
            for (const el of Array.from(
              row0.querySelectorAll<SVGTextElement>("text"),
            )) {
              if (
                el === openParen.el ||
                el === equalsCandidate.el ||
                el === closeParen.el
              ) {
                continue;
              }
              const txt = el.textContent ?? "";
              if (txt && /^[\x20-\x7E]+$/.test(txt)) continue;
              const style = el.getAttribute("style") ?? "";
              if (!GLYPH_FONT_SIZE_PATTERN.test(style)) continue;
              const parentG = el.closest("g.at");
              if (!parentG) continue;
              let gx = parseFloat(el.getAttribute("x") ?? "NaN");
              if (!Number.isFinite(gx)) {
                const transform = parentG.getAttribute("transform") ?? "";
                const m = transform.match(/translate\(\s*(-?[\d.]+)/);
                if (!m) continue;
                gx = parseFloat(m[1]);
              }
              if (!Number.isFinite(gx)) continue;
              if (gx < openParen.x || gx > closeParen.x) continue;
              el.setAttribute("display", "none");
              el.setAttribute(
                "data-maestro-initial-tempo-equivalence-suppressed",
                "1",
              );
              equivalenceTempoClusterSuppressedCount += 1;
            }
          }
        }
      }

      lastDiagnostics = {
        tempoTextCandidateCount: textCandidates.length,
        tempoTextSuppressedCount: suppressedTextEl ? 1 : 0,
        suppressedTempoText: leftmostText,
        duplicateTempoTextSuppressedCount,
        tempoGlyphCandidateCount: glyphCandidateCount,
        tempoGlyphSuppressedCount: glyphSuppressedCount,
        suppressedGlyphAnchor,
        duplicateTempoGlyphSuppressedCount,
        equivalenceTempoClusterSuppressedCount,
      };

      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
