"use client";
/**
 * gp8LayoutEngine.ts
 * * Date: April 10th, 2026 — v6.1 (no logic changes; clone before TempoCluster idempotency work)
 */
import {
  buildRowLaneMap,
  isChordSymbol,
  makeAnnotationLaneState,
  spansOverlap,
  measureNodeSpan,
  detectRowLaneOccupancy,
} from "@/lib/alphaTab/gp8LaneMap";
import type {
  RowLaneMap,
  AnnotationLaneState,
} from "@/lib/alphaTab/gp8LaneMap";
import { applyTempoClusterForSvg } from "@/lib/alphaTab/TempoClusterManager";

const TRACK_LABELS = /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i;
const NOT_LYRIC =
  /^Guitar\s|^Bass\s|^Drum|^Vocal|^Piano|^Standard\s|^Drop\s|^Tuning|^Tune\s|^half\s|^step|^standard|Eb|Bb|Gb|Db|Ab|= Eb|= Bb/i;
const LYRIC_MARGIN = 14;
const TOP_MARGIN = 2;
const MIN_LANE_GAP = 11;
const DEBUG_OWNERSHIP = false;

/**
 * ─── ANNOTATION OWNERSHIP / CLAIM PRIORITY ───────────────────────────────────
 *  1. sys-start   → applySystemStartClusterNormalization
 *  2. pm          → applyPmTextNormalization + applySystemStartPalmMuteRailNormalization
 *  3. chord       → applyChordLaneNormalization
 *  4. beat-anno   → applyBeatAnnotationLaneNormalization (disabled; hidden instead)
 *  5. section     → applySectionMarkerNormalization
 *  6. tempo-section → applyTempoClusterNormalization
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface Gp8LayoutEngineOptions {
  rootEl: HTMLElement;
  surfaceEl?: HTMLElement | null;
}

export function runGp8LayoutEngine({
  rootEl,
  surfaceEl = null,
}: Gp8LayoutEngineOptions): void {
  runPhase2Normalization(rootEl, surfaceEl);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Row scanning / anchor helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * findBarNumberY
 * Returns the MODE of bar-number Y values in this SVG row (not min).
 * Bucketed to 0.5px to absorb float jitter from AlphaTab's layout engine.
 * Tie-break prefers the LARGER y — prevents Lane-1 drifting 1px too high
 * when AlphaTab alternates between e.g. 98.5 and 99.5.
 *
 * minX filter (default 90): excludes system-start column bar numbers whose
 * x sits left of the first playable bar — they share the same y pattern but
 * can skew the mode on short rows with few real measures visible.
 */
function findBarNumberY(textNodes: SVGTextElement[], minX = 90): number | null {
  const ys: number[] = [];
  for (const t of textNodes) {
    const style = t.getAttribute("style") ?? "";
    if (!style.includes("11px Arial")) continue;
    if (t.getAttribute("fill") !== "#C80000") continue;
    const x = parseFloat(t.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(x) || x < minX) continue;
    const y = parseFloat(t.getAttribute("y") ?? "NaN");
    if (!Number.isFinite(y) || y <= 0) continue;
    ys.push(y);
  }
  if (!ys.length) return null;
  // Bucket to 0.5px
  const freq = new Map<number, number>();
  for (const y of ys) {
    const k = Math.round(y * 2) / 2;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  // Mode; tie-break → larger y (avoids "too high" lane)
  let bestY = ys[0];
  let bestC = -1;
  for (const [y, c] of freq) {
    if (c > bestC || (c === bestC && y > bestY)) {
      bestC = c;
      bestY = y;
    }
  }
  return bestY;
}

function findRailModeY(
  svg: SVGSVGElement,
  barNumberY: number,
  minX = 0,
  maxX = Infinity,
): number | null {
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
      ry >= barNumberY - 12 &&
      ry <= barNumberY + 3
    )
      candidates.push(ry);
  }
  if (!candidates.length) return null;
  const freq = new Map<number, number>();
  for (const y of candidates) {
    const k = Math.round(y * 10) / 10;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  let modeY = candidates[0],
    maxCount = 0;
  for (const [y, c] of freq) {
    if (c > maxCount) {
      maxCount = c;
      modeY = y;
    }
  }
  return modeY;
}

function findSystemStartZoneMaxX(svg: SVGSVGElement): number {
  const xs: number[] = [];
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (t.getAttribute("fill") !== "#C80000") return;
    if (!(t.getAttribute("style") ?? "").includes("11px Arial")) return;
    const x = parseFloat(t.getAttribute("x") ?? "0");
    if (x > 0) xs.push(x);
  });
  xs.sort((a, b) => a - b);
  const result =
    xs.length >= 3
      ? xs[2]
      : xs.length === 2
        ? xs[1] + 180
        : xs.length === 1
          ? xs[0] + 280
          : 400;
  console.log(
    `  🧪 findSystemStartZoneMaxX: barNumXs=[${xs
      .slice(0, 4)
      .map((x) => x.toFixed(1))
      .join(", ")}] → zoneMaxX=${result.toFixed(1)}`,
  );
  return result;
}

function findFirstPlayableBarX(textNodes: SVGTextElement[]): number | null {
  const xs = textNodes
    .filter(
      (t) =>
        t.getAttribute("fill") === "#C80000" &&
        (t.getAttribute("style") ?? "").includes("11px Arial"),
    )
    .map((t) => parseFloat(t.getAttribute("x") ?? "NaN"))
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (!xs.length) return null;
  return xs.find((x) => x >= 90) ?? xs[0];
}

function collectTempoNodes(textNodes: SVGTextElement[]): SVGTextElement[] {
  return textNodes.filter((t) => {
    const norm = (t.textContent ?? "").replace(/\u00A0/g, " ").trim();
    return /^=\s*\d+\s*$/.test(norm);
  });
}

function collectSectionLabelNode(
  textNodes: SVGTextElement[],
): SVGTextElement | null {
  return (
    textNodes.find((t) => {
      const style = t.getAttribute("style") ?? "";
      if (!style.includes("bold 14px Georgia")) return false;
      if (parseFloat(t.getAttribute("y") ?? "999") > 120) return false;
      const txt = (t.textContent ?? "").trim();
      return !!txt && !TRACK_LABELS.test(txt) && !/^ ?= \d+$/.test(txt);
    }) ?? null
  );
}

function _nearestBar(allTextNodes: SVGTextElement[], xVal: number): string {
  let best: string | null = null,
    bestDx = Infinity;
  for (const t of allTextNodes) {
    if (t.getAttribute("fill") !== "#C80000") continue;
    if (!(t.getAttribute("style") ?? "").includes("11px Arial")) continue;
    const tx = parseFloat(t.getAttribute("x") ?? "0");
    const dx = xVal - tx;
    if (dx >= 0 && dx < bestDx) {
      bestDx = dx;
      best = (t.textContent ?? "").trim();
    }
  }
  return best ?? "?";
}

// ─────────────────────────────────────────────────────────────────────────────
// Section B — System-start cluster
// (Tempo cluster logic lives in TempoClusterManager.ts)
// ─────────────────────────────────────────────────────────────────────────────

function applySystemStartPalmMuteRailNormalization(
  svg: SVGSVGElement,
  svgIdx: number,
  barNumberY: number,
  systemStartLaneAnchorY: number,
  systemStartZoneMaxX: number,
): void {
  const targetRectY = systemStartLaneAnchorY;
  const endCapTargetY = systemStartLaneAnchorY + 0.72 - 4.5;
  console.group(
    `  🧪 applySystemStartPalmMuteRailNormalization svg[${svgIdx}] targetRectY=${targetRectY.toFixed(3)} endCapY=${endCapTargetY.toFixed(3)}`,
  );

  type RectCandidate = {
    el: SVGRectElement;
    rx: number;
    ry: number;
    w: number;
    h: number;
    kind: "h-rail" | "end-cap" | "skip";
  };
  const candidates: RectCandidate[] = [];
  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    if (r.getAttribute("fill") !== "#000000") return;
    const rx = parseFloat(r.getAttribute("x") ?? "999");
    if (rx >= systemStartZoneMaxX) return;
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const ry = parseFloat(r.getAttribute("y") ?? "999");
    const kind: RectCandidate["kind"] =
      h > 1.0 && h < 2.0
        ? "h-rail"
        : w > 1.3 && w < 1.6 && h > 7 && h < 11
          ? "end-cap"
          : "skip";
    candidates.push({ el: r, rx, ry, w, h, kind });
    console.log(
      `    🔍 x=${rx.toFixed(2)} y=${ry.toFixed(3)} w=${w.toFixed(3)} h=${h.toFixed(3)} → ${kind === "skip" ? "❌ skip" : "✅ " + kind.toUpperCase()}`,
    );
  });

  let matchCount = 0;
  for (const { el, rx, ry, kind } of candidates) {
    if (kind === "skip") continue;
    const target = kind === "h-rail" ? targetRectY : endCapTargetY;
    if (Math.abs(ry - target) < 0.5) continue;
    el.setAttribute("y", String(target));
    matchCount++;
    console.log(
      `    ✏️ ${kind} x=${rx.toFixed(2)} y: ${ry.toFixed(3)} → ${target.toFixed(3)}`,
    );
  }
  const actionable = candidates.filter((c) => c.kind !== "skip").length;
  if (actionable === 0)
    console.warn(`    ⚠️ no rail/end-cap rects found in system-start zone`);
  else if (matchCount === 0)
    console.log(`    ℹ️ ${actionable} rect(s) already in place`);
  console.groupEnd();
}

function applySystemStartClusterNormalization(
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  barNumberY: number,
  systemStartLaneAnchorY: number,
  systemStartZoneMaxX: number,
  sectionLabelNode: SVGTextElement | null,
  allTempoNodes: SVGTextElement[],
  svg: SVGSVGElement,
): void {
  const P2_STAFF_BODY_Y = barNumberY + 1;
  const PM_TEXT_Y = systemStartLaneAnchorY + 1.44 / 2;
  const LANE2_Y = Math.max(TOP_MARGIN, systemStartLaneAnchorY - MIN_LANE_GAP);
  const ANNO_PATTERN =
    /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;

  console.group(
    `  🧪 applySystemStartClusterNormalization svg[${svgIdx}] PM_TEXT_Y=${PM_TEXT_Y.toFixed(2)} LANE2=${LANE2_Y.toFixed(2)} zoneMaxX=${systemStartZoneMaxX.toFixed(1)}`,
  );

  const _inZone = allTextNodes.filter((t) => {
    const x = parseFloat(t.getAttribute("x") ?? "-1");
    return x > 0 && x < systemStartZoneMaxX;
  });
  const _aboveStaff = _inZone.filter(
    (t) => parseFloat(t.getAttribute("y") ?? "999") < P2_STAFF_BODY_Y,
  );
  const _eligible = _aboveStaff.filter((t) => {
    const s = t.getAttribute("style") ?? "";
    return (
      !s.includes("bold 14px Georgia") &&
      !(s.includes("11px Arial") && t.getAttribute("fill") === "#C80000")
    );
  });
  const _final = _eligible.filter((t) => {
    if (t === sectionLabelNode || allTempoNodes.includes(t)) return false;
    const txt = (t.textContent ?? "").trim();
    const s = t.getAttribute("style") ?? "";
    return (
      /^P\.M/.test(txt) ||
      /^tuning:/i.test(txt) ||
      (s.includes("italic") &&
        s.includes("Georgia") &&
        !s.includes("bold") &&
        ANNO_PATTERN.test(txt))
    );
  });
  console.log(
    `  🔎 SYS_START_CLUSTER svg[${svgIdx}] allText=${allTextNodes.length} inZone=${_inZone.length} aboveStaff=${_aboveStaff.length} eligible=${_eligible.length} finalCandidates=${_final.length}`,
  );
  if (_eligible.length > 0 && _final.length === 0)
    _eligible.forEach((t) =>
      console.log(
        `    🔎 ELIGIBLE_NO_TARGET "${(t.textContent ?? "").trim().slice(0, 40)}" x=${t.getAttribute("x")}`,
      ),
    );

  let matchCount = 0;
  allTextNodes.forEach((t) => {
    const xVal = parseFloat(t.getAttribute("x") ?? "-1");
    const txt = (t.textContent ?? "").trim();
    const style = t.getAttribute("style") ?? "";
    const yVal = parseFloat(t.getAttribute("y") ?? "999");

    if (/dive\s*bomb/i.test(txt))
      console.log(
        `🧨 SYS_START_SEES svg[${svgIdx}] "${txt}" x=${xVal.toFixed(1)} y=${yVal} inZone=${xVal > 0 && xVal < systemStartZoneMaxX} stamp="${t.getAttribute("data-maestro-lane") ?? "(none)"}"`,
      );

    if (xVal <= 0 || xVal >= systemStartZoneMaxX) return;
    if (t === sectionLabelNode || allTempoNodes.includes(t)) return;
    if (style.includes("bold 14px Georgia")) return;
    if (style.includes("11px Arial") && t.getAttribute("fill") === "#C80000")
      return;
    if (t.getAttribute("data-maestro-lane")) return;

    let targetY: number | null = null,
      laneName = "";
    if (/^P\.M/.test(txt)) {
      targetY = PM_TEXT_Y;
      laneName = "SYS_START_PM";
    } else if (/^tuning:/i.test(txt)) {
      targetY = LANE2_Y;
      laneName = "SYS_START_TUNING";
    } else if (ANNO_PATTERN.test(txt)) {
      const span = measureNodeSpan(t);
      const techTop = measureTechniqueExtent(
        svg,
        span.left - 8,
        span.right + 8,
        barNumberY + 1,
      );
      const clearY =
        techTop !== null && techTop < LANE2_Y
          ? Math.max(TOP_MARGIN, techTop - 6)
          : LANE2_Y;
      targetY = clearY;
      laneName = "SYS_START_ANNO";
    }
    if (targetY === null) return;
    matchCount++;
    const oldY = t.getAttribute("y");
    console.log(
      `    ✏️ ${laneName} "${txt.slice(0, 40)}" x=${xVal.toFixed(1)} y: ${oldY} → ${targetY.toFixed(2)}`,
    );
    if (Math.abs(yVal - targetY) < 1) {
      console.log(`      ↩️ already in place`);
      return;
    }
    t.setAttribute("y", String(targetY));
    t.setAttribute("data-maestro-lane", "sys-start");
    if (DEBUG_OWNERSHIP)
      console.log(
        `  🏷️ STAMP sys-start "${txt.slice(0, 30)}" bar=${_nearestBar(allTextNodes, xVal)}`,
      );
    if (
      laneName !== "SYS_START_PM" &&
      !style.includes("dominant-baseline: hanging")
    )
      t.setAttribute("style", style.trimEnd() + "; dominant-baseline: hanging");
  });

  if (matchCount === 0)
    console.log(
      `  ℹ️ SYS_START_CLUSTER svg[${svgIdx}] empty candidate set — skipping row`,
    );
  console.groupEnd();
}

function applySystemStartTechniqueGlyphNormalization(
  svg: SVGSVGElement,
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  barNumberY: number,
  systemStartLaneAnchorY: number,
  systemStartZoneMaxX: number,
): void {
  const lane1Y = systemStartLaneAnchorY;
  const tempoXSet = new Set<number>();
  allTextNodes.forEach((t) => {
    if (!/^ ?= \d+$/.test((t.textContent ?? "").trim())) return;
    const tx = parseFloat(t.getAttribute("x") ?? "0");
    for (let dx = -20; dx <= 4; dx++) tempoXSet.add(Math.round(tx) + dx);
  });
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) return;
    const gx = parseFloat(m[1]),
      gy = parseFloat(m[2]);
    if (gx >= systemStartZoneMaxX || gy >= barNumberY) return;
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content)) return;
    if (tempoXSet.has(Math.round(gx))) return;
    if (Math.abs(gy - lane1Y) < 1) return;
    g.setAttribute("transform", `translate(${gx} ${lane1Y})`);
    console.log(
      `  📐 SYS_START_GLYPH svg[${svgIdx}] glyph@(${gx.toFixed(1)},${gy.toFixed(1)}) → y=${lane1Y.toFixed(2)}`,
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section C — General beat-annotation lanes
// ─────────────────────────────────────────────────────────────────────────────

function applyGeneralEndCapRailNormalization(
  svg: SVGSVGElement,
  svgIdx: number,
  generalLaneAnchorY: number,
  systemStartZoneMaxX: number,
): void {
  const targetRectY = generalLaneAnchorY;
  const endCapTargetY = generalLaneAnchorY + 0.72 - 4.5;
  svg.querySelectorAll<SVGRectElement>("rect").forEach((r) => {
    const w = parseFloat(r.getAttribute("width") ?? "0");
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const fill = r.getAttribute("fill") ?? "";
    const rx = parseFloat(r.getAttribute("x") ?? "-1");
    const ry = parseFloat(r.getAttribute("y") ?? "999");
    if (fill !== "#000000" || rx < systemStartZoneMaxX) return;
    if (h > 1.0 && h < 2.0) {
      if (Math.abs(ry - targetRectY) < 0.5) return;
      r.setAttribute("y", String(targetRectY));
      console.log(
        `  📐 RAIL svg[${svgIdx}] x=${rx.toFixed(1)} y: ${ry.toFixed(3)} → ${targetRectY.toFixed(3)}`,
      );
    } else if (w > 1.3 && w < 1.6 && h > 7 && h < 11) {
      if (Math.abs(ry - endCapTargetY) < 0.5) return;
      r.setAttribute("y", String(endCapTargetY));
      console.log(
        `  📐 END_CAP svg[${svgIdx}] x=${rx.toFixed(1)} y: ${ry.toFixed(3)} → ${endCapTargetY.toFixed(3)}`,
      );
    }
  });
}

function applySectionMarkerNormalization(
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  barNumberY: number | null,
  hasTempoNode: boolean,
  sectionLabelNode: SVGTextElement | null,
  isRow1: boolean,
  laneMap: RowLaneMap | null = null,
): void {
  let SECTION_MARKER_Y: number;
  let _branch = "fallback";
  let occ: ReturnType<typeof detectRowLaneOccupancy> | null = null;

  if (laneMap !== null) {
    occ = detectRowLaneOccupancy(
      (allTextNodes[0]?.ownerSVGElement as SVGSVGElement) ??
        ({} as SVGSVGElement),
      laneMap.barNumberY,
    );
    let _branchLocal: string;
    if (occ.hasLane2Annotations) {
      SECTION_MARKER_Y = laneMap.lane0SectionY;
      _branchLocal = "lane0";
    } else if (occ.hasLane1PmFamily) {
      SECTION_MARKER_Y = laneMap.lane2AnnoY;
      _branchLocal = "lane2";
    } else {
      SECTION_MARKER_Y = laneMap.lane1TextHangingY;
      _branchLocal = "lane1";
    }
    SECTION_MARKER_Y = Math.max(TOP_MARGIN + 6, SECTION_MARKER_Y);
    _branch = _branchLocal;
    console.log(
      `  📌 OCC svg[${svgIdx}] branch=${_branch} L2ann=${occ.hasLane2Annotations} L1pm=${occ.hasLane1PmFamily} tempo=${occ.hasTempoCluster}`,
    );
  } else {
    SECTION_MARKER_Y =
      barNumberY !== null
        ? barNumberY - (hasTempoNode ? 22 : 18)
        : hasTempoNode
          ? 48.8908
          : 26;
  }

  allTextNodes.forEach((t) => {
    const style = t.getAttribute("style") ?? "";
    if (!style.includes("bold 14px Georgia")) return;
    const yNative = parseFloat(t.getAttribute("y") ?? "999");
    const txt = (t.textContent ?? "").trim();
    if (!txt || TRACK_LABELS.test(txt) || /^=\s*\d+/.test(txt)) return;
    if (t.getAttribute("data-maestro-lane")) return;
    // Half Time (and similar tempo-context markers) belong in Lane 2 — directly
    // above the tempo cluster. All other section markers use Lane 1.
    const isTempoContextMarker =
      /^half\s*time$/i.test(txt) || /^double\s*time$/i.test(txt);
    const targetY =
      isTempoContextMarker && laneMap?.lane2TextHangingY != null
        ? laneMap.lane2TextHangingY
        : SECTION_MARKER_Y;
    if (Math.abs(yNative - targetY) < 1) return;
    const oldY = t.getAttribute("y");
    t.setAttribute("y", String(targetY));
    if (!style.includes("dominant-baseline: hanging"))
      t.setAttribute("style", style.trimEnd() + "; dominant-baseline: hanging");
    if (isRow1 || barNumberY !== null)
      console.log(
        `  📌 svg[${svgIdx}] marker "${txt}": y ${oldY} → ${targetY.toFixed(2)} [branch=${_branch}${isTempoContextMarker ? " TEMPO-CTX" : ""}]`,
      );
  });
}

function applyChordLaneNormalization(
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  laneMap: RowLaneMap | null,
): void {
  if (!laneMap) {
    console.log(`  🎸 CHORD_PASS svg[${svgIdx}] skipped — laneMap is null`);
    return;
  }
  const pmTextY = laneMap.lane1TextMiddleY;
  allTextNodes.forEach((t) => {
    const txt = (t.textContent ?? "").trim();
    const matched = isChordSymbol(t);
    if (/^[A-G]/.test(txt) || matched)
      console.log(
        `  🎸 CHORD_SCAN svg[${svgIdx}] txt="${txt}" y=${t.getAttribute("y")} match=${matched}`,
      );
  });
  allTextNodes.forEach((t) => {
    if (!isChordSymbol(t)) return;
    const txt = (t.textContent ?? "").trim();
    const yVal = parseFloat(t.getAttribute("y") ?? "999");
    t.setAttribute("dominant-baseline", "middle");
    let style = t.getAttribute("style") ?? "";
    if (/dominant-baseline\s*:\s*hanging/i.test(style))
      style = style.replace(
        /dominant-baseline\s*:\s*hanging/gi,
        "dominant-baseline: middle",
      );
    else if (!/dominant-baseline\s*:\s*middle/i.test(style))
      style = style.trimEnd() + "; dominant-baseline: middle";
    t.setAttribute("style", style);
    if (Math.abs(yVal - pmTextY) < 1) return;
    t.setAttribute("y", String(pmTextY));
    console.log(
      `  📐 CHORD svg[${svgIdx}] "${txt}" y: ${yVal.toFixed(2)} → ${pmTextY.toFixed(2)}`,
    );
  });
}

function isBeatAnnotationText(
  t: SVGTextElement,
  txt: string,
  style: string,
  db: string,
): boolean {
  if (t.getAttribute("data-maestro-lane")) return false;
  if (isChordSymbol(t)) return false;
  if (/^P\.M/.test(txt)) return false;
  if (style.includes("bold 14px Georgia")) return false;
  if (style.includes("11px Arial") && t.getAttribute("fill") === "#C80000")
    return false;
  const BEAT_ANNO_PAT =
    /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;
  return (
    style.includes("italic") &&
    style.includes("Georgia") &&
    !style.includes("bold") &&
    (db === "hanging" || BEAT_ANNO_PAT.test(txt))
  );
}

function measureTechniqueExtent(
  svg: SVGSVGElement,
  xLeft: number,
  xRight: number,
  staffBodyY: number,
): number | null {
  let minY: number | null = null;
  const update = (y: number) => {
    if (y >= staffBodyY) return;
    if (minY === null || y < minY) minY = y;
  };
  svg.querySelectorAll<SVGPathElement>("path").forEach((p) => {
    try {
      const b = p.getBBox();
      if (b.width === 0 && b.height === 0) return;
      if (b.x + b.width < xLeft || b.x > xRight) return;
      update(b.y);
    } catch {
      /* off-screen */
    }
  });
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) return;
    const gx = parseFloat(m[1]),
      gy = parseFloat(m[2]);
    if (gx < xLeft || gx > xRight) return;
    update(gy);
  });
  const TREM_NUM_PAT = /^(½|¼|¾|full|[-]?\d+(\.\d+)?|[123]\/[24])$/i;
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    const s = t.getAttribute("style") ?? "";
    if (!s.includes("14px Arial")) return;
    const txt = (t.textContent ?? "").trim();
    if (!TREM_NUM_PAT.test(txt)) return;
    try {
      const b = t.getBBox();
      if (b.width === 0 && b.height === 0) return;
      if (b.x + b.width < xLeft || b.x > xRight) return;
      update(b.y);
    } catch {
      /* off-screen */
    }
  });
  return minY;
}

function applyPmTextNormalization(
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  pmLane1Y: number,
  systemStartZoneMaxX: number,
): void {
  const PM_TEXT_Y = pmLane1Y + 0.72;
  allTextNodes.forEach((t) => {
    const xVal = parseFloat(t.getAttribute("x") ?? "-1");
    if (xVal > 0 && xVal < systemStartZoneMaxX) return;
    if (t.getAttribute("data-maestro-lane") === "sys-start") return;
    const txt = (t.textContent ?? "").trim();
    if (!/^P\.M/.test(txt)) return;
    const yVal = parseFloat(t.getAttribute("y") ?? "999");
    if (Math.abs(yVal - PM_TEXT_Y) < 2) {
      console.log(
        `  🔒 LANE1_LOCK PM svg[${svgIdx}] "${txt}" y=${yVal.toFixed(2)} — skip`,
      );
      return;
    }
    t.setAttribute("y", String(PM_TEXT_Y));
    console.log(
      `  📐 PM_TEXT svg[${svgIdx}] "${txt}" y: ${yVal.toFixed(2)} → ${PM_TEXT_Y.toFixed(2)}`,
    );
  });
}

function applyBeatAnnotationLaneNormalization(
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  barNumberY: number,
  pmLane1Y: number,
  systemStartZoneMaxX: number,
  svg: SVGSVGElement,
): AnnotationLaneState {
  const P2_STAFF_BODY_Y = barNumberY + 1;
  const BEAT_ANNO_MAX_Y = pmLane1Y + 2;
  const LANE2_Y = Math.max(TOP_MARGIN, pmLane1Y - MIN_LANE_GAP);
  const LANE3_Y = Math.max(TOP_MARGIN, pmLane1Y - MIN_LANE_GAP * 2);
  const LANE4_Y = Math.max(TOP_MARGIN, pmLane1Y - MIN_LANE_GAP * 3);
  const P2_ANNO_PAT =
    /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;
  const isAnno = (txt: string, style: string) =>
    style.includes("italic") &&
    style.includes("Georgia") &&
    !style.includes("bold") &&
    P2_ANNO_PAT.test(txt);

  const candidates: SVGTextElement[] = [];
  allTextNodes.forEach((t) => {
    const xVal = parseFloat(t.getAttribute("x") ?? "-1");
    if (xVal > 0 && xVal < systemStartZoneMaxX) return;
    const txt = (t.textContent ?? "").trim();
    const style = t.getAttribute("style") ?? "";
    if (/^P\.M/.test(txt)) return;
    if (isChordSymbol(t)) {
      console.log(`  ⏭️ BEAT_ANNO skipping chord "${txt}"`);
      return;
    }
    if (isAnno(txt, style)) candidates.push(t);
  });
  candidates.sort(
    (a, b) =>
      parseFloat(a.getAttribute("x") ?? "0") -
      parseFloat(b.getAttribute("x") ?? "0"),
  );

  const state = makeAnnotationLaneState();
  candidates.forEach((t) => {
    const txt = (t.textContent ?? "").trim();
    const yVal = parseFloat(t.getAttribute("y") ?? "999");
    const span = measureNodeSpan(t);
    const techTop = measureTechniqueExtent(
      svg,
      span.left - 8,
      span.right + 8,
      P2_STAFF_BODY_Y,
    );
    const eLane2 =
      techTop !== null && techTop < LANE2_Y
        ? Math.max(TOP_MARGIN, techTop - 6)
        : LANE2_Y;
    const eLane3 = Math.max(TOP_MARGIN, eLane2 - MIN_LANE_GAP);
    const eLane4 = Math.max(TOP_MARGIN, eLane2 - MIN_LANE_GAP * 2);
    let targetY: number, laneName: string;
    if (
      !spansOverlap(
        { left: span.left, right: span.right, node: t },
        state.lane2,
      )
    ) {
      targetY = eLane2;
      laneName = "ANNO_L2";
      state.lane2.push({ left: span.left, right: span.right, node: t });
    } else if (
      !spansOverlap(
        { left: span.left, right: span.right, node: t },
        state.lane3,
      )
    ) {
      targetY = eLane3;
      laneName = "ANNO_L3";
      state.lane3.push({ left: span.left, right: span.right, node: t });
    } else {
      targetY = eLane4;
      laneName = "ANNO_L4";
      state.lane4.push({ left: span.left, right: span.right, node: t });
    }
    targetY = Math.min(targetY, BEAT_ANNO_MAX_Y);
    if (Math.abs(yVal - targetY) < 1) return;
    const oldY = t.getAttribute("y");
    t.setAttribute("y", String(targetY));
    t.setAttribute("data-maestro-lane", "beat-anno");
    let style = t.getAttribute("style") ?? "";
    style = style.replace(/;\s*dominant-baseline\s*:\s*\w+/gi, "").trimEnd();
    if (!style.includes("dominant-baseline: hanging"))
      style += "; dominant-baseline: hanging";
    t.setAttribute("style", style);
    console.log(
      `  📐 P2 ${laneName} svg[${svgIdx}] "${txt.slice(0, 35)}": y ${oldY} → ${targetY.toFixed(2)}`,
    );
  });
  return state;
}

function applyTechniqueGlyphNormalization(
  svg: SVGSVGElement,
  svgIdx: number,
  allTextNodes: SVGTextElement[],
  barNumberY: number,
  lane1AnchorY: number,
  systemStartZoneMaxX: number,
): void {
  const lane1Y = lane1AnchorY;
  const tempoXSet = new Set<number>();
  allTextNodes.forEach((t) => {
    if (!/^ ?= \d+$/.test((t.textContent ?? "").trim())) return;
    const tx = parseFloat(t.getAttribute("x") ?? "0");
    for (let dx = -20; dx <= 4; dx++) tempoXSet.add(Math.round(tx) + dx);
  });
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) return;
    const gx = parseFloat(m[1]),
      gy = parseFloat(m[2]);
    if (gx < systemStartZoneMaxX || gy >= barNumberY) return;
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content)) return;
    if (tempoXSet.has(Math.round(gx)) || Math.abs(gy - lane1Y) < 1) return;
    g.setAttribute("transform", `translate(${gx} ${lane1Y})`);
    console.log(
      `  📐 P2 TECHNIQUE_GLYPH svg[${svgIdx}] glyph@(${gx.toFixed(1)},${gy.toFixed(1)}) → y=${lane1Y.toFixed(2)}`,
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Section D — Lyric lane
// ─────────────────────────────────────────────────────────────────────────────

const TECH_TEXT_PAT =
  /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;
const KEEP_TECH_TEXT_PAT =
  /^(finger slide|pick slide|turn volume knob to \d+|three whammy dips?)$/i;

function hideRepeatedTabGlyph(svg: SVGSVGElement, svgIdx: number): void {
  // Title (0) and tuning (1) SVGs are not staff rows — never touch their glyphs.
  if (svgIdx < 2) return;
  const keepThisRow = svgIdx === 2;
  // Right-edge protection: repeat dots, codas, segno, and ending barline
  // symbols all live near the right edge. Never hide anything in that zone.
  const svgW =
    svg.viewBox.baseVal?.width || svg.getBoundingClientRect().width || 2000;
  const RIGHT_EDGE_MIN_X = svgW - 140;

  console.log(
    `🧪 TAB_SCAN svg[${svgIdx}] g.at count=`,
    svg.querySelectorAll("g.at").length,
  );
  let hiddenGAt = 0;
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) return;
    const gx = parseFloat(m[1]),
      gy = parseFloat(m[2]);
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content) || gx >= 90) return;
    // Never hide right-edge barline symbols (repeat dots, codas, endings…)
    if (gx >= RIGHT_EDGE_MIN_X) return;
    if (!keepThisRow) {
      console.log(
        `🙈 TAB_HIDE svg[${svgIdx}] gx=${gx.toFixed(1)} gy=${gy.toFixed(1)}`,
      );
      g.setAttribute("display", "none");
      hiddenGAt++;
    }
  });
  if (!keepThisRow && hiddenGAt > 0) {
    svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
      const txt = (t.textContent ?? "").trim();
      if (!txt || /^[\x20-\x7E]+$/.test(txt)) return;
      // Only "loose" glyph texts (no explicit x/y attributes)
      if (t.getAttribute("x") !== null || t.getAttribute("y") !== null) return;
      // Gate to system-start zone only: check parent g.at translate x
      const g = t.closest("g.at") as SVGGElement | null;
      const tf = g?.getAttribute("transform") ?? "";
      const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
      if (!m) return;
      const gx = parseFloat(m[1]);
      if (!Number.isFinite(gx) || gx >= 90) return; // preserve right-edge glyphs
      t.setAttribute("display", "none");
      console.log(`🙈 TAB_HIDE_LOOSE svg[${svgIdx}] gx=${gx.toFixed(1)}`);
    });
  }
}

function findTabClefX(svg: SVGSVGElement): number | null {
  let best: number | null = null;
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)/);
    if (!m) return;
    const gx = parseFloat(m[1]);
    if (gx >= 90) return;
    const txt = (g.querySelector("text")?.textContent ?? "").trim();
    if (!txt || /^[\x20-\x7E]+$/.test(txt)) return;
    if (best === null || gx < best) best = gx;
  });
  return best;
}

function nudgeRow1BarNumber(svg: SVGSVGElement, svgIdx: number): void {
  if (svgIdx !== 2) return;
  const tabX = findTabClefX(svg);
  if (tabX === null) return;
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (t.getAttribute("fill") !== "#C80000") return;
    if (!(t.getAttribute("style") ?? "").includes("11px Arial")) return;
    if ((t.textContent ?? "").trim() !== "1") return;
    t.setAttribute("x", String(tabX - 2));
  });
}

function hideTechniqueBeatTexts(svg: SVGSVGElement, svgIdx: number): void {
  let hidden = 0;
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    const txt = (t.textContent ?? "").trim();
    if (!txt) return;
    const style = t.getAttribute("style") ?? "";
    if (
      !(
        style.includes("italic") &&
        style.includes("Georgia") &&
        !style.includes("bold")
      )
    )
      return;
    if (KEEP_TECH_TEXT_PAT.test(txt)) return;
    if (TECH_TEXT_PAT.test(txt)) {
      t.setAttribute("display", "none");
      hidden++;
      return;
    }
    const hasSpace = /\s/.test(txt),
      isLong = txt.length >= 28;
    const looksLikeSentence =
      /[.!,;]/.test(txt) ||
      /\b(to|when|then|than|with|but|because|follow|remember|listen|used)\b/i.test(
        txt,
      );
    if (hasSpace && isLong && looksLikeSentence) {
      t.setAttribute("display", "none");
      hidden++;
    }
  });
  if (hidden > 0)
    console.log(`  🙈 HIDE_TECH_TEXT svg[${svgIdx}] hidden=${hidden}`);
}

function applyLyricLaneNormalization(svg: SVGSVGElement): void {
  const renderedH = svg.getBoundingClientRect().height;
  if (renderedH < 40) return;
  const lyricTarget = renderedH - LYRIC_MARGIN;
  svg.querySelectorAll<SVGTextElement>("text").forEach((el) => {
    const text = (el.textContent ?? "").trim();
    if (TECH_TEXT_PAT.test(text) || KEEP_TECH_TEXT_PAT.test(text)) return;
    if (el.getAttribute("data-maestro-lane")) return;
    const style = el.getAttribute("style") ?? "";
    if (!style.includes("italic") || !style.includes("Georgia")) return;
    if (TRACK_LABELS.test(text) || NOT_LYRIC.test(text)) return;
    if (isChordSymbol(el)) return;
    el.setAttribute("y", String(lyricTarget));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Lane normalization (DOM writes)
// ─────────────────────────────────────────────────────────────────────────────

function runPhase2Normalization(
  host: HTMLElement,
  surfaceEl: HTMLElement | null,
): void {
  try {
    console.log("🧪 gp8LayoutEngine v6 clean rewrite active");

    // Tuning SVG (index 1) — AlphaTab renders tuning info here.
    // Do NOT hide it; it contains the tuning display that GP files expose.
    // (Previously hidden here — confirmed cause of missing tuning display.)

    const SS_BASELINE: Record<string, number> = {
      tempo: 175,
      normal: 157,
      halftime: 179,
      title: 0,
      tuning: 0,
    };
    console.group("🔬 V102.7 ROW GEOMETRY (post-patch)");
    host.querySelectorAll("svg").forEach((svg, si) => {
      const h = Math.round(svg.getBoundingClientRect().height);
      const textNodes = Array.from(
        svg.querySelectorAll<SVGTextElement>("text"),
      );
      const boldNodes = textNodes.filter((t) =>
        (t.getAttribute("style") ?? "").includes("bold 14px Georgia"),
      );
      const hasTempo = textNodes.some((t) =>
        /^ ?= \d+$/.test((t.textContent ?? "").trim()),
      );
      const markers = boldNodes
        .map((t) => (t.textContent ?? "").trim().slice(0, 15))
        .filter(Boolean);
      const hasLyrics = textNodes.some((t) => {
        const s = t.getAttribute("style") ?? "";
        return (
          s.includes("italic") &&
          s.includes("Georgia") &&
          !s.includes("ideographic")
        );
      });
      const rowType =
        si === 0
          ? "title"
          : si === 1
            ? "tuning"
            : hasTempo && markers.some((m) => /half.?time/i.test(m))
              ? "halftime"
              : hasTempo
                ? "tempo"
                : "normal";
      const baseline = SS_BASELINE[rowType] ?? 157;
      const delta = baseline > 0 ? h - baseline : 0;
      const flag = delta > 10 ? "⬆️ TALL" : delta < -10 ? "⬇️ SHORT" : "✅";
      console.log(
        `  svg[${si}] ${flag} h=${h} (SS=${baseline} Δ=${delta > 0 ? "+" : ""}${delta}) type=${rowType}`,
        { markers, hasLyrics, hasTempo },
      );
    });
    console.groupEnd();

    // M1 geometry diagnostic
    const row1Svg = host.querySelectorAll("svg")[2] as
      | SVGSVGElement
      | undefined;
    if (row1Svg) {
      console.group("🔬 M1 ROW GEOMETRY DIAGNOSTIC");
      const barXs = Array.from(row1Svg.querySelectorAll<SVGTextElement>("text"))
        .filter(
          (t) =>
            t.getAttribute("fill") === "#C80000" &&
            (t.getAttribute("style") ?? "").includes("11px Arial"),
        )
        .map((t) => parseFloat(t.getAttribute("x") ?? "0"))
        .sort((a, b) => a - b);
      console.log(
        `  row width: ${row1Svg.getBoundingClientRect().width.toFixed(0)}px | measures: ${barXs.length}`,
      );
      console.log(
        `  bar start Xs: [${barXs.map((x) => x.toFixed(0)).join(", ")}]`,
      );
      console.log(
        `  system-start block width: ${barXs[0]?.toFixed(1) ?? "n/a"}px`,
      );
      ["Intro", "= 139", "tuning:", "fx:", "P.M."].forEach((k) => {
        row1Svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
          const txt = (t.textContent ?? "").trim();
          if (!txt.startsWith(k)) return;
          let bx = 0,
            bw = 0;
          try {
            const b = t.getBBox();
            bx = b.x;
            bw = b.width;
          } catch {
            /* skip */
          }
          console.log(
            `  SPAN "${txt.slice(0, 45)}" x=${t.getAttribute("x")} bbox=[${bx.toFixed(1)}, ${(bx + bw).toFixed(1)}] w=${bw.toFixed(1)}`,
          );
        });
      });
      console.groupEnd();
    }

    host.querySelectorAll("svg").forEach((svg, svgIdx) => {
      const isRow1 = svgIdx === 2;
      const svgEl = svg as SVGSVGElement;

      if (isRow1) {
        console.group("🔬 V102.7 ROW 1 — all <text> nodes");
        svgEl.querySelectorAll<SVGTextElement>("text").forEach((t, i) => {
          let box: DOMRect | null = null;
          try {
            box = t.getBBox() as unknown as DOMRect;
          } catch {
            /* skip */
          }
          console.log(`  [${i}] "${(t.textContent ?? "").trim()}"`, {
            x: t.getAttribute("x"),
            y: t.getAttribute("y"),
            style: t.getAttribute("style")?.slice(0, 80),
            bboxX: box?.x?.toFixed(2),
            bboxW: box?.width?.toFixed(2),
          });
        });
        console.groupEnd();
        console.group("🔬 V102.7 ROW 1 — all g.at nodes");
        svgEl.querySelectorAll<SVGGElement>("g.at").forEach((g, i) => {
          const content = (g.querySelector("text")?.textContent ?? "").trim();
          console.log(`  [${i}] transform="${g.getAttribute("transform")}"`, {
            codePoints: [...content].map((c) => c.codePointAt(0)?.toString(16)),
            isNonAscii: content.length > 0 && !/^[\x20-\x7E]+$/.test(content),
          });
        });
        console.groupEnd();
      }

      // ── Section A: Row anchors ────────────────────────────────────────
      const allTextNodes = Array.from(
        svgEl.querySelectorAll<SVGTextElement>("text"),
      );
      // systemStartZoneMaxX must be computed before findBarNumberY so we can
      // pass it as minX — this excludes the system-start column bar numbers
      // (e.g. x≈64) whose y can differ by 1px and skew the mode on short rows.
      const systemStartZoneMaxX = findSystemStartZoneMaxX(svgEl);
      const barNumberY = findBarNumberY(allTextNodes, systemStartZoneMaxX);

      // ── Diagnostic: confirm mode-based barNumberY per row ─────────────────
      if (isRow1 || svgIdx <= 4) {
        const allBarYs = allTextNodes
          .filter(
            (t) =>
              t.getAttribute("fill") === "#C80000" &&
              (t.getAttribute("style") ?? "").includes("11px Arial"),
          )
          .map((t) => ({
            x: parseFloat(t.getAttribute("x") ?? "NaN"),
            y: parseFloat(t.getAttribute("y") ?? "NaN"),
          }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
        const included = allBarYs.filter((p) => p.x >= systemStartZoneMaxX);
        const excluded = allBarYs.filter((p) => p.x < systemStartZoneMaxX);
        console.log(`🧭 BAR_NUMBER_Y svg[${svgIdx}]`, {
          resolved: barNumberY,
          includedCount: included.length,
          excludedCount: excluded.length,
          includedYs: included.map((p) => p.y).sort((a, b) => a - b),
          excludedYs: excluded.map((p) => p.y),
        });
      }
      const sectionLabelNode = collectSectionLabelNode(allTextNodes);
      const allTempoNodes = collectTempoNodes(allTextNodes);
      const hasTempoNode = allTempoNodes.length > 0;
      const laneMap: RowLaneMap | null =
        barNumberY !== null
          ? buildRowLaneMap(svgEl, barNumberY, systemStartZoneMaxX, svgIdx)
          : null;
      const pmLane1Y: number = laneMap?.lane1RailY ?? 40;

      // ── Section B: System-start cluster ──────────────────────────────
      applyTempoClusterForSvg(
        svgEl,
        svgIdx,
        {
          barNumberY,
          lane1TextHangingY: laneMap?.lane1TextHangingY ?? null,
          lane2TextHangingY: laneMap?.lane2TextHangingY ?? null,
          pmRailY: laneMap?.lane1RailY ?? null,
          systemStartZoneMaxX,
          bar1X: findFirstPlayableBarX(allTextNodes),
          sectionLabelNode,
          tempoNodes: allTempoNodes,
        },
        { mode: "lane", debugBox: true },
      );
      if (barNumberY !== null) {
        // Gate PM rail normalization: only run on rows that have actual PM
        // content. Vocal, bass, keyboard, drum tracks have no PM rails — skip
        // them to avoid the "no rail/end-cap rects found" warning spam.
        const hasPmContent =
          allTextNodes.some((t) =>
            /^P\.M/.test((t.textContent ?? "").trim()),
          ) ||
          Array.from(svgEl.querySelectorAll<SVGRectElement>("rect")).some(
            (r: SVGRectElement) => {
              const h = parseFloat(r.getAttribute("height") ?? "0");
              const ry = parseFloat(r.getAttribute("y") ?? "999");
              return (
                r.getAttribute("fill") === "#000000" &&
                h > 1.0 &&
                h < 2.0 &&
                barNumberY !== null &&
                ry >= barNumberY - 14 &&
                ry <= barNumberY - 4
              );
            },
          );

        if (hasPmContent) {
          applySystemStartPalmMuteRailNormalization(
            svgEl,
            svgIdx,
            barNumberY,
            pmLane1Y,
            systemStartZoneMaxX,
          );
        }
        applySystemStartClusterNormalization(
          svgIdx,
          allTextNodes,
          barNumberY,
          pmLane1Y,
          systemStartZoneMaxX,
          sectionLabelNode,
          allTempoNodes,
          svgEl,
        );
        applySystemStartTechniqueGlyphNormalization(
          svgEl,
          svgIdx,
          allTextNodes,
          barNumberY,
          pmLane1Y,
          systemStartZoneMaxX,
        );
      }

      // ── Section C: General annotation lanes ──────────────────────────
      applySectionMarkerNormalization(
        svgIdx,
        allTextNodes,
        barNumberY,
        hasTempoNode,
        sectionLabelNode,
        isRow1,
        laneMap,
      );
      if (barNumberY !== null) {
        applyPmTextNormalization(
          svgIdx,
          allTextNodes,
          pmLane1Y,
          systemStartZoneMaxX,
        );
        // Beat-annotation normalization disabled — technique texts hidden below
        // applyBeatAnnotationLaneNormalization(...)
        applyChordLaneNormalization(svgIdx, allTextNodes, laneMap);
        applyGeneralEndCapRailNormalization(
          svgEl,
          svgIdx,
          pmLane1Y,
          systemStartZoneMaxX,
        );
        applyTechniqueGlyphNormalization(
          svgEl,
          svgIdx,
          allTextNodes,
          barNumberY,
          pmLane1Y,
          systemStartZoneMaxX,
        );
      }

      // ── Section D: Lyric lane ─────────────────────────────────────────
      nudgeRow1BarNumber(svgEl, svgIdx);
      hideRepeatedTabGlyph(svgEl, svgIdx);
      hideTechniqueBeatTexts(svgEl, svgIdx);
      applyLyricLaneNormalization(svgEl);
    });

    console.group("🔬 V102.7 POST-PATCH marker values");
    host.querySelectorAll("svg").forEach((svg, si) => {
      svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
        const style = t.getAttribute("style") ?? "";
        if (!style.includes("bold 14px Georgia")) return;
        if (parseFloat(t.getAttribute("y") ?? "0") > 120) return;
        console.log(
          `  svg[${si}] "${(t.textContent ?? "").trim().slice(0, 20)}" y=${t.getAttribute("y")}`,
        );
      });
    });
    console.groupEnd();

    const obs = new MutationObserver(() => {
      /* section markers excluded from re-patch */
    });
    obs.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["y"],
    });
    setTimeout(() => obs.disconnect(), 5000);
  } catch (e) {
    console.warn("⚠️ V102.6 lane normalization failed:", e);
  } finally {
    if (surfaceEl) surfaceEl.style.visibility = "visible";
  }
}
