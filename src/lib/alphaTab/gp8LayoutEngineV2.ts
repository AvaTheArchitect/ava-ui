"use client";
/**
 * gp8LayoutEngineV2.ts
 * Date: April 14th, 2026 — v2.3 (diagnose-first, non-destructive scaffolding)
 *
 * MODE flag controls what this engine writes to the DOM:
 *   "diagnose"   → zero DOM writes; logs row anchors + category counts only
 *   "lyricsOnly" → pins lyrics to basement; nothing else touched
 *   "full"       → all lanes (not yet implemented; promote from lyricsOnly when stable)
 *
 * Rules:
 *   - <g> elements are NEVER moved (composite ornaments are multi-primitive)
 *   - Bar numbers (fill #C80000 + 11px Arial + digits) are NEVER touched
 *   - Lyrics run after 2× rAF to guarantee layout is painted
 *   - SVG height resolution: attr → viewBox → getBoundingClientRect (in that order)
 */

import {
  LaneType,
  ABOVE_STAFF_LANES,
  LANE_Y_OFFSET,
  LANE_ROW_HEIGHT,
  LANE_GAP,
  classifyText,
  classifyGlyphGroup,
} from "@/lib/alphaTab/gp8LaneMapV2";
import { applyTempoClusterForSvg } from "@/lib/alphaTab/TempoClusterManager";

// ─── Mode flag ────────────────────────────────────────────────────────────────

type EngineMode = "diagnose" | "lyricsOnly" | "full";
const MODE: EngineMode = "lyricsOnly"; // 👈 promote when each layer is confirmed correct

// ─── Lyric guards (ported from gp8LayoutEngine v6.1) ─────────────────────────

const TECH_TEXT_PAT =
  /^(fx:|tuning:|N\.B\.|flanger|wah|vol\.|vibrato|harm\.|A\.H\.|N\.H\.|T\.H\.|whammy|echo|delay|phase|comp|dist|crunch|overdrive|chorus|reverb|trem\.|uni-|octave|pitch|talk|ring|sustain|let\s*ring|dive\s*bomb)/i;
const KEEP_TECH_TEXT_PAT =
  /^(finger slide|pick slide|turn volume knob to \d+|three whammy dips?)$/i;
const TRACK_LABELS = /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i;
const NOT_LYRIC =
  /^Guitar\s|^Bass\s|^Drum|^Vocal|^Piano|^Standard\s|^Drop\s|^Tuning|^Tune\s|^half\s|^step|^standard|Eb|Bb|Gb|Db|Ab|= Eb|= Bb/i;

const LYRIC_MARGIN = 14; // px from bottom of SVG container (matches v6.1)

// ─── Element guards ───────────────────────────────────────────────────────────

function isBarNumber(el: SVGElement): boolean {
  const fill = (el.getAttribute("fill") ?? "").toLowerCase();
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  const text = (el.textContent ?? "").trim();
  return (
    fill === "#c80000" && style.includes("11px arial") && /^\d+\s*$/.test(text)
  );
}

function isLyricText(el: SVGElement): boolean {
  if (isBarNumber(el)) return false;
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  const anchor = el.getAttribute("text-anchor") ?? "";
  if (anchor !== "middle") return false;
  if (!style.includes("italic") || !style.includes("georgia")) return false;
  if (style.includes("bold")) return false;
  if (style.includes("ideographic")) return false; // rotated track labels
  const text = (el.textContent ?? "").trim();
  if (!text) return false;
  if (TECH_TEXT_PAT.test(text)) return false;
  if (KEEP_TECH_TEXT_PAT.test(text)) return false;
  if (TRACK_LABELS.test(text)) return false;
  if (NOT_LYRIC.test(text)) return false;
  if (/^\s*=\s*\d+/.test(text)) return false;
  if (
    /^(intro|verse|chorus|bridge|half.time|double.time|main riff)/i.test(text)
  )
    return false;
  return true;
}

// ─── Row anchor detection ─────────────────────────────────────────────────────

const STAFF_LINE_FILL = "#a5a5a5"; // lowercase for getAttribute comparison (AlphaTab emits uppercase #A5A5A5)

interface RowAnchors {
  barNumberY: number;
  staffTopY: number;
  staffBottomY: number;
  svgHeight: number; // reliable height for lyric pinning
}

/** Resolves SVG height: attr → viewBox → getBoundingClientRect (in that order). */
function getSvgHeight(svg: SVGSVGElement): number {
  const attr = parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(attr) && attr > 40) return attr;
  const vb = svg.viewBox?.baseVal?.height ?? 0;
  if (vb > 40) return vb;
  return svg.getBoundingClientRect().height;
}

function getRowAnchors(svg: SVGSVGElement): RowAnchors {
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

function isStaffSvg(svg: SVGSVGElement): boolean {
  // CSS attribute selectors are case-sensitive; AlphaTab emits fill="#A5A5A5"
  // (uppercase) so we must compare via getAttribute + toLowerCase.
  return Array.from(svg.querySelectorAll<SVGRectElement>("rect")).some((r) => {
    const fill = (r.getAttribute("fill") ?? "").toLowerCase();
    const h = parseFloat(r.getAttribute("height") ?? "0");
    const w = parseFloat(r.getAttribute("width") ?? "0");
    return fill === "#a5a5a5" && h > 0.5 && h < 2.0 && w > 20;
  });
}

// ─── Diagnose pass (zero DOM writes) ─────────────────────────────────────────

function diagnoseRow(svg: SVGSVGElement, i: number, anchors: RowAnchors): void {
  const texts = Array.from(svg.querySelectorAll<SVGElement>("text"));

  let barNums = 0,
    tempos = 0,
    sections = 0;
  let lyricCandidates = 0,
    techText = 0,
    mysteryItalic = 0;

  texts.forEach((el) => {
    const text = (el.textContent ?? "").trim();
    const style = (el.getAttribute("style") ?? "").toLowerCase();
    const isItalicGeorgia =
      style.includes("italic") &&
      style.includes("georgia") &&
      !style.includes("bold");

    if (isBarNumber(el)) {
      barNums++;
      return;
    }
    if (/^\s*=\s*\d+/.test(text) && style.includes("bold")) {
      tempos++;
      return;
    }
    if (style.includes("bold") && style.includes("georgia")) {
      sections++;
      return;
    }
    if (isLyricText(el)) {
      lyricCandidates++;
      return;
    }
    if (isItalicGeorgia && TECH_TEXT_PAT.test(text)) {
      techText++;
      return;
    }
    if (isItalicGeorgia) {
      mysteryItalic++;
    }
  });

  console.log(
    `[V2:diagnose] row[${i}]`,
    `staffTop=${anchors.staffTopY.toFixed(1)}`,
    `staffBot=${anchors.staffBottomY.toFixed(1)}`,
    `barNumY=${anchors.barNumberY.toFixed(1)}`,
    `svgH=${anchors.svgHeight.toFixed(1)}`,
    `| barNums=${barNums}`,
    `tempos=${tempos}`,
    `sections=${sections}`,
    `lyrics=${lyricCandidates}`,
    `techText=${techText}`,
    `mysteryItalic=${mysteryItalic}`,
  );

  // Warn if any lyric candidates exist but svgHeight looks wrong
  if (lyricCandidates > 0 && anchors.svgHeight < 40) {
    console.warn(
      `[V2:diagnose] row[${i}] ⚠️ svgHeight=${anchors.svgHeight} is too small — lyrics won't pin correctly`,
    );
  }
}

// ─── Lyrics pass (text only, timing-safe) ────────────────────────────────────

function fixLyrics(svg: SVGSVGElement, anchors: RowAnchors): number {
  const { svgHeight } = anchors;
  if (svgHeight < 40) return 0;

  const targetY = svgHeight - LYRIC_MARGIN;
  const before: { txt: string; y: string | null }[] = [];
  let moved = 0;

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (!isLyricText(el)) return;
    before.push({
      txt: (el.textContent ?? "").trim(),
      y: el.getAttribute("y"),
    });
    el.setAttribute("y", String(targetY));
    moved++;
  });

  if (before.length) {
    console.log(
      `[V2] fixLyrics found=${before.length} targetY=${targetY.toFixed(1)} svgH=${svgHeight.toFixed(1)}`,
      before.slice(0, 6),
    );
  }

  return moved;
}

// ─── Bar number 1 X alignment ─────────────────────────────────────────────────

// ─── Bar number X alignment (all rows) ───────────────────────────────────────

/**
 * fixBar1X — first staff row only. Pins bar "1" past the clef/time sig.
 * fixDisplacedBarNumbers — all rows. Handles mid-row time sig changes
 * (e.g. 3/4 → 4/4) that push bar numbers right of their barline.
 *
 * Strategy: for each bar number, find the nearest vertical barline to its
 * left and position the number 2px inside it. Barlines = dark narrow tall rects.
 */
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
      `[V2] fixBar1X: x ${currentX.toFixed(1)} → ${targetX.toFixed(1)} (staffStart=${staffStartX})`,
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
    // Stricter barline DNA: #222211 only (not generic #000000), narrow, ≥80% staff height,
    // and y must land within the staff band (not a PM rail or other artifact)
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
    // Deduplicate to 0.5px
    const key = Math.round(x * 2) / 2;
    if (seen.has(key)) return;
    seen.add(key);
    barlineXs.push(x);
  });

  if (!barlineXs.length) return 0;
  barlineXs.sort((a, b) => a - b);

  const MIN_DISPLACEMENT = 18; // px — correctly-placed numbers sit 2–5px from barline
  const BAR_NUM_PAD = 2; // px inside barline edge

  let moved = 0;
  svg.querySelectorAll<SVGTextElement>("text").forEach((t) => {
    if (!isBarNumber(t)) return;
    const barText = (t.textContent ?? "").trim().replace(/\s+/g, "");
    if (barText === "1") return;

    const currentX = parseFloat(t.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(currentX)) return;

    // Nearest barline strictly to the LEFT, no lookahead
    const nearestLeft = barlineXs.filter((x) => x < currentX).at(-1);
    if (nearestLeft === undefined) return;

    const targetX = nearestLeft + BAR_NUM_PAD;
    const displacement = currentX - targetX;
    if (displacement < MIN_DISPLACEMENT) return;

    t.setAttribute("x", String(targetX));
    console.log(
      `[V2] fixDisplacedBarNumbers row[${rowIdx}] "${barText}"`,
      `x ${currentX.toFixed(1)}→${targetX.toFixed(1)}`,
      `| barline=${nearestLeft.toFixed(1)} disp=${displacement.toFixed(1)}px`,
    );
    moved++;
  });

  if (moved)
    console.log(
      `[V2] fixDisplacedBarNumbers row[${rowIdx}] total moved=${moved}`,
    );
  return moved;
}

// ─── TAB clef deduplication ───────────────────────────────────────────────────

/**
 * hideRepeatedTabClef — keeps the TAB clef only on the first staff row.
 * Subsequent rows hide it via display:none (safe — not a translate, no shattering).
 *
 * Detection: g.at with non-ASCII text content at x < 90 (system-start zone).
 * Right-edge glyphs (repeat dots, codas, segno) are protected by the x < 90 gate.
 */
function hideRepeatedTabClef(svg: SVGSVGElement): void {
  let hidden = 0;
  svg.querySelectorAll<SVGGElement>("g.at").forEach((g) => {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)/);
    if (!m) return;
    const gx = parseFloat(m[1]);
    if (gx >= 90) return; // only system-start zone
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content)) return; // skip ASCII/empty
    g.setAttribute("display", "none");
    hidden++;
  });
  if (hidden) console.log(`[V2] hideRepeatedTabClef: hidden=${hidden} glyphs`);
}
// ─── Section label X alignment ────────────────────────────────────────────────

/**
 * fixSectionLabelX — snaps section label X to its bar's barline.
 * Y is NOT changed here. X-only pass.
 *
 * Evidence:
 *   bar #1  x=49,      Intro     x=115.9  → should be 49
 *   bar #9  x=609.35,  Main Riff x=622.19 → should be 609.35
 */
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

  const TOL = 10; // px tolerance — label may sit slightly right of its barline
  const SECTION_PAD = -2; // px — section labels sit just LEFT of the barline (Songsterr style)

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (isBarNumber(el)) return;
    if (el.hasAttribute("data-maestro") || el.hasAttribute("data-maestro-lane"))
      return;
    if (!isHeaderBoldGeorgia(el)) return;
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    if (RX_SECTION_SKIP.test(text)) return;
    if (RX_TEMPO_TEXT.test(text)) return;
    // Note: RX_TEMPO_CONTEXT (Half Time / Double Time) is intentionally NOT excluded here
    // — we want X alignment for all bold section/context labels, just not Y (fixHeaderStack owns Y)

    const currentX = parseFloat(el.getAttribute("x") ?? "NaN");
    if (!Number.isFinite(currentX)) return;

    const nearestLeft = barlineXs.filter((x) => x <= currentX + TOL).at(-1);
    if (nearestLeft === undefined) return;

    const targetX = nearestLeft + SECTION_PAD;
    if (Math.abs(currentX - targetX) < 1) return;

    el.setAttribute("x", String(targetX));
    console.log(
      `[V2] fixSectionX row[${rowIdx}] "${text.slice(0, 20)}"`,
      `x ${currentX.toFixed(1)}→${targetX.toFixed(1)} | barline=${nearestLeft.toFixed(1)}`,
    );
  });
}

// ─── Header stack ─────────────────────────────────────────────────────────────

/**
 * Header lane Y — anchored to barNumberY for consistent visual gap above bar numbers.
 *
 *   Section (Intro/Verse/Chorus): barNumberY - 20  → ~20px above bar number
 *   TempoContext (Half Time):     barNumberY - 45  → floats ABOVE the tempo cluster
 *
 * Songsterr rule (discovered via spy): when a tempo cluster and section/context label
 * share the same bar, the section label has HIGHER visual priority and floats above
 * the tempo cluster — not between it and the bar number.
 *
 * Example (Half Time row, barNumY=46.5):
 *   Half Time → 46.5 - 45 = 1.5 (top of SVG, above = 60 cluster at ~27)  ✓
 * Example (full-height row, barNumY=99.5):
 *   Half Time → 99.5 - 45 = 54.5 (well above staff top) ✓
 */
const HEADER_SECTION_GAP = 20; // barNumberY - 20
const HEADER_TEMPO_CONTEXT_GAP = 45; // barNumberY - 45  (above tempo cluster)

const RX_TEMPO_TEXT = /^\s*=\s*\d+\s*$/;
const RX_TEMPO_CONTEXT = /^(half[\s-]?time|double[\s-]?time)$/i;
const RX_SECTION_SKIP = /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i; // track labels

function isHeaderBoldGeorgia(el: SVGElement): boolean {
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  return style.includes("bold") && style.includes("georgia");
}

/**
 * fixHeaderStack — pins section labels, tempo-context markers, and tempo text
 * to consistent lanes relative to barNumberY.
 *
 * Text-only. No <g> moves. Tempo glyph groups are untouched.
 */
function fixHeaderStack(
  svg: SVGSVGElement,
  anchors: RowAnchors,
  rowIdx: number,
): void {
  const { staffTopY, barNumberY } = anchors;

  const maxY = staffTopY - 4; // never push into the staff
  const sectionY = barNumberY - HEADER_SECTION_GAP;
  const tempoCtxY = barNumberY - HEADER_TEMPO_CONTEXT_GAP;

  // Skip if there's no room (very short SVGs like title/tuning that slipped through)
  if (sectionY < 2) {
    console.log(
      `[V2] fixHeaderStack row[${rowIdx}] skipped — barNumberY=${barNumberY.toFixed(1)} too small`,
    );
    return;
  }

  let sections = 0,
    tempoCtx = 0;

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (isBarNumber(el)) return;
    // TempoClusterManager owns all tempo text — never touch it here
    if (el.hasAttribute("data-maestro") || el.hasAttribute("data-maestro-lane"))
      return;
    if (!isHeaderBoldGeorgia(el)) return;

    const text = (el.textContent ?? "").trim();
    if (!text) return;
    if (RX_SECTION_SKIP.test(text)) return;
    // Tempo text belongs to TempoClusterManager — skip even if untagged
    if (RX_TEMPO_TEXT.test(text)) return;

    const currentY = parseFloat(el.getAttribute("y") ?? "NaN");
    let rawTarget: number;
    let lane: string;

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
      `[V2] fixHeaderStack row[${rowIdx}] ${lane} "${text.slice(0, 20)}"`,
      `y ${currentY.toFixed(1)}→${targetY.toFixed(1)}`,
    );
  });

  if (sections + tempoCtx > 0) {
    console.log(
      `[V2] fixHeaderStack row[${rowIdx}] sections=${sections} tempoCtx=${tempoCtx}`,
    );
  }
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

function getBBox(el: SVGElement): DOMRect | null {
  try {
    return (el as SVGGraphicsElement).getBBox();
  } catch {
    return null;
  }
}

interface LaneItem {
  el: SVGElement;
  lane: LaneType;
  xStart: number;
  xEnd: number;
}
interface LaneSlot {
  lane: LaneType;
  y: number;
  items: LaneItem[];
}
interface RowPlan {
  slots: LaneSlot[];
  topHeadroom: number;
}

function collectCandidates(
  svg: SVGSVGElement,
  anchors: RowAnchors,
): LaneItem[] {
  const items: LaneItem[] = [];
  const { staffTopY } = anchors;

  // text only — <g> elements are never moved
  svg.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
    if (isBarNumber(el)) return;
    if (isLyricText(el)) return;
    const bb = getBBox(el);
    if (!bb || bb.y + bb.height >= staffTopY) return;
    const lane = classifyText(el);
    if (lane === null) return;
    items.push({ el, lane, xStart: bb.x, xEnd: bb.x + bb.width });
  });

  return items;
}

function packLane(items: LaneItem[]): LaneItem[][] {
  const sorted = [...items].sort((a, b) => a.xStart - b.xStart);
  const subRows: LaneItem[][] = [];
  for (const item of sorted) {
    let placed = false;
    for (const row of subRows) {
      const overlaps = row.some(
        (r) => r.xStart < item.xEnd && r.xEnd > item.xStart,
      );
      if (!overlaps) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) subRows.push([item]);
  }
  return subRows;
}

function buildRowPlan(candidates: LaneItem[], anchors: RowAnchors): RowPlan {
  const { staffTopY } = anchors;
  const byLane = new Map<LaneType, LaneItem[]>();
  for (const item of candidates) {
    if (!byLane.has(item.lane)) byLane.set(item.lane, []);
    byLane.get(item.lane)!.push(item);
  }
  const slots: LaneSlot[] = [];
  let maxOffset = 0;
  for (const lane of ABOVE_STAFF_LANES) {
    const items = byLane.get(lane);
    if (!items?.length) continue;
    const baseY = staffTopY - LANE_Y_OFFSET[lane];
    const subRows = packLane(items);
    const h = LANE_ROW_HEIGHT[lane];
    subRows.forEach((sub, subIdx) => {
      const slotY = baseY - subIdx * (h + LANE_GAP);
      slots.push({ lane, y: slotY, items: sub });
      const offset = staffTopY - slotY;
      if (offset > maxOffset) maxOffset = offset;
    });
  }
  return { slots, topHeadroom: maxOffset };
}

function applyRowPlan(plan: RowPlan): void {
  for (const slot of plan.slots) {
    const rowBottom = slot.y + LANE_ROW_HEIGHT[slot.lane];
    for (const { el } of slot.items) {
      el.setAttribute("y", String(rowBottom)); // text only; no <g> writes
    }
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function runGp8LayoutEngineV2(containerEl: HTMLElement): void {
  console.log(`[V2] runGp8LayoutEngineV2 called — MODE="${MODE}"`);

  const run = () => {
    let firstStaffRowSeen = false;

    const svgRows =
      containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg");
    console.log("[V2] svg.at-surface-svg rows found:", svgRows.length);

    svgRows.forEach((svg, i) => {
      if (!isStaffSvg(svg)) {
        console.log(`[V2] row[${i}] skipped (no staff lines)`);
        return;
      }

      const anchors = getRowAnchors(svg);

      // Always diagnose, regardless of mode
      diagnoseRow(svg, i, anchors);

      if (MODE === "diagnose") return; // 🔒 zero DOM writes

      // Lyrics pass — runs in lyricsOnly + full
      const lyricsMoved = fixLyrics(svg, anchors);
      if (lyricsMoved) {
        console.log(
          `[V2] row[${i}] lyrics pinned: ${lyricsMoved} nodes → y=${(anchors.svgHeight - LYRIC_MARGIN).toFixed(1)}`,
        );
      }

      // Bar number alignment
      if (!firstStaffRowSeen) fixBar1X(svg);
      fixDisplacedBarNumbers(svg, anchors, i);

      // TAB clef: keep on first staff row, hide on all subsequent rows
      if (firstStaffRowSeen) hideRepeatedTabClef(svg);

      // Section label X alignment — snap to same barline anchor as bar numbers
      fixSectionLabelX(svg, anchors, i);

      // Header stack: section Y lane + tempo-context Y lane (tempo owned by TempoClusterManager)
      fixHeaderStack(svg, anchors, i);

      // Tempo cluster — pass V2 anchors in "native" mode (no V1 lane map needed)
      // TempoClusterManager owns all tempo text Y/glyph positioning from here.
      const allTextNodes = Array.from(
        svg.querySelectorAll<SVGTextElement>("text"),
      );
      const tempoNodes = allTextNodes.filter((t) => {
        const norm = (t.textContent ?? "").replace(/\u00A0/g, " ").trim();
        return /^=\s*\d+\s*$/.test(norm);
      });
      const sectionLabelNode =
        allTextNodes.find((t) => {
          const style = (t.getAttribute("style") ?? "").toLowerCase();
          if (!style.includes("bold") || !style.includes("georgia"))
            return false;
          const txt = (t.textContent ?? "").trim();
          return !!txt && !/^=\s*\d+/.test(txt) && !TRACK_LABELS.test(txt);
        }) ?? null;

      if (tempoNodes.length > 0) {
        applyTempoClusterForSvg(
          svg,
          i,
          {
            barNumberY: anchors.barNumberY,
            bar1X: null,
            sectionLabelNode,
            tempoNodes,
          },
          { mode: "native", debugBox: false },
        );
      }

      firstStaffRowSeen = true;

      // Above-staff lane pass — only in full mode
      if (MODE === "full") {
        const candidates = collectCandidates(svg, anchors);
        if (candidates.length) {
          const plan = buildRowPlan(candidates, anchors);
          applyRowPlan(plan);
          svg.dataset["laneHeadroom"] = String(plan.topHeadroom);
        }
      }
    });
  };

  // Two rAF frames: first ensures AlphaTab paint is complete,
  // second ensures getBoundingClientRect reflects final layout.
  requestAnimationFrame(() => requestAnimationFrame(run));
}
