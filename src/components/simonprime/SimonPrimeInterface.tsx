// 🎸 SIMON PRIME INTERFACE - With Avatar Integration
// File: src/components/simonprime/SimonPrimeInterface.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useSimonPrime } from '@/hooks/simonprime/useSimonPrime';
import { SimonPrimePersonalityEngine, AchievementBadges } from '@/utils/simon/simonPrimePersonality';

// 🤖 Simon Prime Avatar Component (shared with chat)
const SimonAvatar = ({
    state = 'normal',
    size = 'md',
    className = ''
}: {
    state?: 'normal' | 'thinking' | 'speaking' | 'celebrating' | 'roasting';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
    };

    const animationClasses = {
        normal: 'hover:scale-105',
        thinking: 'animate-pulse scale-105',
        speaking: 'animate-bounce',
        celebrating: 'animate-bounce scale-110',
        roasting: 'animate-pulse scale-105'
    };

    const glowClasses = {
        normal: 'shadow-lg shadow-simon-purple-shadow/40',
        thinking: 'shadow-xl shadow-blue-400/60',
        speaking: 'shadow-xl shadow-emerald-400/60',
        celebrating: 'shadow-2xl shadow-yellow-400/80',
        roasting: 'shadow-xl shadow-orange-400/60'
    };

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            <div className={`
        ${sizeClasses[size]} 
        rounded-full 
        overflow-hidden 
        transition-all 
        duration-300 
        ${animationClasses[state]} 
        ${glowClasses[state]}
        border-2 border-simon-blue-light/30
      `}>
                <img
                    src="/images/simon-prime-avatar.png"
                    alt="Simon Prime - Virtual Music Mentor"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-full h-full bg-gradient-to-br from-simon-blue to-simon-purple flex items-center justify-center text-xl">
                    🎸
                </div>
            </div>

            {state === 'thinking' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse flex items-center justify-center text-xs">
                    💭
                </div>
            )}

            {state === 'speaking' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-xs animate-pulse">
                    🎤
                </div>
            )}

            {state === 'celebrating' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs animate-bounce">
                    🎉
                </div>
            )}

            {state === 'roasting' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-xs animate-pulse">
                    🔥
                </div>
            )}
        </div>
    );
};

interface SimonPrimeInterfaceProps {
    context: 'practice' | 'vocal' | 'songwriting' | 'theory' | 'achievement';
    genre?: 'rock' | 'country' | 'blues' | 'metal' | 'christian' | 'bluesrock';
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
    onModeChange?: (humorMode: boolean) => void;
    showFeedback?: boolean;
}

export default function SimonPrimeInterface({
    context = 'practice',
    genre = 'rock',
    userLevel = 'intermediate',
    onModeChange,
    showFeedback = true
}: SimonPrimeInterfaceProps) {

    const {
        askSimon,
        isThinking,
        lastResponse,
        isHumorMode,
        toggleHumor,
        queryHistory,
        clearHistory
    } = useSimonPrime(userLevel);

    const [currentResponse, setCurrentResponse] = useState<string>('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [simonState, setSimonState] = useState<'normal' | 'thinking' | 'celebrating' | 'roasting'>('normal');
    const [recentAchievements, setRecentAchievements] = useState<string[]>([]);
    const [practiceStats] = useState({
        streak: 0,
        totalSessions: 0,
        skillProgress: 65,
        currentGoal: 'Master 5 new chords this week'
    });

    // 🤖 Update Simon's avatar state
    useEffect(() => {
        if (isThinking) {
            setSimonState('thinking');
        } else if (isAnimating) {
            // Keep current state during animation
        } else {
            setSimonState('normal');
        }
    }, [isThinking, isAnimating]);

    // 🎯 Simon's Greeting based on context
    const getContextGreeting = useCallback(() => {
        const greetings = {
            practice: isHumorMode ?
                "🔥 Ready to melt some fretboards? Let's turn up the heat!" :
                "🎸 Welcome to practice session! Let's make some music magic!",
            vocal: isHumorMode ?
                "🎤 Time to make the angels weep... tears of joy! Let's sing!" :
                "🎵 Ready to unleash that voice? Let's work on your vocal prowess!",
            songwriting: isHumorMode ?
                "📜 Shakespeare's got nothing on you! Let's craft some legendary lyrics!" :
                "✍️ Time to channel your inner songwriter! Let's create something amazing!",
            theory: isHumorMode ?
                "🧠 Brain gainz incoming! Let's decode the secrets of rock!" :
                "🎼 Ready to dive into music theory? Knowledge is power!",
            achievement: isHumorMode ?
                "🏆 Hall of Fame status loading... Check out these legendary wins!" :
                "✨ Celebrating your musical journey! Look at that progress!"
        };
        return greetings[context];
    }, [context, isHumorMode]);

    // 🎸 Handle humor mode toggle
    const handleHumorToggle = async () => {
        const newMode = await toggleHumor();
        onModeChange?.(newMode);

        // Set avatar state for mode change
        if (newMode) {
            setSimonState('roasting');
        } else {
            setSimonState('normal');
        }

        const modeResponse = newMode ?
            "🔥 HUMOR MODE ACTIVATED! Time to get spicy! 🌶️" :
            "🎓 Professional mode engaged. Let's get serious about your craft! 📚";

        setCurrentResponse(modeResponse);
        setIsAnimating(true);
        setTimeout(() => {
            setIsAnimating(false);
            setSimonState('normal');
        }, 2000);
    };

    // 🎯 Quick Practice Commands
    const quickCommands = {
        practice: [
            "How's my chord progression?",
            "Give me feedback on my timing",
            "Help me with barre chords",
            "Rate my strumming pattern",
            "What should I practice next?"
        ],
        vocal: [
            "Check my pitch accuracy",
            "How's my breathing technique?",
            "Help with vocal timing",
            "Rate my vibrato control",
            "Give me warm-up exercises"
        ],
        songwriting: [
            "Help me write a chorus",
            "Give me rhyme suggestions",
            "How's my song structure?",
            "Help with chord progressions",
            "Rate my lyrics"
        ],
        theory: [
            "Explain this scale",
            "How do chord progressions work?",
            "What's the circle of fifths?",
            "Help me understand modes",
            "Teach me about intervals"
        ],
        achievement: [
            "Show my progress",
            "What badges have I earned?",
            "How many practice sessions?",
            "Check my skill level",
            "View achievement history"
        ]
    };

    // 🏆 Achievement Handler
    const handleAchievement = (achievementId: string) => {
        const achievement = AchievementBadges[achievementId as keyof typeof AchievementBadges];
        if (achievement) {
            const response = SimonPrimePersonalityEngine.getGenreSpecificResponse(genre, achievement.name);
            setCurrentResponse(response.message);
            setRecentAchievements(prev => [...prev.slice(-2), achievementId]);
            setSimonState('celebrating');
            setIsAnimating(true);
            setTimeout(() => {
                setIsAnimating(false);
                setSimonState('normal');
            }, 3000);
        }
    };

    // 🎵 Quick Ask Simon
    const quickAsk = async (question: string) => {
        const response = await askSimon(question);
        if (response) {
            setCurrentResponse(response.answer);

            // Set avatar state based on response confidence
            if (response.confidence && response.confidence > 0.8) {
                setSimonState('celebrating');
            } else if (isHumorMode) {
                setSimonState('roasting');
            }

            setIsAnimating(true);
            setTimeout(() => {
                setIsAnimating(false);
                setSimonState('normal');
            }, 2000);
        }
    };

    // 🎸 Initialize with greeting
    useEffect(() => {
        setCurrentResponse(getContextGreeting());
    }, [getContextGreeting]);

    return (
        <div className="simon-prime-interface bg-simon-main text-simon-blue-text rounded-2xl p-8 shadow-2xl border border-simon-blue-light/20">

            {/* 🎤 Simon Prime Header with Avatar */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <SimonAvatar state={simonState} size="xl" />

                    <div>
                        <h2 className="text-xl font-bold text-simon-orange">Simon Prime</h2>
                        <p className="text-simon-blue-text/80 text-sm">Your Virtual Music Mentor</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs transition-all ${isHumorMode
                                ? 'bg-simon-orange text-white shadow-orange-400/40 shadow-md'
                                : 'bg-simon-blue text-white shadow-blue-400/40 shadow-md'
                                }`}>
                                {isHumorMode ? 'Humor Mode 🔥' : 'Professional 🎓'}
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-simon-purple text-simon-blue-text shadow-purple-400/40 shadow-md">
                                {genre.toUpperCase()}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${simonState === 'thinking' ? 'bg-blue-500/20 text-blue-300' :
                                simonState === 'celebrating' ? 'bg-yellow-500/20 text-yellow-300' :
                                    simonState === 'roasting' ? 'bg-orange-500/20 text-orange-300' :
                                        'bg-gray-500/20 text-gray-300'
                                }`}>
                                {simonState === 'thinking' ? '💭 Thinking' :
                                    simonState === 'celebrating' ? '🎉 Celebrating' :
                                        simonState === 'roasting' ? '🔥 Roasting' :
                                            '😎 Ready'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 🎯 Controls */}
                <div className="flex gap-2">
                    <button
                        onClick={handleHumorToggle}
                        className={`px-3 py-2 rounded transition-all shadow-lg ${isHumorMode
                            ? 'bg-gradient-to-r from-simon-orange to-cyber-orange hover:shadow-orange-400/40 shadow-orange-400/20 hover:-translate-y-1'
                            : 'bg-gradient-to-r from-simon-blue to-cyan-400 hover:shadow-blue-400/40 shadow-blue-400/20 hover:-translate-y-1'
                            }`}
                        disabled={isThinking}
                    >
                        {isHumorMode ? '🔥' : '🎓'}
                    </button>

                    <button
                        onClick={() => quickAsk("Give me a quick practice tip")}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded transition-all shadow-lg shadow-emerald-400/40 hover:-translate-y-1"
                        disabled={isThinking}
                    >
                        💡
                    </button>
                </div>
            </div>

            {/* 🎵 Simon's Response Area with Mini Avatar */}
            <div className="bg-simon-gray/80 backdrop-blur-xl rounded-xl p-6 mb-6 min-h-[120px] relative overflow-hidden border border-simon-blue-light/10">
                {isAnimating && (
                    <div className="absolute inset-0 bg-gradient-to-r from-simon-blue/10 to-simon-purple/10 animate-pulse"></div>
                )}

                <div className={`transition-all duration-500 ${isAnimating ? 'scale-105' : 'scale-100'}`}>
                    <div className="flex items-start gap-3">
                        <SimonAvatar state={simonState} size="md" />
                        <div className="flex-1">
                            <p className="text-lg leading-relaxed text-simon-blue-text">
                                {isThinking ? (
                                    <span className="animate-pulse text-cyan-400">🤔 Simon is thinking...</span>
                                ) : (
                                    currentResponse || getContextGreeting()
                                )}
                            </p>

                            {lastResponse && showFeedback && (
                                <div className="mt-3 pt-3 border-t border-simon-blue-light/20">
                                    <div className="flex justify-between items-center text-sm text-simon-blue-text/70">
                                        <span>Confidence: {Math.round(lastResponse.confidence * 100)}%</span>
                                        <span>Elements: {lastResponse.elements.join(', ')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 🎯 Quick Commands */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-simon-orange">
                    ⚡ Quick Commands
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {quickCommands[context as keyof typeof quickCommands]?.map((command: string, index: number) => (
                        <button
                            key={index}
                            onClick={() => quickAsk(command)}
                            disabled={isThinking}
                            className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:opacity-50 rounded transition-all text-sm text-simon-blue-text border border-white/10 hover:border-simon-blue-hover/30 hover:-translate-y-1 shadow-lg hover:shadow-2xl"
                        >
                            {command}
                        </button>
                    )) || []}
                </div>
            </div>

            {/* 🏆 Achievements & Progress */}
            {context === 'achievement' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Recent Achievements */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-simon-orange">
                            🏆 Recent Achievements
                        </h3>
                        <div className="space-y-2">
                            {recentAchievements.length > 0 ? (
                                recentAchievements.map((achievementId, index) => {
                                    const achievement = AchievementBadges[achievementId as keyof typeof AchievementBadges];
                                    return (
                                        <div key={index} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10 shadow-lg">
                                            <span className="text-2xl">{achievement.icon}</span>
                                            <div>
                                                <div className="font-semibold text-simon-orange">{achievement.name}</div>
                                                <div className="text-sm text-simon-blue-text/70">{achievement.description}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-simon-blue-text/60 italic">Keep practicing to unlock achievements! 🎯</div>
                            )}
                        </div>
                    </div>

                    {/* Practice Stats */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-simon-orange">
                            📊 Your Progress
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1 text-simon-blue-text">
                                    <span>Practice Streak</span>
                                    <span>{practiceStats.streak} days</span>
                                </div>
                                <div className="w-full bg-simon-gray rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(practiceStats.streak * 10, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1 text-simon-blue-text">
                                    <span>Skill Progress</span>
                                    <span>{practiceStats.skillProgress}%</span>
                                </div>
                                <div className="w-full bg-simon-gray rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-simon-purple to-simon-blue h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${practiceStats.skillProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                <div className="font-semibold text-sm text-cyan-400 mb-1">Current Goal</div>
                                <div className="text-sm text-simon-blue-text">{practiceStats.currentGoal}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🎸 Context-Specific Features */}
            {context === 'practice' && (
                <div className="flex gap-4">
                    <button
                        onClick={() => handleAchievement('chord-master')}
                        className="px-4 py-2 bg-gradient-to-r from-simon-purple to-purple-600 hover:from-simon-purple hover:to-purple-700 rounded transition-all text-sm shadow-lg shadow-purple-400/40 hover:-translate-y-1"
                    >
                        🎸 Test Chord Recognition
                    </button>
                    <button
                        onClick={() => quickAsk("Show me the interactive fretboard")}
                        className="px-4 py-2 bg-gradient-to-r from-simon-blue to-blue-600 hover:from-simon-blue hover:to-blue-700 rounded transition-all text-sm shadow-lg shadow-blue-400/40 hover:-translate-y-1"
                    >
                        🎯 Interactive Fretboard
                    </button>
                </div>
            )}

            {/* 🎤 Vocal Context Features */}
            {context === 'vocal' && (
                <div className="flex gap-4">
                    <button
                        onClick={() => handleAchievement('pitch-perfect')}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded transition-all text-sm shadow-lg shadow-emerald-400/40 hover:-translate-y-1"
                    >
                        🎤 Start Pitch Detection
                    </button>
                    <button
                        onClick={() => quickAsk("Give me breathing exercises")}
                        className="px-4 py-2 bg-gradient-to-r from-simon-orange to-orange-600 hover:from-simon-orange hover:to-orange-700 rounded transition-all text-sm shadow-lg shadow-orange-400/40 hover:-translate-y-1"
                    >
                        💨 Breathing Exercises
                    </button>
                </div>
            )}

            {/* 📜 Songwriting Context Features */}
            {context === 'songwriting' && (
                <div className="flex gap-4">
                    <button
                        onClick={() => quickAsk("Help me write lyrics for a " + genre + " song")}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded transition-all text-sm shadow-lg shadow-indigo-400/40 hover:-translate-y-1"
                    >
                        📜 Lyric Assistant
                    </button>
                    <button
                        onClick={() => quickAsk("Suggest chord progressions for " + genre)}
                        className="px-4 py-2 bg-gradient-to-r from-simon-purple to-purple-600 hover:from-simon-purple hover:to-purple-700 rounded transition-all text-sm shadow-lg shadow-purple-400/40 hover:-translate-y-1"
                    >
                        🎵 Chord Progressions
                    </button>
                </div>
            )}

            {/* 🎓 Simon's Signature */}
            <div className="mt-6 pt-4 border-t border-simon-blue-light/20 text-center">
                <p className="text-sm text-simon-blue-text/70 italic">
                    {isHumorMode ?
                        "\"Go melt another fretboard!\" - Simon Prime 🔥" :
                        "\"Every legend starts with a single note.\" - Simon Prime 🎵"
                    }
                </p>
            </div>
        </div>
    );
}