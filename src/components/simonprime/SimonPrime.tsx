'use client';

import React, { useState, useEffect } from 'react';
import {
  toggleHumorMode,
  getSimonStatus,
  getPersonalizedFeedback,
  coachFeedback,
  type SimonPrimeConfig
} from '@/modules/simonprime/SimonPrimeModule';

// ✅ TypeScript interface for props (following your pattern)
interface SimonPrimeProps {
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  showFeedback?: boolean;
  compactMode?: boolean;
  onModeChange?: (humorMode: boolean) => void;
}

// ✅ Use functional component with props (following your pattern)
export default function SimonPrime({
  userLevel = 'intermediate',
  showFeedback = true,
  compactMode = false,
  onModeChange
}: SimonPrimeProps) {
  const [config, setConfig] = useState<SimonPrimeConfig>({
    humorMode: false,
    vibratoPrecision: 0.8,
    responseStyle: 'professional',
    genre: 'rock', // ✅ Add missing genre property
    achievements: [] // ✅ Add missing achievements property
  });
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Initialize Simon's status
    const status = getSimonStatus();
    setConfig(status);

    // Get initial personalized feedback
    const feedback = getPersonalizedFeedback(userLevel, 'welcome');
    setCurrentFeedback(feedback);
  }, [userLevel]);

  const handleToggle = () => {
    setIsAnimating(true);
    const newMode = toggleHumorMode();
    const newConfig = getSimonStatus();
    setConfig(newConfig);

    // Get new feedback for mode change
    const feedback = newMode
      ? "Alright, let's have some fun! 🔥"
      : "Back to serious practice mode. 🎓";
    setCurrentFeedback(feedback);

    // Notify parent component
    onModeChange?.(newMode);

    // Reset animation
    setTimeout(() => setIsAnimating(false), 300);
  };

  const getNewFeedback = () => {
    const feedback = coachFeedback({ userLevel });
    setCurrentFeedback(feedback);
  };

  if (compactMode) {
    return (
      <div className="simon-prime-compact flex items-center gap-3 p-2 bg-gray-800 rounded">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎸</span>
          <span className="text-sm font-medium text-white">Simon</span>
        </div>
        <button
          onClick={handleToggle}
          className={`px-2 py-1 rounded text-xs transition-all ${config.humorMode
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {config.humorMode ? '🔥' : '🎓'}
        </button>
      </div>
    );
  }

  return (
    <div className="simon-prime-ui bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 shadow-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`text-2xl transition-transform ${isAnimating ? 'scale-110' : ''}`}>
            🎸
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Simon Prime</h2>
            <p className="text-sm text-gray-400">Your Virtual Music Mentor</p>
          </div>
        </div>

        {/* Mode Status Indicator */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${config.humorMode
            ? 'bg-orange-600 text-white'
            : 'bg-blue-600 text-white'
          }`}>
          {config.humorMode ? 'Roast Mode 🔥' : 'Coach Mode 🎓'}
        </div>
      </div>

      {/* Humor Mode Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white mb-1">Humor Mode</h3>
            <p className="text-xs text-gray-400">
              {config.humorMode
                ? 'Sarcastic and motivational feedback'
                : 'Professional coaching mode'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.humorMode ? 'bg-orange-600' : 'bg-gray-600'
              }`}
            aria-label={`Toggle humor mode ${config.humorMode ? 'off' : 'on'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.humorMode ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {/* Educational Note */}
        <div className="mt-2 text-xs text-gray-500">
          Default OFF for teachers and educational partners
        </div>
      </div>

      {/* Current Feedback Display */}
      {showFeedback && (
        <div className="bg-gray-700 rounded p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-lg flex-shrink-0">
              {config.humorMode ? '🔥' : '🎯'}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm leading-relaxed">{currentFeedback}</p>
              <button
                onClick={getNewFeedback}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Get new feedback →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simon's Capabilities */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-white mb-2">Simon can help with:</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            '🎸 Guitar technique',
            '🎤 Vocal coaching',
            '🫁 Breathing exercises',
            '⏱️ Timing & rhythm',
            '🎼 Music theory',
            '💫 Performance coaching'
          ].map((item, index) => (
            <div key={index} className="text-xs text-gray-400 flex items-center gap-2">
              <span className="text-blue-400">•</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Branding Footer */}
      <div className="mt-4 pt-3 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-500">
          "Simon is always there to back you up, anytime you play."
        </p>
      </div>
    </div>
  );
}