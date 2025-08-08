// Fix for src/components/Cipher/VisualFeedbackPanel.tsx

import React from 'react';

interface Bounds {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface VisualFeedbackPanelProps {
    bounds?: Bounds;
    label?: string;
}

export default function VisualFeedbackPanel({ bounds, label }: VisualFeedbackPanelProps) {
    if (!bounds) return null;

    const { top, left, width, height } = bounds;

    return (
        <div
            style={{
                position: 'absolute',
                top,
                left,
                width,
                height,
                border: '2px solid #00ff00',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                pointerEvents: 'none',
                zIndex: 1000
            }}
        >
            {label && (
                <div
                    style={{
                        position: 'absolute',
                        top: -25,
                        left: 0,
                        backgroundColor: '#00ff00',
                        color: '#000',
                        padding: '2px 6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderRadius: '3px'
                    }}
                >
                    {label}
                </div>
            )}
        </div>
    );
}