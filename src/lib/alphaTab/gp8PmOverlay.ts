"use client";

/**
 * gp8PmOverlay.ts — P4 PM Phase 2
 * Date: April 22, 2026 — v1.2
 *
 * v1.2 CHANGES:
 * ✅ Priority correction: PM owns lane 2 (closest to staff). When tempo cluster
 *    overlaps PM in the same row, tempo is pushed UP — not PM down.
 *    Matches Songsterr behavior (images confirmed): P.M. stays in lane 2,
 *    tempo elevates to lane 3 when PM is present.
 * ✅ Tempo elevation via SVG transform mutation (not DOM overlay shift).
 *    Original transform cached in data-maestro-original-transform for
 *    idempotent resize re-application.
 * ✅ Preventive baseline guards in buildPmGroups() (Cipher recommendation):
 *    PM baseline never enters bar-number zone or staff zone regardless of
 *    how AlphaTab positions the tempo cluster.
 * ✅ data-maestro-row + data-maestro-pm-group stamped on all PM chips.
 *
 * v1.1 LOCKED (unchanged):
 * ✅ PM native Y is NOT trusted — AlphaTab parks PM inconsistently.
 * ✅ Baseline normalized to getRowAnchors() per row.
 * ✅ X geometry + rail dimensions preserved from suppressed rects.
 * ✅ Grouping: label[i] owns dashes/endcaps with X in [label[i].x, label[i+1].x).
 * ✅ Separate root (maestro-gp8-pm-overlay-root), surgical clearPmRoot.
 * ✅ update + destroy handle, resize listeners.
 *
 * Lane priority (Songsterr-derived, claim order lowest → highest band):
 *   pm/technique > chord > tempo > fx > marker
 * PM owns the band closest to the staff. Tempo must clear PM by moving UP.
 *
 * Pipeline position (AlphaTabRenderer renderFinished, GP8 only):
 *   await runUniversalLayoutPatches(h)
 *   await runGp8LayoutEngineV2(h)
 *   await runGp8OverlaySuppression(h)
 *   await runGp8PmSuppression(h)
 *   await runGp8ChordSuppression(h)
 *   const fxHandle     = await runGp8OverlayLanes(h)      ← zIndex 18000
 *   const pmHandle     = await runGp8PmOverlay(h)         ← zIndex 17500, this file
 *   const chordHandle  = await runGp8ChordOverlay(h)      ← zIndex 17000
 *   curtain drop
 */

import {
  getRowAnchors,
  isStaffSvg,
} from "@/lib/alphaTab/universalLayoutPatches";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Gp8PmOverlayOptions = {
  debug?: boolean;
  zIndex?: number;
};

export type Gp8PmOverlayHandle = {
  update: () => void;
  destroy: () => void;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const PM_OVERLAY_ROOT_ID = "maestro-gp8-pm-overlay-root";
const PM_LABEL_FONT_SIZE_PX = 12;
const DASH_Y_OFFSET = 5.28;
const ENDCAP_Y_OFFSET = 1.5;
const PM_ABOVE_BAR_NUM_PX = 14; // PM baseline: barNumberY - this
const PM_LANE_OFFSET_PX = 20; // fallback: staffTopY - this
const TEMPO_ABOVE_PM_PX = 4; // clearance: tempo bottom must be this far above PM top
const SAFE_ABOVE_STAFF_PX = 8; // hard floor: PM never within 8px of staff top
const SAFE_ABOVE_BAR_NUM_PX = 6; // hard floor: PM never within 6px of barNumberY

const DEFAULTS: Required<Gp8PmOverlayOptions> = {
  debug: false,
  zIndex: 17500,
};

// ── Internal types ─────────────────────────────────────────────────────────────

type PmPrimitive = {
  x: number;
  width: number;
  height: number;
};

type PmGroup = {
  svg: SVGSVGElement;
  labelX: number;
  normalizedLabelY: number;
  staffTopY: number;
  dashes: PmPrimitive[];
  endcaps: PmPrimitive[];
};

type RenderedPmGroup = {
  svg: SVGSVGElement;
  labelX: number;
  normalizedLabelY: number;
  staffTopY: number;
  labelChip: HTMLDivElement;
  dashChips: Array<{ chip: HTMLDivElement; x: number }>;
  endcapChips: Array<{ chip: HTMLDivElement; x: number }>;
  pmGroupId: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function parseNum(el: Element, attr: string): number | null {
  const v = parseFloat(el.getAttribute(attr) ?? "");
  return Number.isFinite(v) ? v : null;
}

// ── Root ───────────────────────────────────────────────────────────────────────

function getOrCreatePmRoot(
  containerEl: HTMLElement,
  zIndex: number,
): HTMLDivElement {
  let root = containerEl.querySelector<HTMLDivElement>(
    `#${PM_OVERLAY_ROOT_ID}`,
  );
  if (!root) {
    root = document.createElement("div");
    root.id = PM_OVERLAY_ROOT_ID;
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

function clearPmRoot(root: HTMLElement): void {
  root
    .querySelectorAll('[data-maestro-lane-type="pm"]')
    .forEach((n) => n.remove());
}

// ── Chip builders ──────────────────────────────────────────────────────────────

function buildLabelChip(opts: Required<Gp8PmOverlayOptions>): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "pm");
  chip.setAttribute("data-maestro-pm-role", "label");
  chip.textContent = "P.M.";
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    fontSize: `${PM_LABEL_FONT_SIZE_PX}px`,
    lineHeight: "1",
    color: "rgba(17,17,17,0.92)",
    whiteSpace: "nowrap",
    userSelect: "none",
    WebkitUserSelect: "none",
  });
  if (opts.debug) chip.style.outline = "1px solid rgba(0,100,255,0.6)";
  return chip;
}

function buildDashChip(
  w: number,
  h: number,
  opts: Required<Gp8PmOverlayOptions>,
): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "pm");
  chip.setAttribute("data-maestro-pm-role", "dash");
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    width: `${w}px`,
    height: `${h}px`,
    background: opts.debug ? "rgba(0,100,255,0.5)" : "#000000",
  });
  return chip;
}

function buildEndCapChip(
  w: number,
  h: number,
  opts: Required<Gp8PmOverlayOptions>,
): HTMLDivElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-maestro-lane-type", "pm");
  chip.setAttribute("data-maestro-pm-role", "endcap");
  Object.assign(chip.style, {
    position: "absolute",
    pointerEvents: "none",
    width: `${w}px`,
    height: `${h}px`,
    background: opts.debug ? "rgba(0,200,100,0.5)" : "#000000",
  });
  return chip;
}

// ── Placement ──────────────────────────────────────────────────────────────────

function placeChip(
  chip: HTMLElement,
  root: HTMLElement,
  svg: SVGSVGElement,
  x: number,
  y: number,
): void {
  const rr = root.getBoundingClientRect();
  const sr = svg.getBoundingClientRect();
  chip.style.left = `${sr.left - rr.left + x}px`;
  chip.style.top = `${sr.top - rr.top + y}px`;
}

// ── PM group builder ───────────────────────────────────────────────────────────

function buildPmGroups(containerEl: HTMLElement): PmGroup[] {
  const groups: PmGroup[] = [];
  const svgRows = Array.from(
    containerEl.querySelectorAll<SVGSVGElement>("svg.at-surface-svg"),
  );

  for (const svg of svgRows) {
    if (!isStaffSvg(svg)) continue;

    const { staffTopY, barNumberY } = getRowAnchors(svg);

    // Compute baseline, then apply preventive guards so PM can never
    // enter the bar-number zone or staff zone regardless of tempo position.
    let normalizedLabelY =
      barNumberY > 10
        ? Math.max(2, barNumberY - PM_ABOVE_BAR_NUM_PX)
        : Math.max(2, staffTopY - PM_LANE_OFFSET_PX);
    // Never closer than SAFE_ABOVE_BAR_NUM_PX to bar numbers
    if (barNumberY > 10) {
      normalizedLabelY = Math.min(
        normalizedLabelY,
        barNumberY - SAFE_ABOVE_BAR_NUM_PX,
      );
    }
    // Never closer than SAFE_ABOVE_STAFF_PX to staff top (hard floor)
    normalizedLabelY = Math.min(
      normalizedLabelY,
      staffTopY - SAFE_ABOVE_STAFF_PX,
    );

    const labelEls = Array.from(
      svg.querySelectorAll<SVGTextElement>(
        '[data-maestro-pm-suppressed="label"]',
      ),
    );
    if (!labelEls.length) continue;

    const dashEls = Array.from(
      svg.querySelectorAll<SVGRectElement>(
        '[data-maestro-pm-suppressed="dash"]',
      ),
    );
    const endcapEls = Array.from(
      svg.querySelectorAll<SVGRectElement>(
        '[data-maestro-pm-suppressed="endcap"]',
      ),
    );

    const labels = labelEls
      .map((el) => ({ x: parseNum(el, "x") ?? 0 }))
      .sort((a, b) => a.x - b.x);
    const dashes = dashEls
      .map((el) => ({
        x: parseNum(el, "x") ?? 0,
        width: parseNum(el, "width") ?? 9,
        height: parseNum(el, "height") ?? 1.44,
      }))
      .sort((a, b) => a.x - b.x);
    const endcaps = endcapEls
      .map((el) => ({
        x: parseNum(el, "x") ?? 0,
        width: parseNum(el, "width") ?? 1.44,
        height: parseNum(el, "height") ?? 9,
      }))
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < labels.length; i++) {
      const fromX = labels[i].x;
      const toX = i + 1 < labels.length ? labels[i + 1].x : Infinity;
      groups.push({
        svg,
        labelX: fromX,
        normalizedLabelY,
        staffTopY,
        dashes: dashes.filter((d) => d.x >= fromX && d.x < toX),
        endcaps: endcaps.filter((e) => e.x >= fromX && e.x < toX),
      });
    }
  }

  return groups;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function runGp8PmOverlay(
  containerEl: HTMLElement,
  options: Gp8PmOverlayOptions = {},
): Promise<Gp8PmOverlayHandle> {
  const opts: Required<Gp8PmOverlayOptions> = { ...DEFAULTS, ...options };

  await nextFrame();
  await nextFrame();

  if (getComputedStyle(containerEl).position === "static") {
    containerEl.style.position = "relative";
  }

  const root = getOrCreatePmRoot(containerEl, opts.zIndex);
  clearPmRoot(root);

  const groups = buildPmGroups(containerEl);
  const rendered: RenderedPmGroup[] = [];
  let pmGroupId = 0;

  for (const grp of groups) {
    const labelChip = buildLabelChip(opts);
    root.appendChild(labelChip);

    const dashChips: RenderedPmGroup["dashChips"] = [];
    for (const d of grp.dashes) {
      const chip = buildDashChip(d.width, d.height, opts);
      root.appendChild(chip);
      dashChips.push({ chip, x: d.x });
    }

    const endcapChips: RenderedPmGroup["endcapChips"] = [];
    for (const e of grp.endcaps) {
      const chip = buildEndCapChip(e.width, e.height, opts);
      root.appendChild(chip);
      endcapChips.push({ chip, x: e.x });
    }

    rendered.push({
      svg: grp.svg,
      labelX: grp.labelX,
      normalizedLabelY: grp.normalizedLabelY,
      staffTopY: grp.staffTopY,
      labelChip,
      dashChips,
      endcapChips,
      pmGroupId: pmGroupId++,
    });
  }

  if (opts.debug)
    console.log("[P4-PM] gp8PmOverlay: groups =", groups.length, "rendered");

  // ── update ────────────────────────────────────────────────────────────────
  const update = () => {
    // Step 1: place all chips at normalized Y + stamp debug attributes
    for (const r of rendered) {
      placeChip(r.labelChip, root, r.svg, r.labelX, r.normalizedLabelY);

      const dashY = r.normalizedLabelY + DASH_Y_OFFSET;
      for (const { chip, x } of r.dashChips)
        placeChip(chip, root, r.svg, x, dashY);

      const endcapY = r.normalizedLabelY + ENDCAP_Y_OFFSET;
      for (const { chip, x } of r.endcapChips)
        placeChip(chip, root, r.svg, x, endcapY);

      // Use stable DOM-order row key stamped by universalLayoutPatches
      const row = r.svg.dataset.maestroRowKey ?? "";
      const group = String(r.pmGroupId);
      r.labelChip.dataset.maestroLaneType = "pm";
      r.labelChip.dataset.maestroRow = row;
      r.labelChip.dataset.maestroPmGroup = group;
      for (const { chip } of r.dashChips) {
        chip.dataset.maestroLaneType = "pm";
        chip.dataset.maestroRow = row;
        chip.dataset.maestroPmGroup = group;
      }
      for (const { chip } of r.endcapChips) {
        chip.dataset.maestroLaneType = "pm";
        chip.dataset.maestroRow = row;
        chip.dataset.maestroPmGroup = group;
      }
    }

    // Step 2: Tempo elevation — PM owns lane 2 (closest to staff).
    // When tempo cluster overlaps PM in the same row, push tempo UP via
    // SVG transform mutation. PM chips never move for tempo conflicts.
    // Original transform cached in data-maestro-original-transform so
    // resize re-runs start from the correct baseline (idempotent).
    const rr = root.getBoundingClientRect();
    const rowMap = new Map<SVGSVGElement, number[]>();
    for (let i = 0; i < rendered.length; i++) {
      const svg = rendered[i].svg;
      if (!rowMap.has(svg)) rowMap.set(svg, []);
      rowMap.get(svg)!.push(i);
    }

    for (const [svg, idxs] of rowMap.entries()) {
      // PM topmost baseline in this row (root-relative px)
      let pmTopRel = Infinity;
      for (const i of idxs) {
        const t = parseFloat(rendered[i].labelChip.style.top) || 0;
        if (t < pmTopRel) pmTopRel = t;
      }

      // SVG scale factor (DOM px → SVG units) — computed once per row
      const svgRect = svg.getBoundingClientRect();
      const vbH = svg.viewBox?.baseVal?.height || svgRect.height;
      const scale = svgRect.height > 0 ? vbH / svgRect.height : 1;

      // Handle all tempo clusters in this row (some rows have 2: e.g. =60 then =120)
      const tempoGs = Array.from(
        svg.querySelectorAll<SVGGElement>('g[data-maestro-tempo-cluster="1"]'),
      );
      for (const tempoG of tempoGs) {
        // A) Always restore original before applying clamp (prevents transform drift on resize)
        if (!tempoG.dataset.maestroOriginalTransform) {
          tempoG.dataset.maestroOriginalTransform =
            tempoG.getAttribute("transform") ?? "";
        }
        tempoG.setAttribute(
          "transform",
          tempoG.dataset.maestroOriginalTransform,
        );

        // Tempo cluster bottom after restore (root-relative px)
        const tempoBottomRel = tempoG.getBoundingClientRect().bottom - rr.top;

        // B) Only shift upward — never allow tempo to move down from its original position
        const overlap = tempoBottomRel + TEMPO_ABOVE_PM_PX - pmTopRel;
        if (overlap <= 0) continue;

        const shiftUpSvg = overlap * scale;
        const tf = tempoG.dataset.maestroOriginalTransform ?? "";
        const m = tf.match(/translate\(\s*([-\d.]+)\s*,?\s*([-\d.]*)\s*\)/);
        if (m) {
          const tx = parseFloat(m[1]);
          const ty = parseFloat(m[2] || "0");
          // Clamp: new Y must be <= original Y (upward only)
          const newY = Math.min(ty, ty - shiftUpSvg);
          tempoG.setAttribute("transform", `translate(${tx}, ${newY})`);
        } else {
          tempoG.setAttribute("transform", `translate(0, ${-shiftUpSvg})`);
        }

        if (opts.debug)
          console.log(
            `[P4-PM] tempo elevation ↑ ${overlap.toFixed(1)}px / ${shiftUpSvg.toFixed(1)} SVG units`,
          );
      }
    }
  };

  update();

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
