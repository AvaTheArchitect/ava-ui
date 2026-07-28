// Diagnostic, opt-in Rocksmith-style per-string fret-number coloring.
//
// Uses AlphaTab's model-level note styling only:
//   note.style.colors.set(NoteSubElement.GuitarTabFretNumber, color)
// This targets exactly the fret-number glyph on the tab staff — no CSS, no
// SVG mutation, no text-content or coordinate matching. Classic/Maestro
// default (a797e57 theme-correct black/white via tablatureFont/mainGlyphColor)
// is untouched; this only ever runs when explicitly opted in.
//
// Gate: localStorage key 'maestro:fretColorScheme', values 'classic' | 'rocksmith'.
// Missing/invalid/unavailable → 'classic' (no-op).

const STORAGE_KEY = 'maestro:fretColorScheme';

export type FretColorScheme = 'classic' | 'rocksmith';

export function getFretColorScheme(): FretColorScheme {
    if (typeof window === 'undefined') return 'classic';
    try {
        return localStorage.getItem(STORAGE_KEY) === 'rocksmith' ? 'rocksmith' : 'classic';
    } catch {
        return 'classic';
    }
}

// Per-string colors, ordered low string -> high string (note.string: 1 = lowest
// string / bottom TAB line, per AlphaTab's own Note.string doc comment).
// Only string counts with an explicit, intentional palette are colored.
// Deliberately no modulo/wrap-around fallback for unlisted counts (e.g. 12-string
// until confirmed): wrapping a palette designed for 6 strings onto an unknown
// count would visually imply two different strings are "the same" string,
// which is actively misleading for a coloring scheme whose whole purpose is
// string identity — worse than leaving those notes at classic/default. Staves
// with an unlisted string count are skipped and reported, not colored.
const PALETTE_BY_STRING_COUNT: Readonly<Record<number, ReadonlyArray<readonly [number, number, number]>>> = {
    4: [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71]],
    5: [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229]],
    6: [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229], [142, 36, 170]],
    7: [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229], [142, 36, 170], [0, 137, 123]],
};

export interface ApplyRocksmithFretColorsResult {
    appliedCount: number;
    skippedStaffCount: number;
    stringCountsSeen: number[];
    unsupportedStringCountsSeen: number[];
}

interface AlphaTabModelRefs {
    NoteSubElement: any;
    NoteStyle: any;
    Color: any;
}

function emptyResult(): ApplyRocksmithFretColorsResult {
    return { appliedCount: 0, skippedStaffCount: 0, stringCountsSeen: [], unsupportedStringCountsSeen: [] };
}

// Applies Rocksmith-style per-string fret-number coloring to every eligible
// staff in the score. Safe to call on the full score model once per
// scoreLoaded — mutates Note.style in place, no return value is consumed by
// AlphaTab itself, callers just get a diagnostic summary back.
export function applyRocksmithFretColors(score: any, model: AlphaTabModelRefs): ApplyRocksmithFretColorsResult {
    const result = emptyResult();
    if (!score?.tracks?.length) return result;

    const { NoteSubElement, NoteStyle, Color } = model;
    if (!NoteSubElement || !NoteStyle || !Color) return result;

    for (const track of score.tracks) {
        const staff = track?.staves?.[0];
        if (!staff) { result.skippedStaffCount++; continue; }

        // Redundant, model-property-only skip guards — never track-name regex
        // (track-name matching has caused false positives elsewhere in this codebase).
        if (staff.isPercussion === true) { result.skippedStaffCount++; continue; }
        if (staff.showTablature === false) { result.skippedStaffCount++; continue; }

        const stringCount: number = staff.tuning?.length ?? staff.stringTuning?.tunings?.length ?? 0;
        if (!stringCount || stringCount <= 0) { result.skippedStaffCount++; continue; }

        if (!result.stringCountsSeen.includes(stringCount)) result.stringCountsSeen.push(stringCount);

        const palette = PALETTE_BY_STRING_COUNT[stringCount];
        if (!palette) {
            if (!result.unsupportedStringCountsSeen.includes(stringCount)) result.unsupportedStringCountsSeen.push(stringCount);
            result.skippedStaffCount++;
            continue;
        }

        for (const bar of staff.bars ?? []) {
            for (const voice of bar?.voices ?? []) {
                for (const beat of voice?.beats ?? []) {
                    for (const note of beat?.notes ?? []) {
                        const s = note?.string;
                        if (typeof s !== 'number' || !Number.isFinite(s) || s < 1 || s > palette.length) continue;
                        const rgb = palette[s - 1];
                        if (!rgb) continue; // never pass undefined to colors.set
                        note.style = note.style ?? new NoteStyle();
                        note.style.colors.set(NoteSubElement.GuitarTabFretNumber, new Color(rgb[0], rgb[1], rgb[2], 255));
                        result.appliedCount++;
                    }
                }
            }
        }
    }

    return result;
}
