// Auto-scroll engine for keeping cursor in view
// Songsterr-style smooth scrolling behavior

export interface ScrollOptions {
    leadingPixels?: number;
    trailingPixels?: number;
    behavior?: ScrollBehavior;
}

const DEFAULT_OPTIONS: Required<ScrollOptions> = {
    leadingPixels: 300,  // Scroll when cursor is 300px from right edge
    trailingPixels: 100, // Scroll when cursor is 100px from left edge
    behavior: 'smooth'
};

/**
 * Smoothly scrolls container to keep cursor centered
 * @param container - The scrollable container (typically .at-surface)
 * @param cursorX - Current X position of cursor
 * @param options - Scroll behavior options
 */
export function scrollToCursor(
    container: HTMLElement | null,
    cursorX: number,
    options: ScrollOptions = {}
): void {
    if (!container) return;

    const { leadingPixels, trailingPixels, behavior } = { ...DEFAULT_OPTIONS, ...options };

    const viewportWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const rightEdge = scrollLeft + viewportWidth;

    // Check if cursor is outside the comfortable viewing area
    const needsScrollRight = cursorX > rightEdge - leadingPixels;
    const needsScrollLeft = cursorX < scrollLeft + trailingPixels;

    if (needsScrollRight || needsScrollLeft) {
        // Center the cursor in the viewport
        const targetScroll = Math.max(0, cursorX - viewportWidth / 2);

        container.scrollTo({
            left: targetScroll,
            behavior
        });
    }
}

/**
 * Scroll to a specific beat position
 * Useful for click-to-seek functionality
 */
export function scrollToPosition(
    container: HTMLElement | null,
    x: number,
    y: number,
    options: { centerX?: boolean; centerY?: boolean; behavior?: ScrollBehavior } = {}
): void {
    if (!container) return;

    const { centerX = true, centerY = false, behavior = 'smooth' } = options;

    const targetX = centerX ? Math.max(0, x - container.clientWidth / 2) : x;
    const targetY = centerY ? Math.max(0, y - container.clientHeight / 2) : y;

    container.scrollTo({
        left: targetX,
        top: targetY,
        behavior
    });
}

/**
 * Get current scroll position
 */
export function getScrollPosition(container: HTMLElement | null): { x: number; y: number } {
    if (!container) return { x: 0, y: 0 };
    return {
        x: container.scrollLeft,
        y: container.scrollTop
    };
}