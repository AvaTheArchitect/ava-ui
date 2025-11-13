'use client';

/**
 * AudioSourceToggle.tsx
 * Reusable audio source switcher (Synth vs Original/YouTube)
 * Used in both PlaybackControls (desktop inline) and MobileDrawer
 */

import React from 'react';
import type { AudioSourceToggleProps } from './MaestroControlTypes';

export const AudioSourceToggle: React.FC<AudioSourceToggleProps> = ({
    audioSource,
    onChange,
    disabled = false,
}) => {
    return (
        <div
            role="radiogroup"
            aria-label="Audio source selection"
            className="flex flex-col gap-2 w-full"
        >
            {/* Section Title */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Audio Source
            </div>

            {/* Synth Option */}
            <label
                className={`
          flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
          ${audioSource === 'synth'
                        ? 'bg-cyan-500/20 border-2 border-cyan-400/50'
                        : 'bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input
                    type="radio"
                    name="audio-source"
                    value="synth"
                    checked={audioSource === 'synth'}
                    onChange={() => !disabled && onChange('synth')}
                    disabled={disabled}
                    className="sr-only"
                />

                {/* Radio Indicator */}
                <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${audioSource === 'synth'
                        ? 'border-cyan-400 bg-cyan-400'
                        : 'border-gray-500 bg-transparent'
                    }
        `}>
                    {audioSource === 'synth' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                </div>

                {/* Label + Icon */}
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-2xl">🎹</span>
                    <div className="flex flex-col">
                        <span className={`font-medium ${audioSource === 'synth' ? 'text-cyan-300' : 'text-gray-300'
                            }`}>
                            Synth
                        </span>
                        <span className="text-xs text-gray-500">
                            MIDI Synthesizer
                        </span>
                    </div>
                </div>

                {/* Active Badge */}
                {audioSource === 'synth' && (
                    <span className="px-2 py-1 bg-cyan-400/20 text-cyan-400 text-xs font-bold rounded">
                        ACTIVE
                    </span>
                )}
            </label>

            {/* Original (YouTube) Option - STUB */}
            <label
                className={`
          flex items-center gap-3 p-3 rounded-lg transition-all
          ${audioSource === 'original'
                        ? 'bg-red-500/20 border-2 border-red-400/50 cursor-pointer'
                        : 'bg-gray-800/30 border border-gray-700 cursor-not-allowed opacity-50'
                    }
        `}
            >
                <input
                    type="radio"
                    name="audio-source"
                    value="original"
                    checked={audioSource === 'original'}
                    onChange={() => onChange('original')}
                    disabled // TODO: Remove when YouTube player implemented
                    className="sr-only"
                />

                {/* Radio Indicator */}
                <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${audioSource === 'original'
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-600 bg-transparent'
                    }
        `}>
                    {audioSource === 'original' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                </div>

                {/* Label + Icon */}
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-2xl">▶️</span>
                    <div className="flex flex-col">
                        <span className={`font-medium ${audioSource === 'original' ? 'text-red-300' : 'text-gray-500'
                            }`}>
                            Original
                        </span>
                        <span className="text-xs text-gray-600">
                            YouTube Player (Coming Soon)
                        </span>
                    </div>
                </div>

                {/* Active Badge */}
                {audioSource === 'original' && (
                    <span className="px-2 py-1 bg-red-400/20 text-red-400 text-xs font-bold rounded">
                        ACTIVE
                    </span>
                )}
            </label>
        </div>
    );
};