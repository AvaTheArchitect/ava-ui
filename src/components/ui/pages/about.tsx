'use client';

import React from 'react';
import { useAbout } from '@/hooks/ui/useAbout';

interface AboutProps {
    className?: string;
    children?: React.ReactNode;
}

const About: React.FC<AboutProps> = ({
    className = '',
    children
}) => {
    const {
        isLoaded,
        isActive,
        handleToggle
    } = useAbout();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="text-white text-xl">Loading about...</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8 ${className}`}>
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
                    🏠 About
                </h1>
                <p className="text-blue-200/80 mb-0">
                    Music Development Component - Created by Cipher.ai
                </p>
            </div>

            {/* Content Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* About Features Card */}
                <div className="group bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
                        🎯 About Features
                    </h3>
                    <p className="text-blue-200 mb-6">
                        Enhanced with music development capabilities and Cipher Brain Intelligence
                    </p>
                    <button
                        onClick={handleToggle}
                        className={`w-full bg-gradient-to-r text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg ${isActive
                            ? 'from-orange-500 to-red-500 hover:shadow-orange-400/40'
                            : 'from-cyan-400 to-blue-500 hover:shadow-cyan-400/40'
                            }`}
                        type="button"
                    >
                        {isActive ? '⏹️ Stop' : '▶️ Start'} about
                    </button>
                </div>

                {/* App Information Card */}
                <div className="group bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
                        📱 App Information
                    </h3>
                    <p className="text-blue-200 mb-6">
                        Learn more about Maestro.ai and its powerful features for musicians
                    </p>
                    <button
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40"
                        type="button"
                    >
                        📖 Learn More
                    </button>
                </div>

                {/* Developer Info Card */}
                <div className="group bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
                        👨‍💻 Development Team
                    </h3>
                    <p className="text-blue-200 mb-6">
                        Built by Cipher.ai with AI-powered development tools
                    </p>
                    <button
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40"
                        type="button"
                    >
                        🔗 Contact Team
                    </button>
                </div>

                {/* Version Info Card */}
                <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold mb-6 text-cyan-400 flex items-center gap-2">
                        🔧 Version Info
                    </h3>
                    <p className="text-blue-200 mb-6">
                        Current version with latest features and improvements
                    </p>
                    <button
                        className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40"
                        type="button"
                    >
                        📋 Release Notes
                    </button>
                </div>
            </div>

            {/* Children */}
            {children && (
                <div className="col-span-full bg-white/5 rounded-2xl p-8 border border-white/10 mt-8 max-w-6xl mx-auto">
                    {children}
                </div>
            )}

            {/* Footer */}
            <div className="text-center mt-12 pt-8 border-t border-white/10 text-gray-400 text-sm max-w-6xl mx-auto">
                🔧 Created by Cipher.ai | {new Date().toLocaleDateString()}
            </div>
        </div>
    );
};

export default About;