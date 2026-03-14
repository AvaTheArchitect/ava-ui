// src/lib/song-data/tunings.ts

/**
 * Tuning Data — Canonical Source
 * March 14th, 2026
 *
 * Single source of truth for all tuning display options, MIDI maps,
 * and instrument/tuning detection utilities.
 * Import from '@/lib/song-data' — do not define tunings inline elsewhere.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TuningOption {
  label: string;
  value: string;
}

// ─── Display Options ──────────────────────────────────────────────────────────

export const TUNINGS: TuningOption[] = [
  // ── Default ──
  { label: "Any tunings", value: "any" },

  // ── 6-string standard / half-step variants ──
  { label: "Standard 6-string (E A D G B E)", value: "std6" },
  { label: "Eb/D# standard (D# G# C# F# A# D#)", value: "eb_std" },
  { label: "D standard (D G C F A D)", value: "d_std" },
  { label: "C# standard (C# F# B E G# C#)", value: "cs_std" },
  { label: "C standard (C F A# D# G C)", value: "c_std" },
  { label: "B standard (B E A D F# B)", value: "b_std" },
  { label: "A# standard (A# D# G# C# F A#)", value: "as_std" },
  { label: "A standard (A D G C E A)", value: "a_std" },

  // ── 6-string drop ──
  { label: "Drop D (D A D G B E)", value: "drop_d" },
  { label: "Drop C# (C# G# C# F# A# D#)", value: "drop_cs" },
  { label: "Drop C (C G C F A D)", value: "drop_c" },
  { label: "Drop B (B F# B E G# C#)", value: "drop_b" },
  { label: "Drop A# (A# F A# D# G C)", value: "drop_as" },
  { label: "Drop A (A E A D F# B)", value: "drop_a" },
  { label: "Drop G# (G# D# G# C# F A#)", value: "drop_gs" },
  { label: "Drop G (G D G C E A)", value: "drop_g" },
  { label: "Drop F# (F# C# F# B D# G#)", value: "drop_fs" },
  { label: "Drop F (F C F A# D G)", value: "drop_f" },

  // ── 7-string standard ──
  { label: "Standard 7-string (B E A D G B E)", value: "std7" },
  {
    label: "Half-Step Down 7-string (A# D# G# C# F# A# D#)",
    value: "half_down_7",
  },
  { label: "D standard 7-string (A D G C F A D)", value: "d_std7" },
  { label: "C# standard 7-string (G# C# F# B E G# C#)", value: "cs_std7" },
  { label: "C standard 7-string (G C F A# D# G C)", value: "c_std7" },
  { label: "B standard 7-string (F# B E A D F# B)", value: "b_std7" },
  { label: "A# standard 7-string (F A# D# G# C# F A#)", value: "as_std7" },
  { label: "A standard 7-string (E A D G C E A)", value: "a_std7" },

  // ── 7-string drop ──
  { label: "Drop A 7-string (A E A D G B E)", value: "drop_a7" },
  { label: "Drop G# 7-string (G# D# G# C# F# A# D#)", value: "drop_gs7" },
  { label: "Drop G 7-string (G D G C F A D)", value: "drop_g7" },
  { label: "Drop F# 7-string (F# C# F# B E G# C#)", value: "drop_fs7" },
  { label: "Drop F 7-string (F C F A# D# G C)", value: "drop_f7" },

  // ── 8-string standard ──
  { label: "Standard 8-string (F# B E A D G B E)", value: "std8" },
  { label: "Standard 8-string (C# F# B E A D G B E)", value: "std8b" },
  { label: "Standard 8-string (G# C# F# B E A D G B E)", value: "std9" },
  { label: "D standard 8-string (E A D G C F A D)", value: "d_std8" },
  { label: "C# standard 8-string (D# G# C# F# B E G# C#)", value: "cs_std8" },
  { label: "C standard 8-string (D G C F A# D# G C)", value: "c_std8" },
  { label: "B standard 8-string (C# F# B E A D F# B)", value: "b_std8" },
  { label: "A# standard 8-string (C F A# D# G# C# F A#)", value: "as_std8" },
  { label: "A standard 8-string (B E A D G C E A)", value: "a_std8" },

  // ── 8-string drop ──
  { label: "Drop E 8-string (E B E A D G B E)", value: "drop_e8" },
  { label: "Drop D 8-string (D B E A D G B E)", value: "drop_d8" },
  { label: "Drop C# 8-string (C# B E A D G B E)", value: "drop_cs8" },
  { label: "Drop C 8-string (C B E A D G B E)", value: "drop_c8" },

  // ── Bass: standard ──
  { label: "Bass: Standard 4-string (E A D G)", value: "bass4" },
  { label: "Bass: Standard 5-string (B E A D G)", value: "bass5" },
  { label: "Bass: Standard 6-string (B E A D G C)", value: "bass6" },
  { label: "Bass: Standard 7-string (B E A D G C F)", value: "bass7" },
  { label: "Bass: D# standard (D# G# C# F#)", value: "bass_ds" },
  { label: "Bass: D standard (D G C F)", value: "bass_d" },
  { label: "Bass: C# standard (C# F# B E)", value: "bass_cs" },
  { label: "Bass: C standard (C F A# D#)", value: "bass_c" },
  { label: "Bass: B standard (B E A D)", value: "bass_b" },
  { label: "Bass: A# standard (A# D# G# C#)", value: "bass_as" },
  { label: "Bass: A standard (A D G C)", value: "bass_a" },

  // ── Bass: drop ──
  { label: "Bass: Drop D (D A D G)", value: "bass_drop_d" },
  { label: "Bass: Drop C# (C# G# C# F#)", value: "bass_drop_cs" },
  { label: "Bass: Drop C (C G C F)", value: "bass_drop_c" },
  { label: "Bass: Drop B (B F# B E)", value: "bass_drop_b" },
  { label: "Bass: Drop A# (A# F A# D#)", value: "bass_drop_as" },
  { label: "Bass: Drop A (A E A D)", value: "bass_drop_a" },

  // ── 12-string ──
  // Note: D Standard is the mechanical default for many 12-strings due to
  // doubled string tension (~153kg vs 78kg on a 6-string). Players often
  // capo fret 2 to play in Standard E shapes.
  { label: "12-String: Standard (E A D G B E)", value: "12std" },
  { label: "12-String: D Standard (D G C F A D)", value: "12d_std" },
  { label: "12-String: Eb Standard (D# G# C# F# A# D#)", value: "12eb_std" },
  { label: "12-String: Drop D (D A D G B E)", value: "12drop_d" },
  { label: "12-String: Open G (D G D G B D)", value: "12open_g" },
  { label: "12-String: Open D (D A D F# A D)", value: "12open_d" },
  { label: "12-String: DADGAD (D A D G A D)", value: "12dadgad" },
];

// ─── MIDI Map ─────────────────────────────────────────────────────────────────

export const TUNING_MIDI_MAP: Array<{ midi: number[]; slug: string }> = [
  // ── 6-string standard ──
  { midi: [64, 59, 55, 50, 45, 40], slug: "std6" },
  { midi: [63, 58, 54, 49, 44, 39], slug: "eb_std" },
  { midi: [62, 57, 53, 48, 43, 38], slug: "d_std" },
  { midi: [61, 56, 52, 47, 42, 37], slug: "cs_std" },
  { midi: [60, 55, 51, 46, 41, 36], slug: "c_std" },
  { midi: [59, 54, 50, 45, 40, 35], slug: "b_std" },
  { midi: [58, 53, 49, 44, 39, 34], slug: "as_std" },
  { midi: [57, 52, 48, 43, 38, 33], slug: "a_std" },

  // ── 6-string drop ──
  { midi: [64, 59, 55, 50, 45, 38], slug: "drop_d" },
  { midi: [63, 58, 54, 49, 44, 37], slug: "drop_cs" },
  { midi: [62, 57, 53, 48, 43, 36], slug: "drop_c" },
  { midi: [61, 56, 52, 47, 42, 35], slug: "drop_b" },
  { midi: [60, 55, 51, 46, 41, 34], slug: "drop_as" },
  { midi: [59, 54, 50, 45, 40, 33], slug: "drop_a" },
  { midi: [58, 53, 49, 44, 39, 32], slug: "drop_gs" },
  { midi: [57, 52, 48, 43, 38, 31], slug: "drop_g" },
  { midi: [56, 51, 47, 42, 37, 30], slug: "drop_fs" },
  { midi: [55, 50, 46, 41, 36, 29], slug: "drop_f" },

  // ── 7-string standard ──
  { midi: [64, 59, 55, 50, 45, 40, 35], slug: "std7" },
  { midi: [63, 58, 54, 49, 44, 39, 34], slug: "half_down_7" },
  { midi: [62, 57, 53, 48, 43, 38, 33], slug: "d_std7" },
  { midi: [61, 56, 52, 47, 42, 37, 32], slug: "cs_std7" },
  { midi: [60, 55, 51, 46, 41, 36, 31], slug: "c_std7" },
  { midi: [59, 54, 50, 45, 40, 35, 30], slug: "b_std7" },

  // ── 7-string drop ──
  { midi: [64, 59, 55, 50, 45, 40, 33], slug: "drop_a7" },

  // ── Bass ──
  { midi: [55, 50, 45, 40], slug: "bass4" },
  { midi: [55, 50, 45, 40, 35], slug: "bass5" },
  { midi: [55, 50, 45, 40, 35, 30], slug: "bass6" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

export function detectTuningSlug(midi: number[]): string | null {
  return (
    TUNING_MIDI_MAP.find(
      (t) =>
        t.midi.length === midi.length && t.midi.every((v, i) => v === midi[i]),
    )?.slug ?? null
  );
}

export function detectInstrumentFromMidi(
  midi: number[],
  isPercussion: boolean,
): string | null {
  if (isPercussion) return "drums";
  const len = midi.length;
  if (len <= 4) return "bass4";
  if (len === 5) return "bass5";
  if (len === 6)
    return midi.reduce((a, b) => a + b, 0) / len < 48 ? "bass4" : "guitar6";
  if (len === 7) return "guitar7";
  if (len >= 12) return "guitar12";
  return "guitar6";
}
