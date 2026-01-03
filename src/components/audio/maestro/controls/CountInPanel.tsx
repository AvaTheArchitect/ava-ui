'use client';

/**
 * CountInPanel.tsx - Desktop Count In Settings Panel
 * Date: December 31st, 2025
 * 
 * 🎵 Simple popup overlay for Count In mode selection
 * ✅ Matches SpeedControl/TrackMixer panel design
 * ✅ Opens when clicking Count In button
 * ✅ 3-beat or 4-beat selection
 */

import React from 'react';

export interface CountInPanelProps {
    isEnabled: boolean;
    onToggle: () => void;
    mode: 'three-beat' | 'four-beat';
    onModeChange: (mode: 'three-beat' | 'four-beat') => void;
    isPanelOpen: boolean;
    onTogglePanel: () => void;
}

export const CountInPanel: React.FC<CountInPanelProps> = ({
    isEnabled,
    onToggle,
    mode,
    onModeChange,
    isPanelOpen,
    onTogglePanel,
}) => {
    if (!isPanelOpen) return null;

    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900/95 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-[280px] z-[11000]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-blue-400">Count In</span>
                <button 
                    onClick={onTogglePanel} 
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Enable Toggle */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-white">Enable Count In</div>
                        <div className="text-xs text-gray-400">
                            {isEnabled ? 'Active' : 'Disabled'}
                        </div>
                    </div>
                    <button
                        onClick={onToggle}
                        className={`
                            relative w-12 h-6 rounded-full transition-colors
                            ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}
                        `}
                    >
                        <div className={`
                            absolute top-0.5 w-5 h-5 rounded-full bg-white
                            transition-transform duration-200
                            ${isEnabled ? 'translate-x-6' : 'translate-x-0.5'}
                        `} />
                    </button>
                </div>
            </div>

            {/* Mode Selection */}
            <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">Count In Mode</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onModeChange('three-beat')}
                        className={`
                            p-3 rounded-lg border-2 transition-all text-center
                            ${mode === 'three-beat'
                                ? 'bg-orange-500/20 border-orange-500'
                                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
                            }
                        `}
                    >
                        <div className="text-xl font-bold text-white mb-1">3-2-1</div>
                        <div className="text-xs text-gray-400">3 Beats</div>
                    </button>
                    <button
                        onClick={() => onModeChange('four-beat')}
                        className={`
                            p-3 rounded-lg border-2 transition-all text-center
                            ${mode === 'four-beat'
                                ? 'bg-orange-500/20 border-orange-500'
                                : 'bg-gray-800/60 border-gray-700/50 hover:border-gray-600'
                            }
                        `}
                    >
                        <div className="text-xl font-bold text-white mb-1">4-3-2-1</div>
                        <div className="text-xs text-gray-400">4 Beats</div>
                    </button>
                </div>
            </div>
        </div>
    );
};