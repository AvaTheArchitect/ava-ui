'use client';
import React, { useEffect, useState } from 'react';

export default function OverlayTrail() {
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const update = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', update);
        return () => window.removeEventListener('mousemove', update);
    }, []);

    return (
        <div
            className="fixed w-4 h-4 bg-orange-500 rounded-full opacity-75 pointer-events-none"
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: 'transform 0.1s ease-out',
                zIndex: 1000,
            }}
        />
    );
}
