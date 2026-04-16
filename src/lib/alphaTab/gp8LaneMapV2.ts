"use client";
/**
 * gp8LaneMapV2.ts
 * Date: April 13th, 2026 — v2.0 (lane-aware registry; identity only, zero pixel math)
 *
 * Lane Registry — owns classification and spacing policy only.
 * gp8LayoutEngineV2.ts is the sole DOM writer; it reads lane definitions
 * from here and applies them via a single reservation → write pass.
 *
 * Lane order above staff (top → bottom, closest to staff last):
 *   SectionHeader  — Intro / Verse / Chorus / Bridge
 *   TempoCluster   — BPM, Half Time, Double Time
 *   ChordSymbol    — Chord names above staff
 *   TechText       — P.M., let ring, vibrato, tap labels
 *   TechSymbol     — Ornament glyph groups (g.at-*)
 *
 * Lyrics are always below-staff (basement lane, handled separately).
 *
 * Unused lanes collapse to zero — SRV stays tight, Van Halen expands only
 * where it must. See buildRowPlan() in gp8LayoutEngineV2.ts for headroom logic.
 */

export enum LaneType {
  SectionHeader = 0, // Intro / Verse / Chorus / Bridge
  TempoCluster = 1, // BPM, Half Time, Double Time
  ChordSymbol = 2, // Chord names above staff
  TechText = 3, // P.M., let ring, vibrato, tap labels
  TechSymbol = 4, // Ornament glyph groups (g.at-*)
  Lyrics = 5, // Below-staff — always basement, handled separately
}

// Visual priority order above staff: top → bottom (Lyrics excluded)
export const ABOVE_STAFF_LANES: LaneType[] = [
  LaneType.SectionHeader,
  LaneType.TempoCluster,
  LaneType.ChordSymbol,
  LaneType.TechText,
  LaneType.TechSymbol,
];

/**
 * Distances above staffTopY for each lane (AlphaTab coordinate system).
 * From SVG spy: staffTopY=111.83, tempo y≈29.34, section y≈34.89
 *   tempo distance above staff  = 111.83 - 29.34 ≈ 82
 *   section distance above staff = 111.83 - 34.89 ≈ 77
 *
 * slot.y = staffTopY - LANE_Y_OFFSET[lane]
 * (equivalent to Songsterr's negative-Y system, but in AlphaTab's positive space)
 */
export const LANE_Y_OFFSET: Record<LaneType, number> = {
  [LaneType.SectionHeader]: 77, // staffTopY - 77 ≈ section label position
  [LaneType.TempoCluster]: 82, // staffTopY - 82 ≈ tempo text position
  [LaneType.ChordSymbol]: 60, // between section and bar numbers
  [LaneType.TechText]: 20, // just above bar numbers
  [LaneType.TechSymbol]: 20,
  [LaneType.Lyrics]: 0, // not used — handled by fixLyrics()
};

/** Height of each lane row — used only for x-collision spill calculation. */
export const LANE_ROW_HEIGHT: Record<LaneType, number> = {
  [LaneType.SectionHeader]: 18,
  [LaneType.TempoCluster]: 16,
  [LaneType.ChordSymbol]: 16,
  [LaneType.TechText]: 14,
  [LaneType.TechSymbol]: 14,
  [LaneType.Lyrics]: 16,
};

export const LANE_GAP = 3; // px between spill sub-rows

// ─── Classifiers ─────────────────────────────────────────────────────────────

const RX_SECTION =
  /^(intro|verse|chorus|bridge|pre[-\s]?chorus|outro|solo|interlude|fill|break|hook|half[\s-]?time|double[\s-]?time)/i;
const RX_TEMPO = /^\s*=\s*\d+$|^\d+\s*(bpm|♩|♪)?$/i;
const RX_TECH =
  /^(p\.?m\.?|let\s*ring|vibrato|tap|harm\.|pinch\s*harm\.|p\.h\.|n\.h\.|w\/bar|dive|slide)/i;
const RX_CHORD = /^[A-G][#b]?(maj|min|m|sus\d?|dim|aug|add\d|\d)*[^\s]{0,6}$/;

export function classifyText(el: SVGElement): LaneType | null {
  const text = el.textContent?.trim() ?? "";
  if (!text) return null;
  if (RX_SECTION.test(text)) return LaneType.SectionHeader;
  if (RX_TEMPO.test(text)) return LaneType.TempoCluster;
  if (RX_TECH.test(text)) return LaneType.TechText;
  if (RX_CHORD.test(text)) return LaneType.ChordSymbol;
  // Unknown text → do NOT move. Only relocate what we can confidently classify.
  return null;
}

export function classifyGlyphGroup(el: SVGElement): LaneType | null {
  const cls = el.getAttribute("class") ?? "";
  if (cls.includes("at-section") || cls.includes("rehearsal"))
    return LaneType.SectionHeader;
  if (cls.includes("at-tempo")) return LaneType.TempoCluster;
  if (cls.includes("at-chord")) return LaneType.ChordSymbol;
  if (cls.includes("at-") || cls.startsWith("g-")) return LaneType.TechSymbol;
  return null;
}
