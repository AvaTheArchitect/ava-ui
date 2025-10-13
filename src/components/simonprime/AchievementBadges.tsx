// 🏆 ACHIEVEMENT BADGES - Visual Achievement System
// File: src/components/simonprime/AchievementBadges.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { AchievementBadges } from '@/utils/simon/simonPrimePersonality';
import { useSimonPrime } from '@/hooks/simonprime/useSimonPrime';

interface Achievement {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlockedAt?: number;
    isNew?: boolean;
}

interface AchievementBadgesProps {
    userAchievements?: string[];
    showProgress?: boolean;
    compactMode?: boolean;
    animated?: boolean;
    onBadgeClick?: (achievementId: string) => void;
}

export default function AchievementBadgesComponent({
    userAchievements = [],
    showProgress = true,
    compactMode = false,
    animated = true,
    onBadgeClick
}: AchievementBadgesProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
    const [celebrationActive, setCelebrationActive] = useState(false);

    const { unlockAchievement, achievements: hookAchievements } = useSimonPrime();

    // 🎯 Convert AchievementBadges to our format
    useEffect(() => {
        const allAchievements: Achievement[] = Object.entries(AchievementBadges).map(([id, badge]) => ({
            id,
            name: badge.name,
            icon: badge.icon,
            description: badge.description,
            unlockedAt: userAchievements.includes(id) ? Date.now() : undefined
        }));

        setAchievements(allAchievements);
    }, [userAchievements]);

    // 🔥 Handle new achievements from hook
    useEffect(() => {
        const newAchievements = hookAchievements.filter(id => !userAchievements.includes(id));
        if (newAchievements.length > 0) {
            setNewlyUnlocked(newAchievements);
            setCelebrationActive(true);
            setTimeout(() => {
                setCelebrationActive(false);
                setNewlyUnlocked([]);
            }, 3000);
        }
    }, [hookAchievements, userAchievements]);

    // 🎸 Test unlock function
    const testUnlock = (achievementId: string) => {
        if (onBadgeClick) {
            onBadgeClick(achievementId);
        } else {
            unlockAchievement(achievementId);
        }
    };

    // 📊 Calculate progress
    const unlockedCount = achievements.filter(a => a.unlockedAt).length;
    const totalCount = achievements.length;
    const progressPercentage = (unlockedCount / totalCount) * 100;

    if (compactMode) {
        return (
            <div className="achievement-badges-compact flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-sm font-medium text-white">
                        {unlockedCount}/{totalCount}
                    </span>
                </div>

                <div className="flex gap-1">
                    {achievements.slice(0, 5).map((achievement) => (
                        <div
                            key={achievement.id}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${achievement.unlockedAt
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                                : 'bg-gray-600'
                                }`}
                            title={achievement.name}
                        >
                            {achievement.unlockedAt ? achievement.icon : '🔒'}
                        </div>
                    ))}
                    {totalCount > 5 && (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                            +{totalCount - 5}
                        </div>
                    )}
                </div>

                {showProgress && (
                    <div className="flex-1 bg-gray-700 rounded-full h-2 ml-2">
                        <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="achievement-badges bg-gray-900 text-white rounded-lg p-6 shadow-2xl border border-purple-500">

            {/* 🏆 Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl">
                        🏆
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Achievement Badges</h2>
                        <p className="text-gray-400 text-sm">Your Musical Journey</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-400">
                        {unlockedCount}/{totalCount}
                    </div>
                    <div className="text-xs text-gray-400">Badges Earned</div>
                </div>
            </div>

            {/* 📊 Progress Bar */}
            {showProgress && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-gray-400">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                            className={`bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ${animated ? 'animate-pulse' : ''
                                }`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 🔥 Celebration Banner */}
            {celebrationActive && newlyUnlocked.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-black animate-bounce">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎉</span>
                        <div>
                            <div className="font-bold">New Achievement Unlocked!</div>
                            <div className="text-sm">
                                {newlyUnlocked.map(id => AchievementBadges[id as keyof typeof AchievementBadges]?.name).join(', ')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🎸 Achievement Categories */}
            <div className="space-y-6">

                {/* Guitar Achievements */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🎸 Guitar Mastery
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {achievements
                            .filter(a => ['first-chord', 'chord-master', 'barre-champion', 'speed-demon', 'riff-master'].includes(a.id))
                            .map((achievement) => (
                                <div
                                    key={achievement.id}
                                    onClick={() => testUnlock(achievement.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${achievement.unlockedAt
                                        ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400 shadow-lg shadow-yellow-400/20'
                                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                                        } ${newlyUnlocked.includes(achievement.id) ? 'animate-pulse' : ''}`}
                                >
                                    <div className="text-center">
                                        <div className={`text-3xl mb-2 ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                                            {achievement.unlockedAt ? achievement.icon : '🔒'}
                                        </div>
                                        <div className={`font-semibold text-sm ${achievement.unlockedAt ? 'text-yellow-400' : 'text-gray-400'}`}>
                                            {achievement.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {achievement.description}
                                        </div>
                                        {achievement.unlockedAt && (
                                            <div className="text-xs text-green-400 mt-2">
                                                ✅ Unlocked
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Vocal Achievements */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🎤 Vocal Excellence
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {achievements
                            .filter(a => ['pitch-perfect', 'breath-master', 'range-rider', 'timing-titan'].includes(a.id))
                            .map((achievement) => (
                                <div
                                    key={achievement.id}
                                    onClick={() => testUnlock(achievement.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${achievement.unlockedAt
                                        ? 'bg-gradient-to-br from-blue-400/20 to-purple-500/20 border-blue-400 shadow-lg shadow-blue-400/20'
                                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                                        } ${newlyUnlocked.includes(achievement.id) ? 'animate-pulse' : ''}`}
                                >
                                    <div className="text-center">
                                        <div className={`text-3xl mb-2 ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                                            {achievement.unlockedAt ? achievement.icon : '🔒'}
                                        </div>
                                        <div className={`font-semibold text-sm ${achievement.unlockedAt ? 'text-blue-400' : 'text-gray-400'}`}>
                                            {achievement.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {achievement.description}
                                        </div>
                                        {achievement.unlockedAt && (
                                            <div className="text-xs text-green-400 mt-2">
                                                ✅ Unlocked
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Practice & Progress Achievements */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        ⚔️ Practice Warrior
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {achievements
                            .filter(a => ['practice-warrior', 'dedication-deity', 'legendary-learner'].includes(a.id))
                            .map((achievement) => (
                                <div
                                    key={achievement.id}
                                    onClick={() => testUnlock(achievement.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:scale-105 ${achievement.unlockedAt
                                        ? 'bg-gradient-to-br from-green-400/20 to-emerald-500/20 border-green-400 shadow-lg shadow-green-400/20'
                                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                                        } ${newlyUnlocked.includes(achievement.id) ? 'animate-pulse' : ''}`}
                                >
                                    <div className="text-center">
                                        <div className={`text-3xl mb-2 ${achievement.unlockedAt ? '' : 'grayscale opacity-50'}`}>
                                            {achievement.unlockedAt ? achievement.icon : '🔒'}
                                        </div>
                                        <div className={`font-semibold text-sm ${achievement.unlockedAt ? 'text-green-400' : 'text-gray-400'}`}>
                                            {achievement.name}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {achievement.description}
                                        </div>
                                        {achievement.unlockedAt && (
                                            <div className="text-xs text-green-400 mt-2">
                                                ✅ Unlocked
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* 🎯 Test Unlock Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">🧪 Test Achievement Unlocks:</h4>
                <div className="flex flex-wrap gap-2">
                    {['chord-master', 'pitch-perfect', 'practice-warrior', 'riff-master'].map((achievementId) => (
                        <button
                            key={achievementId}
                            onClick={() => testUnlock(achievementId)}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded transition-colors"
                        >
                            Unlock {AchievementBadges[achievementId as keyof typeof AchievementBadges]?.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 🎸 Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">
                    🎵 Keep practicing to unlock more legendary achievements! 🎵
                </p>
            </div>
        </div>
    );
}