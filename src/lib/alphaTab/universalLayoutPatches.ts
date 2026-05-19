"use client";
/**
 * universalLayoutPatches.ts
 * Date: April 21st, 2026 — v1.0
 *
 * Format-agnostic SVG alignment/cleanup patches. Applied to ALL GP file types
 * (gp4, gp5, gp7, gp8) unconditionally in the AlphaTabRenderer post-render pipeline.
 *
 * Rules:
 *   - <g> elements are NEVER moved (composite ornaments are multi-primitive)
 *   - Bar numbers (fill #C80000 + 11px Arial + digits) are NEVER touched by layout passes
 *   - Only text elements are repositioned — no structure changes
 *   - LANE_Y_OFFSET constants were measured from GP8 SVG spy.
 *     Validate against gp5/gp7 before treating as universal geometry.
 *
 * Extracted from gp8LayoutEngineV2.ts v2.3.
 * gp8LayoutEngineV2.ts imports shared helpers from here.
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface RowAnchors {
  barNumberY: number;
  staffTopY: number;
  staffBottomY: number;
  svgHeight: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAFF_LINE_FILL = "#a5a5a5";

const HEADER_SECTION_GAP = 20; // barNumberY - 20 → section label lane
const HEADER_TEMPO_CONTEXT_GAP = 45; // barNumberY - 45 → above tempo cluster

export const RX_TEMPO_TEXT = /^\s*=\s*\d+\s*$/;
export const RX_TEMPO_CONTEXT = /^(half[\s-]?time|double[\s-]?time)$/i;
export const RX_SECTION_SKIP =
  /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Resolves SVG height: attr → viewBox → getBoundingClientRect (in that order). */
export function getSvgHeight(svg: SVGSVGElement): number {
  const attr = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(attr) && attr > 40) return attr;
  const vb = svg.viewBox?.baseVal?.height ?? 0;
  if (vb > 40) return vb;
  return svg.getBoundingClientRect().height;
}

export function isBarNumber(el: SVGElement): boolean {
  const fill = (el.getAttribute("fill") ?? "").toLowerCase();
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  const text = (el.textContent ?? "").trim();
  return (
    fill === "#c80000" && style.includes("11px arial") && /^\d+\s*$/.test(text)
  );
}

export function isHeaderBoldGeorgia(el: SVGElement): boolean {
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  return style.includes("bold") && style.includes("georgia");
}

export function isStaffSvg(svg: SVGSVGElement): boolean {
  return Array.from(svg.querySelectorAll<SVGRectElement>("rect")).some((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const w = parseFloat(r.getAttribute("width") ?? "0");
    return fill === "#a5a5a5" && h > 0.5 && h < 2.0 && w > 20;
  });
}

export function getRowAnchors(svg: SVGSVGElement): RowAnchors {
  const staffYs: number[] = [];
  const barNumYs: number[] = [];

  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const y = parseFloat(r.getAttribute("y") ?? "0");
    if (fill === STAFF_LINE_FILL && h <= 1.5 && w > 20) staffYs.push(y);
  });

  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (!isBarNumber(t)) return;
    const y = parseFloat(t.getAttribute("y") ?? "0");
    if (y > 0) barNumYs.push(y);
  });

  const staffTopY = staffYs.length ? Math.min(...staffYs) : 0;
  const staffBottomY = staffYs.length ? Math.max(...staffYs) : 0;
  const barNumberY = barNumYs.length ? _mode(barNumYs) : staffTopY - 12;
  const svgHeight = getSvgHeight(svg);

  return { barNumberY, staffTopY, staffBottomY, svgHeight };
}

function _mode(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) {
    const k = Math.round(v * 2) / 2;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let best = values[0],
    bestCount = 0;
  for (const [v, c] of freq)
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  return best;
}

// ─── Universal patches ────────────────────────────────────────────────────────

function fixBar1X(svg: SVGSVGElement): void {
  let staffStartX: number | null = null;
  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const x = parseFloat(r.getAttribute("x") ?? "NaN");
    if (fill !== "#a5a5a5" || h > 1.5 || w < 20 || !Number.isFinite(x)) return;
    if (staffStartX === null || x < staffStartX) staffStartX = x;
  });
  if (staffStartX === null) return;

  const targetX = staffStartX + 2;
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (!isBarNumber(t)) return;
    if ((t.textContent ?? "").trim().replace(/\s+/g, "") !== "1") return;
    const currentX = parseFloat(t.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(currentX) || Math.abs(currentX - targetX) < 1) return;
    t.setAttribute("x", String(targetX));
    console.log(
      `[universal] fixBar1X: x ${currentX.toFixed(1)} → ${targetX.toFixed(1)} (staffStart=${staffStartX})`,
    );
  });
}

function fixDisplacedBarNumbers(
  svg: SVGSVGElement,
  anchors: RowAnchors,
  rowIdx: number,
): number {
  const staffHeight = anchors.staffBottomY - anchors.staffTopY;
  const seen = new Set<number>();
  const barlineXs: number[] = [];

  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    if (fill !== "#222211") return;
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const x = parseFloat(r.getAttribute("x") ?? "NaN");
    const y = parseFloat(r.getAttribute("y") ?? "NaN");
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (w < 1.2 || w > 2.0) return;
    if (h < staffHeight * 0.8) return;
    if (y < anchors.staffTopY - 5 || y > anchors.staffBottomY + 5) return;
    const key = Math.round(x * 2) / 2;
    if (seen.has(key)) return;
    seen.add(key);
    barlineXs.push(x);
  });

  if (!barlineXs.length) return 0;
  barlineXs.sort((a, b) => a - b);

  const MIN_DISPLACEMENT = 18;
  const BAR_NUM_PAD = 2;
  let moved = 0;

  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (!isBarNumber(t)) return;
    const barText = (t.textContent ?? "").trim().replace(/\s+/g, "");
    if (barText === "1") return;
    const currentX = parseFloat(t.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(currentX)) return;
    const nearestLeft = barlineXs.filter((x) => x < currentX).at(-1);
    if (nearestLeft === undefined) return;
    const targetX =
      currentX - nearestLeft < MIN_DISPLACEMENT
        ? currentX
        : nearestLeft + BAR_NUM_PAD;
    if (Math.abs(currentX - targetX) < 1) return;
    t.setAttribute("x", String(targetX));
    console.log(
      `[universal] fixDisplacedBarNumbers row[${rowIdx}] "${barText}" x ${currentX.toFixed(1)}→${targetX.toFixed(1)}`,
    );
    moved++;
  });

  if (moved)
    console.log(
      `[universal] fixDisplacedBarNumbers row[${rowIdx}] total moved=${moved}`,
    );
  return moved;
}

function hideRepeatedTabClef(svg: SVGSVGElement): void {
  let hidden = 0;
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)/);
    if (!m) return;
    if (parseFloat(m[1]) >= 90) return;
    const raw = (g.querySelector("text")?.textContent ?? "").trim();
    if (!raw || /^[\x20-\x7E]+$/.test(raw)) return;
    const cp = raw.codePointAt(0) ?? 0;
    if (cp >= 0xe080 && cp <= 0xe089) return; // SMuFL time-sig digits
    if (cp === 0xe044) return; // barline-structure glyph
    g.setAttribute("display", "none");
    hidden++;
  });
  if (hidden)
    console.log(`[universal] hideRepeatedTabClef: hidden=${hidden} glyphs`);
}

function fixSectionLabelX(
  svg: SVGSVGElement,
  anchors: RowAnchors,
  rowIdx: number,
): void {
  const staffHeight = anchors.staffBottomY - anchors.staffTopY;
  const seen = new Set<number>();
  const barlineXs: number[] = [];

  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    if (fill !== "#222211") return;
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const x = parseFloat(r.getAttribute("x") ?? "NaN");
    const y = parseFloat(r.getAttribute("y") ?? "NaN");
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (w < 1.2 || w > 2.0) return;
    if (h < staffHeight * 0.8) return;
    if (y < anchors.staffTopY - 5 || y > anchors.staffBottomY + 5) return;
    const key = Math.round(x * 2) / 2;
    if (seen.has(key)) return;
    seen.add(key);
    barlineXs.push(x);
  });

  if (!barlineXs.length) return;
  barlineXs.sort((a, b) => a - b);

  const TOL = 10;
  const SECTION_PAD = -2;

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (isBarNumber(el)) return;
    if (el.hasAttribute("data-maestro") || el.hasAttribute("data-maestro-lane"))
      return;
    if (!isHeaderBoldGeorgia(el)) return;
    const text = (el.textContent ?? "").trim();
    if (!text || RX_SECTION_SKIP.test(text) || RX_TEMPO_TEXT.test(text)) return;

    const currentX = parseFloat(el.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(currentX)) return;
    const nearestLeft = barlineXs.filter((x) => x <= currentX + TOL).at(-1);
    if (nearestLeft === undefined) return;
    const targetX = nearestLeft + SECTION_PAD;
    if (Math.abs(currentX - targetX) < 1) return;
    el.setAttribute("x", String(targetX));
    console.log(
      `[universal] fixSectionX row[${rowIdx}] "${text.slice(0, 20)}" x ${currentX.toFixed(1)}→${targetX.toFixed(1)}`,
    );
  });
}

function fixHeaderStack(
  svg: SVGSVGElement,
  anchors: RowAnchors,
  rowIdx: number,
): void {
  const { staffTopY, barNumberY } = anchors;
  const maxY = staffTopY - 4;
  const sectionY = barNumberY - HEADER_SECTION_GAP;
  const tempoCtxY = barNumberY - HEADER_TEMPO_CONTEXT_GAP;

  if (sectionY < 2) {
    console.log(
      `[universal] fixHeaderStack row[${rowIdx}] skipped — barNumberY=${barNumberY.toFixed(1)} too small`,
    );
    return;
  }

  let sections = 0,
    tempoCtx = 0;

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (isBarNumber(el)) return;
    if (el.hasAttribute("data-maestro") || el.hasAttribute("data-maestro-lane"))
      return;
    if (!isHeaderBoldGeorgia(el)) return;
    const text = (el.textContent ?? "").trim();
    if (!text || RX_SECTION_SKIP.test(text) || RX_TEMPO_TEXT.test(text)) return;

    const currentY = parseFloat(el.getAttribute("y") ?? "NaN");
    let rawTarget: number, lane: string;

    if (RX_TEMPO_CONTEXT.test(text)) {
      rawTarget = tempoCtxY;
      lane = "tempoCtx";
      tempoCtx++;
    } else {
      rawTarget = sectionY;
      lane = "section";
      sections++;
    }

    const targetY = Math.max(2, Math.min(rawTarget, maxY));
    if (Math.abs(currentY - targetY) < 1) return;
    el.setAttribute("y", String(targetY));
    console.log(
      `[universal] fixHeaderStack row[${rowIdx}] ${lane} "${text.slice(0, 20)}" y ${currentY.toFixed(1)}→${targetY.toFixed(1)}`,
    );
  });

  if (sections + tempoCtx > 0)
    console.log(
      `[universal] fixHeaderStack row[${rowIdx}] sections=${sections} tempoCtx=${tempoCtx}`,
    );
}

// ─── Stable row key stamping ──────────────────────────────────────────────────

/**
 * stampStaffSvgRowKeys — assigns data-maestro-row-key to every staff SVG in
 * DOM order. Called once per renderFinished (inside runUniversalLayoutPatches)
 * before any overlay runs. All overlay systems read this key so row "0" means
 * the same physical svg.at-surface-svg everywhere (PM, chord, FX, etc.).
 */
function stampStaffSvgRowKeys(containerEl: HTMLElement): void {
  const svgs = Array.from(
    containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
  ).filter(isStaffSvg);
  svgs.forEach((svg, i) => {
    svg.dataset.maestroRowKey = String(i);
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * runUniversalLayoutPatches — returns a Promise that resolves only after both
 * rAF frames AND the mutation pass complete. Caller must await before curtain drop
 * to prevent the pre-patch layout from flashing on screen.
 * Called unconditionally for ALL GP file types. Safe on gp4/gp5/gp7/gp8.
 */
export function runUniversalLayoutPatches(
  containerEl: HTMLElement,
): Promise<void> {
  console.log("[universal] runUniversalLayoutPatches");
  return new Promise((resolve) => {
    const run = () => {
      // Stamp stable row keys first — all overlays depend on this
      stampStaffSvgRowKeys(containerEl);
      let firstStaffRowSeen = false;
      const svgRows =
        containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg");
      console.log("[universal] svg.at-surface-svg rows found:", svgRows.length);

      svgRows.forEach((svg, i) => {
        if (!isStaffSvg(svg)) {
          console.log(`[universal] row[${i}] skipped (no staff lines)`);
          return;
        }
        const anchors = getRowAnchors(svg);

        if (!firstStaffRowSeen) fixBar1X(svg);
        fixDisplacedBarNumbers(svg, anchors, i);
        if (firstStaffRowSeen) hideRepeatedTabClef(svg);
        fixSectionLabelX(svg, anchors, i);
        fixHeaderStack(svg, anchors, i);

        firstStaffRowSeen = true;
      });
      resolve();
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  });
}
