"use client";
/**
 * alphaTabLyricsOverlay.ts
 * Version: v1.3
 * Date: July 21st, 2026
 *
 * Universal Maestro lyric overlay — works across GP3, GP5, GP7, GP8, and any
 * AlphaTab-supported format with lyric data in the score model.
 *
 * WHY THIS EXISTS:
 *   NotationElement.EffectLyrics = false is set globally in initAlphaTab.ts.
 *   This prevents AlphaTab from allocating a large above-staff lyric lane
 *   (confirmed: lyric rows shrink from ~176px → ~139px without it).
 *   This overlay re-renders those lyrics as HTML chips below each staff row,
 *   Songsterr-style, without touching AlphaTab's SVG or row geometry.
 *
 * ARCHITECTURE:
 *   - Starts from currently rendered api.tracks, then resolves each rendered
 *     track index back to api.score.tracks so the full staves→bars→voices→beats
 *     model is available.
 *   - Non-rendered tracks are ignored because they will not have usable
 *     visualBounds in boundsLookup.
 *   - Uses boundsLookup.findBeat(beat) for x/y placement.
 *   - Uses bb.onNotesX for horizontal centering (falls back to vb.x + vb.w/2).
 *   - Renders one <span> chip per lyric syllable, absolutely positioned.
 *   - Root div sits inside .alphatab-container itself (MAESTRO-LANDSCAPE-LYRICS-001-B) —
 *     the actual internally-scrolling element in landscape's horizontal continuous
 *     strip — not the outer, non-scrolling .alphatab-content-host. Chip x/y stay raw
 *     boundsLookup canvas coordinates (unchanged); native scroll of the containing
 *     element is what keeps them aligned with the score as it scrolls/seeks. Do not
 *     add manual scrollLeft/scrollTop subtraction here — that would double-compensate
 *     on top of the native scroll this mount point already provides.
 *   - Returns { update, destroy } matching the handle pattern of other overlays.
 *
 * CARRY QUEUE (v1.2):
 *   AlphaTab attaches lyric syllables to tie-destination / continuation beats
 *   (held notes), not to fresh vocal attacks. This causes the lyric stream to
 *   drift progressively later — 1 beat late, then 2, then 3 — each time a
 *   continuation beat consumes a lyric token.
 *
 *   Fix: a carry queue accumulates syllables found on continuation beats and
 *   rests, then drains them onto the next real fresh note attack in order.
 *
 *   Rules:
 *     continuation beat + lyric  → push lyric into carryQueue, skip rendering
 *     rest beat                  → skip, carryQueue unchanged
 *     fresh beat                 → if carryQueue non-empty, render carryQueue.shift()
 *                                  then if beat also has its own lyric, push THAT
 *                                  into carryQueue so it lands on the next fresh note
 *                                  if carryQueue empty, render beat's own lyric normally
 *
 * PLACEMENT:
 *   left = onNotesX + LYRIC_X_OFFSET
 *   top  = vb.y + vb.h + LYRIC_BELOW_STAFF_GAP
 *
 * TUNING CONSTANTS:
 *   LYRIC_BELOW_STAFF_GAP  — px below visualBounds bottom
 *   LYRIC_X_OFFSET         — global horizontal nudge
 *   LYRIC_FONT_SIZE        — chip font size in px
 */

// ── Tuning ────────────────────────────────────────────────────────────────────

const LYRIC_BELOW_STAFF_GAP = 26; // px — probe-confirmed June 2026
const LYRIC_X_OFFSET = 0; // px global horizontal nudge
const LYRIC_FONT_SIZE = 13; // px — matches Songsterr lyric size
const LYRIC_COLOR_LIGHT = "#1a1a1a";
const LYRIC_COLOR_DARK = "#e5e5e5";
const LYRIC_FONT_FAMILY = "Georgia, 'Times New Roman', serif";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlphaTabLyricsOverlayHandle {
  update: () => void;
  destroy: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true when this beat is a continuation/held note that should NOT
 * consume a lyric slot at its own position.
 * - Rests are NOT continuations (they are breath pauses).
 * - Only fires when ALL notes on the beat are tie-destinations or ghost/let-ring.
 */
function isContinuationBeat(beat: any): boolean {
  if (beat.isRest) return false;
  const notes: any[] = beat.notes ?? [];
  if (!notes.length) return false;
  return notes.every(
    (n) =>
      n.isTieDestination === true ||
      n.tieDestination === true ||
      n.isGhost === true ||
      n.isLetRingDestination === true,
  );
}

// ── Chip factory ──────────────────────────────────────────────────────────────

function makeChip(
  text: string,
  x: number,
  y: number,
  color: string,
  tick?: number,
): HTMLElement {
  const chip = document.createElement("span");
  chip.className = "at-lyric-chip";
  chip.textContent = text;
  if (tick != null) chip.dataset.tick = String(tick);
  Object.assign(chip.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    transform: "translateX(-50%)",
    fontSize: `${LYRIC_FONT_SIZE}px`,
    fontFamily: LYRIC_FONT_FAMILY,
    fontStyle: "italic",
    color,
    whiteSpace: "nowrap",
    userSelect: "none",
    lineHeight: "1",
  });
  return chip;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function runAlphaTabLyricsOverlay(
  containerEl: HTMLElement,
  api: any,
  theme: "light" | "dark" = "light",
): AlphaTabLyricsOverlayHandle {
  containerEl.querySelector(".at-lyrics-overlay")?.remove();

  const root = document.createElement("div");
  root.className = "at-lyrics-overlay";
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "800",
    overflow: "visible",
  });
  containerEl.appendChild(root);

  // ── Render pass ─────────────────────────────────────────────────────────────
  function render(currentTheme: "light" | "dark") {
    root.innerHTML = "";

    const bounds = api?.renderer?.boundsLookup;
    const renderedTracks: any[] = api?.tracks?.length
      ? api.tracks
          .map((rt: any) => {
            const idx = rt?.index;
            return api.score?.tracks?.find((t: any) => t.index === idx) ?? rt;
          })
          .filter(Boolean)
      : [];
    if (!bounds || !renderedTracks.length) return;

    const color =
      currentTheme === "dark" ? LYRIC_COLOR_DARK : LYRIC_COLOR_LIGHT;

    for (const track of renderedTracks) {
      for (const stave of track.staves ?? []) {
        // Collect voice-0 beats across all bars in stave order so the carry
        // queue works correctly across bar boundaries.
        const allBeats: any[] = [];
        for (const bar of stave.bars ?? []) {
          const voice = bar.voices?.[0];
          if (voice) allBeats.push(...(voice.beats ?? []));
        }

        // Carry queue: syllables displaced from continuation beats, drained
        // onto the next real fresh note in FIFO order.
        const carryQueue: string[] = [];

        for (const beat of allBeats) {
          const lyric0 = Array.isArray(beat.lyrics)
            ? (beat.lyrics[0] ?? "").trim()
            : "";

          const isContinuation = isContinuationBeat(beat);
          const isRest = !!beat.isRest;

          // ── Continuation beat ──────────────────────────────────────────────
          if (isContinuation) {
            // Lyric on a tied/ghost note — defer it; don't render here.
            if (lyric0) carryQueue.push(lyric0);
            continue;
          }

          // ── Rest beat ─────────────────────────────────────────────────────
          if (isRest) {
            // Breath pause — carry queue unchanged, nothing rendered.
            continue;
          }

          // ── Fresh note attack ─────────────────────────────────────────────
          const bb = bounds.findBeat?.(beat);
          const vb = bb?.visualBounds;
          if (!vb) continue;

          const x =
            (typeof bb.onNotesX === "number" ? bb.onNotesX : vb.x + vb.w / 2) +
            LYRIC_X_OFFSET;
          const y = vb.y + vb.h + LYRIC_BELOW_STAFF_GAP;

          if (carryQueue.length > 0) {
            // Drain the oldest carried syllable onto this beat.
            const carried = carryQueue.shift()!;
            root.appendChild(
              makeChip(carried, x, y, color, beat.absolutePlaybackStart),
            );
            // If this beat also has its own lyric, push it into the queue
            // so it cascades to the next fresh note.
            if (lyric0) carryQueue.push(lyric0);
          } else if (lyric0) {
            // No carry — render this beat's own lyric normally.
            root.appendChild(
              makeChip(lyric0, x, y, color, beat.absolutePlaybackStart),
            );
          }
        }

        // Any syllables remaining at stave end are orphaned — drop cleanly.
        carryQueue.length = 0;
      }
    }

    console.log(
      `[lyrics-overlay] v1.2 rendered ${root.children.length} lyric chips`,
      { theme: currentTheme },
    );
  }

  render(theme);

  return {
    update() {
      render(theme);
    },
    destroy() {
      root.remove();
    },
  };
}
