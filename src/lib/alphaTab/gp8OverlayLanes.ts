"use client";

/**
 * gp8OverlayLanes.ts — P4 Phase 3A+
 *
 * Phase 2.1 (locked): container-mounted position:absolute chips scroll with notation ✅
 * Phase 3  (locked):  X-overlap greedy sublane stacking via stackLanesPx ✅
 * Phase 3A (locked):  barNumberY baseline clamp — FX never enters bar-number lane ✅
 * Phase 3A+(this):    Tempo clamp in DOM-rect coords (not SVG-space transform) ✅
 *                     data-maestro-lane-type="fx" attribute on every chip (hierarchy foundation)
 *
 * Lane hierarchy (Songsterr-derived, top → bottom):
 *   marker > tempo > chord > pm > fx > bar_num > staff
 * This file owns: fx lane.
 * Clamps against: tempo (via getBoundingClientRect, same coord space as chips).
 *
 * Stacking model:
 *   - Per SVG row, chips sorted by ascending CSS left.
 *   - Greedy bin-pack into sublanes using rendered DOM widths.
 *   - Sublane 0 = baseline Y. Sublane N = Y - N × (LANE_HEIGHT_PX + V_GAP_PX).
 *   - Stacks upward (away from staff), matching Songsterr lane behavior.
 *
 * Pipeline position (AlphaTabRenderer renderFinished, before curtain drop):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)
 *   await runGp8OverlaySuppression(h)
 *   await runGp8PmSuppression(h)
 *   const laneHandle = await runGp8OverlayLanes(h)
 *   curtain drop
 */

import {
  getRowAnchors,
  isStaffSvg,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Gp8OverlayLaneOptions = {
  debug?: boolean;
  zIndex?: number; // default 18000 (below cursor 20000, above notation 5000)
  maxWidthPx?: number;
  fontSizePx?: number;
  opacity?: number;
};

export type Gp8OverlayLaneHandle = {
  update: () => void;
  destroy: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const OVERLAY_ROOT_ID = "maestro-gp8-overlay-lanes-root";
const LANE_HEIGHT_PX = 14; // matches fontSizePx + lineHeight
const H_GAP_PX = 2; // horizontal clearance threshold for sublane assignment
const V_GAP_PX = 2; // vertical spacing between stacked sublanes
const FX_LANE_OFFSET_PX = 50; // px above staffTopY — fallback when barNumberY unreliable
const FX_ABOVE_BAR_NUM_PX = 28; // px above barNumberY — primary anchor
const FX_ABOVE_TEMPO_PX = 14; // px clearance above tempo cluster (DOM-rect coords)

// ── Global lane numbering (shared vocabulary across all overlay systems) ──────
// Lane 1: bar numbers (protected, never overlaid)
// Lane 2: tempo cluster
// Lane 3: marker / section names
// Lane 4: PM rail
// Lane 5: chord names
// Lane 6: FX / comments  ← this file
// Lane 7: technique (LetRing, dive bomb, vibrato)
// Sublane stacking adds to the base: FX sublane 1 = global lane 7, etc.
const GLOBAL_LANE_BASE: Record<string, number> = {
  tempo: 2,
  marker: 3,
  pm: 4,
  chord: 5,
  fx: 6,
  technique: 7,
};

const DEFAULTS: Required<Gp8OverlayLaneOptions> = {
  debug: false,
  zIndex: 18000,
  maxWidthPx: 320,
  fontSizePx: 11,
  opacity: 0.92,
};

// ── Internal entry type ────────────────────────────────────────────────────────

type Entry = {
  svg: SVGSVGElement;
  x: number; // SVG-space X attr (placement only)
  y: number; // barNumberY-clamped baseline Y (SVG-space)
  chip: HTMLDivElement;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function parseNumAttr(el: Element, name: string): number | null {
  const v = parseFloat(el.getAttribute(name) ?? "");
  return Number.isFinite(v) ? v : null;
}

// ── Root ───────────────────────────────────────────────────────────────────────

function getOrCreateRoot(
  containerEl: HTMLElement,
  zIndex: number,
): HTMLDivElement {
  let root = containerEl.querySelector<HTMLDivElement>(`#${OVERLAY_ROOT_ID}`);
  if (!root) {
    root = document.createElement("div");
    root.id = OVERLAY_ROOT_ID;
    containerEl.appendChild(root);
  }
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: String(zIndex),
    overflow: "visible",
  });
  return root;
}

function clearRoot(root: HTMLElement): void {
  root
    .querySelectorAll('[data-maestro-overlay="1"]')
    .forEach((n) => n.remove());
}

// ── Chip ───────────────────────────────────────────────────────────────────────

function buildChip(
  txt: string,
  opts: Required<Gp8OverlayLaneOptions>,
): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-overlay", "1");
  chip.setAttribute("data-maestro-lane-type", "fx"); // semantic type, not priority number
  chip.textContent = txt;
  Object.assign(chip.style, {
    position: "absolute",
    transform: "translate3d(0,0,0)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    maxWidth: `${opts.maxWidthPx}px`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: `${opts.fontSizePx}px`,
    lineHeight: "1.2",
    color: "rgba(17, 17, 17, 0.92)",
    opacity: String(opts.opacity),
    textShadow: "0 1px 2px rgba(255,255,255,0.65)",
    userSelect: "none",
    WebkitUserSelect: "none",
  });
  if (opts.debug) {
    chip.style.outline = "1px solid rgba(255,0,0,0.6)";
    chip.style.background = "rgba(255,0,0,0.06)";
  }
  return chip;
}

// ── Placement ──────────────────────────────────────────────────────────────────

function placeChip(
  chip: HTMLElement,
  root: HTMLElement, // root rect origin — avoids 79px container-offset drift
  svg: SVGSVGElement,
  x: number,
  y: number,
): void {
  const rr = root.getBoundingClientRect();
  const sr = svg.getBoundingClientRect();
  chip.style.left = `${sr.left - rr.left + x}px`;
  chip.style.top = `${sr.top - rr.top + y}px`;
}

// ── Phase 3: Lane stacking ─────────────────────────────────────────────────────

/**
 * stackLanesPx — groups by SVG row, sorts by rendered CSS left,
 * greedy-packs into sublanes using actual DOM rect widths.
 * Overlap math is entirely in DOM px space — no SVG-space assumptions.
 */
function stackLanesPx(
  entries: Entry[],
  placed: Array<{ left: number; w: number }>,
): number[] {
  const sublanes = new Array<number>(entries.length).fill(0);
  const rowMap = new Map<SVGSVGElement, number[]>();

  for (let i = 0; i < entries.length; i++) {
    const svg = entries[i].svg;
    if (!rowMap.has(svg)) rowMap.set(svg, []);
    rowMap.get(svg)!.push(i);
  }

  for (const idxs of rowMap.values()) {
    idxs.sort((a, b) => placed[a].left - placed[b].left);
    const rightEdge: number[] = [];

    for (const i of idxs) {
      const { left, w } = placed[i];
      const xEnd = left + w;
      let lane = 0;
      while (lane < rightEdge.length && left < rightEdge[lane] + H_GAP_PX)
        lane++;
      sublanes[i] = lane;
      rightEdge[lane] = xEnd;
    }
  }

  return sublanes;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * runGp8OverlayLanes
 * Scans suppressed FX/comment nodes, renders position:absolute HTML overlay chips
 * inside containerEl with X-overlap greedy sublane stacking.
 *
 * Tempo clamp uses getBoundingClientRect (DOM-rect coords) so the comparison is
 * always apples-to-apples with chip CSS top values — no SVG-space transform parsing.
 *
 * Returns a handle — store in a ref and call destroy() on re-render/unmount/track switch.
 */
export async function runGp8OverlayLanes(
  containerEl: HTMLElement,
  options: Gp8OverlayLaneOptions = {},
): Promise<Gp8OverlayLaneHandle> {
  // Desktop gets wider chips so long strings don't truncate ("Signature Series" etc.)
  const isDesktop = containerEl.clientWidth >= 768;
  const opts: Required<Gp8OverlayLaneOptions> = {
    ...DEFAULTS,
    ...options,
    maxWidthPx: options.maxWidthPx ?? (isDesktop ? 420 : 320),
  };

  // Double rAF — layout stable before reading rects
  await nextFrame();
  await nextFrame();

  if (getComputedStyle(containerEl).position === "static") {
    containerEl.style.position = "relative";
  }

  const root = getOrCreateRoot(containerEl, opts.zIndex);
  clearRoot(root);

  const suppressed = Array.from(
    containerEl.querySelectorAll<SVGTextElement>(
      '[data-maestro-suppressed="1"]',
    ),
  );

  if (opts.debug)
    console.log("[P4] gp8OverlayLanes: suppressed =", suppressed.length);

  const entries: Entry[] = [];

  for (const t of suppressed) {
    const svg = t.closest<SVGSVGElement>("svg.at-surface-svg");
    if (!svg) continue;
    if (!isStaffSvg(svg)) continue; // skip header/tuning rows
    const txt = (t.textContent ?? "").trim();
    if (!txt) continue;
    const x = parseNumAttr(t, "x");
    const yRaw = parseNumAttr(t, "y");
    if (x == null || yRaw == null) continue;

    // ── Phase 3A: baseline from barNumberY ────────────────────────────────
    const { staffTopY, barNumberY } = getRowAnchors(svg);
    const fxFromBar =
      barNumberY > 10
        ? Math.max(2, barNumberY - FX_ABOVE_BAR_NUM_PX)
        : Math.max(2, staffTopY - FX_LANE_OFFSET_PX);

    const chip = buildChip(txt, opts);
    root.appendChild(chip);
    entries.push({ svg, x, y: fxFromBar, chip });
  }

  // ── update: place → measure → stack → tempo-clamp ─────────────────────────
  const update = () => {
    // Step 1: base placement (barNumberY-relative)
    for (const e of entries) placeChip(e.chip, root, e.svg, e.x, e.y);

    // Step 2: read rendered geometry (DOM px, same space as chip CSS)
    const placed = entries.map((e) => ({
      left: parseFloat(e.chip.style.left) || 0,
      w: e.chip.getBoundingClientRect().width || e.chip.offsetWidth || 0,
    }));

    // Step 3: greedy sublane assignment
    const sublanes = stackLanesPx(entries, placed);

    // Build row map once — used in Step 4 (debug attrs) and Step 5 (tempo clamp)
    const rowMap = new Map<SVGSVGElement, number[]>();
    for (let i = 0; i < entries.length; i++) {
      const svg = entries[i].svg;
      if (!rowMap.has(svg)) rowMap.set(svg, []);
      rowMap.get(svg)!.push(i);
    }

    // Step 4: apply vertical offsets + stamp stable row key from universalLayoutPatches
    for (let i = 0; i < entries.length; i++) {
      const lane = sublanes[i];
      entries[i].chip.dataset.maestroLaneType = "fx";
      entries[i].chip.dataset.maestroSublane = String(lane);
      // Use DOM-order row key stamped by universalLayoutPatches (same key as PM/chord)
      entries[i].chip.dataset.maestroRow =
        entries[i].svg.dataset.maestroRowKey ?? "";
      // data-maestro-global-lane-number deferred until priority ladder is finalized
      if (lane === 0) continue;
      const baseTop = parseFloat(entries[i].chip.style.top) || 0;
      entries[i].chip.style.top =
        `${baseTop - lane * (LANE_HEIGHT_PX + V_GAP_PX)}px`;
    }

    // Step 5: tempo collision clamp — row-level shift preserves sublane spacing.
    // Per-chip override would collapse the vertical spread created by stacking.
    // Instead: find the lowest chip in the row; if it violates clearance, shift
    // the entire row up by the same delta so sublane 0/1/2 spacing is maintained.
    const rr = root.getBoundingClientRect();

    for (const [svg, idxs] of rowMap.entries()) {
      const tempoG = svg.querySelector<SVGGElement>(
        'g[data-maestro-tempo-cluster="1"]',
      );
      if (!tempoG) continue;
      const tempoTopRel = tempoG.getBoundingClientRect().top - rr.top;
      const allowedMaxTop = tempoTopRel - FX_ABOVE_TEMPO_PX;

      // Lowest chip = largest top value (furthest down in container)
      let worstTop = -Infinity;
      for (const i of idxs) {
        const t = parseFloat(entries[i].chip.style.top) || 0;
        if (t > worstTop) worstTop = t;
      }

      const shiftUp = worstTop - allowedMaxTop;
      if (shiftUp > 0) {
        for (const i of idxs) {
          const t = parseFloat(entries[i].chip.style.top) || 0;
          entries[i].chip.style.top = `${t - shiftUp}px`;
        }
      }
    }

    if (opts.debug) {
      const dist = sublanes.reduce<number[]>((a, l) => {
        a[l] = (a[l] ?? 0) + 1;
        return a;
      }, []);
      console.log("[P4] stackLanesPx distribution:", dist);
    }
  };

  update();

  if (opts.debug) console.log("[P4] gp8OverlayLanes: placed =", entries.length);

  const onResize = () => update();
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);

  return {
    update,
    destroy: () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      if (root.parentElement) root.parentElement.removeChild(root);
    },
  };
}
