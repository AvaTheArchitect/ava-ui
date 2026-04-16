/**
 * gp8LaneMap.ts
 * Date: March 27th, 2026
 *
 * Row-level lane authority for GP8 SVG normalization.
 * This file owns lane classification, lane spacing policy, and the
 * authoritative Y resolver. gp8LayoutEngine.ts is the DOM writer — it
 * reads lane targets from here and applies them to SVG nodes.
 *
 * Lane 1 band model
 * ─────────────────
 *   lane1RailY           → top of the dashed PM rail rect (canonical anchor)
 *   lane1TextMiddleY     → PM text / chord symbols  (dominant-baseline: middle)
 *   lane1TextHangingY    → tempo cluster / section labels (dominant-baseline: hanging)
 *   lane1EndCapY         → PM end-cap rects
 *   lane2TextHangingY    → tempo fallback when Lane-1 is occupied by PM/chords
 *
 * All values derived from lane1RailY so every track stays consistent:
 *   lane1TextMiddleY  = lane1RailY + 0.72
 *   lane1EndCapY      = lane1RailY + 0.72 - 4.5
 *   lane1TextHangingY = lane1RailY + LANE1_HANGING_FROM_RAIL  (≈ −7)
 *   lane2TextHangingY = lane1TextHangingY − LANE_GAP
 *
 * Fallback (no PM rails detected):
 *   tier-4 formula gives railY = barNumberY − 9, so
 *   lane1TextHangingY ≈ barNumberY − 9 − 7 = barNumberY − TEMPO_LANE_OFFSET (16) ✓
 *
 * Migration order (one pass at a time):
 *   ✅ Phase 1: Lane 1 PM resolver + RowLaneMap interface
 *   ✅ Phase 4: Chord symbols → lane3ChordY (shares Lane 1 PM text band)
 *   ⬜ Phase 2: Section markers → lane0SectionY
 *   ⬜ Phase 3: Beat annotations → lane2AnnoY
 */

export const LANE_GAP = 11;
export const SECTION_GAP = 16;
export const TOP_MARGIN_MAP = 2;

/**
 * TEMPO_LANE_OFFSET — legacy reference kept for the "no-rail" formula check.
 * Primary derivation is now lane1RailY + LANE1_HANGING_FROM_RAIL.
 * Must equal |LANE1_HANGING_FROM_RAIL| + 9 (tier-4 rail fallback offset).
 */
export const TEMPO_LANE_OFFSET = 16;

/**
 * LANE1_HANGING_FROM_RAIL
 * Offset from lane1RailY to the hanging-baseline anchor used by tempo
 * clusters and section labels. Negative = above the rail (up the page).
 * Tune once: if clusters sit too high → increase toward 0; too low → decrease.
 */
export const LANE1_HANGING_FROM_RAIL = -7;

export const CHORD_TO_PM_TEXT_OFFSET = -3.0;

export interface RowLaneMap {
  barNumberY: number;
  /** Top of the dashed PM rail rect — canonical Lane-1 anchor. */
  lane1RailY: number;
  /** Y for PM text and chord symbols (dominant-baseline: middle). */
  lane1TextMiddleY: number;
  /** Y for PM end-cap rects. */
  lane1EndCapY: number;
  /** Y for tempo cluster and section labels (dominant-baseline: hanging). */
  lane1TextHangingY: number;
  /** Lane-2 fallback for tempo cluster when Lane-1 is occupied. */
  lane2TextHangingY: number;
  /** Lane-2 annotation band (fx:, tuning:, etc.). */
  lane2AnnoY: number;
  /** Chord symbols share Lane-1 text middle band — alias of lane1TextMiddleY. */
  lane3ChordY: number;
  /** Section marker fallback when Lane-2 is also occupied. */
  lane0SectionY: number;
  pmSource: PmLaneSource;
}

export type PmLaneSource =
  | "system-start"
  | "general-row"
  | "neighbor-consensus"
  | "formula-fallback";

// ─────────────────────────────────────────────────────────────────────────────
// Chord symbol classifier
// ─────────────────────────────────────────────────────────────────────────────

const CHORD_REGEX =
  /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|M)?[0-9]?[0-9]?(\/[A-G][#b]?)?$/;

export function isChordSymbol(el: SVGTextElement): boolean {
  const txt = (el.textContent ?? "").trim();
  const anchor = (el.getAttribute("text-anchor") ?? "").trim();
  const dbAttr = (el.getAttribute("dominant-baseline") ?? "").trim();
  const style = el.getAttribute("style") ?? "";
  const hasSupportedBaseline =
    dbAttr === "hanging" ||
    dbAttr === "middle" ||
    /dominant-baseline\s*:\s*hanging/i.test(style) ||
    /dominant-baseline\s*:\s*middle/i.test(style);
  return anchor === "middle" && hasSupportedBaseline && CHORD_REGEX.test(txt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanity helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isSanePmLaneY(y: number, barNumberY: number): boolean {
  return y >= barNumberY - 14 && y <= barNumberY - 4;
}

// ─────────────────────────────────────────────────────────────────────────────
// PM lane resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ─── LANE 1 RESOLVER — DO NOT SIMPLIFY ───────────────────────────────────────
 * Resolves the single authoritative PM lane-1 rail-top Y for this SVG row.
 * ALL Lane-1 geometry derives from this one value via RowLaneMap.
 *
 * THE SANITY BAND [barNumberY-14, barNumberY-4] IS NOT OPTIONAL.
 * Without it, short rows (barNumY≈22) let beam/connector rects at y≈13
 * outvote correct PM rails at y≈22 purely by count.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function resolveRowPmLane1Y(
  svg: SVGSVGElement,
  barNumberY: number,
  systemStartZoneMaxX: number,
  svgIdx: number,
): { railY: number; source: PmLaneSource } {
  // Tier 1: system-start zone rect mode
  const sysMode = _railModeY(svg, barNumberY, 0, systemStartZoneMaxX);
  console.log(
    `  🗺️ ROW_PM svg[${svgIdx}] tier1 system-start → ${sysMode !== null ? sysMode.toFixed(3) : "null"} sane=${sysMode !== null ? isSanePmLaneY(sysMode, barNumberY) : "n/a"}`,
  );
  if (sysMode !== null && isSanePmLaneY(sysMode, barNumberY))
    return { railY: sysMode, source: "system-start" };

  // Tier 2: full-row rect mode
  const rowMode = _railModeY(svg, barNumberY, 0, Infinity);
  console.log(
    `  🗺️ ROW_PM svg[${svgIdx}] tier2 general-row → ${rowMode !== null ? rowMode.toFixed(3) : "null"} sane=${rowMode !== null ? isSanePmLaneY(rowMode, barNumberY) : "n/a"}`,
  );
  if (rowMode !== null && isSanePmLaneY(rowMode, barNumberY))
    return { railY: rowMode, source: "general-row" };

  // Tier 3: non-ASCII glyph consensus
  const signals: number[] = [];
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) return;
    const gy = parseFloat(m[2]);
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content)) return;
    if (isSanePmLaneY(gy, barNumberY)) signals.push(gy);
  });
  console.log(
    `  🗺️ ROW_PM svg[${svgIdx}] tier3 glyph-consensus signals=[${signals.map((s) => s.toFixed(2)).join(",")}]`,
  );
  if (signals.length >= 1)
    return { railY: _mode(signals), source: "neighbor-consensus" };

  // Tier 4: formula fallback  (barNumberY − 9)
  // Note: −9 + LANE1_HANGING_FROM_RAIL(−7) = −16 = −TEMPO_LANE_OFFSET ✓
  const fallback = Math.max(TOP_MARGIN_MAP + LANE_GAP, barNumberY - 9);
  console.log(
    `  🗺️ ROW_PM svg[${svgIdx}] tier4 formula-fallback y=${fallback.toFixed(2)}`,
  );
  return { railY: fallback, source: "formula-fallback" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Row lane occupancy + annotation span tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface RowLaneOccupancy {
  hasLane1PmFamily: boolean;
  hasLane2Annotations: boolean;
  hasTempoCluster: boolean;
  hasSectionLabel: boolean;
}

export interface LaneSpan {
  left: number;
  right: number;
  node: SVGTextElement;
}

export interface AnnotationLaneState {
  lane2: LaneSpan[];
  lane3: LaneSpan[];
  lane4: LaneSpan[];
}

export function makeAnnotationLaneState(): AnnotationLaneState {
  return { lane2: [], lane3: [], lane4: [] };
}

export function spansOverlap(
  span: LaneSpan,
  lane: LaneSpan[],
  padding = 4,
): boolean {
  return lane.some(
    (s) => span.left < s.right + padding && span.right + padding > s.left,
  );
}

export function measureNodeSpan(t: SVGTextElement): {
  left: number;
  right: number;
} {
  const x = parseFloat(t.getAttribute("x") ?? "0");
  try {
    const b = t.getBBox();
    if (b.width > 0) return { left: b.x, right: b.x + b.width };
  } catch {
    /* off-screen */
  }
  const chars = (t.textContent ?? "").length;
  return { left: x, right: x + chars * 7 };
}

const ANNO_DETECT_PAT =
  /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|dive|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|whammy|let\s*ring|dive\s*bomb)/i;

export function detectRowLaneOccupancy(
  svg: SVGSVGElement,
  barNumberY: number,
): RowLaneOccupancy {
  const textNodes = Array.from(svg.querySelectorAll<SVGTextElement>("text"));

  const hasLane1PmFamily =
    textNodes.some((t) => /^P\.M/.test((t.textContent ?? "").trim())) ||
    textNodes.some((t) => isChordSymbol(t)) ||
    _detectRailExists(svg, barNumberY);

  const hasLane2Annotations = textNodes.some((t) => {
    const txt = (t.textContent ?? "").trim();
    const style = t.getAttribute("style") ?? "";
    return (
      style.includes("italic") &&
      style.includes("Georgia") &&
      !style.includes("bold") &&
      ANNO_DETECT_PAT.test(txt)
    );
  });

  const hasTempoCluster = textNodes.some((t) =>
    /^ ?= \d+$/.test((t.textContent ?? "").trim()),
  );

  const hasSectionLabel = textNodes.some((t) => {
    const style = t.getAttribute("style") ?? "";
    return (
      style.includes("bold 14px Georgia") &&
      !/^ ?= \d+$/.test((t.textContent ?? "").trim()) &&
      !!(t.textContent ?? "").trim()
    );
  });

  return {
    hasLane1PmFamily,
    hasLane2Annotations,
    hasTempoCluster,
    hasSectionLabel,
  };
}

function _detectRailExists(svg: SVGSVGElement, barNumberY: number): boolean {
  for (const r of Array.from(svg.querySelectorAll<SVGRectElement>("rect"))) {
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const ry = parseFloat(r.getAttribute("y") ?? "999");
    if (
      r.getAttribute("fill") === "#000000" &&
      h > 1.0 &&
      h < 2.0 &&
      ry >= barNumberY - 14 &&
      ry <= barNumberY - 4
    )
      return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildRowLaneMap(
  svg: SVGSVGElement,
  barNumberY: number,
  systemStartZoneMaxX: number,
  svgIdx: number,
): RowLaneMap {
  const { railY, source } = resolveRowPmLane1Y(
    svg,
    barNumberY,
    systemStartZoneMaxX,
    svgIdx,
  );
  console.log(
    `  🗺️ ROW_PM_ANCHOR svg[${svgIdx}] source=${source} y=${railY.toFixed(3)}`,
  );

  // ── Lane 1 band — all values derived from lane1RailY ──────────────────────
  const lane1RailY = railY;
  const lane1TextMiddleY = lane1RailY + 0.72; // PM text / chords
  const lane1EndCapY = lane1RailY + 0.72 - 4.5; // PM end-caps
  const lane1TextHangingY = Math.max(
    TOP_MARGIN_MAP,
    lane1RailY + LANE1_HANGING_FROM_RAIL,
  ); // tempo / sections
  const lane2AnnoY = Math.max(TOP_MARGIN_MAP, lane1RailY - LANE_GAP); // fx:/tuning: annotations
  const lane3ChordY = lane1TextMiddleY; // alias
  const lane0SectionY = Math.max(TOP_MARGIN_MAP, lane2AnnoY - SECTION_GAP);
  const lane2TextHangingY = Math.max(
    TOP_MARGIN_MAP,
    lane1TextHangingY - LANE_GAP,
  ); // tempo lane-2 fallback

  console.log("🧭 LANE1_BAND", {
    svgIdx,
    barNumberY,
    lane1RailY: lane1RailY.toFixed(2),
    lane1TextMiddleY: lane1TextMiddleY.toFixed(2),
    lane1TextHangingY: lane1TextHangingY.toFixed(2),
    lane2TextHangingY: lane2TextHangingY.toFixed(2),
    source,
  });

  return {
    barNumberY,
    lane1RailY,
    lane1TextMiddleY,
    lane1EndCapY,
    lane1TextHangingY,
    lane2TextHangingY,
    lane2AnnoY,
    lane3ChordY,
    lane0SectionY,
    pmSource: source,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

function _railModeY(
  svg: SVGSVGElement,
  barNumberY: number,
  minX: number,
  maxX: number,
): number | null {
  const RAIL_MIN = barNumberY - 12;
  const RAIL_MAX = barNumberY + 3;
  const candidates: number[] = [];
  for (const r of Array.from(svg.querySelectorAll<SVGRectElement>("rect"))) {
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const fill = r.getAttribute("fill") ?? "";
    const rx = parseFloat(r.getAttribute("x") ?? "-1");
    const ry = parseFloat(r.getAttribute("y") ?? "999");
    if (
      fill === "#000000" &&
      h > 1.0 &&
      h < 2.0 &&
      rx >= minX &&
      rx < maxX &&
      ry >= RAIL_MIN &&
      ry <= RAIL_MAX
    )
      candidates.push(ry);
  }
  if (candidates.length === 0) return null;
  return _mode(candidates);
}

function _mode(values: number[]): number {
  const freq = new Map<number, number>();
  for (const v of values) {
    const key = Math.round(v * 10) / 10;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  let best = values[0],
    bestCount = 0;
  for (const [v, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      best = v;
    }
  }
  return best;
}
