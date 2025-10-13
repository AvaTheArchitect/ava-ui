'use client';

import React, { useEffect, useRef } from 'react';
import { syncCursor } from '@/lib/alphaTab/syncCursor';
import { scrollToCursor } from '@/lib/alphaTab/scrollEngine';
import type { AlphaTabApi, CursorPosition } from '@/lib/alphaTab/types';

export interface MaestroCursorProps {
    api: AlphaTabApi | null;
    currentTime: number;
    isPlaying: boolean;
    onDebugUpdate?: (info: string) => void;
}

export const MaestroCursor: React.FC<MaestroCursorProps> = ({
    api,
    currentTime,
    isPlaying,
    onDebugUpdate
}) => {
    const cursorElementRef = useRef<HTMLDivElement | null>(null);
    const lastKnownPosition = useRef<CursorPosition>({ x: 0, y: 0, height: 100 });

    // Create cursor element imperatively and inject into .at-surface
    useEffect(() => {
        if (!api) return;

        const timer = setTimeout(() => {
            const surface = document.querySelector('.at-surface');
            if (!surface) {
                console.warn('⚠️ .at-surface not found');
                return;
            }

            // Check if cursor already exists
            if (cursorElementRef.current) return;

            // Create cursor element
            const cursor = document.createElement('div');
            cursor.id = 'custom-maestro-cursor';
            cursor.className = 'maestro-cursor';
            cursor.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 2px;
                height: 100px;
                background: rgba(34, 197, 94, 0.9);
                pointer-events: none;
                z-index: 9999;
                display: none;
                transition: left 50ms linear;
                box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
            `;

            // Inject into surface
            surface.appendChild(cursor);
            cursorElementRef.current = cursor;
            console.log('✅ Custom cursor created and mounted to .at-surface');
        }, 1000); // Wait for AlphaTab to fully render

        return () => {
            clearTimeout(timer);
            if (cursorElementRef.current) {
                cursorElementRef.current.remove();
                cursorElementRef.current = null;
                console.log('🧹 Cursor element removed');
            }
        };
    }, [api]);

    // Update cursor position
    useEffect(() => {
        if (!api || !cursorElementRef.current) return;

        const currentTimeMs = currentTime * 1000;

        // Sync cursor position
        const result = syncCursor({
            api,
            currentTimeMs,
            lastKnownPosition: lastKnownPosition.current,
            isPlaying
        });

        // Update cursor visual position
        const cursor = cursorElementRef.current;
        cursor.style.left = `${result.position.x}px`;
        cursor.style.top = `${result.position.y}px`;
        cursor.style.height = `${result.position.height}px`;
        cursor.style.display = 'block';

        // Store position for next frame
        lastKnownPosition.current = result.position;

        // Debug callback
        onDebugUpdate?.(result.debugInfo);

        // Auto-scroll if playing
        if (isPlaying) {
            const surface = document.querySelector('.at-surface') as HTMLElement;
            scrollToCursor(surface, result.position.x);
        }
    }, [api, currentTime, isPlaying, onDebugUpdate]);

    // This component doesn't render anything in the React tree
    return null;
};