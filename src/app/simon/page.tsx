// src/app/simon/page.tsx - Updated with Maestro.ai Color System & Avatar
'use client';

import React from 'react';
import SimonPrimeInterface from '@/components/simonprime/SimonPrimeInterface';
import SimonPrimeChat from '@/components/simonprime/SimonPrimeChat';
import AchievementBadges from '@/components/simonprime/AchievementBadges';
import SimonPrime from '@/components/simonprime/SimonPrime';

export default function SimonPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
            {/* Header with Simon Prime Avatar */}
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-500/50 shadow-2xl shadow-orange-500/40">
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
                        <div className="hidden w-full h-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-2xl">
                            🎸
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold text-orange-500 tracking-wide">
                        Simon Prime - Virtual Music Mentor
                    </h1>
                </div>
                <p className="text-xl text-blue-200/80 mb-0">
                    AI-Powered Music Coaching
                </p>
            </div>

            {/* Main Content Container */}
            <div className="max-w-6xl mx-auto space-y-12">

                {/* 💬 Interactive Chat Interface - NEW! */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-orange-500">💬 Chat with Simon Prime</h2>
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm font-medium">
                            Voice-Over Testing
                        </span>
                    </div>
                    <p className="text-blue-200/70 text-sm mb-4">
                        Perfect for testing personality responses and voice-over content. Try: "terrible performance", "excellent performance", "masterful performance"
                    </p>
                    <SimonPrimeChat
                        userLevel="intermediate"
                        context="practice"
                        genre="rock"
                    />
                </section>

                {/* 🎸 Practice Session Mode */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-orange-500">🎸 Practice Session Mode</h2>
                    <p className="text-blue-200/70 text-sm">
                        Guitar practice with real-time feedback and chord recognition
                    </p>
                    <SimonPrimeInterface
                        context="practice"
                        genre="rock"
                        userLevel="intermediate"
                        showFeedback={true}
                    />
                </section>

                {/* 🎤 Vocal Training Mode */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-orange-500">🎤 Vocal Training Mode</h2>
                    <p className="text-blue-200/70 text-sm">
                        Pitch detection, breath control, and vocal technique coaching
                    </p>
                    <SimonPrimeInterface
                        context="vocal"
                        genre="rock"
                        userLevel="intermediate"
                        showFeedback={true}
                    />
                </section>

                {/* 📜 Songwriter's Studio Mode */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-orange-500">📜 Songwriter's Studio Mode</h2>
                    <p className="text-blue-200/70 text-sm">
                        Lyric assistance, chord progressions, and song structure guidance
                    </p>
                    <SimonPrimeInterface
                        context="songwriting"
                        genre="country"
                        userLevel="intermediate"
                        showFeedback={true}
                    />
                </section>

                {/* 🏆 Achievement Center */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-orange-500">🏆 Achievement Center</h2>
                    <p className="text-blue-200/70 text-sm">
                        Track your progress and unlock legendary achievements
                    </p>
                    <AchievementBadges
                        userAchievements={['chord-master', 'pitch-perfect']}
                        showProgress={true}
                        animated={true}
                    />
                </section>

                {/* 🎵 Compact Simon Widget */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold text-orange-500">🎵 Simon Prime Widget</h2>
                    <p className="text-blue-200/70 text-sm">
                        Compact version for embedding in other components
                    </p>
                    <div className="max-w-2xl">
                        <SimonPrime
                            userLevel="intermediate"
                            showFeedback={true}
                            compactMode={false}
                        />
                    </div>
                </section>

                {/* 🧪 Developer Testing Section */}
                <section className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-6">🧪 Developer Testing Zone</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Humor Mode Testing */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-orange-400 mb-3">🔥 Humor Mode Testing</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• Toggle humor on/off in any interface</p>
                                <p>• Test roast vs professional responses</p>
                                <p>• Voice-over content differentiation</p>
                            </div>
                        </div>

                        {/* Genre Testing */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-purple-400 mb-3">🎸 Genre Response Testing</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• Rock: Power and attitude</p>
                                <p>• Country: Folksy and down-to-earth</p>
                                <p>• Metal: Intense and brutal</p>
                                <p>• Blues: Soulful and emotional</p>
                            </div>
                        </div>

                        {/* Performance Level Testing */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-emerald-400 mb-3">⚡ Performance Testing</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• "terrible performance" → Encouraging roast</p>
                                <p>• "excellent performance" → Epic celebration</p>
                                <p>• "masterful performance" → Legendary hype</p>
                            </div>
                        </div>

                        {/* Voice Integration */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-pink-400 mb-3">🎤 Voice Integration</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• Text-to-speech foundation ready</p>
                                <p>• "Hey Simon" voice command detection</p>
                                <p>• Professional voice-over ready</p>
                            </div>
                        </div>

                        {/* Achievement System */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-yellow-400 mb-3">🏆 Achievement System</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• Guitar, Vocal, Practice badges</p>
                                <p>• Unlock animations and celebrations</p>
                                <p>• Progress tracking and gamification</p>
                            </div>
                        </div>

                        {/* API Integration */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h3 className="text-lg font-semibold text-indigo-400 mb-3">🔌 API Integration</h3>
                            <div className="space-y-2 text-sm text-blue-200/80">
                                <p>• Practice Generator ready</p>
                                <p>• Real-time audio analysis hooks</p>
                                <p>• CipherConsole integration</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Test Commands */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-4">🚀 Quick Test Commands</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg p-3 border border-red-400/30">
                                <div className="text-sm font-medium text-red-300">Terrible Performance</div>
                                <div className="text-xs text-red-200/70 mt-1">Encouraging roast mode</div>
                            </div>
                            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-400/30">
                                <div className="text-sm font-medium text-yellow-300">Good Performance</div>
                                <div className="text-xs text-yellow-200/70 mt-1">Motivational feedback</div>
                            </div>
                            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-400/30">
                                <div className="text-sm font-medium text-green-300">Excellent Performance</div>
                                <div className="text-xs text-green-200/70 mt-1">Epic celebration mode</div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-400/30">
                                <div className="text-sm font-medium text-purple-300">Masterful Performance</div>
                                <div className="text-xs text-purple-200/70 mt-1">Legendary hype mode</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer - Simon Prime Focused */}
            <div className="text-center mt-12 pt-8 border-t border-white/10 text-blue-200/70 text-sm max-w-6xl mx-auto">
                <div className="space-y-2">
                    <p>🎸 Simon Prime™ Development & Testing Environment</p>
                    <p className="text-xs">
                        🔥 "Go melt another fretboard!" - Simon Prime™ | Ready for voice-over integration
                    </p>
                    <p className="text-xs text-blue-200/50">
                        {new Date().toLocaleDateString()} | Phase 1: Complete ✅ | Voice-Over Ready 🎤
                    </p>
                </div>
            </div>
        </div>
    );
}