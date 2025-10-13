'use client';

import React, { useRef, useEffect, useState, memo } from 'react';
import { usePlaybackControls } from '@/hooks/audio/playback/usePlaybackControls';
import TabCursor from './TabCursor';

// 🎸 Tab Display Props
interface TabDisplayProps {
    /** Guitar tablature content */
    tabContent?: string;
    /** Beats per minute */
    bpm?: number;
    /** Time signature */
    timeSignature?: [number, number];
    /** Whether to show the cursor */
    showCursor?: boolean;
    /** Custom styling */
    className?: string;
    /** Title for the tab */
    title?: string;
}

// 🎸 Enhanced TabDisplay Component with Debug Logging
const TabDisplay: React.FC<TabDisplayProps> = memo(({
    tabContent = 
`E|--0--2--3--5--|--7--5--3--2--|--0--3--5--7--|--12--10--8--5--|
B|--0--2--3--5--|--7--5--3--2--|--0--3--5--7--|--12--10--8--5--|
G|--0--2--4--5--|--7--5--4--2--|--0--4--5--7--|--12--10--9--5--|
D|--0--2--4--5--|--7--5--4--2--|--0--4--5--7--|--12--10--9--5--|
A|--0--2--3--5--|--7--5--3--2--|--0--3--5--7--|--12--10--8--5--|
E|--0--2--3--5--|--7--5--3--2--|--0--3--5--7--|--12--10--8--5--|`,
    bpm = 120,
    timeSignature = [4, 4] as [number, number],
    showCursor = true,
    className = '',
    title = 'Maestro.ai Audio Sync Test',
}) => {
    // 🔄 Debug: Track renders
    const renderCount = useRef(0);
    const lastLogTime = useRef(0);

    // 🎯 Get hook state
    const { state } = usePlaybackControls();

    // 🎯 Refs and State
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const [containerReady, setContainerReady] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [currentBeat, setCurrentBeat] = useState(1);

    // 🔄 Debug: Track re-renders
    useEffect(() => {
        renderCount.current += 1;
        console.log(`🎸 TabDisplay render #${renderCount.current}`);
    });

    // 🔄 Debug: Log significant state changes (throttled)
    useEffect(() => {
        const now = Date.now();
        const timeSinceLastLog = now - lastLogTime.current;

        // Only log every 500ms to prevent spam, or on significant changes
        if (timeSinceLastLog > 500 || renderCount.current === 1) {
            console.log('🎵 TabDisplay received state:', {
                isPlaying: state.isPlaying,
                isLoaded: state.isLoaded,
                currentTime: state.currentTime.toFixed(1),
                duration: state.duration.toFixed(1),
                renderCount: renderCount.current
            });
            lastLogTime.current = now;
        }
    }, [state.isPlaying, state.isLoaded, Math.floor(state.currentTime * 2) / 2]); // Log every 0.5 seconds

    // 🔄 Initialize container
    useEffect(() => {
        if (tabContainerRef.current) {
            setContainerReady(true);
            console.log('📦 TabDisplay: Container ready');
        }
    }, []);

    // 🎵 Handle cursor position changes
    const handleCursorPositionChange = (position: number, beat: number) => {
        setCursorPosition(position);
        setCurrentBeat(beat);

        // Debug cursor movement (throttled)
        if (renderCount.current % 10 === 0) { // Log every 10th update
            console.log('🎯 Cursor position updated:', { position: position.toFixed(0), beat });
        }
    };

    // 🎨 Enhanced tab content rendering
    const renderTabContent = () => {
        const lines = tabContent.split('\n').filter(line => line.trim());

        return lines.map((line, index) => (
            <div
                key={index}
                className="font-mono text-sm leading-relaxed"
                style={{
                    color: index % 2 === 0 ? '#e5e7eb' : '#d1d5db', // Alternating colors
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
            >
                {line}
            </div>
        ));
    };

    return (
        <div className={`relative w-full ${className}`}>
            {/* 🎸 Tab Header */}
            <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-orange-400 mb-2">
                    🎸 {title}
                </h2>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                    <span>♩ = {bpm} BPM</span>
                    <span>{timeSignature[0]}/{timeSignature[1]} Time</span>
                    <span>Duration: {state.duration.toFixed(1)}s</span>
                    <span className="text-cyan-400">Renders: {renderCount.current}</span>
                </div>
            </div>

            {/* 🎯 Main Tab Container with Enhanced Styling */}
            <div
                ref={tabContainerRef}
                className="relative w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 
                           rounded-xl border-2 border-orange-500/30 p-6 overflow-x-auto
                           shadow-2xl backdrop-blur-sm"
                style={{
                    minHeight: '200px',
                    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(31, 41, 55, 0.9) 100%)',
                    boxShadow: `
                        0 0 30px rgba(249, 115, 22, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                    `,
                }}
            >
                {/* 🎼 Guitar Strings Background Effect */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute left-0 right-0 border-b border-gray-600/20"
                            style={{
                                top: `${20 + (i * 25)}%`,
                                height: '1px',
                            }}
                        />
                    ))}
                </div>

                {/* 🎵 Tab Content */}
                <div className="relative z-10 whitespace-pre font-mono text-base leading-relaxed">
                    {renderTabContent()}
                </div>

                {/* 🎯 TabCursor Overlay */}
                {showCursor && containerReady && (
                    <TabCursor
                        tabContainer={tabContainerRef.current}
                        bpm={bpm}
                        timeSignature={timeSignature}
                        cursorColor="#f97316" // orange-500
                        cursorWidth={4}
                        showBeatMarkers={true}
                        onPositionChange={handleCursorPositionChange}
                        enabled={true}
                    />
                )}

                {/* 🎯 Click instruction overlay */}
                <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none">
                    🎵 Click Play to test cursor movement across the tab!
                </div>
            </div>

            {/* 🎯 Tab Display Status with Debug Info */}
            <div className="mt-4 flex justify-between items-center text-xs text-gray-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${containerReady ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        Container: {containerReady ? 'Ready' : 'Loading'}
                    </span>
                    <span>Cursor: {cursorPosition.toFixed(0)}px</span>
                    <span>Beat: {currentBeat}</span>
                    <span>BPM: {bpm}</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className={`text-${state.isPlaying ? 'green' : 'yellow'}-400`}>
                        {state.isPlaying ? '▶️ Playing' : '⏸️ Paused'}
                    </span>
                    <span className="text-orange-400 font-mono">
                        Maestro.ai v2
                    </span>
                </div>
            </div>

            {/* 🔍 Debug Panel (removable in production) */}
            <div className="mt-2 text-xs bg-gray-800/50 rounded p-2 border border-gray-700">
                <div className="text-cyan-400 font-bold mb-1">🔍 Debug Info:</div>
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                    <div>Renders: {renderCount.current}</div>
                    <div>State Updates: {Math.floor(state.currentTime * 10)}</div>
                    <div>Playing: {state.isPlaying ? 'Yes' : 'No'}</div>
                    <div>Loaded: {state.isLoaded ? 'Yes' : 'No'}</div>
                    <div>Current: {state.currentTime.toFixed(2)}s</div>
                    <div>Duration: {state.duration.toFixed(2)}s</div>
                </div>
            </div>
        </div>
    );
});

TabDisplay.displayName = 'TabDisplay';

export default TabDisplay;