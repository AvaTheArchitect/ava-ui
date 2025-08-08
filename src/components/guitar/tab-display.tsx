
import React, { useRef, useEffect, useState } from 'react';

export interface TabNote {
    string: number;
    fret: number;
    time: number;
    duration: number;
}

export interface TabMeasure {
    notes: TabNote[];
    timeSignature: [number, number];
    tempo: number;
}

export interface TabDisplayProps {
    measures: TabMeasure[];
    currentTime: number;
    onNoteClick?: (note: TabNote) => void;
    showFretNumbers?: boolean;
    stringCount?: number;
}

export const TabDisplay: React.FC<TabDisplayProps> = ({
    measures,
    currentTime,
    onNoteClick,
    showFretNumbers = true,
    stringCount = 6
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 200 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawTablature(ctx, measures, currentTime, canvasSize, stringCount, showFretNumbers);
    }, [measures, currentTime, canvasSize, stringCount, showFretNumbers]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onNoteClick) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const note = findNoteAtPosition(x, y, measures, canvasSize);
        if (note) {
            onNoteClick(note);
        }
    };

    return (
        <div className="tab-display">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onClick={handleCanvasClick}
                style={{ border: '1px solid #ccc', cursor: 'pointer' }}
            />
        </div>
    );
};

function drawTablature(
    ctx: CanvasRenderingContext2D,
    measures: TabMeasure[],
    currentTime: number,
    canvasSize: { width: number; height: number },
    stringCount: number,
    showFretNumbers: boolean
) {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    
    // Draw strings
    const stringSpacing = canvasSize.height / (stringCount + 1);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < stringCount; i++) {
        const y = stringSpacing * (i + 1);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
    }

    // Draw measures and notes
    const measureWidth = canvasSize.width / measures.length;
    
    measures.forEach((measure, measureIndex) => {
        const measureX = measureIndex * measureWidth;
        
        // Draw measure separator
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(measureX, 0);
        ctx.lineTo(measureX, canvasSize.height);
        ctx.stroke();

        // Draw notes
        measure.notes.forEach(note => {
            const x = measureX + (note.time * measureWidth);
            const y = stringSpacing * (note.string);
            
            // Highlight current note
            const isCurrentNote = Math.abs(note.time - currentTime) < 0.1;
            ctx.fillStyle = isCurrentNote ? '#ff6b6b' : '#333';
            
            // Draw fret number
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(note.fret.toString(), x, y + 5);
        });
    });
}

function findNoteAtPosition(
    x: number,
    y: number,
    measures: TabMeasure[],
    canvasSize: { width: number; height: number }
): TabNote | null {
    const measureWidth = canvasSize.width / measures.length;
    const measureIndex = Math.floor(x / measureWidth);
    
    if (measureIndex >= measures.length) return null;
    
    const measure = measures[measureIndex];
    const noteX = x - (measureIndex * measureWidth);
    const timePosition = noteX / measureWidth;
    
    // Find closest note
    let closestNote: TabNote | null = null;
    let closestDistance = Infinity;
    
    measure.notes.forEach(note => {
        const distance = Math.abs(note.time - timePosition);
        if (distance < closestDistance && distance < 0.1) {
            closestNote = note;
            closestDistance = distance;
        }
    });
    
    return closestNote;
}

export const FretDiagram: React.FC<{
    chord: string;
    frets: number[];
}> = ({ chord, frets }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawFretDiagram(ctx, chord, frets);
    }, [chord, frets]);

    return (
        <div className="fret-diagram">
            <h4>{chord}</h4>
            <canvas ref={canvasRef} width={120} height={150} />
        </div>
    );
};

function drawFretDiagram(ctx: CanvasRenderingContext2D, chord: string, frets: number[]) {
    const width = 120;
    const height = 150;
    const stringCount = 6;
    const fretCount = 5;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw fret lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    for (let i = 0; i <= fretCount; i++) {
        const y = 20 + (i * (height - 40) / fretCount);
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }
    
    // Draw strings
    ctx.lineWidth = 1;
    for (let i = 0; i < stringCount; i++) {
        const x = 20 + (i * (width - 40) / (stringCount - 1));
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, height - 20);
        ctx.stroke();
    }
    
    // Draw finger positions
    frets.forEach((fret, stringIndex) => {
        if (fret > 0) {
            const x = 20 + (stringIndex * (width - 40) / (stringCount - 1));
            const y = 20 + ((fret - 0.5) * (height - 40) / fretCount);
            
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}
        