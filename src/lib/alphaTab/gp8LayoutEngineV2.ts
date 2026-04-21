"use client";
/**
 * gp8LayoutEngineV2.ts
 * Date: April 21st, 2026 — v2.4 (GP8-only; universal patches extracted)
 *
 * v2.4 CHANGES:
 * ✅ Universal patches (fixBar1X, fixDisplacedBarNumbers, hideRepeatedTabClef,
 *    fixSectionLabelX, fixHeaderStack) extracted to universalLayoutPatches.ts.
 *    Shared helpers (isBarNumber, isStaffSvg, getRowAnchors, RowAnchors, etc.)
 *    imported from there.
 * 🔒 GP8-only retained: fixLyrics, isLyricText, diagnoseRow, TempoClusterManager,
 *    MODE flag, full lane system (collectCandidates / buildRowPlan / applyRowPlan).
 *
 * MODE flag controls what this engine writes to the DOM:
 *   "diagnose"   → zero DOM writes; logs row anchors + category counts only
 *   "lyricsOnly" → pins lyrics to basement; nothing else touched
 *   "full"       → all lanes (not yet implemented; promote from lyricsOnly when stable)
 */

import {
  RowAnchors,
  isBarNumber,
  isHeaderBoldGeorgia,
  isStaffSvg,
  getRowAnchors,
  RX_TEMPO_TEXT,
  RX_SECTION_SKIP,
} from "@/lib/alphaTab/universalLayoutPatches";
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

const LYRIC_MARGIN = 14;

// ─── Lyric helpers ────────────────────────────────────────────────────────────

function isLyricText(el: SVGElement): boolean {
  if (isBarNumber(el)) return false;
  const style = (el.getAttribute("style") ?? "").toLowerCase();
  const anchor = el.getAttribute("text-anchor") ?? "";
  if (anchor !== "middle") return false;
  if (!style.includes("italic") || !style.includes("georgia")) return false;
  if (style.includes("bold")) return false;
  if (style.includes("ideographic")) return false;
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

// ─── Diagnose pass (zero DOM writes, GP8 — uses isLyricText) ─────────────────

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
    if (isItalicGeorgia) mysteryItalic++;
  });

  console.log(
    `[GP8:diagnose] row[${i}]`,
    `staffTop=${anchors.staffTopY.toFixed(1)}`,
    `staffBot=${anchors.staffBottomY.toFixed(1)}`,
    `barNumY=${anchors.barNumberY.toFixed(1)}`,
    `svgH=${anchors.svgHeight.toFixed(1)}`,
    `| barNums=${barNums} tempos=${tempos} sections=${sections}`,
    `lyrics=${lyricCandidates} techText=${techText} mysteryItalic=${mysteryItalic}`,
  );

  if (lyricCandidates > 0 && anchors.svgHeight < 40) {
    console.warn(
      `[GP8:diagnose] row[${i}] ⚠️ svgHeight=${anchors.svgHeight} too small — lyrics won't pin`,
    );
  }
}

// ─── Lyrics pass ─────────────────────────────────────────────────────────────

function fixLyrics(svg: SVGSVGElement, anchors: RowAnchors): number {
  const { svgHeight } = anchors;
  if (svgHeight < 40) return 0;

  const targetY = svgHeight - LYRIC_MARGIN;
  let moved = 0;
  const before: { txt: string; y: string | null }[] = [];

  svg.querySelectorAll<SVGElement>("text").forEach((el) => {
    if (!isLyricText(el)) return;
    before.push({
      txt: (el.textContent ?? "").trim(),
      y: el.getAttribute("y"),
    });
    el.setAttribute("y", String(targetY));
    moved++;
  });

  if (before.length)
    console.log(
      `[GP8] fixLyrics found=${before.length} targetY=${targetY.toFixed(1)} svgH=${svgHeight.toFixed(1)}`,
      before.slice(0, 6),
    );

  return moved;
}

// ─── Full lane system (MODE="full" only) ─────────────────────────────────────

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
  svg.querySelectorAll<SVGElement>("text, tspan").forEach((el) => {
    if (isBarNumber(el) || isLyricText(el)) return;
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
      if (!row.some((r) => r.xStart < item.xEnd && r.xEnd > item.xStart)) {
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
    for (const { el } of slot.items) el.setAttribute("y", String(rowBottom));
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function runGp8LayoutEngineV2(containerEl: HTMLElement): void {
  console.log(`[GP8] runGp8LayoutEngineV2 called — MODE="${MODE}"`);

  const run = () => {
    let firstStaffRowSeen = false;
    const svgRows =
      containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg");
    console.log("[GP8] svg.at-surface-svg rows found:", svgRows.length);

    svgRows.forEach((svg, i) => {
      if (!isStaffSvg(svg)) {
        console.log(`[GP8] row[${i}] skipped (no staff lines)`);
        return;
      }
      const anchors = getRowAnchors(svg);

      // Always diagnose regardless of mode
      diagnoseRow(svg, i, anchors);
      if (MODE === "diagnose") return; // 🔒 zero DOM writes

      // Lyrics — runs in lyricsOnly + full
      const lyricsMoved = fixLyrics(svg, anchors);
      if (lyricsMoved)
        console.log(
          `[GP8] row[${i}] lyrics pinned: ${lyricsMoved} nodes → y=${(anchors.svgHeight - LYRIC_MARGIN).toFixed(1)}`,
        );

      // Tempo cluster — GP8 encoding; pass V2 anchors in "native" mode
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

  requestAnimationFrame(() => requestAnimationFrame(run));
}
