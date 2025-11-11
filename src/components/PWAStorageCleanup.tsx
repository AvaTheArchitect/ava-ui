/**
 * PWA Storage Cleanup Component
 * 
 * @version Nov 11, 2025
 * @purpose Fix iOS PWA bug where ghost cursors and corrupted storage 
 *          persist between app launches
 * 
 * Creates: src/components/PWAStorageCleanup.tsx
 * 
 * This component aggressively clears corrupted storage on subsequent PWA runs
 * to prevent ghost cursors and track switching issues on iOS.
 */

'use client';

import { useEffect } from 'react';

export function PWAStorageCleanup() {
    useEffect(() => {
        // Only run in PWA mode (installed on home screen)
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;

        if (!isPWA) {
            console.log('📱 Not in PWA mode - skipping storage cleanup');
            return;
        }

        console.log('📱 PWA mode detected - checking for corrupted storage');

        // Check if this is a subsequent run
        const isSubsequentRun = localStorage.getItem('pwa_run_marker');

        if (isSubsequentRun) {
            console.warn('⚠️ Subsequent PWA run detected - clearing potentially corrupted storage');

            // 1. Clear AlphaTab-specific data
            const alphaTabKeys = Object.keys(localStorage).filter(key =>
                key.includes('alphatab') ||
                key.includes('at-') ||
                key.includes('cursor') ||
                key.includes('player')
            );

            alphaTabKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🧹 Removed localStorage key: ${key}`);
            });

            // 2. Clear any orphaned DOM elements from previous session
            // This catches ghost cursors that might persist in the DOM
            const cleanupSelectors = [
                '[class*="at-cursor"]',
                '[class*="cursor"]',
                '[class*="at-selection"]',
                '[class*="at-highlight"]',
                '.at-surface [style*="cursor"]',
            ];

            cleanupSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`🧹 Removing ${elements.length} orphaned elements: ${selector}`);
                    elements.forEach(el => el.remove());
                }
            });

            // 3. Force garbage collection hint (if available)
            if ('gc' in window && typeof (window as any).gc === 'function') {
                try {
                    (window as any).gc();
                    console.log('♻️ Forced garbage collection');
                } catch (e) {
                    // Not available in production, only with --expose-gc flag
                }
            }

            console.log('✅ PWA storage cleanup complete');
        } else {
            console.log('✨ First PWA run - setting run marker');
        }

        // Always set/update the marker for next time
        localStorage.setItem('pwa_run_marker', Date.now().toString());

        // Optional: Clear the marker after 24 hours (in case of legitimate fresh start)
        const markerAge = Date.now() - parseInt(isSubsequentRun || '0', 10);
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (markerAge > ONE_DAY) {
            console.log('🕐 Run marker older than 24h - treating as fresh install');
            localStorage.removeItem('pwa_run_marker');
        }

    }, []); // Run once on mount

    return null; // This component doesn't render anything
}