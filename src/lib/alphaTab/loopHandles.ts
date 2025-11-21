/**
 * Loop Handle Management - V92 (V61 Compatible)
 * Date: November 20th, 2025
 *
 * Extracted from Master AlphaTabRenderer backup (V61)
 * Uses tickCache.findBeat() for proper beat lookup
 *
 * 🎯 PURPOSE:
 * - Create purple loop handles (DOM elements)
 * - Position handles based on AlphaTab beat bounds
 * - Attach drag handlers for user interaction
 *
 * 🔧 STYLING SPLIT:
 * - Inline styles here: Dynamic positioning, colors, dimensions
 * - alphaTab.css: Class definitions and z-index overrides
 */

import type { AlphaTabApi } from "./types";

// ==================== CREATE LOOP HANDLES ====================

/**
 * Creates the DOM elements for start and end loop handles
 * Returns refs to both handles for positioning and cleanup
 */
export const createLoopHandles = (container: HTMLElement) => {
  console.log("🎨 Creating loop handles...");

  // ========== START HANDLE (Left Side) ==========
  const startHandle = document.createElement("div");
  startHandle.className = "maestro-loop-handle maestro-loop-handle-start";

  // Inline styles for dynamic positioning
  startHandle.style.cssText = `
    position: absolute;
    width: 3px;
    background: rgba(147, 51, 234, 0.9) !important;
    border: none !important;
    border-radius: 0 !important;
    display: none;
    z-index: 1001;
    cursor: ew-resize;
    pointer-events: auto;
    user-select: none !important;
    -webkit-user-select: none !important;
  `;

  // Start handle bubble (right side of line, shows ">")
  const startBubble = document.createElement("div");
  startBubble.className = "maestro-loop-bubble";
  startBubble.innerHTML = "&gt;";
  startBubble.style.cssText = `
    position: absolute;
    width: 14px;
    height: 26px;
    background: rgba(147, 51, 234, 0.95) !important;
    color: #fff;
    font-size: 11px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    line-height: 26px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: ew-resize;
    pointer-events: auto;
    touch-action: none;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-touch-callout: none !important;
    right: 1px;
    border-radius: 7px 0 0 7px !important;
  `;

  startBubble.addEventListener("mousedown", (e) => e.preventDefault(), {
    capture: true,
  });
  startBubble.addEventListener("touchstart", (e) => e.preventDefault(), {
    passive: false,
    capture: true,
  });
  startBubble.addEventListener("click", (e) => e.preventDefault(), {
    capture: true,
  });

  startHandle.appendChild(startBubble);

  // ========== END HANDLE (Right Side) ==========
  const endHandle = document.createElement("div");
  endHandle.className = "maestro-loop-handle maestro-loop-handle-end";

  endHandle.style.cssText = `
    position: absolute;
    width: 3px;
    background: rgba(147, 51, 234, 0.9) !important;
    border: none !important;
    border-radius: 0 !important;
    display: none;
    z-index: 1001;
    cursor: ew-resize;
    pointer-events: auto;
    user-select: none !important;
    -webkit-user-select: none !important;
  `;

  // End handle bubble (left side of line, shows "<")
  const endBubble = document.createElement("div");
  endBubble.className = "maestro-loop-bubble";
  endBubble.innerHTML = "&lt;";
  endBubble.style.cssText = `
    position: absolute;
    width: 14px;
    height: 26px;
    background: rgba(147, 51, 234, 0.95) !important;
    color: #fff;
    font-size: 11px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    line-height: 26px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    cursor: ew-resize;
    pointer-events: auto;
    touch-action: none;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-touch-callout: none !important;
    left: 1px;
    border-radius: 0 7px 7px 0 !important;
  `;

  endBubble.addEventListener("mousedown", (e) => e.preventDefault(), {
    capture: true,
  });
  endBubble.addEventListener("touchstart", (e) => e.preventDefault(), {
    passive: false,
    capture: true,
  });
  endBubble.addEventListener("click", (e) => e.preventDefault(), {
    capture: true,
  });

  endHandle.appendChild(endBubble);

  // Append to container
  container.appendChild(startHandle);
  container.appendChild(endHandle);

  console.log("✅ Loop handles created");
  return { startHandle, endHandle };
};

// ==================== UPDATE HANDLE POSITIONS (V61 Method) ====================

/**
 * Calculates and updates the position of loop handles based on AlphaTab beat bounds
 * Uses tickCache.findBeat() method from V61 for compatibility
 */
export const updateHandlePositions = (
  api: AlphaTabApi,
  container: HTMLElement,
  startHandle: HTMLDivElement,
  endHandle: HTMLDivElement,
  source: string = "unknown"
) => {
  // Safety checks
  if (!api.playbackRange || !api.renderer?.boundsLookup || !api.tracks) {
    startHandle.style.display = "none";
    endHandle.style.display = "none";
    return;
  }

  if (
    !api.renderer.boundsLookup.staffSystems ||
    api.renderer.boundsLookup.staffSystems.length === 0
  ) {
    console.warn("⚠️ No staff systems available yet");
    startHandle.style.display = "none";
    endHandle.style.display = "none";
    return;
  }

  const { startTick, endTick } = api.playbackRange;
  const trackIndices = new Set<number>(api.tracks.map((t: any) => t.index));

  try {
    // V61 Method: Use tickCache if available
    if (!(api as any).tickCache) {
      console.warn("⚠️ tickCache not available");
      startHandle.style.display = "none";
      endHandle.style.display = "none";
      return;
    }

    const startResult = (api as any).tickCache?.findBeat(
      trackIndices,
      startTick
    );
    const endResult = (api as any).tickCache?.findBeat(trackIndices, endTick);

    if (!startResult?.beat || !endResult?.beat) {
      console.warn("⚠️ Could not find beats via tickCache");
      startHandle.style.display = "none";
      endHandle.style.display = "none";
      return;
    }

    const startBounds = api.renderer.boundsLookup.findBeat(startResult.beat);
    const endBounds = api.renderer.boundsLookup.findBeat(endResult.beat);

    if (!startBounds?.realBounds || !endBounds?.realBounds) {
      console.warn("⚠️ Could not find beat bounds");
      startHandle.style.display = "none";
      endHandle.style.display = "none";
      return;
    }

    const HANDLE_INSET = 5;

    // Calculate start handle position
    let startHandleTop: number;
    let startHandleHeight: number;

    if (startBounds?.barBounds?.masterBarBounds?.visualBounds) {
      const masterBounds = startBounds.barBounds.masterBarBounds.visualBounds;
      startHandleTop = masterBounds.y + HANDLE_INSET;
      startHandleHeight = masterBounds.h - HANDLE_INSET * 2;
    } else if (startBounds?.barBounds?.visualBounds) {
      const barBounds = startBounds.barBounds.visualBounds;
      startHandleTop = barBounds.y + HANDLE_INSET;
      startHandleHeight = barBounds.h - HANDLE_INSET * 2;
    } else {
      const staffBounds = startBounds.realBounds;
      const extraPadding = 20;
      startHandleTop = staffBounds.y - extraPadding + HANDLE_INSET;
      startHandleHeight = staffBounds.h + extraPadding * 2 - HANDLE_INSET * 2;
    }

    // Apply start handle styles
    startHandle.style.left = `${startBounds.realBounds.x - 1.5}px`;
    startHandle.style.top = `${startHandleTop}px`;
    startHandle.style.height = `${startHandleHeight}px`;
    startHandle.style.display = "block";

    // Position start bubble vertically centered
    const startBubble = startHandle.querySelector(
      ".maestro-loop-bubble"
    ) as HTMLElement;
    if (startBubble) {
      const staffBounds = startBounds.realBounds;
      const dStringOffset = staffBounds.h * 0.5;
      const bubbleAbsoluteY = staffBounds.y + dStringOffset;
      const bubbleRelativeY = bubbleAbsoluteY - startHandleTop;

      startBubble.style.top = `${bubbleRelativeY}px`;
      startBubble.style.transform = "translateY(-50%)";
    }

    // Calculate end handle position
    let endHandleTop: number;
    let endHandleHeight: number;

    if (endBounds?.barBounds?.masterBarBounds?.visualBounds) {
      const masterBounds = endBounds.barBounds.masterBarBounds.visualBounds;
      endHandleTop = masterBounds.y + HANDLE_INSET;
      endHandleHeight = masterBounds.h - HANDLE_INSET * 2;
    } else if (endBounds?.barBounds?.visualBounds) {
      const barBounds = endBounds.barBounds.visualBounds;
      endHandleTop = barBounds.y + HANDLE_INSET;
      endHandleHeight = barBounds.h - HANDLE_INSET * 2;
    } else {
      const staffBounds = endBounds.realBounds;
      const extraPadding = 20;
      endHandleTop = staffBounds.y - extraPadding + HANDLE_INSET;
      endHandleHeight = staffBounds.h + extraPadding * 2 - HANDLE_INSET * 2;
    }

    // Apply end handle styles
    endHandle.style.left = `${
      endBounds.realBounds.x + endBounds.realBounds.w - 1.5
    }px`;
    endHandle.style.top = `${endHandleTop}px`;
    endHandle.style.height = `${endHandleHeight}px`;
    endHandle.style.display = "block";

    // Position end bubble vertically centered
    const endBubble = endHandle.querySelector(
      ".maestro-loop-bubble"
    ) as HTMLElement;
    if (endBubble) {
      const staffBounds = endBounds.realBounds;
      const dStringOffset = staffBounds.h * 0.5;
      const bubbleAbsoluteY = staffBounds.y + dStringOffset;
      const bubbleRelativeY = bubbleAbsoluteY - endHandleTop;

      endBubble.style.top = `${bubbleRelativeY}px`;
      endBubble.style.transform = "translateY(-50%)";
    }

    console.log(
      `📍 Handles positioned (${source}): start=${startBounds.realBounds.x}px, end=${endBounds.realBounds.x}px`
    );
  } catch (error) {
    console.error("❌ Error updating handle positions:", error);
    startHandle.style.display = "none";
    endHandle.style.display = "none";
  }
};

// ==================== ATTACH DRAG HANDLERS ====================

/**
 * Attaches mouse and touch event listeners for dragging loop handles
 * Returns cleanup function to remove listeners
 */
export const attachHandleDragHandlers = (
  api: AlphaTabApi,
  container: HTMLElement,
  startHandle: HTMLDivElement,
  endHandle: HTMLDivElement,
  onRangeChange?: (startTick: number, endTick: number) => void
): (() => void) => {
  console.log("🖱️ Attaching drag handlers...");

  let isDragging = false;
  let dragTarget: "start" | "end" | null = null;
  let scrollY = 0;

  const preventSelection = (e: Event) => {
    if (isDragging) {
      e.preventDefault();
      return false;
    }
  };

  // Handler: Start dragging
  const handleStart = (e: MouseEvent | TouchEvent, target: "start" | "end") => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    dragTarget = target;

    scrollY = window.scrollY;

    // Prevent page scrolling during drag
    document.body.style.overflow = "hidden";
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const handle = target === "start" ? startHandle : endHandle;
    const bubble = handle.querySelector(".maestro-loop-bubble") as HTMLElement;

    if (bubble) {
      bubble.style.pointerEvents = "none";
      bubble.style.transform = "translateY(-50%) scale(1.15)";
    }

    document.addEventListener("selectstart", preventSelection);
    document.addEventListener("dragstart", preventSelection);

    console.log(`🎯 Started dragging ${target} handle`);
  };

  // Handler: Dragging in progress
  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragTarget || !api.playbackRange) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Get beat at current position
    if (!api.renderer?.boundsLookup) return;

    const rect = container.getBoundingClientRect();
    const relX = clientX - rect.left + container.scrollLeft;
    const relY = clientY - rect.top + container.scrollTop;
    const beat = api.renderer.boundsLookup.getBeatAtPos(relX, relY);

    if (!beat || beat.absolutePlaybackStart === undefined) return;

    const { startTick, endTick } = api.playbackRange;

    // Update range based on which handle is being dragged
    if (dragTarget === "start" && beat.absolutePlaybackStart < endTick) {
      const newRange = {
        startTick: beat.absolutePlaybackStart,
        endTick,
      };
      api.playbackRange = newRange;

      if (onRangeChange) {
        onRangeChange(beat.absolutePlaybackStart, endTick);
      }

      // Update visual positions immediately
      updateHandlePositions(api, container, startHandle, endHandle, "drag");
    } else if (dragTarget === "end" && beat.absolutePlaybackStart > startTick) {
      const newRange = {
        startTick,
        endTick: beat.absolutePlaybackStart,
      };
      api.playbackRange = newRange;

      if (onRangeChange) {
        onRangeChange(startTick, beat.absolutePlaybackStart);
      }

      // Update visual positions immediately
      updateHandlePositions(api, container, startHandle, endHandle, "drag");
    }
  };

  // Handler: Stop dragging
  const handleEnd = () => {
    if (!isDragging) return;

    console.log(`✅ Stopped dragging ${dragTarget} handle`);

    // Restore page scroll
    document.body.style.overflow = "";
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";

    window.scrollTo(0, scrollY);

    document.removeEventListener("selectstart", preventSelection);
    document.removeEventListener("dragstart", preventSelection);

    if (dragTarget) {
      const handle = dragTarget === "start" ? startHandle : endHandle;
      const bubble = handle.querySelector(
        ".maestro-loop-bubble"
      ) as HTMLElement;
      if (bubble) {
        bubble.style.pointerEvents = "auto";
        bubble.style.transform = "translateY(-50%)";
      }
    }

    isDragging = false;
    dragTarget = null;
  };

  // Attach listeners to start handle
  const startBubble = startHandle.querySelector(".maestro-loop-bubble");
  if (startBubble) {
    startBubble.addEventListener(
      "mousedown",
      (e) => handleStart(e as MouseEvent, "start"),
      { capture: true }
    );
    startBubble.addEventListener(
      "touchstart",
      (e) => handleStart(e as TouchEvent, "start"),
      { passive: false, capture: true }
    );
  }

  startHandle.addEventListener(
    "mousedown",
    (e) => handleStart(e as MouseEvent, "start"),
    { capture: true }
  );
  startHandle.addEventListener(
    "touchstart",
    (e) => handleStart(e as TouchEvent, "start"),
    { passive: false, capture: true }
  );

  // Attach listeners to end handle
  const endBubble = endHandle.querySelector(".maestro-loop-bubble");
  if (endBubble) {
    endBubble.addEventListener(
      "mousedown",
      (e) => handleStart(e as MouseEvent, "end"),
      { capture: true }
    );
    endBubble.addEventListener(
      "touchstart",
      (e) => handleStart(e as TouchEvent, "end"),
      { passive: false, capture: true }
    );
  }

  endHandle.addEventListener(
    "mousedown",
    (e) => handleStart(e as MouseEvent, "end"),
    { capture: true }
  );
  endHandle.addEventListener(
    "touchstart",
    (e) => handleStart(e as TouchEvent, "end"),
    { passive: false, capture: true }
  );

  // Document-level move and end listeners
  document.addEventListener("mousemove", handleMove, { passive: false });
  document.addEventListener("touchmove", handleMove, { passive: false });
  document.addEventListener("mouseup", handleEnd);
  document.addEventListener("touchend", handleEnd);
  document.addEventListener("touchcancel", handleEnd);

  console.log("✅ Drag handlers attached");

  // Return cleanup function
  return () => {
    console.log("🧹 Cleaning up drag handlers...");
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
    document.removeEventListener("touchend", handleEnd);
    document.removeEventListener("touchcancel", handleEnd);
    document.removeEventListener("selectstart", preventSelection);
    document.removeEventListener("dragstart", preventSelection);

    // Restore body styles
    document.body.style.overflow = "";
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
  };
};
