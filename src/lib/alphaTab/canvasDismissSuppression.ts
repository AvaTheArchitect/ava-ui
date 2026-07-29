/**
 * canvasDismissSuppression.ts
 *
 * PANEL-DISMISS-PLAYBACK-LEAK-001 — hybrid guard.
 *
 * A panel dismissed by clicking/tapping the AlphaTab score/canvas closes via a
 * document-level mousedown listener (MaestroControlPanel), but that same physical
 * gesture also reaches AlphaTab's own native click/dblclick/touchend listeners on
 * `.at-surface`, which independently seek or toggle playback. Two signals are
 * needed here, not one, because live event-order measurement showed the two input
 * types are NOT symmetric:
 *
 * - Desktop: the dismiss-detecting mousedown fires ~14ms before the click event
 *   AlphaTabRenderer's handleClick/handleDblClick listen for — a short-lived
 *   timestamp token set in that mousedown is measurably in time to gate them.
 * - Landscape: AlphaTab's own touchend (which drives its tap-to-play toggle)
 *   completes ~1.8ms BEFORE the synthetic mousedown that closes the panel even
 *   begins — a mousedown-set token is provably too late for touchend. It must
 *   instead check a plain, synchronously-maintained "is a blocking panel
 *   currently open" ref, which is still true at that moment (the panel hasn't
 *   closed yet — that only happens once the later mousedown runs).
 *
 * No React state, no storage, no production logging — a tiny shared module only.
 */

// ---- Live panel-open signal (touch path: AlphaTabRenderer's handleTouchEnd) ----
// Written to synchronously by the owning panel's own open/close call sites, not
// derived from a render or effect — must be correct at the exact moment a native
// touchend fires, which can precede any state-driven re-render.
export const canvasInteractionBlockingPanelOpenRef: { current: boolean } = { current: false };

// ---- Short-lived dismiss token (mouse path: handleClick/handleDblClick) ----
// 120ms — roughly 8.5x the measured ~14ms mousedown-to-click margin on desktop,
// comfortably short of realistic deliberate-next-gesture spacing.
const SUPPRESSION_WINDOW_MS = 120;

let suppressUntil = 0;

export function markCanvasDismissSuppression(): void {
    suppressUntil = Date.now() + SUPPRESSION_WINDOW_MS;
}

export function shouldSuppressCanvasInteraction(): boolean {
    return Date.now() < suppressUntil;
}
