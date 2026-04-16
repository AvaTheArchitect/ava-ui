"use client";
/**
 * TempoClusterManager.ts
 * lib/alphaTab/TempoClusterManager.ts
 *
 * Owns the full lifecycle of the Songsterr-style tempo cluster:
 *   [Section Label]  [♩]  [= 139]
 *
 * Two public entry points:
 *
 *   applyTempoClustersInHost(rootEl, opts)
 *     High-level — called from AlphaTabRenderer on every renderFinished.
 *     Loops all SVGs, auto-detects anchors. Default mode: "native".
 *
 *   applyTempoClusterForSvg(svg, svgIdx, anchors, opts)
 *     Low-level — called by gp8LayoutEngine with pre-computed lane anchors.
 *     Use mode: "lane" when barNumberY is available.
 *
 * Mode semantics:
 *   "native" → tempoTextY comes from the native AlphaTab tempo node y.
 *   "lane"   → tempoTextY = lane1TextHangingY (GP8 lane policy).
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export type TempoClusterMode = "native" | "lane";

export type TempoClusterOptions = {
  mode?: TempoClusterMode;
  debugBox?: boolean;
  laneOffsetPx?: number;
  glyphSizePx?: number;
  glyphDx?: number;
  glyphDy?: number;
  useSongsterrGlyph?: boolean;
};

export type TempoClusterAnchors = {
  barNumberY: number | null;
  lane1TextHangingY?: number | null;
  lane2TextHangingY?: number | null;
  pmRailY?: number | null;
  systemStartZoneMaxX?: number | null;
  bar1X: number | null;
  sectionLabelNode: SVGTextElement | null;
  tempoNodes: SVGTextElement[];
  nativeTempoGlyph?: SVGGElement | null;
};

// ─── Entry point 1: host-level (renderer) ────────────────────────────────────

export function applyTempoClustersInHost(
  rootEl: HTMLElement,
  opts: TempoClusterOptions = {},
): void {
  rootEl.querySelectorAll("svg").forEach((svg, svgIdx) => {
    const svgEl = svg as SVGSVGElement;
    const allTextNodes = Array.from(
      svgEl.querySelectorAll<SVGTextElement>("text"),
    );
    applyTempoClusterForSvg(
      svgEl,
      svgIdx,
      {
        barNumberY: _findBarNumberY(allTextNodes),
        bar1X: _findFirstPlayableBarX(allTextNodes),
        sectionLabelNode: _collectSectionLabelNode(allTextNodes),
        tempoNodes: _collectTempoNodes(allTextNodes),
      },
      opts,
    );
  });
}

// ─── Entry point 2: single-SVG (gp8LayoutEngine) ─────────────────────────────

export function applyTempoClusterForSvg(
  svg: SVGSVGElement,
  svgIdx: number,
  anchors: TempoClusterAnchors,
  opts: TempoClusterOptions = {},
): void {
  // [Idempotency] Remove any previously injected cluster UI for this SVG.
  // Without this, re-runs (StrictMode double-invoke, multiple renderFinished
  // cycles, cold refresh) stack duplicate clusters on top of each other.
  svg
    .querySelectorAll('[data-maestro-tempo-cluster="1"]')
    .forEach((n) => n.remove());
  const {
    barNumberY,
    bar1X,
    sectionLabelNode,
    tempoNodes,
    lane1TextHangingY: callerLane1Y = null,
    lane2TextHangingY: callerLane2Y = null,
    pmRailY: callerPmRailY = null,
    systemStartZoneMaxX: callerZoneMaxX = null,
    nativeTempoGlyph: callerGlyph = null,
  } = anchors;

  const mode = opts.mode ?? "native";
  const laneOffsetPx = opts.laneOffsetPx ?? 22;
  const glyphSizePx = opts.glyphSizePx ?? 18;
  const glyphDx = opts.glyphDx ?? 2;
  const glyphDy = opts.glyphDy ?? 1;
  const debugBox = opts.debugBox ?? false;
  const useSongsterr = opts.useSongsterrGlyph ?? true;

  const isRow1 = svgIdx === 2;

  console.log("🧪 APPLY_TEMPO_CLUSTER_ENTER", {
    svgIdx,
    mode,
    debugBox,
    tempoCount: tempoNodes.length,
    hasSection: !!sectionLabelNode,
    tempo0: tempoNodes[0]?.textContent?.trim(),
    section: sectionLabelNode?.textContent?.trim(),
  });

  if (tempoNodes.length === 0) {
    console.warn(
      `  ⚠️ APPLY_TEMPO_CLUSTER_EARLY_EXIT svg[${svgIdx}] tempoCount=0`,
    );
    return;
  }

  // ── Lane constants (shared across all clusters in this row) ──────────────
  const nativeTempoY = parseFloat(tempoNodes[0]?.getAttribute("y") ?? "NaN");
  const lane1Y =
    callerLane1Y ?? (barNumberY !== null ? barNumberY - laneOffsetPx : null);
  const lane2Y =
    callerLane2Y ?? (lane1Y !== null ? lane1Y - MIN_LANE_GAP : null);

  console.log("🧭 TEMPO_Y_RESOLVE", {
    svgIdx,
    mode,
    barNumberY,
    callerLane1Y,
    callerLane2Y,
    laneOffsetPx,
    nativeTempoY: Number.isFinite(nativeTempoY) ? nativeTempoY : null,
    lane1Y,
    lane2Y,
  });

  // ── Debug: blue horizontal rule at lane1Y ─────────────────────────────────
  if (debugBox && lane1Y !== null) {
    let line = svg.querySelector<SVGLineElement>(
      `line[data-maestro="tempo-lane-y-${svgIdx}"]`,
    );
    if (!line) {
      line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("data-maestro", `tempo-lane-y-${svgIdx}`);
      line.setAttribute("x1", "0");
      line.setAttribute(
        "x2",
        String(
          svg.viewBox.baseVal?.width ||
            svg.getBoundingClientRect().width ||
            2000,
        ),
      );
      line.setAttribute("stroke", "blue");
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);
    }
    line.setAttribute("y1", String(lane1Y));
    line.setAttribute("y2", String(lane1Y));
  }

  // ── Shared layout constants ────────────────────────────────────────────────
  const GLYPH_W = 12;
  const GLYPH_GAP_R = 1;
  const GLYPH_GAP_L = 8;
  const PAD_SPAN = 6;

  // Sort left-to-right — rows can have multiple tempo changes
  const sortedTempoNodes = [...tempoNodes].sort(
    (a, b) =>
      parseFloat(a.getAttribute("x") ?? "0") -
      parseFloat(b.getAttribute("x") ?? "0"),
  );

  console.log("🎼 TEMPO_NODE_COUNT", {
    svgIdx,
    count: sortedTempoNodes.length,
    texts: sortedTempoNodes.map((n) => _normTempoText(n.textContent ?? "")),
  });

  sortedTempoNodes.forEach((tn, i) => {
    const nodeTempoX = parseFloat(tn.getAttribute("x") ?? "120");
    const nodeGlyphX = nodeTempoX - GLYPH_W - GLYPH_GAP_R;

    // ── Per-cluster lane selection ─────────────────────────────────────────
    let clusterTempoTextY =
      lane1Y ?? (Number.isFinite(nativeTempoY) ? nativeTempoY : 28.8908);
    if (mode === "lane" && lane1Y !== null) {
      const spanLeft = nodeGlyphX - PAD_SPAN;
      const spanRight = nodeTempoX + 60;
      const pmConflict =
        callerPmRailY !== null
          ? _hasPmConflictInSpan(
              svg,
              spanLeft,
              spanRight,
              lane1Y,
              callerPmRailY,
              callerZoneMaxX ?? 0,
            )
          : false;
      clusterTempoTextY = pmConflict ? (lane2Y ?? lane1Y) : lane1Y;
      if (i === 0) {
        console.log("🧭 LANE_SELECT", {
          svgIdx,
          i,
          spanLeft: spanLeft.toFixed(1),
          spanRight: spanRight.toFixed(1),
          pmConflict,
          lane1Y,
          lane2Y,
          tempoTextY: clusterTempoTextY,
        });
      }
    }

    // ── Intro X correction (cluster 0 only, system-start labels only) ──────
    // TempoClusterManager does NOT own section label Y — that belongs to
    // applySectionMarkerNormalization. But we do nudge the X so "Intro"
    // doesn't sit on top of the cluster. Only applies when the section label
    // sits inside the system-start zone (i.e. it IS the row-intro label).
    if (i === 0 && sectionLabelNode) {
      const secX = parseFloat(sectionLabelNode.getAttribute("x") ?? "NaN");
      const zoneMaxX = callerZoneMaxX ?? 0;
      const isSystemStartLabel = Number.isFinite(secX) && secX < zoneMaxX + 20;
      if (isSystemStartLabel) {
        let introWidth = 0;
        try {
          const b = sectionLabelNode.getBBox();
          if (b && b.width > 5) introWidth = b.width;
        } catch {
          /* skip */
        }
        if (introWidth > 0) {
          const introX = Math.max(8, nodeGlyphX - GLYPH_GAP_L - introWidth);
          sectionLabelNode.setAttribute("x", String(introX));
          console.log(
            `  📍 INTRO_X_NUDGE svg[${svgIdx}] x: ${secX.toFixed(1)} → ${introX.toFixed(1)} (introWidth=${introWidth.toFixed(1)})`,
          );
        }
      }
    }

    let tempoWidth = 50;
    try {
      const b = tn.getBBox();
      if (b && b.width > 0) tempoWidth = b.width;
    } catch {
      /* fallback */
    }

    // ── Sniff glyph char near this cluster X ──────────────────────────────
    let sniffedGlyph: SVGGElement | null = null;
    let glyphChar = "\uECA5";
    let glyphTextStyle = "font-size: 70%; stroke:none";
    let bestDx = Infinity;
    svg.querySelectorAll<SVGGElement>("g.at").forEach((ga) => {
      if (ga.getAttribute("data-maestro") === "tempo-glyph") return;
      const tf = ga.getAttribute("transform") ?? "";
      const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
      if (!m) return;
      const gx = parseFloat(m[1]),
        gy = parseFloat(m[2]);
      const dx = Math.abs(gx - nodeGlyphX);
      if (dx > 40) return;
      if (barNumberY !== null && gy >= barNumberY) return;
      const tt = (ga.querySelector("text")?.textContent ?? "").trim();
      if (!tt || /^[\x20-\x7E]+$/.test(tt)) return;
      if (dx < bestDx) {
        bestDx = dx;
        glyphChar = tt;
        glyphTextStyle =
          ga.querySelector("text")?.getAttribute("style") ?? glyphTextStyle;
        sniffedGlyph = ga;
      }
    });

    // ── Normalize display text (NBSP-safe) ────────────────────────────────
    const tempoDisplay = _normTempoText(tn.textContent ?? "");
    console.log(
      `🧪 TEMPO_NODES_RAW svg[${svgIdx}][${i}] raw="${(tn.textContent ?? "").replace(/\s/g, "·")}" display="${tempoDisplay}"`,
    );

    const nodeGlyph =
      callerGlyph ?? _pickTempoNoteGlyph(svg, nodeGlyphX, barNumberY);

    // ── Zone-sweep near this cluster ──────────────────────────────────────
    svg.querySelectorAll<SVGGElement>("g.at").forEach((ga) => {
      if (ga.getAttribute("data-maestro") === "tempo-glyph") return;
      const tf = ga.getAttribute("transform") ?? "";
      const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
      if (!m) return;
      const gx = parseFloat(m[1]),
        gy = parseFloat(m[2]);
      if (Math.abs(gx - nodeGlyphX) < 30 && gy < (barNumberY ?? 999)) {
        const content = (ga.querySelector("text")?.textContent ?? "").trim();
        if (content && !/^[\x20-\x7E]+$/.test(content)) {
          ga.setAttribute("display", "none");
          console.log(
            `🙈 TEMPO_ZONE_SWEEP svg[${svgIdx}][${i}] gx=${gx.toFixed(1)} gy=${gy.toFixed(1)}`,
          );
        }
      }
    });

    if (nodeGlyph) {
      nodeGlyph.setAttribute("display", "none");
      console.log(`🙈 TEMPO_NATIVE_GLYPH_HIDE svg[${svgIdx}][${i}]`);
    }

    _ensureTempoClusterUi(svg, svgIdx, {
      introX: Math.max(8, nodeGlyphX - GLYPH_GAP_L - 50),
      tempoTextX: nodeTempoX,
      tempoTextY: clusterTempoTextY,
      expectedGlyphX: nodeGlyphX,
      introWidth: 50,
      tempoWidth,
      tempoNode: tn,
      tempoDisplayText: tempoDisplay,
      glyphChar: useSongsterr ? SONGSTERR_NOTE : glyphChar,
      glyphTextStyle,
      nativeTempoGlyph: nodeGlyph ?? sniffedGlyph ?? null,
      glyphSizePx,
      glyphDx,
      glyphDy,
      debugBox,
      clusterIndex: i,
    });

    tn.setAttribute("display", "none");
    console.log(
      `🧪 TEMPO_CLUSTER svg[${svgIdx}][${i}] mode=${mode} text="${tempoDisplay}" y=${clusterTempoTextY} x=${nodeTempoX.toFixed(1)}`,
    );
  });

  if (isRow1) {
    requestAnimationFrame(() => {
      console.log("🕒 TEMPO_APPLY_NEXT_FRAME", {
        svgIdx,
        clusters: sortedTempoNodes.length,
        y0: sortedTempoNodes[0]?.getAttribute("y"),
      });
    });
  }
}

// ─── Private: DOM helpers ─────────────────────────────────────────────────────

function _normTempoText(raw: string): string {
  const norm = raw.replace(/\u00A0/g, " ").trim();
  const m = norm.match(/^=\s*(\d+)\s*$/);
  return m ? `= ${m[1]}` : norm;
}

function _findBarNumberY(textNodes: SVGTextElement[]): number | null {
  let best: number | null = null;
  for (const t of textNodes) {
    const style = t.getAttribute("style") ?? "";
    if (!style.includes("11px Arial")) continue;
    if (t.getAttribute("fill") !== "#C80000") continue;
    const y = parseFloat(t.getAttribute("y") ?? "NaN");
    if (!Number.isFinite(y) || y <= 0) continue;
    if (best === null || y < best) best = y;
  }
  return best;
}

function _findFirstPlayableBarX(textNodes: SVGTextElement[]): number | null {
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

function _collectTempoNodes(textNodes: SVGTextElement[]): SVGTextElement[] {
  return textNodes.filter((t) => {
    const norm = (t.textContent ?? "").replace(/\u00A0/g, " ").trim();
    return /^=\s*\d+\s*$/.test(norm);
  });
}

const _TRACK_LABELS = /^[a-z]\..*\.|^s\.guit\.|^t\.bass\.|^voc\.|^drum/i;

function _collectSectionLabelNode(
  textNodes: SVGTextElement[],
): SVGTextElement | null {
  return (
    textNodes.find((t) => {
      const style = t.getAttribute("style") ?? "";
      if (!style.includes("bold 14px Georgia")) return false;
      if (parseFloat(t.getAttribute("y") ?? "999") > 120) return false;
      const txt = (t.textContent ?? "").trim();
      return !!txt && !_TRACK_LABELS.test(txt) && !/^=\s*\d+/.test(txt);
    }) ?? null
  );
}

// ─── Private: constants ───────────────────────────────────────────────────────

const MIN_LANE_GAP = 11;

// ─── Private: PM span conflict detector ──────────────────────────────────────

function _hasPmConflictInSpan(
  svg: SVGSVGElement,
  spanLeft: number,
  spanRight: number,
  _lane1Y: number,
  pmRailY: number,
  systemStartZoneMaxX: number,
): boolean {
  const RAIL_BAND = 4;
  const hasRail = Array.from(svg.querySelectorAll<SVGRectElement>("rect")).some(
    (r) => {
      if (r.getAttribute("fill") !== "#000000") return false;
      const h = parseFloat(r.getAttribute("height") ?? "0");
      if (h <= 1.0 || h >= 2.0) return false;
      const rx = parseFloat(r.getAttribute("x") ?? "NaN");
      const ry = parseFloat(r.getAttribute("y") ?? "NaN");
      const rw = parseFloat(r.getAttribute("width") ?? "0");
      if (!Number.isFinite(rx) || !Number.isFinite(ry)) return false;
      if (rx < systemStartZoneMaxX) return false;
      if (rx + rw < spanLeft || rx > spanRight) return false;
      return Math.abs(ry - pmRailY) <= RAIL_BAND;
    },
  );
  if (hasRail) return true;
  return Array.from(svg.querySelectorAll<SVGTextElement>("text")).some((t) => {
    if (!/^P\.M/.test((t.textContent ?? "").trim())) return false;
    const x = parseFloat(t.getAttribute("x") ?? "NaN");
    return Number.isFinite(x) && x >= spanLeft && x <= spanRight;
  });
}

// ─── Private: glyph picker ────────────────────────────────────────────────────

interface _BestGlyph {
  g: SVGGElement;
  dx: number;
  gx: number;
  gy: number;
}

function _pickTempoNoteGlyph(
  svg: SVGSVGElement,
  expectedGlyphX: number,
  barNumberY: number | null,
): SVGGElement | null {
  let best: _BestGlyph | null = null;
  for (const g of Array.from(svg.querySelectorAll<SVGGElement>("g.at"))) {
    const tf = g.getAttribute("transform") ?? "";
    const m = tf.match(/translate\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!m) continue;
    const gx = parseFloat(m[1]),
      gy = parseFloat(m[2]);
    if (barNumberY !== null && gy >= barNumberY) continue;
    if (barNumberY === null && gy > 120) continue;
    const content = (g.querySelector("text")?.textContent ?? "").trim();
    if (!content || /^[\x20-\x7E]+$/.test(content)) continue;
    if (gx < 90) continue;
    const dx = Math.abs(gx - expectedGlyphX);
    if (dx > 25) continue;
    if (!best || dx < best.dx) best = { g, dx, gx, gy };
  }
  if (best) {
    console.log(
      `🧪 TEMPO_NOTE_GLYPH_PICK gx=${best.gx.toFixed(1)} gy=${best.gy.toFixed(1)} dx=${best.dx.toFixed(1)}`,
    );
    return best.g;
  }
  console.warn(
    `⚠️ TEMPO_NOTE_GLYPH_PICK none found near x=${expectedGlyphX.toFixed(1)}`,
  );
  return null;
}

// ─── Private: UI injection ────────────────────────────────────────────────────

const SONGSTERR_NOTE = "\u2669"; // ♩

function _getSongsterrGlyphStyle(baseSize = 18, weight = 400): string {
  return `font-family: Arial, sans-serif; font-size: ${baseSize}px; font-weight: ${weight}; fill: #000000; dominant-baseline: hanging; user-select: none; stroke: none`;
}

type _TempoClusterUi = {
  introX: number;
  tempoTextX: number;
  tempoTextY: number;
  expectedGlyphX: number;
  introWidth: number;
  tempoWidth: number;
  tempoNode: SVGTextElement | null;
  tempoDisplayText: string;
  glyphChar: string;
  glyphTextStyle: string;
  nativeTempoGlyph: SVGGElement | null;
  glyphSizePx: number;
  glyphDx: number;
  glyphDy: number;
  debugBox: boolean;
  clusterIndex: number;
};

function _ensureTempoClusterUi(
  svg: SVGSVGElement,
  svgIdx: number,
  cluster: _TempoClusterUi,
): void {
  const {
    tempoTextX,
    expectedGlyphX,
    tempoWidth,
    tempoNode,
    tempoDisplayText,
    glyphChar,
    nativeTempoGlyph,
    glyphSizePx,
    glyphDx,
    glyphDy,
    debugBox,
    clusterIndex,
  } = cluster;
  const y = cluster.tempoTextY;

  const PAD = 6;
  const BOX_H = 24;
  const BOX_RX = 4;
  const GLYPH_W = 12;
  const GLYPH_GAP_R = 1;

  const parentFromGlyph =
    nativeTempoGlyph?.parentElement?.closest("g") ??
    nativeTempoGlyph?.parentElement;
  const parentFromTempo =
    tempoNode?.parentElement?.closest("g") ?? tempoNode?.parentElement;
  const insertParent: Element = parentFromGlyph ?? parentFromTempo ?? svg;

  const clusterX = expectedGlyphX - PAD;
  const clusterY = y - 6;

  // Unique key per cluster: tempo-ui-{svgIdx}-{clusterIndex}
  const wrapKey = `tempo-ui-${svgIdx}-${clusterIndex}`;
  let wrap = insertParent.querySelector<SVGGElement>(
    `g[data-maestro="${wrapKey}"]`,
  );
  if (!wrap) {
    wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrap.setAttribute("data-maestro", wrapKey);
    insertParent.appendChild(wrap);
  }
  wrap.setAttribute("data-maestro-tempo-cluster", "1");
  wrap.setAttribute("transform", `translate(${clusterX} ${clusterY})`);

  const hitW = Math.max(1, tempoTextX + tempoWidth + PAD - clusterX);
  let rect = wrap.querySelector<SVGRectElement>(
    'rect[data-testid="edit-tempo"]',
  );
  if (!rect) {
    rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("data-testid", "edit-tempo");
    rect.setAttribute("data-maestro", "tempo-hitbox");
    rect.style.cursor = "pointer";
    wrap.appendChild(rect);
  }
  rect.removeAttribute("class");
  rect.removeAttribute("style");
  rect.setAttribute("x", "0");
  rect.setAttribute("y", "0");
  rect.setAttribute("width", String(hitW));
  rect.setAttribute("height", String(BOX_H));
  rect.setAttribute("rx", String(BOX_RX));
  rect.setAttribute(
    "style",
    debugBox
      ? "fill: rgba(255,0,0,0.15); stroke: red; stroke-width: 2; opacity: 1; visibility: visible; pointer-events: all;"
      : "fill: transparent; stroke: transparent; opacity: 1; visibility: visible; pointer-events: all;",
  );

  console.log("🧪 HITBOX_DEBUG", {
    svgIdx,
    clusterIndex,
    debugBox,
    clusterX: clusterX.toFixed(1),
    clusterY: clusterY.toFixed(1),
    hitW: hitW.toFixed(1),
  });

  let g = wrap.querySelector<SVGGElement>('g[data-maestro="tempo-glyph"]');
  if (!g) {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "at");
    g.setAttribute("data-maestro", "tempo-glyph");
    wrap.appendChild(g);
  }
  g.removeAttribute("transform");

  let gt = g.querySelector<SVGTextElement>("text");
  if (!gt) {
    gt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    g.appendChild(gt);
  }
  gt.textContent = glyphChar;
  gt.setAttribute("x", String(PAD + glyphDx));
  gt.setAttribute("y", String(6 + glyphDy));
  gt.setAttribute("style", _getSongsterrGlyphStyle(glyphSizePx));
  gt.removeAttribute("transform");

  const tempoLocalX = PAD + GLYPH_W + GLYPH_GAP_R + 6;
  let tempoT = wrap.querySelector<SVGTextElement>(
    'text[data-maestro="tempo-text"]',
  );
  if (!tempoT) {
    tempoT = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tempoT.setAttribute("data-maestro", "tempo-text");
    wrap.appendChild(tempoT);
  }
  tempoT.textContent =
    tempoDisplayText || tempoNode?.textContent?.trim() || "= ?";
  tempoT.setAttribute("x", String(tempoLocalX));
  tempoT.setAttribute("y", "6");
  const nativeTempoStyle = tempoNode?.getAttribute("style") ?? "";
  tempoT.setAttribute(
    "style",
    (nativeTempoStyle || "font: bold 14px Georgia, serif;") +
      "; dominant-baseline: hanging",
  );

  console.log(
    `✅ TEMPO_CLUSTER_UI svg[${svgIdx}][${clusterIndex}] wrap=translate(${clusterX.toFixed(1)},${clusterY.toFixed(1)}) hitW=${hitW.toFixed(1)} h=${BOX_H}`,
  );
}
